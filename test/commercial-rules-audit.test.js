import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { FieldState } from '../src/core/FieldState.js';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { getAvailableExtraMonsterZoneIndices, getExtraLinkedZoneKeys } from '../src/core/LinkZoneRules.js';

function card(uid, data = {}, side = 'player', location = 'hand') {
  const result = new CardState({ id: uid, uid, name: uid, card_type: 'monster',
    type: 'Normal Monster', level: 4, atk: 1000, def: 1000, ...data });
  result.ownerId = side;
  result.controllerId = side;
  result.location = location;
  return result;
}

function local(id, uid = id, side = 'player', location = 'hand') {
  const data = [...STARTER_CARDS, ...EXTRA_DECK_CARDS].find(entry => entry.id === id);
  assert.ok(data, `local card ${id}`);
  return card(uid, data, side, location);
}

function link(uid, arrows, side = 'player') {
  return card(uid, { type: 'Link Monster', extra_type: 'link', linkRating: 2,
    minimumMaterialCount: 2, maximumMaterialCount: 2, requiresEffectMonsters: false,
    linkArrows: arrows }, side, 'extra_deck');
}

function main(game, side = 'player') {
  game.phases.currentTurnOwner = side;
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.startPhaseFlow = () => {};
  game.delay = async () => true;
}

function playableFusionScenario() {
  const game = new DuelGame();
  main(game);
  const fusion = local('23995346', 'ultimate', 'player', 'extra_deck');
  const polymerization = local('24094653', 'polymerization');
  game.playerExtraDeck = [fusion];
  game.playerHand = [
    ...[1, 2, 3].map(index => local('89631139', `blue-${index}`)),
    polymerization
  ];
  return { game, fusion, polymerization };
}

function extraLinkField(field, side = 'player') {
  const source = link('bridge-source', ['bottom-left', 'bottom-right'], side);
  const bridge = link('middle-bridge', ['top-left', 'top-right'], side);
  field.setExtraMonsterZone(side === 'player' ? 0 : 1, side, source);
  field.setMonsterZone(side, 2, bridge);
  const incoming = local('77637979', 'incoming-lan', side, 'extra_deck');
  return { source, bridge, incoming };
}

test('Extra Link projects the incoming Link, completes reciprocal paths and never mutates live cards', () => {
  for (const side of ['player', 'opponent']) {
    const field = new FieldState();
    const { incoming, bridge } = extraLinkField(field, side);
    const before = JSON.stringify(field);
    assert.deepEqual(getAvailableExtraMonsterZoneIndices(field, side), []);
    assert.deepEqual(getAvailableExtraMonsterZoneIndices(field, side, { summoningCard: incoming }), [side === 'player' ? 1 : 0]);
    assert.deepEqual(getAvailableExtraMonsterZoneIndices(field, side, { summoningCard: incoming, excludedCards: [bridge] }), []);
    assert.equal(JSON.stringify(field), before);
  }
});

test('second EMZ is not available to a Fusion, a one-way linked monster or a disconnected Link', () => {
  const field = new FieldState();
  extraLinkField(field);
  const fusion = local('23995346', 'fusion', 'player', 'extra_deck');
  assert.deepEqual(getAvailableExtraMonsterZoneIndices(field, 'player', { summoningCard: fusion }), []);
  const wrongArrow = link('wrong-arrow', ['bottom-right']);
  assert.deepEqual(getAvailableExtraMonsterZoneIndices(field, 'player', { summoningCard: wrongArrow }), []);
  field.playerMonsterZones[2].linkArrows = ['top-right'];
  assert.deepEqual(getAvailableExtraMonsterZoneIndices(field, 'player', { summoningCard: local('77637979') }), []);
});

test('Extra Link may pass through an opposing Main Zone Link, but never overwrite an occupied EMZ', () => {
  const field = new FieldState();
  field.setExtraMonsterZone(0, 'player', link('upper-source', ['top-right']));
  field.setMonsterZone('opponent', 2, link('opposing-bridge', ['top-left', 'top-right'], 'opponent'));
  const incoming = link('upper-incoming', ['top-left']);
  assert.deepEqual(getAvailableExtraMonsterZoneIndices(field, 'player', { summoningCard: incoming }), [1]);
  field.setExtraMonsterZone(1, 'player', incoming);
  assert.deepEqual(getExtraLinkedZoneKeys(field).sort(), ['extra:0', 'extra:1', 'opponent:main:2']);
  assert.deepEqual(getAvailableExtraMonsterZoneIndices(field, 'opponent', { summoningCard: incoming }), []);
  field.sendToGraveyard(incoming, 'player');
  assert.deepEqual(getAvailableExtraMonsterZoneIndices(field, 'opponent'), [1]);
});

test('LANphorhynchus can complete Extra Link through a full live summon transaction', async () => {
  const game = new DuelGame();
  main(game);
  const { incoming, source, bridge } = extraLinkField(game.field);
  game.playerExtraDeck = [incoming];
  const a = card('extra-link-material-a');
  const b = card('extra-link-material-b');
  game.field.setMonsterZone('player', 0, a);
  game.field.setMonsterZone('player', 4, b);
  game.callbacks.onDecision = request => {
    if (request.type === 'select-link-materials') return [a.uid, b.uid];
    if (request.type === 'select-summon-destination') return 'extra:1';
    return undefined;
  };
  assert.equal(await game.performLinkSummon('player', incoming.uid), true);
  assert.equal(game.field.extraMonsterZones[0].card, source);
  assert.equal(game.field.extraMonsterZones[1].card, incoming);
  assert.equal(game.playerMonsters[2], bridge);
  assert.deepEqual(game.playerGraveyard, [a, b]);
  assert.equal(incoming.wasProperlySpecialSummoned, true);
});

test('Extra Link revalidates the reciprocal path after an awaited destination choice', async () => {
  const game = new DuelGame();
  main(game);
  const { incoming, bridge } = extraLinkField(game.field);
  game.playerExtraDeck = [incoming];
  const a = card('extra-link-rollback-a');
  const b = card('extra-link-rollback-b');
  game.field.setMonsterZone('player', 0, a);
  game.field.setMonsterZone('player', 4, b);
  game.callbacks.onDecision = request => {
    if (request.type === 'select-link-materials') return [a.uid, b.uid];
    if (request.type === 'select-summon-destination') {
      game.field.sendToGraveyard(bridge, 'player');
      return 'extra:1';
    }
    return undefined;
  };
  assert.equal(await game.performLinkSummon('player', incoming.uid), false);
  assert.equal(game.field.extraMonsterZones[1], null);
  assert.deepEqual(game.playerExtraDeck, [incoming]);
  assert.equal(game.playerMonsters[0], a);
  assert.equal(game.playerMonsters[4], b);
});

test('available Normal Summons account for allowance, required Tributes and destination capacity', () => {
  const game = new DuelGame();
  main(game);
  const low = local('05053103');
  const high = local('89631139');
  game.playerHand = [low, high];
  assert.deepEqual(game.getAvailableActions().normalSummonCardUids, [low.uid]);
  for (let index = 0; index < 5; index += 1) game.field.setMonsterZone('player', index, card(`full-${index}`));
  assert.deepEqual(game.getAvailableActions().normalSummonCardUids, [high.uid]);
  game.summons.consumeNormalSummon();
  assert.equal(game.getAvailableActions().canNormalSummon, false);
  assert.deepEqual(game.getAvailableActions().normalSummonCardUids, []);
});

test('the action list is empty during a chain, required selection or a finished duel', () => {
  const game = new DuelGame();
  main(game);
  game.playerHand = [local('05053103')];
  for (const key of ['pendingSummon', 'pendingExtraSummon', 'isDiscarding', 'isResolvingAction', 'isResolvingEffect', '_duelEnded']) {
    game[key] = true;
    assert.ok(Object.values(game.getAvailableActions()).every(value => Array.isArray(value) ? value.length === 0 : value === false), key);
    game[key] = false;
  }
  game.chain.pushChainLink('player', local('12580477'));
  assert.deepEqual(game.getAvailableActions().normalSummonCardUids, []);
});

test('Fusion action requires an activatable Polymerization and respects Special Summon restrictions', () => {
  const game = new DuelGame();
  main(game);
  game.playerExtraDeck = [local('23995346', 'ultimate', 'player', 'extra_deck')];
  game.playerHand = [1, 2, 3].map(index => local('89631139', `blue-${index}`));
  assert.deepEqual(game.getAvailableActions().fusionExtraUids, []);
  const poly = local('24094653');
  game.playerHand.push(poly);
  assert.deepEqual(game.getAvailableActions().fusionExtraUids, ['ultimate']);
  game.defense.addRestriction({ playerId: 'player', actionType: 'SPECIAL_SUMMON' });
  assert.deepEqual(game.getAvailableActions().fusionExtraUids, []);
  assert.equal(game.canActivateSpell(poly, 'player'), false);
  game.defense.clearTurnRestrictions();
  game.defense.addRestriction({ playerId: 'player', actionType: 'ACTIVATE_EFFECT' });
  assert.equal(game.canActivateSpell(poly, 'player'), false);
  assert.deepEqual(game.getAvailableActions().fusionExtraUids, []);
});

test('Fusion keeps its requested target through asynchronous activation and clears it after success', async () => {
  const { game, fusion, polymerization } = playableFusionScenario();
  game.playSpellTrap = async (cardUid, zoneIndex) => {
    assert.equal(cardUid, polymerization.uid);
    assert.equal(zoneIndex, 0);
    assert.equal(game.pendingFusionTargets.player, fusion.uid);
    await Promise.resolve();
    assert.equal(game.pendingFusionTargets.player, fusion.uid);
    return true;
  };

  assert.equal(await game.summonExtraDeck(fusion.uid), true);
  assert.equal(game.pendingFusionTargets.player, null);
});

test('Fusion clears its requested target after an activation refusal or exception', async () => {
  const refused = playableFusionScenario();
  refused.game.playSpellTrap = async () => false;
  assert.equal(await refused.game.summonExtraDeck(refused.fusion.uid), false);
  assert.equal(refused.game.pendingFusionTargets.player, null);

  const failed = playableFusionScenario();
  failed.game.playSpellTrap = async () => {
    throw new Error('activation failed');
  };
  await assert.rejects(failed.game.summonExtraDeck(failed.fusion.uid), /activation failed/);
  assert.equal(failed.game.pendingFusionTargets.player, null);
});

test('Fusion uses an activatable set Polymerization when the hand copy has no free Spell Zone', async () => {
  const { game, fusion } = playableFusionScenario();
  const setPolymerization = local('24094653', 'set-polymerization', 'player', 'spell_trap');
  setPolymerization.isSetFaceDown = true;
  game.field.setSpellZone('player', 0, setPolymerization);
  for (let zoneIndex = 1; zoneIndex < 5; zoneIndex += 1) {
    game.field.setSpellZone('player', zoneIndex, local('12580477', `filler-${zoneIndex}`, 'player', 'spell_trap'));
  }
  game.playSpellTrap = async () => {
    throw new Error('the hand source must not be selected without a free Spell Zone');
  };
  let activatedZone = -1;
  game.activateSetSpellTrap = async zoneIndex => {
    activatedZone = zoneIndex;
    assert.equal(game.pendingFusionTargets.player, fusion.uid);
    return true;
  };

  assert.deepEqual(game.getAvailableActions().fusionExtraUids, [fusion.uid]);
  assert.equal(await game.summonExtraDeck(fusion.uid), true);
  assert.equal(activatedZone, 0);
  assert.equal(game.pendingFusionTargets.player, null);
});

test('Xyz Link and Pendulum action lists reject forbidden Special Summons and full capacities', () => {
  const game = new DuelGame();
  main(game);
  game.field.setMonsterZone('player', 0, card('action-a'));
  game.field.setMonsterZone('player', 1, card('action-b'));
  assert.ok(game.getAvailableActions().xyzExtraUids.length > 0);
  assert.ok(game.getAvailableActions().linkExtraUids.length > 0);
  for (const [index, id] of [[0, '94415058'], [4, '20409757']]) {
    const scale = local(id);
    game.field.setSpellZone('player', index, scale);
    scale.isPendulumScale = true;
    scale.location = 'pendulum_zone';
  }
  game.playerHand = [card('pendulum-hand')];
  assert.equal(game.getAvailableActions().canPendulumSummon, true);
  game.defense.addRestriction({ playerId: 'player', actionType: 'SPECIAL_SUMMON' });
  const forbidden = game.getAvailableActions();
  assert.deepEqual(forbidden.xyzExtraUids, []);
  assert.deepEqual(forbidden.linkExtraUids, []);
  assert.equal(forbidden.canPendulumSummon, false);
  game.defense.clearTurnRestrictions();
  for (let index = 2; index < 5; index += 1) game.field.setMonsterZone('player', index, card(`pendulum-block-${index}`));
  assert.equal(game.getAvailableActions().canPendulumSummon, false);
});

test('hand Spell actions need a Spell Zone while a Field Spell retains its independent zone', () => {
  const game = new DuelGame();
  main(game);
  game.field.setMonsterZone('opponent', 0, card('raigeki-target'));
  game.playerHand = [local('12580477'), local('59197169')];
  for (let index = 0; index < 5; index += 1) game.field.setSpellZone('player', index, local('44095762', `trap-${index}`));
  assert.deepEqual(game.getAvailableActions().activatableSpellUids, ['59197169']);
});

function rebornScenario(side = 'player') {
  const game = new DuelGame();
  main(game, side);
  const spell = local('83764718', 'reborn', side);
  const target = card('grave-target', {}, side, 'graveyard');
  game.getSideState(side).hand.push(spell);
  game.getSideState(side).graveyard.push(target);
  return { game, spell, target };
}

test('Spell activation re-finds its card after a target decision reorders the hand', async () => {
  const { game, spell, target } = rebornScenario();
  const bystander = card('bystander');
  game.callbacks.onDecision = request => {
    if (request.type === 'select-monster-reborn-target') {
      game.playerHand.unshift(bystander);
      return target.uid;
    }
    return undefined;
  };
  assert.equal(await game.playSpellTrap(spell.uid, 0), true);
  assert.deepEqual(game.playerHand, [bystander]);
  assert.ok(game.playerGraveyard.includes(spell));
  assert.ok(game.playerMonsters.includes(target));
});

test('Spell activation cannot overwrite a zone occupied during its target decision', async () => {
  const { game, spell, target } = rebornScenario();
  const blocker = local('44095762', 'spell-blocker');
  game.callbacks.onDecision = request => {
    if (request.type === 'select-monster-reborn-target') {
      game.field.setSpellZone('player', 0, blocker);
      return target.uid;
    }
    return undefined;
  };
  assert.equal(await game.playSpellTrap(spell.uid, 0), false);
  assert.deepEqual(game.playerHand, [spell]);
  assert.equal(game.playerSpells[0], blocker);
  assert.ok(game.playerGraveyard.includes(target));
  assert.equal(game.chain.chainStack.length, 0);
});

test('Monster Reborn cannot activate on a target that left and returned while choosing it', async () => {
  const { game, spell, target } = rebornScenario();
  game.callbacks.onDecision = request => {
    if (request.type === 'select-monster-reborn-target') {
      game.field.sendToBanished(target, 'player');
      game.field.sendToGraveyard(target, 'player');
      return target.uid;
    }
    return undefined;
  };
  assert.equal(await game.playSpellTrap(spell.uid, 0), false);
  assert.deepEqual(game.playerHand, [spell]);
  assert.equal(game.playerSpells[0], null);
  assert.ok(game.playerGraveyard.includes(target));
});

test('a Set Spell removed during target selection does not activate from its Graveyard', async () => {
  const { game, spell, target } = rebornScenario();
  game.playerHand = [];
  game.field.setSpellZone('player', 0, spell);
  spell.isSetFaceDown = true;
  game.callbacks.onDecision = request => {
    if (request.type === 'select-monster-reborn-target') {
      game.field.sendToGraveyard(spell, 'player');
      return target.uid;
    }
    return undefined;
  };
  assert.equal(await game.activateSetSpellTrap(0), false);
  assert.equal(game.chain.chainStack.length, 0);
  assert.ok(game.playerGraveyard.includes(target));
});

for (const response of [{ call: 'heads', result: 'heads' }, null, 'invalid-call']) {
  test(`strict Time Wizard resolves an engine-owned toss for ${JSON.stringify(response)}`, async () => {
    const game = new DuelGame({ onDecision: request => request.type === 'coin-call' ? response : undefined });
    main(game);
    game.rollCoin = () => 'tails';
    const wizard = local('71625222');
    const opposing = card('wizard-opponent', {}, 'opponent');
    game.field.setMonsterZone('player', 0, wizard);
    game.field.setMonsterZone('opponent', 0, opposing);
    assert.equal(await game.activateMonsterEffect(0), true);
    assert.equal(game.playerMonsters[0], null);
    assert.equal(game.opponentMonsters[0], opposing);
    assert.equal(game.playerLP, 7750);
  });
}

test('Sandbox retains explicit coin outcomes for authored scenarios', async () => {
  const game = new DuelGame({ onDecision: request => request.type === 'coin-call' ? { call: 'heads', result: 'heads' } : undefined }, { rulesMode: 'sandbox' });
  main(game);
  game.rollCoin = () => { throw new Error('Sandbox outcome should be explicit'); };
  game.field.setMonsterZone('player', 0, local('71625222'));
  game.field.setMonsterZone('opponent', 0, card('sandbox-victim', {}, 'opponent'));
  assert.equal(await game.activateMonsterEffect(0), true);
  assert.equal(game.opponentMonsters[0], null);
});

test('AI Spell activation also rejects a hand source removed during target selection', async () => {
  const { game, spell, target } = rebornScenario('opponent');
  const bystander = card('ai-bystander', {}, 'opponent');
  game.opponentHand.push(bystander);
  game.callbacks.onDecision = request => {
    if (request.type === 'select-monster-reborn-target') {
      game.opponentHand.splice(game.opponentHand.indexOf(spell), 1);
      game.field.sendToGraveyard(spell, 'opponent');
      return target.uid;
    }
    return undefined;
  };
  assert.equal(await game.runAIMainPhase(), false);
  assert.deepEqual(game.opponentHand, [bystander]);
  assert.equal(game.opponentSpells[0], null);
  assert.ok(game.opponentGraveyard.includes(target));
});

for (const isSet of [false, true]) {
  test(`${isSet ? 'Normal Set' : 'Normal Summon'} emits exact zero-Tribute mission metadata`, async () => {
    const animations = [];
    const game = new DuelGame({ onAnimation: event => animations.push(event) });
    main(game);
    const monster = local('05053103');
    game.playerHand = [monster];
    assert.equal(await (isSet ? game.setMonsterFaceDown(monster.uid, 0) : game.summonMonster(monster.uid, 0)), true);
    const event = animations.find(entry => entry.type === 'summon' && entry.card === monster);
    assert.equal(event.summonType, 'normal');
    assert.equal(event.tributeCount, 0);
  });

  test(`${isSet ? 'Tribute Set' : 'Tribute Summon'} emits the number of materials actually Tributed`, async () => {
    const animations = [];
    const game = new DuelGame({ onAnimation: event => animations.push(event) });
    main(game);
    const monster = local('89631139');
    game.playerHand = [monster];
    game.field.setMonsterZone('player', 0, card('tribute-mission-a'));
    game.field.setMonsterZone('player', 1, card('tribute-mission-b'));
    assert.equal(await (isSet ? game.setMonsterFaceDown(monster.uid, 0) : game.summonMonster(monster.uid, 0)), true);
    await game.selectSummonTribute(0);
    assert.equal(await game.selectSummonTribute(1), true);
    const event = animations.find(entry => entry.type === 'summon' && entry.card === monster);
    assert.equal(event.summonType, 'tribute');
    assert.equal(event.tributeCount, 2);
  });
}

test('AI Normal and Tribute summons expose the same explicit mission event contract', async () => {
  for (const count of [0, 2]) {
    const animations = [];
    const game = new DuelGame({ onAnimation: event => animations.push(event) });
    main(game, 'opponent');
    const monster = local(count ? '89631139' : '05053103', `ai-contract-${count}`, 'opponent');
    game.opponentHand = [monster];
    for (let index = 0; index < count; index += 1) game.field.setMonsterZone('opponent', index, card(`ai-tribute-${index}`, {}, 'opponent'));
    assert.equal(await game.tryAINormalSummon(game.getAIDecisionProfile('easy')), true);
    const event = animations.find(entry => entry.type === 'summon' && entry.card === monster);
    assert.equal(event.summonType, count ? 'tribute' : 'normal');
    assert.equal(event.tributeCount, count);
  }
});
