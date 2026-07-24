const SESSION_CODE_PREFIX = 'YGO-RTC1';
const MAX_SESSION_CODE_BYTES = 1_000_000;

function bytesToBase64(bytes) {
  if (typeof globalThis.btoa === 'function') {
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return globalThis.btoa(binary);
  }
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(bytes).toString('base64');
  }
  throw new Error('No Base64 encoder is available in this environment.');
}

function base64ToBytes(value) {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(value);
    return Uint8Array.from(binary, character => character.charCodeAt(0));
  }
  if (globalThis.Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(value, 'base64'));
  }
  throw new Error('No Base64 decoder is available in this environment.');
}

function toBase64Url(bytes) {
  return bytesToBase64(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
}

function fromBase64Url(value) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  return base64ToBytes(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
}

function fnv1a(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function assertToken(value, name, min = 1, max = 128) {
  if (
    typeof value !== 'string'
    || value.length < min
    || value.length > max
    || !/^[A-Za-z0-9_.:-]+$/u.test(value)
  ) {
    throw new TypeError(`${name} is not a valid session token.`);
  }
}

/**
 * Encodes a complete ICE-gathered SDP description into a copy/paste code.
 * The checksum detects accidental truncation; it is not a signature.
 */
export function encodeSessionCode({
  description,
  sessionId,
  peerId,
  kind = description?.type,
  channelLabel = 'ygo-duel-v1',
  createdAt = Date.now()
}) {
  if (!description || !['offer', 'answer'].includes(description.type)) {
    throw new TypeError('A WebRTC offer or answer is required.');
  }
  if (typeof description.sdp !== 'string' || description.sdp.length < 1) {
    throw new TypeError('The WebRTC session description has no SDP.');
  }
  assertToken(sessionId, 'sessionId', 8);
  assertToken(peerId, 'peerId');
  assertToken(channelLabel, 'channelLabel');
  if (!Number.isSafeInteger(Number(createdAt)) || Number(createdAt) < 0) {
    throw new TypeError('createdAt must be a valid timestamp.');
  }
  if (!['offer', 'answer', 'reconnect-offer', 'reconnect-answer'].includes(kind)) {
    throw new TypeError('Unsupported session code kind.');
  }

  const payload = JSON.stringify({
    format: 1,
    kind,
    sessionId,
    peerId,
    channelLabel,
    createdAt: Number(createdAt),
    description: {
      type: description.type,
      sdp: description.sdp
    }
  });
  const encoded = toBase64Url(new TextEncoder().encode(payload));
  if (encoded.length > MAX_SESSION_CODE_BYTES) {
    throw new RangeError('The generated session code is too large.');
  }
  return `${SESSION_CODE_PREFIX}.${encoded}.${fnv1a(encoded)}`;
}

export function decodeSessionCode(code) {
  if (typeof code !== 'string') {
    throw new TypeError('Session code must be a string.');
  }
  const compactCode = code.trim().replace(/\s+/gu, '');
  if (compactCode.length > MAX_SESSION_CODE_BYTES) {
    throw new RangeError('Session code is too large.');
  }
  const [prefix, encoded, checksum, ...extra] = compactCode.split('.');
  if (
    prefix !== SESSION_CODE_PREFIX
    || !encoded
    || !checksum
    || extra.length > 0
    || fnv1a(encoded) !== checksum.toLowerCase()
  ) {
    throw new Error('Invalid or corrupted session code.');
  }

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded)));
  } catch {
    throw new Error('Session code payload cannot be decoded.');
  }

  if (!payload || payload.format !== 1) {
    throw new Error('Unsupported session code format.');
  }
  assertToken(payload.sessionId, 'sessionId', 8);
  assertToken(payload.peerId, 'peerId');
  assertToken(payload.channelLabel, 'channelLabel');
  if (!Number.isSafeInteger(payload.createdAt) || payload.createdAt < 0) {
    throw new Error('Session code contains an invalid timestamp.');
  }
  if (!['offer', 'answer', 'reconnect-offer', 'reconnect-answer'].includes(payload.kind)) {
    throw new Error('Unsupported session code kind.');
  }
  if (
    !payload.description
    || !['offer', 'answer'].includes(payload.description.type)
    || typeof payload.description.sdp !== 'string'
    || payload.description.sdp.length < 1
  ) {
    throw new Error('Session code contains an invalid WebRTC description.');
  }
  return payload;
}

export function generateNetworkId(prefix = 'peer') {
  const randomId = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  return `${prefix}-${randomId}`.replace(/[^A-Za-z0-9_.:-]/gu, '-').slice(0, 128);
}

export const SESSION_CODE_VERSION = SESSION_CODE_PREFIX;
