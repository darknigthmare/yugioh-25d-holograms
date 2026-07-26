import test from 'node:test';
import assert from 'node:assert/strict';

import { CardState } from '../src/core/CardState.js';
import {
  hasResolvedFieldSpellActivation,
  markFieldSpellPending,
  markFieldSpellResolved,
  markFieldSpellSet
} from '../src/core/FieldSpellRules.js';
import { DuelGame } from '../src/game.js';

function fieldSpell(uid, overrides = {}) {
  const card = new CardState({
    uid,
    id: overrides.id || `9000${uid.length}`,
    name: overrides.name || uid,
    rulesText: overrides.rulesText || 'A Field Spell used by the runtime tests.',
    card_type: 'spell',
    type: overrides.type || 'Spell Card',
    race: overrides.race || 'Field',
    ...overrides
  });
  card.ownerId = overrides.ownerId || 'player';
  card.controllerId = overrides.controllerId || card.ownerId;
  card.location = overrides.location || 'hand';
  return card;
}

function monster(uid, overrides = {}) {
  const card = new CardState({
    uid,
    id: overrides.id || uid,
    name: overrides.name || uid,
    card_type: 'monster',
    type: 'Effect Monster',
    race: 'Dragon',
    attribute: 'LIGHT',
    atk: 2000,
    def: 1500,
    level: 4,
    ...overrides
  });
  card.ownerId = overrides.ownerId || 'player';
  card.controllerId = overrides.controllerId || card.ownerId;
  return card;
}

function prepareMainPhase(game, side = 'player') {
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = Math.max(1, game.phases.turnCount);
  game.delay = async () => true;
}

function sandboxGame(callbacks = {}) {
  const game = new DuelGame(callbacks, { rulesMode: 'sandbox' });
  prepareMainPhase(game);
  return game;
}

test('CardState classifies Field Spells by canonical subtype and clears activation metadata on zone change', () => {
  const card = fieldSpell('classification', {
    race: 'Terrain',
    isFieldSpell: false
  });
  assert.equal(card.isFieldSpell, true);

  const game = sandboxGame();
  game.field.placeFieldSpell('player', card);
  markFieldSpellResolved(card, 3);
  assert.equal(hasResolvedFieldSpellActivation(card), true);

  game.field.sendToGraveyard(card, 'player');
  assert.equal(card.location, 'graveyard');
  assert.equal(card.fieldActivationState, null);
  assert.equal(card.fieldActivationSequence, 0);
  assert.equal(card.fieldActivationRuntimeInstanceId, null);
  assert.equal(hasResolvedFieldSpellActivation(card), false);
});

test('a sandbox Field Spell activates from hand in its dedicated zone without consuming a Spell/Trap Zone', async () => {
  const game = sandboxGame();
  const card = fieldSpell('from-hand');
  game.playerHand.push(card);

  assert.equal(await game.playSpellTrap(card.uid, 4), true);
  assert.equal(game.playerFieldSpell, card);
  assert.ok(game.playerSpells.every(slot => slot === null));
  assert.equal(card.location, 'field_zone');
  assert.equal(card.isSetFaceDown, false);
  assert.equal(card.fieldActivationState, 'resolved');
  assert.equal(card.fieldActivationSequence, 1);
  assert.equal(card.fieldActivationRuntimeInstanceId, card.runtimeInstanceId);
  assert.equal(hasResolvedFieldSpellActivation(card), true);
});

test('strict mode rejects an unregistered external Field Spell without moving it from the hand', async () => {
  const game = new DuelGame({}, { rulesMode: 'strict' });
  prepareMainPhase(game);
  const card = fieldSpell('strict-unsupported');
  game.playerHand.push(card);

  assert.equal(await game.playSpellTrap(card.uid, 0), false);
  assert.deepEqual(game.playerHand, [card]);
  assert.equal(game.playerFieldSpell, null);
  assert.ok(game.playerSpells.every(slot => slot === null));
});

test('a face-down Field Spell stays inactive and can be activated the same turn as a normal Spell', async () => {
  const game = sandboxGame();
  const card = fieldSpell('set-then-activate');
  game.playerHand.push(card);

  assert.equal(await game.setSpellTrapFaceDown(card.uid, 2), true);
  assert.equal(game.playerFieldSpell, card);
  assert.ok(game.playerSpells.every(slot => slot === null));
  assert.equal(card.isSetFaceDown, true);
  assert.equal(card.fieldActivationState, 'set');
  assert.equal(card.fieldActivationSequence, 0);
  assert.equal(hasResolvedFieldSpellActivation(card), false);

  const setRuntimeInstanceId = card.runtimeInstanceId;
  assert.equal(await game.activateSetSpellTrap('field'), true);
  assert.equal(card.runtimeInstanceId, setRuntimeInstanceId);
  assert.equal(card.isSetFaceDown, false);
  assert.equal(card.fieldActivationState, 'resolved');
  assert.equal(card.fieldActivationSequence, 1);
  assert.equal(hasResolvedFieldSpellActivation(card), true);
});

test('replacing an own Field Spell safely sends the previous runtime instance to its owner Graveyard', async () => {
  const game = sandboxGame();
  const first = fieldSpell('first-field');
  const second = fieldSpell('second-field');
  game.playerHand.push(first, second);

  assert.equal(await game.activateFieldSpellFromHand(first.uid), true);
  assert.equal(first.fieldActivationSequence, 1);
  assert.equal(await game.activateFieldSpellFromHand(second.uid), true);

  assert.equal(game.playerFieldSpell, second);
  assert.equal(second.fieldActivationSequence, 2);
  assert.equal(first.location, 'graveyard');
  assert.equal(first.controllerId, 'player');
  assert.equal(first.fieldActivationState, null);
  assert.equal(first.fieldActivationRuntimeInstanceId, null);
  assert.ok(game.playerGraveyard.includes(first));
  assert.equal(game.playerGraveyard.filter(card => card === first).length, 1);
});

test('both players keep independent Field Zones and the latest successful activation gets the highest sequence', async () => {
  const game = sandboxGame();
  const playerCard = fieldSpell('player-field');
  const opponentCard = fieldSpell('opponent-field', {
    ownerId: 'opponent',
    controllerId: 'opponent'
  });
  game.playerHand.push(playerCard);
  game.opponentHand.push(opponentCard);

  assert.equal(await game.activateFieldSpellFromHand(playerCard.uid, 'player'), true);
  prepareMainPhase(game, 'opponent');
  assert.equal(await game.activateFieldSpellFromHand(opponentCard.uid, 'opponent'), true);

  assert.equal(game.playerFieldSpell, playerCard);
  assert.equal(game.opponentFieldSpell, opponentCard);
  assert.equal(playerCard.fieldActivationSequence, 1);
  assert.equal(opponentCard.fieldActivationSequence, 2);
});

test('activation negation removes the new Field Spell and never marks it resolved', async () => {
  let capturedLink = null;
  let negated = false;
  const game = sandboxGame({
    onChainOpportunity: ({ lastLink }) => {
      if (!negated) {
        capturedLink = lastLink;
        lastLink.activationNegated = true;
        negated = true;
      }
      return null;
    }
  });
  const card = fieldSpell('activation-negated');
  game.playerHand.push(card);

  assert.equal(await game.activateFieldSpellFromHand(card.uid), false);
  assert.equal(capturedLink?.activationNegated, true);
  assert.equal(game.playerFieldSpell, null);
  assert.ok(game.playerGraveyard.includes(card));
  assert.equal(card.fieldActivationState, null);
  assert.equal(card.fieldActivationSequence, 0);
  assert.equal(hasResolvedFieldSpellActivation(card), false);
});

test('effect negation does not negate the card activation or remove the face-up Field Spell', async () => {
  let capturedLink = null;
  let negated = false;
  const game = sandboxGame({
    onChainOpportunity: ({ lastLink }) => {
      if (!negated) {
        capturedLink = lastLink;
        lastLink.effectNegated = true;
        negated = true;
      }
      return null;
    }
  });
  const card = fieldSpell('effect-negated');
  game.playerHand.push(card);

  assert.equal(await game.activateFieldSpellFromHand(card.uid), true);
  assert.equal(capturedLink?.effectNegated, true);
  assert.equal(capturedLink?.resolvedSuccessfully, false);
  assert.equal(card.appliedAnything, false);
  assert.equal(game.playerFieldSpell, card);
  assert.equal(card.fieldActivationState, 'resolved');
  assert.equal(card.fieldActivationSequence, 1);
  assert.equal(hasResolvedFieldSpellActivation(card), true);
});

test('TCG replacement happens before the new activation resolves while the environment metadata stays pending', async () => {
  const game = sandboxGame();
  const previous = fieldSpell('previous-field');
  const replacement = fieldSpell('pending-replacement');
  game.playerHand.push(previous, replacement);
  assert.equal(await game.activateFieldSpellFromHand(previous.uid), true);

  let releaseOpportunity;
  let signalEntered;
  const entered = new Promise(resolve => {
    signalEntered = resolve;
  });
  const opportunity = new Promise(resolve => {
    releaseOpportunity = resolve;
  });
  game.callbacks.onChainOpportunity = () => {
    signalEntered();
    return opportunity;
  };

  const pendingActivation = game.activateFieldSpellFromHand(replacement.uid);
  await entered;
  assert.equal(game.playerFieldSpell, replacement);
  assert.ok(game.playerGraveyard.includes(previous));
  assert.equal(replacement.fieldActivationState, 'pending');
  assert.equal(replacement.fieldActivationSequence, 0);
  assert.equal(hasResolvedFieldSpellActivation(replacement), false);

  releaseOpportunity(null);
  assert.equal(await pendingActivation, true);
  assert.equal(replacement.fieldActivationState, 'resolved');
  assert.equal(replacement.fieldActivationSequence, 2);
});

test('reset invalidates an asynchronous Field Spell activation and clears its runtime metadata', async () => {
  let releaseOpportunity;
  let signalEntered;
  const entered = new Promise(resolve => {
    signalEntered = resolve;
  });
  const opportunity = new Promise(resolve => {
    releaseOpportunity = resolve;
  });
  const game = sandboxGame({
    onChainOpportunity: () => {
      signalEntered();
      return opportunity;
    }
  });
  const staleCard = fieldSpell('stale-after-reset');
  game.playerHand.push(staleCard);

  const pendingActivation = game.activateFieldSpellFromHand(staleCard.uid);
  await entered;
  assert.equal(staleCard.fieldActivationState, 'pending');

  game.reset();
  assert.equal(game.playerFieldSpell, null);
  assert.equal(game._fieldSpellActivationSequence, 0);
  assert.equal(staleCard.fieldActivationState, null);
  releaseOpportunity(null);

  assert.equal(await pendingActivation, false);
  assert.equal(game.playerFieldSpell, null);
  assert.equal(staleCard.fieldActivationState, null);

  prepareMainPhase(game);
  const freshCard = fieldSpell('fresh-after-reset');
  game.playerHand.push(freshCard);
  game.callbacks.onChainOpportunity = () => null;
  assert.equal(await game.activateFieldSpellFromHand(freshCard.uid), true);
  assert.equal(freshCard.fieldActivationSequence, 1);
});

test('auto-pass keeps Main Phase open when a Field Spell is playable despite five occupied Spell/Trap Zones', () => {
  const game = sandboxGame();
  game.playerSpells.forEach((_, index) => {
    game.playerSpells[index] = fieldSpell(`ordinary-spell-${index}`, {
      race: 'Normal',
      isFieldSpell: false
    });
  });
  game.playerHand.push(fieldSpell('dedicated-field-action'));
  let scheduled = false;
  game.scheduleAction = () => {
    scheduled = true;
  };

  game.checkAutoPass();
  assert.equal(scheduled, false);
});

test('setting an opposing face-down Field Spell never leaks identity through animation payloads', async () => {
  let animation = null;
  const game = sandboxGame({
    onAnimation: event => {
      if (event.type === 'activate' && event.zoneType === 'field') {
        animation = event;
      }
    }
  });
  prepareMainPhase(game, 'opponent');
  const card = fieldSpell('secret-opponent-field', {
    id: '22702055',
    name: 'Secret opponent identity',
    ownerId: 'opponent',
    controllerId: 'opponent'
  });
  game.opponentHand.push(card);

  assert.equal(await game.setFieldSpellFaceDownFromHand(card.uid, 'opponent'), true);
  assert.equal(animation?.hidden, true);
  assert.equal(animation?.card, null);
  const payload = JSON.stringify(animation);
  assert.equal(payload.includes(card.uid), false);
  assert.equal(payload.includes(card.id), false);
  assert.equal(payload.includes(card.name), false);
});

test('GameStateStabilizer never invents a generic Dragon bonus from Field Spell presence or activation state', () => {
  const game = sandboxGame();
  const playerDragon = monster('player-dragon');
  const opponentDragon = monster('opponent-dragon', {
    ownerId: 'opponent',
    controllerId: 'opponent'
  });
  const playerField = fieldSpell('no-arbitrary-player-bonus');
  const opponentField = fieldSpell('no-arbitrary-opponent-bonus', {
    ownerId: 'opponent',
    controllerId: 'opponent'
  });
  game.field.setMonsterZone('player', 0, playerDragon);
  game.field.setMonsterZone('opponent', 0, opponentDragon);
  game.field.placeFieldSpell('player', playerField);
  game.field.placeFieldSpell('opponent', opponentField);

  playerField.isSetFaceDown = true;
  markFieldSpellSet(playerField);
  markFieldSpellPending(opponentField);
  game.stabilizer.stabilize(game);
  assert.equal(playerDragon.currentAtk, 2000);
  assert.equal(opponentDragon.currentAtk, 2000);

  playerField.isSetFaceDown = false;
  markFieldSpellResolved(playerField, 1);
  markFieldSpellResolved(opponentField, 2);
  game.stabilizer.stabilize(game);
  assert.equal(playerDragon.currentAtk, 2000);
  assert.equal(opponentDragon.currentAtk, 2000);
});
