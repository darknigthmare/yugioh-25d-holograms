import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { TOKEN_CARD_REFERENCE_ART } from '../src/core/native/TokenCardReferenceArt.js';
import { TOKEN_DUEL_CARD_REFERENCE_ART } from '../src/core/native/TokenDuelCardReferenceArt.js';
import { getNativeCardReferenceArt } from '../src/core/native/NativeCardReferenceArt.js';
import { getCardCroppedImageUrl, getCardImageUrl } from '../src/cards.js';
import { CardState } from '../src/core/CardState.js';

const root = new URL('../', import.meta.url);
const artifact = 'docs/audits/artifacts/token-monster-inventory-2026-10-11/';
const read = path => readFileSync(new URL(path, root));
const json = path => JSON.parse(read(path));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const native = new Map(json('public/native/card-data.json').rows.map(row => [row[0], row]));
const api = json(`${artifact}ygoprodeck-token-api-2026-10-11.json`);
const images = new Map(api.data.flatMap(card => card.card_images.map(image => [image.id, image])));

function dimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  assert.equal(bytes.readUInt16BE(bytes.length - 2), 0xffd9);
  let offset = 2;
  while (offset < bytes.length) {
    assert.equal(bytes[offset++], 0xff);
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    assert.notEqual(marker, 0xda, 'JPEG dimensions must precede scan data');
    const length = bytes.readUInt16BE(offset);
    assert.ok(length >= 2 && offset + length <= bytes.length);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    offset += length;
  }
  throw new Error('No JPEG dimensions found');
}

test('full, small and cropped Token frames match all 120 exact API images and original JPEG hashes', () => {
  assert.equal(images.size, 120);
  const manifest = json(`${artifact}token-card-frame-reference-art.json`);
  const crops = json(`${artifact}token-reference-art.json`);
  assert.equal(manifest.sourceSha256, sha256(read(`${artifact}ygoprodeck-token-api-2026-10-11.json`)));
  assert.equal(manifest.fullFrameImages, 120);
  assert.equal(manifest.smallFrameImages, 120);
  const expected = new Map([...manifest.assets, ...crops.images.map(image => ({ ...image, variant: 'cropped' }))].map(image => [`${image.imageId}:${image.variant}`, image]));
  for (const [code, image] of images) {
    const entry = TOKEN_CARD_REFERENCE_ART[String(code)];
    assert.equal(getNativeCardReferenceArt(`00${code}`), entry);
    assert.equal(entry.cardId, String(code));
    for (const [variant, sourceKey] of [['full', 'image_url'], ['small', 'image_url_small'], ['cropped', 'image_url_cropped']]) {
      const metadata = entry[variant];
      const source = expected.get(`${code}:${variant}`);
      assert.equal(metadata.sourceUrl, image[sourceKey]);
      assert.ok(metadata.assetPath.startsWith('/tokens/'));
      const bytes = read(`public${metadata.assetPath}`);
      assert.equal(bytes.length, source.bytes);
      assert.equal(metadata.bytes, source.bytes);
      assert.equal(sha256(bytes), source.sha256);
      assert.equal(metadata.sha256, source.sha256);
      assert.deepEqual(dimensions(bytes), { width: metadata.width, height: metadata.height });
      assert.ok(Object.isFrozen(metadata));
    }
  }
});

test('only nine genuine native Token aliases reuse verified frames and keep their own identity', () => {
  assert.equal(Object.keys(TOKEN_CARD_REFERENCE_ART).length, 129);
  const aliases = Object.values(TOKEN_CARD_REFERENCE_ART).filter(entry => !images.has(Number(entry.cardId)));
  assert.equal(aliases.length, 9);
  for (const entry of Object.values(TOKEN_CARD_REFERENCE_ART)) {
    const row = native.get(Number(entry.cardId));
    assert.ok(row[4] & 0x4000);
    assert.ok(row[4] & 1);
  }
  for (const entry of aliases) {
    const row = native.get(Number(entry.cardId));
    assert.equal(row[2], entry.imageId);
    assert.equal(entry.nativeAliasSourceCode, row[2]);
    assert.equal(entry.full, TOKEN_CARD_REFERENCE_ART[String(row[2])].full);
    assert.notEqual(entry.cardId, TOKEN_CARD_REFERENCE_ART[String(row[2])].cardId);
  }
  const sheep = [73915052, 73915053, 73915054, 73915055].map(getNativeCardReferenceArt);
  assert.equal(new Set(sheep.map(entry => entry.full.assetPath)).size, 4);
});

test('ordinary cards, unillustrated Tokens and internal placeholders gain no unrelated Token frame', () => {
  for (const code of [59755122, 3285552, 69811711, 9995767, 10000110, 10000120]) {
    assert.equal(TOKEN_CARD_REFERENCE_ART[String(code)], undefined);
    assert.equal(getNativeCardReferenceArt(code), null);
  }
  for (const code of [26905245, 28649820]) {
    assert.equal(getNativeCardReferenceArt(code).full.assetPath, `/cards/reference/${code}.jpg`);
    assert.equal(getNativeCardReferenceArt(code).small.assetPath, `/cards/small/${code}.jpg`);
  }
  const source = read('src/core/native/TokenCardReferenceArt.js').toString();
  assert.doesNotMatch(source, /\bimport\b|TokenMonsterProfiles|generatorCodes|description:/);
});

test('all native Token fallbacks resolve only existing exact art or the neutral card back', () => {
  const tokens = [...native.values()].filter(row => (row[4] & 0x4000) && (row[4] & 1));
  assert.equal(tokens.length, 240);
  let illustrated = 0;
  for (const row of tokens) {
    const code = String(row[0]);
    const reference = TOKEN_CARD_REFERENCE_ART[code];
    if (reference) illustrated++;
    const expectedSmall = reference?.small.assetPath ?? '/custom-card-back.png';
    const expectedCropped = reference?.cropped.assetPath ?? '/custom-card-back.png';
    assert.equal(getCardImageUrl(`00${code}`), expectedSmall, code);
    assert.equal(getCardCroppedImageUrl(code), expectedCropped, code);
    // Exercise the actual transient CardState, before a native public frame is supplied.
    const card = new CardState({ id: code, name: 'Token', card_type: 'monster', type: 'Token' });
    assert.equal(card.image_url, expectedSmall, code);
    assert.equal(card.image_url_cropped, expectedCropped, code);
    assert.ok(read(`public${card.image_url}`).length > 1000);
    assert.ok(read(`public${card.image_url_cropped}`).length > 1000);
  }
  assert.equal(illustrated, 129);
  for (const code of [9995767, 10000110, 10000120, 'not-a-passcode', '../73915052', '__proto__', 'constructor', 'toString']) {
    assert.equal(getNativeCardReferenceArt(code), null);
    assert.equal(getCardImageUrl(code), '/custom-card-back.png');
    assert.equal(getCardCroppedImageUrl(code), '/custom-card-back.png');
  }
});

test('six authentic support cards use their own complete artwork with 16 original files and two reused crops', () => {
  const manifest = json(`${artifact}token-duel-support-art.json`);
  const source = json(manifest.source.snapshotPath);
  assert.equal(sha256(read(manifest.source.snapshotPath)), manifest.source.sha256);
  const cards = new Map(source.data.map(card => [card.id, card]));
  assert.deepEqual(Object.keys(TOKEN_DUEL_CARD_REFERENCE_ART).map(Number).sort((a, b) => a - b), [3285551, 31036355, 53129443, 67922702, 73915051, 98978921]);
  assert.equal(manifest.assets.length, 18);
  assert.equal(manifest.assets.filter(asset => asset.mode === 'downloaded-original').length, 16);
  assert.equal(manifest.assets.filter(asset => asset.mode === 'existing-local-original').length, 2);
  for (const asset of manifest.assets) {
    const card = cards.get(asset.cardCode);
    assert.equal(card.name, native.get(card.id)[11]);
    assert.equal(native.get(card.id)[4] & 0x4000, 0, 'a support card is not relabelled as a Token');
    const image = card.card_images.find(image => image.id === card.id);
    const sourceKey = asset.variant === 'full' ? 'image_url' : asset.variant === 'small' ? 'image_url_small' : 'image_url_cropped';
    const metadata = TOKEN_DUEL_CARD_REFERENCE_ART[String(card.id)][asset.variant];
    assert.equal(getNativeCardReferenceArt(card.id), TOKEN_DUEL_CARD_REFERENCE_ART[String(card.id)]);
    assert.equal(metadata.sourceUrl, image[sourceKey]);
    assert.equal(metadata.assetPath, '/' + asset.path.replace(/^public\//, ''));
    const bytes = read(asset.path);
    assert.equal(bytes.length, metadata.bytes);
    assert.equal(sha256(bytes), asset.sha256);
    assert.equal(metadata.sha256, asset.sha256);
    assert.deepEqual(dimensions(bytes), { width: metadata.width, height: metadata.height });
  }
  for (const code of [3285551, 67922702]) assert.equal(TOKEN_DUEL_CARD_REFERENCE_ART[String(code)].cropped.assetPath, `/tokens/generators/${code}.jpg`);
});
