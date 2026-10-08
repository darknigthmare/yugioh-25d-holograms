import assert from 'node:assert/strict';
import test from 'node:test';
import { OcgMessageType as M, OcgLocation as L, OcgPosition as P, OcgQueryFlags as Q } from '../src/core/native/vendor/ocgcore/index.js';
import { createNativeVisualContext, nativeLocationToCardRef, readNativePublicCardStats,
  NATIVE_PUBLIC_VISUAL_QUERY_FLAGS, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { resolveCombatVisualProfile, resolveFieldSourceVisualProfile } from '../src/ui/CombatVisualProfiles.js';
import { FIELD_SPELL_ENVIRONMENT_CATALOG } from '../src/ui/FieldSpellEnvironmentCatalog.js';
import { FIELD_SPELL_REFERENCE_ART_PALETTES } from '../src/ui/FieldSpellReferenceArtPalettes.js';
import { createCampaignDuelTracker } from '../src/content/CampaignDuelTracker.js';
import { readFile } from 'node:fs/promises';

const blueEyes = 89631139;
const fieldCode = 87624166;
const loc = (controller = 0, location = L.MZONE, sequence = 0, position = P.FACEUP_ATTACK) => ({ controller, location, sequence, position });
const metadata = code => ({ id: String(code), name: code === fieldCode ? 'Ancient Forest' : 'Blue-Eyes White Dragon',
  name_en: 'Public name', type: code === fieldCode ? 'Spell Card' : 'Normal Monster',
  card_type: code === fieldCode ? 'spell' : 'monster', race: code === fieldCode ? 'Field' : 'Dragon', attribute: 'LIGHT',
  uid: 'DO-NOT-PUBLISH', effects: { handTarget: 'SECRET' }, atk: 1, def: 1 });
const translate = (message, context) => translateNativeVisualEvents(message, context);
const context = extra => createNativeVisualContext({ getCardMetadata: metadata,
  queryCard: () => ({ code: blueEyes, position: P.FACEUP_ATTACK, attack: 3200, defense: 2700,
    baseAttack: 3000, baseDefense: 2500, level: 8, counters: { 1: 2 }, reason: 0,
    targetCards: [{ code: 123456789 }], overlayCards: [123456789], isHidden: false }), ...extra });

test('public native aliases change the visible name without changing the physical Field source', () => {
  // Values observed in the official Pseudo Space/Wetlands runtime scenario.
  let alias = 2084239;
  const requests = [];
  const ctx = createNativeVisualContext({
    getCardMetadata: code => ({ id: String(code), name: code === 77584012 ? 'Pseudo Space' : 'Wetlands',
      name_en: code === 77584012 ? 'Pseudo Space' : 'Wetlands', type: 'Spell Card', card_type: 'spell', race: 'Field' }),
    queryCard: request => {
      requests.push(request);
      return { code: 77584012, alias, type: 0x80002, position: P.FACEUP_ATTACK };
    }
  });
  const source = { ...loc(0, L.SZONE, 5), code: 77584012, type: M.CHAINING, chain_size: 1 };
  const copied = translate(source, ctx).events.find(event => event.type === 'activate').card;
  assert.equal(copied.id, '77584012');
  assert.equal(copied.name, 'Wetlands');
  assert.equal(copied.printedName, 'Pseudo Space');
  assert.equal(copied.currentNameCode, 2084239);
  assert.ok(requests.every(request => request.flags & Q.ALIAS));
  alias = 77584012;
  const restored = translate({ ...source, chain_size: 2 }, ctx).events.find(event => event.type === 'activate').card;
  assert.equal(restored.id, '77584012');
  assert.equal(restored.name, 'Pseudo Space');
  ctx.queryCard = () => ({ code: 77584012, isHidden: true,
    get alias() { assert.fail('A private native alias must never be read'); } });
  assert.equal(translate({ ...source, chain_size: 3 }, ctx).events[0].card.name, 'Pseudo Space');
});

function summon(ctx, code = blueEyes, location = loc(), summonType = M.SUMMONING) {
  translate({ type: summonType, code, ...location }, ctx);
  const completedType = summonType === M.SPSUMMONING ? M.SPSUMMONED
    : summonType === M.FLIPSUMMONING ? M.FLIPSUMMONED : M.SUMMONED;
  return translate({ type: completedType }, ctx).events[0];
}

test('typed OCG draws, sets and concealed moves never read or publish a hidden passcode', () => {
  const ctx = context({ queryCard: () => { throw new Error('hidden native query'); },
    getCardMetadata: () => { throw new Error('hidden metadata read'); } });
  const secret = { get code() { throw new Error('hidden passcode read'); }, position: P.FACEDOWN_DEFENSE };
  const draw = translate({ type: M.DRAW, player: 1, drawn: [secret, secret] }, ctx);
  assert.equal(draw.events.length, 2);
  assert.deepEqual(draw.events[0], { type: 'draw', target: 'opponent', card: null, hidden: true });
  const set = translate({ type: M.SET, ...loc(1, L.MZONE, 2, P.FACEDOWN_DEFENSE),
    get code() { throw new Error('set identity read'); } }, ctx);
  assert.equal(set.events[0].type, 'set-monster');
  assert.equal(set.events[0].card, null);
  const move = translate({ type: M.MOVE, from: loc(1, L.HAND, 0, P.FACEDOWN_DEFENSE),
    to: loc(1, L.SZONE, 5, P.FACEDOWN_DEFENSE),
    get card() { throw new Error('move identity read'); } }, ctx);
  assert.equal(move.events[0].card, null);
  assert.equal(move.events[0].zoneType, 'field');
  assert.equal(move.events[1].card, null);
  const posChange = translate({ type: M.POS_CHANGE, ...loc(1, L.MZONE, 0, P.FACEDOWN_DEFENSE),
    prev_position: P.FACEUP_ATTACK, get code() { throw new Error('hidden position identity read'); } }, ctx);
  assert.equal(posChange.events[0].card, null);
  assert.doesNotMatch(JSON.stringify([draw, set, move, posChange]), /DO-NOT-PUBLISH|SECRET/);
});

test('native references preserve main zones, mirror shared Extra zones, and normalize Terrain/Pendulum', () => {
  assert.deepEqual(nativeLocationToCardRef(loc(0, L.MZONE, 5)), { owner: 'player', zoneType: 'extra', zoneIndex: 0 });
  assert.deepEqual(nativeLocationToCardRef(loc(1, L.MZONE, 5)), { owner: 'opponent', zoneType: 'extra', zoneIndex: 1 });
  assert.deepEqual(nativeLocationToCardRef(loc(1, L.MZONE, 6)), { owner: 'opponent', zoneType: 'extra', zoneIndex: 0 });
  assert.deepEqual(nativeLocationToCardRef(loc(1, L.MZONE, 6), 1), { owner: 'player', zoneType: 'extra', zoneIndex: 1 });
  assert.deepEqual(nativeLocationToCardRef(loc(1, L.SZONE, 5)), { owner: 'opponent', zoneType: 'field', zoneIndex: 0 });
  assert.deepEqual(nativeLocationToCardRef(loc(1, L.FZONE, 0)), { owner: 'opponent', zoneType: 'field', zoneIndex: 0 });
  assert.deepEqual(nativeLocationToCardRef(loc(0, L.SZONE, 7)), { owner: 'player', zoneType: 'pendulum', zoneIndex: 1 });
  assert.deepEqual(nativeLocationToCardRef({ ...loc(0, L.OVERLAY, 2), overlay_sequence: 3 }),
    { owner: 'player', zoneType: 'overlay', zoneIndex: 2, overlayIndex: 3 });
  assert.deepEqual(nativeLocationToCardRef({ ...loc(1, L.MZONE, 5), overlay_sequence: 0 }),
    { owner: 'opponent', zoneType: 'overlay', zoneIndex: 1, hostZoneType: 'extra', overlayIndex: 0 });
  assert.equal(nativeLocationToCardRef(loc(0, L.MZONE, 7)), null);
});

test('summon success exposes a copied public card with exact native stats and no JS calculation', () => {
  const requests = [];
  const ctx = context({ queryCard: query => { requests.push(query); return { code: blueEyes, attack: 3567,
    defense: 2211, baseAttack: 3000, baseDefense: 2500, counters: { 1: 4 }, targetCards: [{ code: 123456789 }] }; } });
  const event = summon(ctx, blueEyes, loc(1, L.MZONE, 6), M.SPSUMMONING);
  assert.equal(event.type, 'summon');
  assert.equal(event.zoneType, 'extra');
  assert.equal(event.zoneIndex, 0);
  assert.equal(event.card.atk, 3567);
  assert.equal(event.card.def, 2211);
  assert.equal(event.card.nativeStats.baseAttack, 3000);
  assert.deepEqual(event.card.counters, { 1: 4 });
  assert.equal(requests[0].flags, NATIVE_PUBLIC_VISUAL_QUERY_FLAGS);
  assert.equal(NATIVE_PUBLIC_VISUAL_QUERY_FLAGS & (Q.TARGET_CARD | Q.OVERLAY_CARD | Q.EQUIP_CARD), 0);
  assert.equal(Object.isFrozen(event.card), true);
  assert.doesNotMatch(JSON.stringify(event), /DO-NOT-PUBLISH|SECRET|123456789/);
});

test('failed summons have no success animation and token summons use public native type', () => {
  const ctx = context();
  translate({ type: M.SUMMONING, code: blueEyes, ...loc() }, ctx);
  translate({ type: M.MOVE, card: blueEyes, from: loc(), to: loc(0, L.GRAVE, 0) }, ctx);
  assert.equal(translate({ type: M.SUMMONED }, ctx).events.length, 0);
  const token = context({ queryCard: () => ({ code: blueEyes, type: 0x4001, attack: 0, defense: 0 }) });
  const event = summon(token, blueEyes, loc(0, L.MZONE, 2), M.SPSUMMONING);
  assert.equal(event.card.isToken, true);
  assert.equal(event.summonType, 'special');
});

test('public reveals are explicit and do not turn a confirmed face-down card into a hologram', () => {
  const ctx = context({ queryCard: () => { throw new Error('confirmation should not query hidden stats'); } });
  const result = translate({ type: M.CONFIRM_CARDS, player: 0,
    cards: [{ code: blueEyes, controller: 1, location: L.HAND, sequence: 2 }] }, ctx);
  assert.equal(result.events[0].type, 'reveal');
  assert.equal(result.events[0].card.id, String(blueEyes));
  assert.equal(result.events[0].publicReveal, true);
  assert.equal(createPublicCombatVisual(result.events[0], {}), null);
  const privateView = context({ isPublicReveal: () => false });
  assert.deepEqual(translate({ type: M.CONFIRM_CARDS, player: 0,
    cards: [{ code: blueEyes, controller: 1, location: L.DECK, sequence: 2 }] }, privateView), { events: [], logs: [] });
});

test('attacks retain both public zone references while the defending Set stays anonymous', () => {
  const ctx = context();
  summon(ctx, blueEyes, loc(1, L.MZONE, 5));
  const attack = translate({ type: M.ATTACK, card: loc(1, L.MZONE, 5),
    target: loc(0, L.MZONE, 3, P.FACEDOWN_DEFENSE) }, ctx).events[0];
  assert.equal(attack.attackerSide, 'opponent');
  assert.equal(attack.atkZoneType, 'extra');
  assert.equal(attack.atkZoneIndex, 1);
  assert.equal(attack.defZoneIndex, 3);
  assert.equal(attack.targetCard, null);
  const visual = createPublicCombatVisual(attack, {});
  assert.deepEqual(visual.sourceRef, { owner: 'opponent', zoneType: 'extra', zoneIndex: 1 });
  assert.deepEqual(visual.targetRef, { owner: 'player', zoneType: 'main', zoneIndex: 3 });
  const negated = translate({ type: M.ATTACK_DISABLED }, ctx).events[0];
  assert.equal(negated.type, 'attack-negated');
  assert.equal(createPublicCombatVisual(negated, {}).kind, 'negate');
  const direct = translate({ type: M.ATTACK, card: loc(1, L.MZONE, 5), target: null }, ctx).events[0];
  assert.equal(direct.type, 'attack-direct');
  assert.equal(direct.target, 'player');
});

test('typed Battle values do not create an inferred field bonus or leak a concealed defender', () => {
  const ctx = context();
  summon(ctx);
  const battle = translate({ type: M.BATTLE,
    card: { ...loc(), attack: 3999, defense: 2500, destroyed: false },
    target: { ...loc(1, L.MZONE, 0, P.FACEDOWN_DEFENSE), attack: 999999, defense: 999999, destroyed: true } }, ctx);
  assert.equal(battle.events.length, 1);
  assert.equal(battle.events[0].nativeStats.attack, 3999);
  assert.equal(battle.events[0].type, 'battle-stats');
  assert.doesNotMatch(JSON.stringify(battle), /boost|999999|calculatedAtk/);
  const destroy = translate({ type: M.MOVE, card: blueEyes,
    from: loc(1, L.MZONE, 0, P.FACEDOWN_DEFENSE), to: loc(1, L.GRAVE, 0) }, ctx).events.find(event => event.type === 'destroy');
  assert.equal(destroy.card, null);
  assert.equal(destroy.faceDown, true);
});

test('LP damage, costs, recovery and correction use the native amounts', () => {
  const ctx = context({ lifePoints: [8000, 6500] });
  assert.equal(translate({ type: M.DAMAGE, player: 1, amount: 333 }, ctx).events[0].lp, 6167);
  const cost = translate({ type: M.PAY_LPCOST, player: 0, amount: 1000 }, ctx).events[0];
  assert.equal(cost.lp, 7000);
  assert.equal(cost.cost, true);
  const recovery = translate({ type: M.RECOVER, player: 1, amount: 717 }, ctx).events[0];
  assert.equal(recovery.type, 'lp-gain');
  assert.equal(recovery.lp, 6884);
  const update = translate({ type: M.LPUPDATE, player: 1, lp: 5000 }, ctx).events[0];
  assert.equal(update.type, 'lp-update');
  assert.equal(update.damage, 1884);
});

test('field chains announce only declared source, and publish active status after resolution', () => {
  const ctx = context({ queryCard: () => ({ code: fieldCode, isHidden: false, reason: 0 }) });
  const activate = translate({ type: M.CHAINING, code: fieldCode, ...loc(1, L.SZONE, 5),
    triggering_controller: 1, triggering_location: L.HAND, triggering_sequence: 0,
    description: 0n, chain_size: 1 }, ctx);
  assert.deepEqual(activate.events.map(event => event.type), ['activate', 'chain-pop']);
  assert.equal(activate.events[0].zoneType, 'field');
  assert.equal(activate.events.some(event => event.resolved), false);
  const solved = translate({ type: M.CHAIN_SOLVED, chain_size: 1 }, ctx);
  assert.equal(solved.events[0].stage, 'resolved');
  assert.equal(solved.events[1].active, true);
  const visual = createPublicCombatVisual(solved.events[1], {});
  assert.equal(visual.kind, 'activate');
  assert.equal(resolveCombatVisualProfile(visual).sourceCardId, String(fieldCode));
  translate({ type: M.CHAIN_NEGATED, chain_size: 1 }, ctx);
  const negated = translate({ type: M.CHAIN_SOLVED, chain_size: 1 }, ctx).events[1];
  assert.equal(negated.active, false);
  assert.equal(createPublicCombatVisual(negated, {}), null);
});

test('a field leaving during its chain is not shown as a newly active source', () => {
  const ctx = context({ queryCard: () => ({ code: fieldCode, isHidden: false, reason: 1 }) });
  translate({ type: M.CHAINING, code: fieldCode, ...loc(0, L.SZONE, 5),
    triggering_controller: 0, triggering_location: L.SZONE, triggering_sequence: 5,
    description: 0n, chain_size: 1 }, ctx);
  const move = translate({ type: M.MOVE, card: fieldCode,
    from: loc(0, L.SZONE, 5), to: loc(0, L.GRAVE, 0) }, ctx);
  const destroy = move.events.find(event => event.type === 'destroy');
  assert.equal(destroy.zoneType, 'field');
  assert.equal(resolveCombatVisualProfile(createPublicCombatVisual(destroy, {})).shape, 'shatter');
  const solved = translate({ type: M.CHAIN_SOLVED, chain_size: 1 }, ctx).events[1];
  assert.equal(solved.active, false);
});

test('native reason flags distinguish destruction from a tribute/cost sent to the graveyard', () => {
  for (const [reason, isDestroy] of [[1, true], [2, false], [128, false], [0, false]]) {
    const ctx = context({ queryCard: () => ({ code: blueEyes, reason, attack: 3000, defense: 2500 }) });
    summon(ctx);
    const result = translate({ type: M.MOVE, card: blueEyes, from: loc(), to: loc(0, L.GRAVE, 0) }, ctx);
    assert.equal(result.events.some(event => event.type === 'destroy'), isDestroy);
  }
});

test('counter messages contain public counts and use native stats without private overlay identities', () => {
  const ctx = context();
  summon(ctx);
  const add = translate({ type: M.ADD_COUNTER, counter_type: 1, controller: 0, location: L.MZONE, sequence: 0, count: 2 }, ctx).events[0];
  assert.equal(add.delta, 2);
  assert.deepEqual(add.nativeStats.counters, { 1: 2 });
  assert.equal(readNativePublicCardStats(loc(), ctx).attack, 3200);
  const hidden = translate({ type: M.REMOVE_COUNTER, counter_type: 1, controller: 1, location: L.MZONE, sequence: 0, count: 1 }, ctx).events[0];
  assert.equal(hidden.delta, -1);
  assert.equal('card' in hidden, false);
  assert.doesNotMatch(JSON.stringify([add, hidden]), /123456789|overlayCards/);
});

test('later native query identities cannot reveal cards before their own public message', () => {
  const ctx = context({ queryCard: () => ({ code: 46986414, attack: 9999, defense: 9999, isHidden: false }) });
  const event = summon(ctx);
  assert.equal(event.card.id, String(blueEyes));
  assert.equal('nativeStats' in event.card, false);
  assert.doesNotMatch(JSON.stringify(event), /46986414|9999/);
});

test('all 339 field sources have activation/destruction/negation profiles from their archived source palettes', () => {
  for (const entry of FIELD_SPELL_ENVIRONMENT_CATALOG) {
    const palette = FIELD_SPELL_REFERENCE_ART_PALETTES[entry.cardId];
    for (const kind of ['activate', 'destroy', 'negate']) {
      const profile = resolveFieldSourceVisualProfile(kind, { id: entry.cardId });
      assert.equal(profile.sourceCardId, entry.cardId);
      assert.equal(profile.color, palette[1]);
      assert.equal(profile.secondary, palette[3]);
      if (kind === 'activate') assert.ok(['rune', 'field-water', 'field-growth', 'field-gloom', 'field-radiance'].includes(profile.shape));
      else assert.equal(profile.shape, kind === 'destroy' ? 'shatter' : 'shield');
    }
  }
  assert.equal(resolveFieldSourceVisualProfile('activate', { id: '101403071' }), null);
  assert.equal(resolveCombatVisualProfile({ kind: 'activate', card: { id: String(fieldCode) }, profile: 'ancient-forest-destruction' }).shape, 'roots');
});

test('proper Special Summon types require native material reasons, while revivals and tokens stay special', () => {
  const reasons = { fusion: 0x40000, synchro: 0x80000, ritual: 0x100000, xyz: 0x200000, link: 0x10000000 };
  for (const [kind, reason] of Object.entries(reasons)) {
    const ctx = context({ getCardMetadata: code => ({ ...metadata(code), type: `${kind} Monster`, extra_type: kind }),
      queryCard: reference => reference.location === L.GRAVE
        ? { code: blueEyes, reason: reason | 8, type: 17 }
        : { code: fieldCode, reason: 2048, attack: 1800, defense: 2000 } });
    translate({ type: M.MOVE, card: blueEyes, from: loc(0, L.MZONE, 1), to: loc(0, L.GRAVE, 0) }, ctx);
    const proper = summon(ctx, fieldCode, loc(), M.SPSUMMONING);
    assert.equal(proper.summonType, kind);
    assert.match(proper.card.runtimeInstanceId, /^native-public-summon-/);
    const revived = summon(ctx, fieldCode, loc(0, L.MZONE, 2), M.SPSUMMONING);
    assert.equal(revived.summonType, 'special');
    assert.notEqual(proper.card.runtimeInstanceId, revived.card.runtimeInstanceId);
    const tracker = createCampaignDuelTracker(`native-${kind}`);
    tracker.recordAnimation(proper);
    tracker.recordAnimation(revived);
    assert.equal(tracker.snapshot()[`${kind}Summons`], 1);
  }
  const token = context({ queryCard: () => ({ code: blueEyes, type: 0x4001, reason: 2048 }) });
  token.materialKinds.add('fusion');
  assert.equal(summon(token, blueEyes, loc(), M.SPSUMMONING).summonType, 'special');
});

test('public Xyz material reasons survive an Extra overlay move even when individual overlay queries are unavailable', () => {
  const utopia = 84013237;
  const ctx = context({ queryCard: () => ({}), getCardMetadata: code => ({ ...metadata(code),
    type: code === utopia ? 'Xyz Effect Monster' : 'Normal Monster',
    extra_type: code === utopia ? 'xyz' : null }) });
  for (const [index, code] of [97590747,76812113].entries()) translate({ type:M.MOVE,card:code,reason:0x200008,
    from:loc(0,L.MZONE,index),to:{...loc(0,L.EXTRA,0),overlay_sequence:index} },ctx);
  const proper = summon(ctx,utopia,loc(),M.SPSUMMONING);
  assert.equal(proper.summonType,'xyz');
  assert.equal(createPublicCombatVisual(proper,{}).profile,'xyz-summon');
  assert.equal(summon(ctx,utopia,loc(0,L.MZONE,2),M.SPSUMMONING).summonType,'special');

  const privateContext = context({ queryCard:()=>{throw Error('private material query');} });
  const hiddenMove = {type:M.MOVE,reason:0x200008,from:loc(1,L.HAND,0,P.FACEDOWN_DEFENSE),
    to:{...loc(1,L.MZONE,0,0),overlay_sequence:0}};
  Object.defineProperty(hiddenMove,'card',{get(){throw Error('private material identity');}});
  assert.doesNotThrow(()=>translate(hiddenMove,privateContext));
  assert.equal(privateContext.materialKinds.size,0);
});

test('public success identifiers preserve repeat summons and private Set actions for the campaign tracker', () => {
  const ctx = context();
  const tracker = createCampaignDuelTracker('native-repeated-actions');
  translate({ type: M.NEW_TURN, player: 0 }, ctx);
  const first = summon(ctx);
  const second = summon(ctx, blueEyes, loc(0, L.MZONE, 1));
  tracker.recordAnimation(first);
  tracker.recordAnimation(second);
  tracker.recordAnimation(first);
  assert.equal(tracker.snapshot().normalSummons, 2);
  assert.equal(first.card.turnSummoned, 1);
  assert.notEqual(first.card.runtimeInstanceId, second.card.runtimeInstanceId);
  const set = translate({ type: M.SET, code: blueEyes, ...loc(0, L.MZONE, 3, P.FACEDOWN_DEFENSE) }, ctx).events[0];
  assert.equal(set.card, null);
  tracker.recordAnimation(set);
  tracker.recordAnimation({ ...set });
  assert.equal(tracker.snapshot().monsterSets, 1);
  const hiddenByEffect = translate({ type: M.POS_CHANGE, code: blueEyes, ...loc(0, L.MZONE, 0, P.FACEDOWN_DEFENSE),
    prev_position: P.FACEUP_ATTACK }, ctx).events[0];
  tracker.recordAnimation(hiddenByEffect);
  assert.equal(tracker.snapshot().monsterSets, 1);
  tracker.recordAnimation(translate({ type: M.PAY_LPCOST, player: 0, amount: 1000 }, ctx).events[0]);
  assert.equal(tracker.snapshot().damageTaken, 0);
  tracker.recordAnimation(translate({ type: M.DAMAGE, player: 0, amount: 500 }, ctx).events[0]);
  assert.equal(tracker.snapshot().damageTaken, 500);
});

test('native Tribute reasons and declared Pendulum procedure are counted only after summon success', () => {
  const ctx = context({ queryCard: reference => ({ code: blueEyes,
    reason: reference.location === L.GRAVE ? 8 | 16 | 2 : 16, attack: 3000, defense: 2500 }) });
  translate({ type: M.MOVE, card: blueEyes, from: loc(0, L.MZONE, 1), to: loc(0, L.GRAVE, 0) }, ctx);
  translate({ type: M.MOVE, card: blueEyes, from: loc(0, L.MZONE, 2), to: loc(0, L.GRAVE, 1) }, ctx);
  const tribute = summon(ctx);
  assert.equal(tribute.summonType, 'tribute');
  assert.equal(tribute.tributeCount, 2);
  const pendulum = context({ getPublicSummonType: () => 'pendulum' });
  const tracker = createCampaignDuelTracker('native-pendulum');
  translate({ type: M.NEW_TURN, player: 0 }, pendulum);
  const pending = translate({ type: M.SPSUMMONING, code: blueEyes, ...loc() }, pendulum);
  assert.equal(pending.events.length, 0);
  const first = translate({ type: M.SPSUMMONED }, pendulum).events[0];
  const second = summon(pendulum, blueEyes, loc(0, L.MZONE, 1), M.SPSUMMONING);
  tracker.recordAnimation(first); tracker.recordAnimation(second);
  assert.equal(first.summonType, 'pendulum');
  assert.equal(tracker.snapshot().pendulumSummons, 1);
});

test('recorded genuine Fusion Gate messages and native query reasons count three Fusions, never a later revival', async () => {
  const report = JSON.parse(await readFile(new URL('../docs/audits/artifacts/native-field-runtime-2026-10-07.json', import.meta.url), 'utf8'));
  const scenario = report.scenarios.find(row => row.id === 'fusion-gate-repeat-mr5-main-zones');
  assert.equal(scenario.status, 'passed');
  const ctx = context({ getCardMetadata: code => ({ id: String(code),
    type: code === 23995346 ? 'Fusion Monster' : code === 33550694 ? 'Spell Card' : 'Normal Monster' }),
    queryCard: reference => {
      for (const { query, result } of scenario.queries) {
        if (query.controller !== reference.controller || query.location !== reference.location) continue;
        if (Array.isArray(result)) return result[reference.sequence];
        if (query.sequence === reference.sequence) return result;
      }
      return null;
    } });
  const tracker = createCampaignDuelTracker('recorded-genuine-fusion-gate');
  const summons = [];
  for (const message of scenario.messages) {
    for (const event of translate(message, ctx).events) {
      tracker.recordAnimation(event);
      if (event.type === 'summon') summons.push(event);
    }
  }
  assert.equal(summons.length, 3);
  assert.deepEqual(summons.map(event => event.summonType), ['fusion', 'fusion', 'fusion']);
  assert.equal(tracker.snapshot().fusionSummons, 3);
  const revived = summon(ctx, 23995346, loc(0, L.MZONE, 3), M.SPSUMMONING);
  tracker.recordAnimation(revived);
  assert.equal(revived.summonType, 'special');
  assert.equal(tracker.snapshot().fusionSummons, 3);
});
