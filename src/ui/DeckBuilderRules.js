import { MatchEngine } from '../core/MatchEngine.js';
import { isStrictCardSupported, normalizeStrictCardId } from '../core/StrictCardRegistry.js';
import { getDeckCopyIdentity } from '../core/CardNameRules.js';

const validator = new MatchEngine();
const sections = ['mainDeck', 'extraDeck', 'sideDeck'];
const limits = { mainDeck: 60, extraDeck: 15, sideDeck: 15 };

function cardsIn(deck, section) {
  return Array.isArray(deck?.[section]) ? deck[section] : [];
}

function allCards(deck) {
  return sections.flatMap(section => cardsIn(deck, section));
}

export function getDeckBuilderCopyLimit(card, mode = 'strict') {
  if (mode === 'sandbox') return 3;
  const id = getDeckCopyIdentity(card);
  const list = validator.banlists[validator.getMatchState().banlistId];
  const contains = ids => ids.some(value => normalizeStrictCardId(value) === id);
  if (contains(list.forbidden)) return 0;
  if (contains(list.limited)) return 1;
  if (contains(list.semi_limited)) return 2;
  return 3;
}

function isSupportedInSection(card, section) {
  return isStrictCardSupported(card, section === 'mainDeck' ? 'main'
    : section === 'extraDeck' ? 'extra' : null);
}

export function canAddDeckBuilderCard(deck, card, section, mode = 'strict') {
  if (!sections.includes(section)) return { allowed: false, message: 'Choisissez une section du Deck.' };
  if (!card || (mode !== 'sandbox' && !isSupportedInSection(card, section))) {
    return { allowed: false, message: 'Cette carte ne peut pas être ajoutée à cette section en mode strict.' };
  }
  if (section !== 'sideDeck'
    && validator.belongsInExtraDeck(card) !== (section === 'extraDeck')) {
    return { allowed: false, message: 'Cette carte appartient à une autre section du Deck.' };
  }
  const id = getDeckCopyIdentity(card);
  const count = allCards(deck).filter(value => getDeckCopyIdentity(value) === id).length;
  const copyLimit = getDeckBuilderCopyLimit(card, mode);
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

function issueMessage(issue, deck) {
  if (issue.code === 'INVALID_MAIN_SIZE') return 'Main Deck : 40 à 60 cartes requises.';
  if (issue.code === 'INVALID_EXTRA_SIZE') return 'Extra Deck : maximum 15 cartes.';
  if (issue.code === 'INVALID_SIDE_SIZE') return 'Side Deck : maximum 15 cartes.';
  if (issue.code === 'COPY_LIMIT_EXCEEDED') {
    const name = allCards(deck).find(card => getDeckCopyIdentity(card) === String(issue.cardId))?.name
      || issue.cardId;
    return issue.allowed === 0 ? `${name} est interdite dans la liste Advanced actuelle.`
      : `${name} : maximum ${issue.allowed} copie${issue.allowed > 1 ? 's' : ''} dans Main, Extra et Side.`;
  }
  if (issue.code === 'UNSUPPORTED_STRICT_CARD') return 'Une carte du Deck n’est pas disponible en mode strict.';
  return 'Une carte se trouve dans une section de Deck incorrecte.';
}

/** Uses the same section and combined copy rules as Match registration. */
export function validateCustomDeck(deck, mode = 'strict') {
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
