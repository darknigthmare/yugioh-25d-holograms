import { hasResolvedFieldSpellActivation, isFieldSpellCard } from './FieldSpellRules.js';

export const ADVANCED_FIELD_SPELL_IDS = Object.freeze({
  SANCTUARY: '56433456', SKYSCRAPER: '63035430', ANCIENT_FOREST: '87624166'
});

export const ADVANCED_FIELD_RULE_SOURCES = Object.freeze({
  sanctuary: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=5982&request_locale=ja',
  skyscraper: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=6399&request_locale=ja',
  ancientForest: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=8338&request_locale=ja',
  ancientForestNegatedAttack: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=8664&request_locale=ja',
  ancientForestFaceDown: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=8644&request_locale=ja',
  ancientForestEndStepOrder: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=5&fid=8663&request_locale=ja'
});

export const ADVANCED_FIELD_RULE_SECONDARY_SOURCES = Object.freeze({
  skyscraperCopies: 'https://yugioh-wiki.net/index.php?%E3%80%8A%E6%91%A9%E5%A4%A9%E6%A5%BC%20%EF%BC%8D%E3%82%B9%E3%82%AB%E3%82%A4%E3%82%B9%E3%82%AF%E3%83%AC%E3%82%A4%E3%83%91%E3%83%BC%EF%BC%8D%E3%80%8B',
  ancientForestPerformedAttack: 'https://github.com/ProjectIgnis/CardScripts/blob/master/official/c87624166.lua',
  ancientForestDamageStepTracking: 'https://github.com/edo9300/ygopro-core/blob/master/processor.cpp'
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

export function isElementalHeroMonster(card) {
  if (!card || card.card_type !== 'monster' || card.isSetFaceDown === true) return false;
  const name = String(card.name_en || card.name || '').normalize('NFKC');
  return /(?:^|\s|,)Elemental HERO\b/i.test(name)
    || /(?:^|\s|,)HÉROS Élémentaire\b/i.test(name)
    || /(?:^|\s|,)E[・·]HERO\b/i.test(name);
}

/** Skyscraper compares ATK even if the attacked monster is in Defense. */
export function getSkyscraperDamageCalculationBoost(attacker, defender, defense = null, fieldContext = {}) {
  if (fieldContext.isDamageCalculation === false || !defender || defender.isSetFaceDown === true
    || !isElementalHeroMonster(attacker) || attacker.position === 'defense') return null;
  const sources = (fieldContext.fieldSpells || []).filter(card => isAdvancedFieldSourceActive(card, defense)
    && advancedFieldSpellId(card) === ADVANCED_FIELD_SPELL_IDS.SKYSCRAPER);
  if (!sources.length || attacker.getAtk() >= defender.getAtk()) return null;
  // Both continuous copies check the same ATK before their increases apply.
  // Historical OCG ruling, 2014-08-15: two copies give +2000 (secondary
  // yugioh-wiki.net Skyscraper Q&A); current Konami FAQ does not cover copies.
  const bonus = 1000 * sources.length;
  return { sourceCard: sources[0], sourceCards: sources, bonus, calculatedAtk: attacker.getAtk() + bonus };
}

export function getSanctuaryBattleDamagePreventions(attacker, defender, outcome, defense = null, fieldContext = {}) {
  if (!defender) return [];
  const source = (fieldContext.fieldSpells || []).find(card => isAdvancedFieldSourceActive(card, defense)
    && advancedFieldSpellId(card) === ADVANCED_FIELD_SPELL_IDS.SANCTUARY);
  if (!source) return [];
  return [['attacker', attacker], ['defender', defender]].flatMap(([participant, monster]) => {
    if (monster.isSetFaceDown === true || !/^(?:Fairy|Elfe)$/i.test(monster.currentRace || monster.race || '')) return [];
    const damage = outcome[`${participant}Damage`];
    return damage > 0 ? [{ participant, sourceCard: source, targetCard: monster, preventedDamage: damage }] : [];
  });
}
