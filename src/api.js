import { STARTER_CARDS } from './cards.js';

const API_BASE_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';

// Cache in localStorage to respect YGOPRODeck's guidelines and avoid rate-limiting
const CACHE_PREFIX = 'ygo_card_';

function getCachedCard(id) {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + id);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.error('Error reading card cache:', e);
    return null;
  }
}

function setCachedCard(id, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + id, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing card cache:', e);
  }
}

/**
 * Normalizes card data from YGOPRODeck API format to our app format
 */
function normalizeCardData(apiCard) {
  const imageObj = apiCard.card_images?.[0] || {};

  // Try to determine the card type
  const typeLower = apiCard.type ? apiCard.type.toLowerCase() : '';
  let cardType = 'monster';
  if (typeLower.includes('spell')) {
    cardType = 'spell';
  } else if (typeLower.includes('trap')) {
    cardType = 'trap';
  }

  return {
    id: String(apiCard.id),
    name: apiCard.name,
    name_en: apiCard.name, // The API returns the translated name in 'name' when language is specified
    type: apiCard.type || 'Normal Monster',
    desc: apiCard.desc || 'Aucune description disponible.',
    atk: apiCard.atk !== undefined ? apiCard.atk : 0,
    def: apiCard.def !== undefined ? apiCard.def : 0,
    level: apiCard.level || apiCard.linkval || 0,
    race: apiCard.race || 'Warrior',
    attribute: apiCard.attribute || (cardType === 'spell' ? 'SPELL' : cardType === 'trap' ? 'TRAP' : 'LIGHT'),
    card_type: cardType,
    // Store image URLs directly
    image_url: imageObj.image_url || `https://images.ygoprodeck.com/images/cards/${apiCard.id}.jpg`,
    image_url_cropped: imageObj.image_url_cropped || `https://images.ygoprodeck.com/images/cards_cropped/${apiCard.id}.jpg`
  };
}

/**
 * Searches cards by fuzzy name (supporting French)
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchCards(query) {
  if (!query || query.trim().length < 2) return [];

  const trimmedQuery = query.trim().toLowerCase();

  // First search in starter cards
  const localMatches = STARTER_CARDS.filter(
    c => c.name.toLowerCase().includes(trimmedQuery) || c.name_en.toLowerCase().includes(trimmedQuery)
  );

  try {
    // Call the YGOPRODeck API with French language support
    const url = `${API_BASE_URL}?fname=${encodeURIComponent(trimmedQuery)}&language=fr`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        // No cards found, return local matches
        return localMatches;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const json = await response.data || await response.json();
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

    return merged.slice(0, 30); // Limit to top 30 results for UI performance
  } catch (error) {
    console.error('Failed fetching cards from API, falling back to local DB:', error);
    return localMatches;
  }
}

/**
 * Fetches exact card by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getCardById(id) {
  // Check local cache first
  const cached = getCachedCard(id);
  if (cached) return cached;

  // Check starter cards
  const localCard = STARTER_CARDS.find(c => c.id === String(id));
  if (localCard) return localCard;

  try {
    const url = `${API_BASE_URL}?id=${id}&language=fr`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Card not found: ${id}`);

    const json = await response.json();
    const cardData = json.data?.[0];
    if (!cardData) return null;

    const norm = normalizeCardData(cardData);
    setCachedCard(norm.id, norm);
    return norm;
  } catch (error) {
    console.error(`Error fetching card ${id}:`, error);
    return null;
  }
}
