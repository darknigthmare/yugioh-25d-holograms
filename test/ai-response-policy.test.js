import assert from 'node:assert/strict';
import test from 'node:test';

import { EXTRA_DECK_CARDS, STARTER_CARDS } from '../src/cards.js';
import { chooseAIChainResponse, chooseAIResponseTarget } from '../src/content/AIResponsePolicy.js';
import { CardState } from '../src/core/CardState.js';
import { DuelGame } from '../src/game.js';

function local(id, side = 'player', uid = `${id}-${side}`) {
  const card = new CardState({
    ...[...STARTER_CARDS, ...EXTRA_DECK_CARDS].find(template => template.id === id), uid
  });
  card.ownerId = side;
  card.controllerId = side;
  card.location = 'hand';
  return card;
}

function duel(difficulty = 'normal') {
  const game = new DuelGame({}, { aiDifficulty: difficulty });
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  game.startPhaseFlow = () => {};
  game.callbacks.onChainOpportunity = request => chooseAIChainResponse(game, request);
  game.callbacks.onDecision = request => chooseAIResponseTarget(game, request);
  return game;
}

function setSpell(game, id, side = 'opponent', zoneIndex = 0, uid) {
  const card = local(id, side, uid);
  game.field.setSpellZone(side, zoneIndex, card);
  card.isSetFaceDown = true;
  card.turnSet = 1;
  return card;
}

test('normal AI uses Book on the actual attacker and stops its attack through the real chain', async () => {
  const game = duel();
  game.phases.currentPhase = 'battle';
  const stronger = local('89631139');
  const attacker = local('91152256');
  game.field.setMonsterZone('player', 0, stronger);
  game.field.setMonsterZone('player', 1, attacker);
  const book = setSpell(game, '14087893');

  const outcome = await game.executeAttack(1, null);

  assert.equal(outcome.attackerStillValid, false);
  assert.equal(attacker.isSetFaceDown, true);
  assert.equal(attacker.position, 'defense');
  assert.equal(stronger.isSetFaceDown, false);
  assert.equal(game.opponentLP, 8000);
  assert.equal(book.location, 'graveyard');
});

test('AI can respond with Book after Monster Reborn completes its chain', async () => {
  const game = duel();
  const monster = local('71625222');
  game.field.sendToGraveyard(monster, 'player');
  const reborn = local('83764718');
  game.playerHand.push(reborn);
  setSpell(game, '14087893');

  assert.equal(await game.playSpellTrap(reborn.uid, 0), true);
  assert.equal(monster.location, 'monster_zone');
  assert.equal(monster.isSetFaceDown, true);
  assert.deepEqual(game.getAvailableActions('player').monsterEffects, []);
});

test('AI MST destroys the opposing Field Spell through its activation chain', async () => {
  const game = duel();
  const fieldSpell = local('86318356');
  game.playerHand.push(fieldSpell);
  const mst = setSpell(game, '05318639');

  await game.activateFieldSpellFromHand(fieldSpell.uid, 'player');

  assert.equal(fieldSpell.location, 'graveyard');
  assert.equal(game.getFieldSpellForSide('player'), null);
  assert.equal(mst.location, 'graveyard');
});

test('AI preserves MST instead of treating destruction of Raigeki as negation', async () => {
  const game = duel();
  const monster = local('91152256', 'opponent');
  game.field.setMonsterZone('opponent', 0, monster);
  const mst = setSpell(game, '05318639');
  const raigeki = local('12580477');
  game.playerHand.push(raigeki);

  await game.playSpellTrap(raigeki.uid, 0);

  assert.equal(monster.location, 'graveyard');
  assert.equal(mst.isSetFaceDown, true);
  assert.equal(mst.location, 'spell_zone');
});

test('AI Stardust negates a public destruction effect that threatens its monsters', async () => {
  const game = duel();
  const stardust = local('44508094', 'opponent');
  const protectedMonster = local('91152256', 'opponent');
  game.field.setMonsterZone('opponent', 0, stardust);
  game.field.setMonsterZone('opponent', 1, protectedMonster);
  const raigeki = local('12580477');
  game.playerHand.push(raigeki);

  await game.playSpellTrap(raigeki.uid, 0);

  assert.equal(stardust.location, 'graveyard');
  assert.equal(stardust.stardustReturnEligibleTurn, 2);
  assert.equal(protectedMonster.location, 'monster_zone');
  assert.equal(raigeki.location, 'graveyard');
});

test('easy AI passes the same legal defensive Book opportunity', async () => {
  const game = duel('easy');
  game.phases.currentPhase = 'battle';
  const attacker = local('91152256');
  game.field.setMonsterZone('player', 0, attacker);
  const book = setSpell(game, '14087893');

  await game.executeAttack(0, null);

  assert.equal(attacker.isSetFaceDown, false);
  assert.equal(game.opponentLP, 6600);
  assert.equal(book.isSetFaceDown, true);
});

test('main-phase target choices cancel self-targets and preserve unrelated decision fallbacks', async () => {
  const game = duel();
  const ownMonster = local('91152256', 'opponent');
  game.field.setMonsterZone('opponent', 0, ownMonster);
  const book = local('14087893', 'opponent');
  game.opponentHand.push(book);
  assert.equal(await game.prepareSpellActivationContext(book, 'opponent'), null);
  assert.equal(chooseAIResponseTarget(game, { side: 'opponent', type: 'select-summon-position' }), undefined);
  assert.equal(chooseAIResponseTarget(game, { side: 'player', type: 'select-book-of-moon-target' }), undefined);
});

test('MST chooses an opaque Set target without inspecting any hidden identity or stats', async () => {
  const game = duel();
  const hiddenSpell = setSpell(game, '44095762', 'player');
  for (const key of ['id', 'name', 'name_en', 'type', 'race', 'atk', 'def']) {
    Object.defineProperty(hiddenSpell, key, { get: () => assert.fail(`read hidden ${key}`) });
  }
  const hiddenMonster = local('89631139');
  game.field.setMonsterZone('player', 0, hiddenMonster);
  hiddenMonster.isSetFaceDown = true;
  hiddenMonster.getAtk = () => assert.fail('read hidden monster ATK');
  hiddenMonster.getDef = () => assert.fail('read hidden monster DEF');
  const mst = setSpell(game, '05318639');
  const request = {
    side: 'opponent', context: { event: 'PHASE_END', phase: 'main1' },
    candidates: [{ id: mst.id, cardUid: mst.uid }]
  };
  assert.equal(chooseAIChainResponse(game, request), mst.uid);
  const context = await game.prepareSpellActivationContext(mst, 'opponent');
  assert.equal(context.targetCard, hiddenSpell);
});

test('AI does not stack multiple Book copies on an already committed target', () => {
  const game = duel();
  game.phases.currentPhase = 'battle';
  const attacker = local('91152256');
  game.field.setMonsterZone('player', 0, attacker);
  const first = setSpell(game, '14087893', 'opponent', 0, 'book-first');
  const second = setSpell(game, '14087893', 'opponent', 1, 'book-second');
  first.isSetFaceDown = false;
  game.chain.pushChainLink('opponent', first, [attacker]);
  const request = {
    side: 'opponent', lastLink: game.chain.getLastLink(),
    context: { event: 'ATTACK_DECLARED', attackingSide: 'player', attacker },
    candidates: [{ id: second.id, cardUid: second.uid }]
  };
  assert.equal(chooseAIChainResponse(game, request), null);
});

test('AI preserves Book when its Mirror Force is already destroying the attacker', () => {
  const game = duel();
  game.phases.currentPhase = 'battle';
  const attacker = local('91152256');
  game.field.setMonsterZone('player', 0, attacker);
  const mirror = setSpell(game, '44095762');
  const book = setSpell(game, '14087893', 'opponent', 1);
  game.pushMirrorForceChainLink('opponent', mirror, 0, {
    attackingSide: 'player', defendingSide: 'opponent', attacker
  });
  assert.equal(chooseAIChainResponse(game, {
    side: 'opponent', lastLink: game.chain.getLastLink(),
    context: { event: 'ATTACK_DECLARED', attackingSide: 'player', attacker },
    candidates: [{ id: book.id, cardUid: book.uid }]
  }), null);
});

test('a planned AI target that changed zones is cancelled instead of following a new instance', () => {
  const game = duel();
  game.phases.currentPhase = 'battle';
  const attacker = local('91152256');
  game.field.setMonsterZone('player', 0, attacker);
  const book = setSpell(game, '14087893');
  assert.equal(chooseAIChainResponse(game, {
    side: 'opponent', context: { event: 'ATTACK_DECLARED', attackingSide: 'player', attacker },
    candidates: [{ id: book.id, cardUid: book.uid }]
  }), book.uid);
  game.removeCardFromCurrentZone(attacker);
  game.field.setMonsterZone('player', 0, attacker);
  assert.equal(chooseAIResponseTarget(game, {
    side: 'opponent', type: 'select-book-of-moon-target',
    candidates: [{ uid: attacker.uid, location: attacker.location, zoneIndex: 0 }]
  }), null);
});
