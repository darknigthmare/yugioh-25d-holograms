import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** Lossless dictionary encoding of repeated script-reader evidence. Neither a
 * card result nor a diagnostic is discarded. Re-expansion recreates the exact
 * JSON object and its original pretty-printed byte stream. */
export function compactTcgCatalogueReport(report) {
  const scriptSources = [], sourceIds = new Map();
  const rows = report.results.map(result => {
    const scriptReadIds = result.scriptReads.map(source => {
      const key = JSON.stringify(source);
      if (!sourceIds.has(key)) { sourceIds.set(key, scriptSources.length); scriptSources.push(source); }
      return sourceIds.get(key);
    });
    const row = { ...result }; delete row.scriptReads;
    return { ...row, scriptReadIds };
  });
  const commonScriptPrefixIds = [];
  for (const [index, id] of (rows[0]?.scriptReadIds ?? []).entries()) {
    if (!rows.every(row => row.scriptReadIds[index] === id)) break;
    commonScriptPrefixIds.push(id);
  }
  for (const row of rows) row.scriptReadIds = row.scriptReadIds.slice(commonScriptPrefixIds.length);
  const compact = { ...report, results: rows, scriptSources, commonScriptPrefixIds,
    rawTopLevelKeys: Object.keys(report), resultScriptReadsKey: 'scriptReads', compactResultScriptReadsKey: 'scriptReadIds' };
  // Failures remain full original objects, including their diagnostics, so a
  // human can inspect every failed probe without dictionary expansion.
  return compact;
}

export function expandTcgCatalogueReport(compact) {
  const results = compact.results.map(result => {
    const sources = [...compact.commonScriptPrefixIds, ...result.scriptReadIds].map(id => compact.scriptSources[id]);
    const original = { ...result }; delete original.scriptReadIds;
    return { ...original, scriptReads: sources };
  });
  const original = {};
  for (const key of compact.rawTopLevelKeys) original[key] = key === 'results' ? results : compact[key];
  return original;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const input = process.argv.find(argument => argument.startsWith('--input='))?.slice('--input='.length);
  const output = process.argv.find(argument => argument.startsWith('--output='))?.slice('--output='.length);
  assert.ok(input && output, 'Provide --input and --output paths');
  const raw = await readFile(input), report = JSON.parse(raw), compact = compactTcgCatalogueReport(report);
  const expanded = Buffer.from(`${JSON.stringify(expandTcgCatalogueReport(compact), null, 2)}\n`);
  assert.equal(expanded.equals(raw), true, 'Lossless reconstruction of every byte of native probe evidence');
  const compressed = gzipSync(raw, { level: 9 });
  const archivePath = output.replace(/\.json$/, '-raw.json.gz');
  assert.notEqual(archivePath, output);
  await writeFile(archivePath, compressed);
  const serializerSource = await readFile(new URL(import.meta.url));
  compact.serialization = { kind: 'lossless-common-script-prefix-and-source-dictionary',
    measuredDriverUnchanged: true, rawJsonSha256: sha256(raw), rawJsonBytes: raw.length,
    rawArchive: { path: archivePath, sha256: sha256(compressed), bytes: compressed.length, encoding: 'gzip' },
    serializer: { path: 'scripts/compact-tcg-catalogue-initialization.mjs', sha256: sha256(serializerSource) },
    rawReconstructionVerifiedByteIdentical: true,
    expansion: 'Expand shared commonScriptPrefixIds then each result.scriptReadIds through scriptSources. Restore result.scriptReads, remove scriptReadIds, and restore rawTopLevelKeys order. JSON.stringify with two spaces plus final newline reproduces rawJsonSha256.' };
  const serialized = `${JSON.stringify(compact, null, 2)}\n`;
  await writeFile(output, serialized);
  console.log(JSON.stringify({ output, ok: compact.ok, cards: compact.measuredCount,
    scriptSources: compact.scriptSources.length, commonScriptPrefix: compact.commonScriptPrefixIds.length,
    rawBytes: raw.length, compactBytes: Buffer.byteLength(serialized), gzipBytes: compressed.length,
    rawReconstructionVerified: true }));
}
