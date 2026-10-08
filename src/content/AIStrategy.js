import { IMPLEMENTED_FIELD_SPELLS, getContinuousFieldSpellStatModifier, getContinuousFieldSpellLevelModifier } from '../core/ClassicFieldSpellEffects.js';
import { getFieldRuleMonsterRace, isSpellCardActivationPermitted, isTributeSummonPermitted, getNormalSummonTributeCount } from '../core/FieldRuleRuntime.js';
import { hasResolvedFieldSpellActivation } from '../core/FieldSpellRules.js';
import { calculateBattleOutcome } from '../core/BattleEngine.js';
import { ADVANCED_FIELD_SPELL_IDS } from '../core/AdvancedFieldSpellRules.js';

const OWN_SIDE = 'opponent';
const ENEMY_SIDE = 'player';
const fieldDefinitions = new Map(IMPLEMENTED_FIELD_SPELLS.map(definition => [definition.id, definition]));

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

function activeFieldSource(game, source) {
  // An opposing Set Field Spell may be an opaque object. Check its public
  // orientation before reading its identity, runtime or printed properties.
  return Boolean(source && !source.isSetFaceDown && hasResolvedFieldSpellActivation(source)
    && !source.activationNegated && !source.effectNegated
    && !game.defense?.isCardNegated?.(source.uid));
}

function publicFieldSources(game) {
  const sources = [game.field.playerFieldSpellZone, game.field.opponentFieldSpellZone];
  // Small policy fixtures may provide only the own-side accessor. Runtime
  // games expose both public zones directly; never gather opposing side state.
  if (!Object.hasOwn(game.field, 'opponentFieldSpellZone')) {
    sources.push(game.getFieldSpellForSide?.(OWN_SIDE));
  }
  return [...new Set(sources)].filter(source => activeFieldSource(game, source));
}

function battleDefense(game) {
  if (!game.defense) return null;
  return {
    isCardNegated: uid => game.defense.isCardNegated?.(uid) || false,
    hasProtection: (...args) => game.defense.hasProtection?.(...args) || false
  };
}

function ancientForestSource(fields) {
  return fields.find(source => passcode(source) === ADVANCED_FIELD_SPELL_IDS.ANCIENT_FOREST);
}

function attackProjection(card) {
  if (card.position === 'attack' && !card.isSetFaceDown) return card;
  const projection = Object.create(card);
  projection.position = 'attack';
  projection.isSetFaceDown = false;
  return projection;
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

function battleScore(game, attacker, target, fields = publicFieldSources(game)) {
  const attack = stat(attacker, 'atk');
  if (!attack) return 0;
  const forest = ancientForestSource(fields);
  const forestCost = forest && !game.defense?.hasProtection?.(attacker, 'DESTROY_BY_EFFECT', {
    sourceSide: forest.controllerId, sourceCard: forest
  }) ? 120 + cardValue(attacker) / 8 : 0;
  if (target.card.isSetFaceDown) {
    // A fixed uncertainty estimate, never a peek at the Set monster's DEF.
    const estimate = game.aiDifficulty === 'hard' ? 1800 : 1200;
    return attack > estimate ? Math.max(0, 35 + (attack - estimate) / 20 - forestCost) : 0;
  }
  const outcome = calculateBattleOutcome(attacker, target.card, battleDefense(game), { fieldSpells: fields });
  if (!outcome.defenderDestroyed && !outcome.defenderDamage) return 0;
  if (outcome.attackerDestroyed) {
    // An equal-ATK exchange is useful only if it does not sacrifice a more
    // valuable public effect monster for a less valuable one.
    const valueDifference = cardValue(target.card) - cardValue(attacker);
    // A monster already destroyed in this battle cannot be lost a second
    // time to Ancient Forest's End Step effect.
    return valueDifference < 0 ? 0 : 15 + valueDifference / 50;
  }
  return Math.max(0, (outcome.defenderDestroyed ? 150 + stat(target.card, 'atk') / 100 : 0)
    + (target.card.isEffectMonster ? 15 : 0)
    + (forestCost && outcome.defenderDestroyed ? cardValue(target.card) / 25 : 0)
    + outcome.defenderDamage / 10 - outcome.attackerDamage / 10 - forestCost);
}

/** Choose among engine-supplied legal targets; null means decline the attack. */
export function chooseAIAttackTarget(game, attacker, targets, { fieldSpells } = {}) {
  if (!enabled(game)) return undefined;
  if (!attacker) return null;
  let chosen = null;
  let best = 0;
  for (const target of targets || []) {
    const score = battleScore(game, attacker, target, fieldSpells);
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
export function chooseAIMonsterPosition(game, card, {
  forSummon = false, legalEffectTargets, enemyEntries, fieldSpells, projectedFieldStats = false
} = {}) {
  if (!enabled(game)) return undefined;
  if (card.extra_type === 'link') return 'attack';
  if (['54652250', '31560081'].includes(passcode(card))) {
    if (forSummon) return 'defense';
    if (card.isSetFaceDown) return flipValue(game, card, legalEffectTargets) > 0 ? 'attack' : 'defense';
  }
  if (forSummon && !projectedFieldStats) {
    fieldSpells ||= publicFieldSources(game);
    card = monsterProjection(game, card, [], fieldSpells, { fromHand: true });
  }
  enemyEntries ||= monsters(game, ENEMY_SIDE);
  const attack = stat(card, 'atk');
  const defense = stat(card, 'def');
  const strongest = Math.max(0, ...enemyEntries.filter(entry => !entry.card.isSetFaceDown)
    .map(entry => stat(entry.card, 'atk')));
  const usefulAttack = battleAvailable(game) && attack > 0 && (
    enemyEntries.length === 0 || chooseAIAttackTarget(game, attackProjection(card), enemyEntries, { fieldSpells }) !== null
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
    const projected = monsterProjection(game, card, [], publicFieldSources(game), { fromHand: true, position });
    let score = cardValue(projected) / 12 + 50
      - tributes.reduce((sum, entry) => sum + cardValue(entry.card) / 12 + 55, 0)
      + flipValue(game, card)
      + sanganTributeValue(game, tributes);
    if (position === 'attack' && battleAvailable(game)) {
      if (!enemies.length && stat(projected, 'atk') > 0) score += 70;
      else if (chooseAIAttackTarget(game, projected, enemies)) {
        const tributeCards = new Set(tributes.map(entry => entry.card));
        const existingBreakthrough = monsters(game, OWN_SIDE).some(entry => (
          !tributeCards.has(entry.card) && !entry.card.isSetFaceDown
          && chooseAIAttackTarget(game, entry.card, enemies)
        ));
        score += existingBreakthrough ? 60 : 180;
      }
    }
    if (strongest > stat(projected, 'atk')) score -= 70;
    if (score > best) {
      best = score;
      chosen = { ...plan, isSet: position === 'defense', score };
    }
  }
  return chosen;
}

function fieldModifier(game, definition, card) {
  const controllerId = definition?.controllerId;
  const graveyard = ['player', 'opponent'].includes(controllerId)
    ? game.field[`${controllerId}Graveyard`] || [] : [];
  return getContinuousFieldSpellStatModifier(card, definition, {
    controllerId, currentTurn: game.currentTurn,
    graveyardMonsterCount: graveyard.filter(value => value.card_type === 'monster').length
  });
}

function resolvedFieldProjection(card) {
  const projection = Object.create(card);
  projection.location = 'field_zone';
  projection.controllerId = OWN_SIDE;
  projection.isSetFaceDown = false;
  projection.effectNegated = false;
  projection.activationNegated = false;
  projection.fieldActivationState = 'resolved';
  projection.fieldActivationSequence = 1;
  projection.fieldActivationRuntimeInstanceId = projection.runtimeInstanceId;
  return projection;
}

function continuousModifier(game, fields, card) {
  return fields.reduce((total, field) => {
    const modifier = fieldModifier(game, field, card);
    return { atk: total.atk + modifier.atk, def: total.def + modifier.def };
  }, { atk: 0, def: 0 });
}

function monsterProjection(game, card, beforeFields, afterFields, {
  fromHand = false, position = card.position, reveal = false
} = {}) {
  const projection = Object.create(card);
  projection.position = position;
  if (fromHand) {
    projection.location = 'monster_zone';
    projection.controllerId = OWN_SIDE;
  }
  if (reveal) projection.isSetFaceDown = false;
  let level = card.baseLevel ?? card.level ?? card.getLevel?.() ?? 0;
  let race = card.race;
  let attribute = card.attribute;
  for (const modifier of card.activeModifiers || []) {
    const ownEffect = [String(card.uid), String(card.id)].includes(String(modifier.sourceCardId));
    if (card.effectNegated && modifier.requiresSourceEffectActive && ownEffect) continue;
    if (modifier.type === 'level') level += modifier.value;
    if (modifier.type === 'race') race = modifier.value;
    if (modifier.type === 'attribute') attribute = modifier.value;
  }
  projection.currentAttribute = attribute;
  projection.currentRace = getFieldRuleMonsterRace(projection, afterFields, race);
  const hasLevel = !['xyz', 'link'].includes(card.extra_type) && !/Xyz|Link/i.test(card.type || '');
  if (!projection.isSetFaceDown && hasLevel) {
    level += afterFields.reduce((sum, field) => sum + getContinuousFieldSpellLevelModifier(projection, field), 0);
  }
  projection.currentLevel = hasLevel ? Math.max(1, level) : 0;
  projection.getLevel = () => projection.currentLevel;
  // Hand monsters and Set monsters do not already contain a Field Spell's
  // modifier. An existing face-up monster does, so remove its old modifiers.
  const previous = fromHand || card.isSetFaceDown ? { atk: 0, def: 0 }
    : continuousModifier(game, beforeFields, card);
  const next = projection.isSetFaceDown ? { atk: 0, def: 0 }
    : continuousModifier(game, afterFields, projection);
  // Remove old bonuses before flooring at zero. A 200 DEF monster reduced to
  // zero by Gaia Power must regain 200 DEF, rather than an invented 400 DEF.
  const currentAtk = stat(card, 'atk') || Math.min(0, card.currentAtk || 0);
  const currentDef = Number.isFinite(card.currentDef) ? card.currentDef : stat(card, 'def');
  const atk = currentAtk + next.atk - previous.atk;
  const def = card.getDef() === null ? null : currentDef + next.def - previous.def;
  // Resolve all modifier offsets before defining these getters: the shared
  // continuous helper itself checks getDef for Link monsters.
  projection.getAtk = () => Math.max(0, atk);
  projection.getDef = () => def === null ? null : Math.max(0, def);
  return projection;
}

function bestPublicAttack(game, card, enemies, fields) {
  if (!battleAvailable(game)) return 0;
  const attacker = attackProjection(card);
  return enemies.reduce((best, target) => Math.max(best, battleScore(game, attacker, target, fields)), 0);
}

function incomingBattleDamage(game, ally, enemies, fields) {
  return enemies.reduce((worst, enemy) => Math.max(worst,
    calculateBattleOutcome(attackProjection(enemy.card), ally, battleDefense(game), {
      fieldSpells: fields
    }).defenderDamage), 0);
}

/** Score public combat with the same explicit Field rules as the live engine. */
export function scoreAIFieldSpell(game, card) {
  if (!enabled(game)) return undefined;
  const next = fieldDefinitions.get(passcode(card));
  // Unsupported/Sandbox artwork is not evidence of a gameplay advantage.
  if (!next) return 0;
  const current = game.getFieldSpellForSide?.(OWN_SIDE) || game.field.opponentFieldSpellZone;
  const beforeFields = publicFieldSources(game);
  const afterFields = [...beforeFields.filter(source => source !== current), resolvedFieldProjection(card)];
  const forcesAttack = next.id === ADVANCED_FIELD_SPELL_IDS.ANCIENT_FOREST;
  const projectEntry = (entry, own) => {
    // A future reveal does not make an opposing Set card's identity public now.
    if (!own && entry.card.isSetFaceDown) return entry;
    const forced = forcesAttack && entry.card.position === 'defense';
    return { ...entry, card: monsterProjection(game, entry.card, beforeFields, afterFields, {
      position: forced ? 'attack' : entry.card.position,
      reveal: forced
    }) };
  };
  const battleStatistic = monster => monster.position === 'defense' ? 'def' : 'atk';
  const allies = monsters(game, OWN_SIDE).filter(entry => forcesAttack || !entry.card.isSetFaceDown);
  const enemies = visibleEnemies(game);
  const afterAllies = allies.map(entry => projectEntry(entry, true));
  const afterEnemies = enemies.map(entry => projectEntry(entry, false));
  const afterEnemyEntries = monsters(game, ENEMY_SIDE).map(entry => projectEntry(entry, false));
  let score = allies.reduce((sum, entry, index) => sum + (entry.card.isSetFaceDown ? 0
    : stat(afterAllies[index].card, battleStatistic(entry.card)) - stat(entry.card, battleStatistic(entry.card))), 0)
    - enemies.reduce((sum, entry, index) => sum
      + stat(afterEnemies[index].card, battleStatistic(entry.card)) - stat(entry.card, battleStatistic(entry.card)), 0);

  // Activation restrictions are evaluated from public monsters only. The AI
  // can estimate a spell lock without reading a card in the opponent's hand.
  const permissionBoard = (own, enemy) => ({
    field: { opponentMonsterZones: own.map(entry => entry.card),
      playerMonsterZones: enemy.map(entry => entry.card), extraMonsterZones: [] },
    fieldRules: game.fieldRules, currentTurn: game.currentTurn, turnCount: game.turnCount
  });
  const beforeBoard = permissionBoard(monsters(game, OWN_SIDE), monsters(game, ENEMY_SIDE));
  const afterBoard = permissionBoard(afterAllies, afterEnemyEntries);
  const ordinarySpell = { card_type: 'spell', race: 'Normal' };
  const hasFutureOwnSpell = ownHand(game).some(candidate => candidate !== card && candidate.card_type === 'spell');
  const restrictionValue = (board, fields) => {
    const enemyBlocked = !isSpellCardActivationPermitted(board, ordinarySpell, ENEMY_SIDE, { sources: fields });
    const ownBlocked = !isSpellCardActivationPermitted(board, ordinarySpell, OWN_SIDE, { sources: fields });
    return (enemyBlocked ? 150 : 0) - (ownBlocked && hasFutureOwnSpell ? 200 : 0);
  };
  score += restrictionValue(afterBoard, afterFields) - restrictionValue(beforeBoard, beforeFields);
  for (const candidate of ownHand(game).filter(value => value.card_type === 'monster'
    && value.type === 'Normal Monster')) {
    const canTributeUnder = fields => {
      const projected = monsterProjection(game, candidate, [], fields, { fromHand: true });
      return getNormalSummonTributeCount(projected) === 0
        || isTributeSummonPermitted(game, candidate, OWN_SIDE, { sources: fields });
    };
    if (canTributeUnder(afterFields) !== canTributeUnder(beforeFields)) {
      score += canTributeUnder(afterFields) ? 150 : -150;
    }
  }

  for (let index = 0; index < allies.length; index++) {
    const ally = allies[index].card;
    const projected = afterAllies[index].card;
    score += bestPublicAttack(game, projected, afterEnemies, afterFields)
      - bestPublicAttack(game, ally, enemies, beforeFields);
    // Sanctuary's gain is damage prevented, never imaginary DEF. Forest's
    // forced Attack Position can expose an ally to actual battle damage.
    score += (incomingBattleDamage(game, ally, enemies, beforeFields)
      - incomingBattleDamage(game, projected, afterEnemies, afterFields)) / 5;
    if (forcesAttack && ally.isSetFaceDown) {
      score -= 100 + flipValue(game, ally);
    }
  }
  // Credit one plausible future summon from the AI's own hand, not a guessed
  // opposing Set monster or a future draw. Choose its position after adding
  // the proposed Field's effects: Wetlands can make a 700 ATK Slime an attacker.
  const futureGain = ownHand(game).filter(candidate => candidate.card_type === 'monster'
    && !candidate.belongsInExtraDeck && !candidate.isRitualMonster)
    .reduce((best, candidate) => {
      const preview = monsterProjection(game, candidate, [], afterFields, { fromHand: true });
      const position = chooseAIMonsterPosition(game, preview, {
        forSummon: true, enemyEntries: afterEnemyEntries, fieldSpells: afterFields, projectedFieldStats: true
      });
      const before = monsterProjection(game, candidate, [], beforeFields, { fromHand: true, position });
      const after = monsterProjection(game, candidate, [], afterFields, { fromHand: true, position });
      const statistic = position === 'defense' ? 'def' : 'atk';
      const gain = stat(after, statistic) - stat(before, statistic)
        + bestPublicAttack(game, after, afterEnemies, afterFields)
        - bestPublicAttack(game, before, enemies, beforeFields);
      return Math.max(best, gain);
    }, 0);
  score += futureGain * 0.4;
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
