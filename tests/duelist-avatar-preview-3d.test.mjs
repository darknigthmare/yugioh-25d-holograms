import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DuelistAvatarPreview3D } from '../src/ui/DuelistAvatarPreview3D.js';
import {
  DuelistAvatarPreviewLifecycle,
  normalizeAvatarPreviewAngle,
  getAvatarPreviewKeyAction,
  getAvatarPreviewDragRotation
} from '../src/ui/DuelistAvatarPreviewLifecycle.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const avatar = id => ({ id });
const host = id => ({ id, isConnected: true });

function previewSpy(name) {
  const calls = [];
  return {
    name, calls,
    setAvatar(id) { calls.push(['avatar', id]); },
    setVisible(value) { calls.push(['visible', value]); },
    rotateBy(delta) { calls.push(['rotate', delta]); },
    recenter() { calls.push(['recenter']); },
    dispose() { calls.push(['dispose']); }
  };
}

function callsOf(preview, type) { return preview.calls.filter(call => call[0] === type); }
async function flushMicrotasks() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

// Use the actual preview methods and actual scene/model geometry without a GPU.
// Constructor/WebGL creation is covered by the browser checks, not this fixture.
function renderingFixture({ hidden = false, reducedMotion = false } = {}) {
  const frames = new Map();
  let frameId = 0;
  const rendererCalls = [];
  const mount = { isConnected: true, clientWidth: 320, clientHeight: 400, dataset: {} };
  const document = { hidden };
  const window = {
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(handle) { frames.delete(handle); }
  };
  const preview = Object.assign(Object.create(DuelistAvatarPreview3D.prototype), {
    host: mount, document, window,
    disposed: false, visible: true, intersecting: true,
    frame: null, pointer: null, angle: 0, avatarId: null, model: null,
    elapsed: 0, previousTime: null, listeners: [],
    motionQuery: { matches: reducedMotion, removeEventListener() {} },
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(34, 1, .1, 80),
    floor: new THREE.Mesh(new THREE.CylinderGeometry(3, 3, .14, 8), new THREE.MeshStandardMaterial()),
    ring: new THREE.Mesh(new THREE.TorusGeometry(3, .02, 3, 8), new THREE.MeshBasicMaterial()),
    renderer: {
      domElement: { setAttribute() {}, remove() { rendererCalls.push(['remove']); } },
      setSize(width, height) { rendererCalls.push(['size', width, height]); },
      render(scene, camera) { rendererCalls.push(['render', scene, camera]); },
      dispose() { rendererCalls.push(['dispose']); },
      forceContextLoss() { rendererCalls.push(['context-loss']); }
    }
  });
  preview.scene.add(preview.floor, preview.ring);
  function frame(time) {
    assert.equal(frames.size, 1, 'one scheduled animation frame');
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback(time);
  }
  return { preview, mount, document, frames, rendererCalls, frame };
}

test('a lazy preview resolves once and shows the latest avatar requested in the same host', async () => {
  const gate = deferred();
  const mount = host('detail');
  const preview = previewSpy('shared');
  const creations = [];
  let loads = 0;
  const lifecycle = new DuelistAvatarPreviewLifecycle({
    loadPreview: () => { loads++; return gate.promise; }
  });
  assert.equal(loads, 0, 'a closed picker does not load or create WebGL');
  const first = lifecycle.show(avatar('yugi'), mount);
  const second = lifecycle.show(avatar('kaiba'), mount);
  const third = lifecycle.show(avatar('jaden'), mount);
  await flushMicrotasks();
  assert.equal(loads, 1);
  assert.equal(Boolean(lifecycle.pending), true);
  gate.resolve({ createDuelistAvatarPreview3D: (element, character) => {
    creations.push({ element, id: character.id });
    return preview;
  } });
  assert.deepEqual(await Promise.all([first, second, third]), [true, true, true]);
  assert.equal(creations.length, 1);
  assert.equal(creations[0].element, mount);
  assert.equal(creations[0].id, 'jaden');
  assert.equal(callsOf(preview, 'avatar').at(-1)?.[1], 'jaden');
  assert.equal(lifecycle.preview, preview);
  assert.equal(lifecycle.active, true);
  assert.equal(Boolean(lifecycle.pending), false);
  assert.equal(callsOf(preview, 'visible').at(-1)?.[1], true);
  lifecycle.dispose();
});

test('rerendering one host or changing its avatar retains the same renderer', async () => {
  const mount = host('persistent-detail');
  const preview = previewSpy('one-renderer');
  let creations = 0, loads = 0;
  const lifecycle = new DuelistAvatarPreviewLifecycle({
    loadPreview: async () => { loads++; return { createDuelistAvatarPreview3D: () => {
      creations++;
      return preview;
    } }; }
  });
  assert.equal(await lifecycle.show(avatar('yugi'), mount), true);
  assert.equal(await lifecycle.show(avatar('yugi'), mount), true);
  assert.equal(await lifecycle.show(avatar('kaiba'), mount), true);
  assert.equal(loads, 1);
  assert.equal(creations, 1);
  assert.equal(lifecycle.preview, preview);
  assert.equal(callsOf(preview, 'avatar').at(-1)?.[1], 'kaiba');
  assert.equal(callsOf(preview, 'dispose').length, 0);
  lifecycle.dispose();
  assert.equal(callsOf(preview, 'dispose').length, 1);
});

test('an avatar changed during asynchronous construction is applied before the preview becomes visible', async () => {
  const factoryGate = deferred();
  const preview = previewSpy('latest-during-factory');
  const mount = host('shared-during-factory');
  let creations = 0;
  const lifecycle = new DuelistAvatarPreviewLifecycle({
    loadPreview: async () => ({ createDuelistAvatarPreview3D: () => {
      creations++;
      return factoryGate.promise;
    } })
  });
  const first = lifecycle.show(avatar('yugi'), mount);
  await flushMicrotasks();
  assert.equal(creations, 1);
  const second = lifecycle.show(avatar('kaiba'), mount);
  factoryGate.resolve(preview);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(creations, 1);
  assert.deepEqual(preview.calls.slice(0, 2), [['avatar', 'kaiba'], ['visible', true]]);
  lifecycle.dispose();
});

test('closing while the module loads prevents the late result from constructing a renderer', async () => {
  const gate = deferred();
  let creations = 0;
  const lifecycle = new DuelistAvatarPreviewLifecycle({ loadPreview: () => gate.promise });
  const opening = lifecycle.show(avatar('yugi'), host('closed-detail'));
  lifecycle.hide();
  lifecycle.hide();
  assert.equal(lifecycle.active, false);
  gate.resolve({ createDuelistAvatarPreview3D: () => { creations++; return previewSpy('obsolete'); } });
  assert.equal(await opening, false);
  assert.equal(creations, 0);
  assert.equal(lifecycle.preview, null);
  assert.equal(Boolean(lifecycle.pending), false);
  lifecycle.dispose();
});

test('a preview finishing construction after close is disposed once and never displayed', async () => {
  const factoryGate = deferred();
  const preview = previewSpy('late-construction');
  let creations = 0;
  const lifecycle = new DuelistAvatarPreviewLifecycle({
    loadPreview: async () => ({ createDuelistAvatarPreview3D: () => { creations++; return factoryGate.promise; } })
  });
  const opening = lifecycle.show(avatar('yugi'), host('closing-detail'));
  await flushMicrotasks();
  assert.equal(creations, 1);
  lifecycle.hide();
  lifecycle.dispose();
  lifecycle.dispose();
  factoryGate.resolve(preview);
  assert.equal(await opening, false);
  assert.equal(callsOf(preview, 'dispose').length, 1);
  assert.equal(callsOf(preview, 'visible').some(call => call[1] === true), false);
  assert.equal(lifecycle.preview, null);
  assert.equal(lifecycle.disposed, true);
});

test('close then reopen while import is pending activates only the new host and avatar', async () => {
  const gate = deferred();
  const firstHost = host('first-open');
  const secondHost = host('second-open');
  const preview = previewSpy('reopened');
  const creations = [];
  const lifecycle = new DuelistAvatarPreviewLifecycle({ loadPreview: () => gate.promise });
  const first = lifecycle.show(avatar('yugi'), firstHost);
  lifecycle.hide();
  const second = lifecycle.show(avatar('jaden'), secondHost);
  gate.resolve({ createDuelistAvatarPreview3D: (element, character) => {
    creations.push({ element, id: character.id });
    return preview;
  } });
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.deepEqual(creations, [{ element: secondHost, id: 'jaden' }]);
  assert.equal(lifecycle.preview, preview);
  assert.equal(callsOf(preview, 'dispose').length, 0);
  lifecycle.dispose();
});

test('a stale factory result cannot dispose or replace the newer live preview', async () => {
  const oldGate = deferred();
  const oldPreview = previewSpy('old-host');
  const currentPreview = previewSpy('new-host');
  const oldHost = host('old-detail');
  const newHost = host('new-detail');
  let oldCreations = 0, currentCreations = 0;
  const lifecycle = new DuelistAvatarPreviewLifecycle({
    loadPreview: async () => ({ createDuelistAvatarPreview3D: element => {
      if (element === oldHost) { oldCreations++; return oldGate.promise; }
      assert.equal(element, newHost);
      currentCreations++;
      return currentPreview;
    } })
  });
  const oldOpening = lifecycle.show(avatar('yugi'), oldHost);
  await flushMicrotasks();
  assert.equal(oldCreations, 1);
  const currentOpening = lifecycle.show(avatar('kaiba'), newHost);
  assert.equal(await currentOpening, true);
  oldGate.resolve(oldPreview);
  assert.equal(await oldOpening, false);
  assert.equal(currentCreations, 1);
  assert.equal(lifecycle.preview, currentPreview);
  assert.equal(lifecycle.active, true);
  assert.equal(callsOf(oldPreview, 'dispose').length, 1);
  assert.equal(callsOf(oldPreview, 'visible').some(call => call[1] === true), false);
  assert.equal(callsOf(currentPreview, 'dispose').length, 0);
  lifecycle.dispose();
});

test('an inactive or disposed picker cannot start or complete a preview', async () => {
  const gate = deferred();
  let active = false, loads = 0, creations = 0;
  const lifecycle = new DuelistAvatarPreviewLifecycle({
    isActive: () => active,
    loadPreview: () => { loads++; return gate.promise; }
  });
  assert.equal(await lifecycle.show(avatar('yugi'), host('inactive')), false);
  assert.equal(loads, 0);
  active = true;
  const opening = lifecycle.show(avatar('kaiba'), host('became-inactive'));
  active = false;
  gate.resolve({ createDuelistAvatarPreview3D: () => { creations++; return previewSpy('must-not-live'); } });
  assert.equal(await opening, false);
  assert.equal(creations, 0);
  assert.equal(lifecycle.preview, null);
  lifecycle.dispose();
  active = true;
  assert.equal(await lifecycle.show(avatar('jaden'), host('disposed')), false);
  assert.equal(loads, 1);
});

test('a removed host prevents lazy mounting and disposes a preview whose construction was already pending', async () => {
  for (const removeAt of ['load', 'factory']) {
    const loadGate = deferred();
    const factoryGate = deferred();
    const mount = host(`removed-during-${removeAt}`);
    const preview = previewSpy('disconnected');
    let creations = 0;
    const module = { createDuelistAvatarPreview3D: () => { creations++; return factoryGate.promise; } };
    const lifecycle = new DuelistAvatarPreviewLifecycle({ loadPreview: () => loadGate.promise });
    const opening = lifecycle.show(avatar('yugi'), mount);
    if (removeAt === 'factory') {
      loadGate.resolve(module);
      await flushMicrotasks();
      assert.equal(creations, 1);
    }
    mount.isConnected = false;
    loadGate.resolve(module);
    factoryGate.resolve(preview);
    assert.equal(await opening, false);
    assert.equal(lifecycle.preview, null);
    assert.equal(creations, removeAt === 'load' ? 0 : 1);
    assert.equal(callsOf(preview, 'dispose').length, removeAt === 'load' ? 0 : 1);
    assert.equal(callsOf(preview, 'visible').some(call => call[1] === true), false);
    lifecycle.dispose();
  }
});

test('loader and construction errors are reported without rejected show promises and allow retry', async () => {
  for (const failAt of ['load', 'factory']) {
    const failure = new Error(`failure at ${failAt}`);
    const errors = [];
    const preview = previewSpy('retry');
    let first = true;
    const lifecycle = new DuelistAvatarPreviewLifecycle({
      onError: error => errors.push(error),
      loadPreview: async () => {
        if (failAt === 'load' && first) { first = false; throw failure; }
        return { createDuelistAvatarPreview3D: async () => {
          if (failAt === 'factory' && first) { first = false; throw failure; }
          return preview;
        } };
      }
    });
    const mount = host(`retry-${failAt}`);
    assert.equal(await lifecycle.show(avatar('yugi'), mount), false);
    assert.deepEqual(errors, [failure]);
    assert.equal(lifecycle.preview, null);
    assert.equal(Boolean(lifecycle.pending), false);
    assert.equal(await lifecycle.show(avatar('kaiba'), mount), true);
    assert.equal(lifecycle.preview, preview);
    lifecycle.dispose();
  }
});

test('synchronous loader and factory failures also clear the pending state before retry', async () => {
  for (const failAt of ['load', 'factory']) {
    const failure = new Error(`synchronous failure at ${failAt}`);
    const errors = [];
    const preview = previewSpy('retry-after-throw');
    let first = true;
    const lifecycle = new DuelistAvatarPreviewLifecycle({
      onError: error => errors.push(error),
      loadPreview: () => {
        if (failAt === 'load' && first) { first = false; throw failure; }
        return { createDuelistAvatarPreview3D: () => {
          if (failAt === 'factory' && first) { first = false; throw failure; }
          return preview;
        } };
      }
    });
    const mount = host(`synchronous-retry-${failAt}`);
    assert.equal(await lifecycle.show(avatar('yugi'), mount), false);
    assert.deepEqual(errors, [failure]);
    assert.equal(Boolean(lifecycle.pending), false);
    assert.equal(await lifecycle.show(avatar('kaiba'), mount), true);
    assert.equal(lifecycle.preview, preview);
    lifecycle.dispose();
  }
});

test('rotation and recentering reach only the current preview; repeated close disposes once', async () => {
  const preview = previewSpy('controls');
  const lifecycle = new DuelistAvatarPreviewLifecycle({
    loadPreview: async () => ({ createDuelistAvatarPreview3D: () => preview })
  });
  lifecycle.rotateBy(0.2);
  lifecycle.recenter();
  assert.equal(preview.calls.length, 0);
  assert.equal(await lifecycle.show(avatar('yugi'), host('controlled')), true);
  lifecycle.rotateBy(Math.PI / 8);
  lifecycle.recenter();
  assert.deepEqual(callsOf(preview, 'rotate'), [['rotate', Math.PI / 8]]);
  assert.deepEqual(callsOf(preview, 'recenter'), [['recenter']]);
  lifecycle.hide();
  lifecycle.hide();
  lifecycle.rotateBy(-Math.PI / 8);
  lifecycle.recenter();
  lifecycle.dispose();
  lifecycle.dispose();
  assert.equal(callsOf(preview, 'dispose').length, 1);
  assert.equal(callsOf(preview, 'rotate').length, 1);
  assert.equal(callsOf(preview, 'recenter').length, 1);
  assert.equal(lifecycle.preview, null);
});

test('keyboard rotation supports arrows and recentering without consuming unrelated controls', () => {
  assert.deepEqual(getAvatarPreviewKeyAction('ArrowLeft'), { type: 'rotate', delta: -Math.PI / 8 });
  assert.deepEqual(getAvatarPreviewKeyAction('ArrowRight'), { type: 'rotate', delta: Math.PI / 8 });
  assert.deepEqual(getAvatarPreviewKeyAction('Home'), { type: 'recenter' });
  for (const key of ['Tab', 'Escape', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'End', undefined, null]) {
    assert.equal(getAvatarPreviewKeyAction(key), null);
  }
});

test('drag rotation is signed, bounded and refuses non-finite pointer positions', () => {
  assert.equal(getAvatarPreviewDragRotation(10, 30), 0.24);
  assert.equal(getAvatarPreviewDragRotation(30, 10), -0.24);
  assert.equal(getAvatarPreviewDragRotation(42, 42), 0);
  assert.equal(getAvatarPreviewDragRotation(-5000, 5000), 160 * 0.012);
  assert.equal(getAvatarPreviewDragRotation(5000, -5000), -160 * 0.012);
  for (const invalid of [NaN, Infinity, -Infinity, undefined, null, '12']) {
    assert.equal(getAvatarPreviewDragRotation(invalid, 20), 0);
    assert.equal(getAvatarPreviewDragRotation(20, invalid), 0);
  }
});

test('angle normalization remains finite and bounded after long sessions or malformed input', () => {
  for (const value of [0, 0.2, -0.2, Math.PI, -Math.PI, Math.PI * 10001, -Math.PI * 10001, 1e12, -1e12]) {
    const result = normalizeAvatarPreviewAngle(value);
    assert.equal(Number.isFinite(result), true);
    assert.ok(result >= -Math.PI && result <= Math.PI);
    assert.ok(Math.abs(Math.sin(result) - Math.sin(value)) < (Math.abs(value) > 1e10 ? 0.0001 : 1e-10));
    assert.ok(Math.abs(Math.cos(result) - Math.cos(value)) < (Math.abs(value) > 1e10 ? 0.0001 : 1e-10));
  }
  for (const invalid of [NaN, Infinity, -Infinity, undefined, null, '12']) {
    assert.equal(normalizeAvatarPreviewAngle(invalid), 0);
  }
});

test('reduced-motion preview loaded in a hidden tab draws on return without starting an animation loop', () => {
  const { preview, document, frames, rendererCalls } = renderingFixture({ hidden: true, reducedMotion: true });
  assert.equal(preview.setAvatar('yugi'), true);
  preview._syncFrames();
  assert.equal(rendererCalls.filter(call => call[0] === 'render').length, 0);
  assert.equal(frames.size, 0);
  document.hidden = false;
  preview._onVisibilityChange();
  assert.equal(rendererCalls.filter(call => call[0] === 'render').length, 1,
    'visibility must draw once even when reduced motion suppresses RAF');
  assert.equal(frames.size, 0);
  assert.equal(preview.camera.aspect, 320 / 400);
  assert.equal(preview.model.avatarId, 'yugi');
  preview.dispose();
});

test('actual preview animation pauses on hide and resumes without adding background time', () => {
  const { preview, document, frames, frame } = renderingFixture();
  preview.setAvatar('jaden');
  preview.setVisible(true);
  assert.equal(frames.size, 1);
  preview.setVisible(true);
  assert.equal(frames.size, 1, 'repeated renders retain one scheduled RAF');
  frame(1000);
  frame(1016);
  assert.ok(Math.abs(preview.elapsed - .016) < 1e-10);
  document.hidden = true;
  preview._onVisibilityChange();
  assert.equal(frames.size, 0);
  const elapsed = preview.elapsed;
  document.hidden = false;
  preview._onVisibilityChange();
  frame(100000);
  assert.equal(preview.elapsed, elapsed, 'first resumed frame consumes no hidden-tab time');
  preview.setVisible(false);
  assert.equal(frames.size, 0);
  preview.setVisible(true);
  assert.equal(frames.size, 1);
  preview.motionQuery.matches = true;
  preview._syncFrames();
  assert.equal(frames.size, 0);
  preview.dispose();
});

test('actual preview disposal cancels RAF and releases models, GPU resources, observers and controls once', () => {
  const { preview, mount, frames, rendererCalls } = renderingFixture();
  preview.setAvatar('kaiba');
  preview.setVisible(true);
  const model = preview.model;
  const releases = [];
  const listenerTarget = {
    addEventListener(event, callback) { releases.push(['listen', event, callback]); },
    removeEventListener(event, callback) { releases.push(['unlisten', event, callback]); }
  };
  const listener = () => {};
  preview._listen(listenerTarget, 'pointermove', listener);
  preview.resizeObserver = { disconnect() { releases.push(['resize-disconnect']); } };
  preview.intersectionObserver = { disconnect() { releases.push(['intersection-disconnect']); } };
  preview.pointer = { id: 4, x: 10 };
  mount.releasePointerCapture = id => releases.push(['pointer-release', id]);
  const floor = preview.floor, ring = preview.ring;
  for (const [name, resource] of [['floor-geometry', floor.geometry], ['floor-material', floor.material],
    ['ring-geometry', ring.geometry], ['ring-material', ring.material]]) {
    resource.addEventListener('dispose', () => releases.push(['resource', name]));
  }
  const light = new THREE.DirectionalLight();
  const originalShadowDispose = light.shadow.dispose.bind(light.shadow);
  light.shadow.dispose = () => { releases.push(['shadow-dispose']); originalShadowDispose(); };
  preview.scene.add(light);
  assert.equal(frames.size, 1);
  preview.dispose();
  preview.dispose();
  preview.rotateBy(.2);
  preview.recenter();
  preview.render();
  preview._syncFrames();
  assert.equal(model.disposed, true);
  assert.equal(preview.model, null);
  assert.equal(preview.renderer, null);
  assert.equal(preview.scene.children.length, 0);
  assert.equal(frames.size, 0);
  assert.equal(preview.pointer, null);
  assert.equal(Object.hasOwn(mount.dataset, 'duelistAvatarAngle'), false);
  assert.equal(releases.filter(call => call[0] === 'unlisten').length, 1);
  assert.deepEqual(releases.find(call => call[0] === 'unlisten'), ['unlisten', 'pointermove', listener]);
  for (const action of ['resize-disconnect', 'intersection-disconnect', 'pointer-release', 'shadow-dispose']) {
    assert.equal(releases.filter(call => call[0] === action).length, 1, action);
  }
  assert.equal(releases.filter(call => call[0] === 'resource').length, 4);
  for (const action of ['dispose', 'context-loss', 'remove']) {
    assert.equal(rendererCalls.filter(call => call[0] === action).length, 1, action);
  }
});
