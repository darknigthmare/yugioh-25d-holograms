import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicDuelSceneSummary } from '../src/ui/RealDuelView.js';

test('the true 3D scene receives public aggregates and no hidden card identity', () => {
  const hiddenOpponentCard = {
    id: '89631139',
    uid: 'private-blue-eyes-instance',
    name: 'Private card name',
    imageUrl: 'private-texture.webp'
  };
  const playerCard = { id: '46986414', uid: 'public-player-instance' };
  const summary = createPublicDuelSceneSummary({
    playerLP: 7250,
    opponentLP: 6100,
    currentTurn: 'opponent',
    currentPhase: 'battle',
    turnCount: 7,
    playerHand: [playerCard],
    opponentHand: [hiddenOpponentCard, { id: '1' }]
  });

  assert.deepEqual(summary, {
    playerLP: 7250,
    opponentLP: 6100,
    currentTurn: 'opponent',
    currentPhase: 'battle',
    turnCount: 7,
    playerHandCount: 1,
    opponentHandCount: 2,
    duelEnded: false
  });
  assert.equal(Object.isFrozen(summary), true);
  assert.equal(JSON.stringify(summary).includes('89631139'), false);
  assert.equal(JSON.stringify(summary).includes('private'), false);
});
