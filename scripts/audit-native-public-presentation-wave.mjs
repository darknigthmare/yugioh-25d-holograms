import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { makeSession, perform, endTurn, requireChain, scenarioEvidence, json, clone } from './native-field-audit-harness.mjs';
import { createNativeCardPresentationTemplate } from '../src/core/native/NativeCardCatalogue.js';
import * as current from '../src/core/native/NativeDuelVisualEvents.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';

export const PUBLIC_PRESENTATION_WAVE_PATH = new URL('../docs/audits/artifacts/native-public-presentation-wave-2026-10-08.json', import.meta.url);
const baselineCommit = '251fec0197ed85e40bca2af03e4431db1fef11e5';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const root = new URL('../', import.meta.url);

async function archivedTranslator() {
  const source = await readFile(new URL('../docs/audits/artifacts/native-visual-events-before-wave-2026-10-08.js.txt', import.meta.url), 'utf8');
  assert.equal(digest(source), '02c6a63d73a3d25c2257539090d7893b487e5c0b106a418e5609d985d007d075', 'Archived baseline translator bytes changed');
  const dependency = new URL('../src/core/native/NativeCardCharacteristics.js', import.meta.url).href;
  // Only module resolution changes for this read-only comparison; the archived
  // translator body is retained, and both hashes document that adaptation.
  const importAdapted = source.replace("'./NativeCardCharacteristics.js'", JSON.stringify(dependency));
  const module = await import(`data:text/javascript;base64,${Buffer.from(importAdapted).toString('base64')}`);
  return { module, provenance: { baselineCommit, archivedSourceSha256: digest(source),
    importAdaptedSha256: digest(importAdapted), adaptation: 'One relative module specifier becomes its file URL; translator body unchanged.' } };
}

export async function auditNativePublicPresentationWave() {
  const inputs = await loadNativeAuditInputs();
  const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const before = await archivedTranslator();
  const cases = [];
  async function run(label, exercise) {
    const s = await makeSession(inputs, core, label);
    const projections = [before.module, current].map(module => ({ module, events: [], requests: [],
      context: module.createNativeVisualContext({
        getCardMetadata: code => createNativeCardPresentationTemplate(inputs.resources, code),
        queryCard: request => {
          projections.find(p => p.module === module).requests.push(clone(request));
          return s.duel.queryCard(request);
        }
      }) }));
    const advance = s.advance.bind(s);
    s.advance = () => {
      const batch = advance();
      for (const message of batch.messages) for (const p of projections) {
        p.events.push(...p.module.translateNativeVisualEvents(message, p.context).events);
      }
      return batch;
    };
    try {
      const observations = await exercise(s, projections);
      cases.push({ ...scenarioEvidence(s, [], label), observations,
        before: { events: clone(projections[0].events), queries: projections[0].requests },
        after: { events: clone(projections[1].events), queries: projections[1].requests } });
    } finally { s.duel.close(); }
  }

  for (const caster of [0, 1]) await run(`confirmed-revival-from-opposing-graveyard-controller-${caster}`, (s, [old, now]) => {
    const L = s.C.OcgLocation;
    s.add(89631139, 1 - caster, L.GRAVE).add(83764718, caster, L.HAND).baseDecks().start();
    if (caster === 1) endTurn(s);
    perform(s, 'activate', 83764718, { codes: [89631139] });
    requireChain(s, 83764718);
    const real = s.card(caster, L.MZONE);
    assert.equal(real.code, 89631139);
    const summon = now.events.find(e => e.type === 'summon' && e.card?.id === '89631139');
    assert.equal(summon.nativeRevivalConfirmed, true);
    assert.equal(summon.summonType, 'special');
    assert.equal(summon.revivalFrom.owner, caster === 0 ? 'opponent' : 'player');
    assert.equal(createPublicCombatVisual(summon, {}).profile, 'revival');
    assert.equal(old.events.find(e => e.type === 'summon' && e.card?.id === '89631139').nativeRevivalConfirmed, undefined);
    const move = s.messages.findIndex(m => m.type === s.C.OcgMessageType.MOVE && m.card === 89631139
      && m.from.location === L.GRAVE && m.to.location === L.MZONE);
    const declaration = s.messages.findIndex(m => m.type === s.C.OcgMessageType.SPSUMMONING && m.code === 89631139);
    const success = s.messages.findIndex(m => m.type === s.C.OcgMessageType.SPSUMMONED);
    assert.ok(move >= 0 && move < declaration && declaration < success);
    return { actualMoveThenDeclarationThenSuccess: true, nativeSpecialSummonTypePreserved: true,
      beforeRevivalFlag: false, afterRevivalFlag: true, destinationQuery: clone(real) };
  });

  await run('necrovalley-negation-never-announces-revival', (s, [, now]) => {
    const L = s.C.OcgLocation;
    s.add(47355498, 0, L.HAND).add(83764718, 0, L.HAND).add(89631139, 1, L.GRAVE).baseDecks().start();
    perform(s, 'activate', 47355498);
    perform(s, 'activate', 83764718, { codes: [89631139] });
    requireChain(s, 83764718);
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.CHAIN_DISABLED));
    assert.equal(s.card(1, L.GRAVE).code, 89631139);
    assert.ok(!now.events.some(e => e.nativeRevivalConfirmed || e.type === 'summon'));
    return { actualNegation: true, noSuccessOrRevivalAnimation: true };
  });

  await run('creature-swap-rebinds-revealed-stats-to-native-destinations', (s, [old, now]) => {
    const L = s.C.OcgLocation;
    s.add(97590747, 0, L.MZONE).add(89631139, 1, L.MZONE, 0, s.C.OcgPosition.FACEUP_DEFENSE)
      .add(31036355, 0, L.HAND).baseDecks().start();
    perform(s, 'activate', 31036355, { codes: [97590747, 89631139] });
    requireChain(s, 31036355);
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.SWAP));
    const observations = [];
    for (const [controller, code, attack] of [[0, 89631139, 3000], [1, 97590747, 1800]]) {
      const loc = { controller, location: L.MZONE, sequence: 0 };
      assert.equal(s.card(controller, L.MZONE).code, code);
      const previous = old.module.readNativePublicCardStats(loc, old.context);
      const stats = current.readNativePublicCardStats(loc, now.context);
      assert.equal(previous, null);
      assert.equal(stats.attack, attack);
      const card = now.context.publicCards.get(`${controller}:${L.MZONE}:0:-`);
      assert.equal(card.id, String(code));
      assert.equal(card.controllerId, controller === 0 ? 'player' : 'opponent');
      observations.push({ controller, code, beforeStats: previous, afterStats: stats });
    }
    return { nativeSwapWithoutSummon: true, destinations: observations };
  });

  await run('book-of-moon-forgets-revealed-slot-identity-before-hidden-stats', (s, [old, now]) => {
    const L = s.C.OcgLocation;
    s.add(89631139, 0, L.GRAVE).add(83764718, 0, L.HAND).add(14087893, 0, L.HAND).baseDecks().start();
    perform(s, 'activate', 83764718, { codes: [89631139] });
    perform(s, 'activate', 14087893, { codes: [89631139] });
    requireChain(s, 14087893);
    const card = s.card(0, L.MZONE);
    assert.equal(card.position, s.C.OcgPosition.FACEDOWN_DEFENSE);
    const key = `0:${L.MZONE}:0:-`;
    assert.equal(old.context.publicCodes.get(key), 89631139);
    assert.equal(now.context.publicCodes.has(key), false);
    assert.equal(now.context.publicCards.has(key), false);
    const requestsBefore = now.requests.length;
    assert.equal(current.readNativePublicCardStats({ controller: 0, location: L.MZONE, sequence: 0 }, now.context), null);
    assert.equal(now.requests.length, requestsBefore);
    const event = now.events.findLast(e => e.type === 'set-monster');
    assert.equal(event.card, null);
    assert.equal(event.hidden, true);
    return { beforeRetainedCode: 89631139, afterIdentityForgotten: true, hiddenStatsNotQueried: true };
  });

  await run('graveyard-removal-renumbers-public-pile-without-stale-code', (s, [old, now]) => {
    const L = s.C.OcgLocation;
    s.add(89631139, 0, L.MZONE).add(97590747, 0, L.MZONE, 1)
      .add(53129443, 0, L.HAND).add(83764718, 0, L.HAND).baseDecks().start();
    perform(s, 'activate', 53129443);
    perform(s, 'activate', 83764718, { codes: [89631139] });
    requireChain(s, 53129443); requireChain(s, 83764718);
    const native = s.card(0, L.GRAVE, 0);
    assert.equal(native.code, 97590747);
    const loc = { controller: 0, location: L.GRAVE, sequence: 0 };
    assert.equal(old.module.readNativePublicCardStats(loc, old.context), null);
    const stats = current.readNativePublicCardStats(loc, now.context);
    assert.equal(stats.attack, 1800);
    return { actualRemovalShiftedNextCardToSequenceZero: true, beforeStats: null, afterStats: stats };
  });

  await run('genuine-hand-special-summon-keeps-ordinary-profile', (s, [, now]) => {
    const L = s.C.OcgLocation;
    s.add(45894482, 0, L.HAND).baseDecks().start();
    perform(s, 'special', 45894482);
    assert.equal(s.card(0, L.MZONE).code, 45894482);
    const summon = now.events.find(e => e.type === 'summon' && e.card?.id === '45894482');
    assert.equal(summon.nativeRevivalConfirmed, undefined);
    assert.equal(createPublicCombatVisual(summon, {}).profile, 'special-summon');
    return { actualHandOrigin: true, noRevivalFlagOrProfile: true };
  });

  const paths = ['scripts/audit-native-public-presentation-wave.mjs', 'scripts/native-field-audit-inputs.mjs',
    'scripts/native-field-audit-harness.mjs', 'src/core/native/NativeDuelVisualEvents.js',
    'src/ui/PublicDuelVisuals.js', 'src/core/native/NativeDuelGame.js', 'src/core/native/NativeDuelDecisions.js',
    'src/ui/NativeDuelPresentationModel.js',
    'src/core/native/NativeCardCatalogue.js', 'src/core/native/NativeDuelRuntime.js',
    'src/core/native/NativeCardCharacteristics.js', 'src/core/native/vendor/ocgcore/index.js',
    'public/native/card-data.json', 'public/native/scripts.json',
    'docs/audits/artifacts/native-visual-events-before-wave-2026-10-08.js.txt'];
  const sourceHashes = {};
  for (const path of paths) sourceHashes[path] = digest(await readFile(new URL(path, root)));
  return { date: '2026-10-08', scope: 'Public rendering provenance from actual native movements and successful summons; no rule result is manufactured.',
    beforeProvenance: before.provenance, sourceHashes, nativeApi: core.getVersion(),
    upstreamArchiveBytesModified: false, postStartInjection: false, debugApi: false,
    summary: { scenarios: cases.length, passed: cases.length }, cases };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const report = await auditNativePublicPresentationWave();
  await mkdir(new URL('.', PUBLIC_PRESENTATION_WAVE_PATH), { recursive: true });
  await writeFile(PUBLIC_PRESENTATION_WAVE_PATH, `${json(report)}\n`);
  console.log(json(report.summary));
}
