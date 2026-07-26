import test from 'node:test';
import assert from 'node:assert/strict';

import { CardState } from '../src/core/CardState.js';
import { DuelGame } from '../src/game.js';
import {
  DUEL_GAME_NETWORK_ACTION_KINDS,
  DuelGameNetworkAdapter
} from '../src/network/duel-game-network-adapter.js';
import {
  createEnvelope,
  validateEnvelope
} from '../src/network/protocol.js';

function makeFieldSpell({
  uid,
  id,
  name,
  side = 'opponent'
}) {
  const card = new CardState({
    uid,
    id,
    name,
    name_en: name,
    desc: `${name} rules`,
    card_type: 'spell',
    type: 'Spell Card',
    race: 'Field'
  });
  card.ownerId = side;
  card.controllerId = side;
  card.location = 'hand';
  return card;
}

function createFieldSpellGame(side = 'opponent') {
  const game = new DuelGame({}, { rulesMode: 'sandbox' });
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  return game;
}

test('the protocol accepts the closed Field Spell action shapes enforced by the adapter', () => {
  const game = createFieldSpellGame('player');
  const card = makeFieldSpell({
    uid: 'player-field-card',
    id: '59197169',
    name: 'Localized display name',
    side: 'player'
  });
  game.playerHand.push(card);
  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'player',
    localViewerSide: 'player'
  });

  for (const kind of [
    'ACTIVATE_FIELD_SPELL',
    'SET_FIELD_SPELL',
    'ACTIVATE_SET_FIELD_SPELL'
  ]) {
    assert.equal(DUEL_GAME_NETWORK_ACTION_KINDS.includes(kind), true);
    const envelope = createEnvelope({
      type: 'action',
      sessionId: 'field-session',
      peerId: 'field-peer',
      seq: 1,
      timestamp: 1,
      payload: {
        actionId: `action-${kind.toLowerCase()}`,
        baseRevision: 0,
        action: {
          kind,
          actor: 'player',
          cardUid: card.uid
        }
      }
    });
    assert.equal(validateEnvelope(envelope).ok, true);
  }

  const genericSet = adapter.validateAction({
    kind: 'SET_SPELL_TRAP',
    actor: 'player',
    cardUid: card.uid,
    zoneIndex: 0,
    baseRevision: 0
  });
  assert.equal(genericSet.code, 'FIELD_SPELL_ACTION_REQUIRED');
});

test('a remote side can Set then activate its Field Spell through side-aware wrappers', async () => {
  const game = createFieldSpellGame();
  const card = makeFieldSpell({
    uid: 'secret-set-field-uid',
    id: '22702055',
    name: 'Secret Set Field Spell'
  });
  game.opponentHand.push(card);
  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'opponent',
    localViewerSide: 'player'
  });

  const setResult = await adapter.applyAction({
    kind: 'SET_FIELD_SPELL',
    actor: 'opponent',
    cardUid: card.uid,
    baseRevision: 0
  });
  assert.equal(setResult.accepted, true);
  assert.equal(setResult.revision, 1);
  assert.equal(game.opponentFieldSpell, card);
  assert.equal(card.isSetFaceDown, true);
  assert.equal(card.fieldActivationState, 'set');

  const hiddenSnapshot = adapter.buildPublicSnapshot('player');
  assert.deepEqual(hiddenSnapshot.sides.opponent.fieldSpell, {
    hidden: true,
    location: 'field_zone',
    zoneIndex: 0,
    position: 'attack',
    faceDown: true
  });
  const hiddenJson = JSON.stringify(hiddenSnapshot.sides.opponent.fieldSpell);
  assert.equal(hiddenJson.includes(card.uid), false);
  assert.equal(hiddenJson.includes(card.id), false);
  assert.equal(hiddenJson.includes(card.name), false);
  assert.equal(hiddenJson.includes('fieldActivation'), false);

  const activateResult = await adapter.applyAction({
    kind: 'ACTIVATE_SET_FIELD_SPELL',
    actor: 'opponent',
    cardUid: card.uid,
    baseRevision: 1
  });
  assert.equal(activateResult.accepted, true);
  assert.equal(activateResult.revision, 2);
  assert.equal(card.isSetFaceDown, false);
  assert.equal(card.fieldActivationState, 'resolved');
  assert.equal(card.fieldActivationSequence, 1);

  const visibleSnapshot = adapter.buildPublicSnapshot('player');
  const visibleField = visibleSnapshot.sides.opponent.fieldSpell;
  assert.equal(visibleField.id, card.id);
  assert.equal(visibleField.isFieldSpell, true);
  assert.equal(visibleField.fieldActivationState, 'resolved');
  assert.equal(visibleField.fieldActivationSequence, 1);
  assert.equal(Object.hasOwn(visibleField, 'runtimeInstanceId'), false);
  assert.equal(Object.hasOwn(visibleField, 'fieldActivationRuntimeInstanceId'), false);
});

test('activation from hand publishes pending then resolved metadata and newest sequence', async () => {
  const game = createFieldSpellGame();
  const first = makeFieldSpell({
    uid: 'first-field-uid',
    id: '87430998',
    name: 'First Field'
  });
  const replacement = makeFieldSpell({
    uid: 'replacement-field-uid',
    id: '50913601',
    name: 'Replacement Field'
  });
  game.opponentHand.push(first, replacement);
  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'opponent',
    localViewerSide: 'player'
  });
  let pendingSnapshot = null;
  game.callbacks.onAnimation = event => {
    if (
      event.type === 'activate'
      && event.zoneType === 'field'
      && event.faceDown !== true
    ) {
      pendingSnapshot = adapter.buildPublicSnapshot('player');
    }
  };

  const firstResult = await adapter.applyAction({
    kind: 'ACTIVATE_FIELD_SPELL',
    actor: 'opponent',
    cardUid: first.uid,
    baseRevision: 0
  });
  assert.equal(firstResult.accepted, true);
  assert.equal(pendingSnapshot.sides.opponent.fieldSpell.fieldActivationState, 'pending');
  assert.equal(pendingSnapshot.sides.opponent.fieldSpell.fieldActivationSequence, 0);
  assert.equal(first.fieldActivationSequence, 1);

  const replacementResult = await adapter.applyAction({
    kind: 'ACTIVATE_FIELD_SPELL',
    actor: 'opponent',
    cardUid: replacement.uid,
    baseRevision: 1
  });
  assert.equal(replacementResult.accepted, true);
  assert.equal(replacementResult.revision, 2);
  assert.equal(game.opponentFieldSpell, replacement);
  assert.equal(replacement.fieldActivationState, 'resolved');
  assert.equal(replacement.fieldActivationSequence, 2);
  assert.equal(game.opponentGraveyard.includes(first), true);

  const resolvedSnapshot = adapter.buildPublicSnapshot('player');
  assert.equal(
    resolvedSnapshot.sides.opponent.fieldSpell.fieldActivationState,
    'resolved'
  );
  assert.equal(
    resolvedSnapshot.sides.opponent.fieldSpell.fieldActivationSequence,
    2
  );
});

test('a legally applied but negated Field Spell activation is ACKed and revisioned', async () => {
  const game = createFieldSpellGame();
  const card = makeFieldSpell({
    uid: 'negated-field-uid',
    id: '59197169',
    name: 'Negated Field'
  });
  game.opponentHand.push(card);
  let negated = false;
  game.callbacks.onChainOpportunity = ({ lastLink }) => {
    if (!negated) {
      lastLink.activationNegated = true;
      negated = true;
    }
    return null;
  };
  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'opponent',
    localViewerSide: 'player'
  });

  const result = await adapter.applyAction({
    kind: 'ACTIVATE_FIELD_SPELL',
    actor: 'opponent',
    cardUid: card.uid,
    baseRevision: 0
  });

  assert.equal(result.accepted, true);
  assert.equal(result.revision, 1);
  assert.equal(adapter.revision, 1);
  assert.equal(game.opponentFieldSpell, null);
  assert.equal(game.opponentGraveyard.includes(card), true);
});

test('a reset during asynchronous Field Spell activation rejects the stale action and requests resync', async () => {
  const game = createFieldSpellGame();
  const card = makeFieldSpell({
    uid: 'reset-field-uid',
    id: '22702055',
    name: 'Reset Field'
  });
  game.opponentHand.push(card);
  game.callbacks.onChainOpportunity = () => {
    game.reset();
    return null;
  };
  let resyncReason = null;
  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'opponent',
    localViewerSide: 'player',
    callbacks: {
      onResyncRequired: details => {
        resyncReason = details?.reason || details?.code || null;
      }
    }
  });

  const result = await adapter.applyAction({
    kind: 'ACTIVATE_FIELD_SPELL',
    actor: 'opponent',
    cardUid: card.uid,
    baseRevision: 0
  });

  assert.equal(result.accepted, false);
  assert.equal(result.code, 'DUEL_GENERATION_CHANGED');
  assert.equal(result.revision, 0);
  assert.equal(adapter.revision, 0);
  assert.equal(game.opponentFieldSpell, null);
  assert.ok(resyncReason);
});

test('snapshot validation rejects identity and runtime metadata leaks from Field Spell Zones', async () => {
  const sourceGame = createFieldSpellGame();
  const card = makeFieldSpell({
    uid: 'private-field-uid',
    id: '23424603',
    name: 'Private Field'
  });
  sourceGame.opponentHand.push(card);
  const source = new DuelGameNetworkAdapter(sourceGame, {
    remoteActorSide: 'opponent',
    localViewerSide: 'player'
  });
  await source.applyAction({
    kind: 'SET_FIELD_SPELL',
    actor: 'opponent',
    cardUid: card.uid,
    baseRevision: 0
  });
  const hiddenSnapshot = source.buildPublicSnapshot('player');

  const target = new DuelGameNetworkAdapter(createFieldSpellGame(), {
    remoteActorSide: 'opponent',
    localViewerSide: 'player'
  });
  const leakedIdentity = structuredClone(hiddenSnapshot);
  leakedIdentity.sides.opponent.fieldSpell.id = card.id;
  assert.equal(
    target.applyPublicSnapshot(leakedIdentity, { revision: 1 }).code,
    'PRIVATE_DATA_VIOLATION'
  );

  await source.applyAction({
    kind: 'ACTIVATE_SET_FIELD_SPELL',
    actor: 'opponent',
    cardUid: card.uid,
    baseRevision: 1
  });
  const visibleSnapshot = source.buildPublicSnapshot('player');
  const leakedRuntime = structuredClone(visibleSnapshot);
  leakedRuntime.sides.opponent.fieldSpell.fieldActivationRuntimeInstanceId =
    card.fieldActivationRuntimeInstanceId;
  assert.equal(
    target.applyPublicSnapshot(leakedRuntime, { revision: 2 }).code,
    'PRIVATE_DATA_VIOLATION'
  );
});
