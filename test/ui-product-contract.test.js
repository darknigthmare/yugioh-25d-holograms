import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { isHandPlacementDestinationLegal } from '../src/ui/HandPlacement.js';
import { isFieldSpellCard } from '../src/core/FieldSpellRules.js';
import { canAddDeckBuilderCard } from '../src/ui/DeckBuilderRules.js';
import { NATIVE_CARDS, getNativeFieldEligibility } from '../src/core/native/NativeCardRegistry.js';

const mainSource = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const styleSource = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const boardSource = readFileSync(new URL('../src/board.js', import.meta.url), 'utf8');

test('custom Deck validity is based on known resolved cards and storage writes are guarded', () => {
  assert.match(mainSource, /const knownCardTemplates = new Map/);
  assert.match(mainSource, /function normalizeCustomDeckIds\(mainIds, extraIds\)/);
  assert.match(mainSource, /const normalized = normalizeCustomDeckIds\(customDeckMainIds, customDeckExtraIds\);[\s\S]*customDeckMainIds = normalized\.main/);
  assert.match(mainSource, /function writeStoredValue\(key, value\) \{[\s\S]*try \{[\s\S]*localStorage\.setItem/);
  assert.doesNotMatch(mainSource, /localStorage\.setItem\(STORAGE_KEYS\.customDeck/);
});

test('Duel results preserve the end reason and never claim that a nonexistent report was stored', () => {
  assert.match(mainSource, /function normalizeDuelResult\(resultOrWinner, legacyDetails = null\)/);
  assert.match(mainSource, /Victoire par Deck Out/);
  assert.match(mainSource, /Vous avez abandonné ce Duel/);
  assert.match(mainSource, /stopBGM\(\);[\s\S]*cancelBoardAnimations/);
  assert.doesNotMatch(mainSource, /rapport du duel a été enregistré/i);
});

test('reset, Match persistence and configuration return are explicit and reload-free', () => {
  assert.match(htmlSource, /id="btn-return-config"/);
  assert.match(htmlSource, /id="btn-reset"[^>]*>ABANDONNER LE DUEL</);
  assert.match(mainSource, /MatchController\.deserialize\(payload\.controller\)/);
  assert.match(mainSource, /matchController\.serialize\(\)/);
  assert.match(mainSource, /window\.addEventListener\('beforeunload'/);
  assert.doesNotMatch(mainSource, /window\.location\.reload/);
});

test('phase controls expose both sequential progression and an explicit End turn action', () => {
  assert.match(htmlSource, /id="btn-next-phase"[^>]*>PHASE SUIVANTE</);
  assert.match(htmlSource, /id="btn-end-turn"[^>]*>FIN DU TOUR</);
  assert.match(mainSource, /endTurnBtn\?\.addEventListener\('click'/);
  assert.match(mainSource, /game\.changePhase\('end'\)/);
  assert.match(htmlSource, /permet de sauter la Battle Phase depuis Main 1/);
});

test('single Duels use the same random opening decision method as Matches', () => {
  assert.match(mainSource, /async function resolveOpeningFirstPlayer\(sessionLabel = 'Duel'\)/);
  assert.match(mainSource, /singleStartingPlayer = \(await resolveOpeningFirstPlayer\('Duel'\)\)\.firstPlayer/);
  assert.match(mainSource, /const opening = await resolveOpeningFirstPlayer\('Duel 1'\)/);
});

test('Extra Deck and public piles expose legal, accessible information without hidden-card leakage', () => {
  assert.match(mainSource, /const availableActions = game\.getAvailableActions\?\.\('player'\)/);
  assert.match(mainSource, /legalExtraUids/);
  assert.match(mainSource, /cardEl\.setAttribute\('aria-disabled', legal \? 'false' : 'true'\)/);
  assert.match(htmlSource, /id="public-zone-modal"/);
  assert.match(mainSource, /definition\.hideFaceDown && card\?\.isSetFaceDown/);
  assert.match(mainSource, /identité masquée/);
});

test('keyboard, screen-reader and bounded-log contracts are present', () => {
  assert.match(htmlSource, /id="player-lp" class="lp-value" aria-hidden="true"/);
  assert.match(htmlSource, /id="lp-announcer"[^>]*aria-live="polite"/);
  assert.match(mainSource, /function updateBoardZoneAccessibility\(\)/);
  assert.match(mainSource, /zone\.tabIndex = interactive \? 0 : -1/);
  assert.match(mainSource, /target\.matches\?\.\('\.card-zone'\)[\s\S]*target\.querySelector/);
  assert.match(mainSource, /while \(logContent\.childElementCount > MAX_LOG_ENTRIES\)/);
});

test('mobile play uses a pannable unscaled board so card zones remain at least 44px', () => {
  assert.match(styleSource, /\.card-zone\s*\{[\s\S]*width:\s*80px;[\s\S]*height:\s*110px;/);
  assert.match(styleSource, /\.field-container\.board-pan-mode \.duel-board-shadow-box\s*\{[\s\S]*transform:\s*none;/);
  assert.match(styleSource, /touch-action:\s*pan-x pan-y/);
  assert.match(htmlSource, /id="mobile-board-help"/);
});

test('desktop hand and End Turn controls remain inside the fixed viewport row', () => {
  assert.match(
    styleSource,
    /\.app-container\s*\{[\s\S]*grid-template-rows:\s*80px 1fr 180px;/
  );
  assert.match(
    styleSource,
    /\.command-actions \.btn\s*\{[\s\S]*flex:\s*1 1 55px;[\s\S]*min-height:\s*44px;/
  );
});

test('visual timers are motion-aware and cancellable between Duels', () => {
  assert.match(boardSource, /export function cancelBoardAnimations\(boardEl = null\)/);
  assert.match(boardSource, /prefers-reduced-motion: reduce/);
  assert.match(boardSource, /scheduleBoardAnimation/);
  assert.doesNotMatch(boardSource, /(?<!window\.)setTimeout\(/);
});

test('card-back presets no longer hotlink YGOPRODeck card art', () => {
  assert.match(htmlSource, /data-url="\/cards\/small\/89631139\.jpg"/);
  assert.doesNotMatch(htmlSource, /images\.ygoprodeck\.com\/images\/cards\/89631139/);
});

test('an occupied Main Monster Zone is projected only for a legal Tribute Summon or Set', () => {
  const tributeMonster = { card_type: 'monster', level: 7 };
  const normalMonster = { card_type: 'monster', level: 4 };

  for (const zoneIndex of [0, 1, 4]) {
    assert.equal(isHandPlacementDestinationLegal({
      card: tributeMonster,
      zoneType: 'monster',
      zoneIndex,
      occupied: true,
      controlledMonsterCount: 2
    }), true, `occupied Main Zone ${zoneIndex} can be chosen if its occupant will be a Tribute`);
  }

  assert.equal(isHandPlacementDestinationLegal({
    card: tributeMonster,
    zoneType: 'monster',
    zoneIndex: 2,
    occupied: true,
    controlledMonsterCount: 1
  }), false, 'an occupied destination is not offered without enough Tributes');
  assert.equal(isHandPlacementDestinationLegal({
    card: normalMonster,
    zoneType: 'monster',
    zoneIndex: 2,
    occupied: true,
    controlledMonsterCount: 5
  }), false, 'a Level 4 Normal Summon cannot overwrite an occupied zone');
  assert.equal(isHandPlacementDestinationLegal({
    card: { card_type: 'spell' },
    zoneType: 'spell',
    zoneIndex: 2,
    occupied: true,
    controlledMonsterCount: 5
  }), false, 'an occupied Spell/Trap Zone is never made legal by Tribute projection');

  assert.match(mainSource, /function canPlaceHandCard\(options\)[\s\S]*typeof game\?\.activateNativeAction !== 'function'[\s\S]*isHandPlacementDestinationLegal\(options\)/);
  assert.match(mainSource, /function highlightValidDropZones\(card\)[\s\S]*const legal = canPlaceHandCard\(/);
  assert.match(mainSource, /const placementIsLegal = canPlaceHandCard\([\s\S]*if \(selectedCard && placementIsLegal\)/);
});

test('native hand placement is offered only for cards available in the core command list', () => {
  const source = mainSource.match(/function canPlaceHandCard\([^]*?\n\}/)?.[0];
  assert.ok(source, 'the UI must expose its native/Sandbox placement boundary');
  const actions = { normalSummonCardUids: ['summonable'], normalSetCardUids: ['settable'] };
  const context = vm.createContext({
    isHandPlacementDestinationLegal, isFieldSpellCard,
    canActivateHandPendulumScale: () => false,
    game: {
      activateNativeAction() {}, getAvailableActions: () => actions,
      canActivateSpell: card => card.uid === 'activatable',
      canSetSpell: card => card.uid === 'settable'
    }
  });
  vm.runInContext(source, context);
  const offered = { card_type: 'monster', uid: 'summonable' };
  assert.equal(context.canPlaceHandCard({ card: offered, zoneType: 'monster', zoneIndex: 2, occupied: false }), true);
  assert.equal(context.canPlaceHandCard({ card: { ...offered, uid: 'unavailable' }, zoneType: 'monster', zoneIndex: 2, occupied: false }), false);
  const field = { card_type: 'spell', race: 'Field', uid: 'activatable' };
  assert.equal(context.canPlaceHandCard({ card: field, zoneType: 'field', zoneIndex: 0, occupied: true }), true);
  assert.equal(context.canPlaceHandCard({ card: field, zoneType: 'spell', zoneIndex: 2, occupied: false }), false);
  assert.equal(context.canPlaceHandCard({ card: { card_type: 'spell', uid: 'activatable' }, zoneType: 'spell', zoneIndex: 2, occupied: true }), false);
  context.game = null;
  assert.equal(context.canPlaceHandCard({ card: { card_type: 'monster', level: 4 }, zoneType: 'monster', zoneIndex: 2, occupied: true, controlledMonsterCount: 5 }), false,
    'Sandbox retains the existing occupied-zone legality rule');
});

test('the native catalogue separates released TCG legality from the unrestricted field corpus', () => {
  const fields = NATIVE_CARDS.filter(isFieldSpellCard);
  assert.equal(fields.length, 339);
  const outsideTcg = fields.find(card => !getNativeFieldEligibility(card, 'TCG').allowed);
  assert.ok(outsideTcg, 'the catalogue must retain an OCG-only or announced field instead of filtering it away');
  const deck = { mainDeck: [], extraDeck: [], sideDeck: [] };
  const strict = canAddDeckBuilderCard(deck, outsideTcg, 'mainDeck', 'strict', { native: true, format: 'TCG' });
  assert.equal(strict.allowed, false);
  assert.match(strict.code, /^FIELD_(?:OCG_ONLY|NOT_RELEASED_TCG|TCG_PUBLICATION_UNKNOWN)$/);
  assert.equal(canAddDeckBuilderCard(deck, outsideTcg, 'mainDeck', 'native', { native: true, format: 'ALL' }).allowed, true);
  assert.match(htmlSource, /name="game-mode" value="native"/);
  assert.match(htmlSource, /href="\/native\/sources\/README\.md"[^>]*>sources et licences</);
});

test('the builder binds Strict, Libre and Sandbox to the appropriate format and trusted native catalogue', () => {
  const source = mainSource.match(/const nativeBuilderOptions = \(\) => \(\{[^]*?\n\}\);/)?.[0];
  assert.ok(source, 'builder validation must expose its mode and trusted-data options');
  const context = vm.createContext({
    selectedGameMode: 'strict', nativeCatalogueResources: null, nativeCatalogueToolkit: null,
    getDeckCopyIdentity: card => `local:${card.id}`
  });
  vm.runInContext(`${source}\nglobalThis.builderOptions = nativeBuilderOptions;`, context);
  const card = { id: '1234' };
  let options = context.builderOptions();
  assert.equal(options.native, true);
  assert.equal(options.format, 'TCG');
  assert.equal(options.isSupportedCard(card, 'main'), false, 'unloaded CDB data cannot establish support');
  assert.equal(options.getCopyIdentity(card), 'local:1234');

  const resources = {};
  const calls = [];
  context.nativeCatalogueResources = resources;
  context.nativeCatalogueToolkit = {
    isSupportedNativeCatalogueCard: (...args) => { calls.push(args); return args[1] === card && args[2] === 'main'; },
    getNativeCardCopyIdentity: (data, template) => data === resources && template === card ? 'trusted-alias' : null
  };
  context.selectedGameMode = 'native';
  options = context.builderOptions();
  assert.equal(options.native, true);
  assert.equal(options.format, 'ALL');
  assert.equal(options.isSupportedCard(card, 'main'), true);
  assert.equal(options.isSupportedCard(card, 'extra'), false, 'section eligibility is delegated to the trusted CDB');
  assert.equal(calls[0][0], resources);
  assert.equal(options.getCopyIdentity(card), 'trusted-alias');

  context.selectedGameMode = 'sandbox';
  assert.equal(context.builderOptions().native, false);
  const launch = mainSource.match(/async function initGameInstance\([^]*?\n\}/)?.[0];
  assert.ok(launch.indexOf('await ensureNativeCatalogue()') < launch.indexOf('validateCustomDeck('),
    'Libre must resolve stored CDB cards before validating a custom deck');
  assert.match(launch, /const allTemplates = \[\.\.\.knownCardTemplates\.values\(\)\]/,
    'duel decks must not depend on a currently filtered catalogue search');
});

test('Field Spells use only their dedicated replaceable Field Zone', () => {
  const fieldSpell = {
    card_type: 'spell',
    type: 'Spell Card',
    race: 'Field'
  };

  assert.equal(isHandPlacementDestinationLegal({
    card: fieldSpell,
    zoneType: 'field',
    zoneIndex: 0,
    occupied: false
  }), true);
  assert.equal(isHandPlacementDestinationLegal({
    card: fieldSpell,
    zoneType: 'field',
    zoneIndex: 0,
    occupied: true
  }), true, 'a new Field Spell may replace the current one');
  assert.equal(isHandPlacementDestinationLegal({
    card: fieldSpell,
    zoneType: 'spell',
    zoneIndex: 2,
    occupied: false
  }), false, 'a Field Spell cannot be placed in a regular Spell/Trap Zone');
  assert.equal(isHandPlacementDestinationLegal({
    card: { card_type: 'spell', race: 'Continuous' },
    zoneType: 'field',
    zoneIndex: 0,
    occupied: false
  }), false, 'a non-Field Spell cannot use the Field Zone');
});
