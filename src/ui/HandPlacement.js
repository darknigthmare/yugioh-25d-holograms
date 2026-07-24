export function getNormalSummonTributeCount(card) {
  const level = Number(card?.level) || 0;
  if (level >= 7) return 2;
  if (level >= 5) return 1;
  return 0;
}

/**
 * Projects whether a hand card may use a board zone as its destination.
 *
 * An occupied Main Monster Zone is a valid projected destination only for a
 * Tribute Summon/Set. The engine will then require that exact occupant to be
 * included among the selected Tributes before committing the transaction.
 */
export function isHandPlacementDestinationLegal({
  card,
  zoneType,
  zoneIndex,
  occupied = false,
  controlledMonsterCount = 0
}) {
  if (!card) return false;

  if (card.card_type === 'monster' && zoneType === 'monster') {
    const tributesRequired = getNormalSummonTributeCount(card);
    if (controlledMonsterCount < tributesRequired) return false;
    return !occupied || tributesRequired > 0;
  }

  const canUseSpellZone = (
    card.card_type !== 'monster'
    || (
      card.isPendulumMonster
      && [0, 4].includes(Number(zoneIndex))
    )
  );
  return zoneType === 'spell' && canUseSpellZone && !occupied;
}
