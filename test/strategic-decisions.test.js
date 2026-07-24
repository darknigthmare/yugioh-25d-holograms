import test from 'node:test';
import assert from 'node:assert/strict';

import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { getStrictCardRegistration } from '../src/core/StrictCardRegistry.js';

function monster({
  uid,
  id = uid,
  name = uid,
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
    atk: 1500,
    def: 1200,
    level,
    extra_type,
    isEffectMonster: /Effect/i.test(type),
    belongsInExtraDeck: Boolean(extra_type),
    ...overrides
  });
}

function spell({ uid, id, name, type = 'Spell Card', ...overrides }) {
  return new CardState({
    uid,
    id,
    name,
    name_en: name,
    card_type: 'spell',
    type,
    desc: '',
    ...overrides
  });
}

function control(card, side = 'player', location = null) {
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

function ritualCards(prefix) {
  const target = control(monster({
    uid: `${prefix}-target`,
    id: '05405694',
    type: 'Ritual Monster',
    isRitualMonster: true,
    level: 8
  }), 'player', 'hand');
  const first = control(monster({
    uid: `${prefix}-first`,
    level: 8
  }), 'player', 'hand');
  const second = control(monster({
    uid: `${prefix}-second`,
    level: 8
  }), 'player', 'hand');
  const ritualSpell = control(spell({
    uid: `${prefix}-spell`,
    id: '55761792',
    name: 'Black Luster Ritual',
    type: 'Ritual Spell Card',
    isRitualSpell: true,
    ritualMonsterIds: ['05405694'],
    requiredRitualLevel: 8
  }), 'player');
  return { target, first, second, ritualSpell };
}

function extraTarget(prefix, extraType) {
  const definitions = {
    xyz: {
      type: 'Xyz Effect Monster',
      level: 0,
      rank: 4,
      xyzMaterialCount: 2
    },
    link: {
      type: 'Link Effect Monster',
      level: 0,
      linkRating: 2,
      minimumMaterialCount: 2,
      maximumMaterialCount: 2,
      requiresEffectMonsters: false,
      linkArrows: ['bottom-left', 'bottom-right']
    }
  };
  return control(monster({
    uid: `${prefix}-${extraType}`,
    extra_type: extraType,
    ...definitions[extraType]
  }), 'player', 'extra_deck');
}

function installScales(game, prefix) {
  const left = control(monster({
    uid: `${prefix}-left`,
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  }), 'player');
  const right = control(monster({
    uid: `${prefix}-right`,
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 8
  }), 'player');
  game.field.setSpellZone('player', 0, left);
  left.location = 'pendulum_zone';
  left.isPendulumScale = true;
  game.field.setSpellZone('player', 4, right);
  right.location = 'pendulum_zone';
  right.isPendulumScale = true;
  return { left, right };
}

test('strict registry accepts normalized local IDs and rejects unsupported API cards', () => {
  const game = new DuelGame();
  const leadingZero = new CardState({
    id: '05053103',
    name: 'Battle Ox',
    card_type: 'monster',
    type: 'Normal Monster',
    level: 4
  });
  const unknownSpell = new CardState({
    id: '99999999',
    name: 'Unknown API Spell',
    card_type: 'spell',
    type: 'Spell Card'
  });
  const explicitlyUnsupported = new CardState({
    id: '83764718',
    name: 'Monster Reborn API copy',
    card_type: 'spell',
    type: 'Spell Card',
    supportedInStrict: false
  });

  assert.equal(getStrictCardRegistration('05053103')?.procedure, 'normal');
  assert.equal(game.isStrictlySupportedMainDeckCard(leadingZero), true);
  assert.equal(game.isStrictlySupportedMainDeckCard(unknownSpell), false);
  assert.equal(game.isStrictlySupportedMainDeckCard(explicitlyUnsupported), false);
  assert.equal(game.addCardToHand(unknownSpell), null);
});

test('null explicitly cancels a decision while undefined uses its deterministic fallback', async () => {
  const cancelled = new DuelGame({ onDecision: () => null });
  const unhandled = new DuelGame({ onDecision: () => undefined });
  assert.equal(await cancelled.requestDecision({ type: 'probe' }, 'fallback'), null);
  assert.equal(await unhandled.requestDecision({ type: 'probe' }, 'fallback'), 'fallback');
});

test('Fusion honors a non-first material combination and destination', async () => {
  let selectedUids = [];
  const game = new DuelGame({
    onDecision: request => {
      if (request.type === 'select-fusion-materials') {
        selectedUids = request.choices[1].value;
        return selectedUids;
      }
      if (request.type === 'select-summon-position') return 'defense';
      if (request.type === 'select-summon-destination') {
        return request.choices.at(-1).value;
      }
      return undefined;
    }
  });
  const first = control(monster({ uid: 'fusion-first', id: 'fusion-a' }), 'player', 'hand');
  const second = control(monster({ uid: 'fusion-second', id: 'fusion-a' }), 'player', 'hand');
  const required = control(monster({ uid: 'fusion-required', id: 'fusion-b' }), 'player', 'hand');
  const fusion = control(monster({
    uid: 'fusion-target',
    extra_type: 'fusion',
    type: 'Fusion Effect Monster',
    fusionMaterials: ['fusion-a', 'fusion-b']
  }), 'player', 'extra_deck');
  game.playerHand = [first, second, required];
  game.playerExtraDeck = [fusion];

  assert.equal(await game.performFusionSummon('player', fusion.uid), true);
  assert.deepEqual(selectedUids.sort(), [second.uid, required.uid].sort());
  assert.deepEqual(game.playerHand, [first]);
  assert.equal(game.field.getExtraMonsterZone(1)?.card, fusion);
  assert.equal(fusion.position, 'defense');
});

test('Fusion rolls back when a selected material changes after an awaited choice', async () => {
  let game;
  let selectedUids = [];
  game = new DuelGame({
    onDecision: request => {
      if (request.type === 'select-fusion-materials') {
        selectedUids = request.choices[1].value;
        return selectedUids;
      }
      if (request.type === 'select-summon-position') return 'attack';
      if (request.type === 'select-summon-destination') {
        const removed = game.playerHand.find(card => card.uid === selectedUids[0]);
        game.playerHand.splice(game.playerHand.indexOf(removed), 1);
        return request.choices[0].value;
      }
      return undefined;
    }
  });
  const cards = [
    control(monster({ uid: 'fusion-rb-a1', id: 'fusion-rb-a' }), 'player', 'hand'),
    control(monster({ uid: 'fusion-rb-a2', id: 'fusion-rb-a' }), 'player', 'hand'),
    control(monster({ uid: 'fusion-rb-b', id: 'fusion-rb-b' }), 'player', 'hand')
  ];
  const fusion = control(monster({
    uid: 'fusion-rb-target',
    extra_type: 'fusion',
    type: 'Fusion Effect Monster',
    fusionMaterials: ['fusion-rb-a', 'fusion-rb-b']
  }), 'player', 'extra_deck');
  game.playerHand = cards;
  game.playerExtraDeck = [fusion];

  assert.equal(await game.performFusionSummon('player', fusion.uid), false);
  assert.ok(game.playerExtraDeck.includes(fusion));
  assert.deepEqual(game.playerGraveyard, []);
  assert.ok(game.playerHand.some(card => selectedUids.includes(card.uid)));
});

test('Ritual honors a non-first Tribute and exact non-first Main Zone', async () => {
  const game = new DuelGame({
    onDecision: request => {
      if (request.type === 'select-ritual-materials') return request.choices[1].value;
      if (request.type === 'select-summon-position') return 'defense';
      if (request.type === 'select-summon-destination') return 'main:4';
      return undefined;
    }
  });
  const { target, first, second, ritualSpell } = ritualCards('ritual-choice');
  game.playerHand = [target, first, second];

  assert.equal(await game.performRitualSummon('player', ritualSpell), true);
  assert.ok(game.playerHand.includes(first));
  assert.ok(game.playerGraveyard.includes(second));
  assert.equal(game.playerMonsters[4], target);
});

test('Ritual rolls back when its chosen destination is occupied during the decision', async () => {
  let game;
  const blocker = control(monster({ uid: 'ritual-rb-blocker' }), 'player');
  game = new DuelGame({
    onDecision: request => {
      if (request.type === 'select-ritual-materials') return request.choices[1].value;
      if (request.type === 'select-summon-position') return 'attack';
      if (request.type === 'select-summon-destination') {
        game.field.setMonsterZone('player', 4, blocker);
        return 'main:4';
      }
      return undefined;
    }
  });
  const { target, first, second, ritualSpell } = ritualCards('ritual-rb');
  game.playerHand = [target, first, second];

  assert.equal(await game.performRitualSummon('player', ritualSpell), false);
  assert.deepEqual(game.playerHand, [target, first, second]);
  assert.deepEqual(game.playerGraveyard, []);
  assert.ok(game.playerExtraDeck.every(card => card !== target));
});

for (const summonType of ['xyz', 'link']) {
  test(`${summonType.toUpperCase()} honors a non-first material pair and destination`, async () => {
    let chosenUids = [];
    const game = new DuelGame({
      onDecision: request => {
        if (request.type === `select-${summonType}-materials`) {
          chosenUids = request.choices[1].value;
          return chosenUids;
        }
        if (request.type === 'select-summon-position') return 'defense';
        if (request.type === 'select-summon-destination') {
          return request.choices.find(choice => choice.value === 'extra:1')?.value;
        }
        return undefined;
      }
    });
    const materials = ['a', 'b', 'c'].map(suffix => control(monster({
      uid: `${summonType}-choice-${suffix}`,
      level: 4
    }), 'player'));
    materials.forEach((card, index) => game.field.setMonsterZone('player', index, card));
    const target = extraTarget(`${summonType}-choice`, summonType);
    game.playerExtraDeck = [target];

    const summoned = summonType === 'xyz'
      ? await game.performXyzSummon('player', target.uid)
      : await game.performLinkSummon('player', target.uid);
    assert.equal(summoned, true);
    assert.equal(game.field.getExtraMonsterZone(1)?.card, target);
    const remaining = materials.find(card => !chosenUids.includes(card.uid));
    assert.ok(game.playerMonsters.includes(remaining));
    if (summonType === 'xyz') {
      assert.deepEqual(
        target.xyzMaterials.map(card => card.uid).sort(),
        [...chosenUids].sort()
      );
      assert.equal(target.position, 'defense');
    } else {
      assert.equal(target.position, 'attack');
    }
  });

  test(`${summonType.toUpperCase()} rolls back when its chosen zone changes after await`, async () => {
    let game;
    const blocker = control(monster({ uid: `${summonType}-rb-blocker` }), 'player');
    game = new DuelGame({
      onDecision: request => {
        if (request.type === `select-${summonType}-materials`) {
          return request.choices[1].value;
        }
        if (request.type === 'select-summon-position') return 'attack';
        if (request.type === 'select-summon-destination') {
          game.field.setExtraMonsterZone(1, 'player', blocker);
          return 'extra:1';
        }
        return undefined;
      }
    });
    const materials = ['a', 'b', 'c'].map(suffix => control(monster({
      uid: `${summonType}-rb-${suffix}`,
      level: 4
    }), 'player'));
    materials.forEach((card, index) => game.field.setMonsterZone('player', index, card));
    const target = extraTarget(`${summonType}-rb`, summonType);
    game.playerExtraDeck = [target];

    const summoned = summonType === 'xyz'
      ? await game.performXyzSummon('player', target.uid)
      : await game.performLinkSummon('player', target.uid);
    assert.equal(summoned, false);
    assert.ok(materials.every(card => game.playerMonsters.includes(card)));
    assert.ok(game.playerExtraDeck.includes(target));
    assert.deepEqual(game.playerGraveyard, []);
  });
}

test('a Pendulum Scale is inactive while its Spell activation is building, then active on resolution', async () => {
  let observedPending = false;
  let game;
  game = new DuelGame({
    onChainOpportunity: request => {
      observedPending ||= (
        request.lastLink?.context?.activationType === 'pendulum-scale'
        && game.playerSpells[0]?.location === 'spell_zone'
        && game.playerSpells[0]?.isPendulumScale === false
        && game.getPendulumScales('player') === null
      );
      return null;
    }
  });
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  const right = installScales(game, 'chain-scale').right;
  game.field.setSpellZone('player', 0, null);
  const left = control(monster({
    uid: 'chain-scale-left-hand',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  }), 'player', 'hand');
  game.playerHand = [left];

  assert.equal(await withImmediateTimers(
    () => game.activatePendulumScale(left.uid, 0, 'player')
  ), true);
  assert.equal(observedPending, true);
  assert.equal(left.location, 'pendulum_zone');
  assert.equal(left.isPendulumScale, true);
  assert.equal(game.getPendulumScales('player')?.right, right);
});

test('a negated Pendulum Spell activation goes to the Graveyard, not face-up Extra Deck', async () => {
  const game = new DuelGame({
    onChainOpportunity: request => {
      request.lastLink.activationNegated = true;
      return null;
    }
  });
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  const scale = control(monster({
    uid: 'negated-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  }), 'player', 'hand');
  game.playerHand = [scale];

  assert.equal(await withImmediateTimers(
    () => game.activatePendulumScale(scale.uid, 0, 'player')
  ), false);
  assert.ok(game.playerGraveyard.includes(scale));
  assert.equal(game.playerFaceUpExtraDeck.includes(scale), false);
  assert.equal(game.playerSpells[0], null);
});

test('grouped Pendulum assignments honor exact unique zones and roll back an occupied destination', async () => {
  const game = new DuelGame({
    onDecision: request => {
      if (request.type === 'select-summon-position') return 'attack';
      if (request.type === 'assign-pendulum-zones') {
        return request.items.map(item => ({
          cardUid: item.card.uid,
          zoneType: item.card.source === 'extra' ? 'extra' : 'main',
          zoneIndex: item.card.source === 'extra' ? 0 : 4
        }));
      }
      return undefined;
    }
  });
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  installScales(game, 'pendulum-choice');
  const fromHand = control(monster({
    uid: 'pendulum-choice-hand',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 3,
    level: 4
  }), 'player', 'hand');
  const fromExtra = control(monster({
    uid: 'pendulum-choice-extra',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 5,
    level: 5,
    isFaceUpInExtraDeck: true
  }), 'player', 'extra_deck');
  fromExtra.isFaceUpInExtraDeck = true;
  game.playerHand = [fromHand];
  game.playerFaceUpExtraDeck.push(fromExtra);

  assert.equal(await game.performPendulumSummon(
    'player',
    [fromHand.uid, fromExtra.uid]
  ), true);
  assert.equal(game.playerMonsters[4], fromHand);
  assert.equal(game.field.getExtraMonsterZone(0)?.card, fromExtra);

  let rollbackGame;
  const blocker = control(monster({ uid: 'pendulum-rb-blocker' }), 'player');
  rollbackGame = new DuelGame({
    onDecision: request => {
      if (request.type === 'select-summon-position') return 'attack';
      if (request.type === 'assign-pendulum-zones') {
        rollbackGame.field.setMonsterZone('player', 4, blocker);
        return [{
          cardUid: request.items[0].card.uid,
          zoneType: 'main',
          zoneIndex: 4
        }];
      }
      return undefined;
    }
  });
  rollbackGame.phases.currentTurnOwner = 'player';
  rollbackGame.phases.currentPhase = 'main1';
  installScales(rollbackGame, 'pendulum-rb');
  const candidate = control(monster({
    uid: 'pendulum-rb-hand',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 3,
    level: 4
  }), 'player', 'hand');
  rollbackGame.playerHand = [candidate];

  assert.equal(await rollbackGame.performPendulumSummon(
    'player',
    [candidate.uid]
  ), false);
  assert.deepEqual(rollbackGame.playerHand, [candidate]);
  assert.equal(rollbackGame.summons.pendulumSummonAllowance.used, 0);
});

test('cancelling a material decision never auto-selects the fallback combination', async () => {
  const game = new DuelGame({
    onDecision: request => (
      request.type === 'select-fusion-materials' ? null : undefined
    )
  });
  const first = control(monster({ uid: 'cancel-fusion-a', id: 'cancel-a' }), 'player', 'hand');
  const second = control(monster({ uid: 'cancel-fusion-b', id: 'cancel-b' }), 'player', 'hand');
  const fusion = control(monster({
    uid: 'cancel-fusion-target',
    extra_type: 'fusion',
    type: 'Fusion Effect Monster',
    fusionMaterials: ['cancel-a', 'cancel-b']
  }), 'player', 'extra_deck');
  game.playerHand = [first, second];
  game.playerExtraDeck = [fusion];

  assert.equal(await game.performFusionSummon('player', fusion.uid), false);
  assert.deepEqual(game.playerHand, [first, second]);
  assert.deepEqual(game.playerGraveyard, []);
  assert.deepEqual(game.playerExtraDeck, [fusion]);
});

test('Synchro honors an exact destination and rolls back if it becomes occupied', async () => {
  const prepare = (prefix, onDestination) => {
    const game = new DuelGame({
      onDecision: request => {
        if (request.type === 'select-summon-position') return 'defense';
        if (request.type === 'select-summon-destination') {
          return onDestination(game, request);
        }
        return undefined;
      }
    });
    game.phases.currentTurnOwner = 'player';
    game.phases.currentPhase = 'main1';
    const tuner = control(monster({
      uid: `${prefix}-tuner`,
      type: 'Tuner Effect Monster',
      level: 3
    }), 'player');
    const nonTuner = control(monster({
      uid: `${prefix}-non-tuner`,
      level: 4
    }), 'player');
    const synchro = control(monster({
      uid: `${prefix}-synchro`,
      type: 'Synchro Effect Monster',
      extra_type: 'synchro',
      level: 7
    }), 'player', 'extra_deck');
    game.field.setMonsterZone('player', 0, tuner);
    game.field.setMonsterZone('player', 1, nonTuner);
    game.playerExtraDeck = [synchro];
    return { game, tuner, nonTuner, synchro };
  };

  const exact = prepare('synchro-choice', () => 'main:4');
  await withImmediateTimers(async () => {
    assert.equal(await exact.game.summonExtraDeck(exact.synchro.uid), true);
    await exact.game.selectSynchroMaterial(0);
    await exact.game.selectSynchroMaterial(1);
  });
  assert.equal(exact.game.playerMonsters[4], exact.synchro);
  assert.equal(exact.synchro.position, 'defense');

  const blocker = control(monster({ uid: 'synchro-rb-blocker' }), 'player');
  const rollback = prepare('synchro-rb', game => {
    game.field.setMonsterZone('player', 4, blocker);
    return 'main:4';
  });
  await withImmediateTimers(async () => {
    assert.equal(await rollback.game.summonExtraDeck(rollback.synchro.uid), true);
    await rollback.game.selectSynchroMaterial(0);
    await rollback.game.selectSynchroMaterial(1);
  });
  assert.equal(rollback.game.playerMonsters[0], rollback.tuner);
  assert.equal(rollback.game.playerMonsters[1], rollback.nonTuner);
  assert.ok(rollback.game.playerExtraDeck.includes(rollback.synchro));
  assert.deepEqual(rollback.game.playerGraveyard, []);
});

test('Reborn, Junk Synchron, Stardust, and Stargazer honor the exact chosen Main Zone', async () => {
  const rebornTarget = control(monster({
    uid: 'zone-reborn-target'
  }), 'player', 'graveyard');
  const rebornGame = new DuelGame({
    onDecision: request => {
      if (request.type === 'select-monster-reborn-target') return rebornTarget.uid;
      if (request.type === 'select-summon-position') return 'defense';
      if (request.type === 'select-summon-destination') return 'main:4';
      return undefined;
    }
  });
  rebornGame.playerGraveyard.push(rebornTarget);
  const reborn = control(spell({
    uid: 'zone-reborn-spell',
    id: '83764718',
    name: 'Monster Reborn'
  }), 'player');
  rebornGame.field.setSpellZone('player', 0, reborn);
  await withImmediateTimers(
    () => rebornGame.executeSpellTrapResolution(reborn, 'player', 0)
  );
  assert.equal(rebornGame.playerMonsters[4], rebornTarget);

  const junkTarget = control(monster({
    uid: 'zone-junk-target',
    level: 2
  }), 'player', 'graveyard');
  const junk = control(monster({
    uid: 'zone-junk',
    id: '63977008',
    type: 'Tuner Effect Monster',
    level: 3
  }), 'player', 'hand');
  const junkGame = new DuelGame({
    onDecision: request => {
      if (request.type === 'activate-monster-effect') return true;
      if (request.type === 'select-junk-synchron-target') return junkTarget.uid;
      if (request.type === 'select-summon-destination') return 'main:4';
      return undefined;
    }
  });
  junkGame.phases.currentTurnOwner = 'player';
  junkGame.phases.currentPhase = 'main1';
  junkGame.playerHand = [junk];
  junkGame.playerGraveyard.push(junkTarget);
  await withImmediateTimers(() => junkGame.summonMonster(junk.uid, 0));
  assert.equal(junkGame.playerMonsters[4], junkTarget);

  const stardust = control(monster({
    uid: 'zone-stardust',
    id: '44508094',
    type: 'Synchro Effect Monster',
    extra_type: 'synchro',
    level: 8
  }), 'player', 'graveyard');
  const stardustGame = new DuelGame({
    onDecision: request => {
      if (request.type === 'activate-graveyard-effect') return true;
      if (request.type === 'select-summon-position') return 'defense';
      if (request.type === 'select-summon-destination') return 'main:4';
      return undefined;
    }
  });
  stardustGame.phases.turnCount = 4;
  stardust.stardustReturnEligibleTurn = 4;
  stardust.stardustReturnController = 'player';
  stardustGame.playerGraveyard.push(stardust);
  assert.equal(await stardustGame.processEndPhaseEffects(), 1);
  assert.equal(stardustGame.playerMonsters[4], stardust);

  const stargazer = control(monster({
    uid: 'zone-stargazer',
    id: '94415058',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true
  }), 'player');
  const returned = control(monster({
    uid: 'zone-returned',
    id: 'zone-pendulum-id',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true
  }), 'player', 'hand');
  const copy = control(monster({
    uid: 'zone-copy',
    id: 'zone-pendulum-id',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true
  }), 'player', 'hand');
  const stargazerGame = new DuelGame({
    onDecision: request => {
      if (request.type === 'activate-monster-effect') return true;
      if (request.type === 'select-stargazer-summon') return copy.uid;
      if (request.type === 'select-summon-position') return 'defense';
      if (request.type === 'select-summon-destination') return 'main:4';
      return undefined;
    }
  });
  stargazerGame.field.setMonsterZone('player', 0, stargazer);
  stargazerGame.playerHand = [returned, copy];
  assert.equal(await stargazerGame.resolveStargazerReturnedCardTrigger(
    'player',
    [returned],
    { sourceSide: 'opponent' }
  ), true);
  assert.equal(stargazerGame.playerMonsters[4], copy);
});
