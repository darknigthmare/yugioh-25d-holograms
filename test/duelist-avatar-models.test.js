import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import * as THREE from 'three';
import { createDuelistAvatarModel } from '../src/ui/DuelistAvatarModels.js';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';
import { DUELIST_AVATARS } from '../src/content/DuelistAvatarCatalog.js';

const ICONIC_IDS = ['yugi', 'atem', 'kaiba', 'joey', 'tea', 'mai', 'pegasus', 'jaden', 'yusei', 'yuma', 'yuya', 'playmaker', 'yuga', 'yudias'];

function resources(model) {
  const geometries = new Set();
  const materials = new Set();
  model.group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });
  return { geometries: [...geometries], materials: [...materials] };
}

function silhouetteSignature(model) {
  const hash = createHash('sha256');
  model.group.traverse(object => {
    if (object.geometry) hash.update(Buffer.from(object.geometry.attributes.position.array.buffer));
  });
  hash.update(JSON.stringify(model.group.scale.toArray()));
  return hash.digest('hex');
}

test('the entire curated roster renders within the geometry budget without colour-only duplicates', () => {
  const signatures = new Set();
  for (const avatar of DUELIST_AVATARS) {
    const model = createDuelistAvatarModel(avatar.id);
    assert.equal(model.avatarId, avatar.id);
    assert.ok(model.group.userData.drawCalls <= 10);
    assert.ok(model.group.userData.triangles <= 12000);
    for (const geometry of resources(model).geometries) {
      assert.equal(geometry.attributes.position.array.every(Number.isFinite), true, avatar.id);
      assert.equal(geometry.attributes.normal.array.every(Number.isFinite), true, avatar.id);
    }
    const signature = silhouetteSignature(model);
    assert.equal(signatures.has(signature), false, `${avatar.id} must have a geometric appearance, not only different colours`);
    signatures.add(signature);
    model.dispose();
  }
  assert.equal(signatures.size, 192);
});

test('iconic duelists have distinct complete silhouettes with finite bounded geometry', () => {
  const signatures = new Map();
  for (const id of ICONIC_IDS) {
    const model = createDuelistAvatarModel(id);
    assert.equal(model.avatarId, id, `${id} must resolve its own catalogue profile`);
    assert.equal(model.group.userData.avatarId, id);
    assert.equal(model.group.userData.owner, 'player');
    const meshes = resources(model).geometries;
    assert.ok(meshes.length >= 5 && meshes.length <= 10, `${id} draw calls stay bounded`);
    assert.equal(model.group.userData.drawCalls, meshes.length);
    assert.ok(model.group.userData.triangles < 25000, `${id} triangle count stays bounded`);
    for (const geometry of meshes) {
      assert.ok([...geometry.attributes.position.array].every(Number.isFinite));
      assert.ok([...geometry.attributes.normal.array].every(Number.isFinite));
      assert.ok(geometry.boundingSphere.radius > 0);
    }
    const bounds = new THREE.Box3().setFromObject(model.group);
    assert.ok(bounds.min.y >= -0.05 && bounds.max.y <= 8.5, `${id} has a sane vertical envelope`);
    for (const side of [-1, 1]) for (const part of ['hand', 'thigh', 'calf', 'boot-toe', 'ear', 'eye-white']) {
      assert.ok(model.group.userData.partNames.includes(`${part}-${side}`), `${id} has ${part}-${side}`);
    }
    assert.equal(model.group.userData.partNames.filter(name => name.startsWith('empty-duel-disk-slot-')).length, 5);
    assert.ok(!signatures.has(silhouetteSignature(model)), `${id} is not a recolour of ${signatures.get(silhouetteSignature(model))}`);
    signatures.set(silhouetteSignature(model), id);
    model.dispose();
  }
});

test('recognizable signature parts are present for the established iconic looks', () => {
  const expected = {
    yugi: ['star-outline-0', 'star-fringe-0', 'millennium-puzzle'],
    atem: ['star-outline-0', 'millennium-puzzle'],
    kaiba: ['long-coat-tail--1', 'raised-coat-collar-1', 'kaiba-shoulder-panel-1'],
    joey: ['swept-hair-0', 'swept-fringe-0'],
    pegasus: ['pegasus-hidden-eye-lock', 'pegasus-bowtie'],
    yusei: ['gold-hair-streak-0'],
    yuya: ['goggle-lens--1']
  };
  for (const [id, names] of Object.entries(expected)) {
    const model = createDuelistAvatarModel(id);
    for (const name of names) assert.ok(model.group.userData.partNames.includes(name), `${id}: ${name}`);
    model.dispose();
  }
});

test('idle updates animate the rig without allocating or modifying geometry', () => {
  const model = createDuelistAvatarModel('kaiba');
  const before = resources(model);
  const buffers = before.geometries.map(geometry => geometry.attributes.position.array);
  const signature = silhouetteSignature(model);
  for (let frame = 0; frame < 240; frame += 1) model.update(frame / 60);
  assert.deepEqual(resources(model).geometries, before.geometries);
  assert.deepEqual(resources(model).materials, before.materials);
  assert.deepEqual(resources(model).geometries.map(geometry => geometry.attributes.position.array), buffers);
  assert.equal(silhouetteSignature(model), signature);
  assert.notEqual(model.group.getObjectByName('duelist-gaze-rig').rotation.y, 0);
  model.update(5, { reducedMotion: true });
  assert.equal(model.group.getObjectByName('duelist-breathing-rig').position.y, 0);
  assert.equal(model.group.getObjectByName('duelist-gaze-rig').rotation.y, 0);
  model.dispose();
});

test('disposal releases each owned GPU resource once, detaches the avatar and is idempotent', () => {
  const model = createDuelistAvatarModel('kaiba', { owner: 'opponent' });
  const parent = new THREE.Group();
  parent.add(model.group);
  const owned = resources(model);
  const counts = new Map();
  for (const resource of [...owned.geometries, ...owned.materials]) resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1));
  assert.equal(model.dispose(), true);
  assert.equal(model.dispose(), false);
  assert.equal(model.update(1), false);
  assert.equal(parent.children.length, 0);
  for (const resource of [...owned.geometries, ...owned.materials]) assert.equal(counts.get(resource), 1);
});

test('appearance resolution uses the catalogue without inspecting supplied private metadata', () => {
  const model = createDuelistAvatarModel({ id: 'yugi', get visual() { throw new Error('untrusted visual metadata'); }, get hand() { throw new Error('private hand'); } });
  assert.equal(model.avatarId, 'yugi');
  model.dispose();
  const fallback = createDuelistAvatarModel('unknown-avatar');
  assert.equal(fallback.avatarId, 'yugi');
  fallback.dispose();
});

test('Scene3D retains pre-mount choices, swaps only changed avatars and disposes replaced models', () => {
  const scene = new RealDuelScene3D({ documentRef: null, windowRef: { matchMedia: () => ({ matches: true }) } });
  assert.equal(scene.setDuelistAvatars({ playerAvatarId: 'jaden', opponentAvatarId: 'pegasus' }), true);
  assert.deepEqual(scene.getDuelistAvatars(), { playerAvatarId: 'jaden', opponentAvatarId: 'pegasus' });
  scene.scene = new THREE.Scene();
  scene.setDuelistAvatars(scene.getDuelistAvatars());
  const beforePlayer = scene._duelistAvatars.get('player');
  const beforeOpponent = scene._duelistAvatars.get('opponent');
  assert.equal(scene.scene.getObjectByName('player-character').userData.avatarId, 'jaden');
  assert.equal(scene.scene.getObjectByName('opponent-character').userData.avatarId, 'pegasus');
  assert.equal(scene._requiresAnimationFrame(), false);
  scene.setDuelistAvatars({ playerAvatarId: 'kaiba' });
  assert.equal(beforePlayer.disposed, true);
  assert.equal(beforeOpponent.disposed, false);
  assert.equal(scene._duelistAvatars.get('opponent'), beforeOpponent);
  scene.setDuelistAvatars({ playerAvatarId: 'not-a-character' });
  assert.equal(scene.getDuelistAvatars().playerAvatarId, 'kaiba');
  scene._boundMotionPreference({ matches: false });
  assert.equal(scene._updateDuelistAvatars(16), true);
  assert.notEqual(scene._duelistAvatars.get('player').group.getObjectByName('duelist-gaze-rig').rotation.y, 0);
  scene._boundMotionPreference({ matches: true });
  assert.equal(scene._duelistAvatars.get('player').group.getObjectByName('duelist-gaze-rig').rotation.y, 0);
  scene._destroyRenderer();
  assert.equal(beforeOpponent.disposed, true);
  assert.equal(scene._duelistAvatars.size, 0);
});

test('actual avatars request idle RAF while reduced motion and visibility stop their movement', () => {
  let now = 0;
  const pending = new Map();
  let next = 0;
  const documentRef = { hidden: false };
  const windowRef = {
    performance: { now: () => now }, matchMedia: () => ({ matches: false }),
    requestAnimationFrame(callback) { pending.set(++next, callback); return next; },
    cancelAnimationFrame(handle) { pending.delete(handle); }
  };
  const scene = new RealDuelScene3D({ documentRef, windowRef });
  scene.scene = new THREE.Scene();
  scene.camera = new THREE.PerspectiveCamera();
  scene.renderer = { render() {}, dispose() {} };
  scene.setDuelistAvatars({ playerAvatarId: 'yusei', opponentAvatarId: 'kaiba' });
  scene.active = true;
  scene.start();
  assert.equal(pending.size, 1);
  const frame = time => { const [handle, callback] = pending.entries().next().value; pending.delete(handle); now = time; callback(time); };
  frame(16); frame(32);
  assert.ok(scene._duelistAnimationElapsed > 0);
  documentRef.hidden = true;
  scene._boundVisibility();
  assert.equal(pending.size, 0);
  const pausedElapsed = scene._duelistAnimationElapsed;
  now = 60000;
  documentRef.hidden = false;
  scene._boundVisibility();
  frame(60016);
  assert.equal(scene._duelistAnimationElapsed, pausedElapsed);
  scene._boundMotionPreference({ matches: true });
  assert.equal(pending.size, 0);
  assert.equal(scene._duelistAvatars.get('player').group.getObjectByName('duelist-gaze-rig').rotation.y, 0);
  scene._destroyRenderer();
});
