import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as C from '../src/core/native/vendor/ocgcore/index.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';
import { createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';
import { loadNativeCoreWasm } from '../src/core/native/NativeCoreAssets.js';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';

test('real WASM draw, field activation, normal summon and opponent Set drive public visuals', async () => {
  const resources = await loadNativeCardResources({ fetch: async url => ({ ok: true, status: 200,
    json: async () => JSON.parse(await readFile(new URL(`../public${url}`, import.meta.url), 'utf8')) }) });
  const duel = await createNativeDuelRuntime({ ...resources, coreModule: C,
    initializer: { wasmBinary: await loadNativeCoreWasm() }, seed: [1n, 2n, 3n, 4n],
    flags: C.OcgDuelMode.MODE_MR5 | C.OcgDuelMode.TCG_SEGOC_NONPUBLIC | C.OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER,
    team1: { startingDrawCount: 1, drawCountPerTurn: 1 },
    team2: { startingDrawCount: 1, drawCountPerTurn: 1 } });
  const forest = 87624166;
  const guardian = 91152256;
  const hiddenSpell = 14087893;
  const events = [];
  const messages = [];
  const ctx = createNativeVisualContext({ queryCard: loc => duel.queryCard(loc), getCardMetadata: code => ({
    id: String(code), name: resources.metadata.get(code)?.name,
    type: code === forest ? 'Spell Card' : 'Normal Monster',
    card_type: code === forest ? 'spell' : 'monster', race: code === forest ? 'Field' : 'Warrior' }) });
  const add = (code, controller, location, sequence = 0, position = C.OcgPosition.FACEUP_ATTACK) => {
    duel.addCard({ code, controller, location, sequence, position });
  };
  const advance = () => {
    const result = duel.advance();
    messages.push(...result.messages);
    for (const message of result.messages) events.push(...translateNativeVisualEvents(message, ctx).events);
    assert.equal(result.messages.some(message => message.type === C.OcgMessageType.RETRY), false);
    return result;
  };
  const reachIdle = () => {
    for (let step = 0; step < 80; step += 1) {
      const result = advance();
      const prompt = result.prompt;
      assert.ok(prompt, 'The native duel must reach a typed decision');
      if (prompt.type === C.OcgMessageType.SELECT_IDLECMD) return prompt;
      if (prompt.type === C.OcgMessageType.SELECT_CHAIN) {
        duel.respond({ type: C.OcgResponseType.SELECT_CHAIN, index: prompt.forced ? 0 : null });
      } else if (prompt.type === C.OcgMessageType.SELECT_PLACE) {
        const places = [];
        for (const controller of [prompt.player, 1 - prompt.player]) {
          for (const [location, shift, count] of [[C.OcgLocation.MZONE, 0, 7], [C.OcgLocation.SZONE, 8, 8]]) {
            for (let sequence = 0; sequence < count; sequence += 1) {
              const bit = (controller === prompt.player ? 0 : 16) + shift + sequence;
              if (!((prompt.field_mask >>> 0) & (1 << bit))) places.push({ player: controller, location, sequence });
            }
          }
        }
        duel.respond({ type: C.OcgResponseType.SELECT_PLACE, places: places.slice(0, prompt.count) });
      } else {
        assert.fail(`Unexpected real native prompt ${prompt.type}`);
      }
    }
    assert.fail('Native decision budget exhausted');
  };
  try {
    for (const controller of [0, 1]) {
      for (let index = 0; index < 6; index += 1) add(89631139, controller, C.OcgLocation.DECK);
    }
    add(forest, 0, C.OcgLocation.HAND);
    add(guardian, 0, C.OcgLocation.HAND);
    add(hiddenSpell, 1, C.OcgLocation.HAND);
    add(46986414, 1, C.OcgLocation.MZONE, 1, C.OcgPosition.FACEDOWN_DEFENSE);
    duel.start();
    let idle = reachIdle();
    assert.equal(idle.player, 0);
    assert.ok(messages.some(message => message.type === C.OcgMessageType.DRAW && message.player === 1
      && message.drawn.some(card => card.code === 89631139)));
    assert.doesNotMatch(JSON.stringify(events), /89631139|46986414|14087893/);

    const activationIndex = idle.activates.findIndex(card => card.code === forest);
    assert.ok(activationIndex >= 0);
    duel.respond({ type: C.OcgResponseType.SELECT_IDLECMD, action: C.SelectIdleCMDAction.SELECT_ACTIVATE, index: activationIndex });
    idle = reachIdle();
    const chain = events.find(event => event.type === 'chain-pop' && event.card?.id === String(forest));
    assert.equal(chain.zoneType, 'field');
    const resolved = events.find(event => event.type === 'field-source-change' && event.resolved);
    assert.equal(resolved.active, true);
    assert.equal(createPublicCombatVisual(resolved, {}).kind, 'activate');
    // Ancient Forest itself causes this public flip; no JS effect is called.
    assert.ok(messages.some(message => message.type === C.OcgMessageType.POS_CHANGE && message.code === 46986414));
    const flip = events.find(event => event.type === 'flip-summon' && event.card?.id === '46986414');
    assert.equal(flip.target, 'opponent');
    assert.equal(flip.position, 'attack');

    const summonIndex = idle.summons.findIndex(card => card.code === guardian);
    assert.ok(summonIndex >= 0);
    duel.respond({ type: C.OcgResponseType.SELECT_IDLECMD, action: C.SelectIdleCMDAction.SELECT_SUMMON, index: summonIndex });
    idle = reachIdle();
    const summoned = events.find(event => event.type === 'summon' && event.card?.id === String(guardian));
    assert.ok(summoned);
    const queried = duel.queryCard({ controller: 0, location: C.OcgLocation.MZONE, sequence: summoned.zoneIndex,
      flags: C.OcgQueryFlags.ATTACK | C.OcgQueryFlags.DEFENSE });
    assert.equal(summoned.card.atk, queried.attack);
    assert.equal(summoned.card.def, queried.defense);

    duel.respond({ type: C.OcgResponseType.SELECT_IDLECMD, action: C.SelectIdleCMDAction.TO_EP, index: null });
    idle = reachIdle();
    assert.equal(idle.player, 1);
    const setIndex = idle.spell_sets.findIndex(card => card.code === hiddenSpell);
    assert.ok(setIndex >= 0);
    const beforeSet = events.length;
    duel.respond({ type: C.OcgResponseType.SELECT_IDLECMD, action: C.SelectIdleCMDAction.SELECT_SPELL_SET, index: setIndex });
    reachIdle();
    const setEvents = events.slice(beforeSet);
    assert.ok(setEvents.some(event => event.type === 'activate' && event.faceDown && event.card === null));
    assert.doesNotMatch(JSON.stringify(setEvents), /14087893|Book of Moon/);
    assert.deepEqual(duel.errors, []);
  } finally {
    duel.close();
  }
});
