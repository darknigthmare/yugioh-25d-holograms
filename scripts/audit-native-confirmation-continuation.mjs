import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { makeSession, perform, endTurn, enterBattle, requireChain, scenarioEvidence, clone, json } from './native-field-audit-harness.mjs';
import { createNativeCardPresentationTemplate } from '../src/core/native/NativeCardCatalogue.js';
import { createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';
import { createNativePublicRevealPolicy, NATIVE_PUBLIC_REVEAL_SOURCES } from '../src/core/native/NativePublicRevealPolicy.js';
import * as current from '../src/core/native/NativeDuelVisualEvents.js';

export const CONFIRMATION_CONTINUATION_PATH = new URL('../docs/audits/artifacts/native-confirmation-continuation-2026-10-08.json', import.meta.url);
const sha256 = value => createHash('sha256').update(value).digest('hex');

export async function auditNativeConfirmationContinuation() {
  const inputs = await loadNativeAuditInputs();
  const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const source = await readFile(new URL('../docs/audits/artifacts/native-confirmation-before-continuation-2026-10-08.js.txt', import.meta.url), 'utf8');
  assert.equal(sha256(source), '13b5c2897a486c7837d1740b0fded2a96deaf9bc6d1cf0e157511fa4f5746f85');
  const adapted = source.replace("'./NativeCardCharacteristics.js'", JSON.stringify(new URL('../src/core/native/NativeCardCharacteristics.js', import.meta.url).href));
  const previous = await import(`data:text/javascript;base64,${Buffer.from(adapted).toString('base64')}`);
  const policy = createNativePublicRevealPolicy(inputs.resources, { scriptReader: createNativeScriptReader(inputs.resources.scripts) });
  const name = value => { const found = [...inputs.resources.metadata].find(([, card]) => card.name === value); assert.ok(found, value); return found[0]; };
  const cases = [];
  async function run(id, fieldIds, exercise, fixtureOptions = {}) {
    const s = await makeSession(inputs, core, id, fixtureOptions), projections = [];
    for (const [version, module] of [['before', previous], ['after', current]]) for (const playerController of [0, 1]) {
      const p = { version, playerController, events: [], logs: [], metadataLookups: [], nativeQueries: [], activeMessage: null };
      p.context = module.createNativeVisualContext({ playerController,
        ...(version === 'after' ? { isPublicReveal: policy } : {}),
        getCardMetadata: code => { p.metadataLookups.push({ code, messageType: p.activeMessage?.type }); return createNativeCardPresentationTemplate(inputs.resources, code); },
        queryCard: query => { p.nativeQueries.push({ query: clone(query), messageType: p.activeMessage?.type }); return s.duel.queryCard(query); }
      });
      p.module = module; projections.push(p);
    }
    const advance = s.advance.bind(s);
    s.advance = () => { const batch = advance(); for (const message of batch.messages) for (const p of projections) {
      p.activeMessage = message; const output = p.module.translateNativeVisualEvents(message, p.context);
      p.events.push(...output.events); p.logs.push(...output.logs);
    } return batch; };
    const get = (version, viewer) => projections.find(p => p.version === version && p.playerController === viewer);
    try {
      const observations = await exercise(s, get);
      cases.push({ ...scenarioEvidence(s, fieldIds, id), observations,
        projections: projections.map(({ context, module, activeMessage, ...p }) => clone(p)) });
    } finally { s.duel.close(); }
  }
  function publicConfirmations(s, get, expected) {
    const confirmations = s.messages.filter(m => m.type === 31);
    assert.equal(confirmations.flatMap(m => m.cards).length, expected);
    for (const viewer of [0, 1]) {
      const old = get('before', viewer), now = get('after', viewer);
      const reveals = now.events.filter(e => e.type === 'reveal' && e.nativeConfirmationConfirmed === true);
      assert.equal(reveals.length, expected);
      assert.ok(reveals.every(e => e.publicReveal === true && /^native-public-confirmation-[1-9]\d*$/.test(e.confirmationGroupId)));
      assert.equal(now.events.filter(e => e.type === 'inspect').length, 0);
      assert.equal(now.nativeQueries.filter(q => q.messageType === 31).length, 0);
      assert.equal(now.logs.filter(log => log.message.startsWith('Carte révélée')).length, expected);
      assert.equal(old.events.filter(e => e.type === 'reveal').length, 0);
      for (const m of confirmations) for (const card of m.cards) assert.ok(!now.context.publicCodes.has(`${card.controller}:${card.location}:${card.sequence}:-`));
      assert.equal(now.context.confirmSourceLink, null, 'Completed Chain must forget its reveal source');
    }
    return { beforeConfirmationWasRecipientOnly: true, bothViewersReceivePublicConfirmedCards: true,
      noHiddenStatQueriesOrPublicSlotCache: true, revealSourceClearedAfterChain: true, revealedCards: expected };
  }
  function privateConfirmation(s, get, recipient) {
    const confirmation = s.messages.find(m => m.type === 31); assert.ok(confirmation);
    assert.equal(confirmation.player, recipient);
    for (const version of ['before', 'after']) {
      const own = get(version, recipient), other = get(version, 1 - recipient);
      assert.equal(own.events.filter(e => e.type === 'inspect').length, confirmation.cards.length);
      assert.ok(own.events.filter(e => e.type === 'inspect').every(e => e.private && e.audienceController === recipient));
      assert.equal(other.metadataLookups.filter(q => q.messageType === 31).length, 0);
      assert.equal(other.nativeQueries.filter(q => q.messageType === 31).length, 0);
      assert.equal(other.events.filter(e => ['inspect', 'reveal'].includes(e.type)).length, 0);
      assert.equal(own.events.filter(e => e.type === 'reveal').length, 0);
      assert.equal(own.logs.filter(log => log.message.startsWith('Carte révélée')).length, 0);
    }
    return { nativeRecipient: recipient, privateAudienceUnchanged: true, otherViewerHasZeroIdentityReads: true };
  }
  for (const caster of [0, 1]) await run(`private-smartfon-defense-${caster}`, [], (s, get) => {
    const L = s.C.OcgLocation;
    s.add(15521027, caster, L.HAND).add(name('Morphtronic Celfon'), caster, L.GRAVE);
    for (const code of [89631139, 46986414, 97590747, 23635815, 43096270, 53129443, 83764718, 5318639]) s.add(code, caster, L.DECK);
    s.add(23635815, 1 - caster, L.DECK).start(); if (caster) endTurn(s);
    perform(s, 'special', 15521027, { respond: (p, C) => p.type === C.OcgMessageType.SELECT_POSITION ? { type: C.OcgResponseType.SELECT_POSITION, position: C.OcgPosition.FACEUP_DEFENSE } : null });
    perform(s, 'activate', 15521027); requireChain(s, 15521027); return privateConfirmation(s, get, caster);
  }, { seed: caster ? [0x123456789abcdef0n, 0xfedcba9876543210n, 0xaabbccddeeff0011n, 0x1020304050607080n] : [1n, 2n, 3n, 4n] });
  for (const caster of [0, 1]) await run(`private-diabolos-opposing-deck-${caster}`, [], (s, get) => {
    const L = s.C.OcgLocation;
    s.add(29424328, caster, L.HAND).add(46986414, caster, L.MZONE).add(46986414, caster, L.MZONE, 1);
    for (const code of [89631139, 97590747, 23635815, 43096270]) s.add(code, 1 - caster, L.DECK);
    s.add(23635815, caster, L.DECK).start(); if (caster) endTurn(s, { effectYes: () => false });
    perform(s, 'summon', 29424328); endTurn(s); requireChain(s, 29424328); return privateConfirmation(s, get, caster);
  });
  for (const caster of [0, 1]) await run(`public-smartfon-attack-decktop-${caster}`, [], (s, get) => {
    const L = s.C.OcgLocation;
    s.add(15521027, caster, L.HAND).add(name('Morphtronic Celfon'), caster, L.GRAVE);
    for (const code of [89631139, 46986414, 97590747, 23635815, 43096270, 53129443, 83764718, 5318639]) s.add(code, caster, L.DECK);
    s.add(23635815, 1 - caster, L.DECK).start(); if (caster) endTurn(s);
    perform(s, 'special', 15521027); perform(s, 'activate', 15521027); requireChain(s, 15521027);
    assert.ok(s.messages.some(m => m.type === 30));
    for (const viewer of [0, 1]) assert.deepEqual(get('after', viewer).events.filter(e => e.type === 'reveal'), get('before', viewer).events.filter(e => e.type === 'reveal'));
    return { publicExcavationEventsUnchanged: true };
  });
  for (const caster of [0, 1]) await run(`public-gaia-cost-and-search-${caster}`, [2106266], (s, get) => {
    const L = s.C.OcgLocation;
    s.add(2106266, caster, L.HAND).add(name('Curse of Dragon'), caster, L.HAND).add(name('Gaia The Fierce Knight'), caster, L.DECK).baseDecks().start();
    if (caster) endTurn(s); perform(s, 'activate', 2106266); perform(s, 'activate', 2106266); requireChain(s, 2106266);
    assert.ok(s.location(caster, L.HAND).some(c => c.code === name('Gaia The Fierce Knight'))); return publicConfirmations(s, get, 2);
  });
  for (const owner of [0, 1]) await run(`public-duel-tower-both-decks-${owner}`, [43940008], (s, get) => {
    const L = s.C.OcgLocation;
    s.add(43940008, owner, L.HAND).add(89631139, 0, L.DECK).add(68638985, 1, L.DECK).add(23635815, 0, L.HAND).baseDecks().start();
    if (owner) endTurn(s); perform(s, 'activate', 43940008); if (!owner) endTurn(s, { effectYes: p => p.code !== 43940008 });
    enterBattle(s, { select: p => p.player === 0 ? (p.selects.some(c => c.code === 89631139) ? [89631139] : [23635815]) : [68638985] });
    requireChain(s, 43940008); return publicConfirmations(s, get, 2);
  });
  for (const [code, target] of [[32807846, name('Celtic Guardian')], [73628505, 2084239]]) for (const caster of [0, 1]) await run(`public-search-${code}-${caster}`, code === 73628505 ? [2084239] : [], (s, get) => {
    const L = s.C.OcgLocation;
    s.add(code, caster, L.HAND).add(target, caster, L.DECK).baseDecks().start(); if (caster) endTurn(s);
    perform(s, 'activate', code, { codes: [target] }); requireChain(s, code);
    assert.ok(s.location(caster, L.HAND).some(c => c.code === target)); return publicConfirmations(s, get, 1);
  });
  for (const caster of [0, 1]) await run(`public-dragon-ravine-search-${caster}`, [62265044], (s, get) => {
    const L = s.C.OcgLocation, target = name('Dragunity Dux');
    s.add(62265044, caster, L.HAND).add(46986414, caster, L.HAND).add(target, caster, L.DECK).baseDecks().start(); if (caster) endTurn(s);
    perform(s, 'activate', 62265044); perform(s, 'activate', 62265044, { option: 0, select: p => p.selects[0].location === L.HAND ? [46986414] : [target] });
    assert.ok(s.location(caster, L.HAND).some(c => c.code === target)); return publicConfirmations(s, get, 1);
  });
  for (const caster of [0, 1]) await run(`public-union-hangar-search-${caster}`, [66399653], (s, get) => {
    const L = s.C.OcgLocation, target = name('B-Buster Drake');
    s.add(66399653, caster, L.HAND).add(target, caster, L.DECK).baseDecks().start(); if (caster) endTurn(s);
    perform(s, 'activate', 66399653, { codes: [target] }); requireChain(s, 66399653);
    assert.ok(s.location(caster, L.HAND).some(c => c.code === target)); return publicConfirmations(s, get, 1);
  });
  for (const code of [26202165, 78010363]) for (const caster of [0, 1]) await run(`public-grave-trigger-${code}-${caster}`, [], (s, get) => {
    const L = s.C.OcgLocation, target = name('Celtic Guardian');
    s.add(code, caster, L.MZONE).add(53129443, caster, L.HAND).add(target, caster, L.DECK).baseDecks().start(); if (caster) endTurn(s, { effectYes: () => false });
    perform(s, 'activate', 53129443, { codes: [target] }); requireChain(s, code);
    assert.ok(s.location(caster, L.GRAVE).some(c => c.code === code));
    assert.ok(s.location(caster, L.HAND).some(c => c.code === target)); return publicConfirmations(s, get, 1);
  });
  const paths = ['scripts/audit-native-confirmation-continuation.mjs', 'src/core/native/NativePublicRevealPolicy.js', 'src/core/native/NativeDuelVisualEvents.js', 'src/core/native/NativeDuelGame.js', 'src/core/native/NativeDuelRuntime.js', 'src/core/native/NativeSourceIntegrity.js', 'src/core/native/NativeCardScriptCorrections.js', 'src/core/native/NativeDuelTowerScriptCorrection.js', 'scripts/native-field-audit-inputs.mjs', 'scripts/native-field-audit-harness.mjs', 'public/native/manifest.json', 'public/native/card-data.json', 'public/native/scripts.json', 'public/native/ocgcore.sync.wasm', 'docs/audits/artifacts/native-confirmation-before-continuation-2026-10-08.js.txt'];
  const dependencies = [];
  for (const path of paths) { const bytes = await readFile(new URL(`../${path}`, import.meta.url)); dependencies.push({ path, bytes: bytes.length, sha256: sha256(bytes) }); }
  const pins = NATIVE_PUBLIC_REVEAL_SOURCES.map(pin => ({ ...pin, text: inputs.resources.metadata.get(pin.code).description,
    actualOriginalSha256: sha256(inputs.resources.scripts.get(pin.filename)), actualEffectiveSha256: sha256(createNativeScriptReader(inputs.resources.scripts)(pin.filename)) }));
  for (const pin of pins) { assert.equal(pin.actualOriginalSha256, pin.originalSha256); assert.equal(pin.actualEffectiveSha256, pin.effectiveSha256); }
  return { date: '2026-10-08', executedAtUtc: new Date().toISOString(), nativeApi: core.getVersion(),
    summary: { scenarios: cases.length, passed: cases.length, publicSourceCards: pins.length, viewersPerScenario: 2, privateCases: 4, publicDecktopCases: 2, publicSourceCases: 16 },
    contract: { exactExecutedSourcePinsRequired: true, onlyActiveNativeLinkAuthorizesConfirmation: true, costAndResolutionSupported: true, privateInspectionsPreserved: true, noPostStartInjection: true, noDebugApi: true, noDuelRuleResultsChanged: true },
    scope: 'Eight bounded source policies, all exercised natively for both controllers; no claim that every catalogue revelation is classified.',
    provenance: { baseline: '5971495fb9425b96416b5e07bfeb6d28ec9bd43c', beforeSha256: sha256(source), importAdaptedSha256: sha256(adapted), dependencies, sourcePins: pins }, cases };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await auditNativeConfirmationContinuation(); await mkdir(new URL('.', CONFIRMATION_CONTINUATION_PATH), { recursive: true });
  await writeFile(CONFIRMATION_CONTINUATION_PATH, json(report) + '\n'); console.log(json(report.summary));
}
