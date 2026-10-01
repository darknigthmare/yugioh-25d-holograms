import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const mainSource = readFileSync(new URL('../main.js', import.meta.url), 'utf8');

// Exercise the shipped handlers independently of audio, network and bootstrap.
function productionFunction(name) {
  const pattern = new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`);
  const match = mainSource.match(pattern);
  assert.ok(match, `Missing production handler: ${name}`);
  return match[0];
}

function zone(side, type, { visible = false, occupied = true, classes = [] } = {}) {
  const attributes = new Map([['aria-label', `${side} ${type}`]]);
  return {
    dataset: { side, zoneType: type, index: '0', baseAriaLabel: `${side} ${type}` },
    classList: { contains: value => classes.includes(value) },
    querySelector: selector => occupied && (
      selector.includes('data-card-visible="false"') ? !visible
        : !selector.includes('data-card-visible') || visible
    ) ? {} : null,
    getAttribute: name => attributes.get(name),
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: name => attributes.delete(name),
    attributes,
    tabIndex: -1
  };
}

test('own Set monster, Spell and Field zones remain keyboard reachable without exposing opposing Set cards', () => {
  const zones = [zone('player', 'monster'), zone('player', 'spell'), zone('player', 'field'),
    zone('opponent', 'monster'), zone('opponent', 'spell'), zone('player', 'monster', { occupied: false })];
  const context = vm.createContext({ document: { querySelectorAll: () => zones } });
  vm.runInContext(productionFunction('updateBoardZoneAccessibility'), context);
  context.updateBoardZoneAccessibility();
  for (const own of zones.slice(0, 3)) {
    assert.equal(own.tabIndex, 0);
    assert.equal(own.attributes.get('aria-disabled'), 'false');
  }
  for (const inaccessible of zones.slice(3)) {
    assert.equal(inaccessible.tabIndex, -1);
    assert.equal(inaccessible.attributes.get('aria-disabled'), 'true');
  }
});

test('opposing Set monster stays keyboard reachable when it is a legal battle target', () => {
  const target = zone('opponent', 'monster', { classes: ['can-target'] });
  const context = vm.createContext({ document: { querySelectorAll: () => [target] } });
  vm.runInContext(productionFunction('updateBoardZoneAccessibility'), context);
  context.updateBoardZoneAccessibility();
  assert.equal(target.tabIndex, 0);
  assert.match(target.attributes.get('aria-label'), /cible d’attaque légale/);
});

function monsterMenuFixture(overrides = {}, onDecision) {
  const card = {
    name: 'Monstre posé', uid: 'set-card', runtimeInstanceId: 'on-field-1',
    isSetFaceDown: true, isLinkMonster: false, extra_type: '', turnSummoned: 1,
    hasChangedPositionThisTurn: false, hasAttacked: false, attacksDeclaredThisTurn: 0,
    ...overrides
  };
  const entry = { card, zoneIndex: 0, zoneType: 'main' };
  const calls = [];
  const requests = [];
  const game = {
    currentTurn: 'player', currentPhase: 'main1', turnCount: 2, isResolvingAction: false,
    pendingSummon: null, pendingExtraSummon: null, isDiscarding: false,
    chain: { chainStatus: 'idle' },
    getMonsterEntry: () => entry, hasMonsterAttacked: () => false,
    getAvailableActions: () => ({ monsterEffects: [{ zoneIndex: 0, zoneType: 'main' }] }),
    toggleMonsterPosition: reference => calls.push(['position', reference]),
    activateMonsterEffect: reference => calls.push(['effect', reference])
  };
  const context = vm.createContext({
    game, announceStatus: () => {},
    requestUiDecision: async request => {
      requests.push(request);
      return onDecision ? onDecision({ request, card, game, entry, context }) : 'position';
    }
  });
  vm.runInContext(productionFunction('openMonsterActionMenu'), context);
  return { context, card, game, entry, calls, requests };
}

test('touch activation of an eligible Set monster offers Flip Summon and dispatches the real position action', async () => {
  const fixture = monsterMenuFixture();
  await fixture.context.openMonsterActionMenu(0);
  assert.equal(fixture.requests.length, 1);
  assert.deepEqual(Array.from(fixture.requests[0].choices, choice => choice.value), ['position']);
  assert.match(fixture.requests[0].choices[0].label, /FLIP/i);
  assert.deepEqual(fixture.calls, [['position', 0]]);
});

for (const [reason, fields] of [
  ['Set this turn', { turnSummoned: 2 }],
  ['already changed position', { hasChangedPositionThisTurn: true }],
  ['already declared an attack', { attacksDeclaredThisTurn: 1, hasAttacked: true }]
]) {
  test(`the Set monster action menu never offers an illegal Flip Summon: ${reason}`, async () => {
    const fixture = monsterMenuFixture(fields);
    await fixture.context.openMonsterActionMenu(0);
    assert.equal(fixture.requests.length, 0);
    assert.deepEqual(fixture.calls, []);
  });
}

test('a pending monster menu cannot act on a replacement duel', async () => {
  const fixture = monsterMenuFixture({}, ({ context, game }) => {
    context.game = { ...game };
    return 'position';
  });
  await fixture.context.openMonsterActionMenu(0);
  assert.deepEqual(fixture.calls, []);
});

test('a pending monster menu cannot follow a card that left and re-entered its zone', async () => {
  const fixture = monsterMenuFixture({}, ({ card }) => {
    card.runtimeInstanceId = 'on-field-reentered';
    return 'position';
  });
  await fixture.context.openMonsterActionMenu(0);
  assert.deepEqual(fixture.calls, []);
});

function outsideClickFixture() {
  const start = mainSource.indexOf('// Click outside board zones cancels');
  const end = mainSource.indexOf('\n});', start) + '\n});'.length;
  assert.ok(start >= 0 && end > start, 'Missing outside-board click handler');
  const cancellations = [];
  let handler;
  const context = vm.createContext({
    document: {
      addEventListener: (_, listener) => { handler = listener; },
      querySelectorAll: () => []
    },
    game: {
      pendingSummon: {}, pendingExtraSummon: {},
      cancelSummonTribute: () => cancellations.push('tribute'),
      cancelExtraSummon: () => cancellations.push('extra')
    },
    selectedAttackerIndex: 0, selectedHandUid: 'hand-card',
    updateBattleHighlights: () => {},
    clearSelectedHandCard: () => cancellations.push('hand')
  });
  vm.runInContext(mainSource.slice(start, end), context);
  return { handler, context, cancellations };
}

test('the view selector preserves in-progress tribute, Extra and hand selections', () => {
  const fixture = outsideClickFixture();
  fixture.handler({ target: { closest: selector => selector === '#btn-toggle-view' ? {} : null } });
  assert.deepEqual(fixture.cancellations, []);
  assert.equal(fixture.context.selectedAttackerIndex, 0);
  assert.equal(fixture.context.selectedHandUid, 'hand-card');
});

test('an actual click outside duel controls still cancels local selections', () => {
  const fixture = outsideClickFixture();
  fixture.handler({ target: { closest: () => null } });
  assert.deepEqual(fixture.cancellations, ['tribute', 'extra', 'hand']);
  assert.equal(fixture.context.selectedAttackerIndex, null);
});

function setCardMenuFixture(zoneType, onDecision, fields = {}) {
  const card = { name: 'Carte posée', card_type: 'spell', isSetFaceDown: true,
    uid: 'set-spell', runtimeInstanceId: 'set-instance', ...fields };
  const calls = [];
  const requests = [];
  const game = {
    currentTurn: 'player', currentPhase: 'main1', turnCount: 2,
    isResolvingAction: false, pendingSummon: null, pendingExtraSummon: null, isDiscarding: false,
    chain: { chainStatus: 'idle' }, playerFieldSpell: zoneType === 'field' ? card : null,
    playerSpells: zoneType === 'spell' ? [card] : [],
    activateSetFieldSpell: side => calls.push(['field', side]),
    activateSetSpellTrap: index => calls.push(['spell', index])
  };
  const context = vm.createContext({ game, announceStatus: () => {},
    requestUiDecision: async request => {
      requests.push(request);
      return onDecision ? onDecision({ card, game, context }) : 'activate';
    }
  });
  vm.runInContext(productionFunction('openSetCardActionMenu'), context);
  return { context, game, card, calls, requests };
}

for (const zoneType of ['spell', 'field']) {
  test(`a Set ${zoneType} activates through the shared game action after an accessible choice`, async () => {
    const fixture = setCardMenuFixture(zoneType);
    await fixture.context.openSetCardActionMenu(zoneType, 0);
    assert.equal(fixture.requests.length, 1);
    assert.deepEqual(fixture.calls, [[zoneType, zoneType === 'field' ? 'player' : 0]]);
  });

  test(`a cancelled Set ${zoneType} choice never activates its card`, async () => {
    const fixture = setCardMenuFixture(zoneType, () => null);
    await fixture.context.openSetCardActionMenu(zoneType, 0);
    assert.deepEqual(fixture.calls, []);
  });

  test(`a Set ${zoneType} menu never follows a card that left and returned`, async () => {
    const fixture = setCardMenuFixture(zoneType, ({ card }) => {
      card.runtimeInstanceId = 'returned-set-instance';
      return 'activate';
    });
    await fixture.context.openSetCardActionMenu(zoneType, 0);
    assert.deepEqual(fixture.calls, []);
  });
}

test('Set Traps route to their effect response windows instead of activating freely in Main Phase', async () => {
  const fixture = setCardMenuFixture('spell', null, { card_type: 'trap' });
  await fixture.context.openSetCardActionMenu('spell', 0);
  assert.equal(fixture.requests.length, 0);
  assert.deepEqual(fixture.calls, []);
});

test('a required single-target choice hides cancellation and resolves the chosen identity', async () => {
  const options = [];
  const hidden = new Set();
  let context;
  context = vm.createContext({
    pendingDecisionResolver: null,
    decisionModal: { dataset: {} }, decisionTitle: {}, decisionDescription: {},
    decisionOptions: { innerHTML: '', appendChild: button => options.push(button), querySelector: () => options[0] },
    decisionCancelBtn: { classList: {
      add: name => hidden.add(name), remove: name => hidden.delete(name),
      toggle: (name, enabled) => enabled ? hidden.add(name) : hidden.delete(name)
    } },
    document: { createElement: () => {
      const button = {};
      button.addEventListener = (name, listener) => { if (name === 'click') button.click = listener; };
      return button;
    } },
    openDialog: () => {},
    finishDecision: value => context.pendingDecisionResolver(value)
  });
  vm.runInContext(productionFunction('requestUiDecision'), context);
  const choice = context.requestUiDecision({ side: 'player', type: 'select-required-target',
    required: true, candidates: [{ uid: 'selected-target', name: 'Cible publique' }] });
  assert.equal(hidden.has('hidden'), true);
  assert.equal(context.decisionModal.dataset.dismissible, 'false');
  options[0].click();
  assert.equal(await choice, 'selected-target');
});
