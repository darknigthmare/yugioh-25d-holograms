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
      // Returning null delegates to the deterministic legal fallback.
      onDecision: () => null,
      onChainOpportunity: () => null,
      ...callbacks
    };

    this.field = new FieldState();
    this.chain = new ChainEngine();
    this.phases = new PhaseEngine();
    this.summons = new SummonEngine();
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
    this._endPhaseProcessedKey = null;
    this._duelEnded = false;
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
    const playerMonsters = this.playerMonsters.filter(Boolean).length;
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

    this.log(`L'adversaire prépare une Invocation Synchro de **${option.card.name}** !`, 'opponent');
    for (const material of option.materials) {
      const zoneIndex = this.opponentMonsters.indexOf(material);
      if (zoneIndex === -1) return false;
      this.field.setMonsterZone('opponent', zoneIndex, null);
      this.field.sendToGraveyard(material, material.ownerId);
      this.callbacks.onAnimation({ type: 'destroy', target: 'opponent', zoneIndex });
    }
    if (!(await this.delay(500))) return false;

    const extraIndex = this.opponentExtraDeck.indexOf(option.card);
    const destination = this.opponentMonsters.findIndex(monster => monster === null);
    if (extraIndex === -1 || destination === -1) return false;
    this.opponentExtraDeck.splice(extraIndex, 1);
    this.specialSummonCard(option.card, 'opponent', destination, {
      position: 'attack',
      summonType: 'synchro',
      properlySummoned: true
    });
    if (String(option.card.id) === '31924889') {
      option.card.addCounter('spell', 2);
    }
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

  async requestDecision(request, fallback = null) {
    try {
      const result = await this.callbacks.onDecision({
        ...request,
        rulesMode: this.rulesMode,
        turn: this.currentTurn,
        phase: this.currentPhase
      });
      if (result !== undefined && result !== null) return result;
    } catch (error) {
      this.log(`Décision UI ignorée : ${error.message}`, 'system');
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
    if (!card) return false;
    if (card.card_type !== 'monster') return true;
    return this.summons.canUseNormalSummonProcedure(card);
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
      if (!['fusion', 'synchro'].includes(card.extra_type)) {
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

  startDuel(playerDeck, opponentDeck, playerExtra, opponentExtra) {
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

    this.phases.currentTurnOwner = 'player';
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
      this.endGame(target === 'player' ? 'opponent' : 'player');
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

      if (!(await this.delay(600))) return false;

      // Starting player does not draw on Turn 1
      if (!this.turn.shouldDrawOnDrawPhase(this.turnCount, this.currentTurn === 'player')) {
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

    const canChangePosition = this.playerMonsters.some(m => m !== null);
    let canAttack = false;
    if (this.currentPhase === 'battle') {
      canAttack = this.playerMonsters.some((m, idx) => m !== null && m.position !== 'defense' && !this.attackedMonsters.has(idx));
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

  async toggleMonsterPosition(zoneIndex, target = 'player') {
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return;

    const card = this.field.getMonsterZone(target, zoneIndex);
    if (!card) return;

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
      || this.attackedMonsters.has(zoneIndex)
    ) {
      this.log("Règle TCG : un monstre qui a déclaré une attaque ne peut pas changer de position en Main Phase 2.", "danger");
      return;
    }

    if (card.isSetFaceDown) {
      card.isSetFaceDown = false;
      card.position = 'attack';
      card.hasChangedPositionThisTurn = true;
      this.log(`Vous Flipo-Invoquez **${card.name}** en Position d'Attaque !`, 'player');
      this.callbacks.onAnimation({ type: 'flip-summon', target, zoneIndex, card });
      await this.resolveTrapHoleOnSummon(target, zoneIndex);
    } else {
      card.position = card.position === 'defense' ? 'attack' : 'defense';
      card.hasChangedPositionThisTurn = true;
      this.log(`Vous changez la position de **${card.name}** en Position de ${card.position === 'defense' ? 'Défense' : 'Attaque'}.`, 'player');
      this.callbacks.onAnimation({ type: 'toggle-position', target, zoneIndex, position: card.position });
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
    if (this.field.getMonsterZone('player', zoneIndex) !== null) return false;

    let tributesRequired = 0;
    if (card.level >= 7) tributesRequired = 2;
    else if (card.level >= 5) tributesRequired = 1;

    if (tributesRequired > 0) {
      const activeMonsterCount = this.playerMonsters.filter(m => m !== null).length;
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
    await this.resolveTrapHoleOnSummon('player', zoneIndex);
    if (this.field.getMonsterZone('player', zoneIndex) === card) {
      await this.handleSuccessfulNormalSummon(card, 'player', zoneIndex);
    }
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
    if (this.field.getMonsterZone('player', zoneIndex) !== null) return false;

    let tributesRequired = 0;
    if (card.level >= 7) tributesRequired = 2;
    else if (card.level >= 5) tributesRequired = 1;

    if (tributesRequired > 0) {
      const activeMonsterCount = this.playerMonsters.filter(m => m !== null).length;
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

  async selectSummonTribute(tributeZoneIndex) {
    if (!this.pendingSummon || this.playerMonsters[tributeZoneIndex] === null) return;

    const list = this.pendingSummon.selectedTributeIndices;
    const existsIdx = list.indexOf(tributeZoneIndex);

    if (existsIdx !== -1) {
      list.splice(existsIdx, 1);
    } else {
      list.push(tributeZoneIndex);
    }

    this.callbacks.onAnimation({ type: 'tribute-selection-update', selectedIndices: [...list] });

    if (list.length === this.pendingSummon.tributesRequired) {
      this.isResolvingAction = true;
      const summonState = this.pendingSummon;
      this.pendingSummon = null;

      // Tribute selected monsters
      summonState.selectedTributeIndices.forEach(idx => {
        const sacrificed = this.field.getMonsterZone('player', idx);
        this.field.setMonsterZone('player', idx, null);
        this.field.sendToGraveyard(sacrificed, 'player');
        this.callbacks.onAnimation({ type: 'destroy', target: 'player', zoneIndex: idx });
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
        await this.resolveTrapHoleOnSummon('player', summonState.zoneIndex);
        if (this.field.getMonsterZone('player', summonState.zoneIndex) === card) {
          await this.handleSuccessfulNormalSummon(card, 'player', summonState.zoneIndex);
        }
      }

      this.isResolvingAction = false;
      this.stateChanged();
    }
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
      extraDeck: isPlayer ? this.playerExtraDeck : this.opponentExtraDeck
    };
  }

  getOpponentSide(side) {
    return side === 'player' ? 'opponent' : 'player';
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
    const uid = this.decisionUid(decision);
    return candidates.find(card => String(card.uid) === uid) || fallback;
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
    properlySummoned = false
  } = {}) {
    if (!card || this.winner) return false;
    const sideState = this.getSideState(side);
    const destination = zoneIndex ?? sideState.monsters.findIndex(monster => monster === null);
    if (destination < 0 || sideState.monsters[destination] !== null) return false;
    if (this.defense.isActionProhibited(side, 'SPECIAL_SUMMON', card)) return false;

    card.position = position;
    card.isSetFaceDown = false;
    card.turnSummoned = this.turnCount;
    card.summonType = summonType;
    card.wasProperlySpecialSummoned = card.wasProperlySpecialSummoned || properlySummoned;
    if (negateEffectsUntilEndTurn) {
      card.effectNegated = true;
      card.effectsNegatedUntilEndTurn = true;
    }
    this.field.setMonsterZone(side, destination, card);
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
      position
    });
    return destination;
  }

  async handleSuccessfulNormalSummon(card, side, zoneIndex) {
    if (!card || String(card.id) !== '63977008' || card.effectNegated) return false;
    const state = this.getSideState(side);
    const candidates = state.graveyard.filter(candidate => (
      candidate.card_type === 'monster'
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

    const link = this.chain.pushChainLink(side, card, [target], {
      context: { event: 'normal-summon-trigger' },
      resolver: async () => {
        const currentIndex = state.graveyard.indexOf(target);
        const emptyZone = state.monsters.findIndex(monster => monster === null);
        if (currentIndex === -1 || emptyZone === -1) return false;
        state.graveyard.splice(currentIndex, 1);
        const summonedZone = this.specialSummonCard(target, side, emptyZone, {
          position: 'defense',
          summonType: 'junk-synchron',
          negateEffectsUntilEndTurn: true
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
    await this.openChainResponseWindow(this.getOpponentSide(side), {
      event: 'monster-effect',
      sourceCard: card
    });
    await this.resolveChainStack();
    return true;
  }

  getFusionMaterialSelection(extraCard, side) {
    const state = this.getSideState(side);
    const pool = [
      ...state.hand.filter(card => card.card_type === 'monster'),
      // Polymerization may use monsters controlled by its player even when
      // they are face-down. This differs from Synchro/Xyz material rules.
      ...state.monsters.filter(card => card)
    ];
    const requiredIds = extraCard.fusionMaterials?.length
      ? extraCard.fusionMaterials.map(String)
      : (String(extraCard.id) === '23995346'
        ? ['89631139', '89631139', '89631139']
        : []);
    const selected = [];
    const used = new Set();
    for (const requiredId of requiredIds) {
      const match = pool.find(card => String(card.id) === requiredId && !used.has(card.uid));
      if (!match) return null;
      used.add(match.uid);
      selected.push(match);
    }
    return selected;
  }

  getFusionOptions(side) {
    const state = this.getSideState(side);
    return state.extraDeck
      .filter(card => card.extra_type === 'fusion')
      .map(card => ({ card, materials: this.getFusionMaterialSelection(card, side) }))
      .filter(option => {
        if (!option.materials?.length) return false;
        const hasOpenZone = state.monsters.some(monster => monster === null);
        const freesZone = option.materials.some(material => material.location === 'monster_zone');
        return hasOpenZone || freesZone;
      });
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
    const option = options.find(candidate => candidate.card === selectedCard) || requested || options[0];
    if (!option) return false;

    const materialDecision = await this.requestDecision({
      type: 'select-fusion-materials',
      side,
      fusionMonster: {
        uid: option.card.uid,
        id: option.card.id,
        name: option.card.name
      },
      requiredIds: [...option.card.fusionMaterials],
      candidates: option.materials.map(card => ({
        uid: card.uid,
        id: card.id,
        name: card.name,
        location: card.location
      }))
    }, option.materials.map(card => card.uid));
    const decidedUids = Array.isArray(materialDecision)
      ? materialDecision.map(value => this.decisionUid(value)).filter(Boolean)
      : [];
    const selectedMaterials = decidedUids.length
      ? decidedUids.map(uid => option.materials.find(card => card.uid === uid)).filter(Boolean)
      : option.materials;

    const requirements = [...option.card.fusionMaterials].map(String).sort();
    const supplied = selectedMaterials.map(card => String(card.id)).sort();
    if (
      selectedMaterials.length !== option.materials.length
      || requirements.some((id, index) => supplied[index] !== id)
    ) {
      this.log("Matériels de Fusion invalides : l'Invocation est annulée.", 'danger');
      return false;
    }

    for (const material of selectedMaterials) {
      if (material.location === 'hand') {
        const handIndex = state.hand.indexOf(material);
        if (handIndex === -1) return false;
        state.hand.splice(handIndex, 1);
      } else if (material.location === 'monster_zone') {
        const fieldCard = this.field.getMonsterZone(side, material.zoneIndex);
        if (fieldCard !== material) return false;
        this.field.setMonsterZone(side, material.zoneIndex, null);
        this.callbacks.onAnimation({
          type: 'destroy',
          target: side,
          zoneIndex: material.zoneIndex
        });
      } else {
        return false;
      }
      this.field.sendToGraveyard(material, material.ownerId);
    }

    const emptyZone = state.monsters.findIndex(monster => monster === null);
    const extraIndex = state.extraDeck.indexOf(option.card);
    if (emptyZone === -1 || extraIndex === -1) return false;
    state.extraDeck.splice(extraIndex, 1);
    this.specialSummonCard(option.card, side, emptyZone, {
      position: 'attack',
      summonType: 'fusion',
      properlySummoned: true
    });
    this.log(`Invocation Fusion de **${option.card.name}** avec Polymérisation !`, side);
    return true;
  }

  canActivateSpell(card, side) {
    if (!card || card.card_type !== 'spell') return false;
    const state = this.getSideState(side);
    const opponentState = this.getSideState(this.getOpponentSide(side));
    if (String(card.id) === '55144522') return state.deck.length >= 2 || this.rulesMode === 'sandbox';
    if (String(card.id) === '12580477') return opponentState.monsters.some(Boolean);
    if (String(card.id) === '83764718') {
      return state.monsters.some(monster => monster === null)
        && [...this.playerGraveyard, ...this.opponentGraveyard].some(
          monster => this.canSpecialSummonFromGrave(monster)
        );
    }
    if (String(card.id) === '24094653') return this.getFusionOptions(side).length > 0;
    return this.rulesMode === 'sandbox';
  }

  async playSpellTrap(handCardUid, zoneIndex) {
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
        wouldDestroy: String(card.id) === '12580477'
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });

    await this.openChainResponseWindow('opponent', {
      event: 'card-activation',
      sourceCard: card
    });
    if (!(await this.delay(1200))) return false;

    // Resolve LIFO chain stack
    await this.resolveChainStack();
    return true;
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

    card.isSetFaceDown = false;
    this.log(`Vous activez la Carte face cachée **${card.name}** !`, 'player');
    this.callbacks.onAnimation({ type: 'activate', target: 'player', card, zoneIndex });

    this.isResolvingAction = true;

    // Add to stack using ChainEngine
    const link = this.chain.pushChainLink('player', card, [], {
      zoneIndex,
      context: {
        event: 'card-activation',
        wouldDestroy: String(card.id) === '12580477'
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });

    await this.openChainResponseWindow('opponent', {
      event: 'card-activation',
      sourceCard: card
    });
    if (!(await this.delay(1200))) return false;

    // Resolve LIFO chain stack
    await this.resolveChainStack();
    return true;
  }

  getLegalChainCandidates(side, context = {}) {
    const state = this.getSideState(side);
    const lastSpeed = this.chain.getLastLinkSpeed();
    const candidates = [];

    state.spells.forEach((card, zoneIndex) => {
      if (!card || !card.isSetFaceDown || card.turnSet >= this.turnCount) return;
      // Trigger-specific local Traps are offered by their event handlers.
      if (card.card_type === 'trap' || !card.type?.includes('Quick-Play')) return;
      if (!this.chain.canChain(card, lastSpeed)) return;
      candidates.push({ card, zoneIndex, source: 'field' });
    });

    if (context.wouldDestroy) {
      state.monsters.forEach((card, zoneIndex) => {
        if (
          card
          && String(card.id) === '44508094'
          && !card.isSetFaceDown
          && !card.effectNegated
          && this.chain.canChain(card, lastSpeed)
        ) {
          candidates.push({ card, zoneIndex, source: 'monster' });
        }
      });
    }
    return candidates;
  }

  async openChainResponseWindow(startingSide, context = {}) {
    if (!this.chain.chainStack.length) return false;
    this.chain.openResponseWindow(startingSide);
    let side = startingSide;

    while (this.chain.chainStatus === 'building') {
      const candidates = this.getLegalChainCandidates(side, context);
      let decision = null;
      try {
        decision = await this.callbacks.onChainOpportunity({
          side,
          context,
          lastLink: this.chain.getLastLink(),
          candidates: candidates.map(candidate => ({
            cardUid: candidate.card.uid,
            id: candidate.card.id,
            name: candidate.card.name,
            zoneIndex: candidate.zoneIndex,
            source: candidate.source
          }))
        });
      } catch (error) {
        this.log(`Fenêtre de chaîne ignorée : ${error.message}`, 'system');
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
        await this.addStardustResponse(selected.card, side, selected.zoneIndex, this.chain.getLastLink());
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

  async addStardustResponse(stardust, side, zoneIndex, targetLink) {
    if (!stardust || !targetLink || stardust.location !== 'monster_zone') return false;

    // Tributing Stardust is the activation cost, before priority passes again.
    this.field.setMonsterZone(side, zoneIndex, null);
    this.field.sendToGraveyard(stardust, stardust.ownerId);
    stardust.stardustReturnEligibleTurn = this.turnCount;
    stardust.stardustReturnController = side;
    this.callbacks.onAnimation({ type: 'destroy', target: side, zoneIndex });

    const link = this.chain.pushChainLink(side, stardust, [targetLink.sourceCard], {
      context: { event: 'stardust-negation', targetLinkId: targetLink.id },
      resolver: async () => {
        targetLink.activationNegated = true;
        this.defense.negateChainLink(targetLink.id);
        this.removeCardFromCurrentZone(targetLink.sourceCard);
        this.log(`**${stardust.name}** annule l'activation de **${targetLink.sourceCard.name}** et la détruit.`, side);
        return true;
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card: stardust });
    return true;
  }

  async offerAutomaticStardustResponse(targetLink) {
    if (!targetLink?.context?.wouldDestroy || targetLink.context.stardustWindowChecked) return false;
    targetLink.context.stardustWindowChecked = true;
    const priorityOrder = [
      this.getOpponentSide(targetLink.activatingPlayerId),
      targetLink.activatingPlayerId
    ];

    for (const side of priorityOrder) {
      const state = this.getSideState(side);
      const zoneIndex = state.monsters.findIndex(card => (
        card
        && String(card.id) === '44508094'
        && !card.isSetFaceDown
        && !card.effectNegated
      ));
      if (zoneIndex === -1) continue;
      const stardust = state.monsters[zoneIndex];
      const activate = await this.requestDecision({
        type: 'activate-monster-effect',
        effect: 'stardust-negate-destruction',
        side,
        card: { uid: stardust.uid, id: stardust.id, name: stardust.name },
        threatenedBy: {
          uid: targetLink.sourceCard.uid,
          id: targetLink.sourceCard.id,
          name: targetLink.sourceCard.name
        },
        optional: true
      }, true);
      if (activate) {
        return this.addStardustResponse(stardust, side, zoneIndex, targetLink);
      }
    }
    return false;
  }

  removeCardFromCurrentZone(card) {
    if (!card) return false;
    const side = card.controllerId;
    if (card.location === 'monster_zone') {
      const current = this.field.getMonsterZone(side, card.zoneIndex);
      if (current === card) this.field.setMonsterZone(side, card.zoneIndex, null);
    } else if (card.location === 'spell_zone') {
      const current = this.field.getSpellZone(side, card.zoneIndex);
      if (current === card) this.field.setSpellZone(side, card.zoneIndex, null);
    } else {
      return false;
    }
    this.field.sendToGraveyard(card, card.ownerId);
    return true;
  }

  async resolveChainStack() {
    this.log(`Résolution de la chaîne (LIFO)...`, 'system');

    this.chain.chainStatus = 'resolving';
    while (this.chain.chainStack.length > 0) {
      const pendingLink = this.chain.getLastLink();
      if (await this.offerAutomaticStardustResponse(pendingLink)) {
        continue;
      }
      const link = this.chain.chainStack.pop();
      this.log(`Chain Link ${link.id} : Effet de **${link.sourceCard.name}** se résout !`, 'system');

      this.callbacks.onAnimation({ type: 'chain-resolve', linkNumber: link.id, card: link.sourceCard });

      if (link.activationNegated || this.defense.isChainLinkNegated(link.id)) {
        this.log(`Chain Link ${link.id} : activation annulée.`, 'system');
        if (link.sourceCard.location === 'spell_zone') {
          this.removeCardFromCurrentZone(link.sourceCard);
        }
      } else if (link.effectNegated || link.sourceCard.effectNegated) {
        this.log(`Chain Link ${link.id} : effet annulé.`, 'system');
        if (link.sourceCard.location === 'spell_zone') {
          this.removeCardFromCurrentZone(link.sourceCard);
        }
      } else if (link.resolver) {
        link.resolvedSuccessfully = Boolean(await link.resolver(link, this));
      } else {
        await this.executeSpellTrapResolution(link.sourceCard, link.activatingPlayerId, link.zoneIndex);
        link.resolvedSuccessfully = true;
      }
      if (!(await this.delay(1000))) return false;
    }

    this.chain.reset();
    this.isResolvingAction = false;
    this.stateChanged();
  }

  async executeSpellTrapResolution(card, user, zoneIndex) {
    const isPlayer = user === 'player';
    const myMonsters = isPlayer ? this.playerMonsters : this.opponentMonsters;
    const opponentMonsters = isPlayer ? this.opponentMonsters : this.playerMonsters;
    const myGraveyard = isPlayer ? this.playerGraveyard : this.opponentGraveyard;
    const opponentGraveyard = isPlayer ? this.opponentGraveyard : this.playerGraveyard;

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

      for (let i = 0; i < 5; i++) {
        if (opponentMonsters[i] !== null) {
          const targetCard = opponentMonsters[i];
          opponentMonsters[i] = null;
          this.field.sendToGraveyard(targetCard, targetCard.ownerId);
          this.callbacks.onAnimation({ type: 'destroy', target: isPlayer ? 'opponent' : 'player', zoneIndex: i });
        }
      }
    }
    else if (card.id === '83764718') {
      const allGraveyard = [
        ...this.playerGraveyard.map(c => ({card: c, owner: 'player'})),
        ...this.opponentGraveyard.map(c => ({card: c, owner: 'opponent'}))
      ];
      const monstersInGrave = allGraveyard.filter(item => (
        item.card.card_type === 'monster'
        && this.canSpecialSummonFromGrave(item.card)
      ));

      if (monstersInGrave.length === 0) {
        this.log("Aucun monstre dans les cimetières.", "system");
      } else {
        const chosenCard = await this.chooseCard(
          'select-monster-reborn-target',
          user,
          monstersInGrave.map(item => item.card),
          cards => [...cards].sort((a, b) => b.getAtk() - a.getAtk())[0]
        );
        const choice = monstersInGrave.find(item => item.card === chosenCard) || monstersInGrave[0];

        const emptyZoneIdx = myMonsters.findIndex(m => m === null);
        if (emptyZoneIdx !== -1) {
          // Remove from the original Graveyard only after a destination exists.
          if (choice.owner === 'player') {
            const idx = this.playerGraveyard.indexOf(choice.card);
            this.playerGraveyard.splice(idx, 1);
          } else {
            const idx = this.opponentGraveyard.indexOf(choice.card);
            this.opponentGraveyard.splice(idx, 1);
          }

          this.callbacks.onAnimation({
            type: 'reborn-cinematic',
            target: user,
            zoneIndex: emptyZoneIdx,
            card: choice.card
          });

          if (!(await this.delay(1200))) return false;

          this.specialSummonCard(choice.card, user, emptyZoneIdx, {
            position: 'attack',
            summonType: 'monster-reborn'
          });

          this.log(`Monster Reborn ressuscite **${choice.card.name}** !`, 'system');
          this.callbacks.onAnimation({ type: 'summon', target: user, card: choice.card, zoneIndex: emptyZoneIdx, position: 'attack' });
        } else {
          this.log("Aucune Zone Monstre libre pour résoudre Monster Reborn.", "danger");
        }
      }
    } else if (String(card.id) === '24094653') {
      const requestedUid = this.pendingFusionTargets[user];
      this.pendingFusionTargets[user] = null;
      await this.performFusionSummon(user, requestedUid);
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
      monsterEffects: ownTurn && inMain ? state.monsters
        .map((card, zoneIndex) => ({ card, zoneIndex }))
        .filter(({ card }) => (
          card
          && !card.isSetFaceDown
          && !card.effectNegated
          && (
            (String(card.id) === '71625222' && card.effectUsage.timeWizardTurn !== this.turnCount)
            || (String(card.id) === '31924889' && (card.counters.spell || 0) > 0)
          )
        ))
        .map(({ card, zoneIndex }) => ({
          zoneIndex,
          cardUid: card.uid,
          effect: String(card.id) === '71625222' ? 'time-wizard' : 'arcanite-destroy'
        })) : [],
      fusionExtraUids: ownTurn && inMain
        ? this.getFusionOptions(side).map(option => option.card.uid)
        : [],
      synchroExtraUids: ownTurn && inMain ? state.extraDeck
        .filter(card => card.extra_type === 'synchro')
        .filter(card => this.canAutoSynchroSummon(card, side))
        .map(card => card.uid) : []
    };
  }

  async activateMonsterEffect(zoneIndex, side = 'player') {
    if (this.winner || this.isResolvingAction) return false;
    if (this.currentTurn !== side || !this.currentPhase.startsWith('main')) return false;
    const card = this.field.getMonsterZone(side, zoneIndex);
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
          const call = typeof coinDecision === 'object'
            ? (coinDecision.call || 'heads')
            : coinDecision;
          const result = typeof coinDecision === 'object' && coinDecision.result
            ? coinDecision.result
            : (Math.random() < 0.5 ? 'heads' : 'tails');
          const won = call === result;
          const destroyedSide = won ? this.getOpponentSide(side) : side;
          const destroyedState = this.getSideState(destroyedSide);
          const targets = destroyedState.monsters.filter(Boolean);
          const totalOriginalAtk = targets.reduce(
            (total, target) => total + Math.max(0, target.baseAtk || 0),
            0
          );
          for (let index = 0; index < destroyedState.monsters.length; index += 1) {
            const target = destroyedState.monsters[index];
            if (!target) continue;
            this.field.setMonsterZone(destroyedSide, index, null);
            this.field.sendToGraveyard(target, target.ownerId);
            this.callbacks.onAnimation({ type: 'destroy', target: destroyedSide, zoneIndex: index });
          }
          // Current TCG text inflicts half the destroyed original ATK only
          // when the coin call is wrong; a correct call deals no effect damage.
          if (!won) {
            this.applyEffectDamage(side, Math.floor(totalOriginalAtk / 2));
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
      await this.resolveChainStack();
      return true;
    }

    if (String(card.id) === '31924889') {
      if ((card.counters.spell || 0) < 1) return false;
      const opponentSide = this.getOpponentSide(side);
      const opponent = this.getSideState(opponentSide);
      const targets = [
        ...opponent.monsters.filter(Boolean),
        ...opponent.spells.filter(Boolean)
      ];
      if (!targets.length) return false;
      const target = await this.chooseCard(
        'select-arcanite-target',
        side,
        targets,
        cards => [...cards].sort((a, b) => (
          (b.getAtk ? b.getAtk() : 0) - (a.getAtk ? a.getAtk() : 0)
        ))[0]
      );
      if (!target) return false;

      // Removing a Spell Counter is the activation cost.
      card.removeCounter('spell', 1);
      this.isResolvingAction = true;
      const link = this.chain.pushChainLink(side, card, [target], {
        context: { event: 'monster-effect', wouldDestroy: true },
        resolver: async () => {
          const destroyed = this.removeCardFromCurrentZone(target);
          if (destroyed) {
            this.callbacks.onAnimation({
              type: 'destroy',
              target: opponentSide,
              zoneIndex: target.zoneIndex
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
      await this.resolveChainStack();
      return true;
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
    let returned = 0;
    for (const side of ['player', 'opponent']) {
      const state = this.getSideState(side);
      const candidates = state.graveyard.filter(card => (
        String(card.id) === '44508094'
        && card.stardustReturnEligibleTurn === this.turnCount
        && card.stardustReturnController === side
      ));
      for (const stardust of candidates) {
        const emptyZone = state.monsters.findIndex(card => card === null);
        if (emptyZone === -1) continue;
        const activate = await this.requestDecision({
          type: 'activate-graveyard-effect',
          effect: 'stardust-end-phase-return',
          side,
          card: { uid: stardust.uid, id: stardust.id, name: stardust.name },
          optional: false
        }, true);
        if (!activate) continue;
        const graveIndex = state.graveyard.indexOf(stardust);
        if (graveIndex === -1) continue;
        state.graveyard.splice(graveIndex, 1);
        stardust.stardustReturnEligibleTurn = -1;
        stardust.stardustReturnController = null;
        if (this.specialSummonCard(stardust, side, emptyZone, {
          position: 'attack',
          summonType: 'stardust-return'
        }) === false) {
          state.graveyard.push(stardust);
          continue;
        }
        this.log(`Durant la End Phase, **${stardust.name}** revient du Cimetière.`, side);
        returned += 1;
      }
    }
    this.defense.clearTurnRestrictions();
    this.effects.expireLingeringEffects('turn_end');
    this.stateChanged();
    return returned;
  }

  async tryKuribohBattleDamage(side, damage, context = {}) {
    if (!damage || damage <= 0) return damage;
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
    await this.resolveChainStack();
    return prevented ? 0 : damage;
  }

  async resolveTrapHoleOnSummon(summoningSide, zoneIndex) {
    const summonedCard = this.field.getMonsterZone(summoningSide, zoneIndex);
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
    if (!activate) return false;

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
      context: { event: 'summon-response', wouldDestroy: true },
      resolver: async () => {
        if (this.field.getMonsterZone(summoningSide, zoneIndex) === summonedCard) {
          this.field.setMonsterZone(summoningSide, zoneIndex, null);
          this.field.sendToGraveyard(summonedCard, summonedCard.ownerId);
          this.callbacks.onAnimation({ type: 'destroy', target: summoningSide, zoneIndex });
        }
        if (this.field.getSpellZone(defendingSide, trapIndex) === trapCard) {
          this.field.setSpellZone(defendingSide, trapIndex, null);
          this.field.sendToGraveyard(trapCard, trapCard.ownerId);
          this.callbacks.onAnimation({ type: 'clear-spell', target: defendingSide, zoneIndex: trapIndex });
        }
        return true;
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card: trapCard });
    await this.openChainResponseWindow(summoningSide, {
      event: 'summon-response',
      wouldDestroy: true,
      sourceCard: trapCard
    });
    if (!(await this.delay(500))) return false;
    await this.resolveChainStack();
    return true;
  }

  async resolveMirrorForceOnAttack(defendingSide, attackerZoneIndex) {
    const defendingSpells = defendingSide === 'player' ? this.playerSpells : this.opponentSpells;
    const trapIndex = defendingSpells.findIndex(
      card => card
        && card.id === '44095762'
        && card.isSetFaceDown
        && card.turnSet < this.turnCount
    );

    if (trapIndex === -1) return false;

    const attackingSide = defendingSide === 'player' ? 'opponent' : 'player';
    const attackingMonsters = attackingSide === 'player' ? this.playerMonsters : this.opponentMonsters;
    const trapCard = defendingSpells[trapIndex];
    const activate = await this.requestDecision({
      type: 'activate-trap',
      effect: 'mirror-force',
      side: defendingSide,
      card: { uid: trapCard.uid, id: trapCard.id, name: trapCard.name },
      optional: true
    }, true);
    if (!activate) return false;

    this.log(
      `${defendingSide === 'player' ? 'Vous activez' : "L'adversaire active"} **Force de Miroir** à la déclaration d'attaque !`,
      defendingSide
    );
    this.callbacks.onAnimation({
      type: 'mirror-force-cinematic',
      target: defendingSide,
      zoneIndex: trapIndex,
      atkZoneIndex: attackerZoneIndex
    });

    trapCard.isSetFaceDown = false;
    const link = this.chain.pushChainLink(defendingSide, trapCard, [], {
      zoneIndex: trapIndex,
      context: { event: 'attack-response', wouldDestroy: true },
      resolver: async () => {
        for (let i = 0; i < attackingMonsters.length; i++) {
          const monster = attackingMonsters[i];
          if (monster && monster.position === 'attack') {
            this.field.setMonsterZone(attackingSide, i, null);
            this.field.sendToGraveyard(monster, monster.ownerId);
            this.callbacks.onAnimation({ type: 'destroy', target: attackingSide, zoneIndex: i });
          }
        }
        if (this.field.getSpellZone(defendingSide, trapIndex) === trapCard) {
          this.field.setSpellZone(defendingSide, trapIndex, null);
          this.field.sendToGraveyard(trapCard, trapCard.ownerId);
          this.callbacks.onAnimation({ type: 'clear-spell', target: defendingSide, zoneIndex: trapIndex });
        }
        return true;
      }
    });
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card: trapCard });
    await this.openChainResponseWindow(attackingSide, {
      event: 'attack-response',
      wouldDestroy: true,
      sourceCard: trapCard
    });
    if (!(await this.delay(900))) return false;
    await this.resolveChainStack();
    return true;
  }

  /**
   * Combat flow incorporating the 5 Damage Step sub-phases
   */
  async executeAttack(atkIndex, defIndex) {
    const attacker = this.field.getMonsterZone('player', atkIndex);
    const defender = defIndex !== undefined && defIndex !== null ? this.field.getMonsterZone('opponent', defIndex) : null;

    // --- 1. ATTACK LEGALITY CHECKS ---
    const legality = {
      attackerExists: !!attacker,
      attackerIsFaceUp: attacker ? !attacker.isSetFaceDown : false,
      attackerIsInAttackPosition: attacker ? attacker.position === 'attack' : false,
      attackerCanAttack: attacker ? !this.attackedMonsters.has(atkIndex) : false,
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

    const hasOpponentMonsters = this.opponentMonsters.some(m => m !== null);

    if (!hasOpponentMonsters) {
      // Direct Attack!
      this.attackedMonsters.add(atkIndex);
      attacker.directAttacksDeclaredThisTurn += 1;
      this.log(`**${attacker.name}** déclare une attaque directe !`, 'player');

      if (await this.resolveMirrorForceOnAttack('opponent', atkIndex)) {
        this.isResolvingAction = false;
        this.phases.setBattleStep('battle_step');
        return;
      }

      this.callbacks.onAnimation({
        type: 'attack-direct',
        target: 'opponent',
        atkZoneIndex: atkIndex,
        card: attacker
      });

      if (!(await this.delay(600))) return false;

      const directDamage = await this.tryKuribohBattleDamage('opponent', attacker.getAtk(), {
        directAttack: true,
        attackerUid: attacker.uid
      });
      this.opponentLP = Math.max(0, this.opponentLP - directDamage);
      this.log(`Attaque Directe ! L'adversaire subit **${directDamage}** points de dommages !`, 'danger');
      if (directDamage > 0) {
        this.callbacks.onAnimation({ type: 'lp-loss', target: 'opponent', damage: directDamage });
      }

      if (this.opponentLP === 0) {
        this.endGame('player');
      }
    } else {
      if (defIndex === undefined || defIndex === null || !defender) {
        this.log("Sélectionnez une cible valide !", "system");
        this.isResolvingAction = false;
        return;
      }

      this.attackedMonsters.add(atkIndex);
      this.log(`**${attacker.name}** déclare une attaque sur **${defender.isSetFaceDown ? 'le monstre caché' : defender.name}** !`, 'player');

      if (await this.resolveMirrorForceOnAttack('opponent', atkIndex)) {
        this.isResolvingAction = false;
        this.phases.setBattleStep('battle_step');
        return;
      }

      // --- 2. BATTLE REPLAY CHECK ---
      // If the number of opponent monsters changed during battle declarations (simulate dynamic ruling)
      const opponentMonsterCount = this.opponentMonsters.filter(m => m !== null).length;
      let targetDefender = defender;
      let targetDefIndex = defIndex;

      // --- 3. DAMAGE STEP SUB-PHASES ---
      this.phases.setBattleStep('damage_step');

      // Step 1: Start of Damage Step
      this.phases.setDamageStepSubPhase('start');
      this.log("[Damage Step] Étape 1 : Début de la Damage Step", "system");

      // Check if target participants still exist
      if (!targetDefender || targetDefender.location !== 'monster_zone') {
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
          zoneIndex: targetDefIndex,
          card: targetDefender
        });
        if (!(await this.delay(450))) return false;
      }

      // Attack project visual animation
      this.callbacks.onAnimation({
        type: 'attack-monster',
        attackerSide: 'player',
        atkZoneIndex: atkIndex,
        defZoneIndex: targetDefIndex
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
        defenderUid: targetDefender.uid
      });
      oDamage = await this.tryKuribohBattleDamage('opponent', oDamage, {
        directAttack: false,
        attackerUid: attacker.uid,
        defenderUid: targetDefender.uid
      });

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
        this.field.setMonsterZone('opponent', targetDefIndex, null);
        this.field.sendToGraveyard(targetDefender, targetDefender.ownerId);
        this.callbacks.onAnimation({ type: 'destroy', target: 'opponent', zoneIndex: targetDefIndex });
        attacker.monstersDestroyedByBattleThisTurn += 1;
      }
      if (attackerDestroyed && attacker.pendingBattleDestruction) {
        this.field.setMonsterZone('player', atkIndex, null);
        this.field.sendToGraveyard(attacker, attacker.ownerId);
        this.callbacks.onAnimation({ type: 'destroy', target: 'player', zoneIndex: atkIndex });
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
    const materials = this.getSideState(side).monsters.filter(card => card && !card.isSetFaceDown);
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

  async summonExtraDeck(extraCardUid) {
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return false;

    const extraCardIdx = this.playerExtraDeck.findIndex(c => c.uid === extraCardUid);
    if (extraCardIdx === -1) return false;

    const extraCard = this.playerExtraDeck[extraCardIdx];

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
      const activeMonsterCount = this.playerMonsters.filter(m => m !== null).length;
      if (activeMonsterCount < 2) {
        this.log("Une Invocation Synchro requiert au moins 2 monstres sur le terrain !", "danger");
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

  async selectSynchroMaterial(zoneIndex) {
    if (!this.pendingExtraSummon || this.playerMonsters[zoneIndex] === null) return;

    const list = this.pendingExtraSummon.selectedMaterialIndices;
    const existsIdx = list.indexOf(zoneIndex);

    if (existsIdx !== -1) {
      list.splice(existsIdx, 1);
    } else {
      list.push(zoneIndex);
    }

    let currentSum = 0;
    list.forEach(idx => {
      if (this.playerMonsters[idx]) {
        currentSum += this.playerMonsters[idx].getLevel();
      }
    });

    this.log(`Sélection Synchro : Somme actuelle = ${currentSum} / ${this.pendingExtraSummon.targetLevel}`, 'system');
    this.callbacks.onAnimation({ type: 'tribute-selection-update', selectedIndices: [...list] });

    if (currentSum === this.pendingExtraSummon.targetLevel) {
      const selectedMaterials = list
        .map(idx => this.playerMonsters[idx])
        .filter(Boolean);

      if (!this.summons.validateSynchroSummon(
        selectedMaterials,
        this.pendingExtraSummon.targetLevel,
        this.pendingExtraSummon.extraCard
      )) {
        this.log("Invocation Synchro invalide : sélectionnez exactement 1 Syntoniseur et au moins 1 non-Syntoniseur.", "danger");
        this.stateChanged();
        return;
      }

      this.isResolvingAction = true;
      const synchroState = this.pendingExtraSummon;
      this.pendingExtraSummon = null;

      this.log("Accord Synchro ! Envoi des matériels au Cimetière !", "system");

      synchroState.selectedMaterialIndices.forEach(idx => {
        const mat = this.playerMonsters[idx];
        this.field.setMonsterZone('player', idx, null);
        this.field.sendToGraveyard(mat, mat.ownerId);
        this.callbacks.onAnimation({ type: 'destroy', target: 'player', zoneIndex: idx });
      });

      if (!(await this.delay(600))) return false;

      const emptyZoneIdx = this.playerMonsters.findIndex(m => m === null);
      if (emptyZoneIdx !== -1) {
        const card = synchroState.extraCard;
        this.playerExtraDeck.splice(synchroState.extraCardIdx, 1);
        this.specialSummonCard(card, 'player', emptyZoneIdx, {
          position: 'attack',
          summonType: 'synchro',
          properlySummoned: true
        });
        if (String(card.id) === '31924889') {
          card.addCounter('spell', 2);
        }

        this.log(`Invocation Synchro ! Incarnez le légendaire **${card.name}** !`, 'player');
      }

      this.isResolvingAction = false;
      this.stateChanged();
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

  endGame(winner) {
    if (this.winner) return false;
    this.winner = winner;
    this._duelEnded = true;
    this.isResolvingAction = false;
    this.pendingSummon = null;
    this.pendingExtraSummon = null;
    this.isDiscarding = false;
    this.cancelPendingAsyncWork();
    this.log(`LE DUEL EST FINI ! Vainqueur : ${winner === 'player' ? 'Joueur (Vous)' : 'Adversaire (IA)'}`, 'duel-end');
    this.callbacks.onGameOver(winner);
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
        this.opponentHand.splice(spellIdx, 1);
        this.field.setSpellZone('opponent', emptySpellZone, card);

        this.log(`L'adversaire active la Carte Magie **${card.name}** !`, 'opponent');
        this.callbacks.onAnimation({ type: 'activate', target: 'opponent', card, zoneIndex: emptySpellZone });

        this.isResolvingAction = true;
        const link = this.chain.pushChainLink('opponent', card, [], {
          zoneIndex: emptySpellZone,
          context: {
            event: 'card-activation',
            wouldDestroy: String(card.id) === '12580477'
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
      const currentCount = this.opponentMonsters.filter(m => m !== null).length;

      for (const m of monsters) {
        let tributesNeeded = 0;
        if (m.level >= 7) tributesNeeded = 2;
        else if (m.level >= 5) tributesNeeded = 1;

        if (currentCount >= tributesNeeded) {
          card = m;
          handIdx = this.opponentHand.findIndex(c => c.uid === m.uid);

          if (tributesNeeded > 0) {
            this.log(`L'adversaire sacrifie ${tributesNeeded} monstre(s) pour invoquer **${m.name}** !`, 'system');
            const tributeCandidates = this.opponentMonsters
              .map((monster, zoneIndex) => ({ monster, zoneIndex }))
              .filter(({ monster }) => monster !== null);
            if (profile.preservesTributeValue) {
              tributeCandidates.sort((a, b) => a.monster.getAtk() - b.monster.getAtk());
            }
            let sacrificedCount = 0;
            for (const tribute of tributeCandidates) {
              if (sacrificedCount < tributesNeeded) {
                const sacrificed = tribute.monster;
                this.field.setMonsterZone('opponent', tribute.zoneIndex, null);
                this.field.sendToGraveyard(sacrificed, sacrificed.ownerId);
                this.callbacks.onAnimation({
                  type: 'destroy',
                  target: 'opponent',
                  zoneIndex: tribute.zoneIndex
                });
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
          ...this.playerMonsters
            .filter(monster => monster && !monster.isSetFaceDown)
            .map(monster => monster.getAtk())
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
          await this.resolveTrapHoleOnSummon('opponent', emptyZone);
        }

        if (!(await this.delay(1200))) return false;
      }
    }

    if (this.winner || this._duelEnded) return false;
    await this.tryAISynchroSummon(profile);
    if (this.winner || this._duelEnded) return false;

    this.phases.currentPhase = 'battle';
    this.phases.setBattleStep('start');
    this.startPhaseFlow();
  }

  async runAIBattlePhase() {
    if (this.winner || this._duelEnded) return false;
    const profile = this.getAIDecisionProfile();
    const aiMonsterIndices = this.opponentMonsters.map((m, i) => m !== null ? i : -1).filter(i => i !== -1);

    for (const atkIdx of aiMonsterIndices) {
      if (this.winner) break;

      const attacker = this.field.getMonsterZone('opponent', atkIdx);
      if (!attacker || attacker.position === 'defense' || attacker.isSetFaceDown) continue;

      const hasPlayerMonsters = this.playerMonsters.some(m => m !== null);

      if (!hasPlayerMonsters) {
        this.log(`L'adversaire déclare une attaque directe avec **${attacker.name}** !`, 'opponent');

        if (await this.resolveMirrorForceOnAttack('player', atkIdx)) {
          break;
        }

        this.callbacks.onAnimation({ type: 'attack-direct', target: 'player', atkZoneIndex: atkIdx, card: attacker });

        if (!(await this.delay(600))) return false;

        const directDamage = await this.tryKuribohBattleDamage('player', attacker.getAtk(), {
          directAttack: true,
          attackerUid: attacker.uid
        });
        this.playerLP = Math.max(0, this.playerLP - directDamage);
        this.log(`Attaque Directe ! Vous subissez **${directDamage}** points de dommages !`, 'danger');
        if (directDamage > 0) {
          this.callbacks.onAnimation({ type: 'lp-loss', target: 'player', damage: directDamage });
        }

        if (this.playerLP === 0) {
          this.endGame('opponent');
        }
        if (!(await this.delay(800))) return false;
      } else {
        const playerMonsterIndices = this.playerMonsters.map((m, i) => m !== null ? i : -1).filter(i => i !== -1);
        let targets = playerMonsterIndices.map(defIdx => ({
          idx: defIdx,
          card: this.playerMonsters[defIdx]
        }));

        const target = this.chooseAIAttackTarget(attacker, targets);
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

        if (await this.resolveMirrorForceOnAttack('player', atkIdx)) {
          break;
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
          this.callbacks.onAnimation({ type: 'flip-summon', target: 'player', zoneIndex: target.idx, card: target.card });
          if (!(await this.delay(450))) return false;
        }

        this.callbacks.onAnimation({
          type: 'attack-monster',
          attackerSide: 'opponent',
          atkZoneIndex: atkIdx,
          defZoneIndex: target.idx
        });
        if (!(await this.delay(600))) return false;

        // 3. Damage Calculation
        this.phases.setDamageStepSubPhase('calc');
        const defender = target.card;
        const defIdx = target.idx;

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
          defenderUid: defender.uid
        });
        oDamage = await this.tryKuribohBattleDamage('opponent', oDamage, {
          directAttack: false,
          attackerUid: attacker.uid,
          defenderUid: defender.uid
        });

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
          this.field.setMonsterZone('player', defIdx, null);
          this.field.sendToGraveyard(defender, defender.ownerId);
          this.callbacks.onAnimation({ type: 'destroy', target: 'player', zoneIndex: defIdx });
        }
        if (atkDestroyed) {
          this.field.setMonsterZone('opponent', atkIdx, null);
          this.field.sendToGraveyard(attacker, attacker.ownerId);
          this.callbacks.onAnimation({ type: 'destroy', target: 'opponent', zoneIndex: atkIdx });
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
