import assert from 'node:assert/strict';
import test from 'node:test';
import { ShaderLib } from 'three';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import {
  createHologramPoseAnimation, HOLOGRAM_JOINTS, resolveHologramPartJoint
} from '../src/ui/HologramPoseAnimation.js';
import {
  resolveCombatVisualProfile, resolveHologramMonsterProfile,
  SUPPORTED_HOLOGRAM_MODEL_IDS, SUPPORTED_PROCEDURAL_MODEL_FAMILIES
} from '../src/ui/CombatVisualProfiles.js';
import { createCombatVisualEffect } from '../src/ui/CombatVisualEffects.js';

function release(model) {
  for (const mesh of model.children) { mesh.geometry.dispose(); mesh.material.dispose(); }
}

test('new card identities have distinctive anatomy, declared support and bounded geometry', () => {
  const expected = [
    ['54652250', 'insect', 'pincer', ['insect-compound-eye-1', 'pincer-tooth--1-3', 'insect-leg-lower-1-2']],
    ['31560081', 'faith', 'faith-light', ['faith-halo', 'faith-hair-lock--1', 'faith-heart-gem']],
    ['26202165', 'sangan', 'search', ['sangan-third-eye', 'sangan-third-pupil', 'sangan-fang-1']],
    ['77637979', 'dragon', 'cyber-beam', ['cyber-beak', 'wing-1-circuit-3', 'projection-link-arrow-1']]
  ];
  for (const [id, family, activation, parts] of expected) {
    assert.ok(SUPPORTED_HOLOGRAM_MODEL_IDS.includes(id));
    assert.ok(SUPPORTED_PROCEDURAL_MODEL_FAMILIES.includes(family));
    const model = createHologramMonsterModel({ id, name: 'arbitrary localization' });
    assert.equal(model.userData.profile.family, family);
    assert.equal(resolveCombatVisualProfile({ kind: id === '77637979' ? 'attack' : 'activate', card: { id } }).id, activation);
    assert.ok(parts.every(part => model.userData.partNames.includes(part)));
    assert.equal(model.userData.fidelity, 'procedural-interpretation');
    assert.ok(model.children.length <= 5);
    assert.ok(model.userData.triangleCount < 6000);
    release(model);
  }
  assert.equal(resolveHologramMonsterProfile({ id: '054652250' }).id, 'man-eater-bug');
  const token = createHologramMonsterModel({ type: 'Token', race: 'Beast', attribute: 'EARTH' });
  const linkCaster = createHologramMonsterModel({ type: 'Link Effect Monster', race: 'Spellcaster', attribute: 'DARK' });
  assert.ok(token.userData.partNames.includes('token-goat-face'));
  assert.ok(linkCaster.userData.partNames.includes('staff-digital-core'));
  assert.ok(linkCaster.userData.partNames.includes('projection-link-arrow-1'));
  assert.equal(linkCaster.userData.profile.attack, 'cyber-beam');
  release(token);
  release(linkCaster);
});

test('merged visible and shadow meshes share pose uniforms and retain complete joint attributes', () => {
  const model = createHologramMonsterModel({ id: '89631139' });
  const allJoints = new Set();
  for (const mesh of model.children) {
    const joint = mesh.geometry.attributes.hologramJoint;
    assert.equal(joint.count, mesh.geometry.attributes.position.count);
    for (const value of joint.array) allJoints.add(value);
    const shaderName = mesh.material.isMeshStandardMaterial ? 'standard' : 'basic';
    const shader = { uniforms: {}, vertexShader: ShaderLib[shaderName].vertexShader };
    mesh.material.onBeforeCompile(shader);
    assert.equal(shader.uniforms.uHologramPose, model.userData.poseRig.pose);
    assert.ok(shader.vertexShader.includes('transformed = hologramMove(transformed, false);'));
    assert.ok(shader.vertexShader.includes('objectNormal = hologramMove(objectNormal, true);'));
    if (mesh.castShadow) {
      const depthShader = { uniforms: {}, vertexShader: ShaderLib.depth.vertexShader };
      mesh.customDepthMaterial.onBeforeCompile(depthShader);
      assert.equal(depthShader.uniforms.uHologramPose, shader.uniforms.uHologramPose);
      assert.ok(depthShader.vertexShader.includes('transformed = hologramMove(transformed, false);'));
      assert.ok(mesh.customDistanceMaterial);
    }
  }
  assert.ok(allJoints.has(HOLOGRAM_JOINTS.LEFT_WING));
  assert.ok(allJoints.has(HOLOGRAM_JOINTS.RIGHT_WING));
  assert.ok(allJoints.has(HOLOGRAM_JOINTS.JAW));
  assert.ok(allJoints.has(HOLOGRAM_JOINTS.BASE));
  assert.equal(resolveHologramPartJoint('pincer-upper-arm--1'), HOLOGRAM_JOINTS.LEFT_PINCER);
  assert.equal(resolveHologramPartJoint('pincer-upper-arm-1'), HOLOGRAM_JOINTS.RIGHT_PINCER);
  release(model);
});

test('finite action poses deform wings, staff, recoil and summon without uploads or root drift', () => {
  for (const [id, kind] of [['89631139', 'attack'], ['46986414', 'casting'], ['54652250', 'attack'], ['26202165', 'recoil'], ['31560081', 'summon']]) {
    const model = createHologramMonsterModel({ id });
    model.position.set(3, 0.7, -2);
    model.rotation.y = Math.PI;
    const positionBefore = model.position.toArray();
    const rotationBefore = model.rotation.toArray();
    const references = model.children.map(mesh => ({ mesh, array: mesh.geometry.attributes.position.array, version: mesh.geometry.attributes.position.version }));
    const poseReference = model.userData.poseRig.pose.value;
    const animation = createHologramPoseAnimation(model, { kind });
    assert.equal(animation.update(0.34), true);
    const pose = model.userData.poseRig.pose.value;
    const life = model.userData.poseRig.life.value;
    assert.ok([...pose.toArray(), ...life.toArray()].every(Number.isFinite));
    if (kind === 'attack') { assert.notEqual(pose.x, 0); assert.ok(life.z > 0); }
    if (kind === 'casting') assert.ok(pose.y < 0);
    if (kind === 'recoil') assert.ok(life.z < 0);
    if (kind === 'summon') { assert.ok(life.y < 1); assert.ok(life.x < 0); }
    for (let frame = 0; frame < 100; frame += 1) animation.update(frame / 101);
    assert.equal(model.userData.poseRig.pose.value, poseReference);
    assert.deepEqual(model.position.toArray(), positionBefore);
    assert.deepEqual(model.rotation.toArray(), rotationBefore);
    for (const { mesh, array, version } of references) {
      assert.equal(mesh.geometry.attributes.position.array, array);
      assert.equal(mesh.geometry.attributes.position.version, version);
    }
    assert.equal(animation.update(1), false);
    assert.deepEqual(pose.toArray(), [0, 0, 0, 0]);
    assert.deepEqual(life.toArray(), [0, 1, 0, 0]);
    assert.equal(animation.dispose(), true);
    assert.equal(animation.dispose(), false);
    release(model);
  }
});

test('new animation supersedes stale handles and reduced motion remains neutral', () => {
  const model = createHologramMonsterModel({ id: '46986414' });
  const first = createHologramPoseAnimation(model, { kind: 'attack' });
  first.update(0.3);
  const second = createHologramPoseAnimation(model, { kind: 'casting' });
  second.update(0.4);
  const pose = model.userData.poseRig.pose.value.toArray();
  assert.equal(first.update(0.8), false);
  first.dispose();
  assert.deepEqual(model.userData.poseRig.pose.value.toArray(), pose);
  const reduced = createHologramPoseAnimation(model, { kind: 'attack', reducedMotion: true });
  assert.equal(reduced.update(0.5), false);
  assert.deepEqual(model.userData.poseRig.pose.value.toArray(), [0, 0, 0, 0]);
  assert.deepEqual(model.userData.poseRig.life.value.toArray(), [0, 1, 0, 0]);
  second.dispose();
  reduced.dispose();
  release(model);
});

test('model material disposal also frees custom GPU shadow materials and invalidates pending poses', () => {
  const model = createHologramMonsterModel({ id: '89631139' });
  const shadowMesh = model.children.find(mesh => mesh.castShadow);
  let shadowDisposals = 0;
  shadowMesh.customDepthMaterial.addEventListener('dispose', () => { shadowDisposals += 1; });
  shadowMesh.customDistanceMaterial.addEventListener('dispose', () => { shadowDisposals += 1; });
  const animation = createHologramPoseAnimation(model, { kind: 'attack' });
  animation.update(0.4);
  release(model);
  assert.equal(shadowDisposals, 2);
  assert.equal(model.userData.poseRig.disposed, true);
  assert.equal(animation.update(0.6), false);
  assert.equal(model.userData.poseRig.dispose(), false);
});

test('flip, recovery and search effects have distinct geometry and release nested book resources', () => {
  for (const [id, part] of [['54652250', 'pincer-strike-1'], ['31560081', 'faith-restored-spellbook'], ['26202165', 'revealed-search-card']]) {
    const effect = createCombatVisualEffect({ kind: 'activate', card: { id }, source: [0, 1, 2], target: [0, 1, -2] });
    assert.ok(effect.group.getObjectByName(part));
    effect.update(0.4);
    const geometries = new Set();
    let disposals = 0;
    effect.group.traverse(value => { if (value.geometry) geometries.add(value.geometry); });
    assert.ok(geometries.size <= 20);
    geometries.forEach(geometry => geometry.addEventListener('dispose', () => { disposals += 1; }));
    effect.dispose();
    assert.equal(disposals, geometries.size);
  }
});
