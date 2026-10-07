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
    duel, C, label, messages: [], decisions: [], queries: [], fixtureCards: [],
    add(code, controller, location, sequence = 0, position = null) {
      position ??= [C.OcgLocation.HAND, C.OcgLocation.DECK, C.OcgLocation.EXTRA].includes(location)
        ? C.OcgPosition.FACEDOWN_DEFENSE : C.OcgPosition.FACEUP_ATTACK;
      const sourceCode = inputs.resources.canonicalCodeToSource?.get(code) ?? code;
      const filename = `c${sourceCode}.lua`;
      const script = inputs.resources.scripts.get(filename);
      this.fixtureCards.push({ canonicalCode: code, sourceCode, name: inputs.resources.metadata.get(sourceCode)?.name,
        controller, location, sequence, position, scriptPath: inputs.resources.auditScriptFiles?.[filename]?.path ?? null,
        scriptSha256: script ? sha256(script) : null });
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
      if (choices.chainSelect) return { type: R.SELECT_CHAIN, index: choices.chainSelect(prompt) };
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

function endTurn(session, choices = {}) {
  const prompt = reachIdle(session);
  assert.equal(prompt.to_ep, true);
  session.respond({ type: session.C.OcgResponseType.SELECT_IDLECMD, action: session.C.SelectIdleCMDAction.TO_EP, index: null });
  return reachIdle(session, choices);
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
    queries: session.queries, fixtureCards: session.fixtureCards, errors: clone(session.duel.errors)
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
      messages: clone(session.messages), decisions: session.decisions, queries: session.queries,
      fixtureCards: session.fixtureCards, errors: clone(session.duel.errors) }); }
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
