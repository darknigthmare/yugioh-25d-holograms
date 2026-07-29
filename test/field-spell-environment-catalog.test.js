import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT,
  FIELD_SPELL_CARD_IDS_BY_ENVIRONMENT,
  FIELD_SPELL_ENVIRONMENT_CATALOG,
  FIELD_SPELL_ENVIRONMENT_COUNT,
  FIELD_SPELL_ENVIRONMENT_IDS,
  FIELD_SPELL_ENVIRONMENT_SNAPSHOT,
  getCatalogEnvironmentIdForCardId,
  getFieldSpellEnvironmentCatalogEntry,
  validateFieldSpellEnvironmentCatalog
} from '../src/ui/FieldSpellEnvironmentCatalog.js';

test('the Field Spell environment catalogue covers 336 unique canonical IDs', () => {
  assert.deepEqual(FIELD_SPELL_ENVIRONMENT_SNAPSHOT, {
    apiVersion: 'v7',
    retrievedOn: '2026-07-29',
    scope: 'Spell Card / Field, TCG and OCG catalogue'
  });
  assert.equal(Object.isFrozen(FIELD_SPELL_ENVIRONMENT_SNAPSHOT), true);
  const validation = validateFieldSpellEnvironmentCatalog();
  assert.equal(validation.valid, true);
  assert.equal(validation.count, EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT);
  assert.equal(validation.uniqueCardIdCount, EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT);
  assert.equal(FIELD_SPELL_ENVIRONMENT_COUNT, EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT);
  assert.equal(FIELD_SPELL_ENVIRONMENT_CATALOG.length, 336);
});

test('all 24 immutable visual families are populated and partition the catalogue', () => {
  assert.equal(FIELD_SPELL_ENVIRONMENT_IDS.length, 24);
  const groupedCardIds = FIELD_SPELL_ENVIRONMENT_IDS.flatMap(environmentId => {
    const cardIds = FIELD_SPELL_CARD_IDS_BY_ENVIRONMENT[environmentId];
    assert.ok(cardIds.length > 0, `${environmentId} must contain at least one card`);
    assert.equal(Object.isFrozen(cardIds), true);
    return cardIds;
  });

  assert.equal(groupedCardIds.length, 336);
  assert.equal(new Set(groupedCardIds).size, 336);
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
