import test from 'node:test';
import assert from 'node:assert/strict';

import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import {
  findMonsterZoneElement,
  syncExtraMonsterZones
} from '../src/board.js';

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
  const card = new CardState({
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
    isEffectMonster: /Effect/i.test(type),
    belongsInExtraDeck: Boolean(extra_type),
    ...overrides
  });
  return card;
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

function control(card, side) {
  card.ownerId = side;
  card.controllerId = side;
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

function prepareBattle(game, side = 'player') {
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'battle';
  game.phases.turnCount = 2;
  game.startPhaseFlow = () => {};
}

test('shared Extra Monster Zones participate in unified lookup and removal', () => {
  const game = new DuelGame();
  const main = control(monster({ uid: 'main-monster' }), 'player');
  const extra = control(monster({
    uid: 'extra-monster',
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 1
  }), 'player');
  game.field.setMonsterZone('player', 2, main);
  game.field.setExtraMonsterZone(0, 'player', extra);

  assert.deepEqual(
    game.getMonsterEntries('player').map(entry => `${entry.zoneType}:${entry.zoneIndex}`),
    ['main:2', 'extra:0']
  );
  const entry = game.getMonsterEntry('player', 'extra:0');
  assert.equal(entry.card, extra);
  assert.equal(game.removeMonsterEntry('player', entry), true);
  assert.equal(game.field.getExtraMonsterZone(0), null);
});

test('Raigeki destroys opposing monsters in Main and Extra Monster Zones', async () => {
  const game = new DuelGame();
  const main = control(monster({ uid: 'raigeki-main' }), 'opponent');
  const extra = control(monster({
    uid: 'raigeki-extra',
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 2
  }), 'opponent');
  const raigeki = control(spell({
    uid: 'raigeki',
    id: '12580477',
    name: 'Raigeki'
  }), 'player');
  game.field.setMonsterZone('opponent', 0, main);
  game.field.setExtraMonsterZone(1, 'opponent', extra);
  game.field.setSpellZone('player', 0, raigeki);

  await withImmediateTimers(
    () => game.executeSpellTrapResolution(raigeki, 'player', 0)
  );

  assert.equal(game.opponentMonsters[0], null);
  assert.equal(game.field.getExtraMonsterZone(1), null);
  assert.ok(game.opponentGraveyard.includes(main));
  assert.ok(game.opponentGraveyard.includes(extra));
});

test('Mirror Force also destroys Attack Position monsters in an Extra Monster Zone', async () => {
  const game = new DuelGame();
  game.phases.turnCount = 2;
  const attacker = control(monster({
    uid: 'mirror-extra-attacker',
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 2
  }), 'opponent');
  const mirror = control(new CardState({
    uid: 'mirror-force',
    id: '44095762',
    name: 'Mirror Force',
    card_type: 'trap',
    type: 'Trap Card',
    desc: ''
  }), 'player');
  mirror.isSetFaceDown = true;
  mirror.turnSet = 1;
  game.field.setExtraMonsterZone(0, 'opponent', attacker);
  game.field.setSpellZone('player', 0, mirror);

  assert.equal(
    await withImmediateTimers(
      () => game.resolveMirrorForceOnAttack('player', { zoneType: 'extra', zoneIndex: 0 })
    ),
    true
  );
  assert.equal(game.field.getExtraMonsterZone(0), null);
  assert.ok(game.opponentGraveyard.includes(attacker));
});

test('an EMZ monster may attack an opposing EMZ monster and destroy it normally', async () => {
  const game = new DuelGame();
  prepareBattle(game);
  const attacker = control(monster({
    uid: 'player-emz-attacker',
    atk: 2500,
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 2
  }), 'player');
  const defender = control(monster({
    uid: 'opponent-emz-defender',
    atk: 1000,
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 1
  }), 'opponent');
  game.field.setExtraMonsterZone(0, 'player', attacker);
  game.field.setExtraMonsterZone(1, 'opponent', defender);

  await withImmediateTimers(
    () => game.executeAttack(
      { zoneType: 'extra', zoneIndex: 0 },
      { zoneType: 'extra', zoneIndex: 1 }
    )
  );

  assert.equal(game.opponentLP, 6500);
  assert.equal(game.field.getExtraMonsterZone(1), null);
  assert.ok(game.opponentGraveyard.includes(defender));
  assert.equal(game.field.getExtraMonsterZone(0).card, attacker);
});

test('Number 39: Utopia detaches a material to negate an attack from any monster zone', async () => {
  const game = new DuelGame({
    onDecision: request => request.effect === 'utopia-negate-attack'
  });
  prepareBattle(game);
  const attacker = control(monster({ uid: 'utopia-attack', atk: 3000 }), 'player');
  const utopia = control(monster({
    uid: 'utopia',
    id: '84013237',
    name: 'Number 39: Utopia',
    atk: 2500,
    def: 2000,
    level: 0,
    rank: 4,
    type: 'Xyz Effect Monster',
    extra_type: 'xyz',
    xyzMaterialCount: 2
  }), 'opponent');
  const firstMaterial = control(monster({ uid: 'utopia-material-a' }), 'opponent');
  const secondMaterial = control(monster({ uid: 'utopia-material-b' }), 'opponent');
  game.summons.attachXyzMaterials(utopia, [firstMaterial, secondMaterial]);
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setExtraMonsterZone(1, 'opponent', utopia);

  await withImmediateTimers(
    () => game.executeAttack(0, { zoneType: 'extra', zoneIndex: 1 })
  );

  assert.equal(game.opponentLP, 8000);
  assert.equal(game.field.getExtraMonsterZone(1).card, utopia);
  assert.deepEqual(utopia.xyzMaterials, [secondMaterial]);
  assert.ok(game.opponentGraveyard.includes(firstMaterial));
  assert.equal(game.hasMonsterAttacked({ zoneType: 'main', zoneIndex: 0 }), true);
});

test('Monster Reborn restores its target if the final Special Summon is prohibited', async () => {
  const game = new DuelGame();
  const target = control(monster({ uid: 'reborn-transaction-target' }), 'player');
  target.location = 'graveyard';
  game.playerGraveyard.push(target);
  const reborn = control(spell({
    uid: 'reborn-transaction-spell',
    id: '83764718',
    name: 'Monster Reborn'
  }), 'player');
  game.field.setSpellZone('player', 0, reborn);
  game.specialSummonCard = () => false;

  await withImmediateTimers(
    () => game.executeSpellTrapResolution(reborn, 'player', 0)
  );

  assert.equal(game.playerGraveyard.filter(card => card === target).length, 1);
  assert.equal(target.location, 'graveyard');
  assert.equal(game.playerMonsters.filter(Boolean).length, 0);
});

test('Monster Reborn revalidates SPECIAL_SUMMON after its asynchronous animation', async () => {
  const game = new DuelGame({
    onDecision: request => (
      request.type === 'select-monster-reborn-target'
        ? 'reborn-restricted-target'
        : undefined
    )
  });
  const target = control(monster({ uid: 'reborn-restricted-target' }), 'player');
  target.location = 'graveyard';
  game.playerGraveyard.push(target);
  const reborn = control(spell({
    uid: 'reborn-restricted-spell',
    id: '83764718',
    name: 'Monster Reborn'
  }), 'player');
  game.field.setSpellZone('player', 0, reborn);
  game.delay = async () => {
    game.defense.addRestriction({
      playerId: 'player',
      actionType: 'SPECIAL_SUMMON'
    });
    return true;
  };

  await game.executeSpellTrapResolution(reborn, 'player', 0);

  assert.deepEqual(game.playerGraveyard.filter(card => card === target), [target]);
  assert.equal(target.location, 'graveyard');
  assert.equal(game.getMonsterEntries('player').length, 0);
});

test('the AI sees and battles a player monster in an Extra Monster Zone', async () => {
  const game = new DuelGame();
  prepareBattle(game, 'opponent');
  const attacker = control(monster({ uid: 'ai-main-attacker', atk: 2200 }), 'opponent');
  const defender = control(monster({
    uid: 'ai-emz-target',
    atk: 1000,
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 1
  }), 'player');
  game.field.setMonsterZone('opponent', 0, attacker);
  game.field.setExtraMonsterZone(1, 'player', defender);

  await withImmediateTimers(() => game.runAIBattlePhase());

  assert.equal(game.field.getExtraMonsterZone(1), null);
  assert.ok(game.playerGraveyard.includes(defender));
  assert.equal(game.playerLP, 6800);
});

test('Xyz and Link material searches can consume a controlled EMZ monster', async () => {
  const xyzGame = new DuelGame();
  const xyzMain = control(monster({ uid: 'xyz-main-material', level: 4 }), 'player');
  const xyzExtraMaterial = control(monster({
    uid: 'xyz-emz-material',
    level: 4,
    type: 'Synchro Effect Monster',
    extra_type: 'synchro'
  }), 'player');
  const xyz = control(monster({
    uid: 'runtime-utopia',
    id: '84013237',
    name: 'Number 39: Utopia',
    atk: 2500,
    def: 2000,
    level: 0,
    rank: 4,
    xyzMaterialCount: 2,
    type: 'Xyz Effect Monster',
    extra_type: 'xyz'
  }), 'player');
  xyz.location = 'extra_deck';
  xyzGame.playerExtraDeck = [xyz];
  xyzGame.field.setMonsterZone('player', 0, xyzMain);
  xyzGame.field.setExtraMonsterZone(0, 'player', xyzExtraMaterial);

  assert.equal(await xyzGame.performXyzSummon('player', xyz.uid), true);
  assert.deepEqual(xyz.xyzMaterials, [xyzMain, xyzExtraMaterial]);
  assert.ok(xyzGame.getMonsterEntries('player').some(entry => entry.card === xyz));

  const linkGame = new DuelGame();
  const linkMain = control(monster({ uid: 'link-main-material' }), 'player');
  const linkExtraMaterial = control(monster({
    uid: 'link-emz-material',
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 1
  }), 'player');
  const linkTwo = control(monster({
    uid: 'runtime-link-two',
    name: 'Runtime Link-2',
    atk: 1800,
    def: null,
    level: 0,
    type: 'Link Effect Monster',
    extra_type: 'link',
    linkRating: 2,
    minimumMaterialCount: 2,
    maximumMaterialCount: 2,
    requiresEffectMonsters: true
  }), 'player');
  linkTwo.location = 'extra_deck';
  linkGame.playerExtraDeck = [linkTwo];
  linkGame.field.setMonsterZone('player', 0, linkMain);
  linkGame.field.setExtraMonsterZone(0, 'player', linkExtraMaterial);

  assert.equal(await linkGame.performLinkSummon('player', linkTwo.uid), true);
  assert.ok(linkGame.playerGraveyard.includes(linkMain));
  assert.ok(linkGame.playerGraveyard.includes(linkExtraMaterial));
  assert.ok(linkGame.getMonsterEntries('player').some(entry => entry.card === linkTwo));
});

test('Link Summon without a legal destination preserves every material', async () => {
  const game = new DuelGame();
  const emzBlocker = control(monster({
    uid: 'link-destination-blocker',
    type: 'Fusion Monster',
    extra_type: 'fusion'
  }), 'player');
  const first = control(monster({ uid: 'blocked-link-material-a' }), 'player');
  const second = control(monster({ uid: 'blocked-link-material-b' }), 'player');
  const link = control(monster({
    uid: 'blocked-link-target',
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 2,
    minimumMaterialCount: 2,
    maximumMaterialCount: 2,
    requiresEffectMonsters: true
  }), 'player');
  link.location = 'extra_deck';
  game.playerExtraDeck = [link];
  game.field.setExtraMonsterZone(0, 'player', emzBlocker);
  game.field.setMonsterZone('player', 0, first);
  game.field.setMonsterZone('player', 1, second);

  assert.equal(await game.performLinkSummon('player', link.uid), false);
  assert.equal(game.playerMonsters[0], first);
  assert.equal(game.playerMonsters[1], second);
  assert.equal(game.field.getExtraMonsterZone(0).card, emzBlocker);
  assert.deepEqual(game.playerGraveyard, []);
  assert.deepEqual(game.playerExtraDeck, [link]);
});

test('Fusion revalidates SPECIAL_SUMMON after its asynchronous material decision', async () => {
  let game;
  game = new DuelGame({
    onDecision: request => {
      if (request.type !== 'select-fusion-materials') return undefined;
      game.defense.addRestriction({
        playerId: 'player',
        actionType: 'SPECIAL_SUMMON'
      });
      return request.candidates.map(candidate => candidate.uid);
    }
  });
  const handMaterial = control(monster({
    uid: 'fusion-async-hand',
    id: 'fusion-material-a'
  }), 'player');
  const fieldMaterial = control(monster({
    uid: 'fusion-async-field',
    id: 'fusion-material-b'
  }), 'player');
  const fusion = control(monster({
    uid: 'fusion-async-target',
    type: 'Fusion Effect Monster',
    extra_type: 'fusion',
    fusionMaterials: ['fusion-material-a', 'fusion-material-b']
  }), 'player');
  handMaterial.location = 'hand';
  fusion.location = 'extra_deck';
  game.playerHand = [handMaterial];
  game.playerExtraDeck = [fusion];
  game.field.setMonsterZone('player', 0, fieldMaterial);

  assert.equal(await game.performFusionSummon('player', fusion.uid), false);
  assert.deepEqual(game.playerHand, [handMaterial]);
  assert.equal(game.playerMonsters[0], fieldMaterial);
  assert.deepEqual(game.playerGraveyard, []);
  assert.deepEqual(game.playerExtraDeck, [fusion]);
});

test('Fusion selects a field copy when that material must free the summon destination', async () => {
  const game = new DuelGame();
  const handA = control(monster({
    uid: 'full-fusion-hand-a',
    id: 'full-fusion-material-a'
  }), 'player');
  const handB = control(monster({
    uid: 'full-fusion-hand-b',
    id: 'full-fusion-material-b'
  }), 'player');
  handA.location = 'hand';
  handB.location = 'hand';
  game.playerHand = [handA, handB];

  const fieldA = control(monster({
    uid: 'full-fusion-field-a',
    id: 'full-fusion-material-a'
  }), 'player');
  const fieldB = control(monster({
    uid: 'full-fusion-field-b',
    id: 'full-fusion-material-b'
  }), 'player');
  const blockers = [2, 3, 4].map(index => control(monster({
    uid: `full-fusion-blocker-${index}`
  }), 'player'));
  [fieldA, fieldB, ...blockers].forEach((card, index) => {
    game.field.setMonsterZone('player', index, card);
  });
  const emzBlocker = control(monster({
    uid: 'full-fusion-emz-blocker',
    type: 'Synchro Effect Monster',
    extra_type: 'synchro'
  }), 'player');
  game.field.setExtraMonsterZone(0, 'player', emzBlocker);

  const fusion = control(monster({
    uid: 'full-fusion-target',
    type: 'Fusion Effect Monster',
    extra_type: 'fusion',
    fusionMaterials: ['full-fusion-material-a', 'full-fusion-material-b']
  }), 'player');
  fusion.location = 'extra_deck';
  game.playerExtraDeck = [fusion];

  const selected = game.getFusionMaterialSelection(fusion, 'player');
  assert.ok(selected.some(card => card.location === 'monster_zone'));
  assert.equal(await game.performFusionSummon('player', fusion.uid), true);
  assert.ok(game.playerMonsters.includes(fusion));
  assert.ok(game.playerGraveyard.includes(fieldB));
  assert.ok(game.playerGraveyard.includes(handA));
  assert.deepEqual(game.playerHand, [handB]);
  assert.equal(game.playerExtraDeck.includes(fusion), false);
});

test('AI Synchro revalidates SPECIAL_SUMMON after its asynchronous preparation', async () => {
  const game = new DuelGame();
  const tuner = control(monster({
    uid: 'ai-synchro-async-tuner',
    type: 'Tuner Effect Monster',
    level: 3
  }), 'opponent');
  const nonTuner = control(monster({
    uid: 'ai-synchro-async-non-tuner',
    level: 4
  }), 'opponent');
  const synchro = control(monster({
    uid: 'ai-synchro-async-target',
    type: 'Synchro Effect Monster',
    extra_type: 'synchro',
    level: 7
  }), 'opponent');
  synchro.location = 'extra_deck';
  game.opponentExtraDeck = [synchro];
  game.field.setMonsterZone('opponent', 0, tuner);
  game.field.setMonsterZone('opponent', 1, nonTuner);
  game.delay = async () => {
    game.defense.addRestriction({
      playerId: 'opponent',
      actionType: 'SPECIAL_SUMMON'
    });
    return true;
  };

  assert.equal(await game.tryAISynchroSummon({ usesExtraDeck: true }), false);
  assert.equal(game.opponentMonsters[0], tuner);
  assert.equal(game.opponentMonsters[1], nonTuner);
  assert.deepEqual(game.opponentGraveyard, []);
  assert.deepEqual(game.opponentExtraDeck, [synchro]);
});

test('Xyz and Link restrictions preserve their targets and every material', async () => {
  const xyzGame = new DuelGame();
  const xyzMaterials = [
    control(monster({ uid: 'restricted-xyz-a', level: 4 }), 'player'),
    control(monster({ uid: 'restricted-xyz-b', level: 4 }), 'player')
  ];
  const xyz = control(monster({
    uid: 'restricted-xyz-target',
    type: 'Xyz Effect Monster',
    extra_type: 'xyz',
    level: 0,
    rank: 4,
    xyzMaterialCount: 2
  }), 'player');
  xyz.location = 'extra_deck';
  xyzGame.playerExtraDeck = [xyz];
  xyzMaterials.forEach((card, index) => {
    xyzGame.field.setMonsterZone('player', index, card);
  });
  xyzGame.defense.addRestriction({
    playerId: 'player',
    actionType: 'SPECIAL_SUMMON'
  });

  assert.equal(await xyzGame.performXyzSummon('player', xyz.uid), false);
  assert.deepEqual(xyzGame.playerMonsters.slice(0, 2), xyzMaterials);
  assert.deepEqual(xyzGame.playerExtraDeck, [xyz]);
  assert.deepEqual(xyzGame.playerGraveyard, []);

  const linkGame = new DuelGame();
  const linkMaterials = [
    control(monster({ uid: 'restricted-link-a' }), 'player'),
    control(monster({ uid: 'restricted-link-b' }), 'player')
  ];
  const link = control(monster({
    uid: 'restricted-link-target',
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 2,
    minimumMaterialCount: 2,
    maximumMaterialCount: 2,
    requiresEffectMonsters: true
  }), 'player');
  link.location = 'extra_deck';
  linkGame.playerExtraDeck = [link];
  linkMaterials.forEach((card, index) => {
    linkGame.field.setMonsterZone('player', index, card);
  });
  linkGame.defense.addRestriction({
    playerId: 'player',
    actionType: 'SPECIAL_SUMMON'
  });

  assert.equal(await linkGame.performLinkSummon('player', link.uid), false);
  assert.deepEqual(linkGame.playerMonsters.slice(0, 2), linkMaterials);
  assert.deepEqual(linkGame.playerExtraDeck, [link]);
  assert.deepEqual(linkGame.playerGraveyard, []);
});

test('a runtime Pendulum Summon moves legal hand and face-up Extra Deck monsters', async () => {
  const game = new DuelGame();
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  const left = control(monster({
    uid: 'runtime-left-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  }), 'player');
  const right = control(monster({
    uid: 'runtime-right-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 8
  }), 'player');
  const fromHand = control(monster({
    uid: 'runtime-pendulum-hand',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 2,
    level: 4
  }), 'player');
  const fromExtra = control(monster({
    uid: 'runtime-pendulum-extra',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 3,
    level: 5
  }), 'player');
  game.field.setSpellZone('player', 0, left);
  left.location = 'pendulum_zone';
  game.field.setSpellZone('player', 4, right);
  right.location = 'pendulum_zone';
  fromHand.location = 'hand';
  game.playerHand = [fromHand];
  game.field.sendToFaceUpExtraDeck(fromExtra, 'player');

  assert.equal(
    await game.performPendulumSummon('player', [fromHand.uid, fromExtra.uid]),
    true
  );
  assert.equal(game.playerHand.includes(fromHand), false);
  assert.equal(game.playerFaceUpExtraDeck.includes(fromExtra), false);
  assert.ok(game.playerMonsters.includes(fromHand));
  assert.equal(game.field.getExtraMonsterZone(0).card, fromExtra);
  assert.equal(game.summons.pendulumSummonAllowance.used, 1);
});

test('a prohibited Pendulum Summon leaves sources and allowance untouched', async () => {
  const game = new DuelGame();
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  const left = control(monster({
    uid: 'restricted-left-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  }), 'player');
  const right = control(monster({
    uid: 'restricted-right-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 8
  }), 'player');
  const candidate = control(monster({
    uid: 'restricted-pendulum-candidate',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 2,
    level: 4
  }), 'player');
  game.field.setSpellZone('player', 0, left);
  left.location = 'pendulum_zone';
  game.field.setSpellZone('player', 4, right);
  right.location = 'pendulum_zone';
  candidate.location = 'hand';
  game.playerHand = [candidate];
  game.defense.addRestriction({
    playerId: 'player',
    actionType: 'SPECIAL_SUMMON'
  });

  assert.equal(await game.performPendulumSummon('player', [candidate.uid]), false);
  assert.deepEqual(game.playerHand, [candidate]);
  assert.equal(candidate.location, 'hand');
  assert.equal(game.getMonsterEntries('player').length, 0);
  assert.equal(game.summons.pendulumSummonAllowance.used, 0);
});

test('Pendulum revalidates its scales after the asynchronous monster decision', async () => {
  let game;
  let right;
  game = new DuelGame({
    onDecision: request => {
      if (request.type !== 'select-pendulum-monsters') return undefined;
      game.field.setSpellZone('player', 4, null);
      game.field.sendToGraveyard(right, right.ownerId);
      return [request.candidates[0].uid];
    }
  });
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  const left = control(monster({
    uid: 'stale-left-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  }), 'player');
  right = control(monster({
    uid: 'stale-right-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 8
  }), 'player');
  const candidate = control(monster({
    uid: 'stale-pendulum-candidate',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 2,
    level: 4
  }), 'player');
  game.field.setSpellZone('player', 0, left);
  left.location = 'pendulum_zone';
  game.field.setSpellZone('player', 4, right);
  right.location = 'pendulum_zone';
  candidate.location = 'hand';
  game.playerHand = [candidate];

  assert.equal(await game.performPendulumSummon('player'), false);
  assert.deepEqual(game.playerHand, [candidate]);
  assert.equal(game.getMonsterEntries('player').length, 0);
  assert.equal(game.summons.pendulumSummonAllowance.used, 0);
  assert.equal(game.playerFaceUpExtraDeck.includes(right), true);
});

test('a runtime Ritual Summon consumes legal materials and properly summons its target', async () => {
  const game = new DuelGame();
  const ritualMonster = control(monster({
    uid: 'runtime-ritual-target',
    id: '05405694',
    type: 'Ritual Monster',
    isRitualMonster: true,
    level: 8
  }), 'player');
  const handMaterial = control(monster({
    uid: 'runtime-ritual-hand-material',
    level: 4
  }), 'player');
  const fieldMaterial = control(monster({
    uid: 'runtime-ritual-field-material',
    level: 4
  }), 'player');
  const ritualSpell = control(spell({
    uid: 'runtime-ritual-spell',
    id: '55761792',
    name: 'Black Luster Ritual',
    type: 'Ritual Spell Card',
    isRitualSpell: true,
    ritualMonsterIds: ['05405694'],
    requiredRitualLevel: 8
  }), 'player');
  ritualMonster.location = 'hand';
  handMaterial.location = 'hand';
  fieldMaterial.isSetFaceDown = true;
  // Keep the material before the Ritual Monster to verify index shifts during commit.
  game.playerHand = [handMaterial, ritualMonster];
  game.field.setMonsterZone('player', 0, fieldMaterial);

  assert.equal(await game.performRitualSummon('player', ritualSpell), true);
  assert.equal(game.playerHand.includes(ritualMonster), false);
  assert.equal(game.playerHand.includes(handMaterial), false);
  assert.ok(game.playerMonsters.includes(ritualMonster));
  assert.ok(game.playerGraveyard.includes(handMaterial));
  assert.ok(game.playerGraveyard.includes(fieldMaterial));
  assert.equal(ritualMonster.wasProperlySpecialSummoned, true);
  assert.equal(ritualMonster.summonType, 'ritual');
});

test('Ritual selects a field Tribute when it must free the summon destination', async () => {
  const game = new DuelGame();
  const ritualMonster = control(monster({
    uid: 'full-ritual-target',
    id: '05405694',
    type: 'Ritual Monster',
    isRitualMonster: true,
    level: 8
  }), 'player');
  const handMaterial = control(monster({
    uid: 'full-ritual-hand-material',
    level: 8
  }), 'player');
  const fieldMaterial = control(monster({
    uid: 'full-ritual-field-material',
    level: 8
  }), 'player');
  const ritualSpell = control(spell({
    uid: 'full-ritual-spell',
    id: '55761792',
    name: 'Black Luster Ritual',
    type: 'Ritual Spell Card',
    isRitualSpell: true,
    ritualMonsterIds: ['05405694'],
    requiredRitualLevel: 8
  }), 'player');
  ritualMonster.location = 'hand';
  handMaterial.location = 'hand';
  game.playerHand = [ritualMonster, handMaterial];
  const blockers = [1, 2, 3, 4].map(index => control(monster({
    uid: `full-ritual-blocker-${index}`
  }), 'player'));
  [fieldMaterial, ...blockers].forEach((card, index) => {
    game.field.setMonsterZone('player', index, card);
  });

  assert.equal(game.canActivateSpell(ritualSpell, 'player'), true);
  assert.equal(await game.performRitualSummon('player', ritualSpell), true);
  assert.equal(game.playerMonsters[0], ritualMonster);
  assert.ok(game.playerGraveyard.includes(fieldMaterial));
  assert.deepEqual(game.playerHand, [handMaterial]);
});

test('a prohibited Ritual Summon preserves its target and all materials', async () => {
  const game = new DuelGame();
  const ritualMonster = control(monster({
    uid: 'restricted-ritual-target',
    id: '05405694',
    type: 'Ritual Monster',
    isRitualMonster: true,
    level: 8
  }), 'player');
  const material = control(monster({
    uid: 'restricted-ritual-material',
    level: 8
  }), 'player');
  const ritualSpell = control(spell({
    uid: 'restricted-ritual-spell',
    id: '55761792',
    name: 'Black Luster Ritual',
    type: 'Ritual Spell Card',
    isRitualSpell: true,
    ritualMonsterIds: ['05405694'],
    requiredRitualLevel: 8
  }), 'player');
  ritualMonster.location = 'hand';
  material.location = 'hand';
  game.playerHand = [ritualMonster, material];
  game.defense.addRestriction({
    playerId: 'player',
    actionType: 'SPECIAL_SUMMON'
  });

  assert.equal(await game.performRitualSummon('player', ritualSpell), false);
  assert.deepEqual(game.playerHand, [ritualMonster, material]);
  assert.deepEqual(game.playerGraveyard, []);
  assert.equal(game.getMonsterEntries('player').length, 0);
  assert.equal(ritualMonster.location, 'hand');
});

test('Ritual revalidates SPECIAL_SUMMON after its asynchronous target decision', async () => {
  let game;
  game = new DuelGame({
    onDecision: request => {
      if (request.type !== 'select-ritual-monster') return undefined;
      game.defense.addRestriction({
        playerId: 'player',
        actionType: 'SPECIAL_SUMMON'
      });
      return request.candidates[0].uid;
    }
  });
  const ritualMonster = control(monster({
    uid: 'async-restricted-ritual-target',
    id: '05405694',
    type: 'Ritual Monster',
    isRitualMonster: true,
    level: 8
  }), 'player');
  const material = control(monster({
    uid: 'async-restricted-ritual-material',
    level: 8
  }), 'player');
  const ritualSpell = control(spell({
    uid: 'async-restricted-ritual-spell',
    id: '55761792',
    name: 'Black Luster Ritual',
    type: 'Ritual Spell Card',
    isRitualSpell: true,
    ritualMonsterIds: ['05405694'],
    requiredRitualLevel: 8
  }), 'player');
  ritualMonster.location = 'hand';
  material.location = 'hand';
  game.playerHand = [ritualMonster, material];

  assert.equal(await game.performRitualSummon('player', ritualSpell), false);
  assert.deepEqual(game.playerHand, [ritualMonster, material]);
  assert.deepEqual(game.playerGraveyard, []);
  assert.equal(game.getMonsterEntries('player').length, 0);
});

test('interactive Synchro selection accepts a material from the EMZ and summons to a free Main Zone', async () => {
  const game = new DuelGame();
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  const tuner = control(monster({
    uid: 'emz-synchro-tuner',
    level: 3,
    type: 'Tuner Effect Monster'
  }), 'player');
  const nonTuner = control(monster({
    uid: 'main-synchro-material',
    level: 4
  }), 'player');
  const synchro = control(monster({
    uid: 'emz-arcanite',
    id: '31924889',
    name: 'Arcanite Magician',
    atk: 400,
    def: 1800,
    level: 7,
    type: 'Synchro Effect Monster',
    extra_type: 'synchro',
    race: 'Spellcaster'
  }), 'player');
  synchro.location = 'extra_deck';
  game.playerExtraDeck = [synchro];
  game.field.setMonsterZone('player', 0, nonTuner);
  game.field.setExtraMonsterZone(0, 'player', tuner);

  assert.equal(await game.summonExtraDeck(synchro.uid), true);
  await game.selectSynchroMaterial(0);
  await withImmediateTimers(
    () => game.selectSynchroMaterial({ zoneType: 'extra', zoneIndex: 0 })
  );

  assert.equal(game.playerMonsters[0], synchro);
  assert.equal(game.field.getExtraMonsterZone(0), null);
  assert.ok(game.playerGraveyard.includes(tuner));
  assert.ok(game.playerGraveyard.includes(nonTuner));
  assert.equal(synchro.counters.spell, 2);
});

test('interactive Synchro revalidates SPECIAL_SUMMON after its asynchronous final check', async () => {
  const game = new DuelGame();
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  const tuner = control(monster({
    uid: 'interactive-async-tuner',
    level: 3,
    type: 'Tuner Effect Monster'
  }), 'player');
  const nonTuner = control(monster({
    uid: 'interactive-async-non-tuner',
    level: 4
  }), 'player');
  const synchro = control(monster({
    uid: 'interactive-async-synchro',
    type: 'Synchro Effect Monster',
    extra_type: 'synchro',
    level: 7
  }), 'player');
  synchro.location = 'extra_deck';
  game.playerExtraDeck = [synchro];
  game.field.setMonsterZone('player', 0, tuner);
  game.field.setMonsterZone('player', 1, nonTuner);
  game.delay = async () => {
    game.defense.addRestriction({
      playerId: 'player',
      actionType: 'SPECIAL_SUMMON'
    });
    return true;
  };

  assert.equal(await game.summonExtraDeck(synchro.uid), true);
  await game.selectSynchroMaterial(0);
  assert.equal(await game.selectSynchroMaterial(1), false);

  assert.equal(game.playerMonsters[0], tuner);
  assert.equal(game.playerMonsters[1], nonTuner);
  assert.deepEqual(game.playerGraveyard, []);
  assert.deepEqual(game.playerExtraDeck, [synchro]);
  assert.equal(game.isResolvingAction, false);
  assert.equal(game.pendingExtraSummon, null);
});

test('startDuel accepts the match-selected starting Duelist and first-turn draw uses that identity', async () => {
  const game = new DuelGame({}, { rulesMode: 'sandbox' });
  const realStartPhaseFlow = game.startPhaseFlow.bind(game);
  game.startPhaseFlow = () => {};
  const deck = [monster({ uid: 'starter-template' })];
  assert.equal(game.startDuel(deck, deck, [], [], { startingPlayer: 'opponent' }), true);
  assert.equal(game.startingPlayerId, 'opponent');
  assert.equal(game.currentTurn, 'opponent');

  let receivedFirstPlayerFlag = null;
  let draws = 0;
  game.turn.shouldDrawOnDrawPhase = (turnCount, isFirstPlayer) => {
    assert.equal(turnCount, 1);
    receivedFirstPlayerFlag = isFirstPlayer;
    return false;
  };
  game.drawCard = () => {
    draws += 1;
  };
  let delays = 0;
  game.delay = async () => {
    delays += 1;
    return delays === 1;
  };
  game.phases.currentTurnOwner = 'opponent';
  game.phases.currentPhase = 'draw';
  game.phases.turnCount = 1;
  game.startPhaseFlow = realStartPhaseFlow;
  await game.startPhaseFlow();
  assert.equal(receivedFirstPlayerFlag, true);
  assert.equal(draws, 0);
});

test('a cancelled player Pendulum selection does not auto-summon fallback monsters', async () => {
  const game = new DuelGame({
    onDecision: request => (
      request.type === 'select-pendulum-monsters' ? null : undefined
    )
  });
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';
  const left = control(monster({
    uid: 'cancel-left-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  }), 'player');
  const right = control(monster({
    uid: 'cancel-right-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 8
  }), 'player');
  const candidate = control(monster({
    uid: 'cancel-pendulum-candidate',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 2,
    level: 4
  }), 'player');
  game.field.setSpellZone('player', 0, left);
  left.location = 'pendulum_zone';
  game.field.setSpellZone('player', 4, right);
  right.location = 'pendulum_zone';
  candidate.location = 'hand';
  game.playerHand = [candidate];

  assert.equal(await game.performPendulumSummon('player'), false);
  assert.deepEqual(game.playerHand, [candidate]);
  assert.equal(game.getMonsterEntries('player').length, 0);
  assert.equal(game.summons.canPendulumSummon(), true);
});

test('Link material search chooses a combination that actually frees a legal destination', async () => {
  const game = new DuelGame();
  const firstMain = control(monster({ uid: 'link-destination-main-a' }), 'player');
  const secondMain = control(monster({ uid: 'link-destination-main-b' }), 'player');
  const emzMaterial = control(monster({
    uid: 'link-destination-emz',
    type: 'Fusion Effect Monster',
    extra_type: 'fusion'
  }), 'player');
  const linkTwo = control(monster({
    uid: 'link-destination-target',
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 2,
    minimumMaterialCount: 2,
    maximumMaterialCount: 2,
    requiresEffectMonsters: true
  }), 'player');
  linkTwo.location = 'extra_deck';
  game.playerExtraDeck = [linkTwo];
  game.field.setMonsterZone('player', 0, firstMain);
  game.field.setMonsterZone('player', 1, secondMain);
  game.field.setExtraMonsterZone(0, 'player', emzMaterial);

  const selected = game.getLinkMaterialCombination(linkTwo, 'player');
  assert.ok(selected.some(entry => entry.card === emzMaterial));
  assert.equal(await game.performLinkSummon('player', linkTwo.uid), true);
  assert.equal(game.field.getExtraMonsterZone(0)?.card, linkTwo);
  assert.equal(linkTwo.position, 'attack');
  assert.ok(game.playerGraveyard.includes(emzMaterial));
});

test('Special Summon position decisions reach Xyz and EMZ summons while Link stays in Attack', async () => {
  let positionRequests = 0;
  const game = new DuelGame({
    onDecision: request => {
      if (request?.type === 'select-summon-position') {
        positionRequests += 1;
        return 'defense';
      }
      return undefined;
    }
  });
  const first = control(monster({ uid: 'defense-xyz-a', level: 4 }), 'player');
  const second = control(monster({ uid: 'defense-xyz-b', level: 4 }), 'player');
  const xyz = control(monster({
    uid: 'defense-xyz-target',
    type: 'Xyz Effect Monster',
    extra_type: 'xyz',
    level: 0,
    rank: 4,
    xyzMaterialCount: 2
  }), 'player');
  xyz.location = 'extra_deck';
  game.playerExtraDeck = [xyz];
  game.field.setMonsterZone('player', 0, first);
  game.field.setMonsterZone('player', 1, second);

  assert.equal(await game.performXyzSummon('player', xyz.uid), true);
  assert.equal(positionRequests, 1);
  assert.equal(xyz.position, 'defense');

  const fusionGame = new DuelGame();
  const fusion = control(monster({
    uid: 'defense-emz-fusion',
    type: 'Fusion Effect Monster',
    extra_type: 'fusion'
  }), 'player');
  assert.notEqual(
    fusionGame.specialSummonToExtraMonsterZone(fusion, 'player', 0, {
      position: 'defense',
      summonType: 'fusion'
    }),
    false
  );
  assert.equal(fusion.position, 'defense');

  const linkGame = new DuelGame();
  const link = control(monster({
    uid: 'forced-attack-link',
    type: 'Link Effect Monster',
    extra_type: 'link',
    level: 0,
    linkRating: 1
  }), 'player');
  assert.notEqual(
    linkGame.specialSummonToExtraMonsterZone(link, 'player', 0, {
      position: 'defense',
      summonType: 'link'
    }),
    false
  );
  assert.equal(link.position, 'attack');
});

test('Timegazer and Stargazer lock the matching opposing battle activations', async () => {
  const game = new DuelGame();
  prepareBattle(game, 'player');
  const attacker = control(monster({
    uid: 'pendulum-battle-attacker',
    atk: 1500,
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true
  }), 'player');
  const timegazerScale = control(monster({
    uid: 'timegazer-scale',
    id: '20409757',
    name: 'Timegazer Magician',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 8
  }), 'player');
  const stargazerScale = control(monster({
    uid: 'stargazer-scale',
    id: '94415058',
    name: 'Stargazer Magician',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  }), 'player');
  const mirrorForce = control(spell({
    uid: 'blocked-mirror-force',
    id: '44095762',
    name: 'Mirror Force',
    type: 'Normal Trap',
    card_type: 'trap'
  }), 'opponent');
  mirrorForce.isSetFaceDown = true;
  mirrorForce.turnSet = 1;
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setSpellZone('player', 0, timegazerScale);
  timegazerScale.location = 'pendulum_zone';
  game.field.setSpellZone('player', 4, stargazerScale);
  stargazerScale.location = 'pendulum_zone';
  game.field.setSpellZone('opponent', 0, mirrorForce);

  const battleContext = {
    attackingSide: 'player',
    defendingSide: 'opponent',
    attacker
  };
  assert.equal(
    game.isPendulumBattleActivationForbidden('opponent', 'trap', battleContext),
    true
  );
  assert.equal(
    game.isPendulumBattleActivationForbidden('opponent', 'spell', battleContext),
    true
  );

  await withImmediateTimers(() => game.executeAttack(0));
  assert.equal(game.opponentLP, 6500);
  assert.equal(game.opponentSpells[0], mirrorForce);
  assert.equal(mirrorForce.isSetFaceDown, true);
  assert.equal(game.playerMonsters[0], attacker);
});

test('Timegazer protects the first Pendulum Zone destruction each turn and Stargazer resolves its exact return trigger', async () => {
  const game = new DuelGame();
  game.phases.turnCount = 2;
  const timegazer = control(monster({
    uid: 'timegazer-monster',
    id: '20409757',
    name: 'Timegazer Magician',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true
  }), 'player');
  const scale = control(monster({
    uid: 'protected-pendulum-scale',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true,
    pendulumScale: 1
  }), 'player');
  game.field.setMonsterZone('player', 0, timegazer);
  game.field.setSpellZone('player', 0, scale);
  scale.location = 'pendulum_zone';

  assert.equal(game.removeCardFromCurrentZone(scale, {
    byCardEffect: true,
    sourceSide: 'opponent'
  }), false);
  assert.equal(game.playerSpells[0], scale);
  assert.equal(game.removeCardFromCurrentZone(scale, {
    byCardEffect: true,
    sourceSide: 'opponent'
  }), true);
  assert.equal(game.playerSpells[0], null);
  assert.ok(game.playerFaceUpExtraDeck.includes(scale));

  let summonedCopy;
  const stargazerGame = new DuelGame({
    onDecision: request => {
      if (request?.type === 'select-summon-position') return 'defense';
      if (request?.type === 'select-stargazer-summon') return summonedCopy.uid;
      if (request?.type === 'select-summon-destination') return undefined;
      return true;
    }
  });
  stargazerGame.phases.turnCount = 3;
  const stargazer = control(monster({
    uid: 'stargazer-monster',
    id: '94415058',
    name: 'Stargazer Magician',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true
  }), 'player');
  const returned = control(monster({
    uid: 'returned-pendulum',
    id: 'same-pendulum-name',
    name: 'Returned Pendulum',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true
  }), 'player');
  summonedCopy = control(monster({
    uid: 'same-name-copy',
    id: 'same-pendulum-name',
    name: 'Returned Pendulum',
    type: 'Pendulum Effect Monster',
    isPendulumMonster: true
  }), 'player');
  const unrelated = control(monster({ uid: 'simultaneous-other-card' }), 'player');
  [returned, summonedCopy].forEach(card => {
    card.location = 'hand';
  });
  stargazerGame.playerHand = [returned, summonedCopy];
  stargazerGame.field.setMonsterZone('player', 0, stargazer);

  assert.equal(await stargazerGame.resolveStargazerReturnedCardTrigger(
    'player',
    [returned, unrelated],
    { sourceSide: 'opponent' }
  ), false);
  assert.equal(await stargazerGame.resolveStargazerReturnedCardTrigger(
    'player',
    [returned],
    { sourceSide: 'opponent' }
  ), true);
  assert.equal(summonedCopy.position, 'defense');
  assert.ok(stargazerGame.playerMonsters.includes(summonedCopy));
  assert.equal(stargazerGame.playerHand.includes(returned), true);
});

test('board EMZ synchronization renders, labels, controls, and clears present nodes', () => {
  const zones = Array.from({ length: 2 }, (_, index) => ({
    dataset: { index: String(index) },
    innerHTML: '',
    attributes: {},
    classes: new Set(),
    classList: {
      toggle(name, enabled) {
        if (enabled) zones[index].classes.add(name);
        else zones[index].classes.delete(name);
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  }));
  const board = {
    querySelector(selector) {
      const match = selector.match(/data-index="(\d+)"/);
      return match ? zones[Number(match[1])] : null;
    }
  };
  const card = monster({ uid: 'rendered-emz', name: 'Rendered EMZ' });
  const renders = [];
  const state = {
    extraMonsterZones: [
      { card, controllerId: 'opponent' },
      null
    ]
  };

  assert.equal(
    findMonsterZoneElement(board, null, { zoneType: 'extra', zoneIndex: 0 }),
    zones[0]
  );
  assert.equal(
    syncExtraMonsterZones(board, state, (zone, renderedCard, opponent) => {
      renders.push({ zone, renderedCard, opponent });
      zone.innerHTML = 'rendered';
    }),
    2
  );
  assert.equal(renders.length, 1);
  assert.equal(renders[0].opponent, true);
  assert.equal(zones[0].dataset.controllerId, 'opponent');
  assert.ok(zones[0].classes.has('opponent-controlled'));
  assert.match(zones[0].attributes['aria-label'], /Rendered EMZ/);

  state.extraMonsterZones[0] = null;
  syncExtraMonsterZones(board, state, () => {
    throw new Error('empty EMZ must not render');
  });
  assert.equal(zones[0].innerHTML, '');
  assert.equal(zones[0].dataset.renderedCardUid, undefined);
});
