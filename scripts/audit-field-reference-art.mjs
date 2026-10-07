import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { FIELD_SPELL_REFERENCE_ART_SNAPSHOT as snapshot } from '../src/ui/FieldSpellReferenceArtSnapshot.js';
import { FIELD_SPELL_REFERENCE_ART_MANIFEST } from '../src/ui/FieldSpellReferenceArtManifest.js';
import { EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT } from '../src/ui/FieldSpellEnvironmentCatalog.js';
import { getFieldEnvironmentForCardId } from '../src/ui/FieldEnvironmentRegistry.js';

function jpegDimensions(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8, 'missing JPEG start');
  let cursor = 2;
  while (cursor < buffer.length) {
    assert.equal(buffer[cursor++], 0xff, 'invalid JPEG marker');
    while (buffer[cursor] === 0xff) cursor++;
    const marker = buffer[cursor++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    const length = buffer.readUInt16BE(cursor);
    assert.ok(length >= 2 && cursor + length <= buffer.length, 'truncated JPEG segment');
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      return { width: buffer.readUInt16BE(cursor + 5), height: buffer.readUInt16BE(cursor + 3) };
    }
    cursor += length;
  }
  throw new Error('missing JPEG dimensions');
}

const publicRoot = new URL('../public/', import.meta.url);
const files = await readdir(new URL('environments/field-art/', publicRoot));
const archivedById = new Map(snapshot.entries.map(entry => [entry.cardId, entry]));
const hashes = new Set();
assert.equal(snapshot.sourceBytesPreserved, true);
assert.equal(archivedById.size, EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT);
assert.equal(FIELD_SPELL_REFERENCE_ART_MANIFEST.length, EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT);
assert.deepEqual(new Set(files), new Set(snapshot.entries.map(entry => `${entry.cardId}.jpg`)));
let totalBytes = 0;
for (const reference of FIELD_SPELL_REFERENCE_ART_MANIFEST) {
  const archived = archivedById.get(reference.cardId);
  const environment = getFieldEnvironmentForCardId(reference.cardId);
  assert.ok(archived, `missing provenance for ${reference.cardId}`);
  assert.equal(reference.assetPath, archived.assetPath);
  assert.equal(reference.sourceUrl, archived.sourceUrl);
  assert.deepEqual(reference.palette, archived.palette);
  assert.equal(environment.backdropUrl, reference.assetPath);
  assert.equal(environment.backdropFit, 'contain');
  assert.equal(environment.backdropFilter, 'none');
  const buffer = await readFile(new URL(reference.assetPath.slice(1), publicRoot));
  const hash = createHash('sha256').update(buffer).digest('hex');
  assert.equal(hash, archived.sha256, `${reference.cardId}: source bytes changed`);
  assert.equal(buffer.length, archived.bytes);
  assert.deepEqual(jpegDimensions(buffer), { width: archived.width, height: archived.height });
  assert.ok(archived.width >= 150 && archived.height >= 150);
  assert.ok(!hashes.has(hash), `${reference.cardId}: duplicate source illustration`);
  hashes.add(hash);
  totalBytes += buffer.length;
}
console.log(`Field reference art: ${hashes.size}/${EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT} unchanged JPEG illustrations, ${(totalBytes / 1e6).toFixed(2)} MB.`);
console.log('All source illustrations select their own local file, preserve aspect ratio and use no color filter.');
