import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry, FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { FIELD_REFERENCE_DETAIL_IDS } from '../src/ui/FieldReferenceDetailGeometry.js';
import { FIELD_CONTINUATION_DETAIL_IDS, FIELD_CONTINUATION_DETAIL_SCOPE, createContinuationStageDetails } from '../src/ui/FieldContinuationStageDetails.js';
import { FIELD_SPELL_REFERENCE_ART_SNAPSHOT } from '../src/ui/FieldSpellReferenceArtSnapshot.js';

const create = id => createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE, getFieldEnvironmentForCardId(id));
const detailMeshes = group => group.children.filter(mesh => mesh.geometry?.userData.detailParts);
const parts = group => detailMeshes(group).flatMap(mesh => mesh.geometry.userData.detailParts);
const named = (group, name) => parts(group).filter(part => part.name === name);

test('the six further stage sculptures retain immutable source JPEGs, public scenery and precise remaining limits', () => {
  assert.deepEqual(FIELD_REFERENCE_DETAIL_IDS, ['67616300', '81380218', '63883999']);
  assert.equal(createContinuationStageDetails('unsupported'), false);
  for (const id of FIELD_CONTINUATION_DETAIL_IDS) {
    const archived = FIELD_SPELL_REFERENCE_ART_SNAPSHOT.entries.find(entry => entry.cardId === id);
    const bytes = readFileSync(new URL(`../public${archived.assetPath}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), archived.sha256);
    assert.equal(bytes.length, archived.bytes);
    const group = create(id), detail = group.userData.referenceDetail;
    assert.equal(group.userData.fidelity, 'reference-informed-geometry');
    assert.equal(group.userData.publicOnly, true);
    assert.equal(detail.fidelity, 'source-inspected-adapted-sculpture');
    assert.equal(detail.sourceUrl, archived.sourceUrl);
    assert.deepEqual(detail.features, FIELD_CONTINUATION_DETAIL_SCOPE[id].features);
    assert.equal(detail.limits, FIELD_CONTINUATION_DETAIL_SCOPE[id].limits);
    assert.ok(Object.isFrozen(detail) && Object.isFrozen(detail.groups));
    assert.equal(detail.primitiveCount, parts(group).length);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('the added silhouettes are closed outward sculpture, clear of every playable zone and within the existing GPU budgets', () => {
  const corridor = new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min), new THREE.Vector3(...budget.playableCorridor.max));
  for (const id of FIELD_CONTINUATION_DETAIL_IDS) {
    const group = create(id);
    assert.ok(group.userData.referencePrimitiveCount <= budget.maxPrimitiveCount, `${id}: true pre-merge primitives`);
    assert.ok(group.userData.drawCallCount <= budget.maxDrawCallCount);
    assert.ok(group.userData.materialCount <= budget.maxMaterialCount);
    for (const mesh of detailMeshes(group)) {
      assert.equal(mesh.isInstancedMesh, true);
      assert.equal(mesh.material.map, null, 'new details cannot substitute an illustration billboard');
      const geometry = mesh.geometry, position = geometry.attributes.position, index = geometry.index.array;
      for (const key of ['position', 'normal', 'color']) {
        assert.equal(geometry.attributes[key].count, position.count);
        assert.ok(Array.from(geometry.attributes[key].array).every(Number.isFinite));
      }
      for (const part of geometry.userData.detailParts) {
        const bounds = new THREE.Box3(new THREE.Vector3(...part.bounds.min), new THREE.Vector3(...part.bounds.max));
        assert.equal(bounds.intersectsBox(corridor), false, `${id}/${part.name}`);
        for (const axis of ['x', 'z']) assert.ok(Math.max(Math.abs(bounds.min[axis]), Math.abs(bounds.max[axis])) < budget.maxHorizontalExtent);
        let signedVolume = 0;
        const edges = new Map(), key = i => [position.getX(i), position.getY(i), position.getZ(i)].map(v => Math.round(v * 10000)).join(',');
        for (let i = part.indexOffset; i < part.indexOffset + part.indexCount; i += 3) {
          for (const at of [i, i + 1, i + 2]) assert.ok(index[at] >= part.vertexOffset && index[at] < part.vertexOffset + part.vertexCount);
          const a = new THREE.Vector3().fromBufferAttribute(position, index[i]);
          const b = new THREE.Vector3().fromBufferAttribute(position, index[i + 1]);
          const c = new THREE.Vector3().fromBufferAttribute(position, index[i + 2]);
          signedVolume += a.dot(b.cross(c)) / 6;
          const vertices = [key(index[i]), key(index[i + 1]), key(index[i + 2])];
          if (new Set(vertices).size < 3) continue;
          for (let edge = 0; edge < 3; edge++) {
            const from = vertices[edge], to = vertices[(edge + 1) % 3], ordered = from < to;
            const name = ordered ? from + '/' + to : to + '/' + from, record = edges.get(name) || { count: 0, orientation: 0 };
            record.count++; record.orientation += ordered ? 1 : -1; edges.set(name, record);
          }
        }
        assert.ok(signedVolume > .000001, `${id}/${part.name}: outward signed volume ${signedVolume}`);
        for (const edge of edges.values()) {
          assert.equal(edge.count, 2, `${id}/${part.name}: open/non-manifold shell`);
          assert.equal(edge.orientation, 0, `${id}/${part.name}: inconsistent face winding`);
        }
      }
    }
    disposeFieldEnvironmentGeometry(group);
  }
});

test('museum sculpture distinguishes an elongated toothed fossil from the preserved empty mirror and museum arches', () => {
  const group = create('7617062');
  const snout = named(group, 'fossil-long-upper-snout')[0];
  assert.ok(snout.bounds.max[0] - snout.bounds.min[0] > 11);
  assert.equal(named(group, 'fossil-nine-upper-pointed-teeth').length, 9);
  assert.equal(named(group, 'fossil-seven-lower-pointed-teeth').length, 7);
  assert.equal(named(group, 'fossil-four-neck-vertebrae').length, 4);
  assert.equal(named(group, 'mirror-two-gold-scrolls').length, 2);
  assert.equal(named(group, 'relic-seven-scattered-gold-shards').length, 7);
  assert.ok(group.children.some(mesh => mesh.userData.instanceNames.includes('museum-gilded-oval-mirror-frame')));
  disposeFieldEnvironmentGeometry(group);
});

test('restaurant, P.U.N.K. and the three light stages each preserve their landmarks while gaining different source motifs', () => {
  const expected = {
    '15388353': [['restaurant-six-window-center-mullions', 6], ['restaurant-fourteen-gate-gold-finials', 14], ['restaurant-sign-gold-fish-body', 1]],
    '49370016': [['punk-twenty-four-cyan-beveled-panel-edges', 24], ['punk-six-green-driver-dust-caps', 6], ['punk-twenty-yellow-neon-tube-bands', 20]],
    '63492244': [['arena-four-white-oval-logo-eyes', 4], ['arena-six-small-lower-pink-logo-lobes', 6], ['arena-forty-border-blossom-petals', 40]],
    '51208046': [['live-domed-pink-skull-head', 1], ['live-two-pale-pink-oval-skull-eyes', 2], ['live-three-lower-pink-skull-teeth', 3], ['live-heart-nose-downward-point', 1]],
    '35371948': [['light-stage-twenty-four-multicolor-bouquet-jewels', 24], ['light-stage-ten-gold-column-scrolls', 10], ['light-stage-eight-crest-pointed-leaves', 8]]
  };
  for (const [id, checks] of Object.entries(expected)) {
    const group = create(id);
    for (const [name, count] of checks) assert.equal(named(group, name).length, count, id + '/' + name);
    assert.equal(group.userData.hasDedicatedLandmark, true);
    assert.ok(group.children.some(mesh => !mesh.geometry.userData.detailParts), 'original scenery is preserved');
    disposeFieldEnvironmentGeometry(group);
  }
});

test('every allocated continuation detail, unused source shape, material and GPU instance is disposed exactly once', () => {
  for (const id of FIELD_CONTINUATION_DETAIL_IDS) {
    const tracked = new Map(), bounded = { ...FIELD_GEOMETRY_THREE };
    for (const key of ['MeshStandardMaterial', 'BufferGeometry', 'BoxGeometry', 'DodecahedronGeometry', 'ConeGeometry', 'CylinderGeometry', 'IcosahedronGeometry', 'TorusGeometry', 'SphereGeometry', 'InstancedMesh']) {
      const Base = bounded[key];
      bounded[key] = class extends Base { constructor(...args) { super(...args); tracked.set(this, 0); this.addEventListener('dispose', () => tracked.set(this, tracked.get(this) + 1)); } };
    }
    const group = createFieldEnvironmentGeometry(bounded, getFieldEnvironmentForCardId(id));
    disposeFieldEnvironmentGeometry(group); disposeFieldEnvironmentGeometry(group);
    for (const [resource, count] of tracked) assert.equal(count, 1, `${id}/${resource.type}`);
    assert.equal(group.children.length, 0);
  }
});
