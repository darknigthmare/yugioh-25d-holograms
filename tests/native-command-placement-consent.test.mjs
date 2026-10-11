import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NativeDuelGame, NATIVE_TCG_DUEL_FLAGS } from '../src/core/native/NativeDuelGame.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { chooseNativeAIResponse, nativeSelectablePlaces, validateNativeDuelResponse }
  from '../src/core/native/NativeDuelDecisions.js';

const resourcesPromise = loadNativeCardResources({ fetch: async path => (
  new Response(await readFile(new URL(`../public${path}`, import.meta.url)))
) });
const zeroDrawTeam = { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 };

async function runPlacementConsent({ rejectedInitialIntent }) {
  const resources = await resourcesPromise;
  const messages = [], decisions = [], outcomes = [];
  let compulsorySelected = false;
  let placementRequests = 0;
  let game;
  game = new NativeDuelGame({
    onGameOver: result => outcomes.push(result),
    onDecision: request => {
      const prompt = game.pendingNativeDecision;
      const C = game.runtime.constants;
      const options = { constants: C, metadata: resources.metadata,
        cardReader: game.runtime.options.cardReader,
        isCardDeclarable: game.runtime.isCardDeclarable.bind(game.runtime) };
      let response = chooseNativeAIResponse(prompt, options);
      if (prompt.type === C.OcgMessageType.SELECT_CHAIN
        && messages.some(message => message.type === C.OcgMessageType.CHAINING && message.code === 63977008)) {
        const index = prompt.selects.findIndex(card => card.code === 94192409);
        if (index >= 0) {
          response = { ...response, index };
          compulsorySelected = true;
        }
      }
      if (prompt.type === C.OcgMessageType.SELECT_CARD) {
        const targetCode = compulsorySelected
          ? rejectedInitialIntent ? 89631139 : 63977008
          : 31560081;
        const index = prompt.selects.findIndex(card => card.code === targetCode);
        assert.ok(index >= 0, `Missing legal native target ${targetCode}`);
        response = { ...response, indicies: [index] };
      }
      if (prompt.type === C.OcgMessageType.SELECT_PLACE) {
        placementRequests += 1;
        // Only the rejected initial click asks for Junk's corrected zone 1.
        // The revived monster independently belongs in the human's zone 4.
        const sequence = rejectedInitialIntent && placementRequests === 1 ? 1 : 4;
        const place = nativeSelectablePlaces(prompt).find(candidate => (
          candidate.player === game.controllerForSide('player')
          && candidate.location === C.OcgLocation.MZONE && candidate.sequence === sequence
        ));
        assert.ok(place, `Core must offer the separately chosen zone ${sequence}`);
        response = { ...response, places: [place] };
      }
      assert.ok(response, `Unsupported native prompt ${request.nativeKind}`);
      assert.equal(validateNativeDuelResponse(prompt, response, options), true);
      decisions.push({ kind: request.nativeKind, response, afterMessage: messages.length });
      if ('indicies' in response) return response.indicies?.map(String) ?? null;
      if ('places' in response) {
        const places = nativeSelectablePlaces(prompt);
        return response.places.map(place => String(places.findIndex(candidate => (
          candidate.player === place.player && candidate.location === place.location
          && candidate.sequence === place.sequence
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
    teams: [zeroDrawTeam, zeroDrawTeam],
    validateDeck: () => ({ valid: true, issues: [] }),
    runtimeOptions: { onMessages: batch => messages.push(...batch) }
  });
  try {
    const base = { id: 46986414, name: 'Dark Magician', card_type: 'monster', type: 'Normal Monster' };
    assert.equal(await game.initDecks([base], [base], [], [], { startingPlayer: 'opponent' }), true);
    const C = game.runtime.constants;
    // All fixture cards use the normal NewCard API before Start. There is no
    // custom Lua, Debug effect, post-start injection, test flag or forced win.
    const add = (code, location, sequence = 0, position = C.OcgPosition.FACEUP_ATTACK) => {
      assert.equal(game.runtime.started, false);
      game.runtime.addCard({ code, controller: game.controllerForSide('player'), location, sequence, position });
    };
    add(63977008, C.OcgLocation.HAND);
    add(31560081, C.OcgLocation.GRAVE);
    add(94192409, C.OcgLocation.SZONE, 4, C.OcgPosition.FACEDOWN_DEFENSE);
    if (rejectedInitialIntent) add(89631139, C.OcgLocation.MZONE, 0);
    assert.equal(await game.start(), true);
    assert.equal(game.currentTurn, 'player');
    const firstMessage = messages.length;
    const junk = game.playerHand.find(card => card.id === 63977008);
    assert.ok(junk);
    assert.equal(await game.summonMonster(junk.uid, 0), true);
    const sequence = messages.slice(firstMessage);
    const summoning = sequence.filter(message => [C.OcgMessageType.SUMMONING,
      C.OcgMessageType.SPSUMMONING].includes(message.type));
    assert.deepEqual(summoning.map(message => [message.code, message.sequence]), [
      [63977008, rejectedInitialIntent ? 1 : 0], [31560081, 4]
    ]);
    assert.equal(placementRequests, rejectedInitialIntent ? 2 : 1);
    assert.equal(sequence.filter(message => message.type === C.OcgMessageType.SELECT_PLACE).length, 2);
    assert.equal(game.playerMonsters[4]?.id, 31560081);
    if (rejectedInitialIntent) {
      assert.equal(game.playerMonsters[1]?.id, 63977008);
      assert.ok(game.playerHand.some(card => card.id === 89631139));
    } else {
      assert.ok(game.playerHand.some(card => card.id === 63977008));
    }
    assert.equal(game.playerMonsters[0], null);
    assert.ok(game.playerGraveyard.some(card => card.id === 94192409));
    assert.deepEqual(sequence.filter(message => message.type === C.OcgMessageType.CHAINING)
      .map(message => message.code), [63977008, 94192409]);
    assert.equal(game.playerLP, 8000);
    assert.equal(game.opponentLP, 8000);
    assert.deepEqual(outcomes, []);
    assert.equal(game.winner, null);
    assert.equal(game.nativeError, null);
    assert.deepEqual(game.runtime.errors, []);
    assert.equal(messages.some(message => message.type === C.OcgMessageType.RETRY), false);
    assert.equal(game.runtime.options.flags, NATIVE_TCG_DUEL_FLAGS);
    assert.equal(game.runtime.options.flags & (C.OcgDuelMode.TEST_MODE | C.OcgDuelMode.PSEUDO_SHUFFLE), 0n);
    return { messages, decisions, placementRequests };
  } finally {
    game.dispose();
  }
}

test('a valid summon placement is consumed before a separate revival in the same native Chain', async () => {
  await runPlacementConsent({ rejectedInitialIntent: false });
});

test('a rejected summon placement cannot reappear after the occupied zone becomes free', async () => {
  await runPlacementConsent({ rejectedInitialIntent: true });
});
