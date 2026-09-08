import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../src/cards.js';
import { CardState } from '../src/core/CardState.js';
import { SummonEngine } from '../src/core/SummonEngine.js';
import { MatchEngine } from '../src/core/MatchEngine.js';
import { DuelGame } from '../src/game.js';
import {
  SOLO_CAMPAIGN_VERSION, SOLO_CHAPTERS, SOLO_MISSIONS,
  getMission, buildMissionDecks, createCampaignProgress,
  validateCampaignProgress, normalizeCampaignProgress, getMissionStatus,
  recordMissionResult
} from '../src/content/SoloCampaign.js';

const allCards = new Map([...STARTER_CARDS, ...EXTRA_DECK_CARDS].map(card => [String(card.id), card]));
let serial = 0;
function runtime(id, location = 'monster_zone') {
  const card = new CardState({ ...allCards.get(id), uid: `campaign-test-${++serial}` });
  card.ownerId = 'player';
  card.controllerId = 'player';
  card.location = location;
  card.position = 'attack';
  card.isSetFaceDown = false;
  return card;
}

function material(missionId, id, location = 'monster_zone') {
  assert.ok(getMission(missionId).playerDeck.includes(id), `Material ${id} belongs to ${missionId}`);
  return runtime(id, location);
}

function extra(missionId, id) {
  assert.ok(getMission(missionId).playerExtraDeck.includes(id), `Extra ${id} belongs to ${missionId}`);
  return runtime(id, 'extra_deck');
}

function unlockBefore(id) {
  let progress = createCampaignProgress();
  for (const mission of SOLO_MISSIONS) {
    if (mission.id === id) return progress;
    progress = recordMissionResult(progress, mission.id, 'player', { resultId: `unlock-${mission.id}` }).progress;
  }
  return progress;
}

for (const mission of SOLO_MISSIONS) {
  test(`${mission.id}: both concrete decks pass actual strict and match registration`, () => {
    const decks = buildMissionDecks(mission.id);
    const game = new DuelGame({}, { rulesMode: 'strict', aiDifficulty: mission.aiDifficulty });
    for (const [side, deck] of Object.entries(decks)) {
      assert.equal(deck.mainDeck.length, 40, side);
      assert.ok(deck.extraDeck.length <= 15);
      assert.deepEqual(deck.sideDeck, []);
      const strict = game.validateDeckForCurrentMode(deck.mainDeck, deck.extraDeck);
      assert.equal(strict.valid, true, JSON.stringify(strict.issues));
      const registered = new MatchEngine().validateDeck(deck);
      assert.equal(registered.valid, true, JSON.stringify(registered.issues));
      assert.equal(deck.mainDeck.filter(card => String(card.id) === '83764718').length, 1);
      assert.equal(deck.mainDeck.some(card => String(card.id) === '55144522'), false);
      assert.ok([...deck.mainDeck, ...deck.extraDeck].every(card => allCards.has(String(card.id))));
    }
    assert.equal(game.getAIDecisionProfile().level, mission.aiDifficulty);
    assert.equal(mission.rulesMode, 'strict');
    assert.equal(mission.mode, 'duel');
    assert.ok(['player', 'opponent'].includes(mission.firstPlayerId));
  });
}

test('twelve immutable missions have distinct player and opponent constructions across three chapters', () => {
  assert.equal(SOLO_MISSIONS.length, 12);
  assert.equal(SOLO_CHAPTERS.length, 3);
  for (const chapter of SOLO_CHAPTERS) {
    assert.equal(SOLO_MISSIONS.filter(mission => mission.chapterId === chapter.id).length, 4);
  }
  for (const key of ['playerDeck', 'opponentDeck']) {
    assert.equal(new Set(SOLO_MISSIONS.map(mission => [...mission[key]].sort().join(','))).size, 12);
  }
  assert.ok(Object.isFrozen(SOLO_MISSIONS));
  assert.ok(Object.isFrozen(SOLO_MISSIONS[0]));
  assert.ok(Object.isFrozen(SOLO_MISSIONS[0].objectives[0]));
  assert.ok(Object.isFrozen(SOLO_MISSIONS[0].playerDeck));
  assert.throws(() => SOLO_MISSIONS[0].playerDeck.push('unknown'), TypeError);
  assert.equal(getMission('unknown'), null);
  assert.equal(buildMissionDecks('unknown'), null);
  assert.equal(getMissionStatus(null, 'unknown'), null);
});

test('building a mission never freezes or shares the mutable card instances handed to either duel side', () => {
  const first = buildMissionDecks('first-formation');
  const second = buildMissionDecks('first-formation');
  assert.notEqual(first.player.mainDeck[0], first.player.mainDeck[1]);
  assert.notEqual(first.player.mainDeck[0], second.player.mainDeck[0]);
  const canonicalId = first.player.mainDeck[0].id;
  first.player.mainDeck[0].name = 'modified by runtime';
  first.player.mainDeck.splice(0, 10);
  assert.equal(second.player.mainDeck.length, 40);
  assert.notEqual(second.player.mainDeck[0].name, 'modified by runtime');
  assert.notEqual(allCards.get(String(canonicalId)).name, 'modified by runtime');
});

test('basic formation, defense and Tribute missions carry the corresponding resources', () => {
  const summons = new SummonEngine();
  const first = buildMissionDecks('first-formation').player.mainDeck;
  assert.ok(first.filter(card => card.card_type === 'monster' && card.level <= 4).length >= 30);
  assert.ok(first.filter(card => card.card_type === 'monster').every(card => summons.canUseNormalSummonProcedure(new CardState(card))));
  const defense = buildMissionDecks('hold-the-line').player.mainDeck;
  assert.ok(defense.filter(card => card.card_type === 'monster' && card.def >= 2000 && card.level <= 4).length >= 6);
  const tribute = buildMissionDecks('tribute-investment').player.mainDeck;
  assert.ok(tribute.some(card => card.level === 6));
  assert.ok(tribute.some(card => card.level >= 7));
  assert.ok(tribute.filter(card => card.card_type === 'monster' && card.level <= 4).length >= 15);
});

test('easy defense opponent has no Trap cards that its AI profile would leave dead in hand', () => {
  const mission = getMission('hold-the-line');
  const opponent = buildMissionDecks(mission.id).opponent.mainDeck;
  const profile = new DuelGame({}, { aiDifficulty: mission.aiDifficulty }).getAIDecisionProfile();
  assert.equal(profile.setsTraps, false);
  assert.equal(opponent.filter(card => card.card_type === 'trap').length, 0);
  assert.ok(opponent.filter(card => card.card_type === 'monster' && card.level <= 4).length >= 24);
});

test('each selected field has compatible monsters and the opposing field plan is different', () => {
  const mission = buildMissionDecks('terrain-reading');
  const supportedRaces = {
    '59197169': ['Fiend', 'Spellcaster'],
    '87430998': ['Insect', 'Beast', 'Plant', 'Beast-Warrior'],
    '50913601': ['Dragon', 'Winged Beast', 'Thunder'],
    '86318356': ['Warrior', 'Beast-Warrior'],
    '23424603': ['Dinosaur', 'Zombie', 'Rock']
  };
  for (const deck of Object.values(mission)) {
    for (const field of deck.mainDeck.filter(card => supportedRaces[String(card.id)])) {
      assert.ok(deck.mainDeck.some(card => supportedRaces[String(field.id)].includes(card.race)));
    }
  }
  const playerFields = mission.player.mainDeck.filter(card => supportedRaces[String(card.id)]).map(card => card.id);
  const opponentFields = mission.opponent.mainDeck.filter(card => supportedRaces[String(card.id)]).map(card => card.id);
  assert.equal(playerFields.some(id => opponentFields.includes(id)), false);
});

test('Fusion expert mission preserves the only strict local recipe without pretending it needs two materials', () => {
  const id = 'three-dragons';
  const game = new DuelGame();
  game.playerHand = [0, 1, 2].map(() => material(id, '89631139', 'hand'));
  game.playerHand.push(material(id, '24094653', 'hand'));
  game.playerExtraDeck = [extra(id, '23995346')];
  const options = game.getFusionOptions('player');
  assert.equal(options.length, 1);
  assert.equal(options[0].materials.length, 3);
  assert.deepEqual(options[0].card.fusionMaterials, ['89631139', '89631139', '89631139']);
  assert.equal(new Set(options[0].materials.map(item => item.card?.uid || item.uid)).size, 3);
  assert.match(getMission(id).title, /expert/i);
  assert.match(getMission(id).briefing, /trois Dragons Blancs/);
  assert.equal(buildMissionDecks(id).player.mainDeck.some(card => String(card.id) === '12580477'), false);
  assert.equal(buildMissionDecks(id).opponent.mainDeck.some(card => ['12580477', '44095762', '04206964'].includes(String(card.id))), false);
});

test('both documented Synchro recipes pass actual level and non-Tuner race validation', () => {
  const id = 'synchronization';
  const summons = new SummonEngine();
  const arcanite = extra(id, '31924889');
  const stardust = extra(id, '44508094');
  assert.equal(summons.validateSynchroSummon([
    material(id, '63977008'), material(id, '15025844')
  ], 7, arcanite, { controllerId: 'player' }), true);
  assert.equal(summons.validateSynchroSummon([
    material(id, '63977008'), material(id, '88819587'), material(id, '71625222')
  ], 8, stardust, { controllerId: 'player' }), true);
  assert.equal(summons.validateSynchroSummon([
    material(id, '63977008'), material(id, '91152256')
  ], 7, arcanite, { controllerId: 'player' }), false, 'an arbitrary Level 4 cannot replace Arcanite’s Spellcaster material');
});

test('Xyz and Link missions have real material plans, including normal monsters for LAN', () => {
  const summons = new SummonEngine();
  assert.equal(summons.validateXyzSummon([
    material('rank-four', '14898066'), material('rank-four', '97590747')
  ], extra('rank-four', '84013237'), { controllerId: 'player' }), true);
  assert.equal(summons.validateLinkSummon([
    material('link-exchange', '88819587'), material('link-exchange', '14898066')
  ], extra('link-exchange', '77637979'), { controllerId: 'player' }), true);
});

test('Link mission uses useful player bodies and removes the opponent mass wipe', () => {
  const { player, opponent } = buildMissionDecks('link-exchange');
  for (const id of ['14898066', '97590747', '05053103']) {
    assert.equal(player.mainDeck.filter(card => String(card.id) === id).length, 3);
  }
  assert.equal(opponent.mainDeck.filter(card => String(card.id) === '12580477').length, 0);
  const averageMonsterAtk = deck => {
    const monsters = deck.mainDeck.filter(card => card.card_type === 'monster');
    return monsters.reduce((sum, card) => sum + card.atk, 0) / monsters.length;
  };
  assert.ok(averageMonsterAtk(player) >= 1300);
  assert.ok(averageMonsterAtk(opponent) - averageMonsterAtk(player) <= 200);
});

test('Ritual mission supports the exact two-Level-4 hand sacrifice recipe in the real solver', () => {
  const id = 'ritual-balance';
  const game = new DuelGame();
  game.playerHand = ['05405694', '55761792', '14898066', '15025844'].map(cardId => material(id, cardId, 'hand'));
  const [monster, spell, ...materials] = game.playerHand;
  assert.equal(game.summons.validateRitualSummon(monster, spell, materials, { controllerId: 'player' }), true);
  assert.ok(game.getRitualOptions('player', spell).length > 0);
});

test('Pendulum mission’s actual Magician scales admit its Level 4 monsters together', () => {
  const id = 'pendulum-window';
  const left = material(id, '20409757', 'pendulum_zone');
  const right = material(id, '94415058', 'pendulum_zone');
  left.isPendulumScale = true;
  right.isPendulumScale = true;
  const summons = new SummonEngine();
  const plan = summons.createPendulumSummonPlan(left, right, [
    material(id, '14898066', 'hand'), material(id, '15025844', 'hand')
  ], { controllerId: 'player', availableMainMonsterZones: 5 });
  assert.equal(plan.valid, true, plan.reason);
  assert.equal(plan.fromHand.length, 2);
});

test('synthesis mission supports at least three distinct actual Extra Deck procedures', () => {
  const id = 'adaptive-finale';
  const summons = new SummonEngine();
  assert.equal(summons.validateSynchroSummon([
    material(id, '63977008'), material(id, '15025844')
  ], 7, extra(id, '31924889')), true);
  assert.equal(summons.validateXyzSummon([
    material(id, '14898066'), material(id, '48305365')
  ], extra(id, '84013237')), true);
  assert.equal(summons.validateLinkSummon([
    material(id, '88819587'), material(id, '40640057')
  ], extra(id, '77637979')), true);
});

test('initial progress exposes only the first mission and a win unlocks exactly its successor', () => {
  const progress = createCampaignProgress();
  assert.equal(progress.version, SOLO_CAMPAIGN_VERSION);
  assert.deepEqual(SOLO_MISSIONS.filter(m => getMissionStatus(progress, m.id).unlocked).map(m => m.id), ['first-formation']);
  const result = recordMissionResult(progress, 'first-formation', 'player', { resultId: 'first-win' });
  assert.equal(result.accepted, true);
  assert.equal(result.earnedMedal, 1);
  assert.deepEqual(result.newlyUnlocked, ['hold-the-line']);
  assert.equal(getMissionStatus(result.progress, 'hold-the-line').unlocked, true);
  assert.equal(getMissionStatus(result.progress, 'tribute-investment').unlocked, false);
  assert.equal(progress.missions['first-formation'].attempts, 0, 'pure reducer never mutates input');
});

test('losses and draws record attempts but no medal, best result, or progression', () => {
  let progress = createCampaignProgress();
  for (const [i, outcome] of ['opponent', 'draw', 'loss'].entries()) {
    const result = recordMissionResult(progress, 'first-formation', outcome, { resultId: `not-win-${i}`, normalSummons: 9, playerLP: 8000 });
    assert.equal(result.earnedMedal, 0);
    assert.deepEqual(result.newlyUnlocked, []);
    progress = result.progress;
  }
  assert.deepEqual(progress.missions['first-formation'], { attempts: 3, wins: 0, bestMedal: 0, bestPlayerLP: 0, bestTurnCount: null });
});

test('result IDs are idempotent across repeated game-over callbacks and different missions', () => {
  const first = recordMissionResult(null, 'first-formation', 'win', { resultId: 'duel:stable', normalSummons: 2, playerLP: 8000, turnCount: 6 });
  for (const missionId of ['first-formation', 'hold-the-line']) {
    const duplicate = recordMissionResult(first.progress, missionId, 'player', { resultId: 'duel:stable', normalSummons: 999 });
    assert.equal(duplicate.accepted, false);
    assert.equal(duplicate.duplicate, true);
    assert.deepEqual(duplicate.progress, first.progress);
  }
});

test('medals require the technical objective before mastery and can only improve', () => {
  const before = createCampaignProgress();
  let result = recordMissionResult(before, 'first-formation', 'player', { resultId: 'mastery-alone', playerLP: 8000, turnCount: 8 });
  assert.equal(result.earnedMedal, 1);
  result = recordMissionResult(result.progress, 'first-formation', 'player', { resultId: 'technical', normalSummons: 2, playerLP: 5000, turnCount: 9 });
  assert.equal(result.earnedMedal, 2);
  result = recordMissionResult(result.progress, 'first-formation', 'player', { resultId: 'both', normalSummons: 2, playerLP: 6000, turnCount: 7 });
  assert.equal(result.earnedMedal, 3);
  result = recordMissionResult(result.progress, 'first-formation', 'player', { resultId: 'replay', playerLP: 1000, turnCount: 20 });
  assert.equal(result.earnedMedal, 1);
  assert.equal(result.bestMedal, 3);
  assert.equal(result.progress.missions['first-formation'].bestPlayerLP, 8000);
  assert.equal(result.progress.missions['first-formation'].bestTurnCount, 7);
  assert.deepEqual(result.newlyUnlocked, []);
});

test('mastery goals use LP, tempo and damage ceilings instead of twelve duplicate LP checks', () => {
  const stats = new Set(SOLO_MISSIONS.map(mission => mission.objectives[1].stat));
  assert.deepEqual([...stats].sort(), ['damageTaken', 'playerLP', 'turnCount']);
  assert.ok(SOLO_MISSIONS.filter(mission => mission.objectives[1].comparison === 'at-most').length >= 6);

  const progress = unlockBefore('tribute-investment');
  const onTime = recordMissionResult(progress, 'tribute-investment', 'player', {
    resultId: 'tribute-on-time', tributeSummons: 1, turnCount: 12
  });
  assert.equal(onTime.earnedMedal, 3);
  const tooLate = recordMissionResult(progress, 'tribute-investment', 'player', {
    resultId: 'tribute-too-late', tributeSummons: 1, turnCount: 13
  });
  assert.equal(tooLate.earnedMedal, 2);
  const missingTimingProof = recordMissionResult(progress, 'tribute-investment', 'player', {
    resultId: 'tribute-no-time', tributeSummons: 1
  });
  assert.equal(missingTimingProof.earnedMedal, 2);
});

test('twelve wins can finish the campaign without requiring bonus objectives or a lucky draw', () => {
  let progress = createCampaignProgress();
  for (const mission of SOLO_MISSIONS) {
    const result = recordMissionResult(progress, mission.id, 'player', { resultId: `complete-${mission.id}` });
    assert.equal(result.accepted, true);
    assert.equal(result.earnedMedal, 1);
    progress = result.progress;
  }
  assert.ok(SOLO_MISSIONS.every(mission => getMissionStatus(progress, mission.id).completed));
  assert.equal(validateCampaignProgress(progress).valid, true);
  assert.deepEqual(normalizeCampaignProgress(JSON.stringify(progress)), progress);
});

test('resistance medals reward preventing damage and finishing, never taking damage deliberately', () => {
  const progress = unlockBefore('measured-resistance');
  const defended = recordMissionResult(progress, 'measured-resistance', 'player', {
    resultId: 'survival-defended', damageTaken: 2000, turnCount: 14
  });
  assert.equal(defended.earnedMedal, 3);
  const excessiveDamage = recordMissionResult(progress, 'measured-resistance', 'player', {
    resultId: 'survival-heavy-damage', damageTaken: 3000, turnCount: 10
  });
  assert.equal(excessiveDamage.earnedMedal, 1);
  const missingDamageProof = recordMissionResult(progress, 'measured-resistance', 'player', {
    resultId: 'survival-no-proof', turnCount: 10
  });
  assert.equal(missingDamageProof.earnedMedal, 1);
});

test('final objective counts distinct supported Extra procedures, not duplicates or Pendulum', () => {
  const progress = unlockBefore('adaptive-finale');
  const mission = getMission('adaptive-finale');
  assert.doesNotMatch(mission.objectives[0].label, /Fusion/);
  assert.deepEqual(mission.objectives[0].allowedValues, ['synchro', 'xyz', 'link']);
  const invalid = recordMissionResult(progress, 'adaptive-finale', 'player', { resultId: 'one-type', extraSummonTypes: ['xyz', 'xyz', 'pendulum', 'invented'], playerLP: 8000 });
  assert.equal(invalid.earnedMedal, 1);
  const unavailableFusion = recordMissionResult(progress, 'adaptive-finale', 'player', { resultId: 'fusion-is-not-in-this-deck', extraSummonTypes: ['fusion', 'xyz'], playerLP: 8000 });
  assert.equal(unavailableFusion.earnedMedal, 1);
  const valid = recordMissionResult(progress, 'adaptive-finale', 'player', { resultId: 'two-types', extraSummonTypes: ['synchro', 'xyz', 'xyz'], playerLP: 4000 });
  assert.equal(valid.earnedMedal, 3);
  assert.deepEqual(valid.newlyUnlocked, []);
});

test('invalid or locked results are rejected without side effects', () => {
  const progress = createCampaignProgress();
  const cases = [
    ['unknown', 'player', { resultId: 'unknown' }, 'unknown-mission'],
    ['hold-the-line', 'player', { resultId: 'locked' }, 'mission-locked'],
    ['first-formation', 'other', { resultId: 'invalid-outcome' }, 'invalid-outcome'],
    ['first-formation', 'player', {}, 'invalid-result-id'],
    ['first-formation', 'player', { resultId: '../unsafe' }, 'invalid-result-id']
  ];
  for (const [id, outcome, stats, reason] of cases) {
    const result = recordMissionResult(progress, id, outcome, stats);
    assert.equal(result.accepted, false);
    assert.equal(result.reason, reason);
    assert.deepEqual(result.progress, progress);
  }
});

test('non-numeric, fractional and non-finite statistics do not award technical medals', () => {
  for (const value of ['2', 2.5, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    const result = recordMissionResult(null, 'first-formation', 'player', { resultId: 'bad-stat', normalSummons: value, playerLP: 8000 });
    assert.equal(result.earnedMedal, 1);
  }
});

test('malformed, oversized and unsupported saves normalize to safe fresh progress', () => {
  const cases = ['{bad', 'x'.repeat(1_500_001), { version: 999 }, [], new Date(), { version: 1, missions: [], processedResultIds: [] }];
  for (const raw of cases) {
    const result = validateCampaignProgress(raw);
    assert.equal(result.valid, false);
    assert.deepEqual(result.progress, createCampaignProgress());
  }
});

test('save normalization repairs inconsistent counters, forged locked entries and duplicate IDs', () => {
  const raw = createCampaignProgress();
  raw.missions['first-formation'] = { attempts: 2, wins: 0, bestMedal: 3, bestPlayerLP: 8000, bestTurnCount: 4 };
  raw.missions['hold-the-line'] = { attempts: 1, wins: 1, bestMedal: 3, bestPlayerLP: 8000, bestTurnCount: 4 };
  raw.processedResultIds = ['safe:1', 'safe:1', 2, '../invalid'];
  const result = validateCampaignProgress(raw);
  assert.equal(result.valid, false);
  assert.equal(result.progress.missions['first-formation'].bestMedal, 0);
  assert.equal(result.progress.missions['hold-the-line'].attempts, 0);
  assert.deepEqual(result.progress.processedResultIds, ['safe:1']);
  assert.ok(result.issues.includes('locked-entry:hold-the-line'));
  assert.equal(raw.missions['first-formation'].bestMedal, 3, 'validation must not modify the input');
});

test('result history remains bounded without evicting IDs and allowing duplicate reward farming', () => {
  const progress = createCampaignProgress();
  progress.processedResultIds = Array.from({ length: 8192 }, (_, index) => `old-${index}`);
  const result = recordMissionResult(progress, 'first-formation', 'player', { resultId: 'new' });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'result-history-full');
  assert.deepEqual(result.progress, progress);
  assert.equal(recordMissionResult(progress, 'first-formation', 'player', { resultId: 'old-0' }).duplicate, true);
});
