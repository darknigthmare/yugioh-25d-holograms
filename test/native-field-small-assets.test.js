import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { FIELD_SPELL_ENVIRONMENT_CATALOG } from '../src/ui/FieldSpellEnvironmentCatalog.js';

const publicRoot = new URL('../public/', import.meta.url);
const evidence = JSON.parse(await readFile(new URL('../docs/audits/artifacts/native-field-small-assets-2026-10-07.json', import.meta.url)));

function dimensions(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8);
  assert.equal(buffer.readUInt16BE(buffer.length - 2), 0xffd9);
  let cursor = 2;
  while (cursor < buffer.length) {
    assert.equal(buffer[cursor++], 0xff);
    while (buffer[cursor] === 0xff) cursor++;
    const marker = buffer[cursor++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    const length = buffer.readUInt16BE(cursor);
    assert.ok(length >= 2 && cursor + length <= buffer.length);
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return { width: buffer.readUInt16BE(cursor + 5), height: buffer.readUInt16BE(cursor + 3) };
    }
    cursor += length;
  }
  throw new Error('Missing JPEG dimension segment');
}

test('all 339 canonical Field Spells have distinct intact local card frames', async () => {
  assert.equal(evidence.expectedCount, 339);
  assert.equal(evidence.validatedCount, 339);
  assert.deepEqual(evidence.failures, []);
  assert.deepEqual(new Set(evidence.entries.map(row => row.cardId)), new Set(FIELD_SPELL_ENVIRONMENT_CATALOG.map(row => row.cardId)));
  const hashes = new Set();
  let totalBytes = 0;
  for (const row of evidence.entries) {
    assert.equal(row.assetPath, `/cards/small/${row.cardId}.jpg`);
    assert.equal(row.sourceUrl, `https://images.ygoprodeck.com/images/cards_small/${row.cardId}.jpg`);
    const bytes = await readFile(new URL(row.assetPath.slice(1), publicRoot));
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash, row.sha256, row.cardId);
    assert.equal(bytes.length, row.bytes, row.cardId);
    assert.deepEqual(dimensions(bytes), { width: row.width, height: row.height }, row.cardId);
    assert.ok(row.width >= 150 && row.height >= 200 && row.width < row.height);
    assert.ok(!hashes.has(hash), `Duplicate card frame ${row.cardId}`);
    hashes.add(hash);
    totalBytes += bytes.length;
  }
  assert.equal(totalBytes, evidence.totalBytes);
});

test('new card frames retain verified HTTPS provenance and canonical IDs for prerelease bindings', () => {
  assert.equal(evidence.requestConcurrency, 4);
  assert.equal(evidence.tlsVerification, true);
  assert.equal(evidence.freshDownloadCount, 316);
  assert.equal(evidence.existingLocalCount, 23);
  for (const row of evidence.entries) {
    if (row.freshDownload) {
      assert.equal(row.httpStatus, 200, row.cardId);
      assert.equal(row.contentType, 'image/jpeg', row.cardId);
      assert.equal(row.downloadedBytesPreserved, true, row.cardId);
    } else {
      assert.equal(row.httpStatus, null);
      assert.match(row.evidence, /no fresh source comparison/);
    }
  }
  for (const cardId of ['12845564', '46273941', '88288421', '33700664']) {
    const row = evidence.entries.find(row => row.cardId === cardId);
    assert.equal(row.freshDownload, true, cardId);
    assert.equal(row.assetPath, `/cards/small/${cardId}.jpg`);
  }
});
