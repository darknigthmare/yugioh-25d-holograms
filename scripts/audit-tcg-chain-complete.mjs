import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { makeSession, auditFlags, clone, json } from './native-field-audit-harness.mjs';
import { chooseNativeAIResponse, resolveNativeDuelPrompt, nativeSelectablePlaces,
  translateNativePrompt, validateNativeDuelResponse } from '../src/core/native/NativeDuelDecisions.js';

const hash = value => createHash('sha256').update(value).digest('hex');
export const TCG_CHAIN_COMPLETE_REPORT = new URL('../docs/audits/artifacts/tcg-chain-complete-2026-10-08.json', import.meta.url);

/** The fixtures contain only ordinary NewCard calls before Start. Every later
 * mutation is performed by the shipped native core and archived card scripts. */
export async function auditTcgChainComplete({ inputs, core } = {}) {
  inputs ??= await loadNativeAuditInputs();
  core ??= await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const scenarios = [];
  async function scenario(name, setup, exercise, choice) {
    const s = await makeSession(inputs, core, name);
    const C = s.C, M = C.OcgMessageType, R = C.OcgResponseType;
    s.uiDecisions = []; s.observations = []; s.rejected = [];
    s.answer = async prompt => {
      const options = { constants: C, metadata: inputs.resources.metadata, cardReader: s.duel.options.cardReader };
      const translated = translateNativePrompt(prompt, options);
      assert.ok(translated, `Unsupported prompt ${prompt.type}`);
      for (const answer of [undefined, '0', false]) {
        if (prompt.type === M.SELECT_CHAIN) {
          assert.equal(translated.toResponse(answer), null);
          s.rejected.push({ kind: 'SELECT_CHAIN', answer: answer === undefined ? 'undefined' : answer,
            beforeMessage: s.messages.length });
        }
      }
      if (prompt.type === M.SELECT_CHAIN && prompt.forced) assert.equal(translated.toResponse(null), null);
      const suggested = chooseNativeAIResponse(prompt, options);
      const response = await resolveNativeDuelPrompt({ prompt, runtime: s.duel, side: 'player', ...options,
        onDecision: request => {
          s.uiDecisions.push({ prompt: clone(prompt), request: clone(request), afterMessage: s.messages.length });
          const selected = choice?.(s, request, prompt);
          if (selected !== undefined) return selected;
          if (request.sequence === 'order' || [M.SORT_CARD, M.SORT_CHAIN].includes(prompt.type)) return request.choices[0].value;
          if (suggested?.indicies) return suggested.indicies.map(String);
          if (suggested?.places) {
            const places = nativeSelectablePlaces(prompt);
            return suggested.places.map(place => String(places.findIndex(candidate => candidate.player === place.player
              && candidate.location === place.location && candidate.sequence === place.sequence)));
          }
          if ('yes' in (suggested ?? {})) return suggested.yes;
          if ('position' in (suggested ?? {})) return suggested.position;
          if ('index' in (suggested ?? {})) return suggested.index;
          if ('value' in (suggested ?? {})) return suggested.value;
          if (request.choices?.length) return request.choices[0].value;
          throw new Error(`No explicit fixture choice for ${request.nativeKind}`);
        } });
      assert.ok(response, `No valid translated ${prompt.type} response`);
      assert.equal(validateNativeDuelResponse(prompt, response, options), true);
      s.respond(response);
    };
    s.idle = async () => {
      for (let step = 0; step < 200; step += 1) {
        const result = s.advance();
        assert.notEqual(result.status, C.OcgProcessResult.END, `${name}: unexpected duel end`);
        assert.deepEqual(s.duel.errors, []);
        if (result.prompt?.type === M.SELECT_IDLECMD) return result.prompt;
        assert.ok(result.prompt, 'Missing native prompt'); await s.answer(result.prompt);
      }
      throw new Error(`${name}: native decision budget exceeded`);
    };
    s.action = async (kind, code) => {
      const prompt = await s.idle();
      const [list, action] = kind === 'summon' ? [prompt.summons, C.SelectIdleCMDAction.SELECT_SUMMON]
        : [prompt.activates, C.SelectIdleCMDAction.SELECT_ACTIVATE];
      const index = list.findIndex(card => card.code === code);
      assert.ok(index >= 0, `${name}: ${kind} ${code} not offered`);
      s.respond({ type: R.SELECT_IDLECMD, action, index }); return s.idle();
    };
    s.end = async () => {
      const prompt = await s.idle(); assert.equal(prompt.to_ep, true);
      s.respond({ type: R.SELECT_IDLECMD, action: C.SelectIdleCMDAction.TO_EP, index: null }); return s.idle();
    };
    s.has = (player, location, code) => s.location(player, location).some(card => card.code === code);
    s.chain = codes => s.messages.filter(message => message.type === M.CHAINING && codes.includes(message.code));
    s.chooseCards = (prompt, codes) => prompt.selects.map((card, index) => codes.includes(card.code) ? String(index) : null).filter(value => value !== null);
    try {
      setup(s); s.baseDecks(); s.start(); await exercise(s);
      assert.equal(s.duel.options.flags, auditFlags(C));
      assert.equal(s.duel.options.flags & (C.OcgDuelMode.TEST_MODE | C.OcgDuelMode.PSEUDO_SHUFFLE), 0n);
      assert.deepEqual(s.duel.errors, []);
      const copies = new Map();
      for (const card of s.fixtureCards) {
        const key = `${card.controller}:${card.canonicalCode}`;
        copies.set(key, (copies.get(key) ?? 0) + 1); assert.ok(copies.get(key) <= 3, `${name}: over three copies`);
      }
      scenarios.push({ name, ok: true, fixtureCards: clone(s.fixtureCards), nativeFlags: String(s.duel.options.flags),
        initialParameters: clone({ seed: s.duel.options.seed, team1: s.duel.options.team1, team2: s.duel.options.team2 }),
        transcript: clone(s.messages), typedDecisions: clone(s.decisions), uiDecisions: s.uiDecisions,
        rejectedBeforeNativeRespond: s.rejected, observations: s.observations,
        finalField: clone(s.duel.queryField()), queries: clone(s.queries), errors: clone(s.duel.errors) });
    } finally { s.duel.close(); }
  }

  for (const turnPlayer of [0, 1]) {
    await scenario(`segoc-four-public-categories-turn-${turnPlayer}`, s => {
      s.add(53129443, turnPlayer, 2);
      for (const player of [0, 1]) s.add(26202165, player, 4).add(61488417, player, 4, 1)
        .add(30106950, player, 1).add(83011277, player, 1);
    }, async s => {
      if (turnPlayer) await s.end();
      await s.action('activate', 53129443);
      const links = s.chain([26202165, 61488417]);
      assert.deepEqual(links.map(link => [link.code, link.controller]), [
        [26202165, turnPlayer], [26202165, 1 - turnPlayer],
        [61488417, turnPlayer], [61488417, 1 - turnPlayer]
      ]);
      const resolving = s.messages.filter(message => message.type === s.C.OcgMessageType.CHAIN_SOLVING);
      assert.deepEqual(resolving.slice(-4).map(message => message.chain_size), [4, 3, 2, 1]);
      for (const player of [0, 1]) {
        assert.equal(s.has(player, 4, 30106950), true); assert.equal(s.location(player, 2).length, 1);
      }
      s.observations.push({ rule: 'mandatory turn / mandatory non-turn / optional turn / optional non-turn',
        chain: links.map(link => ({ code: link.code, controller: link.controller })), resolution: [4, 3, 2, 1] });
    }, (s, request, prompt) => {
      if (prompt.type === s.C.OcgMessageType.SELECT_CHAIN) return prompt.selects.length ? 0 : null;
    });
  }

  for (const declined of [false, true]) {
    await scenario(`tcg-private-kagetokage-${declined ? 'declined' : 'activated'}`, s => {
      s.add(25259669, 0, 2).add(94656263, 0, 2).add(83011277, 0, 2);
    }, async s => {
      await s.action('summon', 25259669);
      const links = s.chain([25259669, 94656263]);
      assert.deepEqual(links.map(link => link.code), declined ? [25259669] : [25259669, 94656263]);
      assert.equal(s.has(0, 4, 94656263), !declined); assert.equal(s.has(0, 2, 94656263), declined);
      assert.equal(s.has(0, 4, 83011277), true);
      s.observations.push({ rule: 'TCG private hand trigger joins the simultaneous trigger chain after the public trigger',
        declined, chain: links.map(link => link.code) });
    }, (s, request, prompt) => {
      if (prompt.type === s.C.OcgMessageType.SELECT_CHAIN) {
        const publicIndex = prompt.selects.findIndex(card => card.code === 25259669);
        if (publicIndex >= 0) return publicIndex;
        const privateIndex = prompt.selects.findIndex(card => card.code === 94656263);
        if (privateIndex >= 0) return declined ? null : privateIndex;
      }
      if (prompt.type === s.C.OcgMessageType.SELECT_CARD) return s.chooseCards(prompt, [83011277]);
    });
  }

  for (const turnPlayer of [0, 1]) {
    await scenario(`tcg-first-trigger-different-events-turn-${turnPlayer}`, s => {
      s.add(5318639, turnPlayer, 2).add(46986414, turnPlayer, 2)
        .add(4178474, turnPlayer, 8, 0, 8).add(4178474, 1 - turnPlayer, 8, 0, 8)
        .add(83011277, 1 - turnPlayer, 2).add(43711255, 1 - turnPlayer, 8, 1)
        .add(26202165, turnPlayer, 4).add(78010363, turnPlayer, 4, 1)
        .add(17444133, turnPlayer, 1).add(3657444, turnPlayer, 1);
    }, async s => {
      if (turnPlayer) await s.end();
      await s.action('activate', 5318639);
      const destruction = s.chain([5318639, 4178474]);
      assert.deepEqual(destruction.map(link => [link.code, link.controller]), [
        [5318639, turnPlayer], [4178474, 1 - turnPlayer], [4178474, turnPlayer]
      ]);
      const triggerChain = s.chain([26202165, 78010363]);
      assert.deepEqual(triggerChain.map(link => link.code), [78010363, 26202165]);
      // Each chronological mandatory group contains one effect, so the core
      // places it itself; the client must not invent a sorting choice.
      assert.equal(s.uiDecisions.some(item => item.prompt.type === s.C.OcgMessageType.SORT_CHAIN), false);
      assert.equal(s.uiDecisions.some(item => item.prompt.type === s.C.OcgMessageType.SELECT_CHAIN
        && item.prompt.forced && item.prompt.selects.some(card => card.code === 26202165)
        && item.prompt.selects.some(card => card.code === 78010363)), false);
      s.observations.push({ rule: 'TCG first trigger at different times during one chain preserves chronological event order',
        destructionResolution: [3, 2, 1], firstDestroyed: 78010363,
        triggerChain: triggerChain.map(link => link.code), noCrossEventSortChoice: true });
    }, (s, request, prompt) => {
      const M = s.C.OcgMessageType;
      if (prompt.type === M.SELECT_CHAIN) {
        if (prompt.forced) return 0;
        const breaks = s.chain([4178474]).length;
        const index = prompt.selects.findIndex(card => card.code === 4178474);
        if (s.chain([5318639]).length && index >= 0
          && ((breaks === 0 && prompt.player !== turnPlayer) || (breaks === 1 && prompt.player === turnPlayer))) return index;
        return null;
      }
      if (prompt.type === M.SELECT_CARD) {
        if (prompt.selects.some(card => card.code === 43711255) && !s.chain([5318639]).length)
          return s.chooseCards(prompt, [43711255]);
        if (prompt.selects.some(card => card.code === 46986414)) return s.chooseCards(prompt, [46986414]);
        if (prompt.selects.some(card => card.code === 83011277)) return s.chooseCards(prompt, [83011277]);
        if (prompt.selects.some(card => card.code === 26202165)) return s.chooseCards(prompt,
          prompt.player === turnPlayer ? [78010363] : [26202165]);
      }
    });
  }

  for (const mode of ['destroy-last', 'tribute', 'discard-cost']) {
    await scenario(`peten-when-optional-${mode}`, s => {
      s.add(52624755, 0, mode === 'discard-cost' ? 2 : 4).add(52624755, 0, 1);
      if (mode === 'destroy-last') s.add(53129443, 0, 2);
      if (mode === 'tribute') s.add(46986414, 0, 2).add(83011277, 0, 4, 1);
      if (mode === 'discard-cost') s.add(2295440, 0, 2).add(3657444, 0, 1);
    }, async s => {
      await s.action(mode === 'tribute' ? 'summon' : 'activate',
        mode === 'destroy-last' ? 53129443 : mode === 'tribute' ? 46986414 : 2295440);
      assert.equal(s.chain([52624755]).length, mode === 'destroy-last' ? 1 : 0);
      assert.equal(s.has(0, 32, 52624755), mode === 'destroy-last');
      assert.equal(s.has(0, 16, 52624755), mode !== 'destroy-last');
      if (mode === 'destroy-last') assert.equal(s.has(0, 4, 52624755), true);
      s.observations.push({ rule: 'optional When trigger requires its event to be the last event', mode });
    }, (s, request, prompt) => {
      if (prompt.type === s.C.OcgMessageType.SELECT_CHAIN) {
        const index = prompt.selects.findIndex(card => card.code === 52624755); if (index >= 0) return index;
      }
      if (prompt.type === s.C.OcgMessageType.SELECT_CARD && mode === 'discard-cost')
        return s.chooseCards(prompt, prompt.selects.some(card => card.code === 52624755) ? [52624755] : [3657444]);
    });
  }

  for (const monster of [2460565, 62962630]) {
    await scenario(`goblindbergh-then-${monster === 2460565 ? 'when-misses' : 'if-delayed-activates'}`, s => {
      s.add(25259669, 0, 2).add(monster, 0, 2);
      s.add(monster === 2460565 ? 83011277 : 36637374, 0, monster === 2460565 ? 2 : 1);
    }, async s => {
      await s.action('summon', 25259669);
      assert.equal(s.chain([monster]).length, monster === 2460565 ? 0 : 1);
      assert.equal(s.card(0, 4).position, s.C.OcgPosition.FACEUP_DEFENSE);
      if (monster === 62962630) assert.equal(s.has(0, 2, 36637374), true);
      else assert.equal(s.has(0, 2, 83011277), true);
      s.observations.push({ rule: 'Goblindbergh summons, then changes its position; When misses, delayed If survives', monster });
    }, (s, request, prompt) => {
      if (prompt.type === s.C.OcgMessageType.SELECT_CARD)
        return s.chooseCards(prompt, prompt.selects.some(card => card.code === monster) ? [monster] : [36637374]);
      if (prompt.type === s.C.OcgMessageType.SELECT_CHAIN) return prompt.selects.length ? 0 : null;
    });
  }

  await scenario('counter-trap-speed-three-excludes-speed-two', s => {
    s.add(55144522, 0, 2).add(5318639, 0, 2).add(14087893, 0, 2)
      .add(77538567, 0, 8, 0, 8).add(41420027, 1, 8, 0, 8)
      .add(83011277, 0, 4).add(89631139, 0, 1).add(17444133, 0, 1).add(83011277, 1, 1);
  }, async s => {
    await s.action('activate', 55144522);
    assert.deepEqual(s.chain([55144522, 41420027, 77538567]).map(link => link.code), [55144522, 41420027, 77538567]);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.CHAIN_NEGATED && message.chain_size === 2));
    assert.equal(s.duel.queryField().players[1].lp, 4000, 'Judgment LP cost is not refunded');
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.DRAW && message.player === 0 && message.drawn.length === 2));
    assert.equal(s.observations.some(item => item.rule === 'Spell Speed 3 response'), true);
  }, (s, request, prompt) => {
    if (prompt.type !== s.C.OcgMessageType.SELECT_CHAIN) return;
    const codes = prompt.selects.map(card => card.code);
    if (s.chain([41420027]).length && !s.chain([77538567]).length && prompt.player === 0) {
      assert.equal(codes.includes(5318639), false); assert.equal(codes.includes(14087893), false);
      assert.equal(s.duel.queryField().players[1].lp, 4000);
      const index = codes.indexOf(77538567); assert.ok(index >= 0);
      s.observations.push({ rule: 'Spell Speed 3 response', offeredCodes: codes,
        speedTwoExcluded: true, judgmentLpCostAlreadyPaidBeforeResponse: 4000 }); return index;
    }
    const index = codes.indexOf(41420027); return index >= 0 ? index : null;
  });

  for (const negateActivation of [true, false]) {
    await scenario(`fusion-deployment-${negateActivation ? 'activation' : 'effect'}-negation-once-activate`, s => {
      s.add(6498706, 0, 2).add(6498706, 0, 2).add(23995346, 0, 64, 0, 8).add(89631139, 0, 1);
      s.add(negateActivation ? 41420027 : 14558127, 1, negateActivation ? 8 : 2, 0, 8);
    }, async s => {
      const after = await s.action('activate', 6498706);
      assert.equal(after.activates.some(card => card.code === 6498706), negateActivation);
      assert.equal(s.has(0, 4, 89631139), false);
      assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType[negateActivation ? 'CHAIN_NEGATED' : 'CHAIN_DISABLED']));
      if (negateActivation) { await s.action('activate', 6498706); assert.equal(s.has(0, 4, 89631139), true); }
      s.observations.push({ rule: 'only activate once permits retry after activation negation, not effect negation', negateActivation });
    }, (s, request, prompt) => {
      if (prompt.type === s.C.OcgMessageType.SELECT_CHAIN) {
        const index = prompt.selects.findIndex(card => card.code === (negateActivation ? 41420027 : 14558127));
        return index >= 0 ? index : null;
      }
    });
  }

  for (const flipTarget of [false, true]) {
    await scenario(`effect-veiler-${flipTarget ? 'target-becomes-facedown' : 'effect-negation-end-phase-reset'}`, s => {
      s.add(62962630, 0, 2).add(36637374, 0, 1).add(97268402, 1, 2);
      if (flipTarget) s.add(14087893, 0, 2);
    }, async s => {
      await s.action('summon', 62962630);
      assert.equal(s.has(1, 16, 97268402), true);
      assert.equal(s.has(0, 2, 36637374), flipTarget);
      assert.equal(s.messages.some(message => message.type === s.C.OcgMessageType.CHAIN_NEGATED), false);
      if (flipTarget) assert.equal(s.card(0, 4).position, s.C.OcgPosition.FACEDOWN_DEFENSE);
      else {
        assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.CHAIN_DISABLED));
        const before = s.card(0, 4).status; await s.end(); const after = s.card(0, 4).status;
        assert.notEqual(before, after, 'End Phase removes the native temporary disable status');
        s.observations.push({ rule: 'temporary negation resets in End Phase', beforeStatus: before, afterStatus: after });
      }
      s.observations.push({ rule: 'target validity checked at resolution; hand cost remains paid', flipTarget });
    }, (s, request, prompt) => {
      if (prompt.type === s.C.OcgMessageType.SELECT_CHAIN) {
        if (flipTarget && s.chain([97268402]).length && !s.chain([14087893]).length) {
          const index = prompt.selects.findIndex(card => card.code === 14087893); if (index >= 0) return index;
        }
        const index = prompt.selects.findIndex(card => card.code === 97268402); return index >= 0 ? index : prompt.forced ? 0 : null;
      }
      if (prompt.type === s.C.OcgMessageType.SELECT_CARD && prompt.selects.some(card => card.code === 62962630)) {
        if (prompt.player === 1) {
          assert.equal(s.has(1, 16, 97268402), true);
          s.observations.push({ rule: 'Veiler hand-to-GY cost paid before selecting its target', paid: true });
        }
        return s.chooseCards(prompt, [62962630]);
      }
    });
  }

  await scenario('aluber-once-use-survives-activation-negation-and-resets-next-turn', s => {
    s.add(62962630, 0, 2).add(83764718, 0, 2).add(53129443, 0, 2).add(97077563, 0, 8, 0, 8)
      .add(36637374, 0, 1).add(49010598, 1, 8, 0, 8).add(83011277, 1, 2);
  }, async s => {
    await s.action('summon', 62962630);
    assert.ok(s.messages.some(message => message.type === s.C.OcgMessageType.CHAIN_NEGATED));
    assert.equal(s.has(0, 16, 62962630), true); assert.equal(s.has(1, 16, 83011277), true);
    await s.action('activate', 83764718);
    assert.equal(s.has(0, 4, 62962630), true); assert.equal(s.has(0, 2, 36637374), false);
    assert.equal(s.chain([62962630]).length, 1, 'Only-use count stays consumed after a negated activation');
    await s.end(); await s.end();
    await s.action('activate', 53129443); await s.action('activate', 97077563);
    assert.equal(s.chain([62962630]).length, 2); assert.equal(s.has(0, 2, 36637374), true);
    s.observations.push({ rule: 'only use once per turn includes negated activations and resets on the next turn',
      firstTurnActivations: 1, revivedSameTurnHasNoNewTrigger: true, nextOwnTurnSearchResolved: true });
  }, (s, request, prompt) => {
    if (prompt.type === s.C.OcgMessageType.SELECT_CHAIN) {
      const index = prompt.selects.findIndex(card => card.code === 49010598);
      return index >= 0 ? index : prompt.selects.some(card => card.code === 62962630)
        ? prompt.selects.findIndex(card => card.code === 62962630) : prompt.forced ? 0 : null;
    }
    if (prompt.type === s.C.OcgMessageType.SELECT_CARD && prompt.selects.some(card => card.code === 62962630))
      return s.chooseCards(prompt, [62962630]);
  });

  const paths = ['src/core/native/NativeDuelDecisions.js', 'src/core/native/NativeChainDecisionInfo.js',
    'src/core/native/NativeDuelRuntime.js', 'scripts/audit-tcg-chain-complete.mjs',
    'src/core/native/NativeCardData.js', 'scripts/native-field-audit-inputs.mjs', 'scripts/native-field-audit-harness.mjs',
    'src/core/native/vendor/ocgcore/index.js', 'public/native/card-data.json', 'public/native/scripts.json',
    'public/native/core-build.json', 'public/native/ocgcore.sync.wasm',
    'src/core/native/vendor/ocgcore/upstream-source/src/messages.ts',
    'src/core/native/vendor/ocgcore/upstream-source/src/responses.ts',
    'src/core/native/vendor/ocgcore/upstream-source/src/type_core.ts'];
  const sourceFiles = await Promise.all(paths.map(async path => {
    const bytes = await readFile(new URL(`../${path}`, import.meta.url)); return { path, bytes: bytes.length, sha256: hash(bytes) };
  }));
  return { date: '2026-10-08', executedAtUtc: new Date().toISOString(), ok: true,
    scope: 'Seventeen real native TCG chain/timing paths; no assertion that every card interaction has been enumerated.',
    counts: { scenarios: scenarios.length, passed: scenarios.filter(item => item.ok).length,
      nativeResponses: scenarios.reduce((sum, item) => sum + item.typedDecisions.length, 0),
      translatedUiChoices: scenarios.reduce((sum, item) => sum + item.uiDecisions.length, 0) },
    fixturePolicy: { beforeStartOnly: true, postStartInjection: false, scriptMutation: false,
      testMode: false, shortMidDuelFixturesNotDeckLegalityEvidence: true,
      flags: ['MODE_MR5', 'TCG_SEGOC_NONPUBLIC', 'TCG_SEGOC_FIRSTTRIGGER'],
      fixtureCopiesPerControllerAtMostThree: true }, nativeApi: core.getVersion(), nativeBuild: clone(inputs.coreBuild),
    sourceFiles, scenarios };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await auditTcgChainComplete();
  await mkdir(new URL('.', TCG_CHAIN_COMPLETE_REPORT), { recursive: true });
  await writeFile(TCG_CHAIN_COMPLETE_REPORT, `${json(report)}\n`);
  console.log(json({ ok: report.ok, counts: report.counts, reportPath: TCG_CHAIN_COMPLETE_REPORT.pathname }));
}
