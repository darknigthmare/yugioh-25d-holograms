import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE as applicationThree } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry, FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { ARCANE_CARD_LANDMARKS, ARCANE_INSPECTED_ART_PROFILES } from '../src/ui/FieldEnvironmentArcaneReferences.js';

const ids=Object.keys(ARCANE_CARD_LANDMARKS);
const create=id=>createFieldEnvironmentGeometry(applicationThree,getFieldEnvironmentForCardId(id));
const corridor=new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min),new THREE.Vector3(...budget.playableCorridor.max));
function instances(group,name) {
  const result=[];
  group.traverse(object=>{
    if(!object.isInstancedMesh) return;
    object.userData.instanceNames.forEach((n,i)=>{
      if(n!==name) return;
      const matrix=new THREE.Matrix4();object.getMatrixAt(i,matrix);result.push({object,matrix});
    });
  });return result;
}
const count=(group,name)=>instances(group,name).length;
const curves=(group,name)=>instances(group,name)[0].object.geometry.userData.continuousCurves;

test('twenty-four inspected constructions use the production namespace and every transformed instance stays outside the duel',()=>{
  assert.equal(ids.length,24);
  for(const id of ids) {
    const group=create(id);
    assert.equal(group.userData.fidelity,'reference-informed-geometry',id);
    assert.equal(group.userData.landmark,ARCANE_CARD_LANDMARKS[id]);
    assert.equal(group.userData.inspectedArt,ARCANE_INSPECTED_ART_PROFILES[id]);
    assert.ok(group.userData.meshCount<=budget.maxPrimitiveCount,id);
    assert.ok(group.userData.drawCallCount<=budget.maxDrawCallCount,id);
    assert.ok(group.userData.materialCount<=budget.maxMaterialCount,id);
    assert.equal(ARCANE_INSPECTED_ART_PROFILES[id].sourceUrl,`https://images.ygoprodeck.com/images/cards_cropped/${id}.jpg`);
    group.updateMatrixWorld(true);
    group.traverse(object=>{
      if(!object.isMesh) return;
      assert.equal(object.isInstancedMesh,true,id);
      assert.equal(object.material.map,null,`${id}: static volumes do not substitute a texture plane for geometry`);
      object.geometry.computeBoundingBox();
      for(let i=0;i<object.count;i++) {
        const matrix=new THREE.Matrix4();object.getMatrixAt(i,matrix);matrix.premultiply(object.matrixWorld);
        const bounds=object.geometry.boundingBox.clone().applyMatrix4(matrix),name=object.userData.instanceNames[i];
        assert.equal(bounds.intersectsBox(corridor),false,`${id}/${name}`);
        assert.ok(Math.max(...[bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z].map(Math.abs))<48,`${id}/${name}`);
      }
      for(const name of ['position','normal']) for(const value of object.geometry.attributes[name].array) assert.ok(Number.isFinite(value),`${id}/${name}`);
      const p=object.geometry.attributes.position;
      if(object.geometry.index) for(const n of object.geometry.index.array) assert.ok(n>=0&&n<p.count,id);
      else assert.equal(p.count%3,0,id);
    });
    disposeFieldEnvironmentGeometry(group);
  }
});

test('the inspected imagery preserves its different architectural props and painted figures',()=>{
  const cases={
    '12644061':{'advanced-dark-short-inscription-stroke':24},
    '23160024':{'amorphous-rotunda-tall-column':10,'amorphous-floating-thin-silver-staff':1},
    '2906939':{'ashtrashen-thick-red-inscribed-pillar':2,'ashtrashen-red-hanging-lantern':4,'ashtrashen-crooked-pagoda-stage':4},
    '30761649':{'barian-irregular-faceted-red-crystal-spire':19,'barian-left-round-projecting-ledge':3},
    '39513225':{'seventh-untopia-central-gold-stair':20,'seventh-untopia-golden-wall-brick':70},
    '3129133':{'invitation-delta-angular-basalt-column':29,'invitation-delta-long-rock-finger':8},
    '44710391':{'earthbound-city-green-grey-block':36},
    '71089030':{'earthbound-prison-small-rocky-palm':10,'earthbound-prison-small-rocky-finger':40},
    '74665651':{'joy-mirror-layered-curved-bridge':3,'joy-mirror-pavilion-column':10,'joy-mirror-pink-blossom-cluster':16},
    '43912676':{'celestia-overlapping-icy-faceted-slab':17,'celestia-small-galaxy-white-core':1},
    '70422863':{'hexatellarknight-tilted-lavender-hexagonal-shield':1,'hexatellarknight-six-white-rim-nodes':6},
    '73206827':{'light-barrier-four-point-white-star':52},
    '13482262':{'impcantation-purple-draped-curtain':2,'impcantation-gold-framed-drawer':3,'impcantation-purple-card-back':4},
    '36099620':{'realm-light-large-cream-round-tower':2,'realm-light-terraced-white-city-house':25,'realm-light-tiny-city-window':75},
    '32354768':{'zefra-tall-white-circuit-obelisk':1,'zefra-deep-green-connected-upper-canopy':9},
    '82460246':{'calarium-pale-pink-blossom-canopy':23,'calarium-irregular-cracked-stone-plaza':13},
    '18720257':{'weather-tall-notched-white-cyan-back-panel':7,'weather-layered-white-cloud-bank':29},
    '39210885':{'vaalmonica-fifteen-curved-resonator-ribs':15,'vaalmonica-shallow-two-offering-goblets':2,'vaalmonica-open-book-left-page':1,'vaalmonica-open-book-right-page':1},
    '22555834':{'fabled-realm-central-stair-tread':18,'fabled-realm-angular-purple-cavern-face':17},
    '50433147':{'nordic-four-broad-curled-aurora-curtains':1,'nordic-angular-overlapping-mountain-ridge':15},
    '5414777':{'spirit-world-tiny-pink-white-yellow-flower':45,'spirit-world-tiny-attached-flower-stem':45},
    '32999573':{'xyz-override-red-tall-gantry-column':2,'xyz-override-gold-hoist-frame':3,'xyz-override-long-thin-suspension-cable':6}
  };
  for(const [id,names] of Object.entries(cases)){const group=create(id);for(const [name,n] of Object.entries(names))assert.equal(count(group,name),n,`${id}/${name}`);disposeFieldEnvironmentGeometry(group);}
  for(const id of ['12644061','70422863','73206827','13764602','91880660','5414777','32999573']){
    const g=create(id);assert.ok(g.children.flatMap(o=>o.userData.instanceNames).every(n=>!/(dragon-body|fighter-body|mechanical-entity|plane-body|mecha-body|invented-temple)/.test(n)));disposeFieldEnvironmentGeometry(g);
  }
});

test('continuous branching terrain water, bent hand formations and actual luminosity differ physically',()=>{
  for(const [id,name,n] of [
    ['3129133','invitation-delta-connected-branching-pink-river',4],
    ['71089030','earthbound-prison-five-bent-stone-fingers',5],
    ['71089030','earthbound-prison-three-curled-white-wisp-trails',3],
    ['43912676','celestia-tilted-multicolor-orbit-rings',4],
    ['73206827','light-barrier-dense-golden-vertical-curtain',39],
    ['13764602','a-un-blue-branching-lightning',7],
    ['13764602','a-un-magenta-branching-lightning',7],
    ['91880660','will-way-seven-red-circle-and-slash-signs',14]]){
    const group=create(id),paths=curves(group,name);assert.equal(paths.length,n,`${id}/${name}`);assert.ok(paths.every(p=>p.length>=24));
    if(id==='71089030'&&n===5)for(const path of paths){assert.ok(path.at(-1)[1]-path[0][1]>=16.5);assert.ok(Math.max(...path.map(p=>p[2]))-Math.min(...path.map(p=>p[2]))>3.5);}
    disposeFieldEnvironmentGeometry(group);
  }
});

test('Joy retains genuinely rising curved galleries and Realm of Light spirals climb around both towers',()=>{
  const joy=create('74665651');for(const {object} of instances(joy,'joy-mirror-layered-curved-bridge')){
    const p=object.geometry.userData.continuousCurve;assert.ok(p.length>60);assert.ok(p[36][1]>p[0][1]+1.9);assert.ok(p[36][2]<p[0][2]-1.9);
  }disposeFieldEnvironmentGeometry(joy);
  const city=create('36099620');for(const {object} of instances(city,'realm-light-external-ascending-spiral-route')){
    const p=object.geometry.userData.continuousCurve;assert.ok(p.at(-1)[1]-p[0][1]>=19);let length=0;for(let i=1;i<p.length;i++)length+=new THREE.Vector3(...p[i]).distanceTo(new THREE.Vector3(...p[i-1]));assert.ok(length>40);
  }disposeFieldEnvironmentGeometry(city);
});

test('Zefra medallions and Nordic curtains use real colored buffers and physical widths',()=>{
  const zefra=create('32354768'),medal=instances(zefra,'zefra-ten-round-color-medallions')[0].object.geometry;
  assert.ok(medal.attributes.color);assert.equal(medal.userData.continuousCurves.length,10);disposeFieldEnvironmentGeometry(zefra);
  const nordic=create('50433147'),curtain=instances(nordic,'nordic-four-broad-curled-aurora-curtains')[0].object.geometry;
  assert.equal(curtain.userData.auroraCurtains.length,4);assert.ok(curtain.attributes.color);const p=curtain.attributes.position;assert.equal(Math.abs(p.getY(1)-p.getY(0)),6);assert.ok(Math.max(...Array.from({length:p.count},(_,i)=>p.getZ(i)))-Math.min(...Array.from({length:p.count},(_,i)=>p.getZ(i)))>3.5);disposeFieldEnvironmentGeometry(nordic);
});

test('every Arcane allocation is disposed exactly once and repeated disposal is harmless',()=>{
  for(const id of ids){const group=create(id),geos=new Set(),mats=new Set();group.traverse(o=>{if(o.isMesh){geos.add(o.geometry);mats.add(o.material);}});const hits=new Map();for(const resource of [...geos,...mats])resource.addEventListener('dispose',()=>hits.set(resource,(hits.get(resource)||0)+1));disposeFieldEnvironmentGeometry(group);disposeFieldEnvironmentGeometry(group);assert.equal(group.children.length,0);for(const resource of [...geos,...mats])assert.equal(hits.get(resource),1,`${id}: allocation disposed once`);}
});

test('all allocated Arcane custom materials are released, including unused base materials',()=>{
  for(const id of ids){const allocations=[],hits=new Map();class Material extends applicationThree.MeshStandardMaterial{constructor(...args){super(...args);allocations.push(this);this.addEventListener('dispose',()=>hits.set(this,(hits.get(this)||0)+1));}}const group=createFieldEnvironmentGeometry({...applicationThree,MeshStandardMaterial:Material},getFieldEnvironmentForCardId(id));disposeFieldEnvironmentGeometry(group);for(const mat of allocations)assert.equal(hits.get(mat),1,`${id}: every allocated material disposed`);}
});
