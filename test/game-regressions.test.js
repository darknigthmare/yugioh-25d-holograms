import test from 'node:test';
import assert from 'node:assert/strict';

import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';

function createCard(overrides = {}) {
  return new CardState({
    id: '10000000',
    name: 'Test Monster',
    name_en: 'Test Monster',
    card_type: 'monster',
    type: 'Normal Monster',
    desc: '',
    atk: 1500,
    def: 1200,
    level: 4,
    ...overrides
  });
}

async function withoutAnimationDelays(action) {
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

test('sandbox API cards are wrapped in CardState before entering the hand', () => {
  const game = new DuelGame();
  const card = game.addCardToHand({
    id: '63977008',
    name: 'Junk Synchron',
    name_en: 'Junk Synchron',
    card_type: 'monster',
    type: 'Tuner Monster',
    desc: '',
    atk: 1300,
    def: 500,
    level: 3
  });

  assert.ok(card instanceof CardState);
  assert.equal(card.location, 'hand');
  assert.equal(card.ownerId, 'player');
  assert.equal(card.getAtk(), 1300);
  assert.equal(game.playerHand[0], card);
});

test('Trap Hole resolves on a qualifying summon instead of during battle', async () => {
  const game = new DuelGame();
  game.phases.turnCount = 2;

  const summoned = createCard({ uid: 'summoned-monster' });
  summoned.ownerId = 'opponent';
  const trap = createCard({
    uid: 'trap-hole',
    id: '04206964',
    name: 'Trap Hole',
    card_type: 'trap',
    type: 'Trap Card',
    atk: 0,
    def: 0,
    level: 0
  });
  trap.ownerId = 'player';
  trap.isSetFaceDown = true;
  trap.turnSet = 1;

  game.field.setMonsterZone('opponent', 0, summoned);
  game.field.setSpellZone('player', 0, trap);

  const resolved = await withoutAnimationDelays(
    () => game.resolveTrapHoleOnSummon('opponent', 0)
  );

  assert.equal(resolved, true);
  assert.equal(game.opponentMonsters[0], null);
  assert.equal(game.playerSpells[0], null);
  assert.ok(game.opponentGraveyard.includes(summoned));
  assert.ok(game.playerGraveyard.includes(trap));
});

test('Mirror Force responds to a direct attack declaration', async () => {
  const game = new DuelGame();
  game.phases.turnCount = 2;

  const attacker = createCard({ uid: 'direct-attacker' });
  attacker.ownerId = 'opponent';
  attacker.position = 'attack';

  const trap = createCard({
    uid: 'mirror-force',
    id: '44095762',
    name: 'Mirror Force',
    card_type: 'trap',
    type: 'Trap Card',
    atk: 0,
    def: 0,
    level: 0
  });
  trap.ownerId = 'player';
  trap.isSetFaceDown = true;
  trap.turnSet = 1;

  game.field.setMonsterZone('opponent', 0, attacker);
  game.field.setSpellZone('player', 0, trap);

  const resolved = await withoutAnimationDelays(
    () => game.resolveMirrorForceOnAttack('player', 0)
  );

  assert.equal(resolved, true);
  assert.equal(game.opponentMonsters[0], null);
  assert.ok(game.opponentGraveyard.includes(attacker));
  assert.ok(game.playerGraveyard.includes(trap));
});

test('Monster Reborn does not remove its target when every monster zone is full', async () => {
  const game = new DuelGame();
  const target = createCard({ uid: 'graveyard-target', atk: 2500 });
  target.ownerId = 'player';
  game.playerGraveyard.push(target);

  for (let index = 0; index < 5; index += 1) {
    const occupant = createCard({ uid: `occupant-${index}` });
    occupant.ownerId = 'player';
    game.field.setMonsterZone('player', index, occupant);
  }

  const reborn = createCard({
    uid: 'monster-reborn',
    id: '83764718',
    name: 'Monster Reborn',
    card_type: 'spell',
    type: 'Spell Card',
    atk: 0,
    def: 0,
    level: 0
  });
  reborn.ownerId = 'player';
  game.field.setSpellZone('player', 0, reborn);

  await withoutAnimationDelays(
    () => game.executeSpellTrapResolution(reborn, 'player', 0)
  );

  assert.ok(game.playerGraveyard.includes(target));
  assert.ok(game.playerGraveyard.includes(reborn));
  assert.equal(game.playerMonsters.filter(Boolean).length, 5);
});
