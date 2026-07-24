import test from 'node:test';
import assert from 'node:assert/strict';

import { CardState } from '../src/core/CardState.js';
import { SummonEngine } from '../src/core/SummonEngine.js';

function monster({
  uid,
  type = 'Effect Monster',
  level = 4,
  controllerId = 'player',
  location = 'monster_zone',
  faceDown = false,
  isToken = false,
  ...overrides
}) {
  const card = new CardState({
    uid,
    id: uid,
    name: uid,
    card_type: 'monster',
    type,
    atk: 1000,
    def: 1000,
    level,
    isEffectMonster: /Effect/i.test(type),
    ...overrides
  });
  card.controllerId = controllerId;
  card.ownerId = controllerId;
  card.location = location;
  card.isSetFaceDown = faceDown;
  card.isToken = isToken;
  return card;
}

function pendulumCard({
  uid,
  level = 4,
  scale = 1,
  location = 'hand',
  faceUpExtra = false,
  controllerId = 'player'
}) {
  const card = monster({
    uid,
    type: 'Pendulum Effect Monster',
    level,
    location,
    controllerId,
    pendulumScale: scale,
    isPendulumMonster: true,
    isEffectMonster: true
  });
  card.isFaceUpInExtraDeck = faceUpExtra;
  return card;
}

test('Xyz Summon requires distinct face-up same-Level materials and the target Rank', () => {
  const summons = new SummonEngine();
  const first = monster({ uid: 'xyz-material-a', level: 4 });
  const second = monster({ uid: 'xyz-material-b', level: 4 });
  const xyz = monster({
    uid: 'rank-four',
    type: 'Xyz Effect Monster',
    level: 0,
    location: 'extra_deck',
    rank: 4,
    xyzMaterialCount: 2,
    extra_type: 'xyz',
    belongsInExtraDeck: true
  });

  assert.equal(xyz.getLevel(), 0);
  assert.equal(xyz.getRank(), 4);
  assert.equal(summons.validateXyzSummon([first, second], xyz), true);

  second.currentLevel = 3;
  assert.equal(summons.validateXyzSummon([first, second], xyz), false);
  second.currentLevel = 4;
  second.isSetFaceDown = true;
  assert.equal(summons.validateXyzSummon([first, second], xyz), false);
  second.isSetFaceDown = false;
  second.controllerId = 'opponent';
  assert.equal(summons.validateXyzSummon([first, second], xyz), false);
  second.controllerId = 'player';
  second.isToken = true;
  assert.equal(summons.validateXyzSummon([first, second], xyz), false);
});

test('Xyz overlay helpers attach and detach materials without leaving field-state aliases', () => {
  const summons = new SummonEngine();
  const first = monster({ uid: 'overlay-a' });
  const second = monster({ uid: 'overlay-b' });
  const xyz = monster({
    uid: 'xyz-host',
    type: 'Xyz Effect Monster',
    level: 0,
    rank: 4,
    location: 'monster_zone',
    extra_type: 'xyz'
  });

  assert.equal(summons.attachXyzMaterials(xyz, [first, second]), 2);
  assert.deepEqual(xyz.xyzMaterials, [first, second]);
  assert.equal(first.location, 'xyz_material');
  assert.equal(first.zoneIndex, -1);

  const detached = summons.detachXyzMaterials(xyz, 1);
  assert.deepEqual(detached, [first]);
  assert.equal(first.location, 'graveyard_pending');
  assert.deepEqual(xyz.xyzMaterials, [second]);
});

test('Synchro Materials must each have a positive Level, never a Rank or Link Rating', () => {
  const summons = new SummonEngine();
  const tuner = monster({
    uid: 'level-eight-tuner',
    type: 'Tuner Effect Monster',
    level: 8
  });
  const xyzWithoutLevel = monster({
    uid: 'rank-four-material',
    type: 'Xyz Effect Monster',
    level: 0,
    rank: 4,
    extra_type: 'xyz'
  });
  const linkWithoutLevel = monster({
    uid: 'link-one-material',
    type: 'Link Effect Monster',
    level: 0,
    linkRating: 1,
    extra_type: 'link'
  });

  assert.equal(
    summons.validateSynchroSummon([tuner, xyzWithoutLevel], 8),
    false
  );
  assert.equal(
    summons.validateSynchroSummon([tuner, linkWithoutLevel], 8),
    false
  );
});

test('Link Summon validates face-up Effect Monsters, recipe count, and Link Rating choices', () => {
  const summons = new SummonEngine();
  const effectA = monster({ uid: 'effect-a' });
  const effectB = monster({ uid: 'effect-b' });
  const linkTwo = monster({
    uid: 'link-two',
    type: 'Link Effect Monster',
    level: 0,
    location: 'extra_deck',
    linkRating: 2,
    minimumMaterialCount: 2,
    maximumMaterialCount: 2,
    extra_type: 'link',
    belongsInExtraDeck: true,
    isEffectMonster: true
  });

  const plan = summons.createLinkSummonPlan([effectA, effectB], linkTwo);
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.materialRatingValues, [1, 1]);

  effectB.isSetFaceDown = true;
  assert.equal(summons.validateLinkSummon([effectA, effectB], linkTwo), false);
  effectB.isSetFaceDown = false;
  effectB.isEffectMonster = false;
  effectB.type = 'Normal Monster';
  assert.equal(summons.validateLinkSummon([effectA, effectB], linkTwo), false);
});

test('a Link Monster may contribute either one or its own rating, exactly matching the new Link Rating', () => {
  const summons = new SummonEngine();
  const linkTwoMaterial = monster({
    uid: 'link-two-material',
    type: 'Link Effect Monster',
    level: 0,
    linkRating: 2,
    isEffectMonster: true
  });
  const effect = monster({ uid: 'link-effect-material' });
  const linkThree = monster({
    uid: 'link-three',
    type: 'Link Effect Monster',
    level: 0,
    location: 'extra_deck',
    linkRating: 3,
    minimumMaterialCount: 2,
    maximumMaterialCount: 3,
    extra_type: 'link',
    belongsInExtraDeck: true,
    isEffectMonster: true
  });

  const plan = summons.createLinkSummonPlan([linkTwoMaterial, effect], linkThree);
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.materialRatingValues, [2, 1]);
});

test('a Link-1 recipe defaults to one face-up Effect Monster', () => {
  const summons = new SummonEngine();
  const effect = monster({ uid: 'single-link-material', level: 1 });
  const linkOne = monster({
    uid: 'link-one',
    type: 'Link Effect Monster',
    level: 0,
    location: 'extra_deck',
    linkRating: 1,
    extra_type: 'link',
    belongsInExtraDeck: true,
    isEffectMonster: true
  });

  assert.equal(summons.validateLinkSummon([effect], linkOne), true);
});

test('Pendulum validation uses strict scale bounds and only a face-up Extra Deck Pendulum source', () => {
  const summons = new SummonEngine();
  const left = pendulumCard({ uid: 'left-scale', scale: 1, location: 'spell_zone' });
  const right = pendulumCard({ uid: 'right-scale', scale: 8, location: 'spell_zone' });
  const handMonster = pendulumCard({ uid: 'hand-level-four', level: 4 });
  const extraMonster = pendulumCard({
    uid: 'extra-level-seven',
    level: 7,
    location: 'extra_deck',
    faceUpExtra: true
  });
  const hiddenExtra = pendulumCard({
    uid: 'hidden-extra',
    level: 5,
    location: 'extra_deck',
    faceUpExtra: false
  });

  assert.equal(summons.validatePendulumSummon(1, 8, 4), true);
  assert.equal(summons.validatePendulumSummon(1, 8, 1), false);
  assert.equal(summons.validatePendulumSummon(1, 8, 8), false);

  const eligible = summons.getPendulumEligibleMonsters(left, right, {
    hand: [handMonster],
    faceUpExtraDeck: [extraMonster, hiddenExtra],
    controllerId: 'player'
  });
  assert.deepEqual(eligible.fromHand, [handMonster]);
  assert.deepEqual(eligible.fromExtraDeck, [extraMonster]);

  const plan = summons.createPendulumSummonPlan(
    left,
    right,
    [handMonster, extraMonster],
    {
      controllerId: 'player',
      availableMainMonsterZones: 1,
      availableExtraDeckZones: 1
    }
  );
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.fromHand, [handMonster]);
  assert.deepEqual(plan.fromExtraDeck, [extraMonster]);
});

test('Pendulum Summon is once per turn and Extra Deck summons require a legal linked/Extra zone', () => {
  const summons = new SummonEngine();
  const extraMonster = pendulumCard({
    uid: 'extra-pendulum',
    level: 4,
    location: 'extra_deck',
    faceUpExtra: true
  });

  assert.equal(
    summons.createPendulumSummonPlan(1, 8, [extraMonster], {
      controllerId: 'player',
      availableExtraDeckZones: 0
    }).reason,
    'NOT_ENOUGH_LINKED_OR_EXTRA_MONSTER_ZONES'
  );
  assert.equal(summons.consumePendulumSummon(), true);
  assert.equal(summons.consumePendulumSummon(), false);
  assert.equal(
    summons.createPendulumSummonPlan(1, 8, [extraMonster], {
      controllerId: 'player',
      availableExtraDeckZones: 1
    }).reason,
    'PENDULUM_SUMMON_ALREADY_USED'
  );
});

test('destroyed Pendulum Monsters can be represented face-up in the Extra Deck', () => {
  const summons = new SummonEngine();
  const card = pendulumCard({ uid: 'destroyed-pendulum', location: 'monster_zone' });
  card.ownerId = 'player';
  card.controllerId = 'opponent';
  card.isSetFaceDown = true;

  assert.equal(summons.sendPendulumMonsterToFaceUpExtraDeck(card), true);
  assert.equal(card.location, 'extra_deck');
  assert.equal(card.isFaceUpInExtraDeck, true);
  assert.equal(card.isSetFaceDown, false);
  assert.equal(card.controllerId, 'player');
});

test('Ritual Summon accepts hand and controlled field Tributes, including face-down monsters', () => {
  const summons = new SummonEngine();
  const ritualMonster = monster({
    uid: 'ritual-target',
    type: 'Ritual Effect Monster',
    level: 8,
    location: 'hand',
    isRitualMonster: true
  });
  const ritualSpell = new CardState({
    uid: 'ritual-spell',
    id: 'ritual-spell',
    name: 'Ritual Spell',
    card_type: 'spell',
    type: 'Ritual Spell Card',
    isRitualSpell: true,
    ritualMonsterIds: ['ritual-target']
  });
  ritualSpell.location = 'hand';
  ritualSpell.controllerId = 'player';
  const handMaterial = monster({ uid: 'ritual-hand', level: 3, location: 'hand' });
  const fieldMaterial = monster({ uid: 'ritual-field', level: 5 });

  const plan = summons.createRitualSummonPlan(
    ritualMonster,
    ritualSpell,
    [handMaterial, fieldMaterial],
    { controllerId: 'player' }
  );
  assert.equal(plan.valid, true);
  assert.equal(plan.totalLevels, 8);

  fieldMaterial.isSetFaceDown = true;
  assert.equal(
    summons.validateRitualSummon(
      ritualMonster,
      ritualSpell,
      [handMaterial, fieldMaterial],
      { controllerId: 'player' }
    ),
    true
  );
});

test('Ritual exact-Level recipes reject excess Levels and materials without Levels', () => {
  const summons = new SummonEngine();
  const ritualMonster = monster({
    uid: 'exact-ritual',
    type: 'Ritual Effect Monster',
    level: 8,
    location: 'hand',
    isRitualMonster: true
  });
  const exactSpell = new CardState({
    uid: 'exact-spell',
    id: 'exact-spell',
    name: 'Exact Ritual',
    card_type: 'spell',
    type: 'Ritual Spell Card',
    isRitualSpell: true,
    requiresExactLevel: true
  });
  const levelFour = monster({ uid: 'level-four', level: 4, location: 'hand' });
  const levelFive = monster({ uid: 'level-five', level: 5 });
  const link = monster({
    uid: 'level-less-link',
    type: 'Link Effect Monster',
    level: 0,
    linkRating: 1,
    isEffectMonster: true
  });

  assert.equal(
    summons.createRitualSummonPlan(
      ritualMonster,
      exactSpell,
      [levelFour, levelFive],
      { controllerId: 'player' }
    ).reason,
    'RITUAL_LEVEL_MUST_BE_EXACT'
  );
  assert.equal(
    summons.createRitualSummonPlan(
      ritualMonster,
      exactSpell,
      [levelFour, link],
      { controllerId: 'player' }
    ).reason,
    'RITUAL_MATERIAL_HAS_NO_LEVEL'
  );
});
