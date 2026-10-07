import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';
import { STARTER_CARDS } from '../src/cards.js';
import { markFieldSpellPending } from '../src/core/FieldSpellRules.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';

const SIDES = ['player', 'opponent'];
const RULES = [
  { id: '92481084', event: 'temple-minds-eye-cinematic', profile: 'temple-minds-eye',
    target: 'defender', damageSide: 'defender', defenderDamage: 1000,
    change: { originalDamage: 100, modifiedDamage: 1000 },
    publicChange: { kind: 'damage-fixed', value: 1000 },
    attacker: { atk: 3000 }, defender: { atk: 2900 } },
  { id: '28120197', event: 'canyon-damage-cinematic', profile: 'canyon-damage',
    target: 'attacker', damageSide: 'attacker', attackerDamage: 1200,
    change: { originalDamage: 600, modifiedDamage: 1200 },
    publicChange: { kind: 'damage-double', value: 2 },
    attacker: { atk: 1600 }, defender: { atk: 100, def: 2200, race: 'Rock', position: 'defense' } },
  { id: '11102908', event: 'shien-mist-reduction-cinematic', profile: 'shien-mist-reduction',
    target: 'attacker', attackerDamage: 300,
    change: { reduction: 500, calculatedAtk: 1500 },
    publicChange: { kind: 'atk-decrease', value: 500 },
    attacker: { atk: 2000 }, defender: { name_en: 'The Six Samurai - Zanji', atk: 1800 } },
  { id: '53527835', event: 'dark-city-boost-cinematic', profile: 'dark-city-boost',
    target: 'attacker', defenderDamage: 400,
    change: { bonus: 1000, calculatedAtk: 2700 },
    publicChange: { kind: 'atk-increase', value: 1000 },
    attacker: { name_en: 'Destiny HERO - Dasher', atk: 1700 }, defender: { atk: 2300 } }
];
const CINEMATICS = new Set(RULES.map(rule => rule.event));
let serial = 0;

const opposite = side => side === 'player' ? 'opponent' : 'player';

function monster(side, { position = 'attack', ...values } = {}) {
  const card = new CardState({ id: String(70000000 + serial), uid: `private-battle-${serial++}`,
    name: 'Public battle monster', name_en: 'Public battle monster', card_type: 'monster',
    type: 'Normal Monster', race: 'Warrior', attribute: 'EARTH', level: 4,
    atk: 1700, def: 1000, ...values });
  card.ownerId = card.controllerId = side;
  card.position = position;
  return card;
}

function publicPosition(ref) {
  const sign = ref.owner === 'player' ? 1 : -1;
  return ref.zoneType === 'field' ? [-8 * sign, .62, 7 * sign]
    : [ref.zoneIndex * 2, .62, ref.zoneType === 'extra' ? 0 : 3 * sign];
}

function observedGame() {
  const observed = [];
  const allEvents = [];
  let duel;
  duel = new DuelGame({ onAnimation(event) {
    allEvents.push(event.type);
    if (!CINEMATICS.has(event.type)) return;
    const targetEntry = duel.getMonsterEntry(event.target, {
      zoneType: event.zoneType, zoneIndex: event.zoneIndex
    });
    observed.push({ event, subPhase: duel.phases.damageStepSubPhase,
      battleStep: duel.phases.battleStep,
      targetWasPublic: targetEntry?.card === event.targetCard && !targetEntry.card.isSetFaceDown,
      targetLocation: event.targetCard?.location,
      playerLP: duel.playerLP, opponentLP: duel.opponentLP,
      visual: createPublicCombatVisual(event, duel, publicPosition) });
  } });
  duel.phases.turnCount = 2;
  duel.delay = async () => true;
  duel.startPhaseFlow = () => {};
  duel.scheduleAction = () => 0;
  return { duel, observed, allEvents };
}

async function activateField(harness, id, side) {
  const { duel, observed } = harness;
  duel.phases.currentTurnOwner = side;
  duel.phases.currentPhase = 'main1';
  const template = STARTER_CARDS.find(card => String(card.id) === id);
  assert.ok(template, `missing real Field Spell template ${id}`);
  const source = new CardState({ ...template, uid: `private-source-${serial++}` });
  source.ownerId = source.controllerId = side;
  source.location = 'hand';
  duel.getSideState(side).hand.push(source);
  assert.equal(await duel.activateFieldSpellFromHand(source.uid, side), true);
  assert.equal(source.fieldActivationState, 'resolved');
  assert.equal(duel.getFieldSpellForSide(side), source);
  assert.equal(duel.getSideState(side).hand.includes(source), false);
  assert.equal(observed.length, 0, 'activating the Field must not play its conditional battle cinematic');
  return source;
}

function placeBattle(harness, rule, attackingSide, { extra = false, direct = false,
  attackerValues = {}, defenderValues = {}, hiddenDefender = false } = {}) {
  const { duel } = harness;
  const defendingSide = opposite(attackingSide);
  duel.phases.currentTurnOwner = attackingSide;
  duel.phases.currentPhase = 'battle';
  duel.phases.setBattleStep('battle_step');
  const attacker = monster(attackingSide, { ...rule.attacker, ...attackerValues });
  const defender = direct ? null : monster(defendingSide, { ...rule.defender, ...defenderValues });
  const attackerRef = extra ? { zoneType: 'extra', zoneIndex: attackingSide === 'player' ? 0 : 1 }
    : { zoneType: 'main', zoneIndex: 2 };
  const defenderRef = extra ? { zoneType: 'extra', zoneIndex: attackingSide === 'player' ? 1 : 0 }
    : { zoneType: 'main', zoneIndex: 3 };
  if (extra) duel.field.setExtraMonsterZone(attackerRef.zoneIndex, attackingSide, attacker);
  else duel.field.setMonsterZone(attackingSide, attackerRef.zoneIndex, attacker);
  if (defender) {
    defender.isSetFaceDown = hiddenDefender;
    if (extra) duel.field.setExtraMonsterZone(defenderRef.zoneIndex, defendingSide, defender);
    else duel.field.setMonsterZone(defendingSide, defenderRef.zoneIndex, defender);
  }
  return { attacker, defender, attackingSide, defendingSide, attackerRef, defenderRef,
    resolve: () => duel.resolveBattleDamage(attacker, duel.getMonsterEntry(attackingSide, attackerRef),
      attackingSide, defender && duel.getMonsterEntry(defendingSide, defenderRef)) };
}

function assertCinematic(harness, battle, rule, source, { sourceCount = 1,
  change = rule.change, direct = false } = {}) {
  const { observed } = harness;
  assert.equal(observed.length, 1, `one conditional cinematic for ${rule.id}`);
  const observation = observed[0];
  const { event, visual } = observation;
  const targetIsAttacker = direct || rule.target === 'attacker';
  const targetCard = targetIsAttacker ? battle.attacker : battle.defender;
  const targetSide = targetIsAttacker ? battle.attackingSide : battle.defendingSide;
  const targetRef = targetIsAttacker ? battle.attackerRef : battle.defenderRef;
  assert.equal(observation.subPhase, 'calc');
  assert.equal(observation.battleStep, 'damage_step');
  assert.equal(observation.targetWasPublic, true);
  assert.equal(observation.targetLocation, targetRef.zoneType === 'extra' ? 'extra_monster_zone' : 'monster_zone');
  assert.equal(observation.playerLP, 8000, 'the cinematic precedes LP settlement');
  assert.equal(observation.opponentLP, 8000);
  assert.equal(event.type, rule.event);
  assert.equal(event.card, source);
  assert.equal(event.sourceSide, source.controllerId);
  assert.equal(event.sourceZoneType, 'field');
  assert.equal(event.sourceZoneIndex, 0);
  assert.equal(event.target, targetSide);
  assert.equal(event.targetCard, targetCard);
  assert.equal(event.zoneType, targetRef.zoneType);
  assert.equal(event.zoneIndex, targetRef.zoneIndex);
  assert.equal(event.sourceCount, sourceCount);
  for (const [property, value] of Object.entries(change)) assert.equal(event[property], value, property);
  if (rule.damageSide) assert.equal(event.damageSide,
    rule.damageSide === 'attacker' ? battle.attackingSide : battle.defendingSide);
  if (rule.id === '92481084') assert.equal(event.directAttack, direct);
  assert.ok(visual, 'the live event reaches the public visual adapter');
  assert.equal(visual.profile, rule.profile);
  assert.deepEqual(visual.sourceRef, { owner: source.controllerId, zoneType: 'field', zoneIndex: 0 });
  assert.deepEqual(visual.targetRef, { owner: targetSide, ...targetRef });
  assert.deepEqual(visual.source, publicPosition(visual.sourceRef));
  assert.deepEqual(visual.target, publicPosition(visual.targetRef));
  assert.equal(visual.card.id, rule.id);
  assert.equal(visual.targetCard.id, targetCard.id);
  assert.notEqual(visual.card, source);
  assert.notEqual(visual.targetCard, targetCard);
  assert.equal(Object.isFrozen(visual), true);
  assert.equal(Object.isFrozen(visual.card), true);
  assert.equal(Object.isFrozen(visual.targetCard), true);
  assert.equal(JSON.stringify(visual).includes('private-'), false);
  assert.equal('uid' in visual.targetCard, false);
  assert.equal('currentAtk' in visual.targetCard, false);
  assert.equal('effectUsage' in visual.card, false);
  assert.equal(Object.isFrozen(visual.ruleChange), true);
  assert.equal(visual.ruleChange.kind, rule.publicChange.kind);
  assert.equal(visual.ruleChange.value, change.bonus ?? change.reduction ?? rule.publicChange.value);
  assert.equal(visual.ruleChange.sourceCount, sourceCount);
  if ('calculatedAtk' in change) assert.equal(visual.ruleChange.calculatedAtk, change.calculatedAtk);
  if ('originalDamage' in change) {
    assert.equal(visual.ruleChange.originalDamage, change.originalDamage);
    assert.equal(visual.ruleChange.modifiedDamage, change.modifiedDamage);
    assert.equal(visual.ruleChange.damageSide, event.damageSide);
    assert.equal(visual.ruleChange.directAttack, direct);
  }
}

for (const rule of RULES) {
  for (const attackingSide of SIDES) {
    for (const sourceSide of SIDES) {
      test(`${rule.id} emits its actual DamageCalc cinematic after a real activation (${attackingSide}/${sourceSide})`, async () => {
        const harness = observedGame();
        const source = await activateField(harness, rule.id, sourceSide);
        const battle = placeBattle(harness, rule, attackingSide);
        assert.equal(await battle.resolve(), true);
        assertCinematic(harness, battle, rule, source);
        assert.equal(harness.duel[`${attackingSide}LP`], 8000 - (rule.attackerDamage || 0));
        assert.equal(harness.duel[`${battle.defendingSide}LP`], 8000 - (rule.defenderDamage || 0));
        assert.equal(battle.attacker.getAtk(), rule.attacker.atk, 'DamageCalc must not leave a persistent ATK change');
      });
    }
  }

  test(`${rule.id} anchors its real Extra Monster Zone beneficiary`, async () => {
    const harness = observedGame();
    const source = await activateField(harness, rule.id, 'opponent');
    const battle = placeBattle(harness, rule, 'player', { extra: true });
    assert.equal(await battle.resolve(), true);
    assertCinematic(harness, battle, rule, source);
  });

  test(`${rule.id} emits once for overlapping resolved copies and preserves the actual primary source`, async () => {
    const harness = observedGame();
    // Activate in reverse order: source selection must follow authoritative
    // BattleOutcome provenance rather than the newest environment artwork.
    await activateField(harness, rule.id, 'opponent');
    const primary = await activateField(harness, rule.id, 'player');
    const battle = placeBattle(harness, rule, 'opponent');
    const change = rule.id === '53527835' ? { bonus: 2000, calculatedAtk: 3700 }
      : rule.id === '11102908' ? { reduction: 1000, calculatedAtk: 1000 } : rule.change;
    assert.equal(await battle.resolve(), true);
    assertCinematic(harness, battle, rule, primary, { sourceCount: 2, change });
    const expectedAttackDamage = rule.id === '11102908' ? 800 : (rule.attackerDamage || 0);
    const expectedDefenseDamage = rule.id === '53527835' ? 1400 : (rule.defenderDamage || 0);
    assert.equal(harness.duel.opponentLP, 8000 - expectedAttackDamage);
    assert.equal(harness.duel.playerLP, 8000 - expectedDefenseDamage);
    assert.equal(battle.attacker.getAtk(), rule.attacker.atk);
  });

  test(`${rule.id} never animates an inactive, Set, negated, removed or stale source`, async () => {
    const invalidations = [
      ['pending', (duel, source) => markFieldSpellPending(source)],
      ['Set', (duel, source) => { source.isSetFaceDown = true; }],
      ['effect-negated', (duel, source) => { source.effectNegated = true; }],
      ['activation-negated', (duel, source) => { source.activationNegated = true; }],
      ['defense-negated', (duel, source) => duel.defense.negateCard(source.uid)],
      ['removed', (duel, source) => duel.field.sendToGraveyard(source, source.ownerId)],
      ['old incarnation', (duel, source) => { source.runtimeInstanceId += '-new'; }]
    ];
    for (const [reason, invalidate] of invalidations) {
      const harness = observedGame();
      const source = await activateField(harness, rule.id, 'opponent');
      invalidate(harness.duel, source);
      const battle = placeBattle(harness, rule, 'player');
      assert.equal(await battle.resolve(), true, reason);
      assert.equal(harness.observed.length, 0, reason);
      assert.equal(battle.attacker.getAtk(), rule.attacker.atk, reason);
    }
  });
}

for (const attackingSide of SIDES) {
  for (const sourceSide of SIDES) {
    test(`direct Temple cinematic anchors the public attacker and marks the actual damaged side (${attackingSide}/${sourceSide})`, async () => {
      const rule = RULES[0];
      const harness = observedGame();
      const source = await activateField(harness, rule.id, sourceSide);
      const battle = placeBattle(harness, rule, attackingSide, { direct: true });
      assert.equal(await harness.duel.resolveDirectAttackDamage(battle.attacker,
        harness.duel.getMonsterEntry(attackingSide, battle.attackerRef), attackingSide), true);
      assertCinematic(harness, battle, rule, source, { direct: true,
        change: { originalDamage: 3000, modifiedDamage: 1000 } });
      assert.equal(harness.observed[0].visual.ruleChange.damageSide, battle.defendingSide);
      assert.equal(harness.observed[0].visual.ruleChange.directAttack, true);
      assert.equal(harness.duel[`${battle.defendingSide}LP`], 7000);
      assert.equal(harness.duel[`${attackingSide}LP`], 8000);
    });
  }
}

for (const attackingSide of SIDES) {
  test(`Canyon does not inspect its Set Rock before the public battle reveal (${attackingSide})`, async () => {
    const harness = observedGame();
    const source = await activateField(harness, RULES[1].id, opposite(attackingSide));
    const battle = placeBattle(harness, RULES[1], attackingSide, { hiddenDefender: true });
    for (const property of ['race', 'currentRace', 'name_en']) {
      let value = battle.defender[property];
      Object.defineProperty(battle.defender, property, {
        get() { assert.equal(battle.defender.isSetFaceDown, false, `hidden ${property} read before reveal`); return value; },
        set(next) { value = next; }, configurable: true
      });
    }
    assert.equal(await battle.resolve(), true);
    assertCinematic(harness, battle, RULES[1], source);
    assert.equal(battle.defender.isSetFaceDown, false);
    assert.ok(harness.allEvents.indexOf('flip-summon') < harness.allEvents.indexOf(RULES[1].event));
    assert.ok(harness.allEvents.indexOf(RULES[1].event) < harness.allEvents.indexOf('lp-loss'));
  });
}

const NON_APPLYING_BATTLES = [
  [{ attackerValues: { atk: 2900 } },
    { defenderValues: { position: 'defense', def: 1000 } },
    { direct: true, attackerValues: { atk: 0 } }],
  [{ defenderValues: { race: 'Warrior' } },
    { defenderValues: { position: 'attack' } },
    { attackerValues: { atk: 2500 } }, { direct: true }],
  [{ defenderValues: { name_en: 'Great Shogun Shien' } }, { direct: true }],
  [{ attackerValues: { name_en: 'Elemental HERO Sparkman' } },
    { attackerValues: { atk: 2300 } }, { attackerValues: { atk: 2400 } },
    { attackerValues: { name_en: 'Public Warrior' }, defenderValues: { name_en: 'Destiny HERO - Dasher' } },
    { direct: true }]
];

for (const [index, rule] of RULES.entries()) {
  test(`${rule.id} requires its actual battle condition and an active source`, async () => {
    const absent = observedGame();
    assert.equal(await placeBattle(absent, rule, 'player').resolve(), true);
    assert.equal(absent.observed.length, 0, 'the Field source is absent');
    for (const options of NON_APPLYING_BATTLES[index]) {
      const harness = observedGame();
      await activateField(harness, rule.id, 'opponent');
      assert.equal(await placeBattle(harness, rule, 'player', options).resolve(), true);
      assert.equal(harness.observed.length, 0, JSON.stringify(options));
    }
  });
}

test('Canyon and Temple cinematics follow the applied calculation stages without changing the final damage order', async () => {
  const harness = observedGame();
  const canyon = await activateField(harness, RULES[1].id, 'player');
  const temple = await activateField(harness, RULES[0].id, 'opponent');
  const battle = placeBattle(harness, RULES[1], 'player');
  assert.equal(await battle.resolve(), true);
  assert.deepEqual(harness.observed.map(({ event }) => event.type), [RULES[1].event, RULES[0].event]);
  const [doubled, fixed] = harness.observed;
  assert.equal(doubled.event.card, canyon);
  assert.equal(doubled.event.sourceSide, 'player');
  assert.equal(doubled.event.originalDamage, 600);
  assert.equal(doubled.event.modifiedDamage, 1200);
  assert.equal(fixed.event.card, temple);
  assert.equal(fixed.event.sourceSide, 'opponent');
  assert.equal(fixed.event.originalDamage, 1200);
  assert.equal(fixed.event.modifiedDamage, 1000);
  assert.equal(fixed.event.targetCard, battle.attacker);
  assert.equal(fixed.event.damageSide, 'player');
  assert.ok(harness.observed.every(observation => observation.subPhase === 'calc'));
  assert.equal(harness.duel.playerLP, 7000);
  assert.equal(harness.duel.opponentLP, 8000);
  assert.equal(battle.attacker.getAtk(), 1600);
});
