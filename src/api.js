import { STARTER_CARDS, EXTRA_DECK_CARDS } from './cards.js';

const API_BASE_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

// Cache in localStorage to respect YGOPRODeck's guidelines and avoid rate-limiting
const CACHE_PREFIX = 'ygo_card_';
const CACHE_VERSION = 2;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOCAL_CARDS = [...STARTER_CARDS, ...EXTRA_DECK_CARDS];

function getCachedCard(id) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const cached = localStorage.getItem(CACHE_PREFIX + id);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (
      parsed?.version !== CACHE_VERSION
      || typeof parsed.cachedAt !== 'number'
      || Date.now() - parsed.cachedAt > CACHE_TTL_MS
    ) {
      localStorage.removeItem(CACHE_PREFIX + id);
      return null;
    }

    return parsed.card || null;
  } catch (e) {
    console.warn('Cache carte illisible, entrée ignorée.', e);
    return null;
  }
}

function setCachedCard(id, data) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify({
      version: CACHE_VERSION,
      cachedAt: Date.now(),
      card: data
    }));
  } catch (e) {
    console.warn('Cache carte indisponible, poursuite sans cache.', e);
  }
}

/**
 * Normalizes card data from YGOPRODeck API format to our app format
 */
export function normalizeCardData(apiCard) {
  const imageObj = apiCard.card_images?.[0] || {};

  const type = apiCard.type || 'Normal Monster';
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
    id: String(apiCard.id),
    name: apiCard.name,
    name_en: apiCard.name, // The API returns the translated name in 'name' when language is specified
    type,
    desc: apiCard.desc || 'Aucune description disponible.',
    atk: apiCard.atk !== undefined ? apiCard.atk : 0,
    def: typeLower.includes('link') ? null : (apiCard.def !== undefined ? apiCard.def : 0),
    level: apiCard.level || 0,
    rank: apiCard.level && typeLower.includes('xyz') ? apiCard.level : (apiCard.rank || 0),
    linkRating: apiCard.linkval || 0,
    linkMarkers: Array.isArray(apiCard.linkmarkers) ? [...apiCard.linkmarkers] : [],
    pendulumScale: apiCard.scale ?? null,
    race: apiCard.race || 'Warrior',
    attribute: apiCard.attribute || (cardType === 'spell' ? 'SPELL' : cardType === 'trap' ? 'TRAP' : 'LIGHT'),
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
    // Store image URLs directly
    image_url: imageObj.image_url || `https://images.ygoprodeck.com/images/cards/${apiCard.id}.jpg`,
    image_url_cropped: imageObj.image_url_cropped || `https://images.ygoprodeck.com/images/cards_cropped/${apiCard.id}.jpg`
  };
}

/**
 * Searches cards by fuzzy name (supporting French)
 * @param {string} query
 * @param {{signal?: AbortSignal, limit?: number}} options
 * @returns {Promise<Array>}
 */
export async function searchCards(query, { signal, limit = 30 } = {}) {
  if (!query || query.trim().length < 2) return [];

  const trimmedQuery = query.trim().toLowerCase();

  // Search the complete supported local pool first.
  const localMatches = LOCAL_CARDS.filter(
    c => String(c.name || '').toLowerCase().includes(trimmedQuery)
      || String(c.name_en || '').toLowerCase().includes(trimmedQuery)
  );

  try {
    // The API currently rejects the combination of fuzzy-name search and the
    // language parameter (HTTP 400). Local French names are merged above;
    // the remote fuzzy search therefore uses the default catalogue language.
    const url = `${API_BASE_URL}?fname=${encodeURIComponent(trimmedQuery)}`;
    const response = await fetch(url, { signal });

    if (!response.ok) {
      if (response.status === 404) {
        // No cards found, return local matches
        return localMatches;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.json();
    const apiCards = json.data || [];

    // Normalize and cache results
    const normalized = apiCards.map(card => {
      const norm = normalizeCardData(card);
      setCachedCard(norm.id, norm);
      return norm;
    });

    // Merge with local matches, avoiding duplicates
    const merged = [...localMatches];
    normalized.forEach(nCard => {
      if (!merged.some(mCard => mCard.id === nCard.id)) {
        merged.push(nCard);
      }
    });

    return merged.slice(0, Math.max(1, Math.min(limit, 50)));
  } catch (error) {
    if (error?.name === 'AbortError') return [];
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
export async function getCardById(id, { signal } = {}) {
  const normalizedId = String(id ?? '').trim();
  if (!/^\d+$/.test(normalizedId)) return null;

  // Check local cache first
  const cached = getCachedCard(normalizedId);
  if (cached) return cached;

  // Check all cards natively supported by the simulator.
  const localCard = LOCAL_CARDS.find(c => c.id === normalizedId);
  if (localCard) return localCard;

  try {
    const url = `${API_BASE_URL}?id=${encodeURIComponent(normalizedId)}&language=fr`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Card not found: ${normalizedId}`);

    const json = await response.json();
    const cardData = json.data?.[0];
    if (!cardData) return null;

    const norm = normalizeCardData(cardData);
    setCachedCard(norm.id, norm);
    return norm;
  } catch (error) {
    if (error?.name === 'AbortError') return null;
    console.error(`Error fetching card ${normalizedId}:`, error);
    return null;
  }
}
