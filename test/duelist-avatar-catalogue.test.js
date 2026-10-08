import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DUELIST_SERIES, DUELIST_AVATARS, DEFAULT_DUELIST_AVATAR_ID, getDuelistAvatar
} from '../src/content/DuelistAvatarCatalog.js';
import { SOLO_MISSIONS } from '../src/content/SoloCampaign.js';

test('the curated 192-appearance roster names all eight series without duplicate identities', () => {
  assert.equal(DUELIST_AVATARS.length, 192);
  assert.equal(new Set(DUELIST_AVATARS.map(avatar => avatar.id)).size, 192);
  const expected = { dm: 28, gx: 28, '5ds': 24, zexal: 24, 'arc-v': 28, vrains: 20, sevens: 20, 'go-rush': 20 };
  assert.equal(DUELIST_SERIES.length, 8);
  for (const series of DUELIST_SERIES) {
    assert.equal(DUELIST_AVATARS.filter(avatar => avatar.seriesId === series.id).length, expected[series.id]);
    assert.ok(series.label.length > 1);
  }
  for (const avatar of DUELIST_AVATARS) {
    assert.match(avatar.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(avatar.name.length >= 2); // The canonical Ignis name "Ai" is two characters.
    assert.ok(avatar.description.length > 25);
    assert.ok(avatar.aliases.every(alias => typeof alias === 'string' && alias.length > 0));
    assert.equal(getDuelistAvatar(avatar.id), avatar);
  }
});

test('every appearance contains safe structural model data with bounded dimensions and no executable markup', () => {
  const hair = new Set(['star', 'swept', 'short', 'bob', 'long', 'ponytail', 'twin-tail', 'braided', 'mohawk', 'bald', 'helmet']);
  const outfits = new Set(['school', 'long-coat', 'jacket', 'uniform', 'dress', 'robe', 'armor', 'sport', 'suit', 'mechanical']);
  const accessories = new Set(['none', 'puzzle', 'headband', 'goggles', 'cape', 'hat', 'glasses', 'necklace', 'mask', 'scarf', 'wings', 'earpiece', 'staff']);
  const structuralProfiles = new Set();
  for (const { visual } of DUELIST_AVATARS) {
    assert.equal(hair.has(visual.hairStyle), true);
    assert.equal(outfits.has(visual.outfitStyle), true);
    assert.equal(accessories.has(visual.accessory), true);
    for (const key of ['hairColor', 'hairAccent', 'skinColor', 'outfitColor', 'accentColor']) assert.match(visual[key], /^#[0-9a-fA-F]{6}$/);
    assert.ok(visual.height >= 0.85 && visual.height <= 1.25);
    assert.ok(['slim', 'average', 'broad'].includes(visual.build));
    assert.ok(['ready', 'confident', 'calm', 'energetic'].includes(visual.pose));
    assert.ok(Number.isInteger(visual.variant) && visual.variant >= 0 && visual.variant <= 15);
    structuralProfiles.add([visual.hairStyle, visual.outfitStyle, visual.accessory, visual.height, visual.build, visual.pose, visual.variant].join('|'));
  }
  // Variation changes silhouettes and proportions even when colours are ignored.
  assert.ok(structuralProfiles.size >= 180, `Only ${structuralProfiles.size} structural appearances`);
});

test('starters cover the eight heroes plus Kaiba, Joey and Téa', () => {
  const starterIds = DUELIST_AVATARS.filter(avatar => avatar.unlock.type === 'starter').map(avatar => avatar.id);
  assert.deepEqual(new Set(starterIds), new Set(['yugi', 'kaiba', 'joey', 'tea', 'jaden', 'yusei', 'yuma', 'yuya', 'playmaker', 'yuga', 'yudias']));
  assert.equal(DEFAULT_DUELIST_AVATAR_ID, 'yugi');
  for (const [id, alias] of [['joey', 'Katsuya Jonouchi'], ['tea', 'Anzu Mazaki'], ['jaden', 'Judai Yuki'], ['playmaker', 'Yusaku Fujiki'], ['varis', 'Revolver']]) {
    assert.equal(getDuelistAvatar(id).aliases.includes(alias), true);
  }
});

test('emblematic characters retain intentional hair, costume, accessory and stature differences', () => {
  assert.equal(getDuelistAvatar('yugi').visual.hairStyle, 'star');
  assert.equal(getDuelistAvatar('yugi').visual.accessory, 'puzzle');
  assert.notEqual(getDuelistAvatar('yugi').visual.hairColor, getDuelistAvatar('yugi').visual.hairAccent);
  assert.equal(getDuelistAvatar('kaiba').visual.outfitStyle, 'long-coat');
  assert.ok(getDuelistAvatar('kaiba').visual.height > getDuelistAvatar('mokuba').visual.height);
  assert.equal(getDuelistAvatar('joey').visual.hairStyle, 'swept');
  assert.equal(getDuelistAvatar('pegasus').visual.hairStyle, 'long');
  assert.equal(getDuelistAvatar('yuma').visual.accessory, 'goggles');
  assert.equal(getDuelistAvatar('yubel').visual.accessory, 'wings');
  assert.equal(getDuelistAvatar('crow').visual.hairStyle, 'mohawk');
  assert.equal(getDuelistAvatar('duke').visual.hairStyle, 'ponytail');
  assert.equal(getDuelistAvatar('astral').visual.hairStyle, 'bald');
  assert.equal(getDuelistAvatar('astral').visual.outfitStyle, 'mechanical');
  for (const id of ['tea', 'alexis', 'tori', 'zuzu', 'lulu', 'romin']) assert.equal(getDuelistAvatar(id).visual.outfitStyle, 'dress');
});

test('all unlocks use attainable counters and actual campaign missions', () => {
  const missionIds = new Set(SOLO_MISSIONS.map(mission => mission.id));
  for (const { unlock } of DUELIST_AVATARS) {
    assert.ok(['starter', 'wins', 'duels', 'medals', 'mission'].includes(unlock.type));
    if (unlock.type === 'mission') assert.equal(missionIds.has(unlock.missionId), true);
    if (['wins', 'duels', 'medals'].includes(unlock.type)) {
      assert.ok(Number.isSafeInteger(unlock.target) && unlock.target > 0);
      assert.ok(unlock.target <= (unlock.type === 'medals' ? SOLO_MISSIONS.length * 3 : 30));
    }
  }
  assert.equal(getDuelistAvatar('zarc').unlock.target, 36);
});

test('catalogue data is deeply immutable and unknown lookups never silently choose a starter', () => {
  for (const value of [DUELIST_SERIES, DUELIST_SERIES[0], DUELIST_AVATARS, getDuelistAvatar('yugi'), getDuelistAvatar('yugi').visual, getDuelistAvatar('yugi').unlock, getDuelistAvatar('yugi').aliases]) {
    assert.equal(Object.isFrozen(value), true);
  }
  assert.throws(() => { getDuelistAvatar('kaiba').visual.height = 9; }, TypeError);
  assert.throws(() => { getDuelistAvatar('yugi').aliases.push('Fake'); }, TypeError);
  for (const id of ['missing', '__proto__', 'constructor', 'prototype', '', null, undefined, 1, { id: 'yugi' }]) assert.equal(getDuelistAvatar(id), null);
});
