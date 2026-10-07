import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { MatchEngine } from '../src/core/MatchEngine.js';
import { canAddDeckBuilderCard, getDeckBuilderCopyLimit, validateCustomDeck } from '../src/ui/DeckBuilderRules.js';

const template = id => [...STARTER_CARDS, ...EXTRA_DECK_CARDS].find(card => Number(card.id) === Number(id));
function legalDeck() {
  const normals = STARTER_CARDS.filter(card => card.card_type === 'monster'
    && card.type === 'Normal Monster');
  assert.ok(normals.length >= 20);
  return { mainDeck: normals.slice(0, 20).flatMap(card => [card, card]), extraDeck: [], sideDeck: [] };
}

test('a custom strict deck uses exactly the same Advanced section/copy validation as a Match', () => {
  const deck = legalDeck();
  const match = new MatchEngine();
  assert.equal(validateCustomDeck(deck).valid, true);
  assert.deepEqual(validateCustomDeck(deck).issues, match.validateDeck(deck).issues);
});

test('Forbidden and Limited cards use the current list, while Sandbox keeps three copies', () => {
  assert.equal(getDeckBuilderCopyLimit(template('55144522')), 0);
  assert.equal(getDeckBuilderCopyLimit(template('83764718')), 1);
  assert.equal(getDeckBuilderCopyLimit(template('89631139')), 3);
  assert.equal(getDeckBuilderCopyLimit(template('55144522'), 'sandbox'), 3);
  assert.equal(getDeckBuilderCopyLimit(template('83764718'), 'sandbox'), 3);
  assert.equal(canAddDeckBuilderCard(legalDeck(), template('55144522'), 'mainDeck').allowed, false);
});

for (const section of ['mainDeck', 'sideDeck']) {
  test(`Monster Reborn is counted across Main and Side before adding to ${section}`, () => {
    const deck = legalDeck();
    deck.sideDeck = [template('83764718')];
    const result = canAddDeckBuilderCard(deck, template('83764718'), section);
    assert.equal(result.allowed, false);
    assert.equal(result.copyLimit, 1);
    assert.match(result.message, /Main, Extra et Side/);
  });
}

test('a third copy in Side prevents a fourth copy in Main', () => {
  const deck = legalDeck();
  const own = deck.mainDeck[0];
  deck.sideDeck = [own];
  assert.equal(canAddDeckBuilderCard(deck, own, 'mainDeck').allowed, false);
  deck.sideDeck = [];
  assert.equal(canAddDeckBuilderCard(deck, own, 'sideDeck').allowed, true);
});

test('numeric and printed zero-prefixed passcodes share their copy limit', () => {
  const own = template('05053103');
  const deck = legalDeck();
  deck.mainDeck = deck.mainDeck.filter(card => Number(card.id) !== Number(own.id));
  deck.sideDeck = [own, { ...own, id: 5053103 }, { ...own, id: '005053103' }];
  assert.equal(canAddDeckBuilderCard(deck, own, 'mainDeck').allowed, false);
});

test('Main and Extra placement follow the real card classification, but both can go in Side', () => {
  const deck = { mainDeck: [], extraDeck: [], sideDeck: [] };
  const extra = EXTRA_DECK_CARDS[0];
  const normal = template('89631139');
  assert.equal(canAddDeckBuilderCard(deck, extra, 'mainDeck').allowed, false);
  assert.equal(canAddDeckBuilderCard(deck, normal, 'extraDeck').allowed, false);
  assert.equal(canAddDeckBuilderCard(deck, extra, 'extraDeck').allowed, true);
  assert.equal(canAddDeckBuilderCard(deck, extra, 'sideDeck').allowed, true);
  assert.equal(canAddDeckBuilderCard(deck, normal, 'sideDeck').allowed, true);
});

for (const [section, count] of [['mainDeck', 60], ['extraDeck', 15], ['sideDeck', 15]]) {
  test(`${section} refuses a card beyond its ${count}-card maximum before mutation`, () => {
    const candidates = section === 'extraDeck' ? EXTRA_DECK_CARDS : STARTER_CARDS;
    const normal = section === 'extraDeck' ? EXTRA_DECK_CARDS[0] : template('89631139');
    const fillers = candidates.filter(card => Number(card.id) !== Number(normal.id));
    const deck = { mainDeck: [], extraDeck: [], sideDeck: [] };
    deck[section] = Array.from({ length: count }, (_, index) => fillers[index % fillers.length]);
    const before = [...deck[section]];
    assert.equal(canAddDeckBuilderCard(deck, normal, section).allowed, false);
    assert.deepEqual(deck[section], before);
  });
}

test('strict refuses unsupported card procedures and malformed sections', () => {
  const deck = legalDeck();
  const unsupported = { ...template('89631139'), id: '12345678', name: 'Outside pool' };
  assert.equal(canAddDeckBuilderCard(deck, unsupported, 'mainDeck').allowed, false);
  assert.equal(canAddDeckBuilderCard(deck, unsupported, 'mainDeck', 'sandbox').allowed, true);
  assert.equal(canAddDeckBuilderCard(deck, unsupported, '__proto__').allowed, false);
  deck.mainDeck[0] = unsupported;
  assert.ok(validateCustomDeck(deck).issues.some(issue => issue.code === 'UNSUPPORTED_STRICT_CARD'));
  assert.equal(validateCustomDeck({ mainDeck: {}, extraDeck: [], sideDeck: [] }).valid, false);
});

test('saved Sandbox copies cannot silently start a strict Duel or Match', () => {
  const deck = legalDeck();
  deck.mainDeck[0] = template('55144522');
  deck.sideDeck = [template('83764718'), template('83764718')];
  assert.equal(validateCustomDeck(deck, 'sandbox').valid, true);
  const validation = validateCustomDeck(deck, 'strict');
  assert.equal(validation.valid, false);
  assert.match(validation.message, /interdite/);
  assert.equal(new MatchEngine().validateDeck(deck).valid, false);
});

test('Side size and combined copies are validated without altering saved cards', () => {
  const deck = legalDeck();
  deck.sideDeck = deck.mainDeck.filter((_, index) => index % 2 === 0).slice(0, 16);
  const before = JSON.stringify(deck);
  const result = validateCustomDeck(deck);
  assert.equal(result.valid, false);
  assert.match(result.message, /Side Deck/);
  assert.equal(JSON.stringify(deck), before);
});

test('the custom Side Deck is registered and survives Match serialization and legal siding', () => {
  const deck = legalDeck();
  deck.sideDeck = [deck.mainDeck[0], EXTRA_DECK_CARDS[0]];
  const match = new MatchEngine();
  match.startMatch({ firstPlayerId: 'player', decks: { player: deck, opponent: legalDeck() } });
  const restored = MatchEngine.deserialize(match.serialize());
  const registered = restored.getMatchState().registeredDecks.player;
  assert.equal(registered.sideDeck.length, 2);
  const sided = { mainDeck: [...registered.mainDeck], extraDeck: [], sideDeck: [...registered.sideDeck] };
  [sided.mainDeck[2], sided.sideDeck[0]] = [sided.sideDeck[0], sided.mainDeck[2]];
  assert.equal(restored.validateSideDeckSwap(registered, sided).valid, true);
  sided.sideDeck.pop();
  assert.equal(restored.validateSideDeckSwap(registered, sided).valid, false);
});
