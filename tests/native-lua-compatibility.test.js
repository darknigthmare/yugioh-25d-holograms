import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';

const SPIRIT_ELIMINATION = 69832741;
const DOGMATIKAMACABRE = 60921537;
const WHITE_KNIGHT = 40352445;
const WHITE_RELIC = 48654323;
const BLUE_EYES = 89631139;
const BLUE_EYES_ULTIMATE = 23995346;
const json = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);
const resourcesPromise = loadNativeCardResources({ fetch: async path => (
  new Response(await readFile(new URL(`../public${path}`, import.meta.url)))
) });

function luaAssert(duel, name, script) {
  assert.equal(duel.core.loadScript(duel.handle, name, script), true,
    `${name}: ${json(duel.errors)}`);
  assert.deepEqual(duel.errors, []);
}

function firstAvailablePlace(prompt, C) {
  for (const side of [0, 1]) {
    for (const [location, shift, count] of [[C.OcgLocation.MZONE, 0, 7], [C.OcgLocation.SZONE, 8, 8]]) {
      for (let sequence = 0; sequence < count; sequence += 1) {
        if ((prompt.field_mask & (1 << (side * 16 + shift + sequence))) === 0) {
          return [{ player: side ? 1 - prompt.player : prompt.player, location, sequence }];
        }
      }
    }
  }
  assert.fail('The core offered no legal card placement');
}

function activationDriver(duel) {
  const C = duel.constants;
  const messages = [];
  const decisions = [];
  function reachIdle() {
    for (let step = 0; step < 100; step += 1) {
      const result = duel.advance();
      messages.push(...result.messages);
      assert.equal(result.messages.some(message => message.type === C.OcgMessageType.RETRY), false,
        `Core rejected a decision: ${json(decisions)}`);
      assert.deepEqual(duel.errors, []);
      const prompt = result.prompt;
      assert.ok(prompt, `Expected a native decision: ${json(result)}`);
      if (prompt.type === C.OcgMessageType.SELECT_IDLECMD) return prompt;
      decisions.push(prompt);
      let response;
      switch (prompt.type) {
        case C.OcgMessageType.SELECT_CHAIN:
          assert.equal(prompt.forced, false);
          response = { type: C.OcgResponseType.SELECT_CHAIN, index: null };
          break;
        case C.OcgMessageType.SELECT_YESNO:
          // Dogmatikamacabre's optional post-Ritual Extra Deck effect.
          response = { type: C.OcgResponseType.SELECT_YESNO, yes: true };
          break;
        case C.OcgMessageType.SELECT_EFFECTYN:
          response = { type: C.OcgResponseType.SELECT_EFFECTYN, yes: false };
          break;
        case C.OcgMessageType.SELECT_OPTION:
          assert.equal(prompt.options.length, 2);
          response = { type: C.OcgResponseType.SELECT_OPTION, index: 1 };
          break;
        case C.OcgMessageType.SELECT_CARD: {
          const preferred = prompt.selects.findIndex(card => card.code === BLUE_EYES);
          const index = preferred >= 0 ? preferred : 0;
          assert.equal(prompt.min, 1);
          response = { type: C.OcgResponseType.SELECT_CARD, indicies: [index] };
          break;
        }
        case C.OcgMessageType.SELECT_UNSELECT_CARD: {
          const preferred = prompt.selects.findIndex(card => card.code === BLUE_EYES);
          response = { type: C.OcgResponseType.SELECT_UNSELECT_CARD,
            index: prompt.can_finish ? null : preferred >= 0 ? preferred : 0 };
          break;
        }
        case C.OcgMessageType.SELECT_SUM: {
          const index = prompt.selects.findIndex(card => card.code === BLUE_EYES);
          assert.ok(index >= 0, 'Blue-Eyes must remain a legal level-eight Ritual material');
          assert.equal(prompt.selects_must.length, 0);
          response = { type: C.OcgResponseType.SELECT_SUM, indicies: [index] };
          break;
        }
        case C.OcgMessageType.SELECT_POSITION:
          response = { type: C.OcgResponseType.SELECT_POSITION, position: C.OcgPosition.FACEUP_ATTACK };
          break;
        case C.OcgMessageType.SELECT_PLACE:
          response = { type: C.OcgResponseType.SELECT_PLACE, places: firstAvailablePlace(prompt, C) };
          break;
        default:
          assert.fail(`Unexpected Dogmatikamacabre decision: ${json(prompt)}`);
      }
      duel.respond(response);
    }
    assert.fail(`Activation failed to return to Main Phase: ${json(decisions)}`);
  }
  return {
    messages, decisions,
    activate(code) {
      const prompt = reachIdle();
      const index = prompt.activates.findIndex(card => card.code === code);
      assert.ok(index >= 0, `Official spell ${code} was not a legal activation: ${json(prompt)}`);
      duel.respond({ type: C.OcgResponseType.SELECT_IDLECMD,
        action: C.SelectIdleCMDAction.SELECT_ACTIVATE, index });
      return reachIdle();
    }
  };
}

test('official Dogmatikamacabre Ritual and Extra Deck effect resolve under real Spirit Elimination', async () => {
  const resources = await resourcesPromise;
  const originalScripts = new Map([SPIRIT_ELIMINATION, DOGMATIKAMACABRE, WHITE_KNIGHT, WHITE_RELIC]
    .map(code => [`c${code}.lua`, resources.scripts.get(`c${code}.lua`)]));
  const duel = await createNativeDuelRuntime({
    ...resources, seed: [1n, 2n, 3n, 4n],
    team1: { startingDrawCount: 0, drawCountPerTurn: 0 },
    team2: { startingDrawCount: 0, drawCountPerTurn: 0 }
  });
  const C = duel.constants;
  const add = (code, controller, location, sequence = 0) => duel.addCard({
    code, controller, location, sequence,
    position: location === C.OcgLocation.MZONE ? C.OcgPosition.FACEUP_ATTACK : C.OcgPosition.FACEDOWN_DEFENSE
  });
  try {
    // Declared legal initial state: the two face-up Ritual Monsters have already
    // been properly summoned; each player retains a Deck and an Extra Deck card.
    add(WHITE_KNIGHT, 0, C.OcgLocation.MZONE, 0);
    add(WHITE_RELIC, 0, C.OcgLocation.MZONE, 1);
    for (const code of [SPIRIT_ELIMINATION, DOGMATIKAMACABRE, WHITE_KNIGHT, BLUE_EYES]) {
      add(code, 0, C.OcgLocation.HAND);
    }
    for (const player of [0, 1]) {
      add(46986414, player, C.OcgLocation.DECK);
      add(BLUE_EYES_ULTIMATE, player, C.OcgLocation.EXTRA);
    }
    luaAssert(duel, 'native-constructor-compatibility-proof.lua', `
      assert(Group.NewGroup == Group.CreateGroup)
      assert(#Group.NewGroup() == 0)
      local c=Duel.GetFieldCard(0,LOCATION_MZONE,0)
      local g=Group.NewGroup(c)
      assert(#g == 1 and g:IsContains(c))
    `);
    duel.start();
    const driver = activationDriver(duel);
    driver.activate(SPIRIT_ELIMINATION);
    luaAssert(duel, 'official-spirit-elimination-branch-proof.lua', `
      assert(Duel.IsPlayerAffectedByEffect(0,CARD_SPIRIT_ELIMINATION))
      local c=Duel.GetMatchingGroup(Card.IsCode,0,LOCATION_HAND,0,nil,60921537):GetFirst()
      local g=c60921537.extramat(c:GetActivateEffect(),0,nil,0,0,nil,0,0,0)
      assert(#g == 0)
    `);
    driver.activate(DOGMATIKAMACABRE);
    luaAssert(duel, 'official-dogmatikamacabre-ritual-summon-proof.lua', `
      local g=Duel.GetMatchingGroup(function(c)
        return c:IsCode(40352445) and c:IsRitualSummoned()
      end,0,LOCATION_MZONE,0,nil)
      assert(#g == 1)
      assert(Duel.IsPlayerAffectedByEffect(0,CARD_SPIRIT_ELIMINATION))
    `);

    const flags = C.OcgQueryFlags.CODE | C.OcgQueryFlags.REASON;
    const location = (controller, where) => duel.queryLocation({ controller, location: where, flags }).filter(Boolean);
    const fieldCodes = location(0, C.OcgLocation.MZONE).map(card => card.code);
    assert.equal(fieldCodes.filter(code => code === WHITE_KNIGHT).length, 2);
    assert.equal(fieldCodes.includes(WHITE_RELIC), true);
    assert.equal(location(0, C.OcgLocation.HAND).some(card => card.code === WHITE_KNIGHT), false);
    assert.equal(location(0, C.OcgLocation.GRAVE).some(card => card.code === BLUE_EYES), true);
    assert.equal(location(1, C.OcgLocation.EXTRA).length, 0);
    assert.equal(location(1, C.OcgLocation.GRAVE).some(card => card.code === BLUE_EYES_ULTIMATE), true);
    assert.equal(location(0, C.OcgLocation.EXTRA).length, 1);
    assert.equal(driver.decisions.some(prompt => prompt.type === C.OcgMessageType.SELECT_YESNO), true);
    assert.equal(driver.decisions.some(prompt => prompt.type === C.OcgMessageType.SELECT_OPTION), true);
    assert.equal(driver.decisions.some(prompt => prompt.type === C.OcgMessageType.SELECT_CARD
      && prompt.selects.some(card => card.code === BLUE_EYES_ULTIMATE
        && card.controller === 1 && card.location === C.OcgLocation.EXTRA)), true);
    for (const code of [SPIRIT_ELIMINATION, DOGMATIKAMACABRE]) {
      assert.equal(driver.messages.some(message => message.type === C.OcgMessageType.CHAINING && message.code === code), true);
    }
    assert.equal(driver.messages.some(message => message.type === C.OcgMessageType.SPSUMMONED), true);
    assert.equal(driver.messages.some(message => message.type === C.OcgMessageType.CHAIN_SOLVED), true);
    assert.deepEqual(duel.errors, []);
    for (const [name, original] of originalScripts) assert.equal(resources.scripts.get(name), original);
  } finally { duel.close(); }
});
