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
const cases = [[46986414, 2500], [38033121, 2000], [32452818, 1200], [97590747, 1800]];
for (const [code, attack] of cases) {
  await run(`continuation-native-attack-${code}`, [], 'An actual MR5 Battle command attacks a public Mystical Elf and resolves native destruction and damage.', s => {
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
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const paths = ['scripts/audit-continuation-effects-native.mjs', 'scripts/native-field-audit-harness.mjs',
  'scripts/native-field-audit-inputs.mjs', 'src/ui/CombatVisualEffects.js', 'src/ui/CardSpecificVisualEffects.js',
  'src/ui/CombatVisualProfiles.js', 'src/ui/PublicDuelVisuals.js', 'src/core/native/NativeDuelVisualEvents.js',
  'src/core/native/NativeDuelRuntime.js', 'src/core/native/NativeDuelDecisions.js',
  'src/ui/NativeDuelPresentationModel.js', 'src/core/native/NativeCardData.js',
  'src/core/native/NativeScriptArchive.js', 'src/core/native/NativeCardCharacteristics.js',
  'src/core/native/NativeCoreAssets.js', 'src/core/native/NativeCardScriptCorrections.js',
  'src/core/native/NativeLuaCompatibility.js', 'src/core/native/vendor/ocgcore/index.js',
  'test/continuation-effects-2026-10-08.test.js',
  ...[46986414, 38033121, 32452818, 97590747]
    .map(code => `public/cards/cropped/${code}.jpg`),
  'public/native/ocgcore.sync.wasm', 'public/native/core-build.json',
  'public/native/card-data.json', 'public/native/scripts.json'];
const sourceHashes = Object.fromEntries(await Promise.all(paths.map(async path => [path,
  sha256(await readFile(new URL(`../${path}`, import.meta.url)))])));
const report = { date: '2026-10-08', scope: 'Four additional actual native attacks; four public presentations for isolated renderer inspection',
  nativeApi: core.getVersion(), fixtureBeforeStartOnly: true, postStartInjection: false, debugApi: false,
  sourceHashes,
  summary: { nativeAttacks: scenarios.length, passed: scenarios.length, presentations: presentations.length },
  scenarios, presentations };
const output = new URL('../docs/audits/artifacts/continuation-effects-2026-10-08/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('native-attacks.json', output), json(report) + '\n');
console.log(json(report.summary));
