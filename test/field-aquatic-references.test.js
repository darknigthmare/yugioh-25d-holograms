import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE as applicationThree } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { AQUATIC_CARD_LANDMARKS, AQUATIC_INSPECTED_ART_PROFILES,
  createAquaticReferenceGeometry } from '../src/ui/FieldEnvironmentAquaticReferences.js';

const ids = Object.keys(AQUATIC_CARD_LANDMARKS);
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

test('twenty individually inspected aquatic sources produce bounded geometry with the production namespace', async () => {
  assert.equal(ids.length, 20);
  assert.equal(createAquaticReferenceGeometry({ profile: { cardId: 'not-a-source' } }), false);
  for (const id of ids) {
    const art = AQUATIC_INSPECTED_ART_PROFILES[id];
    assert.equal(art.cardId, id);
    assert.equal(art.sourceUrl, `https://images.ygoprodeck.com/images/cards_cropped/${id}.jpg`);
    assert.ok(Object.isFrozen(art) && Object.isFrozen(art.motifs) && Object.isFrozen(art.palette));
    assert.ok((await readFile(new URL(`../public/environments/field-art/${id}.jpg`, import.meta.url))).length > 1000);
    const group = create(id);
    assert.equal(group.userData.inspectedArt, art);
    assert.equal(group.userData.fidelity, 'reference-informed-geometry');
    assert.equal(group.userData.landmark, AQUATIC_CARD_LANDMARKS[id]);
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


test('city sources retain actual open arches, domes, stepped temples and rounded balconies', () => {
  const lemuria=create('34103656');
  assert.equal(instances(lemuria,'lemuria-six-front-temple-columns').length,6);
  assert.equal(instances(lemuria,'lemuria-triangular-temple-pediment')[0].object.geometry.userData.pitchedRoof,true);
  assert.equal(instances(lemuria,'lemuria-round-arched-pavilion-dome').length,3);
  assert.equal(instances(lemuria,'lemuria-submerged-building-dome').length,3);
  disposeFieldEnvironmentGeometry(lemuria);
  const magellanica=create('26534688');
  assert.equal(instances(magellanica,'magellanica-cantilever-round-balcony').length,15);
  assert.equal(instances(magellanica,'magellanica-umbrella-disc-canopy').length,3);
  assert.equal(instances(magellanica,'magellanica-long-upper-arch').length,2);
  disposeFieldEnvironmentGeometry(magellanica);
  const atlantis=create('38391684');
  assert.equal(instances(atlantis,'atlantis-pale-stepped-temple').length,12);
  assert.equal(instances(atlantis,'atlantis-mossy-segmented-pool-rim').length,18);
  disposeFieldEnvironmentGeometry(atlantis);
});

test('source harbors distinguish lattice cranes, dock gantries and the turret workshop',()=>{
  const sushi=create('62200831');
  assert.equal(instances(sushi,'sushipyard-yellow-A-frame').length,28);
  assert.equal(instances(sushi,'sushipyard-crane-cross-brace').length,18);
  assert.equal(instances(sushi,'sushipyard-red-bowl-rim').length,1);
  disposeFieldEnvironmentGeometry(sushi);
  const plunder=create('93031067');
  assert.equal(instances(plunder,'plunder-blue-conical-turret-roof').length,2);
  assert.equal(instances(plunder,'plunder-dock-timber-pile').length,12);
  assert.ok(instances(plunder,'plunder-boat-shaped-workshop-cradle')[0].object.geometry.userData.continuousCurve.length>=40);
  disposeFieldEnvironmentGeometry(plunder);
});

test('aquatic landmarks keep continuous waves, falling curtains and staggered tidal discs',()=>{
  const umi=create('22702055');
  assert.equal(instances(umi,'umi-continuous-oblique-cobalt-swell').length,4);
  assert.equal(instances(umi,'umi-continuous-oblique-cobalt-swell')[0].object.geometry.userData.oceanSwell,true);
  assert.equal(instances(umi,'umi-thin-branching-foam-crest').length,4);
  disposeFieldEnvironmentGeometry(umi);
  const umiiruka=create('82999629');
  assert.equal(instances(umiiruka,'umiiruka-continuous-breaking-wave-face').length,3);
  assert.equal(instances(umiiruka,'umiiruka-continuous-breaking-wave-face')[0].object.geometry.userData.breakingWaveFace,true);
  disposeFieldEnvironmentGeometry(umiiruka);
  const perlereino=create('77103950');
  const discs=instances(perlereino,'perlereino-floating-elliptical-water-disc');
  assert.equal(discs.length,5);
  const heights=discs.map(({matrix})=>new THREE.Vector3().setFromMatrixPosition(matrix).y);
  assert.ok(heights.every((value,i)=>i===0||value>heights[i-1]));
  assert.equal(instances(perlereino,'perlereino-thin-falling-water-curtain').length,10);
  disposeFieldEnvironmentGeometry(perlereino);
  const runick=create('92107604');
  assert.equal(instances(runick,'runick-twin-falling-water-curtain').length,2);
  assert.equal(instances(runick,'runick-curled-carved-blue-arch').length,2);
  assert.equal(instances(runick,'runick-engraved-rim-chevron').length,64);
  disposeFieldEnvironmentGeometry(runick);
});

test('mist, caves and cosmic sources replace an unsuitable old family through observed forms',()=>{
  const web=create('69408987');
  assert.equal(instances(web,'spider-web-radial-silk-strand').length,18);
  assert.equal(instances(web,'spider-web-concentric-silk-cell').length,126);
  assert.equal(instances(web,'spider-web-pointed-violet-crystal').length,5);
  assert.equal(instances(web,'basin-water').length,0);
  disposeFieldEnvironmentGeometry(web);
  const depths=create('8794055');
  assert.equal(instances(depths,'distant-depths-small-nebula-star').length,130);
  assert.equal(instances(depths,'distant-depths-diagonal-granular-nebula')[0].object.geometry.userData.nebulaParticleCount,4000);
  assert.equal(instances(depths,'water-shelf').length,0);
  disposeFieldEnvironmentGeometry(depths);
  const wetlands=create('2084239');
  assert.equal(instances(wetlands,'wetlands-five-blade-grass-tuft').length,120);
  const grass=instances(wetlands,'wetlands-five-blade-grass-tuft')[0].object.geometry;
  assert.equal(grass.userData.pointedGrassBlade,true);
  assert.equal(grass.userData.grassBladeCount,5);
  assert.equal(grass.attributes.position.count,5*22);
  assert.equal(instances(wetlands,'wetlands-five-blade-grass-tuft').length*grass.userData.grassBladeCount,600);
  assert.equal(instances(wetlands,'basin-water').length,0);
  assert.equal(instances(wetlands,'tree-trunk').length,0);
  assert.equal(instances(wetlands,'wetlands-diagonal-rain-streak').length,28);
  disposeFieldEnvironmentGeometry(wetlands);
  const station=create('89264428');
  assert.equal(instances(station,'ursarctic-long-twin-dark-landing-deck').length,2);
  assert.equal(instances(station,'ursarctic-circular-side-hub').length,6);
  assert.equal(instances(station,'ursarctic-hub-radial-spoke').length,60);
  disposeFieldEnvironmentGeometry(station);
});

test('each aquatic replacement disposes all shared/deformed buffers, materials and instances exactly once', () => {
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

test('unused custom water and every factory-created palette material are disposed exactly once',()=>{
  for(const id of ids){
    const counts=new Map();
    class TrackedMaterial extends applicationThree.MeshStandardMaterial {
      constructor(options){super(options);counts.set(this,0);
        this.addEventListener('dispose',()=>counts.set(this,counts.get(this)+1));}
    }
    const namespace={...applicationThree,MeshStandardMaterial:TrackedMaterial};
    const group=createFieldEnvironmentGeometry(namespace,getFieldEnvironmentForCardId(id));
    disposeFieldEnvironmentGeometry(group);disposeFieldEnvironmentGeometry(group);
    for(const count of counts.values())assert.equal(count,1,id);
  }
});
