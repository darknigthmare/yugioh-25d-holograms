import test from 'node:test';
import assert from 'node:assert/strict';
import { CardState } from '../src/core/CardState.js';
import { FieldState } from '../src/core/FieldState.js';
import { SummonEngine } from '../src/core/SummonEngine.js';
import { DuelGame } from '../src/game.js';

// Konami Rulebook v10, p. 51: overlays are not cards on the field;
// all leave for the GY when their Xyz leaves, but remain on control/Set.
// https://www.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf
// Fusion/Synchro/Xyz/Link returns to hand redirect to the Extra Deck:
// https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=21529&request_locale=ja
function card(uid, owner = 'player', overrides = {}) {
  const result = new CardState({
    uid, id: uid, name: uid, card_type: 'monster', type: 'Effect Monster',
    atk: 1500, def: 1000, level: 4, desc: '', ...overrides
  });
  result.ownerId = result.controllerId = owner;
  return result;
}

function overlay(field = new FieldState()) {
  const summons = new SummonEngine(field);
  const host = card('utopia', 'player', {
    id: '84013237', type: 'Xyz Effect Monster', extra_type: 'xyz', rank: 4, level: 0
  });
  const own = card('owned-overlay');
  const stolen = card('opponent-overlay', 'opponent', {
    type: 'Pendulum Effect Monster', isPendulumMonster: true
  });
  field.setMonsterZone('opponent', 0, host);
  field.setMonsterZone('opponent', 1, own);
  field.setMonsterZone('opponent', 2, stolen);
  summons.attachXyzMaterials(host, [own, stolen]);
  return { field, summons, host, own, stolen };
}

for (const destination of ['hand', 'deck', 'extra_deck']) {
  test(`returning Utopia to ${destination} returns its owner a face-down Extra Deck card and sends overlays to their owners' GY`, () => {
    const { field, host, own, stolen } = overlay();
    host.wasProperlySpecialSummoned = true;
    const oldIdentity = host.runtimeInstanceId;
    const moved = field.moveCard(host, destination, 'opponent');
    assert.equal(moved.success, true);
    assert.equal(moved.finalDestination, 'extra_deck');
    assert.equal(moved.finalPlayer, 'player');
    assert.equal(host.location, 'extra_deck');
    assert.equal(host.controllerId, 'player');
    assert.equal(host.wasProperlySpecialSummoned, false);
    assert.equal(host.isFaceUpInExtraDeck, false);
    assert.notEqual(host.runtimeInstanceId, oldIdentity);
    assert.equal(field.opponentMonsterZones[0], null);
    assert.deepEqual(host.xyzMaterials, []);
    assert.deepEqual(field.playerGraveyard, [own]);
    assert.deepEqual(field.opponentGraveyard, [stolen]);
    assert.equal(stolen.location, 'graveyard', 'an overlay Pendulum was not on the field');
    assert.deepEqual(field.opponentFaceUpExtraDeck, []);
  });
}

for (const destination of ['graveyard', 'banished']) {
  test(`the generic ${destination} movement cannot skip owner piles or Xyz material disposal`, () => {
    const { field, host, own, stolen } = overlay();
    const moved = field.moveCard(host, destination, 'opponent');
    assert.equal(moved.success, true);
    assert.equal(moved.finalDestination, destination);
    assert.equal(moved.finalPlayer, 'player');
    assert.equal(host.location, destination);
    const pile = destination === 'graveyard' ? field.playerGraveyard : field.playerBanished;
    assert.ok(pile.includes(host));
    assert.equal(field.opponentGraveyard.includes(host), false);
    assert.deepEqual(host.xyzMaterials, []);
    assert.ok(field.playerGraveyard.includes(own));
    assert.deepEqual(field.opponentGraveyard, [stolen]);
  });
}

test('low-level zone transitions also dispose of overlays after the Xyz has left the field', () => {
  const events = [];
  const field = new FieldState({ onTransition: event => {
    if (event.from.location !== 'xyz_material') return;
    events.push(event);
    assert.equal(field.opponentMonsterZones[0], null);
    assert.equal(event.card.location, 'graveyard');
    assert.ok((event.card.ownerId === 'player' ? field.playerGraveyard : field.opponentGraveyard).includes(event.card));
  } });
  const { host, own, stolen } = overlay(field);
  const identities = [own, stolen].map(material => material.runtimeInstanceId);
  field.transitionCard(host, 'extra_deck', 'player');
  assert.deepEqual(host.xyzMaterials, []);
  assert.equal(events.length, 2);
  assert.deepEqual(events.map(event => event.from.runtimeInstanceId), identities);
  assert.ok(events.every(event => event.to.runtimeInstanceId !== event.from.runtimeInstanceId));
});

test('Set and a control change between Main/Extra zones preserve the Xyz stack and all material identities', () => {
  const { field, host, own, stolen } = overlay();
  const identities = [host, own, stolen].map(material => material.runtimeInstanceId);
  host.isSetFaceDown = true; // Book of Moon / Set does not make the Xyz leave.
  host.position = 'defense';
  field.setMonsterZone('player', 3, host);
  field.setExtraMonsterZone(1, 'player', host);
  assert.deepEqual(host.xyzMaterials, [own, stolen]);
  assert.deepEqual([host, own, stolen].map(material => material.runtimeInstanceId), identities);
  assert.equal(host.isSetFaceDown, true);
  assert.deepEqual(field.playerGraveyard, []);
  assert.deepEqual(field.opponentGraveyard, []);
});

test('an Xyz used as a new overlay sends its own materials to the GY instead of nesting them', () => {
  const { field, summons, host, own, stolen } = overlay();
  const next = card('new-xyz', 'opponent', { type: 'Xyz Effect Monster', extra_type: 'xyz', rank: 4 });
  field.setMonsterZone('opponent', 4, next);
  assert.equal(summons.attachXyzMaterials(next, [host]), 1);
  assert.deepEqual(next.xyzMaterials, [host]);
  assert.deepEqual(host.xyzMaterials, []);
  assert.equal(host.location, 'xyz_material');
  assert.deepEqual(field.playerGraveyard, [own]);
  assert.deepEqual(field.opponentGraveyard, [stolen]);
});

test('Utopia destroyed by battle sends Sangan and Pendulum overlays to the GY without Sangan searching', async () => {
  const decisions = [];
  const game = new DuelGame({ onDecision: request => {
    decisions.push(request);
    return false;
  } });
  game.phases.currentPhase = 'battle';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  game.scheduleAction = () => 0;
  const { host, own, stolen } = overlay(game.field);
  own.id = '26202165';
  host.position = 'defense';
  const attacker = card('blue-eyes', 'player', { id: '89631139', atk: 3000 });
  game.field.setMonsterZone('player', 0, attacker);
  const search = card('unused-search');
  game.playerDeck.push(search);
  await game.executeAttack(0, 0);
  assert.ok(game.playerGraveyard.includes(host));
  assert.ok(game.playerGraveyard.includes(own));
  assert.ok(game.opponentGraveyard.includes(stolen));
  assert.deepEqual(host.xyzMaterials, []);
  assert.equal(decisions.some(request => request.type === 'select-sangan-search'), false);
  assert.equal(game.playerHand.includes(search), false);
  assert.equal(game.opponentLP, 8000);
});
