import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';
import { Box3, Color, PerspectiveCamera, Scene, Vector3 } from 'three';
import { STARTER_CARDS } from '../src/cards.js';
import { SOLO_MISSIONS } from '../src/content/SoloCampaign.js';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { createHologramPoseAnimation, HOLOGRAM_JOINTS } from '../src/ui/HologramPoseAnimation.js';
import { resolveCombatVisualProfile, resolveHologramMonsterProfile, SUPPORTED_PROCEDURAL_MODEL_FAMILIES } from '../src/ui/CombatVisualProfiles.js';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

const PARTICIPANTS = [
  { id: '5053103', printed: '05053103', anatomy: 'red-armored-bull', attack: 'blade', joint: HOLOGRAM_JOINTS.WEAPON, landmarks: ['ox-long-brown-muzzle', 'ox-red-shoulder-pauldron-1', 'ox-long-swept-gold-horn--1', 'axe-ox-double-swept-silver-blade'], colors: ['#76503a', '#d62031', '#c8b337', '#2c6541'], absent: /^(?:sword-|shield|helmet-crest)/ },
  { id: '66602787', printed: '66602787', anatomy: 'asymmetric-jester', attack: 'dark-magic', joint: HOLOGRAM_JOINTS.STAFF, landmarks: ['clown-white-left-face-mask', 'clown-yellow-star-over-left-eye', 'clown-wide-white-grinning-teeth', 'clown-purple-left-bare-hat-point', 'clown-gold-right-crown-tip-bell', 'clown-casting-curled-long-finger-1-2'], colors: ['#17799c', '#755396', '#dbe4dc', '#dc3b4a'], absent: /^(?:staff|pointed-hat|clown-gold-left)/ },
  { id: '28279543', printed: '28279543', anatomy: 'olive-winged-serpent', attack: 'dragon-burst', joint: HOLOGRAM_JOINTS.RIGHT_WING, landmarks: ['curse-continuous-looped-serpent-trunk', 'curse-raised-long-nasal-plate', 'curse-red-segmented-ventral-plate-10', 'wing-1-curse-sculpted-swept-olive-membrane', 'jaw-curse-curved-hooked-lower-mandible'], colors: ['#879451', '#d6d98b', '#dc4525', '#273d25'], absent: /^(?:foreleg|hindleg|dragon-(?:thigh|foot|breast|belly))/ }
];
const normalize = id => String(id).replace(/^0+(?=\d)/, '');
const release = model => model.children.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
function containsColor(model, hex) {
  const color = new Color(hex);
  return model.children.some(mesh => {
    const values = mesh.geometry.attributes.color.array;
    for (let i = 0; i < values.length; i += 3) if (Math.abs(values[i] - color.r) < 1e-5 && Math.abs(values[i + 1] - color.g) < 1e-5 && Math.abs(values[i + 2] - color.b) < 1e-5) return true;
    return false;
  });
}

test('three new silhouettes belong to playable starter cards and actual campaign decks, including padded Battle Ox', async () => {
  assert.equal(SUPPORTED_PROCEDURAL_MODEL_FAMILIES.length, 17);
  for (const participant of PARTICIPANTS) {
    const template = STARTER_CARDS.find(card => normalize(card.id) === participant.id);
    assert.ok(template, participant.id);
    assert.ok(SOLO_MISSIONS.some(mission => [...mission.playerDeck, ...mission.opponentDeck].some(id => normalize(id) === participant.id)));
    const profile = resolveHologramMonsterProfile({ ...template, name: 'localized public alias', uid: 'private-uid-unused' });
    assert.equal(profile.anatomy, participant.anatomy);
    assert.equal(resolveHologramMonsterProfile({ id: participant.printed }).id, profile.id);
    assert.equal(resolveCombatVisualProfile({ kind: 'attack', card: template }).id, participant.attack);
    assert.equal(JSON.stringify(profile).includes('private-uid-unused'), false);
    await access(new URL(`../public${profile.referenceArt}`, import.meta.url));
  }
});

test('source motifs have real volume and stable palettes within five batches and 6000 triangles in attack and defense', () => {
  for (const p of PARTICIPANTS) for (const defense of [false, true]) {
    const model = createHologramMonsterModel({ id: p.printed }, { defense });
    assert.ok(p.landmarks.every(name => model.userData.partNames.includes(name)), p.id);
    assert.equal(model.userData.partNames.some(name => p.absent.test(name)), false);
    for (const hex of p.colors) assert.ok(containsColor(model, hex), `${p.id}: ${hex}`);
    assert.ok(model.userData.meshCount <= 5 && model.userData.triangleCount <= 6000);
    const size = new Box3().setFromObject(model).getSize(new Vector3());
    assert.ok(size.x > 1 && size.y > 1 && size.z > .6, `${p.id}: real depth`);
    for (const mesh of model.children) {
      assert.equal(mesh.material.map, null);
      assert.equal(mesh.material.vertexColors, true);
      assert.equal(mesh.geometry.attributes.position.count, mesh.geometry.attributes.hologramJoint.count);
      assert.ok([...mesh.geometry.attributes.position.array, ...mesh.geometry.attributes.normal.array, ...mesh.geometry.attributes.color.array].every(Number.isFinite));
    }
    assert.equal(model.userData.partNames.includes('defense-barrier'), defense);
    release(model);
  }
});

test('gripping arms, open casting hands and serpent wings share their coherent moving GPU joints without uploads', () => {
  for (const p of PARTICIPANTS) {
    const model = createHologramMonsterModel({ id: p.id });
    const allJoints = model.children.flatMap(mesh => [...mesh.geometry.attributes.hologramJoint.array]);
    assert.ok(allJoints.filter(value => value === p.joint).length > 250, p.id);
    if (p.id === '28279543') for (const joint of [HOLOGRAM_JOINTS.LEFT_WING, HOLOGRAM_JOINTS.RIGHT_WING, HOLOGRAM_JOINTS.JAW]) assert.ok(allJoints.includes(joint));
    const positions = model.children.map(mesh => ({ array: mesh.geometry.attributes.position.array, version: mesh.geometry.attributes.position.version }));
    const colors = model.children.map(mesh => mesh.geometry.attributes.color.array);
    for (const kind of ['attack', 'casting', 'recoil', 'summon']) {
      const action = createHologramPoseAnimation(model, { kind });
      for (const progress of [0, .25, .4, .75]) {
        assert.equal(action.update(progress), true);
        assert.ok([...model.userData.poseRig.pose.value.toArray(), ...model.userData.poseRig.life.value.toArray()].every(Number.isFinite));
      }
      model.children.forEach((mesh, index) => {
        assert.equal(mesh.geometry.attributes.position.array, positions[index].array);
        assert.equal(mesh.geometry.attributes.position.version, positions[index].version);
        assert.equal(mesh.geometry.attributes.color.array, colors[index]);
      });
      assert.equal(action.update(1), false);
      assert.deepEqual(model.userData.poseRig.pose.value.toArray(), [0, 0, 0, 0]);
      action.dispose();
    }
    const reduced = createHologramPoseAnimation(model, { reducedMotion: true });
    assert.equal(reduced.update(.4), false);
    assert.deepEqual(model.userData.poseRig.pose.value.toArray(), [0, 0, 0, 0]);
    reduced.dispose();
    const resources = new Set();
    model.traverse(mesh => { for (const value of [mesh.geometry, mesh.material, mesh.customDepthMaterial, mesh.customDistanceMaterial]) if (value) resources.add(value); });
    let disposed = 0;
    resources.forEach(value => value.addEventListener('dispose', () => disposed++));
    release(model);
    assert.equal(disposed, resources.size);
    assert.equal(model.userData.poseRig.disposed, true);
  }
});

test('new public creatures reuse scene objects and a concealed replacement reads no identity and releases all volumes', () => {
  const manager = new RealDuelScene3D({ documentRef: { hidden: false }, windowRef: { matchMedia: () => ({ matches: true }) } });
  manager.scene = new Scene(); manager.camera = new PerspectiveCamera(); manager.renderer = { render() {} }; manager.active = true;
  for (const p of PARTICIPANTS) {
    const publicDescriptor = { key: `public-${p.id}`, owner: 'opponent', zoneType: 'main', zoneIndex: 1, faceUp: true, position: 'attack', card: { id: p.printed } };
    manager.updateFieldHolograms([publicDescriptor]);
    const first = manager._fieldHolograms.get(publicDescriptor.key).object;
    assert.equal(first.userData.profile.anatomy, p.anatomy);
    manager.updateFieldHolograms([publicDescriptor]);
    assert.equal(manager._fieldHolograms.get(publicDescriptor.key).object, first);
    let disposed = 0; first.children.forEach(mesh => mesh.geometry.addEventListener('dispose', () => disposed++));
    let reads = 0;
    manager.updateFieldHolograms([{ owner: 'opponent', faceUp: false, get card() { reads++; throw new Error('concealed identity accessed'); } }]);
    assert.equal(reads, 0);
    assert.equal(disposed, first.children.length);
    assert.equal(manager._fieldHolograms.size, 0);
    assert.equal(manager.scene.children.length, 0);
  }
});
