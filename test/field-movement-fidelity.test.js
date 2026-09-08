import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { FieldState } from '../src/core/FieldState.js';

function card(uid, owner = 'player', overrides = {}) {
  const result = new CardState({
    uid, id: uid, name: uid, card_type: 'monster', type: 'Effect Monster',
    atk: 1500, def: 1000, level: 4, desc: '', ...overrides
  });
  result.ownerId = owner;
  result.controllerId = owner;
  return result;
}

function fieldOccurrences(field, target) {
  return [
    ...field.playerMonsterZones, ...field.opponentMonsterZones,
    ...field.playerSpellZones, ...field.opponentSpellZones,
    ...field.extraMonsterZones.map(entry => entry?.card),
    field.playerFieldSpellZone, field.opponentFieldSpellZone,
    ...field.playerGraveyard, ...field.opponentGraveyard,
    ...field.playerBanished, ...field.opponentBanished,
    ...field.playerFaceUpExtraDeck, ...field.opponentFaceUpExtraDeck
  ].filter(candidate => candidate === target).length;
}

for (const destination of ['graveyard', 'banished']) {
  test(`a stolen monster goes to its owner's ${destination}, not its controller's`, () => {
    const field = new FieldState();
    const stolen = card('stolen');
    field.setMonsterZone('opponent', 0, stolen);
    if (destination === 'graveyard') field.sendToGraveyard(stolen, 'opponent');
    else field.sendToBanished(stolen, 'opponent');
    assert.equal(stolen.ownerId, 'player');
    assert.equal(stolen.controllerId, 'player');
    assert.equal(stolen.location, destination);
    assert.equal(field.opponentMonsterZones[0], null);
    assert.equal(fieldOccurrences(field, stolen), 1);
    const suffix = destination === 'graveyard' ? 'Graveyard' : 'Banished';
    assert.ok(field[`player${suffix}`].includes(stolen));
    assert.equal(field[`opponent${suffix}`].includes(stolen), false);
  });
}

for (const destination of ['hand', 'deck', 'extra_deck']) {
  test(`low-level ${destination} movement redirects a stolen monster to its owner`, () => {
    const field = new FieldState();
    const stolen = card('stolen');
    field.setMonsterZone('opponent', 0, stolen);
    const result = field.moveCard(stolen, destination, 'opponent');
    assert.equal(result.finalPlayer, 'player');
    assert.equal(stolen.controllerId, 'player');
    assert.equal(stolen.location, destination);
    assert.equal(fieldOccurrences(field, stolen), 0, 'the low-level API detaches; its caller owns private pile insertion');
  });
}

test('Main to Extra movement and control changes preserve one monster instance and its counters', () => {
  const field = new FieldState();
  const monster = card('tracked');
  field.setMonsterZone('player', 0, monster);
  monster.addCounter('spell', 2);
  monster.hasAttacked = true;
  monster.attacksDeclaredThisTurn = 1;
  monster.effectUsage.once = true;
  monster.applyModifier({ type: 'atk', value: 500, sourceCardId: 'external' });
  const identity = monster.runtimeInstanceId;
  const initialRevision = { ...field.monsterFieldRevision };
  field.setExtraMonsterZone(1, 'player', monster);
  assert.equal(monster.runtimeInstanceId, identity);
  assert.equal(field.playerMonsterZones[0], null);
  assert.equal(field.extraMonsterZones[1].card, monster);
  assert.equal(field.monsterFieldRevision.player, initialRevision.player, 'moving an existing opponent target does not cause replay');
  field.setMonsterZone('opponent', 3, monster);
  assert.equal(field.extraMonsterZones[1], null);
  assert.equal(monster.runtimeInstanceId, identity);
  assert.equal(monster.controllerId, 'opponent');
  assert.deepEqual(monster.counters, { spell: 2 });
  assert.equal(monster.hasAttacked, true);
  assert.equal(monster.attacksDeclaredThisTurn, 1);
  assert.deepEqual(monster.effectUsage, { once: true });
  assert.equal(monster.activeModifiers.length, 1);
  assert.ok(field.monsterFieldRevision.player > initialRevision.player);
  assert.ok(field.monsterFieldRevision.opponent > initialRevision.opponent);
  assert.equal(fieldOccurrences(field, monster), 1);
});

test('leaving for the Graveyard and returning creates new target identities and clears transient effects', () => {
  const field = new FieldState();
  const monster = card('tracked');
  field.setMonsterZone('player', 0, monster);
  monster.counters.spell = 3;
  monster.effectUsage.once = true;
  monster.effectNegated = true;
  monster.hasAttacked = true;
  monster.attacksDeclaredThisTurn = 1;
  monster.wasProperlySpecialSummoned = true;
  const originalIdentity = monster.runtimeInstanceId;
  field.sendToGraveyard(monster, 'player');
  const graveIdentity = monster.runtimeInstanceId;
  assert.notEqual(graveIdentity, originalIdentity);
  field.setMonsterZone('player', 0, monster);
  assert.notEqual(monster.runtimeInstanceId, graveIdentity);
  assert.deepEqual(monster.counters, {});
  assert.deepEqual(monster.effectUsage, {});
  assert.equal(monster.effectNegated, false);
  assert.equal(monster.hasAttacked, false);
  assert.equal(monster.attacksDeclaredThisTurn, 0);
  assert.equal(monster.wasProperlySpecialSummoned, true);
  assert.equal(fieldOccurrences(field, monster), 1);
  assert.equal(field.playerGraveyard.includes(monster), false);
});

for (const properlySummoned of [false, true]) {
  test(`a Pendulum Fusion in face-up Extra Deck preserves proper-Summon eligibility=${properlySummoned}`, () => {
    const field = new FieldState();
    const hybrid = card('pendulum-fusion', 'player', {
      type: 'Fusion Pendulum Effect Monster', extra_type: 'fusion',
      isPendulumMonster: true, belongsInExtraDeck: true
    });
    field.setExtraMonsterZone(0, 'opponent', hybrid);
    hybrid.wasProperlySpecialSummoned = properlySummoned;
    const originalIdentity = hybrid.runtimeInstanceId;
    const result = field.sendToGraveyard(hybrid, 'opponent');
    assert.equal(result.destination, 'extra_deck_face_up');
    assert.equal(hybrid.isFaceUpInExtraDeck, true);
    assert.equal(hybrid.wasProperlySpecialSummoned, properlySummoned);
    assert.equal(hybrid.controllerId, 'player');
    assert.notEqual(hybrid.runtimeInstanceId, originalIdentity);
    assert.ok(field.playerFaceUpExtraDeck.includes(hybrid));
    assert.equal(field.opponentFaceUpExtraDeck.includes(hybrid), false);
    assert.equal(field.playerGraveyard.includes(hybrid), false);
    assert.equal(fieldOccurrences(field, hybrid), 1);
  });
}

test('a Pendulum used as Xyz Material goes to the Graveyard rather than face-up Extra Deck', () => {
  const game = new DuelGame();
  const host = card('xyz-host', 'opponent', { type: 'Xyz Effect Monster', extra_type: 'xyz', rank: 4 });
  const material = card('pendulum-material', 'player', { type: 'Pendulum Effect Monster', isPendulumMonster: true });
  game.summons.attachXyzMaterials(host, [material]);
  game.field.setMonsterZone('opponent', 0, host);
  game.field.sendToBanished(host, 'opponent');
  assert.ok(game.playerGraveyard.includes(material));
  assert.equal(game.field.playerFaceUpExtraDeck.includes(material), false);
  assert.equal(material.location, 'graveyard');
  assert.equal(fieldOccurrences(game.field, material), 1);
});

for (const destination of ['graveyard', 'banished']) {
  test(`a Token leaving for ${destination} ceases to exist without entering a pile`, () => {
    const field = new FieldState();
    const token = card('token', 'player', { type: 'Token', isToken: true });
    field.setMonsterZone('opponent', 0, token);
    const revision = field.monsterFieldRevision.opponent;
    const result = destination === 'graveyard'
      ? field.sendToGraveyard(token, 'opponent') : field.sendToBanished(token, 'opponent');
    assert.equal(result.ceasedToExist, true);
    assert.equal(token.location, 'none');
    assert.equal(fieldOccurrences(field, token), 0);
    assert.ok(field.monsterFieldRevision.opponent > revision);
  });
}

test('banishing a Token face-down is rejected without losing the Token or changing the field', () => {
  const field = new FieldState();
  const token = card('token', 'player', { type: 'Token', isToken: true });
  field.setMonsterZone('player', 0, token);
  const identity = token.runtimeInstanceId;
  const revision = { ...field.monsterFieldRevision };
  assert.equal(field.sendToBanished(token, 'player', true), false);
  assert.equal(field.playerMonsterZones[0], token);
  assert.equal(token.runtimeInstanceId, identity);
  assert.deepEqual(field.monsterFieldRevision, revision);
  assert.equal(fieldOccurrences(field, token), 1);
});

for (const faceDown of [false, true]) {
  test(`an Xyz banished faceDown=${faceDown} sends all materials to their respective owners' Graveyards`, () => {
    const game = new DuelGame();
    const host = card('xyz-host', 'player', { type: 'Xyz Effect Monster', extra_type: 'xyz', rank: 4 });
    const first = card('owned-material', 'player');
    const second = card('stolen-material', 'opponent');
    game.summons.attachXyzMaterials(host, [first, second]);
    game.field.setMonsterZone('opponent', 0, host);
    game.field.sendToBanished(host, 'opponent', faceDown);
    assert.ok(game.field.playerBanished.includes(host));
    assert.equal(host.isSetFaceDown, faceDown);
    assert.deepEqual(host.xyzMaterials, []);
    assert.ok(game.playerGraveyard.includes(first));
    assert.ok(game.opponentGraveyard.includes(second));
    assert.equal(first.isSetFaceDown, false);
    assert.equal(second.isSetFaceDown, false);
    for (const moved of [host, first, second]) assert.equal(fieldOccurrences(game.field, moved), 1);
  });
}
