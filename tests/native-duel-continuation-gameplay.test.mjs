import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { runContinuationGameplay } from '../scripts/audit-continuation-gameplay.mjs';
import { nativeEffectStringReference } from '../src/ui/NativeDuelPresentationModel.js';
import { translateNativePrompt } from '../src/core/native/NativeDuelDecisions.js';

test('official Gateway/Ravine choices, cancelled activation costs and single Pendulum scales obey actual core for both controllers', async () => {
  const inputs = await loadNativeAuditInputs(), core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const report = await runContinuationGameplay(inputs, core, { compareBefore: false });
  assert.equal(report.ok, true); assert.equal(report.scenarios.length, 20);
  assert.ok(report.scenarios.every(scenario => scenario.retryCount === 0 && scenario.luaErrorCount === 0 && !scenario.postStartInjection));
  assert.deepEqual([...new Set(report.scenarios.map(scenario => scenario.controller))], [0, 1]);
});

test('Stringid uses all twenty index bits, preserves system descriptions, and never resolves a hidden chain identity', () => {
  assert.deepEqual(nativeEffectStringReference((12345678n << 20n) | 0x12345n), { code: 12345678, index: 0x12345 });
  for (const value of [null, undefined, 70n, 71n, 72n, -1n, 1n << 64n, 'invalid']) {
    assert.equal(nativeEffectStringReference(value), null);
  }
  const metadata = new Map([[27970830, { name: 'Gateway', strings: ['2 counters', '4 counters', '6 counters'] }]]);
  const options = { type: 14, player: 0, options: [70n, 71n, 72n, (27970830n << 20n) | 2n] };
  assert.deepEqual(translateNativePrompt(options, { metadata }).request.choices.map(choice => choice.label),
    ['MONSTRE', 'MAGIE', 'PIÈGE', '6 counters']);
  let reads = 0;
  const hidden = translateNativePrompt({ type: 16, player: 0, forced: true, selects: [
    { code: 27970830, controller: 1, location: 2, sequence: 0, position: 8, description: (27970830n << 20n) | 2n }
  ] }, { metadata, resolveCard: () => { reads++; throw Error('Private card resolution'); },
    resolveDescription: () => { reads++; throw Error('Private description resolution'); } });
  assert.equal(reads, 0); assert.equal(hidden.request.choices[0].label, 'Carte face verso — Main adverse');
});
