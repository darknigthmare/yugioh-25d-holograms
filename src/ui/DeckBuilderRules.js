import { MatchEngine } from '../core/MatchEngine.js';
import { isStrictCardSupported, normalizeStrictCardId } from '../core/StrictCardRegistry.js';
import { getDeckCopyIdentity } from '../core/CardNameRules.js';
import {
  getNativeCardRegistration, getNativeFieldEligibility, isNativeCardSupported,
  NATIVE_FIELD_RESTRICTIONS
} from '../core/native/NativeCardRegistry.js';

const validator = new MatchEngine();
const sections = ['mainDeck', 'extraDeck', 'sideDeck'];
const limits = { mainDeck: 60, extraDeck: 15, sideDeck: 15 };

function cardsIn(deck, section) {
  return Array.isArray(deck?.[section]) ? deck[section] : [];
}

function allCards(deck) {
  return sections.flatMap(section => cardsIn(deck, section));
}

function copyIdentity(card, mode, options = {}) {
  return mode === 'native' && typeof options.getCopyIdentity === 'function'
    ? normalizeStrictCardId(options.getCopyIdentity(card)) : getDeckCopyIdentity(card);
}

export function getDeckBuilderCopyLimit(card, mode = 'strict', options = {}) {
  if (mode === 'sandbox' || mode === 'native') return 3;
  const id = getDeckCopyIdentity(card);
  if (options.native) {
    const field = NATIVE_FIELD_RESTRICTIONS.get(id);
    if (field) {
      const status = options.format === 'OCG' ? field.ocgStatus : field.tcgStatus;
      if (status === 'Forbidden') return 0;
      if (status === 'Limited') return 1;
      if (status === 'Semi-Limited') return 2;
      return 3;
    }
  }
  const list = validator.banlists[validator.getMatchState().banlistId];
  const contains = ids => ids.some(value => normalizeStrictCardId(value) === id);
  if (contains(list.forbidden)) return 0;
  if (contains(list.limited)) return 1;
  if (contains(list.semi_limited)) return 2;
  return 3;
}

function isSupportedInSection(card, section, native = false, cataloguePredicate = null) {
  const supported = native ? isNativeCardSupported : isStrictCardSupported;
  const expectedSection = section === 'mainDeck' ? 'main'
    : section === 'extraDeck' ? 'extra' : null;
  return cataloguePredicate ? cataloguePredicate(card, expectedSection) === true
    : supported(card, expectedSection);
}

export function canAddDeckBuilderCard(deck, card, section, mode = 'strict', options = {}) {
  const native = mode === 'native' || options.native === true;
  const cataloguePredicate = mode === 'native' && typeof options.isSupportedCard === 'function'
    ? options.isSupportedCard : null;
  if (!sections.includes(section)) return { allowed: false, message: 'Choisissez une section du Deck.' };
  if (!card || (mode !== 'sandbox' && !isSupportedInSection(card, section, native, cataloguePredicate))) {
    return { allowed: false, message: native
      ? 'Cette carte ne peut pas être ajoutée à cette section dans le moteur natif.'
      : 'Cette carte ne peut pas être ajoutée à cette section en mode strict.' };
  }
  if (native && mode === 'strict') {
    const eligibility = getNativeFieldEligibility(card, options.format ?? 'TCG', options);
    if (!eligibility.allowed) return eligibility;
  }
  if (section !== 'sideDeck'
    && validator.belongsInExtraDeck(card) !== (section === 'extraDeck')) {
    return { allowed: false, message: 'Cette carte appartient à une autre section du Deck.' };
  }
  const id = copyIdentity(card, mode, options);
  const count = allCards(deck).filter(value => copyIdentity(value, mode, options) === id).length;
  const copyLimit = getDeckBuilderCopyLimit(card, mode, options);
  if (count >= copyLimit) {
    return { allowed: false, copyLimit, message: copyLimit === 0
      ? `${card.name} est interdite dans la liste Advanced actuelle.`
      : `${card.name} : ${copyLimit} copie${copyLimit > 1 ? 's' : ''} au total dans Main, Extra et Side.` };
  }
  if (cardsIn(deck, section).length >= limits[section]) {
    return { allowed: false, copyLimit, message: `${section === 'mainDeck' ? 'Main' : section === 'extraDeck' ? 'Extra' : 'Side'} Deck : maximum ${limits[section]} cartes.` };
  }
  return { allowed: true, copyLimit, count };
}

function issueMessage(issue, deck, mode, options) {
  if (issue.code === 'INVALID_MAIN_SIZE') return 'Main Deck : 40 à 60 cartes requises.';
  if (issue.code === 'INVALID_EXTRA_SIZE') return 'Extra Deck : maximum 15 cartes.';
  if (issue.code === 'INVALID_SIDE_SIZE') return 'Side Deck : maximum 15 cartes.';
  if (issue.code === 'COPY_LIMIT_EXCEEDED') {
    const name = allCards(deck).find(card => copyIdentity(card, mode, options) === String(issue.cardId))?.name
      || issue.cardId;
    return issue.allowed === 0 ? `${name} est interdite dans la liste Advanced actuelle.`
      : `${name} : maximum ${issue.allowed} copie${issue.allowed > 1 ? 's' : ''} dans Main, Extra et Side.`;
  }
  if (issue.code === 'UNSUPPORTED_STRICT_CARD') return 'Une carte du Deck n’est pas disponible en mode strict.';
  if (issue.code === 'UNSUPPORTED_NATIVE_CARD') return 'Une carte du Deck n’est pas disponible dans le moteur natif.';
  if (issue.code.startsWith('FIELD_')) return issue.message;
  return 'Une carte se trouve dans une section de Deck incorrecte.';
}

/** Uses the same section and combined copy rules as Match registration. */
export function validateCustomDeck(deck, mode = 'strict', options = {}) {
  const native = mode === 'native' || options.native === true;
  if (native && mode !== 'sandbox') return validateNativeCustomDeck(deck, mode, options);
  const validation = mode === 'sandbox'
    ? validator.validateDeck(deck, 'TCG_ADVANCED', 'BUILDER_SANDBOX_UNLIMITED')
    : validator.validateDeck(deck);
  const issues = [...validation.issues];
  if (mode !== 'sandbox') {
    for (const section of sections) {
      cardsIn(deck, section).forEach((card, index) => {
        if (!isSupportedInSection(card, section)) {
          issues.push({ code: 'UNSUPPORTED_STRICT_CARD', section, index });
        }
      });
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    message: issues.length ? issueMessage(issues[0], deck) : 'Deck valide'
  };
}

function validateNativeCustomDeck(deck, mode, options) {
  // Reuse Match section, size and shape checks. Copy restrictions are evaluated
  // below using the native field snapshot and existing non-field Advanced list.
  const validation = validator.validateDeck(deck, 'TCG_ADVANCED', 'BUILDER_SANDBOX_UNLIMITED');
  const issues = validation.issues.filter(issue => issue.code !== 'COPY_LIMIT_EXCEEDED');
  const counts = new Map();
  const allowedByIdentity = new Map();
  const cataloguePredicate = mode === 'native' && typeof options.isSupportedCard === 'function'
    ? options.isSupportedCard : null;
  for (const section of sections) {
    cardsIn(deck, section).forEach((card, index) => {
      const supported = isSupportedInSection(card, section, true, cataloguePredicate);
      if (!supported) {
        issues.push({ code: 'UNSUPPORTED_NATIVE_CARD', section, index });
      } else if (mode === 'strict') {
        const eligibility = getNativeFieldEligibility(card, options.format ?? 'TCG', options);
        if (!eligibility.allowed) issues.push({ ...eligibility, section, index, cardId: normalizeStrictCardId(card.id) });
      }
      if (!card || (!getNativeCardRegistration(card) && !supported)) return;
      const identity = copyIdentity(card, mode, options);
      counts.set(identity, (counts.get(identity) ?? 0) + 1);
      const limit = getDeckBuilderCopyLimit(card, mode, options);
      allowedByIdentity.set(identity, Math.min(allowedByIdentity.get(identity) ?? 3, limit));
    });
  }
  for (const [cardId, found] of counts) {
    const allowed = allowedByIdentity.get(cardId);
    if (found > allowed) issues.push({ code: 'COPY_LIMIT_EXCEEDED', cardId, found, allowed });
  }
  return { valid: issues.length === 0, issues, message: issues.length ? issueMessage(issues[0], deck, mode, options) : 'Deck valide' };
}
