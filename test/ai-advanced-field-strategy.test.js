import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { chooseAIAttackTarget, chooseAIMonsterPosition, scoreAIFieldSpell } from '../src/content/AIStrategy.js';
import { chooseAIChainResponse, chooseAIResponseTarget } from '../src/content/AIResponsePolicy.js';
import { calculateBattleOutcome } from '../src/core/BattleEngine.js';
import { CardState } from '../src/core/CardState.js';
import { IMPLEMENTED_FIELD_SPELLS } from '../src/core/ClassicFieldSpellEffects.js';
import { markFieldSpellResolved, hasResolvedFieldSpellActivation } from '../src/core/FieldSpellRules.js';
import { DuelGame } from '../src/game.js';

let nextUid = 0;
function local(id, side = 'opponent', overrides = {}) {
  const template = [...STARTER_CARDS, ...EXTRA_DECK_CARDS].find(card => String(card.id) === id);
  assert.ok(template, `missing supported card ${id}`);
  const card = new CardState({ ...template, ...overrides, uid: `advanced-ai-${++nextUid}` });
  card.ownerId = card.controllerId = side;
  card.location = 'hand';
  return card;
}

function duel(difficulty = 'hard') {
  const game = new DuelGame({}, { aiDifficulty: difficulty });
  game.phases.currentTurnOwner = 'opponent';
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.delay = async () => !game._duelEnded;
  game.scheduleAction = () => 0;
  game.startPhaseFlow = () => {};
  game.callbacks.onDecision = request => chooseAIResponseTarget(game, request);
  game.callbacks.onChainOpportunity = request => chooseAIChainResponse(game, request);
  return game;
}

function place(game, id, side = 'opponent', position = 'attack', zone = 0) {
  const card = local(id, side);
  game.field.setMonsterZone(side, zone, card);
  card.position = position;
  card.turnSummoned = 1;
  return card;
}

function activeField(game, id, side = 'opponent') {
  const card = local(id, side);
  game.field.placeFieldSpell(side, card);
  markFieldSpellResolved(card, side === 'opponent' ? 1 : 2);
  game.stabilizer.stabilize(game);
  return card;
}

function opaqueSet() {
  return new Proxy({ isSetFaceDown: true }, { get(target, key) {
    if (key === 'isSetFaceDown') return true;
    assert.fail(`AI inspected private opposing Set property ${String(key)}`);
  } });
}

test('AI registry scores all implemented Field Spells without treating script effects as stat boosts', () => {
  const game = duel();
  assert.equal(IMPLEMENTED_FIELD_SPELLS.length, 29);
  for (const field of IMPLEMENTED_FIELD_SPELLS) {
    const score = scoreAIFieldSpell(game, local(field.id));
    assert.equal(Number.isFinite(score), true, field.name_en);
    assert.equal(score, 0, `${field.name_en} does not invent value on an empty board`);
  }
});

test('Sorcerous Spell Wall credits its controller and the actual turn, without symmetric imaginary bonuses', () => {
  const game = duel();
  const beast = place(game, '64428736');
  place(game, '89631139', 'player');
  assert.ok(scoreAIFieldSpell(game, local('81231742')) > 0);
  beast.position = 'defense';
  game.phases.currentTurnOwner = 'player';
  assert.ok(scoreAIFieldSpell(game, local('81231742')) > 0);
  assert.equal(beast.getDef(), 1200);
  assert.equal(beast.currentRace, 'Beast');
});

test('Closed Forest counts its own public monster Graveyard and loses its Beast bonus under Zombie World', () => {
  const game = duel();
  const beast = place(game, '64428736');
  game.field.sendToGraveyard(local('20721928'), 'opponent');
  game.field.sendToGraveyard(local('83764718'), 'opponent');
  const noZombie = scoreAIFieldSpell(game, local('78082039'));
  assert.ok(noZombie > 0);
  activeField(game, '4064256', 'player');
  assert.equal(beast.currentRace, 'Zombie');
  assert.equal(scoreAIFieldSpell(game, local('78082039')), 0);
});

test('Zombie World removes an opposing Dinosaur bonus without mutating the live monster Type', () => {
  const game = duel();
  const dinosaur = place(game, '81823360', 'player');
  activeField(game, '10080320', 'player');
  assert.equal(dinosaur.getAtk(), 2300);
  assert.ok(scoreAIFieldSpell(game, local('4064256')) > 0);
  assert.equal(dinosaur.getAtk(), 2300);
  assert.equal(dinosaur.currentRace, 'Dinosaur');
});

test('the AI values Village from public Spellcasters and never peeks at opposing Set identities', () => {
  const game = duel();
  place(game, '46986414');
  game.field.playerMonsterZones[0] = opaqueSet();
  assert.ok(scoreAIFieldSpell(game, local('68462976')) > 0);
  game.field.opponentMonsterZones[0] = null;
  game.opponentHand = [local('12580477')];
  assert.ok(scoreAIFieldSpell(game, local('68462976')) < 0, 'self-locking a known future Spell has a real cost');
});

test('a hypothetical Ocean changes current Level before Wetlands checks its Level condition', () => {
  const game = duel();
  const candidate = local('68638985', 'opponent', { level: 3 });
  game.opponentHand = [candidate];
  activeField(game, '2084239', 'player');
  assert.ok(scoreAIFieldSpell(game, local('295517')) > 400);
  assert.equal(candidate.getLevel(), 3);
  assert.equal(candidate.getAtk(), 700);
});

test('removing a Field restores the unclamped printed DEF rather than the entire negative modifier', () => {
  const game = duel();
  const defender = place(game, '81823360', 'opponent', 'defense');
  // A real Normal monster with printed zero DEF: Acidic gives +400 DEF;
  // Saber is unrelated. Gaia Power does not affect this WATER creature.
  const lowDefense = local('44430454', 'opponent', { def: 200 });
  game.field.setMonsterZone('opponent', 0, lowDefense);
  lowDefense.position = 'defense';
  activeField(game, '56594520');
  assert.equal(lowDefense.getDef(), 0);
  assert.equal(scoreAIFieldSpell(game, local('73787254')), 200);
  assert.equal(lowDefense.getDef(), 0);
  assert.equal(defender.baseDef, 0);
});

test('Wetlands chooses the future Slime attacker after projecting its 1200 ATK gain', () => {
  const game = duel();
  const slime = local('68638985');
  const target = place(game, '97590747', 'player');
  game.opponentHand = [slime];
  assert.equal(chooseAIMonsterPosition(game, slime, { forSummon: true }), 'defense');
  assert.ok(scoreAIFieldSpell(game, local('2084239')) > 0, '1900 ATK Slime can beat the 1800 ATK public enemy');
  assert.equal(slime.getAtk(), 700);
  assert.equal(slime.position, 'attack', 'the hand card was not changed to the selected projected position');
  assert.equal(target.getAtk(), 1800);
});

test('a hand Slime does not lose an old Umi bonus that was never applied to its hand statistics', () => {
  const game = duel();
  const old = activeField(game, '22702055');
  const slime = local('68638985');
  game.opponentHand = [slime];
  place(game, '97590747', 'player');
  assert.equal(slime.getAtk(), 700);
  assert.ok(scoreAIFieldSpell(game, local('2084239')) > 0);
  assert.equal(game.opponentFieldSpell, old);
  assert.equal(slime.getAtk(), 700);
  activeField(game, '2084239');
  assert.equal(scoreAIFieldSpell(game, local('2084239')), 0, 'future Wetlands value is not credited twice');
});

test('Skyscraper battle planning compares defending monster ATK and grants its boost only during damage calculation', () => {
  const game = duel();
  const hero = place(game, '20721928');
  const defender = place(game, '89631139', 'player', 'defense');
  const entry = { card: defender, zoneIndex: 0 };
  assert.equal(chooseAIAttackTarget(game, hero, [entry]), null);
  const field = activeField(game, '63035430');
  assert.equal(hero.getAtk(), 1600);
  assert.equal(chooseAIAttackTarget(game, hero, [entry]), entry);
  assert.equal(calculateBattleOutcome(hero, defender, game.defense, { fieldSpells: [field] }).skyscraperBoost.calculatedAtk, 2600);
  assert.equal(hero.getAtk(), 1600);

  const lowerAtkWall = local('15025844', 'player');
  lowerAtkWall.position = 'defense';
  assert.equal(chooseAIAttackTarget(game, hero, [{ card: lowerAtkWall }]), null,
    'the 2000 DEF wall has only 800 ATK, so Skyscraper does not increase Sparkman ATK');
});

test('Skyscraper position planning can move an old Defense Position HERO to Attack without mutating it', () => {
  const game = duel();
  const hero = place(game, '20721928', 'opponent', 'defense');
  place(game, '97590747', 'player');
  activeField(game, '63035430');
  assert.equal(chooseAIMonsterPosition(game, hero), 'attack');
  assert.equal(hero.position, 'defense');
  assert.equal(hero.getAtk(), 1600);
});

test('Skyscraper source removal, effect negation and opposing Set sources change combat choices without private reads', () => {
  const game = duel();
  const hero = place(game, '20721928');
  const entry = { card: place(game, '97590747', 'player'), zoneIndex: 0 };
  const field = activeField(game, '63035430', 'player');
  assert.equal(chooseAIAttackTarget(game, hero, [entry]), entry);
  field.effectNegated = true;
  assert.equal(chooseAIAttackTarget(game, hero, [entry]), null);
  field.effectNegated = false;
  game.field.sendToGraveyard(field, 'player');
  assert.equal(chooseAIAttackTarget(game, hero, [entry]), null);
  game.field.playerFieldSpellZone = opaqueSet();
  assert.equal(chooseAIAttackTarget(game, hero, [entry]), null);
  assert.ok(scoreAIFieldSpell(game, local('63035430')) > 0);
});

test('AI counts the two public Skyscrapers and declines replacing its resolved copy with a duplicate', () => {
  const game = duel();
  const hero = place(game, '20721928');
  const entry = { card: place(game, '89631139', 'player'), zoneIndex: 0 };
  activeField(game, '63035430', 'player');
  assert.equal(chooseAIAttackTarget(game, hero, [entry]), null);
  assert.ok(scoreAIFieldSpell(game, local('63035430')) > 0, 'a second public source gives a useful 2000 ATK calculation increase');
  activeField(game, '63035430');
  assert.equal(chooseAIAttackTarget(game, hero, [entry]), entry);
  assert.equal(scoreAIFieldSpell(game, local('63035430')), 0);
  assert.equal(hero.getAtk(), 1600);
});

test('Sanctuary is valued by prevented Fairy battle damage, including an opposing Fairy protected from AI damage', () => {
  const game = duel();
  const fairy = place(game, '39552864');
  const foe = place(game, '97590747', 'player');
  const source = local('56433456');
  assert.ok(scoreAIFieldSpell(game, source) > 0);
  const active = activeField(game, '56433456');
  const outcome = calculateBattleOutcome(foe, fairy, game.defense, { fieldSpells: [active] });
  assert.equal(outcome.defenderDamage, 0);
  assert.equal(outcome.defenderDestroyed, true, 'damage prevention does not protect a monster from destruction');
  assert.equal(fairy.getAtk(), 500);
  assert.equal(fairy.getDef(), 500);

  const enemyFairyGame = duel();
  place(enemyFairyGame, '97590747');
  place(enemyFairyGame, '39552864', 'player');
  assert.ok(scoreAIFieldSpell(enemyFairyGame, local('56433456')) < 0,
    'an opposing Fairy losing the battle would otherwise take damage');
});

test('Ancient Forest declines revealing an own defender and grants no Man-Eater Bug Flip effect value', () => {
  const game = duel();
  const elf = place(game, '15025844', 'opponent', 'defense');
  const bug = place(game, '54652250', 'opponent', 'defense', 1);
  bug.isSetFaceDown = true;
  place(game, '97590747', 'player');
  const before = { elfAtk: elf.getAtk(), elfDef: elf.getDef(), elfPosition: elf.position,
    bugFaceDown: bug.isSetFaceDown, bugPosition: bug.position };
  assert.ok(scoreAIFieldSpell(game, local('87624166')) < 0);
  assert.deepEqual({ elfAtk: elf.getAtk(), elfDef: elf.getDef(), elfPosition: elf.position,
    bugFaceDown: bug.isSetFaceDown, bugPosition: bug.position }, before);
});

test('Ancient Forest makes an AI monster decline a low-value attack that would destroy its own attacker in the End Step', () => {
  const game = duel();
  const attacker = place(game, '89631139');
  const entry = { card: place(game, '26202165', 'player'), zoneIndex: 0 };
  assert.equal(chooseAIAttackTarget(game, attacker, [entry]), entry);
  const forest = activeField(game, '87624166', 'player');
  assert.equal(chooseAIAttackTarget(game, attacker, [entry]), null);
  forest.effectNegated = true;
  assert.equal(chooseAIAttackTarget(game, attacker, [entry]), entry);
});

test('Ancient Forest adds no second destruction cost to an equal-ATK battle that already destroys both monsters', () => {
  const game = duel();
  const attacker = place(game, '97590747');
  const entry = { card: place(game, '97590747', 'player'), zoneIndex: 0 };
  activeField(game, '87624166');
  assert.equal(chooseAIAttackTarget(game, attacker, [entry]), entry);
});

test('advanced scoring uses only public board cards and own hand, preserving opaque enemy monsters, Fields and private piles', () => {
  const game = duel();
  place(game, '20721928');
  place(game, '97590747', 'player');
  game.field.playerMonsterZones[1] = opaqueSet();
  game.field.extraMonsterZones[1] = { controllerId: 'player', card: opaqueSet() };
  game.field.playerFieldSpellZone = opaqueSet();
  game.opponentHand = [local('68638985'), local('39552864')];
  for (const key of ['playerHand', 'playerDeck', 'playerExtraDeck', 'playerSpells', 'opponentDeck']) {
    Object.defineProperty(game, key, { get: () => assert.fail(`AI inspected private pile ${key}`) });
  }
  game.getSideState = () => assert.fail('AI gathered a complete side state');
  game.getMonsterEntries = () => assert.fail('AI gathered complete monster state');
  game.getFieldSpellForSide = side => {
    assert.equal(side, 'opponent', 'the opposing source comes only from its public Field Zone');
    return game.field.opponentFieldSpellZone;
  };
  for (const id of ['2084239', '63035430', '56433456', '87624166']) {
    assert.equal(Number.isFinite(scoreAIFieldSpell(game, local(id))), true);
  }
});

for (const difficulty of ['normal', 'hard']) {
  test(`${difficulty} AI executes its winning Skyscraper attack through the real Battle Phase`, async () => {
    const game = duel(difficulty);
    const hero = place(game, '20721928');
    const target = place(game, '97590747', 'player');
    activeField(game, '63035430');
    game.phases.currentPhase = 'battle';
    game.phases.setBattleStep('battle_step');
    await game.runAIBattlePhase();
    assert.ok(game.playerGraveyard.includes(target));
    assert.equal(hero.location, 'monster_zone');
    assert.equal(hero.attacksCompletedThisTurn, 1);
    assert.equal(hero.getAtk(), 1600);
    assert.equal(game.playerLP, 7200);
  });

  for (const id of ['2084239', '63035430', '56433456', '87624166']) {
    test(`${difficulty} AI activates useful ${id} through the real Field Spell Chain`, async () => {
      const game = duel(difficulty);
      if (id === '2084239') {
        game.opponentHand.push(local('68638985'));
        place(game, '97590747', 'player');
      } else if (id === '63035430') {
        place(game, '20721928');
        place(game, '97590747', 'player');
      } else if (id === '56433456') {
        place(game, '39552864').turnSummoned = game.turnCount;
        place(game, '97590747', 'player');
      } else {
        place(game, '68638985');
        place(game, '66602787', 'player', 'defense');
      }
      const field = local(id);
      game.opponentHand.push(field);
      assert.ok(scoreAIFieldSpell(game, field) > 0, `${id} helps the actual fixture`);
      let chains = 0;
      game.callbacks.onAnimation = event => {
        if (event.type === 'chain-pop' && event.card === field) {
          chains++;
          assert.equal(hasResolvedFieldSpellActivation(field), false);
        }
      };
      await game.runAIMainPhase();
      assert.equal(chains, 1);
      assert.equal(game.opponentFieldSpell, field);
      assert.equal(hasResolvedFieldSpellActivation(field), true);
      assert.equal(game.opponentHand.includes(field), false);
      if (id === '2084239') {
        const slime = game.opponentMonsters.find(card => String(card?.id) === '68638985');
        assert.ok(slime, 'the credited future Slime was actually summoned');
        assert.equal(slime.position, 'attack');
        assert.equal(slime.isSetFaceDown, false);
        assert.equal(slime.getAtk(), 1900);
      }
      if (id === '87624166') assert.equal(game.playerMonsters[0].position, 'attack');
    });
  }

  test(`${difficulty} AI preserves useful Wetlands instead of replacing it with a harmful scripted Field`, async () => {
    const game = duel(difficulty);
    const slime = place(game, '68638985');
    place(game, '97590747', 'player');
    const current = activeField(game, '2084239');
    const replacement = local('87624166');
    game.opponentHand.push(replacement);
    assert.ok(scoreAIFieldSpell(game, replacement) < 0);
    await game.runAIMainPhase();
    assert.equal(game.opponentFieldSpell, current);
    assert.ok(game.opponentHand.includes(replacement));
    assert.equal(slime.getAtk(), 1900);
    assert.equal(slime.position, 'attack');
  });
}
