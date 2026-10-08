import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getCardById } from '../src/api.js';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { getDeckCopyIdentity, getPermanentCardName } from '../src/core/CardNameRules.js';
import { TRANSVERSE_CONTINUOUS_FIELD_SPELLS, getContinuousFieldSpellStatModifier } from '../src/core/ClassicFieldSpellEffects.js';
import { markFieldSpellPending, markFieldSpellResolved } from '../src/core/FieldSpellRules.js';
import { isStrictCardSupported } from '../src/core/StrictCardRegistry.js';

let serial = 0;
function card(id, side = 'player', overrides = {}) {
  const base = [...STARTER_CARDS, ...EXTRA_DECK_CARDS].find(item => item.id === id);
  assert.ok(base, `missing local card ${id}`);
  const result = new CardState({ ...base, ...overrides, uid: `transverse-${++serial}` });
  result.ownerId = result.controllerId = side;
  return result;
}
function duel() {
  const result = new DuelGame();
  result.phases.currentPhase = 'main1';
  result.phases.turnCount = 2;
  result.delay = async () => true;
  result.startPhaseFlow = () => {};
  return result;
}
function put(game, id, side = 'player', index = 0, overrides = {}) {
  const result = card(id, side, overrides);
  game.field.setMonsterZone(side, index, result);
  return result;
}
function hand(game, id, side = 'player', overrides = {}) {
  const result = card(id, side, overrides);
  result.location = 'hand';
  game[`${side}Hand`].push(result);
  return result;
}
function field(game, id, side = 'player') {
  const result = card(id, side);
  game.field.placeFieldSpell(side, result);
  markFieldSpellResolved(result, ++serial);
  return result;
}

test('permanent Umi identity survives negation and leaving the field, without changing printed identity', () => {
  const ocean = card('295517');
  const printedName = ocean.name;
  for (const location of ['deck', 'hand', 'field_zone', 'graveyard', 'banished']) {
    ocean.location = location;
    ocean.effectNegated = true;
    assert.equal(ocean.getName(), 'Umi');
    assert.equal(getPermanentCardName(ocean, 'fr'), 'Umi');
    assert.equal(getDeckCopyIdentity(ocean), '22702055');
    assert.equal(ocean.id, '295517');
    assert.equal(ocean.name, printedName);
  }
  for (const id of ['00295517', 295517, '22702055', '34103656', '2819435', '26534688']) {
    assert.equal(getDeckCopyIdentity(id), '22702055');
  }
  assert.equal(getDeckCopyIdentity('82999629'), '82999629', 'Umiiruka has its own name');
});

test('Ocean changes both hands and face-up field WATER Levels, but not ATK in hand, Set monsters, deck or GY', () => {
  const game = duel();
  field(game, '295517');
  const a = hand(game, '43793530');
  const b = hand(game, '43793530', 'opponent');
  const c = put(game, '43793530');
  const hidden = put(game, '43793530', 'opponent');
  hidden.isSetFaceDown = true;
  const grave = card('43793530');
  game.field.sendToGraveyard(grave, grave.ownerId);
  const deck = card('43793530');
  game.playerDeck.push(deck);
  game.stabilizer.stabilize(game);
  assert.equal(a.getLevel(), 4);
  assert.equal(b.getLevel(), 4);
  assert.equal(a.getAtk(), 2450);
  assert.equal(a.getDef(), 1500);
  assert.equal(c.getLevel(), 4);
  assert.equal(c.getAtk(), 2650);
  assert.equal(c.getDef(), 1700);
  for (const unchanged of [hidden, grave, deck]) {
    assert.equal(unchanged.getLevel(), 5);
    assert.equal(unchanged.getAtk(), 2450);
  }
});

for (const isSet of [false, true]) test(`Ocean permits a real Giga Gagagigo ${isSet ? 'Normal Set' : 'Normal Summon'} without a Tribute after resolving`, async () => {
  const game = duel();
  const giga = hand(game, '43793530');
  const ocean = hand(game, '295517');
  assert.equal(game.getAvailableActions().normalSummonCardUids.includes(giga.uid), false);
  game.openChainResponseWindow = async () => {
    assert.equal(giga.getLevel(), 5);
    assert.equal(ocean.fieldActivationState, 'pending');
  };
  assert.equal(await game.activateFieldSpellFromHand(ocean.uid), true);
  assert.equal(giga.getLevel(), 4);
  assert.equal(game.getAvailableActions().normalSummonCardUids.includes(giga.uid), true);
  game.openChainResponseWindow = async () => {};
  assert.equal(await (isSet ? game.setMonsterFaceDown(giga.uid, 0) : game.summonMonster(giga.uid, 0)), true);
  assert.equal(game.pendingSummon, null);
  assert.equal(game.field.getMonsterZone('player', 0), giga);
  assert.equal(giga.getLevel(), isSet ? 5 : 4);
  assert.equal(giga.getAtk(), isSet ? 2450 : 2650);
});

test('two Oceans stack while Levels never drop below one, and removing or negating a source refreshes the hand', () => {
  const game = duel();
  const first = field(game, '295517');
  const second = field(game, '295517', 'opponent');
  const slime = hand(game, '68638985');
  const giga = hand(game, '43793530');
  const visible = put(game, '68638985');
  game.stabilizer.stabilize(game);
  assert.equal(slime.getLevel(), 1);
  assert.equal(giga.getLevel(), 3);
  assert.equal(visible.getLevel(), 1);
  assert.equal(visible.getAtk(), 1100);
  first.effectNegated = true;
  game.stabilizer.stabilize(game);
  assert.equal(giga.getLevel(), 4);
  game.field.sendToGraveyard(second, second.ownerId);
  game.stabilizer.stabilize(game);
  assert.equal(giga.getLevel(), 5);
  assert.equal(visible.getAtk(), 700);
});

test('Ocean updates actual Xyz and Synchro choices using the material Level, without changing Extra Deck Levels', async () => {
  const game = duel();
  const giga = put(game, '43793530');
  put(game, '20721928', 'player', 1);
  const utopia = game.playerExtraDeck.find(item => item.id === '84013237');
  assert.equal(game.getAvailableActions().xyzExtraUids.includes(utopia.uid), false);
  field(game, '295517');
  assert.equal(game.getAvailableActions().xyzExtraUids.includes(utopia.uid), true);
  assert.equal(await game.performXyzSummon('player', utopia.uid), true);
  assert.ok(utopia.xyzMaterials.includes(giga));
  assert.equal(giga.getLevel(), 5, 'the overlaid material is no longer on the field');
  assert.equal(utopia.getLevel(), 0);

  const other = duel();
  put(other, '43793530');
  put(other, '63977008', 'player', 1);
  const stardust = other.playerExtraDeck.find(item => item.id === '44508094');
  assert.equal(other.getAvailableActions().synchroExtraUids.includes(stardust.uid), true);
  field(other, '295517');
  assert.equal(other.getAvailableActions().synchroExtraUids.includes(stardust.uid), false);
  assert.equal(stardust.getLevel(), 8);
});

test('Ocean updates Pendulum bounds and Ritual hand material Levels; face-down Ritual materials retain their printed Level', () => {
  const game = duel();
  const giga = hand(game, '43793530');
  const junk = hand(game, '63977008');
  const ritual = hand(game, '05405694');
  const spell = hand(game, '55761792');
  assert.equal(game.summons.validatePendulumSummon(1, 5, giga, { controllerId: 'player' }), false);
  assert.equal(game.summons.createRitualSummonPlan(ritual, spell, [giga, junk], { controllerId: 'player' }).valid, true);
  field(game, '295517');
  game.stabilizer.stabilize(game);
  assert.equal(game.summons.validatePendulumSummon(1, 5, giga, { controllerId: 'player' }), true);
  assert.equal(game.summons.createRitualSummonPlan(ritual, spell, [giga, junk], { controllerId: 'player' }).valid, false);
  game.playerHand.splice(game.playerHand.indexOf(giga), 1);
  game.field.setMonsterZone('player', 0, giga);
  giga.isSetFaceDown = true;
  game.stabilizer.stabilize(game);
  assert.equal(giga.getLevel(), 5);
  assert.equal(game.summons.createRitualSummonPlan(ritual, spell, [giga, junk], { controllerId: 'player' }).valid, true);
});

test('Ocean Level change applies before Wetlands and Saber Vault statistics', () => {
  const game = duel();
  field(game, '2084239');
  field(game, '295517', 'opponent');
  const slime = put(game, '68638985', 'player', 0, { level: 3 });
  game.stabilizer.stabilize(game);
  assert.equal(slime.getLevel(), 2);
  assert.equal(slime.getAtk(), 2100);
  const other = duel();
  field(other, '73787254');
  field(other, '295517', 'opponent');
  const saber = put(other, '23115241');
  saber.activeModifiers = [{ type: 'attribute', value: 'WATER' }];
  other.stabilizer.stabilize(other);
  assert.equal(saber.getLevel(), 3);
  assert.equal(saber.getAtk(), 2300);
  assert.equal(saber.getDef(), 1000);
});

test('Saber Vault follows current Level on both sides and never treats a Rank as a Level', () => {
  const game = duel();
  field(game, '73787254');
  const saber = put(game, '23115241');
  const enemy = put(game, '23115241', 'opponent');
  game.stabilizer.stabilize(game);
  for (const monster of [saber, enemy]) {
    assert.equal(monster.getAtk(), 2200);
    assert.equal(monster.getDef(), 700);
  }
  saber.activeModifiers = [{ type: 'level', value: 2 }];
  game.stabilizer.stabilize(game);
  assert.equal(saber.getAtk(), 2400);
  assert.equal(saber.getDef(), 500);
  assert.deepEqual(getContinuousFieldSpellStatModifier({ name_en: 'X-Saber fixture', type: 'Xyz Monster', rank: 4, level: 4 }, '73787254'), { atk: 0, def: 0 });
});

test('Closed Forest counts only its controller GY monsters and loses its Beast bonus under Zombie World', () => {
  const game = duel();
  field(game, '78082039');
  const own = put(game, '64428736');
  const enemy = put(game, '64428736', 'opponent');
  game.field.sendToGraveyard(card('46986414'), 'player');
  game.field.sendToGraveyard(card('83764718'), 'player');
  game.field.sendToGraveyard(card('46986414', 'opponent'), 'opponent');
  game.stabilizer.stabilize(game);
  assert.equal(own.getAtk(), 1600);
  assert.equal(enemy.getAtk(), 1500);
  field(game, '4064256', 'opponent');
  game.stabilizer.stabilize(game);
  assert.equal(own.currentRace, 'Zombie');
  assert.equal(own.race, 'Beast');
  assert.equal(own.getAtk(), 1500);
});

test('Jurassic World boosts both players and follows Zombie World Type changes', () => {
  const game = duel();
  field(game, '10080320');
  const own = put(game, '81823360');
  const enemy = put(game, '81823360', 'opponent');
  game.stabilizer.stabilize(game);
  for (const monster of [own, enemy]) {
    assert.equal(monster.getAtk(), 2300);
    assert.equal(monster.getDef(), 300);
  }
  const zombie = field(game, '4064256', 'opponent');
  game.stabilizer.stabilize(game);
  assert.equal(own.getAtk(), 2000);
  zombie.effectNegated = true;
  game.stabilizer.stabilize(game);
  assert.equal(own.currentRace, 'Dinosaur');
  assert.equal(own.getAtk(), 2300);
});

test('Acidic Downpour stacks both-side EARTH penalties and never creates Link DEF', () => {
  const game = duel();
  field(game, '35956022');
  field(game, '35956022', 'opponent');
  const own = put(game, '23115241');
  const enemy = put(game, '23115241', 'opponent');
  const link = card('77637979', 'player', { attribute: 'EARTH' });
  game.field.setExtraMonsterZone(0, 'player', link);
  game.stabilizer.stabilize(game);
  for (const monster of [own, enemy]) {
    assert.equal(monster.getAtk(), 800);
    assert.equal(monster.getDef(), 1900);
  }
  assert.equal(link.getDef(), null);
});

test('Sorcerous Spell Wall changes ATK/DEF immediately with the turn and applies only to its controller including Extra Zones', () => {
  const game = duel();
  field(game, '81231742');
  const own = put(game, '23115241');
  const enemy = put(game, '23115241', 'opponent');
  const link = card('77637979');
  game.field.setExtraMonsterZone(0, 'player', link);
  game.stabilizer.stabilize(game);
  assert.equal(own.getAtk(), 2100);
  assert.equal(own.getDef(), 1100);
  assert.equal(enemy.getAtk(), 1800);
  assert.equal(link.getAtk(), 1500);
  game.phases.currentTurnOwner = 'opponent';
  game.stabilizer.stabilize(game);
  assert.equal(own.getAtk(), 1800);
  assert.equal(own.getDef(), 1400);
  assert.equal(enemy.getDef(), 1100);
  assert.equal(link.getAtk(), 1200);
  assert.equal(link.getDef(), null);
});

for (const definition of TRANSVERSE_CONTINUOUS_FIELD_SPELLS) {
  test(`${definition.name_en} activates in the real Duel runtime, and its source loses continuous influence if pending, Set or negated`, async () => {
    const game = duel();
    const source = hand(game, definition.id);
    assert.equal(await game.activateFieldSpellFromHand(source.uid), true);
    assert.equal(source.fieldActivationState, 'resolved');
    const probe = put(game, definition.id === '73787254' ? '23115241' : definition.id === '10080320' ? '81823360' : definition.id === '78082039' ? '64428736' : definition.id === '295517' ? '43793530' : '23115241');
    if (definition.id === '78082039') game.field.sendToGraveyard(card('46986414'), 'player');
    game.stabilizer.stabilize(game);
    const expected = probe.getAtk();
    assert.notEqual(expected, probe.baseAtk);
    for (const state of ['negated', 'Set', 'pending']) {
      source.effectNegated = state === 'negated';
      source.isSetFaceDown = state === 'Set';
      if (state === 'pending') markFieldSpellPending(source);
      game.stabilizer.stabilize(game);
      assert.equal(probe.getAtk(), probe.baseAtk, state);
      source.isSetFaceDown = false;
      source.effectNegated = false;
      markFieldSpellResolved(source, ++serial);
      game.stabilizer.stabilize(game);
      assert.equal(probe.getAtk(), expected);
    }
  });
}

test('all new exact Field and Normal templates load locally with Konami sources and original JPEG textures', async () => {
  const ids = ['295517', '73787254', '78082039', '10080320', '35956022', '81231742', '4064256', '68462976', '92481084', '28120197', '11102908', '53527835', '23115241', '44430454', '81823360', '43793530'];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => assert.fail('the exact local card pool must not request an API');
  try {
    for (const id of ids) {
      const template = await getCardById(id.padStart(8, '0'));
      assert.equal(isStrictCardSupported(template, 'main'), true, id);
      assert.match(template.rulesSourceUrl, /^https:\/\/www\.db\.yugioh-card\.com\/yugiohdb\/card_search\.action\?ope=2&cid=\d+&request_locale=fr$/);
      const instance = new CardState(template);
      for (const texture of [instance.image_url, instance.image_url_cropped]) {
        assert.match(texture, new RegExp(`^/cards/(?:small|cropped)/${id}\\.jpg$`));
        const buffer = readFileSync(new URL(`../public${texture}`, import.meta.url));
        assert.equal(buffer[0], 0xff);
        assert.equal(buffer[1], 0xd8);
        assert.ok(buffer.length > 10000);
      }
    }
  } finally { globalThis.fetch = previousFetch; }
});
