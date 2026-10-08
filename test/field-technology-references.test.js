import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE as applicationThree } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { TECHNOLOGY_CARD_LANDMARKS, TECHNOLOGY_INSPECTED_ART_PROFILES,
  createTechnologyReferenceGeometry } from '../src/ui/FieldEnvironmentTechnologyReferences.js';

const ids = Object.keys(TECHNOLOGY_CARD_LANDMARKS);
const create = id => createFieldEnvironmentGeometry(applicationThree, getFieldEnvironmentForCardId(id));
const corridor = new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min),
  new THREE.Vector3(...budget.playableCorridor.max));

function instances(group, name) {
  const matches = [];
  group.traverse(object => {
    if (!object.isInstancedMesh) return;
    object.userData.instanceNames.forEach((label, index) => {
      if (label !== name) return;
      const matrix = new THREE.Matrix4(); object.getMatrixAt(index, matrix);
      matches.push({ object, matrix });
    });
  });
  return matches;
}

test('sixteen individually inspected technology sources produce bounded geometry with the production namespace', async () => {
  assert.equal(ids.length, 16);
  assert.equal(createTechnologyReferenceGeometry({ profile: { cardId: 'not-a-source' } }), false);
  for (const id of ids) {
    const art = TECHNOLOGY_INSPECTED_ART_PROFILES[id];
    assert.equal(art.cardId, id);
    assert.equal(art.sourceUrl, `https://images.ygoprodeck.com/images/cards_cropped/${id}.jpg`);
    assert.ok(Object.isFrozen(art) && Object.isFrozen(art.motifs) && Object.isFrozen(art.palette));
    assert.ok((await readFile(new URL(`../public/environments/field-art/${id}.jpg`, import.meta.url))).length > 1000);
    const group = create(id);
    assert.equal(group.userData.inspectedArt, art);
    assert.equal(group.userData.fidelity, 'reference-informed-geometry');
    assert.equal(group.userData.landmark, TECHNOLOGY_CARD_LANDMARKS[id]);
    assert.ok(group.userData.meshCount > 10 && group.userData.meshCount <= budget.maxPrimitiveCount, `${id}: primitives ${group.userData.meshCount}`);
    assert.ok(group.userData.drawCallCount <= budget.maxDrawCallCount, `${id}: draws ${group.userData.drawCallCount}`);
    assert.ok(group.userData.materialCount <= budget.maxMaterialCount, `${id}: materials ${group.userData.materialCount}`);
    group.updateMatrixWorld(true);
    group.traverse(object => {
      if (!object.isMesh) return;
      assert.equal(object.isInstancedMesh, true, id);
      assert.equal(object.material.map, null, `${id}: no replacement texture or illustrated creature model`);
      object.geometry.computeBoundingBox();
      for (let index = 0; index < object.count; index += 1) {
        const matrix = new THREE.Matrix4(); object.getMatrixAt(index, matrix); matrix.premultiply(object.matrixWorld);
        const bounds = object.geometry.boundingBox.clone().applyMatrix4(matrix);
        const name = object.userData.instanceNames[index];
        assert.equal(bounds.intersectsBox(corridor), false, `${id}/${name}: playable corridor`);
        assert.ok(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x), Math.abs(bounds.min.z), Math.abs(bounds.max.z)) < budget.maxHorizontalExtent, `${id}/${name}: extent`);
      }
      for (const key of ['position', 'normal']) for (const value of object.geometry.attributes[key].array)
        assert.equal(Number.isFinite(value), true, `${id}/${key}`);
      const positions = object.geometry.attributes.position;
      if (object.geometry.index) for (const index of object.geometry.index.array) assert.ok(index >= 0 && index < positions.count, id);
      else assert.equal(positions.count % 3, 0, id);
    });
    disposeFieldEnvironmentGeometry(group);
  }
});

test('Geartown and Boot Sector use open extruded toothed gears with outward cap normals', () => {
  for (const [id, name] of [['37694547','geartown-open-toothed-building-gear'], ['36668118','boot-open-toothed-rotor']]) {
    const group = create(id), gears = instances(group, name);
    assert.ok(gears.length);
    const shape = gears[0].object.geometry, position = shape.attributes.position;
    assert.equal(shape.userData.toothedAnnulus.teeth, 24);
    let minRadius = Infinity, maxRadius = 0;
    for (let i = 0; i < position.count; i += 1) {
      const radius = Math.hypot(position.getX(i), position.getY(i));
      minRadius = Math.min(radius, minRadius); maxRadius = Math.max(radius, maxRadius);
    }
    const expectedInner = id === '36668118' ? 0.86 : 0.56;
    assert.ok(Math.abs(minRadius-expectedInner)<0.01, 'physical opening remains empty');
    assert.ok(maxRadius > 1.11, 'teeth project beyond the root circle');
    for (let triangle = 0; triangle < shape.index.count; triangle += 3) {
      const vertices = [0,1,2].map(i => new THREE.Vector3().fromBufferAttribute(position, shape.index.getX(triangle+i)));
      if (vertices.every(point => Math.abs(point.z - vertices[0].z) < 0.001)) {
        const normal = vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));
        assert.ok(normal.z * vertices[0].z > 0, 'front/back gear cap faces point outward');
      }
    }
    disposeFieldEnvironmentGeometry(group);
  }
});

test('source apparatus retains continuous vat, funnel, dome, spiral band and curved claw forms', () => {
  const funnel = create('42461852');
  const surface = instances(funnel, 'cynet-storm-continuous-twisted-funnel')[0].object.geometry;
  assert.ok(surface.userData.radialSurface.rings >= 20);
  const p = surface.attributes.position, bottom = [], top = [];
  for (let i = 0; i < p.count; i += 1) {
    const r = Math.hypot(p.getX(i), (p.getZ(i)+31)/0.65);
    if (p.getY(i) < 2.1) bottom.push(r);
    if (p.getY(i) > 18.5) top.push(r);
  }
  assert.ok(Math.max(...bottom) < 2.2 && Math.max(...top) > 13.8);
  disposeFieldEnvironmentGeometry(funnel);
  const dome = create('67328336');
  assert.ok(instances(dome,'meklord-smooth-silver-dome')[0].object.geometry.userData.radialSurface.rings >= 20);
  assert.equal(instances(dome,'meklord-upward-curved-silver-prong').length,2);
  disposeFieldEnvironmentGeometry(dome);
  const babel = create('90351981');
  const spiral = instances(babel,'babel-continuous-climbing-gold-band')[0].object.geometry.userData.continuousCurve;
  assert.equal(instances(babel,'babel-continuous-climbing-gold-band')[0].object.geometry.userData.verticalRibbonHeight,1.9);
  assert.ok(spiral.at(-1)[1]-spiral[0][1] > 23);
  assert.ok(Math.hypot(spiral[0][0],spiral[0][2]+32) > Math.hypot(spiral.at(-1)[0],spiral.at(-1)[2]+32)+3.7);
  assert.equal(instances(babel,'babel-crossed-diamond-strut').length,96);
  disposeFieldEnvironmentGeometry(babel);
  const scrap = create('28388296');
  assert.equal(instances(scrap,'scrap-factory-continuous-claw-jaw').length,2);
  assert.equal(instances(scrap,'scrap-factory-serrated-crusher-plate').length,2);
  assert.ok(instances(scrap,'scrap-factory-serrated-crusher-plate')[0].object.geometry.userData.serratedProfile);
  assert.equal(instances(scrap,'scrap-factory-molten-vat-shell')[0].object.geometry.parameters.openEnded,true,
    'a closed top cap would occlude the molten surface');
  disposeFieldEnvironmentGeometry(scrap);
});

test('source composition keeps radial tracks, alternating hangar pods and jungle ruins distinct from family defaults', () => {
  const switchyard = create('76136345');
  assert.equal(instances(switchyard,'switchyard-radial-paired-rail').length,14);
  assert.equal(instances(switchyard,'switchyard-red-gantry-crossbar').length,1);
  assert.equal(instances(switchyard,'switchyard-rear-engine-shed').length,5);
  disposeFieldEnvironmentGeometry(switchyard);
  const hangar = create('66399653');
  const pods = instances(hangar,'union-hangar-ochre-display-pod');
  assert.equal(pods.length,3);
  assert.deepEqual(pods.map(({matrix})=>Math.sign(new THREE.Vector3().setFromMatrixPosition(matrix).x)),[1,-1,1]);
  disposeFieldEnvironmentGeometry(hangar);
  const gmx = create('74378580');
  assert.equal(instances(gmx,'gmx-exposed-horizontal-pipe').length,3);
  assert.equal(instances(gmx,'gmx-long-palm-leaf').length,30);
  assert.equal(instances(gmx,'gmx-angular-concrete-rubble').length,10);
  assert.equal(instances(gmx,'gmx-broken-roof-slab')[0].object.geometry.userData.fracturedEdge,true);
  assert.equal(instances(gmx,'tower').length,0);
  disposeFieldEnvironmentGeometry(gmx);
});

test('each technology replacement disposes all shared/deformed buffers, materials and instances exactly once', () => {
  for (const id of ids) {
    const group = create(id), resources = new Set(), counts = new Map();
    group.traverse(object => {
      if (!object.isMesh) return;
      resources.add(object); resources.add(object.geometry); resources.add(object.material);
    });
    for (const resource of resources) {
      counts.set(resource,0);
      resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
    }
    disposeFieldEnvironmentGeometry(group); disposeFieldEnvironmentGeometry(group);
    for (const count of counts.values()) assert.equal(count,1,id);
  }
});
