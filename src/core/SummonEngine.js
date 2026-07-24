import { FieldState } from './FieldState.js';

/**
 * SummonEngine handles TCG summoning classifications, procedures, material solvers,
 * and legality verifications for Fusion, Synchro, Xyz, Link, Pendulum, and Ritual Summons.
 */
export class SummonEngine {
  constructor(fieldState = null) {
    // Material movements are real zone changes too. Reuse the same transition
    // authority as the rest of the duel so aliases and runtime identities
    // cannot survive entering or leaving an Xyz overlay.
    this.fieldState = fieldState || new FieldState();
    this.reset();
  }

  reset() {
    this.normalSummonAllowance = {
      baseMaximum: 1,
      used: 0,
      additionalAllowances: []
    };
    this.pendulumSummonAllowance = {
      used: 0,
      maximum: 1
    };
    this.turnSummonHistory = {
      totalNormalSummons: 0,
      totalSpecialSummons: 0,
      summonCountByType: {},
      summonCountByOrigin: {},
      summonedCardIds: [],
      successfulSummons: [],
      negatedSummonAttempts: []
    };
  }

  canNormalSummon() {
    return this.normalSummonAllowance.used < this.normalSummonAllowance.baseMaximum;
  }

  /**
   * Extra Deck monsters and Ritual Monsters never enter play through the
   * generic Normal Summon path. Pendulum Monsters in the Main Deck may still
   * be Normal Summoned or Set like other monsters.
   */
  canUseNormalSummonProcedure(card) {
    if (!card || card.card_type !== 'monster') return false;
    if (card.belongsInExtraDeck || card.extra_type) return false;
    if (card.isRitualMonster) return false;
    return !/Fusion|Synchro|Xyz|Link|Ritual/i.test(card.type || '');
  }

  consumeNormalSummon() {
    this.normalSummonAllowance.used += 1;
    this.turnSummonHistory.totalNormalSummons += 1;
  }

  _validateDistinctCards(cards) {
    if (!Array.isArray(cards) || cards.length === 0) return false;
    const identities = cards.map(card => card?.uid || card);
    return new Set(identities).size === cards.length;
  }

  _validateFaceUpFieldMaterials(materials, {
    controllerId = null,
    allowTokens = true
  } = {}) {
    if (!this._validateDistinctCards(materials)) {
      return { valid: false, reason: 'MATERIALS_MUST_BE_DISTINCT' };
    }

    const inferredController = controllerId || materials[0]?.controllerId || null;
    for (const material of materials) {
      if (!material || material.card_type !== 'monster') {
        return { valid: false, reason: 'MATERIAL_NOT_MONSTER' };
      }
      if (!['monster_zone', 'extra_monster_zone'].includes(material.location) || material.isSetFaceDown) {
        return { valid: false, reason: 'MATERIAL_NOT_FACE_UP_ON_FIELD' };
      }
      if (inferredController && material.controllerId !== inferredController) {
        return { valid: false, reason: 'MATERIAL_WRONG_CONTROLLER' };
      }
      if (!allowTokens && material.isToken) {
        return { valid: false, reason: 'TOKEN_NOT_ALLOWED' };
      }
    }
    return { valid: true, controllerId: inferredController };
  }

  /**
   * Validate Link Summon materials rating sum and counts
   * - Each non-Link monster counts as 1.
   * - Each Link monster counts as 1 or its link rating.
   * - Sum of chosen values must equal the linkRating exactly.
   * - Material count must satisfy minimum materials (e.g. "2+ monsters").
   */
  validateLinkSummon(materials, linkMonster, options = {}) {
    return this.createLinkSummonPlan(materials, linkMonster, options).valid;
  }

  createLinkSummonPlan(materials, linkMonster, options = {}) {
    if (!linkMonster || !/Link/i.test(linkMonster.type || '') || !linkMonster.linkRating) {
      return { valid: false, reason: 'INVALID_LINK_MONSTER' };
    }
    const common = this._validateFaceUpFieldMaterials(materials, {
      controllerId: options.controllerId,
      // Tokens are only legal when the printed recipe permits them. The
      // project strict subset uses Effect Monsters, which excludes Tokens.
      allowTokens: options.allowTokens ?? false
    });
    if (!common.valid) return common;

    const requiresEffectMonsters = options.requiresEffectMonsters
      ?? linkMonster.requiresEffectMonsters
      ?? true;
    if (
      requiresEffectMonsters
      && materials.some(material => !material.isEffectMonster && !/Effect/i.test(material.type || ''))
    ) {
      return { valid: false, reason: 'LINK_REQUIRES_EFFECT_MONSTERS' };
    }

    const minMaterials = Number(
      options.minimumMaterialCount
      ?? linkMonster.minimumMaterialCount
      ?? (Number(linkMonster.linkRating) === 1 ? 1 : 2)
    );
    const maxMaterials = Number(
      options.maximumMaterialCount
      ?? linkMonster.maximumMaterialCount
      ?? linkMonster.linkRating
    );
    if (materials.length < minMaterials || materials.length > maxMaterials) {
      return { valid: false, reason: 'INVALID_LINK_MATERIAL_COUNT' };
    }

    const materialFilter = options.materialFilter || linkMonster.materialFilter;
    if (typeof materialFilter === 'function' && !materials.every(materialFilter)) {
      return { valid: false, reason: 'LINK_RECIPE_MISMATCH' };
    }

    const linkRating = Number(linkMonster.linkRating);
    const ratingValues = this._findLinkRatingValues(materials, linkRating);
    if (!ratingValues) {
      return { valid: false, reason: 'LINK_RATING_MISMATCH' };
    }

    return {
      valid: true,
      reason: null,
      controllerId: common.controllerId,
      linkMonster,
      materials: [...materials],
      materialRatingValues: ratingValues,
      totalLinkRating: ratingValues.reduce((sum, value) => sum + value, 0)
    };
  }

  _findLinkRatingValues(materials, targetSum, index = 0, current = []) {
    if (index === materials.length) {
      return current.reduce((sum, value) => sum + value, 0) === targetSum
        ? current
        : null;
    }

    const mat = materials[index];
    const choices = [1];
    const materialLinkRating = Number(mat.linkRating || 0);
    if (/Link/i.test(mat.type || '') && materialLinkRating > 1) {
      choices.push(materialLinkRating);
    }

    for (const val of choices) {
      const nextTotal = current.reduce((sum, value) => sum + value, 0) + val;
      if (nextTotal > targetSum) continue;
      const result = this._findLinkRatingValues(materials, targetSum, index + 1, [...current, val]);
      if (result) return result;
    }

    return null;
  }

  _checkLinkSumRecursive(materials, index, currentSum, targetSum) {
    const result = this._findLinkRatingValues(
      materials.slice(index),
      targetSum - currentSum
    );
    return Boolean(result);
  }

  /**
   * Validate Synchro Summon
   * - Materials must contain exactly 1 Tuner (or matching replacement) and 1+ non-Tuners.
   * - Sum of levels must equal target level.
   */
  validateSynchroSummon(materials, targetLevel, synchroMonster = null) {
    if (!materials || materials.length < 2) return false;

    // Check level sum
    let levelSum = 0;
    let tunerCount = 0;
    let nonTunerCount = 0;

    for (const mat of materials) {
      if (mat.card_type !== 'monster') return false;
      // Synchro Materials must be face-up monsters controlled on the field.
      if (!['monster_zone', 'extra_monster_zone'].includes(mat.location) || mat.isSetFaceDown) return false;
      const materialLevel = Number(mat.getLevel ? mat.getLevel() : mat.level);
      // Xyz/Link Monsters and any other monster without a positive Level
      // cannot be used as Synchro Material unless an effect explicitly gives
      // them a Level. Rank and Link Rating are never treated as Levels.
      if (!Number.isInteger(materialLevel) || materialLevel <= 0) return false;
      levelSum += materialLevel;

      const isTuner = mat.type && mat.type.includes('Tuner');
      if (isTuner) {
        tunerCount++;
      } else {
        nonTunerCount++;
      }
    }

    if (levelSum !== targetLevel || tunerCount !== 1 || nonTunerCount < 1) {
      return false;
    }

    const requiredNonTunerRace = synchroMonster?.synchroNonTunerRace;
    if (requiredNonTunerRace) {
      const nonTuners = materials.filter(mat => !(mat.type && mat.type.includes('Tuner')));
      if (!nonTuners.every(mat => mat.race === requiredNonTunerRace)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate Xyz Summon
   * - Monsters must have same level, which matches Xyz Rang (rank)
   */
  validateXyzSummon(materials, xyzMonsterOrRank, options = {}) {
    return this.createXyzSummonPlan(materials, xyzMonsterOrRank, options).valid;
  }

  createXyzSummonPlan(materials, xyzMonsterOrRank, options = {}) {
    const xyzMonster = typeof xyzMonsterOrRank === 'object'
      ? xyzMonsterOrRank
      : null;
    const targetRank = Number(
      typeof xyzMonsterOrRank === 'number'
        ? xyzMonsterOrRank
        : (xyzMonster?.getRank?.() || xyzMonster?.rank || 0)
    );
    if (!Number.isInteger(targetRank) || targetRank <= 0) {
      return { valid: false, reason: 'INVALID_XYZ_RANK' };
    }
    if (xyzMonster && !/Xyz/i.test(xyzMonster.type || '')) {
      return { valid: false, reason: 'INVALID_XYZ_MONSTER' };
    }

    const common = this._validateFaceUpFieldMaterials(materials, {
      controllerId: options.controllerId,
      allowTokens: false
    });
    if (!common.valid) return common;

    const minimum = Number(
      options.minimumMaterialCount
      ?? xyzMonster?.minimumMaterialCount
      ?? xyzMonster?.xyzMaterialCount
      ?? 2
    );
    const maximum = Number(
      options.maximumMaterialCount
      ?? xyzMonster?.maximumMaterialCount
      ?? xyzMonster?.xyzMaterialCount
      ?? (xyzMonster ? minimum : Number.POSITIVE_INFINITY)
    );
    if (materials.length < minimum || materials.length > maximum) {
      return { valid: false, reason: 'INVALID_XYZ_MATERIAL_COUNT' };
    }

    const levels = materials.map(material => (
      material.getLevel ? material.getLevel() : Number(material.level || 0)
    ));
    if (levels.some(level => level <= 0 || level !== targetRank)) {
      return { valid: false, reason: 'XYZ_LEVEL_RANK_MISMATCH' };
    }

    const materialFilter = options.materialFilter || xyzMonster?.materialFilter;
    if (typeof materialFilter === 'function' && !materials.every(materialFilter)) {
      return { valid: false, reason: 'XYZ_RECIPE_MISMATCH' };
    }

    return {
      valid: true,
      reason: null,
      controllerId: common.controllerId,
      xyzMonster,
      rank: targetRank,
      materials: [...materials]
    };
  }

  attachXyzMaterials(xyzMonster, materials) {
    if (
      !xyzMonster
      || !Array.isArray(materials)
      || !materials.every(Boolean)
      || !this._validateDistinctCards(materials)
    ) {
      return false;
    }
    if (!Array.isArray(xyzMonster.xyzMaterials)) xyzMonster.xyzMaterials = [];
    if (materials.some(material => xyzMonster.xyzMaterials.includes(material))) return false;
    for (const material of materials) {
      this.fieldState.transitionCard(
        material,
        'xyz_material',
        xyzMonster.controllerId,
        -1
      );
      xyzMonster.xyzMaterials.push(material);
    }
    return xyzMonster.xyzMaterials.length;
  }

  detachXyzMaterials(xyzMonster, count = 1) {
    if (!xyzMonster || !Array.isArray(xyzMonster.xyzMaterials)) return [];
    const detachCount = Math.max(0, Math.min(
      xyzMonster.xyzMaterials.length,
      Number(count) || 0
    ));
    const detached = xyzMonster.xyzMaterials.splice(0, detachCount);
    detached.forEach(material => {
      // The duel integration owns Graveyard arrays. This intermediate state
      // makes it impossible to treat a detached card as still on the field.
      this.fieldState.transitionCard(
        material,
        'graveyard_pending',
        material.ownerId || xyzMonster.controllerId,
        -1
      );
    });
    return detached;
  }

  /**
   * Validate Pendulum Summon level bounds
   * - scaleL < level < scaleR (strictly between scales)
   */
  validatePendulumScales(leftScale, rightScale, options = {}) {
    const readScale = value => (
      typeof value === 'number'
        ? value
        : Number(value?.pendulumScale ?? value?.scale)
    );
    const left = readScale(leftScale);
    const right = readScale(rightScale);
    if (
      !Number.isInteger(left)
      || !Number.isInteger(right)
      || left < 0
      || right < 0
      || left > 13
      || right > 13
    ) {
      return { valid: false, reason: 'INVALID_PENDULUM_SCALE' };
    }

    for (const scaleCard of [leftScale, rightScale]) {
      if (typeof scaleCard === 'number') continue;
      if (!scaleCard?.isPendulumMonster || scaleCard.isSetFaceDown) {
        return { valid: false, reason: 'SCALE_NOT_FACE_UP_PENDULUM_CARD' };
      }
      if (!['pendulum_zone', 'spell_zone'].includes(scaleCard.location)) {
        return { valid: false, reason: 'SCALE_NOT_IN_PENDULUM_ZONE' };
      }
      if (options.controllerId && scaleCard.controllerId !== options.controllerId) {
        return { valid: false, reason: 'SCALE_WRONG_CONTROLLER' };
      }
    }

    if (
      typeof leftScale !== 'number'
      && typeof rightScale !== 'number'
      && leftScale.controllerId
      && rightScale.controllerId
      && leftScale.controllerId !== rightScale.controllerId
    ) {
      return { valid: false, reason: 'SCALES_DIFFERENT_CONTROLLERS' };
    }

    return {
      valid: true,
      reason: null,
      left,
      right,
      minimum: Math.min(left, right),
      maximum: Math.max(left, right)
    };
  }

  validatePendulumSummon(scaleL, scaleR, monsterOrLevel, options = {}) {
    const scales = this.validatePendulumScales(scaleL, scaleR, options);
    if (!scales.valid) return false;
    const level = Number(
      typeof monsterOrLevel === 'number'
        ? monsterOrLevel
        : (monsterOrLevel?.getLevel?.() || monsterOrLevel?.level || 0)
    );
    if (level <= scales.minimum || level >= scales.maximum) return false;
    if (typeof monsterOrLevel === 'number') return true;

    const monster = monsterOrLevel;
    if (!monster || monster.card_type !== 'monster' || level <= 0) return false;
    if (
      (monster.belongsInExtraDeck && !monster.isPendulumMonster)
      || monster.isRitualMonster
      || /Fusion|Synchro|Xyz|Link|Ritual/i.test(monster.type || '')
        && !monster.isPendulumMonster
    ) {
      return false;
    }
    if (monster.location === 'hand') return true;
    return monster.location === 'extra_deck'
      && monster.isPendulumMonster
      && monster.isFaceUpInExtraDeck;
  }

  canPendulumSummon() {
    return this.pendulumSummonAllowance.used < this.pendulumSummonAllowance.maximum;
  }

  consumePendulumSummon() {
    if (!this.canPendulumSummon()) return false;
    this.pendulumSummonAllowance.used += 1;
    return true;
  }

  getPendulumEligibleMonsters(leftScale, rightScale, {
    hand = [],
    faceUpExtraDeck = [],
    controllerId = null
  } = {}) {
    const scales = this.validatePendulumScales(leftScale, rightScale, { controllerId });
    if (!scales.valid) {
      return {
        valid: false,
        reason: scales.reason,
        fromHand: [],
        fromExtraDeck: []
      };
    }
    return {
      valid: true,
      reason: null,
      scales,
      fromHand: hand.filter(card => (
        card.location === 'hand'
        && (!controllerId || card.controllerId === controllerId)
        && this.validatePendulumSummon(leftScale, rightScale, card, { controllerId })
      )),
      fromExtraDeck: faceUpExtraDeck.filter(card => (
        card.location === 'extra_deck'
        && card.isFaceUpInExtraDeck
        && (!controllerId || card.controllerId === controllerId)
        && this.validatePendulumSummon(leftScale, rightScale, card, { controllerId })
      ))
    };
  }

  createPendulumSummonPlan(leftScale, rightScale, selectedMonsters, options = {}) {
    if (!this.canPendulumSummon()) {
      return { valid: false, reason: 'PENDULUM_SUMMON_ALREADY_USED' };
    }
    if (!this._validateDistinctCards(selectedMonsters)) {
      return { valid: false, reason: 'INVALID_PENDULUM_SELECTION' };
    }
    const scales = this.validatePendulumScales(leftScale, rightScale, options);
    if (!scales.valid) return scales;

    const fromHand = [];
    const fromExtraDeck = [];
    for (const monster of selectedMonsters) {
      if (!this.validatePendulumSummon(leftScale, rightScale, monster, options)) {
        return { valid: false, reason: 'MONSTER_OUTSIDE_PENDULUM_SCALES' };
      }
      if (options.controllerId && monster.controllerId !== options.controllerId) {
        return { valid: false, reason: 'PENDULUM_MONSTER_WRONG_CONTROLLER' };
      }
      if (monster.location === 'hand') fromHand.push(monster);
      else if (monster.location === 'extra_deck' && monster.isFaceUpInExtraDeck) {
        fromExtraDeck.push(monster);
      } else {
        return { valid: false, reason: 'INVALID_PENDULUM_SOURCE' };
      }
    }

    const availableMainMonsterZones = Number(
      options.availableMainMonsterZones ?? 5
    );
    const availableExtraDeckZones = Number(
      options.availableExtraDeckZones ?? 0
    );
    if (fromHand.length > availableMainMonsterZones) {
      return { valid: false, reason: 'NOT_ENOUGH_MAIN_MONSTER_ZONES' };
    }
    if (fromExtraDeck.length > availableExtraDeckZones) {
      return { valid: false, reason: 'NOT_ENOUGH_LINKED_OR_EXTRA_MONSTER_ZONES' };
    }

    return {
      valid: true,
      reason: null,
      controllerId: options.controllerId || selectedMonsters[0]?.controllerId || null,
      scales,
      monsters: [...selectedMonsters],
      fromHand,
      fromExtraDeck
    };
  }

  sendPendulumMonsterToFaceUpExtraDeck(card) {
    if (!card?.isPendulumMonster) return false;
    if (typeof card.placeFaceUpInExtraDeck === 'function') {
      return card.placeFaceUpInExtraDeck();
    }
    card.location = 'extra_deck';
    card.zoneIndex = -1;
    card.isSetFaceDown = false;
    card.isFaceUpInExtraDeck = true;
    card.controllerId = card.ownerId;
    return true;
  }

  validateRitualSummon(ritualMonster, ritualSpell, materials, options = {}) {
    return this.createRitualSummonPlan(
      ritualMonster,
      ritualSpell,
      materials,
      options
    ).valid;
  }

  createRitualSummonPlan(ritualMonster, ritualSpell, materials, options = {}) {
    if (
      !ritualMonster
      || !ritualMonster.isRitualMonster
      || !/Ritual/i.test(ritualMonster.type || '')
    ) {
      return { valid: false, reason: 'INVALID_RITUAL_MONSTER' };
    }
    if (
      !ritualSpell
      || ritualSpell.card_type !== 'spell'
      || !(ritualSpell.isRitualSpell || /Ritual/i.test(ritualSpell.type || ''))
    ) {
      return { valid: false, reason: 'INVALID_RITUAL_SPELL' };
    }
    if (!options.allowRitualMonsterOutsideHand && ritualMonster.location !== 'hand') {
      return { valid: false, reason: 'RITUAL_MONSTER_NOT_IN_HAND' };
    }
    if (!this._validateDistinctCards(materials)) {
      return { valid: false, reason: 'INVALID_RITUAL_MATERIALS' };
    }

    const controllerId = options.controllerId
      || ritualMonster.controllerId
      || materials[0]?.controllerId
      || null;
    const allowedIds = ritualSpell.ritualMonsterIds?.map(String);
    const allowedNames = ritualSpell.ritualMonsterNames;
    if (allowedIds?.length && !allowedIds.includes(String(ritualMonster.id))) {
      return { valid: false, reason: 'RITUAL_SPELL_TARGET_MISMATCH' };
    }
    if (allowedNames?.length && !allowedNames.includes(ritualMonster.name)) {
      return { valid: false, reason: 'RITUAL_SPELL_TARGET_MISMATCH' };
    }
    const ritualTargetFilter = options.ritualTargetFilter || ritualSpell.ritualTargetFilter;
    if (typeof ritualTargetFilter === 'function' && !ritualTargetFilter(ritualMonster)) {
      return { valid: false, reason: 'RITUAL_SPELL_TARGET_MISMATCH' };
    }

    let totalLevels = 0;
    for (const material of materials) {
      if (!material || material.card_type !== 'monster') {
        return { valid: false, reason: 'RITUAL_MATERIAL_NOT_MONSTER' };
      }
      if (!['hand', 'monster_zone', 'extra_monster_zone'].includes(material.location)) {
        return { valid: false, reason: 'INVALID_RITUAL_MATERIAL_LOCATION' };
      }
      if (controllerId && material.controllerId !== controllerId) {
        return { valid: false, reason: 'RITUAL_MATERIAL_WRONG_CONTROLLER' };
      }
      const level = Number(material.getLevel?.() || material.level || 0);
      if (level <= 0) {
        return { valid: false, reason: 'RITUAL_MATERIAL_HAS_NO_LEVEL' };
      }
      totalLevels += level;
    }

    const requiredLevel = Number(
      options.requiredLevel
      ?? ritualSpell.requiredRitualLevel
      ?? ritualMonster.getLevel?.()
      ?? ritualMonster.level
      ?? 0
    );
    const exactLevel = Boolean(
      options.exactLevel ?? ritualSpell.requiresExactLevel
    );
    const levelsValid = exactLevel
      ? totalLevels === requiredLevel
      : totalLevels >= requiredLevel;
    if (!levelsValid) {
      return {
        valid: false,
        reason: exactLevel ? 'RITUAL_LEVEL_MUST_BE_EXACT' : 'INSUFFICIENT_RITUAL_LEVELS',
        totalLevels,
        requiredLevel
      };
    }

    const materialFilter = options.materialFilter || ritualSpell.materialFilter;
    if (typeof materialFilter === 'function' && !materials.every(materialFilter)) {
      return { valid: false, reason: 'RITUAL_MATERIAL_RECIPE_MISMATCH' };
    }

    return {
      valid: true,
      reason: null,
      controllerId,
      ritualMonster,
      ritualSpell,
      materials: [...materials],
      totalLevels,
      requiredLevel,
      exactLevel
    };
  }
}
