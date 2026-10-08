import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { createNativeFieldScenarioRunner, perform, reachIdle, endTurn, hasCode, requireChain, clone, json, auditFlags } from './native-field-audit-harness.mjs';
import { createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';

export const NATIVE_FIELD_CONTINUATION_A_IDS = Object.freeze([67616300,40089744,68462976,71645242,57554544,63883999]);
const hash = value => createHash('sha256').update(value).digest('hex');
const fieldQuery = s => { const result=s.duel.queryField(); s.queries.push({query:{field:true},result:clone(result)}); return result; };
const chains = (s,code) => s.messages.filter(m=>m.type===s.C.OcgMessageType.CHAINING && m.code===code);
const noIgnition = (s,code) => assert.ok(!reachIdle(s).activates.some(c=>c.code===code && c.location===s.C.OcgLocation.SZONE));
const present = (s,p,l,c) => s.location(p,l).filter(card=>card.code===c);
function nativeCard(s,p,l,c,flags=0) {
  const query={controller:p,location:l,flags:s.C.OcgQueryFlags.CODE};
  const all=s.duel.queryLocation(query); s.queries.push({query,result:clone(all)});
  const sequence=all.findIndex(card=>card?.code===c); assert.ok(sequence>=0,`${s.label}: missing ${c}`);
  return s.card(p,l,sequence,flags);
}
const refuseOptional = {yes:false,effectYes:()=>false};
function activateMode(s,code,mode,choices={}) {
  const prompt=reachIdle(s),matches=prompt.activates.map((card,index)=>({card,index})).filter(({card})=>card.code===code&&card.location===s.C.OcgLocation.SZONE);
  assert.ok(matches[mode],`${s.label}: missing native ignition mode ${mode} for ${code}`);
  s.respond({type:s.C.OcgResponseType.SELECT_IDLECMD,action:s.C.SelectIdleCMDAction.SELECT_ACTIVATE,index:matches[mode].index});
  return reachIdle(s,choices);
}
const archfiendChoices={select:p=>[p.selects.some(c=>c.code===35975813)?35975813:p.selects.some(c=>c.code===97590747)?97590747:92039899]};

/** Every fixture is complete before start. Native typed decisions alone perform
 * costs, searches, LP changes, restrictions, token generation and Summons. */
export async function runNativeFieldContinuationA(inputs, sharedCore) {
  const {scenarios,run}=createNativeFieldScenarioRunner(inputs,sharedCore);

  await run('continuation-a-chicken-opponent-recovery-cost-and-response-lock',[67616300],
    'Pay 1000 LP for the opponent-recovery option: opponent gains exactly 1000, the Field remains, repeat use is absent and an existing opposing MST cannot respond to the activation.',s=>{
      const L=s.C.OcgLocation,M=s.C.OcgMessageType;
      s.add(67616300,0,L.HAND).add(5318639,1,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();
      perform(s,'activate',67616300); const before=s.messages.length;
      perform(s,'activate',67616300,{option:2,chainSelect:()=>null});
      assert.deepEqual(fieldQuery(s).players.map(p=>p.lp),[7000,9000]); assert.equal(s.card(0,L.SZONE,5).code,67616300);
      assert.ok(hasCode(s,1,L.SZONE,5318639)); noIgnition(s,67616300); requireChain(s,67616300);
      const during=s.messages.slice(before),start=during.findIndex(m=>m.type===M.CHAINING&&m.code===67616300),end=during.findIndex((m,i)=>i>start&&m.type===M.CHAIN_SOLVED);
      assert.ok(start>=0&&end>start); assert.ok(!during.slice(start,end).some(m=>m.type===M.SELECT_CHAIN&&m.selects.some(c=>c.code===5318639)));
      assert.ok(s.messages.some(m=>m.type===M.RECOVER&&m.player===1&&m.amount===1000));
    });

  await run('continuation-a-chicken-destroy-option-removes-prevention',[67616300],
    'Pay 1000 LP and select self-destruction. The Field reaches GY by effect; a later opposing Ookazi damages the lower-LP player because prevention has left the field.',s=>{
      const L=s.C.OcgLocation;
      s.add(67616300,0,L.HAND).add(19523799,1,L.HAND).baseDecks().start();
      perform(s,'activate',67616300); perform(s,'activate',67616300,{option:1});
      assert.equal(fieldQuery(s).players[0].lp,7000); const gone=nativeCard(s,0,L.GRAVE,67616300);
      assert.ok(gone.reason&0x40); assert.ok(gone.reason&1); assert.equal(s.card(0,L.SZONE,5).code,undefined);
      endTurn(s); perform(s,'activate',19523799); assert.equal(fieldQuery(s).players[0].lp,6200);
      requireChain(s,67616300);requireChain(s,19523799);
    });

  await run('continuation-a-chicken-equal-lp-control-and-dynamic-prevention',[67616300],
    'At equal 8000 LP, an opposing Ookazi inflicts 800. After that native damage creates a lower-LP player, a second Ookazi resolves but inflicts no damage.',s=>{
      const L=s.C.OcgLocation,M=s.C.OcgMessageType;
      s.add(67616300,0,L.HAND).add(19523799,1,L.HAND).add(19523799,1,L.HAND).baseDecks().start();
      perform(s,'activate',67616300); assert.deepEqual(fieldQuery(s).players.map(p=>p.lp),[8000,8000]);endTurn(s);
      perform(s,'activate',19523799);assert.equal(fieldQuery(s).players[0].lp,7200);
      perform(s,'activate',19523799);assert.equal(fieldQuery(s).players[0].lp,7200);
      assert.equal(chains(s,19523799).length,2);assert.equal(s.messages.filter(m=>m.type===M.DAMAGE&&m.player===0&&m.amount===800).length,1);requireChain(s,67616300);
    });

  await run('continuation-a-gateway-six-counter-cap-cost-limit-and-reset',[40089744],
    'Seven monsters from both fields are destroyed together; Gateway caps at six counters. A Ritual Spell search consumes three, cannot repeat with three still available, and becomes usable again on the next own turn.',s=>{
      const L=s.C.OcgLocation;
      s.add(40089744,0,L.HAND).add(6368038,0,L.DECK).add(55761792,0,L.DECK).add(55761792,0,L.DECK).add(53129443,0,L.HAND);
      const own=[89631139,46986414,32452818,23635815],opposing=[15025844,97590747,43096270];
      own.forEach((code,i)=>s.add(code,0,L.MZONE,i));opposing.forEach((code,i)=>s.add(code,1,L.MZONE,i));
      s.baseDecks().start();perform(s,'activate',40089744,{codes:[6368038]});perform(s,'activate',53129443);
      assert.equal(s.card(0,L.SZONE,5).counters[1],6);assert.equal(s.location(0,L.GRAVE).filter(c=>own.includes(c.code)).length,4);assert.equal(s.location(1,L.GRAVE).filter(c=>opposing.includes(c.code)).length,3);
      for(const code of own)assert.equal(present(s,0,L.GRAVE,code).length,1);for(const code of opposing)assert.equal(present(s,1,L.GRAVE,code).length,1);
      perform(s,'activate',40089744,{codes:[55761792]});assert.equal(s.card(0,L.SZONE,5).counters[1],3);assert.equal(present(s,0,L.HAND,55761792).length,1);noIgnition(s,40089744);
      endTurn(s);endTurn(s);perform(s,'activate',40089744,{codes:[55761792]});assert.equal(s.card(0,L.SZONE,5).counters[1]??0,0);assert.equal(present(s,0,L.HAND,55761792).length,2);
      assert.equal(chains(s,40089744).length,3);requireChain(s,40089744);
    });

  await run('continuation-a-gateway-deck-exclusion-hand-discard-and-activation-oath',[40089744],
    'Foolish Burial sends a Deck monster without adding a counter; The Tricky discards a hand monster and adds one. A second Gateway activation is barred by its name oath while a legal Gaia remains in Deck.',s=>{
      const L=s.C.OcgLocation;
      s.add(40089744,0,L.HAND).add(40089744,0,L.HAND).add(6368038,0,L.DECK).add(6368038,0,L.DECK)
        .add(81439173,0,L.HAND).add(32452818,0,L.DECK).add(14778250,0,L.HAND).add(89631139,0,L.HAND).baseDecks().start();
      perform(s,'activate',40089744,{codes:[6368038]});perform(s,'activate',81439173,{codes:[32452818]});
      assert.equal(s.card(0,L.SZONE,5).counters[1]??0,0);assert.ok(hasCode(s,0,L.GRAVE,32452818));
      perform(s,'special',14778250,{respond:(p,C)=>p.type===C.OcgMessageType.SELECT_UNSELECT_CARD
        ?{type:C.OcgResponseType.SELECT_UNSELECT_CARD,index:p.can_finish?null:p.select_cards.findIndex(c=>c.code===89631139)}:null});
      assert.equal(s.card(0,L.SZONE,5).counters[1],1); const discarded=nativeCard(s,0,L.GRAVE,89631139);assert.ok(discarded.reason&0x80);assert.ok(discarded.reason&0x4000);
      assert.ok(hasCode(s,0,L.HAND,40089744));assert.ok(hasCode(s,0,L.DECK,6368038));
      assert.ok(!reachIdle(s).activates.some(c=>c.code===40089744&&c.location===L.HAND));requireChain(s,40089744);
    });

  await run('continuation-a-village-owner-without-spellcaster-recovers-on-normal-summon',[68462976],
    'Without an own Spellcaster, Village prohibits its controller’s MST even though the opponent also has none. A real Mystical Elf Normal Summon updates the restriction and permits MST.',s=>{
      const L=s.C.OcgLocation;
      s.add(68462976,0,L.HAND).add(5318639,0,L.HAND).add(15025844,0,L.HAND).add(44095762,1,L.SZONE,0,s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();
      perform(s,'activate',68462976);assert.ok(!reachIdle(s).activates.some(c=>c.code===5318639));
      perform(s,'summon',15025844);assert.ok(reachIdle(s).activates.some(c=>c.code===5318639));
      perform(s,'activate',5318639,{codes:[44095762]});assert.ok(hasCode(s,1,L.GRAVE,44095762));requireChain(s,68462976);requireChain(s,5318639);
    });

  await run('continuation-a-village-opponent-spellcaster-unlocks-own-spells',[68462976],
    'Village initially prohibits an opponent without a Spellcaster. The opponent genuinely Normal Summons Mystical Elf; both players now control Spellcasters and the opponent can activate MST to destroy Village.',s=>{
      const L=s.C.OcgLocation;
      s.add(68462976,0,L.HAND).add(46986414,0,L.MZONE).add(5318639,1,L.HAND).add(15025844,1,L.HAND).baseDecks().start();
      perform(s,'activate',68462976);endTurn(s);assert.ok(!reachIdle(s).activates.some(c=>c.code===5318639));
      perform(s,'summon',15025844);assert.ok(reachIdle(s).activates.some(c=>c.code===5318639));
      perform(s,'activate',5318639,{codes:[68462976]});assert.ok(hasCode(s,0,L.GRAVE,68462976));requireChain(s,68462976);requireChain(s,5318639);
    });

  await run('continuation-a-garden-exact-plant-total-revival-exempts-halving',[71645242],
    'A real Normal Summon creates an opposing 800-ATK Rose Token. Garden’s ignition targets an 800-ATK Mystical Elf in GY, destroys Garden and that token, and revives Elf without halving it or creating another token.',s=>{
      const L=s.C.OcgLocation;
      s.add(71645242,0,L.HAND).add(32452818,0,L.HAND).add(15025844,0,L.GRAVE).baseDecks().start();
      perform(s,'activate',71645242);perform(s,'summon',32452818);
      assert.equal(nativeCard(s,0,L.MZONE,32452818).attack,600);assert.equal(nativeCard(s,1,L.MZONE,71645243).attack,800);
      perform(s,'activate',71645242,{codes:[15025844]});assert.ok(hasCode(s,0,L.GRAVE,71645242));
      assert.equal(nativeCard(s,0,L.MZONE,15025844).attack,800);assert.equal(present(s,1,L.MZONE,71645243).length,0);assert.equal(present(s,0,L.MZONE,71645243).length,0);
      assert.equal(chains(s,71645242).length,3);requireChain(s,71645242);
    });

  await run('continuation-a-garden-full-opposing-zones-halves-without-token',[71645242],
    'All five opposing Main Monster Zones are occupied. Monster Reborn still genuinely Summons Blue-Eyes and Garden halves its ATK, but no Rose Token is Summoned into the occupied zones.',s=>{
      const L=s.C.OcgLocation;
      s.add(71645242,0,L.HAND).add(83764718,0,L.HAND).add(89631139,0,L.GRAVE);
      [46986414,89631139,15025844,97590747,43096270].forEach((code,i)=>s.add(code,1,L.MZONE,i));s.baseDecks().start();
      perform(s,'activate',71645242);perform(s,'activate',83764718,{codes:[89631139]});
      assert.equal(nativeCard(s,0,L.MZONE,89631139).attack,1500);assert.equal(s.location(1,L.MZONE).length,5);assert.ok(!hasCode(s,1,L.MZONE,71645243));requireChain(s,71645242);requireChain(s,83764718);
    });

  await run('continuation-a-garden-simultaneous-summon-halves-both-one-token',[71645242],
    'Rescue Rabbit genuinely Summons two 2000-ATK Normal Monsters simultaneously. Garden halves both to 1000 and creates exactly one opposing Rose Token for that single event.',s=>{
      const L=s.C.OcgLocation;
      s.add(71645242,0,L.HAND).add(85138716,0,L.MZONE).add(43096270,0,L.DECK).add(43096270,0,L.DECK).baseDecks().start();
      perform(s,'activate',71645242);perform(s,'activate',85138716,{codes:[43096270]});
      assert.equal(present(s,0,L.MZONE,43096270).length,2);assert.equal(s.card(0,L.MZONE,0).attack,1000);assert.equal(s.card(0,L.MZONE,1).attack,1000);
      assert.equal(present(s,1,L.MZONE,71645243).length,1);assert.equal(nativeCard(s,1,L.MZONE,71645243).attack,800);assert.equal(chains(s,71645242).length,2);requireChain(s,71645242);requireChain(s,85138716);
    });

  await run('continuation-a-garden-second-active-copy-proves-revival-exemption',[71645242],
    'Two live Gardens halve a 1700-ATK Battle Ox twice to 425 and create two Rose Tokens totaling 1600 ATK. One Garden destroys itself and both Plants to revive Ryu-Kishin Powered; the opposing Garden remains active but does not halve that exempt Summon or create a token.',s=>{
      const L=s.C.OcgLocation;
      s.add(71645242,0,L.HAND).add(71645242,1,L.SZONE,5).add(5053103,0,L.HAND).add(24611934,0,L.GRAVE).baseDecks().start();
      perform(s,'activate',71645242);perform(s,'summon',5053103);
      assert.equal(nativeCard(s,0,L.MZONE,5053103).attack,425);assert.equal(present(s,1,L.MZONE,71645243).length,2);
      for(let i=0;i<2;i++)assert.equal(s.card(1,L.MZONE,i).attack,800);
      perform(s,'activate',71645242,{codes:[24611934]});assert.ok(hasCode(s,0,L.GRAVE,71645242));assert.equal(s.card(1,L.SZONE,5).code,71645242);
      assert.equal(nativeCard(s,0,L.MZONE,24611934).attack,1600);assert.equal(s.location(1,L.MZONE).length,0);assert.equal(present(s,0,L.MZONE,71645243).length,0);
      assert.equal(chains(s,71645242).length,4);requireChain(s,71645242);
    });

  await run('continuation-a-island-empty-field-hand-special-shared-limit-reset',[57554544],
    'Island’s secondary mode Special Summons a FIRE Winged Beast from hand while its controller has no monsters. Both modes share the consumed limit; next own turn the destruction/search mode becomes available and resolves.',s=>{
      const L=s.C.OcgLocation;
      s.add(57554544,0,L.HAND).add(23015896,0,L.HAND).add(32452818,0,L.HAND).add(69000994,0,L.DECK).baseDecks().start();
      perform(s,'activate',57554544);activateMode(s,57554544,1,{codes:[23015896]});
      assert.ok(hasCode(s,0,L.MZONE,23015896));assert.equal(nativeCard(s,0,L.MZONE,23015896).attack,2700);noIgnition(s,57554544);
      endTurn(s,refuseOptional);endTurn(s,refuseOptional);perform(s,'activate',57554544,{codes:[32452818,69000994],yes:false});
      assert.ok(hasCode(s,0,L.GRAVE,32452818));assert.ok(hasCode(s,0,L.HAND,69000994));assert.ok(hasCode(s,0,L.MZONE,23015896));requireChain(s,57554544);
    });

  await run('continuation-a-island-banished-field-destroys-only-own-monsters',[57554544],
    'Cosmic Cyclone banishes the face-up Island. Its forced banishment trigger destroys its controller’s monsters while leaving the opposing monster intact.',s=>{
      const L=s.C.OcgLocation;
      s.add(57554544,0,L.HAND).add(89631139,0,L.MZONE).add(15025844,0,L.MZONE,1).add(46986414,1,L.MZONE).add(8267140,1,L.HAND).baseDecks().start();
      perform(s,'activate',57554544);endTurn(s);perform(s,'activate',8267140,{codes:[57554544]});
      assert.ok(hasCode(s,0,L.REMOVED,57554544));assert.equal(s.location(0,L.MZONE).length,0);assert.ok(hasCode(s,0,L.GRAVE,89631139));assert.ok(hasCode(s,0,L.GRAVE,15025844));
      assert.ok(hasCode(s,1,L.MZONE,46986414));assert.equal(fieldQuery(s).players[1].lp,7000);requireChain(s,57554544);requireChain(s,8267140);
    });

  await run('continuation-a-palabyrinth-deck-summon-effect-banish-and-name-limit',[63883999],
    'Target a Level 4 Archfiend, banish a different Fiend by effect, and Summon a matching-Level Archfiend from Deck. The removal is not a cost, the target stays, the newcomer gains 500 ATK and the name limit is consumed.',s=>{
      const L=s.C.OcgLocation;
      s.add(63883999,0,L.HAND).add(92039899,0,L.MZONE).add(97590747,0,L.MZONE,1).add(35975813,0,L.DECK).add(92039899,0,L.DECK).baseDecks().start();
      perform(s,'activate',63883999);perform(s,'activate',63883999,archfiendChoices);
      assert.ok(hasCode(s,0,L.MZONE,92039899));const removed=nativeCard(s,0,L.REMOVED,97590747);assert.ok(removed.reason&0x40);assert.ok(!(removed.reason&0x80));
      assert.equal(nativeCard(s,0,L.MZONE,35975813).attack,2500);assert.ok(hasCode(s,0,L.DECK,92039899));noIgnition(s,63883999);requireChain(s,63883999);
    });

  await run('continuation-a-palabyrinth-full-zones-removal-frees-grave-revival',[63883999],
    'With all five Main Monster Zones occupied, Palabyrinth remains legal because banishing a different Fiend frees a zone. Its matching-Level Archfiend is genuinely Special Summoned from GY into that free zone.',s=>{
      const L=s.C.OcgLocation;
      s.add(63883999,0,L.HAND).add(92039899,0,L.MZONE).add(97590747,0,L.MZONE,1).add(35975813,0,L.GRAVE);
      for(let i=2;i<5;i++)s.add(89631139,0,L.MZONE,i);s.baseDecks().start();
      perform(s,'activate',63883999);assert.equal(s.location(0,L.MZONE).length,5);perform(s,'activate',63883999,archfiendChoices);
      assert.equal(s.location(0,L.MZONE).length,5);assert.ok(hasCode(s,0,L.REMOVED,97590747));assert.ok(!hasCode(s,0,L.GRAVE,35975813));
      assert.equal(nativeCard(s,0,L.MZONE,35975813).attack,2500);noIgnition(s,63883999);requireChain(s,63883999);
    });
  return scenarios;
}

export async function collectNativeFieldContinuationAProvenance(inputs,scenarios) {
  const paths=['scripts/native-field-continuation-a.mjs','tests/native-field-continuation-a.test.mjs','scripts/native-field-audit-inputs.mjs','scripts/native-field-audit-harness.mjs',
    'src/core/native/NativeDuelRuntime.js','src/core/native/NativeCardScriptCorrections.js','src/core/native/NativeDiceDungeonScriptCorrection.js','src/core/native/NativeDuelTowerScriptCorrection.js','src/core/native/NativeSourceIntegrity.js','src/core/native/NativeLuaCompatibility.js','src/core/native/NativeDuelDecisions.js','src/core/native/NativePublicRevealPolicy.js','src/ui/NativeDuelPresentationModel.js','src/core/native/NativeCardData.js','src/core/native/NativeScriptArchive.js','src/core/native/NativeCoreAssets.js',
    'src/core/native/vendor/ocgcore/index.js','src/core/native/vendor/ocgcore/ocgcore.sync-MMMSWPBB.js','src/core/native/vendor/ocgcore/chunk-6GYI7QPM.js','src/core/native/vendor/ocgcore/chunk-L5TW24SS.js',
    'public/native/core-build.json','public/native/manifest.json','public/native/card-data.json','public/native/scripts.json','public/native/field-banlists.json','public/native/ocgcore.sync.wasm',
    'docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json','docs/audits/artifacts/continuation-field-a-2026-10-08/targeted-tests.txt'];
  const dependencies=await Promise.all(paths.map(async path=>{const bytes=await readFile(new URL(`../${path}`,import.meta.url));return {path,bytes:bytes.length,sha256:hash(bytes)};}));
  for(const [artifact,path] of [['cards','public/native/card-data.json'],['scripts','public/native/scripts.json'],['fieldBanlists','public/native/field-banlists.json']]) {
    const actual=dependencies.find(d=>d.path===path),expected=inputs.resources.manifest.artifacts[artifact];assert.equal(actual.sha256,expected.sha256);assert.equal(actual.bytes,expected.bytes);
  }
  assert.equal(dependencies.find(d=>d.path.endsWith('.wasm')).sha256,inputs.coreBuild.wasmSha256);
  const reader=createNativeScriptReader(inputs.resources.scripts),scripts=new Map();
  for(const scenario of scenarios)for(const card of scenario.fixtureCards){
    const filename=`c${card.sourceCode}.lua`,original=inputs.resources.scripts.get(filename);if(typeof original!=='string')continue;
    const effective=reader(filename),originalSha256=hash(original),effectiveSha256=hash(effective);
    assert.equal(card.scriptSha256,originalSha256);assert.equal(card.effectiveScriptSha256,effectiveSha256);
    scripts.set(filename,{filename,sourceCode:card.sourceCode,path:inputs.resources.auditScriptFiles?.[filename]?.path??filename,originalSha256,effectiveSha256,originalBytes:Buffer.byteLength(original),effectiveBytes:Buffer.byteLength(effective),corrected:original!==effective});
  }
  const historical=JSON.parse(await readFile(new URL('../docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json',import.meta.url),'utf8'));
  assert.equal(historical.scenarios.length,377);const oldIds=new Set(historical.scenarios.map(s=>s.id));for(const scenario of scenarios)assert.ok(!oldIds.has(scenario.id));
  const bootstrapScripts=['constant.lua','utility.lua'].map(filename=>{const original=inputs.resources.scripts.get(filename),effective=reader(filename);return {filename,originalSha256:hash(original),effectiveSha256:hash(effective),originalBytes:Buffer.byteLength(original),effectiveBytes:Buffer.byteLength(effective)};});
  const {NATIVE_LUA_COMPATIBILITY_NAME,NATIVE_LUA_COMPATIBILITY_SOURCE}=await import('../src/core/native/NativeLuaCompatibility.js');
  return {dependencies,scripts:[...scripts.values()],bootstrapScripts,compatibilityBootstrap:{filename:NATIVE_LUA_COMPATIBILITY_NAME,implementationPath:'src/core/native/NativeLuaCompatibility.js',effectiveSha256:hash(NATIVE_LUA_COMPATIBILITY_SOURCE),effectiveBytes:Buffer.byteLength(NATIVE_LUA_COMPATIBILITY_SOURCE)},
    historicalScenarioCount:historical.scenarios.length,historicalReportSha256:dependencies.find(d=>d.path.endsWith('native-field-runtime-wave-2026-10-08.json')).sha256,
    upstreamArchiveBytesModified:false,cardDataModified:false,wasmSha256:inputs.coreBuild.wasmSha256,coreModuleOverride:process.env.NATIVE_CORE_MODULE??null};
}

export async function writeNativeFieldContinuationAReport(){
  const inputs=await loadNativeAuditInputs(),core=await inputs.coreModule.default({...inputs.initializer,sync:true});
  const scenarios=await runNativeFieldContinuationA(inputs,core),provenance=await collectNativeFieldContinuationAProvenance(inputs,scenarios);
  const counts={scenarios:scenarios.length,passed:scenarios.filter(s=>s.status==='passed').length,failed:scenarios.filter(s=>s.status!=='passed').length,distinctFields:new Set(scenarios.flatMap(s=>s.fields)).size};
  const testLogPath='docs/audits/artifacts/continuation-field-a-2026-10-08/targeted-tests.txt';
  const testLog=await readFile(new URL(`../${testLogPath}`,import.meta.url),'utf8');
  const testCounts=Object.fromEntries(['tests','pass','fail','cancelled','skipped','todo'].map(key=>{
    const match=testLog.match(new RegExp(`^# ${key} (\\d+)$`,'m'));assert.ok(match,`Missing actual TAP count: ${key}`);return [key,Number(match[1])];
  }));
  assert.deepEqual(testCounts,{tests:16,pass:16,fail:0,cancelled:0,skipped:0,todo:0});
  const report={date:'2026-10-08',executedAtUtc:new Date().toISOString(),stage:'continuation-field-a-2026-10-08',nativeApi:core.getVersion(),counts,
    validation:{command:'node --test --test-reporter=tap tests/native-field-continuation-a.test.mjs',executorSandboxOverride:'with_additional_permissions',executorAdditionalPermissions:{network:{enabled:true}},testLogPath,testCounts},
    fixturePolicy:{beforeStartOnly:true,postStartFixtureInjection:false,testMode:false,officialArchivesUnchanged:true,flags:auditFlags(inputs.coreModule).toString(),flagNames:['MODE_MR5','TCG_SEGOC_NONPUBLIC','TCG_SEGOC_FIRSTTRIGGER']},provenance,
    limits:['Only the fifteen named conditions, choices and controls are certified; not all interactions of these six Fields.','No browser rendering or universal TCG-rule certification is claimed.','The 377 previous scenario objects and consolidated matrix are not modified by this module.'],scenarios};
  const out=new URL('../docs/audits/artifacts/continuation-field-a-2026-10-08.json',import.meta.url);await mkdir(new URL('.',out),{recursive:true});await writeFile(out,json(report)+'\n');
  console.log(json(counts));for(const s of scenarios)console.log(s.status,s.id,s.error??'');assert.equal(counts.failed,0);assert.equal(counts.scenarios,15);return report;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  if(process.argv.includes('--scenario-json')) {
    const inputs=await loadNativeAuditInputs(),core=await inputs.coreModule.default({...inputs.initializer,sync:true});
    console.log(json(await runNativeFieldContinuationA(inputs,core)));
  } else await writeNativeFieldContinuationAReport();
}
