import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignDuelTracker } from '../src/content/CampaignDuelTracker.js';

function card(overrides = {}) {
  return { uid: 'card-1', runtimeInstanceId: 'runtime-1', turnSummoned: 2, isSetFaceDown: false, ...overrides };
}

test('campaign tracker counts resolved player actions once and ignores opponent activity', () => {
  const tracker = createCampaignDuelTracker('result-1');
  const normal = { type: 'summon', target: 'player', card: card(), summonType: 'normal', tributeCount: 0 };
  assert.equal(tracker.recordAnimation(normal), true);
  assert.equal(tracker.recordAnimation(normal), false);
  tracker.recordAnimation({ type: 'summon', target: 'player', card: card({ runtimeInstanceId: 'set-1', isSetFaceDown: true }), summonType: 'normal' });
  tracker.recordAnimation({ type: 'summon', target: 'player', card: card({ runtimeInstanceId: 'tribute-1' }), summonType: 'tribute', tributeCount: 2 });
  tracker.recordAnimation({ type: 'summon', target: 'opponent', card: card({ runtimeInstanceId: 'ignored' }), summonType: 'normal' });
  tracker.recordAnimation({ type: 'lp-loss', target: 'player', damage: 1700 });
  tracker.recordAnimation({ type: 'lp-loss', target: 'opponent', damage: 9000 });
  assert.deepEqual(tracker.snapshot({ playerLP: 6300, turnCount: 4 }), {
    resultId: 'result-1', normalSummons: 1, monsterSets: 1, tributeSummons: 1,
    fieldSpellActivations: 0, fusionSummons: 0, synchroSummons: 0, xyzSummons: 0,
    linkSummons: 0, ritualSummons: 0, pendulumSummons: 0, damageTaken: 1700,
    extraSummonTypes: [], playerLP: 6300, turnCount: 4
  });
});

test('pendulum group and Extra Deck types use engine summon metadata', () => {
  const tracker = createCampaignDuelTracker('result-2');
  for (let index = 0; index < 3; index += 1) {
    tracker.recordAnimation({ type: 'summon', target: 'player', card: card({ uid: `p-${index}`, runtimeInstanceId: `p-${index}`, summonType: 'pendulum', turnSummoned: 5 }) });
  }
  for (const type of ['fusion', 'synchro', 'xyz', 'link', 'ritual']) {
    tracker.recordAnimation({ type: 'summon', target: 'player', card: card({ uid: type, runtimeInstanceId: type, summonType: type, turnSummoned: 6 }) });
  }
  const stats = tracker.snapshot({ playerLP: 8000, turnCount: 7 });
  assert.equal(stats.pendulumSummons, 1);
  assert.equal(stats.ritualSummons, 1);
  assert.deepEqual(stats.extraSummonTypes, ['fusion', 'link', 'synchro', 'xyz']);
});

test('field objective changes only after authoritative successful resolution', () => {
  const tracker = createCampaignDuelTracker('result-3');
  const field = card({
    card_type: 'spell', race: 'Field', location: 'field_zone', controllerId: 'player',
    fieldActivationState: 'pending', fieldActivationSequence: 0,
    fieldActivationRuntimeInstanceId: 'runtime-1'
  });
  const game = { playerFieldSpell: field, playerLP: 8000, turnCount: 1 };
  assert.equal(tracker.observeState(game), false);
  field.fieldActivationState = 'resolved';
  field.fieldActivationSequence = 1;
  assert.equal(tracker.observeState(game), true);
  assert.equal(tracker.observeState(game), false);
  assert.equal(tracker.snapshot(game).fieldSpellActivations, 1);
  field.runtimeInstanceId = 'runtime-2';
  assert.equal(tracker.observeState(game), false);
});

test('tracker rejects an empty result identity', () => {
  assert.throws(() => createCampaignDuelTracker(''), /resultId/);
});
