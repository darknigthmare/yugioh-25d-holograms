import { getNativeCardRegistration, getNativeFieldEligibility } from '../native/NativeCardRegistry.js';
import { OcgScope as S, OcgType as T } from '../native/vendor/ocgcore/index.js';
import {
  getTcgAdvancedRestriction, getTcgSnapshotCopyIdentity,
  CURRENT_TCG_BANLIST_ID, TCG_FORMAT_SNAPSHOT_DATE
} from './TcgAdvancedFormat.js';

const extraMask = T.FUSION | T.SYNCHRO | T.XYZ | T.LINK;
const excludedTypes = T.TOKEN | T.MAXIMUM | 0x8000000;
const excludedScopes = S.ANIME | S.ILLEGAL | S.VIDEO_GAME | S.CUSTOM | S.RUSH | S.LEGEND | S.HIDDEN;
const lookup = (map, code) => map.get(code) ?? map.get(String(code));
const failure = (code, message, evidence = 'pinned-cdb-snapshot') => ({ allowed: false, code, message, evidence });

/** Regional eligibility is evaluated from preloaded, trusted resource maps.
 * The CDB TCG bit is a provider release snapshot, not proof of every territorial
 * promo release. Explicit official Field publication dates take precedence. */
export function createTcgFormatPolicy(resources, options = {}) {
  if (!(resources?.cards instanceof Map) || !(resources.metadata instanceof Map)) {
    throw new TypeError('TCG format policy requires trusted native cards and metadata Maps.');
  }
  const asOf = options.asOf ?? TCG_FORMAT_SNAPSHOT_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new TypeError('asOf must be a YYYY-MM-DD date.');
  if (asOf < '2026-09-21' || asOf > TCG_FORMAT_SNAPSHOT_DATE) {
    throw new RangeError('The verified current TCG snapshot covers 2026-09-21 through 2026-10-08.');
  }
  const bindings = new Map(resources.sourceCodeToCanonical ?? resources.nativeToCanonical ?? []);
  const canonical = raw => {
    const text = String(typeof raw === 'object' ? raw?.id : raw ?? '').trim();
    if (!/^\d+$/.test(text)) return null;
    let code = Number(text);
    if (!Number.isSafeInteger(code) || code <= 0) return null;
    const seen = new Set();
    while (bindings.has(code) && !seen.has(code)) { seen.add(code); code = Number(bindings.get(code)); }
    return code;
  };
  const getCopyIdentity = card => {
    const code = canonical(card); if (code === null) return null;
    const data = lookup(resources.cards, code); if (!data) return null;
    return getTcgSnapshotCopyIdentity(canonical(data.alias || data.code) ?? data.alias ?? data.code);
  };
  const getCardEligibility = (card, expectedSection = null) => {
    const code = canonical(card);
    const data = code === null ? null : lookup(resources.cards, code);
    const metadata = code === null ? null : lookup(resources.metadata, code);
    if (!data || !metadata?.name) return failure('TCG_UNKNOWN_CARD', 'Cette carte n’est pas identifiée dans le catalogue TCG de confiance.');
    if ((data.type & excludedTypes) || !(data.type & (T.MONSTER | T.SPELL | T.TRAP))
      || (Number(metadata.ot) & excludedScopes)) {
      return failure('TCG_INVALID_CARD_TYPE', `${metadata.name} n’est pas une carte admissible à un Deck TCG Advanced.`);
    }
    const extra = Boolean(data.type & extraMask);
    if (!['main', 'extra', 'side', null].includes(expectedSection)) {
      return failure('TCG_INCORRECT_DECK_SECTION', 'Cette section de Deck est inconnue.');
    }
    if (expectedSection && expectedSection !== 'side' && extra !== (expectedSection === 'extra')) {
      return failure('TCG_INCORRECT_DECK_SECTION', `${metadata.name} appartient au ${extra ? 'Extra' : 'Main'} Deck.`);
    }
    const registration = getNativeCardRegistration(code);
    if (registration?.isFieldSpell) {
      const eligibility = getNativeFieldEligibility(code, 'TCG', { asOf });
      if (!eligibility.allowed) return eligibility;
      if (eligibility.evidence === 'primary-publication') return eligibility;
    }
    if (!(Number(metadata.ot) & S.TCG)) {
      return failure('TCG_NOT_RELEASED', `${metadata.name} : aucune sortie TCG confirmée dans le relevé actuel.`);
    }
    // A new illustration of an already released passcode is immediately legal;
    // a genuinely new prerelease card needs an explicit official release date.
    if ((Number(metadata.ot) & S.PRERELEASE) || /^prerelease-/i.test(metadata.sourceDatabase ?? '')) {
      const identity = Number(getCopyIdentity(card));
      const released = lookup(resources.metadata, identity);
      if (!released || !(Number(released.ot) & S.TCG) || (Number(released.ot) & S.PRERELEASE)
        || /^prerelease-/i.test(released.sourceDatabase ?? '')) {
        return failure('TCG_PRERELEASE_UNVERIFIED', `${metadata.name} : publication TCG annoncée ou non confirmée, carte indisponible en Advanced.`);
      }
    }
    return { allowed: true, evidence: 'pinned-cdb-tcg-scope', asOf };
  };
  const getCardRestriction = (card, banlistId = CURRENT_TCG_BANLIST_ID) => {
    if (banlistId !== CURRENT_TCG_BANLIST_ID) return null;
    const identity = getCopyIdentity(card);
    return identity === null ? null : getTcgAdvancedRestriction(identity, { asOf }).copyLimit;
  };
  return Object.freeze({ asOf, getCopyIdentity, getCardEligibility, getCardRestriction,
    isTcgEligible: (card, expectedSection = null) => getCardEligibility(card, expectedSection).allowed });
}
