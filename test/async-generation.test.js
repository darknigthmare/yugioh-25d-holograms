import test from 'node:test';
import assert from 'node:assert/strict';

import { CardState } from '../src/core/CardState.js';
import { DuelGame } from '../src/game.js';

function monster(uid, overrides = {}) {
  const card = new CardState({
    uid,
    id: overrides.id || uid,
    name: overrides.name || uid,
    card_type: 'monster',
    type: 'Effect Monster',
    atk: 1000,
    def: 1000,
    level: 4,
    ...overrides
  });
  card.ownerId = overrides.ownerId || 'player';
  card.controllerId = overrides.controllerId || card.ownerId;
  return card;
}

test('reset invalidates a pending chain-response window without touching the new chain', async () => {
  let resolveOpportunity;
  const game = new DuelGame({
    onChainOpportunity: () => new Promise(resolve => {
      resolveOpportunity = resolve;
    })
  });
  const oldSource = monster('old-chain-source');
  game.chain.pushChainLink('player', oldSource, [], {
    resolver: async () => true
  });

  const pendingWindow = game.openChainResponseWindow('opponent');
  await Promise.resolve();
  assert.equal(typeof resolveOpportunity, 'function');

  game.reset();
  const newSource = monster('new-chain-source');
  const newLink = game.chain.pushChainLink('player', newSource, [], {
    resolver: async () => true
  });
  resolveOpportunity(null);

  assert.equal(await pendingWindow, false);
  assert.deepEqual(game.chain.chainStack, [newLink]);
  assert.equal(game.chain.getLastLink()?.sourceCard, newSource);
});

test('reset invalidates a pending Time Wizard decision before it can destroy new-duel cards', async () => {
  let resolveDecision;
  const game = new DuelGame({
    onDecision: request => (
      request.type === 'coin-call'
        ? new Promise(resolve => {
          resolveDecision = resolve;
        })
        : undefined
    ),
    onChainOpportunity: () => null
  });
  game.phases.currentTurnOwner = 'player';
  game.phases.currentPhase = 'main1';

  const timeWizard = monster('old-time-wizard', {
    id: '71625222',
    name: 'Time Wizard',
    atk: 500,
    def: 400,
    level: 2
  });
  game.field.setMonsterZone('player', 0, timeWizard);

  const pendingEffect = game.activateMonsterEffect(
    { zoneType: 'main', zoneIndex: 0 },
    'player'
  );
  for (let attempt = 0; attempt < 4 && !resolveDecision; attempt += 1) {
    await Promise.resolve();
  }
  assert.equal(typeof resolveDecision, 'function');

  game.reset();
  const newVictim = monster('new-duel-victim', {
    ownerId: 'opponent',
    controllerId: 'opponent'
  });
  game.field.setMonsterZone('opponent', 0, newVictim);
  resolveDecision({ call: 'heads', result: 'heads' });

  assert.equal(await pendingEffect, false);
  assert.equal(game.field.getMonsterZone('opponent', 0), newVictim);
  assert.equal(game.opponentGraveyard.includes(newVictim), false);
  assert.equal(game.opponentLP, 8000);
});
