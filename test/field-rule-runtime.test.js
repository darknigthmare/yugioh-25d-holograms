import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { markFieldSpellPending, markFieldSpellResolved } from '../src/core/FieldSpellRules.js';
import { FIELD_RULE_IDS, getFieldRuleSources, getFieldRuleMonsterRace,
  isSpellCardActivationPermitted } from '../src/core/FieldRuleRuntime.js';

let sequence = 0;
function card(id, side, overrides = {}) {
  const base = [...STARTER_CARDS, ...EXTRA_DECK_CARDS].find(value => String(value.id).replace(/^0+(?=\d)/, '') === String(id).replace(/^0+(?=\d)/, ''));
  const value = new CardState({ id, card_type: 'monster', type: 'Normal Monster', name: id,
    race: 'Warrior', attribute: 'EARTH', level: 4, atk: 1500, def: 1000,
    ...base, ...overrides, uid: `field-rule-${sequence++}` });
  value.ownerId = value.controllerId = side;
  return value;
}
function duel(side = 'player', callbacks = {}) {
  const game = new DuelGame(callbacks);
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'main1'; game.phases.turnCount = 2;
  game.delay = async () => true; game.startPhaseFlow = () => {}; game.scheduleAction = () => 0;
  return game;
}
function monster(game, side, race, level = 4, zone = 0) {
  const value = card(`fixture-${race}-${level}`, side, { race, level });
  game.field.setMonsterZone(side, zone, value);
  return value;
}
function hand(game, id, side, overrides = {}) {
  const value = card(id, side, overrides); value.location = 'hand'; game.getSideState(side).hand.push(value); return value;
}
function field(game, id, side = 'player') {
  const value = card(id, side, { card_type: 'spell', type: 'Spell Card', race: 'Field', isFieldSpell: true });
  game.field.placeFieldSpell(side, value); markFieldSpellResolved(value, 1); return value;
}
function quick(game, id, side) {
  const value = card(id, side); game.field.setSpellZone(side, 0, value);
  value.isSetFaceDown = true; value.turnSet = 1; return value;
}

for (const side of ['player', 'opponent']) {
  const other = side === 'player' ? 'opponent' : 'player';
  test(`Zombie World changes Types in both monster fields and GYs, preserving hand and printed Types (${side})`, async () => {
    const game = duel(side);
    const own = monster(game, side, 'Spellcaster');
    const enemy = monster(game, other, 'Dragon');
    const faceDown = monster(game, other, 'Beast', 4, 1); faceDown.isSetFaceDown = true;
    const extra = card('77637979', side); game.field.setExtraMonsterZone(0, side, extra);
    const ownGrave = card('grave-monster', side, { race: 'Fairy' }); game.field.sendToGraveyard(ownGrave, side);
    const enemyGrave = card('grave-monster', other, { race: 'Aqua' }); game.field.sendToGraveyard(enemyGrave, other);
    const spellGrave = card('55144522', side); game.field.sendToGraveyard(spellGrave, side);
    const inHand = hand(game, 'hand-monster', side, { race: 'Beast' });
    const source = hand(game, FIELD_RULE_IDS.ZOMBIE_WORLD, side);
    assert.equal(await game.activateFieldSpellFromHand(source.uid, side), true);
    for (const value of [own, enemy, extra, ownGrave, enemyGrave]) assert.equal(value.currentRace, 'Zombie');
    assert.equal(own.race, 'Spellcaster'); assert.equal(enemy.race, 'Dragon');
    assert.equal(faceDown.currentRace, 'Beast'); assert.equal(inHand.currentRace, 'Beast');
    assert.equal(spellGrave.currentRace, 'Normal');
    game.removeCardFromCurrentZone(source, { byCardEffect: true, sourceSide: other }); game.stateChanged();
    assert.equal(own.currentRace, 'Spellcaster'); assert.equal(enemy.currentRace, 'Dragon');
    assert.equal(ownGrave.currentRace, 'Fairy'); assert.equal(enemyGrave.currentRace, 'Aqua');
  });

  test(`Zombie World forbids non-Zombie Tribute Summon and Tribute Set actions (${side})`, async () => {
    const game = duel(side); field(game, FIELD_RULE_IDS.ZOMBIE_WORLD, other);
    monster(game, side, 'Dragon'); monster(game, side, 'Warrior', 4, 1);
    const high = hand(game, '46986414', side);
    assert.equal(game.getAvailableActions(side).normalSummonCardUids.includes(high.uid), false);
    if (side === 'player') {
      assert.equal(await game.summonMonster(high.uid, 0), false);
      assert.equal(await game.setMonsterFaceDown(high.uid, 0), false);
      assert.equal(game.pendingSummon, null);
    } else {
      assert.equal(await game.tryAINormalSummon(game.getAIDecisionProfile('easy')), false);
      assert.equal(game.opponentMonsters.filter(Boolean).length, 2);
    }
    assert.equal(game.getSideState(side).hand.includes(high), true);
    assert.equal(game.summons.normalSummonAllowance.used, 0);
  });

  test(`Zombie World permits a Zombie Tribute using non-Zombie printed materials (${side})`, async () => {
    const game = duel(side); field(game, FIELD_RULE_IDS.ZOMBIE_WORLD, other);
    const material = monster(game, side, 'Spellcaster');
    const zombie = hand(game, 'fixture-high-zombie', side, { race: 'Zombie', level: 5, atk: 2500 });
    if (side === 'player') {
      assert.equal(await game.summonMonster(zombie.uid, 0), true);
      await game.selectSummonTribute(0);
    } else assert.equal(await game.tryAINormalSummon(game.getAIDecisionProfile('easy')), true);
    assert.equal(zombie.location, 'monster_zone'); assert.equal(material.location, 'graveyard');
    assert.equal(game.summons.normalSummonAllowance.used, 1);
  });

  for (const ownMage of [false, true]) for (const enemyMage of [false, true]) {
    test(`Village restrictions follow both controllers' face-up Spellcasters (${side}, own=${ownMage}, opponent=${enemyMage})`, () => {
      const game = duel(side); field(game, FIELD_RULE_IDS.SECRET_VILLAGE, side);
      if (ownMage) monster(game, side, 'Spellcaster');
      if (enemyMage) monster(game, other, 'Spellcaster');
      const hidden = monster(game, side, 'Spellcaster', 4, 1); hidden.isSetFaceDown = true;
      const ownSpell = hand(game, '55144522', side); const enemySpell = hand(game, '55144522', other);
      game.getSideState(side).deck.push(card('deck-1', side), card('deck-2', side));
      game.getSideState(other).deck.push(card('deck-1', other), card('deck-2', other));
      assert.equal(game.canActivateSpell(ownSpell, side), ownMage);
      assert.equal(game.canActivateSpell(enemySpell, other), !ownMage || enemyMage);
    });
  }

  test(`Village blocks Pendulum Spell card activation but permits setting a Spell (${side})`, async () => {
    const game = duel(side); field(game, FIELD_RULE_IDS.SECRET_VILLAGE, other); monster(game, other, 'Spellcaster');
    const pendulum = hand(game, '94415058', side);
    assert.equal(await game.activatePendulumScale(pendulum.uid, 0, side), false);
    assert.equal(game.getSideState(side).hand.includes(pendulum), true);
    const setField = hand(game, '50913601', side);
    assert.equal(await game.setFieldSpellFaceDownFromHand(setField.uid, side), true);
    assert.equal(await game.activateSetFieldSpell(side), false);
  });

  test(`Village applies after resolution and does not retroactively negate an already activated Spell (${side})`, async () => {
    const snapshots = [];
    const game = duel(side, { onChainOpportunity: request => {
      if (request.lastLink?.context.fieldSpellActivation) snapshots.push(game.canActivateSpell(mst, other));
      return null;
    } });
    monster(game, side, 'Spellcaster');
    const mst = hand(game, '05318639', other);
    field(game, '50913601', side);
    const village = hand(game, FIELD_RULE_IDS.SECRET_VILLAGE, side);
    assert.equal(await game.activateFieldSpellFromHand(village.uid, side), true);
    assert.ok(snapshots.every(Boolean));
    assert.equal(game.canActivateSpell(mst, other), false);
  });

  test(`Closed Forest blocks Field activation including copies, but permits setting (${side})`, async () => {
    const game = duel(side); field(game, FIELD_RULE_IDS.CLOSED_FOREST, other);
    const normal = hand(game, '50913601', side);
    const copy = hand(game, FIELD_RULE_IDS.CLOSED_FOREST, side);
    assert.equal(game.canActivateSpell(normal, side), false);
    assert.equal(game.canActivateSpell(copy, side), false);
    assert.equal(await game.activateFieldSpellFromHand(normal.uid, side), false);
    assert.equal(await game.setFieldSpellFaceDownFromHand(normal.uid, side), true);
    assert.equal(await game.activateSetFieldSpell(side), false);
    assert.equal(game.getSideState(side).hand.includes(copy), true);
  });

  test(`Closed Forest destroyed face-up, face-down or in hand blocks Fields for the rest of this turn (${side})`, () => {
    for (const location of ['face-up', 'face-down', 'hand']) {
      const game = duel(side);
      const source = location === 'hand' ? hand(game, FIELD_RULE_IDS.CLOSED_FOREST, side)
        : field(game, FIELD_RULE_IDS.CLOSED_FOREST, side);
      if (location === 'face-down') source.isSetFaceDown = true;
      const otherField = hand(game, '50913601', other);
      assert.equal(game.removeCardFromCurrentZone(source, { byCardEffect: true, sourceSide: other }), true);
      assert.equal(source.location, 'graveyard');
      assert.equal(game.canActivateSpell(otherField, other), false);
      game.phases.currentPhase = 'end'; assert.equal(game.canActivateSpell(otherField, other), false);
      game.phases.turnCount++; game.phases.currentTurnOwner = other;
      assert.equal(game.canActivateSpell(otherField, other), true);
    }
  });
}

for (const state of ['pending', 'face-down', 'effect-negated', 'activation-negated', 'departed']) {
  test(`transverse Field restrictions do not apply from a ${state} source`, () => {
    for (const id of Object.values(FIELD_RULE_IDS)) {
      const game = duel(); const source = field(game, id);
      monster(game, 'player', 'Spellcaster');
      if (state === 'pending') markFieldSpellPending(source);
      if (state === 'face-down') source.isSetFaceDown = true;
      if (state === 'effect-negated') source.effectNegated = true;
      if (state === 'activation-negated') source.activationNegated = true;
      if (state === 'departed') game.field.sendToGraveyard(source, 'player');
      const magic = hand(game, '50913601', 'opponent');
      assert.equal(game.canActivateSpell(magic, 'opponent'), true);
      assert.equal(getFieldRuleMonsterRace(game.playerMonsters[0], getFieldRuleSources(game)), 'Spellcaster');
    }
  });
}

test('Zombie World removes Village Spellcasters; leaving the field restores their original permission', () => {
  const game = duel(); field(game, FIELD_RULE_IDS.SECRET_VILLAGE, 'player');
  const mage = monster(game, 'player', 'Spellcaster');
  const zombieWorld = field(game, FIELD_RULE_IDS.ZOMBIE_WORLD, 'opponent');
  const ownMagic = hand(game, '50913601', 'player'); const enemyMagic = hand(game, '50913601', 'opponent');
  game.stateChanged(); assert.equal(mage.currentRace, 'Zombie');
  assert.equal(game.canActivateSpell(ownMagic, 'player'), false);
  assert.equal(game.canActivateSpell(enemyMagic, 'opponent'), true);
  game.field.sendToGraveyard(zombieWorld, 'opponent'); game.stateChanged();
  assert.equal(game.canActivateSpell(ownMagic, 'player'), true);
  assert.equal(game.canActivateSpell(enemyMagic, 'opponent'), false);
});

test('Closed Forest sent to GY by a replacement Set creates no destruction restriction', async () => {
  const game = duel(); const forest = field(game, FIELD_RULE_IDS.CLOSED_FOREST);
  const next = hand(game, '50913601', 'player');
  assert.equal(await game.setFieldSpellFaceDownFromHand(next.uid), true);
  assert.equal(forest.location, 'graveyard');
  assert.equal(game.fieldRules.isClosedForestDestructionRestrictionActive(game), false);
  assert.equal(await game.activateSetFieldSpell(), true);
});

test('MST chained to Closed Forest activation destroys it and immediately imposes the turn restriction', async () => {
  let selected = false;
  const game = duel('player', { onChainOpportunity: request => {
    if (!selected && request.side === 'opponent' && request.lastLink?.context.fieldSpellActivation) {
      const candidate = request.candidates.find(value => String(value.id).padStart(8, '0') === '05318639');
      if (candidate) { selected = true; return candidate.cardUid; }
    }
    return null;
  } });
  quick(game, '05318639', 'opponent');
  const forest = hand(game, FIELD_RULE_IDS.CLOSED_FOREST, 'player');
  assert.equal(await game.activateFieldSpellFromHand(forest.uid), false);
  assert.equal(forest.location, 'graveyard');
  assert.equal(game.canActivateSpell(hand(game, '50913601', 'player'), 'player'), false);
});

test('Zombie World appearing during a pending Tribute revalidation cannot consume forbidden materials', async () => {
  const game = duel(); const material1 = monster(game, 'player', 'Warrior');
  const material2 = monster(game, 'player', 'Dragon', 4, 1);
  const high = hand(game, '46986414', 'player');
  assert.equal(await game.summonMonster(high.uid, 0), true);
  game.delay = async () => { field(game, FIELD_RULE_IDS.ZOMBIE_WORLD, 'opponent'); return true; };
  await game.selectSummonTribute(0);
  assert.equal(await game.selectSummonTribute(1), false);
  assert.equal(material1.location, 'monster_zone'); assert.equal(material2.location, 'monster_zone');
  assert.equal(high.location, 'hand'); assert.equal(game.summons.normalSummonAllowance.used, 0);
});

test('Village responds to loss of its final Spellcaster within a chain, without cancelling older Spell links', async () => {
  const game = duel(); const village = field(game, FIELD_RULE_IDS.SECRET_VILLAGE);
  const mage = monster(game, 'player', 'Spellcaster');
  const enemyMst = quick(game, '05318639', 'opponent');
  assert.equal(game.getLegalChainCandidates('opponent').some(value => value.card === enemyMst), false);
  game.removeCardFromCurrentZone(mage, { byCardEffect: true, sourceSide: 'opponent' }); game.stateChanged();
  assert.equal(game.getLegalChainCandidates('opponent').some(value => value.card === enemyMst), true);
  const target = hand(game, '50913601', 'player');
  assert.equal(game.canActivateSpell(target, 'player'), false);
  game.chain.pushChainLink('player', target, [], { resolver: async () => { target.appliedAnything = true; return true; } });
  await game.resolveChainStack(); assert.equal(target.appliedAnything, true); assert.equal(village.location, 'field_zone');
});

test('public Field permission checks never inspect an opposing Set monster identity or statistics', () => {
  const game = duel(); field(game, FIELD_RULE_IDS.SECRET_VILLAGE); monster(game, 'player', 'Spellcaster');
  game.field.opponentMonsterZones[0] = new Proxy({ isSetFaceDown: true }, { get: (value, key) => {
    if (key === 'isSetFaceDown') return true;
    assert.fail(`private opposing monster property ${String(key)}`);
  } });
  assert.equal(isSpellCardActivationPermitted(game, card('50913601', 'opponent'), 'opponent'), false);
});

test('reset clears Closed Forest lingering restrictions from the old duel', () => {
  const game = duel(); const forest = field(game, FIELD_RULE_IDS.CLOSED_FOREST);
  game.removeCardFromCurrentZone(forest, { byCardEffect: true });
  assert.equal(game.fieldRules.isClosedForestDestructionRestrictionActive(game), true);
  game.reset(); assert.equal(game.fieldRules.isClosedForestDestructionRestrictionActive(game), false);
});

for (const side of ['player', 'opponent']) {
  const other = side === 'player' ? 'opponent' : 'player';
  for (const id of [FIELD_RULE_IDS.ZOMBIE_WORLD, FIELD_RULE_IDS.SECRET_VILLAGE]) {
    test(`actual ${id} activation stays inactive during responses and cannot apply after activation negation (${side})`, async () => {
      let observed = false;
      const game = duel(side, { onChainOpportunity: request => {
        if (request.lastLink?.context.fieldSpellActivation) {
          observed = true;
          assert.equal(getFieldRuleSources(game).length, 0);
          assert.equal(mage.currentRace, 'Spellcaster');
          assert.equal(game.canActivateSpell(replacement, other), true);
          request.lastLink.activationNegated = true;
        }
        return null;
      } });
      const mage = monster(game, side, 'Spellcaster');
      const source = hand(game, id, side); const replacement = hand(game, '50913601', other);
      assert.equal(await game.activateFieldSpellFromHand(source.uid, side), false);
      assert.equal(observed, true); assert.equal(source.location, 'graveyard');
      assert.equal(mage.currentRace, 'Spellcaster');
      assert.equal(game.canActivateSpell(replacement, other), true);
    });
  }

  test(`Zombie World permits an ordinary low-Level Normal Summon without Tributes (${side})`, async () => {
    const game = duel(side); field(game, FIELD_RULE_IDS.ZOMBIE_WORLD, other);
    const low = hand(game, '97590747', side);
    assert.ok(game.getAvailableActions(side).normalSummonCardUids.includes(low.uid));
    if (side === 'player') assert.equal(await game.summonMonster(low.uid, 0), true);
    else assert.equal(await game.tryAINormalSummon(game.getAIDecisionProfile('easy')), true);
    assert.equal(low.location, 'monster_zone'); assert.equal(low.currentRace, 'Zombie');
  });

  test(`Closed Forest boosts only its controller's Beast monsters and counts monster cards in the proper GY (${side})`, () => {
    const game = duel(side); const source = field(game, FIELD_RULE_IDS.CLOSED_FOREST, side);
    const own = monster(game, side, 'Beast'); const enemy = monster(game, other, 'Beast');
    const notBeast = monster(game, side, 'Beast-Warrior', 4, 1);
    for (const race of ['Warrior', 'Dragon']) game.field.sendToGraveyard(card(`grave-${race}`, side, { race }), side);
    game.field.sendToGraveyard(card('55144522', side), side);
    game.field.sendToGraveyard(card('other-grave', other), other);
    game.stateChanged();
    assert.equal(own.getAtk(), 1700); assert.equal(own.getDef(), 1000);
    assert.equal(enemy.getAtk(), 1500); assert.equal(notBeast.getAtk(), 1500);
    source.effectNegated = true; game.stateChanged(); assert.equal(own.getAtk(), 1500);
  });
}

test('two Villages with no Spellcaster lock both players independently', () => {
  const game = duel(); field(game, FIELD_RULE_IDS.SECRET_VILLAGE); field(game, FIELD_RULE_IDS.SECRET_VILLAGE, 'opponent');
  assert.equal(game.canActivateSpell(hand(game, '50913601', 'player'), 'player'), false);
  assert.equal(game.canActivateSpell(hand(game, '50913601', 'opponent'), 'opponent'), false);
  const mage = monster(game, 'player', 'Spellcaster');
  game.stateChanged();
  assert.equal(game.canActivateSpell(game.playerHand[0], 'player'), true);
  assert.equal(game.canActivateSpell(game.opponentHand[0], 'opponent'), false);
  assert.equal(mage.currentRace, 'Spellcaster');
});

test('a second Zombie World continues changing Types after the first copy leaves', () => {
  const game = duel(); const first = field(game, FIELD_RULE_IDS.ZOMBIE_WORLD); field(game, FIELD_RULE_IDS.ZOMBIE_WORLD, 'opponent');
  const mage = monster(game, 'player', 'Spellcaster'); game.stateChanged();
  game.field.sendToGraveyard(first, 'player'); game.stateChanged();
  assert.equal(mage.currentRace, 'Zombie');
  assert.equal(game.canActivateSpell(hand(game, '50913601', 'player'), 'player'), true);
});

test('Zombie World changes Arcanite non-Tuner material Types before its real Synchro legality check', () => {
  const game = duel();
  const tuner = card('63977008', 'player'); game.field.setMonsterZone('player', 0, tuner);
  monster(game, 'player', 'Spellcaster', 4, 1);
  const arcanite = game.playerExtraDeck.find(value => String(value.id) === '31924889');
  game.stateChanged(); assert.equal(game.canAutoSynchroSummon(arcanite, 'player'), true);
  field(game, FIELD_RULE_IDS.ZOMBIE_WORLD); game.stateChanged();
  assert.equal(game.canAutoSynchroSummon(arcanite, 'player'), false);
  assert.equal(game.getAvailableActions('player').synchroExtraUids.includes(arcanite.uid), false);
});

test('an AI Tribute plan cancelled by newly applied Zombie World pays no material cost', async () => {
  const game = duel('opponent');
  const one = monster(game, 'opponent', 'Warrior'); const two = monster(game, 'opponent', 'Dragon', 4, 1);
  const high = hand(game, '46986414', 'opponent');
  game.delay = async () => { field(game, FIELD_RULE_IDS.ZOMBIE_WORLD); return true; };
  assert.equal(await game.tryAINormalSummon(game.getAIDecisionProfile('easy')), false);
  assert.equal(one.location, 'monster_zone'); assert.equal(two.location, 'monster_zone'); assert.equal(high.location, 'hand');
});

test('A Legendary Ocean permits a real Level 5 WATER Normal Summon without a Tribute', async () => {
  const game = duel(); field(game, '295517');
  const water = hand(game, 'fixture-water-level5', 'player', { level: 5, attribute: 'WATER' });
  assert.ok(game.getAvailableActions().normalSummonCardUids.includes(water.uid));
  assert.equal(water.getLevel(), 4); assert.equal(await game.summonMonster(water.uid, 0), true);
  assert.equal(water.location, 'monster_zone'); assert.equal(game.pendingSummon, null);
});

test('Zombie World permits a Zombie Tribute Set and preserves the face-down printed Type', async () => {
  const game = duel(); field(game, FIELD_RULE_IDS.ZOMBIE_WORLD, 'opponent');
  const material = monster(game, 'player', 'Warrior');
  const zombie = hand(game, 'fixture-tribute-set-zombie', 'player', { race: 'Zombie', level: 5 });
  assert.equal(await game.setMonsterFaceDown(zombie.uid, 0), true);
  await game.selectSummonTribute(0);
  assert.equal(zombie.location, 'monster_zone'); assert.equal(zombie.isSetFaceDown, true);
  assert.equal(material.location, 'graveyard'); assert.equal(game.summons.normalSummonAllowance.used, 1);
});

test('Zombie World does not prohibit a non-Zombie Ritual Special Summon that Tributes materials', async () => {
  const game = duel(); field(game, FIELD_RULE_IDS.ZOMBIE_WORLD, 'opponent');
  const ritualMonster = hand(game, '05405694', 'player');
  const spell = hand(game, '55761792', 'player');
  hand(game, 'fixture-ritual-material-1', 'player'); hand(game, 'fixture-ritual-material-2', 'player');
  assert.equal(ritualMonster.race, 'Warrior');
  assert.equal(await game.playSpellTrap(spell.uid, 0), true);
  assert.equal(ritualMonster.location, 'monster_zone'); assert.equal(ritualMonster.summonType, 'ritual');
  assert.equal(ritualMonster.currentRace, 'Zombie');
  assert.equal(game.summons.normalSummonAllowance.used, 0);
});

test('Village counts a face-up Spellcaster in a shared Extra Monster Zone', () => {
  const game = duel(); field(game, FIELD_RULE_IDS.SECRET_VILLAGE);
  const extraMage = card('31924889', 'player'); game.field.setExtraMonsterZone(0, 'player', extraMage);
  assert.equal(game.canActivateSpell(hand(game, '50913601', 'player'), 'player'), true);
  assert.equal(game.canActivateSpell(hand(game, '50913601', 'opponent'), 'opponent'), false);
});
