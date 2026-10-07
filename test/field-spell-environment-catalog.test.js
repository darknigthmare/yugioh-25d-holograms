import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FIELD_SPELL_CARD_DATA_SNAPSHOT } from '../src/ui/FieldSpellCardDataSnapshot.js';
import { getStrictCardRegistration } from '../src/core/StrictCardRegistry.js';

import {
  EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT,
  FIELD_SPELL_CARD_IDS_BY_ENVIRONMENT,
  FIELD_SPELL_ENVIRONMENT_CATALOG,
  FIELD_SPELL_ENVIRONMENT_COUNT,
  FIELD_SPELL_ENVIRONMENT_IDS,
  FIELD_SPELL_ENVIRONMENT_SNAPSHOT,
  FIELD_SPELL_CATALOGUE_ADDITIONS,
  FIELD_SPELL_EXCLUDED_PROVISIONAL_IDS,
  getCatalogEnvironmentIdForCardId,
  getFieldSpellEnvironmentCatalogEntry,
  validateFieldSpellEnvironmentCatalog
} from '../src/ui/FieldSpellEnvironmentCatalog.js';

test('the Field Spell environment catalogue covers 339 unique canonical IDs', () => {
  assert.deepEqual(FIELD_SPELL_ENVIRONMENT_SNAPSHOT, {
    apiVersion: 'v7',
    retrievedOn: '2026-10-07',
    previousRetrievedOn: '2026-07-29',
    apiCount: 342,
    excludedProvisionalCount: 3,
    scope: 'Canonical Spell Card / Field references, published and officially announced TCG/OCG cards'
  });
  assert.equal(Object.isFrozen(FIELD_SPELL_ENVIRONMENT_SNAPSHOT), true);
  const validation = validateFieldSpellEnvironmentCatalog();
  assert.equal(validation.valid, true);
  assert.equal(validation.count, EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT);
  assert.equal(validation.uniqueCardIdCount, EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT);
  assert.equal(FIELD_SPELL_ENVIRONMENT_COUNT, EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT);
  assert.equal(FIELD_SPELL_ENVIRONMENT_CATALOG.length, 339);
});

test('October references preserve verified publication dates and exclude provisional IDs', () => {
  const announced = FIELD_SPELL_CATALOGUE_ADDITIONS['12845564'];
  assert.equal(announced.status, 'announced');
  assert.equal(announced.releaseDate, '2026-10-09');
  assert.equal(announced.regionalReleaseDates.TCG_EU, '2026-10-08');
  assert.deepEqual(announced.formats, ['TCG']);
  for (const id of ['33700664', '88288421']) {
    const reference = FIELD_SPELL_CATALOGUE_ADDITIONS[id];
    assert.equal(reference.status, 'released');
    assert.ok(reference.releaseDate <= FIELD_SPELL_ENVIRONMENT_SNAPSHOT.retrievedOn);
    assert.deepEqual(reference.formats, ['OCG']);
    assert.ok(Object.isFrozen(reference));
    assert.ok(Object.isFrozen(reference.formats));
    assert.ok(getFieldSpellEnvironmentCatalogEntry(id));
  }
  assert.equal(FIELD_SPELL_EXCLUDED_PROVISIONAL_IDS.length, 3);
  for (const id of FIELD_SPELL_EXCLUDED_PROVISIONAL_IDS) {
    assert.equal(getFieldSpellEnvironmentCatalogEntry(id), null);
    assert.equal(getStrictCardRegistration(id), null);
  }
  for (const id of Object.keys(FIELD_SPELL_CATALOGUE_ADDITIONS)) {
    assert.equal(getStrictCardRegistration(id), null, 'a visual reference must not implicitly register gameplay');
  }
});

test('the archived live API reproduces the canonical snapshot and refuses unexplained identities', async () => {
  const artifactRoot = new URL('../docs/audits/artifacts/', import.meta.url);
  const rawApi = await readFile(new URL('field-catalogue-api-2026-10-07.json', artifactRoot));
  const audit = JSON.parse(await readFile(new URL('field-catalogue-refresh-2026-10-07.json', artifactRoot), 'utf8'));
  assert.equal(createHash('sha256').update(rawApi).digest('hex'), audit.api.sha256);
  const payload = JSON.parse(rawApi);
  assert.equal(payload.data.length, 342);
  assert.equal(new Set(payload.data.map(card => card.id)).size, 342);
  assert.ok(payload.data.every(card => card.type === 'Spell Card' && card.race === 'Field' && card.frameType === 'spell'));
  const directory = await mkdtemp(join(tmpdir(), 'yugioh-field-catalogue-'));
  const inputPath = join(directory, 'input.json');
  const outputPath = join(directory, 'snapshot.mjs');
  const generatorPath = fileURLToPath(new URL('../scripts/generate-field-spell-card-data-snapshot.mjs', import.meta.url));
  const generate = () => spawnSync(process.execPath, [generatorPath, inputPath, outputPath], {
    encoding: 'utf8', timeout: 10_000
  });
  try {
    await writeFile(inputPath, rawApi);
    assert.equal(generate().status, 0);
    const generated = await import(pathToFileURL(outputPath).href);
    assert.deepEqual(generated.FIELD_SPELL_CARD_DATA_SNAPSHOT, FIELD_SPELL_CARD_DATA_SNAPSHOT);
    const source = payload.data[0];
    await writeFile(inputPath, JSON.stringify({ data: [...payload.data, source] }));
    assert.notEqual(generate().status, 0, 'duplicate API IDs must fail before Map overwrite');
    await writeFile(inputPath, JSON.stringify({ data: [...payload.data, { ...source, id: 101403999 }] }));
    assert.notEqual(generate().status, 0, 'an unexplained placeholder must not enter the canonical snapshot');
    await writeFile(inputPath, JSON.stringify({ data: payload.data.map(card => card === source
      ? { ...card, race: 'Continuous' } : card) }));
    assert.notEqual(generate().status, 0, 'a changed card type must not silently remain a Field Spell');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('all 24 immutable visual families are populated and partition the catalogue', () => {
  assert.equal(FIELD_SPELL_ENVIRONMENT_IDS.length, 24);
  const groupedCardIds = FIELD_SPELL_ENVIRONMENT_IDS.flatMap(environmentId => {
    const cardIds = FIELD_SPELL_CARD_IDS_BY_ENVIRONMENT[environmentId];
    assert.ok(cardIds.length > 0, `${environmentId} must contain at least one card`);
    assert.equal(Object.isFrozen(cardIds), true);
    return cardIds;
  });

  assert.equal(groupedCardIds.length, 339);
  assert.equal(new Set(groupedCardIds).size, 339);
  assert.equal(Object.isFrozen(FIELD_SPELL_ENVIRONMENT_IDS), true);
  assert.equal(Object.isFrozen(FIELD_SPELL_ENVIRONMENT_CATALOG), true);
  assert.equal(Object.isFrozen(FIELD_SPELL_CARD_IDS_BY_ENVIRONMENT), true);
  assert.equal(Object.isFrozen(FIELD_SPELL_ENVIRONMENT_CATALOG[0]), true);
});

test('runtime lookup is canonical-ID-only and preserves existing environment IDs', () => {
  assert.equal(getCatalogEnvironmentIdForCardId('59197169'), 'yami');
  assert.equal(getCatalogEnvironmentIdForCardId(22702055), 'umi');
  assert.equal(getCatalogEnvironmentIdForCardId('87430998'), 'forest');
  assert.equal(getCatalogEnvironmentIdForCardId('86318356'), 'sogen');
  assert.equal(getCatalogEnvironmentIdForCardId('23424603'), 'wasteland');
  assert.equal(getCatalogEnvironmentIdForCardId('50913601'), 'mountain');
  assert.equal(getCatalogEnvironmentIdForCardId('86809440'), 'cave');
  assert.equal(getCatalogEnvironmentIdForCardId('0059197169'), 'yami');

  assert.equal(getFieldSpellEnvironmentCatalogEntry('Yami'), null);
  assert.equal(getFieldSpellEnvironmentCatalogEntry(''), null);
  assert.equal(getFieldSpellEnvironmentCatalogEntry('<unsafe>'), null);
  assert.equal(getFieldSpellEnvironmentCatalogEntry('9999999999999'), null);
});

test('catalogue names remain audit metadata and do not affect lookup', () => {
  const yami = getFieldSpellEnvironmentCatalogEntry('59197169');
  assert.deepEqual(yami, {
    cardId: '59197169',
    name: 'Yami',
    environmentId: 'yami'
  });
  assert.equal(getCatalogEnvironmentIdForCardId(yami.name), null);
});
