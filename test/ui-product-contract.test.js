import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isHandPlacementDestinationLegal } from '../src/ui/HandPlacement.js';

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

  assert.match(mainSource, /function highlightValidDropZones\(card\)[\s\S]*isHandPlacementDestinationLegal\(/);
  assert.match(mainSource, /const placementIsLegal = isHandPlacementDestinationLegal\([\s\S]*if \(selectedCard && placementIsLegal\)/);
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
