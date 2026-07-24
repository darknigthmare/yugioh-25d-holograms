import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { getCardById, normalizeCardData } from '../src/api.js';
import {
  EXTRA_DECK_CARDS,
  STARTER_CARDS,
  getCardCroppedImageUrl,
  getCardImageUrl
} from '../src/cards.js';

const localCards = [...STARTER_CARDS, ...EXTRA_DECK_CARDS];

function diskPath(publicUrl) {
  return fileURLToPath(new URL(`../public${publicUrl}`, import.meta.url));
}

test('every locally supported card has valid same-origin card and cropped JPEG assets', async () => {
  assert.equal(localCards.length, 39);

  for (const card of localCards) {
    for (const publicUrl of [
      getCardImageUrl(card.id),
      getCardCroppedImageUrl(card.id)
    ]) {
      assert.match(publicUrl, /^\/cards\/(?:small|cropped)\/\d+\.jpg$/);
      assert.equal(publicUrl.includes('ygoprodeck.com'), false);

      const path = diskPath(publicUrl);
      const details = await stat(path);
      assert.ok(details.isFile(), `${publicUrl} must be a file`);
      assert.ok(details.size > 1_000, `${publicUrl} is unexpectedly small`);

      const bytes = await readFile(path);
      assert.deepEqual(
        [...bytes.subarray(0, 3)],
        [0xff, 0xd8, 0xff],
        `${publicUrl} must be a JPEG`
      );
    }
  }
});

test('local image helpers normalize passcodes with leading zeroes', () => {
  assert.equal(getCardImageUrl('04206964'), '/cards/small/4206964.jpg');
  assert.equal(
    getCardCroppedImageUrl('05405694'),
    '/cards/cropped/5405694.jpg'
  );
});

test('Sandbox API cards never expose a YGOPRODeck image hotlink', () => {
  const normalized = normalizeCardData({
    id: 6983839,
    name: 'Tornado Dragon',
    type: 'XYZ Monster',
    card_images: [{
      image_url: 'https://images.ygoprodeck.com/images/cards/6983839.jpg',
      image_url_cropped: 'https://images.ygoprodeck.com/images/cards_cropped/6983839.jpg'
    }]
  });

  assert.equal(normalized.image_url, '/custom-card-back.png');
  assert.equal(normalized.image_url_cropped, '/custom-card-back.png');
  assert.equal(JSON.stringify(normalized).includes('images.ygoprodeck.com'), false);
});

test('legacy or poisoned image caches cannot shadow a local card with a hotlink', async () => {
  const previousStorage = globalThis.localStorage;
  const removedKeys = [];
  globalThis.localStorage = {
    getItem: key => key === 'ygo_card_89631139'
      ? JSON.stringify({
        version: 2,
        cachedAt: Date.now(),
        card: {
          id: '89631139',
          name: 'Poisoned cache entry',
          image_url: 'https://images.ygoprodeck.com/images/cards/89631139.jpg',
          image_url_cropped: 'https://images.ygoprodeck.com/images/cards_cropped/89631139.jpg'
        }
      })
      : null,
    removeItem: key => removedKeys.push(key),
    setItem: () => {}
  };

  try {
    const card = await getCardById('89631139');
    assert.equal(card.name, 'Dragon Blanc aux Yeux Bleus');
    assert.deepEqual(removedKeys, ['ygo_card_89631139']);
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
