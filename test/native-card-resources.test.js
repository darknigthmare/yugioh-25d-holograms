import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { FIELD_SPELL_ENVIRONMENT_CATALOG } from '../src/ui/FieldSpellEnvironmentCatalog.js';
import { createNativeCardDataMaps, loadNativeCardResources, unpackNativeSetcodes } from '../src/core/native/NativeCardData.js';
import { createNativeScriptArchive } from '../src/core/native/NativeScriptArchive.js';

const asset = name => new URL(`../public/native/${name}`, import.meta.url);
const [cardBytes, scriptBytes, manifestBytes, banlistBytes] = await Promise.all(
  ['card-data.json', 'scripts.json', 'manifest.json', 'field-banlists.json'].map(name => readFile(asset(name)))
);
const payload = JSON.parse(cardBytes);
const archive = JSON.parse(scriptBytes);
const manifest = JSON.parse(manifestBytes);
const { cards, metadata, canonicalCodeToSource, sourceCodeToCanonical } = createNativeCardDataMaps(payload);
const scripts = createNativeScriptArchive(archive);
const hash = data => createHash('sha256').update(data).digest('hex');

test('pinned native archives retain reproducible hashes and explicit source provenance', () => {
  for (const [key, bytes] of [['cards', cardBytes], ['scripts', scriptBytes], ['fieldBanlists', banlistBytes]]) {
    assert.equal(hash(bytes), manifest.artifacts[key].sha256, key);
    assert.equal(bytes.length, manifest.artifacts[key].bytes, key);
  }
  assert.equal(manifest.sources.scripts.commit, '37f270dc813a12d123707ae255f2bda7922999c4');
  assert.equal(manifest.sources.database.commit, 'fdf92aea31033cd6c44afa89987c5e00665205e2');
  assert.equal(manifest.sources.scripts.license, 'AGPL-3.0-or-later');
  assert.match(manifest.sources.database.license, /No license declaration/);
  assert.equal(payload.rows.length, 14984);
  assert.equal(scripts.size, 13702);
  for (const [name, source] of scripts) {
    assert.equal(hash(Buffer.from(source)), archive.files[name].sha256, name);
    assert.equal(Buffer.byteLength(source), archive.files[name].bytes, name);
  }
});

test('all 339 field references and the existing local pool resolve factual source data', () => {
  for (const field of FIELD_SPELL_ENVIRONMENT_CATALOG) {
    const canonical = Number(field.cardId);
    const sourceCode = canonicalCodeToSource.get(canonical) ?? canonical;
    const data = cards.get(canonical);
    assert.ok(data, field.name);
    assert.equal(data.code, sourceCode);
    assert.equal(data.type & 0x80002, 0x80002, field.name);
    assert.ok(scripts.has(`c${sourceCode}.lua`), field.name);
    assert.equal(metadata.get(canonical).sourceCode, sourceCode);
    assert.equal(typeof metadata.get(canonical).description, 'string');
  }
  for (const card of [...STARTER_CARDS, ...EXTRA_DECK_CARDS]) {
    assert.ok(cards.has(Number(card.id)), card.name);
  }
  assert.equal(manifest.fieldCardCount, 339);
  assert.equal(manifest.existingStrictPoolCount, 80);
});

test('the four prerelease bindings preserve native passcodes, aliases and untouched Lua', () => {
  assert.deepEqual([...canonicalCodeToSource], [
    [12845564, 101402095], [46273941, 100458006], [88288421, 100459016], [33700664, 100458039]
  ]);
  for (const [canonical, source] of canonicalCodeToSource) {
    assert.equal(sourceCodeToCanonical.get(source), canonical);
    assert.equal(cards.get(canonical), cards.get(source));
    assert.equal(cards.get(canonical).alias, 0);
    assert.equal(metadata.get(canonical).sourceCode, source);
    assert.equal(metadata.get(canonical).description, metadata.get(source).description);
    assert.equal(archive.files[`c${source}.lua`].path, `pre-release/c${source}.lua`);
    assert.equal(scripts.has(`c${canonical}.lua`), false);
    assert.equal(payload.rows.some(row => row[0] === canonical), false);
  }
  assert.equal(cards.get(295517).alias, 22702055, 'A Legendary Ocean genuine Umi alias');
});

test('CDB conversion preserves packed archetypes, scales, link arrows and numeric stats', () => {
  assert.deepEqual(unpackNativeSetcodes('1234605616436508552'), [0x7788, 0x5566, 0x3344, 0x1122]);
  assert.deepEqual(unpackNativeSetcodes('-1'), [0xffff, 0xffff, 0xffff, 0xffff]);
  assert.deepEqual(unpackNativeSetcodes('0'), []);
  assert.deepEqual(cards.get(89631139), {
    code: 89631139, alias: 0, setcodes: [221], type: 17, level: 8,
    attribute: 16, race: 8192n, attack: 3000, defense: 2500,
    lscale: 0, rscale: 0, link_marker: 0
  });
  assert.equal(cards.get(94415058).lscale, 1);
  assert.equal(cards.get(20409757).rscale, 8);
  assert.equal(cards.get(20409757).level, 3);
  assert.equal(cards.get(77637979).link_marker, 5);
  assert.equal(cards.get(77637979).level, 2);
  assert.equal(cards.get(77637979).race, 16777216n);
  assert.equal(metadata.get(77637979).rawLevel, 2);
});

test('all statically named Lua helper dependencies are available locally', () => {
  for (const [name, source] of scripts) {
    for (const match of source.matchAll(/Duel\.LoadScript\(["']([^"']+)["']/g)) {
      assert.ok(scripts.has(match[1]), `${name} requires ${match[1]}`);
    }
  }
  assert.equal(manifest.helperScriptCount, 26);
  assert.equal(manifest.officialScriptCount, 13541);
  assert.equal(manifest.prereleaseScriptCount, 135);
});

test('async local loader returns native Maps, choice strings, canonical bindings and banlist evidence', async () => {
  const requested = [];
  const resources = await loadNativeCardResources({
    fetch: async url => {
      requested.push(url);
      return { ok: true, json: async () => JSON.parse(await readFile(asset(url.split('/').at(-1)))) };
    }
  });
  assert.deepEqual(new Set(requested), new Set([
    '/native/card-data.json', '/native/scripts.json', '/native/manifest.json', '/native/field-banlists.json'
  ]));
  assert.equal(resources.cards.size, 14988);
  assert.equal(resources.metadata.size, 14988);
  assert.equal(resources.scripts.size, 13702);
  assert.equal(resources.canonicalToNative, resources.canonicalCodeToSource);
  assert.equal(resources.nativeToCanonical, resources.sourceCodeToCanonical);
  assert.equal(resources.fieldBanlists.size, 339);
  assert.equal(resources.metadata.get(12845564).strings.length, 16);
  assert.match(resources.metadata.get(12845564).strings[0], /Standby Phase/);
  assert.equal(resources.metadata.get(12845564).banlist, resources.fieldBanlists.get(12845564));
  assert.match(resources.banlists.scope, /absence.*does not establish territorial release/);
  await assert.rejects(loadNativeCardResources({ fetch: async () => ({ ok: false, status: 404 }) }), /404/);
});

test('malformed archive inputs are rejected before native code receives them', () => {
  assert.throws(() => createNativeCardDataMaps({}), /Invalid native CDB archive/);
  assert.throws(() => createNativeScriptArchive({ format: 'project-ignis-lua-v1', scripts: { '../bad.lua': '' } }), /Invalid native Lua source/);
  assert.throws(() => createNativeScriptArchive({ format: 'project-ignis-lua-v1', scripts: {} }), /Missing native Lua helper/);
});
