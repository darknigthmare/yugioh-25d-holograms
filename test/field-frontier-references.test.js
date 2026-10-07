import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE as applicationThree } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { FRONTIER_CARD_LANDMARKS, FRONTIER_INSPECTED_ART_PROFILES,
  createFrontierReferenceGeometry } from '../src/ui/FieldEnvironmentFrontierReferences.js';

const ids = Object.keys(FRONTIER_CARD_LANDMARKS);
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

test('forty-five individually inspected frontier sources produce bounded geometry with the production namespace', async () => {
  assert.equal(ids.length, 45);
  assert.equal(createFrontierReferenceGeometry({ profile: { cardId: 'not-a-source' } }), false);
  for (const id of ids) {
    const art = FRONTIER_INSPECTED_ART_PROFILES[id];
    assert.equal(art.cardId, id);
    assert.equal(art.sourceUrl, `https://images.ygoprodeck.com/images/cards_cropped/${id}.jpg`);
    assert.ok(Object.isFrozen(art) && Object.isFrozen(art.motifs) && Object.isFrozen(art.palette));
    assert.ok((await readFile(new URL(`../public/environments/field-art/${id}.jpg`, import.meta.url))).length > 1000);
    const group = create(id);
    assert.equal(group.userData.inspectedArt, art);
    assert.equal(group.userData.fidelity, 'reference-informed-geometry');
    assert.equal(group.userData.landmark, FRONTIER_CARD_LANDMARKS[id]);
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


test('each frontier replacement disposes all shared/deformed buffers, materials and instances exactly once', () => {
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




test('sources distinguish true open halls, crenellations, siege machines and paper towers',()=>{
 for(const[id,name,count]of[
  ['46273941','heru-engraved-square-column',4],['46273941','heru-gold-shallow-fire-bowl',4],
  ['15635751','camelot-square-wall-crenellation',36],['15635751','camelot-slender-round-turret',7],
  ['14289852','catapult-long-raised-throwing-arm',2],['14289852','catapult-winch-rope-coil',14],
  ['33814281','patent-close-paper-edge-groove',110],['33814281','patent-floating-curled-paper',5],
  ['86809440','mimighoul-interlocking-hanging-chain-link',26],['14442329','kewltune-colored-neon-pipe-arch',3]]){
  const g=create(id);assert.equal(instances(g,name).length,count,id);disposeFieldEnvironmentGeometry(g);
 }
 const letters=create('33814281');
 assert.equal(instances(letters,'patent-floating-curled-paper')[0].object.geometry.userData.curledPaper,true);disposeFieldEnvironmentGeometry(letters);
 const vault=create('86809440');
 const frame=instances(vault,'mimighoul-deep-stone-vault-arch-arched-lintel')[0].object.geometry;
 assert.deepEqual(frame.userData.openFrame,{sides:32,inner:.82,half:true});
 const p=frame.attributes.position;for(let i=0;i<p.count;i++)assert.ok(Math.hypot(p.getX(i),p.getY(i))>=.819);
 disposeFieldEnvironmentGeometry(vault);
});

test('new city sources have continuous roads, specific towers and real elevated interchange loops',()=>{
 const ennea=create('17621695');
 assert.equal(instances(ennea,'enneapolis-white-angular-blade-tower').length,4);
 assert.equal(instances(ennea,'enneapolis-white-angular-blade-tower')[0].object.geometry.userData.bladeTower,true);
 assert.equal(instances(ennea,'enneapolis-continuous-looping-elevated-road').length,2);
 assert.equal(instances(ennea,'enneapolis-cantilever-round-terrace').length,3);disposeFieldEnvironmentGeometry(ennea);
 const starlight=create('1003840');
 const loops=instances(starlight,'starlight-continuous-four-loop-interchange');assert.equal(loops.length,4);
 assert.ok(loops.every(({object})=>object.geometry.userData.continuousCurve.length===101&&object.geometry.userData.rainbowLanes));
 for(const {object}of loops){const points=object.geometry.userData.continuousCurve;assert.ok(new THREE.Vector3(...points[0]).distanceTo(new THREE.Vector3(...points.at(-1)))<1e-6);}
 assert.equal(instances(starlight,'starlight-long-crossing-rainbow-road').length,2);disposeFieldEnvironmentGeometry(starlight);
 const arena=create('36742774');
 assert.equal(instances(arena,'synchro-curved-stepped-stadium-seat').length,10);
 assert.equal(instances(arena,'synchro-parallel-raised-metallic-road-border').length,6);
 assert.equal(instances(arena,'synchro-tall-gridded-fence-upright').length,20);
 assert.equal(instances(arena,'synchro-grid-fence-long-wire').length,84);disposeFieldEnvironmentGeometry(arena);
});

test('forest and seasonal sources contain pointed petals, fine branches, paddies and a meandering river',()=>{
 const flowers=create('91228233');
 assert.equal(instances(flowers,'lostflowers-bright-pink-flower-five-petal').length,20);
 assert.equal(instances(flowers,'lostflowers-bright-pink-flower-five-petal')[0].object.geometry.userData.curledPetal,true);
 assert.equal(instances(flowers,'lostflowers-long-pointed-cyan-bud').length,12);
 assert.equal(instances(flowers,'lostflowers-flat-turquoise-mushroom-cap').length,14);
 assert.equal(instances(flowers,'lostflowers-orange-open-cup-fungus').length,8);disposeFieldEnvironmentGeometry(flowers);
 const spring=create('60600821');
 assert.equal(instances(spring,'spring-pink-plum-blossom-five-petal').length,120);
 assert.equal(instances(spring,'spring-five-tier-distant-pagoda-upturned-tier-roof').length,5);
 assert.equal(instances(spring,'spring-long-distant-pale-mountain-ridge')[0].object.geometry.userData.continuousRidge,true);disposeFieldEnvironmentGeometry(spring);
 const summer=create('97254001');
 assert.equal(instances(summer,'summer-stepped-rice-field-terrace').length,10);
 assert.equal(instances(summer,'summer-close-rice-field-row').length,60);
 const points=instances(summer,'summer-continuous-long-meandering-river')[0].object.geometry.userData.continuousCurve;
 assert.equal(points.length,129);assert.ok(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]))>14);
 assert.equal(instances(summer,'summer-warm-low-firefly').length,18);disposeFieldEnvironmentGeometry(summer);
});

test('the Myutant vats and Ryzeal machine keep open shells, separate cells and continuous springs',()=>{
 const lab=create('34572613'),vats=instances(lab,'myutant-tall-round-glass-vat');
 assert.equal(vats.length,5);assert.equal(vats[0].object.geometry.parameters.openEnded,true);
 assert.equal(instances(lab,'myutant-jointed-round-arm-pivot').length,3);
 assert.equal(instances(lab,'myutant-open-manipulator-finger').length,4);disposeFieldEnvironmentGeometry(lab);
 const dynamo=create('6798031');
 assert.equal(instances(dynamo,'ryzeal-yellow-reactor-cell').length,4);
 assert.equal(instances(dynamo,'ryzeal-yellow-reactor-cell')[0].object.geometry.parameters.openEnded,true);
 const springs=instances(dynamo,'ryzeal-continuous-upper-spring-coil');assert.equal(springs.length,4);
 const points=springs[0].object.geometry.userData.continuousCurve;assert.equal(points.length,129);
 let turn=0;for(let i=1;i<points.length;i++){
  const angle=p=>Math.atan2(p[2]+29,p[0]+13),d=angle(points[i])-angle(points[i-1]);turn+=Math.atan2(Math.sin(d),Math.cos(d));}
 assert.ok(turn>Math.PI*15);assert.equal(instances(dynamo,'ryzeal-stacked-upper-radiator-fin').length,14);
 assert.equal(instances(dynamo,'ryzeal-segmented-gold-dynamo-coil').length,16);disposeFieldEnvironmentGeometry(dynamo);
});

test('volcanic and floating surfaces face outward and preserve actual open summits',()=>{
 for(const[id,name,cx,cz]of[
  ['57554544','fireking-folded-open-crater-volcano',0,-36],
  ['89948817','jurrac-wide-irregular-caldera',0,-33],
  ['26920296','dreamland-deep-folded-floating-island',0,-33],
  ['56063182','reichphobia-overhanging-layered-left-plateau',-12,-34]]){
  const g=create(id),shape=instances(g,name)[0].object.geometry,p=shape.attributes.position,n=shape.attributes.normal;let outward=0;
  for(let i=0;i<p.count;i++)outward+=n.getX(i)*(p.getX(i)-cx)+n.getZ(i)*(p.getZ(i)-cz);
  assert.ok(outward>0,id);assert.ok(shape.userData.radialSurface);disposeFieldEnvironmentGeometry(g);
 }
 const fire=create('57554544');
 assert.equal(instances(fire,'fireking-folded-open-crater-volcano')[0].object.geometry.parameters.openEnded,true);
 assert.equal(instances(fire,'fireking-open-orange-crater-pool').length,1);
 assert.equal(instances(fire,'fireking-continuous-white-coastal-surf').length,1);disposeFieldEnvironmentGeometry(fire);
});

test('Liang leaves its real gateway clear and the Summer river stays above rice terraces',()=>{
 const liang=create('66750703'),wall=instances(liang,'liang-continuous-curving-perimeter-wall')[0];
 const mesh=new THREE.Mesh(wall.object.geometry,wall.object.material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(wall.matrix);mesh.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(new THREE.Vector3(0,4,-15),new THREE.Vector3(0,0,-1),0,12);
 assert.equal(ray.intersectObject(mesh).length,0,'the perimeter is actually interrupted at the gateway');
 const opening=wall.object.geometry.userData.continuousCurve;
 assert.ok(opening[0][0]<-2&&opening.at(-1)[0]>2);disposeFieldEnvironmentGeometry(liang);
 const summer=create('97254001'),river=instances(summer,'summer-continuous-long-meandering-river')[0].object.geometry.userData.continuousCurve;
 const terraces=instances(summer,'summer-stepped-rice-field-terrace').map(({object,matrix})=>{
  const m=new THREE.Mesh(object.geometry,object.material);m.matrixAutoUpdate=false;m.matrix.copy(matrix);m.updateMatrixWorld(true);return m;
 });
 ray.far=Infinity;
 for(const point of river){ray.set(new THREE.Vector3(point[0],30,point[2]),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(terraces)[0];
  if(hit)assert.ok(point[1]>hit.point.y+.04,'no rice terrace occludes the water centerline');}
 disposeFieldEnvironmentGeometry(summer);
});

test('previously inspected sources gain new physical details while retaining their tested motifs',()=>{
 for(const[id,oldName,newName,newCount]of[
  ['18161786','plasma-continuous-purple-vortex','plasma-new-fine-inward-cloud-edge-striation',24],
  ['19384334','molten-branching-lava-stream','molten-new-layered-warm-sunset-cloud',12],
  ['61583217','cynet-cyan-hexagonal-lattice','cynet-new-segmented-reticle-tick',60],
  ['63035430','skyscraper-crossed-searchlight','skyscraper-new-projecting-front-masonry-rib',24]]){
  const g=create(id);assert.ok(instances(g,oldName).length>0);assert.equal(instances(g,newName).length,newCount);disposeFieldEnvironmentGeometry(g);
 }
 const plasma=create('18161786'),points=instances(plasma,'plasma-continuous-purple-vortex')[0].object.geometry.userData.continuousCurve;
 let turn=0;for(let i=1;i<points.length;i++){const a=p=>Math.atan2((p[1]-14.5)/.65,p[0]),d=a(points[i])-a(points[i-1]);turn+=Math.atan2(Math.sin(d),Math.cos(d));}
 assert.ok(turn>Math.PI*4);disposeFieldEnvironmentGeometry(plasma);
});
test('Molten winding lava and connected branches clear the actual irregular caldera by their entire tube radius', () => {
  const group = create('19384334');
  const [{ object: coneBatch, matrix: coneMatrix }] = instances(group, 'molten-wide-black-volcano');
  const cone = new THREE.Mesh(coneBatch.geometry, coneBatch.material);
  cone.matrixAutoUpdate = false;
  cone.matrix.copy(coneMatrix);
  cone.updateMatrixWorld(true);
  assert.equal(cone.geometry.parameters.radialSegments, 64);
  const vertices = cone.geometry.attributes.position;
  const rimHeights = Array.from({ length: 64 }, (_, i) => vertices.getY(i));
  assert.ok(Math.max(...rimHeights) - Math.min(...rimHeights) > 0.5, 'crater rim is uneven rather than a cone apex');
  assert.ok(vertices.getX(0) ** 2 + (vertices.getZ(0) + 34) ** 2 > 0.5, 'summit opens around a real crater');
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(cone.matrixWorld);
  const ray = new THREE.Raycaster();
  const primary = instances(group, 'molten-branching-lava-stream');
  const branches = instances(group, 'molten-lava-side-branch');
  assert.equal(primary.length, 96, 'eight meandering channels each contain twelve joined segments');
  assert.equal(branches.length, 48, 'each primary channel has a curved six segment branch');
  const paths = [...primary, ...branches].map(({ matrix }) => {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);
    return {
      start: new THREE.Vector3(0, -0.5, 0).applyMatrix4(matrix),
      end: new THREE.Vector3(0, 0.5, 0).applyMatrix4(matrix),
      radius: Math.max(scale.x, scale.z)
    };
  });
  for (const path of paths) {
    for (let sample = 0; sample <= 16; sample += 1) {
      const point = path.start.clone().lerp(path.end, sample / 16);
      ray.set(new THREE.Vector3(point.x, 30, point.z), new THREE.Vector3(0, -1, 0));
      const [hit] = ray.intersectObject(cone);
      assert.ok(hit, 'every lava sample stays above a real volcano face');
      const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      const clearance = point.clone().sub(hit.point).dot(normal);
      assert.ok(clearance > path.radius + 0.035,
        `tube at ${point.toArray()} clips volcano: clearance=${clearance}, radius=${path.radius}`);
    }
  }
  for (let channel = 0; channel < 8; channel += 1) {
    const main = paths.slice(channel * 12, (channel + 1) * 12);
    const branch = paths.slice(primary.length + channel * 6, primary.length + (channel + 1) * 6);
    for (const route of [main, branch]) for (let j = 1; j < route.length; j += 1) {
      assert.ok(route[j - 1].end.distanceTo(route[j].start) < 0.00001, 'segments form a continuous visible route');
    }
    assert.ok(main[4].start.distanceTo(branch[0].start) < 0.00001, 'branch joins the primary channel');
    const straight = new THREE.Line3(main[0].start, main.at(-1).end);
    const deviation = Math.max(...main.map(segment => straight.closestPointToPoint(segment.start, true, new THREE.Vector3()).distanceTo(segment.start)));
    assert.ok(deviation > 0.2, 'lava channels wind across the folded slope');
  }
  disposeFieldEnvironmentGeometry(group);
});
