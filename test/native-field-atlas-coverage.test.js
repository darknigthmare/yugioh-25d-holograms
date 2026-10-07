import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FIELD_SPELL_COVERAGE, filterFieldSpellCoverage, getFieldSpellCoverageSummary } from '../src/ui/FieldSpellCoverage.js';
import { NATIVE_FIELD_COVERAGE_SNAPSHOT } from '../src/ui/NativeFieldCoverageSnapshot.js';
import { nativeFieldCoverageSnapshot } from '../scripts/generate-native-field-coverage.mjs';
import { FieldSpellAtlas } from '../src/ui/FieldSpellAtlas.js';

test('native atlas availability preserves distinct legacy, initialization, effect and geometry evidence', () => {
  const summary = getFieldSpellCoverageSummary();
  assert.equal(summary.total, 339);
  assert.equal(summary.implementedRules, 29);
  assert.equal(summary.nativeAvailable, 339);
  assert.equal(summary.nativeBundled, 339);
  assert.equal(summary.nativeInitialized, 339);
  assert.equal(summary.nativeEffectTested, 18);
  assert.equal(summary.nativeIntegrationTested, 0);
  assert.equal(summary.dedicatedGeometry, 89);
  assert.equal(summary.inspectedGeometry, 50);
  assert.equal(summary.sourceReconstructedGeometry, 26);
  assert.equal(filterFieldSpellCoverage({ status: 'playable' }).length, 29);
  assert.equal(filterFieldSpellCoverage({ status: 'pending-rules' }).length, 310);
  assert.equal(filterFieldSpellCoverage({ status: 'playable', engine: 'native' }).length, 339);
  assert.equal(filterFieldSpellCoverage({ status: 'pending-rules', engine: 'native' }).length, 0);
  assert.equal(filterFieldSpellCoverage({ status: 'native-effect-tested', engine: 'native' }).length, 18);
  assert.equal(FIELD_SPELL_COVERAGE.some(card => card.nativeInitialized && !card.nativeEffectTested), true);
});

test('compact UI proof agrees with each native audit record rather than declaring all effects tested', async () => {
  const report = JSON.parse(await readFile(new URL('../docs/audits/artifacts/native-field-runtime-2026-10-07.json', import.meta.url), 'utf8'));
  assert.deepEqual(NATIVE_FIELD_COVERAGE_SNAPSHOT, nativeFieldCoverageSnapshot(report));
  assert.equal(NATIVE_FIELD_COVERAGE_SNAPSHOT.summary.passedScenarios, 20);
  assert.equal(NATIVE_FIELD_COVERAGE_SNAPSHOT.summary.scenarios, 20);
  assert.equal(Object.isFrozen(NATIVE_FIELD_COVERAGE_SNAPSHOT.effectTestedCardIds), true);
  for (const card of FIELD_SPELL_COVERAGE) {
    const row = report.matrix.find(row => String(row.canonicalCode) === card.cardId);
    assert.equal(card.nativeScriptBundled, row.bundled);
    assert.equal(card.nativeInitialized, row.initialized);
    assert.equal(card.nativeEffectTested, row.effectTested);
    assert.equal(card.nativeIntegrationTested, row.integrationTested);
    assert.equal(card.nativeRulesSourceUrl,
      `https://github.com/ProjectIgnis/CardScripts/blob/${report.resources.sources.scripts.commit}/${row.scriptPath}`);
  }
});

test('new releases retain regional publication status independently of engine availability', () => {
  const announced = FIELD_SPELL_COVERAGE.find(card => card.cardId === '12845564');
  assert.equal(announced.publication.status, 'announced');
  assert.equal(announced.gameplayImplemented, false);
  assert.equal(announced.nativeGameplayAvailable, true);
  assert.equal(announced.nativeEffectTested, true,
    'Angelechy has an explicit native opposing-zone placement regression after the core upgrade');
  assert.match(announced.nativeRulesSourceUrl, /pre-release\/c101402095\.lua$/);
  assert.equal(FIELD_SPELL_COVERAGE.some(card => card.cardId.startsWith('101403')), false);
});

function viewStub(engine) {
  const nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: '', hidden: false, replaceChildren() {},
      querySelector() { return node(`${selector}/option`); } });
    return nodes.get(selector);
  };
  return { engine, visible: false, generation: 0, preview: null,
    dialog: { querySelector: node, querySelectorAll: () => [] },
    filter: node('filter'), render() {}, nodes };
}

test('atlas text explains 339 native available cards and 18 scenario-tested fields separately', async () => {
  const view = viewStub('native');
  FieldSpellAtlas.prototype.open.call(view);
  const summary = view.nodes.get('#field-atlas-summary').textContent;
  assert.match(summary, /339 effets disponibles/);
  assert.match(summary, /18 Terrains vérifiés en scénarios/);
  assert.match(summary, /50 décors étudiés/);
  view.visible = false;
  const newField = FIELD_SPELL_COVERAGE.find(card => card.cardId === '12845564');
  await FieldSpellAtlas.prototype.select.call(view, newField);
  assert.match(view.nodes.get('#field-atlas-rule-status').textContent, /initialisation vérifiée/);
  assert.match(view.nodes.get('#field-atlas-rule-status').textContent, /Effet vérifié en scénario/);
  const initializedOnly = FIELD_SPELL_COVERAGE.find(card => card.nativeInitialized && !card.nativeEffectTested);
  await FieldSpellAtlas.prototype.select.call(view, initializedOnly);
  assert.match(view.nodes.get('#field-atlas-rule-status').textContent, /Scénarios d’effets à compléter/);
  assert.equal(view.nodes.get('#field-atlas-rules-link').textContent, 'Source de l’effet — Project Ignis');
  await FieldSpellAtlas.prototype.select.call(view, newField);
  assert.match(view.nodes.get('#field-atlas-publication').textContent, /Sortie annoncée/);
  const legacy = viewStub('legacy');
  FieldSpellAtlas.prototype.open.call(legacy);
  assert.match(legacy.nodes.get('#field-atlas-summary').textContent, /29 effets jouables/);
});
