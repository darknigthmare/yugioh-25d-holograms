import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { STARTER_CARDS } from '../src/cards.js';
import { calculateBattleOutcome } from '../src/core/BattleEngine.js';
import {
  ADVANCED_FIELD_SPELL_IDS as IDS, ADVANCED_FIELD_RULE_SOURCES,
  getActiveAdvancedFieldSpells, getDarkCityDamageCalculationBoost,
  getShienDamageCalculationReduction, getCanyonBattleDamageDoubling,
  getTempleBattleDamageChanges, getSkyscraperDamageCalculationBoost,
  getSanctuaryBattleDamagePreventions
} from '../src/core/AdvancedFieldSpellRules.js';
import { markFieldSpellPending, markFieldSpellResolved } from '../src/core/FieldSpellRules.js';

let serial = 0;
function monster(side = 'player', values = {}) {
  const card = new CardState({ id: `combat-${serial}`, uid: `combat-${serial++}`,
    name: 'Public monster', name_en: 'Public monster', card_type: 'monster',
    type: 'Normal Monster', race: 'Warrior', attribute: 'EARTH', level: 4,
    atk: 1700, def: 1000, ...values });
  card.ownerId = card.controllerId = side;
  return card;
}
function field(id, side = 'player') {
  const card = new CardState({ id, uid: `combat-field-${serial++}`, name: id,
    card_type: 'spell', type: 'Spell Card', race: 'Field', isFieldSpell: true });
  card.ownerId = card.controllerId = side;
  card.location = 'field_zone'; card.zoneIndex = 0;
  markFieldSpellResolved(card, serial);
  return card;
}
function game(side = 'player', callbacks = {}) {
  const duel = new DuelGame(callbacks);
  duel.phases.currentTurnOwner = side;
  duel.phases.currentPhase = 'battle';
  duel.phases.setBattleStep('battle_step');
  duel.phases.turnCount = 2;
  duel.delay = async () => true;
  duel.startPhaseFlow = () => {};
  duel.scheduleAction = () => 0;
  return duel;
}
function installField(duel, id, side) {
  const value = field(id, side);
  duel.field.placeFieldSpell(side, value);
  markFieldSpellResolved(value, serial);
  return value;
}
function context(...fieldSpells) { return { fieldSpells }; }

test('combat field rules retain Konami texts, damage order and explicit secondary copy evidence', () => {
  assert.match(ADVANCED_FIELD_RULE_SOURCES.templeMindsEye, /cid=13280/);
  assert.match(ADVANCED_FIELD_RULE_SOURCES.templeDamageDoubling, /fid=21&/);
  assert.match(ADVANCED_FIELD_RULE_SOURCES.battleDamageModifierOrder, /fid=23824&/);
  assert.match(ADVANCED_FIELD_RULE_SOURCES.canyon, /cid=6642/);
  assert.match(ADVANCED_FIELD_RULE_SOURCES.shiensCastleMist, /cid=7003/);
  assert.match(ADVANCED_FIELD_RULE_SOURCES.darkCity, /cid=6758/);
});

for (const attackingSide of ['player', 'opponent']) {
  const defendingSide = attackingSide === 'player' ? 'opponent' : 'player';
  for (const sourceSide of ['player', 'opponent']) {
    test(`Temple replaces actual direct and monster damage in either field (${attackingSide}/${sourceSide})`, () => {
      const source = field(IDS.TEMPLE_MINDS_EYE, sourceSide);
      const attacker = monster(attackingSide, { atk: 3000 });
      const defender = monster(defendingSide, { atk: 2900 });
      const winning = calculateBattleOutcome(attacker, defender, null, context(source));
      assert.equal(winning.defenderDamage, 1000);
      assert.equal(winning.defenderDestroyed, true);
      assert.equal(winning.templeDamageChanges[0].originalDamage, 100);
      assert.equal(calculateBattleOutcome(attacker, null, null, context(source)).defenderDamage, 1000);
      assert.equal(calculateBattleOutcome(defender, attacker, null, context(source)).attackerDamage, 1000);
    });

    test(`Canyon doubles only the attacking controller's damage against a Rock in Defense (${attackingSide}/${sourceSide})`, () => {
      const source = field(IDS.CANYON, sourceSide);
      const attacker = monster(attackingSide, { atk: 1600 });
      const rock = monster(defendingSide, { race: 'Rock', atk: 100, def: 2000 });
      rock.position = 'defense';
      const outcome = calculateBattleOutcome(attacker, rock, null, context(source));
      assert.equal(outcome.attackerDamage, 800);
      assert.equal(outcome.attackerDestroyed, false);
      assert.equal(outcome.defenderDestroyed, false);
      assert.equal(outcome.canyonDamageModification.originalDamage, 400);
      rock.position = 'attack';
      assert.equal(calculateBattleOutcome(attacker, rock, null, context(source)).defenderDamage, 1500);
      rock.position = 'defense';
      rock.currentRace = 'Zombie';
      assert.equal(calculateBattleOutcome(attacker, rock, null, context(source)).attackerDamage, 400);
      rock.currentRace = 'Rock';
      attacker.currentAtk = 2500;
      attacker.piercingBattleDamage = true;
      assert.equal(calculateBattleOutcome(attacker, rock, null, context(source)).defenderDamage, 500);
      assert.equal(calculateBattleOutcome(attacker, null, null, context(source)).defenderDamage, 2500);
    });

    test(`Shien reduces the attacker during calculation against either player's Six Samurai (${attackingSide}/${sourceSide})`, () => {
      const source = field(IDS.SHIENS_CASTLE_MIST, sourceSide);
      const attacker = monster(attackingSide, { atk: 2000 });
      const samurai = monster(defendingSide, { name_en: 'The Six Samurai - Zanji', atk: 1800 });
      const outcome = calculateBattleOutcome(attacker, samurai, null, context(source));
      assert.equal(outcome.shienReduction.calculatedAtk, 1500);
      assert.equal(outcome.attackerDamage, 300);
      assert.equal(outcome.attackerDestroyed, true);
      assert.equal(attacker.getAtk(), 2000);
      assert.equal(calculateBattleOutcome(attacker, samurai, null,
        { ...context(source), isDamageCalculation: false }).defenderDamage, 200);
      assert.equal(calculateBattleOutcome(attacker, null, null, context(source)).defenderDamage, 2000);
      samurai.name_en = 'Great Shogun Shien';
      assert.equal(calculateBattleOutcome(attacker, samurai, null, context(source)).shienReduction, undefined);
    });

    test(`Dark City checks ATK even against Defense and does not grant a persistent bonus (${attackingSide}/${sourceSide})`, () => {
      const source = field(IDS.DARK_CITY, sourceSide);
      const hero = monster(attackingSide, { name_en: 'Destiny HERO - Dasher', atk: 1700 });
      const defender = monster(defendingSide, { atk: 1800, def: 2500 });
      defender.position = 'defense';
      const outcome = calculateBattleOutcome(hero, defender, null, context(source));
      assert.equal(outcome.darkCityBoost.calculatedAtk, 2700);
      assert.equal(outcome.defenderDestroyed, true);
      assert.equal(outcome.defenderDamage, 0);
      assert.equal(hero.getAtk(), 1700);
      defender.currentAtk = 1700;
      assert.equal(calculateBattleOutcome(hero, defender, null, context(source)).darkCityBoost, undefined);
      defender.currentAtk = 1800;
      hero.name_en = 'Elemental HERO Wildheart';
      assert.equal(calculateBattleOutcome(hero, defender, null, context(source)).darkCityBoost, undefined);
      hero.name_en = 'Destiny HERO - Dasher';
      assert.equal(calculateBattleOutcome(hero, null, null, context(source)).defenderDamage, 1700);
      assert.equal(calculateBattleOutcome(hero, defender, null,
        { ...context(source), isDamageCalculation: false }).attackerDamage, 800);
    });
  }

  test(`live Temple applies to direct attacks and Kuriboh may still prevent the changed damage (${attackingSide})`, async () => {
    const duel = game(attackingSide, { onDecision: request => request.type === 'activate-monster-effect' ? true : undefined });
    installField(duel, IDS.TEMPLE_MINDS_EYE, defendingSide);
    const attacker = monster(attackingSide, { atk: 3000 });
    duel.field.setMonsterZone(attackingSide, 0, attacker);
    const kuriboh = monster(defendingSide, { id: '40640057', name: 'Kuriboh', type: 'Effect Monster' });
    kuriboh.location = 'hand';
    duel.getSideState(defendingSide).hand.push(kuriboh);
    assert.equal(await duel.resolveDirectAttackDamage(attacker, duel.getMonsterEntry(attackingSide, 0), attackingSide), true);
    assert.equal(duel[`${defendingSide}LP`], 8000);
    assert.equal(kuriboh.location, 'graveyard');
  });

  test(`live Canyon reads a Set defender's Rock identity only after its public battle reveal (${attackingSide})`, async () => {
    const duel = game(attackingSide);
    installField(duel, IDS.CANYON, attackingSide);
    const attacker = monster(attackingSide, { atk: 1600 });
    const rock = monster(defendingSide, { race: 'Rock', atk: 100, def: 2200 });
    rock.position = 'defense'; rock.isSetFaceDown = true;
    duel.field.setMonsterZone(attackingSide, 0, attacker);
    duel.field.setMonsterZone(defendingSide, 0, rock);
    for (const property of ['race', 'currentRace', 'name_en']) {
      let value = rock[property];
      Object.defineProperty(rock, property, {
        get() { assert.equal(rock.isSetFaceDown, false, `private ${property} read before battle reveal`); return value; },
        set(next) { value = next; }, configurable: true
      });
    }
    assert.equal(await duel.resolveBattleDamage(attacker, duel.getMonsterEntry(attackingSide, 0), attackingSide,
      duel.getMonsterEntry(defendingSide, 0)), true);
    assert.equal(rock.isSetFaceDown, false);
    assert.equal(duel[`${attackingSide}LP`], 6800);
    assert.equal(rock.location, 'monster_zone');
  });

  test(`live Shien changes destruction and LP but leaves ATK unchanged after calculation (${attackingSide})`, async () => {
    const duel = game(attackingSide);
    installField(duel, IDS.SHIENS_CASTLE_MIST, attackingSide);
    const attacker = monster(attackingSide, { atk: 2000 });
    const samurai = monster(defendingSide, { name_en: 'Legendary Six Samurai - Kizan', atk: 1800 });
    duel.field.setMonsterZone(attackingSide, 0, attacker);
    duel.field.setMonsterZone(defendingSide, 0, samurai);
    assert.equal(await duel.resolveBattleDamage(attacker, duel.getMonsterEntry(attackingSide, 0), attackingSide,
      duel.getMonsterEntry(defendingSide, 0)), true);
    assert.equal(duel[`${attackingSide}LP`], 7700);
    assert.equal(attacker.location, 'graveyard');
    assert.equal(samurai.location, 'monster_zone');
    assert.equal(attacker.getAtk(), 2000);
  });

  test(`live Dark City boosts an attacker supplied by the opposite player's Field Spell (${attackingSide})`, async () => {
    const duel = game(attackingSide);
    installField(duel, IDS.DARK_CITY, defendingSide);
    const hero = monster(attackingSide, { name_en: 'Destiny HERO - Dasher', atk: 1700 });
    const defender = monster(defendingSide, { atk: 2300 });
    duel.field.setMonsterZone(attackingSide, 0, hero);
    duel.field.setMonsterZone(defendingSide, 0, defender);
    assert.equal(await duel.resolveBattleDamage(hero, duel.getMonsterEntry(attackingSide, 0), attackingSide,
      duel.getMonsterEntry(defendingSide, 0)), true);
    assert.equal(duel[`${defendingSide}LP`], 7600);
    assert.equal(defender.location, 'graveyard');
    assert.equal(hero.getAtk(), 1700);
  });
}

test('Temple preserves zero damage, ties, ordinary Defense wins, and zero-ATK direct attacks', () => {
  const source = field(IDS.TEMPLE_MINDS_EYE);
  const attacker = monster('player', { atk: 2000 });
  const defender = monster('opponent', { atk: 2000, def: 1000 });
  assert.equal(calculateBattleOutcome(attacker, defender, null, context(source)).defenderDamage, 0);
  defender.position = 'defense';
  assert.equal(calculateBattleOutcome(attacker, defender, null, context(source)).defenderDamage, 0);
  attacker.piercingBattleDamage = true;
  assert.equal(calculateBattleOutcome(attacker, defender, null, context(source)).defenderDamage, 1000);
  attacker.currentAtk = 0;
  assert.equal(calculateBattleOutcome(attacker, null, null, context(source)).defenderDamage, 0);
});

test('two Dark City copies use one comparison before either boost; two Canyon copies double only once', () => {
  const hero = monster('player', { name_en: 'Destiny HERO - Celestial', atk: 1600 });
  const defender = monster('opponent', { atk: 1700, def: 2500, race: 'Rock' });
  const first = field(IDS.DARK_CITY), second = field(IDS.DARK_CITY, 'opponent');
  const boosted = calculateBattleOutcome(hero, defender, null, context(first, second));
  assert.equal(boosted.darkCityBoost.bonus, 2000);
  assert.equal(boosted.defenderDamage, 1900);
  assert.equal(calculateBattleOutcome(hero, defender, null, context(first, first)).darkCityBoost.bonus, 1000);
  defender.position = 'defense';
  const doubled = calculateBattleOutcome(hero, defender, null,
    context(field(IDS.CANYON), field(IDS.CANYON, 'opponent')));
  assert.equal(doubled.attackerDamage, 1800);
});

test('two Shien sources stack their reductions and calculated ATK never becomes negative', () => {
  const attacker = monster('player', { atk: 600 });
  const samurai = monster('opponent', { name_en: 'The Six Samurai - Yaichi', atk: 500 });
  const outcome = calculateBattleOutcome(attacker, samurai, null,
    context(field(IDS.SHIENS_CASTLE_MIST), field(IDS.SHIENS_CASTLE_MIST, 'opponent')));
  assert.equal(outcome.shienReduction.reduction, 1000);
  assert.equal(outcome.shienReduction.calculatedAtk, 0);
  assert.equal(outcome.attackerDamage, 500);
  assert.equal(attacker.getAtk(), 600);
});

test('fixed calculation reductions are included in the shared HERO comparison and the final sum floors only once', () => {
  const hero = monster('player', { name_en: 'Destiny HERO - Celestial', atk: 200 });
  const samurai = monster('opponent', { name_en: 'The Six Samurai - Yaichi', atk: 100 });
  const outcome = calculateBattleOutcome(hero, samurai, null,
    context(field(IDS.SHIENS_CASTLE_MIST), field(IDS.DARK_CITY, 'opponent')));
  assert.equal(outcome.darkCityBoost.bonus, 1000);
  assert.equal(outcome.darkCityBoost.calculatedAtk, 700);
  assert.equal(outcome.shienReduction.calculatedAtk, 700);
  assert.equal(outcome.defenderDamage, 600);
  assert.equal(hero.getAtk(), 200);
});

test('Sanctuary zero precedes Temple fixed damage, and Canyon doubling precedes Temple', () => {
  const attacker = monster('player', { atk: 1500, race: 'Fairy' });
  const rock = monster('opponent', { atk: 500, def: 2500, race: 'Rock' });
  rock.position = 'defense';
  const temple = field(IDS.TEMPLE_MINDS_EYE), canyon = field(IDS.CANYON, 'opponent');
  const doubledThenFixed = calculateBattleOutcome(attacker, rock, null, context(temple, canyon));
  assert.equal(doubledThenFixed.canyonDamageModification.modifiedDamage, 2000);
  assert.equal(doubledThenFixed.templeDamageChanges[0].originalDamage, 2000);
  assert.equal(doubledThenFixed.attackerDamage, 1000);
  const prevented = calculateBattleOutcome(attacker, rock, null,
    context(temple, field(IDS.SANCTUARY, 'opponent')));
  assert.equal(prevented.attackerDamage, 0);
  assert.equal(prevented.templeDamageChanges, undefined);
  assert.equal(prevented.sanctuaryPreventions[0].preventedDamage, 1000);
});

test('battle destruction and target protection do not negate external stat or player damage effects', () => {
  const duel = game();
  const hero = monster('player', { name_en: 'Destiny HERO - Celestial', atk: 1600 });
  const defender = monster('opponent', { atk: 1700 });
  hero.effectNegated = true;
  duel.defense.negateCard(hero.uid);
  duel.defense.addProtection({ cardUid: hero.uid, type: 'TARGET', independentOfSource: true });
  duel.defense.addProtection({ cardUid: defender.uid, type: 'DESTROY_BY_BATTLE', independentOfSource: true });
  const outcome = calculateBattleOutcome(hero, defender, duel.defense,
    context(field(IDS.DARK_CITY), field(IDS.TEMPLE_MINDS_EYE, 'opponent')));
  assert.equal(outcome.darkCityBoost.bonus, 1000);
  assert.equal(outcome.defenderDestroyed, false);
  assert.equal(outcome.defenderDamage, 1000);
});

for (const id of [IDS.TEMPLE_MINDS_EYE, IDS.CANYON, IDS.SHIENS_CASTLE_MIST, IDS.DARK_CITY]) {
  test(`${id} has no combat effect while pending, Set, negated, removed or in an old incarnation`, () => {
    const source = field(id);
    const attacker = monster('player', { name_en: 'Destiny HERO - Celestial', atk: 1700 });
    const defender = monster('opponent', { name_en: 'The Six Samurai - Zanji', race: 'Rock', atk: 1800, def: 2600 });
    defender.position = 'defense';
    const original = calculateBattleOutcome(attacker, defender);
    const duel = game();
    const mutations = [
      () => markFieldSpellPending(source),
      () => { source.isSetFaceDown = true; },
      () => { source.effectNegated = true; },
      () => { source.activationNegated = true; },
      () => { duel.defense.negateCard(source.uid); },
      () => { source.location = 'graveyard'; },
      () => { source.runtimeInstanceId += '-new'; }
    ];
    for (const mutate of mutations) {
      source.location = 'field_zone'; source.isSetFaceDown = false; source.effectNegated = false;
      source.activationNegated = false; duel.defense.clearCardNegation(source.uid);
      markFieldSpellResolved(source, serial);
      mutate();
      assert.deepEqual(calculateBattleOutcome(attacker, defender, duel.defense, context(source)), original);
    }
  });
}

test('public projections never inspect hidden Field or monster identity while checking combat clauses', () => {
  function hidden() {
    const value = { isSetFaceDown: true };
    for (const property of ['id', 'card_type', 'race', 'currentRace', 'name', 'name_en', 'getAtk', 'getDef']) {
      Object.defineProperty(value, property, { get() { throw new Error(`Hidden ${property} read`); } });
    }
    return value;
  }
  const attacker = monster('player', { name_en: 'Destiny HERO - Celestial' });
  const defender = monster('opponent', { name_en: 'The Six Samurai - Zanji', race: 'Rock' });
  defender.position = 'defense';
  const hiddenMonster = hidden();
  const sources = context(hidden());
  const damage = { attackerDamage: 400, defenderDamage: 0 };
  assert.equal(getDarkCityDamageCalculationBoost(attacker, defender, null, sources), null);
  assert.equal(getShienDamageCalculationReduction(attacker, defender, null, sources), null);
  assert.equal(getCanyonBattleDamageDoubling(attacker, defender, damage, null, sources), null);
  assert.deepEqual(getTempleBattleDamageChanges(attacker, defender, damage, null, sources), []);
  assert.equal(getDarkCityDamageCalculationBoost(hiddenMonster, defender), null);
  assert.equal(getDarkCityDamageCalculationBoost(attacker, hiddenMonster), null);
  assert.equal(getSkyscraperDamageCalculationBoost(hiddenMonster, defender), null);
  assert.equal(getShienDamageCalculationReduction(attacker, hiddenMonster), null);
  assert.equal(getShienDamageCalculationReduction(hiddenMonster, defender), null);
  assert.equal(getCanyonBattleDamageDoubling(attacker, hiddenMonster, damage), null);
  assert.deepEqual(getSanctuaryBattleDamagePreventions(hiddenMonster, defender, damage, null,
    context(field(IDS.SANCTUARY))), []);
});

test('a live removed source disappears from combat collection immediately', () => {
  const duel = game();
  const temple = installField(duel, IDS.TEMPLE_MINDS_EYE, 'opponent');
  assert.equal(getActiveAdvancedFieldSpells(duel)[0], temple);
  duel.field.sendToGraveyard(temple, 'opponent');
  assert.deepEqual(getActiveAdvancedFieldSpells(duel), []);
});

for (const id of [IDS.TEMPLE_MINDS_EYE, IDS.CANYON, IDS.SHIENS_CASTLE_MIST, IDS.DARK_CITY]) {
  test(`${id} activates through its actual Field Spell Chain without requiring monsters or targets`, async () => {
    const duel = game(); duel.phases.currentPhase = 'main1';
    const template = STARTER_CARDS.find(candidate => candidate.id === id);
    assert.ok(template, `missing combat Field Spell template ${id}`);
    const source = new CardState({ ...template, uid: `combat-activation-${serial++}` });
    source.ownerId = source.controllerId = 'player'; source.location = 'hand';
    duel.playerHand.push(source);
    assert.equal(await duel.activateFieldSpellFromHand(source.uid, 'player'), true);
    assert.equal(source.fieldActivationState, 'resolved');
    assert.equal(duel.getFieldSpellForSide('player'), source);
    assert.equal(duel.playerHand.includes(source), false);
    assert.equal(duel.playerLP, 8000);
    assert.equal(duel.opponentLP, 8000);
  });
}

test('live Canyon and Temple apply in official doubling-before-fixed-value order', async () => {
  const duel = game();
  installField(duel, IDS.CANYON, 'player');
  installField(duel, IDS.TEMPLE_MINDS_EYE, 'opponent');
  const attacker = monster('player', { atk: 1500 });
  const rock = monster('opponent', { atk: 100, def: 2200, race: 'Rock' });
  rock.position = 'defense';
  duel.field.setMonsterZone('player', 0, attacker);
  duel.field.setMonsterZone('opponent', 0, rock);
  assert.equal(await duel.resolveBattleDamage(attacker, duel.getMonsterEntry('player', 0), 'player',
    duel.getMonsterEntry('opponent', 0)), true);
  assert.equal(duel.playerLP, 7000);
  assert.equal(duel.opponentLP, 8000);
});
