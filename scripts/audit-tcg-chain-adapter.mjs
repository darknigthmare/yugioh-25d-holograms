import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { translateNativePrompt } from '../src/core/native/NativeDuelDecisions.js';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const oldPath = 'docs/audits/artifacts/tcg-chain-before-2026-10-08.js.txt';
const oldBytes = await readFile(new URL(`../${oldPath}`, import.meta.url));
assert.equal(hash(oldBytes), '1fabda3f41c009307d5a4b5eec2bd2024324e9b00e0dd3cb7674c214861e7e70');
const source = oldBytes.toString().replace('../../ui/NativeDuelPresentationModel.js',
  new URL('../src/ui/NativeDuelPresentationModel.js', import.meta.url).href);
const old = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function run(translator, kind, location, position) {
  const reads = { identityGetter: 0, descriptionGetter: 0, descriptionResolver: 0, cardResolver: 0 };
  const reference = { controller: 1, location, sequence: 0, position,
    get code() { reads.identityGetter += 1; return 14558127; },
    get description() { reads.descriptionGetter += 1; return BigInt(14558127) << 20n; } };
  const options = { resolveDescription: () => { reads.descriptionResolver += 1; return 'Texte secret adverse'; },
    resolveCard: () => { reads.cardResolver += 1; return { name: 'Identité secrète adverse' }; } };
  const prompt = kind === 'SELECT_EFFECTYN' ? Object.assign(Object.create(reference), { type: 12, player: 0 })
    : { type: 16, player: 0, forced: false, selects: [reference] };
  const translated = translator(prompt, options);
  return { reads, description: translated.request.description,
    labels: translated.request.choices?.map(item => item.label) ?? [translated.request.card.label],
    legalResponse: translated.toResponse(kind === 'SELECT_EFFECTYN' ? false : null) };
}
const cases = [];
for (const kind of ['SELECT_EFFECTYN', 'SELECT_CHAIN']) for (const location of [1, 2, 4, 8, 32, 64]) {
  const before = run(old.translateNativePrompt, kind, location, 8);
  const after = run(translateNativePrompt, kind, location, 8);
  assert.deepEqual(after.reads, { identityGetter: 0, descriptionGetter: 0, descriptionResolver: 0, cardResolver: 0 });
  if (kind === 'SELECT_EFFECTYN') assert.equal(before.description, 'Texte secret adverse');
  cases.push({ kind, referenceVisibility: 'opposing hidden', location, position: 8, before, after, ok: true });
}
const paths = ['src/core/native/NativeDuelDecisions.js', 'src/core/native/NativeChainDecisionInfo.js',
  'src/ui/NativeDuelPresentationModel.js', 'scripts/audit-tcg-chain-adapter.mjs', 'tests/tcg-chain-complete.test.mjs'];
const sources = await Promise.all(paths.map(async path => {
  const bytes = await readFile(new URL(`../${path}`, import.meta.url));
  return { path, sha256: hash(bytes), bytes: bytes.length };
}));
const report = { date: '2026-10-08', executedAtUtc: new Date().toISOString(), ok: true,
  scope: 'Twelve synthetic adapter visibility guards. These are not twelve additional native duels.',
  baseline: { commit: 'b8e216cd53ccc640366c91755268291afb1840d2', path: oldPath, sha256: hash(oldBytes) },
  cases, sources };
const target = new URL('../docs/audits/artifacts/tcg-chain-adapter-2026-10-08.json', import.meta.url);
await writeFile(target, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, cases: cases.length, reportPath: target.pathname }));
