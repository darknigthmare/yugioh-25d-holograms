import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeDuelRuntime, createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';

function fixture(steps = []) {
  const calls = { processed: 0, destroyed: 0, responses: [], cards: [], scripts: [] };
  const constants = {
    OcgDuelMode: { MODE_MR5: 1n }, OcgPosition: { FACEDOWN_DEFENSE: 8 },
    OcgProcessResult: { END: 0, WAITING: 1, CONTINUE: 2 }
  };
  let current;
  const core = {
    getVersion: () => [11, 0],
    createDuel(options) { calls.options = options; return { id: 1 }; },
    loadScript(_handle, name, script) { calls.scripts.push({ name, script }); return true; },
    duelNewCard(_handle, card) { calls.cards.push(card); },
    startDuel() { calls.started = true; },
    duelProcess() { current = steps[calls.processed++]; return current.status; },
    duelGetMessage() { return current.messages; },
    duelSetResponse(_handle, response) { calls.responses.push(response); },
    destroyDuel() { calls.destroyed += 1; },
    duelQuery(_handle, query) { return query; },
    duelQueryLocation(_handle, query) { return [query]; },
    duelQueryCount: () => 4,
    duelQueryField: () => ({ players: [{ lp: 8000 }, { lp: 7200 }] })
  };
  const options = {
    coreModule: { ...constants, default: async () => core },
    seed: [1n, 2n, 3n, 4n],
    cards: new Map([[123, { code: 123 }]]),
    scripts: new Map([['constant.lua', 'constants'], ['utility.lua', 'utilities']])
  };
  return { core, calls, options };
}

test('native script reader accepts canonical official paths and preserves missing files', () => {
  const reader = createNativeScriptReader(new Map([['official/c123.lua', 'card'], ['utility.lua', 'util']]));
  assert.equal(reader('c123.lua'), 'card');
  assert.equal(reader('official/c123.lua'), 'card');
  assert.equal(reader('utility.lua'), 'util');
  assert.equal(reader('c999.lua'), null);
});

test('native runtime preloads helpers and releases a failed initialization', async () => {
  const { core, calls, options } = fixture();
  core.loadScript = () => false;
  await assert.rejects(createNativeDuelRuntime(options), /constant.lua/);
  assert.equal(calls.destroyed, 1);
});

test('native runtime waits for an explicit reply without repeating messages or processing', async () => {
  const prompt = { type: 11, player: 0, activates: [] };
  const { calls, options } = fixture([
    { status: 2, messages: [{ type: 40, player: 0 }] },
    { status: 1, messages: [prompt] },
    { status: 0, messages: [{ type: 5, player: 0, reason: 1 }] }
  ]);
  const runtime = await createNativeDuelRuntime(options);
  assert.deepEqual(calls.scripts.map(entry => entry.name), ['constant.lua', 'utility.lua', 'native_compatibility.lua']);
  assert.throws(() => runtime.advance(), /not started/);
  runtime.start();
  const first = runtime.advance();
  assert.equal(first.prompt, prompt);
  assert.equal(first.messages.length, 2);
  assert.deepEqual(runtime.advance(), { status: 1, prompt, messages: [] });
  assert.equal(calls.processed, 2);
  const response = { type: 1, action: 7, index: null };
  runtime.respond(response);
  assert.deepEqual(calls.responses, [response]);
  assert.deepEqual(runtime.advance(), { status: 0, prompt: null, messages: [{ type: 5, player: 0, reason: 1 }] });
  assert.deepEqual(runtime.advance(), { status: 0, prompt: null, messages: [] });
  assert.equal(calls.processed, 3);
  assert.throws(() => runtime.respond(response), /not awaiting/);
  runtime.close();
  runtime.close();
  assert.equal(calls.destroyed, 1);
  assert.throws(() => runtime.queryField(), /closed/);
});

test('native processing budget yields every message and resumes the same duel', async () => {
  const { calls, options } = fixture([
    { status: 2, messages: [{ type: 40 }] },
    { status: 2, messages: [{ type: 41 }] },
    { status: 1, messages: [{ type: 11 }] }
  ]);
  const runtime = await createNativeDuelRuntime(options);
  runtime.start();
  assert.deepEqual(runtime.advance({ maxSteps: 1 }), { status: 2, prompt: null, messages: [{ type: 40 }] });
  assert.deepEqual(runtime.advance({ maxSteps: 1 }), { status: 2, prompt: null, messages: [{ type: 41 }] });
  assert.equal(runtime.advance({ maxSteps: 1 }).prompt.type, 11);
  assert.equal(calls.processed, 3);
  runtime.close();
});

test('native card injection maps canonical passcodes to unmodified upstream prerelease scripts', async () => {
  const { calls, options } = fixture();
  options.canonicalCodeToSource = new Map([[12845564, 101402095]]);
  options.cards.set(101402095, { code: 101402095 });
  const runtime = await createNativeDuelRuntime(options);
  runtime.addCard({ code: 12845564, controller: 1, location: 1 });
  assert.equal(calls.cards[0].code, 101402095);
  assert.equal(calls.cards[0].team, 1);
  assert.throws(() => runtime.addCard({ code: 999, controller: 0, location: 1 }), /Missing native card/);
  assert.throws(() => runtime.addCard({ code: 123, controller: 9, location: 1 }), /controller/);
  runtime.start();
  assert.throws(() => runtime.addCard({ code: 123, controller: 0, location: 1 }), /before starting/);
  runtime.close();
});

test('native queries preserve raw authoritative information and supply default overlay index', async () => {
  const { options } = fixture();
  const runtime = await createNativeDuelRuntime(options);
  assert.deepEqual(runtime.queryCard({ controller: 0, sequence: 5 }), { controller: 0, sequence: 5, overlaySequence: 0 });
  assert.deepEqual(runtime.queryLocation({ controller: 1, location: 16 }), [{ controller: 1, location: 16 }]);
  assert.equal(runtime.queryCount(0, 1), 4);
  assert.equal(runtime.queryField().players[1].lp, 7200);
  runtime.close();
});

test('native runtime rejects all-zero seeds and asynchronous asset readers', async () => {
  const invalid = fixture();
  await assert.rejects(createNativeDuelRuntime({ ...invalid.options, seed: [0n, 0n, 0n, 0n] }), /all zero/);
  const asynchronous = fixture();
  await assert.rejects(createNativeDuelRuntime({ ...asynchronous.options, scriptReader: async () => 'lua' }), /synchronous assets/);
  assert.equal(asynchronous.calls.destroyed, 1);
});
