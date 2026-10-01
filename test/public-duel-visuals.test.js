import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicCombatVisual, createPublicFieldHolograms } from '../src/ui/PublicDuelVisuals.js';
import { RealDuelView } from '../src/ui/RealDuelView.js';

test('model descriptors reveal only public monsters, never hidden identities or instance state', () => {
  const hidden = { isSetFaceDown: true, get id() { throw new Error('hidden identity read'); } };
  const game = {
    playerMonsters: [{ id: '89631139', name: 'Blue-Eyes', position: 'attack', uid: 'secret-instance', effectUsage: { once: true } }],
    opponentMonsters: [hidden],
    opponentHand: [{ id: 'private-hand' }],
    extraMonsterZones: [{ controllerId: 'opponent', card: { id: '84013237', type: 'Xyz Monster', position: 'defense' } }]
  };
  const descriptors = createPublicFieldHolograms(game, ref => [ref.zoneIndex, 0.62, ref.owner === 'player' ? 3 : -3]);
  assert.equal(descriptors.length, 2);
  assert.equal(descriptors[0].key, 'player:main:0');
  assert.equal(descriptors[1].key, 'opponent:extra:0');
  assert.equal(descriptors[1].position, 'defense');
  assert.equal(Object.isFrozen(descriptors[0].card), true);
  assert.equal(JSON.stringify(descriptors).includes('secret'), false);
  assert.equal(JSON.stringify(descriptors).includes('private-hand'), false);
  assert.equal(JSON.stringify(descriptors).includes('effectUsage'), false);
});

test('attack routing locates both camps and shared Extra zones without forwarding live cards', () => {
  const card = { id: '89631139', race: 'Dragon', uid: 'live-instance', isSetFaceDown: false };
  const game = { playerMonsters: [card] };
  const visual = createPublicCombatVisual({
    type: 'attack-monster', attackerSide: 'player', atkZoneIndex: 0, defZoneType: 'extra', defZoneIndex: 1
  }, game, ref => ref.owner === 'player' ? [0, 0.62, 3] : [2.25, 0.62, 0]);
  assert.equal(visual.kind, 'attack');
  assert.deepEqual(visual.source, [0, 2.12, 3]);
  assert.deepEqual(visual.target, [2.25, 2.12, 0]);
  assert.equal(visual.card.id, card.id);
  assert.notEqual(visual.card, card);
  assert.equal('uid' in visual.card, false);
  const direct = createPublicCombatVisual({ type: 'attack-direct', target: 'opponent', atkZoneIndex: 0, card }, game);
  assert.deepEqual(direct.target, { owner: 'opponent', direct: true });
});

test('hidden cards and unrelated events cannot trigger identity-based visuals', () => {
  const hidden = { isSetFaceDown: true, get id() { throw new Error('hidden identity read'); } };
  assert.equal(createPublicCombatVisual({ type: 'activate', target: 'opponent', faceDown: true, card: hidden }, {}), null);
  assert.equal(createPublicCombatVisual({ type: 'draw', target: 'opponent', card: hidden }, {}), null);
  assert.equal(createPublicCombatVisual({ type: 'attack-direct', target: 'player', atkZoneIndex: 0, card: hidden }, {}), null);
});

test('a rendered model hides only the matching camp sprite and restores the fallback when removed', () => {
  const zone = (side, index) => {
    const classes = new Set([`${side}-m-zone`]);
    return { dataset: { index }, classList: {
      contains: name => classes.has(name),
      toggle: (name, on) => on ? classes.add(name) : classes.delete(name)
    } };
  };
  const player = zone('player', 0);
  const opponent = zone('opponent', 0);
  const view = { gameState: {}, _publicZonePosition: () => undefined,
    boardElement: { querySelectorAll: () => [player, opponent] },
    scene3D: { updateFieldHolograms: () => ({ renderedKeys: ['player:main:0'] }) }
  };
  RealDuelView.prototype._syncFieldHolograms.call(view);
  assert.equal(player.classList.contains('has-real-hologram-model'), true);
  assert.equal(opponent.classList.contains('has-real-hologram-model'), false);
  view.scene3D.updateFieldHolograms = () => ({ renderedKeys: [] });
  RealDuelView.prototype._syncFieldHolograms.call(view);
  assert.equal(player.classList.contains('has-real-hologram-model'), false);
});
