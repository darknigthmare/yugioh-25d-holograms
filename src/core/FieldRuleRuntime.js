import { isFieldSpellCard } from './FieldSpellRules.js';
import { getActiveAdvancedFieldSpells, isAdvancedFieldSourceActive } from './AdvancedFieldSpellRules.js';

export const FIELD_RULE_IDS = Object.freeze({
  ZOMBIE_WORLD: '4064256', SECRET_VILLAGE: '68462976', CLOSED_FOREST: '78082039'
});

export const FIELD_RULE_SOURCES = Object.freeze({
  zombieWorld: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=7857&request_locale=ja',
  secretVillage: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=7916&request_locale=ja',
  closedForest: 'https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=8585&request_locale=ja'
});

const passcode = card => String(card?.id ?? '').replace(/^0+(?=\d)/, '');
const activeSources = sources => sources.filter(source => isAdvancedFieldSourceActive(source));

export function getFieldRuleSources(game) {
  return getActiveAdvancedFieldSpells(game);
}

/** Never infer an opposing Set monster's printed Type. */
export function getFieldRuleMonsterRace(card, sources = [], fallbackRace) {
  if (!card || card.isSetFaceDown === true || card.hidden === true) return null;
  if (card.card_type !== 'monster') return null;
  if (['monster_zone', 'extra_monster_zone', 'graveyard'].includes(card.location)
    && activeSources(sources).some(source => passcode(source) === FIELD_RULE_IDS.ZOMBIE_WORLD)) return 'Zombie';
  return fallbackRace ?? card.currentRace ?? card.race;
}

export function getNormalSummonTributeCount(card) {
  const level = card?.getLevel?.() ?? card?.level ?? 0;
  return level >= 7 ? 2 : level >= 5 ? 1 : 0;
}

function hasPublicSpellcaster(game, side, sources) {
  const main = side === 'player' ? game.field.playerMonsterZones : game.field.opponentMonsterZones;
  const extra = (game.field.extraMonsterZones || []).filter(entry => entry?.controllerId === side).map(entry => entry.card);
  return [...main, ...extra].some(card => card && !card.isSetFaceDown
    && getFieldRuleMonsterRace(card, sources) === 'Spellcaster');
}

/** Village restricts Spell CARD activations, not an already active Spell's effect. */
export function isSpellCardActivationPermitted(game, card, side, {
  sources = getFieldRuleSources(game), pendulumScale = false, runtime = game.fieldRules
} = {}) {
  if (!card || !['player', 'opponent'].includes(side)) return false;
  if (!pendulumScale && card.card_type !== 'spell') return true;
  sources = activeSources(sources);
  for (const village of sources.filter(source => passcode(source) === FIELD_RULE_IDS.SECRET_VILLAGE)) {
    const owner = village.controllerId;
    const opponent = owner === 'player' ? 'opponent' : 'player';
    const ownSpellcaster = hasPublicSpellcaster(game, owner, sources);
    if ((side === owner && !ownSpellcaster)
      || (side === opponent && ownSpellcaster && !hasPublicSpellcaster(game, opponent, sources))) return false;
  }
  if (!pendulumScale && isFieldSpellCard(card) && (
    sources.some(source => passcode(source) === FIELD_RULE_IDS.CLOSED_FOREST)
    || runtime?.isClosedForestDestructionRestrictionActive(game)
  )) return false;
  return true;
}

/** The restriction also covers Tribute Sets; material Tributes for a Special Summon do not. */
export function isTributeSummonPermitted(game, card, side, { sources = getFieldRuleSources(game) } = {}) {
  if (!card || !['player', 'opponent'].includes(side)) return false;
  if (!activeSources(sources).some(source => passcode(source) === FIELD_RULE_IDS.ZOMBIE_WORLD)) return true;
  // A monster in hand does not become Zombie merely because its destination
  // would be affected by Zombie World. Check its current Type before Summon.
  return (card.currentRace ?? card.race) === 'Zombie';
}

export class FieldRuleRuntime {
  constructor() { this.reset(); }

  reset() { this.closedForestDestroyedTurn = null; }

  turnKey(game) { return `${game.turnCount}:${game.currentTurn}`; }

  recordDestroyedCard(game, card) {
    // Konami's supplement explicitly includes a face-down Set copy and a
    // copy destroyed in hand. This does not require successful activation,
    // an active face-up source, or starting another Chain.
    if (passcode(card) !== FIELD_RULE_IDS.CLOSED_FOREST) return false;
    this.closedForestDestroyedTurn = this.turnKey(game);
    return true;
  }

  isClosedForestDestructionRestrictionActive(game) {
    return this.closedForestDestroyedTurn === this.turnKey(game);
  }
}
