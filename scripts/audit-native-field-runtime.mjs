import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';
import { FIELD_SPELL_CARD_DATA_SNAPSHOT } from '../src/ui/FieldSpellCardDataSnapshot.js';

export const NATIVE_FIELD_AUDIT_PATH = new URL('../docs/audits/artifacts/native-field-runtime-2026-10-07.json', import.meta.url);
const sha256 = text => createHash('sha256').update(text).digest('hex');
const json = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item, 2);
const clone = value => JSON.parse(json(value));

/** All decisions below go through the core's typed protocol. No Lua debug API,
 * custom script, mutated card data, test-mode flag or JS rules engine is used. */
export async function loadNativeAuditInputs() {
  const { loadNativeCardResources } = await import('../src/core/native/NativeCardData.js');
  let scriptFiles;
  const resources = await loadNativeCardResources({
    fetch: async url => {
      const path = new URL(`../public${new URL(String(url), 'https://audit.invalid').pathname}`, import.meta.url);
      const text = await readFile(path, 'utf8');
      return { ok: true, status: 200, json: async () => {
        const value = JSON.parse(text);
        if (String(url).endsWith('/scripts.json')) scriptFiles = value.files;
        return value;
      } };
    }
  });
  const coreModule = process.env.NATIVE_CORE_MODULE
    ? await import(pathToFileURL(resolve(process.env.NATIVE_CORE_MODULE)).href)
    : await import('../src/core/native/vendor/ocgcore/index.js');
  const wasm = await readFile(new URL('../public/native/ocgcore.sync.wasm', import.meta.url));
  const coreBuild = JSON.parse(await readFile(new URL('../public/native/core-build.json', import.meta.url), 'utf8'));
  assert.equal(sha256(wasm), coreBuild.wasmSha256, 'Native WASM must match its build provenance');
  const initializer = { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) };
  resources.auditScriptFiles = scriptFiles;
  return { resources, coreModule, initializer, coreBuild };
}

function auditFlags(C) {
  return C.OcgDuelMode.MODE_MR5 | C.OcgDuelMode.TCG_SEGOC_NONPUBLIC | C.OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER;
}

async function makeSession(inputs, sharedCore, label) {
  const duel = await createNativeDuelRuntime({
    ...inputs.resources, coreModule: inputs.coreModule, createCore: () => sharedCore,
    flags: auditFlags(inputs.coreModule), seed: [1n, 2n, 3n, 4n],
    team1: { startingDrawCount: 0, drawCountPerTurn: 0 },
    team2: { startingDrawCount: 0, drawCountPerTurn: 0 }
  });
  const C = duel.constants;
  return {
    duel, C, label, messages: [], decisions: [], queries: [],
    add(code, controller, location, sequence = 0, position = null) {
      position ??= [C.OcgLocation.HAND, C.OcgLocation.DECK, C.OcgLocation.EXTRA].includes(location)
        ? C.OcgPosition.FACEDOWN_DEFENSE : C.OcgPosition.FACEUP_ATTACK;
      duel.addCard({ code, controller, location, sequence, position }); return this;
    },
    baseDecks() {
      this.add(46986414, 0, C.OcgLocation.DECK).add(46986414, 1, C.OcgLocation.DECK); return this;
    },
    start() { duel.start(); return this; },
    advance() {
      const result = duel.advance();
      this.messages.push(...result.messages);
      assert.ok(!result.messages.some(message => message.type === C.OcgMessageType.RETRY), `${label}: core rejected a response`);
      return result;
    },
    respond(response) {
      this.decisions.push({ prompt: clone(duel.pendingPrompt), response: clone(response) });
      duel.respond(response);
    },
    card(controller, location, sequence = 0) {
      const query = { controller, location, sequence, flags: C.OcgQueryFlags.CODE | C.OcgQueryFlags.POSITION
        | C.OcgQueryFlags.TYPE | C.OcgQueryFlags.LEVEL | C.OcgQueryFlags.RACE | C.OcgQueryFlags.ATTACK
        | C.OcgQueryFlags.DEFENSE | C.OcgQueryFlags.REASON | C.OcgQueryFlags.COUNTERS };
      const value = duel.queryCard(query);
      this.queries.push({ query, result: clone(value) }); return value;
    },
    location(controller, location) {
      const query = { controller, location, flags: C.OcgQueryFlags.CODE | C.OcgQueryFlags.REASON };
      const value = duel.queryLocation(query);
      this.queries.push({ query, result: clone(value) }); return value.filter(Boolean);
    }
  };
}

function choosePlace(prompt, C) {
  const places = [];
  const mask = prompt.field_mask >>> 0;
  for (const side of [0, 1]) {
    for (const [location, shift, count] of [[C.OcgLocation.MZONE, 0, 7], [C.OcgLocation.SZONE, 8, 8]]) {
      for (let sequence = 0; sequence < count; sequence += 1) {
        if ((mask & (1 << (side * 16 + shift + sequence))) === 0) {
          places.push({ player: side ? 1 - prompt.player : prompt.player, location, sequence });
        }
      }
    }
  }
  assert.ok(places.length >= prompt.count, 'Core requested unavailable places');
  return places.slice(0, prompt.count);
}

function defaultResponse(prompt, C, choices = {}) {
  const M = C.OcgMessageType; const R = C.OcgResponseType;
  switch (prompt.type) {
    case M.SELECT_CHAIN: {
      const wanted = prompt.selects.findIndex(card => choices.chainCodes?.includes(card.code));
      return { type: R.SELECT_CHAIN, index: wanted >= 0 ? wanted : prompt.forced ? 0 : null };
    }
    case M.SELECT_YESNO: return { type: R.SELECT_YESNO, yes: choices.yes ?? true };
    case M.SELECT_EFFECTYN: return { type: R.SELECT_EFFECTYN, yes: choices.yes ?? true };
    case M.SELECT_OPTION: return { type: R.SELECT_OPTION, index: choices.option ?? 0 };
    case M.SELECT_POSITION: return { type: R.SELECT_POSITION,
      position: (prompt.positions & C.OcgPosition.FACEUP_ATTACK) ? C.OcgPosition.FACEUP_ATTACK : C.OcgPosition.FACEUP_DEFENSE };
    case M.SELECT_PLACE: return { type: R.SELECT_PLACE, places: choices.place?.(prompt) ?? choosePlace(prompt, C) };
    case M.SELECT_CARD: {
      const preferred = choices.select?.(prompt) ?? choices.codes;
      const indicies = preferred
        ? prompt.selects.map((card, index) => preferred.includes(card.code) ? index : -1).filter(index => index >= 0).slice(0, prompt.max)
        : Array.from({ length: prompt.min }, (_, index) => index);
      assert.ok(indicies.length >= prompt.min, `Selection missing requested card; offered ${prompt.selects.map(card => card.code)}`);
      return { type: R.SELECT_CARD, indicies };
    }
    case M.SELECT_UNSELECT_CARD: return { type: R.SELECT_UNSELECT_CARD, index: prompt.can_finish ? null : 0 };
    case M.SELECT_TRIBUTE: return { type: R.SELECT_TRIBUTE, indicies: Array.from({ length: prompt.min }, (_, index) => index) };
    case M.SORT_CARD: return { type: R.SORT_CARD, order: Array.from({ length: prompt.cards.length }, (_, index) => index) };
    default: throw new Error(`Unsupported actual core prompt ${prompt.type}: ${json(prompt)}`);
  }
}

function reachIdle(session, choices = {}, { allowEnd = false } = {}) {
  for (let index = 0; index < 160; index += 1) {
    const result = session.advance();
    if (result.prompt?.type === session.C.OcgMessageType.SELECT_IDLECMD) return result.prompt;
    if (result.status === session.C.OcgProcessResult.END) {
      assert.ok(allowEnd, `${session.label}: duel ended unexpectedly`); return null;
    }
    if (result.prompt) session.respond(defaultResponse(result.prompt, session.C, choices));
  }
  throw new Error(`${session.label}: decision budget exceeded`);
}

function perform(session, kind, code, choices = {}, options = {}) {
  const { C } = session;
  const prompt = reachIdle(session);
  const [list, action] = kind === 'summon' ? [prompt.summons, C.SelectIdleCMDAction.SELECT_SUMMON]
    : kind === 'special' ? [prompt.special_summons, C.SelectIdleCMDAction.SELECT_SPECIAL_SUMMON]
      : [prompt.activates, C.SelectIdleCMDAction.SELECT_ACTIVATE];
  const index = list.findIndex(card => card.code === code && (!options.location || card.location === options.location));
  assert.ok(index >= 0, `${session.label}: ${kind} ${code} not offered: ${json(prompt)}`);
  session.respond({ type: C.OcgResponseType.SELECT_IDLECMD, action, index });
  return reachIdle(session, choices, options);
}

function endTurn(session) {
  const prompt = reachIdle(session);
  assert.equal(prompt.to_ep, true);
  session.respond({ type: session.C.OcgResponseType.SELECT_IDLECMD, action: session.C.SelectIdleCMDAction.TO_EP, index: null });
  return reachIdle(session);
}

function hasCode(session, player, location, code) {
  return session.location(player, location).some(card => card.code === code);
}

function requireChain(session, code) {
  const M = session.C.OcgMessageType;
  assert.ok(session.messages.some(message => message.type === M.CHAINING && message.code === code), `${session.label}: no real chain for ${code}`);
  assert.ok(session.messages.some(message => message.type === M.CHAIN_SOLVED));
  assert.ok(session.messages.some(message => message.type === M.CHAIN_END));
}

function scenarioEvidence(session, fields, description) {
  assert.deepEqual(session.duel.errors, [], `${session.label}: Lua/core diagnostics`);
  return {
    id: session.label, fields, description, status: 'passed', nativeApi: session.duel.core.getVersion(),
    flags: auditFlags(session.C).toString(), messages: clone(session.messages), decisions: session.decisions,
    queries: session.queries, errors: clone(session.duel.errors)
  };
}

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
      scriptSha256: script ? sha256(script) : null, errors: [] };
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
  const scenarios = [];
  async function run(label, fields, description, exercise) {
    const session = await makeSession(inputs, sharedCore, label);
    try { await exercise(session); scenarios.push(scenarioEvidence(session, fields, description)); }
    catch (error) { scenarios.push({ id: label, fields, description, status: 'failed', error: error.message,
      messages: clone(session.messages), decisions: session.decisions, queries: session.queries, errors: clone(session.duel.errors) }); }
    finally { session.duel.close(); }
  }

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
  return scenarios;
}

export async function auditNativeFieldRuntime(inputs = null) {
  inputs ??= await loadNativeAuditInputs();
  const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  if (inputs.coreBuild) assert.deepEqual(core.getVersion(), inputs.coreBuild.coreApi, 'Native API must match build provenance');
  const matrix = await auditNativeFieldInitialization(inputs, core);
  const scenarios = await auditNativeFieldEffects(inputs, core);
  const effectTested = new Set(scenarios.filter(row => row.status === 'passed').flatMap(row => row.fields));
  for (const entry of matrix) entry.effectTested = effectTested.has(entry.canonicalCode);
  return {
    generatedOn: '2026-10-07', corePackage: 'ocgcore-wasm', corePackageVersion: '0.1.2', nativeApi: core.getVersion(),
    coreWasmSha256: inputs.initializer?.wasmBinary ? sha256(new Uint8Array(inputs.initializer.wasmBinary)) : null,
    coreRevision: inputs.coreBuild?.coreRevision ?? null, coreBuild: clone(inputs.coreBuild ?? null),
    flags: auditFlags(inputs.coreModule).toString(), flagNames: ['MODE_MR5', 'TCG_SEGOC_NONPUBLIC', 'TCG_SEGOC_FIRSTTRIGGER'],
    fixture: { seed: ['1', '2', '3', '4'], startingDrawCount: 0, drawCountPerTurn: 0, modifiedScripts: false,
      modifiedCardData: false, testMode: false, pseudoShuffle: false },
    resources: clone(inputs.resources.manifest),
    summary: { catalogue: matrix.length, bundled: matrix.filter(row => row.bundled).length,
      initialized: matrix.filter(row => row.initialized).length, effectTested: matrix.filter(row => row.effectTested).length,
      integrationTested: 0, scenarios: scenarios.length, passedScenarios: scenarios.filter(row => row.status === 'passed').length },
    limits: ['Initialization proves shipped Lua initial_effect and successful hook registration, not execution of every registered event or every effect branch.',
      'Effect-tested identifies only cards exercised by the listed native scenarios.',
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
