import test from 'node:test';
import assert from 'node:assert/strict';

import { computeDeckHash } from '../src/network/deck-hash.js';
import {
  createMockTransportPair,
  openMockTransportPair
} from '../src/network/mock-transport.js';
import { OnlineDuelController } from '../src/network/online-duel-controller.js';

const APP_VERSION = 'controller-test-1.0.0';
const RULES_VERSION = 'controller-rules-v1';
const HOST_DECK = {
  main: ['46986414', '89631139', '74677422'],
  extra: ['23995346'],
  side: []
};
const GUEST_DECK = {
  main: ['14558127', '70903634', '33396948'],
  extra: ['44508094'],
  side: []
};
const FAST_SESSION_OPTIONS = Object.freeze({
  handshakeTimeoutMs: 500,
  actionAckTimeoutMs: 500,
  inboundActionTimeoutMs: 500,
  resyncTimeoutMs: 500
});

function once(emitter, type) {
  return new Promise(resolve => emitter.once(type, resolve));
}

function attachManualSignaling(
  pair,
  {
    offerCode = 'controller-offer-code',
    answerCode = 'controller-answer-code',
    reconnectOfferCode = 'controller-reconnect-offer-code',
    reconnectAnswerCode = 'controller-reconnect-answer-code'
  } = {}
) {
  const [hostTransport, guestTransport] = pair;

  hostTransport.createOfferCode = async () => offerCode;
  guestTransport.acceptOfferCode = async receivedCode => {
    assert.equal(receivedCode, offerCode);
    return answerCode;
  };
  hostTransport.acceptAnswerCode = async receivedCode => {
    assert.equal(receivedCode, answerCode);
    openMockTransportPair(pair);
    return true;
  };

  hostTransport.createReconnectOfferCode = async () => reconnectOfferCode;
  guestTransport.acceptReconnectOfferCode = async receivedCode => {
    assert.equal(receivedCode, reconnectOfferCode);
    return reconnectAnswerCode;
  };
  hostTransport.acceptReconnectAnswerCode = async receivedCode => {
    assert.equal(receivedCode, reconnectAnswerCode);
    openMockTransportPair(pair);
    return true;
  };

  return {
    offerCode,
    answerCode,
    reconnectOfferCode,
    reconnectAnswerCode
  };
}

function createController(transport, options = {}) {
  return new OnlineDuelController({
    appVersion: APP_VERSION,
    rulesVersion: RULES_VERSION,
    transportFactory: () => transport,
    sessionOptions: FAST_SESSION_OPTIONS,
    ...options
  });
}

test('controller completes host/join, action, snapshot, ping and reconnect flows', async () => {
  const transports = createMockTransportPair({
    sessionId: 'session-controller-flow',
    hostPeerId: 'host-controller-flow',
    guestPeerId: 'guest-controller-flow'
  });
  const codes = attachManualSignaling(transports);
  const hostDeckHash = await computeDeckHash(HOST_DECK);
  const guestDeckHash = await computeDeckHash(GUEST_DECK);
  const hostStatusPhases = [];
  const guestStatusPhases = [];
  const pendingActions = [];
  const acknowledgements = [];
  const appliedActions = [];
  const receivedSnapshots = [];

  const host = createController(transports[0], {
    callbacks: {
      onStatus: status => hostStatusPhases.push(status.phase)
    },
    validateRemoteAction: action => (
      action.kind === 'ADVANCE_PHASE'
        ? true
        : { ok: false, reason: 'Unsupported controller test action.' }
    ),
    applyRemoteAction: (action, meta) => {
      appliedActions.push({ action, meta });
      return {
        accepted: true,
        revision: 1,
        result: { phase: action.phase }
      };
    },
    buildPublicSnapshot: context => ({
      revision: 5,
      state: {
        turn: 3,
        phase: 'main1',
        publicHandCount: 4,
        viewerPeerId: context.remotePeerId
      }
    })
  });
  const guest = createController(transports[1], {
    callbacks: {
      onStatus: status => guestStatusPhases.push(status.phase),
      onActionPending: detail => pendingActions.push(detail),
      onActionAck: acknowledgement => acknowledgements.push(acknowledgement)
    },
    validateRemoteAction: () => true,
    applyRemoteAction: () => ({
      accepted: true,
      revision: 1
    }),
    applyPublicSnapshot: (state, meta) => {
      receivedSnapshots.push({ state, meta });
    }
  });

  const offerCode = await host.host({
    rulesMode: 'strict',
    deck: HOST_DECK,
    expectedRemoteDeckHash: guestDeckHash
  });
  assert.equal(offerCode, codes.offerCode);
  assert.equal(host.exportCode(), codes.offerCode);
  assert.equal(host.exportCode('offer'), codes.offerCode);
  assert.equal(host.status.phase, 'offer-ready');
  assert.equal(host.status.hasExportableCode, true);

  const answerCode = await guest.join(offerCode, {
    rulesMode: 'strict',
    deck: GUEST_DECK,
    expectedRemoteDeckHash: hostDeckHash
  });
  assert.equal(answerCode, codes.answerCode);
  assert.equal(guest.exportCode('answer'), codes.answerCode);
  assert.equal(guest.status.phase, 'answer-ready');

  const hostReady = once(host, 'ready');
  const guestReady = once(guest, 'ready');
  assert.equal(await host.acceptAnswer(answerCode), true);
  const [hostHandshake, guestHandshake] = await Promise.all([
    hostReady,
    guestReady
  ]);

  assert.equal(hostHandshake.remote.deckHash, guestDeckHash);
  assert.equal(guestHandshake.remote.deckHash, hostDeckHash);
  assert.equal(host.status.phase, 'ready');
  assert.equal(guest.status.phase, 'ready');
  assert.equal(host.status.ready, true);
  assert.equal(guest.status.remotePeerId, 'host-controller-flow');
  assert.ok(hostStatusPhases.includes('handshaking'));
  assert.ok(guestStatusPhases.includes('handshaking'));

  const acknowledgement = await guest.sendAction({
    kind: 'ADVANCE_PHASE',
    phase: 'battle'
  }, {
    baseRevision: 0
  });
  assert.equal(acknowledgement.accepted, true);
  assert.equal(acknowledgement.revision, 1);
  assert.deepEqual(acknowledgement.result, { phase: 'battle' });
  assert.equal(appliedActions.length, 1);
  assert.equal(appliedActions[0].meta.peerId, 'guest-controller-flow');
  assert.equal(pendingActions.length, 1);
  assert.equal(acknowledgements.length, 1);
  assert.equal(guest.status.pendingActions, 0);
  assert.equal(host.status.revision, 1);
  assert.equal(guest.status.revision, 1);

  const snapshot = await guest.requestPublicSnapshot('controller-test');
  assert.equal(snapshot.revision, 5);
  assert.equal(snapshot.state.publicHandCount, 4);
  assert.equal(snapshot.state.viewerPeerId, 'guest-controller-flow');
  assert.equal(receivedSnapshots.length, 1);
  assert.equal(receivedSnapshots[0].meta.revision, 5);
  assert.notEqual(receivedSnapshots[0].state, snapshot.state);
  assert.equal(guest.status.revision, 5);

  const roundTripMs = await guest.ping({ timeoutMs: 500 });
  assert.ok(Number.isFinite(roundTripMs));
  assert.ok(roundTripMs >= 0);

  transports[0].disconnect('controller-reconnect');
  transports[1].disconnect('controller-reconnect');
  assert.equal(host.status.phase, 'reconnecting');
  assert.equal(guest.status.phase, 'reconnecting');

  const reconnectOffer = await host.createReconnectOffer();
  assert.equal(reconnectOffer, codes.reconnectOfferCode);
  assert.equal(host.exportCode('reconnect-offer'), reconnectOffer);
  const reconnectAnswer = await guest.acceptReconnectOffer(reconnectOffer);
  assert.equal(reconnectAnswer, codes.reconnectAnswerCode);
  assert.equal(guest.exportCode(), reconnectAnswer);

  const hostReconnected = once(host, 'ready');
  const guestReconnected = once(guest, 'ready');
  assert.equal(await host.acceptReconnectAnswer(reconnectAnswer), true);
  const [hostReconnectEvent, guestReconnectEvent] = await Promise.all([
    hostReconnected,
    guestReconnected
  ]);
  assert.equal(hostReconnectEvent.reconnect, true);
  assert.equal(guestReconnectEvent.reconnect, true);
  assert.equal(host.status.phase, 'ready');
  assert.equal(guest.status.phase, 'ready');

  host.close('controller-test-complete');
  guest.close('controller-test-complete');
  assert.equal(host.status.phase, 'closed');
  assert.equal(guest.status.phase, 'closed');
});

test('controller rejects peers that selected incompatible rules modes', async () => {
  const transports = createMockTransportPair({
    sessionId: 'session-controller-reject',
    hostPeerId: 'host-controller-reject',
    guestPeerId: 'guest-controller-reject'
  });
  attachManualSignaling(transports, {
    offerCode: 'reject-offer-code',
    answerCode: 'reject-answer-code'
  });
  const hostRejections = [];
  const guestRejections = [];
  const host = createController(transports[0], {
    callbacks: {
      onRejected: event => hostRejections.push(event)
    }
  });
  const guest = createController(transports[1], {
    callbacks: {
      onRejected: event => guestRejections.push(event)
    }
  });

  const offer = await host.host({
    rulesMode: 'strict',
    deck: HOST_DECK
  });
  const answer = await guest.join(offer, {
    rulesMode: 'sandbox',
    deck: GUEST_DECK
  });
  const hostRejected = once(host, 'rejected');
  const guestRejected = once(guest, 'rejected');
  await host.acceptAnswer(answer);
  const [hostEvent, guestEvent] = await Promise.all([
    hostRejected,
    guestRejected
  ]);

  assert.match(hostEvent.reason, /Rules mode mismatch/u);
  assert.match(guestEvent.reason, /Rules mode mismatch/u);
  assert.equal(host.status.phase, 'rejected');
  assert.equal(guest.status.phase, 'rejected');
  assert.equal(host.status.ready, false);
  assert.equal(guest.status.ready, false);
  assert.equal(hostRejections.length, 1);
  assert.equal(guestRejections.length, 1);

  host.close('controller-reject-test-complete');
  guest.close('controller-reject-test-complete');
});

test('controller public snapshots are cloned and reject non-JSON state', async () => {
  const source = {
    revision: 4,
    state: {
      turn: 2,
      zones: [{ owner: 'host', cards: 2 }]
    }
  };
  const controller = new OnlineDuelController({
    appVersion: APP_VERSION,
    rulesVersion: RULES_VERSION,
    buildPublicSnapshot: () => source
  });

  const snapshot = await controller.exportPublicSnapshot();
  assert.deepEqual(snapshot, source);
  assert.notEqual(snapshot, source);
  assert.notEqual(snapshot.state, source.state);
  assert.notEqual(snapshot.state.zones, source.state.zones);

  source.state.zones[0].cards = 99;
  assert.equal(snapshot.state.zones[0].cards, 2);

  controller.buildPublicSnapshot = () => ({
    state: {
      phase: 'main1',
      callback() {}
    }
  });
  await assert.rejects(
    controller.exportPublicSnapshot(),
    /JSON|unsupported|serializable|value type/iu
  );

  controller.buildPublicSnapshot = () => [];
  await assert.rejects(
    controller.exportPublicSnapshot(),
    /object/iu
  );
});
