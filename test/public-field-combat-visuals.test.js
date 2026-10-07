import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { createCombatVisualEffect } from '../src/ui/CombatVisualEffects.js';
import { RealDuelView } from '../src/ui/RealDuelView.js';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

const CASES = [
  { type: 'sanctuary-protection-cinematic', id: '56433456', profile: 'sanctuary-protection', duration: 900,
    kind: 'shield', poseKind: 'casting', mesh: 'sanctuary-golden-barrier' },
  { type: 'skyscraper-boost-cinematic', id: '63035430', profile: 'skyscraper-boost', duration: 1000,
    kind: 'activate', poseKind: 'attack', mesh: 'skyscraper-boost-arrow-5' },
  { type: 'ancient-forest-destruction-cinematic', id: '87624166', profile: 'ancient-forest-destruction', duration: 950,
    kind: 'destroy', poseKind: 'recoil', mesh: 'ancient-forest-binding-root-4' }
];

function position(ref) {
  const sign = ref.owner === 'player' ? 1 : -1;
  return ref.zoneType === 'field' ? [-8 * sign, .62, 7 * sign]
    : [ref.zoneIndex * 2, .62, ref.zoneType === 'extra' ? 0 : 3 * sign];
}

function payload(entry, sourceSide = 'player', overrides = {}) {
  return {
    type: entry.type, sourceSide, sourceZoneType: 'field', sourceZoneIndex: 0,
    target: sourceSide === 'player' ? 'opponent' : 'player', zoneType: 'main', zoneIndex: 0,
    card: { id: entry.id, name: 'Revealed Field', type: 'Spell Card', uid: 'private-source', atk: 9999, effectUsage: {} },
    targetCard: { id: '20721928', name: 'Sparkman', type: 'Normal Monster', race: 'Warrior',
      uid: 'private-target', atk: 1600, currentAtk: 2600, runtimeInstanceId: 123, isSetFaceDown: false },
    ...overrides
  };
}

function harness({ reducedMotion = false, game = {} } = {}) {
  const pending = new Map();
  let frame = 0;
  const documentRef = { hidden: false };
  const scene = new RealDuelScene3D({ documentRef, windowRef: {
    performance: { now: () => 0 }, matchMedia: () => ({ matches: reducedMotion }),
    requestAnimationFrame(callback) { pending.set(++frame, callback); return frame; },
    cancelAnimationFrame(handle) { pending.delete(handle); }
  } });
  scene.scene = new Scene();
  scene.camera = new PerspectiveCamera();
  scene.renderer = { render() {} };
  scene.active = true;
  const view = {
    active: true, disposed: false, documentRef, gameState: game, scene3D: scene,
    _publicZonePosition: position,
    _syncFieldHolograms() { RealDuelView.prototype._syncFieldHolograms.call(this); }
  };
  return { scene, view, pending };
}

test('resolved Field cinematics route both controllers and Extra zones to their actual finite effect geometry', () => {
  for (const entry of CASES) {
    for (const sourceSide of ['player', 'opponent']) {
      const refs = [];
      const event = payload(entry, sourceSide, { zoneType: 'extra', zoneIndex: 1,
        profile: 'wrong-profile', poseKind: 'arbitrary', poseTarget: 'source' });
      const visual = createPublicCombatVisual(event, {}, ref => { refs.push(ref); return position(ref); });
      assert.ok(visual, entry.type);
      assert.equal(visual.profile, entry.profile);
      assert.equal(visual.kind, entry.kind);
      assert.equal(visual.poseKind, entry.poseKind);
      assert.equal(visual.poseTarget, 'target');
      assert.deepEqual(visual.sourceRef, { owner: sourceSide, zoneType: 'field', zoneIndex: 0 });
      assert.deepEqual(visual.targetRef, { owner: event.target, zoneType: 'extra', zoneIndex: 1 });
      assert.deepEqual(refs, [visual.sourceRef, visual.targetRef]);
      assert.deepEqual(visual.source, position(visual.sourceRef));
      assert.deepEqual(visual.target, position(visual.targetRef));
      assert.notEqual(visual.card, event.card);
      assert.equal(Object.isFrozen(visual.card), true);
      assert.equal(Object.isFrozen(visual.sourceRef), true);
      assert.equal(JSON.stringify(visual).includes('private-'), false);
      assert.equal('atk' in visual.card, false);
      if (entry.kind === 'destroy') assert.equal('targetCard' in visual, false);
      else {
        assert.notEqual(visual.targetCard, event.targetCard);
        assert.equal(visual.targetCard.id, '20721928');
        assert.equal(Object.isFrozen(visual.targetCard), true);
        assert.equal('currentAtk' in visual.targetCard, false);
      }
      const effect = createCombatVisualEffect(visual);
      assert.equal(effect.profile.id, entry.profile);
      assert.equal(effect.duration, entry.duration);
      assert.ok(effect.group.getObjectByName(entry.mesh));
      assert.deepEqual(effect.group.position.toArray(), visual.source);
      assert.equal(effect.update(.5), true);
      assert.equal(effect.update(1), false);
      effect.dispose();
    }
  }
});

test('RealDuelView sends the reconstructed Field event into the actual scene and poses the beneficiary', () => {
  for (const entry of CASES) {
    for (const sourceSide of ['player', 'opponent']) {
      const game = { playerMonsters: [{ id: '46986414', position: 'attack' }],
        opponentMonsters: [{ id: '20721928', position: 'attack' }] };
      const { scene, view, pending } = harness({ game });
      const event = payload(entry, sourceSide);
      assert.equal(RealDuelView.prototype.playAnimation.call(view, event), true);
      assert.equal(scene._combatEffects.length, 1);
      assert.equal(scene._combatEffects[0].profile.id, entry.profile);
      assert.equal(scene._combatEffects[0].duration, entry.duration);
      assert.deepEqual(scene._combatEffects[0].group.position.toArray(), position({ owner: sourceSide, zoneType: 'field' }));
      const target = scene._fieldHolograms.get(`${event.target}:main:0`).object;
      const sourceCampMonster = scene._fieldHolograms.get(`${sourceSide}:main:0`).object;
      assert.equal(scene._monsterPoses.size, 1);
      assert.equal(scene._monsterPoses.get(target).animation.kind, entry.poseKind);
      assert.equal(scene._monsterPoses.has(sourceCampMonster), false, 'a Terrain source never animates an unrelated main-zone monster');
      assert.equal(pending.size, 1);
      scene.deactivate();
      scene.updateFieldHolograms([]);
      assert.equal(scene._combatEffects.length, 0);
      assert.equal(scene._monsterPoses.size, 0);
      assert.equal(pending.size, 0);
    }
  }
});

test('Ancient Forest binds the vacated zone without ever reading its destroyed target or hidden identity', () => {
  let targetReads = 0;
  const event = payload(CASES[2], 'opponent', {
    target: 'player', zoneType: 'extra', zoneIndex: 1
  });
  // Object spread evaluates accessors, so install the opaque property after
  // constructing the event, just as a live private CardState can contain it.
  Object.defineProperty(event, 'targetCard', { get() { targetReads += 1; throw new Error('target read'); } });
  const { scene, view } = harness();
  assert.equal(RealDuelView.prototype.playAnimation.call(view, event), true);
  assert.equal(targetReads, 0);
  assert.equal(scene._fieldHolograms.size, 0);
  assert.equal(scene._monsterPoses.size, 0);
  const effect = scene._combatEffects[0];
  assert.equal(effect.profile.id, 'ancient-forest-destruction');
  const localTarget = position({ owner: 'player', zoneType: 'extra', zoneIndex: 1 });
  const localSource = position({ owner: 'opponent', zoneType: 'field', zoneIndex: 0 });
  assert.deepEqual(effect.group.getObjectByName('impact-wave').position.toArray(),
    localTarget.map((value, index) => value - localSource[index]));
  scene.deactivate();
});

test('unrevealed Field sources and invalid references are rejected; reduced motion schedules no Field animation', () => {
  const hidden = { isSetFaceDown: true, get id() { throw new Error('hidden id'); }, get name() { throw new Error('hidden name'); } };
  for (const entry of CASES) {
    assert.equal(createPublicCombatVisual(payload(entry, 'player', { card: hidden }), {}), null);
    assert.equal(createPublicCombatVisual(payload(entry, 'other'), {}), null);
    assert.equal(createPublicCombatVisual(payload(entry, 'player', { zoneType: 'field' }), {}), null);
    assert.equal(createPublicCombatVisual(payload(entry, 'player', { zoneType: 'extra', zoneIndex: 2 }), {}), null);
    const visual = createPublicCombatVisual(payload(entry, 'player', { targetCard: hidden }), {}, position);
    assert.ok(visual);
    assert.equal('targetCard' in visual, false);
    const { scene, view, pending } = harness({ reducedMotion: true });
    assert.equal(RealDuelView.prototype.playAnimation.call(view, payload(entry)), false);
    assert.equal(scene._combatEffects.length, 0);
    assert.equal(pending.size, 0);
  }
});
