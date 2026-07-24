import test from 'node:test';
import assert from 'node:assert/strict';

import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
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

function spell({
  uid,
  id = uid,
  name = uid,
  type = 'Spell Card',
  card_type = 'spell',
  ...overrides
}) {
  return new CardState({
    uid,
    id,
    name,
    name_en: name,
    card_type,
    type,
    desc: '',
    ...overrides
  });
}

function control(card, side, location = null) {
  card.ownerId = side;
  card.controllerId = side;
  if (location) card.location = location;
  return card;
}

async function withImmediateTimers(action) {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = callback => {
    callback();
    return 0;
  };
  try {
    return await action();
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
}

function prepareMain(game, side = 'player') {
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.startPhaseFlow = () => {};
}

function prepareBattle(game, side = 'player') {
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'battle';
  game.phases.turnCount = 2;
  game.startPhaseFlow = () => {};
}

test('DefensiveEngine reset clears every duel-scoped registry and chain-local negation cannot leak', async () => {
  const game = new DuelGame();
  const source = control(spell({ uid: 'chain-source' }), 'player');
  let resolutions = 0;
  const first = game.chain.pushChainLink('player', source, [], {
    resolver: async () => {
      resolutions += 1;
      return true;
    }
  });
  game.defense.negateChainLink(first);
  await withImmediateTimers(() => game.resolveChainStack());
  assert.equal(resolutions, 0);
  assert.equal(game.defense.negatedChainLinks.size, 0);

  const second = game.chain.pushChainLink('player', source, [], {
    resolver: async () => {
      resolutions += 1;
      return true;
    }
  });
  assert.equal(second.id, 1);
  assert.notEqual(second.key, first.key);
  await withImmediateTimers(() => game.resolveChainStack());
  assert.equal(resolutions, 1);

  game.defense.addRestriction({ playerId: 'player', actionType: 'SPECIAL_SUMMON' });
  game.defense.negateCard('card-a');
  game.defense.addProtection({ cardUid: 'card-a', type: 'TARGET' });
  game.defense.addReplacement({
    cardUid: 'card-a',
    triggerType: 'DESTROY',
    replaceFn: () => true
  });
  game.reset();
  assert.deepEqual(game.defense.restrictions, []);
  assert.equal(game.defense.negatedCards.size, 0);
  assert.equal(game.defense.negatedChainLinks.size, 0);
  assert.deepEqual(game.defense.protections, []);
  assert.deepEqual(game.defense.replacements, []);
});

test('reset invalidates a pending async End Phase decision from the previous duel', async () => {
  let resolveDecision;
  let decisionCount = 0;
  const game = new DuelGame({
    onDecision: () => {
      decisionCount += 1;
      if (decisionCount === 1) {
        return new Promise(resolve => {
          resolveDecision = resolve;
        });
      }
      return undefined;
    }
  });
  game.phases.currentPhase = 'end';
  game.phases.currentTurnOwner = 'player';
  game.phases.turnCount = 3;

  const stardust = control(monster({
    uid: 'stardust-from-previous-duel',
    id: '44508094',
    name: 'Dragon Poussière d’Étoile',
    type: 'Synchro Effect Monster',
    extra_type: 'synchro',
    level: 8
  }), 'player', 'graveyard');
  stardust.stardustReturnEligibleTurn = 3;
  stardust.stardustReturnController = 'player';
  stardust.stardustReturnRuntimeInstanceId = stardust.runtimeInstanceId;
  game.playerGraveyard.push(stardust);

  const pendingEndPhase = game.processEndPhaseEffects();
  await Promise.resolve();
  assert.equal(typeof resolveDecision, 'function');

  game.reset();
  resolveDecision(true);
  await pendingEndPhase;

  assert.equal(
    game.getMonsterEntries('player').some(entry => entry.card === stardust),
    false
  );
  assert.equal(game.playerGraveyard.includes(stardust), false);
  assert.equal(decisionCount, 1);
});

test('Sandbox startDuel rejects an empty Main Deck synchronously instead of filling forever', () => {
  const animations = [];
  const game = new DuelGame({
    onAnimation: animation => animations.push(animation)
  }, { rulesMode: 'sandbox' });
  assert.equal(game.startDuel([], [], [], []), false);
  assert.equal(game.playerDeck.length, 0);
  assert.equal(game.opponentDeck.length, 0);
  assert.equal(animations.at(-1)?.type, 'deck-invalid');
});

test('zone changes renew runtime identity, clear transient state, and remove aliases', () => {
  const game = new DuelGame();
  const card = control(monster({ uid: 'zone-card' }), 'player', 'hand');
  card.counters.spell = 2;
  card.currentAtk = 2900;
  card.activeModifiers.push({ type: 'atk', value: 1400 });
  card.effectNegated = true;
  card.effectUsage.softOnce = true;
  card.attacksDeclaredThisTurn = 1;
  const handRuntime = card.runtimeInstanceId;

  game.field.setMonsterZone('player', 0, card);
  assert.notEqual(card.runtimeInstanceId, handRuntime);
  assert.deepEqual(card.counters, {});
  assert.equal(card.currentAtk, card.baseAtk);
  assert.deepEqual(card.activeModifiers, []);
  assert.equal(card.effectNegated, false);
  assert.deepEqual(card.effectUsage, {});
  assert.equal(card.attacksDeclaredThisTurn, 0);

  const firstFieldRuntime = card.runtimeInstanceId;
  game.field.setMonsterZone('player', 3, card);
  assert.equal(game.playerMonsters[0], null);
  assert.equal(game.playerMonsters[3], card);
  assert.notEqual(card.runtimeInstanceId, firstFieldRuntime);
  assert.equal(game.playerMonsters.filter(candidate => candidate === card).length, 1);

  card.wasProperlySpecialSummoned = true;
  game.field.setMonsterZone('player', 3, null);
  game.field.sendToGraveyard(card, 'player');
  assert.equal(card.wasProperlySpecialSummoned, true);
  assert.equal(game.playerGraveyard.filter(candidate => candidate === card).length, 1);
  game.field.sendToFaceUpExtraDeck(card, 'player');
  assert.equal(card.wasProperlySpecialSummoned, false);
  assert.equal(game.playerGraveyard.includes(card), false);
  assert.equal(game.playerFaceUpExtraDeck.filter(candidate => candidate === card).length, 1);
});

test('Junk Synchron negation follows the same face-up instance and Arcanite revives with zero counters', () => {
  const game = new DuelGame();
  game.phases.turnCount = 2;
  const revived = control(monster({ uid: 'junk-revived', level: 2 }), 'player', 'graveyard');
  game.playerGraveyard.push(revived);
  game.specialSummonCard(revived, 'player', 0, {
    position: 'defense',
    summonType: 'junk-synchron',
    negateEffectsWhileFaceUp: true
  });
  const junkRuntime = revived.runtimeInstanceId;
  revived.resetTurnStatus();
  assert.equal(revived.effectNegated, true);
  assert.equal(revived.runtimeInstanceId, junkRuntime);
  revived.isSetFaceDown = true;
  assert.equal(revived.effectNegated, false);

  const arcanite = control(monster({
    uid: 'arcanite-reset',
    id: '31924889',
    atk: 400,
    level: 7,
    type: 'Synchro Effect Monster',
    extra_type: 'synchro'
  }), 'player', 'extra_deck');
  game.specialSummonCard(arcanite, 'player', 1, {
    summonType: 'synchro',
    properlySummoned: true
  });
  assert.equal(arcanite.counters.spell, 2);
  assert.equal(arcanite.getAtk(), 2400);
  const entry = game.getMonsterEntry('player', 1);
  game.removeMonsterEntry('player', entry);
  game.field.sendToGraveyard(arcanite, 'player');
  game.specialSummonCard(arcanite, 'player', 1, {
    summonType: 'monster-reborn'
  });
  assert.equal(arcanite.counters.spell, undefined);
  assert.equal(arcanite.getAtk(), 400);
});

test('Stardust is chained before resolution, pays its Tribute cost, and only then becomes return-eligible', async () => {
  let selected = false;
  const game = new DuelGame({
    onChainOpportunity: ({ candidates }) => {
      const stardust = candidates.find(candidate => candidate.id === '44508094');
      if (!selected && stardust) {
        selected = true;
        return stardust.cardUid;
      }
      return null;
    },
    onDecision: request => (
      request.effect === 'stardust-end-phase-return' ? false : undefined
    )
  });
  game.phases.turnCount = 3;
  const stardust = control(monster({
    uid: 'stardust-chain',
    id: '44508094',
    name: 'Dragon Poussière d’Étoile',
    type: 'Synchro Effect Monster',
    extra_type: 'synchro',
    level: 8
  }), 'player');
  stardust.wasProperlySpecialSummoned = true;
  game.field.setMonsterZone('player', 0, stardust);
  const raigeki = control(spell({
    uid: 'destruction-link',
    id: '12580477',
    name: 'Raigeki'
  }), 'opponent');
  game.field.setSpellZone('opponent', 0, raigeki);
  const targetLink = game.chain.pushChainLink('opponent', raigeki, [], {
    context: { wouldDestroy: true },
    resolver: async () => true
  });

  await game.openChainResponseWindow('player', {
    event: 'card-activation',
    wouldDestroy: true,
    sourceCard: raigeki
  });
  assert.equal(game.chain.chainStack.length, 2);
  assert.equal(game.playerMonsters[0], null);
  assert.ok(game.playerGraveyard.includes(stardust));
  assert.equal(stardust.stardustReturnEligibleTurn, -1);
  const graveRuntime = stardust.runtimeInstanceId;

  await withImmediateTimers(() => game.resolveChainStack());
  assert.equal(targetLink.activationNegated, true);
  assert.equal(stardust.stardustReturnEligibleTurn, 3);
  assert.equal(stardust.stardustReturnRuntimeInstanceId, graveRuntime);
  await withImmediateTimers(() => game.processEndPhaseEffects());
  assert.ok(game.playerGraveyard.includes(stardust));
  assert.equal(stardust.stardustReturnEligibleTurn, -1);
});

test('a negated Stardust link never grants its End Phase return', async () => {
  const game = new DuelGame();
  game.phases.turnCount = 4;
  const stardust = control(monster({
    uid: 'stardust-negated',
    id: '44508094',
    type: 'Synchro Effect Monster',
    extra_type: 'synchro',
    level: 8
  }), 'player');
  game.field.setMonsterZone('player', 0, stardust);
  const source = control(spell({ uid: 'stardust-target' }), 'opponent');
  const targetLink = game.chain.pushChainLink('opponent', source, [], {
    context: { wouldDestroy: true },
    resolver: async () => true
  });
  await game.addStardustResponse(stardust, 'player', 0, targetLink);
  game.chain.getLastLink().activationNegated = true;
  await withImmediateTimers(() => game.resolveChainStack());
  assert.equal(stardust.stardustReturnEligibleTurn, -1);
  assert.ok(game.playerGraveyard.includes(stardust));
});

test('SUMMON_SUCCESS builds Junk CL1, Trap Hole CL2, and allows Stardust CL3', async () => {
  let stardustUsed = false;
  const target = control(monster({
    uid: 'junk-target-event',
    name: 'Cible Robot',
    level: 2
  }), 'player', 'graveyard');
  const game = new DuelGame({
    onDecision: request => {
      if (request.effect === 'junk-synchron-revive') return true;
      if (request.type === 'select-junk-synchron-target') return target.uid;
      if (request.effect === 'trap-hole') return true;
      if (request.type === 'select-summon-destination') return 'main:4';
      return undefined;
    },
    onChainOpportunity: ({ candidates }) => {
      const candidate = candidates.find(card => card.id === '44508094');
      if (!stardustUsed && candidate) {
        stardustUsed = true;
        return candidate.cardUid;
      }
      return null;
    }
  });
  prepareMain(game);
  const junk = control(monster({
    uid: 'junk-event',
    id: '63977008',
    name: 'Robot Synchronique',
    atk: 1300,
    level: 3,
    type: 'Tuner Effect Monster'
  }), 'player', 'hand');
  const stardust = control(monster({
    uid: 'stardust-event',
    id: '44508094',
    type: 'Synchro Effect Monster',
    extra_type: 'synchro',
    level: 8
  }), 'player');
  const trap = control(spell({
    uid: 'trap-hole-event',
    id: '04206964',
    name: 'Trappe',
    type: 'Trap Card',
    card_type: 'trap'
  }), 'opponent');
  trap.isSetFaceDown = true;
  trap.turnSet = 1;
  game.playerHand.push(junk);
  game.playerGraveyard.push(target);
  game.field.setMonsterZone('player', 1, stardust);
  game.field.setSpellZone('opponent', 0, trap);

  await withImmediateTimers(() => game.summonMonster(junk.uid, 0));
  assert.equal(game.playerMonsters[0], junk);
  assert.equal(game.playerMonsters[4], target);
  assert.equal(target.position, 'defense');
  assert.equal(target.effectNegated, true);
  assert.ok(game.opponentGraveyard.includes(trap));
  assert.ok(game.playerGraveyard.includes(stardust));
  assert.equal(stardustUsed, true);
});

test('Junk Synchron keeps its exact target and never substitutes a moved card', async () => {
  const target = control(monster({ uid: 'locked-junk', level: 2 }), 'player', 'graveyard');
  const substitute = control(monster({ uid: 'substitute-junk', level: 2 }), 'player', 'graveyard');
  const game = new DuelGame({
    onDecision: request => {
      if (request.effect === 'junk-synchron-revive') return true;
      if (request.type === 'select-junk-synchron-target') return target.uid;
      return undefined;
    }
  });
  game.playerGraveyard.push(target, substitute);
  const junk = control(monster({
    uid: 'junk-lock-source',
    id: '63977008',
    level: 3,
    type: 'Tuner Effect Monster'
  }), 'player');
  game.field.setMonsterZone('player', 0, junk);
  assert.ok(await game.buildJunkSynchronSummonTrigger(junk, 'player', 0));
  game.field.sendToBanished(target, 'player');
  await withImmediateTimers(() => game.resolveChainStack());
  assert.equal(game.getMonsterEntries('player').length, 1);
  assert.ok(game.playerGraveyard.includes(substitute));
  assert.ok(game.playerBanished.includes(target));
});

test('a Stardust other than the attacker can negate Mirror Force and combat continues', async () => {
  let responded = false;
  const game = new DuelGame({
    onDecision: request => (
      request.effect === 'mirror-force' ? true : undefined
    ),
    onChainOpportunity: ({ candidates }) => {
      const candidate = candidates.find(card => card.id === '44508094');
      if (!responded && candidate) {
        responded = true;
        return candidate.cardUid;
      }
      return null;
    }
  });
  prepareBattle(game);
  const attacker = control(monster({ uid: 'mirror-attacker', atk: 1800 }), 'player');
  const stardust = control(monster({
    uid: 'mirror-stardust',
    id: '44508094',
    atk: 2500,
    level: 8,
    type: 'Synchro Effect Monster',
    extra_type: 'synchro'
  }), 'player');
  const mirror = control(spell({
    uid: 'mirror-force-test',
    id: '44095762',
    name: 'Force de Miroir',
    type: 'Trap Card',
    card_type: 'trap'
  }), 'opponent');
  mirror.isSetFaceDown = true;
  mirror.turnSet = 1;
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('player', 1, stardust);
  game.field.setSpellZone('opponent', 0, mirror);

  await withImmediateTimers(() => game.executeAttack(0, null));
  assert.equal(game.opponentLP, 6200);
  assert.equal(game.playerMonsters[0], attacker);
  assert.ok(game.playerGraveyard.includes(stardust));
  assert.ok(game.opponentGraveyard.includes(mirror));
});

test('if the attacking Stardust Tributes itself to negate Mirror Force, the attack stops', async () => {
  const game = new DuelGame({
    onDecision: request => (
      request.effect === 'mirror-force' ? true : undefined
    ),
    onChainOpportunity: ({ candidates }) => (
      candidates.find(card => card.id === '44508094')?.cardUid || null
    )
  });
  prepareBattle(game);
  const stardust = control(monster({
    uid: 'attacking-stardust',
    id: '44508094',
    atk: 2500,
    level: 8,
    type: 'Synchro Effect Monster',
    extra_type: 'synchro'
  }), 'player');
  const mirror = control(spell({
    uid: 'mirror-attacking-stardust',
    id: '44095762',
    type: 'Trap Card',
    card_type: 'trap'
  }), 'opponent');
  mirror.isSetFaceDown = true;
  mirror.turnSet = 1;
  game.field.setMonsterZone('player', 0, stardust);
  game.field.setSpellZone('opponent', 0, mirror);

  await withImmediateTimers(() => game.executeAttack(0, null));
  assert.equal(game.opponentLP, 8000);
  assert.equal(game.playerMonsters[0], null);
  assert.ok(game.playerGraveyard.includes(stardust));
});

test('Utopia may respond from the attacking side and detaches the explicitly chosen material', async () => {
  const secondMaterial = control(monster({ uid: 'utopia-selected-material' }), 'player');
  const game = new DuelGame({
    onDecision: request => {
      if (request.effect === 'utopia-negate-attack') return request.side === 'player';
      if (request.type === 'select-utopia-material') return secondMaterial.uid;
      return undefined;
    }
  });
  prepareBattle(game);
  const utopia = control(monster({
    uid: 'attacking-utopia',
    id: '84013237',
    atk: 2500,
    level: 0,
    type: 'Xyz Effect Monster',
    extra_type: 'xyz',
    rank: 4
  }), 'player');
  const firstMaterial = control(monster({ uid: 'utopia-first-material' }), 'player');
  game.summons.attachXyzMaterials(utopia, [firstMaterial, secondMaterial]);
  const defender = control(monster({ uid: 'utopia-defender', atk: 1000 }), 'opponent');
  game.field.setMonsterZone('player', 0, utopia);
  game.field.setMonsterZone('opponent', 0, defender);

  await withImmediateTimers(() => game.executeAttack(0, 0));
  assert.deepEqual(utopia.xyzMaterials, [firstMaterial]);
  assert.ok(game.playerGraveyard.includes(secondMaterial));
  assert.equal(game.opponentMonsters[0], defender);
  assert.equal(game.opponentLP, 8000);
});

test('a material-less Utopia targeted for attack resolves its mandatory effect, then immediately cancels the replay fallback', async () => {
  const game = new DuelGame();
  prepareBattle(game);
  const attacker = control(monster({ uid: 'replay-attacker', atk: 3000 }), 'player');
  const utopia = control(monster({
    uid: 'empty-utopia',
    id: '84013237',
    atk: 2500,
    level: 0,
    type: 'Xyz Effect Monster',
    extra_type: 'xyz',
    rank: 4
  }), 'opponent');
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, utopia);

  const result = await withImmediateTimers(() => game.executeAttack(0, 0));
  assert.equal(result.replayRequired, true);
  assert.equal(result.replayCancelled, true);
  assert.equal(game.opponentMonsters[0], null);
  assert.ok(game.opponentGraveyard.includes(utopia));
  assert.equal(game.hasMonsterAttacked(0), true);
});

test('Monster Reborn locks its activation target and never retargets after that instance moves', async () => {
  const first = control(monster({ uid: 'reborn-locked', atk: 3000 }), 'player', 'graveyard');
  const second = control(monster({ uid: 'reborn-substitute', atk: 2500 }), 'player', 'graveyard');
  let moved = false;
  const game = new DuelGame({
    onDecision: request => (
      request.type === 'select-monster-reborn-target' ? first.uid : undefined
    ),
    onChainOpportunity: () => {
      if (!moved) {
        moved = true;
        game.field.sendToBanished(first, 'player');
      }
      return null;
    }
  });
  prepareMain(game);
  const reborn = control(spell({
    uid: 'reborn-lock-spell',
    id: '83764718',
    name: 'Monster Reborn'
  }), 'player', 'hand');
  game.playerHand.push(reborn);
  game.playerGraveyard.push(first, second);

  await withImmediateTimers(() => game.playSpellTrap(reborn.uid, 0));
  assert.equal(game.getMonsterEntries('player').length, 0);
  assert.ok(game.playerBanished.includes(first));
  assert.ok(game.playerGraveyard.includes(second));
});

test('Time Wizard failure uses current face-up ATK only for monsters actually destroyed', async () => {
  const game = new DuelGame({
    onDecision: request => (
      request.type === 'coin-call'
        ? { call: 'heads', result: 'tails' }
        : undefined
    )
  });
  prepareMain(game);
  const wizard = control(monster({
    uid: 'time-current',
    id: '71625222',
    atk: 500,
    level: 2
  }), 'player');
  const faceUp = control(monster({ uid: 'time-face-up', atk: 2000 }), 'player');
  const faceDown = control(monster({ uid: 'time-face-down', atk: 2400 }), 'player');
  game.field.setMonsterZone('player', 0, wizard);
  game.field.setMonsterZone('player', 1, faceUp);
  game.field.setMonsterZone('player', 2, faceDown);
  faceUp.currentAtk = 1000;
  faceDown.isSetFaceDown = true;

  await withImmediateTimers(() => game.activateMonsterEffect(0, 'player'));
  assert.equal(game.playerLP, 7250);
  assert.equal(game.getMonsterEntries('player').length, 0);
});

test('Kuriboh cannot prevent damage caused while its controller is the attacking side', async () => {
  const game = new DuelGame({
    onDecision: request => (
      request.effect === 'kuriboh-prevent-battle-damage' ? true : undefined
    )
  });
  prepareBattle(game);
  const attacker = control(monster({ uid: 'own-weak-attacker', atk: 1000 }), 'player');
  const defender = control(monster({ uid: 'strong-defender', atk: 2000 }), 'opponent');
  const kuriboh = control(monster({
    uid: 'own-attack-kuriboh',
    id: '40640057',
    atk: 300,
    level: 1
  }), 'player', 'hand');
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, defender);
  game.playerHand.push(kuriboh);

  await withImmediateTimers(() => game.executeAttack(0, 0));
  assert.equal(game.playerLP, 7000);
  assert.ok(game.playerHand.includes(kuriboh));
});

test('Arcanite can pay a Spell Counter from any controlled field card and target the Field Zone', async () => {
  const game = new DuelGame({
    onDecision: request => {
      if (request.type === 'select-arcanite-counter-source') return 'counter-host';
      if (request.type === 'select-arcanite-target') return 'field-target';
      return undefined;
    }
  });
  prepareMain(game);
  const arcanite = control(monster({
    uid: 'arcanite-any-counter',
    id: '31924889',
    atk: 400,
    level: 7,
    type: 'Synchro Effect Monster',
    extra_type: 'synchro'
  }), 'player');
  const counterHost = control(spell({ uid: 'counter-host' }), 'player');
  const fieldTarget = control(spell({ uid: 'field-target' }), 'opponent');
  game.field.setMonsterZone('player', 0, arcanite);
  game.field.setSpellZone('player', 1, counterHost);
  game.field.placeFieldSpell('opponent', fieldTarget);
  counterHost.addCounter('spell', 1);

  assert.equal(await withImmediateTimers(
    () => game.activateMonsterEffect(0, 'player')
  ), true);
  assert.equal(counterHost.counters.spell, 0);
  assert.equal(game.opponentFieldSpell, null);
  assert.ok(game.opponentGraveyard.includes(fieldTarget));
});

test('Tribute Summon projects a full Main Zone transaction and can use the occupied destination', async () => {
  const game = new DuelGame();
  prepareMain(game);
  const occupants = Array.from({ length: 5 }, (_, index) => control(monster({
    uid: `full-main-${index}`,
    atk: 500 + index
  }), 'player'));
  occupants.forEach((card, index) => game.field.setMonsterZone('player', index, card));
  const tributeMonster = control(monster({
    uid: 'full-main-tribute-summon',
    atk: 2400,
    level: 6
  }), 'player', 'hand');
  game.playerHand.push(tributeMonster);

  assert.equal(await game.summonMonster(tributeMonster.uid, 2), true);
  assert.equal(await withImmediateTimers(() => game.selectSummonTribute(2)), true);
  assert.equal(game.playerMonsters[2], tributeMonster);
  assert.equal(game.playerMonsters.filter(Boolean).length, 5);
  assert.ok(game.playerGraveyard.includes(occupants[2]));
  assert.equal(game.summons.normalSummonAllowance.used, 1);
});

test('an EMZ-only Tribute does not free a full Main Zone and cancellation stays transactional', async () => {
  const game = new DuelGame();
  prepareMain(game);
  const occupants = Array.from({ length: 5 }, (_, index) => control(monster({
    uid: `emz-full-main-${index}`
  }), 'player'));
  occupants.forEach((card, index) => game.field.setMonsterZone('player', index, card));
  const emz = control(monster({ uid: 'emz-only-tribute' }), 'player');
  game.field.setExtraMonsterZone(0, 'player', emz);
  const tributeMonster = control(monster({
    uid: 'emz-blocked-summon',
    level: 6
  }), 'player', 'hand');
  game.playerHand.push(tributeMonster);

  assert.equal(await game.summonMonster(tributeMonster.uid, 2), true);
  assert.equal(await withImmediateTimers(
    () => game.selectSummonTribute('extra:0')
  ), false);
  assert.equal(game.playerMonsters[2], occupants[2]);
  assert.equal(game.field.getExtraMonsterZone(0).card, emz);
  assert.ok(game.playerHand.includes(tributeMonster));
  assert.deepEqual(game.playerGraveyard, []);
  game.cancelSummonTribute();
  assert.equal(game.pendingSummon, null);
});

test('AI skips the Battle Phase on turn 1 and its effect loop is bounded', async () => {
  const game = new DuelGame();
  prepareMain(game, 'opponent');
  game.phases.turnCount = 1;
  await withImmediateTimers(() => game.runAIMainPhase());
  assert.equal(game.currentPhase, 'end');

  const effectGame = new DuelGame({
    onDecision: request => (
      request.type === 'coin-call'
        ? { call: 'heads', result: 'heads' }
        : undefined
    )
  });
  prepareMain(effectGame, 'opponent');
  const wizard = control(monster({
    uid: 'ai-time-wizard',
    id: '71625222',
    atk: 500,
    level: 2
  }), 'opponent');
  const victim = control(monster({ uid: 'ai-time-victim' }), 'player');
  effectGame.field.setMonsterZone('opponent', 0, wizard);
  effectGame.field.setMonsterZone('player', 0, victim);
  const actions = await withImmediateTimers(() => effectGame.tryAIMonsterEffects(4));
  assert.equal(actions, 1);
  assert.equal(effectGame.playerMonsters[0], null);
  assert.equal(wizard.effectUsage.timeWizardTurn, 2);
});

test('AI can activate Arcanite repeatedly while counters and targets remain, within its action bound', async () => {
  const game = new DuelGame();
  prepareMain(game, 'opponent');
  const arcanite = control(monster({
    uid: 'ai-repeat-arcanite',
    id: '31924889',
    atk: 400,
    def: 1800,
    level: 7,
    type: 'Synchro Effect Monster',
    extra_type: 'synchro'
  }), 'opponent');
  game.field.setMonsterZone('opponent', 0, arcanite);
  arcanite.counters.spell = 3;

  const targets = Array.from({ length: 3 }, (_, index) => control(monster({
    uid: `ai-arcanite-target-${index}`,
    atk: 1000 + (index * 100)
  }), 'player'));
  targets.forEach((card, index) => game.field.setMonsterZone('player', index, card));

  const firstPass = await withImmediateTimers(
    () => game.tryAIMonsterEffects(2)
  );
  assert.equal(firstPass, 2);
  assert.equal(arcanite.counters.spell, 1);
  assert.equal(game.playerMonsters.filter(Boolean).length, 1);

  const secondPass = await withImmediateTimers(
    () => game.tryAIMonsterEffects(4)
  );
  assert.equal(secondPass, 1);
  assert.equal(arcanite.counters.spell, 0);
  assert.equal(game.playerMonsters.filter(Boolean).length, 0);
});

test('AI can establish Pendulum Scales, Pendulum Summon, and Tribute Summon on a full field', async () => {
  const pendulumGame = new DuelGame();
  prepareMain(pendulumGame, 'opponent');
  const lowScale = control(monster({
    uid: 'ai-low-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1,
    level: 3
  }), 'opponent', 'hand');
  const highScale = control(monster({
    uid: 'ai-high-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 8,
    level: 3
  }), 'opponent', 'hand');
  const summonCandidate = control(monster({
    uid: 'ai-pendulum-candidate',
    level: 4
  }), 'opponent', 'hand');
  pendulumGame.opponentHand.push(lowScale, highScale, summonCandidate);
  assert.equal(await withImmediateTimers(
    () => pendulumGame.tryAIPendulumActions(pendulumGame.getAIDecisionProfile('normal'))
  ), true);
  assert.equal(pendulumGame.opponentSpells[0]?.isPendulumScale, true);
  assert.equal(pendulumGame.opponentSpells[4]?.isPendulumScale, true);
  assert.ok(pendulumGame.getMonsterEntries('opponent')
    .some(entry => entry.card === summonCandidate));

  const tributeGame = new DuelGame();
  prepareMain(tributeGame, 'opponent');
  const occupants = Array.from({ length: 5 }, (_, index) => control(monster({
    uid: `ai-full-${index}`,
    atk: 400 + index
  }), 'opponent'));
  occupants.forEach((card, index) => tributeGame.field.setMonsterZone('opponent', index, card));
  const tributeMonster = control(monster({
    uid: 'ai-full-tribute',
    atk: 2400,
    level: 6
  }), 'opponent', 'hand');
  tributeGame.opponentHand.push(tributeMonster);
  assert.equal(await withImmediateTimers(
    () => tributeGame.tryAINormalSummon(tributeGame.getAIDecisionProfile('hard'))
  ), true);
  assert.ok(tributeGame.opponentMonsters.includes(tributeMonster));
  assert.equal(tributeGame.opponentMonsters.filter(Boolean).length, 5);
  assert.equal(tributeGame.opponentGraveyard.length, 1);
});

test('endGame exposes a stable reason and malformed card choices use the legal fallback', () => {
  let result = null;
  const game = new DuelGame({
    onGameOver: (winner, reason) => {
      result = { winner, reason };
    },
    onDecision: () => true
  });
  game.playerDeck = [];
  game.drawCard('player');
  assert.deepEqual(result, { winner: 'opponent', reason: 'deck_out' });
  assert.equal(game.endReason, 'deck_out');

  const choiceGame = new DuelGame({ onDecision: () => true });
  const first = monster({ uid: 'invalid-choice-first' });
  const fallback = monster({ uid: 'invalid-choice-fallback' });
  return choiceGame.chooseCard(
    'compatibility-choice',
    'player',
    [first, fallback],
    () => fallback
  ).then(choice => {
    assert.equal(choice, fallback);
  });
});

test('official-facing metadata identifies Effect Monsters and implemented timing precisely', () => {
  const byId = id => (
    [...STARTER_CARDS, ...EXTRA_DECK_CARDS]
      .find(card => String(card.id) === id)
  );
  assert.equal(byId('38033121').name, 'Magicienne des Ténèbres');
  assert.match(byId('38033121').rulesText, /Magicien du Chaos Sombre/);
  assert.match(byId('40640057').rulesText, /Durant le calcul des dommages/);
  assert.match(byId('40640057').rulesText, /\(Effet Rapide\)/);
  assert.equal(byId('40640057').timing.event, 'DAMAGE_CALCULATION');
  assert.equal(byId('40640057').timing.spellSpeed, 2);
  assert.match(byId('71625222').rulesText, /ATK.*face recto/);
  assert.match(byId('63977008').type, /Effect/);
  assert.equal(byId('63977008').timing.event, 'SUMMON_SUCCESS');
  assert.match(byId('44508094').type, /Synchro Effect/);
  assert.match(byId('44508094').rulesText, /activé ce tour et n'a pas été annulé/);
  assert.match(byId('44508094').rulesText, /Invoquer Spécialement.*depuis votre Cimetière/);
  assert.match(byId('31924889').type, /Synchro Effect/);
  assert.match(byId('31924889').rulesText, /d'une carte que vous contrôlez/);
  assert.equal(byId('84013237').timing.event, 'ATTACK_DECLARED');
});
