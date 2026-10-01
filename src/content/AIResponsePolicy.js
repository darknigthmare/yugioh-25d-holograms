const AI_SIDE = 'opponent';
const ENEMY_SIDE = 'player';
const MST_ID = '05318639';
const BOOK_ID = '14087893';
const STARDUST_ID = '44508094';
const plannedTargets = new WeakMap();

function passcode(card) {
  return String(card?.id ?? '').padStart(8, '0');
}

function ownCard(game, uid) {
  return [
    ...game.getSideState(AI_SIDE).hand,
    ...game.getSideState(AI_SIDE).spells,
    ...game.getMonsterEntries(AI_SIDE).map(entry => entry.card)
  ].find(card => card && String(card.uid) === String(uid));
}

function spellTargets(game, source) {
  return game.getSpellTargetCandidates(source, AI_SIDE)
    .filter(card => card.controllerId === ENEMY_SIDE)
    .filter(card => !game.chain.chainStack.some(link => (
      link.activatingPlayerId === AI_SIDE
      && ((passcode(link.sourceCard) === passcode(source) && link.targets.includes(card))
        || (link.context?.wouldDestroy && link.targets.includes(card))
        || (passcode(source) === BOOK_ID && passcode(link.sourceCard) === '44095762'
          && card.position === 'attack'))
    )));
}

function mstTargetScore(card) {
  // A Set card's zone and face-down status are public. Its printed identity,
  // subtype and statistics must never influence this choice.
  if (card.isSetFaceDown) return card.location === 'field_zone' ? 60 : 40;
  if (card.location === 'field_zone') return 100;
  if (card.location === 'pendulum_zone' || card.isPendulumScale) return 90;
  if (/continuous|equip|field/i.test(`${card.type || ''} ${card.race || ''}`)) return 80;
  // Destroying an activated Normal/Quick-Play Spell or Normal Trap does not
  // negate its effect. Preserve MST for an appropriate opposing target.
  return 0;
}

function selectMSTTarget(targets) {
  return targets.map(card => ({ card, score: mstTargetScore(card) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.card || null;
}

function selectBookTarget(targets) {
  return [...targets].filter(card => !card.isSetFaceDown)
    .sort((a, b) => b.getAtk() - a.getAtk())[0] || null;
}

function destructionThreatensMonsters(game, request) {
  const link = request.lastLink;
  if (!request.context?.wouldDestroy || link?.activatingPlayerId !== ENEMY_SIDE) return false;
  const ownMonsters = game.getMonsterEntries(AI_SIDE).map(entry => entry.card);
  const targets = [request.context.targetCard, ...(link.targets || [])].filter(Boolean);
  if (targets.length) return targets.some(target => ownMonsters.includes(target));
  const source = link.sourceCard;
  if (!source || source.isSetFaceDown) return false;
  // These local non-targeting destruction effects publicly threaten the AI's
  // field. Time Wizard's random result is unknown when its effect is chained.
  if (['12580477', '71625222'].includes(passcode(source))) return ownMonsters.length > 0;
  return passcode(source) === '44095762'
    && ownMonsters.some(card => !card.isSetFaceDown && card.position === 'attack');
}

function bookResponseTarget(game, request, targets) {
  if (game.currentTurn !== ENEMY_SIDE) return null;
  const context = request.context || {};
  const timing = context.timingEvent || context.event;
  if (timing === 'ATTACK_DECLARED' && context.attackingSide === ENEMY_SIDE) {
    return targets.includes(context.attacker) ? context.attacker : null;
  }
  if (timing === 'SUMMON_SUCCESS' && context.summoningSide === ENEMY_SIDE) {
    return targets.includes(context.summonedCard) ? context.summonedCard : null;
  }
  if (request.lastLink) return null;
  // After an effect Summon, and before leaving Main Phase, a face-up opposing
  // monster is a public threat or potential Synchro/Xyz/Link Material.
  if (game.currentPhase.startsWith('main')
    && ['CHAIN_RESOLVED', 'PHASE_END'].includes(context.event)) {
    return selectBookTarget(targets);
  }
  return null;
}

/** Returns an already legal response UID; easy AI preserves its pass policy. */
export function chooseAIChainResponse(game, request) {
  if (!game || request?.side !== AI_SIDE || game.aiDifficulty === 'easy') return null;
  plannedTargets.delete(game);
  const candidates = request.candidates || [];
  const stardust = candidates.find(candidate => passcode(candidate) === STARDUST_ID);
  if (stardust && destructionThreatensMonsters(game, request)) return stardust.cardUid;

  for (const id of [MST_ID, BOOK_ID]) {
    const candidate = candidates.find(candidate => passcode(candidate) === id);
    if (!candidate) continue;
    const source = ownCard(game, candidate.cardUid);
    if (!source) continue;
    const targets = spellTargets(game, source);
    const target = id === MST_ID
      ? selectMSTTarget(targets)
      : bookResponseTarget(game, request, targets);
    if (!target) continue;
    plannedTargets.set(game, {
      type: id === MST_ID ? 'select-mst-target' : 'select-book-of-moon-target',
      source,
      card: target,
      runtimeInstanceId: target.runtimeInstanceId
    });
    return candidate.cardUid;
  }
  return null;
}

/**
 * Selects the precise target using only the public choices supplied by the
 * engine. Undefined preserves unrelated AI decisions; null cancels a spell
 * with no useful opposing target rather than targeting the AI's own field.
 */
export function chooseAIResponseTarget(game, request) {
  if (!game || request?.side !== AI_SIDE
    || !['select-mst-target', 'select-book-of-moon-target'].includes(request.type)) return undefined;

  const planned = plannedTargets.get(game);
  if (planned?.type === request.type) plannedTargets.delete(game);
  const id = request.type === 'select-mst-target' ? MST_ID : BOOK_ID;
  const source = planned?.type === request.type ? planned.source : [
    ...game.getSideState(AI_SIDE).hand,
    ...game.getSideState(AI_SIDE).spells
  ].find(card => card && passcode(card) === id);
  if (!source) return null;
  const targets = spellTargets(game, source);
  const target = planned?.type === request.type
    ? targets.find(card => card === planned.card && card.runtimeInstanceId === planned.runtimeInstanceId)
    : id === MST_ID ? selectMSTTarget(targets) : selectBookTarget(targets);
  if (!target) return null;
  const exposed = (request.candidates || []).find(candidate => target.isSetFaceDown
    ? candidate.hidden && candidate.location === target.location && candidate.zoneIndex === target.zoneIndex
    : !candidate.hidden && String(candidate.uid) === String(target.uid));
  return exposed?.uid || null;
}
