/**
 * Visual-only registry used by the immersive duel view.
 *
 * Card names are deliberately absent from the lookup path: a translated or
 * user-facing name must never change which environment is selected.
 */

import { isFieldSpellCard } from '../core/FieldSpellRules.js';

export const DEFAULT_FIELD_ENVIRONMENT_ID = 'clearing';
export const FALLBACK_FIELD_ENVIRONMENT_ID = 'generic';

function freezeEnvironment(config) {
  return Object.freeze({
    ...config,
    associatedCardIds: Object.freeze(
      [...new Set((config.associatedCardIds || []).map(normalizeCardId).filter(Boolean))]
    ),
    props: Object.freeze([...(config.props || [])]),
    lighting: Object.freeze({ ...(config.lighting || {}) }),
    fog: Object.freeze({ ...(config.fog || {}) }),
    particles: Object.freeze({ ...(config.particles || {}) })
  });
}

export function normalizeCardId(value) {
  const normalized = String(value ?? '').trim();
  return /^\d{1,12}$/.test(normalized) ? normalized : null;
}

const environments = [
  {
    id: 'clearing',
    associatedCardIds: [],
    displayName: 'Clairière KaibaCorp',
    cssClass: 'field-environment-clearing',
    background: 'woodland-day',
    ground: 'natural-clearing',
    arenaMaterial: 'kaibacorp-steel',
    props: ['trees', 'shrubs', 'rocks'],
    lighting: { ambient: '#9fc7bc', directional: '#e4f5df', intensity: 0.9 },
    fog: { color: '#718e86', density: 0.08 },
    particles: { type: 'pollen', density: 0.16 },
    environmentTint: '#6f9881',
    accentColor: '#00ffff',
    transitionDuration: 800
  },
  {
    id: 'cave',
    associatedCardIds: [],
    displayName: 'Grotte / Ruines',
    cssClass: 'field-environment-cave',
    background: 'cave-ruins',
    ground: 'ancient-stone',
    arenaMaterial: 'weathered-holographic-stone',
    props: ['rock-walls', 'roots', 'ruined-platforms'],
    lighting: { ambient: '#63758f', directional: '#9bc4da', intensity: 0.58 },
    fog: { color: '#506176', density: 0.22 },
    particles: { type: 'mist', density: 0.24 },
    environmentTint: '#52657d',
    accentColor: '#67d5ff',
    transitionDuration: 900
  },
  {
    id: 'generic',
    associatedCardIds: [],
    displayName: 'Terrain holographique',
    cssClass: 'field-environment-generic',
    background: 'holographic-void',
    ground: 'neutral-hologrid',
    arenaMaterial: 'neutral-hologram',
    props: ['holographic-pillars'],
    lighting: { ambient: '#7285aa', directional: '#d6e7ff', intensity: 0.72 },
    fog: { color: '#283650', density: 0.12 },
    particles: { type: 'holographic-dust', density: 0.18 },
    environmentTint: '#61759b',
    accentColor: '#79d9ff',
    transitionDuration: 700
  },
  {
    id: 'yami',
    associatedCardIds: ['59197169'],
    displayName: 'Yami',
    cssClass: 'field-environment-yami',
    background: 'occult-night',
    ground: 'shadow-sanctum',
    arenaMaterial: 'dark-hologram',
    props: ['occult-glyphs', 'shadow-pillars'],
    lighting: { ambient: '#291841', directional: '#a36cff', intensity: 0.55 },
    fog: { color: '#1c102e', density: 0.28 },
    particles: { type: 'shadow-motes', density: 0.2 },
    environmentTint: '#4d276f',
    accentColor: '#c36cff',
    transitionDuration: 900
  },
  {
    id: 'umi',
    associatedCardIds: ['22702055'],
    displayName: 'Umi',
    cssClass: 'field-environment-umi',
    background: 'open-ocean',
    ground: 'ocean-surface',
    arenaMaterial: 'aquatic-hologram',
    props: ['water-plane', 'distant-waves'],
    lighting: { ambient: '#316d93', directional: '#c5f5ff', intensity: 0.78 },
    fog: { color: '#6ea5b7', density: 0.2 },
    particles: { type: 'sea-spray', density: 0.22 },
    environmentTint: '#267ca5',
    accentColor: '#35d9ff',
    transitionDuration: 850
  },
  {
    id: 'forest',
    associatedCardIds: ['87430998'],
    displayName: 'Forest',
    cssClass: 'field-environment-forest',
    background: 'dense-forest',
    ground: 'forest-floor',
    arenaMaterial: 'verdant-hologram',
    props: ['dense-trees', 'vines', 'ferns'],
    lighting: { ambient: '#315d3f', directional: '#baff9f', intensity: 0.72 },
    fog: { color: '#3c6649', density: 0.17 },
    particles: { type: 'leaves', density: 0.16 },
    environmentTint: '#3f7a4d',
    accentColor: '#62ff7c',
    transitionDuration: 850
  },
  {
    id: 'mountain',
    associatedCardIds: ['50913601'],
    displayName: 'Mountain',
    cssClass: 'field-environment-mountain',
    background: 'stormy-peaks',
    ground: 'mountain-rock',
    arenaMaterial: 'storm-hologram',
    props: ['cliffs', 'distant-peaks', 'storm-clouds'],
    lighting: { ambient: '#68748a', directional: '#e9f0ff', intensity: 0.74 },
    fog: { color: '#9aa6b7', density: 0.2 },
    particles: { type: 'wind-streaks', density: 0.14 },
    environmentTint: '#78869b',
    accentColor: '#b8d5ff',
    transitionDuration: 900
  },
  {
    id: 'sogen',
    associatedCardIds: ['86318356'],
    displayName: 'Sogen',
    cssClass: 'field-environment-sogen',
    background: 'open-grassland',
    ground: 'windy-grass',
    arenaMaterial: 'plains-hologram',
    props: ['grass-banks', 'distant-banners'],
    lighting: { ambient: '#78966c', directional: '#fff4bf', intensity: 0.9 },
    fog: { color: '#b7c69f', density: 0.08 },
    particles: { type: 'grass-seeds', density: 0.12 },
    environmentTint: '#83a26f',
    accentColor: '#d8ff8d',
    transitionDuration: 750
  },
  {
    id: 'wasteland',
    associatedCardIds: ['23424603'],
    displayName: 'Wasteland',
    cssClass: 'field-environment-wasteland',
    background: 'ruined-desert',
    ground: 'cracked-earth',
    arenaMaterial: 'dust-hologram',
    props: ['ruins', 'dead-trees', 'rock-spires'],
    lighting: { ambient: '#8d654c', directional: '#ffd09b', intensity: 0.84 },
    fog: { color: '#b47b56', density: 0.15 },
    particles: { type: 'dust', density: 0.2 },
    environmentTint: '#9b6849',
    accentColor: '#ff9f61',
    transitionDuration: 850
  },
  {
    id: 'toon-world',
    // Toon World (15259703) is a Continuous Spell, not a Field Spell. Keep
    // this procedural theme available for an explicit future presentation
    // option, but never select it from Toon World's card ID.
    associatedCardIds: [],
    displayName: 'Toon World',
    cssClass: 'field-environment-toon-world',
    background: 'toon-pop-up',
    ground: 'storybook-stage',
    arenaMaterial: 'toon-hologram',
    props: ['pop-up-castle', 'paper-clouds', 'storybook-trees'],
    lighting: { ambient: '#ff86d8', directional: '#fff3a8', intensity: 0.92 },
    fog: { color: '#bd8cff', density: 0.05 },
    particles: { type: 'toon-stars', density: 0.18 },
    environmentTint: '#e86ec7',
    accentColor: '#fff16b',
    transitionDuration: 700
  }
].map(freezeEnvironment);

export const FIELD_ENVIRONMENT_REGISTRY = Object.freeze(
  Object.fromEntries(environments.map(environment => [environment.id, environment]))
);

const environmentByCardId = new Map();
for (const environment of environments) {
  for (const cardId of environment.associatedCardIds) {
    environmentByCardId.set(cardId, environment);
  }
}

export function getFieldEnvironment(environmentId) {
  const normalizedId = String(environmentId ?? '').trim().toLowerCase();
  return FIELD_ENVIRONMENT_REGISTRY[normalizedId] || null;
}

export function getFieldEnvironmentForCardId(cardId) {
  return environmentByCardId.get(normalizeCardId(cardId)) || null;
}

function getCardFromCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  if (candidate.card && typeof candidate.card === 'object') return candidate.card;
  return candidate;
}

function readFiniteSequence(candidate, card) {
  const values = [
    candidate?.fieldActivationSequence,
    candidate?.activationSequence,
    candidate?.resolutionSequence,
    candidate?.resolvedSequence,
    candidate?.sequence,
    card?.fieldActivationSequence,
    card?.activationSequence,
    card?.resolutionSequence,
    card?.resolvedSequence,
    card?.sequence
  ];
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const sequence = Number(value);
    if (Number.isFinite(sequence)) return sequence;
  }
  return Number.NEGATIVE_INFINITY;
}

function isCandidateFaceUpAndResolved(candidate, card, fromFieldZone) {
  const states = [candidate, card];
  if (states.some(state => (
    state?.hidden === true
    || state?.redacted === true
    || state?.concealed === true
    || state?.public === false
    || String(state?.visibility ?? '').trim().toLowerCase() === 'hidden'
    || String(state?.visibility ?? '').trim().toLowerCase() === 'private'
  ))) {
    return false;
  }
  if (states.some(state => (
    state?.isSetFaceDown === true
    || state?.isFaceDown === true
    || state?.faceDown === true
  ))) {
    return false;
  }
  if (states.some(state => (
    state?.activationPending === true
    || state?.isPendingActivation === true
    || state?.pendingResolution === true
    || state?.activationResolved === false
    || state?.resolved === false
    || state?.resolvedSuccessfully === false
    || state?.activationNegated === true
    || state?.isActivationNegated === true
  ))) {
    return false;
  }
  if (states.some(state => state?.active === false)) return false;
  if (states.some(state => (
    state?.fieldActivationState !== undefined
    && state?.fieldActivationState !== null
    && String(state.fieldActivationState).toLowerCase() !== 'resolved'
  ))) {
    return false;
  }
  if (
    card?.fieldActivationRuntimeInstanceId !== undefined
    && card?.fieldActivationRuntimeInstanceId !== null
    && card?.runtimeInstanceId !== undefined
    && card.fieldActivationRuntimeInstanceId !== card.runtimeInstanceId
  ) {
    return false;
  }

  const location = String(card?.location ?? candidate?.location ?? '').trim().toLowerCase();
  if (location && !['field_zone', 'field-zone', 'field'].includes(location)) return false;

  // A direct FieldState zone reference is authoritative. Generic candidate
  // arrays must explicitly identify themselves as active/resolved or located
  // in the Field Zone.
  if (!fromFieldZone && !location) {
    return states.some(state => (
      state?.active === true
      || state?.activationResolved === true
      || state?.resolved === true
      || state?.resolvedSuccessfully === true
    ));
  }
  return true;
}

function isFieldSpellCandidate(candidate, card) {
  const cardType = card?.card_type ?? card?.cardType ?? candidate?.card_type
    ?? candidate?.cardType;
  const type = card?.type ?? candidate?.type;
  const race = card?.race ?? candidate?.race;
  const explicitFieldSpell = card?.isFieldSpell === true
    || candidate?.isFieldSpell === true;

  return isFieldSpellCard({
    card_type: cardType,
    type,
    race,
    isFieldSpell: explicitFieldSpell
  });
}

function collectRawCandidates(gameState) {
  if (!gameState || typeof gameState !== 'object') return [];

  const candidates = [];
  const add = (candidate, fromFieldZone, sourceRank) => {
    if (candidate && typeof candidate === 'object') {
      candidates.push({ candidate, fromFieldZone, sourceRank });
    }
  };

  add(gameState.playerFieldSpell, true, 0);
  add(gameState.opponentFieldSpell, true, 1);

  const field = gameState.field;
  if (field && typeof field === 'object') {
    add(field.playerFieldSpellZone, true, 0);
    add(field.opponentFieldSpellZone, true, 1);
  }

  const explicitCandidates = Array.isArray(gameState.activeFieldSpells)
    ? gameState.activeFieldSpells
    : (Array.isArray(field?.activeFieldSpells) ? field.activeFieldSpells : []);
  explicitCandidates.forEach((candidate, index) => add(candidate, false, index + 2));

  return candidates;
}

function collectActiveCandidates(gameState) {
  const normalizedCandidates = [];
  const seenObjects = new Set();
  const seenStableKeys = new Set();

  for (const entry of collectRawCandidates(gameState)) {
    const card = getCardFromCandidate(entry.candidate);
    if (!card || seenObjects.has(card)) continue;

    const cardId = normalizeCardId(card.id ?? card.cardId ?? card.passcode);
    if (
      !cardId
      || !isFieldSpellCandidate(entry.candidate, card)
      || !isCandidateFaceUpAndResolved(entry.candidate, card, entry.fromFieldZone)
    ) {
      continue;
    }

    const sequence = readFiniteSequence(entry.candidate, card);
    const uid = String(card.uid ?? card.instanceId ?? '').trim();
    const stableKey = uid
      ? `uid:${uid}`
      : `${cardId}:${sequence}:${entry.sourceRank}`;
    if (seenStableKeys.has(stableKey)) continue;

    seenObjects.add(card);
    seenStableKeys.add(stableKey);
    normalizedCandidates.push({
      card,
      cardId,
      uid: uid || null,
      sequence,
      sourceRank: entry.sourceRank
    });
  }
  return normalizedCandidates;
}

function compareCandidates(left, right) {
  if (left.sequence !== right.sequence) return left.sequence - right.sequence;
  if (left.sourceRank !== right.sourceRank) return left.sourceRank - right.sourceRank;
  if (left.cardId !== right.cardId) return left.cardId.localeCompare(right.cardId);
  return String(left.uid ?? '').localeCompare(String(right.uid ?? ''));
}

/**
 * Return an immutable selection containing both the visual environment and
 * non-sensitive provenance useful for avoiding redundant DOM transitions.
 */
export function resolveFieldEnvironmentSelection(gameState, options = {}) {
  const baseEnvironment = getFieldEnvironment(options.baseEnvironmentId)
    || FIELD_ENVIRONMENT_REGISTRY[DEFAULT_FIELD_ENVIRONMENT_ID];
  const fallbackEnvironment = getFieldEnvironment(options.fallbackEnvironmentId)
    || FIELD_ENVIRONMENT_REGISTRY[FALLBACK_FIELD_ENVIRONMENT_ID];
  const candidates = collectActiveCandidates(gameState).sort(compareCandidates);
  const selected = candidates.at(-1) || null;

  if (!selected) {
    return Object.freeze({
      environment: baseEnvironment,
      environmentId: baseEnvironment.id,
      sourceCardId: null,
      sourceUid: null,
      sequence: null,
      isFallback: false
    });
  }

  const mappedEnvironment = getFieldEnvironmentForCardId(selected.cardId);
  const environment = mappedEnvironment || fallbackEnvironment;
  return Object.freeze({
    environment,
    environmentId: environment.id,
    sourceCardId: selected.cardId,
    sourceUid: selected.uid,
    sequence: Number.isFinite(selected.sequence) ? selected.sequence : null,
    isFallback: !mappedEnvironment
  });
}

export function resolveFieldEnvironment(gameState, options = {}) {
  return resolveFieldEnvironmentSelection(gameState, options).environment;
}
