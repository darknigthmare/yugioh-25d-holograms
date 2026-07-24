import test from 'node:test';
import assert from 'node:assert/strict';

import { CardState } from '../src/core/CardState.js';
import { PhaseEngine } from '../src/core/PhaseEngine.js';
import { SummonEngine } from '../src/core/SummonEngine.js';

function createMaterial({
  uid,
  type = 'Effect Monster',
  level,
  currentLevel = level
}) {
  const card = new CardState({
    uid,
    id: uid,
    name: uid,
    card_type: 'monster',
    type,
    atk: 1000,
    def: 1000,
    level
  });
  card.currentLevel = currentLevel;
  card.location = 'monster_zone';
  card.controllerId = 'player';
  card.ownerId = 'player';
  card.isSetFaceDown = false;
  return card;
}

test('PhaseEngine follows the complete phase cycle and changes turn after End Phase', () => {
  const phases = new PhaseEngine();

  assert.deepEqual(phases.nextPhase(), {
    phase: 'standby',
    turn: 'player',
    turnCount: 1
  });
  assert.equal(phases.nextPhase().phase, 'main1');

  const battle = phases.nextPhase();
  assert.equal(battle.phase, 'battle');
  assert.equal(phases.battleStep, 'start');

  phases.setBattleStep('damage_step');
  phases.setDamageStepSubPhase('calc');
  assert.equal(phases.nextPhase().phase, 'main2');
  assert.equal(phases.battleStep, 'none');
  assert.equal(phases.damageStepSubPhase, 'none');

  assert.equal(phases.nextPhase().phase, 'end');
  assert.deepEqual(phases.nextPhase(), {
    phase: 'draw',
    turn: 'opponent',
    turnCount: 2
  });
});

test('Synchro validation uses current CardState levels instead of stale base values', () => {
  const summons = new SummonEngine();
  const tuner = createMaterial({
    uid: 'tuner',
    type: 'Tuner Monster',
    level: 3,
    currentLevel: 4
  });
  const nonTuner = createMaterial({
    uid: 'non-tuner',
    level: 4
  });

  assert.equal(tuner.level, 4);
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner], 8), true);
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner], 7), false);
});

test('Synchro validation rejects face-down and non-field materials', () => {
  const summons = new SummonEngine();
  const tuner = createMaterial({
    uid: 'face-down-tuner',
    type: 'Tuner Monster',
    level: 3
  });
  const nonTuner = createMaterial({
    uid: 'face-up-non-tuner',
    level: 5
  });

  tuner.isSetFaceDown = true;
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner], 8), false);

  tuner.isSetFaceDown = false;
  nonTuner.location = 'graveyard';
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner], 8), false);
});

test('Xyz validation accepts matching dynamic levels and rejects a mismatch', () => {
  const summons = new SummonEngine();
  const first = createMaterial({
    uid: 'xyz-a',
    level: 3,
    currentLevel: 4
  });
  const second = createMaterial({
    uid: 'xyz-b',
    level: 6,
    currentLevel: 4
  });

  assert.equal(summons.validateXyzSummon([first, second], 4), true);

  second.currentLevel = 5;
  assert.equal(summons.validateXyzSummon([first, second], 4), false);
});
