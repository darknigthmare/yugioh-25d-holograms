import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { calculateBattleOutcome } from '../src/core/BattleEngine.js';
import { getActiveAdvancedFieldSpells, ADVANCED_FIELD_RULE_SOURCES } from '../src/core/AdvancedFieldSpellRules.js';
import { markFieldSpellPending, markFieldSpellResolved } from '../src/core/FieldSpellRules.js';

// Konami card supplements and Ancient Forest FAQs 8664/8644/8663 are exported
// alongside the shared rules. The two-Skyscraper stacking case is a historical
// OCG secondary ruling (2014-08-15), not a current primary Konami FAQ.
let serial = 0;
function card(id, side = 'player', overrides = {}) {
  const template = [...STARTER_CARDS, ...EXTRA_DECK_CARDS].find(value => String(value.id) === id);
  const value = new CardState({
    id, uid: `advanced-${serial++}`, name: id, name_en: id, card_type: 'monster',
    type: 'Effect Monster', race: 'Warrior', attribute: 'EARTH', level: 4, atk: 1700, def: 1000,
    ...template, ...overrides
  });
  value.ownerId = value.controllerId = side;
  return value;
}
function duel(side = 'player', callbacks = {}) {
  const game = new DuelGame(callbacks);
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  game.startPhaseFlow = () => {};
  game.scheduleAction = () => 0;
  return game;
}
function field(game, id, side = 'player') {
  const value = card(id, side, { card_type: 'spell', type: 'Spell Card', race: 'Field', isFieldSpell: true });
  game.field.placeFieldSpell(side, value);
  markFieldSpellResolved(value, side === 'player' ? 1 : 2);
  return value;
}
function monster(game, id, side, zone, overrides = {}) {
  const value = card(id, side, overrides);
  game.field.setMonsterZone(side, zone, value);
  return value;
}
function battle(game) {
  game.phases.currentPhase = 'battle';
  game.phases.setBattleStep('battle_step');
}
function context(game) { return { fieldSpells: getActiveAdvancedFieldSpells(game) }; }
function setQuick(game, id, side) {
  const value = card(id, side);
  game.field.setSpellZone(side, 0, value);
  value.isSetFaceDown = true;
  value.turnSet = 1;
  return value;
}

test('advanced field rules retain primary ruling links, including end-step order and negated attacks', () => {
  assert.ok(ADVANCED_FIELD_RULE_SOURCES.sanctuary.includes('cid=5982'));
  assert.ok(ADVANCED_FIELD_RULE_SOURCES.skyscraper.includes('cid=6399'));
  assert.ok(ADVANCED_FIELD_RULE_SOURCES.ancientForestNegatedAttack.includes('fid=8664'));
  assert.ok(ADVANCED_FIELD_RULE_SOURCES.ancientForestEndStepOrder.includes('fid=8663'));
});

for (const side of ['player', 'opponent']) {
  const other = side === 'player' ? 'opponent' : 'player';
  for (const sourceSide of ['player', 'opponent']) {
    test(`Sanctuary prevents losing Fairy attack damage, preserving destruction (${side}, source ${sourceSide})`, () => {
      const game = duel(side);
      field(game, '56433456', sourceSide);
      const fairy = monster(game, 'fairy', side, 0, { race: 'Fairy', atk: 1000 });
      const defender = monster(game, 'defender', other, 0, { atk: 2500 });
      const outcome = calculateBattleOutcome(fairy, defender, game.defense, context(game));
      assert.equal(outcome.attackerDamage, 0);
      assert.equal(outcome.attackerDestroyed, true);
      assert.equal(outcome.sanctuaryPreventions[0].preventedDamage, 1500);
      assert.equal(outcome.sanctuaryPreventions[0].targetCard, fairy);
    });

    test(`Skyscraper uses defending monster ATK and changes only the calculation (${side}, source ${sourceSide})`, () => {
      const game = duel(side);
      field(game, '63035430', sourceSide);
      const hero = monster(game, 'hero', side, 0, { name_en: 'Elemental HERO Wildheart', atk: 1700 });
      const defender = monster(game, 'defender', other, 0, { atk: 2000, def: 2500 });
      defender.position = 'defense';
      const before = hero.getAtk();
      const outcome = calculateBattleOutcome(hero, defender, game.defense, context(game));
      assert.equal(outcome.skyscraperBoost.calculatedAtk, 2700);
      assert.equal(outcome.defenderDestroyed, true);
      assert.equal(outcome.defenderDamage, 0);
      assert.equal(hero.getAtk(), before);
      assert.equal(calculateBattleOutcome(hero, defender, game.defense,
        { ...context(game), isDamageCalculation: false }).attackerDamage, 800);
    });
  }

  test(`Sanctuary handles piercing Fairy defenders but permits damage to a non-Fairy controller (${side})`, () => {
    const game = duel(side);
    field(game, '56433456', other);
    const attacker = monster(game, 'attacker', side, 0, { race: 'Fairy', atk: 2400 });
    const defender = monster(game, 'defender', other, 0, { race: 'Warrior', atk: 1000, def: 900 });
    assert.equal(calculateBattleOutcome(attacker, defender, game.defense, context(game)).defenderDamage, 1400);
    assert.equal(calculateBattleOutcome(attacker, null, game.defense, context(game)).defenderDamage, 2400);
    defender.race = defender.currentRace = 'Fairy';
    defender.position = 'defense';
    attacker.piercingBattleDamage = true;
    const protectedOutcome = calculateBattleOutcome(attacker, defender, game.defense, context(game));
    assert.equal(protectedOutcome.defenderDamage, 0);
    assert.equal(protectedOutcome.defenderDestroyed, true);
  });

  test(`Skyscraper never boosts direct attacks, defending HEROes, non-HEROes, or equal/higher ATK (${side})`, () => {
    const game = duel(side);
    field(game, '63035430');
    const hero = monster(game, 'hero', side, 0, { name_en: 'Elemental HERO Wildheart', atk: 1700 });
    const defender = monster(game, 'defender', other, 0, { atk: 1700, def: 3000 });
    assert.equal(calculateBattleOutcome(hero, defender, game.defense, context(game)).skyscraperBoost, undefined);
    assert.equal(calculateBattleOutcome(hero, null, game.defense, context(game)).defenderDamage, 1700);
    defender.baseAtk = defender.currentAtk = 1900;
    hero.name_en = 'Destiny HERO - Dasher';
    assert.equal(calculateBattleOutcome(hero, defender, game.defense, context(game)).skyscraperBoost, undefined);
    hero.name_en = 'Elemental HERO Wildheart';
    hero.position = 'defense';
    assert.equal(calculateBattleOutcome(hero, defender, game.defense, context(game)).skyscraperBoost, undefined);
    hero.position = 'attack';
    assert.equal(calculateBattleOutcome(defender, hero, game.defense, context(game)).skyscraperBoost, undefined);
  });

  test(`Sanctuary live combat prevents LP loss and Kuriboh cost, but still destroys the Fairy (${side})`, async () => {
    const events = [];
    const decisions = [];
    const game = duel(side, { onAnimation: event => events.push({ ...event, timing: game.phases.damageStepSubPhase }),
      onDecision: request => decisions.push(request.type) });
    field(game, '56433456', other);
    const fairy = monster(game, 'fairy', side, 0, { race: 'Fairy', atk: 1000 });
    monster(game, 'defender', other, 0, { atk: 2500 });
    const kuriboh = card('40640057', side);
    kuriboh.location = 'hand';
    game.getSideState(side).hand.push(kuriboh);
    battle(game);
    assert.equal(await game.resolveBattleDamage(fairy, game.getMonsterEntry(side, 0), side, game.getMonsterEntry(other, 0)), true);
    assert.equal(game.getSideState(side).graveyard.includes(fairy), true);
    assert.equal(game.getSideState(side).hand.includes(kuriboh), true);
    assert.equal(decisions.includes('activate-monster-effect'), false);
    assert.equal(side === 'player' ? game.playerLP : game.opponentLP, 8000);
    assert.equal(events.find(event => event.type === 'sanctuary-protection-cinematic').timing, 'calc');
  });

  test(`Ancient Forest activation changes both fields without activating Flip effects (${side})`, async () => {
    const windows = [];
    const game = duel(side, { onChainOpportunity: request => { windows.push(request.lastLink?.context); return null; } });
    const bug = monster(game, '54652250', side, 0);
    bug.position = 'defense'; bug.isSetFaceDown = true;
    const faith = monster(game, '31560081', other, 0);
    faith.position = 'defense'; faith.isSetFaceDown = true;
    const spell = card('55144522', other);
    game.field.sendToGraveyard(spell, other);
    const forest = card('87624166', side);
    forest.location = 'hand'; game.getSideState(side).hand.push(forest);
    assert.equal(await game.activateFieldSpellFromHand(forest.uid, side), true);
    assert.equal(bug.position, 'attack'); assert.equal(bug.isSetFaceDown, false);
    assert.equal(faith.position, 'attack'); assert.equal(faith.isSetFaceDown, false);
    assert.equal(game.getSideState(other).graveyard.includes(spell), true);
    assert.equal(game.getMonsterEntries(side)[0].card, bug);
    assert.equal(game.getMonsterEntries(other)[0].card, faith);
    assert.equal(windows.some(value => ['MAN_EATER_BUG_DESTROY', 'MAGICIAN_OF_FAITH_RECOVER'].includes(value?.effectId)), false);
    assert.equal(bug.hasChangedPositionThisTurn, false);
  });

  test(`Ancient Forest activates on an empty field (${side})`, async () => {
    const game = duel(side);
    const forest = card('87624166', side);
    forest.location = 'hand'; game.getSideState(side).hand.push(forest);
    assert.equal(await game.activateFieldSpellFromHand(forest.uid, side), true);
    assert.equal(forest.fieldActivationState, 'resolved');
  });

  test(`Ancient Forest destroys only performed attackers at Battle End Step, including face-down survivors (${side})`, async () => {
    const timings = [];
    const events = [];
    const game = duel(side, { onChainOpportunity: request => {
      if (request.lastLink?.context.effectId === 'ANCIENT_FOREST_DESTROY_ATTACKERS') {
        timings.push(game.phases.battleStep);
        assert.equal(request.lastLink.targets.length, 0);
      }
      return null;
    }, onAnimation: event => events.push(event) });
    field(game, '87624166', other);
    const attacker = monster(game, 'attacker', side, 0, { atk: 1000 });
    const idle = monster(game, 'idle', other, 1);
    battle(game);
    assert.equal(await game.resolveDirectAttackDamage(attacker, game.getMonsterEntry(side, 0), side), true);
    assert.equal(attacker.location, 'monster_zone');
    attacker.isSetFaceDown = true; attacker.position = 'defense';
    assert.equal(await game.processBattleEndEffects(), true);
    assert.equal(attacker.location, 'graveyard');
    assert.equal(idle.location, 'monster_zone');
    assert.ok(timings.length > 0); assert.ok(timings.every(value => value === 'end_step'));
    assert.equal(events.filter(event => event.type === 'ancient-forest-destruction-cinematic').length, 1);
    assert.equal(await game.processBattleEndEffects(), true);
    assert.equal(events.filter(event => event.type === 'ancient-forest-destruction-cinematic').length, 1);
  });

  test(`Ancient Forest's destruction can be negated by Stardust with a paid Tribute (${side})`, async () => {
    let responded = false;
    const game = duel(side, { onChainOpportunity: request => {
      if (!responded && request.side === other && request.lastLink?.context.effectId === 'ANCIENT_FOREST_DESTROY_ATTACKERS') {
        const candidate = request.candidates.find(value => String(value.card?.id || value.id) === '44508094');
        if (candidate) { responded = true; return candidate.cardUid; }
      }
      return null;
    } });
    const forest = field(game, '87624166', side);
    const attacker = monster(game, 'attacker', side, 0, { atk: 1000 });
    const stardust = monster(game, '44508094', other, 0);
    battle(game);
    game.recordPerformedBattleAttack(attacker);
    assert.equal(await game.processBattleEndEffects(), true);
    assert.equal(responded, true);
    assert.equal(stardust.location, 'graveyard');
    assert.equal(forest.location, 'graveyard');
    assert.equal(attacker.location, 'monster_zone');
    assert.equal(stardust.stardustReturnEligibleTurn, game.turnCount);
  });
}

test('two Skyscrapers apply +2000 from the same pre-increase ATK comparison (historical OCG ruling)', () => {
  const game = duel();
  field(game, '63035430', 'player'); field(game, '63035430', 'opponent');
  const hero = monster(game, 'hero', 'player', 0, { name_en: 'Elemental HERO Wildheart', atk: 1700 });
  const defender = monster(game, 'defender', 'opponent', 0, { atk: 2700 });
  const result = calculateBattleOutcome(hero, defender, game.defense, context(game));
  assert.equal(result.skyscraperBoost.bonus, 2000);
  assert.equal(result.skyscraperBoost.sourceCards.length, 2);
  assert.equal(result.defenderDamage, 1000);
  assert.equal(hero.getAtk(), 1700);
});

test('shared battle projections discard opaque opposing Set Fields before reading identity or statistics', () => {
  const source = new Proxy({ isSetFaceDown: true }, { get: (value, key) => {
    if (key === 'isSetFaceDown') return true;
    assert.fail(`an opposing Set Field revealed ${String(key)}`);
  } });
  const game = duel();
  game.field.opponentFieldSpellZone = source;
  assert.deepEqual(getActiveAdvancedFieldSpells(game), []);
  const attacker = card('attacker', 'player', { name_en: 'Elemental HERO Wildheart', race: 'Fairy', atk: 1000 });
  const defender = card('defender', 'opponent', { atk: 2000 });
  const outcome = calculateBattleOutcome(attacker, defender, game.defense, { fieldSpells: [source] });
  assert.equal(outcome.attackerDamage, 1000);
  assert.equal(outcome.skyscraperBoost, undefined); assert.equal(outcome.sanctuaryPreventions, undefined);
});

for (const inactive of ['face-down', 'pending', 'negated', 'departed', 'old-incarnation']) {
  test(`advanced continuous effects ignore ${inactive} Field Spell sources`, () => {
    for (const id of ['56433456', '63035430']) {
      const game = duel();
      const source = field(game, id);
      if (inactive === 'face-down') source.isSetFaceDown = true;
      if (inactive === 'pending') markFieldSpellPending(source);
      if (inactive === 'negated') source.effectNegated = true;
      if (inactive === 'departed') game.field.sendToGraveyard(source, 'player');
      if (inactive === 'old-incarnation') source.fieldActivationRuntimeInstanceId = 'obsolete';
      const attacker = monster(game, 'attacker', 'player', 0, { name_en: 'Elemental HERO Wildheart', race: 'Fairy', atk: 1000 });
      const defender = monster(game, 'defender', 'opponent', 0, { atk: 2000 });
      const result = calculateBattleOutcome(attacker, defender, game.defense, { fieldSpells: [source] });
      assert.equal(result.attackerDamage, 1000);
      assert.equal(result.skyscraperBoost, undefined);
      assert.equal(result.sanctuaryPreventions, undefined);
    }
  });
}

test('Ancient Forest activation destroyed by chained MST changes no Defense monster', async () => {
  let selected = false;
  const game = duel('player', { onChainOpportunity: request => {
    if (!selected && request.side === 'opponent' && request.lastLink?.context.fieldSpellActivation) {
      const candidate = request.candidates.find(value => String(value.card?.id || value.id).padStart(8, '0') === '05318639');
      if (candidate) { selected = true; return candidate.cardUid; }
    }
    return null;
  } });
  setQuick(game, '05318639', 'opponent');
  const defense = monster(game, 'defense', 'player', 0); defense.position = 'defense';
  const forest = card('87624166'); forest.location = 'hand'; game.playerHand.push(forest);
  assert.equal(await game.activateFieldSpellFromHand(forest.uid), false);
  assert.equal(selected, true);
  assert.equal(forest.location, 'graveyard');
  assert.equal(defense.position, 'defense');
});

for (const negation of ['activation', 'effect']) {
  test(`Ancient Forest ${negation} negation skips the activation position change`, async () => {
    const game = duel('player', { onChainOpportunity: request => {
      if (request.lastLink?.context.fieldSpellActivation) request.lastLink[`${negation}Negated`] = true;
      return null;
    } });
    const defense = monster(game, 'defense', 'player', 0); defense.position = 'defense';
    const forest = card('87624166'); forest.location = 'hand'; game.playerHand.push(forest);
    assert.equal(await game.activateFieldSpellFromHand(forest.uid), negation === 'effect');
    assert.equal(defense.position, 'defense');
    assert.equal(forest.location, negation === 'activation' ? 'graveyard' : 'field_zone');
  });
}

test('Ancient Forest does not destroy an attacker incarnation that left and returned', async () => {
  const game = duel(); field(game, '87624166');
  const attacker = monster(game, 'attacker', 'player', 0);
  battle(game);
  game.recordPerformedBattleAttack(attacker);
  game.field.sendToGraveyard(attacker, 'player'); game.field.setMonsterZone('player', 0, attacker);
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(attacker.location, 'monster_zone');
});

test('Ancient Forest absent at Battle End Step has no delayed independent destruction', async () => {
  const game = duel(); const forest = field(game, '87624166');
  const attacker = monster(game, 'attacker', 'player', 0);
  battle(game); game.recordPerformedBattleAttack(attacker);
  game.field.sendToGraveyard(forest, 'player');
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(attacker.location, 'monster_zone');
});

test('Ancient Forest end-step effect requires its same source at resolution after chained MST', async () => {
  let selected = false;
  const game = duel('player', { onChainOpportunity: request => {
    if (!selected && request.side === 'opponent' && request.lastLink?.context.effectId === 'ANCIENT_FOREST_DESTROY_ATTACKERS') {
      const candidate = request.candidates.find(value => String(value.card?.id || value.id).padStart(8, '0') === '05318639');
      if (candidate) { selected = true; return candidate.cardUid; }
    }
    return null;
  } });
  const forest = field(game, '87624166'); setQuick(game, '05318639', 'opponent');
  const attacker = monster(game, 'attacker', 'player', 0);
  battle(game); game.recordPerformedBattleAttack(attacker);
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(selected, true); assert.equal(forest.location, 'graveyard');
  assert.equal(attacker.location, 'monster_zone');
});

test('a negated Ancient Forest end-step effect still activates once, but applies no destruction', async () => {
  let count = 0;
  const game = duel('player', { onAnimation: event => {
    if (event.type === 'chain-pop' && event.card.id === '87624166') count++;
  } });
  const forest = field(game, '87624166'); forest.effectNegated = true;
  const attacker = monster(game, 'attacker', 'player', 0);
  battle(game); game.recordPerformedBattleAttack(attacker);
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(attacker.location, 'monster_zone'); assert.equal(count, 1);
  assert.equal(await game.processBattleEndEffects(), true); assert.equal(count, 1);
});

for (const turn of ['player', 'opponent']) {
  test(`two Ancient Forest end-step effects resolve individual turn/non-turn chains (${turn})`, async () => {
    const activations = [];
    const game = duel(turn, { onAnimation: event => {
      if (event.type === 'chain-pop' && event.card.id === '87624166') activations.push({ side: event.card.controllerId, id: event.linkNumber });
    } });
    const first = field(game, '87624166', turn);
    field(game, '87624166', game.getOpponentSide(turn));
    first.effectNegated = true;
    const attacker = monster(game, 'attacker', turn, 0);
    battle(game); game.recordPerformedBattleAttack(attacker);
    assert.equal(await game.processBattleEndEffects(), true);
    assert.deepEqual(activations.map(value => value.side), [turn, game.getOpponentSide(turn)]);
    assert.deepEqual(activations.map(value => value.id), [1, 1]);
    assert.equal(attacker.location, 'graveyard');
  });
}

test('player phase exit and AI battle exit both execute Ancient Forest before Main Phase 2', async () => {
  const player = duel(); field(player, '87624166', 'opponent');
  const attacking = monster(player, 'attacker', 'player', 0, { atk: 1000 });
  battle(player);
  await player.executeAttack(0);
  assert.equal(attacking.location, 'monster_zone');
  assert.equal(await player.changePhase('main2'), true);
  assert.equal(attacking.location, 'graveyard'); assert.equal(player.currentPhase, 'main2');

  const ai = duel('opponent'); field(ai, '87624166');
  const aiAttacker = monster(ai, 'attacker', 'opponent', 0, { atk: 1000 });
  battle(ai);
  assert.equal(await ai.runAIBattlePhase(), true);
  assert.equal(aiAttacker.location, 'graveyard'); assert.equal(ai.currentPhase, 'main2');
});

test('an effect-negated attack never qualifies for Ancient Forest destruction', async () => {
  const game = duel('player', { onDecision: request => {
    if (request.type === 'activate-monster-effect' && request.effect === 'utopia-negate-attack') return true;
  } });
  field(game, '87624166');
  const attacker = monster(game, 'attacker', 'player', 0, { atk: 3000 });
  const utopia = monster(game, '84013237', 'opponent', 0);
  utopia.xyzMaterials.push(card('material', 'opponent'));
  battle(game);
  const declaration = await game.executeAttack(0, 0);
  assert.equal(declaration.attackNegated, true);
  assert.equal(attacker.attacksDeclaredThisTurn, 1);
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(attacker.location, 'monster_zone');
});

test('reset at the locked End Step publication aborts every old Forest effect', async () => {
  let didReset = false;
  const game = duel('player', { onStateChange: state => {
    if (!didReset && state.phases.battleStep === 'end_step') { didReset = true; state.reset(); }
  } });
  field(game, '87624166'); const attacker = monster(game, 'attacker', 'player', 0);
  battle(game); game.recordPerformedBattleAttack(attacker);
  assert.equal(await game.processBattleEndEffects(), false);
  assert.equal(game.chain.chainStack.length, 0); assert.equal(game.isResolvingAction, false);
  assert.equal(game.getFieldSpellForSide('player'), null);
});

for (const side of ['player', 'opponent']) {
  test(`live Skyscraper combat emits its boost only at calculation and leaves current ATK unchanged (${side})`, async () => {
    const events = [];
    const game = duel(side, { onAnimation: event => events.push({ ...event, timing: game.phases.damageStepSubPhase }) });
    const other = game.getOpponentSide(side);
    field(game, '63035430', other);
    const hero = monster(game, 'hero', side, 0, { name_en: 'Elemental HERO Wildheart', atk: 1700 });
    const defender = monster(game, 'defender', other, 0, { atk: 2300 });
    battle(game);
    assert.equal(await game.resolveBattleDamage(hero, game.getMonsterEntry(side, 0), side, game.getMonsterEntry(other, 0)), true);
    assert.equal(defender.location, 'graveyard'); assert.equal(hero.getAtk(), 1700);
    assert.equal(other === 'player' ? game.playerLP : game.opponentLP, 7600);
    const boost = events.find(event => event.type === 'skyscraper-boost-cinematic');
    assert.equal(boost.calculatedAtk, 2700); assert.equal(boost.timing, 'calc');
    assert.equal(boost.sourceSide, other); assert.equal(boost.target, side);
  });

  test(`Arcanite may target its controller's own card and pay a Spell Counter (${side})`, async () => {
    let target;
    const game = duel(side, { onDecision: request => request.type === 'select-arcanite-target' ? target.uid : undefined });
    const arcanite = monster(game, '31924889', side, 0);
    target = monster(game, 'own-target', side, 1);
    arcanite.addCounter('spell', 1);
    assert.ok(game.getAvailableActions(side).monsterEffects.some(value => value.cardUid === arcanite.uid));
    assert.equal(await game.activateMonsterEffect(0, side), true);
    assert.equal(arcanite.counters.spell, 0); assert.equal(target.location, 'graveyard');
  });
}

test('abandoning a replay does not qualify for Forest destruction (ProjectIgnis/EDOPro performed-attack tracking)', async () => {
  const game = duel('player', { onDecision: request => request.type === 'battle-replay' ? 'cancel' : undefined });
  field(game, '87624166');
  const attacker = monster(game, 'attacker', 'player', 0);
  monster(game, 'defender', 'opponent', 0, { atk: 1000 });
  game.resolveMirrorForceOnAttack = async () => {
    monster(game, 'new-replay-monster', 'opponent', 1);
    return null;
  };
  battle(game);
  const result = await game.executeAttack(0, 0);
  assert.equal(result.replayCancelled, true); assert.equal(attacker.attacksDeclaredThisTurn, 1);
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(attacker.location, 'monster_zone');
});

test('Forest destroys a performed attacker whose Damage Step stops before calculation (EDOPro tracking)', async () => {
  const game = duel(); field(game, '87624166');
  const attacker = monster(game, 'attacker', 'player', 0);
  const defender = monster(game, 'defender', 'opponent', 0);
  battle(game);
  let moved = false;
  game.delay = async () => {
    if (!moved && game.phases.damageStepSubPhase === 'start') {
      moved = true; game.field.sendToGraveyard(defender, 'opponent');
    }
    return true;
  };
  assert.equal(await game.resolveBattleDamage(attacker, game.getMonsterEntry('player', 0), 'player', game.getMonsterEntry('opponent', 0)), false);
  game.phases.setBattleStep('battle_step');
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(attacker.location, 'graveyard');
});

test('Forest non-targeting destruction bypasses targeting protection but respects destruction protection', async () => {
  const game = duel(); field(game, '87624166');
  const targetProtected = monster(game, 'target-protected', 'player', 0);
  const destroyProtected = monster(game, 'destroy-protected', 'player', 1);
  game.defense.addProtection({ cardUid: targetProtected.uid, type: 'TARGET', independentOfSource: true });
  game.defense.addProtection({ cardUid: destroyProtected.uid, type: 'DESTROY_BY_EFFECT', independentOfSource: true });
  battle(game); game.recordPerformedBattleAttack(targetProtected); game.recordPerformedBattleAttack(destroyProtected);
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(targetProtected.location, 'graveyard'); assert.equal(destroyProtected.location, 'monster_zone');
});

test('Forest destroys both fields atomically before Sangan searches in a following chain', async () => {
  let game;
  let sangan;
  let other;
  let sawSanganWindow = false;
  game = duel('player', { onChainOpportunity: request => {
    if (request.lastLink?.context.effectId === 'SANGAN_SEARCH') {
      sawSanganWindow = true;
      assert.equal(sangan.location, 'graveyard'); assert.equal(other.location, 'graveyard');
      assert.equal(request.lastLink.id, 1);
      assert.equal(game.chain.chainStatus, 'building');
      assert.equal(game.isResolvingAction, true);
    }
    return null;
  } });
  field(game, '87624166');
  sangan = monster(game, '26202165', 'player', 0);
  other = monster(game, 'other-attacker', 'opponent', 0);
  const search = card('71625222'); search.location = 'deck'; game.playerDeck.push(search);
  battle(game); game.recordPerformedBattleAttack(sangan); game.recordPerformedBattleAttack(other);
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(sawSanganWindow, true); assert.equal(game.playerHand.includes(search), true);
  assert.equal(game.defense.isActionProhibited('player', 'ACTIVATE_EFFECT', search), true);
});

test('Forest End Step keeps action locks through both individual chains and rejects a concurrent phase exit', async () => {
  let attempted = false;
  let attempt;
  const game = duel('player', { onStateChange: state => {
    if (state.phases.battleStep === 'end_step' && !attempted && state.chain.chainStatus === 'idle') {
      assert.equal(state.isResolvingAction, true);
      attempted = true; attempt = state.changePhase('main2');
    }
  } });
  const source = field(game, '87624166'); source.effectNegated = true;
  field(game, '87624166', 'opponent');
  const attacker = monster(game, 'attacker', 'player', 0);
  battle(game); game.recordPerformedBattleAttack(attacker);
  assert.equal(await game.processBattleEndEffects(), true);
  assert.equal(await attempt, false); assert.equal(game.currentPhase, 'battle');
  assert.equal(attacker.location, 'graveyard'); assert.equal(game.isResolvingAction, false);
});
