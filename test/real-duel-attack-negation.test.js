import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';

const player = (zoneIndex, zoneType = 'main') => ({ owner: 'player', zoneType, zoneIndex });
const opponent = (zoneIndex, zoneType = 'main') => ({ owner: 'opponent', zoneType, zoneIndex });
const publicCard = Object.freeze({ id: '89631139', name: 'Blue-Eyes White Dragon' });

function fixture() {
  let now = 0, reducedMotion = false, sequence = 0, renders = 0;
  const pending = new Map(), documentRef = { hidden: false };
  const scene = new RealDuelScene3D({ documentRef, windowRef: {
    performance: { now: () => now }, matchMedia: () => ({ matches: reducedMotion }),
    requestAnimationFrame(callback) { pending.set(++sequence, callback); return sequence; },
    cancelAnimationFrame(handle) { pending.delete(handle); }
  } });
  scene.scene = new Scene(); scene.camera = new PerspectiveCamera();
  scene.renderer = { render() { renders += 1; } }; scene.active = true;
  const refs = [player(0), player(1), player(0, 'extra'), player(4),
    opponent(0), opponent(3), opponent(4), opponent(1, 'extra')];
  scene.updateFieldHolograms(refs.map(ref => ({ ...ref, faceUp: true, card: publicCard })));
  const game = { getMonsterEntries: owner => refs.filter(ref => ref.owner === owner)
    .map(ref => ({ ...ref, card: publicCard })) };
  const locate = ref => [ref.zoneIndex, 0.7, ref.owner === 'player' ? 4 : -4];
  const visual = event => createPublicCombatVisual(event, game, locate);
  return { scene, pending, documentRef, visual,
    get renders() { return renders; },
    setReducedMotion(value) { reducedMotion = value; },
    tick(value) {
      now = value;
      const item = pending.entries().next().value;
      assert.ok(item, 'the genuine scene manager schedules the next frame');
      pending.delete(item[0]); item[1](value);
    },
    cleanup() { scene.clearCombatEffects(); scene.updateFieldHolograms([]); }
  };
}

function attack(source, target) {
  return { type: 'attack-monster', attackerSide: source.owner, atkZoneType: source.zoneType,
    atkZoneIndex: source.zoneIndex, defZoneType: target.zoneType, defZoneIndex: target.zoneIndex,
    card: publicCard };
}

function negation(source, extra = {}) {
  return { type: 'attack-negated', nativeAttackNegated: true, attackerSide: source.owner,
    atkZoneType: source.zoneType, atkZoneIndex: source.zoneIndex, card: publicCard, ...extra };
}

function observeDisposal(effect) {
  const geometries = new Map(), materials = new Map(), instances = new Map();
  const observe = (map, resource) => {
    if (!resource || map.has(resource)) return;
    map.set(resource, 0);
    resource.addEventListener('dispose', () => map.set(resource, map.get(resource) + 1));
  };
  effect.group.traverse(object => {
    observe(geometries, object.geometry);
    for (const material of [object.material].flat()) observe(materials, material);
    if (object.isInstancedMesh) observe(instances, object);
  });
  return {
    assertCount(expected) {
      assert.ok(geometries.size > 0 && materials.size > 0);
      for (const map of [geometries, materials, instances]) {
        for (const count of map.values()) assert.equal(count, expected);
      }
    }
  };
}

test('a confirmed public attack negation removes only the matching owner, zone type and index before impact', () => {
  const harness = fixture(), { scene, visual } = harness;
  const declarations = [attack(player(0), opponent(4)), attack(player(1), opponent(3)),
    attack(opponent(0), player(4)), attack(player(0, 'extra'), opponent(1, 'extra'))];
  for (const event of declarations) assert.equal(scene.playCombatEffect(visual(event)), true);
  const [cancelled, ...retained] = scene._combatEffects;
  const disposal = observeDisposal(cancelled);
  let cancelledUpdates = 0;
  const update = cancelled.update;
  cancelled.update = progress => { cancelledUpdates += 1; return update(progress); };
  harness.tick(120);
  const beforeNegationUpdates = cancelledUpdates;
  const impact = cancelled.group.getObjectByName('impact-wave');
  assert.equal(impact.visible, false);
  const victim = scene._fieldHolograms.get('opponent:main:4').object;
  const laterVictim = scene._fieldHolograms.get('opponent:extra:1').object;
  const retainedPose = scene._monsterPoses.get(laterVictim);
  assert.ok(scene._monsterPoses.has(victim), 'the attack has a deferred target recoil');

  const publicNegation = visual(negation(player(0)));
  assert.equal(publicNegation.kind, 'negate');
  assert.equal(publicNegation.nativeAttackNegated, true);
  assert.deepEqual(publicNegation.sourceRef, player(0));
  assert.equal(scene.playCombatEffect(publicNegation), true);
  assert.equal(scene._combatEffects.includes(cancelled), false);
  assert.equal(cancelled.group.parent, null);
  assert.equal(cancelled.group.children.length, 0);
  disposal.assertCount(1);
  for (const effect of retained) assert.ok(scene._combatEffects.includes(effect));
  assert.equal(scene._monsterPoses.has(victim), false);
  assert.deepEqual(victim.userData.poseRig.life.value.toArray(), [0, 1, 0, 0]);
  assert.equal(scene._monsterPoses.get(laterVictim), retainedPose);

  harness.tick(600);
  assert.equal(cancelledUpdates, beforeNegationUpdates, 'the cancelled projectile cannot advance to its impact frame');
  assert.equal(impact.visible, false);
  assert.notEqual(laterVictim.userData.poseRig.life.value.z, 0, 'a distinct attack still reaches its scheduled recoil');
  assert.equal(scene.playCombatEffect(publicNegation), true, 'a repeated notification does not dispose the old attack twice');
  disposal.assertCount(1);
  harness.tick(2500);
  assert.equal(harness.pending.size, 0);
  assert.equal(scene.running, false);
  harness.cleanup();
  disposal.assertCount(1);
});

test('chain negation and unconfirmed or unrelated negations cannot stop an attack at the same slot', () => {
  const harness = fixture(), { scene, visual } = harness;
  scene.playCombatEffect(visual(attack(player(0), opponent(4))));
  const ongoing = scene._combatEffects[0], disposal = observeDisposal(ongoing);
  const chain = visual({ type: 'chain-negated', target: 'player', zoneType: 'main', zoneIndex: 0,
    card: publicCard, nativeAttackNegated: true });
  assert.equal(chain.nativeAttackNegated, undefined, 'the public boundary does not forward an attack flag from a Chain result');
  scene.playCombatEffect(chain);
  scene.playCombatEffect(visual(negation(player(0), { nativeAttackNegated: false })));
  scene.playCombatEffect(visual(negation(player(1))));
  scene.playCombatEffect(visual(negation(opponent(0))));
  scene.playCombatEffect(visual(negation(player(0, 'extra'))));
  assert.ok(scene._combatEffects.includes(ongoing));
  disposal.assertCount(0);
  harness.tick(600);
  assert.equal(ongoing.group.getObjectByName('impact-wave').visible, true, 'a still-valid attack reaches impact');
  harness.cleanup();
  disposal.assertCount(1);
});

test('cancelling one attack preserves a later unrelated effect pose on its previous target', () => {
  const harness = fixture(), { scene, visual } = harness;
  scene.playCombatEffect(visual(attack(player(0), opponent(4))));
  const ongoing = scene._combatEffects[0], disposal = observeDisposal(ongoing);
  const victim = scene._fieldHolograms.get('opponent:main:4').object;
  scene.playCombatEffect({ kind: 'activate', card: { id: '12580477' },
    source: [4, 0.7, -4], sourceRef: opponent(4) });
  const laterPose = scene._monsterPoses.get(victim);
  scene.playCombatEffect(visual(negation(player(0))));
  assert.equal(scene._monsterPoses.get(victim), laterPose);
  assert.ok(scene._combatEffects.includes(laterPose.combatEffect));
  disposal.assertCount(1);
  harness.tick(200);
  assert.notEqual(victim.userData.poseRig.pose.value.y, 0, 'the later casting animation remains active');
  harness.cleanup();
  disposal.assertCount(1);
});

test('attack cancellation still clears a queued impact when motion is disabled or the document is hidden', () => {
  for (const mode of ['reduced', 'hidden']) {
    const harness = fixture(), { scene, visual } = harness;
    scene.playCombatEffect(visual(attack(player(0), opponent(4))));
    const ongoing = scene._combatEffects[0], disposal = observeDisposal(ongoing);
    harness.tick(120);
    if (mode === 'reduced') harness.setReducedMotion(true);
    else { harness.documentRef.hidden = true; scene._boundVisibility(); }
    const renders = harness.renders;
    assert.equal(scene.playCombatEffect(visual(negation(player(0)))), false, 'no new flashing negate animation is allocated');
    assert.equal(scene._combatEffects.length, 0);
    assert.equal(scene._monsterPoses.size, 0);
    assert.equal(harness.pending.size, 0);
    assert.equal(scene.running, false);
    assert.equal(scene.scene.children.length, 8, 'static creatures remain visible');
    if (mode === 'hidden') assert.equal(harness.renders, renders, 'hidden cancellation does not render a hidden frame');
    disposal.assertCount(1);
    harness.cleanup();
    disposal.assertCount(1);
  }
});

test('invalid or missing public monster coordinates cannot select another attack for cancellation', () => {
  for (const sourceRef of [undefined, { ...player(0), zoneIndex: -1 }, { ...player(0), zoneIndex: 5 },
    { ...player(0, 'extra'), zoneIndex: 2 }, { ...player(0), zoneType: 'spell' },
    { ...player(0), owner: 'private-player-uid' }, { ...player(0), zoneIndex: '0' }]) {
    const harness = fixture(), { scene, visual } = harness;
    scene.playCombatEffect(visual(attack(player(0), opponent(4))));
    const ongoing = scene._combatEffects[0];
    scene.playCombatEffect({ kind: 'negate', nativeAttackNegated: true, source: [0, 2, 4], sourceRef, card: publicCard });
    assert.ok(scene._combatEffects.includes(ongoing));
    harness.cleanup();
  }
});
