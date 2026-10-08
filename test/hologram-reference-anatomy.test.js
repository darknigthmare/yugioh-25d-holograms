import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';
import { Color } from 'three';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { createHologramPoseAnimation, HOLOGRAM_JOINTS } from '../src/ui/HologramPoseAnimation.js';
import { resolveCombatVisualProfile, SUPPORTED_HOLOGRAM_MODEL_IDS } from '../src/ui/CombatVisualProfiles.js';
import { createCombatVisualEffect } from '../src/ui/CombatVisualEffects.js';

function release(model) {
  for (const mesh of model.children) { mesh.geometry.dispose(); mesh.material.dispose(); }
}
function containsColor(model, expected) {
  const reference = new Color(expected);
  return model.children.some(mesh => {
    const values = mesh.geometry.attributes.color.array;
    for (let i = 0; i < values.length; i += 3) {
      if (Math.abs(values[i] - reference.r) < 1e-5 && Math.abs(values[i + 1] - reference.g) < 1e-5 && Math.abs(values[i + 2] - reference.b) < 1e-5) return true;
    }
    return false;
  });
}

test('four iconic models consume checked illustration palettes with separate sculpted anatomy', async () => {
  const expected = [
    ['89631139', 'armored-blue-dragon', 'neck-collar-4', '#649bb2'],
    ['74677422', 'spiked-black-dragon', 'wing-1-edge-spike-2', '#303442'],
    ['46986414', 'armored-dark-magician', 'robe-spiral-1', '#178866'],
    ['38033121', 'dark-magician-girl', 'hair-long-lock-1', '#e4b748']
  ];
  for (const [id, anatomy, part, palette] of expected) {
    const model = createHologramMonsterModel({ id, name: 'localization does not select geometry' });
    assert.equal(model.userData.profile.anatomy, anatomy);
    assert.ok(model.userData.partNames.includes(part));
    assert.ok(containsColor(model, palette));
    assert.equal(model.userData.referenceArt, `/cards/cropped/${id}.jpg`);
    await access(new URL(`../public${model.userData.referenceArt}`, import.meta.url));
    assert.equal(model.children.length, 5);
    assert.ok(model.userData.triangleCount < 6000);
    assert.equal(model.userData.fidelity, 'procedural-interpretation');
    for (const mesh of model.children) {
      assert.equal(mesh.material.vertexColors, true);
      assert.equal(mesh.material.map, null, 'the illustration is an audit reference, never a standee texture');
      assert.equal(mesh.geometry.attributes.position.count, mesh.geometry.attributes.color.count);
      assert.equal(mesh.geometry.attributes.position.count, mesh.geometry.attributes.hologramJoint.count);
      assert.ok([...mesh.geometry.attributes.color.array].every(value => Number.isFinite(value) && value >= 0 && value <= 1));
      if (mesh.material.transparent) assert.equal(mesh.material.forceSinglePass, true, 'double-sided glow must not add a sixth color draw call');
    }
    release(model);
  }
});

test('new Field-rule participants have literal, distinctive bodies and matching attack profiles', () => {
  const expected = [
    ['20721928', 'sparkman-shoulder-gem-1', 'spark-bolt', 5],
    ['68638985', 'slime-toad-downturned-mouth', 'water', 5],
    ['39552864', 'shine-ball-opalescent-core', 'faith-light', 3]
  ];
  for (const [id, part, attack, calls] of expected) {
    assert.ok(SUPPORTED_HOLOGRAM_MODEL_IDS.includes(id));
    const model = createHologramMonsterModel({ id });
    assert.ok(model.userData.partNames.includes(part));
    assert.equal(resolveCombatVisualProfile({ kind: 'attack', card: { id } }).id, attack);
    assert.equal(model.children.length, calls);
    assert.ok(model.userData.triangleCount < 5000);
    const pose = createHologramPoseAnimation(model, { kind: 'attack' });
    assert.equal(pose.update(0.4), true);
    const versions = model.children.map(mesh => mesh.geometry.attributes.position.version);
    pose.update(0.7);
    assert.deepEqual(model.children.map(mesh => mesh.geometry.attributes.position.version), versions);
    pose.dispose();
    release(model);
  }
  const ball = createHologramMonsterModel({ id: '39552864' });
  assert.equal(ball.userData.partNames.some(name => /eye|face|limb/.test(name)), false, 'the source sphere has no invented face or limbs');
  const distinctColors = new Set();
  const values = ball.children.find(mesh => mesh.name.endsWith('-eye')).geometry.attributes.color.array;
  for (let i = 0; i < values.length; i += 3) distinctColors.add(values.slice(i, i + 3).join(','));
  assert.ok(distinctColors.size > 20, 'the pearl carries static color variation, rather than a featureless white core');
  release(ball);
});

test('refined right hand and ornaments follow the casting joint and palettes survive finite GPU poses', () => {
  const model = createHologramMonsterModel({ id: '46986414' });
  const counts = new Map();
  model.children.forEach(mesh => {
    for (const joint of mesh.geometry.attributes.hologramJoint.array) counts.set(joint, (counts.get(joint) || 0) + 1);
  });
  assert.ok(counts.get(HOLOGRAM_JOINTS.STAFF) > 400);
  const colors = model.children.map(mesh => mesh.geometry.attributes.color.array);
  const pose = createHologramPoseAnimation(model, { kind: 'casting' });
  for (let i = 0; i < 60; i += 1) pose.update(i / 60);
  model.children.forEach((mesh, index) => assert.equal(mesh.geometry.attributes.color.array, colors[index]));
  assert.equal(pose.update(1), false);
  assert.deepEqual(model.userData.poseRig.pose.value.toArray(), [0, 0, 0, 0]);
  pose.dispose();
  release(model);
});

test('three Field rule visuals are finite, distinct and dispose every geometry including roots', () => {
  const expected = [
    ['sanctuary-protection', 'sanctuary-golden-barrier'],
    ['skyscraper-boost', 'skyscraper-boost-arrow-5'],
    ['ancient-forest-destruction', 'ancient-forest-binding-root-4']
  ];
  for (const [profile, part] of expected) {
    const effect = createCombatVisualEffect({ profile, source: [1, .62, 3], target: [-1, .62, -3] });
    assert.equal(effect.profile.id, profile);
    assert.ok(effect.group.getObjectByName(part));
    assert.equal(effect.update(.45), true);
    assert.equal(effect.update(1), false);
    const geometries = new Set();
    effect.group.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
    let disposals = 0;
    geometries.forEach(geometry => geometry.addEventListener('dispose', () => { disposals += 1; }));
    effect.dispose();
    assert.equal(disposals, geometries.size);
    assert.equal(effect.dispose(), false);
  }
});

test('official Trap Monster participants use distinct sculpted silver and cobra anatomy within the duel budget', async () => {
  for (const [id, anatomy, landmarks, palette] of [
    ['26905245', 'metal-reflect-slime', ['metal-slime-continuous-folded-coil', 'metal-slime-central-spiked-sphere', 'metal-slime-silver-radial-spike-8', 'metal-slime-long-downward-silver-point'], ['#e4ebe8', '#9d9388']],
    ['28649820', 'armored-cobra-apophis', ['apophis-rear-raised-cobra-neck', 'apophis-rear-cobra-ivory-fang-1', 'apophis-purple-ventral-plate-7', 'sword-apophis-ivory-crescent-blade', 'apophis-guardian-red-eye-1'], ['#966084', '#ede2b9', '#d9a82e']]
  ]) {
    assert.ok(SUPPORTED_HOLOGRAM_MODEL_IDS.includes(id));
    const model = createHologramMonsterModel({ id, name: 'localized participant', type: 'Trap Monster' });
    assert.equal(model.userData.profile.anatomy, anatomy);
    for (const landmark of landmarks) assert.ok(model.userData.partNames.includes(landmark), `${id}: ${landmark}`);
    for (const color of palette) assert.ok(containsColor(model, color), `${id}: source palette ${color}`);
    await access(new URL(`../public${model.userData.referenceArt}`, import.meta.url));
    assert.ok(model.children.length <= 5);
    assert.ok(model.userData.triangleCount <= 6000);
    for (const mesh of model.children) {
      assert.equal(mesh.material.map, null);
      assert.equal(mesh.material.vertexColors, true);
      assert.ok([...mesh.geometry.attributes.position.array, ...mesh.geometry.attributes.normal.array].every(Number.isFinite));
      assert.equal(mesh.geometry.attributes.position.count, mesh.geometry.attributes.hologramJoint.count);
    }
    if (id === '26905245') assert.equal(model.userData.partNames.some(name => /(?:eye|face|wing|fish|leg)/.test(name)), false, 'the metallic source has no invented face or aquatic animal anatomy');
    if (id === '28649820') {
      const weaponVertices = model.children.flatMap(mesh => [...mesh.geometry.attributes.hologramJoint.array]).filter(value => value === HOLOGRAM_JOINTS.WEAPON);
      assert.ok(weaponVertices.length > 300, 'the crescent, grip, guard and actual right arm share the attacking joint');
    }
    const positions = model.children.map(mesh => mesh.geometry.attributes.position.version);
    const pose = createHologramPoseAnimation(model, { kind: 'attack' });
    for (const progress of [0, .25, .5, .8]) assert.equal(pose.update(progress), true);
    assert.deepEqual(model.children.map(mesh => mesh.geometry.attributes.position.version), positions, 'poses use the finite GPU rig without geometry uploads');
    assert.equal(pose.update(1), false);
    assert.deepEqual(model.userData.poseRig.pose.value.toArray(), [0, 0, 0, 0]);
    pose.dispose();
    const geometries = new Set(model.children.map(mesh => mesh.geometry));
    let geometryDisposals = 0;
    geometries.forEach(geometry => geometry.addEventListener('dispose', () => { geometryDisposals += 1; }));
    release(model);
    assert.equal(geometryDisposals, geometries.size);
    assert.equal(model.userData.poseRig.disposed, true, 'releasing the material also releases depth/distance rig resources');
  }
});
