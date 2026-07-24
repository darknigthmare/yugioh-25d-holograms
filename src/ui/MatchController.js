import { MatchEngine } from '../core/MatchEngine.js';

const CONTROLLER_SERIALIZATION_VERSION = 2;
const MAX_SERIALIZED_LENGTH = 4_000_000;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * DOM-agnostic first-to-two-wins Match coordinator.
 *
 * MatchEngine remains the authority for deck legality, scores, and the match
 * lifecycle. This controller adds the pieces a UI needs between Duels:
 * transactional Side Deck drafts and the official first-player decision.
 */
export class MatchController {
  constructor(options = {}) {
    if (options.engine !== undefined && !(options.engine instanceof MatchEngine)) {
      throw new TypeError('engine must be a MatchEngine instance.');
    }

    this.engine = options.engine || new MatchEngine();
    this._playerLabels = {};
    this._duelDecisions = [];
    this._pendingFirstPlayerDecision = null;
    this._stagedDecks = {};
  }

  /**
   * Start Duel 1. `initialDecisionPlayerId` identifies the Duelist who won the
   * opening random method and made the first-player choice.
   */
  startMatch(options = {}) {
    const config = options && typeof options === 'object' ? options : {};
    const state = this.engine.startMatch(config);
    const initialDecisionPlayerId = config.initialDecisionPlayerId || state.initialFirstPlayerId;

    this._assertPlayerId(initialDecisionPlayerId, state.playerIds, 'initialDecisionPlayerId');
    this._playerLabels = this._normalizeLabels(config.playerLabels, state.playerIds);
    this._duelDecisions = [{
      gameNumber: 1,
      decisionPlayerId: initialDecisionPlayerId,
      firstPlayerId: state.initialFirstPlayerId
    }];
    this._pendingFirstPlayerDecision = null;
    this._stagedDecks = {};

    return this.getViewModel();
  }

  /**
   * Record the current Duel. The loser chooses who goes first in the next
   * Duel. Following a draw, a new random method must first determine which
   * Duelist receives that choice.
   */
  recordDuelResult(winnerId = null) {
    const before = this.engine.getMatchState();
    if (before.status !== 'active') {
      throw new Error('A Duel result can only be recorded while a Duel is active.');
    }

    const currentDecision = this._duelDecisions[before.gameNumber - 1];
    if (!currentDecision) {
      throw new Error('The current Duel has no first-player decision.');
    }

    const state = this.engine.recordGameResult(winnerId);
    this._stagedDecks = {};

    if (state.status === 'between_games') {
      const normalizedWinner = winnerId === 'draw' ? null : winnerId;
      this._pendingFirstPlayerDecision = {
        chooserPlayerId: normalizedWinner === null
          ? null
          : this._otherPlayer(state.playerIds, normalizedWinner),
        firstPlayerId: null,
        randomDecisionRequired: normalizedWinner === null
      };
    } else {
      this._pendingFirstPlayerDecision = null;
    }

    return this.getViewModel();
  }

  recordGameResult(winnerId = null) {
    return this.recordDuelResult(winnerId);
  }

  /**
   * Record the winner of the new random method required after a drawn Duel.
   */
  recordRandomMethodWinner(playerId) {
    const state = this.engine.getMatchState();
    if (
      state.status !== 'between_games'
      || !this._pendingFirstPlayerDecision?.randomDecisionRequired
    ) {
      throw new Error('A random-method winner is only required after a drawn Duel.');
    }
    this._assertPlayerId(playerId, state.playerIds, 'playerId');
    this._pendingFirstPlayerDecision = {
      chooserPlayerId: playerId,
      firstPlayerId: null,
      randomDecisionRequired: false
    };
    return this.getViewModel();
  }

  /**
   * Store the next-Duel choice without advancing the match. Either player may
   * be selected to go first, but only the entitled Duelist may submit it.
   */
  chooseFirstPlayer(decidingPlayerId, firstPlayerId) {
    const state = this.engine.getMatchState();
    if (state.status !== 'between_games' || !this._pendingFirstPlayerDecision) {
      throw new Error('A first-player choice is only allowed between Duels.');
    }
    if (this._pendingFirstPlayerDecision.randomDecisionRequired) {
      throw new Error('A new random method must determine the entitled Duelist first.');
    }
    if (decidingPlayerId !== this._pendingFirstPlayerDecision.chooserPlayerId) {
      throw new Error('Only the Duelist entitled to the next-Duel choice may decide.');
    }

    this._assertPlayerId(firstPlayerId, state.playerIds, 'firstPlayerId');
    this.engine.chooseNextFirstPlayer(firstPlayerId);
    this._pendingFirstPlayerDecision = {
      chooserPlayerId: decidingPlayerId,
      firstPlayerId,
      randomDecisionRequired: false
    };
    return this.getViewModel();
  }

  /**
   * Validate and stage a complete Main/Extra/Side configuration. No live match
   * deck changes until prepareNextDuel commits every player's draft at once.
   */
  stageSideDeck(playerId, sidedDeck) {
    const state = this.engine.getMatchState();
    if (state.status !== 'between_games') {
      throw new Error('Side Deck exchanges are only allowed between Duels.');
    }
    this._assertPlayerId(playerId, state.playerIds, 'playerId');

    const registeredDeck = state.registeredDecks[playerId];
    if (!registeredDeck) {
      throw new Error(`No registered deck is available for ${playerId}.`);
    }

    const validation = this.engine.validateSideDeckSwap(
      registeredDeck,
      sidedDeck,
      state.formatId,
      state.banlistId
    );
    if (!validation.valid) {
      return {
        valid: false,
        issues: clonePlain(validation.issues),
        viewModel: this.getViewModel()
      };
    }

    this._stagedDecks[playerId] = clonePlain(sidedDeck);
    return {
      valid: true,
      issues: [],
      viewModel: this.getViewModel()
    };
  }

  stageSideDeckSwap(playerId, sidedDeck) {
    return this.stageSideDeck(playerId, sidedDeck);
  }

  clearStagedSideDeck(playerId) {
    const state = this.engine.getMatchState();
    if (state.status !== 'between_games') {
      throw new Error('Side Deck drafts can only be changed between Duels.');
    }
    this._assertPlayerId(playerId, state.playerIds, 'playerId');
    delete this._stagedDecks[playerId];
    return this.getViewModel();
  }

  /**
   * Atomically commit all Side Deck configurations and prepare the next Duel.
   * An invalid draft leaves the engine, every other draft, and the pending
   * first-player decision untouched.
   */
  prepareNextDuel(sidedDecks = undefined) {
    const state = this.engine.getMatchState();
    if (state.status !== 'between_games') {
      throw new Error('The next Duel can only start between Duels.');
    }
    if (
      this._pendingFirstPlayerDecision?.randomDecisionRequired
      || !this._pendingFirstPlayerDecision?.firstPlayerId
    ) {
      throw new Error('The entitled Duelist must choose who goes first before the next Duel.');
    }

    const candidates = clonePlain(this._stagedDecks);
    if (sidedDecks !== undefined) {
      if (!sidedDecks || typeof sidedDecks !== 'object' || Array.isArray(sidedDecks)) {
        throw new TypeError('sidedDecks must be an object keyed by player id.');
      }
      for (const [playerId, deck] of Object.entries(sidedDecks)) {
        this._assertPlayerId(playerId, state.playerIds, 'playerId');
        candidates[playerId] = clonePlain(deck);
      }
    }

    const decision = { ...this._pendingFirstPlayerDecision };
    const result = this.engine.startNextGame(candidates, decision.firstPlayerId);
    if (result?.valid === false) {
      return {
        valid: false,
        issues: clonePlain(result.issues || []),
        viewModel: this.getViewModel()
      };
    }

    this._duelDecisions.push({
      gameNumber: result.gameNumber,
      decisionPlayerId: decision.chooserPlayerId,
      firstPlayerId: decision.firstPlayerId
    });
    this._pendingFirstPlayerDecision = null;
    this._stagedDecks = {};

    return {
      valid: true,
      issues: [],
      launch: this.getDuelLaunchConfig(),
      viewModel: this.getViewModel()
    };
  }

  startNextGame(sidedDecks = undefined) {
    return this.prepareNextDuel(sidedDecks);
  }

  /**
   * Minimal hand-off required to initialize the visual Duel runtime.
   */
  getDuelLaunchConfig() {
    const state = this.engine.getMatchState();
    if (state.status !== 'active') return null;

    const decision = this._duelDecisions[state.gameNumber - 1];
    if (!decision) throw new Error('The active Duel has no launch decision.');

    return {
      gameNumber: state.gameNumber,
      firstPlayerId: decision.firstPlayerId,
      decisionPlayerId: decision.decisionPlayerId,
      playerIds: [...state.playerIds],
      decks: clonePlain(state.activeDecks),
      formatId: state.formatId,
      banlistId: state.banlistId
    };
  }

  /**
   * Full editor payload for one Duelist. Returned decks are detached copies.
   */
  getSideDeckEditorModel(playerId) {
    const state = this.engine.getMatchState();
    this._assertPlayerId(playerId, state.playerIds, 'playerId');

    const registeredDeck = state.registeredDecks[playerId] || null;
    const activeDeck = state.activeDecks[playerId] || null;
    const stagedDeck = this._stagedDecks[playerId] || null;
    const draftDeck = stagedDeck || activeDeck;

    return {
      enabled: state.status === 'between_games' && Boolean(registeredDeck),
      playerId,
      playerLabel: this._playerLabels[playerId] || playerId,
      registeredDeck: registeredDeck ? clonePlain(registeredDeck) : null,
      activeDeck: activeDeck ? clonePlain(activeDeck) : null,
      draftDeck: draftDeck ? clonePlain(draftDeck) : null,
      hasStagedChanges: Boolean(stagedDeck),
      sectionSizes: this._deckSizes(draftDeck)
    };
  }

  /**
   * Stable presentation model: no DOM assumptions and no live engine objects.
   */
  getViewModel() {
    const state = this.engine.getMatchState();
    const screenByStatus = {
      idle: 'setup',
      active: 'duel',
      between_games: 'side_deck',
      complete: 'complete'
    };
    const currentDecisionIndex = state.status === 'active'
      ? state.gameNumber - 1
      : state.games.length - 1;
    const currentDecision = currentDecisionIndex >= 0
      ? this._duelDecisions[currentDecisionIndex] || null
      : null;

    const games = state.games.map((game, index) => {
      const decision = this._duelDecisions[index];
      return {
        gameNumber: game.gameNumber,
        winnerId: game.winnerId,
        draw: game.draw,
        firstPlayerId: decision?.firstPlayerId || game.firstPlayerId,
        decisionPlayerId: decision?.decisionPlayerId || null
      };
    });

    const players = state.playerIds.map(playerId => ({
      id: playerId,
      label: this._playerLabels[playerId] || playerId,
      wins: state.scores[playerId],
      isMatchWinner: state.winnerId === playerId,
      hasRegisteredDeck: Boolean(state.registeredDecks[playerId]),
      hasStagedSideDeck: Boolean(this._stagedDecks[playerId]),
      activeDeckSizes: this._deckSizes(state.activeDecks[playerId]),
      draftDeckSizes: this._deckSizes(
        this._stagedDecks[playerId] || state.activeDecks[playerId]
      )
    }));

    const pending = this._pendingFirstPlayerDecision
      ? { ...this._pendingFirstPlayerDecision }
      : null;

    return {
      version: CONTROLLER_SERIALIZATION_VERSION,
      mode: 'best_of_three',
      bestOf: 3,
      winsRequired: 2,
      status: state.status,
      screen: screenByStatus[state.status],
      formatId: state.formatId,
      banlistId: state.banlistId,
      gameNumber: state.gameNumber,
      playerIds: [...state.playerIds],
      players,
      scores: { ...state.scores },
      games,
      currentDuel: currentDecision ? {
        gameNumber: currentDecision.gameNumber,
        firstPlayerId: currentDecision.firstPlayerId,
        decisionPlayerId: currentDecision.decisionPlayerId,
        completed: state.status !== 'active'
      } : null,
      nextDuel: state.status === 'between_games' ? {
        gameNumber: state.games.length + 1,
        chooserPlayerId: pending?.chooserPlayerId || null,
        firstPlayerId: pending?.firstPlayerId || null,
        randomDecisionRequired: pending?.randomDecisionRequired === true,
        firstPlayerDecisionRequired: !pending?.firstPlayerId
      } : null,
      winnerId: state.winnerId,
      isDrawnMatch: state.status === 'complete' && state.winnerId === null,
      actions: {
        canStartMatch: state.status === 'idle' || state.status === 'complete',
        canRecordDuelResult: state.status === 'active',
        canEditSideDeck: state.status === 'between_games',
        canResolveRandomMethod: state.status === 'between_games'
          && pending?.randomDecisionRequired === true,
        canChooseFirstPlayer: state.status === 'between_games'
          && Boolean(pending?.chooserPlayerId)
          && pending?.randomDecisionRequired !== true,
        canStartNextDuel: state.status === 'between_games' && Boolean(pending?.firstPlayerId)
      }
    };
  }

  serialize() {
    return JSON.stringify(this.toJSON());
  }

  serializeState() {
    return this.serialize();
  }

  toJSON() {
    return {
      version: CONTROLLER_SERIALIZATION_VERSION,
      engine: this.engine.toJSON(),
      controller: {
        playerLabels: clonePlain(this._playerLabels),
        duelDecisions: clonePlain(this._duelDecisions),
        pendingFirstPlayerDecision: clonePlain(this._pendingFirstPlayerDecision),
        stagedDecks: clonePlain(this._stagedDecks)
      }
    };
  }

  /**
   * Validate into a temporary engine first so a rejected save cannot partially
   * mutate the live controller.
   */
  restore(serialized) {
    let payload;
    if (typeof serialized === 'string') {
      if (serialized.length > MAX_SERIALIZED_LENGTH) {
        throw new RangeError('Serialized match controller payload is too large.');
      }
      try {
        payload = JSON.parse(serialized);
      } catch {
        throw new TypeError('Serialized match controller payload is not valid JSON.');
      }
    } else {
      payload = clonePlain(serialized);
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new TypeError('Serialized match controller payload must be an object.');
    }
    if (payload.version !== CONTROLLER_SERIALIZATION_VERSION) {
      throw new RangeError(`Unsupported match controller version: ${payload.version}`);
    }

    const trialEngine = new MatchEngine();
    trialEngine.restore(payload.engine);
    const controllerState = this._validateControllerState(
      payload.controller,
      trialEngine
    );

    this.engine.restore(payload.engine);
    this._playerLabels = controllerState.playerLabels;
    this._duelDecisions = controllerState.duelDecisions;
    this._pendingFirstPlayerDecision = controllerState.pendingFirstPlayerDecision;
    this._stagedDecks = controllerState.stagedDecks;
    return this.getViewModel();
  }

  restoreState(serialized) {
    return this.restore(serialized);
  }

  static deserialize(serialized) {
    const controller = new MatchController();
    controller.restore(serialized);
    return controller;
  }

  _validateControllerState(raw, engine) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new TypeError('Serialized match controller state is missing.');
    }

    const state = engine.getMatchState();
    const playerLabels = this._normalizeLabels(raw.playerLabels, state.playerIds);
    if (!Array.isArray(raw.duelDecisions)) {
      throw new TypeError('Serialized Duel decisions are invalid.');
    }

    const expectedDecisionCount = state.status === 'active'
      ? state.gameNumber
      : state.games.length;
    if (raw.duelDecisions.length !== expectedDecisionCount) {
      throw new RangeError('Serialized Duel decision history has an invalid length.');
    }

    const duelDecisions = raw.duelDecisions.map((decision, index) => {
      if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
        throw new TypeError('Serialized Duel decision is invalid.');
      }
      if (decision.gameNumber !== index + 1) {
        throw new RangeError('Serialized Duel decision order is invalid.');
      }
      this._assertPlayerId(decision.decisionPlayerId, state.playerIds, 'decisionPlayerId');
      this._assertPlayerId(decision.firstPlayerId, state.playerIds, 'firstPlayerId');

      if (index === 0 && decision.firstPlayerId !== state.initialFirstPlayerId) {
        throw new RangeError('The opening first-player decision is inconsistent.');
      }
      const completedGame = state.games[index];
      if (
        completedGame
        && decision.firstPlayerId !== completedGame.firstPlayerId
      ) {
        throw new RangeError('A completed Duel first-player decision is inconsistent.');
      }
      if (
        state.status === 'active'
        && index === state.gameNumber - 1
        && decision.firstPlayerId !== state.currentFirstPlayerId
      ) {
        throw new RangeError('The active Duel first-player decision is inconsistent.');
      }

      if (index > 0) {
        const previousGame = state.games[index - 1];
        const expectedChooser = previousGame.winnerId === null
          ? null
          : this._otherPlayer(state.playerIds, previousGame.winnerId);
        if (expectedChooser && decision.decisionPlayerId !== expectedChooser) {
          throw new RangeError('A next-Duel decision was not made by the entitled Duelist.');
        }
      }

      return {
        gameNumber: decision.gameNumber,
        decisionPlayerId: decision.decisionPlayerId,
        firstPlayerId: decision.firstPlayerId
      };
    });

    let pendingFirstPlayerDecision = null;
    if (state.status === 'between_games') {
      const lastGame = state.games[state.games.length - 1];
      const pending = raw.pendingFirstPlayerDecision;

      if (!pending || typeof pending !== 'object' || Array.isArray(pending)) {
        throw new TypeError('Serialized next-Duel decision is missing.');
      }
      if (typeof pending.randomDecisionRequired !== 'boolean') {
        throw new TypeError('Serialized random-method state is invalid.');
      }

      if (lastGame.winnerId === null) {
        if (pending.randomDecisionRequired) {
          if (pending.chooserPlayerId !== null || pending.firstPlayerId !== null) {
            throw new RangeError('A pending random method cannot already contain a Duel choice.');
          }
        } else {
          this._assertPlayerId(
            pending.chooserPlayerId,
            state.playerIds,
            'chooserPlayerId'
          );
        }
      } else {
        const expectedChooser = this._otherPlayer(state.playerIds, lastGame.winnerId);
        if (
          pending.randomDecisionRequired
          || pending.chooserPlayerId !== expectedChooser
        ) {
          throw new RangeError('Serialized next-Duel chooser is inconsistent.');
        }
      }
      if (pending.firstPlayerId !== null) {
        this._assertPlayerId(pending.firstPlayerId, state.playerIds, 'firstPlayerId');
      }
      if ((state.nextFirstPlayerId ?? null) !== (pending.firstPlayerId ?? null)) {
        throw new RangeError('Serialized next-Duel choice is inconsistent with the match engine.');
      }
      pendingFirstPlayerDecision = {
        chooserPlayerId: pending.chooserPlayerId,
        firstPlayerId: pending.firstPlayerId,
        randomDecisionRequired: pending.randomDecisionRequired
      };
    } else if (raw.pendingFirstPlayerDecision !== null) {
      throw new RangeError('Serialized first-player choice is not allowed in this match state.');
    }

    if (!raw.stagedDecks || typeof raw.stagedDecks !== 'object' || Array.isArray(raw.stagedDecks)) {
      throw new TypeError('Serialized Side Deck drafts are invalid.');
    }
    if (state.status !== 'between_games' && Object.keys(raw.stagedDecks).length > 0) {
      throw new RangeError('Serialized Side Deck drafts are not allowed in this match state.');
    }

    const stagedDecks = {};
    for (const [playerId, deck] of Object.entries(raw.stagedDecks)) {
      this._assertPlayerId(playerId, state.playerIds, 'playerId');
      const registeredDeck = state.registeredDecks[playerId];
      if (!registeredDeck) {
        throw new RangeError(`Serialized Side Deck draft has no registration for ${playerId}.`);
      }
      const validation = engine.validateSideDeckSwap(
        registeredDeck,
        deck,
        state.formatId,
        state.banlistId
      );
      if (!validation.valid) {
        throw new RangeError(`Serialized Side Deck draft for ${playerId} is illegal.`);
      }
      stagedDecks[playerId] = clonePlain(deck);
    }

    return {
      playerLabels,
      duelDecisions,
      pendingFirstPlayerDecision,
      stagedDecks
    };
  }

  _normalizeLabels(labels, playerIds) {
    if (labels !== undefined && (labels === null || typeof labels !== 'object' || Array.isArray(labels))) {
      throw new TypeError('playerLabels must be an object keyed by player id.');
    }

    const normalized = {};
    for (const key of Object.keys(labels || {})) {
      this._assertPlayerId(key, playerIds, 'player label key');
    }
    for (const playerId of playerIds) {
      const label = labels?.[playerId] ?? playerId;
      if (typeof label !== 'string' || !label.trim() || label.length > 100) {
        throw new TypeError('Player labels must be non-empty strings of at most 100 characters.');
      }
      normalized[playerId] = label.trim();
    }
    return normalized;
  }

  _assertPlayerId(playerId, playerIds, fieldName) {
    if (!playerIds.includes(playerId)) {
      throw new RangeError(`${fieldName} must identify one of the two match players.`);
    }
  }

  _otherPlayer(playerIds, playerId) {
    return playerIds[0] === playerId ? playerIds[1] : playerIds[0];
  }

  _deckSizes(deck) {
    if (!deck) return null;
    return {
      mainDeck: Array.isArray(deck.mainDeck) ? deck.mainDeck.length : 0,
      extraDeck: Array.isArray(deck.extraDeck) ? deck.extraDeck.length : 0,
      sideDeck: Array.isArray(deck.sideDeck) ? deck.sideDeck.length : 0
    };
  }
}

function clonePlain(value, seen = new WeakSet(), depth = 0) {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Controller state cannot contain non-finite numbers.');
    return value;
  }
  if (typeof value === 'undefined') return undefined;
  if (typeof value !== 'object') {
    throw new TypeError('Controller state must contain plain serializable values.');
  }
  if (depth > 20) throw new RangeError('Controller state nesting is too deep.');
  if (seen.has(value)) throw new TypeError('Controller state cannot contain circular references.');

  seen.add(value);
  let clone;
  if (Array.isArray(value)) {
    clone = value.map(item => {
      const cloned = clonePlain(item, seen, depth + 1);
      if (cloned === undefined) {
        throw new TypeError('Controller state arrays cannot contain undefined values.');
      }
      return cloned;
    });
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Controller state must contain plain objects.');
    }
    clone = {};
    for (const key of Object.keys(value)) {
      if (UNSAFE_OBJECT_KEYS.has(key)) continue;
      const cloned = clonePlain(value[key], seen, depth + 1);
      if (cloned !== undefined) clone[key] = cloned;
    }
  }
  seen.delete(value);
  return clone;
}
