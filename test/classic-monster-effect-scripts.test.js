import assert from 'node:assert/strict';
import test from 'node:test';

import { STARTER_CARDS } from '../src/cards.js';
import { CardState } from '../src/core/CardState.js';
import {
  createSanganActivationRestriction,
  getScriptedMonsterEffectTargets,
  getScriptedTriggerDescriptors,
  resolveScriptedMonsterEffect
} from '../src/core/ClassicMonsterEffectScripts.js';
import { DuelGame } from '../src/game.js';

function local(id, side = 'player', uid = `${id}-${side}`) {
  const card = new CardState({ ...STARTER_CARDS.find(entry => entry.id === id), uid });
  card.ownerId = side;
  card.controllerId = side;
  card.location = 'hand';
  return card;
}

function duel(callbacks = {}) {
  const game = new DuelGame(callbacks);
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  return game;
}

function locked(target, event = {}) {
  return { targetCard: target, targetUid: target.uid,
    targetRuntimeInstanceId: target.runtimeInstanceId, targetLocation: target.location, event };
}

test('three canonical scripts trigger only on their exact Flip or field-to-GY events', () => {
  for (const [id, type, effectId] of [
    ['54652250', 'FLIPPED_FACE_UP', 'MAN_EATER_BUG_DESTROY'],
    ['31560081', 'FLIPPED_FACE_UP', 'MAGICIAN_OF_FAITH_RECOVER'],
    ['26202165', 'SENT_FROM_FIELD_TO_GRAVEYARD', 'SANGAN_SEARCH']
  ]) {
    const source = local(id);
    const [descriptor] = getScriptedTriggerDescriptors(source, { type, card: source });
    assert.equal(descriptor.effectId, effectId);
    assert.equal(descriptor.mandatory, true);
    assert.equal(descriptor.requiresTarget, id !== '26202165');
    assert.deepEqual(getScriptedTriggerDescriptors(source, { type: 'SUMMON_SUCCESS' }), []);
    assert.deepEqual(getScriptedTriggerDescriptors(source, { type, card: local(id, 'opponent') }), []);
  }
  assert.deepEqual(getScriptedTriggerDescriptors(local('71625222'), { type: 'FLIPPED_FACE_UP' }), []);
});

test('Man-Eater Bug can target Set monsters but excludes monsters already destroyed by battle and targeting protection', () => {
  const game = duel();
  const source = local('54652250');
  game.field.setMonsterZone('player', 0, source);
  const hidden = local('89631139', 'opponent');
  game.field.setMonsterZone('opponent', 0, hidden);
  hidden.isSetFaceDown = true;
  hidden.getAtk = () => assert.fail('a hidden monster ATK is not public');
  hidden.getDef = () => assert.fail('a hidden monster DEF is not public');
  source.pendingBattleDestruction = true;
  assert.deepEqual(getScriptedMonsterEffectTargets(game, source, 'player'), [hidden]);
  game.defense.addProtection({ card: hidden, cardUid: hidden.uid, type: 'TARGET', independentOfSource: true });
  assert.deepEqual(getScriptedMonsterEffectTargets(game, source, 'player'), []);
});

test('Man-Eater Bug mandatory destruction can destroy itself when it is the only legal target', async () => {
  const game = duel();
  const source = local('54652250');
  game.field.setMonsterZone('player', 0, source);
  assert.equal(await resolveScriptedMonsterEffect(game, source, 'player', locked(source)), true);
  assert.equal(source.location, 'graveyard');
});

test('a locked Flip effect resolves after its source leaves the field and follows a target between Monster Zones', async () => {
  const animations = [];
  const game = duel({ onAnimation: event => animations.push(event) });
  const source = local('54652250');
  const target = local('91152256', 'opponent');
  game.field.setMonsterZone('player', 0, source);
  game.field.setMonsterZone('opponent', 0, target);
  const context = locked(target, { sourceSide: 'player', sourceZoneType: 'main', sourceZoneIndex: 0 });
  game.removeCardFromCurrentZone(source);
  game.field.setExtraMonsterZone(1, 'opponent', target);
  assert.equal(await resolveScriptedMonsterEffect(game, source, 'player', context), true);
  assert.equal(target.location, 'graveyard');
  assert.ok(animations.some(event => event.type === 'flip-destroy-cinematic'
    && event.sourceZoneIndex === 0 && event.zoneType === 'extra' && event.zoneIndex === 1));
});

test('Man-Eater Bug never follows a target that left and returned, and respects destruction protection', async () => {
  const game = duel();
  const source = local('54652250');
  const target = local('91152256', 'opponent');
  game.field.setMonsterZone('opponent', 0, target);
  const stale = locked(target);
  game.removeCardFromCurrentZone(target);
  game.field.setMonsterZone('opponent', 0, target);
  assert.equal(await resolveScriptedMonsterEffect(game, source, 'player', stale), false);
  game.defense.addProtection({ card: target, cardUid: target.uid, type: 'DESTROY_BY_EFFECT', independentOfSource: true });
  assert.equal(await resolveScriptedMonsterEffect(game, source, 'player', locked(target)), false);
  assert.equal(target.location, 'monster_zone');
});

test('Magician of Faith recovers only the locked Spell in its controller GY as a fresh hand instance', async () => {
  const game = duel();
  const source = local('31560081');
  const spell = local('12580477');
  const trap = local('44095762');
  const opposingSpell = local('05318639', 'opponent');
  game.field.sendToGraveyard(spell, 'player');
  game.field.sendToGraveyard(trap, 'player');
  game.field.sendToGraveyard(opposingSpell, 'opponent');
  assert.deepEqual(getScriptedMonsterEffectTargets(game, source, 'player'), [spell]);
  const context = locked(spell);
  const previousInstance = spell.runtimeInstanceId;
  assert.equal(await resolveScriptedMonsterEffect(game, source, 'player', context), true);
  assert.equal(spell.location, 'hand');
  assert.notEqual(spell.runtimeInstanceId, previousInstance);
  assert.equal(game.playerHand.includes(spell), true);
  assert.equal(game.playerGraveyard.includes(spell), false);
  assert.equal(game.opponentGraveyard.includes(opposingSpell), true);
});

test('Magician of Faith does not recover a new GY instance of its former target', async () => {
  const game = duel();
  const source = local('31560081');
  const target = local('12580477');
  game.field.sendToGraveyard(target, 'player');
  const context = locked(target);
  game.field.moveCard(target, 'hand', 'player');
  game.field.sendToGraveyard(target, 'player');
  assert.equal(await resolveScriptedMonsterEffect(game, source, 'player', context), false);
  assert.equal(target.location, 'graveyard');
});

test('Sangan uses original Deck ATK and rejects ? ATK, spells, tokens, and Extra Deck cards', () => {
  const game = duel();
  const source = local('26202165');
  const low = local('91152256');
  low.currentAtk = 4000;
  const high = local('89631139');
  high.currentAtk = 0;
  const unknown = new CardState({ id: 'unknown', uid: 'unknown', type: 'Effect Monster', card_type: 'monster', atk: -1 });
  const token = new CardState({ id: 'token', uid: 'token', type: 'Token', card_type: 'monster', atk: 0 });
  const extra = new CardState({ id: 'extra', uid: 'extra', type: 'Fusion Monster', card_type: 'monster', atk: 0 });
  game.playerDeck = [low, high, unknown, token, extra, local('12580477')];
  assert.deepEqual(getScriptedMonsterEffectTargets(game, source, 'player'), [low]);
});

test('Sangan searches at resolution, reveals the selected result, shuffles, and restricts all copies of that name', async () => {
  const events = [];
  const searched = local('71625222');
  const second = local('71625222', 'player', 'searched-copy');
  const game = duel({ onDecision: request => request.type === 'select-sangan-search' ? searched.uid : undefined,
    onAnimation: event => events.push(event) });
  game.playerDeck = [local('91152256'), searched, local('89631139')];
  game.playerDeck.forEach(card => { card.location = 'deck'; });
  let shuffled = false;
  game.shuffle = deck => { assert.equal(deck, game.playerDeck); shuffled = true; return deck; };
  const source = local('26202165');
  const previousInstance = searched.runtimeInstanceId;
  assert.equal(await resolveScriptedMonsterEffect(game, source, 'player'), true);
  assert.equal(game.playerHand.includes(searched), true);
  assert.equal(game.playerDeck.includes(searched), false);
  assert.notEqual(searched.runtimeInstanceId, previousInstance);
  assert.equal(shuffled, true);
  assert.ok(events.some(event => event.type === 'deck-search-cinematic' && event.targetCard === searched && event.revealed));
  assert.equal(game.defense.isActionProhibited('player', 'ACTIVATE_EFFECT', searched), true);
  assert.equal(game.defense.isActionProhibited('player', 'ACTIVATE_EFFECT', second), true);
  assert.equal(game.defense.isActionProhibited('opponent', 'ACTIVATE_EFFECT', second), false);
  assert.equal(game.defense.isActionProhibited('player', 'SPECIAL_SUMMON', second), false);
  game.defense.clearTurnRestrictions();
  assert.equal(game.defense.isActionProhibited('player', 'ACTIVATE_EFFECT', searched), false);
});

test('Sangan mandatory search cannot be declined, but a changed candidate is never silently replaced', async () => {
  const game = duel({ onDecision: request => request.type === 'select-sangan-search' ? null : undefined });
  const source = local('26202165');
  const target = local('71625222');
  target.location = 'deck';
  game.playerDeck = [target];
  assert.equal(await resolveScriptedMonsterEffect(game, source, 'player'), true);
  game.field.moveCard(target, 'deck', 'player');
  game.playerHand = [];
  game.playerDeck = [target];
  game.callbacks.onDecision = request => {
    if (request.type !== 'select-sangan-search') return undefined;
    target.refreshRuntimeIdentity();
    return target.uid;
  };
  assert.equal(await resolveScriptedMonsterEffect(game, source, 'player'), false);
  assert.equal(game.playerDeck.includes(target), true);
});

test('Sangan same-name restriction covers canonical aliases while allowing different names', () => {
  const game = duel();
  const searched = local('71625222');
  const alias = new CardState({ id: 'different-print', name_en: 'Time Wizard', card_type: 'monster', type: 'Effect Monster' });
  game.defense.addRestriction(createSanganActivationRestriction(searched, 'player', 2));
  assert.equal(game.defense.isActionProhibited('player', 'ACTIVATE_EFFECT', alias), true);
  assert.equal(game.defense.isActionProhibited('player', 'ACTIVATE_EFFECT', local('63977008')), false);
});
