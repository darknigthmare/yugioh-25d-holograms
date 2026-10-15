import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Vector3, Vector4 } from 'three';
import {
  createRealDuelBackdropProjection,
  resolveRealDuelBackdropPlane
} from '../src/ui/RealDuelBackdropProjection.js';
import {
  REAL_DUEL_CAMERA_PRESET_IDS,
  resolveRealDuelCameraPose
} from '../src/ui/RealDuelCameraPresets.js';

function cameraFor(presetId, width, height) {
  const pose = resolveRealDuelCameraPose(presetId, width);
  const camera = new PerspectiveCamera(pose.fov, width / height, 0.1, 120);
  camera.position.set(...pose.position);
  camera.lookAt(new Vector3(...pose.target));
  camera.updateMatrixWorld();
  return camera;
}

function screenPoint(matrix, x, y) {
  const point = new Vector4(x, y, 0, 1).applyMatrix4(matrix);
  return [point.x / point.w, point.y / point.w];
}

function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${label}: ${actual} / ${expected}`);
}

test('scenic painting corners use the same projection as WebGL in all camera presets and viewport shapes', () => {
  for (const [width, height] of [[1440, 800], [900, 650], [390, 660]]) {
    for (const presetId of REAL_DUEL_CAMERA_PRESET_IDS) {
      for (const fit of ['contain', 'cover']) {
        const camera = cameraFor(presetId, width, height);
        const projection = createRealDuelBackdropProjection(camera, width, height, fit);
        assert.ok(projection.matrix.elements.every(Number.isFinite));
        assert.ok(projection.matrix.determinant() > 0, 'CSS must have an invertible front-facing transform');
        assert.deepEqual(
          [projection.matrix.elements[2], projection.matrix.elements[6], projection.matrix.elements[10], projection.matrix.elements[14]],
          [0, 0, 1, 0],
          'unused CSS depth must not carry WebGL clipping or flip the image face'
        );
        for (const [x, y] of [[0, 0], [width, 0], [width, height], [0, height], [width / 2, height / 2]]) {
          const worldPoint = new Vector3(x, y, 0).applyMatrix4(projection.worldMatrix);
          const clipPoint = worldPoint.project(camera);
          const cssPoint = screenPoint(projection.matrix, x, y);
          close(cssPoint[0], (clipPoint.x + 1) * width / 2, `${presetId} horizontal`);
          close(cssPoint[1], (1 - clipPoint.y) * height / 2, `${presetId} vertical`);
        }
      }
    }
  }
});

test('reference art is framed whole in player view without changing its aspect', () => {
  for (const [width, height] of [[1440, 800], [900, 650], [390, 660]]) {
    const camera = cameraFor('player', width, height);
    const projection = createRealDuelBackdropProjection(camera, width, height, 'contain');
    const topLeft = screenPoint(projection.matrix, 0, 0);
    const bottomRight = screenPoint(projection.matrix, width, height);
    close(topLeft[0], width * 0.03, 'left inset');
    close(topLeft[1], height * 0.03, 'top inset');
    close(bottomRight[0], width * 0.97, 'right inset');
    close(bottomRight[1], height * 0.97, 'bottom inset');
    close((bottomRight[0] - topLeft[0]) / (bottomRight[1] - topLeft[1]), width / height, 'aspect ratio');
  }
});

test('changing the duel camera changes perspective while the scenic plane remains fixed in the world', () => {
  const player = createRealDuelBackdropProjection(cameraFor('player', 1440, 800), 1440, 800);
  const diagonal = createRealDuelBackdropProjection(cameraFor('diagonal-left', 1440, 800), 1440, 800);
  assert.deepEqual(player.worldMatrix.elements, diagonal.worldMatrix.elements);
  assert.notEqual(player.transform, diagonal.transform);
  assert.ok(Math.abs(diagonal.matrix.elements[3]) > 1e-7, 'depth must vary across a diagonal image');
  const p = screenPoint(diagonal.matrix, 0, 0);
  const q = screenPoint(diagonal.matrix, 1440, 0);
  assert.ok(Math.abs(q[1] - p[1]) > 10, 'the painting must not stay level with the screen');
});

test('camera interpolation projects current matrices immediately without a second CSS animation', () => {
  const camera = cameraFor('player', 1440, 800);
  const before = createRealDuelBackdropProjection(camera, 1440, 800);
  camera.position.lerp(new Vector3(-12.5, 15.5, 25), 0.5);
  camera.lookAt(0, 0.4, -0.25);
  camera.fov = 37.5;
  camera.updateProjectionMatrix();
  const midway = createRealDuelBackdropProjection(camera, 1440, 800);
  const after = createRealDuelBackdropProjection(cameraFor('diagonal-left', 1440, 800), 1440, 800);
  assert.notEqual(before.transform, midway.transform);
  assert.notEqual(midway.transform, after.transform);
});

test('invalid or DOM-only cameras retain the unprojected fallback', () => {
  assert.equal(createRealDuelBackdropProjection(null, 1440, 800), null);
  assert.equal(createRealDuelBackdropProjection({ isPerspectiveCamera: true }, 1440, 800), null);
  assert.throws(() => resolveRealDuelBackdropPlane(0, 800), RangeError);
  assert.throws(() => resolveRealDuelBackdropPlane(1440, NaN), RangeError);
});
