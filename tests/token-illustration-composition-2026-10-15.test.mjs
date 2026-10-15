import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getTokenPresentationProfile } from '../src/ui/TokenMonsterProfiles.js';
import { createDuelistIllustrationActor } from '../src/ui/DuelistIllustrationActor.js';
import { createTokenIllustrationComposition, getTokenIllustrationCompositionDefinition } from '../src/ui/TokenIllustrationComposition.js';
import { TokenModelAtlasPreview } from '../src/ui/TokenModelAtlasPreview.js';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { getTokenIllustrationFrame } from '../src/ui/HologramTokenIllustratedGroups.js';

const expected = [
  ['YGLD-ENTKN', ['Yami Yugi'], [[.513, .373]]],
  ['LDK2-ENT01', ['Yami Yugi', 'Dark Magician'], [[.695, .488], [.171, .408]]],
  ['LDK2-ENT02', ['Seto Kaiba', 'Blue-Eyes White Dragon'], [[.604, .368], [.179, .269]]],
  ['LDK2-ENT03', ['Joey Wheeler', 'Red-Eyes Black Dragon'], [[.644, .403], [.275, .373]]]
];
const make = edition => createTokenIllustrationComposition(getTokenPresentationProfile(`commemorative:${edition}`), { createDuelistIllustrationActor, reducedMotion: true });

test('printed scenes contain all illustrated people and monsters as separate actual geometry', () => {
  for (const [edition, names] of expected) {
    const composition = make(edition);
    try {
      assert.deepEqual(composition.subjects.map(subject => subject.name), names);
      assert.equal(composition.group.userData.subjectCount, names.length);
      const owned = new Set();
      for (const subject of composition.subjects) {
        let triangles = 0;
        subject.group.traverse(object => {
          if (!object.geometry) return;
          assert.equal(owned.has(object.geometry), false, 'each subject has its own geometry');
          owned.add(object.geometry);
          triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3;
        });
        assert.ok(triangles > 3000, `${subject.name} has visible model geometry`);
      }
      assert.equal(composition.subjects[0].role, 'duelist');
      if (names.length === 2) {
        assert.equal(composition.subjects[1].role, 'monster');
        assert.ok(composition.subjects[1].group.position.z < composition.subjects[0].group.position.z, 'monster remains behind the duelist');
        assert.ok(!composition.subjects[1].group.userData.partNames.some(name => name.startsWith('projection-')));
      }
      const profile = getTokenPresentationProfile(`commemorative:${edition}`);
      for (const key of ['cardId', 'nativeCode', 'atk', 'def', 'race', 'attribute', 'level']) assert.equal(profile[key], null);
    } finally { composition.dispose(); }
  }
});

test('actual subject face anchors project to the independently traced positions on each print', () => {
  for (const [edition, , facePoints] of expected) {
    const composition = make(edition);
    try {
      const { left, right, top, bottom } = composition.framing;
      composition.group.updateMatrixWorld(true);
      composition.subjects.forEach((subject, index) => {
        const actual = subject.group.localToWorld(new THREE.Vector3(...subject.group.userData.illustrationLandmarks.head));
        const u = (actual.x - left) / (right - left), v = (top - actual.y) / (top - bottom);
        assert.ok(Math.abs(u - facePoints[index][0]) < 1e-6, `${edition} ${subject.name}: horizontal position`);
        assert.ok(Math.abs(v - facePoints[index][1]) < 1e-6, `${edition} ${subject.name}: vertical position`);
      });
    } finally { composition.dispose(); }
  }
});

test('dragon charges remain attached to the posed muzzle rather than a catalogue-wide shared coordinate', () => {
  const anchors = [];
  for (const edition of ['LDK2-ENT02', 'LDK2-ENT03']) {
    const composition = make(edition);
    try {
      const monster = composition.subjects.find(subject => subject.role === 'monster').group;
      const mouth = monster.localToWorld(new THREE.Vector3(...monster.userData.illustrationLandmarks.mouth));
      const charge = composition.group.getObjectByName(`${edition}-illustrated-mouth-charge`);
      assert.ok(charge?.geometry.attributes.position.count > 100);
      assert.ok(mouth.distanceTo(charge.getWorldPosition(new THREE.Vector3())) < 1e-7);
      anchors.push(mouth);
    } finally { composition.dispose(); }
  }
  assert.ok(anchors[0].distanceTo(anchors[1]) > .25, 'the two different illustrated mouths have independent anchors');
  for (const edition of ['YGLD-ENTKN', 'LDK2-ENT01']) {
    const composition = make(edition);
    assert.equal(composition.group.getObjectByName(`${edition}-illustrated-mouth-charge`), undefined);
    composition.dispose();
  }
});

test('static illustrated poses survive recenter and reduced motion without geometry uploads or idle motion', () => {
  for (const [edition] of expected) {
    const composition = make(edition);
    try {
      const snapshots = [];
      composition.group.traverse(object => {
        if (object.geometry) snapshots.push({ object, geometry: object.geometry, attributes: Object.entries(object.geometry.attributes).map(([name, attribute]) => ({ name, attribute, array: attribute.array, values: Array.from(attribute.array), version: attribute.version })) });
      });
      const before = composition.subjects.map(subject => subject.group.matrixWorld.toArray());
      composition.group.rotation.y = 1.2;
      assert.equal(composition.update(100), false);
      assert.equal(composition.resetPose(), true);
      assert.equal(composition.group.rotation.y, 0);
      assert.deepEqual(composition.subjects.map(subject => subject.group.matrixWorld.toArray()), before);
      for (const snapshot of snapshots) {
        assert.equal(snapshot.object.geometry, snapshot.geometry);
        for (const item of snapshot.attributes) {
          assert.equal(snapshot.geometry.getAttribute(item.name), item.attribute);
          assert.equal(item.attribute.array, item.array);
          assert.equal(item.attribute.version, item.version);
          assert.deepEqual(Array.from(item.attribute.array), item.values);
        }
      }
    } finally { composition.dispose(); }
  }
});

test('all model buffers remain finite and their transformed normals retain unit length', () => {
  for (const [edition] of expected) {
    const composition = make(edition);
    try {
      composition.group.traverse(object => {
        if (!object.geometry) return;
        const positions = object.geometry.getAttribute('position'), normals = object.geometry.getAttribute('normal');
        assert.ok(Array.from(positions.array).every(Number.isFinite));
        if (normals) for (let i = 0; i < normals.count; i++) {
          const length = Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i));
          assert.ok(Math.abs(length - 1) < .0002, `${edition} ${object.name}: normal ${i}`);
        }
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) assert.equal(material.clippingPlanes.length, 4);
      });
    } finally { composition.dispose(); }
  }
});

test('composition owns and disposes every subject and VFX resource once, without invalidating another instance', () => {
  const first = make('LDK2-ENT01'), second = make('LDK2-ENT01');
  const resources = new Set(), counts = new Map();
  first.group.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) resources.add(material);
  });
  resources.forEach(resource => resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1)));
  const rig = first.subjects.find(subject => subject.role === 'monster').group.userData.poseRig;
  assert.equal(first.dispose(), true);
  assert.equal(first.dispose(), false);
  assert.equal(first.disposed, true);
  assert.equal(rig.disposed, true);
  assert.equal(first.group.children.length, 0);
  assert.equal(first.update(50), false);
  assert.equal(first.resetPose(), false);
  resources.forEach(resource => assert.equal(counts.get(resource), 1));
  second.group.traverse(object => { if (object.geometry) assert.equal(resources.has(object.geometry), false); });
  assert.equal(second.resetPose(), true);
  second.dispose();
});

test('unsupported and forged compositions are rejected before constructing any human resources', () => {
  let calls = 0;
  const create = () => { calls++; throw new Error('Unexpected construction'); };
  for (const presentationId of ['__proto__', 'constructor', 'unknown', null]) {
    const profile = { presentationId, kind: 'decorative', modelKind: 'duelist-avatar' };
    assert.equal(getTokenIllustrationCompositionDefinition(profile), null);
    assert.throws(() => createTokenIllustrationComposition(profile, { createDuelistIllustrationActor: create }), /Verified illustration/);
  }
  const profile = getTokenPresentationProfile('commemorative:LDK2-ENT01');
  for (const change of [{ avatarId: 'kaiba' }, { cardId: '46986414' }, { kind: 'duel' }, { tokenAnatomy: 'invented' }]) {
    assert.equal(getTokenIllustrationCompositionDefinition({ ...profile, ...change }), null);
  }
  const definition = getTokenIllustrationCompositionDefinition(profile);
  assert.ok(Object.isFrozen(definition) && Object.isFrozen(definition.subjects) && Object.isFrozen(definition.monster.head));
  assert.equal(calls, 0);
});

test('the two group illustrations get an Atlas-only orthographic crop while duel geometry keeps its pedestal', () => {
  const host = { isConnected: true, clientWidth: 420, clientHeight: 530, dataset: {} };
  let renders = 0;
  const renderer = { domElement: { dataset: {}, setAttribute() {}, remove() {} }, setSize() {}, render() { renders++; }, dispose() {}, forceContextLoss() {} };
  const preview = Object.assign(Object.create(TokenModelAtlasPreview.prototype), {
    host, document: { hidden: false }, window: {}, disposed: false, visible: true, intersecting: true,
    defense: false, angle: 0, model: null, listeners: [], pointer: null,
    scene: new THREE.Scene(), floor: new THREE.Mesh(new THREE.CircleGeometry(2, 12), new THREE.MeshStandardMaterial()), renderer
  });
  preview.scene.add(preview.floor);
  try {
    for (const code of ['43664495', '58371672']) {
      const profile = getTokenPresentationProfile(`duel:${code}`);
      const duel = createHologramMonsterModel({ id: code, isToken: true, type: 'Token Monster' });
      const duelCount = duel.userData.triangleCount;
      preview.setAvatar(profile.presentationId);
      assert.equal(preview.camera.isOrthographicCamera, true);
      assert.equal(preview.floor.visible, false);
      assert.equal(host.dataset.tokenModelKind, 'token-monster');
      assert.equal(host.dataset.tokenCardId, code);
      assert.equal(host.dataset.tokenIllustrationFrame, 'true');
      assert.equal(host.dataset.tokenSubjectCount, code === '43664495' ? '30' : '7');
      const frame = getTokenIllustrationFrame(code);
      assert.equal(preview.camera.position.x, (frame.left + frame.right) / 2);
      assert.equal(preview.camera.position.y, (frame.top + frame.bottom) / 2);
      assert.ok(Math.abs((preview.camera.right - preview.camera.left) / (preview.camera.top - preview.camera.bottom) - host.clientWidth / host.clientHeight) < 1e-12);
      preview.model.traverse(object => {
        const joint = object.geometry?.getAttribute('hologramJoint');
        if (joint) for (const value of joint.array) assert.notEqual(value, 6);
      });
      assert.ok(duel.userData.partNames.includes('projection-circle'));
      assert.equal(duel.userData.triangleCount, duelCount);
      assert.equal(duel.userData.poseRig.disposed, false);
      assert.equal(preview.setPose('defense'), true);
      assert.equal(host.dataset.tokenPose, 'defense');
      preview.intersecting = false;
      const before = renders;
      preview.rotateBy(.1);
      assert.equal(renders, before, 'off-screen interactions cause no draw');
      preview.intersecting = true;
      duel.userData.poseRig.dispose();
      duel.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
      preview.setPose('attack');
    }
    preview.setAvatar('duel:73915052');
    assert.equal(preview.camera.isPerspectiveCamera, true);
    assert.equal(preview.floor.visible, true);
    assert.equal(host.dataset.tokenIllustrationFrame, 'false');
    assert.ok(preview.model.userData.partNames.includes('projection-circle'));
    assert.equal(getTokenIllustrationFrame('__proto__'), null);
    assert.equal(getTokenIllustrationFrame('73915052'), null);
  } finally { preview.dispose(); }
});
