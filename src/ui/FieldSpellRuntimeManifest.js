import {
  EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT,
  FIELD_SPELL_ENVIRONMENT_CATALOG
} from './FieldSpellEnvironmentCatalog.js';

/**
 * Lean, browser-safe visual contract for the immersive duel view.
 *
 * Generation prompts and card effect text deliberately live in
 * FieldSpellIllustrationBriefManifest.js and are not imported here. This keeps
 * the lazy Real View bundle limited to the values it needs to render a duel.
 */

export const FIELD_SPELL_RUNTIME_ASSET_ROOT = '/environments/field-spells';

const FAMILY_PALETTES = Object.freeze({
  yami: Object.freeze(['#090812', '#24143d', '#542966', '#c993ff']),
  umi: Object.freeze(['#031b2d', '#075a78', '#29a9bd', '#bff7f1']),
  forest: Object.freeze(['#071c14', '#185734', '#4c9b50', '#d2e99c']),
  sogen: Object.freeze(['#183318', '#4f7c2c', '#9fbe55', '#f1d99a']),
  wasteland: Object.freeze(['#2c1b13', '#75402a', '#b77943', '#f0c47b']),
  mountain: Object.freeze(['#17212b', '#445363', '#8593a0', '#d7e6ef']),
  cave: Object.freeze(['#080f14', '#26343b', '#526b68', '#9bd7c8']),
  swamp: Object.freeze(['#101b13', '#354c25', '#66853b', '#c0da68']),
  volcanic: Object.freeze(['#170b08', '#5d1d12', '#c44a16', '#ffc15a']),
  ice: Object.freeze(['#071b2d', '#225d83', '#72b9d4', '#e2fbff']),
  graveyard: Object.freeze(['#0d1117', '#303344', '#666b78', '#c5cee8']),
  'city-modern': Object.freeze(['#081724', '#23465e', '#537c91', '#55d8ff']),
  'city-fantasy': Object.freeze(['#17112d', '#4e3770', '#8a62a8', '#e5c6ff']),
  'castle-palace': Object.freeze(['#17151a', '#514556', '#917564', '#f0cf9c']),
  'temple-sanctuary': Object.freeze(['#28251e', '#6b624d', '#a99d72', '#fff0bd']),
  'arena-stadium': Object.freeze(['#101820', '#344d61', '#6f8291', '#bff4ff']),
  'theater-amusement': Object.freeze(['#241029', '#713b70', '#bf659e', '#ffd0ec']),
  'industrial-lab': Object.freeze(['#10191b', '#33494b', '#58716e', '#8cf2d5']),
  'mechanical-fortress': Object.freeze(['#111316', '#41464c', '#77736a', '#ffbb69']),
  'digital-cyber': Object.freeze(['#03111f', '#074368', '#087e9b', '#50f5ff']),
  'cosmic-dimensional': Object.freeze(['#09091c', '#29215b', '#654b9d', '#c4abff']),
  'celestial-light': Object.freeze(['#3e5270', '#8297bd', '#c3d4ed', '#fff4b5']),
  'toon-world': Object.freeze(['#27133c', '#7451a6', '#ef719e', '#ffe46e']),
  generic: Object.freeze(['#101624', '#34425f', '#6f6c98', '#91ecff'])
});

function normalizeCardId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d{1,12}$/.test(normalized)) return null;
  return normalized.replace(/^0+(?=\d)/, '');
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function slugify(value) {
  const slug = String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return slug || 'field-spell';
}

function hslToHex(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  let [red, green, blue] = [0, 0, 0];
  if (segment < 1) [red, green] = [chroma, secondary];
  else if (segment < 2) [red, green] = [secondary, chroma];
  else if (segment < 3) [green, blue] = [chroma, secondary];
  else if (segment < 4) [green, blue] = [secondary, chroma];
  else if (segment < 5) [red, blue] = [secondary, chroma];
  else [red, blue] = [chroma, secondary];
  const match = l - chroma / 2;
  return `#${[red, green, blue]
    .map(channel => Math.round((channel + match) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function allocateDistinctAccent(hash, allocatedAccents) {
  for (let attempt = 0; attempt < 4096; attempt += 1) {
    const hue = (hash + attempt * 137) % 360;
    const saturation = 58 + (((hash >>> 8) + attempt * 17) % 25);
    const lightness = 48 + (((hash >>> 16) + attempt * 13) % 22);
    const candidate = hslToHex(hue, saturation, lightness);
    if (!allocatedAccents.has(candidate)) {
      allocatedAccents.add(candidate);
      return candidate;
    }
  }
  throw new RangeError('Unable to allocate a distinct Field Spell signature accent.');
}

function freezeRuntimeEntry(catalogEntry, allocatedAccents) {
  const familyPalette = FAMILY_PALETTES[catalogEntry.environmentId];
  if (!familyPalette) {
    throw new RangeError(
      `Missing runtime palette for Field environment: ${catalogEntry.environmentId}`
    );
  }
  const slug = slugify(catalogEntry.name);
  const signatureAccent = allocateDistinctAccent(
    stableHash(`${catalogEntry.cardId}:${catalogEntry.name}`),
    allocatedAccents
  );
  const palette = Object.freeze({
    shadow: familyPalette[0],
    dominant: familyPalette[1],
    secondary: familyPalette[2],
    light: familyPalette[3],
    signatureAccent
  });
  return Object.freeze({
    cardId: catalogEntry.cardId,
    name: catalogEntry.name,
    environmentFamily: catalogEntry.environmentId,
    assetPath: `${FIELD_SPELL_RUNTIME_ASSET_ROOT}/${catalogEntry.cardId}-${slug}-original.webp`,
    palette
  });
}

const allocatedSignatureAccents = new Set();
export const FIELD_SPELL_RUNTIME_MANIFEST = Object.freeze(
  FIELD_SPELL_ENVIRONMENT_CATALOG.map(
    catalogEntry => freezeRuntimeEntry(catalogEntry, allocatedSignatureAccents)
  )
);

export const FIELD_SPELL_RUNTIME_MANIFEST_COUNT =
  FIELD_SPELL_RUNTIME_MANIFEST.length;

const runtimeEntryByCardId = new Map(
  FIELD_SPELL_RUNTIME_MANIFEST.map(entry => [entry.cardId, entry])
);

export function getFieldSpellRuntimeManifestEntry(cardId) {
  const normalizedCardId = normalizeCardId(cardId);
  return normalizedCardId
    ? runtimeEntryByCardId.get(normalizedCardId) || null
    : null;
}

export function validateFieldSpellRuntimeManifest(
  manifest = FIELD_SPELL_RUNTIME_MANIFEST
) {
  const errors = [];
  const entries = Array.isArray(manifest) ? manifest : [];
  const expectedCardIds = new Set(
    FIELD_SPELL_ENVIRONMENT_CATALOG.map(entry => entry.cardId)
  );
  const cardIds = new Set();
  const assetPaths = new Set();
  const paletteSignatures = new Set();
  const signatureAccents = new Set();

  if (!Array.isArray(manifest)) errors.push('manifest must be an array');
  if (entries.length !== EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT) {
    errors.push(
      `expected ${EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT} entries, received ${entries.length}`
    );
  }

  for (const entry of entries) {
    const cardId = normalizeCardId(entry?.cardId);
    if (!cardId || !expectedCardIds.has(cardId)) {
      errors.push(`unknown canonical card ID: ${entry?.cardId}`);
    } else if (cardIds.has(cardId)) {
      errors.push(`duplicate canonical card ID: ${cardId}`);
    } else {
      cardIds.add(cardId);
    }

    if (!entry?.name || typeof entry.name !== 'string') {
      errors.push(`missing name: ${cardId}`);
    }
    if (!FAMILY_PALETTES[entry?.environmentFamily]) {
      errors.push(`invalid environment family: ${cardId}`);
    }
    if (
      typeof entry?.assetPath !== 'string'
      || !entry.assetPath.startsWith(`${FIELD_SPELL_RUNTIME_ASSET_ROOT}/${cardId}-`)
      || !entry.assetPath.endsWith('-original.webp')
    ) {
      errors.push(`invalid asset path: ${cardId}`);
    } else if (assetPaths.has(entry.assetPath)) {
      errors.push(`duplicate asset path: ${cardId}`);
    } else {
      assetPaths.add(entry.assetPath);
    }

    const paletteValues = Object.values(entry?.palette || {});
    if (
      paletteValues.length !== 5
      || paletteValues.some(color => !/^#[0-9a-f]{6}$/i.test(color))
    ) {
      errors.push(`invalid five-colour palette: ${cardId}`);
    } else {
      const paletteSignature = paletteValues.join(':').toLowerCase();
      const signatureAccent = entry.palette.signatureAccent.toLowerCase();
      if (paletteSignatures.has(paletteSignature)) {
        errors.push(`duplicate palette: ${cardId}`);
      } else {
        paletteSignatures.add(paletteSignature);
      }
      if (signatureAccents.has(signatureAccent)) {
        errors.push(`duplicate signature accent: ${cardId}`);
      } else {
        signatureAccents.add(signatureAccent);
      }
    }
  }

  for (const cardId of expectedCardIds) {
    if (!cardIds.has(cardId)) errors.push(`missing canonical card ID: ${cardId}`);
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    count: entries.length,
    uniqueCardIdCount: cardIds.size,
    uniqueAssetPathCount: assetPaths.size,
    uniquePaletteCount: paletteSignatures.size,
    uniqueSignatureAccentCount: signatureAccents.size
  });
}

const runtimeManifestValidation = validateFieldSpellRuntimeManifest();
if (!runtimeManifestValidation.valid) {
  throw new RangeError(
    `Invalid Field Spell runtime manifest:\n${runtimeManifestValidation.errors.join('\n')}`
  );
}

export default FIELD_SPELL_RUNTIME_MANIFEST;
