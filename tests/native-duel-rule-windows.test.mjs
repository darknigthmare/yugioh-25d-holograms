import test from 'node:test';
import assert from 'node:assert/strict';
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

async function session(setup) {
  const duel = await createNativeDuelRuntime({ ...inputs.resources, coreModule: inputs.coreModule,
    createCore: () => core, seed: [1n, 2n, 3n, 4n],
    flags: inputs.coreModule.OcgDuelMode.MODE_MR5 | inputs.coreModule.OcgDuelMode.TCG_SEGOC_NONPUBLIC
      | inputs.coreModule.OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER,
    team1: { startingDrawCount: 0, drawCountPerTurn: 0 },
    team2: { startingDrawCount: 0, drawCountPerTurn: 0 } });
  const C = duel.constants, M = C.OcgMessageType, R = C.OcgResponseType;
  const s = { duel, C, M, R, messages: [], prompts: [], requests: [],
    add(code, controller, location, sequence = 0, position = null) {
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
  try { await exercise(s); assert.deepEqual(s.duel.errors, []); }
  finally { s.duel.close(); }
}

const selectedCodes = (prompt, codes) => prompt.selects.map((card, index) => codes.includes(card.code) ? String(index) : null).filter(value => value !== null);

test('Prohibition declares a real catalogue identity and the core removes its legal summon command', async () => {
  await run(s => s.add(43711255, 0, 2).add(46986414, 0, 2).add(89631139, 0, 4).add(89631139, 0, 4, 1).decks(), async s => {
    const initial = await s.idle(); assert.ok(initial.summons.some(card => card.code === 46986414));
    const after = await s.action('activate', 43711255, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_CARD) return undefined;
      assert.equal(request.searchable, true);
      assert.ok(request.choices.some(choice => choice.value === 46986414));
      const translated = translateNativePrompt(prompt, { constants: s.C, metadata, cardReader: s.duel.options.cardReader });
      assert.equal(translated.toResponse(0), null);
      assert.equal(translated.toResponse(99999999), null);
      return 46986414;
    });
    assert.equal(s.seen('ANNOUNCE_CARD').length, 1);
    assert.equal(after.summons.some(card => card.code === 46986414), false);
    assert.equal(s.query(0, 2).some(card => card.code === 46986414), true);
  });
});

test('DNA Surgery race announcement preserves the full native Dragon mask for both players', async () => {
  await run(s => s.add(74701381, 0, 8, 0, 8).add(46986414, 0, 4).add(83011277, 1, 4).decks(), async s => {
    await s.action('activate', 74701381, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_RACE) return undefined;
      const dragon = request.candidates.find(card => card.name === 'Dragon'); assert.ok(dragon);
      return [dragon.uid];
    });
    assert.equal(s.seen('ANNOUNCE_RACE').length, 1);
    assert.equal(s.query(0, 4)[0].race, s.C.OcgRace.DRAGON);
    assert.equal(s.query(1, 4)[0].race, s.C.OcgRace.DRAGON);
  });
});

test('DNA Transplant attribute announcement changes both monsters after its real chain resolves', async () => {
  await run(s => s.add(56769674, 0, 8, 0, 8).add(89631139, 0, 4).add(83011277, 1, 4).decks(), async s => {
    await s.action('activate', 56769674, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_ATTRIB) return undefined;
      return [request.candidates.find(card => card.name === 'FEU').uid];
    });
    assert.equal(s.seen('ANNOUNCE_ATTRIB').length, 1);
    assert.equal(s.query(0, 4)[0].attribute, s.C.OcgAttribute.FIRE);
    assert.equal(s.query(1, 4)[0].attribute, s.C.OcgAttribute.FIRE);
  });
});

test('Wall of Revealing Light pays the announced number by index before the chain response window', async () => {
  await run(s => s.add(17078030, 0, 8, 0, 8).add(89631139, 1, 4).decks(), async s => {
    let checkedCost = false;
    await s.action('activate', 17078030, (request, prompt) => {
      if (prompt.type === s.M.ANNOUNCE_NUMBER) {
        assert.deepEqual(request.choices.slice(0, 3).map(choice => choice.label), ['1000', '2000', '3000']);
        assert.equal(translateNativePrompt(prompt, { constants: s.C }).toResponse(3000), null);
        return 2;
      }
      if (prompt.type === s.M.SELECT_CHAIN) {
        assert.equal(s.duel.queryField().players[0].lp, 5000); checkedCost = true;
      }
      return undefined;
    });
    assert.equal(checkedCost, true);
    assert.equal(s.duel.queryField().players[0].lp, 5000);
    assert.equal(s.seen('ANNOUNCE_NUMBER').length, 1);
  });
});

test('Spellbook Organization click order maps original indices to ranks and really reorders the Deck', async () => {
  await run(s => {
    s.add(96677818, 0, 2).add(46986414, 0, 1).add(83011277, 0, 1).add(89631139, 0, 1);
    s.add(46986414, 1, 1);
  }, async s => {
    const before = s.query(0, 1).map(card => card.code), clicks = [2, 0, 1];
    const expectedTopOrder = [];
    await s.action('activate', 96677818, (request, prompt) => {
      if (prompt.type !== s.M.SORT_CARD) return undefined;
      const index = clicks.shift(); expectedTopOrder.push(prompt.cards[index].code);
      assert.ok(request.choices.some(choice => choice.value === index)); return index;
    });
    assert.equal(s.seen('SORT_CARD').length, 1);
    assert.deepEqual(s.query(0, 1).map(card => card.code).reverse(), expectedTopOrder);
    assert.deepEqual([...s.query(0, 1).map(card => card.code)].sort(), [...before].sort());
  });
});

test('Kaiser Sea Horse supplies two LIGHT Tributes while the other offered monster stays on the field', async () => {
  await run(s => s.add(89631139, 0, 2).add(17444133, 0, 4).add(83011277, 0, 4, 1).decks(), async s => {
    await s.action('summon', 89631139, (request, prompt) => {
      if (prompt.type !== s.M.SELECT_TRIBUTE) return undefined;
      const indices = selectedCodes(prompt, [17444133]);
      assert.equal(prompt.selects[Number(indices[0])].release_param, 2);
      assert.equal(request.validateSelection(selectedCodes(prompt, [83011277])), false);
      assert.equal(request.validateSelection(indices), true);
      return indices;
    });
    assert.equal(s.seen('SELECT_TRIBUTE').length, 1);
    assert.deepEqual(s.query(0, 4).map(card => card.code).sort(), [83011277, 89631139]);
    assert.equal(s.query(0, 16).some(card => card.code === 17444133), true);
  });
});

test('Tokusano Shinkyojin validates an exact Level sum and sends cost cards before any chain response', async () => {
  await run(s => {
    s.add(50357013, 0, 2).add(70781052, 0, 2).add(83011277, 0, 2).add(89631139, 0, 2);
    for (const code of [89631139, 46986414, 83011277, 17444133]) s.add(code, 0, 1);
    s.add(46986414, 1, 1);
  }, async s => {
    let paidBeforeChain = false;
    await s.action('activate', 50357013, (request, prompt) => {
      if (prompt.type === s.M.SELECT_SUM) {
        assert.equal(prompt.select_max, 0);
        assert.equal(prompt.amount, 10);
        const selected = selectedCodes(prompt, [70781052, 83011277]);
        assert.equal(request.validateSelection(selected), true);
        assert.equal(request.validateSelection(selectedCodes(prompt, [89631139])), false);
        assert.equal(request.validateSelection(selectedCodes(prompt, [70781052, 83011277, 89631139])), false);
        return selected;
      }
      if (prompt.type === s.M.SELECT_CHAIN && !paidBeforeChain) {
        assert.deepEqual(s.query(0, 16).map(card => card.code).sort(), [70781052, 83011277]);
        paidBeforeChain = true;
      }
      return undefined;
    });
    assert.equal(s.seen('SELECT_SUM').length, 1);
    assert.equal(paidBeforeChain, true);
    assert.equal(s.query(0, 2).length, 3); // Remaining Blue-Eyes plus two actual draws.
    assert.ok(s.messages.some(message => message.type === s.M.DRAW && message.player === 0 && message.drawn.length === 2));
  });
});

test('Machina Fortress accepts a minimal greater Level sum and rejects an unnecessary extra discard', async () => {
  await run(s => s.add(5556499, 0, 2).add(77585513, 0, 2).add(70095154, 0, 2).add(3657444, 0, 2).decks(), async s => {
    await s.action('special', 5556499, (request, prompt) => {
      if (prompt.type !== s.M.SELECT_SUM) return undefined;
      assert.equal(prompt.select_max, 1);
      assert.equal(prompt.amount, 8);
      const selected = selectedCodes(prompt, [77585513, 70095154]);
      assert.equal(request.validateSelection(selected), true);
      assert.equal(request.validateSelection(selectedCodes(prompt, [77585513, 70095154, 3657444])), false);
      assert.equal(request.validateSelection(selectedCodes(prompt, [77585513])), false);
      return selected;
    });
    assert.equal(s.seen('SELECT_SUM').length, 1);
    assert.equal(s.query(0, 4)[0].code, 5556499);
    assert.deepEqual(s.query(0, 16).map(card => card.code).sort(), [70095154, 77585513]);
    assert.deepEqual(s.query(0, 2).map(card => card.code), [3657444]);
  });
});

for (const [announcedIndex, summoned] of [[3, false], [2, true]]) {
  test(`Reasoning makes the opponent announce Level ${announcedIndex + 1} and ${summoned ? 'summons' : 'sends'} the excavated Level 4`, async () => {
    await run(s => s.add(58577036, 0, 2).add(46986414, 0, 1).add(83011277, 0, 1).add(46986414, 1, 1), async s => {
      await s.action('activate', 58577036, (request, prompt) => {
        if (prompt.type !== s.M.ANNOUNCE_NUMBER) return undefined;
        assert.equal(prompt.player, 1);
        assert.equal(request.choices[announcedIndex].label, String(announcedIndex + 1));
        return announcedIndex;
      });
      assert.equal(s.seen('ANNOUNCE_NUMBER').length, 1);
      assert.equal(s.query(0, 4).some(card => card.code === 83011277), summoned);
      assert.equal(s.query(0, 16).some(card => card.code === 83011277), !summoned);
      assert.equal(s.query(0, 1).length, 1);
    });
  });
}

test('Defender distributes a real destruction replacement cost across native Spell Counter holders', async () => {
  await run(s => {
    s.add(2525268, 0, 2).add(70791313, 0, 4).add(70791313, 0, 4, 1);
    s.add(43711255, 0, 2).add(22702055, 0, 2).add(53129443, 0, 2).decks();
  }, async s => {
    await s.action('summon', 2525268);
    await s.action('activate', 43711255, (request, prompt) => prompt.type === s.M.ANNOUNCE_CARD ? 46986414 : undefined);
    await s.action('activate', 22702055); // Umi resolves and puts the second counter on each Library.
    assert.equal(s.query(0, 4).filter(card => card.code === 70791313).every(card => card.counters[1] === 2), true);
    const paid = [];
    await s.action('activate', 53129443, (request, prompt) => {
      if (prompt.type === s.M.SELECT_EFFECTYN) {
        assert.equal(prompt.code, 2525268); return true;
      }
      if (prompt.type === s.M.SELECT_COUNTER) {
        assert.equal(prompt.count, 3);
        assert.equal(prompt.cards.length, 3);
        // Sequential choices expose only allocations that can still reach 3.
        const value = request.choices.at(-1).value; paid.push(value); return value;
      }
      return undefined;
    });
    assert.equal(s.seen('SELECT_COUNTER').length, 1);
    assert.equal(paid.reduce((sum, count) => sum + count, 0), 3);
    assert.deepEqual(s.query(0, 4).map(card => card.code).sort(), [2525268, 70791313, 70791313]);
    assert.equal(s.query(0, 16).some(card => [2525268, 70791313].includes(card.code)), false);
    assert.ok(s.messages.some(message => message.type === s.M.REMOVE_COUNTER));
  });
});

test('simultaneous mandatory Sangan and Witch effects cannot pass priority and resolve in the chosen chain order', async () => {
  await run(s => {
    s.add(53129443, 0, 2).add(26202165, 0, 4).add(78010363, 0, 4, 1);
    s.add(83011277, 0, 1).add(3657444, 0, 1).add(89631139, 0, 1).add(46986414, 1, 1);
  }, async s => {
    await s.action('activate', 53129443, (request, prompt) => {
      if (prompt.type === s.M.SELECT_CHAIN && prompt.forced) {
        assert.equal(request.required, true);
        assert.equal(request.choices.some(choice => choice.value === null), false);
        assert.equal(translateNativePrompt(prompt, { constants: s.C, metadata }).toResponse(null), null);
        const witch = prompt.selects.findIndex(card => card.code === 78010363);
        return witch >= 0 ? witch : 0;
      }
      return undefined;
    });
    const forced = s.seen('SELECT_CHAIN').filter(prompt => prompt.forced);
    assert.ok(forced.length >= 1);
    const searchChain = s.messages.filter(message => message.type === s.M.CHAINING && [26202165, 78010363].includes(message.code));
    assert.deepEqual(searchChain.map(message => message.code), [78010363, 26202165]);
    assert.equal(s.query(0, 2).length, 2);
    assert.ok(s.query(0, 16).some(card => card.code === 26202165));
    assert.ok(s.query(0, 16).some(card => card.code === 78010363));
  });
});

test('the real Damage Step offers Honest, excludes Book of Moon, pays its hand cost and calculates modified battle damage', async () => {
  await run(s => s.add(89631139, 0, 4).add(46986414, 1, 4).add(37742478, 0, 2).add(14087893, 0, 2).decks(), async s => {
    await s.endTurn(); await s.endTurn();
    const main = await s.idle(); assert.equal(main.to_bp, true);
    s.duel.respond({ type: s.R.SELECT_IDLECMD, action: s.C.SelectIdleCMDAction.TO_BP, index: null });
    const battle = await s.idle(undefined, s.M.SELECT_BATTLECMD);
    const attackerIndex = battle.attacks.findIndex(card => card.code === 89631139);
    assert.ok(attackerIndex >= 0);
    s.duel.respond({ type: s.R.SELECT_BATTLECMD, action: s.C.SelectBattleCMDAction.SELECT_BATTLE, index: attackerIndex });
    let damageStepSeen = false, honestPaid = false, bookEarlierOffered = false;
    await s.idle((request, prompt) => {
      if (prompt.type !== s.M.SELECT_CHAIN) return undefined;
      const inDamageStep = s.messages.some(message => message.type === s.M.DAMAGE_STEP_START)
        && !s.messages.some(message => message.type === s.M.DAMAGE_STEP_END);
      if (!inDamageStep && prompt.selects.some(card => card.code === 14087893)) bookEarlierOffered = true;
      const honestIndex = prompt.selects.findIndex(card => card.code === 37742478);
      if (honestIndex >= 0) {
        assert.equal(inDamageStep, true);
        assert.equal(prompt.selects.some(card => card.code === 14087893), false);
        damageStepSeen = true; return honestIndex;
      }
      if (inDamageStep && damageStepSeen) {
        assert.equal(s.query(0, 16).some(card => card.code === 37742478), true);
        honestPaid = true;
      }
      return undefined;
    }, s.M.SELECT_BATTLECMD);
    assert.equal(bookEarlierOffered, true);
    assert.equal(damageStepSeen, true);
    assert.equal(honestPaid, true);
    assert.equal(s.query(0, 4)[0].attack, 5500);
    assert.equal(s.duel.queryField().players[1].lp, 5000);
    assert.equal(s.query(1, 16).some(card => card.code === 46986414), true);
    assert.equal(s.query(0, 2).some(card => card.code === 14087893), true);
    assert.ok(s.messages.some(message => message.type === s.M.DAMAGE_STEP_END));
  });
});

test('Nekroz Mirror accepts Shurit’s alternate whole Ritual Level from the real encoded sum prompt', async () => {
  await run(s => s.add(14735698, 0, 2).add(26674724, 0, 2).add(90307777, 0, 2).add(83011277, 0, 2).decks(), async s => {
    await s.action('activate', 14735698, (request, prompt) => {
      if (prompt.type === s.M.SELECT_CARD) return selectedCodes(prompt, [26674724]);
      if (prompt.type !== s.M.SELECT_SUM) return undefined;
      assert.equal(prompt.amount, 6);
      assert.equal(prompt.select_max, 0);
      const selected = selectedCodes(prompt, [90307777]);
      const weight = prompt.selects[Number(selected[0])].amount >>> 0;
      assert.deepEqual([weight & 0xffff, weight >>> 16].sort((a, b) => a - b), [3, 6]);
      assert.equal(request.validateSelection(selected), true);
      assert.equal(request.validateSelection(selectedCodes(prompt, [83011277])), false);
      assert.equal(request.validateSelection(selectedCodes(prompt, [90307777, 83011277])), false);
      return selected;
    });
    assert.equal(s.seen('SELECT_SUM').length, 1);
    assert.equal(s.query(0, 4)[0].code, 26674724);
    assert.equal(s.query(0, 16).some(card => card.code === 90307777), true);
    assert.equal(s.query(0, 2).some(card => card.code === 83011277), true);
  });
});

test('Soul Exchange labels an opposing public Tribute whose real wire reference omits position without resolving hidden cards', async () => {
  await run(s => {
    s.add(68005187, 0, 2).add(70781052, 0, 2).add(83011277, 0, 4).add(46986414, 1, 4).decks();
    s.isPublicCard = reference => {
      if (![4, 8, 32, 64].includes(reference.location)) return false;
      const card = s.query(reference.controller, reference.location)[reference.sequence];
      return Boolean(card && (card.position & 5) && !(card.position & 10));
    };
  }, async s => {
    await s.action('activate', 68005187, (request, prompt) => prompt.type === s.M.SELECT_CARD
      ? selectedCodes(prompt, [46986414]) : undefined);
    await s.action('summon', 70781052, (request, prompt) => {
      if (prompt.type !== s.M.SELECT_TRIBUTE) return undefined;
      const index = prompt.selects.findIndex(card => card.controller === 1 && card.code === 46986414);
      assert.ok(index >= 0);
      assert.equal(prompt.selects[index].position, undefined, 'The actual tribute ABI omits position');
      assert.equal(request.candidates[index].name, 'Dark Magician');
      // Without authoritative public-board evidence the same wire reference
      // remains private; a code alone never turns an unknown card into a label.
      const privateTranslation = translateNativePrompt(prompt, { constants: s.C, metadata });
      assert.equal(privateTranslation.request.candidates[index].name, 'Carte face verso');
      return selectedCodes(prompt, [46986414]);
    });
    assert.equal(s.seen('SELECT_TRIBUTE').length, 1);
    assert.deepEqual(s.query(0, 4).map(card => card.code).sort(), [70781052, 83011277]);
    assert.equal(s.query(1, 4).length, 0);
    assert.equal(s.query(1, 16).some(card => card.code === 46986414), true);
  });
});

test('public-position callback never overrides an explicit facedown, hand, Deck or unknown reference', () => {
  const cases = [
    { code: 46986414, controller: 1, location: 4, sequence: 0, position: 8 },
    { code: 46986414, controller: 1, location: 2, sequence: 0 },
    { code: 46986414, controller: 1, location: 1, sequence: 0 },
    { code: 0, controller: 1, location: 4, sequence: 0 }
  ];
  for (const ref of cases) {
    let resolved = 0, visibilityChecks = 0;
    const descriptor = translateNativePrompt({ type: inputs.coreModule.OcgMessageType.SELECT_CARD,
      player: 0, min: 1, max: 1, can_cancel: false, selects: [ref] }, { metadata,
      isPublicCard: () => { visibilityChecks += 1; return true; },
      resolveCard: () => { resolved += 1; return { name: 'Must remain private' }; } });
    assert.equal(descriptor.request.candidates[0].name, 'Carte face verso');
    assert.equal(resolved, 0);
    assert.equal(visibilityChecks, 0);
  }
});
