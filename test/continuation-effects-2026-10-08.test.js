import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Scene } from 'three';
import { createCombatVisualEffect } from '../src/ui/CombatVisualEffects.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

const attacks = [
  ['46986414', 'magician-ring-cannon', 'dark-magician-travelling-spell-rings'],
  ['38033121', 'magician-girl-star-spiral', 'magician-girl-orbiting-five-point-stars'],
  ['32452818', 'beaver-sword-charge', 'beaver-pointed-sword'],
  ['97590747', 'genie-fist-vortex', 'la-jinn-paired-fists-and-knuckles']
];

for (const [id, shape, motif] of attacks) {
  test(`public attack ${id} selects its real silhouette, travels, and releases all resources once`, () => {
    for (const target of [[4, 2, 0], [-4, 2, 0], [-4, -3, 0], [-4, 2, -8]]) {
      const effect = createCombatVisualEffect({ kind: 'attack', card: { id }, source: [-4, 2, 0], target });
      assert.equal(effect.profile.shape, shape);
      assert.equal(effect.profile.sourceCardId, id);
      assert.equal(effect.profile.referenceArt, `/cards/cropped/${id}.jpg`);
      const object = effect.group.getObjectByName(motif);
      assert.ok(object);
      effect.update(.22); effect.group.updateMatrixWorld(true);
      const before = [...(object.instanceMatrix?.array || object.matrixWorld.elements)];
      effect.update(.78); effect.group.updateMatrixWorld(true);
      const after = [...(object.instanceMatrix?.array || object.matrixWorld.elements)];
      // Zero travel still grows the charge; directional paths must move.
      if (target.some((v, i) => v !== [-4, 2, 0][i])) assert.notDeepEqual(after, before);
      const resources = new Map();
      effect.group.traverse(item => {
        for (const resource of [item.geometry, item.material, item.isInstancedMesh ? item : null]) {
          if (resource && !resources.has(resource)) {
            resources.set(resource, 0);
            resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
          }
        }
        if (item.geometry) for (const attr of Object.values(item.geometry.attributes)) assert.ok([...attr.array].every(Number.isFinite));
        if (item.material) assert.equal(item.material.map, null);
      });
      for (const progress of [NaN, -1, 0, .22, .5, .78, 1, Infinity]) {
        effect.update(progress); effect.group.updateMatrixWorld(true);
        effect.group.traverse(item => {
          assert.ok(item.matrixWorld.elements.every(Number.isFinite));
          if (item.instanceMatrix) assert.ok([...item.instanceMatrix.array].every(Number.isFinite));
        });
      }
      assert.ok(effect.group.children.length <= 10);
      const scene = new Scene(); scene.add(effect.group);
      assert.equal(effect.dispose(), true); assert.equal(effect.dispose(), false);
      assert.equal(effect.update(.5), false); assert.equal(effect.group.parent, null);
      assert.equal(effect.group.children.length, 0);
      for (const count of resources.values()) assert.equal(count, 1);
    }
  });
}

test('four new attacks remain explicit public mappings, with generic effects and explicit profiles preserved', () => {
  for (const [id, shape] of attacks) {
    const options = { card: { id }, source: [0, 2, 0], target: [0, 2, -8] };
    const normalized = createCombatVisualEffect({ ...options, kind: 'attack', card: { id: `000${id}` } });
    assert.equal(normalized.profile.shape, shape); normalized.dispose();
    const declaration = createCombatVisualEffect({ ...options, kind: 'activate' });
    assert.notEqual(declaration.profile.shape, shape); declaration.dispose();
    const explicit = createCombatVisualEffect({ ...options, kind: 'attack', profile: 'impact' });
    assert.equal(explicit.profile.shape, 'impact'); explicit.dispose();
  }
});

test('the actual scene manager uses all four new factories and cancels only the confirmed matching attack', () => {
  const pending = new Map(); let frame = 0;
  const scene = new RealDuelScene3D({ documentRef: { hidden: false }, windowRef: {
    performance: { now: () => 0 }, matchMedia: () => ({ matches: false }),
    requestAnimationFrame(callback) { pending.set(++frame, callback); return frame; },
    cancelAnimationFrame(handle) { pending.delete(handle); }
  } });
  scene.active = true; scene.scene = new Scene();
  for (const [zoneIndex, [id, shape, motif]] of attacks.entries()) {
    const event = { type: 'attack-monster', attackerSide: 'player', atkZoneType: 'main', atkZoneIndex: zoneIndex,
      defZoneType: 'main', defZoneIndex: zoneIndex, card: { id, internalUid: 'DO-NOT-FORWARD' } };
    const visual = createPublicCombatVisual(event, {}, ref => [ref.zoneIndex, .5, ref.owner === 'player' ? 4 : -4]);
    assert.equal(scene.playCombatEffect(visual), true);
    const effect = scene._combatEffects.at(-1);
    assert.equal(effect.profile.shape, shape); assert.ok(effect.group.getObjectByName(motif));
    assert.doesNotMatch(JSON.stringify(visual), /DO-NOT-FORWARD/);
  }
  const [first, ...retained] = scene._combatEffects;
  const disposal = new Map();
  first.group.traverse(item => {
    for (const resource of [item.geometry, item.material, item.isInstancedMesh ? item : null]) {
      if (resource && !disposal.has(resource)) {
        disposal.set(resource, 0); resource.addEventListener('dispose', () => disposal.set(resource, disposal.get(resource) + 1));
      }
    }
  });
  const negate = createPublicCombatVisual({ type: 'attack-negated', nativeAttackNegated: true,
    attackerSide: 'player', atkZoneType: 'main', atkZoneIndex: 0, card: { id: attacks[0][0] } }, {}, () => [0, 2, 4]);
  scene.playCombatEffect(negate);
  assert.equal(scene._combatEffects.includes(first), false);
  assert.equal(first.group.parent, null);
  assert.ok(retained.every(effect => scene._combatEffects.includes(effect)));
  for (const count of disposal.values()) assert.equal(count, 1);
  scene.clearCombatEffects(); scene.pause();
  assert.equal(scene._combatEffects.length, 0); assert.equal(pending.size, 0);
});

test('new mappings cannot inspect concealed identities and allocate nothing in reduced motion', () => {
  for (const [id] of attacks) {
    let reads = 0;
    const concealed = { isSetFaceDown: true, get id() { reads += 1; throw Error('Concealed identity'); } };
    for (const options of [{ card: concealed }, { hidden: true, get card() { reads += 1; throw Error('Hidden payload'); } },
      { reducedMotion: true, get card() { reads += 1; throw Error('Suppressed payload'); } }]) {
      const suppressed = createCombatVisualEffect(options);
      assert.ok(suppressed.group instanceof Group); assert.equal(suppressed.group.children.length, 0);
      assert.equal(suppressed.update(.5), false); suppressed.dispose();
    }
    assert.equal(reads, 0, id);
  }
});
