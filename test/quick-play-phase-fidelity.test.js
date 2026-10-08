import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { PhaseEngine } from '../src/core/PhaseEngine.js';

function card(uid, side = 'player', overrides = {}) {
  const instance = new CardState({
    uid, id: uid, name: uid, name_en: uid, card_type: 'monster',
    type: 'Effect Monster', desc: '', atk: 1500, def: 1200, level: 4,
    ...overrides
  });
  instance.ownerId = side;
  instance.controllerId = side;
  return instance;
}

function game(callbacks = {}) {
  const duel = new DuelGame(callbacks);
  duel.phases.currentPhase = 'main1';
  duel.phases.turnCount = 2;
  duel.delay = async () => true;
  duel.startPhaseFlow = () => {};
  return duel;
}

function quick(duel, effect, side = 'player', { zoneIndex = null, turnSet = 1, id } = {}) {
  const spell = card(`${effect}-${side}`, side, {
    id: id ?? (effect === 'mst' ? '05318639' : '14087893'),
    card_type: 'spell', type: 'Spell Card', race: 'Quick-Play'
  });
  if (zoneIndex === null) {
    spell.location = 'hand';
    duel.getSideState(side).hand.push(spell);
  } else {
    spell.isSetFaceDown = true;
    duel.field.setSpellZone(side, zoneIndex, spell);
    spell.turnSet = turnSet;
  }
  return spell;
}

function spellTarget(duel, side = 'opponent', { field = false, hidden = false, zoneIndex = 0 } = {}) {
  const target = card('target-spell', side, {
    id: field ? '59197169' : '12580477', card_type: 'spell',
    type: 'Spell Card', race: field ? 'Field' : 'Normal'
  });
  target.isSetFaceDown = hidden;
  if (field) duel.field.placeFieldSpell(side, target);
  else duel.field.setSpellZone(side, zoneIndex, target);
  return target;
}

test('the first turn skips both Battle Phase and Main Phase 2 in the phase engine', () => {
  const phases = new PhaseEngine();
  phases.currentPhase = 'main1';
  assert.equal(phases.nextPhase().phase, 'end');
  assert.equal(phases.nextPhase().turnCount, 2);
  phases.currentPhase = 'main1';
  assert.equal(phases.nextPhase().phase, 'battle');
});

for (const side of ['player', 'opponent']) {
  for (const field of [false, true]) {
    test(`MST destroys the exact ${side} ${field ? 'Field' : 'Spell/Trap'} Zone target`, async () => {
      const animations = [];
      const duel = game({ onAnimation: event => animations.push(event) });
      const source = quick(duel, 'mst', 'player', { id: 5318639 });
      const target = spellTarget(duel, side, { field, hidden: true });
      assert.equal(duel.canActivateSpell(source, 'player'), true);
      assert.equal(await duel.playSpellTrap(source.uid, 1), true);
      assert.ok(duel.getSideState(side).graveyard.includes(target));
      assert.ok(duel.playerGraveyard.includes(source));
      const effect = animations.find(event => event.type === 'mystical-space-typhoon-cinematic');
      assert.equal(effect.target, side);
      assert.equal(effect.zoneType, field ? 'field' : 'spell');
    });
  }
}

test('MST target selection preserves the identity of opposing Set cards', async () => {
  let payload;
  const duel = game({ onDecision: request => {
    if (request.type !== 'select-mst-target') return undefined;
    payload = request;
    return request.candidates[0].uid;
  } });
  const source = quick(duel, 'mst');
  const target = spellTarget(duel, 'opponent', { hidden: true, zoneIndex: 3 });
  target.uid = 'o_12_12580477';
  target.name = 'Secret opposing Raigeki';
  await duel.playSpellTrap(source.uid, 0);
  const exposed = payload.candidates[0];
  assert.equal(exposed.hidden, true);
  assert.match(exposed.name, /face verso.*4/);
  assert.equal(exposed.id, undefined);
  assert.equal(exposed.atk, undefined);
  assert.equal(exposed.def, undefined);
  assert.equal(exposed.level, undefined);
  assert.equal(JSON.stringify(payload).includes('12580477'), false);
  assert.equal(JSON.stringify(payload).includes('Secret opposing'), false);
  assert.ok(duel.opponentGraveyard.includes(target));
});

test('MST destroying a Normal Spell does not negate its already activated effect', async () => {
  let mst;
  const duel = game({ onChainOpportunity: request => (
    request.candidates.find(candidate => candidate.cardUid === mst?.uid)?.cardUid || null
  ) });
  const raigeki = spellTarget(duel, 'player');
  const victim = card('raigeki-victim', 'opponent');
  duel.field.setMonsterZone('opponent', 0, victim);
  mst = quick(duel, 'mst', 'opponent', { zoneIndex: 0 });
  const activation = duel.chain.pushChainLink('player', raigeki, [], {
    context: { event: 'card-activation', cardActivation: true, wouldDestroy: true }, zoneIndex: 0
  });
  await duel.openChainResponseWindow('opponent', { event: 'card-activation', wouldDestroy: true });
  await duel.resolveChainStack();
  assert.equal(activation.activationNegated, false);
  assert.equal(activation.resolvedSuccessfully, true);
  assert.ok(duel.playerGraveyard.includes(raigeki));
  assert.ok(duel.opponentGraveyard.includes(victim));
});

test('MST sends a destroyed Pendulum Scale to the face-up Extra Deck', async () => {
  const duel = game();
  const source = quick(duel, 'mst');
  const scale = card('opposing-scale', 'opponent', {
    id: '94415058', type: 'Pendulum Effect Monster', isPendulumMonster: true, pendulumScale: 1
  });
  duel.field.setSpellZone('opponent', 4, scale);
  scale.location = 'pendulum_zone';
  scale.isPendulumScale = true;
  await duel.playSpellTrap(source.uid, 0);
  assert.ok(duel.opponentFaceUpExtraDeck.includes(scale));
  assert.equal(duel.opponentGraveyard.includes(scale), false);
});

test('MST never retargets a card that left the field and returned during the Chain', async () => {
  let target;
  let moved = false;
  const animations = [];
  const duel = game({
    onAnimation: event => animations.push(event),
    onChainOpportunity: () => {
      if (!moved) {
        moved = true;
        duel.removeCardFromCurrentZone(target);
        duel.field.setSpellZone('opponent', 0, target);
      }
      return null;
    }
  });
  target = spellTarget(duel);
  const source = quick(duel, 'mst');
  await duel.playSpellTrap(source.uid, 0);
  assert.equal(duel.opponentSpells[0], target);
  assert.equal(animations.some(event => event.type === 'mystical-space-typhoon-cinematic'), false);
});

test('destruction protection stops MST and its success animation', async () => {
  const animations = [];
  const duel = game({ onAnimation: event => animations.push(event) });
  const target = spellTarget(duel);
  duel.defense.addProtection({ card: target, cardUid: target.uid, type: 'DESTROY_BY_EFFECT' });
  const source = quick(duel, 'mst');
  await duel.playSpellTrap(source.uid, 0);
  assert.equal(duel.opponentSpells[0], target);
  assert.equal(animations.some(event => event.type === 'mystical-space-typhoon-cinematic'), false);
});

for (const side of ['player', 'opponent']) {
  for (const extra of [false, true]) {
    test(`Book of Moon sets the ${side} monster in the ${extra ? 'Extra' : 'Main'} Monster Zone`, async () => {
      const animations = [];
      const duel = game({ onAnimation: event => animations.push(event) });
      const target = card('book-target', side);
      if (extra) duel.field.setExtraMonsterZone(0, side, target);
      else duel.field.setMonsterZone(side, 2, target);
      const instance = target.runtimeInstanceId;
      target.addCounter('spell', 2);
      target.effectUsage.timeWizardTurn = 2;
      target.hasAttacked = true;
      target.attacksDeclaredThisTurn = 1;
      const source = quick(duel, 'book');
      await duel.playSpellTrap(source.uid, 0);
      assert.equal(target.isSetFaceDown, true);
      assert.equal(target.position, 'defense');
      assert.equal(target.runtimeInstanceId, instance);
      assert.deepEqual(target.counters, {});
      assert.deepEqual(target.effectUsage, {});
      assert.equal(target.hasAttacked, true);
      assert.equal(target.attacksDeclaredThisTurn, 1);
      const effect = animations.find(event => event.type === 'book-of-moon-cinematic');
      assert.equal(effect.zoneType, extra ? 'extra' : 'main');
      assert.equal(effect.target, side);
    });
  }
}

test('Book of Moon rejects face-down monsters, Tokens, Links, and protected targets', () => {
  const duel = game();
  const source = quick(duel, 'book');
  const link = card('link', 'opponent', { type: 'Link Monster', extra_type: 'link', linkRating: 2 });
  const token = card('token', 'opponent', { type: 'Token', isToken: true });
  const set = card('set', 'opponent');
  const protectedMonster = card('target-protected', 'opponent');
  duel.field.setMonsterZone('opponent', 0, link);
  duel.field.setMonsterZone('opponent', 1, token);
  duel.field.setMonsterZone('opponent', 2, set);
  set.isSetFaceDown = true;
  duel.field.setMonsterZone('opponent', 3, protectedMonster);
  duel.defense.addProtection({ card: protectedMonster, cardUid: protectedMonster.uid, type: 'TARGET' });
  assert.deepEqual(duel.getSpellTargetCandidates(source, 'player'), []);
  assert.equal(duel.canActivateSpell(source, 'player'), false);
});

test('the activation fails without consuming a Quick-Play Spell when no target exists', async () => {
  const duel = game();
  const book = quick(duel, 'book');
  const mst = quick(duel, 'mst');
  assert.equal(await duel.playSpellTrap(book.uid, 0), false);
  assert.equal(await duel.playSpellTrap(mst.uid, 0), false);
  assert.deepEqual(duel.playerHand, [book, mst]);
});

test('Quick-Play responses from hand belong only to the turn player and need a Spell Zone', () => {
  const duel = game();
  duel.field.setMonsterZone('opponent', 0, card('visible-target', 'opponent'));
  const playerBook = quick(duel, 'book');
  const opponentBook = quick(duel, 'book', 'opponent');
  assert.ok(duel.getLegalChainCandidates('player').some(candidate => candidate.card === playerBook && candidate.source === 'hand'));
  assert.equal(duel.getLegalChainCandidates('opponent').some(candidate => candidate.card === opponentBook), false);
  for (let index = 0; index < 5; index += 1) spellTarget(duel, 'player', { zoneIndex: index });
  assert.equal(duel.getLegalChainCandidates('player').some(candidate => candidate.card === playerBook), false);
});

test('newly Set Quick-Play Spells wait until a later turn, and activation restrictions apply', () => {
  const duel = game();
  duel.field.setMonsterZone('player', 0, card('visible-target'));
  const book = quick(duel, 'book', 'opponent', { zoneIndex: 0, turnSet: 2 });
  assert.deepEqual(duel.getLegalChainCandidates('opponent'), []);
  book.turnSet = 1;
  assert.equal(duel.getLegalChainCandidates('opponent').length, 1);
  duel.defense.addRestriction({ playerId: 'opponent', actionType: 'ACTIVATE_EFFECT' });
  assert.deepEqual(duel.getLegalChainCandidates('opponent'), []);
});

test('MST and Book of Moon cannot respond in any part of the Damage Step', () => {
  const duel = game();
  duel.field.setMonsterZone('player', 0, card('visible-target'));
  spellTarget(duel);
  const mst = quick(duel, 'mst');
  const book = quick(duel, 'book', 'opponent', { zoneIndex: 1 });
  duel.phases.setBattleStep('damage_step');
  for (const step of ['start', 'before_calc', 'calc', 'after_calc', 'end']) {
    duel.phases.setDamageStepSubPhase(step);
    assert.equal(duel.canActivateSpell(mst, 'player'), false);
    assert.equal(duel.canActivateSpell(book, 'opponent'), false);
    assert.deepEqual(duel.getLegalChainCandidates('player'), []);
    assert.deepEqual(duel.getLegalChainCandidates('opponent'), []);
  }
});

test('a stale asynchronous response cannot activate a card that left and returned', async () => {
  let book;
  let moved = false;
  const duel = game({ onChainOpportunity: request => {
    if (!moved && request.side === 'opponent') {
      moved = true;
      duel.removeCardFromCurrentZone(book);
      duel.field.setSpellZone('opponent', 0, book);
      book.isSetFaceDown = true;
      book.turnSet = 1;
      return book.uid;
    }
    return null;
  } });
  duel.field.setMonsterZone('player', 0, card('visible-target'));
  book = quick(duel, 'book', 'opponent', { zoneIndex: 0 });
  await duel.openChainResponseWindow('opponent', { event: 'PHASE_END', allowEmptyChain: true });
  assert.equal(duel.chain.chainStack.length, 0);
  assert.equal(book.isSetFaceDown, true);
});

test('Book of Moon responds to an ordinary Normal Summon without a preexisting Chain', async () => {
  let book;
  const opportunities = [];
  const duel = game({ onChainOpportunity: request => {
    opportunities.push(request.side);
    return request.candidates.find(candidate => candidate.cardUid === book?.uid)?.cardUid || null;
  } });
  book = quick(duel, 'book', 'opponent', { zoneIndex: 0 });
  const normal = card('normal-summoned', 'player', { id: '91152256', type: 'Normal Monster' });
  normal.location = 'hand';
  duel.playerHand.push(normal);
  await duel.summonMonster(normal.uid, 0);
  assert.deepEqual(opportunities.slice(0, 2), ['player', 'opponent']);
  assert.equal(normal.isSetFaceDown, true);
  assert.ok(duel.opponentGraveyard.includes(book));
});

test('Trap Hole still destroys its exact target after Book of Moon sets it face-down', async () => {
  let book;
  const duel = game({ onChainOpportunity: request => (
    request.candidates.find(candidate => candidate.cardUid === book?.uid)?.cardUid || null
  ) });
  const monster = card('trap-hole-victim');
  duel.field.setMonsterZone('player', 0, monster);
  const trap = card('numeric-trap-hole', 'opponent', { id: 4206964, card_type: 'trap', type: 'Trap Card' });
  duel.field.setSpellZone('opponent', 0, trap);
  trap.isSetFaceDown = true;
  trap.turnSet = 1;
  book = quick(duel, 'book');
  await duel.resolveSummonSuccessEvent(monster, 'player', 0);
  assert.ok(duel.playerGraveyard.includes(monster));
  assert.ok(duel.opponentGraveyard.includes(trap));
  assert.ok(duel.playerGraveyard.includes(book));
});

test('Trap Hole cannot activate on a Special Summon response window', async () => {
  const offered = [];
  const duel = game({ onChainOpportunity: request => { offered.push(...request.candidates); return null; } });
  const monster = card('special-monster');
  duel.field.setMonsterZone('player', 0, monster);
  const trap = card('trap-hole', 'opponent', { id: '04206964', card_type: 'trap', type: 'Trap Card' });
  duel.field.setSpellZone('opponent', 0, trap);
  trap.isSetFaceDown = true;
  trap.turnSet = 1;
  await duel.resolveProcedureSummonWindow(monster, 'player', 'xyz');
  assert.deepEqual(offered, []);
  assert.equal(trap.isSetFaceDown, true);
});

test('a Book of Moon with no legal target before Monster Reborn may respond after the complete Chain', async () => {
  let book;
  const phases = [];
  const duel = game({ onChainOpportunity: request => {
    phases.push({ event: request.context.event, resolving: duel.isResolvingEffect });
    return request.candidates.find(candidate => candidate.cardUid === book?.uid)?.cardUid || null;
  } });
  book = quick(duel, 'book', 'opponent', { zoneIndex: 0 });
  const revived = card('revived-wizard', 'player', { id: '71625222' });
  revived.location = 'graveyard';
  duel.playerGraveyard.push(revived);
  const reborn = card('reborn', 'player', { id: '83764718', card_type: 'spell', type: 'Spell Card' });
  reborn.location = 'hand';
  duel.playerHand.push(reborn);
  assert.equal(await duel.playSpellTrap(reborn.uid, 0), true);
  assert.equal(revived.isSetFaceDown, true);
  assert.ok(duel.opponentGraveyard.includes(book));
  assert.deepEqual(duel.getAvailableActions().monsterEffects, []);
  assert.ok(phases.some(window => window.event === 'CHAIN_RESOLVED'));
  assert.equal(phases.some(window => window.resolving), false);
});

test('Book of Moon on the attacking monster consumes the declaration without applying damage', async () => {
  let book;
  const duel = game({ onChainOpportunity: request => (
    request.candidates.find(candidate => candidate.cardUid === book?.uid)?.cardUid || null
  ) });
  duel.phases.currentPhase = 'battle';
  const attacker = card('attacking-monster');
  duel.field.setMonsterZone('player', 0, attacker);
  book = quick(duel, 'book', 'opponent', { zoneIndex: 0 });
  const result = await duel.executeAttack(0);
  assert.equal(result.attackerStillValid, false);
  assert.equal(attacker.isSetFaceDown, true);
  assert.equal(attacker.hasAttacked, true);
  assert.equal(duel.opponentLP, 8000);
});

test('phase departure waits in the previous phase, blocks other actions, and resolves responses before changing phase', async () => {
  let release;
  let book;
  let prompted = false;
  const duel = game({ onChainOpportunity: request => {
    if (!prompted && request.side === 'player') {
      prompted = true;
      return new Promise(resolve => { release = resolve; });
    }
    return request.candidates.find(candidate => candidate.cardUid === book?.uid)?.cardUid || null;
  } });
  const target = card('phase-target');
  duel.field.setMonsterZone('player', 0, target);
  book = quick(duel, 'book', 'opponent', { zoneIndex: 0 });
  const pending = duel.changePhase('end');
  assert.equal(duel.currentPhase, 'main1');
  assert.equal(duel.isResolvingAction, true);
  assert.equal(await duel.changePhase('battle'), false);
  release(null);
  assert.equal(await pending, true);
  assert.equal(duel.currentPhase, 'end');
  assert.equal(target.isSetFaceDown, true);
  assert.equal(duel.isResolvingAction, false);
});

test('reset invalidates a pending phase departure without changing the new duel', async () => {
  let release;
  const duel = game({ onChainOpportunity: () => new Promise(resolve => { release = resolve; }) });
  const pending = duel.changePhase('end');
  duel.reset();
  release(null);
  assert.equal(await pending, false);
  assert.equal(duel.currentPhase, 'draw');
  assert.equal(duel.turnCount, 1);
});

for (const phase of ['draw', 'standby', 'battle']) {
  test(`${phase} exposes a Fast Effect opportunity before its next phase or open battle action`, async () => {
    const windows = [];
    const duel = game({ onChainOpportunity: request => {
      windows.push({ side: request.side, phase: request.context.phase, actual: duel.currentPhase });
      return null;
    } });
    duel.phases.currentPhase = phase;
    duel.playerDeck.push(card('draw-card'));
    const phaseFlow = DuelGame.prototype.startPhaseFlow.bind(duel);
    await phaseFlow();
    assert.deepEqual(windows, [
      { side: 'player', phase, actual: phase },
      { side: 'opponent', phase, actual: phase }
    ]);
  });
}

test('turn-end restrictions stay active until both players have finished End Phase responses', async () => {
  const observed = [];
  const duel = game({ onChainOpportunity: () => {
    observed.push(duel.defense.isActionProhibited('player', 'SPECIAL_SUMMON'));
    return null;
  } });
  duel.phases.currentPhase = 'end';
  duel.defense.addRestriction({ playerId: 'player', actionType: 'SPECIAL_SUMMON' });
  await duel.processEndPhaseEffects();
  assert.deepEqual(observed, [true, true]);
  assert.equal(duel.defense.isActionProhibited('player', 'SPECIAL_SUMMON'), false);
});

test('Kuriboh cost revalidation never discards a replacement hand card after an async decision', async () => {
  let kuriboh;
  const duel = game({ onDecision: request => {
    if (request.effect !== 'kuriboh-prevent-battle-damage') return undefined;
    duel.playerHand.splice(duel.playerHand.indexOf(kuriboh), 1);
    duel.field.sendToGraveyard(kuriboh, 'player');
    return true;
  } });
  kuriboh = card('kuriboh', 'player', { id: '40640057' });
  const replacement = card('replacement');
  kuriboh.location = replacement.location = 'hand';
  duel.playerHand.push(kuriboh, replacement);
  assert.equal(await duel.tryKuribohBattleDamage('player', 1000, { attackerSide: 'opponent' }), 1000);
  assert.deepEqual(duel.playerHand, [replacement]);
  assert.equal(duel.chain.chainStack.length, 0);
});

for (const effect of ['book', 'mst']) {
  test(`the AI preserves ${effect} when only its own cards are valid targets`, async () => {
    const duel = game();
    duel.phases.currentTurnOwner = 'opponent';
    duel.aiDifficulty = 'easy';
    const source = quick(duel, effect, 'opponent');
    if (effect === 'book') duel.field.setMonsterZone('opponent', 0, card('own-monster', 'opponent'));
    else spellTarget(duel, 'opponent', { field: true });
    await duel.runAIMainPhase();
    assert.equal(duel.currentPhase, 'battle');
    assert.ok(duel.opponentHand.includes(source));
    assert.equal(duel.opponentGraveyard.includes(source), false);
  });
}

test('an AI target decision cancelled for a Quick-Play Spell still finishes its Main Phase', async () => {
  const duel = game({ onDecision: request => request.type === 'select-book-of-moon-target' ? null : undefined });
  duel.phases.currentTurnOwner = 'opponent';
  duel.aiDifficulty = 'easy';
  duel.field.setMonsterZone('player', 0, card('enemy-monster'));
  const source = quick(duel, 'book', 'opponent');
  await duel.runAIMainPhase();
  assert.equal(duel.currentPhase, 'battle');
  assert.ok(duel.opponentHand.includes(source));
});

test('a remaining Quick-Play Spell gets a response window after the complete Damage Step', async () => {
  let book;
  let sawCompletedBattle = false;
  const duel = game({ onChainOpportunity: request => {
    if (request.context.event !== 'DAMAGE_STEP_END') return null;
    sawCompletedBattle = duel.phases.battleStep === 'battle_step'
      && duel.playerMonsters[0].attacksCompletedThisTurn === 1;
    return request.candidates.find(candidate => candidate.cardUid === book?.uid)?.cardUid || null;
  } });
  duel.phases.currentPhase = 'battle';
  const attacker = card('post-battle-attacker');
  duel.field.setMonsterZone('player', 0, attacker);
  book = quick(duel, 'book', 'opponent', { zoneIndex: 0 });
  await duel.executeAttack(0);
  assert.equal(sawCompletedBattle, true);
  assert.equal(duel.opponentLP, 6500);
  assert.equal(attacker.isSetFaceDown, true);
  assert.ok(duel.opponentGraveyard.includes(book));
});
