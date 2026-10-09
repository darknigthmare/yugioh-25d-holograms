import test from 'node:test';
import assert from 'node:assert/strict';
import { auditNativePublicPresentationWave } from '../scripts/audit-native-public-presentation-wave.mjs';
import { createNativeVisualContext, translateNativeVisualEvents, NATIVE_PUBLIC_VISUAL_QUERY_FLAGS } from '../src/core/native/NativeDuelVisualEvents.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { NativeDuelGame } from '../src/core/native/NativeDuelGame.js';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';

const report = await auditNativePublicPresentationWave();
for (const scenario of report.cases) test(`real native presentation: ${scenario.id}`, () => {
  assert.equal(scenario.status, 'passed');
  assert.deepEqual(scenario.errors, []);
  assert.ok(scenario.decisions.length && scenario.queries.length);
  assert.ok(scenario.messages.some(m => m.type === 74) || scenario.id.startsWith('genuine-hand-'));
  assert.equal(scenario.messages.some(m => m.type === 1), false, 'No rejected native response');
});

test('the genuine revival message prefix produces no successful animation before SPSUMMONED', () => {
  const observed = report.cases[0];
  const context = createNativeVisualContext({ getCardMetadata: code => ({ id: String(code), name: 'Revealed native card', type: 'Normal Monster' }) });
  const events = [];
  for (const message of observed.messages) {
    if (message.type === 63) break;
    events.push(...translateNativeVisualEvents(message, context).events);
  }
  assert.ok(!events.some(event => event.type === 'summon' || event.nativeRevivalConfirmed));
  const success = translateNativeVisualEvents(observed.messages.find(m => m.type === 63), context).events[0];
  assert.equal(success.nativeRevivalConfirmed, true);
  assert.equal(createPublicCombatVisual(success, {}).profile, 'revival');
});

test('an expired graveyard move cannot label a later independent Special Summon as revival', () => {
  const observed = report.cases[0];
  const C = createNativeVisualContext({ getCardMetadata: code => ({ id: String(code), type: 'Normal Monster' }) });
  const move = observed.messages.find(m => m.type === 50 && m.card === 89631139);
  translateNativeVisualEvents(move, C);
  translateNativeVisualEvents({ type: 11 }, C); // A new native action boundary.
  translateNativeVisualEvents(observed.messages.find(m => m.type === 62), C);
  const event = translateNativeVisualEvents({ type: 63 }, C).events[0];
  assert.equal(event.nativeRevivalConfirmed, undefined);
  assert.equal(createPublicCombatVisual(event, {}).profile, 'special-summon');
});

test('the production Game adapter forwards the public query mask to the real WASM', async () => {
  const inputs = await loadNativeAuditInputs();
  const game = new NativeDuelGame({}, { rulesMode: 'native', nativeResources: inputs.resources,
    seed: [1n, 2n, 3n, 4n], validateDeck: () => ({ valid: true, issues: [] }),
    runtimeOptions: { coreModule: inputs.coreModule, initializer: inputs.initializer } });
  try {
    const card = { id: 46986414, name: 'Dark Magician', type: 'Normal Monster', card_type: 'monster' };
    assert.equal(await game.initDecks([card], [card]), true);
    const C = game.runtime.constants;
    game.runtime.addCard({ code: 89631139, controller: 0, location: C.OcgLocation.MZONE,
      sequence: 0, position: C.OcgPosition.FACEUP_ATTACK });
    const requests = [];
    const query = game.runtime.queryCard.bind(game.runtime);
    game.runtime.queryCard = request => { requests.push(request); return query(request); };
    const result = game._visualContext.queryCard({ controller: 0, location: C.OcgLocation.MZONE,
      sequence: 0, flags: NATIVE_PUBLIC_VISUAL_QUERY_FLAGS });
    assert.equal(result.code, 89631139);
    assert.equal(result.attack, 3000);
    assert.equal(requests.at(-1).flags, NATIVE_PUBLIC_VISUAL_QUERY_FLAGS);
    assert.equal(requests.at(-1).flags & (C.OcgQueryFlags.TARGET_CARD | C.OcgQueryFlags.OVERLAY_CARD), 0);
  } finally { game.dispose(); }
});
