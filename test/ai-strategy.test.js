import assert from 'node:assert/strict';
import test from 'node:test';

import {
  chooseAIAttackTarget,
  chooseAIHandDiscard,
  chooseAIMonsterPosition,
  chooseAINormalSummonPlan,
  scoreAIFieldSpell
} from '../src/content/AIStrategy.js';
import { CardState } from '../src/core/CardState.js';
import { markFieldSpellResolved } from '../src/core/FieldSpellRules.js';
import { DuelGame } from '../src/game.js';

function card(overrides = {}) {
  return new CardState({
    id: '10000000', uid: 'own-card', name: 'Public monster',
    card_type: 'monster', type: 'Normal Monster',
    atk: 1600, def: 1000, level: 4, race: 'Warrior',
    ...overrides
  });
}

function field(id) {
  return card({ id, card_type: 'spell', type: 'Spell Card', race: 'Field' });
}

function hiddenMonster() {
  const hidden = { isSetFaceDown: true };
  for (const key of ['uid', 'id', 'name', 'type', 'race', 'currentRace', 'atk', 'def',
    'position', 'getAtk', 'getDef', 'extra_type', 'isEffectMonster', 'isTuner', 'counters']) {
    Object.defineProperty(hidden, key, {
      get() { assert.fail(`AI read private opposing Set property ${key}`); }
    });
  }
  return hidden;
}

function position(card, value) {
  card.position = value;
  return card;
}

function game({ own = [], enemies = [], hand = [], graveyard = [], currentField = null,
  difficulty = 'hard', phase = 'main1', battleLegal = true } = {}) {
  const state = {
    aiDifficulty: difficulty, currentPhase: phase, turnCount: 2, rulesMode: 'strict',
    turn: { isBattlePhaseLegal: () => battleLegal },
    opponentHand: hand,
    field: { opponentMonsterZones: own, playerMonsterZones: enemies, extraMonsterZones: [], opponentGraveyard: graveyard },
    getMonsterEntries: side => (side === 'opponent' ? own : enemies)
      .map((monster, zoneIndex) => ({ card: monster, zoneType: 'main', zoneIndex })),
    getSideState: side => {
      assert.equal(side, 'opponent', 'AI may only inspect its own hand');
      return { hand };
    },
    getFieldSpellForSide: side => {
      assert.equal(side, 'opponent', 'opposing Field Spell identity is unnecessary');
      return currentField;
    }
  };
  for (const key of ['playerHand', 'playerDeck', 'playerExtraDeck', 'opponentDeck',
    'playerSpells', 'playerGraveyard', 'opponentGraveyard']) {
    Object.defineProperty(state, key, {
      get() { assert.fail(`AI accessed unnecessary/private zone ${key}`); }
    });
  }
  return state;
}

test('hard AI declines an unknown weak attack without reading hidden card data', () => {
  const targets = [{ card: hiddenMonster(), zoneIndex: 2 }];
  const weak = card({ atk: 1600 });
  assert.equal(chooseAIAttackTarget(game(), weak, targets), null);
  assert.equal(chooseAIAttackTarget(game({ difficulty: 'normal' }), weak, targets), targets[0]);
  const strong = card({ atk: 2500 });
  assert.equal(chooseAIAttackTarget(game(), strong, targets), targets[0]);
});

test('attack planning prefers public damage and declines a tied DEF stalemate', () => {
  const attacker = card({ atk: 2500 });
  const defender = { card: position(card({ atk: 1000, def: 2500 }), 'defense') };
  const vulnerable = { card: card({ atk: 500 }) };
  assert.equal(chooseAIAttackTarget(game(), attacker, [defender]), null);
  assert.equal(chooseAIAttackTarget(game(), attacker, [defender, vulnerable]), vulnerable);
  assert.equal(chooseAIAttackTarget(game(), card({ atk: 0 }), [vulnerable]), null);
});

test('equal ATK does not trade a valuable effect monster for a normal monster', () => {
  const attacker = card({ atk: 1800, isEffectMonster: true });
  const target = { card: card({ atk: 1800 }) };
  assert.equal(chooseAIAttackTarget(game(), attacker, [target]), null);
  assert.equal(chooseAIAttackTarget(game(), target.card, [{ card: attacker }])?.card, attacker);
});

test('position planning protects LP and preserves a hidden monster without a useful battle', () => {
  const own = card({ atk: 1200, def: 1000 });
  const enemy = card({ atk: 2000 });
  const state = game({ own: [own], enemies: [enemy, hiddenMonster()] });
  assert.equal(chooseAIMonsterPosition(state, own, { forSummon: true }), 'defense');
  own.isSetFaceDown = true;
  assert.equal(chooseAIMonsterPosition(state, own), 'defense');
  const beater = card({ atk: 2500, def: 3000 });
  assert.equal(chooseAIMonsterPosition(state, beater), 'attack');
  const link = card({ atk: 1000, extra_type: 'link' });
  assert.equal(chooseAIMonsterPosition(state, link), 'attack');
});

test('first-turn and Main Phase 2 planning cannot count an unavailable battle', () => {
  const defender = card({ atk: 1000, def: 2000 });
  assert.equal(chooseAIMonsterPosition(game({ battleLegal: false }), defender), 'defense');
  assert.equal(chooseAIMonsterPosition(game({ phase: 'main2' }), defender), 'defense');
});

test('summon planning preserves a stronger board instead of paying harmful Tributes', () => {
  const first = card({ uid: 'tribute-one', atk: 3000 });
  const second = card({ uid: 'tribute-two', atk: 2500 });
  const state = game({ own: [first, second], enemies: [hiddenMonster()] });
  const tributes = state.getMonsterEntries('opponent');
  const large = { card: card({ uid: 'large', atk: 2800, level: 7 }), tributes, destination: 0 };
  assert.equal(chooseAINormalSummonPlan(state, [large]), null);
  const small = { card: card({ uid: 'small', atk: 1400, def: 2000 }), tributes: [], destination: 4 };
  const selected = chooseAINormalSummonPlan(state, [large, small]);
  assert.equal(selected.card, small.card);
  assert.equal(selected.destination, 4);
  assert.equal(selected.isSet, true);
  assert.equal(Object.hasOwn(small, 'isSet'), false);
  assert.deepEqual(tributes.map(entry => entry.card), [first, second]);
});

test('a Tribute upgrade is worthwhile when it breaks a public opposing wall', () => {
  const own = [card({ uid: 'weak-one', atk: 500, def: 0 }), card({ uid: 'weak-two', atk: 500, def: 0 })];
  const state = game({ own, enemies: [card({ atk: 2200 }), hiddenMonster()] });
  const tributes = state.getMonsterEntries('opponent');
  const large = { card: card({ uid: 'upgrade', atk: 2500, level: 7 }), tributes, destination: 0 };
  const small = { card: card({ uid: 'small', atk: 1400 }), tributes: [], destination: 4 };
  const selected = chooseAINormalSummonPlan(state, [small, large]);
  assert.equal(selected.card, large.card);
  assert.equal(selected.isSet, false);
});

test('Field Spell scoring counts both players and never guesses a hidden race', () => {
  const mountain = field('50913601');
  const dragon = () => card({ race: 'Dragon' });
  assert.ok(scoreAIFieldSpell(game({ own: [dragon(), dragon()], enemies: [dragon(), hiddenMonster()] }), mountain) > 0);
  assert.equal(scoreAIFieldSpell(game({ own: [dragon()], enemies: [dragon(), hiddenMonster()] }), mountain), 0);
  assert.ok(scoreAIFieldSpell(game({ enemies: [dragon(), dragon(), hiddenMonster()], hand: [dragon()] }), mountain) < 0);
  assert.ok(scoreAIFieldSpell(game({ hand: [dragon()], enemies: [hiddenMonster()] }), mountain) > 0);
  assert.equal(scoreAIFieldSpell(game(), field('unknown-artwork')), 0);
});

test('Field Spell replacement avoids spending a duplicate or weakening its own board', () => {
  const active = field('50913601');
  active.location = 'field_zone';
  markFieldSpellResolved(active, 1);
  const state = game({ own: [card({ race: 'Dragon' })], enemies: [hiddenMonster()], currentField: active });
  assert.equal(scoreAIFieldSpell(state, field('50913601')), 0);
  assert.ok(scoreAIFieldSpell(state, field('87430998')) < 0);
});

test('hand-limit discard preserves a summon and defense over an unaffordable tribute', () => {
  const tribute = card({ uid: 'unaffordable', atk: 3000, level: 8 });
  const starter = card({ uid: 'summon', atk: 1000 });
  const mirror = card({ uid: 'defense', id: '44095762', card_type: 'trap' });
  const hand = [starter, tribute, mirror];
  const state = game({ hand, enemies: [hiddenMonster()] });
  assert.equal(chooseAIHandDiscard(state), tribute);
  assert.deepEqual(hand, [starter, tribute, mirror]);
  assert.equal(chooseAIHandDiscard(game({ hand: [] })), null);
});

test('all easy decisions preserve their engine fallback before reading any cards or zones', () => {
  const privateCard = new Proxy({}, { get: () => assert.fail('easy policy inspected a card') });
  const state = new Proxy({ aiDifficulty: 'easy' }, {
    get(target, key) {
      if (key === 'aiDifficulty') return target.aiDifficulty;
      assert.fail(`easy policy inspected ${String(key)}`);
    }
  });
  assert.equal(chooseAIAttackTarget(state, privateCard, [privateCard]), undefined);
  assert.equal(chooseAIMonsterPosition(state, privateCard), undefined);
  assert.equal(chooseAINormalSummonPlan(state, [privateCard]), undefined);
  assert.equal(scoreAIFieldSpell(state, privateCard), undefined);
  assert.equal(chooseAIHandDiscard(state, [privateCard]), undefined);
});

test('runtime strategy never even gathers opposing hidden zones through getSideState', () => {
  const state = new DuelGame({}, { aiDifficulty: 'hard' });
  state.phases.currentPhase = 'main1';
  state.phases.turnCount = 2;
  const own = card({ atk: 2500, race: 'Dragon' });
  const starter = card({ uid: 'runtime-starter', atk: 1800 });
  state.field.setMonsterZone('opponent', 0, own);
  state.field.playerMonsterZones[0] = hiddenMonster();
  state.field.extraMonsterZones[1] = { controllerId: 'player', card: hiddenMonster() };
  state.opponentHand = [starter];
  for (const key of ['playerHand', 'playerDeck', 'playerExtraDeck', 'playerSpells', 'opponentDeck']) {
    Object.defineProperty(state, key, {
      get() { assert.fail(`runtime strategy gathered hidden ${key}`); }
    });
  }
  state.getSideState = () => assert.fail('strategy gathered broad side state');
  state.getMonsterEntries = () => assert.fail('strategy gathered broad monster entries');
  const targets = [{ card: state.field.playerMonsterZones[0], zoneIndex: 0 }];
  assert.equal(chooseAIAttackTarget(state, own, targets), targets[0]);
  assert.equal(chooseAIMonsterPosition(state, own), 'attack');
  assert.equal(chooseAINormalSummonPlan(state, [{ card: starter, tributes: [], destination: 1 }]).card, starter);
  assert.ok(scoreAIFieldSpell(state, field('50913601')) > 0);
  assert.equal(chooseAIHandDiscard(state), starter);
});

test('normal and hard summon plans preserve both supported FLIP effects by setting them', () => {
  for (const difficulty of ['normal', 'hard']) {
    for (const id of ['54652250', '31560081']) {
      const source = card({ id, atk: 450, def: 600, type: 'Flip Effect Monster' });
      const state = game({ difficulty });
      assert.equal(chooseAIMonsterPosition(state, source, { forSummon: true }), 'defense');
      assert.equal(chooseAINormalSummonPlan(state, [{ card: source, tributes: [], destination: 0 }]).isSet, true);
    }
  }
});

test('Set Man-Eater Bug flips for an opposing opaque target, never a forced own-field destruction', () => {
  const source = card({ id: '54652250', atk: 450, def: 600, type: 'Flip Effect Monster' });
  source.isSetFaceDown = true;
  const enemy = hiddenMonster();
  const state = game({ own: [source], enemies: [enemy] });
  assert.equal(chooseAIMonsterPosition(state, source), 'attack');
  assert.equal(chooseAIMonsterPosition(state, source, { legalEffectTargets: [enemy] }), 'attack');
  assert.equal(chooseAIMonsterPosition(state, source, { legalEffectTargets: [source] }), 'defense');
  assert.equal(chooseAIMonsterPosition(game({ own: [source] }), source), 'defense');
});

test('Set Magician of Faith flips only for a legal Spell in its own public Graveyard', () => {
  const source = card({ id: '31560081', atk: 300, def: 400, type: 'Flip Effect Monster' });
  source.isSetFaceDown = true;
  const spell = card({ id: '12580477', card_type: 'spell', type: 'Spell Card' });
  const state = game({ own: [source], enemies: [hiddenMonster()], graveyard: [spell] });
  assert.equal(chooseAIMonsterPosition(state, source), 'attack');
  assert.equal(chooseAIMonsterPosition(state, source, { legalEffectTargets: [] }), 'defense');
  assert.equal(chooseAIMonsterPosition(game({ own: [source], graveyard: [card()] }), source), 'defense');
  assert.equal(chooseAIMonsterPosition(game({ own: [source] }), source), 'defense');
  state.defense = { hasProtection: () => true };
  assert.equal(chooseAIMonsterPosition(state, source), 'defense');
});

test('a useful FLIP Set can replace a weak beater plan against a public wall', () => {
  const bug = card({ id: '54652250', atk: 450, def: 600, type: 'Flip Effect Monster' });
  const weak = card({ atk: 1400 });
  const state = game({ enemies: [card({ atk: 3000 }), hiddenMonster()] });
  const result = chooseAINormalSummonPlan(state, [
    { card: weak, tributes: [], destination: 0 },
    { card: bug, tributes: [], destination: 1 }
  ]);
  assert.equal(result.card, bug);
  assert.equal(result.isSet, true);
});

test('Sangan Tribute preference credits its search once and respects known HOPT use', () => {
  const sangan = card({ id: '26202165', atk: 1000, def: 600, type: 'Effect Monster' });
  const useful = card({ id: 'other-effect', atk: 900, def: 500, type: 'Effect Monster' });
  const upgrade = card({ atk: 2400, level: 6 });
  const state = game({ own: [sangan, useful] });
  const first = { card: upgrade, tributes: [{ card: sangan }], destination: 0 };
  const second = { card: upgrade, tributes: [{ card: useful }], destination: 1 };
  assert.equal(chooseAINormalSummonPlan(state, [second, first]).destination, 0);
  state.effects = { hasUsedHOPT: (name, turn, scope) => {
    assert.equal(name, 'Sangan');
    assert.equal(scope.playerId, 'opponent');
    assert.equal(scope.effectId, 'SANGAN_SEARCH');
    return true;
  } };
  assert.equal(chooseAINormalSummonPlan(state, [second, first]).destination, 1);
});
