import assert from 'node:assert/strict';
import test from 'node:test';
import { Scene, PerspectiveCamera } from 'three';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

function fixture({ reducedMotion = false } = {}) {
  let now = 0;
  let sequence = 0;
  const pending = new Map();
  const documentRef = { hidden: false };
  const scene = new RealDuelScene3D({ documentRef, windowRef: {
    performance: { now: () => now }, matchMedia: () => ({ matches: reducedMotion }),
    requestAnimationFrame(callback) { pending.set(++sequence, callback); return sequence; },
    cancelAnimationFrame(handle) { pending.delete(handle); }
  } });
  scene.scene = new Scene();
  scene.camera = new PerspectiveCamera();
  scene.renderer = { render() {} };
  scene.active = true;
  const descriptors = [
    { owner: 'player', zoneType: 'main', zoneIndex: 0, faceUp: true, card: { id: '89631139' }, worldPosition: [-2, 0.7, 4] },
    { owner: 'opponent', zoneType: 'extra', zoneIndex: 1, faceUp: true, card: { id: '23995346' }, worldPosition: [2, 0.7, 0] }
  ];
  scene.updateFieldHolograms(descriptors);
  return { scene, descriptors, pending, documentRef,
    setNow(value) { now = value; },
    tick(value) {
      now = value;
      const [handle, callback] = pending.entries().next().value;
      pending.delete(handle); callback(value);
    }
  };
}

const attack = {
  kind: 'attack', card: { id: '89631139' }, source: [-2, 2.2, 4], target: [2, 2.2, 0],
  sourceRef: { owner: 'player', zoneType: 'main', zoneIndex: 0 },
  targetRef: { owner: 'opponent', zoneType: 'extra', zoneIndex: 1 }
};

test('absolute combat endpoints animate the correct source and defer target recoil until impact', () => {
  const { scene, tick, pending } = fixture();
  const source = scene._fieldHolograms.get('player:main:0').object;
  const target = scene._fieldHolograms.get('opponent:extra:1').object;
  const basePosition = source.position.toArray();
  scene.playCombatEffect(attack);
  assert.equal(scene._monsterPoses.size, 2);
  tick(200);
  assert.notEqual(source.userData.poseRig.life.value.z, 0);
  assert.equal(Math.abs(target.userData.poseRig.life.value.z), 0);
  assert.deepEqual(source.position.toArray(), basePosition, 'pose never moves the authoritative zone anchor');
  tick(600);
  assert.notEqual(target.userData.poseRig.life.value.z, 0);
  tick(1600);
  assert.equal(scene._monsterPoses.size, 0);
  assert.equal(pending.size, 0);
  assert.equal(scene.running, false);
  assert.deepEqual(source.userData.poseRig.life.value.toArray(), [0, 1, 0, 0]);
  assert.deepEqual(target.userData.poseRig.life.value.toArray(), [0, 1, 0, 0]);
  scene.updateFieldHolograms([]);
});

test('concealment cancels a creature pose immediately and cannot animate its old public identity', () => {
  const { scene, descriptors, tick } = fixture();
  const target = scene._fieldHolograms.get('opponent:extra:1').object;
  scene.playCombatEffect(attack);
  scene.updateFieldHolograms([descriptors[0], { owner: 'opponent', zoneType: 'extra', zoneIndex: 1,
    faceUp: false, get card() { throw new Error('concealed identity read'); } }]);
  assert.equal(scene._monsterPoses.has(target), false);
  assert.equal(target.userData.poseRig.disposed, true);
  assert.equal(scene._startMonsterPose(attack.targetRef, 'casting', 0, 300), false);
  tick(1600);
  scene.updateFieldHolograms([]);
});

test('visibility pauses model poses with effects, and deactivation restores neutral geometry', () => {
  const { scene, tick, setNow, documentRef, pending } = fixture();
  const source = scene._fieldHolograms.get('player:main:0').object;
  scene.playCombatEffect(attack);
  tick(200);
  const poseBefore = source.userData.poseRig.pose.value.toArray();
  documentRef.hidden = true;
  scene._boundVisibility();
  assert.equal(pending.size, 0);
  setNow(1200);
  documentRef.hidden = false;
  scene._boundVisibility();
  assert.equal(scene._monsterPoses.get(source).startedAt, 1000);
  tick(1200);
  assert.deepEqual(source.userData.poseRig.pose.value.toArray(), poseBefore);
  scene.deactivate();
  assert.equal(scene._monsterPoses.size, 0);
  assert.equal(pending.size, 0);
  assert.deepEqual(source.userData.poseRig.life.value.toArray(), [0, 1, 0, 0]);
  scene.updateFieldHolograms([]);
});

test('reduced motion keeps creatures static without allocating any action animation', () => {
  const { scene, pending } = fixture({ reducedMotion: true });
  assert.equal(scene.playCombatEffect(attack), false);
  assert.equal(scene._monsterPoses.size, 0);
  assert.equal(scene._combatEffects.length, 0);
  assert.equal(pending.size, 0);
  scene.updateFieldHolograms([]);
});
