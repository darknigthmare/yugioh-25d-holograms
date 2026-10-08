import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { NativeDuelGame } from '../src/core/native/NativeDuelGame.js';
import { createNativeDuelRuntime, createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';
import { translateNativePrompt } from '../src/core/native/NativeDuelDecisions.js';

const ROOT = new URL('../', import.meta.url);
const OUTPUT = new URL('docs/audits/artifacts/continuation-gameplay-2026-10-08/report.json', ROOT);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const clean = value => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? String(item) : item));
const beforePath = 'docs/audits/artifacts/continuation-gameplay-2026-10-08/NativeDuelGame-before.js.txt';

async function historicalModule(path, sourcePath) {
  const source = await readFile(new URL(path, ROOT), 'utf8');
  const origin = new URL(sourcePath, ROOT);
  const imports = source.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g,
    (_, quote, path) => `from ${quote}${new URL(path, origin).href}${quote}`);
  return await import(`data:text/javascript;base64,${Buffer.from(imports).toString('base64')}`);
}

async function fixture(inputs, core, { Game = NativeDuelGame, controller = 0, choose } = {}) {
  const requests = [], events = [], fixtureCards = [], nativeMessages = [], nativeResponses = [], loadedScripts = new Map();
  let started = false;
  const game = new Game({
    onDecision: request => {
      requests.push(request);
      if (choose) {
        const decision = choose(request);
        if (decision?.handled) return decision.value;
      }
      if (request.multiple) return request.candidates.slice(0, request.minimum).map(card => card.uid);
      return request.nativeKind === 'SELECT_CHAIN' ? null : request.choices?.[0]?.value;
    },
    onAnimation: event => events.push(event)
  }, {
    rulesMode: 'native', nativeResources: inputs.resources, seed: [1n, 2n, 3n, 4n], aiDelay: 0,
    teams: [{ startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 },
      { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 }],
    validateDeck: () => ({ valid: true, issues: [] }),
    createRuntime: async options => {
      const reader = createNativeScriptReader(options.scripts);
      const scriptReader = filename => {
        const source = reader(filename); loadedScripts.set(filename, source); return source;
      };
      Object.defineProperty(scriptReader, 'correctionsApplied', { value: reader.correctionsApplied });
      const runtime = await createNativeDuelRuntime({ ...options, scriptReader,
        coreModule: inputs.coreModule, createCore: () => core });
      const advance = runtime.advance.bind(runtime), respond = runtime.respond.bind(runtime);
      runtime.advance = options => {
        const result = advance(options); nativeMessages.push(...result.messages);
        assert.ok(!result.messages.some(message => message.type === runtime.constants.OcgMessageType.RETRY));
        assert.deepEqual(runtime.errors, []);
        return result;
      };
      runtime.respond = response => {
        nativeResponses.push({ promptType: runtime.pendingPrompt?.type, player: runtime.pendingPrompt?.player,
          promptOptions: runtime.pendingPrompt?.type === runtime.constants.OcgMessageType.SELECT_OPTION
            ? clean(runtime.pendingPrompt.options) : undefined,
          response: clean(response) });
        return respond(response);
      };
      return runtime;
    }
  });
  assert.equal(await game.initDecks([{ id: 46986414 }], [{ id: 46986414 }], [], [],
    { startingPlayer: controller === 1 ? 'opponent' : 'player' }), true);
  assert.equal(game.playerController, controller);
  const C = game.runtime.constants, L = C.OcgLocation;
  const add = (code, location, sequence = 0, position = [L.HAND, L.DECK, L.EXTRA].includes(location) ? 8 : 1) => {
    assert.equal(started, false, 'All native fixtures must precede Start');
    fixtureCards.push({ code, controller, location, sequence, position });
    game.runtime.addCard({ code, controller, location, sequence, position });
  };
  const start = async () => {
    started = true; assert.equal(await game.start(), true);
    assert.equal(game.currentTurn, 'player'); assert.equal(game.nativeError, null);
  };
  const health = () => {
    assert.equal(game.nativeError, null); assert.deepEqual(game.runtime.errors, []);
    assert.equal(game.runtime.options.flags & C.OcgDuelMode.TEST_MODE, 0n);
    assert.equal(game.runtime.options.flags & C.OcgDuelMode.PSEUDO_SHUFFLE, 0n);
  };
  const proof = () => {
    health();
    return { controller, seed: ['1', '2', '3', '4'], flags: String(game.runtime.options.flags),
      teams: clean([game.runtime.options.team1, game.runtime.options.team2]), fixture: fixtureCards,
      responses: nativeResponses, nativeMessageTypes: [...new Set(nativeMessages.map(message => message.type))],
      retryCount: 0, luaErrorCount: 0, postStartInjection: false,
      loadedScripts: [...loadedScripts].map(([filename, effective]) => {
        const source = inputs.resources.scripts.get(filename) ?? inputs.resources.scripts.get(`official/${filename}`);
        return { filename, sourceSha256: source == null ? null : sha256(source),
          effectiveSha256: effective == null ? null : sha256(effective), bytes: effective == null ? 0 : Buffer.byteLength(effective) };
      }) };
  };
  return { game, C, L, add, start, health, proof, requests, events, nativeMessages, nativeResponses };
}

async function gatewaySession(inputs, core, options) {
  const s = await fixture(inputs, core, options);
  const { game, L } = s;
  s.add(27970830, L.HAND); s.add(2511717, L.MZONE);
  for (let count = 0; count < 3; count++) s.add(49721904, L.HAND);
  s.add(63176202, L.GRAVE); s.add(2511717, L.DECK);
  await s.start();
  assert.equal(await game.playSpellTrap(game.playerHand.find(card => card.id === 27970830).uid, 0), true);
  for (let count = 0; count < 3; count++) {
    const action = game.getAvailableActions().nativeActions.find(action => action.kind === 'SELECT_SPECIAL_SUMMON'
      && action.card?.id === 49721904);
    assert.ok(action); assert.equal(await game.activateNativeAction(action.id), true);
  }
  assert.equal(game.playerSpells[0].counters[3], 6, 'Only three actual Six Samurai Special Summons add these counters');
  assert.equal(game.playerMonsters.filter(Boolean).length, 4);
  return s;
}

export async function runContinuationGameplay(inputs, core, { compareBefore = true } = {}) {
  const scenarios = [], before = [], strings = inputs.resources.metadata.get(27970830).strings.slice(0, 3);
  const GameBefore = compareBefore ? (await historicalModule(beforePath, 'src/core/native/NativeDuelGame.js')).NativeDuelGame : null;
  const DecisionsBefore = compareBefore ? await historicalModule(
    'docs/audits/artifacts/continuation-gameplay-2026-10-08/NativeDuelDecisions-before.js.txt',
    'src/core/native/NativeDuelDecisions.js') : null;
  for (const controller of [0, 1]) {
    for (const effectIndex of [0, 1, 2]) {
      const s = await gatewaySession(inputs, core, { controller, choose: request => request.type === 'native-action-effect'
        ? { handled: true, value: request.choices[effectIndex].value } : undefined });
      try {
        const menu = s.game.getAvailableActions().nativeActions.filter(action => action.card?.id === 27970830);
        assert.equal(menu.length, 3); assert.equal(new Set(menu.map(action => action.label)).size, 3);
        for (const [index, action] of menu.entries()) assert.ok(action.label.endsWith(strings[index]));
        const nativePrompt = s.game.runtime.pendingPrompt;
        const activates = nativePrompt.activates.filter(reference => reference.code === 27970830);
        const attackBefore = s.game.playerMonsters[0].currentAtk;
        // The actual core references also exercise SELECT_CHAIN translation;
        // no synthetic effect description or identity is introduced.
        const chain = translateNativePrompt({ type: s.C.OcgMessageType.SELECT_CHAIN, player: controller,
          forced: true, selects: activates }, { constants: s.C, metadata: inputs.resources.metadata });
        assert.equal(new Set(chain.request.choices.map(choice => choice.label)).size, 3);
        assert.ok(chain.request.choices.every((choice, index) => choice.label.endsWith(strings[index])));
        assert.equal(await s.game.activateSetSpellTrap(0), true);
        const request = s.requests.find(request => request.type === 'native-action-effect');
        assert.deepEqual(request.choices.map(choice => choice.label), strings); assert.equal(request.required, false);
        assert.equal(s.game.playerSpells[0].counters[3] ?? 0, 6 - [2, 4, 6][effectIndex]);
        if (effectIndex === 0) assert.equal(s.game.playerMonsters[0].currentAtk, attackBefore + 500);
        if (effectIndex === 1) assert.ok(s.game.playerHand.some(card => card.id === 2511717));
        if (effectIndex === 2) {
          assert.ok(s.game.playerMonsters.some(card => card?.id === 63176202));
          assert.equal(s.game.playerGraveyard.some(card => card.id === 63176202), false);
        }
        scenarios.push({ name: `gateway-effect-${effectIndex}-controller-${controller}`, ...s.proof(),
          actualDescriptionIds: activates.map(reference => String(reference.description)),
          actionLabels: menu.map(action => action.label), decisionLabels: request.choices.map(choice => choice.label),
          required: request.required, resultingCounters: s.game.playerSpells[0].counters[3] ?? 0,
          resultingMonsters: s.game.playerMonsters.filter(Boolean).map(card => ({ code: card.nativeCode, attack: card.currentAtk })), ok: true });
      } finally { s.game.dispose(); }
    }
    for (const [answerName, answer] of [['undefined', undefined], ['null', null], ['empty-string', ''], ['false', false], ['numeric-string', '0']]) {
      const s = await gatewaySession(inputs, core, { controller,
        choose: request => request.type === 'native-action-effect' ? { handled: true, value: answer } : undefined });
      try {
        const prompt = s.game.runtime.pendingPrompt, responseCount = s.nativeResponses.length;
        assert.equal(await s.game.activateSetSpellTrap(0), false);
        assert.equal(s.game.runtime.pendingPrompt, prompt); assert.equal(s.nativeResponses.length, responseCount);
        assert.equal(s.game.isResolvingAction, false); assert.equal(s.game.playerSpells[0].counters[3], 6);
        assert.equal(s.game.getAvailableActions().nativeActions.filter(action => action.card?.id === 27970830).length, 3);
        scenarios.push({ name: `gateway-reject-${answerName}-controller-${controller}`, ...s.proof(),
          commandRemainsPending: true, responseCountUnchanged: true, resultingCounters: 6, ok: true });
      } finally { s.game.dispose(); }
    }
    const ravine = await fixture(inputs, core, { controller, choose: request => {
      if (request.nativeKind === 'SELECT_OPTION') return { handled: true, value: 1 };
      if (request.nativeKind === 'SELECT_CARD') {
        const dragon = request.candidates.find(candidate => candidate.name === 'Blue-Eyes White Dragon');
        if (dragon) return { handled: true, value: [dragon.uid] };
      }
    } });
    try {
      ravine.add(62265044, ravine.L.HAND); ravine.add(46986414, ravine.L.HAND);
      ravine.add(89631139, ravine.L.DECK); ravine.add(59755122, ravine.L.DECK);
      await ravine.start();
      assert.equal(await ravine.game.activateFieldSpellFromHand(ravine.game.playerHand.find(card => card.id === 62265044).uid), true);
      assert.equal(await ravine.game.activateSetFieldSpell(), true);
      const request = ravine.requests.find(request => request.nativeKind === 'SELECT_OPTION'); assert.ok(request);
      const prompt = ravine.nativeMessages.find(message => message.type === ravine.C.OcgMessageType.SELECT_OPTION); assert.ok(prompt);
      const expected = inputs.resources.metadata.get(62265044).strings.slice(1, 3);
      assert.deepEqual(request.choices.map(choice => choice.label), expected);
      assert.ok(ravine.game.playerGraveyard.some(card => card.id === 46986414));
      assert.ok(ravine.game.playerGraveyard.some(card => card.id === 89631139));
      scenarios.push({ name: `ravine-native-options-controller-${controller}`, ...ravine.proof(),
        actualOptionIds: prompt.options.map(String), optionLabels: request.choices.map(choice => choice.label),
        discardedCost: 46986414, sentDragon: 89631139, ok: true });
      if (DecisionsBefore) {
        const original = DecisionsBefore.translateNativePrompt(prompt, { constants: ravine.C, metadata: inputs.resources.metadata });
        assert.deepEqual(original.request.choices.map(choice => choice.label), ['Choix de l’effet', 'Choix de l’effet']);
        before.push({ name: `before-ravine-native-prompt-replay-controller-${controller}`, actualOptionIds: prompt.options.map(String),
          optionLabels: original.request.choices.map(choice => choice.label), controller,
          actualCorePromptReplayedThroughHistoricalAdapter: true, separateHistoricalDuelClaimed: false, ok: true });
      }
    } finally { ravine.game.dispose(); }
    const scales = await fixture(inputs, core, { controller, choose: request => request.nativeKind === 'SELECT_CARD'
      ? { handled: true, value: [request.candidates.find(candidate => candidate.name === 'Dragonpulse Magician').uid] } : undefined });
    try {
      scales.add(15146890, scales.L.HAND); scales.add(51531505, scales.L.HAND); scales.add(5318639, scales.L.HAND);
      await scales.start();
      const activate = async (code, sequence) => assert.equal(await scales.game.activatePendulumScale(
        scales.game.playerHand.find(card => card.id === code).uid, sequence), true);
      await activate(15146890, 0);
      const leftOnly = scales.game.getPendulumScales(); assert.equal(leftOnly.left?.id, 15146890); assert.equal(leftOnly.right, null);
      assert.equal(scales.game.getAvailableActions().canPendulumSummon, false);
      await activate(51531505, 4);
      const pair = scales.game.getPendulumScales(); assert.equal(pair.left?.id, 15146890); assert.equal(pair.right?.id, 51531505);
      assert.equal(await scales.game.playSpellTrap(scales.game.playerHand.find(card => card.id === 5318639).uid, 2), true);
      const rightOnly = scales.game.getPendulumScales(); assert.equal(rightOnly.left, null); assert.equal(rightOnly.right?.id, 51531505);
      assert.ok(scales.game.playerFaceUpExtraDeck.some(card => card.id === 15146890));
      assert.equal(scales.game.playerGraveyard.some(card => card.id === 15146890), false);
      scenarios.push({ name: `pendulum-real-outer-zones-controller-${controller}`, ...scales.proof(),
        leftOnly: { left: leftOnly.left?.nativeCode, right: null }, pair: { left: pair.left?.nativeCode, right: pair.right?.nativeCode },
        rightOnly: { left: null, right: rightOnly.right?.nativeCode }, destroyedScaleInFaceUpExtra: true, ok: true });
    } finally { scales.game.dispose(); }
    if (GameBefore) {
      for (const [answerName, answer] of [['undefined', undefined], ['null', null]]) {
        const s = await gatewaySession(inputs, core, { Game: GameBefore, controller,
          choose: request => request.type === 'native-action-effect' ? { handled: true, value: answer } : undefined });
        try {
          const menu = s.game.getAvailableActions().nativeActions.filter(action => action.card?.id === 27970830);
          assert.equal(new Set(menu.map(action => action.label)).size, 1);
          assert.equal(await s.game.activateSetSpellTrap(0), true);
          assert.equal(s.game.playerSpells[0].counters[3], 4);
          const request = s.requests.find(request => request.type === 'native-action-effect');
          assert.ok(request.choices.every(choice => /^\d+$/.test(choice.label)));
          before.push({ name: `before-gateway-${answerName}-controller-${controller}`, ...s.proof(),
            actionLabels: menu.map(action => action.label), decisionLabels: request.choices.map(choice => choice.label),
            required: request.required ?? false, unintendedActivation: true, countersBefore: 6, countersAfter: 4, ok: true });
        } finally { s.game.dispose(); }
      }
      const s = await fixture(inputs, core, { Game: GameBefore, controller });
      try {
        s.add(15146890, s.L.HAND); await s.start();
        assert.equal(await s.game.activatePendulumScale(s.game.playerHand[0].uid, 0), true);
        const scales = s.game.getPendulumScales(); assert.equal(scales.left?.id, 15146890); assert.equal(scales.right?.id, 15146890);
        before.push({ name: `before-single-scale-doubled-controller-${controller}`, ...s.proof(),
          left: scales.left?.nativeCode, right: scales.right?.nativeCode, onePhysicalScale: true, ok: true });
      } finally { s.game.dispose(); }
    }
  }
  return { ok: scenarios.every(scenario => scenario.ok), scenarios, before,
    limits: { chainDescriptorsReuseActualCoreReferences: true, newActualSelectChainEmissionClaimed: false,
      allTcgInteractionsCertified: false, separatePendulumZonesCertified: false, compiledBrowserCertifiedHere: false } };
}

async function dependencyProof(paths) {
  return await Promise.all(paths.map(async path => {
    const bytes = await readFile(new URL(path, ROOT)); return { path, bytes: bytes.length, sha256: sha256(bytes) };
  }));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const inputs = await loadNativeAuditInputs(), core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const report = await runContinuationGameplay(inputs, core);
  const dependencies = await dependencyProof(['scripts/audit-continuation-gameplay.mjs', 'src/core/native/NativeDuelGame.js',
    'src/core/native/NativeDuelDecisions.js', 'src/ui/NativeDuelPresentationModel.js', 'src/core/native/NativeDuelRuntime.js',
    'src/core/native/NativePublicRevealPolicy.js', 'src/core/native/NativeDuelVisualEvents.js', 'src/core/native/NativeCardData.js',
    'src/core/native/NativeCardCharacteristics.js', 'src/core/native/NativeLuaCompatibility.js', 'src/core/native/NativeScriptArchive.js',
    'src/core/native/vendor/ocgcore/index.js', 'src/core/native/vendor/ocgcore/ocgcore.sync-MMMSWPBB.js',
    'src/core/native/vendor/ocgcore/chunk-6GYI7QPM.js', 'src/core/native/vendor/ocgcore/chunk-L5TW24SS.js',
    'scripts/native-field-audit-inputs.mjs', 'tests/native-duel-continuation-gameplay.test.mjs',
    'public/native/core-build.json', 'public/native/ocgcore.sync.wasm', 'public/native/card-data.json', 'public/native/scripts.json',
    'public/native/manifest.json', 'public/native/field-banlists.json', 'public/native/sources/ygopro-core-38d04c9f.tar.gz', beforePath,
    'docs/audits/artifacts/continuation-gameplay-2026-10-08/NativeDuelDecisions-before.js.txt',
    'docs/audits/artifacts/continuation-gameplay-2026-10-08/NativeDuelPresentationModel-before.js.txt']);
  await writeFile(OUTPUT, JSON.stringify({ format: 'continuation-gameplay-v1', ...report, dependencies,
    coreBuild: inputs.coreBuild, coreWasmSha256: sha256(new Uint8Array(inputs.initializer.wasmBinary)) }, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, scenarios: report.scenarios.length, historicalReproductions: report.before.length,
    artifact: 'docs/audits/artifacts/continuation-gameplay-2026-10-08/report.json' }));
}
