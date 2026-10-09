import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { createNativeFieldScenarioRunner, perform, reachIdle, defaultResponse, requireChain, json } from './native-field-audit-harness.mjs';
import { resolveNativeDuelPrompt, nativeSelectablePlaces, translateNativePrompt } from '../src/core/native/NativeDuelDecisions.js';
import { nativeLocationToCardRef } from '../src/core/native/NativeDuelVisualEvents.js';

export async function auditNativeChoiceLocations(inputs, core) {
  const { run, scenarios } = createNativeFieldScenarioRunner(inputs, core);
  const presentations = [];
  function presented(prompt, session) {
    const translated = translateNativePrompt(prompt, { constants: session.C, metadata: inputs.resources.metadata });
    assert.ok(translated);
    const request = translated.request;
    presentations.push({ scenario: session.label, nativeKind: request.nativeKind,
      candidates: request.candidates?.map(({ uid, name, label, source }) => ({ uid, name, label, source })),
      choices: request.choices });
    return translated;
  }
  await run('reborn-duplicate-names-both-graveyards', [],
    'An actual Monster Reborn target choice distinguishes identical names in both Graveyards. Choosing the opposing label revives that copy and leaves both own copies in the GY.', s => {
      const { C } = s;
      s.add(83764718, 0, C.OcgLocation.HAND).add(89631139, 0, C.OcgLocation.GRAVE)
        .add(89631139, 0, C.OcgLocation.GRAVE).add(89631139, 1, C.OcgLocation.GRAVE).baseDecks().start();
      let selected = false;
      perform(s, 'activate', 83764718, { respond: prompt => {
        if (prompt.type !== C.OcgMessageType.SELECT_CARD) return null;
        const translated = presented(prompt, s), candidates = translated.request.candidates;
        assert.equal(candidates.length, 3);
        assert.equal(new Set(candidates.map(card => card.label)).size, 3);
        assert.ok(candidates.every(card => card.source === 'grave'));
        const candidate = candidates.find(card => card.label.includes('Cimetière adverse'));
        assert.ok(candidate);
        const response = translated.toResponse([candidate.uid]);
        assert.equal(prompt.selects[response.indicies[0]].controller, 1);
        selected = true; return response;
      } });
      assert.equal(selected, true);
      assert.equal(s.location(0, C.OcgLocation.GRAVE).filter(card => card.code === 89631139).length, 2);
      assert.equal(s.location(1, C.OcgLocation.GRAVE).length, 0);
      assert.equal(s.card(0, C.OcgLocation.MZONE, 0, C.OcgQueryFlags.OWNER).owner, 1);
      assert.equal(s.card(0, C.OcgLocation.MZONE).code, 89631139);
      requireChain(s, 83764718);
    });
  await run('polymerization-identical-materials-hand-and-field', [],
    'Official Polymerization distinguishes identical materials in hand/field and genuinely places Ultimate into own shared Extra Zone 2. Two Galaxy-Eyes then properly Xyz Summon Exblowrer, whose genuine opposing-field zone choice selects shared Extra Zone 1 (opposing wire sequence 6) and destroys that Ultimate.', s => {
      const { C } = s;
      s.add(24094653, 0, C.OcgLocation.HAND).add(89631139, 0, C.OcgLocation.HAND)
        .add(89631139, 0, C.OcgLocation.HAND).add(89631139, 0, C.OcgLocation.MZONE, 2, C.OcgPosition.FACEUP_DEFENSE)
        .add(23995346, 0, C.OcgLocation.EXTRA).add(93717133, 0, C.OcgLocation.MZONE, 0)
        .add(93717133, 0, C.OcgLocation.MZONE, 4).add(62941499, 0, C.OcgLocation.EXTRA)
        .add(23995346, 1, C.OcgLocation.MZONE, 6).baseDecks().start();
      let materials = false, extraPlacement = false;
      perform(s, 'activate', 24094653, { respond: prompt => {
        if (prompt.type === C.OcgMessageType.SELECT_PLACE) {
          const translated = presented(prompt, s);
          const candidate = translated.request.candidates.find(card => card.label === 'Votre Zone Monstre Extra 2');
          if (candidate) {
            extraPlacement = true;
            const response = translated.toResponse([candidate.uid]);
            assert.deepEqual(response.places, [{ player: 0, location: 4, sequence: 6 }]);
            return response;
          }
          return null;
        }
        if (prompt.type === C.OcgMessageType.SELECT_UNSELECT_CARD) {
          const translated = presented(prompt, s), choices = translated.request.choices;
          if (prompt.select_cards.length === 3) {
            assert.equal(new Set(choices.slice(0, 3).map(card => card.label)).size, 3);
            assert.equal(choices.filter(card => card.label.includes('Votre main')).length, 2);
            assert.ok(choices.some(card => card.label.includes('Votre Zone Monstre 3') && card.label.includes('Défense face recto')));
            materials = true;
          }
          return translated.toResponse(prompt.can_finish ? null : 0);
        }
        if (prompt.type !== C.OcgMessageType.SELECT_CARD) return null;
        const translated = presented(prompt, s), candidates = translated.request.candidates;
        return translated.toResponse(candidates.slice(0, prompt.min).map(card => card.uid));
      } });
      assert.equal(materials, true);
      assert.equal(extraPlacement, true);
      assert.equal(s.location(0, C.OcgLocation.GRAVE).filter(card => card.code === 89631139).length, 3);
      const ultimate = s.location(0, C.OcgLocation.MZONE).find(card => card.code === 23995346);
      assert.ok(ultimate);
      assert.equal(s.card(0, C.OcgLocation.MZONE, 6).attack, 4500);
      assert.deepEqual(s.location(0, C.OcgLocation.EXTRA).map(card => card.code), [62941499]);
      requireChain(s, 24094653);
      perform(s, 'special', 62941499);
      assert.equal(s.card(0, C.OcgLocation.MZONE, 0).code, 62941499);
      let opposingPlacement = false;
      perform(s, 'activate', 62941499, { respond: prompt => {
        if (prompt.type === C.OcgMessageType.SELECT_CARD && prompt.selects.every(ref => ref.overlay_sequence != null)) {
          const translated = presented(prompt, s);
          assert.equal(new Set(translated.request.candidates.map(card => card.label)).size, 2);
          assert.ok(translated.request.candidates.every(card => card.source === 'overlay'));
          const candidate = translated.request.candidates.find(card => card.label.includes('Votre Matériel Xyz · Carte 2'));
          assert.ok(candidate);
          const response = translated.toResponse([candidate.uid]);
          assert.equal(prompt.selects[response.indicies[0]].overlay_sequence, 1);
          return response;
        }
        if (![C.OcgMessageType.SELECT_PLACE, C.OcgMessageType.SELECT_DISFIELD].includes(prompt.type)) return null;
        const translated = presented(prompt, s);
        const candidate = translated.request.candidates.find(card => card.label === 'Adversaire — Zone Monstre Extra 1');
        assert.ok(candidate);
        const response = translated.toResponse([candidate.uid]);
        assert.deepEqual(response.places, [{ player: 1, location: 4, sequence: 6 }]);
        opposingPlacement = true; return response;
      } });
      assert.equal(opposingPlacement, true);
      assert.ok(s.messages.some(message => message.type === C.OcgMessageType.MOVE
        && message.card === 93717133 && message.from?.overlay_sequence === 1 && message.to?.location === C.OcgLocation.GRAVE));
      assert.equal(s.card(1, C.OcgLocation.MZONE, 6).code, undefined);
      assert.ok(s.location(1, C.OcgLocation.GRAVE).some(card => card.code === 23995346));
      assert.equal(s.card(0, C.OcgLocation.MZONE, 6).code, 23995346);
      requireChain(s, 62941499);
    });
  await run('typhoon-hidden-targets-public-zone-only', [],
    'Actual Mystical Space Typhoon differentiates two opposing facedown zones without exposing either identity and destroys zone three. Book of Moon then differentiates identically named monsters in the two shared Extra Monster Zones using the viewer board mapping and flips the opposing copy.', s => {
      const { C } = s;
      s.add(5318639, 0, C.OcgLocation.HAND).add(5318639, 1, C.OcgLocation.SZONE, 0, C.OcgPosition.FACEDOWN_DEFENSE)
        .add(44095762, 1, C.OcgLocation.SZONE, 2, C.OcgPosition.FACEDOWN_DEFENSE)
        .add(14087893, 0, C.OcgLocation.HAND).add(23995346, 0, C.OcgLocation.MZONE, 5)
        .add(23995346, 1, C.OcgLocation.MZONE, 5).baseDecks().start();
      let hidden = false;
      perform(s, 'activate', 5318639, { respond: prompt => {
        if (prompt.type !== C.OcgMessageType.SELECT_CARD) return null;
        let privateReads = 0;
        const translated = translateNativePrompt(prompt, { constants: C,
          metadata: { getCard() { privateReads += 1; return { name: 'PRIVATE IDENTITY' }; } },
          resolveCard() { privateReads += 1; return { name: 'PRIVATE IDENTITY' }; } });
        const candidates = translated.request.candidates;
        assert.equal(candidates.length, 2);
        assert.equal(privateReads, 0);
        assert.ok(candidates.every(card => card.name === 'Carte face verso' && !card.label.includes('PRIVATE')));
        assert.equal(new Set(candidates.map(card => card.label)).size, 2);
        const candidate = candidates.find(card => card.label.includes('Adversaire — Zone Magie/Piège 3'));
        assert.ok(candidate);
        presentations.push({ scenario: s.label, nativeKind: translated.request.nativeKind,
          candidates, hiddenIdentityReads: privateReads });
        hidden = true; return translated.toResponse([candidate.uid]);
      } });
      assert.equal(hidden, true);
      assert.equal(s.card(1, C.OcgLocation.SZONE, 2)?.code, undefined);
      assert.equal(s.card(1, C.OcgLocation.SZONE, 0).code, 5318639);
      assert.ok(s.location(1, C.OcgLocation.GRAVE).some(card => card.code === 44095762));
      requireChain(s, 5318639);
      let extraZone = false;
      perform(s, 'activate', 14087893, { respond: prompt => {
        if (prompt.type !== C.OcgMessageType.SELECT_CARD) return null;
        const translated = presented(prompt, s), candidates = translated.request.candidates;
        assert.equal(candidates.length, 2);
        for (const [index, ref] of prompt.selects.entries()) {
          const board = nativeLocationToCardRef(ref, prompt.player);
          assert.equal(board.zoneType, 'extra');
          assert.ok(candidates[index].label.includes(`Zone Monstre Extra ${board.zoneIndex + 1}`));
        }
        const candidate = candidates.find(card => card.label.includes('Adversaire — Zone Monstre Extra 2'));
        assert.ok(candidate);
        extraZone = true; return translated.toResponse([candidate.uid]);
      } });
      assert.equal(extraZone, true);
      assert.equal(s.card(1, C.OcgLocation.MZONE, 5).position, C.OcgPosition.FACEDOWN_DEFENSE);
      assert.equal(s.card(0, C.OcgLocation.MZONE, 5).position, C.OcgPosition.FACEUP_ATTACK);
      requireChain(s, 14087893);
    });
  await run('anti-spell-identical-counter-sources', [],
    'Two official Magical Exemplars genuinely gain two Spell Counters each after Umi. The real Anti-Spell cost asks successive per-card choices with distinct zone labels; [0,2] leaves zone one at two and removes only zone three counters, then negates and destroys Pot of Greed.', async s => {
      const { C } = s;
      s.add(6061630, 0, C.OcgLocation.MZONE, 0).add(6061630, 0, C.OcgLocation.MZONE, 2)
        .add(53112492, 0, C.OcgLocation.SZONE, 0, C.OcgPosition.FACEDOWN_DEFENSE)
        .add(22702055, 0, C.OcgLocation.HAND).add(55144522, 0, C.OcgLocation.HAND)
        .add(46986414, 0, C.OcgLocation.DECK).baseDecks().start();
      perform(s, 'activate', 22702055, { respond: prompt => {
        if (prompt.type !== C.OcgMessageType.SELECT_PLACE) return null;
        const translated = presented(prompt, s);
        assert.equal(translated.request.candidates[0].label, 'Votre Zone Terrain');
        return translated.toResponse([translated.request.candidates[0].uid]);
      } });
      assert.equal(s.card(0, C.OcgLocation.MZONE, 0).counters[1], 2);
      assert.equal(s.card(0, C.OcgLocation.MZONE, 2).counters[1], 2);
      const idle = reachIdle(s);
      const index = idle.activates.findIndex(card => card.code === 55144522);
      assert.ok(index >= 0);
      s.respond({ type: C.OcgResponseType.SELECT_IDLECMD, action: C.SelectIdleCMDAction.SELECT_ACTIVATE, index });
      let counterPrompt = false, returnedIdle = false;
      const descriptions = [];
      for (let step = 0; step < 80; step += 1) {
        const { prompt } = s.advance();
        if (prompt?.type === C.OcgMessageType.SELECT_IDLECMD) { returnedIdle = true; break; }
        assert.ok(prompt);
        if (prompt.type === C.OcgMessageType.SELECT_COUNTER) {
          counterPrompt = true;
          presented(prompt, s);
          let source = 0;
          const response = await resolveNativeDuelPrompt({ prompt, runtime: s.duel, metadata: inputs.resources.metadata,
            onDecision: request => {
              assert.equal(request.nativeKind, 'SELECT_COUNTER');
              assert.ok(request.description.includes(`Votre Zone Monstre ${source === 0 ? 1 : 3}`));
              descriptions.push(request.description);
              return source++ === 0 ? 0 : 2;
            } });
          assert.deepEqual(response.counters, [0, 2]);
          s.respond(response);
        } else s.respond(defaultResponse(prompt, C, { chainCodes: [53112492] }));
      }
      assert.equal(counterPrompt, true);
      assert.equal(returnedIdle, true);
      assert.equal(new Set(descriptions).size, 2);
      presentations.push({ scenario: s.label, nativeKind: 'SELECT_COUNTER_SUCCESSIVE', descriptions });
      assert.equal(s.card(0, C.OcgLocation.MZONE, 0).counters[1], 2);
      assert.equal(s.card(0, C.OcgLocation.MZONE, 2).counters[1] ?? 0, 0);
      assert.equal(s.location(0, C.OcgLocation.HAND).length, 0);
      assert.equal(s.location(0, C.OcgLocation.DECK).length, 2);
      assert.ok(s.location(0, C.OcgLocation.GRAVE).some(card => card.code === 55144522));
      assert.ok(s.messages.some(message => message.type === C.OcgMessageType.CHAIN_NEGATED));
      requireChain(s, 22702055); requireChain(s, 53112492); requireChain(s, 55144522);
    });
  return { scenarios, presentations };
}

export async function runNativeChoiceLocations() {
  const inputs = await loadNativeAuditInputs();
  const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const result = await auditNativeChoiceLocations(inputs, core);
  assert.equal(result.scenarios.filter(scenario => scenario.status === 'passed').length, 4,
    json(result.scenarios.filter(scenario => scenario.status !== 'passed').map(({ id, error }) => ({ id, error }))));
  return { inputs, result };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { inputs, result } = await runNativeChoiceLocations();
  for (const scenario of result.scenarios) {
    assert.equal(BigInt(scenario.flags) & (inputs.coreModule.OcgDuelMode.TEST_MODE | inputs.coreModule.OcgDuelMode.PSEUDO_SHUFFLE), 0n);
    assert.deepEqual(scenario.scriptCorrections, []);
    for (const card of scenario.fixtureCards) {
      assert.equal(card.effectiveScriptSha256, card.scriptSha256);
      const original = inputs.resources.scripts.get(`c${card.sourceCode}.lua`);
      card.originalScriptBytes = typeof original === 'string' ? Buffer.byteLength(original, 'utf8') : null;
      card.effectiveScriptBytes = card.originalScriptBytes;
    }
  }
  const dependencies = [];
  for (const path of ['scripts/audit-native-choice-locations.mjs', 'scripts/native-field-audit-inputs.mjs',
    'scripts/native-field-audit-harness.mjs', 'src/core/native/NativeDuelDecisions.js', 'src/ui/NativeDuelPresentationModel.js',
    'src/core/native/NativeDuelRuntime.js', 'src/core/native/NativeCardScriptCorrections.js',
    'src/core/native/NativeDuelVisualEvents.js',
    'src/core/native/NativeDiceDungeonScriptCorrection.js', 'src/core/native/NativeDuelTowerScriptCorrection.js',
    'src/core/native/NativeSourceIntegrity.js', 'src/core/native/NativeLuaCompatibility.js',
    'src/core/native/NativeCardData.js', 'src/core/native/NativeScriptArchive.js', 'src/core/native/NativeCoreAssets.js',
    'src/core/native/vendor/ocgcore/index.js', 'src/core/native/vendor/ocgcore/ocgcore.sync-MMMSWPBB.js',
    'src/core/native/vendor/ocgcore/chunk-6GYI7QPM.js', 'src/core/native/vendor/ocgcore/chunk-L5TW24SS.js',
    'public/native/core-build.json', 'public/native/manifest.json', 'public/native/card-data.json',
    'public/native/scripts.json', 'public/native/field-banlists.json', 'public/native/ocgcore.sync.wasm',
    'tests/native-duel-choice-locations.test.mjs', 'tests/native-duel-choice-flows.test.mjs']) {
    const bytes = await readFile(new URL(`../${path}`, import.meta.url));
    dependencies.push({ path, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  // Re-render the very same native prompts with the published pre-wave adapter.
  // This historical source is never given to the duel and changes no native data.
  const baselineRevision = '251fec0197ed85e40bca2af03e4431db1fef11e5';
  const baselinePath = 'src/core/native/NativeDuelDecisions.js';
  const { stdout: baselineBytes } = await promisify(execFile)('git', ['show', `${baselineRevision}:${baselinePath}`],
    { cwd: new URL('..', import.meta.url), maxBuffer: 1024 * 1024, encoding: 'buffer' });
  const baselineModule = await import(`data:text/javascript;base64,${baselineBytes.toString('base64')}`);
  const comparisons = result.scenarios.flatMap(scenario => scenario.decisions.filter(({ prompt }) =>
    (prompt.type === 26 && prompt.select_cards?.length === 3)
      || (prompt.type === 15 && prompt.selects?.length > 1)).map(({ prompt }, ordinal) => {
    const before = baselineModule.translateNativePrompt(prompt, { metadata: inputs.resources.metadata }).request;
    const after = translateNativePrompt(prompt, { metadata: inputs.resources.metadata }).request;
    const labels = request => (request.candidates ?? request.choices).filter(card => card.value !== null).map(card => card.label);
    assert.equal(new Set(labels(before)).size, 1);
    assert.equal(new Set(labels(after)).size, labels(after).length);
    return { scenario: scenario.id, nativePromptType: prompt.type, selectionOrdinal: ordinal, before: labels(before), after: labels(after),
      beforeDistinct: new Set(labels(before)).size, afterDistinct: new Set(labels(after)).size };
  }));
  const placementComparisons = result.scenarios.flatMap(scenario => scenario.decisions
    .filter(({ prompt }) => [18, 24].includes(prompt.type) && nativeSelectablePlaces(prompt).some(place => place.sequence >= 5))
    .map(({ prompt, response }) => {
      const before = baselineModule.translateNativePrompt(prompt).request.candidates;
      const after = translateNativePrompt(prompt).request.candidates;
      const places = nativeSelectablePlaces(prompt);
      assert.deepEqual(after.map(card => card.uid), before.map(card => card.uid));
      return { scenario: scenario.id, fieldMask: prompt.field_mask, before: before.map(card => card.label),
        after: after.map(card => card.label), nativePlaces: places, acceptedResponse: response };
    }));
  const counter = result.scenarios.find(scenario => scenario.id === 'anti-spell-identical-counter-sources');
  const { prompt: counterPrompt, response: acceptedCounterResponse } = counter.decisions.find(({ prompt }) => prompt.type === 22);
  const beforeCounterDescriptions = [];
  let counterSource = 0;
  const historicalCounterResponse = await baselineModule.resolveNativeDuelPrompt({ prompt: counterPrompt,
    metadata: inputs.resources.metadata, side: 'player', onDecision: request => {
      beforeCounterDescriptions.push(request.description); return counterSource++ === 0 ? 0 : 2;
    } });
  assert.deepEqual(historicalCounterResponse, acceptedCounterResponse);
  assert.equal(new Set(beforeCounterDescriptions).size, 1);
  const afterCounterDescriptions = result.presentations.find(presentation => presentation.nativeKind === 'SELECT_COUNTER_SUCCESSIVE').descriptions;
  assert.equal(new Set(afterCounterDescriptions).size, 2);
  await writeFile(new URL('../docs/audits/artifacts/native-gameplay-choice-locations-2026-10-08.json', import.meta.url),
    `${json({ generatedOn: '2026-10-08', summary: { scenarios: result.scenarios.length, passed: result.scenarios.filter(scenario => scenario.status === 'passed').length },
      fixtures: { beforeStartOnly: true, modifiedScripts: result.scenarios.some(scenario => scenario.scriptCorrections.length > 0),
        upstreamArchiveBytesModified: false, modifiedCardData: false, testMode: false, postStartFixtureInjection: false },
      coreBuild: inputs.coreBuild, dependencies,
      baselinePresentation: { revision: baselineRevision, path: baselinePath, bytes: baselineBytes.byteLength,
        sha256: createHash('sha256').update(baselineBytes).digest('hex'), comparisons, placementComparisons,
        counterSuccessive: { beforeDescriptions: beforeCounterDescriptions, afterDescriptions: afterCounterDescriptions,
          unchangedAcceptedResponse: acceptedCounterResponse } }, ...result })}\n`);
  console.log(`Native choice locations: ${result.scenarios.length}/${result.scenarios.length} passed`);
}
