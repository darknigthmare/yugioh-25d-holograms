import { computeDeckHash } from './deck-hash.js';
import { DuelNetworkSession } from './duel-network-session.js';
import { NetworkEmitter } from './emitter.js';
import { validateJsonValue } from './protocol.js';
import { ManualWebRTCTransport } from './webrtc-transport.js';

const STATUS_PHASES = new Set([
  'idle',
  'preparing',
  'creating-offer',
  'offer-ready',
  'creating-answer',
  'answer-ready',
  'connecting',
  'handshaking',
  'ready',
  'reconnecting',
  'reconnect-offer-ready',
  'reconnect-answer-ready',
  'rejected',
  'closed',
  'error'
]);

const EMPTY_CALLBACKS = Object.freeze({});

function asError(error, fallback = 'Online duel operation failed.') {
  return error instanceof Error ? error : new Error(String(error || fallback));
}

function clonePublicState(state) {
  const validation = validateJsonValue(state, {
    maxDepth: 16,
    maxNodes: 10_000,
    maxArrayLength: 2000,
    maxObjectKeys: 1000
  });
  if (
    !validation.ok
    || !state
    || Array.isArray(state)
    || typeof state !== 'object'
  ) {
    throw new TypeError(validation.error || 'Public snapshot must be an object.');
  }
  return JSON.parse(JSON.stringify(state));
}

function normalizeSnapshot(snapshot, fallbackRevision) {
  const hasEnvelope = (
    snapshot
    && typeof snapshot === 'object'
    && !Array.isArray(snapshot)
    && Object.hasOwn(snapshot, 'state')
  );
  const state = hasEnvelope ? snapshot.state : snapshot;
  const revision = hasEnvelope && Number.isSafeInteger(snapshot.revision)
    ? Math.max(0, snapshot.revision)
    : Math.max(0, Number(fallbackRevision) || 0);
  return {
    revision,
    state: clonePublicState(state)
  };
}

/**
 * UI-facing orchestration for manual WebRTC signaling and DuelNetworkSession.
 *
 * The controller deliberately knows nothing about DuelGame internals. The
 * caller must inject legal-action and public-snapshot adapters.
 */
export class OnlineDuelController extends NetworkEmitter {
  constructor({
    appVersion,
    rulesVersion,
    rtcConfiguration = { iceServers: [] },
    transportFactory = options => new ManualWebRTCTransport(options),
    sessionFactory = options => new DuelNetworkSession(options),
    callbacks = EMPTY_CALLBACKS,
    validateRemoteAction = null,
    applyRemoteAction = null,
    buildPublicSnapshot = null,
    applyPublicSnapshot = null,
    sessionOptions = {}
  } = {}) {
    super();
    if (typeof appVersion !== 'string' || !appVersion) {
      throw new TypeError('OnlineDuelController requires appVersion.');
    }
    if (typeof rulesVersion !== 'string' || !rulesVersion) {
      throw new TypeError('OnlineDuelController requires rulesVersion.');
    }
    if (typeof transportFactory !== 'function' || typeof sessionFactory !== 'function') {
      throw new TypeError('Controller factories must be functions.');
    }

    this.appVersion = appVersion;
    this.rulesVersion = rulesVersion;
    this.rtcConfiguration = rtcConfiguration;
    this.transportFactory = transportFactory;
    this.sessionFactory = sessionFactory;
    this.callbacks = { ...callbacks };
    this.validateRemoteAction = validateRemoteAction;
    this.applyRemoteAction = applyRemoteAction;
    this.buildPublicSnapshot = buildPublicSnapshot;
    this.applyPublicSnapshot = applyPublicSnapshot;
    this.sessionOptions = { ...sessionOptions };

    this.transport = null;
    this.session = null;
    this.role = null;
    this.rulesMode = null;
    this.deckHash = null;
    this.expectedRemoteDeckHash = null;
    this.codes = new Map();
    this.lastCodeKind = null;
    this._sessionUnsubscribers = [];
    this._operationGeneration = 0;
    this._closed = false;
    this._status = Object.freeze({
      phase: 'idle',
      role: null,
      ready: false,
      sessionId: null,
      peerId: null,
      remotePeerId: null,
      rulesMode: null,
      revision: 0,
      pendingActions: 0,
      codeKind: null,
      hasExportableCode: false,
      error: null
    });
  }

  get status() {
    return this._status;
  }

  get isReady() {
    return Boolean(this.session?.isReady);
  }

  setCallbacks(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    return this;
  }

  _callUiCallback(name, payload) {
    const callback = this.callbacks[name];
    if (typeof callback !== 'function') return;
    try {
      const result = callback(payload, this);
      if (result && typeof result.catch === 'function') {
        result.catch(error => {
          this.emit('ui-callback-error', { name, error: asError(error) });
        });
      }
    } catch (error) {
      this.emit('ui-callback-error', { name, error });
    }
  }

  _setStatus(phase, detail = {}) {
    if (!STATUS_PHASES.has(phase)) {
      throw new TypeError(`Unsupported online status: ${phase}`);
    }
    this._status = Object.freeze({
      ...this._status,
      ...detail,
      phase,
      role: this.role,
      ready: phase === 'ready',
      sessionId: this.session?.sessionId || this.transport?.sessionId || null,
      peerId: this.session?.peerId || this.transport?.peerId || null,
      remotePeerId: this.session?.remotePeerId || this.transport?.remotePeerId || null,
      rulesMode: this.rulesMode,
      revision: this.session?.currentRevision
        ?? detail.revision
        ?? this._status.revision,
      codeKind: this.lastCodeKind,
      hasExportableCode: Boolean(
        this.lastCodeKind && this.codes.get(this.lastCodeKind)
      )
    });
    this.emit('status', this._status);
    this._callUiCallback('onStatus', this._status);
    return this._status;
  }

  _reportError(error, { fatal = false, operation = null } = {}) {
    const normalized = asError(error);
    if (fatal) {
      this._setStatus('error', {
        error: normalized.message,
        operation
      });
    }
    const detail = { error: normalized, fatal, operation };
    this.emit('error', detail);
    this._callUiCallback('onError', detail);
    return normalized;
  }

  async _resolveDeckHash(deck, explicitHash) {
    if (explicitHash !== undefined && explicitHash !== null) {
      if (
        typeof explicitHash !== 'string'
        || !/^[A-Za-z0-9_-]{8,128}$/u.test(explicitHash)
      ) {
        throw new TypeError('deckHash is invalid.');
      }
      return explicitHash;
    }
    if (!deck) throw new TypeError('A deck or deckHash is required.');
    return computeDeckHash(deck);
  }

  _teardownCurrent(reason = 'controller-reset') {
    for (const unsubscribe of this._sessionUnsubscribers) {
      try {
        unsubscribe();
      } catch {
        // Continue tearing down all owned resources.
      }
    }
    this._sessionUnsubscribers = [];
    try {
      this.session?.close?.(reason);
    } catch {
      // The transport is closed independently below.
    }
    try {
      this.transport?.close?.(reason);
    } catch {
      // Local controller state is still reset deterministically.
    }
    this.session = null;
    this.transport = null;
    this.codes.clear();
    this.lastCodeKind = null;
  }

  async _prepare({
    role,
    rulesMode,
    deck,
    deckHash,
    expectedRemoteDeckHash,
    sessionId,
    peerId,
    rtcConfiguration
  }) {
    if (!['host', 'guest'].includes(role)) {
      throw new TypeError('Online role must be host or guest.');
    }
    if (!['strict', 'sandbox'].includes(rulesMode)) {
      throw new TypeError('rulesMode must be strict or sandbox.');
    }
    this._operationGeneration += 1;
    const generation = this._operationGeneration;
    this._teardownCurrent('new-online-operation');
    this._closed = false;
    this.role = role;
    this.rulesMode = rulesMode;
    this.expectedRemoteDeckHash = expectedRemoteDeckHash ?? null;
    this._setStatus('preparing', {
      error: null,
      pendingActions: 0,
      revision: 0,
      remote: null
    });
    this.deckHash = await this._resolveDeckHash(deck, deckHash);
    if (generation !== this._operationGeneration) {
      throw new Error('Online operation was superseded.');
    }

    this.transport = this.transportFactory({
      role,
      sessionId,
      peerId,
      rtcConfiguration: rtcConfiguration || this.rtcConfiguration
    });
    if (!this.transport) throw new Error('transportFactory returned no transport.');
    return generation;
  }

  _createSession() {
    if (!this.transport) throw new Error('Online transport is not prepared.');
    const controller = this;
    const hasSnapshotProvider = typeof this.buildPublicSnapshot === 'function';
    const hasSnapshotConsumer = typeof this.applyPublicSnapshot === 'function';

    this.session = this.sessionFactory({
      ...this.sessionOptions,
      transport: this.transport,
      role: this.role,
      appVersion: this.appVersion,
      rulesVersion: this.rulesVersion,
      rulesMode: this.rulesMode,
      deckHash: this.deckHash,
      expectedRemoteDeckHash: this.expectedRemoteDeckHash,
      async actionValidator(action, meta) {
        if (typeof controller.validateRemoteAction !== 'function') {
          return {
            ok: false,
            reason: 'No remote action validator is configured.'
          };
        }
        return controller.validateRemoteAction(action, meta, controller);
      },
      async actionHandler(action, meta) {
        if (typeof controller.applyRemoteAction !== 'function') {
          return {
            accepted: false,
            revision: controller.session?.currentRevision || 0,
            reason: 'No remote action handler is configured.'
          };
        }
        const result = await controller.applyRemoteAction(action, meta, controller);
        controller.emit('remote-action', { action, meta, result });
        controller._callUiCallback('onRemoteAction', { action, meta, result });
        return result;
      },
      snapshotProvider: hasSnapshotProvider
        ? async request => controller.exportPublicSnapshot({
          reason: request.reason,
          requestId: request.requestId,
          remotePeerId: request.peerId
        })
        : null,
      applySnapshot: hasSnapshotConsumer
        ? async (state, meta) => {
          const publicState = clonePublicState(state);
          await controller.applyPublicSnapshot(publicState, meta, controller);
          controller.emit('snapshot-applied', { state: publicState, meta });
          controller._callUiCallback('onSnapshot', {
            state: publicState,
            meta,
            direction: 'incoming'
          });
        }
        : null
    });
    this._bindSessionEvents();
    this.session.start();
    return this.session;
  }

  _bindSessionEvents() {
    const session = this.session;
    const bind = (type, listener) => {
      const unsubscribe = session.on(type, listener);
      this._sessionUnsubscribers.push(unsubscribe);
    };

    bind('statechange', event => {
      const phaseMap = {
        connecting: 'connecting',
        handshaking: 'handshaking',
        ready: 'ready',
        reconnecting: 'reconnecting',
        rejected: 'rejected',
        closed: 'closed'
      };
      const phase = phaseMap[event.state];
      if (phase) this._setStatus(phase, {
        error: event.reason || null
      });
    });
    bind('ready', event => {
      this._setStatus('ready', {
        remote: event.remote,
        error: null
      });
      this.emit('ready', event);
      this._callUiCallback('onReady', event);
    });
    bind('action-ack', acknowledgement => {
      this._setStatus(this.session.isReady ? 'ready' : this._status.phase);
      this.emit('action-ack', acknowledgement);
      this._callUiCallback('onActionAck', acknowledgement);
    });
    bind('outgoing-message', envelope => {
      // DuelNetworkSession advances its authoritative revision immediately
      // before serializing an ACK for an accepted remote action.
      if (envelope.type === 'ack') {
        this._setStatus(this.session.isReady ? 'ready' : this._status.phase);
      }
    });
    bind('action-timeout', event => {
      this.emit('action-timeout', event);
      this._callUiCallback('onActionTimeout', event);
    });
    bind('resync', event => {
      this._setStatus(this.session.isReady ? 'ready' : this._status.phase);
      this.emit('snapshot', event);
    });
    bind('resync-request', event => {
      this.emit('snapshot-request', event);
      this._callUiCallback('onSnapshotRequest', event);
    });
    bind('sequence-gap', event => {
      this._setStatus('reconnecting', {
        error: 'Synchronisation interrompue : resynchronisation requise.'
      });
      this.emit('sequence-gap', event);
      this._callUiCallback('onSequenceGap', event);
    });
    bind('reconnect-needed', event => {
      this._setStatus('reconnecting', {
        error: event.reason || 'Reconnexion manuelle requise.'
      });
      this.emit('reconnect-needed', event);
      this._callUiCallback('onReconnectNeeded', event);
    });
    bind('incompatible-peer', event => {
      this._setStatus('rejected', { error: event.reason });
      this.emit('rejected', event);
      this._callUiCallback('onRejected', event);
    });
    bind('protocol-error', event => this._reportError(event.error, {
      fatal: false,
      operation: event.code
    }));
    bind('transport-error', event => this._reportError(event.error, {
      fatal: false,
      operation: event.code || 'transport'
    }));
    bind('remote-close', event => {
      this._setStatus('closed', { error: event.reason || null });
      this.emit('remote-close', event);
      this._callUiCallback('onRemoteClose', event);
    });
    bind('close', event => {
      this._setStatus('closed', { error: null });
      this.emit('session-close', event);
      this._callUiCallback('onClose', event);
    });
  }

  _storeCode(kind, code) {
    if (typeof code !== 'string' || !code) {
      throw new TypeError(`Transport produced no ${kind} code.`);
    }
    this.codes.set(kind, code);
    this.lastCodeKind = kind;
    this.emit('code', { kind, code });
    this._callUiCallback('onCode', { kind, code });
    return code;
  }

  async host({
    rulesMode = 'strict',
    deck = null,
    deckHash = null,
    expectedRemoteDeckHash = null,
    sessionId = undefined,
    peerId = undefined,
    rtcConfiguration = undefined
  } = {}) {
    try {
      const generation = await this._prepare({
        role: 'host',
        rulesMode,
        deck,
        deckHash,
        expectedRemoteDeckHash,
        sessionId,
        peerId,
        rtcConfiguration
      });
      this._createSession();
      this._setStatus('creating-offer');
      const code = await this.transport.createOfferCode();
      if (generation !== this._operationGeneration) {
        throw new Error('Host operation was superseded.');
      }
      this._storeCode('offer', code);
      this._setStatus('offer-ready', { error: null });
      return code;
    } catch (error) {
      throw this._reportError(error, { fatal: true, operation: 'host' });
    }
  }

  async join(offerCode, {
    rulesMode = 'strict',
    deck = null,
    deckHash = null,
    expectedRemoteDeckHash = null,
    peerId = undefined,
    rtcConfiguration = undefined
  } = {}) {
    try {
      const generation = await this._prepare({
        role: 'guest',
        rulesMode,
        deck,
        deckHash,
        expectedRemoteDeckHash,
        peerId,
        rtcConfiguration
      });
      this._setStatus('creating-answer');
      const answerCode = await this.transport.acceptOfferCode(offerCode);
      if (generation !== this._operationGeneration) {
        throw new Error('Join operation was superseded.');
      }
      // acceptOfferCode imports the host sessionId before the protocol session
      // is constructed.
      this._createSession();
      this._storeCode('answer', answerCode);
      this._setStatus('answer-ready', { error: null });
      return answerCode;
    } catch (error) {
      throw this._reportError(error, { fatal: true, operation: 'join' });
    }
  }

  async acceptAnswer(answerCode) {
    if (this.role !== 'host' || !this.transport || !this.session) {
      throw new Error('Only a prepared host can accept an answer.');
    }
    try {
      await this.transport.acceptAnswerCode(answerCode);
      this.codes.set('answer', answerCode);
      if (!this.session.isReady) this._setStatus('connecting', { error: null });
      return true;
    } catch (error) {
      throw this._reportError(error, {
        fatal: true,
        operation: 'accept-answer'
      });
    }
  }

  exportCode(kind = 'current') {
    const resolvedKind = kind === 'current' ? this.lastCodeKind : kind;
    const code = resolvedKind ? this.codes.get(resolvedKind) : null;
    if (!code) throw new Error(`No exportable ${resolvedKind || 'session'} code is available.`);
    return code;
  }

  async createReconnectOffer() {
    if (!this.transport || !this.session) throw new Error('No online duel exists.');
    try {
      this._setStatus('reconnecting', { error: null });
      const code = await this.transport.createReconnectOfferCode();
      this._storeCode('reconnect-offer', code);
      this._setStatus('reconnect-offer-ready', { error: null });
      return code;
    } catch (error) {
      throw this._reportError(error, {
        fatal: false,
        operation: 'create-reconnect-offer'
      });
    }
  }

  async acceptReconnectOffer(offerCode) {
    if (!this.transport || !this.session) throw new Error('No online duel exists.');
    try {
      this._setStatus('reconnecting', { error: null });
      const answerCode = await this.transport.acceptReconnectOfferCode(offerCode);
      this._storeCode('reconnect-answer', answerCode);
      this._setStatus('reconnect-answer-ready', { error: null });
      return answerCode;
    } catch (error) {
      throw this._reportError(error, {
        fatal: false,
        operation: 'accept-reconnect-offer'
      });
    }
  }

  async acceptReconnectAnswer(answerCode) {
    if (!this.transport || !this.session) throw new Error('No online duel exists.');
    try {
      await this.transport.acceptReconnectAnswerCode(answerCode);
      this.codes.set('reconnect-answer', answerCode);
      if (!this.session.isReady) this._setStatus('connecting', { error: null });
      return true;
    } catch (error) {
      throw this._reportError(error, {
        fatal: false,
        operation: 'accept-reconnect-answer'
      });
    }
  }

  async sendAction(action, options = {}) {
    if (!this.session?.isReady) throw new Error('Online duel is not ready.');
    this._setStatus('ready', {
      pendingActions: this._status.pendingActions + 1
    });
    this.emit('action-pending', { action, options });
    this._callUiCallback('onActionPending', { action, options });
    try {
      return await this.session.sendAction(action, options);
    } catch (error) {
      const detail = { action, options, error: asError(error) };
      this.emit('action-rejected', detail);
      this._callUiCallback('onActionRejected', detail);
      throw detail.error;
    } finally {
      this._setStatus(this.session?.isReady ? 'ready' : this._status.phase, {
        pendingActions: Math.max(0, this._status.pendingActions - 1)
      });
    }
  }

  async exportPublicSnapshot(context = {}) {
    if (typeof this.buildPublicSnapshot !== 'function') {
      throw new Error('No public snapshot builder is configured.');
    }
    const snapshot = await this.buildPublicSnapshot({
      role: this.role,
      sessionId: this.session?.sessionId || this.transport?.sessionId,
      localPeerId: this.session?.peerId || this.transport?.peerId,
      remotePeerId: this.session?.remotePeerId || this.transport?.remotePeerId,
      rulesMode: this.rulesMode,
      revision: this.session?.currentRevision || 0,
      ...context
    }, this);
    const normalized = normalizeSnapshot(
      snapshot,
      this.session?.currentRevision || 0
    );
    this.emit('snapshot-exported', normalized);
    this._callUiCallback('onSnapshot', {
      ...normalized,
      direction: 'outgoing'
    });
    return normalized;
  }

  requestPublicSnapshot(reason = 'manual-request') {
    if (!this.session?.isReady) throw new Error('Online duel is not ready.');
    return this.session.requestResync({
      reason,
      knownRevision: this.session.currentRevision
    });
  }

  ping(options) {
    if (!this.session?.isReady) throw new Error('Online duel is not ready.');
    return this.session.ping(options);
  }

  close(reason = 'controller-close') {
    if (this._closed) return;
    this._closed = true;
    this._operationGeneration += 1;
    this._teardownCurrent(reason);
    this._setStatus('closed', {
      error: null,
      pendingActions: 0
    });
    this.emit('close', { reason });
    this._callUiCallback('onClose', { reason });
  }
}
