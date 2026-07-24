import test from 'node:test';
import assert from 'node:assert/strict';

import { CardState } from '../src/core/CardState.js';

function createMonster(overrides = {}) {
  return new CardState({
    uid: 'card-state-regression',
    id: 46986414,
    name: 'Dark Magician',
    card_type: 'monster',
    type: 'Normal Monster',
    atk: 2500,
    def: 2100,
    level: 7,
    ...overrides
  });
}

test('CardState exposes initial monster stats through methods and legacy properties', () => {
  const card = createMonster();

  assert.equal(card.getAtk(), 2500);
  assert.equal(card.getDef(), 2100);
  assert.equal(card.getLevel(), 7);

  assert.equal(card.atk, card.getAtk());
  assert.equal(card.def, card.getDef());
  assert.equal(card.level, card.getLevel());
});

test('card image URLs normalize passcodes with leading zeroes for the CDN', () => {
  const card = createMonster({ id: '05053103' });

  assert.match(card.image_url, /\/5053103\.jpg$/);
  assert.match(card.image_url_cropped, /\/5053103\.jpg$/);
});

test('legacy stat properties remain live aliases of the dynamic getters', () => {
  const card = createMonster();

  card.currentAtk = 3100;
  card.currentDef = 1600;
  card.currentLevel = 8;

  assert.equal(card.atk, 3100);
  assert.equal(card.def, 1600);
  assert.equal(card.level, 8);
  assert.equal(card.atk, card.getAtk());
  assert.equal(card.def, card.getDef());
  assert.equal(card.level, card.getLevel());

  card.currentAtk = -500;
  card.currentDef = -200;
  card.currentLevel = 0;

  assert.equal(card.atk, 0);
  assert.equal(card.def, 0);
  assert.equal(card.level, 1);
});

test('effect negation restores base stats for both access styles', () => {
  const card = createMonster();
  card.currentAtk = 4000;
  card.currentDef = 3500;
  card.currentLevel = 10;
  card.effectNegated = true;

  assert.equal(card.getAtk(), 2500);
  assert.equal(card.getDef(), 2100);
  assert.equal(card.getLevel(), 7);
  assert.equal(card.atk, 2500);
  assert.equal(card.def, 2100);
  assert.equal(card.level, 7);
});

test('Link monsters consistently expose no DEF value', () => {
  const card = createMonster({
    type: 'Link Monster',
    def: 1800,
    level: 0,
    linkRating: 3
  });

  assert.equal(card.getDef(), null);
  assert.equal(card.def, null);

  card.effectNegated = true;
  assert.equal(card.getDef(), null);
  assert.equal(card.def, null);
});
