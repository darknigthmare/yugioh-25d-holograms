import test from 'node:test';
import assert from 'node:assert/strict';

import { CardState } from '../src/core/CardState.js';
import { FieldState } from '../src/core/FieldState.js';
import { SummonEngine } from '../src/core/SummonEngine.js';

function monster(uid, overrides = {}) {
  const card = new CardState({
    uid,
    id: uid,
    name: uid,
    card_type: 'monster',
    type: 'Effect Monster',
    atk: 1000,
    def: 1000,
    level: 4,
    isEffectMonster: true,
    ...overrides
  });
  card.ownerId = overrides.ownerId || 'player';
  card.controllerId = overrides.controllerId || card.ownerId;
  return card;
}

test('zone transitions purge zone-only Pendulum, Extra Deck, and face-down flags', () => {
  const field = new FieldState();

  const activeScale = monster('active-scale', {
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  });
  field.setSpellZone('player', 0, activeScale);
  activeScale.location = 'pendulum_zone';
  activeScale.isPendulumScale = true;

  const scaleDestination = field.sendToGraveyard(activeScale, 'player');
  assert.equal(scaleDestination.destination, 'extra_deck_face_up');
  assert.equal(activeScale.isPendulumScale, false);
  assert.equal(activeScale.isPendingPendulumActivation, false);
  assert.equal(activeScale.isFaceUpInExtraDeck, true);
  assert.equal(activeScale.isSetFaceDown, false);

  const pendingScale = monster('pending-scale', {
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 8
  });
  pendingScale.isPendingPendulumActivation = true;
  field.setSpellZone('player', 4, pendingScale);
  assert.equal(pendingScale.isPendingPendulumActivation, true);

  const pendingDestination = field.sendToGraveyard(pendingScale, 'player');
  assert.equal(pendingDestination.destination, 'graveyard');
  assert.equal(pendingScale.isPendingPendulumActivation, false);
  assert.equal(pendingScale.isFaceUpInExtraDeck, false);

  field.setMonsterZone('player', 0, activeScale);
  assert.equal(activeScale.isFaceUpInExtraDeck, false);
  assert.equal(field.playerFaceUpExtraDeck.includes(activeScale), false);

  const setTrap = new CardState({
    uid: 'set-trap',
    id: 'set-trap',
    name: 'set-trap',
    card_type: 'trap',
    type: 'Trap Card'
  });
  setTrap.ownerId = 'player';
  setTrap.controllerId = 'player';
  setTrap.isSetFaceDown = true;
  field.setSpellZone('player', 1, setTrap);
  assert.equal(setTrap.isSetFaceDown, true);
  field.sendToGraveyard(setTrap, 'player');
  assert.equal(setTrap.isSetFaceDown, false);
});

test('Xyz overlay transitions detach aliases and renew only material identities', () => {
  const field = new FieldState();
  const summons = new SummonEngine(field);
  const first = monster('overlay-first');
  const second = monster('overlay-second');
  const xyz = monster('xyz-host', {
    type: 'Xyz Effect Monster',
    level: 0,
    rank: 4,
    extra_type: 'xyz'
  });

  field.setMonsterZone('player', 0, first);
  field.setExtraMonsterZone(0, 'player', second);
  field.setMonsterZone('player', 1, xyz);
  first.currentAtk = 2400;
  first.counters.spell = 2;

  const firstFieldIdentity = first.runtimeInstanceId;
  const secondFieldIdentity = second.runtimeInstanceId;
  const hostIdentity = xyz.runtimeInstanceId;

  assert.equal(summons.attachXyzMaterials(xyz, [first, second]), 2);
  assert.deepEqual(xyz.xyzMaterials, [first, second]);
  assert.equal(field.getMonsterZone('player', 0), null);
  assert.equal(field.getExtraMonsterZone(0), null);
  assert.equal(first.location, 'xyz_material');
  assert.equal(second.location, 'xyz_material');
  assert.notEqual(first.runtimeInstanceId, firstFieldIdentity);
  assert.notEqual(second.runtimeInstanceId, secondFieldIdentity);
  assert.equal(first.currentAtk, first.baseAtk);
  assert.deepEqual(first.counters, {});
  assert.equal(xyz.runtimeInstanceId, hostIdentity);
  assert.equal(field.getMonsterZone('player', 1), xyz);

  const firstOverlayIdentity = first.runtimeInstanceId;
  const detached = summons.detachXyzMaterials(xyz, 1);
  assert.deepEqual(detached, [first]);
  assert.deepEqual(xyz.xyzMaterials, [second]);
  assert.equal(first.location, 'graveyard_pending');
  assert.notEqual(first.runtimeInstanceId, firstOverlayIdentity);
  assert.equal(xyz.runtimeInstanceId, hostIdentity);
  assert.equal(field.getMonsterZone('player', 1), xyz);

  field.sendToGraveyard(first, first.ownerId);
  assert.ok(field.playerGraveyard.includes(first));
  assert.equal(first.location, 'graveyard');
});
