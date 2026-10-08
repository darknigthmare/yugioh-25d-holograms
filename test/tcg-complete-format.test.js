import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { TCG_ADVANCED_BANLIST_METADATA } from '../src/core/tcg/TcgAdvancedFormat.js';
import { loadTcgFormatFixture, officialFormatRows, verifyOfficialRow, verifyLifecycleCases } from '../scripts/tcg-complete-format-cases.mjs';

const fixture = await loadTcgFormatFixture();

test('complete Advanced table is pinned to the fetched official page and unchanged CDB', async () => {
  const page = await readFile(new URL('../docs/audits/artifacts/tcg-complete-2026-10-08/official-advanced-list.html.txt', import.meta.url));
  const database = await readFile(new URL('../public/native/card-data.json', import.meta.url));
  assert.equal(createHash('sha256').update(page).digest('hex'), TCG_ADVANCED_BANLIST_METADATA.sourceSha256);
  assert.equal(createHash('sha256').update(database).digest('hex'), TCG_ADVANCED_BANLIST_METADATA.databaseSha256);
  assert.equal(officialFormatRows.length,231);
  assert.deepEqual(Object.fromEntries(['Forbidden','Limited','Semi-Limited','Unlimited'].map(status=>
    [status,officialFormatRows.filter(entry=>entry.status===status).length])),
    {Forbidden:121,Limited:94,'Semi-Limited':7,Unlimited:9});
});

for (const row of officialFormatRows) test(`TCG complete: ${row.name} permits ${row.copyLimit} across Main/Extra/Side`, () => verifyOfficialRow(fixture,row));

test('complete TCG registration, siding, persistence, first-player and optional Swiss lifecycle', () => {
  assert.ok(verifyLifecycleCases(fixture).every(result=>result.ok));
});
