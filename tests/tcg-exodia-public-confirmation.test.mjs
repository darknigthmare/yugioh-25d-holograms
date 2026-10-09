import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { NativeDuelGame } from '../src/core/native/NativeDuelGame.js';
import { createNativeDuelRuntime, createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';
import { collectNativeExodiaPublicConfirmations, NATIVE_EXODIA_PUBLIC_SOURCE } from '../src/core/native/NativeExodiaRevealPolicy.js';
import { createNativePublicRevealPolicy } from '../src/core/native/NativePublicRevealPolicy.js';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';
import { PrivateCardInspection } from '../src/ui/PrivateCardInspection.js';
import { PublicCardConfirmation } from '../src/ui/PublicCardConfirmation.js';

const PARTS = [33396948, 70903634, 44519536, 8124921, 7902349];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? String(item) : item));
const EXODIA_EVIDENCE_EXPORT = process.env.TCG_EXODIA_PUBLIC_EVIDENCE === '1';
const SOURCE_PATHS = ['src/core/native/NativeDuelGame.js', 'src/core/native/NativeDuelRuntime.js',
  'src/core/native/NativeDuelVisualEvents.js', 'src/core/native/NativeBattleLifecycle.js',
  'src/core/native/NativePublicRevealPolicy.js', 'src/core/native/NativeExodiaRevealPolicy.js',
  'src/core/native/NativeSourceIntegrity.js', 'src/core/native/NativeCardScriptCorrections.js',
  'src/core/native/NativeLuaCompatibility.js', 'src/core/native/NativeCardCatalogue.js',
  'src/ui/PrivateCardInspection.js', 'src/ui/PublicCardConfirmation.js',
  'scripts/native-field-audit-inputs.mjs', 'tests/tcg-exodia-public-confirmation.test.mjs',
  'public/native/core-build.json', 'public/native/ocgcore.sync.wasm',
  'public/native/card-data.json', 'public/native/scripts.json'];
const pinSources = () => Promise.all(SOURCE_PATHS.map(async path => {
  const bytes = await readFile(new URL(`../${path}`, import.meta.url));
  return { path, bytes: bytes.length, sha256: hash(bytes) };
}));
const sourcePinsBefore = EXODIA_EVIDENCE_EXPORT ? pinSources() : null;
const nativeProofs = [];
let shared;
async function nativeInputs() {
  return shared ??= (async () => {
    const inputs = await loadNativeAuditInputs();
    const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
    return { inputs, core };
  })();
}
const confirmation = (owner = 0, extra = []) => ({ type: 31, player: 1 - owner,
  cards: [...PARTS, ...extra].map((code, sequence) => ({ code, controller: owner, location: 2, sequence })) });
const win = (owner = 0, reason = 16) => ({ type: 5, player: owner, reason });
const authorizations = messages => ({ nativePublicExodiaConfirmations: collectNativeExodiaPublicConfirmations(messages), chains: new Map() });

/** Only the opponent's command choice is replaced, before Start. It submits a
 * legal native TO_EP response instead of summoning an Exodia fixture piece.
 * No card, statistic, hand, turn or native game state is changed by this AI. */
class PassOpponentGame extends NativeDuelGame {
  _chooseAICommand(prompt) {
    const C = this.runtime.constants;
    if (prompt.type === C.OcgMessageType.SELECT_IDLECMD && prompt.to_ep) {
      return { type: C.OcgResponseType.SELECT_IDLECMD, action: C.SelectIdleCMDAction.TO_EP, index: null };
    }
    return super._chooseAICommand(prompt);
  }
}

async function executeWinningGame(controller, { simultaneous = false, extraHand = false } = {}) {
  const { inputs, core } = await nativeInputs();
  const batches = [], events = [], logs = [], results = [], responses = [], loaded = new Map();
  const game = new PassOpponentGame({ onAnimation: event => events.push(event),
    onLog: (message, type) => logs.push({ message, type }), onGameOver: (winner, result) => results.push({ winner, result }),
    onDecision: request => request.multiple ? request.candidates.slice(0, request.minimum).map(card => card.uid)
      : request.nativeKind === 'SELECT_CHAIN' ? null : request.choices?.[0]?.value
  }, { rulesMode: 'native', nativeResources: inputs.resources, aiDelay: 0,
    seed: [1n, 2n, 3n, 4n],
    teams: [{ startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 },
      { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 }],
    validateDeck: () => ({ valid: true, issues: [] }),
    createRuntime: async options => {
      const reader = createNativeScriptReader(options.scripts);
      const scriptReader = name => { const source = reader(name); loaded.set(name, source); return source; };
      Object.defineProperty(scriptReader, 'correctionsApplied', { value: reader.correctionsApplied });
      const runtime = await createNativeDuelRuntime({ ...options, scriptReader,
        coreModule: inputs.coreModule, createCore: () => core });
      const advance = runtime.advance.bind(runtime), respond = runtime.respond.bind(runtime);
      runtime.advance = options => {
        const batch = advance(options); assert.deepEqual(runtime.errors, []);
        assert.equal(batch.messages.some(message => message.type === runtime.constants.OcgMessageType.RETRY), false);
        batches.push(batch.messages); return batch;
      };
      runtime.respond = response => { responses.push(plain(response)); return respond(response); };
      return runtime;
    }
  });
  try {
    assert.equal(await game.initDecks([{ id: 7902349 }], [{ id: simultaneous ? 7902349 : 85639257 }], [], [],
      { startingPlayer: controller ? 'opponent' : 'player' }), true);
    assert.equal(game.playerController, controller);
    const C = game.runtime.constants, spell = simultaneous ? 33782437 : 70368879;
    const fixture = [];
    const add = (code, side) => {
      assert.equal(game.runtime.started, false);
      fixture.push({ code, controller: side, location: C.OcgLocation.HAND, position: C.OcgPosition.FACEDOWN_DEFENSE });
      game.runtime.addCard(fixture.at(-1));
    };
    for (const side of simultaneous ? [0, 1] : [controller]) for (const code of PARTS.slice(0, 4)) add(code, side);
    add(spell, controller);
    if (extraHand) add(97590747, controller);
    assert.equal(await game.start(), true); assert.equal(game.currentTurn, 'player'); assert.equal(game.winner, null);
    const card = game.playerHand.find(card => Number(card.id) === spell); assert.ok(card);
    assert.equal(await game.playSpellTrap(card.uid, 0), true);
    assert.equal(game.nativeError, null); assert.deepEqual(game.runtime.errors, []);
    assert.equal(game.winner, simultaneous ? 'draw' : 'player'); assert.equal(game.endReason, 'exodia');
    assert.equal(game.nativeWinReason, 16); assert.equal(results.length, 1);
    assert.equal(game.runtime.options.flags & C.OcgDuelMode.TEST_MODE, 0n);
    assert.equal(game.runtime.options.flags & C.OcgDuelMode.PSEUDO_SHUFFLE, 0n);
    assert.ok(batches.some(batch => batch.some(message => message.type === 5 && message.reason === 16)
      && batch.some(message => message.type === 31)), 'The actual native batch contains the confirmation and WIN together');
    assert.equal(hash(inputs.resources.scripts.get('c33396948.lua')), NATIVE_EXODIA_PUBLIC_SOURCE.sha256);
    assert.equal(hash(loaded.get('c33396948.lua')), NATIVE_EXODIA_PUBLIC_SOURCE.sha256);
    const raw = batches.flat();
    const confirmations = raw.filter(message => message.type === 31);
    assert.ok(confirmations.length >= (simultaneous ? 2 : 1));
    for (const message of confirmations) {
      assert.equal(message.cards.length, !simultaneous && extraHand ? 6 : 5);
      assert.ok(PARTS.every(code => message.cards.some(card => card.code === code)));
      assert.ok(message.cards.every(card => card.location === 2 && card.controller === 1 - message.player));
    }
    const publicEvents = events.filter(event => event.type === 'reveal' && event.nativeConfirmationConfirmed);
    assert.equal(publicEvents.length, confirmations.reduce((count, message) => count + message.cards.length, 0));
    assert.ok(publicEvents.every(event => event.publicReveal === true && event.private !== true
      && /^native-public-confirmation-[1-9]\d*$/.test(event.confirmationGroupId)));
    assert.equal(events.some(event => event.type === 'inspect'), false);
    assert.equal(events.filter(event => event.type === 'native-victory').length, 1);
    assert.equal(logs.filter(entry => entry.message.startsWith('Carte révélée')).length, publicEvents.length);

    // Both viewing controllers see the same public identity set. Omit batch
    // authorization for the before projection: it retains recipient-only inspection.
    const policy = createNativePublicRevealPolicy(inputs.resources, { scriptReader: game.runtime.options.scriptReader });
    const projections = [];
    for (const viewer of [0, 1]) {
      const beforeEvents = [], afterEvents = [], identityReads = [], queries = [];
      const oldContext = createNativeVisualContext({ playerController: viewer, isPublicReveal: policy,
        getCardMetadata: code => inputs.resources.metadata.get(code) });
      const newContext = createNativeVisualContext({ playerController: viewer, isPublicReveal: policy,
        getCardMetadata: code => { identityReads.push(code); return inputs.resources.metadata.get(code); },
        queryCard: query => { queries.push(query); throw new Error('Confirmation must never query a hidden hand'); } });
      for (const batch of batches) {
        newContext.nativePublicExodiaConfirmations = collectNativeExodiaPublicConfirmations(batch);
        for (const message of batch.filter(message => message.type === 31)) {
          beforeEvents.push(...translateNativeVisualEvents(message, oldContext).events);
          afterEvents.push(...translateNativeVisualEvents(message, newContext).events);
        }
      }
      assert.equal(beforeEvents.some(event => event.type === 'reveal'), false);
      assert.equal(afterEvents.filter(event => event.type === 'reveal').length, publicEvents.length);
      assert.equal(afterEvents.some(event => event.type === 'inspect'), false);
      assert.equal(identityReads.length, publicEvents.length); assert.deepEqual(queries, []);
      assert.equal(newContext.publicCodes.size, 0); assert.equal(newContext.publicCards.size, 0);
      projections.push({ viewer, beforeBatchAuthorization: plain(beforeEvents),
        afterBatchAuthorization: plain(afterEvents), confirmationMetadataReads: identityReads,
        nativeConfirmationQueries: queries, cachedHiddenHandSlots: newContext.publicCodes.size });
    }
    assert.ok(responses.length > 0);
    const proof = { controller, simultaneous, extraHand, fixture, nativeSourceSha256: NATIVE_EXODIA_PUBLIC_SOURCE.sha256,
      actualConfirmations: confirmations.length, actualPublicEvents: publicEvents.length,
      rawWinCount: raw.filter(message => message.type === 5).length, actualNativeWin: plain(raw.find(message => message.type === 5)),
      gameOverCallbacks: results.length, noPostStartInjection: true };
    if (EXODIA_EVIDENCE_EXPORT) nativeProofs.push({
      name: `exodia-${simultaneous ? 'simultaneous-draw' : extraHand ? 'six-card-hand' : 'five-card-hand'}-controller-${controller}`,
      status: 'passed', ...proof, flags: String(game.runtime.options.flags),
      seed: game.runtime.options.seed.map(String),
      teams: plain({ team1: game.runtime.options.team1, team2: game.runtime.options.team2 }),
      bootstrappedPlayerDeck: [7902349], bootstrappedOpponentDeck: [simultaneous ? 7902349 : 85639257],
      strictFortyCardDeckClaimed: false, retryCount: 0, nativeError: game.nativeError,
      luaErrors: plain(game.runtime.errors), batches: plain(batches),
      typedResponses: responses, publicEvents: plain(events), publicLogs: logs, results: plain(results), projections,
      comparisonBaseline: 'Same current translator without Exodia batch authorization; no archived old executable claimed',
      loadedScripts: [...loaded].filter(([, source]) => typeof source === 'string').map(([filename, source]) => ({
        filename, sourcePath: inputs.resources.auditScriptFiles[filename]?.path ?? filename,
        originalSha256: hash(inputs.resources.scripts.get(filename) ?? inputs.resources.scripts.get(`official/${filename}`)),
        executedSha256: hash(source), executedBytes: Buffer.byteLength(source)
      })),
      scriptCorrections: plain([...game.runtime.options.scriptCorrectionsApplied.values()])
    });
    return proof;
  } finally { game.dispose(); }
}

for (const controller of [0, 1]) {
  test(`Actual native game exposes Exodia’s winning hand publicly, controller ${controller}`, async () => {
    const proof = await executeWinningGame(controller); assert.equal(proof.actualNativeWin.player, controller);
    assert.equal(proof.actualPublicEvents, 5);
  });
  test(`Actual native Exodia reveals the entire six-card hand, controller ${controller}`, async () => {
    const proof = await executeWinningGame(controller, { extraHand: true }); assert.equal(proof.actualPublicEvents, 6);
  });
  test(`Actual simultaneous Exodia draw exposes both hands with one result callback, controller ${controller}`, async () => {
    const proof = await executeWinningGame(controller, { simultaneous: true }); assert.equal(proof.actualNativeWin.player, 2);
    assert.equal(proof.gameOverCallbacks, 1); assert.ok(proof.actualConfirmations >= 2);
  });
}

test('Exodia requires native WIN reason 16 for the correct owner in the same batch', async () => {
  const { inputs } = await nativeInputs(); const policy = createNativePublicRevealPolicy(inputs.resources);
  for (const owner of [0, 1]) {
    const message = confirmation(owner), location = message.cards[0];
    for (const messages of [[message], [message, win(owner, 1)], [message, win(owner, 2)],
      [message, win(1 - owner)], [message, { ...win(owner), player: String(owner) }]]) {
      const context = authorizations(messages);
      assert.equal(context.nativePublicExodiaConfirmations.has(message), false);
      assert.equal(policy(message, location, context), false);
    }
    assert.equal(policy(message, location, authorizations([message, win(owner)])), true);
    assert.equal(policy(message, location, authorizations([message, win(2)])), true);
    assert.equal(policy({ ...message }, location, authorizations([message, win(owner)])), false);
    assert.equal(policy(message, { ...location }, authorizations([message, win(owner)])), false);
    const next = confirmation(owner);
    assert.equal(policy(next, next.cards[0], authorizations([message, win(owner)])), false, 'Native message identity is batch-bound');
  }
});

test('Exodia rejects missing pieces, duplicate slots, wrong recipient, controller and location', async () => {
  const { inputs } = await nativeInputs(); const policy = createNativePublicRevealPolicy(inputs.resources);
  const mutations = [message => message.cards.pop(), message => { message.cards[4].code = 46986414; },
    message => { message.cards[4].sequence = 0; }, message => { message.player = 0; },
    message => { message.cards[2].controller = 1; }, message => { message.cards[1].location = 1; },
    message => { message.cards[3].sequence = -1; }, message => { message.cards[0].code = '33396948'; }];
  for (const mutate of mutations) {
    const message = confirmation(); mutate(message);
    const context = authorizations([message, win()]);
    assert.equal(context.nativePublicExodiaConfirmations.has(message), false);
    for (const location of message.cards) assert.equal(policy(message, location, context), false);
  }
});

test('Both original and actually executed Exodia script bytes must match before revealing identities', async () => {
  const { inputs } = await nativeInputs(); const message = confirmation();
  const context = authorizations([message, win()]); const original = inputs.resources.scripts.get('c33396948.lua');
  const changed = new Map(inputs.resources.scripts); changed.set('c33396948.lua', original + '\n-- mutation');
  const policies = [createNativePublicRevealPolicy({ scripts: changed }),
    createNativePublicRevealPolicy(inputs.resources, { scriptReader: name => name === 'c33396948.lua'
      ? original + '\n-- changed execution' : inputs.resources.scripts.get(name) }),
    createNativePublicRevealPolicy(inputs.resources, { scriptReader: name => {
      if (name === 'c33396948.lua') throw new Error('Executed source unavailable');
      return inputs.resources.scripts.get(name);
    } })];
  let passcodeReads = 0;
  Object.defineProperty(message.cards[0], 'code', { get() { passcodeReads++; throw new Error('Private passcode read'); } });
  for (const policy of policies) assert.equal(policy(message, message.cards[0], context), false);
  assert.equal(passcodeReads, 0);
});

test('Private confirmation is rejected before passcode, metadata, native query or card getter reads', async () => {
  const { inputs } = await nativeInputs(); const policy = createNativePublicRevealPolicy(inputs.resources);
  let identityReads = 0;
  const location = { controller: 1, location: 1, sequence: 0,
    get code() { identityReads++; throw new Error('Private identity read'); } };
  const message = { type: 31, player: 0, cards: [location] };
  const context = createNativeVisualContext({ playerController: 1, isPublicReveal: policy,
    getCardMetadata() { identityReads++; throw new Error('Private metadata read'); },
    queryCard() { identityReads++; throw new Error('Private native query'); },
    getCardAt() { identityReads++; throw new Error('Private board getter'); } });
  context.nativePublicExodiaConfirmations = collectNativeExodiaPublicConfirmations([message]);
  assert.deepEqual(translateNativeVisualEvents(message, context), { events: [], logs: [] });
  assert.equal(identityReads, 0);
});

test('Without native Exodia WIN the collector does not inspect a private cards getter', () => {
  let reads = 0;
  const message = { type: 31, player: 1, get cards() { reads++; throw new Error('Private collection read'); } };
  for (const batch of [[message], [message, win(0, 1)], [message, win(0, 2)]]) {
    assert.equal(collectNativeExodiaPublicConfirmations(batch).has(message), false);
  }
  assert.equal(reads, 0);
});

test('Exodia WIN for the other owner does not inspect a private cards getter', () => {
  let reads = 0;
  const message = { type: 31, player: 1, get cards() { reads++; throw new Error('Unrelated private collection read'); } };
  assert.equal(collectNativeExodiaPublicConfirmations([message, win(1)]).has(message), false);
  assert.equal(reads, 0);
});

after(async () => {
  if (!EXODIA_EVIDENCE_EXPORT) return;
  assert.equal(nativeProofs.length, 6, 'Export requires all six actually executed native games');
  const before = await sourcePinsBefore, final = await pinSources();
  assert.deepEqual(final, before, 'Sources must stay frozen throughout native evidence execution');
  const clearing = [];
  for (const Panel of [PrivateCardInspection, PublicCardConfirmation]) {
    let secretReads = 0, nodesRemoved = 0;
    const secret = new Proxy({}, { get() { secretReads++; throw new Error('Clearing inspected a hidden card or core state'); } });
    const panel = new Panel({ documentRef: null,
      imageUrl() { secretReads++; throw new Error('Clearing loaded an image'); },
      cardDetails() { secretReads++; throw new Error('Clearing loaded metadata'); } });
    panel.cards = [secret]; panel.game = secret; panel.groupId = 'ephemeral-audit-group';
    panel.panel = { remove() { nodesRemoved++; } };
    panel.clear();
    assert.equal(secretReads, 0); assert.equal(nodesRemoved, 1); assert.deepEqual(panel.cards, []);
    assert.equal(panel.game, null); assert.equal(panel.groupId, null); assert.equal(panel.panel, null);
    clearing.push({ panel: Panel.name, action: 'clear', identityMetadataNativeQueryReads: 0,
      ephemeralDescriptorsRemaining: 0, removedNodeCount: 1,
      scope: 'Executed production clear() with synthetic nodes and poisoned native/card getters; no browser claim' });
  }
  const { inputs } = await nativeInputs();
  const output = new URL('../docs/audits/artifacts/tcg-exodia-public-confirmation-2026-10-08.json', import.meta.url);
  await writeFile(output, JSON.stringify({ format: 'tcg-exodia-public-confirmation-evidence-v1',
    generatedAt: new Date().toISOString(), ok: true, scenarioCount: 6,
    nativeCoreBuild: inputs.coreBuild, sourcePinsBefore: before, sourcePinsAfter: final,
    executedSourcesStayedFrozen: true, nativeExodiaPublicSource: NATIVE_EXODIA_PUBLIC_SOURCE,
    cases: nativeProofs, clearing,
    scope: { noPostStartInjection: true, nativeGameIntegrationExecuted: true,
      originalAndExecutedExodiaSourcePinned: true, bothViewingControllersProjected: true,
      compiledBrowserClaimed: false, winningPublicPanelShownAfterGameOverClaimed: false,
      strictFortyCardTournamentDeckClaimed: false }
  }, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, scenarioCount: nativeProofs.length, output: output.pathname }));
});
