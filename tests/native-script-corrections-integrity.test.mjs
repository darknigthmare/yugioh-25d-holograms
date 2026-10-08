import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { nativeSourceSha256 } from '../src/core/native/NativeSourceIntegrity.js';
import { NATIVE_CARD_SCRIPT_CORRECTIONS, getNativeCardScriptCorrection, applyNativeCardScriptCorrections } from '../src/core/native/NativeCardScriptCorrections.js';
import { createNativeScriptReader, createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';

const nodeSha256 = source => createHash('sha256').update(source, 'utf8').digest('hex');
const inputs = await loadNativeAuditInputs();
const rawScripts = inputs.resources.scripts;
const corrections = NATIVE_CARD_SCRIPT_CORRECTIONS;

test('synchronous SHA-256 matches published empty, abc and NIST multi-block vectors', () => {
  const vectors = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
    ['a'.repeat(1_000_000), 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0']
  ];
  for (const [source, expected] of vectors) {
    assert.equal(nodeSha256(source), expected);
    assert.equal(nativeSourceSha256(source), expected);
  }
});

test('UTF-8 hashing agrees with Node for Unicode, embedded NUL and unpaired surrogate replacement', () => {
  for (const source of [
    'é水💙', '-- 円卓の聖騎士\nlocal s,id=GetID()\r\n',
    'e\u0301', '\0Lua\0source\0', '\ud800', '\udfff', 'left\ud800right',
    '💙'.repeat(127), 'é水💙\0'.repeat(700)
  ]) assert.equal(nativeSourceSha256(source), nodeSha256(source), `UTF-8 byte length ${Buffer.byteLength(source)}`);
  assert.notEqual(nativeSourceSha256('é'), nativeSourceSha256('e\u0301'), 'guards hash bytes without Unicode normalization');
  assert.notEqual(nativeSourceSha256('Lua\n'), nativeSourceSha256('Lua\r\n'), 'guards retain line endings');
});

test('SHA-256 padding and block transitions agree with Node across 55/56/63/64 byte boundaries', () => {
  for (const length of [1, 7, 31, 54, 55, 56, 57, 62, 63, 64, 65, 119, 120, 127, 128, 129, 255, 256, 257, 4095, 4096]) {
    const ascii = Array.from({ length }, (_, index) => String.fromCharCode(32 + (index * 37) % 95)).join('');
    assert.equal(Buffer.byteLength(ascii), length);
    assert.equal(nativeSourceSha256(ascii), nodeSha256(ascii), `ASCII ${length} bytes`);
    // The boundary is measured in UTF-8 bytes, not JavaScript character count.
    const remainder = length % 7;
    const unicode = '水💙'.repeat(Math.floor(length / 7)) + 'é'.repeat(Math.floor(remainder / 2)) + 'x'.repeat(remainder % 2);
    assert.equal(Buffer.byteLength(unicode), length);
    assert.equal(nativeSourceSha256(unicode), nodeSha256(unicode), `Unicode ${Buffer.byteLength(unicode)} bytes`);
  }
});

test('only Dice Dungeon and Duel Tower are registered and their shipped sources match independent Node hashes', () => {
  assert.deepEqual(corrections.map(c => c.filename).sort(), ['c11808215.lua', 'c43940008.lua']);
  assert.ok(Object.isFrozen(corrections));
  for (const correction of corrections) {
    assert.ok(Object.isFrozen(correction));
    const original = rawScripts.get(correction.filename);
    assert.equal(typeof original, 'string');
    assert.equal(nodeSha256(original), correction.upstreamSha256);
    const effective = applyNativeCardScriptCorrections(correction.filename, original);
    assert.equal(nodeSha256(effective), correction.correctedSha256);
    assert.notEqual(effective, original);
    assert.equal(getNativeCardScriptCorrection(correction.filename), correction);
    assert.equal(getNativeCardScriptCorrection(`official/${correction.filename}`), correction);
  }
});

for (const correction of corrections) {
  test(`${correction.filename} rejects changed upstream bytes and already-corrected input`, () => {
    const source = rawScripts.get(correction.filename);
    const effective = applyNativeCardScriptCorrections(correction.filename, source);
    for (const changed of [`${source}\n`, source.replace(/\n/g, '\r\n'), source.slice(0, -1), effective]) {
      assert.throws(() => applyNativeCardScriptCorrections(correction.filename, changed), /pinned upstream|SHA-256 mismatch/);
    }
    for (const invalid of [null, undefined, 42, new String(source)]) {
      assert.throws(() => applyNativeCardScriptCorrections(correction.filename, invalid), /must be a string/);
    }
  });
}

test('the normal Map reader corrects raw and canonical official requests without mutating the complete archive', () => {
  const before = [...rawScripts.entries()];
  const reader = createNativeScriptReader(rawScripts);
  const changedNames = [];
  for (const [name, source] of rawScripts) {
    const effective = reader(name);
    if (effective !== source) changedNames.push(name);
    else assert.equal(effective, source);
  }
  assert.deepEqual(changedNames.sort(), ['c11808215.lua', 'c43940008.lua']);
  assert.deepEqual([...rawScripts.entries()], before);
  assert.deepEqual([...reader.correctionsApplied.keys()].sort(), changedNames);

  for (const correction of corrections) {
    const source = rawScripts.get(correction.filename);
    const canonicalOnly = new Map([[`official/${correction.filename}`, source]]);
    const canonicalReader = createNativeScriptReader(canonicalOnly);
    for (const name of [correction.filename, `official/${correction.filename}`]) {
      assert.equal(nodeSha256(canonicalReader(name)), correction.correctedSha256);
    }
    assert.equal(canonicalOnly.get(`official/${correction.filename}`), source);
    assert.equal(canonicalOnly.has(correction.filename), false, 'reader does not add rewritten aliases to archive');
  }
});

test('correction-name near misses and missing sources remain unchanged with no false correction evidence', () => {
  const source = rawScripts.get('c11808215.lua');
  const names = ['c011808215.lua', 'c11808215.lua.bak', 'c11808215.luax', 'c439400080.lua', 'c123.lua', 'utility.lua'];
  const reader = createNativeScriptReader(new Map(names.map(name => [name, source])));
  for (const name of names) {
    assert.equal(getNativeCardScriptCorrection(name), null);
    assert.equal(applyNativeCardScriptCorrections(name, source), source);
    assert.equal(reader(name), source);
  }
  assert.equal(reader('c11808215.lua'), null);
  assert.equal(reader('official/c43940008.lua'), null);
  assert.equal(reader.correctionsApplied.size, 0);
  assert.throws(() => createNativeScriptReader({}), /scripts must be a Map/);
});

test('a cached corrected reader still rejects source replacement and reads restored pinned bytes safely', () => {
  for (const correction of corrections) {
    const source = rawScripts.get(correction.filename);
    const map = new Map([[correction.filename, source]]);
    const reader = createNativeScriptReader(map);
    const first = reader(correction.filename);
    assert.equal(reader(correction.filename), first);
    assert.equal(reader.correctionsApplied.size, 1);
    map.set(correction.filename, `${source}\n-- unexpected source revision\n`);
    assert.throws(() => reader(correction.filename), /pinned upstream|SHA-256 mismatch/);
    map.set(correction.filename, source);
    assert.equal(reader(correction.filename), first);
    assert.equal(reader.correctionsApplied.get(correction.filename), correction);
    assert.equal(map.get(correction.filename), source);
  }
});

test('real runtime uses the central default correction reader but honors an explicit synchronous source reader', async () => {
  const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const options = {
    ...inputs.resources, coreModule: inputs.coreModule, createCore: () => core,
    seed: [1n, 2n, 3n, 4n],
    team1: { startingDrawCount: 0, drawCountPerTurn: 0 },
    team2: { startingDrawCount: 0, drawCountPerTurn: 0 }
  };
  const production = await createNativeDuelRuntime(options);
  try {
    for (const [index, correction] of corrections.entries()) {
      production.addCard({ code: correction.cardId, controller: index, location: production.constants.OcgLocation.SZONE, sequence: 5, position: production.constants.OcgPosition.FACEUP_ATTACK });
      assert.equal(nodeSha256(production.options.scriptReader(correction.filename)), correction.correctedSha256);
    }
    assert.deepEqual([...production.options.scriptCorrectionsApplied.keys()].sort(), corrections.map(c => c.filename).sort());
    assert.deepEqual(production.errors, []);
  } finally { production.close(); }

  const requested = [];
  const explicit = name => { requested.push(name); return rawScripts.get(name) ?? null; };
  const comparison = await createNativeDuelRuntime({ ...options, scriptReader: explicit });
  try {
    for (const [index, correction] of corrections.entries()) {
      comparison.addCard({ code: correction.cardId, controller: index, location: comparison.constants.OcgLocation.SZONE, sequence: 5, position: comparison.constants.OcgPosition.FACEUP_ATTACK });
      assert.equal(comparison.options.scriptReader(correction.filename), rawScripts.get(correction.filename));
      assert.ok(requested.includes(correction.filename));
    }
    assert.equal(comparison.options.scriptCorrectionsApplied.size, 0);
    assert.deepEqual(comparison.errors, []);
  } finally { comparison.close(); }
});
