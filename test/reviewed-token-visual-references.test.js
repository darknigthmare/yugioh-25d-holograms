import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { REVIEWED_TOKEN_VISUAL_REFERENCES } from '../src/ui/ReviewedTokenVisualReferences.js';
import { getTokenMonsterModelProfile, TOKEN_MONSTER_MODEL_PROFILES } from '../src/ui/TokenMonsterModelProfiles.js';
import { getTokenMonsterProfile, TOKEN_PRESENTATION_CATALOG, TOKEN_PRESENTATION_COVERAGE } from '../src/ui/TokenMonsterProfiles.js';
import { resolveHologramMonsterProfile } from '../src/ui/CombatVisualProfiles.js';

const root = new URL('../', import.meta.url);
const provenance = [
  ...JSON.parse(readFileSync(new URL('docs/audits/artifacts/multireference-tokens-2026-10-13/verified-printed-token-references.json', root))).references,
  JSON.parse(readFileSync(new URL('docs/audits/artifacts/multireference-tokens-2026-10-13/additional-printed-g-golem-reference.json', root)))
];

test('reviewed printed references reach the atlas and combat model while keeping native identities and variable statistics', () => {
  assert.equal(Object.keys(REVIEWED_TOKEN_VISUAL_REFERENCES).length, provenance.length);
  for (const record of provenance) {
    const code = String(record.nativeCode);
    const native = getTokenMonsterProfile(code);
    const model = getTokenMonsterModelProfile(`000${code}`);
    const combat = resolveHologramMonsterProfile({ id: code });
    assert.equal(native.name, record.nativeName);
    assert.equal(native.nativeCode, record.nativeCode);
    assert.deepEqual(native.generatorCodes, record.generatorCodes);
    for (const [field, value] of Object.entries(record.nativeDefinition)) assert.equal(native[field], value, `${code}: ${field}`);
    assert.equal(native.referenceKind, 'printed-token');
    assert.equal(native.referenceSet, record.version);
    assert.equal(native.referenceArtUrl, record.sourcePage);
    assert.equal(native.referenceArtPath, combat.referenceArt);
    assert.equal(combat.tokenVisual.referenceArtPath, native.referenceArtPath);
    assert.equal(model.tokenVisual.referenceArtPath, undefined, 'The renderer data snapshot stays separate from presentation references');
    assert.equal(model.tokenVisual.visualBasis, 'native-definition');
    assert.equal(model.tokenVisual.referenceImageId, null, 'A printed scan does not invent an API art ID');
    assert.ok(Object.isFrozen(model) && Object.isFrozen(model.tokenVisual));
  }
  assert.equal(Object.keys(TOKEN_MONSTER_MODEL_PROFILES).length, 240);
  assert.equal(TOKEN_PRESENTATION_CATALOG.length, 367);
  assert.equal(TOKEN_PRESENTATION_COVERAGE.apiTokenCards, 106);
  assert.equal(TOKEN_PRESENTATION_COVERAGE.apiTokenIllustrations, 120);
});

test('every reviewed public reference is the original downloaded PNG with its verified dimensions and provenance', () => {
  for (const record of provenance) {
    const reference = REVIEWED_TOKEN_VISUAL_REFERENCES[String(record.nativeCode)];
    assert.match(reference.referenceArtPath, /^\/tokens\/reviewed\/\d+\.png$/);
    const asset = readFileSync(new URL(`public${reference.referenceArtPath}`, root));
    const original = readFileSync(new URL(record.path, root));
    assert.deepEqual(asset, original, record.name);
    assert.equal(asset.length, record.bytes);
    assert.equal(createHash('sha256').update(asset).digest('hex'), record.sha256);
    assert.equal(asset.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.deepEqual([asset.readUInt32BE(16), asset.readUInt32BE(20)], record.dimensions);
    assert.equal(record.classification, 'direct-printed-token-scan');
    assert.equal(record.independentAngles, 1);
    assert.equal(new URL(reference.referenceArtUrl).protocol, 'https:');
  }
});

test('ambiguous World Legacy and appearance-copying Tokens acquire no invented reviewed reference', () => {
  for (const code of ['69811711', '44092305', '51611042']) {
    assert.equal(REVIEWED_TOKEN_VISUAL_REFERENCES[code], undefined);
    assert.equal(getTokenMonsterModelProfile(code).tokenVisual.referenceArtPath, undefined);
  }
  for (const code of ['Infinity', '645088/../1', '645088.png']) assert.equal(getTokenMonsterModelProfile(code), null);
});
