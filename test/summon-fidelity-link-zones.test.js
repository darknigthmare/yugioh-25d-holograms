import test from 'node:test';
import assert from 'node:assert/strict';
import { CardState } from '../src/core/CardState.js';
import { FieldState } from '../src/core/FieldState.js';
import { DuelGame } from '../src/game.js';
import { EXTRA_DECK_CARDS } from '../src/cards.js';
import { createLinkZoneGraph, getLinkedMainMonsterZoneIndices } from '../src/core/LinkZoneRules.js';

function link(uid, arrows) {
  return new CardState({
    id: uid, uid, name: uid, type: 'Link Effect Monster', card_type: 'monster',
    extra_type: 'link', linkRating: 2, atk: 1000, linkArrows: arrows
  });
}

function normal(uid, overrides = {}) {
  return new CardState({
    id: uid, uid, name: uid, type: 'Normal Monster', card_type: 'monster',
    level: 4, atk: 1000, def: 1000, ...overrides
  });
}

test('Link graph contains ten private Main Zones and two physically shared Extra Zones', () => {
  const { zones, links } = createLinkZoneGraph(new FieldState());
  assert.equal(zones.length, 12);
  assert.equal(links.size, 12);
  assert.equal(new Set(zones.map(zone => `${zone.x}:${zone.y}`)).size, 12);
  assert.deepEqual(zones.filter(zone => zone.side === 'opponent').map(zone => zone.x), [4, 3, 2, 1, 0]);
  assert.deepEqual(zones.filter(zone => zone.zoneType === 'extra').map(zone => [zone.x, zone.y]), [[1, 1], [3, 1]]);
  assert.deepEqual(getLinkedMainMonsterZoneIndices(new FieldState(), 'player'), []);
});

test('each EMZ diagonal and vertical arrow is oriented by its controller, on both shared zones', () => {
  // Expected zone IDs use actual DOM/FieldState indices, not player-relative EMZ indices.
  const cases = [
    ['player', 0, { top: 'opponent:main:3', 'top-left': 'opponent:main:4', 'top-right': 'opponent:main:2', bottom: 'player:main:1', 'bottom-left': 'player:main:0', 'bottom-right': 'player:main:2' }],
    ['player', 1, { top: 'opponent:main:1', 'top-left': 'opponent:main:2', 'top-right': 'opponent:main:0', bottom: 'player:main:3', 'bottom-left': 'player:main:2', 'bottom-right': 'player:main:4' }],
    ['opponent', 0, { top: 'player:main:1', 'top-left': 'player:main:2', 'top-right': 'player:main:0', bottom: 'opponent:main:3', 'bottom-left': 'opponent:main:2', 'bottom-right': 'opponent:main:4' }],
    ['opponent', 1, { top: 'player:main:3', 'top-left': 'player:main:4', 'top-right': 'player:main:2', bottom: 'opponent:main:1', 'bottom-left': 'opponent:main:0', 'bottom-right': 'opponent:main:2' }]
  ];
  for (const [side, index, arrows] of cases) {
    for (const [arrow, target] of Object.entries(arrows)) {
      const field = new FieldState();
      field.setExtraMonsterZone(index, side, link(`${side}-${index}-${arrow}`, [arrow]));
      assert.deepEqual([...createLinkZoneGraph(field).links.get(`extra:${index}`)], [target], `${side} EMZ ${index}: ${arrow}`);
    }
  }
});

test('Main Zone Links point horizontally and diagonally into the physical EMZs', () => {
  for (const side of ['player', 'opponent']) {
    const field = new FieldState();
    field.setMonsterZone(side, 2, link(`main-${side}`, ['left', 'right', 'top-left', 'top-right']));
    assert.deepEqual([...createLinkZoneGraph(field).links.get(`${side}:main:2`)], [
      `${side}:main:1`, `${side}:main:3`,
      `extra:${side === 'player' ? 0 : 1}`, `extra:${side === 'player' ? 1 : 0}`
    ]);
    assert.deepEqual(getLinkedMainMonsterZoneIndices(field, side), [1, 3]);
  }
});

test('straight upward arrows from the Main row reach only aligned Extra Zones', () => {
  for (const side of ['player', 'opponent']) {
    for (const index of [0, 1, 2, 3, 4]) {
      const field = new FieldState();
      field.setMonsterZone(side, index, link(`straight-${side}-${index}`, ['top']));
      const expected = index === 1 || index === 3
        ? [`extra:${side === 'player' ? (index - 1) / 2 : (3 - index) / 2}`] : [];
      assert.deepEqual([...createLinkZoneGraph(field).links.get(`${side}:main:${index}`)], expected);
    }
  }
});

test('arrows do not skip the space between EMZs, jump rows, or wrap board edges', () => {
  const field = new FieldState();
  field.setExtraMonsterZone(0, 'player', link('gap', ['left', 'right']));
  field.setMonsterZone('player', 0, link('edge', ['left', 'bottom', 'bottom-left', 'bottom-right', 'top']));
  field.setMonsterZone('opponent', 0, link('opposing-edge', ['left', 'bottom', 'bottom-left', 'bottom-right', 'top']));
  const graph = createLinkZoneGraph(field);
  for (const key of ['extra:0', 'player:main:0', 'opponent:main:0']) {
    assert.deepEqual([...graph.links.get(key)], []);
  }
});

test('either controller can supply arrows opening the other player Main Zones', () => {
  const field = new FieldState();
  const source = link('opponent-source', ['top', 'top-left', 'top-right']);
  source.ownerId = 'player'; // Orientation follows controller, not printed ownership.
  field.setExtraMonsterZone(1, 'opponent', source);
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'player'), [2, 3, 4]);
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'opponent'), []);
  field.extraMonsterZones[1].controllerId = 'player';
  source.controllerId = 'player';
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'opponent'), [0, 1, 2]);
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'player'), []);
});

test('negation does not erase Link Arrows but face-down and non-Link cards do not open zones', () => {
  const field = new FieldState();
  const source = link('negated', ['left', 'right']);
  field.setMonsterZone('player', 2, source);
  source.effectsNegatedUntilEndTurn = true;
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'player'), [1, 3]);
  source.isSetFaceDown = true;
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'player'), []);
  const nonLink = normal('not-link');
  nonLink.linkArrows = ['left', 'right'];
  field.setMonsterZone('player', 2, nonLink);
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'player'), []);
});

test('projecting materials removes their arrows and frees occupied targets without mutating the field', () => {
  const field = new FieldState();
  const source = link('source', ['bottom-left', 'bottom-right']);
  const material = normal('material');
  field.setExtraMonsterZone(0, 'player', source);
  field.setMonsterZone('player', 2, material);
  const before = JSON.stringify(field);
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'player'), [0]);
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'player', { excludedCards: [{ card: material }] }), [0, 2]);
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'player', { excludedCards: new Set([source, material]) }), []);
  assert.equal(JSON.stringify(field), before);
});

test('duplicate arrows and overlapping sources yield each open destination once in index order', () => {
  const field = new FieldState();
  field.setExtraMonsterZone(0, 'player', link('first', ['bottom-right', 'Bottom Right', 'bottom-left', 'invalid']));
  field.setExtraMonsterZone(1, 'player', link('second', ['bottom-left', 'bottom-right']));
  assert.deepEqual(getLinkedMainMonsterZoneIndices(field, 'player'), [0, 2, 4]);
});

test('co-links are reciprocal arrows between remaining Link Monsters, not all pointed zones', () => {
  const field = new FieldState();
  const left = link('co-left', ['bottom-right']);
  const middle = link('co-middle', ['top-left', 'top-right', 'left']);
  const right = link('co-right', ['bottom-left']);
  field.setExtraMonsterZone(0, 'player', left);
  field.setMonsterZone('player', 2, middle);
  field.setExtraMonsterZone(1, 'player', right);
  assert.deepEqual([...createLinkZoneGraph(field).coLinks.get('player:main:2')], ['extra:0', 'extra:1']);
  const projected = createLinkZoneGraph(field, { excludedCards: [right] });
  assert.deepEqual([...projected.links.get('player:main:2')], ['extra:0', 'extra:1', 'player:main:1']);
  assert.deepEqual([...projected.coLinks.get('player:main:2')], ['extra:0']);
});

test('live Link and Pendulum destination selectors share horizontal and cross-controller arrows', () => {
  const game = new DuelGame();
  game.field.setMonsterZone('player', 2, link('horizontal', ['left', 'right']));
  game.field.setExtraMonsterZone(0, 'opponent', link('enemy-pointing', ['top-right']));
  const destinations = game.getProjectedSpecialSummonDestinations('player', [], { mainMode: 'linked' });
  assert.deepEqual(destinations, [
    { zoneType: 'main', zoneIndex: 0 }, { zoneType: 'main', zoneIndex: 1 },
    { zoneType: 'main', zoneIndex: 3 }, { zoneType: 'extra', zoneIndex: 1 }
  ]);
  assert.deepEqual(game.getLinkedMainMonsterZoneIndices('player'), [0, 1, 3]);
  assert.deepEqual(game.getPendulumExtraDestinations('player'), [destinations[3], ...destinations.slice(0, 3)]);
});

test('live projected destinations use the final material field and preserve shared EMZ occupancy', () => {
  const game = new DuelGame();
  const source = link('departing-source', ['bottom-left', 'bottom-right']);
  const enemy = link('remaining-enemy', ['bottom-left', 'bottom-right']);
  game.field.setExtraMonsterZone(0, 'player', source);
  game.field.setExtraMonsterZone(1, 'opponent', enemy);
  assert.deepEqual(game.getProjectedSpecialSummonDestinations('player', [], { mainMode: 'linked' }), [
    { zoneType: 'main', zoneIndex: 0 }, { zoneType: 'main', zoneIndex: 2 }
  ]);
  assert.deepEqual(game.getProjectedSpecialSummonDestinations('player', [{ card: source }], { mainMode: 'linked' }), [
    { zoneType: 'extra', zoneIndex: 0 }
  ]);
  assert.deepEqual(game.getProjectedSpecialSummonDestinations('opponent', [], { mainMode: 'linked' }), [
    { zoneType: 'main', zoneIndex: 0 }, { zoneType: 'main', zoneIndex: 2 }
  ]);
  assert.equal(game.field.extraMonsterZones[0].card, source);
  assert.equal(game.field.extraMonsterZones[1].card, enemy);
});

test('unrestricted Fusion Synchro and Xyz Main destinations remain independent of Link Arrows', () => {
  const game = new DuelGame();
  game.field.setExtraMonsterZone(0, 'player', link('occupied-extra', []));
  const blocker = normal('blocker');
  game.field.setMonsterZone('player', 1, blocker);
  assert.deepEqual(game.getProjectedSpecialSummonDestinations('player').map(zone => zone.zoneIndex), [0, 2, 3, 4]);
  assert.deepEqual(game.getProjectedSpecialSummonDestinations('player', [blocker]).map(zone => zone.zoneIndex), [0, 1, 2, 3, 4]);
});

test('a live Link Summon can use an open Main Zone pointed to by a surviving Main Zone Link', async () => {
  const game = new DuelGame();
  const target = new CardState(EXTRA_DECK_CARDS.find(card => card.id === '77637979'));
  target.controllerId = 'player';
  target.ownerId = 'player';
  target.location = 'extra_deck';
  game.playerExtraDeck = [target];
  // Both EMZs are unavailable. The old destination heuristic found no legal zone.
  const ownExtra = normal('own-extra-blocker', { type: 'Fusion Monster', extra_type: 'fusion' });
  const enemyExtra = normal('enemy-extra-blocker', { type: 'Fusion Monster', extra_type: 'fusion' });
  game.field.setExtraMonsterZone(0, 'player', ownExtra);
  game.field.setExtraMonsterZone(1, 'opponent', enemyExtra);
  const source = link('surviving-main-link', ['left', 'right']);
  game.field.setMonsterZone('player', 2, source);
  const materialA = normal('material-a');
  const materialB = normal('material-b');
  materialA.ownerId = 'player';
  materialB.ownerId = 'player';
  game.field.setMonsterZone('player', 0, materialA);
  game.field.setMonsterZone('player', 4, materialB);
  game.callbacks.onDecision = request => {
    if (request.type === 'select-link-materials') return [materialA.uid, materialB.uid];
    if (request.type === 'select-summon-destination') return 'main:3';
    return undefined;
  };
  assert.equal(await game.performLinkSummon('player', target.uid), true);
  assert.equal(game.playerMonsters[3], target);
  assert.equal(game.playerMonsters[2], source);
  assert.deepEqual(game.playerGraveyard, [materialA, materialB]);
  assert.equal(game.field.extraMonsterZones[0].card, ownExtra);
  assert.equal(game.field.extraMonsterZones[1].card, enemyExtra);
});
