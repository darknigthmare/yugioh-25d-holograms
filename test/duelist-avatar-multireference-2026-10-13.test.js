import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { getDuelistAvatar } from '../src/content/DuelistAvatarCatalog.js';
import { createDuelistAvatarModel } from '../src/ui/DuelistAvatarModels.js';

function points(mesh, predicate) {
  const { position, normal, color, skinIndex } = mesh.geometry.attributes;
  const selected = [];
  for (let index = 0; index < position.count; index += 1) {
    const point = {
      x: position.getX(index), y: position.getY(index) + mesh.parent.position.y,
      z: position.getZ(index) + mesh.parent.position.z,
      nz: normal.getZ(index), r: color.getX(index), g: color.getY(index), b: color.getZ(index),
      joint: skinIndex?.getX(index)
    };
    if (predicate(point)) selected.push(point);
  }
  return selected;
}

function hasTint(point, hex) {
  const color = new THREE.Color(hex);
  return Math.abs(point.r - color.r) < 1e-6 && Math.abs(point.g - color.g) < 1e-6 && Math.abs(point.b - color.b) < 1e-6;
}

test('the retained rear garment views have exterior FrontSide faces on both sides, including mirrored coat tails', () => {
  const samples = [
    ['kaiba', 'duelist-body-matte', 3.4, 0, 0.05],
    ['jaden', 'duelist-body-matte', 4, 0, 0.025],
    ['yugi', 'duelist-cloth-matte', 2.81, 0, 0.06],
    ['atem', 'duelist-cloth-matte', 3.03, 0, 0.06],
    ['kaiba', 'duelist-cloth-matte', 2.83, -0.435, 0.065],
    ['kaiba', 'duelist-cloth-matte', 2.83, 0.435, 0.065]
  ];
  for (const [id, meshName, rowY, columnX, thickness] of samples) {
    const model = createDuelistAvatarModel(id);
    const sample = points(model.group.getObjectByName(meshName), point =>
      Math.abs(point.x - columnX) < 1e-5 && Math.abs(point.y - rowY) < 1e-5 && point.z < -0.2);
    assert.ok(sample.length > 0, `${id}: retained rear row is real geometry`);
    const min = Math.min(...sample.map(point => point.z));
    const max = Math.max(...sample.map(point => point.z));
    assert.ok(Math.abs(max - min - thickness) < 1e-5, `${id}: closed garment thickness`);
    assert.ok(sample.filter(point => Math.abs(point.z - min) < 1e-5).every(point => point.nz < -0.8), `${id}: back exterior faces outward`);
    assert.ok(sample.filter(point => Math.abs(point.z - max) < 1e-5).every(point => point.nz > 0.8), `${id}: front exterior faces outward`);
    model.dispose();
  }
});

test('Pharaoh Atem keeps the short tunic, blue cape and bare upper arms documented by the licensed ancient costume', () => {
  const model = createDuelistAvatarModel('atem');
  assert.equal(model.group.userData.partNames.includes('flowing-robe'), false, 'no floor-length robe imported from the generic class');
  const cloth = model.group.getObjectByName('duelist-cloth-matte');
  const tunic = points(cloth, point => hasTint(point, '#f1e8da'));
  assert.ok(tunic.length > 0);
  assert.ok(tunic.every(point => point.y >= 2.06 && point.y <= 2.9), 'white tunic ends above the knee');
  assert.ok(points(cloth, point => hasTint(point, '#302d55') && point.z < -0.5).length > 0, 'blue cape has an actual rear volume');
  const body = model.group.getObjectByName('duelist-body-matte');
  for (const joint of [1, 5]) assert.ok(points(body, point => hasTint(point, '#c78d66') && point.joint === joint && point.y > 3.6).length > 0, 'bare upper arm moves with its shoulder');
  model.dispose();
});

test('Yuya uses the reviewed olive trousers and red front fringe without red rear crown locks', () => {
  const avatar = getDuelistAvatar('yuya');
  assert.equal(avatar.visual.bottomColor, '#526b31');
  const model = createDuelistAvatarModel('yuya');
  assert.ok(points(model.group.getObjectByName('duelist-body-matte'), point => hasTint(point, avatar.visual.bottomColor) && point.y < 2.5).length > 0);
  const red = points(model.group.getObjectByName('duelist-hair-matte'), point => hasTint(point, avatar.visual.hairAccent));
  assert.ok(red.length > 0);
  assert.ok(red.every(point => point.z > 0.2), 'red locks belong to the forehead, not alternating back spikes');
  model.dispose();
});

test('Playmaker retains his green and dark chest rather than a solid gold breastplate', () => {
  const model = createDuelistAvatarModel('playmaker');
  const matte = model.group.getObjectByName('duelist-body-matte');
  assert.ok(points(matte, point => hasTint(point, '#232b39') && point.y > 3.3 && point.y < 4.01 && point.z > 0.29).length > 0);
  const metal = model.group.getObjectByName('duelist-body-metal');
  assert.equal(points(metal, point => hasTint(point, getDuelistAvatar('playmaker').visual.accentColor) && point.y > 3.25 && point.y < 4 && Math.abs(point.x) < 0.4 && point.z > 0.32).length, 0);
  model.dispose();
});
