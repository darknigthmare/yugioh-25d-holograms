import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { scoreAIFieldSpell } from '../src/content/AIStrategy.js';
import { chooseAIChainResponse, chooseAIResponseTarget } from '../src/content/AIResponsePolicy.js';
import { CardState } from '../src/core/CardState.js';
import { markFieldSpellResolved, hasResolvedFieldSpellActivation } from '../src/core/FieldSpellRules.js';
import { DuelGame } from '../src/game.js';

let nextUid = 0;
function local(id, side = 'opponent', overrides = {}) {
  const template = [...STARTER_CARDS, ...EXTRA_DECK_CARDS].find(card => String(card.id) === id);
  assert.ok(template, `missing local card ${id}`);
  const card = new CardState({ ...template, ...overrides, uid: `ai-field-${++nextUid}` });
  card.ownerId = card.controllerId = side;
  card.location = 'hand';
  return card;
}

function duel(difficulty = 'hard') {
  const animations = [];
  const game = new DuelGame({ onAnimation: event => animations.push(event) }, { aiDifficulty: difficulty });
  game.phases.currentTurnOwner = 'opponent';
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  const generation = game._duelGeneration;
  game.delay = async () => game.isDuelGenerationCurrent(generation) && !game._duelEnded;
  game.startPhaseFlow = () => {};
  game.scheduleAction = () => 0;
  game.opponentExtraDeck = [];
  game.callbacks.onDecision = request => chooseAIResponseTarget(game, request);
  game.callbacks.onChainOpportunity = request => chooseAIChainResponse(game, request);
  return { game, animations };
}

function place(game, id, side = 'opponent', position = 'attack', overrides = {}) {
  const card = local(id, side, overrides);
  game.field.setMonsterZone(side, 0, card);
  card.position = position;
  card.turnSummoned = 1;
  return card;
}

function activeField(game, id) {
  const field = local(id);
  game.field.placeFieldSpell('opponent', field);
  markFieldSpellResolved(field, 1);
  game.stabilizer.stabilize(game);
  return field;
}

function opaqueOpponentSet() {
  return new Proxy({ isSetFaceDown: true }, { get(target, property) {
    if (property === 'isSetFaceDown') return true;
    assert.fail(`Field Spell strategy read hidden opposing property ${String(property)}`);
  } });
}

test('attribute Field Spell scoring distinguishes an attacking ally from the same ally defending', () => {
  const { game } = duel();
  const own = place(game, '46986414');
  place(game, '89631139', 'player');
  const plasma = local('18161786');
  assert.ok(scoreAIFieldSpell(game, plasma) > 0, '+500 DARK ATK can improve the attack');
  own.position = 'defense';
  assert.ok(scoreAIFieldSpell(game, plasma) < 0, '-400 DARK DEF weakens the defender');
  assert.equal(own.getAtk(), 2500, 'scoring never applies a continuous effect');
  assert.equal(own.getDef(), 2100);
});

test('an attribute Field Spell can help against an opposing defender by reducing its actual DEF', () => {
  const { game } = duel();
  place(game, '46986414');
  const opposingWall = place(game, '89631139', 'player', 'defense');
  assert.ok(scoreAIFieldSpell(game, local('81777047')) > 0,
    '-400 LIGHT DEF breaks the wall while its +500 ATK is not its battle statistic');
  assert.equal(opposingWall.getDef(), 2500);
});

test('Chorus scores only actual defenders and does not grant an attacking monster a DEF benefit', () => {
  const { game } = duel();
  const own = place(game, '89631139');
  const enemy = place(game, '46986414', 'player');
  const chorus = local('81380218');
  assert.equal(scoreAIFieldSpell(game, chorus), 0);
  own.position = 'defense';
  assert.ok(scoreAIFieldSpell(game, chorus) > 0);
  own.position = 'attack';
  enemy.position = 'defense';
  assert.ok(scoreAIFieldSpell(game, chorus) < 0);
});

test('replacing Mountain uses the improvement over its resolved effect, including the DEF loss', () => {
  const { game } = duel();
  const own = place(game, '89631139');
  place(game, '46986414', 'player');
  const mountain = activeField(game, '50913601');
  assert.equal(own.getAtk(), 3200);
  assert.equal(scoreAIFieldSpell(game, local('50913601')), 0, 'a resolved duplicate does not improve the board');
  assert.ok(scoreAIFieldSpell(game, local('81777047')) > 0, 'LIGHT ATK +500 replaces Dragon ATK +200');
  own.position = 'defense';
  assert.ok(scoreAIFieldSpell(game, local('81777047')) < 0, 'LIGHT DEF -400 replaces Dragon DEF +200');
  assert.equal(game.opponentFieldSpell, mountain);
  assert.equal(own.getDef(), 2700);
});

test('Link monsters receive attribute ATK value and never invented DEF or Chorus value', () => {
  const { game } = duel();
  const link = local('77637979');
  game.field.setExtraMonsterZone(0, 'opponent', link);
  assert.equal(link.getDef(), null);
  assert.equal(scoreAIFieldSpell(game, local('81380218')), 0);
  assert.ok(scoreAIFieldSpell(game, local('81777047')) > 0);
  assert.equal(link.getDef(), null);
  assert.equal(link.getAtk(), 1200);
});

test('future Field Spell scoring projects the AI hand monster position without inspecting an opaque enemy', () => {
  const { game } = duel();
  game.field.playerMonsterZones[0] = opaqueOpponentSet();
  game.field.extraMonsterZones[1] = { controllerId: 'player', card: opaqueOpponentSet() };
  game.opponentHand.push(local('97590747')); // The AI's own low-Level DARK monster is a possible future attacker.
  assert.ok(scoreAIFieldSpell(game, local('18161786')) > 0);
  game.opponentHand = [local('15025844')]; // Mystical Elf is projected defending.
  assert.ok(scoreAIFieldSpell(game, local('81380218')) > 0);
  assert.equal(scoreAIFieldSpell(game, local('81777047')), 0,
    'a future defender is not credited for ATK while its DEF falls');
});

test('Field Spell strategy reads no opposing hidden cards or private pile even with future-summon projection', () => {
  const { game } = duel();
  place(game, '89631139');
  game.field.playerMonsterZones[0] = opaqueOpponentSet();
  game.field.extraMonsterZones[1] = { controllerId: 'player', card: opaqueOpponentSet() };
  game.opponentHand.push(local('15025844'));
  for (const property of ['playerHand', 'playerDeck', 'playerExtraDeck', 'playerSpells', 'opponentDeck']) {
    Object.defineProperty(game, property, { get() {
      assert.fail(`Field Spell strategy read private pile ${property}`);
    } });
  }
  game.getSideState = () => assert.fail('Field Spell scoring gathered broad side state');
  game.getMonsterEntries = () => assert.fail('Field Spell scoring gathered broad monster state');
  assert.ok(scoreAIFieldSpell(game, local('81777047')) > 0);
  assert.ok(scoreAIFieldSpell(game, local('81380218')) > 0);
});

for (const difficulty of ['normal', 'hard']) {
  test(`${difficulty} AI resolves useful Luminous Spark through the real activation Chain`, async () => {
    const { game, animations } = duel(difficulty);
    const own = place(game, '89631139');
    place(game, '46986414', 'player');
    const source = local('81777047');
    game.opponentHand.push(source);
    let activationLinks = 0;
    const animate = game.callbacks.onAnimation;
    game.callbacks.onAnimation = event => {
      if (event.type === 'chain-pop' && event.card === source) {
        activationLinks++;
        assert.equal(game.chain.getLastLink().sourceCard, source);
        assert.equal(hasResolvedFieldSpellActivation(source), false);
        game.stabilizer.stabilize(game);
        assert.equal(own.getAtk(), 3000);
        assert.equal(own.getDef(), 2500);
      }
      return animate(event);
    };
    await game.runAIMainPhase();
    assert.equal(activationLinks, 1);
    assert.equal(game.opponentFieldSpell, source);
    assert.equal(hasResolvedFieldSpellActivation(source), true);
    assert.equal(own.getAtk(), 3500);
    assert.equal(own.getDef(), 2100);
    assert.equal(game.opponentHand.includes(source), false);
    assert.equal(game.chain.chainStack.length, 0);
    assert.ok(animations.some(event => event.type === 'activate' && event.card === source));
  });

  test(`${difficulty} AI refuses Gaia Power when it would weaken its surviving defender`, async () => {
    const { game, animations } = duel(difficulty);
    const own = place(game, '13039848', 'opponent', 'defense'); // Giant Soldier of Stone.
    place(game, '89631139', 'player');
    const source = local('56594520');
    game.opponentHand.push(source);
    assert.ok(scoreAIFieldSpell(game, source) < 0);
    await game.runAIMainPhase();
    assert.equal(game.opponentFieldSpell, null);
    assert.ok(game.opponentHand.includes(source));
    assert.equal(own.position, 'defense');
    assert.equal(own.getDef(), 2000);
    assert.equal(animations.some(event => event.type === 'activate' && event.card === source), false);
  });
}

test('AI replaces Mountain with useful Luminous Spark without stacking their old and new bonuses', async () => {
  const { game } = duel();
  const own = place(game, '89631139');
  place(game, '46986414', 'player');
  const previous = activeField(game, '50913601');
  const source = local('81777047');
  game.opponentHand.push(source);
  await game.runAIMainPhase();
  assert.equal(game.opponentFieldSpell, source);
  assert.ok(game.opponentGraveyard.includes(previous));
  assert.equal(own.getAtk(), 3500);
  assert.equal(own.getDef(), 2100);
});

test('AI actually resolves Chorus for a defense-position ally without gaining ATK', async () => {
  const { game } = duel();
  const own = place(game, '15025844', 'opponent', 'defense');
  place(game, '89631139', 'player');
  const source = local('81380218');
  game.opponentHand.push(source);
  await game.runAIMainPhase();
  assert.equal(game.opponentFieldSpell, source);
  assert.equal(own.position, 'defense');
  assert.equal(own.getAtk(), 800);
  assert.equal(own.getDef(), 2500);
});
