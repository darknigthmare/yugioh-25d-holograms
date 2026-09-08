/**
 * Pure damage calculation shared by the player and the AI. Card scripts supply
 * explicit abilities; display text never grants a gameplay effect.
 * Rules: https://www.yugioh-card.com/eu/play/damage-step-rules/
 */
export function calculateBattleOutcome(attacker, defender, defense = null) {
  const result = {
    attackerDamage: 0,
    defenderDamage: 0,
    attackerDestroyed: false,
    defenderDestroyed: false
  };
  const attack = attacker.getAtk();
  if (!defender) {
    result.defenderDamage = attack;
    return result;
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
  return result;
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
