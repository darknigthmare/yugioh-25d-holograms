import {
  CURRENT_TCG_BANLIST_ID, createCurrentTcgBanlist,
  getTcgSnapshotCopyIdentity, TCG_SWISS_POLICY
} from './tcg/TcgAdvancedFormat.js';

const DEFAULT_FORMAT_ID = 'TCG_ADVANCED';
const DEFAULT_BANLIST_ID = CURRENT_TCG_BANLIST_ID;
const SERIALIZATION_VERSION = 2;
const MAX_SERIALIZED_LENGTH = 2_000_000;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * MatchEngine owns deck registration, Side Deck exchanges, and a complete
 * first-to-two-wins Match lifecycle. Drawn Duels do not count as wins, so a
 * Match can legally continue beyond Duel 3. It intentionally stays independent
 * from the visual duel runtime so it can be persisted and tested deterministically.
 */
export class MatchEngine {
  constructor(options = {}) {
    this._validationOptions = {};
    for (const name of ['getCopyIdentity', 'getCardEligibility', 'getCardRestriction', 'isSupportedCard']) {
      if (options[name] !== undefined && typeof options[name] !== 'function') {
        throw new TypeError(`${name} must be a trusted card resolver function.`);
      }
      if (options[name]) this._validationOptions[name] = options[name];
    }
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

    // The previous limited local snapshot remains unchanged for existing saves.
    // New Matches use the complete, source-pinned current Konami Advanced list.
    this.banlists = {
      TCG_EU_2026_05_18: {
        forbidden: [
          '55144522' // Pot of Greed
        ],
        limited: [
          '83764718', // Monster Reborn
          '33396948', // Exodia the Forbidden One
          '7902349',
          '44519536',
          '15303296',
          '70903634'
        ],
        semi_limited: []
      },
      [DEFAULT_BANLIST_ID]: createCurrentTcgBanlist()
    };

    this.resetMatch();
  }

  /**
   * Validate Main (40-60), Extra (0-15), Side (0-15), section eligibility,
   * and the combined Main + Extra + Side copy/banlist limits.
   */
  validateDeck(deck, formatId = DEFAULT_FORMAT_ID, banlistId = DEFAULT_BANLIST_ID) {
    const normalizedDeck = this._normalizeDeck(deck);
    const format = this.formats[formatId] || this.formats[DEFAULT_FORMAT_ID];
    const issues = [];

    if (!this.formats[formatId]) issues.push({ code: 'UNKNOWN_FORMAT', message: `Unknown match format: ${formatId}` });
    if (!this.banlists[banlistId] && banlistId !== 'BUILDER_SANDBOX_UNLIMITED') {
      issues.push({ code: 'UNKNOWN_BANLIST', message: `Unknown banlist: ${banlistId}` });
    }

    for (const section of ['mainDeck', 'extraDeck', 'sideDeck']) {
      if (deck?.[section] !== undefined && !Array.isArray(deck[section])) {
        issues.push({
          code: 'INVALID_DECK_SECTION',
          section,
          message: `${section} must be an array.`
        });
      }
    }

    if (
      normalizedDeck.mainDeck.length < format.mainMin
      || normalizedDeck.mainDeck.length > format.mainMax
    ) {
      issues.push({
        code: 'INVALID_MAIN_SIZE',
        section: 'mainDeck',
        message: `Main deck must be between ${format.mainMin} and ${format.mainMax} cards.`
      });
    }
    if (normalizedDeck.extraDeck.length > format.extraMax) {
      issues.push({
        code: 'INVALID_EXTRA_SIZE',
        section: 'extraDeck',
        message: `Extra deck cannot exceed ${format.extraMax} cards.`
      });
    }
    if (normalizedDeck.sideDeck.length > format.sideMax) {
      issues.push({
        code: 'INVALID_SIDE_SIZE',
        section: 'sideDeck',
        message: `Side deck cannot exceed ${format.sideMax} cards.`
      });
    }

    for (const [section, cards] of Object.entries(normalizedDeck)) {
      cards.forEach((card, index) => {
        if (!card || typeof card !== 'object' || this._cardId(card) === null) {
          issues.push({
            code: 'INVALID_CARD',
            section,
            index,
            message: `${section}[${index}] must be a card with a valid id.`
          });
          return;
        }
        const expectedSection = section === 'mainDeck' ? 'main' : section === 'extraDeck' ? 'extra' : 'side';
        if (this._validationOptions.isSupportedCard
          && !this._validationOptions.isSupportedCard(card, expectedSection)) {
          issues.push({ code: 'UNSUPPORTED_TCG_CARD', section, index,
            message: `${card.name || this._cardId(card)} is not supported by the trusted card catalogue.` });
        }
        if (this._validationOptions.getCardEligibility) {
          const eligibility = this._validationOptions.getCardEligibility(card, expectedSection);
          if (eligibility?.allowed !== true) {
            issues.push({ code: eligibility?.code || 'TCG_CARD_INELIGIBLE', ...eligibility, section, index,
              cardId: this._cardId(card),
              message: eligibility?.message || 'This card is not eligible for TCG play.' });
          }
        }
      });
    }

    normalizedDeck.mainDeck.forEach((card, index) => {
      if (card && this.belongsInExtraDeck(card)) {
        issues.push({
          code: 'INVALID_MAIN_CARD',
          section: 'mainDeck',
          index,
          message: `${card.name || this._cardId(card)} belongs in the Extra Deck, not Main Deck.`
        });
      }
    });
    normalizedDeck.extraDeck.forEach((card, index) => {
      if (card && !this.belongsInExtraDeck(card)) {
        issues.push({
          code: 'INVALID_EXTRA_CARD',
          section: 'extraDeck',
          index,
          message: `${card.name || this._cardId(card)} belongs in the Main Deck, not Extra Deck.`
        });
      }
    });

    const allCards = [
      ...normalizedDeck.mainDeck,
      ...normalizedDeck.extraDeck,
      ...normalizedDeck.sideDeck
    ];
    const counts = new Map();
    const cardById = new Map();

    allCards.forEach(card => {
      if (this._cardId(card) === null) return;
      const id = this._copyIdentity(card);
      counts.set(id, (counts.get(id) || 0) + 1);
      if (!cardById.has(id)) cardById.set(id, card);
    });

    for (const [id, count] of counts) {
      const card = cardById.get(id);
      const allowed = this.getCardCopyLimit({ id }, formatId, banlistId);

      if (count > allowed) {
        issues.push({
          code: 'COPY_LIMIT_EXCEEDED',
          cardId: id,
          allowed,
          found: count,
          message: `Too many copies of ${card?.name || id}. Allowed: ${allowed}, Found: ${count}.`
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

  getCardCopyLimit(card, formatId = DEFAULT_FORMAT_ID, banlistId = DEFAULT_BANLIST_ID) {
    const datedLimit = formatId === DEFAULT_FORMAT_ID
      ? this._validationOptions.getCardRestriction?.(card, banlistId) : null;
    if (Number.isInteger(datedLimit) && datedLimit >= 0 && datedLimit <= 3) return datedLimit;
    const id = getTcgSnapshotCopyIdentity(card);
    const format = this.formats[formatId] || this.formats[DEFAULT_FORMAT_ID];
    const list = this.banlists[banlistId];
    if (!list) return format.baseCopyLimit;
    if (this._banlistContains(list.forbidden, id)) return 0;
    if (this._banlistContains(list.limited, id)) return 1;
    if (this._banlistContains(list.semi_limited, id)) return 2;
    return format.baseCopyLimit;
  }

  getValidationOptions() {
    return { ...this._validationOptions };
  }

  /**
   * A legal Side Deck operation preserves every registered card and the exact
   * size of all three sections. This enforces one-for-one exchanges while
   * allowing any number of swaps between games.
   */
  validateSideDeckSwap(
    originalDeck,
    sidedDeck,
    formatId = DEFAULT_FORMAT_ID,
    banlistId = DEFAULT_BANLIST_ID
  ) {
    const original = this._normalizeDeck(originalDeck);
    const candidate = this._normalizeDeck(sidedDeck);
    const issues = [];

    for (const section of ['mainDeck', 'extraDeck', 'sideDeck']) {
      if (original[section].length !== candidate[section].length) {
        issues.push({
          code: 'SIDE_DECK_SIZE_CHANGED',
          section,
          expected: original[section].length,
          found: candidate[section].length,
          message: 'Sizes of Main, Extra, and Side decks must remain constant.'
        });
      }
    }

    const originalPool = this._poolCounts(original);
    const candidatePool = this._poolCounts(candidate);
    if (!this._mapsEqual(originalPool, candidatePool)) {
      issues.push({
        code: 'SIDE_DECK_POOL_CHANGED',
        message: 'Cannot introduce or remove cards outside the registered card pool.'
      });
    }

    // Card metadata cannot be rewritten during siding to disguise an Extra Deck card.
    const originalKinds = new Map();
    const originalDefinitions = new Map();
    for (const card of [...original.mainDeck, ...original.extraDeck, ...original.sideDeck]) {
      const id = this._cardId(card);
      if (id !== null && !originalKinds.has(id)) {
        originalKinds.set(id, this.belongsInExtraDeck(card));
      }
      if (id !== null && !originalDefinitions.has(id)) originalDefinitions.set(id, this._cardDefinition(card));
    }
    for (const card of [...candidate.mainDeck, ...candidate.extraDeck, ...candidate.sideDeck]) {
      const id = this._cardId(card);
      if (
        id !== null
        && originalKinds.has(id)
        && originalKinds.get(id) !== this.belongsInExtraDeck(card)
      ) {
        issues.push({
          code: 'SIDE_DECK_CARD_MUTATED',
          cardId: id,
          message: `Card ${id} changed deck classification during Side Deck exchange.`
        });
      } else if (id !== null && originalDefinitions.has(id)
        && originalDefinitions.get(id) !== this._cardDefinition(card)) {
        issues.push({ code: 'SIDE_DECK_CARD_MUTATED', cardId: id,
          message: `Card ${id} changed its registered definition during Side Deck exchange.` });
      }
    }

    const deckValidation = this.validateDeck(candidate, formatId, banlistId);
    issues.push(...deckValidation.issues);

    return {
      valid: issues.length === 0,
      issues,
      ...(issues[0] ? { message: issues[0].message } : {})
    };
  }

  /**
   * Clear all match progress without changing formats or banlists.
   */
  resetMatch() {
    this._state = {
      status: 'idle',
      formatId: DEFAULT_FORMAT_ID,
      banlistId: DEFAULT_BANLIST_ID,
      playerIds: ['player', 'opponent'],
      scores: {
        player: 0,
        opponent: 0
      },
      gameNumber: 0,
      initialFirstPlayerId: null,
      currentFirstPlayerId: null,
      nextFirstPlayerId: null,
      winnerId: null,
      games: [],
      registeredDecks: {},
      activeDecks: {},
      tournamentPolicy: null, timeLimitMinutes: null,
      completionReason: null, doubleLoss: false, timedOutDuringDuel: false
    };
    return this.getMatchState();
  }

  /**
   * Start game 1 of a best-of-three match.
   *
   * Supported options:
   * { playerIds, firstPlayerId, decks, formatId, banlistId }
   * `players` and `firstPlayer` are accepted as readable aliases.
   */
  startMatch(options = {}) {
    const config = Array.isArray(options) ? { playerIds: options } : (options || {});
    const playerIds = this._validatePlayerIds(config.playerIds || config.players || ['player', 'opponent']);
    const firstPlayerId = config.firstPlayerId || config.firstPlayer || playerIds[0];
    const formatId = config.formatId || DEFAULT_FORMAT_ID;
    const banlistId = config.banlistId || DEFAULT_BANLIST_ID;
    const tournamentPolicy = config.tournamentPolicy ?? null;
    if (tournamentPolicy !== null && tournamentPolicy !== TCG_SWISS_POLICY.id) {
      throw new RangeError('Unknown tournament policy.');
    }
    if (tournamentPolicy && (formatId !== DEFAULT_FORMAT_ID
      || (config.timeLimitMinutes !== undefined && config.timeLimitMinutes !== TCG_SWISS_POLICY.timeLimitMinutes))) {
      throw new RangeError('TCG EU Swiss requires Advanced format and a 50-minute limit.');
    }
    if (!tournamentPolicy && config.timeLimitMinutes != null) {
      throw new RangeError('A time limit requires an explicit tournament policy.');
    }

    if (!playerIds.includes(firstPlayerId)) {
      throw new RangeError('firstPlayerId must identify one of the two match players.');
    }
    if (!this.formats[formatId]) {
      throw new RangeError(`Unknown match format: ${formatId}`);
    }
    if (!this.banlists[banlistId]) {
      throw new RangeError(`Unknown banlist: ${banlistId}`);
    }

    const suppliedDecks = config.decks === undefined
      ? this._state.registeredDecks
      : config.decks;
    const registeredDecks = {};
    const activeDecks = {};

    if (suppliedDecks !== null && typeof suppliedDecks !== 'object') {
      throw new TypeError('decks must be an object keyed by player id.');
    }
    if (suppliedDecks) {
      this._assertNoUnknownPlayerKeys(suppliedDecks, playerIds);
    }

    for (const playerId of playerIds) {
      if (!suppliedDecks || suppliedDecks[playerId] === undefined) continue;
      const validation = this.validateDeck(suppliedDecks[playerId], formatId, banlistId);
      if (!validation.valid) {
        const error = new RangeError(`Invalid registered deck for ${playerId}.`);
        error.issues = validation.issues;
        throw error;
      }
      registeredDecks[playerId] = this._cloneDeck(suppliedDecks[playerId]);
      activeDecks[playerId] = this._cloneDeck(suppliedDecks[playerId]);
    }

    this._state = {
      status: 'active',
      formatId,
      banlistId,
      playerIds: [...playerIds],
      scores: {
        [playerIds[0]]: 0,
        [playerIds[1]]: 0
      },
      gameNumber: 1,
      initialFirstPlayerId: firstPlayerId,
      currentFirstPlayerId: firstPlayerId,
      nextFirstPlayerId: null,
      winnerId: null,
      games: [],
      registeredDecks,
      activeDecks,
      tournamentPolicy, timeLimitMinutes: tournamentPolicy ? TCG_SWISS_POLICY.timeLimitMinutes : null,
      completionReason: null, doubleLoss: false, timedOutDuringDuel: false
    };

    return this.getMatchState();
  }

  /**
   * Register or replace a deck before a match begins.
   */
  registerDeck(
    playerId,
    deck,
    formatId = this._state.formatId,
    banlistId = this._state.banlistId
  ) {
    if (this._state.status !== 'idle') {
      throw new Error('Deck registration is locked after the match starts.');
    }
    if (!this._state.playerIds.includes(playerId)) {
      throw new RangeError('Unknown player id.');
    }
    if (!this.formats[formatId]) {
      throw new RangeError(`Unknown match format: ${formatId}`);
    }
    if (!this.banlists[banlistId]) {
      throw new RangeError(`Unknown banlist: ${banlistId}`);
    }

    const validation = this.validateDeck(deck, formatId, banlistId);
    if (!validation.valid) return validation;

    this._state.formatId = formatId;
    this._state.banlistId = banlistId;
    this._state.registeredDecks[playerId] = this._cloneDeck(deck);
    this._state.activeDecks[playerId] = this._cloneDeck(deck);
    return { valid: true, issues: [] };
  }

  /**
   * Record a win or draw for the current game. The Match ends only when one
   * Duelist reaches two wins; drawn Duels can extend it beyond Duel 3.
   */
  recordGameResult(winnerId = null) {
    if (this._state.status !== 'active') {
      throw new Error('A game result can only be recorded while a game is active.');
    }

    const normalizedWinner = winnerId === 'draw' ? null : winnerId;
    if (normalizedWinner !== null && !this._state.playerIds.includes(normalizedWinner)) {
      throw new RangeError('winnerId must identify a match player or be null for a draw.');
    }

    const game = {
      gameNumber: this._state.gameNumber,
      firstPlayerId: this._state.currentFirstPlayerId,
      winnerId: normalizedWinner,
      draw: normalizedWinner === null
    };
    this._state.games.push(game);

    if (normalizedWinner !== null) {
      this._state.scores[normalizedWinner] += 1;
    }

    const scoreWinner = this._state.playerIds.find(id => this._state.scores[id] >= 2) || null;
    if (scoreWinner) {
      this._state.status = 'complete';
      this._state.winnerId = scoreWinner;
      this._state.nextFirstPlayerId = null;
      this._state.completionReason = 'two_wins';
    } else {
      this._state.status = 'between_games';
      // Tournament policy gives a Duelist the choice; there is no automatic
      // alternation to infer before that decision is made.
      this._state.nextFirstPlayerId = null;
    }

    return this.getMatchState();
  }

  /** Tournament clocks are owned by the UI. Time expiry never invents a Duel
   * win: current KDE-E Swiss policy ends an unfinished Match in a double loss. */
  endMatchAtTime() {
    if (this._state.tournamentPolicy !== TCG_SWISS_POLICY.id) {
      throw new Error('Time expiry requires the explicit TCG EU Swiss tournament policy.');
    }
    if (!['active', 'between_games'].includes(this._state.status)) {
      throw new Error('Only an unfinished Match can end on time.');
    }
    this._state.timedOutDuringDuel = this._state.status === 'active';
    this._state.status = 'complete';
    this._state.winnerId = null;
    this._state.nextFirstPlayerId = null;
    this._state.completionReason = 'time_limit';
    this._state.doubleLoss = true;
    return this.getMatchState();
  }

  // Friendly alias for callers that use "game" terminology.
  recordGame(winnerId = null) {
    return this.recordGameResult(winnerId);
  }

  /**
   * Apply one player's legal Side Deck configuration between games.
   */
  applySideDeckSwap(playerId, sidedDeck) {
    if (this._state.status !== 'between_games') {
      throw new Error('Side Deck exchanges are only allowed between games.');
    }
    if (!this._state.playerIds.includes(playerId)) {
      throw new RangeError('Unknown player id.');
    }

    const registeredDeck = this._state.registeredDecks[playerId];
    if (!registeredDeck) {
      throw new Error(`No registered deck is available for ${playerId}.`);
    }

    const validation = this.validateSideDeckSwap(
      registeredDeck,
      sidedDeck,
      this._state.formatId,
      this._state.banlistId
    );
    if (!validation.valid) return validation;

    this._state.activeDecks[playerId] = this._cloneDeck(sidedDeck);
    return { valid: true, issues: [] };
  }

  applySideDeck(playerId, sidedDeck) {
    return this.applySideDeckSwap(playerId, sidedDeck);
  }

  /**
   * Store the entitled Duelist's choice for the next game.
   */
  chooseNextFirstPlayer(firstPlayerId) {
    if (this._state.status !== 'between_games') {
      throw new Error('The next first player can only be chosen between games.');
    }
    if (!this._state.playerIds.includes(firstPlayerId)) {
      throw new RangeError('firstPlayerId must identify one of the two match players.');
    }
    this._state.nextFirstPlayerId = firstPlayerId;
    return this.getMatchState();
  }

  /**
   * Begin the next game. Optional sided decks are validated atomically: if one
   * is illegal, none of them are applied.
   */
  startNextGame(sidedDecks = {}, firstPlayerId = this._state.nextFirstPlayerId) {
    if (this._state.status !== 'between_games') {
      throw new Error('The next game can only start after recording the previous result.');
    }
    if (sidedDecks === null || typeof sidedDecks !== 'object' || Array.isArray(sidedDecks)) {
      throw new TypeError('sidedDecks must be an object keyed by player id.');
    }
    if (!this._state.playerIds.includes(firstPlayerId)) {
      throw new RangeError('A valid first-player choice is required for the next game.');
    }

    const pendingDecks = {};
    for (const [playerId, sidedDeck] of Object.entries(sidedDecks)) {
      if (!this._state.playerIds.includes(playerId)) {
        throw new RangeError(`Unknown player id: ${playerId}`);
      }
      const registeredDeck = this._state.registeredDecks[playerId];
      if (!registeredDeck) {
        throw new Error(`No registered deck is available for ${playerId}.`);
      }

      const validation = this.validateSideDeckSwap(
        registeredDeck,
        sidedDeck,
        this._state.formatId,
        this._state.banlistId
      );
      if (!validation.valid) return validation;
      pendingDecks[playerId] = this._cloneDeck(sidedDeck);
    }

    Object.assign(this._state.activeDecks, pendingDecks);
    this._state.gameNumber = this._state.games.length + 1;
    this._state.currentFirstPlayerId = firstPlayerId;
    this._state.nextFirstPlayerId = null;
    this._state.status = 'active';

    return this.getMatchState();
  }

  beginNextGame(sidedDecks = {}, firstPlayerId = this._state.nextFirstPlayerId) {
    return this.startNextGame(sidedDecks, firstPlayerId);
  }

  getMatchState() {
    return this._cloneSafe(this._state);
  }

  getScore() {
    return { ...this._state.scores };
  }

  getActiveDeck(playerId) {
    const deck = this._state.activeDecks[playerId];
    return deck ? this._cloneDeck(deck) : null;
  }

  getMatchWinner() {
    return this._state.winnerId;
  }

  getNextFirstPlayer() {
    return this._state.nextFirstPlayerId;
  }

  isMatchOver() {
    return this._state.status === 'complete';
  }

  get scores() {
    return this.getScore();
  }

  get gameNumber() {
    return this._state.gameNumber;
  }

  get firstPlayerId() {
    return this._state.currentFirstPlayerId;
  }

  get matchWinner() {
    return this._state.winnerId;
  }

  /**
   * Produce a versioned JSON payload with no shared references to live state.
   */
  serialize() {
    return JSON.stringify(this.toJSON());
  }

  serializeState() {
    return this.serialize();
  }

  toJSON() {
    return {
      version: SERIALIZATION_VERSION,
      state: this.getMatchState()
    };
  }

  /**
   * Restore only a fully coherent state. Validation happens before assignment,
   * so malformed or tampered saves leave the current match untouched.
   */
  restore(serialized) {
    let payload;
    if (typeof serialized === 'string') {
      if (serialized.length > MAX_SERIALIZED_LENGTH) {
        throw new RangeError('Serialized match payload is too large.');
      }
      try {
        payload = JSON.parse(serialized);
      } catch {
        throw new TypeError('Serialized match payload is not valid JSON.');
      }
    } else {
      payload = this._cloneSafe(serialized);
    }

    const restoredState = this._validateRestoredPayload(payload);
    this._state = restoredState;
    return this.getMatchState();
  }

  restoreState(serialized) {
    return this.restore(serialized);
  }

  static deserialize(serialized, options = {}) {
    const engine = new MatchEngine(options);
    engine.restore(serialized);
    return engine;
  }

  _validateRestoredPayload(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new TypeError('Serialized match payload must be an object.');
    }
    if (payload.version !== SERIALIZATION_VERSION) {
      throw new RangeError(`Unsupported match serialization version: ${payload.version}`);
    }

    const raw = payload.state;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new TypeError('Serialized match state is missing.');
    }

    if (raw.status === 'idle') {
      const idle = this._createRestoredIdleState(raw);
      return this._cloneSafe(idle);
    }

    if (!['active', 'between_games', 'complete'].includes(raw.status)) {
      throw new RangeError('Serialized match status is invalid.');
    }
    if (!this.formats[raw.formatId] || !this.banlists[raw.banlistId]) {
      throw new RangeError('Serialized match format or banlist is unknown.');
    }

    const playerIds = this._validatePlayerIds(raw.playerIds);
    if (!playerIds.includes(raw.initialFirstPlayerId)) {
      throw new RangeError('Serialized initial first player is invalid.');
    }
    if (!Array.isArray(raw.games)) {
      throw new RangeError('Serialized game history is invalid.');
    }

    const scores = {
      [playerIds[0]]: 0,
      [playerIds[1]]: 0
    };
    const games = [];
    let matchEndedAt = null;

    raw.games.forEach((game, index) => {
      if (!game || typeof game !== 'object') {
        throw new TypeError('Serialized game entry is invalid.');
      }
      const expectedNumber = index + 1;
      const winnerId = game.winnerId === 'draw' ? null : game.winnerId;

      if (
        game.gameNumber !== expectedNumber
        || !playerIds.includes(game.firstPlayerId)
        || (index === 0 && game.firstPlayerId !== raw.initialFirstPlayerId)
      ) {
        throw new RangeError('Serialized game order or first-player choice is invalid.');
      }
      if (winnerId !== null && !playerIds.includes(winnerId)) {
        throw new RangeError('Serialized game winner is invalid.');
      }
      if (matchEndedAt !== null) {
        throw new RangeError('Serialized history contains games after the match ended.');
      }

      if (winnerId !== null) scores[winnerId] += 1;
      games.push({
        gameNumber: expectedNumber,
        firstPlayerId: game.firstPlayerId,
        winnerId,
        draw: winnerId === null
      });

      if (scores[playerIds[0]] >= 2 || scores[playerIds[1]] >= 2) {
        matchEndedAt = expectedNumber;
      }
    });

    if (
      !raw.scores
      || raw.scores[playerIds[0]] !== scores[playerIds[0]]
      || raw.scores[playerIds[1]] !== scores[playerIds[1]]
    ) {
      throw new RangeError('Serialized scores do not match game history.');
    }

    const timedOut = raw.completionReason === 'time_limit';
    const policy = this._validateTournamentState(raw, timedOut);
    const terminal = matchEndedAt !== null || timedOut;
    if (timedOut && matchEndedAt !== null) throw new RangeError('Time expiry cannot overwrite a completed Match result.');
    if ((raw.status === 'complete') !== terminal) {
      throw new RangeError('Serialized match completion state is inconsistent.');
    }
    if (raw.status === 'between_games' && games.length === 0) {
      throw new RangeError('A match cannot be between games before game 1.');
    }

    const interruptedDuel = timedOut && raw.timedOutDuringDuel;
    const expectedGameNumber = raw.status === 'active' || interruptedDuel ? games.length + 1 : games.length;
    if (raw.gameNumber !== expectedGameNumber || expectedGameNumber < 1) {
      throw new RangeError('Serialized current game number is inconsistent.');
    }

    const expectedCompletedFirstPlayer = games.at(-1)?.firstPlayerId || null;
    const currentFirstPlayerIsValid = playerIds.includes(raw.currentFirstPlayerId);
    const currentFirstPlayerMatchesState = raw.status === 'active' || interruptedDuel
      ? (
        currentFirstPlayerIsValid
        && (expectedGameNumber !== 1 || raw.currentFirstPlayerId === raw.initialFirstPlayerId)
      )
      : raw.currentFirstPlayerId === expectedCompletedFirstPlayer;
    if (!currentFirstPlayerMatchesState) {
      throw new RangeError('Serialized current first player is inconsistent.');
    }
    const currentFirstPlayerId = raw.currentFirstPlayerId;

    const derivedWinner = terminal && !timedOut
      ? this._winnerFromScores(scores, playerIds)
      : null;
    if ((raw.winnerId ?? null) !== derivedWinner) {
      throw new RangeError('Serialized match winner is inconsistent.');
    }

    const nextFirstPlayerId = raw.nextFirstPlayerId ?? null;
    if (
      (raw.status !== 'between_games' && nextFirstPlayerId !== null)
      || (
        raw.status === 'between_games'
        && nextFirstPlayerId !== null
        && !playerIds.includes(nextFirstPlayerId)
      )
    ) {
      throw new RangeError('Serialized next first player is inconsistent.');
    }

    const registeredDecks = this._restoreDeckMap(
      raw.registeredDecks,
      playerIds,
      raw.formatId,
      raw.banlistId
    );
    const activeDecks = this._restoreActiveDeckMap(
      raw.activeDecks,
      registeredDecks,
      playerIds,
      raw.formatId,
      raw.banlistId
    );

    return {
      status: raw.status,
      formatId: raw.formatId,
      banlistId: raw.banlistId,
      playerIds: [...playerIds],
      scores,
      gameNumber: expectedGameNumber,
      initialFirstPlayerId: raw.initialFirstPlayerId,
      currentFirstPlayerId,
      nextFirstPlayerId,
      winnerId: derivedWinner,
      games,
      registeredDecks,
      activeDecks,
      ...policy,
      completionReason: timedOut ? 'time_limit' : terminal ? 'two_wins' : null,
      doubleLoss: timedOut, timedOutDuringDuel: Boolean(interruptedDuel)
    };
  }

  _createRestoredIdleState(raw) {
    const policy = this._validateTournamentState(raw, false);
    if (policy.tournamentPolicy !== null) throw new RangeError('Idle Match cannot contain a tournament clock.');
    const playerIds = this._validatePlayerIds(raw.playerIds || ['player', 'opponent']);
    if (
      raw.gameNumber !== 0
      || !Array.isArray(raw.games)
      || raw.games.length !== 0
      || raw.initialFirstPlayerId !== null
      || raw.currentFirstPlayerId !== null
      || raw.nextFirstPlayerId !== null
      || raw.winnerId !== null
    ) {
      throw new RangeError('Serialized idle match contains active progress.');
    }
    if (!this.formats[raw.formatId] || !this.banlists[raw.banlistId]) {
      throw new RangeError('Serialized idle format or banlist is unknown.');
    }
    if (
      !raw.scores
      || raw.scores[playerIds[0]] !== 0
      || raw.scores[playerIds[1]] !== 0
    ) {
      throw new RangeError('Serialized idle scores are invalid.');
    }

    const registeredDecks = this._restoreDeckMap(
      raw.registeredDecks,
      playerIds,
      raw.formatId,
      raw.banlistId
    );
    const activeDecks = this._restoreActiveDeckMap(
      raw.activeDecks,
      registeredDecks,
      playerIds,
      raw.formatId,
      raw.banlistId
    );

    return {
      status: 'idle',
      formatId: raw.formatId,
      banlistId: raw.banlistId,
      playerIds,
      scores: {
        [playerIds[0]]: 0,
        [playerIds[1]]: 0
      },
      gameNumber: 0,
      initialFirstPlayerId: null,
      currentFirstPlayerId: null,
      nextFirstPlayerId: null,
      winnerId: null,
      games: [],
      registeredDecks,
      activeDecks,
      ...policy, completionReason: null, doubleLoss: false, timedOutDuringDuel: false
    };
  }

  _restoreDeckMap(rawDecks, playerIds, formatId, banlistId) {
    if (!rawDecks || typeof rawDecks !== 'object' || Array.isArray(rawDecks)) {
      throw new TypeError('Serialized registered decks are invalid.');
    }
    this._assertNoUnknownPlayerKeys(rawDecks, playerIds);

    const decks = {};
    for (const playerId of playerIds) {
      if (rawDecks[playerId] === undefined) continue;
      const validation = this.validateDeck(rawDecks[playerId], formatId, banlistId);
      if (!validation.valid) {
        throw new RangeError(`Serialized registered deck for ${playerId} is invalid.`);
      }
      decks[playerId] = this._cloneDeck(rawDecks[playerId]);
    }
    return decks;
  }

  _restoreActiveDeckMap(rawDecks, registeredDecks, playerIds, formatId, banlistId) {
    if (!rawDecks || typeof rawDecks !== 'object' || Array.isArray(rawDecks)) {
      throw new TypeError('Serialized active decks are invalid.');
    }
    this._assertNoUnknownPlayerKeys(rawDecks, playerIds);

    const decks = {};
    for (const playerId of playerIds) {
      const registered = registeredDecks[playerId];
      const active = rawDecks[playerId];
      if ((registered === undefined) !== (active === undefined)) {
        throw new RangeError(`Serialized deck registration for ${playerId} is incomplete.`);
      }
      if (registered === undefined) continue;

      const validation = this.validateSideDeckSwap(registered, active, formatId, banlistId);
      if (!validation.valid) {
        throw new RangeError(`Serialized active deck for ${playerId} is invalid.`);
      }
      decks[playerId] = this._cloneDeck(active);
    }
    return decks;
  }

  _assertNoUnknownPlayerKeys(deckMap, playerIds) {
    for (const key of Object.keys(deckMap)) {
      if (!playerIds.includes(key)) {
        throw new RangeError(`Serialized deck references unknown player: ${key}`);
      }
    }
  }

  _normalizeDeck(deck) {
    return {
      mainDeck: Array.isArray(deck?.mainDeck) ? deck.mainDeck : [],
      extraDeck: Array.isArray(deck?.extraDeck) ? deck.extraDeck : [],
      sideDeck: Array.isArray(deck?.sideDeck) ? deck.sideDeck : []
    };
  }

  _cloneDeck(deck) {
    const normalized = this._normalizeDeck(deck);
    return {
      mainDeck: normalized.mainDeck.map(card => this._cloneSafe(card)),
      extraDeck: normalized.extraDeck.map(card => this._cloneSafe(card)),
      sideDeck: normalized.sideDeck.map(card => this._cloneSafe(card))
    };
  }

  _cloneSafe(value, seen = new WeakSet(), depth = 0) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    // Native CDB races are unsigned 64-bit masks. Decimal strings preserve all
    // bits in JSON; duel initialization resolves the immutable CDB data by ID.
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new TypeError('Match state cannot contain non-finite numbers.');
      return value;
    }
    if (typeof value === 'undefined') return undefined;
    if (typeof value !== 'object') {
      throw new TypeError('Match state contains a non-serializable value.');
    }
    if (depth > 20) throw new RangeError('Match state nesting is too deep.');
    if (seen.has(value)) throw new TypeError('Match state cannot contain circular references.');

    seen.add(value);
    let clone;
    if (Array.isArray(value)) {
      clone = value.map(item => {
        const clonedItem = this._cloneSafe(item, seen, depth + 1);
        if (clonedItem === undefined) {
          throw new TypeError('Match state arrays cannot contain undefined values.');
        }
        return clonedItem;
      });
    } else {
      clone = {};
      for (const key of Object.keys(value)) {
        if (UNSAFE_OBJECT_KEYS.has(key)) continue;
        const clonedValue = this._cloneSafe(value[key], seen, depth + 1);
        if (clonedValue !== undefined) clone[key] = clonedValue;
      }
    }
    seen.delete(value);
    return clone;
  }

  _cardId(card) {
    if (!card || (typeof card !== 'object' && typeof card !== 'function')) return null;
    const rawId = card.id;
    if (typeof rawId !== 'string' && typeof rawId !== 'number') return null;
    const id = String(rawId).trim();
    if (!id) return null;
    return /^\d+$/.test(id) ? id.replace(/^0+(?=\d)/, '') : id;
  }

  _copyIdentity(card) {
    const resolved = this._validationOptions.getCopyIdentity?.(card);
    return getTcgSnapshotCopyIdentity(resolved == null ? card : resolved);
  }

  _cardDefinition(card) {
    const value = this._cloneSafe(card);
    value.id = this._cardId(card);
    // Runtime-only locations/identifiers do not change a registered card. All
    // actual names, rules text, stats, classifications and native metadata do.
    for (const key of ['uid', 'owner', 'controller', 'position', 'location', 'sequence', 'selected']) delete value[key];
    const canonical = input => Array.isArray(input) ? input.map(canonical)
      : input && typeof input === 'object'
        ? Object.fromEntries(Object.keys(input).sort().map(key => [key, canonical(input[key])])) : input;
    return JSON.stringify(canonical(value));
  }

  _validateTournamentState(raw, timedOut) {
    const tournamentPolicy = raw.tournamentPolicy ?? null;
    const timeLimitMinutes = raw.timeLimitMinutes ?? null;
    if (tournamentPolicy !== null && tournamentPolicy !== TCG_SWISS_POLICY.id) throw new RangeError('Serialized tournament policy is unknown.');
    if (tournamentPolicy === null ? timeLimitMinutes !== null : timeLimitMinutes !== TCG_SWISS_POLICY.timeLimitMinutes
      || raw.formatId !== DEFAULT_FORMAT_ID) throw new RangeError('Serialized tournament time limit is inconsistent.');
    if (timedOut) {
      if (raw.status !== 'complete' || tournamentPolicy !== TCG_SWISS_POLICY.id || raw.doubleLoss !== true
        || typeof raw.timedOutDuringDuel !== 'boolean') throw new RangeError('Serialized timed Match result is inconsistent.');
    } else if ((raw.doubleLoss ?? false) !== false || (raw.timedOutDuringDuel ?? false) !== false
      || (raw.completionReason != null && !(raw.status === 'complete' && raw.completionReason === 'two_wins'))) {
      throw new RangeError('Serialized Match completion reason is inconsistent.');
    }
    return { tournamentPolicy, timeLimitMinutes };
  }

  _poolCounts(deck) {
    const counts = new Map();
    for (const card of [...deck.mainDeck, ...deck.extraDeck, ...deck.sideDeck]) {
      const id = this._cardId(card);
      if (id === null) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }

  _mapsEqual(first, second) {
    if (first.size !== second.size) return false;
    for (const [key, value] of first) {
      if (second.get(key) !== value) return false;
    }
    return true;
  }

  _banlistContains(list, cardId) {
    return Array.isArray(list) && list.some(id => this._cardId({ id }) === cardId);
  }

  _validatePlayerIds(playerIds) {
    if (!Array.isArray(playerIds) || playerIds.length !== 2) {
      throw new RangeError('A match requires exactly two player ids.');
    }
    const normalized = playerIds.map(id => {
      if (
        typeof id !== 'string'
        || !id
        || id !== id.trim()
        || id.length > 64
        || UNSAFE_OBJECT_KEYS.has(id)
      ) {
        throw new TypeError('Player ids must be safe, non-empty strings of at most 64 characters.');
      }
      return id;
    });
    if (normalized[0] === normalized[1]) {
      throw new RangeError('Match player ids must be unique.');
    }
    return normalized;
  }

  _otherPlayer(playerId) {
    return this._otherPlayerFrom(this._state.playerIds, playerId);
  }

  _otherPlayerFrom(playerIds, playerId) {
    return playerIds[0] === playerId ? playerIds[1] : playerIds[0];
  }

  _alternatingPlayer(playerIds, initialFirstPlayerId, zeroBasedGameIndex) {
    return zeroBasedGameIndex % 2 === 0
      ? initialFirstPlayerId
      : this._otherPlayerFrom(playerIds, initialFirstPlayerId);
  }

  _winnerFromScores(scores, playerIds) {
    if (scores[playerIds[0]] === scores[playerIds[1]]) return null;
    return scores[playerIds[0]] > scores[playerIds[1]] ? playerIds[0] : playerIds[1];
  }
}
