import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNativePublicRevealPolicy } from '../src/core/native/NativePublicRevealPolicy.js';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';
import { PublicCardConfirmation } from '../src/ui/PublicCardConfirmation.js';
import { auditNativeConfirmationContinuation } from '../scripts/audit-native-confirmation-continuation.mjs';

const scripts = new Map(Object.entries(JSON.parse(readFileSync(new URL('../public/native/scripts.json', import.meta.url), 'utf8')).scripts));
const policy = createNativePublicRevealPolicy({ scripts });
const loc = { code: 28279543, controller: 0, location: 2, sequence: 0 };
const confirmation = { type: 31, player: 1, cards: [loc] };
const link = (code, negated = false) => ({ loc: { code, controller: 0 }, negated });

test('public confirmation needs its active source, not an unrelated trusted lower Chain link', () => {
  const context = { chains: new Map([[1, link(2106266)], [2, link(15521027)]]), confirmSourceLink: 2 };
  assert.equal(policy(confirmation, loc, context), false);
  context.confirmSourceLink = 1; assert.equal(policy(confirmation, loc, context), true);
  context.chains.get(1).negated = true; assert.equal(policy(confirmation, loc, context), false);
  context.confirmSourceLink = null; assert.equal(policy(confirmation, loc, context), false);
});

test('source, executed bytes, audience and location must all match the public rule', () => {
  const context = { chains: new Map([[1, link(2106266)]]), confirmSourceLink: 1 };
  const modified = new Map(scripts); modified.set('c2106266.lua', scripts.get('c2106266.lua') + '\n--changed');
  assert.equal(createNativePublicRevealPolicy({ scripts: modified })(confirmation, loc, context), false);
  const changedExecution = createNativePublicRevealPolicy({ scripts }, { scriptReader: name => scripts.get(name) + '\n--changed-execution' });
  assert.equal(changedExecution(confirmation, loc, context), false);
  assert.equal(policy({ ...confirmation, player: 0 }, loc, context), false);
  const deck = { ...loc, location: 1 };
  assert.equal(policy({ ...confirmation, cards: [deck] }, deck, context), false);
  assert.equal(policy(confirmation, { ...loc }, context), false, 'Not a card in this native message');
});

test('native link tracking brackets costs and resolution, then clears on negation and Chain end', () => {
  const context = createNativeVisualContext({ getCardMetadata: code => ({ id: String(code), name: 'Galloping Gaia' }) });
  const chaining = { type: 70, code: 2106266, controller: 0, location: 8, sequence: 5, position: 5, chain_size: 1 };
  translateNativeVisualEvents(chaining, context); assert.equal(context.confirmSourceLink, 1);
  translateNativeVisualEvents({ type: 71, chain_size: 1 }, context); assert.equal(context.confirmSourceLink, null);
  translateNativeVisualEvents({ type: 72, chain_size: 1 }, context); assert.equal(context.confirmSourceLink, 1);
  translateNativeVisualEvents({ type: 76, chain_size: 1 }, context); assert.equal(context.confirmSourceLink, null);
  translateNativeVisualEvents({ type: 72, chain_size: 1 }, context); assert.equal(context.confirmSourceLink, null);
  translateNativeVisualEvents({ type: 74 }, context); assert.equal(context.chains.size, 0);
});

test('public panel rejects private, unconfirmed and unrelated payloads before reading identities', () => {
  let reads = 0;
  const panel = new PublicCardConfirmation({ documentRef: { body: {} }, imageUrl: () => { throw new Error('Image lookup'); } });
  const base = { type: 'reveal', publicReveal: true, nativeConfirmationConfirmed: true,
    confirmationGroupId: 'native-public-confirmation-1', get card() { reads++; throw new Error('Identity read'); } };
  for (const patch of [{ type: 'inspect' }, { private: true }, { publicReveal: false },
    { nativeConfirmationConfirmed: false }, { confirmationGroupId: 'untrusted' }]) {
    const event = Object.create(base); Object.assign(event, patch);
    assert.equal(panel.handle(event, { engine: 'ocgcore-wasm' }), false);
  }
  assert.equal(panel.handle(base, { engine: 'sandbox' }), false);
  assert.equal(panel.handle(base, { engine: 'ocgcore-wasm', winner: 'opponent' }), false);
  assert.equal(reads, 0); assert.deepEqual(panel.cards, []);
});

const report = await auditNativeConfirmationContinuation();
test('all eight bounded public policies have native cases for both controllers and keep private inspection', () => {
  assert.deepEqual(report.summary, { scenarios: 22, passed: 22, publicSourceCards: 8,
    viewersPerScenario: 2, privateCases: 4, publicDecktopCases: 2, publicSourceCases: 16 });
  assert.ok(report.contract.onlyActiveNativeLinkAuthorizesConfirmation);
});
for (const entry of report.cases) test(`authentic confirmation continuation: ${entry.id}`, () => {
  assert.equal(entry.status, 'passed'); assert.deepEqual(entry.errors, []);
  assert.equal(entry.projections.length, 4); assert.ok(entry.messages.length);
});
