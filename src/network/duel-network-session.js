import { NetworkEmitter } from './emitter.js';
import {
  NETWORK_PROTOCOL_VERSION,
  createEnvelope,
  serializeEnvelope,
  validateEnvelope,
  validateJsonValue
} from './protocol.js';
import { generateNetworkId } from './session-code.js';

const DEFAULT_CAPABILITIES = Object.freeze([
  'action-ack-v1',
  'resync-v1',
  'manual-reconnect-v1'
]);

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function asError(error, fallbackMessage) {
  return error instanceof Error ? error : new Error(String(error || fallbackMessage));
}

function normalizeActionResult(result, fallbackRevision) {
  if (result === true) return { accepted: true, revision: fallbackRevision };
  if (result === false || result === null || result === undefined) {
    return {
      accepted: false,
      revision: fallbackRevision,
      reason: 'Action handler did not accept the action.'
    };
  }
  if (typeof result === 'string') {
    return { accepted: false, revision: fallbackRevision, reason: result };
  }
  if (typeof result === 'object') {
    return {
      accepted: result.accepted === true,
      revision: Number.isSafeInteger(result.revision)
        ? Math.max(0, result.revision)
        : fallbackRevision,
      reason: result.reason === undefined ? undefined : String(result.reason).slice(0, 512),
      result: result.result
    };
  }
  return {
    accepted: false,
    revision: fallbackRevision,
    reason: 'Action handler returned an invalid result.'
  };
}

/**
 * Ordered duel protocol layered over a string transport. The transport may be
 * ManualWebRTCTransport or any injected mock exposing on/off/send/close.
 */
export class DuelNetworkSession extends NetworkEmitter {
  constructor({
    transport,
    role,
    appVersion,
    rulesVersion,
    rulesMode,
    deckHash,
    expectedRemoteDeckHash = null,
    sessionId = transport?.sessionId,
    peerId = transport?.peerId,
    capabilities = DEFAULT_CAPABILITIES,
    currentRevision = 0,
    actionValidator = null,
    actionHandler = null,
    snapshotProvider = null,
    applySnapshot = null,
    enforceRevision = true,
    maxPendingActions = 32,
    handshakeTimeoutMs = 10_000,
    actionAckTimeoutMs = 10_000,
    inboundActionTimeoutMs = 15_000,
    resyncTimeoutMs = 10_000
  }) {
    super();
    if (!transport || typeof transport.on !== 'function' || typeof transport.send !== 'function') {
      throw new TypeError('A compatible network transport is required.');
    }
    if (!['host', 'guest'].includes(role)) {
      throw new TypeError('Network role must be "host" or "guest".');
    }
    if (!['strict', 'sandbox'].includes(rulesMode)) {
      throw new TypeError('Rules mode must be "strict" or "sandbox".');
    }
    if (typeof appVersion !== 'string' || !appVersion) {
      throw new TypeError('appVersion is required.');
    }
    if (typeof rulesVersion !== 'string' || !rulesVersion) {
      throw new TypeError('rulesVersion is required.');
    }
    if (typeof deckHash !== 'string' || deckHash.length < 8) {
      throw new TypeError('A deck hash is required.');
    }
    if (!Array.isArray(capabilities)) {
      throw new TypeError('capabilities must be an array.');
    }
    if (!sessionId || !peerId) {
      throw new TypeError('Transport must expose sessionId and peerId.');
    }

    this.transport = transport;
    this.role = role;
    this.appVersion = appVersion;
    this.rulesVersion = rulesVersion;
    this.rulesMode = rulesMode;
    this.deckHash = deckHash;
    this.expectedRemoteDeckHash = expectedRemoteDeckHash;
    this.sessionId = sessionId;
    this.peerId = peerId;
    this.capabilities = [...new Set(capabilities)];
    this.currentRevision = Math.max(0, Number(currentRevision) || 0);

    // Fail during construction rather than on the first channel open if any
    // handshake field cannot satisfy the wire schema.
    createEnvelope({
      type: 'hello',
      sessionId: this.sessionId,
      peerId: this.peerId,
      seq: 1,
      payload: {
        appVersion: this.appVersion,
        protocolVersion: NETWORK_PROTOCOL_VERSION,
        rulesVersion: this.rulesVersion,
        rulesMode: this.rulesMode,
        deckHash: this.deckHash,
        role: this.role,
        capabilities: this.capabilities,
        resume: { lastLocalSeq: 0, lastRemoteSeq: 0 }
      }
    });
    if (
      this.expectedRemoteDeckHash !== null
      && !/^[A-Za-z0-9_-]{8,128}$/u.test(this.expectedRemoteDeckHash)
    ) {
      throw new TypeError('expectedRemoteDeckHash is invalid.');
    }

    this.actionValidator = actionValidator;
    this.actionHandler = actionHandler;
    this.snapshotProvider = snapshotProvider;
    this.applySnapshot = applySnapshot;
    this.enforceRevision = enforceRevision !== false;
    this.maxPendingActions = Math.max(1, Number(maxPendingActions) || 32);
    this.handshakeTimeoutMs = handshakeTimeoutMs;
    this.actionAckTimeoutMs = actionAckTimeoutMs;
    this.inboundActionTimeoutMs = inboundActionTimeoutMs;
    this.resyncTimeoutMs = resyncTimeoutMs;

    this.state = 'idle';
    this.localSequence = 0;
    this.lastRemoteSequence = 0;
    this.remotePeerId = null;
    this.remoteHandshake = null;
    this.remoteAcceptedHandshake = false;
    this.started = false;
    this.closed = false;
    this._hasEverReady = false;
    this._needsResyncAfterHandshake = false;
    this._transportUnsubscribers = [];
    this._handshakeTimer = null;
    this._messageQueue = Promise.resolve();
    this._pendingActions = new Map();
    this._incomingActions = new Map();
    this._actionAckCache = new Map();
    this._pendingResyncs = new Map();
    this._pendingPings = new Map();
  }

  get isReady() {
    return this.state === 'ready' && !this.closed;
  }

  _setState(state, detail = {}) {
    if (this.state === state) return;
    const previousState = this.state;
    this.state = state;
    this.emit('statechange', { state, previousState, ...detail });
  }

  start() {
    if (this.closed) throw new Error('Network session is closed.');
    if (this.started) return this;
    this.started = true;
    this._bindTransport();
    this._setState('connecting');
    if (this.transport.readyState === 'open') {
      queueMicrotask(() => this._handleTransportOpen());
    }
    return this;
  }

  _bindTransport() {
    this._unbindTransport();
    const bind = (type, listener) => {
      const unsubscribe = this.transport.on(type, listener);
      this._transportUnsubscribers.push(
        typeof unsubscribe === 'function'
          ? unsubscribe
          : () => this.transport.off?.(type, listener)
      );
    };
    bind('open', () => this._handleTransportOpen());
    bind('message', message => {
      this._messageQueue = this._messageQueue
        .then(() => this._handleTransportMessage(message))
        .catch(error => this._emitProtocolError('MESSAGE_PROCESSING_ERROR', error));
    });
    bind('reconnecting', detail => {
      if (this.closed) return;
      this._setState('reconnecting', detail);
      this.emit('reconnecting', detail || {});
    });
    bind('reconnect-needed', detail => {
      if (this.closed) return;
      this._setState('reconnecting', detail);
      this.emit('reconnect-needed', detail || {});
    });
    bind('close', detail => {
      if (this.closed) return;
      this._setState('reconnecting', detail);
      this.emit('transport-close', detail || {});
      if (detail?.recoverable !== true) {
        this.emit('reconnect-needed', {
          reason: detail?.reason || 'transport-closed'
        });
      }
    });
    bind('error', detail => this.emit('transport-error', detail));
  }

  _unbindTransport() {
    for (const unsubscribe of this._transportUnsubscribers) {
      try {
        unsubscribe();
      } catch {
        // Detaching a failed transport must not block replacement.
      }
    }
    this._transportUnsubscribers = [];
  }

  replaceTransport(transport, { closePrevious = true } = {}) {
    if (this.closed) throw new Error('Network session is closed.');
    if (!transport || typeof transport.on !== 'function' || typeof transport.send !== 'function') {
      throw new TypeError('Replacement transport is incompatible.');
    }
    if (transport.sessionId && transport.sessionId !== this.sessionId) {
      throw new Error('Replacement transport belongs to a different session.');
    }
    if (transport.peerId && transport.peerId !== this.peerId) {
      throw new Error('Replacement transport must preserve the local peerId.');
    }

    const previousTransport = this.transport;
    this._unbindTransport();
    this.transport = transport;
    this.remoteAcceptedHandshake = false;
    this.remoteHandshake = null;
    this._setState('reconnecting', { reason: 'transport-replaced' });
    this._bindTransport();
    if (closePrevious) {
      try {
        previousTransport.close?.('transport-replaced');
      } catch {
        // The replacement is already active from the session perspective.
      }
    }
    if (transport.readyState === 'open') {
      queueMicrotask(() => this._handleTransportOpen());
    }
    return this;
  }

  _handleTransportOpen() {
    if (this.closed || this.transport.readyState !== 'open') return;
    this.remoteAcceptedHandshake = false;
    this.remoteHandshake = null;
    this._setState('handshaking');
    clearTimeout(this._handshakeTimer);
    this._handshakeTimer = setTimeout(() => {
      if (this.state !== 'handshaking' || this.closed) return;
      this._setState('reconnecting', { reason: 'handshake-timeout' });
      this.emit('reconnect-needed', { reason: 'handshake-timeout' });
    }, this.handshakeTimeoutMs);

    this._sendMessage('hello', {
      appVersion: this.appVersion,
      protocolVersion: NETWORK_PROTOCOL_VERSION,
      rulesVersion: this.rulesVersion,
      rulesMode: this.rulesMode,
      deckHash: this.deckHash,
      role: this.role,
      capabilities: this.capabilities,
      resume: {
        lastLocalSeq: this.localSequence,
        lastRemoteSeq: this.lastRemoteSequence
      }
    });
  }

  _nextEnvelope(type, payload) {
    this.localSequence += 1;
    return createEnvelope({
      type,
      sessionId: this.sessionId,
      peerId: this.peerId,
      seq: this.localSequence,
      payload
    });
  }

  _sendEnvelope(envelope) {
    const serialized = serializeEnvelope(envelope);
    this.transport.send(serialized);
    this.emit('outgoing-message', envelope);
    return { envelope, serialized };
  }

  _sendMessage(type, payload) {
    return this._sendEnvelope(this._nextEnvelope(type, payload));
  }

  _emitProtocolError(code, error, envelope = null) {
    const normalizedError = asError(error, code);
    this.emit('protocol-error', {
      code,
      error: normalizedError,
      envelope
    });
  }

  async _handleTransportMessage(rawMessage) {
    if (this.closed) return;
    const validation = validateEnvelope(rawMessage);
    if (!validation.ok) {
      this._emitProtocolError(validation.code, validation.error);
      return;
    }
    const envelope = validation.value;
    if (envelope.sessionId !== this.sessionId) {
      this._emitProtocolError('SESSION_MISMATCH', 'Message belongs to another duel.', envelope);
      return;
    }
    if (envelope.peerId === this.peerId) {
      this._emitProtocolError('LOOPED_MESSAGE', 'Received a local message from the transport.', envelope);
      return;
    }
    if (
      this.transport.remotePeerId
      && envelope.peerId !== this.transport.remotePeerId
    ) {
      this._emitProtocolError(
        'SIGNALING_IDENTITY_MISMATCH',
        'Message peerId does not match the identity from manual signaling.',
        envelope
      );
      return;
    }
    if (this.remotePeerId && envelope.peerId !== this.remotePeerId) {
      this._emitProtocolError('PEER_CHANGED', 'Remote peer identity changed.', envelope);
      return;
    }
    this.remotePeerId = envelope.peerId;

    if (envelope.seq <= this.lastRemoteSequence) {
      await this._handleDuplicate(envelope);
      return;
    }
    const expectedSequence = this.lastRemoteSequence + 1;
    const sequenceGap = envelope.seq !== expectedSequence;
    this.lastRemoteSequence = envelope.seq;
    if (sequenceGap) {
      this.emit('sequence-gap', {
        expected: expectedSequence,
        received: envelope.seq,
        envelope
      });
      if (['hello', 'hello-ack'].includes(envelope.type)) {
        this._needsResyncAfterHandshake = this._hasEverReady;
      } else if (envelope.type === 'action') {
        this.requestResync({
          reason: `sequence-gap:${expectedSequence}-${envelope.seq}`,
          knownRevision: this.currentRevision
        }).catch(() => {});
        return;
      }
    }

    const handshakeType = ['hello', 'hello-ack', 'close', 'ping', 'pong'].includes(envelope.type);
    if (!handshakeType && !this.isReady) {
      this._emitProtocolError(
        'MESSAGE_BEFORE_HANDSHAKE',
        `Received ${envelope.type} before the handshake completed.`,
        envelope
      );
      return;
    }

    switch (envelope.type) {
      case 'hello':
        this._handleHello(envelope);
        break;
      case 'hello-ack':
        this._handleHelloAck(envelope);
        break;
      case 'action':
        await this._handleAction(envelope);
        break;
      case 'ack':
        this._handleActionAck(envelope);
        break;
      case 'resync-request':
        await this._handleResyncRequest(envelope);
        break;
      case 'resync-state':
        await this._handleResyncState(envelope);
        break;
      case 'ping':
        this._sendMessage('pong', { nonce: envelope.payload.nonce });
        break;
      case 'pong':
        this._handlePong(envelope);
        break;
      case 'close':
        this._handleRemoteClose(envelope);
        break;
      default:
        this._emitProtocolError('UNSUPPORTED_MESSAGE', envelope.type, envelope);
    }
    this.emit('incoming-message', envelope);
  }

  async _handleDuplicate(envelope) {
    if (envelope.type === 'action') {
      const cachedAck = this._actionAckCache.get(envelope.payload.actionId);
      if (cachedAck) this._sendMessage('ack', cachedAck);
    } else if (envelope.type === 'ping') {
      this._sendMessage('pong', { nonce: envelope.payload.nonce });
    }
    this.emit('duplicate-message', envelope);
  }

  _handshakeRejectionReason(payload) {
    if (payload.protocolVersion !== NETWORK_PROTOCOL_VERSION) {
      return 'Protocol version mismatch.';
    }
    if (payload.appVersion !== this.appVersion) return 'Application version mismatch.';
    if (payload.rulesVersion !== this.rulesVersion) return 'Rules version mismatch.';
    if (payload.rulesMode !== this.rulesMode) return 'Rules mode mismatch.';
    if (payload.role === this.role) return 'Both peers selected the same network role.';
    if (
      this.expectedRemoteDeckHash
      && payload.deckHash !== this.expectedRemoteDeckHash
    ) {
      return 'Remote deck hash does not match the expected commitment.';
    }
    return null;
  }

  _handleHello(envelope) {
    const reason = this._handshakeRejectionReason(envelope.payload);
    if (reason) {
      this._sendMessage('hello-ack', {
        accepted: false,
        reason,
        peerId: this.peerId,
        protocolVersion: NETWORK_PROTOCOL_VERSION
      });
      clearTimeout(this._handshakeTimer);
      this._setState('rejected', { reason });
      this.emit('incompatible-peer', { reason, handshake: envelope.payload });
      return;
    }

    this.remoteHandshake = Object.freeze({
      ...envelope.payload,
      peerId: envelope.peerId
    });
    this._sendMessage('hello-ack', {
      accepted: true,
      peerId: this.peerId,
      protocolVersion: NETWORK_PROTOCOL_VERSION,
      rulesVersion: this.rulesVersion,
      rulesMode: this.rulesMode
    });
    this._maybeReady();
  }

  _handleHelloAck(envelope) {
    if (!envelope.payload.accepted) {
      const reason = envelope.payload.reason || 'Remote peer rejected the handshake.';
      clearTimeout(this._handshakeTimer);
      this._setState('rejected', { reason });
      this.emit('incompatible-peer', { reason });
      return;
    }
    if (
      envelope.payload.protocolVersion !== NETWORK_PROTOCOL_VERSION
      || envelope.payload.rulesVersion !== this.rulesVersion
      || envelope.payload.rulesMode !== this.rulesMode
    ) {
      this._emitProtocolError(
        'INVALID_HANDSHAKE_ACK',
        'Remote acknowledgement confirmed incompatible rules.',
        envelope
      );
      return;
    }
    this.remoteAcceptedHandshake = true;
    this._maybeReady();
  }

  _maybeReady() {
    if (!this.remoteHandshake || !this.remoteAcceptedHandshake || this.closed) return;
    clearTimeout(this._handshakeTimer);
    this._handshakeTimer = null;
    const reconnect = this._hasEverReady;
    this._setState('ready', { reconnect });
    this._hasEverReady = true;
    this.emit('ready', {
      reconnect,
      sessionId: this.sessionId,
      peerId: this.peerId,
      remotePeerId: this.remotePeerId,
      remote: this.remoteHandshake
    });
    if (reconnect) this._resendPendingActions();
    if (this._needsResyncAfterHandshake) {
      this._needsResyncAfterHandshake = false;
      this.requestResync({
        reason: 'reconnect-sequence-gap',
        knownRevision: this.currentRevision
      }).catch(() => {});
    }
  }

  _assertReady() {
    if (!this.isReady) throw new Error('Duel network handshake is not ready.');
  }

  sendAction(action, {
    baseRevision = this.currentRevision,
    actionId = generateNetworkId(`${this.peerId}:action`)
  } = {}) {
    this._assertReady();
    if (this._pendingActions.size >= this.maxPendingActions) {
      throw new Error('Too many duel actions are waiting for acknowledgement.');
    }
    const actionValidation = validateJsonValue(action);
    if (!actionValidation.ok || !action || typeof action.kind !== 'string') {
      throw new TypeError(actionValidation.error || 'Action requires a kind.');
    }

    const payload = {
      actionId,
      baseRevision: Math.max(0, Number(baseRevision) || 0),
      action
    };
    const envelope = this._nextEnvelope('action', payload);
    const deferred = createDeferred();
    const pending = {
      actionId,
      payload,
      envelope,
      deferred,
      timer: null
    };
    this._pendingActions.set(actionId, pending);
    this._armActionTimeout(pending);
    try {
      this._sendEnvelope(envelope);
    } catch (error) {
      clearTimeout(pending.timer);
      this._pendingActions.delete(actionId);
      deferred.reject(error);
    }
    return deferred.promise;
  }

  _armActionTimeout(pending) {
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      if (!this._pendingActions.delete(pending.actionId)) return;
      const error = new Error(`Action acknowledgement timed out: ${pending.actionId}`);
      pending.deferred.reject(error);
      this.emit('action-timeout', {
        actionId: pending.actionId,
        action: pending.payload.action
      });
    }, this.actionAckTimeoutMs);
  }

  _resendPendingActions() {
    for (const pending of this._pendingActions.values()) {
      pending.envelope = this._nextEnvelope('action', pending.payload);
      this._armActionTimeout(pending);
      try {
        this._sendEnvelope(pending.envelope);
      } catch (error) {
        this.emit('transport-error', {
          code: 'ACTION_RESEND_FAILED',
          error,
          actionId: pending.actionId
        });
      }
    }
  }

  async _handleAction(envelope) {
    const { actionId, baseRevision, action } = envelope.payload;
    const cachedAck = this._actionAckCache.get(actionId);
    if (cachedAck) {
      this._sendMessage('ack', cachedAck);
      return;
    }
    if (this._incomingActions.has(actionId)) return;

    if (this.enforceRevision && baseRevision !== this.currentRevision) {
      this._sendActionAck(actionId, {
        accepted: false,
        revision: this.currentRevision,
        reason: `Revision mismatch: expected ${this.currentRevision}, received ${baseRevision}.`
      });
      this.emit('revision-mismatch', {
        actionId,
        expected: this.currentRevision,
        received: baseRevision
      });
      return;
    }

    if (this._incomingActions.size >= this.maxPendingActions) {
      this._sendActionAck(actionId, {
        accepted: false,
        revision: this.currentRevision,
        reason: 'Too many remote actions are already pending.'
      });
      return;
    }

    if (typeof this.actionValidator === 'function') {
      let validationResult;
      try {
        validationResult = await this.actionValidator(action, {
          actionId,
          baseRevision,
          peerId: envelope.peerId,
          currentRevision: this.currentRevision
        });
      } catch (error) {
        validationResult = error?.message || 'Action validator failed.';
      }
      if (validationResult !== true && validationResult?.ok !== true) {
        const reason = typeof validationResult === 'string'
          ? validationResult
          : (validationResult?.reason || 'Action is not legal in the current state.');
        this._sendActionAck(actionId, {
          accepted: false,
          revision: this.currentRevision,
          reason
        });
        return;
      }
    }

    let responded = false;
    const respond = result => {
      if (responded) return false;
      responded = true;
      const pendingInbound = this._incomingActions.get(actionId);
      clearTimeout(pendingInbound?.timer);
      this._incomingActions.delete(actionId);
      const normalized = normalizeActionResult(result, this.currentRevision);
      if (normalized.accepted) this.currentRevision = normalized.revision;
      try {
        this._sendActionAck(actionId, normalized);
      } catch (error) {
        this._emitProtocolError('ACTION_ACK_SERIALIZATION_ERROR', error, envelope);
        try {
          this._sendActionAck(actionId, {
            accepted: false,
            revision: this.currentRevision,
            reason: 'Action result could not be serialized.'
          });
        } catch (fallbackError) {
          this._emitProtocolError('ACTION_ACK_SEND_ERROR', fallbackError, envelope);
        }
      }
      return true;
    };
    const inbound = {
      actionId,
      timer: setTimeout(() => {
        respond({
          accepted: false,
          revision: this.currentRevision,
          reason: 'Remote action was not handled in time.'
        });
      }, this.inboundActionTimeoutMs)
    };
    this._incomingActions.set(actionId, inbound);

    if (typeof this.actionHandler === 'function') {
      try {
        const result = await this.actionHandler(action, {
          actionId,
          baseRevision,
          peerId: envelope.peerId,
          currentRevision: this.currentRevision
        });
        respond(result);
      } catch (error) {
        respond({
          accepted: false,
          revision: this.currentRevision,
          reason: error?.message || 'Action handler failed.'
        });
      }
      return;
    }

    const listenerCount = this.emit('action', {
      actionId,
      baseRevision,
      action,
      peerId: envelope.peerId,
      respond
    });
    if (listenerCount === 0) {
      respond({
        accepted: false,
        revision: this.currentRevision,
        reason: 'No action handler is installed.'
      });
    }
  }

  _sendActionAck(actionId, {
    accepted,
    revision = this.currentRevision,
    reason,
    result
  }) {
    const payload = {
      actionId,
      accepted: accepted === true,
      revision: Math.max(0, Number(revision) || 0)
    };
    if (reason !== undefined) payload.reason = String(reason).slice(0, 512);
    if (result !== undefined) payload.result = result;
    // Validate result before caching or sending it.
    const envelope = this._nextEnvelope('ack', payload);
    this._rememberActionAck(actionId, payload);
    this._sendEnvelope(envelope);
  }

  _rememberActionAck(actionId, payload) {
    this._actionAckCache.set(actionId, Object.freeze({ ...payload }));
    while (this._actionAckCache.size > 500) {
      this._actionAckCache.delete(this._actionAckCache.keys().next().value);
    }
  }

  _handleActionAck(envelope) {
    const pending = this._pendingActions.get(envelope.payload.actionId);
    if (!pending) {
      this.emit('orphan-ack', envelope.payload);
      return;
    }
    clearTimeout(pending.timer);
    this._pendingActions.delete(envelope.payload.actionId);
    if (envelope.payload.accepted) {
      if (Number.isSafeInteger(envelope.payload.revision)) {
        this.currentRevision = Math.max(this.currentRevision, envelope.payload.revision);
      }
      pending.deferred.resolve(envelope.payload);
    } else {
      const error = new Error(envelope.payload.reason || 'Remote peer rejected the action.');
      error.ack = envelope.payload;
      pending.deferred.reject(error);
    }
    this.emit('action-ack', envelope.payload);
  }

  requestResync({
    reason = 'manual-request',
    knownRevision = this.currentRevision,
    requestId = generateNetworkId(`${this.peerId}:resync`)
  } = {}) {
    this._assertReady();
    const deferred = createDeferred();
    const pending = {
      requestId,
      deferred,
      timer: setTimeout(() => {
        if (!this._pendingResyncs.delete(requestId)) return;
        deferred.reject(new Error(`Resync timed out: ${requestId}`));
      }, this.resyncTimeoutMs)
    };
    this._pendingResyncs.set(requestId, pending);
    try {
      this._sendMessage('resync-request', {
        requestId,
        knownRevision: Math.max(0, Number(knownRevision) || 0),
        reason: String(reason).slice(0, 512)
      });
    } catch (error) {
      clearTimeout(pending.timer);
      this._pendingResyncs.delete(requestId);
      deferred.reject(error);
    }
    deferred.promise.requestId = requestId;
    return deferred.promise;
  }

  async _handleResyncRequest(envelope) {
    const { requestId, knownRevision, reason } = envelope.payload;
    let responded = false;
    const respond = (state, revision = this.currentRevision) => {
      if (responded) return false;
      responded = true;
      this.sendResyncState({
        requestId,
        revision,
        state
      });
      return true;
    };

    if (typeof this.snapshotProvider === 'function') {
      try {
        const snapshot = await this.snapshotProvider({
          requestId,
          knownRevision,
          reason,
          peerId: envelope.peerId
        });
        if (snapshot?.state && Number.isSafeInteger(snapshot.revision)) {
          respond(snapshot.state, snapshot.revision);
        } else {
          respond(snapshot, this.currentRevision);
        }
      } catch (error) {
        this._emitProtocolError('SNAPSHOT_PROVIDER_ERROR', error, envelope);
      }
      return;
    }

    this.emit('resync-request', {
      requestId,
      knownRevision,
      reason,
      peerId: envelope.peerId,
      respond
    });
  }

  sendResyncState({ requestId, revision = this.currentRevision, state }) {
    this._assertReady();
    const validation = validateJsonValue(state, {
      maxDepth: 16,
      maxNodes: 10_000,
      maxArrayLength: 2000,
      maxObjectKeys: 1000
    });
    if (!validation.ok || !state || Array.isArray(state) || typeof state !== 'object') {
      throw new TypeError(validation.error || 'Resync state must be an object.');
    }
    this._sendMessage('resync-state', {
      requestId,
      revision: Math.max(0, Number(revision) || 0),
      state
    });
  }

  async _handleResyncState(envelope) {
    const { requestId, revision, state } = envelope.payload;
    try {
      if (typeof this.applySnapshot === 'function') {
        await this.applySnapshot(state, {
          requestId,
          revision,
          peerId: envelope.peerId
        });
      }
      this.currentRevision = revision;
      const pending = this._pendingResyncs.get(requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this._pendingResyncs.delete(requestId);
        pending.deferred.resolve({ requestId, revision, state });
      }
      this.emit('resync', { requestId, revision, state });
    } catch (error) {
      const pending = this._pendingResyncs.get(requestId);
      if (pending) {
        clearTimeout(pending.timer);
        this._pendingResyncs.delete(requestId);
        pending.deferred.reject(error);
      }
      this._emitProtocolError('SNAPSHOT_APPLY_ERROR', error, envelope);
    }
  }

  ping({ timeoutMs = 5_000 } = {}) {
    this._assertReady();
    const nonce = generateNetworkId(`${this.peerId}:ping`);
    const deferred = createDeferred();
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      if (!this._pendingPings.delete(nonce)) return;
      deferred.reject(new Error('Peer ping timed out.'));
    }, timeoutMs);
    this._pendingPings.set(nonce, { deferred, timer, startedAt });
    try {
      this._sendMessage('ping', { nonce });
    } catch (error) {
      clearTimeout(timer);
      this._pendingPings.delete(nonce);
      deferred.reject(error);
    }
    return deferred.promise;
  }

  _handlePong(envelope) {
    const pending = this._pendingPings.get(envelope.payload.nonce);
    if (!pending) return;
    clearTimeout(pending.timer);
    this._pendingPings.delete(envelope.payload.nonce);
    pending.deferred.resolve(Date.now() - pending.startedAt);
  }

  _handleRemoteClose(envelope) {
    const reason = envelope.payload.reason || 'remote-close';
    this.emit('remote-close', { reason, peerId: envelope.peerId });
    this._finishClose(reason, true);
  }

  close(reason = 'local-close') {
    if (this.closed) return;
    if (this.transport.readyState === 'open') {
      try {
        this._sendMessage('close', { reason: String(reason).slice(0, 512) });
      } catch {
        // Continue with a local deterministic close.
      }
    }
    this._finishClose(reason, true);
  }

  _finishClose(reason, closeTransport) {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this._handshakeTimer);
    this._handshakeTimer = null;
    this._unbindTransport();

    const closeError = new Error(`Network session closed: ${reason}`);
    for (const pending of this._pendingActions.values()) {
      clearTimeout(pending.timer);
      pending.deferred.reject(closeError);
    }
    this._pendingActions.clear();
    for (const pending of this._incomingActions.values()) clearTimeout(pending.timer);
    this._incomingActions.clear();
    for (const pending of this._pendingResyncs.values()) {
      clearTimeout(pending.timer);
      pending.deferred.reject(closeError);
    }
    this._pendingResyncs.clear();
    for (const pending of this._pendingPings.values()) {
      clearTimeout(pending.timer);
      pending.deferred.reject(closeError);
    }
    this._pendingPings.clear();
    this._setState('closed', { reason });
    if (closeTransport) {
      try {
        this.transport.close?.(reason);
      } catch {
        // Session state is already safely closed.
      }
    }
    this.emit('close', { reason });
  }

  async whenIdle() {
    await this._messageQueue;
    await Promise.resolve();
  }
}
