import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Texture, Vector3 } from 'three';

import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

const PLAYER_CONSOLE_PLAYMAT_URL =
  '/playmats/player-console-playmat-original.webp';
const PLAYER_CONSOLE_PLAYMAT_PATH = fileURLToPath(
  new URL(`../public${PLAYER_CONSOLE_PLAYMAT_URL}`, import.meta.url)
);

function createTextureHarness({ fail = false } = {}) {
  const requestedUrls = [];
  const texture = new Texture();
  let disposals = 0;
  texture.dispose = () => {
    disposals += 1;
  };

  const loader = {
    load(url, onLoad, _onProgress, onError) {
      requestedUrls.push(url);
      if (fail) {
        onError?.(new Error('Synthetic playmat load failure'));
        return undefined;
      }
      onLoad?.(texture);
      return texture;
    },
    async loadAsync(url) {
      requestedUrls.push(url);
      if (fail) throw new Error('Synthetic playmat load failure');
      return texture;
    }
  };

  return {
    loader,
    requestedUrls,
    texture,
    getDisposals: () => disposals
  };
}

function createDeferredTextureHarness() {
  const requestedUrls = [];
  const texture = new Texture();
  let completeLoad = null;
  let disposals = 0;
  texture.dispose = () => {
    disposals += 1;
  };

  return {
    loader: {
      load(url, onLoad) {
        requestedUrls.push(url);
        completeLoad = () => onLoad?.(texture);
        return undefined;
      }
    },
    requestedUrls,
    completeLoad: () => completeLoad?.(),
    getDisposals: () => disposals
  };
}

function createScene(harness) {
  const scene = new RealDuelScene3D({
    documentRef: null,
    windowRef: null,
    textureLoaderFactory: () => harness.loader
  });
  scene._createScene();
  scene.scene.updateMatrixWorld(true);
  return scene;
}

function assertNear(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 0.001,
    `${message}: expected ${expected}, received ${actual}`
  );
}

test('the original player-console playmat is a valid same-origin WebP asset', async () => {
  assert.match(
    PLAYER_CONSOLE_PLAYMAT_URL,
    /^\/playmats\/[a-z0-9-]+-original\.webp$/
  );
  assert.equal(PLAYER_CONSOLE_PLAYMAT_URL.includes('://'), false);
  assert.equal(PLAYER_CONSOLE_PLAYMAT_URL.includes('/cards/'), false);

  const details = await stat(PLAYER_CONSOLE_PLAYMAT_PATH);
  assert.ok(details.isFile());
  assert.ok(details.size > 5_000, 'the generated playmat is unexpectedly small');

  const bytes = await readFile(PLAYER_CONSOLE_PLAYMAT_PATH);
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
});

test('the player console owns one wide rectangular playmat and matching frame', () => {
  const harness = createTextureHarness();
  const scene = createScene(harness);

  const consoleGroup = scene.scene.getObjectByName('player-console');
  const playmat = scene.scene.getObjectByName('player-console-playmat');
  const frame = scene.scene.getObjectByName('player-console-playmat-frame');
  assert.ok(consoleGroup, 'the physical player console must remain present');
  assert.ok(playmat, 'the player console must expose its playmat mesh');
  assert.ok(frame, 'the playmat must have a physical console frame');
  assert.equal(playmat.parent, consoleGroup);
  assert.equal(frame.parent, consoleGroup);
  assert.equal(
    scene.scene.getObjectsByProperty('name', 'player-console-playmat').length,
    1
  );

  assertNear(playmat.geometry.parameters.width, 11.4, 'playmat width');
  assertNear(playmat.geometry.parameters.depth, 3.8, 'playmat depth');
  assert.ok(
    playmat.geometry.parameters.width / playmat.geometry.parameters.depth >= 3,
    'the mat must read as the wide rectangular anime console surface'
  );
  assertNear(frame.geometry.parameters.width, 12, 'frame width');
  assertNear(frame.geometry.parameters.depth, 4, 'frame depth');

  const worldPosition = playmat.getWorldPosition(new Vector3());
  assertNear(worldPosition.x, 0, 'playmat world x');
  assertNear(worldPosition.y, 1.45, 'playmat world y');
  assertNear(worldPosition.z, 11.2, 'playmat world z');
  assertNear(playmat.rotation.x, 0.3, 'playmat console tilt');
  assert.equal(playmat.material.map, harness.texture);
  assert.deepEqual(harness.requestedUrls, [PLAYER_CONSOLE_PLAYMAT_URL]);

  scene.dispose();
  assert.equal(harness.getDisposals(), 1);
});

test('a failed playmat texture keeps the physical fallback and leaks no card identity', async () => {
  const harness = createTextureHarness({ fail: true });
  const scene = createScene(harness);
  await Promise.resolve();

  const playmat = scene.scene.getObjectByName('player-console-playmat');
  assert.ok(playmat);
  assert.equal(playmat.visible, true);
  assert.equal(playmat.material.map, null);
  assert.ok(playmat.material.color, 'the fallback must keep a colored material');

  scene.updatePublicSummary({
    opponentHandCount: 2,
    duelEnded: false,
    hiddenCardId: '89631139',
    hiddenCardUid: 'private-blue-eyes'
  });
  assert.deepEqual(harness.requestedUrls, [PLAYER_CONSOLE_PLAYMAT_URL]);
  assert.equal(JSON.stringify(harness.requestedUrls).includes('89631139'), false);
  assert.equal(JSON.stringify(harness.requestedUrls).includes('private'), false);

  scene.dispose();
  assert.equal(harness.getDisposals(), 0);
});

test('a playmat completing after scene disposal is immediately released', () => {
  const harness = createDeferredTextureHarness();
  const scene = createScene(harness);
  assert.deepEqual(harness.requestedUrls, [PLAYER_CONSOLE_PLAYMAT_URL]);

  scene.dispose();
  assert.equal(harness.getDisposals(), 0);
  harness.completeLoad();
  assert.equal(harness.getDisposals(), 1);
});
