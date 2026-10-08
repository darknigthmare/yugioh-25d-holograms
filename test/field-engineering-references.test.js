import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE as applicationThree } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { ENGINEERING_CARD_LANDMARKS, ENGINEERING_INSPECTED_ART_PROFILES,
  createEngineeringReferenceGeometry } from '../src/ui/FieldEnvironmentEngineeringReferences.js';

const ids = Object.keys(ENGINEERING_CARD_LANDMARKS);
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

test('twenty-four individually inspected engineering sources produce bounded geometry with the production namespace', async () => {
  assert.equal(ids.length, 24);
  assert.equal(createEngineeringReferenceGeometry({ profile: { cardId: 'not-a-source' } }), false);
  for (const id of ids) {
    const art = ENGINEERING_INSPECTED_ART_PROFILES[id];
    assert.equal(art.cardId, id);
    assert.equal(art.sourceUrl, `https://images.ygoprodeck.com/images/cards_cropped/${id}.jpg`);
    assert.ok(Object.isFrozen(art) && Object.isFrozen(art.motifs) && Object.isFrozen(art.palette));
    assert.ok((await readFile(new URL(`../public/environments/field-art/${id}.jpg`, import.meta.url))).length > 1000);
    const group = create(id);
    assert.equal(group.userData.inspectedArt, art);
    assert.equal(group.userData.fidelity, 'reference-informed-geometry');
    assert.equal(group.userData.landmark, ENGINEERING_CARD_LANDMARKS[id]);
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


test('each engineering replacement disposes all shared/deformed buffers, materials and instances exactly once', () => {
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

test('unused custom materials and every factory-created palette material are disposed exactly once',()=>{
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


test('the two Fandora sources retain distinct sail counts, cannons and a billowed rig',()=>{
 for(const [id,n,cannons,ridges]of[['26162470',3,2,0],['64400161',2,0,7]]){
  const g=create(id),sails=instances(g,'fandora-teal-billowed-square-sail');
  assert.equal(sails.length,n);assert.equal(sails[0].object.geometry.userData.billowedSail,true);
  assert.equal(instances(g,'fandora-forward-brass-cannon').length,cannons);
  assert.equal(instances(g,'fandora-distant-mountain-ridge').length,ridges);
  assert.equal(instances(g,'fandora-long-pale-triangular-foresail')[0].object.geometry.userData.triangularSail,true);
  assert.equal(instances(g,'fandora-continuous-striped-open-hull')[0].object.geometry.userData.radialSurface.rings,28);
  const hull=instances(g,'fandora-continuous-striped-open-hull')[0].object.geometry;
  const hp=hull.attributes.position,hn=hull.attributes.normal;let radialNormal=0;
  for(let i=0;i<hp.count;i++)radialNormal+=hn.getX(i)*hp.getX(i)+hn.getZ(i)*(hp.getZ(i)+33);
  assert.ok(radialNormal>0,'the colored hull faces outward');
  assert.equal(instances(g,'fandora-continuous-side-wing').length,2);disposeFieldEnvironmentGeometry(g);
 }
});

test('Ignister is the actual amusement island with a wheel, coaster, carousel and rim pennants',()=>{
 const g=create('59054773');
 assert.equal(instances(g,'ignister-triangular-island-pennant').length,24);
 assert.equal(instances(g,'ignister-ferris-wheel-suspended-cabin').length,12);
 assert.equal(instances(g,'ignister-ferris-wheel-radial-spoke').length,12);
 const coasters=instances(g,'ignister-continuous-roller-coaster-ribbon');
 assert.equal(coasters.length,2);assert.equal(coasters[0].object.geometry.userData.continuousCurve.length,97);
 const heights=coasters.map(({matrix})=>new THREE.Vector3().setFromMatrixPosition(matrix).y);
 assert.ok(Math.abs(heights[1]-heights[0]-3.8)<1e-5);
 assert.equal(instances(g,'ignister-carousel-upright-pole').length,8);
 assert.equal(instances(g,'ignister-cyan-domed-attraction').length,1);
 assert.equal(instances(g,'cyber-island').length,0);disposeFieldEnvironmentGeometry(g);
});

test('Karakuri and carrier architecture has genuine tooth apertures, upturned roofs and open bays',()=>{
 const castle=create('22751868'),gears=instances(castle,'karakuri-exposed-open-toothed-gear');
 assert.equal(gears.length,4);assert.equal(gears[0].object.geometry.userData.spurGear.teeth,16);
 const p=gears[0].object.geometry.attributes.position;
 for(let i=0;i<p.count;i+=1)assert.ok(Math.hypot(p.getX(i),p.getY(i))>=.619);
 assert.equal(instances(castle,'karakuri-blue-upturned-tiered-roof').length,3);
 assert.equal(instances(castle,'karakuri-blue-upturned-tiered-roof')[0].object.geometry.userData.curvedGableRoof,true);
 disposeFieldEnvironmentGeometry(castle);
 const carrier=create('10424147'),bays=instances(carrier,'magnacarrier-beveled-open-forward-bay');
 assert.equal(bays.length,2);assert.deepEqual(bays[0].object.geometry.userData.openPolygonFrame,{sides:6,inner:.77});
 const bp=bays[0].object.geometry.attributes.position;
 for(let i=0;i<bp.count;i+=1)assert.ok(Math.hypot(bp.getX(i),bp.getY(i))>=.769);
 assert.equal(instances(carrier,'magnacarrier-open-bay-dark-backwall').length,2);
 assert.equal(instances(carrier,'magnacarrier-projecting-pale-landing-deck').length,2);disposeFieldEnvironmentGeometry(carrier);
});

test('source circuits and the parchment workspace keep characteristic topologies and small tools',()=>{
 const euler=create('9547962');
 assert.equal(instances(euler,'euler-orange-triangle-marker').length,9);
 assert.equal(instances(euler,'euler-dotted-outer-neon-border').length,48);
 assert.equal(instances(euler,'euler-visible-electrical-graph-edge').length,40);disposeFieldEnvironmentGeometry(euler);
 const ducts=create('86997073');
 assert.equal(instances(ducts,'fortissimo-open-hexagonal-wall-socket').length,18);
 assert.equal(instances(ducts,'fortissimo-open-hexagonal-floor-duct').length,5);
 assert.equal(instances(ducts,'fortissimo-overhead-round-metal-disc').length,3);disposeFieldEnvironmentGeometry(ducts);
 const map=create('56074358');
 assert.equal(instances(map,'morphtronic-ochre-parchment-map')[0].object.geometry.userData.curledParchment,true);
 assert.equal(instances(map,'morphtronic-continuous-blue-horseshoe-magnet')[0].object.geometry.userData.continuousCurve.length,49);
 assert.equal(instances(map,'morphtronic-red-magnet-tip').length,2);
 assert.equal(instances(map,'morphtronic-flip-phone-key').length,12);
 assert.equal(instances(map,'morphtronic-map-observed-coastline').length,16);
 assert.equal(instances(map,'morphtronic-oil-lamp-glass-globe').length,1);disposeFieldEnvironmentGeometry(map);
});

test('figure-heavy art reconstructs the visible background without adding invented creature bodies',()=>{
 for(const [id,name,n]of[['1801154','centrifugal-continuous-rainbow-vortex-band',8],
 ['41128647','dinomic-forked-blue-charged-background',120],
 ['79555535','ignition-continuous-branching-fire-stream',8],
 ['41371602','centurion-large-engraved-pink-halo-engraved-segment',32]]){
  const g=create(id);assert.equal(instances(g,name).length,n);
  g.traverse(o=>{for(const label of o.userData.instanceNames||[])assert.doesNotMatch(label,/creature-body|armor-body|dragon-body|rider-body/);});
  disposeFieldEnvironmentGeometry(g);
 }
 const sanctuary=create('1295111');
 assert.equal(instances(sanctuary,'salamangreat-continuous-cracked-volcano').length,3);
 const volcanicGeometry=instances(sanctuary,'salamangreat-continuous-cracked-volcano')[0].object.geometry;
 const vp=volcanicGeometry.attributes.position,vn=volcanicGeometry.attributes.normal;let outward=0;
 for(let i=0;i<vp.count;i++)outward+=vn.getX(i)*vp.getX(i)+vn.getZ(i)*(vp.getZ(i)+35);
 assert.ok(outward>0,'central volcanic surface faces outward');
 assert.equal(instances(sanctuary,'salamangreat-surface-matched-lava-crack').length,150);
 assert.equal(instances(sanctuary,'salamangreat-vertical-bright-eruption').length,3);disposeFieldEnvironmentGeometry(sanctuary);
 const inferno=create('44352516');
 const normal=instances(inferno,'cyberdark-continuous-low-lava-surge')[0].object.geometry.attributes.normal;
 let upward=0;for(let i=0;i<normal.count;i++)upward+=normal.getY(i);
 assert.ok(upward/normal.count>.7,'lava surface faces the viewer above the ground');disposeFieldEnvironmentGeometry(inferno);
});
