import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { DefensiveEngine } from '../src/core/DefensiveEngine.js';

function monster(uid, owner, overrides = {}) {
  const card = new CardState({
    uid, id: uid, name: uid, card_type: 'monster', type: 'Effect Monster',
    atk: 2000, def: 1000, level: 4, desc: '', ...overrides
  });
  card.ownerId = owner;
  card.controllerId = owner;
  return card;
}

function battle(side = 'player', callbacks = {}) {
  const game = new DuelGame(callbacks);
  game.phases.currentPhase = 'battle';
  game.phases.currentTurnOwner = side;
  game.phases.turnCount = 2;
  game.delay = async () => true;
  game.startPhaseFlow = () => {};
  return game;
}

function changeDuringDeclaration(game, change) {
  game.resolveMirrorForceOnAttack = async () => {
    change();
    return null;
  };
}

for (const mutation of ['add', 'remove-other', 'transient']) {
  test(`replay follows opponent field mutation ${mutation} even when target survives`, async () => {
    let replayCount = 0;
    const game = battle('player', {
      onDecision: request => {
        if (request.type === 'battle-replay') {
          replayCount += 1;
          return 'cancel';
        }
      }
    });
    const attacker = monster('attacker', 'player');
    const defender = monster('defender', 'opponent', { atk: 1000 });
    const other = monster('other', 'opponent');
    game.field.setMonsterZone('player', 0, attacker);
    game.field.setMonsterZone('opponent', 0, defender);
    if (mutation === 'remove-other') game.field.setMonsterZone('opponent', 1, other);
    changeDuringDeclaration(game, () => {
      if (mutation !== 'remove-other') game.field.setMonsterZone('opponent', 1, other);
      if (mutation !== 'add') game.field.sendToGraveyard(other, 'opponent');
    });
    const result = await game.executeAttack(0, 0);
    assert.equal(replayCount, 1);
    assert.equal(result.replayCancelled, true);
    assert.equal(game.opponentMonsters[0], defender);
    assert.equal(game.opponentLP, 8000);
    assert.equal(attacker.attacksDeclaredThisTurn, 1);
    assert.equal(game.hasMonsterAttacked(0), true);
  });
}

test('direct attack becomes a monster battle on replay without a second declaration', async () => {
  let declarationCount = 0;
  const game = battle('player', {
    onDecision: request => request.type === 'battle-replay'
      ? request.choices.find(choice => String(choice.value).startsWith('target:')).value
      : undefined
  });
  const attacker = monster('attacker', 'player');
  const defender = monster('appearing-target', 'opponent', { atk: 1200 });
  game.field.setMonsterZone('player', 0, attacker);
  changeDuringDeclaration(game, () => {
    declarationCount += 1;
    game.field.setMonsterZone('opponent', 0, defender);
  });
  const result = await game.executeAttack(0);
  assert.equal(declarationCount, 1);
  assert.equal(result.replayResolved, true);
  assert.equal(game.opponentLP, 7200);
  assert.ok(game.opponentGraveyard.includes(defender));
  assert.equal(attacker.attacksDeclaredThisTurn, 1);
  assert.equal(attacker.attacksCompletedThisTurn, 1);
});

test('AI direct attack also reselects a newly appearing monster', async () => {
  const game = battle('opponent');
  const attacker = monster('ai-attacker', 'opponent');
  const defender = monster('appearing-target', 'player', { atk: 1200 });
  game.field.setMonsterZone('opponent', 0, attacker);
  changeDuringDeclaration(game, () => game.field.setMonsterZone('player', 0, defender));
  await game.runAIBattlePhase();
  assert.equal(game.playerLP, 7200);
  assert.ok(game.playerGraveyard.includes(defender));
  assert.equal(attacker.attacksDeclaredThisTurn, 1);
  assert.equal(attacker.attacksCompletedThisTurn, 1);
});

for (const mutation of ['face-down', 'defense', 'restricted']) {
  test(`attack cannot continue after attacker becomes ${mutation}`, async () => {
    const game = battle();
    const attacker = monster('attacker', 'player');
    game.field.setMonsterZone('player', 0, attacker);
    changeDuringDeclaration(game, () => {
      if (mutation === 'face-down') attacker.isSetFaceDown = true;
      if (mutation === 'defense') attacker.position = 'defense';
      if (mutation === 'restricted') game.defense.addRestriction({
        playerId: 'player', actionType: 'DECLARE_ATTACK'
      });
    });
    const result = await game.executeAttack(0);
    assert.equal(result.attackerStillValid, false);
    assert.equal(game.opponentLP, 8000);
    assert.equal(attacker.hasAttacked, true);
    assert.equal(attacker.attacksCompletedThisTurn, 0);
  });
}

test('changing only defender position does not give the attacker a replay', async () => {
  let replayCount = 0;
  const game = battle('player', {
    onDecision: request => { if (request.type === 'battle-replay') replayCount += 1; }
  });
  const attacker = monster('attacker', 'player');
  const defender = monster('defender', 'opponent', { atk: 1000, def: 2500 });
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, defender);
  changeDuringDeclaration(game, () => { defender.position = 'defense'; });
  await game.executeAttack(0, 0);
  assert.equal(replayCount, 0);
  assert.equal(game.playerLP, 7500);
  assert.equal(game.opponentMonsters[0], defender);
});

for (const side of ['player', 'opponent']) {
  test(`${side} piercing is scripted and symmetric; self negation disables it`, async () => {
    for (const negated of [false, true]) {
      const opposite = side === 'player' ? 'opponent' : 'player';
      const game = battle(side);
      const attacker = monster('piercing', side, { piercingBattleDamage: true });
      const defender = monster('defender', opposite);
      defender.position = 'defense';
      game.field.setMonsterZone(side, 0, attacker);
      game.field.setMonsterZone(opposite, 0, defender);
      attacker.effectNegated = negated;
      if (side === 'player') await game.executeAttack(0, 0);
      else await game.runAIBattlePhase();
      assert.equal(game[`${opposite}LP`], negated ? 8000 : 7000);
      assert.ok(game[`${opposite}Graveyard`].includes(defender));
    }
  });
}

test('descriptive text mentioning piercing does not grant an unscripted effect', async () => {
  const game = battle();
  const attacker = monster('flavor-only', 'player', { desc: 'Cannot inflict piercing battle damage; transperce.' });
  const defender = monster('defender', 'opponent');
  defender.position = 'defense';
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, defender);
  await game.executeAttack(0, 0);
  assert.equal(game.opponentLP, 8000);
});

test('battle protection from another source survives recipient negation but not source negation', async () => {
  for (const sourceNegated of [false, true]) {
    const game = battle();
    const attacker = monster('attacker', 'player');
    const defender = monster('protected', 'opponent', { atk: 1000 });
    const source = monster('protection-source', 'opponent');
    game.field.setMonsterZone('player', 0, attacker);
    game.field.setMonsterZone('opponent', 0, defender);
    game.field.setMonsterZone('opponent', 1, source);
    defender.effectNegated = true;
    source.effectNegated = sourceNegated;
    game.defense.addProtection({ cardUid: defender.uid, sourceCard: source, type: 'DESTROY_BY_BATTLE' });
    await game.executeAttack(0, 0);
    assert.equal(game.opponentLP, 7000, 'destruction protection does not prevent damage');
    assert.equal(game.opponentMonsters[0] === defender, !sourceNegated);
  }
});

test('self-negated battle protection does not prevent battle destruction', async () => {
  const game = battle();
  const attacker = monster('attacker', 'player');
  const defender = monster('protected', 'opponent', { atk: 1000 });
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, defender);
  defender.effectNegated = true;
  game.defense.addProtection({ cardUid: defender.uid, type: 'DESTROY_BY_BATTLE' });
  await game.executeAttack(0, 0);
  assert.ok(game.opponentGraveyard.includes(defender));
});

test('destruction replacement has a reason filter and cannot pay twice for one event', async () => {
  const game = battle();
  const attacker = monster('attacker', 'player');
  const defender = monster('replaced', 'opponent', { atk: 1000 });
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, defender);
  let costsPaid = 0;
  game.defense.addReplacement({
    cardUid: defender.uid, triggerType: 'DESTROY',
    filter: event => event.reason === 'battle',
    replaceFn: () => { costsPaid += 1; return true; }
  });
  assert.equal(game.defense.tryReplaceEvent({ type: 'DESTROY', reason: 'effect', targetCard: defender }).replaced, undefined);
  await game.executeAttack(0, 0);
  assert.equal(game.opponentMonsters[0], defender);
  assert.equal(game.opponentLP, 7000);
  assert.equal(costsPaid, 1);
  const alreadyReplaced = { type: 'DESTROY', reason: 'battle', targetCard: defender, replaced: true };
  game.defense.tryReplaceEvent(alreadyReplaced);
  assert.equal(costsPaid, 1);
});

test('instance-scoped protection cannot follow a monster that leaves and returns', () => {
  const defense = new DefensiveEngine();
  const card = monster('protected', 'player');
  defense.addProtection({ cardUid: card.uid, card, type: 'DESTROY_BY_BATTLE' });
  assert.equal(defense.hasProtection(card, 'DESTROY_BY_BATTLE'), true);
  card.resetForZoneChange('graveyard');
  assert.equal(defense.hasProtection(card, 'DESTROY_BY_BATTLE'), false);
});

test('an invalid target and a prohibited first-turn attack never consume an attack', async () => {
  const game = battle();
  const attacker = monster('attacker', 'player');
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, monster('defender', 'opponent'));
  await game.executeAttack(0, 4);
  assert.equal(attacker.attacksDeclaredThisTurn, 0);
  game.phases.turnCount = 1;
  await game.executeAttack(0, 0);
  assert.equal(attacker.attacksDeclaredThisTurn, 0);
  game.phases.turnCount = 2;
  game.defense.addRestriction({ playerId: 'player', actionType: 'DECLARE_ATTACK' });
  await game.executeAttack(0, 0);
  assert.equal(attacker.attacksDeclaredThisTurn, 0);
});

test('AI does not mark declined attacks and cannot attack again when re-entering its handler', async () => {
  const game = battle('opponent');
  const attacker = monster('ai-attacker', 'opponent');
  const defender = monster('too-strong', 'player', { atk: 3000 });
  game.field.setMonsterZone('opponent', 0, attacker);
  game.field.setMonsterZone('player', 0, defender);
  await game.runAIBattlePhase();
  assert.equal(attacker.attacksDeclaredThisTurn, 0);
  game.field.sendToGraveyard(defender, 'player');
  game.phases.currentPhase = 'battle';
  await game.runAIBattlePhase();
  assert.equal(game.playerLP, 6000);
  game.phases.currentPhase = 'battle';
  await game.runAIBattlePhase();
  assert.equal(game.playerLP, 6000);
  assert.equal(attacker.attacksDeclaredThisTurn, 1);
});

test('moving an attacked monster preserves its attack use; a fresh summon in its old zone can attack', async () => {
  const game = battle();
  const attacker = monster('attacker', 'player', { atk: 1000 });
  game.field.setMonsterZone('player', 0, attacker);
  await game.executeAttack(0);
  game.field.setMonsterZone('player', 1, attacker);
  await game.executeAttack(1);
  assert.equal(game.opponentLP, 7000);
  const fresh = monster('fresh', 'player', { atk: 1500 });
  game.field.setMonsterZone('player', 0, fresh);
  await game.executeAttack(0);
  assert.equal(game.opponentLP, 5500);
});

test('lethal battle damage ends the Duel during calculation before Graveyard movements', async () => {
  const game = battle();
  const attacker = monster('attacker', 'player');
  const defender = monster('defender', 'opponent', { atk: 1000 });
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, defender);
  game.opponentLP = 500;
  await game.executeAttack(0, 0);
  assert.equal(game.winner, 'player');
  assert.equal(game.phases.damageStepSubPhase, 'calc');
  assert.equal(game.opponentMonsters[0], defender);
  assert.equal(game.opponentGraveyard.length, 0);
});

test('Kuriboh sees the calculation window on direct attacks, then combat returns to Battle Step', async () => {
  let kuribohTiming;
  let game;
  game = battle('opponent', {
    onDecision: request => {
      if (request.effect === 'kuriboh-prevent-battle-damage') {
        kuribohTiming = [game.phases.battleStep, game.phases.damageStepSubPhase];
        return true;
      }
    }
  });
  const kuriboh = monster('kuriboh', 'player', { id: '40640057' });
  kuriboh.location = 'hand';
  game.playerHand.push(kuriboh);
  const attacker = monster('attacker', 'opponent');
  game.field.setMonsterZone('opponent', 0, attacker);
  await game.resolveDirectAttackDamage(attacker, game.getMonsterEntry('opponent', 0), 'opponent');
  assert.deepEqual(kuribohTiming, ['damage_step', 'calc']);
  assert.equal(game.playerLP, 8000);
  assert.equal(game.phases.battleStep, 'battle_step');
});

test('a target leaving during Damage Step cancels damage without replay or direct conversion', async () => {
  let replayCount = 0;
  const game = battle('player', {
    onDecision: request => { if (request.type === 'battle-replay') replayCount += 1; }
  });
  const attacker = monster('attacker', 'player');
  const defender = monster('defender', 'opponent', { atk: 1000 });
  game.field.setMonsterZone('player', 0, attacker);
  game.field.setMonsterZone('opponent', 0, defender);
  game.delay = async () => {
    if (game.phases.damageStepSubPhase === 'start') game.field.sendToGraveyard(defender, 'opponent');
    return true;
  };
  await game.executeAttack(0, 0);
  assert.equal(replayCount, 0);
  assert.equal(game.opponentLP, 8000);
  assert.equal(game.phases.battleStep, 'battle_step');
  assert.equal(attacker.hasAttacked, true);
});
