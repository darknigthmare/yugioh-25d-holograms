import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { TriggerEventEngine } from '../src/core/TriggerEventEngine.js';

// Konami sources: Junk Synchron CID7687, FAQ supplement 2024-02-23;
// Arcanite Magician CID8038, FAQ supplement 2019-04-01.
// https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=7687&request_locale=ja
// https://www.db.yugioh-card.com/yugiohdb/faq_search.action?ope=4&cid=8038&request_locale=ja
// https://www.yugioh-card.com/en/play/fast-effect-timing/

function card(uid, side = 'player', data = {}) {
  const value = new CardState({ uid, id: uid, name: uid, name_en: uid,
    card_type: 'monster', type: 'Effect Monster', atk: 1000, def: 600, level: 2, ...data });
  value.ownerId = value.controllerId = side;
  return value;
}

function duel(side, callbacks = {}) {
  const game = new DuelGame(callbacks);
  game.phases.currentTurnOwner = side;
  game.phases.turnCount = 2;
  game.phases.currentPhase = 'main1';
  game.delay = async () => true;
  game.scheduleAction = () => 0;
  return game;
}

function arcanite(side) {
  return card(`arcanite-${side}`, side, { id: '31924889', name: 'Arcanite Magician',
    atk: 400, def: 1800, level: 7, type: 'Synchro Effect Monster', extra_type: 'synchro' });
}

function junkSetup(game, side) {
  const source = card(`junk-${side}`, side, { id: '63977008', level: 3, type: 'Tuner Effect Monster' });
  const target = card(`revive-${side}`, side, { level: 1 });
  game.field.sendToGraveyard(target, side);
  return { source, target };
}

function utopia(game, side, zone, uid, materialCount = 1) {
  const source = card(uid, side, { id: '84013237', type: 'Xyz Effect Monster', extra_type: 'xyz', atk: 2500 });
  game.field.setMonsterZone(side, zone, source);
  source.xyzMaterials = Array.from({ length: materialCount }, (_, index) => {
    const material = card(`${uid}-material-${index}`, side);
    material.location = 'xyz_material';
    return material;
  });
  return source;
}

async function normalSummonEvent(game, source, side) {
  game.field.setMonsterZone(side, 0, source);
  source.summonType = 'normal';
  return game.resolveSummonSuccessEvent(source, side, 0, { summonType: 'normal' });
}

for (const side of ['player', 'opponent']) {
  test(`Arcanite counters form a mandatory, targetless Trigger Chain (${side})`, async () => {
    const effects = [];
    const decisions = [];
    let game;
    game = duel(side, {
      onDecision: request => { decisions.push(request); return false; },
      onChainOpportunity: request => {
        if (request.lastLink?.context.effectId === 'ARCANITE_SYNCHRO_COUNTERS') {
          effects.push({ speed: request.lastLink.spellSpeed, counters: source.counters.spell || 0,
            targets: request.lastLink.targets.length });
        }
        return null;
      }
    });
    const source = arcanite(side);
    assert.equal(game.specialSummonCard(source, side, 0, { summonType: 'synchro' }), 0);
    assert.equal(source.counters.spell, undefined);
    await game.resolveProcedureSummonWindow(source, side, 'synchro');
    assert.equal(source.counters.spell, 2);
    assert.equal(source.getAtk(), 2400);
    assert.ok(effects.length > 0);
    assert.deepEqual(effects[0], { speed: 1, counters: 0, targets: 0 });
    assert.equal(decisions.some(request => request.optional), false, 'mandatory effect cannot be declined');
  });

  test(`Book of Moon can respond before Arcanite receives counters (${side})`, async () => {
    let book;
    const game = duel(side, { onChainOpportunity: request => {
      const candidate = request.candidates.find(value => value.cardUid === book?.uid);
      return candidate?.cardUid || null;
    } });
    const source = arcanite(side);
    const other = game.getOpponentSide(side);
    book = card(`book-${other}`, other, { id: '14087893', card_type: 'spell', type: 'Spell Card', race: 'Quick-Play' });
    game.field.setSpellZone(other, 0, book);
    book.isSetFaceDown = true;
    book.turnSet = 1;
    game.specialSummonCard(source, side, 0, { summonType: 'synchro' });
    await game.resolveProcedureSummonWindow(source, side, 'synchro');
    assert.equal(source.isSetFaceDown, true);
    assert.equal(source.counters.spell, undefined);
    assert.ok(game.getSideState(other).graveyard.includes(book));
  });

  test(`Arcanite's mandatory trigger survives CL2 and a subsequent draw (${side})`, async () => {
    const game = duel(side);
    const source = arcanite(side);
    const drawn = card(`draw-${side}`, side);
    drawn.location = 'deck';
    game.getSideState(side).deck.push(drawn);
    game.chain.pushChainLink(side, card('draw-effect', side), [], { resolver: async () => {
      assert.equal(source.counters.spell, undefined);
      game.drawCard(side, true);
      return true;
    } });
    game.chain.pushChainLink(side, card('synchro-effect', side), [], { resolver: async () => {
      game.specialSummonCard(source, side, 0, { summonType: 'synchro' });
      await game.resolveProcedureSummonWindow(source, side, 'synchro');
      assert.equal(source.counters.spell, undefined);
      return true;
    } });
    await game.resolveChainStack();
    assert.equal(source.counters.spell, 2);
    assert.ok(game.getSideState(side).hand.includes(drawn));
  });

  test(`Arcanite cannot place counters when its trigger activation is negated (${side})`, async () => {
    const game = duel(side, { onChainOpportunity: request => {
      if (request.lastLink?.context.effectId === 'ARCANITE_SYNCHRO_COUNTERS') request.lastLink.activationNegated = true;
      return null;
    } });
    const source = arcanite(side);
    game.specialSummonCard(source, side, 0, { summonType: 'synchro' });
    await game.resolveProcedureSummonWindow(source, side, 'synchro');
    assert.equal(source.counters.spell, undefined);
    assert.equal(source.getAtk(), 400);
  });

  test(`Arcanite's original trigger does not place counters on a returned new instance (${side})`, async () => {
    let moved = false;
    const game = duel(side, { onChainOpportunity: request => {
      if (!moved && request.lastLink?.context.effectId === 'ARCANITE_SYNCHRO_COUNTERS') {
        moved = true;
        game.field.sendToGraveyard(source, side);
        game.specialSummonCard(source, side, 0, { summonType: 'monster-reborn' });
      }
      return null;
    } });
    const source = arcanite(side);
    game.specialSummonCard(source, side, 0, { summonType: 'synchro' });
    await game.resolveProcedureSummonWindow(source, side, 'synchro');
    assert.equal(moved, true);
    assert.equal(source.counters.spell, undefined);
  });

  test(`Junk Synchron can activate when its Normal Summon is the last operation of CL1 (${side})`, async () => {
    const game = duel(side);
    const { source, target } = junkSetup(game, side);
    const spell = card(`normal-effect-${side}`, side, { card_type: 'spell', type: 'Spell Card' });
    game.field.setSpellZone(side, 0, spell);
    game.chain.pushChainLink(side, spell, [], { context: { event: 'card-activation' }, resolver: async () => {
      const outcome = await normalSummonEvent(game, source, side);
      assert.equal(outcome.queued, true);
      assert.equal(target.location, 'graveyard', 'trigger cannot interrupt the resolving effect');
      return true;
    } });
    await game.resolveChainStack();
    assert.equal(target.location, 'monster_zone');
    assert.equal(target.effectNegated, true);
    assert.ok(game.getSideState(side).graveyard.includes(spell), 'end-of-Chain Spell cleanup does not cause missed timing');
  });

  test(`Junk Synchron misses its optional WHEN timing when Normal Summoned in CL2 (${side})`, async () => {
    const requests = [];
    const game = duel(side, { onDecision: request => { requests.push(request); } });
    const { source, target } = junkSetup(game, side);
    game.chain.pushChainLink(side, card('lower-effect', side), [], { resolver: async () => true });
    game.chain.pushChainLink(side, card('normal-effect', side), [], { resolver: async () => {
      await normalSummonEvent(game, source, side);
      return true;
    } });
    await game.resolveChainStack();
    assert.equal(target.location, 'graveyard');
    assert.equal(requests.some(request => request.effect === 'junk-synchron-revive'), false);
  });

  test(`Junk Synchron still misses WHEN timing if the lower CL1 effect is negated (${side})`, async () => {
    const game = duel(side);
    const { source, target } = junkSetup(game, side);
    const lower = game.chain.pushChainLink(side, card('negated-lower-effect', side), [], { resolver: async () => {
      assert.fail('a negated effect does not perform its actions');
    } });
    lower.effectNegated = true;
    game.chain.pushChainLink(side, card('normal-effect', side), [], { resolver: async () => {
      await normalSummonEvent(game, source, side);
      return true;
    } });
    await game.resolveChainStack();
    assert.equal(target.location, 'graveyard');
  });

  test(`a lower link whose activation is negated cannot replace the last successful Summon timing (${side})`, async () => {
    const game = duel(side);
    const { source, target } = junkSetup(game, side);
    const spell = card('activation-negated-lower', side, { card_type: 'spell', type: 'Spell Card' });
    game.field.setSpellZone(side, 0, spell);
    const lower = game.chain.pushChainLink(side, spell, [], { context: { event: 'card-activation' }, resolver: async () => {
      assert.fail('an activation-negated link does not resolve');
    } });
    lower.activationNegated = true;
    game.chain.pushChainLink(side, card('normal-effect', side), [], { resolver: async () => {
      await normalSummonEvent(game, source, side);
      return true;
    } });
    await game.resolveChainStack();
    assert.equal(target.location, 'monster_zone');
    assert.ok(game.getSideState(side).graveyard.includes(spell));
  });

  test(`Junk Synchron misses WHEN timing if damage follows its Normal Summon in CL1 (${side})`, async () => {
    const game = duel(side);
    const { source, target } = junkSetup(game, side);
    game.chain.pushChainLink(side, card('normal-then-damage', side), [], { resolver: async () => {
      await normalSummonEvent(game, source, side);
      game.applyEffectDamage(game.getOpponentSide(side), 100);
      return true;
    } });
    await game.resolveChainStack();
    assert.equal(target.location, 'graveyard');
  });

  test(`Junk Synchron's optional ordinary Normal Summon trigger can be declined (${side})`, async () => {
    const game = duel(side, { onDecision: request => request.optional ? false : undefined });
    const { source, target } = junkSetup(game, side);
    await normalSummonEvent(game, source, side);
    assert.equal(target.location, 'graveyard');
    assert.equal(game.triggers.events.length, 0);
  });

  test(`Junk Synchron does not gain its Normal Summon trigger from a Special Summon (${side})`, async () => {
    const game = duel(side);
    const { source, target } = junkSetup(game, side);
    game.specialSummonCard(source, side, 0, { summonType: 'monster-reborn' });
    await game.resolveProcedureSummonWindow(source, side, 'monster-reborn');
    assert.equal(target.location, 'graveyard');
  });

  test(`Sangan and Arcanite mandatory triggers are ordered together before Fast Effects (${side})`, async () => {
    const activated = [];
    const game = duel(side, { onAnimation: event => {
      if (event.type === 'chain-pop') activated.push(game.chain.getLastLink().context.effectId);
    }, onDecision: request => request.type === 'order-trigger-effects'
      ? request.choices.find(choice => choice.effectId === 'ARCANITE_SYNCHRO_COUNTERS')?.value : undefined });
    const material = card(`sangan-${side}`, side, { id: '26202165', name: 'Sangan', name_en: 'Sangan' });
    game.field.setMonsterZone(side, 0, material);
    game.field.sendToGraveyard(material, side);
    const result = card(`searched-${side}`, side);
    result.location = 'deck';
    game.getSideState(side).deck.push(result);
    const source = arcanite(side);
    game.specialSummonCard(source, side, 0, { summonType: 'synchro' });
    await game.resolveProcedureSummonWindow(source, side, 'synchro');
    assert.deepEqual(activated, ['ARCANITE_SYNCHRO_COUNTERS', 'SANGAN_SEARCH']);
    assert.equal(source.counters.spell, 2);
    assert.ok(game.getSideState(side).hand.includes(result));
  });

  test(`all selected Utopia copies join the attack Trigger Chain in mandatory/turn/non-turn order (${side})`, async () => {
    let firstResponse;
    const game = duel(side, {
      onDecision: request => {
        if (request.effect === 'utopia-negate-attack') return true;
        if (request.type === 'select-utopia') return request.candidates.at(-1).uid;
      },
      onChainOpportunity: () => {
        firstResponse ||= game.chain.chainStack.map(link => ({ uid: link.sourceCard.uid, speed: link.spellSpeed }));
        return null;
      }
    });
    game.phases.currentPhase = 'battle';
    const other = game.getOpponentSide(side);
    const attacker = card(`attacker-${side}`, side, { atk: 3000 });
    game.field.setMonsterZone(side, 0, attacker);
    const ownFirst = utopia(game, side, 1, `own-utopia-first-${side}`);
    const ownSecond = utopia(game, side, 2, `own-utopia-second-${side}`);
    const emptyTarget = utopia(game, other, 0, `empty-target-${other}`, 0);
    const otherSource = utopia(game, other, 1, `other-utopia-${other}`);
    const detached = [...ownFirst.xyzMaterials, ...ownSecond.xyzMaterials, ...otherSource.xyzMaterials];
    const outcome = await game.resolveAttackDeclarationEvent({ attacker, attackingSide: side, defender: emptyTarget,
      attackerEntry: { zoneType: 'main', zoneIndex: 0 } });
    assert.deepEqual(firstResponse, [emptyTarget, ownSecond, ownFirst, otherSource].map(source => ({ uid: source.uid, speed: 1 })));
    assert.equal(outcome.attackNegated, true);
    assert.ok(game.getSideState(other).graveyard.includes(emptyTarget));
    for (const material of detached) assert.ok(game.getSideState(material.ownerId).graveyard.includes(material));
    assert.equal(ownFirst.xyzMaterials.length + ownSecond.xyzMaterials.length + otherSource.xyzMaterials.length, 0);
  });

  test(`declining one's optional Utopia triggers leaves the other controller's trigger available (${side})`, async () => {
    const game = duel(side, { onDecision: request => request.effect === 'utopia-negate-attack'
      ? request.side !== side : undefined });
    const attacker = card(`attacker-decline-${side}`, side);
    game.field.setMonsterZone(side, 0, attacker);
    const own = utopia(game, side, 1, `own-decline-${side}`);
    const other = utopia(game, game.getOpponentSide(side), 0, `other-decline-${side}`);
    const outcomes = await game.buildUtopiaAttackResponses({ attacker, attackingSide: side });
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0].card, other);
    assert.equal(own.xyzMaterials.length, 1);
    assert.equal(other.xyzMaterials.length, 0);
  });

  test(`a negated Utopia still activates its mandatory no-material Trigger but does not destroy itself (${side})`, async () => {
    const game = duel(side === 'player' ? 'opponent' : 'player');
    const source = utopia(game, side, 0, `negated-empty-${side}`, 0);
    source.effectNegated = true;
    const outcome = game.buildMandatoryEmptyUtopiaTrigger(source, side);
    assert.ok(outcome?.link);
    await game.resolveChainStack();
    assert.equal(outcome.link.effectNegated, true);
    assert.equal(source.location, 'monster_zone');
  });
}

test('timing filtering distinguishes optional WHEN from IF and mandatory conditions', () => {
  const engine = new TriggerEventEngine();
  const source = card('condition-check');
  engine.beginResolutionLink({ id: 2 });
  const event = engine.enqueue(source, 'SUMMON_SUCCESS');
  engine.endResolutionLink();
  engine.recordTimingEvent();
  assert.equal(engine.isEventAtActivationTiming(event, { mandatory: false, triggerCondition: 'when' }), false);
  assert.equal(engine.isEventAtActivationTiming(event, { mandatory: false, triggerCondition: 'if' }), true);
  assert.equal(engine.isEventAtActivationTiming(event, { mandatory: true, triggerCondition: 'when' }), true);
});
