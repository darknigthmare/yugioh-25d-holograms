function normalizeZone(zone) {
  if (!Array.isArray(zone)) return [];
  return zone
    .map(card => String(card?.id ?? card))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

export function canonicalizeDeck(deck) {
  const normalized = Array.isArray(deck)
    ? { main: deck, extra: [], side: [] }
    : (deck || {});
  return JSON.stringify({
    main: normalizeZone(normalized.main),
    extra: normalizeZone(normalized.extra),
    side: normalizeZone(normalized.side)
  });
}

function fallbackHash(bytes) {
  // Deterministic fallback for older WebViews. It is only a mismatch detector,
  // never a cryptographic commitment.
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (const byte of bytes) {
    first = Math.imul(first ^ byte, 0x01000193);
    second = Math.imul(second ^ byte, 0x85ebca6b);
  }
  const pair = [first, second].map(value => (value >>> 0).toString(16).padStart(8, '0')).join('');
  return pair.repeat(4);
}

/**
 * Returns an order-independent hash of Main/Extra/Side Deck card identifiers.
 * It detects mismatches but cannot prove that an untrusted peer uses that deck.
 */
export async function computeDeckHash(deck) {
  const bytes = new TextEncoder().encode(canonicalizeDeck(deck));
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)]
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return fallbackHash(bytes);
}
