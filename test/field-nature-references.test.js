import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { NATURE_CARD_LANDMARKS, NATURE_INSPECTED_ART_PROFILES, createNatureReferenceGeometry } from '../src/ui/FieldEnvironmentNatureReferences.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry, hasFieldEnvironmentLandmarkGeometry, FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { FIELD_SPELL_REFERENCE_ART_SNAPSHOT } from '../src/ui/FieldSpellReferenceArtSnapshot.js';
import { FIELD_GEOMETRY_THREE } from '../src/ui/FieldGeometryThree.js';

const expectedMotifs = {
  '4064256': ['zombie-contorted-face-tree', 'zombie-central-bone-spire', 'zombie-red-river'],
  '295517': ['legendary-ocean-curved-aqueduct', 'legendary-ocean-central-stair', 'legendary-ocean-round-tower'],
  '78082039': ['closed-forest-interlaced-branch', 'closed-forest-yellow-watching-eye', 'closed-forest-vertical-slit-pupil'],
  '35956022': ['acidic-downpour-slanted-rain-streak', 'acidic-downpour-purple-puddle', 'acidic-downpour-curling-vapour'],
  '28120197': ['canyon-flat-topped-stratified-mesa', 'canyon-lower-layered-terrace'],
  '712559': ['amazoness-raised-hut-stilt', 'amazoness-conical-thatched-roof', 'amazoness-narrow-palisade'],
  '15854426': ['mist-valley-continuous-rainbow-ribbon', 'mist-valley-blue-crag-wall', 'mist-valley-yellow-green-light-orb'],
  '37322745': ['naturia-floating-pale-rock-island', 'naturia-floating-island-curled-vine'],
  '70222318': ['sylvania-wide-snowcapped-peak', 'sylvania-narrow-blue-stream', 'sylvania-foreground-waterfall'],
  '54306223': ['venom-red-brown-swamp-water', 'venom-mossy-broken-trunk', 'venom-floating-lily-pad'],
  '7142724': ['icejade-round-cenote-tier', 'icejade-floating-inverted-cone', 'icejade-purple-hanging-plant'],
  '17000165': ['reptilianne-violet-maze-outline', 'reptilianne-branching-cyan-lightning'],
  '88288421': ['field-power-raised-coastal-island', 'field-power-sharp-green-mountain-chain', 'field-power-compass-direction'],
  '33700664': ['valvols-red-erupting-volcano', 'valvols-white-forked-lightning', 'valvols-colored-energy-vortex']
};

function meshesNamed(group, name) {
  return group.children.filter(mesh => mesh.userData.instanceNames?.includes(name));
}

test('14 source-inspected nature profiles match intact illustrations and build their observed motifs', () => {
  assert.deepEqual(new Set(Object.keys(NATURE_CARD_LANDMARKS)), new Set(Object.keys(expectedMotifs)));
  assert.equal(createNatureReferenceGeometry({ profile: { cardId: 'missing' } }), false);
  for (const [id, names] of Object.entries(expectedMotifs)) {
    const profile = NATURE_INSPECTED_ART_PROFILES[id];
    assert.equal(profile.sourceUrl, `https://images.ygoprodeck.com/images/cards_cropped/${id}.jpg`);
    assert.ok(Object.isFrozen(profile) && Object.isFrozen(profile.palette) && Object.isFrozen(profile.motifs));
    const snapshot = FIELD_SPELL_REFERENCE_ART_SNAPSHOT.entries.find(entry => entry.cardId === id);
    const bytes = readFileSync(new URL(`../public/environments/field-art/${id}.jpg`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), snapshot.sha256, id);
    const group = createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE, getFieldEnvironmentForCardId(id));
    assert.equal(group.userData.fidelity, 'reference-informed-geometry');
    assert.equal(group.userData.inspectedArt, profile);
    for (const name of names) assert.ok(hasFieldEnvironmentLandmarkGeometry(group, name), `${id}: ${name}`);
    assert.equal(hasFieldEnvironmentLandmarkGeometry(group, 'weathered-rock'), false, `${id}: no unrelated family scattering`);
    assert.equal(hasFieldEnvironmentLandmarkGeometry(group, 'temple-entablature'), false, `${id}: no invented generic temple`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('all 14 nature scenes remain finite, bounded and outside the corridor after batching', () => {
  const corridor = new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min), new THREE.Vector3(...budget.playableCorridor.max));
  for (const id of Object.keys(expectedMotifs)) {
    const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId(id));
    assert.ok(group.userData.drawCallCount <= budget.maxDrawCallCount, id);
    assert.ok(group.userData.materialCount <= budget.maxMaterialCount, id);
    assert.ok(group.userData.referencePrimitiveCount < budget.maxPrimitiveCount, id);
    for (const mesh of group.children) {
      assert.ok(mesh.isInstancedMesh);
      assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite), `${id}: finite vertices`);
      assert.ok([...mesh.geometry.attributes.normal.array].every(Number.isFinite), `${id}: finite normals`);
      assert.equal(mesh.material.map, null, 'no private card images on geometry');
      mesh.geometry.computeBoundingBox();
      for (let i = 0; i < mesh.count; i++) {
        const matrix = new THREE.Matrix4(); mesh.getMatrixAt(i, matrix);
        const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
        assert.equal(bounds.intersectsBox(corridor), false, `${id}/${mesh.userData.instanceNames[i]}`);
        for (const axis of ['x', 'z']) {
          assert.ok(bounds.min[axis] > -budget.maxHorizontalExtent && bounds.max[axis] < budget.maxHorizontalExtent);
        }
      }
    }
    let disposed = 0;
    const geometries = new Set(group.children.map(mesh => mesh.geometry));
    for (const shape of geometries) shape.addEventListener('dispose', () => disposed++);
    disposeFieldEnvironmentGeometry(group); disposeFieldEnvironmentGeometry(group);
    assert.equal(disposed, geometries.size, `${id}: each shared shape disposed once`);
  }
});

test('Canyon exposes actual color strata and snow follows Sylvania mountain geometry', () => {
  for (const [id, name, minColors] of [
    ['28120197', 'canyon-flat-topped-stratified-mesa', 20],
    ['70222318', 'sylvania-wide-snowcapped-peak', 20],
    ['15854426', 'mist-valley-continuous-rainbow-ribbon', 6]
  ]) {
    const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId(id));
    const [mesh] = meshesNamed(group, name);
    assert.equal(mesh.material.vertexColors, true);
    const colors = mesh.geometry.attributes.color;
    const distinct = new Set();
    for (let i = 0; i < colors.count; i++) distinct.add(`${colors.getX(i)}:${colors.getY(i)}:${colors.getZ(i)}`);
    assert.ok(distinct.size >= minColors, `${id}: source-specific colors reach the rendered vertices`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('the Closed Forest slit stays in front of its yellow lens', () => {
  const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId('78082039'));
  const [eye] = meshesNamed(group, 'closed-forest-yellow-watching-eye');
  const [slit] = meshesNamed(group, 'closed-forest-vertical-slit-pupil');
  const a = new THREE.Matrix4(), b = new THREE.Matrix4(); eye.getMatrixAt(0, a); slit.getMatrixAt(0, b);
  const eyePosition = new THREE.Vector3().setFromMatrixPosition(a), slitPosition = new THREE.Vector3().setFromMatrixPosition(b);
  assert.ok(slitPosition.z > eyePosition.z);
  assert.ok(new THREE.Vector3().setFromMatrixScale(b).y > new THREE.Vector3().setFromMatrixScale(b).x * 4);
  disposeFieldEnvironmentGeometry(group);
});

test('natural cliffs and mountains expose exterior faces rather than inverted dark interiors', () => {
  for (const [id, name, center] of [
    ['28120197', 'canyon-flat-topped-stratified-mesa', [-21, -20]],
    ['70222318', 'sylvania-wide-snowcapped-peak', [0, -34]],
    ['33700664', 'valvols-red-erupting-volcano', [13, -28]]
  ]) {
    const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId(id));
    const [mesh] = meshesNamed(group, name);
    const vertices = mesh.geometry.attributes.position, normals = mesh.geometry.attributes.normal;
    let outward = 0;
    for (let i = 0; i < vertices.count; i++) outward +=
      (vertices.getX(i) - center[0]) * normals.getX(i) + (vertices.getZ(i) - center[1]) * normals.getZ(i);
    assert.ok(outward / vertices.count > .25, `${id}: winding must face the surrounding landscape`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('Canyon mesa tops are real closed surfaces', () => {
  const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId('28120197'));
  group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(-21, 20, -20), new THREE.Vector3(0, -1, 0));
  const hits = ray.intersectObjects(meshesNamed(group, 'canyon-flat-topped-mesa-surface'));
  assert.ok(hits.length > 0, 'a high camera sees the actual sandstone plateau, not an open shell');
  assert.ok(Math.abs(hits[0].point.y - 12.015) < .002);
  disposeFieldEnvironmentGeometry(group);
});

test('Valvols lava follows the rendered volcano surface above its exterior', () => {
  const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId('33700664'));
  group.updateMatrixWorld(true);
  const bodies = meshesNamed(group, 'valvols-red-erupting-volcano');
  const paths = meshesNamed(group, 'valvols-branching-red-lava').flatMap(lava =>
    lava.geometry.userData.continuousCurves || [lava.geometry.userData.continuousCurve]);
  assert.equal(paths.length, 8);
  let samples = 0;
  for (const path of paths) for (const point of path.slice(2, -2)) {
    const origin = new THREE.Vector3(...point);
    const ray = new THREE.Raycaster(origin.clone().add(new THREE.Vector3(0, 5, 0)), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(bodies)[0];
    assert.ok(hit, 'a lava sample has solid rendered rock beneath it');
    assert.ok(origin.y >= hit.point.y + .035, 'lava center remains above the actual triangles');
    assert.ok(origin.y - hit.point.y < .5, 'lava does not float above the mountain');
    samples++;
  }
  assert.ok(samples > 200);
  disposeFieldEnvironmentGeometry(group);
});

test('Icejade hanging plants remain visible outside the floating stone shell', () => {
  const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId('7142724'));
  group.updateMatrixWorld(true);
  const [curtain] = meshesNamed(group, 'icejade-purple-hanging-plant');
  const path = curtain.geometry.userData.continuousCurves?.[0] || curtain.geometry.userData.continuousCurve;
  const point = new THREE.Vector3(...path[12]);
  const ray = new THREE.Raycaster(point.clone().add(new THREE.Vector3(0, 0, 6)), new THREE.Vector3(0, 0, -1));
  const [hit] = ray.intersectObjects(group.children);
  assert.ok(hit?.object.userData.instanceNames.includes('icejade-purple-hanging-plant'),
    'the purple curtain must not disappear inside its opaque cone after normals are corrected');
  disposeFieldEnvironmentGeometry(group);
});
