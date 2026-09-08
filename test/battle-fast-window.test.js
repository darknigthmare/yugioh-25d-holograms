import test from 'node:test';
import assert from 'node:assert/strict';
import { DuelGame } from '../src/game.js';
import { CardState } from '../src/core/CardState.js';

function card(uid, owner, overrides = {}) {
  const result = new CardState({
    uid, id: uid, name: uid, card_type: 'monster', type: 'Normal Monster',
    atk: 2000, def: 1000, level: 4, desc: '', ...overrides
  });
  result.ownerId = owner;
  result.controllerId = owner;
  return result;
}

function battle(callbacks = {}, mode = 'strict') {
  const game = new DuelGame(callbacks, { rulesMode: mode });
  game.phases.currentPhase = 'battle';
  game.phases.currentTurnOwner = 'player';
  game.phases.turnCount = 2;
  game.delay = async () => true;
  game.startPhaseFlow = () => {};
  game.field.setMonsterZone('player', 0, card('attacker', 'player'));
  return game;
}

function setQuickPlay(game, uid, side, zoneIndex = 0, turnSet = 1) {
  const quick = card(uid, side, { card_type: 'spell', type: 'Spell Card', race: 'Quick-Play' });
  quick.isSetFaceDown = true;
  game.field.setSpellZone(side, zoneIndex, quick);
  quick.turnSet = turnSet;
  return quick;
}

test('a vanilla attack gives turn player then opponent an empty-chain Fast Effect window', async () => {
  const opportunities = [];
  let game;
  game = battle({
    onChainOpportunity: request => {
      opportunities.push({ side: request.side, link: request.lastLink, step: game.phases.battleStep });
      return null;
    }
  });
  let resolutions = 0;
  const resolve = game.resolveChainStack.bind(game);
  game.resolveChainStack = async () => { resolutions += 1; return resolve(); };
  const result = await game.executeAttack(0);
  assert.deepEqual(opportunities, [
    { side: 'player', link: null, step: 'battle_step' },
    { side: 'opponent', link: null, step: 'battle_step' }
  ]);
  assert.equal(resolutions, 0);
  assert.equal(result.activated, false);
  assert.equal(game.opponentLP, 6000);
  assert.equal(game.chain.chainStatus, 'idle');
  assert.equal(game.chain.chainStack.length, 0);
});

test('an ordinary response request still requires a preexisting Chain unless explicitly enabled', async () => {
  let prompts = 0;
  const game = battle({ onChainOpportunity: () => { prompts += 1; return null; } });
  assert.equal(await game.openChainResponseWindow('player', { event: 'card-activation' }), false);
  assert.equal(prompts, 0);
  assert.equal(game.chain.chainStatus, 'idle');
});

for (const side of ['player', 'opponent']) {
  test(`the ${side} can start CL1 with a previously Set Sandbox Quick-Play Spell after a vanilla attack`, async () => {
    const windows = [];
    const pops = [];
    const game = battle({
      onChainOpportunity: request => {
        windows.push({ side: request.side, lastLink: request.lastLink?.id ?? null });
        return request.side === side
          ? request.candidates.find(candidate => candidate.cardUid === 'fast-start')?.cardUid || null
          : null;
      },
      onAnimation: event => { if (event.type === 'chain-pop') pops.push(event.linkNumber); }
    }, 'sandbox');
    const quick = setQuickPlay(game, 'fast-start', side);
    const result = await game.executeAttack(0);
    assert.equal(windows[0].side, 'player');
    assert.equal(windows[0].lastLink, null);
    assert.deepEqual(pops, [1]);
    assert.equal(result.activated, true);
    assert.ok(game[`${side}Graveyard`].includes(quick));
    assert.equal(game.opponentLP, 6000);
    assert.equal(game.chain.chainStatus, 'idle');
  });
}

test('two Fast Effects started after an attack keep alternating priority and resolve LIFO', async () => {
  const pushes = [];
  const resolves = [];
  const game = battle({
    onChainOpportunity: request => request.candidates[0]?.cardUid || null,
    onAnimation: event => { if (event.type === 'chain-pop') pushes.push(event.card.uid); }
  }, 'sandbox');
  setQuickPlay(game, 'fast-player', 'player');
  setQuickPlay(game, 'fast-opponent', 'opponent');
  const resolve = game.executeSpellTrapResolution.bind(game);
  game.executeSpellTrapResolution = async (...args) => {
    resolves.push(args[0].uid);
    return resolve(...args);
  };
  await game.executeAttack(0);
  assert.deepEqual(pushes, ['fast-player', 'fast-opponent']);
  assert.deepEqual(resolves, ['fast-opponent', 'fast-player']);
  assert.equal(game.opponentLP, 6000);
});

test('Mirror Force already activated at declaration is not prompted or activated twice', async () => {
  let mirrorDecisions = 0;
  let mirrorLinks = 0;
  let duplicateCandidate = false;
  const game = battle({
    onDecision: request => {
      if (request.effect === 'mirror-force') { mirrorDecisions += 1; return true; }
    },
    onChainOpportunity: request => {
      if (request.candidates.some(candidate => candidate.cardUid === 'mirror')) duplicateCandidate = true;
      return null;
    },
    onAnimation: event => { if (event.type === 'chain-pop' && event.card.uid === 'mirror') mirrorLinks += 1; }
  });
  const mirror = card('mirror', 'opponent', { id: '44095762', card_type: 'trap', type: 'Trap Card' });
  mirror.isSetFaceDown = true;
  game.field.setSpellZone('opponent', 0, mirror);
  mirror.turnSet = 1;
  const result = await game.executeAttack(0);
  assert.equal(mirrorDecisions, 1);
  assert.equal(mirrorLinks, 1);
  assert.equal(duplicateCandidate, false);
  assert.equal(result.attackerStillValid, false);
  assert.equal(game.opponentLP, 8000);
});

test('Utopia already used at declaration pays one material and negates the attack once', async () => {
  let decisions = 0;
  let links = 0;
  const game = battle({
    onDecision: request => {
      if (request.effect === 'utopia-negate-attack') { decisions += 1; return true; }
    },
    onAnimation: event => { if (event.type === 'chain-pop' && event.card.uid === 'utopia') links += 1; }
  });
  const utopia = card('utopia', 'opponent', { id: '84013237', type: 'Xyz Effect Monster', extra_type: 'xyz', rank: 4 });
  game.summons.attachXyzMaterials(utopia, [card('material1', 'opponent'), card('material2', 'opponent')]);
  game.field.setMonsterZone('opponent', 0, utopia);
  const result = await game.executeAttack(0, 0);
  assert.equal(result.attackNegated, true);
  assert.equal(decisions, 1);
  assert.equal(links, 1);
  assert.equal(utopia.xyzMaterials.length, 1);
  assert.equal(game.opponentLP, 8000);
});

test('newly Set Quick-Play and Spell Speed 1 cards cannot use the attack response window', async () => {
  const offered = [];
  const game = battle({ onChainOpportunity: request => { offered.push(...request.candidates); return null; } }, 'sandbox');
  setQuickPlay(game, 'too-new', 'player', 0, 2);
  const normal = setQuickPlay(game, 'normal-spell', 'player', 1);
  normal.race = 'Normal';
  await game.executeAttack(0);
  assert.deepEqual(offered, []);
  assert.equal(game.playerSpells[0].isSetFaceDown, true);
  assert.equal(game.playerSpells[1].isSetFaceDown, true);
});

test('unknown Sandbox-only Quick-Play cards are still rejected by the strict candidate list', async () => {
  const offered = [];
  const game = battle({ onChainOpportunity: request => { offered.push(...request.candidates); return null; } });
  setQuickPlay(game, 'unsupported-strict', 'player');
  await game.executeAttack(0);
  assert.deepEqual(offered, []);
  assert.equal(game.playerSpells[0].isSetFaceDown, true);
});

test('the empty attack window is blocking and another attack cannot interleave', async () => {
  let game;
  const attempts = [];
  game = battle({
    onChainOpportunity: async () => {
      assert.equal(game.isResolvingAction, true);
      attempts.push(await game.executeAttack(1));
      return null;
    }
  });
  const second = card('second-attacker', 'player');
  game.field.setMonsterZone('player', 1, second);
  await game.executeAttack(0);
  assert.deepEqual(attempts, [undefined, undefined]);
  assert.equal(second.hasAttacked, false);
  assert.equal(game.opponentLP, 6000);
});

test('reset during an empty-chain attack opportunity preserves a new Duel Chain', async () => {
  let release;
  const game = battle({ onChainOpportunity: () => new Promise(resolve => { release = resolve; }) });
  const attack = game.executeAttack(0);
  for (let attempt = 0; attempt < 30 && !release; attempt += 1) await Promise.resolve();
  assert.equal(typeof release, 'function');
  game.reset();
  let resolutions = 0;
  game.chain.pushChainLink('player', card('fresh-effect', 'player'), [], {
    resolver: async () => { resolutions += 1; return true; }
  });
  release(null);
  assert.equal(await attack, false);
  assert.equal(resolutions, 0);
  assert.equal(game.chain.chainStack.length, 1);
  assert.equal(game.currentPhase, 'draw');
  assert.equal(game.playerLP, 8000);
  assert.equal(game.opponentLP, 8000);
});
