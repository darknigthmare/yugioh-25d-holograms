import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDuelistAvatarProfile, validateDuelistAvatarProfile,
  normalizeDuelistAvatarStatistics, getDuelistAvatarUnlockState,
  collectDuelistAvatarUnlocks, selectDuelistAvatar, mergeDuelistAvatarProfiles
} from '../src/content/DuelistAvatarProgress.js';
import { createCampaignProgress } from '../src/content/SoloCampaign.js';

function profile(id = 'yugi', earnedAvatarIds = []) {
  return { version: 1, selectedAvatarId: id, earnedAvatarIds };
}

test('a corrupt victory counter exceeding the completed Duel count grants no extra wins', () => {
  const statistics = { duels: 0, wins: 30, losses: 0, draws: 0 };
  assert.deepEqual(normalizeDuelistAvatarStatistics(statistics), { duels: 0, wins: 0, losses: 0, draws: 0 });
  const state = getDuelistAvatarUnlockState('zane', { statistics });
  assert.equal(state.current, 0);
  assert.equal(state.unlocked, false);
  assert.deepEqual(collectDuelistAvatarUnlocks(createDuelistAvatarProfile(), { statistics }).newlyUnlocked, []);
  assert.deepEqual(statistics, { duels: 0, wins: 30, losses: 0, draws: 0 });
});

test('draws and losses consume the completed Duel budget before an inconsistent victory counter', () => {
  assert.deepEqual(normalizeDuelistAvatarStatistics({ duels: 10, wins: 40, losses: 4, draws: 3 }), { duels: 10, wins: 3, losses: 4, draws: 3 });
  assert.deepEqual(normalizeDuelistAvatarStatistics({ duels: 2, wins: 40, losses: 4, draws: 3 }), { duels: 2, wins: 0, losses: 0, draws: 2 });
  for (const statistics of [
    { duels: 5, wins: 0, losses: 0, draws: 0 },
    { duels: 5, wins: 3, losses: 1, draws: 1 },
    { duels: 12, wins: 8, losses: 3, draws: 1 }
  ]) assert.deepEqual(normalizeDuelistAvatarStatistics(statistics), statistics);
});

test('normalization never fabricates completed Duels from results or malformed numbers', () => {
  for (const duels of [undefined, -1, 1.5, '30', NaN, Infinity, 1_000_001]) {
    const statistics = normalizeDuelistAvatarStatistics({ duels, wins: 30, losses: 30, draws: 30 });
    assert.deepEqual(statistics, { duels: 0, wins: 0, losses: 0, draws: 0 });
  }
  const source = { duels: 1_000_000, wins: 1_000_000, losses: 0, draws: 0 };
  assert.deepEqual(normalizeDuelistAvatarStatistics(source), source);
});

test('incoherent counters do not revoke avatars already acquired before a reset', () => {
  const earned = profile('zane', ['zane']);
  const context = { statistics: { duels: 0, wins: 30, losses: 0, draws: 0 } };
  const collected = collectDuelistAvatarUnlocks(earned, context);
  assert.deepEqual(collected.profile, earned);
  assert.deepEqual(collected.newlyUnlocked, []);
  assert.equal(selectDuelistAvatar(earned, 'zane', context).accepted, true);
  const state = getDuelistAvatarUnlockState('zane', { ...context, earnedAvatarIds: earned.earnedAvatarIds });
  assert.equal(state.current, 0);
  assert.equal(state.earned, true);
  assert.equal(state.unlocked, true);
});

test('symbol keys and non-enumerable getters are rejected without executing accessors', () => {
  let reads = 0;
  for (const key of [Symbol('unknown-data'), Symbol('getter'), 'extra']) {
    const raw = profile();
    Object.defineProperty(raw, key, { get() { reads += 1; throw new Error('Never execute imported data'); } });
    const validated = validateDuelistAvatarProfile(raw);
    assert.equal(validated.valid, false);
    assert.ok(validated.issues.includes('unknown-profile-field'));
    assert.ok(validated.issues.includes('non-data-profile-field'));
  }
  const raw = profile();
  raw[Symbol('data')] = 'unsupported';
  assert.equal(validateDuelistAvatarProfile(raw).valid, false);
  assert.equal(reads, 0);
});

test('revoked proxies are treated as invalid data throughout validation and progression', () => {
  const { proxy, revoke } = Proxy.revocable({}, {});
  const array = Proxy.revocable([], {});
  revoke(); array.revoke();
  assert.equal(validateDuelistAvatarProfile(proxy).valid, false);
  assert.equal(validateDuelistAvatarProfile(profile('yugi', array.proxy)).valid, false);
  assert.deepEqual(normalizeDuelistAvatarStatistics(proxy), { duels: 0, wins: 0, losses: 0, draws: 0 });
  assert.equal(getDuelistAvatarUnlockState('mokuba', { statistics: proxy, earnedAvatarIds: array.proxy }).unlocked, false);
  assert.deepEqual(collectDuelistAvatarUnlocks(profile(), { statistics: proxy, campaignProgress: proxy }).newlyUnlocked, []);
  assert.equal(mergeDuelistAvatarProfiles(profile(), proxy).accepted, false);
});

test('a valid cosmetic backup keeps both devices’ acquired avatars and its selected character', () => {
  const current = profile('mokuba', ['mokuba', 'mai']);
  const incoming = profile('zane', ['zane', 'mai']);
  const currentBefore = JSON.stringify(current);
  const incomingBefore = JSON.stringify(incoming);
  const result = mergeDuelistAvatarProfiles(current, JSON.stringify(incoming), {});
  assert.equal(result.accepted, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.profile.selectedAvatarId, 'zane');
  assert.deepEqual(new Set(result.profile.earnedAvatarIds), new Set(['mokuba', 'mai', 'zane']));
  assert.equal(validateDuelistAvatarProfile(result.profile).valid, true);
  assert.equal(JSON.stringify(current), currentBefore);
  assert.equal(JSON.stringify(incoming), incomingBefore);
  assert.equal(mergeDuelistAvatarProfiles(result.profile, incoming).profile.earnedAvatarIds.length, 3);
});

test('restoring an older starter backup preserves newer medals and locally earned unlocks', () => {
  const current = profile('zarc', ['zarc']);
  const incoming = profile('joey');
  const campaignProgress = createCampaignProgress();
  const statistics = { duels: 3, wins: 3, losses: 0, draws: 0 };
  const context = { statistics, campaignProgress };
  const before = JSON.stringify(context);
  const result = mergeDuelistAvatarProfiles(current, incoming, context);
  assert.equal(result.accepted, true);
  assert.equal(result.profile.selectedAvatarId, 'joey');
  assert.ok(result.profile.earnedAvatarIds.includes('zarc'));
  assert.ok(result.profile.earnedAvatarIds.includes('mokuba'));
  assert.ok(result.profile.earnedAvatarIds.includes('mai'));
  assert.equal(JSON.stringify(context), before);
});

test('invalid backups are refused atomically and retain the current selection and earned roster', () => {
  const current = profile('mokuba', ['mokuba', 'zarc']);
  const context = { statistics: { duels: 30, wins: 30, losses: 0, draws: 0 } };
  const before = JSON.stringify(current);
  for (const incoming of [
    null, undefined, '', '{', 'x'.repeat(64_001), [],
    { ...profile(), version: 2 },
    profile('missing'), profile('zane'),
    profile('yugi', ['missing']), profile('yugi', ['mokuba', 'mokuba']),
    { ...profile(), statistics: { duels: 1_000_000, wins: 1_000_000 } },
    JSON.parse('{"version":1,"selectedAvatarId":"yugi","earnedAvatarIds":[],"__proto__":{"polluted":true}}')
  ]) {
    const result = mergeDuelistAvatarProfiles(current, incoming, context);
    assert.equal(result.accepted, false);
    assert.deepEqual(result.profile, current);
    assert.ok(result.issues.length > 0);
  }
  assert.equal(JSON.stringify(current), before);
  assert.equal({}.polluted, undefined);
});

test('backup validation and merge never invoke getters or trust imported statistics', () => {
  let reads = 0;
  const incoming = profile();
  Object.defineProperty(incoming, 'statistics', { get() { reads += 1; throw new Error('Do not execute'); } });
  const result = mergeDuelistAvatarProfiles(profile('kaiba'), incoming, {});
  assert.equal(result.accepted, false);
  assert.equal(result.profile.selectedAvatarId, 'kaiba');
  assert.equal(reads, 0);
});
