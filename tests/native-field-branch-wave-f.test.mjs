import assert from 'node:assert/strict';
import test from 'node:test';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { runNativeFieldBranchWaveF, NATIVE_FIELD_BRANCH_WAVE_F_IDS } from '../scripts/audit-native-field-branch-wave-f.mjs';

const inputs = await loadNativeAuditInputs();
const core = await inputs.coreModule.default({...inputs.initializer,sync:true});
const scenarios = await runNativeFieldBranchWaveF(inputs,core);
test('wave F contains twelve distinct native branches across the seven assigned Fields',()=>{
  assert.equal(scenarios.length,12);
  assert.equal(new Set(scenarios.map(scenario=>scenario.id)).size,12);
  assert.deepEqual([...new Set(scenarios.flatMap(scenario=>scenario.fields))].sort((a,b)=>a-b),[...NATIVE_FIELD_BRANCH_WAVE_F_IDS].sort((a,b)=>a-b));
});
for(const scenario of scenarios) test(scenario.id,()=>{
  assert.equal(scenario.status,'passed',scenario.error);
  assert.deepEqual(scenario.errors,[]);
  assert.ok(scenario.messages.length && scenario.decisions.length && scenario.queries.length && scenario.fixtureCards.length);
  assert.ok(scenario.fixtureCards.every(card => !card.scriptSha256 || /^[a-f0-9]{64}$/.test(card.effectiveScriptSha256)));
  const M=inputs.coreModule.OcgMessageType;
  assert.ok(!scenario.messages.some(message=>message.type===M.RETRY));
  for(const type of [M.CHAINING,M.CHAIN_SOLVED,M.CHAIN_END]) assert.ok(scenario.messages.some(message=>message.type===type));
});
