import assert from 'node:assert/strict';
import test from 'node:test';
import { getCardById } from '../src/api.js';
import { STARTER_CARDS } from '../src/cards.js';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { getClassicFieldSpellModifier, SCRIPTED_FIELD_SPELLS } from '../src/core/ClassicFieldSpellEffects.js';
import { getStrictCardRegistration, isStrictCardSupported } from '../src/core/StrictCardRegistry.js';

const canonicalCards = [
  {
    id: '56433456', name: 'Le Sanctuaire Céleste', name_en: 'The Sanctuary in the Sky',
    effectCode: 'SANCTUARY_IN_THE_SKY', cid: 5982,
    text: "Les dommages de combat infligés au contrôleur d'un monstre Elfe d'un combat impliquant le monstre deviennent 0."
  },
  {
    id: '63035430', name: 'Gratte-Ciel', name_en: 'Skyscraper',
    effectCode: 'SKYSCRAPER', cid: 6399,
    text: 'Si un monstre "HÉROS Élémentaire" attaque un monstre qui a une ATK supérieure, le monstre attaquant gagne 1000 ATK durant le calcul des dommages uniquement.'
  },
  {
    id: '87624166', name: 'Forêt Ancienne', name_en: 'Ancient Forest',
    effectCode: 'ANCIENT_FOREST', cid: 8338,
    text: "Lorsque vous activez cette carte, changez tous les monstres en Position de Défense en Position d'Attaque face recto. Les effets Flip ne sont pas activés à ce moment. Si un monstre attaque, détruisez-le à la fin de la Battle Phase de ce tour."
  }
];

for (const expected of canonicalCards) {
  test(`${expected.name_en} loads its correct canonical passcode, official French text and script locally`, async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = () => assert.fail('implemented local Field Spells must not require network lookup');
    try {
      const template = await getCardById(expected.id);
      assert.equal(template.id, expected.id);
      assert.equal(template.name, expected.name);
      assert.equal(template.name_en, expected.name_en);
      assert.equal(template.type, 'Spell Card');
      assert.equal(template.card_type, 'spell');
      assert.equal(template.race, 'Field');
      assert.equal(template.rulesText, expected.text);
      assert.equal(template.desc, expected.text);
      assert.equal(template.rulesSourceUrl, `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${expected.cid}&request_locale=fr`);
      assert.equal(isStrictCardSupported(template, 'main'), true);
      assert.equal(isStrictCardSupported(template, 'extra'), false);
      const instance = new CardState(template);
      assert.equal(instance.effectCode, expected.effectCode);
      assert.equal(instance.image_url, `/cards/small/${expected.id}.jpg`);
      assert.equal(instance.image_url_cropped, `/cards/cropped/${expected.id}.jpg`);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  test(`${expected.name_en} follows the real strict Field activation path without permanent flat statistics`, async () => {
    const duel = new DuelGame();
    duel.phases.currentPhase = 'main1';
    duel.phases.turnCount = 2;
    duel.delay = async () => true;
    const source = new CardState({ ...STARTER_CARDS.find(card => card.id === expected.id), uid: `canonical-field-${expected.id}` });
    source.ownerId = 'player';
    source.controllerId = 'player';
    source.location = 'hand';
    duel.playerHand.push(source);
    const hero = new CardState({ ...STARTER_CARDS.find(card => card.id === '20721928'), uid: 'canonical-hero' });
    hero.ownerId = 'player';
    hero.controllerId = 'player';
    duel.field.setMonsterZone('player', 0, hero);
    assert.equal(await duel.activateFieldSpellFromHand(source.uid), true);
    assert.equal(duel.getFieldSpellForSide('player'), source);
    assert.equal(source.fieldActivationState, 'resolved');
    assert.equal(hero.getAtk(), 1600);
    assert.equal(hero.getDef(), 1400);
    assert.deepEqual(getClassicFieldSpellModifier(hero, source), { atk: 0, def: 0 });
  });
}

test('The Sanctuary in the Sky registry never substitutes an unrelated passcode', () => {
  assert.equal(SCRIPTED_FIELD_SPELLS.find(card => card.effectCode === 'SANCTUARY_IN_THE_SKY').id, '56433456');
  assert.equal(getStrictCardRegistration('56433456')?.procedure, 'spell');
  assert.equal(getStrictCardRegistration('11324436'), null);
});
