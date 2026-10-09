import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { Box3, Color, Vector3 } from 'three';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { POPULAR_GOD_MODEL_PROFILES, buildPopularGodMonsterAnatomy } from '../src/ui/HologramPopularGodModels.js';
import { POPULAR_GOD_REFERENCE_ART } from '../src/ui/PopularGodReferenceArt.js';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { createHologramPoseAnimation, HOLOGRAM_JOINTS } from '../src/ui/HologramPoseAnimation.js';
import { resolveHologramMonsterProfile } from '../src/ui/CombatVisualProfiles.js';

const CASES = [
  { id:'10000020', name:'Slifer the Sky Dragon', parts:['slifer-continuous-looped-serpentine-body','slifer-azure-forehead-gem','slifer-upper-mouth-ebony-gap','jaw-slifer-long-red-lower-mandible','wing-1-slifer-sculpted-crimson-surface'], colors:['#c83738','#241f26','#3b99bc','#868b9a'], joints:[HOLOGRAM_JOINTS.JAW,HOLOGRAM_JOINTS.LEFT_WING,HOLOGRAM_JOINTS.RIGHT_WING] },
  { id:'10000000', name:'Obelisk the Tormentor', parts:['obelisk-massive-blue-torso','obelisk-shoulder-upward-blade-1','obelisk-long-curved-crown-horn--1','hand-1-obelisk-enormous-forearm','obelisk-inferred-blue-thigh-1'], colors:['#568ea8','#94bdc8','#183d50'], joints:[HOLOGRAM_JOINTS.WEAPON] },
  { id:'10000010', name:'The Winged Dragon of Ra', parts:['ra-hawk-like-golden-skull','ra-long-downcurved-golden-beak','wing--1-ra-closed-swept-gold-wing','wing-1-ra-engraved-round-pivot','ra-long-swept-golden-tail'], colors:['#c89526','#f5d45b','#6e491e'], joints:[HOLOGRAM_JOINTS.JAW,HOLOGRAM_JOINTS.LEFT_WING,HOLOGRAM_JOINTS.RIGHT_WING] }
];
function release(model) { model.children.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); }); }
function containsColor(model, hex) {
  const color=new Color(hex);
  return model.children.some(mesh => { const a=mesh.geometry.attributes.color.array; for(let i=0;i<a.length;i+=3) if(Math.abs(a[i]-color.r)<1e-5&&Math.abs(a[i+1]-color.g)<1e-5&&Math.abs(a[i+2]-color.b)<1e-5) return true;return false; });
}

test('three God identities are official native Divine-Beast / DIVINE effect cards with immutable exact original JPG references', async () => {
  const { resources }=await loadNativeAuditInputs();
  assert.ok(Object.isFrozen(POPULAR_GOD_MODEL_PROFILES));assert.ok(Object.isFrozen(POPULAR_GOD_REFERENCE_ART));
  for(const p of CASES) {
    const code=Number(p.id),data=resources.cards.get(code),meta=resources.metadata.get(code);
    assert.equal(meta.name,p.name);assert.equal(meta.sourceDatabase,'cards.cdb');assert.equal(data.type,33);assert.equal(data.attribute,64);assert.equal(data.race,2097152n);assert.equal(data.level,10);
    assert.ok(Object.isFrozen(POPULAR_GOD_MODEL_PROFILES[p.id]));
    const profile=resolveHologramMonsterProfile({id:'0'+p.id,uid:'identity-not-in-profile',name:'localized alias'});
    assert.deepEqual(profile,POPULAR_GOD_MODEL_PROFILES[p.id]);assert.equal(JSON.stringify(profile).includes('identity-not-in-profile'),false);
    for(const kind of ['full','cropped','small']) {
      const source=POPULAR_GOD_REFERENCE_ART[p.id][kind],bytes=await readFile(new URL('../public'+source.assetPath,import.meta.url));
      assert.ok(Object.isFrozen(source));assert.equal(bytes.length,source.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);assert.deepEqual([...bytes.subarray(0,2)],[255,216]);
    }
  }
  assert.equal(buildPopularGodMonsterAnatomy({anatomy:'unknown'},{}),false);
});

for(const p of CASES) test(`${p.name}: closed three-dimensional landmarks and artwork colors remain within defense GPU geometry budgets`, () => {
  for(const defense of [false,true]) {
    const model=createHologramMonsterModel({id:p.id},{defense});
    assert.ok(p.parts.every(part=>model.userData.partNames.includes(part)));for(const color of p.colors) assert.ok(containsColor(model,color),p.id+': '+color);
    assert.equal(model.userData.referenceArt,POPULAR_GOD_MODEL_PROFILES[p.id].referenceArt);
    assert.ok(model.userData.meshCount<=5);assert.ok(model.userData.triangleCount<=6000);
    const extent=new Box3().setFromObject(model).getSize(new Vector3());assert.ok(extent.x>1&&extent.y>2&&extent.z>.7);
    const joints=new Set(model.children.flatMap(mesh=>Array.from(mesh.geometry.attributes.hologramJoint.array)));
    for(const joint of p.joints) assert.ok(joints.has(joint));
    for(const mesh of model.children) {
      assert.equal(mesh.material.map,null);assert.equal(mesh.material.vertexColors,true);
      assert.equal(mesh.geometry.attributes.position.count,mesh.geometry.attributes.hologramJoint.count);
      for(const key of ['position','normal','color','hologramJoint']) assert.ok(Array.from(mesh.geometry.attributes[key].array).every(Number.isFinite));
      const position=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
      for(let i=0;i<position.count;i+=3) {
        const a=new Vector3().fromBufferAttribute(position,i),b=new Vector3().fromBufferAttribute(position,i+1),c=new Vector3().fromBufferAttribute(position,i+2);
        const surfaceNormal=new Vector3().fromBufferAttribute(normal,i).add(new Vector3().fromBufferAttribute(normal,i+1)).add(new Vector3().fromBufferAttribute(normal,i+2));
        assert.ok(b.sub(a).cross(c.sub(a)).dot(surfaceNormal)>=-1e-6,`${p.id}: inverted triangle normal ${i/3}`);
      }
    }
    const positions=model.children.map(mesh=>({array:mesh.geometry.attributes.position.array,version:mesh.geometry.attributes.position.version}));
    const action=createHologramPoseAnimation(model,{kind:'attack'});assert.equal(action.update(.4),true);
    model.children.forEach((mesh,i)=>{assert.equal(mesh.geometry.attributes.position.array,positions[i].array);assert.equal(mesh.geometry.attributes.position.version,positions[i].version);});
    assert.ok(model.userData.poseRig.pose.value.toArray().some(n=>n!==0));action.update(1);action.dispose();
    const reduced=createHologramPoseAnimation(model,{reducedMotion:true});assert.equal(reduced.update(.4),false);assert.deepEqual(model.userData.poseRig.pose.value.toArray(),[0,0,0,0]);reduced.dispose();
    const resources=new Set();model.traverse(mesh=>{for(const value of [mesh.geometry,mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial])if(value)resources.add(value);});
    let disposed=0;resources.forEach(resource=>resource.addEventListener('dispose',()=>disposed++));release(model);assert.equal(disposed,resources.size);assert.equal(model.userData.poseRig.disposed,true);
  }
});
