import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createNativeFieldScenarioRunner, perform, reachIdle, endTurn, enterBattle, battleAttack, leaveBattle, hasCode, requireChain, clone, json } from './native-field-audit-harness.mjs';
import { createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';

export const NATIVE_FIELD_CONTINUATION_B_IDS = Object.freeze([62265044,4064256,66399653,54631665,269012,27813661,59160188]);
const hash = value => createHash('sha256').update(value).digest('hex');
const fieldQuery = s => { const result = s.duel.queryField(); s.queries.push({query:{field:true},result:clone(result)}); return result; };
const cardByCode = (s, player, location, code) => {
  const count = location === s.C.OcgLocation.MZONE ? 7 : location === s.C.OcgLocation.SZONE ? 8 : s.location(player,location).length;
  for (let sequence=0;sequence<count;sequence++) { const card=s.card(player,location,sequence); if(card?.code===code) return card; }
  assert.fail(`Missing native card ${code} in player ${player} location ${location}`);
};
const chains = (s,code) => s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===code);
const inResponseTo = (s,code) => {
  for(let i=s.messages.length-1;i>=0;i--) { const m=s.messages[i]; if(m.type===s.C.OcgMessageType.CHAIN_END)return false;if(m.type===s.C.OcgMessageType.CHAINING)return m.code===code; }
  return false;
};
const respondOnlyTo = (s,trigger,responder) => ({chainSelect:prompt=>inResponseTo(s,trigger)&&prompt.selects.some(c=>c.code===responder)?prompt.selects.findIndex(c=>c.code===responder):null});
const noFieldIgnition = (s,code) => assert.ok(!reachIdle(s).activates.some(c=>c.code===code&&c.location===s.C.OcgLocation.SZONE));
const selectOwnTribute = (prompt,C) => prompt.type===C.OcgMessageType.SELECT_UNSELECT_CARD
  ? {type:C.OcgResponseType.SELECT_UNSELECT_CARD,index:prompt.can_finish?null:prompt.select_cards.findIndex(c=>c.controller===prompt.player)} : null;

/** Additional branches use only original CDB/Lua and cards supplied before start.
 * All costs, selections, control changes, phases and queries belong to OCG/WASM. */
export async function runNativeFieldContinuationB(inputs,sharedCore) {
  const {scenarios,run}=createNativeFieldScenarioRunner(inputs,sharedCore);
  const name = value => { const entry=[...inputs.resources.metadata].find(([,d])=>d.name===value);assert.ok(entry,`Missing official partner ${value}`);return entry[0]; };

  await run('continuation-b-ravine-dragunity-search-cost-and-shared-mode-limit',[62265044],
    'Discard MST as cost, search a Level 4 Dragunity rather than sending a Dragon, and consume the shared once-per-turn despite another legal hand/deck pair.',s=>{
    const L=s.C.OcgLocation,dux=name('Dragunity Dux');
    s.add(62265044,0,L.HAND).add(5318639,0,L.HAND).add(5318639,0,L.HAND).add(dux,0,L.DECK).add(89631139,0,L.DECK).baseDecks().start();
    perform(s,'activate',62265044);perform(s,'activate',62265044,{option:0,select:p=>p.selects.some(c=>c.code===5318639)?[5318639]:[dux]});
    requireChain(s,62265044);assert.ok(hasCode(s,0,L.HAND,dux));assert.ok(hasCode(s,0,L.DECK,89631139));
    const cost=cardByCode(s,0,L.GRAVE,5318639);assert.ok(cost.reason&0x80);assert.ok(cost.reason&0x4000);assert.ok(!(cost.reason&0x40));
    assert.ok(s.messages.some(m=>m.type===s.C.OcgMessageType.CONFIRM_CARDS&&m.cards.some(c=>c.code===dux)));noFieldIgnition(s,62265044);fieldQuery(s);
  });

  await run('continuation-b-ravine-ash-negates-search-cost-remains-and-limit-consumed',[62265044],
    'Ash Blossom genuinely negates Ravine search. The discarded cost remains in GY, the Dragunity remains in Deck, and the spent once-per-turn cannot be retried.',s=>{
    const L=s.C.OcgLocation,dux=name('Dragunity Dux'),ash=name('Ash Blossom & Joyous Spring');
    s.add(62265044,0,L.HAND).add(5318639,0,L.HAND).add(5318639,0,L.HAND).add(dux,0,L.DECK).add(dux,0,L.DECK).add(ash,1,L.HAND).baseDecks().start();
    perform(s,'activate',62265044);perform(s,'activate',62265044,{...respondOnlyTo(s,62265044,ash),codes:[5318639],option:0});
    requireChain(s,ash);requireChain(s,62265044);assert.equal(chains(s,ash)[0].chain_size,2);
    assert.ok(hasCode(s,0,L.DECK,dux));assert.ok(!hasCode(s,0,L.HAND,dux));assert.ok(hasCode(s,1,L.GRAVE,ash));
    const cost=cardByCode(s,0,L.GRAVE,5318639);assert.ok(cost.reason&0x80);assert.ok(cost.reason&0x4000);noFieldIgnition(s,62265044);fieldQuery(s);
  });

  await run('continuation-b-zombie-world-tribute-summon-set-prohibition-both-players',[4064256],
    'Zombie World forbids both players from Tribute Summoning or Setting the non-Zombie Blue-Eyes in hand, while each can genuinely Tribute Summon the original Zombie Vampire Lord.',s=>{
    const L=s.C.OcgLocation,vampire=name('Vampire Lord');
    s.add(4064256,0,L.HAND);
    for(const player of [0,1])s.add(89631139,player,L.HAND).add(vampire,player,L.HAND).add(23635815,player,L.MZONE).add(43096270,player,L.MZONE,1);
    s.baseDecks().start();perform(s,'activate',4064256);
    for(const player of [0,1]) {
      const idle=reachIdle(s);assert.equal(idle.player,player);
      for(const list of [idle.summons,idle.monster_sets]) {assert.ok(!list.some(c=>c.code===89631139));assert.ok(list.some(c=>c.code===vampire));}
      perform(s,'summon',vampire);assert.ok(hasCode(s,player,L.MZONE,vampire));assert.equal(cardByCode(s,player,L.MZONE,vampire).race,16n);
      const tribute=s.decisions.filter(d=>d.prompt.type===s.C.OcgMessageType.SELECT_TRIBUTE).at(-1);assert.equal(tribute.response.indicies.length,1);
      if(player===0)endTurn(s);
    }
    requireChain(s,4064256);fieldQuery(s);
  });

  await run('continuation-b-zombie-world-field-grave-race-and-tribute-revert-after-mst',[4064256],
    'The continuous Zombie race applies to both fields and both GYs. MST removes it, restoring printed races and making a previously prohibited Blue-Eyes Tribute Summon legal.',s=>{
    const L=s.C.OcgLocation;
    s.add(4064256,0,L.HAND).add(5318639,0,L.HAND).add(89631139,0,L.HAND);
    for(const player of [0,1])s.add(89631139,player,L.GRAVE).add(23635815,player,L.MZONE).add(43096270,player,L.MZONE,1);
    s.baseDecks().start();perform(s,'activate',4064256);
    for(const player of [0,1])for(const [loc,code]of [[L.MZONE,23635815],[L.GRAVE,89631139]])assert.equal(cardByCode(s,player,loc,code).race,16n);
    assert.ok(!reachIdle(s).summons.some(c=>c.code===89631139));perform(s,'activate',5318639,{codes:[4064256]});
    for(const player of [0,1]) {assert.equal(cardByCode(s,player,L.MZONE,23635815).race,1024n);assert.equal(cardByCode(s,player,L.GRAVE,89631139).race,8192n);}
    assert.ok(reachIdle(s).summons.some(c=>c.code===89631139));perform(s,'summon',89631139);assert.equal(cardByCode(s,0,L.MZONE,89631139).race,8192n);
    assert.equal(s.location(0,L.GRAVE).filter(c=>[23635815,43096270].includes(c.code)).length,2);requireChain(s,4064256);requireChain(s,5318639);fieldQuery(s);
  });

  await run('continuation-b-union-hangar-unequip-restriction-expires-at-end-phase',[66399653],
    'Hangar equips B-Buster Drake and prevents its release that turn. After genuine turn transitions, the restriction expires and Drake can unequip into a real monster zone.',s=>{
    const L=s.C.OcgLocation;
    s.add(66399653,0,L.HAND).add(30012506,0,L.DECK).add(77411244,0,L.DECK).baseDecks().start();
    perform(s,'activate',66399653,{codes:[30012506]});perform(s,'summon',30012506,{codes:[77411244]});
    assert.ok(hasCode(s,0,L.SZONE,77411244));assert.ok(!reachIdle(s).activates.some(c=>c.code===77411244));
    endTurn(s);endTurn(s);assert.ok(reachIdle(s).activates.some(c=>c.code===77411244&&c.location===L.SZONE));
    perform(s,'activate',77411244,{}, {location:L.SZONE});requireChain(s,66399653);requireChain(s,77411244);
    assert.ok(hasCode(s,0,L.MZONE,77411244));assert.ok(!hasCode(s,0,L.SZONE,77411244));assert.equal(cardByCode(s,0,L.MZONE,77411244).attack,1500);fieldQuery(s);
  });

  await run('continuation-b-union-hangar-facedown-target-cannot-equip-at-resolution',[66399653],
    'Book of Moon chains to the Hangar equip trigger and sets A-Assault Core face-down. Hangar resolves without illegally moving B-Buster Drake from Deck.',s=>{
    const L=s.C.OcgLocation,book=name('Book of Moon');
    s.add(66399653,0,L.HAND).add(30012506,0,L.DECK).add(77411244,0,L.DECK).add(book,1,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();
    perform(s,'activate',66399653,{codes:[30012506]});
    perform(s,'summon',30012506,{...respondOnlyTo(s,66399653,book),codes:[30012506,77411244]});
    requireChain(s,book);requireChain(s,66399653);assert.equal(chains(s,book)[0].chain_size,2);
    assert.ok(cardByCode(s,0,L.MZONE,30012506).position&s.C.OcgPosition.FACEDOWN);assert.ok(hasCode(s,0,L.DECK,77411244));
    assert.ok(!hasCode(s,0,L.SZONE,77411244));assert.equal(s.messages.filter(m=>m.type===s.C.OcgMessageType.EQUIP).length,0);fieldQuery(s);
  });

  await run('continuation-b-spyral-target-protection-restored-after-field-destruction',[54631665],
    'Resort removes the own SPYRAL from opposing Book of Moon targets while leaving a non-SPYRAL legal. Opposing MST can target Resort itself; afterward the same Book can target and set the SPYRAL.',s=>{
    const L=s.C.OcgLocation,agent=name('SPYRAL Super Agent'),book=name('Book of Moon');
    s.add(54631665,0,L.HAND).add(agent,0,L.MZONE).add(23635815,0,L.MZONE,1).add(89631139,0,L.GRAVE).add(5318639,1,L.HAND).add(book,1,L.HAND).add(book,1,L.HAND).baseDecks().start();
    perform(s,'activate',54631665);endTurn(s);perform(s,'activate',book,{codes:[23635815]});
    const first=s.decisions.find(d=>d.prompt.type===s.C.OcgMessageType.SELECT_CARD&&d.prompt.selects.some(c=>c.code===23635815));assert.ok(first);assert.ok(!first.prompt.selects.some(c=>c.code===agent));
    assert.ok(cardByCode(s,0,L.MZONE,23635815).position&s.C.OcgPosition.FACEDOWN);
    perform(s,'activate',5318639,{codes:[54631665]});assert.ok(hasCode(s,0,L.GRAVE,54631665));
    const before=s.decisions.length;perform(s,'activate',book,{codes:[agent]});
    assert.ok(s.decisions.slice(before).some(d=>d.prompt.type===s.C.OcgMessageType.SELECT_CARD&&d.prompt.selects.some(c=>c.code===agent)));
    assert.ok(cardByCode(s,0,L.MZONE,agent).position&s.C.OcgPosition.FACEDOWN);requireChain(s,54631665);requireChain(s,book);fieldQuery(s);
  });

  for(const hasGraveMonster of [false,true])await run(`continuation-b-spyral-maintenance-${hasGraveMonster?'declined-legal-shuffle':'no-legal-shuffle'}-destroys-as-cost`,[54631665],
    hasGraveMonster?'Decline the available GY-monster shuffle at the real own End Phase: Resort is destroyed as maintenance cost while the GY monster stays.'
      :'With no monster in GY, Resort must destroy itself as maintenance cost during the real own End Phase.',s=>{
    const L=s.C.OcgLocation;s.add(54631665,0,L.HAND);if(hasGraveMonster)s.add(89631139,0,L.GRAVE);s.baseDecks().start();perform(s,'activate',54631665);endTurn(s,{option:hasGraveMonster?1:0});
    const resort=cardByCode(s,0,L.GRAVE,54631665);assert.equal(resort.reason,0x81);assert.ok(!(resort.reason&0x40));assert.ok(!(resort.reason&0x20));assert.ok(!hasCode(s,0,L.SZONE,54631665));
    assert.equal(hasCode(s,0,L.GRAVE,89631139),hasGraveMonster);requireChain(s,54631665);fieldQuery(s);
  });

  await run('continuation-b-mound-level-ten-target-and-nontarget-destruction-protection',[269012],
    'Mound prevents opposing Book of Moon targeting Level 10 monsters on either side and preserves them through non-targeting Dark Hole, but not low-Level monsters. MST then removes protection, allowing Book to target Level 10.',s=>{
    const L=s.C.OcgLocation,kaiju=name('Jizukiru, the Star Destroying Kaiju'),book=name('Book of Moon');
    s.add(269012,0,L.HAND).add(kaiju,0,L.MZONE).add(23635815,0,L.MZONE,1).add(kaiju,1,L.MZONE).add(43096270,1,L.MZONE,1)
      .add(book,1,L.HAND).add(book,1,L.HAND).add(53129443,1,L.HAND).add(5318639,1,L.HAND).baseDecks().start();
    perform(s,'activate',269012);endTurn(s);perform(s,'activate',book,{codes:[23635815]});
    const selection=s.decisions.find(d=>d.prompt.type===s.C.OcgMessageType.SELECT_CARD&&d.prompt.selects.some(c=>c.code===23635815));assert.ok(selection);assert.ok(!selection.prompt.selects.some(c=>c.code===kaiju));
    perform(s,'activate',53129443);for(const player of [0,1])assert.ok(hasCode(s,player,L.MZONE,kaiju));
    assert.ok(hasCode(s,0,L.GRAVE,23635815));assert.ok(hasCode(s,1,L.GRAVE,43096270));
    perform(s,'activate',5318639,{codes:[269012]},{allowEnd:false});perform(s,'activate',book,{respond:(p,C)=>p.type===C.OcgMessageType.SELECT_CARD?{type:C.OcgResponseType.SELECT_CARD,indicies:[p.selects.findIndex(c=>c.code===kaiju&&c.controller===0)]}:null});
    assert.ok(cardByCode(s,0,L.MZONE,kaiju).position&s.C.OcgPosition.FACEDOWN);requireChain(s,269012);requireChain(s,53129443);fieldQuery(s);
  });

  await run('continuation-b-mound-battle-destruction-burn-applies-to-both-players',[269012],
    'Each player’s Level 10 Jizukiru destroys an opposing low-Level monster by battle. Mound inflicts a separate 1000 effect damage on each destroyed monster’s previous controller.',s=>{
    const L=s.C.OcgLocation,kaiju=name('Jizukiru, the Star Destroying Kaiju');
    s.add(269012,0,L.HAND).add(kaiju,0,L.MZONE).add(23635815,0,L.MZONE,1).add(kaiju,1,L.MZONE).add(23635815,1,L.MZONE,1).baseDecks().start();
    perform(s,'activate',269012);endTurn(s);enterBattle(s);battleAttack(s,kaiju,23635815);assert.equal(fieldQuery(s).players[0].lp,5450);
    leaveBattle(s);endTurn(s);enterBattle(s);battleAttack(s,kaiju,23635815);assert.equal(fieldQuery(s).players[1].lp,5450);
    const burn=s.messages.filter(m=>m.type===s.C.OcgMessageType.DAMAGE&&m.amount===1000);assert.equal(burn.length,2);assert.deepEqual(burn.map(m=>m.player).sort(),[0,1]);
    for(const player of [0,1])assert.ok(hasCode(s,player,L.GRAVE,23635815));assert.equal(chains(s,269012).length,3);requireChain(s,269012);leaveBattle(s);
  });

  await run('continuation-b-sky-iris-pendulum-protection-lost-after-field-destruction',[27813661],
    'Sky Iris protects the own Magician in a real Pendulum Zone from opposing MST targeting, while an unrelated face-up Spell is selectable. After MST destroys Sky Iris, the same Magician becomes legal and moves face-up to Extra Deck.',s=>{
    const L=s.C.OcgLocation,magician=name('Timegazer Magician'),continuous=name('Supply Squad');
    s.add(27813661,0,L.HAND).add(magician,0,L.HAND).add(continuous,0,L.SZONE,1).add(5318639,1,L.HAND).add(5318639,1,L.HAND).add(5318639,1,L.HAND).baseDecks().start();
    perform(s,'activate',27813661);perform(s,'activate',magician);assert.ok(hasCode(s,0,L.SZONE,magician));endTurn(s);
    perform(s,'activate',5318639,{codes:[continuous]});
    const first=s.decisions.find(d=>d.prompt.type===s.C.OcgMessageType.SELECT_CARD&&d.prompt.selects.some(c=>c.code===continuous));assert.ok(first);assert.ok(!first.prompt.selects.some(c=>c.code===magician));assert.ok(first.prompt.selects.some(c=>c.code===27813661));
    perform(s,'activate',5318639,{codes:[27813661]});const before=s.decisions.length;perform(s,'activate',5318639,{codes:[magician]});
    assert.ok(s.decisions.slice(before).some(d=>d.prompt.type===s.C.OcgMessageType.SELECT_CARD&&d.prompt.selects.some(c=>c.code===magician)));
    assert.ok(hasCode(s,0,L.EXTRA,magician));assert.ok(cardByCode(s,0,L.EXTRA,magician).position&s.C.OcgPosition.FACEUP);assert.ok(!hasCode(s,0,L.GRAVE,magician));requireChain(s,27813661);fieldQuery(s);
  });

  await run('continuation-b-lair-effect-cost-substitution-does-not-enable-opponent-tribute-summon',[59160188],
    'With no own monsters, Lair allows Enemy Controller to Tribute one opposing monster as activation cost and temporarily control the other. This does not make an ordinary two-Tribute Blue-Eyes Summon legal; End Phase returns control and creates the recorded Tribute token.',s=>{
    const L=s.C.OcgLocation,controller=name('Enemy Controller');
    s.add(59160188,0,L.HAND).add(controller,0,L.HAND).add(89631139,0,L.HAND).add(23635815,1,L.MZONE).add(43096270,1,L.MZONE,1).baseDecks().start();
    perform(s,'activate',59160188);assert.ok(!reachIdle(s).summons.some(c=>c.code===89631139));
    perform(s,'activate',controller,{option:1,codes:[23635815,43096270],respond:(p,C)=>p.type===C.OcgMessageType.SELECT_UNSELECT_CARD?{type:C.OcgResponseType.SELECT_UNSELECT_CARD,index:p.can_finish?null:p.select_cards.findIndex(c=>c.code===23635815)}:null,
      select:p=>p.selects.some(c=>c.code===23635815)?[23635815]:[43096270]});
    assert.ok(hasCode(s,1,L.GRAVE,23635815));assert.ok(cardByCode(s,1,L.GRAVE,23635815).reason&0x80);assert.ok(hasCode(s,0,L.MZONE,43096270));
    assert.ok(!reachIdle(s).summons.some(c=>c.code===89631139));endTurn(s);assert.ok(hasCode(s,1,L.MZONE,43096270));assert.ok(!hasCode(s,0,L.MZONE,43096270));
    const tokens=s.location(0,L.MZONE).filter(c=>c.code===59160189);assert.equal(tokens.length,1);assert.equal(cardByCode(s,0,L.MZONE,59160189).position,s.C.OcgPosition.FACEUP_DEFENSE);requireChain(s,59160188);requireChain(s,controller);fieldQuery(s);
  });

  await run('continuation-b-lair-source-removed-before-end-no-token-and-attribute-reset',[59160188],
    'Ahrima pays a genuine own Tribute cost while Lair records it. MST removes the Field before End Phase: the opposing Blue-Eyes returns to LIGHT and no Torment Token is generated.',s=>{
    const L=s.C.OcgLocation,ahrima=name('Ahrima, the Wicked Warden');
    s.add(59160188,0,L.HAND).add(ahrima,0,L.MZONE).add(5318639,0,L.HAND).add(89631139,1,L.MZONE).baseDecks().start();
    perform(s,'activate',59160188);assert.equal(s.card(1,L.MZONE).attribute,s.C.OcgAttribute.DARK);
    perform(s,'activate',ahrima,{codes:[ahrima],respond:selectOwnTribute});assert.ok(hasCode(s,0,L.GRAVE,ahrima));assert.ok(cardByCode(s,0,L.GRAVE,ahrima).reason&0x80);
    perform(s,'activate',5318639,{codes:[59160188]});assert.equal(s.card(1,L.MZONE).attribute,s.C.OcgAttribute.LIGHT);endTurn(s);
    assert.ok(!hasCode(s,0,L.MZONE,59160189));assert.equal(chains(s,59160188).length,1);requireChain(s,ahrima);requireChain(s,59160188);fieldQuery(s);
  });
  return scenarios;
}

export async function collectNativeFieldContinuationBProvenance(inputs,scenarios) {
  const paths=['scripts/native-field-continuation-b.mjs','tests/native-field-continuation-b.test.mjs','scripts/native-field-audit-inputs.mjs','scripts/native-field-audit-harness.mjs',
    'src/core/native/NativeDuelRuntime.js','src/core/native/NativeCardScriptCorrections.js','src/core/native/NativeDiceDungeonScriptCorrection.js','src/core/native/NativeDuelTowerScriptCorrection.js','src/core/native/NativeSourceIntegrity.js','src/core/native/NativeLuaCompatibility.js','src/core/native/NativeDuelDecisions.js','src/ui/NativeDuelPresentationModel.js','src/core/native/NativeCardData.js','src/core/native/NativeScriptArchive.js','src/core/native/NativeCoreAssets.js',
    'src/core/native/vendor/ocgcore/index.js','src/core/native/vendor/ocgcore/ocgcore.sync-MMMSWPBB.js','src/core/native/vendor/ocgcore/chunk-6GYI7QPM.js','src/core/native/vendor/ocgcore/chunk-L5TW24SS.js',
    'public/native/core-build.json','public/native/manifest.json','public/native/card-data.json','public/native/scripts.json','public/native/field-banlists.json','public/native/ocgcore.sync.wasm'];
  const dependencies=await Promise.all(paths.map(async path=>{const bytes=await readFile(new URL(`../${path}`,import.meta.url));return {path,bytes:bytes.length,sha256:hash(bytes)};}));
  for(const [artifact,path]of [['cards','public/native/card-data.json'],['scripts','public/native/scripts.json'],['fieldBanlists','public/native/field-banlists.json']]) {const actual=dependencies.find(d=>d.path===path),expected=inputs.resources.manifest.artifacts[artifact];assert.equal(actual.sha256,expected.sha256);assert.equal(actual.bytes,expected.bytes);}
  assert.equal(dependencies.find(d=>d.path.endsWith('.wasm')).sha256,inputs.coreBuild.wasmSha256);
  const reader=createNativeScriptReader(inputs.resources.scripts),scripts=new Map();
  for(const scenario of scenarios)for(const card of scenario.fixtureCards) {const filename=`c${card.sourceCode}.lua`,original=inputs.resources.scripts.get(filename);if(typeof original!=='string')continue;const effective=reader(filename);assert.equal(card.scriptSha256,hash(original));assert.equal(card.effectiveScriptSha256,hash(effective));scripts.set(filename,{filename,sourceCode:card.sourceCode,path:inputs.resources.auditScriptFiles?.[filename]?.path??filename,originalSha256:hash(original),effectiveSha256:hash(effective),originalBytes:Buffer.byteLength(original),effectiveBytes:Buffer.byteLength(effective),corrected:original!==effective});}
  const bootstrapScripts=['constant.lua','utility.lua'].map(filename=>{const original=inputs.resources.scripts.get(filename),effective=reader(filename);return {filename,path:inputs.resources.auditScriptFiles?.[filename]?.path??filename,originalSha256:hash(original),effectiveSha256:hash(effective),originalBytes:Buffer.byteLength(original),effectiveBytes:Buffer.byteLength(effective)};});
  const {NATIVE_LUA_COMPATIBILITY_NAME,NATIVE_LUA_COMPATIBILITY_SOURCE}=await import('../src/core/native/NativeLuaCompatibility.js');
  return {dependencies,scripts:[...scripts.values()],bootstrapScripts,compatibilityBootstrap:{filename:NATIVE_LUA_COMPATIBILITY_NAME,implementationPath:'src/core/native/NativeLuaCompatibility.js',effectiveSha256:hash(NATIVE_LUA_COMPATIBILITY_SOURCE),effectiveBytes:Buffer.byteLength(NATIVE_LUA_COMPATIBILITY_SOURCE),purpose:'Existing Group.NewGroup constructor alias; no card effect injected.'},upstreamArchiveBytesModified:false,cardDataModified:false,wasmSha256:inputs.coreBuild.wasmSha256,coreModuleOverride:process.env.NATIVE_CORE_MODULE??null};
}

async function main() {
  const {loadNativeAuditInputs}=await import('./native-field-audit-inputs.mjs');
  const inputs=await loadNativeAuditInputs(),core=await inputs.coreModule.default({...inputs.initializer,sync:true}),scenarios=await runNativeFieldContinuationB(inputs,core);
  const historical=JSON.parse(await readFile(new URL('../docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json',import.meta.url),'utf8'));
  const historicalIds=new Set(historical.scenarios.map(s=>s.id));assert.equal(historicalIds.size,377);assert.ok(scenarios.every(s=>!historicalIds.has(s.id)));
  const counts={scenarios:scenarios.length,passed:scenarios.filter(s=>s.status==='passed').length,failed:scenarios.filter(s=>s.status!=='passed').length,distinctFields:new Set(scenarios.flatMap(s=>s.fields)).size};
  const report={date:'2026-10-08',executedAtUtc:new Date().toISOString(),wave:'continuation-B',nativeApi:core.getVersion(),scope:'Fourteen additional cost, protection, prohibition, phase, control and destination branches. Does not certify all interactions of these Fields.',counts,fixturePolicy:{beforeStartOnly:true,postStartFixtureInjection:false,testMode:false,officialArchivesUnchanged:true,flags:['MODE_MR5','TCG_SEGOC_NONPUBLIC','TCG_SEGOC_FIRSTTRIGGER']},historicalScenarios:{count:377,sourcePath:'docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json',sourceBytesSha256:hash(await readFile(new URL('../docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json',import.meta.url))),idCollisions:0},provenance:await collectNativeFieldContinuationBProvenance(inputs,scenarios),scenarios};
  const output=new URL('../docs/audits/artifacts/continuation-field-b-2026-10-08.json',import.meta.url);await mkdir(new URL('.',output),{recursive:true});await writeFile(output,json(report)+'\n');
  console.log(json(counts));for(const scenario of scenarios)console.log(scenario.status,scenario.id,scenario.error??'');if(counts.failed)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
