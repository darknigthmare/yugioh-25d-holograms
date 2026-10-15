import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '/workspace/yugioh-25d-holograms/node_modules/three/build/three.module.js';
import { DUELIST_AVATARS } from '/workspace/yugioh-25d-holograms/src/content/DuelistAvatarCatalog.js';
import { createDuelistAvatarModel } from '/workspace/yugioh-25d-holograms/src/ui/DuelistAvatarModels.js';
import { DUELIST_GESTURE_DURATIONS } from '/workspace/yugioh-25d-holograms/src/ui/DuelistAvatarGestures.js';
const sha = data => createHash('sha256').update(data).digest('hex');
const repository='/workspace/yugioh-25d-holograms';
const files=['src/ui/DuelistAvatarModels.js','src/ui/DuelistAvatarGestures.js','src/ui/DuelistAvatarPortrait.js','src/content/DuelistAvatarCatalog.js','test/duelist-avatar-gestures.test.js','test/duelist-avatar-visual-details.test.js'];
const sourcePins=Object.fromEntries(files.map(path=>[path,sha(fs.readFileSync(`${repository}/${path}`))]));
const silhouettes=[]; const poses=[];
const point=new THREE.Vector3();
function actualBounds(model){
  const bounds=new THREE.Box3();model.group.updateMatrixWorld(true);
  model.group.traverse(mesh=>{if(!mesh.geometry)return;
    const positions=mesh.geometry.attributes.position;
    for(let index=0;index<positions.count;index++){
      point.fromBufferAttribute(positions,index);
      if(mesh.isSkinnedMesh)mesh.applyBoneTransform(index,point);
      point.applyMatrix4(mesh.matrixWorld);bounds.expandByPoint(point);
    }
  });return {min:bounds.min.toArray(),max:bounds.max.toArray(),finite:[...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite)};
}
for(const avatar of DUELIST_AVATARS){
  const model=createDuelistAvatarModel(avatar.id);
  const parts=[];model.group.traverse(mesh=>{if(mesh.geometry)parts.push(Buffer.from(mesh.geometry.attributes.position.array.buffer))});
  silhouettes.push({avatarId:avatar.id,drawCalls:model.group.userData.drawCalls,triangles:model.group.userData.triangles,signature:sha(Buffer.concat([...parts,Buffer.from(JSON.stringify(model.group.scale.toArray()))])),bounds:actualBounds(model)});
  model.dispose();
}
for(const id of ['yugi','kaiba','jaden','playmaker','yudias','nyandestar','bochi','zwijo']){
  for(const [kind,duration] of Object.entries(DUELIST_GESTURE_DURATIONS)){
    const model=createDuelistAvatarModel(id);model.update(0);model.playGesture(kind,{strength:1.25});model.update(duration*0.38);
    poses.push({avatarId:id,kind,gesture:model.getGestureState(),bounds:actualBounds(model),drawCalls:model.group.userData.drawCalls,triangles:model.group.userData.triangles});model.dispose();
  }
}
const result={createdAt:new Date().toISOString(),method:'CPU: every neutral vertex for all 192 avatars; actual applyBoneTransform + matrixWorld for 56 animated peak poses at maximum strength. Not browser or gameplay evidence.',sourcePins,rosterCount:silhouettes.length,uniqueGeometryCount:new Set(silhouettes.map(row=>row.signature)).size,maxDrawCalls:Math.max(...silhouettes.map(row=>row.drawCalls)),maxTriangles:Math.max(...silhouettes.map(row=>row.triangles)),allBoundsFinite:[...silhouettes,...poses].every(row=>row.bounds.finite),neutral:silhouettes,animatedPoses:poses};
fs.writeFileSync('/workspace/yugioh-avatar-motion-2026-10-11/cpu-audit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({roster:result.rosterCount,unique:result.uniqueGeometryCount,maxDrawCalls:result.maxDrawCalls,maxTriangles:result.maxTriangles,animatedPoses:poses.length,allBoundsFinite:result.allBoundsFinite}));
