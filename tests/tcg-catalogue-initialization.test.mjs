import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';
import { createNativeTcgCardTemplate } from '../src/core/native/NativeCardCatalogue.js';
import { initializeTcgCatalogueCard } from '../scripts/audit-tcg-catalogue-initialization.mjs';
import { compactTcgCatalogueReport, expandTcgCatalogueReport } from '../scripts/compact-tcg-catalogue-initialization.mjs';

const fixturePromise = loadNativeAuditInputs().then(async inputs => {
  const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const runtime = await createNativeDuelRuntime({ coreModule: inputs.coreModule, createCore: () => core,
    ...inputs.resources, seed: [1n, 2n, 3n, 4n],
    team1: { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 },
    team2: { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 } });
  const options = runtime.options; runtime.close(); return { inputs, core, options };
});

for (const [code, section] of [[97590747, 'DECK'], [14558127, 'DECK'], [23995346, 'EXTRA'], [24094653, 'DECK'], [41420027, 'DECK'], [70551291, 'DECK']]) {
  test(`TCG compatibility probe initializes actual native card ${code} in ${section}`, async () => {
    const { inputs, core, options } = await fixturePromise;
    const card = createNativeTcgCardTemplate(inputs.resources, code); assert.ok(card);
    const result = initializeTcgCatalogueCard(core, inputs.coreModule, options, card);
    assert.equal(result.ok, true, JSON.stringify(result.nativeDiagnostics));
    assert.equal(result.initialLocation, section);
    assert.equal(result.queryMatches, true);
    assert.equal(result.handleClosed, true);
    if (code === 70551291) {
      assert.equal(result.preIdleResponses.length, 2);
      assert.deepEqual(result.preIdleResponses.map(entry => entry.prompt.player), [0, 1]);
      assert.ok(result.preIdleResponses.every(entry => entry.prompt.forced === false
        && entry.prompt.selects.length === 0 && entry.response.index === null));
    }
  });
}

test('TCG compatibility probe records a real missing card Lua failure without accepting it as supported', async () => {
  const { inputs, core, options } = await fixturePromise;
  const card = createNativeTcgCardTemplate(inputs.resources, 14558127);
  const reader = options.scriptReader;
  const result = initializeTcgCatalogueCard(core, inputs.coreModule, { ...options,
    scriptReader: filename => /^(?:official\/)?c14558127\.lua$/.test(filename) ? null : reader(filename) }, card);
  assert.equal(result.ok, false);
  assert.ok(result.nativeDiagnostics.length > 0 || result.thrownError !== null);
  assert.equal(result.handleClosed, true);
});

test('dictionary compaction preserves every byte of a real native sample report', async () => {
  const raw = await readFile(new URL('../docs/audits/artifacts/tcg-catalogue-initialization-2026-10-08-sample-100.json', import.meta.url));
  const report = JSON.parse(raw), compact = compactTcgCatalogueReport(report);
  assert.ok(compact.commonScriptPrefixIds.length > 0);
  assert.equal(compact.results.length, report.results.length);
  const restored = Buffer.from(`${JSON.stringify(expandTcgCatalogueReport(compact), null, 2)}\n`);
  assert.equal(restored.equals(raw), true);
});
