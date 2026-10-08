import test from 'node:test';
import assert from 'node:assert/strict';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { createCombatVisualEffect } from '../src/ui/CombatVisualEffects.js';

const card = { id: '23995346', name: 'Blue-Eyes Ultimate Dragon', type: 'Fusion Monster',
  uid: 'private-native-instance', privateMaterials: ['not-public'] };
const visual = (summonType, extra = {}) => createPublicCombatVisual({
  type: 'summon', target: 'player', zoneType: 'main', zoneIndex: 2,
  nativeSummonConfirmed: true, summonType, card, ...extra
}, {}, () => [0, 1, 0]);

test('successful native procedure controls its visual, including revived Fusion and face-down suppression', () => {
  assert.equal(visual('fusion').profile, 'fusion-summon');
  assert.equal(visual('special').profile, 'special-summon');
  assert.equal(visual('normal').profile, 'summon');
  assert.equal(visual('unknown').profile, 'summon');
  assert.equal(visual('fusion', { faceDown: true }), null);
  const revived = createPublicCombatVisual({ type: 'reborn-cinematic', target: 'player',
    card, zoneType: 'main', zoneIndex: 0 }, {});
  assert.equal(revived.profile, 'revival');
  for (const result of [visual('fusion'), visual('special'), revived]) {
    assert.equal(JSON.stringify(result).includes('private-native-instance'), false);
    assert.equal(JSON.stringify(result).includes('not-public'), false);
  }
});

test('seven summon procedures animate distinct bounded motifs and release every resource once', () => {
  const motifs = {
    fusion: 'fusion-converging-energy-0', synchro: 'synchro-tuner-ring-0',
    xyz: 'xyz-dark-convergence', link: 'link-hexagonal-gate-0',
    ritual: 'ritual-consecration-ring-0', pendulum: 'pendulum-swinging-energy-0',
    flip: 'flip-public-reveal-panel'
  };
  const shapes = new Set();
  for (const [procedure, motif] of Object.entries(motifs)) {
    const effect = createCombatVisualEffect(visual(procedure));
    shapes.add(effect.profile.shape);
    assert.ok(effect.group.getObjectByName(motif), procedure);
    assert.ok(effect.group.children.length <= 20, `${procedure}: transient effect budget`);
    const resources = new Set();
    effect.group.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) {
        resources.add(object.material);
        assert.equal(object.material.map, null, 'No card texture enters the effect');
      }
    });
    const counts = new Map([...resources].map(resource => [resource, 0]));
    for (const resource of resources) resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
    for (const progress of [0, .2, .5, .8, 1]) {
      effect.update(progress);
      effect.group.traverse(object => {
        assert.ok([...object.position.toArray(), ...object.scale.toArray(), ...object.rotation.toArray().slice(0, 3)].every(Number.isFinite));
      });
    }
    assert.equal(effect.dispose(), true);
    assert.equal(effect.dispose(), false);
    for (const count of counts.values()) assert.equal(count, 1, procedure);
    assert.equal(effect.group.children.length, 0);
  }
  assert.equal(shapes.size, 7);
});
