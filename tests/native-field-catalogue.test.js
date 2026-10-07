import test from 'node:test';
import assert from 'node:assert/strict';
import { auditNativeFieldRuntime } from '../scripts/audit-native-field-runtime.mjs';
import { nativeFieldCoverageSnapshot } from '../scripts/generate-native-field-coverage.mjs';
import { NATIVE_FIELD_COVERAGE_SNAPSHOT } from '../src/ui/NativeFieldCoverageSnapshot.js';

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
    assert.ok(scenario.fixtureCards.length > 0);
    assert.equal(scenario.fixtureSeed.length, 4, 'Record the actual native RNG seed for each duel');
    for (const word of scenario.fixtureSeed) {
      assert.ok(BigInt(word) >= 0n && BigInt(word) <= 0xffffffffffffffffn);
    }
    assert.ok(scenario.fixtureSeed.some(word => BigInt(word) !== 0n));
    for (const card of scenario.fixtureCards.filter(card => card.scriptPath)) {
      assert.match(card.scriptSha256, /^[a-f0-9]{64}$/, `Original Lua provenance: ${card.name}`);
    }
    assert.ok(scenario.messages.some(message => message.type === 73), 'native CHAIN_SOLVED required');
    assert.ok(scenario.messages.some(message => message.type === 74), 'native CHAIN_END required');
    assert.ok(!scenario.messages.some(message => message.type === 1), 'native RETRY must fail the audit');
  });
}

test('coverage distinguishes bundled, initialized, effect-tested and browser integration', () => {
  assert.equal(report.summary.effectTested, 115);
  assert.equal(report.summary.scenarios, 128);
  assert.equal(report.summary.passedScenarios, report.summary.scenarios);
  assert.equal(report.summary.integrationTested, 0);
  assert.ok(report.matrix.some(entry => entry.initialized && !entry.effectTested));
  for (const entry of report.matrix) {
    assert.equal(entry.integrationTested, false, 'headless execution cannot claim browser verification');
  }
});

test('compact UI coverage preserves the exact tested core and individual Field Spell evidence', () => {
  const snapshot = nativeFieldCoverageSnapshot(report);
  assert.equal(snapshot.coreRevision, report.coreBuild.coreRevision);
  assert.equal(snapshot.coreWasmSha256, report.coreBuild.wasmSha256);
  assert.deepEqual(snapshot.effectTestedCardIds, report.matrix.filter(row => row.effectTested).map(row => String(row.canonicalCode)));
  assert.deepEqual(snapshot.summary, report.summary);
  assert.deepEqual(NATIVE_FIELD_COVERAGE_SNAPSHOT, snapshot, 'Regenerate the shipped UI snapshot from the current individual evidence');
});

test('24 additional Field Spells have successful scenarios with their actual upstream partners', () => {
  const additionalFields = [50913601, 86318356, 22702055, 82999629, 34103656, 33017655,
    9989792, 45383307, 72772445, 5050644, 94585852, 84171830, 43175858, 59160188,
    91027843, 26232916, 575512, 1295111, 12801833, 76869711, 56433456, 87624166,
    16625614, 48179391];
  for (const code of additionalFields) {
    const entry = report.matrix.find(row => row.canonicalCode === code);
    assert.equal(entry.effectTested, true, entry.name);
    const evidence = report.scenarios.filter(row => row.fields.includes(code));
    assert.ok(evidence.length > 0, entry.name);
    assert.ok(evidence.every(row => row.status === 'passed'), entry.name);
    assert.ok(evidence.every(row => row.fixtureCards.some(card => card.canonicalCode !== code && card.name)),
      `${entry.name}: real CDB partner required; ordinary Normal Monsters may have no Lua script`);
  }
});

test('Dark Sanctuary resolves both RNG coin branches through actual native attacks', () => {
  const tails = report.scenarios.find(row => row.id === 'dark-sanctuary-real-coin-attack-resolution');
  const heads = report.scenarios.find(row => row.id === 'dark-sanctuary-heads-negates-attack-half-atk-effect-damage');
  assert.equal(tails.messages.find(message => message.type === 130).results[0], false);
  assert.equal(heads.messages.find(message => message.type === 130).results[0], true);
  assert.notDeepEqual(heads.fixtureSeed, tails.fixtureSeed);
  for (const scenario of [tails, heads]) {
    assert.ok(scenario.decisions.some(row => row.prompt.type === 10), 'Attack declared through SELECT_BATTLECMD');
    assert.ok(scenario.queries.some(({ query }) => query.field === true), 'Final LP proved by a native field query');
  }
});

test('Pseudo Space copy preserves the physical passcode while the current-name alias and effect reset', () => {
  const scenario = report.scenarios.find(row => row.id === 'pseudo-space-real-wetlands-banish-cost-official-effect-copy-reset');
  const aliases = scenario.queries.filter(({ query, result }) => query.location === 8 && query.sequence === 5
    && result?.code === 77584012 && Number.isInteger(result?.alias)).map(({ result }) => result.alias);
  assert.deepEqual(aliases, [2084239, 77584012]);
  const attacks = scenario.queries.filter(({ query, result }) => query.location === 4 && result?.code === 68638985)
    .map(({ result }) => result.attack);
  assert.deepEqual(attacks, [1900, 700]);
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
