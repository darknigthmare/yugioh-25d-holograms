import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { auditFlags, makeSession, choosePlace, defaultResponse, reachIdle, perform, endTurn, reachBattle, enterBattle, battleAttack, leaveBattle, hasCode, requireChain, scenarioEvidence, createNativeFieldScenarioRunner } from './native-field-audit-harness.mjs';
import { auditNativeFieldBatchA, NATIVE_FIELD_BATCH_A_IDS } from './audit-native-field-batch-a.mjs';
import { auditNativeFieldBatchB, NATIVE_FIELD_BATCH_B_IDS } from './audit-native-field-batch-b.mjs';
import { auditNativeFieldBatchC, NATIVE_FIELD_BATCH_C_IDS } from './audit-native-field-batch-c.mjs';
import { auditNativeFieldBatchD, NATIVE_FIELD_BATCH_D_IDS } from './audit-native-field-batch-d.mjs';
import { auditNativeFieldBatchE, NATIVE_FIELD_BATCH_E_IDS } from './audit-native-field-batch-e.mjs';
import { auditNativeFieldBatchF, NATIVE_FIELD_BATCH_F_IDS } from './audit-native-field-batch-f.mjs';
import { runNativeFieldBranchWaveA } from './audit-native-field-branch-wave-a.mjs';
import { runNativeFieldBranchWaveF } from './audit-native-field-branch-wave-f.mjs';
import { runNativeFieldContinuationA } from './native-field-continuation-a.mjs';
import { runNativeFieldContinuationB } from './native-field-continuation-b.mjs';
import { NATIVE_CARD_SCRIPT_CORRECTIONS, getNativeCardScriptCorrection } from '../src/core/native/NativeCardScriptCorrections.js';
import { FIELD_SPELL_CARD_DATA_SNAPSHOT } from '../src/ui/FieldSpellCardDataSnapshot.js';

export const NATIVE_FIELD_AUDIT_PATH = new URL('../docs/audits/artifacts/native-field-runtime-continuation-2026-10-08.json', import.meta.url);
export const NATIVE_FIELD_PREVIOUS_AUDIT_PATH = new URL('../docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json', import.meta.url);
const sha256 = text => createHash('sha256').update(text).digest('hex');
const json = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item, 2);
const clone = value => JSON.parse(json(value));

export { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';

/** A separate duel handle for every catalogue entry; field preload executes the
 * shipped initial_effect and all public hooks it registers before native query. */
export async function auditNativeFieldInitialization(inputs, sharedCore) {
  const matrix = [];
  for (const [id, card] of Object.entries(FIELD_SPELL_CARD_DATA_SNAPSHOT)) {
    const canonicalCode = Number(id);
    const sourceCode = inputs.resources.canonicalCodeToSource?.get(canonicalCode) ?? canonicalCode;
    const data = inputs.resources.cards.get(sourceCode);
    const filename = `c${sourceCode}.lua`;
    const scriptPath = inputs.resources.auditScriptFiles?.[filename]?.path ?? `official/${filename}`;
    const script = inputs.resources.scripts.get(scriptPath) ?? inputs.resources.scripts.get(filename);
    const entry = { canonicalCode, sourceCode, name: card.name, bundled: Boolean(data && script),
      initialized: false, effectTested: false, integrationTested: false, scriptPath,
      scriptSha256: script ? sha256(script) : null,
      effectiveScriptSha256: getNativeCardScriptCorrection(filename)?.correctedSha256 ?? (script ? sha256(script) : null),
      scriptCorrection: getNativeCardScriptCorrection(filename), errors: [] };
    if (!entry.bundled) { entry.errors.push({ text: `Missing ${data ? 'script' : 'card data'} for ${canonicalCode}` }); matrix.push(entry); continue; }
    const session = await makeSession(inputs, sharedCore, `init-${id}`);
    try {
      session.add(sourceCode, 0, session.C.OcgLocation.SZONE, 5).baseDecks();
      const info = session.card(0, session.C.OcgLocation.SZONE, 5);
      assert.ok(info && (info.type & session.C.OcgType.FIELD) !== 0, `Missing field query ${canonicalCode}`);
      assert.ok(info.code === sourceCode || info.code === data.alias, `Unexpected native identity ${canonicalCode}: ${info.code}`);
      session.start();
      const result = session.advance();
      assert.notEqual(result.status, session.C.OcgProcessResult.END, `Initialization ended duel ${canonicalCode}`);
      assert.deepEqual(session.duel.errors, []);
      entry.initialized = true; entry.initialQuery = clone(info); entry.nativeApi = session.duel.core.getVersion();
      entry.firstPromptType = result.prompt?.type ?? null;
    } catch (error) { entry.errors.push({ text: error.message }, ...clone(session.duel.errors)); }
    finally { session.duel.close(); }
    matrix.push(entry);
  }
  return matrix;
}

export async function auditNativeFieldEffects(inputs, sharedCore) {
  const { scenarios, run } = createNativeFieldScenarioRunner(inputs, sharedCore);

  for (const spec of [
    { field: 4064256, monster: 89631139, expected: { race: 16n }, name: 'zombie-world-race' },
    { field: 47355498, monster: 24317029, expected: { attack: 1700, defense: 2500 }, name: 'necrovalley-gravekeepers-stats' },
    { field: 19384334, monster: 2964201, expected: { attack: 2700, defense: 2200 }, name: 'molten-destruction-fire' },
    { field: 56594520, monster: 23635815, expected: { attack: 2250, defense: 0 }, name: 'gaia-power-earth' },
    { field: 2084239, monster: 68638985, expected: { attack: 1900, defense: 500 }, name: 'wetlands-water-aqua-low-level' },
    { field: 295517, monster: 68638985, expected: { attack: 900, defense: 700, level: 1 }, name: 'legendary-ocean-alias-level' }
  ]) {
    await run(spec.name, [spec.field], 'Activate from hand, resolve a real chain, query the continuous field effect.', s => {
      const monster = spec.extraMonster ?? spec.monster;
      s.add(spec.field, 0, s.C.OcgLocation.HAND).add(monster, 0, s.C.OcgLocation.MZONE).baseDecks().start();
      perform(s, 'activate', spec.field);
      requireChain(s, spec.field);
      const info = s.card(0, s.C.OcgLocation.MZONE);
      for (const [key, value] of Object.entries(spec.expected)) assert.equal(info[key], value, `${spec.name}: ${key}`);
    });
  }

  await run('necrovalley-graveyard-revival-negation', [47355498], 'A targeted Monster Reborn chain is negated at resolution by Necrovalley; the opposing GY card stays there.', s => {
    s.add(47355498, 0, s.C.OcgLocation.HAND).add(83764718, 0, s.C.OcgLocation.HAND)
      .add(89631139, 1, s.C.OcgLocation.GRAVE).baseDecks().start();
    const before = reachIdle(s); assert.ok(before.activates.some(card => card.code === 83764718));
    perform(s, 'activate', 47355498);
    perform(s, 'activate', 83764718, { codes: [89631139] });
    requireChain(s, 47355498); requireChain(s, 83764718);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.CHAIN_DISABLED));
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 89631139));
  });

  await run('dragon-ravine-discard-send', [62265044], 'Pay an actual discard cost, choose Dragon send mode, resolve deck-to-GY without targeting.', s => {
    s.add(62265044, 0, s.C.OcgLocation.HAND).add(46986414, 0, s.C.OcgLocation.HAND)
      .add(89631139, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 62265044);
    perform(s, 'activate', 62265044, { select: prompt => prompt.selects[0].location === s.C.OcgLocation.HAND ? [46986414] : [89631139] });
    requireChain(s, 62265044);
    const grave = s.location(0, s.C.OcgLocation.GRAVE);
    assert.ok(grave.some(card => card.code === 46986414 && (card.reason & 0x80) !== 0));
    assert.ok(grave.some(card => card.code === 89631139 && (card.reason & 0x40) !== 0));
    assert.ok(!s.messages.some(message => message.type === s.C.OcgMessageType.BECOME_TARGET));
  });

  const addFusion = (s, count = 1) => {
    for (let index = 0; index < count * 3; index += 1) s.add(89631139, 0, s.C.OcgLocation.HAND);
    for (let index = 0; index < count; index += 1) s.add(23995346, 0, s.C.OcgLocation.EXTRA);
  };
  await run('fusion-gate-banish-materials', [33550694], 'Fusion Summon Blue-Eyes Ultimate Dragon using three real hand materials banished by Fusion Gate.', s => {
    s.add(33550694, 0, s.C.OcgLocation.HAND); addFusion(s); s.baseDecks().start();
    perform(s, 'activate', 33550694); perform(s, 'activate', 33550694);
    requireChain(s, 33550694);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 23995346));
    assert.equal(s.location(0, s.C.OcgLocation.REMOVED).filter(card => card.code === 89631139).length, 3);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.SPSUMMONED));
  });

  await run('fusion-gate-repeat-mr5-main-zones', [33550694], 'Three successive Fusion Summons under MR5 use legal main monster zones with facedown Fusion cards in the Extra Deck.', s => {
    s.add(33550694, 0, s.C.OcgLocation.SZONE, 5); addFusion(s, 3); s.baseDecks().start();
    perform(s, 'activate', 33550694); perform(s, 'activate', 33550694); perform(s, 'activate', 33550694);
    requireChain(s, 33550694);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).filter(card => card.code === 23995346).length, 3);
    assert.equal(s.location(0, s.C.OcgLocation.REMOVED).filter(card => card.code === 89631139).length, 9);
    const summons = s.messages.filter(message => message.type === s.C.OcgMessageType.SPSUMMONING);
    assert.equal(summons.length, 3);
    assert.ok(summons.every(message => message.sequence < 5));
  });

  await run('extra-net-opponent-extra-draw', [95376428, 33550694], 'An opponent Extra Deck Fusion Summon triggers a forced chain and a real optional draw decision.', s => {
    s.add(95376428, 1, s.C.OcgLocation.SZONE, 5).add(33550694, 0, s.C.OcgLocation.SZONE, 5);
    addFusion(s); s.baseDecks().start(); perform(s, 'activate', 33550694);
    requireChain(s, 95376428);
    assert.equal(s.location(1, s.C.OcgLocation.HAND).length, 1);
    assert.ok(s.decisions.some(decision => decision.prompt.type === s.C.OcgMessageType.SELECT_YESNO
      && decision.prompt.player === 1 && decision.response.yes));
  });

  await run('summon-breaker-third-summon-end-phase', [18114794], 'Two legal Gilasaurus Special Summons and one Normal Summon reach the third-summon condition; the core skips to End Phase.', s => {
    s.add(18114794, 0, s.C.OcgLocation.SZONE, 5).add(45894482, 0, s.C.OcgLocation.HAND)
      .add(45894482, 0, s.C.OcgLocation.HAND).add(23635815, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'special', 45894482); perform(s, 'special', 45894482); perform(s, 'summon', 23635815);
    requireChain(s, 18114794);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 3);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.NEW_PHASE && message.phase === s.C.OcgPhase.END));
  });

  await run('venom-swamp-end-phase-counter', [54306223], 'End Phase mandatory trigger adds a Venom Counter and reduces native ATK by 500.', s => {
    s.add(54306223, 0, s.C.OcgLocation.SZONE, 5).add(46986414, 0, s.C.OcgLocation.MZONE).baseDecks().start();
    endTurn(s); requireChain(s, 54306223);
    const info = s.card(0, s.C.OcgLocation.MZONE); assert.equal(info.attack, 2000);
    assert.equal(info.counters[0x1009], 1);
  });

  await run('mausoleum-two-tribute-lp-cost', [80921533], 'Mausoleum resolves an ignition chain, pays 2000 LP and Normal Summons a Level 8 monster without Tributes.', s => {
    s.add(80921533, 0, s.C.OcgLocation.SZONE, 5).add(89631139, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 80921533); requireChain(s, 80921533);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).code, 89631139);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.PAY_LPCOST && message.amount === 2000));
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.SUMMONED));
  });

  await run('harpies-hunting-ground-target-destroy', [75782277], 'Normal Summon Harpie Lady; mandatory trigger selects an opposing Spell/Trap target and destroys it.', s => {
    s.add(75782277, 0, s.C.OcgLocation.SZONE, 5).add(76812113, 0, s.C.OcgLocation.HAND)
      .add(5318639, 1, s.C.OcgLocation.SZONE, 0, s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();
    perform(s, 'summon', 76812113, { codes: [5318639] }); requireChain(s, 75782277);
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 5318639));
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1500);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.BECOME_TARGET));
  });

  await run('geartown-destroy-special-summon', [37694547], 'Mystical Space Typhoon targets and destroys Geartown; its optional trigger summons Ancient Gear from deck.', s => {
    s.add(37694547, 0, s.C.OcgLocation.SZONE, 5).add(5318639, 0, s.C.OcgLocation.HAND)
      .add(50933533, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 5318639, { select: prompt => prompt.selects.some(card => card.code === 37694547) ? [37694547] : [50933533] });
    requireChain(s, 37694547);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).code, 50933533);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 37694547));
  });

  await run('magical-citadel-counter-destroy-replacement', [39910367], 'Hinotama resolves and places a Spell Counter; a later MST targets Citadel and the player spends the counter to replace destruction.', s => {
    s.add(39910367, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND)
      .add(46130346, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 39910367);
    perform(s, 'activate', 46130346);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).counters[1], 1);
    perform(s, 'activate', 5318639, { codes: [39910367] }); requireChain(s, 5318639);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).code, 39910367);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.ADD_COUNTER && message.counter_type === 1));
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.REMOVE_COUNTER && message.counter_type === 1));
    assert.ok(s.decisions.some(decision => decision.prompt.type === s.C.OcgMessageType.SELECT_EFFECTYN && decision.response.yes));
  });

  await run('gateway-to-chaos-activation-search', [40089744], 'Field activation searches the specific Ritual monster using native selection and deck-to-hand movement.', s => {
    s.add(40089744, 0, s.C.OcgLocation.HAND).add(5405694, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 40089744, { codes: [5405694] }); requireChain(s, 40089744);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 5405694));
    assert.ok(!s.messages.some(message => message.type === s.C.OcgMessageType.BECOME_TARGET));
  });

  await run('black-garden-normal-summon-token', [71645242], 'A real Normal Summon resolves Black Garden: halve ATK and create a native Rose Token on the opposing field.', s => {
    s.add(71645242, 0, s.C.OcgLocation.SZONE, 5).add(43096270, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'summon', 43096270); requireChain(s, 71645242);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1000);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).code, 71645243);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 800);
  });

  await run('angelechy-endgame-opponent-special-zone-choice', [12845564], 'Legally establish two Angelechy Monster Cards as Continuous Spells; Endgame changes the chooser of an opposing Special Summon zone.', s => {
    s.add(17782288, 0, s.C.OcgLocation.HAND).add(12845564, 0, s.C.OcgLocation.HAND)
      .add(5318639, 0, s.C.OcgLocation.HAND).add(81797573, 0, s.C.OcgLocation.EXTRA)
      .add(28904860, 0, s.C.OcgLocation.EXTRA).add(42410161, 0, s.C.OcgLocation.EXTRA)
      .add(45894482, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 17782288);
    perform(s, 'activate', 17782288, {
      chainCodes: [28904860],
      select: prompt => {
        for (const code of [5318639, 81797573, 28904860, 42410161]) {
          if (prompt.selects.some(card => card.code === code)) return [code];
        }
        throw new Error(`Unexpected Angelechy selection: ${json(prompt)}`);
      }
    });
    requireChain(s, 17782288); requireChain(s, 28904860);
    const first = s.card(0, s.C.OcgLocation.SZONE, 0);
    const second = s.card(0, s.C.OcgLocation.SZONE, 1);
    assert.equal(first.code, 28904860); assert.equal(second.code, 42410161);
    assert.equal(first.type, s.C.OcgType.SPELL | s.C.OcgType.CONTINUOUS);
    assert.equal(second.type, s.C.OcgType.SPELL | s.C.OcgType.CONTINUOUS);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0).code, 81797573);
    const grave = s.location(0, s.C.OcgLocation.GRAVE);
    assert.ok(grave.some(card => card.code === 5318639 && (card.reason & 0x80) !== 0), 'real Spell/Trap discard cost');
    // The four explicit canonical bindings retain the original physical Lua ID.
    perform(s, 'activate', 101402095);
    requireChain(s, 101402095);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).code, 101402095);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 17782288), 'field replacement is a core movement');
    const opponentMain = endTurn(s); assert.equal(opponentMain.player, 1);
    const placesBefore = s.decisions.filter(row => row.prompt.type === s.C.OcgMessageType.SELECT_PLACE).length;
    perform(s, 'special', 45894482, { place: prompt => {
      assert.equal(prompt.player, 0, 'EFFECT_OPPO_CHOOSES_SPSUMMON_ZONE 267 must give the field owner the decision');
      assert.equal(prompt.count, 1);
      assert.equal((prompt.field_mask >>> 0) & (1 << 18), 0, 'opposing Main Monster Zone 2 is legal relative to player 0');
      return [{ player: 1, location: s.C.OcgLocation.MZONE, sequence: 2 }];
    } });
    const places = s.decisions.filter(row => row.prompt.type === s.C.OcgMessageType.SELECT_PLACE);
    assert.equal(places.length, placesBefore + 1);
    const choice = places.at(-1);
    assert.equal(choice.prompt.player, 0);
    assert.deepEqual(choice.response.places, [{ player: 1, location: s.C.OcgLocation.MZONE, sequence: 2 }]);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE, 2).code, 45894482);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.SPSUMMONING
      && message.code === 45894482 && message.controller === 1 && message.sequence === 2));
  });

  // Search fixtures retain a second copy in hand and a second legal deck result:
  // absence of the second activation therefore proves the printed activation
  // oath, rather than merely exhausting the deck or the cards in hand.
  for (const spec of [
    { field: 47679935, partner: 86120751, name: 'magical-meltdown-search-activation-oath' },
    { field: 32354768, partner: 21495657, name: 'oracle-of-zefra-search-activation-oath' },
    { field: 16269385, partner: 18236002, name: 'prank-kids-place-search-activation-oath' },
    { field: 70122149, partner: 82466274, name: 'pareidolia-search-activation-oath' },
    { field: 84792926, partner: 10604644, name: 'therion-discolosseum-search-activation-oath' },
    { field: 77103950, partner: 74078255, name: 'perlereino-search-activation-oath' }
  ]) {
    await run(spec.name, [spec.field], 'Resolve the real archetype search, then verify a second physical copy cannot activate despite a remaining legal deck result.', s => {
      s.add(spec.field, 0, s.C.OcgLocation.HAND).add(spec.field, 0, s.C.OcgLocation.HAND)
        .add(spec.partner, 0, s.C.OcgLocation.DECK).add(spec.partner, 0, s.C.OcgLocation.DECK).baseDecks().start();
      const idle = perform(s, 'activate', spec.field, { codes: [spec.partner] }); requireChain(s, spec.field);
      assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, spec.partner));
      assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, spec.partner));
      assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, spec.field));
      assert.ok(!idle.activates.some(card => card.code === spec.field && card.location === s.C.OcgLocation.HAND));
    });
  }

  await run('fire-king-island-destroy-search-shared-limit', [57554544], 'Destroy a hand monster by effect and search Fire King; the shared once-per-turn limit then forbids both destruction and Special Summon modes.', s => {
    s.add(57554544, 0, s.C.OcgLocation.HAND).add(46986414, 0, s.C.OcgLocation.HAND)
      .add(69000994, 0, s.C.OcgLocation.DECK).add(69000994, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 57554544);
    const idle = perform(s, 'activate', 57554544, { select: p => p.selects.some(c => c.code === 46986414) ? [46986414] : [69000994] });
    requireChain(s, 57554544);
    const cost = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 46986414);
    assert.ok(cost.reason & 0x40); assert.equal(cost.reason & 0x80, 0, 'destruction is an effect, not discard cost');
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 69000994));
    assert.ok(!idle.activates.some(c => c.code === 57554544));
  });

  await run('dragonic-diagram-destroy-search-once-per-turn', [13035077], 'Destroy a hand Spell by effect, search True Draco Heritage and verify a second ignition is unavailable with another legal hand/deck pair.', s => {
    s.add(13035077, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND)
      .add(49430782, 0, s.C.OcgLocation.DECK).add(49430782, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 13035077);
    const idle = perform(s, 'activate', 13035077, { select: p => p.selects.some(c => c.code === 5318639) ? [5318639] : [49430782] });
    requireChain(s, 13035077);
    const destroyed = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 5318639);
    assert.ok(destroyed.reason & 0x40); assert.equal(destroyed.reason & 0x80, 0);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 49430782));
    assert.ok(!idle.activates.some(c => c.code === 13035077));
  });

  await run('union-hangar-search-summon-equip-restriction', [66399653], 'Search A-Assault Core, Normal Summon it, then target it and equip B-Buster Drake from deck; the equipped Union cannot Special Summon itself that turn.', s => {
    s.add(66399653, 0, s.C.OcgLocation.HAND).add(30012506, 0, s.C.OcgLocation.DECK)
      .add(77411244, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 66399653, { codes: [30012506] });
    const idle = perform(s, 'summon', 30012506, { codes: [77411244] }); requireChain(s, 66399653);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0).code, 30012506);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 0).code, 77411244);
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.EQUIP));
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.BECOME_TARGET));
    assert.ok(!idle.activates.some(c => c.code === 77411244), 'Hangar restriction blocks Union release');
  });

  await run('spyral-resort-search-end-phase-maintenance', [54631665], 'Search SPYRAL Super Agent once; during the real End Phase choose a graveyard monster as the mandatory maintenance cost and shuffle it into the deck.', s => {
    s.add(54631665, 0, s.C.OcgLocation.HAND).add(41091257, 0, s.C.OcgLocation.DECK)
      .add(41091257, 0, s.C.OcgLocation.DECK).add(89631139, 0, s.C.OcgLocation.GRAVE).baseDecks().start();
    perform(s, 'activate', 54631665);
    const idle = perform(s, 'activate', 54631665, { codes: [41091257] }); requireChain(s, 54631665);
    assert.ok(!idle.activates.some(c => c.code === 54631665));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 41091257));
    endTurn(s, { codes: [89631139], option: 0 });
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).code, 54631665);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 89631139));
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.GRAVE, 89631139));
    assert.ok(s.location(0, s.C.OcgLocation.DECK).some(c => c.code === 89631139 && (c.reason & 0x80)));
  });

  await run('trickstar-light-stage-search-lock-end-phase-send', [35371948], 'Search Trickstar Candina, target an opposing set Trap with the ignition, then decline activation at End Phase; the core sends it to GY by rule.', s => {
    s.add(35371948, 0, s.C.OcgLocation.HAND).add(61283655, 0, s.C.OcgLocation.DECK)
      .add(44095762, 1, s.C.OcgLocation.SZONE, 0, s.C.OcgPosition.FACEDOWN_DEFENSE).baseDecks().start();
    perform(s, 'activate', 35371948, { codes: [61283655] });
    perform(s, 'activate', 35371948, { codes: [44095762] }); requireChain(s, 35371948);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 61283655));
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.BECOME_TARGET));
    endTurn(s);
    const sent = s.location(1, s.C.OcgLocation.GRAVE).find(c => c.code === 44095762);
    assert.ok(sent && (sent.reason & 0x400), 'unactivated set Trap is sent by rule, not destroyed');
  });

  await run('hidden-city-search-flip-ignition', [5697558], 'Search a Subterror monster, then use the native non-targeting ignition to turn a facedown Subterror Nemesis Archer faceup.', s => {
    s.add(5697558, 0, s.C.OcgLocation.HAND).add(39581190, 0, s.C.OcgLocation.MZONE, 0, s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(16428514, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 5697558, { codes: [16428514] });
    perform(s, 'activate', 5697558, { codes: [39581190] }); requireChain(s, 5697558);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 16428514));
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0).position, s.C.OcgPosition.FACEUP_ATTACK);
    assert.ok(!s.messages.some(m => m.type === s.C.OcgMessageType.BECOME_TARGET));
  });

  await run('vendread-nights-discard-cost-search', [76871889], 'Pay a true discard cost and search Vendread Revenants; query cost/discard reasons and the shared hard once-per-turn restriction.', s => {
    s.add(76871889, 0, s.C.OcgLocation.HAND).add(46986414, 0, s.C.OcgLocation.HAND)
      .add(31772684, 0, s.C.OcgLocation.DECK).add(31772684, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 76871889);
    const idle = perform(s, 'activate', 76871889, { select: p => p.selects.some(c => c.code === 46986414) ? [46986414] : [31772684] });
    requireChain(s, 76871889);
    const cost = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 46986414);
    assert.ok(cost.reason & 0x80); assert.ok(cost.reason & 0x4000);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 31772684));
    assert.ok(!idle.activates.some(c => c.code === 76871889));
  });

  await run('ua-stadium-normal-search-special-attack', [19814508], 'Normal Summon U.A. Midfielder to search Perfect Ace; Special Summon Ace by returning Midfielder, then Stadium grants the actual 500 ATK boost.', s => {
    s.add(19814508, 0, s.C.OcgLocation.HAND).add(72491806, 0, s.C.OcgLocation.HAND)
      .add(82419869, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 19814508);
    perform(s, 'summon', 72491806, { codes: [82419869] });
    perform(s, 'special', 82419869, { codes: [72491806] }); requireChain(s, 19814508);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 72491806));
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0).code, 82419869);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0).attack, 2000);
  });

  await run('myutant-lab-banished-summon-unique-bonus-bottom-draw', [34572613], 'Activation summons a faceup banished Myutant; two other distinct banished names grant 200 ATK, then ignition returns a hand Myutant to deck bottom and draws.', s => {
    s.add(34572613, 0, s.C.OcgLocation.HAND).add(8200556, 0, s.C.OcgLocation.HAND)
      .add(62201847, 0, s.C.OcgLocation.REMOVED).add(8200556, 0, s.C.OcgLocation.REMOVED)
      .add(62201847, 0, s.C.OcgLocation.REMOVED).baseDecks().start();
    perform(s, 'activate', 34572613, { codes: [62201847] });
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0).code, 62201847);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0).attack, 200);
    const idle = perform(s, 'activate', 34572613, { codes: [8200556] }); requireChain(s, 34572613);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 46986414));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 8200556));
    assert.ok(!idle.activates.some(c => c.code === 34572613));
  });

  await run('drytron-fafnir-search-summon-level-reduction', [58793369], 'Search Drytron Nova; while a Drytron is faceup, a real opposing Alexandrite Dragon Normal Summon triggers Fafnir and lowers its Level from 4 to 2.', s => {
    s.add(58793369, 0, s.C.OcgLocation.HAND).add(97148796, 0, s.C.OcgLocation.MZONE)
      .add(94187078, 0, s.C.OcgLocation.DECK).add(43096270, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 58793369, { codes: [94187078] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 94187078));
    endTurn(s); perform(s, 'summon', 43096270); requireChain(s, 58793369);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE, 0).level, 2);
  });

  await run('chicken-game-lp-draw-lowest-player-damage-prevention', [67616300], 'Pay 1000 LP to draw through an unrespondable Chicken Game chain; the lower-LP player then takes zero Hinotama effect damage.', s => {
    s.add(67616300, 0, s.C.OcgLocation.HAND).add(46130346, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 67616300);
    const idle = perform(s, 'activate', 67616300, { option: 0 }); requireChain(s, 67616300);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 46986414));
    assert.ok(!idle.activates.some(c => c.code === 67616300));
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.PAY_LPCOST && m.amount === 1000));
    endTurn(s); perform(s, 'activate', 46130346);
    assert.ok(!s.messages.some(m => m.type === s.C.OcgMessageType.DAMAGE && m.player === 0 && m.amount > 0));
    assert.equal(s.duel.queryField().players[0].lp, 7000);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('pacifis-normal-search-lock-opponent-reaction-token', [2819435], 'Normal Summon a vanilla to search Phantasm Spiral Battle, prohibit an Effect Monster Special Summon, then respond to an opposing Spell with a real Phantasm Spiral Token.', s => {
    s.add(2819435, 0, s.C.OcgLocation.HAND).add(23635815, 0, s.C.OcgLocation.HAND)
      .add(45894482, 0, s.C.OcgLocation.HAND).add(34302287, 0, s.C.OcgLocation.DECK)
      .add(46130346, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 2819435);
    const idle = perform(s, 'summon', 23635815, { codes: [34302287] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 34302287));
    assert.ok(!idle.special_summons.some(c => c.code === 45894482));
    endTurn(s); perform(s, 'activate', 46130346, { chainCodes: [2819435] }); requireChain(s, 2819435);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).code, 2819436);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).attack, 2000);
  });

  await run('lost-world-dinosaur-token-destruction-replacement', [17228908], 'Summon Gilasaurus to create an opposing Jurraegg Token; Dark Hole destruction of a Normal Monster is replaced by destroying a real deck Dinosaur.', s => {
    s.add(17228908, 0, s.C.OcgLocation.HAND).add(45894482, 0, s.C.OcgLocation.HAND)
      .add(53129443, 0, s.C.OcgLocation.HAND).add(46986414, 0, s.C.OcgLocation.MZONE, 1)
      .add(37265642, 0, s.C.OcgLocation.DECK).add(37265642, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 17228908);
    perform(s, 'special', 45894482, { chainCodes: [17228908] }); requireChain(s, 17228908);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE, 0).code, 17228909);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).attack, 2000);
    perform(s, 'activate', 53129443, { codes: [37265642] });
    assert.equal(s.location(0, s.C.OcgLocation.GRAVE).filter(c => c.code === 37265642).length, 2);
    assert.ok(s.decisions.some(d => d.prompt.type === s.C.OcgMessageType.SELECT_EFFECTYN && d.response.yes));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 46986414));
    assert.ok(hasCode(s, 1, s.C.OcgLocation.MZONE, 17228909));
  });

  await run('revolving-switchyard-discard-search-shared-limit', [76136345], 'Send a hand card as cost to search Level 10 EARTH Machine Bullet Train, then resolve its legal hand ignition Special Summon; the shared once-per-turn limit suppresses Switchyard’s deck summon trigger.', s => {
    s.add(76136345, 0, s.C.OcgLocation.HAND).add(46986414, 0, s.C.OcgLocation.HAND)
      .add(88875132, 0, s.C.OcgLocation.MZONE).add(52481437, 0, s.C.OcgLocation.DECK)
      .add(88875132, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 76136345);
    perform(s, 'activate', 76136345, { select: p => p.selects.some(c => c.code === 46986414) ? [46986414] : [52481437] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 52481437));
    const cost = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 46986414);
    assert.ok(cost.reason & 0x80); assert.equal(cost.reason & 0x4000, 0, 'send cost does not say discard');
    perform(s, 'activate', 52481437, { chainCodes: [76136345] }); requireChain(s, 76136345);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 2);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 88875132));
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).attack, 3000);
  });

  await run('sky-striker-area-zero-destroy-deck-summon', [50005218], 'MST targets and destroys Area Zero; its real GY trigger Special Summons Sky Striker Ace Raye from deck.', s => {
    s.add(50005218, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND)
      .add(26077387, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 50005218);
    perform(s, 'activate', 5318639, { select: p => p.selects.some(c => c.code === 50005218) ? [50005218] : [26077387] });
    requireChain(s, 50005218);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0).code, 26077387);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 50005218));
  });

  await run('runick-fountain-quickplay-recycle-draw', [92107604], 'Activate Runick Golden Droplet, then target two real Runick Quick-Play Spells in GY, sort them onto deck bottom and draw two cards.', s => {
    s.add(92107604, 0, s.C.OcgLocation.HAND).add(20618850, 0, s.C.OcgLocation.HAND)
      .add(31562086, 0, s.C.OcgLocation.GRAVE).add(67835547, 0, s.C.OcgLocation.GRAVE);
    for (let i = 0; i < 8; i++) s.add(46986414, 1, s.C.OcgLocation.DECK);
    s.add(89631139, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 92107604);
    perform(s, 'activate', 20618850, { chainCodes: [92107604], codes: [31562086, 67835547], option: 0 });
    requireChain(s, 92107604);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 31562086));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 67835547));
    assert.equal(s.location(0, s.C.OcgLocation.HAND).length, 2);
    assert.ok(s.decisions.some(d => d.prompt.type === s.C.OcgMessageType.SORT_CARD));
    assert.equal(s.location(1, s.C.OcgLocation.REMOVED).length, 4);
  });

  await run('reichphobia-search-three-defense-target-destroy', [56063182], 'Search Scareclaw Acro, then three authentic Defense Position monsters satisfy the ignition: target and destroy an opposing monster.', s => {
    s.add(56063182, 0, s.C.OcgLocation.HAND).add(46877100, 0, s.C.OcgLocation.DECK)
      .add(23635815, 0, s.C.OcgLocation.MZONE, 0, s.C.OcgPosition.FACEUP_DEFENSE)
      .add(46986414, 0, s.C.OcgLocation.MZONE, 1, s.C.OcgPosition.FACEUP_DEFENSE)
      .add(89631139, 1, s.C.OcgLocation.MZONE, 0, s.C.OcgPosition.FACEUP_DEFENSE).baseDecks().start();
    perform(s, 'activate', 56063182, { codes: [46877100] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 46877100));
    assert.equal(s.card(1, s.C.OcgLocation.MZONE, 0).attack, 2700);
    perform(s, 'activate', 56063182, { codes: [89631139] }); requireChain(s, 56063182);
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 89631139));
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.BECOME_TARGET));
  });

  await run('magical-meltdown-fusion-activation-negation-prevention', [47679935], 'An initial Polymerization is genuinely negated by Solemn Judgment. With Meltdown active, a second native Judgment chain fails to negate Polymerization, which Fusion Summons normally.', s => {
    s.add(47679935, 0, s.C.OcgLocation.HAND).add(24094653, 0, s.C.OcgLocation.HAND)
      .add(24094653, 0, s.C.OcgLocation.HAND)
      .add(41420027, 1, s.C.OcgLocation.SZONE, 0, s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(41420027, 1, s.C.OcgLocation.SZONE, 1, s.C.OcgPosition.FACEDOWN_DEFENSE);
    addFusion(s); s.baseDecks().start();
    let judgmentChosen = false;
    perform(s, 'activate', 24094653, { chainSelect: p => {
      const index = p.selects.findIndex(c => c.code === 41420027);
      if (index >= 0 && !judgmentChosen) { judgmentChosen = true; return index; }
      return null;
    } });
    requireChain(s, 41420027);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 0);
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.CHAIN_NEGATED));
    assert.ok(hasCode(s, 1, s.C.OcgLocation.SZONE, 41420027));
    perform(s, 'activate', 47679935);
    const start = s.messages.length;
    perform(s, 'activate', 24094653, { chainCodes: [41420027] }); requireChain(s, 47679935);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0).code, 23995346);
    assert.equal(s.location(1, s.C.OcgLocation.GRAVE).filter(c => c.code === 41420027).length, 2);
    assert.ok(s.messages.slice(start).some(m => m.type === s.C.OcgMessageType.CHAINING && m.code === 41420027));
    assert.ok(!s.messages.slice(start).some(m => m.type === s.C.OcgMessageType.CHAIN_NEGATED), 'Meltdown prevents the second activation negation at resolution');
  });

  await run('fire-king-island-field-leaves-destroys-own-monsters', [57554544], 'MST destroys Fire King Island; its mandatory GY trigger destroys the owner’s real Fire King monster while preserving the opposing monster.', s => {
    s.add(57554544, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND)
      .add(69000994, 0, s.C.OcgLocation.MZONE).add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 57554544);
    perform(s, 'activate', 5318639, { codes: [57554544] }); requireChain(s, 57554544);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 69000994));
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 0);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE, 0).code, 89631139);
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.CHAINING && m.code === 57554544).length, 2);
  });

  await run('pareidolia-destruction-targeted-graveyard-recovery', [70122149], 'After field activation, MST destroys Pareidolia; its GY trigger targets a real Evil Eye monster and recovers it to hand.', s => {
    s.add(70122149, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND)
      .add(82466274, 0, s.C.OcgLocation.GRAVE).baseDecks().start();
    perform(s, 'activate', 70122149);
    perform(s, 'activate', 5318639, { select: p => p.selects.some(c => c.code === 70122149) ? [70122149] : [82466274] });
    requireChain(s, 70122149);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 82466274));
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.GRAVE, 82466274));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 70122149));
    assert.ok(s.decisions.some(d => d.prompt.type === s.C.OcgMessageType.SELECT_CARD && d.prompt.selects.some(c => c.code === 82466274)));
  });

  await run('revolving-switchyard-level-ten-summon-deck-level-change', [76136345], 'Special Summon Bullet Train through its real hand ignition; Switchyard’s optional trigger summons Flying Pegasus from deck and changes its native Level from 4 to 10.', s => {
    s.add(76136345, 0, s.C.OcgLocation.HAND).add(52481437, 0, s.C.OcgLocation.HAND)
      .add(88875132, 0, s.C.OcgLocation.MZONE).add(88875132, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 76136345);
    perform(s, 'activate', 52481437, { chainCodes: [76136345], codes: [88875132] }); requireChain(s, 76136345);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 3);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 2).code, 88875132);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 2).level, 10);
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.DECK, 88875132));
  });

  for (const spec of [
    { field: 50913601, name: 'mountain-bilateral-race-bonus-removal', monsters: [[89631139, 0, 3200, 2700], [76812113, 1, 1500, 1600], [46986414, 1, 2500, 2100]] },
    { field: 86318356, name: 'sogen-warrior-beastwarrior-bonus-removal', monsters: [[75953262, 0, 1900, 1800], [14898066, 1, 2100, 1400], [89631139, 0, 3000, 2500]] },
    { field: 22702055, name: 'umi-aqua-bonus-machine-penalty-removal', monsters: [[68638985, 0, 900, 700], [77585513, 1, 2200, 1300], [46986414, 0, 2500, 2100]] },
    { field: 82999629, name: 'umiiruka-water-bonus-defense-penalty-removal', monsters: [[68638985, 0, 1200, 100], [2964201, 1, 2200, 2600]] }
  ]) {
    await run(spec.name, [spec.field], 'Activate a genuine Field, verify bilateral qualifying bonuses and non-qualifying exceptions, then destroy it with MST and query exact restoration.', s => {
      s.add(spec.field, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND);
      const sequences = [0, 0];
      const refs = spec.monsters.map(([code, controller, attack, defense]) => ({ code, controller, sequence: sequences[controller]++, attack, defense }));
      for (const ref of refs) s.add(ref.code, ref.controller, s.C.OcgLocation.MZONE, ref.sequence);
      s.baseDecks().start();
      const original = refs.map(ref => s.card(ref.controller, s.C.OcgLocation.MZONE, ref.sequence));
      perform(s, 'activate', spec.field); requireChain(s, spec.field);
      for (const ref of refs) {
        const card = s.card(ref.controller, s.C.OcgLocation.MZONE, ref.sequence);
        assert.equal(card.attack, ref.attack); assert.equal(card.defense, ref.defense);
      }
      perform(s, 'activate', 5318639, { codes: [spec.field] });
      assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, spec.field));
      for (const [index, ref] of refs.entries()) {
        const card = s.card(ref.controller, s.C.OcgLocation.MZONE, ref.sequence);
        assert.equal(card.attack, original[index].attack); assert.equal(card.defense, original[index].defense);
      }
    });
  }

  await run('lemuria-counted-water-level-increase-end-phase-reset', [34103656], 'Two faceup WATER monsters determine the real Level increase; the WATER opponent gains stats but not Levels, and the owner’s increase resets at End Phase.', s => {
    s.add(34103656, 0, s.C.OcgLocation.HAND).add(68638985, 0, s.C.OcgLocation.MZONE)
      .add(68638985, 0, s.C.OcgLocation.MZONE, 1).add(68638985, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 34103656);
    const idle = perform(s, 'activate', 34103656); requireChain(s, 34103656);
    for (const sequence of [0, 1]) {
      const card = s.card(0, s.C.OcgLocation.MZONE, sequence);
      assert.equal(card.level, 4); assert.equal(card.attack, 900); assert.equal(card.defense, 700);
    }
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).level, 2);
    assert.ok(!idle.activates.some(card => card.code === 34103656));
    endTurn(s);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).level, 2);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 900);
  });

  await run('gates-dark-world-cost-effect-discard-trigger-draw', [33017655], 'Banish a genuine Fiend as cost, discard Broww by effect, draw once, then Broww’s real trigger draws again; queried reasons separate the two operations.', s => {
    s.add(33017655, 0, s.C.OcgLocation.HAND).add(79126789, 0, s.C.OcgLocation.HAND)
      .add(70781052, 0, s.C.OcgLocation.GRAVE).add(70781052, 0, s.C.OcgLocation.MZONE)
      .add(89631139, 0, s.C.OcgLocation.DECK).add(46986414, 0, s.C.OcgLocation.DECK)
      .add(46986414, 1, s.C.OcgLocation.DECK).start();
    perform(s, 'activate', 33017655);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2800);
    const idle = perform(s, 'activate', 33017655, { select: p => p.selects.some(c => c.code === 70781052) ? [70781052] : [79126789] });
    requireChain(s, 33017655);
    const banished = s.location(0, s.C.OcgLocation.REMOVED).find(c => c.code === 70781052);
    const discarded = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 79126789);
    assert.ok(banished.reason & 0x80);
    assert.ok(discarded.reason & 0x40); assert.ok(discarded.reason & 0x4000); assert.equal(discarded.reason & 0x80, 0);
    assert.equal(s.location(0, s.C.OcgLocation.HAND).length, 2);
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.DRAW).length, 2);
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.CHAINING && m.code === 79126789));
    assert.ok(!idle.activates.some(c => c.code === 33017655));
  });

  await run('triamid-fortress-effect-protection-leave-grave-recovery', [9989792], 'Triamid Hunter gains 500 DEF and survives Dark Hole while an opposing non-Triamid is destroyed; MST then destroys Fortress and its true GY trigger recovers Dancer.', s => {
    s.add(9989792, 0, s.C.OcgLocation.HAND).add(53129443, 0, s.C.OcgLocation.HAND)
      .add(5318639, 0, s.C.OcgLocation.HAND).add(95923441, 0, s.C.OcgLocation.MZONE)
      .add(69529337, 0, s.C.OcgLocation.GRAVE).add(46986414, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 9989792);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).defense, 1600);
    perform(s, 'activate', 53129443);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 95923441));
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 46986414));
    perform(s, 'activate', 5318639, { select: p => p.selects.some(c => c.code === 9989792) ? [9989792] : [69529337] });
    requireChain(s, 9989792);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).defense, 1100);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 69529337));
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.GRAVE, 69529337));
  });

  await run('triamid-cruiser-normal-summon-recover-draw-discard-search', [45383307], 'A real Triamid Normal Summon heals 500 LP and resolves draw/discard; MST later sends Cruiser to GY and the real trigger searches Triamid Master.', s => {
    s.add(45383307, 0, s.C.OcgLocation.HAND).add(95923441, 0, s.C.OcgLocation.HAND)
      .add(5318639, 0, s.C.OcgLocation.HAND).add(32912040, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 45383307);
    perform(s, 'summon', 95923441, { codes: [46986414] });
    assert.equal(s.duel.queryField().players[0].lp, 8500);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 46986414));
    assert.ok(s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 46986414).reason & 0x4000);
    perform(s, 'activate', 5318639, { select: p => p.selects.some(c => c.code === 45383307) ? [45383307] : [32912040] });
    requireChain(s, 45383307);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 32912040));
  });

  await run('triamid-kingolem-rock-bonus-grave-trigger-special', [72772445], 'Triamid Master gains the 500 ATK Rock bonus; MST destroys Kingolem and its true GY trigger Special Summons Triamid Hunter from hand.', s => {
    s.add(72772445, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND)
      .add(95923441, 0, s.C.OcgLocation.HAND).add(32912040, 0, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 72772445);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2300);
    perform(s, 'activate', 5318639, { select: p => p.selects.some(c => c.code === 72772445) ? [72772445] : [95923441] });
    requireChain(s, 72772445);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 95923441));
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1800);
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.HAND, 95923441));
  });

  await run('aroma-garden-recover-jasmine-draw-bonus-destruction-heal', [5050644], 'Garden’s ignition heals 500 LP, triggers Jasmine’s genuine draw and boosts all own monsters; Dark Hole destroys Jasmine and triggers Garden’s mandatory 1000 LP recovery.', s => {
    s.add(5050644, 0, s.C.OcgLocation.HAND).add(53129443, 0, s.C.OcgLocation.HAND)
      .add(96789758, 0, s.C.OcgLocation.MZONE).add(89631139, 0, s.C.OcgLocation.MZONE, 1).baseDecks().start();
    perform(s, 'activate', 5050644);
    const idle = perform(s, 'activate', 5050644); requireChain(s, 5050644);
    assert.equal(s.duel.queryField().players[0].lp, 8500);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 600);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).attack, 3500);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 46986414));
    assert.ok(!idle.activates.some(c => c.code === 5050644));
    perform(s, 'activate', 53129443);
    assert.equal(s.duel.queryField().players[0].lp, 9500);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 96789758));
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 0);
  });

  await run('pandemonium-effect-destruction-lower-level-archfiend-search', [94585852], 'Destroy real Archfiend Soldier with Dark Hole; Pandemonium’s custom destruction event searches the strictly lower-Level Desrook Archfiend from deck.', s => {
    s.add(94585852, 0, s.C.OcgLocation.HAND).add(53129443, 0, s.C.OcgLocation.HAND)
      .add(49881766, 0, s.C.OcgLocation.MZONE).add(72192100, 0, s.C.OcgLocation.DECK)
      .add(49881766, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 94585852);
    perform(s, 'activate', 53129443, { codes: [72192100] }); requireChain(s, 94585852);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 72192100));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 49881766));
    const selection = s.decisions.find(d => d.prompt.type === s.C.OcgMessageType.SELECT_CARD && d.prompt.selects.some(c => c.code === 72192100));
    assert.ok(selection); assert.ok(!selection.prompt.selects.some(c => c.code === 49881766));
  });

  await run('pandemonium-standby-archfiend-upkeep-cost-replacement', [94585852], 'The initial unprotected Standby pays Terrorking’s 800 LP; after real Field activation, the next own Standby waives that same mandatory LP cost.', s => {
    s.add(94585852, 0, s.C.OcgLocation.HAND).add(35975813, 0, s.C.OcgLocation.MZONE).baseDecks().start();
    reachIdle(s); assert.equal(s.duel.queryField().players[0].lp, 7200);
    perform(s, 'activate', 94585852); requireChain(s, 94585852);
    const start = s.messages.length;
    endTurn(s); endTurn(s);
    assert.equal(s.duel.queryField().players[0].lp, 7200);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 35975813));
    assert.ok(!s.messages.slice(start).some(m => m.type === s.C.OcgMessageType.PAY_LPCOST));
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });


  await run('domain-monarchs-level-reduction-true-tribute-extra-lock-removal', [84171830], 'Reduce Erebus from Level 8 to 6, perform its genuine one-Tribute Normal Summon with an empty own Extra Deck, block the opponent’s Link procedure, then remove Domain and restore that procedure.', s => {
    s.add(84171830, 0, s.C.OcgLocation.HAND).add(23064604, 0, s.C.OcgLocation.HAND)
      .add(23635815, 0, s.C.OcgLocation.MZONE).add(23635815, 1, s.C.OcgLocation.MZONE)
      .add(98978921, 1, s.C.OcgLocation.EXTRA).add(5318639, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 84171830);
    perform(s, 'activate', 84171830, { codes: [23064604] });
    assert.equal(s.card(0, s.C.OcgLocation.HAND).level, 6);
    perform(s, 'summon', 23064604); requireChain(s, 84171830);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 23635815));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 23064604));
    const locked = endTurn(s);
    assert.equal(locked.player, 1);
    assert.ok(!locked.special_summons.some(c => c.code === 98978921));
    const restored = perform(s, 'activate', 5318639, { codes: [84171830] });
    assert.ok(restored.special_summons.some(c => c.code === 98978921));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 84171830));
  });

  await run('toon-kingdom-facedown-banish-target-protection-destruction-replacement', [43175858], 'Kingdom banishes three genuine deck cards facedown; opposing Book of Moon cannot target the Toon, and Dark Hole destruction is replaced by another facedown banish while the non-Toon is destroyed.', s => {
    s.add(43175858, 0, s.C.OcgLocation.HAND).add(42386471, 0, s.C.OcgLocation.MZONE)
      .add(46986414, 0, s.C.OcgLocation.MZONE, 1).add(14087893, 1, s.C.OcgLocation.HAND)
      .add(53129443, 1, s.C.OcgLocation.HAND);
    for (const code of [89631139, 46986414, 83011277, 17444133, 77585513, 68638985]) s.add(code, 0, s.C.OcgLocation.DECK);
    s.add(46986414, 1, s.C.OcgLocation.DECK).start();
    perform(s, 'activate', 43175858); requireChain(s, 43175858);
    assert.equal(s.location(0, s.C.OcgLocation.REMOVED).length, 3);
    assert.equal(s.location(0, s.C.OcgLocation.DECK).length, 3);
    endTurn(s);
    perform(s, 'activate', 14087893, { codes: [46986414] });
    const target = s.decisions.find(d => d.prompt.type === s.C.OcgMessageType.SELECT_CARD && d.prompt.selects.some(c => c.code === 46986414));
    assert.ok(target); assert.ok(!target.prompt.selects.some(c => c.code === 42386471));
    perform(s, 'activate', 53129443, { yes: true });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 42386471));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 46986414));
    assert.equal(s.location(0, s.C.OcgLocation.REMOVED).length, 4);
    for (const sequence of [0, 1, 2, 3]) {
      const card = s.card(0, s.C.OcgLocation.REMOVED, sequence);
      assert.ok(card.position & s.C.OcgPosition.FACEDOWN); assert.equal(card.position & s.C.OcgPosition.FACEUP, 0); assert.ok(card.reason & 0x40);
    }
  });

  await run('lair-darkness-opponent-cost-once-token-count-end-phase', [59160188], 'All faceup monsters become DARK; Lilith Tributes an opposing Blue-Eyes as cost, the used substitution is absent from Ahrima’s next cost, and the two real Tributes create two End Phase Torment Tokens.', s => {
    s.add(59160188, 0, s.C.OcgLocation.HAND).add(23898021, 0, s.C.OcgLocation.MZONE)
      .add(86377375, 0, s.C.OcgLocation.MZONE, 1).add(89631139, 1, s.C.OcgLocation.MZONE)
      .add(89631139, 1, s.C.OcgLocation.MZONE, 1);
    for (const code of [44095762, 53582587, 29401950]) s.add(code, 0, s.C.OcgLocation.DECK);
    s.baseDecks().start();
    perform(s, 'activate', 59160188);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attribute, s.C.OcgAttribute.DARK);
    perform(s, 'activate', 23898021, {
      respond: (p, C) => p.type === C.OcgMessageType.SELECT_UNSELECT_CARD ? { type: C.OcgResponseType.SELECT_UNSELECT_CARD,
        index: p.can_finish ? null : p.select_cards.findIndex(c => c.controller === 1) } : null,
      select: p => p.selects.some(c => c.code === 89631139) ? [89631139] : p.min === 3 ? [44095762, 53582587, 29401950] : [44095762]
    });
    const opponentCost = s.location(1, s.C.OcgLocation.GRAVE).find(c => c.code === 89631139);
    assert.ok(opponentCost && (opponentCost.reason & 0x80));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.SZONE, 44095762));
    const decisionStart = s.decisions.length;
    perform(s, 'activate', 86377375, { codes: [86377375], respond: (p, C) => p.type === C.OcgMessageType.SELECT_UNSELECT_CARD
      ? { type: C.OcgResponseType.SELECT_UNSELECT_CARD, index: p.can_finish ? null : p.select_cards.findIndex(c => c.code === 86377375) } : null });
    for (const decision of s.decisions.slice(decisionStart)) {
      const refs = decision.prompt.selects ?? decision.prompt.select_cards ?? [];
      assert.ok(!refs.some(c => c.controller === 1 && c.code === 89631139), 'Lair substitution must be consumed');
    }
    const ownCost = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 86377375);
    assert.ok(ownCost && (ownCost.reason & 0x80));
    endTurn(s); requireChain(s, 59160188);
    const tokens = s.location(0, s.C.OcgLocation.MZONE).filter(c => c.code === 59160189);
    assert.equal(tokens.length, 2);
    for (const sequence of [1, 2]) {
      const token = s.card(0, s.C.OcgLocation.MZONE, sequence);
      assert.equal(token.code, 59160189); assert.equal(token.attack, 1000); assert.equal(token.level, 3);
      assert.equal(token.position, s.C.OcgPosition.FACEUP_DEFENSE);
    }
  });

  await run('marincess-ocean-real-link-summon-grave-equip-bonus', [91027843], 'Link Summon Blue Slug into an actual Extra Monster Zone, resolve Ocean’s true summon trigger, equip Crystal Heart from GY and query the combined 200 plus 600 ATK bonus.', s => {
    s.add(91027843, 0, s.C.OcgLocation.HAND).add(36492575, 0, s.C.OcgLocation.MZONE)
      .add(67712104, 0, s.C.OcgLocation.GRAVE).add(43735670, 0, s.C.OcgLocation.EXTRA).baseDecks().start();
    perform(s, 'activate', 91027843);
    perform(s, 'special', 43735670, { chainCodes: [91027843, 43735670], select: p => p.selects.some(c => c.code === 36492575) ? [36492575] : [67712104] });
    requireChain(s, 91027843);
    const summoned = s.card(0, s.C.OcgLocation.MZONE, 5);
    assert.equal(summoned.code, 43735670); assert.equal(summoned.attack, 2300);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE).code, 67712104);
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.EQUIP));
    assert.ok(s.location(0, s.C.OcgLocation.GRAVE).some(c => c.code === 36492575) || hasCode(s, 0, s.C.OcgLocation.HAND, 36492575));
  });

  await run('hidden-village-ninja-summon-recovery-same-name-activation-lock', [26232916], 'A genuine Hanzo Normal Summon triggers targeted recovery of Armor Ninjitsu Art of Alchemy; its name-wide activation restriction removes both recovered and existing copies despite a valid faceup Ninjitsu Art.', s => {
    s.add(26232916, 0, s.C.OcgLocation.HAND).add(95027497, 0, s.C.OcgLocation.HAND)
      .add(16272453, 0, s.C.OcgLocation.HAND).add(16272453, 0, s.C.OcgLocation.GRAVE)
      .add(70861343, 0, s.C.OcgLocation.SZONE).add(89631139, 0, s.C.OcgLocation.DECK).baseDecks().start();
    const initial = reachIdle(s);
    assert.ok(initial.activates.some(c => c.code === 16272453));
    perform(s, 'activate', 26232916);
    const recovered = perform(s, 'summon', 95027497, { chainCodes: [26232916], codes: [16272453] }); requireChain(s, 26232916);
    assert.equal(s.location(0, s.C.OcgLocation.HAND).filter(c => c.code === 16272453).length, 2);
    assert.ok(!recovered.activates.some(c => c.code === 16272453));
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.BECOME_TARGET));
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.GRAVE, 16272453));
  });

  await run('psy-frame-circuit-alpha-driver-triggered-real-synchro', [575512], 'An opposing Normal Summon triggers genuine Alpha from hand, summons Driver from Deck and searches a second Driver; Circuit then performs a true opponent-turn Synchro Summon of Zeta with those materials.', s => {
    s.add(575512, 0, s.C.OcgLocation.HAND).add(75425043, 0, s.C.OcgLocation.HAND)
      .add(49036338, 0, s.C.OcgLocation.DECK).add(49036338, 0, s.C.OcgLocation.DECK)
      .add(37192109, 0, s.C.OcgLocation.EXTRA).add(23635815, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 575512); endTurn(s);
    perform(s, 'summon', 23635815, { chainCodes: [75425043, 575512], select: p => p.selects.some(c => c.code === 37192109) ? [37192109] : [49036338] });
    requireChain(s, 575512);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 37192109));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 49036338));
    for (const code of [75425043, 49036338]) {
      const material = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === code);
      assert.ok(material && (material.reason & 8) && (material.reason & 0x80000));
    }
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 1);
  });

  await run('salamangreat-sanctuary-genuine-reincarnation-link-once', [1295111], 'Perform a genuine two-FIRE-material Link Summon of Sunlight Wolf, then Sanctuary grants a second Link Summon using that Wolf alone; the shared reincarnation procedure is unavailable for a third copy.', s => {
    s.add(1295111, 0, s.C.OcgLocation.HAND).add(52277807, 0, s.C.OcgLocation.MZONE)
      .add(94620082, 0, s.C.OcgLocation.MZONE, 1);
    for (let index = 0; index < 3; index += 1) s.add(87871125, 0, s.C.OcgLocation.EXTRA);
    s.baseDecks().start();
    perform(s, 'activate', 1295111);
    perform(s, 'special', 87871125);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 1);
    const reincarnated = perform(s, 'special', 87871125); requireChain(s, 1295111);
    const material = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 87871125);
    assert.ok(material && (material.reason & 8) && (material.reason & 0x10000000));
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).filter(c => c.code === 87871125).length, 1);
    assert.ok(!reincarnated.special_summons.some(c => c.code === 87871125));
    assert.equal(s.location(0, s.C.OcgLocation.EXTRA).filter(c => c.code === 87871125).length, 1);
  });

  await run('traptrip-garden-extra-normal-banish-cost-special-limit', [12801833], 'Garden allows exactly one additional Traptrix Normal Summon; its ignition banishes Myrmeleo as cost to Special Summon Dionaea and is consumed while another valid hand target remains.', s => {
    s.add(12801833, 0, s.C.OcgLocation.HAND).add(91812341, 0, s.C.OcgLocation.HAND)
      .add(82738277, 0, s.C.OcgLocation.HAND).add(45803070, 0, s.C.OcgLocation.HAND)
      .add(45803070, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 12801833);
    perform(s, 'summon', 91812341);
    const twoSummons = perform(s, 'summon', 82738277);
    assert.ok(!twoSummons.summons.some(c => c.code === 45803070));
    const exhausted = perform(s, 'activate', 12801833, { select: p => p.selects.some(c => c.code === 91812341) ? [91812341] : [45803070] });
    requireChain(s, 12801833);
    const cost = s.location(0, s.C.OcgLocation.REMOVED).find(c => c.code === 91812341);
    assert.ok(cost && (cost.reason & 0x80));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 45803070));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 45803070));
    assert.ok(!exhausted.activates.some(c => c.code === 12801833));
  });

  await run('rikka-konkon-deck-set-plant-lock-opponent-tribute-cost', [76869711], 'With Petal faceup, Konkon Sets genuine Rikka Glamour from Deck and forbids a non-Plant Gilasaurus procedure; Mudan then Tributes opposing Blue-Eyes as the substituted Plant cost while Petal remains.', s => {
    s.add(76869711, 0, s.C.OcgLocation.HAND).add(71734607, 0, s.C.OcgLocation.MZONE)
      .add(71002019, 0, s.C.OcgLocation.HAND).add(45894482, 0, s.C.OcgLocation.HAND)
      .add(69164989, 0, s.C.OcgLocation.DECK).add(69164989, 0, s.C.OcgLocation.DECK)
      .add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    const initial = reachIdle(s); assert.ok(initial.special_summons.some(c => c.code === 45894482));
    perform(s, 'activate', 76869711);
    const set = perform(s, 'activate', 76869711, { codes: [69164989] });
    assert.equal(s.card(0, s.C.OcgLocation.SZONE).code, 69164989);
    assert.ok(s.card(0, s.C.OcgLocation.SZONE).position & s.C.OcgPosition.FACEDOWN);
    assert.ok(!set.special_summons.some(c => c.code === 45894482));
    assert.ok(!set.activates.some(c => c.code === 76869711));
    perform(s, 'activate', 71002019, { chainCodes: [71002019],
      respond: (p, C) => p.type === C.OcgMessageType.SELECT_UNSELECT_CARD ? { type: C.OcgResponseType.SELECT_UNSELECT_CARD,
        index: p.can_finish ? null : p.select_cards.findIndex(c => c.controller === 1) } : null,
      select: p => p.selects.some(c => c.code === 89631139) ? [89631139] : [69164989]
    });
    requireChain(s, 76869711);
    const cost = s.location(1, s.C.OcgLocation.GRAVE).find(c => c.code === 89631139);
    assert.ok(cost && (cost.reason & 0x80));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 71734607));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 71002019));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 69164989));
  });


  for (const removeBeforeBattle of [false, true]) {
    await run(removeBeforeBattle ? 'sanctuary-sky-removal-restores-fairy-battle-damage' : 'sanctuary-sky-fairy-battle-damage-zero', [56433456],
      removeBeforeBattle ? 'After Sanctuary resolves, opposing MST removes it; Blue-Eyes then destroys Dunames Dark Witch and inflicts the ordinary 1200 battle damage.'
        : 'A real Blue-Eyes attack destroys Dunames Dark Witch, but Sanctuary prevents its owner’s 1200 battle damage without preventing destruction.', s => {
        s.add(56433456, 0, s.C.OcgLocation.HAND).add(12493482, 0, s.C.OcgLocation.MZONE)
          .add(89631139, 1, s.C.OcgLocation.MZONE).add(5318639, 1, s.C.OcgLocation.HAND).baseDecks().start();
        perform(s, 'activate', 56433456); endTurn(s);
        if (removeBeforeBattle) perform(s, 'activate', 5318639, { codes: [56433456] });
        enterBattle(s); battleAttack(s, 89631139, 12493482); leaveBattle(s);
        requireChain(s, 56433456);
        assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 12493482));
        assert.equal(s.duel.queryField().players[0].lp, removeBeforeBattle ? 6800 : 8000);
        assert.equal(s.duel.queryField().players[1].lp, 8000);
        s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
      });
  }

  await run('ancient-forest-flip-without-effects-battle-end-destruction', [87624166], 'Activation turns a facedown Man-Eater Bug and a Defense Position Blue-Eyes into Attack Position without activating the FLIP effect; after a real attack, Forest destroys the surviving attacker at Battle Phase end.', s => {
    s.add(87624166, 0, s.C.OcgLocation.HAND).add(54652250, 0, s.C.OcgLocation.MZONE, 0, s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(89631139, 1, s.C.OcgLocation.MZONE, 0, s.C.OcgPosition.FACEUP_DEFENSE).baseDecks().start();
    perform(s, 'activate', 87624166);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).position, s.C.OcgPosition.FACEUP_ATTACK);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).position, s.C.OcgPosition.FACEUP_ATTACK);
    assert.ok(!s.messages.some(m => m.type === s.C.OcgMessageType.CHAINING && m.code === 54652250));
    endTurn(s); enterBattle(s); battleAttack(s, 89631139, 54652250);
    assert.ok(hasCode(s, 1, s.C.OcgLocation.MZONE, 89631139));
    leaveBattle(s); requireChain(s, 87624166);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 54652250));
    const destroyed = s.location(1, s.C.OcgLocation.GRAVE).find(c => c.code === 89631139);
    assert.ok(destroyed && (destroyed.reason & 0x40));
    assert.equal(s.location(1, s.C.OcgLocation.MZONE).length, 0);
  });

  await run('dark-sanctuary-real-coin-attack-resolution', [16625614], 'An actual opposing direct attack triggers Sanctuary’s mandatory chain and a genuine native coin toss; the observed toss determines whether the attack is negated with half-ATK damage or resolves normally.', s => {
    s.add(16625614, 0, s.C.OcgLocation.HAND).add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 16625614); endTurn(s); enterBattle(s); battleAttack(s, 89631139); leaveBattle(s);
    requireChain(s, 16625614);
    const toss = s.messages.find(m => m.type === s.C.OcgMessageType.TOSS_COIN);
    assert.ok(toss);
    assert.equal(typeof toss.results[0], 'boolean');
    const heads = toss.results[0];
    assert.equal(s.duel.queryField().players[0].lp, heads ? 8000 : 5000);
    assert.equal(s.duel.queryField().players[1].lp, heads ? 6500 : 8000);
    assert.equal(s.messages.some(m => m.type === s.C.OcgMessageType.ATTACK_DISABLED), heads);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('orichalcos-true-special-destruction-extra-lock-protection-duel-oath', [48179391], 'Seal destroys a genuinely Special Summoned Gilasaurus, boosts the remaining Normal Monster, blocks an otherwise valid Link procedure, survives one MST, then is destroyed by a second; Extra Summons return but a second Seal is still forbidden by the duel oath.', s => {
    s.add(48179391, 0, s.C.OcgLocation.HAND).add(48179391, 0, s.C.OcgLocation.HAND)
      .add(45894482, 0, s.C.OcgLocation.HAND).add(23635815, 0, s.C.OcgLocation.MZONE)
      .add(98978921, 0, s.C.OcgLocation.EXTRA).add(5318639, 0, s.C.OcgLocation.HAND)
      .add(5318639, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'special', 45894482);
    const initial = reachIdle(s); assert.ok(initial.special_summons.some(c => c.code === 98978921));
    const sealed = perform(s, 'activate', 48179391); requireChain(s, 48179391);
    const destroyed = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 45894482);
    assert.ok(destroyed && (destroyed.reason & 0x40));
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2250);
    assert.ok(!sealed.special_summons.some(c => c.code === 98978921));
    assert.ok(!sealed.activates.some(c => c.code === 48179391 && c.location === s.C.OcgLocation.HAND));
    perform(s, 'activate', 5318639, { codes: [48179391] });
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).code, 48179391);
    const released = perform(s, 'activate', 5318639, { codes: [48179391] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 48179391));
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1750);
    assert.ok(released.special_summons.some(c => c.code === 98978921));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 48179391));
    assert.ok(!released.activates.some(c => c.code === 48179391 && c.location === s.C.OcgLocation.HAND));
  });


  await run('marincess-ocean-crystal-heart-material-opponent-immunity', [91027843], 'Link Summon Crystal Heart with real WATER materials, then use it for a true Marbled Rock Link Summon in the Extra Monster Zone; Ocean equips that material and protects Rock from opposing Dark Hole, while the owner’s Dark Hole still destroys it.', s => {
    s.add(91027843, 0, s.C.OcgLocation.HAND).add(36492575, 0, s.C.OcgLocation.MZONE)
      .add(36492575, 0, s.C.OcgLocation.MZONE, 1).add(68638985, 0, s.C.OcgLocation.MZONE, 2)
      .add(67712104, 0, s.C.OcgLocation.EXTRA).add(5524387, 0, s.C.OcgLocation.EXTRA)
      .add(53129443, 0, s.C.OcgLocation.HAND).add(53129443, 1, s.C.OcgLocation.HAND)
      .add(46986414, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 91027843);
    perform(s, 'special', 67712104);
    const linked = perform(s, 'special', 5524387, {
      chainCodes: [91027843], place: p => ((p.field_mask >>> 0) & (1 << 5)) === 0
        ? [{ player: p.player, location: s.C.OcgLocation.MZONE, sequence: 5 }] : choosePlace(p, s.C)
    });
    requireChain(s, 91027843);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 5).code, 5524387);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 5).attack, 3300);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE).code, 67712104);
    assert.ok(!linked.special_summons.some(c => c.code === 5524387));
    endTurn(s); perform(s, 'activate', 53129443);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 5).code, 5524387);
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 46986414));
    endTurn(s); perform(s, 'activate', 53129443);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 5524387));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 67712104));
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 0);
  });

  await run('rikka-konkon-glamour-opponent-tribute-two-distinct-searches', [76869711], 'Konkon replaces Glamour’s optional Plant Tribute with opposing Blue-Eyes; genuine resolution searches Mudan and a differently named Level 6 Plant, preserving Petal. Field activation alone does not impose the Set ignition’s Plant-only lock.', s => {
    s.add(76869711, 0, s.C.OcgLocation.HAND).add(69164989, 0, s.C.OcgLocation.HAND)
      .add(71734607, 0, s.C.OcgLocation.MZONE).add(45894482, 0, s.C.OcgLocation.HAND)
      .add(71002019, 0, s.C.OcgLocation.DECK).add(7407724, 0, s.C.OcgLocation.DECK)
      .add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    const activated = perform(s, 'activate', 76869711);
    assert.ok(activated.special_summons.some(c => c.code === 45894482));
    const afterSearch = perform(s, 'activate', 69164989, {
      respond: (p, C) => p.type === C.OcgMessageType.SELECT_UNSELECT_CARD ? { type: C.OcgResponseType.SELECT_UNSELECT_CARD,
        index: p.can_finish ? null : p.select_cards.findIndex(c => c.controller === 1) } : null,
      select: p => p.selects.some(c => c.code === 89631139) ? [89631139] : p.selects.some(c => c.code === 71002019) ? [71002019] : [7407724]
    });
    requireChain(s, 76869711);
    const cost = s.location(1, s.C.OcgLocation.GRAVE).find(c => c.code === 89631139);
    assert.ok(cost && (cost.reason & 0x80));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 71734607));
    for (const code of [71002019, 7407724]) assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, code));
    assert.ok(afterSearch.special_summons.some(c => c.code === 45894482));
    assert.ok(!afterSearch.activates.some(c => c.code === 69164989));
  });

  await run('domain-monarchs-damage-calculation-only-tribute-attack-bonus', [84171830], 'A true Tribute Summoned Erebus attacks opposing Blue-Eyes; Domain grants 800 ATK specifically during damage calculation, inflicts 600 battle damage, then the public query returns Erebus to its normal 2800 ATK.', s => {
    s.add(84171830, 0, s.C.OcgLocation.HAND).add(23064604, 0, s.C.OcgLocation.HAND)
      .add(23635815, 0, s.C.OcgLocation.MZONE).add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 84171830); perform(s, 'activate', 84171830, { codes: [23064604] });
    perform(s, 'summon', 23064604); endTurn(s); endTurn(s);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2800);
    enterBattle(s); battleAttack(s, 23064604, 89631139); leaveBattle(s); requireChain(s, 84171830);
    const calculation = s.messages.find(m => m.type === s.C.OcgMessageType.BATTLE);
    assert.ok(calculation); assert.equal(calculation.card.attack, 3600);
    assert.equal(calculation.target.attack, 3000);
    assert.equal(s.duel.queryField().players[1].lp, 7400);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2800);
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 89631139));
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('dark-sanctuary-heads-negates-attack-half-atk-effect-damage', [16625614], 'A second genuine RNG seed produces heads on the native coin toss; Sanctuary negates the declared attack and deals exactly half of Blue-Eyes’s 3000 ATK as effect damage to the attacker’s controller.', s => {
    s.add(16625614, 0, s.C.OcgLocation.HAND).add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 16625614); endTurn(s); enterBattle(s); battleAttack(s, 89631139); leaveBattle(s);
    requireChain(s, 16625614);
    const toss = s.messages.find(m => m.type === s.C.OcgMessageType.TOSS_COIN);
    assert.ok(toss); assert.equal(toss.results[0], true);
    assert.equal(s.duel.queryField().players[0].lp, 8000);
    assert.equal(s.duel.queryField().players[1].lp, 6500);
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.ATTACK_DISABLED));
    const damage = s.messages.find(m => m.type === s.C.OcgMessageType.DAMAGE);
    assert.equal(damage.player, 1); assert.equal(damage.amount, 1500);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  }, { seed: [0x123456789abcdef0n, 0xfedcba9876543210n, 0x9e3779b97f4a7c15n, 0xbf58476d1ce4e5b9n] });

  await run('catalyst-field-true-gemini-extra-summon-banish-return', [65959844], 'Catalyst permits a Level 8 Gemini Normal Summon without Tribute and a genuine second Gemini summon; its ignition banishes that effect Gemini by effect, destroys the target and returns the monster at the opponent’s End Phase.', s => {
    s.add(65959844, 0, s.C.OcgLocation.HAND).add(44088292, 0, s.C.OcgLocation.HAND)
      .add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 65959844);
    perform(s, 'summon', 44088292); perform(s, 'summon', 44088292);
    assert.ok(s.card(0, s.C.OcgLocation.MZONE).type & s.C.OcgType.EFFECT);
    perform(s, 'activate', 65959844, { select: p => [p.selects.some(c => c.code === 89631139) ? 89631139 : 44088292] });
    requireChain(s, 65959844);
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 89631139));
    const removed = s.location(0, s.C.OcgLocation.REMOVED).find(c => c.code === 44088292);
    assert.ok(removed && (removed.reason & 0x40) && !(removed.reason & 0x80));
    endTurn(s); assert.ok(hasCode(s, 0, s.C.OcgLocation.REMOVED, 44088292));
    endTurn(s); assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 44088292));
    assert.equal(s.location(0, s.C.OcgLocation.REMOVED).length, 0);
  });

  await run('giant-ballpark-damage-step-mill-three-normal-insects', [58012707], 'During genuine pre-damage calculation, Ballpark prevents both players’ battle damage, sends Insect Knight from the Deck and Special Summons all three copies from Deck, hand and GY.', s => {
    s.add(58012707, 0, s.C.OcgLocation.HAND).add(35052053, 0, s.C.OcgLocation.DECK)
      .add(35052053, 0, s.C.OcgLocation.HAND).add(35052053, 0, s.C.OcgLocation.GRAVE)
      .add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 58012707); endTurn(s); enterBattle(s);
    battleAttack(s, 89631139, null, { chainCodes: [58012707], codes: [35052053] }); leaveBattle(s);
    requireChain(s, 58012707);
    assert.equal(s.duel.queryField().players[0].lp, 8000);
    assert.equal(s.duel.queryField().players[1].lp, 8000);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).filter(c => c.code === 35052053).length, 3);
    assert.equal(s.location(0, s.C.OcgLocation.GRAVE).filter(c => c.code === 35052053).length, 0);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('generaider-stage-opponent-draw-boss-four-tokens-end-destruction', [38053381], 'An opponent’s genuine Upstart Goblin draw triggers Stage on their turn; Mardel is summoned in defense, four real tokens fill the zones and only those tokens are destroyed in the End Phase.', s => {
    s.add(38053381, 0, s.C.OcgLocation.HAND).add(13903402, 0, s.C.OcgLocation.DECK)
      .add(70368879, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 38053381); endTurn(s);
    perform(s, 'activate', 70368879, { chainCodes: [38053381], codes: [13903402] });
    requireChain(s, 38053381);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).code, 13903402);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).position, s.C.OcgPosition.FACEUP_DEFENSE);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).filter(c => c.code === 38053382).length, 4);
    for (let sequence = 1; sequence < 5; sequence++) {
      const token = s.card(0, s.C.OcgLocation.MZONE, sequence);
      assert.equal(token.attack, 1500); assert.equal(token.level, 4);
    }
    endTurn(s);
    assert.deepEqual(s.location(0, s.C.OcgLocation.MZONE).map(c => c.code), [13903402]);
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.GRAVE, 38053382), 'Destroyed tokens cease to exist');
  });

  await run('magnetic-field-targeted-revival-once-battle-survivor-bounce', [4740489], 'With a real EARTH Rock, Magnetic Field revives Beta from the GY once; after Beta battles a surviving defense-position Blue-Eyes, the Damage Step trigger returns Blue-Eyes to hand.', s => {
    s.add(4740489, 0, s.C.OcgLocation.HAND).add(11549357, 0, s.C.OcgLocation.MZONE)
      .add(39256679, 0, s.C.OcgLocation.GRAVE).add(99785935, 0, s.C.OcgLocation.GRAVE)
      .add(89631139, 1, s.C.OcgLocation.MZONE, 0, s.C.OcgPosition.FACEUP_DEFENSE).baseDecks().start();
    perform(s, 'activate', 4740489);
    const after = perform(s, 'activate', 4740489, { codes: [39256679] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 39256679));
    assert.ok(!after.activates.some(c => c.code === 4740489));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 99785935));
    endTurn(s); endTurn(s); enterBattle(s);
    battleAttack(s, 39256679, 89631139, { chainCodes: [4740489] }); leaveBattle(s);
    requireChain(s, 4740489);
    assert.ok(hasCode(s, 1, s.C.OcgLocation.HAND, 89631139));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 39256679));
    assert.equal(s.duel.queryField().players[0].lp, 7200);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('cyberdark-inferno-bounce-extra-normal-equip-opponent-search', [44352516], 'Inferno returns Cyberdark Horn to hand and actually Normal Summons it during resolution; Horn equips Claw from the GY. Opposing Dark Hole cannot destroy the equipped Horn, and opposing MST destroying Inferno searches Instant Fusion.', s => {
    s.add(44352516, 0, s.C.OcgLocation.HAND).add(41230939, 0, s.C.OcgLocation.MZONE)
      .add(82562802, 0, s.C.OcgLocation.GRAVE).add(1845204, 0, s.C.OcgLocation.DECK)
      .add(53129443, 1, s.C.OcgLocation.HAND).add(5318639, 1, s.C.OcgLocation.HAND)
      .add(46986414, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 44352516);
    perform(s, 'activate', 44352516, { chainCodes: [41230939], select: p => [p.selects.some(c => c.code === 82562802) ? 82562802 : 41230939] });
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2400);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE).code, 82562802);
    endTurn(s); perform(s, 'activate', 53129443);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).code, 41230939);
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 46986414));
    perform(s, 'activate', 5318639, { codes: [44352516], chainCodes: [44352516], select: p => [p.selects.some(c => c.code === 44352516) ? 44352516 : 1845204] });
    requireChain(s, 44352516);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 1845204));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 44352516));
  });

  await run('dream-mirror-joy-highest-level-target-protection', [74665651], 'A LIGHT Dream Mirror enables Joy; the opponent’s real Book of Moon target prompt excludes low-Level Ikelos while still offering high-Level Morpheus and an unrelated Dark Magician.', s => {
    s.add(74665651, 0, s.C.OcgLocation.HAND).add(49389190, 0, s.C.OcgLocation.MZONE)
      .add(1872843, 0, s.C.OcgLocation.MZONE, 1).add(46986414, 0, s.C.OcgLocation.MZONE, 2)
      .add(14087893, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 74665651); endTurn(s);
    perform(s, 'activate', 14087893, { select: p => {
      assert.ok(!p.selects.some(c => c.code === 49389190));
      assert.ok(p.selects.some(c => c.code === 1872843));
      assert.ok(p.selects.some(c => c.code === 46986414)); return [46986414];
    } });
    requireChain(s, 74665651);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 2).position, s.C.OcgPosition.FACEDOWN_DEFENSE);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).position, s.C.OcgPosition.FACEUP_ATTACK);
  });

  await run('dream-mirror-terror-two-opponent-specials-cost-swap-joy', [1050355], 'A DARK Dream Mirror causes 300 damage for each of two opposing Gilasaurus Special Summons. At the real End Phase Terror banishes itself as cost and activates Joy from the Deck.', s => {
    s.add(1050355, 0, s.C.OcgLocation.HAND).add(75888208, 0, s.C.OcgLocation.MZONE)
      .add(74665651, 0, s.C.OcgLocation.DECK).add(45894482, 1, s.C.OcgLocation.HAND)
      .add(45894482, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 1050355); endTurn(s, { yes: false });
    perform(s, 'special', 45894482); assert.equal(s.duel.queryField().players[1].lp, 7700);
    perform(s, 'special', 45894482); assert.equal(s.duel.queryField().players[1].lp, 7400);
    endTurn(s, { chainCodes: [1050355], codes: [74665651] }); requireChain(s, 1050355);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).code, 74665651);
    const removed = s.location(0, s.C.OcgLocation.REMOVED).find(c => c.code === 1050355);
    assert.ok(removed && (removed.reason & 0x80));
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.DAMAGE && m.amount === 300).length, 2);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('madolche-chateau-grave-shuffle-bilateral-bonus-return-hand', [14001430], 'Activation shuffles the actual GY Madolche monster into the Deck and boosts both players’ Madolche; opposing Dark Hole triggers Magileine’s own return, redirected to hand by Chateau rather than to the Deck.', s => {
    s.add(14001430, 0, s.C.OcgLocation.HAND).add(12980373, 0, s.C.OcgLocation.GRAVE)
      .add(11868731, 0, s.C.OcgLocation.MZONE).add(11868731, 1, s.C.OcgLocation.MZONE)
      .add(53129443, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 14001430); requireChain(s, 14001430);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 12980373));
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.GRAVE, 12980373));
    for (const player of [0, 1]) assert.equal(s.card(player, s.C.OcgLocation.MZONE).attack, 1900);
    endTurn(s); perform(s, 'activate', 53129443);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 11868731));
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.DECK, 11868731));
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 11868731));
  });

  await run('mystic-mine-monster-count-switch-effects-attacks-self-destroy', [76375976], 'Mine blocks the player with more monsters. Real Raigeki reverses that count and the formerly available own Exiled Force effect becomes forbidden; clearing the remaining monster makes Mine destroy itself at End Phase.', s => {
    s.add(76375976, 0, s.C.OcgLocation.HAND).add(74131780, 0, s.C.OcgLocation.MZONE)
      .add(74131780, 1, s.C.OcgLocation.MZONE).add(89631139, 1, s.C.OcgLocation.MZONE, 1)
      .add(12580477, 0, s.C.OcgLocation.HAND).add(53129443, 0, s.C.OcgLocation.HAND).baseDecks().start();
    const owner = perform(s, 'activate', 76375976);
    assert.ok(owner.activates.some(c => c.code === 74131780));
    const opponent = endTurn(s);
    assert.ok(!opponent.activates.some(c => c.code === 74131780));
    assert.equal(enterBattle(s).attacks.length, 0); leaveBattle(s); endTurn(s);
    const reversed = perform(s, 'activate', 12580477);
    assert.ok(!reversed.activates.some(c => c.code === 74131780));
    assert.equal(enterBattle(s).attacks.length, 0); leaveBattle(s);
    perform(s, 'activate', 53129443); endTurn(s); requireChain(s, 76375976);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 76375976));
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 0);
    assert.equal(s.location(1, s.C.OcgLocation.MZONE).length, 0);
  });

  await run('realm-light-one-counter-per-mill-batch-two-counter-replacement', [36099620], 'Card Trooper mills three actual Deck cards as one cost event, adding only one Shine Counter; a separate Foolish Burial adds the second. Two counters grant 200 ATK to Jain and replace the first MST, but the next MST destroys Realm.', s => {
    s.add(36099620, 0, s.C.OcgLocation.HAND).add(85087012, 0, s.C.OcgLocation.MZONE)
      .add(96235275, 0, s.C.OcgLocation.MZONE, 1).add(81439173, 0, s.C.OcgLocation.HAND)
      .add(89631139, 0, s.C.OcgLocation.DECK).add(23635815, 0, s.C.OcgLocation.DECK)
      .add(2964201, 0, s.C.OcgLocation.DECK).add(76812113, 0, s.C.OcgLocation.DECK)
      .add(5318639, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 36099620); perform(s, 'activate', 85087012);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).counters['5'], 1);
    assert.equal(s.location(0, s.C.OcgLocation.GRAVE).filter(c => (c.reason & 0x80)).length, 3);
    perform(s, 'activate', 81439173);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).counters['5'], 2);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).attack, 2000);
    perform(s, 'activate', 5318639, { codes: [36099620] });
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).code, 36099620);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).counters['5'] ?? 0, 0);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).attack, 1800);
    perform(s, 'activate', 5318639, { codes: [36099620] }); requireChain(s, 36099620);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 36099620));
  });

  await run('advanced-dark-attribute-grave-damage-step-deck-cost-prevention', [12644061], 'Crystal Beasts on both fields and in the GY become DARK. During Blue-Eyes’s real attack, Advanced Dark sends Ruby Carbuncle from Deck as cost and prevents battle damage while Sapphire Pegasus is still destroyed.', s => {
    s.add(12644061, 0, s.C.OcgLocation.HAND).add(7093411, 0, s.C.OcgLocation.MZONE)
      .add(69937550, 0, s.C.OcgLocation.GRAVE).add(32710364, 0, s.C.OcgLocation.DECK)
      .add(95600067, 1, s.C.OcgLocation.MZONE).add(89631139, 1, s.C.OcgLocation.MZONE, 1).baseDecks().start();
    perform(s, 'activate', 12644061);
    for (const [player, zone] of [[0, s.C.OcgLocation.MZONE], [0, s.C.OcgLocation.GRAVE], [1, s.C.OcgLocation.MZONE]]) {
      assert.equal(s.card(player, zone).attribute, 32);
    }
    endTurn(s); enterBattle(s); battleAttack(s, 89631139, 7093411, { chainCodes: [12644061], codes: [32710364], effectYes: p => p.code === 12644061 }); leaveBattle(s);
    requireChain(s, 12644061);
    assert.equal(s.duel.queryField().players[0].lp, 8000);
    const cost = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 32710364);
    assert.ok(cost && (cost.reason & 0x80) && !(cost.reason & 0x40));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 7093411));
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('amorphous-persona-bilateral-bonus-tribute-pendulum-draw', [23160024], 'Persona boosts both players’ Amorphage by 300 ATK/DEF. An actual Tribute Summon releases own Wrath, sends that Pendulum to the face-up Extra Deck and causes a real draw.', s => {
    s.add(23160024, 0, s.C.OcgLocation.HAND).add(79794767, 0, s.C.OcgLocation.MZONE)
      .add(6283472, 1, s.C.OcgLocation.MZONE).add(70781052, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 23160024);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1950);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 2050);
    perform(s, 'summon', 70781052); requireChain(s, 23160024);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 70781052));
    const extra = s.card(0, s.C.OcgLocation.EXTRA);
    assert.equal(extra.code, 79794767); assert.ok(extra.position & s.C.OcgPosition.FACEUP);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 46986414));
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.DRAW).length, 1);
  });

  await run('s-force-bridgehead-search-oath-same-column-battle-protection', [23377425], 'Bridgehead searches an S-Force and forbids the second activation despite another target. Blue-Eyes in the matching mirrored column attacks Orrafist; the native trigger prevents destruction, but the 1200 battle damage still occurs.', s => {
    s.add(23377425, 0, s.C.OcgLocation.HAND).add(23377425, 0, s.C.OcgLocation.HAND)
      .add(22180094, 0, s.C.OcgLocation.DECK).add(22180094, 0, s.C.OcgLocation.DECK)
      .add(95974848, 0, s.C.OcgLocation.MZONE).add(89631139, 1, s.C.OcgLocation.MZONE, 4).baseDecks().start();
    const searched = perform(s, 'activate', 23377425, { codes: [22180094] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 22180094));
    assert.ok(!searched.activates.some(c => c.code === 23377425));
    endTurn(s); enterBattle(s); battleAttack(s, 89631139, 95974848, { chainCodes: [23377425] }); leaveBattle(s);
    requireChain(s, 23377425);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 95974848));
    assert.equal(s.duel.queryField().players[0].lp, 6800);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('duel-academy-three-race-branches-independent-turn-limits', [5833312], 'Real Spell, Trap and Monster activations with qualifying races trigger Academy’s three different branches: 1000 effect damage once, targeted destruction and a lasting 1000 ATK increase. A second Spell deals only its own damage.', s => {
    s.add(5833312, 0, s.C.OcgLocation.HAND).add(75953262, 0, s.C.OcgLocation.MZONE)
      .add(37265642, 0, s.C.OcgLocation.MZONE, 1).add(85087012, 0, s.C.OcgLocation.MZONE, 2)
      .add(83968380, 0, s.C.OcgLocation.SZONE, 0, s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(46130346, 0, s.C.OcgLocation.HAND).add(46130346, 0, s.C.OcgLocation.HAND)
      .add(89631139, 0, s.C.OcgLocation.DECK).add(23635815, 0, s.C.OcgLocation.DECK)
      .add(2964201, 0, s.C.OcgLocation.DECK).add(76812113, 0, s.C.OcgLocation.DECK)
      .add(54652250, 0, s.C.OcgLocation.DECK).add(46986414, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 5833312);
    perform(s, 'activate', 46130346, { chainCodes: [5833312] });
    assert.equal(s.duel.queryField().players[1].lp, 6500);
    perform(s, 'activate', 46130346, { chainCodes: [5833312] });
    assert.equal(s.duel.queryField().players[1].lp, 6000);
    perform(s, 'activate', 83968380, { chainCodes: [5833312], codes: [46986414] });
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 46986414));
    perform(s, 'activate', 85087012, { chainCodes: [5833312], codes: [85087012] });
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 2).attack, 2900);
    endTurn(s); assert.equal(s.card(0, s.C.OcgLocation.MZONE, 2).attack, 1400);
    requireChain(s, 5833312);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('hexatellarknight-real-xyz-material-bonus-cost-negate-attack', [70422863], 'A genuine two-material Batlamyus Xyz Summon receives 400 ATK/DEF from Hexatellarknight; when attacked, an actual Tellarknight discard as cost negates Blue-Eyes’s attack without losing an overlay.', s => {
    s.add(70422863, 0, s.C.OcgLocation.HAND).add(75878039, 0, s.C.OcgLocation.MZONE)
      .add(2273734, 0, s.C.OcgLocation.MZONE, 1).add(64414267, 0, s.C.OcgLocation.EXTRA)
      .add(38667773, 0, s.C.OcgLocation.HAND).add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 70422863); perform(s, 'special', 64414267);
    const xyz = s.card(0, s.C.OcgLocation.MZONE, 0, s.C.OcgQueryFlags.OVERLAY_CARD);
    assert.equal(xyz.attack, 3000); assert.equal(xyz.defense, 950);
    assert.deepEqual(xyz.overlayCards.slice().sort(), [2273734, 75878039]);
    endTurn(s); enterBattle(s); battleAttack(s, 89631139, 64414267, { chainCodes: [70422863], codes: [38667773] }); leaveBattle(s);
    requireChain(s, 70422863);
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.ATTACK_DISABLED));
    const cost = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 38667773);
    assert.ok(cost && (cost.reason & 0x80));
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 0, s.C.OcgQueryFlags.OVERLAY_CARD).overlayCards.length, 2);
    assert.equal(s.duel.queryField().players[0].lp, 8000);
  });

  await run('magnacarrier-three-matching-xyz-genuine-overlay-king-six-materials', [10424147], 'Three real discard costs let Magnacarrier Xyz Summon matching WATER, FIRE and WIND Mech Beasts over their Quantum Layers; its second effect sends itself as cost and builds Great Magnus with all three beasts and their three overlays.', s => {
    s.add(10424147, 0, s.C.OcgLocation.HAND).add(12369277, 0, s.C.OcgLocation.MZONE)
      .add(59975920, 0, s.C.OcgLocation.MZONE, 1).add(85374678, 0, s.C.OcgLocation.MZONE, 2)
      .add(85252081, 0, s.C.OcgLocation.EXTRA).add(57031794, 0, s.C.OcgLocation.EXTRA)
      .add(11646785, 0, s.C.OcgLocation.EXTRA).add(84025439, 0, s.C.OcgLocation.EXTRA)
      .add(5318639, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND)
      .add(5318639, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 10424147);
    for (const [layer, beast] of [[12369277, 85252081], [59975920, 57031794], [85374678, 11646785]]) {
      perform(s, 'activate', 10424147, { select: p => [p.selects.some(c => c.code === 5318639) ? 5318639 : p.selects.some(c => c.code === layer) ? layer : beast] });
      const monsters = s.location(0, s.C.OcgLocation.MZONE);
      assert.ok(monsters.some(c => c.code === beast));
    }
    perform(s, 'activate', 10424147, { codes: [84025439] }); requireChain(s, 10424147);
    const king = s.card(0, s.C.OcgLocation.MZONE, 3, s.C.OcgQueryFlags.OVERLAY_CARD);
    assert.equal(king.code, 84025439); assert.equal(king.overlayCards.length, 6);
    assert.deepEqual(king.overlayCards.slice().sort((a, b) => a - b), [12369277, 59975920, 85374678, 85252081, 57031794, 11646785].sort((a, b) => a - b));
    const field = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 10424147);
    assert.ok(field && (field.reason & 0x80));
    const costs = s.location(0, s.C.OcgLocation.GRAVE).filter(c => c.code === 5318639);
    assert.equal(costs.length, 3); assert.ok(costs.every(c => (c.reason & 0x80) && (c.reason & 0x4000)));
  });

  await run('fa-circuit-battle-only-level-boost-battle-draw-destroy-search', [39838559], 'Circuit adds two F.A. Levels only in a genuine Battle Phase; Hang On Mach then destroys Jerry Beans and triggers a draw. The Levels reset in Main Phase 2 and MST destruction searches an F.A. card.', s => {
    s.add(39838559, 0, s.C.OcgLocation.HAND).add(93449450, 0, s.C.OcgLocation.MZONE)
      .add(23635815, 1, s.C.OcgLocation.MZONE).add(39271553, 0, s.C.OcgLocation.DECK)
      .add(39271553, 0, s.C.OcgLocation.DECK).add(5318639, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 39838559, { effectYes: () => false });
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).level, 4);
    endTurn(s); endTurn(s); enterBattle(s);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).level, 6);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1800);
    battleAttack(s, 93449450, 23635815, { chainCodes: [39838559], effectYes: p => p.code === 39838559 }); leaveBattle(s);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).level, 4);
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 23635815));
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.DRAW).length, 1);
    const before = s.location(0, s.C.OcgLocation.HAND).length;
    perform(s, 'activate', 5318639, { chainCodes: [39838559], select: p => [p.selects.some(c => c.code === 39838559) ? 39838559 : 39271553] });
    requireChain(s, 39838559);
    assert.equal(s.location(0, s.C.OcgLocation.HAND).length, before);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 39271553));
  });

  await run('fa-city-main-battle-levels-opponent-target-lock-removal', [1061200], 'City grants two F.A. Levels in Main and Battle Phases to both players. An opposing Book of Moon cannot target the protected own F.A., but can target Dark Magician; destroying City searches F.A. and restores both Levels.', s => {
    s.add(1061200, 0, s.C.OcgLocation.HAND).add(93449450, 0, s.C.OcgLocation.MZONE)
      .add(46986414, 0, s.C.OcgLocation.MZONE, 1).add(93449450, 1, s.C.OcgLocation.MZONE)
      .add(39271553, 0, s.C.OcgLocation.DECK).add(14087893, 1, s.C.OcgLocation.HAND)
      .add(5318639, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 1061200, { effectYes: () => false });
    for (const player of [0, 1]) assert.equal(s.card(player, s.C.OcgLocation.MZONE).level, 6);
    endTurn(s); perform(s, 'activate', 14087893, { select: p => {
      assert.ok(!p.selects.some(c => c.controller === 0 && c.code === 93449450)); return [46986414];
    }, effectYes: () => false });
    enterBattle(s); assert.equal(s.card(0, s.C.OcgLocation.MZONE).level, 6); leaveBattle(s);
    perform(s, 'activate', 5318639, { chainCodes: [1061200], select: p => [p.selects.some(c => c.code === 1061200) ? 1061200 : 39271553], effectYes: p => p.code === 1061200 });
    requireChain(s, 1061200);
    for (const player of [0, 1]) assert.equal(s.card(player, s.C.OcgLocation.MZONE).level, 4);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 39271553));
  });

  await run('fa-offroad-main-only-level-battle-loss-random-discard-search', [2144946], 'Off-Road grants two Levels during Main but not Battle Phase. A genuine F.A. battle destruction forces the opponent’s only hand card to be discarded by effect; MST later destroys the Field and searches an F.A. card.', s => {
    s.add(2144946, 0, s.C.OcgLocation.HAND).add(93449450, 0, s.C.OcgLocation.MZONE)
      .add(89631139, 1, s.C.OcgLocation.MZONE).add(46986414, 1, s.C.OcgLocation.HAND)
      .add(5318639, 1, s.C.OcgLocation.SZONE, 0, s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(39271553, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 2144946, { effectYes: () => false });
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).level, 6);
    endTurn(s); enterBattle(s); assert.equal(s.card(0, s.C.OcgLocation.MZONE).level, 4);
    battleAttack(s, 89631139, 93449450, { chainCodes: [2144946] }); leaveBattle(s);
    const discarded = s.location(1, s.C.OcgLocation.GRAVE).find(c => c.code === 46986414);
    assert.ok(discarded && (discarded.reason & 0x4000) && (discarded.reason & 0x40) && !(discarded.reason & 0x80));
    perform(s, 'activate', 5318639, { chainCodes: [2144946], select: p => [p.selects.some(c => c.code === 2144946) ? 2144946 : 39271553] });
    requireChain(s, 2144946); assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 39271553));
  });

  await run('doll-house-gy-normal-name-pair-level-six-dark-once', [67331360], 'Doll House targets a real zero-DEF Normal Monster in the GY and Special Summons a matching Deck copy as Level 6 DARK, preserving the target. A second matching Deck copy remains, but the ignition is unavailable after use.', s => {
    s.add(67331360, 0, s.C.OcgLocation.HAND).add(23635815, 0, s.C.OcgLocation.GRAVE)
      .add(23635815, 0, s.C.OcgLocation.DECK).add(23635815, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 67331360);
    const after = perform(s, 'activate', 67331360, { codes: [23635815] }); requireChain(s, 67331360);
    const monster = s.card(0, s.C.OcgLocation.MZONE);
    assert.equal(monster.code, 23635815); assert.equal(monster.level, 6); assert.equal(monster.attribute, 32);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 23635815));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 23635815));
    assert.ok(!after.activates.some(c => c.code === 67331360));
  });

  await run('live-twin-channel-tribute-cost-negate-empty-field-recover-hand', [35487920], 'Channel Tributes own Ki-sikil as cost to negate Blue-Eyes’s real attack; with no remaining own monster, the genuine End Phase recovery selects the hand instead of the Deck.', s => {
    s.add(35487920, 0, s.C.OcgLocation.HAND).add(36326160, 0, s.C.OcgLocation.MZONE)
      .add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 35487920); endTurn(s); enterBattle(s);
    battleAttack(s, 89631139, 36326160, { chainCodes: [35487920] }); leaveBattle(s);
    const tribute = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 36326160);
    assert.ok(tribute && (tribute.reason & 0x80) && (tribute.reason & 0x2));
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.ATTACK_DISABLED));
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 0);
    endTurn(s, { chainCodes: [35487920], codes: [36326160] }); requireChain(s, 35487920);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 36326160));
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.DECK, 36326160));
    assert.equal(s.duel.queryField().players[0].lp, 8500);
    assert.ok(s.messages.some(m => m.type === s.C.OcgMessageType.RECOVER && m.amount === 500));
  });

  await run('punk-session-banish-cost-special-three-lp-payments-two-draws', [49370016], 'Session banishes a real P.U.N.K. as cost to summon Ze Amin; three different on-field Psychic P.U.N.K. effects each pay 600 LP, but the Field draws only for the first two payments under its shared twice-per-turn limit.', s => {
    s.add(49370016, 0, s.C.OcgLocation.HAND).add(19535693, 0, s.C.OcgLocation.HAND)
      .add(6609736, 0, s.C.OcgLocation.GRAVE).add(82041999, 0, s.C.OcgLocation.MZONE)
      .add(50642380, 0, s.C.OcgLocation.DECK).add(50642380, 0, s.C.OcgLocation.DECK)
      .add(81192859, 0, s.C.OcgLocation.DECK).add(81192859, 0, s.C.OcgLocation.DECK)
      .add(43685562, 0, s.C.OcgLocation.DECK).add(43685562, 0, s.C.OcgLocation.DECK)
      .add(55920742, 0, s.C.OcgLocation.DECK).add(55920742, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 49370016);
    perform(s, 'activate', 49370016, { select: p => [p.selects.some(c => c.code === 6609736) ? 6609736 : 19535693] });
    const cost = s.location(0, s.C.OcgLocation.REMOVED).find(c => c.code === 6609736); assert.ok(cost && (cost.reason & 0x80));
    perform(s, 'activate', 19535693, { chainCodes: [49370016], codes: [50642380] });
    perform(s, 'summon', 50642380);
    perform(s, 'activate', 50642380, { chainCodes: [49370016], codes: [81192859] });
    perform(s, 'activate', 82041999, { chainCodes: [49370016], codes: [43685562] }); requireChain(s, 49370016);
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.PAY_LPCOST && m.amount === 600).length, 3);
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.DRAW).length, 2);
    assert.equal(s.duel.queryField().players[0].lp, 6200);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('magicians-salvation-deck-set-oath-real-reborn-other-name', [95477924], 'Salvation Sets actual Eternal Soul from the Deck and applies its activation oath. Monster Reborn genuinely summons Dark Magician; Salvation targets it and Special Summons the different name Dark Magician Girl from the GY.', s => {
    s.add(95477924, 0, s.C.OcgLocation.HAND).add(95477924, 0, s.C.OcgLocation.HAND)
      .add(48680970, 0, s.C.OcgLocation.DECK).add(48680970, 0, s.C.OcgLocation.DECK)
      .add(46986414, 0, s.C.OcgLocation.GRAVE).add(38033120, 0, s.C.OcgLocation.GRAVE)
      .add(83764718, 0, s.C.OcgLocation.HAND).baseDecks().start();
    const after = perform(s, 'activate', 95477924, { codes: [48680970] });
    const trap = s.card(0, s.C.OcgLocation.SZONE);
    assert.equal(trap.code, 48680970); assert.ok(trap.position & s.C.OcgPosition.FACEDOWN);
    assert.ok(!after.activates.some(c => c.code === 95477924));
    perform(s, 'activate', 83764718, { chainCodes: [95477924], select: p => [p.selects.some(c => c.code === 46986414) ? 46986414 : 38033120] }); requireChain(s, 95477924);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 46986414));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 38033120));
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.GRAVE, 38033120));
  });

  await run('patent-license-real-ddd-link-opponent-type-lock-grave-recovery', [33814281], 'A real Gilgamesh Link Summon establishes the D/D/D type. The first opposing Link Spider triggers 1000 damage and a Link-only Special Summon lock despite another Normal material; Gilasaurus remains legal. Destroying Patent searches the real Link material back from GY and releases the lock.', s => {
    s.add(33814281, 0, s.C.OcgLocation.HAND).add(19808608, 0, s.C.OcgLocation.MZONE)
      .add(39153655, 0, s.C.OcgLocation.MZONE, 1).add(9024198, 0, s.C.OcgLocation.EXTRA)
      .add(23635815, 1, s.C.OcgLocation.MZONE).add(23635815, 1, s.C.OcgLocation.MZONE, 1)
      .add(98978921, 1, s.C.OcgLocation.EXTRA).add(98978921, 1, s.C.OcgLocation.EXTRA)
      .add(45894482, 1, s.C.OcgLocation.HAND).add(5318639, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 33814281); perform(s, 'special', 9024198); endTurn(s);
    const locked = perform(s, 'special', 98978921, { chainCodes: [33814281] });
    assert.equal(s.duel.queryField().players[1].lp, 7000);
    assert.ok(!locked.special_summons.some(c => c.code === 98978921));
    assert.ok(locked.special_summons.some(c => c.code === 45894482));
    perform(s, 'special', 45894482, { yes: false });
    const unlocked = perform(s, 'activate', 5318639, { chainCodes: [33814281], select: p => [p.selects.some(c => c.code === 33814281) ? 33814281 : 19808608] });
    requireChain(s, 33814281); assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 19808608));
    assert.ok(unlocked.special_summons.some(c => c.code === 98978921));
    perform(s, 'special', 98978921);
    assert.equal(s.duel.queryField().players[1].lp, 7000);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('light-barrier-arcana-real-choice-tails-standby-disables-choice', [73206827], 'While Barrier is active, a genuine Emperor Normal Summon offers an explicit heads/tails effect choice and gains 500 ATK with no toss. The owner’s later Standby produces a real tails toss; a second Emperor must toss normally instead of choosing.', s => {
    s.add(73206827, 0, s.C.OcgLocation.HAND).add(61175706, 0, s.C.OcgLocation.HAND)
      .add(61175706, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 73206827); perform(s, 'summon', 61175706, { option: 0 });
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1900);
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.TOSS_COIN).length, 0);
    assert.ok(s.decisions.some(d => d.prompt.type === s.C.OcgMessageType.SELECT_OPTION && d.prompt.options.length === 2));
    endTurn(s); endTurn(s);
    const standby = s.messages.find(m => m.type === s.C.OcgMessageType.TOSS_COIN);
    assert.equal(standby.results[0], false);
    const choices = s.decisions.filter(d => d.prompt.type === s.C.OcgMessageType.SELECT_OPTION).length;
    perform(s, 'summon', 61175706); requireChain(s, 73206827);
    assert.equal(s.decisions.filter(d => d.prompt.type === s.C.OcgMessageType.SELECT_OPTION).length, choices);
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.TOSS_COIN).length, 2);
    s.card(0, s.C.OcgLocation.MZONE, 1);
  });

  await run('weather-forecast-deck-faceup-canvas-true-spell-link-materials', [18720257], 'Forecast places Snowy Canvas face-up from the Deck; the core then genuinely Link Summons Rainbow using three face-up Weather Spell/Trap Cards as material, with no Weather monster on the field.', s => {
    s.add(18720257, 0, s.C.OcgLocation.HAND).add(80577258, 0, s.C.OcgLocation.DECK)
      .add(27561302, 0, s.C.OcgLocation.SZONE).add(89355716, 0, s.C.OcgLocation.SZONE, 1)
      .add(54178659, 0, s.C.OcgLocation.EXTRA).baseDecks().start();
    perform(s, 'activate', 18720257, { codes: [80577258] });
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 2).code, 80577258);
    assert.ok(s.card(0, s.C.OcgLocation.SZONE, 2).position & s.C.OcgPosition.FACEUP);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).length, 0);
    perform(s, 'special', 54178659); requireChain(s, 18720257);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 5).code, 54178659);
    for (const code of [80577258, 27561302, 89355716]) {
      const material = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === code);
      assert.ok(material && (material.reason & 0x8) && (material.reason & 0x10000000));
    }
  });

  await run('maliss-underground-real-link-third-trap-name-boost-attack-targets', [68337209], 'A genuine Hearts Crypter Link Summon has 2500 ATK. Underground banishes a third differently named Maliss Trap from Deck by effect, granting 3000 ATK; a duplicate face-down Trap does not count. The opponent’s attack choices exclude unrelated Dark Magician.', s => {
    s.add(68337209, 0, s.C.OcgLocation.HAND).add(68337209, 0, s.C.OcgLocation.HAND)
      .add(69272449, 0, s.C.OcgLocation.MZONE).add(32061192, 0, s.C.OcgLocation.MZONE, 1)
      .add(96676583, 0, s.C.OcgLocation.MZONE, 2).add(46986414, 0, s.C.OcgLocation.MZONE, 3)
      .add(21848500, 0, s.C.OcgLocation.EXTRA).add(20726052, 0, s.C.OcgLocation.REMOVED)
      .add(57111661, 0, s.C.OcgLocation.REMOVED).add(94722358, 0, s.C.OcgLocation.REMOVED, 0, s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(94722358, 0, s.C.OcgLocation.DECK).add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'special', 21848500);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 5).attack, 2500);
    const after = perform(s, 'activate', 68337209, { codes: [94722358] }); requireChain(s, 68337209);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 5).attack, 5500);
    assert.ok(!after.activates.some(c => c.code === 68337209));
    const removed = s.location(0, s.C.OcgLocation.REMOVED).find(c => c.code === 94722358 && (c.reason & 0x40));
    assert.ok(removed && !(removed.reason & 0x80));
    endTurn(s); enterBattle(s); battleAttack(s, 89631139, 21848500, { select: p => {
      assert.ok(!p.selects.some(c => c.code === 46986414)); return [21848500];
    }, effectYes: () => false }); leaveBattle(s);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 46986414));
    assert.ok(hasCode(s, 1, s.C.OcgLocation.GRAVE, 89631139));
  });

  await run('sangen-summoning-search-effect-discard-own-main1-immunity-boundary', [30336082], 'Sangen searches Tenpai and discards by effect. A real opposing Set Book of Moon chains during the owner’s Main Phase 1 and cannot flip the FIRE Dragon; on the opponent’s own Main Phase 1, another Book of Moon flips it normally.', s => {
    s.add(30336082, 0, s.C.OcgLocation.HAND).add(91810826, 0, s.C.OcgLocation.MZONE)
      .add(65326118, 0, s.C.OcgLocation.DECK).add(65326118, 0, s.C.OcgLocation.DECK)
      .add(5318639, 0, s.C.OcgLocation.HAND).add(14087893, 1, s.C.OcgLocation.SZONE, 0, s.C.OcgPosition.FACEDOWN_DEFENSE)
      .add(14087893, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 30336082);
    perform(s, 'activate', 30336082, { chainCodes: [14087893], select: p => [p.selects.some(c => c.code === 91810826) ? 91810826 : p.selects.some(c => c.code === 5318639) ? 5318639 : 65326118] });
    requireChain(s, 30336082);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).position, s.C.OcgPosition.FACEUP_ATTACK);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 65326118));
    const discard = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 5318639);
    assert.ok(discard && (discard.reason & 0x40) && (discard.reason & 0x4000) && !(discard.reason & 0x80));
    endTurn(s); perform(s, 'activate', 14087893, { codes: [91810826] });
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).position, s.C.OcgPosition.FACEDOWN_DEFENSE);
  });

  await run('sangen-summoning-battle-destruction-doubles-true-dragon-synchro', [30336082], 'Chundra and Fadra genuinely Synchro Summon Bident Dragion; during Battle Phase an actual MST destroys Sangen and its trigger doubles that Dragon Synchro’s 2600 ATK to 5200.', s => {
    s.add(30336082, 0, s.C.OcgLocation.HAND).add(91810826, 0, s.C.OcgLocation.MZONE)
      .add(65326118, 0, s.C.OcgLocation.MZONE, 1).add(82570174, 0, s.C.OcgLocation.EXTRA)
      .add(5318639, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 30336082); perform(s, 'special', 82570174);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2600);
    endTurn(s); endTurn(s); enterBattle(s);
    const battle = reachBattle(s); const index = battle.chains.findIndex(c => c.code === 5318639);
    assert.ok(index >= 0, 'MST is a real Battle Phase Quick-Play activation');
    s.respond({ type: s.C.OcgResponseType.SELECT_BATTLECMD, action: s.C.SelectBattleCMDAction.SELECT_CHAIN, index });
    reachBattle(s, { chainCodes: [30336082], select: p => [p.selects.some(c => c.code === 30336082) ? 30336082 : 82570174] });
    requireChain(s, 30336082); assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 5200);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 30336082)); leaveBattle(s);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 5200);
  });

  await run('stand-up-centurion-real-continuous-trap-place-protection-quick-synchro', [41371602], 'Stand Up sends a hand card as cost and genuinely places Primera from Deck as a Continuous Trap. That original Monster Card protects the Field from opposing MST; Primera’s real quick Special Summon on the next MST triggers a genuine Legatia Synchro with Emeth VI.', s => {
    s.add(41371602, 0, s.C.OcgLocation.HAND).add(46986414, 0, s.C.OcgLocation.HAND)
      .add(15005145, 0, s.C.OcgLocation.DECK).add(78888899, 0, s.C.OcgLocation.MZONE)
      .add(15982593, 0, s.C.OcgLocation.EXTRA).add(5318639, 1, s.C.OcgLocation.HAND)
      .add(5318639, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 41371602); perform(s, 'activate', 41371602, { select: p => [p.selects.some(c => c.code === 15005145) ? 15005145 : 46986414] });
    const trap = s.card(0, s.C.OcgLocation.SZONE);
    assert.equal(trap.code, 15005145); assert.equal(trap.type, s.C.OcgType.TRAP | s.C.OcgType.CONTINUOUS);
    const cost = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 46986414);
    assert.ok(cost && (cost.reason & 0x80) && !(cost.reason & 0x4000));
    endTurn(s); perform(s, 'activate', 5318639, { codes: [41371602], effectYes: () => false });
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).code, 41371602);
    perform(s, 'activate', 5318639, { chainCodes: [15005145, 41371602], select: p => [p.selects.some(c => c.code === 41371602) ? 41371602 : 15982593], effectYes: p => [15005145, 41371602].includes(p.code) });
    requireChain(s, 41371602);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).code, 15982593);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).code, 41371602);
    for (const code of [15005145, 78888899]) {
      const material = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === code);
      assert.ok(material && (material.reason & 0x8) && (material.reason & 0x80000));
    }
  });

  await run('laputite-owned-rock-bonus-native-three-card-top-sort-and-draw', [46552140], 'Laputite boosts only owned Rocks, selects three actual Adamancipator Deck cards and genuinely sorts them onto the top. Three real Upstart draws consume exactly those cards, leaving Dark Magician in the Deck.', s => {
    const selected = [85914562, 10286023, 74891384];
    s.add(46552140, 0, s.C.OcgLocation.HAND).add(11549357, 0, s.C.OcgLocation.MZONE)
      .add(11549357, 1, s.C.OcgLocation.MZONE);
    for (const code of selected) s.add(code, 0, s.C.OcgLocation.DECK);
    for (let index = 0; index < 3; index++) s.add(70368879, 0, s.C.OcgLocation.HAND);
    s.baseDecks().start(); perform(s, 'activate', 46552140);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2000);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).defense, 2300);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 1500);
    const after = perform(s, 'activate', 46552140, {
      respond: (p, C) => p.type === C.OcgMessageType.SELECT_UNSELECT_CARD ? { type: C.OcgResponseType.SELECT_UNSELECT_CARD, index: p.select_cards.length ? 0 : null } : null,
      sort: () => [2, 0, 1]
    });
    assert.ok(!after.activates.some(c => c.code === 46552140));
    assert.ok(s.decisions.some(d => d.prompt.type === s.C.OcgMessageType.SORT_CARD && d.prompt.cards.length === 3));
    for (let index = 0; index < 3; index++) perform(s, 'activate', 70368879);
    requireChain(s, 46552140);
    assert.deepEqual(s.location(0, s.C.OcgLocation.HAND).map(c => c.code).sort((a, b) => a - b), selected.slice().sort((a, b) => a - b));
    assert.deepEqual(s.location(0, s.C.OcgLocation.DECK).map(c => c.code), [46986414]);
  });

  await run('cynet-universe-link-bonus-opposing-grave-return-extra-zone-send', [61583217], 'Cynet returns an opposing GY monster to its owner’s Deck once. Two genuine Link Spider summons occupy the two Extra Monster Zones; only the owned Link gets 300 ATK. MST destruction sends both Extra Zone monsters to GY and preserves an own Main Zone monster.', s => {
    s.add(61583217, 0, s.C.OcgLocation.HAND).add(23635815, 0, s.C.OcgLocation.MZONE)
      .add(21844576, 0, s.C.OcgLocation.MZONE, 1).add(98978921, 0, s.C.OcgLocation.EXTRA)
      .add(23635815, 1, s.C.OcgLocation.MZONE).add(98978921, 1, s.C.OcgLocation.EXTRA)
      .add(46986414, 0, s.C.OcgLocation.GRAVE).add(89631139, 1, s.C.OcgLocation.GRAVE)
      .add(5318639, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 61583217);
    const after = perform(s, 'activate', 61583217, { codes: [89631139] });
    assert.ok(hasCode(s, 1, s.C.OcgLocation.DECK, 89631139));
    assert.ok(!after.activates.some(c => c.code === 61583217));
    perform(s, 'special', 98978921); assert.equal(s.card(0, s.C.OcgLocation.MZONE, 5).attack, 1300);
    endTurn(s); perform(s, 'special', 98978921);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE, 5).attack, 1000);
    perform(s, 'activate', 5318639, { codes: [61583217] }); requireChain(s, 61583217);
    for (const player of [0, 1]) assert.ok(hasCode(s, player, s.C.OcgLocation.GRAVE, 98978921));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 21844576));
  });

  await run('kozmotown-level-lp-loss-two-card-redraw-destroy-search', [67237709], 'Kozmotown recovers face-up banished Farmgirl and loses 300 LP by direct LP change, not an LP cost. Two Kozmo hand cards are shuffled into the Deck and genuinely redrawn as two cards; destroying the Field then searches Tincan.', s => {
    s.add(67237709, 0, s.C.OcgLocation.HAND).add(31061682, 0, s.C.OcgLocation.REMOVED)
      .add(31061682, 0, s.C.OcgLocation.HAND).add(5318639, 0, s.C.OcgLocation.HAND);
    for (let index = 0; index < 3; index++) s.add(64280356, 0, s.C.OcgLocation.DECK);
    s.baseDecks().start(); perform(s, 'activate', 67237709);
    perform(s, 'activate', 67237709, { codes: [31061682] });
    assert.equal(s.duel.queryField().players[0].lp, 7700);
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.PAY_LPCOST).length, 0);
    perform(s, 'activate', 67237709, { codes: [31061682] });
    const draws = s.messages.filter(m => m.type === s.C.OcgMessageType.DRAW);
    assert.equal(draws.length, 1); assert.equal(draws[0].drawn.length, 2);
    perform(s, 'activate', 5318639, { chainCodes: [67237709], select: p => [p.selects.some(c => c.code === 67237709) ? 67237709 : 64280356] });
    requireChain(s, 67237709); assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 64280356));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 67237709));
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('majesty-pegasus-bilateral-bonus-real-pendulum-tribute-deck-special', [76473843], 'Pegasus boosts both players’ Majespecters. Its actual cost Tributes own WIND Spellcaster Bunbuku to the face-up Extra Deck and summons Nekomata from Deck; another valid cost and Deck target remain, but its shared ignition limit is consumed.', s => {
    s.add(76473843, 0, s.C.OcgLocation.HAND).add(31991800, 0, s.C.OcgLocation.MZONE)
      .add(5506791, 1, s.C.OcgLocation.MZONE).add(5506791, 0, s.C.OcgLocation.DECK)
      .add(5506791, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 76473843);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1500);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 400);
    const after = perform(s, 'activate', 76473843, { codes: [5506791] }); requireChain(s, 76473843);
    const tribute = s.card(0, s.C.OcgLocation.EXTRA);
    assert.equal(tribute.code, 31991800); assert.ok(tribute.reason & 0x80); assert.ok(tribute.reason & 0x2);
    assert.ok(tribute.position & s.C.OcgPosition.FACEUP);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).code, 5506791);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).defense, 2100);
    assert.ok(!after.activates.some(c => c.code === 76473843));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 5506791));
  });

  await run('summon-over-six-real-special-events-main1-gate-both-side-board-send', [48015771], 'Six genuine Gilasaurus Special Summon events add six Summon Counters. At six counters the Field survives MST, but its ignition is not enabled until the next Main Phase 1 starts; the owner then sends the Field and all three opposing Special Summons to GY while preserving their own three.', s => {
    s.add(48015771, 0, s.C.OcgLocation.HAND).add(5318639, 1, s.C.OcgLocation.HAND);
    for (const player of [0, 1]) for (let index = 0; index < 3; index++) s.add(45894482, player, s.C.OcgLocation.HAND);
    s.baseDecks().start(); perform(s, 'activate', 48015771);
    for (let index = 0; index < 3; index++) perform(s, 'special', 45894482);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).counters['328'], 3);
    endTurn(s);
    for (let index = 0; index < 3; index++) perform(s, 'special', 45894482);
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).counters['328'], 6);
    const protectedField = perform(s, 'activate', 5318639, { codes: [48015771] });
    assert.equal(s.card(0, s.C.OcgLocation.SZONE, 5).code, 48015771);
    assert.ok(!protectedField.activates.some(c => c.code === 48015771));
    endTurn(s); perform(s, 'activate', 48015771); requireChain(s, 48015771);
    assert.equal(s.location(0, s.C.OcgLocation.MZONE).filter(c => c.code === 45894482).length, 3);
    assert.equal(s.location(1, s.C.OcgLocation.MZONE).length, 0);
    assert.equal(s.location(1, s.C.OcgLocation.GRAVE).filter(c => c.code === 45894482).length, 3);
    const field = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 48015771);
    assert.ok(field && (field.reason & 0x40) && !(field.reason & 0x80));
  });

  await run('skyscraper-attacker-only-real-damage-calculation-bonus', [63035430], 'During a genuine Avian attack on stronger Blue-Eyes, Skyscraper grants 1000 ATK only at damage calculation; Avian’s query outside that window remains 1000, and the actual battle inflicts 1000 damage to its controller.', s => {
    s.add(63035430, 0, s.C.OcgLocation.HAND).add(21844576, 0, s.C.OcgLocation.MZONE)
      .add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 63035430); assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1000);
    endTurn(s); endTurn(s); enterBattle(s); battleAttack(s, 21844576, 89631139); leaveBattle(s);
    const battle = s.messages.find(m => m.type === s.C.OcgMessageType.BATTLE);
    assert.equal(battle.card.attack, 2000); assert.equal(battle.target.attack, 3000);
    assert.equal(s.duel.queryField().players[0].lp, 7000);
    assert.equal(s.card(0, s.C.OcgLocation.GRAVE).attack, 1000); requireChain(s, 63035430);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('hero-city-real-battle-destruction-reason-revival-effect-exclusion', [47596607], 'Blue-Eyes genuinely destroys Avian in battle. On the next owner turn Hero City’s target pool includes that battle-destroyed HERO but excludes a HERO initially in GY without BATTLE reason, then actually revives Avian.', s => {
    s.add(47596607, 0, s.C.OcgLocation.HAND).add(21844576, 0, s.C.OcgLocation.MZONE)
      .add(58932615, 0, s.C.OcgLocation.GRAVE).add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 47596607); endTurn(s); enterBattle(s);
    battleAttack(s, 89631139, 21844576); leaveBattle(s); endTurn(s);
    const battleVictim = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 21844576);
    assert.ok(battleVictim.reason & 0x20);
    perform(s, 'activate', 47596607, { select: p => {
      assert.ok(p.selects.some(c => c.code === 21844576)); assert.ok(!p.selects.some(c => c.code === 58932615)); return [21844576];
    } }); requireChain(s, 47596607);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 21844576));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 58932615));
  });

  await run('wattcastle-real-battle-permanent-attacker-atk-reduction', [58924378], 'Blue-Eyes attacks and destroys Wattgiraffe in a genuine battle. Wattcastle reduces that attacker’s ATK by exactly 1000 after battle; the reduction persists when MST later destroys the Field.', s => {
    s.add(58924378, 0, s.C.OcgLocation.HAND).add(402568, 0, s.C.OcgLocation.MZONE)
      .add(89631139, 1, s.C.OcgLocation.MZONE).add(5318639, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 58924378); endTurn(s); enterBattle(s); battleAttack(s, 89631139, 402568); leaveBattle(s);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 2000);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 402568));
    perform(s, 'activate', 5318639, { codes: [58924378] }); requireChain(s, 58924378);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 2000);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 58924378));
  });

  for (const spec of [
    { id: 'luminous-spark-bilateral-light-stats-dark-exclusion-removal', field: 81777047, own: 89631139, opponent: 12493482, neutral: 46986414, ownAfter: [3500, 2100], opponentAfter: [2300, 650], ownBase: [3000, 2500], opponentBase: [1800, 1050], neutralBase: [2500, 2100] },
    { id: 'rising-air-current-bilateral-wind-stats-light-exclusion-removal', field: 45778932, own: 76812113, opponent: 76812113, neutral: 89631139, ownAfter: [1800, 1000], opponentAfter: [1800, 1000], ownBase: [1300, 1400], opponentBase: [1300, 1400], neutralBase: [3000, 2500] },
    { id: 'mystic-plasma-bilateral-dark-stats-light-exclusion-removal', field: 18161786, own: 46986414, opponent: 70781052, neutral: 89631139, ownAfter: [3000, 1700], opponentAfter: [3000, 800], ownBase: [2500, 2100], opponentBase: [2500, 1200], neutralBase: [3000, 2500] }
  ]) {
    await run(spec.id, [spec.field], 'The actual continuous effect boosts ATK and reduces DEF on eligible monsters of both players, excludes the other Attribute, then disappears after real MST destruction.', s => {
      s.add(spec.field, 0, s.C.OcgLocation.HAND).add(spec.own, 0, s.C.OcgLocation.MZONE)
        .add(spec.opponent, 1, s.C.OcgLocation.MZONE).add(spec.neutral, 0, s.C.OcgLocation.MZONE, 1)
        .add(5318639, 0, s.C.OcgLocation.HAND).baseDecks().start();
      perform(s, 'activate', spec.field);
      const stats = (player, sequence = 0) => { const c = s.card(player, s.C.OcgLocation.MZONE, sequence); return [c.attack, c.defense]; };
      assert.deepEqual(stats(0), spec.ownAfter); assert.deepEqual(stats(1), spec.opponentAfter); assert.deepEqual(stats(0, 1), spec.neutralBase);
      perform(s, 'activate', 5318639, { codes: [spec.field] }); requireChain(s, spec.field);
      assert.deepEqual(stats(0), spec.ownBase); assert.deepEqual(stats(1), spec.opponentBase);
    });
  }

  await run('yami-bilateral-spellcaster-fiend-bonus-fairy-penalty-removal', [59197169], 'Yami gives Spellcaster and Fiend monsters 200 ATK/DEF, reduces a Fairy by 200 and leaves a Dragon unchanged; actual MST destruction restores all affected native statistics.', s => {
    s.add(59197169, 0, s.C.OcgLocation.HAND).add(46986414, 0, s.C.OcgLocation.MZONE)
      .add(12493482, 0, s.C.OcgLocation.MZONE, 1).add(70781052, 1, s.C.OcgLocation.MZONE)
      .add(89631139, 1, s.C.OcgLocation.MZONE, 1).add(5318639, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 59197169);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2700);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 2700);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).attack, 1600);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).defense, 850);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE, 1).attack, 3000);
    perform(s, 'activate', 5318639, { codes: [59197169] }); requireChain(s, 59197169);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2500);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 2500);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).attack, 1800);
  });

  await run('chorus-sanctuary-defense-position-bilateral-bonus-position-change', [81380218], 'Chorus grants 500 DEF only to defense-position monsters of both players. A real Blue-Eyes position-change command removes its bonus; destroying the Field removes the opposing defense bonus.', s => {
    s.add(81380218, 0, s.C.OcgLocation.HAND).add(89631139, 0, s.C.OcgLocation.MZONE, 0, s.C.OcgPosition.FACEUP_DEFENSE)
      .add(46986414, 0, s.C.OcgLocation.MZONE, 1).add(76812113, 1, s.C.OcgLocation.MZONE, 0, s.C.OcgPosition.FACEUP_DEFENSE)
      .add(5318639, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 81380218);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).defense, 3000);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).defense, 1900);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE, 1).defense, 2100);
    const idle = reachIdle(s); const index = idle.pos_changes.findIndex(c => c.code === 89631139);
    assert.ok(index >= 0); s.respond({ type: s.C.OcgResponseType.SELECT_IDLECMD, action: s.C.SelectIdleCMDAction.SELECT_POS_CHANGE, index }); reachIdle(s);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).position, s.C.OcgPosition.FACEUP_ATTACK);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).defense, 2500);
    perform(s, 'activate', 5318639, { codes: [81380218] }); requireChain(s, 81380218);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).defense, 1400);
  });

  await run('empowerment-discard-deck-special-four-banish-cost-aether-search', [54250060], 'Empowerment boosts owned qualifying races, discards a hand card as cost to summon an Empowered Warrior from Deck, then banishes four real Warrior/Spellcaster GY cards as cost to search Aether. The two ignition limits are independent.', s => {
    s.add(54250060, 0, s.C.OcgLocation.HAND).add(89631139, 0, s.C.OcgLocation.MZONE)
      .add(89631139, 1, s.C.OcgLocation.MZONE).add(46986414, 0, s.C.OcgLocation.HAND)
      .add(75953262, 0, s.C.OcgLocation.GRAVE).add(12493482, 0, s.C.OcgLocation.GRAVE)
      .add(11868731, 0, s.C.OcgLocation.GRAVE).add(24317029, 0, s.C.OcgLocation.GRAVE)
      .add(56681873, 0, s.C.OcgLocation.DECK).add(56681873, 0, s.C.OcgLocation.DECK)
      .add(56804361, 0, s.C.OcgLocation.DECK).baseDecks().start();
    perform(s, 'activate', 54250060);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 3300);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 3000);
    perform(s, 'activate', 54250060, { select: p => [p.selects.some(c => c.code === 46986414) ? 46986414 : 56681873] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 56681873));
    const discarded = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 46986414);
    assert.ok(discarded && (discarded.reason & 0x80) && (discarded.reason & 0x4000));
    const after = perform(s, 'activate', 54250060, { select: p => p.selects.some(c => c.code === 56804361) ? [56804361] : [46986414, 75953262, 11868731, 24317029] });
    requireChain(s, 54250060);
    assert.equal(s.location(0, s.C.OcgLocation.REMOVED).length, 4);
    assert.ok(s.location(0, s.C.OcgLocation.REMOVED).every(c => (c.reason & 0x80)));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 56804361));
    assert.ok(!after.activates.some(c => c.code === 54250060));
  });

  await run('elborz-reveal-tribute-reduction-true-extra-wingedbeast-normal', [92223430], 'Elborz genuinely reveals Level 8 Simorgh to reduce Winged Beast Tributes by one; its separate ignition actually Normal Summons that Simorgh using a single Harpie Tribute, after a normal Avian summon has already consumed the turn’s regular summon.', s => {
    s.add(92223430, 0, s.C.OcgLocation.HAND).add(95192919, 0, s.C.OcgLocation.HAND)
      .add(21844576, 0, s.C.OcgLocation.HAND).add(76812113, 0, s.C.OcgLocation.MZONE)
      .add(76812113, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 92223430);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1600);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 1600);
    perform(s, 'activate', 92223430, { codes: [95192919] });
    perform(s, 'summon', 21844576);
    perform(s, 'activate', 92223430, { select: p => [p.selects.some(c => c.code === 95192919) ? 95192919 : 76812113] }); requireChain(s, 92223430);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 95192919));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 21844576));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 76812113));
  });

  await run('war-rock-mountain-search-opponent-battle-start-special-replacement', [45943516], 'Mountain searches Fortia. With no own non-Warrior, the opponent’s actual Battle Phase start summons it from hand; the Field sends itself to GY by effect instead of Fortia being destroyed in that battle, while battle damage still applies.', s => {
    s.add(45943516, 0, s.C.OcgLocation.HAND).add(45943516, 0, s.C.OcgLocation.HAND)
      .add(83286340, 0, s.C.OcgLocation.DECK).add(83286340, 0, s.C.OcgLocation.DECK)
      .add(89631139, 1, s.C.OcgLocation.MZONE).baseDecks().start();
    const after = perform(s, 'activate', 45943516, { codes: [83286340] });
    assert.ok(!after.activates.some(c => c.code === 45943516));
    endTurn(s); enterBattle(s, { chainCodes: [45943516], codes: [83286340], effectYes: p => p.code === 45943516 });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 83286340));
    battleAttack(s, 89631139, 83286340, { chainCodes: [45943516], effectYes: p => p.code === 45943516 }); leaveBattle(s);
    requireChain(s, 45943516);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 83286340));
    const field = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 45943516);
    assert.ok(field && (field.reason & 0x40) && !(field.reason & 0x80));
    assert.equal(s.duel.queryField().players[0].lp, 6700);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  await run('wraitsoth-search-oath-distinct-faceup-attribute-count-removal', [71832012], 'Wraitsoth searches Unicorn once and counts distinct face-up Attributes on both fields for owned monsters only. Four Attributes grant 400; real Book of Moon hides the only DARK monster and lowers that to 300, then MST removes the bonus.', s => {
    s.add(71832012, 0, s.C.OcgLocation.HAND).add(71832012, 0, s.C.OcgLocation.HAND)
      .add(68304193, 0, s.C.OcgLocation.DECK).add(68304193, 0, s.C.OcgLocation.DECK)
      .add(23635815, 0, s.C.OcgLocation.MZONE).add(89631139, 1, s.C.OcgLocation.MZONE)
      .add(2964201, 1, s.C.OcgLocation.MZONE, 1).add(46986414, 1, s.C.OcgLocation.MZONE, 2)
      .add(14087893, 1, s.C.OcgLocation.HAND).add(5318639, 1, s.C.OcgLocation.HAND).baseDecks().start();
    const after = perform(s, 'activate', 71832012, { codes: [68304193] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.HAND, 68304193));
    assert.ok(!after.activates.some(c => c.code === 71832012));
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2150);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 3000);
    endTurn(s); perform(s, 'activate', 14087893, { codes: [46986414] });
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 2050);
    perform(s, 'activate', 5318639, { codes: [71832012] }); requireChain(s, 71832012);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1750);
  });

  await run('ichirin-qualifying-defense-negates-only-first-opponent-monster-effect', [38057522], 'With face-up Eria’s exact 1500 DEF, Ichirin negates the first genuine opposing Gilasaurus monster effect; the second same-turn Gilasaurus effect resolves and really revives Dark Magician for the Field’s controller.', s => {
    s.add(38057522, 0, s.C.OcgLocation.HAND).add(74364659, 0, s.C.OcgLocation.MZONE)
      .add(46986414, 0, s.C.OcgLocation.GRAVE).add(45894482, 1, s.C.OcgLocation.HAND)
      .add(45894482, 1, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 38057522); endTurn(s); perform(s, 'special', 45894482);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 46986414));
    assert.ok(!hasCode(s, 0, s.C.OcgLocation.MZONE, 46986414));
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.CHAIN_DISABLED).length, 1);
    perform(s, 'special', 45894482, { codes: [46986414] }); requireChain(s, 38057522);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 46986414));
    assert.equal(s.messages.filter(m => m.type === s.C.OcgMessageType.CHAIN_DISABLED).length, 1);
  });

  await run('ojama-country-base-stat-swap-send-cost-targeted-revival-removal', [90011152], 'With an owned Ojama, Country swaps both players’ base ATK/DEF. Its hand-to-GY cost is not a discard; Yellow is genuinely revived, and the once-per-turn ignition is blocked with another cost and target remaining. MST restores base stats.', s => {
    s.add(90011152, 0, s.C.OcgLocation.HAND).add(12482652, 0, s.C.OcgLocation.MZONE)
      .add(12482652, 0, s.C.OcgLocation.HAND).add(79335209, 0, s.C.OcgLocation.HAND)
      .add(42941100, 0, s.C.OcgLocation.GRAVE).add(89631139, 1, s.C.OcgLocation.MZONE)
      .add(5318639, 0, s.C.OcgLocation.HAND).baseDecks().start();
    perform(s, 'activate', 90011152);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1000);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 2500);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).defense, 3000);
    const after = perform(s, 'activate', 90011152, { select: p => [p.selects.some(c => c.code === 42941100) ? 42941100 : 12482652] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 42941100));
    const cost = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 12482652);
    assert.ok(cost && (cost.reason & 0x80) && !(cost.reason & 0x4000));
    assert.ok(!after.activates.some(c => c.code === 90011152));
    perform(s, 'activate', 5318639, { codes: [90011152] }); requireChain(s, 90011152);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 0);
    assert.equal(s.card(1, s.C.OcgLocation.MZONE).attack, 3000);
  });

  await run('pseudo-space-real-wetlands-banish-cost-official-effect-copy-reset', [77584012], 'Pseudo Space banishes real Wetlands from GY as cost and copies that official card’s name/effect until End Phase. Native ALIAS queries show the current Wetlands name while CODE retains the physical Pseudo Space; Slime Toad gains 1200 ATK, then the current name and ATK reset at End Phase.', s => {
    s.add(77584012, 0, s.C.OcgLocation.HAND).add(2084239, 0, s.C.OcgLocation.GRAVE)
      .add(68638985, 0, s.C.OcgLocation.MZONE).baseDecks().start();
    perform(s, 'activate', 77584012); perform(s, 'activate', 77584012, { codes: [2084239] }); requireChain(s, 77584012);
    const copied = s.card(0, s.C.OcgLocation.SZONE, 5, s.C.OcgQueryFlags.ALIAS);
    assert.equal(copied.code, 77584012); assert.equal(copied.alias, 2084239);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 1900);
    const cost = s.location(0, s.C.OcgLocation.REMOVED).find(c => c.code === 2084239); assert.ok(cost && (cost.reason & 0x80));
    endTurn(s);
    const reset = s.card(0, s.C.OcgLocation.SZONE, 5, s.C.OcgQueryFlags.ALIAS);
    assert.equal(reset.code, 77584012); assert.equal(reset.alias, 77584012);
    assert.equal(s.card(0, s.C.OcgLocation.MZONE).attack, 700);
  });

  await run('catapult-zone-real-battle-replacement-rock-send-effect-once', [14289852], 'Catapult replaces Jerry’s first real battle destruction by sending Gamma from Deck by effect, while 1250 battle damage remains. A second attack destroys Jerry normally, despite another valid Rock remaining in Deck, proving the turn limit.', s => {
    s.add(14289852, 0, s.C.OcgLocation.HAND).add(23635815, 0, s.C.OcgLocation.MZONE)
      .add(11549357, 0, s.C.OcgLocation.DECK).add(11549357, 0, s.C.OcgLocation.DECK)
      .add(89631139, 1, s.C.OcgLocation.MZONE).add(46986414, 1, s.C.OcgLocation.MZONE, 1).baseDecks().start();
    perform(s, 'activate', 14289852); endTurn(s); enterBattle(s);
    battleAttack(s, 89631139, 23635815, { codes: [11549357] });
    assert.ok(hasCode(s, 0, s.C.OcgLocation.MZONE, 23635815));
    const sent = s.location(0, s.C.OcgLocation.GRAVE).find(c => c.code === 11549357);
    assert.ok(sent && (sent.reason & 0x40) && !(sent.reason & 0x80));
    battleAttack(s, 46986414, 23635815); leaveBattle(s); requireChain(s, 14289852);
    assert.ok(hasCode(s, 0, s.C.OcgLocation.GRAVE, 23635815));
    assert.ok(hasCode(s, 0, s.C.OcgLocation.DECK, 11549357));
    assert.equal(s.duel.queryField().players[0].lp, 6000);
    s.queries.push({ query: { field: true }, result: clone(s.duel.queryField()) });
  });

  for (const audit of [auditNativeFieldBatchA, auditNativeFieldBatchB, auditNativeFieldBatchC,
    auditNativeFieldBatchD, auditNativeFieldBatchE, auditNativeFieldBatchF]) {
    scenarios.push(...await audit(inputs, sharedCore));
  }
  for (const audit of [runNativeFieldBranchWaveA, runNativeFieldBranchWaveF, runNativeFieldContinuationA, runNativeFieldContinuationB]) {
    scenarios.push(...await audit(inputs, sharedCore));
  }
  assert.equal(new Set(scenarios.map(row => row.id)).size, scenarios.length, 'Scenario IDs must be globally unique');
  const assigned = [...NATIVE_FIELD_BATCH_A_IDS, ...NATIVE_FIELD_BATCH_B_IDS, ...NATIVE_FIELD_BATCH_C_IDS,
    ...NATIVE_FIELD_BATCH_D_IDS, ...NATIVE_FIELD_BATCH_E_IDS, ...NATIVE_FIELD_BATCH_F_IDS];
  assert.equal(assigned.length, 224);
  assert.equal(new Set(assigned).size, 224, 'Remaining lot ownership must be disjoint');
  return scenarios;
}

export async function auditNativeFieldRuntime(inputs = null) {
  inputs ??= await loadNativeAuditInputs();
  const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  if (inputs.coreBuild) assert.deepEqual(core.getVersion(), inputs.coreBuild.coreApi, 'Native API must match build provenance');
  const sourceFiles = ['scripts/audit-native-field-runtime.mjs', 'scripts/native-field-audit-inputs.mjs',
    'scripts/native-field-audit-harness.mjs', ...'abcdef'.split('').map(lot => `scripts/audit-native-field-batch-${lot}.mjs`),
    'scripts/audit-native-field-branch-wave-a.mjs', 'scripts/audit-native-field-branch-wave-f.mjs',
    'scripts/native-field-continuation-a.mjs', 'scripts/native-field-continuation-b.mjs',
    'tests/native-field-continuation-a.test.mjs', 'tests/native-field-continuation-b.test.mjs',
    'tests/native-field-catalogue.test.js', 'test/native-field-atlas-coverage.test.js',
    'scripts/generate-native-field-coverage.mjs',
    'src/core/native/NativeDuelDecisions.js', 'src/core/native/NativePublicRevealPolicy.js', 'src/ui/NativeDuelPresentationModel.js',
    'src/core/native/NativeDuelRuntime.js', 'src/core/native/NativeCardScriptCorrections.js',
    'src/core/native/NativeDiceDungeonScriptCorrection.js', 'src/core/native/NativeDuelTowerScriptCorrection.js',
    'src/core/native/NativeSourceIntegrity.js', 'src/core/native/NativeLuaCompatibility.js',
    'src/core/native/NativeCardData.js', 'src/core/native/NativeScriptArchive.js', 'src/core/native/NativeCoreAssets.js',
    'src/core/native/vendor/ocgcore/index.js', 'src/core/native/vendor/ocgcore/ocgcore.sync-MMMSWPBB.js',
    'src/core/native/vendor/ocgcore/chunk-6GYI7QPM.js', 'src/core/native/vendor/ocgcore/chunk-L5TW24SS.js'];
  const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async path =>
    [path, sha256(await readFile(new URL(`../${path}`, import.meta.url)))])));
  const matrix = await auditNativeFieldInitialization(inputs, core);
  const scenarios = await auditNativeFieldEffects(inputs, core);
  const effectTested = new Set(scenarios.filter(row => row.status === 'passed').flatMap(row => row.fields));
  for (const entry of matrix) entry.effectTested = effectTested.has(entry.canonicalCode);
  const previousBytes = await readFile(NATIVE_FIELD_PREVIOUS_AUDIT_PATH);
  const previous = JSON.parse(previousBytes.toString('utf8'));
  assert.equal(previous.scenarios.length, 377, 'Historical native Field audit count');
  assert.equal(scenarios.length, 406, '377 historical plus 15/14 continuation native scenarios');
  assert.deepEqual(clone(scenarios.slice(0, previous.scenarios.length)), previous.scenarios,
    'Every field of all 377 historical scenario objects must remain exact');
  assert.deepEqual(matrix, previous.matrix, 'All 339 historical catalogue matrix rows must remain exact');
  return {
    generatedOn: '2026-10-08', executedAtUtc: new Date().toISOString(), revision: 'multi-front-continuation',
    evidencePath: 'docs/audits/artifacts/native-field-runtime-continuation-2026-10-08.json',
    previousEvidencePath: 'docs/audits/artifacts/native-field-runtime-wave-2026-10-08.json',
    preservation: { previousScenarioCount: previous.scenarios.length, additionalScenarioCount: 29,
      previousReportSha256: sha256(previousBytes), entireHistoricalScenariosExact: true, historicalMatrixExact: true },
    corePackage: 'ocgcore-wasm', corePackageVersion: '0.1.2', nativeApi: core.getVersion(),
    coreWasmSha256: inputs.initializer?.wasmBinary ? sha256(new Uint8Array(inputs.initializer.wasmBinary)) : null,
    coreRevision: inputs.coreBuild?.coreRevision ?? null, coreBuild: clone(inputs.coreBuild ?? null),
    flags: auditFlags(inputs.coreModule).toString(), flagNames: ['MODE_MR5', 'TCG_SEGOC_NONPUBLIC', 'TCG_SEGOC_FIRSTTRIGGER'],
    sourceHashes, scriptCorrections: clone(NATIVE_CARD_SCRIPT_CORRECTIONS),
    fixture: { seed: ['1', '2', '3', '4'], defaults: { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 },
      perScenarioTeamsAndCorrectionsRecorded: true, upstreamArchiveBytesModified: false, modifiedScripts: true,
      modifiedCardData: false, testMode: false, pseudoShuffle: false },
    resources: clone(inputs.resources.manifest),
    summary: { catalogue: matrix.length, bundled: matrix.filter(row => row.bundled).length,
      initialized: matrix.filter(row => row.initialized).length, effectTested: matrix.filter(row => row.effectTested).length,
      integrationTested: 0, scenarios: scenarios.length, passedScenarios: scenarios.filter(row => row.status === 'passed').length },
    limits: ['Initialization proves shipped Lua initial_effect and successful hook registration, not execution of every registered event or every effect branch.',
      'Effect-tested identifies only cards exercised by the listed native scenarios, not every effect branch.',
      'Only two hash-guarded local read-time Lua corrections are applied; upstream archive bytes remain intact.',
      'Browser integration is verified separately; this headless audit marks no entry integration-tested.'],
    matrix, scenarios
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = await auditNativeFieldRuntime();
  await mkdir(new URL('.', NATIVE_FIELD_AUDIT_PATH), { recursive: true });
  await writeFile(NATIVE_FIELD_AUDIT_PATH, `${json(result)}\n`);
  console.log(json(result.summary));
  const failures = result.scenarios.filter(row => row.status !== 'passed');
  if (failures.length) console.error(json(failures.map(({ id, error }) => ({ id, error }))));
  assert.equal(result.summary.bundled, result.summary.catalogue, 'Unbundled Field Spell resources');
  assert.equal(result.summary.initialized, result.summary.catalogue, 'Field Spell Lua initialization failed');
  assert.equal(result.summary.passedScenarios, result.summary.scenarios, 'Native field effect scenario failed');
}
