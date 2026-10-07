import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {FIELD_GEOMETRY_THREE} from '../src/ui/FieldGeometryThree.js';
import {STAGE_CARD_LANDMARKS,STAGE_INSPECTED_ART_PROFILES,createStageReferenceGeometry} from '../src/ui/FieldEnvironmentStageReferences.js';
import {createFieldEnvironmentGeometry,disposeFieldEnvironmentGeometry,hasFieldEnvironmentLandmarkGeometry,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget} from '../src/ui/FieldEnvironmentGeometry.js';
import {getFieldEnvironmentForCardId} from '../src/ui/FieldEnvironmentRegistry.js';
import {FIELD_SPELL_REFERENCE_ART_SNAPSHOT} from '../src/ui/FieldSpellReferenceArtSnapshot.js';

const motifs={
  "2674965": [
    "argostars-concentric-cyan-platform",
    "argostars-luminous-platform-rim",
    "argostars-round-tilted-light-pod",
    "argostars-canopy-star",
    "argostars-fine-firework-rays"
  ],
  "67616300": [
    "chicken-narrow-cliff-road",
    "chicken-fractured-road-cliff",
    "chicken-dense-dark-forest",
    "chicken-pale-valley-mist"
  ],
  "5833312": [
    "academy-forested-island-shelf",
    "academy-steep-smoke-volcano",
    "academy-white-volcanic-plume",
    "academy-white-round-campus-roof",
    "academy-gold-round-roof",
    "academy-tall-gold-campus-fin",
    "academy-campus-white-column",
    "academy-blue-shore-water",
    "academy-small-forest-crown",
    "academy-narrow-coastal-waterfall",
    "academy-front-campus-step"
  ],
  "91002901": [
    "assault-round-metallic-base",
    "assault-blue-base-rim",
    "assault-winding-energy-ribbon",
    "assault-pink-curved-band",
    "assault-pale-radial-streak"
  ],
  "43940008": [
    "duel-tall-silver-polygon-spire",
    "duel-round-wide-tower-base",
    "duel-long-sloping-outrigger",
    "duel-outrigger-panel-seam",
    "duel-broken-concrete-edge",
    "duel-exposed-wall-rebar",
    "duel-tower-horizontal-panel-seam"
  ],
  "19162134": [
    "dueltaining-cyan-pink-light-panel",
    "dueltaining-rectilinear-panel-rib",
    "dueltaining-long-pale-shard",
    "dueltaining-gold-orbit-rod",
    "dueltaining-green-orbit-node",
    "dueltaining-pale-star-glint"
  ],
  "39838559": [
    "circuit-banked-curving-road",
    "circuit-cyan-curving-rail",
    "circuit-tall-track-support",
    "circuit-orange-arrow-mark",
    "circuit-scoreboard-window",
    "circuit-green-floor-lines",
    "circuit-translucent-hud-panel"
  ],
  "1061200": [
    "city-blue-map-table",
    "city-translucent-map-tower",
    "city-cyan-outline-tower",
    "city-pink-zigzag-route",
    "city-floating-cyan-diagram"
  ],
  "2144946": [
    "offroad-luminous-highrise",
    "offroad-horizontal-lit-facade",
    "offroad-rough-rock-ramp",
    "offroad-small-angular-track-rock",
    "offroad-winding-overhead-rail",
    "offroad-suspended-oval-lamp"
  ],
  "58012707": [
    "ballpark-round-ochre-mound",
    "ballpark-green-edge-bank",
    "ballpark-distant-green-woodline",
    "ballpark-fine-pale-action-streak"
  ],
  "85638822": [
    "gouki-silver-cage-frame",
    "gouki-diagonal-chainlink",
    "gouki-red-padded-corner",
    "gouki-black-turnbuckle-pad",
    "gouki-black-ring-rope"
  ],
  "32391631": [
    "savage-three-tier-stone-arcade",
    "savage-round-stone-column",
    "savage-curved-horizontal-stone-band",
    "savage-chipped-upper-rim",
    "savage-violet-inner-glow"
  ],
  "5063379": [
    "flavian-gold-maze-wall",
    "flavian-cyan-wall-maze",
    "flavian-pointed-gold-crown",
    "flavian-round-jagged-fountain",
    "flavian-pale-jagged-water-spire",
    "flavian-suspended-crown-ring",
    "flavian-corner-circuit-pylon"
  ],
  "90173539": [
    "dino-sandy-court-edge",
    "dino-layered-jungle-frond",
    "dino-curved-red-fence",
    "dino-fine-mesh-wire"
  ],
  "38053381": [
    "generaider-double-luminous-wheel",
    "generaider-nine-round-nodes",
    "generaider-wide-radial-wedge",
    "generaider-vertical-node-spine",
    "generaider-concentric-floor-ring",
    "generaider-blue-floor-diagram"
  ],
  "7617062": [
    "museum-gray-arched-alcove",
    "museum-cracked-stone-wall",
    "museum-brass-rope-post",
    "museum-red-hanging-rope",
    "museum-gilded-oval-mirror-frame",
    "museum-angular-wall-crack"
  ],
  "29400787": [
    "parade-purple-gabled-house",
    "parade-purple-gabled-roof",
    "parade-tall-lit-window",
    "parade-brick-masonry-course",
    "parade-three-head-street-lamp",
    "parade-pink-purple-balloon",
    "parade-fine-balloon-string",
    "parade-blue-cobbled-paver"
  ],
  "15388353": [
    "restaurant-lavender-two-storey-wall",
    "restaurant-round-corner-turret",
    "restaurant-slate-cone-turret-roof",
    "restaurant-warm-turret-window",
    "restaurant-gold-arched-window",
    "restaurant-steep-slate-roof",
    "restaurant-baluster-balcony",
    "restaurant-two-stair-levels",
    "restaurant-iron-entrance-arch",
    "restaurant-stair-balustrade",
    "restaurant-warm-lantern-post",
    "restaurant-green-edge-hedge"
  ],
  "49370016": [
    "punk-violet-radial-petal-panel",
    "punk-cyan-speaker-node",
    "punk-angular-speaker-panel",
    "punk-gold-radial-hub",
    "punk-colored-light-tube"
  ],
  "55553602": [
    "dramatic-curving-red-curtain",
    "dramatic-black-star-trim",
    "dramatic-blue-star-mark",
    "dramatic-cyan-stage-framework",
    "dramatic-round-pale-stage",
    "dramatic-gold-ring-prop",
    "dramatic-cyan-round-footlight"
  ],
  "29650040": [
    "harmonia-purple-cyan-orange-note",
    "harmonia-diagonal-pale-music-staff",
    "harmonia-curled-orange-cloud-band",
    "harmonia-tiny-pale-ring"
  ],
  "63492244": [
    "arena-green-diamond-lamp-matrix",
    "arena-red-owl-side-panel",
    "arena-glowing-oval-eyes",
    "arena-colored-heart-outline",
    "arena-multicolor-flower-border"
  ],
  "51208046": [
    "live-large-pink-heart-panel",
    "live-jagged-gold-heart-border",
    "live-white-speaker-cabinet",
    "live-dark-round-speaker-driver",
    "live-overhead-round-stage-lamp",
    "live-wide-performance-platform",
    "live-small-black-floor-monitor"
  ],
  "35371948": [
    "light-wide-cyan-display-panel",
    "light-small-warm-screen-rim",
    "light-floral-jewel-side-column",
    "light-gold-scroll-crest",
    "light-curved-pale-baluster",
    "light-small-floating-heart"
  ]
};
const ids=Object.keys(motifs),create=id=>createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE,getFieldEnvironmentForCardId(id));
const named=(group,name)=>group.children.filter(mesh=>mesh.userData.instanceNames.includes(name));
const curves=(group,name)=>named(group,name).flatMap(mesh=>mesh.geometry.userData.continuousCurves||[mesh.geometry.userData.continuousCurve]).filter(Boolean);

test('24 individually opened stage sources retain original JPG bytes and dispatch through the real bounded factory',()=>{
  assert.equal(ids.length,24);assert.deepEqual(new Set(Object.keys(STAGE_CARD_LANDMARKS)),new Set(ids));
  assert.equal(createStageReferenceGeometry({profile:{cardId:'unowned'}}),false);
  for(const id of ids){
    const inspected=STAGE_INSPECTED_ART_PROFILES[id],snapshot=FIELD_SPELL_REFERENCE_ART_SNAPSHOT.entries.find(entry=>entry.cardId===id);
    assert.ok(Object.isFrozen(inspected)&&Object.isFrozen(inspected.palette)&&Object.isFrozen(inspected.motifs));
    const bytes=readFileSync(new URL(`../public/environments/field-art/${id}.jpg`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),snapshot.sha256,id);
    const group=create(id);assert.equal(group.userData.inspectedArt,inspected);assert.equal(group.userData.fidelity,'reference-informed-geometry');
    assert.equal(group.userData.landmark,STAGE_CARD_LANDMARKS[id]);
    for(const name of motifs[id])assert.ok(hasFieldEnvironmentLandmarkGeometry(group,name),`${id}: ${name}`);
    for(const generic of ['weathered-rock','tree-trunk','canopy-layer','tower','portal-anchor'])assert.equal(hasFieldEnvironmentLandmarkGeometry(group,generic),false,`${id}: ${generic}`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('whole rendered instances clear the duel corridor and all 24 scenes meet finite-buffer, index, extent and draw budgets',()=>{
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

test('campus, silver tower and curved colosseum retain distinct observed architectural volumes',()=>{
  const academy=create('5833312'),tower=create('43940008'),arena=create('32391631');
  const fins=named(academy,'academy-tall-gold-campus-fin')[0];
  assert.equal(fins.geometry.userData.referencePrimitiveCount,7);
  assert.ok(Math.max(...Array.from({length:fins.geometry.attributes.position.count},(_,i)=>fins.geometry.attributes.position.getY(i)))>16);
  const spire=named(tower,'duel-tall-silver-polygon-spire')[0].geometry.attributes.position;
  assert.ok(Math.max(...Array.from({length:spire.count},(_,i)=>spire.getY(i)))>=31);
  assert.equal(named(tower,'duel-long-sloping-outrigger')[0].geometry.userData.referencePrimitiveCount,2);
  const arches=curves(arena,'savage-three-tier-stone-arcade');assert.equal(arches.length,81);
  assert.equal(arches.filter(c=>c.length>10).length,27);
  assert.ok(arches.filter(c=>c.length>10).every(c=>Math.max(...c.map(p=>p[1]))-Math.min(...c.map(p=>p[1]))>1.7));
  const masonry=named(arena,'savage-solid-stone-arcade')[0];assert.equal(masonry.geometry.userData.referencePrimitiveCount,81);
  assert.ok(masonry.geometry.attributes.position.count>27*32*4,'actual tessellated arch spandrels and solid piers');
  for(const g of [academy,tower,arena])disposeFieldEnvironmentGeometry(g);
});

test('circuit roads are curved elevated surfaces and the city map has a physical angular route',()=>{
  const circuit=create('39838559'),city=create('1061200'),offroad=create('2144946');
  const rails=curves(circuit,'circuit-cyan-curving-rail');assert.equal(rails.length,2);
  assert.ok(rails.every(c=>Math.max(...c.map(p=>p[1]))-Math.min(...c.map(p=>p[1]))>2.9));
  assert.ok(rails.every(c=>Math.max(...c.map(p=>p[2]))-Math.min(...c.map(p=>p[2]))>42));
  const routes=curves(city,'city-pink-zigzag-route');assert.equal(routes.length,9);
  assert.ok(routes.some(c=>Math.abs(c.at(-1)[2]-c[0][2])>6));
  const lit=named(offroad,'offroad-horizontal-lit-facade')[0];assert.equal(lit.geometry.userData.referencePrimitiveCount,24);
  for(const g of [circuit,city,offroad])disposeFieldEnvironmentGeometry(g);
});

test('cage wire, museum ropes and restaurant windows retain their observed construction',()=>{
  const cage=create('85638822'),museum=create('7617062'),restaurant=create('15388353');
  assert.equal(curves(cage,'gouki-diagonal-chainlink').length,54);
  const ropes=curves(museum,'museum-red-hanging-rope');assert.equal(ropes.length,6);
  assert.ok(ropes.every(c=>Math.min(...c.map(p=>p[1]))<1.8&&c[0][1]>2.3));
  assert.equal(named(museum,'museum-solid-arched-stone-wall')[0].geometry.userData.referencePrimitiveCount,9);
  assert.equal(named(restaurant,'restaurant-gold-arched-window')[0].geometry.userData.referencePrimitiveCount,24);
  assert.equal(named(restaurant,'restaurant-two-stair-levels')[0].geometry.userData.referencePrimitiveCount,17);
  for(const g of [cage,museum,restaurant])disposeFieldEnvironmentGeometry(g);
});

test('stage props use source-specific shaped buffers and retain figures in the untouched illustration',()=>{
  const wheel=create('38053381'),notes=create('29650040'),curtains=create('55553602'),speaker=create('51208046');
  assert.equal(named(wheel,'generaider-nine-round-nodes')[0].geometry.userData.referencePrimitiveCount,18);
  assert.equal(named(notes,'harmonia-purple-cyan-orange-note')[0].geometry.userData.referencePrimitiveCount,48);
  const fabric=named(curtains,'dramatic-curving-red-curtain');assert.equal(fabric[0].geometry.attributes.position.count,65*21*2);
  assert.equal(named(speaker,'live-dark-round-speaker-driver')[0].geometry.userData.referencePrimitiveCount,6);
  for(const g of [wheel,notes,curtains,speaker]){assert.equal(g.userData.publicOnly,true);for(const name of ['humanoid','dinosaur-model','musician-model','performer-model'])assert.equal(hasFieldEnvironmentLandmarkGeometry(g,name),false);disposeFieldEnvironmentGeometry(g);}
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
