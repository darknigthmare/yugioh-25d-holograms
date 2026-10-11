import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { DUELIST_AVATARS, getDuelistAvatar, DEFAULT_DUELIST_AVATAR_ID } from '../src/content/DuelistAvatarCatalog.js';
import {
  createDuelistAvatarProfile, collectDuelistAvatarUnlocks,
  getDuelistAvatarUnlockState, selectDuelistAvatar, validateDuelistAvatarProfile,
  mergeDuelistAvatarProfiles
} from '../src/content/DuelistAvatarProgress.js';
import { DuelViewController } from '../src/ui/DuelViewController.js';
import { RealDuelView, createPublicDuelSceneSummary } from '../src/ui/RealDuelView.js';

const mainSource = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
function productionFunction(name) {
  const match = mainSource.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `Missing production integration: ${name}`);
  return match[0];
}

function fixture({ storageAvailable = true } = {}) {
  const labels = new Map();
  const playerLabel = { textContent: '', setAttribute: (key, value) => labels.set(key, value) };
  const writes = [];
  const appearances = [];
  const notices = [];
  const downloads = [], revokedUrls = [], timers = [];
  const game = { playerHand: [{ uid: 'private-hand' }], opponentDeck: [{ id: 'private-deck' }] };
  const context = vm.createContext({
    getDuelistAvatar, DEFAULT_DUELIST_AVATAR_ID, collectDuelistAvatarUnlocks,
    getDuelistAvatarUnlockState, selectDuelistAvatar, validateDuelistAvatarProfile, mergeDuelistAvatarProfiles,
    duelistAvatarProfile: createDuelistAvatarProfile(), duelistAvatarStorageBlocked: false,
    duelistAvatarSelectionRevision: 0, duelistAvatarImportGeneration: 0,
    currentOpponentAvatarId: 'kaiba', duelistAvatarPicker: { render() {} },
    duelStatistics: { duels: 0, wins: 0, losses: 0, draws: 0 },
    campaignController: { progress: {} }, game,
    document: {
      getElementById: id => id === 'player-label' ? playerLabel : null,
      body: { appendChild() {} },
      createElement: () => ({ click() { downloads.at(-1).filename = this.download; }, remove() {} })
    },
    Blob, Date,
    URL: { createObjectURL: blob => { downloads.push({ blob }); return `blob:collection-${downloads.length}`; }, revokeObjectURL: url => revokedUrls.push(url) },
    setTimeout: callback => timers.push(callback),
    duelViewController: { setDuelistAvatars: value => appearances.push(value) },
    STORAGE_KEYS: { duelistAvatar: 'ygo_duelist_avatar_v1' },
    writeStoredValue: (key, value) => { if (!storageAvailable) return false; writes.push({ key, value }); return true; },
    announceStatus: message => notices.push(message)
  });
  for (const name of ['getDuelistAvatarContext', 'persistDuelistAvatarProfile',
    'synchronizeDuelistAvatarAppearance', 'refreshDuelistAvatarUnlocks', 'chooseHumanDuelistAvatar',
    'importDuelistAvatarCollection', 'exportDuelistAvatarCollection']) {
    vm.runInContext(productionFunction(name), context);
  }
  return { context, writes, appearances, playerLabel, labels, game, notices, downloads, revokedUrls, timers };
}

function collectionFile(profile = createDuelistAvatarProfile()) {
  const raw = typeof profile === 'string' ? profile : JSON.stringify(profile);
  return { size: Buffer.byteLength(raw), text: async () => raw };
}

function pendingCollection(profile) {
  let release;
  const raw = JSON.stringify(profile);
  return { file: { size: Buffer.byteLength(raw), text: () => new Promise(resolve => { release = () => resolve(raw); }) }, release: () => release() };
}

test('import merges acquired avatars and selection without replacing the live duel or its progression', async () => {
  const { context, writes, appearances, game } = fixture();
  const acquired = DUELIST_AVATARS.filter(a => a.unlock.type !== 'starter').slice(0, 2).map(a => a.id);
  context.duelistAvatarProfile = { version: 1, selectedAvatarId: 'yugi', earnedAvatarIds: [acquired[0]] };
  const stats = context.duelStatistics, campaign = context.campaignController.progress;
  const result = await context.importDuelistAvatarCollection(collectionFile({ version: 1, selectedAvatarId: acquired[1], earnedAvatarIds: [acquired[1]] }));
  assert.equal(result.accepted, true);
  assert.equal(result.saved, true);
  assert.deepEqual([...result.profile.earnedAvatarIds].sort(), acquired.sort());
  assert.equal(appearances.at(-1).playerAvatarId, acquired[1]);
  assert.equal(JSON.parse(writes.at(-1).value).selectedAvatarId, acquired[1]);
  assert.equal(context.game, game);
  assert.equal(context.duelStatistics, stats);
  assert.equal(context.campaignController.progress, campaign);
});

test('invalid, oversized, unreadable and incompatible imports cannot change the collection or appearance', async () => {
  const { context, writes, appearances } = fixture();
  const before = context.duelistAvatarProfile;
  const locked = DUELIST_AVATARS.find(a => a.unlock.type !== 'starter').id;
  const files = [collectionFile('{'), collectionFile('null'), collectionFile({ version: 99 }),
    collectionFile({ version: 1, selectedAvatarId: '__proto__', earnedAvatarIds: [] }),
    collectionFile({ version: 1, selectedAvatarId: locked, earnedAvatarIds: [] }),
    { size: 64001, text() { throw new Error('must not read'); } },
    { size: 10, text: async () => { throw new Error('read failure'); } }];
  for (const file of files) assert.equal((await context.importDuelistAvatarCollection(file)).accepted, false);
  assert.equal(context.duelistAvatarProfile, before);
  assert.equal(writes.length, 0);
  assert.equal(appearances.length, 0);
});

test('a newer human choice cancels a pending file import', async () => {
  const { context, writes } = fixture();
  const pending = pendingCollection({ version: 1, selectedAvatarId: 'kaiba', earnedAvatarIds: [] });
  const importResult = context.importDuelistAvatarCollection(pending.file);
  context.chooseHumanDuelistAvatar('jaden');
  pending.release();
  assert.equal((await importResult).accepted, false);
  assert.equal(context.duelistAvatarProfile.selectedAvatarId, 'jaden');
  assert.equal(writes.length, 1);
});

test('concurrent imports keep the latest request and invalid later requests cancel older reads', async () => {
  const { context } = fixture();
  const first = pendingCollection({ version: 1, selectedAvatarId: 'kaiba', earnedAvatarIds: [] });
  const second = pendingCollection({ version: 1, selectedAvatarId: 'jaden', earnedAvatarIds: [] });
  const one = context.importDuelistAvatarCollection(first.file);
  const two = context.importDuelistAvatarCollection(second.file);
  second.release();
  assert.equal((await two).accepted, true);
  first.release();
  assert.equal((await one).accepted, false);
  assert.equal(context.duelistAvatarProfile.selectedAvatarId, 'jaden');
  const third = pendingCollection({ version: 1, selectedAvatarId: 'kaiba', earnedAvatarIds: [] });
  const three = context.importDuelistAvatarCollection(third.file);
  await context.importDuelistAvatarCollection({ size: 64001 });
  third.release();
  assert.equal((await three).accepted, false);
  assert.equal(context.duelistAvatarProfile.selectedAvatarId, 'jaden');
});

test('a completed duel during file reading is included without invalidating the pending import', async () => {
  const { context } = fixture();
  const pending = pendingCollection({ version: 1, selectedAvatarId: 'kaiba', earnedAvatarIds: [] });
  const transition = context.importDuelistAvatarCollection(pending.file);
  context.duelStatistics = { duels: 1, wins: 1, losses: 0, draws: 0 };
  const acquired = context.refreshDuelistAvatarUnlocks();
  assert.ok(acquired.length > 0);
  pending.release();
  const result = await transition;
  assert.equal(result.accepted, true);
  for (const id of acquired) assert.ok(result.profile.earnedAvatarIds.includes(id));
  assert.equal(result.profile.selectedAvatarId, 'kaiba');
  assert.equal(context.duelStatistics.wins, 1);
});

test('an imported collection remains usable for the session when local storage refuses it', async () => {
  const { context, writes, notices } = fixture({ storageAvailable: false });
  const result = await context.importDuelistAvatarCollection(collectionFile({ version: 1, selectedAvatarId: 'jaden', earnedAvatarIds: [] }));
  assert.equal(result.accepted, true);
  assert.equal(result.saved, false);
  assert.equal(context.duelistAvatarProfile.selectedAvatarId, 'jaden');
  assert.equal(writes.length, 0);
  assert.match(notices.at(-1), /session.*sauvegarde locale/);
});

test('export downloads validated JSON and releases its URL without changing progression', async () => {
  const { context, downloads, revokedUrls, timers, writes } = fixture();
  const profile = context.duelistAvatarProfile;
  assert.equal(context.exportDuelistAvatarCollection().accepted, true);
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].blob.type, 'application/json');
  assert.deepEqual(JSON.parse(await downloads[0].blob.text()), profile);
  assert.match(downloads[0].filename, /^ygo-avatars-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(context.duelistAvatarProfile, profile);
  assert.equal(writes.length, 0);
  timers.forEach(callback => callback());
  assert.deepEqual(revokedUrls, ['blob:collection-1']);
});

test('human appearance is saved and forwarded independently of the live duel and deck', () => {
  const { context, writes, appearances, playerLabel, labels, game } = fixture();
  const hand = game.playerHand, deck = game.opponentDeck;
  const result = context.chooseHumanDuelistAvatar('jaden');
  assert.equal(result.accepted, true);
  assert.equal(result.saved, true);
  assert.equal(JSON.parse(writes[0].value).selectedAvatarId, 'jaden');
  assert.equal(appearances.at(-1).playerAvatarId, 'jaden');
  assert.equal(labels.get('data-avatar-id'), 'jaden');
  assert.match(playerLabel.textContent, /JADEN.*VOUS/);
  assert.equal(context.game, game);
  assert.equal(context.game.playerHand, hand);
  assert.equal(context.game.opponentDeck, deck);
  context.synchronizeDuelistAvatarAppearance('joey');
  assert.equal(appearances.at(-1).playerAvatarId, 'jaden');
  assert.equal(appearances.at(-1).opponentAvatarId, 'joey');
});

test('locked or unknown characters cannot write preferences or replace the displayed human', () => {
  const { context, writes, appearances } = fixture();
  const locked = DUELIST_AVATARS.find(avatar => !getDuelistAvatarUnlockState(avatar, {}).unlocked);
  assert.ok(locked);
  for (const id of [locked.id, '__proto__', '<script>']) {
    assert.equal(context.chooseHumanDuelistAvatar(id).accepted, false);
  }
  assert.equal(context.duelistAvatarProfile.selectedAvatarId, 'yugi');
  assert.equal(writes.length, 0);
  assert.equal(appearances.length, 0);
});

test('a browser refusing local storage still permits the selected appearance during the session', () => {
  const { context, writes, notices, appearances } = fixture({ storageAvailable: false });
  const result = context.chooseHumanDuelistAvatar('kaiba');
  assert.equal(result.accepted, true);
  assert.equal(result.saved, false);
  assert.equal(context.duelistAvatarProfile.selectedAvatarId, 'kaiba');
  assert.equal(appearances.at(-1).playerAvatarId, 'kaiba');
  assert.equal(writes.length, 0);
  assert.match(notices.at(-1), /session.*sauvegarde locale/);
});

test('unlock refresh observes results without creating statistics and preserves acquired characters', () => {
  const { context } = fixture();
  const avatar = DUELIST_AVATARS.find(entry => entry.unlock.type === 'wins' && entry.unlock.target === 1);
  assert.ok(avatar);
  assert.equal(context.refreshDuelistAvatarUnlocks().includes(avatar.id), false);
  context.duelStatistics = { duels: 1, wins: 1, losses: 0, draws: 0 };
  assert.equal(context.refreshDuelistAvatarUnlocks().includes(avatar.id), true);
  assert.equal(context.refreshDuelistAvatarUnlocks().length, 0);
  assert.equal(context.duelStatistics.duels, 1);
  assert.equal(context.duelStatistics.wins, 1);
  context.duelStatistics = { duels: 0, wins: 0, losses: 0, draws: 0 };
  context.campaignController.progress = {};
  context.refreshDuelistAvatarUnlocks();
  assert.equal(context.chooseHumanDuelistAvatar(avatar.id).accepted, true);
});

test('a selection made while the real view loads reaches its first activation without replacing GameState', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const game = Object.freeze({ privateHand: Object.freeze(['hidden']) });
  const appearances = [];
  const activated = [];
  const view = { setDuelistAvatars: value => appearances.push(value), update() {}, activate: state => activated.push(state) };
  const controller = new DuelViewController({ gameState: game, realViewLoader: () => gate, autoAttach: false });
  const transition = controller.setMode('real');
  controller.setDuelistAvatars({ playerAvatarId: 'jaden', opponentAvatarId: 'joey' });
  release(view);
  assert.equal(await transition, true);
  assert.equal(appearances.at(-1).playerAvatarId, 'jaden');
  assert.equal(appearances.at(-1).opponentAvatarId, 'joey');
  assert.equal(activated[0], game);
  assert.equal(controller.getGameState(), game);
  controller.dispose();
});

test('the real view sends only validated cosmetic IDs and keeps public duel aggregates unchanged', () => {
  const view = new RealDuelView({ enable3D: false });
  const appearances = [];
  view.scene3D = { setDuelistAvatars: value => appearances.push(value) };
  view.setDuelistAvatars({ playerAvatarId: 'jaden', opponentAvatarId: 'joey', opponentHand: ['secret'] });
  assert.deepEqual({ ...appearances[0] }, { playerAvatarId: 'jaden', opponentAvatarId: 'joey' });
  view.setDuelistAvatars({ playerAvatarId: '<script>' });
  assert.equal(appearances.at(-1).playerAvatarId, 'yugi');
  const summary = createPublicDuelSceneSummary({ playerHand: ['secret'], opponentHand: ['private'], avatarId: 'jaden' });
  assert.deepEqual(Object.keys(summary).sort(), ['currentPhase', 'currentTurn', 'duelEnded', 'opponentHandCount', 'opponentLP', 'playerHandCount', 'playerLP', 'turnCount'].sort());
  assert.equal(JSON.stringify(summary).includes('secret'), false);
  assert.equal(JSON.stringify(summary).includes('jaden'), false);
  view.dispose();
});
