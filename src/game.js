import { STARTER_CARDS, EXTRA_DECK_CARDS } from './cards.js';
import { CardState } from './core/CardState.js';
import { FieldState } from './core/FieldState.js';
import { PSCTParser } from './core/PSCTParser.js';
import { ChainEngine } from './core/ChainEngine.js';
import { PhaseEngine } from './core/PhaseEngine.js';
import { SummonEngine } from './core/SummonEngine.js';
import { EffectEngine } from './core/EffectEngine.js';
import { GameStateStabilizer } from './core/GameStateStabilizer.js';
import { MatchEngine } from './core/MatchEngine.js';
import { TurnEngine } from './core/TurnEngine.js';
import { DefensiveEngine } from './core/DefensiveEngine.js';
import { CardScriptAPI } from './core/CardScriptAPI.js';
import { isStrictCardSupported } from './core/StrictCardRegistry.js';

export class DuelGame {
  constructor(callbacks = {}, options = {}) {
    const callbackOptions = callbacks.options || {};
    this.rulesMode = options.rulesMode || callbackOptions.rulesMode || callbacks.rulesMode || 'strict';
    const requestedDifficulty = options.aiDifficulty || callbackOptions.aiDifficulty || callbacks.aiDifficulty || 'normal';
    this.aiDifficulty = ['easy', 'normal', 'hard'].includes(requestedDifficulty)
      ? requestedDifficulty
      : 'normal';

    this.callbacks = {
      onStateChange: () => {},
      onLog: () => {},
      onAnimation: () => {},
      onGameOver: () => {},
      // UI adapters may resolve these requests synchronously or asynchronously.
      // Returning undefined delegates to the deterministic legal fallback;
      // returning null explicitly cancels the player decision.
      onDecision: () => undefined,
      onChainOpportunity: () => null,
      ...callbacks
    };

    this.field = new FieldState();
    this.chain = new ChainEngine();
    this.phases = new PhaseEngine();
    this.summons = new SummonEngine(this.field);
    this.effects = new EffectEngine();
    this.stabilizer = new GameStateStabilizer();
    this.match = new MatchEngine();
    this.turn = new TurnEngine();
    this.defense = new DefensiveEngine();
    this.scriptApi = new CardScriptAPI();

    this._duelGeneration = 0;
    this._pendingDelays = new Set();
    this._pendingScheduledActions = new Set();
    this.reset();
  }

  reset() {
    this.cancelPendingAsyncWork();
    this._duelGeneration += 1;
    this.playerLP = 8000;
    this.opponentLP = 8000;

    this.playerDeck = [];
    this.opponentDeck = [];
    this.playerHand = [];
    this.opponentHand = [];

    this.field.reset();
    this.chain.reset();
    this.phases.reset();
    this.summons.reset();
    this.effects.reset();
    this.defense.reset();

    // Extra decks loaded with CardState wrappers
    this.playerExtraDeck = JSON.parse(JSON.stringify(EXTRA_DECK_CARDS)).map(c => new CardState(c));
    this.opponentExtraDeck = JSON.parse(JSON.stringify(EXTRA_DECK_CARDS)).map(c => new CardState(c));

    this.attackedMonsters = new Set();
    this.winner = null;
    this.isResolvingAction = false;

    this.pendingSummon = null;
    this.pendingExtraSummon = null;
    this.isDiscarding = false;
    this.pendingFusionTargets = { player: null, opponent: null };
    this.startingPlayerId = 'player';
    this._endPhaseProcessedKey = null;
    this._duelEnded = false;
    this.endReason = null;
  }

  setRulesMode(mode) {
    if (mode !== 'strict' && mode !== 'sandbox') return false;
    this.rulesMode = mode;
    return true;
  }

  setAIDifficulty(level) {
    if (!['easy', 'normal', 'hard'].includes(level)) return false;
    this.aiDifficulty = level;
    return true;
  }

  getAIDecisionProfile(level = this.aiDifficulty) {
    const profiles = {
      easy: {
        level: 'easy',
        valuesCardAdvantage: false,
        usesExtraDeck: false,
        avoidsLosingBattles: false,
        setsTraps: false,
        thinkDelay: 700
      },
      normal: {
        level: 'normal',
        valuesCardAdvantage: true,
        usesExtraDeck: true,
        avoidsLosingBattles: true,
        setsTraps: true,
        thinkDelay: 1000
      },
      hard: {
        level: 'hard',
        valuesCardAdvantage: true,
        usesExtraDeck: true,
        avoidsLosingBattles: true,
        setsTraps: true,
        thinkDelay: 450,
        preservesTributeValue: true,
        playsAroundHiddenInformation: true
      }
    };
    return profiles[level] || profiles.normal;
  }

  chooseAIAttackTarget(attacker, targets) {
    if (!attacker || !targets?.length) return null;
    const visibleStat = target => {
      if (target.card.isSetFaceDown) {
        // The AI must not inspect private DEF; hard mode uses a conservative
        // heuristic while lower modes treat it as unknown.
        return this.aiDifficulty === 'hard' ? 1800 : 0;
      }
      return target.card.position === 'defense'
        ? target.card.getDef()
        : target.card.getAtk();
    };
    if (this.aiDifficulty === 'easy') return targets[0];
    const ordered = [...targets].sort((a, b) => visibleStat(a) - visibleStat(b));
    if (this.aiDifficulty === 'hard') {
      return ordered.find(target => attacker.getAtk() >= visibleStat(target))
        || ordered.find(target => target.card.isSetFaceDown)
        || null;
    }
    return ordered[0];
  }

  scoreAISpell(card) {
    const playerMonsters = this.getMonsterEntries('player').length;
    const graveTargets = [...this.playerGraveyard, ...this.opponentGraveyard]
      .filter(monster => this.canSpecialSummonFromGrave(monster)).length;
    const scores = {
      '12580477': 80 + (playerMonsters * 20), // Raigeki
      '24094653': 105, // Polymerization, only offered with a legal Fusion
      '83764718': 70 + (graveTargets * 5), // Monster Reborn
      '55144522': 90 // Pot of Greed (Sandbox only in current format)
    };
    return scores[String(card?.id)] || 10;
  }

  async tryAISynchroSummon(profile = this.getAIDecisionProfile()) {
    if (!profile.usesExtraDeck || this.winner || this._duelEnded) return false;
    const candidates = this.opponentExtraDeck
      .filter(card => card.extra_type === 'synchro')
      .map(card => ({
        card,
        materials: this.getSynchroMaterialCombination(card, 'opponent')
      }))
      .filter(option => option.materials?.length)
      .sort((a, b) => b.card.getAtk() - a.card.getAtk());
    const option = candidates[0];
    if (!option) return false;
    if (this.defense.isActionProhibited('opponent', 'SPECIAL_SUMMON', option.card)) {
      return false;
    }

    this.log(`L'adversaire prépare une Invocation Synchro de **${option.card.name}** !`, 'opponent');
    if (!(await this.delay(500))) return false;

    // The preparation delay is asynchronous: revalidate the complete
    // transaction against the live field before consuming materials.
    const materialEntries = option.materials.map(material => (
      this.getMonsterEntries('opponent', { faceUpOnly: true })
        .find(candidate => candidate.card === material)
    ));
    const extraIndex = this.opponentExtraDeck.indexOf(option.card);
    const destination = this.getProjectedSpecialSummonDestination(
      'opponent',
      materialEntries.filter(Boolean)
    );
    if (
      materialEntries.some(entry => !entry)
      || extraIndex === -1
      || !destination
      || this.winner
      || this._duelEnded
      || this.defense.isActionProhibited('opponent', 'SPECIAL_SUMMON', option.card)
      || !this.summons.validateSynchroSummon(
        option.materials,
        option.card.getLevel(),
        option.card
      )
    ) {
      return false;
    }

    materialEntries.forEach(entry => {
      this.removeMonsterEntry('opponent', entry);
      this.field.sendToGraveyard(entry.card, entry.card.ownerId);
      this.emitMonsterAnimation('destroy', 'opponent', entry);
    });
    this.opponentExtraDeck.splice(extraIndex, 1);
    const summoned = destination.zoneType === 'main'
      ? this.specialSummonCard(option.card, 'opponent', destination.zoneIndex, {
        position: 'attack',
        summonType: 'synchro',
        properlySummoned: true
      })
      : this.specialSummonToExtraMonsterZone(
        option.card,
        'opponent',
        destination.zoneIndex,
        {
          summonType: 'synchro',
          properlySummoned: true
        }
      );
    if (summoned === false) return false;
    this.log(`L'adversaire réalise l'Invocation Synchro de **${option.card.name}** !`, 'opponent');
    this.stateChanged();
    return true;
  }

  /**
   * All engine delays are generation-bound. Resetting/restarting a duel clears
   * stale callbacks so a previous AI turn can never mutate the new duel.
   */
  delay(ms) {
    const generation = this._duelGeneration;
    return new Promise(resolve => {
      const pending = {
        id: null,
        resolve
      };
      pending.id = setTimeout(() => {
        this._pendingDelays.delete(pending);
        resolve(generation === this._duelGeneration && !this._duelEnded);
      }, ms);
      this._pendingDelays.add(pending);
    });
  }

  scheduleAction(action, ms) {
    const generation = this._duelGeneration;
    const pending = {
      id: null
    };
    pending.id = setTimeout(() => {
      this._pendingScheduledActions.delete(pending);
      if (generation === this._duelGeneration && !this._duelEnded) action();
    }, ms);
    this._pendingScheduledActions.add(pending);
    return pending.id;
  }

  cancelPendingAsyncWork() {
    if (this._pendingDelays) {
      this._pendingDelays.forEach(pending => {
        clearTimeout(pending.id);
        // Resolve false so callers unwind instead of retaining old game objects.
        pending.resolve(false);
      });
      this._pendingDelays.clear();
    }
    if (this._pendingScheduledActions) {
      this._pendingScheduledActions.forEach(pending => clearTimeout(pending.id));
      this._pendingScheduledActions.clear();
    }
  }

  dispose() {
    this._duelEnded = true;
    this.cancelPendingAsyncWork();
  }

  isDuelGenerationCurrent(generation) {
    return generation === this._duelGeneration;
  }

  async requestDecision(request, fallback = null) {
    const generation = this._duelGeneration;
    try {
      const result = await this.callbacks.onDecision({
        ...request,
        rulesMode: this.rulesMode,
        turn: this.currentTurn,
        phase: this.currentPhase
      });
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) {
        return null;
      }
      // `undefined` means that no adapter handled the request. `null` is an
      // explicit player cancellation and must never trigger auto-selection.
      if (result !== undefined) return result;
    } catch (error) {
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) {
        return null;
      }
      this.log(`Décision UI ignorée : ${error.message}`, 'system');
    }
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) {
      return null;
    }
    return typeof fallback === 'function' ? fallback() : fallback;
  }

  // Backwards-compatible Proxies for main.js and board.js UI mapping
  get playerMonsters() { return this.field.playerMonsterZones; }
  get opponentMonsters() { return this.field.opponentMonsterZones; }
  get playerSpells() { return this.field.playerSpellZones; }
  get opponentSpells() { return this.field.opponentSpellZones; }
  get playerGraveyard() { return this.field.playerGraveyard; }
  get opponentGraveyard() { return this.field.opponentGraveyard; }
  get playerBanished() { return this.field.playerBanished; }
  get opponentBanished() { return this.field.opponentBanished; }
  get playerFaceUpExtraDeck() { return this.field.playerFaceUpExtraDeck; }
  get opponentFaceUpExtraDeck() { return this.field.opponentFaceUpExtraDeck; }
  get extraMonsterZones() { return this.field.extraMonsterZones; }
  get playerFieldSpell() { return this.field.playerFieldSpellZone; }
  get opponentFieldSpell() { return this.field.opponentFieldSpellZone; }
  get currentTurn() { return this.phases.currentTurnOwner; }
  get currentPhase() { return this.phases.currentPhase; }
  get turnCount() { return this.phases.turnCount; }
  get normalSummonedThisTurn() { return this.summons.normalSummonAllowance.used > 0; }

  log(message, type = 'system') {
    this.callbacks.onLog(message, type);
  }

  stateChanged() {
    this.stabilizer.stabilize(this);
    this.callbacks.onStateChange(this);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  isStrictlySupportedMainDeckCard(card) {
    return isStrictCardSupported(card, 'main');
  }

  validateDeckForCurrentMode(mainDeck, extraDeck = []) {
    if (this.rulesMode === 'sandbox') return { valid: true, issues: [] };

    const result = this.match.validateDeck({
      mainDeck,
      extraDeck,
      sideDeck: []
    });
    const issues = [...result.issues];

    mainDeck.forEach(card => {
      if (!this.isStrictlySupportedMainDeckCard(card)) {
        issues.push({
          code: 'UNSUPPORTED_MAIN_PROCEDURE',
          message: `${card.name} utilise une procédure non supportée en mode TCG strict.`
        });
      }
    });

    extraDeck.forEach(card => {
      if (!isStrictCardSupported(card, 'extra')) {
        issues.push({
          code: 'UNSUPPORTED_EXTRA_PROCEDURE',
          message: `${card.name} n'est pas encore jouable en mode TCG strict.`
        });
      }
    });

    return { valid: issues.length === 0, issues };
  }

  createStrictDefaultDeck() {
    const legalPool = STARTER_CARDS.filter(card => (
      String(card.id) !== '55144522'
      && this.isStrictlySupportedMainDeckCard(new CardState(card))
    ));
    const result = [];
    for (const card of legalPool) {
      const limit = String(card.id) === '83764718' ? 1 : 3;
      for (let copy = 0; copy < limit && result.length < 40; copy += 1) {
        result.push(card);
      }
      if (result.length === 40) break;
    }
    return result;
  }

  startDuel(playerDeck, opponentDeck, playerExtra, opponentExtra, duelOptions = {}) {
    this.reset();
    this.log("Le duel commence ! Préparez vos disques de duel !", "duel-start");

    const defaultDeck = this.rulesMode === 'strict'
      ? this.createStrictDefaultDeck()
      : [...STARTER_CARDS];
    const basePlayerDeck = Array.isArray(playerDeck) ? playerDeck : defaultDeck;
    const baseOpponentDeck = Array.isArray(opponentDeck) ? opponentDeck : defaultDeck;

    // An explicitly empty Extra Deck is intentional and must stay empty.
    const basePlayerExtra = Array.isArray(playerExtra) ? playerExtra : [...EXTRA_DECK_CARDS];
    const baseOpponentExtra = Array.isArray(opponentExtra) ? opponentExtra : [...EXTRA_DECK_CARDS];

    if (basePlayerDeck.length === 0 || baseOpponentDeck.length === 0) {
      const issues = ['Le Main Deck ne peut pas être vide.'];
      this.log(`Deck refusé : ${issues[0]}`, 'danger');
      this.callbacks.onAnimation({ type: 'deck-invalid', issues });
      this.stateChanged();
      return false;
    }

    const playerValidation = this.validateDeckForCurrentMode(basePlayerDeck, basePlayerExtra);
    const opponentValidation = this.validateDeckForCurrentMode(baseOpponentDeck, baseOpponentExtra);
    if (!playerValidation.valid || !opponentValidation.valid) {
      const issues = [
        ...playerValidation.issues.map(issue => `Joueur : ${issue.message}`),
        ...opponentValidation.issues.map(issue => `Adversaire : ${issue.message}`)
      ];
      this.log(`Deck refusé en mode TCG strict : ${issues.join(' | ')}`, 'danger');
      this.callbacks.onAnimation({ type: 'deck-invalid', issues });
      this.stateChanged();
      return false;
    }

    // Instantiate and wrap all deck cards in CardState
    let playerInstances = [];
    let opponentInstances = [];

    if (this.rulesMode === 'sandbox') {
      while (playerInstances.length < 25) {
        playerInstances.push(...JSON.parse(JSON.stringify(basePlayerDeck)));
      }
      while (opponentInstances.length < 25) {
        opponentInstances.push(...JSON.parse(JSON.stringify(baseOpponentDeck)));
      }
    } else {
      playerInstances = JSON.parse(JSON.stringify(basePlayerDeck));
      opponentInstances = JSON.parse(JSON.stringify(baseOpponentDeck));
    }

    this.playerDeck = playerInstances.map((c, idx) => {
      const cardState = new CardState(c);
      cardState.uid = `p_${idx}_${c.id}`;
      cardState.ownerId = 'player';
      cardState.controllerId = 'player';
      cardState.location = 'deck';
      return cardState;
    });

    this.opponentDeck = opponentInstances.map((c, idx) => {
      const cardState = new CardState(c);
      cardState.uid = `o_${idx}_${c.id}`;
      cardState.ownerId = 'opponent';
      cardState.controllerId = 'opponent';
      cardState.location = 'deck';
      return cardState;
    });

    // Map Extra Decks
    this.playerExtraDeck = basePlayerExtra.map((c, idx) => {
      const cardState = new CardState(c);
      cardState.uid = `p_extra_${idx}_${c.id}`;
      cardState.ownerId = 'player';
      cardState.controllerId = 'player';
      cardState.location = 'extra_deck';
      return cardState;
    });

    this.opponentExtraDeck = baseOpponentExtra.map((c, idx) => {
      const cardState = new CardState(c);
      cardState.uid = `o_extra_${idx}_${c.id}`;
      cardState.ownerId = 'opponent';
      cardState.controllerId = 'opponent';
      cardState.location = 'extra_deck';
      return cardState;
    });

    this.shuffle(this.playerDeck);
    this.shuffle(this.opponentDeck);

    // Initial starting draws
    this.turn.drawStartingHands(this);

    const requestedStartingPlayer = duelOptions?.startingPlayer;
    this.startingPlayerId = requestedStartingPlayer === 'opponent'
      ? 'opponent'
      : 'player';
    this.phases.currentTurnOwner = this.startingPlayerId;
    this.phases.currentPhase = 'draw';
    this.startPhaseFlow();
    return true;
  }

  drawCard(target, isSilent = false) {
    if (this.winner || this._duelEnded) return null;
    const deck = target === 'player' ? this.playerDeck : this.opponentDeck;
    const hand = target === 'player' ? this.playerHand : this.opponentHand;

    if (deck.length === 0) {
      this.log(`Plus de cartes dans le Deck de ${target === 'player' ? 'Joueur' : 'Adversaire'} ! Défaite par Deck Out.`, 'danger');
      this.endGame(
        target === 'player' ? 'opponent' : 'player',
        'deck_out'
      );
      return null;
    }

    const cardState = deck.pop();
    cardState.location = 'hand';
    hand.push(cardState);

    if (!isSilent) {
      if (target === 'player') {
        this.log(`Vous piochez : **${cardState.name}**`, target);
        this.callbacks.onAnimation({ type: 'draw', target, card: cardState });
      } else {
        // Hidden information must not leak through either the public log or
        // animation payload consumed by spectators.
        this.log("L'adversaire pioche une carte.", target);
        this.callbacks.onAnimation({ type: 'draw', target, card: null, hidden: true });
      }
      this.stateChanged();
    }
    return cardState;
  }

  /**
   * Adds external card data to a hand while preserving the CardState contract.
   * This is used by the sandbox card search, whose API results are plain objects.
   */
  addCardToHand(cardData, target = 'player') {
    if (!cardData || (target !== 'player' && target !== 'opponent')) return null;

    const cardState = cardData instanceof CardState ? cardData : new CardState(cardData);
    if (this.rulesMode === 'strict' && !this.isStrictlySupportedMainDeckCard(cardState)) {
      this.log(`Mode TCG strict : **${cardState.name}** ne peut pas être ajouté à la Main par le Sandbox.`, 'danger');
      return null;
    }
    cardState.uid = `${target === 'player' ? 'p' : 'o'}_sandbox_${Date.now()}_${cardState.id}`;
    cardState.ownerId = target;
    cardState.controllerId = target;
    cardState.location = 'hand';

    const hand = target === 'player' ? this.playerHand : this.opponentHand;
    hand.push(cardState);
    this.stateChanged();
    return cardState;
  }

  async startPhaseFlow() {
    if (this.winner || this._duelEnded) return false;
    this.stateChanged();

    if (this.currentPhase === 'draw') {
      this.log(`--- Tour ${this.turnCount} - ${this.currentTurn === 'player' ? 'Joueur' : 'Adversaire'} : Phase de Pioche ---`, 'phase');
      this.attackedMonsters.clear();
      this.summons.reset();
      this.pendingSummon = null;
      this.pendingExtraSummon = null;
      this.isDiscarding = false;

      // Reset turn restrictions on card states
      this.playerMonsters.forEach(m => m && m.resetTurnStatus());
      this.opponentMonsters.forEach(m => m && m.resetTurnStatus());
      this.field.extraMonsterZones.forEach(entry => entry?.card?.resetTurnStatus());

      if (!(await this.delay(600))) return false;

      // Starting player does not draw on Turn 1
      if (!this.turn.shouldDrawOnDrawPhase(
        this.turnCount,
        this.currentTurn === this.startingPlayerId
      )) {
        this.log("Règle TCG : Le joueur qui commence ne pioche pas au premier tour.", "system");
      } else {
        this.drawCard(this.currentTurn);
        if (this.winner) return false;
      }

      if (!(await this.delay(600))) return false;
      this.phases.nextPhase(); // To Standby
      this.startPhaseFlow();
    }
    else if (this.currentPhase === 'standby') {
      this.log(`--- Standby Phase ---`, 'phase');

      // Trigger Standby Maintenance effects (SEGOC)
      if (!(await this.delay(600))) return false;

      this.phases.nextPhase(); // To Main 1
      this.startPhaseFlow();
    }
    else if (this.currentPhase === 'main1') {
      this.log(`--- Phase Principale 1 ---`, 'phase');
      this.stateChanged();

      if (this.currentTurn === 'opponent') {
        if (!(await this.delay(1000))) return false;
        await this.runAIMainPhase();
      } else {
        this.checkAutoPass();
      }
    }
    else if (this.currentPhase === 'battle') {
      this.log(`--- Phase de Combat ---`, 'phase');
      this.stateChanged();

      if (this.currentTurn === 'opponent') {
        if (!(await this.delay(1000))) return false;
        await this.runAIBattlePhase();
      } else {
        this.checkAutoPass();
      }
    }
    else if (this.currentPhase === 'main2') {
      this.log(`--- Phase Principale 2 ---`, 'phase');
      this.stateChanged();

      if (this.currentTurn === 'opponent') {
        if (!(await this.delay(1000))) return false;
        this.phases.nextPhase(); // To End
        this.startPhaseFlow();
      } else {
        this.checkAutoPass();
      }
    }
    else if (this.currentPhase === 'end') {
      this.log(`--- Fin de Tour ---`, 'phase');

      const endPhaseKey = `${this.turnCount}:${this.currentTurn}`;
      if (this._endPhaseProcessedKey !== endPhaseKey) {
        this._endPhaseProcessedKey = endPhaseKey;
        await this.processEndPhaseEffects();
        if (this.winner) return false;
      }

      const ready = await this.checkHandSizeLimit();
      if (!ready) return; // Discard hand limit pause

      if (!(await this.delay(500))) return false;

      this.phases.nextPhase(); // Switch turn & resets to Draw
      this.startPhaseFlow();
    }
  }

  changePhase(phase) {
    if (this.currentTurn !== 'player' || this.isResolvingAction || this.pendingSummon || this.pendingExtraSummon || this.isDiscarding) return;

    if (phase === 'battle' && !this.turn.isBattlePhaseLegal(this.turnCount)) {
      this.log("Règle TCG : Pas de Battle Phase au tout premier tour du duel !", "danger");
      return;
    }

    if (phase === 'battle' && this.currentPhase === 'main1') {
      this.phases.currentPhase = 'battle';
      this.phases.setBattleStep('start');
      this.startPhaseFlow();
    }
    else if (phase === 'main2' && this.currentPhase === 'battle') {
      this.phases.currentPhase = 'main2';
      this.startPhaseFlow();
    }
    else if (phase === 'end' && (this.currentPhase === 'main1' || this.currentPhase === 'battle' || this.currentPhase === 'main2')) {
      this.phases.currentPhase = 'end';
      this.startPhaseFlow();
    }
  }

  async checkHandSizeLimit() {
    const hand = this.currentTurn === 'player' ? this.playerHand : this.opponentHand;
    if (hand.length > this.turn.handLimit) {
      const cardsToDiscard = hand.length - this.turn.handLimit;
      if (this.currentTurn === 'player') {
        this.isDiscarding = true;
        this.log(`Limite de main TCG : Vous devez vous défausser de ${cardsToDiscard} carte(s). Double-cliquez sur vos cartes en main.`, 'danger');
        this.stateChanged();
        return false;
      } else {
        for (let i = 0; i < cardsToDiscard; i++) {
          const card = this.opponentHand.pop();
          this.field.sendToGraveyard(card, 'opponent');
          this.log(`L'adversaire se défausse de **${card.name}** pour la limite de main.`, 'opponent');
          this.callbacks.onAnimation({ type: 'lp-loss', target: 'opponent', damage: 0 });
        }
      }
    }
    this.isDiscarding = false;
    return true;
  }

  discardCard(handCardUid) {
    if (this.currentTurn !== 'player' || !this.isDiscarding) return false;

    const idx = this.playerHand.findIndex(c => c.uid === handCardUid);
    if (idx === -1) return false;

    const card = this.playerHand[idx];
    this.playerHand.splice(idx, 1);
    this.field.sendToGraveyard(card, 'player');

    this.log(`Vous défaussez **${card.name}** pour la limite de main.`, 'player');
    this.callbacks.onAnimation({ type: 'discard', target: 'player', card });

    if (this.playerHand.length <= this.turn.handLimit) {
      this.isDiscarding = false;
      this.log("Limite de main respectée. Fin du tour.", "system");

      this.scheduleAction(() => {
        this.phases.currentTurnOwner = 'opponent';
        this.phases.currentPhase = 'draw';
        this.phases.turnCount++;
        this.startPhaseFlow();
      }, 800);
    } else {
      this.stateChanged();
    }
    return true;
  }

  checkAutoPass() {
    if (this.currentTurn !== 'player') return;

    const hasPlayableCard = this.playerHand.some(card => {
      if (card.card_type === 'monster') {
        return !this.normalSummonedThisTurn && this.playerMonsters.some(m => m === null);
      }
      return this.playerSpells.some(s => s === null);
    });

    const canChangePosition = this.getMonsterEntries('player')
      .some(({ card }) => !card.isLinkMonster && card.extra_type !== 'link');
    let canAttack = false;
    if (this.currentPhase === 'battle') {
      canAttack = this.getMonsterEntries('player').some(entry => (
        entry.card.position !== 'defense'
        && !entry.card.isSetFaceDown
        && !this.hasMonsterAttacked(entry)
      ));
    }

    if (!hasPlayableCard && !canChangePosition && !canAttack && !this.isResolvingAction && !this.pendingSummon) {
      this.scheduleAction(() => {
        if (this.currentPhase === 'main1' && this.turnCount > 1) {
          this.log("Système : Aucune action disponible. Entrée en Phase de Combat.", "system");
          this.phases.currentPhase = 'battle';
          this.startPhaseFlow();
        } else if (this.currentPhase === 'main1' && this.turnCount === 1) {
          this.log("Système : Aucune action disponible. Fin de tour.", "system");
          this.phases.currentPhase = 'end';
          this.startPhaseFlow();
        } else if (this.currentPhase === 'battle' || this.currentPhase === 'main2') {
          this.log("Système : Aucune action de combat disponible. Fin de tour.", "system");
          this.phases.currentPhase = 'end';
          this.startPhaseFlow();
        }
      }, 3500);
    }
  }

  async toggleMonsterPosition(zoneReference, target = 'player') {
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return;

    const entry = this.getMonsterEntry(target, zoneReference);
    const card = entry?.card;
    if (!card) return;
    if (card.isLinkMonster || card.extra_type === 'link') {
      this.log("Un Monstre Lien ne peut jamais être en Position de Défense.", "danger");
      return;
    }

    if (card.turnSummoned === this.turnCount) {
      this.log("Ce monstre ne peut pas changer de position le tour où il a été Invoqué ou Posé.", "danger");
      return;
    }

    if (card.hasChangedPositionThisTurn) {
      this.log("Ce monstre a déjà changé de position ce tour.", "danger");
      return;
    }

    if (
      card.hasAttacked
      || card.attacksDeclaredThisTurn > 0
      || this.hasMonsterAttacked(entry)
    ) {
      this.log("Règle TCG : un monstre qui a déclaré une attaque ne peut pas changer de position en Main Phase 2.", "danger");
      return;
    }

    if (card.isSetFaceDown) {
      card.isSetFaceDown = false;
      card.position = 'attack';
      card.hasChangedPositionThisTurn = true;
      this.log(`Vous Flipo-Invoquez **${card.name}** en Position d'Attaque !`, 'player');
      this.emitMonsterAnimation('flip-summon', target, entry, { card });
      if (entry.zoneType === 'main') {
        await this.resolveSummonSuccessEvent(card, target, entry, {
          summonType: 'flip',
          includeJunk: false
        });
      }
    } else {
      card.position = card.position === 'defense' ? 'attack' : 'defense';
      card.hasChangedPositionThisTurn = true;
      this.log(`Vous changez la position de **${card.name}** en Position de ${card.position === 'defense' ? 'Défense' : 'Attaque'}.`, 'player');
      this.emitMonsterAnimation('toggle-position', target, entry, { position: card.position });
    }

    this.stateChanged();
  }

  async summonMonster(handCardUid, zoneIndex) {
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || !this.summons.canNormalSummon() || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return false;

    const cardIndex = this.playerHand.findIndex(c => c.uid === handCardUid);
    if (cardIndex === -1) return false;

    const card = this.playerHand[cardIndex];
    if (!this.summons.canUseNormalSummonProcedure(card)) {
      this.log(`**${card.name}** ne peut pas être Invoqué Normalement. Utilisez sa procédure dédiée.`, 'danger');
      return false;
    }
    let tributesRequired = 0;
    if (card.level >= 7) tributesRequired = 2;
    else if (card.level >= 5) tributesRequired = 1;
    if (
      tributesRequired === 0
      && this.field.getMonsterZone('player', zoneIndex) !== null
    ) return false;

    if (tributesRequired > 0) {
      const activeMonsterCount = this.getMonsterEntries('player').length;
      if (activeMonsterCount < tributesRequired) {
        this.log(`Pas assez de monstres sur le terrain pour sacrifier pour **${card.name}**`, 'danger');
        return false;
      }

      this.pendingSummon = {
        card,
        zoneIndex,
        tributesRequired,
        selectedTributeIndices: [],
        handCardUid,
        isSet: false
      };

      this.log(`Invocation Tribut requise pour **${card.name}**. Sélectionnez ${tributesRequired} monstre(s) !`, 'system');
      this.callbacks.onAnimation({ type: 'awaiting-tributes', target: 'player', tributesRequired });
      this.stateChanged();
      return true;
    }

    // Direct summon
    this.playerHand.splice(cardIndex, 1);
    card.position = 'attack';
    card.isSetFaceDown = false;
    card.turnSummoned = this.turnCount;
    this.field.setMonsterZone('player', zoneIndex, card);
    this.summons.consumeNormalSummon();

    this.log(`Vous invoquez **${card.name}** en Position d'Attaque !`, 'player');
    this.callbacks.onAnimation({ type: 'summon', target: 'player', card, zoneIndex, position: 'attack' });
    await this.resolveSummonSuccessEvent(card, 'player', {
      zoneType: 'main',
      zoneIndex
    }, { summonType: 'normal' });
    this.stateChanged();
    return true;
  }

  async setMonsterFaceDown(handCardUid, zoneIndex) {
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || !this.summons.canNormalSummon() || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return false;

    const cardIndex = this.playerHand.findIndex(c => c.uid === handCardUid);
    if (cardIndex === -1) return false;

    const card = this.playerHand[cardIndex];
    if (!this.summons.canUseNormalSummonProcedure(card)) {
      this.log(`**${card.name}** ne peut pas être Posé avec la procédure d'Invocation Normale.`, 'danger');
      return false;
    }
    let tributesRequired = 0;
    if (card.level >= 7) tributesRequired = 2;
    else if (card.level >= 5) tributesRequired = 1;
    if (
      tributesRequired === 0
      && this.field.getMonsterZone('player', zoneIndex) !== null
    ) return false;

    if (tributesRequired > 0) {
      const activeMonsterCount = this.getMonsterEntries('player').length;
      if (activeMonsterCount < tributesRequired) {
        this.log(`Pas assez de monstres sur le terrain pour poser **${card.name}**`, 'danger');
        return false;
      }

      this.pendingSummon = {
        card,
        zoneIndex,
        tributesRequired,
        selectedTributeIndices: [],
        handCardUid,
        isSet: true
      };

      this.log(`Pose Tribut requise pour **${card.name}**. Sélectionnez ${tributesRequired} monstre(s) !`, 'system');
      this.callbacks.onAnimation({ type: 'awaiting-tributes', target: 'player', tributesRequired });
      this.stateChanged();
      return true;
    }

    // Pose directly face-down
    this.playerHand.splice(cardIndex, 1);
    card.position = 'defense';
    card.isSetFaceDown = true;
    card.turnSummoned = this.turnCount;
    this.field.setMonsterZone('player', zoneIndex, card);
    this.summons.consumeNormalSummon();

    this.log(`Vous posez un monstre face cachée en Position de Défense.`, 'player');
    this.callbacks.onAnimation({ type: 'summon', target: 'player', card, zoneIndex, position: 'defense' });
    this.stateChanged();
    return true;
  }

  async selectSummonTribute(tributeZoneReference) {
    const tributeEntry = this.getMonsterEntry('player', tributeZoneReference);
    if (!this.pendingSummon || !tributeEntry) return;

    const list = this.pendingSummon.selectedTributeIndices;
    const selectionKey = tributeEntry.zoneType === 'main'
      ? tributeEntry.zoneIndex
      : `extra:${tributeEntry.zoneIndex}`;
    const existsIdx = list.indexOf(selectionKey);

    if (existsIdx !== -1) {
      list.splice(existsIdx, 1);
    } else {
      list.push(selectionKey);
    }

    this.callbacks.onAnimation({ type: 'tribute-selection-update', selectedIndices: [...list] });

    if (list.length === this.pendingSummon.tributesRequired) {
      return this.completePendingTributeSummon();
      this.isResolvingAction = true;
      const summonState = this.pendingSummon;
      this.pendingSummon = null;

      // Tribute selected monsters
      summonState.selectedTributeIndices.forEach(reference => {
        const selectedEntry = this.getMonsterEntry('player', reference);
        if (!selectedEntry) return;
        const sacrificed = selectedEntry.card;
        this.removeMonsterEntry('player', selectedEntry);
        this.field.sendToGraveyard(sacrificed, sacrificed.ownerId);
        this.emitMonsterAnimation('destroy', 'player', selectedEntry);
      });

      if (!(await this.delay(600))) return false;

      const handCardIndex = this.playerHand.findIndex(c => c.uid === summonState.handCardUid);
      if (handCardIndex !== -1) {
        this.playerHand.splice(handCardIndex, 1);
      }

      const card = summonState.card;
      card.position = summonState.isSet ? 'defense' : 'attack';
      card.isSetFaceDown = summonState.isSet;
      card.turnSummoned = this.turnCount;
      this.field.setMonsterZone('player', summonState.zoneIndex, card);
      this.summons.consumeNormalSummon();

      this.log(`Vous ${summonState.isSet ? 'posez' : 'invoquez'} **${card.name}** en sacrifiant vos monstres.`, 'player');
      this.callbacks.onAnimation({
        type: 'summon',
        target: 'player',
        card,
        zoneIndex: summonState.zoneIndex,
        position: card.position
      });

      if (!summonState.isSet) {
        await this.resolveSummonSuccessEvent(card, 'player', {
          zoneType: 'main',
          zoneIndex: summonState.zoneIndex
        }, { summonType: 'normal' });
      }

      this.isResolvingAction = false;
      this.stateChanged();
    }
  }

  async completePendingTributeSummon() {
    const summonState = this.pendingSummon;
    if (!summonState) return false;
    const selectedSnapshots = summonState.selectedTributeIndices.map(reference => {
      const entry = this.getMonsterEntry('player', reference);
      return entry
        ? {
          reference,
          card: entry.card,
          runtimeInstanceId: entry.card.runtimeInstanceId
        }
        : null;
    });
    const selectedCards = new Set(
      selectedSnapshots.filter(Boolean).map(snapshot => snapshot.card)
    );
    const destinationOccupant = this.field.getMonsterZone(
      'player',
      summonState.zoneIndex
    );
    const preflightValid = (
      selectedSnapshots.length === summonState.tributesRequired
      && selectedSnapshots.every(Boolean)
      && selectedCards.size === summonState.tributesRequired
      && (!destinationOccupant || selectedCards.has(destinationOccupant))
      && this.playerHand.some(card => card.uid === summonState.handCardUid)
      && this.summons.canNormalSummon()
      && !this.winner
      && !this._duelEnded
    );
    if (!preflightValid) {
      this.log("Invocation Tribut impossible : la destination doit être libérée par les Sacrifices choisis.", 'danger');
      this.stateChanged();
      return false;
    }

    this.isResolvingAction = true;
    if (!(await this.delay(600))) {
      this.isResolvingAction = false;
      return false;
    }

    const liveEntries = selectedSnapshots.map(snapshot => {
      const entry = this.getMonsterEntry('player', snapshot.reference);
      return (
        entry
        && entry.card === snapshot.card
        && entry.card.runtimeInstanceId === snapshot.runtimeInstanceId
      ) ? entry : null;
    });
    const handCardIndex = this.playerHand.findIndex(
      card => card.uid === summonState.handCardUid && card === summonState.card
    );
    const liveSelectedCards = new Set(
      liveEntries.filter(Boolean).map(entry => entry.card)
    );
    const liveDestinationOccupant = this.field.getMonsterZone(
      'player',
      summonState.zoneIndex
    );
    if (
      this.pendingSummon !== summonState
      || liveEntries.some(entry => !entry)
      || liveSelectedCards.size !== summonState.tributesRequired
      || (liveDestinationOccupant && !liveSelectedCards.has(liveDestinationOccupant))
      || handCardIndex === -1
      || !this.summons.canNormalSummon()
      || this.winner
      || this._duelEnded
    ) {
      this.isResolvingAction = false;
      this.log("Invocation Tribut annulée : l'état du Duel a changé.", 'danger');
      this.stateChanged();
      return false;
    }

    // Transaction commit: every cost and the projected destination were
    // revalidated after the asynchronous decision window.
    for (const entry of liveEntries) {
      this.removeMonsterEntry('player', entry);
      this.field.sendToGraveyard(entry.card, entry.card.ownerId);
      this.emitMonsterAnimation('destroy', 'player', entry);
    }
    this.playerHand.splice(handCardIndex, 1);
    const card = summonState.card;
    card.position = summonState.isSet ? 'defense' : 'attack';
    card.isSetFaceDown = summonState.isSet;
    card.turnSummoned = this.turnCount;
    this.field.setMonsterZone('player', summonState.zoneIndex, card);
    this.summons.consumeNormalSummon();
    this.pendingSummon = null;

    this.log(
      `Vous ${summonState.isSet ? 'posez' : 'invoquez'} **${card.name}** en sacrifiant vos monstres.`,
      'player'
    );
    this.callbacks.onAnimation({
      type: 'summon',
      target: 'player',
      card,
      zoneIndex: summonState.zoneIndex,
      position: card.position
    });
    if (!summonState.isSet) {
      await this.resolveSummonSuccessEvent(card, 'player', {
        zoneType: 'main',
        zoneIndex: summonState.zoneIndex
      }, { summonType: 'normal' });
    }
    this.isResolvingAction = false;
    this.callbacks.onAnimation({ type: 'tribute-selection-clear' });
    this.stateChanged();
    return true;
  }

  cancelSummonTribute() {
    if (!this.pendingSummon) return;
    this.pendingSummon = null;
    this.callbacks.onAnimation({ type: 'tribute-selection-clear' });
    this.stateChanged();
  }

  getSideState(side) {
    const isPlayer = side === 'player';
    return {
      hand: isPlayer ? this.playerHand : this.opponentHand,
      deck: isPlayer ? this.playerDeck : this.opponentDeck,
      monsters: isPlayer ? this.playerMonsters : this.opponentMonsters,
      spells: isPlayer ? this.playerSpells : this.opponentSpells,
      graveyard: isPlayer ? this.playerGraveyard : this.opponentGraveyard,
      extraDeck: isPlayer ? this.playerExtraDeck : this.opponentExtraDeck,
      faceUpExtraDeck: isPlayer ? this.playerFaceUpExtraDeck : this.opponentFaceUpExtraDeck,
      extraMonsters: this.field.getControlledExtraMonsters(side)
    };
  }

  getMonsterEntries(side, { faceUpOnly = false } = {}) {
    const state = this.getSideState(side);
    const mainEntries = state.monsters
      .map((card, zoneIndex) => (
        card ? { card, zoneType: 'main', zoneIndex } : null
      ))
      .filter(Boolean);
    const extraEntries = state.extraMonsters.map(entry => ({
      card: entry.card,
      zoneType: 'extra',
      zoneIndex: entry.zoneIndex
    }));
    const entries = [...mainEntries, ...extraEntries];
    return faceUpOnly
      ? entries.filter(entry => !entry.card.isSetFaceDown)
      : entries;
  }

  getControlledFieldCards(side) {
    const state = this.getSideState(side);
    const fieldSpell = side === 'player'
      ? this.playerFieldSpell
      : this.opponentFieldSpell;
    return [
      ...this.getMonsterEntries(side).map(entry => entry.card),
      ...state.spells.filter(Boolean),
      ...(fieldSpell ? [fieldSpell] : [])
    ];
  }

  /**
   * Accepts the legacy numeric Main Monster Zone index as well as an explicit
   * zone reference ({ zoneType: 'main'|'extra', zoneIndex }) or "extra:0".
   * This keeps existing UI calls compatible while allowing shared EMZ cards to
   * participate in every runtime rule.
   */
  normalizeMonsterZoneReference(reference, defaultZoneType = 'main') {
    if (reference && typeof reference === 'object') {
      const zoneType = reference.zoneType === 'extra' || reference.zoneType === 'extra_monster'
        ? 'extra'
        : 'main';
      const zoneIndex = Number(reference.zoneIndex ?? reference.index);
      return Number.isInteger(zoneIndex) ? { zoneType, zoneIndex } : null;
    }
    if (typeof reference === 'string' && reference.includes(':')) {
      const [rawType, rawIndex] = reference.split(':', 2);
      const zoneIndex = Number(rawIndex);
      if (!Number.isInteger(zoneIndex)) return null;
      return {
        zoneType: rawType === 'extra' || rawType === 'extra_monster' ? 'extra' : 'main',
        zoneIndex
      };
    }
    const zoneIndex = Number(reference);
    return Number.isInteger(zoneIndex)
      ? { zoneType: defaultZoneType, zoneIndex }
      : null;
  }

  getMonsterEntry(side, reference, defaultZoneType = 'main') {
    const normalized = this.normalizeMonsterZoneReference(reference, defaultZoneType);
    if (!normalized) return null;
    if (normalized.zoneType === 'extra') {
      const sharedEntry = this.field.getExtraMonsterZone(normalized.zoneIndex);
      if (!sharedEntry || sharedEntry.controllerId !== side) return null;
      return { card: sharedEntry.card, ...normalized };
    }
    const card = this.field.getMonsterZone(side, normalized.zoneIndex);
    return card ? { card, ...normalized } : null;
  }

  getMonsterZoneKey(reference, defaultZoneType = 'main') {
    const normalized = this.normalizeMonsterZoneReference(reference, defaultZoneType);
    return normalized ? `${normalized.zoneType}:${normalized.zoneIndex}` : null;
  }

  hasMonsterAttacked(reference) {
    const normalized = this.normalizeMonsterZoneReference(reference);
    if (!normalized) return false;
    const key = this.getMonsterZoneKey(normalized);
    return this.attackedMonsters.has(key)
      || (normalized.zoneType === 'main' && this.attackedMonsters.has(normalized.zoneIndex));
  }

  markMonsterAttacked(reference) {
    const normalized = this.normalizeMonsterZoneReference(reference);
    if (!normalized) return false;
    this.attackedMonsters.add(this.getMonsterZoneKey(normalized));
    // Preserve the public legacy set shape for code that still reads numeric
    // Main Monster Zone indices.
    if (normalized.zoneType === 'main') this.attackedMonsters.add(normalized.zoneIndex);
    return true;
  }

  unmarkMonsterAttacked(reference) {
    const normalized = this.normalizeMonsterZoneReference(reference);
    if (!normalized) return false;
    this.attackedMonsters.delete(this.getMonsterZoneKey(normalized));
    if (normalized.zoneType === 'main') {
      this.attackedMonsters.delete(normalized.zoneIndex);
    }
    return true;
  }

  emitMonsterAnimation(type, side, entry, extra = {}) {
    if (!entry) return;
    this.callbacks.onAnimation({
      type,
      target: side,
      zoneType: entry.zoneType,
      zoneIndex: entry.zoneIndex,
      ...extra
    });
  }

  removeMonsterEntry(side, entry) {
    if (!entry?.card) return false;
    if (entry.zoneType === 'extra') {
      if (this.field.getExtraMonsterZone(entry.zoneIndex)?.card !== entry.card) return false;
      this.field.setExtraMonsterZone(entry.zoneIndex, side, null);
      return true;
    }
    if (this.field.getMonsterZone(side, entry.zoneIndex) !== entry.card) return false;
    this.field.setMonsterZone(side, entry.zoneIndex, null);
    return true;
  }

  getOpponentSide(side) {
    return side === 'player' ? 'opponent' : 'player';
  }

  /**
   * Computes an Extra Deck summon destination on the field that would exist
   * after the selected materials leave it, without mutating the live duel.
   */
  getProjectedSpecialSummonDestinations(side, materialEntries = [], {
    mainMode = 'any',
    preferExtra = false
  } = {}) {
    const state = this.getSideState(side);
    const materialCards = new Set(
      materialEntries
        .map(entry => entry?.card || entry)
        .filter(Boolean)
    );
    const projectedMainZones = state.monsters.map(card => (
      card && materialCards.has(card) ? null : card
    ));

    let mainZones = [];
    if (mainMode === 'any') {
      mainZones = projectedMainZones
        .map((card, index) => (card === null ? index : -1))
        .filter(index => index >= 0);
    } else if (mainMode === 'linked') {
      const linkedZoneCandidates = new Set();
      this.field.getControlledExtraMonsters(side)
        .filter(entry => !materialCards.has(entry.card))
        .forEach(({ card, zoneIndex }) => {
          if (card.linkArrows?.includes('bottom-left')) {
            linkedZoneCandidates.add(zoneIndex === 0 ? 0 : 2);
          }
          if (card.linkArrows?.includes('bottom-right')) {
            linkedZoneCandidates.add(zoneIndex === 0 ? 2 : 4);
          }
        });
      mainZones = [...linkedZoneCandidates]
        .filter(zoneIndex => projectedMainZones[zoneIndex] === null);
    }

    const projectedExtraZones = this.field.extraMonsterZones.map(entry => (
      entry && materialCards.has(entry.card) ? null : entry
    ));
    const projectedOwnExtraCount = projectedExtraZones.filter(
      entry => entry?.controllerId === side
    ).length;
    const extraZones = projectedOwnExtraCount > 0
      ? []
      : projectedExtraZones
        .map((entry, index) => (entry === null ? index : -1))
        .filter(index => index >= 0);
    const mainDestinations = mainZones.map(zoneIndex => ({
      zoneType: 'main',
      zoneIndex
    }));
    const extraDestinations = extraZones.map(zoneIndex => ({
      zoneType: 'extra',
      zoneIndex
    }));

    return preferExtra
      ? [...extraDestinations, ...mainDestinations]
      : [...mainDestinations, ...extraDestinations];
  }

  getProjectedSpecialSummonDestination(side, materialEntries = [], options = {}) {
    return this.getProjectedSpecialSummonDestinations(
      side,
      materialEntries,
      options
    )[0] || null;
  }

  getMainMonsterZoneDestinations(side, materialEntries = []) {
    return this.getProjectedSpecialSummonDestinations(side, materialEntries)
      .filter(destination => destination.zoneType === 'main');
  }

  getSummonDestinationKey(destination) {
    return destination
      ? `${destination.zoneType}:${destination.zoneIndex}`
      : null;
  }

  formatSummonDestination(destination) {
    if (!destination) return 'Zone indisponible';
    return destination.zoneType === 'extra'
      ? `Zone Monstre Extra ${destination.zoneIndex + 1}`
      : `Zone Monstre Principale ${destination.zoneIndex + 1}`;
  }

  async chooseSummonDestination(card, side, destinations, summonType = 'special') {
    if (!card || !destinations?.length) return null;
    const choices = destinations.map(destination => ({
      value: this.getSummonDestinationKey(destination),
      label: this.formatSummonDestination(destination)
    }));
    const decision = await this.requestDecision({
      type: 'select-summon-destination',
      side,
      title: "ZONE D'INVOCATION",
      description: `Choisissez la Zone où Invoquer ${card.name}.`,
      required: false,
      summonType,
      card: {
        uid: card.uid,
        id: card.id,
        name: card.name
      },
      choices
    }, choices[0].value);
    const key = typeof decision === 'string'
      ? decision
      : this.getSummonDestinationKey(decision);
    return destinations.find(destination => (
      this.getSummonDestinationKey(destination) === key
    )) || null;
  }

  getMaterialCombinationKey(combination) {
    return combination
      .map(material => material?.card || material)
      .map(card => String(card?.uid))
      .sort()
      .join('|');
  }

  formatMaterialCombination(combination) {
    return combination
      .map(material => material?.card || material)
      .map(card => `${card.name} (${card.location === 'hand' ? 'Main' : 'Terrain'})`)
      .join(' + ');
  }

  async chooseMaterialCombination(type, side, summonCard, combinations) {
    if (!summonCard || !combinations?.length) return null;
    const choices = combinations.map(combination => ({
      value: combination.map(material => String((material?.card || material).uid)),
      label: this.formatMaterialCombination(combination)
    }));
    const decision = await this.requestDecision({
      type,
      side,
      title: 'CHOISIR LES MATÉRIELS',
      description: `Choisissez les Matériels pour ${summonCard.name}.`,
      required: false,
      summonCard: {
        uid: summonCard.uid,
        id: summonCard.id,
        name: summonCard.name
      },
      choices
    }, choices[0].value);
    if (!Array.isArray(decision)) return null;
    const decisionKey = decision
      .map(value => this.decisionUid(value))
      .filter(Boolean)
      .sort()
      .join('|');
    return combinations.find(combination => (
      this.getMaterialCombinationKey(combination) === decisionKey
    )) || null;
  }

  decisionUid(decision) {
    if (typeof decision === 'string' || typeof decision === 'number') return String(decision);
    if (decision && (decision.uid || decision.cardUid)) {
      return String(decision.uid || decision.cardUid);
    }
    return null;
  }

  async chooseCard(type, side, candidates, fallbackSelector = null, extra = {}) {
    if (!candidates.length) return null;
    const fallback = fallbackSelector
      ? fallbackSelector(candidates)
      : candidates[0];
    const decision = await this.requestDecision({
      type,
      side,
      candidates: candidates.map(card => ({
        uid: card.uid,
        id: card.id,
        name: card.name,
        atk: card.getAtk ? card.getAtk() : card.atk,
        def: card.getDef ? card.getDef() : card.def,
        level: card.getLevel ? card.getLevel() : card.level,
        location: card.location
      })),
      ...extra
    }, fallback?.uid || null);
    if (decision === null) return null;
    const uid = this.decisionUid(decision);
    // A broad legacy callback may answer a different decision type with a
    // boolean or an unrelated UID. Only explicit null cancels; malformed
    // answers use the already validated deterministic fallback.
    return candidates.find(card => String(card.uid) === uid) || fallback || null;
  }

  async chooseSummonPosition(card, side, summonType = 'special') {
    if (!card) return 'attack';
    if (card.extra_type === 'link' || /\bLink\b/i.test(card.type || '')) {
      return 'attack';
    }

    const decision = await this.requestDecision({
      type: 'select-summon-position',
      side,
      title: "POSITION D'INVOCATION",
      description: `Choisissez la position de ${card.name}.`,
      required: true,
      summonType,
      card: {
        uid: card.uid,
        id: card.id,
        name: card.name
      },
      choices: [
        { value: 'attack', label: "POSITION D'ATTAQUE" },
        { value: 'defense', label: 'POSITION DE DÉFENSE' }
      ]
    }, 'attack');

    if (decision === null) return null;
    return decision === 'defense' ? 'defense' : 'attack';
  }

  canSpecialSummonFromGrave(card) {
    if (!card || card.card_type !== 'monster') return false;
    if ((card.belongsInExtraDeck || card.isRitualMonster) && !card.wasProperlySpecialSummoned) {
      return false;
    }
    return true;
  }

  specialSummonCard(card, side, zoneIndex, {
    position = 'attack',
    summonType = 'special',
    negateEffectsUntilEndTurn = false,
    negateEffectsWhileFaceUp = false,
    properlySummoned = false
  } = {}) {
    if (!card || this.winner) return false;
    const sideState = this.getSideState(side);
    const destination = zoneIndex ?? sideState.monsters.findIndex(monster => monster === null);
    if (destination < 0 || sideState.monsters[destination] !== null) return false;
    if (this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', card)) return false;

    const resolvedPosition = (
      card.extra_type === 'link' || /\bLink\b/i.test(card.type || '')
    )
      ? 'attack'
      : (position === 'defense' ? 'defense' : 'attack');
    this.field.setMonsterZone(side, destination, card);
    card.position = resolvedPosition;
    card.isSetFaceDown = false;
    card.isFaceUpInExtraDeck = false;
    card.turnSummoned = this.turnCount;
    card.summonType = summonType;
    card.wasProperlySpecialSummoned = card.wasProperlySpecialSummoned || properlySummoned;
    if (negateEffectsWhileFaceUp) {
      card.effectNegated = true;
      card.effectNegationScope = 'while_face_up_instance';
      card.effectNegationRuntimeInstanceId = card.runtimeInstanceId;
      // Kept for compatibility with existing UI/network snapshots. The scope
      // above is authoritative and deliberately survives turn reset.
      card.effectsNegatedUntilEndTurn = true;
    } else if (negateEffectsUntilEndTurn) {
      card.effectNegated = true;
      card.effectNegationScope = 'turn_end';
      card.effectNegationRuntimeInstanceId = card.runtimeInstanceId;
      card.effectsNegatedUntilEndTurn = true;
    }
    this.summons.turnSummonHistory.totalSpecialSummons += 1;
    this.summons.turnSummonHistory.summonCountByType[summonType] =
      (this.summons.turnSummonHistory.summonCountByType[summonType] || 0) + 1;
    this.summons.turnSummonHistory.successfulSummons.push({
      uid: card.uid,
      side,
      summonType,
      turn: this.turnCount
    });
    this.callbacks.onAnimation({
      type: 'summon',
      target: side,
      card,
      zoneIndex: destination,
      position: resolvedPosition
    });
    this.handleSynchroSummoned(card, side, summonType);
    return destination;
  }

  specialSummonToExtraMonsterZone(card, side, extraZoneIndex, {
    position = 'attack',
    summonType = 'link',
    properlySummoned = true
  } = {}) {
    if (!card || this.winner) return false;
    const availableZones = this.field.getAvailableExtraMonsterZones(side);
    const destination = extraZoneIndex ?? availableZones[0];
    if (!availableZones.includes(destination)) return false;
    if (this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', card)) return false;

    const resolvedPosition = (
      card.extra_type === 'link' || /\bLink\b/i.test(card.type || '')
    )
      ? 'attack'
      : (position === 'defense' ? 'defense' : 'attack');
    this.field.setExtraMonsterZone(destination, side, card);
    card.position = resolvedPosition;
    card.isSetFaceDown = false;
    card.isFaceUpInExtraDeck = false;
    card.turnSummoned = this.turnCount;
    card.summonType = summonType;
    card.wasProperlySpecialSummoned = card.wasProperlySpecialSummoned || properlySummoned;
    this.summons.turnSummonHistory.totalSpecialSummons += 1;
    this.summons.turnSummonHistory.summonCountByType[summonType] =
      (this.summons.turnSummonHistory.summonCountByType[summonType] || 0) + 1;
    this.summons.turnSummonHistory.successfulSummons.push({
      uid: card.uid,
      side,
      summonType,
      zoneType: 'extra',
      zoneIndex: destination,
      turn: this.turnCount
    });
    this.callbacks.onAnimation({
      type: 'summon',
      target: side,
      card,
      zoneType: 'extra',
      zoneIndex: destination,
      position: resolvedPosition
    });
    this.handleSynchroSummoned(card, side, summonType);
    return destination;
  }

  handleSynchroSummoned(card, side, summonType) {
    if (summonType !== 'synchro') return false;
    if (String(card?.id) === '31924889') {
      card.addCounter('spell', 2);
      this.log(`**${card.name}** reçoit 2 Compteurs Magie lors de son Invocation Synchro.`, side);
    }
    return true;
  }

  async buildJunkSynchronSummonTrigger(card, side, zoneIndex) {
    if (!card || String(card.id) !== '63977008' || card.effectNegated) return false;
    const state = this.getSideState(side);
    const candidates = state.graveyard.filter(candidate => (
      candidate.card_type === 'monster'
      && candidate.getLevel() > 0
      && candidate.getLevel() <= 2
      && this.canSpecialSummonFromGrave(candidate)
    ));
    if (!candidates.length || !state.monsters.some(monster => monster === null)) return false;

    const activate = await this.requestDecision({
      type: 'activate-monster-effect',
      effect: 'junk-synchron-revive',
      side,
      card: { uid: card.uid, id: card.id, name: card.name },
      optional: true
    }, true);
    if (!activate) return false;

    const target = await this.chooseCard(
      'select-junk-synchron-target',
      side,
      candidates,
      cards => [...cards].sort((a, b) => b.getAtk() - a.getAtk())[0]
    );
    if (!target) return false;
    const targetUid = target.uid;
    const targetRuntimeInstanceId = target.runtimeInstanceId;

    const link = this.chain.pushChainLink(side, card, [target], {
      context: {
        event: 'SUMMON_SUCCESS',
        trigger: 'junk-synchron',
        targetUid,
        targetRuntimeInstanceId
      },
      resolver: async () => {
        if (
          state.graveyard.indexOf(target) === -1
          || target.uid !== targetUid
          || target.runtimeInstanceId !== targetRuntimeInstanceId
        ) return false;
        const destination = await this.chooseSummonDestination(
          target,
          side,
          this.getMainMonsterZoneDestinations(side),
          'junk-synchron'
        );
        const currentIndex = state.graveyard.indexOf(target);
        const destinationStillAvailable = destination
          && state.monsters[destination.zoneIndex] === null;
        if (
          currentIndex === -1
          || target.uid !== targetUid
          || target.runtimeInstanceId !== targetRuntimeInstanceId
          || !destinationStillAvailable
          || !this.canSpecialSummonFromGrave(target)
          || this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', target)
        ) return false;
        state.graveyard.splice(currentIndex, 1);
        const summonedZone = this.specialSummonCard(target, side, destination.zoneIndex, {
          position: 'defense',
          summonType: 'junk-synchron',
          negateEffectsWhileFaceUp: true
        });
        if (summonedZone === false) {
          state.graveyard.push(target);
          return false;
        }
        this.log(`**${card.name}** Invoque Spécialement **${target.name}** en Défense avec ses effets annulés.`, side);
        return true;
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });
    return link;
  }

  async handleSuccessfulNormalSummon(card, side, zoneIndex) {
    return this.resolveSummonSuccessEvent(card, side, {
      zoneType: 'main',
      zoneIndex
    }, { summonType: 'normal' });
  }

  async resolveSummonSuccessEvent(
    summonedCard,
    summoningSide,
    zoneReference,
    { summonType = 'normal', includeJunk = true } = {}
  ) {
    const generation = this._duelGeneration;
    const entry = this.getMonsterEntry(summoningSide, zoneReference);
    if (!summonedCard || !entry || entry.card !== summonedCard) {
      return { event: 'SUMMON_SUCCESS', activated: false, resolved: false, links: [] };
    }

    const links = [];
    if (includeJunk && summonType === 'normal') {
      const junkLink = await this.buildJunkSynchronSummonTrigger(
        summonedCard,
        summoningSide,
        entry.zoneIndex
      );
      if (!this.isDuelGenerationCurrent(generation)) {
        return { event: 'SUMMON_SUCCESS', activated: false, resolved: false, links: [] };
      }
      if (junkLink) links.push(junkLink);
    }
    if (summonType === 'normal' || summonType === 'flip') {
      const trapLink = await this.resolveTrapHoleOnSummon(
        summoningSide,
        entry.zoneIndex,
        { buildOnly: true }
      );
      if (!this.isDuelGenerationCurrent(generation)) {
        return { event: 'SUMMON_SUCCESS', activated: false, resolved: false, links: [] };
      }
      if (trapLink) links.push(trapLink);
    }

    if (!links.length) {
      return { event: 'SUMMON_SUCCESS', activated: false, resolved: true, links: [] };
    }

    const lastLink = this.chain.getLastLink();
    await this.openChainResponseWindow(
      this.getOpponentSide(lastLink.activatingPlayerId),
      {
        event: 'SUMMON_SUCCESS',
        timingEvent: 'SUMMON_SUCCESS',
        sourceCard: lastLink.sourceCard,
        wouldDestroy: Boolean(lastLink.context?.wouldDestroy),
        summonedCard,
        summoningSide
      }
    );
    if (!this.isDuelGenerationCurrent(generation)) {
      return { event: 'SUMMON_SUCCESS', activated: false, resolved: false, links: [] };
    }
    const chainResult = await this.resolveChainStack();
    if (!this.isDuelGenerationCurrent(generation)) {
      return { event: 'SUMMON_SUCCESS', activated: false, resolved: false, links: [] };
    }
    return {
      event: 'SUMMON_SUCCESS',
      activated: true,
      resolved: chainResult !== false,
      links
    };
  }

  getFusionMaterialCombinations(extraCard, side) {
    const state = this.getSideState(side);
    const pool = [
      ...state.hand.filter(card => card.card_type === 'monster'),
      // Polymerization may use monsters controlled by its player even when
      // they are face-down. This differs from Synchro/Xyz material rules.
      ...this.getMonsterEntries(side).map(entry => entry.card)
    ];
    const requiredIds = extraCard.fusionMaterials?.length
      ? extraCard.fusionMaterials.map(String)
      : (String(extraCard.id) === '23995346'
        ? ['89631139', '89631139', '89631139']
        : []);
    const selections = [];
    const seenSelections = new Set();
    const search = (requirementIndex, selected, usedCards) => {
      if (requirementIndex >= requiredIds.length) {
        const key = selected.map(card => card.uid).sort().join('|');
        if (!seenSelections.has(key)) {
          seenSelections.add(key);
          selections.push([...selected]);
        }
        return;
      }
      const requiredId = requiredIds[requirementIndex];
      pool.forEach(card => {
        if (String(card.id) !== requiredId || usedCards.has(card)) return;
        usedCards.add(card);
        selected.push(card);
        search(requirementIndex + 1, selected, usedCards);
        selected.pop();
        usedCards.delete(card);
      });
    };
    search(0, [], new Set());

    return selections.filter(selection => (
      this.getProjectedSpecialSummonDestinations(side, selection).length > 0
    ));
  }

  getFusionMaterialSelection(extraCard, side) {
    return this.getFusionMaterialCombinations(extraCard, side)[0] || null;
  }

  getFusionOptions(side) {
    const state = this.getSideState(side);
    return state.extraDeck
      .filter(card => card.extra_type === 'fusion')
      .map(card => {
        const materialCombinations = this.getFusionMaterialCombinations(card, side);
        return {
          card,
          materialCombinations,
          materials: materialCombinations[0] || null
        };
      })
      .filter(option => option.materialCombinations.length > 0);
  }

  async performFusionSummon(side, requestedExtraUid = null) {
    const state = this.getSideState(side);
    const options = this.getFusionOptions(side);
    if (!options.length) return false;

    const requested = requestedExtraUid
      ? options.find(option => option.card.uid === requestedExtraUid)
      : null;
    const selectedCard = await this.chooseCard(
      'select-fusion-monster',
      side,
      options.map(option => option.card),
      cards => requested?.card || cards[0]
    );
    if (!selectedCard) return false;
    const option = options.find(candidate => candidate.card === selectedCard) || requested || options[0];
    if (!option) return false;

    const selectedMaterials = await this.chooseMaterialCombination(
      'select-fusion-materials',
      side,
      option.card,
      option.materialCombinations
    );
    if (!selectedMaterials) return false;

    const requirements = (
      option.card.fusionMaterials?.length
        ? option.card.fusionMaterials
        : (String(option.card.id) === '23995346'
          ? ['89631139', '89631139', '89631139']
          : [])
    ).map(String).sort();
    const supplied = selectedMaterials.map(card => String(card.id)).sort();
    if (
      selectedMaterials.length !== requirements.length
      || new Set(selectedMaterials).size !== selectedMaterials.length
      || requirements.some((id, index) => supplied[index] !== id)
    ) {
      this.log("Matériels de Fusion invalides : l'Invocation est annulée.", 'danger');
      return false;
    }

    const summonPosition = await this.chooseSummonPosition(
      option.card,
      side,
      'fusion'
    );
    if (!summonPosition) return false;

    const initialMaterialSources = selectedMaterials.map(material => {
      if (material.location === 'hand' && state.hand.includes(material)) {
        return { card: material, source: 'hand' };
      }
      const entry = this.getMonsterEntries(side)
        .find(candidate => candidate.card === material);
      return entry ? { ...entry, source: 'field' } : null;
    });
    if (initialMaterialSources.some(source => !source)) return false;
    const destination = await this.chooseSummonDestination(
      option.card,
      side,
      this.getProjectedSpecialSummonDestinations(side, initialMaterialSources),
      'fusion'
    );
    if (!destination) return false;

    // Every decision above is asynchronous. Rebuild every live source and
    // validate the exact chosen destination before committing one material.
    const materialSources = selectedMaterials.map(material => {
      if (material.location === 'hand' && state.hand.includes(material)) {
        return { card: material, source: 'hand' };
      }
      const entry = this.getMonsterEntries(side)
        .find(candidate => candidate.card === material);
      return entry ? { ...entry, source: 'field' } : null;
    });
    const extraIndex = state.extraDeck.indexOf(option.card);
    const currentDestinationKeys = this.getProjectedSpecialSummonDestinations(
      side,
      materialSources.filter(Boolean)
    ).map(candidate => this.getSummonDestinationKey(candidate));
    if (
      materialSources.some(source => !source)
      || extraIndex === -1
      || option.card.extra_type !== 'fusion'
      || !currentDestinationKeys.includes(this.getSummonDestinationKey(destination))
      || this.winner
      || this._duelEnded
      || this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', option.card)
    ) {
      this.log("L'Invocation Fusion est interdite ou ses ressources ne sont plus disponibles.", 'danger');
      return false;
    }

    // Transaction commit after the post-decision preflight.
    materialSources.forEach(source => {
      if (source.source === 'hand') {
        state.hand.splice(state.hand.indexOf(source.card), 1);
      } else {
        this.removeMonsterEntry(side, source);
        this.emitMonsterAnimation('destroy', side, source);
      }
      this.field.sendToGraveyard(source.card, source.card.ownerId);
    });
    state.extraDeck.splice(extraIndex, 1);
    const summoned = destination.zoneType === 'main'
      ? this.specialSummonCard(option.card, side, destination.zoneIndex, {
        position: summonPosition,
        summonType: 'fusion',
        properlySummoned: true
      })
      : this.specialSummonToExtraMonsterZone(option.card, side, destination.zoneIndex, {
        position: summonPosition,
        summonType: 'fusion',
        properlySummoned: true
      });
    if (summoned === false) return false;
    this.log(`Invocation Fusion de **${option.card.name}** avec Polymérisation !`, side);
    return true;
  }

  getRitualMaterialSelections(ritualMonster, ritualSpell, side) {
    const state = this.getSideState(side);
    const fieldEntries = this.getMonsterEntries(side);
    const candidates = [
      ...state.hand
        .filter(card => card.card_type === 'monster' && card !== ritualMonster)
        .map(card => ({ card, source: 'hand' })),
      ...fieldEntries.map(entry => ({ ...entry, source: 'field' }))
    ].filter(entry => entry.card.getLevel() > 0);
    const validSelections = [];
    const search = (index, selected) => {
      if (selected.length > 0) {
        const plan = this.summons.createRitualSummonPlan(
          ritualMonster,
          ritualSpell,
          selected.map(entry => entry.card),
          { controllerId: side }
        );
        if (plan.valid) {
          validSelections.push({ entries: [...selected], plan });
          return;
        }
      }
      for (let next = index; next < candidates.length; next += 1) {
        search(next + 1, [...selected, candidates[next]]);
      }
    };
    search(0, []);
    validSelections.sort((a, b) => (
      a.plan.totalLevels - b.plan.totalLevels
      || a.entries.length - b.entries.length
    ));
    return validSelections.filter(selection => (
      this.getMainMonsterZoneDestinations(side, selection.entries).length > 0
    ));
  }

  getRitualMaterialSelection(ritualMonster, ritualSpell, side) {
    return this.getRitualMaterialSelections(ritualMonster, ritualSpell, side)[0] || null;
  }

  getRitualOptions(side, requestedSpell = null) {
    const state = this.getSideState(side);
    const ritualSpells = requestedSpell
      ? [requestedSpell]
      : state.hand.filter(card => card.isRitualSpell);
    const ritualMonsters = state.hand.filter(card => card.isRitualMonster);
    const options = [];
    ritualSpells.forEach(spell => {
      ritualMonsters.forEach(monster => {
        const materialSelections = this.getRitualMaterialSelections(monster, spell, side);
        if (materialSelections.length > 0) {
          options.push({
            spell,
            monster,
            materialSelections,
            materials: materialSelections[0].entries,
            plan: materialSelections[0].plan
          });
        }
      });
    });
    return options;
  }

  async performRitualSummon(side, ritualSpell) {
    const state = this.getSideState(side);
    const options = this.getRitualOptions(side, ritualSpell);
    if (!options.length) return false;

    const target = await this.chooseCard(
      'select-ritual-monster',
      side,
      options.map(option => option.monster),
      cards => [...cards].sort((a, b) => b.getAtk() - a.getAtk())[0]
    );
    if (!target) return false;
    const option = options.find(candidate => candidate.monster === target) || options[0];
    const materialSelection = await this.chooseMaterialCombination(
      'select-ritual-materials',
      side,
      option.monster,
      option.materialSelections.map(selection => selection.entries)
    );
    if (!materialSelection) return false;
    const summonPosition = await this.chooseSummonPosition(
      option.monster,
      side,
      'ritual'
    );
    if (!summonPosition) return false;
    const destination = await this.chooseSummonDestination(
      option.monster,
      side,
      this.getMainMonsterZoneDestinations(side, materialSelection),
      'ritual'
    );
    if (!destination) return false;
    const ritualIndex = state.hand.indexOf(option.monster);
    const liveMaterials = materialSelection.map(material => {
      if (material.source === 'hand' && state.hand.includes(material.card)) {
        return { card: material.card, source: 'hand' };
      }
      const entry = this.getMonsterEntries(side)
        .find(candidate => candidate.card === material.card);
      return entry ? { ...entry, source: 'field' } : null;
    });
    const materialsStillAvailable = liveMaterials.every(Boolean);
    const currentPlan = materialsStillAvailable
      ? this.summons.createRitualSummonPlan(
        option.monster,
        ritualSpell,
        liveMaterials.map(material => material.card),
        { controllerId: side }
      )
      : { valid: false };
    const currentDestinationKeys = this.getMainMonsterZoneDestinations(
      side,
      liveMaterials.filter(Boolean)
    ).map(candidate => this.getSummonDestinationKey(candidate));
    if (
      !currentDestinationKeys.includes(this.getSummonDestinationKey(destination))
      || ritualIndex === -1
      || !materialsStillAvailable
      || !currentPlan.valid
      || this.winner
      || this._duelEnded
      || this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', option.monster)
    ) {
      this.log("L'Invocation Rituelle est interdite ou ses ressources ne sont plus disponibles.", 'danger');
      return false;
    }

    // Transaction commit: every fallible legality/source check is complete.
    for (const material of liveMaterials) {
      if (material.source === 'hand') {
        const handIndex = state.hand.indexOf(material.card);
        if (handIndex >= 0) state.hand.splice(handIndex, 1);
      } else {
        this.removeMonsterEntry(side, material);
      }
      this.field.sendToGraveyard(material.card, material.card.ownerId);
    }

    const committedRitualIndex = state.hand.indexOf(option.monster);
    state.hand.splice(committedRitualIndex, 1);
    const summoned = this.specialSummonCard(option.monster, side, destination.zoneIndex, {
      position: summonPosition,
      summonType: 'ritual',
      properlySummoned: true
    });
    if (summoned === false) {
      // Defensive fallback: the preflight above normally makes this unreachable.
      state.hand.splice(
        Math.min(committedRitualIndex, state.hand.length),
        0,
        option.monster
      );
      return false;
    }
    this.log(
      `Invocation Rituelle de **${option.monster.name}** : ${currentPlan.totalLevels} Niveaux ont été Sacrifiés.`,
      side
    );
    return true;
  }

  getPendulumScales(side) {
    const state = this.getSideState(side);
    const left = state.spells[0];
    const right = state.spells[4];
    if (
      !left?.isPendulumMonster
      || !right?.isPendulumMonster
      || left.isSetFaceDown
      || right.isSetFaceDown
      || left.location !== 'pendulum_zone'
      || right.location !== 'pendulum_zone'
    ) {
      return null;
    }
    const hasMatchingOtherScale = (card, other) => {
      const otherName = `${other.name || ''} ${other.name_en || ''}`;
      return other.pendulumArchetypes?.includes('Magician')
        || /Magicien|Magician|Yeux Impairs|Odd-Eyes/i.test(otherName);
    };
    const effectiveScale = (card, other) => (
      ['94415058', '20409757'].includes(String(card.id))
      && !hasMatchingOtherScale(card, other)
        ? 4
        : card.pendulumScale
    );
    return {
      left,
      right,
      leftScale: effectiveScale(left, right),
      rightScale: effectiveScale(right, left)
    };
  }

  isPendulumBattleActivationForbidden(activatingSide, activation, context = {}) {
    const activationType = typeof activation === 'string'
      ? activation.toLowerCase()
      : String(activation?.card_type || '').toLowerCase();
    const requiredScaleId = activationType === 'trap'
      ? '20409757'
      : (activationType === 'spell' ? '94415058' : null);
    if (!requiredScaleId) return false;

    const protectedSide = this.getOpponentSide(activatingSide);
    const attackingSide = context.attackingSide || context.attacker?.controllerId || null;
    const defendingSide = context.defendingSide
      || (attackingSide ? this.getOpponentSide(attackingSide) : context.defender?.controllerId)
      || null;
    const protectedPendulumIsBattling = (
      context.attacker?.isPendulumMonster && attackingSide === protectedSide
    ) || (
      context.defender?.isPendulumMonster && defendingSide === protectedSide
    );
    if (!protectedPendulumIsBattling) return false;

    const scales = this.getSideState(protectedSide).spells;
    return [scales[0], scales[4]].some(card => (
      card
      && String(card.id) === requiredScaleId
      && card.location === 'pendulum_zone'
      && !card.isSetFaceDown
      && !card.effectNegated
    ));
  }

  tryProtectPendulumCardWithTimegazer(card, sourceSide) {
    const side = card?.controllerId;
    if (
      !card
      || card.location !== 'pendulum_zone'
      || !['player', 'opponent'].includes(side)
      || !sourceSide
      || sourceSide === side
      || this.field.getSpellZone(side, card.zoneIndex) !== card
    ) {
      return false;
    }

    const timegazer = this.getMonsterEntries(side, { faceUpOnly: true })
      .map(entry => entry.card)
      .find(monster => (
        String(monster.id) === '20409757'
        && !monster.effectNegated
        && monster.effectUsage.timegazerPendulumProtectionTurn !== this.turnCount
      ));
    if (!timegazer) return false;

    timegazer.effectUsage.timegazerPendulumProtectionTurn = this.turnCount;
    this.log(
      `**${timegazer.name}** empêche la destruction de **${card.name}** dans votre Zone Pendule.`,
      side
    );
    this.callbacks.onAnimation({
      type: 'effect-protect',
      target: side,
      card,
      sourceCard: timegazer,
      zoneType: 'spell',
      zoneIndex: card.zoneIndex
    });
    return true;
  }

  /**
   * Shared trigger hook for effects that return cards to the hand. The current
   * card pool has no bounce effect, but future effects can call this method
   * with the complete simultaneous return group.
   */
  async resolveStargazerReturnedCardTrigger(side, returnedCards, {
    sourceSide = null,
    duringDamageStep = false
  } = {}) {
    const cards = Array.isArray(returnedCards) ? returnedCards.filter(Boolean) : [];
    if (
      cards.length !== 1
      || duringDamageStep
      || !sourceSide
      || sourceSide === side
      || !cards[0].isPendulumMonster
    ) {
      return false;
    }

    const returnedCard = cards[0];
    const state = this.getSideState(side);
    const stargazerEntry = this.getMonsterEntries(side, { faceUpOnly: true })
      .find(entry => (
        String(entry.card.id) === '94415058'
        && entry.card !== returnedCard
        && !entry.card.effectNegated
        && entry.card.effectUsage.stargazerReturnTurn !== this.turnCount
      ));
    const candidates = state.hand.filter(card => (
      card !== returnedCard
      && card.card_type === 'monster'
      && String(card.id) === String(returnedCard.id)
    ));
    if (!stargazerEntry || !candidates.length || !state.monsters.includes(null)) {
      return false;
    }

    const activate = await this.requestDecision({
      type: 'activate-monster-effect',
      effect: 'stargazer-returned-pendulum',
      side,
      card: {
        uid: stargazerEntry.card.uid,
        id: stargazerEntry.card.id,
        name: stargazerEntry.card.name
      },
      returnedCard: {
        uid: returnedCard.uid,
        id: returnedCard.id,
        name: returnedCard.name
      },
      optional: true
    }, true);
    if (!activate) return false;
    stargazerEntry.card.effectUsage.stargazerReturnTurn = this.turnCount;

    const target = await this.chooseCard(
      'select-stargazer-summon',
      side,
      candidates
    );
    if (!target) return false;
    const position = await this.chooseSummonPosition(target, side, 'stargazer');
    if (!position) return false;
    const destination = await this.chooseSummonDestination(
      target,
      side,
      this.getMainMonsterZoneDestinations(side),
      'stargazer'
    );
    const currentStargazer = this.getMonsterEntry(side, stargazerEntry);
    const handIndex = state.hand.indexOf(target);
    if (
      currentStargazer?.card !== stargazerEntry.card
      || handIndex === -1
      || !destination
      || state.monsters[destination.zoneIndex] !== null
      || this.winner
      || this._duelEnded
      || this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', target)
    ) {
      return false;
    }

    state.hand.splice(handIndex, 1);
    const summoned = this.specialSummonCard(target, side, destination.zoneIndex, {
      position,
      summonType: 'stargazer'
    });
    if (summoned === false) {
      state.hand.splice(Math.min(handIndex, state.hand.length), 0, target);
      return false;
    }
    this.log(`**${stargazerEntry.card.name}** Invoque Spécialement **${target.name}** depuis la main.`, side);
    return true;
  }

  getLinkedMainMonsterZoneIndices(side) {
    const linked = new Set();
    this.field.getControlledExtraMonsters(side).forEach(({ card, zoneIndex }) => {
      if (!card.linkArrows?.length) return;
      if (card.linkArrows.includes('bottom-left')) {
        linked.add(zoneIndex === 0 ? 0 : 2);
      }
      if (card.linkArrows.includes('bottom-right')) {
        linked.add(zoneIndex === 0 ? 2 : 4);
      }
    });
    return [...linked].filter(index => this.getSideState(side).monsters[index] === null);
  }

  getPendulumExtraDestinations(side) {
    return [
      ...this.field.getAvailableExtraMonsterZones(side)
        .slice(0, 1)
        .map(zoneIndex => ({ zoneType: 'extra', zoneIndex })),
      ...this.getLinkedMainMonsterZoneIndices(side)
        .map(zoneIndex => ({ zoneType: 'main', zoneIndex }))
    ];
  }

  getPendulumOptions(side) {
    const scales = this.getPendulumScales(side);
    if (!scales || !this.summons.canPendulumSummon()) {
      return { valid: false, fromHand: [], fromExtraDeck: [], scales };
    }
    const state = this.getSideState(side);
    return {
      ...this.summons.getPendulumEligibleMonsters(
        scales.leftScale,
        scales.rightScale,
        {
          hand: state.hand,
          faceUpExtraDeck: state.faceUpExtraDeck,
          controllerId: side
        }
      ),
      scales
    };
  }

  async activatePendulumScale(handCardUid, zoneIndex, side = 'player') {
    const generation = this._duelGeneration;
    if (
      this.currentTurn !== side
      || !this.currentPhase.startsWith('main')
      || this.isResolvingAction
      || ![0, 4].includes(zoneIndex)
    ) return false;
    const state = this.getSideState(side);
    const cardIndex = state.hand.findIndex(card => card.uid === handCardUid);
    const card = state.hand[cardIndex];
    if (!card?.isPendulumMonster || state.spells[zoneIndex] !== null) return false;
    if (
      card.pendulumActivationRequiresEmptyMonsterField
      && this.getMonsterEntries(side).length > 0
    ) {
      this.log(`Vous devez ne contrôler aucun monstre pour activer **${card.name}** en Zone Pendule.`, 'danger');
      return false;
    }

    state.hand.splice(cardIndex, 1);
    card.isSetFaceDown = false;
    card.isPendulumScale = false;
    card.isPendingPendulumActivation = true;
    this.field.setSpellZone(side, zoneIndex, card);
    this.log(`Vous activez **${card.name}** comme Carte Magie dans la Zone Pendule.`, side);
    this.callbacks.onAnimation({
      type: 'activate',
      target: side,
      card,
      zoneIndex,
      pendulumScale: card.pendulumScale
    });
    this.isResolvingAction = true;
    const link = this.chain.pushChainLink(side, card, [], {
      zoneIndex,
      context: {
        event: 'card-activation',
        activationType: 'pendulum-scale'
      },
      resolver: async () => {
        if (
          this.field.getSpellZone(side, zoneIndex) !== card
          || card.location !== 'spell_zone'
        ) return false;
        card.isPendingPendulumActivation = false;
        card.isPendulumScale = true;
        card.location = 'pendulum_zone';
        this.log(
          `**${card.name}** devient une Échelle Pendule active (${card.pendulumScale}).`,
          side
        );
        return true;
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });
    await this.openChainResponseWindow(this.getOpponentSide(side), {
      event: 'card-activation',
      sourceCard: card
    });
    if (!this.isDuelGenerationCurrent(generation)) return false;
    await this.resolveChainStack();
    if (!this.isDuelGenerationCurrent(generation)) return false;
    return (
      this.field.getSpellZone(side, zoneIndex) === card
      && card.location === 'pendulum_zone'
      && card.isPendulumScale === true
    );
  }

  async performPendulumSummon(side = 'player', requestedUids = null) {
    if (
      this.currentTurn !== side
      || !this.currentPhase.startsWith('main')
      || this.isResolvingAction
    ) return false;
    const options = this.getPendulumOptions(side);
    const allEligible = [...options.fromHand, ...options.fromExtraDeck];
    if (!options.valid || allEligible.length === 0) return false;
    const state = this.getSideState(side);
    const initialEmptyMainZones = state.monsters
      .map((card, index) => (card === null ? index : -1))
      .filter(index => index >= 0);
    const initialExtraDestinations = this.getPendulumExtraDestinations(side);

    let selectedUids = Array.isArray(requestedUids)
      ? requestedUids.map(String)
      : [];
    if (selectedUids.length === 0 && side === 'player') {
      const decision = await this.requestDecision({
        type: 'select-pendulum-monsters',
        side,
        title: 'INVOCATION PENDULE',
        description: 'Choisissez un ou plusieurs monstres à Invoquer.',
        multiple: true,
        minimum: 1,
        maximum: initialEmptyMainZones.length + initialExtraDestinations.length,
        candidates: allEligible.map(card => ({
          uid: card.uid,
          id: card.id,
          name: card.name,
          level: card.getLevel(),
          location: card.location,
          source: card.isFaceUpInExtraDeck ? 'extra' : 'hand'
        }))
      }, null);
      if (decision === null || decision === undefined) {
        this.log("Invocation Pendule annulée.", side);
        return false;
      }
      if (Array.isArray(decision)) selectedUids = decision.map(String);
      else {
        const singleUid = this.decisionUid(decision);
        if (singleUid) selectedUids = [singleUid];
      }
    }
    if (selectedUids.length === 0 && side !== 'player') {
      selectedUids = [
        ...options.fromHand.slice(0, initialEmptyMainZones.length),
        ...options.fromExtraDeck.slice(0, initialExtraDestinations.length)
      ].map(card => card.uid);
    }
    if (selectedUids.length === 0) return false;

    const summonPositions = new Map();
    for (const uid of [...new Set(selectedUids)]) {
      const selectedCard = allEligible.find(card => String(card.uid) === String(uid));
      if (!selectedCard) continue;
      const summonPosition = await this.chooseSummonPosition(
        selectedCard,
        side,
        'pendulum'
      );
      if (!summonPosition) return false;
      summonPositions.set(String(uid), summonPosition);
    }

    // A player decision may have taken arbitrarily long. Refresh scales,
    // positions, eligibility, capacities, and sources instead of trusting the
    // prompt.
    const currentOptions = this.getPendulumOptions(side);
    const currentEligible = [
      ...currentOptions.fromHand,
      ...currentOptions.fromExtraDeck
    ];
    const uniqueSelectedUids = [...new Set(selectedUids)];
    const selected = uniqueSelectedUids
      .map(uid => currentEligible.find(card => String(card.uid) === uid))
      .filter(Boolean);
    if (
      !currentOptions.valid
      || uniqueSelectedUids.length !== selectedUids.length
      || selected.length !== uniqueSelectedUids.length
    ) {
      this.log("Invocation Pendule annulée : la sélection ou les Échelles ont changé.", 'danger');
      return false;
    }
    const emptyMainZones = state.monsters
      .map((card, index) => (card === null ? index : -1))
      .filter(index => index >= 0);
    const extraDestinations = this.getPendulumExtraDestinations(side);
    const plan = this.summons.createPendulumSummonPlan(
      currentOptions.scales.leftScale,
      currentOptions.scales.rightScale,
      selected,
      {
        controllerId: side,
        availableMainMonsterZones: emptyMainZones.length,
        availableExtraDeckZones: extraDestinations.length
      }
    );
    const extraMonsterZoneCapacity = extraDestinations
      .filter(destination => destination.zoneType === 'extra').length;
    const requiredLinkedMainZones = Math.max(
      0,
      plan.valid ? plan.fromExtraDeck.length - extraMonsterZoneCapacity : 0
    );
    if (
      plan.valid
      && plan.fromHand.length + requiredLinkedMainZones > emptyMainZones.length
    ) {
      this.log("Pas assez de Zones Monstre distinctes pour cette Invocation Pendule.", 'danger');
      return false;
    }
    if (!plan.valid) {
      this.log(`Invocation Pendule invalide : ${plan.reason || 'déjà utilisée ce tour'}.`, 'danger');
      return false;
    }

    const reservedLinkedZones = new Set(
      extraDestinations
        .filter(destination => destination.zoneType === 'main')
        .slice(0, requiredLinkedMainZones)
        .map(destination => destination.zoneIndex)
    );
    const handDestinations = emptyMainZones.filter(index => !reservedLinkedZones.has(index));
    const deterministicAssignments = [
      ...plan.fromExtraDeck.map((monster, index) => ({
        cardUid: String(monster.uid),
        zoneType: extraDestinations[index]?.zoneType,
        zoneIndex: extraDestinations[index]?.zoneIndex
      })),
      ...plan.fromHand.map((monster, index) => ({
        cardUid: String(monster.uid),
        zoneType: 'main',
        zoneIndex: handDestinations[index]
      }))
    ];
    const assignmentDecision = await this.requestDecision({
      type: 'assign-pendulum-zones',
      side,
      title: 'PLACER LES MONSTRES PENDULE',
      description: 'Attribuez une Zone distincte à chaque monstre.',
      required: false,
      items: [
        ...plan.fromExtraDeck.map(monster => ({
          card: {
            uid: String(monster.uid),
            id: monster.id,
            name: monster.name,
            source: 'extra'
          },
          destinations: extraDestinations.map(destination => ({
            ...destination,
            label: this.formatSummonDestination(destination)
          }))
        })),
        ...plan.fromHand.map(monster => ({
          card: {
            uid: String(monster.uid),
            id: monster.id,
            name: monster.name,
            source: 'hand'
          },
          destinations: emptyMainZones.map(zoneIndex => ({
            zoneType: 'main',
            zoneIndex,
            label: this.formatSummonDestination({
              zoneType: 'main',
              zoneIndex
            })
          }))
        }))
      ]
    }, deterministicAssignments);
    if (!Array.isArray(assignmentDecision)) return false;
    const assignmentsByUid = new Map();
    const reservedDestinationKeys = new Set();
    for (const assignment of assignmentDecision) {
      const cardUid = this.decisionUid(assignment);
      const destination = assignment && {
        zoneType: assignment.zoneType,
        zoneIndex: Number(assignment.zoneIndex)
      };
      const destinationKey = this.getSummonDestinationKey(destination);
      if (
        !cardUid
        || !['main', 'extra'].includes(destination.zoneType)
        || !Number.isInteger(destination.zoneIndex)
        || assignmentsByUid.has(cardUid)
        || reservedDestinationKeys.has(destinationKey)
      ) return false;
      assignmentsByUid.set(cardUid, destination);
      reservedDestinationKeys.add(destinationKey);
    }
    const handAssignments = plan.fromHand.map(monster => ({
      monster,
      zoneIndex: assignmentsByUid.get(String(monster.uid))?.zoneIndex,
      zoneType: assignmentsByUid.get(String(monster.uid))?.zoneType,
      position: summonPositions.get(String(monster.uid)) || 'attack'
    }));
    const extraAssignments = plan.fromExtraDeck.map(monster => ({
      monster,
      destination: assignmentsByUid.get(String(monster.uid)),
      position: summonPositions.get(String(monster.uid)) || 'attack'
    }));
    const currentPendulumOptions = this.getPendulumOptions(side);
    const currentExtraDestinationKeys = this.getPendulumExtraDestinations(side)
      .map(destination => this.getSummonDestinationKey(destination));
    const sourcesAndDestinationsStillValid = (
      assignmentsByUid.size === plan.monsters.length
      && currentPendulumOptions.valid
      && handAssignments.every(({ monster, zoneIndex, zoneType }) => (
        state.hand.includes(monster)
        && currentPendulumOptions.fromHand.includes(monster)
        && zoneType === 'main'
        && zoneIndex !== undefined
        && state.monsters[zoneIndex] === null
      ))
      && extraAssignments.every(({ monster, destination }) => (
        state.faceUpExtraDeck.includes(monster)
        && currentPendulumOptions.fromExtraDeck.includes(monster)
        && destination
        && (
          destination.zoneType === 'extra'
            ? currentExtraDestinationKeys.includes(
              this.getSummonDestinationKey(destination)
            )
            : (
              currentExtraDestinationKeys.includes(
                this.getSummonDestinationKey(destination)
              )
              && state.monsters[destination.zoneIndex] === null
            )
        )
      ))
    );
    const specialSummonProhibited = plan.monsters.some(monster => (
      this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', monster)
    ));
    if (
      !sourcesAndDestinationsStillValid
      || specialSummonProhibited
      || this.winner
      || this._duelEnded
    ) {
      this.log("Invocation Pendule interdite ou ressources devenues indisponibles.", 'danger');
      return false;
    }
    if (!this.summons.consumePendulumSummon()) {
      this.log("Invocation Pendule invalide : déjà utilisée ce tour.", 'danger');
      return false;
    }

    // Transaction commit: no source is removed before the complete preflight.
    this.isResolvingAction = true;
    for (const { monster, zoneIndex, position } of handAssignments) {
      const handIndex = state.hand.indexOf(monster);
      const summoned = this.specialSummonCard(monster, side, zoneIndex, {
        position,
        summonType: 'pendulum',
        properlySummoned: true
      });
      if (summoned === false) {
        this.isResolvingAction = false;
        return false;
      }
      state.hand.splice(handIndex, 1);
    }
    for (const { monster, destination, position } of extraAssignments) {
      const extraIndex = state.faceUpExtraDeck.indexOf(monster);
      let summoned;
      if (destination.zoneType === 'extra') {
        summoned = this.specialSummonToExtraMonsterZone(monster, side, destination.zoneIndex, {
          position,
          summonType: 'pendulum',
          properlySummoned: true
        });
      } else {
        summoned = this.specialSummonCard(monster, side, destination.zoneIndex, {
          position,
          summonType: 'pendulum',
          properlySummoned: true
        });
      }
      if (summoned === false) {
        this.isResolvingAction = false;
        return false;
      }
      state.faceUpExtraDeck.splice(extraIndex, 1);
    }
    this.log(`Invocation Pendule de ${selected.length} monstre(s) entre les Échelles ${plan.scales.minimum} et ${plan.scales.maximum}.`, side);
    this.isResolvingAction = false;
    this.stateChanged();
    return true;
  }

  canActivateSpell(card, side) {
    if (!card || card.card_type !== 'spell') return false;
    const state = this.getSideState(side);
    const opponentState = this.getSideState(this.getOpponentSide(side));
    if (String(card.id) === '55144522') return state.deck.length >= 2 || this.rulesMode === 'sandbox';
    if (String(card.id) === '12580477') {
      return this.getMonsterEntries(this.getOpponentSide(side)).length > 0;
    }
    if (String(card.id) === '83764718') {
      return state.monsters.some(monster => monster === null)
        && [...this.playerGraveyard, ...this.opponentGraveyard].some(
          monster => this.canSpecialSummonFromGrave(monster)
        );
    }
    if (String(card.id) === '24094653') return this.getFusionOptions(side).length > 0;
    if (card.isRitualSpell || String(card.id) === '55761792') {
      return this.getRitualOptions(side, card).some(option => (
        this.getProjectedSpecialSummonDestination(side, option.materials)?.zoneType === 'main'
      ));
    }
    return this.rulesMode === 'sandbox';
  }

  async prepareSpellActivationContext(card, side) {
    if (String(card?.id) !== '83764718') return {};
    const candidates = [
      ...this.playerGraveyard,
      ...this.opponentGraveyard
    ].filter(monster => this.canSpecialSummonFromGrave(monster));
    const target = await this.chooseCard(
      'select-monster-reborn-target',
      side,
      candidates,
      cards => [...cards].sort((a, b) => b.getAtk() - a.getAtk())[0]
    );
    if (!target) return null;
    return {
      targetCard: target,
      targetUid: target.uid,
      targetRuntimeInstanceId: target.runtimeInstanceId,
      targetOwnerId: target.ownerId
    };
  }

  async playSpellTrap(handCardUid, zoneIndex) {
    const generation = this._duelGeneration;
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return false;

    const cardIndex = this.playerHand.findIndex(c => c.uid === handCardUid);
    if (cardIndex === -1) return false;

    const card = this.playerHand[cardIndex];
    if (card.card_type === 'monster') return false;
    if (this.field.getSpellZone('player', zoneIndex) !== null) return false;

    // Trap Pose
    if (card.card_type === 'trap') {
      this.playerHand.splice(cardIndex, 1);
      card.isSetFaceDown = true;
      card.turnSet = this.turnCount;
      this.field.setSpellZone('player', zoneIndex, card);

      this.log(`Vous posez une Carte Piège face cachée.`, 'player');
      this.callbacks.onAnimation({ type: 'activate', target: 'player', card, zoneIndex, faceDown: true });
      this.stateChanged();
      return true;
    }

    if (!this.canActivateSpell(card, 'player')) {
      this.log(`Les conditions d'activation de **${card.name}** ne sont pas remplies.`, 'danger');
      return false;
    }
    const activationContext = await this.prepareSpellActivationContext(card, 'player');
    if (!this.isDuelGenerationCurrent(generation)) return false;
    if (activationContext === null) return false;

    // Spell activation triggering Chain
    this.playerHand.splice(cardIndex, 1);
    this.field.setSpellZone('player', zoneIndex, card);

    this.log(`Vous activez la Carte Magie **${card.name}** !`, 'player');
    this.callbacks.onAnimation({ type: 'activate', target: 'player', card, zoneIndex });

    this.isResolvingAction = true;

    // Add to stack using ChainEngine
    const link = this.chain.pushChainLink('player', card, [], {
      zoneIndex,
      context: {
        event: 'card-activation',
        wouldDestroy: String(card.id) === '12580477',
        ...activationContext
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });

    await this.openChainResponseWindow('opponent', {
      event: 'card-activation',
      sourceCard: card,
      wouldDestroy: String(card.id) === '12580477'
    });
    if (!this.isDuelGenerationCurrent(generation)) return false;
    if (!(await this.delay(1200))) return false;

    // Resolve LIFO chain stack
    await this.resolveChainStack();
    return this.isDuelGenerationCurrent(generation);
  }

  async setSpellTrapFaceDown(handCardUid, zoneIndex) {
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return false;

    const cardIndex = this.playerHand.findIndex(c => c.uid === handCardUid);
    if (cardIndex === -1) return false;

    const card = this.playerHand[cardIndex];
    if (card.card_type === 'monster') return false;
    if (this.field.getSpellZone('player', zoneIndex) !== null) return false;

    this.playerHand.splice(cardIndex, 1);
    card.isSetFaceDown = true;
    card.turnSet = this.turnCount;
    this.field.setSpellZone('player', zoneIndex, card);

    this.log(`Vous posez une carte Magie/Piège face cachée.`, 'player');
    this.callbacks.onAnimation({ type: 'activate', target: 'player', card, zoneIndex, faceDown: true });
    this.stateChanged();
    return true;
  }

  async activateSetSpellTrap(zoneIndex) {
    const generation = this._duelGeneration;
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return false;

    const card = this.field.getSpellZone('player', zoneIndex);
    if (!card || !card.isSetFaceDown) return false;

    if (card.card_type === 'trap') {
      this.log("Cette Carte Piège s'active automatiquement uniquement lorsque sa condition est remplie.", "system");
      return false;
    }

    if (!this.canActivateSpell(card, 'player')) {
      this.log(`Les conditions d'activation de **${card.name}** ne sont pas remplies.`, 'danger');
      return false;
    }

    // TCG restriction: Trap and Quick-Play Spells cannot be activated the turn they are set
    if (card.card_type === 'trap' || (card.type && card.type.includes('Quick-Play'))) {
      if (card.turnSet === this.turnCount) {
        this.log("Règle TCG : Les cartes Piège et Magie Jeu Rapide ne peuvent pas être activées le tour où elles ont été posées !", "danger");
        return false;
      }
    }
    const activationContext = await this.prepareSpellActivationContext(card, 'player');
    if (!this.isDuelGenerationCurrent(generation)) return false;
    if (activationContext === null) return false;

    card.isSetFaceDown = false;
    this.log(`Vous activez la Carte face cachée **${card.name}** !`, 'player');
    this.callbacks.onAnimation({ type: 'activate', target: 'player', card, zoneIndex });

    this.isResolvingAction = true;

    // Add to stack using ChainEngine
    const link = this.chain.pushChainLink('player', card, [], {
      zoneIndex,
      context: {
        event: 'card-activation',
        wouldDestroy: String(card.id) === '12580477',
        ...activationContext
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });

    await this.openChainResponseWindow('opponent', {
      event: 'card-activation',
      sourceCard: card,
      wouldDestroy: String(card.id) === '12580477'
    });
    if (!this.isDuelGenerationCurrent(generation)) return false;
    if (!(await this.delay(1200))) return false;

    // Resolve LIFO chain stack
    await this.resolveChainStack();
    return this.isDuelGenerationCurrent(generation);
  }

  getLegalChainCandidates(side, context = {}) {
    const state = this.getSideState(side);
    const lastSpeed = this.chain.getLastLinkSpeed();
    const candidates = [];
    const timingEvent = context.timingEvent || context.event;

    state.spells.forEach((card, zoneIndex) => {
      if (!card || !card.isSetFaceDown || card.turnSet >= this.turnCount) return;
      if (card.card_type === 'trap') {
        const summonedCard = context.summonedCard;
        const summonedStillPresent = Boolean(
          summonedCard
          && context.summoningSide
          && this.getMonsterEntries(context.summoningSide)
            .some(entry => entry.card === summonedCard)
        );
        const isTrapHoleAtSummonTiming = (
          timingEvent === 'SUMMON_SUCCESS'
          && String(card.id) === '04206964'
          && side === this.getOpponentSide(context.summoningSide)
          && summonedStillPresent
          && !summonedCard.isSetFaceDown
          && summonedCard.getAtk() >= 1000
        );
        const isMirrorForceAtAttackTiming = (
          timingEvent === 'ATTACK_DECLARED'
          && String(card.id) === '44095762'
          && side === context.defendingSide
          && context.attackingSide === this.getOpponentSide(side)
          && this.getMonsterEntries(context.attackingSide)
            .some(entry => entry.card.position === 'attack')
          && !this.isPendulumBattleActivationForbidden(side, card, context)
        );
        if (
          (isTrapHoleAtSummonTiming || isMirrorForceAtAttackTiming)
          && this.chain.canChain(card, lastSpeed)
        ) {
          candidates.push({
            card,
            zoneIndex,
            source: 'timing-trap',
            trigger: isTrapHoleAtSummonTiming ? 'trap-hole' : 'mirror-force'
          });
        }
        return;
      }
      if (!card.type?.includes('Quick-Play')) return;
      if (this.isPendulumBattleActivationForbidden(side, card, context)) return;
      if (!this.chain.canChain(card, lastSpeed)) return;
      candidates.push({ card, zoneIndex, source: 'field' });
    });

    if (context.wouldDestroy) {
      this.getMonsterEntries(side).forEach(({ card, zoneIndex, zoneType }) => {
        if (
          card
          && String(card.id) === '44508094'
          && !card.isSetFaceDown
          && !card.effectNegated
          && this.chain.canChain(card, lastSpeed)
        ) {
          candidates.push({ card, zoneIndex, zoneType, source: 'monster' });
        }
      });
    }
    return candidates;
  }

  async openChainResponseWindow(startingSide, context = {}) {
    if (!this.chain.chainStack.length) return false;
    const generation = this._duelGeneration;
    const rootContext = {
      ...context,
      timingEvent: context.timingEvent || context.event
    };
    this.chain.openResponseWindow(startingSide);
    let side = startingSide;

    while (this.chain.chainStatus === 'building') {
      const currentLink = this.chain.getLastLink();
      const currentContext = {
        ...rootContext,
        ...(currentLink?.context || {}),
        sourceCard: currentLink?.sourceCard || rootContext.sourceCard,
        timingEvent: rootContext.timingEvent
      };
      const candidates = this.getLegalChainCandidates(side, currentContext);
      let decision = null;
      try {
        decision = await this.callbacks.onChainOpportunity({
          side,
          context: currentContext,
          lastLink: this.chain.getLastLink(),
          candidates: candidates.map(candidate => ({
            cardUid: candidate.card.uid,
            id: candidate.card.id,
            name: candidate.card.name,
            zoneIndex: candidate.zoneIndex,
            zoneType: candidate.zoneType || 'main',
            source: candidate.source
          }))
        });
      } catch (error) {
        if (!this.isDuelGenerationCurrent(generation)) return false;
        this.log(`Fenêtre de chaîne ignorée : ${error.message}`, 'system');
      }
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) {
        return false;
      }

      const requestedUid = this.decisionUid(decision);
      const selected = candidates.find(candidate => String(candidate.card.uid) === requestedUid);
      if (!selected) {
        const closed = this.chain.passPriority(side);
        if (closed) break;
        side = this.getOpponentSide(side);
        continue;
      }

      if (selected.source === 'monster' && String(selected.card.id) === '44508094') {
        await this.addStardustResponse(
          selected.card,
          side,
          { zoneType: selected.zoneType || 'main', zoneIndex: selected.zoneIndex },
          this.chain.getLastLink()
        );
        if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) {
          return false;
        }
      } else if (selected.source === 'timing-trap') {
        if (selected.trigger === 'trap-hole') {
          this.pushTrapHoleChainLink(
            currentContext.summoningSide,
            selected.card,
            selected.zoneIndex,
            currentContext.summonedCard
          );
        } else if (selected.trigger === 'mirror-force') {
          this.pushMirrorForceChainLink(
            side,
            selected.card,
            selected.zoneIndex,
            {
              attackingSide: currentContext.attackingSide,
              defendingSide: currentContext.defendingSide,
              attacker: currentContext.attacker,
              defender: currentContext.defender
            }
          );
        }
      } else {
        selected.card.isSetFaceDown = false;
        const link = this.chain.pushChainLink(side, selected.card, [], {
          zoneIndex: selected.zoneIndex,
          context: { event: 'chain-response' }
        });
        this.callbacks.onAnimation({
          type: 'chain-pop',
          linkNumber: link.id,
          card: selected.card
        });
      }
      side = this.getOpponentSide(side);
    }
    this.chain.closeResponseWindow();
    return true;
  }

  async addStardustResponse(stardust, side, zoneReference, targetLink) {
    const entry = this.getMonsterEntry(side, zoneReference);
    if (
      !stardust
      || !targetLink
      || !entry
      || entry.card !== stardust
      || !['monster_zone', 'extra_monster_zone'].includes(stardust.location)
    ) return false;

    // Tributing Stardust is the activation cost, before priority passes again.
    this.removeMonsterEntry(side, entry);
    this.field.sendToGraveyard(stardust, stardust.ownerId);
    const graveRuntimeInstanceId = stardust.runtimeInstanceId;
    this.emitMonsterAnimation('destroy', side, entry);

    const link = this.chain.pushChainLink(side, stardust, [targetLink.sourceCard], {
      context: {
        event: 'stardust-negation',
        targetLinkId: targetLink.id,
        targetLinkKey: targetLink.key,
        wouldDestroy: true
      },
      resolver: async () => {
        targetLink.activationNegated = true;
        this.defense.negateChainLink(targetLink);
        this.removeCardFromCurrentZone(targetLink.sourceCard, {
          byCardEffect: true,
          sourceSide: side
        });
        const graveyard = stardust.ownerId === 'player'
          ? this.playerGraveyard
          : this.opponentGraveyard;
        if (
          graveyard.includes(stardust)
          && stardust.runtimeInstanceId === graveRuntimeInstanceId
        ) {
          stardust.stardustReturnEligibleTurn = this.turnCount;
          // A Tributed monster is sent to its owner's Graveyard. Its delayed
          // Graveyard effect is therefore activated by that owner and Special
          // Summons it to that owner's field, even if control had changed.
          stardust.stardustReturnController = stardust.ownerId || side;
          stardust.stardustReturnRuntimeInstanceId = graveRuntimeInstanceId;
        }
        this.log(`**${stardust.name}** annule l'activation de **${targetLink.sourceCard.name}** et la détruit.`, side);
        return true;
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card: stardust });
    return true;
  }

  removeCardFromCurrentZone(card, {
    byCardEffect = false,
    sourceSide = null
  } = {}) {
    if (!card) return false;
    const side = card.controllerId;
    if (
      byCardEffect
      && this.tryProtectPendulumCardWithTimegazer(card, sourceSide)
    ) {
      return false;
    }
    let removed = false;
    if (card.location === 'monster_zone') {
      const current = this.field.getMonsterZone(side, card.zoneIndex);
      if (current === card) {
        this.field.setMonsterZone(side, card.zoneIndex, null);
        removed = true;
      }
    } else if (card.location === 'extra_monster_zone') {
      const current = this.field.getExtraMonsterZone(card.zoneIndex);
      if (current?.card === card && current.controllerId === side) {
        this.field.setExtraMonsterZone(card.zoneIndex, side, null);
        removed = true;
      }
    } else if (card.location === 'spell_zone' || card.location === 'pendulum_zone') {
      const current = this.field.getSpellZone(side, card.zoneIndex);
      if (current === card) {
        this.field.setSpellZone(side, card.zoneIndex, null);
        removed = true;
      }
    } else if (card.location === 'field_zone') {
      const current = side === 'player'
        ? this.field.playerFieldSpellZone
        : this.field.opponentFieldSpellZone;
      if (current === card) {
        this.field.placeFieldSpell(side, null);
        removed = true;
      }
    }
    if (!removed) return false;
    this.field.sendToGraveyard(card, card.ownerId);
    return true;
  }

  async resolveChainStack() {
    const generation = this._duelGeneration;
    this.log(`Résolution de la chaîne (LIFO)...`, 'system');

    this.chain.chainStatus = 'resolving';
    let completed = true;
    try {
      while (this.chain.chainStack.length > 0) {
        const link = this.chain.chainStack.pop();
        this.log(`Chain Link ${link.id} : Effet de **${link.sourceCard.name}** se résout !`, 'system');

        this.callbacks.onAnimation({ type: 'chain-resolve', linkNumber: link.id, card: link.sourceCard });

        if (link.activationNegated || this.defense.isChainLinkNegated(link)) {
          link.activationNegated = true;
          this.log(`Chain Link ${link.id} : activation annulée.`, 'system');
          if (link.sourceCard.location === 'spell_zone') {
            this.removeCardFromCurrentZone(link.sourceCard);
          }
        } else if (link.effectNegated || link.sourceCard.effectNegated) {
          link.effectNegated = true;
          this.log(`Chain Link ${link.id} : effet annulé.`, 'system');
          if (link.sourceCard.location === 'spell_zone') {
            this.removeCardFromCurrentZone(link.sourceCard);
          }
        } else if (link.resolver) {
          link.resolvedSuccessfully = Boolean(await link.resolver(link, this));
          if (!this.isDuelGenerationCurrent(generation)) {
            completed = false;
            break;
          }
          link.appliedAnything = link.resolvedSuccessfully;
        } else {
          await this.executeSpellTrapResolution(
            link.sourceCard,
            link.activatingPlayerId,
            link.zoneIndex,
            link.context
          );
          if (!this.isDuelGenerationCurrent(generation)) {
            completed = false;
            break;
          }
          link.resolvedSuccessfully = true;
          link.appliedAnything = true;
        }
        if (!(await this.delay(1000))) {
          completed = false;
          break;
        }
      }
    } finally {
      if (this.isDuelGenerationCurrent(generation)) {
        this.defense.clearChainNegations();
        this.chain.reset({ preserveSequence: true });
        this.isResolvingAction = false;
        this.stateChanged();
      }
    }
    return completed;
  }

  async executeSpellTrapResolution(card, user, zoneIndex, activationContext = {}) {
    const isPlayer = user === 'player';
    const myMonsters = isPlayer ? this.playerMonsters : this.opponentMonsters;
    // Legacy callers may invoke resolution directly in tests/adapters. The
    // normal activation path always supplies the pre-locked target above.
    if (String(card?.id) === '83764718' && !activationContext.targetCard) {
      activationContext = await this.prepareSpellActivationContext(card, user) || {};
    }

    // Parse text using PSCTParser
    const psct = PSCTParser.parse(card.desc);
    if (psct.conjunctions.length > 0) {
      this.log(`[PSCT Log] Conjonction détectée : ${psct.conjunctions[0].type}`, 'system');
    }

    if (card.id === '55144522') {
      this.log(`${isPlayer ? 'Vous activez' : "L'adversaire active"} Pot de Cupidité : Piochez 2 cartes !`, 'system');
      this.drawCard(user);
      if (!(await this.delay(400))) return false;
      if (!this.winner) this.drawCard(user);
    }
    else if (card.id === '12580477') {
      this.log(`${isPlayer ? 'Vous activez' : "L'adversaire active"} Raigeki : Destruction des monstres adverses !`, 'system');
      this.callbacks.onAnimation({ type: 'raigeki-cinematic', target: isPlayer ? 'opponent' : 'player' });
      if (!(await this.delay(1000))) return false;

      const opponentSide = isPlayer ? 'opponent' : 'player';
      for (const entry of this.getMonsterEntries(opponentSide)) {
        if (!this.removeMonsterEntry(opponentSide, entry)) continue;
        this.field.sendToGraveyard(entry.card, entry.card.ownerId);
        this.emitMonsterAnimation('destroy', opponentSide, entry);
      }
    }
    else if (card.id === '83764718') {
      const lockedTarget = activationContext.targetCard;
      const lockedOwner = activationContext.targetOwnerId;
      const lockedGraveyard = lockedOwner === 'player'
        ? this.playerGraveyard
        : this.opponentGraveyard;
      const targetStillExact = Boolean(
        lockedTarget
        && lockedGraveyard.includes(lockedTarget)
        && lockedTarget.uid === activationContext.targetUid
        && lockedTarget.runtimeInstanceId === activationContext.targetRuntimeInstanceId
        && this.canSpecialSummonFromGrave(lockedTarget)
      );
      const monstersInGrave = targetStillExact
        ? [{ card: lockedTarget, owner: lockedOwner }]
        : [];

      if (monstersInGrave.length === 0) {
        this.log("Aucun monstre dans les cimetières.", "system");
      } else {
        const choice = monstersInGrave[0];
        const summonPosition = await this.chooseSummonPosition(
          choice.card,
          user,
          'monster-reborn'
        );
        if (!summonPosition) return false;
        const destination = await this.chooseSummonDestination(
          choice.card,
          user,
          this.getMainMonsterZoneDestinations(user),
          'monster-reborn'
        );

        if (destination) {
          this.callbacks.onAnimation({
            type: 'reborn-cinematic',
            target: user,
            zoneIndex: destination.zoneIndex,
            card: choice.card
          });

          if (!(await this.delay(1200))) return false;

          // Re-check every mutable condition after the animation/response
          // window. The target stays in its original Graveyard until the
          // Special Summon is guaranteed, so a failed resolution cannot make
          // the card disappear.
          const sourceGraveyard = choice.owner === 'player'
            ? this.playerGraveyard
            : this.opponentGraveyard;
          const sourceIndex = sourceGraveyard.indexOf(choice.card);
          const destinationZone = myMonsters[destination.zoneIndex] === null
            ? destination.zoneIndex
            : -1;
          const summonProhibited = (
            this.winner
            || this._duelEnded
            || choice.card.uid !== activationContext.targetUid
            || choice.card.runtimeInstanceId !== activationContext.targetRuntimeInstanceId
            || !this.canSpecialSummonFromGrave(choice.card)
            || this.defense.isActionProhibited(user, 'SPECIAL_SUMMON', choice.card)
          );
          if (sourceIndex === -1 || destinationZone === -1 || summonProhibited) {
            this.log("La cible de Monster Reborn ou sa Zone n'est plus disponible.", "danger");
          } else {
            sourceGraveyard.splice(sourceIndex, 1);
            const summoned = this.specialSummonCard(choice.card, user, destinationZone, {
              position: summonPosition,
              summonType: 'monster-reborn'
            });
            if (summoned === false) {
              sourceGraveyard.splice(sourceIndex, 0, choice.card);
              choice.card.location = 'graveyard';
              choice.card.zoneIndex = -1;
              choice.card.controllerId = choice.card.ownerId;
              this.log("Monster Reborn ne peut pas terminer l'Invocation ; la cible reste au CimetiÃ¨re.", "danger");
            } else {
              this.log(`Monster Reborn ressuscite **${choice.card.name}** !`, 'system');
            }
          }
        } else {
          this.log("Aucune Zone Monstre libre pour résoudre Monster Reborn.", "danger");
        }
      }
    } else if (String(card.id) === '24094653') {
      const requestedUid = this.pendingFusionTargets[user];
      this.pendingFusionTargets[user] = null;
      await this.performFusionSummon(user, requestedUid);
    } else if (card.isRitualSpell || String(card.id) === '55761792') {
      const summoned = await this.performRitualSummon(user, card);
      if (!summoned) {
        this.log("L'Invocation Rituelle ne peut plus être résolue légalement.", 'danger');
      }
    } else {
      this.log(`L'effet de **${card.name}** n'est pas encore scripté dans ce simulateur Sandbox.`, "system");
    }

    // Move Spell to Graveyard
    if (card) {
      this.field.setSpellZone(user, zoneIndex, null);
      this.field.sendToGraveyard(card, card.ownerId);
      this.callbacks.onAnimation({ type: 'clear-spell', target: user, zoneIndex });
      this.stateChanged();
    }
  }

  getAvailableActions(side = 'player') {
    const state = this.getSideState(side);
    const ownTurn = this.currentTurn === side;
    const inMain = this.currentPhase.startsWith('main');
    return {
      canNormalSummon: ownTurn && inMain && this.summons.canNormalSummon(),
      normalSummonCardUids: ownTurn && inMain ? state.hand
        .filter(card => this.summons.canUseNormalSummonProcedure(card))
        .map(card => card.uid) : [],
      activatableSpellUids: ownTurn && inMain ? state.hand
        .filter(card => this.canActivateSpell(card, side))
        .map(card => card.uid) : [],
      monsterEffects: ownTurn && inMain ? this.getMonsterEntries(side)
        .filter(({ card }) => (
          card
          && !card.isSetFaceDown
          && !card.effectNegated
          && (
            (String(card.id) === '71625222' && card.effectUsage.timeWizardTurn !== this.turnCount)
            || (
              String(card.id) === '31924889'
              && this.getControlledFieldCards(side)
                .some(candidate => (candidate.counters?.spell || 0) > 0)
            )
          )
        ))
        .map(({ card, zoneIndex, zoneType }) => ({
          zoneIndex,
          zoneType,
          cardUid: card.uid,
          effect: String(card.id) === '71625222' ? 'time-wizard' : 'arcanite-destroy'
        })) : [],
      fusionExtraUids: ownTurn && inMain
        ? this.getFusionOptions(side).map(option => option.card.uid)
        : [],
      synchroExtraUids: ownTurn && inMain ? state.extraDeck
        .filter(card => card.extra_type === 'synchro')
        .filter(card => this.canAutoSynchroSummon(card, side))
        .map(card => card.uid) : [],
      xyzExtraUids: ownTurn && inMain ? state.extraDeck
        .filter(card => card.extra_type === 'xyz')
        .filter(card => this.getXyzMaterialCombination(card, side))
        .map(card => card.uid) : [],
      linkExtraUids: ownTurn && inMain ? state.extraDeck
        .filter(card => card.extra_type === 'link')
        .filter(card => this.getLinkMaterialCombination(card, side))
        .map(card => card.uid) : [],
      canPendulumSummon: ownTurn
        && inMain
        && this.summons.canPendulumSummon()
        && (() => {
          const options = this.getPendulumOptions(side);
          return options.valid
            && (options.fromHand.length > 0 || options.fromExtraDeck.length > 0);
        })()
    };
  }

  async activateMonsterEffect(zoneReference, side = 'player') {
    const generation = this._duelGeneration;
    if (this.winner || this.isResolvingAction) return false;
    if (this.currentTurn !== side || !this.currentPhase.startsWith('main')) return false;
    const sourceEntry = this.getMonsterEntry(side, zoneReference);
    const card = sourceEntry?.card;
    if (!card || card.isSetFaceDown || card.effectNegated) return false;

    if (String(card.id) === '71625222') {
      if (card.effectUsage.timeWizardTurn === this.turnCount) return false;
      card.effectUsage.timeWizardTurn = this.turnCount;
      this.isResolvingAction = true;
      const link = this.chain.pushChainLink(side, card, [], {
        context: { event: 'monster-effect', wouldDestroy: true },
        resolver: async () => {
          const coinDecision = await this.requestDecision({
            type: 'coin-call',
            effect: 'time-wizard',
            side,
            choices: ['heads', 'tails']
          }, 'heads');
          if (coinDecision === null) return false;
          const call = typeof coinDecision === 'object'
            ? (coinDecision.call || 'heads')
            : coinDecision;
          const result = typeof coinDecision === 'object' && coinDecision.result
            ? coinDecision.result
            : (Math.random() < 0.5 ? 'heads' : 'tails');
          const won = call === result;
          const destroyedSide = won ? this.getOpponentSide(side) : side;
          const targets = this.getMonsterEntries(destroyedSide);
          let destroyedFaceUpCurrentAtk = 0;
          for (const target of targets) {
            const currentAtk = target.card.isSetFaceDown
              ? 0
              : Math.max(0, target.card.getAtk());
            if (!this.removeMonsterEntry(destroyedSide, target)) continue;
            destroyedFaceUpCurrentAtk += currentAtk;
            this.field.sendToGraveyard(target.card, target.card.ownerId);
            this.emitMonsterAnimation('destroy', destroyedSide, target);
          }
          if (!won) {
            this.applyEffectDamage(side, Math.floor(destroyedFaceUpCurrentAtk / 2));
          }
          this.log(
            `Magicien du Temps : ${result === 'heads' ? 'pile' : 'face'} — ${won ? 'appel correct' : 'appel incorrect'} !`,
            side
          );
          return true;
        }
      });
      this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });
      await this.openChainResponseWindow(this.getOpponentSide(side), {
        event: 'monster-effect',
        wouldDestroy: true,
        sourceCard: card
      });
      if (!this.isDuelGenerationCurrent(generation)) return false;
      await this.resolveChainStack();
      return this.isDuelGenerationCurrent(generation);
    }

    if (String(card.id) === '31924889') {
      const counterSources = this.getControlledFieldCards(side)
        .filter(candidate => (candidate.counters?.spell || 0) > 0);
      if (!counterSources.length) return false;
      const opponentSide = this.getOpponentSide(side);
      const targets = this.getControlledFieldCards(opponentSide);
      if (!targets.length) return false;
      const counterSource = await this.chooseCard(
        'select-arcanite-counter-source',
        side,
        counterSources,
        cards => cards.find(candidate => candidate === card) || cards[0]
      );
      if (!this.isDuelGenerationCurrent(generation)) return false;
      if (!counterSource || (counterSource.counters?.spell || 0) < 1) return false;
      const target = await this.chooseCard(
        'select-arcanite-target',
        side,
        targets,
        cards => [...cards].sort((a, b) => (
          (b.getAtk ? b.getAtk() : 0) - (a.getAtk ? a.getAtk() : 0)
        ))[0]
      );
      if (!this.isDuelGenerationCurrent(generation)) return false;
      if (!target) return false;
      const targetRuntimeInstanceId = target.runtimeInstanceId;
      const targetControllerId = target.controllerId;
      const targetZoneType = target.location === 'extra_monster_zone'
        ? 'extra'
        : (
          target.location === 'monster_zone'
            ? 'main'
            : (target.location === 'field_zone' ? 'field' : 'spell')
        );
      const targetZoneIndex = target.zoneIndex;

      // Removing a Spell Counter is the activation cost.
      counterSource.removeCounter('spell', 1);
      this.isResolvingAction = true;
      const link = this.chain.pushChainLink(side, card, [target], {
        context: { event: 'monster-effect', wouldDestroy: true },
        resolver: async () => {
          if (
            target.runtimeInstanceId !== targetRuntimeInstanceId
            || target.controllerId !== targetControllerId
            || !this.getControlledFieldCards(opponentSide).includes(target)
          ) return false;
          const destroyed = this.removeCardFromCurrentZone(target, {
            byCardEffect: true,
            sourceSide: side
          });
          if (destroyed) {
            this.callbacks.onAnimation({
              type: 'destroy',
              target: opponentSide,
              zoneType: targetZoneType,
              zoneIndex: targetZoneIndex
            });
            this.log(`**${card.name}** détruit **${target.name}**.`, side);
          }
          return destroyed;
        }
      });
      this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });
      await this.openChainResponseWindow(opponentSide, {
        event: 'monster-effect',
        wouldDestroy: true,
        sourceCard: card
      });
      if (!this.isDuelGenerationCurrent(generation)) return false;
      await this.resolveChainStack();
      return this.isDuelGenerationCurrent(generation);
    }
    return false;
  }

  applyEffectDamage(side, damage) {
    if (!damage || damage <= 0 || this.winner) return 0;
    if (side === 'player') {
      this.playerLP = Math.max(0, this.playerLP - damage);
    } else {
      this.opponentLP = Math.max(0, this.opponentLP - damage);
    }
    this.callbacks.onAnimation({ type: 'lp-loss', target: side, damage });
    if (this.playerLP === 0) this.endGame('opponent');
    else if (this.opponentLP === 0) this.endGame('player');
    return damage;
  }

  async processEndPhaseEffects() {
    const generation = this._duelGeneration;
    let returned = 0;
    for (const side of ['player', 'opponent']) {
      const state = this.getSideState(side);
      const candidates = state.graveyard.filter(card => (
        String(card.id) === '44508094'
        && card.stardustReturnEligibleTurn === this.turnCount
        && card.stardustReturnController === side
        && (
          !card.stardustReturnRuntimeInstanceId
          || card.stardustReturnRuntimeInstanceId === card.runtimeInstanceId
        )
      ));
      for (const stardust of candidates) {
        // The opportunity exists once in this End Phase. Declining it, losing
        // the target, or lacking a zone all expire the delayed trigger.
        stardust.stardustReturnEligibleTurn = -1;
        stardust.stardustReturnController = null;
        stardust.stardustReturnRuntimeInstanceId = null;
        if (!state.monsters.includes(null)) continue;
        const activate = await this.requestDecision({
          type: 'activate-graveyard-effect',
          effect: 'stardust-end-phase-return',
          side,
          card: { uid: stardust.uid, id: stardust.id, name: stardust.name },
          optional: true
        }, true);
        if (!this.isDuelGenerationCurrent(generation)) return 0;
        if (!activate) continue;
        const summonPosition = await this.chooseSummonPosition(
          stardust,
          side,
          'stardust-return'
        );
        if (!this.isDuelGenerationCurrent(generation)) return 0;
        if (!summonPosition) continue;
        const destination = await this.chooseSummonDestination(
          stardust,
          side,
          this.getMainMonsterZoneDestinations(side),
          'stardust-return'
        );
        if (!this.isDuelGenerationCurrent(generation)) return 0;
        const graveIndex = state.graveyard.indexOf(stardust);
        const destinationZone = destination
          && state.monsters[destination.zoneIndex] === null
          ? destination.zoneIndex
          : -1;
        if (graveIndex === -1 || destinationZone === -1) continue;
        state.graveyard.splice(graveIndex, 1);
        if (this.specialSummonCard(stardust, side, destinationZone, {
          position: summonPosition,
          summonType: 'stardust-return'
        }) === false) {
          state.graveyard.push(stardust);
          continue;
        }
        this.log(`Durant la End Phase, **${stardust.name}** revient du Cimetière.`, side);
        returned += 1;
      }
    }
    if (!this.isDuelGenerationCurrent(generation)) return 0;
    this.defense.clearTurnRestrictions();
    this.effects.expireLingeringEffects('turn_end');
    this.stateChanged();
    return returned;
  }

  async tryKuribohBattleDamage(side, damage, context = {}) {
    const generation = this._duelGeneration;
    if (!damage || damage <= 0) return damage;
    if (context.attackerSide !== this.getOpponentSide(side)) return damage;
    const state = this.getSideState(side);
    const kuribohIndex = state.hand.findIndex(card => String(card.id) === '40640057');
    if (kuribohIndex === -1) return damage;
    const kuriboh = state.hand[kuribohIndex];
    const activate = await this.requestDecision({
      type: 'activate-hand-effect',
      effect: 'kuriboh-prevent-battle-damage',
      side,
      card: { uid: kuriboh.uid, id: kuriboh.id, name: kuriboh.name },
      damage,
      context,
      optional: true
    }, true);
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return damage;
    if (!activate) return damage;

    state.hand.splice(kuribohIndex, 1);
    this.field.sendToGraveyard(kuriboh, kuriboh.ownerId);
    let prevented = false;
    const link = this.chain.pushChainLink(side, kuriboh, [], {
      context: { event: 'damage-calculation' },
      resolver: async () => {
        prevented = true;
        this.log(`**Kuriboh** réduit les dommages de ce combat à 0.`, side);
        return true;
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card: kuriboh });
    await this.openChainResponseWindow(this.getOpponentSide(side), {
      event: 'damage-calculation',
      sourceCard: kuriboh
    });
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return damage;
    await this.resolveChainStack();
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return damage;
    return prevented ? 0 : damage;
  }

  pushTrapHoleChainLink(summoningSide, trapCard, trapIndex, summonedCard) {
    const defendingSide = this.getOpponentSide(summoningSide);
    const summonedEntry = this.getMonsterEntries(summoningSide)
      .find(entry => entry.card === summonedCard);
    if (
      !summonedEntry
      || !trapCard
      || this.field.getSpellZone(defendingSide, trapIndex) !== trapCard
      || !trapCard.isSetFaceDown
      || trapCard.turnSet >= this.turnCount
      || summonedCard.isSetFaceDown
      || summonedCard.getAtk() < 1000
    ) return false;

    const summonedRuntimeInstanceId = summonedCard.runtimeInstanceId;
    this.log(
      `${defendingSide === 'player' ? 'Vous activez' : "L'adversaire active"} **Trappe** après l'Invocation de **${summonedCard.name}** !`,
      defendingSide
    );
    this.callbacks.onAnimation({
      type: 'activate',
      target: defendingSide,
      card: trapCard,
      zoneIndex: trapIndex
    });

    trapCard.isSetFaceDown = false;
    const link = this.chain.pushChainLink(defendingSide, trapCard, [summonedCard], {
      zoneIndex: trapIndex,
      context: {
        event: 'SUMMON_SUCCESS',
        trigger: 'trap-hole',
        wouldDestroy: true,
        targetUid: summonedCard.uid,
        targetRuntimeInstanceId: summonedRuntimeInstanceId
      },
      resolver: async () => {
        const currentEntry = this.getMonsterEntries(summoningSide)
          .find(entry => entry.card === summonedCard);
        if (
          currentEntry
          && summonedCard.runtimeInstanceId === summonedRuntimeInstanceId
        ) {
          this.removeMonsterEntry(summoningSide, currentEntry);
          this.field.sendToGraveyard(summonedCard, summonedCard.ownerId);
          this.emitMonsterAnimation('destroy', summoningSide, currentEntry);
        }
        if (this.field.getSpellZone(defendingSide, trapIndex) === trapCard) {
          this.field.setSpellZone(defendingSide, trapIndex, null);
          this.field.sendToGraveyard(trapCard, trapCard.ownerId);
          this.callbacks.onAnimation({
            type: 'clear-spell',
            target: defendingSide,
            zoneIndex: trapIndex
          });
        }
        return true;
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card: trapCard });
    return link;
  }

  async resolveTrapHoleOnSummon(
    summoningSide,
    zoneIndex,
    { buildOnly = false } = {}
  ) {
    const generation = this._duelGeneration;
    const summonedEntry = this.getMonsterEntry(summoningSide, {
      zoneType: 'main',
      zoneIndex
    });
    const summonedCard = summonedEntry?.card;
    if (!summonedCard || summonedCard.isSetFaceDown || summonedCard.getAtk() < 1000) {
      return false;
    }
    const defendingSide = summoningSide === 'player' ? 'opponent' : 'player';
    const defendingSpells = defendingSide === 'player' ? this.playerSpells : this.opponentSpells;
    const trapIndex = defendingSpells.findIndex(
      card => card
        && card.id === '04206964'
        && card.isSetFaceDown
        && card.turnSet < this.turnCount
    );

    if (trapIndex === -1) return false;

    const trapCard = defendingSpells[trapIndex];
    const activate = await this.requestDecision({
      type: 'activate-trap',
      effect: 'trap-hole',
      side: defendingSide,
      card: { uid: trapCard.uid, id: trapCard.id, name: trapCard.name },
      target: { uid: summonedCard.uid, id: summonedCard.id, name: summonedCard.name },
      optional: true
    }, true);
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
    if (!activate) return false;

    const link = this.pushTrapHoleChainLink(
      summoningSide,
      trapCard,
      trapIndex,
      summonedCard
    );
    if (!link) return false;
    if (buildOnly) return link;
    await this.openChainResponseWindow(summoningSide, {
      event: 'SUMMON_SUCCESS',
      timingEvent: 'SUMMON_SUCCESS',
      wouldDestroy: true,
      sourceCard: trapCard,
      summonedCard,
      summoningSide
    });
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
    if (!(await this.delay(500))) return false;
    await this.resolveChainStack();
    return this.isDuelGenerationCurrent(generation) && !this._duelEnded;
  }

  /**
   * Number 39: Utopia — when a monster declares an attack, its controller may
   * detach one material to negate that attack. Detaching is paid as the
   * activation cost, so the material is sent to its owner's Graveyard even if
   * the effect is later negated.
   */
  buildMandatoryEmptyUtopiaTrigger(defender, defendingSide) {
    if (
      !defender
      || String(defender.id) !== '84013237'
      || defender.isSetFaceDown
      || defender.effectNegated
      || !Array.isArray(defender.xyzMaterials)
      || defender.xyzMaterials.length !== 0
    ) return null;
    const defenderEntry = this.getMonsterEntries(defendingSide)
      .find(entry => entry.card === defender);
    if (!defenderEntry) return null;

    const fieldRuntimeInstanceId = defender.runtimeInstanceId;
    const outcome = {
      side: defendingSide,
      card: defender,
      activated: true,
      applied: false,
      mandatory: true,
      link: null
    };
    const link = this.chain.pushChainLink(defendingSide, defender, [], {
      context: {
        event: 'ATTACK_DECLARED',
        trigger: 'utopia-no-material-destruction',
        wouldDestroy: true,
        targetUid: defender.uid,
        targetRuntimeInstanceId: fieldRuntimeInstanceId
      },
      resolver: async () => {
        const currentEntry = this.getMonsterEntries(defendingSide)
          .find(entry => entry.card === defender);
        if (
          !currentEntry
          || defender.runtimeInstanceId !== fieldRuntimeInstanceId
        ) return false;
        this.removeMonsterEntry(defendingSide, currentEntry);
        this.field.sendToGraveyard(defender, defender.ownerId);
        this.emitMonsterAnimation('destroy', defendingSide, currentEntry);
        this.log(
          `**${defender.name}** sans Matériel est détruite lorsqu'elle est ciblée par l'attaque.`,
          defendingSide
        );
        outcome.applied = true;
        return true;
      }
    });
    outcome.link = link;
    this.callbacks.onAnimation({
      type: 'chain-pop',
      linkNumber: link.id,
      card: defender
    });
    return outcome;
  }

  async buildUtopiaAttackResponses(attackContext = {}) {
    const generation = this._duelGeneration;
    const attacker = attackContext.attacker;
    const attackingSide = attackContext.attackingSide || attacker?.controllerId;
    if (!attacker || !attackingSide) return [];
    const defendingSide = this.getOpponentSide(attackingSide);
    const outcomes = [];

    for (const side of [attackingSide, defendingSide]) {
      const candidates = this.getMonsterEntries(side, { faceUpOnly: true })
        .filter(({ card }) => (
          String(card.id) === '84013237'
          && !card.effectNegated
          && Array.isArray(card.xyzMaterials)
          && card.xyzMaterials.length > 0
        ));
      if (!candidates.length) continue;
      const activate = await this.requestDecision({
        type: 'activate-monster-effect',
        effect: 'utopia-negate-attack',
        side,
        cards: candidates.map(entry => ({
          uid: entry.card.uid,
          id: entry.card.id,
          name: entry.card.name
        })),
        attacker: {
          uid: attacker.uid,
          id: attacker.id,
          name: attacker.name
        },
        optional: true
      }, side === defendingSide);
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return [];
      if (!activate) continue;

      const utopia = candidates.length === 1
        ? candidates[0].card
        : await this.chooseCard(
          'select-utopia',
          side,
          candidates.map(entry => entry.card),
          cards => cards[0]
        );
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return [];
      const utopiaEntry = this.getMonsterEntries(side, { faceUpOnly: true })
        .find(entry => entry.card === utopia);
      if (!utopiaEntry || !utopia.xyzMaterials.length) continue;
      const material = utopia.xyzMaterials.length === 1
        ? utopia.xyzMaterials[0]
        : await this.chooseCard(
          'select-utopia-material',
          side,
          [...utopia.xyzMaterials],
          cards => cards[0]
        );
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return [];
      const materialIndex = utopia.xyzMaterials.indexOf(material);
      if (materialIndex === -1) continue;

      utopia.xyzMaterials.splice(materialIndex, 1);
      this.field.sendToGraveyard(material, material.ownerId);
      this.callbacks.onAnimation({
        type: 'xyz-detach',
        target: side,
        zoneType: utopiaEntry.zoneType,
        zoneIndex: utopiaEntry.zoneIndex,
        card: utopia,
        material
      });

      const outcome = {
        side,
        card: utopia,
        material,
        activated: true,
        applied: false,
        link: null
      };
      const link = this.chain.pushChainLink(side, utopia, [], {
        context: {
          event: 'ATTACK_DECLARED',
          trigger: 'utopia-negate-attack',
          negateAttack: true
        },
        resolver: async () => {
          outcome.applied = true;
          this.log(`**${utopia.name}** détache 1 Matériel Xyz et annule l'attaque.`, side);
          return true;
        }
      });
      outcome.link = link;
      outcomes.push(outcome);
      this.callbacks.onAnimation({
        type: 'chain-pop',
        linkNumber: link.id,
        card: utopia
      });
    }
    return outcomes;
  }

  async resolveAttackDeclarationEvent(attackContext = {}) {
    const generation = this._duelGeneration;
    const abortedResult = () => ({
      event: 'ATTACK_DECLARED',
      activated: false,
      attackNegated: false,
      attackerStillValid: false,
      targetStillValid: false,
      replayRequired: false,
      aborted: true
    });
    const attacker = attackContext.attacker;
    const attackingSide = attackContext.attackingSide || attacker?.controllerId;
    if (!attacker || !attackingSide) {
      return {
        event: 'ATTACK_DECLARED',
        activated: false,
        attackNegated: false,
        attackerStillValid: false,
        targetStillValid: false,
        replayRequired: false
      };
    }
    const defendingSide = this.getOpponentSide(attackingSide);
    const attackerRuntimeInstanceId = attacker.runtimeInstanceId;
    const defender = attackContext.defender || null;
    const defenderRuntimeInstanceId = defender?.runtimeInstanceId || null;

    const mandatoryUtopiaOutcome = this.buildMandatoryEmptyUtopiaTrigger(
      defender,
      defendingSide
    );

    const utopiaOutcomes = await this.buildUtopiaAttackResponses({
      ...attackContext,
      attackingSide,
      defendingSide
    });
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) {
      return abortedResult();
    }
    const mirrorOutcome = await this.resolveMirrorForceOnAttack(
      defendingSide,
      attackContext.attackerEntry,
      {
        ...attackContext,
        attackingSide,
        defendingSide,
        buildOnly: true
      }
    );
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) {
      return abortedResult();
    }
    const lastLink = this.chain.getLastLink();
    if (lastLink) {
      await this.openChainResponseWindow(
        this.getOpponentSide(lastLink.activatingPlayerId),
        {
          event: 'ATTACK_DECLARED',
          timingEvent: 'ATTACK_DECLARED',
          sourceCard: lastLink.sourceCard,
          wouldDestroy: Boolean(lastLink.context?.wouldDestroy),
          attacker,
          defender,
          attackingSide,
          defendingSide
        }
      );
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) {
        return abortedResult();
      }
      await this.resolveChainStack();
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) {
        return abortedResult();
      }
    }

    const currentAttackerEntry = this.getMonsterEntries(attackingSide)
      .find(entry => entry.card === attacker);
    const attackerStillValid = Boolean(
      currentAttackerEntry
      && attacker.runtimeInstanceId === attackerRuntimeInstanceId
    );
    const currentDefenderEntry = defender
      ? this.getMonsterEntries(defendingSide).find(entry => entry.card === defender)
      : null;
    const targetStillValid = defender
      ? Boolean(
        currentDefenderEntry
        && defender.runtimeInstanceId === defenderRuntimeInstanceId
      )
      : true;
    const attackNegated = utopiaOutcomes.some(outcome => outcome.applied);

    return {
      event: 'ATTACK_DECLARED',
      activated: Boolean(mandatoryUtopiaOutcome)
        || utopiaOutcomes.length > 0
        || Boolean(mirrorOutcome?.activated),
      attackNegated,
      attackerStillValid,
      targetStillValid,
      replayRequired: Boolean(defender && attackerStillValid && !targetStillValid),
      mandatoryUtopiaDestruction: Boolean(mandatoryUtopiaOutcome),
      mandatoryUtopiaOutcome,
      mirrorResolved: Boolean(mirrorOutcome?.applied),
      utopiaOutcomes
    };
  }

  async resolveUtopiaOnAttack(defendingSide, attackContext = {}) {
    const generation = this._duelGeneration;
    if (attackContext.attacker) {
      const outcomes = await this.buildUtopiaAttackResponses({
        ...attackContext,
        attackingSide: attackContext.attackingSide
          || attackContext.attacker.controllerId
          || this.getOpponentSide(defendingSide)
      });
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
      if (!outcomes.length) return false;
      const lastLink = this.chain.getLastLink();
      await this.openChainResponseWindow(
        this.getOpponentSide(lastLink.activatingPlayerId),
        {
          event: 'ATTACK_DECLARED',
          sourceCard: lastLink.sourceCard,
          attacker: attackContext.attacker
        }
      );
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
      await this.resolveChainStack();
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
      return outcomes.some(outcome => outcome.applied);
    }
    const utopiaEntry = this.getMonsterEntries(defendingSide, { faceUpOnly: true })
      .find(({ card }) => (
        String(card.id) === '84013237'
        && !card.effectNegated
        && Array.isArray(card.xyzMaterials)
        && card.xyzMaterials.length > 0
      ));
    if (!utopiaEntry) return false;

    const utopia = utopiaEntry.card;
    const activate = await this.requestDecision({
      type: 'activate-monster-effect',
      effect: 'utopia-negate-attack',
      side: defendingSide,
      card: { uid: utopia.uid, id: utopia.id, name: utopia.name },
      attacker: attackContext.attacker
        ? {
          uid: attackContext.attacker.uid,
          id: attackContext.attacker.id,
          name: attackContext.attacker.name
        }
        : null,
      optional: true
    }, true);
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
    if (!activate) return false;

    const detached = this.summons.detachXyzMaterials(utopia, 1);
    if (!detached.length) return false;
    detached.forEach(material => this.field.sendToGraveyard(material, material.ownerId));
    this.callbacks.onAnimation({
      type: 'xyz-detach',
      target: defendingSide,
      zoneType: utopiaEntry.zoneType,
      zoneIndex: utopiaEntry.zoneIndex,
      card: utopia,
      material: detached[0]
    });

    let attackNegated = false;
    this.isResolvingAction = true;
    const link = this.chain.pushChainLink(defendingSide, utopia, [], {
      context: { event: 'attack-response', negateAttack: true },
      resolver: async () => {
        attackNegated = true;
        this.log(`**${utopia.name}** détache 1 Matériel Xyz et annule l'attaque.`, defendingSide);
        return true;
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card: utopia });
    await this.openChainResponseWindow(this.getOpponentSide(defendingSide), {
      event: 'attack-response',
      sourceCard: utopia
    });
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
    await this.resolveChainStack();
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
    return attackNegated;
  }

  pushMirrorForceChainLink(
    defendingSide,
    trapCard,
    trapIndex,
    attackContext = {}
  ) {
    const attackingSide = attackContext.attackingSide
      || this.getOpponentSide(defendingSide);
    if (
      !trapCard
      || this.field.getSpellZone(defendingSide, trapIndex) !== trapCard
      || !trapCard.isSetFaceDown
      || trapCard.turnSet >= this.turnCount
      || !this.getMonsterEntries(attackingSide)
        .some(entry => entry.card.position === 'attack')
      || this.isPendulumBattleActivationForbidden(
        defendingSide,
        trapCard,
        attackContext
      )
    ) return false;

    const attackerEntry = attackContext.attacker
      ? this.getMonsterEntries(attackingSide)
        .find(entry => entry.card === attackContext.attacker)
      : null;
    this.log(
      `${defendingSide === 'player' ? 'Vous activez' : "L'adversaire active"} **Force de Miroir** à la déclaration d'attaque !`,
      defendingSide
    );
    this.callbacks.onAnimation({
      type: 'mirror-force-cinematic',
      target: defendingSide,
      zoneIndex: trapIndex,
      atkZoneIndex: attackerEntry?.zoneIndex,
      atkZoneType: attackerEntry?.zoneType || 'main'
    });

    trapCard.isSetFaceDown = false;
    const outcome = {
      activated: true,
      applied: false,
      card: trapCard,
      link: null
    };
    const link = this.chain.pushChainLink(defendingSide, trapCard, [], {
      zoneIndex: trapIndex,
      context: { event: 'attack-response', wouldDestroy: true },
      resolver: async () => {
        outcome.applied = true;
        for (const entry of this.getMonsterEntries(attackingSide)) {
          if (entry.card.position !== 'attack') continue;
          if (!this.removeMonsterEntry(attackingSide, entry)) continue;
          this.field.sendToGraveyard(entry.card, entry.card.ownerId);
          this.emitMonsterAnimation('destroy', attackingSide, entry);
        }
        if (this.field.getSpellZone(defendingSide, trapIndex) === trapCard) {
          this.field.setSpellZone(defendingSide, trapIndex, null);
          this.field.sendToGraveyard(trapCard, trapCard.ownerId);
          this.callbacks.onAnimation({
            type: 'clear-spell',
            target: defendingSide,
            zoneIndex: trapIndex
          });
        }
        return true;
      }
    });
    outcome.link = link;
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card: trapCard });
    return outcome;
  }

  async resolveMirrorForceOnAttack(
    defendingSide,
    attackerZoneReference,
    attackContext = {}
  ) {
    const generation = this._duelGeneration;
    const defendingSpells = defendingSide === 'player' ? this.playerSpells : this.opponentSpells;
    const trapIndex = defendingSpells.findIndex(
      card => card
        && card.id === '44095762'
        && card.isSetFaceDown
        && card.turnSet < this.turnCount
    );

    if (trapIndex === -1) return false;

    const attackingSide = defendingSide === 'player' ? 'opponent' : 'player';
    const attacker = attackContext.attacker
      || this.getMonsterEntry(attackingSide, attackerZoneReference)?.card
      || null;
    const battleContext = {
      attackingSide,
      defendingSide,
      attacker,
      defender: attackContext.defender || null
    };
    const trapCard = defendingSpells[trapIndex];
    if (
      this.isPendulumBattleActivationForbidden(
        defendingSide,
        trapCard,
        battleContext
      )
    ) {
      this.log(
        `**${trapCard.name}** ne peut pas être activée pendant ce combat à cause de l'effet Pendule de **Magicien Observateur du Temps**.`,
        'system'
      );
      return false;
    }
    const activate = await this.requestDecision({
      type: 'activate-trap',
      effect: 'mirror-force',
      side: defendingSide,
      card: { uid: trapCard.uid, id: trapCard.id, name: trapCard.name },
      optional: true
    }, true);
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
    if (!activate) return false;

    const outcome = this.pushMirrorForceChainLink(
      defendingSide,
      trapCard,
      trapIndex,
      battleContext
    );
    if (!outcome) return false;
    if (attackContext.buildOnly) return outcome;
    await this.openChainResponseWindow(attackingSide, {
      event: 'ATTACK_DECLARED',
      timingEvent: 'ATTACK_DECLARED',
      wouldDestroy: true,
      sourceCard: trapCard,
      ...battleContext
    });
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
    if (!(await this.delay(900))) return false;
    await this.resolveChainStack();
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
    return outcome.applied;
  }

  async choosePlayerBattleReplay(attacker) {
    const targets = this.getMonsterEntries('opponent');
    const choices = targets.map(entry => ({
      value: `target:${entry.zoneType}:${entry.zoneIndex}:${entry.card.uid}`,
      label: `ATTAQUER ${entry.card.isSetFaceDown ? 'LE MONSTRE CACHÉ' : entry.card.name}`
    }));
    if (targets.length === 0) {
      choices.push({
        value: 'direct',
        label: 'CONTINUER EN ATTAQUE DIRECTE'
      });
    }
    choices.push({
      value: 'cancel',
      label: "ANNULER L'ATTAQUE"
    });

    const decision = await this.requestDecision({
      type: 'battle-replay',
      side: 'player',
      title: 'REPLAY DE COMBAT',
      description: `Le nombre de monstres adverses a changé. Continuez immédiatement avec ${attacker.name} ou annulez cette attaque.`,
      attacker: { uid: attacker.uid, id: attacker.id, name: attacker.name },
      choices,
      required: true
    }, 'cancel');

    if (decision === 'direct' && targets.length === 0) {
      return { action: 'direct', entry: null };
    }
    const selected = choices.find(choice => choice.value === decision);
    if (!selected || !String(selected.value).startsWith('target:')) {
      return { action: 'cancel', entry: null };
    }
    const selectedEntry = targets.find(entry => (
      selected.value
      === `target:${entry.zoneType}:${entry.zoneIndex}:${entry.card.uid}`
    ));
    return selectedEntry
      ? { action: 'target', entry: selectedEntry }
      : { action: 'cancel', entry: null };
  }

  async resolveDirectAttackDamage(
    attacker,
    attackerEntry,
    attackingSide,
    generation = this._duelGeneration
  ) {
    const defendingSide = this.getOpponentSide(attackingSide);
    this.callbacks.onAnimation({
      type: 'attack-direct',
      target: defendingSide,
      atkZoneIndex: attackerEntry.zoneIndex,
      atkZoneType: attackerEntry.zoneType,
      card: attacker
    });

    if (!(await this.delay(600))) return false;
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
    const directDamage = await this.tryKuribohBattleDamage(
      defendingSide,
      attacker.getAtk(),
      {
        directAttack: true,
        attackerUid: attacker.uid,
        attackerSide: attackingSide
      }
    );
    if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;

    if (defendingSide === 'opponent') {
      this.opponentLP = Math.max(0, this.opponentLP - directDamage);
      this.log(
        `Attaque Directe ! L'adversaire subit **${directDamage}** points de dommages !`,
        'danger'
      );
    } else {
      this.playerLP = Math.max(0, this.playerLP - directDamage);
      this.log(
        `Attaque Directe ! Vous subissez **${directDamage}** points de dommages !`,
        'danger'
      );
    }
    if (directDamage > 0) {
      this.callbacks.onAnimation({
        type: 'lp-loss',
        target: defendingSide,
        damage: directDamage
      });
    }
    attacker.attacksCompletedThisTurn += 1;
    if (this.playerLP === 0) this.endGame('opponent');
    else if (this.opponentLP === 0) this.endGame('player');
    return true;
  }

  /**
   * Combat flow incorporating the 5 Damage Step sub-phases
   */
  async executeAttack(atkReference, defReference) {
    const generation = this._duelGeneration;
    const attackerEntry = this.getMonsterEntry('player', atkReference);
    const defenderEntry = defReference !== undefined && defReference !== null
      ? this.getMonsterEntry('opponent', defReference)
      : null;
    const attacker = attackerEntry?.card || null;
    const defender = defenderEntry?.card || null;

    // --- 1. ATTACK LEGALITY CHECKS ---
    const legality = {
      attackerExists: !!attacker,
      attackerIsFaceUp: attacker ? !attacker.isSetFaceDown : false,
      attackerIsInAttackPosition: attacker ? attacker.position === 'attack' : false,
      attackerCanAttack: attacker ? !this.hasMonsterAttacked(attackerEntry) : false,
      controllerIsTurnPlayer: this.currentTurn === 'player',
      currentPhaseIsBattlePhase: this.currentPhase === 'battle'
    };

    if (!legality.attackerExists || !legality.attackerIsFaceUp || !legality.attackerIsInAttackPosition || !legality.attackerCanAttack || !legality.controllerIsTurnPlayer || !legality.currentPhaseIsBattlePhase) {
      this.log("Déclaration d'attaque illégale annulée selon les règles du TCG !", "danger");
      return;
    }

    if (this.isResolvingAction || this.pendingSummon || this.isDiscarding) return;

    this.isResolvingAction = true;
    this.phases.setBattleStep('battle_step');
    attacker.attacksDeclaredThisTurn += 1;

    const hasOpponentMonsters = this.getMonsterEntries('opponent').length > 0;

    if (!hasOpponentMonsters) {
      // Direct Attack!
      this.markMonsterAttacked(attackerEntry);
      attacker.directAttacksDeclaredThisTurn += 1;
      this.log(`**${attacker.name}** déclare une attaque directe !`, 'player');

      const declaration = await this.resolveAttackDeclarationEvent({
        attacker,
        attackerEntry,
        attackingSide: 'player'
      });
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
      this.isResolvingAction = true;
      if (declaration.attackNegated || !declaration.attackerStillValid) {
        this.isResolvingAction = false;
        this.phases.setBattleStep('battle_step');
        this.stateChanged();
        return declaration;
      }

      if (!await this.resolveDirectAttackDamage(
        attacker,
        attackerEntry,
        'player',
        generation
      )) return false;
    } else {
      if (!defenderEntry || !defender) {
        this.log("Sélectionnez une cible valide !", "system");
        this.isResolvingAction = false;
        return;
      }

      this.markMonsterAttacked(attackerEntry);
      this.log(`**${attacker.name}** déclare une attaque sur **${defender.isSetFaceDown ? 'le monstre caché' : defender.name}** !`, 'player');
      let targetDefender = defender;
      let targetDefEntry = defenderEntry;

      const declaration = await this.resolveAttackDeclarationEvent({
        attacker,
        attackerEntry,
        attackingSide: 'player',
        defender,
        defenderEntry
      });
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
      this.isResolvingAction = true;
      if (
        declaration.attackNegated
        || !declaration.attackerStillValid
      ) {
        this.isResolvingAction = false;
        this.phases.setBattleStep('battle_step');
        this.stateChanged();
        return declaration;
      }
      if (declaration.replayRequired) {
        this.log(
          "Replay de combat requis : continuez immédiatement avec le même attaquant ou annulez l'attaque.",
          'system'
        );
        const replay = await this.choosePlayerBattleReplay(attacker);
        if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
        if (replay.action === 'cancel') {
          this.isResolvingAction = false;
          this.phases.setBattleStep('battle_step');
          this.stateChanged();
          return {
            ...declaration,
            replayCancelled: true,
            replayResolved: true
          };
        }
        if (replay.action === 'direct') {
          attacker.directAttacksDeclaredThisTurn += 1;
          this.log(
            `**${attacker.name}** poursuit son attaque directement après le replay !`,
            'player'
          );
          const directResolved = await this.resolveDirectAttackDamage(
            attacker,
            attackerEntry,
            'player',
            generation
          );
          if (!directResolved) return false;
          this.isResolvingAction = false;
          this.phases.setBattleStep('battle_step');
          this.stateChanged();
          return {
            ...declaration,
            replayResolved: true,
            replayTarget: 'direct'
          };
        }
        targetDefEntry = replay.entry;
        targetDefender = replay.entry?.card || null;
        this.log(
          `**${attacker.name}** poursuit son attaque sur **${targetDefender?.isSetFaceDown ? 'le monstre caché' : targetDefender?.name}** après le replay.`,
          'player'
        );
      }

      // --- 2. BATTLE REPLAY CHECK ---
      // If the number of opponent monsters changed during battle declarations (simulate dynamic ruling)
      const opponentMonsterCount = this.getMonsterEntries('opponent').length;

      // --- 3. DAMAGE STEP SUB-PHASES ---
      this.phases.setBattleStep('damage_step');

      // Step 1: Start of Damage Step
      this.phases.setDamageStepSubPhase('start');
      this.log("[Damage Step] Étape 1 : Début de la Damage Step", "system");

      // Check if target participants still exist
      if (
        !targetDefender
        || !['monster_zone', 'extra_monster_zone'].includes(targetDefender.location)
        || this.getMonsterEntry('opponent', targetDefEntry)?.card !== targetDefender
      ) {
        this.log("Cible manquante. Combat annulé sans calcul des dommages.", "system");
        this.isResolvingAction = false;
        this.phases.setBattleStep('battle_step');
        return;
      }
      if (!(await this.delay(400))) return false;

      // Step 2: Before Damage Calculation
      this.phases.setDamageStepSubPhase('before_calc');
      this.log("[Damage Step] Étape 2 : Avant le calcul des dommages", "system");

      if (targetDefender.isSetFaceDown) {
        targetDefender.isSetFaceDown = false;
        targetDefender.wasFlippedFaceUpByBattle = true;
        this.log(`Le monstre adverse caché est révélé : **${targetDefender.name}** (DEF ${targetDefender.getDef()}) !`, 'system');
        this.callbacks.onAnimation({
          type: 'flip-summon',
          target: 'opponent',
          zoneType: targetDefEntry.zoneType,
          zoneIndex: targetDefEntry.zoneIndex,
          card: targetDefender
        });
        if (!(await this.delay(450))) return false;
      }

      // Attack project visual animation
      this.callbacks.onAnimation({
        type: 'attack-monster',
        attackerSide: 'player',
        atkZoneIndex: attackerEntry.zoneIndex,
        atkZoneType: attackerEntry.zoneType,
        defZoneIndex: targetDefEntry.zoneIndex,
        defZoneType: targetDefEntry.zoneType
      });
      if (!(await this.delay(600))) return false;

      // Step 3: During Damage Calculation
      this.phases.setDamageStepSubPhase('calc');
      this.log("[Damage Step] Étape 3 : Calcul des dommages", "system");

      let defenderDestroyed = false;
      let attackerDestroyed = false;
      let pDamage = 0;
      let oDamage = 0;

      const atkValue = attacker.getAtk();
      const defValue = targetDefender.position === 'defense' ? targetDefender.getDef() : targetDefender.getAtk();

      // Rule: 0 ATK vs 0 ATK monsters in attack position cannot destroy each other
      if (atkValue === 0 && defValue === 0 && targetDefender.position === 'attack') {
        this.log("Combat entre deux monstres à 0 ATK : aucune destruction, aucun dommage.", "system");
        defenderDestroyed = false;
        attackerDestroyed = false;
      }
      else if (targetDefender.position === 'defense') {
        // Piercing damage checks (e.g. description includes transperce/piercing)
        const isPiercing = attacker.desc.toLowerCase().includes("transperce") || attacker.desc.toLowerCase().includes("pierce");

        if (atkValue > defValue) {
          defenderDestroyed = true;
          if (isPiercing) {
            oDamage = atkValue - defValue;
          }
        } else if (atkValue < defValue) {
          pDamage = defValue - atkValue;
        }
      }
      else {
        // Attack vs Attack comparison
        if (atkValue > defValue) {
          defenderDestroyed = true;
          oDamage = atkValue - defValue;
        } else if (atkValue === defValue) {
          defenderDestroyed = true;
          attackerDestroyed = true;
        } else {
          attackerDestroyed = true;
          pDamage = defValue - atkValue;
        }
      }

      pDamage = await this.tryKuribohBattleDamage('player', pDamage, {
        directAttack: false,
        attackerUid: attacker.uid,
        attackerSide: 'player',
        defenderUid: targetDefender.uid
      });
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
      oDamage = await this.tryKuribohBattleDamage('opponent', oDamage, {
        directAttack: false,
        attackerUid: attacker.uid,
        attackerSide: 'player',
        defenderUid: targetDefender.uid
      });
      if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;

      // Apply Damage to LP
      if (pDamage > 0) {
        this.playerLP = Math.max(0, this.playerLP - pDamage);
        this.callbacks.onAnimation({ type: 'lp-loss', target: 'player', damage: pDamage });
        this.log(`Vous subissez **${pDamage}** dommages de combat !`, 'danger');
      }
      if (oDamage > 0) {
        this.opponentLP = Math.max(0, this.opponentLP - oDamage);
        this.callbacks.onAnimation({ type: 'lp-loss', target: 'opponent', damage: oDamage });
        this.log(`L'adversaire subit **${oDamage}** dommages de combat !`, 'player');
      }

      // Mark for battle destruction (not sent to GY yet)
      if (defenderDestroyed) {
        targetDefender.pendingBattleDestruction = true;
        targetDefender.battleResult = 'destroyed';
      }
      if (attackerDestroyed) {
        attacker.pendingBattleDestruction = true;
        attacker.battleResult = 'destroyed';
      }

      // Step 4: After Damage Calculation
      this.phases.setDamageStepSubPhase('after_calc');
      this.log("[Damage Step] Étape 4 : Après le calcul des dommages", "system");

      // Trigger Flip effects if defender was flipped
      if (targetDefender.wasFlippedFaceUpByBattle) {
        this.log(`Effet Flip de **${targetDefender.name}** activé après le calcul des dommages !`, 'system');
      }
      if (!(await this.delay(400))) return false;

      // Step 5: End of Damage Step
      this.phases.setDamageStepSubPhase('end');
      this.log("[Damage Step] Étape 5 : Fin de la Damage Step", "system");

      // Final movement to GY/Exil based on pendingBattleDestruction
      if (defenderDestroyed && targetDefender.pendingBattleDestruction) {
        this.removeMonsterEntry('opponent', targetDefEntry);
        this.field.sendToGraveyard(targetDefender, targetDefender.ownerId);
        this.emitMonsterAnimation('destroy', 'opponent', targetDefEntry);
        attacker.monstersDestroyedByBattleThisTurn += 1;
      }
      if (attackerDestroyed && attacker.pendingBattleDestruction) {
        this.removeMonsterEntry('player', attackerEntry);
        this.field.sendToGraveyard(attacker, attacker.ownerId);
        this.emitMonsterAnimation('destroy', 'player', attackerEntry);
      }

      // Reset Combat contexts
      if (targetDefender) {
        targetDefender.pendingBattleDestruction = false;
        targetDefender.wasFlippedFaceUpByBattle = false;
      }
      attacker.pendingBattleDestruction = false;

      this.phases.setBattleStep('none');
      attacker.attacksCompletedThisTurn += 1;

      if (this.playerLP === 0) this.endGame('opponent');
      else if (this.opponentLP === 0) this.endGame('player');
    }

    this.isResolvingAction = false;
    this.stateChanged();
  }

  getSynchroMaterialCombination(extraCard, side = 'player') {
    const materials = this.getMonsterEntries(side, { faceUpOnly: true })
      .map(entry => entry.card);
    const combinations = [];
    const search = (index, selected) => {
      if (selected.length >= 2 && this.summons.validateSynchroSummon(
        selected,
        extraCard.getLevel(),
        extraCard
      )) {
        combinations.push([...selected]);
        return;
      }
      if (index >= materials.length) return;
      for (let next = index; next < materials.length; next += 1) {
        search(next + 1, [...selected, materials[next]]);
      }
    };
    search(0, []);
    return combinations[0] || null;
  }

  canAutoSynchroSummon(extraCard, side = 'player') {
    return Boolean(extraCard?.extra_type === 'synchro'
      && this.getSynchroMaterialCombination(extraCard, side));
  }

  findExtraDeckMaterialCombinations(extraCard, side, summonType) {
    const entries = this.getMonsterEntries(side, { faceUpOnly: true });
    const validCombinations = [];
    const search = (index, selected) => {
      if (selected.length > 0) {
        const cards = selected.map(entry => entry.card);
        const valid = summonType === 'xyz'
          ? this.summons.validateXyzSummon(cards, extraCard, { controllerId: side })
          : this.summons.validateLinkSummon(cards, extraCard, {
            controllerId: side,
            requiresEffectMonsters: extraCard.requiresEffectMonsters ?? false,
            allowTokens: false
          });
        if (valid) validCombinations.push([...selected]);
      }
      for (let next = index; next < entries.length; next += 1) {
        search(next + 1, [...selected, entries[next]]);
      }
    };
    search(0, []);
    validCombinations.sort((a, b) => a.length - b.length);
    return validCombinations.filter(materials => (
      this.getProjectedSpecialSummonDestinations(
        side,
        materials,
        summonType === 'link'
          ? { mainMode: 'linked', preferExtra: true }
          : {}
      ).length > 0
    ));
  }

  findExtraDeckMaterialCombination(extraCard, side, summonType) {
    return this.findExtraDeckMaterialCombinations(
      extraCard,
      side,
      summonType
    )[0] || null;
  }

  getXyzMaterialCombination(extraCard, side = 'player') {
    if (extraCard?.extra_type !== 'xyz') return null;
    return this.findExtraDeckMaterialCombination(extraCard, side, 'xyz');
  }

  getLinkMaterialCombination(extraCard, side = 'player') {
    if (extraCard?.extra_type !== 'link') return null;
    return this.findExtraDeckMaterialCombination(extraCard, side, 'link');
  }

  async performXyzSummon(side, extraCardUid) {
    const state = this.getSideState(side);
    const initialExtraCardIndex = state.extraDeck.findIndex(card => card.uid === extraCardUid);
    const extraCard = state.extraDeck[initialExtraCardIndex];
    if (!extraCard || extraCard.extra_type !== 'xyz') return false;
    if (this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', extraCard)) return false;
    const initialCombinations = this.findExtraDeckMaterialCombinations(
      extraCard,
      side,
      'xyz'
    );
    const selectedCombination = await this.chooseMaterialCombination(
      'select-xyz-materials',
      side,
      extraCard,
      initialCombinations
    );
    if (!selectedCombination) return false;

    const summonPosition = await this.chooseSummonPosition(extraCard, side, 'xyz');
    if (!summonPosition) return false;

    const initialMaterialEntries = selectedCombination.map(material => (
      this.getMonsterEntries(side, { faceUpOnly: true })
        .find(entry => entry.card === material.card)
    ));
    if (initialMaterialEntries.some(entry => !entry)) return false;
    const destination = await this.chooseSummonDestination(
      extraCard,
      side,
      this.getProjectedSpecialSummonDestinations(side, initialMaterialEntries),
      'xyz'
    );
    if (!destination) return false;

    // Every choice is asynchronous. Re-read the Extra Deck, exact selected
    // materials, destination, and restrictions before consuming one card.
    const extraCardIndex = state.extraDeck.indexOf(extraCard);
    if (extraCardIndex === -1 || extraCard.extra_type !== 'xyz') return false;
    const materialEntries = selectedCombination.map(material => (
      this.getMonsterEntries(side, { faceUpOnly: true })
        .find(entry => entry.card === material.card)
    ));
    const currentDestinationKeys = this.getProjectedSpecialSummonDestinations(
      side,
      materialEntries.filter(Boolean)
    ).map(candidate => this.getSummonDestinationKey(candidate));
    if (
      materialEntries.some(entry => !entry)
      || !this.summons.validateXyzSummon(
        materialEntries.map(entry => entry.card),
        extraCard,
        { controllerId: side }
      )
      || !currentDestinationKeys.includes(this.getSummonDestinationKey(destination))
      || this.winner
      || this._duelEnded
      || this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', extraCard)
    ) return false;

    // Transaction commit only after destination, target, restriction, and
    // every material have been validated together.
    materialEntries.forEach(entry => {
      this.removeMonsterEntry(side, entry);
      this.emitMonsterAnimation('material', side, entry, { summonType: 'xyz' });
    });
    state.extraDeck.splice(extraCardIndex, 1);
    const summoned = destination.zoneType === 'main'
      ? this.specialSummonCard(extraCard, side, destination.zoneIndex, {
        position: summonPosition,
        summonType: 'xyz',
        properlySummoned: true
      })
      : this.specialSummonToExtraMonsterZone(extraCard, side, destination.zoneIndex, {
        position: summonPosition,
        summonType: 'xyz',
        properlySummoned: true
      });
    if (summoned === false) return false;
    this.summons.attachXyzMaterials(
      extraCard,
      materialEntries.map(entry => entry.card)
    );
    this.log(
      `Invocation Xyz de **${extraCard.name}** avec ${extraCard.xyzMaterials.length} Matériels.`,
      side
    );
    this.stateChanged();
    return true;
  }

  async performLinkSummon(side, extraCardUid) {
    const state = this.getSideState(side);
    const extraCard = state.extraDeck.find(card => card.uid === extraCardUid);
    if (!extraCard || extraCard.extra_type !== 'link') return false;
    if (this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', extraCard)) return false;
    const selectedCombination = await this.chooseMaterialCombination(
      'select-link-materials',
      side,
      extraCard,
      this.findExtraDeckMaterialCombinations(extraCard, side, 'link')
    );
    if (!selectedCombination) return false;
    const initialMaterialEntries = selectedCombination.map(material => (
      this.getMonsterEntries(side, { faceUpOnly: true })
        .find(entry => entry.card === material.card)
    ));
    if (initialMaterialEntries.some(entry => !entry)) return false;
    const destination = await this.chooseSummonDestination(
      extraCard,
      side,
      this.getProjectedSpecialSummonDestinations(
        side,
        initialMaterialEntries,
        { mainMode: 'linked', preferExtra: true }
      ),
      'link'
    );
    if (!destination) return false;

    const extraCardIndex = state.extraDeck.indexOf(extraCard);
    const materialEntries = selectedCombination.map(material => (
      this.getMonsterEntries(side, { faceUpOnly: true })
        .find(entry => entry.card === material.card)
    ));
    const currentDestinationKeys = this.getProjectedSpecialSummonDestinations(
      side,
      materialEntries.filter(Boolean),
      { mainMode: 'linked', preferExtra: true }
    ).map(candidate => this.getSummonDestinationKey(candidate));
    if (
      extraCardIndex === -1
      || materialEntries.some(entry => !entry)
      || !this.summons.validateLinkSummon(
        materialEntries.map(entry => entry.card),
        extraCard,
        {
          controllerId: side,
          requiresEffectMonsters: extraCard.requiresEffectMonsters ?? false,
          allowTokens: false
        }
      )
      || !currentDestinationKeys.includes(this.getSummonDestinationKey(destination))
      || this.winner
      || this._duelEnded
      || this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', extraCard)
    ) return false;

    // Transaction commit: destination and materials have both been validated.
    materialEntries.forEach(entry => {
      this.removeMonsterEntry(side, entry);
      this.field.sendToGraveyard(entry.card, entry.card.ownerId);
      this.emitMonsterAnimation('destroy', side, entry, { summonType: 'link-material' });
    });

    state.extraDeck.splice(extraCardIndex, 1);
    const summoned = destination.zoneType === 'extra'
      ? this.specialSummonToExtraMonsterZone(extraCard, side, destination.zoneIndex, {
        summonType: 'link',
        properlySummoned: true
      })
      : this.specialSummonCard(extraCard, side, destination.zoneIndex, {
        position: 'attack',
        summonType: 'link',
        properlySummoned: true
      });
    if (summoned === false) return false;
    this.log(`Invocation Lien de **${extraCard.name}** (Lien-${extraCard.linkRating}).`, side);
    this.stateChanged();
    return true;
  }

  async tryAIAdvancedExtraDeckSummon(profile = this.getAIDecisionProfile()) {
    if (!profile.usesExtraDeck || this.winner || this._duelEnded) return false;
    const candidates = this.opponentExtraDeck
      .filter(card => ['xyz', 'link'].includes(card.extra_type))
      .map(card => ({
        card,
        materials: card.extra_type === 'xyz'
          ? this.getXyzMaterialCombination(card, 'opponent')
          : this.getLinkMaterialCombination(card, 'opponent')
      }))
      .filter(option => option.materials?.length)
      .sort((a, b) => b.card.getAtk() - a.card.getAtk());
    const option = candidates[0];
    if (!option) return false;

    const summoned = option.card.extra_type === 'xyz'
      ? await this.performXyzSummon('opponent', option.card.uid)
      : await this.performLinkSummon('opponent', option.card.uid);
    if (summoned) {
      this.log(
        `L'adversaire réalise l'Invocation ${option.card.extra_type === 'xyz' ? 'Xyz' : 'Lien'} de **${option.card.name}** !`,
        'opponent'
      );
    }
    return Boolean(summoned);
  }

  async summonExtraDeck(extraCardUid) {
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return false;

    const extraCardIdx = this.playerExtraDeck.findIndex(c => c.uid === extraCardUid);
    if (extraCardIdx === -1) return false;

    const extraCard = this.playerExtraDeck[extraCardIdx];

    if (extraCard.extra_type === 'xyz') {
      const summoned = await this.performXyzSummon('player', extraCard.uid);
      if (!summoned) {
        this.log(`Invocation Xyz impossible pour **${extraCard.name}**.`, 'danger');
      }
      return summoned;
    }

    if (extraCard.extra_type === 'link') {
      const summoned = await this.performLinkSummon('player', extraCard.uid);
      if (!summoned) {
        this.log(`Invocation Lien impossible pour **${extraCard.name}**.`, 'danger');
      }
      return summoned;
    }

    if (extraCard.extra_type === 'fusion') {
      const fusionOption = this.getFusionOptions('player').find(option => option.card === extraCard);
      if (!fusionOption) {
        this.log(`Les Matériels Fusion face recto/main requis pour **${extraCard.name}** ne sont pas disponibles.`, 'danger');
        return false;
      }

      const polymerizationInHand = this.playerHand.find(card => String(card.id) === '24094653');
      const polymerizationZone = this.playerSpells.findIndex(card => (
        card && String(card.id) === '24094653' && card.isSetFaceDown
      ));
      if (!polymerizationInHand && polymerizationZone === -1) {
        this.log(`Règle TCG : **${extraCard.name}** nécessite l'activation de **Polymérisation**.`, 'danger');
        return false;
      }

      this.pendingFusionTargets.player = extraCard.uid;
      if (polymerizationInHand) {
        const spellZone = this.playerSpells.findIndex(card => card === null);
        if (spellZone === -1) {
          this.pendingFusionTargets.player = null;
          return false;
        }
        return this.playSpellTrap(polymerizationInHand.uid, spellZone);
      }
      return this.activateSetSpellTrap(polymerizationZone);
    }

    const emptyZoneIdx = this.playerMonsters.findIndex(m => m === null);
    if (emptyZoneIdx === -1 && extraCard.extra_type !== 'synchro') {
      this.log("Pas de Zone Monstre vide !", "danger");
      return false;
    }

    if (extraCard.extra_type === 'synchro') {
      if (!this.getSynchroMaterialCombination(extraCard, 'player')) {
        this.log("Aucune combinaison Synchro légale n'est disponible sur vos Zones Monstre.", "danger");
        return false;
      }

      this.pendingExtraSummon = {
        extraCard,
        targetLevel: extraCard.level,
        selectedMaterialIndices: [],
        extraCardIdx
      };

      this.log(`Invocation Synchro de **${extraCard.name}** (Niveau ${extraCard.level}). Sélectionnez les monstres dont la somme des Niveaux est égale à ${extraCard.level} !`, 'system');
      this.callbacks.onAnimation({ type: 'awaiting-synchro', target: 'player', targetLevel: extraCard.level });
      this.stateChanged();
      return true;
    }
    return false;
  }

  async selectSynchroMaterial(zoneReference) {
    const selectedEntry = this.getMonsterEntry('player', zoneReference);
    if (!this.pendingExtraSummon || !selectedEntry || selectedEntry.card.isSetFaceDown) return;

    const list = this.pendingExtraSummon.selectedMaterialIndices;
    const selectionKey = selectedEntry.zoneType === 'main'
      ? selectedEntry.zoneIndex
      : `extra:${selectedEntry.zoneIndex}`;
    const existsIdx = list.indexOf(selectionKey);

    if (existsIdx !== -1) {
      list.splice(existsIdx, 1);
    } else {
      list.push(selectionKey);
    }

    let currentSum = 0;
    list.forEach(reference => {
      const entry = this.getMonsterEntry('player', reference);
      if (entry) currentSum += entry.card.getLevel();
    });

    this.log(`Sélection Synchro : Somme actuelle = ${currentSum} / ${this.pendingExtraSummon.targetLevel}`, 'system');
    this.callbacks.onAnimation({ type: 'tribute-selection-update', selectedIndices: [...list] });

    if (currentSum === this.pendingExtraSummon.targetLevel) {
      const selectedSnapshots = list.map(reference => {
        const entry = this.getMonsterEntry('player', reference);
        return entry ? { reference, card: entry.card } : null;
      });
      const selectedMaterials = selectedSnapshots
        .filter(Boolean)
        .map(snapshot => snapshot.card);

      if (
        selectedSnapshots.some(snapshot => !snapshot)
        || !this.summons.validateSynchroSummon(
        selectedMaterials,
        this.pendingExtraSummon.targetLevel,
        this.pendingExtraSummon.extraCard
        )
      ) {
        this.log("Invocation Synchro invalide : sélectionnez exactement 1 Syntoniseur et au moins 1 non-Syntoniseur.", "danger");
        this.stateChanged();
        return;
      }

      const synchroState = this.pendingExtraSummon;
      const summonPosition = await this.chooseSummonPosition(
        synchroState.extraCard,
        'player',
        'synchro'
      );
      if (!summonPosition) return false;
      const projectedMaterialEntries = selectedSnapshots.map(snapshot => {
        const entry = snapshot
          ? this.getMonsterEntry('player', snapshot.reference)
          : null;
        return entry?.card === snapshot?.card && !entry.card.isSetFaceDown
          ? entry
          : null;
      });
      const selectedDestination = projectedMaterialEntries.every(Boolean)
        ? await this.chooseSummonDestination(
          synchroState.extraCard,
          'player',
          this.getProjectedSpecialSummonDestinations(
            'player',
            projectedMaterialEntries
          ),
          'synchro'
        )
        : null;
      if (
        this.pendingExtraSummon !== synchroState
        ||
        this.playerExtraDeck.indexOf(synchroState.extraCard) === -1
        || !selectedDestination
        || this.winner
        || this._duelEnded
        || this.defense.isActionProhibited(
          'player',
          'SPECIAL_SUMMON',
          synchroState.extraCard
        )
      ) {
        this.log("Invocation Synchro interdite : aucune carte n'a été consommée.", 'danger');
        this.callbacks.onAnimation({ type: 'tribute-selection-clear' });
        this.stateChanged();
        return false;
      }
      this.pendingExtraSummon = null;

      this.isResolvingAction = true;
      this.log("Accord Synchro ! Vérification finale des matériels...", "system");
      if (!(await this.delay(600))) {
        this.isResolvingAction = false;
        return false;
      }

      const materialEntries = selectedSnapshots.map(snapshot => {
        const entry = this.getMonsterEntry('player', snapshot.reference);
        return entry?.card === snapshot.card && !entry.card.isSetFaceDown
          ? entry
          : null;
      });
      const card = synchroState.extraCard;
      const extraIndex = this.playerExtraDeck.indexOf(card);
      const currentDestinationKeys = this.getProjectedSpecialSummonDestinations(
        'player',
        materialEntries.filter(Boolean)
      ).map(candidate => this.getSummonDestinationKey(candidate));
      if (
        materialEntries.some(entry => !entry)
        || extraIndex === -1
        || !currentDestinationKeys.includes(
          this.getSummonDestinationKey(selectedDestination)
        )
        || this.winner
        || this._duelEnded
        || this.defense.isActionProhibited('player', 'SPECIAL_SUMMON', card)
        || !this.summons.validateSynchroSummon(
          materialEntries.map(entry => entry.card),
          synchroState.targetLevel,
          card
        )
      ) {
        this.log("Invocation Synchro annulée : l'état du Duel a changé.", 'danger');
        this.isResolvingAction = false;
        this.callbacks.onAnimation({ type: 'tribute-selection-clear' });
        this.stateChanged();
        return false;
      }

      // Transaction commit after the asynchronous delay has been revalidated.
      materialEntries.forEach(materialEntry => {
        this.removeMonsterEntry('player', materialEntry);
        this.field.sendToGraveyard(materialEntry.card, materialEntry.card.ownerId);
        this.emitMonsterAnimation('destroy', 'player', materialEntry, {
          summonType: 'synchro-material'
        });
      });
      this.playerExtraDeck.splice(extraIndex, 1);
      const summoned = selectedDestination.zoneType === 'main'
        ? this.specialSummonCard(card, 'player', selectedDestination.zoneIndex, {
          position: summonPosition,
          summonType: 'synchro',
          properlySummoned: true
        })
        : this.specialSummonToExtraMonsterZone(
          card,
          'player',
          selectedDestination.zoneIndex,
          {
            position: summonPosition,
            summonType: 'synchro',
            properlySummoned: true
          }
        );
      if (summoned === false) {
        this.isResolvingAction = false;
        return false;
      }
      this.log(`Invocation Synchro ! Incarnez le légendaire **${card.name}** !`, 'player');
      this.isResolvingAction = false;
      this.stateChanged();
      return true;
    }
    else if (currentSum > this.pendingExtraSummon.targetLevel) {
      this.log("La somme des Niveaux dépasse le niveau requis !", "danger");
      this.pendingExtraSummon = null;
      this.callbacks.onAnimation({ type: 'tribute-selection-clear' });
      this.stateChanged();
    }
  }

  cancelExtraSummon() {
    if (!this.pendingExtraSummon) return;
    this.pendingExtraSummon = null;
    this.callbacks.onAnimation({ type: 'tribute-selection-clear' });
    this.stateChanged();
  }

  endGame(winner, reason = 'lp_zero') {
    if (this._duelEnded) return false;
    const allowedReasons = new Set(['deck_out', 'lp_zero', 'surrender', 'draw']);
    const stableReason = allowedReasons.has(reason) ? reason : 'lp_zero';
    this.winner = winner;
    this.endReason = stableReason;
    this._duelEnded = true;
    this.isResolvingAction = false;
    this.pendingSummon = null;
    this.pendingExtraSummon = null;
    this.isDiscarding = false;
    this.cancelPendingAsyncWork();
    const winnerLabel = winner === 'draw'
      ? 'Match nul'
      : (winner === 'player' ? 'Joueur (Vous)' : 'Adversaire (IA)');
    this.log(`LE DUEL EST FINI ! Résultat : ${winnerLabel} (${stableReason})`, 'duel-end');
    this.callbacks.onGameOver(winner, stableReason);
    return true;
  }

  getTributeCombinations(entries, count) {
    if (count === 0) return [[]];
    const combinations = [];
    const search = (start, selected) => {
      if (selected.length === count) {
        combinations.push([...selected]);
        return;
      }
      for (let index = start; index < entries.length; index += 1) {
        search(index + 1, [...selected, entries[index]]);
      }
    };
    search(0, []);
    return combinations;
  }

  async tryAIPendulumActions(profile = this.getAIDecisionProfile()) {
    if (
      !profile.usesExtraDeck
      || this.currentTurn !== 'opponent'
      || !this.currentPhase.startsWith('main')
    ) return false;
    const state = this.getSideState('opponent');
    let actions = 0;
    const activeScales = () => this.getPendulumScales('opponent');
    if (!activeScales()) {
      const candidates = state.hand
        .filter(card => card.isPendulumMonster)
        .filter(card => (
          !card.pendulumActivationRequiresEmptyMonsterField
          || this.getMonsterEntries('opponent').length === 0
        ));
      let pair = null;
      for (let left = 0; left < candidates.length; left += 1) {
        for (let right = left + 1; right < candidates.length; right += 1) {
          if (candidates[left].pendulumScale === candidates[right].pendulumScale) continue;
          pair = [candidates[left], candidates[right]]
            .sort((a, b) => a.pendulumScale - b.pendulumScale);
          break;
        }
        if (pair) break;
      }
      if (
        pair
        && state.spells[0] === null
        && state.spells[4] === null
      ) {
        if (await this.activatePendulumScale(pair[0].uid, 0, 'opponent')) actions += 1;
        if (
          !this.winner
          && !this._duelEnded
          && state.hand.includes(pair[1])
          && await this.activatePendulumScale(pair[1].uid, 4, 'opponent')
        ) actions += 1;
      }
    }
    if (
      actions <= 2
      && activeScales()
      && this.summons.canPendulumSummon()
      && await this.performPendulumSummon('opponent')
    ) actions += 1;
    return actions > 0;
  }

  async tryAIMonsterEffects(maxActions = 4) {
    // Failed or intrinsically once-per-turn effects are blocked for this bounded
    // pass. Arcanite stays eligible after a successful activation so the AI may
    // spend another available Spell Counter on another legal target.
    const blocked = new Set();
    let actions = 0;
    while (
      actions < maxActions
      && !this.winner
      && !this._duelEnded
    ) {
      const option = this.getMonsterEntries('opponent', { faceUpOnly: true })
        .find(entry => {
          const card = entry.card;
          const effectKey = `${card.runtimeInstanceId}:${card.id}`;
          if (blocked.has(effectKey) || card.effectNegated) return false;
          if (String(card.id) === '71625222') {
            return card.effectUsage.timeWizardTurn !== this.turnCount;
          }
          if (String(card.id) === '31924889') {
            return (
              this.getControlledFieldCards('opponent')
                .some(candidate => (candidate.counters?.spell || 0) > 0)
              && this.getControlledFieldCards('player').length > 0
            );
          }
          return false;
        });
      if (!option) break;
      const effectKey = `${option.card.runtimeInstanceId}:${option.card.id}`;
      const used = await this.activateMonsterEffect(option, 'opponent');
      if (!used) {
        blocked.add(effectKey);
        continue;
      }
      actions += 1;
      if (String(option.card.id) !== '31924889') {
        blocked.add(effectKey);
      }
    }
    return actions;
  }

  async tryAIPositionChanges(maxActions = 5) {
    let actions = 0;
    const strongestPlayerAtk = Math.max(
      0,
      ...this.getMonsterEntries('player', { faceUpOnly: true })
        .map(entry => entry.card.getAtk())
    );
    for (const entry of this.getMonsterEntries('opponent')) {
      if (actions >= maxActions) break;
      const card = entry.card;
      if (
        card.extra_type === 'link'
        || card.turnSummoned === this.turnCount
        || card.hasChangedPositionThisTurn
        || card.attacksDeclaredThisTurn > 0
      ) continue;
      if (card.isSetFaceDown) {
        if (card.getAtk() < strongestPlayerAtk && card.getDef() >= card.getAtk()) continue;
        card.isSetFaceDown = false;
        card.position = 'attack';
        card.hasChangedPositionThisTurn = true;
        this.emitMonsterAnimation('flip-summon', 'opponent', entry, { card });
        await this.resolveSummonSuccessEvent(card, 'opponent', entry, {
          summonType: 'flip',
          includeJunk: false
        });
        actions += 1;
      } else if (card.position === 'defense' && card.getAtk() >= strongestPlayerAtk) {
        card.position = 'attack';
        card.hasChangedPositionThisTurn = true;
        this.emitMonsterAnimation('toggle-position', 'opponent', entry, {
          position: 'attack'
        });
        actions += 1;
      } else if (
        card.position === 'attack'
        && strongestPlayerAtk > card.getAtk()
        && card.getDef() > card.getAtk()
      ) {
        card.position = 'defense';
        card.hasChangedPositionThisTurn = true;
        this.emitMonsterAnimation('toggle-position', 'opponent', entry, {
          position: 'defense'
        });
        actions += 1;
      }
    }
    return actions;
  }

  async tryAINormalSummon(profile = this.getAIDecisionProfile()) {
    if (!this.summons.canNormalSummon() || this.winner || this._duelEnded) {
      return false;
    }
    const candidates = this.opponentHand
      .filter(card => this.summons.canUseNormalSummonProcedure(card))
      .sort((a, b) => (
        profile.valuesCardAdvantage
          ? b.getAtk() - a.getAtk()
          : a.getAtk() - b.getAtk()
      ));
    const entries = this.getMonsterEntries('opponent');
    let plan = null;

    for (const card of candidates) {
      const tributesRequired = card.level >= 7 ? 2 : (card.level >= 5 ? 1 : 0);
      if (entries.length < tributesRequired) continue;
      let combinations = this.getTributeCombinations(entries, tributesRequired);
      if (profile.preservesTributeValue) {
        combinations = combinations.sort((a, b) => (
          a.reduce((sum, entry) => sum + entry.card.getAtk(), 0)
          - b.reduce((sum, entry) => sum + entry.card.getAtk(), 0)
        ));
      }
      for (const tributes of combinations) {
        const tributeCards = new Set(tributes.map(entry => entry.card));
        const destinations = this.opponentMonsters
          .map((occupant, zoneIndex) => (
            occupant === null || tributeCards.has(occupant) ? zoneIndex : -1
          ))
          .filter(zoneIndex => zoneIndex >= 0);
        if (!destinations.length) continue;
        plan = {
          card,
          tributes,
          destination: destinations[0]
        };
        break;
      }
      if (plan) break;
    }
    if (!plan) return false;

    const strongestVisiblePlayerAtk = Math.max(
      0,
      ...this.getMonsterEntries('player', { faceUpOnly: true })
        .map(entry => entry.card.getAtk())
    );
    const isSet = profile.level === 'easy'
      ? false
      : profile.level === 'hard'
        ? plan.card.getAtk() < strongestVisiblePlayerAtk
          && plan.card.getDef() >= plan.card.getAtk()
        : plan.card.getDef() > plan.card.getAtk() && Math.random() > 0.4;
    const snapshots = plan.tributes.map(entry => ({
      reference: {
        zoneType: entry.zoneType,
        zoneIndex: entry.zoneIndex
      },
      card: entry.card,
      runtimeInstanceId: entry.card.runtimeInstanceId
    }));
    const handRuntimeInstanceId = plan.card.runtimeInstanceId;

    if (!(await this.delay(plan.tributes.length ? 800 : 200))) return false;
    const liveEntries = snapshots.map(snapshot => {
      const entry = this.getMonsterEntry('opponent', snapshot.reference);
      return (
        entry
        && entry.card === snapshot.card
        && entry.card.runtimeInstanceId === snapshot.runtimeInstanceId
      ) ? entry : null;
    });
    const handIndex = this.opponentHand.indexOf(plan.card);
    const liveTributeCards = new Set(liveEntries.filter(Boolean).map(entry => entry.card));
    const destinationOccupant = this.opponentMonsters[plan.destination];
    if (
      liveEntries.some(entry => !entry)
      || handIndex === -1
      || plan.card.runtimeInstanceId !== handRuntimeInstanceId
      || (destinationOccupant && !liveTributeCards.has(destinationOccupant))
      || !this.summons.canNormalSummon()
      || this.winner
      || this._duelEnded
    ) return false;

    for (const entry of liveEntries) {
      this.removeMonsterEntry('opponent', entry);
      this.field.sendToGraveyard(entry.card, entry.card.ownerId);
      this.emitMonsterAnimation('destroy', 'opponent', entry);
    }
    this.opponentHand.splice(handIndex, 1);
    plan.card.position = isSet ? 'defense' : 'attack';
    plan.card.isSetFaceDown = isSet;
    plan.card.turnSummoned = this.turnCount;
    this.field.setMonsterZone('opponent', plan.destination, plan.card);
    this.summons.consumeNormalSummon();
    this.callbacks.onAnimation({
      type: 'summon',
      target: 'opponent',
      card: plan.card,
      zoneIndex: plan.destination,
      position: plan.card.position
    });
    if (isSet) {
      this.log("L'adversaire pose un monstre face cachée.", 'opponent');
    } else {
      this.log(`L'adversaire invoque **${plan.card.name}** !`, 'opponent');
      await this.resolveSummonSuccessEvent(plan.card, 'opponent', {
        zoneType: 'main',
        zoneIndex: plan.destination
      }, { summonType: 'normal' });
    }
    this.stateChanged();
    return true;
  }

  async runAIMainPhase() {
    if (this.winner || this._duelEnded) return false;
    const profile = this.getAIDecisionProfile();
    this.log("L'adversaire réfléchit...", 'opponent');
    if (!(await this.delay(profile.thinkDelay))) return false;

    if (this.winner || this._duelEnded) return false;

    // AI activates Spell if possible
    const spellOptions = this.opponentHand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.card_type === 'spell' && this.canActivateSpell(card, 'opponent'));
    if (profile.valuesCardAdvantage) {
      spellOptions.sort((a, b) => this.scoreAISpell(b.card) - this.scoreAISpell(a.card));
    }
    const spellIdx = spellOptions[0]?.index ?? -1;
    if (spellIdx !== -1) {
      const emptySpellZone = this.opponentSpells.findIndex(s => s === null);
      if (emptySpellZone !== -1) {
        const card = this.opponentHand[spellIdx];
        const activationContext = await this.prepareSpellActivationContext(
          card,
          'opponent'
        );
        if (activationContext === null) return false;
        this.opponentHand.splice(spellIdx, 1);
        this.field.setSpellZone('opponent', emptySpellZone, card);

        this.log(`L'adversaire active la Carte Magie **${card.name}** !`, 'opponent');
        this.callbacks.onAnimation({ type: 'activate', target: 'opponent', card, zoneIndex: emptySpellZone });

        this.isResolvingAction = true;
        const link = this.chain.pushChainLink('opponent', card, [], {
          zoneIndex: emptySpellZone,
          context: {
            event: 'card-activation',
            wouldDestroy: String(card.id) === '12580477',
            ...activationContext
          }
        });
        this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });
        await this.openChainResponseWindow('player', {
          event: 'card-activation',
          sourceCard: card,
          wouldDestroy: String(card.id) === '12580477'
        });
        if (!(await this.delay(1000))) return false;
        await this.resolveChainStack();
        if (this.winner || this._duelEnded) return false;
        if (!(await this.delay(800))) return false;
      }
    }

    // AI sets Trap face-down
    const trapIdx = profile.setsTraps
      ? this.opponentHand.findIndex(c => c.card_type === 'trap')
      : -1;
    if (trapIdx !== -1) {
      const emptySpellZone = this.opponentSpells.findIndex(s => s === null);
      if (emptySpellZone !== -1) {
        const card = this.opponentHand[trapIdx];
        this.opponentHand.splice(trapIdx, 1);
        card.isSetFaceDown = true;
        card.turnSet = this.turnCount;
        this.field.setSpellZone('opponent', emptySpellZone, card);

        this.log(`L'adversaire pose une carte face cachée.`, 'opponent');
        this.callbacks.onAnimation({ type: 'activate', target: 'opponent', card, zoneIndex: emptySpellZone, faceDown: true });

        if (!(await this.delay(800))) return false;
      }
    }

    await this.tryAIPendulumActions(profile);
    if (this.winner || this._duelEnded) return false;

    // Shared transactional Normal/Tribute Summon path, including a full Main
    // Monster Zone whose destination is freed by one of the chosen Tributes.
    await this.tryAINormalSummon(profile);

    // Legacy fallback is retained for compatibility but is skipped whenever
    // the shared path consumed the once-per-turn Normal Summon.
    // AI Summon monster
    const monsters = this.opponentHand.filter(
      card => this.summons.canUseNormalSummonProcedure(card)
    );
    const emptyZone = this.opponentMonsters.findIndex(m => m === null);

    if (monsters.length > 0 && emptyZone !== -1 && this.summons.canNormalSummon()) {
      monsters.sort((a, b) => profile.valuesCardAdvantage
        ? b.getAtk() - a.getAtk()
        : a.getAtk() - b.getAtk());

      let card = null;
      let handIdx = -1;
      const currentCount = this.getMonsterEntries('opponent').length;

      for (const m of monsters) {
        let tributesNeeded = 0;
        if (m.level >= 7) tributesNeeded = 2;
        else if (m.level >= 5) tributesNeeded = 1;

        if (currentCount >= tributesNeeded) {
          card = m;
          handIdx = this.opponentHand.findIndex(c => c.uid === m.uid);

          if (tributesNeeded > 0) {
            this.log(`L'adversaire sacrifie ${tributesNeeded} monstre(s) pour invoquer **${m.name}** !`, 'system');
            const tributeCandidates = this.getMonsterEntries('opponent')
              .map(entry => ({ ...entry, monster: entry.card }));
            if (profile.preservesTributeValue) {
              tributeCandidates.sort((a, b) => a.monster.getAtk() - b.monster.getAtk());
            }
            let sacrificedCount = 0;
            for (const tribute of tributeCandidates) {
              if (sacrificedCount < tributesNeeded) {
                const sacrificed = tribute.monster;
                this.removeMonsterEntry('opponent', tribute);
                this.field.sendToGraveyard(sacrificed, sacrificed.ownerId);
                this.emitMonsterAnimation('destroy', 'opponent', tribute);
                sacrificedCount++;
              }
            }
            if (!(await this.delay(800))) return false;
          }
          break;
        }
      }

      if (!card) {
        const lowLvl = monsters.filter(c => c.level <= 4);
        if (lowLvl.length > 0) {
          card = lowLvl[0];
          handIdx = this.opponentHand.findIndex(c => c.uid === card.uid);
        }
      }

      if (card && handIdx !== -1) {
        this.opponentHand.splice(handIdx, 1);
        const strongestVisiblePlayerAtk = Math.max(
          0,
          ...this.getMonsterEntries('player', { faceUpOnly: true })
            .map(entry => entry.card.getAtk())
        );
        const isSet = profile.level === 'easy'
          ? false
          : profile.level === 'hard'
            ? card.getAtk() < strongestVisiblePlayerAtk && card.getDef() >= card.getAtk()
            : card.getDef() > card.getAtk() && Math.random() > 0.4;
        card.position = isSet ? 'defense' : 'attack';
        card.isSetFaceDown = isSet;
        card.turnSummoned = this.turnCount;

        this.field.setMonsterZone('opponent', emptyZone, card);
        this.summons.consumeNormalSummon();

        if (isSet) {
          this.log(`L'adversaire pose un monstre face cachée.`, 'opponent');
        } else {
          this.log(`L'adversaire invoque **${card.name}** !`, 'opponent');
        }

        this.callbacks.onAnimation({
          type: 'summon',
          target: 'opponent',
          card,
          zoneIndex: emptyZone,
          position: card.position
        });

        if (!isSet) {
          await this.resolveSummonSuccessEvent(card, 'opponent', {
            zoneType: 'main',
            zoneIndex: emptyZone
          }, { summonType: 'normal' });
        }

        if (!(await this.delay(1200))) return false;
      }
    }

    if (this.winner || this._duelEnded) return false;
    await this.tryAISynchroSummon(profile);
    if (this.winner || this._duelEnded) return false;
    await this.tryAIAdvancedExtraDeckSummon(profile);
    if (this.winner || this._duelEnded) return false;
    await this.tryAIMonsterEffects(4);
    if (this.winner || this._duelEnded) return false;
    await this.tryAIPositionChanges(5);
    if (this.winner || this._duelEnded) return false;

    if (!this.turn.isBattlePhaseLegal(this.turnCount)) {
      this.phases.currentPhase = 'end';
      this.startPhaseFlow();
      return true;
    }
    this.phases.currentPhase = 'battle';
    this.phases.setBattleStep('start');
    this.startPhaseFlow();
  }

  async runAIBattlePhase() {
    if (this.winner || this._duelEnded) return false;
    const generation = this._duelGeneration;
    const profile = this.getAIDecisionProfile();
    const aiMonsterEntries = this.getMonsterEntries('opponent');

    for (const originalAttackerEntry of aiMonsterEntries) {
      if (this.winner) break;

      const attackerEntry = this.getMonsterEntry('opponent', originalAttackerEntry);
      const attacker = attackerEntry?.card;
      if (!attacker || attacker.position === 'defense' || attacker.isSetFaceDown) continue;
      attacker.attacksDeclaredThisTurn += 1;
      this.markMonsterAttacked(attackerEntry);

      const hasPlayerMonsters = this.getMonsterEntries('player').length > 0;

      if (!hasPlayerMonsters) {
        attacker.directAttacksDeclaredThisTurn += 1;
        this.log(`L'adversaire déclare une attaque directe avec **${attacker.name}** !`, 'opponent');

        const declaration = await this.resolveAttackDeclarationEvent({
          attacker,
          attackerEntry,
          attackingSide: 'opponent'
        });
        if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
        if (declaration.attackNegated || !declaration.attackerStillValid) continue;

        if (!await this.resolveDirectAttackDamage(
          attacker,
          attackerEntry,
          'opponent',
          generation
        )) return false;
        if (!(await this.delay(800))) return false;
      } else {
        const targets = this.getMonsterEntries('player');

        let target = this.chooseAIAttackTarget(attacker, targets);
        if (!target) continue;
        const targetStat = target.card.isSetFaceDown
          ? null
          : (target.card.position === 'defense' ? target.card.getDef() : target.card.getAtk());
        if (
          targetStat !== null
          && attacker.getAtk() < targetStat
          && profile.avoidsLosingBattles
        ) continue;

        this.log(`L'adversaire attaque votre **${target.card.isSetFaceDown ? 'monstre caché' : target.card.name}** avec **${attacker.name}** !`, 'opponent');

        const declaration = await this.resolveAttackDeclarationEvent({
          attacker,
          attackerEntry,
          attackingSide: 'opponent',
          defender: target.card,
          defenderEntry: target
        });
        if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
        if (
          declaration.attackNegated
          || !declaration.attackerStillValid
        ) continue;
        if (declaration.replayRequired) {
          const replayTargets = this.getMonsterEntries('player');
          if (replayTargets.length === 0) {
            attacker.directAttacksDeclaredThisTurn += 1;
            this.log(
              `L'adversaire poursuit directement l'attaque de **${attacker.name}** après le replay !`,
              'opponent'
            );
            if (!await this.resolveDirectAttackDamage(
              attacker,
              attackerEntry,
              'opponent',
              generation
            )) return false;
            if (!(await this.delay(800))) return false;
            continue;
          }
          target = this.chooseAIAttackTarget(attacker, replayTargets);
          if (!target) continue;
          const replayTargetStat = target.card.isSetFaceDown
            ? null
            : (
              target.card.position === 'defense'
                ? target.card.getDef()
                : target.card.getAtk()
            );
          if (
            replayTargetStat !== null
            && attacker.getAtk() < replayTargetStat
            && profile.avoidsLosingBattles
          ) continue;
          this.log(
            `L'adversaire poursuit l'attaque de **${attacker.name}** sur **${target.card.isSetFaceDown ? 'votre monstre caché' : target.card.name}** après le replay.`,
            'opponent'
          );
        }

        this.phases.setBattleStep('damage_step');

        // 1. Start of Damage Step
        this.phases.setDamageStepSubPhase('start');
        if (!(await this.delay(200))) return false;

        // 2. Before Damage Calculation (Flip face-down defender)
        this.phases.setDamageStepSubPhase('before_calc');
        if (target.card.isSetFaceDown) {
          target.card.isSetFaceDown = false;
          this.log(`Le monstre caché est révélé : **${target.card.name}** !`, 'system');
          this.emitMonsterAnimation('flip-summon', 'player', target, { card: target.card });
          if (!(await this.delay(450))) return false;
        }

        this.callbacks.onAnimation({
          type: 'attack-monster',
          attackerSide: 'opponent',
          atkZoneIndex: attackerEntry.zoneIndex,
          atkZoneType: attackerEntry.zoneType,
          defZoneIndex: target.zoneIndex,
          defZoneType: target.zoneType
        });
        if (!(await this.delay(600))) return false;

        // 3. Damage Calculation
        this.phases.setDamageStepSubPhase('calc');
        const defender = target.card;
        const defenderEntry = target;

        let defDestroyed = false;
        let atkDestroyed = false;
        let pDamage = 0;
        let oDamage = 0;

        if (defender.position === 'attack' && attacker.getAtk() === 0 && defender.getAtk() === 0) {
          // Symmetric TCG ruling: two 0 ATK monsters do not destroy each other.
          defDestroyed = false;
          atkDestroyed = false;
        } else if (defender.position === 'defense') {
          if (attacker.atk > defender.getDef()) {
            defDestroyed = true;
          } else if (attacker.atk < defender.getDef()) {
            oDamage = defender.getDef() - attacker.atk;
          }
        } else {
          if (attacker.atk > defender.getAtk()) {
            defDestroyed = true;
            pDamage = attacker.atk - defender.getAtk();
          } else if (attacker.atk === defender.getAtk()) {
            defDestroyed = true;
            atkDestroyed = true;
          } else {
            atkDestroyed = true;
            oDamage = defender.getAtk() - attacker.atk;
          }
        }

        pDamage = await this.tryKuribohBattleDamage('player', pDamage, {
          directAttack: false,
          attackerUid: attacker.uid,
          attackerSide: 'opponent',
          defenderUid: defender.uid
        });
        if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;
        oDamage = await this.tryKuribohBattleDamage('opponent', oDamage, {
          directAttack: false,
          attackerUid: attacker.uid,
          attackerSide: 'opponent',
          defenderUid: defender.uid
        });
        if (!this.isDuelGenerationCurrent(generation) || this._duelEnded) return false;

        if (pDamage > 0) {
          this.playerLP = Math.max(0, this.playerLP - pDamage);
          this.callbacks.onAnimation({ type: 'lp-loss', target: 'player', damage: pDamage });
          this.log(`Vous perdez **${pDamage}** points de vie.`, 'danger');
        }
        if (oDamage > 0) {
          this.opponentLP = Math.max(0, this.opponentLP - oDamage);
          this.callbacks.onAnimation({ type: 'lp-loss', target: 'opponent', damage: oDamage });
          this.log(`L'adversaire perd **${oDamage}** points de vie.`, 'player');
        }

        // 4. After Damage Calculation
        this.phases.setDamageStepSubPhase('after_calc');
        if (!(await this.delay(200))) return false;

        // 5. End of Damage Step
        this.phases.setDamageStepSubPhase('end');
        if (defDestroyed) {
          this.removeMonsterEntry('player', defenderEntry);
          this.field.sendToGraveyard(defender, defender.ownerId);
          this.emitMonsterAnimation('destroy', 'player', defenderEntry);
        }
        if (atkDestroyed) {
          this.removeMonsterEntry('opponent', attackerEntry);
          this.field.sendToGraveyard(attacker, attacker.ownerId);
          this.emitMonsterAnimation('destroy', 'opponent', attackerEntry);
        }

        this.phases.setBattleStep('battle_step');

        if (this.playerLP === 0) this.endGame('opponent');
        else if (this.opponentLP === 0) this.endGame('player');

        if (!(await this.delay(1000))) return false;
      }
    }

    this.phases.currentPhase = 'end';
    this.startPhaseFlow();
  }
}
