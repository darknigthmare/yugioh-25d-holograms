import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { auditTcgChainComplete } from '../scripts/audit-tcg-chain-complete.mjs';
import { nativeChainDecisionInfo } from '../src/core/native/NativeChainDecisionInfo.js';
import { translateNativePrompt, resolveNativeDuelPrompt } from '../src/core/native/NativeDuelDecisions.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const archive = await readFile(new URL('../docs/audits/artifacts/tcg-chain-before-2026-10-08.js.txt', import.meta.url));
const beforeSource = archive.toString().replace('../../ui/NativeDuelPresentationModel.js',
  new URL('../src/ui/NativeDuelPresentationModel.js', import.meta.url).href);
const before = await import(`data:text/javascript;base64,${Buffer.from(beforeSource).toString('base64')}`);
const secret = () => {
  const reads = { code: 0, description: 0, effect: 0, card: 0 };
  const ref = { controller: 1, location: 2, sequence: 0, position: 10,
    get code() { reads.code += 1; return 14558127; },
    get description() { reads.description += 1; return BigInt(14558127) << 20n; } };
  const options = { resolveDescription: () => { reads.effect += 1; return 'Texte secret adverse'; },
    resolveCard: () => { reads.card += 1; return { name: 'Identité secrète adverse' }; } };
  return { ref, reads, options };
};

test('archived adapter reproduces the private SELECT_EFFECTYN description leak; current adapter guards before all private reads', () => {
  const old = secret();
  const oldRequest = before.translateNativePrompt(Object.assign(Object.create(old.ref), { type: 12, player: 0 }), old.options).request;
  assert.equal(oldRequest.description, 'Texte secret adverse'); assert.equal(old.reads.effect, 1);
  // Preserve accessors: object spread itself would read the guarded fields.
  const current = secret(); const prompt = Object.assign(Object.create(current.ref), { type: 12, player: 0 });
  const request = translateNativePrompt(prompt, current.options).request;
  assert.equal(request.description, 'Confirmer cet effet.');
  assert.equal(request.card.name, 'Carte face verso');
  assert.deepEqual(current.reads, { code: 0, description: 0, effect: 0, card: 0 });
  assert.equal(JSON.stringify(request).includes('secret adverse'), false);
  assert.deepEqual(translateNativePrompt(prompt, current.options).toResponse(false), { type: 2, yes: false });
});

test('private opposing chain candidates never read identity or description, even through getters', () => {
  for (const zone of [1, 2, 4, 8, 32, 64]) {
    const s = secret(); const ref = Object.create(s.ref);
    Object.defineProperty(ref, 'location', { value: zone }); Object.defineProperty(ref, 'position', { value: 8 });
    const translated = translateNativePrompt({ type: 16, player: 0, forced: false, selects: [ref] }, s.options);
    assert.equal(translated.request.choices[0].label.startsWith('Carte face verso'), true);
    assert.deepEqual(s.reads, { code: 0, description: 0, effect: 0, card: 0 });
    assert.deepEqual(translated.toResponse(null), { type: 8, index: null });
  }
});

test('a choosing player still sees its own hand effect and a public opponent effect', () => {
  for (const ref of [{ controller: 0, location: 2, position: 10 }, { controller: 1, location: 4, position: 1 }]) {
    const translated = translateNativePrompt({ type: 12, player: 0, code: 14558127,
      description: BigInt(14558127) << 20n, sequence: 0, ...ref },
    { resolveDescription: () => 'Effet autorisé', resolveCard: () => ({ name: 'Carte autorisée' }) });
    assert.equal(translated.request.description, 'Effet autorisé');
    assert.equal(translated.request.card.name, 'Carte autorisée');
  }
});

test('native hints describe the window without looking at candidates or adding legality', () => {
  let identityReads = 0;
  const privateCard = { get code() { identityReads += 1; throw new Error('Private identity'); } };
  for (const [mask, text] of [[0x4000, 'Calcul des dommages'], [0x2000, 'Damage Step'],
    [0x40, 'Après une Invocation Normale'], [0x8000, 'Après la résolution de la Chaîne']]) {
    const info = nativeChainDecisionInfo({ forced: false, hint_timing: mask, selects: [privateCard] });
    assert.equal(info.windowLabel, text); assert.equal(info.count, 1);
    assert.match(info.description, /passez la priorité/);
  }
  assert.equal(identityReads, 0);
  assert.equal(nativeChainDecisionInfo({ hint_timing_other: 0x4000 }).windowLabel, '');
  assert.equal(nativeChainDecisionInfo({ hint_timing: NaN }).windowLabel, '');
});

test('mandatory chain selections have no pass choice and explicit typed indices stay required', () => {
  const prompt = { type: 16, player: 0, forced: true, hint_timing: 0x8000,
    selects: [0, 1].map(sequence => ({ code: 26202165, controller: 0, location: 16, sequence, position: 1 })) };
  const descriptor = translateNativePrompt(prompt);
  assert.equal(descriptor.request.required, true);
  assert.equal(descriptor.request.choices.some(item => item.value === null), false);
  assert.match(descriptor.request.description, /obligatoire/);
  for (const invalid of [undefined, null, false, '0', -1, 2]) assert.equal(descriptor.toResponse(invalid), null);
  assert.deepEqual(descriptor.toResponse(1), { type: 8, index: 1 });
});

test('SORT_CHAIN descriptions identify link order and preserve inverse index-to-rank wire format', async () => {
  const prompt = { type: 21, player: 0, cards: [0, 1, 2].map(sequence => ({
    code: 26202165, controller: 0, location: 16, sequence })) };
  const clicks = [2, 0, 1], descriptions = [];
  const response = await resolveNativeDuelPrompt({ prompt, side: 'player', onDecision: request => {
    descriptions.push(request.description); return clicks.shift();
  } });
  assert.deepEqual(response, { type: 15, order: [1, 2, 0] });
  assert.match(descriptions[0], /Maillon 1/); assert.match(descriptions[2], /Maillon 3/);
  assert.equal(descriptions.every(text => text.includes('dernier Maillon sera résolu en premier')), true);
});

test('cancelled or stale optional decisions cannot respond to the old core window', async () => {
  const prompt = { type: 16, player: 0, forced: false, selects: [] };
  const runtime = { pendingPrompt: prompt, generation: 1, promptGeneration: 1 };
  assert.equal(await resolveNativeDuelPrompt({ prompt, runtime, side: 'player', onDecision: () => undefined }), null);
  assert.equal(await resolveNativeDuelPrompt({ prompt, runtime, side: 'player', onDecision: () => {
    runtime.promptGeneration += 1; return null;
  } }), null);
});

test('all seventeen native TCG timing/chain scenarios execute through typed human descriptors', async t => {
  const report = await auditTcgChainComplete();
  assert.equal(report.counts.scenarios, 17); assert.equal(report.counts.passed, 17);
  assert.equal(report.fixturePolicy.postStartInjection, false);
  for (const scenario of report.scenarios) await t.test(scenario.name, () => {
    assert.equal(scenario.ok, true); assert.deepEqual(scenario.errors, []);
    assert.ok(scenario.transcript.length > 0); assert.ok(scenario.typedDecisions.length > 0);
  });
});

test('historical adapter archive has the exact pinned baseline bytes', () => {
  assert.equal(hash(archive), '1fabda3f41c009307d5a4b5eec2bd2024324e9b00e0dd3cb7674c214861e7e70');
});
