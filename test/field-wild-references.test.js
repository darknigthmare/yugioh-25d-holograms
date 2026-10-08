import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {FIELD_GEOMETRY_THREE} from '../src/ui/FieldGeometryThree.js';
import {WILD_CARD_LANDMARKS,WILD_INSPECTED_ART_PROFILES,createWildReferenceGeometry} from '../src/ui/FieldEnvironmentWildReferences.js';
import {createFieldEnvironmentGeometry,disposeFieldEnvironmentGeometry,hasFieldEnvironmentLandmarkGeometry,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget} from '../src/ui/FieldEnvironmentGeometry.js';
import {getFieldEnvironmentForCardId} from '../src/ui/FieldEnvironmentRegistry.js';
import {FIELD_SPELL_REFERENCE_ART_SNAPSHOT} from '../src/ui/FieldSpellReferenceArtSnapshot.js';

const motifs={
  '87624166':['ancient-forked-enclosing-trunk','ancient-bark-seam','ancient-parallel-sunlight-shaft'],
  '5050644':['aroma-pointed-wrought-arch','aroma-curled-iron-scroll','aroma-white-jasmine','aroma-cottage-tiled-roof','aroma-curving-pale-paver'],
  '71645242':['black-crossed-teal-thorn-stem','black-pointed-thorn','black-cracked-stone-plinth','black-purple-climbing-rose'],
  '62265044':['ravine-fluted-orange-cliff','ravine-dark-vertical-cleft','ravine-pale-low-mist'],
  '87430998':['forest-forked-rooted-broadleaf','forest-cut-earth-bank','forest-long-foreground-grass'],
  '56594520':['gaia-massive-buttress-oak','gaia-long-bark-furrow','gaia-pale-bark-epiphyte'],
  '75782277':['hunting-pale-diagonal-ground','hunting-ochre-radial-earth-streak'],
  '10080320':['jurassic-smoke-cone-volcano','jurassic-pale-caldera-rim','jurassic-layered-fern-frond','jurassic-small-blue-lake'],
  '17228908':['lost-stepped-white-gray-cliff','lost-broad-feather-palm-crown','lost-pale-egg-shaped-plant'],
  '50913601':['mountain-sharp-rear-seamed-peak','mountain-left-fractured-ridge','mountain-oblique-foreground-ridge','mountain-blue-white-cloud-shelf'],
  '76869711':['rikka-pale-bare-upper-branch','rikka-six-armed-cyan-snowflake','rikka-silver-violet-diamond-rim'],
  '86318356':['sogen-layered-green-grass-plain','sogen-exposed-diagonal-fissure','sogen-sharp-foreground-blades'],
  '23424603':['wasteland-horizontal-barren-terrace','wasteland-angular-foreground-escarpment','wasteland-two-bare-trees'],
  '45383307':['cruiser-hovering-gold-trapezoid-pod','cruiser-cyan-circuit-channel','cruiser-horizontal-cannon'],
  '9989792':['fortress-three-stepped-pyramid-tiers','fortress-gold-maze-engraving','fortress-vertical-cyan-inset'],
  '72772445':['kingolem-gold-platform-trapezoid','kingolem-long-diagonal-cannon','kingolem-cyan-circuit-lines'],
  '84335863':['rose-broad-pale-stair','rose-broken-fluted-column','rose-dense-white-flower-bank'],
  '12801833':['traptrip-wide-curling-light-ribbon','traptrip-floating-green-oval-dew','traptrip-red-point-gold-sphere'],
  '60884672':['golgonda-wind-rippled-dune','golgonda-leaning-carved-ruin','golgonda-curved-white-tusk'],
  '7206349':['vernusylph-turquoise-curving-river','vernusylph-pink-flowering-crown','vernusylph-large-striped-green-bud']
};
const ids=Object.keys(motifs),create=id=>createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE,getFieldEnvironmentForCardId(id));
const named=(group,name)=>group.children.filter(mesh=>mesh.userData.instanceNames.includes(name));
const curves=(group,name)=>named(group,name).flatMap(mesh=>mesh.geometry.userData.continuousCurves||[mesh.geometry.userData.continuousCurve]).filter(Boolean);

test('20 individually opened wild sources retain original JPG bytes and dispatch through the real bounded factory',()=>{
  assert.equal(ids.length,20);assert.deepEqual(new Set(Object.keys(WILD_CARD_LANDMARKS)),new Set(ids));
  assert.equal(createWildReferenceGeometry({profile:{cardId:'unowned'}}),false);
  for(const id of ids){
    const inspected=WILD_INSPECTED_ART_PROFILES[id],snapshot=FIELD_SPELL_REFERENCE_ART_SNAPSHOT.entries.find(entry=>entry.cardId===id);
    assert.ok(Object.isFrozen(inspected)&&Object.isFrozen(inspected.palette)&&Object.isFrozen(inspected.motifs));
    const bytes=readFileSync(new URL(`../public/environments/field-art/${id}.jpg`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),snapshot.sha256,id);
    const group=create(id);assert.equal(group.userData.inspectedArt,inspected);assert.equal(group.userData.fidelity,'reference-informed-geometry');
    assert.equal(group.userData.landmark,WILD_CARD_LANDMARKS[id]);
    for(const name of motifs[id])assert.ok(hasFieldEnvironmentLandmarkGeometry(group,name),`${id}: ${name}`);
    for(const generic of ['weathered-rock','tree-trunk','canopy-layer','tower','portal-anchor'])assert.equal(hasFieldEnvironmentLandmarkGeometry(group,generic),false,`${id}: ${generic}`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('whole rendered instances clear the duel corridor and all 20 scenes meet finite-buffer, index, extent and draw budgets',()=>{
  const corridor=new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min),new THREE.Vector3(...budget.playableCorridor.max));
  for(const id of ids){
    const group=create(id);group.updateMatrixWorld(true);
    assert.ok(group.userData.referencePrimitiveCount<=budget.maxPrimitiveCount,`${id}: ${group.userData.referencePrimitiveCount}`);
    assert.ok(group.userData.drawCallCount<=budget.maxDrawCallCount,`${id}: ${group.userData.drawCallCount}`);
    assert.ok(group.userData.materialCount<=budget.maxMaterialCount,`${id}: ${group.userData.materialCount}`);
    group.traverse(mesh=>{
      if(!mesh.isMesh)return;assert.equal(mesh.isInstancedMesh,true);assert.equal(mesh.material.map,null);
      const positions=mesh.geometry.attributes.position;assert.ok(positions.count>=3);
      for(const attribute of ['position','normal','color']){
        const buffer=mesh.geometry.attributes[attribute];assert.ok(buffer,`${id}/${attribute}`);
        for(const v of buffer.array)assert.ok(Number.isFinite(v),`${id}/${attribute}`);
      }
      assert.equal(mesh.geometry.attributes.normal.count,positions.count);assert.equal(mesh.geometry.attributes.color.count,positions.count);
      assert.ok(Array.from(mesh.geometry.attributes.normal.array).some(v=>Math.abs(v)>.5),'actual surface normals');
      if(mesh.geometry.index)for(const i of mesh.geometry.index.array)assert.ok(i>=0&&i<positions.count,`${id}: index ${i}`);
      mesh.geometry.computeBoundingBox();
      for(let i=0;i<mesh.count;i++){
        const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);
        const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
        assert.equal(bounds.intersectsBox(corridor),false,`${id}/${mesh.userData.instanceNames[i]}`);
        for(const axis of ['x','z'])assert.ok(bounds.min[axis]>-budget.maxHorizontalExtent&&bounds.max[axis]<budget.maxHorizontalExtent,`${id}/${axis}`);
      }
    });disposeFieldEnvironmentGeometry(group);
  }
});

test('the five tree and jungle compositions have different root, canopy, fern and caldera silhouettes',()=>{
  const gaia=create('56594520'),forest=create('87430998'),ancient=create('87624166'),jurassic=create('10080320'),lost=create('17228908');
  const roots=curves(gaia,'gaia-massive-buttress-oak');assert.equal(roots.length,8);assert.ok(roots.some(c=>Math.max(...c.map(p=>p[0]))-Math.min(...c.map(p=>p[0]))>9));
  assert.equal(curves(forest,'forest-forked-rooted-broadleaf').length,32);
  assert.equal(curves(ancient,'ancient-parallel-sunlight-shaft').length,12);
  assert.ok(named(jurassic,'jurassic-layered-fern-frond')[0].geometry.attributes.position.count>300);
  assert.equal(named(lost,'lost-pale-egg-shaped-plant')[0].geometry.userData.referencePrimitiveCount,10);
  for(const g of [gaia,forest,ancient,jurassic,lost])disposeFieldEnvironmentGeometry(g);
});

test('gold ruins keep distinct hovering pod, stepped pyramid and raised diagonal cannon compositions',()=>{
  const cruiser=create('45383307'),fortress=create('9989792'),kingolem=create('72772445');
  assert.equal(named(cruiser,'cruiser-hovering-gold-trapezoid-pod')[0].geometry.userData.referencePrimitiveCount,4);
  assert.equal(named(fortress,'fortress-three-stepped-pyramid-tiers')[0].geometry.userData.referencePrimitiveCount,3);
  assert.equal(curves(kingolem,'kingolem-long-diagonal-cannon').length,4);
  assert.ok(curves(kingolem,'kingolem-long-diagonal-cannon').every(c=>c.at(-1)[1]>c[0][1]));
  assert.ok(curves(cruiser,'cruiser-horizontal-cannon').every(c=>Math.abs(c.at(-1)[1]-c[0][1])<.001));
  for(const g of [cruiser,fortress,kingolem])disposeFieldEnvironmentGeometry(g);
});

test('flower gardens retain winding ironwork, stepped stone architecture and source palette colors',()=>{
  const aroma=create('5050644'),rose=create('84335863'),black=create('71645242');
  assert.equal(curves(aroma,'aroma-curled-iron-scroll').length,15);
  assert.ok(curves(aroma,'aroma-curled-iron-scroll').every(c=>Math.max(...c.map(p=>p[0]))-Math.min(...c.map(p=>p[0]))>.7));
  assert.equal(named(rose,'rose-broad-pale-stair')[0].geometry.userData.referencePrimitiveCount,28);
  assert.equal(named(black,'black-pointed-thorn')[0].geometry.userData.referencePrimitiveCount,32);
  for(const g of [aroma,rose,black]){for(const mesh of g.children){assert.equal(mesh.material.vertexColors,true);assert.equal(mesh.material.emissive.getHex(),0);}disposeFieldEnvironmentGeometry(g);}
});

test('Mountain preserves two asymmetrical colored massifs with at least 80 actual radial relief folds',()=>{
  const group=create('50913601'),specs=[['mountain-sharp-rear-seamed-peak',9,-37],['mountain-left-fractured-ridge',-15,-30]];
  const heights=[],folds=[];
  for(const [name,x,z]of specs){
    const mesh=named(group,name)[0],p=mesh.geometry.attributes.position,{radialSegments,rings}=mesh.geometry.userData.radialSurface;
    heights.push(Math.max(...Array.from({length:p.count},(_,i)=>p.getY(i))));
    const row=Math.floor(rings*.65),radii=Array.from({length:radialSegments},(_,i)=>Math.hypot((p.getX(row*(radialSegments+1)+i)-x)/(name.includes('rear')?13:8),(p.getZ(row*(radialSegments+1)+i)-z)/(name.includes('rear')?7:5)));
    const count=radii.filter((r,i)=>r>radii[(i+radialSegments-1)%radialSegments]&&r>radii[(i+1)%radialSegments]).length;
    assert.ok(count>=40,`${name}: ${count} measured radial maxima`);folds.push(count);
    assert.ok(Math.max(...radii)-Math.min(...radii)>.2,'actual corrugated silhouette');
  }
  assert.ok(heights[0]>heights[1]*1.7);assert.ok(folds.reduce((a,b)=>a+b,0)>=80);
  disposeFieldEnvironmentGeometry(group);
});

test('Forest and Sogen grass blades start above their actual tessellated terrain rather than being buried in it',()=>{
  function surfaceY(mesh,x,z){
    const p=mesh.geometry.attributes.position,index=mesh.geometry.index;
    for(let i=0;i<index.count;i+=3){
      const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2),ax=p.getX(a),az=p.getZ(a),bx=p.getX(b)-ax,bz=p.getZ(b)-az,cx=p.getX(c)-ax,cz=p.getZ(c)-az,den=bx*cz-cx*bz;
      if(Math.abs(den)<1e-8)continue;
      const u=((x-ax)*cz-cx*(z-az))/den,v=(bx*(z-az)-(x-ax)*bz)/den;
      if(u>=-1e-6&&v>=-1e-6&&u+v<=1+1e-6)return p.getY(a)+u*(p.getY(b)-p.getY(a))+v*(p.getY(c)-p.getY(a));
    }
    return null;
  }
  for(const [id,groundName,grassName]of[['87430998','forest-lime-grass-bank','forest-long-foreground-grass'],['86318356','sogen-layered-green-grass-plain','sogen-sharp-foreground-blades']]){
    const group=create(id),ground=named(group,groundName);
    for(const mesh of named(group,grassName)){
      const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i+=12){
        const x=p.getX(i),z=p.getZ(i),under=ground.map(g=>surfaceY(g,x,z)).find(y=>y!==null);
        assert.ok(Number.isFinite(under),`${id}: terrain supports grass`);
        assert.ok(p.getY(i)>under+.01&&p.getY(i)<under+.12,`${id}: grass base ${p.getY(i)} / terrain ${under}`);
      }
    }
    disposeFieldEnvironmentGeometry(group);
  }
});

test('snow signs, dew ribbons and dune ripples use real shaped buffers without invented figure models',()=>{
  const rikka=create('76869711'),trap=create('12801833'),dunes=create('60884672');
  assert.equal(curves(rikka,'rikka-six-armed-cyan-snowflake').length,72);
  const ribbons=named(trap,'traptrip-wide-curling-light-ribbon');assert.equal(ribbons[0].geometry.userData.referencePrimitiveCount,4);
  for(const mesh of named(dunes,'golgonda-wind-rippled-dune')){
    const p=mesh.geometry.attributes.position;assert.ok(p.count>1500);
    assert.ok(Math.max(...Array.from({length:p.count},(_,i)=>p.getY(i)))-Math.min(...Array.from({length:p.count},(_,i)=>p.getY(i)))>2.5);
  }
  for(const g of [rikka,trap,dunes]){assert.equal(g.userData.publicOnly,true);for(const name of ['humanoid','dinosaur-model','harpy-model'])assert.equal(hasFieldEnvironmentLandmarkGeometry(g,name),false);disposeFieldEnvironmentGeometry(g);}
});

test('all buffers, unused host shapes, materials and GPU instance resources dispose exactly once on replacement',()=>{
  for(const id of ids){
    const tracked=new Map(),bounded={...FIELD_GEOMETRY_THREE};
    for(const key of ['MeshStandardMaterial','BufferGeometry','BoxGeometry','DodecahedronGeometry','ConeGeometry','CylinderGeometry','IcosahedronGeometry','TorusGeometry','SphereGeometry','InstancedMesh']){
      const Base=bounded[key];bounded[key]=class extends Base{constructor(...args){super(...args);tracked.set(this,0);this.addEventListener('dispose',()=>tracked.set(this,tracked.get(this)+1));}};
    }
    const group=createFieldEnvironmentGeometry(bounded,getFieldEnvironmentForCardId(id));
    disposeFieldEnvironmentGeometry(group);disposeFieldEnvironmentGeometry(group);assert.equal(group.children.length,0);
    for(const [resource,count]of tracked)assert.equal(count,1,`${id}: ${resource.type}`);
  }
});
