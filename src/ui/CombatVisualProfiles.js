import { FIELD_SPELL_REFERENCE_ART_PALETTES } from './FieldSpellReferenceArtPalettes.js';
import { getFieldSpellEnvironmentCatalogEntry } from './FieldSpellEnvironmentCatalog.js';

const ATTRIBUTE_COLORS = Object.freeze({
  LIGHT: '#87eaff', DARK: '#ae75ff', FIRE: '#ff7944', WATER: '#38d8ee',
  WIND: '#7fe6a8', EARTH: '#d7b574', DIVINE: '#ffe58a'
});

const CARD_PROFILES = Object.freeze({
  '89631139': { id: 'blue-eyes', family: 'dragon', body: '#b7d9e7', accent: '#dcebf0', membrane: '#649bb2', eye: '#198bde', attack: 'dragon-burst', anatomy: 'armored-blue-dragon', referenceArt: '/cards/cropped/89631139.jpg' },
  '74677422': { id: 'red-eyes', family: 'dragon', body: '#242b3a', accent: '#655b77', membrane: '#303442', eye: '#ef282f', attack: 'dragon-flame', anatomy: 'spiked-black-dragon', referenceArt: '/cards/cropped/74677422.jpg' },
  '23995346': { id: 'blue-eyes-ultimate', family: 'dragon', heads: 3, body: '#dbe8ef', accent: '#62dcff', eye: '#19b9ff', attack: 'dragon-burst' },
  '88819587': { id: 'baby-dragon', family: 'dragon', baby: true, body: '#de9a6d', accent: '#f6c07d', eye: '#55f0a9', attack: 'dragon-flame' },
  '46986414': { id: 'dark-magician', family: 'magician', body: '#49356f', accent: '#d78ed0', eye: '#77c8b0', skin: '#d7b896', staffColor: '#178866', attack: 'dark-magic', anatomy: 'armored-dark-magician', referenceArt: '/cards/cropped/46986414.jpg' },
  '38033121': { id: 'dark-magician-girl', family: 'magician', body: '#2389ba', accent: '#e265a9', eye: '#4ebf73', hair: '#e4b748', skin: '#f1c7b1', staffColor: '#c5a45b', attack: 'dark-magic', anatomy: 'dark-magician-girl', referenceArt: '/cards/cropped/38033121.jpg' },
  '91152256': { id: 'celtic-guardian', family: 'warrior', body: '#448c5a', accent: '#d7cb8b', eye: '#c1f4ff', attack: 'blade' },
  '63977008': { id: 'junk-synchron', family: 'machine', body: '#e67b37', accent: '#4d647a', eye: '#91eaff', attack: 'impact' },
  '40640057': { id: 'kuriboh', family: 'kuriboh', body: '#886543', accent: '#b89569', eye: '#bd83ec', attack: 'impact' },
  '70781052': { id: 'summoned-skull', family: 'fiend', body: '#d4c7bb', accent: '#b976b5', eye: '#fb7774', attack: 'lightning' },
  '13039848': { id: 'stone-soldier', family: 'rock', body: '#658181', accent: '#9bbbb4', eye: '#b8f3ff', attack: 'impact' },
  '71625222': { id: 'time-wizard', family: 'clock', body: '#e87867', accent: '#f2d378', eye: '#82c9ff', attack: 'time-magic' },
  '44508094': { id: 'stardust-dragon', family: 'dragon', body: '#a8d6d9', accent: '#65f5ea', eye: '#68dbff', attack: 'stardust' },
  '54652250': { id: 'man-eater-bug', family: 'insect', body: '#547b3c', accent: '#a6b758', eye: '#ffcf73', attack: 'pincer' },
  '31560081': { id: 'magician-of-faith', family: 'faith', body: '#d9a0c4', accent: '#eb92ba', eye: '#74dbef', hair: '#3d956b', attack: 'faith-light' },
  '26202165': { id: 'sangan', family: 'sangan', body: '#976246', accent: '#c28d60', eye: '#f3d7f0', attack: 'impact' },
  '77637979': { id: 'lanphorhynchus', family: 'dragon', digital: true, body: '#35518e', accent: '#68e7ff', eye: '#edfe6d', attack: 'cyber-beam' },
  '20721928': { id: 'elemental-hero-sparkman', family: 'warrior', body: '#293865', accent: '#d7c16f', eye: '#93f5f0', attack: 'spark-bolt', anatomy: 'sparkman', referenceArt: '/cards/cropped/20721928.jpg' },
  '68638985': { id: 'slime-toad', family: 'aquatic', body: '#168955', accent: '#319a68', eye: '#d5c948', attack: 'water', anatomy: 'slime-toad', referenceArt: '/cards/cropped/68638985.jpg' },
  '26905245': { id: 'metal-reflect-slime', family: 'aquatic', body: '#82766d', accent: '#e6ebe8', eye: '#ffffff', attack: 'impact', anatomy: 'metal-reflect-slime', referenceArt: '/cards/cropped/26905245.jpg' },
  '28649820': { id: 'embodiment-of-apophis', family: 'warrior', body: '#18252c', accent: '#40677d', eye: '#ec233d', attack: 'blade', anatomy: 'armored-cobra-apophis', referenceArt: '/cards/cropped/28649820.jpg' },
  '97590747': { id: 'la-jinn', family: 'fiend', bodyMetalness: 0.12, bodyRoughness: 0.55, darkMetalness: 0.08, body: '#188b54', accent: '#e0bf59', eye: '#122e28', attack: 'impact', anatomy: 'emerald-genie', referenceArt: '/cards/cropped/97590747.jpg' },
  '15025844': { id: 'mystical-elf', family: 'magician', bodyMetalness: 0.08, bodyRoughness: 0.58, accentMetalness: 0.12, accentRoughness: 0.5, darkMetalness: 0.08, body: '#64b5df', accent: '#e4e9dc', eye: '#26475b', hair: '#bd8f2b', attack: 'dark-magic', anatomy: 'mystical-elf-prayer', referenceArt: '/cards/cropped/15025844.jpg' },
  '32452818': { id: 'beaver-warrior', family: 'warrior', bodyMetalness: 0.08, bodyRoughness: 0.6, body: '#9883a5', accent: '#377bb3', eye: '#dc2649', attack: 'blade', anatomy: 'blue-armored-rodent', referenceArt: '/cards/cropped/32452818.jpg' },
  '39552864': { id: 'mystical-shine-ball', family: 'orb', body: '#e3eef1', accent: '#c6eeff', eye: '#f8fffa', attack: 'faith-light', anatomy: 'shine-ball', referenceArt: '/cards/cropped/39552864.jpg' }
});

export const SUPPORTED_HOLOGRAM_MODEL_IDS = Object.freeze(Object.keys(CARD_PROFILES));
export const SUPPORTED_PROCEDURAL_MODEL_FAMILIES = Object.freeze([
  'dragon', 'magician', 'faith', 'warrior', 'machine', 'rock', 'kuriboh',
  'sangan', 'fiend', 'clock', 'insect', 'aquatic', 'avian', 'beast', 'token', 'spirit', 'orb'
]);

export function resolveHologramMonsterProfile(card = {}) {
  const exact = CARD_PROFILES[String(card.id || '').replace(/^0+(?=\d)/, '')];
  if (exact) return Object.freeze({ ...exact });
  const race = String(card.race || '').toLowerCase();
  const attribute = String(card.attribute || '').toUpperCase();
  const accent = ATTRIBUTE_COLORS[attribute] || '#87d8ed';
  const digital = /link/i.test(card.type || '');
  const family = /token/i.test(card.type || '') || card.isToken === true ? 'token'
    : /dragon|wyrm|dinosaur/.test(race) ? 'dragon'
    : /spellcaster/.test(race) ? 'magician'
      : /warrior/.test(race) ? 'warrior'
        : /machine|cyberse/.test(race) ? 'machine'
          : /rock/.test(race) ? 'rock'
            : /fiend|zombie/.test(race) ? 'fiend'
              : /aqua|fish|sea serpent/.test(race) ? 'aquatic'
                : /winged beast/.test(race) ? 'avian'
                  : /insect/.test(race) ? 'insect'
                    : /beast|plant/.test(race) ? 'beast' : 'spirit';
  const attack = digital ? 'cyber-beam'
    : family === 'dragon' ? (attribute === 'FIRE' ? 'dragon-flame' : 'dragon-burst')
    : family === 'magician' ? 'dark-magic'
      : family === 'warrior' ? 'blade'
        : attribute === 'LIGHT' && family === 'fiend' ? 'lightning'
          : family === 'aquatic' ? 'water' : family === 'insect' ? 'pincer' : 'impact';
  return Object.freeze({ id: `generic-${digital ? 'link-' : ''}${family}-${attribute.toLowerCase() || 'neutral'}`, family, digital, body: digital ? '#35518e' : accent, accent, eye: '#efffff', attack });
}

// Explicit presentation motifs for inspected illustrations. These mappings
// describe source scenery, never a card effect, target, bonus or damage result.
const FIELD_ACTIVATION_MOTIFS = Object.freeze(Object.fromEntries([
  ['field-water', ['22702055', '82999629', '2084239', '34103656', '26534688', '91027843', '2819435', '77103950']],
  ['field-growth', ['56594520', '87430998', '87624166', '71645242', '5050644', '76869711', '10080320', '17228908']],
  ['field-gloom', ['47355498', '59160188', '76871889', '33017655', '84171830', '81788994', '59197169', '93729896']],
  ['field-radiance', ['56433456', '24382602', '95658967', '80921533', '92107604', '58406094', '675319', '27813661']]
].flatMap(([shape, ids]) => ids.map(id => [id, shape]))));

/** One source-art palette per published Field Spell; no rule is inferred. */
export function resolveFieldSourceVisualProfile(kind, card = {}) {
  if (!['activate', 'destroy', 'negate'].includes(kind)) return null;
  const entry = getFieldSpellEnvironmentCatalogEntry(card.id);
  if (!entry) return null;
  const palette = FIELD_SPELL_REFERENCE_ART_PALETTES[entry.cardId];
  if (!palette || palette.length < 4) return null;
  const mode = kind === 'activate' ? 'activation' : kind === 'destroy' ? 'destruction' : 'negation';
  return Object.freeze({ id: `field-${mode}:${entry.cardId}`, sourceCardId: entry.cardId,
    color: palette[1], secondary: palette[3], accent: palette[4] ?? palette[0],
    duration: kind === 'destroy' ? 700 : 900,
    shape: kind === 'destroy' ? 'shatter' : kind === 'negate' ? 'shield'
      : FIELD_ACTIVATION_MOTIFS[entry.cardId] || 'rune' });
}

/** Select effects from public identity/rules identifiers, never card prose. */
export function resolveCombatVisualProfile({ kind = 'attack', card = {}, profile } = {}) {
  // Dedicated resolved-rule profiles remain explicit. Generic native effects
  // use the source illustration without inventing a boost, target or result.
  if (!profile) {
    const sourceProfile = resolveFieldSourceVisualProfile(kind, card);
    if (sourceProfile) return sourceProfile;
  }
  const cardId = String(card.id || '');
  const effectCode = String(card.effectCode || '').toUpperCase();
  let id = profile;
  if (!id) {
    if (kind === 'summon') id = /fusion/i.test(card.type || '') ? 'fusion-summon'
      : /synchro/i.test(card.type || '') ? 'synchro-summon'
        : /xyz/i.test(card.type || '') ? 'xyz-summon'
          : /link/i.test(card.type || '') ? 'link-summon' : 'summon';
    else if (kind === 'destroy') id = 'shatter';
    else if (kind === 'shield' || kind === 'negate' || (kind !== 'attack' && (cardId === '44095762' || cardId === '40640057'
      || /PREVENT|NEGATE|MIRROR_FORCE/.test(effectCode)))) id = 'shield';
    else if (cardId === '05318639' || cardId === '5318639') id = 'typhoon';
    else if (cardId === '14087893') id = 'moon';
    else if (cardId === '12580477' || cardId === '53129443') id = 'lightning';
    else if (cardId === '83764718' || /REBORN|REVIVE/.test(effectCode)) id = 'revival';
    else if (cardId === '71625222' || /COIN_TOSS/.test(effectCode)) id = 'time-magic';
    else if (kind !== 'attack' && cardId === '54652250') id = 'pincer';
    else if (kind !== 'attack' && cardId === '31560081') id = 'faith-light';
    else if (kind !== 'attack' && cardId === '26202165') id = 'search';
    else if (kind === 'attack') id = resolveHologramMonsterProfile(card).attack;
    else id = /trap/i.test(card.type || card.card_type || '') ? 'trap-rune' : 'spell-rune';
  }
  const profiles = {
    'dragon-burst': { color: '#9ceaff', secondary: '#ffffff', duration: 920, shape: 'beam' },
    'dragon-flame': { color: '#ff6633', secondary: '#ffe68d', duration: 900, shape: 'flame' },
    'dark-magic': { color: '#ae55ff', secondary: '#f287e7', duration: 950, shape: 'orb' },
    'time-magic': { color: '#ffdd72', secondary: '#64e5ff', duration: 1000, shape: 'rune' },
    lightning: { color: '#edcfff', secondary: '#ffffff', duration: 780, shape: 'lightning' },
    blade: { color: '#d8fff2', secondary: '#f5ffcf', duration: 640, shape: 'slash' },
    impact: { color: '#ffc979', secondary: '#fff3da', duration: 650, shape: 'impact' },
    water: { color: '#2ebeff', secondary: '#b1ffff', duration: 850, shape: 'orb' },
    stardust: { color: '#93fff2', secondary: '#ffffff', duration: 950, shape: 'beam' },
    'cyber-beam': { color: '#6bcbff', secondary: '#e7fbff', duration: 880, shape: 'beam' },
    'spark-bolt': { color: '#62f5e8', secondary: '#e8ffeb', duration: 780, shape: 'lightning' },
    pincer: { color: '#bfd777', secondary: '#f0ffd2', duration: 720, shape: 'pincer' },
    'faith-light': { color: '#ffcae7', secondary: '#fff4c0', duration: 1000, shape: 'faith' },
    search: { color: '#ebb782', secondary: '#fff5db', duration: 850, shape: 'search' },
    'sanctuary-protection': { color: '#fff0b0', secondary: '#ffffff', duration: 900, shape: 'sanctuary' },
    'skyscraper-boost': { color: '#6fdfff', secondary: '#ffe29c', duration: 1000, shape: 'boost' },
    'ancient-forest-destruction': { color: '#99c884', secondary: '#e4d28c', duration: 950, shape: 'roots' },
    // Colors follow the corresponding Field artwork palettes. These profiles
    // are selected by resolved rule events rather than persistent statistics.
    'temple-minds-eye': { color: '#deb333', secondary: '#ffd862', accent: '#893e26', duration: 1100, shape: 'temple-eye' },
    'canyon-damage': { color: '#ba9e81', secondary: '#ded5c1', accent: '#a9deed', duration: 1000, shape: 'canyon-echo' },
    'shien-mist-reduction': { color: '#ac5ee3', secondary: '#746684', accent: '#3b2b53', duration: 1050, shape: 'shien-mist' },
    'dark-city-boost': { color: '#fff1a1', secondary: '#d2cc9b', accent: '#181c1c', duration: 1050, shape: 'dark-city' },
    shield: { color: '#8ee9ff', secondary: '#ebffff', duration: 900, shape: 'shield' },
    revival: { color: '#62ffb3', secondary: '#ffefa0', duration: 1100, shape: 'rune' },
    'spell-rune': { color: '#61ebc3', secondary: '#e6ffff', duration: 900, shape: 'rune' },
    'trap-rune': { color: '#ff7fc4', secondary: '#ffeeff', duration: 900, shape: 'rune' },
    typhoon: { color: '#8bdfda', secondary: '#eaffff', duration: 1000, shape: 'vortex' },
    moon: { color: '#96a9f0', secondary: '#d3dfff', duration: 950, shape: 'moon' },
    summon: { color: '#7addff', secondary: '#ffffff', duration: 1000, shape: 'summon' },
    'special-summon': { color: '#83e7df', secondary: '#ffffff', duration: 950, shape: 'summon' },
    'fusion-summon': { color: '#b88dff', secondary: '#ffc780', duration: 1150, shape: 'fusion' },
    'synchro-summon': { color: '#a2ffcf', secondary: '#ffffff', duration: 1050, shape: 'synchro' },
    'xyz-summon': { color: '#ffdb81', secondary: '#24254f', duration: 1100, shape: 'xyz' },
    'link-summon': { color: '#72cbff', secondary: '#ff917e', duration: 1000, shape: 'link' },
    'ritual-summon': { color: '#77d9ff', secondary: '#ffe9ac', duration: 1150, shape: 'ritual' },
    'pendulum-summon': { color: '#77eaff', secondary: '#f89bef', duration: 1100, shape: 'pendulum' },
    'flip-summon': { color: '#ffe6a2', secondary: '#ffffff', duration: 850, shape: 'flip' },
    'card-reveal': { color: '#c3e6f0', secondary: '#ffffff', duration: 650, shape: 'flip' },
    shatter: { color: '#94e2ff', secondary: '#ffffff', duration: 700, shape: 'shatter' }
  };
  const selected = Object.hasOwn(profiles, id) ? id : 'impact';
  return Object.freeze({ id: selected, ...profiles[selected] });
}
