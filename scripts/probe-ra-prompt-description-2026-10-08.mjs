import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { makeSession, perform, json, clone } from './native-field-audit-harness.mjs';
import { translateNativePrompt } from '../src/core/native/NativeDuelDecisions.js';
import { nativeEffectStringReference } from '../src/ui/NativeDuelPresentationModel.js';

// Separate real WASM protocol diagnostic. This is not compiled browser proof.
const inputs = await loadNativeAuditInputs();
const core = await inputs.coreModule.default({ sync: true, ...inputs.initializer });
const session = await makeSession(inputs, core, 'Ra description protocol diagnostic');
try {
  const C = session.C;
  session.baseDecks();
  for (let index = 0; index < 3; index++) session.add(24874630, 0, C.OcgLocation.HAND, index);
  session.add(10000010, 0, C.OcgLocation.HAND, 3).start();
  for (let index = 0; index < 3; index++) perform(session, 'activate', 24874630);
  perform(session, 'summon', 10000010);
  const actualDecision = session.decisions.find(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_EFFECTYN && prompt.code === 10000010);
  assert.ok(actualDecision);
  assert.equal(actualDecision.prompt.description, '221');
  assert.equal(actualDecision.response.yes, true);
  const translated = translateNativePrompt(actualDecision.prompt, { constants: C, metadata: inputs.resources.metadata });
  const resolvedRaQuery = clone(session.card(0, C.OcgLocation.MZONE));
  assert.equal(resolvedRaQuery.attack, 7900);
  assert.equal(resolvedRaQuery.defense, 7900);
  const payLpMessages = session.messages.filter(message => message.type === C.OcgMessageType.PAY_LPCOST);
  assert.deepEqual(payLpMessages.map(message => message.amount), [7900]);
  const raMetadata = inputs.resources.metadata.get(10000010);
  assert.ok(raMetadata.strings[0].includes('pay LP so that you only have 100 left'));
  const sourceHashes = {};
  for (const path of ['scripts/probe-ra-prompt-description-2026-10-08.mjs', 'public/native/card-data.json', 'public/native/scripts.json',
    'public/native/ocgcore.sync.wasm', 'src/core/native/NativeDuelDecisions.js', 'src/ui/NativeDuelPresentationModel.js']) {
    sourceHashes[path] = createHash('sha256').update(await readFile(new URL('../' + path, import.meta.url))).digest('hex');
  }
  const report = { scope: 'Separate headless actual WASM protocol diagnostic; no browser or compiled UI proof.', ok: true, sourceHashes,
    raMetadata, expectedStringDescription: (10000010n << 20n).toString(), actualDecision,
    decodedReference: nativeEffectStringReference(actualDecision.prompt.description), translatedDescription: translated.request.description,
    resolvedRaQuery, payLpMessages, closed: true };
  const path = new URL('../docs/audits/artifacts/tcg-gods-ui-2026-10-08/ra-description-protocol-diagnostic.json', import.meta.url);
  await writeFile(path, json(report) + '\n');
  console.log(json({ ok: true, description: actualDecision.prompt.description, translatedDescription: report.translatedDescription,
    resolvedRaQuery, payLpMessages }));
} finally {
  session.duel.close();
}
