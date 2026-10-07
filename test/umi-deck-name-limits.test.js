import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_CARDS } from '../src/cards.js';
import { MatchEngine } from '../src/core/MatchEngine.js';
import { canAddDeckBuilderCard, validateCustomDeck } from '../src/ui/DeckBuilderRules.js';

const card = id => STARTER_CARDS.find(value => String(value.id) === id);
function deck() {
  return { mainDeck: STARTER_CARDS.filter(value => value.type === 'Normal Monster').slice(0, 20).flatMap(value => [value, value]), extraDeck: [], sideDeck: [] };
}

test('Umi and A Legendary Ocean share three copies across Main and Side before adding or registering', () => {
  const value = deck();
  value.mainDeck.splice(0, 2, card('22702055'), card('295517'));
  value.sideDeck = [{ ...card('295517'), id: '00295517' }];
  assert.equal(validateCustomDeck(value).valid, true);
  for (const id of ['22702055', '295517']) {
    assert.equal(canAddDeckBuilderCard(value, card(id), 'mainDeck').allowed, false);
    assert.equal(canAddDeckBuilderCard(value, card(id), 'sideDeck').allowed, false);
  }
  value.sideDeck.push(card('22702055'));
  const issue = new MatchEngine().validateDeck(value).issues.find(value => value.code === 'COPY_LIMIT_EXCEEDED');
  assert.deepEqual({ id: issue.cardId, found: issue.found, allowed: issue.allowed }, { id: '22702055', found: 4, allowed: 3 });
  assert.equal(validateCustomDeck(value).valid, false);
});

test('permanent name does not allow substituting the physical registered card during Side Deck exchange', () => {
  const original = deck();
  original.mainDeck[0] = card('295517');
  const candidate = { ...original, mainDeck: [...original.mainDeck] };
  candidate.mainDeck[0] = card('22702055');
  const validation = new MatchEngine().validateSideDeckSwap(original, candidate);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some(issue => issue.code === 'SIDE_DECK_POOL_CHANGED'));
  assert.equal(new MatchEngine().validateSideDeckSwap(original, original).valid, true);
});
