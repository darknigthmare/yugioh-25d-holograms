import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchEngine } from '../src/core/MatchEngine.js';
import { getDeckCopyIdentity } from '../src/core/CardNameRules.js';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';

const CURRENT_LIST = 'TCG_EU_2026_09_21';
const PREVIOUS_LIST = 'TCG_EU_2026_05_18';

function deck(specialCards = []) {
  const mainDeck = [...specialCards];
  while (mainDeck.length < 40) {
    mainDeck.push({ id: `fixture-${mainDeck.length}`, name: 'Fixture', card_type: 'monster', type: 'Normal Monster' });
  }
  return { mainDeck, extraDeck: [], sideDeck: [{ id: 'side-fixture', card_type: 'monster', type: 'Normal Monster' }] };
}

test('fresh and restarted Matches default to the verified September 21 list', () => {
  const match = new MatchEngine();
  assert.equal(match.getMatchState().banlistId, CURRENT_LIST);
  match.startMatch({ decks: { player: deck(), opponent: deck() } });
  assert.equal(match.getMatchState().banlistId, CURRENT_LIST);
  assert.equal(MatchEngine.deserialize(match.serialize()).getMatchState().banlistId, CURRENT_LIST);
  match.resetMatch();
  assert.equal(match.getMatchState().banlistId, CURRENT_LIST);
});

test('a saved May 18 Match preserves its list and resumes legal siding and match results', () => {
  const match = new MatchEngine();
  const playerDeck = deck([{ id: 83764718, name: 'Monster Reborn', card_type: 'spell', type: 'Spell Card' }]);
  match.startMatch({ banlistId: PREVIOUS_LIST, decks: { player: playerDeck, opponent: deck() } });
  match.recordGameResult('player');
  const serialized = match.serialize();
  const restored = MatchEngine.deserialize(serialized);
  assert.deepEqual(restored.getMatchState(), match.getMatchState());
  assert.equal(restored.getMatchState().banlistId, PREVIOUS_LIST);
  const sidedDeck = structuredClone(playerDeck);
  [sidedDeck.mainDeck[0], sidedDeck.sideDeck[0]] = [sidedDeck.sideDeck[0], sidedDeck.mainDeck[0]];
  assert.equal(restored.applySideDeckSwap('player', sidedDeck).valid, true);
  restored.startNextGame({}, 'opponent');
  restored.recordGameResult('player');
  assert.equal(restored.getMatchWinner(), 'player');
  assert.equal(restored.getMatchState().banlistId, PREVIOUS_LIST);
  assert.equal(MatchEngine.deserialize(restored.serialize()).getMatchWinner(), 'player');
});

for (const listId of [CURRENT_LIST, PREVIOUS_LIST]) {
  test(`${listId}: printed and numeric Left Leg identities share the one-copy limit across sections`, () => {
    const match = new MatchEngine();
    const cards = deck([{ id: '07902349', name: 'Left Leg', card_type: 'monster', type: 'Normal Monster' }]);
    assert.equal(match.validateDeck(cards, 'TCG_ADVANCED', listId).valid, true);
    cards.sideDeck[0] = { id: 7902349, name: 'Left Leg', card_type: 'monster', type: 'Normal Monster' };
    const issue = match.validateDeck(cards, 'TCG_ADVANCED', listId).issues.find(entry => entry.cardId === '7902349');
    assert.deepEqual({ code: issue.code, allowed: issue.allowed, found: issue.found }, {
      code: 'COPY_LIMIT_EXCEEDED', allowed: 1, found: 2
    });
  });

  test(`${listId}: local restriction limits stay Pot of Greed zero, Monster Reborn one and others three`, () => {
    const match = new MatchEngine();
    for (const template of [...STARTER_CARDS, ...EXTRA_DECK_CARDS]) {
      const expected = String(template.id) === '55144522' ? 0
        : String(template.id) === '83764718' ? 1 : 3;
      const cards = deck();
      if (template.belongsInExtraDeck || template.extra_type) {
        cards.extraDeck = Array.from({ length: expected + 1 }, () => ({ ...template }));
      } else {
        cards.mainDeck.splice(0, expected + 1, ...Array.from({ length: expected + 1 }, () => ({ ...template })));
      }
      const issue = match.validateDeck(cards, 'TCG_ADVANCED', listId).issues.find(entry => (
        entry.code === 'COPY_LIMIT_EXCEEDED'
        && entry.cardId === getDeckCopyIdentity(template)
      ));
      assert.equal(issue?.allowed, expected, `${template.name_en}: verified limit`);
      assert.equal(issue?.found, expected + 1);
    }
  });
}
