import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Vector3 } from 'three';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { buildReferenceMonsterAnatomy } from '../src/ui/HologramReferenceAnatomy.js';
import { resolveHologramMonsterProfile } from '../src/ui/CombatVisualProfiles.js';
import { createHologramPoseAnimation, HOLOGRAM_JOINTS, resolveHologramPartJoint } from '../src/ui/HologramPoseAnimation.js';
import { getHologramTriangleBudget } from './fixtures/hologram-triangle-budgets-2026-10-11.js';

const release = model => model.children.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });

test('Faith casting keeps the actual sleeve attachment inside its overlap while the hand and staff move', () => {
  const rods=new Map(),ignore=()=>{};
  buildReferenceMonsterAnatomy(resolveHologramMonsterProfile({id:'31560081'}),{
    part:(_name,geometry)=>geometry.dispose(),sphere:ignore,box:ignore,cone:ignore,ring:ignore,membrane:ignore,
    rod:(name,_material,start,end,radius)=>rods.set(name,{start:new Vector3(...start),end:new Vector3(...end),radius})
  });
  const sleeve=rods.get('mage-arm-1-faith-red-sleeve');
  assert.ok(sleeve);
  const model=createHologramMonsterModel({id:'31560081'});
  const shader={uniforms:{},vertexShader:'#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>'};
  model.children[0].material.onBeforeCompile(shader);
  const pivotExpression=shader.vertexShader.match(/hologramJoint > 2\.5[\s\S]*?pivot = vec3\(([\d., ]+)\)/);
  assert.ok(pivotExpression,'measure the pivot actually installed into the production shader');
  const pivot=new Vector3(...pivotExpression[1].split(',').map(Number)),axis=new Vector3(1,0,0);
  const action=createHologramPoseAnimation(model,{kind:'casting'});
  let shoulderDisplacement=0,elbowDisplacement=0;
  for(const progress of[0,.25,.5,.75,1]) {
    action.update(progress);
    const angle=shader.uniforms.uHologramPose.value.y;
    const move=point=>point.clone().sub(pivot).applyAxisAngle(axis,angle).add(pivot);
    shoulderDisplacement=Math.max(shoulderDisplacement,move(sleeve.start).distanceTo(sleeve.start));
    elbowDisplacement=Math.max(elbowDisplacement,move(sleeve.end).distanceTo(sleeve.end));
  }
  assert.ok(shoulderDisplacement<sleeve.radius,'the visible collar/sleeve overlap must cover the displaced shoulder anchor');
  assert.ok(elbowDisplacement>sleeve.radius,'preserve the visible incantation movement instead of immobilizing the arm');
  for(const part of['mage-arm-1-faith-red-sleeve','mage-glove-1-faith-wide-red-sleeve','mage-hand-1-faith-bare-hand','staff','staff-crown'])assert.equal(resolveHologramPartJoint(part),HOLOGRAM_JOINTS.STAFF);
  action.dispose();release(model);
});

test('corroborated anatomy removes source contradictions: bare Ash feet, legless LAN serpent and rigid Obelisk back shields', () => {
  const ash=createHologramMonsterModel({id:'14558127'});
  assert.equal(ash.userData.partNames.filter(name=>/^ash-small-bare-foot-/.test(name)).length,2);
  assert.equal(ash.userData.partNames.filter(name=>/^ash-pointed-animal-ear-/.test(name)).length,2);
  assert.equal(ash.userData.partNames.some(name=>/sock|sandal/.test(name)),false);
  release(ash);
  const lan=createHologramMonsterModel({id:'77637979'});
  assert.ok(lan.userData.partNames.includes('lan-continuous-dark-cyber-serpent'));
  assert.equal(lan.userData.partNames.some(name=>/foreleg|hindleg|haunch|dragon-foot/.test(name)),false);
  assert.ok(lan.userData.partNames.some(name=>/^wing-/.test(name)));
  release(lan);
  const obelisk=createHologramMonsterModel({id:'10000000'});
  for(const side of[-1,1]) {
    const name=`obelisk-large-closed-dorsal-shield-${side}`;
    assert.ok(obelisk.userData.partNames.includes(name));
    assert.equal(resolveHologramPartJoint(name),HOLOGRAM_JOINTS.BODY);
    for(let ridge=0;ridge<3;ridge++)assert.equal(resolveHologramPartJoint(`obelisk-long-dorsal-shield-ridge-${side}-${ridge}`),HOLOGRAM_JOINTS.BODY);
  }
  release(obelisk);
});

test('Ultimate three narrow skulls and closed mandibles share the actual common jaw axis in a neutral pose', () => {
  const captured=new Map(),ignore=()=>{};
  try {
    assert.equal(buildReferenceMonsterAnatomy(resolveHologramMonsterProfile({id:'23995346'}),{
      part:(name,geometry,material,position)=>captured.set(name,{geometry,position}),
      sphere:ignore,box:ignore,cone:ignore,ring:ignore,rod:ignore,membrane:ignore
    }),true);
    const jaws=[0,1,2].map(i=>captured.get(`jaw-${i}`));
    assert.ok(jaws.every(Boolean));
    assert.deepEqual(jaws.map(jaw=>jaw.position[1]),[0,0,0]);
    assert.deepEqual(jaws.map(jaw=>jaw.position[2]),[0,0,0]);
    assert.equal(new Set(jaws.map(jaw=>jaw.position[0])).size,3);
    const bounds=jaws.map(jaw=>new Box3().setFromBufferAttribute(jaw.geometry.attributes.position));
    assert.ok(bounds.every(box=>box.min.y===bounds[0].min.y&&box.max.y===bounds[0].max.y));
    for(let head=0;head<3;head++) {
      const geometry=captured.get(`dragon-head-${head}`).geometry;
      const box=new Box3().setFromBufferAttribute(geometry.attributes.position),extent=box.getSize(new Vector3());
      assert.ok(extent.z>extent.x*1.7,'the corroborated long skull must remain narrower than its snout length');
      assert.equal(resolveHologramPartJoint(`jaw-${head}`),HOLOGRAM_JOINTS.JAW);
    }
  } finally {
    for(const item of captured.values())item.geometry.dispose();
  }
});

test('six replaced generic bodies use their literal card features within the original per-position budgets', () => {
  const cases=[
    ['13039848',['stone-angular-helmet-shell','stone-long-hollow-neck-cylinder-1','sword-stone-long-chiseled-blade'],/^(?:head|armored-torso|helmet-crest|eye-)/],
    ['91152256',['celtic-long-pointed-ear-1','celtic-blue-triangular-cheek-mark-1','celtic-long-blue-rear-cloak-1'],/^(?:shield|helmet-crest|armored-torso)/],
    ['31560081',['faith-magenta-ponytail-streamer-1','faith-long-violet-cape-panel-1','faith-closed-long-red-robe'],/^(?:faith-halo|faith-heart-gem|pointed-hat)/],
    ['71625222',['clock-flat-topped-red-cylinder-hat','clock-large-white-eye-1','sword-clock-gold-roulette-dial'],/^(?:wizard-clock-hat|clock-tick-)/],
    ['44508094',['stardust-violet-shoulder-jewel-1','stardust-long-central-swept-crest','wing-1-stardust-long-layered-silver-vane-8'],/^(?:dragon-head|dragon-breast|belly-scale)/],
    ['70781052',['skull-long-curved-ram-horn-1','skull-purple-muscular-torso','wing-1-skull-solid-blue-membrane'],/^(?:fiend-horn|skull-jaw)/]
  ];
  for(const [id,landmarks,absent] of cases)for(const defense of[false,true]) {
    const model=createHologramMonsterModel({id},{defense});
    assert.ok(landmarks.every(name=>model.userData.partNames.includes(name)),id);
    assert.equal(model.userData.partNames.some(name=>absent.test(name)),false,id);
    assert.ok(model.userData.triangleCount<=getHologramTriangleBudget(id,{defense}));
    assert.ok(model.children.length<=5);
    assert.ok(new Box3().setFromObject(model).getSize(new Vector3()).z>.3);
    assert.ok(model.userData.referenceArt.endsWith(`/${id}.jpg`));
    if(id==='70781052')assert.ok(model.children.find(mesh=>mesh.name.endsWith('-dark')).material.transparent===false,'the printed blue wing is opaque');
    release(model);
  }
});
