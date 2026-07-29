import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Box3, Texture, Vector3 } from 'three';

import {
  FIELD_ENVIRONMENT_REGISTRY,
  getFieldEnvironmentForCardId,
  resolveFieldEnvironmentSelection
} from '../src/ui/FieldEnvironmentRegistry.js';
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

function getTerrainSurfaces(scene) {
  const playmat = scene.scene.getObjectByName('player-console-playmat');
  const arenaSurface = scene.scene.getObjectByName('arena-platform-surface');
  assert.ok(playmat, 'the player-console playmat surface must remain present');
  assert.ok(arenaSurface, 'the central arena must expose its terrain surface');
  return { playmat, arenaSurface };
}

function materialSignature(material) {
  return {
    color: material.color?.getHexString?.() || null,
    emissive: material.emissive?.getHexString?.() || null,
    emissiveIntensity: material.emissiveIntensity ?? null,
    metalness: material.metalness ?? null,
    roughness: material.roughness ?? null
  };
}

function activeFieldCard(id, sequence = 1, extra = {}) {
  return {
    id,
    uid: `field-${id}-${sequence}`,
    card_type: 'spell',
    type: 'Field Spell',
    race: 'Field',
    isFieldSpell: true,
    location: 'field_zone',
    fieldActivationSequence: sequence,
    ...extra
  };
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
  const opponent = scene.scene.getObjectByName('opponent-character');
  const opponentConsole = scene.scene.getObjectByName('opponent-console');
  const playmat = scene.scene.getObjectByName('player-console-playmat');
  const frame = scene.scene.getObjectByName('player-console-playmat-frame');
  assert.ok(consoleGroup, 'the physical player console must remain present');
  assert.ok(opponent, 'the opposing duelist must remain visible at the far end');
  assert.ok(
    opponentConsole,
    'the opposing duelist must own a perspective console at the far end'
  );
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

test('the opponent console stays behind the arena, mirrored and public-only', () => {
  const harness = createTextureHarness();
  const scene = createScene(harness);

  const playerConsole = scene.scene.getObjectByName('player-console');
  const opponentConsole = scene.scene.getObjectByName('opponent-console');
  const opponentShell = scene.scene.getObjectByName('opponent-console-shell');
  const opponentPanel = scene.scene.getObjectByName(
    'opponent-console-public-panel'
  );
  const opponentDisplay = scene.scene.getObjectByName(
    'opponent-console-display'
  );
  const opponentTerminal = scene.scene.getObjectByName(
    'opponent-console-terminal-column'
  );
  const opponentTerminalFrame = scene.scene.getObjectByName(
    'opponent-console-terminal-frame'
  );
  const opponentTerminalDisplay = scene.scene.getObjectByName(
    'opponent-console-terminal-public-display'
  );
  const opponent = scene.scene.getObjectByName('opponent-character');

  assert.ok(playerConsole);
  assert.ok(opponentConsole);
  assert.ok(opponentShell);
  assert.ok(opponentPanel);
  assert.ok(opponentDisplay);
  assert.ok(opponentTerminal);
  assert.ok(opponentTerminalFrame);
  assert.ok(opponentTerminalDisplay);
  assert.ok(opponent);
  assert.equal(opponentConsole.parent, scene.scene);
  assert.equal(opponentShell.parent, opponentConsole);
  assert.equal(opponentPanel.parent, opponentConsole);
  assert.equal(opponentDisplay.parent, opponentConsole);
  assert.equal(opponentTerminal.parent, opponentConsole);
  assert.equal(opponentTerminalFrame.parent, opponentConsole);
  assert.equal(opponentTerminalDisplay.parent, opponentConsole);
  assert.equal(
    scene.scene.getObjectsByProperty('name', 'opponent-console').length,
    1
  );

  assertNear(opponentConsole.position.x, 0, 'opponent console x');
  assertNear(opponentConsole.position.z, -12.05, 'opponent console z');
  assertNear(opponentConsole.rotation.y, Math.PI, 'opponent console facing');
  assertNear(opponentConsole.scale.x, 0.88, 'opponent console scale x');
  assertNear(opponentConsole.scale.y, 0.88, 'opponent console scale y');
  assertNear(opponentConsole.scale.z, 0.88, 'opponent console scale z');
  assert.ok(
    opponentConsole.position.z < -10.18,
    'the console must sit beyond the arena far rail'
  );
  assert.ok(
    opponentConsole.position.z > opponent.position.z,
    'the console must remain between the arena and the opposing duelist'
  );
  assert.equal(opponentConsole.userData.visibility, 'public-only');

  const playerBounds = new Box3().setFromObject(playerConsole);
  const opponentBounds = new Box3().setFromObject(opponentConsole);
  const playerSize = playerBounds.getSize(new Vector3());
  const opponentSize = opponentBounds.getSize(new Vector3());
  assert.ok(
    opponentSize.x < playerSize.x,
    'perspective must keep the far console narrower than the player console'
  );
  assert.ok(
    opponentSize.z < playerSize.z,
    'perspective must keep the far console shallower than the player console'
  );

  const exposedOpponentGeometry = [];
  opponentConsole.traverse(object => {
    exposedOpponentGeometry.push({
      name: object.name,
      userData: object.userData
    });
  });
  assert.equal(
    /card|hand|uid|passcode/i.test(JSON.stringify(exposedOpponentGeometry)),
    false,
    'the public console geometry must never carry hidden hand or card identity'
  );

  scene.dispose();
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

test('the console playmat and central arena follow every Field family before restoring the base terrain', () => {
  const harness = createTextureHarness();
  const scene = createScene(harness);
  scene.root = { dataset: {} };
  const { playmat, arenaSurface } = getTerrainSurfaces(scene);
  const signatures = new Map();
  const environmentIds = [
    'clearing',
    ...Object.keys(FIELD_ENVIRONMENT_REGISTRY)
      .filter(environmentId => environmentId !== 'clearing')
  ];

  for (const environmentId of environmentIds) {
    const environment = FIELD_ENVIRONMENT_REGISTRY[environmentId];
    scene.updateEnvironment({
      environment,
      environmentId,
      sourceCardId: environment.associatedCardIds[0] || null,
      sourceUid: environmentId === 'clearing' ? null : `private-${environmentId}`
    });

    assert.equal(playmat.material.userData.environmentId, environmentId);
    assert.equal(arenaSurface.material.userData.environmentId, environmentId);
    assert.equal(
      playmat.material.userData.arenaMaterial,
      environment.arenaMaterial
    );
    assert.equal(
      arenaSurface.material.userData.arenaMaterial,
      environment.arenaMaterial
    );
    assert.equal(scene.root.dataset.environmentId, environmentId);
    assert.equal(scene.root.dataset.arenaMaterial, environment.arenaMaterial);

    signatures.set(environmentId, {
      playmat: materialSignature(playmat.material),
      arena: materialSignature(arenaSurface.material)
    });
  }

  for (const environmentId of environmentIds.slice(1)) {
    assert.notDeepEqual(
      signatures.get(environmentId).playmat,
      signatures.get('clearing').playmat,
      `the console playmat must visibly adopt ${environmentId}`
    );
    assert.notDeepEqual(
      signatures.get(environmentId).arena,
      signatures.get('clearing').arena,
      `the central arena must visibly adopt ${environmentId}`
    );
  }

  scene.updateEnvironment(FIELD_ENVIRONMENT_REGISTRY.clearing);
  assert.deepEqual(
    materialSignature(playmat.material),
    signatures.get('clearing').playmat
  );
  assert.deepEqual(
    materialSignature(arenaSurface.material),
    signatures.get('clearing').arena
  );
  assert.equal(playmat.material.userData.environmentId, 'clearing');
  assert.equal(arenaSurface.material.userData.environmentId, 'clearing');

  scene.dispose();
});

test('two dedicated Field Spells in one family keep distinct arena and playmat palettes', () => {
  const harness = createTextureHarness();
  const scene = createScene(harness);
  scene.root = { dataset: {} };
  const { playmat, arenaSurface } = getTerrainSurfaces(scene);
  const gatewayToChaos = getFieldEnvironmentForCardId('40089744');
  const chaosZone = getFieldEnvironmentForCardId('94243005');

  assert.ok(gatewayToChaos);
  assert.ok(chaosZone);
  assert.equal(gatewayToChaos.id, chaosZone.id);
  assert.notDeepEqual(
    gatewayToChaos.surfacePalette,
    chaosZone.surfacePalette,
    'cards in the same visual family must still own dedicated surface palettes'
  );

  scene.updateEnvironment(gatewayToChaos);
  const gatewaySignature = {
    playmat: materialSignature(playmat.material),
    arena: materialSignature(arenaSurface.material)
  };

  scene.updateEnvironment(chaosZone);
  const chaosSignature = {
    playmat: materialSignature(playmat.material),
    arena: materialSignature(arenaSurface.material)
  };

  assert.notDeepEqual(chaosSignature.playmat, gatewaySignature.playmat);
  assert.notDeepEqual(chaosSignature.arena, gatewaySignature.arena);
  scene.dispose();
});

test('terrain surfaces consume canonical public identity only and never localized or concealed card data', () => {
  const harness = createTextureHarness();
  const scene = createScene(harness);
  scene.root = { dataset: {} };
  const { playmat, arenaSurface } = getTerrainSurfaces(scene);
  const localizedName = 'Nom traduit qui ne doit jamais piloter le terrain';
  const privateUid = 'private-field-card-identity';
  const yami = activeFieldCard('59197169', 7, {
    uid: privateUid,
    name: localizedName,
    name_en: 'Localized alias'
  });

  const publicSelection = resolveFieldEnvironmentSelection({
    playerFieldSpell: yami
  });
  scene.updateEnvironment(publicSelection);
  assert.equal(playmat.material.userData.environmentId, 'yami');
  assert.equal(arenaSurface.material.userData.environmentId, 'yami');

  const exposedVisualState = JSON.stringify({
    environment: scene.environment,
    root: scene.root.dataset,
    playmat: playmat.material.userData,
    arena: arenaSurface.material.userData
  });
  assert.equal(exposedVisualState.includes(localizedName), false);
  assert.equal(exposedVisualState.includes('Localized alias'), false);
  assert.equal(exposedVisualState.includes(privateUid), false);
  assert.equal(exposedVisualState.includes('59197169'), false);
  assert.deepEqual(
    Object.keys(playmat.material.userData).sort(),
    ['arenaMaterial', 'environmentId']
  );
  assert.deepEqual(
    Object.keys(arenaSurface.material.userData).sort(),
    ['arenaMaterial', 'environmentId']
  );
  assert.deepEqual(
    Object.keys(scene.root.dataset).sort(),
    ['arenaMaterial', 'environmentId']
  );
  assert.deepEqual(
    Object.keys(scene.environment).sort(),
    [
      'accentColor',
      'arenaMaterial',
      'environmentTint',
      'fog',
      'id',
      'lighting',
      'surfacePalette'
    ]
  );

  const concealedSelection = resolveFieldEnvironmentSelection({
    activeFieldSpells: [{
      hidden: true,
      card: activeFieldCard('22702055', 8, {
        uid: 'secret-opponent-umi',
        name: 'Mer secrète'
      })
    }]
  });
  assert.equal(concealedSelection.environmentId, 'clearing');
  scene.updateEnvironment(concealedSelection);
  assert.equal(playmat.material.userData.environmentId, 'clearing');
  assert.equal(arenaSurface.material.userData.environmentId, 'clearing');
  assert.equal(
    JSON.stringify({
      root: scene.root.dataset,
      playmat: playmat.material.userData,
      arena: arenaSurface.material.userData
    }).includes('secret-opponent-umi'),
    false
  );

  scene.dispose();
});
