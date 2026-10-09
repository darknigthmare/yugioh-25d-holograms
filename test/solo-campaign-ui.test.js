import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../src/ui/SoloCampaignController.js', import.meta.url), 'utf8');

test('solo campaign is an accessible optional route beside the unchanged free duel', () => {
  for (const id of ['btn-open-campaign', 'campaign-modal', 'campaign-title', 'campaign-chapters', 'btn-start-duel']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /PARCOURS SOLO · 12 DÉFIS/);
  assert.match(html, /DÉMARRER LE DUEL LIBRE/);
  assert.match(html, /id="campaign-modal"[^>]+role="dialog"[^>]+aria-modal="true"[^>]+aria-labelledby="campaign-title"/);
});

test('missions reuse one selected duel engine and authoritative animation/state callbacks', () => {
  assert.equal((main.match(/game = new GameClass\(/g) || []).length, 1);
  assert.match(main, /let GameClass = DuelGame;[\s\S]*if \(selectedGameMode !== 'sandbox'\)[\s\S]*GameClass = module\.NativeDuelGame/);
  assert.match(main, /const launchedGame = game;[\s\S]*const duelStarted = await launchedGame\.startDuel\(/);
  assert.match(main, /!currentLaunch\(\) \|\| game !== launchedGame/);
  assert.match(main, /buildMissionDecks\(campaignMission\.id\)/);
  assert.match(main, /campaignTracker\?\.recordAnimation\(event\)/);
  assert.match(main, /campaignTracker\?\.observeState\(gameState\)/);
  assert.match(main, /campaignController\.complete\(activeCampaignMissionId/);
  assert.match(controller, /catch \{[\s\S]*Impossible de lancer ce défi[\s\S]*this\.open\(\)/);
});

test('campaign storage is validated, recoverable and never silently reset', () => {
  assert.match(controller, /validateCampaignProgress\(raw\)/);
  assert.match(controller, /storageBlocked = true/);
  assert.match(controller, /file\.size > 1_500_000/);
  assert.match(controller, /Votre progression actuelle est intacte/);
  assert.match(controller, /URL\.revokeObjectURL/);
});

test('modal background is inert and compact phase labels cannot collide', () => {
  assert.match(main, /!appContainer\.contains\(dialog\).*setAttribute\('inert', ''\)/);
  assert.match(main, /removeAttribute\('inert'\)/);
  for (const [phase, label] of [['DP', 'Phase de Pioche'], ['SP', 'Standby Phase'], ['M1', 'Main Phase 1'], ['BP', 'Battle Phase'], ['M2', 'Main Phase 2'], ['EP', 'End Phase']]) {
    assert.match(html, new RegExp(`data-phase-label="${label}" aria-hidden="true">${phase}<`));
  }
  assert.match(main, /phaseEl\.dataset\.phaseLabel/);
  assert.match(main, /Phase actuelle :/);
});
