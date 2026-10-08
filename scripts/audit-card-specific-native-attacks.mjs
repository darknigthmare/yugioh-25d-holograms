import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { createNativeFieldScenarioRunner, reachIdle, endTurn, enterBattle, battleAttack,
  leaveBattle, clone, json } from './native-field-audit-harness.mjs';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';

const inputs = await loadNativeAuditInputs();
const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
const { scenarios, run } = createNativeFieldScenarioRunner(inputs, core);
const initialProjection = new Map();
const cases = [[89631139, 3000], [74677422, 2400], [91152256, 1400], [70781052, 2500]];
for (const [code, attack] of cases) {
  await run(`native-attack-${code}`, [], 'An actual MR5 Battle command attacks a public Mystical Elf and resolves native destruction and damage.', s => {
    const L = s.C.OcgLocation, M = s.C.OcgMessageType;
    s.add(code, 0, L.MZONE).add(15025844, 1, L.MZONE).baseDecks().start();
    reachIdle(s);
    const projection = [0, 1].map(controller => ({ controller, location: L.MZONE, sequence: 0,
      result: clone(s.card(controller, L.MZONE)) }));
    assert.equal(projection[0].result.code, code); assert.equal(projection[0].result.attack, attack);
    assert.equal(projection[1].result.code, 15025844); assert.equal(projection[1].result.attack, 800);
    initialProjection.set(s.label, projection);
    // The first player cannot attack on turn 1. Advance both real End Phases.
    endTurn(s); endTurn(s); enterBattle(s); battleAttack(s, code, 15025844); leaveBattle(s);
    const battle = s.messages.find(message => message.type === M.BATTLE);
    assert.ok(s.messages.some(message => message.type === M.ATTACK));
    assert.equal(battle.card.attack, attack); assert.equal(battle.target.attack, 800);
    assert.equal(battle.target.destroyed, true);
    assert.ok(s.location(1, L.GRAVE).some(card => card.code === 15025844 && (card.reason & 1)));
    const field = s.duel.queryField(); s.queries.push({ query: { field: true }, result: clone(field) });
    assert.equal(field.players[0].lp, 8000); assert.equal(field.players[1].lp, 8000 - (attack - 800));
    assert.equal(s.card(0, L.MZONE).code, code);
  });
}
assert.equal(scenarios.length, 4);
assert.ok(scenarios.every(scenario => scenario.status === 'passed'), json(scenarios.filter(scenario => scenario.status !== 'passed')));
const metadata = code => inputs.resources.metadata.get(inputs.resources.canonicalCodeToSource?.get(Number(code)) ?? Number(code));
const aim = ref => ref.owner === 'player' ? [-3, .5, 0] : [3, .5, 0];
const presentations = [];
for (const scenario of scenarios) {
  const projection = initialProjection.get(scenario.id);
  scenario.initialPublicProjection = projection;
  const context = createNativeVisualContext({
    getCardMetadata: metadata,
    getCardAt: loc => {
      const row = projection.find(item => item.controller === loc.controller && item.location === loc.location && item.sequence === loc.sequence);
      if (!row || row.result.position & 10) return null;
      return { ...metadata(row.result.code), id: String(row.result.code), isSetFaceDown: false };
    }
  });
  const events = scenario.messages.flatMap(message => translateNativeVisualEvents(message, context).events);
  scenario.publicEvents = clone(events);
  const attack = events.find(event => event.type === 'attack-monster');
  assert.ok(attack); assert.equal(attack.card.id, scenario.id.split('-').at(-1));
  const visual = createPublicCombatVisual(attack, {}, aim);
  assert.equal(visual.kind, 'attack');
  presentations.push({ label: metadata(attack.card.id).name, sourceScenario: scenario.id,
    nativeEventType: attack.type, visual });
  if (scenario === scenarios[0]) {
    const destroyed = events.find(event => event.type === 'destroy' && event.card?.id === '15025844');
    assert.ok(destroyed);
    presentations.push({ label: 'Destruction réellement résolue', sourceScenario: scenario.id,
      nativeEventType: destroyed.type, visual: createPublicCombatVisual(destroyed, {}, aim) });
  }
}
// Reuse the separately executed real root scenarios, preserving their original
// evidence file and its hash. This is rendered protocol evidence, not a new duel.
const rootPath = 'docs/audits/artifacts/native-public-presentation-wave-2026-10-08.json';
const referencePath = 'docs/audits/artifacts/effects-wave-2026-10-08/referenced-native-public-evidence.json';
const rootBytes = await readFile(new URL(`../${rootPath}`, import.meta.url));
const rootReport = JSON.parse(rootBytes);
for (const [id, eventType, label] of [
  ['confirmed-revival-from-opposing-graveyard-controller-0', 'summon', 'Réanimation confirmée depuis le Cimetière adverse'],
  ['necrovalley-negation-never-announces-revival', 'chain-negated', 'Annulation native de Monster Reborn']
]) {
  const scenario = rootReport.cases.find(value => value.id === id);
  assert.equal(scenario?.status, 'passed');
  const event = scenario.after.events.find(value => value.type === eventType);
  assert.ok(event);
  const visual = createPublicCombatVisual(event, {}, aim);
  assert.equal(visual.kind, eventType === 'summon' ? 'summon' : 'negate');
  if (eventType === 'summon') assert.equal(visual.profile, 'revival');
  presentations.push({ label, sourceScenario: id, sourceEvidenceFile: referencePath,
    originalEvidenceFile: rootPath, nativeEventType: eventType, visual });
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const paths = ['scripts/audit-card-specific-native-attacks.mjs', 'scripts/native-field-audit-harness.mjs',
  'scripts/native-field-audit-inputs.mjs', 'src/ui/CombatVisualEffects.js', 'src/ui/CardSpecificVisualEffects.js',
  'src/ui/CombatVisualProfiles.js', 'src/ui/PublicDuelVisuals.js', 'src/core/native/NativeDuelVisualEvents.js',
  'src/core/native/NativeDuelRuntime.js', 'src/core/native/NativeDuelDecisions.js',
  'src/ui/NativeDuelPresentationModel.js', 'src/core/native/NativeCardData.js',
  'src/core/native/NativeScriptArchive.js', 'src/core/native/NativeCardCharacteristics.js',
  'src/core/native/NativeCoreAssets.js', 'src/core/native/NativeCardScriptCorrections.js',
  'src/core/native/NativeLuaCompatibility.js', 'src/core/native/vendor/ocgcore/index.js',
  'test/card-specific-visual-effects.test.js',
  ...[89631139, 74677422, 91152256, 70781052, 83764718, 44095762]
    .map(code => `public/cards/cropped/${code}.jpg`),
  'public/native/ocgcore.sync.wasm', 'public/native/core-build.json',
  'public/native/card-data.json', 'public/native/scripts.json'];
const sourceHashes = Object.fromEntries(await Promise.all(paths.map(async path => [path,
  sha256(await readFile(new URL(`../${path}`, import.meta.url)))])));
const report = { date: '2026-10-08', scope: 'Four actual native attacks; seven public presentations for isolated renderer inspection',
  nativeApi: core.getVersion(), fixtureBeforeStartOnly: true, postStartInjection: false, debugApi: false,
  sourceHashes, referencedNativeEvidence: { path: referencePath, originalPath: rootPath, sha256: sha256(rootBytes) },
  summary: { nativeAttacks: scenarios.length, passed: scenarios.length, presentations: presentations.length },
  scenarios, presentations };
const output = new URL('../docs/audits/artifacts/effects-wave-2026-10-08/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('referenced-native-public-evidence.json', output), rootBytes);
await writeFile(new URL('native-attacks.json', output), json(report) + '\n');
console.log(json(report.summary));
