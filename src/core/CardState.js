/**
 * CardState represents a dynamic instance of a card in the duel.
 * It manages modifications to statistics, locations, combat positions, and active status.
 */
export class CardState {
  constructor(baseCard) {
    this.uid = baseCard.uid || `card_${Math.random().toString(36).substr(2, 9)}`;
    this.id = baseCard.id;
    this.name = baseCard.name;
    this.name_en = baseCard.name_en;
    this.desc = baseCard.desc;
    this.card_type = baseCard.card_type; // 'monster', 'spell', 'trap'
    this.type = baseCard.type; // 'Normal Monster', 'Effect Monster', 'Fusion Monster', 'Synchro Monster', 'Spell Card', 'Trap Card'

    // Monster specifics
    this.baseAtk = baseCard.atk || 0;
    this.baseDef = baseCard.def || 0;
    this.baseLevel = baseCard.level || 0;
    this.race = baseCard.race || '';
    this.attribute = baseCard.attribute || '';
    this.extra_type = baseCard.extra_type || null; // 'fusion', 'synchro'
    this.linkRating = baseCard.linkRating || null;
    this.synchroNonTunerRace = baseCard.synchroNonTunerRace || null;

    // Dynamic Stats
    this.currentAtk = this.baseAtk;
    this.currentDef = this.baseDef;
    this.currentLevel = this.baseLevel;
    this.currentAttribute = this.attribute;
    this.currentRace = this.race;

    // Status
    this.position = 'attack'; // 'attack' or 'defense'
    this.isSetFaceDown = false;
    this.location = 'deck'; // 'deck', 'hand', 'monster_zone', 'spell_zone', 'field_zone', 'graveyard', 'banished', 'extra_deck'
    this.zoneIndex = -1;
    this.controllerId = ''; // 'player' or 'opponent'
    this.ownerId = ''; // 'player' or 'opponent'

    // Turn-based states
    this.turnSummoned = -1;
    this.hasAttacked = false;
    this.hasChangedPositionThisTurn = false;
    this.turnSet = -1;

    // Battle and damage step counters
    this.attacksDeclaredThisTurn = 0;
    this.attacksCompletedThisTurn = 0;
    this.monstersDestroyedByBattleThisTurn = 0;
    this.directAttacksDeclaredThisTurn = 0;
    this.pendingBattleDestruction = false;
    this.battleResult = 'none'; // 'none', 'destroyed', 'prevented', 'reflected'

    // Negations / Status markers
    this.activationNegated = false;
    this.effectNegated = false;
    this.resolvedSuccessfully = false;
    this.appliedAnything = false;

    this.counters = {}; // counterName -> count
    this.activeModifiers = []; // { sourceCardId, type: 'atk'|'def'|'level'|'negate', value }

    // Runtime instance identity to prevent target-tracking across zone changes
    this.zoneChangeCounter = 0;
    this.runtimeInstanceId = `${this.uid}_inst_${this.zoneChangeCounter}`;
  }

  refreshRuntimeIdentity() {
    this.zoneChangeCounter += 1;
    this.runtimeInstanceId = `${this.uid}_inst_${this.zoneChangeCounter}`;
  }

  resetTurnStatus() {
    this.hasAttacked = false;
    this.hasChangedPositionThisTurn = false;
  }

  get image_url() {
    return `https://images.ygoprodeck.com/images/cards/${this.id}.jpg`;
  }

  get image_url_cropped() {
    return `https://images.ygoprodeck.com/images/cards_cropped/${this.id}.jpg`;
  }

  // Legacy-compatible stat accessors.
  // Several gameplay systems still read `card.atk`, `card.def`, and
  // `card.level`; keeping those aliases dynamic prevents them from bypassing
  // modifiers and avoids undefined combat/tribute calculations.
  get atk() {
    return this.getAtk();
  }

  get def() {
    return this.getDef();
  }

  get level() {
    return this.getLevel();
  }

  getAtk() {
    if (this.effectNegated) return this.baseAtk;
    return Math.max(0, this.currentAtk);
  }

  getDef() {
    if (this.type && this.type.includes('Link')) return null;
    if (this.effectNegated) return this.baseDef;
    return Math.max(0, this.currentDef);
  }

  getLevel() {
    if (this.effectNegated) return this.baseLevel;
    return Math.max(1, this.currentLevel);
  }

  applyModifier(mod) {
    this.activeModifiers.push(mod);
  }

  removeModifiersBySource(sourceCardId) {
    this.activeModifiers = this.activeModifiers.filter(m => m.sourceCardId !== sourceCardId);
  }

  addCounter(name, amount = 1) {
    this.counters[name] = (this.counters[name] || 0) + amount;
  }

  removeCounter(name, amount = 1) {
    if (this.counters[name]) {
      this.counters[name] = Math.max(0, this.counters[name] - amount);
    }
  }
}
