import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, PerspectiveCamera, Scene, Vector3 } from 'three';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { resolveCombatVisualProfile, resolveHologramMonsterProfile } from '../src/ui/CombatVisualProfiles.js';
import { createCombatVisualEffect } from '../src/ui/CombatVisualEffects.js';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

function fixture({ reducedMotion = false } = {}) {
  let now = 0;
  let renders = 0;
  const pending = new Map();
  let sequence = 0;
  const documentRef = { hidden: false };
  const scene = new RealDuelScene3D({
    documentRef,
    windowRef: {
      performance: { now: () => now },
      matchMedia: () => ({ matches: reducedMotion }),
      requestAnimationFrame(callback) { pending.set(++sequence, callback); return sequence; },
      cancelAnimationFrame(handle) { pending.delete(handle); }
    }
  });
  scene.scene = new Scene();
  scene.camera = new PerspectiveCamera();
  scene.renderer = { render() { renders += 1; } };
  scene.active = true;
  return {
    scene, pending, documentRef,
    setNow(value) { now = value; },
    tick(value) {
      now = value;
      const [key, callback] = pending.entries().next().value;
      pending.delete(key);
      callback(value);
    },
    get renders() { return renders; }
  };
}

function descriptor(id, extra = {}) {
  return { key: `public-${id}`, owner: 'player', zoneType: 'main', zoneIndex: 1,
    faceUp: true, position: 'attack', card: { id }, ...extra };
}

test('iconic creatures have distinct silhouettes and attacks selected by canonical public identity', () => {
  const expected = [
    ['89631139', 'dragon', 'dragon-burst', 'dragon-horn-0-1'],
    ['74677422', 'dragon', 'dragon-flame', 'dragon-eye-0-1'],
    ['46986414', 'magician', 'dark-magic', 'staff-crystal'],
    ['91152256', 'warrior', 'blade', 'sword-blade'],
    ['70781052', 'fiend', 'lightning', 'rib-4'],
    ['40640057', 'kuriboh', 'impact', 'fur-tuft-33'],
    ['71625222', 'clock', 'time-magic', 'clock-minute'],
    ['63977008', 'machine', 'impact', 'gear-1']
  ];
  for (const [id, family, attack, detail] of expected) {
    const model = createHologramMonsterModel({ id, name: 'localized alias', imageUrl: 'private-unused.png' });
    assert.equal(model.userData.profile.family, family);
    assert.equal(resolveCombatVisualProfile({ card: { id } }).id, attack);
    assert.ok(model.userData.partNames.includes(detail));
    assert.ok(model.children.length <= 5, 'merged geometry keeps draw calls bounded');
    let triangles = 0;
    model.traverse(object => {
      if (!object.isMesh) return;
      assert.equal(object.material.map, null, 'models do not request card artwork or private URLs');
      triangles += object.geometry.attributes.position.count / 3;
      assert.ok([...object.geometry.attributes.position.array].every(Number.isFinite));
    });
    assert.ok(triangles < 6000, 'detail remains bounded for a full twelve-monster field');
    const size = new Box3().setFromObject(model).getSize(new Vector3());
    assert.ok(size.y > 1 && size.x > 1 && size.z > 0.5, 'the model has real volume');
    assert.equal(JSON.stringify(model.userData).includes('private-unused'), false);
  }
  const ultimate = createHologramMonsterModel({ id: '23995346' });
  assert.equal(ultimate.userData.partNames.filter(name => /^dragon-head-/.test(name)).length, 3);
  assert.equal(resolveHologramMonsterProfile({ race: 'Sea Serpent', attribute: 'WATER' }).family, 'aquatic');
});

test('field synchronization reuses models, honors position and releases changed or concealed creatures', () => {
  const { scene, pending } = fixture();
  const publicCard = { id: '89631139', race: 'Dragon', imageUrl: 'secret-url', uid: 'private-card-uid' };
  assert.deepEqual(scene.updateFieldHolograms([descriptor('89631139', { card: publicCard, worldPosition: [1, 0.7, 3] })]), { renderedKeys: ['public-89631139'] });
  const first = scene._fieldHolograms.get('public-89631139').object;
  assert.deepEqual(first.position.toArray(), [1, 0.7, 3]);
  assert.equal(first.rotation.y, Math.PI);
  let geometryDisposals = 0;
  first.traverse(value => value.geometry?.addEventListener('dispose', () => { geometryDisposals += 1; }));
  scene.updateFieldHolograms([descriptor('89631139', { worldPosition: [2, 0.7, 3] })]);
  assert.equal(scene._fieldHolograms.get('public-89631139').object, first);
  assert.equal(geometryDisposals, 0);
  scene.updateFieldHolograms([descriptor('89631139', { owner: 'opponent', position: 'defense' })]);
  const defense = scene._fieldHolograms.get('public-89631139').object;
  assert.notEqual(defense, first);
  assert.equal(geometryDisposals, first.children.length);
  assert.equal(defense.rotation.y, 0);
  assert.ok(defense.userData.partNames.includes('defense-barrier'));
  let hiddenReads = 0;
  const hidden = { owner: 'opponent', faceUp: false, get card() { hiddenReads += 1; throw new Error('private identity accessed'); } };
  scene.updateFieldHolograms([hidden]);
  assert.equal(hiddenReads, 0);
  assert.equal(scene._fieldHolograms.size, 0);
  assert.equal(scene.scene.children.length, 0);
  assert.equal(pending.size, 0, 'static models never start an idle render loop');
});

test('card effects use separate visual families for lightning, protective barriers, revival, typhoon and moon', () => {
  const expected = { '12580477': 'lightning', '44095762': 'shield', '83764718': 'revival', '05318639': 'typhoon', '14087893': 'moon' };
  for (const [id, profile] of Object.entries(expected)) {
    assert.equal(resolveCombatVisualProfile({ kind: 'activate', card: { id } }).id, profile);
    const effect = createCombatVisualEffect({ kind: 'activate', card: { id }, source: [1, 2, 3], target: [-1, 2, -3] });
    assert.equal(effect.profile.id, profile);
    assert.deepEqual(effect.group.position.toArray(), [1, 2, 3]);
    assert.ok(effect.group.children.length <= 18);
    effect.update(0.65);
    const positions = effect.group.getObjectByName('energy-sparks').geometry.attributes.position.array;
    assert.ok([...positions].every(Number.isFinite));
    let geometryDisposals = 0;
    let materialDisposals = 0;
    const materials = new Set();
    effect.group.traverse(value => {
      value.geometry?.addEventListener('dispose', () => { geometryDisposals += 1; });
      if (value.material) materials.add(value.material);
    });
    materials.forEach(value => value.addEventListener('dispose', () => { materialDisposals += 1; }));
    const meshCount = effect.group.children.length;
    effect.dispose();
    assert.equal(geometryDisposals, meshCount);
    assert.equal(materialDisposals, materials.size);
    assert.equal(effect.dispose(), false);
    assert.equal(effect.update(0.5), false);
  }
});

test('combat owns RAF only through its final frame and uses existing public monster coordinates', () => {
  const harness = fixture();
  harness.scene.updateFieldHolograms([descriptor('89631139', { worldPosition: [3, 0.7, 4] })]);
  harness.scene.playCombatEffect({ kind: 'attack', card: { id: '89631139' }, source: { owner: 'player', zoneIndex: 1 }, target: { owner: 'opponent', direct: true } });
  assert.equal(harness.scene.running, true);
  assert.equal(harness.pending.size, 1);
  assert.deepEqual(harness.scene._combatEffects[0].group.position.toArray(), [3, 2.2, 4]);
  harness.tick(350);
  assert.equal(harness.pending.size, 1);
  harness.tick(1000);
  assert.equal(harness.scene._combatEffects.length, 0);
  assert.equal(harness.pending.size, 0);
  assert.equal(harness.scene.running, false);
  assert.equal(harness.scene.scene.children.length, 1, 'the effect leaves the persistent creature untouched');
});

test('attacks aim above board centers while absolute endpoints and spell locations remain explicit', () => {
  const { scene } = fixture();
  assert.deepEqual(scene._resolveCombatEndpoint({ worldPosition: [1, 0.62, 2] }, 'player', true), [1, 2.12, 2]);
  assert.deepEqual(scene._resolveCombatEndpoint([1, 0.62, 2], 'player', true), [1, 0.62, 2]);
  assert.deepEqual(scene._resolveCombatEndpoint({ worldPosition: [1, 0.62, 2] }, 'player', false), [1, 0.62, 2]);
  assert.deepEqual(scene._resolveCombatEndpoint({ owner: 'opponent', direct: true }, 'player', true), [0, 3.1, -10.7]);
});

test('hidden tabs freeze effects, view deactivation frees them and reduced motion never requests animation', () => {
  const harness = fixture();
  harness.scene.playCombatEffect({ kind: 'activate', card: { id: '12580477' } });
  harness.tick(200);
  harness.documentRef.hidden = true;
  harness.scene._boundVisibility();
  assert.equal(harness.pending.size, 0);
  harness.setNow(1200);
  harness.documentRef.hidden = false;
  harness.scene._boundVisibility();
  assert.equal(harness.scene._combatEffects[0].startedAt, 1000);
  harness.tick(1300);
  assert.equal(harness.scene._combatEffects.length, 1);
  harness.scene.deactivate();
  assert.equal(harness.scene._combatEffects.length, 0);
  assert.equal(harness.pending.size, 0);
  assert.equal(harness.scene.scene.children.length, 0);
  const reduced = fixture({ reducedMotion: true });
  assert.equal(reduced.scene.playCombatEffect({ kind: 'attack', card: { id: '89631139' } }), false);
  assert.equal(reduced.pending.size, 0);
  assert.equal(reduced.scene._combatEffects.length, 0);
  reduced.scene.updateFieldHolograms([descriptor('89631139')]);
  assert.equal(reduced.scene._fieldHolograms.size, 1, 'reduced motion keeps static geometry visible');
});

test('concurrent effects are bounded and duel completion releases GPU resources', () => {
  const harness = fixture();
  for (let i = 0; i < 12; i += 1) harness.scene.playCombatEffect({ kind: 'activate', card: { id: '12580477' } });
  assert.equal(harness.scene._combatEffects.length, 6);
  assert.equal(harness.scene.scene.children.length, 6);
  assert.equal(harness.pending.size, 1);
  harness.scene.updatePublicSummary({ duelEnded: true });
  assert.equal(harness.scene._combatEffects.length, 0);
  assert.equal(harness.scene.scene.children.length, 0);
  assert.equal(harness.pending.size, 0);
  assert.equal(harness.scene.playCombatEffect({ kind: 'attack' }), false);
});

test('a new effect during an explicit pause starts now while the earlier effect resumes its frozen clock', () => {
  const harness = fixture();
  harness.scene.playCombatEffect({ kind: 'activate', card: { id: '12580477' } });
  harness.tick(200);
  harness.scene.pause();
  harness.setNow(1200);
  harness.scene.playCombatEffect({ kind: 'activate', card: { id: '83764718' } });
  assert.equal(harness.scene._combatEffects[0].startedAt, 1000);
  assert.equal(harness.scene._combatEffects[1].startedAt, 1200);
  harness.tick(1800);
  assert.equal(harness.scene._combatEffects.length, 1);
  harness.tick(2400);
  assert.equal(harness.scene._combatEffects.length, 0);
  assert.equal(harness.pending.size, 0);
});
