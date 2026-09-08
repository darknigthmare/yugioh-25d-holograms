import test from 'node:test';
import assert from 'node:assert/strict';
import { ChainEngine } from '../src/core/ChainEngine.js';
import { EffectEngine } from '../src/core/EffectEngine.js';
import { GameStateStabilizer } from '../src/core/GameStateStabilizer.js';
import { FieldState } from '../src/core/FieldState.js';
import { CardState } from '../src/core/CardState.js';
import { PSCTParser } from '../src/core/PSCTParser.js';

function card(overrides = {}) {
  return new CardState({
    id: '100', uid: 'test-monster', name: 'Test monster', card_type: 'monster',
    type: 'Effect Monster', race: 'Warrior', atk: 1000, def: 1000, level: 4,
    ...overrides
  });
}

function gameState() {
  return {
    field: new FieldState(), playerLP: 8000, opponentLP: 8000,
    playerHand: [], opponentHand: [], winner: null
  };
}

test('database race identifies Counter Traps and Quick-Play Spells at their correct speeds', () => {
  const chain = new ChainEngine();
  const quick = card({ card_type: 'spell', type: 'Spell Card', race: 'Quick-Play' });
  const counter = card({ card_type: 'trap', type: 'Trap Card', race: 'Counter' });
  assert.equal(chain.getSpellSpeed(quick), 2);
  assert.equal(chain.getSpellSpeed(counter), 3);
  assert.equal(chain.canChain(quick, 3), false);
  assert.equal(chain.canChain(counter, 3), true);
});

test('no fast-effect response is legal while a chain is resolving', () => {
  const chain = new ChainEngine();
  chain.chainStatus = 'resolving';
  assert.equal(chain.canChain(card({ card_type: 'trap', type: 'Counter Trap' }), 1), false);
});

test('priority requires two different players passing in a live response window', () => {
  const chain = new ChainEngine();
  assert.equal(chain.passPriority(null), false);
  chain.openResponseWindow('opponent');
  assert.equal(chain.passPriority('player'), false);
  assert.equal(chain.passPriority('opponent'), false);
  assert.equal(chain.passPriority('opponent'), false);
  assert.equal(chain.passPriority('player'), true);
  assert.equal(chain.priorityPlayerId, null);
  assert.equal(chain.passPriority(null), false);
});

test('a Trigger Effect can declare speed 1 even on a monster that also has a Quick Effect', () => {
  const chain = new ChainEngine();
  const stardust = card({ id: '44508094' });
  const trigger = chain.pushChainLink('player', stardust, [], { spellSpeed: 1 });
  assert.equal(trigger.spellSpeed, 1);
});

test('normal spells still resolve after destruction but persistent spells require their source', () => {
  for (const [race, requiresSource] of [['Normal', false], ['Quick-Play', false], ['Continuous', true], ['Equip', true], ['Field', true]]) {
    const chain = new ChainEngine();
    const spell = card({ card_type: 'spell', type: 'Spell Card', race });
    spell.location = race === 'Field' ? 'field_zone' : 'spell_zone';
    const link = chain.pushChainLink('player', spell);
    assert.equal(chain.canResolveLink(link), true);
    spell.resetForZoneChange('graveyard');
    spell.location = 'graveyard';
    assert.equal(chain.canResolveLink(link), !requiresSource, race);
  }
});

test('leaving and returning does not restore a Continuous card activation instance', () => {
  const chain = new ChainEngine();
  const spell = card({ card_type: 'spell', type: 'Continuous Spell' });
  spell.location = 'spell_zone';
  const link = chain.pushChainLink('player', spell);
  spell.refreshRuntimeIdentity();
  assert.equal(chain.isSourceStillSameInstance(link), false);
  assert.equal(chain.canResolveLink(link), false);
});

test('Pendulum source requirement survives clearing the scale flag on a zone change', () => {
  const chain = new ChainEngine();
  const scale = card({ type: 'Pendulum Effect Monster' });
  scale.location = 'spell_zone';
  scale.isPendulumScale = true;
  const link = chain.pushChainLink('player', scale);
  scale.resetForZoneChange('extra_deck');
  scale.location = 'extra_deck';
  assert.equal(scale.isPendulumScale, false);
  assert.equal(chain.requiresFaceUpSource(link), true);
  assert.equal(chain.canResolveLink(link), false);
});

test('a pending Pendulum activation already requires its exact face-up source instance', () => {
  const chain = new ChainEngine();
  const scale = card({ type: 'Pendulum Effect Monster' });
  scale.location = 'spell_zone';
  scale.isPendingPendulumActivation = true;
  const link = chain.pushChainLink('player', scale);
  scale.resetForZoneChange('graveyard');
  scale.location = 'spell_zone';
  assert.equal(chain.requiresFaceUpSource(link), true);
  assert.equal(chain.canResolveLink(link), false);
});

test('Continuous Trap graveyard effects do not require the trap to remain on the field', () => {
  const chain = new ChainEngine();
  const trap = card({ card_type: 'trap', type: 'Continuous Trap' });
  trap.location = 'graveyard';
  const link = chain.pushChainLink('player', trap);
  trap.resetForZoneChange('banished');
  trap.location = 'banished';
  assert.equal(chain.canResolveLink(link), true);
});

test('chain target snapshots preserve the activation instance after the card leaves', () => {
  const chain = new ChainEngine();
  const source = card();
  const target = card({ uid: 'target' });
  target.location = 'monster_zone';
  const link = chain.pushChainLink('player', source, [target]);
  const targetInstance = target.runtimeInstanceId;
  target.resetForZoneChange('graveyard');
  assert.equal(link.targetInstances[0].runtimeInstanceId, targetInstance);
  assert.notEqual(link.targetInstances[0].runtimeInstanceId, target.runtimeInstanceId);
});

test('AND resolves neither component when a required component is unavailable', () => {
  const effects = new EffectEngine();
  const applied = [];
  const resolveA = () => { applied.push('A'); return true; };
  const resolveB = () => { applied.push('B'); return true; };
  assert.equal(effects.resolveConjunction('AND', resolveA, resolveB, {
    canResolveA: () => true, canResolveB: () => false
  }), false);
  assert.deepEqual(applied, []);
  assert.throws(() => effects.resolveConjunction('AND', resolveA, resolveB), /preflight/);
  assert.deepEqual(applied, []);
  assert.equal(effects.resolveConjunction('AND', resolveA, resolveB, {
    canResolveA: () => true, canResolveB: () => true
  }), true);
  assert.deepEqual(applied, ['A', 'B']);
});

test('THEN and AND_IF_YOU_DO retain a successful first part when the second cannot apply', () => {
  const effects = new EffectEngine();
  for (const conjunction of ['THEN', 'AND_IF_YOU_DO']) {
    let secondAttempts = 0;
    const second = () => { secondAttempts += 1; return false; };
    assert.equal(effects.resolveConjunction(conjunction, () => true, second), true);
    assert.equal(secondAttempts, 1);
    assert.equal(effects.resolveConjunction(conjunction, () => false, second), false);
    assert.equal(secondAttempts, 1);
  }
  assert.equal(effects.resolveConjunction('ALSO', () => false, () => true), true);
});

test('hard once-per-turn and once-per-duel limits belong to each player and effect', () => {
  const effects = new EffectEngine();
  const playerEffect = { playerId: 'player', effectId: 'search' };
  effects.registerHOPT('123', 2, playerEffect);
  assert.equal(effects.hasUsedHOPT('123', 2, playerEffect), true);
  assert.equal(effects.hasUsedHOPT('123', 3, playerEffect), false);
  assert.equal(effects.hasUsedHOPT('123', 2, { playerId: 'opponent', effectId: 'search' }), false);
  assert.equal(effects.hasUsedHOPT('123', 2, { playerId: 'player', effectId: 'summon' }), false);
  effects.registerOncePerDuel('123', playerEffect);
  assert.equal(effects.hasUsedOncePerDuel('123', playerEffect), true);
  assert.equal(effects.hasUsedOncePerDuel('123', { playerId: 'opponent', effectId: 'search' }), false);
});

test('Extra Zone monsters receive modifiers and retain external bonuses through effect negation', () => {
  const game = gameState();
  const monster = card({ type: 'Synchro Monster' });
  game.field.setExtraMonsterZone(0, 'player', monster);
  monster.effectNegated = true;
  monster.applyModifier({ sourceCardId: 'external', type: 'atk', value: 500 });
  monster.applyModifier({ sourceCardId: monster.uid, type: 'atk', value: 800, requiresSourceEffectActive: true });
  new GameStateStabilizer().stabilize(game);
  assert.equal(monster.currentAtk, 1500);
  assert.equal(monster.getAtk(), 1500);
});

test('face-down monsters do not apply their own continuous effects', () => {
  const game = gameState();
  const girl = card({ id: '38033121', atk: 2000 });
  game.field.setMonsterZone('player', 0, girl);
  girl.isSetFaceDown = true;
  game.field.playerGraveyard.push(card({ id: '46986414' }));
  const stabilizer = new GameStateStabilizer();
  stabilizer.stabilize(game);
  assert.equal(girl.getAtk(), 2000);
  girl.isSetFaceDown = false;
  stabilizer.stabilize(game);
  assert.equal(girl.getAtk(), 2300);
});

test('Link position cleanup applies in the shared Extra Monster Zones', () => {
  const game = gameState();
  const link = card({ type: 'Link Monster' });
  game.field.setExtraMonsterZone(0, 'player', link);
  link.position = 'defense';
  link.isSetFaceDown = true;
  assert.equal(new GameStateStabilizer().stabilize(game).stable, true);
  assert.equal(link.position, 'attack');
  assert.equal(link.isSetFaceDown, false);
});

test('Exodia supports canonical numeric IDs and never overwrites an LP defeat', () => {
  const game = gameState();
  game.playerHand = [33396948, 7902349, 44519536, 15303296, 70903634].map(id => card({ id }));
  const stabilizer = new GameStateStabilizer();
  stabilizer.verifyWinConditions(game);
  assert.equal(game.winner, 'player');
  game.winner = null;
  game.playerLP = 0;
  let callbacks = 0;
  game.callbacks = { onGameOver: () => { callbacks += 1; } };
  stabilizer.verifyWinConditions(game);
  assert.equal(game.winner, 'opponent');
  assert.equal(callbacks, 1);
});

test('unstable game-state cleanup returns a bounded failure rather than claiming convergence', () => {
  const game = gameState();
  const stabilizer = new GameStateStabilizer();
  stabilizer.recalculateContinuousState = () => {};
  stabilizer.performRuleCleanup = () => { game.playerLP = game.playerLP === 8000 ? 7000 : 8000; };
  const outcome = stabilizer.stabilize(game);
  assert.equal(outcome.stable, false);
  assert.equal(outcome.reason, 'repeated-state');
  assert.equal(outcome.passes, 2);
});

test('Exodia waits for the current effect to finish, while LP defeat remains immediate', () => {
  const game = gameState();
  game.playerHand = [33396948, 7902349, 44519536, 15303296, 70903634].map(id => card({ id }));
  const stabilizer = new GameStateStabilizer();
  game.isResolvingEffect = true;
  stabilizer.verifyWinConditions(game);
  assert.equal(game.winner, null);
  const fifthPiece = game.playerHand.pop();
  game.isResolvingEffect = false;
  stabilizer.verifyWinConditions(game);
  assert.equal(game.winner, null);
  game.playerHand.push(fifthPiece);
  stabilizer.verifyWinConditions(game);
  assert.equal(game.winner, 'player');
  game.winner = null;
  game.isResolvingEffect = true;
  game.playerLP = 0;
  stabilizer.verifyWinConditions(game);
  assert.equal(game.winner, 'opponent');
});

test('PSCT conjunction parsing recognizes complete words and non-overlapping phrases', () => {
  assert.deepEqual(PSCTParser.parseConjunctions('Return that target to the hand.'), []);
  assert.deepEqual(PSCTParser.parseConjunctions('Destroy that card, and if you do, draw 1 card, also, after that, discard 1 card.')
    .map(entry => entry.type), ['AND_IF_YOU_DO', 'ALSO_AFTER_THAT']);
  assert.deepEqual(PSCTParser.parseConjunctions('Détruisez la cible, et si vous le faites, piochez 1 carte, et aussi, après cela, défaussez 1 carte.')
    .map(entry => entry.type), ['AND_IF_YOU_DO', 'ALSO_AFTER_THAT']);
});

test('ALSO_AFTER_THAT attempts its independent second part even when the first fails', () => {
  const order = [];
  const effects = new EffectEngine();
  assert.equal(effects.resolveConjunction('ALSO_AFTER_THAT', () => {
    order.push('A');
    return false;
  }, () => {
    order.push('B');
    return true;
  }), true);
  assert.deepEqual(order, ['A', 'B']);
});
