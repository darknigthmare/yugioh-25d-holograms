import { getNativeCardTemplate } from './NativeCardRegistry.js';
import { OcgType as T, OcgScope as S, OcgRace, OcgAttribute, OcgLinkMarker } from './vendor/ocgcore/index.js';

export const NATIVE_UNKNOWN_CARD_IMAGE = '/cards/native-unknown.png';
const catalogueCache = new WeakMap();
const extraMask = T.FUSION | T.SYNCHRO | T.XYZ | T.LINK;
const excludedTypes = T.TOKEN | T.MAXIMUM | 0x8000000; // Skill cards are outside ordinary duels.
const excludedScopes = S.ANIME | S.ILLEGAL | S.VIDEO_GAME | S.CUSTOM | S.RUSH | S.LEGEND | S.HIDDEN;
const raceNames = {
  WINGEDBEAST: 'Winged Beast', BEASTWARRIOR: 'Beast-Warrior', SEASERPENT: 'Sea Serpent',
  DIVINE: 'Divine-Beast', CREATORGOD: 'Creator God'
};
const title = value => value.toLowerCase().replace(/(^|_)([a-z])/g, (_, prefix, letter) => `${prefix ? ' ' : ''}${letter.toUpperCase()}`);
const normalize = value => String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const lookup = (map, code) => map.get(Number(code)) ?? map.get(String(code));

function numericCode(value) {
  const text = String(typeof value === 'object' ? value?.id : value ?? '').trim();
  if (!/^\d+$/.test(text)) return null;
  const code = Number(text);
  return Number.isSafeInteger(code) && code > 0 ? code : null;
}

function scriptFor(resources, code) {
  const filename = `c${code}.lua`;
  for (const path of [filename, `official/${filename}`, `pre-release/${filename}`]) {
    if (typeof resources.scripts.get(path) === 'string') return path;
  }
  return null;
}

function permittedData(data, metadata, canonicalCode) {
  if (!data || !metadata?.name || typeof metadata.description !== 'string') return false;
  if ((data.type & excludedTypes) !== 0 || !(data.type & (T.MONSTER | T.SPELL | T.TRAP))) return false;
  const scope = Number(metadata.ot);
  if ((scope & excludedScopes) !== 0) return false;
  // Announced catalogue fields have an explicit canonical binding. Everything
  // else needs a standard OCG/TCG scope; release dates do not restrict free play.
  return (scope & (S.OCG | S.TCG)) !== 0 || metadata.canonicalBinding?.canonicalCode === canonicalCode;
}

function plainNormalMonster(data) {
  return Boolean(data.type & T.MONSTER) && Boolean(data.type & T.NORMAL)
    && !(data.type & (T.EFFECT | extraMask | T.RITUAL | T.PENDULUM | T.SPSUMMON));
}

function monsterType(type) {
  const words = [];
  if (type & T.TOKEN) return 'Token Monster';
  if (type & T.FUSION) words.push('Fusion');
  else if (type & T.SYNCHRO) words.push('Synchro');
  else if (type & T.XYZ) words.push('Xyz');
  else if (type & T.LINK) words.push('Link');
  else if (type & T.RITUAL) words.push('Ritual');
  if (type & T.PENDULUM) words.push('Pendulum');
  if (type & T.TUNER) words.push('Tuner');
  if (type & T.FLIP) words.push('Flip');
  if (type & T.TOON) words.push('Toon');
  if (type & T.SPIRIT) words.push('Spirit');
  if (type & T.UNION) words.push('Union');
  if (type & T.GEMINI) words.push('Gemini');
  if (type & T.EFFECT) words.push('Effect');
  else if (!words.length) words.push('Normal');
  words.push('Monster');
  return words.join(' ');
}

function spellRace(type) {
  if (type & T.FIELD) return 'Field';
  if (type & T.RITUAL) return 'Ritual';
  if (type & T.QUICKPLAY) return 'Quick-Play';
  if (type & T.CONTINUOUS) return 'Continuous';
  if (type & T.EQUIP) return 'Equip';
  if (type & T.COUNTER) return 'Counter';
  return 'Normal';
}

function convertTemplate(resources, code, data, metadata, sourceScript, deckEligible = true) {
  const cardType = data.type & T.MONSTER ? 'monster' : data.type & T.SPELL ? 'spell' : 'trap';
  const extraType = data.type & T.FUSION ? 'fusion' : data.type & T.SYNCHRO ? 'synchro'
    : data.type & T.XYZ ? 'xyz' : data.type & T.LINK ? 'link' : null;
  const raceKey = Object.entries(OcgRace).find(([, value]) => value === data.race)?.[0];
  const attribute = Object.entries(OcgAttribute).find(([, value]) => value === data.attribute)?.[0] ?? '';
  const setcodes = Object.freeze([...data.setcodes]);
  const nativeMetadata = Object.freeze({
    sourceCode: data.code, sourceDatabase: metadata.sourceDatabase,
    sourceScript, ot: metadata.ot, alias: data.alias,
    canonicalBinding: metadata.canonicalBinding ?? null,
    legality: 'unrestricted-native-only', banlistVerified: false
  });
  return Object.freeze({
    id: String(code), name: metadata.name, name_en: metadata.name,
    desc: metadata.description, rulesText: metadata.description,
    type: cardType === 'monster' ? monsterType(data.type) : cardType === 'spell' ? 'Spell Card' : 'Trap Card',
    card_type: cardType, race: cardType === 'monster' ? (raceNames[raceKey] ?? (raceKey ? title(raceKey) : '')) : spellRace(data.type),
    attribute: cardType === 'monster' ? attribute : '',
    atk: cardType === 'monster' ? data.attack : 0,
    def: (data.type & T.LINK) ? null : cardType === 'monster' ? data.defense : 0,
    level: cardType === 'monster' && !(data.type & (T.XYZ | T.LINK)) ? data.level : 0,
    rank: data.type & T.XYZ ? data.level : 0,
    linkRating: data.type & T.LINK ? data.level : null,
    extra_type: extraType, belongsInExtraDeck: Boolean(extraType),
    isEffectMonster: Boolean(data.type & T.EFFECT), isTuner: Boolean(data.type & T.TUNER),
    isToken: Boolean(data.type & T.TOKEN),
    isRitualMonster: cardType === 'monster' && Boolean(data.type & T.RITUAL),
    isRitualSpell: cardType === 'spell' && Boolean(data.type & T.RITUAL),
    isPendulumMonster: cardType === 'monster' && Boolean(data.type & T.PENDULUM),
    isFieldSpell: cardType === 'spell' && Boolean(data.type & T.FIELD),
    lscale: data.lscale, rscale: data.rscale, leftScale: data.lscale, rightScale: data.rscale,
    pendulumScale: data.lscale, scale: data.lscale,
    linkArrows: Object.freeze(Object.entries(OcgLinkMarker).filter(([, marker]) => data.link_marker & marker).map(([name]) => name.toLowerCase())),
    image_url: NATIVE_UNKNOWN_CARD_IMAGE, image_url_cropped: NATIVE_UNKNOWN_CARD_IMAGE,
    nativeEngine: true, supportedInNative: true, supportedInStrict: false, nativeCatalogueOnly: true,
    nativeDeckEligible: deckEligible,
    scriptCode: data.code, scriptStatus: sourceScript ? 'bundled' : 'normal-no-script-needed',
    nativeType: data.type, nativeCode: data.code, nativeAlias: data.alias, nativeOT: metadata.ot,
    nativeRace: data.race, nativeAttribute: data.attribute, nativeSetcodes: setcodes,
    setcodes, nativeLinkMarkers: data.link_marker, nativeLevel: data.level, nativeMetadata,
    banlistVerified: false
  });
}

function buildCatalogue(resources) {
  if (!(resources?.cards instanceof Map) || !(resources.metadata instanceof Map) || !(resources.scripts instanceof Map)) {
    throw new TypeError('Native catalogue requires preloaded cards, metadata and Lua maps');
  }
  const physicalToCanonical = new Map(resources.sourceCodeToCanonical ?? resources.nativeToCanonical ?? []);
  const releasedByName = new Map();
  for (const [rawCode, metadata] of resources.metadata) {
    const code = Number(rawCode); const data = lookup(resources.cards, code);
    if (!permittedData(data, metadata, code) || physicalToCanonical.has(code)) continue;
    // Alternate illustrations use nearby aliases in the core. Normalize these
    // copies, while keeping genuine distant aliases such as A Legendary Ocean.
    if (data.alias && Math.abs(data.alias - data.code) < 10 && lookup(resources.cards, data.alias)) {
      physicalToCanonical.set(code, data.alias); continue;
    }
    const name = normalize(metadata.name);
    const previous = releasedByName.get(name);
    const prerelease = /^prerelease-/i.test(metadata.sourceDatabase ?? '');
    if (!previous || (previous.prerelease && !prerelease) || (previous.prerelease === prerelease && code < previous.code)) {
      releasedByName.set(name, { code, prerelease });
    }
  }
  for (const [rawCode, metadata] of resources.metadata) {
    const code = Number(rawCode);
    if (physicalToCanonical.has(code) || metadata.canonicalBinding) continue;
    if (/^prerelease-/i.test(metadata.sourceDatabase ?? '')) {
      const preferred = releasedByName.get(normalize(metadata.name));
      if (preferred && preferred.code !== code) physicalToCanonical.set(code, preferred.code);
    }
  }
  const canonical = code => {
    const seen = new Set();
    while (physicalToCanonical.has(code) && !seen.has(code)) { seen.add(code); code = physicalToCanonical.get(code); }
    return code;
  };
  const templates = new Map();
  for (const rawCode of resources.cards.keys()) {
    const code = canonical(Number(rawCode));
    if (templates.has(code)) continue;
    const data = lookup(resources.cards, code); const metadata = lookup(resources.metadata, code);
    if (!permittedData(data, metadata, code)) continue;
    const sourceScript = scriptFor(resources, data.code);
    if (!sourceScript && !plainNormalMonster(data)) continue;
    templates.set(code, getNativeCardTemplate(code) ?? convertTemplate(resources, code, data, metadata, sourceScript));
  }
  const rows = [...templates.values()].sort((a, b) => collator.compare(a.name_en ?? a.name, b.name_en ?? b.name) || Number(a.id) - Number(b.id))
    .map(template => ({ template, name: normalize(`${template.name_en ?? ''} ${template.name ?? ''}`),
      text: normalize(`${template.name_en ?? ''} ${template.name ?? ''} ${template.rulesText ?? template.desc ?? ''}`) }));
  return { templates, rows, canonical };
}

function catalogue(resources) {
  let result = catalogueCache.get(resources);
  if (!result) { result = buildCatalogue(resources); catalogueCache.set(resources, result); }
  return result;
}

/** Existing local cards keep their artwork, translations and audited metadata.
 * The remaining CDB templates are exclusively for unrestricted native play. */
export function createNativeCardTemplate(resources, cardOrCode) {
  const code = numericCode(cardOrCode);
  if (code === null) return null;
  const local = getNativeCardTemplate(code);
  if (local) return local;
  const index = catalogue(resources);
  return index.templates.get(index.canonical(code)) ?? null;
}

export function getNativeCardCatalogueCount(resources) {
  return catalogue(resources).templates.size;
}

/** Presentation-only fallback for cards created by the core, including Tokens.
 * This does not add the card to the searchable or playable deck catalogue. */
export function createNativeCardPresentationTemplate(resources, cardOrCode) {
  const code = numericCode(cardOrCode);
  if (code === null) return null;
  const local = getNativeCardTemplate(code);
  if (local) return local;
  const index = catalogue(resources); const canonical = index.canonical(code);
  const template = index.templates.get(canonical);
  if (template) return template;
  const data = lookup(resources.cards, canonical); const metadata = lookup(resources.metadata, canonical);
  return data && metadata ? convertTemplate(resources, canonical, data, metadata, scriptFor(resources, data.code), false) : null;
}

/** Validate a stored/deck-builder card against trusted CDB templates. The free
 * builder supplies this predicate; the strict registry remains unchanged. */
export function isSupportedNativeCatalogueCard(resources, card, expectedSection = null) {
  if (!card || card.supportedInNative === false || ![null, 'main', 'extra'].includes(expectedSection)) return false;
  const code = numericCode(card); if (code === null) return false;
  const index = catalogue(resources); const template = index.templates.get(index.canonical(code));
  if (!template || card.card_type !== template.card_type || card.type !== template.type) return false;
  if ((card.extra_type ?? null) !== (template.extra_type ?? null)) return false;
  const extra = Boolean(template.belongsInExtraDeck || template.extra_type);
  if (Boolean(card.belongsInExtraDeck || card.extra_type) !== extra) return false;
  return !expectedSection || extra === (expectedSection === 'extra');
}

/** The CDB alias is the authoritative permanent copy identity (Harpie Lady,
 * Umi and alternate artworks). Never trust an alias property on a deck object. */
export function getNativeCardCopyIdentity(resources, cardOrCode) {
  const code = numericCode(cardOrCode); if (code === null) return null;
  const index = catalogue(resources); const canonical = index.canonical(code);
  const data = lookup(resources.cards, canonical);
  if (!data) return null;
  return String(index.canonical(Number(data.alias || data.code)));
}

/** Name, passcode and rules-text search; results are bounded for the builder. */
export function searchNativeCardCatalogue(resources, query = '', options = {}) {
  const index = catalogue(resources);
  const normalized = normalize(query); const terms = normalized.split(/\s+/).filter(Boolean);
  const limit = Math.max(0, Math.min(1000, Number.isFinite(Number(options.limit)) ? Math.trunc(Number(options.limit)) : 100));
  if (!limit) return [];
  const code = numericCode(query);
  if (code !== null) {
    const card = index.templates.get(index.canonical(code));
    return card ? [card] : [];
  }
  const matches = index.rows.filter(row => terms.every(term => row.text.includes(term)));
  if (normalized) matches.sort((a, b) => {
    const score = row => row.name === normalized || normalize(row.template.name_en) === normalized ? 0
      : normalize(row.template.name_en).startsWith(normalized) ? 1 : terms.every(term => row.name.includes(term)) ? 2 : 3;
    return score(a) - score(b);
  });
  return matches.slice(0, limit).map(row => row.template);
}
