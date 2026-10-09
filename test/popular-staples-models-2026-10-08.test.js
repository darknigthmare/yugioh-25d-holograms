import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Box3, Vector3, PerspectiveCamera, Scene } from 'three';
import { POPULAR_STAPLE_PROFILES } from '../src/ui/HologramPopularStapleModels.js';
import { POPULAR_STAPLE_REFERENCE_ART } from '../src/ui/PopularStapleReferenceArt.js';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { createHologramPoseAnimation, HOLOGRAM_JOINTS } from '../src/ui/HologramPoseAnimation.js';
import { resolveHologramMonsterProfile } from '../src/ui/CombatVisualProfiles.js';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

const CARDS = [
  { id: '70095154', name: 'Cyber Dragon', attack: 2100, defense: 1600, joint: HOLOGRAM_JOINTS.JAW, landmarks: ['cyber-long-angular-upper-muzzle','cyber-segment-16-silver-shell','cyber-cheek-cable--1-0','jaw-cyber-pointed-lower-plate'], forbidden: /^(?:dragon-breast|wing-|foreleg|hindleg|sword|shield)/ },
  { id: '89943723', name: 'Elemental HERO Neos', attack: 2500, defense: 2000, joint: HOLOGRAM_JOINTS.WEAPON, landmarks: ['neos-blue-chest-orb','neos-swept-single-crown','gauntlet-1-neos-long-fin','neos-red-chest-chevron'], forbidden: /^(?:sword|shield|wing-|helmet-crest)/ },
  { id: '84013237', name: 'Number 39: Utopia', attack: 2500, defense: 2000, joint: HOLOGRAM_JOINTS.WEAPON, landmarks: ['utopia-green-chest-jewel','sword-utopia-right-broad-white-blade','utopia-left-sword-white-blade','utopia-pink-39-stroke-9'], forbidden: /^(?:shield|wing-|helmet-crest)/ },
  { id: '72989439', name: 'Black Luster Soldier - Envoy of the Beginning', attack: 3000, defense: 2500, joint: HOLOGRAM_JOINTS.WEAPON, landmarks: ['bls-tall-center-navy-crown','bls-long-black-gold-shield','sword-bls-broad-silver-blade','bls-central-red-chest-jewel'], forbidden: /^(?:wing-|shield-boss|helmet-crest)/ },
  { id: '14558127', name: 'Ash Blossom & Joyous Spring', attack: 0, defense: 1800, joint: HOLOGRAM_JOINTS.STAFF, landmarks: ['ash-orange-hair-bow-left','ash-flared-white-kimono-skirt','mage-glove-1-ash-large-sleeve','ash-soft-pink-neck-scarf'], forbidden: /^(?:staff|sword|wing-|pointed-hat|armored-torso)/ }
];
const release = model => model.children.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });

for (const card of CARDS) {
  test(`${card.name}: exact CDB identity and downloaded original JPEGs, including padded ID`, async () => {
    const rows = JSON.parse(await readFile(new URL('../public/native/card-data.json', import.meta.url))).rows;
    const row = rows.find(row => row[0] === Number(card.id));
    assert.ok(row && (row[4] & 1));
    assert.equal(row[11], card.name);
    assert.equal(row[5], card.attack); assert.equal(row[6], card.defense);
    const profile = resolveHologramMonsterProfile({ id: `0${card.id}`, name: 'localized public alias' });
    assert.equal(profile.id, POPULAR_STAPLE_PROFILES[card.id].id);
    assert.equal(profile.anatomy, POPULAR_STAPLE_PROFILES[card.id].anatomy);
    assert.ok(Object.isFrozen(POPULAR_STAPLE_PROFILES) && Object.isFrozen(POPULAR_STAPLE_PROFILES[card.id]));
    const art = POPULAR_STAPLE_REFERENCE_ART.find(entry => entry.cardId === Number(card.id));
    for (const kind of ['full','cropped','small']) {
      const file = await readFile(new URL(`../public${art[kind].assetPath}`, import.meta.url));
      assert.deepEqual([...file.subarray(0,3)], [255,216,255]);
      assert.equal(file.length, art[kind].bytes);
      assert.equal(createHash('sha256').update(file).digest('hex'), art[kind].sha256);
      assert.ok(art[kind].width > 100 && art[kind].height > 100);
    }
  });
  test(`${card.name}: closed source landmarks, bounded batches and coherent moving limbs in attack/defense`, () => {
    for (const defense of [false,true]) {
      const model = createHologramMonsterModel({ id: card.id }, { defense });
      assert.ok(card.landmarks.every(name => model.userData.partNames.includes(name)));
      assert.equal(model.userData.partNames.some(name => card.forbidden.test(name)), false);
      assert.ok(model.userData.meshCount <= 5 && model.userData.triangleCount <= 6000);
      const size = new Box3().setFromObject(model).getSize(new Vector3());
      assert.ok(size.x > .5 && size.y > 1.5 && size.z > .3);
      const jointValues = new Set(model.children.flatMap(mesh => [...mesh.geometry.attributes.hologramJoint.array]));
      assert.ok(jointValues.has(card.joint));
      const buffers = model.children.map(mesh => ({ position: mesh.geometry.attributes.position.array, version: mesh.geometry.attributes.position.version, color: mesh.geometry.attributes.color.array }));
      for (const mesh of model.children) {
        assert.equal(mesh.material.map, null);
        assert.equal(mesh.geometry.attributes.position.count, mesh.geometry.attributes.hologramJoint.count);
        for (const name of ['position','normal','color']) assert.ok([...mesh.geometry.attributes[name].array].every(Number.isFinite));
      }
      for (const kind of ['attack','casting','summon','recoil']) {
        const action = createHologramPoseAnimation(model, { kind });
        assert.equal(action.update(.4), true);
        model.children.forEach((mesh,i) => { assert.equal(mesh.geometry.attributes.position.array,buffers[i].position); assert.equal(mesh.geometry.attributes.position.version,buffers[i].version); assert.equal(mesh.geometry.attributes.color.array,buffers[i].color); });
        assert.equal(action.update(1),false); action.dispose();
      }
      const reduced = createHologramPoseAnimation(model,{reducedMotion:true});
      assert.equal(reduced.update(.4),false); reduced.dispose();
      const resources = new Set(); model.traverse(mesh => { for (const resource of [mesh.geometry,mesh.material,mesh.customDepthMaterial,mesh.customDistanceMaterial]) if (resource) resources.add(resource); });
      let count=0; resources.forEach(resource => resource.addEventListener('dispose',()=>count++));
      release(model); assert.equal(count,resources.size); assert.equal(model.userData.poseRig.disposed,true);
    }
  });
}

test('popular models preserve scene reuse and remove concealed replacements before reading identity', () => {
  const manager = new RealDuelScene3D({ documentRef: { hidden: false }, windowRef: { matchMedia: () => ({ matches: true }) } });
  manager.scene = new Scene(); manager.camera = new PerspectiveCamera(); manager.renderer = { render() {} }; manager.active = true;
  for (const card of CARDS) {
    const descriptor={ key:`public-${card.id}`,owner:'opponent',zoneType:'main',zoneIndex:1,faceUp:true,position:'attack',card:{ id:card.id } };
    manager.updateFieldHolograms([descriptor]);
    const original=manager._fieldHolograms.get(descriptor.key).object;
    manager.updateFieldHolograms([descriptor]);assert.equal(manager._fieldHolograms.get(descriptor.key).object,original);
    let identityReads=0,disposals=0;original.children.forEach(mesh=>mesh.geometry.addEventListener('dispose',()=>disposals++));
    manager.updateFieldHolograms([{owner:'opponent',faceUp:false,get card(){identityReads++;throw new Error('concealed identity');}}]);
    assert.equal(identityReads,0);assert.equal(disposals,original.children.length);assert.equal(manager.scene.children.length,0);
  }
});
