import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { DuelGame } from '../src/game.js';
import { NativeDuelGame } from '../src/core/native/NativeDuelGame.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { NATIVE_CARDS } from '../src/core/native/NativeCardRegistry.js';
import { MatchController } from '../src/ui/MatchController.js';
import { validateCustomDeck } from '../src/ui/DeckBuilderRules.js';
import { normalizeStrictCardId } from '../src/core/StrictCardRegistry.js';
import { createTcgFormatPolicy } from '../src/core/tcg/TcgCardLegality.js';
import { isSupportedNativeCatalogueCard, createNativeTcgCardTemplate } from '../src/core/native/NativeCardCatalogue.js';
import { TCGMatchClock } from '../src/ui/TCGMatchClock.js';

const mainSource = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const nativeResources = loadNativeCardResources({ fetch: async path => (
  new Response(readFileSync(new URL(`../public${path}`, import.meta.url)))
) });
const trustedResources = await nativeResources;
const trustedTcgPolicy = createTcgFormatPolicy(trustedResources);

function productionFunction(name) {
  const match = mainSource.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `missing production function ${name}`);
  return match[0];
}

function betweenGamesSave({ swiss = false } = {}) {
  const normal = STARTER_CARDS.filter(card => card.card_type === 'monster' && card.type === 'Normal Monster');
  const deck = {
    mainDeck: normal.slice(0, 20).flatMap(card => [card, card]),
    extraDeck: [EXTRA_DECK_CARDS.find(card => String(card.id) === '44508094')],
    sideDeck: [STARTER_CARDS.find(card => String(card.id) === '2084239'),
      EXTRA_DECK_CARDS.find(card => String(card.id) === '77637979')]
  };
  assert.equal(validateCustomDeck(deck).valid, true);
  const controller = new MatchController();
  controller.startMatch({ playerIds: ['player', 'opponent'], firstPlayerId: 'player',
    ...(swiss ? { tournamentPolicy: 'TCG_EU_SWISS', timeLimitMinutes: 50 } : {}),
    decks: { player: deck, opponent: deck } });
  controller.recordDuelResult('opponent');
  return { controller, deck, payload: { version: 1, controller: controller.serialize(),
    selectedDeckId: 'custom', aiDifficulty: 'hard' } };
}

function element() {
  const attrs = new Map();
  return {
    innerHTML: '', textContent: '', disabled: false,
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute: (name, value) => attrs.set(name, value),
    getAttribute: name => attrs.get(name)
  };
}

// Exercise production restore/launch handlers with the real serialized Match
// and Duel engines. Audio, rendering and automatic phase timers are unrelated
// to this transaction and are stopped at the initial-hand boundary.
function uiFixture(payload, { nativeStartGate = null, catalogueGate = null } = {}) {
  class InitialHandDuel extends DuelGame {
    constructor(callbacks, options) {
      super(callbacks, options);
      this.startPhaseFlow = () => {};
      this.scheduleAction = () => 0;
    }
  }
  class InitialHandNativeDuel extends NativeDuelGame {
    async start() {
      await nativeStartGate?.();
      // Preserve the production start guard when this test boundary releases
      // after a Swiss deadline has already disposed the native Duel.
      if (!this.runtime || this._duelEnded) return false;
      this.runtime.start();
      // Preserve real native initialization and opening draws, then stop before
      // the first command so opponent AI does not alter the registered decks.
      const batch = this.runtime.advance();
      this._processMessages(batch.messages);
      this._prompt = this.pendingNativeDecision = batch.prompt;
      this._synchronize();
      return true;
    }
  }
  const loads = { nativeModule: 0, nativeResources: 0, nativeCatalogue: 0 };
  const clockState = { wall: 1_000_000, mono: 0 };
  const intervals = new Map();
  const removals = [];
  const optionModes = [];
  class ControlledMatchClock extends TCGMatchClock {
    constructor(options) { super({ ...options, wallNow: () => clockState.wall, monotonicNow: () => clockState.mono }); }
  }
  const privateInspection = { cards: ['previous Duel inspection'], clears: 0,
    clear() { this.cards = []; this.clears += 1; } };
  const writes = new Map();
  const notices = [];
  const nodes = new Map();
  const getElement = id => {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  };
  const templates = NATIVE_CARDS;
  const noop = () => {};
  const context = vm.createContext({
    STARTER_CARDS, EXTRA_DECK_CARDS, MatchController, DuelGame: InitialHandDuel,
    validateCustomDeck, normalizeStrictCardId,
    nativeBuilderOptions: (mode = context.selectedGameMode) => {
      optionModes.push(mode);
      return { native: mode !== 'sandbox', format: mode === 'native' ? 'ALL' : 'TCG',
        ...(mode === 'strict' ? trustedTcgPolicy : {}),
        isSupportedCard: (card, section) => isSupportedNativeCatalogueCard(trustedResources, card, section) };
    },
    ensureNativeCatalogue: async () => { loads.nativeCatalogue += 1; await catalogueGate?.(); return trustedResources; },
    activeLibraryTemplates: () => context.selectedGameMode === 'sandbox' ? [...STARTER_CARDS, ...EXTRA_DECK_CARDS] : NATIVE_CARDS,
    loadNativeDuelModule: async () => { loads.nativeModule += 1; return { NativeDuelGame: InitialHandNativeDuel }; },
    loadNativeCardResources: async () => { loads.nativeResources += 1; return nativeResources; },
    resolveOpeningFirstPlayer: async () => ({ chooser: 'player', firstPlayer: 'player' }),
    knownCardTemplates: new Map(templates.map(card => [String(card.id), card])),
    canonicalCardTemplates: new Map(templates.map(card => [normalizeStrictCardId(card.id), card])),
    STORAGE_KEYS: { activeMatch: 'active', gameMode: 'mode', duelSeries: 'series', difficulty: 'difficulty' },
    readStoredJson: () => payload,
    writeStoredValue: (key, value) => { writes.set(key, value); return true; },
    clearPersistedMatch: () => { removals.push('active'); writes.delete('active'); },
    TCGMatchClock: ControlledMatchClock,
    setInterval: callback => { const id = intervals.size + 1; intervals.set(id, callback); return id; },
    clearInterval: id => intervals.delete(id),
    matchClock: null, matchClockInterval: null, duelLaunchGeneration: 0,
    matchController: null, pendingMatchLaunch: null, game: null, duelViewController: null,
    privateCardInspection: privateInspection,
    publicCardConfirmation: { clear: noop },
    activeCampaignMissionId: null, campaignTracker: null, getMission: () => null,
    selectedDuelSeries: 'single', selectedGameMode: 'strict', selectedAiDifficulty: 'normal',
    currentSelectedDeckId: 'kaiba',
    customDeckMainIds: [], customDeckExtraIds: [], customDeckSideIds: [],
    choiceCards: ['kaiba', 'yugi', 'joey', 'custom'].map(id => ({ ...element(), dataset: { deckId: id } })),
    deckBuilderSec: element(), startBtn: element(), startModal: element(), sideDeckFeedback: element(),
    initDeckBuilderUI: noop, updateModeControls: noop,
    closeDialog: noop, openDialog: noop,
    announceStatus: message => notices.push(message),
    document: { getElementById: getElement, querySelectorAll: () => [], body: element() },
    lpAnimationFrames: new Map(), cancelAnimationFrame: noop,
    cancelUiAnimations: noop, cancelBoardAnimations: noop,
    activeDuelInProgress: false, lastDuelResult: null,
    activeDialog: null, recordedFinishedGames: new WeakSet(),
    restartBtn: element(), nextPhaseBtn: element(), endTurnBtn: element(), gameoverModal: element(),
    pendingDecisionResolver: null, selectedAttackerIndex: null,
    currentDraggedUid: null, selectedHandUid: null, pendingAction: null,
    previousPendulumAvailable: false,
    actionModal: null, extraModal: null, publicZoneModal: null, settingsModal: null,
    updateUI: noop, handleGameAnimations: noop, handleGameOver: noop,
    requestUiDecision: noop, requestUiChainOpportunity: () => null,
    sanitizePublicLogMessage: message => message, addLogEntry: noop, handleLogSpeech: noop,
    positionMobileBoardForPlayer: noop, startBGM: noop, stopBGM: noop, stopHologramHum: noop, setBGMStyle: noop,
    window: { speechSynthesis: { cancel: noop } }
  });
  const presetBegin = mainSource.indexOf('const SANDBOX_PREMADE_DECKS =');
  const presetEnd = mainSource.indexOf('\nlet selectedGameMode =', presetBegin);
  assert.ok(presetBegin >= 0 && presetEnd > presetBegin);
  vm.runInContext(mainSource.slice(presetBegin, presetEnd), context);
  for (const name of ['isTemplateExtraDeckCard', 'canonicalCustomDeckIds', 'normalizeCustomDeckIds',
    'getCustomDeckCards', 'selectDeckChoice', 'persistMatchBetweenDuels',
    'stopMatchClock', 'syncMatchClock', 'finishMatchAtTime',
    'restorePersistedMatchBetweenDuels', 'initGameInstance']) {
    // Module loading is the UI boundary, analogous to the existing audio and
    // rendering injection. The loaded class still runs the real WASM engine.
    const source = productionFunction(name).replace(
      "import('./src/core/native/NativeDuelGame.js')", 'loadNativeDuelModule()'
    );
    vm.runInContext(source, context);
  }
  context.openSideDeckEditor = () => { context.persistMatchBetweenDuels(); };
  return { context, writes, notices, nodes, loads, privateInspection, clockState, intervals, removals, optionModes };
}

test('restoring a saved custom Match preserves its selected identity, registered Side and next-Duel choice', () => {
  const { controller, payload } = betweenGamesSave();
  const { context, writes } = uiFixture(payload);
  assert.equal(context.restorePersistedMatchBetweenDuels(), true);
  assert.equal(context.currentSelectedDeckId, 'custom');
  assert.equal(context.choiceCards.find(card => card.dataset.deckId === 'custom').getAttribute('aria-pressed'), 'true');
  assert.deepEqual(context.matchController.getViewModel(), controller.getViewModel());
  assert.deepEqual(context.matchController.getSideDeckEditorModel('player').activeDeck,
    controller.getSideDeckEditorModel('player').activeDeck);
  assert.equal(context.matchController.getSideDeckEditorModel('player').activeDeck.sideDeck.length, 2);
  const persisted = JSON.parse(writes.get('active'));
  assert.equal(persisted.selectedDeckId, 'custom', 'restoration must not relabel and resave the Match as Kaiba');
  assert.equal(MatchController.deserialize(persisted.controller).getViewModel().status, 'between_games');
});

test('a restored registered custom Duel launches its actual Main/Extra snapshot even when the editable builder draft is empty', async () => {
  const { payload } = betweenGamesSave();
  const { context, notices, nodes } = uiFixture(payload);
  assert.equal(context.restorePersistedMatchBetweenDuels(), true);
  assert.equal(context.getCustomDeckCards().mainDeck.length, 0);
  assert.equal(validateCustomDeck(context.getCustomDeckCards()).valid, false);
  context.matchController.chooseFirstPlayer('player', 'opponent');
  const prepared = context.matchController.prepareNextDuel();
  assert.equal(prepared.valid, true);
  await context.initGameInstance(prepared.launch);
  assert.ok(context.game instanceof NativeDuelGame);
  assert.equal(context.activeDuelInProgress, true);
  assert.equal(context.game.currentTurn, 'opponent');
  assert.equal(context.game.rulesMode, 'strict');
  assert.equal(context.pendingMatchLaunch, prepared.launch);
  const actualMain = [...context.game.playerDeck, ...context.game.playerHand].map(card => normalizeStrictCardId(card.id)).sort();
  assert.deepEqual(actualMain, prepared.launch.decks.player.mainDeck.map(card => normalizeStrictCardId(card.id)).sort());
  assert.deepEqual(context.game.playerExtraDeck.map(card => normalizeStrictCardId(card.id)),
    prepared.launch.decks.player.extraDeck.map(card => normalizeStrictCardId(card.id)));
  assert.equal(context.game.playerHand.length, 5);
  assert.equal(context.game.playerDeck.length, 35);
  assert.equal(actualMain.includes('2084239'), false, 'registered Side cards are never added to the starting draw pile');
  assert.equal(nodes.get('player-label').textContent, 'DUELLISTE (VOUS)');
  assert.ok(notices.some(message => message.includes('Duel 2 du Match')));
  assert.equal(context.customDeckMainIds.length, 0, 'starting a registered Duel does not rewrite the editable draft');
  context.game.dispose();
});

test('an empty custom draft still blocks a fresh Match that has no registered launch snapshot', async () => {
  const { context, notices } = uiFixture(null);
  context.currentSelectedDeckId = 'custom';
  context.selectedDuelSeries = 'match';
  await context.initGameInstance();
  assert.equal(context.game, null);
  assert.equal(context.activeDuelInProgress, false);
  assert.ok(notices.some(message => message.includes('40 à 60')));
});

test('the UI awaits native startup before marking a registered Duel active', async () => {
  const { payload } = betweenGamesSave();
  let releaseStart;
  let reachedStart;
  const started = new Promise(resolve => { reachedStart = resolve; });
  const gate = new Promise(resolve => { releaseStart = resolve; });
  const { context, privateInspection } = uiFixture(payload, { nativeStartGate: () => { reachedStart(); return gate; } });
  context.restorePersistedMatchBetweenDuels();
  context.matchController.chooseFirstPlayer('player', 'player');
  const prepared = context.matchController.prepareNextDuel();
  const launch = context.initGameInstance(prepared.launch);
  await started;
  assert.equal(privateInspection.clears, 1, 'previous private inspections are cleared before native startup completes');
  assert.deepEqual(privateInspection.cards, []);
  assert.ok(context.game instanceof NativeDuelGame);
  assert.equal(context.activeDuelInProgress, false);
  assert.equal(context.game.runtime.started, false);
  releaseStart();
  await launch;
  assert.equal(context.activeDuelInProgress, true);
  assert.equal(context.game.runtime.started, true);
  context.game.dispose();
});

test('the Sandbox launch preserves the legacy engine without loading native resources', async () => {
  const { context, loads } = uiFixture(null);
  context.selectedGameMode = 'sandbox';
  await context.initGameInstance();
  assert.ok(context.game instanceof DuelGame);
  assert.equal(context.game.rulesMode, 'sandbox');
  assert.equal(context.activeDuelInProgress, true);
  assert.deepEqual(loads, { nativeModule: 0, nativeResources: 0, nativeCatalogue: 0 });
  context.game.dispose();
});

test('restoration applies strict TCG legality independently of a saved Duel libre preference', () => {
  const { payload } = betweenGamesSave();
  const saved = JSON.parse(payload.controller);
  const forbidden = createNativeTcgCardTemplate(trustedResources, 55144522);
  saved.engine.state.registeredDecks.player.mainDeck[0] = forbidden;
  saved.engine.state.activeDecks.player.mainDeck[0] = forbidden;
  const { context, optionModes, removals } = uiFixture({ ...payload, controller: JSON.stringify(saved) });
  context.selectedGameMode = 'native';
  assert.equal(context.restorePersistedMatchBetweenDuels(), false);
  assert.equal(context.matchController, null);
  assert.deepEqual(optionModes, ['strict']);
  assert.equal(removals.length, 1);
});

test('Swiss restoration keeps its saved remaining time and expiry closes the Match without adding a Duel', () => {
  const { payload } = betweenGamesSave({ swiss: true });
  payload.clock = { version: 1, deadlineEpochMs: 1_001_000 };
  const { context, clockState, intervals, writes, removals, nodes } = uiFixture(payload);
  context.selectedGameMode = 'native';
  assert.equal(context.restorePersistedMatchBetweenDuels(), true);
  assert.equal(context.selectedGameMode, 'strict');
  assert.equal(context.matchClock.label(), '00:01');
  assert.equal(JSON.parse(writes.get('active')).clock.deadlineEpochMs, 1_001_000);
  const gamesBefore = context.matchController.engine.getMatchState().games;
  clockState.wall += 1000; clockState.mono += 1000;
  [...intervals.values()][0]();
  const result = context.matchController.getViewModel();
  assert.equal(result.status, 'complete');
  assert.equal(result.isDoubleLoss, true);
  assert.equal(result.winnerId, null);
  assert.deepEqual(context.matchController.engine.getMatchState().games, gamesBefore);
  assert.equal(context.activeDuelInProgress, false);
  assert.equal(context.matchClock, null);
  assert.equal(intervals.size, 0);
  assert.ok(removals.length > 0);
  assert.match(nodes.get('gameover-title').textContent, /DOUBLE DÉFAITE/);
});

test('an already expired Swiss save never launches or obtains a fresh 50-minute round', () => {
  const { payload } = betweenGamesSave({ swiss: true });
  payload.clock = { version: 1, deadlineEpochMs: 999_999 };
  const { context, loads, intervals, writes } = uiFixture(payload);
  context.selectedGameMode = 'native';
  context.selectedDuelSeries = 'single';
  assert.equal(context.restorePersistedMatchBetweenDuels(), false);
  assert.equal(context.matchController.getViewModel().isDoubleLoss, true);
  assert.equal(context.game, null);
  assert.equal(context.matchClock, null);
  assert.equal(intervals.size, 0);
  assert.equal(context.selectedGameMode, 'strict');
  assert.equal(context.selectedDuelSeries, 'match');
  assert.equal(writes.get('mode'), 'strict');
  assert.equal(writes.get('series'), 'match');
  assert.deepEqual(loads, { nativeModule: 0, nativeResources: 0, nativeCatalogue: 0 });
});

test('Swiss expiry during real native initialization cannot reactivate the finished Match', async () => {
  const { payload } = betweenGamesSave({ swiss: true });
  payload.clock = { version: 1, deadlineEpochMs: 1_001_000 };
  let releaseStart, reachedStart;
  const gate = new Promise(resolve => { releaseStart = resolve; });
  const reached = new Promise(resolve => { reachedStart = resolve; });
  const { context, clockState, intervals, notices } = uiFixture(payload,
    { nativeStartGate: () => { reachedStart(); return gate; } });
  assert.equal(context.restorePersistedMatchBetweenDuels(), true);
  context.matchController.chooseFirstPlayer('player', 'player');
  const prepared = context.matchController.prepareNextDuel();
  const launch = context.initGameInstance(prepared.launch);
  await reached;
  assert.ok(context.game instanceof NativeDuelGame);
  const nativeGame = context.game;
  assert.equal(nativeGame.runtime.started, false);
  clockState.wall += 1000; clockState.mono += 1000;
  [...intervals.values()][0]();
  assert.equal(context.matchController.getViewModel().isDoubleLoss, true);
  releaseStart();
  await launch;
  assert.equal(context.activeDuelInProgress, false);
  assert.equal(nativeGame.runtime.started, false);
  assert.equal(nativeGame.winner, null, 'clock expiry does not invent a core WIN');
  assert.equal(context.pendingMatchLaunch, null);
  assert.ok(notices.some(message => message.includes('Double défaite')));
  assert.equal(notices.some(message => message.includes('Duel lancé')), false);
});

test('a missing Swiss clock invalidates the save before assigning a live controller', () => {
  const { payload } = betweenGamesSave({ swiss: true });
  const { context, removals } = uiFixture(payload);
  assert.equal(context.restorePersistedMatchBetweenDuels(), false);
  assert.equal(context.matchController, null);
  assert.equal(context.matchClock, null);
  assert.equal(removals.length, 1);
});

test('an invalidated view transition cannot dispose a newer Duel or continue native loading', async () => {
  let releaseView;
  const gate = new Promise(resolve => { releaseView = resolve; });
  const { context, loads } = uiFixture(null);
  context.duelViewController = { setMode: () => gate };
  const launch = context.initGameInstance();
  let disposals = 0;
  const newerGame = { dispose: () => { disposals += 1; } };
  context.game = newerGame;
  context.duelLaunchGeneration += 1;
  releaseView();
  await launch;
  assert.equal(context.game, newerGame);
  assert.equal(disposals, 0);
  assert.equal(loads.nativeCatalogue, 0);
  assert.equal(loads.nativeModule, 0);
});

test('invalidation during catalogue loading cannot reopen or activate a Duel', async () => {
  let releaseCatalogue, reachedCatalogue;
  const gate = new Promise(resolve => { releaseCatalogue = resolve; });
  const reached = new Promise(resolve => { reachedCatalogue = resolve; });
  const { context, loads } = uiFixture(null, { catalogueGate: () => { reachedCatalogue(); return gate; } });
  const launch = context.initGameInstance();
  await reached;
  context.duelLaunchGeneration += 1;
  releaseCatalogue();
  await launch;
  assert.equal(context.game, null);
  assert.equal(context.activeDuelInProgress, false);
  assert.equal(loads.nativeModule, 0);
  assert.equal(loads.nativeResources, 0);
});

test('an invalidated catalogue rejection cannot reopen the previous configuration', async () => {
  let rejectCatalogue, reachedCatalogue;
  const gate = new Promise((resolve, reject) => { rejectCatalogue = reject; });
  const reached = new Promise(resolve => { reachedCatalogue = resolve; });
  const { context, notices } = uiFixture(null, { catalogueGate: () => { reachedCatalogue(); return gate; } });
  let opened = 0;
  context.openDialog = () => { opened += 1; };
  const launch = context.initGameInstance();
  await reached;
  context.duelLaunchGeneration += 1;
  rejectCatalogue(new Error('late network failure'));
  await launch;
  assert.equal(opened, 0);
  assert.equal(notices.some(message => message.includes('a échoué')), false);
  assert.equal(context.game, null);
});

test('a restored historical May Match launches with its registered list rather than the current list', async () => {
  const { deck } = betweenGamesSave();
  const maxx = createNativeTcgCardTemplate(trustedResources, 23434538);
  const historical = { ...deck, mainDeck: [maxx, ...deck.mainDeck.slice(1)] };
  const controller = new MatchController();
  controller.startMatch({ banlistId: 'TCG_EU_2026_05_18', firstPlayerId: 'player',
    decks: { player: historical, opponent: deck } });
  controller.recordDuelResult('opponent');
  const payload = { version: 1, controller: controller.serialize(), selectedDeckId: 'custom', aiDifficulty: 'normal' };
  assert.equal(validateCustomDeck(historical, 'strict', {
    native: true, ...trustedTcgPolicy,
    isSupportedCard: (card, section) => isSupportedNativeCatalogueCard(trustedResources, card, section)
  }).valid, false, 'the same Deck is forbidden under the current list');
  const { context } = uiFixture(payload);
  assert.equal(context.restorePersistedMatchBetweenDuels(), true);
  context.matchController.chooseFirstPlayer('player', 'player');
  const prepared = context.matchController.prepareNextDuel();
  assert.equal(prepared.launch.banlistId, 'TCG_EU_2026_05_18');
  await context.initGameInstance(prepared.launch);
  assert.ok(context.game instanceof NativeDuelGame);
  assert.equal(context.activeDuelInProgress, true);
  assert.equal(context.game.runtime.started, true);
  const initialized = [...context.game.playerDeck, ...context.game.playerHand].map(card => normalizeStrictCardId(card.id));
  assert.ok(initialized.includes('23434538'));
  assert.equal(initialized.length, 40);
  context.game.dispose();
});

for (const operation of ['changePhase', 'respondNative', 'activateNativeAction', '_submitCommand', '_pump']) {
  test(`Swiss deadline before the interval tick stops ${operation} before a native response or advance`, async () => {
    const { controller, deck, payload } = betweenGamesSave({ swiss: true });
    const normal = STARTER_CARDS.filter(card => card.card_type === 'monster'
      && card.type === 'Normal Monster' && card.level <= 4
      && trustedTcgPolicy.getCardRestriction(card) === 3);
    assert.ok(normal.length >= 14);
    const lowLevelDeck = { ...deck, mainDeck: normal.slice(0, 14).flatMap(card => [card, card, card]).slice(0, 40) };
    controller.startMatch({ firstPlayerId: 'player', tournamentPolicy: 'TCG_EU_SWISS', timeLimitMinutes: 50,
      decks: { player: lowLevelDeck, opponent: lowLevelDeck } });
    controller.recordDuelResult('opponent');
    payload.controller = controller.serialize();
    payload.clock = { version: 1, deadlineEpochMs: 1_001_000 };
    const { context, clockState, intervals, notices } = uiFixture(payload);
    assert.equal(context.restorePersistedMatchBetweenDuels(), true);
    context.matchController.chooseFirstPlayer('player', 'player');
    const prepared = context.matchController.prepareNextDuel();
    await context.initGameInstance(prepared.launch);
    const nativeGame = context.game;
    assert.ok(nativeGame instanceof NativeDuelGame);
    assert.equal(nativeGame.playerHand.length, 5);
    assert.equal(nativeGame.playerDeck.length, 35);
    assert.equal(context.activeDuelInProgress, true);
    const runtime = nativeGame.runtime;
    const { OcgMessageType: M, OcgResponseType: R, SelectIdleCMDAction: I } = runtime.constants;
    assert.equal(nativeGame._prompt.type, M.SELECT_IDLECMD);
    assert.equal(nativeGame._prompt.to_ep, true);
    const action = nativeGame.getAvailableActions('player').nativeActions.find(entry => entry.kind === 'SELECT_SUMMON');
    assert.ok(action, 'the real initial hand offers a valid low-level Normal Summon');
    const response = { type: R.SELECT_IDLECMD, action: I.TO_EP, index: null };
    assert.equal(nativeGame._validateResponse(nativeGame._prompt, response), true);
    let responses = 0, advances = 0;
    const originalRespond = runtime.respond.bind(runtime);
    const originalAdvance = runtime.advance.bind(runtime);
    runtime.respond = value => { responses += 1; return originalRespond(value); };
    runtime.advance = (...args) => { advances += 1; return originalAdvance(...args); };
    const recordedDuels = context.matchController.engine.getMatchState().games;
    clockState.wall += 1000;
    clockState.mono += 1000;
    assert.equal(context.matchClock.expired, true);
    assert.equal(context.matchController.getViewModel().status, 'active', 'no interval tick has closed the Match yet');
    assert.equal(intervals.size, 1);
    const result = operation === 'changePhase' ? await nativeGame.changePhase('end')
      : operation === 'respondNative' ? await nativeGame.respondNative(response)
        : operation === 'activateNativeAction' ? await nativeGame.activateNativeAction(action.id)
          : operation === '_submitCommand' ? await nativeGame._submitCommand(action.kind, action.list, action.card)
            : await nativeGame._pump();
    assert.equal(responses, 0, 'no typed response may cross the exact Swiss deadline');
    assert.equal(advances, 0, 'the core may not process an additional action after the Swiss deadline');
    assert.equal(result, false);
    assert.equal(context.matchController.getViewModel().isDoubleLoss, true);
    assert.deepEqual(context.matchController.engine.getMatchState().games, recordedDuels);
    assert.equal(nativeGame.winner, null, 'the Match cutoff never fabricates an OCG WIN');
    assert.equal(context.activeDuelInProgress, false);
    assert.equal(runtime.closed, true);
    assert.equal(intervals.size, 0);
    assert.ok(notices.some(message => message.includes('Double défaite')));
  });
}

test('Swiss expiry while awaiting a real native SELECT_PLACE discards the delayed decision before responding', async () => {
  const { controller, deck, payload } = betweenGamesSave({ swiss: true });
  const normal = STARTER_CARDS.filter(card => card.card_type === 'monster'
    && card.type === 'Normal Monster' && card.level <= 4
    && trustedTcgPolicy.getCardRestriction(card) === 3);
  assert.ok(normal.length >= 14);
  const registered = { ...deck, mainDeck: normal.slice(0, 14).flatMap(card => [card, card, card]).slice(0, 40) };
  controller.startMatch({ firstPlayerId: 'player', tournamentPolicy: 'TCG_EU_SWISS', timeLimitMinutes: 50,
    decks: { player: registered, opponent: registered } });
  controller.recordDuelResult('opponent');
  payload.controller = controller.serialize();
  payload.clock = { version: 1, deadlineEpochMs: 1_001_000 };
  const { context, clockState } = uiFixture(payload);
  assert.equal(context.restorePersistedMatchBetweenDuels(), true);
  context.matchController.chooseFirstPlayer('player', 'player');
  await context.initGameInstance(context.matchController.prepareNextDuel().launch);
  const nativeGame = context.game, runtime = nativeGame.runtime;
  let releaseDecision, reachedDecision;
  const gate = new Promise(resolve => { releaseDecision = resolve; });
  const reached = new Promise(resolve => { reachedDecision = resolve; });
  context.requestUiDecision = request => { reachedDecision(request); return gate; };
  let responsesAfterDeadline = 0, advancesAfterDeadline = 0, responsesBeforeDeadline = 0;
  const respond = runtime.respond.bind(runtime), advance = runtime.advance.bind(runtime);
  runtime.respond = response => {
    if (clockState.mono >= 1000) responsesAfterDeadline += 1; else responsesBeforeDeadline += 1;
    return respond(response);
  };
  runtime.advance = (...args) => {
    if (clockState.mono >= 1000) advancesAfterDeadline += 1;
    return advance(...args);
  };
  const action = nativeGame.getAvailableActions('player').nativeActions.find(entry => entry.kind === 'SELECT_SUMMON');
  assert.ok(action);
  const pending = nativeGame.activateNativeAction(action.id);
  const descriptor = await reached;
  assert.equal(descriptor.nativeKind, 'SELECT_PLACE');
  assert.equal(responsesBeforeDeadline, 1, 'the legitimate Summon command reaches the core before expiration');
  assert.equal(nativeGame._prompt.type, runtime.constants.OcgMessageType.SELECT_PLACE);
  assert.ok(descriptor.candidates.some(candidate => candidate.uid === '0'));
  const recorded = context.matchController.engine.getMatchState().games;
  clockState.wall += 1000; clockState.mono += 1000;
  assert.equal(context.matchClock.expired, true);
  assert.equal(context.matchController.getViewModel().status, 'active');
  releaseDecision(['0']);
  assert.equal(await pending, false);
  assert.equal(responsesAfterDeadline, 0);
  assert.equal(advancesAfterDeadline, 0);
  assert.equal(context.matchController.getViewModel().isDoubleLoss, true);
  assert.deepEqual(context.matchController.engine.getMatchState().games, recorded);
  assert.equal(nativeGame.winner, null);
  assert.equal(nativeGame.pendingNativeDecision, null);
  assert.equal(runtime.closed, true);
  assert.equal(context.activeDuelInProgress, false);
});
