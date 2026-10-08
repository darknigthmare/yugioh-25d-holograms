import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { DefensiveEngine } from '../src/core/DefensiveEngine.js';

function card(uid, overrides = {}) {
  const instance = new CardState({
    uid, id: uid, name: uid, name_en: uid, card_type: 'monster',
    type: 'Effect Monster', atk: 1500, def: 1200, level: 4,
    ...overrides
  });
  instance.ownerId = 'player';
  instance.controllerId = 'player';
  return instance;
}

function duel(callbacks = {}) {
  const game = new DuelGame(callbacks);
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  game.startPhaseFlow = () => {};
  return game;
}

function exodiaParts(side, legId = '07902349') {
  return ['33396948', legId, 44519536, '15303296', 70903634].map((id, index) => {
    const piece = card(`${side}-exodia-${index}`, { id, type: 'Normal Monster' });
    piece.ownerId = side;
    piece.controllerId = side;
    piece.location = 'hand';
    return piece;
  });
}

// Left Leg's printed passcode is 07902349; database card:
// https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4024&request_locale=en
for (const side of ['player', 'opponent']) {
  test(`the real duel recognizes ${side} Exodia with mixed numeric and eight-digit printed passcodes`, () => {
    const outcomes = [];
    const game = duel({ onGameOver: (...args) => outcomes.push(args) });
    game[`${side}Hand`] = exodiaParts(side);
    game.stateChanged();
    assert.equal(game.winner, side);
    assert.equal(outcomes.length, 1);
  });
}

test('printed passcodes do not let malformed identities or duplicate Exodia pieces satisfy a missing leg', () => {
  for (const legId of ['07902349x', '7.902349e6', '33396948']) {
    const game = duel();
    game.playerHand = exodiaParts('player', legId);
    game.stateChanged();
    assert.equal(game.winner, null, `invalid leg ${legId}`);
  }
});

test('a restriction cannot run a card-specific filter for another player or action', () => {
  const game = duel();
  const pot = card('pot', { id: '55144522', card_type: 'spell', type: 'Spell Card', race: 'Normal' });
  game.playerDeck = [card('draw-one'), card('draw-two')];
  const wrongScope = () => { throw new Error('unrelated restriction filter evaluated'); };
  game.defense.addRestriction({ playerId: 'opponent', actionType: 'ACTIVATE_EFFECT', filter: wrongScope });
  game.defense.addRestriction({ playerId: 'player', actionType: 'SPECIAL_SUMMON', filter: wrongScope });
  assert.equal(game.canActivateSpell(pot, 'player'), true);
  game.defense.addRestriction({ playerId: 'both', actionType: 'ACTIVATE_EFFECT', filter: source => source === pot });
  assert.equal(game.canActivateSpell(pot, 'player'), false);
});

test('real Book of Moon target preparation ignores unrelated destruction and other-card protections', () => {
  const game = duel();
  const target = card('book-target');
  const other = card('other-card');
  const book = card('book', { id: '14087893', card_type: 'spell', type: 'Spell Card', race: 'Quick-Play' });
  game.field.setMonsterZone('player', 0, target);
  const wrongScope = () => { throw new Error('unrelated protection filter evaluated'); };
  game.defense.addProtection({ cardUid: target.uid, card: target, type: 'DESTROY_BY_EFFECT', filter: wrongScope });
  game.defense.addProtection({ cardUid: other.uid, card: other, type: 'TARGET', filter: wrongScope });
  assert.deepEqual(game.getSpellTargetCandidates(book, 'player'), [target]);
  game.defense.addProtection({ cardUid: target.uid, card: target, type: 'TARGET', filter: context => context.sourceCard === book });
  assert.deepEqual(game.getSpellTargetCandidates(book, 'player'), []);
});

test('inactive continuous protections suspend their filters and resume when their same source becomes face-up', () => {
  const defense = new DefensiveEngine();
  const target = card('recipient');
  const source = card('continuous-source', { card_type: 'spell', type: 'Spell Card', race: 'Continuous' });
  let filterCalls = 0;
  defense.addProtection({
    cardUid: target.uid, card: target, sourceCard: source, type: 'TARGET',
    filter: () => { filterCalls += 1; return true; }
  });
  source.isSetFaceDown = true;
  assert.equal(defense.hasProtection(target, 'TARGET'), false);
  assert.equal(filterCalls, 0);
  source.isSetFaceDown = false;
  target.effectNegated = true;
  assert.equal(defense.hasProtection(target, 'TARGET'), true);
  assert.equal(filterCalls, 1);
  source.effectNegated = true;
  assert.equal(defense.hasProtection(target, 'TARGET'), false);
  assert.equal(filterCalls, 1);
  source.effectNegated = false;
  target.resetForZoneChange('graveyard');
  assert.equal(defense.hasProtection(target, 'TARGET'), false);
  assert.equal(filterCalls, 1);
});

test('a stale instance replacement never evaluates eligibility or consumes its alternative cost', () => {
  const defense = new DefensiveEngine();
  const target = card('replacement-target');
  let filterCalls = 0;
  let costsPaid = 0;
  defense.addReplacement({
    cardUid: target.uid, card: target, triggerType: 'DESTROY',
    filter: () => { filterCalls += 1; return true; },
    replaceFn: () => { costsPaid += 1; return true; }
  });
  target.resetForZoneChange('graveyard');
  const event = { type: 'DESTROY', reason: 'effect', targetCard: target };
  assert.equal(defense.tryReplaceEvent(event), event);
  assert.equal(event.replaced, undefined);
  assert.equal(filterCalls, 0);
  assert.equal(costsPaid, 0);
});
