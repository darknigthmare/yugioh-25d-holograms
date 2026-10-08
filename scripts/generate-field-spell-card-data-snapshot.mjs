import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import {
  FIELD_SPELL_ENVIRONMENT_CATALOG,
  FIELD_SPELL_ENVIRONMENT_SNAPSHOT,
  FIELD_SPELL_EXCLUDED_PROVISIONAL_IDS
} from '../src/ui/FieldSpellEnvironmentCatalog.js';

const [, , inputArgument, outputArgument] = process.argv;
if (!inputArgument) {
  throw new TypeError(
    'Usage: node scripts/generate-field-spell-card-data-snapshot.mjs '
    + '<ygoprodeck-cardinfo.json> [output-module]'
  );
}

const inputPath = resolve(inputArgument);
const outputPath = resolve(
  outputArgument || 'src/ui/FieldSpellCardDataSnapshot.js'
);
const payload = JSON.parse(await readFile(inputPath, 'utf8'));
const apiCards = Array.isArray(payload?.data) ? payload.data : [];
const apiCardById = new Map();
for (const card of apiCards) {
  const cardId = String(card?.id ?? '').trim();
  if (apiCardById.has(cardId)) throw new TypeError(`duplicate API card ID ${cardId}`);
  apiCardById.set(cardId, card);
}
const localIds = new Set(
  FIELD_SPELL_ENVIRONMENT_CATALOG.map(entry => entry.cardId)
);
const errors = [];
const snapshotEntries = {};
const excludedProvisionalIds = new Set(FIELD_SPELL_EXCLUDED_PROVISIONAL_IDS);

for (const catalogEntry of FIELD_SPELL_ENVIRONMENT_CATALOG) {
  const apiCard = apiCardById.get(catalogEntry.cardId);
  if (!apiCard) {
    errors.push(`missing API card ID ${catalogEntry.cardId}`);
    continue;
  }
  if (apiCard.name !== catalogEntry.name) {
    errors.push(
      `name mismatch ${catalogEntry.cardId}: `
      + `${JSON.stringify(apiCard.name)} !== ${JSON.stringify(catalogEntry.name)}`
    );
  }
  if (apiCard.type !== 'Spell Card' || apiCard.race !== 'Field' || apiCard.frameType !== 'spell') {
    errors.push(`non-Field Spell returned for ID ${catalogEntry.cardId}`);
  }
  const effectText = String(apiCard.desc ?? '').trim();
  if (!effectText) errors.push(`missing effect text for ID ${catalogEntry.cardId}`);

  snapshotEntries[catalogEntry.cardId] = {
    name: apiCard.name,
    archetype: String(apiCard.archetype ?? '').trim() || null,
    effectText
  };
}

for (const apiCard of apiCards) {
  const apiId = String(apiCard?.id ?? '').trim();
  if (apiId && !localIds.has(apiId) && !excludedProvisionalIds.has(apiId)) {
    errors.push(`unexpected API card ID ${apiId}`);
  }
}

if (errors.length) {
  throw new AggregateError(
    errors.map(message => new Error(message)),
    'Cannot generate Field Spell card-data snapshot'
  );
}

const serializedEntries = JSON.stringify(snapshotEntries, null, 2);
const moduleSource = `/**
 * Audited visual-reference snapshot for the immersive Field Spell scenes.
 *
 * Generated mechanically from the YGOPRODeck v7 Field Spell response. The
 * duel engine remains the authority for gameplay; this data only grounds
 * original environment briefs in each canonical card's identity and effect.
 */

export const FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA = Object.freeze({
  retrievedOn: '${FIELD_SPELL_ENVIRONMENT_SNAPSHOT.retrievedOn}',
  previousRetrievedOn: '${FIELD_SPELL_ENVIRONMENT_SNAPSHOT.previousRetrievedOn}',
  sourceUrl: 'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Spell%20Card&race=Field&misc=yes',
  expectedCount: ${FIELD_SPELL_ENVIRONMENT_CATALOG.length}
});

const snapshot = ${serializedEntries};

export const FIELD_SPELL_CARD_DATA_SNAPSHOT = Object.freeze(
  Object.fromEntries(
    Object.entries(snapshot).map(([cardId, card]) => [
      cardId,
      Object.freeze(card)
    ])
  )
);

export default FIELD_SPELL_CARD_DATA_SNAPSHOT;
`;

await writeFile(outputPath, moduleSource, 'utf8');
console.log(
  `Generated ${Object.keys(snapshotEntries).length} Field Spell records at ${outputPath}`
);
