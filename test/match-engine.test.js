import test from 'node:test';
import assert from 'node:assert/strict';

import { MatchEngine } from '../src/core/MatchEngine.js';

function mainCard(id, overrides = {}) {
  return {
    id: String(id),
    name: `Main ${id}`,
    type: 'Effect Monster',
    card_type: 'monster',
    ...overrides
  };
}

function extraCard(id, overrides = {}) {
  return {
    id: String(id),
    name: `Extra ${id}`,
    type: 'Fusion Monster',
    card_type: 'monster',
    belongsInExtraDeck: true,
    ...overrides
  };
}

function legalDeck(prefix = '1') {
  return {
    mainDeck: Array.from({ length: 40 }, (_, index) => mainCard(`${prefix}0${index + 1}`)),
    extraDeck: Array.from({ length: 3 }, (_, index) => extraCard(`${prefix}8${index + 1}`)),
    sideDeck: [
      mainCard(`${prefix}901`),
      mainCard(`${prefix}902`),
      extraCard(`${prefix}903`)
    ]
  };
}

function swapCards(deck, firstSection, firstIndex, secondSection, secondIndex) {
  const result = structuredClone(deck);
  const first = result[firstSection][firstIndex];
  result[firstSection][firstIndex] = result[secondSection][secondIndex];
  result[secondSection][secondIndex] = first;
  return result;
}

test('deck validation enforces Main, Extra, and Side size boundaries', () => {
  const match = new MatchEngine();
  const deck = legalDeck();

  assert.equal(match.validateDeck(deck).valid, true);

  const tooSmall = structuredClone(deck);
  tooSmall.mainDeck.pop();
  assert.ok(match.validateDeck(tooSmall).issues.some(issue => issue.code === 'INVALID_MAIN_SIZE'));

  const tooLarge = structuredClone(deck);
  while (tooLarge.mainDeck.length <= 60) {
    tooLarge.mainDeck.push(mainCard(`6${tooLarge.mainDeck.length}`));
  }
  assert.ok(match.validateDeck(tooLarge).issues.some(issue => issue.code === 'INVALID_MAIN_SIZE'));

  const extraOverflow = structuredClone(deck);
  while (extraOverflow.extraDeck.length <= 15) {
    extraOverflow.extraDeck.push(extraCard(`7${extraOverflow.extraDeck.length}`));
  }
  assert.ok(match.validateDeck(extraOverflow).issues.some(issue => issue.code === 'INVALID_EXTRA_SIZE'));

  const sideOverflow = structuredClone(deck);
  while (sideOverflow.sideDeck.length <= 15) {
    sideOverflow.sideDeck.push(mainCard(`8${sideOverflow.sideDeck.length}`));
  }
  assert.ok(match.validateDeck(sideOverflow).issues.some(issue => issue.code === 'INVALID_SIDE_SIZE'));
});

test('copy and banlist limits are counted across Main, Extra, and Side together', () => {
  const match = new MatchEngine();
  const fourCopies = legalDeck();
  fourCopies.mainDeck[0] = mainCard('777');
  fourCopies.mainDeck[1] = mainCard('777');
  fourCopies.mainDeck[2] = mainCard('777');
  fourCopies.sideDeck[0] = mainCard('777');

  const limitedAcrossSections = legalDeck();
  limitedAcrossSections.mainDeck[0] = mainCard('83764718', { name: 'Monster Reborn', type: 'Spell Card' });
  limitedAcrossSections.sideDeck[0] = mainCard('83764718', { name: 'Monster Reborn', type: 'Spell Card' });

  const copyIssue = match.validateDeck(fourCopies).issues.find(
    issue => issue.code === 'COPY_LIMIT_EXCEEDED' && issue.cardId === '777'
  );
  assert.deepEqual(
    { allowed: copyIssue.allowed, found: copyIssue.found },
    { allowed: 3, found: 4 }
  );

  const limitedIssue = match.validateDeck(limitedAcrossSections).issues.find(
    issue => issue.code === 'COPY_LIMIT_EXCEEDED' && issue.cardId === '83764718'
  );
  assert.deepEqual(
    { allowed: limitedIssue.allowed, found: limitedIssue.found },
    { allowed: 1, found: 2 }
  );
});

test('Side Deck exchanges are one-for-one and cannot alter the registered pool', () => {
  const match = new MatchEngine();
  const registered = legalDeck();
  const legalSwap = swapCards(registered, 'mainDeck', 0, 'sideDeck', 0);

  assert.equal(match.validateSideDeckSwap(registered, legalSwap).valid, true);

  const changedSize = structuredClone(legalSwap);
  changedSize.mainDeck.push(changedSize.sideDeck.pop());
  assert.ok(
    match.validateSideDeckSwap(registered, changedSize).issues.some(
      issue => issue.code === 'SIDE_DECK_SIZE_CHANGED'
    )
  );

  const foreignCard = structuredClone(legalSwap);
  foreignCard.mainDeck[0] = mainCard('999999');
  assert.ok(
    match.validateSideDeckSwap(registered, foreignCard).issues.some(
      issue => issue.code === 'SIDE_DECK_POOL_CHANGED'
    )
  );
});

test('first-to-two score uses each recorded first-player choice and produces a 2-1 winner', () => {
  const match = new MatchEngine();
  let state = match.startMatch({
    playerIds: ['yugi', 'kaiba'],
    firstPlayerId: 'yugi'
  });

  assert.equal(state.gameNumber, 1);
  assert.equal(state.currentFirstPlayerId, 'yugi');

  state = match.recordGameResult('yugi');
  assert.deepEqual(state.scores, { yugi: 1, kaiba: 0 });
  assert.equal(state.status, 'between_games');

  state = match.startNextGame({}, 'yugi');
  assert.equal(state.gameNumber, 2);
  assert.equal(state.currentFirstPlayerId, 'yugi');

  match.recordGameResult('kaiba');
  state = match.startNextGame({}, 'kaiba');
  assert.equal(state.gameNumber, 3);
  assert.equal(state.currentFirstPlayerId, 'kaiba');

  state = match.recordGameResult('yugi');
  assert.deepEqual(state.scores, { yugi: 2, kaiba: 1 });
  assert.equal(state.status, 'complete');
  assert.equal(state.winnerId, 'yugi');
  assert.equal(match.isMatchOver(), true);
  assert.throws(() => match.startNextGame(), /next game/i);
});

test('drawn Duels can extend a Match to Duel 4 and serialization preserves the chosen starters', () => {
  const match = new MatchEngine();
  match.startMatch({
    playerIds: ['yugi', 'kaiba'],
    firstPlayerId: 'yugi'
  });

  match.recordGameResult('yugi');
  match.startNextGame({}, 'yugi');
  match.recordGameResult('draw');
  match.startNextGame({}, 'kaiba');
  const afterDuelThree = match.recordGameResult('kaiba');

  assert.deepEqual(afterDuelThree.scores, { yugi: 1, kaiba: 1 });
  assert.equal(afterDuelThree.status, 'between_games');
  assert.equal(afterDuelThree.gameNumber, 3);
  assert.deepEqual(
    afterDuelThree.games.map(game => game.firstPlayerId),
    ['yugi', 'yugi', 'kaiba']
  );

  const duelFour = match.startNextGame({}, 'kaiba');
  assert.equal(duelFour.gameNumber, 4);
  assert.equal(duelFour.currentFirstPlayerId, 'kaiba');
  assert.deepEqual(
    MatchEngine.deserialize(match.serialize()).getMatchState(),
    match.getMatchState()
  );

  const complete = match.recordGameResult('yugi');
  assert.equal(complete.status, 'complete');
  assert.equal(complete.winnerId, 'yugi');
});

test('Side Deck application is transactional when starting the next game', () => {
  const match = new MatchEngine();
  const yugiDeck = legalDeck('2');
  const kaibaDeck = legalDeck('3');
  const sidedYugiDeck = swapCards(yugiDeck, 'mainDeck', 0, 'sideDeck', 0);

  match.startMatch({
    playerIds: ['yugi', 'kaiba'],
    decks: {
      yugi: yugiDeck,
      kaiba: kaibaDeck
    }
  });
  match.recordGameResult('kaiba');

  const illegalKaibaDeck = structuredClone(kaibaDeck);
  illegalKaibaDeck.mainDeck[0] = mainCard('999999');
  const rejected = match.startNextGame({
    yugi: sidedYugiDeck,
    kaiba: illegalKaibaDeck
  }, 'yugi');
  assert.equal(rejected.valid, false);
  assert.equal(match.getMatchState().status, 'between_games');
  assert.equal(match.getActiveDeck('yugi').mainDeck[0].id, yugiDeck.mainDeck[0].id);

  const state = match.startNextGame({ yugi: sidedYugiDeck }, 'yugi');
  assert.equal(state.activeDecks.yugi.mainDeck[0].id, yugiDeck.sideDeck[0].id);
  assert.equal(state.activeDecks.yugi.mainDeck.length, yugiDeck.mainDeck.length);
  assert.equal(state.activeDecks.yugi.sideDeck.length, yugiDeck.sideDeck.length);
});

test('serialization restores a coherent match and rejects tampering without mutation', () => {
  const match = new MatchEngine();
  const yugiDeck = legalDeck('4');
  const kaibaDeck = legalDeck('5');
  const sidedYugiDeck = swapCards(yugiDeck, 'mainDeck', 0, 'sideDeck', 0);

  match.startMatch({
    playerIds: ['yugi', 'kaiba'],
    firstPlayerId: 'kaiba',
    decks: {
      yugi: yugiDeck,
      kaiba: kaibaDeck
    }
  });
  match.recordGameResult('yugi');
  match.startNextGame({ yugi: sidedYugiDeck }, 'yugi');

  const serialized = match.serialize();
  const restored = MatchEngine.deserialize(serialized);
  assert.deepEqual(restored.getMatchState(), match.getMatchState());
  assert.equal(restored.firstPlayerId, 'yugi');

  const beforeTampering = restored.getMatchState();
  const tampered = JSON.parse(serialized);
  tampered.state.scores.yugi = 2;

  assert.throws(() => restored.restore(JSON.stringify(tampered)), /scores/i);
  assert.deepEqual(restored.getMatchState(), beforeTampering);

  restored.recordGameResult('yugi');
  assert.equal(restored.getMatchWinner(), 'yugi');
});
