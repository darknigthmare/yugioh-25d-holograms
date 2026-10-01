import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST
} from '../src/ui/FieldSpellIllustrationBriefManifest.js';
import { getFieldSpellReferenceArtEntry } from '../src/ui/FieldSpellReferenceArtManifest.js';
import {
  FIELD_ENVIRONMENT_REGISTRY,
  FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE,
  getFieldEnvironmentForCardId,
  resolveFieldEnvironmentSelection
} from '../src/ui/FieldEnvironmentRegistry.js';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const publicRoot = path.join(repositoryRoot, 'public');
const assetDirectory = path.join(
  publicRoot,
  'environments',
  'field-spells'
);
const expectedWidth = 1280;
const expectedHeight = 720;
const minimumFileSize = 10_000;

function readUInt24LE(buffer, offset) {
  return (
    buffer[offset]
    | (buffer[offset + 1] << 8)
    | (buffer[offset + 2] << 16)
  );
}

function readWebpDimensions(buffer) {
  if (
    buffer.length < 30
    || buffer.toString('ascii', 0, 4) !== 'RIFF'
    || buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw new Error('not a RIFF WebP file');
  }

  let chunkOffset = 12;
  while (chunkOffset + 8 <= buffer.length) {
    const chunkType = buffer.toString('ascii', chunkOffset, chunkOffset + 4);
    const chunkSize = buffer.readUInt32LE(chunkOffset + 4);
    const dataOffset = chunkOffset + 8;
    if (dataOffset + chunkSize > buffer.length) {
      throw new Error(`truncated ${chunkType} chunk`);
    }

    if (chunkType === 'VP8X' && chunkSize >= 10) {
      return {
        width: readUInt24LE(buffer, dataOffset + 4) + 1,
        height: readUInt24LE(buffer, dataOffset + 7) + 1
      };
    }

    if (
      chunkType === 'VP8 '
      && chunkSize >= 10
      && buffer[dataOffset + 3] === 0x9d
      && buffer[dataOffset + 4] === 0x01
      && buffer[dataOffset + 5] === 0x2a
    ) {
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff
      };
    }

    if (
      chunkType === 'VP8L'
      && chunkSize >= 5
      && buffer[dataOffset] === 0x2f
    ) {
      const dimensionBits = buffer.readUInt32LE(dataOffset + 1);
      return {
        width: (dimensionBits & 0x3fff) + 1,
        height: ((dimensionBits >>> 14) & 0x3fff) + 1
      };
    }

    chunkOffset = dataOffset + chunkSize + (chunkSize % 2);
  }

  throw new Error('missing VP8, VP8L or VP8X dimensions');
}

const expectedRelativePaths = FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST.map(
  brief => brief.assetPath.replace(/^\//, '')
);
const expectedFileNames = new Set(
  expectedRelativePaths.map(relativePath => path.basename(relativePath))
);
const actualFileNames = (
  await readdir(assetDirectory, { withFileTypes: true })
)
  .filter(entry => entry.isFile() && entry.name.endsWith('.webp'))
  .map(entry => entry.name)
  .sort();
const actualFileNameSet = new Set(actualFileNames);

const errors = [];
// File presence is only part of completion: the resolved card must actually
// select its own file, with a supported peripheral geometry family.
for (const brief of FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST) {
  const environment = getFieldEnvironmentForCardId(brief.cardId);
  const selection = resolveFieldEnvironmentSelection({
    playerFieldSpell: {
      id: brief.cardId,
      card_type: 'spell',
      race: 'Field',
      location: 'field_zone',
      fieldActivationState: 'resolved',
      fieldActivationSequence: 1
    }
  });
  if (!environment || environment.backdropUrl !== getFieldSpellReferenceArtEntry(brief.cardId)?.assetPath
    || environment.fallbackBackdropUrl !== brief.assetPath) {
    errors.push(`${brief.cardId}: source illustration or generated fallback is not connected to the registry`);
  }
  if (selection.isFallback || selection.environment !== environment) {
    errors.push(`${brief.cardId}: a resolved Field Spell does not select its environment`);
  }
  if (
    environment?.geometryProfile?.family !== brief.environmentFamily
    || environment?.geometryProfile?.cardId !== brief.cardId
  ) {
    errors.push(`${brief.cardId}: peripheral geometry contract is missing or mismatched`);
  }
}
const familyBackdropPaths = new Set(
  Object.values(FIELD_ENVIRONMENT_REGISTRY).map(environment => environment.backdropUrl)
);
for (const assetPath of familyBackdropPaths) {
  try {
    const buffer = await readFile(path.join(publicRoot, assetPath.replace(/^\//, '')));
    readWebpDimensions(buffer);
  } catch (error) {
    errors.push(`${assetPath}: family fallback is unusable (${error.message})`);
  }
}
const missing = [...expectedFileNames]
  .filter(fileName => !actualFileNameSet.has(fileName))
  .sort();
const extras = actualFileNames
  .filter(fileName => !expectedFileNames.has(fileName))
  .sort();

if (missing.length) errors.push(`missing ${missing.length} dedicated assets`);
if (extras.length) errors.push(`found ${extras.length} unexpected assets`);

const hashes = new Map();
let auditedCount = 0;
for (const relativePath of expectedRelativePaths) {
  const absolutePath = path.join(publicRoot, relativePath);
  try {
    const fileStat = await stat(absolutePath);
    if (fileStat.size < minimumFileSize) {
      errors.push(
        `${relativePath}: ${fileStat.size} bytes is below ${minimumFileSize}`
      );
    }

    const buffer = await readFile(absolutePath);
    const dimensions = readWebpDimensions(buffer);
    if (
      dimensions.width !== expectedWidth
      || dimensions.height !== expectedHeight
    ) {
      errors.push(
        `${relativePath}: expected ${expectedWidth}x${expectedHeight}, `
        + `received ${dimensions.width}x${dimensions.height}`
      );
    }

    const hash = createHash('sha256').update(buffer).digest('hex');
    const previousPath = hashes.get(hash);
    if (previousPath) {
      errors.push(`${relativePath}: duplicate bytes with ${previousPath}`);
    } else {
      hashes.set(hash, relativePath);
    }
    auditedCount += 1;
  } catch (error) {
    if (!missing.includes(path.basename(relativePath))) {
      errors.push(`${relativePath}: ${error.message}`);
    }
  }
}

console.log(
  `Field Spell backdrops: ${auditedCount}/${expectedRelativePaths.length} `
  + `audited, ${hashes.size} unique SHA-256 hashes`
);

if (errors.length) {
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `All assets are distinct RIFF WebP files at `
    + `${expectedWidth}x${expectedHeight} and at least ${minimumFileSize} bytes.`
  );
  console.log(
    `${expectedRelativePaths.length} resolved cards select their dedicated backdrop and geometry; `
    + `${familyBackdropPaths.size} family/base backdrops are usable.`
  );
  console.log(`${FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE.count} cards have dedicated physical landmarks.`);
}
