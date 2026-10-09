import test from 'node:test';
import assert from 'node:assert/strict';
import { DUELIST_AVATARS, getDuelistAvatar } from '../src/content/DuelistAvatarCatalog.js';
import {
  createDuelistAvatarProfile, validateDuelistAvatarProfile,
  getDuelistAvatarUnlockState, collectDuelistAvatarUnlocks, selectDuelistAvatar
} from '../src/content/DuelistAvatarProgress.js';
import {
  SOLO_MISSIONS, createCampaignProgress, validateCampaignProgress, recordMissionResult
} from '../src/content/SoloCampaign.js';

function context(statistics = {}, campaignProgress = createCampaignProgress(), earnedAvatarIds = []) {
  return { statistics: { duels: 0, wins: 0, losses: 0, draws: 0, ...statistics }, campaignProgress, earnedAvatarIds };
}

function campaignWithMedals(total) {
  const progress = createCampaignProgress();
  let remaining = total;
  for (const mission of SOLO_MISSIONS) {
    if (remaining <= 0) break;
    progress.missions[mission.id] = { attempts: 1, wins: 1, bestMedal: Math.min(3, remaining), bestPlayerLP: 8000, bestTurnCount: 5 };
    remaining -= progress.missions[mission.id].bestMedal;
  }
  assert.equal(validateCampaignProgress(progress).valid, true);
  return progress;
}

function campaignThrough(missionId, inclusive = true) {
  let progress = createCampaignProgress();
  for (const mission of SOLO_MISSIONS) {
    if (mission.id === missionId && !inclusive) break;
    progress = recordMissionResult(progress, mission.id, 'player', { resultId: `avatar-${mission.id}` }).progress;
    if (mission.id === missionId) break;
  }
  assert.equal(validateCampaignProgress(progress).valid, true);
  return progress;
}

test('fresh profile, JSON round trip and null restore are independent and valid', () => {
  const first = createDuelistAvatarProfile();
  assert.deepEqual(first, { version: 1, selectedAvatarId: 'yugi', earnedAvatarIds: [] });
  assert.deepEqual(validateDuelistAvatarProfile(JSON.stringify(first)), { valid: true, profile: first, issues: [] });
  assert.deepEqual(validateDuelistAvatarProfile(null).profile, first);
  first.earnedAvatarIds.push('mokuba');
  assert.deepEqual(createDuelistAvatarProfile().earnedAvatarIds, []);
});

test('all starters are selectable without fabricating Duel statistics', () => {
  const empty = context();
  for (const avatar of DUELIST_AVATARS) {
    const state = getDuelistAvatarUnlockState(avatar.id, empty);
    assert.equal(state.unlocked, avatar.unlock.type === 'starter', avatar.id);
    assert.equal(state.earned, false, avatar.id);
    assert.equal(state.progressRatio, avatar.unlock.type === 'starter' ? 1 : 0, avatar.id);
    if (avatar.unlock.type === 'starter') {
      const selected = selectDuelistAvatar(createDuelistAvatarProfile(), avatar.id, empty);
      assert.equal(selected.accepted, true);
      assert.equal(selected.profile.selectedAvatarId, avatar.id);
      assert.deepEqual(selected.profile.earnedAvatarIds, []);
    }
  }
  assert.deepEqual(empty.statistics, { duels: 0, wins: 0, losses: 0, draws: 0 });
});

for (const type of ['wins', 'duels']) {
  test(`${type} unlocks occur at the actual threshold without incrementing counters`, () => {
    for (const avatar of DUELIST_AVATARS.filter(item => item.unlock.type === type)) {
      const target = avatar.unlock.target;
      const before = context({ [type]: target - 1 });
      const at = context({ [type]: target });
      assert.equal(getDuelistAvatarUnlockState(avatar.id, before).unlocked, false, avatar.id);
      const unlocked = getDuelistAvatarUnlockState(avatar.id, at);
      assert.equal(unlocked.unlocked, true, avatar.id);
      assert.equal(unlocked.current, target);
      assert.equal(unlocked.target, target);
      assert.equal(unlocked.progressRatio, 1);
      assert.equal(at.statistics[type], target);
    }
  });
}

test('medal unlocks use the twelve best medals once, including the reachable 36-medal cap', () => {
  for (const avatar of DUELIST_AVATARS.filter(item => item.unlock.type === 'medals')) {
    const target = avatar.unlock.target;
    const before = context({}, campaignWithMedals(target - 1));
    const at = context({}, campaignWithMedals(target));
    assert.equal(getDuelistAvatarUnlockState(avatar.id, before).unlocked, false, avatar.id);
    assert.equal(getDuelistAvatarUnlockState(avatar.id, at).unlocked, true, avatar.id);
  }
  const all = campaignWithMedals(36);
  for (const entry of Object.values(all.missions)) { entry.attempts = 100; entry.wins = 100; }
  all.missions['unknown-mission'] = { attempts: 99, wins: 99, bestMedal: 999 };
  assert.equal(getDuelistAvatarUnlockState('zarc', context({}, all)).current, 36);
});

test('mission unlocks consume actual campaign results and require the preceding progression', () => {
  for (const avatar of DUELIST_AVATARS.filter(item => item.unlock.type === 'mission')) {
    const id = avatar.unlock.missionId;
    assert.equal(getDuelistAvatarUnlockState(avatar.id, context({}, campaignThrough(id, false))).unlocked, false, avatar.id);
    const state = getDuelistAvatarUnlockState(avatar.id, context({}, campaignThrough(id)));
    assert.equal(state.unlocked, true, avatar.id);
    assert.equal(state.current, 1);
    assert.equal(state.target, 1);
    assert.match(state.conditionLabel, /Terminer/);
  }
  const outOfOrder = createCampaignProgress();
  outOfOrder.missions['adaptive-finale'] = { attempts: 1, wins: 1, bestMedal: 3 };
  assert.equal(getDuelistAvatarUnlockState('ray', context({}, outOfOrder)).unlocked, false);
});

test('invalid, negative, fractional, infinite or oversized counters grant no achievements', () => {
  for (const bad of [-1, 0.5, NaN, Infinity, '30', 1_000_001, Number.MAX_SAFE_INTEGER]) {
    const state = getDuelistAvatarUnlockState('mokuba', context({ wins: bad }));
    assert.equal(state.unlocked, false);
    assert.equal(state.current, 0);
  }
  const badCampaign = createCampaignProgress();
  for (const mission of SOLO_MISSIONS) badCampaign.missions[mission.id] = { attempts: 1, wins: 1, bestMedal: 99 };
  assert.equal(getDuelistAvatarUnlockState('zarc', context({}, badCampaign)).current, 0);
  badCampaign.missions['first-formation'] = { attempts: 1, wins: 0, bestMedal: 3 };
  assert.equal(getDuelistAvatarUnlockState('solomon', context({}, badCampaign)).unlocked, false);
});

test('unrecognized campaign versions and inherited campaign data grant no medals', () => {
  const badVersion = campaignWithMedals(36);
  badVersion.version = 999;
  assert.equal(getDuelistAvatarUnlockState('zarc', context({}, badVersion)).current, 0);
  const inherited = Object.create({ version: 1, missions: campaignWithMedals(36).missions });
  assert.equal(getDuelistAvatarUnlockState('zarc', context({}, inherited)).current, 0);
});

test('selection collects a newly satisfied condition before checking locked status', () => {
  const selected = selectDuelistAvatar(createDuelistAvatarProfile(), 'mokuba', context({ duels: 1, wins: 1 }));
  assert.equal(selected.accepted, true);
  assert.equal(selected.profile.selectedAvatarId, 'mokuba');
  assert.equal(selected.profile.earnedAvatarIds.includes('mokuba'), true);
  assert.equal(validateDuelistAvatarProfile(selected.profile).valid, true);
});

test('unknown or locked selection is refused while preserving the previous valid selection', () => {
  const profile = selectDuelistAvatar(createDuelistAvatarProfile(), 'kaiba').profile;
  for (const id of ['no-such-avatar', '__proto__', 'constructor', '', null, undefined, 12, { id: 'mokuba' }]) {
    const attempt = selectDuelistAvatar(profile, id, context());
    assert.equal(attempt.accepted, false);
    assert.equal(attempt.reason, 'unknown-avatar');
    assert.equal(attempt.profile.selectedAvatarId, 'kaiba');
  }
  const locked = selectDuelistAvatar(profile, 'zarc', context());
  assert.equal(locked.accepted, false);
  assert.equal(locked.reason, 'avatar-locked');
  assert.equal(locked.profile.selectedAvatarId, 'kaiba');
});

test('repeated collection does not double-count wins, medals or acquired notifications', () => {
  const achievements = context({ duels: 10, wins: 3 }, campaignWithMedals(6));
  const snapshot = JSON.stringify(achievements);
  const initial = createDuelistAvatarProfile();
  const first = collectDuelistAvatarUnlocks(initial, achievements);
  assert.ok(first.newlyUnlocked.length > 0);
  assert.equal(new Set(first.newlyUnlocked).size, first.newlyUnlocked.length);
  const second = collectDuelistAvatarUnlocks(first.profile, achievements);
  assert.deepEqual(second.newlyUnlocked, []);
  assert.deepEqual(second.profile, first.profile);
  assert.deepEqual(initial, createDuelistAvatarProfile());
  assert.equal(JSON.stringify(achievements), snapshot);
});

test('collected avatars persist through campaign/statistic resets and JSON reload', () => {
  const earned = collectDuelistAvatarUnlocks(createDuelistAvatarProfile(), context({}, campaignWithMedals(36))).profile;
  const selected = selectDuelistAvatar(earned, 'zarc', context()).profile;
  const restored = validateDuelistAvatarProfile(JSON.stringify(selected));
  assert.equal(restored.valid, true);
  const reset = collectDuelistAvatarUnlocks(restored.profile, context());
  assert.deepEqual(reset.profile, selected);
  assert.deepEqual(reset.newlyUnlocked, []);
  const state = getDuelistAvatarUnlockState('zarc', context({}, createCampaignProgress(), reset.profile.earnedAvatarIds));
  assert.equal(state.unlocked, true);
  assert.equal(state.earned, true);
  assert.equal(state.progressRatio, 1);
  assert.equal(state.current, 0);
  assert.equal(state.progressLabel, 'Acquis définitivement');
});

test('all 181 nonstarter appearances can be earned from attainable existing counters', () => {
  const all = collectDuelistAvatarUnlocks(createDuelistAvatarProfile(), context({ duels: 30, wins: 30 }, campaignWithMedals(36)));
  assert.equal(all.newlyUnlocked.length, 181);
  assert.equal(all.profile.earnedAvatarIds.length, 181);
  for (const avatar of DUELIST_AVATARS) assert.equal(selectDuelistAvatar(all.profile, avatar.id, context()).accepted, true, avatar.id);
  assert.equal(validateDuelistAvatarProfile(all.profile).valid, true);
});

test('malformed profiles are bounded, reported and safely repaired', () => {
  const badProfiles = [
    'not-json', '[1,2]', 'x'.repeat(64_001), [], 42, true,
    { version: 2, selectedAvatarId: 'yugi', earnedAvatarIds: [] },
    { version: 1, selectedAvatarId: 'unknown', earnedAvatarIds: [] },
    { version: 1, selectedAvatarId: 'zarc', earnedAvatarIds: [] },
    { version: 1, selectedAvatarId: 'yugi', earnedAvatarIds: ['unknown'] },
    { version: 1, selectedAvatarId: 'yugi', earnedAvatarIds: ['mokuba', 'mokuba'] },
    { version: 1, selectedAvatarId: 'yugi', earnedAvatarIds: new Array(193).fill('mokuba') },
    { version: 1, selectedAvatarId: 'yugi', earnedAvatarIds: {} }
  ];
  for (const raw of badProfiles) {
    const result = validateDuelistAvatarProfile(raw);
    assert.equal(result.valid, false);
    assert.ok(result.issues.length > 0);
    assert.equal(result.profile.selectedAvatarId, 'yugi');
    assert.ok(result.profile.earnedAvatarIds.length <= 192);
    assert.equal(result.profile.earnedAvatarIds.every(id => getDuelistAvatar(id) !== null), true);
  }
});

test('prototype pollution and inherited fields cannot select a character or add achievements', () => {
  const raw = JSON.parse('{"version":1,"selectedAvatarId":"yugi","earnedAvatarIds":[],"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}');
  const result = validateDuelistAvatarProfile(raw);
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes('unknown-profile-field'));
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(result.profile), Object.prototype);
  const inherited = Object.create({ version: 1, selectedAvatarId: 'mokuba', earnedAvatarIds: ['mokuba'] });
  assert.equal(validateDuelistAvatarProfile(inherited).valid, false);
  assert.equal(getDuelistAvatarUnlockState('mokuba', { statistics: Object.create({ wins: 30 }) }).unlocked, false);
  assert.equal(getDuelistAvatarUnlockState('mokuba', Object.create({ statistics: { wins: 30 } })).unlocked, false);
});

test('getters in imported profiles, avatar objects and contexts are never executed', () => {
  let reads = 0;
  const getter = () => { reads += 1; throw new Error('Untrusted accessor executed'); };
  const raw = { version: 1, earnedAvatarIds: [] };
  Object.defineProperty(raw, 'selectedAvatarId', { get: getter, enumerable: true });
  assert.equal(validateDuelistAvatarProfile(raw).valid, false);
  const achievements = { statistics: {} };
  Object.defineProperty(achievements.statistics, 'wins', { get: getter });
  Object.defineProperty(achievements, 'campaignProgress', { get: getter });
  assert.equal(getDuelistAvatarUnlockState('mokuba', achievements).unlocked, false);
  assert.deepEqual(collectDuelistAvatarUnlocks(createDuelistAvatarProfile(), achievements).newlyUnlocked, []);
  const fakeAvatar = {};
  Object.defineProperty(fakeAvatar, 'id', { get: getter });
  assert.equal(getDuelistAvatarUnlockState(fakeAvatar, context()).unlocked, false);
  const array = new Array(1);
  Object.defineProperty(array, '0', { get: getter });
  assert.equal(validateDuelistAvatarProfile({ version: 1, selectedAvatarId: 'yugi', earnedAvatarIds: array }).valid, false);
  assert.equal(reads, 0);
});

test('object-supplied fake unlock rules do not override the canonical catalogue', () => {
  const forged = { id: 'zarc', unlock: { type: 'starter' }, visual: { hairStyle: '<script>' } };
  assert.equal(getDuelistAvatarUnlockState(forged, context()).unlocked, false);
  const missing = getDuelistAvatarUnlockState('unknown', context({ wins: 30 }));
  assert.deepEqual(missing, { unlocked: false, earned: false, conditionLabel: 'Avatar inconnu', progressLabel: 'Indisponible', current: 0, target: 0, progressRatio: 0 });
});

test('valid local earned-ID context is merged once and invalid IDs are ignored', () => {
  const first = collectDuelistAvatarUnlocks(createDuelistAvatarProfile(), context({}, createCampaignProgress(), ['mokuba', 'missing', 'mokuba']));
  assert.deepEqual(first.newlyUnlocked, ['mokuba']);
  assert.deepEqual(first.profile.earnedAvatarIds, ['mokuba']);
  const second = collectDuelistAvatarUnlocks(first.profile, context({}, createCampaignProgress(), ['mokuba']));
  assert.deepEqual(second.newlyUnlocked, []);
  assert.equal(selectDuelistAvatar(second.profile, 'mokuba', context()).accepted, true);
});
