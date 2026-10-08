import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../../cards.js';
import { getStrictCardRegistration, normalizeStrictCardId } from '../StrictCardRegistry.js';
import { FIELD_SPELL_ENVIRONMENT_CATALOG } from '../../ui/FieldSpellEnvironmentCatalog.js';
import { FIELD_SPELL_CARD_DATA_SNAPSHOT } from '../../ui/FieldSpellCardDataSnapshot.js';
import { NATIVE_FIELD_METADATA_INDEX, NATIVE_FIELD_METADATA_DATE } from './NativeCardRegistryData.js';

export const NATIVE_CARD_REGISTRY_SNAPSHOT_DATE = NATIVE_FIELD_METADATA_DATE;
export const NATIVE_FIELD_RESTRICTIONS = new Map();
export const NATIVE_CARD_TEMPLATES = new Map();
export const NATIVE_CARD_REGISTRY = new Map();

function idOf(cardOrId) {
  return normalizeStrictCardId(typeof cardOrId === 'object' ? cardOrId?.id : cardOrId);
}

for (const card of [...STARTER_CARDS, ...EXTRA_DECK_CARDS]) {
  const id = idOf(card);
  const template = Object.freeze({ ...card, id, nativeEngine: true, supportedInNative: true, scriptCode: Number(id) });
  NATIVE_CARD_TEMPLATES.set(id, template);
  NATIVE_CARD_REGISTRY.set(id, Object.freeze({ ...getStrictCardRegistration(id), id, scriptCode: Number(id), template }));
}

for (const field of FIELD_SPELL_ENVIRONMENT_CATALOG) {
  const id = field.cardId;
  const snapshot = FIELD_SPELL_CARD_DATA_SNAPSHOT[id];
  const metadata = NATIVE_FIELD_METADATA_INDEX[id];
  const existing = NATIVE_CARD_TEMPLATES.get(id);
  const template = Object.freeze({
    ...existing, id, name: existing?.name ?? snapshot.name, name_en: snapshot.name,
    type: 'Spell Card', card_type: 'spell', race: 'Field', isFieldSpell: true,
    desc: snapshot.effectText, rulesText: snapshot.effectText, archetype: snapshot.archetype,
    image_url: `/cards/small/${id}.jpg`, image_url_cropped: `/environments/field-art/${id}.jpg`,
    nativeEngine: true, supportedInNative: true, scriptCode: metadata.scriptCode,
    nativeType: metadata.nativeType, nativeAlias: metadata.nativeAlias, nativeOT: metadata.nativeOT,
    scriptStatus: metadata.scriptStatus, nativeMetadata: metadata,
    primaryPublication: field.primaryPublication ?? metadata.primaryPublication,
    fieldRestriction: metadata.fieldRestriction
  });
  NATIVE_CARD_TEMPLATES.set(id, template);
  NATIVE_FIELD_RESTRICTIONS.set(id, metadata.fieldRestriction);
  NATIVE_CARD_REGISTRY.set(id, Object.freeze({
    id, section: 'main', procedure: 'spell', isFieldSpell: true, scriptCode: metadata.scriptCode,
    scriptStatus: metadata.scriptStatus, nativeMetadata: metadata,
    primaryPublication: template.primaryPublication, fieldRestriction: metadata.fieldRestriction, template
  }));
}

export const NATIVE_MAIN_DECK_CARDS = Object.freeze([...NATIVE_CARD_TEMPLATES.values()].filter(card => NATIVE_CARD_REGISTRY.get(card.id).section === 'main'));
export const NATIVE_EXTRA_DECK_CARDS = Object.freeze([...NATIVE_CARD_TEMPLATES.values()].filter(card => NATIVE_CARD_REGISTRY.get(card.id).section === 'extra'));
export const NATIVE_CARDS = Object.freeze([...NATIVE_MAIN_DECK_CARDS, ...NATIVE_EXTRA_DECK_CARDS]);

export function getNativeCardTemplate(cardOrId) {
  return NATIVE_CARD_TEMPLATES.get(idOf(cardOrId)) ?? null;
}

export function getNativeCardRegistration(cardOrId) {
  return NATIVE_CARD_REGISTRY.get(idOf(cardOrId)) ?? null;
}

export function isNativeCardSupported(card, expectedSection = null) {
  if (!card || card.supportedInNative === false) return false;
  const registration = getNativeCardRegistration(card);
  if (!registration || (expectedSection && registration.section !== expectedSection)) return false;
  const procedure = card.extra_type ? String(card.extra_type).toLowerCase()
    : card.card_type === 'spell' ? 'spell'
      : card.card_type === 'trap' ? 'trap'
        : card.isRitualMonster || /Ritual/i.test(card.type ?? '') ? 'ritual'
          : card.isPendulumMonster || /Pendulum/i.test(card.type ?? '') ? 'pendulum'
            : card.card_type === 'monster' ? 'normal' : null;
  return registration.procedure === procedure;
}

/** Regional availability is separate from an unrestricted Lua simulation. */
export function getNativeFieldEligibility(cardOrId, format = 'TCG', options = {}) {
  const registration = getNativeCardRegistration(cardOrId);
  if (!registration) return { allowed: false, code: 'UNSUPPORTED_NATIVE_CARD', message: 'Cette carte n’est pas disponible dans le moteur natif.' };
  if (!registration.isFieldSpell || format === 'ALL') return { allowed: true };
  const metadata = registration.nativeMetadata;
  const primary = registration.primaryPublication;
  const formats = primary?.formats ?? metadata.formats;
  const asOf = options.asOf ?? NATIVE_CARD_REGISTRY_SNAPSHOT_DATE;
  const tcgDate = primary?.formats?.includes('TCG')
    ? (primary.regionalReleaseDates?.TCG_EU ?? primary.releaseDate) : metadata.tcgReleaseDate;
  if (tcgDate && tcgDate > asOf) {
    return { allowed: false, code: 'FIELD_NOT_RELEASED_TCG', releaseDate: tcgDate,
      evidence: primary ? 'primary-publication' : 'provider-snapshot',
      message: `${registration.template.name} : sortie TCG annoncée le ${tcgDate}, après le relevé du ${asOf}.` };
  }
  if (!formats.includes('TCG')) {
    const ocgOnly = formats.includes('OCG') || ((metadata.nativeOT & 1) !== 0 && (metadata.nativeOT & 2) === 0);
    return { allowed: false, code: ocgOnly ? 'FIELD_OCG_ONLY' : 'FIELD_TCG_PUBLICATION_UNKNOWN',
      evidence: primary ? 'primary-publication' : 'provider-snapshot-and-native-ot',
      message: ocgOnly ? `${registration.template.name} : sortie OCG uniquement dans le relevé actuel.`
        : `${registration.template.name} : aucune sortie TCG confirmée dans le relevé actuel.` };
  }
  return { allowed: true, evidence: primary ? 'primary-publication' : 'provider-snapshot' };
}
