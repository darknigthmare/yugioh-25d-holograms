import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE as applicationThree } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry, FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { URBAN_CARD_LANDMARKS, URBAN_INSPECTED_ART_PROFILES } from '../src/ui/FieldEnvironmentUrbanReferences.js';

const ids=Object.keys(URBAN_CARD_LANDMARKS);
const create=id=>createFieldEnvironmentGeometry(applicationThree,getFieldEnvironmentForCardId(id));
const corridor=new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min),new THREE.Vector3(...budget.playableCorridor.max));
function instances(group,name) {
  const result=[];
  group.traverse(object=>{
    if(!object.isInstancedMesh) return;
    object.userData.instanceNames.forEach((instanceName,i)=>{
      if(instanceName!==name) return;
      const matrix=new THREE.Matrix4();object.getMatrixAt(i,matrix);result.push({object,matrix});
    });
  });return result;
}
const count=(group,name)=>instances(group,name).length;

test('fourteen source-inspected urban scenes work with production constructors and each complete instance stays outside the duel',()=>{
  assert.equal(ids.length,14);
  for(const id of ids) {
    const group=create(id);
    assert.equal(group.userData.fidelity,'reference-informed-geometry',id);
    assert.equal(group.userData.landmark,URBAN_CARD_LANDMARKS[id]);
    assert.equal(group.userData.inspectedArt,URBAN_INSPECTED_ART_PROFILES[id]);
    assert.ok(group.userData.meshCount<=budget.maxPrimitiveCount,id);
    assert.ok(group.userData.drawCallCount<=budget.maxDrawCallCount,id);
    assert.ok(group.userData.materialCount<=budget.maxMaterialCount,id);
    group.updateMatrixWorld(true);
    group.traverse(object=>{
      if(!object.isMesh) return;
      assert.equal(object.isInstancedMesh,true,id);
      assert.equal(object.material.map,null,`${id}: physical volumes have no hidden source texture`);
      object.geometry.computeBoundingBox();
      for(let i=0;i<object.count;i++) {
        const matrix=new THREE.Matrix4();object.getMatrixAt(i,matrix);matrix.premultiply(object.matrixWorld);
        const bounds=object.geometry.boundingBox.clone().applyMatrix4(matrix),name=object.userData.instanceNames[i];
        assert.equal(bounds.intersectsBox(corridor),false,`${id}/${name}`);
        assert.ok(Math.max(...[bounds.min.x,bounds.max.x,bounds.min.z,bounds.max.z].map(Math.abs))<budget.maxHorizontalExtent,`${id}/${name}`);
      }
      for(const name of ['position','normal']) for(const value of object.geometry.attributes[name].array) assert.ok(Number.isFinite(value),`${id}/${name}`);
      const p=object.geometry.attributes.position;
      if(object.geometry.index) for(const index of object.geometry.index.array) assert.ok(index>=0&&index<p.count,id);
      else assert.equal(p.count%3,0,id);
    });
    disposeFieldEnvironmentGeometry(group);
  }
});

test('Clock Tower has two physically perpendicular dials, hour marks and diamond-tipped hands',()=>{
  const group=create('75041269'),dials=instances(group,'clock-prison-dial');
  assert.equal(dials.length,2);
  const normal=dials.map(({matrix})=>new THREE.Vector3(0,1,0).transformDirection(matrix));
  assert.ok(Math.abs(normal[0].dot(normal[1]))<.001);
  assert.equal(count(group,'clock-prison-gold-hour-mark'),24);
  assert.equal(count(group,'clock-prison-gold-clock-hand'),4);
  assert.equal(count(group,'clock-prison-diamond-hand-tip'),4);
  assert.equal(count(group,'clock-prison-corner-turret-cone-roof'),4);
  disposeFieldEnvironmentGeometry(group);
});

test('Golden Castle and the two mausoleums retain their different observed structures',()=>{
  const castle=create('72283691');
  assert.equal(count(castle,'stromberg-broad-ascending-stair'),7);
  assert.equal(count(castle,'stromberg-central-pointed-gable'),1);
  assert.equal(count(castle,'stromberg-gold-turret-cone-roof'),4);
  assert.equal(count(castle,'stromberg-crenellation'),16);
  disposeFieldEnvironmentGeometry(castle);
  const emperor=create('80921533');
  assert.equal(count(emperor,'emperor-orange-square-obelisk'),2);
  assert.equal(count(emperor,'emperor-obelisk-pyramid-cap'),2);
  assert.equal(count(emperor,'emperor-round-stone-brazier'),1);
  const flames=instances(emperor,'emperor-large-curling-flame')[0].object.geometry.userData.continuousCurves;
  assert.equal(flames.length,3);
  assert.ok(flames.every(p=>p.at(-1)[1]-p[0][1]>3.9));
  disposeFieldEnvironmentGeometry(emperor);
  const white=create('24382602');
  assert.equal(count(white,'white-mausoleum-tall-pale-column'),5);
  assert.equal(count(white,'white-mausoleum-cyan-vertical-light'),5);
  assert.equal(count(white,'white-mausoleum-layered-curved-monument'),4);
  assert.equal(count(white,'white-mausoleum-purple-inset-stud'),16);
  assert.equal(count(white,'emperor-orange-square-obelisk'),0);
  disposeFieldEnvironmentGeometry(white);
});

test('Endymion has climbing continuous ribbons and Rainbow Ruins has divided terraces plus seven colored physical arcs',()=>{
  const endymion=create('39910367');
  const ribbons=instances(endymion,'endymion-continuous-pink-inscribed-spirals')[0].object.geometry.userData.continuousCurves;
  assert.equal(ribbons.length,2);
  for(const path of ribbons) {
    assert.ok(path.at(-1)[1]-path[0][1]>18);
    for(let i=1;i<path.length;i++) assert.ok(new THREE.Vector3(...path[i]).distanceTo(new THREE.Vector3(...path[i-1]))<1.6);
  }
  assert.equal(instances(endymion,'endymion-thin-blue-orbits')[0].object.geometry.userData.continuousCurves.length,3);
  assert.equal(count(endymion,'endymion-small-town-house'),7);
  disposeFieldEnvironmentGeometry(endymion);
  const ruins=create('34487429'),terraces=instances(ruins,'rainbow-ruins-curved-stone-terraces')[0].object.geometry;
  assert.equal(terraces.userData.terraceCount,7);
  assert.equal(terraces.userData.stairAisleCount,3);
  assert.equal(count(ruins,'rainbow-ruins-narrow-stair-aisle'),42);
  const arcs=instances(ruins,'rainbow-ruins-seven-colored-physical-arcs')[0].object.geometry;
  assert.equal(arcs.userData.continuousCurves.length,7);
  assert.ok(arcs.attributes.color);
  const colors=new Set();for(let i=0;i<arcs.attributes.color.count;i++) colors.add([arcs.attributes.color.getX(i),arcs.attributes.color.getY(i),arcs.attributes.color.getZ(i)].join(','));
  assert.equal(colors.size,7);
  disposeFieldEnvironmentGeometry(ruins);
});

test('Kyoutou observation dome and the two U.A. stadium bowls are different physical constructions',()=>{
  const port=create('56111151');
  assert.equal(count(port,'kyoutou-thin-blue-tower-shaft'),1);
  assert.equal(count(port,'kyoutou-wide-blue-observation-gallery'),1);
  assert.equal(count(port,'kyoutou-shallow-gold-dome'),1);
  assert.equal(count(port,'kyoutou-red-pointed-lantern-cap'),1);
  assert.equal(count(port,'kyoutou-gold-gallery-window-stanchion'),20);
  assert.equal(count(port,'kyoutou-gray-coastal-city-building'),18);
  disposeFieldEnvironmentGeometry(port);
  const stadium=create('19814508'),hyper=create('12931061');
  assert.equal(instances(stadium,'ua-stadium-dark-oval-grandstands')[0].object.geometry.userData.terraceCount,7);
  assert.equal(instances(hyper,'ua-hyper-deep-oval-tiered-bowl')[0].object.geometry.userData.terraceCount,9);
  assert.equal(count(stadium,'ua-stadium-green-oval-field'),1);
  assert.equal(count(hyper,'ua-stadium-green-oval-field'),0);
  assert.equal(count(stadium,'ua-stadium-red-circular-emblem'),1);
  const shell=instances(stadium,'ua-stadium-asymmetric-pale-angular-crescent-shell')[0].object.geometry;
  assert.ok(shell.userData.rightCrownHeight>shell.userData.leftCrownHeight+7);
  assert.equal(count(hyper,'ua-hyper-diagonal-dark-roof-panel'),2);
  const tiers=instances(hyper,'ua-hyper-six-concentric-cyan-tier-lights')[0].object.geometry.userData.continuousCurves;
  assert.equal(tiers.length,6);
  assert.ok(tiers.at(-1)[0][1]>tiers[0][0][1]+6);
  assert.equal(count(hyper,'ua-hyper-dense-white-rim-bulb'),44);
  for(const [group,name] of [[stadium,'ua-stadium-dark-oval-grandstands'],[hyper,'ua-hyper-deep-oval-tiered-bowl']]) {
    const g=instances(group,name)[0].object.geometry,p=g.attributes.position,index=g.index.array;
    let checked=0;
    for(let i=0;i<index.length;i+=3) {
      const v=[index[i],index[i+1],index[i+2]].map(n=>new THREE.Vector3(p.getX(n),p.getY(n),p.getZ(n)));
      if(v[0].y<.01||Math.max(...v.map(a=>a.y))-Math.min(...v.map(a=>a.y))>.001) continue;
      const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
      assert.ok(normal.y>0,'physical upper treads face the camera and light rather than the underside');checked++;
    }
    assert.ok(checked>100);
  }
  disposeFieldEnvironmentGeometry(stadium);disposeFieldEnvironmentGeometry(hyper);
});

test('theaters retain heart/eye ornaments and truly flared ribbed turrets; the park retains suspended cabins',()=>{
  const playhouse=create('77297908');
  assert.equal(count(playhouse,'abyss-playhouse-giant-eye-ornament'),2);
  assert.equal(count(playhouse,'abyss-playhouse-warm-marquee-bulb'),24);
  const heart=instances(playhouse,'abyss-playhouse-pink-heart-sign')[0].object.geometry.userData.continuousCurves[0];
  assert.ok(Math.max(...heart.map(p=>p[0]))>1.9&&Math.min(...heart.map(p=>p[0]))< -1.9);
  assert.ok(heart[heart.length/2|0][1]<heart[0][1]-2);
  disposeFieldEnvironmentGeometry(playhouse);
  const despia=create('99543666'),turrets=instances(despia,'despia-flared-ribbed-red-trumpet-turret');
  assert.equal(turrets.length,4);
  const p=turrets[0].object.geometry.attributes.position,upper=[],lower=[];
  for(let i=0;i<p.count;i++) (p.getY(i)>.49?upper:p.getY(i)<-.49?lower:[]).push(Math.hypot(p.getX(i),p.getZ(i)));
  assert.ok(Math.min(...upper)>Math.max(...lower)*3);
  assert.equal(turrets[0].object.geometry.userData.flaredRibCount,12);
  assert.equal(count(despia,'despia-red-circular-facade-gem'),5);
  assert.equal(instances(despia,'despia-twelve-dark-ribs-per-flared-turret')[0].object.geometry.userData.continuousCurves.length,48);
  disposeFieldEnvironmentGeometry(despia);
  const park=create('33773528');
  assert.equal(count(park,'amazement-colored-suspended-wheel-cabin'),12);
  assert.equal(count(park,'amazement-wheel-radial-spoke'),12);
  assert.equal(count(park,'amazement-white-stacked-central-spire'),5);
  assert.equal(count(park,'amazement-angular-hall-gable'),1);
  disposeFieldEnvironmentGeometry(park);
});

test('Dogmatika retains a pale distant cathedral; Ritual Sanctuary reconstructs a figurine display instead of inventing a temple',()=>{
  const city=create('65589010');
  assert.equal(count(city,'dogmatika-violet-layered-city-tower'),11);
  assert.equal(count(city,'dogmatika-white-gold-cathedral-crown'),5);
  const tower=instances(city,'dogmatika-distant-pale-citadel')[0],position=new THREE.Vector3().setFromMatrixPosition(tower.matrix);
  assert.ok(position.z<-40);
  disposeFieldEnvironmentGeometry(city);
  const display=create('95658967');
  assert.equal(count(display,'ritual-sanctuary-shallow-golden-oval-plinth'),3);
  assert.equal(count(display,'ritual-sanctuary-wide-pink-triangular-spotlight'),1);
  assert.equal(count(display,'ritual-sanctuary-tilted-confetti-rectangle'),24);
  const names=display.children.flatMap(o=>o.userData.instanceNames??[]);
  assert.ok(names.every(n=>!/(column|temple|bride|groom|statue)/.test(n)));
  disposeFieldEnvironmentGeometry(display);
});

test('all fourteen replacements dispose each material, static buffer and instance allocation exactly once',()=>{
  for(const id of ids) {
    const group=create(id),resources=new Set();
    group.traverse(o=>{if(o.isMesh){resources.add(o);resources.add(o.geometry);resources.add(o.material);}});
    const counts=new Map([...resources].map(r=>[r,0]));
    for(const resource of resources) resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
    disposeFieldEnvironmentGeometry(group);disposeFieldEnvironmentGeometry(group);
    for(const [resource,count] of counts) assert.equal(count,1,`${id}/${resource.type}`);
    assert.equal(group.children.length,0,id);
  }
});
