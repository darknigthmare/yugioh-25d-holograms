import { hasResolvedFieldSpellActivation, isFieldSpellCard } from './FieldSpellRules.js';

export const ADVANCED_FIELD_SPELL_IDS = Object.freeze({
  SANCTUARY: '56433456', SKYSCRAPER: '63035430', ANCIENT_FOREST: '87624166',
  TEMPLE_MINDS_EYE: '92481084', CANYON: '28120197', SHIENS_CASTLE_MIST: '11102908', DARK_CITY: '53527835'
});

export const ADVANCED_FIELD_RULE_SOURCES = Object.freeze({
  sanctuary: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=5982&request_locale=ja',
  skyscraper: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=6399&request_locale=ja',
  ancientForest: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=8338&request_locale=ja',
  ancientForestNegatedAttack: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=8664&request_locale=ja',
  ancientForestFaceDown: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=8644&request_locale=ja',
  ancientForestEndStepOrder: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=8663&request_locale=ja',
  templeMindsEye: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=13280&request_locale=ja',
  templeDamageDoubling: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=21&request_locale=ja',
  battleDamageModifierOrder: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=23824&keyword=&tag=-1&request_locale=ja',
  canyon: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=6642&request_locale=en',
  shiensCastleMist: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=7003&request_locale=en',
  darkCity: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=6758&request_locale=ja'
});

export const ADVANCED_FIELD_RULE_SECONDARY_SOURCES = Object.freeze({
  skyscraperCopies: 'https://yugioh-wiki.net/index.php?%E3%80%8A%E6%91%A9%E5%A4%A9%E6%A5%BC%20%EF%BC%8D%E3%82%B9%E3%82%AB%E3%82%A4%E3%82%B9%E3%82%AF%E3%83%AC%E3%82%A4%E3%83%91%E3%83%BC%EF%BC%8D%E3%80%8B',
  ancientForestPerformedAttack: 'https://github.com/ProjectIgnis/CardScripts/blob/master/official/c87624166.lua',
  ancientForestDamageStepTracking: 'https://github.com/edo9300/ygopro-core/blob/master/processor.cpp',
  darkCityCopies: 'https://github.com/ProjectIgnis/CardScripts/blob/master/official/c53527835.lua',
  canyonCopies: 'https://github.com/ProjectIgnis/CardScripts/blob/master/official/c28120197.lua'
});

// These cases have implementation evidence, but no direct current Konami FAQ
// was found. Keep that distinction visible rather than certifying all mixes.
export const ADVANCED_FIELD_RULE_INFERENCES = Object.freeze({
  darkCityCopies: 'Copies share the pre-boost ATK comparison, corroborated by the ProjectIgnis shared latch.',
  canyonCopies: 'Copies overlap as a player damage doubler, corroborated by ProjectIgnis DOUBLE_DAMAGE.',
  heroAndMist: 'Fixed ATK reductions contribute before the shared HERO comparison; additive changes floor at zero after their sum. No specific Konami combination ruling found.'
});

export function advancedFieldSpellId(card) {
  return String(card?.id ?? '').replace(/^0+(?=\d)/, '');
}

export function isAdvancedFieldSourceActive(card, defense = null, { includeNegated = false } = {}) {
  // Public projections may represent an opposing Set source as an opaque
  // object: inspect orientation before its printed identity or effect data.
  if (!card || card.isSetFaceDown === true || card.faceDown === true || card.hidden === true) return false;
  return Boolean(card && isFieldSpellCard(card) && hasResolvedFieldSpellActivation(card)
    && !card.activationNegated && (includeNegated || (!card.effectNegated && !defense?.isCardNegated(card.uid))));
}

/** Live source collection shared by authoritative combat and AI projections. */
export function getActiveAdvancedFieldSpells(game, { includeNegated = false } = {}) {
  return ['player', 'opponent'].flatMap(side => {
    const source = game.getFieldSpellForSide?.(side) || game.field?.getFieldSpell?.(side);
    return isAdvancedFieldSourceActive(source, game.defense, { includeNegated }) && source.controllerId === side
      ? [source] : [];
  });
}

function isPublicFaceUpMonster(card) {
  return Boolean(card && card.isSetFaceDown !== true && card.faceDown !== true
    && card.hidden !== true && card.card_type === 'monster');
}

function activeSources(id, defense, fieldContext) {
  return [...new Set(fieldContext.fieldSpells || [])].filter(card => isAdvancedFieldSourceActive(card, defense)
    && advancedFieldSpellId(card) === id);
}

export function isElementalHeroMonster(card) {
  if (!isPublicFaceUpMonster(card)) return false;
  const name = String(card.name_en || card.name || '').normalize('NFKC');
  return /(?:^|\s|,)Elemental HERO\b/i.test(name)
    || /(?:^|\s|,)HÉROS Élémentaire\b/i.test(name)
    || /(?:^|\s|,)E[・·]HERO\b/i.test(name);
}

/** Skyscraper compares ATK even if the attacked monster is in Defense. */
export function getSkyscraperDamageCalculationBoost(attacker, defender, defense = null, fieldContext = {}) {
  if (fieldContext.isDamageCalculation === false || !isPublicFaceUpMonster(defender)
    || !isElementalHeroMonster(attacker) || attacker.position === 'defense') return null;
  const sources = activeSources(ADVANCED_FIELD_SPELL_IDS.SKYSCRAPER, defense, fieldContext);
  const comparisonAtk = fieldContext.attackerAtkForComparison ?? attacker.getAtk();
  if (!sources.length || comparisonAtk >= defender.getAtk()) return null;
  // Both continuous copies check the same ATK before their increases apply.
  // Historical OCG ruling, 2014-08-15: two copies give +2000 (secondary
  // yugioh-wiki.net Skyscraper Q&A); current Konami FAQ does not cover copies.
  const bonus = 1000 * sources.length;
  return { sourceCard: sources[0], sourceCards: sources, bonus, calculatedAtk: comparisonAtk + bonus };
}

export function isDestinyHeroMonster(card) {
  if (!isPublicFaceUpMonster(card)) return false;
  const name = String(card.name_en || card.name || '').normalize('NFKC');
  return /(?:^|\s|,)Destiny HERO\b/i.test(name)
    || /(?:^|\s|,)HÉROS de la Destinée\b/i.test(name)
    || /(?:^|\s|,)D[・·-]HERO\b/i.test(name);
}

export function isSixSamuraiMonster(card) {
  if (!isPublicFaceUpMonster(card)) return false;
  const name = String(card.name_en || card.name || '').normalize('NFKC');
  return /\bSix Samurai\b/i.test(name) || /\bSix Samoura[ïi]s\b/i.test(name) || /六武衆/.test(name);
}

/** Both players' Destiny HERO attackers qualify; Defense targets compare ATK. */
export function getDarkCityDamageCalculationBoost(attacker, defender, defense = null, fieldContext = {}) {
  if (fieldContext.isDamageCalculation === false || !isPublicFaceUpMonster(defender)
    || !isDestinyHeroMonster(attacker) || attacker.position === 'defense') return null;
  const sources = activeSources(ADVANCED_FIELD_SPELL_IDS.DARK_CITY, defense, fieldContext);
  const comparisonAtk = fieldContext.attackerAtkForComparison ?? attacker.getAtk();
  if (!sources.length || comparisonAtk >= defender.getAtk()) return null;
  // The copies compare the same pre-boost ATK. The shared comparison latch in
  // ProjectIgnis corroborates this case; it is not a current Konami copies FAQ.
  const bonus = 1000 * sources.length;
  return { sourceCard: sources[0], sourceCards: sources, bonus, calculatedAtk: comparisonAtk + bonus };
}

/** This reduces the attacker, regardless of either monster's controller. */
export function getShienDamageCalculationReduction(attacker, defender, defense = null, fieldContext = {}) {
  if (fieldContext.isDamageCalculation === false || !isPublicFaceUpMonster(attacker)
    || attacker.position === 'defense' || !isSixSamuraiMonster(defender)) return null;
  const sources = activeSources(ADVANCED_FIELD_SPELL_IDS.SHIENS_CASTLE_MIST, defense, fieldContext);
  if (!sources.length) return null;
  const reduction = 500 * sources.length;
  return { sourceCard: sources[0], sourceCards: sources, reduction,
    calculatedAtk: Math.max(0, attacker.getAtk() - reduction) };
}

export function getCanyonBattleDamageDoubling(attacker, defender, outcome, defense = null, fieldContext = {}) {
  if (fieldContext.isDamageCalculation === false || !isPublicFaceUpMonster(defender)
    || defender.position !== 'defense' || !/^(?:Rock|Rocher)$/i.test(defender.currentRace || defender.race || '')
    || outcome.attackerDamage <= 0) return null;
  const sources = activeSources(ADVANCED_FIELD_SPELL_IDS.CANYON, defense, fieldContext);
  if (!sources.length) return null;
  // Damage doublers overlap; additional Canyon copies do not repeatedly
  // multiply the damage. This is a player effect, not an effect on the Rock.
  return { sourceCard: sources[0], sourceCards: sources, participant: 'attacker',
    targetCard: attacker, originalDamage: outcome.attackerDamage, modifiedDamage: outcome.attackerDamage * 2 };
}

export function getTempleBattleDamageChanges(attacker, defender, outcome, defense = null, fieldContext = {}) {
  if (fieldContext.isDamageCalculation === false) return [];
  const sources = activeSources(ADVANCED_FIELD_SPELL_IDS.TEMPLE_MINDS_EYE, defense, fieldContext);
  if (!sources.length) return [];
  // Konami's supplement: this affects players, including battles involving
  // Spell-immune monsters. Zero damage stays zero; no missing damage is made.
  return [['attacker', attacker], ['defender', defender]].flatMap(([participant, monster]) => {
    const originalDamage = outcome[`${participant}Damage`];
    return originalDamage > 0 ? [{ sourceCard: sources[0], sourceCards: sources, participant,
      targetCard: monster, originalDamage, modifiedDamage: 1000 }] : [];
  });
}

export function getSanctuaryBattleDamagePreventions(attacker, defender, outcome, defense = null, fieldContext = {}) {
  if (!defender) return [];
  const source = (fieldContext.fieldSpells || []).find(card => isAdvancedFieldSourceActive(card, defense)
    && advancedFieldSpellId(card) === ADVANCED_FIELD_SPELL_IDS.SANCTUARY);
  if (!source) return [];
  return [['attacker', attacker], ['defender', defender]].flatMap(([participant, monster]) => {
    if (!isPublicFaceUpMonster(monster) || !/^(?:Fairy|Elfe)$/i.test(monster.currentRace || monster.race || '')) return [];
    const damage = outcome[`${participant}Damage`];
    return damage > 0 ? [{ participant, sourceCard: source, targetCard: monster, preventedDamage: damage }] : [];
  });
}
