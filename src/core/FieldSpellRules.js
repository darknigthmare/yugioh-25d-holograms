export const FIELD_SPELL_ACTIVATION_STATES = Object.freeze({
  SET: 'set',
  PENDING: 'pending',
  RESOLVED: 'resolved'
});

function normalizeSubtype(value) {
  return String(value || '').trim().toLocaleLowerCase('en');
}

/**
 * Field Spells returned by YGOPRODeck use the generic "Spell Card" type and
 * expose their subtype through `race: "Field"`. Keep one canonical predicate
 * so gameplay and presentation never have to infer the subtype from a
 * translated card name.
 */
export function isFieldSpellCard(card) {
  if (!card || card.card_type !== 'spell') return false;
  if (card.isFieldSpell === true) return true;

  const race = normalizeSubtype(card.race);
  if (race === 'field' || race === 'terrain') return true;

  return /\bfield spell(?: card)?\b/i.test(String(card.type || ''));
}

export function clearFieldSpellActivation(card) {
  if (!card) return false;
  card.fieldActivationState = null;
  card.fieldActivationSequence = 0;
  card.fieldActivationRuntimeInstanceId = null;
  return true;
}

export function markFieldSpellSet(card) {
  if (!isFieldSpellCard(card)) return false;
  card.fieldActivationState = FIELD_SPELL_ACTIVATION_STATES.SET;
  card.fieldActivationSequence = 0;
  card.fieldActivationRuntimeInstanceId = card.runtimeInstanceId || null;
  card.resolvedSuccessfully = false;
  card.appliedAnything = false;
  return true;
}

export function markFieldSpellPending(card) {
  if (!isFieldSpellCard(card)) return false;
  card.fieldActivationState = FIELD_SPELL_ACTIVATION_STATES.PENDING;
  card.fieldActivationSequence = 0;
  card.fieldActivationRuntimeInstanceId = card.runtimeInstanceId || null;
  card.activationNegated = false;
  card.resolvedSuccessfully = false;
  card.appliedAnything = false;
  return true;
}

export function markFieldSpellResolved(card, sequence) {
  if (
    !isFieldSpellCard(card)
    || !Number.isSafeInteger(sequence)
    || sequence <= 0
  ) return false;

  card.fieldActivationState = FIELD_SPELL_ACTIVATION_STATES.RESOLVED;
  card.fieldActivationSequence = sequence;
  card.fieldActivationRuntimeInstanceId = card.runtimeInstanceId || null;
  card.activationNegated = false;
  card.resolvedSuccessfully = true;
  card.appliedAnything = true;
  return true;
}

export function hasResolvedFieldSpellActivation(card) {
  if (!card || card.hidden === true) return false;
  if (card.isSetFaceDown === true || card.faceDown === true) return false;
  if (card.location !== 'field_zone') return false;
  if (card.fieldActivationState !== FIELD_SPELL_ACTIVATION_STATES.RESOLVED) {
    return false;
  }
  if (
    !Number.isSafeInteger(card.fieldActivationSequence)
    || card.fieldActivationSequence <= 0
  ) return false;
  return (
    card.fieldActivationRuntimeInstanceId !== null
    && card.fieldActivationRuntimeInstanceId === card.runtimeInstanceId
  );
}
