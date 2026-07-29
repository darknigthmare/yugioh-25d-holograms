import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FIELD_SPELL_ENVIRONMENT_CATALOG
} from '../src/ui/FieldSpellEnvironmentCatalog.js';
import {
  FIELD_SPELL_CARD_DATA_SNAPSHOT,
  FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA
} from '../src/ui/FieldSpellCardDataSnapshot.js';
import {
  FIELD_SPELL_ILLUSTRATION_ASSET_ROOT,
  FIELD_SPELL_ILLUSTRATION_BRIEF_COUNT,
  FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST,
  FIELD_SPELL_ILLUSTRATION_BRIEF_SNAPSHOT,
  getFieldSpellIllustrationBrief,
  validateFieldSpellIllustrationBriefManifest
} from '../src/ui/FieldSpellIllustrationBriefManifest.js';

test('illustration manifest contains one dedicated brief for every canonical Field Spell ID', () => {
  const validation = validateFieldSpellIllustrationBriefManifest();
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(FIELD_SPELL_ILLUSTRATION_BRIEF_COUNT, 336);
  assert.equal(validation.count, 336);
  assert.equal(validation.uniqueCardIdCount, 336);
  assert.equal(validation.uniqueSlugCount, 336);
  assert.equal(validation.uniqueAssetPathCount, 336);
  assert.equal(validation.uniqueSceneCount, 336);
  assert.equal(validation.uniquePaletteCount, 336);
  assert.equal(validation.uniqueSignatureAccentCount, 336);
  assert.deepEqual(
    new Set(FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST.map(brief => brief.cardId)),
    new Set(FIELD_SPELL_ENVIRONMENT_CATALOG.map(entry => entry.cardId))
  );
});

test('each brief defines a unique original WebP contract and precise visual constraints', () => {
  for (const brief of FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST) {
    assert.match(brief.assetPath, new RegExp(
      `^${FIELD_SPELL_ILLUSTRATION_ASSET_ROOT}/${brief.cardId}-.+-original\\.webp$`
    ));
    assert.ok(brief.scene.includes(brief.name));
    assert.ok(brief.scene.length >= 300);
    assert.equal(brief.sourceBasis.canonicalId, brief.cardId);
    assert.equal(
      brief.sourceBasis.effectDataSource,
      FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA.sourceUrl
    );
    assert.equal(
      brief.effectSummary,
      FIELD_SPELL_CARD_DATA_SNAPSHOT[brief.cardId].effectText
    );
    assert.ok(brief.distinctiveSceneCue.length >= 40);
    assert.ok(brief.scene.includes(brief.effectSummary));
    assert.ok(brief.mechanicCues.length >= 1);
    assert.equal(brief.sourceBasis.officialArtUsedAsSource, false);
    assert.equal(brief.mustInclude.length, 7);
    assert.equal(brief.avoid.length, 7);
    assert.equal(Object.values(brief.palette).length, 5);
    assert.ok(Object.values(brief.palette).every(color => /^#[0-9a-f]{6}$/i.test(color)));
    assert.equal(Object.isFrozen(brief), true);
    assert.equal(Object.isFrozen(brief.palette), true);
    assert.equal(Object.isFrozen(brief.mustInclude), true);
    assert.equal(Object.isFrozen(brief.avoid), true);
    assert.equal(Object.isFrozen(brief.mechanicCues), true);
    assert.equal(Object.isFrozen(brief.sourceBasis), true);
  }
});

test('canonical-ID lookup never falls back to localized names', () => {
  const yami = getFieldSpellIllustrationBrief('59197169');
  const umi = getFieldSpellIllustrationBrief(22702055);

  assert.equal(yami.name, 'Yami');
  assert.equal(yami.assetPath, '/environments/field-spells/59197169-yami-original.webp');
  assert.equal(umi.name, 'Umi');
  assert.equal(getFieldSpellIllustrationBrief('Yami'), null);
  assert.equal(getFieldSpellIllustrationBrief(''), null);
  assert.equal(getFieldSpellIllustrationBrief('<unsafe>'), null);
  assert.equal(getFieldSpellIllustrationBrief('0059197169'), yami);
});

test('manifest metadata states its exhaustive scope and original-art policy', () => {
  assert.deepEqual(FIELD_SPELL_ILLUSTRATION_BRIEF_SNAPSHOT, {
    expectedCount: 336,
    catalogueRetrievedOn: '2026-07-29',
    sourceBasis: 'canonical ID, exact English name, API archetype, exact effect text and environment family',
    effectDataSource: FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA.sourceUrl,
    artPolicy: 'original environmental composition; never reproduce official card art'
  });
  assert.equal(Object.isFrozen(FIELD_SPELL_ILLUSTRATION_BRIEF_SNAPSHOT), true);
  assert.equal(Object.isFrozen(FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST), true);
});

test('validator rejects missing, duplicate and shared illustration contracts', () => {
  const [first, second, ...rest] = FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST;
  const invalid = [
    first,
    {
      ...second,
      cardId: first.cardId,
      slug: first.slug,
      assetPath: first.assetPath,
      scene: first.scene,
      palette: first.palette
    },
    ...rest
  ];
  const validation = validateFieldSpellIllustrationBriefManifest(invalid);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(error => error.includes('duplicate canonical card ID')));
  assert.ok(validation.errors.some(error => error.includes('duplicate slug')));
  assert.ok(validation.errors.some(error => error.includes('duplicate asset path')));
  assert.ok(validation.errors.some(error => error.includes('duplicate scene brief')));
  assert.ok(validation.errors.some(error => error.includes('duplicate palette')));
  assert.ok(validation.errors.some(error => error.includes('duplicate signature accent')));
  assert.ok(validation.errors.some(error => error.includes('missing canonical card ID')));
});
