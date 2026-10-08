import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { createNativeDuelRuntime, createNativeScriptReader } from '../src/core/native/NativeDuelRuntime.js';
import { auditFlags, defaultResponse, clone, json, reachIdle, endTurn, enterBattle, reachBattle, leaveBattle, perform } from './native-field-audit-harness.mjs';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';

const ROOT = new URL('../', import.meta.url);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const OUTPUT = new URL('docs/audits/artifacts/tcg-battle-complete-2026-10-08.json', ROOT);
const BEFORE_PATH = 'docs/audits/artifacts/tcg-battle-before-2026-10-08.js.txt';

async function historicalProjection(inputs, scenarios) {
  const bytes = await readFile(new URL(BEFORE_PATH, ROOT));
  assert.equal(sha256(bytes), '8b2f692bbf099a62c26244098dadfaa10842ce94d4cb0291d9a2e1e0c54af242',
    'Historical visual adapter must remain identical to baseline b8e216c');
  const origin = new URL('src/core/native/NativeDuelVisualEvents.js', ROOT);
  const source = bytes.toString('utf8').replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g,
    (_, quote, path) => `from ${quote}${new URL(path, origin).href}${quote}`);
  const old = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const comparisons = [];
  for (const row of scenarios.filter(row => /replay-accepted-new-target|exodia-five-parts-native-win|both-players-assemble-exodia-native-draw/.test(row.name))) {
    const context = old.createNativeVisualContext({ playerController: row.controller,
      getCardMetadata: code => inputs.resources.metadata.get(code),
      getCardAt: loc => {
        const card = row.midgameFixture.find(card => card.controller === loc.controller
          && card.location === loc.location && card.sequence === loc.sequence);
        return card ? { id: card.code, ...inputs.resources.metadata.get(card.code) } : null;
      } });
    const events = row.messages.flatMap(message => old.translateNativeVisualEvents(message, context).events);
    const before = { publicPhaseEvents: events.filter(event => event.type === 'native-phase').length,
      publicVictoryEvents: events.filter(event => event.type === 'native-victory').length,
      replayMarkedAttackEvents: events.filter(event => /^(attack-monster|attack-direct)$/.test(event.type)
        && event.nativeReplayConfirmed === true).length };
    const after = { publicPhaseEvents: row.visualEvents.filter(event => event.type === 'native-phase').length,
      publicVictoryEvents: row.visualEvents.filter(event => event.type === 'native-victory').length,
      replayMarkedAttackEvents: row.visualEvents.filter(event => /^(attack-monster|attack-direct)$/.test(event.type)
        && event.nativeReplayConfirmed === true).length };
    assert.deepEqual(before, { publicPhaseEvents: 0, publicVictoryEvents: 0, replayMarkedAttackEvents: 0 });
    assert.ok(after.publicPhaseEvents > 0);
    if (row.name.startsWith('replay')) assert.equal(after.replayMarkedAttackEvents, 1);
    else assert.equal(after.publicVictoryEvents, 1);
    comparisons.push({ name: row.name, sameActualNativeProtocolReplayed: true,
      separatelyExecutedHistoricalNativeDuelClaimed: false, fullHistoricalCardStatsCompared: false,
      rawNativeMessagesSha256: sha256(json(row.messages)), before, after });
  }
  return { archivedSourcePath: BEFORE_PATH, archivedSourceSha256: sha256(bytes),
    sourceCommit: 'b8e216cd53ccc640366c91755268291afb1840d2', comparisons };
}

async function session(inputs, core, name, controller, teams = {}) {
  const loadedScripts = new Map();
  const reader = createNativeScriptReader(inputs.resources.scripts);
  const scriptReader = name => { const source = reader(name); loadedScripts.set(name, source); return source; };
  Object.defineProperty(scriptReader, 'correctionsApplied', { value: reader.correctionsApplied });
  const duel = await createNativeDuelRuntime({ ...inputs.resources, scriptReader,
    coreModule: inputs.coreModule, createCore: () => core, flags: auditFlags(inputs.coreModule),
    seed: [1n, 2n, 3n, 4n],
    team1: { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0, ...teams.team1 },
    team2: { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0, ...teams.team2 }
  });
  const C = duel.constants;
  const visual = createNativeVisualContext({ playerController: controller,
    lifePoints: [duel.options.team1.startingLP, duel.options.team2.startingLP],
    getCardMetadata: code => inputs.resources.metadata.get(code),
    getCardAt: loc => {
      if (!(loc.position & 5) || (loc.position & 10)) return null;
      const q = duel.queryCard({ controller: loc.controller, location: loc.location,
        sequence: loc.sequence, flags: C.OcgQueryFlags.CODE });
      return q ? { id: q.code, ...inputs.resources.metadata.get(q.code) } : null;
    },
    queryCard: query => duel.queryCard(query) });
  const s = { label: name, controller, duel, C, messages: [], decisions: [], fixtureCards: [],
    visualEvents: [], visualLogs: [], assertions: {}, loadedScripts,
    add(code, side, location, sequence = 0, position = null) {
      assert.equal(duel.started, false);
      position ??= [1, 2, 64].includes(location) ? 8 : 1;
      this.fixtureCards.push({ code, controller: side, location, sequence, position });
      assert.ok(this.fixtureCards.filter(card => card.code === code && card.controller === side).length <= 3,
        'The midgame fixture preserves the three-copy bound');
      duel.addCard({ code, controller: side, location, sequence, position }); return this;
    },
    decks() { return this.add(85639257, 0, 1).add(85639257, 1, 1); },
    start() { duel.start(); return this; },
    advance() {
      const batch = duel.advance(); this.messages.push(...batch.messages);
      assert.equal(batch.messages.some(msg => msg.type === C.OcgMessageType.RETRY), false);
      assert.deepEqual(duel.errors, []);
      for (const msg of batch.messages) {
        const projected = translateNativeVisualEvents(msg, visual);
        this.visualEvents.push(...projected.events); this.visualLogs.push(...projected.logs);
      }
      return batch;
    },
    respond(response) {
      this.decisions.push({ prompt: clone(duel.pendingPrompt), response: clone(response) });
      duel.respond(response);
    },
    location(side, location) {
      return duel.queryLocation({ controller: side, location, flags: C.OcgQueryFlags.CODE
        | C.OcgQueryFlags.POSITION | C.OcgQueryFlags.ATTACK | C.OcgQueryFlags.DEFENSE }).filter(Boolean);
    },
    async actorMain({ battle = false } = {}) {
      let main = reachIdle(this);
      const count = controller === 1 ? 1 : battle ? 2 : 0;
      for (let turn = 0; turn < count; turn++) main = endTurn(this);
      assert.equal(main.player, controller); return main;
    },
    proof() {
      assert.deepEqual(duel.errors, []);
      const flags = duel.options.flags;
      assert.equal(flags & C.OcgDuelMode.TEST_MODE, 0n);
      assert.equal(flags & C.OcgDuelMode.PSEUDO_SHUFFLE, 0n);
      return { name, controller, status: 'passed', flags: String(flags), seed: duel.options.seed.map(String),
        teams: clone({ team1: duel.options.team1, team2: duel.options.team2 }),
        midgameFixture: this.fixtureCards, threeCopyBound: true, strictFortyCardDeckClaimed: false,
        postStartInjection: false, retryCount: 0, luaErrorCount: 0,
        loadedScripts: [...loadedScripts].filter(([, source]) => source != null).map(([filename, source]) => ({
          filename, path: inputs.resources.auditScriptFiles[filename]?.path ?? filename,
          sourceSha256: sha256(inputs.resources.scripts.get(filename) ?? inputs.resources.scripts.get(`official/${filename}`)),
          effectiveSha256: sha256(source), bytes: Buffer.byteLength(source) })),
        scriptCorrections: clone([...duel.options.scriptCorrectionsApplied.values()]),
        assertions: this.assertions, messages: clone(this.messages), decisions: this.decisions,
        visualEvents: clone(this.visualEvents), publicLogs: this.visualLogs };
    }
  };
  return s;
}

function finish(s, choices = {}, { battle = true, end = false } = {}) {
  for (let step = 0; step < 180; step++) {
    const b = s.advance();
    if (b.status === s.C.OcgProcessResult.END) { assert.equal(end, true); return null; }
    if (b.prompt?.type === (battle ? s.C.OcgMessageType.SELECT_BATTLECMD : s.C.OcgMessageType.SELECT_IDLECMD)) return b.prompt;
    if (b.prompt) s.respond(defaultResponse(b.prompt, s.C, choices));
  }
  throw new Error('Native decision budget exceeded');
}

function attack(s, attacker, target, choices = {}, { end = false, battle = true } = {}) {
  const p = reachBattle(s);
  const index = p.attacks.findIndex(c => c.code === attacker);
  assert.ok(index >= 0);
  s.respond({ type: s.C.OcgResponseType.SELECT_BATTLECMD, action: s.C.SelectBattleCMDAction.SELECT_BATTLE, index });
  return finish(s, { ...choices, select: prompt => choices.select?.(prompt)
    ?? (prompt.selects.some(card => card.code === target) ? [target] : undefined) }, { end, battle });
}

export async function runTcgBattleComplete(inputs, core, { only } = {}) {
  const scenarios = [];
  async function run(name, controller, setup, exercise, teams) {
    const full = `${name}-controller-${controller}`;
    if (only && !full.includes(only)) return;
    const s = await session(inputs, core, full, controller, teams);
    try { setup(s); s.start(); await exercise(s); scenarios.push(s.proof()); }
    catch (error) { await writeFile('/tmp/tcg-battle-current-failure.json', json({ name: full,
      message: error.message, messages: s.messages, decisions: s.decisions, visualEvents: s.visualEvents }));
      error.message = `${full}: ${error.message}`; throw error; }
    finally { s.duel.close(); }
  }
  const battles = [
    { name: 'attack-higher', attacker: 89631139, defender: 46986414, position: 1, damaged: 'opponent', amount: 500, attackerGone: false, defenderGone: true },
    { name: 'attack-lower', attacker: 46986414, defender: 89631139, position: 1, damaged: 'actor', amount: 500, attackerGone: true, defenderGone: false },
    { name: 'attack-equal', attacker: 46986414, defender: 46986414, position: 1, amount: 0, attackerGone: true, defenderGone: true },
    { name: 'zero-attack-equal', attacker: 27125110, defender: 27125110, position: 1, amount: 0, attackerGone: false, defenderGone: false },
    { name: 'defense-lower', attacker: 89631139, defender: 85639257, position: 4, amount: 0, attackerGone: false, defenderGone: true },
    { name: 'defense-equal', attacker: 89631139, defender: 32012841, position: 4, amount: 0, attackerGone: false, defenderGone: false },
    { name: 'defense-higher', attacker: 46986414, defender: 32012841, position: 4, damaged: 'actor', amount: 500, attackerGone: false, defenderGone: false },
    { name: 'zero-attack-zero-defense', attacker: 27125110, defender: 27125110, position: 4, amount: 0, attackerGone: false, defenderGone: false },
    { name: 'face-down-defense-revealed', attacker: 89631139, defender: 85639257, position: 8, amount: 0, attackerGone: false, defenderGone: true, reveal: true },
    { name: 'direct-attack', attacker: 11091375, amount: 1900, damaged: 'opponent', attackerGone: false, defenderGone: false },
    { name: 'printed-piercing', attacker: 63695531, defender: 27125110, position: 4, amount: 1500, damaged: 'opponent', attackerGone: false, defenderGone: true }
  ];
  for (const controller of [0, 1]) {
    for (const b of battles) await run(b.name, controller, s => {
      s.add(b.attacker, controller, 4);
      if (b.defender) s.add(b.defender, 1 - controller, 4, 0, b.position);
      s.decks();
    }, async s => {
      await s.actorMain({ battle: true }); enterBattle(s); const p = attack(s, b.attacker, b.defender);
      assert.equal(p.attacks.some(card => card.code === b.attacker), false, 'A consumed attack is not offered again');
      const damages = s.messages.filter(msg => msg.type === s.C.OcgMessageType.DAMAGE);
      assert.deepEqual(damages.map(msg => [msg.player, msg.amount]), b.amount
        ? [[b.damaged === 'actor' ? controller : 1 - controller, b.amount]] : []);
      const field = s.duel.queryField();
      assert.equal(field.players[controller].lp, 8000 - (b.damaged === 'actor' ? b.amount : 0));
      assert.equal(field.players[1 - controller].lp, 8000 - (b.damaged === 'opponent' ? b.amount : 0));
      assert.equal(s.location(controller, 16).some(card => card.code === b.attacker), b.attackerGone);
      if (b.defender) assert.equal(s.location(1 - controller, 16).some(card => card.code === b.defender), b.defenderGone);
      assert.ok(s.messages.some(msg => msg.type === s.C.OcgMessageType.DAMAGE_STEP_START));
      assert.ok(s.messages.some(msg => msg.type === s.C.OcgMessageType.DAMAGE_STEP_END));
      if (b.reveal) assert.ok(s.visualEvents.some(event => event.type === 'toggle-position'
        && event.publicReveal === true && event.card?.id === String(b.defender)));
      s.assertions = { ...b, nativeDamageMessages: damages.map(msg => [msg.player, msg.amount]),
        secondAttackOffered: false, expectedLP: field.players.map(player => player.lp),
        presentationDamageNeverChangesCore: true };
    });
    await run('first-turn-and-draw-rule', controller, s => {
      s.add(46986414, 0, 1).add(11091375, 0, 1).add(85639257, 1, 1).add(27125110, 1, 1);
    }, async s => {
      const first = reachIdle(s); assert.equal(first.player, 0); assert.equal(first.to_bp, false);
      assert.equal(s.messages.filter(msg => msg.type === s.C.OcgMessageType.DRAW).length, 0);
      const second = endTurn(s); assert.equal(second.player, 1); assert.equal(second.to_bp, true);
      assert.deepEqual(s.messages.filter(msg => msg.type === s.C.OcgMessageType.DRAW).map(msg => [msg.player, msg.drawn.length]), [[1, 1]]);
      const third = endTurn(s); assert.equal(third.player, 0); assert.equal(third.to_bp, true);
      assert.deepEqual(s.messages.filter(msg => msg.type === s.C.OcgMessageType.DRAW).map(msg => [msg.player, msg.drawn.length]), [[1, 1], [0, 1]]);
      s.assertions = { firstPlayerNativeController: 0, presentationViewer: controller,
        firstTurnDraw: false, firstTurnBattleOffered: false, laterMandatoryDraws: [[1, 1], [0, 1]], laterBattleOffered: true };
    }, { team1: { drawCountPerTurn: 1 }, team2: { drawCountPerTurn: 1 } });
    await run('position-and-summon-turn-restrictions', controller, s => {
      s.add(11091375, controller, 2).add(85639257, controller, 4, 0, 4).decks();
    }, async s => {
      await s.actorMain(); let p = perform(s, 'summon', 11091375);
      assert.equal(p.summons.some(card => card.code === 11091375), false);
      assert.equal(p.pos_changes.some(card => card.code === 11091375), false);
      let index = p.pos_changes.findIndex(card => card.code === 85639257); assert.ok(index >= 0);
      s.respond({ type: s.C.OcgResponseType.SELECT_IDLECMD, action: s.C.SelectIdleCMDAction.SELECT_POS_CHANGE, index });
      p = reachIdle(s); assert.equal(p.pos_changes.some(card => card.code === 85639257), false);
      endTurn(s); p = endTurn(s);
      assert.ok(p.pos_changes.some(card => card.code === 11091375));
      enterBattle(s); attack(s, 11091375); p = leaveBattle(s);
      assert.equal(p.pos_changes.some(card => card.code === 11091375), false, 'Attacked monsters cannot manually change position in Main 2');
      s.assertions = { summonTurnManualChangeOffered: false, twiceManualChangeOffered: false,
        nextTurnManualChangeOffered: true, attackedMain2ManualChangeOffered: false };
    });
    for (const accept of [true, false]) await run(`replay-${accept ? 'accepted-new-target' : 'declined'}`, controller, s => {
      s.add(89631139, controller, 4).add(46986414, 1 - controller, 4)
        .add(11091375, 1 - controller, 16).add(97077563, 1 - controller, 8, 0, 8).decks();
    }, async s => {
      await s.actorMain({ battle: true }); enterBattle(s);
      let activated = false, replaySeen = false;
      attack(s, 89631139, 46986414, {
        chainSelect: prompt => {
          const index = prompt.selects.findIndex(card => card.code === 97077563);
          if (index >= 0 && !activated && s.messages.some(msg => msg.type === 110)) { activated = true; return index; }
          return prompt.forced ? 0 : null;
        },
        select: prompt => prompt.selects.some(card => card.code === 11091375) ? [11091375] : undefined,
        respond: prompt => {
          if (prompt.type === s.C.OcgMessageType.SELECT_YESNO && prompt.description === 30n) {
            replaySeen = true; return { type: s.C.OcgResponseType.SELECT_YESNO, yes: accept };
          }
        }
      });
      assert.equal(activated, true); assert.equal(replaySeen, true);
      const attackMessages = s.messages.filter(msg => msg.type === 110);
      assert.equal(attackMessages.length, accept ? 2 : 1);
      const damages = s.messages.filter(msg => msg.type === 91);
      assert.deepEqual(damages.map(msg => [msg.player, msg.amount]), accept ? [[1 - controller, 1100]] : []);
      const offered = reachBattle(s); assert.equal(offered.attacks.some(card => card.code === 89631139), false);
      const attackEvents = s.visualEvents.filter(event => ['attack-monster', 'attack-direct'].includes(event.type));
      assert.equal(attackEvents.length, accept ? 2 : 1);
      if (accept) {
        assert.equal(attackEvents[0].nativeReplayConfirmed, false); assert.equal(attackEvents[1].nativeReplayConfirmed, true);
        assert.equal(attackEvents[0].nativeAttackId, attackEvents[1].nativeAttackId);
        assert.equal(attackEvents[1].replayCount, 1);
      } else assert.ok(s.visualEvents.some(event => event.type === 'attack-stopped' && event.nativeReplayOffered));
      s.assertions = { accepted: accept, actualReplayDescription: '30', realMsgAttackCount: attackMessages.length,
        actualDeclarationCount: 1, actualDamage: damages.map(msg => [msg.player, msg.amount]), secondAttackOffered: false };
    });
    await run('negate-attack-native-end-step', controller, s => {
      s.add(89631139, controller, 4).add(46986414, 1 - controller, 4)
        .add(14315573, 1 - controller, 8, 0, 8).decks();
    }, async s => {
      await s.actorMain({ battle: true }); enterBattle(s);
      const p = attack(s, 89631139, 46986414, { chainCodes: [14315573] }, { battle: false });
      assert.equal(s.messages.some(msg => msg.type === 112), true);
      assert.equal(s.messages.some(msg => msg.type === 113), false);
      assert.equal(s.messages.some(msg => msg.type === 91), false);
      assert.equal(p.type, s.C.OcgMessageType.SELECT_IDLECMD); assert.equal(p.to_bp, false);
      assert.ok(s.messages.some(msg => msg.type === 41 && msg.phase === 256));
      assert.ok(s.visualEvents.some(event => event.type === 'attack-negated' && event.nativeAttackNegated));
      s.assertions = { nativeAttackNegation: true, damageStepEntered: false, damageOccurred: false, attacksAfterNegation: 0 };
    });
    await run('must-attack-replay-without-yesno', controller, s => {
      s.add(39168895, controller, 4).add(46986414, 1 - controller, 4)
        .add(11091375, 1 - controller, 16).add(97077563, 1 - controller, 8, 0, 8).decks();
    }, async s => {
      await s.actorMain({ battle: true }); enterBattle(s);
      let activated = false;
      attack(s, 39168895, 46986414, {
        chainSelect: prompt => {
          const index = prompt.selects.findIndex(card => card.code === 97077563);
          if (index >= 0 && !activated && s.messages.some(msg => msg.type === 110)) { activated = true; return index; }
          return prompt.forced ? 0 : null;
        }, select: prompt => prompt.selects.some(card => card.code === 11091375) ? [11091375] : undefined
      });
      assert.equal(activated, true);
      assert.equal(s.decisions.some(decision => decision.prompt.type === 13 && decision.prompt.description === '30'), false);
      assert.equal(s.messages.filter(msg => msg.type === 110).length, 2);
      const events = s.visualEvents.filter(event => /^(attack-monster|attack-direct)$/.test(event.type));
      assert.equal(events[1].nativeReplayConfirmed, true); assert.equal(events[0].nativeAttackId, events[1].nativeAttackId);
      assert.deepEqual(s.messages.filter(msg => msg.type === 91).map(msg => [msg.player, msg.amount]), [[1 - controller, 100]]);
      s.assertions = { mustAttackSource: 39168895, replayYesNoOffered: false,
        replayConfirmedInsideSameNativeCommand: true, nativeDamage: 100, declarationCount: 1 };
    });
    await run('attacker-leaves-field-attack-stops', controller, s => {
      s.add(89631139, controller, 4).add(46986414, 1 - controller, 4)
        .add(94192409, 1 - controller, 8, 0, 8).decks();
    }, async s => {
      await s.actorMain({ battle: true }); enterBattle(s);
      attack(s, 89631139, 46986414, { chainCodes: [94192409], select: prompt =>
        prompt.selects.some(card => card.code === 89631139) ? [89631139] : undefined });
      assert.equal(s.location(controller, 2).some(card => card.code === 89631139), true);
      assert.equal(s.messages.some(msg => msg.type === 91 || msg.type === 113), false);
      assert.equal(s.decisions.some(decision => decision.prompt.type === 13 && decision.prompt.description === '30'), false);
      assert.ok(s.visualEvents.some(event => event.type === 'attack-stopped'));
      s.assertions = { attackerActuallyReturnedToHand: true, nativeDamageOccurred: false,
        damageStepEntered: false, replayOffered: false };
    });
    await run('target-leaves-field-replay-becomes-direct', controller, s => {
      s.add(89631139, controller, 4).add(46986414, 1 - controller, 4)
        .add(94192409, 1 - controller, 8, 0, 8).decks();
    }, async s => {
      await s.actorMain({ battle: true }); enterBattle(s); let replay = false;
      attack(s, 89631139, 46986414, { chainCodes: [94192409], select: prompt =>
        prompt.selects.some(card => card.code === 46986414) ? [46986414] : undefined,
        respond: prompt => { if (prompt.type === 13 && prompt.description === 30n) {
          replay = true; return { type: s.C.OcgResponseType.SELECT_YESNO, yes: true };
        } } });
      assert.equal(replay, true); assert.equal(s.location(1 - controller, 2).some(card => card.code === 46986414), true);
      assert.deepEqual(s.messages.filter(msg => msg.type === 91).map(msg => [msg.player, msg.amount]), [[1 - controller, 3000]]);
      const events = s.visualEvents.filter(event => ['attack-monster', 'attack-direct'].includes(event.type));
      assert.equal(events.length, 2); assert.equal(events[0].type, 'attack-monster'); assert.equal(events[1].type, 'attack-direct');
      assert.equal(events[1].nativeReplayConfirmed, true); assert.equal(events[0].nativeAttackId, events[1].nativeAttackId);
      s.assertions = { targetActuallyReturnedToHand: true, replayOffered: true,
        replayChangesAttackToDirect: true, nativeDamage: 3000, declarationCount: 1 };
    });
    await run('waboku-prevents-damage-and-destruction', controller, s => {
      s.add(89631139, controller, 4).add(46986414, 1 - controller, 4)
        .add(12607053, 1 - controller, 8, 0, 8).decks();
    }, async s => {
      await s.actorMain({ battle: true }); enterBattle(s); attack(s, 89631139, 46986414, { chainCodes: [12607053] });
      assert.equal(s.messages.some(msg => msg.type === 91), false);
      assert.equal(s.location(1 - controller, 4).some(card => card.code === 46986414), true);
      assert.equal(s.location(controller, 4).some(card => card.code === 89631139), true);
      s.assertions = { damageOccurred: false, bothBattlingMonstersSurvive: true };
    });
    await run('damage-step-eligible-and-ineligible-effects', controller, s => {
      s.add(89631139, controller, 4).add(46986414, 1 - controller, 4)
        .add(37742478, controller, 2).add(14087893, controller, 2).decks();
    }, async s => {
      await s.actorMain({ battle: true }); enterBattle(s);
      let honest = false, earlierBook = false;
      attack(s, 89631139, 46986414, { chainSelect: prompt => {
        const active = s.messages.some(msg => msg.type === 113) && !s.messages.some(msg => msg.type === 114);
        if (!active && prompt.selects.some(card => card.code === 14087893)) earlierBook = true;
        const index = prompt.selects.findIndex(card => card.code === 37742478);
        if (index >= 0) { assert.equal(active, true); assert.equal(prompt.selects.some(card => card.code === 14087893), false); honest = true; return index; }
        return prompt.forced ? 0 : null;
      } });
      assert.equal(earlierBook, true); assert.equal(honest, true);
      assert.equal(s.location(controller, 16).some(card => card.code === 37742478), true);
      assert.equal(s.location(controller, 2).some(card => card.code === 14087893), true);
      assert.equal(s.duel.queryField().players[1 - controller].lp, 5000);
      s.assertions = { bookOfferedBeforeDamage: true, bookOfferedInsideDamage: false,
        honestOfferedInsideDamage: true, honestPaidToGrave: true, nativeDamage: 3000 };
    });
    await run('end-phase-six-card-limit', controller, s => {
      [46986414, 89631139, 11091375, 85639257, 27125110, 32012841, 5053103].forEach(code => s.add(code, controller, 2));
      s.decks();
    }, async s => {
      await s.actorMain(); let discard;
      endTurn(s, { select: prompt => { if (prompt.selects.length === 7) discard = clone(prompt); return [5053103]; } });
      assert.ok(discard); assert.equal(discard.min, 1); assert.equal(discard.max, 1);
      assert.equal(s.location(controller, 2).length, 6);
      assert.equal(s.location(controller, 16).some(card => card.code === 5053103), true);
      s.assertions = { beforeHand: 7, nativeDiscardMin: 1, nativeDiscardMax: 1, afterHand: 6, discarded: 5053103 };
    });
    await run('lp-zero-native-win', controller, s => {
      s.add(11091375, controller, 4).decks();
    }, async s => {
      await s.actorMain({ battle: true }); enterBattle(s); attack(s, 11091375, undefined, {}, { end: true });
      const win = s.messages.find(msg => msg.type === 5); assert.deepEqual(win, { type: 5, player: controller, reason: 1 });
      assert.ok(s.visualEvents.some(event => event.type === 'native-victory' && event.winner === 'player' && event.reason === 'lp_zero'));
      s.assertions = { win: clone(win), displayedWinner: 'player', noWinnerDerivedFromVisualDamage: true };
    }, controller === 0 ? { team2: { startingLP: 1000 } } : { team1: { startingLP: 1000 } });
    await run('mandatory-draw-empty-deck-loss', controller, s => {
      s.add(46986414, 1 - controller, 1);
    }, async s => {
      let p = reachIdle(s); assert.equal(p.player, 0);
      const turns = controller === 0 ? 2 : 1;
      for (let t = 0; t < turns; t++) {
        s.respond({ type: s.C.OcgResponseType.SELECT_IDLECMD, action: s.C.SelectIdleCMDAction.TO_EP, index: null });
        p = finish(s, {}, { battle: false, end: t === turns - 1 });
      }
      const win = s.messages.find(msg => msg.type === 5);
      assert.deepEqual(win, { type: 5, player: 1 - controller, reason: 2 });
      assert.ok(s.visualEvents.some(event => event.type === 'native-victory' && event.winner === 'opponent' && event.reason === 'deck_out'));
      s.assertions = { win: clone(win), displayedWinner: 'opponent', emptyDeckAloneDoesNotEndFirstMain: true };
    }, { team1: { drawCountPerTurn: 1 }, team2: { drawCountPerTurn: 1 } });
    await run('exodia-five-parts-native-win', controller, s => {
      [33396948, 70903634, 44519536, 8124921].forEach(code => s.add(code, controller, 2));
      s.add(7902349, controller, 1).add(70368879, controller, 2).add(85639257, 1 - controller, 1);
    }, async s => {
      await s.actorMain(); const idle = reachIdle(s);
      const index = idle.activates.findIndex(card => card.code === 70368879); assert.ok(index >= 0);
      s.respond({ type: s.C.OcgResponseType.SELECT_IDLECMD, action: s.C.SelectIdleCMDAction.SELECT_ACTIVATE, index });
      finish(s, {}, { battle: false, end: true });
      const win = s.messages.find(msg => msg.type === 5); assert.deepEqual(win, { type: 5, player: controller, reason: 16 });
      assert.ok(s.visualEvents.some(event => event.type === 'native-victory' && event.winner === 'player' && event.reason === 'exodia'));
      s.assertions = { win: clone(win), fiveDistinctNativeParts: true, fifthPartActuallyDrawn: true,
        winningDrawSource: 70368879, victoryEffectExecuted: true };
    });
    await run('four-exodia-parts-no-win', controller, s => {
      [33396948, 70903634, 44519536, 8124921].forEach(code => s.add(code, controller, 2)); s.decks();
    }, async s => {
      reachIdle(s); assert.equal(s.messages.some(msg => msg.type === 5), false);
      s.assertions = { parts: 4, nativeWinEmitted: false };
    });
    await run('both-players-assemble-exodia-native-draw', controller, s => {
      for (const side of [0, 1]) {
        [33396948, 70903634, 44519536, 8124921].forEach(code => s.add(code, side, 2));
        s.add(7902349, side, 1);
      }
      s.add(33782437, controller, 2);
    }, async s => {
      await s.actorMain(); const p = reachIdle(s);
      const index = p.activates.findIndex(card => card.code === 33782437); assert.ok(index >= 0);
      s.respond({ type: s.C.OcgResponseType.SELECT_IDLECMD, action: s.C.SelectIdleCMDAction.SELECT_ACTIVATE, index });
      finish(s, {}, { battle: false, end: true });
      const win = s.messages.find(msg => msg.type === 5); assert.deepEqual(win, { type: 5, player: 2, reason: 16 });
      const groups = s.messages.filter(msg => msg.type === 31); assert.ok(groups.length >= 2);
      assert.ok(groups.every(group => group.cards.length === 5));
      assert.deepEqual([...new Set(groups.map(group => group.player))].sort(), [0, 1]);
      assert.equal(s.visualEvents.filter(event => event.type === 'native-victory').length, 1);
      s.assertions = { win: clone(win), bothFifthPartsActuallyDrawn: true, drawingSpell: 33782437,
        nativeConfirmationRecipients: groups.map(group => group.player), nativeDrawResult: true,
        rawRepeatedWinCount: s.messages.filter(msg => msg.type === 5).length,
        publicVictoryEventCount: 1 };
    });
    await run('both-zero-lp-native-draw', controller, s => {
      s.add(57585212, controller, 8, 0, 8).decks();
    }, async s => {
      await s.actorMain({ battle: true }); const idle = reachIdle(s);
      const index = idle.activates.findIndex(card => card.code === 57585212); assert.ok(index >= 0);
      s.respond({ type: s.C.OcgResponseType.SELECT_IDLECMD, action: s.C.SelectIdleCMDAction.SELECT_ACTIVATE, index });
      finish(s, {}, { battle: false, end: true });
      const win = s.messages.find(msg => msg.type === 5); assert.deepEqual(win, { type: 5, player: 2, reason: 1 });
      assert.ok(s.visualEvents.some(event => event.type === 'native-victory' && event.winner === 'draw'));
      s.assertions = { win: clone(win), nativeBothZeroCondition: true, bannedCardUsedAsExplicitFreeModeRuleFixture: true };
    }, controller === 0 ? { team1: { startingLP: 500 } } : { team2: { startingLP: 500 } });
  }
  return { ok: true, scenarios, scenarioCount: scenarios.length,
    historicalProjection: await historicalProjection(inputs, scenarios),
    scope: { authoritativeRules: 'Native WASM core API 11 with MODE_MR5 and both TCG SEGOC flags',
      strictDecksClaimed: false, allCardInteractionsExhaustivelyCertified: false,
      allFiveDamageSubstepsSeparatelyExposedByAbi: false, compiledBrowserClaimed: false,
      knownBannedCardSelfDestructButtonOnlyUsedAsFreeModeMidgameFixture: true } };
}

export const TCG_BATTLE_DEPENDENCIES = [
  'src/core/native/NativeBattleLifecycle.js', 'src/core/native/NativeDuelVisualEvents.js',
  'src/core/native/NativeDuelRuntime.js', 'src/core/native/NativeDuelDecisions.js',
  'src/core/native/NativeLuaCompatibility.js', 'src/core/native/NativeCardScriptCorrections.js',
  'src/core/native/NativeCardCharacteristics.js', BEFORE_PATH,
  'scripts/tcg-battle-complete-2026-10-08.mjs', 'scripts/native-field-audit-harness.mjs',
  'scripts/audit-tcg-battle-source-protocol-2026-10-08.py',
  'tests/tcg-battle-complete-2026-10-08.test.mjs',
  'docs/audits/artifacts/tcg-battle-core-protocol-2026-10-08.json',
  'docs/audits/artifacts/tcg-chain-official-sources-2026-10-08.json',
  'scripts/native-field-audit-inputs.mjs', 'public/native/ocgcore.sync.wasm',
  'public/native/core-build.json', 'public/native/card-data.json', 'public/native/scripts.json'
];

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const inputs = await loadNativeAuditInputs(); const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const report = await runTcgBattleComplete(inputs, core, { only: process.argv.find(value => value.startsWith('--only='))?.slice(7) });
  const sources = await Promise.all(TCG_BATTLE_DEPENDENCIES.map(async path => {
    const bytes = await readFile(new URL(path, ROOT)); return { path, bytes: bytes.length, sha256: sha256(bytes) };
  }));
  await mkdir(new URL('docs/audits/artifacts/', ROOT), { recursive: true });
  const target = process.argv.some(value => value.startsWith('--only='))
    ? new URL('file:///tmp/tcg-battle-diagnostic-subset-2026-10-08.json') : OUTPUT;
  await writeFile(target, json({ format: 'tcg-battle-complete-evidence-v1', generatedAt: new Date().toISOString(),
    baselineLocalCommit: 'b8e216cd53ccc640366c91755268291afb1840d2',
    nativeCoreBuild: inputs.coreBuild, sources, ...report }));
  console.log(json({ ok: report.ok, scenarioCount: report.scenarioCount, output: target.pathname }));
}
