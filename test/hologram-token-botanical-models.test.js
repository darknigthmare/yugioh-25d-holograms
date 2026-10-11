import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import * as THREE from 'three';
import { buildTokenBotanicalAnatomy } from '../src/ui/HologramTokenBotanicalModels.js';
import { TOKEN_MONSTER_MODEL_PROFILES } from '../src/ui/TokenMonsterModelProfiles.js';

const ANATOMIES = new Set(['flower', 'seed', 'ivy', 'maize', 'ant', 'mantis', 'spider', 'beetle', 'worm']);
const MATERIALS = new Set(['body', 'accent', 'dark', 'eye', 'glow']);

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
  const built = buildTokenBotanicalAnatomy({ body:'#497c49', accent:'#ba8648', hair:'#292b30', eye:'#d7ad46', ...profile }, { part, sphere, box, cone, ring, rod });
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

test('all registered botanical and insect Tokens have finite bounded geometry within five batches and 6000 triangles', () => {
  let covered = 0;
  for (const profile of Object.values(TOKEN_MONSTER_MODEL_PROFILES).filter(profile => ANATOMIES.has(profile.tokenAnatomy))) {
    const model = construct(profile);
    assert.equal(model.built, true, profile.tokenCode);
    assert.ok(model.triangles <= 6000, `${profile.tokenCode}: ${model.triangles} triangles`);
    assert.ok(model.records.length > 0);
    assert.ok(new Set(model.records.map(record=>record.material)).size <= 5);
    assert.ok(model.bounds.min.y >= 0, `${profile.tokenCode}: minimum Y ${model.bounds.min.y}`);
    assert.ok(model.bounds.max.y <= 3.6, `${profile.tokenCode}: maximum Y ${model.bounds.max.y}`);
    assert.ok(Math.max(Math.abs(model.bounds.min.x),Math.abs(model.bounds.max.x),Math.abs(model.bounds.min.z),Math.abs(model.bounds.max.z)) <= 2);
    assert.equal(new Set(model.names).size, model.names.length, `${profile.tokenCode}: unique part names`);
    for(const record of model.records){
      assert.ok(MATERIALS.has(record.material));
      assert.ok(record.geometry.attributes.position.array.every(Number.isFinite));
      assert.ok(record.geometry.attributes.normal.array.every(Number.isFinite));
      assert.ok(!record.tint || /^#[a-f0-9]{6}$/i.test(record.tint));
    }
    model.dispose(); covered += 1;
  }
  assert.ok(covered >= 20);
});

test('flowers are separate wool, rose, leafy, cyclopean and long-stem silhouettes', () => {
  const expected = {
    15341822:['token-fluff-round-face','token-fluff-fine-stalk','token-fluff-angry-brow--1'],
    15341823:['token-fluff-round-face','token-fluff-fine-stalk'],
    31986289:['token-rose-bloom-cup','token-rose-curled-root','token-rose-sharp-thorn-0'],
    71645243:['token-rose-bloom-cup','token-rose-serrated-leaf--1','token-rose-layer-0-folded-petal-0'],
    28062326:['token-plant-long-leaf-hair-0','token-plant-blue-boot--1'],
    62543394:['token-lekunga-single-red-iris','token-lekunga-curled-tentacle-0'],
    82994510:['token-horseytail-long-stem-1','token-horseytail-red-scarf-knot','token-horseytail-curled-foot--1']
  };
  const signatures=new Set();
  for(const [code,names] of Object.entries(expected)){
    const model=construct(TOKEN_MONSTER_MODEL_PROFILES[code]);
    names.forEach(name=>assert.ok(model.names.includes(name),`${code}: ${name}`));
    assert.equal(signatures.has(model.signature),false,`${code} geometry differs from other reference Tokens`);
    signatures.add(model.signature);
    model.dispose();
  }
});

test('reference ant and spider have six and eight legs; mantis has folding forelegs and four walking legs', () => {
  for(const [code,prefix,count] of [['22493812','token-ant-leg-',18],['56051649','token-spider-leg-',24]]){
    const model=construct(TOKEN_MONSTER_MODEL_PROFILES[code]);
    assert.equal(model.names.filter(name=>name.startsWith(prefix)).length,count);
    assert.equal(model.names.some(name=>/horn|hoof|goat/.test(name)),false);
    model.dispose();
  }
  const mantis=construct(TOKEN_MONSTER_MODEL_PROFILES['31600514']);
  assert.equal(mantis.names.filter(name=>name.startsWith('token-mantis-folded-foreleg-')).length,2);
  assert.equal(mantis.names.filter(name=>name.startsWith('token-mantis-walking-leg-')).length,8);
  mantis.dispose();
});

test('insect-monster emerges from an open spotted shell while pure eggs remain delegated', () => {
  const profile=TOKEN_MONSTER_MODEL_PROFILES['91512836'];
  for(const tokenAnatomy of ['beetle','egg']){
    const model=construct({...profile,tokenAnatomy});
    assert.ok(model.names.includes('token-insect-monster-open-eggshell'));
    assert.equal(model.names.filter(name=>name.includes('brown-shell-cell')).length,11);
    assert.equal(model.names.filter(name=>/^token-beetle-leg-.*upper$/.test(name)).length,6);
    model.dispose();
  }
  const egg=construct(TOKEN_MONSTER_MODEL_PROFILES['17228909']);
  assert.equal(egg.built,false);
  assert.equal(egg.records.length,0);
});

test('maize, needle, sinister seed and skull-grub retain their reference details',()=>{
  for(const [code,names] of [
    ['74983882',['token-maize-kernel-0-0','token-maize-long-husk--1','token-maize-open-smile']],
    ['74440056',['token-needle-thin-metal-shaft-0','token-needle-sharp-tip-2']],
    ['60406592',['token-sinister-seed-red-bloom-0','token-sinister-seed-tall-leaf']],
    ['43140792',['token-worm-ivory-skull-head','token-worm-rounded-segment-0','token-worm-red-front-mark--1']],
    ['12965762',['token-wicked-plant-skeletal-branch-0--1','token-wicked-plant-ghost-leaf-face-0']]
  ]){const model=construct(TOKEN_MONSTER_MODEL_PROFILES[code]);names.forEach(name=>assert.ok(model.names.includes(name),`${code}: ${name}`));model.dispose();}
});

test('unknown anatomy produces no parts and construction is deterministic without reading duel state',()=>{
  const unknown=construct({tokenAnatomy:'goat'});
  assert.equal(unknown.built,false);assert.equal(unknown.records.length,0);
  const poison={...TOKEN_MONSTER_MODEL_PROFILES['71645243']};
  for(const key of ['card','uid','gameState','controller','effect'])Object.defineProperty(poison,key,{get(){throw new Error(`unexpected duel field ${key}`);}});
  const first=construct(poison),second=construct(poison);
  assert.equal(first.signature,second.signature);
  assert.equal(first.triangles,second.triangles);
  first.dispose();second.dispose();
});
