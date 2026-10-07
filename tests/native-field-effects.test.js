import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { encodeNativeResponse, OcgResponseType } from '../src/core/native/vendor/ocgcore/index.js';

const resourcePromise = loadNativeCardResources({ fetch: async path => (
  new Response(await readFile(new URL(`../public${path}`, import.meta.url)))
) });
const zeroDrawTeam = { startingDrawCount: 0, drawCountPerTurn: 0 };

async function duelFixture() {
  const resources = await resourcePromise;
  const duel = await createNativeDuelRuntime({
    ...resources, seed: [1n, 2n, 3n, 4n], team1: zeroDrawTeam, team2: zeroDrawTeam
  });
  const C = duel.constants;
  const add = (code, controller, location, sequence = 0) => duel.addCard({
    code, controller, location, sequence, position: C.OcgPosition.FACEUP_ATTACK
  });
  // Each player retains a card in the Deck; zero-draw scenario starts in Main 1.
  add(46986414, 0, C.OcgLocation.DECK);
  add(46986414, 1, C.OcgLocation.DECK);
  return { duel, C, add, resources };
}

function resolveFieldActivation(duel, code) {
  const C = duel.constants;
  const transcript = [];
  let activated = false;
  for (let decision = 0; decision < 30; decision += 1) {
    const { prompt, messages } = duel.advance();
    transcript.push(...messages);
    assert.ok(prompt, 'duel must reach a player decision');
    if (prompt.type === C.OcgMessageType.SELECT_IDLECMD) {
      if (activated) return transcript;
      const index = prompt.activates.findIndex(card => card.code === code);
      assert.ok(index >= 0, 'field spell is a legal native activation');
      duel.respond({ type: C.OcgResponseType.SELECT_IDLECMD, action: C.SelectIdleCMDAction.SELECT_ACTIVATE, index });
      activated = true;
    } else if (prompt.type === C.OcgMessageType.SELECT_CHAIN) {
      assert.equal(prompt.forced, false);
      assert.equal(prompt.selects.length, 0);
      duel.respond({ type: C.OcgResponseType.SELECT_CHAIN, index: null });
    } else {
      assert.fail(`Unexpected native prompt: ${prompt.type}`);
    }
  }
  assert.fail('activation did not return to the main phase');
}

test('official Zombie World resolves a native chain and changes field and GY races', async () => {
  const { duel, C, add } = await duelFixture();
  try {
    add(4064256, 0, C.OcgLocation.HAND);
    add(89631139, 0, C.OcgLocation.MZONE);
    add(89631139, 1, C.OcgLocation.GRAVE);
    duel.start();
    const transcript = resolveFieldActivation(duel, 4064256);
    assert.ok(transcript.some(message => message.type === C.OcgMessageType.CHAIN_SOLVED));
    assert.ok(transcript.some(message => message.type === C.OcgMessageType.CHAIN_END));
    const flags = C.OcgQueryFlags.CODE | C.OcgQueryFlags.TYPE | C.OcgQueryFlags.RACE | C.OcgQueryFlags.ATTACK;
    const monster = duel.queryCard({ controller: 0, location: C.OcgLocation.MZONE, sequence: 0, flags });
    const grave = duel.queryLocation({ controller: 1, location: C.OcgLocation.GRAVE, flags });
    assert.equal(monster.type, 17);
    assert.equal(monster.race, C.OcgRace.ZOMBIE);
    assert.equal(monster.attack, 3000);
    assert.equal(grave[0].race, C.OcgRace.ZOMBIE);
    assert.deepEqual(duel.errors, []);
  } finally { duel.close(); }
});

test('official Necrovalley resolves and increases Gravekeeper ATK/DEF by 500', async () => {
  const { duel, C, add } = await duelFixture();
  try {
    add(47355498, 0, C.OcgLocation.HAND);
    add(24317029, 0, C.OcgLocation.MZONE);
    duel.start();
    const transcript = resolveFieldActivation(duel, 47355498);
    assert.ok(transcript.some(message => message.type === C.OcgMessageType.CHAIN_SOLVED));
    const monster = duel.queryCard({ controller: 0, location: C.OcgLocation.MZONE, sequence: 0,
      flags: C.OcgQueryFlags.CODE | C.OcgQueryFlags.TYPE | C.OcgQueryFlags.ATTACK | C.OcgQueryFlags.DEFENSE });
    assert.equal(monster.attack, 1700);
    assert.equal(monster.defense, 2500);
    assert.equal(duel.queryField().players[0].lp, 8000);
    assert.deepEqual(duel.errors, []);
  } finally { duel.close(); }
});

test('native WASM32 ABI retains both Pendulum scales and exact Link arrows', async () => {
  const { duel, C, add, resources } = await duelFixture();
  try {
    const pendulumCode = 16178681;
    const linkCode = 98978921;
    add(pendulumCode, 0, C.OcgLocation.HAND);
    duel.addCard({ code: linkCode, controller: 0, location: C.OcgLocation.EXTRA,
      position: C.OcgPosition.FACEDOWN_DEFENSE });
    const scales = duel.queryCard({ controller: 0, location: C.OcgLocation.HAND, sequence: 0,
      flags: C.OcgQueryFlags.CODE | C.OcgQueryFlags.TYPE | C.OcgQueryFlags.LSCALE | C.OcgQueryFlags.RSCALE });
    assert.equal(scales.leftScale, resources.cards.get(pendulumCode).lscale);
    assert.equal(scales.rightScale, resources.cards.get(pendulumCode).rscale);
    const link = duel.queryCard({ controller: 0, location: C.OcgLocation.EXTRA, sequence: 0,
      flags: C.OcgQueryFlags.CODE | C.OcgQueryFlags.TYPE | C.OcgQueryFlags.LINK });
    assert.equal(link.link.rating, resources.cards.get(linkCode).level);
    assert.equal(link.link.marker, resources.cards.get(linkCode).link_marker);
    assert.deepEqual(duel.errors, []);
  } finally { duel.close(); }
});

test('native counters are keyed by type and hold the actual count', async () => {
  const { duel, C, add } = await duelFixture();
  try {
    add(39910367, 0, C.OcgLocation.SZONE, 5);
    duel.start();
    assert.equal(duel.core.loadScript(duel.handle, 'native-counter-probe.lua',
      'local c=Duel.GetFieldCard(0,LOCATION_SZONE,5); c:AddCounter(0x1,2)'), true);
    const card = duel.queryCard({ controller: 0, location: C.OcgLocation.SZONE, sequence: 5,
      flags: C.OcgQueryFlags.CODE | C.OcgQueryFlags.TYPE | C.OcgQueryFlags.COUNTERS });
    assert.deepEqual(card.counters, { 1: 2 });
    assert.deepEqual(duel.errors, []);
  } finally { duel.close(); }
});

test('native sort replies encode raw index-to-rank bytes without a count prefix', () => {
  assert.deepEqual([...encodeNativeResponse({ type: OcgResponseType.SORT_CARD, order: [2, 0, 1] })], [2, 0, 1]);
  assert.deepEqual([...encodeNativeResponse({ type: OcgResponseType.SORT_CARD, order: null })], [255]);
});
