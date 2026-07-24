import { getCardCroppedImageUrl, getCardImageUrl } from '../cards.js';

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
    this.desc = baseCard.rulesText || baseCard.desc;
    this.card_type = baseCard.card_type; // 'monster', 'spell', 'trap'
    this.type = baseCard.type; // 'Normal Monster', 'Effect Monster', 'Fusion Monster', 'Synchro Monster', 'Spell Card', 'Trap Card'

    // Monster specifics
    this.baseAtk = baseCard.atk || 0;
    this.baseDef = baseCard.def || 0;
    this.baseLevel = baseCard.level || 0;
    this.race = baseCard.race || '';
    this.attribute = baseCard.attribute || '';
    this.extra_type = baseCard.extra_type || null; // 'fusion', 'synchro', 'xyz', 'link'
    this.belongsInExtraDeck = Boolean(
      baseCard.belongsInExtraDeck
      || this.extra_type
      || (this.type && /Fusion|Synchro|Xyz|Link/i.test(this.type))
    );
    this.isRitualMonster = Boolean(
      this.card_type === 'monster'
      && (
        baseCard.isRitualMonster
        || (this.type && /Ritual/i.test(this.type))
      )
    );
    this.isPendulumMonster = Boolean(
      this.card_type === 'monster'
      && (
        baseCard.isPendulumMonster
        || (this.type && /Pendulum/i.test(this.type))
      )
    );
    this.isRitualSpell = Boolean(
      this.card_type === 'spell'
      && (baseCard.isRitualSpell || (this.type && /Ritual/i.test(this.type)))
    );
    this.isEffectMonster = baseCard.isEffectMonster !== undefined
      ? Boolean(baseCard.isEffectMonster)
      : Boolean(this.type && /Effect/i.test(this.type));
    this.rank = Number(baseCard.rank || 0);
    this.linkRating = baseCard.linkRating || null;
    this.minimumMaterialCount = Number(baseCard.minimumMaterialCount || 0) || null;
    this.maximumMaterialCount = Number(baseCard.maximumMaterialCount || 0) || null;
    this.xyzMaterialCount = Number(baseCard.xyzMaterialCount || 0) || null;
    this.requiresEffectMonsters = baseCard.requiresEffectMonsters;
    this.materialFilter = typeof baseCard.materialFilter === 'function'
      ? baseCard.materialFilter
      : null;
    this.ritualTargetFilter = typeof baseCard.ritualTargetFilter === 'function'
      ? baseCard.ritualTargetFilter
      : null;
    this.ritualMonsterIds = Array.isArray(baseCard.ritualMonsterIds)
      ? [...baseCard.ritualMonsterIds]
      : [];
    this.ritualMonsterNames = Array.isArray(baseCard.ritualMonsterNames)
      ? [...baseCard.ritualMonsterNames]
      : [];
    this.ritualSpellId = baseCard.ritualSpellId || null;
    this.requiredRitualLevel = Number(baseCard.requiredRitualLevel || 0) || null;
    this.requiresExactLevel = Boolean(baseCard.requiresExactLevel);
    this.pendulumScale = Number(
      baseCard.pendulumScale ?? baseCard.scale ?? 0
    );
    this.isFaceUpInExtraDeck = Boolean(
      baseCard.isFaceUpInExtraDeck || baseCard.faceUpInExtraDeck
    );
    this.isPendulumScale = Boolean(baseCard.isPendulumScale);
    this.isPendingPendulumActivation = false;
    this.pendulumArchetypes = Array.isArray(baseCard.pendulumArchetypes)
      ? [...baseCard.pendulumArchetypes]
      : [];
    this.pendulumActivationRequiresEmptyMonsterField = Boolean(
      baseCard.pendulumActivationRequiresEmptyMonsterField
    );
    this.linkArrows = Array.isArray(baseCard.linkArrows)
      ? [...baseCard.linkArrows]
      : [];
    this.xyzMaterials = Array.isArray(baseCard.xyzMaterials)
      ? [...baseCard.xyzMaterials]
      : [];
    this.synchroNonTunerRace = baseCard.synchroNonTunerRace || null;
    this.fusionMaterials = Array.isArray(baseCard.fusionMaterials)
      ? [...baseCard.fusionMaterials]
      : [];
    this.effectCode = baseCard.effectCode || null;
    this.timing = baseCard.timing ? { ...baseCard.timing } : null;
    // External card adapters may explicitly disallow a card in strict mode.
    // Keep that flag on the runtime wrapper so validation cannot lose it.
    this.supportedInStrict = baseCard.supportedInStrict !== false;

    // Dynamic Stats
    this.currentAtk = this.baseAtk;
    this.currentDef = this.baseDef;
    this.currentLevel = this.baseLevel;
    this.currentAttribute = this.attribute;
    this.currentRace = this.race;

    // Status
    this.position = 'attack'; // 'attack' or 'defense'
    this._isSetFaceDown = false;
    this.location = 'deck'; // 'deck', 'hand', 'monster_zone', 'spell_zone', 'field_zone', 'graveyard', 'banished', 'extra_deck'
    this.zoneIndex = -1;
    this.controllerId = ''; // 'player' or 'opponent'
    this.ownerId = ''; // 'player' or 'opponent'

    // Turn-based states
    this.turnSummoned = -1;
    this.hasAttacked = false;
    this.hasChangedPositionThisTurn = false;
    this.turnSet = -1;
    this.effectUsage = {};
    this.effectsNegatedUntilEndTurn = false;
    this.wasProperlySpecialSummoned = Boolean(baseCard.wasProperlySpecialSummoned);
    this.summonType = null;
    this.stardustReturnEligibleTurn = -1;
    this.stardustReturnController = null;

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

  get isSetFaceDown() {
    return this._isSetFaceDown;
  }

  set isSetFaceDown(value) {
    this._isSetFaceDown = Boolean(value);
    // Junk Synchron's negation lasts only while that exact monster instance
    // remains face-up. Turning it face-down ends the continuous condition.
    if (this._isSetFaceDown && this.effectNegationScope === 'while_face_up_instance') {
      this.effectNegated = false;
      this.effectNegationScope = null;
      this.effectNegationRuntimeInstanceId = null;
    }
  }

  refreshRuntimeIdentity() {
    this.zoneChangeCounter += 1;
    this.runtimeInstanceId = `${this.uid}_inst_${this.zoneChangeCounter}`;
  }

  /**
   * A card that changes zones is a new runtime instance for target tracking.
   * Reset all state that cannot follow it, while retaining the "properly
   * Summoned" fact only in public zones from which revival remains legal.
   */
  resetForZoneChange(destination) {
    const keepProperSummon = ['monster_zone', 'extra_monster_zone', 'graveyard', 'banished']
      .includes(destination);
    if (!keepProperSummon) this.wasProperlySpecialSummoned = false;

    // These flags describe the card's presentation in one precise zone. They
    // must never leak into an unrelated zone after the card becomes a new
    // runtime instance. Field destinations retain an explicitly prepared Set
    // state (the caller sets it before placement), while public/off-field
    // destinations always reveal the card unless their dedicated movement API
    // applies another state afterwards (for example, face-down banishment).
    if (destination !== 'pendulum_zone') this.isPendulumScale = false;
    if (!['spell_zone', 'pendulum_zone'].includes(destination)) {
      this.isPendingPendulumActivation = false;
    }
    if (destination !== 'extra_deck') this.isFaceUpInExtraDeck = false;
    if (
      ![
        'monster_zone',
        'extra_monster_zone',
        'spell_zone',
        'pendulum_zone',
        'field_zone'
      ].includes(destination)
    ) {
      this.isSetFaceDown = false;
    }

    this.refreshRuntimeIdentity();
    this.currentAtk = this.baseAtk;
    this.currentDef = this.baseDef;
    this.currentLevel = this.baseLevel;
    this.currentAttribute = this.attribute;
    this.currentRace = this.race;
    this.activeModifiers = [];
    this.counters = {};
    this.effectUsage = {};
    this.activationNegated = false;
    this.effectNegated = false;
    this.effectNegationScope = null;
    this.effectNegationRuntimeInstanceId = null;
    this.effectsNegatedUntilEndTurn = false;
    this.resolvedSuccessfully = false;
    this.appliedAnything = false;
    this.pendingBattleDestruction = false;
    this.battleResult = 'none';
    this.hasAttacked = false;
    this.hasChangedPositionThisTurn = false;
    this.attacksDeclaredThisTurn = 0;
    this.attacksCompletedThisTurn = 0;
    this.monstersDestroyedByBattleThisTurn = 0;
    this.directAttacksDeclaredThisTurn = 0;
    this.stardustReturnEligibleTurn = -1;
    this.stardustReturnController = null;
    this.stardustReturnRuntimeInstanceId = null;
  }

  resetTurnStatus() {
    this.hasAttacked = false;
    this.hasChangedPositionThisTurn = false;
    this.attacksDeclaredThisTurn = 0;
    this.attacksCompletedThisTurn = 0;
    this.monstersDestroyedByBattleThisTurn = 0;
    this.directAttacksDeclaredThisTurn = 0;
    if (
      this.effectsNegatedUntilEndTurn
      && this.effectNegationScope !== 'while_face_up_instance'
    ) {
      this.effectNegated = false;
      this.effectNegationScope = null;
      this.effectNegationRuntimeInstanceId = null;
      this.effectsNegatedUntilEndTurn = false;
    }
  }

  get image_url() {
    return getCardImageUrl(this.id);
  }

  get image_url_cropped() {
    return getCardCroppedImageUrl(this.id);
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

  get rankValue() {
    return this.getRank();
  }

  getAtk() {
    if (this.effectNegated) return this.baseAtk;
    // Arcanite Magician gains 1000 ATK for each Spell Counter it currently has.
    const counterBonus = String(this.id) === '31924889'
      ? (this.counters.spell || 0) * 1000
      : 0;
    return Math.max(0, this.currentAtk + counterBonus);
  }

  getDef() {
    if (this.type && this.type.includes('Link')) return null;
    if (this.effectNegated) return this.baseDef;
    return Math.max(0, this.currentDef);
  }

  getLevel() {
    if (this.type && /Xyz|Link/i.test(this.type)) return 0;
    if (this.effectNegated) return this.baseLevel;
    return Math.max(1, this.currentLevel);
  }

  getRank() {
    return this.type && /Xyz/i.test(this.type)
      ? Math.max(0, this.rank)
      : 0;
  }

  placeFaceUpInExtraDeck() {
    if (!this.isPendulumMonster) return false;
    this.location = 'extra_deck';
    this.zoneIndex = -1;
    this.isSetFaceDown = false;
    this.isFaceUpInExtraDeck = true;
    this.controllerId = this.ownerId;
    return true;
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
