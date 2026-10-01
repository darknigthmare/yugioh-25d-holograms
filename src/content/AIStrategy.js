import { CONTINUOUS_FIELD_SPELLS, getContinuousFieldSpellStatModifier } from '../core/ClassicFieldSpellEffects.js';
import { hasResolvedFieldSpellActivation } from '../core/FieldSpellRules.js';

const OWN_SIDE = 'opponent';
const ENEMY_SIDE = 'player';
const fieldDefinitions = new Map(CONTINUOUS_FIELD_SPELLS.map(definition => [definition.id, definition]));

function passcode(card) {
  return String(card?.id ?? '').replace(/^0+(?=\d)/, '');
}

function enabled(game) {
  return Boolean(game) && game.aiDifficulty !== 'easy';
}

function stat(card, name) {
  const value = name === 'atk' ? card.getAtk() : card.getDef();
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function ownHand(game) {
  return game.opponentHand;
}

function monsters(game, side) {
  // getSideState/getMonsterEntries also gather references to that side's
  // private hand and Deck. Read only the public board arrays instead.
  const main = side === OWN_SIDE ? game.field.opponentMonsterZones : game.field.playerMonsterZones;
  return [
    ...main.flatMap((card, zoneIndex) => card ? [{ card, zoneType: 'main', zoneIndex }] : []),
    ...game.field.extraMonsterZones.flatMap((entry, zoneIndex) => (
      entry?.controllerId === side ? [{ card: entry.card, zoneType: 'extra', zoneIndex }] : []
    ))
  ];
}

function visibleEnemies(game) {
  // Do not ask a renderer or spread an opposing CardState: a Set card's
  // identity, getters and computed statistics remain private.
  return monsters(game, ENEMY_SIDE).filter(entry => !entry.card.isSetFaceDown);
}

function battleAvailable(game) {
  return game.currentPhase !== 'main2'
    && (!game.turn?.isBattlePhaseLegal || game.turn.isBattlePhaseLegal(game.turnCount));
}

function cardValue(card) {
  return Math.max(stat(card, 'atk'), stat(card, 'def') * 0.8)
    + (card.isEffectMonster ? 250 : 0)
    + (card.isTuner ? 150 : 0)
    + Math.min(3, Math.max(0, Number(card.counters?.spell) || 0)) * 100;
}

function canTargetPublicCard(game, source, target) {
  return !game.defense?.hasProtection?.(target, 'TARGET', { sourceSide: OWN_SIDE, sourceCard: source });
}

function flipValue(game, card, legalEffectTargets) {
  if (card.effectNegated || game.defense?.isActionProhibited?.(OWN_SIDE, 'ACTIVATE_EFFECT', card)) return 0;
  const id = passcode(card);
  if (id === '54652250') {
    const enemies = monsters(game, ENEMY_SIDE).filter(entry => (
      Array.isArray(legalEffectTargets)
        ? legalEffectTargets.includes(entry.card)
        // Unknown opposing Sets are possible targets, never known identities.
        : entry.card.isSetFaceDown || (!entry.card.pendingBattleDestruction
          && canTargetPublicCard(game, card, entry.card))
    ));
    return enemies.reduce((best, entry) => Math.max(best, entry.card.isSetFaceDown
      ? 140 : 120 + Math.min(100, cardValue(entry.card) / 30)), 0);
  }
  if (id === '31560081') {
    return (game.field.opponentGraveyard || []).filter(target => target.card_type === 'spell'
      && (game.rulesMode !== 'strict' || target.supportedInStrict !== false)
      && (Array.isArray(legalEffectTargets) ? legalEffectTargets.includes(target)
        : canTargetPublicCard(game, card, target))).length ? 150 : 0;
  }
  return 0;
}

function sanganTributeValue(game, tributes) {
  if (!tributes.some(entry => passcode(entry.card) === '26202165')) return 0;
  if (game.effects?.hasUsedHOPT?.('Sangan', game.turnCount, {
    playerId: OWN_SIDE, effectId: 'SANGAN_SEARCH'
  })) return 0;
  // Credit the public search effect only once per plan. Its actual available
  // Deck targets and activation legality remain the engine's responsibility.
  return 70;
}

function battleScore(game, attacker, target) {
  const attack = stat(attacker, 'atk');
  if (!attack) return 0;
  if (target.card.isSetFaceDown) {
    // A fixed uncertainty estimate, never a peek at the Set monster's DEF.
    const estimate = game.aiDifficulty === 'hard' ? 1800 : 1200;
    return attack > estimate ? 35 + (attack - estimate) / 20 : 0;
  }
  const defensePosition = target.card.position === 'defense';
  const opposingStat = stat(target.card, defensePosition ? 'def' : 'atk');
  if (attack < opposingStat || (defensePosition && attack === opposingStat)) return 0;
  if (!defensePosition && attack === opposingStat) {
    // An equal-ATK exchange is useful only if it does not sacrifice a more
    // valuable public effect monster for a less valuable one.
    const valueDifference = cardValue(target.card) - cardValue(attacker);
    return valueDifference < 0 ? 0 : 15 + valueDifference / 50;
  }
  return 150 + stat(target.card, 'atk') / 100
    + (target.card.isEffectMonster ? 15 : 0)
    + (defensePosition ? 0 : (attack - opposingStat) / 10);
}

/** Choose among engine-supplied legal targets; null means decline the attack. */
export function chooseAIAttackTarget(game, attacker, targets) {
  if (!enabled(game)) return undefined;
  if (!attacker) return null;
  let chosen = null;
  let best = 0;
  for (const target of targets || []) {
    const score = battleScore(game, attacker, target);
    if (score > best) {
      best = score;
      chosen = target;
    }
  }
  return chosen;
}

/**
 * The engine validates the position change and may supply legalEffectTargets
 * to honor targeting protections without exposing an opposing Set identity.
 */
export function chooseAIMonsterPosition(game, card, { forSummon = false, legalEffectTargets } = {}) {
  if (!enabled(game)) return undefined;
  if (card.extra_type === 'link') return 'attack';
  if (['54652250', '31560081'].includes(passcode(card))) {
    if (forSummon) return 'defense';
    if (card.isSetFaceDown) return flipValue(game, card, legalEffectTargets) > 0 ? 'attack' : 'defense';
  }
  const enemyEntries = monsters(game, ENEMY_SIDE);
  const attack = stat(card, 'atk');
  const defense = stat(card, 'def');
  const strongest = Math.max(0, ...visibleEnemies(game).map(entry => stat(entry.card, 'atk')));
  const usefulAttack = battleAvailable(game) && attack > 0 && (
    enemyEntries.length === 0 || chooseAIAttackTarget(game, card, enemyEntries) !== null
  );
  if (usefulAttack) return 'attack';
  if (strongest > attack || defense > attack) return 'defense';
  // A face-down monster need not be revealed when it has no useful battle.
  if (!forSummon && card.isSetFaceDown) return 'defense';
  return 'attack';
}

/**
 * Score only already legal Normal/Tribute Summon plans supplied by the engine.
 * This bounded one-ply evaluation does not invent legal actions or execute any.
 * null deliberately preserves the existing board; undefined preserves easy AI.
 */
export function chooseAINormalSummonPlan(game, legalPlans) {
  if (!enabled(game)) return undefined;
  const enemies = monsters(game, ENEMY_SIDE);
  const strongest = Math.max(0, ...visibleEnemies(game).map(entry => stat(entry.card, 'atk')));
  let chosen = null;
  let best = 0;
  for (const plan of legalPlans || []) {
    const { card, tributes = [] } = plan;
    const position = chooseAIMonsterPosition(game, card, { forSummon: true });
    let score = cardValue(card) / 12 + 50
      - tributes.reduce((sum, entry) => sum + cardValue(entry.card) / 12 + 55, 0)
      + flipValue(game, card)
      + sanganTributeValue(game, tributes);
    if (position === 'attack' && battleAvailable(game)) {
      if (!enemies.length && stat(card, 'atk') > 0) score += 70;
      else if (chooseAIAttackTarget(game, card, enemies)) {
        const tributeCards = new Set(tributes.map(entry => entry.card));
        const existingBreakthrough = monsters(game, OWN_SIDE).some(entry => (
          !tributeCards.has(entry.card) && !entry.card.isSetFaceDown
          && chooseAIAttackTarget(game, entry.card, enemies)
        ));
        score += existingBreakthrough ? 60 : 180;
      }
    }
    if (strongest > stat(card, 'atk')) score -= 70;
    if (score > best) {
      best = score;
      chosen = { ...plan, isSet: position === 'defense', score };
    }
  }
  return chosen;
}

function fieldModifier(definition, card) {
  return getContinuousFieldSpellStatModifier(card, definition);
}

/** Score implemented continuous Field Spells with their actual ATK/DEF rules. */
export function scoreAIFieldSpell(game, card) {
  if (!enabled(game)) return undefined;
  const next = fieldDefinitions.get(passcode(card));
  // Unsupported/Sandbox artwork is not evidence of a gameplay advantage.
  if (!next) return 0;
  const current = game.getFieldSpellForSide(OWN_SIDE);
  const previous = current && !current.isSetFaceDown && !current.effectNegated
    && !current.activationNegated && hasResolvedFieldSpellActivation(current)
    ? fieldDefinitions.get(passcode(current)) : null;
  const delta = (monster, statistic) => fieldModifier(next, monster)[statistic]
    - fieldModifier(previous, monster)[statistic];
  const battleStatistic = monster => monster.position === 'defense' ? 'def' : 'atk';
  const allies = monsters(game, OWN_SIDE).filter(entry => !entry.card.isSetFaceDown);
  const enemies = visibleEnemies(game);
  let score = allies.reduce((sum, entry) => sum + delta(entry.card, battleStatistic(entry.card)), 0)
    - enemies.reduce((sum, entry) => sum + delta(entry.card, battleStatistic(entry.card)), 0);
  // Credit one plausible future summon from the AI's own hand, not a guessed
  // opposing Set monster or a future draw from either player's Deck.
  const futureGain = ownHand(game).filter(candidate => candidate.card_type === 'monster'
    && !candidate.belongsInExtraDeck && !candidate.isRitualMonster)
    .reduce((best, candidate) => {
      const position = chooseAIMonsterPosition(game, candidate, { forSummon: true });
      const projection = Object.create(candidate);
      projection.position = position;
      return Math.max(best, delta(projection, battleStatistic(projection)));
    }, 0);
  score += futureGain * 0.4;
  for (const ally of allies) {
    for (const enemy of enemies) {
      const defensive = enemy.card.position === 'defense';
      const previousAttack = stat(ally.card, 'atk');
      const previousDefense = stat(enemy.card, defensive ? 'def' : 'atk');
      const before = defensive ? previousAttack > previousDefense : previousAttack >= previousDefense;
      const after = defensive
        ? previousAttack + delta(ally.card, 'atk') > previousDefense + delta(enemy.card, 'def')
        : previousAttack + delta(ally.card, 'atk') >= previousDefense + delta(enemy.card, 'atk');
      if (before !== after) score += after ? 120 : -120;
    }
  }
  return score;
}

function retentionScore(game, card, hand, ownCount) {
  if (game.rulesMode === 'strict' && card.supportedInStrict === false) return -100;
  let value = 60;
  if (card.card_type === 'monster') {
    if (card.belongsInExtraDeck || card.isRitualMonster) return 10;
    const needed = card.level >= 7 ? 2 : card.level >= 5 ? 1 : 0;
    value = cardValue(card) / 30 + 70 + flipValue(game, card) / 2;
    if (needed > ownCount) value -= 80;
    if (needed === 0 && ownCount === 0) value += 50;
  } else {
    const id = passcode(card);
    const values = {
      '12580477': monsters(game, ENEMY_SIDE).length ? 160 : 100,
      '83764718': 135, '55144522': 170, '44095762': 140,
      '4206964': 105, '14087893': 125, '5318639': 110, '24094653': 75
    };
    value = values[id] ?? 60;
    if (fieldDefinitions.has(id)) value = scoreAIFieldSpell(game, card) > 0 ? 100 : 20;
  }
  const duplicates = hand.filter(candidate => passcode(candidate) === passcode(card)).length;
  return value - Math.min(3, duplicates - 1) * 20;
}

/** Returns a card in the AI's own hand without changing its order or contents. */
export function chooseAIHandDiscard(game, hand) {
  if (!enabled(game)) return undefined;
  const candidates = hand || ownHand(game);
  const ownCount = monsters(game, OWN_SIDE).length;
  let chosen = null;
  let lowest = Infinity;
  for (const card of candidates) {
    const score = retentionScore(game, card, candidates, ownCount);
    if (score < lowest) {
      lowest = score;
      chosen = card;
    }
  }
  return chosen;
}
