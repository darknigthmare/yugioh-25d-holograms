import test from 'node:test';
import assert from 'node:assert/strict';
import { CardState } from '../src/core/CardState.js';
import { SummonEngine } from '../src/core/SummonEngine.js';
import { DuelGame } from '../src/game.js';
import { EXTRA_DECK_CARDS } from '../src/cards.js';

function monster(uid, level = 4, overrides = {}) {
  const card = new CardState({
    id: uid, uid, name: uid, card_type: 'monster', type: 'Effect Monster',
    atk: 1000, def: 1000, level, ...overrides
  });
  card.controllerId = 'player';
  card.ownerId = 'player';
  card.location = 'monster_zone';
  return card;
}

function ritual() {
  const target = monster('ritual-target', 8, { type: 'Ritual Monster' });
  target.location = 'hand';
  const spell = new CardState({
    id: 'ritual-spell', uid: 'ritual-spell', card_type: 'spell',
    type: 'Ritual Spell Card', isRitualSpell: true,
    ritualMonsterIds: ['ritual-target']
  });
  spell.controllerId = 'player';
  return { target, spell };
}

test('Synchro cannot count one physical non-Tuner twice or use opposing materials', () => {
  const summons = new SummonEngine();
  const tuner = monster('tuner', 2, { type: 'Tuner Effect Monster' });
  const nonTuner = monster('non-tuner', 3);
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner, nonTuner], 8), false);
  const other = monster('other', 3);
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner, other], 8), true);
  other.controllerId = 'opponent';
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner, other], 8), false);
});

test('Synchro validates material count, current Type, and the target recipe', () => {
  const summons = new SummonEngine();
  const tuner = monster('recipe-tuner', 2, { type: 'Tuner Effect Monster' });
  const nonTuner = monster('recipe-non-tuner', 6, { race: 'Warrior' });
  const target = monster('recipe-target', 8, {
    type: 'Synchro Effect Monster', synchroNonTunerRace: 'Spellcaster',
    minimumMaterialCount: 2, maximumMaterialCount: 2
  });
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner], 8, target), false);
  nonTuner.currentRace = 'Spellcaster';
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner], 8, target), true);
  const first = monster('first', 3, { race: 'Spellcaster' });
  const second = monster('second', 3, { race: 'Spellcaster' });
  assert.equal(summons.validateSynchroSummon([tuner, first, second], 8, target), false);
  target.materialFilter = card => card !== tuner;
  assert.equal(summons.validateSynchroSummon([tuner, nonTuner], 8, target), false);
});

test('Synchro respects explicit multi-Tuner recipes and temporary Tuner status', () => {
  const summons = new SummonEngine();
  const tunerA = monster('tuner-a', 2, { type: 'Tuner Effect Monster' });
  const tunerB = monster('tuner-b', 2, { type: 'Tuner Effect Monster' });
  const nonTuner = monster('multi-non-tuner', 4);
  assert.equal(summons.validateSynchroSummon([tunerA, tunerB, nonTuner], 8), false);
  assert.equal(summons.validateSynchroSummon([tunerA, tunerB, nonTuner], 8, null, {
    tunerMaterialCount: 2
  }), true);
  const target = monster('multi-tuner-target', 8, {
    type: 'Synchro Effect Monster', tunerMaterialCount: 2, minimumNonTunerCount: 1
  });
  assert.equal(summons.validateSynchroSummon([tunerA, tunerB, nonTuner], 8, target), true);
  tunerB.isTuner = false;
  assert.equal(summons.validateSynchroSummon([tunerA, tunerB, nonTuner], 8), true);
  tunerB.resetForZoneChange('graveyard');
  assert.equal(tunerB.isTuner, undefined, 'temporary Tuner override ends with the field instance');
});

test('LANphorhynchus accepts Tokens but Effect Monster Link recipes exclude them', () => {
  const summons = new SummonEngine();
  const target = new CardState(EXTRA_DECK_CARDS.find(card => card.id === '77637979'));
  const token = monster('link-token', 1, { type: 'Token' });
  token.isToken = true;
  const normal = monster('link-normal', 4, { type: 'Normal Monster' });
  assert.equal(summons.createLinkSummonPlan([token, normal], target).valid, true);
  target.requiresEffectMonsters = true;
  assert.equal(summons.createLinkSummonPlan([token, normal], target).valid, false);
  target.requiresEffectMonsters = false;
  assert.equal(summons.createLinkSummonPlan([token, normal], target, { allowTokens: false }).valid, false);
});

test('Xyz attachment never permits a Token, self-overlay or duplicate runtime identity', () => {
  const summons = new SummonEngine();
  const target = monster('xyz-target', 0, { type: 'Xyz Effect Monster', rank: 4 });
  const token = monster('xyz-token');
  token.isToken = true;
  assert.equal(summons.attachXyzMaterials(target, [token]), false);
  assert.equal(summons.attachXyzMaterials(target, [target]), false);
  const material = monster('xyz-material');
  assert.equal(summons.attachXyzMaterials(target, [material]), 1);
  assert.equal(summons.attachXyzMaterials(target, [monster('xyz-material')]), false);
  assert.deepEqual(target.xyzMaterials, [material]);
});

test('a live LANphorhynchus Summon consumes two Tokens without creating Graveyard cards', async () => {
  const game = new DuelGame();
  const target = new CardState(EXTRA_DECK_CARDS.find(card => card.id === '77637979'));
  target.controllerId = 'player';
  target.ownerId = 'player';
  target.location = 'extra_deck';
  game.playerExtraDeck = [target];
  const tokens = ['token-a', 'token-b'].map(uid => monster(uid, 1, { type: 'Token', isToken: true }));
  tokens.forEach((token, index) => game.field.setMonsterZone('player', index, token));
  assert.equal(await game.performLinkSummon('player', target.uid), true);
  assert.ok(game.getMonsterEntries('player').some(entry => entry.card === target));
  assert.equal(target.wasProperlySpecialSummoned, true);
  assert.deepEqual(game.playerGraveyard, []);
  assert.ok(tokens.every(token => token.location === 'none'));
  assert.ok(tokens.every(token => !game.playerMonsters.includes(token)));
});

test('Ritual Tributes may exceed the target Level only when all selected cards are necessary', () => {
  const summons = new SummonEngine();
  const { target, spell } = ritual();
  assert.equal(summons.createRitualSummonPlan(target, spell, [
    monster('level-eight', 8), monster('level-one', 1)
  ]).reason, 'EXTRANEOUS_RITUAL_MATERIALS');
  assert.equal(summons.createRitualSummonPlan(target, spell, [
    monster('level-five-a', 5), monster('level-five-b', 5)
  ]).valid, true);
  assert.equal(summons.createRitualSummonPlan(target, spell, [
    monster('level-three-a', 3), monster('level-three-b', 3), monster('level-three-c', 3)
  ]).valid, true);
});

test('Ritual selection rejects its own target, another controller, and invalid Levels', () => {
  const summons = new SummonEngine();
  const { target, spell } = ritual();
  assert.equal(summons.createRitualSummonPlan(target, spell, [target]).reason,
    'RITUAL_MONSTER_CANNOT_TRIBUTE_ITSELF');
  assert.equal(summons.createRitualSummonPlan(target, spell, [monster('valid-tribute', 8)], {
    controllerId: 'opponent'
  }).reason, 'RITUAL_MONSTER_WRONG_CONTROLLER');
  const invalid = monster('invalid-tribute', 8);
  invalid.getLevel = () => Number.NaN;
  assert.equal(summons.createRitualSummonPlan(target, spell, [invalid]).reason,
    'RITUAL_MATERIAL_HAS_NO_LEVEL');
  assert.equal(summons.createRitualSummonPlan(target, spell, [monster('normal-tribute', 8)], {
    requiredLevel: Number.NaN
  }).reason, 'INVALID_REQUIRED_RITUAL_LEVEL');
});

test('live Ritual choices exclude an unnecessary Tribute even if it could free a zone', () => {
  const game = new DuelGame();
  const { target, spell } = ritual();
  const small = monster('small-field-tribute', 1);
  const sufficient = monster('sufficient-hand-tribute', 8);
  sufficient.location = 'hand';
  game.playerHand = [target, sufficient];
  game.field.setMonsterZone('player', 0, small);
  const choices = game.getRitualMaterialSelections(target, spell, 'player');
  assert.equal(choices.length, 1);
  assert.deepEqual(choices[0].entries.map(entry => entry.card), [sufficient]);
  for (let index = 1; index < 5; index += 1) {
    game.field.setMonsterZone('player', index, monster(`full-field-${index}`, 1));
  }
  assert.deepEqual(game.getRitualMaterialSelections(target, spell, 'player'), []);
});

test('Pendulum validation rejects non-integral Levels and a zero-Level override', () => {
  const summons = new SummonEngine();
  for (const level of [Number.NaN, Infinity, 4.5, 0, -1]) {
    assert.equal(summons.validatePendulumSummon(0, 8, level), false);
  }
  const card = monster('pendulum-zero', 4);
  card.location = 'hand';
  card.getLevel = () => 0;
  assert.equal(summons.validatePendulumSummon(0, 8, card), false);
});

test('one Pendulum card cannot occupy both scales and opposing hand cards are ineligible', () => {
  const summons = new SummonEngine();
  const scale = monster('single-scale', 4, { type: 'Pendulum Effect Monster', pendulumScale: 1 });
  scale.location = 'pendulum_zone';
  assert.equal(summons.validatePendulumScales(scale, scale).reason,
    'PENDULUM_SCALES_MUST_BE_DISTINCT');
  const card = monster('opposing-hand', 4);
  card.location = 'hand';
  card.controllerId = 'opponent';
  assert.equal(summons.validatePendulumSummon(1, 8, card, { controllerId: 'player' }), false);
});

test('Fusion and Synchro Pendulum revival requires a prior proper Summon', () => {
  const summons = new SummonEngine();
  for (const extraType of ['Fusion', 'Synchro']) {
    const target = monster(`${extraType}-pendulum`, 7, { type: `${extraType} Pendulum Effect Monster` });
    target.location = 'extra_deck';
    target.isFaceUpInExtraDeck = true;
    assert.equal(summons.validatePendulumSummon(1, 8, target), false);
    target.wasProperlySpecialSummoned = true;
    assert.equal(summons.validatePendulumSummon(1, 8, target), true);
    target.location = 'hand';
    assert.equal(summons.validatePendulumSummon(1, 8, target), false);
  }
  const mainDeckPendulum = monster('normal-pendulum', 4, { type: 'Pendulum Normal Monster' });
  mainDeckPendulum.location = 'extra_deck';
  mainDeckPendulum.isFaceUpInExtraDeck = true;
  assert.equal(summons.validatePendulumSummon(1, 8, mainDeckPendulum), true);
});

test('Pendulum material movement clears its occupied zone and preserves a proper hybrid Summon', () => {
  const summons = new SummonEngine();
  const target = monster('proper-fusion-pendulum', 7, { type: 'Fusion Pendulum Effect Monster' });
  summons.fieldState.setMonsterZone('player', 0, target);
  target.wasProperlySpecialSummoned = true;
  const previousRuntimeId = target.runtimeInstanceId;
  assert.equal(summons.sendPendulumMonsterToFaceUpExtraDeck(target), true);
  assert.equal(summons.fieldState.getMonsterZone('player', 0), null);
  assert.deepEqual(summons.fieldState.playerFaceUpExtraDeck, [target]);
  assert.notEqual(target.runtimeInstanceId, previousRuntimeId);
  assert.equal(target.wasProperlySpecialSummoned, true);
  assert.equal(summons.validatePendulumSummon(1, 8, target), true);
});
