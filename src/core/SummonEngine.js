/**
 * SummonEngine handles TCG summoning classifications, procedures, material solvers,
 * and legality verifications for Fusion, Synchro, Xyz, Link, Pendulum, and Ritual Summons.
 */
export class SummonEngine {
  constructor() {
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

  consumeNormalSummon() {
    this.normalSummonAllowance.used += 1;
    this.turnSummonHistory.totalNormalSummons += 1;
  }

  /**
   * Validate Link Summon materials rating sum and counts
   * - Each non-Link monster counts as 1.
   * - Each Link monster counts as 1 or its link rating.
   * - Sum of chosen values must equal the linkRating exactly.
   * - Material count must satisfy minimum materials (e.g. "2+ monsters").
   */
  validateLinkSummon(materials, linkMonster) {
    if (!materials || materials.length === 0) return false;

    const minMaterials = linkMonster.minimumMaterialCount || 2;
    if (materials.length < minMaterials) return false;

    const linkRating = linkMonster.linkRating || 1;

    // Check if there is a subset of material values that sums up to linkRating
    // Each material can contribute either 1 or its linkRating (if it is a Link monster)
    return this._checkLinkSumRecursive(materials, 0, 0, linkRating);
  }

  _checkLinkSumRecursive(materials, index, currentSum, targetSum) {
    if (index === materials.length) {
      return currentSum === targetSum;
    }

    const mat = materials[index];
    const choices = [1];
    if (mat.card_type === 'monster' && mat.linkRating > 1) {
      choices.push(mat.linkRating);
    }

    for (const val of choices) {
      if (this._checkLinkSumRecursive(materials, index + 1, currentSum + val, targetSum)) {
        return true;
      }
    }

    return false;
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
      levelSum += mat.getLevel ? mat.getLevel() : (mat.level || 0);

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
  validateXyzSummon(materials, targetRank) {
    if (!materials || materials.length < 2) return false;

    const firstLevel = materials[0].getLevel ? materials[0].getLevel() : (materials[0].level || 0);
    if (firstLevel !== targetRank) return false;

    return materials.every(mat => {
      const lvl = mat.getLevel ? mat.getLevel() : (mat.level || 0);
      return lvl === firstLevel;
    });
  }

  /**
   * Validate Pendulum Summon level bounds
   * - scaleL < level < scaleR (strictly between scales)
   */
  validatePendulumSummon(scaleL, scaleR, monsterLevel) {
    const minScale = Math.min(scaleL, scaleR);
    const maxScale = Math.max(scaleL, scaleR);
    return monsterLevel > minScale && monsterLevel < maxScale;
  }
}
