import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';
import { createNativeScriptArchive } from '../src/core/native/NativeScriptArchive.js';
import { chooseNativeAIResponse, resolveNativeDuelPrompt, validateNativeDuelResponse } from '../src/core/native/NativeDuelDecisions.js';

const ACTION = 95000001;
const MONSTERS = [95000002, 95000003, 95000004];
const lua = `
local s,id=GetID()
function s.initial_effect(c)
  local e=Effect.CreateEffect(c)
  e:SetType(EFFECT_TYPE_ACTIVATE)
  e:SetCode(EVENT_FREE_CHAIN)
  e:SetOperation(s.operation)
  c:RegisterEffect(e)
end
function s.operation(e,tp)
  assert(Duel.SelectYesNo(tp,95))
  assert(Duel.SelectEffectYesNo(tp,e:GetHandler(),95))
  assert(Duel.SelectOption(tp,1100,1101,1102)==0)
  assert(Duel.AnnounceNumber(tp,700,1300)==700)
  assert(Duel.AnnounceRace(tp,2,RACE_WARRIOR|RACE_DRAGON)==(RACE_WARRIOR|RACE_DRAGON))
  assert(Duel.AnnounceAttribute(tp,1,ATTRIBUTE_EARTH|ATTRIBUTE_LIGHT)==ATTRIBUTE_EARTH)
  local code=Duel.AnnounceCard(tp,ATTRIBUTE_LIGHT,OPCODE_ISATTRIBUTE)
  assert(code==${MONSTERS[0]})
  assert(Duel.SelectPosition(tp,e:GetHandler(),POS_FACEUP_ATTACK|POS_FACEUP_DEFENSE)==POS_FACEUP_ATTACK)
  local g=Duel.GetFieldGroup(tp,LOCATION_MZONE,0)
  assert(#g:Select(tp,1,2,nil)==1)
  assert(#g:SelectWithSumEqual(tp,Card.GetLevel,8,1,3)==2)
  assert(#g:SelectWithSumGreater(tp,Card.GetLevel,7)>0)
  local must=Group.FromCards(g:GetFirst())
  Duel.SetSelectedCard(must)
  assert(#(g-must):SelectWithSumEqual(tp,Card.GetLevel,8,1,2)==1)
  assert(#Duel.SelectTribute(tp,e:GetHandler(),1,2,g,tp,0xff,true)==1)
  assert(g:SelectUnselect(Group.CreateGroup(),tp,false,false,1,3))
  for c in aux.Next(g) do assert(c:AddCounter(COUNTER_SPELL,2)) end
  assert(Duel.RemoveCounter(tp,1,0,COUNTER_SPELL,3,REASON_EFFECT))
  Duel.SelectDisableField(tp,1,LOCATION_MZONE,0,0)
  Duel.SelectFieldZone(tp,1,LOCATION_MZONE,0,0)
  assert(Duel.SpecialSummon(Duel.CreateToken(tp,${MONSTERS[0]}),0,tp,tp,false,false,POS_FACEUP_ATTACK)==1)
  Duel.SortDecktop(tp,tp,3)
  Duel.TossDice(tp,2)
  Duel.TossCoin(tp,2)
  Duel.RockPaperScissors()
  Duel.Damage(1-tp,1234,REASON_EFFECT)
end
`;
const monsterLua = `local s,id=GetID()
function s.initial_effect(c) c:EnableCounterPermit(COUNTER_SPELL,LOCATION_MZONE) end`;

test('real WASM accepts translated Lua decisions, mandatory sums, counters, declarations and sort order without RETRY', async () => {
  const archive = JSON.parse(await readFile(new URL('../public/native/scripts.json', import.meta.url), 'utf8'));
  const scripts = createNativeScriptArchive(archive);
  scripts.set(`c${ACTION}.lua`, lua);
  for (const code of MONSTERS) scripts.set(`c${code}.lua`, monsterLua);
  const baseCard = { alias: 0, setcodes: [], type: 33, level: 3, attribute: 16, race: 1n,
    attack: 1000, defense: 1000, lscale: 0, rscale: 0, link_marker: 0 };
  const cards = new Map([[ACTION, { ...baseCard, code: ACTION, type: 0x80002, level: 0, attribute: 0, race: 0n }],
    ...MONSTERS.map((code, index) => [code, { ...baseCard, code, level: [3, 5, 4][index] }])]);
  const metadata = new Map([...cards].map(([code, card]) => [code, { ...card, name: `Test ${code}` }]));
  const runtime = await createNativeDuelRuntime({ cards, scripts, seed: [1n, 2n, 3n, 4n],
    team1: { startingDrawCount: 0, drawCountPerTurn: 0 }, team2: { startingDrawCount: 0, drawCountPerTurn: 0 } });
  const seen = new Set();
  let dice = 0, coins = 0, activated = false, finished = false;
  try {
    runtime.addCard({ code: ACTION, controller: 0, location: 2, position: 8 });
    MONSTERS.forEach((code, sequence) => runtime.addCard({ code, controller: 0, location: 4, position: 1, sequence }));
    for (const code of MONSTERS) runtime.addCard({ code, controller: 0, location: 1, position: 8 });
    runtime.start();
    for (let step = 0; step < 200; step += 1) {
      const result = runtime.advance();
      assert.equal(result.messages.some(message => message.type === 1), false, 'The core rejected a translated response');
      for (const message of result.messages) {
        if (message.type === 131) dice += 1;
        if (message.type === 130) coins += 1;
        if (message.type === 91 && message.player === 1 && message.amount === 1234) finished = true;
      }
      if (finished) break;
      const prompt = result.prompt;
      assert.ok(prompt, `Expected a prompt before test effect completed (Lua errors: ${JSON.stringify(runtime.errors)})`);
      if (prompt.type === 11) {
        assert.equal(activated, false, `Operation did not complete: ${JSON.stringify(runtime.errors)}`);
        const index = prompt.activates.findIndex(card => card.code === ACTION);
        assert.ok(index >= 0);
        runtime.respond({ type: 1, action: 5, index }); activated = true; continue;
      }
      seen.add(prompt.type);
      const suggested = chooseNativeAIResponse(prompt, { constants: runtime.constants, metadata, cardReader: runtime.options.cardReader });
      assert.ok(suggested, `No legal AI response for native message ${JSON.stringify(prompt, (_, value) => typeof value === 'bigint' ? String(value) : value)}`);
      assert.equal(validateNativeDuelResponse(prompt, suggested, { constants: runtime.constants, metadata, cardReader: runtime.options.cardReader }), true);
      const response = await resolveNativeDuelPrompt({ prompt, runtime, side: 'player', metadata,
        onDecision: request => {
          if (request.choices) {
            if (request.nativeKind === 'SELECT_CHAIN') return prompt.forced ? 0 : null;
            if (request.nativeKind === 'ROCK_PAPER_SCISSORS') return prompt.player === 0 ? 1 : 2;
            return request.choices[0].value;
          }
          if (suggested.indicies) return suggested.indicies.map(String);
          return request.candidates.slice(0, request.minimum).map(card => card.uid);
        } });
      assert.ok(response, `No translated human response for native message ${prompt.type}`);
      runtime.respond(response);
    }
    assert.equal(finished, true, `Lua effect did not finish: ${JSON.stringify(runtime.errors)}`);
    assert.equal(runtime.queryField().players[1].lp, 6766);
    assert.deepEqual(runtime.errors, []);
    // SORT_CHAIN uses SORT_CARD's wire format and has separate descriptor tests.
    for (const type of [12, 13, 14, 15, 16, 18, 19, 20, 22, 23, 24, 25, 26, 132, 140, 141, 142, 143]) {
      assert.equal(seen.has(type), true, `Lua did not exercise native prompt ${type}`);
    }
    assert.equal(dice, 1);
    assert.equal(coins, 1);
  } finally { runtime.close(); }
});
