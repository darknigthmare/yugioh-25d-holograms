import test from 'node:test';
import assert from 'node:assert/strict';

import { MatchController } from '../src/ui/MatchController.js';

function mainCard(id, overrides = {}) {
  return {
    id: String(id),
    name: `Main ${id}`,
    type: 'Effect Monster',
    card_type: 'monster',
    ...overrides
  };
}

function extraCard(id) {
  return {
    id: String(id),
    name: `Extra ${id}`,
    type: 'Xyz Monster',
    card_type: 'monster',
    belongsInExtraDeck: true
  };
}

function legalDeck(prefix) {
  return {
    mainDeck: Array.from({ length: 40 }, (_, index) => mainCard(`${prefix}1${index + 10}`)),
    extraDeck: Array.from({ length: 3 }, (_, index) => extraCard(`${prefix}8${index + 10}`)),
    sideDeck: [
      mainCard(`${prefix}901`),
      mainCard(`${prefix}902`),
      extraCard(`${prefix}903`)
    ]
  };
}

function swap(deck, firstSection, firstIndex, secondSection, secondIndex) {
  const candidate = structuredClone(deck);
  [
    candidate[firstSection][firstIndex],
    candidate[secondSection][secondIndex]
  ] = [
    candidate[secondSection][secondIndex],
    candidate[firstSection][firstIndex]
  ];
  return candidate;
}

function startRegisteredMatch(controller = new MatchController()) {
  const yugiDeck = legalDeck('2');
  const kaibaDeck = legalDeck('3');
  const view = controller.startMatch({
    playerIds: ['yugi', 'kaiba'],
    playerLabels: { yugi: 'Yugi', kaiba: 'Kaiba' },
    firstPlayerId: 'yugi',
    initialDecisionPlayerId: 'kaiba',
    decks: {
      yugi: yugiDeck,
      kaiba: kaibaDeck
    }
  });
  return { controller, view, yugiDeck, kaibaDeck };
}

test('starts a best-of-three and exposes a detached Duel launch/view model', () => {
  const { controller, view } = startRegisteredMatch();

  assert.equal(view.mode, 'best_of_three');
  assert.equal(view.screen, 'duel');
  assert.equal(view.bestOf, 3);
  assert.deepEqual(view.scores, { yugi: 0, kaiba: 0 });
  assert.deepEqual(view.currentDuel, {
    gameNumber: 1,
    firstPlayerId: 'yugi',
    decisionPlayerId: 'kaiba',
    completed: false
  });

  const launch = controller.getDuelLaunchConfig();
  assert.equal(launch.firstPlayerId, 'yugi');
  assert.equal(launch.decisionPlayerId, 'kaiba');
  assert.equal(launch.decks.yugi.mainDeck.length, 40);
  launch.decks.yugi.mainDeck.pop();
  assert.equal(controller.getDuelLaunchConfig().decks.yugi.mainDeck.length, 40);
});

test('the previous Duel loser may choose either Duelist to go first', () => {
  const { controller } = startRegisteredMatch();

  let view = controller.recordDuelResult('yugi');
  assert.equal(view.screen, 'side_deck');
  assert.equal(view.nextDuel.chooserPlayerId, 'kaiba');
  assert.equal(view.nextDuel.firstPlayerDecisionRequired, true);
  assert.throws(
    () => controller.chooseFirstPlayer('yugi', 'yugi'),
    /entitled/i
  );

  view = controller.chooseFirstPlayer('kaiba', 'yugi');
  assert.equal(view.nextDuel.firstPlayerId, 'yugi');
  assert.equal(view.actions.canStartNextDuel, true);

  const prepared = controller.prepareNextDuel();
  assert.equal(prepared.valid, true);
  assert.equal(prepared.launch.gameNumber, 2);
  assert.equal(prepared.launch.firstPlayerId, 'yugi');
  assert.equal(prepared.launch.decisionPlayerId, 'kaiba');
});

test('after every draw, a new random method determines who receives the next choice', () => {
  const { controller } = startRegisteredMatch();

  let view = controller.recordDuelResult(null);
  assert.equal(view.nextDuel.randomDecisionRequired, true);
  assert.equal(view.nextDuel.chooserPlayerId, null);
  const restoredDraw = MatchController.deserialize(controller.serialize());
  assert.equal(restoredDraw.getViewModel().nextDuel.randomDecisionRequired, true);
  assert.equal(restoredDraw.getViewModel().nextDuel.chooserPlayerId, null);
  assert.throws(
    () => controller.chooseFirstPlayer('kaiba', 'kaiba'),
    /random method/i
  );
  view = controller.recordRandomMethodWinner('yugi');
  assert.equal(view.nextDuel.randomDecisionRequired, false);
  assert.equal(view.nextDuel.chooserPlayerId, 'yugi');
  controller.chooseFirstPlayer('yugi', 'kaiba');
  controller.prepareNextDuel();

  view = controller.recordDuelResult('draw');
  assert.equal(view.nextDuel.randomDecisionRequired, true);
  assert.equal(view.nextDuel.chooserPlayerId, null);
  controller.recordRandomMethodWinner('kaiba');
  view = controller.chooseFirstPlayer('kaiba', 'yugi');
  assert.equal(view.nextDuel.firstPlayerId, 'yugi');
});

test('Side Deck drafts are legal, detached, and committed only with the next Duel', () => {
  const { controller, yugiDeck, kaibaDeck } = startRegisteredMatch();
  controller.recordDuelResult('kaiba');
  const sidedYugi = swap(yugiDeck, 'mainDeck', 0, 'sideDeck', 0);

  const staged = controller.stageSideDeck('yugi', sidedYugi);
  assert.equal(staged.valid, true);
  assert.equal(
    controller.engine.getActiveDeck('yugi').mainDeck[0].id,
    yugiDeck.mainDeck[0].id
  );

  sidedYugi.mainDeck[0].name = 'mutated outside';
  const editor = controller.getSideDeckEditorModel('yugi');
  assert.notEqual(editor.draftDeck.mainDeck[0].name, 'mutated outside');
  assert.equal(editor.hasStagedChanges, true);
  assert.deepEqual(editor.sectionSizes, { mainDeck: 40, extraDeck: 3, sideDeck: 3 });

  const illegalKaiba = structuredClone(kaibaDeck);
  illegalKaiba.mainDeck[0] = mainCard('999999999');
  const rejectedStage = controller.stageSideDeck('kaiba', illegalKaiba);
  assert.equal(rejectedStage.valid, false);
  assert.equal(
    controller.getSideDeckEditorModel('yugi').hasStagedChanges,
    true,
    'another rejected draft must not erase the valid player draft'
  );

  controller.chooseFirstPlayer('yugi', 'kaiba');
  const prepared = controller.prepareNextDuel();
  assert.equal(prepared.valid, true);
  assert.equal(
    prepared.launch.decks.yugi.mainDeck[0].id,
    yugiDeck.sideDeck[0].id
  );
});

test('inline Side Deck configurations are committed atomically', () => {
  const { controller, yugiDeck, kaibaDeck } = startRegisteredMatch();
  controller.recordDuelResult('kaiba');
  controller.chooseFirstPlayer('yugi', 'yugi');

  const sidedYugi = swap(yugiDeck, 'mainDeck', 0, 'sideDeck', 0);
  const illegalKaiba = structuredClone(kaibaDeck);
  illegalKaiba.mainDeck[0] = mainCard('new-card');
  const rejected = controller.prepareNextDuel({
    yugi: sidedYugi,
    kaiba: illegalKaiba
  });

  assert.equal(rejected.valid, false);
  assert.equal(controller.getViewModel().status, 'between_games');
  assert.equal(controller.getViewModel().nextDuel.firstPlayerId, 'yugi');
  assert.equal(
    controller.engine.getActiveDeck('yugi').mainDeck[0].id,
    yugiDeck.mainDeck[0].id
  );
});

test('a 2-0 result completes the match and exposes the winner', () => {
  const { controller } = startRegisteredMatch();

  controller.recordDuelResult('yugi');
  controller.chooseFirstPlayer('kaiba', 'kaiba');
  controller.prepareNextDuel();
  const completed = controller.recordDuelResult('yugi');

  assert.equal(completed.status, 'complete');
  assert.equal(completed.screen, 'complete');
  assert.equal(completed.winnerId, 'yugi');
  assert.deepEqual(completed.scores, { yugi: 2, kaiba: 0 });
  assert.equal(completed.actions.canStartNextDuel, false);
  assert.equal(controller.getDuelLaunchConfig(), null);
});

test('Duel 1 win, Duel 2 draw, and Duel 3 opposite win prepares Duel 4', () => {
  const { controller } = startRegisteredMatch();

  controller.recordDuelResult('yugi');
  controller.chooseFirstPlayer('kaiba', 'yugi');
  controller.prepareNextDuel();

  let view = controller.recordDuelResult('draw');
  assert.equal(view.nextDuel.randomDecisionRequired, true);
  controller.recordRandomMethodWinner('yugi');
  controller.chooseFirstPlayer('yugi', 'kaiba');
  controller.prepareNextDuel();

  view = controller.recordDuelResult('kaiba');
  assert.equal(view.status, 'between_games');
  assert.equal(view.gameNumber, 3);
  assert.deepEqual(view.scores, { yugi: 1, kaiba: 1 });
  assert.equal(view.nextDuel.gameNumber, 4);
  assert.equal(view.nextDuel.chooserPlayerId, 'yugi');

  controller.chooseFirstPlayer('yugi', 'kaiba');
  const duelFour = controller.prepareNextDuel();
  assert.equal(duelFour.launch.gameNumber, 4);
  assert.equal(duelFour.launch.firstPlayerId, 'kaiba');
});

test('serialization restores decisions, Side Deck drafts, labels, and launch state', () => {
  const { controller, yugiDeck } = startRegisteredMatch();
  controller.recordDuelResult('kaiba');
  controller.stageSideDeck('yugi', swap(yugiDeck, 'mainDeck', 0, 'sideDeck', 0));
  controller.chooseFirstPlayer('yugi', 'yugi');

  const restored = MatchController.deserialize(controller.serialize());
  assert.deepEqual(restored.getViewModel(), controller.getViewModel());
  assert.deepEqual(
    restored.getSideDeckEditorModel('yugi'),
    controller.getSideDeckEditorModel('yugi')
  );

  const next = restored.prepareNextDuel();
  assert.equal(next.valid, true);
  assert.equal(next.launch.firstPlayerId, 'yugi');
  assert.equal(next.launch.decks.yugi.mainDeck[0].id, yugiDeck.sideDeck[0].id);
});

test('tampered controller saves are rejected without mutating live state', () => {
  const { controller } = startRegisteredMatch();
  controller.recordDuelResult('yugi');
  const before = controller.serialize();

  const wrongChooser = JSON.parse(before);
  wrongChooser.controller.pendingFirstPlayerDecision.chooserPlayerId = 'yugi';
  assert.throws(
    () => controller.restore(wrongChooser),
    /chooser|entitled/i
  );
  assert.equal(controller.serialize(), before);

  const wrongHistory = JSON.parse(before);
  wrongHistory.controller.duelDecisions[0].firstPlayerId = 'kaiba';
  assert.throws(
    () => controller.restore(wrongHistory),
    /opening/i
  );
  assert.equal(controller.serialize(), before);
});

test('first-player choice is required before advancing to the next Duel', () => {
  const { controller } = startRegisteredMatch();
  controller.recordDuelResult('kaiba');

  assert.throws(
    () => controller.prepareNextDuel(),
    /choose who goes first/i
  );
  assert.equal(controller.getViewModel().status, 'between_games');
});
