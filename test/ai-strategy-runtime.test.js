import assert from 'node:assert/strict';
import test from 'node:test';

import { STARTER_CARDS } from '../src/cards.js';
import { chooseAIChainResponse, chooseAIResponseTarget } from '../src/content/AIResponsePolicy.js';
import { CardState } from '../src/core/CardState.js';
import { hasResolvedFieldSpellActivation } from '../src/core/FieldSpellRules.js';
import { DuelGame } from '../src/game.js';

function local(id, side = 'opponent', uid = `${id}-${side}`, overrides = {}) {
  const template = STARTER_CARDS.find(card => String(card.id) === id);
  assert.ok(template, `missing local card ${id}`);
  const card = new CardState({ ...template, ...overrides, uid });
  card.ownerId = side;
  card.controllerId = side;
  card.location = 'hand';
  return card;
}

function duel(difficulty = 'hard') {
  const animations = [];
  const game = new DuelGame({ onAnimation: animation => animations.push(animation) }, { aiDifficulty: difficulty });
  game.phases.currentTurnOwner = 'opponent';
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  const generation = game._duelGeneration;
  game.delay = async () => game.isDuelGenerationCurrent(generation) && !game._duelEnded;
  // Stop automatic flow at this method's phase boundary; no fake clock or
  // queued turn can accidentally execute a following AI Battle/Draw Phase.
  game.startPhaseFlow = () => {};
  game.opponentExtraDeck = [];
  game.callbacks.onDecision = request => chooseAIResponseTarget(game, request);
  game.callbacks.onChainOpportunity = request => chooseAIChainResponse(game, request);
  return { game, animations };
}

function setMonster(game, id, zone = 0) {
  const source = local(id);
  game.field.setMonsterZone('opponent', zone, source);
  source.position = 'defense';
  source.isSetFaceDown = true;
  source.turnSummoned = 1;
  return source;
}

for (const difficulty of ['normal', 'hard']) {
  for (const id of ['54652250', '31560081']) {
    test(`${difficulty} AI actually Sets ${id} instead of wasting its Flip effect on a Normal Summon`, async () => {
      const { game, animations } = duel(difficulty);
      const source = local(id);
      game.opponentHand.push(source);

      assert.equal(await game.tryAINormalSummon(), true);
      assert.equal(game.opponentMonsters[0], source);
      assert.equal(source.isSetFaceDown, true);
      assert.equal(source.position, 'defense');
      assert.equal(game.summons.normalSummonAllowance.used, 1);
      assert.deepEqual(game.opponentHand, []);
      assert.equal(game.triggers.events.length, 0);
      assert.equal(animations.some(animation => animation.type === 'flip-destroy-cinematic'
        || animation.type === 'spell-recovery-cinematic'), false);
    });
  }
}

test('AI Flip Summons Man-Eater Bug despite its low ATK and resolves destruction of the strongest public enemy', async () => {
  const { game, animations } = duel();
  const bug = setMonster(game, '54652250');
  const weaker = local('46986414', 'player');
  const strongest = local('89631139', 'player');
  game.field.setMonsterZone('player', 0, weaker);
  game.field.setMonsterZone('player', 1, strongest);

  assert.equal(await game.tryAIPositionChanges(), 1);
  assert.equal(bug.isSetFaceDown, false);
  assert.equal(bug.hasChangedPositionThisTurn, true);
  assert.equal(game.opponentMonsters[0], bug);
  assert.equal(game.playerMonsters[0], weaker);
  assert.equal(game.playerMonsters[1], null);
  assert.ok(game.playerGraveyard.includes(strongest));
  assert.ok(animations.some(animation => animation.type === 'flip-destroy-cinematic'
    && animation.targetCard === strongest));
  assert.equal(game.chain.chainStack.length, 0);
});

test('AI keeps Man-Eater Bug Set when every opposing target is legally protected', async () => {
  const { game } = duel();
  const bug = setMonster(game, '54652250');
  const enemy = local('89631139', 'player');
  game.field.setMonsterZone('player', 0, enemy);
  game.defense.addProtection({ card: enemy, cardUid: enemy.uid, type: 'TARGET', independentOfSource: true });

  assert.equal(await game.tryAIPositionChanges(), 0);
  assert.equal(bug.isSetFaceDown, true);
  assert.equal(game.playerMonsters[0], enemy);
  assert.deepEqual(game.opponentGraveyard, []);
});

test('AI Flip Summons Magician of Faith and its mandatory trigger recovers a Spell despite a cancelled target decision', async () => {
  const { game, animations } = duel('normal');
  const faith = setMonster(game, '31560081');
  const spell = local('12580477');
  const unrelatedMonster = local('91152256');
  game.field.sendToGraveyard(unrelatedMonster, 'opponent');
  game.field.sendToGraveyard(spell, 'opponent');
  const oldInstance = spell.runtimeInstanceId;
  game.callbacks.onDecision = request => request.type === 'select-trigger-target' ? null : undefined;

  assert.equal(await game.tryAIPositionChanges(), 1);
  assert.equal(faith.isSetFaceDown, false);
  assert.ok(game.opponentHand.includes(spell));
  assert.ok(!game.opponentGraveyard.includes(spell));
  assert.ok(game.opponentGraveyard.includes(unrelatedMonster));
  assert.notEqual(spell.runtimeInstanceId, oldInstance);
  assert.ok(animations.some(animation => animation.type === 'spell-recovery-cinematic'
    && animation.targetCard === spell));
});

test('runAIMainPhase preserves a stronger board after refusing a costly Tribute instead of executing the legacy fallback', async () => {
  const { game } = duel();
  const first = local('89631139', 'opponent', 'strong-first');
  const second = local('89631139', 'opponent', 'strong-second');
  game.field.setMonsterZone('opponent', 0, first);
  game.field.setMonsterZone('opponent', 1, second);
  const weakerTribute = local('46986414');
  game.opponentHand.push(weakerTribute);

  await game.runAIMainPhase();

  assert.equal(game.opponentMonsters[0], first);
  assert.equal(game.opponentMonsters[1], second);
  assert.deepEqual(game.opponentHand, [weakerTribute]);
  assert.deepEqual(game.opponentGraveyard, []);
  assert.equal(game.summons.normalSummonAllowance.used, 0);
  assert.equal(game.currentPhase, 'battle');
});

test('runAIMainPhase skips a classic Field Spell that would only strengthen the opponent', async () => {
  const { game } = duel();
  const own = local('89631139');
  const enemy = local('91152256', 'player', 'opposing-beast', { race: 'Beast' });
  game.field.setMonsterZone('opponent', 0, own);
  game.field.setMonsterZone('player', 0, enemy);
  const forest = local('87430998');
  game.opponentHand.push(forest);

  await game.runAIMainPhase();

  assert.equal(game.opponentFieldSpell, null);
  assert.ok(game.opponentHand.includes(forest));
  assert.equal(enemy.getAtk(), enemy.baseAtk);
});

test('runAIMainPhase activates and resolves a useful Mountain through the real chain', async () => {
  const { game, animations } = duel();
  const dragon = local('89631139');
  game.field.setMonsterZone('opponent', 0, dragon);
  const mountain = local('50913601');
  game.opponentHand.push(mountain);

  await game.runAIMainPhase();

  assert.equal(game.opponentFieldSpell, mountain);
  assert.equal(hasResolvedFieldSpellActivation(mountain), true);
  assert.equal(dragon.getAtk(), 3200);
  assert.equal(dragon.getDef(), 2700);
  assert.equal(game.opponentHand.includes(mountain), false);
  assert.equal(game.chain.chainStack.length, 0);
  assert.ok(animations.some(animation => animation.type === 'activate' && animation.card === mountain));
});

test('AI hand-limit cleanup discards useless Field Spell copies while preserving the useful last cards', async () => {
  const { game } = duel();
  game.phases.currentPhase = 'end';
  game.field.setMonsterZone('opponent', 0, local('89631139'));
  const forests = ['copy-a', 'copy-b', 'copy-c'].map(uid => local('87430998', 'opponent', uid));
  const useful = ['12580477', '14087893', '89631139', '44095762', '15025844'].map(id => local(id));
  game.opponentHand = [...forests, ...useful];

  assert.equal(await game.checkHandSizeLimit(), true);
  assert.equal(game.opponentHand.length, 6);
  assert.deepEqual(game.opponentGraveyard, forests.slice(0, 2));
  assert.ok(game.opponentHand.includes(forests[2]));
  assert.ok(useful.every(card => game.opponentHand.includes(card)));
  assert.equal(game.isDiscarding, false);
});
