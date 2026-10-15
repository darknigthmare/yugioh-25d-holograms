import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { Box3, ShaderLib } from 'three';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { createHologramPoseAnimation, HOLOGRAM_JOINTS } from '../src/ui/HologramPoseAnimation.js';
import { TOKEN_MONSTER_MODEL_PROFILES, TOKEN_MODEL_ANATOMIES } from '../src/ui/TokenMonsterModelProfiles.js';
import { buildTokenMonsterAnatomy, TOKEN_RENDER_ANATOMIES } from '../src/ui/HologramTokenModels.js';

const create = code => createHologramMonsterModel({ id:String(code), type:'Token Monster', isToken:true });
function release(model) { model.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); }); }
function signature(model, colors = false) {
  const hash = createHash('sha256');
  model.children.forEach(mesh => {
    hash.update(Buffer.from(mesh.geometry.attributes.position.array.buffer));
    if(colors)hash.update(Buffer.from(mesh.geometry.attributes.color.array.buffer));
  });
  return hash.digest('hex');
}
function joints(model) { return new Set(model.children.flatMap(mesh => [...mesh.geometry.attributes.hologramJoint.array])); }

test('all 240 native monster Tokens resolve their exact public identity and bounded dedicated anatomy', () => {
  assert.equal(Object.keys(TOKEN_MONSTER_MODEL_PROFILES).length,240);
  assert.deepEqual([...TOKEN_RENDER_ANATOMIES].sort(),[...TOKEN_MODEL_ANATOMIES].sort());
  const observed=new Set();
  for(const profile of Object.values(TOKEN_MONSTER_MODEL_PROFILES)){
    const model=create(profile.tokenCode), bounds=new Box3().setFromObject(model);
    assert.equal(model.userData.profile.id,`token-${profile.tokenCode}`);
    assert.equal(model.userData.profile.tokenCode,profile.tokenCode);
    assert.equal(model.userData.profile.tokenAnatomy,profile.tokenAnatomy);
    assert.equal(model.userData.fidelity,'procedural-interpretation');
    assert.ok(model.children.length>0&&model.children.length<=5,profile.tokenCode);
    assert.ok(model.userData.triangleCount<=29450,`${profile.tokenCode}: ${model.userData.triangleCount}`);
    assert.ok(bounds.min.y>=0&&bounds.max.y<=3.3,`${profile.tokenCode}: Y bounds`);
    assert.ok(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x),Math.abs(bounds.min.z),Math.abs(bounds.max.z))<=2.5,`${profile.tokenCode}: field footprint`);
    assert.ok(!model.userData.partNames.some(name=>name.includes('token-goat')),profile.tokenCode);
    assert.equal(new Set(model.userData.partNames).size,model.userData.partNames.length,profile.tokenCode);
    for(const mesh of model.children){
      assert.equal(mesh.material.map,null);
      assert.equal(mesh.geometry.attributes.hologramJoint.count,mesh.geometry.attributes.position.count);
      for(const [name,attribute] of Object.entries(mesh.geometry.attributes)) assert.ok(attribute.array.every(Number.isFinite),`${profile.tokenCode}: ${name}`);
    }
    observed.add(profile.tokenAnatomy);release(model);
  }
  assert.equal(observed.size,42);
});

test('documented shared illustrations retain the same anatomy and palette while preserving each native code',()=>{
  const groups=[['11050416','18027139','18027140','18027141'],['67284108','67284109','67284110','67284111'],['53855410','53855411'],['64382840','64382841'],['21770261','79387393']];
  for(const group of groups){
    const first=create(group[0]),expected=signature(first,true);
    for(const code of group.slice(1)){
      const other=create(code);
      assert.equal(other.userData.profile.tokenVisual.referenceImageId,first.userData.profile.tokenVisual.referenceImageId);
      assert.equal(signature(other,true),expected,`${code}: exact shared art must not acquire arbitrary passcode variation`);
      assert.notEqual(other.userData.profile.id,first.userData.profile.id);release(other);
    }
    release(first);
  }
});

test('illustrated species keep their defining anatomy instead of receiving the former goat mannequin',()=>{
  const expected={
    73915052:['token-sheep-round-fleece','token-sheep-curled-horn--1','token-sheep-closed-eye-1'],
    40703223:['token-kuriboh-fur-ball','token-kuriboh-green-hand--1'],
    7392746:['token-bone-hound-spine','token-bone-hound-rib-0--1'],
    86801872:['token-snake-decorated-blue-urn','token-snake-forked-tongue-stem'],
    21179144:['token-reptilianne-female-torso','token-reptilianne-blue-serpent-tail'],
    69868556:['token-dragon-lord-statue-pedestal-0','wing--1-token-dragon-lord-stone-wing'],
    89907228:['token-divine-dragon-neck--1-1','token-divine-dragon-head-1'],
    84816245:['token-acorn-usb-metal-plug','token-acorn-brown-dome'],
    93104633:['token-security-triangular-drone','token-security-blue-lens'],
    34822851:['token-infernoid-glass-capsule','token-infernoid-curved-metal-cage--1'],
    75119041:['token-tindangle-triangular-demon','token-tindangle-central-eye'],
    90884404:['token-soul-wide-eyeball','token-soul-pointed-appendage-7'],
    46647145:['token-humanoid-flowing-hair-0','token-world-legacy-checkered-skirt--1'],
    93912846:['token-gift-fiend-crossed-left-arm','token-gift-fiend-brown-belly'],
    49808197:['token-metabo-fine-long-proboscis','token-metabo-long-brown-mane-0'],
    75732623:['token-grinder-stooped-metal-torso','sword-token-grinder-triangular-drill-outer'],
    8198621:['token-dark-soul-floating-torn-left-haunch','token-dark-soul-ragged-floating-tail-1'],
    70391589:['token-siphon-twisted-plant-trunk','token-siphon-pink-light-orb-2'],
    65810490:['token-wicked-four-red-iris--1-1','token-wicked-large-red-chest-eye']
  };
  const signatures=new Set();
  for(const [code,names] of Object.entries(expected)){
    const model=create(code);names.forEach(name=>assert.ok(model.userData.partNames.includes(name),`${code}: ${name}`));
    signatures.add(signature(model));release(model);
  }
  assert.equal(signatures.size,Object.keys(expected).length);
  const dinosaur=create('44689689');
  assert.ok(dinosaur.userData.partNames.some(name=>name.includes('fiery-sail')));
  assert.ok(!dinosaur.userData.partNames.some(name=>name.startsWith('wing-')));release(dinosaur);
  const squid=create('65500516');
  assert.equal(squid.userData.partNames.filter(name=>name.startsWith('token-squid-tentacle-')).length,8);
  assert.ok(!squid.userData.partNames.includes('token-slime-floating-core'));release(squid);
  for(const code of ['25415053','52900001']){
    const plumes=create(code);
    assert.equal(plumes.userData.partNames.filter(name=>name.startsWith('token-shinobird-floating-plume-')).length,3);
    assert.ok(!plumes.userData.partNames.some(name=>/beak|talon|bird-head/.test(name)));release(plumes);
  }
  const fox=create('27198002');assert.equal(fox.userData.partNames.filter(name=>name.startsWith('token-fox-nine-tail-')).length,9);release(fox);
  const fish=create('27882994');assert.ok(fish.userData.partNames.includes('token-fish-forked-tail'));assert.ok(!fish.userData.partNames.some(name=>/horn|serpent/.test(name)));release(fish);
  const divine=create('89907228');
  assert.equal(divine.userData.partNames.filter(name=>/^token-divine-dragon-head--?1$/.test(name)).length,2);
  assert.ok(!divine.userData.partNames.some(name=>name.startsWith('wing-')));release(divine);
});

test('unknown Tokens use a neutral echo independent of private identity and unsupported builders do nothing',()=>{
  assert.equal(buildTokenMonsterAnatomy({family:'dragon'},{}),false);
  const model=createHologramMonsterModel({id:'999999999',type:'Token Monster',isToken:true,race:'Dragon',attribute:'FIRE'});
  assert.equal(model.userData.profile.tokenAnatomy,'unknown-echo');
  assert.ok(model.userData.partNames.includes('token-unknown-neutral-echo'));
  assert.ok(!model.userData.partNames.some(name=>/fleece|hoof|horn|skull/.test(name)));release(model);
  const card={id:'73915052'};
  for(const key of ['name','effect','description','imageUrl','uid','owner','controller','gameState'])Object.defineProperty(card,key,{get(){throw new Error(`private field ${key} was accessed`);}});
  const safe=createHologramMonsterModel(card),canonical=create('73915052');
  assert.equal(signature(safe,true),signature(canonical,true));release(safe);release(canonical);
});

test('wing, weapon and both Metal Fiend hooks have their shared shader joints and stable buffers during actions',()=>{
  for(const [code,required] of [['904186',[HOLOGRAM_JOINTS.LEFT_WING,HOLOGRAM_JOINTS.RIGHT_WING]],['44330099',[HOLOGRAM_JOINTS.WEAPON]],['24874631',[HOLOGRAM_JOINTS.LEFT_PINCER,HOLOGRAM_JOINTS.RIGHT_PINCER]]]){
    const model=create(code),present=joints(model),before=signature(model,true);
    for(const joint of required)assert.ok(present.has(joint),`${code}: joint ${joint}`);
    const refs=model.children.map(mesh=>({mesh,geometry:mesh.geometry,attributes:{...mesh.geometry.attributes},versions:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([k,a])=>[k,a.version]))}));
    const animation=createHologramPoseAnimation(model,{kind:'attack'});
    for(let frame=0;frame<60;frame++)assert.equal(animation.update(frame/61),true);
    assert.equal(signature(model,true),before);
    for(const ref of refs){
      assert.equal(ref.mesh.geometry,ref.geometry);
      for(const [name,attribute] of Object.entries(ref.attributes)){assert.equal(ref.mesh.geometry.attributes[name],attribute);assert.equal(attribute.version,ref.versions[name]);}
      const shader={uniforms:{},vertexShader:ShaderLib[ref.mesh.material.isMeshStandardMaterial?'standard':'basic'].vertexShader};
      ref.mesh.material.onBeforeCompile(shader);assert.equal(shader.uniforms.uHologramPose,model.userData.poseRig.pose);
    }
    animation.dispose();
    const reduced=createHologramPoseAnimation(model,{kind:'attack',reducedMotion:true});assert.equal(reduced.update(.5),false);assert.deepEqual(model.userData.poseRig.pose.value.toArray(),[0,0,0,0]);
    reduced.dispose();release(model);
  }
});

test('all Token geometry, visible materials and owned depth/distance materials are released once',()=>{
  for(const code of ['73915052','904186','24874631','71645243','90884404']){
    const model=create(code),geometries=new Set(),materials=new Set(),shadowMaterials=new Set();
    model.traverse(mesh=>{if(!mesh.isMesh)return;geometries.add(mesh.geometry);materials.add(mesh.material);if(mesh.customDepthMaterial)shadowMaterials.add(mesh.customDepthMaterial);if(mesh.customDistanceMaterial)shadowMaterials.add(mesh.customDistanceMaterial);});
    let geometryCount=0,materialCount=0,shadowCount=0;
    geometries.forEach(g=>g.addEventListener('dispose',()=>geometryCount++));materials.forEach(m=>m.addEventListener('dispose',()=>materialCount++));shadowMaterials.forEach(m=>m.addEventListener('dispose',()=>shadowCount++));
    const animation=createHologramPoseAnimation(model,{kind:'attack'});animation.update(.5);release(model);
    assert.equal(geometryCount,geometries.size);assert.equal(materialCount,materials.size);assert.equal(shadowCount,2);
    assert.equal(model.userData.poseRig.disposed,true);assert.equal(model.userData.poseRig.dispose(),false);assert.equal(animation.update(.8),false);animation.dispose();
  }
});
