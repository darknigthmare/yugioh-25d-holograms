import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE as applicationThree } from '../src/ui/FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry, FIELD_ENVIRONMENT_GEOMETRY_BUDGET as budget } from '../src/ui/FieldEnvironmentGeometry.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';
import { RITUAL_CARD_LANDMARKS, RITUAL_INSPECTED_ART_PROFILES } from '../src/ui/FieldEnvironmentRitualReferences.js';

const ids=Object.keys(RITUAL_CARD_LANDMARKS);
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

test('forty-five inspected constructions use the production namespace and every transformed instance stays outside the duel',()=>{
  assert.equal(ids.length,45);
  for(const id of ids) {
    const group=create(id);
    assert.equal(group.userData.fidelity,'reference-informed-geometry',id);
    assert.equal(group.userData.landmark,RITUAL_CARD_LANDMARKS[id]);
    assert.equal(group.userData.inspectedArt,RITUAL_INSPECTED_ART_PROFILES[id]);
    assert.ok(group.userData.meshCount<=budget.maxPrimitiveCount,id);
    assert.ok(group.userData.drawCallCount<=budget.maxDrawCallCount,id);
    assert.ok(group.userData.materialCount<=budget.maxMaterialCount,id);
    assert.equal(RITUAL_INSPECTED_ART_PROFILES[id].sourceUrl,`https://images.ygoprodeck.com/images/cards_cropped/${id}.jpg`);
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


test('source-specific physical motifs retain the real props and omit imagined buildings from character pictures',()=>{
  const cases={
    '17782288':{'angelechy-four-gold-ring-lamps':4,'angelechy-half-timber-house':12},
    '80749819':{'forgotten-pale-skull-cranium':16,'forgotten-skull-dark-eye-socket':32,'forgotten-skull-three-broken-teeth':48,'forgotten-continuous-rough-rock-tunnel':1},
    '81380218':{'chorus-central-gate-cross-upright':1,'chorus-coral-rose-body':12},
    '12397569':{'baatistina-flat-spiralling-crystal-blade':38,'baatistina-concentric-colored-core':3},
    '53639887':{'snake-eye-cracked-raised-altar-tier':3,'snake-eye-four-cyan-brazier-flame':4},
    '71817640':{'dragonic-three-jagged-flame-curtain':3,'dragonic-three-colored-bright-points':3},
    '17255673':{'mikanko-gold-leaf-shaped-helical-step':25,'mikanko-front-carved-ceremonial-post':3},
    '71650854':{'mid-breaker-six-orange-energy-globes':6,'mid-breaker-dark-globe-patch':18},
    '68337209':{'maliss-distorted-magenta-lavender-checker':56,'maliss-irregular-cyan-pixel-glitch':31},
    '84504242':{'megalith-three-thick-octagonal-podiums':3,'megalith-three-differently-lit-undersides':3,'megalith-small-round-corner-rivet':24},
    '269012':{'bound-three-irregular-stone-monoliths':3,'bound-round-drilled-anchor-hole':3},
    '62314831':{'amritara-six-separate-colored-small-worlds':6,'amritara-large-blue-green-clouded-world':1},
    '77584012':{'pseudo-five-cyan-wireframe-skyscrapers':5,'pseudo-deep-black-rectangular-window':120},
    '1127737':{'sargasso-three-broken-floating-carrier-decks':3,'sargasso-exposed-rusted-underdeck-rib':15,'sargasso-white-dashed-runway-line':21},
    '48015771':{'summon-over-six-large-pink-faceted-diamonds':6,'summon-over-right-grey-control-box':1},
    '9597987':{'tenchi-eight-white-wax-candles':8,'tenchi-eight-candle-flames':8},
    '56433456':{'sanctuary-six-front-fluted-column':6,'sanctuary-two-outward-forked-orb-caps':2,'sanctuary-white-orb-held-by-forks':1},
    '45943516':{'war-rock-upper-jagged-stone-jaw':1,'war-rock-lower-jagged-stone-jaw':1,'war-rock-upper-downward-sharp-stone-tooth':6,'war-rock-lower-upward-sharp-stone-tooth':6},
    '65861210':{'beast-paradise-three-tall-square-tapered-obelisks':3,'beast-paradise-green-tree-hollow-eye':7,'beast-paradise-red-ground-apple':1},
    '43236494':{'fairytale-staggered-left-red-roof-tile':70,'fairytale-staggered-right-brown-roof-shingle':70,'fairytale-square-roof-chimney':1}
  };
  for(const [id,names] of Object.entries(cases)){const group=create(id);for(const [name,n] of Object.entries(names))assert.equal(count(group,name),n,`${id}/${name}`);disposeFieldEnvironmentGeometry(group);}
  for(const id of ['69039982','81777047','45778932','59197169']){const g=create(id);assert.ok(g.children.flatMap(o=>o.userData.instanceNames).every(n=>!/(temple|column|monument|bird-body|fiend-body)/.test(n)));disposeFieldEnvironmentGeometry(g);}
});

test('continuous tubes represent actual linked chains, roots, rivers and different glyph forms',()=>{
  const examples=[['59048135','heraldry-two-curving-linked-diamond-ribbons',28],['269012','bound-heavy-chain-to-overhead-sun-0',22],['53639887','snake-eye-crawling-altar-vines',9],['17255673','mikanko-colored-ceremonial-hanging-ribbons',12],['48015771','summon-over-magenta-hemispherical-wire-cage',13],['48179391','orichalcos-two-interlocking-equilateral-triangles',2],['4398189','white-forest-twelve-braided-trunk-strands',12],['4398189','white-forest-many-curled-hook-branches',28],['65861210','beast-paradise-eight-spreading-twisted-roots',8]];
  for(const [id,name,n] of examples){const group=create(id),p=curves(group,name);assert.equal(p.length,n,`${id}/${name}`);assert.ok(p.every(q=>q.length>=24));for(const q of p)for(let i=1;i<q.length;i++)assert.ok(new THREE.Vector3(...q[i]).distanceTo(new THREE.Vector3(...q[i-1]))<3,'connected curve samples');disposeFieldEnvironmentGeometry(group);}
});

test('the bright field pictures use real color buffers and every seven-world globe has preserved physical curvature',()=>{
  for(const [id,name] of [['69039982','crusadia-overhead-gold-white-fan'],['59048135','heraldry-pink-blue-radiating-streaks'],['30336082','sangen-three-differently-colored-flame-trails'],['51669847','vidolia-colored-stained-glass-round-sectors']]){
    const group=create(id),shape=instances(group,name)[0].object.geometry;assert.ok(shape.attributes.color);assert.equal(shape.attributes.color.count,shape.attributes.position.count);disposeFieldEnvironmentGeometry(group);
  }
  const cosmos=create('62314831'),g=instances(cosmos,'amritara-large-blue-green-clouded-world')[0].object.geometry;assert.ok(g.attributes.color);for(let i=0;i<g.attributes.position.count;i++){const p=g.attributes.position;assert.ok(Math.abs(Math.hypot(p.getX(i),p.getY(i),p.getZ(i))-1)<1e-6);}disposeFieldEnvironmentGeometry(cosmos);
});

test('the ruined Sanctuary gallery and natural Danger arches have actual rise and depth rather than straight tubes',()=>{
  for(const [id,name] of [['56433456','sanctuary-curved-right-side-gallery'],['79698395','danger-realm-two-huge-natural-stone-arches']]){
    const g=create(id);for(const {object} of instances(g,name)){const path=object.geometry.userData.continuousCurve;assert.ok(path.length>60);assert.ok(Math.max(...path.map(p=>p[1]))-Math.min(...path.map(p=>p[1]))>2);assert.ok(Math.max(...path.map(p=>p[2]))-Math.min(...path.map(p=>p[2]))>2);const line=new THREE.Line3(new THREE.Vector3(...path[0]),new THREE.Vector3(...path.at(-1)));assert.ok(Math.max(...path.map(p=>{const v=new THREE.Vector3(...p);return v.distanceTo(line.closestPointToPoint(v,true,new THREE.Vector3()));}))>1.5);}
    disposeFieldEnvironmentGeometry(g);
  }
});

test('chipped carriers and the hollow beast mountain use concave closed contours and the rock tunnel surrounds a true opening',()=>{
  const carrier=create('1127737');for(const {object} of instances(carrier,'sargasso-three-broken-floating-carrier-decks')){const p=object.geometry.attributes.position,outline=object.geometry.userData.sourceContour;assert.equal(outline.length,17);assert.ok(Math.max(...Array.from({length:p.count},(_,i)=>p.getZ(i)))-Math.min(...Array.from({length:p.count},(_,i)=>p.getZ(i)))>.2);}disposeFieldEnvironmentGeometry(carrier);
  const peak=create('45943516');const upper=instances(peak,'war-rock-upper-jagged-stone-jaw')[0],lower=instances(peak,'war-rock-lower-jagged-stone-jaw')[0];assert.ok(upper.object.geometry.userData.sourceContour.length>=10);assert.ok(lower.object.geometry.userData.sourceContour.length>=10);assert.notDeepEqual(upper.object.geometry.userData.sourceContour,lower.object.geometry.userData.sourceContour);disposeFieldEnvironmentGeometry(peak);
  const cave=create('80749819');assert.equal(instances(cave,'forgotten-continuous-rough-rock-tunnel')[0].object.geometry.userData.enclosingTunnel,true);disposeFieldEnvironmentGeometry(cave);
});

test('Rising Air Current and Yami improve their actual cloud depth without a new invented structure',()=>{
  for(const [id,prefix] of [['45778932','rising-soft-diagonal-white-cloud-wisp-'],['59197169','yami-torn-upper-magenta-smoke-']]){
    const g=create(id);const objects=g.children.filter(o=>o.userData.instanceNames.some(n=>n.startsWith(prefix)));assert.ok(objects.length>=2);for(const o of objects){const path=o.geometry.userData.continuousRibbon;assert.ok(path.length>60);const p=o.geometry.attributes.position;assert.ok(p.count>100);assert.ok(Math.max(...path.map(q=>q[1]))-Math.min(...path.map(q=>q[1]))>5);}disposeFieldEnvironmentGeometry(g);
  }
});

test('every Ritual material and geometry is disposed once even when teardown repeats',()=>{
  for(const id of ids){const group=create(id),resources=new Set();group.traverse(o=>{if(o.isMesh){resources.add(o.geometry);resources.add(o.material);}});const hits=new Map();for(const r of resources)r.addEventListener('dispose',()=>hits.set(r,(hits.get(r)||0)+1));disposeFieldEnvironmentGeometry(group);disposeFieldEnvironmentGeometry(group);assert.equal(group.children.length,0);for(const r of resources)assert.equal(hits.get(r),1,`${id}: disposed exactly once`);}
});

test('custom materials allocated during every construction are also disposed, including unused helper allocations',()=>{
  for(const id of ids){const allocations=[],hits=new Map();class Material extends applicationThree.MeshStandardMaterial{constructor(...args){super(...args);allocations.push(this);this.addEventListener('dispose',()=>hits.set(this,(hits.get(this)||0)+1));}}const group=createFieldEnvironmentGeometry({...applicationThree,MeshStandardMaterial:Material},getFieldEnvironmentForCardId(id));disposeFieldEnvironmentGeometry(group);for(const mat of allocations)assert.equal(hits.get(mat),1,`${id}: every allocated material disposed once`);}
});
