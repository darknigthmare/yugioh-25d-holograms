import { FIELD_SPELL_ENVIRONMENT_CATALOG, FIELD_SPELL_CATALOGUE_ADDITIONS } from './FieldSpellEnvironmentCatalog.js';
import { FIELD_SPELL_CARD_DATA_SNAPSHOT } from './FieldSpellCardDataSnapshot.js';
import { getFieldSpellReferenceArtEntry } from './FieldSpellReferenceArtManifest.js';
import { resolveFieldEnvironmentGeometryProfile } from './FieldEnvironmentGeometry.js';
import { IMPLEMENTED_FIELD_SPELLS } from '../core/ClassicFieldSpellEffects.js';
import { getStrictCardRegistration } from '../core/StrictCardRegistry.js';

const rulesById = new Map(IMPLEMENTED_FIELD_SPELLS.map(card => [String(card.id), card]));

// Every catalogue entry has its own evidence. An illustration or procedural
// family is never promoted to a completed 3D reconstruction or implemented rule.
export const FIELD_SPELL_COVERAGE = Object.freeze(FIELD_SPELL_ENVIRONMENT_CATALOG.map(entry => {
  const reference = getFieldSpellReferenceArtEntry(entry.cardId);
  const geometry = resolveFieldEnvironmentGeometryProfile(entry.environmentId, entry.cardId);
  const rules = rulesById.get(entry.cardId);
  return Object.freeze({
    ...entry,
    localizedName: rules?.name || entry.name,
    publication: FIELD_SPELL_CATALOGUE_ADDITIONS[entry.cardId] || null,
    sourceArtUrl: reference?.assetPath || null,
    originalSourceUrl: reference?.sourceUrl || null,
    hasSourceArt: Boolean(reference),
    hasDedicatedGeometry: geometry.hasDedicatedLandmark,
    hasInspectedGeometry: Boolean(geometry.inspectedArt),
    motifs: geometry.inspectedArt?.motifs || Object.freeze([]),
    gameplayImplemented: Boolean(rules && getStrictCardRegistration(entry.cardId)),
    rulesSourceUrl: rules?.rulesSourceUrl || null,
    effectText: FIELD_SPELL_CARD_DATA_SNAPSHOT[entry.cardId]?.effectText || '',
    rulesText: rules?.rulesText || null
  });
}));

export function getFieldSpellCoverageSummary(entries = FIELD_SPELL_COVERAGE) {
  return Object.freeze({
    total: entries.length,
    sourceArt: entries.filter(card => card.hasSourceArt).length,
    dedicatedGeometry: entries.filter(card => card.hasDedicatedGeometry).length,
    inspectedGeometry: entries.filter(card => card.hasInspectedGeometry).length,
    implementedRules: entries.filter(card => card.gameplayImplemented).length
  });
}

function searchText(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

export function filterFieldSpellCoverage({ query = '', status = 'all' } = {}, entries = FIELD_SPELL_COVERAGE) {
  const search = searchText(query.trim());
  const passcode = /^\d+$/.test(search) ? search.replace(/^0+(?=\d)/, '') : null;
  return entries.filter(card => {
    if (status === 'playable' && !card.gameplayImplemented) return false;
    if (status === 'pending-rules' && card.gameplayImplemented) return false;
    if (status === 'modeled' && !card.hasInspectedGeometry) return false;
    if (status === 'pending-model' && card.hasInspectedGeometry) return false;
    return !search || (passcode !== null && card.cardId === passcode)
      || searchText(`${card.name} ${card.localizedName} ${card.cardId} ${card.rulesText || ''}`).includes(search);
  });
}
