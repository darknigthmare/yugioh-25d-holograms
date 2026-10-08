import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { runTcgBattleComplete } from '../scripts/tcg-battle-complete-2026-10-08.mjs';
import { createNativeBattleLifecycle, observeNativeBattleLifecycle, nativePhasePresentation,
  nativeVictoryPresentation } from '../src/core/native/NativeBattleLifecycle.js';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';

let report;
async function evidence() {
  return report ??= (async () => {
    const inputs = await loadNativeAuditInputs();
    const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
    return runTcgBattleComplete(inputs, core);
  })();
}

const families = ['attack-higher', 'attack-lower', 'attack-equal', 'zero-attack-equal',
  'defense-lower', 'defense-equal', 'defense-higher', 'zero-attack-zero-defense',
  'face-down-defense-revealed', 'direct-attack', 'printed-piercing', 'first-turn-and-draw-rule',
  'position-and-summon-turn-restrictions', 'replay-accepted-new-target', 'replay-declined',
  'negate-attack-native-end-step', 'must-attack-replay-without-yesno', 'attacker-leaves-field-attack-stops',
  'target-leaves-field-replay-becomes-direct', 'waboku-prevents-damage-and-destruction',
  'damage-step-eligible-and-ineligible-effects', 'end-phase-six-card-limit',
  'lp-zero-native-win', 'mandatory-draw-empty-deck-loss', 'exodia-five-parts-native-win',
  'four-exodia-parts-no-win', 'both-players-assemble-exodia-native-draw', 'both-zero-lp-native-draw'];

for (const controller of [0, 1]) for (const family of families) {
  test(`TCG actual WASM: ${family}, controller ${controller}`, async () => {
    const proof = await evidence();
    const row = proof.scenarios.find(scenario => scenario.name === `${family}-controller-${controller}`);
    assert.ok(row); assert.equal(row.status, 'passed'); assert.equal(row.postStartInjection, false);
    assert.equal(row.retryCount, 0); assert.equal(row.luaErrorCount, 0);
    assert.ok(row.messages.length); assert.ok(row.loadedScripts.some(script => script.filename === 'utility.lua'));
    assert.equal(row.threeCopyBound, true);
  });
}

test('Replay bookkeeping needs a native replay prompt or continuous battle command, not the same zone alone', () => {
  const state = createNativeBattleLifecycle();
  const attack = { type: 110, card: { controller: 0, location: 4, sequence: 0, position: 1 } };
  const first = observeNativeBattleLifecycle(state, attack);
  const extra = observeNativeBattleLifecycle(state, attack);
  assert.equal(first.replayed, false); assert.equal(extra.replayed, false);
  assert.notEqual(first.attackId, extra.attackId);
  observeNativeBattleLifecycle(state, { type: 13, description: 30n });
  const replay = observeNativeBattleLifecycle(state, attack);
  assert.equal(replay.replayed, true); assert.equal(replay.attackId, extra.attackId); assert.equal(replay.replayCount, 1);
});

test('Must-attack replay continues the same native battle command without a yes/no question', () => {
  const state = createNativeBattleLifecycle();
  observeNativeBattleLifecycle(state, { type: 10 });
  const attack = { type: 110, card: { controller: 1, location: 4, sequence: 0 } };
  const first = observeNativeBattleLifecycle(state, attack);
  const replay = observeNativeBattleLifecycle(state, attack);
  assert.equal(replay.replayed, true); assert.equal(replay.attackId, first.attackId);
  observeNativeBattleLifecycle(state, { type: 10 });
  const next = observeNativeBattleLifecycle(state, attack);
  assert.equal(next.replayed, false); assert.notEqual(next.attackId, first.attackId);
});

test('Damage completion clears replay evidence before another real attack', () => {
  const state = createNativeBattleLifecycle();
  const attack = { type: 110, card: { controller: 1, location: 4, sequence: 6 } };
  observeNativeBattleLifecycle(state, attack); observeNativeBattleLifecycle(state, { type: 13, description: 30n });
  observeNativeBattleLifecycle(state, { type: 113 }); observeNativeBattleLifecycle(state, { type: 114 });
  const next = observeNativeBattleLifecycle(state, attack); assert.equal(next.replayed, false);
  assert.equal(next.attackId, 'native-public-attack-2');
});

test('Declining replay stops public animation at native command return and consumes no calculated damage', () => {
  const state = createNativeBattleLifecycle();
  observeNativeBattleLifecycle(state, { type: 110, card: { controller: 0, location: 4, sequence: 0 } });
  observeNativeBattleLifecycle(state, { type: 13, description: 30n });
  const stop = observeNativeBattleLifecycle(state, { type: 10 });
  assert.equal(stop.attackStopped, true); assert.equal(stop.replayOffered, true);
  assert.equal(state.activeAttacker, null); assert.equal(state.battleStep, 'battle');
});

test('All API 11 public phases map without permitting or calculating an action', () => {
  assert.deepEqual([8, 16, 32, 64, 128].map(code => nativePhasePresentation(code).battleStep),
    ['start', 'battle', 'damage', 'damage-calculation', 'end']);
  assert.deepEqual([1, 2, 4, 256, 512].map(code => nativePhasePresentation(code).phase),
    ['draw', 'standby', 'main1', 'main2', 'end']);
  assert.equal(nativePhasePresentation(3), null);
});

test('A confirmed native winner is mirrored and a draw never invents a loser', () => {
  for (const viewer of [0, 1]) {
    assert.equal(nativeVictoryPresentation({ type: 5, player: viewer, reason: 16 }, viewer).winner, 'player');
    assert.equal(nativeVictoryPresentation({ type: 5, player: 1 - viewer, reason: 2 }, viewer).winner, 'opponent');
    assert.equal(nativeVictoryPresentation({ type: 5, player: 2, reason: 1 }, viewer).winner, 'draw');
  }
  assert.equal(nativeVictoryPresentation({ type: 91, player: 0, amount: 8000 }), null);
  assert.equal(nativeVictoryPresentation({ type: 5, player: 5, reason: 1 }), null);
});

test('Public phases, replay and victory projection do not read a card identity or hidden query', () => {
  const context = createNativeVisualContext({ playerController: 1,
    queryCard() { throw new Error('No identity query allowed'); },
    getCardMetadata() { throw new Error('No metadata read allowed'); },
    getCardAt() { throw new Error('No board card read allowed'); } });
  for (const message of [{ type: 40, player: 0 }, { type: 41, phase: 8 },
    { type: 13, description: 30n }, { type: 113 }, { type: 111 }, { type: 114 },
    { type: 5, player: 1, reason: 16 }]) {
    const projected = translateNativeVisualEvents(message, context);
    assert.deepEqual(projected.logs, []);
    assert.ok(projected.events.every(event => !('card' in event)));
  }
  assert.equal(context.battleLifecycle.ended, true);
});

test('Victory freezes lifecycle bookkeeping and malformed replay descriptions are not coerced', () => {
  const state = createNativeBattleLifecycle();
  observeNativeBattleLifecycle(state, { type: 110, card: { controller: 0, location: 4, sequence: 0 } });
  const malicious = { valueOf() { throw new Error('No coercion'); }, toString() { throw new Error('No coercion'); } };
  assert.deepEqual(observeNativeBattleLifecycle(state, { type: 13, description: malicious }), {});
  observeNativeBattleLifecycle(state, { type: 5, player: 0, reason: 1 });
  assert.deepEqual(observeNativeBattleLifecycle(state, { type: 110, card: { controller: 0, location: 4, sequence: 0 } }), {});
  assert.equal(state.attackSequence, 1);
});

test('Repeated native Exodia draw results produce one public victory event', () => {
  const context = createNativeVisualContext();
  const win = { type: 5, player: 2, reason: 16 };
  assert.equal(translateNativeVisualEvents(win, context).events.filter(event => event.type === 'native-victory').length, 1);
  assert.equal(translateNativeVisualEvents(win, context).events.filter(event => event.type === 'native-victory').length, 0);
});
