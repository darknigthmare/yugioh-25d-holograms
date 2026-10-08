import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NativeDuelGame, NATIVE_TCG_DUEL_FLAGS } from '../src/core/native/NativeDuelGame.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { chooseNativeAIResponse, nativeSelectablePlaces, validateNativeDuelResponse } from '../src/core/native/NativeDuelDecisions.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';
import { createNativeCardPresentationTemplate } from '../src/core/native/NativeCardCatalogue.js';

const resourcesPromise = loadNativeCardResources({ fetch: async path => (
  new Response(await readFile(new URL(`../public${path}`, import.meta.url)))
) });
const zeroDrawTeam = { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 };

/** Answer only candidates and quantities emitted by the unchanged official
 * Lua/core. Fixtures declare their initial zones through the ordinary native
 * API; no Debug API, custom Lua, TEST_MODE or PSEUDO_SHUFFLE is involved. */
async function fixture({ decide, startingPlayer = 'player' } = {}) {
  const resources = await resourcesPromise;
  const messages = [], decisions = [], events = [];
  let game;
  game = new NativeDuelGame({
    onAnimation: event => events.push(event),
    onDecision: request => {
      const prompt = game.pendingNativeDecision;
      const options = { constants: game.runtime.constants, metadata: resources.metadata,
        cardReader: game.runtime.options.cardReader,
        isCardDeclarable: game.runtime.isCardDeclarable.bind(game.runtime) };
      const response = chooseNativeAIResponse(prompt, options);
      assert.ok(response, `No legal response for ${request.nativeKind}`);
      assert.ok(validateNativeDuelResponse(prompt, response, options));
      decisions.push({ prompt, request, response });
      const custom = decide?.({ prompt, request, response, game });
      if (custom !== undefined) return custom;
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
    rulesMode: 'native', nativeResources: resources, seed: [1n, 2n, 3n, 4n],
    teams: [zeroDrawTeam, zeroDrawTeam], aiDelay: 0,
    validateDeck: () => ({ valid: true, issues: [] }),
    runtimeOptions: { onMessages: batch => messages.push(...batch) }
  });
  const base = { id: 46986414, name: 'Dark Magician', card_type: 'monster', type: 'Normal Monster' };
  assert.equal(await game.initDecks([base], [base], [], [], { startingPlayer }), true);
  const C = game.runtime.constants;
  const add = (code, location, sequence = 0, { side = 'player', faceDown, faceUpExtra } = {}) => {
    const position = faceDown || (location === C.OcgLocation.EXTRA && !faceUpExtra)
      ? C.OcgPosition.FACEDOWN_DEFENSE : C.OcgPosition.FACEUP_ATTACK;
    game.runtime.addCard({ code, controller: game.controllerForSide(side), location, sequence, position });
  };
  const clean = () => {
    assert.equal(game.nativeError, null);
    assert.deepEqual(game.runtime.errors, []);
    assert.equal(messages.some(message => message.type === C.OcgMessageType.RETRY), false);
    assert.equal(game.runtime.options.flags, NATIVE_TCG_DUEL_FLAGS);
    assert.equal(game.runtime.options.flags & (C.OcgDuelMode.TEST_MODE | C.OcgDuelMode.PSEUDO_SHUFFLE), 0n);
  };
  return { game, C, add, messages, decisions, events, clean };
}

function findExtra(game, code) { return game.playerExtraDeck.find(card => card.id === code); }
function findMonster(game, code) { return game.getMonsterEntries('player').find(entry => entry.card.id === code); }

test('official Polymerization selects three native materials and Fusion Summons Blue-Eyes Ultimate', async () => {
  const { game, C, add, decisions, events, clean } = await fixture();
  try {
    add(24094653, C.OcgLocation.HAND);
    for (let copy = 0; copy < 3; copy += 1) add(89631139, C.OcgLocation.HAND);
    add(23995346, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    const polymerization = game.playerHand.find(card => card.id === 24094653);
    assert.equal(game.canActivateSpell(polymerization), true);
    assert.equal(await game.playSpellTrap(polymerization.uid, 0), true);
    const ultimate = findMonster(game, 23995346)?.card;
    assert.ok(ultimate);
    assert.equal(ultimate.extra_type, 'fusion');
    assert.equal(ultimate.getAtk(), 4500);
    assert.equal(ultimate.getDef(), 3800);
    assert.equal(ultimate.wasProperlySpecialSummoned, true);
    assert.equal(game.playerGraveyard.filter(card => card.id === 89631139).length, 3);
    assert.equal(game.playerExtraDeck.length, 0);
    assert.ok(decisions.some(({ request }) => request.multiple));
    const event = events.find(event => event.type === 'summon' && event.summonType === 'fusion');
    assert.ok(event, JSON.stringify(events.filter(event => event.type === 'summon')));
    assert.equal(event.nativeSummonConfirmed, true);
    assert.equal(createPublicCombatVisual(event, game).profile, 'fusion-summon');
    clean();
  } finally { game.dispose(); }
});

test('official Black Luster Ritual validates the native level sum and properly summons its Ritual monster', async () => {
  const { game, C, add, decisions, events, clean } = await fixture();
  try {
    for (const code of [55761792, 5405694, 89631139]) add(code, C.OcgLocation.HAND);
    assert.equal(await game.start(), true);
    const ritual = game.playerHand.find(card => card.id === 55761792);
    assert.equal(game.canActivateSpell(ritual), true);
    assert.equal(await game.playSpellTrap(ritual.uid, 1), true);
    const soldier = findMonster(game, 5405694)?.card;
    assert.ok(soldier);
    assert.equal(soldier.isRitualMonster, true);
    assert.equal(soldier.wasProperlySpecialSummoned, true);
    assert.equal(soldier.getLevel(), 8);
    assert.equal(soldier.getAtk(), 3000);
    assert.ok(game.playerGraveyard.some(card => card.id === 89631139));
    assert.ok(decisions.some(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_SUM));
    const event = events.find(event => event.type === 'summon' && event.summonType === 'ritual');
    assert.ok(event);
    assert.equal(createPublicCombatVisual(event, game).profile, 'ritual-summon');
    clean();
  } finally { game.dispose(); }
});

test('official Synchro procedure uses the offered tuner and non-tuner, then offers Main Monster Zones under MR5', async () => {
  const { game, C, add, decisions, events, clean } = await fixture();
  try {
    add(63977008, C.OcgLocation.MZONE, 0); // Junk Synchron, Level 3 Tuner
    add(70095154, C.OcgLocation.MZONE, 1); // Cyber Dragon, Level 5
    add(44508094, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    const stardust = findExtra(game, 44508094);
    assert.ok(game.getAvailableActions().synchroExtraUids.includes(stardust.uid));
    assert.equal(await game.summonExtraDeck(stardust.uid), true);
    const entry = findMonster(game, 44508094);
    assert.ok(entry);
    assert.equal(entry.zoneType, 'main');
    assert.equal(entry.card.getLevel(), 8);
    assert.equal(entry.card.wasProperlySpecialSummoned, true);
    assert.deepEqual(game.playerGraveyard.map(card => card.id).sort(), [63977008, 70095154]);
    assert.ok(decisions.some(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_UNSELECT_CARD));
    const event = events.find(event => event.type === 'summon' && event.summonType === 'synchro');
    assert.ok(event);
    assert.equal(createPublicCombatVisual(event, game).profile, 'synchro-summon');
    clean();
  } finally { game.dispose(); }
});

test('official Xyz procedure projects actual overlay materials and Rank without a monster Level', async () => {
  const { game, C, add, events, clean } = await fixture();
  try {
    add(97590747, C.OcgLocation.MZONE, 0); // La Jinn, Level 4
    add(76812113, C.OcgLocation.MZONE, 1); // Harpie Lady, Level 4
    add(84013237, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    const utopia = findExtra(game, 84013237);
    assert.ok(game.getAvailableActions().xyzExtraUids.includes(utopia.uid));
    assert.equal(await game.summonExtraDeck(utopia.uid), true);
    const xyz = findMonster(game, 84013237)?.card;
    assert.ok(xyz);
    assert.equal(xyz.getRank(), 4);
    assert.equal(xyz.getLevel(), 0);
    assert.equal(xyz.wasProperlySpecialSummoned, true);
    assert.deepEqual(xyz.xyzMaterials.map(card => card.id).sort(), [76812113, 97590747]);
    assert.equal(game.playerGraveyard.length, 0);
    assert.ok(Object.isFrozen(xyz.xyzMaterials));
    const event = events.find(event => event.type === 'summon' && event.summonType === 'xyz');
    assert.ok(event, JSON.stringify(events.filter(event => event.type === 'summon')));
    assert.equal(event.nativeSummonConfirmed, true);
    assert.equal(createPublicCombatVisual(event, game).profile, 'xyz-summon');
    clean();
  } finally { game.dispose(); }
});

test('official Link procedure sends materials to the Graveyard and projects its shared Extra Monster Zone', async () => {
  const { game, C, add, decisions, events, clean } = await fixture();
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(76812113, C.OcgLocation.MZONE, 1);
    add(77637979, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    const link = findExtra(game, 77637979);
    assert.ok(game.getAvailableActions().linkExtraUids.includes(link.uid));
    assert.equal(await game.summonExtraDeck(link.uid), true);
    const entry = findMonster(game, 77637979);
    assert.ok(entry);
    assert.equal(entry.zoneType, 'extra');
    assert.equal(entry.card.linkRating, 2);
    assert.equal(entry.card.getDef(), null);
    assert.equal(entry.card.getLevel(), 0);
    assert.equal(entry.card.wasProperlySpecialSummoned, true);
    assert.equal(game.extraMonsterZones[entry.zoneIndex].card, entry.card);
    assert.deepEqual(game.playerGraveyard.map(card => card.id).sort(), [76812113, 97590747]);
    const placeDecision = decisions.find(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_PLACE);
    assert.ok(placeDecision);
    assert.ok(nativeSelectablePlaces(placeDecision.prompt).every(place => place.location === C.OcgLocation.MZONE && place.sequence >= 5));
    const event = events.find(event => event.type === 'summon' && event.summonType === 'link');
    assert.ok(event);
    assert.equal(event.nativeSummonConfirmed, true);
    assert.equal(createPublicCombatVisual(event, game).profile, 'link-summon');
    clean();
  } finally { game.dispose(); }
});

test('native material requirements suppress impossible Synchro and Xyz procedures without consuming cards', async () => {
  const { game, C, add, clean } = await fixture();
  try {
    add(97590747, C.OcgLocation.MZONE, 0); // Level 4, non-Tuner
    add(89631139, C.OcgLocation.MZONE, 1); // Level 8, non-Tuner
    add(76812113, C.OcgLocation.MZONE, 2, { faceDown: true });
    for (const code of [44508094, 84013237, 77637979]) add(code, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    const available = game.getAvailableActions();
    assert.deepEqual(available.synchroExtraUids, []);
    assert.deepEqual(available.xyzExtraUids, []);
    // LANphorhynchus remains legal with the two face-up monsters; the Set card
    // must never appear among its native materials.
    assert.equal(await game.summonExtraDeck(findExtra(game, 44508094).uid), false);
    assert.equal(await game.summonExtraDeck(findExtra(game, 84013237).uid), false);
    assert.equal(game.getMonsterEntries('player').length, 3);
    assert.equal(game.playerGraveyard.length, 0);
    clean();
  } finally { game.dispose(); }
});

test('a Set monster is never offered as a Link Spider material', async () => {
  const { game, C, add, clean } = await fixture();
  try {
    add(97590747, C.OcgLocation.MZONE, 0, { faceDown: true });
    add(98978921, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    assert.deepEqual(game.getAvailableActions().linkExtraUids, []);
    assert.equal(await game.summonExtraDeck(findExtra(game, 98978921).uid), false);
    assert.equal(game.playerMonsters[0].isSetFaceDown, true);
    assert.equal(game.playerGraveyard.length, 0);
    clean();
  } finally { game.dispose(); }
});

test('Vanity’s Fiend removes native special summon procedures and Fusion/Ritual activations', async () => {
  const { game, C, add, clean } = await fixture();
  try {
    add(47084486, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(63977008, C.OcgLocation.MZONE, 0);
    add(70095154, C.OcgLocation.MZONE, 1);
    for (const code of [24094653, 55761792, 5405694, 89631139, 89631139, 89631139]) add(code, C.OcgLocation.HAND);
    for (const code of [44508094, 23995346, 98978921]) add(code, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    assert.deepEqual(game.getAvailableActions().specialSummonCardUids, []);
    for (const code of [24094653, 55761792]) {
      const spell = game.playerHand.find(card => card.id === code);
      assert.equal(game.canActivateSpell(spell), false);
      assert.equal(await game.playSpellTrap(spell.uid, 0), false);
    }
    assert.equal(game.playerGraveyard.length, 0);
    assert.equal(game.playerHand.length, 6);
    clean();
  } finally { game.dispose(); }
});

test('Fusion material consumption creates a native Main Monster Zone even when the initial field is full', async () => {
  const { game, C, add, clean } = await fixture();
  try {
    for (const sequence of [0, 1, 2]) add(89631139, C.OcgLocation.MZONE, sequence);
    add(97590747, C.OcgLocation.MZONE, 3);
    add(46986414, C.OcgLocation.MZONE, 4);
    add(24094653, C.OcgLocation.HAND);
    add(23995346, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    assert.ok(game.playerMonsters.every(Boolean));
    const spell = game.playerHand[0];
    assert.equal(game.canActivateSpell(spell), true);
    assert.equal(await game.playSpellTrap(spell.uid, 0), true);
    assert.ok(findMonster(game, 23995346));
    assert.ok(findMonster(game, 97590747));
    assert.ok(findMonster(game, 46986414));
    assert.equal(game.getMonsterEntries('player').length, 3);
    assert.equal(game.playerGraveyard.filter(card => card.id === 89631139).length, 3);
    clean();
  } finally { game.dispose(); }
});

test('Pendulum Summon selects native hand/face-up Extra candidates and applies MR5 plus the once-per-turn limit', async () => {
  const { game, C, add, decisions, events, clean } = await fixture();
  try {
    add(16178681, C.OcgLocation.HAND); // Odd-Eyes Scale, destroyed below
    add(20409757, C.OcgLocation.HAND); // Scale 8
    add(97590747, C.OcgLocation.HAND); // Level 4
    add(5318639, C.OcgLocation.HAND); // Mystical Space Typhoon
    add(94415058, C.OcgLocation.HAND); // Replacement Scale 1
    assert.equal(await game.start(), true);
    assert.equal(await game.activatePendulumScale(game.playerHand.find(card => card.id === 16178681).uid, 0), true);
    assert.equal(await game.activatePendulumScale(game.playerHand.find(card => card.id === 20409757).uid, 4), true);
    const mst = game.playerHand.find(card => card.id === 5318639);
    assert.equal(await game.playSpellTrap(mst.uid, 2), true);
    const replacement = game.playerHand.find(card => card.id === 94415058);
    assert.equal(await game.activatePendulumScale(replacement.uid, 0), true);
    const hand = game.playerHand.find(card => card.id === 97590747);
    const extra = game.playerFaceUpExtraDeck[0];
    assert.ok(extra);
    assert.equal(game.getAvailableActions().canPendulumSummon, true);
    assert.equal(await game.performPendulumSummon('player', [hand.uid, extra.uid]), true);
    const main = findMonster(game, 97590747), extraEntry = findMonster(game, 16178681);
    assert.ok(main);
    assert.ok(extraEntry);
    assert.equal(main.zoneType, 'main');
    assert.equal(extraEntry.zoneType, 'extra');
    assert.equal(main.card.summonType, 'pendulum');
    assert.equal(extraEntry.card.summonType, 'pendulum');
    assert.equal(game.playerFaceUpExtraDeck.length, 0);
    assert.equal(game.getAvailableActions().canPendulumSummon, false);
    assert.equal(await game.performPendulumSummon(), false);
    assert.ok(decisions.some(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_PLACE));
    const summons = events.filter(event => event.type === 'summon');
    assert.equal(summons.length, 2);
    assert.ok(summons.every(event => event.summonType === 'pendulum' && event.nativeSummonConfirmed));
    assert.ok(summons.every(event => createPublicCombatVisual(event, game).profile === 'pendulum-summon'));
    clean();
  } finally { game.dispose(); }
});

test('occupied Extra Monster Zones prevent a Link procedure and a face-up Extra Pendulum Summon despite free Main Zones', async () => {
  const { game, C, add, clean } = await fixture();
  try {
    add(16178681, C.OcgLocation.HAND);
    add(51531505, C.OcgLocation.HAND); // Dragonpit Magician, Scale 8
    add(23995346, C.OcgLocation.MZONE, 5);
    add(23995346, C.OcgLocation.MZONE, 5, { side: 'opponent' });
    add(97590747, C.OcgLocation.MZONE, 0);
    add(98978921, C.OcgLocation.EXTRA);
    add(5318639, C.OcgLocation.HAND);
    add(94415058, C.OcgLocation.HAND);
    assert.equal(await game.start(), true);
    assert.equal(await game.activatePendulumScale(game.playerHand.find(card => card.id === 16178681).uid, 0), true);
    assert.equal(await game.activatePendulumScale(game.playerHand.find(card => card.id === 51531505).uid, 4), true);
    const mst = game.playerHand.find(card => card.id === 5318639);
    assert.equal(await game.playSpellTrap(mst.uid, 2), true);
    const replacement = game.playerHand.find(card => card.id === 94415058);
    assert.equal(await game.activatePendulumScale(replacement.uid, 0), true);
    assert.equal(game.extraMonsterZones.filter(Boolean).length, 2);
    assert.equal(game.playerMonsters.filter(Boolean).length, 1);
    assert.equal(game.getAvailableActions().canPendulumSummon, false);
    assert.deepEqual(game.getAvailableActions().linkExtraUids, []);
    assert.equal(await game.performPendulumSummon(), false);
    assert.equal(await game.summonExtraDeck(findExtra(game, 98978921).uid), false);
    assert.equal(game.playerFaceUpExtraDeck.length, 1);
    clean();
  } finally { game.dispose(); }
});

test('Link Summon retains the correct shared zone when the human player is native team 1', async () => {
  const { game, C, add, clean } = await fixture({ startingPlayer: 'opponent' });
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(98978921, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    assert.equal(game.playerController, 1);
    const link = findExtra(game, 98978921);
    assert.ok(game.getAvailableActions().linkExtraUids.includes(link.uid));
    assert.equal(await game.summonExtraDeck(link.uid), true);
    const entry = findMonster(game, 98978921);
    assert.equal(entry.zoneType, 'extra');
    assert.equal(entry.card.nativeRef.controller, 1);
    assert.equal(game.extraMonsterZones[entry.zoneIndex].controllerId, 'player');
    assert.equal(game.playerGraveyard[0].id, 97590747);
    assert.equal(game.opponentGraveyard.length, 0);
    clean();
  } finally { game.dispose(); }
});

test('cancelling the native Synchro material prompt leaves every material and the Extra monster unchanged', async () => {
  const { game, C, add, decisions, clean } = await fixture({
    decide: ({ prompt, game }) => prompt.type === game.runtime.constants.OcgMessageType.SELECT_UNSELECT_CARD
      && prompt.can_cancel ? null : undefined
  });
  try {
    add(63977008, C.OcgLocation.MZONE, 0);
    add(70095154, C.OcgLocation.MZONE, 1);
    add(44508094, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    const extra = findExtra(game, 44508094);
    assert.equal(await game.summonExtraDeck(extra.uid), true);
    assert.ok(decisions.some(({ prompt }) => prompt.can_cancel));
    assert.equal(findExtra(game, 44508094).uid, extra.uid);
    assert.deepEqual(game.getMonsterEntries('player').map(({ card }) => card.id).sort(), [63977008, 70095154]);
    assert.equal(game.playerGraveyard.length, 0);
    assert.equal(game.pendingNativeDecision.type, C.OcgMessageType.SELECT_IDLECMD);
    assert.ok(game.getAvailableActions().synchroExtraUids.includes(extra.uid));
    clean();
  } finally { game.dispose(); }
});

test('an officially Fusion Summoned monster can be revived and emits a Special Summon rather than another Fusion', async () => {
  const { game, C, add, events, clean } = await fixture({
    decide: ({ prompt, game }) => {
      if (prompt.type !== game.runtime.constants.OcgMessageType.SELECT_CARD) return undefined;
      const index = prompt.selects.findIndex(card => card.code === 23995346);
      return index < 0 ? undefined : [String(index)];
    }
  });
  try {
    for (const code of [24094653, 53129443, 83764718, 89631139, 89631139, 89631139]) add(code, C.OcgLocation.HAND);
    add(23995346, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    assert.equal(await game.playSpellTrap(game.playerHand.find(card => card.id === 24094653).uid, 0), true);
    assert.equal(await game.playSpellTrap(game.playerHand.find(card => card.id === 53129443).uid, 0), true);
    const graveFusion = game.playerGraveyard.find(card => card.id === 23995346);
    assert.ok(graveFusion);
    assert.equal(graveFusion.wasProperlySpecialSummoned, true);
    assert.equal(await game.playSpellTrap(game.playerHand.find(card => card.id === 83764718).uid, 0), true);
    assert.ok(findMonster(game, 23995346));
    const summons = events.filter(event => event.type === 'summon' && Number(event.card?.id) === 23995346);
    assert.deepEqual(summons.map(event => event.summonType), ['fusion', 'special']);
    assert.equal(summons[1].nativeRevivalConfirmed, true);
    assert.equal(summons[1].revivalFrom.zoneType, 'graveyard');
    assert.equal(createPublicCombatVisual(summons[1], game).profile, 'revival');
    clean();
  } finally { game.dispose(); }
});

test('Monster Reborn never offers an Extra monster lacking its native proper-summon history', async () => {
  const { game, C, add, decisions, clean } = await fixture();
  try {
    add(23995346, C.OcgLocation.GRAVE);
    add(89631139, C.OcgLocation.GRAVE);
    add(83764718, C.OcgLocation.HAND);
    assert.equal(await game.start(), true);
    assert.equal(game.playerGraveyard.find(card => card.id === 23995346).wasProperlySpecialSummoned, false);
    assert.equal(await game.playSpellTrap(game.playerHand[0].uid, 0), true);
    const targets = decisions.filter(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_CARD)
      .flatMap(({ prompt }) => prompt.selects.map(card => card.code));
    assert.ok(targets.includes(89631139));
    assert.equal(targets.includes(23995346), false);
    assert.ok(findMonster(game, 89631139));
    assert.equal(findMonster(game, 23995346), undefined);
    clean();
  } finally { game.dispose(); }
});

test('Utopia detaches an actual native overlay for its battle effect and updates the material projection', async () => {
  const { game, C, add, decisions, clean } = await fixture();
  try {
    add(97590747, C.OcgLocation.MZONE, 0);
    add(76812113, C.OcgLocation.MZONE, 1);
    add(84013237, C.OcgLocation.EXTRA);
    assert.equal(await game.start(), true);
    assert.equal(await game.summonExtraDeck(findExtra(game, 84013237).uid), true);
    const before = findMonster(game, 84013237).card;
    assert.equal(before.xyzMaterials.length, 2);
    assert.equal(await game.changePhase('end'), true);
    assert.equal(await game.changePhase('battle'), true);
    const attacker = findMonster(game, 84013237);
    assert.equal(await game.executeAttack({ zoneType: attacker.zoneType, zoneIndex: attacker.zoneIndex }), true);
    const after = findMonster(game, 84013237).card;
    assert.equal(after.xyzMaterials.length, 1);
    assert.equal(before.xyzMaterials.length, 2);
    assert.equal(game.playerGraveyard.length, 1);
    assert.ok([97590747, 76812113].includes(game.playerGraveyard[0].id));
    assert.ok(decisions.some(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_EFFECTYN && prompt.code === 84013237));
    assert.equal(game.opponentLP, 8000); // Utopia negates its own declared attack.
    clean();
  } finally { game.dispose(); }
});

test('Soul Exchange identifies a public enemy Tribute but keeps the enemy Set monster hidden', async () => {
  const { game, C, add, decisions, clean } = await fixture({
    decide: ({ prompt, game }) => {
      if (prompt.type !== game.runtime.constants.OcgMessageType.SELECT_TRIBUTE) return undefined;
      const index = prompt.selects.findIndex(card => card.controller !== game.playerController);
      return index < 0 ? undefined : [String(index)];
    }
  });
  try {
    add(46986414, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(76812113, C.OcgLocation.MZONE, 1, { side: 'opponent', faceDown: true });
    add(83011277, C.OcgLocation.MZONE, 0);
    add(68005187, C.OcgLocation.HAND);
    add(70781052, C.OcgLocation.HAND);
    assert.equal(await game.start(), true);
    assert.equal(await game.playSpellTrap(game.playerHand.find(card => card.id === 68005187).uid, 0), true);
    const skull = game.playerHand.find(card => card.id === 70781052);
    assert.equal(await game.summonMonster(skull.uid, 2), true);
    const tribute = decisions.find(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_TRIBUTE);
    assert.ok(tribute);
    const index = tribute.prompt.selects.findIndex(card => card.controller === game.controllerForSide('opponent'));
    assert.equal(tribute.prompt.selects[index].position, undefined);
    assert.equal(tribute.request.candidates[index].name,
      createNativeCardPresentationTemplate(await resourcesPromise, 46986414).name);
    const target = decisions.find(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_CARD
      && prompt.selects.some(card => card.sequence === 1 && card.controller === game.controllerForSide('opponent')));
    assert.ok(target);
    const hiddenIndex = target.prompt.selects.findIndex(card => card.sequence === 1);
    assert.equal(target.request.candidates[hiddenIndex].name, 'Carte face verso');
    assert.equal(target.request.candidates[hiddenIndex].card, undefined);
    assert.equal(target.request.candidates[hiddenIndex].code, undefined);
    assert.ok(findMonster(game, 70781052));
    assert.ok(findMonster(game, 83011277));
    assert.equal(game.opponentGraveyard[0].id, 46986414);
    assert.equal(game.opponentMonsters[1].isSetFaceDown, true);
    assert.equal(game._isPublicCard({ controller: game.controllerForSide('opponent'), location: C.OcgLocation.MZONE, sequence: 1, code: 76812113 }), false);
    assert.equal(game._isPublicCard({ ...findMonster(game, 70781052).card.nativeRef, code: 0 }), false);
    assert.equal(game._isPublicCard(game.playerDeck[0].nativeRef), false);
    clean();
  } finally { game.dispose(); }
});

test('a native Flip Summon exposes the monster and removes further position changes for that turn', async () => {
  const { game, C, add, events, clean } = await fixture();
  try {
    add(97590747, C.OcgLocation.MZONE, 0, { faceDown: true });
    assert.equal(await game.start(), true);
    const set = game.playerMonsters[0];
    assert.ok(game.getAvailableActions().positionChangeCardUids.includes(set.uid));
    assert.equal(await game.toggleMonsterPosition(0), true);
    const flipped = game.playerMonsters[0];
    assert.equal(flipped.isSetFaceDown, false);
    assert.equal(flipped.summonType, 'flip');
    assert.equal(game.getAvailableActions().positionChangeCardUids.includes(flipped.uid), false);
    assert.equal(await game.toggleMonsterPosition(0), false);
    const event = events.find(event => event.type === 'flip-summon');
    assert.ok(event);
    assert.equal(event.nativeSummonConfirmed, true);
    assert.equal(createPublicCombatVisual(event, game).profile, 'flip-summon');
    clean();
  } finally { game.dispose(); }
});

test('Solemn Judgment negates an offered Link Summon without recording a successful summon or proper history', async () => {
  const { game, C, add, events, decisions, clean } = await fixture({
    startingPlayer: 'opponent',
    decide: ({ prompt, game }) => {
      if (prompt.type !== game.runtime.constants.OcgMessageType.SELECT_CHAIN) return undefined;
      const index = prompt.selects.findIndex(card => card.code === 41420027);
      return index < 0 ? undefined : index;
    }
  });
  try {
    add(97590747, C.OcgLocation.MZONE, 0, { side: 'opponent' });
    add(98978921, C.OcgLocation.EXTRA, 0, { side: 'opponent' });
    add(41420027, C.OcgLocation.SZONE, 0, { faceDown: true });
    assert.equal(await game.start(), true);
    assert.equal(game.currentTurn, 'player');
    assert.equal(game.playerLP, 4000);
    assert.equal(game.getMonsterEntries('opponent').length, 0);
    const negated = game.opponentGraveyard.find(card => card.id === 98978921);
    assert.ok(negated);
    assert.equal(negated.wasProperlySpecialSummoned, false);
    assert.ok(game.opponentGraveyard.some(card => card.id === 97590747));
    assert.ok(game.playerGraveyard.some(card => card.id === 41420027));
    assert.ok(decisions.some(({ prompt }) => prompt.type === C.OcgMessageType.SELECT_CHAIN
      && prompt.selects.some(card => card.code === 41420027)));
    assert.equal(events.some(event => event.type === 'summon' && Number(event.card?.id) === 98978921), false);
    clean();
  } finally { game.dispose(); }
});

test('insufficient native Ritual tribute levels suppress activation and preserve the hand', async () => {
  const { game, C, add, clean } = await fixture();
  try {
    for (const code of [55761792, 5405694, 46986414]) add(code, C.OcgLocation.HAND);
    assert.equal(await game.start(), true);
    const ritual = game.playerHand.find(card => card.id === 55761792);
    assert.equal(game.canActivateSpell(ritual), false);
    assert.equal(await game.playSpellTrap(ritual.uid, 0), false);
    assert.equal(game.playerHand.length, 3);
    assert.equal(game.playerGraveyard.length, 0);
    clean();
  } finally { game.dispose(); }
});
