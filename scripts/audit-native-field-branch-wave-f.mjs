import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createNativeFieldScenarioRunner, perform, reachIdle, endTurn, enterBattle, battleAttack, leaveBattle, hasCode, requireChain, clone, json } from './native-field-audit-harness.mjs';
import { createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';

export const NATIVE_FIELD_BRANCH_WAVE_F_IDS = Object.freeze([27564031,74665651,1050355,87902575,20720928,2106266,2674965]);
const hash = value => createHash('sha256').update(value).digest('hex');
const fieldQuery = s => { const value = s.duel.queryField(); s.queries.push({ query: { field: true }, result: clone(value) }); return value; };
const nativeCard = (s, player, location, code) => {
  const cards = s.location(player, location), index = cards.findIndex(card => card.code === code);
  assert.ok(index >= 0, `Missing native card ${code} in ${location}`);
  // location() compacts its array. Read physical on-field slots individually.
  if (location === s.C.OcgLocation.MZONE) {
    for (let sequence = 0; sequence < 7; sequence++) { const card = s.card(player, location, sequence); if (card?.code === code) return card; }
  }
  return s.card(player, location, index);
};
const chains = (s, code) => s.messages.filter(message => message.type === s.C.OcgMessageType.CHAINING && message.code === code);
const responseWindow = (s, code) => {
  const start = s.messages.findIndex(message => message.type === s.C.OcgMessageType.CHAINING && message.code === code);
  assert.ok(start >= 0);
  const end = s.messages.findIndex((message,index) => index > start && message.type === s.C.OcgMessageType.CHAIN_END);
  assert.ok(end > start); return s.messages.slice(start,end+1);
};
const inResponseTo = (s, code) => {
  for(let index=s.messages.length-1;index>=0;index--) {
    const message=s.messages[index];
    if(message.type===s.C.OcgMessageType.CHAIN_END) return false;
    if(message.type===s.C.OcgMessageType.CHAINING) return message.code===code;
  }
  return false;
};
const respondOnlyTo = (s, trigger, responder) => ({ chainSelect: prompt => inResponseTo(s,trigger) ? (prompt.selects.findIndex(card=>card.code===responder)>=0 ? prompt.selects.findIndex(card=>card.code===responder) : null) : null });
const discardChoices = (discard, extra = {}) => ({ ...extra, select: prompt => prompt.selects.some(card => card.code === discard) ? [discard] : prompt.selects.map(card => card.code).slice(0, prompt.min) });

/** Twelve new branches; each session uses only cards supplied before start. */
export async function runNativeFieldBranchWaveF(inputs, sharedCore) {
  const { scenarios, run } = createNativeFieldScenarioRunner(inputs, sharedCore);
  const name = value => { const entry = [...inputs.resources.metadata].find(([, data]) => data.name === value); assert.ok(entry, `Missing official partner ${value}`); return entry[0]; };
  const noSwap = { effectYes: prompt => ![1050355,74665651].includes(prompt.code) };
  const malefic = ['Malefic Rainbow Dragon','Malefic Cyber End Dragon','Malefic Blue-Eyes White Dragon','Malefic Stardust Dragon'].map(name);

  await run('wf-malefic-four-card-pool-two-normal-draws-replaced',[27564031],
    'Select exactly three of four eligible Malefic cards, let the core choose one randomly, and replace two normal draws with that single add.', s => {
    const L = s.C.OcgLocation;
    s.add(27564031,0,L.HAND); for (const code of malefic) s.add(code,0,L.DECK);
    s.baseDecks().start(); perform(s,'activate',27564031); endTurn(s);
    endTurn(s,{ codes: malefic.slice(0,3) }); requireChain(s,27564031);
    const hand = s.location(0,L.HAND).filter(card => malefic.includes(card.code));
    assert.equal(hand.length,1); assert.ok(malefic.slice(0,3).includes(hand[0].code));
    assert.ok(hasCode(s,0,L.DECK,malefic[3])); assert.equal(s.location(0,L.DECK).filter(card => malefic.includes(card.code)).length,3);
    const choice = s.decisions.find(({prompt}) => prompt.type === s.C.OcgMessageType.SELECT_CARD && prompt.min === 3);
    assert.equal(choice.prompt.selects.length,4); assert.equal(choice.response.indicies.length,3);
    const reveal = s.messages.find(message => message.type === s.C.OcgMessageType.CONFIRM_CARDS);
    assert.deepEqual(reveal.cards.map(card=>card.code).sort((a,b)=>a-b),malefic.slice(0,3).sort((a,b)=>a-b));
    assert.equal(s.messages.filter(message => message.type === s.C.OcgMessageType.DRAW && message.player === 0).length,0);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.RANDOM_SELECTED)); fieldQuery(s);
  },{ team1: { drawCountPerTurn: 2 }, team2: { drawCountPerTurn: 0 } });

  await run('wf-malefic-insufficient-pool-preserves-normal-draw',[27564031],
    'With only two eligible Malefic cards, the replacement trigger is unavailable. The active Field preserves the genuine one-card normal draw instead.', s => {
    const L = s.C.OcgLocation;
    s.add(27564031,0,L.HAND);
    for (const code of malefic.slice(0,2)) s.add(code,0,L.DECK);
    s.baseDecks().start(); perform(s,'activate',27564031); endTurn(s);
    endTurn(s); requireChain(s,27564031);
    assert.equal(chains(s,27564031).length,1); assert.equal(s.card(0,L.SZONE,5).code,27564031);
    assert.ok(hasCode(s,0,L.HAND,46986414)); assert.equal(s.location(0,L.HAND).length,1); assert.equal(s.location(0,L.DECK).filter(card => malefic.includes(card.code)).length,2);
    assert.equal(s.messages.filter(message => message.type === s.C.OcgMessageType.DRAW && message.player === 0).length,1);
    assert.ok(!s.decisions.some(({prompt})=>prompt.type===s.C.OcgMessageType.SELECT_EFFECTYN && prompt.code===27564031));
    assert.ok(!s.messages.some(message => message.type === s.C.OcgMessageType.RANDOM_SELECTED)); fieldQuery(s);
  },{ team1: { drawCountPerTurn: 1 }, team2: { drawCountPerTurn: 0 } });

  await run('wf-dream-joy-highest-level-targets-and-light-condition',[74665651],
    'With a LIGHT Dream Mirror, Fiendish Chain can target only the highest-Level Dream Mirror. After a nontargeting Fissure destroys the LIGHT monster, Book of Moon can target the previously protected lower-Level DARK monster.', s => {
    const L = s.C.OcgLocation, sprite = name('Ikelos, the Dream Mirror Sprite'), mara = name('Ikelos, the Dream Mirror Mara'), knight = name('Morpheus, the Dream Mirror Black Knight');
    const fiendish = name('Fiendish Chain'), fissure = name('Fissure'), book = name('Book of Moon');
    s.add(74665651,0,L.HAND).add(sprite,0,L.MZONE).add(mara,0,L.MZONE,1).add(knight,0,L.MZONE,2)
      .add(fiendish,1,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).add(fissure,1,L.HAND).add(book,1,L.HAND).baseDecks().start();
    perform(s,'activate',74665651); endTurn(s,noSwap);
    perform(s,'activate',fiendish,{codes:[knight]}); requireChain(s,fiendish);
    const first = s.decisions.find(({prompt}) => prompt.type === s.C.OcgMessageType.SELECT_CARD && prompt.selects.some(card => card.code === knight));
    assert.deepEqual(first.prompt.selects.map(card => card.code),[knight]); assert.ok(nativeCard(s,0,L.MZONE,knight).status & 1);
    perform(s,'activate',fissure); assert.ok(hasCode(s,0,L.GRAVE,sprite)); assert.ok(hasCode(s,0,L.MZONE,mara));
    const before = s.decisions.length; perform(s,'activate',book,{codes:[mara]}); requireChain(s,book); requireChain(s,74665651);
    const second = s.decisions.slice(before).find(({prompt}) => prompt.type === s.C.OcgMessageType.SELECT_CARD);
    assert.ok(second.prompt.selects.some(card => card.code === mara)); assert.ok(nativeCard(s,0,L.MZONE,mara).position & s.C.OcgPosition.FACEDOWN);
  });

  await run('wf-dream-terror-per-event-damage-and-end-phase-exchange',[1050355,74665651],
    'Each opposing Gilasaurus Special Summon inflicts 300 while a DARK Dream Mirror is present. The real End Phase banishes Terror as cost and activates Joy from Deck.', s => {
    const L = s.C.OcgLocation, dark = name('Ikelos, the Dream Mirror Mara');
    s.add(1050355,0,L.HAND).add(74665651,0,L.DECK).add(dark,0,L.MZONE).add(45894482,1,L.HAND).add(45894482,1,L.HAND).baseDecks().start();
    perform(s,'activate',1050355); endTurn(s,noSwap);
    perform(s,'special',45894482); assert.equal(fieldQuery(s).players[1].lp,7700);
    perform(s,'special',45894482); assert.equal(fieldQuery(s).players[1].lp,7400);
    endTurn(s,{ effectYes: prompt => prompt.code === 1050355, chainCodes:[1050355], codes:[74665651] }); requireChain(s,1050355);
    assert.equal(s.card(0,L.SZONE,5).code,74665651); assert.ok(hasCode(s,0,L.REMOVED,1050355));
    const banished = s.location(0,L.REMOVED).find(card => card.code === 1050355); assert.ok(banished.reason & 0x80);
    assert.ok(!hasCode(s,0,L.DECK,74665651)); assert.equal(fieldQuery(s).players[1].lp,7400);
    assert.equal(s.messages.filter(message => message.type === s.C.OcgMessageType.DAMAGE && message.player === 1 && message.amount === 300).length,2);
  });

  await run('wf-future-visions-no-free-zone-at-return',[87902575],
    'After temporary banishment, Call of the Haunted fills the fifth main monster zone. At the next own Standby, Future Visions sends the unavailable return to GY by effect rather than placing it illegally.', s => {
    const L = s.C.OcgLocation, call = name('Call of the Haunted');
    s.add(87902575,0,L.HAND).add(23635815,0,L.HAND).add(89631139,0,L.GRAVE).add(call,0,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).add(46130346,1,L.HAND);
    for (let sequence=0;sequence<4;sequence++) s.add(46986414,0,L.MZONE,sequence);
    s.baseDecks().start(); perform(s,'activate',87902575); perform(s,'summon',23635815); assert.ok(hasCode(s,0,L.REMOVED,23635815));
    endTurn(s); perform(s,'activate',46130346,{chainCodes:[call],codes:[89631139]}); requireChain(s,call);
    assert.equal(s.location(0,L.MZONE).length,5); endTurn(s); requireChain(s,87902575);
    assert.equal(s.location(0,L.MZONE).length,5); assert.ok(!hasCode(s,0,L.REMOVED,23635815));
    const grave = s.location(0,L.GRAVE).find(card => card.code === 23635815); assert.ok(grave); assert.ok(grave.reason & 0x40); assert.ok(!(grave.reason & 1));
    assert.equal(chains(s,87902575).length,3); fieldQuery(s);
  });

  await run('wf-future-visions-source-gone-no-delayed-return',[87902575],
    'Destroy Future Visions after it banishes a Normal Summon. Its missing Field effect does not return that card at the next own Standby.', s => {
    const L = s.C.OcgLocation;
    s.add(87902575,0,L.HAND).add(23635815,0,L.HAND).add(5318639,0,L.HAND).baseDecks().start();
    perform(s,'activate',87902575); perform(s,'summon',23635815); assert.ok(hasCode(s,0,L.REMOVED,23635815));
    perform(s,'activate',5318639,{codes:[87902575]}); requireChain(s,5318639); endTurn(s); endTurn(s); requireChain(s,87902575);
    assert.ok(hasCode(s,0,L.GRAVE,87902575)); assert.ok(hasCode(s,0,L.REMOVED,23635815)); assert.ok(!hasCode(s,0,L.MZONE,23635815));
    assert.equal(chains(s,87902575).length,2); fieldQuery(s);
  });

  await run('wf-metaphys-factor-one-free-summon-second-needs-tributes',[20720928],
    'Double Summon allows a second Normal Summon, but only the first Metaphys uses Factor without Tributes. The second pays two real Tributes and is not marked for Factor’s next-turn banishment.', s => {
    const L = s.C.OcgLocation, armed = name('Metaphys Armed Dragon'), tyrant = name('Metaphys Tyrant Dragon'), double = name('Double Summon');
    s.add(20720928,0,L.HAND).add(double,0,L.HAND).add(armed,0,L.HAND).add(tyrant,0,L.HAND).add(23635815,0,L.MZONE).add(43096270,0,L.MZONE,1).baseDecks().start();
    perform(s,'activate',20720928); perform(s,'activate',double);
    perform(s,'summon',armed,{option:1}); assert.equal(s.location(0,L.GRAVE).filter(card => [23635815,43096270].includes(card.code)).length,0);
    const before = s.decisions.length; perform(s,'summon',tyrant); requireChain(s,20720928); requireChain(s,double);
    const tribute = s.decisions.slice(before).find(({prompt}) => prompt.type === s.C.OcgMessageType.SELECT_TRIBUTE);
    assert.ok(tribute); assert.equal(tribute.response.indicies.length,2);
    assert.ok(hasCode(s,0,L.MZONE,armed)); assert.ok(hasCode(s,0,L.MZONE,tyrant));
    for (const code of [23635815,43096270]) {
      const released=s.location(0,L.GRAVE).find(card=>card.code===code); assert.ok(released);
      assert.ok(released.reason & 0x10); assert.ok(released.reason & 0x8); assert.ok(released.reason & 0x2);
    }
    endTurn(s); assert.ok(hasCode(s,0,L.MZONE,armed)); endTurn(s);
    assert.ok(hasCode(s,0,L.REMOVED,armed)); assert.ok(hasCode(s,0,L.MZONE,tyrant)); fieldQuery(s);
  });

  for (const enabled of [true,false]) await run(`wf-metaphys-factor-response-${enabled?'blocked':'allowed-control'}`,[20720928],
    enabled ? 'Factor prevents the opponent’s Effect Veiler response to Ragnarok’s actual on-summon effect; three Metaphys cards are banished and Ragnarok gains 900 ATK.'
      : 'With the same responding Effect Veiler and Factor still in hand, the opponent can legally negate Ragnarok’s trigger; no Deck card is banished.', s => {
    const L = s.C.OcgLocation, ragnarok = name('Metaphys Ragnarok'), veiler = name('Effect Veiler'), armed = name('Metaphys Armed Dragon');
    s.add(20720928,0,L.HAND).add(ragnarok,0,L.HAND).add(veiler,1,L.HAND);
    for (let sequence=0;sequence<3;sequence++) s.add(armed,0,L.DECK,sequence); s.add(46986414,1,L.DECK).start();
    if (enabled) perform(s,'activate',20720928);
    perform(s,'summon',ragnarok,{...respondOnlyTo(s,ragnarok,veiler),codes:[ragnarok],effectYes:()=>true}); requireChain(s,ragnarok);
    const responses = s.decisions.filter(({prompt}) => prompt.type === s.C.OcgMessageType.SELECT_CHAIN && prompt.player === 1 && prompt.selects.some(card => card.code === veiler));
    const duringEffect=responseWindow(s,ragnarok).filter(message=>message.type===s.C.OcgMessageType.SELECT_CHAIN && message.player===1);
    if (enabled) {
      requireChain(s,20720928); assert.equal(chains(s,veiler).length,0); assert.equal(s.location(0,L.REMOVED).length,3); assert.equal(nativeCard(s,0,L.MZONE,ragnarok).attack,2400);
      assert.ok(duringEffect.length); assert.ok(duringEffect.every(prompt=>!prompt.selects.some(card=>card.code===veiler)));
      assert.ok(responses.length,'Veiler becomes legal in a later window after the Metaphys chain ends');
    } else {
      assert.ok(responses.length); requireChain(s,veiler); assert.equal(chains(s,veiler)[0].chain_size,2); assert.equal(s.location(0,L.REMOVED).length,0); assert.equal(nativeCard(s,0,L.MZONE,ragnarok).attack,1500); assert.ok(nativeCard(s,0,L.MZONE,ragnarok).status & 1);
      assert.ok(duringEffect.some(prompt=>prompt.selects.some(card=>card.code===veiler)));
      assert.ok(hasCode(s,0,L.HAND,20720928)); assert.ok(hasCode(s,1,L.GRAVE,veiler));
    }
    fieldQuery(s);
  });

  await run('wf-galloping-gaia-dragon-reveal-reverse-search-shared-limit',[2106266],
    'Reveal a Level 5 Dragon without discarding it and search Gaia the Fierce Knight. Despite a legal forward-search pair now existing, the shared once-per-turn prevents both further modes.', s => {
    const L = s.C.OcgLocation, dragon = name('Curse of Dragon'), gaia = name('Gaia The Fierce Knight');
    s.add(2106266,0,L.HAND).add(dragon,0,L.HAND).add(gaia,0,L.DECK).add(dragon,0,L.DECK).baseDecks().start();
    perform(s,'activate',2106266); perform(s,'activate',2106266,{codes:[dragon,gaia]}); requireChain(s,2106266);
    assert.ok(hasCode(s,0,L.HAND,dragon)); assert.ok(hasCode(s,0,L.HAND,gaia)); assert.ok(hasCode(s,0,L.DECK,dragon));
    assert.equal(s.location(0,L.GRAVE).length,0); assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.CONFIRM_CARDS));
    assert.ok(!reachIdle(s).activates.some(card => card.code === 2106266 && card.location === L.SZONE));
  });

  await run('wf-galloping-gaia-real-fusion-battle-response-reenabled-after-mst',[2106266],
    'A genuine Gaia the Dragon Champion Fusion attacks while Galloping Gaia prevents Mirror Force. After MST destroys the Field, the same remaining Trap is allowed on the next attack and destroys Gaia.', s => {
    const L = s.C.OcgLocation, gaia = name('Gaia The Fierce Knight'), dragon = name('Curse of Dragon'), champion = name('Gaia the Dragon Champion'), poly = name('Polymerization'), mirror = name('Mirror Force');
    s.add(2106266,0,L.HAND).add(gaia,0,L.HAND).add(dragon,0,L.HAND).add(poly,0,L.HAND).add(champion,0,L.EXTRA).add(5318639,0,L.HAND)
      .add(23635815,1,L.MZONE).add(23635815,1,L.MZONE,1).add(mirror,1,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();
    perform(s,'activate',2106266); perform(s,'activate',poly); requireChain(s,poly); assert.ok(hasCode(s,0,L.MZONE,champion));
    for(const code of [gaia,dragon]) assert.ok(s.location(0,L.GRAVE).find(card=>card.code===code).reason & 0x8);
    endTurn(s); endTurn(s); enterBattle(s,{chainCodes:[mirror]}); battleAttack(s,champion,23635815,{chainCodes:[mirror]});
    assert.equal(chains(s,mirror).length,0); assert.ok(hasCode(s,1,L.SZONE,mirror)); assert.equal(fieldQuery(s).players[1].lp,7150);
    leaveBattle(s); perform(s,'activate',5318639,{codes:[2106266]}); endTurn(s); endTurn(s);
    enterBattle(s,{chainCodes:[mirror]}); battleAttack(s,champion,23635815,{chainCodes:[mirror]}); requireChain(s,mirror); requireChain(s,2106266);
    assert.ok(hasCode(s,0,L.GRAVE,champion)); assert.ok(!hasCode(s,0,L.MZONE,champion)); assert.equal(fieldQuery(s).players[1].lp,7150);
    assert.ok(hasCode(s,1,L.MZONE,23635815));
  });

  await run('wf-argostars-trap-summon-damage-negation-reset-and-banished-condition',[2674965],
    'Tydeu pays a real discard and moves from Continuous Trap to monster, causing 500 damage. Its monster effect triggers Stadium’s negation with a banished Argostars monster; negation expires, and recovering that banished monster makes the later Trap effect ineligible.', s => {
    const L = s.C.OcgLocation, tydeu = name('Argostars - Lightning Tydeu'), parthe = name('Argostars - Fierce Parthe'), target = name('Destiny HERO - Doom Lord');
    s.add(2674965,0,L.HAND).add(tydeu,0,L.SZONE).add(parthe,0,L.REMOVED).add(target,1,L.MZONE).add(5318639,0,L.HAND).add(5318639,0,L.HAND).baseDecks().start();
    perform(s,'activate',2674965); perform(s,'activate',tydeu,discardChoices(5318639,{yes:false})); requireChain(s,tydeu);
    assert.equal(fieldQuery(s).players[1].lp,7500); const monster = nativeCard(s,0,L.MZONE,tydeu); assert.ok(monster.type & s.C.OcgType.MONSTER); assert.ok(monster.type & s.C.OcgType.TRAP);
    const cost = s.location(0,L.GRAVE).find(card => card.code === 5318639); assert.ok(cost.reason & 0x80); assert.ok(cost.reason & 0x4000);
    perform(s,'activate',tydeu,{chainCodes:[2674965],codes:[target],effectYes:()=>true},{location:L.MZONE}); requireChain(s,2674965);
    assert.ok(s.card(1,L.MZONE).status & 1); assert.ok(hasCode(s,0,L.SZONE,tydeu)); assert.ok(!hasCode(s,0,L.MZONE,tydeu));
    assert.ok(!reachIdle(s).activates.some(card=>card.code===tydeu && card.location===L.SZONE));
    endTurn(s); assert.ok(!(s.card(1,L.MZONE).status & 1)); endTurn(s);
    perform(s,'activate',2674965,{codes:[parthe]}); assert.ok(!hasCode(s,0,L.REMOVED,parthe)); assert.ok(hasCode(s,0,L.HAND,parthe)); assert.equal(fieldQuery(s).players[0].lp,7000);
    perform(s,'activate',tydeu,discardChoices(5318639,{yes:false})); assert.equal(fieldQuery(s).players[1].lp,7000);
    const before = chains(s,2674965).length;
    perform(s,'activate',tydeu,{chainCodes:[2674965],codes:[target]},{location:L.MZONE});
    assert.equal(chains(s,2674965).length,before); assert.ok(!(s.card(1,L.MZONE).status & 1)); assert.ok(hasCode(s,0,L.SZONE,tydeu));
  });
  return scenarios;
}

export async function collectNativeFieldBranchWaveFProvenance(inputs, scenarios) {
  const paths = ['scripts/audit-native-field-branch-wave-f.mjs','tests/native-field-branch-wave-f.test.mjs','scripts/native-field-audit-inputs.mjs','scripts/native-field-audit-harness.mjs',
    'src/core/native/NativeDuelRuntime.js','src/core/native/NativeCardScriptCorrections.js','src/core/native/NativeDiceDungeonScriptCorrection.js','src/core/native/NativeDuelTowerScriptCorrection.js','src/core/native/NativeSourceIntegrity.js','src/core/native/NativeLuaCompatibility.js','src/core/native/NativeDuelDecisions.js','src/ui/NativeDuelPresentationModel.js','src/core/native/NativeCardData.js','src/core/native/NativeScriptArchive.js','src/core/native/NativeCoreAssets.js',
    'src/core/native/vendor/ocgcore/index.js','src/core/native/vendor/ocgcore/ocgcore.sync-MMMSWPBB.js','src/core/native/vendor/ocgcore/chunk-6GYI7QPM.js','src/core/native/vendor/ocgcore/chunk-L5TW24SS.js',
    'public/native/core-build.json','public/native/manifest.json','public/native/card-data.json','public/native/scripts.json','public/native/field-banlists.json','public/native/ocgcore.sync.wasm'];
  const dependencies = await Promise.all(paths.map(async path => { const bytes = await readFile(new URL(`../${path}`,import.meta.url)); return {path,bytes:bytes.length,sha256:hash(bytes)}; }));
  for (const [artifact,path] of [['cards','public/native/card-data.json'],['scripts','public/native/scripts.json'],['fieldBanlists','public/native/field-banlists.json']]) {
    const actual = dependencies.find(entry => entry.path === path), expected = inputs.resources.manifest.artifacts[artifact]; assert.equal(actual.sha256,expected.sha256); assert.equal(actual.bytes,expected.bytes);
  }
  assert.equal(dependencies.find(entry => entry.path.endsWith('.wasm')).sha256,inputs.coreBuild.wasmSha256);
  const reader = createNativeScriptReader(inputs.resources.scripts), scripts = new Map();
  for (const scenario of scenarios) for (const card of scenario.fixtureCards) {
    const filename = `c${card.sourceCode}.lua`, original = inputs.resources.scripts.get(filename); if (typeof original !== 'string') continue;
    const effective = reader(filename), originalSha256 = hash(original), effectiveSha256 = hash(effective);
    assert.equal(card.scriptSha256,originalSha256); assert.equal(card.effectiveScriptSha256,effectiveSha256);
    scripts.set(filename,{filename,sourceCode:card.sourceCode,path:inputs.resources.auditScriptFiles?.[filename]?.path ?? filename,originalSha256,effectiveSha256,originalBytes:Buffer.byteLength(original),effectiveBytes:Buffer.byteLength(effective),corrected:original!==effective});
  }
  const bootstrapScripts=['constant.lua','utility.lua'].map(filename=>{
    const original=inputs.resources.scripts.get(filename),effective=reader(filename); assert.equal(typeof original,'string');
    return {filename,path:inputs.resources.auditScriptFiles?.[filename]?.path ?? filename,originalSha256:hash(original),effectiveSha256:hash(effective),originalBytes:Buffer.byteLength(original),effectiveBytes:Buffer.byteLength(effective)};
  });
  const {NATIVE_LUA_COMPATIBILITY_NAME,NATIVE_LUA_COMPATIBILITY_SOURCE}=await import('../src/core/native/NativeLuaCompatibility.js');
  const compatibilityBootstrap={filename:NATIVE_LUA_COMPATIBILITY_NAME,implementationPath:'src/core/native/NativeLuaCompatibility.js',effectiveSha256:hash(NATIVE_LUA_COMPATIBILITY_SOURCE),effectiveBytes:Buffer.byteLength(NATIVE_LUA_COMPATIBILITY_SOURCE),purpose:'Existing Group.NewGroup native-constructor alias; no card effect injected.'};
  return {dependencies,scripts:[...scripts.values()],bootstrapScripts,compatibilityBootstrap,upstreamArchiveBytesModified:false,cardDataModified:false,wasmSha256:inputs.coreBuild.wasmSha256,coreModuleOverride:process.env.NATIVE_CORE_MODULE ?? null};
}

async function main() {
  const {loadNativeAuditInputs} = await import('./native-field-audit-inputs.mjs');
  const inputs = await loadNativeAuditInputs(), core = await inputs.coreModule.default({...inputs.initializer,sync:true});
  const scenarios = await runNativeFieldBranchWaveF(inputs,core);
  const counts = {scenarios:scenarios.length,passed:scenarios.filter(s=>s.status==='passed').length,failed:scenarios.filter(s=>s.status!=='passed').length,distinctFields:new Set(scenarios.flatMap(s=>s.fields)).size};
  const provenance = await collectNativeFieldBranchWaveFProvenance(inputs,scenarios);
  const report = {date:'2026-10-08',executedAtUtc:new Date().toISOString(),wave:'F',nativeApi:core.getVersion(),scope:'Twelve additional condition, response, combat and destination branches. Does not certify every branch of these seven Fields.',counts,fixturePolicy:{beforeStartOnly:true,postStartFixtureInjection:false,testMode:false,officialArchivesUnchanged:true,flags:['MODE_MR5','TCG_SEGOC_NONPUBLIC','TCG_SEGOC_FIRSTTRIGGER']},provenance,scenarios};
  const output = new URL('../docs/audits/artifacts/native-field-branch-wave-f-2026-10-08.json',import.meta.url); await mkdir(new URL('.',output),{recursive:true}); await writeFile(output,json(report)+'\n');
  console.log(json(counts)); for(const scenario of scenarios) console.log(scenario.status,scenario.id,scenario.error??''); if(counts.failed) process.exitCode=1;
}
if(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
