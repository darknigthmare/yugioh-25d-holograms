import assert from 'node:assert/strict';
import test from 'node:test';
import { getCardById } from '../src/api.js';
import { STARTER_CARDS } from '../src/cards.js';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import {
  ADDITIONAL_FIELD_SPELLS,
  CONTINUOUS_FIELD_SPELLS,
  getContinuousFieldSpellStatModifier
} from '../src/core/ClassicFieldSpellEffects.js';
import { markFieldSpellPending, markFieldSpellResolved } from '../src/core/FieldSpellRules.js';
import { isStrictCardSupported } from '../src/core/StrictCardRegistry.js';

let nextUid = 0;
function monster(data = {}, side = 'player') {
  const card = new CardState({
    id: '89631139', name: 'Field effect fixture', type: 'Normal Monster',
    card_type: 'monster', race: 'Dragon', attribute: 'EARTH',
    atk: 1000, def: 800, level: 4, ...data, uid: `additional-field-${++nextUid}`
  });
  card.ownerId = side;
  card.controllerId = side;
  return card;
}

function spell(id, side = 'player') {
  return monster(STARTER_CARDS.find(card => card.id === id), side);
}

function game(callbacks = {}) {
  const duel = new DuelGame(callbacks);
  duel.phases.currentPhase = 'main1';
  duel.phases.turnCount = 2;
  duel.delay = async () => true;
  duel.startPhaseFlow = () => {};
  return duel;
}

function activeField(duel, id, side = 'player') {
  const source = spell(id, side);
  duel.field.placeFieldSpell(side, source);
  markFieldSpellResolved(source, 1);
  return source;
}

for (const config of ADDITIONAL_FIELD_SPELLS) {
  const attribute = config.attribute || 'EARTH';
  const defenseOnly = config.id === '81380218';

  test(`${config.name_en} applies its official statistics to both players in Main and Extra Zones`, () => {
    const duel = game();
    activeField(duel, config.id);
    for (const [side, extraIndex] of [['player', 0], ['opponent', 1]]) {
      const attack = monster({ attribute }, side);
      const defense = monster({ attribute }, side);
      defense.position = 'defense';
      const extra = monster({ attribute, type: 'Synchro Monster', extra_type: 'synchro' }, side);
      extra.position = 'defense';
      const otherAttribute = monster({ attribute: attribute === 'EARTH' ? 'DARK' : 'EARTH' }, side);
      otherAttribute.position = 'defense';
      const hidden = monster({ attribute }, side);
      hidden.isSetFaceDown = true;
      hidden.position = 'defense';
      duel.field.setMonsterZone(side, 0, attack);
      duel.field.setMonsterZone(side, 1, defense);
      duel.field.setMonsterZone(side, 2, otherAttribute);
      duel.field.setMonsterZone(side, 3, hidden);
      duel.field.setExtraMonsterZone(extraIndex, side, extra);
      duel.stabilizer.stabilize(duel);

      assert.equal(attack.getAtk(), defenseOnly ? 1000 : 1500);
      assert.equal(attack.getDef(), defenseOnly ? 800 : 400);
      for (const candidate of [defense, extra]) {
        assert.equal(candidate.getAtk(), defenseOnly ? 1000 : 1500);
        assert.equal(candidate.getDef(), defenseOnly ? 1300 : 400);
      }
      assert.equal(otherAttribute.getAtk(), 1000);
      assert.equal(otherAttribute.getDef(), defenseOnly ? 1300 : 800);
      assert.equal(hidden.getAtk(), 1000);
      assert.equal(hidden.getDef(), 800);
    }
  });

  test(`${config.name_en} strict activation only applies the continuous effect after its Chain resolves`, async () => {
    const duel = game();
    const source = spell(config.id);
    assert.equal(isStrictCardSupported(source, 'main'), true);
    source.location = 'hand';
    duel.playerHand.push(source);
    const candidate = monster({ attribute });
    candidate.position = 'defense';
    duel.field.setMonsterZone('player', 0, candidate);
    let windows = 0;
    duel.openChainResponseWindow = async () => {
      windows++;
      duel.stabilizer.stabilize(duel);
      assert.equal(source.fieldActivationState, 'pending');
      assert.equal(candidate.getAtk(), 1000);
      assert.equal(candidate.getDef(), 800);
    };
    assert.equal(await duel.activateFieldSpellFromHand(source.uid), true);
    assert.equal(windows, 1);
    assert.equal(source.fieldActivationState, 'resolved');
    assert.equal(candidate.getAtk(), defenseOnly ? 1000 : 1500);
    assert.equal(candidate.getDef(), defenseOnly ? 1300 : 400);
  });

  test(`${config.name_en} stops applying while Set, pending, negated or outside its original field instance`, () => {
    const duel = game();
    const source = activeField(duel, config.id);
    const candidate = monster({ attribute });
    candidate.position = 'defense';
    duel.field.setMonsterZone('player', 0, candidate);
    for (const disable of [
      () => { source.isSetFaceDown = true; },
      () => markFieldSpellPending(source),
      () => { source.effectNegated = true; },
      () => { source.activationNegated = true; },
      () => {
        duel.field.sendToGraveyard(source, source.ownerId);
        duel.field.placeFieldSpell('player', source);
      }
    ]) {
      source.isSetFaceDown = false;
      source.effectNegated = false;
      source.activationNegated = false;
      markFieldSpellResolved(source, 1);
      duel.stabilizer.stabilize(duel);
      assert.equal(candidate.getDef(), defenseOnly ? 1300 : 400);
      disable();
      duel.stabilizer.stabilize(duel);
      assert.equal(candidate.getAtk(), 1000);
      assert.equal(candidate.getDef(), 800);
    }
  });

  test(`MST chained to ${config.name_en} destroys it before any continuous statistics apply`, async () => {
    let mst;
    let source;
    const duel = game({
      onChainOpportunity: request => request.candidates.find(candidate => candidate.cardUid === mst?.uid)?.cardUid || null,
      onDecision: request => request.type === 'select-mst-target'
        ? request.candidates.find(candidate => candidate.uid === source?.uid)?.uid : undefined
    });
    const candidate = monster({ attribute });
    candidate.position = 'defense';
    duel.field.setMonsterZone('player', 0, candidate);
    mst = spell('05318639', 'opponent');
    mst.isSetFaceDown = true;
    duel.field.setSpellZone('opponent', 0, mst);
    mst.turnSet = 1;
    source = spell(config.id);
    source.location = 'hand';
    duel.playerHand.push(source);

    assert.equal(await duel.activateFieldSpellFromHand(source.uid), false);
    assert.ok(duel.playerGraveyard.includes(source));
    assert.ok(duel.opponentGraveyard.includes(mst));
    assert.equal(duel.field.playerFieldSpellZone, null);
    assert.equal(candidate.getAtk(), 1000);
    assert.equal(candidate.getDef(), 800);
  });
}

test('identical attribute Fields stack for both players; external bonuses survive negation of the recipient', () => {
  const duel = game();
  const first = activeField(duel, '56594520');
  const second = activeField(duel, '56594520', 'opponent');
  const candidates = ['player', 'opponent'].map(side => {
    const candidate = monster({ attribute: 'EARTH' }, side);
    candidate.effectNegated = true;
    duel.field.setMonsterZone(side, 0, candidate);
    return candidate;
  });
  duel.stabilizer.stabilize(duel);
  for (const candidate of candidates) {
    assert.equal(candidate.getAtk(), 2000);
    assert.equal(candidate.getDef(), 0);
  }
  first.effectNegated = true;
  duel.stabilizer.stabilize(duel);
  for (const candidate of candidates) {
    assert.equal(candidate.getAtk(), 1500);
    assert.equal(candidate.getDef(), 400);
  }
  duel.field.sendToGraveyard(second, 'opponent');
  duel.stabilizer.stabilize(duel);
  for (const candidate of candidates) assert.equal(candidate.getAtk(), 1000);
});

test('current Attribute changes select the matching Field without accumulating stale bonuses', () => {
  const duel = game();
  activeField(duel, '56594520');
  activeField(duel, '18161786', 'opponent');
  const candidate = monster({ attribute: 'EARTH' });
  duel.field.setMonsterZone('player', 0, candidate);
  duel.stabilizer.stabilize(duel);
  assert.equal(candidate.getAtk(), 1500);
  candidate.activeModifiers.push({ type: 'attribute', value: 'DARK' });
  duel.stabilizer.stabilize(duel);
  assert.equal(candidate.currentAttribute, 'DARK');
  assert.equal(candidate.getAtk(), 1500);
  assert.equal(candidate.getDef(), 400);
  candidate.activeModifiers[0].value = 'WIND';
  duel.stabilizer.stabilize(duel);
  assert.equal(candidate.getAtk(), 1000);
  assert.equal(candidate.getDef(), 800);
});

test('race and Attribute Fields combine, and Link monsters never acquire DEF', () => {
  const duel = game();
  activeField(duel, '86318356');
  activeField(duel, '56594520', 'opponent');
  const warrior = monster({ race: 'Warrior', attribute: 'EARTH' });
  const link = monster({ race: 'Warrior', attribute: 'EARTH', type: 'Link Monster', extra_type: 'link', linkRating: 2 });
  duel.field.setMonsterZone('player', 0, warrior);
  duel.field.setExtraMonsterZone(0, 'opponent', link);
  duel.stabilizer.stabilize(duel);
  assert.equal(warrior.getAtk(), 1700);
  assert.equal(warrior.getDef(), 600);
  assert.equal(link.getAtk(), 1700);
  assert.equal(link.getDef(), null);
  assert.equal(getContinuousFieldSpellStatModifier(link, '56594520').def, 0);
});

test('Chorus follows real position changes and stacks with an Attribute Field', async () => {
  const duel = game();
  activeField(duel, '81380218');
  activeField(duel, '56594520', 'opponent');
  const candidate = monster({ attribute: 'EARTH' });
  duel.field.setMonsterZone('player', 0, candidate);
  duel.stabilizer.stabilize(duel);
  assert.equal(candidate.getAtk(), 1500);
  assert.equal(candidate.getDef(), 400);
  await duel.toggleMonsterPosition(0);
  assert.equal(candidate.position, 'defense');
  assert.equal(candidate.getAtk(), 1500);
  assert.equal(candidate.getDef(), 900);
  candidate.hasChangedPositionThisTurn = false;
  await duel.toggleMonsterPosition(0);
  assert.equal(candidate.position, 'attack');
  assert.equal(candidate.getDef(), 400);
});

test('two Chorus Fields stack for face-up Defense Position monsters, including the Extra Zone', () => {
  const duel = game();
  activeField(duel, '81380218');
  activeField(duel, '81380218', 'opponent');
  const candidate = monster({ type: 'Fusion Monster', extra_type: 'fusion' }, 'opponent');
  candidate.position = 'defense';
  duel.field.setExtraMonsterZone(1, 'opponent', candidate);
  duel.stabilizer.stabilize(duel);
  assert.equal(candidate.getAtk(), 1000);
  assert.equal(candidate.getDef(), 1800);
  candidate.isSetFaceDown = true;
  duel.stabilizer.stabilize(duel);
  assert.equal(candidate.getDef(), 800);
});

test('public AI projections share the exact continuous rules without requiring field or activation state', () => {
  assert.equal(CONTINUOUS_FIELD_SPELLS.length, 14);
  const projection = { attribute: 'EARTH', race: 'Warrior', position: 'defense', location: 'hand' };
  assert.deepEqual(getContinuousFieldSpellStatModifier(projection, '56594520'), { atk: 500, def: -400 });
  assert.deepEqual(getContinuousFieldSpellStatModifier(projection, '86318356'), { atk: 200, def: 200 });
  assert.deepEqual(getContinuousFieldSpellStatModifier(projection, ADDITIONAL_FIELD_SPELLS.find(card => card.id === '81380218')), { atk: 0, def: 500 });
  assert.deepEqual(getContinuousFieldSpellStatModifier({ ...projection, type: 'Link Monster' }, '56594520'), { atk: 500, def: 0 });
  assert.deepEqual(getContinuousFieldSpellStatModifier(projection, 'unknown'), { atk: 0, def: 0 });
});

test('all seven canonical Field templates and their exact Konami text load locally in strict mode', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => assert.fail('supported local cards must not require network access');
  try {
    for (const config of ADDITIONAL_FIELD_SPELLS) {
      const card = await getCardById(config.id);
      assert.equal(isStrictCardSupported(card, 'main'), true);
      assert.equal(isStrictCardSupported(card, 'extra'), false);
      assert.equal(card.name_en, config.name_en);
      assert.equal(card.race, 'Field');
      assert.equal(card.rulesText, config.rulesText);
      assert.match(card.rulesSourceUrl, /^https:\/\/www\.db\.yugioh-card\.com\/yugiohdb\/card_search\.action\?ope=2&cid=\d+&request_locale=fr$/);
      const instance = new CardState(card);
      assert.equal(instance.image_url, `/cards/small/${config.id}.jpg`);
      assert.equal(instance.image_url_cropped, `/cards/cropped/${config.id}.jpg`);
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});
