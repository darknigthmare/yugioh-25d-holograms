import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NativeDuelGame, NATIVE_TCG_DUEL_FLAGS, shuffleNativeMainDeck } from '../src/core/native/NativeDuelGame.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { CardState } from '../src/core/CardState.js';
import { FieldState } from '../src/core/FieldState.js';
import { hasResolvedFieldSpellActivation } from '../src/core/FieldSpellRules.js';
import { resolveHologramMonsterProfile } from '../src/ui/CombatVisualProfiles.js';

const resourcesPromise = loadNativeCardResources({ fetch: async path => (
  new Response(await readFile(new URL(`../public${path}`, import.meta.url)))
) });
const seed = [1n, 2n, 3n, 4n];
const zeroDrawTeam = { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 };

async function fixture({ startingPlayer = 'player', onDecision, onGameOver } = {}) {
  const resources = await resourcesPromise;
  const events = [], states = [], logs = [];
  const game = new NativeDuelGame({
    onDecision: onDecision || (request => request.multiple
      ? request.candidates.slice(0, request.minimum).map(card => card.uid)
      : request.choices?.[0]?.value),
    onGameOver: onGameOver || (() => {}),
    onStateChange: state => states.push(state),
    onAnimation: event => events.push(event),
    onLog: (message, type) => logs.push({ message, type })
  }, { rulesMode: 'native', nativeResources: resources, seed,
    teams: [zeroDrawTeam, zeroDrawTeam], aiDelay: 0,
    validateDeck: () => ({ valid: true, issues: [] }) });
  const base = { id: 46986414, name: 'Dark Magician', card_type: 'monster', type: 'Normal Monster' };
  assert.equal(await game.initDecks([base], [base], [], [], { startingPlayer }), true);
  const C = game.runtime.constants;
  const add = (code, side, location, sequence = 0, position = C.OcgPosition.FACEUP_ATTACK) => {
    game.runtime.addCard({ code, controller: game.controllerForSide(side), location, sequence, position });
  };
  return { game, C, add, events, states, logs, resources };
}

test('native façade resolves Zombie World and exposes immutable native stats in every public zone', async () => {
  const { game, C, add, events, states } = await fixture();
  try {
    add(4064256, 'player', C.OcgLocation.HAND);
    add(89631139, 'player', C.OcgLocation.MZONE);
    add(89631139, 'opponent', C.OcgLocation.GRAVE);
    assert.equal(await game.start(), true);
    const zombie = game.playerHand.find(card => card.id === 4064256);
    assert.ok(zombie instanceof CardState);
    assert.ok(game.field instanceof FieldState);
    assert.equal(game.canActivateSpell(zombie), true);
    assert.equal(await game.activateFieldSpellFromHand(zombie.uid), true);
    assert.equal(game.nativeError, null);
    assert.equal(game.currentPhase, 'main1');
    assert.equal(game.playerMonsters[0].currentRace, 'Zombie');
    assert.equal(game.opponentGraveyard[0].currentRace, 'Zombie');
    assert.equal(game.playerMonsters[0].getAtk(), 3000);
    assert.equal(game.playerMonsters[0].getDef(), 2500);
    assert.equal(game.playerFieldSpell.id, 4064256);
    assert.equal(hasResolvedFieldSpellActivation(game.playerFieldSpell), true);
    assert.equal(game.playerLP, game.runtime.queryField().players[0].lp);
    assert.ok(events.some(event => event.type === 'chain-end'));
    assert.ok(states.every(state => state === game));
    assert.ok(Object.isFrozen(game.playerMonsters));
    assert.throws(() => { game.playerMonsters[0].currentAtk = 1; }, TypeError);
    assert.throws(() => { game.playerMonsters.push(null); }, TypeError);
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('native façade never reapplies a card-specific JavaScript counter ATK bonus', async () => {
  const { game, C, add } = await fixture();
  try {
    add(31924889, 'player', C.OcgLocation.MZONE);
    assert.equal(await game.start(), true);
    const card = game.playerMonsters[0];
    const exact = game.runtime.queryCard({ ...card.nativeRef,
      flags: C.OcgQueryFlags.ATTACK | C.OcgQueryFlags.COUNTERS });
    assert.equal(card.getAtk(), exact.attack);
    assert.deepEqual(card.counters, exact.counters || {});
    assert.ok(Object.isFrozen(card.counters));
  } finally { game.dispose(); }
});

test('native façade sets and activates a field; legal action IDs include its ignition', async () => {
  const { game, C, add } = await fixture();
  try {
    add(80921533, 'player', C.OcgLocation.HAND); // Mausoleum of the Emperor
    assert.equal(await game.start(), true);
    const card = game.playerHand[0];
    assert.ok(game.getAvailableActions().spellSetCardUids.includes(card.uid));
    assert.equal(game.canSetSpell(card), true);
    assert.equal(await game.setFieldSpellFaceDownFromHand(card.uid), true);
    assert.equal(game.playerFieldSpell.isSetFaceDown, true);
    assert.equal(hasResolvedFieldSpellActivation(game.playerFieldSpell), false);
    assert.equal(await game.activateSetFieldSpell(), true);
    assert.equal(hasResolvedFieldSpellActivation(game.playerFieldSpell), true);
    assert.equal(await game.activateNativeAction('stale:action'), false);
    const available = game.getAvailableActions();
    assert.ok(Array.isArray(available.nativeActions));
    assert.ok(available.nativeActions.every(action => action.id && action.kind && Number.isInteger(action.index)));
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('native normal summon obeys the offered procedure and preserves the requested zone', async () => {
  const { game, C, add } = await fixture();
  try {
    add(31560081, 'player', C.OcgLocation.HAND); // Magician of Faith
    assert.equal(await game.start(), true);
    const card = game.playerHand[0];
    assert.ok(game.getAvailableActions().normalSummonCardUids.includes(card.uid));
    assert.equal(await game.summonMonster(card.uid, 3), true);
    assert.equal(game.playerMonsters[3]?.id, card.id);
    assert.equal(game.normalSummonedThisTurn, true);
    assert.deepEqual(game.getAvailableActions().normalSummonCardUids, []);
    assert.equal(await game.summonMonster(card.uid, 0), false);
    assert.equal(await game.toggleMonsterPosition(3), false);
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('native phase changes and AI choices come only from current command prompts', async () => {
  const { game, C } = await fixture();
  try {
    assert.equal(await game.start(), true);
    assert.equal(game.currentTurn, 'player');
    assert.equal(game.turnCount, 1);
    assert.equal(game.getAvailableActions().canBattlePhase, false);
    assert.equal(await game.changePhase('battle'), false);
    assert.equal(await game.changePhase('end'), true);
    assert.equal(game.currentTurn, 'player');
    assert.equal(game.turnCount, 3);
    assert.equal(game.getAvailableActions().canBattlePhase, true);
    assert.equal(await game.changePhase('battle'), true);
    assert.equal(game.currentPhase, 'battle');
    assert.equal(await game.changePhase('main2'), true);
    assert.equal(game.currentPhase, 'main2');
    assert.equal(await game.changePhase('draw'), false);
    assert.equal(game.runtime.options.flags, NATIVE_TCG_DUEL_FLAGS);
    assert.equal(game.runtime.options.flags & C.OcgDuelMode.TEST_MODE, 0n);
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('a cancelled mandatory native decision stays pending and never auto-selects a player choice', async () => {
  const { game, C, add } = await fixture({ onDecision: () => null });
  try {
    add(31560081, 'player', C.OcgLocation.HAND);
    assert.equal(await game.start(), true);
    const card = game.playerHand[0];
    // No destination intent makes the native SelectPlace decision reach the UI.
    const summon = game.getAvailableActions().nativeActions.find(action => action.kind === 'SELECT_SUMMON');
    assert.ok(summon);
    assert.equal(await game.activateNativeAction(summon.id), true);
    assert.equal(game.pendingNativeDecision.type, C.OcgMessageType.SELECT_PLACE);
    assert.ok(game.playerMonsters.every(card => card === null));
    assert.equal(game.getAvailableActions().nativeActions.length, 0);
    assert.equal(await game.respondNative({ type: C.OcgResponseType.SELECT_PLACE,
      places: [{ player: 0, location: C.OcgLocation.MZONE, sequence: 2 }] }), true);
    assert.equal(game.playerMonsters[2]?.id, card.id);
  } finally { game.dispose(); }
});

test('native starting-player mapping, face-down Extra Deck and cleanup retain the same façade', async () => {
  const { game, C, add } = await fixture({ startingPlayer: 'opponent' });
  try {
    add(98978921, 'player', C.OcgLocation.EXTRA, 0, C.OcgPosition.FACEDOWN_DEFENSE);
    add(16178681, 'player', C.OcgLocation.HAND);
    assert.equal(await game.start(), true);
    assert.equal(game.playerController, 1);
    assert.equal(game.currentTurn, 'player');
    assert.equal(game.turnCount, 2);
    assert.equal(game.playerExtraDeck[0].isFaceUpInExtraDeck, false);
    assert.equal(game.playerExtraDeck[0].getDef(), null);
    assert.equal(game.playerExtraDeck[0].linkArrows.length, 1);
    const scale = game.playerHand[0];
    assert.equal(scale.leftScale, 4);
    assert.equal(scale.rightScale, 4);
    assert.ok(game.canActivatePendulumScale(scale));
    assert.equal(game.addCardToHand({ id: 1 }), null);
    game.dispose();
    assert.equal(game.runtime.closed, true);
    assert.equal(game.pendingNativeDecision, null);
  } finally { game.dispose(); }
});

test('native battle damage and attack limits are projected from the core battle', async () => {
  const { game, C, add, events } = await fixture();
  try {
    add(46986414, 'player', C.OcgLocation.MZONE);
    assert.equal(await game.start(), true);
    assert.equal(await game.changePhase('end'), true);
    assert.equal(await game.changePhase('battle'), true);
    const attacker = game.playerMonsters[0];
    assert.ok(game.getAvailableActions().attackCardUids.includes(attacker.uid));
    assert.equal(await game.executeAttack(0), true);
    assert.equal(game.opponentLP, 5500);
    assert.equal(game.opponentLP, game.runtime.queryField().players[1].lp);
    assert.equal(game.hasMonsterAttacked(0), true);
    assert.equal(await game.executeAttack(0), false);
    assert.ok(events.some(event => event.type === 'lp-loss' && event.target === 'opponent' && event.damage === 2500));
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('a native core win notifies the same façade exactly once', async () => {
  const outcomes = [];
  const { game, C, add } = await fixture({ onGameOver: (...result) => outcomes.push(result) });
  try {
    // A real direct attack, rather than a synthetic JavaScript endGame call.
    add(46986414, 'player', C.OcgLocation.MZONE);
    assert.equal(await game.start(), true);
    for (let turn = 0; turn < 4; turn += 1) {
      assert.equal(await game.changePhase('end'), true);
      assert.equal(await game.changePhase('battle'), true);
      assert.equal(await game.executeAttack(0), true);
      if (game.winner) break;
    }
    assert.equal(game.winner, 'player');
    assert.equal(game.endReason, 'lp_zero');
    assert.equal(outcomes.length, 1);
    assert.equal(outcomes[0][0], 'player');
    assert.equal(outcomes[0][1].source, 'ocgcore-wasm');
    assert.equal(await game.changePhase('end'), false);
    assert.equal(game.endGame('opponent', 'lp_zero'), false);
    assert.equal(outcomes.length, 1);
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('Mausoleum native ignition pays the actual LP cost and summons through the core', async () => {
  const { game, C, add } = await fixture();
  try {
    add(80921533, 'player', C.OcgLocation.HAND);
    add(46986414, 'player', C.OcgLocation.HAND);
    assert.equal(await game.start(), true);
    const field = game.playerHand.find(card => card.id === 80921533);
    assert.equal(await game.activateFieldSpellFromHand(field.uid), true);
    const sequence = game.playerFieldSpell.fieldActivationSequence;
    const action = game.getAvailableActions().nativeActions.find(action => (
      action.kind === 'SELECT_ACTIVATE' && action.card?.id === 80921533
    ));
    assert.ok(action);
    assert.equal(await game.activateNativeAction(action.id), true);
    assert.equal(game.playerLP, 6000);
    assert.equal(game.playerLP, game.runtime.queryField().players[0].lp);
    assert.ok(game.playerMonsters.some(card => card?.id === 46986414));
    assert.equal(game.playerFieldSpell.fieldActivationSequence, sequence);
    assert.equal(hasResolvedFieldSpellActivation(game.playerFieldSpell), true);
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('Pendulum Scale activations and the offered Pendulum procedure use native candidates', async () => {
  const { game, C, add } = await fixture({ onDecision: request => {
    if (request.multiple) return request.candidates.slice(0, request.minimum).map(card => card.uid);
    if (request.choices?.some(choice => choice.value === null)) return null;
    return request.choices?.[0]?.value;
  } });
  try {
    add(94415058, 'player', C.OcgLocation.HAND); // Stargazer, Scale 1
    add(20409757, 'player', C.OcgLocation.HAND); // Timegazer, Scale 8
    add(97590747, 'player', C.OcgLocation.HAND); // La Jinn, Level 4
    assert.equal(await game.start(), true);
    const low = game.playerHand.find(card => card.id === 94415058);
    assert.equal(await game.activatePendulumScale(low.uid, 0), true);
    const high = game.playerHand.find(card => card.id === 20409757);
    assert.equal(await game.activatePendulumScale(high.uid, 4), true);
    assert.equal(game.playerSpells[0].isPendulumScale, true);
    assert.equal(game.playerSpells[4].isPendulumScale, true);
    assert.equal(game.playerSpells[0].leftScale, 1);
    assert.equal(game.playerSpells[4].rightScale, 8);
    assert.equal(game.getAvailableActions().canPendulumSummon, true);
    const monster = game.playerHand.find(card => card.id === 97590747);
    assert.equal(await game.performPendulumSummon('player', [monster.uid]), true);
    assert.ok(game.playerMonsters.some(card => card?.id === 97590747));
    assert.equal(game.playerMonsters.find(card => card?.id === 97590747).summonType, 'pendulum');
    assert.equal(game.getAvailableActions().canPendulumSummon, false);
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('native generated tokens use native stats and a bundled presentation image', async () => {
  const { game, C, add } = await fixture({ onDecision: request => {
    if (request.multiple) return request.candidates.slice(0, request.minimum).map(card => card.uid);
    if (request.choices?.some(choice => choice.value === null)) return null;
    return request.choices?.[0]?.value;
  } });
  try {
    add(73915051, 'player', C.OcgLocation.HAND); // Scapegoat
    assert.equal(await game.start(), true);
    const spell = game.playerHand[0];
    assert.equal(await game.playSpellTrap(spell.uid, 2), true);
    const tokens = game.playerMonsters.filter(Boolean);
    assert.equal(tokens.length, 4);
    assert.ok(tokens.every(card => card.isToken && card.getAtk() === 0 && card.getLevel() === 1));
    assert.ok(tokens.every(card => card.image_url === '/cards/native-unknown.png'));
    assert.ok(tokens.every(card => card.image_url_cropped === '/cards/native-unknown.png'));
    assert.ok(tokens.every(card => card.summonType === 'special'));
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('Metaverse activating a Field from the Deck projects a resolved field without inventing a chain', async () => {
  const { game, C, add } = await fixture({ onDecision: request => {
    if (request.nativeKind === 'SELECT_OPTION') return 1;
    if (request.multiple) return request.candidates.slice(0, request.minimum).map(card => card.uid);
    if (request.choices?.some(choice => choice.value === null)) return null;
    return request.choices?.[0]?.value;
  } });
  try {
    add(89208725, 'player', C.OcgLocation.SZONE, 0, C.OcgPosition.FACEDOWN_DEFENSE);
    add(4064256, 'player', C.OcgLocation.DECK);
    add(89631139, 'opponent', C.OcgLocation.MZONE);
    assert.equal(await game.start(), true);
    assert.equal(await game.activateSetSpellTrap(0), true);
    assert.equal(game.playerFieldSpell?.id, 4064256);
    assert.equal(hasResolvedFieldSpellActivation(game.playerFieldSpell), true);
    assert.equal(game.opponentMonsters[0].currentRace, 'Zombie');
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});

test('initial Main Deck shuffle preserves the registered order and rejects biased Uint32 samples', () => {
  const cards = Object.freeze([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  const samples = [0xffffffff, 4, 0xffffffff];
  let consumed = 0;
  const shuffled = shuffleNativeMainDeck(cards, () => samples[consumed++]);
  assert.deepEqual(shuffled.map(card => card.id), ['a', 'c', 'b']);
  assert.deepEqual(cards.map(card => card.id), ['a', 'b', 'c']);
  assert.equal(consumed, 3, 'range 3 rejects 2^32 - 1, range 2 accepts it');
  assert.notEqual(shuffled, cards);
  assert.deepEqual(new Set(shuffled), new Set(cards));
  assert.throws(() => shuffleNativeMainDeck(cards, () => -1), /Uint32/);
  assert.throws(() => shuffleNativeMainDeck(cards, () => 0x100000000), /Uint32/);
});

test('initial native injection uses independently shuffled copies for both Main Decks', async () => {
  const resources = await resourcesPromise;
  const cards = [...resources.cards.values()]
    .filter(card => card.type === 17 && resources.metadata.has(card.code)).slice(0, 20)
    .map(card => Object.freeze({ id: card.code, name: resources.metadata.get(card.code).name,
      card_type: 'monster', type: 'Normal Monster' }));
  const registered = Object.freeze([...cards]);
  const originalCodes = registered.map(card => Number(card.id));
  const shuffleOrders = [];
  const openingHands = [];
  for (const initialState of [1, 2]) {
    let state = initialState;
    const game = new NativeDuelGame({}, {
      rulesMode: 'native', nativeResources: resources, seed,
      teams: [{ ...zeroDrawTeam, startingDrawCount: 5 }, { ...zeroDrawTeam, startingDrawCount: 5 }],
      initialShuffleRandomUint32: () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state;
      },
      validateDeck: () => ({ valid: true, issues: [] })
    });
    try {
      assert.equal(await game.initDecks(registered, registered, [], []), true);
      const playerOrder = game.playerDeck.map(card => card.nativeCode);
      const opponentOrder = game.opponentDeck.map(card => card.nativeCode);
      assert.deepEqual([...playerOrder].sort((a, b) => a - b), [...originalCodes].sort((a, b) => a - b));
      assert.deepEqual([...opponentOrder].sort((a, b) => a - b), [...originalCodes].sort((a, b) => a - b));
      assert.notDeepEqual(playerOrder, originalCodes);
      assert.notDeepEqual(playerOrder, opponentOrder);
      shuffleOrders.push(playerOrder);
      assert.deepEqual(registered.map(card => Number(card.id)), originalCodes);
      assert.equal(game.runtime.options.flags & game.runtime.constants.OcgDuelMode.PSEUDO_SHUFFLE, 0n);
      assert.equal(await game.start(), true);
      assert.equal(game.playerHand.length, 5);
      assert.equal(game.opponentHand.length, 5);
      openingHands.push(game.playerHand.map(card => card.nativeCode));
    } finally { game.dispose(); }
  }
  assert.notDeepEqual(shuffleOrders[0], shuffleOrders[1]);
  assert.notDeepEqual(openingHands[0], openingHands[1], 'the same core seed no longer produces a fixed ordered opening hand');
});

test('native compound races retain official labels and select the matching public model family', async () => {
  const { game, C, add } = await fixture();
  try {
    add(5053103, 'player', C.OcgLocation.MZONE, 0); // Battle Ox
    add(76812113, 'player', C.OcgLocation.MZONE, 1); // Harpie Lady
    add(76634149, 'player', C.OcgLocation.MZONE, 2); // Kairyu-Shin
    assert.equal(await game.start(), true);
    const [ox, harpie, serpent] = game.playerMonsters;
    assert.equal(ox.currentRace, 'Beast-Warrior');
    assert.equal(harpie.currentRace, 'Winged Beast');
    assert.equal(serpent.currentRace, 'Sea Serpent');
    assert.equal(resolveHologramMonsterProfile(ox).family, 'warrior');
    assert.equal(resolveHologramMonsterProfile(harpie).family, 'avian');
    assert.equal(resolveHologramMonsterProfile(serpent).family, 'aquatic');
    for (const card of [ox, harpie, serpent]) {
      const query = game.runtime.queryCard({ ...card.nativeRef,
        flags: C.OcgQueryFlags.RACE | C.OcgQueryFlags.ATTACK | C.OcgQueryFlags.DEFENSE });
      assert.equal(card.nativeQuery.race, query.race);
      assert.equal(card.getAtk(), query.attack);
      assert.equal(card.getDef(), query.defense);
    }
    assert.deepEqual(game.runtime.errors, []);
  } finally { game.dispose(); }
});
