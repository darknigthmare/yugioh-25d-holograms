import test from 'node:test';
import assert from 'node:assert/strict';
import { CardState } from '../src/core/CardState.js';
import { DuelGame } from '../src/game.js';

function makeGame(callbacks = {}) {
  const game = new DuelGame(callbacks);
  game.delay = async () => true;
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.phases.currentTurnOwner = 'player';
  return game;
}

function makeCard(uid, overrides = {}) {
  const card = new CardState({
    uid, id: uid, name: uid, name_en: uid, card_type: 'monster',
    type: 'Normal Monster', atk: 1000, def: 1000, level: 4,
    ...overrides
  });
  card.ownerId = 'player';
  card.controllerId = 'player';
  return card;
}

function placeSpell(game, uid, { side = 'player', type = 'Spell Card', id = uid } = {}) {
  const spell = makeCard(uid, { id, type, card_type: 'spell', atk: 0, def: 0, level: 0 });
  spell.ownerId = side;
  spell.controllerId = side;
  const zones = side === 'player' ? game.playerSpells : game.opponentSpells;
  game.field.setSpellZone(side, zones.findIndex(card => card === null), spell);
  return spell;
}

function addExodiaParts(game, count = 5) {
  const ids = ['33396948', '7902349', '44519536', '15303296', '70903634'];
  const cards = ids.slice(0, count).map(id => makeCard(`exodia-${id}`, { id }));
  cards.forEach(card => { card.location = 'hand'; });
  game.playerHand.push(...cards);
  return cards;
}

test('Normal and Quick-Play Spell cards stay on the field until the entire real chain finishes', async () => {
  const game = makeGame();
  const pot = placeSpell(game, 'pot', { id: '55144522' });
  const quick = placeSpell(game, 'quick-response', { side: 'opponent', type: 'Quick-Play Spell' });
  game.playerDeck.push(makeCard('draw-a'), makeCard('draw-b'));
  const observations = [];
  game.chain.pushChainLink('player', pot, [], {
    context: { event: 'card-activation' },
    resolver: async () => {
      observations.push(game.field.getSpellZone('opponent', quick.zoneIndex) === quick);
      const result = await game.executeSpellTrapResolution(pot, 'player', pot.zoneIndex);
      observations.push(game.field.getSpellZone('player', pot.zoneIndex) === pot);
      return result;
    }
  });
  game.chain.pushChainLink('opponent', quick, [], { resolver: async () => true });
  await game.resolveChainStack();
  assert.deepEqual(observations, [true, true]);
  assert.equal(game.playerHand.length, 2);
  assert.ok(game.playerGraveyard.includes(pot));
  assert.ok(game.opponentGraveyard.includes(quick));
  assert.equal(game.chain.chainStatus, 'idle');
});

test('destroying a Continuous Spell in a higher real chain link prevents its effect', async () => {
  const game = makeGame();
  const continuous = placeSpell(game, 'continuous', { type: 'Continuous Spell' });
  const remover = makeCard('remover');
  let applied = false;
  const link = game.chain.pushChainLink('player', continuous, [], {
    context: { event: 'card-activation' },
    resolver: async () => { applied = true; return true; }
  });
  game.chain.pushChainLink('opponent', remover, [], {
    spellSpeed: 2,
    resolver: async () => game.removeCardFromCurrentZone(continuous)
  });
  await game.resolveChainStack();
  assert.equal(applied, false);
  assert.equal(link.appliedAnything, false);
  assert.equal(link.activationNegated, false);
  assert.ok(game.playerGraveyard.includes(continuous));
});

test('destroying a Normal Spell in a higher real chain link does not negate its effect', async () => {
  const game = makeGame();
  const pot = placeSpell(game, 'destroyed-pot', { id: '55144522' });
  game.playerDeck.push(makeCard('draw-c'), makeCard('draw-d'));
  const link = game.chain.pushChainLink('player', pot, [], { context: { event: 'card-activation' } });
  game.chain.pushChainLink('opponent', makeCard('destroyer'), [], {
    spellSpeed: 2,
    resolver: async () => game.removeCardFromCurrentZone(pot)
  });
  await game.resolveChainStack();
  assert.equal(link.appliedAnything, true);
  assert.equal(game.playerHand.length, 2);
  assert.equal(game.playerGraveyard.filter(card => card === pot).length, 1);
});

test('negating an activated effect of an already face-up Continuous card does not remove the card', async () => {
  const game = makeGame();
  const continuous = placeSpell(game, 'already-active', { type: 'Continuous Spell' });
  let applied = false;
  const link = game.chain.pushChainLink('player', continuous, [], {
    context: { event: 'spell-effect' },
    resolver: async () => { applied = true; return true; }
  });
  link.activationNegated = true;
  await game.resolveChainStack();
  assert.equal(applied, false);
  assert.equal(game.playerSpells[0], continuous);
  assert.equal(continuous.location, 'spell_zone');
});

test('negating the activation of a Continuous card itself sends it to the Graveyard', async () => {
  const game = makeGame();
  const continuous = placeSpell(game, 'activation-negated', { type: 'Continuous Spell' });
  const link = game.chain.pushChainLink('player', continuous, [], {
    context: { event: 'card-activation' }, resolver: async () => true
  });
  link.activationNegated = true;
  await game.resolveChainStack();
  assert.equal(game.playerSpells[0], null);
  assert.ok(game.playerGraveyard.includes(continuous));
});

test('chain cleanup cannot remove a source that left and returned as a new instance', async () => {
  const game = makeGame();
  const source = placeSpell(game, 'returned-source');
  const originalInstance = source.runtimeInstanceId;
  let applied = 0;
  game.chain.pushChainLink('player', source, [], {
    resolver: async () => { applied += 1; return true; }
  });
  game.chain.pushChainLink('opponent', makeCard('mover'), [], {
    spellSpeed: 2,
    resolver: async () => {
      game.removeCardFromCurrentZone(source);
      game.field.setSpellZone('player', 0, source);
      source.isSetFaceDown = true;
      return true;
    }
  });
  await game.resolveChainStack();
  assert.equal(applied, 1);
  assert.notEqual(source.runtimeInstanceId, originalInstance);
  assert.equal(game.playerSpells[0], source);
  assert.equal(source.isSetFaceDown, true);
  assert.equal(game.playerGraveyard.includes(source), false);
});

test('Exodia cannot interrupt one resolving effect between adding and discarding its fifth piece', async () => {
  const game = makeGame();
  addExodiaParts(game, 4);
  const fifth = makeCard('fifth-piece', { id: '70903634' });
  let winnerWhileComplete;
  game.chain.pushChainLink('player', makeCard('draw-discard-effect'), [], {
    resolver: async () => {
      fifth.location = 'hand';
      game.playerHand.push(fifth);
      game.stateChanged();
      winnerWhileComplete = game.winner;
      game.playerHand.splice(game.playerHand.indexOf(fifth), 1);
      game.field.sendToGraveyard(fifth, 'player');
      game.stateChanged();
      return true;
    }
  });
  await game.resolveChainStack();
  assert.equal(winnerWhileComplete, null);
  assert.equal(game.winner, null);
  assert.equal(game.isResolvingEffect, false);
});

test('Exodia wins between two real chain links after the completing effect fully finishes', async () => {
  const game = makeGame();
  addExodiaParts(game, 4);
  const fifth = makeCard('final-exodia-piece', { id: '70903634' });
  let lowerLinkApplied = false;
  let completingEffectFinished = false;
  game.chain.pushChainLink('player', makeCard('lower-effect'), [], {
    resolver: async () => { lowerLinkApplied = true; return true; }
  });
  game.chain.pushChainLink('opponent', makeCard('upper-effect'), [], {
    spellSpeed: 2,
    resolver: async () => {
      fifth.location = 'hand';
      game.playerHand.push(fifth);
      game.stateChanged();
      assert.equal(game.winner, null);
      completingEffectFinished = true;
      return true;
    }
  });
  await game.resolveChainStack();
  assert.equal(completingEffectFinished, true);
  assert.equal(lowerLinkApplied, false);
  assert.equal(game.winner, 'player');
  assert.equal(game.endReason, 'exodia');
});

function prepareStardustReturn(game) {
  game.phases.currentPhase = 'end';
  const stardust = makeCard('returning-stardust', {
    id: '44508094', type: 'Synchro Monster', extra_type: 'synchro',
    atk: 2500, def: 2000, level: 8
  });
  game.field.sendToGraveyard(stardust, 'player');
  stardust.wasProperlySpecialSummoned = true;
  stardust.stardustReturnEligibleTurn = game.turnCount;
  stardust.stardustReturnController = 'player';
  stardust.stardustReturnRuntimeInstanceId = stardust.runtimeInstanceId;
  return stardust;
}

test('Stardust End Phase return opens an opponent response window as a speed-1 Trigger Effect', async () => {
  const windows = [];
  const game = makeGame({ onChainOpportunity: request => {
    windows.push({ side: request.side, speed: request.lastLink.spellSpeed, event: request.context.event });
    return null;
  } });
  const stardust = prepareStardustReturn(game);
  const returned = await game.processEndPhaseEffects();
  assert.equal(returned, 1);
  assert.ok(windows.some(window => window.side === 'opponent'
    && window.speed === 1 && window.event === 'stardust-end-phase-return'));
  assert.equal(game.playerGraveyard.includes(stardust), false);
  assert.ok(game.playerMonsters.includes(stardust));
  assert.equal(stardust.summonType, 'stardust-return');
});

test('a real chained response banishing Stardust prevents its End Phase return', async () => {
  let responseUid;
  let responseSelected = false;
  const game = makeGame({ onChainOpportunity: request => {
    const candidate = request.candidates.find(card => card.cardUid === responseUid);
    if (!candidate) return null;
    responseSelected = true;
    return { cardUid: candidate.cardUid };
  } });
  game.rulesMode = 'sandbox';
  const stardust = prepareStardustReturn(game);
  const response = placeSpell(game, 'banish-response', { side: 'opponent', type: 'Quick-Play Spell' });
  responseUid = response.uid;
  response.isSetFaceDown = true;
  response.turnSet = 1;
  const originalResolution = game.executeSpellTrapResolution.bind(game);
  game.executeSpellTrapResolution = async (card, ...args) => {
    if (card !== response) return originalResolution(card, ...args);
    game.field.sendToBanished(stardust, 'player');
    return true;
  };
  assert.equal(await game.processEndPhaseEffects(), 0);
  assert.equal(responseSelected, true);
  assert.ok(game.playerBanished.includes(stardust));
  assert.equal(game.playerMonsters.includes(stardust), false);
  assert.ok(game.opponentGraveyard.includes(response));
  assert.equal(stardust.stardustReturnEligibleTurn, -1);
});

test('a negated Quick-Play card activation is sent away before the lower chain link resolves', async () => {
  let response;
  let negatedLink;
  const game = makeGame({ onChainOpportunity: request => {
    if (request.lastLink.sourceCard === response) {
      request.lastLink.activationNegated = true;
      negatedLink = request.lastLink;
      return null;
    }
    const candidate = request.candidates.find(card => card.cardUid === response?.uid);
    return candidate ? { cardUid: candidate.cardUid } : null;
  } });
  game.rulesMode = 'sandbox';
  response = placeSpell(game, 'negated-quick', { side: 'opponent', type: 'Quick-Play Spell' });
  response.isSetFaceDown = true;
  response.turnSet = 1;
  let wasInGraveyardBeforeLowerLink = false;
  game.chain.pushChainLink('player', makeCard('lower-monster-effect'), [], {
    resolver: async () => {
      wasInGraveyardBeforeLowerLink = game.opponentGraveyard.includes(response);
      return true;
    }
  });
  await game.openChainResponseWindow('opponent', { event: 'monster-effect' });
  await game.resolveChainStack();
  assert.equal(negatedLink?.context.cardActivation, true);
  assert.equal(wasInGraveyardBeforeLowerLink, true);
});

for (const trapType of ['trap-hole', 'mirror-force']) {
  test(`a negated ${trapType} card activation is removed before a lower link resolves`, async () => {
    const game = makeGame();
    const victim = makeCard(`victim-${trapType}`);
    game.field.setMonsterZone('player', 0, victim);
    const trap = makeCard(`trap-${trapType}`, {
      id: trapType === 'trap-hole' ? '04206964' : '44095762',
      card_type: 'trap', type: 'Trap Card'
    });
    trap.ownerId = 'opponent';
    trap.controllerId = 'opponent';
    game.field.setSpellZone('opponent', 0, trap);
    trap.isSetFaceDown = true;
    trap.turnSet = 1;
    let removedBeforeLowerLink = false;
    game.chain.pushChainLink('player', victim, [], {
      resolver: async () => {
        removedBeforeLowerLink = game.opponentGraveyard.includes(trap);
        return true;
      }
    });
    const result = trapType === 'trap-hole'
      ? game.pushTrapHoleChainLink('player', trap, 0, victim)
      : game.pushMirrorForceChainLink('opponent', trap, 0, { attackingSide: 'player', attacker: victim });
    const trapLink = result.link || result;
    trapLink.activationNegated = true;
    await game.resolveChainStack();
    assert.equal(trapLink.context.cardActivation, true);
    assert.equal(removedBeforeLowerLink, true);
    assert.equal(game.playerMonsters[0], victim);
  });
}

test('negating a Pendulum card activation sends it to the Graveyard rather than face-up Extra Deck', async () => {
  let activationLink;
  const game = makeGame({ onChainOpportunity: request => {
    if (request.lastLink.context.activationType === 'pendulum-scale') {
      activationLink = request.lastLink;
      activationLink.activationNegated = true;
    }
    return null;
  } });
  const scale = makeCard('negated-scale', { type: 'Pendulum Effect Monster', pendulumScale: 1 });
  scale.location = 'hand';
  game.playerHand.push(scale);
  assert.equal(await game.activatePendulumScale(scale.uid, 0), false);
  assert.equal(activationLink?.context.cardActivation, true);
  assert.ok(game.playerGraveyard.includes(scale));
  assert.equal(game.field.playerFaceUpExtraDeck.includes(scale), false);
  assert.equal(game.playerSpells[0], null);
  assert.equal(scale.isPendingPendulumActivation, false);
});

test('negating only a Pendulum activation effect leaves a valid active scale', async () => {
  const game = makeGame({ onChainOpportunity: request => {
    if (request.lastLink.context.activationType === 'pendulum-scale') {
      request.lastLink.effectNegated = true;
    }
    return null;
  } });
  const scale = makeCard('effect-negated-scale', { type: 'Pendulum Effect Monster', pendulumScale: 8 });
  scale.location = 'hand';
  game.playerHand.push(scale);
  assert.equal(await game.activatePendulumScale(scale.uid, 4), true);
  assert.equal(game.playerSpells[4], scale);
  assert.equal(scale.location, 'pendulum_zone');
  assert.equal(scale.isPendulumScale, true);
  assert.equal(scale.isPendingPendulumActivation, false);
  assert.equal(game.playerGraveyard.includes(scale), false);
});

test('destroying a pending Pendulum activation without negation sends it to the face-up Extra Deck', async () => {
  let scale;
  let response;
  const game = makeGame({ onChainOpportunity: request => {
    const candidate = request.candidates.find(card => card.cardUid === response?.uid);
    return candidate ? { cardUid: candidate.cardUid } : null;
  } });
  game.rulesMode = 'sandbox';
  scale = makeCard('destroyed-pending-scale', { type: 'Pendulum Effect Monster', pendulumScale: 8 });
  scale.location = 'hand';
  game.playerHand.push(scale);
  response = placeSpell(game, 'destroy-scale-response', { side: 'opponent', type: 'Quick-Play Spell' });
  response.isSetFaceDown = true;
  response.turnSet = 1;
  const originalResolution = game.executeSpellTrapResolution.bind(game);
  game.executeSpellTrapResolution = async (card, ...args) => {
    if (card !== response) return originalResolution(card, ...args);
    return game.removeCardFromCurrentZone(scale, { byCardEffect: true, sourceSide: 'opponent' });
  };
  assert.equal(await game.activatePendulumScale(scale.uid, 4), false);
  assert.equal(game.playerGraveyard.includes(scale), false);
  assert.ok(game.field.playerFaceUpExtraDeck.includes(scale));
  assert.equal(scale.isFaceUpInExtraDeck, true);
  assert.equal(scale.isPendingPendulumActivation, false);
});
