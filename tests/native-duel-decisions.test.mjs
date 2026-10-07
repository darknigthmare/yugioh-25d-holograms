import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NATIVE_DECISION_PROMPT_KINDS, translateNativePrompt, validateNativeDuelResponse,
  chooseNativeAIResponse, resolveNativeDuelPrompt, nativeSelectablePlaces,
  nativeCardMatchesAnnounceOpcode
} from '../src/core/native/NativeDuelDecisions.js';

const card = (code = 100, extra = {}) => ({ code, controller: 0, location: 4, sequence: 0, position: 1, ...extra });
const metadata = new Map([
  [100, { code: 100, name: 'Carte A', alias: 0, type: 1, race: 1n, attribute: 16, setcodes: [0x301] }],
  [101, { code: 101, name: 'Carte B', alias: 0, type: 2, race: 0n, attribute: 0, setcodes: [] }],
  [102, { code: 102, name: 'Jeton interdit', alias: 0, type: 0x4001, race: 1n, attribute: 1, setcodes: [] }],
  [103, { code: 103, name: 'Alias interdit', alias: 100, type: 1, race: 1n, attribute: 16, setcodes: [] }]
]);
const opcode = code => 0x4000000000000000n + (BigInt(code) << 32n);
const options = { metadata };
const base = { player: 0 };
const fixtures = [
  ['SELECT_EFFECTYN', { ...base, type: 12, ...card(), description: 1600n }, true, { type: 2, yes: true }],
  ['SELECT_YESNO', { ...base, type: 13, description: 1n }, false, { type: 3, yes: false }],
  ['SELECT_OPTION', { ...base, type: 14, options: [1n, 2n] }, 1, { type: 4, index: 1 }],
  ['SELECT_CARD', { ...base, type: 15, min: 1, max: 2, can_cancel: false, selects: [card(), card(101)] }, ['0', '1'], { type: 5, indicies: [0, 1] }],
  ['SELECT_CHAIN', { ...base, type: 16, forced: true, selects: [card(100, { description: 1600n }), card(100, { description: 1601n })] }, 1, { type: 8, index: 1 }],
  ['SELECT_PLACE', { ...base, type: 18, count: 1, field_mask: 0xfffffffe }, ['0'], { type: 10, places: [{ player: 0, location: 4, sequence: 0 }] }],
  ['SELECT_POSITION', { ...base, type: 19, positions: 5, code: 100 }, 4, { type: 11, position: 4 }],
  ['SELECT_TRIBUTE', { ...base, type: 20, min: 2, max: 1, can_cancel: false, selects: [card(100, { release_param: 2 })] }, ['0'], { type: 12, indicies: [0] }],
  ['SORT_CHAIN', { ...base, type: 21, cards: [card(), card(101)] }, [1, 0], { type: 15, order: [1, 0] }],
  ['SELECT_COUNTER', { ...base, type: 22, counter_type: 1, count: 3, cards: [card(100, { count: 2 }), card(101, { count: 3 })] }, [1, 2], { type: 13, counters: [1, 2] }],
  ['SELECT_SUM', { ...base, type: 23, select_max: 0, amount: 8, min: 1, max: 2,
    selects_must: [card(100, { amount: 3 })], selects: [card(101, { amount: 5 }), card(101, { amount: 4 })] }, ['0'], { type: 14, indicies: [0] }],
  ['SELECT_DISFIELD', { ...base, type: 24, count: 1, field_mask: 0xfffffffe }, ['0'], { type: 9, places: [{ player: 0, location: 4, sequence: 0 }] }],
  ['SORT_CARD', { ...base, type: 25, cards: [card(), card(101)] }, [1, 0], { type: 15, order: [1, 0] }],
  ['SELECT_UNSELECT_CARD', { ...base, type: 26, min: 1, max: 2, can_cancel: false, can_finish: false,
    select_cards: [card()], unselect_cards: [card(101)] }, 1, { type: 7, index: 1 }],
  ['ROCK_PAPER_SCISSORS', { ...base, type: 132 }, 3, { type: 20, value: 3 }],
  ['ANNOUNCE_RACE', { ...base, type: 140, count: 2, available: 1n | (1n << 31n) }, ['0', '1'], { type: 16, races: [1n, 1n << 31n] }],
  ['ANNOUNCE_ATTRIB', { ...base, type: 141, count: 2, available: 17 }, ['0', '1'], { type: 17, attributes: [1, 16] }],
  ['ANNOUNCE_CARD', { ...base, type: 142, opcodes: [1n] }, 100, { type: 18, card: 100 }],
  ['ANNOUNCE_NUMBER', { ...base, type: 143, options: [700n, 9007199254740993n] }, 1, { type: 19, value: 1 }]
];

test('every typed selection kind has a UI translator and a legal AI response', async t => {
  assert.deepEqual(fixtures.map(([kind]) => kind).sort(), [...NATIVE_DECISION_PROMPT_KINDS].sort());
  for (const [kind, prompt, choice, response] of fixtures) await t.test(kind, () => {
    const translated = translateNativePrompt(prompt, options);
    assert.equal(translated.request.nativeKind, kind);
    assert.equal(translated.request.side, 'player');
    assert.deepEqual(translated.toResponse(choice), response);
    assert.equal(validateNativeDuelResponse(prompt, response, options), true);
    assert.equal(validateNativeDuelResponse(prompt, { ...response, type: 999 }, options), false);
    assert.equal(validateNativeDuelResponse(prompt, chooseNativeAIResponse(prompt, options), options), true);
  });
});

test('cardinality, duplicates, invalid indices and cancellation are revalidated', () => {
  const prompt = fixtures.find(([kind]) => kind === 'SELECT_CARD')[1];
  for (const indicies of [[], [0, 0], [0, 3], ['0'], [0, 1, 2], null]) {
    assert.equal(validateNativeDuelResponse(prompt, { type: 5, indicies }, options), false);
  }
  assert.equal(translateNativePrompt(prompt, options).toResponse(null), null);
  assert.deepEqual(translateNativePrompt({ ...prompt, can_cancel: true }, options).toResponse(null), { type: 5, indicies: null });
  const forced = fixtures.find(([kind]) => kind === 'SELECT_CHAIN')[1];
  assert.equal(translateNativePrompt(forced, options).toResponse(null), null);
  assert.deepEqual(translateNativePrompt({ ...forced, forced: false }, options).toResponse(null), { type: 8, index: null });
  const unselect = fixtures.find(([kind]) => kind === 'SELECT_UNSELECT_CARD')[1];
  assert.equal(translateNativePrompt(unselect, options).toResponse(null), null);
  assert.deepEqual(translateNativePrompt({ ...unselect, can_finish: true }, options).toResponse(null), { type: 7, index: null });
});

test('tribute uses release weight, maximum card count and exact UI validation', () => {
  const prompt = { ...base, type: 20, min: 2, max: 1, can_cancel: false,
    selects: [card(100, { release_param: 1 }), card(101, { release_param: 2 })] };
  const translated = translateNativePrompt(prompt, options);
  assert.equal(translated.request.validateSelection(['0']), false);
  assert.equal(translated.request.validateSelection(['1']), true);
  assert.equal(translated.request.validateSelection(['0', '1']), false);
  assert.deepEqual(chooseNativeAIResponse(prompt, options), { type: 12, indicies: [1] });
});

test('sum indices exclude mandatory prefix and support alternate levels and minimal overage', () => {
  const prompt = { ...base, type: 23, select_max: 0, amount: 8, min: 1, max: 2,
    selects_must: [card(100, { amount: 3 })],
    selects: [card(101, { amount: (5 << 16) | 2 }), card(100, { amount: 4 })] };
  const translated = translateNativePrompt(prompt, options);
  assert.deepEqual(translated.request.candidates.map(card => card.uid), ['0', '1']);
  assert.deepEqual(translated.toResponse(['0']), { type: 14, indicies: [0] });
  assert.equal(translated.toResponse(['0', '1']), null);
  assert.equal(translated.request.validateSelection(['1']), false);
  const overage = { ...prompt, select_max: 1, amount: 7, min: 5, max: 5, selects_must: [],
    selects: [card(100, { amount: 4 }), card(101, { amount: (6 << 16) | 2 }), card(100, { amount: 4 })] };
  assert.equal(validateNativeDuelResponse(overage, { type: 14, indicies: [0, 1] }, options), true);
  assert.equal(validateNativeDuelResponse(overage, { type: 14, indicies: [0, 1, 2] }, options), false);
  assert.equal(validateNativeDuelResponse({ ...overage, selects: overage.selects.map(ref => ({ ...ref, amount: 4 })) }, { type: 14, indicies: [0, 1, 2] }, options), false);
  assert.equal(validateNativeDuelResponse(overage, chooseNativeAIResponse(overage, options), options), true);
});

test('sum AI finds a legal subset beyond a combinatorial enumeration budget', () => {
  const prompt = { ...base, type: 23, select_max: 0, amount: 31, min: 2, max: 2, selects_must: [],
    selects: Array.from({ length: 200 }, (_, index) => card(100, { amount: index === 199 ? 30 : 1 })) };
  assert.deepEqual(chooseNativeAIResponse(prompt, options), { type: 14, indicies: [0, 199] });
});

test('field masks are forbidden masks relative to the acting player, including Extra and Pendulum zones', () => {
  const mask = (0xffffffff ^ (1 << 6) ^ (1 << 15) ^ (1 << 16) ^ (1 << 29)) >>> 0;
  const prompt = { player: 1, type: 18, count: 2, field_mask: mask };
  assert.deepEqual(nativeSelectablePlaces(prompt), [
    { player: 1, location: 4, sequence: 6 }, { player: 1, location: 8, sequence: 7 },
    { player: 0, location: 4, sequence: 0 }, { player: 0, location: 8, sequence: 5 }
  ]);
  const legal = nativeSelectablePlaces(prompt);
  assert.equal(validateNativeDuelResponse(prompt, { type: 10, places: legal.slice(0, 2) }), true);
  assert.equal(validateNativeDuelResponse(prompt, { type: 10, places: [legal[0], legal[0]] }), false);
  assert.equal(validateNativeDuelResponse(prompt, { type: 10, places: [legal[0], { player: 1, location: 4, sequence: 0 }] }), false);
});

test('card declarations use native opcode attribute, raw masks, aliases, tokens and public catalogue', () => {
  const attr = [16n, opcode(260)];
  assert.equal(nativeCardMatchesAnnounceOpcode(metadata.get(100), attr), true);
  assert.equal(nativeCardMatchesAnnounceOpcode(metadata.get(101), attr), false);
  // Raw masked values matter when subsequent opcodes perform arithmetic.
  assert.equal(nativeCardMatchesAnnounceOpcode(metadata.get(100), [...attr, 16n, opcode(1), opcode(7)]), true);
  assert.equal(nativeCardMatchesAnnounceOpcode(metadata.get(102), [1n]), false);
  assert.equal(nativeCardMatchesAnnounceOpcode(metadata.get(103), [1n]), false);
  assert.equal(nativeCardMatchesAnnounceOpcode(metadata.get(102), [1n, opcode(21)]), true);
  assert.equal(nativeCardMatchesAnnounceOpcode(metadata.get(103), [1n, opcode(20)]), true);
  assert.equal(nativeCardMatchesAnnounceOpcode(metadata.get(100), [0x301n, opcode(257)]), true);
  assert.equal(nativeCardMatchesAnnounceOpcode(metadata.get(100), [opcode(3)]), false);
  const prompt = { ...base, type: 142, opcodes: attr };
  const translated = translateNativePrompt(prompt, options);
  assert.deepEqual(translated.request.choices.map(choice => choice.value), [100]);
  assert.equal(translated.toResponse(102), null);
  assert.equal(translated.toResponse(101), null);
  assert.equal(translated.toResponse(999999), null);
});

test('announce number selects an index and preserves full bigint labels', () => {
  const prompt = fixtures.find(([kind]) => kind === 'ANNOUNCE_NUMBER')[1];
  const translated = translateNativePrompt(prompt, options);
  assert.equal(translated.request.choices[1].label, '9007199254740993');
  assert.equal(translated.toResponse(700), null);
  assert.deepEqual(translated.toResponse(1), { type: 19, value: 1 });
});

test('unknown and opposing private card identities are never resolved into UI or AI labels', () => {
  let resolved = 0;
  const privateMetadata = new Map([[100, { ...metadata.get(100), name: 'Secret adverse' }]]);
  const prompt = { player: 0, type: 15, min: 1, max: 1, can_cancel: false,
    selects: [card(0, { controller: 1, location: 2 }), card(100, { controller: 1, location: 1 }), card(100, { controller: 1, location: 4, position: 8 })] };
  const translated = translateNativePrompt(prompt, { metadata: privateMetadata, resolveCard: () => { resolved += 1; return { name: 'Secret adverse' }; } });
  assert.equal(resolved, 0);
  assert.equal(translated.request.candidates.every(candidate => candidate.name === 'Carte face verso'), true);
  assert.equal(JSON.stringify(translated.request).includes('Secret adverse'), false);
  assert.deepEqual(chooseNativeAIResponse(prompt, options), { type: 5, indicies: [0] });
});

test('human decisions are explicit, invalid answers and absent UI never produce an automatic response', async () => {
  const prompt = fixtures.find(([kind]) => kind === 'SELECT_POSITION')[1];
  assert.equal(await resolveNativeDuelPrompt({ prompt, side: 'player', metadata }), null);
  assert.equal(await resolveNativeDuelPrompt({ prompt, side: 'player', metadata, onDecision: () => undefined }), null);
  assert.equal(await resolveNativeDuelPrompt({ prompt, side: 'player', metadata, onDecision: () => 8 }), null);
  let requested = 0;
  assert.deepEqual(await resolveNativeDuelPrompt({ prompt, side: 'player', metadata,
    onDecision: request => { requested += 1; assert.equal(request.required, true); return 4; } }), { type: 11, position: 4 });
  assert.equal(requested, 1);
});

test('opponent fallback rejects an illegal custom AI response and has no runtime access', async () => {
  const prompt = fixtures.find(([kind]) => kind === 'SELECT_POSITION')[1];
  assert.deepEqual(await resolveNativeDuelPrompt({ prompt, side: 'opponent', metadata,
    legalAI: input => { assert.equal('runtime' in input, false); assert.equal('prompt' in input, false); return { type: 11, position: 8 }; } }), { type: 11, position: 1 });
  assert.deepEqual(await resolveNativeDuelPrompt({ prompt, side: 'opponent', metadata,
    legalAI: () => { throw new Error('Unavailable policy'); } }), { type: 11, position: 1 });
});

test('pending prompt identity, generations and reset invalidate late asynchronous responses', async () => {
  const prompt = fixtures.find(([kind]) => kind === 'SELECT_POSITION')[1];
  for (const invalidate of [runtime => { runtime.pendingPrompt = { ...prompt }; },
    runtime => { runtime.generation += 1; }, runtime => { runtime.promptGeneration += 1; },
    runtime => { runtime.closed = true; }, runtime => { runtime.ended = true; }]) {
    const runtime = { pendingPrompt: prompt, generation: 1, promptGeneration: 1, closed: false, ended: false };
    let finish;
    const answer = resolveNativeDuelPrompt({ prompt, runtime, side: 'player', metadata,
      onDecision: () => new Promise(resolve => { finish = resolve; }) });
    invalidate(runtime); finish(4);
    assert.equal(await answer, null);
  }
});

test('counter prompts constrain each explicit allocation so the total stays attainable', async () => {
  const prompt = fixtures.find(([kind]) => kind === 'SELECT_COUNTER')[1];
  let calls = 0;
  const response = await resolveNativeDuelPrompt({ prompt, side: 'player', metadata,
    onDecision: request => {
      calls += 1;
      assert.deepEqual(request.choices.map(choice => choice.value), calls === 1 ? [0, 1, 2] : [2]);
      return calls === 1 ? 1 : 2;
    } });
  assert.deepEqual(response, { type: 13, counters: [1, 2] });
  assert.equal(calls, 2);
  assert.equal(validateNativeDuelResponse(prompt, { type: 13, counters: [2, 2] }), false);
});

test('sort decisions preserve click order and encode original-index to rank', async () => {
  const prompt = { ...base, type: 21, cards: [card(100), card(101), card(100)] };
  const selected = [2, 0, 1];
  const offered = [];
  const response = await resolveNativeDuelPrompt({ prompt, side: 'player', metadata,
    onDecision: request => { offered.push(request.choices.map(choice => choice.value)); return selected.shift(); } });
  assert.deepEqual(offered, [[0, 1, 2], [0, 1], [1]]);
  assert.deepEqual(response, { type: 15, order: [1, 2, 0] });
  assert.equal(validateNativeDuelResponse(prompt, { type: 15, order: [0, 0, 1] }), false);
});

test('tossed coins and dice, action menus and informational messages do not request fabricated responses', async () => {
  for (const type of [10, 11, 130, 131, 133, 2, 70, 74, 90, 999]) {
    assert.equal(translateNativePrompt({ ...base, type }, options), null);
    assert.equal(chooseNativeAIResponse({ ...base, type }, options), null);
    assert.equal(await resolveNativeDuelPrompt({ prompt: { ...base, type }, metadata, onDecision: () => { throw new Error('Unexpected decision'); } }), null);
  }
});
