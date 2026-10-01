import assert from 'node:assert/strict';
import test from 'node:test';

import { getCardById } from '../src/api.js';
import { EXTRA_DECK_CARDS, STARTER_CARDS } from '../src/cards.js';
import { CardState } from '../src/core/CardState.js';
import { ChainEngine } from '../src/core/ChainEngine.js';
import {
  STRICT_CARD_REGISTRY,
  getStrictCardRegistration,
  isStrictCardSupported,
  normalizeStrictCardId
} from '../src/core/StrictCardRegistry.js';

test('strict registry and local templates cover exactly the same 57 distinct cards', () => {
  const localIds = new Set([...STARTER_CARDS, ...EXTRA_DECK_CARDS].map(card => normalizeStrictCardId(card.id)));
  assert.equal(STARTER_CARDS.length, 52);
  assert.equal(EXTRA_DECK_CARDS.length, 5);
  assert.equal(localIds.size, 57);
  assert.deepEqual(new Set(STRICT_CARD_REGISTRY.keys()), localIds);
});

test('scripted Quick-Play cards retain their local rules, Spell Speed and assets for every passcode form', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => assert.fail('locally scripted cards must not require a network request');
  try {
    const chain = new ChainEngine();
    for (const [passcodes, effectCode, imageId] of [
      [['05318639', '5318639', 5318639], 'MYSTICAL_SPACE_TYPHOON', '5318639'],
      [['14087893', 14087893], 'BOOK_OF_MOON', '14087893']
    ]) {
      for (const passcode of passcodes) {
        const template = await getCardById(passcode);
        assert.ok(template);
        assert.equal(template.effectCode, effectCode);
        assert.equal(template.race, 'Quick-Play');
        assert.equal(isStrictCardSupported(template, 'main'), true);
        assert.equal(isStrictCardSupported(template, 'extra'), false);
        assert.equal(getStrictCardRegistration(passcode)?.procedure, 'spell');

        const card = new CardState(template);
        assert.equal(chain.getSpellSpeed(card), 2);
        assert.equal(chain.canChain(card, 2), true);
        assert.equal(chain.canChain(card, 3), false);
        assert.equal(card.image_url, `/cards/small/${imageId}.jpg`);
        assert.equal(card.image_url_cropped, `/cards/cropped/${imageId}.jpg`);
      }
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});
