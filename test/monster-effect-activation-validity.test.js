import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { CardState } from '../src/core/CardState.js';
import { DuelGame } from '../src/game.js';
import { chooseAIResponseTarget } from '../src/content/AIResponsePolicy.js';

// Junk Synchron's official supplement explicitly discusses effects activated
// by its revived monster: activation remains legal although the effect is
// negated. Arcanite's supplement identifies removing a Spell Counter as cost.
// https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=7687&request_locale=ja
// https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=8038&request_locale=ja

function local(id, side, uid = `${id}-${side}`) {
  const template = [...STARTER_CARDS, ...EXTRA_DECK_CARDS]
    .find(value => String(value.id) === id);
  assert.ok(template, `missing supported card ${id}`);
  const card = new CardState({ ...template, uid });
  card.ownerId = card.controllerId = side;
  return card;
}

function duel(side = 'player', callbacks = {}) {
  const game = new DuelGame(callbacks);
  game.phases.currentTurnOwner = side;
  game.phases.turnCount = 2;
  game.phases.currentPhase = 'main1';
  game.delay = async () => true;
  game.scheduleAction = () => 0;
  return game;
}

async function reviveTimeWizard(game, side) {
  const wizard = local('71625222', side);
  const junk = local('63977008', side);
  game.field.sendToGraveyard(wizard, side);
  game.field.setMonsterZone(side, 0, junk);
  junk.summonType = 'normal';
  await game.resolveSummonSuccessEvent(junk, side, 0, { summonType: 'normal' });
  assert.equal(wizard.location, 'monster_zone');
  assert.equal(wizard.effectNegated, true);
  return wizard;
}

for (const side of ['player', 'opponent']) {
  test(`Junk-revived Time Wizard remains an available legal ignition effect (${side})`, async () => {
    const game = duel(side);
    const wizard = await reviveTimeWizard(game, side);
    assert.ok(game.getAvailableActions(side).monsterEffects.some(action => action.cardUid === wizard.uid));
  });

  test(`Junk-revived Time Wizard activates and consumes its once-per-turn use without applying its negated effect (${side})`, async () => {
    const decisions = [];
    const activations = [];
    const game = duel(side, {
      onDecision: request => { decisions.push(request.type); },
      onChainOpportunity: request => {
        if (String(request.lastLink?.sourceCard?.id) === '71625222') activations.push(request.lastLink);
        return null;
      }
    });
    const wizard = await reviveTimeWizard(game, side);
    const other = game.getOpponentSide(side);
    const target = local('46986414', other);
    game.field.setMonsterZone(other, 0, target);

    assert.equal(await game.activateMonsterEffect(wizard.zoneIndex, side), true);
    assert.ok(activations.length > 0, 'negation of the effect does not prevent a response window');
    assert.equal(wizard.effectUsage.timeWizardTurn, game.turnCount);
    assert.equal(decisions.includes('coin-call'), false, 'the negated resolution does not toss a coin');
    assert.equal(game.field.getMonsterZone(other, 0), target);
    assert.equal(game.playerLP, 8000);
    assert.equal(game.opponentLP, 8000);
    assert.equal(await game.activateMonsterEffect(wizard.zoneIndex, side), false, 'a negated effect still uses the once-per-turn activation');
  });
}

function arcaniteSetup(callbacks = {}) {
  const game = duel('player', callbacks);
  const source = local('31924889', 'player');
  const target = local('46986414', 'opponent');
  game.field.setMonsterZone('player', 0, source);
  game.field.setMonsterZone('opponent', 0, target);
  source.addCounter('spell', 1);
  return { game, source, target };
}

test('Arcanite cancels before activation when its last Spell Counter disappears during target selection', async () => {
  let source;
  const fixture = arcaniteSetup({ onDecision: request => {
    if (request.type === 'select-arcanite-target') source.removeCounter('spell', 1);
  } });
  source = fixture.source;
  const { game, target } = fixture;

  assert.equal(await game.activateMonsterEffect(0), false);
  assert.equal(game.field.getMonsterZone('opponent', 0), target, 'destruction cannot be activated without paying its cost');
  assert.equal(source.counters.spell, 0);
  assert.equal(game.chain.chainStack.length, 0);
});

test('Arcanite cannot commit an old ignition selection onto a returned new instance of its source', async () => {
  let game;
  let source;
  let replaced = false;
  const fixture = arcaniteSetup({ onDecision: request => {
    if (request.type === 'select-arcanite-target' && !replaced) {
      replaced = true;
      game.field.sendToGraveyard(source, 'player');
      game.field.setMonsterZone('player', 0, source);
      source.addCounter('spell', 1);
    }
  } });
  ({ game, source } = fixture);
  const oldInstance = source.runtimeInstanceId;

  assert.equal(await game.activateMonsterEffect(0), false);
  assert.notEqual(source.runtimeInstanceId, oldInstance);
  assert.equal(game.field.getMonsterZone('opponent', 0), fixture.target);
  assert.equal(source.counters.spell, 1, 'the new source instance must not pay an obsolete activation cost');
});

test('Arcanite cancels before paying cost when the chosen enemy has left and returned during selection', async () => {
  let game;
  let target;
  let replaced = false;
  const fixture = arcaniteSetup({ onDecision: request => {
    if (request.type === 'select-arcanite-target' && !replaced) {
      replaced = true;
      game.field.sendToGraveyard(target, 'opponent');
      game.field.setMonsterZone('opponent', 0, target);
    }
  } });
  ({ game, target } = fixture);
  const oldInstance = target.runtimeInstanceId;

  assert.equal(await game.activateMonsterEffect(0), false);
  assert.notEqual(target.runtimeInstanceId, oldInstance);
  assert.equal(game.field.getMonsterZone('opponent', 0), target);
  assert.equal(fixture.source.counters.spell, 1);
});

test('AI Arcanite targets a public threat without consulting a Set enemy monster ATK', async () => {
  const game = duel('opponent');
  game.callbacks.onDecision = request => chooseAIResponseTarget(game, request);
  const source = local('31924889', 'opponent');
  const visible = local('46986414', 'player', 'public-target');
  const hidden = local('89631139', 'player', 'private-target');
  game.field.setMonsterZone('opponent', 0, source);
  game.field.setMonsterZone('player', 0, visible);
  game.field.setMonsterZone('player', 1, hidden);
  source.addCounter('spell', 1);
  hidden.isSetFaceDown = true;
  hidden.position = 'defense';

  // Permit internal state stabilization to know the actual printed statistics;
  // only the decision path, including its precomputed fallback, must not read
  // the opposing Set card's private statistics.
  let selectingTarget = false;
  const chooseCard = game.chooseCard.bind(game);
  game.chooseCard = async (...args) => {
    if (args[0] !== 'select-arcanite-target') return chooseCard(...args);
    selectingTarget = true;
    try { return await chooseCard(...args); }
    finally { selectingTarget = false; }
  };
  const getAtk = hidden.getAtk.bind(hidden);
  hidden.getAtk = () => {
    assert.equal(selectingTarget, false, 'AI consulted the ATK of an opposing Set monster');
    return getAtk();
  };

  assert.equal(await game.tryAIMonsterEffects(1), 1);
  assert.ok(game.playerGraveyard.includes(visible));
  assert.equal(game.field.getMonsterZone('player', 1), hidden);
  assert.equal(source.counters.spell, 0);
});
