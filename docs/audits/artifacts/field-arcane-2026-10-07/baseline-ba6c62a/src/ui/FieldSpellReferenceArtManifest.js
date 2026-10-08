import { FIELD_SPELL_ENVIRONMENT_CATALOG } from './FieldSpellEnvironmentCatalog.js';
import { FIELD_SPELL_REFERENCE_ART_PALETTES } from './FieldSpellReferenceArtPalettes.js';

export const FIELD_SPELL_REFERENCE_ART_METADATA = Object.freeze({
  retrievedOn: '2026-10-07',
  previousRetrievedOn: '2026-10-01',
  provider: 'YGOPRODeck',
  kind: 'card-illustration',
  sourceBytesPreserved: true,
  backgroundFit: 'contain'
});

// Source hashes and image dimensions are kept in the audit snapshot, outside
// the browser bundle. Runtime rendering needs only the passcode and palette.
export const FIELD_SPELL_REFERENCE_ART_MANIFEST = Object.freeze(
  FIELD_SPELL_ENVIRONMENT_CATALOG.map(({ cardId }) => {
    const colors = FIELD_SPELL_REFERENCE_ART_PALETTES[cardId];
    if (!colors || colors.length !== 5) {
      throw new RangeError(`Missing source-art palette for Field Spell ${cardId}`);
    }
    const [shadow, dominant, secondary, light, signatureAccent] = colors;
    return Object.freeze({
      cardId,
      assetPath: `/environments/field-art/${cardId}.jpg`,
      sourceUrl: `https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
      palette: Object.freeze({ shadow, dominant, secondary, light, signatureAccent }),
      kind: FIELD_SPELL_REFERENCE_ART_METADATA.kind,
      backgroundFit: FIELD_SPELL_REFERENCE_ART_METADATA.backgroundFit
    });
  })
);

const referenceByCardId = new Map(
  FIELD_SPELL_REFERENCE_ART_MANIFEST.map(entry => [entry.cardId, entry])
);

export function getFieldSpellReferenceArtEntry(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d{1,12}$/.test(normalized)) return null;
  return referenceByCardId.get(normalized.replace(/^0+(?=\d)/, '')) || null;
}
