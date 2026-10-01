import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { FieldState } from '../src/core/FieldState.js';
import { TriggerEventEngine } from '../src/core/TriggerEventEngine.js';

function card(uid, side = 'player', overrides = {}) {
  const value = new CardState({
    uid, id: uid, name: uid, name_en: uid, card_type: 'monster',
    type: 'Effect Monster', desc: '', atk: 1500, def: 1000, level: 4,
    ...overrides
  });
  value.ownerId = value.controllerId = side;
  return value;
}

function duel(callbacks = {}) {
  const game = new DuelGame(callbacks);
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  game.startPhaseFlow = () => {};
  game.scheduleAction = () => 0;
  return game;
}

function bug(game, side = 'player', zone = 0) {
  const value = card(`bug-${side}`, side, { id: '54652250', atk: 450, def: 600, level: 2 });
  game.field.setMonsterZone(side, zone, value);
  value.isSetFaceDown = true;
  value.position = 'defense';
  return value;
}

function sangan(game, side = 'player', zone = 0, uid = `sangan-${side}`) {
  const value = card(uid, side, { id: '26202165', name: 'Sangan', name_en: 'Sangan', atk: 1000, def: 600, level: 3 });
  game.field.setMonsterZone(side, zone, value);
  return value;
}

function deck(game, side, ...cards) {
  for (const value of cards) {
    value.location = 'deck';
    value.ownerId = value.controllerId = side;
  }
  game.getSideState(side).deck.push(...cards);
}

test('FieldState reports immutable previous identity only after the destination zone is coherent', () => {
  const events = [];
  const field = new FieldState({ onTransition: event => {
    events.push(event);
    if (event.to.location === 'graveyard') assert.ok(field.playerGraveyard.includes(event.card));
    if (event.to.location === 'monster_zone') assert.equal(field.playerMonsterZones[1], event.card);
  } });
  const value = card('observed');
  field.setMonsterZone('player', 1, value);
  const old = value.runtimeInstanceId;
  field.sendToGraveyard(value, 'player');
  field.sendToGraveyard(value, 'player');
  assert.equal(events.length, 2);
  assert.equal(events[1].from.runtimeInstanceId, old);
  assert.notEqual(events[1].to.runtimeInstanceId, old);
  assert.equal(Object.isFrozen(events[1]), true);
  assert.equal(Object.isFrozen(events[1].from), true);
});

test('event queues defer battle Flip effects until after calculation and expose the four SEGOC groups', () => {
  const engine = new TriggerEventEngine();
  const value = card('event');
  engine.enqueue(value, 'FLIPPED_FACE_UP', { boundary: 'after_calc' });
  assert.equal(engine.hasReadyEvents(), false);
  assert.equal(engine.takeReadyEvents('after_calc').length, 1);
  const candidates = [
    { controllerId: 'opponent', mandatory: false, id: 'no' },
    { controllerId: 'player', mandatory: false, id: 'to' },
    { controllerId: 'opponent', mandatory: true, id: 'nm' },
    { controllerId: 'player', mandatory: true, id: 'tm' }
  ];
  assert.deepEqual(engine.getSEGOCGroups(candidates, 'player').map(group => group.candidates[0].id), ['tm', 'nm', 'to', 'no']);
});

for (const side of ['player', 'opponent']) {
  test(`Man-Eater Bug's mandatory Flip effect destroys the opposing monster (${side})`, async () => {
    const game = duel();
    const source = bug(game, side);
    const other = game.getOpponentSide(side);
    const target = card('bug-victim', other);
    game.field.setMonsterZone(other, 0, target);
    await game.flipMonstersFaceUp([source]);
    assert.ok(game.getSideState(other).graveyard.includes(target));
    assert.equal(source.isSetFaceDown, false);
  });
}

test('Man-Eater Bug must target itself when it is the only legal monster', async () => {
  const requests = [];
  const game = duel({ onDecision: request => {
    requests.push(request);
    if (request.type === 'select-trigger-target') return null;
  } });
  const source = bug(game);
  await game.toggleMonsterPosition(0);
  assert.ok(game.playerGraveyard.includes(source));
  assert.equal(requests.find(request => request.type === 'select-trigger-target').required, true);
});

test('a monster attacked face-down activates Flip after calculation, before being sent to the Graveyard', async () => {
  const windows = [];
  let source;
  const game = duel({ onChainOpportunity: request => {
    if (request.lastLink?.context.effectId === 'MAN_EATER_BUG_DESTROY') {
      windows.push({ phase: game.phases.damageStepSubPhase, pending: source.pendingBattleDestruction,
        inField: game.opponentMonsters[0] === source, sourceInGY: game.opponentGraveyard.includes(source) });
    }
    return null;
  } });
  game.phases.currentPhase = 'battle';
  const attacker = card('attacker', 'player', { atk: 1800 });
  game.field.setMonsterZone('player', 0, attacker);
  source = bug(game, 'opponent');
  await game.executeAttack(0, 0);
  assert.ok(windows.length);
  assert.ok(windows.every(window => window.phase === 'after_calc' && window.pending && window.inField && !window.sourceInGY));
  assert.ok(game.playerGraveyard.includes(attacker));
  assert.ok(game.opponentGraveyard.includes(source));
  assert.equal(game.playerLP, 8000);
});

test('a Flip effect cannot target a monster already determined destroyed by this battle', async () => {
  const offered = [];
  const game = duel({ onDecision: request => {
    if (request.type === 'select-trigger-target') offered.push(...request.candidates.map(value => value.uid));
  } });
  game.phases.currentPhase = 'battle';
  const attacker = card('weak-attacker', 'player', { atk: 500 });
  game.field.setMonsterZone('player', 0, attacker);
  const source = bug(game, 'opponent');
  source.position = 'attack';
  // 500 versus 450 ATK destroys only the Bug; the attacker remains legal.
  await game.executeAttack(0, 0);
  assert.equal(offered.includes(source.uid), false);
  assert.ok(offered.includes(attacker.uid));
});

test('Magician of Faith recovers its locked Spell from its own Graveyard on a Flip Summon', async () => {
  const game = duel();
  const source = card('faith', 'player', { id: '31560081', atk: 300, def: 400, level: 1 });
  game.field.setMonsterZone('player', 0, source);
  source.isSetFaceDown = true;
  const spell = card('recovered-spell', 'player', { id: '12580477', card_type: 'spell', type: 'Spell Card' });
  game.field.sendToGraveyard(spell, 'player');
  await game.toggleMonsterPosition(0);
  assert.ok(game.playerHand.includes(spell));
  assert.equal(game.playerGraveyard.includes(spell), false);
});

test('Flip effects created inside an effect wait until all links of the original Chain resolve', async () => {
  const order = [];
  const game = duel({ onAnimation: event => {
    if (event.type === 'chain-pop' && event.card.id === '54652250') order.push('flip-activation');
  } });
  const source = bug(game);
  const victim = card('delayed-victim', 'opponent');
  game.field.setMonsterZone('opponent', 0, victim);
  const original = card('original-effect');
  game.chain.pushChainLink('player', original, [], { resolver: async () => {
    order.push('lower-link');
    assert.equal(victim.location, 'monster_zone');
    return true;
  } });
  game.chain.pushChainLink('player', original, [], { resolver: async () => {
    order.push('upper-link');
    await game.flipMonstersFaceUp([source]);
    assert.equal(game.chain.chainStack.length, 1);
    return true;
  } });
  await game.resolveChainStack();
  assert.deepEqual(order, ['upper-link', 'lower-link', 'flip-activation']);
  assert.ok(game.opponentGraveyard.includes(victim));
});

test('Flip source leaving and returning before activation loses the original trigger event', async () => {
  const game = duel();
  const source = bug(game);
  const original = card('flip-and-remove');
  game.chain.pushChainLink('player', original, [], { resolver: async () => {
    await game.flipMonstersFaceUp([source]);
    game.removeCardFromCurrentZone(source);
    game.field.setMonsterZone('player', 0, source);
    return true;
  } });
  await game.resolveChainStack();
  assert.equal(game.playerMonsters[0], source);
  assert.equal(game.playerGraveyard.includes(source), false);
});

for (const side of ['player', 'opponent']) {
  test(`Sangan activates from its owner's Graveyard after effect destruction (${side})`, async () => {
    const game = duel();
    const source = sangan(game, side);
    const searched = card('searched', side, { id: '40640057', atk: 300 });
    deck(game, side, searched);
    game.removeCardFromCurrentZone(source, { byCardEffect: true, sourceSide: game.getOpponentSide(side) });
    await game.flushScriptedTriggers();
    assert.ok(game.getSideState(side).hand.includes(searched));
    assert.equal(game.effects.hasUsedHOPT('Sangan', 2, { playerId: side, effectId: 'SANGAN_SEARCH' }), true);
    assert.equal(game.defense.isActionProhibited(side, 'ACTIVATE_EFFECT', searched), true);
  });
}

test('a stolen Sangan searches the owner Deck when sent to the owner Graveyard', async () => {
  const game = duel();
  const source = sangan(game);
  game.field.setMonsterZone('opponent', 0, source);
  const searched = card('owner-search', 'player', { atk: 1000 });
  deck(game, 'player', searched);
  game.removeCardFromCurrentZone(source);
  await game.flushScriptedTriggers();
  assert.ok(game.playerHand.includes(searched));
  assert.deepEqual(game.opponentHand, []);
});

test('Sangan does not trigger from a hand discard, banishment, or detached Xyz Material', async () => {
  const game = duel();
  const handSangan = card('hand-sangan', 'player', { id: '26202165' });
  handSangan.location = 'hand';
  game.field.sendToGraveyard(handSangan, 'player');
  const banishedSangan = sangan(game, 'player', 0, 'banished-sangan');
  game.field.sendToBanished(banishedSangan, 'player');
  const materialSangan = sangan(game, 'player', 1, 'material-sangan');
  const host = card('host', 'player', { type: 'Xyz Effect Monster', extra_type: 'xyz', rank: 4 });
  game.field.setMonsterZone('player', 2, host);
  game.summons.attachXyzMaterials(host, [materialSangan]);
  const [detached] = game.summons.detachXyzMaterials(host, 1);
  game.field.sendToGraveyard(detached, 'player');
  assert.equal(game.triggers.events.length, 0);
});

test('Sangan destroyed by battle searches in the end of the Damage Step', async () => {
  let timing;
  const game = duel({ onDecision: request => {
    if (request.type === 'select-sangan-search') timing = game.phases.damageStepSubPhase;
  } });
  game.phases.currentPhase = 'battle';
  const attacker = card('attacker', 'player', { atk: 1800 });
  game.field.setMonsterZone('player', 0, attacker);
  sangan(game, 'opponent');
  const searched = card('battle-search', 'opponent', { atk: 1000 });
  deck(game, 'opponent', searched);
  await game.executeAttack(0, 0);
  assert.equal(timing, 'end');
  assert.ok(game.opponentHand.includes(searched));
});

test('Sangan cost Trigger and Junk Synchron summon Trigger join one Chain in mandatory/optional order', async () => {
  const effects = [];
  const game = duel({ onAnimation: event => {
    if (event.type === 'chain-pop') effects.push(game.chain.getLastLink().context.effectId || game.chain.getLastLink().context.trigger);
  } });
  const source = sangan(game);
  const revived = card('level-one', 'player', { level: 1, atk: 300 });
  game.field.sendToGraveyard(revived, 'player');
  deck(game, 'player', card('searched', 'player', { atk: 1000 }));
  game.field.sendToGraveyard(source, 'player');
  const junk = card('junk', 'player', { id: '63977008', level: 3, atk: 1300 });
  game.field.setMonsterZone('player', 0, junk);
  await game.resolveSummonSuccessEvent(junk, 'player', 0, { summonType: 'normal' });
  assert.deepEqual(effects, ['SANGAN_SEARCH', 'junk-synchron']);
  assert.equal(revived.location, 'monster_zone');
});

test('Sangan hard once per turn remains consumed when its first activation is negated', async () => {
  const game = duel({ onChainOpportunity: request => {
    if (request.lastLink?.context.effectId === 'SANGAN_SEARCH') request.lastLink.activationNegated = true;
    return null;
  } });
  deck(game, 'player', card('unused-search', 'player', { atk: 1000 }));
  const first = sangan(game, 'player', 0, 'first-sangan');
  game.field.sendToGraveyard(first, 'player');
  await game.flushScriptedTriggers();
  const second = sangan(game, 'player', 0, 'second-sangan');
  game.field.sendToGraveyard(second, 'player');
  await game.flushScriptedTriggers();
  assert.deepEqual(game.playerHand, []);
  assert.equal(game.playerDeck.length, 1);
});

test('a Sangan removed from its Graveyard before activation cannot activate the queued event', async () => {
  const game = duel();
  const source = sangan(game);
  deck(game, 'player', card('unsearched', 'player', { atk: 500 }));
  game.field.sendToGraveyard(source, 'player');
  game.field.sendToBanished(source, 'player');
  await game.flushScriptedTriggers();
  assert.equal(game.playerHand.length, 0);
  assert.equal(game.effects.hasUsedHOPT('Sangan', 2, { playerId: 'player', effectId: 'SANGAN_SEARCH' }), false);
});

test('an old Sangan Graveyard event does not activate after its source leaves and returns', async () => {
  const game = duel();
  const source = sangan(game);
  deck(game, 'player', card('unsearched-return', 'player', { atk: 500 }));
  game.field.sendToGraveyard(source, 'player');
  const graveyardInstance = source.runtimeInstanceId;
  game.field.sendToBanished(source, 'player');
  game.field.sendToGraveyard(source, 'player');
  assert.notEqual(source.runtimeInstanceId, graveyardInstance);
  await game.flushScriptedTriggers();
  assert.equal(game.playerHand.length, 0);
  assert.equal(game.effects.hasUsedHOPT('Sangan', 2, { playerId: 'player', effectId: 'SANGAN_SEARCH' }), false);
});

test('a scripted Special Summon trigger waits until the complete resolving Chain finishes', async () => {
  const resolutions = [];
  const game = duel();
  const source = card('summon-trigger');
  game.scriptApi.registerScript(source.id, { triggerEffects: [{
    eventType: 'SUMMON_SUCCESS', effectId: 'SPECIAL_SUMMON_TEST', mandatory: true,
    resolve: async () => { resolutions.push('trigger'); return true; }
  }] });
  game.chain.pushChainLink('player', card('remaining-link'), [], { resolver: async () => {
    resolutions.push('remaining');
    assert.equal(game.triggers.hasReadyEvents(), true);
    return true;
  } });
  game.chain.pushChainLink('player', card('summon-link'), [], { resolver: async () => {
    assert.equal(game.specialSummonCard(source, 'player', 0, { summonType: 'effect' }), 0);
    await game.resolveProcedureSummonWindow(source, 'player', 'effect');
    resolutions.push('summon');
    assert.equal(game.chain.chainStack.length, 1);
    return true;
  } });
  await game.resolveChainStack();
  assert.deepEqual(resolutions, ['summon', 'remaining', 'trigger']);
});

for (const destination of ['main', 'extra']) {
  test(`a scripted Special Summon trigger is collected once by the ${destination} procedure window`, async () => {
    let activated = 0;
    const game = duel();
    const source = card(`summon-trigger-${destination}`, 'player', destination === 'extra'
      ? { type: 'Link Effect Monster', extra_type: 'link', linkval: 2 } : {});
    game.scriptApi.registerScript(source.id, { triggerEffects: [{
      eventType: 'SUMMON_SUCCESS', effectId: 'SPECIAL_SUMMON_TEST', mandatory: true,
      resolve: async () => { activated += 1; return true; }
    }] });
    if (destination === 'main') game.specialSummonCard(source, 'player', 0, { summonType: 'special' });
    else game.specialSummonToExtraMonsterZone(source, 'player', 0, { summonType: 'special' });
    assert.equal(game.triggers.events.length, 1);
    await game.resolveProcedureSummonWindow(source, 'player', 'special');
    assert.equal(activated, 1);
    assert.equal(game.triggers.events.length, 0);
  });
}

test('SEGOC groups all scripted simultaneous triggers before allowing Fast Effect responses', async () => {
  const pushes = [];
  const resolutions = [];
  let firstResponseStack;
  const game = duel({
    onAnimation: event => { if (event.type === 'chain-pop') pushes.push(event.card.uid); },
    onChainOpportunity: () => { firstResponseStack ||= [...game.chain.chainStack.map(link => link.sourceCard.uid)]; return null; },
    onDecision: request => {
      if (request.type === 'order-trigger-effects') return request.choices.at(-1).value;
    }
  });
  const specs = [
    ['nonturn-optional', 'opponent', false], ['turn-optional', 'player', false],
    ['nonturn-mandatory', 'opponent', true], ['turn-mandatory-1', 'player', true], ['turn-mandatory-2', 'player', true]
  ];
  for (let index = 0; index < specs.length; index += 1) {
    const [uid, side, mandatory] = specs[index];
    const value = card(uid, side);
    game.field.setMonsterZone(side, index % 5, value);
    game.scriptApi.registerScript(uid, { triggerEffects: [{
      eventType: 'TEST_EVENT', effectId: uid, mandatory,
      resolve: async () => { resolutions.push(uid); return true; }
    }] });
    game.queueScriptedTriggerEvent(value, 'TEST_EVENT');
  }
  await game.flushScriptedTriggers();
  assert.deepEqual(pushes, ['turn-mandatory-2', 'turn-mandatory-1', 'nonturn-mandatory', 'turn-optional', 'nonturn-optional']);
  assert.deepEqual(firstResponseStack, pushes);
  assert.deepEqual(resolutions, [...pushes].reverse());
});

test('optional scripted triggers can be declined without declining a mandatory simultaneous effect', async () => {
  const resolved = [];
  const game = duel({ onDecision: request => request.optional ? false : undefined });
  for (const [index, mandatory] of [true, false].entries()) {
    const value = card(`optional-${index}`);
    game.field.setMonsterZone('player', index, value);
    game.scriptApi.registerScript(value.id, { triggerEffects: [{
      eventType: 'TEST_EVENT', effectId: value.id, mandatory,
      resolve: async () => { resolved.push(index); return true; }
    }] });
    game.queueScriptedTriggerEvent(value, 'TEST_EVENT');
  }
  await game.flushScriptedTriggers();
  assert.deepEqual(resolved, [0]);
});

test('a reset during mandatory trigger targeting cannot mutate the new duel', async () => {
  let release;
  const game = duel({ onDecision: request => request.type === 'select-trigger-target'
    ? new Promise(resolve => { release = resolve; }) : undefined });
  const source = bug(game);
  const pending = game.flipMonstersFaceUp([source]);
  game.reset();
  release(source.uid);
  await pending;
  assert.equal(game.playerGraveyard.length, 0);
  assert.equal(game.chain.chainStack.length, 0);
  assert.equal(game.triggers.events.length, 0);
});

test('Sangan search restrictions stop Kuriboh, Junk summon triggers, and Pendulum card activation', async () => {
  for (const id of ['40640057', '63977008', '94415058']) {
    const game = duel();
    const source = sangan(game);
    const searched = card(`search-${id}`, 'player', {
      id, atk: 300, ...(id === '94415058' ? { type: 'Pendulum Effect Monster', isPendulumMonster: true, pendulumScale: 1 } : {})
    });
    deck(game, 'player', searched);
    game.field.sendToGraveyard(source, 'player');
    await game.flushScriptedTriggers();
    if (id === '40640057') assert.equal(await game.tryKuribohBattleDamage('player', 500, { attackerSide: 'opponent' }), 500);
    if (id === '94415058') assert.equal(await game.activatePendulumScale(searched.uid, 0), false);
    if (id === '63977008') {
      game.field.sendToGraveyard(card('revivable', 'player', { level: 1 }), 'player');
      game.field.setMonsterZone('player', 0, searched);
      const outcome = await game.resolveSummonSuccessEvent(searched, 'player', 0, { summonType: 'normal' });
      assert.equal(outcome.activated, false);
    }
  }
});

test('autopass preserves a legal Link Summon and cancels an outdated callback after gaining an action', async () => {
  let scheduled;
  const game = duel();
  game.scheduleAction = action => { scheduled = action; };
  game.playerExtraDeck = [];
  game.checkAutoPass();
  assert.equal(typeof scheduled, 'function');
  const handMonster = card('new-hand-action', 'player', { id: '91152256', type: 'Normal Monster' });
  handMonster.location = 'hand';
  game.playerHand.push(handMonster);
  await scheduled();
  assert.equal(game.currentPhase, 'main1');
  game.playerHand = [];
  const link = () => card('lan', 'player', { id: '77637979', type: 'Link Monster', extra_type: 'link', linkRating: 2, level: 0 });
  game.field.setMonsterZone('player', 0, link());
  const second = link(); second.uid = 'second-lan';
  game.field.setMonsterZone('player', 1, second);
  const extra = link(); extra.uid = 'extra-lan'; extra.location = 'extra_deck';
  game.playerExtraDeck.push(extra);
  scheduled = null;
  game.checkAutoPass();
  assert.ok(game.getAvailableActions().linkExtraUids.includes(extra.uid));
  assert.equal(scheduled, null);
});

test('the final hand-limit discard refreshes the state immediately', () => {
  let updates = 0;
  const game = duel({ onStateChange: () => { updates += 1; } });
  game.phases.currentPhase = 'end';
  game.isDiscarding = true;
  game.playerHand = Array.from({ length: 7 }, (_, index) => card(`discard-${index}`));
  game.discardCard(game.playerHand[0].uid);
  assert.equal(game.isDiscarding, false);
  assert.equal(game.playerHand.length, 6);
  assert.equal(updates, 1);
});

test('Stardust can negate a destructive Flip activation after damage calculation', async () => {
  let stardust;
  let sawDamageStepResponse = false;
  const game = duel({ onChainOpportunity: request => {
    const candidate = request.candidates.find(value => value.cardUid === stardust?.uid);
    if (candidate && game.phases.damageStepSubPhase === 'after_calc') {
      sawDamageStepResponse = true;
      return candidate.cardUid;
    }
    return null;
  } });
  game.phases.currentPhase = 'battle';
  const attacker = card('protected-attacker', 'player', { atk: 3000 });
  game.field.setMonsterZone('player', 0, attacker);
  stardust = card('stardust', 'player', { id: '44508094', type: 'Synchro Effect Monster', extra_type: 'synchro', atk: 2500 });
  game.field.setMonsterZone('player', 1, stardust);
  const source = bug(game, 'opponent');
  await game.executeAttack(0, 0);
  assert.equal(sawDamageStepResponse, true);
  assert.equal(game.playerMonsters[0], attacker);
  assert.ok(game.playerGraveyard.includes(stardust));
  assert.ok(game.opponentGraveyard.includes(source));
  assert.equal(stardust.stardustReturnEligibleTurn, 2);
});

test('simultaneously destroyed Sangans form mandatory turn-player/non-turn-player links and separate HOPT scopes', async () => {
  const links = [];
  const game = duel({ onAnimation: event => { if (event.type === 'chain-pop') links.push(event.card.ownerId); } });
  const own = sangan(game);
  const opposing = sangan(game, 'opponent');
  deck(game, 'player', card('own-search', 'player', { atk: 1000 }));
  deck(game, 'opponent', card('opposing-search', 'opponent', { atk: 1000 }));
  const original = card('destroy-both');
  game.chain.pushChainLink('player', original, [], { resolver: async () => {
    game.removeCardFromCurrentZone(opposing);
    game.removeCardFromCurrentZone(own);
    return true;
  } });
  await game.resolveChainStack();
  assert.deepEqual(links, ['player', 'opponent']);
  assert.equal(game.playerHand.length, 1);
  assert.equal(game.opponentHand.length, 1);
  assert.equal(game.effects.hasUsedHOPT('Sangan', 2, { playerId: 'player', effectId: 'SANGAN_SEARCH' }), true);
  assert.equal(game.effects.hasUsedHOPT('Sangan', 2, { playerId: 'opponent', effectId: 'SANGAN_SEARCH' }), true);
});

test('trigger targets retain their original identity when an async target decision replaces the card', async () => {
  let target;
  const game = duel({ onDecision: request => {
    if (request.type !== 'select-trigger-target') return undefined;
    game.removeCardFromCurrentZone(target);
    game.field.setMonsterZone('opponent', 0, target);
    return target.uid;
  } });
  const source = bug(game);
  target = card('changed-target', 'opponent');
  game.field.setMonsterZone('opponent', 0, target);
  await game.flipMonstersFaceUp([source]);
  assert.equal(game.opponentMonsters[0], target);
  assert.equal(game.playerMonsters[0], source);
});
