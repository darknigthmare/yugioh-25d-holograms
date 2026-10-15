import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, Mesh, MeshBasicMaterial, DoubleSide, Vector3 } from 'three';
import { buildTokenIllustratedGroups, getTokenIllustrationFrame } from '../src/ui/HologramTokenIllustratedGroups.js';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { createHologramPoseAnimation } from '../src/ui/HologramPoseAnimation.js';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/token-model-baseline-2026-10-11.json', import.meta.url)));
const create = (id, defense=false) => createHologramMonsterModel({ id, type:'Token Monster', isToken:true }, {defense});
const dispose = model => model.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
function components(code) {
  const pieces = new Map();
  buildTokenIllustratedGroups({tokenCode:code}, {part:(name,geometry,material,position,scale=[1,1,1],rotation=[0,0,0]) => {
    const mesh = new Mesh(geometry,new MeshBasicMaterial({side:DoubleSide}));
    mesh.position.set(...position);mesh.scale.set(...scale);mesh.rotation.set(...rotation);mesh.updateMatrixWorld(true);
    pieces.set(name,mesh);
  }});
  return pieces;
}
function release(pieces) { for(const mesh of pieces.values()){mesh.geometry.dispose();mesh.material.dispose();} }
function fingerprint(model) {
  const hash=createHash('sha256');
  for(const mesh of model.children)for(const attribute of Object.values(mesh.geometry.attributes))hash.update(Buffer.from(attribute.array.buffer));
  return hash.digest('hex');
}

test('Crystal Beast uses seven separate solid jewels in the printed relative positions, with no invented beast body', () => {
  const pieces=components('58371672');
  // Measured independently from SDCB-EN049; these are not a symmetric ring.
  const expected=[['amethyst',141,211],['clear-violet',279,183],['emerald',360,251],['ruby',239,287],['gold',114,320],['amber',187,419],['sapphire',331,397]];
  const centres=new Map();
  for(const [name,x,y]of expected){
    const mesh=pieces.get(`token-crystal-beast-gem-${name}`);assert.ok(mesh,name);
    const bounds=new Box3().setFromObject(mesh),size=bounds.getSize(new Vector3()),centre=bounds.getCenter(new Vector3());
    assert.ok(size.x>.4&&size.y>.5&&size.z>.4,`${name}: actual solid volume`);
    assert.ok(Math.abs(centre.x-(x-236)*.0073)<.08,`${name}: source horizontal position`);
    assert.ok(Math.abs(centre.y-(.25+(488-y)*.0073))<.10,`${name}: source vertical position`);
    centres.set(name,centre);
  }
  assert.ok(centres.get('amethyst').x<centres.get('clear-violet').x);
  assert.ok(centres.get('clear-violet').y>centres.get('ruby').y);
  assert.ok(centres.get('gold').x<centres.get('ruby').x);
  assert.ok(centres.get('sapphire').y<centres.get('emerald').y);
  assert.equal([...pieces.keys()].filter(name=>name.startsWith('token-crystal-beast-gem-')).length,7);
  const actual=create('58371672');
  assert.equal(actual.userData.partNames.some(name=>/token-beast-(torso|head|leg|paw|tail)/.test(name)),false);
  dispose(actual);release(pieces);
});

test('jewel facet normals face outwards and crown surfaces keep distinct reflected colours',()=>{
  const pieces=components('58371672');
  for(const [name,mesh]of pieces)if(name.startsWith('token-crystal-beast-gem-')){
    const {position,normal,color}=mesh.geometry.attributes;
    let back=0,front=0;const shades=new Set();
    for(let i=0;i<position.count;i++){
      if(position.getZ(i)>.25&&normal.getZ(i)>.4)front++;
      if(position.getZ(i)<-.20&&normal.getZ(i)<-.4)back++;
      shades.add([color.getX(i),color.getY(i),color.getZ(i)].map(v=>v.toFixed(4)).join(','));
    }
    assert.ok(front>=3,`${name}: front crown has outward +Z normals`);
    assert.ok(back>=3,`${name}: back pavilion has outward -Z normals`);
    assert.ok(shades.size>=5,`${name}: independent facet shading`);
  }
  release(pieces);
});

test('Prank-Kids retains five foreground subjects with their source left-right order, asymmetric depth and poses',()=>{
  const pieces=components('43664495');
  const expected=[['purple-cleaner-head',325,478],['brown-hound-head',263,811],['green-foreground-head',356,929.84],['fire-foreground-head',580,835.5],['blue-foreground-head',781,978.34]];
  const centres=new Map();
  for(const [part,x,y]of expected){
    const mesh=pieces.get(`token-prank-${part}`);assert.ok(mesh,part);
    const bounds=new Box3().setFromObject(mesh),centre=bounds.getCenter(new Vector3()),size=bounds.getSize(new Vector3());
    assert.ok(size.x>.15&&size.y>.12&&size.z>.1,`${part}: visible modelled head`);
    assert.ok(Math.abs(centre.x-(x-528)*.00345)<.001,`${part}: source horizontal anchor`);
    assert.ok(Math.abs(centre.y-(.18+(1090-y)*.00345))<.001,`${part}: source height anchor`);
    centres.set(part,centre);
  }
  assert.ok(centres.get('brown-hound-head').x<centres.get('green-foreground-head').x);
  assert.ok(centres.get('green-foreground-head').x<centres.get('fire-foreground-head').x);
  assert.ok(centres.get('fire-foreground-head').x<centres.get('blue-foreground-head').x);
  assert.ok(centres.get('purple-cleaner-head').z<centres.get('green-foreground-head').z);
  const raisedRight=pieces.get('token-prank-blue-foreground-right-raised-arm');
  const raisedBounds=new Box3().setFromObject(raisedRight);
  assert.ok(raisedBounds.max.y>centres.get('blue-foreground-head').y,'blue kid lifts its arm beside its head');
  const model=create('43664495');assert.equal(model.userData.partNames.some(name=>/token-flame-face|token-flame-core/.test(name)),false);dispose(model);
  release(pieces);
});

test('the crowd has individually placed geometry in the roof, wall, floor and distant planes',()=>{
  const pieces=components('43664495');
  const heads=[...pieces].filter(([name])=>/token-prank-(upper-|roof-|right-|floor-).*?-head$/.test(name));
  assert.equal(heads.length,25,'25 small visible/partly occluded figures, beyond the five foreground subjects');
  const positions=new Set();
  for(const [name,mesh]of heads){
    const bounds=new Box3().setFromObject(mesh),size=bounds.getSize(new Vector3()),centre=bounds.getCenter(new Vector3());
    assert.ok(size.x>.02&&size.y>.01&&size.z>.015,`${name}: actual volumetric miniature`);
    positions.add(centre.toArray().map(v=>v.toFixed(4)).join(','));
  }
  assert.equal(positions.size,25,'figures may not collapse into repeated geometry at the origin');
  const model=create('43664495');assert.equal(model.userData.partNames.some(name=>/token-(?:flame|primal)-/.test(name)),false);dispose(model);
  release(pieces);
});

test('illustrated groups retain the original October 11 ×5 geometry limit and five batches in ATK and DEF',()=>{
  for(const id of ['43664495','58371672'])for(const defense of [false,true]){
    const model=create(id,defense),original=baseline.codes.find(row=>row.id===id),limit=(defense?original.defenseTriangles:original.attackTriangles)*5;
    assert.ok(model.userData.triangleCount<=limit,`${id} ${defense?'DEF':'ATK'} ${model.userData.triangleCount} > ${limit}`);
    assert.ok(model.children.length>0&&model.children.length<=5);
    const bounds=new Box3().setFromObject(model);
    assert.ok(bounds.min.x>=-2.5&&bounds.max.x<=2.5&&bounds.min.z>=-2.5&&bounds.max.z<=2.5&&bounds.max.y<=3.3);
    for(const mesh of model.children){
      for(const attribute of Object.values(mesh.geometry.attributes))assert.ok(attribute.array.every(Number.isFinite));
      const normal=mesh.geometry.attributes.normal;
      for(let i=0;i<normal.count;i++)assert.ok(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-5,`${id}: unit normals`);
    }
    dispose(model);
  }
});

test('source effects use real white star and steam geometry in the same model batches',()=>{
  for(const id of ['43664495','58371672']){
    const pieces=components(id);
    const selected=[...pieces].filter(([name])=>id==='58371672'?name.includes('white-star-'):name.includes('purple-cleaner-steam-'));
    assert.equal(selected.length,id==='58371672'?15:8);
    for(const [name,mesh]of selected){assert.ok(mesh.geometry.attributes.position.count>=8,`${name}: actual effect vertices`);assert.ok(mesh.geometry.index.count>=18,`${name}: actual effect surfaces`);}
    release(pieces);
  }
});

test('group attacks preserve every geometry buffer and release owned resources once',()=>{
  for(const id of ['43664495','58371672']){
    const model=create(id),before=fingerprint(model);
    const resources=new Set(),refs=model.children.map(mesh=>{
      [mesh.geometry,mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial].filter(Boolean).forEach(resource=>resources.add(resource));
      return {mesh,geometry:mesh.geometry,attributes:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name,attribute])=>[name,{attribute,version:attribute.version}]))};
    });
    for(const kind of ['attack','summon','cast','victory']){const animation=createHologramPoseAnimation(model,{kind});for(const progress of [.01,.25,.5,.75,.99])animation.update(progress);animation.dispose();}
    assert.equal(fingerprint(model),before);
    for(const {mesh,geometry,attributes}of refs){assert.equal(mesh.geometry,geometry);for(const [name,record]of Object.entries(attributes)){assert.equal(mesh.geometry.attributes[name],record.attribute);assert.equal(record.attribute.version,record.version);}}
    const disposed=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,(disposed.get(resource)||0)+1));
    dispose(model);for(const resource of resources)assert.equal(disposed.get(resource),1);
  }
});

test('non-group identities fall through without requesting geometry or private duel data',()=>{
  let builds=0;assert.equal(buildTokenIllustratedGroups({tokenCode:'73915052'},{part:()=>builds++}),false);assert.equal(builds,0);
});

test('the Atlas-only artwork frame uses the factory scale and handles unsupported keys safely',()=>{
  const prank=getTokenIllustrationFrame('43664495'),crystal=getTokenIllustrationFrame('58371672');
  assert.ok(Math.abs(prank.left-(120-528)*.00345*.7)<1e-10);
  assert.ok(Math.abs(prank.top-(.18+(1090-285)*.00345)*.7)<1e-10);
  assert.ok(Math.abs(crystal.right-(418-236)*.0073*.7)<1e-10);
  assert.ok(Math.abs(crystal.bottom-.25*.7)<1e-10);
  for(const frame of [prank,crystal]){assert.ok(frame.width>1.8&&frame.height>1.8);assert.equal(frame.centerX,(frame.left+frame.right)/2);assert.equal(frame.centerY,(frame.bottom+frame.top)/2);}
  for(const code of ['73915052','__proto__','constructor',null,undefined])assert.equal(getTokenIllustrationFrame(code),null);
});
