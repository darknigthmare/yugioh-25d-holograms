import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { DUELIST_AVATARS } from '../src/content/DuelistAvatarCatalog.js';
import { createDuelistAvatarModel } from '../src/ui/DuelistAvatarModels.js';

test('every denser avatar retains finite unit normals and valid rigid skinning', () => {
  for (const avatar of DUELIST_AVATARS) {
    const model = createDuelistAvatarModel(avatar.id);
    assert.equal(model.group.userData.fidelityVersion, 2);
    model.group.traverse(mesh => {
      if (!mesh.geometry) return;
      const { position, normal, skinIndex, skinWeight } = mesh.geometry.attributes;
      for (let i = 0; i < position.count; i += 1) {
        assert.ok(Number.isFinite(position.getX(i)) && Number.isFinite(position.getY(i)) && Number.isFinite(position.getZ(i)), avatar.id);
        const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
        assert.ok(Math.abs(length - 1) < 1e-5, `${avatar.id}: unit vertex normal`);
        if (mesh.isSkinnedMesh) {
          assert.ok(Number.isInteger(skinIndex.getX(i)) && skinIndex.getX(i) >= 0 && skinIndex.getX(i) <= 7, avatar.id);
          assert.equal(skinWeight.getX(i), 1);
          assert.equal(skinWeight.getY(i) + skinWeight.getZ(i) + skinWeight.getW(i), 0);
        } else assert.equal(skinIndex, undefined);
      }
    });
    model.dispose();
  }
});

test('human faces have tapered jaw geometry and outlined sclera while animal adaptations keep their muzzle', () => {
  for (const avatar of DUELIST_AVATARS) {
    const model = createDuelistAvatarModel(avatar.id);
    const animal = ['cat', 'dog'].includes(avatar.visual.species);
    for (const side of [-1, 1]) {
      assert.equal(model.group.userData.partNames.includes(`eye-lid-outline-${side}`), !animal, avatar.id);
      assert.ok(model.group.userData.partNames.includes(`ear-concha-${side}`), avatar.id);
    }
    if (!animal) {
      const mesh = model.group.getObjectByName('duelist-head-matte');
      const positions = mesh.geometry.attributes.position;
      const jaw = [];
      for (let i = 0; i < positions.count; i += 1) {
        const y = positions.getY(i) + mesh.parent.position.y;
        if (y > 4.315 && y < 4.33) jaw.push(Math.abs(positions.getX(i)));
      }
      assert.ok(jaw.length > 0 && Math.max(...jaw) < 0.04, `${avatar.id}: pointed chin rather than an added round lower face`);
    }
    model.dispose();
  }
});

test('reference-backed hero shapes preserve their identifying clothing, hair and ornaments', () => {
  const parts = {
    yugi: ['yugi-high-school-collar--1', 'gold-temple-lock-1', 'puzzle-eye-outline'],
    atem: ['millennium-puzzle', 'ceremonial-neck-collar', 'earring-1'],
    kaiba: ['kaiba-combed-fringe-8', 'kaiba-red-coat-lining-1', 'forearm-1-kaiba-buckle-2', 'kaiba-card-pendant'],
    joey: ['joey-back-lock-1', 'joey-white-tee'],
    bakura: ['bakura-millennium-ring', 'bakura-ring-pointer-4'],
    'yami-bakura': ['bakura-millennium-ring', 'bakura-ring-triangle'],
    marik: ['earring-1', 'forearm--1-ceremonial-gold-band'],
    jaden: ['jaden-orange-crown-1', 'jaden-slifer-collar--1'],
    yusei: ['yusei-cheek-marker', 'shoulder-1-yusei-orange-pad'],
    yuma: ['yuma-duel-gazer-frame', 'yuma-emperor-key-stem'],
    yuya: ['yuya-forehead-cowlick', 'yuya-performer-shoulder-cape-1'],
    playmaker: ['playmaker-gold-headcrest-1', 'playmaker-purple-headcrest-inset--1'],
    yuga: ['yuga-white-hood-1', 'yuga-cargo-short-pocket--1'],
    yudias: ['yudias-red-coat-lining-1', 'yudias-mantle-gold-braid--1', 'yudias-crossed-coat-strap']
  };
  for (const [id, expected] of Object.entries(parts)) {
    const model = createDuelistAvatarModel(id);
    for (const part of expected) assert.ok(model.group.userData.partNames.includes(part), `${id}: ${part}`);
    model.dispose();
  }
});

test('Yuma wears one Duel Gazer at eye level and retains an unobstructed second eye', () => {
  const model = createDuelistAvatarModel('yuma');
  assert.ok(model.group.userData.partNames.includes('yuma-duel-gazer-lens'));
  assert.equal(model.group.userData.partNames.some(name => name.startsWith('goggle-lens-')), false);
  const tint = new THREE.Color('#64b894');
  const mesh = model.group.getObjectByName('duelist-head-eye');
  const { color, position } = mesh.geometry.attributes;
  let count = 0;
  for (let i = 0; i < color.count; i += 1) if (Math.abs(color.getX(i) - tint.r) < 1e-6 && Math.abs(color.getY(i) - tint.g) < 1e-6 && Math.abs(color.getZ(i) - tint.b) < 1e-6) {
    assert.ok(position.getX(i) > 0, 'single left-eye lens');
    const y = position.getY(i) + mesh.parent.position.y;
    assert.ok(y >= 4.84 && y <= 5.15, 'eye-level lens rather than forehead goggles');
    count += 1;
  }
  assert.ok(count > 0);
  model.dispose();
});

test('Playmaker hand signals remain attached to their wrist joints through attack gestures', () => {
  const model = createDuelistAvatarModel('playmaker');
  const mesh = model.group.getObjectByName('duelist-body-eye');
  const tint = new THREE.Color('#eeae47');
  const { color, skinIndex, position } = mesh.geometry.attributes;
  const selected = [];
  for (let i = 0; i < color.count; i += 1) if (Math.abs(color.getX(i) - tint.r) < 1e-6 && Math.abs(color.getY(i) - tint.g) < 1e-6 && Math.abs(color.getZ(i) - tint.b) < 1e-6) {
    assert.ok([3, 7].includes(skinIndex.getX(i)), 'hand detail is rigidly attached to a wrist');
    selected.push(i);
  }
  assert.equal(new Set(selected.map(i => skinIndex.getX(i))).size, 2);
  model.group.updateMatrixWorld(true);
  const vertex = index => mesh.localToWorld(mesh.applyBoneTransform(index, new THREE.Vector3().fromBufferAttribute(position, index)));
  const before = vertex(selected[0]);
  model.update(0);
  model.playGesture('attack', { strength: 1 });
  model.update(0.4);
  model.group.updateMatrixWorld(true);
  assert.ok(vertex(selected[0]).distanceTo(before) > 0.03);
  model.dispose();
});
