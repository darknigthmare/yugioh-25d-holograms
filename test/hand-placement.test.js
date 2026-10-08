import assert from 'node:assert/strict';
import test from 'node:test';
import { STARTER_CARDS } from '../src/cards.js';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { getNormalSummonTributeCount as engineTributeCount } from '../src/core/FieldRuleRuntime.js';
import { getNormalSummonTributeCount, isHandPlacementDestinationLegal } from '../src/ui/HandPlacement.js';

async function oceanHand(level) {
  const game = new DuelGame();
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  game.startPhaseFlow = () => {};
  const base = level === 5 ? STARTER_CARDS.find(card => card.id === '43793530') : {
    id: 'water-level-seven-placement-fixture', name: 'Placement WATER Level 7 fixture',
    card_type: 'monster', type: 'Normal Monster', race: 'Reptile',
    attribute: 'WATER', level: 7, atk: 2000, def: 2000
  };
  const monster = new CardState(base);
  monster.ownerId = monster.controllerId = 'player';
  monster.location = 'hand';
  const ocean = new CardState(STARTER_CARDS.find(card => card.id === '295517'));
  ocean.ownerId = ocean.controllerId = 'player';
  ocean.location = 'hand';
  game.playerHand.push(monster, ocean);
  assert.equal(await game.activateFieldSpellFromHand(ocean.uid), true);
  return { game, monster };
}

test('a real Ocean activation lets hand Giga Gagagigo use an empty zone without a Tribute, while an occupied zone stays illegal', async () => {
  const { game, monster } = await oceanHand(5);
  assert.equal(monster.baseLevel, 5);
  assert.equal(monster.getLevel(), 4);
  assert.equal(getNormalSummonTributeCount(monster), 0);
  assert.equal(getNormalSummonTributeCount(monster), engineTributeCount(monster));
  assert.equal(isHandPlacementDestinationLegal({ card: monster, zoneType: 'monster', zoneIndex: 0 }), true);
  assert.equal(isHandPlacementDestinationLegal({
    card: monster, zoneType: 'monster', zoneIndex: 1,
    occupied: true, controlledMonsterCount: 5
  }), false);
  assert.equal(game.getAvailableActions().normalSummonCardUids.includes(monster.uid), true);
});

test('a real Ocean activation reduces a Level 7 CardState to one Tribute, with the same threshold as the engine', async () => {
  const { monster } = await oceanHand(7);
  assert.equal(monster.baseLevel, 7);
  assert.equal(monster.getLevel(), 6);
  assert.equal(getNormalSummonTributeCount(monster), 1);
  assert.equal(getNormalSummonTributeCount(monster), engineTributeCount(monster));
  assert.equal(isHandPlacementDestinationLegal({
    card: monster, zoneType: 'monster', zoneIndex: 0, controlledMonsterCount: 0
  }), false);
  for (const occupied of [false, true]) assert.equal(isHandPlacementDestinationLegal({
    card: monster, zoneType: 'monster', zoneIndex: 0,
    occupied, controlledMonsterCount: 1
  }), true);
});

test('placement uses a derived getter before currentLevel, and currentLevel before a printed plain-object level', () => {
  for (const card of [
    { card_type: 'monster', level: 5, currentLevel: 4 },
    { card_type: 'monster', level: 7, currentLevel: 7, getLevel: () => 4 }
  ]) {
    assert.equal(getNormalSummonTributeCount(card), 0);
    assert.equal(isHandPlacementDestinationLegal({ card, zoneType: 'monster', zoneIndex: 0 }), true);
    assert.equal(isHandPlacementDestinationLegal({ card, zoneType: 'monster', zoneIndex: 0, occupied: true, controlledMonsterCount: 2 }), false);
  }
  assert.equal(getNormalSummonTributeCount({ level: 7 }), 2);
});
