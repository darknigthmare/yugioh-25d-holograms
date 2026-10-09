import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loadNativeAuditInputs } from '../scripts/audit-native-field-runtime.mjs';
import { createNativeFieldScenarioRunner, perform, endTurn, enterBattle, battleAttack, leaveBattle, hasCode, requireChain, clone, json } from '../scripts/native-field-audit-harness.mjs';
import { correctNativeDuelTowerScript, NATIVE_DUEL_TOWER_SCRIPT_CORRECTION as correction } from '../src/core/native/NativeDuelTowerScriptCorrection.js';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';

const FIELD = 43940008;
const HAND = [23635815, 43096270];
const SECRET = 46986414;
const sha256 = source => createHash('sha256').update(source).digest('hex');
const inputs = await loadNativeAuditInputs();
const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
const upstream = inputs.resources.scripts.get(correction.filename);
const corrected = correctNativeDuelTowerScript(upstream);
const archiveScriptMap = new Map(inputs.resources.scripts);

// Explicit synchronous readers let before/after proofs choose their effective
// source even after the production default reader installs this correction.
function withSource(source) {
  const scripts = new Map(inputs.resources.scripts);
  for (const key of scripts.keys()) {
    if (key === correction.filename || key.endsWith(`/${correction.filename}`)) scripts.set(key, source);
  }
  const scriptReader = key => scripts.get(key)
    ?? (/^c\d+\.lua$/.test(key) ? scripts.get(`official/${key}`) : null) ?? null;
  return { ...inputs, resources: { ...inputs.resources, scripts, scriptReader } };
}
const variants = Object.freeze([
  { id: 'upstream-equal-atk-no-summon-reproduced', original: true, winners: [] },
  { id: 'corrected-equal-atk-both-optional-summons', winners: [1, 0] },
  { id: 'corrected-equal-atk-player-zero-declines', accepts: [false, true], winners: [1] },
  { id: 'corrected-equal-atk-player-one-declines', accepts: [true, false], winners: [0] },
  { id: 'corrected-equal-atk-both-decline', accepts: [false, false], winners: [] },
  { id: 'upstream-unequal-atk-higher-player-only', original: true, unequal: true, winners: [0] },
  { id: 'corrected-unequal-atk-higher-player-only', unequal: true, winners: [0] },
  { id: 'corrected-unequal-atk-winner-declines', unequal: true, accepts: [false, true], winners: [] },
  { id: 'corrected-no-monsters-revealed-no-false-tie', reveal: false, winners: [] },
  { id: 'corrected-equal-atk-full-opponent-main-zones', fullSide: 1, winners: [0] },
  { id: 'corrected-equal-atk-opponent-owned-field', fieldOwner: 1, winners: [1, 0] }
]);

function privateVisualEvidence(session, cfg) {
  const C = session.C, events = [], logs = [];
  const context = createNativeVisualContext({ getCardMetadata: code => inputs.resources.metadata.get(Number(code)) });
  let beforeFirstReveal = true;
  let deckSelectionCount = 0;
  let firstRevealDeckSelections = null;
  for (const message of session.messages) {
    if (message.type === C.OcgMessageType.SELECT_CARD && message.selects.every(card => card.location === C.OcgLocation.DECK)) deckSelectionCount++;
    if (message.type === C.OcgMessageType.CONFIRM_CARDS) {
      if (firstRevealDeckSelections === null) firstRevealDeckSelections = deckSelectionCount;
      beforeFirstReveal = false;
    }
    const translated = translateNativeVisualEvents(message, context);
    if (beforeFirstReveal) assert.ok(!json(translated).includes('89631139'), 'A reveal choice must stay private until both sides selected');
    if (message.type === C.OcgMessageType.MOVE && message.to.location === C.OcgLocation.REMOVED
      && (message.to.position & C.OcgPosition.FACEDOWN)) {
      for (const event of translated.events) { assert.equal(event.card, null); assert.equal(event.hidden, true); }
    }
    events.push(...translated.events); logs.push(...translated.logs);
  }
  if (cfg.reveal !== false) assert.equal(firstRevealDeckSelections, 2, 'Both hidden Deck selections precede the first reveal');
  const publicOutput = json({ events, logs });
  assert.ok(!publicOutput.includes(String(SECRET)), 'Unrevealed Deck/hand passcode must not leak to public descriptors');
  assert.ok(!publicOutput.includes('Dark Magician'), 'Unselected private hand monster must not leak to public logs');
  return { twoPrivateSelectionsBeforeFirstReveal: cfg.reveal !== false, facedownMovesAnonymous: true,
    unsummonedPrivateHandUnpublished: true, events: clone(events), logs: clone(logs) };
}

async function exerciseVariant(cfg) {
  const effectiveInputs = withSource(cfg.original ? upstream : corrected);
  const { scenarios, run } = createNativeFieldScenarioRunner(effectiveInputs, core);
  let privacy;
  await run(cfg.id, [FIELD], cfg.original
    ? 'Reproduce the original shipped source against native core, without the production reader correction.'
    : 'Apply the exact bounded source correction and exercise legal native optional summons and public visibility.', s => {
    const L = s.C.OcgLocation;
    const reveals = [89631139, cfg.unequal ? 68638985 : 89631139];
    s.add(FIELD, cfg.fieldOwner ?? 0, L.HAND);
    for (const player of [0, 1]) {
      s.add(reveals[player], player, L.DECK).add(HAND[player], player, L.HAND).add(SECRET, player, L.HAND);
    }
    if (Number.isInteger(cfg.fullSide)) {
      for (let sequence = 0; sequence < 5; sequence++) s.add(89631139, cfg.fullSide, L.MZONE, sequence);
    }
    s.baseDecks().start();
    if (cfg.fieldOwner === 1) { endTurn(s); perform(s, 'activate', FIELD); }
    else { perform(s, 'activate', FIELD); endTurn(s, { effectYes: prompt => prompt.code !== FIELD }); }
    const battle = enterBattle(s, {
      effectYes: prompt => prompt.code !== FIELD,
      respond: (prompt, C) => {
        if (prompt.type !== C.OcgMessageType.SELECT_YESNO) return null;
        if (prompt.description === (BigInt(FIELD) << 20n) + 2n) return { type: C.OcgResponseType.SELECT_YESNO, yes: cfg.reveal !== false };
        if (prompt.description === (BigInt(FIELD) << 20n) + 3n) return { type: C.OcgResponseType.SELECT_YESNO, yes: cfg.accepts?.[prompt.player] ?? true };
        return null;
      },
      select: prompt => prompt.selects[0].location === L.DECK ? [reveals[prompt.player]] : [HAND[prompt.player]]
    });
    requireChain(s, FIELD);
    const summons = s.messages.filter(message => message.type === s.C.OcgMessageType.SPSUMMONING);
    assert.deepEqual(summons.map(message => message.controller), cfg.winners);
    assert.ok(summons.every(message => message.location === L.MZONE && message.sequence < 5
      && message.code === HAND[message.controller] && message.position === s.C.OcgPosition.FACEUP_ATTACK));
    const completed = s.messages.filter(message => message.type === s.C.OcgMessageType.SPSUMMONED);
    assert.equal(completed.length, summons.length ? 1 : 0, 'Eligible simultaneous summons must complete as one native event');
    for (const player of [0, 1]) {
      const wasSummoned = cfg.winners.includes(player);
      assert.equal(hasCode(s, player, L.MZONE, HAND[player]), wasSummoned);
      assert.equal(hasCode(s, player, L.HAND, HAND[player]), !wasSummoned);
      assert.ok(hasCode(s, player, L.HAND, SECRET));
      if (cfg.reveal !== false) {
        assert.ok(hasCode(s, player, L.REMOVED, reveals[player]));
        assert.equal(s.card(player, L.REMOVED).position, s.C.OcgPosition.FACEDOWN);
      } else assert.ok(hasCode(s, player, L.DECK, reveals[player]));
      const declared = summons.find(message => message.controller === player);
      if (declared) { const q=s.card(player,L.MZONE,declared.sequence); assert.equal(q.code,HAND[player]);assert.equal(q.attack,inputs.resources.cards.get(HAND[player]).attack); }
    }
    if (cfg.winners.includes(battle.player)) assert.ok(battle.attacks.some(card => card.code === HAND[battle.player] && card.can_direct), 'Native direct attack effect must exist on the actual summoned monster');
    if (Number.isInteger(cfg.fullSide)) {
      assert.equal(s.location(cfg.fullSide, L.MZONE).length, 5);
      assert.ok(!s.decisions.some(decision => decision.prompt.type === s.C.OcgMessageType.SELECT_YESNO
        && decision.prompt.description === String((BigInt(FIELD)<<20n)+3n) && decision.prompt.player === cfg.fullSide));
    }
    if (cfg.winners.length === 2) {
      // Each actual summoned monster uses its granted direct attack while the
      // opponent still controls the other summoned monster.
      battleAttack(s,HAND[1],null);assert.equal(s.duel.queryField().players[0].lp,6000);
      leaveBattle(s);endTurn(s,{effectYes:prompt=>prompt.code!==FIELD});
      const next=enterBattle(s,{yes:false,effectYes:prompt=>prompt.code!==FIELD});
      assert.ok(next.attacks.some(card=>card.code===HAND[0]&&card.can_direct));
      battleAttack(s,HAND[0],null);assert.equal(s.duel.queryField().players[1].lp,6250);
      assert.ok(hasCode(s,0,L.MZONE,HAND[0]));assert.ok(hasCode(s,1,L.MZONE,HAND[1]));
    }
    const nativeField = s.duel.queryField();s.queries.push({query:{field:true},result:clone(nativeField)});
    privacy = privateVisualEvidence(s, cfg);
  });
  const scenario = scenarios[0];
  assert.equal(scenario.status, 'passed', `${cfg.id}: ${scenario.error ?? json(scenario.errors)}`);
  return { ...scenario, effectiveScriptSha256: cfg.original ? correction.upstreamSha256 : correction.correctedSha256,
    upstreamArchiveUnchanged: true, expectedSummonControllers: cfg.winners, publicVisibility: privacy };
}

const writeProof = process.argv.includes('--write-proof');
if (writeProof) {
  const scenarios=[];for(const cfg of variants)scenarios.push(await exerciseVariant(cfg));
  const officialSources=JSON.parse(await readFile(new URL('../docs/audits/artifacts/native-duel-tower-correction-2026-10-08.json',import.meta.url),'utf8')).officialSources;
  const sourcePaths=['src/core/native/NativeDuelTowerScriptCorrection.js','src/core/native/NativeSourceIntegrity.js','tests/native-duel-tower-correction.test.mjs','scripts/native-field-audit-harness.mjs'];
  const provenance=await Promise.all(sourcePaths.map(async path=>({path,sha256:sha256(await readFile(new URL('../'+path,import.meta.url)))})));
  const report={generatedOn:'2026-10-08',correction,officialSources,counts:{nativeScenarios:scenarios.length,passed:scenarios.length,failed:0},
    sourceProvenance:provenance,wasmSha256:inputs.coreBuild.wasmSha256,nativeApi:core.getVersion(),
    policy:{archiveScriptsModified:false,cardDatabaseModified:false,wasmModified:false,testMode:false,postStartInjection:false,
      executionSourceCorrectedOnlyForPinnedDuelTower:true},scenarios};
  await writeFile(new URL('../docs/audits/artifacts/native-duel-tower-correction-2026-10-08.json',import.meta.url),json(report)+'\n');console.log(json(report.counts));
} else {
  test('Duel Tower correction accepts only the exact upstream bytes and changes only the single winner block',()=>{
    assert.equal(sha256(upstream),correction.upstreamSha256);assert.equal(sha256(corrected),correction.correctedSha256);
    const substitution=correction.substitutions[0];assert.equal(upstream.split(substitution.before).length-1,1);
    assert.equal(corrected.replace(substitution.after,substitution.before),upstream);
    assert.throws(()=>correctNativeDuelTowerScript(upstream+'\n'),/SHA-256 mismatch/);assert.throws(()=>correctNativeDuelTowerScript(corrected),/SHA-256 mismatch/);assert.throws(()=>correctNativeDuelTowerScript(null),TypeError);
  });
  for(const cfg of variants)test(`Duel Tower native: ${cfg.id}`,async()=>{await exerciseVariant(cfg);});
  test('Duel Tower correction leaves every script archive entry byte-identical',()=>{
    assert.equal(inputs.resources.scripts.size,archiveScriptMap.size);for(const[key,value]of archiveScriptMap)assert.equal(inputs.resources.scripts.get(key),value);
  });
}
