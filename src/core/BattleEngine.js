/**
 * Pure damage calculation shared by the player and the AI. Card scripts supply
 * explicit abilities; display text never grants a gameplay effect.
 * Rules: https://www.yugioh-card.com/eu/play/damage-step-rules/
 */
import {
  getSkyscraperDamageCalculationBoost, getSanctuaryBattleDamagePreventions,
  getDarkCityDamageCalculationBoost, getShienDamageCalculationReduction,
  getCanyonBattleDamageDoubling, getTempleBattleDamageChanges
} from './AdvancedFieldSpellRules.js';

function applyFieldBattleDamageRules(attacker, defender, result, defense, fieldContext) {
  // Konami FAQ 23824: zero damage (06), doubling (08), fixed value (09).
  // Sanctuary therefore wins over Canyon/Temple, and Temple wins over Canyon.
  const sanctuaryPreventions = getSanctuaryBattleDamagePreventions(attacker, defender, result, defense, fieldContext);
  if (sanctuaryPreventions.length) {
    result.sanctuaryPreventions = sanctuaryPreventions;
    for (const prevented of sanctuaryPreventions) result[`${prevented.participant}Damage`] = 0;
  }
  const canyonDamageModification = getCanyonBattleDamageDoubling(attacker, defender, result, defense, fieldContext);
  if (canyonDamageModification) {
    result.canyonDamageModification = canyonDamageModification;
    result.attackerDamage = canyonDamageModification.modifiedDamage;
  }
  const templeDamageChanges = getTempleBattleDamageChanges(attacker, defender, result, defense, fieldContext);
  if (templeDamageChanges.length) {
    result.templeDamageChanges = templeDamageChanges;
    for (const changed of templeDamageChanges) result[`${changed.participant}Damage`] = changed.modifiedDamage;
  }
  return result;
}

export function calculateBattleOutcome(attacker, defender, defense = null, fieldContext = {}) {
  const result = {
    attackerDamage: 0,
    defenderDamage: 0,
    attackerDestroyed: false,
    defenderDestroyed: false
  };
  const shienReduction = getShienDamageCalculationReduction(attacker, defender, defense, fieldContext);
  const comparisonContext = { ...fieldContext,
    attackerAtkForComparison: shienReduction?.calculatedAtk ?? attacker.getAtk() };
  const skyscraperBoost = getSkyscraperDamageCalculationBoost(attacker, defender, defense, comparisonContext);
  const darkCityBoost = getDarkCityDamageCalculationBoost(attacker, defender, defense, comparisonContext);
  // Keep additive changes together before the final zero floor. Flooring the
  // reduction first would wrongly turn 200 - 500 + 1000 into 1000, not 700.
  const attack = Math.max(0, attacker.getAtk() - (shienReduction?.reduction || 0)
    + (skyscraperBoost?.bonus || 0) + (darkCityBoost?.bonus || 0));
  if (skyscraperBoost) result.skyscraperBoost = { ...skyscraperBoost, calculatedAtk: attack };
  if (darkCityBoost) result.darkCityBoost = { ...darkCityBoost, calculatedAtk: attack };
  if (shienReduction) result.shienReduction = { ...shienReduction, calculatedAtk: attack };
  if (!defender) {
    result.defenderDamage = attack;
    return applyFieldBattleDamageRules(attacker, defender, result, defense, fieldContext);
  }

  const defending = defender.position === 'defense';
  const opposingStat = defending ? defender.getDef() : defender.getAtk();
  const difference = attack - opposingStat;
  if (defending) {
    if (difference > 0) {
      result.defenderDestroyed = true;
      const ownPiercing = attacker.piercingBattleDamage === true
        && !attacker.effectNegated
        && !defense?.isCardNegated(attacker.uid);
      const grantedPiercing = attacker.activeModifiers?.some(modifier => (
        modifier.type === 'piercing'
        && modifier.value !== false
        && (!modifier.sourceCardId || !defense?.isCardNegated(modifier.sourceCardId))
      ));
      if (ownPiercing || grantedPiercing) result.defenderDamage = difference;
    } else if (difference < 0) {
      result.attackerDamage = -difference;
    }
  } else if (difference > 0) {
    result.defenderDestroyed = true;
    result.defenderDamage = difference;
  } else if (difference < 0) {
    result.attackerDestroyed = true;
    result.attackerDamage = -difference;
  } else if (attack > 0) {
    // Equal positive ATK destroys both monsters. Equal 0 ATK destroys neither.
    result.attackerDestroyed = true;
    result.defenderDestroyed = true;
  }

  // Destruction protection does not prevent the battle damage itself.
  if (result.attackerDestroyed && defense?.hasProtection(
    attacker, 'DESTROY_BY_BATTLE', { attacker, defender, opposingCard: defender }
  )) result.attackerDestroyed = false;
  if (result.defenderDestroyed && defense?.hasProtection(
    defender, 'DESTROY_BY_BATTLE', { attacker, defender, opposingCard: attacker }
  )) result.defenderDestroyed = false;
  return applyFieldBattleDamageRules(attacker, defender, result, defense, fieldContext);
}

export function snapshotBattleField(entries, revision = null) {
  return {
    revision,
    monsters: entries.map(({ card }) => (
      `${card.uid}:${card.runtimeInstanceId || ''}`
    )).sort().join('|')
  };
}

export function hasBattleFieldChanged(before, after) {
  return before.monsters !== after.monsters
    || (before.revision !== null && after.revision !== null
      && before.revision !== after.revision);
}
