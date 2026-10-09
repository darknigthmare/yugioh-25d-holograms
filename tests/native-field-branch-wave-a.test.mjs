import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { NATIVE_FIELD_BRANCH_WAVE_A_IDS, runNativeFieldBranchWaveA } from '../scripts/audit-native-field-branch-wave-a.mjs';

const originalPaths=['scripts.json','card-data.json','ocgcore.sync.wasm'];
const originalHashes=async()=>Object.fromEntries(await Promise.all(originalPaths.map(async filename=>[
  filename,createHash('sha256').update(await readFile(new URL(`../public/native/${filename}`,import.meta.url))).digest('hex')
])));
test('twelve native branches preserve upstream Lua, card data and WASM',async t=>{
  const before=await originalHashes();
  const inputs=await loadNativeAuditInputs();
  const core=await inputs.coreModule.default({...inputs.initializer,sync:true});
  const scenarios=await runNativeFieldBranchWaveA(inputs,core);
  assert.equal(scenarios.length,12);
  assert.deepEqual(await originalHashes(),before,'Native Lua/CDB/WASM archives must remain byte-exact');
  assert.deepEqual(new Set(scenarios.flatMap(s=>s.fields)),new Set(NATIVE_FIELD_BRANCH_WAVE_A_IDS));
  for(const scenario of scenarios)await t.test(scenario.id,()=>{
    assert.equal(scenario.status,'passed',scenario.error);
    assert.deepEqual(scenario.errors,[],'No native Lua/core diagnostics');
    assert.ok(scenario.fixtureCards.length>0);
    assert.ok(scenario.decisions.length>0);
    assert.ok(scenario.queries.length>0);
    assert.ok(scenario.messages.some(m=>m.type===inputs.coreModule.OcgMessageType.CHAINING));
    assert.ok(scenario.messages.some(m=>m.type===inputs.coreModule.OcgMessageType.CHAIN_SOLVED));
    assert.ok(!scenario.messages.some(m=>m.type===inputs.coreModule.OcgMessageType.RETRY));
    assert.deepEqual(scenario.fixtureSeed,['1','2','3','4']);
    for(const fixture of scenario.fixtureCards){
      if(fixture.scriptSha256!==null){
        assert.match(fixture.scriptSha256,/^[a-f0-9]{64}$/);
        assert.match(fixture.effectiveScriptSha256,/^[a-f0-9]{64}$/);
      }
    }
  });
});
