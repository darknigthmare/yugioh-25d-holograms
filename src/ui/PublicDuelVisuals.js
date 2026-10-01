const SIDES = ['player', 'opponent'];

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
  } else if (['mystical-space-typhoon-cinematic', 'book-of-moon-cinematic'].includes(type)) {
    kind = 'activate';
    source = zoneRef(owner, event.zoneType, event.zoneIndex);
    card = publicCard(event.card);
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
  const profile = type === 'mystical-space-typhoon-cinematic' ? 'typhoon'
    : type === 'book-of-moon-cinematic' ? 'moon' : undefined;
  return Object.freeze({ kind, source: locate(source), ...(target ? { target: locate(target) } : {}), ...(card ? { card } : {}), ...(profile ? { profile } : {}) });
}
