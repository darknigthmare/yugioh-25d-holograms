import assert from 'node:assert/strict';
import test from 'node:test';
import { getCardById } from '../src/api.js';
import { STARTER_CARDS } from '../src/cards.js';
import { CardState } from '../src/core/CardState.js';
import {
  CONTINUOUS_FIELD_SPELLS,
  IMPLEMENTED_FIELD_SPELLS,
  SCRIPTED_FIELD_SPELLS,
  WETLANDS_FIELD_SPELL,
  getClassicFieldSpellModifier,
  getContinuousFieldSpellStatModifier
} from '../src/core/ClassicFieldSpellEffects.js';
import { markFieldSpellPending, markFieldSpellResolved } from '../src/core/FieldSpellRules.js';
import { isStrictCardSupported } from '../src/core/StrictCardRegistry.js';
import { DuelGame } from '../src/game.js';

let nextUid = 0;
function card(id, side = 'player', overrides = {}) {
  const template = STARTER_CARDS.find(candidate => candidate.id === id);
  assert.ok(template, `missing template ${id}`);
  const result = new CardState({ ...template, ...overrides, uid: `wetlands-${++nextUid}` });
  result.ownerId = side;
  result.controllerId = side;
  return result;
}

function game() {
  const duel = new DuelGame();
  duel.phases.currentPhase = 'main1';
  duel.phases.turnCount = 2;
  duel.delay = async () => true;
  duel.startPhaseFlow = () => {};
  return duel;
}

function wetlands(duel, side = 'player') {
  const source = card('2084239', side);
  duel.field.placeFieldSpell(side, source);
  markFieldSpellResolved(source, 1);
  return source;
}

const projection = { race: 'Aqua', attribute: 'WATER', level: 2, position: 'attack' };
for (const [name, overrides, expectedAtk] of [
  ['all three conditions at Level 2', {}, 1200],
  ['all three conditions at Level 1', { level: 1 }, 1200],
  ['Level 3 fails despite matching Type and Attribute', { level: 3 }, 0],
  ['zero is not a monster Level', { level: 0 }, 0],
  ['unknown Level fails', { level: '?' }, 0],
  ['Aqua alone fails with another Attribute', { attribute: 'LIGHT' }, 0],
  ['WATER alone fails with another Type', { race: 'Fish' }, 0],
  ['Xyz Rank does not count as Level', { type: 'Xyz Monster', extra_type: 'xyz', rank: 2 }, 0],
  ['Link has no Level', { type: 'Link Monster', extra_type: 'link' }, 0]
]) {
  test(`Wetlands requires ${name}`, () => {
    assert.deepEqual(getContinuousFieldSpellStatModifier({ ...projection, ...overrides }, '02084239'), {
      atk: expectedAtk, def: 0
    });
  });
}

test('Wetlands affects both players and qualifying Extra Zone monsters; negating the recipient preserves an external bonus', () => {
  const duel = game();
  wetlands(duel);
  const player = card('68638985');
  const opponent = card('68638985', 'opponent');
  const extra = card('68638985', 'opponent', { type: 'Synchro Monster', extra_type: 'synchro' });
  opponent.effectNegated = true;
  duel.field.setMonsterZone('player', 0, player);
  duel.field.setMonsterZone('opponent', 0, opponent);
  duel.field.setExtraMonsterZone(0, 'opponent', extra);
  duel.stabilizer.stabilize(duel);
  for (const monster of [player, opponent, extra]) {
    assert.equal(monster.getAtk(), 1900);
    assert.equal(monster.getDef(), 500);
  }
});

test('Wetlands follows changes to current Type, Attribute and Level without retaining previous bonuses', () => {
  const duel = game();
  wetlands(duel);
  const monster = card('68638985');
  duel.field.setMonsterZone('player', 0, monster);
  for (const [modifier, value] of [
    [{ type: 'level', value: 1 }, 700],
    [{ type: 'attribute', value: 'EARTH' }, 700],
    [{ type: 'race', value: 'Fish' }, 700]
  ]) {
    monster.activeModifiers = [];
    duel.stabilizer.stabilize(duel);
    assert.equal(monster.getAtk(), 1900);
    monster.activeModifiers.push(modifier);
    duel.stabilizer.stabilize(duel);
    assert.equal(monster.getAtk(), value);
    assert.equal(monster.getDef(), 500);
  }
  monster.activeModifiers = [];
  duel.stabilizer.stabilize(duel);
  assert.equal(monster.getAtk(), 1900);
});

test('Wetlands uses current qualifying properties even when the printed properties do not qualify', () => {
  const duel = game();
  wetlands(duel);
  const monster = card('20721928');
  duel.field.setMonsterZone('player', 0, monster);
  monster.activeModifiers = [
    { type: 'race', value: 'Aqua' },
    { type: 'attribute', value: 'WATER' },
    { type: 'level', value: -2 }
  ];
  duel.stabilizer.stabilize(duel);
  assert.equal(monster.getAtk(), 2800);
  assert.equal(monster.getDef(), 1400);
});

test('two Wetlands copies stack on a real Slime Toad Normal Summon without modifying DEF', async () => {
  const duel = game();
  wetlands(duel);
  wetlands(duel, 'opponent');
  const monster = card('68638985');
  monster.location = 'hand';
  duel.playerHand.push(monster);
  assert.equal(await duel.summonMonster(monster.uid, 0), true);
  assert.equal(duel.playerMonsters[0], monster);
  assert.equal(monster.getAtk(), 3100);
  assert.equal(monster.getDef(), 500);
  assert.equal(duel.summons.normalSummonAllowance.used, 1);
});

test('a real Wetlands activation grants its bonus only after the response Chain resolves', async () => {
  const duel = game();
  const source = card('2084239');
  source.location = 'hand';
  duel.playerHand.push(source);
  const monster = card('68638985', 'opponent');
  duel.field.setMonsterZone('opponent', 0, monster);
  let responseWindows = 0;
  duel.openChainResponseWindow = async () => {
    responseWindows++;
    duel.stabilizer.stabilize(duel);
    assert.equal(source.fieldActivationState, 'pending');
    assert.equal(monster.getAtk(), 700);
  };
  assert.equal(await duel.activateFieldSpellFromHand(source.uid), true);
  assert.equal(responseWindows, 1);
  assert.equal(monster.getAtk(), 1900);
});

test('Wetlands source must be resolved, active and retain its runtime instance; face-down monsters receive no bonus', () => {
  const duel = game();
  const source = wetlands(duel);
  const monster = card('68638985');
  duel.field.setMonsterZone('player', 0, monster);
  for (const disable of [
    () => { source.isSetFaceDown = true; },
    () => markFieldSpellPending(source),
    () => { source.effectNegated = true; },
    () => { source.activationNegated = true; },
    () => { monster.isSetFaceDown = true; },
    () => { source.fieldActivationRuntimeInstanceId = 'stale-instance'; }
  ]) {
    source.isSetFaceDown = false;
    source.effectNegated = false;
    source.activationNegated = false;
    monster.isSetFaceDown = false;
    markFieldSpellResolved(source, 1);
    assert.deepEqual(getClassicFieldSpellModifier(monster, source), { atk: 1200, def: 0 });
    disable();
    duel.stabilizer.stabilize(duel);
    assert.equal(monster.getAtk(), 700);
    assert.equal(monster.getDef(), 500);
  }
});

test('Wetlands and Umi apply their separate cumulative Type and Attribute rules', () => {
  const duel = game();
  wetlands(duel);
  const umi = card('22702055', 'opponent');
  duel.field.placeFieldSpell('opponent', umi);
  markFieldSpellResolved(umi, 2);
  const monster = card('68638985');
  duel.field.setMonsterZone('player', 0, monster);
  duel.stabilizer.stabilize(duel);
  assert.equal(monster.getAtk(), 2100);
  assert.equal(monster.getDef(), 700);
});

test('battle and trigger Field definitions never become permanent flat stat modifiers', () => {
  assert.equal(CONTINUOUS_FIELD_SPELLS.length, 20);
  assert.equal(IMPLEMENTED_FIELD_SPELLS.length, 29);
  assert.equal(new Set(IMPLEMENTED_FIELD_SPELLS.map(card => card.id)).size, 29);
  for (const definition of SCRIPTED_FIELD_SPELLS) {
    assert.equal(CONTINUOUS_FIELD_SPELLS.some(card => card.id === definition.id), false);
    assert.deepEqual(getContinuousFieldSpellStatModifier(projection, definition), { atk: 0, def: 0 });
  }
});

test('Wetlands exact passcode variants load its local official text and original assets', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => assert.fail('canonical local cards must not request network data');
  try {
    for (const passcode of ['02084239', '2084239', 2084239]) {
      const template = await getCardById(passcode);
      assert.equal(template.name_en, 'Wetlands');
      assert.equal(template.rulesText, WETLANDS_FIELD_SPELL.rulesText);
      assert.equal(isStrictCardSupported(template, 'main'), true);
      assert.equal(template.rulesSourceUrl, WETLANDS_FIELD_SPELL.rulesSourceUrl);
      const instance = new CardState(template);
      assert.equal(instance.image_url, '/cards/small/2084239.jpg');
      assert.equal(instance.image_url_cropped, '/cards/cropped/2084239.jpg');
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

for (const [id, name, race, attribute, level, atk, def] of [
  ['20721928', 'Elemental HERO Sparkman', 'Warrior', 'LIGHT', 4, 1600, 1400],
  ['68638985', 'Slime Toad', 'Aqua', 'WATER', 2, 700, 500],
  ['39552864', 'Mystical Shine Ball', 'Fairy', 'LIGHT', 2, 500, 500]
]) {
  test(`${name} is a canonical strict Normal Monster with its own original artwork and a real Normal Summon`, async () => {
    const duel = game();
    const monster = card(id);
    assert.equal(isStrictCardSupported(monster, 'main'), true);
    assert.equal(monster.name_en, name);
    assert.equal(monster.type, 'Normal Monster');
    assert.equal(monster.isEffectMonster, false);
    assert.equal(monster.race, race);
    assert.equal(monster.attribute, attribute);
    assert.equal(monster.getLevel(), level);
    assert.equal(monster.getAtk(), atk);
    assert.equal(monster.getDef(), def);
    assert.equal(monster.image_url, `/cards/small/${id}.jpg`);
    assert.equal(monster.image_url_cropped, `/cards/cropped/${id}.jpg`);
    monster.location = 'hand';
    duel.playerHand.push(monster);
    assert.equal(await duel.summonMonster(monster.uid, 0), true);
    assert.equal(duel.playerMonsters[0], monster);
  });
}
