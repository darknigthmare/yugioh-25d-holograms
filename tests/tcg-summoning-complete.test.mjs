import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { TCG_SUMMONING_CASE_IDS, runTCGSummoningCase } from '../scripts/audit-tcg-summoning-complete.mjs';

const fixturePromise = loadNativeAuditInputs().then(async inputs => ({ inputs,
  core: await inputs.coreModule.default({ ...inputs.initializer, sync: true }) }));

for (const controller of [0, 1]) for (const id of TCG_SUMMONING_CASE_IDS) {
  test(`real TCG core summoning: ${id}, controller ${controller}`, async () => {
    const { inputs, core } = await fixturePromise;
    const proof = await runTCGSummoningCase(inputs, core, id, controller);
    assert.equal(proof.passed, true);
    assert.equal(proof.retryCount, 0);
    assert.equal(proof.luaErrorCount, 0);
  });
}
