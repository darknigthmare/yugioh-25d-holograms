import test from 'node:test';
import assert from 'node:assert/strict';

import { CardState } from '../src/core/CardState.js';
import { DuelGame } from '../src/game.js';

function monster({
  uid,
  id = uid,
  name = uid,
  atk = 1500,
  def = 1200,
  level = 4,
  type = 'Effect Monster',
  extra_type = null,
  ...overrides
}) {
  return new CardState({
    uid,
    id,
    name,
    name_en: name,
    card_type: 'monster',
    type,
    desc: '',
    atk,
    def,
    level,
    extra_type,
    belongsInExtraDeck: Boolean(extra_type),
    isEffectMonster: /Effect/i.test(type),
    ...overrides
  });
}

function trap({ uid, id, name }) {
  const card = new CardState({
    uid,
    id,
    name,
    name_en: name,
    card_type: 'trap',
    type: 'Trap Card',
    desc: ''
  });
  card.isSetFaceDown = true;
  card.turnSet = 1;
  return card;
}

function spell({ uid, id = uid, name = uid }) {
  return new CardState({
    uid,
    id,
    name,
    name_en: name,
    card_type: 'spell',
    type: 'Spell Card',
    desc: ''
  });
}

function own(card, owner, controller = owner) {
  card.ownerId = owner;
  card.controllerId = controller;
  return card;
}

function makeStardust(uid, owner = 'player', controller = owner) {
  const card = own(monster({
    uid,
    id: '44508094',
    name: 'Stardust Dragon',
    atk: 2500,
    def: 2000,
    level: 8,
    type: 'Synchro Effect Monster',
    extra_type: 'synchro'
  }), owner, controller);
  card.wasProperlySpecialSummoned = true;
  return card;
}

function makeEmptyUtopia(uid, owner = 'opponent') {
  return own(monster({
    uid,
    id: '84013237',
    name: 'Number 39: Utopia',
    atk: 2500,
    def: 2000,
    level: 0,
    rank: 4,
    type: 'Xyz Effect Monster',
    extra_type: 'xyz'
  }), owner);
}

function prepareBattle(game, side = 'player') {
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'battle';
  game.phases.turnCount = 2;
  game.startPhaseFlow = () => {};
  game.delay = async () => true;
}

function prepareMain(game, side = 'player') {
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.startPhaseFlow = () => {};
  game.delay = async () => true;
}

test('empty Utopia starts mandatory CL1; Mirror Force CL2 and Stardust CL3 can answer it', async () => {
  let stardustSelected = false;
  const chainPops = [];
  const game = new DuelGame({
    onDecision: request => {
      if (request.effect === 'mirror-force') return true;
      if (request.type === 'battle-replay') return 'cancel';
      return undefined;
    },
    onChainOpportunity: ({ candidates }) => {
      const candidate = candidates.find(card => card.id === '44508094');
      if (!stardustSelected && candidate) {
        stardustSelected = true;
        return candidate.cardUid;
      }
      return null;
    },
    onAnimation: event => {
      if (event.type === 'chain-pop') {
        chainPops.push({ link: event.linkNumber, id: String(event.card.id) });
      }
    }
  });
  prepareBattle(game);
  const attacker = own(monster({ uid: 'mandatory-attacker', atk: 3000 }), 'player');
  const stardust = makeStardust('mandatory-stardust');
  const utopia = makeEmptyUtopia('mandatory-empty-utopia');
  const mirror = own(trap({
    uid: 'mandatory-mirror',
    id: '44095762',
    name: 'Mirror Force'
  }), 'opponent');
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('player', 1, stardust);
  game.field.setMonsterZone('opponent', 0, utopia);
  game.field.setSpellZone('opponent', 0, mirror);

  const result = await game.executeAttack(0, 0);

  assert.deepEqual(chainPops.slice(0, 3), [
    { link: 1, id: '84013237' },
    { link: 2, id: '44095762' },
    { link: 3, id: '44508094' }
  ]);
  assert.equal(result.mandatoryUtopiaDestruction, true);
  assert.equal(result.mandatoryUtopiaOutcome.applied, true);
  assert.equal(result.replayCancelled, true);
  assert.equal(game.playerMonsters[0], attacker);
  assert.ok(game.playerGraveyard.includes(stardust));
  assert.ok(game.opponentGraveyard.includes(mirror));
  assert.ok(game.opponentGraveyard.includes(utopia));
});

test('a second Trap Hole can chain after Stardust at SUMMON_SUCCESS, but timing Traps stay closed elsewhere', async () => {
  const selected = [];
  let usedStardust = false;
  let usedSecondTrap = false;
  const game = new DuelGame({
    onDecision: request => (
      request.effect === 'trap-hole' ? true : undefined
    ),
    onChainOpportunity: ({ candidates }) => {
      const stardust = candidates.find(card => card.id === '44508094');
      if (!usedStardust && stardust) {
        usedStardust = true;
        selected.push(stardust.cardUid);
        return stardust.cardUid;
      }
      const secondTrap = candidates.find(card => card.cardUid === 'trap-hole-copy-2');
      if (!usedSecondTrap && secondTrap) {
        usedSecondTrap = true;
        selected.push(secondTrap.cardUid);
        return secondTrap.cardUid;
      }
      return null;
    }
  });
  prepareMain(game);
  const summoned = own(monster({
    uid: 'trap-hole-summoned',
    atk: 1800
  }), 'player');
  const stardust = makeStardust('trap-hole-stardust');
  const firstTrap = own(trap({
    uid: 'trap-hole-copy-1',
    id: '04206964',
    name: 'Trap Hole'
  }), 'opponent');
  const secondTrap = own(trap({
    uid: 'trap-hole-copy-2',
    id: '04206964',
    name: 'Trap Hole'
  }), 'opponent');
  game.field.setMonsterZone('player', 0, summoned);
  game.field.setMonsterZone('player', 1, stardust);
  game.field.setSpellZone('opponent', 0, firstTrap);
  game.field.setSpellZone('opponent', 1, secondTrap);

  await game.resolveSummonSuccessEvent(
    summoned,
    'player',
    { zoneType: 'main', zoneIndex: 0 },
    { summonType: 'normal', includeJunk: false }
  );

  assert.deepEqual(selected, ['trap-hole-stardust', 'trap-hole-copy-2']);
  assert.ok(game.playerGraveyard.includes(stardust));
  assert.ok(game.playerGraveyard.includes(summoned));
  assert.ok(game.opponentGraveyard.includes(firstTrap));
  assert.ok(game.opponentGraveyard.includes(secondTrap));

  const offTimingGame = new DuelGame();
  prepareMain(offTimingGame);
  const offTimingTrapHole = own(trap({
    uid: 'off-timing-trap-hole',
    id: '04206964',
    name: 'Trap Hole'
  }), 'opponent');
  const offTimingMirror = own(trap({
    uid: 'off-timing-mirror',
    id: '44095762',
    name: 'Mirror Force'
  }), 'opponent');
  const genericSource = own(spell({
    uid: 'generic-chain-source',
    name: 'Generic Spell'
  }), 'player');
  offTimingGame.field.setSpellZone('opponent', 0, offTimingTrapHole);
  offTimingGame.field.setSpellZone('opponent', 1, offTimingMirror);
  offTimingGame.chain.pushChainLink('player', genericSource);

  assert.deepEqual(
    offTimingGame.getLegalChainCandidates('opponent', {
      event: 'card-activation',
      timingEvent: 'card-activation',
      sourceCard: genericSource
    }).filter(candidate => candidate.source === 'timing-trap'),
    []
  );
});

test('a second Mirror Force can chain after Stardust while ATTACK_DECLARED timing remains open', async () => {
  let usedStardust = false;
  let usedSecondMirror = false;
  const selected = [];
  const game = new DuelGame({
    onDecision: request => (
      request.effect === 'mirror-force' ? true : undefined
    ),
    onChainOpportunity: ({ candidates }) => {
      const stardust = candidates.find(card => card.id === '44508094');
      if (!usedStardust && stardust) {
        usedStardust = true;
        selected.push(stardust.cardUid);
        return stardust.cardUid;
      }
      const secondMirror = candidates.find(card => card.cardUid === 'mirror-copy-2');
      if (!usedSecondMirror && secondMirror) {
        usedSecondMirror = true;
        selected.push(secondMirror.cardUid);
        return secondMirror.cardUid;
      }
      return null;
    }
  });
  prepareBattle(game);
  const attacker = own(monster({ uid: 'double-mirror-attacker', atk: 2200 }), 'player');
  const stardust = makeStardust('double-mirror-stardust');
  const firstMirror = own(trap({
    uid: 'mirror-copy-1',
    id: '44095762',
    name: 'Mirror Force'
  }), 'opponent');
  const secondMirror = own(trap({
    uid: 'mirror-copy-2',
    id: '44095762',
    name: 'Mirror Force'
  }), 'opponent');
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('player', 1, stardust);
  game.field.setSpellZone('opponent', 0, firstMirror);
  game.field.setSpellZone('opponent', 1, secondMirror);

  await game.resolveAttackDeclarationEvent({
    attacker,
    attackerEntry: game.getMonsterEntry('player', 0),
    attackingSide: 'player'
  });

  assert.deepEqual(selected, ['double-mirror-stardust', 'mirror-copy-2']);
  assert.ok(game.playerGraveyard.includes(attacker));
  assert.ok(game.playerGraveyard.includes(stardust));
  assert.ok(game.opponentGraveyard.includes(firstMirror));
  assert.ok(game.opponentGraveyard.includes(secondMirror));
});

test('a Stardust stolen by the opponent returns from its owner Graveyard to its owner field', async () => {
  const game = new DuelGame({
    onDecision: request => {
      if (request.effect === 'stardust-end-phase-return') return true;
      if (request.type === 'select-summon-position') return 'attack';
      if (request.type === 'select-summon-destination') return 'main:0';
      return undefined;
    }
  });
  prepareMain(game);
  game.phases.turnCount = 4;
  const stardust = makeStardust('stolen-stardust', 'player', 'opponent');
  const destructionSource = own(spell({
    uid: 'stolen-stardust-target',
    id: '12580477',
    name: 'Raigeki'
  }), 'player');
  game.field.setMonsterZone('opponent', 0, stardust);
  game.field.setSpellZone('player', 0, destructionSource);
  const targetLink = game.chain.pushChainLink('player', destructionSource, [], {
    context: { wouldDestroy: true },
    resolver: async () => true
  });

  assert.equal(
    await game.addStardustResponse(stardust, 'opponent', 0, targetLink),
    true
  );
  await game.resolveChainStack();

  assert.ok(game.playerGraveyard.includes(stardust));
  assert.equal(stardust.stardustReturnController, 'player');
  assert.equal(game.opponentGraveyard.includes(stardust), false);

  assert.equal(await game.processEndPhaseEffects(), 1);
  assert.equal(game.playerMonsters[0], stardust);
  assert.equal(stardust.controllerId, 'player');
  assert.equal(game.opponentMonsters[0], null);
});

test('player replay is an immediate same-attacker decision and cannot interleave another attack', async () => {
  let game;
  let replaySawResolvingAction = false;
  let interleavedResult = 'not-called';
  const gameCallbacks = {
    onDecision: async request => {
      if (request.type !== 'battle-replay') return undefined;
      replaySawResolvingAction = game.isResolvingAction;
      interleavedResult = await game.executeAttack(1, 1);
      return request.choices.find(choice => (
        String(choice.value).includes('replay-survivor')
      )).value;
    }
  };
  game = new DuelGame(gameCallbacks);
  prepareBattle(game);
  const attacker = own(monster({ uid: 'replay-primary-attacker', atk: 3000 }), 'player');
  const otherAttacker = own(monster({ uid: 'replay-other-attacker', atk: 1900 }), 'player');
  const utopia = makeEmptyUtopia('replay-empty-utopia');
  const survivor = own(monster({
    uid: 'replay-survivor',
    atk: 1000
  }), 'opponent');
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('player', 1, otherAttacker);
  game.field.setMonsterZone('opponent', 0, utopia);
  game.field.setMonsterZone('opponent', 1, survivor);

  await game.executeAttack(0, 0);

  assert.equal(replaySawResolvingAction, true);
  assert.equal(interleavedResult, undefined);
  assert.equal(game.hasMonsterAttacked(0), true);
  assert.equal(game.hasMonsterAttacked(1), false);
  assert.equal(game.opponentLP, 6000);
  assert.ok(game.opponentGraveyard.includes(utopia));
  assert.ok(game.opponentGraveyard.includes(survivor));
});

test('AI replay keeps the legal direct attack after empty Utopia destroys itself', async () => {
  const game = new DuelGame();
  prepareBattle(game, 'opponent');
  const attacker = own(monster({
    uid: 'ai-replay-attacker',
    atk: 3000
  }), 'opponent');
  const utopia = makeEmptyUtopia('ai-replay-empty-utopia', 'player');
  game.field.setMonsterZone('opponent', 0, attacker);
  game.field.setMonsterZone('player', 0, utopia);

  await game.runAIBattlePhase();

  assert.equal(game.playerLP, 5000);
  assert.equal(game.opponentMonsters[0], attacker);
  assert.ok(game.playerGraveyard.includes(utopia));
  assert.equal(attacker.directAttacksDeclaredThisTurn, 1);
});

test('reset during the blocking replay decision cannot mutate the new Duel generation', async () => {
  let resolveReplay;
  const game = new DuelGame({
    onDecision: request => {
      if (request.type === 'battle-replay') {
        return new Promise(resolve => {
          resolveReplay = resolve;
        });
      }
      return undefined;
    }
  });
  prepareBattle(game);
  const attacker = own(monster({ uid: 'stale-replay-attacker', atk: 3000 }), 'player');
  const utopia = makeEmptyUtopia('stale-replay-utopia');
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, utopia);

  const pendingAttack = game.executeAttack(0, 0);
  for (let attempt = 0; attempt < 20 && !resolveReplay; attempt += 1) {
    await Promise.resolve();
  }
  assert.equal(typeof resolveReplay, 'function');

  game.reset();
  resolveReplay('direct');
  assert.equal(await pendingAttack, false);
  assert.equal(game.playerLP, 8000);
  assert.equal(game.opponentLP, 8000);
  assert.equal(game.getMonsterEntries('player').length, 0);
  assert.equal(game.getMonsterEntries('opponent').length, 0);
});

test('reset inside the attack response window cannot resolve a Chain from the new Duel', async () => {
  let resolveOpportunity;
  const game = new DuelGame({
    onDecision: request => (
      request.effect === 'mirror-force' ? true : undefined
    ),
    onChainOpportunity: () => new Promise(resolve => {
      resolveOpportunity = resolve;
    })
  });
  prepareBattle(game);
  const attacker = own(monster({
    uid: 'stale-window-attacker',
    atk: 2000
  }), 'player');
  const mirror = own(trap({
    uid: 'stale-window-mirror',
    id: '44095762',
    name: 'Mirror Force'
  }), 'opponent');
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setSpellZone('opponent', 0, mirror);

  const oldDeclaration = game.resolveAttackDeclarationEvent({
    attacker,
    attackerEntry: game.getMonsterEntry('player', 0),
    attackingSide: 'player'
  });
  for (let attempt = 0; attempt < 20 && !resolveOpportunity; attempt += 1) {
    await Promise.resolve();
  }
  assert.equal(typeof resolveOpportunity, 'function');

  game.reset();
  let newChainResolutions = 0;
  const newSource = own(spell({
    uid: 'new-duel-chain-source',
    name: 'New Duel Spell'
  }), 'player');
  game.chain.pushChainLink('player', newSource, [], {
    resolver: async () => {
      newChainResolutions += 1;
      return true;
    }
  });

  resolveOpportunity(null);
  const result = await oldDeclaration;
  assert.equal(result.aborted, true);
  assert.equal(newChainResolutions, 0);
  assert.equal(game.chain.chainStack.length, 1);

  await game.resolveChainStack();
  assert.equal(newChainResolutions, 1);
});
