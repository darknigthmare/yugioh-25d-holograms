import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  TOKEN_MONSTER_MODEL_PROFILES, TOKEN_MODEL_ANATOMIES, getTokenMonsterModelProfile
} from '../src/ui/TokenMonsterModelProfiles.js';
import {
  TOKEN_MONSTER_PROFILES, NATIVE_TOKEN_RECORDS, PRINTED_TOKEN_PRESENTATIONS,
  COMMEMORATIVE_TOKEN_PRESENTATIONS, TOKEN_PRESENTATION_CATALOG, TOKEN_PRESENTATION_COVERAGE,
  getTokenMonsterProfile, getTokenPresentationProfile
} from '../src/ui/TokenMonsterProfiles.js';
import { getDuelistAvatar } from '../src/content/DuelistAvatarCatalog.js';
import { REVIEWED_TOKEN_VISUAL_REFERENCES } from '../src/ui/ReviewedTokenVisualReferences.js';

const repo = new URL('../', import.meta.url);
const proof = 'docs/audits/artifacts/token-monster-inventory-2026-10-11/';
const read = path => readFileSync(new URL(path, repo));
const json = path => JSON.parse(read(path));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const native = json('public/native/card-data.json');
const rows = native.rows.filter(row => row[4] & 0x4000);
const monsters = rows.filter(row => row[4] & 1);
const api = json(`${proof}ygoprodeck-token-api-2026-10-11.json`);
const art = json(`${proof}token-reference-art.json`);
const lua = json(`${proof}lua-token-generators.json`);

test('every native Token monster has exactly one model and preserves native identity and statistics', () => {
  assert.equal(monsters.length, 240);
  assert.deepEqual(Object.keys(TOKEN_MONSTER_MODEL_PROFILES).map(Number).sort((a, b) => a - b), monsters.map(row => row[0]).sort((a, b) => a - b));
  assert.equal(TOKEN_MONSTER_PROFILES.length, monsters.length);
  for (const row of monsters) {
    const entry = getTokenMonsterProfile(row[0]);
    assert.equal(entry.presentationId, `duel:${row[0]}`);
    assert.deepEqual(
      [entry.code, entry.nativeAliasCode, entry.nativeTypeCode, entry.atk, entry.def, entry.level, entry.nativeRaceCode, entry.nativeAttributeCode, entry.name, entry.sourceDatabase],
      [row[0], row[2], row[4], row[5], row[6], row[7] & 255, Number(row[8]), row[9], row[11], row[14]]
    );
    assert.equal(entry.kind, 'duel');
    assert.equal(entry.modelAvailable, true);
    assert.ok(TOKEN_MODEL_ANATOMIES.includes(entry.tokenAnatomy));
    assert.equal(entry.tokenCode, String(row[0]));
    assert.equal(getTokenPresentationProfile(entry.presentationId), entry);
    assert.ok(Object.isFrozen(entry.tokenVisual));
  }
  assert.ok(TOKEN_MONSTER_PROFILES.some(entry => entry.atk === -2), 'dynamic values remain unknown rather than fabricated');
});

test('internal Token flags never become gameplay models or printed cards', () => {
  const markers = rows.filter(row => !(row[4] & 1));
  assert.deepEqual(markers.map(row => row[0]).sort((a, b) => a - b), [9995767, 10000110, 10000120]);
  assert.equal(NATIVE_TOKEN_RECORDS.length, rows.length);
  for (const row of markers) {
    assert.equal(getTokenMonsterModelProfile(row[0]), null);
    assert.equal(getTokenMonsterProfile(row[0]), null);
    const entry = getTokenPresentationProfile(`placeholder:${row[0]}`);
    assert.equal(entry.modelAvailable, false);
    assert.equal(entry.tokenAnatomy, null);
    assert.equal(entry.referenceArtPath, null);
  }
});

test('exact aliases and colour variants remain independently addressable without broad Token fallback', () => {
  for (const code of [73915052, 73915053, 73915054, 73915055, 14470846, 14470847, 29843092, 29843093, 29843094]) {
    assert.equal(getTokenMonsterModelProfile({ id: String(code) }).tokenCode, String(code));
    assert.equal(getTokenMonsterModelProfile({ code }).tokenCode, String(code));
    assert.equal(getTokenMonsterModelProfile(`0${code}`).tokenCode, String(code));
  }
  const sheep = [73915052, 73915053, 73915054, 73915055].map(getTokenMonsterModelProfile);
  assert.equal(new Set(sheep.map(entry => entry.body)).size, 4);
  assert.equal(new Set(sheep.map(entry => entry.tokenVisual.referenceImageId)).size, 4);
  for (const input of [null, undefined, {}, 'duel:73915052', 'Unknown', 'NaN', 73915051, { isToken: true, type: 'Token Monster' }]) {
    assert.equal(getTokenMonsterModelProfile(input), null);
  }
});

test('all printed API variants refer to verified native rows and exact locally hosted JPEG bytes', () => {
  assert.equal(api.data.length, 106);
  const apiImages = new Map(api.data.flatMap(card => card.card_images.map(image => [image.id, image])));
  assert.equal(apiImages.size, 120);
  assert.equal(PRINTED_TOKEN_PRESENTATIONS.length, apiImages.size);
  assert.equal(art.sourceSha256, sha256(read(`${proof}ygoprodeck-token-api-2026-10-11.json`)));
  const assets = new Map(art.images.map(image => [image.imageId, image]));
  for (const entry of PRINTED_TOKEN_PRESENTATIONS) {
    assert.equal(entry.kind, 'decorative');
    assert.equal(entry.presentationId, `printed:${entry.imageId}`);
    assert.ok(getTokenMonsterProfile(entry.imageId));
    const source = apiImages.get(entry.imageId);
    const asset = assets.get(entry.imageId);
    assert.equal(entry.referenceArtUrl, source.image_url_cropped);
    assert.equal(asset.url, source.image_url_cropped);
    const bytes = read(`public${entry.referenceArtPath}`);
    assert.equal(sha256(bytes), asset.sha256);
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
  }
  for (const entry of TOKEN_MONSTER_PROFILES.filter(entry => entry.referenceKind === 'token')) {
    const imageCode = Number(entry.tokenVisual.referenceImageId);
    assert.ok(entry.code === imageCode || entry.nativeAliasCode === imageCode, 'no unrelated illustration is silently assigned');
    assert.ok(assets.has(imageCode));
  }
});

test('catalogue counts distinguish identities, art presentations and bounded coverage', () => {
  assert.equal(TOKEN_PRESENTATION_CATALOG.length, 367);
  assert.equal(new Set(TOKEN_PRESENTATION_CATALOG.map(entry => entry.presentationId)).size, 367);
  assert.equal(TOKEN_PRESENTATION_COVERAGE.nativeTokenMonsters, 240);
  assert.equal(TOKEN_PRESENTATION_COVERAGE.apiTokenIllustrations, 120);
  assert.match(TOKEN_PRESENTATION_COVERAGE.description, /not 360/);
  assert.equal(lua.sources.cardData.sha256, sha256(read('public/native/card-data.json')));
  assert.equal(lua.sources.scripts.sha256, sha256(read('public/native/scripts.json')));
  assert.equal(lua.tokenCodeSources.length, 223);
  for (const source of lua.tokenCodeSources) assert.ok(getTokenMonsterProfile(source.nativeCard.code));
});

test('verified commemorative prints reuse known avatars without inventing native codes or statistics', () => {
  const proofData = json(`${proof}verified-commemorative-token-presentations.json`);
  const references = json(`${proof}commemorative-token-reference-art.json`);
  assert.equal(COMMEMORATIVE_TOKEN_PRESENTATIONS.length, 4);
  assert.deepEqual(COMMEMORATIVE_TOKEN_PRESENTATIONS.map(entry => [entry.physicalSetCode, entry.avatarId]), [
    ['YGLD-ENTKN', 'atem'], ['LDK2-ENT01', 'atem'], ['LDK2-ENT02', 'kaiba'], ['LDK2-ENT03', 'joey']
  ]);
  for (const entry of COMMEMORATIVE_TOKEN_PRESENTATIONS) {
    assert.equal(entry.presentationId, `commemorative:${entry.physicalSetCode}`);
    assert.equal(entry.kind, 'decorative');
    assert.equal(entry.modelKind, 'duelist-avatar');
    assert.equal(entry.modelScope, 'duelist');
    assert.ok(getDuelistAvatar(entry.avatarId));
    for (const field of ['code', 'cardId', 'nativeCode', 'tokenCode', 'atk', 'def', 'level', 'race', 'attribute']) assert.equal(entry[field], null);
    assert.equal(entry.tokenAnatomy, null);
    assert.equal(getTokenMonsterProfile(entry), null);
    assert.ok(entry.sourceUrl.startsWith('https://www.yugioh-card.com/'));
    const asset = references.images.find(asset => asset.setCode === entry.physicalSetCode);
    assert.equal(sha256(read(`public${entry.referenceArtPath}`)), asset.sha256);
    assert.equal(entry.referenceArtUrl, asset.url);
    assert.equal(entry.referenceKind, 'printed-token');
  }
  for (const source of proofData.sources) assert.equal(sha256(read(`${proof}${source.path}`)), source.sha256);
  assert.equal(proofData.otherOfficiallyConfirmedPhysicalTokens.reduce((count, source) => count + source.variants, 0), 10);
  assert.ok(proofData.otherOfficiallyConfirmedPhysicalTokens.every(source => source.integrated === false));
});

test('generator illustrations stay explicitly distinct from Token art and refer to a genuine creator', () => {
  const generatorApi = json(`${proof}ygoprodeck-token-generator-api-2026-10-11.json`);
  const manifest = json(`${proof}token-generator-reference-art.json`);
  const assets = new Map(manifest.images.map(image => [image.cardCode, image]));
  const references = TOKEN_MONSTER_PROFILES.filter(entry => entry.referenceKind === 'generator');
  const printed = TOKEN_MONSTER_PROFILES.filter(entry => Object.hasOwn(REVIEWED_TOKEN_VISUAL_REFERENCES, entry.cardId));
  assert.equal(printed.length, 14);
  assert.equal(references.length + printed.length, 110, 'Fourteen verified printed scans replace generator-only references');
  assert.ok(printed.every(entry => entry.referenceKind === 'printed-token' && entry.tokenVisual.visualBasis === 'printed-token-art'));
  assert.equal(manifest.sourceSha256, sha256(read(`${proof}ygoprodeck-token-generator-api-2026-10-11.json`)));
  for (const entry of references) {
    assert.ok(entry.generatorCodes.includes(entry.referenceSourceCardCode));
    assert.equal(entry.tokenVisual.visualBasis, 'native-definition');
    assert.equal(entry.tokenVisual.referenceImageId, null);
    assert.match(entry.referenceDescription, /not a Token illustration/);
    const card = generatorApi.data.find(card => card.id === entry.referenceSourceCardCode);
    const image = card.card_images.find(image => image.id === card.id);
    assert.equal(entry.referenceArtUrl, image.image_url_cropped);
    assert.equal(sha256(read(`public${entry.referenceArtPath}`)), assets.get(card.id).sha256);
  }
  assert.deepEqual(TOKEN_MONSTER_PROFILES.filter(entry => entry.referenceKind === 'unavailable').map(entry => entry.code), [69811711]);
});

test('renderer profile module contains presentation geometry only and no rich catalogue dependency', () => {
  const source = read('src/ui/TokenMonsterModelProfiles.js').toString();
  assert.doesNotMatch(source, /\bimport\b|generatorCodes|description:|nativeRows|printedRows/);
  for (const entry of Object.values(TOKEN_MONSTER_MODEL_PROFILES)) {
    assert.equal(entry.atk, undefined);
    assert.equal(entry.def, undefined);
    assert.equal(entry.description, undefined);
    assert.equal(entry.generatorCodes, undefined);
    assert.ok(Object.isFrozen(entry));
  }
});
