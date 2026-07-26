import { isFieldSpellCard } from '../core/FieldSpellRules.js';
import { isPlainObject, validateJsonValue } from './protocol.js';

const SIDES = Object.freeze(['player', 'opponent']);
const SIDE_SET = new Set(SIDES);
const MAIN_ZONE_COUNT = 5;
const EXTRA_ZONE_COUNT = 2;
const SNAPSHOT_SCHEMA_VERSION = 1;

/**
 * This list is intentionally closed. It contains only actions that can be
 * applied through the current DuelGame API without trusting arbitrary method
 * names or arbitrary state patches received from a peer.
 */
export const DUEL_GAME_NETWORK_ACTION_KINDS = Object.freeze([
  'NORMAL_SUMMON',
  'SET_MONSTER',
  'SET_SPELL_TRAP',
  'ACTIVATE_FIELD_SPELL',
  'SET_FIELD_SPELL',
  'ACTIVATE_SET_FIELD_SPELL',
  'TOGGLE_POSITION',
  'SELECT_TRIBUTE',
  'CANCEL_TRIBUTE',
  'BEGIN_SYNCHRO_SUMMON',
  'SELECT_SYNCHRO_MATERIAL',
  'CANCEL_EXTRA_SUMMON',
  'XYZ_SUMMON',
  'LINK_SUMMON',
  'ACTIVATE_PENDULUM_SCALE',
  'PENDULUM_SUMMON',
  'DISCARD_HAND_LIMIT',
  'ADVANCE_PHASE'
]);

const ACTION_KIND_SET = new Set(DUEL_GAME_NETWORK_ACTION_KINDS);

/**
 * These omissions are deliberate, not silent no-ops. DuelGame currently
 * exposes these flows through player-only methods and/or local decision
 * callbacks. Accepting them remotely would let the authoritative peer choose
 * another player's chain response, random result, or target.
 */
export const DUEL_GAME_NETWORK_LIMITATIONS = Object.freeze({
  ACTIVATE_SPELL_OR_TRAP:
    'Remote chain windows and target decisions are not exposed by DuelGame.',
  ACTIVATE_MONSTER_EFFECT:
    'Some supported effects require private choices or non-deterministic results.',
  DECLARE_ATTACK:
    'DuelGame.executeAttack is still player-oriented and cannot safely resolve both sides.',
  FUSION_SUMMON:
    'Fusion currently delegates material and response choices to the local UI.',
  RITUAL_SUMMON:
    'Ritual currently delegates monster selection and chain responses to the local UI.'
});

const ACTION_SCHEMAS = Object.freeze({
  NORMAL_SUMMON: {
    required: ['cardUid', 'zoneIndex'],
    optional: []
  },
  SET_MONSTER: {
    required: ['cardUid', 'zoneIndex'],
    optional: []
  },
  SET_SPELL_TRAP: {
    required: ['cardUid', 'zoneIndex'],
    optional: []
  },
  ACTIVATE_FIELD_SPELL: {
    required: ['cardUid'],
    optional: []
  },
  SET_FIELD_SPELL: {
    required: ['cardUid'],
    optional: []
  },
  ACTIVATE_SET_FIELD_SPELL: {
    required: ['cardUid'],
    optional: []
  },
  TOGGLE_POSITION: {
    required: ['cardUid', 'zoneIndex'],
    optional: []
  },
  SELECT_TRIBUTE: {
    required: ['cardUid', 'zoneIndex'],
    optional: []
  },
  CANCEL_TRIBUTE: {
    required: [],
    optional: []
  },
  BEGIN_SYNCHRO_SUMMON: {
    required: ['cardUid'],
    optional: []
  },
  SELECT_SYNCHRO_MATERIAL: {
    required: ['cardUid', 'zoneIndex'],
    optional: []
  },
  CANCEL_EXTRA_SUMMON: {
    required: [],
    optional: []
  },
  XYZ_SUMMON: {
    required: ['cardUid'],
    optional: []
  },
  LINK_SUMMON: {
    required: ['cardUid'],
    optional: []
  },
  ACTIVATE_PENDULUM_SCALE: {
    required: ['cardUid', 'zoneIndex'],
    optional: []
  },
  PENDULUM_SUMMON: {
    required: ['cardUids'],
    optional: []
  },
  DISCARD_HAND_LIMIT: {
    required: ['cardUid'],
    optional: []
  },
  ADVANCE_PHASE: {
    required: ['phase'],
    optional: []
  }
});

const PLAYER_ONLY_ACTIONS = new Set([
  'NORMAL_SUMMON',
  'SET_MONSTER',
  'SET_SPELL_TRAP',
  'TOGGLE_POSITION',
  'SELECT_TRIBUTE',
  'CANCEL_TRIBUTE',
  'BEGIN_SYNCHRO_SUMMON',
  'SELECT_SYNCHRO_MATERIAL',
  'CANCEL_EXTRA_SUMMON',
  'DISCARD_HAND_LIMIT',
  'ADVANCE_PHASE'
]);

const TRIBUTE_ACTIONS = new Set(['SELECT_TRIBUTE', 'CANCEL_TRIBUTE']);
const EXTRA_SELECTION_ACTIONS = new Set([
  'SELECT_SYNCHRO_MATERIAL',
  'CANCEL_EXTRA_SUMMON'
]);
const DISCARD_ACTIONS = new Set(['DISCARD_HAND_LIMIT']);
const MAIN_PHASE_ACTIONS = new Set([
  'NORMAL_SUMMON',
  'SET_MONSTER',
  'SET_SPELL_TRAP',
  'ACTIVATE_FIELD_SPELL',
  'SET_FIELD_SPELL',
  'ACTIVATE_SET_FIELD_SPELL',
  'TOGGLE_POSITION',
  'BEGIN_SYNCHRO_SUMMON',
  'XYZ_SUMMON',
  'LINK_SUMMON',
  'ACTIVATE_PENDULUM_SCALE',
  'PENDULUM_SUMMON'
]);

function oppositeSide(side) {
  return side === 'player' ? 'opponent' : 'player';
}

function fail(code, reason, extra = {}) {
  return {
    ok: false,
    code,
    reason,
    ...extra
  };
}

function accepted(action) {
  return {
    ok: true,
    action
  };
}

function isUid(value) {
  return (
    typeof value === 'string'
    && value.length >= 1
    && value.length <= 160
    && /^[A-Za-z0-9_.:-]+$/u.test(value)
  );
}

function isZoneIndex(value, zoneCount = MAIN_ZONE_COUNT) {
  return Number.isInteger(value) && value >= 0 && value < zoneCount;
}

function ownKeysExactly(value, allowedKeys) {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every(key => allowed.has(key));
}

function safeInteger(value, fallback = 0) {
  return Number.isSafeInteger(value) ? value : fallback;
}

function safeFiniteNumber(value, fallback = 0) {
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : fallback;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneSmallRecord(value) {
  if (!isPlainObject(value)) return {};
  const validation = validateJsonValue(value, {
    maxDepth: 4,
    maxNodes: 100,
    maxArrayLength: 30,
    maxObjectKeys: 50,
    maxStringLength: 256
  });
  return validation.ok ? cloneJson(value) : {};
}

function publicFieldSpellActivationMetadata(card) {
  if (!isFieldSpellCard(card)) return null;

  const sequence = safeInteger(card.fieldActivationSequence, 0);
  if (
    !card.isSetFaceDown
    && card.fieldActivationState === 'resolved'
    && sequence > 0
  ) {
    return {
      isFieldSpell: true,
      fieldActivationState: 'resolved',
      fieldActivationSequence: sequence
    };
  }
  if (!card.isSetFaceDown && card.fieldActivationState === 'pending') {
    return {
      isFieldSpell: true,
      fieldActivationState: 'pending',
      fieldActivationSequence: 0
    };
  }
  return {
    isFieldSpell: true,
    fieldActivationState: card.isSetFaceDown ? 'set' : 'pending',
    fieldActivationSequence: 0
  };
}

function visibleCard(card, { includeMaterials = true } = {}) {
  if (!card) return null;
  const attack = typeof card.getAtk === 'function'
    ? card.getAtk()
    : safeFiniteNumber(card.currentAtk ?? card.atk ?? card.baseAtk);
  const defenseValue = typeof card.getDef === 'function'
    ? card.getDef()
    : (card.def === null ? null : safeFiniteNumber(card.currentDef ?? card.def ?? card.baseDef));
  const level = typeof card.getLevel === 'function'
    ? card.getLevel()
    : safeFiniteNumber(card.currentLevel ?? card.level ?? card.baseLevel);
  const rank = typeof card.getRank === 'function'
    ? card.getRank()
    : safeFiniteNumber(card.rank);
  const materials = includeMaterials && Array.isArray(card.xyzMaterials)
    ? card.xyzMaterials.map(material => visibleCard(material, { includeMaterials: false }))
    : [];
  const fieldSpellActivation = publicFieldSpellActivationMetadata(card);

  return {
    uid: String(card.uid || ''),
    id: String(card.id || ''),
    name: String(card.name || ''),
    nameEn: card.name_en ? String(card.name_en) : null,
    description: card.desc ? String(card.desc) : '',
    cardType: card.card_type ? String(card.card_type) : null,
    type: card.type ? String(card.type) : null,
    extraType: card.extra_type ? String(card.extra_type) : null,
    attack,
    defense: defenseValue === null ? null : safeFiniteNumber(defenseValue),
    level: safeFiniteNumber(level),
    rank: safeFiniteNumber(rank),
    linkRating: card.linkRating === null || card.linkRating === undefined
      ? null
      : safeFiniteNumber(card.linkRating),
    pendulumScale: card.pendulumScale === null || card.pendulumScale === undefined
      ? null
      : safeFiniteNumber(card.pendulumScale),
    position: card.position ? String(card.position) : null,
    faceDown: Boolean(card.isSetFaceDown),
    faceUpInExtraDeck: Boolean(card.isFaceUpInExtraDeck),
    location: card.location ? String(card.location) : null,
    zoneIndex: Number.isInteger(card.zoneIndex) ? card.zoneIndex : -1,
    controllerId: SIDE_SET.has(card.controllerId) ? card.controllerId : null,
    ownerId: SIDE_SET.has(card.ownerId) ? card.ownerId : null,
    summonType: card.summonType ? String(card.summonType) : null,
    turnSummoned: safeInteger(card.turnSummoned, -1),
    turnSet: safeInteger(card.turnSet, -1),
    hasAttacked: Boolean(card.hasAttacked),
    hasChangedPositionThisTurn: Boolean(card.hasChangedPositionThisTurn),
    effectsNegated: Boolean(card.effectNegated || card.effectsNegatedUntilEndTurn),
    counters: cloneSmallRecord(card.counters),
    xyzMaterials: materials,
    ...(fieldSpellActivation || {})
  };
}

function hiddenCard(card, fallbackLocation, fallbackZoneIndex) {
  if (!card) return null;
  return {
    hidden: true,
    location: String(card.location || fallbackLocation || ''),
    zoneIndex: Number.isInteger(card.zoneIndex)
      ? card.zoneIndex
      : safeInteger(fallbackZoneIndex, -1),
    position: card.position ? String(card.position) : null,
    faceDown: true
  };
}

function sortCardsForUnorderedZone(cards) {
  return [...cards].sort((left, right) => (
    String(left?.uid || '').localeCompare(String(right?.uid || ''))
  ));
}

function serializeZoneCard(card, viewerOwnsSide, fallbackLocation, zoneIndex) {
  if (!card) return null;
  if (card.isSetFaceDown && !viewerOwnsSide) {
    return hiddenCard(card, fallbackLocation, zoneIndex);
  }
  return visibleCard(card);
}

function actionBaseRevision(action, meta) {
  const fromAction = action?.baseRevision;
  const fromMeta = meta?.baseRevision;
  if (
    fromAction !== undefined
    && fromMeta !== undefined
    && fromAction !== fromMeta
  ) {
    return {
      ok: false,
      conflict: true,
      value: null
    };
  }
  const value = fromMeta ?? fromAction;
  return {
    ok: Number.isSafeInteger(value) && value >= 0,
    conflict: false,
    value
  };
}

function pendingSummary(game, viewerSide) {
  const tribute = game.pendingSummon;
  const extra = game.pendingExtraSummon;
  const tributeOwner = tribute?.card?.controllerId || tribute?.card?.ownerId || 'player';
  const extraOwner = extra?.extraCard?.controllerId || extra?.extraCard?.ownerId || 'player';
  return {
    actionLocked: Boolean(game.isResolvingAction),
    discardRequired: Boolean(game.isDiscarding),
    tribute: tribute
      ? (
        tributeOwner === viewerSide
          ? {
            active: true,
            cardUid: String(tribute.card?.uid || ''),
            zoneIndex: safeInteger(tribute.zoneIndex, -1),
            required: safeInteger(tribute.tributesRequired),
            selectedZoneIndices: Array.isArray(tribute.selectedTributeIndices)
              ? [...tribute.selectedTributeIndices]
              : []
          }
          : { active: true }
      )
      : null,
    extraSummon: extra
      ? (
        extraOwner === viewerSide
          ? {
            active: true,
            cardUid: String(extra.extraCard?.uid || ''),
            targetLevel: safeInteger(extra.targetLevel),
            selectedZoneIndices: Array.isArray(extra.selectedMaterialIndices)
              ? [...extra.selectedMaterialIndices]
              : []
          }
          : { active: true }
      )
      : null
  };
}

function snapshotSide(game, side, viewerSide) {
  const state = game.getSideState(side);
  const ownsSide = side === viewerSide;
  const lp = side === 'player' ? game.playerLP : game.opponentLP;
  const fieldSpell = side === 'player'
    ? game.playerFieldSpell
    : game.opponentFieldSpell;
  const banished = Array.isArray(game[`${side}Banished`])
    ? game[`${side}Banished`]
    : [];

  return {
    lp: safeFiniteNumber(lp),
    hand: ownsSide
      ? {
        count: state.hand.length,
        cards: state.hand.map(card => visibleCard(card))
      }
      : { count: state.hand.length },
    // A Deck snapshot never contains card identities or order, including for
    // its owner. Only its public count is synchronized.
    deck: { count: state.deck.length },
    monsters: state.monsters.map((card, zoneIndex) => (
      serializeZoneCard(card, ownsSide, 'monster_zone', zoneIndex)
    )),
    spells: state.spells.map((card, zoneIndex) => (
      serializeZoneCard(card, ownsSide, 'spell_zone', zoneIndex)
    )),
    fieldSpell: serializeZoneCard(fieldSpell, ownsSide, 'field_zone', 0),
    graveyard: state.graveyard.map(card => visibleCard(card)),
    banished: banished.map((card, zoneIndex) => (
      serializeZoneCard(card, ownsSide || !card?.isSetFaceDown, 'banished', zoneIndex)
    )),
    extraDeck: ownsSide
      ? {
        count: state.extraDeck.length,
        // Extra Deck order has no game meaning. Sorting avoids exposing the
        // engine's array order and makes repeated snapshots deterministic.
        cards: sortCardsForUnorderedZone(state.extraDeck)
          .map(card => visibleCard(card))
      }
      : { count: state.extraDeck.length },
    faceUpExtraDeck: sortCardsForUnorderedZone(state.faceUpExtraDeck)
      .map(card => visibleCard(card))
  };
}

function internalCardFingerprint(card) {
  if (!card) return null;
  return [
    String(card.uid || ''),
    String(card.location || ''),
    safeInteger(card.zoneIndex, -1),
    String(card.controllerId || ''),
    String(card.position || ''),
    Boolean(card.isSetFaceDown),
    Boolean(card.isFieldSpell),
    String(card.fieldActivationState || ''),
    safeInteger(card.fieldActivationSequence, 0),
    String(card.fieldActivationRuntimeInstanceId || ''),
    safeFiniteNumber(card.currentAtk ?? card.atk ?? card.baseAtk),
    safeFiniteNumber(card.currentDef ?? card.def ?? card.baseDef),
    cloneSmallRecord(card.counters),
    Array.isArray(card.xyzMaterials)
      ? card.xyzMaterials.map(material => String(material.uid || ''))
      : []
  ];
}

function fingerprintGame(game) {
  const sides = SIDES.map(side => {
    const state = game.getSideState(side);
    return {
      side,
      hand: state.hand.map(internalCardFingerprint),
      deck: state.deck.map(card => String(card?.uid || '')),
      monsters: state.monsters.map(internalCardFingerprint),
      spells: state.spells.map(internalCardFingerprint),
      fieldSpell: internalCardFingerprint(
        game.getFieldSpellForSide?.(side)
          ?? (side === 'player' ? game.playerFieldSpell : game.opponentFieldSpell)
      ),
      graveyard: state.graveyard.map(internalCardFingerprint),
      extraDeck: state.extraDeck.map(internalCardFingerprint),
      faceUpExtraDeck: state.faceUpExtraDeck.map(internalCardFingerprint)
    };
  });
  return JSON.stringify({
    playerLP: game.playerLP,
    opponentLP: game.opponentLP,
    currentTurn: game.currentTurn,
    currentPhase: game.currentPhase,
    turnCount: game.turnCount,
    winner: game.winner,
    isResolvingAction: game.isResolvingAction,
    isDiscarding: game.isDiscarding,
    pendingSummon: game.pendingSummon
      ? {
        cardUid: game.pendingSummon.card?.uid,
        selected: game.pendingSummon.selectedTributeIndices
      }
      : null,
    pendingExtraSummon: game.pendingExtraSummon
      ? {
        cardUid: game.pendingExtraSummon.extraCard?.uid,
        selected: game.pendingExtraSummon.selectedMaterialIndices
      }
      : null,
    extraMonsterZones: (game.extraMonsterZones || [])
      .map(entry => entry
        ? [entry.controllerId, internalCardFingerprint(entry.card)]
        : null),
    sides
  });
}

function validateFieldSpellSnapshot(card, isViewer) {
  if (card === null) return { ok: true };
  if (!isPlainObject(card)) {
    return fail('INVALID_SNAPSHOT', 'Field Spell Zone must contain an object or null.');
  }

  const privateRuntimeKeys = [
    'runtimeInstanceId',
    'fieldActivationRuntimeInstanceId'
  ];
  if (privateRuntimeKeys.some(key => Object.hasOwn(card, key))) {
    return fail(
      'PRIVATE_DATA_VIOLATION',
      'Public Field Spell snapshots must not expose runtime instance identifiers.'
    );
  }

  if (card.hidden === true) {
    const hiddenKeys = ['hidden', 'location', 'zoneIndex', 'position', 'faceDown'];
    if (
      isViewer
      || !ownKeysExactly(card, hiddenKeys)
      || card.faceDown !== true
    ) {
      return fail(
        'PRIVATE_DATA_VIOLATION',
        'A hidden opposing Field Spell may expose only public placement metadata.'
      );
    }
    return { ok: true };
  }

  if (!isViewer && card.faceDown === true) {
    return fail(
      'PRIVATE_DATA_VIOLATION',
      'An opposing face-down Field Spell must not expose its identity.'
    );
  }
  if (
    card.isFieldSpell !== true
    || !['set', 'pending', 'resolved'].includes(card.fieldActivationState)
    || !Number.isSafeInteger(card.fieldActivationSequence)
    || card.fieldActivationSequence < 0
  ) {
    return fail('INVALID_SNAPSHOT', 'Visible Field Spell activation metadata is invalid.');
  }
  if (
    (card.fieldActivationState === 'resolved' && card.fieldActivationSequence <= 0)
    || (card.fieldActivationState !== 'resolved' && card.fieldActivationSequence !== 0)
    || (card.faceDown === true && card.fieldActivationState !== 'set')
    || (card.faceDown !== true && card.fieldActivationState === 'set')
  ) {
    return fail('INVALID_SNAPSHOT', 'Field Spell activation state and sequence disagree.');
  }
  return { ok: true };
}

function assertSnapshotKeys(snapshot) {
  const topLevelKeys = [
    'schemaVersion',
    'revision',
    'viewerSide',
    'rulesMode',
    'turn',
    'status',
    'sides',
    'extraMonsterZones',
    'capabilities'
  ];
  if (!ownKeysExactly(snapshot, topLevelKeys)) {
    return fail('INVALID_SNAPSHOT', 'Snapshot contains unknown top-level fields.');
  }
  if (
    snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION
    || !Number.isSafeInteger(snapshot.revision)
    || snapshot.revision < 0
    || !SIDE_SET.has(snapshot.viewerSide)
    || !isPlainObject(snapshot.sides)
    || !isPlainObject(snapshot.sides.player)
    || !isPlainObject(snapshot.sides.opponent)
  ) {
    return fail('INVALID_SNAPSHOT', 'Snapshot header is invalid.');
  }

  const sideKeys = [
    'lp',
    'hand',
    'deck',
    'monsters',
    'spells',
    'fieldSpell',
    'graveyard',
    'banished',
    'extraDeck',
    'faceUpExtraDeck'
  ];
  for (const side of SIDES) {
    const sideState = snapshot.sides[side];
    const isViewer = side === snapshot.viewerSide;
    if (!ownKeysExactly(sideState, sideKeys)) {
      return fail('INVALID_SNAPSHOT', `${side} state contains unknown fields.`);
    }
    if (
      !isPlainObject(sideState.deck)
      || !ownKeysExactly(sideState.deck, ['count'])
      || !Number.isSafeInteger(sideState.deck.count)
      || sideState.deck.count < 0
    ) {
      return fail('PRIVATE_DATA_VIOLATION', 'Deck snapshots may expose only a count.');
    }
    if (
      !isPlainObject(sideState.hand)
      || !Number.isSafeInteger(sideState.hand.count)
      || sideState.hand.count < 0
    ) {
      return fail('INVALID_SNAPSHOT', `${side} hand summary is invalid.`);
    }
    const allowedHandKeys = isViewer ? ['count', 'cards'] : ['count'];
    if (!ownKeysExactly(sideState.hand, allowedHandKeys)) {
      return fail(
        'PRIVATE_DATA_VIOLATION',
        'An opposing hand may expose only its card count.'
      );
    }
    if (
      isViewer
      && (
        !Array.isArray(sideState.hand.cards)
        || sideState.hand.cards.length !== sideState.hand.count
      )
    ) {
      return fail('INVALID_SNAPSHOT', 'Viewer hand contents do not match its count.');
    }
    if (
      !isPlainObject(sideState.extraDeck)
      || !Number.isSafeInteger(sideState.extraDeck.count)
      || sideState.extraDeck.count < 0
    ) {
      return fail('INVALID_SNAPSHOT', `${side} Extra Deck summary is invalid.`);
    }
    const allowedExtraKeys = isViewer ? ['count', 'cards'] : ['count'];
    if (!ownKeysExactly(sideState.extraDeck, allowedExtraKeys)) {
      return fail(
        'PRIVATE_DATA_VIOLATION',
        'An opposing face-down Extra Deck may expose only its count.'
      );
    }
    if (
      !Array.isArray(sideState.monsters)
      || sideState.monsters.length !== MAIN_ZONE_COUNT
      || !Array.isArray(sideState.spells)
      || sideState.spells.length !== MAIN_ZONE_COUNT
      || !Array.isArray(sideState.graveyard)
      || !Array.isArray(sideState.banished)
      || !Array.isArray(sideState.faceUpExtraDeck)
    ) {
      return fail('INVALID_SNAPSHOT', `${side} public zones are invalid.`);
    }
    const fieldSpellValidation = validateFieldSpellSnapshot(
      sideState.fieldSpell,
      isViewer
    );
    if (!fieldSpellValidation.ok) return fieldSpellValidation;
  }

  if (
    !Array.isArray(snapshot.extraMonsterZones)
    || snapshot.extraMonsterZones.length !== EXTRA_ZONE_COUNT
  ) {
    return fail('INVALID_SNAPSHOT', 'Shared Extra Monster Zones are invalid.');
  }
  return { ok: true };
}

/**
 * Security boundary between untrusted network actions and DuelGame.
 *
 * The adapter is designed for an authoritative instance of DuelGame. A remote
 * snapshot is kept as a redacted presentation mirror; it is deliberately not
 * used to reconstruct hidden hands or Deck order in the authoritative engine.
 */
export class DuelGameNetworkAdapter {
  constructor(game, {
    remoteActorSide = 'opponent',
    localViewerSide = oppositeSide(remoteActorSide),
    initialRevision = 0,
    callbacks = {}
  } = {}) {
    if (!game || typeof game.getSideState !== 'function') {
      throw new TypeError('DuelGameNetworkAdapter requires a DuelGame-compatible instance.');
    }
    if (!SIDE_SET.has(remoteActorSide) || !SIDE_SET.has(localViewerSide)) {
      throw new TypeError('Network adapter sides must be player or opponent.');
    }
    if (!Number.isSafeInteger(initialRevision) || initialRevision < 0) {
      throw new TypeError('initialRevision must be a non-negative safe integer.');
    }

    this.game = game;
    this.remoteActorSide = remoteActorSide;
    this.localViewerSide = localViewerSide;
    this.revision = initialRevision;
    this.callbacks = { ...callbacks };
    this.pending = false;
    this.publicMirror = null;
  }

  setCallbacks(callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    return this;
  }

  _notify(name, detail) {
    const callback = this.callbacks[name];
    if (typeof callback !== 'function') return;
    try {
      callback(detail, this);
    } catch {
      // UI/network diagnostics must never corrupt the duel transaction.
    }
  }

  requestResync(reason, detail = {}) {
    const event = {
      reason: String(reason || 'resync-required'),
      expectedRevision: this.revision,
      ...detail
    };
    this._notify('onResyncRequired', event);
    return event;
  }

  _validateShape(action) {
    if (!isPlainObject(action)) {
      return fail('INVALID_ACTION', 'Action must be a plain object.');
    }
    const jsonValidation = validateJsonValue(action, {
      maxDepth: 4,
      maxNodes: 100,
      maxArrayLength: 20,
      maxObjectKeys: 12,
      maxStringLength: 256
    });
    if (!jsonValidation.ok) {
      return fail('INVALID_ACTION', jsonValidation.error);
    }
    if (!ACTION_KIND_SET.has(action.kind)) {
      const namedLimitation = DUEL_GAME_NETWORK_LIMITATIONS[action.kind];
      return fail(
        'UNSUPPORTED_ACTION',
        namedLimitation || `Unsupported network action kind: ${String(action.kind || '')}.`
      );
    }
    if (!SIDE_SET.has(action.actor)) {
      return fail('INVALID_ACTOR', 'Action actor must be player or opponent.');
    }

    const schema = ACTION_SCHEMAS[action.kind];
    const allowed = [
      'kind',
      'actor',
      'baseRevision',
      ...schema.required,
      ...schema.optional
    ];
    if (!ownKeysExactly(action, allowed)) {
      return fail('UNKNOWN_ACTION_FIELD', 'Action contains fields outside its closed schema.');
    }
    for (const key of schema.required) {
      if (!Object.hasOwn(action, key)) {
        return fail('MISSING_ACTION_FIELD', `Action is missing required field: ${key}.`);
      }
    }
    if (Object.hasOwn(action, 'baseRevision')) {
      if (!Number.isSafeInteger(action.baseRevision) || action.baseRevision < 0) {
        return fail('INVALID_REVISION', 'baseRevision must be a non-negative safe integer.');
      }
    }
    if (Object.hasOwn(action, 'cardUid') && !isUid(action.cardUid)) {
      return fail('INVALID_UID', 'cardUid is invalid.');
    }
    if (Object.hasOwn(action, 'zoneIndex') && !isZoneIndex(action.zoneIndex)) {
      return fail('INVALID_ZONE', 'zoneIndex is outside the five Main/Spell Zones.');
    }
    if (Object.hasOwn(action, 'cardUids')) {
      if (
        !Array.isArray(action.cardUids)
        || action.cardUids.length < 1
        || action.cardUids.length > 6
        || action.cardUids.some(uid => !isUid(uid))
        || new Set(action.cardUids).size !== action.cardUids.length
      ) {
        return fail(
          'INVALID_UID_LIST',
          'cardUids must contain between one and six unique valid UIDs.'
        );
      }
    }
    if (
      action.kind === 'ACTIVATE_PENDULUM_SCALE'
      && ![0, 4].includes(action.zoneIndex)
    ) {
      return fail('INVALID_ZONE', 'Pendulum Scales can be activated only in zones 0 or 4.');
    }
    if (
      action.kind === 'ADVANCE_PHASE'
      && !['battle', 'main2', 'end'].includes(action.phase)
    ) {
      return fail('INVALID_PHASE', 'The requested phase transition is unsupported.');
    }
    return { ok: true };
  }

  _validatePendingMode(kind) {
    if (this.game.isResolvingAction) {
      return fail('ENGINE_BUSY', 'DuelGame is currently resolving another action.');
    }
    if (this.game.pendingSummon && !TRIBUTE_ACTIONS.has(kind)) {
      return fail('TRIBUTE_SELECTION_REQUIRED', 'A Tribute selection must be completed or cancelled.');
    }
    if (!this.game.pendingSummon && TRIBUTE_ACTIONS.has(kind)) {
      return fail('NO_PENDING_TRIBUTE', 'No Tribute selection is pending.');
    }
    if (this.game.pendingExtraSummon && !EXTRA_SELECTION_ACTIONS.has(kind)) {
      return fail('EXTRA_SELECTION_REQUIRED', 'An Extra Deck material selection must be completed or cancelled.');
    }
    if (!this.game.pendingExtraSummon && EXTRA_SELECTION_ACTIONS.has(kind)) {
      return fail('NO_PENDING_EXTRA_SUMMON', 'No Extra Deck material selection is pending.');
    }
    if (this.game.isDiscarding && !DISCARD_ACTIONS.has(kind)) {
      return fail('HAND_LIMIT_DISCARD_REQUIRED', 'The End Phase hand-limit discard must be completed.');
    }
    if (!this.game.isDiscarding && DISCARD_ACTIONS.has(kind)) {
      return fail('NO_PENDING_DISCARD', 'No hand-limit discard is pending.');
    }
    return { ok: true };
  }

  _validateActionSemantics(action) {
    const side = action.actor;
    const state = this.game.getSideState(side);
    const cardInHand = Object.hasOwn(action, 'cardUid')
      ? state.hand.find(card => card.uid === action.cardUid)
      : null;
    const cardInMainZone = Object.hasOwn(action, 'zoneIndex')
      ? this.game.field?.getMonsterZone?.(side, action.zoneIndex)
      : null;

    switch (action.kind) {
      case 'NORMAL_SUMMON':
      case 'SET_MONSTER': {
        if (!cardInHand || cardInHand.card_type !== 'monster') {
          return fail('CARD_NOT_IN_HAND', 'The requested Monster UID is not in the actor hand.');
        }
        if (!this.game.summons?.canUseNormalSummonProcedure?.(cardInHand)) {
          return fail('ILLEGAL_SUMMON_PROCEDURE', 'This card cannot use the Normal Summon/Set procedure.');
        }
        if (!this.game.summons?.canNormalSummon?.()) {
          return fail('NORMAL_SUMMON_SPENT', 'The Normal Summon/Set allowance is no longer available.');
        }
        if (this.game.field.getMonsterZone(side, action.zoneIndex) !== null) {
          return fail('ZONE_OCCUPIED', 'The selected Main Monster Zone is occupied.');
        }
        return { ok: true };
      }
      case 'SET_SPELL_TRAP': {
        if (!cardInHand || cardInHand.card_type === 'monster') {
          return fail('CARD_NOT_IN_HAND', 'The requested Spell/Trap UID is not in the actor hand.');
        }
        if (isFieldSpellCard(cardInHand)) {
          return fail(
            'FIELD_SPELL_ACTION_REQUIRED',
            'Field Spells must use the dedicated Field Spell action.'
          );
        }
        if (this.game.field.getSpellZone(side, action.zoneIndex) !== null) {
          return fail('ZONE_OCCUPIED', 'The selected Spell & Trap Zone is occupied.');
        }
        return { ok: true };
      }
      case 'ACTIVATE_FIELD_SPELL': {
        if (!cardInHand || !isFieldSpellCard(cardInHand)) {
          return fail('CARD_NOT_IN_HAND', 'The requested Field Spell UID is not in the actor hand.');
        }
        if (
          typeof this.game.activateFieldSpellFromHand !== 'function'
          || this.game.canActivateSpell?.(cardInHand, side) !== true
        ) {
          return fail('FIELD_SPELL_UNAVAILABLE', 'The Field Spell cannot be activated now.');
        }
        return { ok: true };
      }
      case 'SET_FIELD_SPELL': {
        if (!cardInHand || !isFieldSpellCard(cardInHand)) {
          return fail('CARD_NOT_IN_HAND', 'The requested Field Spell UID is not in the actor hand.');
        }
        if (
          typeof this.game.setFieldSpellFaceDownFromHand !== 'function'
          || (
            this.game.rulesMode !== 'sandbox'
            && this.game.isStrictlySupportedMainDeckCard?.(cardInHand) !== true
          )
        ) {
          return fail('FIELD_SPELL_UNAVAILABLE', 'The Field Spell cannot be Set now.');
        }
        return { ok: true };
      }
      case 'ACTIVATE_SET_FIELD_SPELL': {
        const fieldSpell = this.game.getFieldSpellForSide?.(side)
          ?? (side === 'player' ? this.game.playerFieldSpell : this.game.opponentFieldSpell);
        if (
          !fieldSpell
          || fieldSpell.uid !== action.cardUid
          || !fieldSpell.isSetFaceDown
          || !isFieldSpellCard(fieldSpell)
        ) {
          return fail(
            'CARD_ZONE_MISMATCH',
            'The requested UID is not a Set card in the actor Field Spell Zone.'
          );
        }
        if (
          fieldSpell.fieldActivationState !== undefined
          && fieldSpell.fieldActivationState !== 'set'
        ) {
          return fail(
            'FIELD_SPELL_STATE_MISMATCH',
            'The Set Field Spell activation metadata is invalid.'
          );
        }
        if (
          typeof this.game.activateSetFieldSpell !== 'function'
          || this.game.canActivateSpell?.(fieldSpell, side) !== true
        ) {
          return fail('FIELD_SPELL_UNAVAILABLE', 'The Set Field Spell cannot be activated now.');
        }
        return { ok: true };
      }
      case 'TOGGLE_POSITION': {
        if (!cardInMainZone || cardInMainZone.uid !== action.cardUid) {
          return fail('CARD_ZONE_MISMATCH', 'The Monster UID does not occupy that Main Monster Zone.');
        }
        if (cardInMainZone.turnSummoned === this.game.turnCount) {
          return fail('POSITION_LOCKED', 'A monster cannot change position during its summon turn.');
        }
        if (
          cardInMainZone.hasChangedPositionThisTurn
          || cardInMainZone.hasAttacked
          || cardInMainZone.attacksDeclaredThisTurn > 0
        ) {
          return fail('POSITION_LOCKED', 'This monster cannot change its battle position now.');
        }
        return { ok: true };
      }
      case 'SELECT_TRIBUTE': {
        if (!cardInMainZone || cardInMainZone.uid !== action.cardUid) {
          return fail('CARD_ZONE_MISMATCH', 'The Tribute UID does not occupy that Main Monster Zone.');
        }
        return { ok: true };
      }
      case 'CANCEL_TRIBUTE':
      case 'CANCEL_EXTRA_SUMMON':
        return { ok: true };
      case 'BEGIN_SYNCHRO_SUMMON': {
        const card = state.extraDeck.find(candidate => candidate.uid === action.cardUid);
        if (!card || card.extra_type !== 'synchro') {
          return fail('CARD_NOT_IN_EXTRA_DECK', 'The requested Synchro UID is not in the actor Extra Deck.');
        }
        if (!this.game.canAutoSynchroSummon?.(card, side)) {
          return fail('INVALID_SYNCHRO_MATERIALS', 'No legal Synchro material combination is available.');
        }
        return { ok: true };
      }
      case 'SELECT_SYNCHRO_MATERIAL': {
        if (!cardInMainZone || cardInMainZone.uid !== action.cardUid) {
          return fail('CARD_ZONE_MISMATCH', 'The Synchro material UID does not occupy that Main Monster Zone.');
        }
        return { ok: true };
      }
      case 'XYZ_SUMMON':
      case 'LINK_SUMMON': {
        const expectedType = action.kind === 'XYZ_SUMMON' ? 'xyz' : 'link';
        const card = state.extraDeck.find(candidate => candidate.uid === action.cardUid);
        if (!card || card.extra_type !== expectedType) {
          return fail(
            'CARD_NOT_IN_EXTRA_DECK',
            `The requested ${expectedType.toUpperCase()} UID is not in the actor Extra Deck.`
          );
        }
        const materials = action.kind === 'XYZ_SUMMON'
          ? this.game.getXyzMaterialCombination?.(card, side)
          : this.game.getLinkMaterialCombination?.(card, side);
        if (!materials?.length) {
          return fail('INVALID_EXTRA_MATERIALS', `No legal ${expectedType.toUpperCase()} material combination is available.`);
        }
        return { ok: true };
      }
      case 'ACTIVATE_PENDULUM_SCALE': {
        if (!cardInHand || !cardInHand.isPendulumMonster) {
          return fail('CARD_NOT_IN_HAND', 'The requested Pendulum UID is not in the actor hand.');
        }
        if (this.game.field.getSpellZone(side, action.zoneIndex) !== null) {
          return fail('ZONE_OCCUPIED', 'The selected Pendulum Zone is occupied.');
        }
        if (
          cardInHand.pendulumActivationRequiresEmptyMonsterField
          && this.game.getMonsterEntries(side).length > 0
        ) {
          return fail('PENDULUM_CONDITION_FAILED', 'This Pendulum Scale requires an empty Monster field.');
        }
        return { ok: true };
      }
      case 'PENDULUM_SUMMON': {
        const options = this.game.getPendulumOptions?.(side);
        if (!options?.valid || !this.game.summons?.canPendulumSummon?.()) {
          return fail('PENDULUM_SUMMON_UNAVAILABLE', 'A Pendulum Summon is not currently legal.');
        }
        const eligible = new Set(
          [...options.fromHand, ...options.fromExtraDeck].map(card => card.uid)
        );
        if (action.cardUids.some(uid => !eligible.has(uid))) {
          return fail('INVALID_PENDULUM_SELECTION', 'The Pendulum selection contains an ineligible card UID.');
        }
        return { ok: true };
      }
      case 'DISCARD_HAND_LIMIT': {
        if (!cardInHand) {
          return fail('CARD_NOT_IN_HAND', 'The discard UID is not in the actor hand.');
        }
        return { ok: true };
      }
      case 'ADVANCE_PHASE': {
        const transitions = {
          main1: new Set(['battle', 'end']),
          battle: new Set(['main2', 'end']),
          main2: new Set(['end'])
        };
        if (!transitions[this.game.currentPhase]?.has(action.phase)) {
          return fail(
            'ILLEGAL_PHASE_TRANSITION',
            `Cannot advance from ${String(this.game.currentPhase)} to ${action.phase}.`
          );
        }
        if (
          action.phase === 'battle'
          && !this.game.turn?.isBattlePhaseLegal?.(this.game.turnCount)
        ) {
          return fail('BATTLE_PHASE_FORBIDDEN', 'The starting player cannot enter the Battle Phase on turn 1.');
        }
        return { ok: true };
      }
      default:
        return fail('UNSUPPORTED_ACTION', 'Action is not implemented by this adapter.');
    }
  }

  validateAction(action, meta = {}) {
    const shape = this._validateShape(action);
    if (!shape.ok) return shape;

    const baseRevision = actionBaseRevision(action, meta);
    if (baseRevision.conflict) {
      return fail(
        'REVISION_CONFLICT',
        'Action and transport baseRevision values disagree.',
        { resyncRequired: true }
      );
    }
    if (!baseRevision.ok) {
      return fail(
        'INVALID_REVISION',
        'A non-negative baseRevision is required in the action or transport metadata.'
      );
    }
    if (baseRevision.value !== this.revision) {
      return fail(
        'REVISION_MISMATCH',
        `Revision mismatch: expected ${this.revision}, received ${baseRevision.value}.`,
        {
          expectedRevision: this.revision,
          receivedRevision: baseRevision.value,
          resyncRequired: true
        }
      );
    }
    if (this.pending) {
      return fail('ACTION_PENDING', 'Another network action is still pending.');
    }
    if (action.actor !== this.remoteActorSide) {
      return fail(
        'ACTOR_NOT_AUTHORIZED',
        `This peer is authorized only for the ${this.remoteActorSide} side.`
      );
    }
    if (this.game.winner || this.game._duelEnded) {
      return fail('DUEL_ENDED', 'No further actions are accepted after the duel ends.');
    }
    if (action.actor !== this.game.currentTurn) {
      return fail('OUT_OF_TURN', 'The action actor is not the current turn player.');
    }
    if (PLAYER_ONLY_ACTIONS.has(action.kind) && action.actor !== 'player') {
      return fail(
        'ENGINE_SIDE_UNSUPPORTED',
        `${action.kind} is player-only in the current DuelGame API.`
      );
    }
    if (MAIN_PHASE_ACTIONS.has(action.kind) && !String(this.game.currentPhase).startsWith('main')) {
      return fail('WRONG_PHASE', 'This action requires Main Phase 1 or Main Phase 2.');
    }

    const pendingValidation = this._validatePendingMode(action.kind);
    if (!pendingValidation.ok) return pendingValidation;

    const semanticValidation = this._validateActionSemantics(action);
    if (!semanticValidation.ok) return semanticValidation;

    return accepted({ ...action, baseRevision: baseRevision.value });
  }

  async _dispatch(action) {
    switch (action.kind) {
      case 'NORMAL_SUMMON':
        return this.game.summonMonster(action.cardUid, action.zoneIndex);
      case 'SET_MONSTER':
        return this.game.setMonsterFaceDown(action.cardUid, action.zoneIndex);
      case 'SET_SPELL_TRAP':
        return this.game.setSpellTrapFaceDown(action.cardUid, action.zoneIndex);
      case 'ACTIVATE_FIELD_SPELL':
        return this.game.activateFieldSpellFromHand(action.cardUid, action.actor);
      case 'SET_FIELD_SPELL':
        return this.game.setFieldSpellFaceDownFromHand(action.cardUid, action.actor);
      case 'ACTIVATE_SET_FIELD_SPELL':
        return this.game.activateSetFieldSpell(action.actor);
      case 'TOGGLE_POSITION':
        return this.game.toggleMonsterPosition(action.zoneIndex, action.actor);
      case 'SELECT_TRIBUTE':
        return this.game.selectSummonTribute(action.zoneIndex);
      case 'CANCEL_TRIBUTE':
        return this.game.cancelSummonTribute();
      case 'BEGIN_SYNCHRO_SUMMON':
        return this.game.summonExtraDeck(action.cardUid);
      case 'SELECT_SYNCHRO_MATERIAL':
        return this.game.selectSynchroMaterial(action.zoneIndex);
      case 'CANCEL_EXTRA_SUMMON':
        return this.game.cancelExtraSummon();
      case 'XYZ_SUMMON':
        return this.game.performXyzSummon(action.actor, action.cardUid);
      case 'LINK_SUMMON':
        return this.game.performLinkSummon(action.actor, action.cardUid);
      case 'ACTIVATE_PENDULUM_SCALE':
        return this.game.activatePendulumScale(
          action.cardUid,
          action.zoneIndex,
          action.actor
        );
      case 'PENDULUM_SUMMON':
        return this.game.performPendulumSummon(action.actor, action.cardUids);
      case 'DISCARD_HAND_LIMIT':
        return this.game.discardCard(action.cardUid);
      case 'ADVANCE_PHASE':
        return this.game.changePhase(action.phase);
      default:
        return false;
    }
  }

  async applyAction(action, meta = {}) {
    const validation = this.validateAction(action, meta);
    if (!validation.ok) {
      if (validation.resyncRequired) {
        this.requestResync(validation.code, {
          receivedRevision: validation.receivedRevision,
          actionKind: action?.kind || null
        });
      }
      const rejection = {
        accepted: false,
        revision: this.revision,
        code: validation.code,
        reason: validation.reason
      };
      this._notify('onActionRejected', rejection);
      return rejection;
    }

    this.pending = true;
    this._notify('onPendingChange', { pending: true, action: validation.action });
    const before = fingerprintGame(this.game);
    const beforeDuelGeneration = Number(this.game?._duelGeneration);
    try {
      await this._dispatch(validation.action);
      const changed = fingerprintGame(this.game) !== before;
      const duelGenerationChanged = Number.isFinite(beforeDuelGeneration)
        && Number(this.game?._duelGeneration) !== beforeDuelGeneration;
      if (duelGenerationChanged) {
        this.requestResync('DUEL_GENERATION_CHANGED', {
          actionKind: validation.action.kind
        });
        const rejection = {
          accepted: false,
          revision: this.revision,
          code: 'DUEL_GENERATION_CHANGED',
          reason: 'The Duel generation changed while the action was pending.'
        };
        this._notify('onActionRejected', rejection);
        return rejection;
      }
      // A legal action can be applied and still resolve unsuccessfully (for
      // example, a Field Spell activation that is negated). The authoritative
      // state transition must still receive a revision and ACK so peers do not
      // diverge. Only a true no-op is rejected.
      if (!changed) {
        const rejection = {
          accepted: false,
          revision: this.revision,
          code: 'ENGINE_REJECTED',
          reason: 'DuelGame rejected the action or produced no state transition.'
        };
        this._notify('onActionRejected', rejection);
        return rejection;
      }

      this.revision += 1;
      const result = {
        kind: validation.action.kind,
        actor: validation.action.actor,
        changed
      };
      const acknowledgement = {
        accepted: true,
        revision: this.revision,
        result
      };
      this._notify('onRevision', {
        revision: this.revision,
        source: 'action',
        action: validation.action
      });
      this._notify('onActionApplied', {
        ...acknowledgement,
        action: validation.action
      });
      return acknowledgement;
    } catch (error) {
      const rejection = {
        accepted: false,
        revision: this.revision,
        code: 'ENGINE_ERROR',
        reason: error?.message || 'DuelGame action failed.'
      };
      this._notify('onActionRejected', rejection);
      return rejection;
    } finally {
      this.pending = false;
      this._notify('onPendingChange', { pending: false, action: validation.action });
    }
  }

  validateRemoteAction(action, meta = {}) {
    return this.validateAction(action, meta);
  }

  applyRemoteAction(action, meta = {}) {
    return this.applyAction(action, meta);
  }

  buildPublicSnapshot(viewerSide = this.remoteActorSide) {
    if (!SIDE_SET.has(viewerSide)) {
      throw new TypeError('viewerSide must be player or opponent.');
    }
    const snapshot = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      revision: this.revision,
      viewerSide,
      rulesMode: this.game.rulesMode || 'strict',
      turn: {
        owner: this.game.currentTurn,
        phase: this.game.currentPhase,
        count: safeInteger(this.game.turnCount, 1),
        battleStep: this.game.phases?.battleStep || 'none',
        damageStepSubPhase: this.game.phases?.damageStepSubPhase || 'none'
      },
      status: {
        winner: this.game.winner || null,
        duelEnded: Boolean(this.game._duelEnded || this.game.winner),
        pending: pendingSummary(this.game, viewerSide)
      },
      sides: {
        player: snapshotSide(this.game, 'player', viewerSide),
        opponent: snapshotSide(this.game, 'opponent', viewerSide)
      },
      extraMonsterZones: Array.from(
        { length: EXTRA_ZONE_COUNT },
        (_, zoneIndex) => {
          const entry = this.game.field?.getExtraMonsterZone?.(zoneIndex)
            || this.game.extraMonsterZones?.[zoneIndex]
            || null;
          if (!entry?.card) return null;
          return {
            controllerId: entry.controllerId,
            zoneIndex,
            card: serializeZoneCard(
              entry.card,
              entry.controllerId === viewerSide,
              'extra_monster_zone',
              zoneIndex
            )
          };
        }
      ),
      capabilities: {
        actionKinds: [...DUEL_GAME_NETWORK_ACTION_KINDS],
        authoritativeSnapshotRestore: false
      }
    };
    const cloned = cloneJson(snapshot);
    this._notify('onSnapshotBuilt', { snapshot: cloned, viewerSide });
    return cloned;
  }

  validatePublicSnapshot(snapshot, {
    expectedViewerSide = this.localViewerSide,
    revision = undefined
  } = {}) {
    const jsonValidation = validateJsonValue(snapshot, {
      maxDepth: 16,
      maxNodes: 10_000,
      maxArrayLength: 2000,
      maxObjectKeys: 1000,
      maxStringLength: 32_768
    });
    if (!jsonValidation.ok || !isPlainObject(snapshot)) {
      return fail('INVALID_SNAPSHOT', jsonValidation.error || 'Snapshot must be an object.');
    }
    const shape = assertSnapshotKeys(snapshot);
    if (!shape.ok) return shape;
    if (expectedViewerSide && snapshot.viewerSide !== expectedViewerSide) {
      return fail(
        'SNAPSHOT_VIEWER_MISMATCH',
        `Snapshot is for ${snapshot.viewerSide}, not ${expectedViewerSide}.`
      );
    }
    if (
      revision !== undefined
      && (
        !Number.isSafeInteger(revision)
        || revision < 0
        || revision !== snapshot.revision
      )
    ) {
      return fail(
        'SNAPSHOT_REVISION_CONFLICT',
        'Snapshot payload and transport revisions disagree.',
        { resyncRequired: true }
      );
    }
    if (snapshot.revision < this.revision) {
      return fail(
        'STALE_SNAPSHOT',
        `Snapshot revision ${snapshot.revision} is older than local revision ${this.revision}.`,
        { resyncRequired: true }
      );
    }
    return { ok: true };
  }

  applyPublicSnapshot(snapshot, meta = {}) {
    const validation = this.validatePublicSnapshot(snapshot, {
      expectedViewerSide: meta.expectedViewerSide || this.localViewerSide,
      revision: meta.revision
    });
    if (!validation.ok) {
      if (validation.resyncRequired) {
        this.requestResync(validation.code, {
          receivedRevision: snapshot?.revision
        });
      }
      return {
        applied: false,
        revision: this.revision,
        code: validation.code,
        reason: validation.reason
      };
    }

    // A redacted snapshot cannot safely rebuild hidden CardState instances.
    // Store it as an immutable-by-convention UI mirror instead of mutating the
    // authoritative DuelGame and inventing missing information.
    this.publicMirror = cloneJson(snapshot);
    this.revision = snapshot.revision;
    const result = {
      applied: true,
      revision: this.revision,
      mirrorOnly: true
    };
    this._notify('onRevision', {
      revision: this.revision,
      source: 'snapshot'
    });
    this._notify('onSnapshotApplied', {
      ...result,
      snapshot: cloneJson(this.publicMirror)
    });
    return result;
  }

  applySnapshot(snapshot, meta = {}) {
    return this.applyPublicSnapshot(snapshot, meta);
  }

  getPublicMirror() {
    return this.publicMirror ? cloneJson(this.publicMirror) : null;
  }

  /**
   * Directly consumable OnlineDuelController hooks.
   */
  createControllerBindings({
    remoteViewerSide = this.remoteActorSide,
    localViewerSide = this.localViewerSide
  } = {}) {
    return {
      validateRemoteAction: (action, meta) => this.validateRemoteAction(action, meta),
      applyRemoteAction: (action, meta) => this.applyRemoteAction(action, meta),
      buildPublicSnapshot: () => ({
        revision: this.revision,
        state: this.buildPublicSnapshot(remoteViewerSide)
      }),
      applyPublicSnapshot: (snapshot, meta) => this.applyPublicSnapshot(snapshot, {
        ...meta,
        expectedViewerSide: localViewerSide
      })
    };
  }
}

export function createDuelGameNetworkAdapter(game, options) {
  return new DuelGameNetworkAdapter(game, options);
}
