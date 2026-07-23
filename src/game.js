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
  constructor(callbacks = {}) {
    this.callbacks = {
      onStateChange: () => {},
      onLog: () => {},
      onAnimation: () => {},
      onGameOver: () => {},
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

    this.reset();
  }

  reset() {
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

  startDuel(playerDeck = [], opponentDeck = [], playerExtra = [], opponentExtra = []) {
    this.reset();
    this.log("Le duel commence ! Préparez vos disques de duel !", "duel-start");

    const basePlayerDeck = playerDeck.length > 0 ? playerDeck : [...STARTER_CARDS];
    const baseOpponentDeck = opponentDeck.length > 0 ? opponentDeck : [...STARTER_CARDS];

    const basePlayerExtra = playerExtra.length > 0 ? playerExtra : [...EXTRA_DECK_CARDS];
    const baseOpponentExtra = opponentExtra.length > 0 ? opponentExtra : [...EXTRA_DECK_CARDS];

    // Instantiate and wrap all deck cards in CardState
    let playerInstances = [];
    let opponentInstances = [];

    while (playerInstances.length < 25) {
      playerInstances.push(...JSON.parse(JSON.stringify(basePlayerDeck)));
    }
    while (opponentInstances.length < 25) {
      opponentInstances.push(...JSON.parse(JSON.stringify(baseOpponentDeck)));
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
  }

  drawCard(target, isSilent = false) {
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
      this.log(`${target === 'player' ? 'Vous piochez' : "L'adversaire pioche"} : **${cardState.name}**`, target);
      this.callbacks.onAnimation({ type: 'draw', target, card: cardState });
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

      await new Promise(r => setTimeout(r, 600));

      // Starting player does not draw on Turn 1
      if (!this.turn.shouldDrawOnDrawPhase(this.turnCount, this.currentTurn === 'player')) {
        this.log("Règle TCG : Le joueur qui commence ne pioche pas au premier tour.", "system");
      } else {
        this.drawCard(this.currentTurn);
      }

      await new Promise(r => setTimeout(r, 600));
      this.phases.nextPhase(); // To Standby
      this.startPhaseFlow();
    }
    else if (this.currentPhase === 'standby') {
      this.log(`--- Standby Phase ---`, 'phase');

      // Trigger Standby Maintenance effects (SEGOC)
      await new Promise(r => setTimeout(r, 600));

      this.phases.nextPhase(); // To Main 1
      this.startPhaseFlow();
    }
    else if (this.currentPhase === 'main1') {
      this.log(`--- Phase Principale 1 ---`, 'phase');
      this.stateChanged();

      if (this.currentTurn === 'opponent') {
        await new Promise(r => setTimeout(r, 1000));
        await this.runAIMainPhase();
      } else {
        this.checkAutoPass();
      }
    }
    else if (this.currentPhase === 'battle') {
      this.log(`--- Phase de Combat ---`, 'phase');
      this.stateChanged();

      if (this.currentTurn === 'opponent') {
        await new Promise(r => setTimeout(r, 1000));
        await this.runAIBattlePhase();
      } else {
        this.checkAutoPass();
      }
    }
    else if (this.currentPhase === 'main2') {
      this.log(`--- Phase Principale 2 ---`, 'phase');
      this.stateChanged();

      if (this.currentTurn === 'opponent') {
        await new Promise(r => setTimeout(r, 1000));
        this.phases.nextPhase(); // To End
        this.startPhaseFlow();
      } else {
        this.checkAutoPass();
      }
    }
    else if (this.currentPhase === 'end') {
      this.log(`--- Fin de Tour ---`, 'phase');

      const ready = await this.checkHandSizeLimit();
      if (!ready) return; // Discard hand limit pause

      await new Promise(r => setTimeout(r, 500));

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

      setTimeout(() => {
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
      setTimeout(() => {
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
    if (card.card_type !== 'monster') return false;
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
    this.stateChanged();
    return true;
  }

  async setMonsterFaceDown(handCardUid, zoneIndex) {
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || !this.summons.canNormalSummon() || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return false;

    const cardIndex = this.playerHand.findIndex(c => c.uid === handCardUid);
    if (cardIndex === -1) return false;

    const card = this.playerHand[cardIndex];
    if (card.card_type !== 'monster') return false;
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

      await new Promise(r => setTimeout(r, 600));

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

    // Spell activation triggering Chain
    this.playerHand.splice(cardIndex, 1);
    this.field.setSpellZone('player', zoneIndex, card);

    this.log(`Vous activez la Carte Magie **${card.name}** !`, 'player');
    this.callbacks.onAnimation({ type: 'activate', target: 'player', card, zoneIndex });

    this.isResolvingAction = true;

    // Add to stack using ChainEngine
    const link = this.chain.pushChainLink('player', card, []);
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });

    await new Promise(r => setTimeout(r, 1200));

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
    const link = this.chain.pushChainLink('player', card, []);
    this.callbacks.onAnimation({ type: 'chain-pop', linkNumber: link.id, card });

    await new Promise(r => setTimeout(r, 1200));

    // Resolve LIFO chain stack
    await this.resolveChainStack();
    return true;
  }

  async resolveChainStack() {
    this.log(`Résolution de la chaîne (LIFO)...`, 'system');

    while (this.chain.chainStack.length > 0) {
      const link = this.chain.chainStack.pop();
      this.log(`Chain Link ${link.id} : Effet de **${link.sourceCard.name}** se résout !`, 'system');

      this.callbacks.onAnimation({ type: 'chain-resolve', linkNumber: link.id, card: link.sourceCard });

      // Execute resolution
      await this.executeSpellTrapResolution(link.sourceCard, link.activatingPlayerId, link.sourceCard.zoneIndex);
      await new Promise(r => setTimeout(r, 1000));
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
      await new Promise(r => setTimeout(r, 400));
      this.drawCard(user);
    }
    else if (card.id === '12580477') {
      this.log(`${isPlayer ? 'Vous activez' : "L'adversaire active"} Raigeki : Destruction des monstres adverses !`, 'system');
      this.callbacks.onAnimation({ type: 'raigeki-cinematic', target: isPlayer ? 'opponent' : 'player' });
      await new Promise(r => setTimeout(r, 1000));

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
      const monstersInGrave = allGraveyard.filter(item => item.card.card_type === 'monster');

      if (monstersInGrave.length === 0) {
        this.log("Aucun monstre dans les cimetières.", "system");
      } else {
        monstersInGrave.sort((a, b) => b.card.atk - a.card.atk);
        const choice = monstersInGrave[0];

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

          await new Promise(r => setTimeout(r, 1200));

          choice.card.position = 'attack';
          choice.card.isSetFaceDown = false;
          choice.card.turnSummoned = this.turnCount;
          this.field.setMonsterZone(user, emptyZoneIdx, choice.card);

          this.log(`Monster Reborn ressuscite **${choice.card.name}** !`, 'system');
          this.callbacks.onAnimation({ type: 'summon', target: user, card: choice.card, zoneIndex: emptyZoneIdx, position: 'attack' });
        } else {
          this.log("Aucune Zone Monstre libre pour résoudre Monster Reborn.", "danger");
        }
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

    await new Promise(resolve => setTimeout(resolve, 500));

    if (this.field.getMonsterZone(summoningSide, zoneIndex) === summonedCard) {
      this.field.setMonsterZone(summoningSide, zoneIndex, null);
      this.field.sendToGraveyard(summonedCard, summonedCard.ownerId);
      this.callbacks.onAnimation({ type: 'destroy', target: summoningSide, zoneIndex });
    }

    this.field.setSpellZone(defendingSide, trapIndex, null);
    this.field.sendToGraveyard(trapCard, trapCard.ownerId);
    this.callbacks.onAnimation({ type: 'clear-spell', target: defendingSide, zoneIndex: trapIndex });
    this.stateChanged();
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

    await new Promise(resolve => setTimeout(resolve, 900));

    for (let i = 0; i < attackingMonsters.length; i++) {
      const monster = attackingMonsters[i];
      if (monster && monster.position === 'attack') {
        this.field.setMonsterZone(attackingSide, i, null);
        this.field.sendToGraveyard(monster, monster.ownerId);
        this.callbacks.onAnimation({ type: 'destroy', target: attackingSide, zoneIndex: i });
      }
    }

    this.field.setSpellZone(defendingSide, trapIndex, null);
    this.field.sendToGraveyard(trapCard, trapCard.ownerId);
    this.callbacks.onAnimation({ type: 'clear-spell', target: defendingSide, zoneIndex: trapIndex });
    this.stateChanged();
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

      await new Promise(r => setTimeout(r, 600));

      this.opponentLP = Math.max(0, this.opponentLP - attacker.getAtk());
      this.log(`Attaque Directe ! L'adversaire subit **${attacker.getAtk()}** points de dommages !`, 'danger');
      this.callbacks.onAnimation({ type: 'lp-loss', target: 'opponent', damage: attacker.getAtk() });

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
      await new Promise(r => setTimeout(r, 400));

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
        await new Promise(r => setTimeout(r, 450));
      }

      // Attack project visual animation
      this.callbacks.onAnimation({
        type: 'attack-monster',
        attackerSide: 'player',
        atkZoneIndex: atkIndex,
        defZoneIndex: targetDefIndex
      });
      await new Promise(r => setTimeout(r, 600));

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
      await new Promise(r => setTimeout(r, 400));

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

  async summonExtraDeck(extraCardUid) {
    if (this.currentTurn !== 'player' || !this.currentPhase.startsWith('main') || this.isResolvingAction || this.pendingSummon || this.isDiscarding) return false;

    const extraCardIdx = this.playerExtraDeck.findIndex(c => c.uid === extraCardUid);
    if (extraCardIdx === -1) return false;

    const extraCard = this.playerExtraDeck[extraCardIdx];
    const emptyZoneIdx = this.playerMonsters.findIndex(m => m === null);
    if (emptyZoneIdx === -1) {
      this.log("Pas de Zone Monstre vide !", "danger");
      return false;
    }

    if (extraCard.extra_type === 'fusion') {
      const beCount = this.playerMonsters.filter(m => m && m.id === '89631139').length;
      if (beCount < 3) {
        this.log(`Pour fusionner **${extraCard.name}**, vous devez posséder 3 Dragon Blanc aux Yeux Bleus sur votre Terrain !`, 'danger');
        return false;
      }

      this.isResolvingAction = true;
      this.log(`Fusion ! Union de vos 3 Dragon Blanc pour invoquer **${extraCard.name}** !`, 'system');

      let sacrificed = 0;
      for (let i = 0; i < 5; i++) {
        if (this.playerMonsters[i] && this.playerMonsters[i].id === '89631139' && sacrificed < 3) {
          const mat = this.playerMonsters[i];
          this.field.setMonsterZone('player', i, null);
          this.field.sendToGraveyard(mat, mat.ownerId);
          this.callbacks.onAnimation({ type: 'destroy', target: 'player', zoneIndex: i });
          sacrificed++;
        }
      }

      await new Promise(r => setTimeout(r, 800));

      this.playerExtraDeck.splice(extraCardIdx, 1);
      extraCard.position = 'attack';
      extraCard.isSetFaceDown = false;
      extraCard.turnSummoned = this.turnCount;
      this.field.setMonsterZone('player', emptyZoneIdx, extraCard);

      this.log(`Invocation Fusion ! Ressortez **${extraCard.name}** de l'Extra Deck !`, 'player');
      this.callbacks.onAnimation({ type: 'summon', target: 'player', card: extraCard, zoneIndex: emptyZoneIdx, position: 'attack' });

      this.isResolvingAction = false;
      this.stateChanged();
      return true;
    }
    else if (extraCard.extra_type === 'synchro') {
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

      await new Promise(r => setTimeout(r, 600));

      const emptyZoneIdx = this.playerMonsters.findIndex(m => m === null);
      if (emptyZoneIdx !== -1) {
        const card = synchroState.extraCard;
        this.playerExtraDeck.splice(synchroState.extraCardIdx, 1);
        card.position = 'attack';
        card.isSetFaceDown = false;
        card.turnSummoned = this.turnCount;
        this.field.setMonsterZone('player', emptyZoneIdx, card);

        this.log(`Invocation Synchro ! Incarnez le légendaire **${card.name}** !`, 'player');
        this.callbacks.onAnimation({ type: 'summon', target: 'player', card, zoneIndex: emptyZoneIdx, position: 'attack' });
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
    this.winner = winner;
    this.log(`LE DUEL EST FINI ! Vainqueur : ${winner === 'player' ? 'Joueur (Vous)' : 'Adversaire (IA)'}`, 'duel-end');
    this.callbacks.onGameOver(winner);
  }

  async runAIMainPhase() {
    this.log("L'adversaire réfléchit...", 'opponent');
    await new Promise(r => setTimeout(r, 1000));

    // AI activates Spell if possible
    const spellIdx = this.opponentHand.findIndex(c => c.card_type === 'spell');
    if (spellIdx !== -1) {
      const emptySpellZone = this.opponentSpells.findIndex(s => s === null);
      if (emptySpellZone !== -1) {
        const card = this.opponentHand[spellIdx];
        this.opponentHand.splice(spellIdx, 1);
        this.field.setSpellZone('opponent', emptySpellZone, card);

        this.log(`L'adversaire active la Carte Magie **${card.name}** !`, 'opponent');
        this.callbacks.onAnimation({ type: 'activate', target: 'opponent', card, zoneIndex: emptySpellZone });

        await new Promise(r => setTimeout(r, 1000));
        await this.executeSpellTrapResolution(card, 'opponent', emptySpellZone);
        await new Promise(r => setTimeout(r, 800));
      }
    }

    // AI sets Trap face-down
    const trapIdx = this.opponentHand.findIndex(c => c.card_type === 'trap');
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

        await new Promise(r => setTimeout(r, 800));
      }
    }

    // AI Summon monster
    const monsters = this.opponentHand.filter(c => c.card_type === 'monster');
    const emptyZone = this.opponentMonsters.findIndex(m => m === null);

    if (monsters.length > 0 && emptyZone !== -1 && this.summons.canNormalSummon()) {
      monsters.sort((a, b) => b.atk - a.atk);

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
            let sacrificedCount = 0;
            for (let i = 0; i < 5; i++) {
              if (this.opponentMonsters[i] !== null && sacrificedCount < tributesNeeded) {
                const sacrificed = this.opponentMonsters[i];
                this.field.setMonsterZone('opponent', i, null);
                this.field.sendToGraveyard(sacrificed, sacrificed.ownerId);
                this.callbacks.onAnimation({ type: 'destroy', target: 'opponent', zoneIndex: i });
                sacrificedCount++;
              }
            }
            await new Promise(r => setTimeout(r, 800));
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
        const isSet = card.def > card.atk && Math.random() > 0.4;
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

        await new Promise(r => setTimeout(r, 1200));
      }
    }

    this.phases.currentPhase = 'battle';
    this.phases.setBattleStep('start');
    this.startPhaseFlow();
  }

  async runAIBattlePhase() {
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

        await new Promise(r => setTimeout(r, 600));

        this.playerLP = Math.max(0, this.playerLP - attacker.atk);
        this.log(`Attaque Directe ! Vous subissez **${attacker.atk}** points de dommages !`, 'danger');
        this.callbacks.onAnimation({ type: 'lp-loss', target: 'player', damage: attacker.atk });

        if (this.playerLP === 0) {
          this.endGame('opponent');
        }
        await new Promise(r => setTimeout(r, 800));
      } else {
        const playerMonsterIndices = this.playerMonsters.map((m, i) => m !== null ? i : -1).filter(i => i !== -1);
        let targets = playerMonsterIndices.map(defIdx => ({
          idx: defIdx,
          card: this.playerMonsters[defIdx]
        }));

        targets.sort((a, b) => {
          if (a.card.position === 'defense' && b.card.position !== 'defense') return 1;
          if (a.card.position !== 'defense' && b.card.position === 'defense') return -1;
          const statA = a.card.position === 'defense' ? a.card.getDef() : a.card.getAtk();
          const statB = b.card.position === 'defense' ? b.card.getDef() : b.card.getAtk();
          return statA - statB;
        });

        const target = targets[0];
        const targetStat = target.card.position === 'defense' ? target.card.getDef() : target.card.getAtk();
        if (attacker.atk < targetStat && !target.card.isSetFaceDown) continue;

        this.log(`L'adversaire attaque votre **${target.card.isSetFaceDown ? 'monstre caché' : target.card.name}** avec **${attacker.name}** !`, 'opponent');

        if (await this.resolveMirrorForceOnAttack('player', atkIdx)) {
          break;
        }

        this.phases.setBattleStep('damage_step');

        // 1. Start of Damage Step
        this.phases.setDamageStepSubPhase('start');
        await new Promise(r => setTimeout(r, 200));

        // 2. Before Damage Calculation (Flip face-down defender)
        this.phases.setDamageStepSubPhase('before_calc');
        if (target.card.isSetFaceDown) {
          target.card.isSetFaceDown = false;
          this.log(`Le monstre caché est révélé : **${target.card.name}** !`, 'system');
          this.callbacks.onAnimation({ type: 'flip-summon', target: 'player', zoneIndex: target.idx, card: target.card });
          await new Promise(r => setTimeout(r, 450));
        }

        this.callbacks.onAnimation({
          type: 'attack-monster',
          attackerSide: 'opponent',
          atkZoneIndex: atkIdx,
          defZoneIndex: target.idx
        });
        await new Promise(r => setTimeout(r, 600));

        // 3. Damage Calculation
        this.phases.setDamageStepSubPhase('calc');
        const defender = target.card;
        const defIdx = target.idx;

        let defDestroyed = false;
        let atkDestroyed = false;
        let pDamage = 0;
        let oDamage = 0;

        if (defender.position === 'defense') {
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
        await new Promise(r => setTimeout(r, 200));

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

        await new Promise(r => setTimeout(r, 1000));
      }
    }

    this.phases.currentPhase = 'end';
    this.startPhaseFlow();
  }
}
