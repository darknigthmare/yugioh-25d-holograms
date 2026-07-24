import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DUEL_GAME_NETWORK_ACTION_KINDS,
  DuelGameNetworkAdapter
} from '../src/network/duel-game-network-adapter.js';
import { STARTER_CARDS } from '../src/cards.js';
import { CardState } from '../src/core/CardState.js';
import { DuelGame } from '../src/game.js';

function makeCard({
  uid,
  id = uid,
  name = uid,
  cardType = 'monster',
  type = cardType === 'monster' ? 'Effect Monster' : 'Spell Card',
  extraType = null,
  faceDown = false,
  location = 'hand',
  zoneIndex = -1,
  ownerId = 'player',
  controllerId = ownerId,
  attack = 1000,
  defense = 1000,
  level = 4,
  pendulum = false
}) {
  return {
    uid,
    id,
    name,
    name_en: name,
    desc: `${name} rules`,
    card_type: cardType,
    type,
    extra_type: extraType,
    isPendulumMonster: pendulum,
    pendulumScale: pendulum ? 4 : 0,
    isSetFaceDown: faceDown,
    isFaceUpInExtraDeck: false,
    location,
    zoneIndex,
    ownerId,
    controllerId,
    position: faceDown ? 'defense' : 'attack',
    currentAtk: attack,
    currentDef: defense,
    currentLevel: level,
    rank: extraType === 'xyz' ? 4 : 0,
    linkRating: extraType === 'link' ? 2 : null,
    turnSummoned: -1,
    turnSet: -1,
    hasAttacked: false,
    hasChangedPositionThisTurn: false,
    attacksDeclaredThisTurn: 0,
    effectNegated: false,
    effectsNegatedUntilEndTurn: false,
    counters: {},
    xyzMaterials: [],
    getAtk() {
      return this.currentAtk;
    },
    getDef() {
      return this.extra_type === 'link' ? null : this.currentDef;
    },
    getLevel() {
      return ['xyz', 'link'].includes(this.extra_type) ? 0 : this.currentLevel;
    },
    getRank() {
      return this.rank;
    }
  };
}

function createFakeGame() {
  const playerHand = [
    makeCard({ uid: 'player-monster', name: 'Visible Hand Monster' }),
    makeCard({
      uid: 'player-spell',
      name: 'Visible Hand Spell',
      cardType: 'spell',
      type: 'Spell Card'
    }),
    makeCard({
      uid: 'player-pendulum',
      name: 'Visible Pendulum',
      pendulum: true
    })
  ];
  const opponentHand = [
    makeCard({
      uid: 'secret-hand-uid',
      id: 'secret-hand-id',
      name: 'Secret Opponent Hand'
    })
  ];
  const playerDeck = [
    makeCard({ uid: 'player-deck-bottom', name: 'Player Deck Bottom', location: 'deck' }),
    makeCard({ uid: 'player-deck-top', name: 'Player Deck Top', location: 'deck' })
  ];
  const opponentDeck = [
    makeCard({
      uid: 'secret-deck-bottom',
      id: 'secret-deck-bottom-id',
      name: 'Secret Opponent Deck Bottom',
      location: 'deck',
      ownerId: 'opponent'
    }),
    makeCard({
      uid: 'secret-deck-top',
      id: 'secret-deck-top-id',
      name: 'Secret Opponent Deck Top',
      location: 'deck',
      ownerId: 'opponent'
    })
  ];
  const playerMonsters = Array(5).fill(null);
  const opponentMonsters = Array(5).fill(null);
  opponentMonsters[2] = makeCard({
    uid: 'secret-set-monster-uid',
    id: 'secret-set-monster-id',
    name: 'Secret Set Monster',
    faceDown: true,
    location: 'monster_zone',
    zoneIndex: 2,
    ownerId: 'opponent'
  });
  const playerSpells = Array(5).fill(null);
  const opponentSpells = Array(5).fill(null);
  opponentSpells[1] = makeCard({
    uid: 'secret-set-spell-uid',
    id: 'secret-set-spell-id',
    name: 'Secret Set Spell',
    cardType: 'trap',
    type: 'Trap Card',
    faceDown: true,
    location: 'spell_zone',
    zoneIndex: 1,
    ownerId: 'opponent'
  });
  const playerExtraDeck = [
    makeCard({
      uid: 'player-xyz',
      name: 'Visible Own Xyz',
      extraType: 'xyz',
      location: 'extra_deck'
    })
  ];
  const opponentExtraDeck = [
    makeCard({
      uid: 'secret-extra-uid',
      id: 'secret-extra-id',
      name: 'Secret Opponent Extra',
      extraType: 'link',
      location: 'extra_deck',
      ownerId: 'opponent'
    })
  ];
  const state = {
    player: {
      hand: playerHand,
      deck: playerDeck,
      monsters: playerMonsters,
      spells: playerSpells,
      graveyard: [],
      extraDeck: playerExtraDeck,
      faceUpExtraDeck: [],
      extraMonsters: []
    },
    opponent: {
      hand: opponentHand,
      deck: opponentDeck,
      monsters: opponentMonsters,
      spells: opponentSpells,
      graveyard: [],
      extraDeck: opponentExtraDeck,
      faceUpExtraDeck: [],
      extraMonsters: []
    }
  };
  const extraMonsterZones = Array(2).fill(null);

  const game = {
    rulesMode: 'strict',
    playerLP: 8000,
    opponentLP: 7600,
    currentTurn: 'player',
    currentPhase: 'main1',
    turnCount: 2,
    winner: null,
    _duelEnded: false,
    isResolvingAction: false,
    isDiscarding: false,
    pendingSummon: null,
    pendingExtraSummon: null,
    playerFieldSpell: null,
    opponentFieldSpell: null,
    playerBanished: [],
    opponentBanished: [
      makeCard({
        uid: 'secret-banished-uid',
        id: 'secret-banished-id',
        name: 'Secret Face-down Banished',
        faceDown: true,
        location: 'banished',
        ownerId: 'opponent'
      })
    ],
    phases: {
      battleStep: 'none',
      damageStepSubPhase: 'none'
    },
    turn: {
      isBattlePhaseLegal: turnCount => turnCount > 1
    },
    summons: {
      canNormalSummon: () => true,
      canUseNormalSummonProcedure: card => card?.card_type === 'monster',
      canPendulumSummon: () => true
    },
    field: {
      getMonsterZone(side, index) {
        return state[side].monsters[index];
      },
      getSpellZone(side, index) {
        return state[side].spells[index];
      },
      getExtraMonsterZone(index) {
        return extraMonsterZones[index];
      }
    },
    extraMonsterZones,
    getSideState(side) {
      return state[side];
    },
    getMonsterEntries(side) {
      return state[side].monsters
        .map((card, zoneIndex) => card ? { card, zoneType: 'main', zoneIndex } : null)
        .filter(Boolean);
    },
    canAutoSynchroSummon: () => false,
    getXyzMaterialCombination: () => null,
    getLinkMaterialCombination: () => null,
    getPendulumOptions: () => ({
      valid: false,
      fromHand: [],
      fromExtraDeck: []
    }),
    async summonMonster(cardUid, zoneIndex) {
      const handIndex = playerHand.findIndex(card => card.uid === cardUid);
      if (handIndex < 0 || playerMonsters[zoneIndex]) return false;
      const [card] = playerHand.splice(handIndex, 1);
      card.location = 'monster_zone';
      card.zoneIndex = zoneIndex;
      playerMonsters[zoneIndex] = card;
      return true;
    },
    async setMonsterFaceDown() {
      return false;
    },
    async setSpellTrapFaceDown(cardUid, zoneIndex) {
      const handIndex = playerHand.findIndex(card => card.uid === cardUid);
      if (handIndex < 0 || playerSpells[zoneIndex]) return false;
      const [card] = playerHand.splice(handIndex, 1);
      card.location = 'spell_zone';
      card.zoneIndex = zoneIndex;
      card.isSetFaceDown = true;
      playerSpells[zoneIndex] = card;
      return true;
    },
    async toggleMonsterPosition() {},
    async selectSummonTribute() {},
    cancelSummonTribute() {
      this.pendingSummon = null;
    },
    async summonExtraDeck() {
      return false;
    },
    async selectSynchroMaterial() {},
    cancelExtraSummon() {
      this.pendingExtraSummon = null;
    },
    async performXyzSummon() {
      return false;
    },
    async performLinkSummon() {
      return false;
    },
    async activatePendulumScale() {
      return false;
    },
    async performPendulumSummon() {
      return false;
    },
    discardCard() {
      return false;
    },
    changePhase(phase) {
      this.currentPhase = phase;
    }
  };

  return { game, state };
}

test('adapter enforces a closed action union, actor authority, revision, UID and zone', () => {
  const { game } = createFakeGame();
  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'player',
    localViewerSide: 'player'
  });

  const valid = adapter.validateAction({
    kind: 'NORMAL_SUMMON',
    actor: 'player',
    cardUid: 'player-monster',
    zoneIndex: 0
  }, { baseRevision: 0 });
  assert.equal(valid.ok, true);
  assert.deepEqual(valid.action, {
    kind: 'NORMAL_SUMMON',
    actor: 'player',
    cardUid: 'player-monster',
    zoneIndex: 0,
    baseRevision: 0
  });

  assert.equal(adapter.validateAction({
    kind: 'NORMAL_SUMMON',
    actor: 'opponent',
    cardUid: 'secret-hand-uid',
    zoneIndex: 0,
    baseRevision: 0
  }).code, 'ACTOR_NOT_AUTHORIZED');

  assert.equal(adapter.validateAction({
    kind: 'NORMAL_SUMMON',
    actor: 'player',
    cardUid: 'missing-card',
    zoneIndex: 0,
    baseRevision: 0
  }).code, 'CARD_NOT_IN_HAND');

  assert.equal(adapter.validateAction({
    kind: 'NORMAL_SUMMON',
    actor: 'player',
    cardUid: 'player-monster',
    zoneIndex: 9,
    baseRevision: 0
  }).code, 'INVALID_ZONE');

  assert.equal(adapter.validateAction({
    kind: 'NORMAL_SUMMON',
    actor: 'player',
    cardUid: 'player-monster',
    zoneIndex: 0,
    injectedMethod: 'endGame',
    baseRevision: 0
  }).code, 'UNKNOWN_ACTION_FIELD');

  const unsupported = adapter.validateAction({
    kind: 'DECLARE_ATTACK',
    actor: 'player',
    baseRevision: 0
  });
  assert.equal(unsupported.code, 'UNSUPPORTED_ACTION');
  assert.match(unsupported.reason, /executeAttack|unsupported/i);

  assert.equal(adapter.validateAction({
    kind: 'NORMAL_SUMMON',
    actor: 'player',
    cardUid: 'player-monster',
    zoneIndex: 0,
    baseRevision: 1
  }).code, 'REVISION_MISMATCH');

  assert.equal(adapter.validateAction({
    kind: 'NORMAL_SUMMON',
    actor: 'player',
    cardUid: 'player-monster',
    zoneIndex: 0,
    baseRevision: 0
  }, { baseRevision: 1 }).code, 'REVISION_CONFLICT');

  assert.ok(DUEL_GAME_NETWORK_ACTION_KINDS.includes('PENDULUM_SUMMON'));
  assert.equal(Object.isFrozen(DUEL_GAME_NETWORK_ACTION_KINDS), true);
});

test('adapter serializes action application and increments revision exactly once', async () => {
  const { game, state } = createFakeGame();
  let releaseSummon;
  const gate = new Promise(resolve => {
    releaseSummon = resolve;
  });
  const originalSummon = game.summonMonster.bind(game);
  game.summonMonster = async (...args) => {
    await gate;
    return originalSummon(...args);
  };
  const pendingEvents = [];
  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'player',
    callbacks: {
      onPendingChange: event => pendingEvents.push(event.pending)
    }
  });
  const action = {
    kind: 'NORMAL_SUMMON',
    actor: 'player',
    cardUid: 'player-monster',
    zoneIndex: 0,
    baseRevision: 0
  };

  const first = adapter.applyAction(action);
  const concurrent = await adapter.applyAction(action);
  assert.equal(concurrent.accepted, false);
  assert.equal(concurrent.code, 'ACTION_PENDING');
  assert.equal(adapter.revision, 0);

  releaseSummon();
  const acknowledgement = await first;
  assert.equal(acknowledgement.accepted, true);
  assert.equal(acknowledgement.revision, 1);
  assert.equal(acknowledgement.result.kind, 'NORMAL_SUMMON');
  assert.equal(state.player.monsters[0].uid, 'player-monster');
  assert.equal(state.player.hand.some(card => card.uid === 'player-monster'), false);
  assert.deepEqual(pendingEvents, [true, false]);

  const stale = await adapter.applyAction({
    kind: 'SET_SPELL_TRAP',
    actor: 'player',
    cardUid: 'player-spell',
    zoneIndex: 0,
    baseRevision: 0
  });
  assert.equal(stale.accepted, false);
  assert.equal(stale.code, 'REVISION_MISMATCH');
  assert.equal(adapter.revision, 1);
});

test('public snapshots are deterministic and redact opposing hand, Deck order and set cards', () => {
  const { game } = createFakeGame();
  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'opponent',
    localViewerSide: 'player',
    initialRevision: 3
  });

  const first = adapter.buildPublicSnapshot('player');
  const second = adapter.buildPublicSnapshot('player');
  assert.deepEqual(first, second);
  assert.equal(first.revision, 3);
  assert.equal(first.sides.player.hand.cards[0].name, 'Visible Hand Monster');
  assert.deepEqual(first.sides.opponent.hand, { count: 1 });
  assert.deepEqual(first.sides.player.deck, { count: 2 });
  assert.deepEqual(first.sides.opponent.deck, { count: 2 });
  assert.deepEqual(first.sides.opponent.extraDeck, { count: 1 });
  assert.equal(first.sides.opponent.monsters[2].hidden, true);
  assert.equal(first.sides.opponent.spells[1].hidden, true);
  assert.equal(first.sides.opponent.banished[0].hidden, true);

  const serialized = JSON.stringify(first);
  for (const secret of [
    'Secret Opponent Hand',
    'secret-hand-id',
    'secret-hand-uid',
    'Secret Opponent Deck Top',
    'secret-deck-top-id',
    'Secret Set Monster',
    'secret-set-monster-id',
    'Secret Set Spell',
    'secret-set-spell-id',
    'Secret Opponent Extra',
    'secret-extra-id',
    'Secret Face-down Banished',
    'secret-banished-id'
  ]) {
    assert.equal(serialized.includes(secret), false, `snapshot leaked ${secret}`);
  }
});

test('snapshot application creates only a public mirror and rejects leaks, stale data and revision conflicts', () => {
  const source = createFakeGame();
  const sourceAdapter = new DuelGameNetworkAdapter(source.game, {
    remoteActorSide: 'opponent',
    localViewerSide: 'player',
    initialRevision: 4
  });
  const snapshot = sourceAdapter.buildPublicSnapshot('player');

  const target = createFakeGame();
  target.game.playerLP = 1234;
  const resyncEvents = [];
  const targetAdapter = new DuelGameNetworkAdapter(target.game, {
    remoteActorSide: 'opponent',
    localViewerSide: 'player',
    callbacks: {
      onResyncRequired: event => resyncEvents.push(event)
    }
  });

  const applied = targetAdapter.applyPublicSnapshot(snapshot, { revision: 4 });
  assert.deepEqual(applied, {
    applied: true,
    revision: 4,
    mirrorOnly: true
  });
  assert.equal(target.game.playerLP, 1234, 'redacted snapshots must not overwrite DuelGame');
  assert.deepEqual(targetAdapter.getPublicMirror(), snapshot);
  const detachedMirror = targetAdapter.getPublicMirror();
  detachedMirror.sides.player.lp = 1;
  assert.equal(targetAdapter.getPublicMirror().sides.player.lp, 8000);

  const leaked = structuredClone(snapshot);
  leaked.sides.opponent.hand.cards = [{
    uid: 'leaked',
    id: 'leaked-id',
    name: 'Leaked card'
  }];
  assert.equal(
    targetAdapter.applyPublicSnapshot(leaked, { revision: 4 }).code,
    'PRIVATE_DATA_VIOLATION'
  );

  const stale = structuredClone(snapshot);
  stale.revision = 3;
  const staleResult = targetAdapter.applyPublicSnapshot(stale, { revision: 3 });
  assert.equal(staleResult.code, 'STALE_SNAPSHOT');

  const conflict = targetAdapter.applyPublicSnapshot(snapshot, { revision: 5 });
  assert.equal(conflict.code, 'SNAPSHOT_REVISION_CONFLICT');
  assert.equal(resyncEvents.length, 2);
  assert.deepEqual(
    resyncEvents.map(event => event.reason),
    ['STALE_SNAPSHOT', 'SNAPSHOT_REVISION_CONFLICT']
  );
});

test('controller bindings preserve adapter revision and viewer-specific redaction', async () => {
  const { game } = createFakeGame();
  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'player',
    localViewerSide: 'opponent'
  });
  const bindings = adapter.createControllerBindings({
    remoteViewerSide: 'player',
    localViewerSide: 'opponent'
  });

  const validation = bindings.validateRemoteAction({
    kind: 'SET_SPELL_TRAP',
    actor: 'player',
    cardUid: 'player-spell',
    zoneIndex: 0
  }, { baseRevision: 0 });
  assert.equal(validation.ok, true);

  const acknowledgement = await bindings.applyRemoteAction({
    kind: 'SET_SPELL_TRAP',
    actor: 'player',
    cardUid: 'player-spell',
    zoneIndex: 0
  }, { baseRevision: 0 });
  assert.equal(acknowledgement.accepted, true);
  assert.equal(acknowledgement.revision, 1);

  const envelope = bindings.buildPublicSnapshot();
  assert.equal(envelope.revision, 1);
  assert.equal(envelope.state.viewerSide, 'player');
  assert.equal(envelope.state.sides.opponent.hand.cards, undefined);
});

test('adapter applies its safe action subset against the real DuelGame API', async () => {
  const game = new DuelGame({}, { rulesMode: 'strict' });
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  const trapData = STARTER_CARDS.find(card => card.card_type === 'trap');
  assert.ok(trapData, 'test fixture requires a supported Trap');
  const trap = new CardState(trapData);
  trap.uid = 'real-game-trap';
  trap.ownerId = 'player';
  trap.controllerId = 'player';
  trap.location = 'hand';
  game.playerHand.push(trap);

  const adapter = new DuelGameNetworkAdapter(game, {
    remoteActorSide: 'player',
    localViewerSide: 'player'
  });
  const result = await adapter.applyAction({
    kind: 'SET_SPELL_TRAP',
    actor: 'player',
    cardUid: trap.uid,
    zoneIndex: 3,
    baseRevision: 0
  });

  assert.equal(result.accepted, true);
  assert.equal(result.revision, 1);
  assert.equal(game.playerSpells[3], trap);
  assert.equal(trap.location, 'spell_zone');
  assert.equal(trap.isSetFaceDown, true);
  assert.equal(game.playerHand.includes(trap), false);
});
