/**
 * Physical monster-zone geometry viewed from the player side. Opposing Main
 * Monster Zone indices run right-to-left; the two Extra Monster Zones retain
 * their shared, left-to-right indices regardless of who controls their cards.
 *
 * Arrows are a monster characteristic, not an effect: negating effects does
 * not erase them. Their orientation follows the current controller.
 */
export const LINK_ARROW_VECTORS = Object.freeze({
  top: Object.freeze([0, 1]),
  'top-right': Object.freeze([1, 1]),
  right: Object.freeze([1, 0]),
  'bottom-right': Object.freeze([1, -1]),
  bottom: Object.freeze([0, -1]),
  'bottom-left': Object.freeze([-1, -1]),
  left: Object.freeze([-1, 0]),
  'top-left': Object.freeze([-1, 1])
});

function isFaceUpLinkMonster(card) {
  return Boolean(card && !card.isSetFaceDown && (
    card.extra_type === 'link' || /\bLink\b/i.test(card.type || '')
  ));
}

/**
 * Build a read-only projection without changing cards, zones, or arrows.
 * Excluded cards model the field after summon materials have left it.
 * `links` contains directed arrows, including those pointing at empty zones;
 * `coLinks` contains reciprocal arrows between face-up Link Monsters.
 *
 * This graph does not itself authorize occupying both Extra Monster Zones.
 * Extra Link legality also needs the incoming monster and its final co-links.
 */
export function createLinkZoneGraph(field, { excludedCards = [] } = {}) {
  const excluded = new Set([...excludedCards].map(entry => entry?.card || entry));
  const zones = [];
  for (const side of ['player', 'opponent']) {
    const cards = side === 'player' ? field.playerMonsterZones : field.opponentMonsterZones;
    for (let zoneIndex = 0; zoneIndex < 5; zoneIndex += 1) {
      const sourceCard = cards?.[zoneIndex] || null;
      zones.push({
        key: `${side}:main:${zoneIndex}`,
        zoneType: 'main', zoneIndex, side, controllerId: side,
        x: side === 'player' ? zoneIndex : 4 - zoneIndex,
        y: side === 'player' ? 0 : 2,
        card: excluded.has(sourceCard) ? null : sourceCard
      });
    }
  }
  for (let zoneIndex = 0; zoneIndex < 2; zoneIndex += 1) {
    const entry = field.extraMonsterZones?.[zoneIndex];
    const card = entry?.card && !excluded.has(entry.card) ? entry.card : null;
    zones.push({
      key: `extra:${zoneIndex}`, zoneType: 'extra', zoneIndex, side: null,
      controllerId: card ? entry.controllerId : null,
      x: 1 + 2 * zoneIndex, y: 1, card
    });
  }

  const byPosition = new Map(zones.map(zone => [`${zone.x}:${zone.y}`, zone]));
  const links = new Map(zones.map(zone => [zone.key, new Set()]));
  for (const zone of zones) {
    if (!isFaceUpLinkMonster(zone.card) || !['player', 'opponent'].includes(zone.controllerId)) continue;
    const orientation = zone.controllerId === 'player' ? 1 : -1;
    for (const arrow of zone.card.linkArrows || []) {
      const vector = LINK_ARROW_VECTORS[String(arrow).trim().toLowerCase().replace(/[ _]+/g, '-')];
      if (!vector) continue;
      const target = byPosition.get(`${zone.x + vector[0] * orientation}:${zone.y + vector[1] * orientation}`);
      if (target) links.get(zone.key).add(target.key);
    }
  }

  const coLinks = new Map(zones.map(zone => [zone.key, new Set()]));
  for (const [source, targets] of links) {
    for (const target of targets) {
      if (links.get(target).has(source)) coLinks.get(source).add(target);
    }
  }
  return { zones, links, coLinks };
}

/** Empty Main Monster Zones of `side` pointed to by either player's monsters. */
export function getLinkedMainMonsterZoneIndices(field, side, options = {}) {
  if (!['player', 'opponent'].includes(side)) return [];
  const { zones, links } = createLinkZoneGraph(field, options);
  const pointedZones = new Set([...links.values()].flatMap(targets => [...targets]));
  return zones
    .filter(zone => zone.zoneType === 'main' && zone.side === side && !zone.card && pointedZones.has(zone.key))
    .map(zone => zone.zoneIndex);
}
