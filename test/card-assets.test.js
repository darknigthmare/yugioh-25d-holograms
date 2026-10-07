import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
import {
  FIELD_ENVIRONMENT_REGISTRY
} from '../src/ui/FieldEnvironmentRegistry.js';

const localCards = [...STARTER_CARDS, ...EXTRA_DECK_CARDS];

function diskPath(publicUrl) {
  return fileURLToPath(new URL(`../public${publicUrl}`, import.meta.url));
}

test('Inter and Orbitron load from licensed same-origin variable WOFF2 files without external font requests', async () => {
  const stylesheet = await readFile(new URL('../style.css', import.meta.url), 'utf8');
  const provenance = JSON.parse(await readFile(new URL('../public/fonts/provenance.json', import.meta.url), 'utf8'));
  assert.doesNotMatch(stylesheet, /fonts\.(?:googleapis|gstatic)\.com|@import\s+url\(['"]?https?:/i);
  assert.equal(provenance.license, 'SIL Open Font License 1.1');

  for (const [family, minWeight, maxWeight] of [['inter', 100, 900], ['orbitron', 400, 900]]) {
    const filename = `${family}-variable.woff2`;
    const entry = provenance.files.find(file => file.file === filename);
    const face = stylesheet.match(new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*'${family}'[^}]*\\}`, 'i'))?.[0];
    assert.ok(face, `${family} must have a local @font-face`);
    assert.match(face, new RegExp(`font-weight:\\s*${minWeight}\\s+${maxWeight}`));
    assert.match(face, /font-display:\s*swap/);
    assert.ok(face.includes(`url('/fonts/${filename}') format('woff2')`));

    const bytes = await readFile(diskPath(`/fonts/${filename}`));
    assert.equal(bytes.toString('ascii', 0, 4), 'wOF2');
    assert.equal(bytes.readUInt32BE(8), bytes.length, 'WOFF2 file length must match its header');
    assert.ok(bytes.readUInt16BE(12) > 10, 'the variable font must retain its font tables');
    assert.equal(bytes.length, entry.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    assert.deepEqual(entry.weightRange, [minWeight, maxWeight]);
    assert.match(entry.sourceUrl, /^https:\/\/raw\.githubusercontent\.com\/google\/fonts\/main\/ofl\//);
    assert.equal(entry.conversion.subset, false);
    assert.equal(entry.conversion.outlineChanges, false);
    for (const character of 'éèŒœ') assert.ok(entry.verifiedFrenchCharacters.includes(character));

    const license = await readFile(diskPath(`/fonts/${family}-OFL.txt`), 'utf8');
    assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/i);
    assert.match(license, /Copyright/);
  }
});

test('every locally supported card has valid same-origin card and cropped image assets', async () => {
  assert.equal(localCards.length, 64);

  for (const card of localCards) {
    for (const publicUrl of [
      getCardImageUrl(card.id),
      getCardCroppedImageUrl(card.id)
    ]) {
      assert.match(publicUrl, /^\/(?:cards\/(?:small|cropped)\/\d+\.jpg|environments\/field-spells\/\d+-[a-z]+-original\.webp)$/);
      assert.equal(publicUrl.includes('ygoprodeck.com'), false);

      const path = diskPath(publicUrl);
      const details = await stat(path);
      assert.ok(details.isFile(), `${publicUrl} must be a file`);
      assert.ok(details.size > 1_000, `${publicUrl} is unexpectedly small`);

      const bytes = await readFile(path);
      if (publicUrl.endsWith('.webp')) {
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
        continue;
      }
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
  assert.equal(getCardImageUrl('05318639'), '/cards/small/5318639.jpg');
  assert.equal(getCardCroppedImageUrl(5318639), '/cards/cropped/5318639.jpg');
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

test('every immersive environment uses a valid same-origin WebP backdrop', async () => {
  const backdropUrls = new Set(
    Object.values(FIELD_ENVIRONMENT_REGISTRY)
      .map(environment => environment.backdropUrl)
  );
  assert.equal(backdropUrls.size, 25);

  for (const publicUrl of backdropUrls) {
    assert.match(publicUrl, /^\/environments\/[a-z0-9-]+-original\.webp$/);
    assert.equal(publicUrl.includes('://'), false);

    const path = diskPath(publicUrl);
    const details = await stat(path);
    assert.ok(details.isFile(), `${publicUrl} must be a file`);
    assert.ok(details.size > 50_000, `${publicUrl} is unexpectedly small`);

    const bytes = await readFile(path);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
  }
});
