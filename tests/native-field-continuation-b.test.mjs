import assert from 'node:assert/strict';
import test from 'node:test';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { runNativeFieldContinuationB, NATIVE_FIELD_CONTINUATION_B_IDS } from '../scripts/native-field-continuation-b.mjs';

const inputs=await loadNativeAuditInputs();
const core=await inputs.coreModule.default({...inputs.initializer,sync:true});
const scenarios=await runNativeFieldContinuationB(inputs,core);
test('continuation B executes fourteen distinct additional branches across seven Fields',()=>{
  assert.equal(scenarios.length,14);assert.equal(new Set(scenarios.map(s=>s.id)).size,14);
  assert.deepEqual([...new Set(scenarios.flatMap(s=>s.fields))].sort((a,b)=>a-b),[...NATIVE_FIELD_CONTINUATION_B_IDS].sort((a,b)=>a-b));
});
for(const scenario of scenarios)test(scenario.id,()=>{
  assert.equal(scenario.status,'passed',scenario.error);assert.deepEqual(scenario.errors,[]);
  assert.ok(scenario.messages.length&&scenario.decisions.length&&scenario.queries.length&&scenario.fixtureCards.length);
  assert.ok(scenario.fixtureCards.every(c=>!c.scriptSha256||/^[a-f0-9]{64}$/.test(c.effectiveScriptSha256)));
  const M=inputs.coreModule.OcgMessageType;assert.ok(!scenario.messages.some(m=>m.type===M.RETRY));
  for(const type of [M.CHAINING,M.CHAIN_SOLVED,M.CHAIN_END])assert.ok(scenario.messages.some(m=>m.type===type));
});
