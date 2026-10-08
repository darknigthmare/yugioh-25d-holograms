import { clearFieldSpellActivation } from './FieldSpellRules.js';

/**
 * FieldState manages all playmat zones of the board, including Main/Extra zones,
 * Graveyards, Banished cards, and Field Spells.
 */
export class FieldState {
  constructor({ onTransition = null } = {}) {
    this.onTransition = typeof onTransition === 'function' ? onTransition : null;
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
    this.monsterFieldRevision = { player: 0, opponent: 0 };
    this.playerFaceUpExtraDeck = [];
    this.opponentFaceUpExtraDeck = [];

    this.playerFieldSpellZone = null;
    this.opponentFieldSpellZone = null;

    this.playerGraveyard = [];
    this.opponentGraveyard = [];

    this.playerBanished = [];
    this.opponentBanished = [];
    this._transitionSnapshots = new WeakMap();
  }

  getMonsterZone(controllerId, index) {
    if (controllerId === 'player') {
      return this.playerMonsterZones[index];
    } else {
      return this.opponentMonsterZones[index];
    }
  }

  detachCard(cardState, { trackMonsterChange = true } = {}) {
    if (!cardState) return false;
    let detached = false;
    const previousSides = new Set();
    if (this.playerMonsterZones.includes(cardState)) previousSides.add('player');
    if (this.opponentMonsterZones.includes(cardState)) previousSides.add('opponent');
    for (const entry of this.extraMonsterZones) {
      if (entry?.card === cardState) previousSides.add(entry.controllerId);
    }
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
    if (trackMonsterChange) {
      for (const side of previousSides) this.monsterFieldRevision[side] += 1;
    }
    return detached;
  }

  transitionCard(cardState, destination, controllerId, zoneIndex = -1, options = {}) {
    if (!cardState) return false;
    const previous = Object.freeze({
      location: cardState.location,
      controllerId: cardState.controllerId,
      zoneIndex: cardState.zoneIndex,
      runtimeInstanceId: cardState.runtimeInstanceId,
      isSetFaceDown: cardState.isSetFaceDown
    });
    const monsterZones = ['monster_zone', 'extra_monster_zone'];
    const remainsMonster = monsterZones.includes(cardState.location)
      && monsterZones.includes(destination);
    const sameMonsterSide = remainsMonster && cardState.controllerId === controllerId;
    const changesZone = (
      cardState.location !== destination
      || Number(cardState.zoneIndex) !== Number(zoneIndex)
    );
    this.detachCard(cardState, { trackMonsterChange: !sameMonsterSide });
    // Moving between Monster Zones or changing control does not make a
    // monster leave the field: counters, targeting and attack history persist.
    if (changesZone && !remainsMonster) cardState.resetForZoneChange(destination, options);
    if (monsterZones.includes(destination) && !sameMonsterSide) {
      this.monsterFieldRevision[controllerId] += 1;
    }
    cardState.location = destination;
    cardState.zoneIndex = zoneIndex;
    cardState.controllerId = controllerId;
    // Xyz Materials are not on the field. Every departure of their host
    // from a Monster Zone sends them to their owners' GY, including a return
    // to hand/Deck or using the host as another monster's material. Control
    // changes and moving between Monster Zones retain the stack (Rulebook,
    // p. 51). Update the host first so material observers see a coherent field.
    if (
      monsterZones.includes(previous.location)
      && !remainsMonster
      && Array.isArray(cardState.xyzMaterials)
    ) {
      for (const material of cardState.xyzMaterials.splice(0)) {
        this.sendToGraveyard(material, material.ownerId);
      }
    }
    if (changesZone || previous.controllerId !== controllerId) {
      this._transitionSnapshots.set(cardState, Object.freeze({
        card: cardState,
        from: previous,
        to: Object.freeze({
          location: destination, controllerId, zoneIndex,
          runtimeInstanceId: cardState.runtimeInstanceId,
          isSetFaceDown: cardState.isSetFaceDown
        })
      }));
      if (options.deferNotification !== true) this.notifyTransition(cardState);
    }
    return true;
  }

  notifyTransition(cardState) {
    const event = this._transitionSnapshots.get(cardState);
    this._transitionSnapshots.delete(cardState);
    if (event && this.onTransition) this.onTransition(event);
  }

  setMonsterZone(controllerId, index, cardState) {
    if (!Number.isInteger(index) || index < 0 || index >= 5) return false;
    if (!cardState) {
      if (this.getMonsterZone(controllerId, index)) this.monsterFieldRevision[controllerId] += 1;
      if (controllerId === 'player') this.playerMonsterZones[index] = null;
      else this.opponentMonsterZones[index] = null;
      return true;
    }
    this.transitionCard(cardState, 'monster_zone', controllerId, index, { deferNotification: true });
    if (controllerId === 'player') {
      this.playerMonsterZones[index] = cardState;
    } else {
      this.opponentMonsterZones[index] = cardState;
    }
    this.notifyTransition(cardState);
    return true;
  }

  getExtraMonsterZone(index) {
    return this.extraMonsterZones[index] || null;
  }

  setExtraMonsterZone(index, controllerId, cardState) {
    if (!Number.isInteger(index) || index < 0 || index >= this.extraMonsterZones.length) return false;
    if (!cardState) {
      const oldSide = this.extraMonsterZones[index]?.controllerId;
      if (oldSide) this.monsterFieldRevision[oldSide] += 1;
      this.extraMonsterZones[index] = null;
      return true;
    }
    this.transitionCard(cardState, 'extra_monster_zone', controllerId, index, { deferNotification: true });
    this.extraMonsterZones[index] = { card: cardState, controllerId };
    this.notifyTransition(cardState);
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
    this.transitionCard(cardState, 'spell_zone', controllerId, index, { deferNotification: true });
    if (controllerId === 'player') {
      this.playerSpellZones[index] = cardState;
    } else {
      this.opponentSpellZones[index] = cardState;
    }
    this.notifyTransition(cardState);
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

    this.transitionCard(cardState, 'field_zone', controllerId, 0, { deferNotification: true });
    if (controllerId === 'player') {
      this.playerFieldSpellZone = cardState;
    } else {
      this.opponentFieldSpellZone = cardState;
    }
    this.notifyTransition(cardState);
    return true;
  }

  sendToGraveyard(cardState, ownerId) {
    if (cardState) {
      ownerId = cardState.ownerId || ownerId;
      if (cardState.isToken) return this.removeToken(cardState);
      const previousLocation = cardState.location;
      const cameFromField = ['monster_zone', 'spell_zone', 'pendulum_zone', 'field_zone', 'extra_monster_zone']
        .includes(previousLocation);
      // A Pendulum card already occupies the field while its activation is
      // pending. Destruction sends it to the face-up Extra Deck; only a
      // negated card activation bypasses that destination and goes to GY.
      const negatedPendulumActivation = Boolean(
        cardState.isPendingPendulumActivation && cardState.activationNegated
      );
      cardState.isPendingPendulumActivation = false;
      if (cardState.isPendulumMonster && cameFromField && !negatedPendulumActivation) {
        return this.sendToFaceUpExtraDeck(cardState, ownerId);
      }
      this.transitionCard(cardState, 'graveyard', ownerId, -1, { deferNotification: true });
      if (ownerId === 'player') {
        if (!this.playerGraveyard.includes(cardState)) this.playerGraveyard.push(cardState);
      } else {
        if (!this.opponentGraveyard.includes(cardState)) this.opponentGraveyard.push(cardState);
      }
      this.notifyTransition(cardState);
      return { destination: 'graveyard', card: cardState };
    }
    return null;
  }

  sendToFaceUpExtraDeck(cardState, ownerId) {
    if (!cardState) return null;
    ownerId = cardState.ownerId || ownerId;
    this.transitionCard(cardState, 'extra_deck', ownerId, -1, { faceUpExtraDeck: true, deferNotification: true });
    cardState.isSetFaceDown = false;
    cardState.isFaceUpInExtraDeck = true;
    const destination = ownerId === 'player'
      ? this.playerFaceUpExtraDeck
      : this.opponentFaceUpExtraDeck;
    if (!destination.includes(cardState)) destination.push(cardState);
    this.notifyTransition(cardState);
    return { destination: 'extra_deck_face_up', card: cardState };
  }

  sendToBanished(cardState, ownerId, faceDown = false) {
    if (cardState) {
      ownerId = cardState.ownerId || ownerId;
      // Tokens cannot be banished face-down, even as a cost.
      if (cardState.isToken) return faceDown ? false : this.removeToken(cardState);
      this.transitionCard(cardState, 'banished', ownerId, -1, { deferNotification: true });
      cardState.isSetFaceDown = faceDown;
      if (ownerId === 'player') {
        if (!this.playerBanished.includes(cardState)) this.playerBanished.push(cardState);
      } else {
        if (!this.opponentBanished.includes(cardState)) this.opponentBanished.push(cardState);
      }
      this.notifyTransition(cardState);
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
   * respecting destination rules. Public piles are inserted here; callers
   * insert the returned card in private Hand/Deck/face-down Extra Deck piles.
   */
  moveCard(card, toLocation, targetPlayerId = 'player') {
    if (!card) return null;

    // Tokens cease to exist when leaving the field
    if (card.isToken && (toLocation === 'graveyard' || toLocation === 'hand' || toLocation === 'deck' || toLocation === 'banished' || toLocation === 'extra_deck')) {
      return this.removeToken(card);
    }

    const ownerId = card.ownerId || targetPlayerId;
    // Fusion/Synchro/Xyz/Link cards cannot enter a hand or Main Deck.
    const returnsToExtraDeck = ['hand', 'deck'].includes(toLocation) && (
      card.belongsInExtraDeck || card.extra_type || /Fusion|Synchro|Xyz|Link/i.test(card.type || '')
    );
    const finalDestination = returnsToExtraDeck ? 'extra_deck' : toLocation;
    const ownerDestinations = ['hand', 'deck', 'extra_deck', 'graveyard', 'banished'];
    const finalPlayer = ownerDestinations.includes(finalDestination) ? ownerId : targetPlayerId;

    if (finalDestination === 'graveyard') {
      this.sendToGraveyard(card, ownerId);
      return { success: true, finalDestination: card.location, finalPlayer: card.controllerId };
    }
    if (finalDestination === 'banished') {
      this.sendToBanished(card, ownerId);
      return { success: true, finalDestination: card.location, finalPlayer: card.controllerId };
    }

    this.transitionCard(card, finalDestination, finalPlayer, -1);
    if (finalDestination === 'extra_deck') card.isFaceUpInExtraDeck = false;

    return { success: true, finalDestination, finalPlayer };
  }

  removeToken(card) {
    this.transitionCard(card, 'none', card.ownerId, -1);
    return { success: true, ceasedToExist: true, destination: 'none', card };
  }
}
