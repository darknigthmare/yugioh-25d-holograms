import {
  DEFAULT_DUELIST_AVATAR_ID, DUELIST_AVATARS, getDuelistAvatar
} from './DuelistAvatarCatalog.js';
import { SOLO_CAMPAIGN_VERSION, SOLO_MISSIONS } from './SoloCampaign.js';

export const DUELIST_AVATAR_PROFILE_VERSION = 1;
const MAX_PROFILE_LENGTH = 64_000;
const MAX_STATISTIC = 1_000_000;
const PROFILE_KEYS = new Set(['version', 'selectedAvatarId', 'earnedAvatarIds']);
const missionById = new Map(SOLO_MISSIONS.map(mission => [mission.id, mission]));

function plainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  try { return [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
  catch { return false; }
}

// Imported profiles and contexts are data, not objects with executable getters.
// Read only own data properties; inherited properties never grant unlocks.
function ownData(value, key) {
  if (value === null || typeof value !== 'object') return undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
  } catch { return undefined; }
}

function boundedInteger(value, maximum = MAX_STATISTIC) {
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : 0;
}

function safeIds(value, issues = null) {
  const ids = [];
  if (!Array.isArray(value)) {
    if (issues) issues.push('invalid-earned-avatar-list');
    return ids;
  }
  const length = ownData(value, 'length');
  if (!Number.isSafeInteger(length) || length > DUELIST_AVATARS.length) {
    if (issues) issues.push('earned-avatar-list-too-large');
    return ids;
  }
  const seen = new Set();
  for (let index = 0; index < length; index += 1) {
    const id = ownData(value, String(index));
    if (typeof id !== 'string' || !getDuelistAvatar(id)) {
      if (issues) issues.push('unknown-earned-avatar');
      continue;
    }
    if (seen.has(id)) {
      if (issues) issues.push('duplicate-earned-avatar');
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function createDuelistAvatarProfile() {
  return {
    version: DUELIST_AVATAR_PROFILE_VERSION,
    selectedAvatarId: DEFAULT_DUELIST_AVATAR_ID,
    earnedAvatarIds: []
  };
}

/**
 * A profile can be stored as an object or a bounded JSON string. Invalid fields
 * are reported and repaired into a usable local profile. Selecting a nonstarter
 * must carry its previously collected ID, so a malformed import cannot select
 * an unknown or currently locked character. Local saves remain user editable;
 * this is validation and persistence, not account security or anti-cheat.
 */
export function validateDuelistAvatarProfile(raw) {
  const profile = createDuelistAvatarProfile();
  const issues = [];
  if (raw === null || raw === undefined) return { valid: true, profile, issues };
  if (typeof raw === 'string') {
    if (raw.length > MAX_PROFILE_LENGTH) {
      return { valid: false, profile, issues: ['profile-too-large'] };
    }
    try { raw = JSON.parse(raw); }
    catch { return { valid: false, profile, issues: ['invalid-json'] }; }
  }
  if (!plainObject(raw)) return { valid: false, profile, issues: ['invalid-profile-shape'] };
  if (ownData(raw, 'version') !== DUELIST_AVATAR_PROFILE_VERSION) {
    return { valid: false, profile, issues: ['unsupported-profile-version'] };
  }
  let keys;
  try { keys = Object.getOwnPropertyNames(raw); }
  catch { return { valid: false, profile, issues: ['invalid-profile-shape'] }; }
  if (keys.some(key => !PROFILE_KEYS.has(key))) issues.push('unknown-profile-field');
  try {
    if (keys.some(key => {
      const descriptor = Object.getOwnPropertyDescriptor(raw, key);
      return !descriptor || !Object.hasOwn(descriptor, 'value');
    })) issues.push('non-data-profile-field');
  } catch { return { valid: false, profile, issues: ['invalid-profile-shape'] }; }
  profile.earnedAvatarIds = safeIds(ownData(raw, 'earnedAvatarIds'), issues);
  const selected = getDuelistAvatar(ownData(raw, 'selectedAvatarId'));
  if (!selected) issues.push('unknown-selected-avatar');
  else if (selected.unlock.type !== 'starter' && !profile.earnedAvatarIds.includes(selected.id)) {
    issues.push('selected-avatar-not-earned');
  } else profile.selectedAvatarId = selected.id;
  return { valid: issues.length === 0, profile, issues: [...new Set(issues)] };
}

function statisticsOf(context) {
  const value = ownData(context, 'statistics');
  if (!plainObject(value)) return { duels: 0, wins: 0, losses: 0, draws: 0 };
  return Object.fromEntries(['duels', 'wins', 'losses', 'draws'].map(key =>
    [key, boundedInteger(ownData(value, key))]));
}

function campaignOf(context) {
  const progress = ownData(context, 'campaignProgress');
  const missions = plainObject(progress) ? ownData(progress, 'missions') : null;
  const completedMissionIds = new Set();
  let medals = 0;
  if (ownData(progress, 'version') !== SOLO_CAMPAIGN_VERSION || !plainObject(missions)) {
    return { medals, completedMissionIds };
  }
  // Only the twelve actual campaign missions contribute, each at most once.
  // A recorded medal requires at least one completed win and a sane attempt
  // counter, and the preceding mission must already have been completed.
  for (const mission of SOLO_MISSIONS) {
    const entry = ownData(missions, mission.id);
    if (!plainObject(entry)) continue;
    const attempts = boundedInteger(ownData(entry, 'attempts'));
    const wins = boundedInteger(ownData(entry, 'wins'));
    const bestMedal = boundedInteger(ownData(entry, 'bestMedal'), 3);
    if (wins < 1 || attempts < wins || bestMedal < 1) continue;
    if (mission.unlocksAfter && !completedMissionIds.has(mission.unlocksAfter)) continue;
    completedMissionIds.add(mission.id);
    medals += bestMedal;
  }
  return { medals, completedMissionIds };
}

function conditionOf(avatar, context) {
  const condition = avatar.unlock;
  if (condition.type === 'starter') {
    return { met: true, current: 0, target: 0,
      conditionLabel: 'Disponible dès le départ', progressLabel: 'Disponible' };
  }
  if (condition.type === 'mission') {
    const mission = missionById.get(condition.missionId);
    const complete = campaignOf(context).completedMissionIds.has(condition.missionId);
    return { met: complete, current: complete ? 1 : 0, target: 1,
      conditionLabel: `Terminer « ${mission?.title || condition.missionId} »`,
      progressLabel: complete ? 'Mission terminée' : 'Mission à terminer' };
  }
  const target = condition.target;
  const current = condition.type === 'medals' ? campaignOf(context).medals
    : statisticsOf(context)[condition.type] || 0;
  const word = condition.type === 'wins' ? 'victoire' : condition.type === 'duels' ? 'duel' : 'médaille';
  const noun = `${word}${target > 1 ? 's' : ''}`;
  return { met: current >= target, current, target,
    conditionLabel: `${target} ${noun}${condition.type === 'medals' ? ' de campagne' : ''}`,
    progressLabel: `${Math.min(current, target)} / ${target} ${noun}` };
}

function canonicalAvatar(avatarOrId) {
  return getDuelistAvatar(typeof avatarOrId === 'string' ? avatarOrId : ownData(avatarOrId, 'id'));
}

/** Additional numeric fields support a progress bar without parsing labels. */
export function getDuelistAvatarUnlockState(avatarOrId, context = {}) {
  const avatar = canonicalAvatar(avatarOrId);
  if (!avatar) return { unlocked: false, earned: false,
    conditionLabel: 'Avatar inconnu', progressLabel: 'Indisponible',
    current: 0, target: 0, progressRatio: 0 };
  const earned = safeIds(ownData(context, 'earnedAvatarIds')).includes(avatar.id);
  const condition = conditionOf(avatar, context);
  const unlocked = earned || condition.met;
  return {
    unlocked, earned,
    conditionLabel: condition.conditionLabel,
    progressLabel: earned && avatar.unlock.type !== 'starter' ? 'Acquis définitivement' : condition.progressLabel,
    current: condition.current, target: condition.target,
    progressRatio: unlocked ? 1 : Math.min(1, condition.current / condition.target)
  };
}

/**
 * Pure derivation: this module never increments Duel counters or medals. Repeated
 * rendering/reloading cannot earn the same avatar twice. Collected IDs remain
 * earned if campaign progress or statistics are subsequently reset.
 */
export function collectDuelistAvatarUnlocks(rawProfile, context = {}) {
  const profile = validateDuelistAvatarProfile(rawProfile).profile;
  const original = new Set(profile.earnedAvatarIds);
  const acquired = new Set([...profile.earnedAvatarIds, ...safeIds(ownData(context, 'earnedAvatarIds'))]);
  const newlyUnlocked = [];
  for (const avatar of DUELIST_AVATARS) {
    if (avatar.unlock.type === 'starter') continue;
    if (acquired.has(avatar.id) || conditionOf(avatar, context).met) {
      acquired.add(avatar.id);
      if (!original.has(avatar.id)) newlyUnlocked.push(avatar.id);
    }
  }
  // Canonical roster order makes repeated JSON saves stable.
  profile.earnedAvatarIds = DUELIST_AVATARS.filter(avatar => acquired.has(avatar.id)).map(avatar => avatar.id);
  return { profile, newlyUnlocked };
}

/** Collect current achievements before checking a requested selection. */
export function selectDuelistAvatar(rawProfile, id, context = {}) {
  const { profile } = collectDuelistAvatarUnlocks(rawProfile, context);
  const avatar = getDuelistAvatar(id);
  if (!avatar) return { accepted: false, profile, reason: 'unknown-avatar' };
  if (avatar.unlock.type !== 'starter' && !profile.earnedAvatarIds.includes(id)) {
    return { accepted: false, profile, reason: 'avatar-locked' };
  }
  return { accepted: true, profile: { ...profile, selectedAvatarId: id }, reason: null };
}
