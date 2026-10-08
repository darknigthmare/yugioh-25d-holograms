import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { NATIVE_FIELD_CONTINUATION_A_IDS, runNativeFieldContinuationA } from '../scripts/native-field-continuation-a.mjs';

const preservedPaths=['public/native/scripts.json','public/native/card-data.json','public/native/ocgcore.sync.wasm','docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json'];
const preservedHashes=async()=>Object.fromEntries(await Promise.all(preservedPaths.map(async path=>[path,createHash('sha256').update(await readFile(new URL(`../${path}`,import.meta.url))).digest('hex')])));
test('fifteen native continuation A branches preserve archives and all 377 historical scenarios',async t=>{
  const before=await preservedHashes(),inputs=await loadNativeAuditInputs(),core=await inputs.coreModule.default({...inputs.initializer,sync:true});
  const scenarios=await runNativeFieldContinuationA(inputs,core);assert.equal(scenarios.length,15);assert.equal(new Set(scenarios.map(s=>s.id)).size,15);
  assert.deepEqual(await preservedHashes(),before);assert.deepEqual(new Set(scenarios.flatMap(s=>s.fields)),new Set(NATIVE_FIELD_CONTINUATION_A_IDS));
  const historical=JSON.parse(await readFile(new URL('../docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json',import.meta.url),'utf8'));assert.equal(historical.scenarios.length,377);
  for(const scenario of scenarios)await t.test(scenario.id,()=>{
    assert.equal(scenario.status,'passed',scenario.error);assert.deepEqual(scenario.errors,[]);assert.deepEqual(scenario.fixtureSeed,['1','2','3','4']);
    assert.ok(!historical.scenarios.some(s=>s.id===scenario.id));assert.ok(scenario.fixtureCards.length);assert.ok(scenario.queries.length);assert.ok(scenario.decisions.length);
    const copies=new Map();for(const card of scenario.fixtureCards){const key=`${card.controller}:${card.sourceCode}`;copies.set(key,(copies.get(key)??0)+1);}
    assert.ok([...copies.values()].every(count=>count<=3),'At most three fixture copies per native identity and player');
    assert.ok(scenario.messages.some(m=>m.type===inputs.coreModule.OcgMessageType.CHAINING));assert.ok(scenario.messages.some(m=>m.type===inputs.coreModule.OcgMessageType.CHAIN_SOLVED));
    assert.ok(!scenario.messages.some(m=>m.type===inputs.coreModule.OcgMessageType.RETRY));
  });
});
