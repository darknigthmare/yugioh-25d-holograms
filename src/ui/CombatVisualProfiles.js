const ATTRIBUTE_COLORS = Object.freeze({
  LIGHT: '#87eaff', DARK: '#ae75ff', FIRE: '#ff7944', WATER: '#38d8ee',
  WIND: '#7fe6a8', EARTH: '#d7b574', DIVINE: '#ffe58a'
});

const CARD_PROFILES = Object.freeze({
  '89631139': { id: 'blue-eyes', family: 'dragon', body: '#d5e5ed', accent: '#52ceff', eye: '#199fff', attack: 'dragon-burst' },
  '74677422': { id: 'red-eyes', family: 'dragon', body: '#24323d', accent: '#b5635f', eye: '#ff342e', attack: 'dragon-flame' },
  '23995346': { id: 'blue-eyes-ultimate', family: 'dragon', heads: 3, body: '#dbe8ef', accent: '#62dcff', eye: '#19b9ff', attack: 'dragon-burst' },
  '88819587': { id: 'baby-dragon', family: 'dragon', baby: true, body: '#de9a6d', accent: '#f6c07d', eye: '#55f0a9', attack: 'dragon-flame' },
  '46986414': { id: 'dark-magician', family: 'magician', body: '#6b4d9f', accent: '#e588bc', eye: '#a8ebff', attack: 'dark-magic' },
  '38033121': { id: 'dark-magician-girl', family: 'magician', body: '#58bedb', accent: '#f18eae', eye: '#91eaff', attack: 'dark-magic' },
  '91152256': { id: 'celtic-guardian', family: 'warrior', body: '#448c5a', accent: '#d7cb8b', eye: '#c1f4ff', attack: 'blade' },
  '63977008': { id: 'junk-synchron', family: 'machine', body: '#e67b37', accent: '#4d647a', eye: '#91eaff', attack: 'impact' },
  '40640057': { id: 'kuriboh', family: 'kuriboh', body: '#886543', accent: '#b89569', eye: '#bd83ec', attack: 'impact' },
  '70781052': { id: 'summoned-skull', family: 'fiend', body: '#d4c7bb', accent: '#b976b5', eye: '#fb7774', attack: 'lightning' },
  '13039848': { id: 'stone-soldier', family: 'rock', body: '#658181', accent: '#9bbbb4', eye: '#b8f3ff', attack: 'impact' },
  '71625222': { id: 'time-wizard', family: 'clock', body: '#e87867', accent: '#f2d378', eye: '#82c9ff', attack: 'time-magic' },
  '44508094': { id: 'stardust-dragon', family: 'dragon', body: '#a8d6d9', accent: '#65f5ea', eye: '#68dbff', attack: 'stardust' }
});

export function resolveHologramMonsterProfile(card = {}) {
  const exact = CARD_PROFILES[String(card.id || '')];
  if (exact) return Object.freeze({ ...exact });
  const race = String(card.race || '').toLowerCase();
  const attribute = String(card.attribute || '').toUpperCase();
  const accent = ATTRIBUTE_COLORS[attribute] || '#87d8ed';
  const family = /dragon|wyrm|dinosaur/.test(race) ? 'dragon'
    : /spellcaster/.test(race) ? 'magician'
      : /warrior/.test(race) ? 'warrior'
        : /machine|cyberse/.test(race) ? 'machine'
          : /rock/.test(race) ? 'rock'
            : /fiend|zombie/.test(race) ? 'fiend'
              : /aqua|fish|sea serpent/.test(race) ? 'aquatic'
                : /winged beast/.test(race) ? 'avian'
                  : /beast|insect|plant/.test(race) ? 'beast' : 'spirit';
  const attack = family === 'dragon' ? (attribute === 'FIRE' ? 'dragon-flame' : 'dragon-burst')
    : family === 'magician' ? 'dark-magic'
      : family === 'warrior' ? 'blade'
        : attribute === 'LIGHT' && family === 'fiend' ? 'lightning'
          : family === 'aquatic' ? 'water' : 'impact';
  return Object.freeze({ id: `generic-${family}-${attribute.toLowerCase() || 'neutral'}`, family, body: accent, accent, eye: '#efffff', attack });
}

/** Select effects from public identity/rules identifiers, never card prose. */
export function resolveCombatVisualProfile({ kind = 'attack', card = {}, profile } = {}) {
  const cardId = String(card.id || '');
  const effectCode = String(card.effectCode || '').toUpperCase();
  let id = profile;
  if (!id) {
    if (kind === 'summon') id = /fusion/i.test(card.type || '') ? 'fusion-summon'
      : /synchro/i.test(card.type || '') ? 'synchro-summon'
        : /xyz/i.test(card.type || '') ? 'xyz-summon'
          : /link/i.test(card.type || '') ? 'link-summon' : 'summon';
    else if (kind === 'destroy') id = 'shatter';
    else if (kind === 'shield' || (kind !== 'attack' && (cardId === '44095762' || cardId === '40640057'
      || /PREVENT|NEGATE|MIRROR_FORCE/.test(effectCode)))) id = 'shield';
    else if (cardId === '05318639' || cardId === '5318639') id = 'typhoon';
    else if (cardId === '14087893') id = 'moon';
    else if (cardId === '12580477' || cardId === '53129443') id = 'lightning';
    else if (cardId === '83764718' || /REBORN|REVIVE/.test(effectCode)) id = 'revival';
    else if (cardId === '71625222' || /COIN_TOSS/.test(effectCode)) id = 'time-magic';
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
    shield: { color: '#8ee9ff', secondary: '#ebffff', duration: 900, shape: 'shield' },
    revival: { color: '#62ffb3', secondary: '#ffefa0', duration: 1100, shape: 'rune' },
    'spell-rune': { color: '#61ebc3', secondary: '#e6ffff', duration: 900, shape: 'rune' },
    'trap-rune': { color: '#ff7fc4', secondary: '#ffeeff', duration: 900, shape: 'rune' },
    typhoon: { color: '#8bdfda', secondary: '#eaffff', duration: 1000, shape: 'vortex' },
    moon: { color: '#96a9f0', secondary: '#d3dfff', duration: 950, shape: 'moon' },
    summon: { color: '#7addff', secondary: '#ffffff', duration: 1000, shape: 'summon' },
    'fusion-summon': { color: '#b88dff', secondary: '#ffc780', duration: 1150, shape: 'summon' },
    'synchro-summon': { color: '#a2ffcf', secondary: '#ffffff', duration: 1050, shape: 'summon' },
    'xyz-summon': { color: '#ffdb81', secondary: '#24254f', duration: 1100, shape: 'summon' },
    'link-summon': { color: '#72cbff', secondary: '#ff917e', duration: 1000, shape: 'summon' },
    shatter: { color: '#94e2ff', secondary: '#ffffff', duration: 700, shape: 'shatter' }
  };
  const selected = Object.hasOwn(profiles, id) ? id : 'impact';
  return Object.freeze({ id: selected, ...profiles[selected] });
}
