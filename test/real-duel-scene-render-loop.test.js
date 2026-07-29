import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera } from 'three';

import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';
import { resolveRealDuelCameraPose } from '../src/ui/RealDuelCameraPresets.js';

function createRafHarness({ reducedMotion = false } = {}) {
  let now = 0;
  let nextHandle = 1;
  let requestCount = 0;
  let cancelCount = 0;
  const callbacks = new Map();

  const windowRef = {
    performance: { now: () => now },
    matchMedia: () => ({ matches: reducedMotion }),
    requestAnimationFrame(callback) {
      const handle = nextHandle;
      nextHandle += 1;
      requestCount += 1;
      callbacks.set(handle, callback);
      return handle;
    },
    cancelAnimationFrame(handle) {
      cancelCount += 1;
      callbacks.delete(handle);
    }
  };

  return {
    windowRef,
    setNow(value) {
      now = value;
    },
    runNext(value) {
      now = value;
      const entry = callbacks.entries().next().value;
      assert.ok(entry, 'an animation frame must be pending');
      const [handle, callback] = entry;
      callbacks.delete(handle);
      callback(value);
    },
    get pendingCount() {
      return callbacks.size;
    },
    get requestCount() {
      return requestCount;
    },
    get cancelCount() {
      return cancelCount;
    }
  };
}

function createRenderableScene(options = {}) {
  const harness = createRafHarness(options);
  const documentRef = { hidden: false };
  let renderCount = 0;
  const scene = new RealDuelScene3D({
    documentRef,
    windowRef: harness.windowRef
  });
  scene.renderer = {
    render() {
      renderCount += 1;
    }
  };
  scene.scene = {};
  scene.camera = new PerspectiveCamera(42, 16 / 9, 0.1, 100);
  scene.root = {
    dataset: {},
    hidden: false,
    removeAttribute(name) {
      if (name === 'data-camera-transitioning') {
        delete this.dataset.cameraTransitioning;
      }
    }
  };
  scene._width = 1600;
  scene._height = 900;
  scene._applyCameraPose(resolveRealDuelCameraPose('player', 1600));
  scene.active = true;

  return {
    scene,
    harness,
    documentRef,
    getRenderCount: () => renderCount
  };
}

test('the static Real scene renders on demand without starting an idle RAF loop', () => {
  const fixture = createRenderableScene();

  assert.equal(fixture.scene.start(), true);
  assert.equal(fixture.getRenderCount(), 1);
  assert.equal(fixture.scene.running, false);
  assert.equal(fixture.harness.requestCount, 0);
  assert.equal(fixture.harness.pendingCount, 0);

  fixture.scene.updateEnvironment({ id: 'clearing' });
  assert.equal(fixture.getRenderCount(), 2);
  assert.equal(fixture.harness.requestCount, 0);
});

test('camera interpolation owns RAF only until its final rendered frame', () => {
  const fixture = createRenderableScene();
  let cameraUpdates = 0;
  fixture.scene.setCameraUpdateCallback(() => {
    cameraUpdates += 1;
  });

  fixture.scene.setCameraPreset('overview', { duration: 200 });
  assert.equal(fixture.scene.running, true);
  assert.equal(fixture.harness.pendingCount, 1);
  assert.equal(fixture.harness.requestCount, 1);

  fixture.harness.runNext(100);
  assert.equal(fixture.scene.running, true);
  assert.equal(fixture.harness.pendingCount, 1);

  fixture.harness.runNext(220);
  assert.equal(fixture.scene.running, false);
  assert.equal(fixture.harness.pendingCount, 0);
  assert.equal(cameraUpdates, 2);

  const overview = resolveRealDuelCameraPose('overview', 1600);
  assert.equal(fixture.scene.camera.fov, overview.fov);
  assert.deepEqual(
    fixture.scene.camera.position.toArray(),
    overview.position
  );
});

test('visibility pause freezes an in-flight camera transition before resuming it', () => {
  const fixture = createRenderableScene();

  fixture.scene.setCameraPreset('diagonal-left', { duration: 400 });
  fixture.harness.runNext(100);
  fixture.harness.setNow(100);
  fixture.documentRef.hidden = true;
  fixture.scene._boundVisibility();
  assert.equal(fixture.scene.running, false);
  assert.equal(fixture.harness.pendingCount, 0);
  assert.equal(fixture.scene._cameraTransition.pausedAt, 100);

  fixture.harness.setNow(1100);
  fixture.documentRef.hidden = false;
  fixture.scene._boundVisibility();
  assert.equal(fixture.scene.running, true);
  assert.equal(fixture.scene._cameraTransition.startedAt, 1000);
  assert.equal(fixture.harness.pendingCount, 1);

  fixture.harness.runNext(1100);
  assert.ok(fixture.scene._cameraTransition);
  fixture.harness.runNext(1410);
  assert.equal(fixture.scene._cameraTransition, null);
  assert.equal(fixture.scene.running, false);
  assert.equal(fixture.harness.pendingCount, 0);
});

test('continuous RAF is explicit and reduced motion applies camera poses immediately', () => {
  const animated = createRenderableScene();
  assert.equal(animated.scene.setAnimatedVisualsActive(true), true);
  assert.equal(animated.scene.running, true);
  assert.equal(animated.harness.pendingCount, 1);
  animated.harness.runNext(16);
  assert.equal(animated.harness.pendingCount, 1);

  assert.equal(animated.scene.setAnimatedVisualsActive(false), false);
  assert.equal(animated.scene.running, false);
  assert.equal(animated.harness.pendingCount, 0);
  assert.equal(animated.scene.deactivate(), true);
  assert.equal(animated.scene.root.hidden, true);

  const reduced = createRenderableScene({ reducedMotion: true });
  reduced.scene.setCameraPreset('console');
  assert.equal(reduced.scene.running, false);
  assert.equal(reduced.harness.requestCount, 0);
  assert.equal(
    reduced.scene.camera.fov,
    resolveRealDuelCameraPose('console', 1600).fov
  );
});
