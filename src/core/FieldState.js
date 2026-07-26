import { clearFieldSpellActivation } from './FieldSpellRules.js';

/**
 * FieldState manages all playmat zones of the board, including Main/Extra zones,
 * Graveyards, Banished cards, and Field Spells.
 */
export class FieldState {
  constructor() {
    this.reset();
  }

  reset() {
    clearFieldSpellActivation(this.playerFieldSpellZone);
    clearFieldSpellActivation(this.opponentFieldSpellZone);

    this.playerMonsterZones = Array(5).fill(null);
    this.opponentMonsterZones = Array(5).fill(null);
    this.playerSpellZones = Array(5).fill(null);
    this.opponentSpellZones = Array(5).fill(null);

    // Shared Extra Monster Zones (0: left, 1: right)
    this.extraMonsterZones = Array(2).fill(null); // Each slot stores { card, controllerId }
    this.playerFaceUpExtraDeck = [];
    this.opponentFaceUpExtraDeck = [];

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

  detachCard(cardState) {
    if (!cardState) return false;
    let detached = false;
    const clearArray = array => {
      for (let index = array.length - 1; index >= 0; index -= 1) {
        if (array[index] === cardState) {
          array.splice(index, 1);
          detached = true;
        }
      }
    };
    for (const zones of [
      this.playerMonsterZones,
      this.opponentMonsterZones,
      this.playerSpellZones,
      this.opponentSpellZones
    ]) {
      zones.forEach((card, index) => {
        if (card === cardState) {
          zones[index] = null;
          detached = true;
        }
      });
    }
    this.extraMonsterZones.forEach((entry, index) => {
      if (entry?.card === cardState) {
        this.extraMonsterZones[index] = null;
        detached = true;
      }
    });
    if (this.playerFieldSpellZone === cardState) {
      this.playerFieldSpellZone = null;
      detached = true;
    }
    if (this.opponentFieldSpellZone === cardState) {
      this.opponentFieldSpellZone = null;
      detached = true;
    }
    for (const pile of [
      this.playerGraveyard,
      this.opponentGraveyard,
      this.playerBanished,
      this.opponentBanished,
      this.playerFaceUpExtraDeck,
      this.opponentFaceUpExtraDeck
    ]) clearArray(pile);
    return detached;
  }

  transitionCard(cardState, destination, controllerId, zoneIndex = -1) {
    if (!cardState) return false;
    const changesZone = (
      cardState.location !== destination
      || Number(cardState.zoneIndex) !== Number(zoneIndex)
    );
    this.detachCard(cardState);
    if (changesZone) cardState.resetForZoneChange(destination);
    cardState.location = destination;
    cardState.zoneIndex = zoneIndex;
    cardState.controllerId = controllerId;
    return true;
  }

  setMonsterZone(controllerId, index, cardState) {
    if (!Number.isInteger(index) || index < 0 || index >= 5) return false;
    if (!cardState) {
      if (controllerId === 'player') this.playerMonsterZones[index] = null;
      else this.opponentMonsterZones[index] = null;
      return true;
    }
    this.transitionCard(cardState, 'monster_zone', controllerId, index);
    if (controllerId === 'player') {
      this.playerMonsterZones[index] = cardState;
    } else {
      this.opponentMonsterZones[index] = cardState;
    }
    return true;
  }

  getExtraMonsterZone(index) {
    return this.extraMonsterZones[index] || null;
  }

  setExtraMonsterZone(index, controllerId, cardState) {
    if (index < 0 || index >= this.extraMonsterZones.length) return false;
    if (!cardState) {
      this.extraMonsterZones[index] = null;
      return true;
    }
    this.transitionCard(cardState, 'extra_monster_zone', controllerId, index);
    this.extraMonsterZones[index] = { card: cardState, controllerId };
    return true;
  }

  getControlledExtraMonsters(controllerId) {
    return this.extraMonsterZones
      .map((entry, index) => (
        entry?.controllerId === controllerId
          ? { card: entry.card, zoneIndex: index }
          : null
      ))
      .filter(Boolean);
  }

  getAvailableExtraMonsterZones(controllerId) {
    const opponentId = controllerId === 'player' ? 'opponent' : 'player';
    const ownCount = this.getControlledExtraMonsters(controllerId).length;
    const opponentCount = this.getControlledExtraMonsters(opponentId).length;
    if (ownCount > 0 && opponentCount > 0) return [];
    if (ownCount > 0) return [];
    return this.extraMonsterZones
      .map((entry, index) => (entry ? -1 : index))
      .filter(index => index >= 0);
  }

  getSpellZone(controllerId, index) {
    if (controllerId === 'player') {
      return this.playerSpellZones[index];
    } else {
      return this.opponentSpellZones[index];
    }
  }

  setSpellZone(controllerId, index, cardState) {
    if (!Number.isInteger(index) || index < 0 || index >= 5) return false;
    if (!cardState) {
      if (controllerId === 'player') this.playerSpellZones[index] = null;
      else this.opponentSpellZones[index] = null;
      return true;
    }
    this.transitionCard(cardState, 'spell_zone', controllerId, index);
    if (controllerId === 'player') {
      this.playerSpellZones[index] = cardState;
    } else {
      this.opponentSpellZones[index] = cardState;
    }
    return true;
  }

  getFieldSpell(controllerId) {
    return controllerId === 'player'
      ? this.playerFieldSpellZone
      : this.opponentFieldSpellZone;
  }

  placeFieldSpell(controllerId, cardState) {
    if (!cardState) {
      if (controllerId === 'player') this.playerFieldSpellZone = null;
      else this.opponentFieldSpellZone = null;
      return true;
    }

    const currentFieldSpell = this.getFieldSpell(controllerId);
    if (currentFieldSpell === cardState) return true;

    // Under current TCG rules, each player owns one Field Zone. Placing or
    // activating another Field Spell sends that player's previous one to its
    // owner's Graveyard before the replacement occupies the zone.
    if (currentFieldSpell) {
      this.sendToGraveyard(
        currentFieldSpell,
        currentFieldSpell.ownerId || currentFieldSpell.controllerId || controllerId
      );
    }

    this.transitionCard(cardState, 'field_zone', controllerId, 0);
    if (controllerId === 'player') {
      this.playerFieldSpellZone = cardState;
    } else {
      this.opponentFieldSpellZone = cardState;
    }
    return true;
  }

  sendToGraveyard(cardState, ownerId) {
    if (cardState) {
      const previousLocation = cardState.location;
      if (Array.isArray(cardState.xyzMaterials) && cardState.xyzMaterials.length > 0) {
        const detachedMaterials = cardState.xyzMaterials.splice(0);
        detachedMaterials.forEach(material => {
          this.sendToGraveyard(material, material.ownerId);
        });
      }
      const cameFromField = ['monster_zone', 'spell_zone', 'pendulum_zone', 'field_zone', 'extra_monster_zone']
        .includes(previousLocation);
      const pendingPendulumActivation = Boolean(cardState.isPendingPendulumActivation);
      cardState.isPendingPendulumActivation = false;
      if (cardState.isPendulumMonster && cameFromField && !pendingPendulumActivation) {
        return this.sendToFaceUpExtraDeck(cardState, ownerId);
      }
      this.transitionCard(cardState, 'graveyard', ownerId, -1);
      if (ownerId === 'player') {
        if (!this.playerGraveyard.includes(cardState)) this.playerGraveyard.push(cardState);
      } else {
        if (!this.opponentGraveyard.includes(cardState)) this.opponentGraveyard.push(cardState);
      }
      return { destination: 'graveyard', card: cardState };
    }
    return null;
  }

  sendToFaceUpExtraDeck(cardState, ownerId) {
    if (!cardState) return null;
    this.transitionCard(cardState, 'extra_deck', ownerId, -1);
    cardState.isSetFaceDown = false;
    cardState.isFaceUpInExtraDeck = true;
    const destination = ownerId === 'player'
      ? this.playerFaceUpExtraDeck
      : this.opponentFaceUpExtraDeck;
    if (!destination.includes(cardState)) destination.push(cardState);
    return { destination: 'extra_deck_face_up', card: cardState };
  }

  sendToBanished(cardState, ownerId, faceDown = false) {
    if (cardState) {
      this.transitionCard(cardState, 'banished', ownerId, -1);
      cardState.isSetFaceDown = faceDown;
      if (ownerId === 'player') {
        if (!this.playerBanished.includes(cardState)) this.playerBanished.push(cardState);
      } else {
        if (!this.opponentBanished.includes(cardState)) this.opponentBanished.push(cardState);
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

    // Normalize destination to card owner for Hand, Deck, Extra Deck
    const finalPlayer = (toLocation === 'hand' || toLocation === 'deck' || toLocation === 'extra_deck') ? card.ownerId : targetPlayerId;

    this.transitionCard(card, toLocation, finalPlayer, -1);

    return { success: true, finalDestination: toLocation, finalPlayer };
  }
}
