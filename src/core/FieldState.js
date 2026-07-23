/**
 * FieldState manages all playmat zones of the board, including Main/Extra zones,
 * Graveyards, Banished cards, and Field Spells.
 */
export class FieldState {
  constructor() {
    this.reset();
  }

  reset() {
    this.playerMonsterZones = Array(5).fill(null);
    this.opponentMonsterZones = Array(5).fill(null);
    this.playerSpellZones = Array(5).fill(null);
    this.opponentSpellZones = Array(5).fill(null);

    // Shared Extra Monster Zones (0: left, 1: right)
    this.extraMonsterZones = Array(2).fill(null); // Each slot stores { card, controllerId }

    this.playerFieldSpellZone = null;
    this.opponentFieldSpellZone = null;

    this.playerGraveyard = [];
    this.opponentGraveyard = [];

    this.playerBanished = [];
    this.opponentBanished = [];
  }

  getMonsterZone(controllerId, index) {
    if (controllerId === 'player') {
      return this.playerMonsterZones[index];
    } else {
      return this.opponentMonsterZones[index];
    }
  }

  setMonsterZone(controllerId, index, cardState) {
    if (controllerId === 'player') {
      this.playerMonsterZones[index] = cardState;
    } else {
      this.opponentMonsterZones[index] = cardState;
    }
    if (cardState) {
      cardState.location = 'monster_zone';
      cardState.zoneIndex = index;
      cardState.controllerId = controllerId;
    }
  }

  getSpellZone(controllerId, index) {
    if (controllerId === 'player') {
      return this.playerSpellZones[index];
    } else {
      return this.opponentSpellZones[index];
    }
  }

  setSpellZone(controllerId, index, cardState) {
    if (controllerId === 'player') {
      this.playerSpellZones[index] = cardState;
    } else {
      this.opponentSpellZones[index] = cardState;
    }
    if (cardState) {
      cardState.location = 'spell_zone';
      cardState.zoneIndex = index;
      cardState.controllerId = controllerId;
    }
  }

  placeFieldSpell(controllerId, cardState) {
    if (controllerId === 'player') {
      this.playerFieldSpellZone = cardState;
    } else {
      this.opponentFieldSpellZone = cardState;
    }
    if (cardState) {
      cardState.location = 'field_zone';
      cardState.zoneIndex = 0;
      cardState.controllerId = controllerId;
    }
  }

  sendToGraveyard(cardState, ownerId) {
    if (cardState) {
      cardState.location = 'graveyard';
      cardState.zoneIndex = -1;
      cardState.controllerId = ownerId; // Returns to owner
      if (ownerId === 'player') {
        this.playerGraveyard.push(cardState);
      } else {
        this.opponentGraveyard.push(cardState);
      }
    }
  }

  sendToBanished(cardState, ownerId, faceDown = false) {
    if (cardState) {
      cardState.location = 'banished';
      cardState.isSetFaceDown = faceDown;
      cardState.zoneIndex = -1;
      cardState.controllerId = ownerId;
      if (ownerId === 'player') {
        this.playerBanished.push(cardState);
      } else {
        this.opponentBanished.push(cardState);
      }
    }
  }

  tributeMonsters(controllerId, indices) {
    const tributed = [];
    indices.forEach(idx => {
      const card = this.getMonsterZone(controllerId, idx);
      if (card) {
        tributed.push(card);
        this.setMonsterZone(controllerId, idx, null);
        this.sendToGraveyard(card, card.ownerId);
      }
    });
    return tributed;
  }

  /**
   * Moves a card to a target location, refreshing its runtime identity,
   * respecting tokens, and redirecting hand/deck/extra_deck to owner.
   */
  moveCard(card, toLocation, targetPlayerId = 'player') {
    if (!card) return null;

    // Tokens cease to exist when leaving the field
    if (card.isToken && (toLocation === 'graveyard' || toLocation === 'hand' || toLocation === 'deck' || toLocation === 'banished' || toLocation === 'extra_deck')) {
      card.location = 'none';
      card.zoneIndex = -1;
      card.controllerId = card.ownerId;
      return { success: true, ceasedToExist: true };
    }

    // Refresh identity to prevent old effect targets tracking
    card.refreshRuntimeIdentity();

    // Reset status modifiers on zone change
    card.activeModifiers = [];
    card.pendingBattleDestruction = false;
    card.battleResult = 'none';

    // Normalize destination to card owner for Hand, Deck, Extra Deck
    const finalPlayer = (toLocation === 'hand' || toLocation === 'deck' || toLocation === 'extra_deck') ? card.ownerId : targetPlayerId;

    card.location = toLocation;
    card.controllerId = finalPlayer;
    card.zoneIndex = -1;

    return { success: true, finalDestination: toLocation, finalPlayer };
  }
}
