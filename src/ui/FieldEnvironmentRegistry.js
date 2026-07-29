/**
 * Visual-only registry used by the immersive duel view.
 *
 * Card names are deliberately absent from the lookup path: a translated or
 * user-facing name must never change which environment is selected.
 */

import { isFieldSpellCard } from '../core/FieldSpellRules.js';
import { FIELD_SPELL_CARD_IDS_BY_ENVIRONMENT } from './FieldSpellEnvironmentCatalog.js';

export const DEFAULT_FIELD_ENVIRONMENT_ID = 'clearing';
export const FALLBACK_FIELD_ENVIRONMENT_ID = 'generic';

function normalizeBackdropUrl(value) {
  const publicUrl = String(value ?? '').trim();
  if (!/^\/environments\/[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/.test(publicUrl)) {
    throw new TypeError(`Invalid Field environment backdrop URL: ${value}`);
  }
  return publicUrl;
}

function freezeEnvironment(config) {
  return Object.freeze({
    ...config,
    backdropUrl: normalizeBackdropUrl(config.backdropUrl),
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
  if (!/^\d{1,12}$/.test(normalized)) return null;
  return normalized.replace(/^0+(?=\d)/, '');
}

const cardIds = environmentId => (
  FIELD_SPELL_CARD_IDS_BY_ENVIRONMENT[environmentId] || []
);

const environments = [
  {
    id: 'clearing',
    associatedCardIds: [],
    displayName: 'Clairière KaibaCorp',
    cssClass: 'field-environment-clearing',
    backdropUrl: '/environments/kaibacorp-clearing-original.webp',
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
    associatedCardIds: cardIds('cave'),
    displayName: 'Grotte / Ruines',
    cssClass: 'field-environment-cave',
    backdropUrl: '/environments/cave-ruins-original.webp',
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
    associatedCardIds: cardIds('generic'),
    displayName: 'Terrain holographique',
    cssClass: 'field-environment-generic',
    backdropUrl: '/environments/field-abstract-arcane-original.webp',
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
    associatedCardIds: cardIds('yami'),
    displayName: 'Yami',
    cssClass: 'field-environment-yami',
    backdropUrl: '/environments/field-occult-dark-original.webp',
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
    associatedCardIds: cardIds('umi'),
    displayName: 'Umi',
    cssClass: 'field-environment-umi',
    backdropUrl: '/environments/field-ocean-original.webp',
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
    associatedCardIds: cardIds('forest'),
    displayName: 'Forest',
    cssClass: 'field-environment-forest',
    backdropUrl: '/environments/field-woodland-original.webp',
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
    associatedCardIds: cardIds('mountain'),
    displayName: 'Mountain',
    cssClass: 'field-environment-mountain',
    backdropUrl: '/environments/field-mountain-original.webp',
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
    associatedCardIds: cardIds('sogen'),
    displayName: 'Sogen',
    cssClass: 'field-environment-sogen',
    backdropUrl: '/environments/field-grassland-original.webp',
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
    associatedCardIds: cardIds('wasteland'),
    displayName: 'Wasteland',
    cssClass: 'field-environment-wasteland',
    backdropUrl: '/environments/field-desert-original.webp',
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
    associatedCardIds: cardIds('toon-world'),
    displayName: 'Toon World',
    cssClass: 'field-environment-toon-world',
    backdropUrl: '/environments/field-storybook-toon-original.webp',
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
  },
  {
    id: 'swamp',
    associatedCardIds: cardIds('swamp'),
    displayName: 'Marais',
    cssClass: 'field-environment-swamp',
    backdropUrl: '/environments/field-swamp-original.webp',
    background: 'primeval-swamp',
    ground: 'shallow-mire',
    arenaMaterial: 'verdant-hologram',
    props: ['cypress-trees', 'tangled-roots', 'bioluminescent-reeds'],
    lighting: { ambient: '#294f43', directional: '#8fc9ad', intensity: 0.58 },
    fog: { color: '#17352f', density: 0.26 },
    particles: { type: 'swamp-lights', density: 0.14 },
    environmentTint: '#355e4f',
    accentColor: '#7edfa7',
    transitionDuration: 900
  },
  {
    id: 'volcanic',
    associatedCardIds: cardIds('volcanic'),
    displayName: 'Terres volcaniques',
    cssClass: 'field-environment-volcanic',
    backdropUrl: '/environments/field-volcanic-original.webp',
    background: 'volcanic-horizon',
    ground: 'cooled-basalt',
    arenaMaterial: 'dust-hologram',
    props: ['lava-channels', 'basalt-spires', 'distant-volcanoes'],
    lighting: { ambient: '#4d2020', directional: '#ff9d62', intensity: 0.7 },
    fog: { color: '#351519', density: 0.22 },
    particles: { type: 'embers', density: 0.18 },
    environmentTint: '#6d2c26',
    accentColor: '#ff6b35',
    transitionDuration: 900
  },
  {
    id: 'ice',
    associatedCardIds: cardIds('ice'),
    displayName: 'Étendue glacée',
    cssClass: 'field-environment-ice',
    backdropUrl: '/environments/field-ice-original.webp',
    background: 'polar-twilight',
    ground: 'frosted-ice',
    arenaMaterial: 'storm-hologram',
    props: ['glacier-walls', 'ice-spires', 'aurora'],
    lighting: { ambient: '#4f72a1', directional: '#e6f7ff', intensity: 0.82 },
    fog: { color: '#8fb4cf', density: 0.18 },
    particles: { type: 'snow-crystals', density: 0.13 },
    environmentTint: '#7299bf',
    accentColor: '#8fe8ff',
    transitionDuration: 850
  },
  {
    id: 'graveyard',
    associatedCardIds: cardIds('graveyard'),
    displayName: 'Nécropole',
    cssClass: 'field-environment-graveyard',
    backdropUrl: '/environments/field-graveyard-original.webp',
    background: 'moonlit-necropolis',
    ground: 'ancient-grave-soil',
    arenaMaterial: 'dark-hologram',
    props: ['weathered-tombs', 'dead-trees', 'funerary-lanterns'],
    lighting: { ambient: '#30334a', directional: '#b9c5eb', intensity: 0.54 },
    fog: { color: '#2b2d3d', density: 0.27 },
    particles: { type: 'spirit-motes', density: 0.16 },
    environmentTint: '#4a4c64',
    accentColor: '#b7c6ff',
    transitionDuration: 900
  },
  {
    id: 'city-modern',
    associatedCardIds: cardIds('city-modern'),
    displayName: 'Métropole moderne',
    cssClass: 'field-environment-city-modern',
    backdropUrl: '/environments/field-city-modern-original.webp',
    background: 'modern-city-night',
    ground: 'urban-plaza',
    arenaMaterial: 'kaibacorp-steel',
    props: ['skyscrapers', 'elevated-roads', 'city-lights'],
    lighting: { ambient: '#3c536c', directional: '#a9d8ff', intensity: 0.72 },
    fog: { color: '#33475c', density: 0.14 },
    particles: { type: 'light-rain', density: 0.1 },
    environmentTint: '#456886',
    accentColor: '#4ed8ff',
    transitionDuration: 800
  },
  {
    id: 'city-fantasy',
    associatedCardIds: cardIds('city-fantasy'),
    displayName: 'Cité fantastique',
    cssClass: 'field-environment-city-fantasy',
    backdropUrl: '/environments/field-city-fantasy-original.webp',
    background: 'enchanted-city',
    ground: 'arcane-plaza',
    arenaMaterial: 'neutral-hologram',
    props: ['floating-towers', 'arched-bridges', 'magic-lanterns'],
    lighting: { ambient: '#5f4c82', directional: '#efd7ff', intensity: 0.75 },
    fog: { color: '#66517d', density: 0.13 },
    particles: { type: 'arcane-sparks', density: 0.15 },
    environmentTint: '#765c94',
    accentColor: '#d8a8ff',
    transitionDuration: 850
  },
  {
    id: 'castle-palace',
    associatedCardIds: cardIds('castle-palace'),
    displayName: 'Château / Palais',
    cssClass: 'field-environment-castle-palace',
    backdropUrl: '/environments/field-castle-palace-original.webp',
    background: 'royal-castle',
    ground: 'palace-courtyard',
    arenaMaterial: 'weathered-holographic-stone',
    props: ['castle-walls', 'royal-arches', 'distant-towers'],
    lighting: { ambient: '#75666b', directional: '#ffe0b3', intensity: 0.77 },
    fog: { color: '#8b7880', density: 0.1 },
    particles: { type: 'gold-dust', density: 0.1 },
    environmentTint: '#856c68',
    accentColor: '#ffd27f',
    transitionDuration: 850
  },
  {
    id: 'temple-sanctuary',
    associatedCardIds: cardIds('temple-sanctuary'),
    displayName: 'Temple / Sanctuaire',
    cssClass: 'field-environment-temple-sanctuary',
    backdropUrl: '/environments/field-temple-sanctuary-original.webp',
    background: 'sacred-sanctuary',
    ground: 'ritual-stone',
    arenaMaterial: 'weathered-holographic-stone',
    props: ['sacred-pillars', 'stone-lanterns', 'distant-shrines'],
    lighting: { ambient: '#7f7767', directional: '#fff2c7', intensity: 0.81 },
    fog: { color: '#a49b82', density: 0.11 },
    particles: { type: 'prayer-lights', density: 0.12 },
    environmentTint: '#8d856d',
    accentColor: '#ffe7a1',
    transitionDuration: 850
  },
  {
    id: 'arena-stadium',
    associatedCardIds: cardIds('arena-stadium'),
    displayName: 'Arène / Stade',
    cssClass: 'field-environment-arena-stadium',
    backdropUrl: '/environments/field-arena-stadium-original.webp',
    background: 'grand-stadium',
    ground: 'competition-floor',
    arenaMaterial: 'kaibacorp-steel',
    props: ['stadium-stands', 'floodlights', 'competition-banners'],
    lighting: { ambient: '#536273', directional: '#f4fbff', intensity: 0.88 },
    fog: { color: '#596775', density: 0.07 },
    particles: { type: 'spotlight-dust', density: 0.09 },
    environmentTint: '#607084',
    accentColor: '#7be7ff',
    transitionDuration: 750
  },
  {
    id: 'theater-amusement',
    associatedCardIds: cardIds('theater-amusement'),
    displayName: 'Théâtre / Parc',
    cssClass: 'field-environment-theater-amusement',
    backdropUrl: '/environments/field-theater-amusement-original.webp',
    background: 'fantasy-entertainment',
    ground: 'show-stage',
    arenaMaterial: 'toon-hologram',
    props: ['theater-curtains', 'festival-lights', 'amusement-silhouettes'],
    lighting: { ambient: '#7b436d', directional: '#ffd8f2', intensity: 0.84 },
    fog: { color: '#74465f', density: 0.08 },
    particles: { type: 'show-confetti', density: 0.13 },
    environmentTint: '#925278',
    accentColor: '#ff9edf',
    transitionDuration: 750
  },
  {
    id: 'industrial-lab',
    associatedCardIds: cardIds('industrial-lab'),
    displayName: 'Complexe industriel',
    cssClass: 'field-environment-industrial-lab',
    backdropUrl: '/environments/field-industrial-lab-original.webp',
    background: 'industrial-laboratory',
    ground: 'factory-deck',
    arenaMaterial: 'kaibacorp-steel',
    props: ['laboratory-tanks', 'industrial-pipes', 'warning-lights'],
    lighting: { ambient: '#40545a', directional: '#b7f4e8', intensity: 0.69 },
    fog: { color: '#374b4f', density: 0.16 },
    particles: { type: 'steam', density: 0.12 },
    environmentTint: '#4c666a',
    accentColor: '#73f1cf',
    transitionDuration: 800
  },
  {
    id: 'mechanical-fortress',
    associatedCardIds: cardIds('mechanical-fortress'),
    displayName: 'Forteresse mécanique',
    cssClass: 'field-environment-mechanical-fortress',
    backdropUrl: '/environments/field-mechanical-fortress-original.webp',
    background: 'mechanical-citadel',
    ground: 'armored-deck',
    arenaMaterial: 'kaibacorp-steel',
    props: ['gear-towers', 'armored-walls', 'machine-cores'],
    lighting: { ambient: '#4e5158', directional: '#ffd59b', intensity: 0.7 },
    fog: { color: '#494b50', density: 0.14 },
    particles: { type: 'machine-sparks', density: 0.12 },
    environmentTint: '#626267',
    accentColor: '#ffb45e',
    transitionDuration: 800
  },
  {
    id: 'digital-cyber',
    associatedCardIds: cardIds('digital-cyber'),
    displayName: 'Cyberespace',
    cssClass: 'field-environment-digital-cyber',
    backdropUrl: '/environments/field-digital-cyber-original.webp',
    background: 'digital-dimension',
    ground: 'data-plane',
    arenaMaterial: 'neutral-hologram',
    props: ['data-pillars', 'circuit-arches', 'pixel-streams'],
    lighting: { ambient: '#173f61', directional: '#82f7ff', intensity: 0.76 },
    fog: { color: '#16314b', density: 0.11 },
    particles: { type: 'data-fragments', density: 0.17 },
    environmentTint: '#235b7d',
    accentColor: '#39f4ff',
    transitionDuration: 750
  },
  {
    id: 'cosmic-dimensional',
    associatedCardIds: cardIds('cosmic-dimensional'),
    displayName: 'Dimension cosmique',
    cssClass: 'field-environment-cosmic-dimensional',
    backdropUrl: '/environments/field-cosmic-dimensional-original.webp',
    background: 'cosmic-rift',
    ground: 'dimensional-plane',
    arenaMaterial: 'neutral-hologram',
    props: ['distant-planets', 'dimensional-rings', 'star-nebulae'],
    lighting: { ambient: '#33295f', directional: '#c9b6ff', intensity: 0.68 },
    fog: { color: '#241d4a', density: 0.15 },
    particles: { type: 'stardust', density: 0.19 },
    environmentTint: '#4c3c82',
    accentColor: '#b49aff',
    transitionDuration: 900
  },
  {
    id: 'celestial-light',
    associatedCardIds: cardIds('celestial-light'),
    displayName: 'Domaine céleste',
    cssClass: 'field-environment-celestial-light',
    backdropUrl: '/environments/field-celestial-light-original.webp',
    background: 'celestial-heavens',
    ground: 'luminous-cloudstone',
    arenaMaterial: 'storm-hologram',
    props: ['cloud-pillars', 'light-arches', 'floating-islands'],
    lighting: { ambient: '#a6add1', directional: '#fffce5', intensity: 0.91 },
    fog: { color: '#c8c9db', density: 0.1 },
    particles: { type: 'light-feathers', density: 0.13 },
    environmentTint: '#a4a8c5',
    accentColor: '#fff0a6',
    transitionDuration: 850
  }
].map(freezeEnvironment);

export const FIELD_ENVIRONMENT_REGISTRY = Object.freeze(
  Object.fromEntries(environments.map(environment => [environment.id, environment]))
);

const environmentByCardId = new Map();
for (const environment of environments) {
  for (const cardId of environment.associatedCardIds) {
    if (environmentByCardId.has(cardId)) {
      throw new RangeError(`Duplicate Field environment card ID: ${cardId}`);
    }
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
