import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NativeDuelGame, NATIVE_TCG_DUEL_FLAGS } from '../src/core/native/NativeDuelGame.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { chooseNativeAIResponse, nativeSelectablePlaces, validateNativeDuelResponse } from '../src/core/native/NativeDuelDecisions.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';

const resourcesPromise = loadNativeCardResources({ fetch: async path => (
  new Response(await readFile(new URL(`../public${path}`, import.meta.url)))
) });
const evidence = [];
const allUsedCodes = new Set();
const team = startingLP => ({ startingLP, startingDrawCount: 0, drawCountPerTurn: 0 });

// Initial zones are declared using the normal native NewCard API BEFORE Start.
// The official core/Lua calculate every chain, target, cost, control change and dynamic stat.
async function fixture({ decide, playerLP = 8000, opponentLP = 8000 } = {}) {
  const resources = await resourcesPromise;
  const messages = [], decisions = [], events = [], snapshots = [], gameOvers = [], observations = [];
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
  // Initial optional windows are answered normally, then the human plays turn two.
  assert.equal(await game.initDecks([base], [base], [], [], { startingPlayer: 'opponent' }), true);
  const C = game.runtime.constants;
  const add = (code, location, sequence = 0, { side = 'player', position } = {}) => {
    allUsedCodes.add(code);
    game.runtime.addCard({ code, controller: game.controllerForSide(side), location, sequence,
      position: position ?? (location === C.OcgLocation.EXTRA ? C.OcgPosition.FACEDOWN_DEFENSE : C.OcgPosition.FACEUP_ATTACK) });
  };
  const start = async () => {
    assert.equal(await game.start(), true);
    assert.equal(game.currentTurn, 'player');
    assert.equal(game.currentPhase, 'main1');
  };
  const play = async (code, zone = 4) => {
    const card = game.playerHand.find(card => card.id === code);
    assert.ok(card, String(code));
    assert.equal(await game.playSpellTrap(card.uid, zone), true);
  };
  const activate = async zone => assert.equal(await game.activateSetSpellTrap(zone), true);
  const finish = name => {
    assert.equal(game.nativeError, null);
    assert.deepEqual(game.runtime.errors, []);
    assert.equal(messages.some(message => message.type === C.OcgMessageType.RETRY), false);
    assert.equal(game.runtime.options.flags, NATIVE_TCG_DUEL_FLAGS);
    assert.equal(game.runtime.options.flags & (C.OcgDuelMode.TEST_MODE | C.OcgDuelMode.PSEUDO_SHUFFLE), 0n);
    const counts = {};
    for (const message of messages) counts[message.type] = (counts[message.type] || 0) + 1;
    evidence.push({ name, result: 'pass', observations, final: publicSnapshot(game),
      protocolCounts: counts, decisions: decisions.map(({ request }) => request.nativeKind),
      chainMessages: messages.filter(message => [C.OcgMessageType.CHAINING, C.OcgMessageType.CHAIN_SOLVING,
        C.OcgMessageType.CHAIN_SOLVED, C.OcgMessageType.CHAIN_NEGATED, C.OcgMessageType.CHAIN_DISABLED].includes(message.type))
        .map(message => ({ type: message.type, link: message.chain_size, ...(message.code ? { publicCode: message.code } : {}) })),
      animations: events.map(event => ({ type: event.type, target: event.target,
        ...(event.damage != null ? { amount: event.damage, cost: Boolean(event.cost) } : {}),
        ...(event.publicReveal ? { publicReveal: true } : {}),
        ...(event.nativeSummonConfirmed ? { nativeSummonConfirmed: true } : {}),
        ...(event.card && !event.hidden && !event.faceDown ? { publicCode: Number(event.card.id) } : {})
      })) });
  };
  const observe = (label, facts = {}) => observations.push({ label, ...facts, state: publicSnapshot(game) });
  return { game, C, add, messages, decisions, events, snapshots, gameOvers, start, play, activate, observe, finish };
}

function publicSnapshot(game) {
  if (!game) return null;
  const zones = side => game.getMonsterEntries(side).map(({ card, zoneType, zoneIndex }) => ({
    zoneType, zoneIndex, faceDown: card.isSetFaceDown,
    ...(card.isSetFaceDown ? {} : { publicCode: Number(card.id), category: card.card_type, type: card.type, nativeType: card.nativeType, attack: card.getAtk(), defense: card.getDef(), level: card.getLevel(), race: card.currentRace, attribute: card.currentAttribute, effectNegated: card.effectNegated, owner: card.ownerId })
  }));
  return { playerLP: game.playerLP, opponentLP: game.opponentLP, turn: game.currentTurn, phase: game.currentPhase,
    player: zones('player'), opponent: zones('opponent'),
    spellZones: ['player','opponent'].map(side => game.getSideState(side).spells.map(card => !card ? null : card.isSetFaceDown ? { faceDown: true } : { publicCode: Number(card.id), nativeType: card.nativeType, equipCard: card.nativeQuery.equipCard })),
    banishedCounts: [game.playerBanished.length,game.opponentBanished.length],
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
function chainAfter(code, source, info, f) {
  return f.messages.some(message => message.type === info.C.OcgMessageType.CHAINING && message.code === source)
    ? chooseChain(code, info) : info.response;
}
function selectCodes(codes, info) {
  if (info.prompt.type !== info.C.OcgMessageType.SELECT_CARD) return info.response;
  const indicies = codes.map(code => info.prompt.selects.findIndex(card => card.code === code));
  return indicies.every(index => index >= 0) ? { ...info.response, indicies } : info.response;
}
function monster(game, code, side='player') { return game.getMonsterEntries(side).find(entry => entry.card.id === code)?.card; }
function countChainEvents(f, name) { return count(f.messages, f.C, name); }
function assertPublicMonsterSummon(f, code, { type, race, attribute }) {
  const event=f.events.find(e=>e.nativeSummonConfirmed&&Number(e.card?.id)===code);
  assert.ok(event);assert.equal(event.card.card_type,'monster');assert.equal(event.card.type,type);
  assert.equal(event.card.race,race);assert.equal(event.card.attribute.toUpperCase(),attribute);
  const visual=createPublicCombatVisual(event,f.game);
  assert.equal(visual.kind,'summon');assert.equal(visual.profile,'special-summon');
  assert.equal(visual.card.type,type);assert.equal(visual.card.race,race);assert.equal(visual.card.attribute.toUpperCase(),attribute);
  return { category:event.card.card_type,type:event.card.type,race:event.card.race,attribute:event.card.attribute,profile:visual.profile };
}

test('MST destroys Pot of Greed in its chain without negating the Normal Spell or its two draws', async () => {
  let f; f = await fixture({ decide: info => info.prompt.type === info.C.OcgMessageType.SELECT_CARD
    ? selectCodes([55144522], info) : chainAfter(5318639, 55144522, info, f) });
  const { game, C, add } = f;
  try {
    add(55144522, C.OcgLocation.HAND); add(5318639, C.OcgLocation.HAND);
    add(89631139, C.OcgLocation.DECK); add(97590747, C.OcgLocation.DECK);
    await f.start(); await f.play(55144522);
    assert.equal(game.playerHand.length, 2);
    assert.equal(countChainEvents(f, 'CHAIN_NEGATED'), 0); assert.equal(countChainEvents(f, 'CHAIN_DISABLED'), 0);
    assert.equal(f.messages.filter(m => m.type === C.OcgMessageType.DRAW).reduce((n,m) => n+m.drawn.length,0), 2);
    assert.deepEqual(game.playerGraveyard.map(card => card.id).sort((a,b) => a-b), [5318639,55144522]);
    assert.ok(f.events.filter(e => e.type === 'draw').every(e => e.card == null && !e.cards?.some(Boolean)));
    f.finish('MST / Normal Spell destruction is not negation');
  } finally { game.dispose(); }
});

test('MST removes Call of the Haunted before resolution and its Graveyard target remains unrevived', async () => {
  let f; f = await fixture({ decide: info => info.prompt.type === info.C.OcgMessageType.SELECT_CARD
    ? selectCodes([info.prompt.selects.some(c=>c.code===97077563) ? 97077563 : 89631139], info)
    : chainAfter(5318639, 97077563, info, f) });
  const { game, C, add } = f;
  try {
    add(89631139,C.OcgLocation.GRAVE); add(97077563,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});
    add(5318639,C.OcgLocation.HAND);
    await f.start(); await f.activate(0);
    assert.equal(game.getMonsterEntries('player').length,0); assert.ok(game.playerGraveyard.some(c=>c.id===89631139));
    assert.equal(countChainEvents(f,'SPSUMMONED'),0); assert.equal(countChainEvents(f,'CHAIN_NEGATED'),0);
    f.finish('MST / Continuous Trap destroyed before resolution');
  } finally { game.dispose(); }
});

test('MST removes Axe of Despair before resolution so the target receives no Equip Spell bonus', async () => {
  let f; f = await fixture({ decide: info => info.prompt.type === info.C.OcgMessageType.SELECT_CARD
    ? selectCodes([info.prompt.selects.some(c=>c.code===40619825) ? 40619825 : 89631139],info)
    : chainAfter(5318639,40619825,info,f) });
  const { game,C,add } = f;
  try {
    add(89631139,C.OcgLocation.MZONE); add(40619825,C.OcgLocation.HAND); add(5318639,C.OcgLocation.HAND);
    await f.start(); const uid=monster(game,89631139).uid; await f.play(40619825);
    assert.equal(monster(game,89631139).getAtk(),3000); assert.equal(monster(game,89631139).uid,uid);
    assert.equal(countChainEvents(f,'EQUIP'),0); assert.ok(game.playerGraveyard.some(c=>c.id===40619825));
    f.finish('MST / Equip Spell destroyed before resolution');
  } finally { game.dispose(); }
});

test('D.D. Crow spends its hand cost and banishes Monster Reborn’s target before its resolution', async () => {
  let f; f = await fixture({ decide: info => info.prompt.type===info.C.OcgMessageType.SELECT_CARD
    ? selectCodes([89631139],info) : chainAfter(24508238,83764718,info,f) });
  const { game,C,add }=f;
  try {
    add(89631139,C.OcgLocation.GRAVE,0,{side:'opponent'}); add(83764718,C.OcgLocation.HAND); add(24508238,C.OcgLocation.HAND);
    await f.start(); await f.play(83764718);
    assert.equal(game.getMonsterEntries('player').length,0); assert.equal(countChainEvents(f,'SPSUMMONED'),0);
    assert.ok(game.opponentBanished.some(c=>c.id===89631139)); assert.ok(game.playerGraveyard.some(c=>c.id===24508238));
    const moves=f.messages.filter(m=>m.type===C.OcgMessageType.MOVE);
    assert.ok(moves.findIndex(m=>m.card===24508238&&m.to.location===C.OcgLocation.GRAVE)<moves.findIndex(m=>m.card===89631139&&m.to.location===C.OcgLocation.REMOVED));
    f.finish('D.D. Crow / paid cost / vanished Reborn target');
  } finally { game.dispose(); }
});

test('Monster Reborn summons from the opponent’s Graveyard while preserving the native owner and identity', async () => {
  const f=await fixture({decide:info=>selectCodes([89631139],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.GRAVE,0,{side:'opponent'}); add(83764718,C.OcgLocation.HAND);
    await f.start(); const uid=game.opponentGraveyard.find(c=>c.id===89631139).uid; await f.play(83764718);
    const card=monster(game,89631139); assert.equal(card.ownerId,'opponent'); assert.equal(card.controllerId,'player'); assert.equal(card.uid,uid);
    assert.equal(card.getAtk(),3000); assert.equal(countChainEvents(f,'SPSUMMONED'),1);
    assert.ok(f.events.some(e=>e.nativeSummonConfirmed&&e.summonType==='special'),JSON.stringify(f.events.map(e=>({type:e.type,summonType:e.summonType,nativeSummonConfirmed:e.nativeSummonConfirmed}))));
    f.finish('Monster Reborn / opposing owner / current controller');
  } finally { game.dispose(); }
});

test('Twin Twisters resolves its remaining target after MST destroys one of the two targets and keeps its discard cost', async () => {
  let f; f=await fixture({decide:info=>{
    if(info.prompt.type===info.C.OcgMessageType.SELECT_CARD) {
      if(info.prompt.selects.some(c=>c.code===89631139)) return selectCodes([89631139],info);
      return selectCodes(info.prompt.max>=2?[12607053,36361633]:[12607053],info);
    }
    return chainAfter(5318639,43898403,info,f);
  }});
  const {game,C,add}=f;
  try {
    add(43898403,C.OcgLocation.HAND); add(5318639,C.OcgLocation.HAND); add(89631139,C.OcgLocation.HAND);
    add(12607053,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});
    add(36361633,C.OcgLocation.SZONE,1,{position:C.OcgPosition.FACEDOWN_DEFENSE});
    await f.start(); await f.play(43898403);
    assert.deepEqual(game.playerGraveyard.map(c=>c.id).sort((a,b)=>a-b),[5318639,12607053,36361633,43898403,89631139]);
    assert.equal(game.playerSpells.filter(Boolean).length,0); assert.equal(game.playerHand.length,0);
    const links=f.messages.filter(m=>m.type===C.OcgMessageType.CHAINING); assert.deepEqual(links.map(m=>m.code),[43898403,5318639]);
    f.finish('Twin Twisters / partial resolution / two targets / discard');
  } finally {game.dispose();}
});

test('Solemn Judgment negates Pot of Greed’s activation, consumes half the LP and permits no draws',async()=>{
  let f; f=await fixture({decide:info=>chainAfter(41420027,55144522,info,f)}); const {game,C,add}=f;
  try {
    add(55144522,C.OcgLocation.HAND); add(41420027,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});
    add(89631139,C.OcgLocation.DECK); await f.start(); await f.play(55144522);
    assert.equal(game.playerLP,4000); assert.equal(game.playerHand.length,0);
    assert.equal(countChainEvents(f,'CHAIN_NEGATED'),1); assert.equal(countChainEvents(f,'DRAW'),0);
    assert.equal(f.messages.find(m=>m.type===C.OcgMessageType.PAY_LPCOST).amount,4000);
    f.finish('Solemn Judgment / activation negation / half-LP cost');
  }finally{game.dispose();}
});

test('Imperial Order disables Pot of Greed’s effect without a native activation-negation message',async()=>{
  let f; f=await fixture({decide:info=>chainAfter(61740673,55144522,info,f)});const{game,C,add}=f;
  try {
    add(55144522,C.OcgLocation.HAND);add(61740673,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});
    add(89631139,C.OcgLocation.DECK);await f.start();await f.play(55144522);
    assert.equal(game.playerHand.length,0);assert.equal(countChainEvents(f,'DRAW'),0);assert.equal(countChainEvents(f,'CHAIN_NEGATED'),0);
    assert.equal(countChainEvents(f,'CHAIN_DISABLED'),1);assert.equal(game.playerSpells[0].id,61740673);
    f.finish('Imperial Order / effect disabled / activation retained');
  }finally{game.dispose();}
});

test('Magic Jammer’s real discard cost remains spent after it negates the Spell activation',async()=>{
  let f;f=await fixture({decide:info=>info.prompt.type===info.C.OcgMessageType.SELECT_CARD?selectCodes([89631139],info):chainAfter(77414722,55144522,info,f)});
  const{game,C,add}=f;
  try {
    add(55144522,C.OcgLocation.HAND);add(89631139,C.OcgLocation.HAND);add(77414722,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});
    add(97590747,C.OcgLocation.DECK);await f.start();await f.play(55144522);
    assert.equal(game.playerHand.length,0);assert.ok(game.playerGraveyard.some(c=>c.id===89631139));assert.equal(countChainEvents(f,'CHAIN_NEGATED'),1);
    const discard=f.messages.findIndex(m=>m.type===C.OcgMessageType.MOVE&&m.card===89631139&&m.from.location===C.OcgLocation.HAND);
    const negation=f.messages.findIndex(m=>m.type===C.OcgMessageType.CHAIN_NEGATED);assert.ok(discard>=0&&discard<negation);
    f.finish('Magic Jammer / discard paid before activation negation');
  }finally{game.dispose();}
});

test('Skill Drain’s native disabled status ends when MST removes it without replacing the monster identity',async()=>{
  const f=await fixture({decide:info=>selectCodes([82732705],info)}),{game,C,add}=f;
  try {
    add(52077741,C.OcgLocation.MZONE);add(82732705,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});add(5318639,C.OcgLocation.HAND);
    await f.start();const uid=monster(game,52077741).uid;assert.equal(monster(game,52077741).effectNegated,false);
    await f.activate(0);assert.equal(game.playerLP,7000);assert.equal(monster(game,52077741).effectNegated,true);f.observe('Skill Drain resolved');
    await f.play(5318639);assert.equal(monster(game,52077741).effectNegated,false);assert.equal(monster(game,52077741).uid,uid);
    f.finish('Skill Drain / native disabled status / destruction restores effects');
  }finally{game.dispose();}
});

test('Destroying resolved Call of the Haunted also destroys its properly revived linked monster',async()=>{
  let stage='revive';const f=await fixture({decide:info=>selectCodes([stage==='revive'?89631139:97077563],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.GRAVE);add(97077563,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});add(5318639,C.OcgLocation.HAND);
    await f.start();await f.activate(0);assert.ok(monster(game,89631139));stage='destroy';await f.play(5318639);
    assert.equal(monster(game,89631139),undefined);assert.ok(game.playerGraveyard.some(c=>c.id===89631139));assert.equal(countChainEvents(f,'SPSUMMONED'),1);
    f.finish('Call of the Haunted / resolved link / linked destruction');
  }finally{game.dispose();}
});

test('Trap Stun disables Call of the Haunted’s linked destruction when MST then removes the Trap',async()=>{
  let stage='revive';const f=await fixture({decide:info=>selectCodes([stage==='revive'?89631139:97077563],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.GRAVE);add(97077563,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});
    add(59616123,C.OcgLocation.SZONE,1,{position:C.OcgPosition.FACEDOWN_DEFENSE});add(5318639,C.OcgLocation.HAND);
    await f.start();await f.activate(0);const uid=monster(game,89631139).uid;await f.activate(1);stage='destroy';await f.play(5318639);
    assert.equal(monster(game,89631139).uid,uid);assert.equal(monster(game,89631139).getAtk(),3000);assert.ok(game.playerGraveyard.some(c=>c.id===97077563));
    f.finish('Trap Stun / negated continuous destruction link');
  }finally{game.dispose();}
});

test('Axe of Despair has a native equip relation and losing it resets the exact ATK with the same monster UID',async()=>{
  let stage='equip';const f=await fixture({decide:info=>info.prompt.type===info.C.OcgMessageType.SELECT_EFFECTYN?{...info.response,yes:false}:selectCodes([stage==='equip'?89631139:40619825],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.MZONE);add(40619825,C.OcgLocation.HAND);add(5318639,C.OcgLocation.HAND);
    await f.start();const uid=monster(game,89631139).uid;await f.play(40619825);
    assert.equal(monster(game,89631139).getAtk(),4000);assert.equal(countChainEvents(f,'EQUIP'),1);f.observe('Native equip established');
    assert.deepEqual(game.playerSpells.find(c=>c?.id===40619825).nativeQuery.equipCard,{controller:game.controllerForSide('player'),location:C.OcgLocation.MZONE,sequence:0,position:1});
    stage='destroy';await f.play(5318639,3);assert.equal(monster(game,89631139).getAtk(),3000);assert.equal(monster(game,89631139).uid,uid);
    f.finish('Axe of Despair / native equip relation / native ATK reset');
  }finally{game.dispose();}
});

test('Returning an equipped monster to the hand removes its Equip Spell by rule and keeps the hand movement private',async()=>{
  const f=await fixture({decide:info=>selectCodes([89631139],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.MZONE);add(40619825,C.OcgLocation.HAND);add(94192409,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});
    await f.start();await f.play(40619825);await f.activate(0);
    assert.ok(game.playerHand.some(c=>c.id===89631139));assert.ok(game.playerGraveyard.some(c=>c.id===40619825));assert.equal(game.playerSpells.filter(Boolean).length,0);
    const returnEvent=f.events.find(e=>e.type==='move'&&e.to?.zoneType==='hand');assert.ok(returnEvent);assert.equal(returnEvent.card,null);assert.equal(returnEvent.hidden,true);
    f.finish('Compulsory / equip cleanup / private hand movement');
  }finally{game.dispose();}
});

test('Snatch Steal changes native control and losing the Equip Spell returns the monster to its owner with the same UID',async()=>{
  let stage='steal';const f=await fixture({decide:info=>selectCodes([stage==='steal'?89631139:45986603],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.MZONE,0,{side:'opponent',position:C.OcgPosition.FACEUP_DEFENSE});
    add(45986603,C.OcgLocation.HAND);add(5318639,C.OcgLocation.HAND);
    await f.start();const uid=monster(game,89631139,'opponent').uid;await f.play(45986603);
    const stolen=monster(game,89631139);assert.equal(stolen.uid,uid);assert.equal(stolen.ownerId,'opponent');assert.equal(stolen.controllerId,'player');f.observe('Stolen control',{identityPreserved:stolen.uid===uid});
    assert.ok(game.playerSpells.find(c=>c?.id===45986603).nativeQuery.equipCard);stage='destroy';await f.play(5318639,3);
    assert.equal(monster(game,89631139),undefined);assert.equal(monster(game,89631139,'opponent').uid,uid);assert.equal(monster(game,89631139,'opponent').getAtk(),3000);
    f.finish('Snatch Steal / control changes / equip destruction returns control');
  }finally{game.dispose();}
});

test('Change of Heart returns control in the native End Phase and retains owner, position and identity',async()=>{
  const f=await fixture({decide:info=>selectCodes([89631139],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.MZONE,0,{side:'opponent',position:C.OcgPosition.FACEUP_DEFENSE});add(4031928,C.OcgLocation.HAND);
    await f.start();const uid=monster(game,89631139,'opponent').uid;await f.play(4031928);
    assert.equal(monster(game,89631139).uid,uid);assert.equal(monster(game,89631139).ownerId,'opponent');assert.equal(monster(game,89631139).position,'defense');f.observe('Temporary control',{identityPreserved:monster(game,89631139).uid===uid});
    assert.equal(await game.changePhase('end'),true);assert.equal(game.currentTurn,'player');
    const returned=monster(game,89631139,'opponent');assert.equal(returned.uid,uid);assert.equal(returned.ownerId,'opponent');assert.equal(returned.controllerId,'opponent');
    assert.equal(countChainEvents(f,'SPSUMMONED'),0);
    f.finish('Change of Heart / End Phase native control reset');
  }finally{game.dispose();}
});

test('Shrink projects the native halved original ATK and the exact reset after the End Phase',async()=>{
  const f=await fixture({decide:info=>selectCodes([89631139],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.MZONE);add(55713623,C.OcgLocation.HAND);await f.start();const uid=monster(game,89631139).uid;
    await f.play(55713623);assert.equal(monster(game,89631139).getAtk(),1500);assert.equal(monster(game,89631139).baseAtk,1500);f.observe('Shrink resolved',{nativeBaseAttack:monster(game,89631139).nativeQuery.baseAttack});
    assert.equal(await game.changePhase('end'),true);assert.equal(monster(game,89631139).getAtk(),3000);assert.equal(monster(game,89631139).baseAtk,3000);assert.equal(monster(game,89631139).uid,uid);
    f.finish('Shrink / original ATK update / native End Phase reset');
  }finally{game.dispose();}
});

test('Forbidden Lance makes an equipped monster unaffected by Axe of Despair until the End Phase without destroying the Equip',async()=>{
  const f=await fixture({decide:info=>selectCodes([89631139],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.MZONE);add(40619825,C.OcgLocation.HAND);add(27243130,C.OcgLocation.HAND);await f.start();
    await f.play(40619825);assert.equal(monster(game,89631139).getAtk(),4000);await f.play(27243130,3);
    assert.equal(monster(game,89631139).getAtk(),2200);assert.ok(game.playerSpells.some(c=>c?.id===40619825));f.observe('Lance immunity active');
    assert.equal(await game.changePhase('end'),true);assert.equal(monster(game,89631139).getAtk(),4000);assert.ok(game.playerSpells.some(c=>c?.id===40619825));
    f.finish('Forbidden Lance / native immunity suppresses equip bonus temporarily');
  }finally{game.dispose();}
});

test('Creature Swap swaps native controllers and preserves both identities while forbidding a same-turn position change',async()=>{
  const f=await fixture({decide:info=>selectCodes([97590747],info)}),{game,C,add}=f;
  try {
    add(97590747,C.OcgLocation.MZONE);add(89631139,C.OcgLocation.MZONE,0,{side:'opponent',position:C.OcgPosition.FACEUP_DEFENSE});add(31036355,C.OcgLocation.HAND);
    await f.start();const playerUid=monster(game,97590747).uid,opponentUid=monster(game,89631139,'opponent').uid;await f.play(31036355);
    assert.equal(monster(game,89631139).uid,opponentUid);assert.equal(monster(game,97590747,'opponent').uid,playerUid);f.observe('SWAP confirmed',{bothIdentitiesPreserved:true});
    assert.equal(monster(game,89631139).ownerId,'opponent');assert.equal(monster(game,97590747,'opponent').ownerId,'player');
    assert.equal(game.getAvailableActions().positionChangeCardUids.includes(monster(game,89631139).uid),false);
    assert.equal(countChainEvents(f,'SWAP'),1);assert.equal(countChainEvents(f,'SPSUMMONED'),0);
    f.finish('Creature Swap / native SWAP identity / legal position restriction');
  }finally{game.dispose();}
});

test('Dimensionhole returns a temporarily banished monster next Standby with no additional Special Summon confirmation',async()=>{
  const f=await fixture({decide:info=>selectCodes([89631139],info)}),{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.MZONE);add(22959079,C.OcgLocation.HAND);await f.start();const uid=monster(game,89631139).uid;
    await f.play(22959079);assert.equal(monster(game,89631139),undefined);assert.ok(game.playerBanished.some(c=>c.id===89631139));f.observe('Temporarily banished');
    assert.equal(await game.changePhase('end'),true);assert.equal(game.currentTurn,'player');assert.equal(monster(game,89631139).uid,uid);assert.equal(game.playerBanished.length,0);
    assert.equal(countChainEvents(f,'SPSUMMONED'),0);assert.equal(f.events.some(e=>e.nativeSummonConfirmed),false);
    f.finish('Dimensionhole / temporary banish / native return without summon');
  }finally{game.dispose();}
});

test('Metal Reflect Slime becomes the native WATER Aqua Effect Trap Monster with its exact level and DEF',async()=>{
  const f=await fixture(),{game,C,add}=f;
  try {
    add(26905245,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});await f.start();await f.activate(0);
    const card=monster(game,26905245);assert.ok(card);assert.ok(card.nativeType&C.OcgType.MONSTER);assert.ok(card.nativeType&C.OcgType.TRAP);
    assert.equal(card.card_type,'monster');assert.equal(card.type,'Trap Effect Monster');assert.equal(card.getAtk(),0);assert.equal(card.getDef(),3000);assert.equal(card.getLevel(),10);
    assert.equal(card.race,'Aqua');assert.equal(card.currentAttribute,'WATER');assert.equal(countChainEvents(f,'SPSUMMONED'),1);
    assert.equal(game.playerSpells[0],null);assert.equal(game.getAvailableActions().positionChangeCardUids.includes(card.uid),false);
    f.observe('Native Slime transformation',{publicSummon:assertPublicMonsterSummon(f,26905245,{type:'Trap Effect Monster',race:'Aqua',attribute:'WATER'})});
    f.finish('Metal Reflect Slime / native Trap Monster transformation');
  }finally{game.dispose();}
});

test('Embodiment of Apophis becomes a native Normal Trap Monster and is a legal Link Spider material',async()=>{
  const f=await fixture(),{game,C,add}=f;
  try {
    add(28649820,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});add(98978921,C.OcgLocation.EXTRA);
    await f.start();await f.activate(0);const card=monster(game,28649820);
    assert.equal(card.card_type,'monster');assert.equal(card.type,'Trap Normal Monster');assert.equal(card.getAtk(),1600);assert.equal(card.getDef(),1800);assert.equal(card.getLevel(),4);assert.equal(card.race,'Reptile');assert.equal(card.currentAttribute,'EARTH');
    f.observe('Native Apophis transformation',{publicSummon:assertPublicMonsterSummon(f,28649820,{type:'Trap Normal Monster',race:'Reptile',attribute:'EARTH'})});
    const action=game.getAvailableActions().nativeActions.find(a=>a.kind==='SELECT_SPECIAL_SUMMON'&&a.card?.id===98978921);
    assert.ok(action);assert.equal(await game.activateNativeAction(action.id),true);
    assert.ok(monster(game,98978921));assert.ok(game.playerGraveyard.some(c=>c.id===28649820&&c.card_type==='trap'));
    assert.equal(countChainEvents(f,'SPSUMMONED'),2);assert.ok(f.events.some(e=>e.nativeSummonConfirmed&&e.summonType==='link'));
    f.finish('Apophis / Normal Trap Monster / legal native Link material / reset');
  }finally{game.dispose();}
});

test('Creature Swap’s native paired MOVE messages preserve both identities when the player chooses a different destination zone',async()=>{
  const f=await fixture({decide:info=>{
    if(info.prompt.type===info.C.OcgMessageType.SELECT_PLACE) {
      const place=nativeSelectablePlaces(info.prompt).find(p=>p.location===info.C.OcgLocation.MZONE&&p.sequence===1);
      return place?{...info.response,places:[place]}:info.response;
    }
    return selectCodes([97590747],info);
  }}),{game,C,add}=f;
  try {
    add(97590747,C.OcgLocation.MZONE);add(89631139,C.OcgLocation.MZONE,0,{side:'opponent',position:C.OcgPosition.FACEUP_DEFENSE});add(31036355,C.OcgLocation.HAND);
    await f.start();const playerUid=monster(game,97590747).uid,opponentUid=monster(game,89631139,'opponent').uid;await f.play(31036355);
    assert.equal(monster(game,89631139).uid,opponentUid);assert.equal(monster(game,97590747,'opponent').uid,playerUid);
    assert.equal(game.playerMonsters[1].id,89631139);assert.equal(countChainEvents(f,'SWAP'),0);
    const controlMoves=f.messages.filter(m=>m.type===C.OcgMessageType.MOVE&&m.from.location===C.OcgLocation.MZONE&&m.to.location===C.OcgLocation.MZONE&&m.from.controller!==m.to.controller);
    assert.deepEqual(controlMoves.map(m=>m.card),[89631139,97590747]);assert.equal(controlMoves[0].to.sequence,1);
    f.finish('Creature Swap / native destination choice / paired MOVE identities');
  }finally{game.dispose();}
});

test('Seven Tools negates Raigeki Break’s activation without refunding its already-discarded cost',async()=>{
  let f;f=await fixture({decide:info=>{
    if(info.prompt.type===info.C.OcgMessageType.SELECT_CARD) return selectCodes([info.prompt.selects.some(c=>c.code===46986414)?46986414:89631139],info);
    return chainAfter(3819470,4178474,info,f);
  }});const{game,C,add}=f;
  try {
    add(89631139,C.OcgLocation.MZONE);add(46986414,C.OcgLocation.HAND);
    add(4178474,C.OcgLocation.SZONE,0,{position:C.OcgPosition.FACEDOWN_DEFENSE});add(3819470,C.OcgLocation.SZONE,1,{position:C.OcgPosition.FACEDOWN_DEFENSE});
    await f.start();const uid=monster(game,89631139).uid;await f.activate(0);
    assert.equal(game.playerHand.length,0);assert.equal(game.playerLP,7000);assert.equal(monster(game,89631139).uid,uid);
    assert.ok(game.playerGraveyard.some(c=>c.id===46986414));assert.ok(game.playerGraveyard.some(c=>c.id===4178474));assert.equal(countChainEvents(f,'CHAIN_NEGATED'),1);
    const discard=f.messages.findIndex(m=>m.type===C.OcgMessageType.MOVE&&m.card===46986414&&m.from.location===C.OcgLocation.HAND);
    const negation=f.messages.findIndex(m=>m.type===C.OcgMessageType.CHAIN_NEGATED);assert.ok(discard>=0&&discard<negation);
    f.finish('Seven Tools / negated Raigeki Break / activation cost not refunded');
  }finally{game.dispose();}
});

test('Pseudo Space exposes its native current Wetlands name while preserving physical identity and resets at the End Phase',async()=>{
  const f=await fixture({decide:info=>selectCodes([2084239],info)}),{game,C,add}=f;
  try {
    add(77584012,C.OcgLocation.HAND);add(2084239,C.OcgLocation.GRAVE);add(68638985,C.OcgLocation.MZONE);
    await f.start();assert.equal(monster(game,68638985).getAtk(),700);
    assert.equal(await game.activateFieldSpellFromHand(game.playerHand.find(c=>c.id===77584012).uid),true);
    const initial=game.playerFieldSpell,uid=initial.uid,art=initial.image_url;
    assert.equal(initial.getName(),'Pseudo Space');
    const action=game.getAvailableActions().nativeActions.find(a=>a.kind==='SELECT_ACTIVATE'&&a.card?.id===77584012);
    assert.ok(action);assert.equal(await game.activateNativeAction(action.id),true);
    const copied=game.playerFieldSpell;
    assert.equal(copied.nativeQuery.code,77584012);assert.equal(copied.nativeQuery.alias,2084239);
    assert.equal(copied.nativeAlias,2084239);assert.equal(copied.currentNameCode,2084239);
    assert.equal(copied.name,'Wetlands');assert.equal(copied.name_en,'Wetlands');assert.equal(copied.getName(),'Wetlands');
    assert.equal(copied.printedName,'Pseudo Space');assert.equal(copied.printedName_en,'Pseudo Space');
    assert.equal(copied.id,77584012);assert.equal(copied.nativeCode,77584012);assert.equal(copied.uid,uid);assert.equal(copied.image_url,art);
    assert.equal(monster(game,68638985).getAtk(),1900);assert.ok(game.playerBanished.some(c=>c.id===2084239));
    assert.ok(f.messages.some(m=>m.type===C.OcgMessageType.MOVE&&m.card===2084239&&m.to.location===C.OcgLocation.REMOVED&&(m.reason&0x80)));
    const copiedFieldEvent=f.events.filter(e=>e.type==='field-source-change'&&e.resolved).at(-1);
    assert.ok(copiedFieldEvent);assert.equal(copiedFieldEvent.active,true);assert.equal(copiedFieldEvent.negated,false);
    assert.equal(Number(copiedFieldEvent.card.id),77584012);
    assert.equal(copiedFieldEvent.card.name,'Wetlands');assert.equal(copiedFieldEvent.card.name_en,'Wetlands');
    assert.equal(copiedFieldEvent.card.printedName,'Pseudo Space');assert.equal(copiedFieldEvent.card.printedName_en,'Pseudo Space');
    f.observe('Official name and effect copied',{currentName:copied.getName(),printedName:copied.printedName,nativeCode:copied.nativeQuery.code,nativeAlias:copied.nativeQuery.alias,physicalIdentityPreserved:true,artPreserved:true,
      resolvedFieldEvent:{publicCode:Number(copiedFieldEvent.card.id),name:copiedFieldEvent.card.name,printedName:copiedFieldEvent.card.printedName,active:copiedFieldEvent.active,resolved:copiedFieldEvent.resolved,negated:copiedFieldEvent.negated}});
    assert.equal(game.getAvailableActions().nativeActions.some(a=>a.kind==='SELECT_ACTIVATE'&&a.card?.id===77584012),false);
    assert.equal(await game.changePhase('end'),true);
    const reset=game.playerFieldSpell;assert.equal(reset.nativeQuery.alias,77584012);assert.equal(reset.nativeAlias,77584012);assert.equal(reset.currentNameCode,77584012);assert.equal(reset.getName(),'Pseudo Space');assert.equal(reset.printedName,'Pseudo Space');
    assert.equal(reset.id,77584012);assert.equal(reset.uid,uid);assert.equal(reset.image_url,art);assert.equal(monster(game,68638985).getAtk(),700);
    f.finish('Pseudo Space / current native name / physical identity / official reset');
  }finally{game.dispose();}
});

after(async () => {
  const resources = await resourcesPromise;
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const files = ['public/native/ocgcore.sync.wasm', 'public/native/card-data.json', 'public/native/scripts.json',
    'src/core/native/vendor/ocgcore/index.js', 'src/core/native/NativeDuelGame.js',
    'src/core/native/NativeCardCharacteristics.js', 'src/core/native/NativeDuelVisualEvents.js',
    'src/ui/PublicDuelVisuals.js', 'tests/native-duel-chain-interactions.test.mjs'];
  const sourceHashes = Object.fromEntries(await Promise.all(files.map(async path => [path, hash(await readFile(new URL(`../${path}`, import.meta.url)))])));
  const scripts = [...allUsedCodes].sort((a, b) => a - b).map(code => {
    const sourceCode = resources.cards.get(code)?.code ?? code;
    const source = resources.scripts.get(`c${sourceCode}.lua`);
    return { code, sourceCode, name: resources.metadata.get(code)?.name, script: `c${sourceCode}.lua`,
      sha256: source == null ? null : hash(source) };
  });
  const directory = new URL('../docs/audits/artifacts/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL('native-chain-interactions-2026-10-07.json', directory),
    JSON.stringify({ date: '2026-10-07', engine: 'official ocgcore ABI 11.0 / EDOPro 38d04c9f', flags: String(NATIVE_TCG_DUEL_FLAGS),
      declaredFixturesOnly: true, debugApi: false, testMode: false, pseudoShuffle: false, postStartInjection: false,
      sourceHashes, scripts, cases: evidence }, null, 2) + '\n');
});
