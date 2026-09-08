import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { markFieldSpellResolved } from '../src/core/FieldSpellRules.js';

function monster(uid, owner, atk, def, position = 'attack') {
  const card = new CardState({ uid, id: uid, name: uid, card_type: 'monster',
    type: 'Normal Monster', atk, def, level: 4, race: 'Beast', desc: '' });
  card.ownerId = owner;
  card.controllerId = owner;
  card.position = position;
  return card;
}

function gameFor(side, callbacks) {
  const game = new DuelGame(callbacks);
  game.phases.currentPhase = 'battle';
  game.phases.currentTurnOwner = side;
  game.phases.turnCount = 2;
  game.aiDifficulty = 'easy';
  game.delay = async () => true;
  game.startPhaseFlow = () => {};
  return game;
}

const cases = [
  { label: 'higher ATK vs ATK', atk: 2000, opposing: 1000, position: 'attack', atkDamage: 0, defDamage: 1000, atkDestroyed: false, defDestroyed: true },
  { label: 'lower ATK vs ATK', atk: 1000, opposing: 2000, position: 'attack', atkDamage: 1000, defDamage: 0, atkDestroyed: true, defDestroyed: false },
  { label: 'equal positive ATK', atk: 1500, opposing: 1500, position: 'attack', atkDamage: 0, defDamage: 0, atkDestroyed: true, defDestroyed: true },
  { label: 'equal zero ATK', atk: 0, opposing: 0, position: 'attack', atkDamage: 0, defDamage: 0, atkDestroyed: false, defDestroyed: false },
  { label: 'higher ATK vs DEF', atk: 2000, opposing: 1000, position: 'defense', atkDamage: 0, defDamage: 0, atkDestroyed: false, defDestroyed: true },
  { label: 'lower ATK vs DEF', atk: 1000, opposing: 2000, position: 'defense', atkDamage: 1000, defDamage: 0, atkDestroyed: false, defDestroyed: false },
  { label: 'equal ATK and DEF', atk: 1500, opposing: 1500, position: 'defense', atkDamage: 0, defDamage: 0, atkDestroyed: false, defDestroyed: false },
  { label: 'zero ATK vs zero DEF', atk: 0, opposing: 0, position: 'defense', atkDamage: 0, defDamage: 0, atkDestroyed: false, defDestroyed: false }
];

for (const side of ['player', 'opponent']) {
  for (const scenario of cases) {
    test(`${side} damage: ${scenario.label}`, async () => {
      const opposite = side === 'player' ? 'opponent' : 'player';
      const game = gameFor(side);
      const attacker = monster('attacker', side, scenario.atk, 500);
      const defender = monster('defender', opposite, scenario.opposing, scenario.opposing, scenario.position);
      game.field.setMonsterZone(side, 0, attacker);
      game.field.setMonsterZone(opposite, 0, defender);
      if (side === 'player') await game.executeAttack(0, 0);
      else await game.runAIBattlePhase();
      assert.equal(game[`${side}LP`], 8000 - scenario.atkDamage);
      assert.equal(game[`${opposite}LP`], 8000 - scenario.defDamage);
      assert.equal(game[`${side}Graveyard`].includes(attacker), scenario.atkDestroyed);
      assert.equal(game[`${opposite}Graveyard`].includes(defender), scenario.defDestroyed);
    });
  }
}

test('a defender revealed before calculation immediately receives its active Field Spell DEF bonus', async () => {
  const logs = [];
  const game = gameFor('player', { onLog: message => logs.push(message) });
  const attacker = monster('attacker', 'player', 1700, 1000);
  const defender = monster('defender', 'opponent', 1000, 1600, 'defense');
  defender.race = 'Spellcaster';
  defender.currentRace = 'Spellcaster';
  defender.isSetFaceDown = true;
  const yami = new CardState({ id: '59197169', name: 'Yami', type: 'Spell Card', card_type: 'spell', race: 'Field' });
  yami.ownerId = 'opponent';
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, defender);
  game.field.placeFieldSpell('opponent', yami);
  markFieldSpellResolved(yami, 1);
  game.stateChanged();
  assert.equal(defender.getDef(), 1600, 'the face-down card receives no visible boost');
  await game.executeAttack(0, 0);
  assert.equal(defender.getDef(), 1800);
  assert.equal(game.playerLP, 7900);
  assert.equal(game.opponentMonsters[0], defender);
  assert.equal(logs.some(message => String(message).includes('Effet Flip')), false);
});

test('lethal AI damage also finishes before the battle-destroyed card is sent away', async () => {
  const game = gameFor('opponent');
  const attacker = monster('attacker', 'opponent', 2000, 1000);
  const defender = monster('defender', 'player', 1000, 1000);
  game.field.setMonsterZone('opponent', 0, attacker);
  game.field.setMonsterZone('player', 0, defender);
  game.playerLP = 500;
  await game.runAIBattlePhase();
  assert.equal(game.winner, 'opponent');
  assert.equal(game.phases.damageStepSubPhase, 'calc');
  assert.equal(game.playerMonsters[0], defender);
});

test('a reset during damage animation cannot append combat state to the new Duel', async () => {
  let game;
  game = gameFor('player', { onAnimation: event => { if (event.type === 'lp-loss') game.reset(); } });
  game.field.setMonsterZone('player', 0, monster('attacker', 'player', 2000, 1000));
  await game.executeAttack(0);
  assert.equal(game.playerLP, 8000);
  assert.equal(game.opponentLP, 8000);
  assert.equal(game.currentPhase, 'draw');
  assert.equal(game.phases.battleStep, 'none');
  assert.equal(game.isResolvingAction, false);
});
