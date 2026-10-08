import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { createNativeFieldScenarioRunner, perform, reachIdle, endTurn, enterBattle, battleAttack,
  leaveBattle, hasCode, requireChain, clone, json, auditFlags } from './native-field-audit-harness.mjs';

export const NATIVE_FIELD_BRANCH_WAVE_A_IDS = Object.freeze([82460246,63017368,85668449,36668118,60514625,32999573]);

function fieldQuery(s) { const result=s.duel.queryField();s.queries.push({query:{field:true},result:clone(result)});return result; }
function chainCount(s,code) { return s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING&&m.code===code).length; }
function noIgnition(s,code) { assert.ok(!reachIdle(s).activates.some(c=>c.code===code&&c.location===s.C.OcgLocation.SZONE)); }
function cardsWithCode(s,player,location,code,flags=0) {
  const query={controller:player,location,flags:s.C.OcgQueryFlags.CODE|s.C.OcgQueryFlags.REASON};
  const cards=s.duel.queryLocation(query);s.queries.push({query,result:clone(cards)});
  return cards.flatMap((c,i)=>c?.code===code?[s.card(player,location,i,flags)]:[]);
}
function selectDifferentNames(p,C) {
  if(p.type!==C.OcgMessageType.SELECT_UNSELECT_CARD)return null;
  const selected=new Set(p.unselect_cards.map(c=>c.code));
  const index=p.select_cards.findIndex(c=>!selected.has(c.code));
  return {type:C.OcgResponseType.SELECT_UNSELECT_CARD,index:index>=0?index:null};
}
const defense=(p,C)=>p.type===C.OcgMessageType.SELECT_POSITION
  ?{type:C.OcgResponseType.SELECT_POSITION,position:C.OcgPosition.FACEUP_DEFENSE}:null;

/** Twelve additional branches, independent native sessions. The fixture is built
 * before start; all destruction, Summons, counters, costs and damage are native. */
export async function runNativeFieldBranchWaveA(inputs, sharedCore) {
  const {scenarios,run}=createNativeFieldScenarioRunner(inputs,sharedCore);

  await run('branch-a-calarium-effect-revival-once-nontuner-control',[82460246],
    'Dark Hole destroys an owned face-up Tuner and non-Tuner. Calarium revives only the Tuner; a second real destruction in the same turn cannot revive it again.',s=>{
    s.add(82460246,0,s.C.OcgLocation.HAND).add(17272964,0,s.C.OcgLocation.MZONE)
      .add(89631139,0,s.C.OcgLocation.MZONE,1).add(53129443,0,s.C.OcgLocation.HAND)
      .add(53129443,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',82460246);perform(s,'activate',53129443,{chainCodes:[82460246],codes:[17272964]});
    assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,17272964);assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,89631139));
    assert.equal(chainCount(s,82460246),2);perform(s,'activate',53129443,{chainCodes:[82460246]});
    assert.equal(s.location(0,s.C.OcgLocation.MZONE).length,0);assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,17272964));
    assert.equal(chainCount(s,82460246),2);requireChain(s,82460246);
  });

  await run('branch-a-calarium-battle-destruction-revival',[82460246],
    'An opposing Blue-Eyes destroys the owned face-up Tuner by battle on the opponent turn. Calarium genuinely revives it after that battle.',s=>{
    s.add(82460246,0,s.C.OcgLocation.HAND).add(17272964,0,s.C.OcgLocation.MZONE,0,s.C.OcgPosition.FACEUP_DEFENSE)
      .add(89631139,1,s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s,'activate',82460246);endTurn(s);enterBattle(s);battleAttack(s,89631139,17272964,{chainCodes:[82460246]});
    assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,17272964);assert.ok(!hasCode(s,0,s.C.OcgLocation.GRAVE,17272964));
    assert.equal(chainCount(s,82460246),2);assert.equal(fieldQuery(s).players[0].lp,8000);leaveBattle(s);requireChain(s,82460246);
  });

  await run('branch-a-wedju-mass-destruction-one-free-zone',[63017368],
    'With exactly one available S/T zone during Dark Hole, Wedju replaces destruction of only one selected Millennium monster; the other Millennium and unrelated monster reach the GY.',s=>{
    s.add(63017368,0,s.C.OcgLocation.HAND).add(38775407,0,s.C.OcgLocation.MZONE)
      .add(38775407,0,s.C.OcgLocation.MZONE,1).add(89631139,0,s.C.OcgLocation.MZONE,2)
      .add(53129443,0,s.C.OcgLocation.HAND);
    for(let i=0;i<3;i++)s.add(5318639,0,s.C.OcgLocation.SZONE,i,s.C.OcgPosition.FACEDOWN_DEFENSE);
    s.baseDecks().start();perform(s,'activate',63017368);perform(s,'activate',53129443,{codes:[38775407],yes:true});
    const converted=cardsWithCode(s,0,s.C.OcgLocation.SZONE,38775407);assert.equal(converted.length,1);
    assert.equal(converted[0].type,s.C.OcgType.SPELL|s.C.OcgType.CONTINUOUS);
    assert.equal(cardsWithCode(s,0,s.C.OcgLocation.GRAVE,38775407).length,1);
    assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,89631139));assert.equal(s.location(0,s.C.OcgLocation.MZONE).length,0);requireChain(s,63017368);
  });

  await run('branch-a-wedju-full-zones-no-replacement',[63017368],
    'Five occupied S/T zones prevent Wedju ignition and destruction replacement. Opposing MST frees one zone; after a genuine Monster Reborn, a second Raigeki now permits replacement into that zone.',s=>{
    s.add(63017368,0,s.C.OcgLocation.HAND).add(38775407,0,s.C.OcgLocation.MZONE)
      .add(89631139,0,s.C.OcgLocation.HAND).add(1164211,0,s.C.OcgLocation.DECK)
      .add(83764718,0,s.C.OcgLocation.HAND).add(12580477,1,s.C.OcgLocation.HAND)
      .add(12580477,1,s.C.OcgLocation.HAND).add(5318639,1,s.C.OcgLocation.HAND);
    for(let i=0;i<5;i++)s.add(5318639,0,s.C.OcgLocation.SZONE,i,s.C.OcgPosition.FACEDOWN_DEFENSE);
    s.baseDecks().start();perform(s,'activate',63017368);noIgnition(s,63017368);endTurn(s);
    perform(s,'activate',12580477);assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,38775407));
    assert.ok(!hasCode(s,0,s.C.OcgLocation.SZONE,38775407));assert.equal(s.location(0,s.C.OcgLocation.MZONE).length,0);
    assert.equal(cardsWithCode(s,0,s.C.OcgLocation.SZONE,5318639).length,5);
    perform(s,'activate',5318639,{codes:[5318639]});assert.equal(cardsWithCode(s,0,s.C.OcgLocation.SZONE,5318639).length,4);
    endTurn(s);perform(s,'activate',83764718,{codes:[38775407]});assert.equal(s.card(0,s.C.OcgLocation.MZONE).code,38775407);
    endTurn(s);perform(s,'activate',12580477,{yes:true});assert.ok(!hasCode(s,0,s.C.OcgLocation.GRAVE,38775407));
    const converted=cardsWithCode(s,0,s.C.OcgLocation.SZONE,38775407);assert.equal(converted.length,1);
    assert.equal(converted[0].type,s.C.OcgType.SPELL|s.C.OcgType.CONTINUOUS);
    requireChain(s,63017368);requireChain(s,12580477);requireChain(s,83764718);
  });

  await run('branch-a-brain-lab-extra-normal-summon-counter-limit',[85668449],
    'After an ordinary Normal Summon, Lab grants one extra Psychic Normal Summon, adds exactly one counter, prevents a third Normal Summon and inflicts 1000 damage when removed.',s=>{
    s.add(85668449,0,s.C.OcgLocation.HAND).add(43096270,0,s.C.OcgLocation.HAND)
      .add(21454943,0,s.C.OcgLocation.HAND).add(21454943,0,s.C.OcgLocation.HAND)
      .add(23635815,0,s.C.OcgLocation.HAND).add(5318639,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',85668449);perform(s,'summon',43096270);
    const eligible=reachIdle(s);assert.ok(eligible.summons.some(c=>c.code===21454943));assert.ok(!eligible.summons.some(c=>c.code===23635815));
    perform(s,'summon',21454943,{yes:true});assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters[4],1);
    assert.equal(cardsWithCode(s,0,s.C.OcgLocation.MZONE,21454943).length,1);assert.equal(reachIdle(s).summons.length,0);
    perform(s,'activate',5318639,{codes:[85668449]});assert.equal(fieldQuery(s).players[0].lp,7000);requireChain(s,85668449);
  });

  await run('branch-a-brain-lab-two-lp-replacements-two-counter-damage',[85668449],
    'Two separate Destructotron activations replace their real 1000-LP costs with two Psychic Counters. LP stay at 8000 until Lab leaves and inflicts exactly 2000 damage.',s=>{
    s.add(85668449,0,s.C.OcgLocation.HAND).add(11232355,0,s.C.OcgLocation.MZONE)
      .add(44095762,1,s.C.OcgLocation.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(53582587,1,s.C.OcgLocation.SZONE,1,s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(5318639,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',85668449);perform(s,'activate',11232355,{codes:[44095762],yes:true});
    assert.equal(fieldQuery(s).players[0].lp,8000);assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters[4],1);
    perform(s,'activate',11232355,{codes:[53582587],yes:true});assert.equal(s.card(0,s.C.OcgLocation.SZONE,5).counters[4],2);
    assert.equal(fieldQuery(s).players[0].lp,8000);for(const c of [44095762,53582587])assert.ok(hasCode(s,1,s.C.OcgLocation.GRAVE,c));
    perform(s,'activate',5318639,{codes:[85668449]});assert.equal(fieldQuery(s).players[0].lp,6000);
    assert.equal(chainCount(s,11232355),2);requireChain(s,85668449);requireChain(s,11232355);
  });

  await run('branch-a-boot-sector-grave-difference-one',[36668118],
    'The GY mode permits only one revival when the opponent controls one additional monster. The revived Rokket enters Defense with exact 300 bonuses; an opposing Rokket receives the same bonus.',s=>{
    s.add(36668118,0,s.C.OcgLocation.HAND).add(26655293,0,s.C.OcgLocation.GRAVE)
      .add(32472237,0,s.C.OcgLocation.GRAVE).add(89631139,0,s.C.OcgLocation.MZONE)
      .add(89631139,1,s.C.OcgLocation.MZONE).add(32472237,1,s.C.OcgLocation.MZONE,1).baseDecks().start();
    perform(s,'activate',36668118);perform(s,'activate',36668118,{respond:(p,C)=>p.type===C.OcgMessageType.SELECT_UNSELECT_CARD
      ?{type:C.OcgResponseType.SELECT_UNSELECT_CARD,index:p.can_finish?null:p.select_cards.findIndex(c=>c.code===26655293)}:null});
    const revived=cardsWithCode(s,0,s.C.OcgLocation.MZONE,26655293);assert.equal(revived.length,1);
    assert.equal(revived[0].position,s.C.OcgPosition.FACEUP_DEFENSE);assert.equal(revived[0].attack,2100);assert.equal(revived[0].defense,1500);
    assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,32472237));assert.equal(s.card(1,s.C.OcgLocation.MZONE,1).attack,2000);
    assert.equal(s.card(1,s.C.OcgLocation.MZONE,1).defense,1700);noIgnition(s,36668118);requireChain(s,36668118);
  });

  await run('branch-a-boot-sector-grave-distinct-names',[36668118],
    'With a difference of three and three GY Rokkets but only two names, the native group selector revives the two distinct names and leaves the duplicate in the GY.',s=>{
    s.add(36668118,0,s.C.OcgLocation.HAND).add(26655293,0,s.C.OcgLocation.GRAVE)
      .add(26655293,0,s.C.OcgLocation.GRAVE).add(32472237,0,s.C.OcgLocation.GRAVE);
    for(let i=0;i<3;i++)s.add(89631139,1,s.C.OcgLocation.MZONE,i);
    s.baseDecks().start();perform(s,'activate',36668118);perform(s,'activate',36668118,{respond:selectDifferentNames});
    const monsters=s.location(0,s.C.OcgLocation.MZONE);assert.equal(monsters.length,2);assert.equal(new Set(monsters.map(c=>c.code)).size,2);
    assert.equal(cardsWithCode(s,0,s.C.OcgLocation.GRAVE,26655293).length,1);
    for(let i=0;i<2;i++)assert.equal(s.card(0,s.C.OcgLocation.MZONE,i).position,s.C.OcgPosition.FACEUP_DEFENSE);
    noIgnition(s,36668118);requireChain(s,36668118);
  });

  await run('branch-a-ecole-token-no-direct-attack',[60514625],
    'The real Mask Token copies 2000/100 but is not offered as a direct attacker against an empty opposing field. A pre-existing Blue-Eyes remains a legal direct attacker and inflicts 3000 damage.',s=>{
    s.add(60514625,0,s.C.OcgLocation.HAND).add(43096270,0,s.C.OcgLocation.HAND)
      .add(89631139,0,s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s,'activate',60514625);perform(s,'summon',43096270);
    const token=cardsWithCode(s,0,s.C.OcgLocation.MZONE,60514626);assert.equal(token.length,1);assert.equal(token[0].attack,2000);assert.equal(token[0].defense,100);
    endTurn(s);endTurn(s);const battle=enterBattle(s);assert.ok(battle.attacks.some(c=>c.code===89631139));
    assert.ok(!battle.attacks.some(c=>c.code===60514626));battleAttack(s,89631139,null);
    assert.equal(fieldQuery(s).players[1].lp,5000);assert.equal(cardsWithCode(s,0,s.C.OcgLocation.MZONE,60514626).length,1);
    leaveBattle(s);requireChain(s,60514625);
  });

  await run('branch-a-ecole-simultaneous-summon-does-not-consume-trigger',[60514625],
    'Rescue Rabbit genuinely summons two Normal Monsters together: Ecole does not destroy them or consume its trigger. A subsequent single Normal Summon is destroyed and produces the matching Mask Token.',s=>{
    s.add(60514625,0,s.C.OcgLocation.HAND).add(85138716,0,s.C.OcgLocation.MZONE)
      .add(43096270,0,s.C.OcgLocation.DECK).add(43096270,0,s.C.OcgLocation.DECK)
      .add(21454943,0,s.C.OcgLocation.HAND).baseDecks().start();
    perform(s,'activate',60514625);perform(s,'activate',85138716,{codes:[43096270]});
    assert.equal(cardsWithCode(s,0,s.C.OcgLocation.MZONE,43096270).length,2);assert.equal(chainCount(s,60514625),1);
    assert.equal(cardsWithCode(s,0,s.C.OcgLocation.MZONE,60514626).length,0);assert.ok(hasCode(s,0,s.C.OcgLocation.REMOVED,85138716));
    perform(s,'summon',21454943);const token=cardsWithCode(s,0,s.C.OcgLocation.MZONE,60514626);
    assert.equal(token.length,1);assert.equal(token[0].attack,1400);assert.equal(token[0].defense,800);
    assert.ok(hasCode(s,0,s.C.OcgLocation.GRAVE,21454943));assert.equal(chainCount(s,60514625),2);requireChain(s,60514625);requireChain(s,85138716);
  });

  await run('branch-a-xyz-override-second-use-must-detach',[32999573],
    'Two Cowboys are genuinely Xyz Summoned. The first pays by face-down hand banishment and preserves both materials. On the second cost in the same turn, Override is exhausted and one real material must be detached.',s=>{
    s.add(32999573,0,s.C.OcgLocation.HAND).add(12014404,0,s.C.OcgLocation.EXTRA)
      .add(12014404,0,s.C.OcgLocation.EXTRA).add(89631139,0,s.C.OcgLocation.HAND).add(46986414,0,s.C.OcgLocation.HAND);
    for(let i=0;i<4;i++)s.add(43096270,0,s.C.OcgLocation.MZONE,i);
    s.baseDecks().start();perform(s,'activate',32999573);perform(s,'special',12014404,{respond:defense});
    perform(s,'activate',12014404,{codes:[89631139],yes:true});perform(s,'special',12014404,{respond:defense});
    perform(s,'activate',12014404,{codes:[43096270],yes:true});
    const cowboys=cardsWithCode(s,0,s.C.OcgLocation.MZONE,12014404,s.C.OcgQueryFlags.OVERLAY_CARD);
    assert.deepEqual(cowboys.map(c=>c.overlayCards.length).sort(),[1,2]);assert.equal(fieldQuery(s).players[1].lp,6400);
    assert.equal(cardsWithCode(s,0,s.C.OcgLocation.REMOVED,89631139).length,1);assert.ok(hasCode(s,0,s.C.OcgLocation.HAND,46986414));
    assert.equal(cardsWithCode(s,0,s.C.OcgLocation.GRAVE,43096270).length,1);assert.equal(chainCount(s,12014404),2);
    requireChain(s,32999573);requireChain(s,12014404);
  });

  await run('branch-a-xyz-override-next-turn-restores-replacement',[32999573],
    'After End Phase and a complete opposing turn, the same Cowboy activates again. Override again banishes a hand card face-down, preserves both materials and the native effect inflicts another 800 damage.',s=>{
    s.add(32999573,0,s.C.OcgLocation.HAND).add(12014404,0,s.C.OcgLocation.EXTRA)
      .add(89631139,0,s.C.OcgLocation.HAND).add(46986414,0,s.C.OcgLocation.HAND)
      .add(43096270,0,s.C.OcgLocation.MZONE).add(43096270,0,s.C.OcgLocation.MZONE,1).baseDecks().start();
    perform(s,'activate',32999573);perform(s,'special',12014404,{respond:defense});perform(s,'activate',12014404,{codes:[89631139],yes:true});
    assert.equal(fieldQuery(s).players[1].lp,7200);endTurn(s);endTurn(s);
    perform(s,'activate',12014404,{codes:[46986414],yes:true});assert.equal(fieldQuery(s).players[1].lp,6400);
    const cow=cardsWithCode(s,0,s.C.OcgLocation.MZONE,12014404,s.C.OcgQueryFlags.OVERLAY_CARD)[0];assert.equal(cow.overlayCards.length,2);
    assert.equal(s.location(0,s.C.OcgLocation.REMOVED).length,2);for(let i=0;i<2;i++)assert.ok(s.card(0,s.C.OcgLocation.REMOVED,i).position&s.C.OcgPosition.FACEDOWN);
    assert.equal(chainCount(s,12014404),2);requireChain(s,32999573);requireChain(s,12014404);
  });
  return scenarios;
}

// CLI/report provenance only: this does not participate in native scenarios.
async function collectBatchExecutionProvenance(inputs, scenarios, assignedIds) {
  const hash = value => createHash('sha256').update(value).digest('hex');
  const modulePath = `scripts/${new URL(import.meta.url).pathname.split('/').at(-1)}`;
  const paths = [modulePath, 'tests/native-field-branch-wave-a.test.mjs', 'scripts/native-field-audit-inputs.mjs', 'scripts/native-field-audit-harness.mjs',
    'src/core/native/NativeDuelRuntime.js', 'src/core/native/NativeCardScriptCorrections.js',
    'src/core/native/NativeDiceDungeonScriptCorrection.js', 'src/core/native/NativeDuelTowerScriptCorrection.js',
    'src/core/native/NativeSourceIntegrity.js', 'src/core/native/NativeLuaCompatibility.js',
    'src/core/native/NativeDuelDecisions.js', 'src/ui/NativeDuelPresentationModel.js', 'src/core/native/NativeCardData.js',
    'src/core/native/NativeScriptArchive.js', 'src/core/native/NativeCoreAssets.js',
    'src/core/native/vendor/ocgcore/index.js', 'src/core/native/vendor/ocgcore/ocgcore.sync-MMMSWPBB.js',
    'src/core/native/vendor/ocgcore/chunk-6GYI7QPM.js', 'src/core/native/vendor/ocgcore/chunk-L5TW24SS.js',
    'public/native/core-build.json', 'public/native/manifest.json', 'public/native/card-data.json',
    'public/native/scripts.json', 'public/native/field-banlists.json', 'public/native/ocgcore.sync.wasm'];
  const dependencies = [];
  for (const path of paths) {
    const bytes = await readFile(new URL(`../${path}`, import.meta.url));
    dependencies.push({ path, bytes: bytes.byteLength, sha256: hash(bytes) });
  }
  for (const [artifact, path] of [['cards', 'public/native/card-data.json'], ['scripts', 'public/native/scripts.json'], ['fieldBanlists', 'public/native/field-banlists.json']]) {
    const archived = dependencies.find(entry => entry.path === path);
    assert.equal(archived.sha256, inputs.resources.manifest.artifacts[artifact].sha256, `${artifact}: original archive hash`);
    assert.equal(archived.bytes, inputs.resources.manifest.artifacts[artifact].bytes, `${artifact}: original archive bytes`);
  }
  assert.equal(dependencies.find(entry => entry.path === 'public/native/ocgcore.sync.wasm').sha256, inputs.coreBuild.wasmSha256);
  const { createNativeScriptReader } = await import('../src/core/native/NativeDuelRuntime.js');
  const reader = createNativeScriptReader(inputs.resources.scripts);
  const describe = sourceCode => {
    const filename = `c${sourceCode}.lua`;
    const original = inputs.resources.scripts.get(filename);
    if (typeof original !== 'string') return null;
    const effective = reader(filename);
    return { sourceCode, filename, path: inputs.resources.auditScriptFiles?.[filename]?.path ?? filename,
      sha256: hash(original), originalSha256: hash(original), effectiveSha256: hash(effective),
      originalBytes: Buffer.byteLength(original, 'utf8'), effectiveBytes: Buffer.byteLength(effective, 'utf8'),
      corrected: original !== effective };
  };
  const fixtureScripts = new Map();
  for (const scenario of scenarios) for (const card of scenario.fixtureCards ?? []) {
    const script = describe(card.sourceCode);
    if (!script) { assert.equal(card.scriptSha256, null); continue; }
    assert.equal(card.scriptSha256, script.originalSha256, `${scenario.id}: original fixture ${script.filename}`);
    assert.equal(card.effectiveScriptSha256, script.effectiveSha256, `${scenario.id}: executed fixture ${script.filename}`);
    card.scriptBytes = script.originalBytes;
    card.effectiveScriptBytes = script.effectiveBytes;
    fixtureScripts.set(script.filename, script);
  }
  const scriptCorrections = [...new Map(scenarios.flatMap(scenario => scenario.scriptCorrections ?? []).map(correction => [correction.filename, correction])).values()];
  const officialFieldScripts = assignedIds.map(canonicalCode => {
    const sourceCode = inputs.resources.canonicalCodeToSource?.get(canonicalCode) ?? canonicalCode;
    const script = describe(sourceCode);
    assert.ok(script, `Missing assigned script c${sourceCode}.lua`);
    return { canonicalCode, ...script };
  });
  return { dependencies, officialFieldScripts, fixtureScripts: [...fixtureScripts.values()], scriptCorrections,
    modifiedScripts: scriptCorrections.length > 0, upstreamArchiveBytesModified: false,
    coreModuleOverride: process.env.NATIVE_CORE_MODULE ?? null, wasmSha256: inputs.coreBuild.wasmSha256 };
}


export async function writeNativeFieldBranchWaveAReport() {
  const inputs=await loadNativeAuditInputs();
  const core=await inputs.coreModule.default({...inputs.initializer,sync:true});
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const archivePaths=['public/native/scripts.json','public/native/card-data.json','public/native/ocgcore.sync.wasm'];
  const hashArchives=async()=>Object.fromEntries(await Promise.all(archivePaths.map(async path=>[path,hash(await readFile(new URL(`../${path}`,import.meta.url)))])));
  const upstreamArchiveHashes=await hashArchives();
  const scenarios=await runNativeFieldBranchWaveA(inputs,core);
  assert.deepEqual(await hashArchives(),upstreamArchiveHashes,'Upstream archive bytes must remain exact');
  const provenance=await collectBatchExecutionProvenance(inputs,scenarios,NATIVE_FIELD_BRANCH_WAVE_A_IDS);
  const sourceHashes=Object.fromEntries(provenance.dependencies.map(({path,sha256})=>[path,sha256]));
  const report={generatedOn:'2026-10-08',stage:'additional-native-branches-wave-a',nativeApi:core.getVersion(),
    coreWasmSha256:inputs.coreBuild.wasmSha256,flags:auditFlags(inputs.coreModule).toString(),
    modifiedScripts:provenance.modifiedScripts,upstreamArchiveBytesModified:false,
    fixtures:{beforeStartOnly:true,modifiedCardData:false,testMode:false},sourceHashes,provenance,upstreamArchiveHashes,
    summary:{fields:NATIVE_FIELD_BRANCH_WAVE_A_IDS.length,scenarios:scenarios.length,
      passedScenarios:scenarios.filter(s=>s.status==='passed').length,
      decisions:scenarios.reduce((n,s)=>n+s.decisions.length,0),queries:scenarios.reduce((n,s)=>n+s.queries.length,0)},
    limits:['Only the twelve named branches and their explicit controls are certified.',
      'This additional wave preserves previous audit artifacts and does not certify every card interaction or browser rendering.'],scenarios};
  const out=new URL('../docs/audits/artifacts/native-field-branch-wave-a-2026-10-08.json',import.meta.url);
  await mkdir(new URL('.',out),{recursive:true});await writeFile(out,`${json(report)}\n`);
  console.log(json(report.summary));
  for(const s of scenarios.filter(s=>s.status!=='passed'))console.error(s.id,s.error.slice(0,600));
  assert.equal(report.summary.passedScenarios,12);
  return report;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)await writeNativeFieldBranchWaveAReport();
