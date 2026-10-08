import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry, FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { FIELD_REFERENCE_DETAIL_IDS, FIELD_REFERENCE_DETAIL_SCOPE, createFieldReferenceDetailGeometry } from '../src/ui/FieldReferenceDetailGeometry.js';
import { FIELD_SPELL_REFERENCE_ART_SNAPSHOT } from '../src/ui/FieldSpellReferenceArtSnapshot.js';

const create = id => createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE, getFieldEnvironmentForCardId(id));
const detailedMeshes = group => group.children.filter(mesh => mesh.geometry?.userData.detailParts);
const parts = group => detailedMeshes(group).flatMap(mesh => mesh.geometry.userData.detailParts);
const named = (group, name) => parts(group).filter(part => part.name === name);
const width = part => part.bounds.max[0] - part.bounds.min[0];
const height = part => part.bounds.max[1] - part.bounds.min[1];

test('the three detail reconstructions retain exact source bytes and declare adapted sculptures and remaining limits', () => {
  assert.deepEqual(FIELD_REFERENCE_DETAIL_IDS, ['67616300', '81380218', '63883999']);
  assert.equal(createFieldReferenceDetailGeometry({ profile: { cardId: 'unknown' } }), false);
  for (const id of FIELD_REFERENCE_DETAIL_IDS) {
    const archived = FIELD_SPELL_REFERENCE_ART_SNAPSHOT.entries.find(entry => entry.cardId === id);
    const bytes = readFileSync(new URL(`../public${archived.assetPath}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), archived.sha256);
    assert.equal(bytes.length, archived.bytes);
    const group = create(id), detail = group.userData.referenceDetail;
    assert.equal(group.userData.fidelity, 'reference-informed-geometry');
    assert.equal(detail.fidelity, 'source-inspected-adapted-sculpture');
    assert.equal(detail.sourceUrl, archived.sourceUrl);
    assert.deepEqual(detail.features, FIELD_REFERENCE_DETAIL_SCOPE[id].features);
    assert.ok(detail.limits.length > 60);
    assert.ok(Object.isFrozen(detail) && Object.isFrozen(detail.groups));
    assert.equal(detail.primitiveCount, parts(group).length);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('every detail is a closed outward volume with finite indexed colored buffers, clear of the full duel corridor', () => {
  const corridor = new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min), new THREE.Vector3(...budget.playableCorridor.max));
  for (const id of FIELD_REFERENCE_DETAIL_IDS) {
    const group = create(id);
    assert.ok(group.userData.referencePrimitiveCount <= budget.maxPrimitiveCount, 'merged GPU buffers retain the true pre-merge detail count');
    assert.ok(group.userData.drawCallCount <= budget.maxDrawCallCount);
    assert.ok(group.userData.materialCount <= budget.maxMaterialCount);
    for (const mesh of detailedMeshes(group)) {
      assert.equal(mesh.isInstancedMesh, true);
      assert.equal(mesh.material.map, null, 'the figure must not be an illustration billboard');
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
        // Independent signed tetrahedron volume catches reversed shells and
        // the mirrored crown ear's triangle winding after static aggregation.
        for (let i = part.indexOffset; i < part.indexOffset + part.indexCount; i += 3) {
          for (const at of [i, i + 1, i + 2]) assert.ok(index[at] >= part.vertexOffset && index[at] < part.vertexOffset + part.vertexCount);
          const a = new THREE.Vector3().fromBufferAttribute(position, index[i]);
          const b = new THREE.Vector3().fromBufferAttribute(position, index[i + 1]);
          const c = new THREE.Vector3().fromBufferAttribute(position, index[i + 2]);
          signedVolume += a.dot(b.cross(c)) / 6;
          const vertices = [key(index[i]), key(index[i + 1]), key(index[i + 2])];
          if (new Set(vertices).size < 3) continue; // welded sphere poles
          for (let edge = 0; edge < 3; edge++) {
            const from = vertices[edge], to = vertices[(edge + 1) % 3], ordered = from < to;
            const name = ordered ? from + '/' + to : to + '/' + from, record = edges.get(name) || { count: 0, orientation: 0 };
            record.count++; record.orientation += ordered ? 1 : -1; edges.set(name, record);
          }
        }
        assert.ok(signedVolume > .000001, `${id}/${part.name}: ${signedVolume}`);
        for (const edge of edges.values()) {
          assert.equal(edge.count, 2, `${id}/${part.name}: open or non-manifold edge`);
          assert.equal(edge.orientation, 0, `${id}/${part.name}: inconsistent face winding`);
        }
      }
    }
    disposeFieldEnvironmentGeometry(group);
  }
});

test('Chicken Game has a projecting orange nose, frightened cyan eyes and sweat, a four-wheel buggy and a real tank cannon', () => {
  const group = create('67616300');
  assert.equal(named(group, 'eight-chrome-grin-teeth').length, 8);
  assert.equal(named(group, 'deep-blue-frightened-eye').length, 2);
  assert.equal(named(group, 'cyan-eye-lower-glint').length, 2);
  assert.equal(named(group, 'three-pale-blue-sweat-drops').length, 3);
  assert.ok(named(group, 'pointed-forward-nose')[0].bounds.max[2] > named(group, 'orange-rounded-helmet')[0].bounds.max[2] + .9);
  assert.equal(named(group, 'four-dark-rubber-wheels').length, 4);
  assert.equal(named(group, 'four-silver-wheel-hubs').length, 4);
  assert.equal(named(group, 'ten-rust-track-wheels').length, 10);
  const cannon = named(group, 'projecting-tank-cannon')[0];
  assert.ok(cannon.bounds.max[2] - cannon.bounds.min[2] > 2.5);
  assert.equal(named(group, 'dark-cannon-bore').length, 1);
  assert.ok(named(group, 'tiny-orange-front-pilot-head')[0].bounds.max[1] > 22);
  disposeFieldEnvironmentGeometry(group);
});

test('Chorus retains a large child head, curled red hair, actual laurel and layered wings, a flowing tunic and musical silhouettes', () => {
  const group = create('81380218');
  assert.ok(width(named(group, 'large-round-cherub-head')[0]) > width(named(group, 'bare-cherub-upper-body')[0]) * 1.45);
  assert.equal(named(group, 'two-black-singing-eyes').length, 2);
  assert.equal(named(group, 'open-triangular-singing-mouth').length, 1);
  assert.equal(named(group, 'twelve-pointed-green-laurel-leaves').length, 12);
  assert.ok(named(group, 'thirteen-red-hair-curled-locks').every(part => width(part) > .6 && height(part) > .8));
  assert.equal(named(group, 'fourteen-layered-cream-wing-feathers').length, 14);
  assert.ok(height(named(group, 'tilted-gold-elliptical-halo')[0]) > 2);
  assert.ok(height(named(group, 'closed-flowing-five-fold-yellow-tunic')[0]) > 4.5);
  assert.equal(named(group, 'four-reaching-hand-fingers').length, 4);
  assert.equal(named(group, 'five-black-oval-note-heads').length, 5);
  assert.equal(named(group, 'five-black-note-stems').length, 5);
  disposeFieldEnvironmentGeometry(group);
});

test('Palabyrinth has three distinct sculpted faces, central small masks and mirrored physical bat ears on the original fortress', () => {
  const group = create('63883999');
  for (const face of ['central-crown-face', 'right-projecting-goat-face', 'left-low-masonry-face']) {
    assert.equal(named(group, face + '-carved-cranium').length, 1);
    assert.equal(named(group, face + '-recessed-eye').length, 2);
    assert.equal(named(group, face + '-four-stone-fangs').length, 4);
  }
  const ears = named(group, 'two-bat-shaped-upper-crown-ears');
  assert.equal(ears.length, 2);
  assert.ok(ears[0].bounds.max[0] < 0 && ears[1].bounds.min[0] > 0);
  assert.equal(named(group, 'twenty-vertebral-mask-eye-hollows').length, 20);
  assert.equal(named(group, 'ten-small-vertebral-mask-noses').length, 10);
  assert.equal(named(group, 'sixteen-spiral-stone-masonry-joints').length, 16);
  assert.equal(named(group, 'fifteen-right-tower-dark-gallery-apertures').length, 15);
  assert.ok(group.children.some(mesh => mesh.userData.instanceNames.includes('palabyrinth-thick-continuous-left-spiral')), 'existing source spiral is preserved, rather than duplicated');
  disposeFieldEnvironmentGeometry(group);
});

test('replacement disposes every allocated detail buffer, material and final GPU instance exactly once', () => {
  for (const id of FIELD_REFERENCE_DETAIL_IDS) {
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
