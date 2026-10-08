import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE as applicationThree } from '../src/ui/FieldGeometryThree.js';
import {
  createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET
} from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import {
  ARCHITECTURAL_CARD_LANDMARKS, ARCHITECTURAL_INSPECTED_ART_PROFILES
} from '../src/ui/FieldEnvironmentArchitecturalReferences.js';

const ids = Object.keys(ARCHITECTURAL_CARD_LANDMARKS);
// Exercise the real production constructor whitelist rather than the complete
// test namespace, which could otherwise hide a browser-only constructor error.
const create = id => createFieldEnvironmentGeometry(applicationThree, getFieldEnvironmentForCardId(id));
const corridor = new THREE.Box3(new THREE.Vector3(...FIELD_ENVIRONMENT_GEOMETRY_BUDGET.playableCorridor.min),
  new THREE.Vector3(...FIELD_ENVIRONMENT_GEOMETRY_BUDGET.playableCorridor.max));

function instances(group, name) {
  const results = [];
  group.traverse(object => {
    if (!object.isInstancedMesh) return;
    object.userData.instanceNames.forEach((instanceName, index) => {
      if (instanceName !== name) return;
      const matrix = new THREE.Matrix4();
      object.getMatrixAt(index, matrix);
      results.push({ object, matrix });
    });
  });
  return results;
}

test('twelve reference constructions work with the production Three namespace and keep each instance outside the duel', () => {
  assert.equal(ids.length, 12);
  for (const id of ids) {
    const group = create(id);
    assert.equal(group.userData.fidelity, 'reference-informed-geometry');
    assert.equal(group.userData.inspectedArt, ARCHITECTURAL_INSPECTED_ART_PROFILES[id]);
    assert.ok(group.userData.meshCount < FIELD_ENVIRONMENT_GEOMETRY_BUDGET.maxPrimitiveCount, id);
    assert.ok(group.userData.drawCallCount <= FIELD_ENVIRONMENT_GEOMETRY_BUDGET.maxDrawCallCount, id);
    assert.ok(group.userData.materialCount <= FIELD_ENVIRONMENT_GEOMETRY_BUDGET.maxMaterialCount, id);
    group.updateMatrixWorld(true);
    group.traverse(object => {
      if (!object.isMesh) return;
      assert.equal(object.isInstancedMesh, true, id);
      assert.equal(object.material.map, null, `${id}: scenery uses no hidden card texture`);
      object.geometry.computeBoundingBox();
      for (let index = 0; index < object.count; index += 1) {
        const matrix = new THREE.Matrix4(); object.getMatrixAt(index, matrix); matrix.premultiply(object.matrixWorld);
        const bounds = object.geometry.boundingBox.clone().applyMatrix4(matrix);
        const name = object.userData.instanceNames[index];
        assert.equal(bounds.intersectsBox(corridor), false, `${id}/${name}`);
        assert.ok(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x), Math.abs(bounds.min.z), Math.abs(bounds.max.z)) < 48, `${id}/${name}`);
      }
      for (const attributeName of ['position', 'normal']) {
        for (const value of object.geometry.attributes[attributeName].array) assert.equal(Number.isFinite(value), true, `${id}/${attributeName}`);
      }
      const positions = object.geometry.attributes.position;
      if (object.geometry.index) for (const index of object.geometry.index.array) assert.ok(index >= 0 && index < positions.count, id);
      else assert.equal(positions.count % 3, 0, `${id}: non-indexed triangle count`);
    });
    disposeFieldEnvironmentGeometry(group);
  }
});

test('castle roofs have curved raised eaves and Village has continuous twisted trunks rather than family towers', () => {
  for (const [id, roofName, roofCount] of [
    ['11102908', 'shien-upswept-roof', 4], ['53819808', 'six-temple-upswept-roof', 3]
  ]) {
    const group = create(id), roofs = instances(group, roofName);
    assert.equal(roofs.length, roofCount);
    for (const { object } of roofs) {
      const curve = object.geometry.userData.continuousCurve;
      assert.ok(curve[0][1] > curve[Math.floor(curve.length / 2)][1] + 1);
      assert.ok(curve.at(-1)[1] > curve[Math.floor(curve.length / 2)][1] + 1);
      const positions = object.geometry.attributes.position, centers = [], edges = [];
      for (let i = 0; i < positions.count; i += 1) {
        if (Math.abs(positions.getX(i)) > 0.001) continue;
        (Math.abs(positions.getZ(i) + 32) < 0.001 ? centers : edges).push(positions.getY(i));
      }
      assert.ok(Math.max(...centers) > Math.max(...edges) + 1.3, `${id}: raised physical center ridge`);
    }
    disposeFieldEnvironmentGeometry(group);
  }
  const village = create('68462976');
  assert.equal(instances(village, 'village-round-plaster-home').length, 4);
  for (const { object } of instances(village, 'village-twisted-trunk')) {
    const xs = object.geometry.userData.continuousCurve.map(point => point[0]);
    assert.ok(Math.max(...xs) - Math.min(...xs) > 1.4);
  }
  assert.equal(instances(village, 'tower').length, 0);
  assert.equal(instances(village, 'fluted-column').length, 0);
  disposeFieldEnvironmentGeometry(village);
});

test('Saber has a truly pointed suspended blade and Spellbook has a continuous climbing silver spiral', () => {
  const saber = create('73787254');
  const blade = instances(saber, 'saber-suspended-pointed-sword')[0].object.geometry;
  const positions = blade.attributes.position;
  const minY = Math.min(...Array.from({ length: positions.count }, (_, i) => positions.getY(i)));
  const tipXs = Array.from({ length: positions.count }, (_, i) => positions.getY(i) <= minY + 0.001 ? Math.abs(positions.getX(i)) : null).filter(x => x !== null);
  assert.ok(tipXs.every(x => x < 0.001));
  assert.ok(Math.max(...Array.from({ length: positions.count }, (_, i) => Math.abs(positions.getX(i)))) > 0.31);
  disposeFieldEnvironmentGeometry(saber);
  const spellbook = create('33981008');
  const curve = instances(spellbook, 'spellbook-continuous-silver-spiral')[0].object.geometry.userData.continuousCurve;
  assert.ok(curve.at(-1)[1] - curve[0][1] > 17.9);
  for (let i = 1; i < curve.length; i += 1) assert.ok(new THREE.Vector3(...curve[i]).distanceTo(new THREE.Vector3(...curve[i - 1])) < 1.3);
  assert.equal(instances(spellbook, 'spellbook-turquoise-orbit').length, 4);
  disposeFieldEnvironmentGeometry(spellbook);
});

test('Summon Breaker places its red OFF lever in front of the panel and Extra Net retains curved crossing strands', () => {
  const breaker = create('18114794');
  const panel = instances(breaker, 'summon-breaker-gray-switch-panel')[0];
  const lever = instances(breaker, 'summon-breaker-red-off-lever')[0];
  panel.object.geometry.computeBoundingBox(); lever.object.geometry.computeBoundingBox();
  const panelBounds = panel.object.geometry.boundingBox.clone().applyMatrix4(panel.matrix);
  const leverBounds = lever.object.geometry.boundingBox.clone().applyMatrix4(lever.matrix);
  assert.ok(leverBounds.max.z > panelBounds.max.z + 1);
  assert.equal(instances(breaker, 'summon-breaker-off-letter-o').length, 2);
  assert.equal(instances(breaker, 'summon-breaker-off-letter-f').length, 12);
  disposeFieldEnvironmentGeometry(breaker);
  const net = create('95376428');
  const curves = instances(net, 'extra-net-curved-cyan-strand');
  assert.equal(curves.length, 4);
  for (const { object } of curves) {
    const curve = object.geometry.userData.continuousCurve;
    const middle = curve[Math.floor(curve.length / 2)];
    assert.ok(middle[1] > curve[0][1] + 2.3);
    assert.ok(middle[2] < curve[0][2] - 1.9);
  }
  assert.equal(instances(net, 'extra-net-crossing-cyan-strand').length, 9);
  disposeFieldEnvironmentGeometry(net);
});

test('replacing each new reference releases its materials, deformed buffers and instance resources exactly once', () => {
  for (const id of ids) {
    const group = create(id), resources = new Set();
    group.traverse(object => {
      if (!object.isMesh) return;
      resources.add(object); resources.add(object.geometry); resources.add(object.material);
    });
    const counts = new Map();
    for (const resource of resources) {
      counts.set(resource, 0);
      resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
    }
    disposeFieldEnvironmentGeometry(group); disposeFieldEnvironmentGeometry(group);
    for (const count of counts.values()) assert.equal(count, 1, id);
  }
});
