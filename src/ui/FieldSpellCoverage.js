import { FIELD_SPELL_ENVIRONMENT_CATALOG, FIELD_SPELL_CATALOGUE_ADDITIONS } from './FieldSpellEnvironmentCatalog.js';
import { FIELD_SPELL_CARD_DATA_SNAPSHOT } from './FieldSpellCardDataSnapshot.js';
import { getFieldSpellReferenceArtEntry } from './FieldSpellReferenceArtManifest.js';
import { resolveFieldEnvironmentGeometryProfile } from './FieldEnvironmentGeometry.js';
import { IMPLEMENTED_FIELD_SPELLS } from '../core/ClassicFieldSpellEffects.js';
import { getStrictCardRegistration } from '../core/StrictCardRegistry.js';
import { NATIVE_FIELD_COVERAGE_SNAPSHOT } from './NativeFieldCoverageSnapshot.js';
import { NATURE_CARD_LANDMARKS } from './FieldEnvironmentNatureReferences.js';
import { ARCHITECTURAL_CARD_LANDMARKS } from './FieldEnvironmentArchitecturalReferences.js';
import { TECHNOLOGY_CARD_LANDMARKS } from './FieldEnvironmentTechnologyReferences.js';
import { MYSTICAL_CARD_LANDMARKS } from './FieldEnvironmentMysticalReferences.js';
import { URBAN_CARD_LANDMARKS } from './FieldEnvironmentUrbanReferences.js';

const rulesById = new Map(IMPLEMENTED_FIELD_SPELLS.map(card => [String(card.id), card]));
const nativeBundledIds = new Set(NATIVE_FIELD_COVERAGE_SNAPSHOT.bundledCardIds);
const nativeInitializedIds = new Set(NATIVE_FIELD_COVERAGE_SNAPSHOT.initializedCardIds);
const nativeEffectTestedIds = new Set(NATIVE_FIELD_COVERAGE_SNAPSHOT.effectTestedCardIds);
const nativeIntegrationTestedIds = new Set(NATIVE_FIELD_COVERAGE_SNAPSHOT.integrationTestedCardIds);
const reconstructedIds = new Set([...Object.keys(NATURE_CARD_LANDMARKS), ...Object.keys(ARCHITECTURAL_CARD_LANDMARKS),
  ...Object.keys(TECHNOLOGY_CARD_LANDMARKS), ...Object.keys(MYSTICAL_CARD_LANDMARKS), ...Object.keys(URBAN_CARD_LANDMARKS)]);

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
    hasSourceReconstructedGeometry: reconstructedIds.has(entry.cardId),
    motifs: geometry.inspectedArt?.motifs || Object.freeze([]),
    gameplayImplemented: Boolean(rules && getStrictCardRegistration(entry.cardId)),
    // Keep the original JS implementation count separate from native evidence.
    nativeScriptBundled: nativeBundledIds.has(entry.cardId),
    nativeInitialized: nativeInitializedIds.has(entry.cardId),
    nativeGameplayAvailable: nativeBundledIds.has(entry.cardId) && nativeInitializedIds.has(entry.cardId),
    nativeEffectTested: nativeEffectTestedIds.has(entry.cardId),
    nativeIntegrationTested: nativeIntegrationTestedIds.has(entry.cardId),
    nativeRulesSourceUrl: nativeBundledIds.has(entry.cardId)
      ? `https://github.com/ProjectIgnis/CardScripts/blob/${NATIVE_FIELD_COVERAGE_SNAPSHOT.scriptsCommit}/${NATIVE_FIELD_COVERAGE_SNAPSHOT.scriptSourceOverrides[entry.cardId] ?? `official/c${entry.cardId}.lua`}` : null,
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
    sourceReconstructedGeometry: entries.filter(card => card.hasSourceReconstructedGeometry).length,
    implementedRules: entries.filter(card => card.gameplayImplemented).length,
    nativeBundled: entries.filter(card => card.nativeScriptBundled).length,
    nativeInitialized: entries.filter(card => card.nativeInitialized).length,
    nativeAvailable: entries.filter(card => card.nativeGameplayAvailable).length,
    nativeEffectTested: entries.filter(card => card.nativeEffectTested).length,
    nativeIntegrationTested: entries.filter(card => card.nativeIntegrationTested).length
  });
}

function searchText(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
}

export function filterFieldSpellCoverage({ query = '', status = 'all', engine = 'legacy' } = {}, entries = FIELD_SPELL_COVERAGE) {
  const search = searchText(query.trim());
  const passcode = /^\d+$/.test(search) ? search.replace(/^0+(?=\d)/, '') : null;
  return entries.filter(card => {
    const available = engine === 'native' ? card.nativeGameplayAvailable : card.gameplayImplemented;
    if (status === 'playable' && !available) return false;
    if (status === 'pending-rules' && available) return false;
    if (status === 'native-effect-tested' && !card.nativeEffectTested) return false;
    if (status === 'modeled' && !card.hasInspectedGeometry) return false;
    if (status === 'pending-model' && card.hasInspectedGeometry) return false;
    return !search || (passcode !== null && card.cardId === passcode)
      || searchText(`${card.name} ${card.localizedName} ${card.cardId} ${card.rulesText || ''}`).includes(search);
  });
}
