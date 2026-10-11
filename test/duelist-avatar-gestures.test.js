import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { createDuelistAvatarModel } from '../src/ui/DuelistAvatarModels.js';
import { DUELIST_GESTURE_DURATIONS, DUELIST_GESTURE_KINDS } from '../src/ui/DuelistAvatarGestures.js';

function skinnedMeshes(model) {
  const meshes = [];
  model.group.traverse(object => { if (object.isSkinnedMesh) meshes.push(object); });
  return meshes;
}

function vertexForJoint(model, jointIndex) {
  for (const mesh of skinnedMeshes(model)) {
    const weights = mesh.geometry.attributes.skinIndex;
    for (let i = 0; i < weights.count; i += 1) if (weights.getX(i) === jointIndex) return { mesh, index: i };
  }
  throw new Error(`No geometry attached to anatomical joint ${jointIndex}`);
}

function worldVertex({ mesh, index }) {
  mesh.updateWorldMatrix(true, false);
  const point = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index);
  mesh.applyBoneTransform(index, point);
  return mesh.localToWorld(point);
}

function worldPosition(object) {
  object.updateWorldMatrix(true, false);
  return object.getWorldPosition(new THREE.Vector3());
}

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-5, `${message}: ${actual} ≈ ${expected}`);

test('neutral skinning preserves the actual original coordinates and shared geometry budget', () => {
  for (const id of ['yugi', 'kaiba', 'mai', 'aporia', 'windy', 'bochi']) {
    const model = createDuelistAvatarModel(id);
    model.group.position.set(3, 1, -4);
    model.group.rotation.y = 0.7;
    model.group.updateMatrixWorld(true);
    const meshes = skinnedMeshes(model);
    assert.ok(meshes.length >= 2 && meshes.length <= 3);
    assert.ok(model.group.userData.drawCalls <= 10);
    assert.ok(model.group.userData.triangles <= 14000);
    for (const mesh of meshes) {
      assert.equal(mesh.frustumCulled, false, 'animated hands cannot be clipped by a cached neutral sphere');
      const position = mesh.geometry.attributes.position;
      for (let i = 0; i < position.count; i += Math.max(1, Math.floor(position.count / 32))) {
        const expected = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        close(worldVertex({ mesh, index: i }).distanceTo(expected), 0, `${id} neutral skinned vertex`);
      }
    }
    model.dispose();
  }
});

test('shoulder, elbow, wrist and disk use anatomical pivots with rigid attachments', () => {
  const model = createDuelistAvatarModel('kaiba');
  const { leftShoulder, leftElbow, leftWrist, duelDisk } = model.rig;
  assert.equal(leftElbow.parent, leftShoulder);
  assert.equal(leftWrist.parent, leftElbow);
  assert.equal(duelDisk.parent, leftWrist);
  const shoulder = worldPosition(leftShoulder);
  const elbow = worldPosition(leftElbow);
  const wrist = worldPosition(leftWrist);
  const disk = worldPosition(duelDisk);
  const handVertex = vertexForJoint(model, 3);
  const diskVertex = vertexForJoint(model, 4);
  const handPoint = worldVertex(handVertex);
  const diskPoint = worldVertex(diskVertex);
  leftShoulder.rotation.z = -0.55;
  model.group.updateMatrixWorld(true);
  close(worldPosition(leftShoulder).distanceTo(shoulder), 0, 'shoulder pivot stays fixed');
  assert.ok(worldPosition(leftElbow).distanceTo(elbow) > 0.2);
  close(worldPosition(leftShoulder).distanceTo(worldPosition(leftElbow)), shoulder.distanceTo(elbow), 'upper-arm length');
  close(worldPosition(leftElbow).distanceTo(worldPosition(leftWrist)), elbow.distanceTo(wrist), 'forearm length');
  close(worldPosition(leftWrist).distanceTo(worldPosition(duelDisk)), wrist.distanceTo(disk), 'attached disk pivot');
  assert.ok(worldVertex(handVertex).distanceTo(handPoint) > 0.2);
  assert.ok(worldVertex(diskVertex).distanceTo(diskPoint) > 0.2);
  const movedElbow = worldPosition(leftElbow);
  const movedWrist = worldPosition(leftWrist);
  leftElbow.rotation.x = -0.45;
  model.group.updateMatrixWorld(true);
  close(worldPosition(leftElbow).distanceTo(movedElbow), 0, 'elbow pivot stays fixed');
  assert.ok(worldPosition(leftWrist).distanceTo(movedWrist) > 0.15);
  const wristPivot = worldPosition(leftWrist);
  const diskBeforeWristTurn = worldPosition(duelDisk);
  leftWrist.rotation.z = 0.5;
  model.group.updateMatrixWorld(true);
  close(worldPosition(leftWrist).distanceTo(wristPivot), 0, 'wrist pivot stays fixed');
  assert.ok(worldPosition(duelDisk).distanceTo(diskBeforeWristTurn) > 0.04);
  const diskPivot = worldPosition(duelDisk);
  const diskVertexBefore = worldVertex(diskVertex);
  duelDisk.rotation.x = 0.4;
  model.group.updateMatrixWorld(true);
  close(worldPosition(duelDisk).distanceTo(diskPivot), 0, 'disk pivots on its attached hub');
  assert.ok(worldVertex(diskVertex).distanceTo(diskVertexBefore) > 0.015);
  model.dispose();
});

test('seven public gestures articulate distinct poses and return to idle after their duration', () => {
  const signatures = new Set();
  for (const kind of DUELIST_GESTURE_KINDS) {
    const model = createDuelistAvatarModel('yugi');
    model.update(0);
    assert.equal(model.playGesture(kind), true);
    assert.equal(model.hasActiveGesture, true);
    model.update(DUELIST_GESTURE_DURATIONS[kind] * 0.38);
    const state = model.getGestureState();
    assert.equal(state.kind, kind);
    close(state.progress, 0.38, `${kind} clock`);
    const rotations = Object.values(model.rig).map(joint => joint.rotation.toArray().slice(0, 3));
    assert.ok(rotations.flat().some(value => Math.abs(value) > 0.02), `${kind} moves an actual arm joint`);
    const signature = JSON.stringify(rotations);
    assert.equal(signatures.has(signature), false, `${kind} has a distinct action pose`);
    signatures.add(signature);
    model.update(DUELIST_GESTURE_DURATIONS[kind] + 0.01);
    assert.equal(model.hasActiveGesture, false);
    assert.equal(model.getGestureState(), null);
    for (const joint of Object.values(model.rig)) assert.deepEqual(joint.rotation.toArray().slice(0, 3), [0, 0, 0]);
    model.dispose();
  }
  assert.equal(signatures.size, 7);
});

test('gesture replacement and cancellation have stable identifiers and cannot leave a stale pose', () => {
  const model = createDuelistAvatarModel('jaden');
  model.update(10);
  model.playGesture('attack');
  const attack = model.getGestureState();
  model.update(10.2);
  model.playGesture('damage', { strength: 1.1 });
  const damage = model.getGestureState();
  assert.ok(damage.gestureId > attack.gestureId);
  assert.equal(damage.kind, 'damage');
  model.update(10.35);
  assert.equal(model.getGestureState().kind, 'damage');
  assert.equal(model.clearGesture(), true);
  assert.equal(model.clearGesture(), false);
  assert.equal(model.getGestureState(), null);
  for (const joint of Object.values(model.rig)) assert.deepEqual(joint.rotation.toArray().slice(0, 3), [0, 0, 0]);
  model.playGesture('casting');
  model.resetPose();
  assert.equal(model.getGestureState(), null);
  model.dispose();
});

test('clock origins and backwards clocks never finish a new gesture instantly or rewind it', () => {
  const model = createDuelistAvatarModel('yusei');
  model.playGesture('summon');
  model.update(1000);
  assert.equal(model.getGestureState().progress, 0);
  model.update(1000.3);
  const elapsed = model.getGestureState().elapsed;
  model.update(999);
  assert.equal(model.getGestureState().elapsed, elapsed);
  model.update(999.1);
  assert.ok(model.getGestureState().elapsed > elapsed);
  model.dispose();
});

test('terminal held poses apply synchronously without RAF, survive updates and clear cleanly', () => {
  for (const kind of ['victory', 'defeat', 'draw']) {
    const model = createDuelistAvatarModel('kaiba');
    model.update(12);
    assert.equal(model.playGesture(kind, { hold: true, immediate: true }), true);
    const state = model.getGestureState();
    assert.equal(state.progress, 1);
    assert.equal(state.held, true);
    assert.equal(state.active, false);
    assert.equal(model.hasActiveGesture, false);
    const pose = Object.values(model.rig).map(joint => joint.rotation.toArray().slice(0, 3));
    assert.ok(pose.flat().some(value => value !== 0));
    model.update(500);
    assert.equal(model.getGestureState().gestureId, state.gestureId);
    assert.deepEqual(Object.values(model.rig).map(joint => joint.rotation.toArray().slice(0, 3)), pose);
    assert.equal(model.clearGesture(), true);
    for (const joint of Object.values(model.rig)) assert.deepEqual(joint.rotation.toArray().slice(0, 3), [0, 0, 0]);
    model.dispose();
  }
});

test('reduced motion omits transients and holds gentle static results in both preference directions', () => {
  const model = createDuelistAvatarModel('yugi', { reducedMotion: true });
  model.update(0);
  model.playGesture('attack');
  assert.equal(model.hasActiveGesture, false);
  assert.equal(model.update(0.3), false);
  assert.equal(model.getGestureState(), null);
  assert.deepEqual(model.rig.rightShoulder.rotation.toArray().slice(0, 3), [0, 0, 0]);
  model.playGesture('victory', { hold: true, immediate: true });
  const gentle = model.rig.rightShoulder.rotation.z;
  assert.ok(gentle > 0 && gentle < 0.5);
  model.update(20);
  assert.equal(model.rig.rightShoulder.rotation.z, gentle);
  assert.equal(model.hasActiveGesture, false);
  model.update(21, { reducedMotion: false });
  assert.ok(model.rig.rightShoulder.rotation.z > gentle * 4);
  model.update(22, { reducedMotion: true });
  close(model.rig.rightShoulder.rotation.z, gentle, 'preference changes restore a gentle result');
  model.dispose();
});

test('only allowlisted public gesture fields are used and excessive strength is bounded', () => {
  const model = createDuelistAvatarModel('yuya');
  assert.equal(model.playGesture('__proto__'), false);
  assert.equal(model.playGesture('constructor'), false);
  assert.equal(model.playGesture({ get kind() { throw new Error('untrusted event'); } }), false);
  assert.equal(model.playGesture('attack', { strength: 100, get card() { throw new Error('private card'); }, get uid() { throw new Error('private instance'); } }), true);
  assert.equal(model.getGestureState().strength, 1.25);
  assert.equal(JSON.stringify(model.getGestureState()).includes('card'), false);
  model.update(0);
  model.update(0.3);
  const previous = model.getGestureState();
  assert.equal(model.playGesture('unknown'), false);
  assert.equal(model.getGestureState().gestureId, previous.gestureId);
  model.dispose();
  assert.equal(model.playGesture('attack'), false);
  assert.equal(model.clearGesture(), false);
});

test('repeated gestures reuse mesh buffers and release the skeleton texture exactly once', () => {
  const model = createDuelistAvatarModel('aporia');
  const resources = [];
  model.group.traverse(object => {
    if (object.geometry) resources.push(object.geometry);
  });
  const attributes = resources.map(geometry => Object.values(geometry.attributes).map(attribute => attribute.array));
  const skeleton = skinnedMeshes(model)[0].skeleton;
  const boneMatrices = skeleton.boneMatrices;
  skeleton.computeBoneTexture();
  let textureDisposals = 0;
  skeleton.boneTexture.addEventListener('dispose', () => { textureDisposals += 1; });
  let now = 0;
  model.update(now);
  for (let round = 0; round < 4; round += 1) for (const kind of DUELIST_GESTURE_KINDS) {
    model.playGesture(kind);
    for (let frame = 0; frame < 36; frame += 1) {
      now += 1 / 60;
      model.update(now);
      model.group.updateMatrixWorld(true);
      skeleton.update();
    }
  }
  const after = [];
  model.group.traverse(object => { if (object.geometry) after.push(object.geometry); });
  assert.deepEqual(after, resources);
  for (let i = 0; i < resources.length; i += 1) {
    const current = Object.values(resources[i].attributes);
    current.forEach((attribute, index) => assert.equal(attribute.array, attributes[i][index]));
  }
  // computeBoneTexture pads this array once; gestures never replace it.
  assert.ok(skeleton.boneMatrices.length >= boneMatrices.length);
  const allocatedMatrix = skeleton.boneMatrices;
  model.update(++now);
  assert.equal(skeleton.boneMatrices, allocatedMatrix);
  assert.equal(model.dispose(), true);
  assert.equal(model.dispose(), false);
  assert.equal(textureDisposals, 1);
  assert.equal(skeleton.boneTexture, null);
});
