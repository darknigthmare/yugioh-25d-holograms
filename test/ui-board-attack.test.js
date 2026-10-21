import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { NativeDuelGame, NATIVE_TCG_DUEL_FLAGS } from '../src/core/native/NativeDuelGame.js';
import { loadNativeCardResources } from '../src/core/native/NativeCardData.js';

const source = readFileSync(new URL('../main.js', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('// Card zone click handler'), source.indexOf('// Right click handler'));
const clickRegistration = section.match(/zone\.addEventListener\('click', async \(\) => \{[^]*\n  \}\);/)?.[0];
assert.ok(clickRegistration, 'Production board click handler must exist');
const highlights = source.match(/function updateBattleHighlights\([^]*?\n\}/)?.[0];
assert.ok(highlights, 'Production battle highlights must exist');
const guardSection = source.slice(source.indexOf('// Right click handler'), source.indexOf('// Some browsers flatten'));
const contextRegistration = guardSection.match(/zone\.addEventListener\('contextmenu'[^]*?\n  \}\);/)?.[0];
const keyRegistration = guardSection.match(/zone\.addEventListener\('keydown'[^]*?\n  \}\);/)?.[0];
assert.ok(contextRegistration && keyRegistration, 'Production position input handlers must exist');
const forwardingSection = source.slice(source.indexOf('// Some browsers flatten'), source.indexOf('// Click outside board zones'));
const forwardingRegistration = forwardingSection.match(/document\.getElementById\('parallax-container'\)\?\.addEventListener\('click', event => \{[^]*?\n\}\);/)?.[0];
assert.ok(forwardingRegistration, 'Production CSS 3D click forwarding must exist');
const resourcesPromise = loadNativeCardResources({ fetch: async path =>
  new Response(await readFile(new URL(`../public${path}`, import.meta.url))) });

async function fixture({ startingPlayer = 'opponent', defender, extraAttacker = false } = {}) {
  const events = [];
  const team = { startingLP: 8000, startingDrawCount: 0, drawCountPerTurn: 0 };
  const game = new NativeDuelGame({
    onAnimation: event => events.push(event),
    onDecision: request => request.multiple
      ? request.candidates.slice(0, request.minimum).map(candidate => candidate.uid)
      : request.choices?.[0]?.value
  }, { rulesMode: 'native', nativeResources: await resourcesPromise, aiDelay: 0,
    seed: [1n, 2n, 3n, 4n], teams: [team, team],
    validateDeck: () => ({ valid: true, issues: [] }) });
  const base = { id: 46986414, name: 'Dark Magician', card_type: 'monster', type: 'Normal Monster' };
  assert.equal(await game.initDecks([base], [base], [], [], { startingPlayer }), true);
  const C = game.runtime.constants;
  // Ordinary NewCard setup occurs before Start; the official WASM resolves all
  // target legality, attack limits, card destruction and actual LP damage.
  game.runtime.addCard({ code: extraAttacker ? 23995346 : 89631139,
    controller: game.controllerForSide('player'), location: C.OcgLocation.MZONE,
    sequence: extraAttacker ? 5 : 0, position: C.OcgPosition.FACEUP_ATTACK });
  if (defender) game.runtime.addCard({ code: defender.extra ? 45231177 : 46986414,
    controller: game.controllerForSide('opponent'), location: C.OcgLocation.MZONE,
    sequence: defender.extra ? 5 : 3, position: C.OcgPosition.FACEUP_ATTACK });
  assert.equal(await game.start(), true);
  if (game.turnCount === 1) assert.equal(await game.changePhase('end'), true);
  assert.equal(game.currentTurn, 'player');
  assert.equal(await game.changePhase('battle'), true);

  const zones = [];
  const zone = (side, zoneType, index) => {
    const classes = new Set(['card-zone', zoneType === 'extra-monster' ? 'extra-m-zone' : `${side}-m-zone`]);
    const listeners = new Map();
    const value = { dataset: { side, zoneType, index: String(index) },
      classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) },
      addEventListener: (name, listener) => listeners.set(name, listener),
      click: () => listeners.get('click')?.(),
      dispatch: (name, event) => listeners.get(name)?.(event),
      getBoundingClientRect: () => ({ left: index * 120, right: index * 120 + 100,
        top: zoneType === 'extra-monster' ? 200 : side === 'player' ? 300 : 100,
        bottom: zoneType === 'extra-monster' ? 280 : side === 'player' ? 380 : 180 }) };
    if (zoneType === 'extra-monster' && side !== 'shared') classes.add(`${side}-controlled`);
    zones.push(value);
    return value;
  };
  for (const side of ['player', 'opponent']) for (let index = 0; index < 5; index += 1) zone(side, 'monster', index);
  for (let index = 0; index < 2; index += 1) zone(game.extraMonsterZones[index]?.controllerId ?? 'shared', 'extra-monster', index);
  const fieldListeners = new Map();
  const field = { addEventListener: (name, listener) => fieldListeners.set(name, listener),
    dispatch: event => fieldListeners.get('click')?.(event) };
  const context = vm.createContext({ game, selectedHandUid: null, selectedAttackerIndex: null,
    activeDialog: null, pendingDecisionResolver: null,
    document: {
      getElementById: id => id === 'parallax-container' ? field : null,
      querySelectorAll(selector) {
        return zones.filter(value => selector.split(',').some(part => {
          const classes = [...part.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
          const attributes = [...part.matchAll(/\[data-([\w-]+)="([^"]+)"\]/g)];
          return classes.every(name => value.classList.contains(name))
            && attributes.every(match => value.dataset[match[1].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] === match[2]);
        }));
      },
      querySelector(selector) {
        const index = Number(selector.match(/data-index="(\d+)"/)?.[1]);
        return zones.find(value => Number(value.dataset.index) === index && value.classList.contains(
          selector.startsWith('.extra-m-zone') ? 'extra-m-zone' : 'opponent-m-zone')) ?? null;
      }
    },
    getZonePan: () => 0, playClick() {}, addLogEntry() {}, updateBoardZoneAccessibility() {}
  });
  vm.runInContext(highlights, context);
  vm.runInContext(forwardingRegistration, context);
  for (const value of zones) {
    context.zone = value;
    // Each real registration closes over its own zone, as in the shipped loop.
    vm.runInContext(`((zone) => { ${clickRegistration}\n${contextRegistration}\n${keyRegistration} })(zone)`, context);
  }
  const submissions = [];
  let battleResult;
  const execute = game.executeAttack.bind(game);
  game.executeAttack = (attacker, target) => {
    submissions.push(JSON.parse(JSON.stringify({ attacker, target })));
    battleResult = execute(attacker, target);
    return battleResult;
  };
  const getZone = (side, type, index) => zones.find(value => value.dataset.side === side
    && value.dataset.zoneType === type && Number(value.dataset.index) === index);
  return { game, C, events, context, zones, submissions, getZone,
    forwardAt(target, { clientX, clientY, alreadyTargeted = false, control = false } = {}) {
      const bounds = target?.getBoundingClientRect();
      const event = { clientX: clientX ?? (bounds.left + bounds.right) / 2,
        clientY: clientY ?? (bounds.top + bounds.bottom) / 2,
        target: { className: 'duel-board-shadow-box', closest: selector => selector === '.card-zone'
          ? alreadyTargeted ? target : null : control ? {} : null }, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
      field.dispatch(event);
      return event;
    },
    async finishAttack() {
      assert.equal(await battleResult, true, 'The real native attack command must complete');
      assert.equal(game.nativeError, null);
      assert.deepEqual(game.runtime.errors, []);
      assert.equal(game.runtime.options.flags, NATIVE_TCG_DUEL_FLAGS);
    } };
}

for (const startingPlayer of ['player', 'opponent']) {
  test(`clicking an empty highlighted opponent zone resolves a real direct attack with human controller ${startingPlayer === 'player' ? 0 : 1}`, async () => {
    const f = await fixture({ startingPlayer });
    try {
      assert.equal(f.game.playerController, startingPlayer === 'player' ? 0 : 1);
      await f.getZone('player', 'monster', 0).click();
      assert.equal(f.context.selectedAttackerIndex, 0);
      const target = f.getZone('opponent', 'monster', 4);
      assert.equal(target.classList.contains('can-target'), true);
      await target.click();
      await f.finishAttack();
      assert.deepEqual(f.submissions, [{ attacker: 0, target: null }]);
      assert.equal(f.context.selectedAttackerIndex, null);
      assert.equal(f.game.opponentLP, 5000);
      assert.ok(f.events.some(event => event.type === 'attack-direct'));
      assert.equal(f.game.getAvailableActions().attackCardUids.length, 0);
    } finally { f.game.dispose(); }
  });
}

test('clicking an occupied highlighted zone targets that exact defender and applies actual battle damage', async () => {
  const f = await fixture({ defender: {} });
  try {
    await f.getZone('player', 'monster', 0).click();
    const target = f.getZone('opponent', 'monster', 3);
    assert.equal(target.classList.contains('can-target'), true);
    assert.equal(f.getZone('opponent', 'monster', 4).classList.contains('can-target'), false);
    await target.click();
    await f.finishAttack();
    assert.deepEqual(f.submissions, [{ attacker: 0, target: 3 }]);
    assert.equal(f.game.opponentLP, 7500);
    assert.equal(f.game.opponentMonsters[3], null);
    assert.ok(f.game.opponentGraveyard.some(card => Number(card.id) === 46986414));
    assert.ok(f.events.some(event => event.type === 'attack-monster'));
  } finally { f.game.dispose(); }
});

test('shared Extra Monster Zone clicks preserve both physical references through a real native battle', async () => {
  const f = await fixture({ defender: { extra: true }, extraAttacker: true });
  try {
    assert.equal(f.game.playerController, 1);
    await f.getZone('player', 'extra-monster', 0).click();
    const target = f.getZone('opponent', 'extra-monster', 1);
    assert.equal(target.classList.contains('can-target'), true);
    await target.click();
    await f.finishAttack();
    assert.deepEqual(f.submissions, [{ attacker: { zoneType: 'extra', zoneIndex: 0 },
      target: { zoneType: 'extra', zoneIndex: 1 } }]);
    assert.equal(f.game.opponentLP, 5300);
    assert.equal(f.game.getMonsterEntries('opponent').length, 0);
    assert.ok(f.game.opponentGraveyard.some(card => Number(card.id) === 45231177));
    assert.equal(f.game.getMonsterEntry('player', { zoneType: 'extra', zoneIndex: 0 }).card.id, 23995346);
  } finally { f.game.dispose(); }
});

for (const input of ['contextmenu', 'keydown']) {
  test(`${input} cannot change a monster position behind a pending choice, but works again after it finishes`, async () => {
    const f = await fixture();
    try {
      assert.equal(await f.game.changePhase('main2'), true);
      const card = f.game.playerMonsters[0];
      assert.ok(f.game.getAvailableActions().positionChangeCardUids.includes(card.uid));
      const submissions = [];
      let result;
      const toggle = f.game.toggleMonsterPosition.bind(f.game);
      f.game.toggleMonsterPosition = reference => {
        submissions.push(reference);
        result = toggle(reference);
        return result;
      };
      const event = () => ({ key: 'R', preventDefault() {} });
      const zone = f.getZone('player', 'monster', 0);
      f.context.pendingDecisionResolver = () => {};
      zone.dispatch(input, event());
      assert.deepEqual(submissions, []);
      assert.equal(f.game.playerMonsters[0].position, 'attack');
      f.context.pendingDecisionResolver = null;
      f.context.activeDialog = { id: 'action-modal' };
      zone.dispatch(input, event());
      assert.deepEqual(submissions, []);
      assert.equal(f.game.playerMonsters[0].position, 'attack');
      f.context.activeDialog = null;
      zone.dispatch(input, event());
      assert.deepEqual(submissions, [0]);
      assert.equal(await result, true);
      assert.equal(f.game.playerMonsters[0].position, 'defense');
      assert.equal(f.game.nativeError, null);
      assert.deepEqual(f.game.runtime.errors, []);
    } finally { f.game.dispose(); }
  });
}

test('a CSS 3D wrapper click reaches the field listener, forwards its unique red target and resolves real damage', async () => {
  const f = await fixture();
  try {
    await f.getZone('player', 'monster', 0).click();
    const target = f.getZone('opponent', 'monster', 4);
    assert.equal(target.classList.contains('can-target'), true);
    const event = f.forwardAt(target);
    assert.equal(event.prevented && event.stopped, true);
    assert.equal(f.submissions.length, 1);
    await f.finishAttack();
    assert.deepEqual(f.submissions, [{ attacker: 0, target: null }]);
    assert.equal(f.game.opponentLP, 5000);
  } finally { f.game.dispose(); }
});

test('CSS 3D forwarding never guesses between overlapping targets or targets outside the pointer', async () => {
  const f = await fixture();
  try {
    await f.getZone('player', 'monster', 0).click();
    const target = f.getZone('opponent', 'monster', 4);
    f.getZone('opponent', 'monster', 3).getBoundingClientRect = target.getBoundingClientRect;
    const ambiguous = f.forwardAt(target);
    assert.equal(ambiguous.prevented, false);
    assert.equal(ambiguous.stopped, false);
    assert.deepEqual(f.submissions, []);
    const outside = f.forwardAt(target, { clientX: 9999, clientY: 9999 });
    assert.equal(outside.prevented, false);
    const invalid = f.forwardAt(target, { clientX: NaN, clientY: NaN });
    assert.equal(invalid.prevented, false);
    assert.equal(f.game.opponentLP, 8000);
    assert.ok(f.game.getAvailableActions().attackCardUids.length > 0);
  } finally { f.game.dispose(); }
});

test('CSS 3D forwarding preserves native zone events and refuses coordinate-free keyboard clicks', async () => {
  const f = await fixture();
  try {
    await f.getZone('player', 'monster', 0).click();
    const target = f.getZone('opponent', 'monster', 4);
    const native = f.forwardAt(target, { alreadyTargeted: true });
    assert.equal(native.prevented, false);
    target.getBoundingClientRect = () => ({ left: -10, right: 10, top: -10, bottom: 10 });
    const keyboard = f.forwardAt(target, { clientX: 0, clientY: 0 });
    assert.equal(keyboard.prevented, false);
    const control = f.forwardAt(target, { clientX: 5, clientY: 5, control: true });
    assert.equal(control.prevented, false);
    assert.deepEqual(f.submissions, []);
    assert.equal(f.game.opponentLP, 8000);
  } finally { f.game.dispose(); }
});
