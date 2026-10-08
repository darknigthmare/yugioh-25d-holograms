import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NativeDuelGame, NATIVE_TCG_DUEL_FLAGS } from '../src/core/native/NativeDuelGame.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { chooseNativeAIResponse, nativeSelectablePlaces, validateNativeDuelResponse } from '../src/core/native/NativeDuelDecisions.js';

const resourcesPromise = loadNativeCardResources({ fetch: async path => (
  new Response(await readFile(new URL(`../public${path}`, import.meta.url)))
) });
const evidence = [];
const allUsedCodes = new Set();
const team = startingLP => ({ startingLP, startingDrawCount: 0, drawCountPerTurn: 0 });

// Initial zones are declared using the normal native NewCard API BEFORE Start.
// The official core/Lua calculate every attack, response window, replay and LP.
async function fixture({ decide, playerLP = 8000, opponentLP = 8000 } = {}) {
  const resources = await resourcesPromise;
  const messages = [], decisions = [], events = [], snapshots = [], gameOvers = [];
  let game;
  game = new NativeDuelGame({
    onAnimation: event => events.push(event),
    onStateChange: () => snapshots.push(publicSnapshot(game)),
    onGameOver: result => gameOvers.push(result),
    onDecision: request => {
      const prompt = game.pendingNativeDecision, C = game.runtime.constants;
      const options = { constants: C, metadata: resources.metadata, cardReader: game.runtime.options.cardReader,
        isCardDeclarable: game.runtime.isCardDeclarable.bind(game.runtime) };
      const suggested = chooseNativeAIResponse(prompt, options);
      assert.ok(suggested, `Unsupported current prompt ${request.nativeKind}`);
      const response = decide?.({ prompt, request, response: suggested, C, game }) ?? suggested;
      assert.equal(validateNativeDuelResponse(prompt, response, options), true, request.nativeKind);
      decisions.push({ prompt, request, response, afterMessage: messages.length });
      if ('indicies' in response) return response.indicies?.map(String) ?? null;
      if ('places' in response) {
        const places = nativeSelectablePlaces(prompt);
        return response.places.map(place => String(places.findIndex(candidate => (
          candidate.player === place.player && candidate.location === place.location && candidate.sequence === place.sequence
        ))));
      }
      if ('yes' in response) return response.yes;
      if ('position' in response) return response.position;
      if ('index' in response) return response.index;
      if ('value' in response) return response.value;
      return request.choices?.[0]?.value;
    }
  }, {
    rulesMode: 'native', nativeResources: resources, seed: [1n, 2n, 3n, 4n], aiDelay: 0,
    teams: [team(opponentLP), team(playerLP)],
    validateDeck: () => ({ valid: true, issues: [] }),
    runtimeOptions: { onMessages: batch => messages.push(...batch) }
  });
  const base = { id: 46986414, name: 'Dark Magician', card_type: 'monster', type: 'Normal Monster' };
  // The AI's first turn has no Battle Phase; the human's second turn can attack.
  assert.equal(await game.initDecks([base], [base], [], [], { startingPlayer: 'opponent' }), true);
  const C = game.runtime.constants;
  const add = (code, location, sequence = 0, { side = 'player', position } = {}) => {
    allUsedCodes.add(code);
    game.runtime.addCard({ code, controller: game.controllerForSide(side), location, sequence,
      position: position ?? (location === C.OcgLocation.EXTRA ? C.OcgPosition.FACEDOWN_DEFENSE : C.OcgPosition.FACEUP_ATTACK) });
  };
  const startBattle = async () => {
    assert.equal(await game.start(), true);
    assert.equal(game.currentTurn, 'player');
    assert.equal(await game.changePhase('battle'), true);
  };
  const attack = async (attacker = 0, defender = null) => {
    assert.equal(await game.executeAttack(attacker, defender), true);
  };
  const finish = name => {
    assert.equal(game.nativeError, null);
    assert.deepEqual(game.runtime.errors, []);
    assert.equal(messages.some(message => message.type === C.OcgMessageType.RETRY), false);
    assert.equal(game.runtime.options.flags, NATIVE_TCG_DUEL_FLAGS);
    assert.equal(game.runtime.options.flags & (C.OcgDuelMode.TEST_MODE | C.OcgDuelMode.PSEUDO_SHUFFLE), 0n);
    const counts = {};
    for (const message of messages) counts[message.type] = (counts[message.type] || 0) + 1;
    evidence.push({ name, result: 'pass', final: publicSnapshot(game),
      protocolCounts: counts, decisions: decisions.map(({ request }) => request.nativeKind),
      battleStats: events.filter(event => event.type === 'battle-stats').map(event => ({
        target: event.target, zoneType: event.zoneType, zoneIndex: event.zoneIndex,
        participant: event.participant, nativeStats: event.nativeStats, destroyed: event.destroyed
      })),
      animations: events.map(event => ({ type: event.type, target: event.target,
        ...(event.damage != null ? { amount: event.damage, cost: Boolean(event.cost) } : {}),
        ...(event.publicReveal ? { publicReveal: true } : {}),
        ...(event.nativeSummonConfirmed ? { nativeSummonConfirmed: true } : {}),
        ...(event.card && !event.hidden && !event.faceDown ? { publicCode: Number(event.card.id) } : {})
      })) });
  };
  return { game, C, add, messages, decisions, events, snapshots, gameOvers, startBattle, attack, finish };
}

function publicSnapshot(game) {
  if (!game) return null;
  const zones = side => game.getMonsterEntries(side).map(({ card, zoneType, zoneIndex }) => ({
    zoneType, zoneIndex, faceDown: card.isSetFaceDown,
    ...(card.isSetFaceDown ? {} : { publicCode: Number(card.id), attack: card.getAtk(), defense: card.getDef() })
  }));
  return { playerLP: game.playerLP, opponentLP: game.opponentLP, turn: game.currentTurn, phase: game.currentPhase,
    player: zones('player'), opponent: zones('opponent'),
    handCounts: [game.playerHand.length, game.opponentHand.length],
    graveyards: [game.playerGraveyard.map(card => Number(card.id)), game.opponentGraveyard.map(card => Number(card.id))],
    winner: game.winner, endReason: game.endReason, nativeWinReason: game.nativeWinReason };
}
function chooseChain(code, { prompt, response, C }) {
  if (prompt.type !== C.OcgMessageType.SELECT_CHAIN) return response;
  const index = prompt.selects.findIndex(card => card.code === code);
  return index < 0 ? response : { ...response, index };
}
function count(messages, C, name) { return messages.filter(message => message.type === C.OcgMessageType[name]).length; }
function nativeDamage(messages, C) { return messages.filter(message => message.type === C.OcgMessageType.DAMAGE).map(message => message.amount); }
function onAttack(code, info, f) {
  return f.messages.some(message => message.type === info.C.OcgMessageType.ATTACK)
    ? chooseChain(code, info) : info.response;
}
async function enemyBattle(f) {
  assert.equal(await f.game.start(), true);
  assert.equal(f.game.currentTurn, 'player');
  assert.equal(await f.game.changePhase('end'), true);
  assert.equal(f.game.currentTurn, 'player');
}

after(async () => {
  const resources = await resourcesPromise;
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const files = ['public/native/ocgcore.sync.wasm', 'public/native/card-data.json', 'public/native/scripts.json',
    'src/core/native/vendor/ocgcore/index.js', 'src/core/native/NativeDuelGame.js'];
  const sourceHashes = Object.fromEntries(await Promise.all(files.map(async path => [path, hash(await readFile(new URL(`../${path}`, import.meta.url)))])));
  const scripts = [...allUsedCodes].sort((a, b) => a - b).map(code => {
    const sourceCode = resources.cards.get(code)?.code ?? code;
    const source = resources.scripts.get(`c${sourceCode}.lua`);
    return { code, sourceCode, name: resources.metadata.get(code)?.name, script: `c${sourceCode}.lua`,
      sha256: source == null ? null : hash(source) };
  });
  const directory = new URL('../docs/audits/artifacts/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('native-battle-timing-2026-10-08.json', directory),
    JSON.stringify({ date: '2026-10-08', engine: 'official ocgcore ABI 11.0 / EDOPro 38d04c9f', flags: String(NATIVE_TCG_DUEL_FLAGS),
      declaredFixturesOnly: true, debugApi: false, testMode: false, pseudoShuffle: false, postStartInjection: false,
      sourceHashes, scripts, cases: evidence }, null, 2) + '\n');
});

test('a native direct attack uses the offered direct target and consumes exactly one attack', async () => {
  const f = await fixture(), { game, C, add, messages, events } = f;
  try {
    add(89631139, C.OcgLocation.MZONE, 0);
    await f.startBattle();
    await f.attack();
    assert.equal(game.opponentLP, 5000);
    assert.deepEqual(nativeDamage(messages, C), [3000]);
    assert.ok(events.some(event => event.type === 'attack-direct'));
    assert.equal(game.getAvailableActions().attackCardUids.includes(game.playerMonsters[0].uid), false);
    assert.equal(await game.executeAttack(0), false);
    f.finish('direct attack / one attack limit');
  } finally { game.dispose(); }
});

test('ATK against ATK destroys only the weaker monster and applies native difference damage', async () => {
  const f = await fixture(), { game, C, add, messages } = f;
  try {
    add(89631139, C.OcgLocation.MZONE, 0);
    add(97590747, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    await f.startBattle(); await f.attack(0, 0);
    assert.equal(game.opponentLP, 6800);
    assert.equal(game.playerLP, 8000);
    assert.deepEqual(nativeDamage(messages, C), [1200]);
    assert.equal(game.opponentMonsters[0], null);
    assert.ok(game.opponentGraveyard.some(card => card.id === 97590747));
    assert.equal(game.playerMonsters[0].getAtk(), 3000);
    f.finish('attack versus attack difference');
  } finally { game.dispose(); }
});

test('attacking stronger DEF deals damage to the attacker and destroys neither monster', async () => {
  const f = await fixture(), { game, C, add, messages, events } = f;
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(46986414, C.OcgLocation.MZONE, 0, { side: 'opponent', position: C.OcgPosition.FACEUP_DEFENSE });
    await f.startBattle(); await f.attack(0, 0);
    assert.equal(game.playerLP, 7700);
    assert.equal(game.opponentLP, 8000);
    assert.deepEqual(nativeDamage(messages, C), [300]);
    assert.ok(game.playerMonsters[0] && game.opponentMonsters[0]);
    assert.equal(events.filter(event => event.type === 'destroy').length, 0);
    f.finish('stronger defense / attacker damage');
  } finally { game.dispose(); }
});

test('equal ATK destroys both monsters simultaneously without inventing battle damage', async () => {
  const f = await fixture(), { game, C, add, messages, events } = f;
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(97590747, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    await f.startBattle(); await f.attack(0, 0);
    assert.deepEqual([game.playerLP, game.opponentLP], [8000, 8000]);
    assert.equal(game.playerMonsters[0], null);
    assert.equal(game.opponentMonsters[0], null);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.equal(events.filter(event => event.type === 'destroy').length, 2);
    f.finish('equal attack / simultaneous destruction');
  } finally { game.dispose(); }
});

test('a Set defender remains anonymous until the native Damage Step reveals it, with no ordinary piercing', async () => {
  const f = await fixture(), { game, C, add, messages, events } = f;
  try {
    add(89631139, C.OcgLocation.MZONE, 0);
    add(15025844, C.OcgLocation.MZONE, 0, { side: 'opponent', position: C.OcgPosition.FACEDOWN_DEFENSE });
    await f.startBattle(); await f.attack(0, 0);
    assert.deepEqual([game.playerLP, game.opponentLP], [8000, 8000]);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    const attack = events.find(event => event.type === 'attack-monster');
    assert.equal(attack.targetCard, null);
    assert.equal(attack.targetFaceDown, true);
    assert.ok(game.opponentGraveyard.some(card => card.id === 15025844));
    assert.ok(count(messages, C, 'POS_CHANGE') > 0);
    assert.equal(count(messages, C, 'FLIPSUMMONED'), 0);
    assert.equal(events.some(event => event.type === 'flip-summon' || event.nativeSummonConfirmed), false);
    assert.ok(events.some(event => event.type === 'toggle-position' && event.publicReveal));
    f.finish('set defender / native reveal / no piercing');
  } finally { game.dispose(); }
});

test('Spear Dragon applies official piercing and changes itself to Defense after damage calculation', async () => {
  const f = await fixture(), { game, C, add, messages } = f;
  try {
    add(31553716, C.OcgLocation.MZONE, 0);
    add(97590747, C.OcgLocation.MZONE, 0, { side: 'opponent', position: C.OcgPosition.FACEUP_DEFENSE });
    await f.startBattle(); await f.attack(0, 0);
    assert.equal(game.opponentLP, 7100);
    assert.deepEqual(nativeDamage(messages, C), [900]);
    assert.equal(game.playerMonsters[0].position, 'defense');
    assert.equal(game.playerMonsters[0].getAtk(), 1900);
    assert.equal(game.playerMonsters[0].getDef(), 0);
    f.finish('Spear Dragon / piercing / forced defense');
  } finally { game.dispose(); }
});

test('Chaos MAX deals double piercing from the native battle calculation', async () => {
  const f = await fixture(), { game, C, add, messages, events } = f;
  try {
    add(55410871, C.OcgLocation.MZONE, 0);
    add(97590747, C.OcgLocation.MZONE, 0, { side: 'opponent', position: C.OcgPosition.FACEUP_DEFENSE });
    await f.startBattle(); await f.attack(0, 0);
    assert.equal(game.opponentLP, 2000);
    assert.deepEqual(nativeDamage(messages, C), [6000]);
    const stats = events.find(event => event.type === 'battle-stats' && event.participant === 'attacker');
    assert.equal(stats.nativeStats.attack, 4000);
    f.finish('Chaos MAX / double piercing');
  } finally { game.dispose(); }
});

test('Amazoness Swords Woman redirects its controller’s battle damage through its official effect', async () => {
  const f = await fixture(), { game, C, add, messages } = f;
  try {
    add(94004268, C.OcgLocation.MZONE, 0);
    add(89631139, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    await f.startBattle(); await f.attack(0, 0);
    assert.deepEqual([game.playerLP, game.opponentLP], [8000, 6500]);
    assert.deepEqual(nativeDamage(messages, C), [1500]);
    assert.equal(game.playerMonsters[0], null);
    assert.ok(game.opponentMonsters[0]);
    f.finish('Amazoness / damage redirection');
  } finally { game.dispose(); }
});

test('Waboku preserves its attacked monster and LP without negating the declared attack', async () => {
  let f;
  f = await fixture({ decide: info => onAttack(12607053, info, f) });
  const { game, C, add, messages, events } = f;
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(89631139, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(12607053, C.OcgLocation.SZONE, 0, { position: C.OcgPosition.FACEDOWN_DEFENSE });
    await enemyBattle(f);
    assert.deepEqual([game.playerLP, game.opponentLP], [8000, 8000]);
    assert.equal(game.playerMonsters[0].id, 97590747);
    assert.ok(game.playerGraveyard.some(card => card.id === 12607053));
    assert.equal(count(messages, C, 'ATTACK'), 1);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.equal(count(messages, C, 'ATTACK_DISABLED'), 0);
    assert.equal(events.some(event => event.type === 'attack-negated'), false);
    assert.ok(events.some(event => event.type === 'battle-stats'));
    f.finish('Waboku / damage and destruction prevention');
  } finally { game.dispose(); }
});

test('Negate Attack emits a native attack negation and ends the Battle Phase before damage', async () => {
  const f = await fixture({ decide: info => chooseChain(14315573, info) }), { game, C, add, messages, events } = f;
  try {
    add(89631139, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(14315573, C.OcgLocation.SZONE, 0, { position: C.OcgPosition.FACEDOWN_DEFENSE });
    await enemyBattle(f);
    assert.deepEqual([game.playerLP, game.opponentLP], [8000, 8000]);
    assert.equal(count(messages, C, 'ATTACK'), 1);
    assert.equal(count(messages, C, 'ATTACK_DISABLED'), 1);
    assert.equal(count(messages, C, 'DAMAGE_STEP_START'), 0);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.ok(events.some(event => event.type === 'attack-negated' && event.nativeAttackNegated));
    f.finish('Negate Attack / native attack negation');
  } finally { game.dispose(); }
});

test('Scapegoat creates an official attack replay from a direct attack to a newly summoned Token', async () => {
  let f;
  f = await fixture({ decide: info => onAttack(73915051, info, f) });
  const { game, C, add, messages, events } = f;
  try {
    add(89631139, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(73915051, C.OcgLocation.SZONE, 0, { position: C.OcgPosition.FACEDOWN_DEFENSE });
    await enemyBattle(f);
    const attacks = messages.filter(message => message.type === C.OcgMessageType.ATTACK);
    assert.equal(attacks.length, 2);
    assert.equal(attacks[0].target, null);
    assert.ok(attacks[1].target);
    assert.equal(game.getMonsterEntries('player').length, 3);
    assert.ok(game.getMonsterEntries('player').every(({ card }) => card.isToken));
    assert.equal(game.playerLP, 8000);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.ok(events.some(event => event.type === 'attack-direct'));
    assert.ok(events.some(event => event.type === 'attack-monster' && event.targetCard?.isToken));
    f.finish('Scapegoat / direct attack replay to new token');
  } finally { game.dispose(); }
});

test('Compulsory Evacuation Device removes the target and the core replays the attack directly', async () => {
  let f;
  f = await fixture({ decide: info => {
    if (info.prompt.type === info.C.OcgMessageType.SELECT_CARD) {
      const index = info.prompt.selects.findIndex(card => card.code === 97590747);
      if (index >= 0) return { ...info.response, indicies: [index] };
    }
    return onAttack(94192409, info, f);
  } });
  const { game, C, add, messages, events } = f;
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(89631139, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(94192409, C.OcgLocation.SZONE, 0, { position: C.OcgPosition.FACEDOWN_DEFENSE });
    await enemyBattle(f);
    const attacks = messages.filter(message => message.type === C.OcgMessageType.ATTACK);
    assert.equal(attacks.length, 2);
    assert.ok(attacks[0].target);
    assert.equal(attacks[1].target, null);
    assert.ok(game.playerHand.some(card => card.id === 97590747));
    assert.equal(game.playerLP, 5000);
    assert.deepEqual(nativeDamage(messages, C), [3000]);
    assert.ok(events.some(event => event.type === 'move' && event.to?.zoneType === 'hand' && event.card === null));
    f.finish('Compulsory / target departure / direct replay');
  } finally { game.dispose(); }
});

test('Book of Moon changes the targeted monster’s position without creating an attack replay or a Flip Summon', async () => {
  let f;
  f = await fixture({ decide: info => {
    if (info.prompt.type === info.C.OcgMessageType.SELECT_CARD) {
      const index = info.prompt.selects.findIndex(card => card.code === 97590747);
      if (index >= 0) return { ...info.response, indicies: [index] };
    }
    return onAttack(14087893, info, f);
  } });
  const { game, C, add, messages, events } = f;
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(89631139, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(14087893, C.OcgLocation.SZONE, 0, { position: C.OcgPosition.FACEDOWN_DEFENSE });
    await enemyBattle(f);
    assert.equal(game.playerLP, 8000);
    assert.equal(count(messages, C, 'ATTACK'), 1);
    assert.equal(messages.filter(message => message.type === C.OcgMessageType.POS_CHANGE && message.code === 97590747).length, 2);
    assert.equal(count(messages, C, 'FLIPSUMMONED'), 0);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.ok(game.playerGraveyard.some(card => card.id === 97590747));
    assert.equal(events.some(event => event.type === 'flip-summon'), false);
    assert.ok(events.some(event => event.type === 'toggle-position' && event.publicReveal));
    f.finish('Book of Moon / position change / no replay');
  } finally { game.dispose(); }
});

test('Honest chains in the native Damage Step and exposes the exact calculation-local ATK', async () => {
  const f = await fixture({ decide: info => chooseChain(37742478, info) }), { game, C, add, messages, events, decisions } = f;
  try {
    add(89631139, C.OcgLocation.MZONE, 0);
    add(23995346, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(37742478, C.OcgLocation.HAND);
    await f.startBattle(); await f.attack(0, 0);
    assert.equal(game.playerLP, 8000);
    assert.equal(game.opponentLP, 5000);
    assert.deepEqual(nativeDamage(messages, C), [3000]);
    const damageStart = messages.findIndex(message => message.type === C.OcgMessageType.DAMAGE_STEP_START);
    const chainDecision = decisions.find(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_CHAIN
      && prompt.selects.some(card => card.code === 37742478));
    assert.ok(chainDecision.afterMessage > damageStart);
    const calculation = events.find(event => event.type === 'battle-stats' && event.participant === 'attacker');
    assert.equal(calculation.nativeStats.attack, 7500);
    assert.equal(game.playerMonsters[0].getAtk(), 7500);
    assert.equal(await game.changePhase('end'), true);
    assert.equal(game.playerMonsters[0].getAtk(), 3000);
    assert.ok(game.playerGraveyard.some(card => card.id === 37742478));
    f.finish('Honest / Damage Step / exact temporary attack');
  } finally { game.dispose(); }
});

test('Kuriboh prevents a direct attack’s battle damage during damage calculation without negating the attack', async () => {
  const f = await fixture({ decide: info => chooseChain(40640057, info) }), { game, C, add, messages, events, decisions } = f;
  try {
    add(89631139, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(40640057, C.OcgLocation.HAND);
    await enemyBattle(f);
    assert.equal(game.playerLP, 8000);
    assert.ok(game.playerGraveyard.some(card => card.id === 40640057));
    assert.equal(count(messages, C, 'ATTACK'), 1);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.equal(count(messages, C, 'ATTACK_DISABLED'), 0);
    assert.equal(events.some(event => event.type === 'attack-negated'), false);
    const damageStart = messages.findIndex(message => message.type === C.OcgMessageType.DAMAGE_STEP_START);
    const chainDecision = decisions.find(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_CHAIN
      && prompt.selects.some(card => card.code === 40640057));
    assert.ok(chainDecision.afterMessage > damageStart);
    f.finish('Kuriboh / damage calculation / damage prevention');
  } finally { game.dispose(); }
});

test('an explicit attack target cannot silently choose a later Compulsory target; withdrawing the attacker aborts the battle', async () => {
  let f;
  f = await fixture({ decide: info => {
    if (info.prompt.type === info.C.OcgMessageType.SELECT_CARD) {
      const index = info.prompt.selects.findIndex(card => card.code === 89631139);
      if (index >= 0) return { ...info.response, indicies: [index] };
    }
    return onAttack(94192409, info, f);
  } });
  const { game, C, add, messages, events, decisions } = f;
  try {
    add(89631139, C.OcgLocation.MZONE, 0);
    add(97590747, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(94192409, C.OcgLocation.SZONE, 0, { position: C.OcgPosition.FACEDOWN_DEFENSE });
    await f.startBattle(); await f.attack(0, 0);
    assert.equal(game.playerMonsters[0], null);
    assert.equal(game.opponentMonsters[0].id, 97590747);
    assert.ok(game.playerHand.some(card => card.id === 89631139));
    assert.deepEqual([game.playerLP, game.opponentLP], [8000, 8000]);
    assert.equal(count(messages, C, 'ATTACK'), 1);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.equal(count(messages, C, 'ATTACK_DISABLED'), 0);
    assert.ok(decisions.some(({ prompt, response }) => prompt.type === C.OcgMessageType.SELECT_CARD
      && prompt.selects[response.indicies?.[0]]?.code === 89631139));
    assert.equal(events.some(event => event.type === 'attack-negated'), false);
    f.finish('attack intention scoped / attacker withdrawn');
  } finally { game.dispose(); }
});

test('Enemy Controller takes the attacking monster and cancels its battle; control returns at the official End Phase', async () => {
  let f;
  f = await fixture({ decide: info => {
    if (info.prompt.type === info.C.OcgMessageType.SELECT_OPTION) return { ...info.response, index: 1 };
    return onAttack(98045062, info, f);
  } });
  const { game, C, add, messages, snapshots, events } = f;
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(89631139, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(98045062, C.OcgLocation.SZONE, 0, { position: C.OcgPosition.FACEDOWN_DEFENSE });
    await enemyBattle(f);
    assert.deepEqual([game.playerLP, game.opponentLP], [8000, 8000]);
    assert.equal(count(messages, C, 'ATTACK'), 1);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.equal(count(messages, C, 'ATTACK_DISABLED'), 0);
    assert.ok(snapshots.some(snapshot => snapshot.player.some(card => card.publicCode === 89631139)));
    assert.equal(game.playerMonsters[0], null);
    assert.ok(game.opponentMonsters.some(card => card?.id === 89631139));
    assert.ok(game.playerGraveyard.some(card => card.id === 97590747));
    assert.equal(events.some(event => event.type === 'attack-negated'), false);
    f.finish('Enemy Controller / attacking monster control change');
  } finally { game.dispose(); }
});

test('Solemn Strike negates Utopia’s effect activation, not the attack, and preserves its paid material cost', async () => {
  let f;
  f = await fixture({ decide: info => onAttack(40605147, info, f) });
  const { game, C, add, messages, events } = f;
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(76812113, C.OcgLocation.MZONE, 1);
    add(84013237, C.OcgLocation.EXTRA);
    add(89631139, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(40605147, C.OcgLocation.SZONE, 0, { position: C.OcgPosition.FACEDOWN_DEFENSE });
    assert.equal(await game.start(), true);
    assert.equal(await game.summonExtraDeck(game.playerExtraDeck.find(card => card.id === 84013237).uid), true);
    assert.equal(await game.changePhase('battle'), true);
    const utopia = game.getMonsterEntries('player').find(({ card }) => card.id === 84013237);
    await f.attack({ zoneType: utopia.zoneType, zoneIndex: utopia.zoneIndex }, 0);
    assert.deepEqual([game.playerLP, game.opponentLP], [6500, 8000]);
    assert.equal(game.getMonsterEntries('player').length, 0);
    assert.ok(game.playerGraveyard.some(card => card.id === 84013237));
    assert.ok(game.playerGraveyard.some(card => card.id === 97590747));
    assert.ok(game.playerGraveyard.some(card => card.id === 76812113));
    assert.equal(count(messages, C, 'CHAIN_NEGATED'), 1);
    assert.equal(count(messages, C, 'ATTACK_DISABLED'), 0);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.equal(events.some(event => event.type === 'attack-negated'), false);
    assert.ok(events.some(event => event.type === 'lp-loss' && event.cost && event.damage === 1500));
    f.finish('Solemn Strike / effect negation / paid Xyz material');
  } finally { game.dispose(); }
});

test('Cyber Twin Dragon receives exactly two core-offered attacks and never a third', async () => {
  const f = await fixture(), { game, C, add, messages, events } = f;
  try {
    add(74157028, C.OcgLocation.MZONE, 0);
    await f.startBattle();
    await f.attack();
    assert.equal(game.opponentLP, 5200);
    assert.ok(game.getAvailableActions().attackCardUids.includes(game.playerMonsters[0].uid));
    await f.attack();
    assert.equal(game.opponentLP, 2400);
    assert.equal(game.getAvailableActions().attackCardUids.includes(game.playerMonsters[0].uid), false);
    assert.equal(await game.executeAttack(0), false);
    assert.deepEqual(nativeDamage(messages, C), [2800, 2800]);
    assert.equal(events.filter(event => event.type === 'attack-direct').length, 2);
    f.finish('Cyber Twin / two native attacks / no third');
  } finally { game.dispose(); }
});

test('Airknight Parshath’s damage trigger draws through the core and animations never disclose the drawn card', async () => {
  const f = await fixture(), { game, C, add, messages, events } = f;
  try {
    add(18036057, C.OcgLocation.MZONE, 0);
    add(97590747, C.OcgLocation.MZONE, 0, { side: 'opponent', position: C.OcgPosition.FACEUP_DEFENSE });
    await f.startBattle(); await f.attack(0, 0);
    assert.equal(game.opponentLP, 7100);
    assert.deepEqual(nativeDamage(messages, C), [900]);
    assert.equal(game.playerHand.length, 1);
    assert.equal(game.playerDeck.length, 0);
    assert.equal(count(messages, C, 'DRAW'), 1);
    const drawEvents = events.filter(event => event.type === 'draw');
    assert.equal(drawEvents.length, 1);
    assert.equal(drawEvents[0].card, null);
    assert.equal(drawEvents[0].cards, undefined);
    assert.equal(drawEvents[0].uid, undefined);
    f.finish('Airknight / battle damage draw / private draw');
  } finally { game.dispose(); }
});

test('Self-Destruct Button simultaneously sets both native LP to zero and produces one authoritative draw notification', async () => {
  const f = await fixture({ playerLP: 1000 }), { game, C, add, messages, gameOvers } = f;
  try {
    add(57585212, C.OcgLocation.SZONE, 0, { position: C.OcgPosition.FACEDOWN_DEFENSE });
    assert.equal(await game.start(), true);
    assert.equal(await game.activateSetSpellTrap(0), true);
    assert.deepEqual([game.playerLP, game.opponentLP], [0, 0]);
    assert.equal(game.winner, 'draw');
    assert.equal(count(messages, C, 'WIN'), 2);
    assert.equal(count(messages, C, 'DAMAGE'), 0);
    assert.equal(gameOvers.length, 1);
    assert.equal(messages.filter(message => message.type === C.OcgMessageType.WIN).at(-1).player, 2);
    assert.equal(game.pendingNativeDecision, null);
    assert.equal(game.getAvailableActions().canEndPhase, false);
    assert.equal(await game.changePhase('end'), false);
    f.finish('Self-Destruct Button / simultaneous native draw');
  } finally { game.dispose(); }
});
