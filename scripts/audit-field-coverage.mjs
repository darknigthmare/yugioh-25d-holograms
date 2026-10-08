import { writeFile } from 'node:fs/promises';
import { FIELD_SPELL_COVERAGE, getFieldSpellCoverageSummary } from '../src/ui/FieldSpellCoverage.js';

const summary = getFieldSpellCoverageSummary();
const report = {
  date: '2026-10-08',
  scope: {
    geometry: 'Adapted peripheral volumes; source illustrations preserved; no full spatial 1:1 claim.',
    implementedRules: 'Legacy JavaScript only; native availability and exercised effects are separate.',
    nativeAvailability: 'Bundled data/script and verified initialisation, not exhaustive script-branch certification.'
  },
  summary,
  pendingLegacyRules: summary.total - summary.implementedRules,
  pendingNativeAvailability: summary.total - summary.nativeAvailable,
  pendingNativeEffectScenarios: summary.total - summary.nativeEffectTested,
  pendingInspectedGeometry: summary.total - summary.inspectedGeometry,
  pendingSourceReconstructedGeometry: summary.total - summary.sourceReconstructedGeometry,
  cards: FIELD_SPELL_COVERAGE.map(card => ({
    passcode: card.cardId,
    name: card.name,
    localizedName: card.localizedName,
    sourceArt: card.sourceArtUrl,
    sourceURL: card.originalSourceUrl,
    dedicatedGeometry: card.hasDedicatedGeometry,
    inspectedGeometry: card.hasInspectedGeometry,
    sourceReconstructedGeometry: card.hasSourceReconstructedGeometry,
    motifs: card.motifs,
    legacyImplementedRules: card.gameplayImplemented,
    rulesURL: card.rulesSourceUrl,
    nativeScriptBundled: card.nativeScriptBundled,
    nativeInitialized: card.nativeInitialized,
    nativeGameplayAvailable: card.nativeGameplayAvailable,
    nativeEffectTested: card.nativeEffectTested,
    nativeIntegrationTested: card.nativeIntegrationTested,
    nativeRulesSourceURL: card.nativeRulesSourceUrl,
    publication: card.publication
  }))
};
await writeFile(new URL('../docs/audits/artifacts/field-coverage-wave-2026-10-08.json', import.meta.url),
  `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(summary));
