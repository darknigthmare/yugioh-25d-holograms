const DESCRIPTORS = Object.freeze({
  '54652250': Object.freeze({
    effectId: 'MAN_EATER_BUG_DESTROY', kind: 'destroy-monster',
    mandatory: true, spellSpeed: 1, requiresTarget: true, usableInDamageStep: true
  }),
  '31560081': Object.freeze({
    effectId: 'MAGICIAN_OF_FAITH_RECOVER', kind: 'recover-spell',
    mandatory: true, spellSpeed: 1, requiresTarget: true, usableInDamageStep: true
  }),
  '26202165': Object.freeze({
    effectId: 'SANGAN_SEARCH', kind: 'search-monster',
    mandatory: true, spellSpeed: 1, requiresTarget: false,
    hardOncePerTurn: true, canonicalName: 'Sangan', usableInDamageStep: true
  })
});

function cardId(card) {
  return String(card?.id ?? '').replace(/^0+(?=\d)/, '');
}

function effectId(card, context = {}) {
  return context.effectId || context.descriptor?.effectId || DESCRIPTORS[cardId(card)]?.effectId;
}

/** The three effects are explicit scripts, never inferred from arbitrary text. */
export function getScriptedTriggerDescriptors(card, event) {
  const descriptor = DESCRIPTORS[cardId(card)];
  if (!descriptor || !event || (event.card && event.card !== card)) return [];
  const expectedEvent = descriptor.effectId === 'SANGAN_SEARCH'
    ? 'SENT_FROM_FIELD_TO_GRAVEYARD' : 'FLIPPED_FACE_UP';
  return event.type === expectedEvent ? [descriptor] : [];
}

export function getScriptedMonsterEffectTargets(game, card, side, context = {}) {
  const id = effectId(card, context);
  if (id === 'MAN_EATER_BUG_DESTROY') {
    return ['player', 'opponent'].flatMap(controller => game.getMonsterEntries(controller)
      .map(entry => entry.card))
      // A monster already destroyed by this battle is not a legal target for
      // a Flip effect activated after damage calculation.
      .filter(target => !target.pendingBattleDestruction
        && !game.defense.hasProtection(target, 'TARGET', { sourceSide: side, sourceCard: card }));
  }
  if (id === 'MAGICIAN_OF_FAITH_RECOVER') {
    return game.getSideState(side).graveyard.filter(target => target.card_type === 'spell'
      && !game.defense.hasProtection(target, 'TARGET', { sourceSide: side, sourceCard: card }));
  }
  if (id === 'SANGAN_SEARCH') {
    return game.getSideState(side).deck.filter(target => target.card_type === 'monster'
      && !target.isToken && !target.belongsInExtraDeck
      && Number.isFinite(target.baseAtk) && target.baseAtk >= 0 && target.baseAtk <= 1500);
  }
  return [];
}

function lockedTargetStillValid(game, context, side, kind) {
  const target = context.targetCard;
  if (!target || String(target.uid) !== String(context.targetUid)
    || target.runtimeInstanceId !== context.targetRuntimeInstanceId) return false;
  if (typeof game.isTriggerTargetStillValid === 'function' && !game.isTriggerTargetStillValid(context)) return false;
  return kind === 'monster'
    ? ['player', 'opponent'].some(controller => game.getMonsterEntries(controller).some(entry => entry.card === target))
    : game.getSideState(side).graveyard.includes(target) && target.card_type === 'spell';
}

function canonicalName(card) {
  return String(card.name_en || card.name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');
}

function sourceVisualContext(card, side, context) {
  const event = context.triggerSnapshot || context.event;
  return {
    sourceSide: context.sourceSide || event?.sourceSide || side,
    sourceZoneType: context.sourceZoneType || event?.sourceZoneType || (card.location === 'extra_monster_zone' ? 'extra' : 'main'),
    sourceZoneIndex: context.sourceZoneIndex ?? event?.sourceZoneIndex ?? card.zoneIndex
  };
}

export function createSanganActivationRestriction(card, side, turnCount) {
  const name = canonicalName(card);
  const id = cardId(card);
  return {
    id: `sangan-name-lock:${side}:${id}:${turnCount}`,
    playerId: side,
    actionType: 'ACTIVATE_EFFECT',
    expires: 'turn_end',
    // Also covers copies represented with another locale or a leading zero.
    filter: candidate => cardId(candidate) === id || canonicalName(candidate) === name
  };
}

export async function resolveScriptedMonsterEffect(game, card, side, context = {}) {
  const generation = game._duelGeneration;
  const id = effectId(card, context);
  if (id === 'MAN_EATER_BUG_DESTROY') {
    if (!lockedTargetStillValid(game, context, side, 'monster')) return false;
    const target = context.targetCard;
    const entry = game.getMonsterEntries(target.controllerId).find(candidate => candidate.card === target);
    const targetSide = target.controllerId;
    if (!game.removeCardFromCurrentZone(target, { byCardEffect: true, sourceSide: side })) return false;
    game.callbacks.onAnimation({
      type: 'flip-destroy-cinematic', target: targetSide, card, targetCard: target,
      zoneIndex: entry.zoneIndex, zoneType: entry.zoneType, ...sourceVisualContext(card, side, context)
    });
    if (!game.isDuelGenerationCurrent(generation)) return false;
    game.emitMonsterAnimation('destroy', targetSide, entry);
    game.log(`**${card.name}** détruit **${target.name}** avec son effet FLIP.`, side);
    return true;
  }
  if (id === 'MAGICIAN_OF_FAITH_RECOVER') {
    if (!lockedTargetStillValid(game, context, side, 'spell')) return false;
    const target = context.targetCard;
    const moved = game.field.moveCard(target, 'hand', side);
    if (!moved?.success) return false;
    game.getSideState(side).hand.push(target);
    game.callbacks.onAnimation({ type: 'spell-recovery-cinematic', target: side, card, targetCard: target,
      ...sourceVisualContext(card, side, context) });
    if (!game.isDuelGenerationCurrent(generation)) return false;
    game.log(`**${card.name}** ajoute **${target.name}** du Cimetière à la main.`, side);
    return true;
  }
  if (id !== 'SANGAN_SEARCH') return false;

  // Sangan searches at resolution; it does not target a Deck card at
  // activation. The candidate instance is still revalidated after a decision.
  const candidates = getScriptedMonsterEffectTargets(game, card, side, context);
  if (!candidates.length) return false;
  const instances = new Map(candidates.map(candidate => [candidate, candidate.runtimeInstanceId]));
  const selected = await game.chooseCard('select-sangan-search', side, candidates,
    cards => [...cards].sort((a, b) => b.baseAtk - a.baseAtk)[0], { required: true });
  if (!game.isDuelGenerationCurrent(generation) || game.winner || game._duelEnded) return false;
  // A mandatory search cannot be declined while a legal card exists.
  const target = selected || candidates.find(candidate => game.getSideState(side).deck.includes(candidate)
    && candidate.runtimeInstanceId === instances.get(candidate));
  const state = game.getSideState(side);
  if (!target || instances.get(target) !== target.runtimeInstanceId
    || !getScriptedMonsterEffectTargets(game, card, side, context).includes(target)) return false;
  const index = state.deck.indexOf(target);
  if (index === -1) return false;
  state.deck.splice(index, 1);
  const moved = game.field.moveCard(target, 'hand', side);
  if (!moved?.success) return false;
  state.hand.push(target);
  game.shuffle(state.deck);
  game.defense.addRestriction(createSanganActivationRestriction(target, side, game.turnCount));
  // Search results are revealed to both duelists; the remaining Deck is not.
  game.callbacks.onAnimation({ type: 'deck-search-cinematic', target: side, card, targetCard: target,
    revealed: true, ...sourceVisualContext(card, side, context) });
  if (!game.isDuelGenerationCurrent(generation)) return false;
  game.log(`**${card.name}** révèle et ajoute **${target.name}** à la main. Les cartes et effets de ce nom ne peuvent pas être activés le reste du tour.`, side);
  return true;
}
