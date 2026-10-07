import test from 'node:test';
import assert from 'node:assert/strict';
import { auditNativeFieldRuntime } from '../scripts/audit-native-field-runtime.mjs';

// Missing packaged data, Lua, or WASM is a failure. This suite must never silently
// pass by skipping the exact resources used by the native browser route.
const report = await auditNativeFieldRuntime();

test('all 339 catalogue Field Spells execute genuine Lua initial_effect in separate native duels', () => {
  assert.equal(report.summary.catalogue, 339);
  assert.equal(report.summary.bundled, 339);
  assert.equal(report.summary.initialized, 339);
  assert.deepEqual(report.nativeApi, [11, 0]);
  assert.equal(report.coreRevision, '38d04c9feb1a26617407091380634c87262fe3f8');
  assert.equal(report.coreWasmSha256, report.coreBuild.wasmSha256);
  assert.equal(report.coreBuild.upstreamLuaBytesModified, false);
  assert.equal(report.coreBuild.nativeSourceModified, false);
  for (const entry of report.matrix) {
    assert.equal(entry.bundled, true, `${entry.name}: missing source assets`);
    assert.equal(entry.initialized, true, `${entry.name}: ${JSON.stringify(entry.errors)}`);
    assert.deepEqual(entry.errors, [], entry.name);
    assert.ok(entry.initialQuery.type & 0x80000, entry.name);
    assert.match(entry.scriptSha256, /^[a-f0-9]{64}$/, entry.name);
  }
});

test('native audit uses MR5 plus both TCG SEGOC flags with unmodified scripts and card data', () => {
  assert.deepEqual(report.flagNames, ['MODE_MR5', 'TCG_SEGOC_NONPUBLIC', 'TCG_SEGOC_FIRSTTRIGGER']);
  assert.equal(report.fixture.modifiedScripts, false);
  assert.equal(report.fixture.modifiedCardData, false);
  assert.equal(report.fixture.testMode, false);
  assert.equal(report.fixture.pseudoShuffle, false);
  const flags = BigInt(report.flags);
  assert.equal(flags & 1n, 0n);
  assert.equal(flags & 16n, 0n);
  assert.equal(flags & 0x2000000n, 0n);
});

for (const scenario of report.scenarios) {
  test(`genuine native field effect: ${scenario.id}`, () => {
    assert.equal(scenario.status, 'passed', scenario.error);
    assert.deepEqual(scenario.errors, []);
    assert.ok(scenario.messages.length > 0);
    assert.ok(scenario.decisions.length > 0);
    assert.ok(scenario.queries.length > 0);
    assert.ok(scenario.messages.some(message => message.type === 73), 'native CHAIN_SOLVED required');
    assert.ok(scenario.messages.some(message => message.type === 74), 'native CHAIN_END required');
  });
}

test('coverage distinguishes bundled, initialized, effect-tested and browser integration', () => {
  assert.equal(report.summary.effectTested, 18);
  assert.equal(report.summary.scenarios, 20);
  assert.equal(report.summary.passedScenarios, report.summary.scenarios);
  assert.equal(report.summary.integrationTested, 0);
  assert.ok(report.matrix.some(entry => entry.initialized && !entry.effectTested));
  for (const entry of report.matrix) {
    assert.equal(entry.integrationTested, false, 'headless execution cannot claim browser verification');
  }
});

test('current native core implements the Angelechy opponent Special Summon zone decision', () => {
  const scenario = report.scenarios.find(row => row.id === 'angelechy-endgame-opponent-special-zone-choice');
  assert.equal(scenario.status, 'passed', scenario.error);
  const choice = scenario.decisions.filter(row => row.prompt.type === 18).at(-1);
  assert.equal(choice.prompt.player, 0);
  assert.equal(choice.response.places[0].player, 1);
  assert.equal(choice.response.places[0].sequence, 2);
  assert.ok(scenario.queries.some(({ query, result }) => query.controller === 1 && query.location === 4
    && query.sequence === 2 && result?.code === 45894482));
});

test('prerelease canonical bindings use the original upstream physical card and script', () => {
  const bindings = report.resources.canonicalBindings;
  assert.equal(bindings.length, 4);
  for (const { canonicalCode, sourceCode } of bindings) {
    const entry = report.matrix.find(entry => entry.canonicalCode === canonicalCode);
    assert.equal(entry.sourceCode, sourceCode);
    assert.equal(entry.initialQuery.code, sourceCode);
    assert.equal(entry.scriptPath, `pre-release/c${sourceCode}.lua`);
  }
});
