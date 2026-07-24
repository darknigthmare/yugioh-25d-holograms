import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getCardById, normalizeCardData } from '../src/api.js';
import { createCardDOM, createMonsterHologramDOM } from '../src/board.js';
import { CardState } from '../src/core/CardState.js';
import { ChainEngine } from '../src/core/ChainEngine.js';
import { MatchEngine } from '../src/core/MatchEngine.js';
import { DuelGame } from '../src/game.js';

const POT_OF_GREED_ID = '55144522';
const MONSTER_REBORN_ID = '83764718';
const MIRROR_FORCE_ID = '44095762';

function createCard(overrides = {}) {
  return new CardState({
    uid: `test-${Math.random().toString(36).slice(2)}`,
    id: '10000000',
    name: 'Test Monster',
    name_en: 'Test Monster',
    card_type: 'monster',
    type: 'Normal Monster',
    desc: '',
    atk: 1500,
    def: 1200,
    level: 4,
    race: 'Warrior',
    attribute: 'EARTH',
    ...overrides
  });
}

function createRegisteredCard(id, name, overrides = {}) {
  return {
    id,
    name,
    belongsInExtraDeck: false,
    ...overrides
  };
}

function createLegalSizedDeck(specialCards) {
  const mainDeck = [...specialCards];
  while (mainDeck.length < 40) {
    const index = mainDeck.length;
    mainDeck.push(createRegisteredCard(`filler-${index}`, `Filler ${index}`));
  }
  return {
    mainDeck,
    extraDeck: [],
    sideDeck: []
  };
}

async function withImmediateTimers(action) {
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = callback => {
    callback();
    return 0;
  };

  try {
    return await action();
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
}

function parsePremadeMainDecks() {
  const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
  const premadeBlock = source.match(/const PREMADE_DECKS\s*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(premadeBlock, 'PREMADE_DECKS must remain inspectable for legality checks');

  const decks = [];
  const deckPattern = /(\w+)\s*:\s*\{\s*main\s*:\s*\[([\s\S]*?)\]\s*,\s*extra\s*:/g;
  for (const match of premadeBlock[1].matchAll(deckPattern)) {
    const ids = [...match[2].matchAll(/['"](\d{7,8})['"]/g)].map(idMatch => idMatch[1]);
    decks.push({ name: match[1], ids });
  }
  return decks;
}

function countById(ids) {
  return ids.reduce((counts, id) => {
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {});
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.className = '';
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.innerHTML = '';
    this.draggable = false;
    this.tabIndex = 0;
    this.classList = {
      add: () => {},
      remove: () => {}
    };
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    this.children.push(...children);
  }

  addEventListener() {}
}

function serializeFakeElement(element) {
  return JSON.stringify({
    className: element.className,
    dataset: element.dataset,
    style: element.style,
    attributes: element.attributes,
    innerHTML: element.innerHTML,
    children: element.children.map(serializeFakeElement)
  });
}

test('the current TCG banlist forbids Pot of Greed, limits Monster Reborn, and permits Mirror Force', () => {
  const match = new MatchEngine();

  const potDeck = createLegalSizedDeck([
    createRegisteredCard(POT_OF_GREED_ID, 'Pot of Greed')
  ]);
  const rebornDeck = createLegalSizedDeck([
    createRegisteredCard(MONSTER_REBORN_ID, 'Monster Reborn'),
    createRegisteredCard(MONSTER_REBORN_ID, 'Monster Reborn')
  ]);
  const mirrorDeck = createLegalSizedDeck([
    createRegisteredCard(MIRROR_FORCE_ID, 'Mirror Force'),
    createRegisteredCard(MIRROR_FORCE_ID, 'Mirror Force'),
    createRegisteredCard(MIRROR_FORCE_ID, 'Mirror Force')
  ]);

  assert.equal(match.validateDeck(potDeck).valid, false);
  assert.equal(match.validateDeck(rebornDeck).valid, false);
  assert.equal(match.validateDeck(mirrorDeck).valid, true);
});

test('API normalization classifies Fusion, Link, and Ritual monsters without making them Normal Summonable', () => {
  const fusion = normalizeCardData({
    id: 1,
    name: 'API Fusion',
    type: 'Fusion Monster',
    level: 8,
    atk: 2800,
    def: 2400
  });
  const link = normalizeCardData({
    id: 2,
    name: 'API Link',
    type: 'Link Monster',
    atk: 2300,
    linkval: 3,
    linkmarkers: ['Top', 'Bottom-Left', 'Bottom-Right']
  });
  const ritual = normalizeCardData({
    id: 3,
    name: 'API Ritual',
    type: 'Ritual Effect Monster',
    level: 7,
    atk: 2500,
    def: 2000
  });

  assert.equal(fusion.extra_type, 'fusion');
  assert.equal(fusion.belongsInExtraDeck, true);
  assert.equal(fusion.normalSummonAllowed, false);
  assert.equal(fusion.supportedInStrict, false);

  assert.equal(link.extra_type, 'link');
  assert.equal(link.belongsInExtraDeck, true);
  assert.equal(link.normalSummonAllowed, false);
  assert.equal(link.def, null);
  assert.equal(link.level, 0);
  assert.equal(link.linkRating, 3);
  assert.deepEqual(link.linkMarkers, ['Top', 'Bottom-Left', 'Bottom-Right']);

  assert.equal(ritual.extra_type, null);
  assert.equal(ritual.belongsInExtraDeck, false);
  assert.equal(ritual.isRitualMonster, true);
  assert.equal(ritual.normalSummonAllowed, false);
  assert.equal(ritual.supportedInStrict, false);
});

test('exact-card lookup rejects invalid ids without issuing a network request', async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('network must not be used for an invalid id');
  };

  try {
    assert.equal(await getCardById('not-a-card-id'), null);
    assert.equal(await getCardById('../123'), null);
    assert.equal(await getCardById(''), null);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('all premade decks meet Main Deck size, copy-limit, and current banlist rules', () => {
  const decks = parsePremadeMainDecks();
  assert.ok(decks.length >= 3, 'expected the Kaiba, Yugi, and Joey presets');

  for (const deck of decks) {
    const counts = countById(deck.ids);
    assert.ok(
      deck.ids.length >= 40 && deck.ids.length <= 60,
      `${deck.name}: Main Deck must contain 40 to 60 cards`
    );
    assert.equal(counts[POT_OF_GREED_ID] || 0, 0, `${deck.name}: Pot of Greed is forbidden`);
    assert.ok(
      (counts[MONSTER_REBORN_ID] || 0) <= 1,
      `${deck.name}: Monster Reborn is limited to one copy`
    );
    for (const [id, count] of Object.entries(counts)) {
      assert.ok(count <= 3, `${deck.name}: ${id} appears ${count} times`);
    }
  }
});

test('strict mode rejects unsupported Extra Deck and Ritual cards from sandbox search', () => {
  const game = new DuelGame({}, { rulesMode: 'strict' });
  const synchro = createCard({
    id: '44508094',
    name: 'Stardust Dragon',
    type: 'Synchro Monster',
    extra_type: 'synchro',
    level: 8
  });
  const ritual = createCard({
    id: '00000001',
    name: 'Unsupported Ritual',
    type: 'Ritual Monster',
    extra_type: null,
    level: 4
  });

  assert.equal(game.addCardToHand(synchro), null);
  assert.equal(game.addCardToHand(ritual), null);
  assert.equal(game.playerHand.length, 0);
});

test('sandbox may inspect an Extra Deck card but can never Normal Summon it from the hand', async () => {
  const game = new DuelGame({}, { rulesMode: 'sandbox' });
  game.phases.currentPhase = 'main1';
  const synchro = game.addCardToHand({
    id: '44508094',
    name: 'Stardust Dragon',
    name_en: 'Stardust Dragon',
    card_type: 'monster',
    type: 'Synchro Monster',
    extra_type: 'synchro',
    desc: '',
    atk: 2500,
    def: 2000,
    level: 4
  });

  assert.ok(synchro instanceof CardState);
  assert.equal(await game.summonMonster(synchro.uid, 0), false);
  assert.equal(game.playerHand[0], synchro);
  assert.equal(game.playerMonsters[0], null);
});

test('available-action API exposes only actions legal in the current phase', () => {
  const game = new DuelGame();
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;

  const normalMonster = createCard({
    uid: 'available-normal-monster',
    level: 4
  });
  normalMonster.ownerId = 'player';
  normalMonster.controllerId = 'player';
  normalMonster.location = 'hand';
  const extraMonster = createCard({
    uid: 'unavailable-extra-monster',
    type: 'Synchro Monster',
    extra_type: 'synchro',
    level: 4
  });
  extraMonster.ownerId = 'player';
  extraMonster.controllerId = 'player';
  extraMonster.location = 'hand';
  game.playerHand.push(normalMonster, extraMonster);

  const timeWizard = createCard({
    uid: 'available-time-wizard',
    id: '71625222',
    name: 'Time Wizard',
    type: 'Effect Monster',
    level: 2
  });
  timeWizard.ownerId = 'player';
  timeWizard.controllerId = 'player';
  game.field.setMonsterZone('player', 0, timeWizard);

  const mainActions = game.getAvailableActions('player');
  assert.equal(mainActions.canNormalSummon, true);
  assert.deepEqual(mainActions.normalSummonCardUids, [normalMonster.uid]);
  assert.deepEqual(mainActions.monsterEffects, [{
    zoneIndex: 0,
    cardUid: timeWizard.uid,
    effect: 'time-wizard'
  }]);

  game.phases.currentPhase = 'battle';
  const battleActions = game.getAvailableActions('player');
  assert.equal(battleActions.canNormalSummon, false);
  assert.deepEqual(battleActions.normalSummonCardUids, []);
  assert.deepEqual(battleActions.activatableSpellUids, []);
  assert.deepEqual(battleActions.monsterEffects, []);
});

test('AI difficulty profiles change Main Phase card selection instead of being cosmetic', async () => {
  async function summonedMonsterAtDifficulty(aiDifficulty) {
    const game = new DuelGame({}, { aiDifficulty });
    game.startPhaseFlow = () => {};
    game.phases.currentTurnOwner = 'opponent';
    game.phases.currentPhase = 'main1';
    game.phases.turnCount = 2;
    game.opponentExtraDeck = [];

    const weak = createCard({
      uid: `${aiDifficulty}-weak`,
      name: 'Weak AI Choice',
      atk: 500,
      def: 500,
      level: 4
    });
    const strong = createCard({
      uid: `${aiDifficulty}-strong`,
      name: 'Strong AI Choice',
      atk: 1900,
      def: 1000,
      level: 4
    });
    for (const card of [strong, weak]) {
      card.ownerId = 'opponent';
      card.controllerId = 'opponent';
      card.location = 'hand';
    }
    game.opponentHand.push(strong, weak);

    await withImmediateTimers(() => game.runAIMainPhase());
    return game.opponentMonsters.find(Boolean);
  }

  assert.equal((await summonedMonsterAtDifficulty('easy')).name, 'Weak AI Choice');
  assert.equal((await summonedMonsterAtDifficulty('normal')).name, 'Strong AI Choice');
  assert.equal((await summonedMonsterAtDifficulty('hard')).name, 'Strong AI Choice');
});

test('normal and hard AI profiles can use a legal Synchro line while easy does not', async () => {
  async function attemptAtDifficulty(aiDifficulty) {
    const game = new DuelGame({}, { aiDifficulty });
    game.phases.currentTurnOwner = 'opponent';
    game.phases.currentPhase = 'main1';
    game.phases.turnCount = 2;

    const tuner = createCard({
      uid: `${aiDifficulty}-ai-tuner`,
      type: 'Tuner Monster',
      level: 3,
      race: 'Spellcaster'
    });
    const nonTuner = createCard({
      uid: `${aiDifficulty}-ai-non-tuner`,
      type: 'Effect Monster',
      level: 4,
      race: 'Spellcaster'
    });
    for (const [index, material] of [tuner, nonTuner].entries()) {
      material.ownerId = 'opponent';
      material.controllerId = 'opponent';
      game.field.setMonsterZone('opponent', index, material);
    }
    const arcanite = createCard({
      uid: `${aiDifficulty}-ai-arcanite`,
      id: '31924889',
      name: 'Arcanite Magician',
      type: 'Synchro Monster',
      extra_type: 'synchro',
      belongsInExtraDeck: true,
      level: 7,
      atk: 400,
      def: 1800,
      race: 'Spellcaster'
    });
    arcanite.ownerId = 'opponent';
    arcanite.controllerId = 'opponent';
    arcanite.location = 'extra_deck';
    game.opponentExtraDeck = [arcanite];

    const summoned = await withImmediateTimers(
      () => game.tryAISynchroSummon(game.getAIDecisionProfile())
    );
    return { game, arcanite, summoned };
  }

  const easy = await attemptAtDifficulty('easy');
  assert.equal(easy.summoned, false);
  assert.equal(easy.game.opponentExtraDeck.includes(easy.arcanite), true);

  for (const level of ['normal', 'hard']) {
    const result = await attemptAtDifficulty(level);
    assert.equal(result.summoned, true);
    assert.ok(result.game.opponentMonsters.includes(result.arcanite));
    assert.equal(result.arcanite.summonType, 'synchro');
  }
});

test('hand-limit discard pauses End Phase and moves the explicitly chosen card to the Graveyard', async () => {
  const game = new DuelGame();
  game.startPhaseFlow = () => {};
  game.phases.currentPhase = 'end';
  game.playerHand = Array.from({ length: 7 }, (_, index) => createCard({
    uid: `hand-${index}`,
    name: `Hand ${index}`
  }));

  assert.equal(await game.checkHandSizeLimit(), false);
  assert.equal(game.isDiscarding, true);

  const chosen = game.playerHand[2];
  await withImmediateTimers(() => game.discardCard(chosen.uid));

  assert.equal(game.playerHand.length, 6);
  assert.equal(game.isDiscarding, false);
  assert.ok(game.playerGraveyard.includes(chosen));
  assert.equal(chosen.location, 'graveyard');
});

test('a discard timer from an old duel cannot advance a freshly reset duel', async () => {
  const game = new DuelGame();
  let phaseFlowStarts = 0;
  let scheduledAdvance = null;
  game.startPhaseFlow = () => {
    phaseFlowStarts += 1;
  };
  game.phases.currentPhase = 'end';
  game.playerHand = Array.from({ length: 7 }, (_, index) => createCard({
    uid: `stale-hand-${index}`
  }));

  assert.equal(await game.checkHandSizeLimit(), false);

  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = callback => {
    scheduledAdvance = callback;
    return 42;
  };
  try {
    game.discardCard(game.playerHand[0].uid);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.equal(typeof scheduledAdvance, 'function');
  game.reset();
  scheduledAdvance();

  assert.equal(game.currentTurn, 'player');
  assert.equal(game.currentPhase, 'draw');
  assert.equal(game.turnCount, 1);
  assert.equal(phaseFlowStarts, 0);
});

test('a monster that attacked cannot manually change battle position in Main Phase 2', async () => {
  const game = new DuelGame();
  game.phases.currentPhase = 'main2';
  game.phases.turnCount = 3;
  const attacker = createCard({
    uid: 'already-attacked',
    position: 'attack'
  });
  attacker.ownerId = 'player';
  attacker.controllerId = 'player';
  attacker.turnSummoned = 1;
  attacker.hasAttacked = true;
  game.field.setMonsterZone('player', 0, attacker);
  game.attackedMonsters.add(0);

  await game.toggleMonsterPosition(0);

  assert.equal(attacker.position, 'attack');
  assert.equal(attacker.hasChangedPositionThisTurn, false);
});

test('Fusion Summon cannot consume three Blue-Eyes without Polymerization', async () => {
  const game = new DuelGame();
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  for (let index = 0; index < 3; index += 1) {
    const material = createCard({
      uid: `blue-eyes-${index}`,
      id: '89631139',
      name: 'Blue-Eyes White Dragon',
      atk: 3000,
      def: 2500,
      level: 8,
      race: 'Dragon'
    });
    material.ownerId = 'player';
    material.controllerId = 'player';
    game.field.setMonsterZone('player', index, material);
  }
  const fusion = game.playerExtraDeck.find(card => card.extra_type === 'fusion');
  assert.ok(fusion);

  const summoned = await withImmediateTimers(() => game.summonExtraDeck(fusion.uid));

  assert.equal(summoned, false);
  assert.equal(game.playerMonsters.filter(Boolean).length, 3);
  assert.ok(game.playerExtraDeck.includes(fusion));
});

test('Polymerization performs a legal Fusion Summon with materials from hand and field', async () => {
  const game = new DuelGame();
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;

  const fieldMaterial = createCard({
    uid: 'fusion-field-blue-eyes',
    id: '89631139',
    name: 'Blue-Eyes White Dragon',
    atk: 3000,
    def: 2500,
    level: 8,
    race: 'Dragon'
  });
  fieldMaterial.ownerId = 'player';
  fieldMaterial.controllerId = 'player';
  game.field.setMonsterZone('player', 0, fieldMaterial);

  const handMaterials = [1, 2].map(index => {
    const material = createCard({
      uid: `fusion-hand-blue-eyes-${index}`,
      id: '89631139',
      name: 'Blue-Eyes White Dragon',
      atk: 3000,
      def: 2500,
      level: 8,
      race: 'Dragon'
    });
    material.ownerId = 'player';
    material.controllerId = 'player';
    material.location = 'hand';
    return material;
  });
  const polymerization = createCard({
    uid: 'polymerization',
    id: '24094653',
    name: 'Polymerization',
    card_type: 'spell',
    type: 'Spell Card',
    atk: 0,
    def: 0,
    level: 0
  });
  polymerization.ownerId = 'player';
  polymerization.controllerId = 'player';
  polymerization.location = 'hand';
  game.playerHand.push(...handMaterials, polymerization);

  const fusion = game.playerExtraDeck.find(card => card.extra_type === 'fusion');
  assert.ok(fusion);

  const summoned = await withImmediateTimers(() => game.summonExtraDeck(fusion.uid));

  assert.equal(summoned, true);
  assert.ok(game.playerMonsters.includes(fusion));
  assert.equal(fusion.wasProperlySpecialSummoned, true);
  assert.equal(fusion.summonType, 'fusion');
  assert.ok(game.playerGraveyard.includes(fieldMaterial));
  assert.ok(handMaterials.every(card => game.playerGraveyard.includes(card)));
  assert.ok(game.playerGraveyard.includes(polymerization));
  assert.equal(game.playerHand.length, 0);
});

test('Polymerization may use a face-down monster controlled by its player as Fusion Material', async () => {
  const game = new DuelGame();
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;

  const fieldMaterials = [0, 1, 2].map(index => {
    const material = createCard({
      uid: `face-down-fusion-material-${index}`,
      id: '89631139',
      name: 'Blue-Eyes White Dragon',
      atk: 3000,
      def: 2500,
      level: 8,
      race: 'Dragon'
    });
    material.ownerId = 'player';
    material.controllerId = 'player';
    material.isSetFaceDown = index === 0;
    game.field.setMonsterZone('player', index, material);
    return material;
  });
  const polymerization = createCard({
    uid: 'polymerization-face-down-test',
    id: '24094653',
    name: 'Polymerization',
    card_type: 'spell',
    type: 'Spell Card',
    atk: 0,
    def: 0,
    level: 0
  });
  polymerization.ownerId = 'player';
  polymerization.controllerId = 'player';
  polymerization.location = 'hand';
  game.playerHand.push(polymerization);

  const fusion = game.playerExtraDeck.find(card => card.extra_type === 'fusion');
  assert.equal(await withImmediateTimers(() => game.summonExtraDeck(fusion.uid)), true);
  assert.ok(game.playerMonsters.includes(fusion));
  assert.ok(fieldMaterials.every(card => game.playerGraveyard.includes(card)));
});

test('a legal Arcanite Magician Synchro Summon grants two counters and its effect consumes one chosen target', async () => {
  let targetUid = null;
  const game = new DuelGame({
    onDecision: () => targetUid
  });
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;

  const tuner = createCard({
    uid: 'arcanite-tuner',
    type: 'Tuner Monster',
    level: 3,
    race: 'Spellcaster'
  });
  const nonTuner = createCard({
    uid: 'arcanite-non-tuner',
    type: 'Effect Monster',
    level: 4,
    race: 'Spellcaster'
  });
  for (const [index, material] of [tuner, nonTuner].entries()) {
    material.ownerId = 'player';
    material.controllerId = 'player';
    game.field.setMonsterZone('player', index, material);
  }

  const arcanite = game.playerExtraDeck.find(card => card.id === '31924889');
  assert.ok(arcanite);

  await withImmediateTimers(async () => {
    assert.equal(await game.summonExtraDeck(arcanite.uid), true);
    await game.selectSynchroMaterial(0);
    await game.selectSynchroMaterial(1);
  });

  assert.ok(game.playerMonsters.includes(arcanite));
  assert.equal(arcanite.counters.spell, 2);
  assert.equal(arcanite.getAtk(), 2400);
  assert.equal(arcanite.wasProperlySpecialSummoned, true);
  assert.equal(arcanite.summonType, 'synchro');

  const target = createCard({
    uid: 'arcanite-destruction-target',
    name: 'Chosen Target'
  });
  target.ownerId = 'opponent';
  target.controllerId = 'opponent';
  targetUid = target.uid;
  game.field.setMonsterZone('opponent', 0, target);
  const arcaniteZone = game.playerMonsters.indexOf(arcanite);

  assert.equal(await withImmediateTimers(
    () => game.activateMonsterEffect(arcaniteZone, 'player')
  ), true);
  assert.equal(game.opponentMonsters[0], null);
  assert.ok(game.opponentGraveyard.includes(target));
  assert.equal(arcanite.counters.spell, 1);
  assert.equal(arcanite.getAtk(), 1400);
});

test('Dark Magician Girl gains 300 ATK for each relevant magician in either Graveyard', () => {
  const game = new DuelGame();
  const darkMagicianGirl = createCard({
    uid: 'dark-magician-girl',
    id: '38033121',
    name: 'Dark Magician Girl',
    atk: 2000,
    def: 1700,
    level: 6,
    race: 'Spellcaster',
    type: 'Effect Monster'
  });
  darkMagicianGirl.ownerId = 'player';
  darkMagicianGirl.controllerId = 'player';
  game.field.setMonsterZone('player', 0, darkMagicianGirl);

  const playerMagician = createCard({
    uid: 'player-dark-magician',
    id: '46986414',
    name: 'Dark Magician',
    name_en: 'Dark Magician'
  });
  playerMagician.ownerId = 'player';
  game.field.sendToGraveyard(playerMagician, 'player');

  const opponentMagician = createCard({
    uid: 'opponent-dark-magician',
    id: '46986414',
    name: 'Dark Magician',
    name_en: 'Dark Magician'
  });
  opponentMagician.ownerId = 'opponent';
  game.field.sendToGraveyard(opponentMagician, 'opponent');

  game.stateChanged();

  assert.equal(darkMagicianGirl.getAtk(), 2600);
});

test('Time Wizard resolves a chosen coin call and remains once per turn', async () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  const game = new DuelGame({
    onDecision: request => request?.type === 'coin-call' ? 'heads' : true
  });
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;

  const timeWizard = createCard({
    uid: 'time-wizard',
    id: '71625222',
    name: 'Time Wizard',
    type: 'Effect Monster',
    atk: 500,
    def: 400,
    level: 2,
    race: 'Spellcaster'
  });
  timeWizard.ownerId = 'player';
  timeWizard.controllerId = 'player';
  game.field.setMonsterZone('player', 0, timeWizard);

  const firstTarget = createCard({
    uid: 'time-wizard-first-target',
    ownerId: 'opponent',
    controllerId: 'opponent'
  });
  firstTarget.ownerId = 'opponent';
  firstTarget.controllerId = 'opponent';
  game.field.setMonsterZone('opponent', 0, firstTarget);

  try {
    assert.equal(await withImmediateTimers(
      () => game.activateMonsterEffect(0, 'player')
    ), true);
    assert.equal(game.opponentMonsters[0], null);
    assert.ok(game.opponentGraveyard.includes(firstTarget));
    assert.equal(game.opponentLP, 8000);

    const secondTarget = createCard({ uid: 'time-wizard-second-target' });
    secondTarget.ownerId = 'opponent';
    secondTarget.controllerId = 'opponent';
    game.field.setMonsterZone('opponent', 0, secondTarget);

    assert.equal(await withImmediateTimers(
      () => game.activateMonsterEffect(0, 'player')
    ), false);
    assert.equal(game.opponentMonsters[0], secondTarget);
  } finally {
    Math.random = originalRandom;
  }
});

test('Time Wizard failure destroys the controller monsters and inflicts half their original ATK', async () => {
  const originalRandom = Math.random;
  Math.random = () => 0.99;
  const game = new DuelGame({
    onDecision: request => request?.type === 'coin-call' ? 'heads' : true
  });
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;

  const timeWizard = createCard({
    uid: 'losing-time-wizard',
    id: '71625222',
    name: 'Time Wizard',
    type: 'Effect Monster',
    atk: 500,
    def: 400,
    level: 2
  });
  const ally = createCard({
    uid: 'time-wizard-ally',
    atk: 1500,
    def: 1200
  });
  for (const [index, card] of [timeWizard, ally].entries()) {
    card.ownerId = 'player';
    card.controllerId = 'player';
    game.field.setMonsterZone('player', index, card);
  }

  try {
    assert.equal(await withImmediateTimers(
      () => game.activateMonsterEffect(0, 'player')
    ), true);
  } finally {
    Math.random = originalRandom;
  }

  assert.equal(game.playerMonsters.filter(Boolean).length, 0);
  assert.ok(game.playerGraveyard.includes(timeWizard));
  assert.ok(game.playerGraveyard.includes(ally));
  assert.equal(game.playerLP, 7000);
  assert.equal(game.opponentLP, 8000);
});

test('Junk Synchron revives the explicitly chosen level-2 monster in Defense with effects negated', async () => {
  const revived = createCard({
    uid: 'junk-synchron-target',
    name: 'Level Two Target',
    type: 'Effect Monster',
    level: 2,
    atk: 900,
    def: 800
  });
  revived.ownerId = 'player';
  revived.controllerId = 'player';
  revived.location = 'graveyard';

  const game = new DuelGame({
    onDecision: () => revived.uid
  });
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.playerGraveyard.push(revived);

  const junkSynchron = createCard({
    uid: 'junk-synchron',
    id: '63977008',
    name: 'Junk Synchron',
    type: 'Tuner Monster',
    level: 3,
    atk: 1300,
    def: 500
  });
  junkSynchron.ownerId = 'player';
  junkSynchron.controllerId = 'player';
  junkSynchron.location = 'hand';
  game.playerHand.push(junkSynchron);

  assert.equal(await withImmediateTimers(
    () => game.summonMonster(junkSynchron.uid, 0)
  ), true);

  assert.equal(game.playerGraveyard.includes(revived), false);
  assert.ok(game.playerMonsters.includes(revived));
  assert.equal(revived.position, 'defense');
  assert.equal(revived.effectNegated, true);
  assert.equal(revived.effectsNegatedUntilEndTurn, true);
});

test('Kuriboh can be chosen from hand to reduce direct battle damage to zero', async () => {
  const game = new DuelGame({
    onDecision: request => (
      request?.type === 'activate-hand-effect'
      && request?.effect === 'kuriboh-prevent-battle-damage'
    )
  });
  game.startPhaseFlow = () => {};
  game.phases.turnCount = 2;
  game.phases.currentTurnOwner = 'opponent';
  game.phases.currentPhase = 'battle';

  const kuriboh = createCard({
    uid: 'kuriboh-in-hand',
    id: '40640057',
    name: 'Kuriboh',
    type: 'Effect Monster',
    level: 1,
    atk: 300,
    def: 200
  });
  kuriboh.ownerId = 'player';
  kuriboh.controllerId = 'player';
  kuriboh.location = 'hand';
  game.playerHand.push(kuriboh);

  const attacker = createCard({
    uid: 'kuriboh-direct-attacker',
    atk: 2000,
    def: 1000
  });
  attacker.ownerId = 'opponent';
  attacker.controllerId = 'opponent';
  game.field.setMonsterZone('opponent', 0, attacker);

  await withImmediateTimers(() => game.runAIBattlePhase());

  assert.equal(game.playerLP, 8000);
  assert.equal(game.playerHand.includes(kuriboh), false);
  assert.ok(game.playerGraveyard.includes(kuriboh));
});

test('Monster Reborn honors an explicit legal target choice instead of auto-selecting highest ATK', async () => {
  const chosen = createCard({
    uid: 'reborn-chosen',
    name: 'Chosen Weaker Monster',
    atk: 1000
  });
  chosen.ownerId = 'player';
  chosen.controllerId = 'player';
  chosen.location = 'graveyard';
  const stronger = createCard({
    uid: 'reborn-stronger',
    name: 'Unchosen Stronger Monster',
    atk: 3000
  });
  stronger.ownerId = 'opponent';
  stronger.controllerId = 'opponent';
  stronger.location = 'graveyard';

  const game = new DuelGame({
    onDecision: () => chosen.uid
  });
  game.playerGraveyard.push(chosen);
  game.opponentGraveyard.push(stronger);

  const monsterReborn = createCard({
    uid: 'monster-reborn-choice',
    id: MONSTER_REBORN_ID,
    name: 'Monster Reborn',
    card_type: 'spell',
    type: 'Spell Card',
    atk: 0,
    def: 0,
    level: 0
  });
  monsterReborn.ownerId = 'player';
  monsterReborn.controllerId = 'player';
  game.field.setSpellZone('player', 0, monsterReborn);

  await withImmediateTimers(
    () => game.executeSpellTrapResolution(monsterReborn, 'player', 0)
  );

  assert.ok(game.playerMonsters.includes(chosen));
  assert.equal(game.playerGraveyard.includes(chosen), false);
  assert.ok(game.opponentGraveyard.includes(stronger));
  assert.equal(game.playerMonsters.includes(stronger), false);
});

test('AI combat leaves both monsters intact when two 0 ATK monsters battle', async () => {
  const game = new DuelGame();
  game.startPhaseFlow = () => {};
  const attacker = createCard({
    uid: 'zero-ai',
    name: 'Zero AI',
    atk: 0,
    def: 0
  });
  const defender = createCard({
    uid: 'zero-player',
    name: 'Zero Player',
    atk: 0,
    def: 0
  });
  attacker.ownerId = 'opponent';
  attacker.controllerId = 'opponent';
  defender.ownerId = 'player';
  defender.controllerId = 'player';
  game.field.setMonsterZone('opponent', 0, attacker);
  game.field.setMonsterZone('player', 0, defender);

  await withImmediateTimers(() => game.runAIBattlePhase());

  assert.equal(game.opponentMonsters[0], attacker);
  assert.equal(game.playerMonsters[0], defender);
  assert.equal(game.opponentGraveyard.length, 0);
  assert.equal(game.playerGraveyard.length, 0);
  assert.equal(game.playerLP, 8000);
  assert.equal(game.opponentLP, 8000);
});

test('Deck Out ends the duel and prevents subsequent AI actions', async () => {
  const game = new DuelGame();
  game.startPhaseFlow = () => {};
  const aiCard = createCard({
    uid: 'post-deckout-ai-card',
    ownerId: 'opponent',
    controllerId: 'opponent'
  });
  game.opponentHand.push(aiCard);
  game.playerDeck = [];

  assert.equal(game.drawCard('player'), null);
  assert.equal(game.winner, 'opponent');

  await withImmediateTimers(() => game.runAIMainPhase());

  assert.equal(game.opponentHand[0], aiCard);
  assert.equal(game.opponentMonsters.filter(Boolean).length, 0);
});

test('opponent draw logs never disclose the hidden card identity', () => {
  const logs = [];
  const game = new DuelGame({
    onLog: message => logs.push(message)
  });
  const secret = createCard({
    uid: 'secret-draw',
    id: '99999999',
    name: 'Secret Dragon'
  });
  secret.ownerId = 'opponent';
  secret.controllerId = 'opponent';
  secret.location = 'deck';
  game.opponentDeck.push(secret);

  assert.equal(game.drawCard('opponent'), secret);

  const combinedLogs = logs.join('\n');
  assert.doesNotMatch(combinedLogs, /Secret Dragon/);
  assert.doesNotMatch(combinedLogs, /99999999/);
  assert.match(combinedLogs, /pioche/i);
});

test('face-down card DOM contains no real name, id, image, ATK, or DEF', () => {
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;
  globalThis.document = {
    createElement: tagName => new FakeElement(tagName)
  };
  globalThis.localStorage = {
    getItem: () => null
  };

  try {
    const secret = createCard({
      id: '99999999',
      name: 'Secret Dragon',
      atk: 3141,
      def: 2718
    });
    secret.isSetFaceDown = true;

    const flatCard = createCardDOM(secret, true);
    const hologram = createMonsterHologramDOM(secret, true);
    const serialized = `${serializeFakeElement(flatCard)}\n${serializeFakeElement(hologram)}`;

    assert.doesNotMatch(serialized, /Secret Dragon/);
    assert.doesNotMatch(serialized, /99999999/);
    assert.doesNotMatch(serialized, /3141/);
    assert.doesNotMatch(serialized, /2718/);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  }
});

test('ChainEngine enforces Spell Speed responses and DuelGame resolves links in LIFO order', async () => {
  const chain = new ChainEngine();
  const normalSpell = createCard({
    card_type: 'spell',
    type: 'Spell Card',
    name: 'Normal Spell'
  });
  const quickPlay = createCard({
    card_type: 'spell',
    type: 'Quick-Play Spell',
    name: 'Quick-Play Spell'
  });
  const normalTrap = createCard({
    card_type: 'trap',
    type: 'Trap Card',
    name: 'Normal Trap'
  });
  const counterTrap = createCard({
    card_type: 'trap',
    type: 'Counter Trap',
    name: 'Counter Trap'
  });

  assert.equal(chain.canChain(normalSpell, 1), false);
  assert.equal(chain.canChain(quickPlay, 1), true);
  assert.equal(chain.canChain(normalTrap, 2), true);
  assert.equal(chain.canChain(normalTrap, 3), false);
  assert.equal(chain.canChain(counterTrap, 3), true);

  const game = new DuelGame();
  const order = [];
  game.executeSpellTrapResolution = async card => {
    order.push(card.name);
  };
  game.chain.pushChainLink('player', normalSpell);
  game.chain.pushChainLink('opponent', quickPlay);

  await withImmediateTimers(() => game.resolveChainStack());

  assert.deepEqual(order, ['Quick-Play Spell', 'Normal Spell']);
  assert.equal(game.chain.chainStack.length, 0);
  assert.equal(game.chain.chainStatus, 'idle');
});

test('a selected set Quick-Play Spell joins the real response window and resolves before Chain Link 1', async () => {
  const response = createCard({
    uid: 'chosen-quick-play-response',
    id: '99990001',
    name: 'Chosen Quick-Play Response',
    card_type: 'spell',
    type: 'Quick-Play Spell',
    atk: 0,
    def: 0,
    level: 0
  });
  response.ownerId = 'opponent';
  response.controllerId = 'opponent';
  response.isSetFaceDown = true;
  response.turnSet = 1;

  const opportunities = [];
  const game = new DuelGame({
    onChainOpportunity: request => {
      opportunities.push(request);
      const candidate = request.candidates.find(item => item.cardUid === response.uid);
      return candidate ? { cardUid: candidate.cardUid } : null;
    }
  });
  game.phases.currentPhase = 'main1';
  game.phases.turnCount = 2;
  game.field.setSpellZone('opponent', 0, response);

  const pot = createCard({
    uid: 'chain-link-one-pot',
    id: POT_OF_GREED_ID,
    name: 'Pot of Greed',
    card_type: 'spell',
    type: 'Spell Card',
    atk: 0,
    def: 0,
    level: 0
  });
  pot.ownerId = 'player';
  pot.controllerId = 'player';
  pot.location = 'hand';
  game.playerHand.push(pot);
  for (let index = 0; index < 2; index += 1) {
    const draw = createCard({ uid: `chain-draw-${index}` });
    draw.ownerId = 'player';
    draw.controllerId = 'player';
    draw.location = 'deck';
    game.playerDeck.push(draw);
  }

  const order = [];
  game.executeSpellTrapResolution = async card => {
    order.push(card.uid);
  };

  assert.equal(await withImmediateTimers(
    () => game.playSpellTrap(pot.uid, 0)
  ), true);

  assert.ok(opportunities.some(request => (
    request.side === 'opponent'
    && request.candidates.some(candidate => candidate.cardUid === response.uid)
  )));
  assert.deepEqual(order, [response.uid, pot.uid]);
});
