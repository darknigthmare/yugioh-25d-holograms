import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeBoardReference, nativeBoardTargetSelector, nativeBoardDecisionTargets }
  from '../src/ui/NativeDuelBoardInteractionModel.js';
import { translateNativePrompt, resolveNativeDuelPrompt }
  from '../src/core/native/NativeDuelDecisions.js';

const ref = (sequence, extra = {}) => ({ code: 0, controller: 0, location: 4, sequence, position: 1, ...extra });
const options = { choosingPlayer: 0, side: 'player' };

test('field targets and hand cards retain exact wire answer indices, independently of card identity', () => {
  const prompt = { type: 15, player: 0, min: 1, max: 2, can_cancel: false,
    selects: [ref(4), ref(1, { location: 2 }), ref(0, { controller: 1 })] };
  const translated = translateNativePrompt(prompt);
  const model = nativeBoardDecisionTargets(translated.request);
  assert.equal(model.unresolved, false);
  assert.equal(model.multiple, true);
  assert.deepEqual(model.targets.map(target => target.value), ['0', '1', '2']);
  assert.deepEqual(model.targets.map(target => target.selector), [
    '.card-zone[data-zone-type="monster"][data-side="player"][data-index="4"]',
    '#player-hand .card-entity[data-hand-index="1"]',
    '.card-zone[data-zone-type="monster"][data-side="opponent"][data-index="0"]'
  ]);
  assert.deepEqual(translated.toResponse([model.targets[2].value]), { type: 5, indicies: [2] });
  assert.equal(translated.toResponse(['2', '2']), null);
});

test('placement highlights follow forbidden-mask inversion with either human controller and physical Extra zones', () => {
  for (const player of [0, 1]) {
    const allowed = [5, 6, 8, 13, 21, 22];
    const mask = allowed.reduce((value, bit) => value & ~(1 << bit), 0xffffffff) >>> 0;
    const prompt = { type: 18, player, count: 2, field_mask: mask };
    const translated = translateNativePrompt(prompt, { side: 'player',
      sideForPlayer: controller => controller === player ? 'player' : 'opponent' });
    const model = nativeBoardDecisionTargets(translated.request);
    assert.equal(model.unresolved, false);
    assert.deepEqual(model.targets.map(target => target.boardRef), [
      { side: 'player', zoneType: 'extra-monster', zoneIndex: 0 },
      { side: 'player', zoneType: 'extra-monster', zoneIndex: 1 },
      { side: 'player', zoneType: 'spell', zoneIndex: 0 },
      { side: 'player', zoneType: 'field', zoneIndex: 0 },
      { side: 'opponent', zoneType: 'extra-monster', zoneIndex: 1 },
      { side: 'opponent', zoneType: 'extra-monster', zoneIndex: 0 }
    ]);
    assert.deepEqual(translated.toResponse(['3', '4']), { type: 10, places: [
      { player, location: 8, sequence: 5 }, { player: player ^ 1, location: 4, sequence: 5 }
    ] });
    assert.equal(translated.toResponse(['3']), null);
  }
});

test('public spatial mapping never reads a hidden identity, Deck order or opposing hand ordinal', () => {
  const hidden = { controller: 1, location: 4, sequence: 2, position: 8,
    get code() { throw new Error('private code read'); },
    get description() { throw new Error('private effect read'); },
    get name() { throw new Error('private name read'); } };
  assert.deepEqual(nativeBoardReference(hidden, options), { side: 'opponent', zoneType: 'monster', zoneIndex: 2 });
  assert.equal(nativeBoardReference({ ...ref(0), controller: 1, location: 2,
    get sequence() { throw new Error('opposing hand ordinal read'); } }, options), null);
  const deck = { controller: 0, location: 1,
    get sequence() { throw new Error('Deck order read'); },
    get code() { throw new Error('Deck identity read'); } };
  assert.deepEqual(nativeBoardReference(deck, options), { side: 'player', zoneType: 'deck' });
  for (const location of [16, 32, 64]) {
    const boardRef = nativeBoardReference({ controller: 0, location,
      get sequence() { throw new Error('pile ordinal read'); },
      get code() { throw new Error('pile identity read'); } }, options);
    assert.equal(Object.hasOwn(boardRef, 'zoneIndex'), false);
  }
});

test('hidden hands and non-rendered material or legacy zones force complete fallback', () => {
  for (const card of [ref(0, { controller: 1, location: 2, position: 8 }),
    ref(0, { overlay_sequence: 0 }), ref(0, { location: 132 }), ref(6, { location: 8 })]) {
    const request = translateNativePrompt({ type: 15, player: 0, min: 1, max: 1, selects: [ref(0), card] }).request;
    const model = nativeBoardDecisionTargets(request);
    assert.equal(model.unresolved, true);
    assert.equal(model.targets.length, 1);
  }
  const piles = translateNativePrompt({ type: 15, player: 0, min: 1, max: 1,
    selects: [ref(1, { location: 16 }), ref(2, { location: 16 })] }).request;
  const model = nativeBoardDecisionTargets(piles);
  assert.deepEqual(model.targets.map(target => target.selector), ['#player-graveyard-zone', '#player-graveyard-zone']);
  assert.deepEqual(model.targets.map(target => target.boardRef.zoneType), ['graveyard', 'graveyard']);
});

test('End Phase response cards stay on their zones and passing priority stays typed null', () => {
  const prompt = { type: 16, player: 0, forced: false, hint_timing: 0x200,
    selects: [ref(3, { location: 8, position: 8 }), ref(2)] };
  const translated = translateNativePrompt(prompt);
  const model = nativeBoardDecisionTargets(translated.request);
  assert.equal(model.unresolved, false);
  assert.equal(model.multiple, false);
  assert.deepEqual(model.targets.map(target => target.value), [0, 1]);
  assert.deepEqual(model.targets[0].boardRef, { side: 'player', zoneType: 'spell', zoneIndex: 3 });
  assert.deepEqual(model.auxiliaryChoices.map(choice => choice.value), [null]);
  assert.deepEqual(translated.toResponse(model.auxiliaryChoices[0].value), { type: 8, index: null });
  assert.deepEqual(translated.toResponse(model.targets[1].value), { type: 8, index: 1 });
  assert.equal(translated.toResponse('1'), null);
  const forced = translateNativePrompt({ ...prompt, forced: true });
  assert.equal(nativeBoardDecisionTargets(forced.request).auxiliaryChoices.length, 0);
  assert.equal(forced.toResponse(null), null);
});

test('material selection retains mandatory prefix and authoritative weighted legality', () => {
  const translated = translateNativePrompt({ type: 23, player: 0, select_max: 0,
    amount: 8, min: 1, max: 2, selects_must: [ref(4, { amount: 3 })],
    selects: [ref(0, { amount: 4 }), ref(2, { amount: 5 })] });
  assert.deepEqual(translated.request.includedCandidates[0].boardRef,
    { side: 'player', zoneType: 'monster', zoneIndex: 4 });
  const model = nativeBoardDecisionTargets(translated.request);
  assert.equal(translated.request.validateSelection([model.targets[0].value]), false);
  assert.equal(translated.request.validateSelection([model.targets[1].value]), true);
  assert.deepEqual(translated.toResponse([model.targets[1].value]), { type: 14, indicies: [1] });
});

test('successive ordered choices keep each surviving card on its original zone', async () => {
  const prompt = { type: 21, player: 0, cards: [ref(4), ref(1), ref(3, { controller: 1 })] };
  const chosen = [2, 0, 1];
  let calls = 0;
  const response = await resolveNativeDuelPrompt({ prompt, side: 'player', onDecision(request) {
    const model = nativeBoardDecisionTargets(request);
    assert.equal(model.unresolved, false);
    assert.deepEqual(model.targets.map(target => target.value), calls === 0 ? [0, 1, 2] : calls === 1 ? [0, 1] : [1]);
    return chosen[calls++];
  } });
  assert.deepEqual(response, { type: 15, order: [1, 2, 0] });
});

test('selector construction rejects malformed sides, oversized zones and selector injection', () => {
  for (const value of [null, {}, { side: 'shared', zoneType: 'monster', zoneIndex: 0 },
    { side: 'player', zoneType: 'monster', zoneIndex: 5 },
    { side: 'player', zoneType: 'extra-monster', zoneIndex: 2 },
    { side: 'opponent', zoneType: 'hand', zoneIndex: 0 },
    { side: 'player', zoneType: 'spell', zoneIndex: '0"] *' },
    { side: 'player', zoneType: 'deck"] *' }]) assert.equal(nativeBoardTargetSelector(value), null);
});
