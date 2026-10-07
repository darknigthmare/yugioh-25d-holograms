import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { DuelGame } from '../src/game.js';
import { MatchController } from '../src/ui/MatchController.js';
import { validateCustomDeck } from '../src/ui/DeckBuilderRules.js';
import { normalizeStrictCardId } from '../src/core/StrictCardRegistry.js';

const mainSource = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

function productionFunction(name) {
  const match = mainSource.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `missing production function ${name}`);
  return match[0];
}

function betweenGamesSave() {
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
    decks: { player: deck, opponent: deck } });
  controller.recordDuelResult('opponent');
  return { controller, deck, payload: { version: 1, controller: controller.serialize(),
    selectedDeckId: 'custom', aiDifficulty: 'hard' } };
}

function element() {
  const attrs = new Map();
  return {
    innerHTML: '', textContent: '', disabled: false,
    classList: { remove() {}, toggle() {} },
    setAttribute: (name, value) => attrs.set(name, value),
    getAttribute: name => attrs.get(name)
  };
}

// Exercise production restore/launch handlers with the real serialized Match
// and Duel engines. Audio, rendering and automatic phase timers are unrelated
// to this transaction and are stopped at the initial-hand boundary.
function uiFixture(payload) {
  class InitialHandDuel extends DuelGame {
    constructor(callbacks, options) {
      super(callbacks, options);
      this.startPhaseFlow = () => {};
      this.scheduleAction = () => 0;
    }
  }
  const writes = new Map();
  const notices = [];
  const nodes = new Map();
  const getElement = id => {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  };
  const templates = [...STARTER_CARDS, ...EXTRA_DECK_CARDS];
  const noop = () => {};
  const context = vm.createContext({
    STARTER_CARDS, EXTRA_DECK_CARDS, MatchController, DuelGame: InitialHandDuel,
    validateCustomDeck, normalizeStrictCardId,
    knownCardTemplates: new Map(templates.map(card => [String(card.id), card])),
    canonicalCardTemplates: new Map(templates.map(card => [normalizeStrictCardId(card.id), card])),
    STORAGE_KEYS: { activeMatch: 'active', gameMode: 'mode', duelSeries: 'series', difficulty: 'difficulty' },
    readStoredJson: () => payload,
    writeStoredValue: (key, value) => { writes.set(key, value); return true; },
    clearPersistedMatch: noop,
    matchController: null, pendingMatchLaunch: null, game: null, duelViewController: null,
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
    pendingDecisionResolver: null, selectedAttackerIndex: null,
    currentDraggedUid: null, selectedHandUid: null, pendingAction: null,
    previousPendulumAvailable: false,
    actionModal: null, extraModal: null, publicZoneModal: null, settingsModal: null,
    updateUI: noop, handleGameAnimations: noop, handleGameOver: noop,
    requestUiDecision: noop, requestUiChainOpportunity: () => null,
    sanitizePublicLogMessage: message => message, addLogEntry: noop, handleLogSpeech: noop,
    positionMobileBoardForPlayer: noop, startBGM: noop, stopHologramHum: noop, setBGMStyle: noop
  });
  const presetBegin = mainSource.indexOf('const SANDBOX_PREMADE_DECKS =');
  const presetEnd = mainSource.indexOf('\nlet selectedGameMode =', presetBegin);
  assert.ok(presetBegin >= 0 && presetEnd > presetBegin);
  vm.runInContext(mainSource.slice(presetBegin, presetEnd), context);
  for (const name of ['isTemplateExtraDeckCard', 'canonicalCustomDeckIds', 'normalizeCustomDeckIds',
    'getCustomDeckCards', 'selectDeckChoice', 'persistMatchBetweenDuels',
    'restorePersistedMatchBetweenDuels', 'initGameInstance']) {
    vm.runInContext(productionFunction(name), context);
  }
  context.openSideDeckEditor = () => { context.persistMatchBetweenDuels(); };
  return { context, writes, notices, nodes };
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
  assert.ok(context.game instanceof DuelGame);
  assert.equal(context.activeDuelInProgress, true);
  assert.equal(context.game.currentTurn, 'opponent');
  assert.equal(context.game.rulesMode, 'strict');
  assert.equal(context.pendingMatchLaunch, prepared.launch);
  const actualMain = [...context.game.playerDeck, ...context.game.playerHand].map(card => card.id).sort();
  assert.deepEqual(actualMain, prepared.launch.decks.player.mainDeck.map(card => card.id).sort());
  assert.deepEqual(context.game.playerExtraDeck.map(card => card.id),
    prepared.launch.decks.player.extraDeck.map(card => card.id));
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
