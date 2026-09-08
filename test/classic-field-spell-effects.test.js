import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { STARTER_CARDS } from '../src/cards.js';
import { CLASSIC_FIELD_SPELLS } from '../src/core/ClassicFieldSpellEffects.js';
import { markFieldSpellResolved, markFieldSpellPending } from '../src/core/FieldSpellRules.js';
import { isStrictCardSupported } from '../src/core/StrictCardRegistry.js';

let uid = 0;
function card(data = {}, side = 'player') {
  const result = new CardState({ id: '89631139', name: 'Test', type: 'Normal Monster',
    card_type: 'monster', race: 'Dragon', atk: 1000, def: 800, level: 4, ...data,
    uid: `classic-field-${++uid}` });
  result.ownerId = side;
  result.controllerId = side;
  return result;
}
function game() {
  const result = new DuelGame();
  result.phases.currentPhase = 'main1';
  result.phases.turnCount = 2;
  result.delay = async () => true;
  return result;
}
function terrain(duel, id, side = 'player') {
  const source = card(STARTER_CARDS.find(entry => entry.id === id), side);
  duel.field.placeFieldSpell(side, source);
  markFieldSpellResolved(source, 1);
  return source;
}

for (const config of CLASSIC_FIELD_SPELLS) {
  test(`${config.name_en}: official race bonuses and penalties apply to both controllers`, () => {
    const duel = game();
    terrain(duel, config.id);
    for (const [races, delta] of [[config.boostedRaces, 200], [config.weakenedRaces, -200], [['Cyberse'], 0]]) {
      for (const race of races) {
        for (const side of ['player', 'opponent']) {
          const monster = card({ race }, side);
          duel.field.setMonsterZone(side, 0, monster);
          duel.stabilizer.stabilize(duel);
          assert.equal(monster.getAtk(), 1000 + delta, `${side} ${race} ATK`);
          assert.equal(monster.getDef(), 800 + delta, `${side} ${race} DEF`);
        }
      }
    }
  });

  test(`${config.name_en}: the real strict activation enables statistics only after resolution`, async () => {
    const duel = game();
    const source = card(STARTER_CARDS.find(entry => entry.id === config.id));
    assert.equal(isStrictCardSupported(source, 'main'), true);
    source.location = 'hand';
    duel.playerHand.push(source);
    const monster = card({ race: config.boostedRaces[0] });
    duel.field.setMonsterZone('player', 0, monster);
    let responses = 0;
    duel.openChainResponseWindow = async () => {
      responses++;
      duel.stabilizer.stabilize(duel);
      assert.equal(source.fieldActivationState, 'pending');
      assert.equal(monster.getAtk(), 1000);
    };
    assert.equal(await duel.activateFieldSpellFromHand(source.uid), true);
    assert.equal(responses, 1);
    assert.equal(monster.getAtk(), 1200);
    assert.equal(source.location, 'field_zone');
  });
}

test('two active Yami stack across the shared Extra Zone; negating the recipient does not remove external bonuses', () => {
  const duel = game();
  const a = terrain(duel, '59197169');
  const b = terrain(duel, '59197169', 'opponent');
  const monster = card({ race: 'Spellcaster', type: 'Synchro Effect Monster', extra_type: 'synchro' });
  duel.field.setExtraMonsterZone(0, 'player', monster);
  monster.effectNegated = true;
  duel.stabilizer.stabilize(duel);
  assert.equal(monster.getAtk(), 1400);
  a.effectNegated = true;
  duel.stabilizer.stabilize(duel);
  assert.equal(monster.getAtk(), 1200);
  duel.field.sendToGraveyard(b, b.ownerId);
  duel.stabilizer.stabilize(duel);
  assert.equal(monster.getAtk(), 1000);
});

test('pending, face-down and negated Field Spells never grant statistics; face-down monsters never gain them', () => {
  const duel = game();
  const source = terrain(duel, '59197169');
  const monster = card({ race: 'Fiend' });
  duel.field.setMonsterZone('player', 0, monster);
  for (const disable of [() => { source.isSetFaceDown = true; }, () => markFieldSpellPending(source),
    () => { source.effectNegated = true; }, () => { monster.isSetFaceDown = true; }]) {
    source.isSetFaceDown = false; source.effectNegated = false; monster.isSetFaceDown = false;
    markFieldSpellResolved(source, 1);
    disable();
    duel.stabilizer.stabilize(duel);
    assert.equal(monster.getAtk(), 1000);
  }
});

test('current monster Type determines a Field bonus, and Link monsters still have no DEF', () => {
  const duel = game();
  terrain(duel, '86318356');
  const monster = card({ race: 'Cyberse', type: 'Link Monster', extra_type: 'link', linkRating: 2 });
  duel.field.setMonsterZone('player', 0, monster);
  monster.activeModifiers.push({ type: 'race', value: 'Warrior' });
  duel.stabilizer.stabilize(duel);
  assert.equal(monster.getAtk(), 1200);
  assert.equal(monster.getDef(), null);
});

test('leaving and returning a Field Spell requires a fresh successful activation', () => {
  const duel = game();
  const source = terrain(duel, '59197169');
  const monster = card({ race: 'Fiend' });
  duel.field.setMonsterZone('player', 0, monster);
  duel.stabilizer.stabilize(duel);
  assert.equal(monster.getAtk(), 1200);
  duel.field.sendToGraveyard(source, source.ownerId);
  duel.field.placeFieldSpell('player', source);
  duel.stabilizer.stabilize(duel);
  assert.equal(monster.getAtk(), 1000);
});
