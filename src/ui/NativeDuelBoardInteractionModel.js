/**
 * Public spatial addresses for a core-owned choice. These deliberately carry
 * neither card identity nor a lookup into either player's private projection.
 * A wire candidate's uid remains its response index, never a rendered card uid.
 */
const SIDES = new Set(['player', 'opponent']);
const indexIn = (value, maximum) => Number.isSafeInteger(value) && value >= 0 && value <= maximum;

export function nativeBoardReference(ref, { choosingPlayer, side, sideForPlayer } = {}) {
  if (![0, 1].includes(ref?.controller) || ![0, 1].includes(choosingPlayer)) return null;
  // Material order does not identify a separate card on the playmat.
  if (Number.isSafeInteger(ref.overlay_sequence) || (Number.isSafeInteger(ref.location) && (ref.location & 128))) return null;
  const choosingSide = SIDES.has(side) ? side : choosingPlayer === 1 ? 'opponent' : 'player';
  const ownerSide = typeof sideForPlayer === 'function' ? sideForPlayer(ref.controller)
    : ref.controller === choosingPlayer ? choosingSide : choosingSide === 'player' ? 'opponent' : 'player';
  if (!SIDES.has(ownerSide)) return null;
  const target = zoneType => Object.freeze({ side: ownerSide, zoneType });
  const zone = (zoneType, zoneIndex) => Object.freeze({ side: ownerSide, zoneType, zoneIndex });
  switch (ref.location) {
    case 1: return target('deck'); // No Deck order, including one's own Deck.
    case 2: return ownerSide === 'player' && indexIn(ref.sequence, 0xffff)
      ? zone('hand', ref.sequence) : null; // The opposing hand has no visible ordinal.
    case 4:
      if (indexIn(ref.sequence, 4)) return zone('monster', ref.sequence);
      if (ref.sequence === 5 || ref.sequence === 6) return zone('extra-monster',
        ownerSide === 'player' ? ref.sequence - 5 : 6 - ref.sequence);
      return null;
    case 8:
      if (indexIn(ref.sequence, 4)) return zone('spell', ref.sequence);
      if (ref.sequence === 5) return zone('field', 0);
      // Legacy separate Pendulum zones have no equivalent slot on this MR5 mat.
      return null;
    case 16: return target('graveyard');
    case 32: return target('banished');
    case 64: return target('extra');
    default: return null;
  }
}

/** Returns selectors composed only from validated public enums and integers. */
export function nativeBoardTargetSelector(ref) {
  if (!SIDES.has(ref?.side)) return null;
  switch (ref.zoneType) {
    case 'hand': return ref.side === 'player' && indexIn(ref.zoneIndex, 0xffff)
      ? `#player-hand .card-entity[data-hand-index="${ref.zoneIndex}"]` : null;
    case 'monster': case 'spell': return indexIn(ref.zoneIndex, 4)
      ? `.card-zone[data-zone-type="${ref.zoneType}"][data-side="${ref.side}"][data-index="${ref.zoneIndex}"]` : null;
    case 'field': return ref.zoneIndex === 0
      ? `.card-zone[data-zone-type="field"][data-side="${ref.side}"][data-index="0"]` : null;
    case 'extra-monster': return indexIn(ref.zoneIndex, 1)
      ? `.card-zone[data-zone-type="extra-monster"][data-index="${ref.zoneIndex}"]` : null;
    case 'deck': case 'graveyard': case 'banished': case 'extra': return `#${ref.side}-${ref.zoneType}-zone`;
    default: return null;
  }
}

/**
 * Describe all offered answers, without touching DOM or deciding duel legality.
 * Consumers must fall back when unresolved is true, an element is missing, or a
 * pile cannot identify an individual card. Passing priority preserves typed null.
 */
export function nativeBoardDecisionTargets(request) {
  const multiple = request?.multiple === true;
  const targets = [], auxiliaryChoices = [];
  const candidates = multiple ? request?.candidates : request?.choices ?? request?.candidates;
  let unresolved = !Array.isArray(candidates) || candidates.length === 0;
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const value = !multiple && Array.isArray(request.choices) ? candidate?.value : candidate?.uid;
    const selector = nativeBoardTargetSelector(candidate?.boardRef);
    const label = candidate?.label ?? candidate?.name ?? '';
    if (selector) targets.push({ value, label, boardRef: candidate.boardRef, selector });
    else if (!multiple && value === null) auxiliaryChoices.push({ value, label });
    else unresolved = true;
  }
  return { targets, auxiliaryChoices, multiple, unresolved,
    anchorSelector: nativeBoardTargetSelector(request?.card?.boardRef ?? request?.boardRef) };
}
