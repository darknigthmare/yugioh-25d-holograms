import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { loadNativeAuditInputs } from '../scripts/audit-native-field-runtime.mjs';
import { createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';
import { chooseNativeAIResponse, resolveNativeDuelPrompt, translateNativePrompt,
  validateNativeDuelResponse, nativeSelectablePlaces } from '../src/core/native/NativeDuelDecisions.js';

// Every card, effect and helper is loaded unchanged from the public archive.
// Starting board fixtures use ordinary duelNewCard before startDuel; there is no
// Debug script, custom effect, post-start injection or test-mode flag.
const inputs = await loadNativeAuditInputs();
const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
const metadata = inputs.resources.metadata;
const evidence = [];
const sha256 = source => createHash('sha256').update(source).digest('hex');
after(async () => {
  await writeFile(new URL('../docs/audits/artifacts/native-choice-continuation-2026-10-07/native-protocol.json', import.meta.url),
    JSON.stringify({ ok: evidence.every(scenario => scenario.ok), coreBuild: inputs.coreBuild,
      coreWasmSha256: sha256(new Uint8Array(inputs.initializer.wasmBinary)), scenarios: evidence },
    (_, value) => typeof value === 'bigint' ? String(value) : value, 2) + '\n');
});

async function session(setup) {
  const duel = await createNativeDuelRuntime({ ...inputs.resources, coreModule: inputs.coreModule,
    createCore: () => core, seed: [1n, 2n, 3n, 4n],
    flags: inputs.coreModule.OcgDuelMode.MODE_MR5 | inputs.coreModule.OcgDuelMode.TCG_SEGOC_NONPUBLIC
      | inputs.coreModule.OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER,
    team1: { startingDrawCount: 0, drawCountPerTurn: 0 },
    team2: { startingDrawCount: 0, drawCountPerTurn: 0 } });
  const C = duel.constants, M = C.OcgMessageType, R = C.OcgResponseType;
  const s = { duel, C, M, R, messages: [], prompts: [], requests: [], fixture: [], responses: [],
    add(code, controller, location, sequence = 0, position = null) {
      const sourceCode = inputs.resources.canonicalCodeToSource?.get(code) ?? code;
      const script = inputs.resources.scripts.get(`c${sourceCode}.lua`);
      this.fixture.push({ code, sourceCode, controller, location, sequence,
        name: metadata.get(sourceCode)?.name, scriptSha256: script ? sha256(script) : null });
      duel.addCard({ code, controller, location, sequence, position: position
        ?? ([C.OcgLocation.HAND, C.OcgLocation.DECK, C.OcgLocation.EXTRA].includes(location)
          ? C.OcgPosition.FACEDOWN_DEFENSE : C.OcgPosition.FACEUP_ATTACK) }); return this;
    },
    decks() {
      this.add(89631139, 0, C.OcgLocation.DECK).add(46986414, 1, C.OcgLocation.DECK); return this;
    },
    advance() {
      const result = duel.advance();
      this.messages.push(...result.messages);
      assert.ok(!result.messages.some(message => message.type === M.RETRY), 'The native core rejected a translated response');
      assert.deepEqual(duel.errors, [], 'An archived official script produced a Lua error');
      return result;
    },
    query(controller, location) {
      return duel.queryLocation({ controller, location, flags: C.OcgQueryFlags.CODE | C.OcgQueryFlags.POSITION
        | C.OcgQueryFlags.TYPE | C.OcgQueryFlags.LEVEL | C.OcgQueryFlags.RACE | C.OcgQueryFlags.ATTRIBUTE
        | C.OcgQueryFlags.ATTACK | C.OcgQueryFlags.DEFENSE | C.OcgQueryFlags.COUNTERS }).filter(Boolean);
    },
    async answer(prompt, choose) {
      this.prompts.push(prompt);
      const ai = chooseNativeAIResponse(prompt, { constants: C, metadata,
        cardReader: duel.options.cardReader, isCardDeclarable: duel.isCardDeclarable.bind(duel) });
      const response = await resolveNativeDuelPrompt({ prompt, runtime: duel, side: 'player', metadata,
        isPublicCard: reference => this.isPublicCard?.(reference) === true,
        onDecision: request => {
          this.requests.push(request);
          const selected = choose?.(request, prompt);
          if (selected !== undefined) return selected;
          if (request.choices) {
            if (request.nativeKind === 'SELECT_CHAIN') return prompt.forced ? 0 : null;
            return request.choices[0].value;
          }
          if (ai?.indicies) return ai.indicies.map(String);
          if (ai?.places) {
            const all = nativeSelectablePlaces(prompt);
            return ai.places.map(place => String(all.findIndex(candidate => candidate.player === place.player
              && candidate.location === place.location && candidate.sequence === place.sequence)));
          }
          return request.candidates.slice(0, request.minimum).map(card => card.uid);
        } });
      assert.ok(response, `No translated response for actual native prompt ${prompt.type}`);
      assert.equal(validateNativeDuelResponse(prompt, response, { constants: C, metadata,
        cardReader: duel.options.cardReader, isCardDeclarable: duel.isCardDeclarable.bind(duel) }), true);
      // Evidence records typed decisions and quantities, never hidden card
      // identities from a prompt or a queried opposing hand/Deck.
      this.responses.push({ promptType: prompt.type,
        nativeKind: this.requests.at(-1)?.nativeKind, player: prompt.player,
        count: prompt.count, min: prompt.min, max: prompt.max,
        options: [M.SELECT_OPTION, M.ANNOUNCE_NUMBER].includes(prompt.type) ? prompt.options : undefined,
        response });
      duel.respond(response);
      return response;
    },
    async idle(choose, commandType = M.SELECT_IDLECMD) {
      for (let step = 0; step < 160; step += 1) {
        const result = this.advance();
        assert.notEqual(result.status, C.OcgProcessResult.END, 'Duel unexpectedly ended');
        if (result.prompt?.type === commandType) return result.prompt;
        assert.ok(result.prompt, 'Expected a native decision or action menu');
        await this.answer(result.prompt, choose);
      }
      throw new Error('Official script decision budget exceeded');
    },
    async action(kind, code, choose) {
      const prompt = await this.idle();
      const [list, action] = kind === 'summon' ? [prompt.summons, C.SelectIdleCMDAction.SELECT_SUMMON]
        : kind === 'special' ? [prompt.special_summons, C.SelectIdleCMDAction.SELECT_SPECIAL_SUMMON]
          : [prompt.activates, C.SelectIdleCMDAction.SELECT_ACTIVATE];
      const index = list.findIndex(card => card.code === code);
      assert.ok(index >= 0, `Native ${kind} command missing for ${code}`);
      duel.respond({ type: R.SELECT_IDLECMD, action, index });
      return this.idle(choose);
    },
    async endTurn(choose) {
      const prompt = await this.idle(); assert.equal(prompt.to_ep, true);
      duel.respond({ type: R.SELECT_IDLECMD, action: C.SelectIdleCMDAction.TO_EP, index: null });
      return this.idle(choose);
    },
    seen(kind) { return this.prompts.filter(prompt => prompt.type === M[kind]); }
  };
  setup(s);
  duel.start();
  return s;
}

async function run(setup, exercise) {
  const s = await session(setup);
  let ok = false;
  try { await exercise(s); assert.deepEqual(s.duel.errors, []); ok = true; }
  finally {
    evidence.push({ ok, fixture: s.fixture, decisions: s.responses,
      luaErrors: s.duel.errors, retryCount: s.messages.filter(message => message.type === s.M.RETRY).length });
    s.duel.close();
  }
}

const selectedCodes = (prompt, codes) => prompt.selects.map((card, index) => codes.includes(card.code) ? String(index) : null).filter(value => value !== null);

test('Hazy Flame Sphynx offers distinct native Monster/Spell/Trap declarations and resolves the chosen kind', async () => {
  await run(s => s.add(1409474, 0, 4).add(34460851, 0, 2).decks(), async s => {
    await s.action('activate', 1409474, (request, prompt) => {
      if (prompt.type !== s.M.SELECT_OPTION) return undefined;
      assert.deepEqual(prompt.options, [70n, 71n, 72n]);
      assert.deepEqual(request.choices.map(choice => choice.label), ['MONSTRE', 'MAGIE', 'PIÈGE']);
      return 0;
    });
    assert.equal(s.seen('SELECT_OPTION').length, 1);
    assert.equal(s.query(0, 16).some(card => card.code === 89631139), true);
    assert.equal(s.query(0, 4).some(card => card.code === 34460851), true);
  });
});

for (const [index, topCode, label] of [[1, 22702055, 'MAGIE'], [2, 44095762, 'PIÈGE']]) {
  test(`Hazy Flame Sphynx really accepts index ${index} for ${label} and performs its matching native summon`, async () => {
    await run(s => s.add(1409474, 0, 4).add(34460851, 0, 2).add(topCode, 0, 1).add(46986414, 1, 1), async s => {
      await s.action('activate', 1409474, (request, prompt) => {
        if (prompt.type !== s.M.SELECT_OPTION) return undefined;
        assert.equal(request.choices[index].label, label); return index;
      });
      assert.equal(s.seen('SELECT_OPTION').length, 1);
      assert.equal(s.query(0, 16)[0].code, topCode);
      assert.equal(s.query(0, 4).some(card => card.code === 34460851), true);
      assert.equal(s.query(0, 2).length, 0);
    });
  });
}

test('Array of Revealing Light keeps a newly Summoned declared Dragon out of the real battle commands', async () => {
  await run(s => s.add(69296555, 0, 2).add(31553716, 0, 2).add(26202165, 0, 4).decks(), async s => {
    await s.action('activate', 69296555, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_RACE) return undefined;
      assert.ok(request.candidates.some(card => card.name === 'Illusion'));
      assert.equal(request.candidates.every(card => card.label === card.name), true);
      return [request.candidates.find(card => card.name === 'Dragon').uid];
    });
    assert.equal(s.seen('ANNOUNCE_RACE').length, 1);
    await s.endTurn(); await s.endTurn();
    const main = await s.action('summon', 31553716);
    s.duel.respond({ type: s.R.SELECT_IDLECMD, action: s.C.SelectIdleCMDAction.TO_BP, index: null });
    const battle = await s.idle(undefined, s.M.SELECT_BATTLECMD);
    assert.equal(battle.attacks.some(card => card.code === 31553716), false);
    assert.equal(battle.attacks.some(card => card.code === 26202165), true);
    assert.equal(main.to_bp, true);
    assert.equal(s.duel.queryField().players[0].lp, 8000);
  });
});

for (const position of [1, 4]) test(`The Hidden City really offers both face-up positions and reveals its chosen monster in position ${position}`, async () => {
  await run(s => s.add(5697558, 0, 2).add(39581190, 0, 4, 0, 8).decks(), async s => {
    await s.action('activate', 5697558);
    await s.action('activate', 5697558, (request, prompt) => {
      if (prompt.type !== s.M.SELECT_POSITION) return undefined;
      assert.deepEqual(request.choices.map(choice => choice.value), [1, 4]);
      assert.equal(translateNativePrompt(prompt, { constants: s.C }).toResponse(8), null);
      return position;
    });
    assert.equal(s.seen('SELECT_POSITION').length, 1);
    assert.equal(s.query(0, 4)[0].code, 39581190);
    assert.equal(s.query(0, 4)[0].position, position);
    assert.ok(s.messages.some(message => message.type === s.M.POS_CHANGE && message.code === 39581190));
    assert.equal(s.messages.some(message => message.type === s.M.FLIPSUMMONING), false);
  });
});

test('Adamancipator Laputite selects a proper subset then puts only those real cards on the ordered Deck top', async () => {
  const chosen = [10286023, 47897376, 74891384];
  await run(s => {
    s.add(46552140, 0, 2);
    for (const code of [...chosen, 85914562, 89631139]) s.add(code, 0, 1);
    s.add(46986414, 1, 1);
  }, async s => {
    await s.action('activate', 46552140);
    const clicks = [2, 0, 1], top = [];
    await s.action('activate', 46552140, (request, prompt) => {
      if (prompt.type === s.M.SELECT_CARD) {
        assert.equal(prompt.min, 1); assert.equal(prompt.max, 5);
        return selectedCodes(prompt, chosen);
      }
      if (prompt.type === s.M.SELECT_UNSELECT_CARD) {
        if (prompt.unselect_cards.length === chosen.length && prompt.can_finish) return null;
        return prompt.select_cards.findIndex(card => chosen.includes(card.code));
      }
      if (prompt.type !== s.M.SORT_CARD) return undefined;
      assert.equal(prompt.cards.length, 3);
      const index = clicks.shift(); top.push(prompt.cards[index].code); return index;
    });
    assert.equal(s.seen('SORT_CARD').length, 1);
    assert.deepEqual(s.query(0, 1).map(card => card.code).reverse().slice(0, 3), top);
    assert.deepEqual([...top].sort(), [...chosen].sort());
    assert.equal(s.query(0, 1).length, 5);
    assert.equal(s.query(0, 2).length, 0);
  });
});

test('Way Where There’s a Will announces three by index, keeps the chosen excavation and orders the real Deck bottom', async () => {
  await run(s => {
    s.add(91880660, 0, 2).add(26202165, 0, 2);
    for (const code of [89631139, 46986414, 83011277, 17444133]) s.add(code, 0, 1);
    for (const [sequence, code] of [89631139, 46986414, 83011277].entries()) s.add(code, 1, 4, sequence);
    s.add(46986414, 1, 1);
  }, async s => {
    await s.action('activate', 91880660);
    let kept = null; const bottom = [], order = [1, 2, 0];
    await s.action('activate', 91880660, (request, prompt) => {
      if (prompt.type === s.M.ANNOUNCE_NUMBER) {
        assert.deepEqual(request.choices.map(choice => choice.label), ['1', '2', '3']); return 2;
      }
      if (prompt.type === s.M.SELECT_CARD) {
        if (prompt.selects[0].location === 1) { kept = prompt.selects[0].code; return ['0']; }
        return selectedCodes(prompt, [26202165]);
      }
      if (prompt.type !== s.M.SORT_CARD) return undefined;
      assert.equal(prompt.cards.length, 3);
      const index = order.shift(); bottom.push(prompt.cards[index].code); return index;
    });
    assert.equal(s.seen('ANNOUNCE_NUMBER').length, 1);
    assert.equal(s.seen('SORT_CARD').length, 1);
    assert.deepEqual(s.query(0, 2).map(card => card.code), [kept]);
    assert.deepEqual(s.query(0, 1).map(card => card.code).slice(0, 3), [...bottom].reverse());
    assert.equal(s.query(0, 1).length, 4);
  });
});

test('Materiactor Meltthrough preserves all six excavated cards and the human’s nontrivial native top order', async () => {
  await run(s => {
    s.add(66059345, 0, 2);
    for (const code of [89631139, 46986414, 83011277, 17444133, 70781052, 97590747]) s.add(code, 0, 1);
    s.add(46986414, 1, 1);
  }, async s => {
    const before = s.query(0, 1).map(card => card.code), clicks = [5, 1, 4, 0, 3, 2], top = [];
    await s.action('activate', 66059345, (request, prompt) => {
      if (prompt.type !== s.M.SORT_CARD) return undefined;
      assert.equal(prompt.cards.length, 6);
      const index = clicks.shift(); top.push(prompt.cards[index].code);
      assert.equal(request.choices.length, 7 - top.length); return index;
    });
    assert.equal(s.seen('SORT_CARD').length, 1);
    assert.deepEqual(s.query(0, 1).map(card => card.code).reverse(), top);
    assert.deepEqual([...top].sort(), [...before].sort());
    assert.equal(s.query(0, 16).length, 0);
  });
});

test('Doll House selects two native Graveyard/Deck pairs and summons both as Level 6 DARK without moving the targets', async () => {
  const paired = [32012841, 67284908];
  await run(s => {
    s.add(67331360, 0, 2).add(75574498, 0, 4);
    for (const code of paired) s.add(code, 0, 16).add(code, 0, 1);
    s.add(89631139, 0, 1).add(46986414, 1, 1);
  }, async s => {
    await s.action('activate', 67331360);
    await s.action('activate', 67331360, (request, prompt) => {
      if (prompt.type === s.M.SELECT_CARD) return selectedCodes(prompt, paired);
      if (prompt.type !== s.M.SELECT_UNSELECT_CARD) return undefined;
      assert.ok(request.choices.some(choice => /^AJOUTER/.test(choice.label)) || prompt.can_finish);
      if (prompt.unselect_cards.length === 2 && prompt.can_finish) return null;
      return prompt.select_cards.findIndex(card => paired.includes(card.code));
    });
    assert.ok(s.seen('SELECT_UNSELECT_CARD').length >= 2);
    const summoned = s.query(0, 4).filter(card => paired.includes(card.code));
    assert.equal(summoned.length, 2);
    assert.equal(summoned.every(card => card.level === 6 && card.attribute === s.C.OcgAttribute.DARK), true);
    assert.deepEqual(s.query(0, 16).map(card => card.code).sort(), [...paired].sort());
    assert.deepEqual(s.query(0, 1).map(card => card.code), [89631139]);
  });
});

test('Miracle Restoring allocates zero then two across actual Power Stone holders before its revival target', async () => {
  await run(s => s.add(34029630, 0, 8, 0, 8).add(34029630, 0, 8, 1, 8)
    .add(68334074, 0, 8, 2, 8).add(46986414, 0, 16).decks(), async s => {
    const decline = (request, prompt) => prompt.type === s.M.SELECT_EFFECTYN ? false : undefined;
    await s.action('activate', 34029630, decline); await s.action('activate', 34029630, decline);
    assert.deepEqual(s.query(0, 8).filter(card => card.code === 34029630).map(card => card.counters[1]), [3, 3]);
    const paid = [];
    await s.action('activate', 68334074, (request, prompt) => {
      if (prompt.type === s.M.SELECT_COUNTER) {
        assert.equal(prompt.count, 2); assert.equal(prompt.cards.length, 2);
        const value = paid.length ? 2 : 0;
        assert.ok(request.choices.some(choice => choice.value === value)); paid.push(value); return value;
      }
      if (prompt.type === s.M.SELECT_CARD) {
        assert.equal(s.query(0, 8).filter(card => card.code === 34029630).reduce((sum, card) => sum + card.counters[1], 0), 4);
      }
      return undefined;
    });
    assert.deepEqual(paid, [0, 2]);
    assert.equal(s.seen('SELECT_COUNTER').length, 1);
    assert.equal(s.query(0, 4)[0].code, 46986414);
    assert.deepEqual(s.query(0, 8).filter(card => card.code === 34029630).map(card => card.counters[1]).sort(), [1, 3]);
  });
});

test('Herald of the Abyss pays 1500 then makes the opponent send only the declared public Dragon LIGHT', async () => {
  await run(s => s.add(94016752, 0, 2).add(89631139, 1, 4).add(46986414, 1, 4, 1).decks(), async s => {
    await s.action('activate', 94016752, (request, prompt) => {
      if (prompt.type === s.M.ANNOUNCE_RACE) {
        assert.equal(s.duel.queryField().players[0].lp, 6500);
        return [request.candidates.find(card => card.name === 'Dragon').uid];
      }
      if (prompt.type === s.M.ANNOUNCE_ATTRIB) return [request.candidates.find(card => card.name === 'LUMIÈRE').uid];
      if (prompt.type === s.M.SELECT_CARD) {
        assert.equal(prompt.player, 1); assert.deepEqual(prompt.selects.map(card => card.code), [89631139]);
      }
      return undefined;
    });
    assert.equal(s.seen('ANNOUNCE_RACE').length, 1); assert.equal(s.seen('ANNOUNCE_ATTRIB').length, 1);
    assert.deepEqual(s.query(1, 4).map(card => card.code), [46986414]);
    assert.equal(s.query(1, 16)[0].code, 89631139);
    assert.equal(s.duel.queryField().players[0].lp, 6500);
  });
});

test('DNA Checkup requests two different attributes from the opponent and draws for the correct player after reveal', async () => {
  await run(s => {
    s.add(27340877, 0, 8, 0, 8).add(89631139, 0, 4, 0, 8);
    for (const code of [46986414, 83011277, 97590747]) s.add(code, 0, 1);
    s.add(46986414, 1, 1);
  }, async s => {
    await s.action('activate', 27340877, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_ATTRIB) return undefined;
      assert.equal(prompt.player, 1); assert.equal(prompt.count, 2);
      assert.equal(request.candidates.every(card => card.label === card.name), true);
      const earth = request.candidates.find(card => card.name === 'TERRE').uid;
      const water = request.candidates.find(card => card.name === 'EAU').uid;
      const descriptor = translateNativePrompt(prompt, { constants: s.C });
      assert.equal(descriptor.toResponse([earth]), null);
      assert.equal(descriptor.toResponse([earth, earth]), null);
      return [earth, water];
    });
    assert.equal(s.seen('ANNOUNCE_ATTRIB').length, 1);
    assert.equal(s.query(0, 2).length, 2); assert.equal(s.query(1, 2).length, 0);
    assert.equal(s.query(0, 4)[0].position, 8);
    assert.ok(s.messages.some(message => message.type === s.M.CONFIRM_CARDS));
    assert.ok(s.messages.some(message => message.type === s.M.DRAW && message.player === 0 && message.drawn.length === 2));
  });
});
