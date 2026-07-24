import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DuelNetworkSession,
  ManualWebRTCTransport,
  computeDeckHash,
  createEnvelope,
  createMockTransportPair,
  decodeSessionCode,
  encodeSessionCode,
  openMockTransportPair,
  validateEnvelope
} from '../src/network/index.js';

const APP_VERSION = 'test-1.0.0';
const RULES_VERSION = 'tcg-test-v1';
const HOST_DECK_HASH = 'a'.repeat(64);
const GUEST_DECK_HASH = 'b'.repeat(64);

function once(emitter, type) {
  return new Promise(resolve => emitter.once(type, resolve));
}

async function settle(...sessions) {
  await Promise.all(sessions.map(session => session.whenIdle()));
  await new Promise(resolve => setTimeout(resolve, 0));
  await Promise.all(sessions.map(session => session.whenIdle()));
}

function createSessionPair({
  sessionId = 'session-network-test',
  actionHandler = null,
  snapshotProvider = null,
  applySnapshot = null
} = {}) {
  const transports = createMockTransportPair({
    sessionId,
    hostPeerId: 'host-network-test',
    guestPeerId: 'guest-network-test'
  });
  const host = new DuelNetworkSession({
    transport: transports[0],
    role: 'host',
    appVersion: APP_VERSION,
    rulesVersion: RULES_VERSION,
    rulesMode: 'strict',
    deckHash: HOST_DECK_HASH,
    expectedRemoteDeckHash: GUEST_DECK_HASH,
    applySnapshot,
    handshakeTimeoutMs: 500,
    actionAckTimeoutMs: 500,
    inboundActionTimeoutMs: 500,
    resyncTimeoutMs: 500
  });
  const guest = new DuelNetworkSession({
    transport: transports[1],
    role: 'guest',
    appVersion: APP_VERSION,
    rulesVersion: RULES_VERSION,
    rulesMode: 'strict',
    deckHash: GUEST_DECK_HASH,
    expectedRemoteDeckHash: HOST_DECK_HASH,
    actionValidator: action => (
      action.kind === 'ADVANCE_PHASE'
        ? true
        : { ok: false, reason: 'Unsupported test action.' }
    ),
    actionHandler,
    snapshotProvider,
    handshakeTimeoutMs: 500,
    actionAckTimeoutMs: 500,
    inboundActionTimeoutMs: 500,
    resyncTimeoutMs: 500
  });
  host.start();
  guest.start();
  return { host, guest, transports };
}

test('copyable session codes round-trip and detect accidental corruption', () => {
  const code = encodeSessionCode({
    description: { type: 'offer', sdp: 'v=0\r\na=test-offer\r\n' },
    sessionId: 'session-code-test',
    peerId: 'host-code-test'
  });
  const decoded = decodeSessionCode(`  ${code.slice(0, 20)}\n${code.slice(20)}  `);
  assert.equal(decoded.kind, 'offer');
  assert.equal(decoded.sessionId, 'session-code-test');
  assert.equal(decoded.peerId, 'host-code-test');
  assert.equal(decoded.description.sdp, 'v=0\r\na=test-offer\r\n');

  const lastCharacter = code.at(-1);
  const corrupted = `${code.slice(0, -1)}${lastCharacter === '0' ? '1' : '0'}`;
  assert.throws(() => decodeSessionCode(corrupted), /corrupted/i);
});

test('deck commitments are stable regardless of card order', async () => {
  const first = await computeDeckHash({
    main: ['3', '1', '2', '1'],
    extra: ['9', '8']
  });
  const second = await computeDeckHash({
    main: ['1', '2', '1', '3'],
    extra: ['8', '9']
  });
  const different = await computeDeckHash({
    main: ['1', '2', '3'],
    extra: ['8', '9']
  });
  assert.equal(first, second);
  assert.notEqual(first, different);
  assert.match(first, /^[a-f0-9]{64}$/u);
});

test('protocol schema rejects malformed and oversized peer messages', () => {
  assert.deepEqual(validateEnvelope('{not-json'), {
    ok: false,
    code: 'INVALID_JSON',
    error: 'Network message is not valid JSON.'
  });

  const invalidAction = createEnvelope({
    type: 'action',
    sessionId: 'session-schema-test',
    peerId: 'peer-schema-test',
    seq: 1,
    payload: {
      actionId: 'action-schema-test',
      baseRevision: 0,
      action: { kind: 'ADVANCE_PHASE' }
    }
  });
  invalidAction.payload.action.__proto__ = { polluted: true };
  // JSON serialization drops an assigned prototype; an explicit forbidden key
  // from an untrusted JSON string must still be rejected.
  const raw = JSON.stringify(invalidAction).replace(
    '"kind":"ADVANCE_PHASE"',
    '"kind":"ADVANCE_PHASE","__proto__":{"polluted":true}'
  );
  const result = validateEnvelope(raw);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'INVALID_PAYLOAD');

  const oversized = JSON.stringify({
    ...invalidAction,
    payload: {
      ...invalidAction.payload,
      action: { kind: 'ADVANCE_PHASE', blob: 'x'.repeat(70_000) }
    }
  });
  assert.equal(validateEnvelope(oversized).code, 'MESSAGE_TOO_LARGE');
});

test('handshake exchanges rules/deck hashes and action messages receive ACKs', async () => {
  let appliedActions = 0;
  const { host, guest, transports } = createSessionPair({
    actionHandler: async (action, meta) => {
      appliedActions += 1;
      assert.equal(action.kind, 'ADVANCE_PHASE');
      assert.equal(meta.baseRevision, 0);
      return {
        accepted: true,
        revision: 1,
        result: { phase: 'battle' }
      };
    }
  });
  const hostReady = once(host, 'ready');
  const guestReady = once(guest, 'ready');
  openMockTransportPair(transports);
  const [hostHandshake, guestHandshake] = await Promise.all([hostReady, guestReady]);

  assert.equal(hostHandshake.remote.deckHash, GUEST_DECK_HASH);
  assert.equal(guestHandshake.remote.deckHash, HOST_DECK_HASH);
  assert.equal(host.isReady, true);
  assert.equal(guest.isReady, true);

  const acknowledgement = await host.sendAction({
    kind: 'ADVANCE_PHASE',
    phase: 'battle'
  });
  assert.equal(acknowledgement.accepted, true);
  assert.equal(acknowledgement.revision, 1);
  assert.deepEqual(acknowledgement.result, { phase: 'battle' });
  assert.equal(host.currentRevision, 1);
  assert.equal(guest.currentRevision, 1);
  assert.equal(appliedActions, 1);

  await assert.rejects(
    host.sendAction(
      { kind: 'ADVANCE_PHASE', phase: 'end' },
      { baseRevision: 0 }
    ),
    /Revision mismatch/u
  );
  assert.equal(appliedActions, 1, 'stale revisions must be rejected before application');

  const actionRaw = transports[0].sentMessages.find(message => (
    JSON.parse(message).type === 'action'
  ));
  transports[1].injectMessage(actionRaw);
  await settle(host, guest);
  assert.equal(appliedActions, 1, 'duplicate actionId/sequence must not apply twice');

  host.close('test-complete');
  guest.close('test-complete');
});

test('resync request transfers a validated snapshot and revision', async () => {
  let restoredSnapshot = null;
  const { host, guest, transports } = createSessionPair({
    snapshotProvider: () => ({
      revision: 7,
      state: {
        phase: 'main1',
        turn: 4,
        publicField: [{ id: '89631139', position: 'attack' }]
      }
    }),
    applySnapshot: (state, meta) => {
      restoredSnapshot = { state, meta };
    }
  });
  const hostReady = once(host, 'ready');
  const guestReady = once(guest, 'ready');
  openMockTransportPair(transports);
  await Promise.all([hostReady, guestReady]);

  const result = await host.requestResync({ reason: 'test-resync' });
  assert.equal(result.revision, 7);
  assert.equal(host.currentRevision, 7);
  assert.equal(restoredSnapshot.state.phase, 'main1');
  assert.equal(restoredSnapshot.meta.revision, 7);

  host.close('test-complete');
  guest.close('test-complete');
});

test('a session can replace its transport, re-handshake, and keep sequencing', async () => {
  let applications = 0;
  const { host, guest, transports } = createSessionPair({
    actionHandler: () => ({
      accepted: true,
      revision: ++applications
    })
  });
  let hostReady = once(host, 'ready');
  let guestReady = once(guest, 'ready');
  openMockTransportPair(transports);
  await Promise.all([hostReady, guestReady]);
  await host.sendAction({ kind: 'ADVANCE_PHASE', phase: 'battle' });

  // Simulate an ACK lost exactly when the connection fails. The receiver has
  // already applied and cached the action result.
  transports[1].dropNext(1);
  const pendingAcknowledgement = host.sendAction({
    kind: 'ADVANCE_PHASE',
    phase: 'main2'
  }, { baseRevision: 1 });
  await settle(host, guest);
  assert.equal(applications, 2);

  transports[0].disconnect();
  assert.equal(host.state, 'reconnecting');

  const replacement = createMockTransportPair({
    sessionId: host.sessionId,
    hostPeerId: host.peerId,
    guestPeerId: guest.peerId
  });
  host.replaceTransport(replacement[0], { closePrevious: false });
  guest.replaceTransport(replacement[1], { closePrevious: false });
  hostReady = once(host, 'ready');
  guestReady = once(guest, 'ready');
  openMockTransportPair(replacement);
  const [hostReconnect, guestReconnect] = await Promise.all([hostReady, guestReady]);
  assert.equal(hostReconnect.reconnect, true);
  assert.equal(guestReconnect.reconnect, true);

  const recoveredAcknowledgement = await pendingAcknowledgement;
  assert.equal(recoveredAcknowledgement.accepted, true);
  assert.equal(recoveredAcknowledgement.revision, 2);
  assert.equal(applications, 2, 'retransmitted actionId must use the cached ACK');

  const acknowledgement = await host.sendAction({
    kind: 'ADVANCE_PHASE',
    phase: 'end'
  }, { baseRevision: 2 });
  assert.equal(acknowledgement.accepted, true);
  assert.equal(acknowledgement.revision, 3);
  assert.equal(applications, 3);
  assert.ok(host.localSequence > 2);
  assert.ok(host.lastRemoteSequence > 2);

  host.close('test-complete');
  guest.close('test-complete');
});

class FakeDataChannel {
  constructor(label, options) {
    this.label = label;
    this.ordered = options.ordered;
    this.maxRetransmits = null;
    this.maxPacketLifeTime = null;
    this.readyState = 'connecting';
    this.sent = [];
  }

  send(message) {
    this.sent.push(message);
  }

  close() {
    this.readyState = 'closed';
  }
}

class FakePeerConnection {
  constructor(name) {
    this.name = name;
    this.iceGatheringState = 'complete';
    this.connectionState = 'new';
    this.iceConnectionState = 'new';
    this.signalingState = 'stable';
    this.localDescription = null;
    this.remoteDescription = null;
    this.createdChannel = null;
    this.offerOptions = null;
  }

  createDataChannel(label, options) {
    this.createdChannel = new FakeDataChannel(label, options);
    return this.createdChannel;
  }

  async createOffer(options) {
    this.offerOptions = options;
    return { type: 'offer', sdp: `v=0\r\na=${this.name}-offer\r\n` };
  }

  async createAnswer() {
    return { type: 'answer', sdp: `v=0\r\na=${this.name}-answer\r\n` };
  }

  async setLocalDescription(description) {
    this.localDescription = description;
  }

  async setRemoteDescription(description) {
    this.remoteDescription = description;
  }

  restartIce() {}
  close() {
    this.connectionState = 'closed';
  }
}

test('manual WebRTC signaling creates offer/answer codes and a reliable ordered channel', async () => {
  const hostPeerConnection = new FakePeerConnection('host');
  const guestPeerConnection = new FakePeerConnection('guest');
  const host = new ManualWebRTCTransport({
    sessionId: 'session-webrtc-test',
    peerId: 'host-webrtc-test',
    peerConnectionFactory: () => hostPeerConnection
  });
  const guest = new ManualWebRTCTransport({
    peerId: 'guest-webrtc-test',
    peerConnectionFactory: () => guestPeerConnection
  });

  const offerCode = await host.createOfferCode();
  const offer = decodeSessionCode(offerCode);
  assert.equal(offer.kind, 'offer');
  assert.equal(hostPeerConnection.createdChannel.ordered, true);
  assert.equal(hostPeerConnection.createdChannel.maxRetransmits, null);
  assert.equal(hostPeerConnection.createdChannel.maxPacketLifeTime, null);

  const answerCode = await guest.acceptOfferCode(offerCode);
  const answer = decodeSessionCode(answerCode);
  assert.equal(answer.kind, 'answer');
  assert.equal(guest.sessionId, host.sessionId);
  assert.equal(guest.remotePeerId, host.peerId);

  assert.equal(await host.acceptAnswerCode(answerCode), true);
  assert.equal(host.remotePeerId, guest.peerId);
  assert.equal(hostPeerConnection.remoteDescription.type, 'answer');
  assert.equal(guestPeerConnection.remoteDescription.type, 'offer');

  const reconnectOffer = await host.createReconnectOfferCode();
  assert.equal(decodeSessionCode(reconnectOffer).kind, 'reconnect-offer');
  assert.deepEqual(hostPeerConnection.offerOptions, { iceRestart: true });

  host.close();
  guest.close();
});
