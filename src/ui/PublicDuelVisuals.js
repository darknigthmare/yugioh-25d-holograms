const SIDES = ['player', 'opponent'];
const SUMMON_VISUAL_PROFILES = Object.freeze({
  fusion: 'fusion-summon', synchro: 'synchro-summon', xyz: 'xyz-summon',
  link: 'link-summon', ritual: 'ritual-summon', pendulum: 'pendulum-summon',
  flip: 'flip-summon', special: 'special-summon', normal: 'summon', tribute: 'summon'
});
const FIELD_RULE_VISUALS = Object.freeze({
  'sanctuary-protection-cinematic': Object.freeze({ profile: 'sanctuary-protection', kind: 'shield', poseKind: 'casting' }),
  'skyscraper-boost-cinematic': Object.freeze({ profile: 'skyscraper-boost', kind: 'activate', poseKind: 'attack' }),
  'ancient-forest-destruction-cinematic': Object.freeze({ profile: 'ancient-forest-destruction', kind: 'destroy', poseKind: 'recoil' }),
  'dark-city-boost-cinematic': Object.freeze({ profile: 'dark-city-boost', kind: 'activate', poseKind: 'attack', changeKind: 'atk-increase' }),
  'shien-mist-reduction-cinematic': Object.freeze({ profile: 'shien-mist-reduction', kind: 'activate', poseKind: 'recoil', changeKind: 'atk-decrease' }),
  'canyon-damage-cinematic': Object.freeze({ profile: 'canyon-damage', kind: 'activate', poseKind: 'recoil', changeKind: 'damage-double' }),
  'temple-minds-eye-cinematic': Object.freeze({ profile: 'temple-minds-eye', kind: 'activate', poseKind: 'casting', changeKind: 'damage-fixed' })
});

/** Only the applied public result crosses this boundary; no live stats do. */
function publicFieldRuleChange(event, kind) {
  if (!kind) return null;
  const boundedNumber = value => Number.isInteger(value) && value >= 0 && value <= 1000000;
  const value = kind === 'atk-increase' ? event.bonus : kind === 'atk-decrease' ? event.reduction
    : kind === 'damage-double' ? 2 : 1000;
  if (!boundedNumber(value) || value === 0) return null;
  const result = { kind, value, sourceCount: Number.isInteger(event.sourceCount)
    && event.sourceCount >= 1 && event.sourceCount <= 2 ? event.sourceCount : 1 };
  if (kind.startsWith('atk-')) {
    if (boundedNumber(event.calculatedAtk)) result.calculatedAtk = event.calculatedAtk;
  } else {
    if (boundedNumber(event.originalDamage)) result.originalDamage = event.originalDamage;
    if (boundedNumber(event.modifiedDamage)) result.modifiedDamage = event.modifiedDamage;
    if (SIDES.includes(event.damageSide)) result.damageSide = event.damageSide;
    result.directAttack = event.directAttack === true;
  }
  return Object.freeze(result);
}

function publicCard(card) {
  if (!card || card.isSetFaceDown === true) return null;
  return Object.freeze(Object.fromEntries(
    ['id', 'name', 'name_en', 'race', 'attribute', 'type'].map(field => [
      field, String(card[field] ?? '').slice(0, field === 'id' ? 12 : 120)
    ])
  ));
}

function monsterEntries(game, side) {
  if (typeof game?.getMonsterEntries === 'function') return game.getMonsterEntries(side);
  const main = (game?.[`${side}Monsters`] || []).flatMap((card, zoneIndex) => (
    card ? [{ card, zoneType: 'main', zoneIndex }] : []
  ));
  const extra = (game?.extraMonsterZones || []).flatMap((entry, zoneIndex) => (
    entry?.controllerId === side ? [{ card: entry.card, zoneType: 'extra', zoneIndex }] : []
  ));
  return [...main, ...extra];
}

export function publicMonsterVisualKey(owner, zoneType, zoneIndex) {
  return `${owner}:${zoneType}:${zoneIndex}`;
}

/** Only already revealed field monsters cross into the decorative renderer. */
export function createPublicFieldHolograms(game, positionResolver = () => undefined) {
  return Object.freeze(SIDES.flatMap(owner => monsterEntries(game, owner).flatMap(entry => {
    // Check visibility before touching any identity, text or artwork property.
    if (!entry.card || entry.card.isSetFaceDown === true) return [];
    const zoneType = entry.zoneType === 'extra' ? 'extra' : 'main';
    const zoneIndex = Number(entry.zoneIndex);
    if (!Number.isInteger(zoneIndex) || zoneIndex < 0 || zoneIndex >= (zoneType === 'extra' ? 2 : 5)) return [];
    const ref = { owner, zoneType, zoneIndex };
    const worldPosition = positionResolver(ref);
    return [Object.freeze({
      ...ref,
      key: publicMonsterVisualKey(owner, zoneType, zoneIndex),
      faceUp: true,
      position: entry.card.position === 'defense' ? 'defense' : 'attack',
      card: publicCard(entry.card),
      ...(Array.isArray(worldPosition) ? { worldPosition: Object.freeze([...worldPosition]) } : {})
    })];
  })));
}

/** Animation payloads are reconstructed, never forwarded with live card state. */
export function createPublicCombatVisual(event, game, positionResolver = () => undefined) {
  if (!event || event.faceDown === true) return null;
  const type = event.type;
  let owner = event.attackerSide || event.target;
  let kind;
  let source;
  let target;
  let card = null;
  let targetCard = null;
  let profile;
  let targetPoseKind;
  let ruleChange = null;
  const zoneRef = (side, zoneType, zoneIndex) => ({ owner: side, zoneType: zoneType || 'main', zoneIndex });
  if (type === 'attack-direct' || type === 'attack-monster') {
    owner = type === 'attack-direct' ? (event.target === 'player' ? 'opponent' : 'player') : event.attackerSide;
    source = zoneRef(owner, event.atkZoneType, event.atkZoneIndex);
    const entry = monsterEntries(game, owner).find(item => item.zoneType === source.zoneType && item.zoneIndex === source.zoneIndex);
    card = publicCard(entry?.card || event.card);
    if (!card) return null;
    const opponent = owner === 'player' ? 'opponent' : 'player';
    target = type === 'attack-direct' ? { owner: opponent, direct: true } : zoneRef(opponent, event.defZoneType, event.defZoneIndex);
    kind = 'attack';
  } else if (['summon', 'flip-summon', 'destroy', 'reborn-cinematic'].includes(type)) {
    source = zoneRef(owner, event.zoneType, event.zoneIndex);
    kind = type === 'destroy' ? 'destroy' : 'summon';
    card = publicCard(event.card);
    if (kind === 'summon') {
      // A revived Fusion is an ordinary Special Summon. Printed card type
      // alone cannot identify the procedure that actually succeeded.
      if (event.nativeSummonConfirmed === true) {
        profile = SUMMON_VISUAL_PROFILES[event.summonType] || 'summon';
      } else if (type === 'reborn-cinematic') profile = 'revival';
      else if (type === 'flip-summon') profile = 'flip-summon';
    }
  } else if (type === 'chain-negated' || type === 'attack-negated') {
    owner = type === 'attack-negated' ? event.attackerSide : event.target;
    source = zoneRef(owner, type === 'attack-negated' ? event.atkZoneType : event.zoneType,
      type === 'attack-negated' ? event.atkZoneIndex : event.zoneIndex);
    card = publicCard(event.card);
    if (!card) return null;
    kind = 'negate';
  } else if (type === 'field-source-change') {
    if (event.resolved !== true || event.active !== true || event.negated === true) return null;
    source = zoneRef(owner, 'field', 0);
    card = publicCard(event.card);
    if (!card) return null;
    kind = 'activate';
  } else if (Object.hasOwn(FIELD_RULE_VISUALS, type)) {
    const fieldVisual = FIELD_RULE_VISUALS[type];
    owner = event.sourceSide;
    if (!SIDES.includes(owner) || !SIDES.includes(event.target)
      || !['main', 'extra'].includes(event.zoneType || 'main')
      || !Number.isInteger(event.zoneIndex) || event.zoneIndex < 0
      || event.zoneIndex >= (event.zoneType === 'extra' ? 2 : 5)) return null;
    source = zoneRef(owner, 'field', 0);
    target = zoneRef(event.target, event.zoneType, event.zoneIndex);
    card = publicCard(event.card);
    if (!card) return null;
    // Ancient Forest resolves after movement: the old zone is enough to bind
    // roots, and target identity is deliberately never read, even in the GY.
    if (type !== 'ancient-forest-destruction-cinematic' && event.targetFaceDown !== true) {
      targetCard = publicCard(event.targetCard);
    }
    ({ kind, profile, poseKind: targetPoseKind } = fieldVisual);
    ruleChange = publicFieldRuleChange(event, fieldVisual.changeKind);
    if (fieldVisual.changeKind && !ruleChange) return null;
  } else if (['mystical-space-typhoon-cinematic', 'book-of-moon-cinematic'].includes(type)) {
    kind = 'activate';
    source = zoneRef(owner, event.zoneType, event.zoneIndex);
    card = publicCard(event.card);
  } else if (['flip-destroy-cinematic', 'spell-recovery-cinematic', 'deck-search-cinematic'].includes(type)) {
    owner = event.sourceSide || event.target;
    kind = 'activate';
    source = zoneRef(owner, event.sourceZoneType, event.sourceZoneIndex);
    card = publicCard(event.card);
    target = type === 'flip-destroy-cinematic'
      ? zoneRef(event.target, event.zoneType, event.zoneIndex)
      : { owner, direct: true };
  } else if (['activate', 'activate-monster-effect', 'effect-protect', 'raigeki-cinematic', 'mirror-force-cinematic'].includes(type)) {
    kind = ['effect-protect', 'mirror-force-cinematic'].includes(type) ? 'shield' : 'activate';
    source = zoneRef(owner, event.zoneType || (type === 'activate' ? 'spell' : 'main'), event.zoneIndex);
    card = publicCard(event.card);
    // Cinematic callbacks follow actual effect resolution, not text heuristics.
    if (type === 'raigeki-cinematic') card = Object.freeze({ id: '12580477', race: 'Normal', type: 'Spell Card' });
  } else {
    return null;
  }
  if (!SIDES.includes(owner)) return null;
  const locate = ref => {
    if (!ref || ref.direct || !Number.isInteger(ref.zoneIndex)) return ref;
    const position = positionResolver(ref);
    return Array.isArray(position) && kind === 'attack'
      ? [position[0], position[1] + 1.5, position[2]] : position || ref;
  };
  profile ||= type === 'mystical-space-typhoon-cinematic' ? 'typhoon'
    : type === 'book-of-moon-cinematic' ? 'moon' : undefined;
  // Retain public zone coordinates separately from absolute aim points so a
  // creature can animate without exposing the duel's internal card instance.
  const sourceRef = source && SIDES.includes(source.owner)
    && ['main', 'extra', 'field'].includes(source.zoneType)
    && Number.isInteger(source.zoneIndex)
      ? Object.freeze({ ...source }) : undefined;
  const targetRef = target && !target.direct && SIDES.includes(target.owner)
    && ['main', 'extra'].includes(target.zoneType)
    && Number.isInteger(target.zoneIndex)
      ? Object.freeze({ ...target }) : undefined;
  return Object.freeze({ kind, source: locate(source), ...(sourceRef ? { sourceRef } : {}),
    ...(target ? { target: locate(target) } : {}), ...(targetRef ? { targetRef } : {}),
    ...(card ? { card } : {}), ...(profile ? { profile } : {}),
    ...(targetCard ? { targetCard } : {}),
    ...(ruleChange ? { ruleChange } : {}),
    ...(targetPoseKind ? { poseTarget: 'target', poseKind: targetPoseKind } : {}) });
}
