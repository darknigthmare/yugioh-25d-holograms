import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE as applicationThree } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry, FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { DARK_CARD_LANDMARKS, DARK_INSPECTED_ART_PROFILES } from '../src/ui/FieldEnvironmentDarkReferences.js';

const ids=Object.keys(DARK_CARD_LANDMARKS);
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

test('twenty inspected constructions use the production namespace and every transformed instance stays outside the duel',()=>{
  assert.equal(ids.length,20);
  for(const id of ids) {
    const group=create(id);
    assert.equal(group.userData.fidelity,'reference-informed-geometry',id);
    assert.equal(group.userData.landmark,DARK_CARD_LANDMARKS[id]);
    assert.equal(group.userData.inspectedArt,DARK_INSPECTED_ART_PROFILES[id]);
    assert.ok(group.userData.meshCount<=budget.maxPrimitiveCount,id);
    assert.ok(group.userData.drawCallCount<=budget.maxDrawCallCount,id);
    assert.ok(group.userData.materialCount<=budget.maxMaterialCount,id);
    assert.equal(DARK_INSPECTED_ART_PROFILES[id].sourceUrl,`https://images.ygoprodeck.com/images/cards_cropped/${id}.jpg`);
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

test('Palabyrinth retains the continuous thick tower spiral and Terror retains layered physical bridges',()=>{
  const fortress=create('63883999'),spiral=curves(fortress,'palabyrinth-thick-continuous-left-spiral')[0];
  assert.ok(spiral.at(-1)[1]-spiral[0][1]>=24);
  for(let i=1;i<spiral.length;i++) assert.ok(new THREE.Vector3(...spiral[i]).distanceTo(new THREE.Vector3(...spiral[i-1]))<.6);
  assert.equal(count(fortress,'palabyrinth-front-vertebral-hollow'),10);
  assert.equal(curves(fortress,'palabyrinth-concentric-silver-ground-sigil').length,3);
  disposeFieldEnvironmentGeometry(fortress);
  const terror=create('1050355');
  assert.equal(count(terror,'terror-mirror-layered-elevated-bridge'),3);
  assert.equal(curves(terror,'terror-mirror-crawling-violet-strands').length,4);
  for(const {object} of instances(terror,'terror-mirror-layered-elevated-bridge')) {
    const p=object.geometry.userData.continuousCurve;
    assert.ok(p[Math.floor(p.length/2)][1]>p[0][1]+1.9);
    assert.ok(p[Math.floor(p.length/2)][2]<p[0][2]-2.9);
  }
  disposeFieldEnvironmentGeometry(terror);
});

test('Shadow Prison remains sandy scenery and the Monarch chamber surrounds one painted subject rather than inventing two thrones',()=>{
  const desert=create('81788994');
  assert.equal(count(desert,'shadow-prison-ochre-left-desert-cliff'),1);
  assert.equal(count(desert,'shadow-prison-golden-ground-light-point'),2);
  assert.ok(desert.children.flatMap(o=>o.userData.instanceNames).every(n=>!/(castle|armor|staff|statue)/.test(n)));
  disposeFieldEnvironmentGeometry(desert);
  const chamber=create('84171830');
  assert.equal(count(chamber,'monarch-domain-tall-chamber-column'),6);
  assert.equal(curves(chamber,'monarch-domain-three-concentric-rear-bands').length,3);
  assert.equal(count(chamber,'monarch-domain-white-overhead-light-shaft'),1);
  assert.ok(chamber.children.flatMap(o=>o.userData.instanceNames).every(n=>!/(throne|monarch-figure|visitor)/.test(n)));
  disposeFieldEnvironmentGeometry(chamber);
});

test('the castles retain different narrow Gothic, needle, stained glass and bright chalice forms',()=>{
  const sanctuary=create('16625614');
  assert.equal(count(sanctuary,'dark-sanctuary-long-needle-spire'),5);
  assert.equal(count(sanctuary,'dark-sanctuary-broken-steep-crag'),1);
  disposeFieldEnvironmentGeometry(sanctuary);
  const eye=create('70122149');
  assert.equal(count(eye,'pareidolia-black-stepped-castle'),4);
  assert.equal(count(eye,'pareidolia-pale-cyan-moon'),1);
  assert.equal(count(eye,'pareidolia-fine-gold-vertical-outline'),8);
  disposeFieldEnvironmentGeometry(eye);
  const dolls=create('36890111');
  assert.equal(count(dolls,'dreadful-dolls-round-tiered-mansion'),3);
  assert.equal(count(dolls,'dreadful-dolls-irregular-stained-glass-lancet'),21);
  const glass=instances(dolls,'dreadful-dolls-irregular-stained-glass-lancet')[0].object.geometry;
  assert.ok(glass.attributes.color);
  const colors=new Set();for(let i=0;i<glass.attributes.color.count;i++) colors.add([glass.attributes.color.getX(i),glass.attributes.color.getY(i),glass.attributes.color.getZ(i)].join(','));
  assert.equal(colors.size,5);
  disposeFieldEnvironmentGeometry(dolls);
  const labrynth=create('33407125');
  assert.equal(count(labrynth,'labrynth-broad-white-ascending-spiral-ramp'),2);
  assert.equal(count(labrynth,'labrynth-upper-white-gallery-ramp'),1);
  assert.equal(count(labrynth,'labrynth-large-right-chalice-bowl'),1);
  assert.equal(count(labrynth,'labrynth-chalice-diamond-ornament'),6);
  assert.equal(count(labrynth,'labrynth-central-fine-gallery-arch'),21);
  assert.equal(count(labrynth,'labrynth-fine-secondary-white-turret'),8);
  assert.equal(instances(labrynth,'labrynth-chalice-twelve-pointed-white-petals')[0].object.geometry.userData.pointedPetalCount,12);
  for(const {object} of instances(labrynth,'labrynth-broad-white-ascending-spiral-ramp')) {
    const path=object.geometry.userData.continuousCurve,a=path[0],b=path.at(-1);
    assert.ok(path.length>60);assert.ok(b[1]-a[1]>5);assert.ok(Math.abs(b[2]-a[2])>9);
    const line=new THREE.Line3(new THREE.Vector3(...a),new THREE.Vector3(...b));
    assert.ok(Math.max(...path.map(p=>{
      const point=new THREE.Vector3(...p);return point.distanceTo(line.closestPointToPoint(point,true,new THREE.Vector3()));
    }))>5,'the physical route deviates more than five units from its actual 3D start/end segment');
  }
  disposeFieldEnvironmentGeometry(labrynth);
});

test('Fallen Paradise has a coherent twisted leafless tree with spreading roots; Ghostrick remains an interior party room',()=>{
  const paradise=create('13301895');
  assert.equal(curves(paradise,'fallen-paradise-fine-reaching-leafless-limbs').length,28);
  const limbs=curves(paradise,'fallen-paradise-fine-reaching-leafless-limbs');
  for(let i=0;i<limbs.length;i+=2) assert.ok(Math.min(...limbs[i].map(p=>new THREE.Vector3(...p).distanceTo(new THREE.Vector3(...limbs[i+1][0]))))<.3,'secondary limb attaches to its primary branch');
  assert.equal(curves(paradise,'fallen-paradise-spreading-twisted-roots').length,8);
  assert.equal(count(paradise,'fallen-paradise-dark-luminous-tree-hollow'),5);
  assert.equal(count(paradise,'fallen-paradise-green-hollow-light'),10);
  assert.equal(count(paradise,'fallen-paradise-single-red-apple-lobe'),2);
  disposeFieldEnvironmentGeometry(paradise);
  const room=create('99795159');
  assert.equal(count(room,'ghostrick-heavy-blue-pleated-curtain'),2);
  const p=instances(room,'ghostrick-heavy-blue-pleated-curtain')[0].object.geometry.attributes.position;
  assert.ok(Math.max(...Array.from({length:p.count},(_,i)=>p.getZ(i)))-Math.min(...Array.from({length:p.count},(_,i)=>p.getZ(i)))>.7);
  assert.equal(count(room,'ghostrick-round-white-draped-table'),1);
  assert.equal(curves(room,'ghostrick-three-branched-candle-arms').length,3);
  assert.equal(count(room,'ghostrick-white-candle'),3);
  assert.equal(count(room,'ghostrick-sofa-seat'),1);
  assert.ok(room.children.flatMap(o=>o.userData.instanceNames).every(n=>!/(tomb|grave|castle|ghost-figure)/.test(n)));
  disposeFieldEnvironmentGeometry(room);
});

test('Mementomictlan is an engraved copper ziggurat while Necrovalley opens between striated rocks towards two distant pyramids',()=>{
  const pyramid=create('43338320');
  assert.equal(count(pyramid,'mementomictlan-copper-red-ziggurat-tier'),4);
  assert.equal(curves(pyramid,'mementomictlan-square-maze-carvings').length,28);
  assert.equal(count(pyramid,'mementomictlan-large-black-round-brazier'),2);
  assert.equal(count(pyramid,'mementomictlan-angular-colored-crystal-shard'),12);
  disposeFieldEnvironmentGeometry(pyramid);
  const gorge=create('47355498');
  for(const name of ['necrovalley-left-vertically-striated-wall','necrovalley-right-vertically-striated-wall']) assert.equal(instances(gorge,name)[0].object.geometry.userData.irregularWall,true);
  assert.equal(count(gorge,'necrovalley-two-distant-pyramids'),2);
  assert.equal(count(gorge,'necrovalley-setting-sun'),1);
  assert.equal(curves(gorge,'necrovalley-thin-eroded-vertical-wall-veins').length,14);
  assert.equal(count(gorge,'mementomictlan-copper-red-ziggurat-tier'),0);
  disposeFieldEnvironmentGeometry(gorge);
});

test('Nightmare Throne has a curved metallic slotted chair with rolled arms and Dark World has thick opened relief doors',()=>{
  const chair=create('93729896');
  const back=instances(chair,'nightmare-throne-curved-tall-metallic-back')[0].object.geometry,p=back.attributes.position;
  assert.equal(back.userData.curvedChairBack,true);
  assert.ok(Math.max(...Array.from({length:p.count},(_,i)=>p.getZ(i)))>1.4);
  assert.equal(count(chair,'nightmare-throne-rolled-cylindrical-armrest'),2);
  assert.equal(count(chair,'nightmare-throne-dark-rectangular-back-slot'),1);
  assert.equal(count(chair,'nightmare-throne-floating-translucent-rectangle'),4);
  disposeFieldEnvironmentGeometry(chair);
  const gates=create('33017655'),doors=instances(gates,'dark-world-heavy-partly-opened-carved-door');
  assert.equal(doors.length,2);
  const normals=doors.map(({matrix})=>new THREE.Vector3(0,0,1).transformDirection(matrix));
  assert.ok(normals[0].x<-.3&&normals[1].x>.3);
  assert.equal(curves(gates,'dark-world-long-raised-curling-door-reliefs').length,10);
  assert.equal(count(gates,'dark-world-flower-like-round-capital-lobe'),12);
  disposeFieldEnvironmentGeometry(gates);
});

test('the Pandemonium grown court, Shiranui light ribbons and Supreme King molten hollow spire retain their different surfaces',()=>{
  const court=create('94585852');
  assert.equal(count(court,'pandemonium-grown-yellow-green-ribbed-column'),4);
  assert.equal(count(court,'pandemonium-circular-stepped-court'),4);
  assert.equal(count(court,'pandemonium-oval-rim-pointed-tooth'),14);
  disposeFieldEnvironmentGeometry(court);
  const energy=create('40005099');
  assert.equal(count(energy,'shiranui-synthesis-luminous-crossing-ribbon'),2);
  assert.equal(count(energy,'shiranui-synthesis-wide-rising-energy-band'),1);
  assert.equal(curves(energy,'shiranui-synthesis-violet-vertical-light-streaks').length,19);
  assert.ok(energy.children.flatMap(o=>o.userData.instanceNames).every(n=>!/(grave|sword|samurai-figure)/.test(n)));
  disposeFieldEnvironmentGeometry(energy);
  const spire=create('72043279');
  assert.equal(count(spire,'supreme-king-continuous-hollow-rock-spire'),1);
  assert.equal(instances(spire,'supreme-king-continuous-hollow-rock-spire')[0].object.geometry.userData.continuousSpireHeight,34);
  assert.equal(count(spire,'supreme-king-deep-black-spire-cavity'),3);
  assert.equal(count(spire,'supreme-king-small-grey-gatehouse'),1);
  assert.equal(curves(spire,'supreme-king-yellow-molten-crack-lines').length,7);
  disposeFieldEnvironmentGeometry(spire);
});

test('Vampire Kingdom has a pitched roof town and Vendread has a neon skyline behind actual sharp parallel barbed wire',()=>{
  const town=create('62188962');
  assert.equal(count(town,'vampire-kingdom-pale-village-house'),9);
  assert.equal(count(town,'vampire-kingdom-dark-pitched-village-roof'),9);
  assert.equal(count(town,'vampire-kingdom-small-pointed-dormer-roof'),3);
  assert.equal(count(town,'vampire-kingdom-distant-castle-tower'),3);
  disposeFieldEnvironmentGeometry(town);
  const city=create('76871889');
  assert.equal(count(city,'vendread-nights-narrow-modern-city-building'),8);
  assert.equal(count(city,'vendread-nights-yellow-cyan-window-grid'),96);
  assert.equal(curves(city,'vendread-nights-five-parallel-barbed-wire-strands').length,5);
  assert.equal(count(city,'vendread-nights-sharp-crossed-wire-barb'),36);
  disposeFieldEnvironmentGeometry(city);
  const road=create('59160188');
  assert.equal(count(road,'darkness-lair-broken-angular-road-slab'),18);
  assert.equal(count(road,'darkness-lair-jagged-black-crag'),10);
  assert.ok(road.children.flatMap(o=>o.userData.instanceNames).every(n=>!/(dragon-head|winged-figure|castle)/.test(n)));
  disposeFieldEnvironmentGeometry(road);
});

test('replacing all twenty dark scenes releases each instance allocation, buffer and material exactly once',()=>{
  for(const id of ids) {
    const group=create(id),resources=new Set();
    group.traverse(o=>{if(o.isMesh){resources.add(o);resources.add(o.geometry);resources.add(o.material);}});
    const counts=new Map([...resources].map(r=>[r,0]));
    for(const resource of resources) resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
    disposeFieldEnvironmentGeometry(group);disposeFieldEnvironmentGeometry(group);
    for(const [resource,n] of counts) assert.equal(n,1,`${id}/${resource.type}`);
    assert.equal(group.children.length,0,id);
  }
});
