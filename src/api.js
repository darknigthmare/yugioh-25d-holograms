import { STARTER_CARDS, EXTRA_DECK_CARDS } from './cards.js';

const API_BASE_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

// Cache in localStorage to respect YGOPRODeck's guidelines and avoid rate-limiting
const CACHE_PREFIX = 'ygo_card_';
const CACHE_VERSION = 4;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 150;
const REQUEST_TIMEOUT_MS = 8000;
const LOCAL_CARDS = [...STARTER_CARDS, ...EXTRA_DECK_CARDS];

function cardId(value) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  return /^\d{1,10}$/.test(text) ? String(Number(text)) : null;
}

function textValue(value, fallback, maxLength = 128) {
  return typeof value === 'string' && value.trim() ? value.slice(0, maxLength) : fallback;
}

function numericValue(value, fallback = 0, maximum = 999999) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(-1, Math.min(maximum, Math.trunc(value))) : fallback;
}

function resultLimit(value) {
  return Number.isFinite(value) ? Math.max(1, Math.min(Math.trunc(value), 50)) : 30;
}

// The deadline covers both response headers and its JSON body. Cancellation is
// forwarded without leaking listeners or leaving a late timer after success.
async function requestCardData(url, signal, timeoutMs) {
  if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
  const controller = new AbortController();
  const cancel = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  const deadline = Number.isFinite(timeoutMs) ? Math.max(1, Math.min(timeoutMs, 30000)) : REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(new DOMException('Card API timed out', 'TimeoutError')), deadline);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const json = await response.json();
    return Array.isArray(json?.data) ? json.data : [];
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

function getCachedCard(id) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const cached = localStorage.getItem(CACHE_PREFIX + id);
    if (!cached) return null;
    if (cached.length > 20000) {
      localStorage.removeItem(CACHE_PREFIX + id);
      return null;
    }

    const parsed = JSON.parse(cached);
    if (
      parsed?.version !== CACHE_VERSION
      || !Number.isFinite(parsed.cachedAt)
      || parsed.cachedAt > Date.now()
      || Date.now() - parsed.cachedAt > CACHE_TTL_MS
      || cardId(parsed.card?.id) !== id
      || typeof parsed.card?.name !== 'string'
      || typeof parsed.card?.type !== 'string'
      || parsed.card.image_url !== '/custom-card-back.png'
      || parsed.card.image_url_cropped !== '/custom-card-back.png'
    ) {
      localStorage.removeItem(CACHE_PREFIX + id);
      return null;
    }

    // Never restore arbitrary properties or executable/local rule capabilities
    // from persistent data. The cache is only a Sandbox catalogue accelerator.
    return normalizeCardData({
      ...parsed.card,
      linkval: parsed.card.linkRating,
      linkmarkers: parsed.card.linkMarkers,
      scale: parsed.card.pendulumScale
    });
  } catch (e) {
    try { localStorage.removeItem(CACHE_PREFIX + id); } catch { /* Storage may be denied. */ }
    console.warn('Cache carte illisible, entrée ignorée.', e);
    return null;
  }
}

function cacheCards(cards) {
  try {
    if (typeof localStorage === 'undefined') return;
    // Enumerate only our own namespace, once per request, and evict oldest
    // catalogue entries. Preferences/decks/progression are never removed.
    const entries = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(CACHE_PREFIX)) continue;
      let cachedAt = 0;
      try { cachedAt = JSON.parse(localStorage.getItem(key))?.cachedAt || 0; } catch { /* Corrupt entries are oldest. */ }
      entries.push({ key, cachedAt });
    }
    const batch = cards.slice(0, 50);
    const incoming = new Set(batch.map(card => CACHE_PREFIX + card.id));
    const retained = entries.filter(entry => !incoming.has(entry.key)).sort((a, b) => a.cachedAt - b.cachedAt);
    const excess = Math.max(0, retained.length + incoming.size - CACHE_MAX_ENTRIES);
    for (const entry of retained.slice(0, excess)) localStorage.removeItem(entry.key);
    for (const card of batch) {
      localStorage.setItem(CACHE_PREFIX + card.id, JSON.stringify({
        version: CACHE_VERSION,
        cachedAt: Date.now(),
        card
      }));
    }
  } catch (e) {
    console.warn('Cache carte indisponible, poursuite sans cache.', e);
  }
}

/**
 * Normalizes card data from YGOPRODeck API format to our app format
 */
export function normalizeCardData(apiCard) {
  if (!apiCard || typeof apiCard !== 'object' || !cardId(apiCard.id)) return null;
  const type = textValue(apiCard.type, 'Normal Monster', 80);
  const typeLower = type.toLowerCase();
  let cardType = 'monster';
  if (typeLower.includes('spell')) {
    cardType = 'spell';
  } else if (typeLower.includes('trap')) {
    cardType = 'trap';
  }

  let extraType = null;
  if (typeLower.includes('fusion')) extraType = 'fusion';
  else if (typeLower.includes('synchro')) extraType = 'synchro';
  else if (typeLower.includes('xyz')) extraType = 'xyz';
  else if (typeLower.includes('link')) extraType = 'link';

  const isExtraDeckMonster = Boolean(extraType);
  const isRitualMonster = typeLower.includes('ritual');
  const isPendulumMonster = typeLower.includes('pendulum');
  const isToken = typeLower.includes('token');
  const isMonster = cardType === 'monster';

  return {
    id: cardId(apiCard.id),
    name: textValue(apiCard.name, 'Carte inconnue'),
    name_en: textValue(apiCard.name, 'Unknown card'), // The API translates 'name' when language is specified
    type,
    desc: textValue(apiCard.desc, 'Aucune description disponible.', 8000),
    atk: numericValue(apiCard.atk),
    def: typeLower.includes('link') ? null : numericValue(apiCard.def),
    level: numericValue(apiCard.level, 0, 13),
    rank: numericValue(typeLower.includes('xyz') ? apiCard.level : apiCard.rank, 0, 13),
    linkRating: numericValue(apiCard.linkval, 0, 8),
    linkMarkers: Array.isArray(apiCard.linkmarkers) ? apiCard.linkmarkers.filter(marker =>
      ['Top', 'Bottom', 'Left', 'Right', 'Top-Left', 'Top-Right', 'Bottom-Left', 'Bottom-Right'].includes(marker)
    ).slice(0, 8) : [],
    pendulumScale: apiCard.scale == null ? null : numericValue(apiCard.scale, 0, 13),
    race: textValue(apiCard.race, 'Warrior', 80),
    attribute: ['DARK', 'LIGHT', 'EARTH', 'WATER', 'FIRE', 'WIND', 'DIVINE'].includes(apiCard.attribute)
      ? apiCard.attribute : (cardType === 'spell' ? 'SPELL' : cardType === 'trap' ? 'TRAP' : 'LIGHT'),
    card_type: cardType,
    extra_type: extraType,
    belongsInExtraDeck: isExtraDeckMonster,
    isRitualMonster,
    isPendulumMonster,
    isToken,
    normalSummonAllowed: isMonster && !isExtraDeckMonster && !isRitualMonster && !isToken,
    // API cards remain sandbox-only until their complete effect/procedure is
    // explicitly registered by the local rules engine.
    supportedInStrict: false,
    // Remote Sandbox cards keep their text and stats, but deliberately use a
    // same-origin placeholder. YGOPRODeck asks consumers not to hotlink its
    // image CDN; only the explicitly supported local pool is re-hosted.
    image_url: '/custom-card-back.png',
    image_url_cropped: '/custom-card-back.png'
  };
}

/**
 * Searches cards by fuzzy name (supporting French)
 * @param {string} query
 * @param {{signal?: AbortSignal, limit?: number}} options
 * @returns {Promise<Array>}
 */
export async function searchCards(query, { signal, limit = 30, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  if (typeof query !== 'string' || query.trim().length < 2 || signal?.aborted) return [];

  const trimmedQuery = query.trim().slice(0, 128).toLowerCase();
  const maxResults = resultLimit(limit);

  // Search the complete supported local pool first.
  const localMatches = LOCAL_CARDS.filter(
    c => String(c.name || '').toLowerCase().includes(trimmedQuery)
      || String(c.name_en || '').toLowerCase().includes(trimmedQuery)
  ).slice(0, maxResults);

  try {
    // The API currently rejects the combination of fuzzy-name search and the
    // language parameter (HTTP 400). Local French names are merged above;
    // the remote fuzzy search therefore uses the default catalogue language.
    const url = `${API_BASE_URL}?fname=${encodeURIComponent(trimmedQuery)}`;
    const apiCards = await requestCardData(url, signal, timeoutMs);
    if (signal?.aborted) return [];

    // Merge with local matches, avoiding duplicates
    const merged = [...localMatches];
    const seen = new Set(merged.map(card => cardId(card.id)));
    const remoteCards = [];
    for (const candidate of apiCards) {
      if (merged.length >= maxResults) break;
      const normalized = normalizeCardData(candidate);
      if (!normalized || seen.has(normalized.id)) continue;
      seen.add(normalized.id);
      const local = LOCAL_CARDS.find(card => cardId(card.id) === normalized.id);
      merged.push(local || normalized);
      if (!local) remoteCards.push(normalized);
    }
    if (remoteCards.length) cacheCards(remoteCards);
    return merged;
  } catch (error) {
    if (signal?.aborted) return [];
    console.warn('Recherche distante indisponible, résultats locaux utilisés.', error);
    return localMatches;
  }
}

/**
 * Fetches exact card by ID
 * @param {string} id
 * @param {{signal?: AbortSignal}} options
 * @returns {Promise<Object|null>}
 */
export async function getCardById(id, { signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const normalizedId = cardId(id);
  if (!normalizedId || signal?.aborted) return null;

  // Inspect legacy cache for eviction, but local rules data always wins.
  const cached = getCachedCard(normalizedId);

  // Check all cards natively supported by the simulator.
  const localCard = LOCAL_CARDS.find(c => cardId(c.id) === normalizedId);
  if (localCard) return localCard;
  if (cached) return cached;

  try {
    const url = `${API_BASE_URL}?id=${encodeURIComponent(normalizedId)}&language=fr`;
    const cards = await requestCardData(url, signal, timeoutMs);
    const cardData = cards.find(card => cardId(card?.id) === normalizedId);
    if (!cardData || signal?.aborted) return null;

    const norm = normalizeCardData(cardData);
    cacheCards([norm]);
    return norm;
  } catch (error) {
    if (signal?.aborted) return null;
    console.error(`Error fetching card ${normalizedId}:`, error);
    return null;
  }
}
