import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadNativeAuditInputs } from './native-field-audit-inputs.mjs';
import { createNativeFieldScenarioRunner, reachIdle, perform, endTurn, enterBattle,
  battleAttack, clone, json } from './native-field-audit-harness.mjs';
import { NativeDuelGame } from '../src/core/native/NativeDuelGame.js';
import { createNativeVisualContext, translateNativeVisualEvents } from '../src/core/native/NativeDuelVisualEvents.js';
import { createPublicFieldHolograms } from '../src/ui/PublicDuelVisuals.js';

const ROOT = new URL('../', import.meta.url);
export const TOKEN_RULE_OUTPUT = 'docs/audits/artifacts/token-rules-2026-10-11/native-rules.json';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const expectedTokens = (s, controller) => s.location(controller, s.C.OcgLocation.MZONE)
  .map((entry, sequence) => s.card(controller, s.C.OcgLocation.MZONE, sequence, s.C.OcgQueryFlags.OWNER))
  .filter(card => card && (card.type & s.C.OcgType.TOKEN));
const tokenQuery = (s, controller) => {
  const rows = s.duel.queryLocation({ controller, location: s.C.OcgLocation.MZONE,
    flags: s.C.OcgQueryFlags.CODE | s.C.OcgQueryFlags.TYPE | s.C.OcgQueryFlags.POSITION
      | s.C.OcgQueryFlags.OWNER | s.C.OcgQueryFlags.ATTACK | s.C.OcgQueryFlags.DEFENSE
      | s.C.OcgQueryFlags.LEVEL | s.C.OcgQueryFlags.RACE | s.C.OcgQueryFlags.ATTRIBUTE });
  s.queries.push({ query: { controller, location: s.C.OcgLocation.MZONE, publicTokens: true }, result: clone(rows) });
  return rows.map((card, sequence) => card && { ...card, sequence }).filter(card => card && (card.type & s.C.OcgType.TOKEN));
};

/** A read-only facade is attached before Start; it projects actual native queries.
 * Commands and decisions still go through the shared typed WASM harness. */
function publicProjection(s, inputs) {
  assert.equal(s.duel.started, false);
  const game = new NativeDuelGame({}, { nativeResources: inputs.resources });
  game.resources = inputs.resources;
  game.runtime = s.duel;
  const context = createNativeVisualContext({
    getCardMetadata: code => game._getMetadata(code),
    getCardAt: reference => game._resolveCard(reference),
    queryCard: query => s.duel.queryCard(query)
  });
  s.publicEvents = [];
  s.publicSnapshots = [];
  const advance = s.advance.bind(s);
  s.advance = () => {
    const batch = advance();
    game._synchronize();
    for (const message of batch.messages) s.publicEvents.push(...translateNativeVisualEvents(message, context).events);
    return batch;
  };
  return label => {
    game._synchronize();
    const monsters = ['player', 'opponent'].flatMap(owner => game.getMonsterEntries(owner).map(entry => ({
      owner, zoneType: entry.zoneType, zoneIndex: entry.zoneIndex, id: entry.card.id,
      nativeCode: entry.card.nativeCode, nativeAlias: entry.card.nativeAlias,
      isToken: entry.card.isToken, type: entry.card.type, race: entry.card.race,
      attribute: entry.card.attribute, level: entry.card.getLevel(),
      attack: entry.card.getAtk(), defense: entry.card.getDef(),
      baseAttack: entry.card.baseAtk, baseDefense: entry.card.baseDef,
      controller: entry.card.controllerId, originalOwner: entry.card.ownerId,
      position: entry.card.position, faceDown: entry.card.isSetFaceDown
    })));
    const descriptors = createPublicFieldHolograms(game);
    assert.equal(new Set(descriptors.map(item => item.key)).size, descriptors.length, 'Different native token instances keep separate public zones');
    assert.doesNotMatch(json(descriptors), /nativeRef|runtimeInstanceId|uid|nativeQuery|effectUsage/);
    assert.ok(Object.isFrozen(descriptors));
    const snapshot = { label, monsters, descriptors: clone(descriptors) };
    s.publicSnapshots.push(snapshot);
    return snapshot;
  };
}

function vanish(s, tokenCodes) {
  const L = s.C.OcgLocation;
  for (const controller of [0, 1]) for (const location of [L.GRAVE, L.REMOVED, L.HAND, L.DECK, L.EXTRA]) {
    assert.equal(s.location(controller, location).some(card => tokenCodes.includes(card.code)), false,
      `A disappeared Token must not occupy controller ${controller} location ${location}`);
  }
}

function tokenStats(s, rows, { count, level, race, attribute, attack, defense, position }) {
  assert.equal(rows.length, count);
  for (const card of rows) {
    assert.ok(card.type & s.C.OcgType.TOKEN);
    assert.ok(card.type & s.C.OcgType.MONSTER);
    for (const [key, value] of Object.entries({ level, race, attribute, attack, defense, position })) if (value != null) {
      assert.equal(card[key], value, `Token ${card.code}: native ${key}`);
    }
  }
}

export async function runTokenRules(inputs, core, { only } = {}) {
  const runner = createNativeFieldScenarioRunner(inputs, core);
  const presentations = new Map();
  const run = async (id, generators, description, exercise) => {
    if (only && !only.includes(id)) return;
    await runner.run(id, generators, description, async s => {
      await exercise(s);
      assert.deepEqual(s.duel.errors, []);
      assert.equal(s.duel.options.flags & (s.C.OcgDuelMode.TEST_MODE | s.C.OcgDuelMode.PSEUDO_SHUFFLE), 0n);
      presentations.set(id, { publicEvents: clone(s.publicEvents), publicSnapshots: clone(s.publicSnapshots),
        tokenCardsAddedByFixture: false, postStartInjection: false, readOnlyFacadeProjection: true,
        actualBrowserDuelClaimed: false });
    });
  };

  await run('mpb-tetherwolf-native-token-link-material', [67922702], 'A real Tetherwolf Normal Summon creates a WIND Machine Token; that Token is legal Link Spider material the same turn and its departure returns Tetherwolf to Level 4.', s => {
    const L = s.C.OcgLocation, C = s.C, snapshot = publicProjection(s, inputs);
    s.add(67922702, 0, L.HAND).add(98978921, 0, L.EXTRA).baseDecks().start();
    perform(s, 'summon', 67922702);
    const tokens = tokenQuery(s, 0);
    tokenStats(s, tokens, { count: 1, level: 3, race: C.OcgRace.MACHINE, attribute: C.OcgAttribute.WIND, attack: 0, defense: 0 });
    assert.equal(s.card(0, L.MZONE, 0).level, 7);
    const created = snapshot('tetherwolf-created');
    assert.equal(created.monsters.find(card => card.isToken).level, 3);
    const idle = reachIdle(s);
    assert.ok(idle.special_summons.some(card => card.code === 98978921));
    perform(s, 'special', 98978921, { codes: tokens.map(card => card.code) });
    assert.equal(tokenQuery(s, 0).length, 0);
    assert.equal(s.card(0, L.MZONE, 0).level, 4);
    vanish(s, tokens.map(card => card.code));
    assert.equal(snapshot('after-link-material').monsters.some(card => card.isToken), false);
  });

  await run('scapegoat-distinct-public-instances-dark-hole-disappearance', [73915051], 'Four genuinely created Sheep Tokens retain separate public zones even when the core supplies an alias code; Dark Hole removes them without creating graveyard or banished cards.', s => {
    const L = s.C.OcgLocation, C = s.C, snapshot = publicProjection(s, inputs);
    s.add(73915051, 0, L.HAND).add(53129443, 0, L.HAND).baseDecks().start();
    perform(s, 'activate', 73915051);
    const tokens = tokenQuery(s, 0);
    tokenStats(s, tokens, { count: 4, level: 1, race: C.OcgRace.BEAST, attribute: C.OcgAttribute.EARTH, attack: 0, defense: 0, position: C.OcgPosition.FACEUP_DEFENSE });
    assert.equal(snapshot('four-sheep-created').descriptors.length, 4);
    perform(s, 'activate', 53129443);
    assert.equal(tokenQuery(s, 0).length, 0);
    vanish(s, tokens.map(card => card.code));
    assert.equal(snapshot('four-sheep-removed').descriptors.length, 0);
  });

  await run('dandylion-native-face-down-xyz-and-tribute-restrictions', [15341821], 'Foolish Burial creates two Fluff Tokens. Book of Moon cannot activate with only Tokens, and a Level-1 Xyz cannot use them; their temporary Tribute restriction expires at the End Phase.', s => {
    const L = s.C.OcgLocation, C = s.C, snapshot = publicProjection(s, inputs);
    s.add(15341821, 0, L.DECK).add(81439173, 0, L.HAND).add(14087893, 0, L.HAND)
      .add(28279543, 0, L.HAND).add(54366836, 0, L.EXTRA).baseDecks().start();
    perform(s, 'activate', 81439173, { codes: [15341821] });
    const tokens = tokenQuery(s, 0);
    tokenStats(s, tokens, { count: 2, level: 1, race: C.OcgRace.PLANT, attribute: C.OcgAttribute.WIND, attack: 0, defense: 0, position: C.OcgPosition.FACEUP_DEFENSE });
    const idle = reachIdle(s);
    assert.equal(idle.activates.some(card => card.code === 14087893), false);
    assert.equal(idle.special_summons.some(card => card.code === 54366836), false);
    assert.equal(idle.summons.some(card => card.code === 28279543), false);
    snapshot('fluff-creation-restrictions');
    endTurn(s); endTurn(s);
    const next = reachIdle(s);
    assert.equal(next.special_summons.some(card => card.code === 54366836), false, 'Token Xyz prohibition does not expire');
    assert.ok(next.summons.some(card => card.code === 28279543));
    perform(s, 'summon', 28279543);
    assert.equal(tokenQuery(s, 0).length, 1);
    vanish(s, tokens.map(card => card.code));
    snapshot('fluff-legal-next-turn-tribute');
  });

  await run('dandylion-native-same-turn-link-material', [15341821], 'The Fluff Token restriction forbids only that turn’s Tribute Summon; Link Spider can use a Token immediately without sending that Token to the graveyard.', s => {
    const L = s.C.OcgLocation, snapshot = publicProjection(s, inputs);
    s.add(15341821, 0, L.DECK).add(81439173, 0, L.HAND).add(98978921, 0, L.EXTRA).baseDecks().start();
    perform(s, 'activate', 81439173, { codes: [15341821] });
    const tokens = tokenQuery(s, 0); snapshot('fluff-before-link');
    perform(s, 'special', 98978921, { codes: tokens.map(card => card.code) });
    assert.equal(tokenQuery(s, 0).length, 1);
    vanish(s, tokens.map(card => card.code));
    snapshot('fluff-after-link');
  });

  await run('dandylion-native-same-turn-synchro-material', [15341821], 'A genuine Fluff Token is a legal non-Tuner with Jet Synchron for Formula Synchron; native material reasons and disappearance remain authoritative.', s => {
    const L = s.C.OcgLocation, snapshot = publicProjection(s, inputs);
    s.add(15341821, 0, L.DECK).add(81439173, 0, L.HAND).add(9742784, 0, L.MZONE)
      .add(50091196, 0, L.EXTRA).baseDecks().start();
    perform(s, 'activate', 81439173, { codes: [15341821] });
    const tokens = tokenQuery(s, 0); snapshot('fluff-before-synchro');
    perform(s, 'special', 50091196, { codes: [9742784, ...tokens.map(card => card.code)] });
    assert.equal(tokenQuery(s, 0).length, 1);
    vanish(s, tokens.map(card => card.code));
    assert.ok(s.location(0, L.GRAVE).some(card => card.code === 9742784));
    snapshot('fluff-after-synchro');
  });

  await run('fires-of-doomsday-dark-only-tribute-and-banish', [46173679], 'Doomsday Tokens prohibit other summons during activation turn and non-DARK Tribute Summons permanently; a legal DARK Caius Tribute consumes one Token and can banish the remaining Token, which disappears.', s => {
    const L = s.C.OcgLocation, C = s.C, snapshot = publicProjection(s, inputs);
    s.add(46173679, 0, L.HAND).add(9748752, 0, L.HAND).add(89631139, 0, L.HAND).baseDecks().start();
    perform(s, 'activate', 46173679);
    const tokens = tokenQuery(s, 0);
    tokenStats(s, tokens, { count: 2, level: 1, race: C.OcgRace.FIEND, attribute: C.OcgAttribute.DARK, attack: 0, defense: 0 });
    assert.equal(reachIdle(s).summons.length, 0);
    snapshot('doomsday-summon-lock');
    endTurn(s); endTurn(s);
    const next = reachIdle(s);
    assert.equal(next.summons.some(card => card.code === 89631139), false);
    assert.ok(next.summons.some(card => card.code === 9748752));
    perform(s, 'summon', 9748752, { codes: tokens.map(card => card.code) });
    assert.equal(tokenQuery(s, 0).length, 0);
    vanish(s, tokens.map(card => card.code));
    snapshot('doomsday-after-dark-tribute-and-banish');
  });

  await run('ojama-native-no-tribute-link-and-destruction-damage', [29843091], 'Three opposing Ojama Tokens cannot be Tribute Summoned away but one can be Link material; only the two later destroyed Tokens deal 300 damage each, and none become graveyard or banished cards.', s => {
    const L = s.C.OcgLocation, C = s.C, snapshot = publicProjection(s, inputs);
    s.add(29843091, 0, L.SZONE, 0, C.OcgPosition.FACEDOWN_DEFENSE)
      .add(28279543, 1, L.HAND).add(98978921, 1, L.EXTRA).add(53129443, 1, L.HAND).baseDecks().start();
    perform(s, 'activate', 29843091);
    const tokens = tokenQuery(s, 1);
    tokenStats(s, tokens, { count: 3, level: 2, race: C.OcgRace.BEAST, attribute: C.OcgAttribute.LIGHT, attack: 0, defense: 1000, position: C.OcgPosition.FACEUP_DEFENSE });
    snapshot('three-ojama-created');
    endTurn(s);
    const idle = reachIdle(s);
    assert.equal(idle.summons.some(card => card.code === 28279543), false);
    perform(s, 'special', 98978921, { codes: tokens.map(card => card.code) });
    assert.equal(s.duel.queryField().players[1].lp, 8000, 'Link material departure is not destruction');
    snapshot('ojama-link-material');
    perform(s, 'activate', 53129443);
    assert.equal(s.duel.queryField().players[1].lp, 7400);
    assert.equal(tokenQuery(s, 1).length, 0);
    vanish(s, tokens.map(card => card.code));
    snapshot('ojama-two-destroyed');
  });

  await run('black-garden-native-token-control-and-live-stats', [71645242], 'A real Rose Token can change control and receive United We Stand’s native ATK/DEF; End Phase restores control, and later destruction removes the Token rather than storing it in another zone.', s => {
    const L = s.C.OcgLocation, C = s.C, snapshot = publicProjection(s, inputs);
    s.add(71645242, 0, L.SZONE, 5).add(97590747, 0, L.HAND).add(4031928, 0, L.HAND)
      .add(56747793, 0, L.HAND).add(53129443, 1, L.HAND).baseDecks().start();
    perform(s, 'summon', 97590747);
    const tokens = tokenQuery(s, 1);
    tokenStats(s, tokens, { count: 1, level: 2, race: C.OcgRace.PLANT, attribute: C.OcgAttribute.DARK, attack: 800, defense: 800, position: C.OcgPosition.FACEUP_ATTACK });
    snapshot('rose-original-opponent-control');
    perform(s, 'activate', 4031928, { codes: tokens.map(card => card.code) });
    assert.equal(tokenQuery(s, 1).length, 0);
    assert.equal(tokenQuery(s, 0).length, 1);
    perform(s, 'activate', 56747793, { codes: tokens.map(card => card.code) });
    tokenStats(s, tokenQuery(s, 0), { count: 1, attack: 2400, defense: 2400 });
    const equipped = snapshot('rose-equipped-own-control').monsters.find(card => card.isToken);
    assert.equal(equipped.attack, 2400); assert.equal(equipped.defense, 2400);
    assert.equal(equipped.controller, 'player'); assert.equal(equipped.originalOwner, 'player');
    endTurn(s);
    assert.equal(tokenQuery(s, 0).length, 0);
    assert.equal(tokenQuery(s, 1).length, 1);
    snapshot('rose-control-returned');
    perform(s, 'activate', 53129443);
    vanish(s, tokens.map(card => card.code));
    assert.equal(snapshot('rose-destroyed').monsters.some(card => card.isToken), false);
  });

  await run('gorz-native-battle-damage-token-dynamic-stats', [44330098], 'Gorz resolves after genuine direct battle damage; the Emissary of Darkness Token receives that exact damage as both ATK and DEF, and its Fairy/LIGHT/Level7 characteristics come from the core.', s => {
    const L = s.C.OcgLocation, C = s.C, snapshot = publicProjection(s, inputs);
    s.add(97590747, 0, L.MZONE).add(44330098, 1, L.HAND).baseDecks().start();
    reachIdle(s); endTurn(s); endTurn(s); enterBattle(s);
    battleAttack(s, 97590747, null, { chainCodes: [44330098] });
    const tokens = tokenQuery(s, 1);
    tokenStats(s, tokens, { count: 1, level: 7, race: C.OcgRace.FAIRY, attribute: C.OcgAttribute.LIGHT, attack: 1800, defense: 1800 });
    assert.equal(s.duel.queryField().players[1].lp, 6200);
    const projected = snapshot('gorz-dynamic-token').monsters.find(card => card.isToken);
    assert.equal(projected.attack, 1800); assert.equal(projected.defense, 1800);
    assert.equal(projected.race, 'Fairy'); assert.equal(projected.attribute, 'LIGHT');
  });

  return runner.scenarios.map(row => ({ ...row, ...presentations.get(row.id) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const inputs = await loadNativeAuditInputs();
  const core = await inputs.coreModule.default({ ...inputs.initializer, sync: true });
  const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
  const scenarios = await runTokenRules(inputs, core, { only: onlyArg?.slice(7).split(',') });
  const sources = ['scripts/audit-token-rules-2026-10-11.mjs', 'scripts/native-field-audit-harness.mjs',
    'scripts/native-field-audit-inputs.mjs', 'src/core/native/NativeDuelGame.js',
    'src/core/native/NativeDuelVisualEvents.js', 'src/ui/PublicDuelVisuals.js',
    'public/native/ocgcore.sync.wasm', 'public/native/core-build.json', 'public/native/card-data.json', 'public/native/scripts.json'];
  const report = { asOf: '2026-10-11', wave: 'native-token-rules', baselineCommit: '82d8ef5bffb6eef01d197ea00a8cb2694e2e2870',
    observedAtUtc: new Date().toISOString(), nativeApi: core.getVersion(),
    summary: { cases: scenarios.length, passed: scenarios.filter(row => row.status === 'passed').length,
      failed: scenarios.filter(row => row.status !== 'passed').length },
    scope: 'Representative actual WASM/Lua token rules and read-only production facade/public field projection; no actual browser capture claimed',
    strictFortyCardOrCurrentBanlistDeckClaimed: false, tokensAddedToDecksOrFixtures: false,
    sourceHashes: Object.fromEntries(await Promise.all(sources.map(async path => [path, sha256(await readFile(new URL(path, ROOT)))]))),
    scenarios };
  await mkdir(new URL('docs/audits/artifacts/token-rules-2026-10-11/', ROOT), { recursive: true });
  await writeFile(new URL(TOKEN_RULE_OUTPUT, ROOT), json(report) + '\n');
  console.log(json({ ...report.summary, failures: scenarios.filter(row => row.status !== 'passed').map(row => ({ id: row.id, error: row.error })) }));
  assert.equal(report.summary.failed, 0, 'All representative token scenarios must pass');
}
