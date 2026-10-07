import { hasResolvedFieldSpellActivation } from '../core/FieldSpellRules.js';

const EXTRA_SUMMON_TYPES = new Set(['fusion', 'synchro', 'xyz', 'link']);
const SPECIAL_STAT = Object.freeze({
  fusion: 'fusionSummons',
  synchro: 'synchroSummons',
  xyz: 'xyzSummons',
  link: 'linkSummons',
  ritual: 'ritualSummons'
});

function blankStats(resultId) {
  return {
    resultId,
    normalSummons: 0,
    monsterSets: 0,
    tributeSummons: 0,
    fieldSpellActivations: 0,
    fusionSummons: 0,
    synchroSummons: 0,
    xyzSummons: 0,
    linkSummons: 0,
    ritualSummons: 0,
    pendulumSummons: 0,
    damageTaken: 0,
    extraSummonTypes: [],
    playerLP: 0,
    turnCount: 0
  };
}

/**
 * Counts only authoritative events emitted by DuelGame. It never reads logs or
 * translated card names, so a cancelled declaration cannot satisfy a goal.
 */
export function createCampaignDuelTracker(resultId) {
  if (typeof resultId !== 'string' || resultId.length === 0) {
    throw new TypeError('A stable campaign resultId is required.');
  }
  const stats = blankStats(resultId);
  const seenEventObjects = new WeakSet();
  const seenSummons = new Set();
  const seenPendulumTurns = new Set();
  const seenFields = new Set();
  const seenNativeSets = new Set();
  const extraTypes = new Set();

  function recordAnimation(event) {
    if (!event || typeof event !== 'object') return false;
    if (seenEventObjects.has(event)) return false;
    seenEventObjects.add(event);

    if (event.type === 'lp-loss' && event.target === 'player') {
      if (event.cost === true) return false;
      const damage = Number(event.damage);
      if (Number.isFinite(damage) && damage > 0) {
        stats.damageTaken += Math.floor(damage);
        return true;
      }
      return false;
    }
    // A native Set confirms the public action without exposing the Set's card.
    // Position changes to face verso are not Set declarations.
    if (event.type === 'set-monster' && event.target === 'player'
      && event.nativeAction === 'set' && typeof event.publicEventId === 'string') {
      if (seenNativeSets.has(event.publicEventId)) return false;
      seenNativeSets.add(event.publicEventId);
      stats.monsterSets += 1;
      return true;
    }
    if (event.type !== 'summon' || event.target !== 'player' || !event.card) return false;

    const type = String(event.summonType || event.card.summonType || '').toLowerCase();
    const instance = event.card.runtimeInstanceId || event.card.uid || 'unknown-card';
    const turn = Number.isSafeInteger(event.card.turnSummoned) ? event.card.turnSummoned : -1;
    const summonKey = `${instance}:${type}:${turn}`;
    if (seenSummons.has(summonKey)) return false;
    seenSummons.add(summonKey);

    const isSet = event.card.isSetFaceDown === true;
    if (isSet) stats.monsterSets += 1;
    if (type === 'tribute' || Number(event.tributeCount) > 0) {
      if (!isSet) stats.tributeSummons += 1;
      return true;
    }
    if (type === 'normal') {
      if (!isSet) stats.normalSummons += 1;
      return true;
    }
    if (type === 'pendulum') {
      const pendulumKey = `player:${turn}`;
      if (!seenPendulumTurns.has(pendulumKey)) {
        seenPendulumTurns.add(pendulumKey);
        stats.pendulumSummons += 1;
      }
      return true;
    }
    const stat = SPECIAL_STAT[type];
    if (stat) stats[stat] += 1;
    if (EXTRA_SUMMON_TYPES.has(type)) extraTypes.add(type);
    return Boolean(stat);
  }

  function observeState(game) {
    const card = game?.playerFieldSpell;
    if (!hasResolvedFieldSpellActivation(card)) return false;
    const key = `${card.runtimeInstanceId}:${card.fieldActivationSequence}`;
    if (seenFields.has(key)) return false;
    seenFields.add(key);
    stats.fieldSpellActivations += 1;
    return true;
  }

  function snapshot(game) {
    observeState(game);
    return {
      ...stats,
      playerLP: Math.max(0, Math.floor(Number(game?.playerLP) || 0)),
      turnCount: Math.max(0, Math.floor(Number(game?.turnCount) || 0)),
      extraSummonTypes: [...extraTypes].sort()
    };
  }

  return Object.freeze({ recordAnimation, observeState, snapshot });
}
