import { NetworkEmitter } from './emitter.js';
import {
  decodeSessionCode,
  encodeSessionCode,
  generateNetworkId
} from './session-code.js';

export const DEFAULT_DATA_CHANNEL_LABEL = 'ygo-duel-v1';

function defaultPeerConnectionFactory(configuration) {
  if (typeof globalThis.RTCPeerConnection !== 'function') {
    throw new Error('WebRTC is not available in this browser.');
  }
  return new globalThis.RTCPeerConnection(configuration);
}

function normalizeDescription(description) {
  return {
    type: description.type,
    sdp: description.sdp
  };
}

/**
 * Browser WebRTC transport with copy/paste SDP signaling. No application
 * signaling backend is required; STUN/TURN remains configurable for NAT
 * traversal.
 */
export class ManualWebRTCTransport extends NetworkEmitter {
  constructor({
    sessionId = null,
    peerId = generateNetworkId('peer'),
    channelLabel = DEFAULT_DATA_CHANNEL_LABEL,
    rtcConfiguration = { iceServers: [] },
    peerConnectionFactory = defaultPeerConnectionFactory,
    iceGatheringTimeoutMs = 15_000,
    disconnectGraceMs = 5_000
  } = {}) {
    super();
    this.sessionId = sessionId || generateNetworkId('session');
    this.peerId = peerId;
    this.remotePeerId = null;
    this.channelLabel = channelLabel;
    this.rtcConfiguration = rtcConfiguration;
    this.peerConnectionFactory = peerConnectionFactory;
    this.iceGatheringTimeoutMs = iceGatheringTimeoutMs;
    this.disconnectGraceMs = disconnectGraceMs;

    this.peerConnection = null;
    this.dataChannel = null;
    this.state = 'idle';
    this.closed = false;
    this._sessionIdLocked = Boolean(sessionId);
    this._disconnectTimer = null;
    this._channelOpenEmitted = false;
  }

  get readyState() {
    return this.dataChannel?.readyState || (this.closed ? 'closed' : 'connecting');
  }

  _setState(state, detail = {}) {
    if (this.state === state) return;
    this.state = state;
    this.emit('statechange', { state, ...detail });
  }

  _ensurePeerConnection() {
    if (this.closed) throw new Error('WebRTC transport is closed.');
    if (this.peerConnection) return this.peerConnection;

    const peerConnection = this.peerConnectionFactory(this.rtcConfiguration);
    if (!peerConnection) {
      throw new Error('peerConnectionFactory did not return a connection.');
    }
    this.peerConnection = peerConnection;
    this._setState('connecting');

    peerConnection.ondatachannel = event => {
      if (!event?.channel || event.channel.label !== this.channelLabel) {
        event?.channel?.close?.();
        this.emit('error', {
          code: 'UNEXPECTED_DATA_CHANNEL',
          error: new Error('Peer opened an unexpected data channel.')
        });
        return;
      }
      this._attachDataChannel(event.channel);
    };
    peerConnection.onconnectionstatechange = () => this._handleConnectionState();
    peerConnection.oniceconnectionstatechange = () => this._handleConnectionState();
    peerConnection.onsignalingstatechange = () => {
      this.emit('signalingstatechange', {
        state: peerConnection.signalingState
      });
    };
    return peerConnection;
  }

  _attachDataChannel(channel) {
    if (
      channel.ordered === false
      || (channel.maxRetransmits !== null && channel.maxRetransmits !== undefined)
      || (channel.maxPacketLifeTime !== null && channel.maxPacketLifeTime !== undefined)
    ) {
      channel.close?.();
      this.emit('error', {
        code: 'UNRELIABLE_DATA_CHANNEL',
        error: new Error('Duel channel must be reliable and ordered.')
      });
      return;
    }
    if (this.dataChannel && this.dataChannel !== channel) {
      this.dataChannel.close?.();
    }
    this.dataChannel = channel;
    this._channelOpenEmitted = false;
    try {
      channel.binaryType = 'arraybuffer';
    } catch {
      // Some mocks expose a read-only binaryType.
    }

    channel.onopen = () => {
      if (this.closed || this._channelOpenEmitted) return;
      this._channelOpenEmitted = true;
      this._setState('open');
      this.emit('open', {
        sessionId: this.sessionId,
        peerId: this.peerId,
        remotePeerId: this.remotePeerId
      });
    };
    channel.onmessage = event => this._emitChannelMessage(event?.data);
    channel.onerror = event => {
      this.emit('error', {
        code: 'DATA_CHANNEL_ERROR',
        error: event?.error || new Error('WebRTC data channel failed.')
      });
    };
    channel.onclosing = () => this._setState('closing');
    channel.onclose = () => {
      if (this.closed) return;
      this._setState('reconnecting');
      this.emit('close', {
        recoverable: true,
        reason: 'data-channel-closed'
      });
    };

    if (channel.readyState === 'open') queueMicrotask(() => channel.onopen?.());
  }

  async _emitChannelMessage(data) {
    try {
      let message = data;
      if (data instanceof ArrayBuffer) {
        message = new TextDecoder().decode(new Uint8Array(data));
      } else if (ArrayBuffer.isView(data)) {
        message = new TextDecoder().decode(
          new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        );
      } else if (data && typeof data.text === 'function') {
        message = await data.text();
      }
      if (typeof message !== 'string') {
        throw new TypeError('Duel data channel only accepts text messages.');
      }
      this.emit('message', message);
    } catch (error) {
      this.emit('error', {
        code: 'INVALID_DATA_CHANNEL_MESSAGE',
        error
      });
    }
  }

  _handleConnectionState() {
    if (!this.peerConnection || this.closed) return;
    const state = this.peerConnection.connectionState
      || this.peerConnection.iceConnectionState;
    this.emit('connectionstatechange', { state });

    if (state === 'connected' || state === 'completed') {
      clearTimeout(this._disconnectTimer);
      this._disconnectTimer = null;
      if (this.dataChannel?.readyState === 'open') this._setState('open');
      return;
    }
    if (state === 'disconnected') {
      this._setState('reconnecting');
      this.emit('reconnecting', { reason: 'ice-disconnected' });
      clearTimeout(this._disconnectTimer);
      this._disconnectTimer = setTimeout(() => {
        if (
          !this.closed
          && ['disconnected', 'failed'].includes(
            this.peerConnection?.connectionState || this.peerConnection?.iceConnectionState
          )
        ) {
          this.emit('reconnect-needed', { reason: 'ice-timeout' });
        }
      }, this.disconnectGraceMs);
      return;
    }
    if (state === 'failed') {
      this._setState('reconnecting');
      this.emit('reconnecting', { reason: 'ice-failed' });
      this.emit('reconnect-needed', { reason: 'ice-failed' });
      return;
    }
    if (state === 'closed') {
      this._setState('closed');
      this.emit('close', { recoverable: false, reason: 'peer-connection-closed' });
    }
  }

  async _waitForIceGathering() {
    const peerConnection = this.peerConnection;
    if (!peerConnection || peerConnection.iceGatheringState === 'complete') return;

    await new Promise((resolve, reject) => {
      let pollTimer = null;
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('ICE gathering timed out. Check STUN/TURN configuration.'));
      }, this.iceGatheringTimeoutMs);
      const check = () => {
        if (peerConnection.iceGatheringState === 'complete') {
          cleanup();
          resolve();
        }
      };
      const cleanup = () => {
        clearTimeout(timeout);
        clearInterval(pollTimer);
        peerConnection.removeEventListener?.('icegatheringstatechange', check);
      };
      peerConnection.addEventListener?.('icegatheringstatechange', check);
      pollTimer = setInterval(check, 50);
      check();
    });
  }

  _ensureLocalDataChannel() {
    const peerConnection = this._ensurePeerConnection();
    if (!this.dataChannel || this.dataChannel.readyState === 'closed') {
      const channel = peerConnection.createDataChannel(this.channelLabel, {
        ordered: true
      });
      this._attachDataChannel(channel);
    }
  }

  async createOfferCode({ iceRestart = false } = {}) {
    const peerConnection = this._ensurePeerConnection();
    this._ensureLocalDataChannel();
    if (iceRestart) peerConnection.restartIce?.();
    const description = await peerConnection.createOffer(
      iceRestart ? { iceRestart: true } : undefined
    );
    await peerConnection.setLocalDescription(description);
    await this._waitForIceGathering();
    this._sessionIdLocked = true;
    return encodeSessionCode({
      description: normalizeDescription(peerConnection.localDescription || description),
      sessionId: this.sessionId,
      peerId: this.peerId,
      channelLabel: this.channelLabel,
      kind: iceRestart ? 'reconnect-offer' : 'offer'
    });
  }

  async acceptOfferCode(code, { reconnect = false } = {}) {
    const decoded = decodeSessionCode(code);
    const expectedKind = reconnect ? 'reconnect-offer' : 'offer';
    if (decoded.kind !== expectedKind || decoded.description.type !== 'offer') {
      throw new Error(`Expected a ${expectedKind} session code.`);
    }
    if (decoded.channelLabel !== this.channelLabel) {
      throw new Error('Peer uses an incompatible data channel label.');
    }
    if (this._sessionIdLocked && this.sessionId !== decoded.sessionId) {
      throw new Error('Session code belongs to a different duel.');
    }
    this.sessionId = decoded.sessionId;
    this._sessionIdLocked = true;
    this.remotePeerId = decoded.peerId;

    const peerConnection = this._ensurePeerConnection();
    await peerConnection.setRemoteDescription(decoded.description);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await this._waitForIceGathering();
    return encodeSessionCode({
      description: normalizeDescription(peerConnection.localDescription || answer),
      sessionId: this.sessionId,
      peerId: this.peerId,
      channelLabel: this.channelLabel,
      kind: reconnect ? 'reconnect-answer' : 'answer'
    });
  }

  async acceptAnswerCode(code, { reconnect = false } = {}) {
    const decoded = decodeSessionCode(code);
    const expectedKind = reconnect ? 'reconnect-answer' : 'answer';
    if (decoded.kind !== expectedKind || decoded.description.type !== 'answer') {
      throw new Error(`Expected a ${expectedKind} session code.`);
    }
    if (decoded.sessionId !== this.sessionId) {
      throw new Error('Answer belongs to a different duel.');
    }
    if (decoded.channelLabel !== this.channelLabel) {
      throw new Error('Peer uses an incompatible data channel label.');
    }
    this.remotePeerId = decoded.peerId;
    const peerConnection = this._ensurePeerConnection();
    await peerConnection.setRemoteDescription(decoded.description);
    return true;
  }

  createReconnectOfferCode() {
    return this.createOfferCode({ iceRestart: true });
  }

  acceptReconnectOfferCode(code) {
    return this.acceptOfferCode(code, { reconnect: true });
  }

  acceptReconnectAnswerCode(code) {
    return this.acceptAnswerCode(code, { reconnect: true });
  }

  send(message) {
    if (this.closed || this.dataChannel?.readyState !== 'open') {
      throw new Error('WebRTC data channel is not open.');
    }
    if (typeof message !== 'string') {
      throw new TypeError('WebRTC duel messages must be serialized text.');
    }
    this.dataChannel.send(message);
  }

  close(reason = 'local-close') {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this._disconnectTimer);
    this._disconnectTimer = null;
    try {
      this.dataChannel?.close?.();
    } catch {
      // Continue closing the peer connection.
    }
    try {
      this.peerConnection?.close?.();
    } catch {
      // The transport is locally closed even if the browser object failed.
    }
    this._setState('closed', { reason });
    this.emit('close', { recoverable: false, reason });
  }
}
