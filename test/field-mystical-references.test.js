import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE } from '../src/ui/FieldGeometryThree.js';
import { MYSTICAL_CARD_LANDMARKS, MYSTICAL_INSPECTED_ART_PROFILES, createMysticalReferenceGeometry } from '../src/ui/FieldEnvironmentMysticalReferences.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry, hasFieldEnvironmentLandmarkGeometry,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { FIELD_SPELL_REFERENCE_ART_SNAPSHOT } from '../src/ui/FieldSpellReferenceArtSnapshot.js';

const motifs = {
  '94243005': ['chaos-warped-square-grid','chaos-cyan-elliptical-galaxy','chaos-white-central-opening'],
  '33550694': ['fusion-broad-violet-funnel-band','fusion-black-funnel-opening','fusion-lime-bent-floor-grid'],
  '42015635': ['neo-continuous-rainbow-cloud','neo-colored-oval-light'],
  '87902575': ['future-floating-landscape-window','future-mint-window-rim','future-violet-background-galaxy'],
  '20720928': ['metaphys-fractured-luminous-window','metaphys-floating-colored-shard','metaphys-blue-forked-lightning'],
  '34822850': ['void-enclosing-cyan-cloud','void-colored-round-diagram-node','void-pale-diagram-connection'],
  '33900648': ['clear-pointed-hexagonal-blue-prism','clear-white-radial-light-wedge','clear-pale-circular-halo'],
  '69296555': ['revealing-concentric-seal-circle','revealing-pink-angular-six-point-star','revealing-pale-ring-glyph'],
  '58406094': ['starry-diagonal-teal-nebula','starry-long-pointed-star','starry-tiny-cyan-speck'],
  '675319': ['zodiac-jagged-violet-light-sign','zodiac-diagonal-violet-trail','zodiac-white-radial-flare'],
  '27813661': ['iris-concentric-spectrum-halo','iris-pink-cyan-rim-bead','iris-fine-triangular-halo-line'],
  '69217334': ['breaking-broad-cyan-converging-beam','breaking-angular-brown-stone-plate','breaking-pink-branching-lightning'],
  '95856586': ['zexal-bright-round-golden-sphere','zexal-tall-spectrum-panel','zexal-dark-curved-halo-band'],
  '4545854': ['xyz-round-cyan-edged-shell','xyz-pink-violet-yellow-flame-streak','xyz-circling-dark-angular-fragment']
};
const ids=Object.keys(motifs);
const create=id=>createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE,getFieldEnvironmentForCardId(id));
function named(group,name) {return group.children.filter(mesh=>mesh.userData.instanceNames?.includes(name));}
function curves(group,name) {
  return named(group,name).flatMap(mesh=>mesh.geometry.userData.continuousCurves || [mesh.geometry.userData.continuousCurve]).filter(Boolean);
}

test('14 individually inspected mystical sources preserve their original JPG bytes and construct observed motifs',()=>{
  assert.equal(ids.length,14);
  assert.deepEqual(new Set(Object.keys(MYSTICAL_CARD_LANDMARKS)),new Set(ids));
  assert.equal(createMysticalReferenceGeometry({profile:{cardId:'not-owned'}}),false);
  for(const id of ids) {
    const inspected=MYSTICAL_INSPECTED_ART_PROFILES[id];
    assert.ok(Object.isFrozen(inspected) && Object.isFrozen(inspected.palette) && Object.isFrozen(inspected.motifs));
    assert.equal(inspected.sourceUrl,`https://images.ygoprodeck.com/images/cards_cropped/${id}.jpg`);
    const snapshot=FIELD_SPELL_REFERENCE_ART_SNAPSHOT.entries.find(entry=>entry.cardId===id);
    const bytes=readFileSync(new URL(`../public/environments/field-art/${id}.jpg`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),snapshot.sha256,id);
    const group=create(id);
    assert.equal(group.userData.fidelity,'reference-informed-geometry');
    assert.equal(group.userData.inspectedArt,inspected);
    for(const name of motifs[id]) assert.ok(hasFieldEnvironmentLandmarkGeometry(group,name),`${id}: ${name}`);
    for(const unrelated of ['tower','fluted-column','portal-anchor','weathered-rock'])
      assert.equal(hasFieldEnvironmentLandmarkGeometry(group,unrelated),false,`${id}: ${unrelated}`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('all mystical geometry works with the bounded production Three namespace, finite buffers, budgets and a clear duel corridor',()=>{
  const corridor=new THREE.Box3(new THREE.Vector3(...budget.playableCorridor.min),new THREE.Vector3(...budget.playableCorridor.max));
  for(const id of ids) {
    const group=create(id);
    assert.ok(group.userData.drawCallCount<=budget.maxDrawCallCount,`${id}: draw calls ${group.userData.drawCallCount}`);
    assert.ok(group.userData.materialCount<=budget.maxMaterialCount,`${id}: materials ${group.userData.materialCount}`);
    assert.ok(group.userData.referencePrimitiveCount<=budget.maxPrimitiveCount,`${id}: primitives ${group.userData.referencePrimitiveCount}`);
    group.updateMatrixWorld(true);
    group.traverse(mesh=>{
      if(!mesh.isMesh)return;
      assert.equal(mesh.isInstancedMesh,true,id);
      assert.equal(mesh.material.map,null,'public scenery contains no card textures');
      for(const attribute of ['position','normal','color']) if(mesh.geometry.attributes[attribute])
        for(const value of mesh.geometry.attributes[attribute].array) assert.ok(Number.isFinite(value),`${id}: ${attribute}`);
      const vertices=mesh.geometry.attributes.position;
      if(mesh.geometry.index) for(const index of mesh.geometry.index.array) assert.ok(index>=0 && index<vertices.count,id);
      else assert.equal(vertices.count%3,0);
      mesh.geometry.computeBoundingBox();
      for(let i=0;i<mesh.count;i++) {
        const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);
        const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(matrix);
        assert.equal(bounds.intersectsBox(corridor),false,`${id}/${mesh.userData.instanceNames[i]}`);
        for(const axis of ['x','z']) assert.ok(bounds.min[axis]>-48 && bounds.max[axis]<48,`${id}/${axis}`);
      }
    });
    disposeFieldEnvironmentGeometry(group);
  }
});

test('Chaos and Fusion reconstruct deformed continuous grids and curling bands rather than a generic portal',()=>{
  const chaos=create('94243005'),grid=curves(chaos,'chaos-warped-square-grid');
  assert.equal(grid.length,36);
  const radial=grid[0],start=radial[0],middle=radial[Math.floor(radial.length/2)],end=radial.at(-1);
  const lineMid=new THREE.Vector3(...start).lerp(new THREE.Vector3(...end),.5);
  assert.ok(lineMid.distanceTo(new THREE.Vector3(...middle))>1.5);
  assert.equal(curves(chaos,'chaos-cyan-elliptical-galaxy').length,8);
  disposeFieldEnvironmentGeometry(chaos);
  const fusion=create('33550694');
  assert.equal(curves(fusion,'fusion-broad-violet-funnel-band').length,6);
  const ground=curves(fusion,'fusion-lime-bent-floor-grid');
  assert.equal(ground.length,34);
  assert.ok(ground.some(curve=>Math.max(...curve.map(p=>p[1]))-Math.min(...curve.map(p=>p[1]))>1));
  disposeFieldEnvironmentGeometry(fusion);
});

test('Clear World has pointed hexagonal prism ends and Future Visions keeps five separately framed landscape windows',()=>{
  const clear=create('33900648'),[prism]=named(clear,'clear-pointed-hexagonal-blue-prism');
  const p=prism.geometry.attributes.position,ys=Array.from({length:p.count},(_,i)=>p.getY(i));
  const top=Math.max(...ys),bottom=Math.min(...ys);
  for(let i=0;i<p.count;i++) if(Math.abs(p.getY(i)-top)<.001 || Math.abs(p.getY(i)-bottom)<.001)
    assert.ok(Math.hypot(p.getX(i),p.getZ(i)+30)<.001,'pointed prism endpoint');
  assert.ok(top-bottom>14);
  assert.ok(Array.from({length:p.count},(_,i)=>Math.hypot(p.getX(i),p.getZ(i)+30)).some(r=>r>1.4));
  disposeFieldEnvironmentGeometry(clear);
  const future=create('87902575');
  assert.equal(named(future,'future-floating-landscape-window')[0].geometry.userData.referencePrimitiveCount,5);
  assert.equal(named(future,'future-mint-window-rim')[0].geometry.userData.referencePrimitiveCount,20);
  assert.ok(named(future,'future-floating-landscape-window')[0].geometry.attributes.color);
  disposeFieldEnvironmentGeometry(future);
});

test('spectral colors and node hues survive static geometry merging',()=>{
  for(const [id,name,minColors] of [
    ['42015635','neo-continuous-rainbow-cloud',6],
    ['34822850','void-colored-round-diagram-node',10],
    ['27813661','iris-concentric-spectrum-halo',6],
    ['4545854','xyz-pink-violet-yellow-flame-streak',6]
  ]) {
    const group=create(id),[mesh]=named(group,name),colors=mesh.geometry.attributes.color;
    assert.equal(mesh.material.vertexColors,true);
    assert.equal(mesh.material.emissive.getHex(),0,'white emission must not wash out source vertex colors');
    const distinct=new Set();
    for(let i=0;i<colors.count;i++) distinct.add(`${colors.getX(i)}:${colors.getY(i)}:${colors.getZ(i)}`);
    assert.ok(distinct.size>=minColors,`${id}: ${distinct.size} colors`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('replacing each mystical environment disposes shared buffers, materials and instance resources exactly once',()=>{
  for(const id of ids) {
    const group=create(id),resources=new Set();
    group.traverse(mesh=>{if(mesh.isMesh){resources.add(mesh);resources.add(mesh.geometry);resources.add(mesh.material);}});
    const counts=new Map();
    for(const resource of resources){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}
    disposeFieldEnvironmentGeometry(group);disposeFieldEnvironmentGeometry(group);
    assert.equal(group.children.length,0);
    for(const count of counts.values()) assert.equal(count,1,id);
  }
});
