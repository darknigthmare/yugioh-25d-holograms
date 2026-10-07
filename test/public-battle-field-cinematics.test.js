import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { createCombatVisualEffect } from '../src/ui/CombatVisualEffects.js';
import { resolveCombatVisualProfile } from '../src/ui/CombatVisualProfiles.js';
import { RealDuelView } from '../src/ui/RealDuelView.js';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';

const CASES = [
  { type: 'temple-minds-eye-cinematic', id: '92481084', profile: 'temple-minds-eye',
    shape: 'temple-eye', color: '#deb333', secondary: '#ffd862', duration: 1100, pose: 'casting',
    mesh: 'temple-eye-iris', text: '1000', data: { originalDamage: 250, modifiedDamage: 1000, damageSide: 'opponent' },
    change: { kind: 'damage-fixed', value: 1000, sourceCount: 1, originalDamage: 250, modifiedDamage: 1000, damageSide: 'opponent', directAttack: false } },
  { type: 'canyon-damage-cinematic', id: '28120197', profile: 'canyon-damage',
    shape: 'canyon-echo', color: '#ba9e81', secondary: '#ded5c1', duration: 1000, pose: 'recoil',
    mesh: 'canyon-double-impact-1', text: 'x2', data: { originalDamage: 600, modifiedDamage: 1200, damageSide: 'player' },
    change: { kind: 'damage-double', value: 2, sourceCount: 1, originalDamage: 600, modifiedDamage: 1200, damageSide: 'player', directAttack: false } },
  { type: 'shien-mist-reduction-cinematic', id: '11102908', profile: 'shien-mist-reduction',
    shape: 'shien-mist', color: '#ac5ee3', secondary: '#746684', duration: 1050, pose: 'recoil',
    mesh: 'shien-curved-castle-roof-1', text: '-500', data: { reduction: 500, calculatedAtk: 1500 },
    change: { kind: 'atk-decrease', value: 500, sourceCount: 1, calculatedAtk: 1500 } },
  { type: 'dark-city-boost-cinematic', id: '53527835', profile: 'dark-city-boost',
    shape: 'dark-city', color: '#fff1a1', secondary: '#d2cc9b', duration: 1050, pose: 'attack',
    mesh: 'dark-city-golden-window-3-1', text: '+1000', data: { bonus: 1000, calculatedAtk: 2700 },
    change: { kind: 'atk-increase', value: 1000, sourceCount: 1, calculatedAtk: 2700 } }
];

function position(ref) {
  const sign = ref.owner === 'player' ? 1 : -1;
  return ref.zoneType === 'field' ? [-8 * sign, .62, 7 * sign]
    : [ref.zoneIndex * 2, .62, ref.zoneType === 'extra' ? 0 : 3 * sign];
}

function payload(entry, sourceSide = 'player', overrides = {}) {
  return { type: entry.type, sourceSide, target: sourceSide === 'player' ? 'opponent' : 'player',
    sourceZoneType: 'field', sourceZoneIndex: 0, zoneType: 'main', zoneIndex: 0,
    sourceCount: 1, ...entry.data,
    card: { id: entry.id, name: 'Public Terrain', type: 'Spell Card', race: 'Field', uid: 'private-source', counters: { spell: 9 } },
    targetCard: { id: '46986414', name: 'Public monster', type: 'Effect Monster', isSetFaceDown: false,
      uid: 'private-target', runtimeInstanceId: 123, atk: 1700, currentAtk: 9999, effectUsage: {} },
    ...overrides };
}

function harness({ reducedMotion = false } = {}) {
  const pending = new Map();
  let frame = 0;
  const documentRef = { hidden: false };
  const scene = new RealDuelScene3D({ documentRef, windowRef: {
    performance: { now: () => 0 }, matchMedia: () => ({ matches: reducedMotion }),
    requestAnimationFrame(callback) { pending.set(++frame, callback); return frame; },
    cancelAnimationFrame(handle) { pending.delete(handle); }
  } });
  scene.scene = new Scene(); scene.camera = new PerspectiveCamera(); scene.renderer = { render() {} }; scene.active = true;
  const view = { active: true, disposed: false, documentRef, scene3D: scene,
    gameState: { playerMonsters: [{ id: '46986414', position: 'attack' }], opponentMonsters: [{ id: '20721928', position: 'attack' }] },
    _publicZonePosition: position,
    _syncFieldHolograms() { RealDuelView.prototype._syncFieldHolograms.call(this); } };
  return { scene, view, pending };
}

for (const entry of CASES) {
  for (const sourceSide of ['player', 'opponent']) {
    test(`${entry.profile} reconstructs actual public Field/Extra coordinates and its applied value (${sourceSide})`, () => {
      const event = payload(entry, sourceSide, { zoneType: 'extra', zoneIndex: 1,
        profile: 'fake-profile', poseTarget: 'source', ruleChange: { kind: 'fake', value: 777 } });
      const visual = createPublicCombatVisual(event, {}, position);
      assert.equal(visual.profile, entry.profile);
      assert.equal(visual.poseTarget, 'target');
      assert.equal(visual.poseKind, entry.pose);
      assert.deepEqual(visual.sourceRef, { owner: sourceSide, zoneType: 'field', zoneIndex: 0 });
      assert.deepEqual(visual.targetRef, { owner: event.target, zoneType: 'extra', zoneIndex: 1 });
      assert.deepEqual(visual.source, position(visual.sourceRef));
      assert.deepEqual(visual.target, position(visual.targetRef));
      assert.deepEqual(visual.ruleChange, entry.change);
      for (const value of [visual, visual.card, visual.targetCard, visual.sourceRef, visual.targetRef, visual.ruleChange]) assert.ok(Object.isFrozen(value));
      const serialized = JSON.stringify(visual);
      assert.doesNotMatch(serialized, /private-|runtimeInstanceId|currentAtk|effectUsage|counters/);
      assert.equal('atk' in visual.targetCard, false);
    });
  }

  test(`${entry.profile} has distinct artwork colors and finite, disposable geometry within the effect budget`, () => {
    const visual = createPublicCombatVisual(payload(entry), {}, position);
    const profile = resolveCombatVisualProfile(visual);
    assert.equal(profile.shape, entry.shape);
    assert.equal(profile.color, entry.color);
    assert.equal(profile.secondary, entry.secondary);
    const effect = createCombatVisualEffect(visual);
    assert.equal(effect.duration, entry.duration);
    assert.ok(effect.group.getObjectByName(entry.mesh));
    const label = effect.group.getObjectByName(`${entry.profile}-value-label`);
    assert.ok(label.isInstancedMesh, 'one label draw call rather than one mesh per segment');
    assert.equal(label.userData.text, entry.text);
    let objects = 0; let vertices = 0;
    const resources = new Set();
    effect.group.traverse(object => {
      if (object.geometry) { objects += 1; vertices += object.geometry.attributes.position.count * (object.isInstancedMesh ? object.count : 1); resources.add(object.geometry); }
      if (object.material) resources.add(object.material);
    });
    assert.ok(objects <= 26, `${objects} draw objects`);
    assert.ok(vertices < 8000, `${vertices} vertices including digit instances`);
    let disposed = 0;
    for (const resource of resources) resource.addEventListener('dispose', () => { disposed += 1; });
    let labelDisposals = 0;
    label.addEventListener('dispose', () => { labelDisposals += 1; });
    for (const progress of [0, .1, .5, .9]) {
      assert.equal(effect.update(progress), true);
      effect.group.traverse(object => {
        assert.ok(object.position.toArray().every(Number.isFinite));
        assert.ok(object.scale.toArray().every(Number.isFinite));
      });
    }
    assert.equal(effect.update(1), false);
    assert.equal(effect.dispose(), true);
    assert.equal(disposed, resources.size);
    assert.equal(labelDisposals, 1, 'GPU instance buffers also receive disposal');
    assert.equal(effect.group.children.length, 0);
    assert.equal(effect.dispose(), false);
    assert.equal(effect.update(.5), false);
  });

  test(`${entry.profile} routes through RealDuelView to the actual scene and target pose`, () => {
    const { scene, view, pending } = harness();
    const event = payload(entry, 'opponent');
    assert.equal(RealDuelView.prototype.playAnimation.call(view, event), true);
    assert.equal(scene._combatEffects[0].profile.id, entry.profile);
    assert.ok(scene._combatEffects[0].group.getObjectByName(entry.mesh));
    const target = scene._fieldHolograms.get('player:main:0').object;
    assert.equal(scene._monsterPoses.get(target).animation.kind, entry.pose);
    assert.equal(scene._monsterPoses.has(scene._fieldHolograms.get('opponent:main:0').object), false);
    assert.equal(pending.size, 1);
    scene.deactivate(); scene.updateFieldHolograms([]);
    assert.equal(scene._combatEffects.length, 0);
    assert.equal(scene._monsterPoses.size, 0);
    assert.equal(pending.size, 0);
  });

  test(`${entry.profile} never reads hidden source/target identities and obeys reduced motion`, () => {
    const hidden = { isSetFaceDown: true };
    for (const property of ['id', 'name', 'name_en', 'race', 'type', 'atk']) Object.defineProperty(hidden, property, { get() { throw new Error(`hidden ${property} read`); } });
    assert.equal(createPublicCombatVisual(payload(entry, 'player', { card: hidden }), {}, position), null);
    const visual = createPublicCombatVisual(payload(entry, 'player', { targetCard: hidden }), {}, position);
    assert.ok(visual);
    assert.equal('targetCard' in visual, false);
    const opaqueEvent = payload(entry, 'player', { targetFaceDown: true });
    Object.defineProperty(opaqueEvent, 'targetCard', { get() { throw new Error('opaque target read'); } });
    assert.ok(createPublicCombatVisual(opaqueEvent, {}, position));
    assert.equal(createPublicCombatVisual(payload(entry, 'player', { zoneType: 'spell' }), {}, position), null);
    assert.equal(createPublicCombatVisual(payload(entry, 'player', { zoneType: 'extra', zoneIndex: 2 }), {}, position), null);
    const { scene, view, pending } = harness({ reducedMotion: true });
    assert.equal(RealDuelView.prototype.playAnimation.call(view, payload(entry)), false);
    assert.equal(scene._combatEffects.length, 0);
    assert.equal(pending.size, 0);
  });
}

test('two active copies display the real total ATK change while damage effects keep their fixed label', () => {
  for (const [entry, values, expected] of [
    [CASES[2], { reduction: 1000, calculatedAtk: 1000 }, '-1000'],
    [CASES[3], { bonus: 2000, calculatedAtk: 3700 }, '+2000'],
    [CASES[0], {}, '1000'], [CASES[1], {}, 'x2']
  ]) {
    const visual = createPublicCombatVisual(payload(entry, 'opponent', { ...values, sourceCount: 2 }), {}, position);
    assert.equal(visual.ruleChange.sourceCount, 2);
    const effect = createCombatVisualEffect(visual);
    assert.equal(effect.group.getObjectByName(`${entry.profile}-value-label`).userData.text, expected);
    effect.dispose();
  }
});

test('public result metadata is bounded and reconstructed from the recognized rule', () => {
  assert.equal(createPublicCombatVisual(payload(CASES[3], 'player', { bonus: Infinity }), {}, position), null);
  assert.equal(createPublicCombatVisual(payload(CASES[2], 'player', { reduction: -500 }), {}, position), null);
  const visual = createPublicCombatVisual(payload(CASES[1], 'player', {
    sourceCount: 99, originalDamage: NaN, modifiedDamage: 'private-value', damageSide: 'private-side',
    directAttack: 'private', multiplier: 99, ruleChange: { value: 99, uid: 'secret' }
  }), {}, position);
  assert.deepEqual(visual.ruleChange, { kind: 'damage-double', value: 2, sourceCount: 1, directAttack: false });
});
