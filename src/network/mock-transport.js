import { NetworkEmitter } from './emitter.js';
import { generateNetworkId } from './session-code.js';

/**
 * Deterministic in-memory transport implementing the same on/off/send/close
 * contract as ManualWebRTCTransport. It is suitable for protocol tests only.
 */
export class MockNetworkTransport extends NetworkEmitter {
  constructor({
    sessionId = generateNetworkId('session'),
    peerId = generateNetworkId('peer'),
    latencyMs = 0
  } = {}) {
    super();
    this.sessionId = sessionId;
    this.peerId = peerId;
    this.remotePeerId = null;
    this.latencyMs = latencyMs;
    this.readyState = 'connecting';
    this.peer = null;
    this.sentMessages = [];
    this.dropCount = 0;
    this.closed = false;
  }

  connectPeer(peer) {
    this.peer = peer;
    this.remotePeerId = peer.peerId;
  }

  open() {
    if (this.closed) throw new Error('Mock transport is closed.');
    if (this.readyState === 'open') return;
    this.readyState = 'open';
    this.emit('statechange', { state: 'open' });
    this.emit('open', {
      sessionId: this.sessionId,
      peerId: this.peerId,
      remotePeerId: this.remotePeerId
    });
  }

  disconnect(reason = 'mock-disconnect') {
    if (this.closed || this.readyState !== 'open') return;
    this.readyState = 'connecting';
    this.emit('statechange', { state: 'reconnecting' });
    this.emit('reconnecting', { reason });
    this.emit('close', { recoverable: true, reason });
  }

  requestReconnect(reason = 'mock-reconnect-needed') {
    this.emit('reconnect-needed', { reason });
  }

  dropNext(count = 1) {
    this.dropCount += Math.max(0, Number(count) || 0);
  }

  send(message) {
    if (this.closed || this.readyState !== 'open') {
      throw new Error('Mock transport is not open.');
    }
    if (typeof message !== 'string') {
      throw new TypeError('Mock duel messages must be serialized text.');
    }
    this.sentMessages.push(message);
    if (this.dropCount > 0) {
      this.dropCount -= 1;
      return;
    }
    if (!this.peer || this.peer.closed || this.peer.readyState !== 'open') {
      throw new Error('Mock remote transport is not open.');
    }
    const deliver = () => this.peer.emit('message', message);
    if (this.latencyMs > 0) setTimeout(deliver, this.latencyMs);
    else queueMicrotask(deliver);
  }

  injectMessage(message) {
    if (this.closed) throw new Error('Mock transport is closed.');
    this.emit('message', message);
  }

  close(reason = 'mock-close', { notifyPeer = true } = {}) {
    if (this.closed) return;
    this.closed = true;
    this.readyState = 'closed';
    this.emit('statechange', { state: 'closed', reason });
    this.emit('close', { recoverable: false, reason });
    if (notifyPeer && this.peer && !this.peer.closed) {
      this.peer.readyState = 'connecting';
      this.peer.emit('statechange', { state: 'reconnecting', reason: 'remote-close' });
      this.peer.emit('close', { recoverable: true, reason: 'remote-close' });
    }
  }
}

export function createMockTransportPair({
  sessionId = generateNetworkId('session'),
  hostPeerId = generateNetworkId('host'),
  guestPeerId = generateNetworkId('guest'),
  latencyMs = 0
} = {}) {
  const host = new MockNetworkTransport({
    sessionId,
    peerId: hostPeerId,
    latencyMs
  });
  const guest = new MockNetworkTransport({
    sessionId,
    peerId: guestPeerId,
    latencyMs
  });
  host.connectPeer(guest);
  guest.connectPeer(host);
  return [host, guest];
}

export function openMockTransportPair(pair) {
  const [first, second] = pair;
  // Both endpoints must be open before either handshake attempts to send.
  first.readyState = 'open';
  second.readyState = 'open';
  first.emit('statechange', { state: 'open' });
  second.emit('statechange', { state: 'open' });
  first.emit('open', {
    sessionId: first.sessionId,
    peerId: first.peerId,
    remotePeerId: first.remotePeerId
  });
  second.emit('open', {
    sessionId: second.sessionId,
    peerId: second.peerId,
    remotePeerId: second.remotePeerId
  });
}
