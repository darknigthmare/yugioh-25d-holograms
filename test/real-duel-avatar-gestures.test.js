import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { RealDuelScene3D } from '../src/ui/RealDuelScene3D.js';
import { RealDuelView, createPublicDuelSceneSummary } from '../src/ui/RealDuelView.js';
import { resolveRealDuelCameraPose } from '../src/ui/RealDuelCameraPresets.js';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';

const loc = (controller = 0, location = 4, sequence = 0) => ({ controller, location, sequence, position: 1 });
const visibleCard = Object.freeze({ id: '89631139', name: 'Blue-Eyes White Dragon', type: 'Normal Monster', race: 'Dragon', attribute: 'LIGHT' });

function fixture({ reducedMotion = false } = {}) {
  let now = 0, nextHandle = 0, renders = 0;
  const pending = new Map();
  const documentRef = { hidden: false };
  const motionPreference = { matches: reducedMotion };
  const windowRef = {
    performance: { now: () => now }, matchMedia: () => motionPreference,
    requestAnimationFrame(callback) { pending.set(++nextHandle, callback); return nextHandle; },
    cancelAnimationFrame(handle) { pending.delete(handle); }
  };
  const scene = new RealDuelScene3D({ documentRef, windowRef });
  scene.scene = new Scene();
  scene.camera = new PerspectiveCamera();
  scene.renderer = { render() { renders += 1; } };
  scene.root = { dataset: {}, hidden: false, removeAttribute() {}, remove() {} };
  scene.active = true;
  scene.setDuelistAvatars({ playerAvatarId: 'yugi', opponentAvatarId: 'kaiba' });
  const game = { winner: null, playerMonsters: [visibleCard], opponentMonsters: [visibleCard],
    playerHand: [], opponentHand: [], playerLP: 8000, opponentLP: 8000 };
  for (const property of ['playerDeck', 'opponentDeck', 'playerExtraDeck', 'opponentExtraDeck', 'opponentSpells']) {
    Object.defineProperty(game, property, { get() { assert.fail(`Private ${property} read`); } });
  }
  const view = new RealDuelView({ enable3D: false, documentRef, windowRef });
  view.active = true;
  view.gameState = game;
  view.scene3D = scene;
  // Exercise the existing public boundary when CSS zones resolve to coordinates.
  view._publicZonePosition = ref => [ref.zoneIndex || 0, 0.7, ref.owner === 'player' ? 4 : -4];
  const context = createNativeVisualContext({
    getCardMetadata: code => code === 12580477
      ? { id: String(code), name: 'Raigeki', type: 'Spell Card', card_type: 'spell', race: 'Normal' }
      : visibleCard,
    queryCard: query => ({ code: query.location === 8 ? 12580477 : 89631139, position: 1, attack: 3000, defense: 2500 })
  });
  const translate = message => translateNativeVisualEvents(message, context).events;
  const summon = (controller = 0, sequence = 0) => {
    assert.deepEqual(translate({ type: 60, code: 89631139, ...loc(controller, 4, sequence) }), []);
    return translate({ type: 61 }).find(event => event.type === 'summon');
  };
  const casting = (controller = 0) => translate({ type: 70, code: 12580477, ...loc(controller, 8, 0), chain_size: 1 })
    .find(event => event.type === 'activate');
  const attack = (controller = 0) => {
    // Remember the native public slot without dispatching an avatar reaction.
    summon(controller);
    translate({ type: 10 });
    return translate({ type: 110, card: loc(controller), target: loc(1 - controller) })
      .find(event => event.type === 'attack-monster');
  };
  return { scene, view, game, context, documentRef, pending, motionPreference, translate, summon, casting, attack,
    avatar: owner => scene._duelistAvatars.get(owner),
    get renders() { return renders; },
    setNow(value) { now = value; },
    tick(delta = 100) {
      now += delta;
      const entry = pending.entries().next().value;
      assert.ok(entry, 'the real scene schedules its animation frame');
      pending.delete(entry[0]); entry[1](now);
    },
    dispose() { view.dispose(); }
  };
}

test('successful native summons and Chain declarations animate the correct real avatar and articulated arm', () => {
  const f = fixture();
  try {
    assert.equal(f.avatar('player').getGestureState(), null, 'SUMMONING alone produced no success callback');
    assert.equal(f.view.playAnimation(f.summon()), true);
    assert.equal(f.avatar('player').getGestureState().kind, 'summon');
    assert.equal(f.avatar('opponent').getGestureState(), null);
    for (let i = 0; i < 4; i += 1) f.tick();
    assert.ok(Math.abs(f.avatar('player').rig.rightShoulder.rotation.x) > 0.4);
    assert.ok(Math.abs(f.avatar('player').rig.rightElbow.rotation.x) > 0.1);
    const event = f.casting(1);
    assert.equal(event.zoneType, 'spell');
    assert.equal(f.view.playAnimation(event), true);
    assert.equal(f.avatar('opponent').getGestureState().kind, 'casting', 'owner survives coordinate-only spell projection');
    assert.equal(f.scene.root.dataset.opponentDuelistGesture, 'casting');
    const castingId = f.avatar('opponent').getGestureState().gestureId;
    assert.equal(f.view.playAnimation({ ...event }), false, 'a reconstructed callback cannot repeat the same native Chain link');
    assert.equal(f.avatar('opponent').getGestureState().gestureId, castingId);
    assert.equal(f.view.playAnimation(f.translate({ type: 74 })[0]), false);
    assert.equal(f.view.playAnimation(f.casting(1)), true, 'link 1 of a later native Chain is a new declaration');
    for (let i = 0; i < 16; i += 1) f.tick();
    assert.equal(f.avatar('player').getGestureState(), null);
    assert.equal(f.avatar('opponent').getGestureState(), null, 'finite gestures return to idle');
  } finally { f.dispose(); }
});

test('native attacks react on their source, while only an applied DAMAGE result reacts on the victim', () => {
  const f = fixture();
  try {
    assert.equal(f.view.playAnimation(f.attack(1)), true);
    const attacker = f.avatar('opponent').getGestureState();
    assert.equal(attacker.kind, 'attack');
    assert.equal(f.avatar('player').getGestureState(), null);
    for (const message of [{ type: 100, player: 0, amount: 500 }, { type: 94, player: 0, lp: 6000 }, { type: 92, player: 0, amount: 1000 }]) {
      assert.equal(f.view.playAnimation(f.translate(message)[0]), false);
      assert.equal(f.avatar('player').getGestureState(), null, 'cost, LPUPDATE and recovery are not damage');
    }
    const damage = f.translate({ type: 91, player: 0, amount: 2000 })[0];
    assert.equal(f.view.playAnimation(damage), true);
    assert.equal(f.avatar('player').getGestureState().kind, 'damage');
    assert.equal(f.avatar('player').getGestureState().strength, 2 / 3);
    assert.equal(f.avatar('opponent').getGestureState().gestureId, attacker.gestureId);
    assert.equal(f.view.playAnimation({ ...damage, damage: 1999 }), false, 'a claimed result must match the public LP delta');
    assert.equal(f.view.playAnimation({ ...damage, cost: true }), false);
    assert.equal(f.scene.playDuelistDamage({ owner: 'private-user-id', amount: 2000 }), false);
    assert.equal(f.scene.playDuelistDamage({ owner: 'player', amount: Infinity }), false);
  } finally { f.dispose(); }
});

test('attribute effect reactions require a nonzero applied public result, not a stat declaration or failed callback', () => {
  const f = fixture();
  try {
    const applied = { type: 'dark-city-boost-cinematic', sourceSide: 'opponent', target: 'opponent',
      zoneType: 'main', zoneIndex: 0, card: { id: '53527835', type: 'Spell Card', race: 'Field' },
      targetCard: visibleCard, bonus: 1000, calculatedAtk: 4000 };
    for (const bonus of [undefined, 0, -1000, NaN]) {
      assert.equal(f.view.playAnimation({ ...applied, bonus }), false);
      assert.equal(f.avatar('opponent').getGestureState(), null);
    }
    assert.equal(f.view.playAnimation({ type: 'battle-stats', target: 'opponent', nativeStats: { attack: 4000 } }), false);
    for (const fields of [{ negated: true }, { resolved: false }]) {
      f.view.playAnimation({ ...applied, ...fields });
      assert.equal(f.avatar('opponent').getGestureState(), null, 'an explicitly failed attribute callback cannot animate the duelist');
    }
    assert.equal(f.view.playAnimation(applied), true);
    assert.equal(f.avatar('opponent').getGestureState().kind, 'casting');
  } finally { f.dispose(); }
});

test('models receive only gesture names and primitive options, and concealed identities are never inspected', () => {
  const f = fixture();
  try {
    const calls = [];
    for (const owner of ['player', 'opponent']) {
      const avatar = f.avatar(owner), play = avatar.playGesture;
      avatar.playGesture = (kind, options) => { calls.push([kind, options]); return play(kind, options); };
    }
    const hidden = { isSetFaceDown: true };
    for (const property of ['id', 'name', 'runtimeInstanceId', 'uid', 'imageUrl']) {
      Object.defineProperty(hidden, property, { get() { assert.fail(`Hidden identity ${property} read`); } });
    }
    assert.equal(f.view.playAnimation({ type: 'summon', hidden: true, get card() { assert.fail('Hidden event card read'); } }), false);
    assert.equal(f.view.playAnimation({ type: 'activate', faceDown: true, get card() { assert.fail('Set card read'); } }), false);
    assert.equal(f.view.playAnimation({ type: 'activate', private: true, get card() { assert.fail('Private card read'); } }), false);
    f.view.playAnimation({ type: 'summon', target: 'opponent', zoneType: 'main', zoneIndex: 1,
      nativeSummonConfirmed: true, card: hidden });
    assert.equal(f.avatar('opponent').getGestureState(), null);
    f.view.playAnimation(f.summon());
    f.view.playAnimation(f.translate({ type: 91, player: 1, amount: 1500 })[0]);
    f.view.setDuelistOutcome('player');
    assert.ok(calls.length >= 4);
    for (const [kind, options] of calls) {
      assert.equal(typeof kind, 'string');
      assert.ok(Object.values(options).every(value => typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))));
      assert.ok(Object.keys(options).every(key => ['strength', 'hold', 'immediate'].includes(key)));
    }
    assert.deepEqual(Object.keys(createPublicDuelSceneSummary(f.game)).sort(),
      ['currentPhase', 'currentTurn', 'duelEnded', 'opponentHandCount', 'opponentLP', 'playerHandCount', 'playerLP', 'turnCount'].sort());
  } finally { f.dispose(); }
});

test('duplicate public callbacks do not restart a gesture, while a genuine attack replay replaces its old trail', () => {
  const f = fixture();
  try {
    const summon = f.summon();
    f.view.playAnimation(summon);
    const id = f.avatar('player').getGestureState().gestureId;
    assert.equal(f.view.playAnimation(summon), false);
    assert.equal(f.view.playAnimation({ ...summon }), false, 'the native public summon ID deduplicates reconstructed callbacks');
    assert.equal(f.avatar('player').getGestureState().gestureId, id);
    const attack = f.attack();
    f.view.playAnimation(attack);
    const first = f.scene._combatEffects.find(effect => effect.publicAttackId === attack.nativeAttackId);
    const firstGesture = f.avatar('player').getGestureState().gestureId;
    assert.equal(f.view.playAnimation({ ...attack }), false);
    assert.equal(f.avatar('player').getGestureState().gestureId, firstGesture);
    const replay = { ...attack, nativeReplayConfirmed: true, replayCount: 1, defZoneIndex: 1 };
    assert.equal(f.view.playAnimation(replay), true);
    assert.equal(first.group.parent, null);
    assert.equal(f.scene._combatEffects.filter(effect => effect.publicAttackId === attack.nativeAttackId).length, 1);
    assert.ok(f.avatar('player').getGestureState().gestureId > firstGesture);
    assert.equal(f.view.playAnimation({ ...replay }), false);
    const fresh = f.attack();
    assert.notEqual(fresh.nativeAttackId, attack.nativeAttackId);
    assert.equal(f.view.playAnimation(fresh), true, 'a later native command from the same zone is distinct');
  } finally { f.dispose(); }
});

test('confirmed attack negation cancels its own gesture but preserves later casting and a newer same-slot attack', () => {
  const f = fixture();
  try {
    const old = f.attack();
    f.view.playAnimation(old);
    const negation = f.translate({ type: 112 }).find(event => event.type === 'attack-negated');
    assert.equal(f.view.playAnimation(negation), true);
    assert.equal(f.avatar('player').getGestureState(), null);
    f.view.playAnimation(f.attack());
    f.view.playAnimation(f.casting());
    const castingId = f.avatar('player').getGestureState().gestureId;
    f.view.playAnimation(f.translate({ type: 112 }).find(event => event.type === 'attack-negated'));
    assert.equal(f.avatar('player').getGestureState().kind, 'casting');
    assert.equal(f.avatar('player').getGestureState().gestureId, castingId, 'a different parent owns the current gesture');
    const fresh = f.attack();
    f.view.playAnimation(fresh);
    const freshId = f.avatar('player').getGestureState().gestureId;
    f.view.playAnimation({ ...negation });
    assert.equal(f.avatar('player').getGestureState().gestureId, freshId, 'an old native ID cannot cancel a new attack at the same public slot');
    assert.ok(f.scene._combatEffects.some(effect => effect.publicAttackId === fresh.nativeAttackId));
    // Even direct external replacement is protected by the model's nonce.
    f.avatar('player').playGesture('damage', { strength: 0.5 });
    const externalId = f.avatar('player').getGestureState().gestureId;
    assert.equal(f.scene.cancelPublicAttack(fresh.nativeAttackId), true);
    assert.equal(f.avatar('player').getGestureState().gestureId, externalId);
  } finally { f.dispose(); }
});

test('hidden native stops and negations retire the right attack without rendering or allocating another effect', () => {
  for (const stop of [false, true]) {
    const f = fixture();
    try {
      const attack = f.attack();
      f.view.playAnimation(attack);
      const effect = f.scene._combatEffects.find(value => value.publicAttackId === attack.nativeAttackId);
      f.documentRef.hidden = true;
      f.scene._boundVisibility();
      const renders = f.renders;
      const event = stop ? f.translate({ type: 10 }).find(value => value.type === 'attack-stopped')
        : f.translate({ type: 112 }).find(value => value.type === 'attack-negated');
      f.view.playAnimation(event);
      assert.equal(effect.group.parent, null);
      assert.equal(f.avatar('player').getGestureState(), null);
      assert.equal(f.pending.size, 0);
      assert.equal(f.renders, renders);
      assert.equal(f.scene._combatEffects.length, 0);
    } finally { f.dispose(); }
  }
});

test('visibility freezes gesture time, reduced motion clears transients, and held results remain static', () => {
  const f = fixture();
  try {
    f.view.playAnimation(f.summon());
    f.tick(); f.tick();
    const elapsed = f.avatar('player').getGestureState().elapsed;
    f.documentRef.hidden = true;
    f.scene._boundVisibility();
    f.setNow(100000);
    assert.equal(f.pending.size, 0);
    assert.equal(f.view.playAnimation(f.casting()), false);
    assert.equal(f.avatar('player').getGestureState().elapsed, elapsed);
    f.documentRef.hidden = false;
    f.scene._boundVisibility();
    f.tick();
    assert.equal(f.avatar('player').getGestureState().elapsed, elapsed, 'first resumed frame starts a new delta baseline');
    f.motionPreference.matches = true;
    f.scene._boundMotionPreference({ matches: true });
    f.scene.clearCombatEffects();
    assert.equal(f.avatar('player').getGestureState(), null);
    assert.equal(f.pending.size, 0);
    assert.equal(f.view.playAnimation(f.translate({ type: 91, player: 0, amount: 1000 })[0]), false);
    f.view.setDuelistOutcome('draw');
    assert.equal(f.avatar('player').getGestureState().held, true);
    assert.equal(f.avatar('player').getGestureState().kind, 'draw');
    assert.equal(f.avatar('player').hasActiveGesture, false);
    assert.equal(f.pending.size, 0);
    assert.ok(Math.abs(f.avatar('player').rig.rightShoulder.rotation.x) > 0);
    f.motionPreference.matches = false;
    f.scene._boundMotionPreference({ matches: false });
    assert.equal(f.pending.size, 0, 'restoring full motion does not animate an ended result');
  } finally { f.dispose(); }
});

test('native victory and public surrender winners synchronously hold final poses with zero RAF, without deriving a winner from LP', () => {
  for (const winner of ['player', 'opponent', 'draw']) {
    const f = fixture();
    try {
      f.view.playAnimation(f.attack());
      f.scene.updatePublicSummary({ duelEnded: true });
      assert.equal(f.avatar('player').getGestureState(), null);
      assert.equal(f.pending.size, 0);
      // The engine's state callback precedes its native-victory callback.
      const event = f.translate({ type: 5, player: winner === 'draw' ? 2 : winner === 'player' ? 0 : 1, reason: 1 })
        .find(value => value.type === 'native-victory');
      assert.equal(f.view.playAnimation(event), true);
      for (const owner of ['player', 'opponent']) {
        const state = f.avatar(owner).getGestureState();
        assert.equal(state.kind, winner === 'draw' ? 'draw' : owner === winner ? 'victory' : 'defeat');
        assert.equal(state.progress, 1);
        assert.equal(state.held, true);
        assert.equal(f.avatar(owner).hasActiveGesture, false);
      }
      assert.equal(f.scene.root.dataset.duelistOutcome, winner);
      assert.equal(f.scene._combatEffects.length, 0);
      assert.equal(f.pending.size, 0);
      f.scene._onFrame(999999);
      assert.equal(f.pending.size, 0);
      f.scene.deactivate(); f.scene.active = true; f.scene.start();
      assert.equal(f.avatar('player').getGestureState().held, true);
      assert.equal(f.pending.size, 0);
      assert.equal(f.view.playAnimation({ type: 'native-victory', winner, nativeVictoryConfirmed: false }), false);
    } finally { f.dispose(); }
  }
  const f = fixture();
  try {
    f.game.playerLP = 0;
    f.view.active = false;
    f.view.update(f.game);
    assert.equal(f.scene.root.dataset.duelistOutcome, 'pending', 'zero LP alone is not a victory signal');
    f.game.winner = 'opponent';
    f.view.update(f.game);
    assert.equal(f.avatar('player').getGestureState().kind, 'defeat', 'public winner handles surrender while the view is inactive');
    assert.equal(f.scene.publicSummary, null, 'the outcome setter can precede the aggregate update');
    f.scene.setCameraPreset('overview');
    assert.equal(f.scene._cameraTransition, null, 'the final pose cannot strand a camera interpolation before the summary arrives');
    assert.deepEqual(f.scene.camera.position.toArray(), resolveRealDuelCameraPose('overview', f.scene._width).position);
    assert.equal(f.pending.size, 0);
    assert.equal(f.view.getGameState(), f.game);
    f.game.winner = null;
    f.view.update(f.game);
    assert.equal(f.avatar('player').getGestureState(), null);
    assert.equal(f.view.setDuelistOutcome({ winner: 'player' }), false);
    assert.equal(f.view.setDuelistOutcome('private-user-id'), false);
  } finally { f.dispose(); }
});

test('public gesture datasets write only distinct transitions, not repeated sync calls or idle animation frames', () => {
  const f = fixture();
  let writes = 0;
  f.scene.root.dataset = new Proxy({ ...f.scene.root.dataset }, {
    set(target, key, value) { writes += 1; target[key] = value; return true; }
  });
  try {
    for (let i = 0; i < 100; i += 1) f.scene._syncDuelistGestureDataset();
    for (let i = 0; i < 20; i += 1) f.tick();
    assert.equal(writes, 0, 'unchanged idle/outcome values cause no DOM attribute writes');
    f.view.playAnimation(f.summon());
    assert.equal(writes, 1, 'only the player summon transition is written');
    for (let i = 0; i < 100; i += 1) f.scene._syncDuelistGestureDataset();
    assert.equal(writes, 1, 'repeated sync cannot repeat the same transition');
    for (let i = 0; i < 20; i += 1) f.tick();
    assert.equal(writes, 2, 'the return to idle adds exactly one write');
    f.view.setDuelistOutcome('player');
    assert.equal(writes, 5, 'victory, defeat and public outcome each add one write');
    for (let i = 0; i < 100; i += 1) f.scene._syncDuelistGestureDataset();
    f.view.setDuelistOutcome('player');
    assert.equal(writes, 5, 'held results and repeated winner callbacks add no writes');
    assert.equal(f.pending.size, 0);
  } finally { f.dispose(); }
});

test('avatar replacement preserves held outcomes, and repeated stop/dispose releases each owned resource exactly once', () => {
  const f = fixture();
  const avatars = [...f.scene._duelistAvatars.values()];
  const resources = new Map();
  for (const avatar of avatars) avatar.group.traverse(object => {
    for (const resource of [object.geometry, ...[object.material].flat()].filter(Boolean)) {
      if (resources.has(resource)) continue;
      resources.set(resource, 0);
      resource.addEventListener('dispose', () => resources.set(resource, resources.get(resource) + 1));
    }
  });
  f.view.playAnimation(f.attack());
  f.view.setDuelistOutcome('player');
  f.scene.setDuelistAvatars({ playerAvatarId: 'joey' });
  assert.equal(avatars[0].disposed, true);
  assert.equal(f.avatar('player').getGestureState().kind, 'victory');
  assert.equal(f.avatar('player').getGestureState().held, true);
  assert.equal(f.pending.size, 0);
  f.scene.deactivate(); f.scene.deactivate();
  assert.equal(f.scene._duelistGestures.size, 0);
  assert.equal(f.scene.dispose(), true);
  assert.equal(f.scene.dispose(), false);
  assert.equal(f.scene._duelistAvatars.size, 0);
  assert.equal(f.scene.playDuelistDamage({ owner: 'player', amount: 1000 }), false);
  assert.equal(f.scene.setDuelistOutcome('draw'), false);
  assert.equal(f.pending.size, 0);
  assert.ok(resources.size > 10);
  for (const count of resources.values()) assert.equal(count, 1);
  f.view.dispose();
});
