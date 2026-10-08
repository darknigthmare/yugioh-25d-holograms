import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';
import { chooseNativeAIResponse } from '../src/core/native/NativeDuelDecisions.js';
const sha256 = value => createHash('sha256').update(value).digest('hex');
export const json = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item, 2);
export const clone = value => JSON.parse(json(value));

export function auditFlags(C) {
  return C.OcgDuelMode.MODE_MR5 | C.OcgDuelMode.TCG_SEGOC_NONPUBLIC | C.OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER;
}

export async function makeSession(inputs, sharedCore, label, fixtureOptions = {}) {
  const duel = await createNativeDuelRuntime({
    ...inputs.resources, coreModule: inputs.coreModule, createCore: () => sharedCore,
    flags: auditFlags(inputs.coreModule), seed: fixtureOptions.seed ?? [1n, 2n, 3n, 4n],
    team1: { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0, ...fixtureOptions.team1 },
    team2: { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0, ...fixtureOptions.team2 }
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
        scriptSha256: script ? sha256(script) : null,
        effectiveScriptSha256: script ? sha256(duel.options.scriptReader(filename) ?? script) : null });
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
    card(controller, location, sequence = 0, extraFlags = 0) {
      const query = { controller, location, sequence, flags: C.OcgQueryFlags.CODE | C.OcgQueryFlags.POSITION
        | C.OcgQueryFlags.TYPE | C.OcgQueryFlags.LEVEL | C.OcgQueryFlags.RACE | C.OcgQueryFlags.ATTACK
        | C.OcgQueryFlags.DEFENSE | C.OcgQueryFlags.ATTRIBUTE | C.OcgQueryFlags.STATUS
        | C.OcgQueryFlags.REASON | C.OcgQueryFlags.COUNTERS | extraFlags };
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

export function choosePlace(prompt, C) {
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

export function defaultResponse(prompt, C, choices = {}) {
  const M = C.OcgMessageType; const R = C.OcgResponseType;
  const explicit = choices.respond?.(prompt, C);
  if (explicit) return explicit;
  switch (prompt.type) {
    case M.SELECT_CHAIN: {
      if (choices.chainSelect) return { type: R.SELECT_CHAIN, index: choices.chainSelect(prompt) };
      const wanted = prompt.selects.findIndex(card => choices.chainCodes?.includes(card.code));
      return { type: R.SELECT_CHAIN, index: wanted >= 0 ? wanted : prompt.forced ? 0 : null };
    }
    case M.SELECT_YESNO: return { type: R.SELECT_YESNO, yes: choices.yes ?? true };
    case M.SELECT_EFFECTYN: return { type: R.SELECT_EFFECTYN, yes: choices.effectYes?.(prompt) ?? choices.yes ?? true };
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
    case M.SORT_CARD: return { type: R.SORT_CARD, order: choices.sort?.(prompt) ?? Array.from({ length: prompt.cards.length }, (_, index) => index) };
    case M.SELECT_SUM: case M.SELECT_COUNTER: case M.SELECT_DISFIELD: case M.ANNOUNCE_NUMBER:
    case M.ANNOUNCE_ATTRIB: case M.ANNOUNCE_RACE: {
      const response = chooseNativeAIResponse(prompt, { constants: C });
      assert.ok(response, `No legal typed response for actual core prompt ${prompt.type}`);
      return response;
    }
    default: throw new Error(`Unsupported actual core prompt ${prompt.type}: ${json(prompt)}`);
  }
}

export function reachIdle(session, choices = {}, { allowEnd = false } = {}) {
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

export function perform(session, kind, code, choices = {}, options = {}) {
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

export function endTurn(session, choices = {}) {
  const prompt = reachIdle(session);
  assert.equal(prompt.to_ep, true);
  session.respond({ type: session.C.OcgResponseType.SELECT_IDLECMD, action: session.C.SelectIdleCMDAction.TO_EP, index: null });
  return reachIdle(session, choices);
}

export function reachBattle(session, choices = {}) {
  for (let index = 0; index < 160; index += 1) {
    const result = session.advance();
    if (result.prompt?.type === session.C.OcgMessageType.SELECT_BATTLECMD) return result.prompt;
    assert.notEqual(result.status, session.C.OcgProcessResult.END, `${session.label}: battle unexpectedly ended duel`);
    if (result.prompt) session.respond(defaultResponse(result.prompt, session.C, choices));
  }
  throw new Error(`${session.label}: battle decision budget exceeded`);
}

export function enterBattle(session, choices = {}) {
  const idle = reachIdle(session);
  assert.equal(idle.to_bp, true, `${session.label}: real Battle Phase must be available`);
  session.respond({ type: session.C.OcgResponseType.SELECT_IDLECMD,
    action: session.C.SelectIdleCMDAction.TO_BP, index: null });
  return reachBattle(session, choices);
}

export function battleAttack(session, attackerCode, targetCode, choices = {}) {
  const prompt = reachBattle(session);
  const index = prompt.attacks.findIndex(card => card.code === attackerCode);
  assert.ok(index >= 0, `${session.label}: attacker ${attackerCode} not offered by core`);
  session.respond({ type: session.C.OcgResponseType.SELECT_BATTLECMD,
    action: session.C.SelectBattleCMDAction.SELECT_BATTLE, index });
  return reachBattle(session, { ...choices, select: selection => {
    const preferred = choices.select?.(selection);
    if (preferred) return preferred;
    if (targetCode && selection.selects.some(card => card.code === targetCode)) return [targetCode];
    return choices.codes;
  } });
}

export function leaveBattle(session, choices = {}) {
  const prompt = reachBattle(session);
  assert.equal(prompt.to_m2, true);
  session.respond({ type: session.C.OcgResponseType.SELECT_BATTLECMD,
    action: session.C.SelectBattleCMDAction.TO_M2, index: null });
  return reachIdle(session, choices);
}

export function hasCode(session, player, location, code) {
  return session.location(player, location).some(card => card.code === code);
}

export function requireChain(session, code) {
  const M = session.C.OcgMessageType;
  assert.ok(session.messages.some(message => message.type === M.CHAINING && message.code === code), `${session.label}: no real chain for ${code}`);
  assert.ok(session.messages.some(message => message.type === M.CHAIN_SOLVED));
  assert.ok(session.messages.some(message => message.type === M.CHAIN_END));
}

export function scenarioEvidence(session, fields, description) {
  assert.deepEqual(session.duel.errors, [], `${session.label}: Lua/core diagnostics`);
  return {
    id: session.label, fields, description, status: 'passed', nativeApi: session.duel.core.getVersion(),
    flags: auditFlags(session.C).toString(), fixtureSeed: session.duel.options.seed.map(String),
    fixtureTeams: clone({ team1: session.duel.options.team1, team2: session.duel.options.team2 }),
    scriptCorrections: clone([...session.duel.options.scriptCorrectionsApplied.values()]),
    messages: clone(session.messages), decisions: session.decisions,
    queries: session.queries, fixtureCards: session.fixtureCards, errors: clone(session.duel.errors)
  };
}

export function createNativeFieldScenarioRunner(inputs, sharedCore) {
  const scenarios = [];
  async function run(label, fields, description, exercise, fixtureOptions = {}) {
    const session = await makeSession(inputs, sharedCore, label, fixtureOptions);
    try { await exercise(session); scenarios.push(scenarioEvidence(session, fields, description)); }
    catch (error) { scenarios.push({ id: label, fields, description, status: 'failed', error: error.message,
      messages: clone(session.messages), decisions: session.decisions, queries: session.queries,
      fixtureCards: session.fixtureCards, fixtureSeed: session.duel.options.seed.map(String),
      fixtureTeams: clone({ team1: session.duel.options.team1, team2: session.duel.options.team2 }),
      scriptCorrections: clone([...session.duel.options.scriptCorrectionsApplied.values()]),
      errors: clone(session.duel.errors) }); }
    finally { session.duel.close(); }
  }
  return { scenarios, run };
}
