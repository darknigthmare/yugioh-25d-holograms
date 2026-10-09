/** Presentation of locations explicitly supplied by a native choice prompt.
 * It never resolves a card identity or reads a private board/deck projection.
 */
const LOCATIONS = new Map([[1, 'deck'], [2, 'hand'], [4, 'field'], [8, 'field'],
  [16, 'grave'], [32, 'removed'], [64, 'extra'], [128, 'overlay']]);
const validSequence = value => Number.isSafeInteger(value) && value >= 0;

export function nativeCandidateSource(ref) {
  if (validSequence(ref?.overlay_sequence)) return 'overlay';
  if (Number.isSafeInteger(ref?.location) && (ref.location & 128) !== 0) return 'overlay';
  return LOCATIONS.get(ref?.location) ?? 'unknown';
}

export function nativeCandidateContext(ref, choosingPlayer) {
  if (![0, 1].includes(ref?.controller) || ![0, 1].includes(choosingPlayer)) return '';
  const own = ref.controller === choosingPlayer;
  const sequence = validSequence(ref.sequence) ? ref.sequence : null;
  const ordinal = sequence == null ? '' : ` · Carte ${sequence + 1}`;
  const zoneOrdinal = sequence == null ? '' : ` ${sequence + 1}`;
  const position = ref.position;
  const face = Number.isSafeInteger(position) && position > 0 && position <= 15
    ? ((position & 5) !== 0 && (position & 10) === 0 ? 'face recto'
      : (position & 10) !== 0 && (position & 5) === 0 ? 'face verso' : '') : '';
  // Overlay wire position identifies material order, not its battle position.
  if (nativeCandidateSource(ref) === 'overlay') {
    const material = validSequence(ref.overlay_sequence) ? ` · Carte ${ref.overlay_sequence + 1}` : '';
    return `${own ? 'Votre Matériel Xyz' : 'Matériel Xyz adverse'}${material}`;
  }
  let context;
  switch (ref.location) {
    // Deck order and opposing hand references never become visible ordinals.
    case 1: return own ? 'Votre Deck' : 'Deck adverse';
    case 2: return own ? `Votre main${ordinal}` : 'Main adverse';
    case 4: {
      const zone = sequence != null && sequence >= 5 && sequence <= 6
        ? `Zone Monstre Extra ${own ? sequence - 4 : 7 - sequence}` : `Zone Monstre${zoneOrdinal}`;
      const stance = position === 1 || position === 2 ? 'Attaque'
        : position === 4 || position === 8 ? 'Défense' : '';
      context = `${own ? 'Votre' : 'Adversaire —'} ${zone}`;
      return `${context}${stance || face ? ` · ${[stance, face].filter(Boolean).join(' ')}` : ''}`;
    }
    case 8: {
      const zone = sequence === 5 ? 'Zone Terrain' : sequence === 6 || sequence === 7
        ? `Zone Pendule ${sequence - 5}` : `Zone Magie/Piège${zoneOrdinal}`;
      context = `${own ? 'Votre' : 'Adversaire —'} ${zone}`;
      break;
    }
    case 16: return `${own ? 'Votre Cimetière' : 'Cimetière adverse'}${ordinal}`;
    case 32: context = `${own ? 'Votre bannissement' : 'Bannissement adverse'}${ordinal}`; break;
    case 64: context = own ? 'Votre Extra Deck' : 'Extra Deck adverse'; break;
    case 128: context = own ? 'Votre Matériel Xyz' : 'Matériel Xyz adverse'; break;
    default: return '';
  }
  return `${context}${face ? ` · ${face}` : ''}`;
}

export function nativeCandidateLabel(name, effectText, ref, choosingPlayer) {
  return [name, nativeCandidateContext(ref, choosingPlayer), effectText].filter(Boolean).join(' — ');
}
