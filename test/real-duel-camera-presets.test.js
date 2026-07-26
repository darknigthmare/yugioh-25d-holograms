import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REAL_DUEL_CAMERA_PRESET_IDS,
  REAL_DUEL_CAMERA_PRESETS,
  normalizeRealDuelCameraPreset,
  resolveRealDuelCameraPose
} from '../src/ui/RealDuelCameraPresets.js';

test('Real view exposes five immutable fixed camera presets', () => {
  assert.deepEqual(REAL_DUEL_CAMERA_PRESET_IDS, [
    'player',
    'diagonal-left',
    'diagonal-right',
    'console',
    'overview'
  ]);
  assert.equal(Object.isFrozen(REAL_DUEL_CAMERA_PRESET_IDS), true);
  for (const presetId of REAL_DUEL_CAMERA_PRESET_IDS) {
    assert.equal(Object.isFrozen(REAL_DUEL_CAMERA_PRESETS[presetId]), true);
    assert.ok(REAL_DUEL_CAMERA_PRESETS[presetId].accessibleLabel);
  }
});

test('unknown camera IDs safely fall back to the player view', () => {
  assert.equal(normalizeRealDuelCameraPreset('free-orbit'), 'player');
  assert.equal(
    normalizeRealDuelCameraPreset('free-orbit', 'overview'),
    'overview'
  );
  assert.equal(resolveRealDuelCameraPose('<unsafe>', 1920).presetId, 'player');
});

test('left and right diagonal views are exact responsive mirrors', () => {
  for (const width of [390, 900, 1920]) {
    const left = resolveRealDuelCameraPose('diagonal-left', width);
    const right = resolveRealDuelCameraPose('diagonal-right', width);
    assert.equal(left.position[0], -right.position[0]);
    assert.deepEqual(left.position.slice(1), right.position.slice(1));
    assert.deepEqual(left.target, right.target);
    assert.equal(left.fov, right.fov);
  }
});

test('camera poses adapt deterministically to desktop, tablet and mobile', () => {
  const desktop = resolveRealDuelCameraPose('overview', 1600);
  const tablet = resolveRealDuelCameraPose('overview', 900);
  const mobile = resolveRealDuelCameraPose('overview', 390);

  assert.equal(desktop.breakpoint, 'desktop');
  assert.equal(tablet.breakpoint, 'tablet');
  assert.equal(mobile.breakpoint, 'mobile');
  assert.ok(desktop.fov < tablet.fov);
  assert.ok(tablet.fov < mobile.fov);
  assert.ok(mobile.position[1] > desktop.position[1]);
  assert.equal(Object.isFrozen(mobile.position), true);
  assert.equal(Object.isFrozen(mobile.target), true);
});

test('console view targets the physical foreground console', () => {
  const consolePose = resolveRealDuelCameraPose('console', 1920);
  const playerPose = resolveRealDuelCameraPose('player', 1920);

  assert.ok(consolePose.target[2] > 7);
  assert.ok(consolePose.position[1] < playerPose.position[1]);
  assert.ok(consolePose.position[2] < playerPose.position[2]);
});
