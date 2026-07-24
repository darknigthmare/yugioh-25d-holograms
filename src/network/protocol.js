export const NETWORK_PROTOCOL_VERSION = 1;
export const MAX_NETWORK_MESSAGE_BYTES = 64 * 1024;

export const NETWORK_MESSAGE_TYPES = Object.freeze([
  'hello',
  'hello-ack',
  'action',
  'ack',
  'resync-request',
  'resync-state',
  'ping',
  'pong',
  'close'
]);

const MESSAGE_TYPE_SET = new Set(NETWORK_MESSAGE_TYPES);
const TOKEN_PATTERN = /^[A-Za-z0-9_.:-]+$/u;
const HASH_PATTERN = /^[A-Za-z0-9_-]{8,128}$/u;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isToken(value, { min = 1, max = 128 } = {}) {
  return (
    typeof value === 'string'
    && value.length >= min
    && value.length <= max
    && TOKEN_PATTERN.test(value)
  );
}

function isShortText(value, max = 512) {
  return typeof value === 'string' && value.length <= max;
}

function isSequence(value, allowZero = false) {
  return Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1);
}

/**
 * Bounds arbitrary action/snapshot data before it reaches game code. This is
 * structural validation, not semantic validation of Yu-Gi-Oh actions.
 */
export function validateJsonValue(value, limits = {}) {
  const {
    maxDepth = 12,
    maxNodes = 5000,
    maxArrayLength = 1000,
    maxObjectKeys = 500,
    maxStringLength = 32_768
  } = limits;
  let nodes = 0;

  function visit(current, depth) {
    nodes += 1;
    if (nodes > maxNodes) return 'JSON value contains too many nodes.';
    if (depth > maxDepth) return 'JSON value is nested too deeply.';
    if (current === null || typeof current === 'boolean') return null;
    if (typeof current === 'number') {
      return Number.isFinite(current) ? null : 'JSON numbers must be finite.';
    }
    if (typeof current === 'string') {
      return current.length <= maxStringLength ? null : 'JSON string is too long.';
    }
    if (Array.isArray(current)) {
      if (current.length > maxArrayLength) return 'JSON array is too large.';
      for (const item of current) {
        const error = visit(item, depth + 1);
        if (error) return error;
      }
      return null;
    }
    if (!isPlainObject(current)) return 'Value must be JSON-compatible.';
    const entries = Object.entries(current);
    if (entries.length > maxObjectKeys) return 'JSON object has too many keys.';
    for (const [key, item] of entries) {
      if (FORBIDDEN_KEYS.has(key)) return `Forbidden JSON key: ${key}.`;
      if (key.length > 128) return 'JSON object key is too long.';
      const error = visit(item, depth + 1);
      if (error) return error;
    }
    return null;
  }

  const error = visit(value, 0);
  return error ? { ok: false, error } : { ok: true };
}

function validateHello(payload) {
  if (
    !isToken(payload.appVersion, { max: 64 })
    || payload.protocolVersion !== NETWORK_PROTOCOL_VERSION
    || !isToken(payload.rulesVersion, { max: 64 })
    || !['strict', 'sandbox'].includes(payload.rulesMode)
    || typeof payload.deckHash !== 'string'
    || !HASH_PATTERN.test(payload.deckHash)
    || !['host', 'guest'].includes(payload.role)
  ) {
    return 'Invalid hello handshake.';
  }
  if (payload.capabilities !== undefined) {
    if (
      !Array.isArray(payload.capabilities)
      || payload.capabilities.length > 20
      || payload.capabilities.some(capability => !isToken(capability, { max: 64 }))
    ) {
      return 'Invalid handshake capabilities.';
    }
  }
  if (payload.resume !== undefined) {
    if (
      !isPlainObject(payload.resume)
      || !isSequence(payload.resume.lastLocalSeq, true)
      || !isSequence(payload.resume.lastRemoteSeq, true)
    ) {
      return 'Invalid reconnect resume information.';
    }
  }
  return null;
}

function validateHelloAck(payload) {
  if (
    typeof payload.accepted !== 'boolean'
    || !isToken(payload.peerId)
    || payload.protocolVersion !== NETWORK_PROTOCOL_VERSION
  ) {
    return 'Invalid hello acknowledgement.';
  }
  if (payload.reason !== undefined && !isShortText(payload.reason)) {
    return 'Invalid handshake rejection reason.';
  }
  if (payload.accepted && (
    !isToken(payload.rulesVersion, { max: 64 })
    || !['strict', 'sandbox'].includes(payload.rulesMode)
  )) {
    return 'Accepted handshake does not confirm its rules.';
  }
  return null;
}

function validateAction(payload) {
  if (
    !isToken(payload.actionId)
    || !isSequence(payload.baseRevision, true)
    || !isPlainObject(payload.action)
    || !isToken(payload.action.kind, { max: 96 })
  ) {
    return 'Invalid duel action.';
  }
  return validateJsonValue(payload.action).error || null;
}

function validateAck(payload) {
  if (!isToken(payload.actionId) || typeof payload.accepted !== 'boolean') {
    return 'Invalid action acknowledgement.';
  }
  if (payload.revision !== undefined && !isSequence(payload.revision, true)) {
    return 'Invalid acknowledged revision.';
  }
  if (payload.reason !== undefined && !isShortText(payload.reason)) {
    return 'Invalid acknowledgement reason.';
  }
  if (payload.result !== undefined) {
    return validateJsonValue(payload.result).error || null;
  }
  return null;
}

function validateResyncRequest(payload) {
  if (
    !isToken(payload.requestId)
    || !isSequence(payload.knownRevision, true)
    || (payload.reason !== undefined && !isShortText(payload.reason))
  ) {
    return 'Invalid resync request.';
  }
  return null;
}

function validateResyncState(payload) {
  if (
    !isToken(payload.requestId)
    || !isSequence(payload.revision, true)
    || !isPlainObject(payload.state)
  ) {
    return 'Invalid resync state.';
  }
  return validateJsonValue(payload.state, {
    maxDepth: 16,
    maxNodes: 10_000,
    maxArrayLength: 2000,
    maxObjectKeys: 1000,
    maxStringLength: 32_768
  }).error || null;
}

function validatePayload(type, payload) {
  if (!isPlainObject(payload)) return 'Message payload must be an object.';
  switch (type) {
    case 'hello': return validateHello(payload);
    case 'hello-ack': return validateHelloAck(payload);
    case 'action': return validateAction(payload);
    case 'ack': return validateAck(payload);
    case 'resync-request': return validateResyncRequest(payload);
    case 'resync-state': return validateResyncState(payload);
    case 'ping':
    case 'pong':
      return isToken(payload.nonce) ? null : 'Invalid ping/pong nonce.';
    case 'close':
      return payload.reason === undefined || isShortText(payload.reason)
        ? null
        : 'Invalid close reason.';
    default:
      return 'Unsupported message type.';
  }
}

export function createEnvelope({
  type,
  sessionId,
  peerId,
  seq,
  payload,
  timestamp = Date.now()
}) {
  const envelope = {
    v: NETWORK_PROTOCOL_VERSION,
    type,
    sessionId,
    peerId,
    seq,
    timestamp,
    payload
  };
  const validation = validateEnvelope(envelope);
  if (!validation.ok) {
    throw new TypeError(validation.error);
  }
  return envelope;
}

export function validateEnvelope(input, { maxBytes = MAX_NETWORK_MESSAGE_BYTES } = {}) {
  let envelope = input;
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).byteLength > maxBytes) {
      return { ok: false, code: 'MESSAGE_TOO_LARGE', error: 'Network message is too large.' };
    }
    try {
      envelope = JSON.parse(input);
    } catch {
      return { ok: false, code: 'INVALID_JSON', error: 'Network message is not valid JSON.' };
    }
  }
  if (!isPlainObject(envelope)) {
    return { ok: false, code: 'INVALID_ENVELOPE', error: 'Network message must be an object.' };
  }
  const allowedKeys = new Set(['v', 'type', 'sessionId', 'peerId', 'seq', 'timestamp', 'payload']);
  if (Object.keys(envelope).some(key => !allowedKeys.has(key))) {
    return { ok: false, code: 'UNKNOWN_ENVELOPE_FIELD', error: 'Network message has unknown fields.' };
  }
  if (
    envelope.v !== NETWORK_PROTOCOL_VERSION
    || !MESSAGE_TYPE_SET.has(envelope.type)
    || !isToken(envelope.sessionId, { min: 8 })
    || !isToken(envelope.peerId)
    || !isSequence(envelope.seq)
    || !Number.isSafeInteger(envelope.timestamp)
    || envelope.timestamp < 0
  ) {
    return { ok: false, code: 'INVALID_ENVELOPE', error: 'Network message envelope is invalid.' };
  }
  const payloadError = validatePayload(envelope.type, envelope.payload);
  if (payloadError) {
    return { ok: false, code: 'INVALID_PAYLOAD', error: payloadError };
  }
  if (typeof input !== 'string') {
    let serialized;
    try {
      serialized = JSON.stringify(envelope);
    } catch {
      return { ok: false, code: 'NOT_SERIALIZABLE', error: 'Network message is not serializable.' };
    }
    if (new TextEncoder().encode(serialized).byteLength > maxBytes) {
      return { ok: false, code: 'MESSAGE_TOO_LARGE', error: 'Network message is too large.' };
    }
  }
  return { ok: true, value: envelope };
}

export function serializeEnvelope(envelope) {
  const validation = validateEnvelope(envelope);
  if (!validation.ok) throw new TypeError(validation.error);
  return JSON.stringify(envelope);
}
