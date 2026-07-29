import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FIELD_SPELL_ENVIRONMENT_CATALOG
} from '../src/ui/FieldSpellEnvironmentCatalog.js';
import {
  FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST
} from '../src/ui/FieldSpellIllustrationBriefManifest.js';
import {
  FIELD_SPELL_RUNTIME_ASSET_ROOT,
  FIELD_SPELL_RUNTIME_MANIFEST,
  FIELD_SPELL_RUNTIME_MANIFEST_COUNT,
  getFieldSpellRuntimeManifestEntry,
  validateFieldSpellRuntimeManifest
} from '../src/ui/FieldSpellRuntimeManifest.js';

test('lean runtime manifest owns one unique visual contract per canonical Field Spell', () => {
  const validation = validateFieldSpellRuntimeManifest();

  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(FIELD_SPELL_RUNTIME_MANIFEST_COUNT, 336);
  assert.equal(validation.count, 336);
  assert.equal(validation.uniqueCardIdCount, 336);
  assert.equal(validation.uniqueAssetPathCount, 336);
  assert.equal(validation.uniquePaletteCount, 336);
  assert.equal(validation.uniqueSignatureAccentCount, 336);
  assert.deepEqual(
    new Set(FIELD_SPELL_RUNTIME_MANIFEST.map(entry => entry.cardId)),
    new Set(FIELD_SPELL_ENVIRONMENT_CATALOG.map(entry => entry.cardId))
  );
});

test('runtime render values stay exactly aligned with exhaustive generation briefs', () => {
  const briefsByCardId = new Map(
    FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST.map(brief => [brief.cardId, brief])
  );

  for (const runtimeEntry of FIELD_SPELL_RUNTIME_MANIFEST) {
    const brief = briefsByCardId.get(runtimeEntry.cardId);
    assert.equal(runtimeEntry.name, brief.name);
    assert.equal(runtimeEntry.environmentFamily, brief.environmentFamily);
    assert.equal(runtimeEntry.assetPath, brief.assetPath);
    assert.deepEqual(runtimeEntry.palette, brief.palette);
    assert.match(
      runtimeEntry.assetPath,
      new RegExp(
        `^${FIELD_SPELL_RUNTIME_ASSET_ROOT}/${runtimeEntry.cardId}-`
        + '[a-z0-9]+(?:-[a-z0-9]+)*-original\\.webp$'
      )
    );
    assert.equal(Object.isFrozen(runtimeEntry), true);
    assert.equal(Object.isFrozen(runtimeEntry.palette), true);
  }
});

test('runtime lookup is canonical-ID only and the validator rejects shared visuals', () => {
  const yami = getFieldSpellRuntimeManifestEntry('0059197169');
  assert.equal(yami.name, 'Yami');
  assert.equal(yami.assetPath, '/environments/field-spells/59197169-yami-original.webp');
  assert.equal(getFieldSpellRuntimeManifestEntry('Yami'), null);
  assert.equal(getFieldSpellRuntimeManifestEntry('<unsafe>'), null);

  const [first, second, ...rest] = FIELD_SPELL_RUNTIME_MANIFEST;
  const invalid = [
    first,
    {
      ...second,
      cardId: first.cardId,
      assetPath: first.assetPath,
      palette: first.palette
    },
    ...rest
  ];
  const validation = validateFieldSpellRuntimeManifest(invalid);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(error => error.includes('duplicate canonical card ID')));
  assert.ok(validation.errors.some(error => error.includes('duplicate asset path')));
  assert.ok(validation.errors.some(error => error.includes('duplicate palette')));
  assert.ok(validation.errors.some(error => error.includes('duplicate signature accent')));
  assert.ok(validation.errors.some(error => error.includes('missing canonical card ID')));
});
