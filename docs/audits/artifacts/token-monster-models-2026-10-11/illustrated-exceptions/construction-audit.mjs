import * as THREE from '/workspace/yugioh-25d-holograms/node_modules/three/build/three.module.js';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildTokenIllustratedExceptions } from '/workspace/yugioh-25d-holograms/src/ui/HologramTokenIllustratedExceptions.js';
import { TOKEN_MONSTER_MODEL_PROFILES } from '/workspace/yugioh-25d-holograms/src/ui/TokenMonsterModelProfiles.js';
import { resolveHologramMonsterProfile } from '/workspace/yugioh-25d-holograms/src/ui/CombatVisualProfiles.js';
const CODES=new Set(['93912846','49808197','75732623','8198621']);
const root='/workspace/yugioh-25d-holograms/';
const files=['src/ui/HologramTokenIllustratedExceptions.js','src/ui/HologramTokenGeometry.js','src/ui/TokenMonsterModelProfiles.js','src/ui/CombatVisualProfiles.js','src/ui/HologramPoseAnimation.js'];
const pin=()=>Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(root+file)).digest('hex')]));
const before=pin();
function construct(profile) {
  const records = [];
  function part(name, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0], tint) {
    const transform = new THREE.Object3D();
    transform.position.set(...position);
    transform.scale.set(...scale);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    geometry.applyMatrix4(transform.matrix);
    geometry.computeBoundingBox();
    records.push({ name, geometry, material, tint });
  }
  const sphere = (name, material, position, scale, detail = 1, tint) => part(name, new THREE.IcosahedronGeometry(1, detail), material, position, scale, undefined, tint);
  const box = (name, material, position, scale, rotation, tint) => part(name, new THREE.BoxGeometry(1, 1, 1), material, position, scale, rotation, tint);
  const cone = (name, material, position, scale, rotation, tint) => part(name, new THREE.ConeGeometry(1, 1, 10), material, position, scale, rotation, tint);
  const ring = (name, material, position, radius, rotation = [Math.PI / 2, 0, 0], tube = .025, tint) => part(name, new THREE.TorusGeometry(radius, tube, 5, 28), material, position, [1,1,1], rotation, tint);
  function rod(name, material, start, end, radius = .075, endRadius = radius, tint) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), direction = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(endRadius, radius, direction.length(), 8);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), direction.clone().normalize()));
    part(name, geometry, material, a.add(b).multiplyScalar(.5).toArray(), undefined, undefined, tint);
  }
  const built = buildTokenIllustratedExceptions({ body:'#497c49', accent:'#ba8648', hair:'#292b30', eye:'#d7ad46', ...profile }, { part, sphere, box, cone, ring, rod });
  const bounds = new THREE.Box3();
  const hash = createHash('sha256');
  let triangles = 0;
  for (const record of records) {
    bounds.union(record.geometry.boundingBox);
    triangles += (record.geometry.index?.count ?? record.geometry.attributes.position.count) / 3;
    hash.update(Buffer.from(record.geometry.attributes.position.array.buffer));
  }
  return { built, records, triangles, bounds, signature:hash.digest('hex'), names:records.map(record=>record.name), dispose(){records.forEach(record=>record.geometry.dispose());} };
}


const records=[];
for(const entry of Object.values(TOKEN_MONSTER_MODEL_PROFILES).filter(entry=>CODES.has(entry.tokenCode))){
 const profile=resolveHologramMonsterProfile({id:entry.tokenCode}),model=construct(profile);
 records.push({code:entry.tokenCode,anatomy:entry.tokenAnatomy,variant:entry.tokenVisual.variant,visualBasis:entry.tokenVisual.visualBasis,triangles:model.triangles,batches:new Set(model.records.map(x=>x.material)).size,parts:model.records.length,bounds:{min:model.bounds.min.toArray(),max:model.bounds.max.toArray()},finitePosition:model.records.every(x=>x.geometry.attributes.position.array.every(Number.isFinite)),finiteNormal:model.records.every(x=>x.geometry.attributes.normal.array.every(Number.isFinite)),geometrySha256:model.signature});
 model.dispose();
}
const after=pin();
const result={createdAt:new Date().toISOString(),scope:'Isolated construction geometry, not full-duel integration.',before,after,unchanged:JSON.stringify(before)===JSON.stringify(after),covered:records.length,maxTriangles:Math.max(...records.map(x=>x.triangles)),maxBatches:Math.max(...records.map(x=>x.batches)),allBounded:records.every(x=>x.bounds.min[1]>=0&&x.bounds.max[1]<=3.6&&Math.max(Math.abs(x.bounds.min[0]),Math.abs(x.bounds.max[0]),Math.abs(x.bounds.min[2]),Math.abs(x.bounds.max[2]))<=2),records};
writeFileSync('/workspace/yugioh-token-models-2026-10-11/illustrated-exceptions/construction-audit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({covered:result.covered,maxTriangles:result.maxTriangles,maxBatches:result.maxBatches,allBounded:result.allBounded,unchanged:result.unchanged}));
