import * as T from '/workspace/yugioh-25d-holograms/node_modules/three/build/three.module.js';
import {createHologramMonsterModel as create} from '/workspace/yugioh-25d-holograms/src/ui/HologramMonsterModels.js';
import {TOKEN_MONSTER_MODEL_PROFILES as profiles} from '/workspace/yugioh-25d-holograms/src/ui/TokenMonsterModelProfiles.js';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
const records=[];
for(const p of Object.values(profiles)){
 const model=create({id:p.tokenCode,type:'Token Monster',isToken:true});
 const bounds=new T.Box3().setFromObject(model), hash=createHash('sha256');
 let finite=true,joints=new Set(),meshes=0,triangles=0;
 model.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const [name,a] of Object.entries(o.geometry.attributes)){finite&&=a.array.every(Number.isFinite);if(name==='hologramJoint')a.array.forEach(j=>joints.add(j));if(name==='position')hash.update(Buffer.from(a.array.buffer));}});
 records.push({code:p.tokenCode,anatomy:p.tokenAnatomy,variant:p.tokenVisual.variant,reference:p.tokenVisual.referenceImageId,profileId:model.userData.profile.id,triangles,meshes,finite,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},parts:model.userData.partNames,joints:[...joints],signature:hash.digest('hex')});
 model.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
}
writeFileSync('/workspace/yugioh-token-models-2026-10-11/final/construction-audit.json',JSON.stringify(records,null,2)+'\n');
console.log(JSON.stringify({models:records.length,anatomies:new Set(records.map(r=>r.anatomy)).size,maxTriangles:Math.max(...records.map(r=>r.triangles)),maxMeshes:Math.max(...records.map(r=>r.meshes)),nonfinite:records.filter(r=>!r.finite).map(r=>r.code),negativeY:records.filter(r=>r.bounds.min[1]<-.01).map(r=>[r.code,r.bounds.min[1]]),wide:records.filter(r=>Math.max(...r.bounds.min.map(Math.abs),...r.bounds.max.map(Math.abs))>3.3).map(r=>[r.code,r.bounds]),largest:records.sort((a,b)=>b.triangles-a.triangles).slice(0,6).map(({code,anatomy,triangles})=>({code,anatomy,triangles}))},null,2));
