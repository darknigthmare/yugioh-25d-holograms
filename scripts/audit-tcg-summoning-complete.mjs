import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { NativeDuelGame } from '../src/core/native/NativeDuelGame.js';
import { createNativeDuelRuntime, createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';
import { NATIVE_TCG_DUEL_FLAGS } from '../src/core/native/NativeTCGRuleProfile.js';
import { chooseNativeAIResponse, nativeSelectablePlaces, validateNativeDuelResponse } from '../src/core/native/NativeDuelDecisions.js';

const ROOT = new URL('../', import.meta.url);
const OUTPUT = 'docs/audits/artifacts/tcg-summoning-complete-2026-10-08.json';
const sha256 = value => createHash('sha256').update(value).digest('hex');
const clean = value => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? String(item) : item));
const zeroDraw = { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 };
const BEFORE_RUNTIME = 'docs/audits/artifacts/tcg-summoning-complete-2026-10-08/NativeDuelRuntime-before.js.txt';

async function fixture(inputs, core, { controller, choose, defaultFlags = false,
  runtimeFactory = createNativeDuelRuntime, expectedFlags = NATIVE_TCG_DUEL_FLAGS }) {
  const messages = [], responses = [], decisions = [], events = [], cards = [], loadedScripts = new Map();
  let game, started = false, effectiveFlags;
  game = new NativeDuelGame({
    onAnimation: event => events.push(event),
    onDecision: request => {
      const prompt = game.pendingNativeDecision;
      const options = { constants: game.runtime.constants, metadata: inputs.resources.metadata,
        cardReader: game.runtime.options.cardReader, isCardDeclarable: game.runtime.isCardDeclarable.bind(game.runtime) };
      const custom = choose?.({ prompt, request, game });
      if (custom?.handled) return custom.value;
      const response = chooseNativeAIResponse(prompt, options);
      assert.ok(response, `No legal response for ${request.nativeKind}`);
      assert.ok(validateNativeDuelResponse(prompt, response, options));
      if ('indicies' in response) return response.indicies?.map(String) ?? null;
      if ('places' in response) {
        const places = nativeSelectablePlaces(prompt);
        return response.places.map(place => String(places.findIndex(candidate => (
          candidate.player === place.player && candidate.location === place.location && candidate.sequence === place.sequence))));
      }
      if ('yes' in response) return response.yes;
      if ('position' in response) return response.position;
      if ('index' in response) return response.index;
      if ('value' in response) return response.value;
      return request.choices?.[0]?.value;
    }
  }, {
    rulesMode: 'native', nativeResources: inputs.resources, seed: [1n, 2n, 3n, 4n], aiDelay: 0,
    teams: [zeroDraw, zeroDraw], validateDeck: () => ({ valid: true, issues: [] }),
    createRuntime: async options => {
      const reader = createNativeScriptReader(options.scripts);
      const scriptReader = filename => {
        const source = reader(filename); loadedScripts.set(filename, source); return source;
      };
      Object.defineProperty(scriptReader, 'correctionsApplied', { value: reader.correctionsApplied });
      const coreWithRecordedOptions = { ...core, createDuel: options => {
        effectiveFlags = options.flags; return core.createDuel(options);
      } };
      const runtimeOptions = { ...options, scriptReader, coreModule: inputs.coreModule, createCore: () => coreWithRecordedOptions };
      // Deliberately omit the facade's flags for two complete real duels: the
      // bare runtime must itself choose the current TCG profile.
      if (defaultFlags) delete runtimeOptions.flags;
      const runtime = await runtimeFactory(runtimeOptions);
      const advance = runtime.advance.bind(runtime), respond = runtime.respond.bind(runtime);
      runtime.advance = options => {
        const result = advance(options); messages.push(...result.messages);
        assert.equal(result.messages.some(message => message.type === runtime.constants.OcgMessageType.RETRY), false);
        assert.deepEqual(runtime.errors, []); return result;
      };
      runtime.respond = response => {
        const prompt = runtime.pendingPrompt;
        assert.ok(game._validateResponse(prompt, response), 'Every command/decision belongs to the actual offered prompt');
        responses.push({ prompt: clean(prompt), response: clean(response) });
        decisions.push({ prompt, response }); return respond(response);
      };
      return runtime;
    }
  });
  assert.equal(await game.initDecks([{ id: 46986414 }], [{ id: 46986414 }], [], [],
    { startingPlayer: controller === 1 ? 'opponent' : 'player' }), true);
  const C = game.runtime.constants, L = C.OcgLocation;
  const add = (code, location, sequence = 0, { side = 'player', faceDown = false, faceUpExtra = false } = {}) => {
    assert.equal(started, false);
    const card = { code, controller: game.controllerForSide(side), location, sequence,
      position: faceDown || [L.HAND, L.DECK].includes(location) || location === L.EXTRA && !faceUpExtra
        ? C.OcgPosition.FACEDOWN_DEFENSE : C.OcgPosition.FACEUP_ATTACK };
    cards.push(card); game.runtime.addCard(card);
  };
  const start = async () => {
    started = true; assert.equal(await game.start(), true);
    assert.equal(game.currentTurn, 'player'); assert.equal(game.playerController, controller);
  };
  const hand = code => game.playerHand.find(card => card.id === code);
  const extra = code => [...game.playerExtraDeck, ...game.playerFaceUpExtraDeck].find(card => card.id === code);
  const monster = code => game.getMonsterEntries('player').find(entry => entry.card.id === code);
  const cast = async (code, zone = 0) => {
    assert.ok(hand(code), `Missing spell ${code}`);
    assert.equal(await game.playSpellTrap(hand(code).uid, zone), true);
  };
  const proof = () => {
    assert.equal(game.nativeError, null); assert.deepEqual(game.runtime.errors, []);
    assert.equal(effectiveFlags, expectedFlags);
    assert.equal(effectiveFlags & (C.OcgDuelMode.TEST_MODE | C.OcgDuelMode.PSEUDO_SHUFFLE), 0n);
    const copies = new Map();
    for (const card of cards) {
      const key = `${card.controller}:${card.code}`; copies.set(key, (copies.get(key) ?? 0) + 1);
      assert.ok(copies.get(key) <= 3, 'At most three copies in every controlled card fixture');
    }
    return { controller, seed: ['1', '2', '3', '4'], flags: String(effectiveFlags),
      runtimeOptionsFlags: game.runtime.options.flags == null ? null : String(game.runtime.options.flags),
      flagsOmittedBeforeRuntimeCreation: defaultFlags, fixtureCards: cards,
      initialBaseDecks: [[46986414], [46986414]], teams: [zeroDraw, zeroDraw],
      allFixturesBeforeStart: true, typedResponses: responses, retryCount: 0, luaErrorCount: 0,
      messageTypes: [...new Set(messages.map(message => message.type))],
      loadedScripts: [...loadedScripts].map(([filename, effective]) => {
        const original = inputs.resources.scripts.get(filename) ?? inputs.resources.scripts.get(`official/${filename}`) ?? null;
        return { filename, originalSha256: original == null ? null : sha256(original),
          effectiveSha256: effective == null ? null : sha256(effective),
          originalUnchanged: original === effective };
      }) };
  };
  return { game, C, L, add, start, hand, extra, monster, cast, proof, decisions, events, messages };
}

const cases = [];
const scenario = (id, families, run, options = {}) => cases.push({ id, families, run, options });

scenario('normal-summon-shares-once-per-turn-with-set', ['normal', 'set', 'runtime-tcg-default'], async s => {
  s.add(97590747, s.L.HAND); s.add(76812113, s.L.HAND); await s.start();
  const card = s.hand(97590747); assert.ok(s.game.getAvailableActions().normalSummonCardUids.includes(card.uid));
  assert.equal(await s.game.summonMonster(card.uid, 0), true);
  assert.equal(s.monster(97590747).card.nativePosition, s.C.OcgPosition.FACEUP_ATTACK);
  assert.deepEqual(s.game.getAvailableActions().normalSummonCardUids, []);
  assert.deepEqual(s.game.getAvailableActions().monsterSetCardUids, []);
  assert.equal(await s.game.setMonsterFaceDown(s.hand(76812113).uid, 1), false);
  assert.equal(await s.game.summonMonster(s.hand(76812113).uid, 1), false);
  return { normalCount: 1, secondNormalOrSetOffered: false, normalPosition: 'face-up attack' };
}, { defaultFlags: true });

scenario('normal-set-shares-count-and-cannot-flip-that-turn', ['normal', 'set', 'flip'], async s => {
  s.add(97590747, s.L.HAND); s.add(76812113, s.L.HAND); await s.start();
  assert.equal(await s.game.setMonsterFaceDown(s.hand(97590747).uid, 0), true);
  const card = s.monster(97590747).card; assert.equal(card.isSetFaceDown, true);
  assert.deepEqual(s.game.getAvailableActions().normalSummonCardUids, []);
  assert.deepEqual(s.game.getAvailableActions().monsterSetCardUids, []);
  assert.equal(s.game.getAvailableActions().positionChangeCardUids.includes(card.uid), false);
  assert.equal(await s.game.toggleMonsterPosition(0), false);
  assert.equal(s.events.some(event => event.type === 'summon' && Number(event.card?.id) === 97590747), false);
  return { normalSetCount: 1, sameTurnFlipOffered: false, successfulSummonEvent: false };
});

for (const [level, code, tributeCount, faceDown] of [[5, 28279543, 1, false], [6, 70781052, 1, true], [8, 89631139, 2, false]]) {
  scenario(`tribute-level-${level}-${faceDown ? 'set' : 'summon'}`, ['tribute', faceDown ? 'set' : 'normal'], async s => {
    s.add(97590747, s.L.MZONE, 0, { faceDown: true });
    if (tributeCount === 2) s.add(76812113, s.L.MZONE, 1);
    s.add(code, s.L.HAND); await s.start();
    const action = faceDown ? 'monsterSetCardUids' : 'normalSummonCardUids';
    assert.ok(s.game.getAvailableActions()[action].includes(s.hand(code).uid));
    assert.equal(await s.game[faceDown ? 'setMonsterFaceDown' : 'summonMonster'](s.hand(code).uid, 2), true);
    assert.equal(s.monster(code).card.isSetFaceDown, faceDown);
    assert.equal(s.game.playerGraveyard.length, tributeCount);
    const tribute = s.decisions.find(({ prompt }) => prompt.type === s.C.OcgMessageType.SELECT_TRIBUTE);
    assert.ok(tribute); assert.equal(tribute.response.indicies.length, tributeCount);
    assert.equal(s.game.getMonsterEntries('player').length, 1);
    return { level, tributeCount, faceDown, ownFaceDownTributeAccepted: true };
  });
}

scenario('insufficient-tributes-suppress-normal-and-set-actions', ['normal', 'tribute'], async s => {
  for (const code of [28279543, 89631139]) s.add(code, s.L.HAND);
  await s.start(); assert.deepEqual(s.game.getAvailableActions().normalSummonCardUids, []);
  assert.deepEqual(s.game.getAvailableActions().monsterSetCardUids, []);
  for (const code of [28279543, 89631139]) {
    assert.equal(await s.game.summonMonster(s.hand(code).uid, 0), false);
    assert.equal(await s.game.setMonsterFaceDown(s.hand(code).uid, 0), false);
  }
  assert.equal(s.game.playerHand.length, 2);
  return { missingTributeNormalAndSetOffered: false, handUnchanged: true };
});

scenario('full-main-zones-suppress-level-four-normal-and-set', ['normal', 'set', 'zones'], async s => {
  [97590747, 76812113, 32452818, 66602787, 5053103].forEach((code, sequence) => s.add(code, s.L.MZONE, sequence));
  s.add(43096270, s.L.HAND); await s.start();
  assert.deepEqual(s.game.getAvailableActions().normalSummonCardUids, []);
  assert.deepEqual(s.game.getAvailableActions().monsterSetCardUids, []);
  assert.equal(await s.game.summonMonster(s.hand(43096270).uid, 0), false);
  assert.equal(await s.game.setMonsterFaceDown(s.hand(43096270).uid, 0), false);
  assert.equal(s.game.getMonsterEntries('player').length, 5);
  return { mainZonesOccupied: 5, illegalNormalAndSetOffered: false };
});

scenario('double-summon-official-script-grants-exactly-one-extra-normal', ['normal', 'card-rule-exception'], async s => {
  for (const code of [97590747, 76812113, 32452818, 43422537]) s.add(code, s.L.HAND);
  await s.start(); await s.cast(43422537);
  assert.equal(await s.game.summonMonster(s.hand(97590747).uid, 0), true);
  assert.ok(s.game.getAvailableActions().monsterSetCardUids.includes(s.hand(76812113).uid));
  assert.equal(await s.game.setMonsterFaceDown(s.hand(76812113).uid, 1), true);
  assert.deepEqual(s.game.getAvailableActions().normalSummonCardUids, []);
  assert.equal(await s.game.summonMonster(s.hand(32452818).uid, 2), false);
  return { normalOrSetCount: 2, thirdOffered: false, officialException: 43422537 };
});

scenario('flip-summon-next-turn-and-once-per-turn-position', ['flip', 'set', 'position'], async s => {
  s.add(97590747, s.L.HAND); await s.start();
  assert.equal(await s.game.setMonsterFaceDown(s.hand(97590747).uid, 0), true);
  assert.equal(await s.game.changePhase('end'), true);
  const set = s.monster(97590747).card;
  assert.ok(s.game.getAvailableActions().positionChangeCardUids.includes(set.uid));
  assert.equal(await s.game.toggleMonsterPosition(0), true);
  const card = s.monster(97590747).card;
  assert.equal(card.isSetFaceDown, false); assert.equal(card.summonType, 'flip');
  assert.equal(s.game.getAvailableActions().positionChangeCardUids.includes(card.uid), false);
  assert.equal(await s.game.toggleMonsterPosition(0), false);
  return { nextOwnTurn: true, flipToAttack: true, secondPositionChangeOffered: false };
});

scenario('polymerization-accepts-own-face-down-fusion-materials', ['fusion', 'materials', 'face-down'], async s => {
  for (let sequence = 0; sequence < 3; sequence++) s.add(89631139, s.L.MZONE, sequence, { faceDown: true });
  s.add(24094653, s.L.HAND); s.add(23995346, s.L.EXTRA); await s.start();
  await s.cast(24094653); assert.ok(s.monster(23995346));
  assert.equal(s.game.playerGraveyard.filter(card => card.id === 89631139).length, 3);
  assert.equal(s.monster(23995346).card.wasProperlySpecialSummoned, true);
  return { ownSetMaterialsConsumed: 3, fusionSummonConfirmed: true };
});

scenario('wrong-fusion-materials-suppress-polymerization', ['fusion', 'materials'], async s => {
  s.add(24094653, s.L.HAND); s.add(89631139, s.L.HAND); s.add(97590747, s.L.HAND);
  s.add(23995346, s.L.EXTRA); await s.start();
  assert.equal(s.game.canActivateSpell(s.hand(24094653)), false);
  assert.equal(await s.game.playSpellTrap(s.hand(24094653).uid, 0), false);
  assert.equal(s.game.playerHand.length, 3); assert.equal(s.game.playerGraveyard.length, 0);
  return { missingNamedMaterials: true, illegalFusionActivationOffered: false };
});

scenario('wrong-synchro-level-suppresses-procedure', ['synchro', 'materials', 'levels'], async s => {
  s.add(63977008, s.L.MZONE, 0); s.add(97590747, s.L.MZONE, 1); s.add(44508094, s.L.EXTRA); await s.start();
  assert.deepEqual(s.game.getAvailableActions().synchroExtraUids, []);
  assert.equal(await s.game.summonExtraDeck(s.extra(44508094).uid), false);
  assert.equal(s.game.playerGraveyard.length, 0);
  return { tunerLevel: 3, nonTunerLevel: 4, requiredLevel: 8, offered: false };
});

scenario('face-down-synchro-material-suppresses-procedure', ['synchro', 'materials', 'face-down'], async s => {
  s.add(63977008, s.L.MZONE, 0, { faceDown: true }); s.add(70095154, s.L.MZONE, 1);
  s.add(44508094, s.L.EXTRA); await s.start();
  assert.deepEqual(s.game.getAvailableActions().synchroExtraUids, []);
  assert.equal(await s.game.summonExtraDeck(s.extra(44508094).uid), false);
  return { matchingLevelSum: 8, facedownTunerAccepted: false };
});

scenario('xyz-rank-and-link-rating-are-not-level-four-materials', ['xyz', 'materials', 'rank', 'link-rating'], async s => {
  s.add(84013237, s.L.MZONE, 0); s.add(97590747, s.L.MZONE, 1); s.add(67598234, s.L.MZONE, 5);
  s.add(84013237, s.L.EXTRA); await s.start();
  assert.equal(s.monster(84013237).card.getLevel(), 0); assert.equal(s.monster(84013237).card.getRank(), 4);
  assert.equal(s.monster(67598234).card.getLevel(), 0);
  assert.deepEqual(s.game.getAvailableActions().xyzExtraUids, []);
  assert.equal(await s.game.summonExtraDeck(s.extra(84013237).uid), false);
  return { xyzRank: 4, xyzLevel: 0, linkLevel: 0, illegalXyzOffered: false };
});

scenario('face-down-xyz-material-suppresses-procedure', ['xyz', 'materials', 'face-down'], async s => {
  s.add(97590747, s.L.MZONE, 0); s.add(76812113, s.L.MZONE, 1, { faceDown: true });
  s.add(84013237, s.L.EXTRA); await s.start();
  assert.deepEqual(s.game.getAvailableActions().xyzExtraUids, []);
  assert.equal(await s.game.summonExtraDeck(s.extra(84013237).uid), false);
  return { levels: [4, 4], facedownMaterialAccepted: false };
});

scenario('link-spider-unlocks-a-real-pointed-main-zone', ['link', 'linked-zones', 'extra-monster-zones'], async s => {
  s.add(97590747, s.L.MZONE, 0); s.add(76812113, s.L.MZONE, 2);
  s.add(98978921, s.L.EXTRA); s.add(98978921, s.L.EXTRA); await s.start();
  assert.equal(await s.game.summonExtraDeck(s.extra(98978921).uid), true);
  const first = s.monster(98978921); assert.equal(first.zoneType, 'extra');
  assert.equal(await s.game.summonExtraDeck(s.extra(98978921).uid), true);
  const entries = s.game.getMonsterEntries('player').filter(entry => entry.card.id === 98978921);
  assert.equal(entries.length, 2); assert.equal(entries.filter(entry => entry.zoneType === 'main').length, 1);
  const places = s.decisions.filter(({ prompt }) => prompt.type === s.C.OcgMessageType.SELECT_PLACE);
  assert.ok(places.some(({ prompt }) => nativeSelectablePlaces(prompt).some(place => place.sequence < 5)));
  return { first: 'shared extra zone', second: 'pointed main zone', nativePlaces: clean(places.map(({ prompt }) => nativeSelectablePlaces(prompt))) };
});

scenario('link-two-counts-as-two-materials-for-link-three', ['link', 'materials', 'link-rating'], async s => {
  s.add(97590747, s.L.MZONE, 0); s.add(76812113, s.L.MZONE, 1); s.add(32452818, s.L.MZONE, 2);
  s.add(77637979, s.L.EXTRA); s.add(67598234, s.L.EXTRA); await s.start();
  assert.equal(await s.game.summonExtraDeck(s.extra(77637979).uid), true);
  assert.equal(s.game.getMonsterEntries('player').length, 2);
  assert.ok(s.game.getAvailableActions().linkExtraUids.includes(s.extra(67598234).uid));
  assert.equal(await s.game.summonExtraDeck(s.extra(67598234).uid), true);
  assert.equal(s.game.getMonsterEntries('player').length, 1);
  assert.equal(s.monster(67598234).card.linkRating, 3);
  assert.ok(s.game.playerGraveyard.some(card => card.id === 77637979));
  return { consumedMonsterCount: 2, linkValues: [2, 1], resultingLinkRating: 3 };
});

scenario('link-two-can-count-as-one-material-for-link-three', ['link', 'materials', 'link-rating'], async s => {
  s.add(77637979, s.L.MZONE, 5); s.add(97590747, s.L.MZONE, 0); s.add(76812113, s.L.MZONE, 1);
  s.add(67598234, s.L.EXTRA); await s.start();
  assert.ok(s.game.getAvailableActions().linkExtraUids.includes(s.extra(67598234).uid));
  assert.equal(await s.game.summonExtraDeck(s.extra(67598234).uid), true);
  assert.equal(s.game.playerGraveyard.length, 3);
  assert.equal(s.game.getMonsterEntries('player').length, 1);
  assert.equal(s.monster(67598234).card.linkRating, 3);
  return { consumedMonsterCount: 3, linkValues: [1, 1, 1], resultingLinkRating: 3 };
}, { choose: ({ prompt, game }) => {
  if (prompt.type !== game.runtime.constants.OcgMessageType.SELECT_UNSELECT_CARD) return undefined;
  if (prompt.can_finish && prompt.select_cards.length) return { handled: true, value: 0 };
  return undefined;
} });

scenario('effect-monster-link-requirement-rejects-normal-monsters', ['link', 'materials'], async s => {
  s.add(97590747, s.L.MZONE, 0); s.add(76812113, s.L.MZONE, 1); s.add(32452818, s.L.MZONE, 2);
  s.add(1861629, s.L.EXTRA); await s.start();
  assert.deepEqual(s.game.getAvailableActions().linkExtraUids, []);
  assert.equal(await s.game.summonExtraDeck(s.extra(1861629).uid), false);
  return { sufficientLinkValue: 3, effectMaterialsPresent: false, offered: false };
});

scenario('link-cannot-change-position-or-be-targeted-by-book-of-moon', ['link', 'position', 'face-down'], async s => {
  s.add(97590747, s.L.MZONE, 0); s.add(98978921, s.L.EXTRA); s.add(14087893, s.L.HAND); await s.start();
  assert.equal(await s.game.summonExtraDeck(s.extra(98978921).uid), true);
  const link = s.monster(98978921);
  assert.equal(s.game.getAvailableActions().positionChangeCardUids.includes(link.card.uid), false);
  assert.equal(await s.game.toggleMonsterPosition({ zoneType: link.zoneType, zoneIndex: link.zoneIndex }), false);
  assert.equal(s.game.canActivateSpell(s.hand(14087893)), false);
  assert.equal(await s.game.playSpellTrap(s.hand(14087893).uid, 0), false);
  assert.equal(link.card.getDef(), null);
  return { defenseValue: null, defenseChangeOffered: false, bookOfMoonTargetOffered: false };
});

for (const procedure of ['fusion', 'synchro', 'xyz']) {
  scenario(`mr5-${procedure}-uses-main-zone-with-both-extra-zones-occupied`, [procedure, 'master-rule-2020', 'zones'], async s => {
    s.add(28279543, s.L.MZONE, 5); s.add(28279543, s.L.MZONE, 5, { side: 'opponent' });
    let code;
    if (procedure === 'fusion') {
      code = 23995346; for (let count = 0; count < 3; count++) s.add(89631139, s.L.HAND); s.add(24094653, s.L.HAND);
    } else if (procedure === 'synchro') {
      code = 44508094; s.add(63977008, s.L.MZONE, 0); s.add(70095154, s.L.MZONE, 1);
    } else { code = 84013237; s.add(97590747, s.L.MZONE, 0); s.add(76812113, s.L.MZONE, 1); }
    s.add(code, s.L.EXTRA); await s.start();
    assert.equal(s.game.extraMonsterZones.filter(Boolean).length, 2);
    if (procedure === 'fusion') await s.cast(24094653);
    else assert.equal(await s.game.summonExtraDeck(s.extra(code).uid), true);
    assert.equal(s.monster(code).zoneType, 'main');
    assert.equal(s.monster(code).card.wasProperlySpecialSummoned, true);
    return { occupiedExtraZones: 2, firstExtraSummonDestination: 'unlinked main zone', procedure };
  });
}

for (const procedure of ['ritual', 'synchro', 'xyz', 'link']) {
  scenario(`proper-${procedure}-summon-destruction-and-main-zone-revival`, [procedure, 'proper-summon', 'revival'], async s => {
    let code;
    s.add(53129443, s.L.HAND); s.add(83764718, s.L.HAND);
    if (procedure === 'ritual') { code = 5405694; for (const id of [55761792, code, 89631139]) s.add(id, s.L.HAND); }
    if (procedure === 'synchro') { code = 44508094; s.add(63977008, s.L.MZONE, 0); s.add(70095154, s.L.MZONE, 1); }
    if (procedure === 'xyz') { code = 84013237; s.add(97590747, s.L.MZONE, 0); s.add(76812113, s.L.MZONE, 1); }
    if (procedure === 'link') { code = 98978921; s.add(97590747, s.L.MZONE, 0); }
    if (procedure !== 'ritual') s.add(code, s.L.EXTRA);
    await s.start();
    if (procedure === 'ritual') await s.cast(55761792);
    else assert.equal(await s.game.summonExtraDeck(s.extra(code).uid), true);
    assert.equal(s.monster(code).card.wasProperlySpecialSummoned, true);
    await s.cast(53129443);
    assert.equal(s.game.playerGraveyard.find(card => card.id === code).wasProperlySpecialSummoned, true);
    await s.cast(83764718);
    const revived = s.monster(code); assert.ok(revived); assert.equal(revived.zoneType, 'main');
    assert.equal(revived.card.wasProperlySpecialSummoned, true);
    if (procedure === 'xyz') assert.equal(revived.card.xyzMaterials.length, 0);
    const summons = s.events.filter(event => event.type === 'summon' && Number(event.card?.id) === code);
    assert.deepEqual(summons.map(event => event.summonType), [procedure, 'special']);
    assert.equal(summons[1].nativeRevivalConfirmed, true);
    return { procedure, properHistoryPreservedInGraveyard: true, revivalDestination: 'main',
      nativeSummonTypes: [procedure, 'special'], xyzMaterialsAfterRevival: procedure === 'xyz' ? 0 : null };
  }, { choose: ({ prompt, game }) => {
    if (prompt.type !== game.runtime.constants.OcgMessageType.SELECT_CARD) return undefined;
    const extraCode = prompt.selects.findIndex(card => [5405694, 44508094, 84013237, 98978921].includes(card.code));
    return extraCode < 0 ? undefined : { handled: true, value: [String(extraCode)] };
  } });
}

scenario('all-improper-special-summon-families-excluded-from-monster-reborn', ['fusion', 'ritual', 'synchro', 'xyz', 'link', 'pendulum', 'proper-summon'], async s => {
  for (const code of [23995346, 5405694, 44508094, 84013237, 98978921, 45627618, 89631139]) s.add(code, s.L.GRAVE);
  s.add(83764718, s.L.HAND); await s.start(); await s.cast(83764718);
  const targets = s.decisions.filter(({ prompt }) => prompt.type === s.C.OcgMessageType.SELECT_CARD)
    .flatMap(({ prompt }) => prompt.selects.map(card => card.code));
  assert.deepEqual([...new Set(targets)], [89631139]);
  assert.ok(s.monster(89631139)); assert.equal(s.game.playerGraveyard.length, 7); // Six excluded monsters plus Reborn itself.
  return { offeredRebornTargets: targets, excludedImproperFamilies: ['fusion', 'ritual', 'synchro', 'xyz', 'link', 'xyz-pendulum'] };
});

scenario('ordinary-pendulum-discarded-from-hand-does-not-require-proper-history', ['pendulum', 'revival', 'proper-summon'], async s => {
  s.add(16178681, s.L.GRAVE); s.add(83764718, s.L.HAND); await s.start(); await s.cast(83764718);
  assert.ok(s.monster(16178681)); assert.equal(s.monster(16178681).zoneType, 'main');
  return { ordinaryPendulumCanBeRevived: true, specialSummonOnlyRestrictionIncorrectlyApplied: false };
});

scenario('pendulum-levels-equal-to-scales-excluded', ['pendulum', 'levels'], async s => {
  for (const code of [94415058, 51531505, 97590747, 89631139, 32274490, 16178681]) s.add(code, s.L.HAND);
  await s.start();
  assert.equal(await s.game.activatePendulumScale(s.hand(94415058).uid, 0), true);
  assert.equal(await s.game.activatePendulumScale(s.hand(51531505).uid, 4), true);
  const valid = s.hand(97590747);
  assert.equal(await s.game.performPendulumSummon('player', [valid.uid]), true);
  assert.ok(s.monster(97590747)); assert.ok(s.hand(89631139));
  const materials = s.decisions.filter(({ prompt }) => [s.C.OcgMessageType.SELECT_CARD, s.C.OcgMessageType.SELECT_UNSELECT_CARD].includes(prompt.type))
    .flatMap(({ prompt }) => (prompt.selects ?? prompt.select_cards ?? []).map(card => card.code));
  assert.ok(materials.includes(97590747)); assert.equal(materials.includes(89631139), false);
  assert.equal(materials.includes(32274490), false);
  assert.equal(s.game.getAvailableActions().canPendulumSummon, false);
  return { scales: [1, 8], levelOneBoundaryOffered: false, levelEightBoundaryOffered: false, oncePerTurnEnforced: true };
});

scenario('equal-pendulum-scales-offer-no-pendulum-summon', ['pendulum', 'levels'], async s => {
  s.add(94415058, s.L.HAND); s.add(94415058, s.L.HAND); s.add(97590747, s.L.HAND); await s.start();
  assert.equal(await s.game.activatePendulumScale(s.hand(94415058).uid, 0), true);
  assert.equal(await s.game.activatePendulumScale(s.hand(94415058).uid, 4), true);
  assert.equal(s.game.getAvailableActions().canPendulumSummon, false);
  assert.equal(await s.game.performPendulumSummon(), false);
  return { equalScales: [1, 1], procedureOffered: false };
});

scenario('improper-xyz-pendulum-in-face-up-extra-not-pendulum-summonable', ['pendulum', 'xyz', 'proper-summon'], async s => {
  s.add(94415058, s.L.HAND); s.add(51531505, s.L.HAND);
  s.add(45627618, s.L.EXTRA, 0, { faceUpExtra: true }); await s.start();
  assert.equal(await s.game.activatePendulumScale(s.hand(94415058).uid, 0), true);
  assert.equal(await s.game.activatePendulumScale(s.hand(51531505).uid, 4), true);
  assert.equal(s.extra(45627618).wasProperlySpecialSummoned, false);
  assert.equal(s.game.getAvailableActions().canPendulumSummon, false);
  assert.equal(await s.game.performPendulumSummon(), false);
  return { rankAndPrintedLevel: 7, requiredFirstXyzSummon: true, illegalPendulumProcedureOffered: false };
});

scenario('destroyed-pendulum-scale-and-monster-go-to-face-up-extra', ['pendulum', 'destinations'], async s => {
  s.add(16178681, s.L.HAND); s.add(5318639, s.L.HAND); s.add(53129443, s.L.HAND);
  s.add(94415058, s.L.MZONE, 0); await s.start();
  assert.equal(await s.game.activatePendulumScale(s.hand(16178681).uid, 0), true);
  await s.cast(5318639, 1); await s.cast(53129443);
  assert.deepEqual(s.game.playerFaceUpExtraDeck.map(card => card.id).sort(), [16178681, 94415058]);
  assert.equal(s.game.playerGraveyard.some(card => [16178681, 94415058].includes(card.id)), false);
  return { scaleDestination: 'face-up extra', monsterDestination: 'face-up extra', wronglySentToGraveyard: false };
});

scenario('actual-scapegoat-tokens-cannot-xyz-but-can-link-next-turn', ['tokens', 'xyz', 'link', 'materials'], async s => {
  s.add(73915051, s.L.HAND); s.add(54366836, s.L.EXTRA); s.add(98978921, s.L.EXTRA); await s.start();
  await s.cast(73915051);
  assert.equal(s.game.getMonsterEntries('player').length, 4);
  assert.ok(s.game.getMonsterEntries('player').every(entry => entry.card.isToken));
  assert.deepEqual(s.game.getAvailableActions().xyzExtraUids, []);
  assert.deepEqual(s.game.getAvailableActions().linkExtraUids, []); // Scapegoat's own same-turn restriction.
  assert.equal(await s.game.changePhase('end'), true);
  assert.deepEqual(s.game.getAvailableActions().xyzExtraUids, []);
  assert.ok(s.game.getAvailableActions().linkExtraUids.includes(s.extra(98978921).uid));
  assert.equal(await s.game.summonExtraDeck(s.extra(98978921).uid), true);
  assert.equal(s.game.getMonsterEntries('player').filter(entry => entry.card.isToken).length, 3);
  assert.equal(s.game.playerGraveyard.some(card => card.isToken), false);
  return { nativeCreatedTokens: 4, xyzMaterialsAccepted: false, nextTurnNormalTokenLinkMaterialAccepted: true, materialTokenInGraveyard: false };
});

scenario('actual-scapegoat-tokens-can-be-non-tuner-synchro-materials', ['tokens', 'synchro', 'materials'], async s => {
  s.add(73915051, s.L.HAND); s.add(63977008, s.L.HAND); s.add(60800381, s.L.EXTRA); await s.start();
  await s.cast(73915051); assert.equal(await s.game.changePhase('end'), true);
  assert.equal(await s.game.summonMonster(s.hand(63977008).uid, 4), true);
  assert.ok(s.game.getAvailableActions().synchroExtraUids.includes(s.extra(60800381).uid));
  assert.equal(await s.game.summonExtraDeck(s.extra(60800381).uid), true);
  assert.ok(s.monster(60800381));
  assert.equal(s.game.getMonsterEntries('player').filter(entry => entry.card.isToken).length, 2);
  assert.equal(s.game.playerGraveyard.some(card => card.isToken), false);
  return { tunerLevel: 3, materialTokenLevels: [1, 1], resultingLevel: 5, remainingTokens: 2, materialTokensInGraveyard: false };
});

export const TCG_SUMMONING_CASE_IDS = Object.freeze(cases.map(item => item.id));

export async function runTCGSummoningCase(inputs, core, id, controller) {
  const entry = cases.find(item => item.id === id); assert.ok(entry, id);
  const s = await fixture(inputs, core, { ...entry.options, controller });
  try {
    const outcome = await entry.run(s);
    const proof = s.proof();
    // The production public-reveal policy also inspects eight source scripts
    // through this reader. Its existing guarded Duel Tower fix is read during
    // setup, although no fixture contains or executes that Field Spell.
    assert.ok(proof.loadedScripts.every(source => source.originalUnchanged || source.filename === 'c43940008.lua'
      && source.originalSha256 === '43d4454ff05c1e05ec47eb69023e45750b4e0e9bf186c4b718e72432ba0f1460'
      && source.effectiveSha256 === '32bfc7a639718a0f1631dd6eec0ee9018334e7273aeabb09065d5e0eb213a11e'));
    assert.equal(proof.fixtureCards.some(card => card.code === 43940008), false);
    return { id, controller, families: entry.families, passed: true, outcome, ...proof };
  } finally { s.game.dispose(); }
}

export async function auditTCGSummoning(inputs, core) {
  const scenarios = [];
  for (const controller of [0, 1]) for (const id of TCG_SUMMONING_CASE_IDS) {
    try { scenarios.push(await runTCGSummoningCase(inputs, core, id, controller)); }
    catch (error) { error.message = `${id} / controller ${controller}: ${error.message}`; throw error; }
  }
  const beforeBytes = await readFile(new URL(BEFORE_RUNTIME, ROOT));
  const beforeSource = beforeBytes.toString('utf8').replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g,
    (_, quote, path) => `from ${quote}${new URL(path, new URL('src/core/native/NativeDuelRuntime.js', ROOT)).href}${quote}`);
  const beforeRuntime = await import(`data:text/javascript;base64,${Buffer.from(beforeSource).toString('base64')}`);
  const beforeComparisons = [];
  for (const controller of [0, 1]) {
    const entry = cases.find(item => item.id === 'normal-summon-shares-once-per-turn-with-set');
    const s = await fixture(inputs, core, { ...entry.options, controller,
      runtimeFactory: beforeRuntime.createNativeDuelRuntime, expectedFlags: inputs.coreModule.OcgDuelMode.MODE_MR5 });
    try {
      const outcome = await entry.run(s), before = s.proof();
      const after = scenarios.find(item => item.id === entry.id && item.controller === controller);
      assert.deepEqual(outcome, after.outcome);
      beforeComparisons.push({ id: entry.id, controller, outcome, ...before,
        missingBefore: ['TCG_SEGOC_NONPUBLIC', 'TCG_SEGOC_FIRSTTRIGGER'],
        afterFlags: after.flags, basicNormalOutcomeUnchanged: true });
    } finally { s.game.dispose(); }
  }
  const sourcePaths = ['src/core/native/NativeDuelRuntime.js', 'src/core/native/NativeTCGRuleProfile.js',
    'src/core/native/NativeDuelGame.js', 'src/core/native/NativeDuelDecisions.js', 'scripts/audit-tcg-summoning-complete.mjs'];
  const sourcePins = await Promise.all(sourcePaths.map(async path => {
    const bytes = await readFile(new URL(path, ROOT)); return { path, sha256: sha256(bytes), bytes: bytes.length };
  }));
  const preserved = 'docs/audits/artifacts/native-field-runtime-continuation-2026-10-08.json';
  const fieldBytes = await readFile(new URL(preserved, ROOT));
  assert.equal(sha256(fieldBytes), '420219317a89ab1dc1c7dbd8d766c8e042d972e58176a0d2d4ba2c366ecaa3ac',
    'All 406 previous Field scenarios remain byte-identical');
  return { format: 'tcg-summoning-complete-v1', generatedAt: new Date().toISOString(), ok: true,
    scope: 'General TCG summon procedures and restrictions; representative actual-WASM positive and negative cases, not every card ruling or visual/browser certification',
    caseCount: scenarios.length, distinctCaseCount: TCG_SUMMONING_CASE_IDS.length, controllerIds: [0, 1],
    archivedBeforeRuntime: { path: BEFORE_RUNTIME, sha256: sha256(beforeBytes),
      fromCommit: 'b8e216cd53ccc640366c91755268291afb1840d2' }, beforeComparisonCount: 2, beforeComparisons,
    upstreamCoreRevision: inputs.coreBuild.coreRevision, wasmSha256: inputs.coreBuild.wasmSha256,
    tcgFlags: String(NATIVE_TCG_DUEL_FLAGS), forbiddenFlags: ['TEST_MODE', 'PSEUDO_SHUFFLE'],
    officialSources: [
      { url: 'https://www.yugioh-card.com/en/rulebook/', inspectedOn: '2026-10-08' },
      { url: 'https://img.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf', pages: [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 49], inspectedOn: '2026-10-08' },
      { url: 'https://www.yugioh-card.com/en/play/2021_rules_update/', inspectedOn: '2026-10-08' }
    ], sourcePins,
    existingFieldEvidence: { path: preserved, sha256: sha256(fieldBytes), scenarioCount: 406, modified: false },
    fixturesAreControlledMidGamePositions: true, strictDeckLegalityClaim: false, browserOrVisualClaim: false,
    scriptReaderEvidenceScope: 'Includes both native requests and production public-reveal source verification. The previously guarded Duel Tower correction is read during policy setup; no fixture contains that card. Scenario card Lua and procedure Lua are unchanged.',
    scenarios };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const inputs = await loadNativeAuditInputs(), core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const report = await auditTCGSummoning(inputs, core);
  await mkdir(new URL('docs/audits/artifacts/', ROOT), { recursive: true });
  await writeFile(new URL(OUTPUT, ROOT), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: report.ok, scenarios: report.caseCount, distinct: report.distinctCaseCount,
    unchangedScenarioCardLua: true, publicRevealPolicyAlsoReadsExistingGuardedDuelTowerCorrection: true, output: OUTPUT }));
}
