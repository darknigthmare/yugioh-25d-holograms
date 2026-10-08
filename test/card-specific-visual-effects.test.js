import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCombatVisualEffect } from '../src/ui/CombatVisualEffects.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

const attacks = [
  ['89631139', 'blue-eyes-stream', 'blue-eyes-breath-helix--1'],
  ['74677422', 'red-eyes-plume', 'red-eyes-burning-tongues'],
  ['91152256', 'celtic-sword', 'celtic-filled-sword-sweep'],
  ['70781052', 'skull-forks', 'skull-forked-lightning-ribbon-0']
];
const effectFor = (id, extra = {}) => createCombatVisualEffect({ kind: 'attack', card: { id },
  source: [-4, 2, 0], target: [4, 2, 0], ...extra });

test('known attacks have different silhouettes and real travel from their public source to target', () => {
  const shapes = new Set();
  for (const [id, shape, motif] of attacks) {
    const effect = effectFor(id);
    assert.equal(effect.profile.shape, shape);
    assert.equal(effect.profile.sourceCardId, id);
    assert.equal(effect.profile.referenceArt, `/cards/cropped/${id}.jpg`);
    assert.ok(effect.group.getObjectByName(motif));
    assert.deepEqual(effect.group.position.toArray(), [-4, 2, 0]);
    shapes.add(shape);
    effect.update(.3); effect.group.updateMatrixWorld(true);
    const before = effect.group.getObjectByName(motif).matrixWorld.elements.slice();
    effect.update(.7); effect.group.updateMatrixWorld(true);
    const object = effect.group.getObjectByName(motif);
    // Instanced flames evolve their matrices; ribbons reveal a growing path;
    // a sword actually sweeps. A renamed or recolored generic mesh fails here.
    if (object.isInstancedMesh) assert.ok([...object.instanceMatrix.array].some(value => Math.abs(value) > 1));
    else if (object.geometry.drawRange.count !== Infinity) assert.ok(object.geometry.drawRange.count > 12);
    else assert.notDeepEqual(object.matrixWorld.elements, before);
    effect.dispose();
  }
  assert.equal(shapes.size, 4);
  const fallback = effectFor('99999999');
  assert.equal(fallback.profile.shape, 'impact');
  fallback.dispose();
});

test('negation breaks a seal instead of rendering a protective dome, and destruction fragments really separate', () => {
  const negated = effectFor('12580477', { kind: 'negate' });
  assert.equal(negated.profile.shape, 'broken-seal');
  assert.ok(negated.group.getObjectByName('negation-cross-1'));
  assert.equal(negated.group.getObjectByName('protective-dome'), undefined);
  const destroyed = effectFor('89631139', { kind: 'destroy', target: [-4, 2, 0] });
  const shards = destroyed.group.getObjectByName('destruction-fractured-light-shards');
  destroyed.update(.2); const early = shards.instanceMatrix.array.slice();
  destroyed.update(.75); assert.notDeepEqual(shards.instanceMatrix.array, early);
  assert.ok(shards.count <= 24);
  for (const effect of [negated, destroyed]) effect.dispose();
});

test('a declared Monster Reborn shows a symbol; only a confirmed revival payload raises an apparition', () => {
  const declaration = effectFor('83764718', { kind: 'activate' });
  assert.equal(declaration.profile.id, 'revival');
  assert.ok(declaration.group.getObjectByName('revival-ankh-loop'));
  assert.equal(declaration.group.getObjectByName('confirmed-revival-light-column'), undefined);
  const visual = createPublicCombatVisual({ type: 'summon', target: 'player', zoneType: 'main', zoneIndex: 0,
    nativeSummonConfirmed: true, nativeRevivalConfirmed: true, summonType: 'special',
    revivalFrom: { zoneType: 'graveyard', owner: 'opponent', zoneIndex: 0 },
    card: { id: '89631139', type: 'Normal Monster', privateInstance: 'NEVER-VISIBLE' }
  }, {}, () => [0, 0, 0]);
  assert.equal(visual.profile, 'revival');
  const revived = createCombatVisualEffect(visual);
  assert.ok(revived.group.getObjectByName('confirmed-revival-light-column'));
  revived.update(.2); const before = revived.group.getObjectByName('revival-ankh-stem').position.y;
  revived.update(.7); assert.ok(revived.group.getObjectByName('revival-ankh-stem').position.y > before + .5);
  assert.doesNotMatch(JSON.stringify(visual), /NEVER-VISIBLE/);
  for (const effect of [declaration, revived]) effect.dispose();
});

test('concealed identities and reduced motion never create geometry or read private identity getters', () => {
  const hidden = { isSetFaceDown: true, get id() { throw new Error('Private identity read'); } };
  assert.equal(createPublicCombatVisual({ type: 'attack-monster', attackerSide: 'player',
    atkZoneType: 'main', atkZoneIndex: 0, defZoneType: 'main', defZoneIndex: 0, card: hidden }, {}), null);
  for (const options of [{ card: hidden }, { hidden: true, get card() { throw new Error('Private payload read'); } },
    { reducedMotion: true, get card() { throw new Error('Suppressed payload read'); } }]) {
    const effect = createCombatVisualEffect(options);
    assert.equal(effect.group.children.length, 0);
    assert.equal(effect.group.visible, false);
    assert.equal(effect.update(.5), false);
    assert.equal(effect.dispose(), true); assert.equal(effect.dispose(), false);
  }
  const scene = new RealDuelScene3D({ windowRef: { matchMedia: () => ({ matches: true }) } });
  scene.active = true; scene.scene = new THREE.Scene();
  assert.equal(scene.playCombatEffect({ kind: 'attack', card: { id: '89631139' } }), false);
  assert.equal(scene.scene.children.length, 0);
  assert.equal(scene._combatEffects.length, 0);
  assert.equal(scene._frameHandle, null);
});

test('finite bounded effects release shared geometry, materials and instance buffers exactly once', () => {
  const cases = [...attacks.map(([id]) => ({ kind: 'attack', card: { id } })),
    { kind: 'negate', card: { id: '12580477' } }, { kind: 'destroy', card: { id: '89631139' } },
    { kind: 'summon', profile: 'revival', card: { id: '89631139' } }];
  for (const options of cases) {
    for (const target of [[4, 2, 0], [-4, 2, 0], [-4, -3, 0]]) {
      const effect = createCombatVisualEffect({ ...options, source: [-4, 2, 0], target });
      assert.ok(effect.group.children.length <= 12);
      const resources = new Set();
      effect.group.traverse(object => {
        if (object.geometry) {
          resources.add(object.geometry);
          for (const attribute of Object.values(object.geometry.attributes)) assert.ok([...attribute.array].every(Number.isFinite));
        }
        if (object.material) { resources.add(object.material); assert.equal(object.material.map, null); }
        if (object.isInstancedMesh) resources.add(object);
      });
      const counts = new Map([...resources].map(resource => [resource, 0]));
      for (const resource of resources) resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
      for (const progress of [NaN, -1, 0, .2, .5, .8, 1, Infinity]) {
        effect.update(progress); effect.group.updateMatrixWorld(true);
        effect.group.traverse(object => {
          assert.ok(object.matrixWorld.elements.every(Number.isFinite));
          if (object.instanceMatrix) assert.ok([...object.instanceMatrix.array].every(Number.isFinite));
        });
      }
      const parent = new THREE.Scene(); parent.add(effect.group);
      assert.equal(effect.dispose(), true); assert.equal(effect.dispose(), false);
      assert.equal(effect.group.parent, null); assert.equal(effect.group.children.length, 0);
      assert.equal(effect.update(.5), false);
      for (const count of counts.values()) assert.equal(count, 1, effect.profile.shape);
    }
  }
});
