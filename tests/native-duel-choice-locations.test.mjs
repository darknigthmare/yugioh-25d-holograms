import test from 'node:test';
import assert from 'node:assert/strict';
import { runNativeChoiceLocations } from '../scripts/audit-native-choice-locations.mjs';
import { nativeSelectablePlaces, translateNativePrompt } from '../src/core/native/NativeDuelDecisions.js';
import { nativeCandidateContext, nativeCandidateSource } from '../src/ui/NativeDuelPresentationModel.js';

test('official WASM accepts location-labelled targets, Fusion placement, hidden cards and successive counter sources', async () => {
  const { result } = await runNativeChoiceLocations();
  assert.equal(result.scenarios.length, 4);
  assert.ok(result.scenarios.every(scenario => scenario.status === 'passed' && scenario.errors.length === 0));
});

test('placement labels use public 1/2 numbers while the original native masks and response places stay intact', () => {
  const allowed = [5, 6, 14, 15, 21, 22, 30, 31].reduce((mask, bit) => mask | (1 << bit), 0);
  for (const type of [18, 24]) {
    const prompt = Object.freeze({ type, player: 0, count: 1, field_mask: (~allowed) >>> 0 });
    const originalMask = prompt.field_mask;
    const places = nativeSelectablePlaces(prompt);
    const descriptor = translateNativePrompt(prompt);
    assert.deepEqual(descriptor.request.candidates.map(card => card.label), [
      'Votre Zone Monstre Extra 1', 'Votre Zone Monstre Extra 2', 'Votre Zone Pendule 1', 'Votre Zone Pendule 2',
      'Adversaire — Zone Monstre Extra 2', 'Adversaire — Zone Monstre Extra 1', 'Adversaire — Zone Pendule 1', 'Adversaire — Zone Pendule 2'
    ]);
    for (const [index, place] of places.entries()) {
      assert.equal(descriptor.request.candidates[index].uid, String(index));
      assert.deepEqual(descriptor.toResponse([String(index)]).places, [place]);
    }
    assert.equal(prompt.field_mask, originalMask);
  }
});

test('candidate presentation uses emitted references without exposing private identity or Deck order', () => {
  const refs = [
    { code: 89631139, controller: 1, location: 1, sequence: 18, position: 8 },
    { code: 89631139, controller: 1, location: 2, sequence: 3, position: 8 },
    { code: 89631139, controller: 1, location: 64, sequence: 7, position: 8 },
    { code: 89631139, controller: 1, location: 32, sequence: 2, position: 8 }
  ];
  let reads = 0;
  const request = translateNativePrompt({ type: 15, player: 0, min: 1, max: 1, selects: refs }, {
    metadata: { getCard() { reads += 1; return { name: 'SECRET' }; } },
    resolveCard() { reads += 1; return { name: 'SECRET' }; }
  }).request;
  assert.equal(reads, 0);
  assert.ok(request.candidates.every(card => card.name === 'Carte face verso' && !card.label.includes('89631139')));
  assert.equal(request.candidates[0].label, 'Carte face verso — Deck adverse');
  assert.equal(request.candidates[1].label, 'Carte face verso — Main adverse');
  assert.equal(request.candidates[2].label, 'Carte face verso — Extra Deck adverse · face verso');
  assert.deepEqual(request.candidates.map(card => card.source), ['deck', 'hand', 'extra', 'removed']);
  assert.deepEqual(request.candidates.map(card => card.uid), ['0', '1', '2', '3']);
});

test('missing wire position is not invented, and code-only sort references gain no fictitious location', () => {
  assert.equal(nativeCandidateContext({ controller: 0, location: 4, sequence: 0, position: 1, overlay_sequence: 1 }, 0), 'Votre Matériel Xyz · Carte 2');
  assert.equal(nativeCandidateSource({ location: 4, overlay_sequence: 1 }), 'overlay');
  assert.equal(nativeCandidateContext({ controller: 1, location: 4, sequence: 6 }, 0), 'Adversaire — Zone Monstre Extra 1');
  assert.equal(nativeCandidateContext({ controller: 0, location: 8, sequence: 5, position: 1 }, 0), 'Votre Zone Terrain · face recto');
  assert.equal(nativeCandidateContext({ code: 89631139 }, 0), '');
  assert.equal(nativeCandidateSource({ code: 89631139 }), 'unknown');
  const request = translateNativePrompt({ type: 25, player: 0, cards: [{ code: 89631139 }] }, {
    metadata: new Map([[89631139, { name: 'Blue-Eyes White Dragon' }]])
  }).request;
  assert.equal(request.candidates[0].label, 'Blue-Eyes White Dragon');
});
