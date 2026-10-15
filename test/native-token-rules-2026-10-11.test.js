import assert from 'node:assert/strict';
import test from 'node:test';
import { loadNativeAuditInputs } from '../scripts/native-field-audit-inputs.mjs';
import { runTokenRules } from '../scripts/audit-token-rules-2026-10-11.mjs';
import { OcgMessageType as M, OcgLocation as L, OcgPosition as P } from '../src/core/native/vendor/ocgcore/index.js';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';
import { createPublicCombatVisual } from '../src/ui/PublicDuelVisuals.js';

test('representative Token families follow actual WASM rules and public presentation', async t => {
  const inputs = await loadNativeAuditInputs();
  const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const scenarios = await runTokenRules(inputs, core);
  assert.equal(scenarios.length, 11);
  for (const scenario of scenarios) await t.test(scenario.id, () => {
    assert.equal(scenario.status, 'passed', scenario.error);
    assert.deepEqual(scenario.errors, []);
    assert.equal(scenario.tokenCardsAddedByFixture, false);
    assert.equal(scenario.postStartInjection, false);
    assert.equal(scenario.actualBrowserDuelClaimed, false);
  });
});

const location = (position = P.FACEUP_DEFENSE, location = L.MZONE) => ({
  controller: 1, location, sequence: 2, position
});
const gone = { controller: 1, location: 0, sequence: 0, position: 0 };

// The native scenarios above prove the production behavior. These adversarial
// protocol checks exercise the privacy boundary with readers that must not run.
function announcedToken() {
  const ctx = createNativeVisualContext({
    getCardMetadata: code => ({ id: String(code), name: 'Sheep Token',
      type: 'Token Normal Monster', card_type: 'monster', race: 'Beast', attribute: 'EARTH' }),
    queryCard: request => {
      assert.equal(request.location, L.MZONE);
      return { code: 73915052, type: 0x4011, position: P.FACEUP_DEFENSE,
        attack: 0, defense: 0, level: 1, race: 0x4000n, attribute: 1 };
    }
  });
  translateNativeVisualEvents({ type: M.SPSUMMONING, code: 73915052, ...location() }, ctx);
  const card = translateNativeVisualEvents({ type: M.SPSUMMONED }, ctx).events[0].card;
  assert.equal(card.isToken, true);
  ctx.queryCard = () => assert.fail('A disappeared Token has no queryable destination');
  ctx.getCardMetadata = () => assert.fail('Only the formerly public Token identity may be reused');
  return { ctx, card: [...ctx.publicCards.values()][0] };
}

test('a Token destruction reuses only its announced identity, without reading the removed passcode or querying location 0', () => {
  const { ctx, card } = announcedToken();
  const move = { type: M.MOVE, from: location(), to: gone, reason: 65,
    get card() { assert.fail('The raw removed passcode must not be read'); } };
  const first = translateNativeVisualEvents(move, ctx);
  assert.equal(first.events[0].type, 'move');
  assert.equal(first.events[0].to, null);
  assert.equal(first.events[0].card, null);
  const destroyed = first.events.find(event => event.type === 'destroy');
  assert.strictEqual(destroyed.card, card);
  assert.equal(destroyed.target, 'opponent');
  assert.equal(destroyed.zoneIndex, 2);
  assert.equal(destroyed.hidden, false);
  const visual = createPublicCombatVisual(destroyed, {});
  assert.equal(visual.kind, 'destroy');
  assert.equal(visual.card.id, '73915052');
  assert.doesNotMatch(JSON.stringify(visual), /nativeStats|runtimeInstanceId|currentAtk|counters/);
  // The announced slot was consumed; a repeated packet cannot announce another
  // destruction or obtain a removed card by re-reading its raw passcode.
  assert.equal(translateNativeVisualEvents(move, ctx).events.some(event => event.type === 'destroy'), false);
});

test('unknown, concealed, non-monster or nonzero removals cannot introduce Token material reasons or identities', () => {
  for (const variant of ['unknown', 'face-down', 'spell-zone', 'nonzero-destination']) {
    const { ctx } = announcedToken();
    if (variant === 'unknown') ctx.publicCards.clear();
    const from = variant === 'face-down' ? location(P.FACEDOWN_DEFENSE)
      : variant === 'spell-zone' ? location(P.FACEUP_DEFENSE, L.SZONE) : location();
    const to = variant === 'nonzero-destination' ? { ...gone, location: 1024 } : gone;
    const translated = translateNativeVisualEvents({ type: M.MOVE, from, to,
      get card() { assert.fail(`${variant}: concealed/raw identity was read`); },
      get reason() { assert.fail(`${variant}: a private or unproven material reason was read`); } }, ctx);
    assert.equal(translated.events.some(event => event.type === 'destroy'), false);
    assert.ok(translated.events.every(event => event.card == null));
    assert.equal(ctx.materialKinds.size, 0);
    assert.equal(ctx.tributeMaterialCount, 0);
  }
});
