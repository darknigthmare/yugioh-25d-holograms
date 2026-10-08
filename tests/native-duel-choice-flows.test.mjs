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

test('Crossout announcement offers only its native Deck code filter and banishes the declared copy', async () => {
  await run(s => s.add(65681983, 0, 2).add(22702055, 0, 1).add(89631139, 0, 1).add(46986414, 1, 1), async s => {
    await s.action('activate', 65681983, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_CARD) return undefined;
      assert.deepEqual(request.choices.map(choice => choice.value).sort((a, b) => a - b), [22702055, 89631139]);
      const descriptor = translateNativePrompt(prompt, { constants: s.C, metadata, cardReader: s.duel.options.cardReader });
      assert.equal(descriptor.toResponse(46986414), null);
      return 22702055;
    });
    assert.equal(s.query(0, 32)[0].code, 22702055);
    assert.deepEqual(s.query(0, 1).map(card => card.code), [89631139]);
  });
});

test('Lullaby catalogue excludes Spells and Extra monsters without discovering the opponent Deck', async () => {
  await run(s => s.add(39238953, 0, 2).add(89631139, 0, 1).add(46986414, 1, 1), async s => {
    await s.action('activate', 39238953, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_CARD) return undefined;
      let resolved = 0;
      const descriptor = translateNativePrompt(prompt, { constants: s.C, metadata, cardReader: s.duel.options.cardReader,
        resolveCard: () => { resolved += 1; throw new Error('Declarations must not inspect a duel mirror'); } });
      assert.equal(resolved, 0);
      assert.ok(descriptor.request.choices.some(choice => choice.value === 89631139));
      assert.equal(descriptor.toResponse(22702055), null);
      assert.equal(descriptor.toResponse(23995346), null);
      assert.equal(s.duel.queryField().players[0].lp, 6000);
      return 89631139; // Legal public catalogue name absent from the opposing Deck.
    });
    assert.deepEqual(s.query(0, 2).map(card => card.code), []);
    assert.equal(s.query(1, 1).length, 1);
  });
});

test('Ancient Gear Gadget combines archetype, monster type and current-name exclusion in real announcement opcodes', async () => {
  await run(s => s.add(18486927, 0, 4).decks(), async s => {
    await s.action('activate', 18486927, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_CARD) return undefined;
      const descriptor = translateNativePrompt(prompt, { constants: s.C, metadata, cardReader: s.duel.options.cardReader });
      assert.equal(descriptor.toResponse(18486927), null);
      assert.equal(descriptor.toResponse(89631139), null);
      assert.ok(request.choices.length > 1 && request.choices.length < 30);
      const choice = request.choices.find(choice => choice.label === 'Green Gadget'); assert.ok(choice);
      return choice.value;
    });
    assert.equal(s.seen('ANNOUNCE_CARD').length, 1);
    assert.equal(s.query(0, 4)[0].code, 18486927); // Native QUERY_CODE retains the original identity.
  });
});

test('Tribe-Infecting Virus offers only races of face-up monsters and never the hidden monster race', async () => {
  await run(s => s.add(33184167, 0, 4).add(89631139, 1, 4).add(46986414, 1, 4, 1, 8).add(83011277, 0, 2).decks(), async s => {
    await s.action('activate', 33184167, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_RACE) return undefined;
      assert.deepEqual(request.candidates.map(card => card.name).sort(), ['Aqua', 'Dragon']);
      const descriptor = translateNativePrompt(prompt, { constants: s.C });
      assert.equal(descriptor.toResponse(['2']), null);
      return [request.candidates.find(card => card.name === 'Dragon').uid];
    });
    assert.equal(s.query(1, 4).length, 1);
    assert.equal(s.query(1, 4)[0].position, 8);
    assert.equal(s.query(1, 16)[0].code, 89631139);
  });
});

test('Magical Exemplar presents nonconsecutive native number options by index and pays exact counters', async () => {
  await run(s => s.add(6061630, 0, 4).add(22702055, 0, 2).add(43711255, 0, 2)
    .add(70791313, 0, 2).add(45141844, 0, 2).decks(), async s => {
    await s.action('activate', 22702055);
    await s.action('activate', 43711255, (request, prompt) => prompt.type === s.M.ANNOUNCE_CARD ? 89631139 : undefined);
    assert.equal(s.query(0, 4)[0].counters[1], 4);
    await s.action('activate', 6061630, (request, prompt) => {
      if (prompt.type !== s.M.ANNOUNCE_NUMBER) return undefined;
      assert.deepEqual(request.choices.map(choice => choice.label), ['2', '4']);
      assert.deepEqual(request.choices.map(choice => choice.value), [0, 1]);
      assert.equal(translateNativePrompt(prompt, { constants: s.C }).toResponse(4), null);
      return 1;
    });
    assert.deepEqual(s.query(0, 4).map(card => card.code).sort(), [6061630, 70791313]);
    assert.equal(s.query(0, 4).find(card => card.code === 6061630).counters[1] ?? 0, 0);
    assert.equal(s.query(0, 2).some(card => card.code === 45141844), true);
  });
});

test('Tokusano weighted UI reports 0, 6 and 10 from native values while invalid answers never become responses', async () => {
  await run(s => {
    s.add(50357013, 0, 2).add(70781052, 0, 2).add(83011277, 0, 2).add(89631139, 0, 2);
    for (const code of [89631139, 46986414, 83011277]) s.add(code, 0, 1); s.add(46986414, 1, 1);
  }, async s => {
    await s.action('activate', 50357013, (request, prompt) => {
      if (prompt.type !== s.M.SELECT_SUM) return undefined;
      const skull = selectedCodes(prompt, [70781052]), both = selectedCodes(prompt, [70781052, 83011277]);
      assert.match(request.selectionSummary([]), /totale : 0.*exactement 10/);
      assert.match(request.selectionSummary(skull), /totale : 6.*exactement 10/);
      assert.match(request.selectionSummary(both), /totale : 10.*exactement 10/);
      assert.match(request.candidates[Number(skull[0])].label, /Valeur : 6/);
      const descriptor = translateNativePrompt(prompt, { constants: s.C, metadata });
      for (const bad of [skull, [...both, both[0]], ['-1'], ['99'], null]) assert.equal(descriptor.toResponse(bad), null);
      assert.deepEqual(descriptor.toResponse([...both].reverse()).indicies, both.map(Number).reverse());
      return both;
    });
    assert.equal(s.query(0, 16).filter(card => [70781052, 83011277].includes(card.code)).length, 2);
  });
});

for (const cancel of [false, true]) test(`Kozmo Dark Planet successive native add/remove choices ${cancel ? 'cancel without banishing' : 'remove a chosen material before finishing'}`, async () => {
  await run(s => s.add(85991529, 0, 2).add(59496924, 0, 2).add(67050396, 0, 2)
    .add(12408276, 0, 2).add(94454495, 0, 2).decks(), async s => {
    let stage = 0, removed = false;
    await s.action('special', 85991529, (request, prompt) => {
      if (prompt.type !== s.M.SELECT_UNSELECT_CARD) return undefined;
      const descriptor = translateNativePrompt(prompt, { constants: s.C, metadata });
      assert.equal(descriptor.toResponse(-1), null);
      if (cancel) { assert.ok(prompt.can_cancel); return null; }
      const refs = [...prompt.select_cards, ...prompt.unselect_cards];
      if (stage++ === 0) return refs.findIndex(card => card.code === 12408276);
      if (!removed) {
        const index = refs.findIndex((card, index) => index >= prompt.select_cards.length && card.code === 12408276);
        assert.ok(index >= 0); assert.match(request.choices[index].label, /^RETIRER/); removed = true; return index;
      }
      if (prompt.can_finish) return null;
      return refs.findIndex((card, index) => index < prompt.select_cards.length && [59496924, 67050396].includes(card.code));
    });
    assert.ok(s.seen('SELECT_UNSELECT_CARD').length >= (cancel ? 1 : 4));
    assert.equal(s.query(0, 4).some(card => card.code === 85991529), !cancel);
    assert.equal(s.query(0, 32).length, cancel ? 0 : 2);
    assert.equal(s.query(0, 2).some(card => card.code === 12408276), true);
    if (!cancel) assert.equal(removed, true);
  });
});

test('mandatory native sum prefix is displayed and counted without entering optional response indices', () => {
  const ref = (code, amount) => ({ code, amount, controller: 0, location: 2, sequence: 0, position: 8 });
  const prompt = { type: 23, player: 0, select_max: 0, amount: 8, min: 1, max: 2,
    selects_must: [ref(70781052, 3)], selects: [ref(83011277, 5), ref(89631139, 4)] };
  const descriptor = translateNativePrompt(prompt, { metadata });
  assert.match(descriptor.request.includedCandidates[0].label, /Valeur : 3/);
  assert.match(descriptor.request.selectionSummary(['0']), /totale : 8/);
  assert.deepEqual(descriptor.toResponse(['0']), { type: 14, indicies: [0] });
  assert.equal(descriptor.toResponse(['1']), null);
  const allIncluded = translateNativePrompt({ ...prompt, amount: 3, min: 0, max: 0, selects: [] }, { metadata });
  assert.deepEqual(allIncluded.toResponse([]), { type: 14, indicies: [] });
});

test('alternate sum weights and public enemy tribute labels expose arithmetic without resolving hidden identities', () => {
  let read = 0;
  const hidden = { code: 46986414, controller: 1, location: 4, sequence: 0, position: 8 };
  const options = { metadata, resolveCard: () => { read += 1; throw new Error('Hidden card resolution'); }, isPublicCard: () => true };
  const descriptor = translateNativePrompt({ type: 23, player: 0, select_max: 0, amount: 6, min: 1, max: 1,
    selects_must: [], selects: [{ ...hidden, amount: 3 | (6 << 16) }] }, options);
  assert.equal(read, 0);
  assert.equal(descriptor.request.candidates[0].name, 'Carte face verso');
  assert.match(descriptor.request.candidates[0].label, /Valeur : 3 ou 6/);
  assert.match(descriptor.request.selectionSummary(['0']), /minimale : 3.*maximale : 6/);
  assert.deepEqual(descriptor.toResponse(['0']), { type: 14, indicies: [0] });
  const tribute = translateNativePrompt({ type: 20, player: 0, min: 2, max: 2, can_cancel: true,
    selects: [{ ...hidden, release_param: 2 }] }, options);
  assert.equal(read, 0);
  assert.match(tribute.request.candidates[0].label, /^Carte face verso.*Sacrifices : 2/);
  assert.equal(tribute.request.validateSelection(['0']), true);
  assert.equal(tribute.request.validateSelection([]), false);
  assert.deepEqual(tribute.toResponse(null), { type: 12, indicies: null });
});

test('hidden chain choices never resolve an encoded effect description that could disclose a private card', () => {
  let descriptions = 0, cards = 0;
  const options = { metadata,
    resolveDescription: () => { descriptions += 1; return 'Private effect identity'; },
    resolveCard: () => { cards += 1; return { name: 'Private identity' }; } };
  for (const ref of [
    { code: 46986414, controller: 1, location: 4, position: 8 },
    { code: 46986414, controller: 1, location: 2, position: 8 },
    { code: 0, controller: 1, location: 4, position: 1 }
  ]) {
    const descriptor = translateNativePrompt({ type: 16, player: 0, forced: true,
      selects: [{ ...ref, sequence: 0, description: BigInt(46986414) << 4n }] }, options);
    assert.equal(descriptor.request.choices[0].label, 'Carte face verso');
    assert.equal(descriptor.request.required, true);
    assert.equal(descriptor.toResponse(null), null);
  }
  assert.equal(descriptions, 0);
  assert.equal(cards, 0);
});
