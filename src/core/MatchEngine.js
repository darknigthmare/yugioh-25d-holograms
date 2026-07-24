/**
 * MatchEngine manages TCG deck construction validations, regional restriction lists,
 * match orchestration (best of 3), and side deck exchange rules.
 */
export class MatchEngine {
  constructor() {
    this.formats = {
      TCG_ADVANCED: {
        mainMin: 40,
        mainMax: 60,
        extraMax: 15,
        sideMax: 15,
        baseCopyLimit: 3
      },
      SPEED_DUEL: {
        mainMin: 20,
        mainMax: 30,
        extraMax: 5,
        sideMax: 5,
        baseCopyLimit: 3
      }
    };

    // Official TCG European Forbidden & Limited List (effective 18 May 2026).
    // Only IDs relevant to the local pool are required for deterministic deck QA.
    this.banlists = {
      TCG_EU_2026_05_18: {
        // Forbidden cards (Max 0)
        'forbidden': [
          '55144522' // Pot of Greed
        ],
        // Limited cards (Max 1)
        'limited': [
          '83764718', // Monster Reborn
          '33396948', // Exodia the Forbidden One
          '7902349',
          '44519536',
          '15303296',
          '70903634'
        ],
        // Semi-limited cards (Max 2)
        'semi_limited': []
      }
    };
  }

  /**
   * Validate a deck registration against format rules and active banlist
   */
  validateDeck(deck, formatId = 'TCG_ADVANCED', banlistId = 'TCG_EU_2026_05_18') {
    deck = {
      mainDeck: Array.isArray(deck?.mainDeck) ? deck.mainDeck : [],
      extraDeck: Array.isArray(deck?.extraDeck) ? deck.extraDeck : [],
      sideDeck: Array.isArray(deck?.sideDeck) ? deck.sideDeck : []
    };
    const format = this.formats[formatId] || this.formats.TCG_ADVANCED;
    const banlist = this.banlists[banlistId] || { forbidden: [], limited: [], semi_limited: [] };
    const issues = [];

    // 1. Validate section sizes
    if (deck.mainDeck.length < format.mainMin || deck.mainDeck.length > format.mainMax) {
      issues.push({ code: 'INVALID_MAIN_SIZE', message: `Main deck must be between ${format.mainMin} and ${format.mainMax} cards.` });
    }
    if (deck.extraDeck.length > format.extraMax) {
      issues.push({ code: 'INVALID_EXTRA_SIZE', message: `Extra deck cannot exceed ${format.extraMax} cards.` });
    }
    if (deck.sideDeck.length > format.sideMax) {
      issues.push({ code: 'INVALID_SIDE_SIZE', message: `Side deck cannot exceed ${format.sideMax} cards.` });
    }

    // 2. Validate card types per section
    deck.mainDeck.forEach(c => {
      if (this.belongsInExtraDeck(c)) {
        issues.push({ code: 'INVALID_MAIN_CARD', message: `${c.name} belongs in the Extra Deck, not Main Deck.` });
      }
    });
    deck.extraDeck.forEach(c => {
      if (!this.belongsInExtraDeck(c)) {
        issues.push({ code: 'INVALID_EXTRA_CARD', message: `${c.name} belongs in the Main Deck, not Extra Deck.` });
      }
    });

    // 3. Combined copy limits & Banlist checks
    const allCards = [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck];
    const counts = {};
    allCards.forEach(c => {
      const id = String(c.id);
      counts[id] = (counts[id] || 0) + 1;
    });

    for (const [id, count] of Object.entries(counts)) {
      // Find card template ID
      const card = allCards.find(c => String(c.id) === id);
      let allowed = format.baseCopyLimit;

      if (banlist.forbidden.includes(id)) allowed = 0;
      else if (banlist.limited.includes(id)) allowed = 1;
      else if (banlist.semi_limited.includes(id)) allowed = 2;

      if (count > allowed) {
        issues.push({
          code: 'COPY_LIMIT_EXCEEDED',
          message: `Too many copies of ${card.name}. Allowed: ${allowed}, Found: ${count}.`
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  belongsInExtraDeck(card) {
    return Boolean(
      card?.belongsInExtraDeck
      || card?.extra_type
      || /Fusion|Synchro|Xyz|Link/i.test(card?.type || '')
    );
  }

  /**
   * Validate a side deck exchange
   * Rules:
   * - Total sizes of Main, Extra and Side sections must remain exactly the same as original.
   * - No new cards are introduced from outside the pool.
   */
  validateSideDeckSwap(originalDeck, sidedDeck) {
    const sizesOk =
      originalDeck.mainDeck.length === sidedDeck.mainDeck.length &&
      originalDeck.extraDeck.length === sidedDeck.extraDeck.length &&
      originalDeck.sideDeck.length === sidedDeck.sideDeck.length;

    if (!sizesOk) {
      return { valid: false, message: "Sizes of Main, Extra, and Side decks must remain constant." };
    }

    // Verify all sided cards were in the original card pool
    const origPool = [...originalDeck.mainDeck, ...originalDeck.extraDeck, ...originalDeck.sideDeck].map(c => c.id).sort();
    const sidedPool = [...sidedDeck.mainDeck, ...sidedDeck.extraDeck, ...sidedDeck.sideDeck].map(c => c.id).sort();

    const poolOk = origPool.every((id, idx) => id === sidedPool[idx]);
    if (!poolOk) {
      return { valid: false, message: "Cannot introduce new cards from outside your registered card pool." };
    }

    return { valid: true };
  }
}
