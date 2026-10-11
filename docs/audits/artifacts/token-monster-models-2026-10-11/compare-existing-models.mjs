import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createHologramMonsterModel as current} from '/workspace/yugioh-25d-holograms/src/ui/HologramMonsterModels.js';
const repo='/workspace/yugioh-25d-holograms',base='/workspace/yugioh-token-models-2026-10-11';
mkdirSync(`${base}/baseline-imports`,{recursive:true});
function adapt(source,kind){
 return source.replace(/from '\.\/([^']+)'/g,(_,name)=>`from '${name==='CombatVisualProfiles.js'&&kind==='models'?base+'/baseline-imports/CombatVisualProfiles.mjs':repo+'/src/ui/'+name}'`)
  .replace("from 'three';",`from '${repo}/node_modules/three/build/three.module.js';`)
  .replace("from 'three/addons/utils/BufferGeometryUtils.js';",`from '${repo}/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js';`);
}
const oldProfiles=readFileSync(`${base}/before/CombatVisualProfiles.js.txt`,'utf8'),oldModels=readFileSync(`${base}/before/HologramMonsterModels.js.txt`,'utf8');
writeFileSync(`${base}/baseline-imports/CombatVisualProfiles.mjs`,adapt(oldProfiles,'profiles'));
writeFileSync(`${base}/baseline-imports/HologramMonsterModels.mjs`,adapt(oldModels,'models'));
const {createHologramMonsterModel:before}=await import(`${base}/baseline-imports/HologramMonsterModels.mjs`);
const {SUPPORTED_HOLOGRAM_MODEL_IDS:ids}=await import(`${base}/baseline-imports/CombatVisualProfiles.mjs`);
function hash(model){
 const buffers=createHash('sha256'),materials=createHash('sha256');
 model.children.forEach(mesh=>{
  buffers.update(mesh.name);if(mesh.geometry.index)buffers.update(Buffer.from(mesh.geometry.index.array.buffer));
  for(const [name,attribute] of Object.entries(mesh.geometry.attributes)){buffers.update(name);buffers.update(Buffer.from(attribute.array.buffer));}
  const m=mesh.material;materials.update(JSON.stringify({type:m.type,color:m.color?.getHexString(),emissive:m.emissive?.getHexString(),emissiveIntensity:m.emissiveIntensity,metalness:m.metalness,roughness:m.roughness,side:m.side,transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite,blending:m.blending,forceSinglePass:m.forceSinglePass,toneMapped:m.toneMapped,castShadow:mesh.castShadow}));
 });
 const result={buffers:buffers.digest('hex'),materials:materials.digest('hex'),parts:model.userData.partNames,triangleCount:model.userData.triangleCount,meshCount:model.userData.meshCount};
 model.traverse(mesh=>{mesh.geometry?.dispose();mesh.material?.dispose();});return result;
}
const records=ids.map(id=>{const a=hash(before({id})),b=hash(current({id}));return {id,before:a,after:b,identical:JSON.stringify(a)===JSON.stringify(b)};});
writeFileSync(`${base}/after/non-token-regression.json`,JSON.stringify({baselineOriginals:'Exact source bytes captured before Token integration; import adapters only replace module specifiers to permit isolated execution.',models:records.length,allIdentical:records.every(r=>r.identical),records},null,2)+'\n');
console.log(JSON.stringify({models:records.length,allIdentical:records.every(r=>r.identical),changed:records.filter(r=>!r.identical).map(r=>r.id)}));
if(!records.every(r=>r.identical))process.exitCode=1;
