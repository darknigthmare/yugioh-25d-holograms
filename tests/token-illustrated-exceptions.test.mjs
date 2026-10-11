import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import { buildTokenIllustratedExceptions } from '../src/ui/HologramTokenIllustratedExceptions.js';
import { resolveHologramMonsterProfile } from '../src/ui/CombatVisualProfiles.js';
import { resolveHologramPartJoint, HOLOGRAM_JOINTS } from '../src/ui/HologramPoseAnimation.js';
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



const codes=['93912846','49808197','75732623','8198621'];
test('four exact exceptions build distinct finite bounded anatomy within 5200 triangles and five shared materials',()=>{
 const signatures=new Set();
 for(const code of codes){const model=construct(resolveHologramMonsterProfile({id:code}));assert.equal(model.built,true);assert.ok(model.triangles<=5200);assert.ok(new Set(model.records.map(x=>x.material)).size<=5);assert.ok(model.bounds.min.y>=0);assert.ok(model.bounds.max.y<=3.6);assert.ok(Math.max(Math.abs(model.bounds.min.x),Math.abs(model.bounds.max.x),Math.abs(model.bounds.min.z),Math.abs(model.bounds.max.z))<=2);assert.equal(signatures.has(model.signature),false);signatures.add(model.signature);for(const r of model.records){assert.ok(r.geometry.attributes.position.array.every(Number.isFinite));assert.ok(r.geometry.attributes.normal.array.every(Number.isFinite));}model.dispose();}
});
test('illustrated features remain explicit and DarkSoul has a floating lower silhouette without human legs',()=>{
 const expected={
  '93912846':['token-gift-fiend-large-round-head','token-gift-fiend-crossed-left-arm','token-gift-fiend-crossed-right-arm','token-gift-fiend-round-toe--1-2'],
  '49808197':['token-metabo-long-brown-mane-0','token-metabo-heavy-lowered-eyelid--1','token-metabo-fine-long-proboscis'],
  '75732623':['token-grinder-back-saw-crest','sword-token-grinder-triangular-drill-outer','pincer-token-grinder-angular-hook--1-1','token-grinder-hanging-chain-link-0'],
  '8198621':['token-dark-soul-twisted-face-mask','token-dark-soul-floating-torn-left-haunch','token-dark-soul-ragged-floating-tail-1']
 };
 for(const code of codes){const model=construct(resolveHologramMonsterProfile({id:code}));expected[code].forEach(name=>assert.ok(model.names.includes(name),name));if(code==='49808197')assert.equal(model.names.filter(n=>/^token-metabo-long-bent-leg-/.test(n)).length,12);if(code==='8198621')assert.equal(model.names.some(n=>/thigh|shin|calf|toe|foot|boot/.test(n)),false);model.dispose();}
});
test('Grinder real hook is mapped to left pincer and its opposite drill arm follows the weapon rig',()=>{
 assert.equal(resolveHologramPartJoint('pincer-token-grinder-angular-hook--1-1'),HOLOGRAM_JOINTS.LEFT_PINCER);
 assert.equal(resolveHologramPartJoint('pincer-token-grinder-arm--1-upper'),HOLOGRAM_JOINTS.LEFT_PINCER);
 assert.equal(resolveHologramPartJoint('sword-token-grinder-triangular-drill-outer'),HOLOGRAM_JOINTS.WEAPON);
 assert.equal(resolveHologramPartJoint('upper-arm-1-token-grinder-upper'),HOLOGRAM_JOINTS.WEAPON);
});
test('unrelated codes and variant-only impostors delegate without geometry; no duel state is read',()=>{
 for(const code of ['0','49808198','00049808197','']){const model=construct({tokenCode:code,tokenVisual:{variant:'metabo'}});assert.equal(model.built,false);assert.equal(model.records.length,0);}
 const profile=resolveHologramMonsterProfile({id:'93912846'}),poison={...profile};for(const key of ['name','card','uid','gameState','controller','effect'])Object.defineProperty(poison,key,{get(){throw new Error('unexpected '+key);}});const first=construct(poison),second=construct(poison);assert.equal(first.signature,second.signature);first.dispose();second.dispose();
});
