import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MatchEngine } from '../src/core/MatchEngine.js';
import { MatchController } from '../src/ui/MatchController.js';
import { createNativeCardDataMaps } from '../src/core/native/NativeCardData.js';
import { createNativeScriptArchive } from '../src/core/native/NativeScriptArchive.js';
import {
  createNativeCardTemplate, isSupportedNativeCatalogueCard
} from '../src/core/native/NativeCardCatalogue.js';
import { createTcgFormatPolicy } from '../src/core/tcg/TcgCardLegality.js';
import { getTcgAdvancedRestriction, getTcgSnapshotCopyIdentity } from '../src/core/tcg/TcgAdvancedFormat.js';
import { TCG_ADVANCED_BANLIST_ENTRIES } from '../src/core/tcg/TcgAdvancedBanlistData.js';
import { canAddDeckBuilderCard, validateCustomDeck } from '../src/ui/DeckBuilderRules.js';

export async function loadTcgFormatFixture() {
  const [cardData, scripts] = await Promise.all([
    readFile(new URL('../public/native/card-data.json', import.meta.url), 'utf8'),
    readFile(new URL('../public/native/scripts.json', import.meta.url), 'utf8')
  ]);
  const resources = { ...createNativeCardDataMaps(JSON.parse(cardData)),
    scripts: createNativeScriptArchive(JSON.parse(scripts)) };
  const policy = createTcgFormatPolicy(resources);
  const options = { native: true, format: 'TCG', ...policy,
    isSupportedCard: (card, section) => isSupportedNativeCatalogueCard(resources, card, section === 'side' ? null : section) };
  const card = code => createNativeCardTemplate(resources, code);
  // Real, released, unrestricted Normal monsters; no fictional IDs or fake
  // legality metadata are used in these registered Advanced decks.
  const fillerIds = [89631139,46986414,74677422,91152256,13039848,88819587,
    5053103,97590747,14898066,66602787,15025844,41392891,32452818,
    28279543,6368038,48305365,64428736,44287299,49791927,89943723];
  const legalDeck = () => ({ mainDeck: fillerIds.flatMap(id => [card(id), card(id)]), extraDeck: [], sideDeck: [] });
  const withCopies = (target, count) => {
    const deck = legalDeck();
    // Keep target separate from fillers, so three/four-copy assertions are
    // independent of which official source row is under test.
    deck.mainDeck = deck.mainDeck.filter(c => policy.getCopyIdentity(c) !== policy.getCopyIdentity(target));
    for (const id of fillerIds) {
      while (deck.mainDeck.length < 40 && deck.mainDeck.filter(c => c.id === card(id).id).length < 3
        && policy.getCopyIdentity(card(id)) !== policy.getCopyIdentity(target)) deck.mainDeck.push(card(id));
    }
    assert.equal(deck.mainDeck.length, 40);
    const section = target.belongsInExtraDeck || target.extra_type ? 'extraDeck' : 'mainDeck';
    if (count > 0) {
      if (section === 'mainDeck') deck.mainDeck[0] = target; else deck.extraDeck.push(target);
      deck.sideDeck = Array.from({ length: count - 1 }, () => target);
    }
    return deck;
  };
  return { resources, policy, options, card, legalDeck, withCopies };
}

export function verifyOfficialRow(fixture, entry) {
  const target = fixture.card(entry.codes[0]);
  assert.ok(target, `Bundled script/normal template missing for ${entry.name}`);
  assert.equal(fixture.policy.getCardEligibility(target).allowed, true);
  assert.equal(fixture.policy.getCardRestriction(target), entry.copyLimit);
  const engine = new MatchEngine(fixture.options);
  const accepted = engine.validateDeck(fixture.withCopies(target, entry.copyLimit));
  assert.equal(accepted.valid, true, `${entry.name} accepted at official copy limit: ${JSON.stringify(accepted.issues)}`);
  const rejected = engine.validateDeck(fixture.withCopies(target, entry.copyLimit + 1));
  const copyIssue = rejected.issues.find(issue => issue.code === 'COPY_LIMIT_EXCEEDED'
    && issue.cardId === fixture.policy.getCopyIdentity(target));
  assert.equal(rejected.valid, false);
  assert.equal(copyIssue?.allowed, entry.copyLimit);
  assert.equal(copyIssue?.found, entry.copyLimit + 1);
  const builder = validateCustomDeck(fixture.withCopies(target, entry.copyLimit + 1), 'strict', fixture.options);
  assert.equal(builder.valid, false);
  assert.ok(builder.issues.some(issue => issue.code === 'COPY_LIMIT_EXCEEDED' && issue.allowed === entry.copyLimit));
  for (const code of entry.codes) {
    assert.equal(getTcgSnapshotCopyIdentity(code), fixture.policy.getCopyIdentity(target));
    assert.equal(new MatchEngine().getCardCopyLimit({ id: ` 00${code} ` }), entry.copyLimit);
    assert.equal(new MatchEngine().getCardCopyLimit({ id: code, nativeAlias: 89943723, name: 'Elemental HERO Neos' }), entry.copyLimit);
  }
  return { name: entry.name, status: entry.status, copyLimit: entry.copyLimit,
    identity: fixture.policy.getCopyIdentity(target), physicalCodes: entry.codes,
    allowedCopiesValid: true, excessCopiesRejectedAcrossSections: true,
    builderAgrees: true, aliasesAndForgedNamesCannotBypass: true };
}

export function verifyLifecycleCases(fixture) {
  const cases = [];
  const run = (id, callback) => { callback(); cases.push({ id, ok: true }); };
  const create = () => new MatchController({ engineOptions: fixture.options });
  const config = () => ({ playerIds: ['player','opponent'], firstPlayerId: 'player', initialDecisionPlayerId: 'opponent',
    decks: { player: fixture.legalDeck(), opponent: fixture.legalDeck() } });
  run('real-cdb-register-side-restore-preserves-race-mask', () => {
    const c = create(); const start = config();
    start.decks.player.sideDeck = [fixture.card(59755122), fixture.card(84013237)];
    c.startMatch(start); assert.equal(typeof c.engine.getActiveDeck('player').mainDeck.at(-1).nativeRace, 'string');
    c.recordDuelResult('opponent'); const deck = c.engine.getActiveDeck('player');
    [deck.mainDeck[0],deck.sideDeck[0]] = [deck.sideDeck[0],deck.mainDeck[0]];
    assert.equal(c.stageSideDeck('player',deck).valid,true); c.chooseFirstPlayer('player','opponent');
    const restored = MatchController.deserialize(c.serialize(), { engineOptions: fixture.options });
    assert.deepEqual(restored.getViewModel(),c.getViewModel());
    assert.equal(restored.prepareNextDuel().valid,true);
    assert.equal(restored.getDuelLaunchConfig().decks.player.mainDeck[0].id,'59755122');
  });
  run('side-metadata-forgery-is-transactionally-rejected', () => {
    const c=create();c.startMatch(config());c.recordDuelResult('opponent');
    const before=c.serialize();const d=c.engine.getActiveDeck('player'); d.mainDeck[0].atk=999999;
    assert.equal(c.stageSideDeck('player',d).valid,false);assert.equal(c.serialize(),before);
    const tampered=JSON.parse(before);tampered.engine.state.activeDecks.player.mainDeck[0].desc='Forged rules';
    assert.throws(()=>c.restore(tampered),/active deck.*invalid/i);assert.equal(c.serialize(),before);
  });
  run('side-exact-main-extra-side-sizes-and-physical-pool', () => {
    const e=new MatchEngine(fixture.options);const d=fixture.legalDeck();d.extraDeck=[fixture.card(84013237)];
    d.sideDeck=[fixture.card(77637979),fixture.card(59755122)];
    const legal=structuredClone(d);[legal.extraDeck[0],legal.sideDeck[0]]=[legal.sideDeck[0],legal.extraDeck[0]];
    assert.equal(e.validateSideDeckSwap(d,legal).valid,true);
    const wrong=structuredClone(legal);wrong.extraDeck.pop();wrong.sideDeck.push(d.extraDeck[0]);
    assert.ok(e.validateSideDeckSwap(d,wrong).issues.some(i=>i.code==='SIDE_DECK_SIZE_CHANGED'));
    const foreign=structuredClone(legal);foreign.sideDeck[1]=fixture.card(46986415);
    assert.ok(e.validateSideDeckSwap(d,foreign).issues.some(i=>i.code==='SIDE_DECK_POOL_CHANGED'));
  });
  run('draw-extends-to-duel-four-new-random-method-loser-choice', () => {
    const c=create();c.startMatch(config());c.recordDuelResult('draw');
    assert.equal(c.getViewModel().nextDuel.randomDecisionRequired,true);
    assert.throws(()=>c.chooseFirstPlayer('player','player'),/random method/i);
    c.recordRandomMethodWinner('opponent');assert.throws(()=>c.chooseFirstPlayer('player','player'),/entitled/i);
    c.chooseFirstPlayer('opponent','player');c.prepareNextDuel();c.recordDuelResult('player');
    c.chooseFirstPlayer('opponent','opponent');c.prepareNextDuel();c.recordDuelResult('opponent');
    c.chooseFirstPlayer('player','opponent');assert.equal(c.prepareNextDuel().launch.gameNumber,4);
    assert.equal(c.recordDuelResult('player').winnerId,'player');
    assert.throws(()=>c.recordDuelResult('opponent'),/active/i);
    assert.equal(MatchController.deserialize(c.serialize(),{engineOptions:fixture.options}).getViewModel().winnerId,'player');
  });
  run('rejected-opening-choice-does-not-mutate-match', () => {
    const c=create();const before=c.serialize();
    assert.throws(()=>c.startMatch({...config(),initialDecisionPlayerId:'intruder'}),/initialDecisionPlayerId/);
    assert.equal(c.serialize(),before);
  });
  run('rematch-restores-original-decks-and-needs-fresh-opening-choice', () => {
    const c=create();const initial=config();initial.decks.player.sideDeck=[fixture.card(59755122)];
    c.startMatch(initial);assert.throws(()=>c.rematch({firstPlayerId:'player',initialDecisionPlayerId:'opponent'}),/completed/);
    c.recordDuelResult('opponent');const d=c.engine.getActiveDeck('player');
    [d.mainDeck[0],d.sideDeck[0]]=[d.sideDeck[0],d.mainDeck[0]];
    c.stageSideDeck('player',d);c.chooseFirstPlayer('player','opponent');c.prepareNextDuel();c.recordDuelResult('opponent');
    const before=c.serialize();assert.throws(()=>c.rematch(),/fresh/);assert.equal(c.serialize(),before);
    const view=c.rematch({firstPlayerId:'opponent',initialDecisionPlayerId:'player'});
    assert.deepEqual(view.scores,{player:0,opponent:0});assert.equal(view.gameNumber,1);
    assert.equal(c.getDuelLaunchConfig().decks.player.mainDeck[0].id,initial.decks.player.mainDeck[0].id);
    assert.equal(c.getDuelLaunchConfig().decks.player.sideDeck[0].id,'59755122');
    assert.equal(view.currentDuel.decisionPlayerId,'player');assert.equal(view.currentDuel.firstPlayerId,'opponent');
  });
  for (const betweenDuels of [false,true]) run(`swiss-time-double-loss-${betweenDuels?'between-duels':'active-duel'}-roundtrip`, () => {
    const c=create();c.startMatch({...config(),tournamentPolicy:'TCG_EU_SWISS',timeLimitMinutes:50});
    if(betweenDuels)c.recordDuelResult('player');
    const gamesBefore=c.engine.getMatchState().games;
    const view=c.endMatchAtTime();assert.equal(view.status,'complete');assert.equal(view.isDoubleLoss,true);
    assert.equal(view.isDrawnMatch,false);assert.equal(view.winnerId,null);
    assert.deepEqual(c.engine.getMatchState().games,gamesBefore);
    assert.equal(view.currentDuel.interrupted===true,!betweenDuels);
    const restored=MatchController.deserialize(c.serialize(),{engineOptions:fixture.options});
    assert.deepEqual(restored.getViewModel(),view);assert.throws(()=>restored.prepareNextDuel(),/between Duels/);
    assert.throws(()=>restored.endMatchAtTime(),/unfinished/);
  });
  run('untimed-match-and-completed-result-cannot-be-overwritten-by-clock',()=>{
    const c=create();c.startMatch(config());assert.throws(()=>c.endMatchAtTime(),/explicit/);
    c.recordDuelResult('player');c.chooseFirstPlayer('opponent','player');c.prepareNextDuel();c.recordDuelResult('player');
    const before=c.serialize();assert.throws(()=>c.endMatchAtTime(),/explicit/);assert.equal(c.serialize(),before);
    assert.throws(()=>create().startMatch({...config(),tournamentPolicy:'TCG_EU_SWISS',timeLimitMinutes:45}),/50-minute/);
  });
  run('strict-restore-keeps-trusted-regional-resolver',()=>{
    const c=create();c.startMatch(config());c.recordDuelResult('player');const before=c.serialize();
    const bad=JSON.parse(before);bad.engine.state.registeredDecks.player.mainDeck[0]=fixture.card(64865);
    bad.engine.state.activeDecks.player.mainDeck[0]=fixture.card(64865);
    assert.throws(()=>c.restore(bad),/registered deck.*invalid/);assert.equal(c.serialize(),before);
  });
  run('unknown-format-and-banlist-do-not-silently-become-unlimited',()=>{
    const e=new MatchEngine();const d=fixture.legalDeck();
    assert.equal(e.validateDeck(d,'MADE_UP').valid,false);
    assert.equal(e.validateDeck(d,'TCG_ADVANCED','MADE_UP').valid,false);
  });
  run('permanent-name-and-alternate-art-mixed-side-limits',()=>{
    const e=new MatchEngine(fixture.options);
    for(const ids of [[76812113,80316585,27927359,54415063],[22702055,295517,34103656,2819435]]) {
      const d=fixture.legalDeck();d.mainDeck[0]=fixture.card(ids[0]);d.sideDeck=ids.slice(1).map(fixture.card);
      const result=e.validateDeck(d);const identity=fixture.policy.getCopyIdentity(d.mainDeck[0]);
      const issue=result.issues.find(i=>i.code==='COPY_LIMIT_EXCEEDED'&&i.cardId===identity);
      assert.equal(issue.allowed,3);assert.equal(issue.found,4);
      assert.equal(validateCustomDeck(d,'strict',fixture.options).valid,false);
    }
    const d=fixture.withCopies(fixture.card(83764718),1);
    d.sideDeck=[{...fixture.card(83764718),id:'83764719',nativeAlias:89943723,name:'Forged unrestricted name'}];
    const issue=e.validateDeck(d).issues.find(i=>i.code==='COPY_LIMIT_EXCEEDED'&&i.cardId==='83764718');
    assert.equal(issue.allowed,1);assert.equal(issue.found,2);
  });
  run('delayed-september-unlimited-changes-are-date-aware',()=>{
    const datedOptions={...fixture.options,...createTcgFormatPolicy(fixture.resources,{asOf:'2026-09-27'})};
    for(const code of [96782886,17412721]){
      assert.equal(getTcgAdvancedRestriction(code,{asOf:'2026-09-27'}).copyLimit,0);
      assert.equal(getTcgAdvancedRestriction(code,{asOf:'2026-09-28'}).copyLimit,3);
      assert.equal(new MatchEngine(datedOptions).validateDeck(fixture.withCopies(fixture.card(code),1)).valid,false);
      assert.equal(canAddDeckBuilderCard(fixture.legalDeck(),fixture.card(code),'sideDeck','strict',datedOptions).allowed,false);
    }
  });
  run('builder-complete-catalogue-strict-and-free-modes-differ-correctly',()=>{
    const pot=fixture.card(55144522);const deck=fixture.legalDeck();
    assert.equal(canAddDeckBuilderCard(deck,pot,'mainDeck','strict',fixture.options).allowed,false);
    assert.equal(canAddDeckBuilderCard(deck,pot,'mainDeck','native',fixture.options).allowed,true);
    const neos=fixture.card(89943723);
    assert.equal(canAddDeckBuilderCard(deck,neos,'sideDeck','strict',fixture.options).allowed,true);
    assert.equal(validateCustomDeck(deck,'strict',fixture.options).valid,true);
    for(const id of [64865,131313131]){
      const card=fixture.card(id);assert.ok(card);
      assert.equal(canAddDeckBuilderCard(deck,card,'sideDeck','strict',fixture.options).allowed,false);
      assert.equal(canAddDeckBuilderCard(deck,card,'sideDeck','native',fixture.options).allowed,true);
    }
  });
  return cases;
}

export const officialFormatRows = TCG_ADVANCED_BANLIST_ENTRIES;
