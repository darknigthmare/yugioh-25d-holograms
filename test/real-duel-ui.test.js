import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_FIELD_ENVIRONMENT_ID,
  FALLBACK_FIELD_ENVIRONMENT_ID,
  FIELD_ENVIRONMENT_REGISTRY,
  getFieldEnvironmentForCardId,
  normalizeCardId,
  resolveFieldEnvironment,
  resolveFieldEnvironmentSelection
} from '../src/ui/FieldEnvironmentRegistry.js';
import {
  EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT,
  FIELD_SPELL_ENVIRONMENT_CATALOG
} from '../src/ui/FieldSpellEnvironmentCatalog.js';
import { RealDuelView } from '../src/ui/RealDuelView.js';
import {
  DUEL_VIEW_MODES,
  DuelViewController
} from '../src/ui/DuelViewController.js';

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.values = new Set();
  }

  setFromString(value) {
    this.values = new Set(String(value || '').split(/\s+/).filter(Boolean));
    this._sync();
  }

  add(...tokens) {
    tokens.forEach(token => this.values.add(token));
    this._sync();
  }

  remove(...tokens) {
    tokens.forEach(token => this.values.delete(token));
    this._sync();
  }

  contains(token) {
    return this.values.has(token);
  }

  toggle(token, force) {
    const enabled = force === undefined ? !this.contains(token) : Boolean(force);
    if (enabled) this.values.add(token);
    else this.values.delete(token);
    this._sync();
    return enabled;
  }

  _sync() {
    this.owner._className = [...this.values].join(' ');
  }
}

class FakeStyle {
  constructor() {
    this.properties = new Map();
    this.pointerEvents = '';
    this.animationPlayState = '';
  }

  setProperty(property, value) {
    this.properties.set(property, String(value));
  }

  getPropertyValue(property) {
    return this.properties.get(property) || '';
  }

  removeProperty(property) {
    const previous = this.getPropertyValue(property);
    this.properties.delete(property);
    return previous;
  }
}

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.style = new FakeStyle();
    this.classList = new FakeClassList(this);
    this._className = '';
    this.textContent = '';
    this.hidden = false;
    this.inert = false;
    this.tabIndex = 0;
    this.disabled = false;
    this.listeners = new Map();
  }

  get className() {
    return this._className;
  }

  set className(value) {
    this.classList.setFromString(value);
  }

  get firstChild() {
    return this.children[0] || null;
  }

  set id(value) {
    this.setAttribute('id', value);
  }

  get id() {
    return this.getAttribute('id') || '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ type, target: this });
    }
  }

  appendChild(child) {
    child.parentNode?.removeChild?.(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, reference) {
    child.parentNode?.removeChild?.(child);
    const index = this.children.indexOf(reference);
    child.parentNode = this;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    this.parentNode?.removeChild?.(this);
  }

  querySelector(selector) {
    return this._walk().find(element => element.matches(selector)) || null;
  }

  matches(selector) {
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    if (selector === '[data-real-duel-view-layer="true"]') {
      return this.dataset.realDuelViewLayer === 'true';
    }
    return false;
  }

  _walk() {
    return this.children.flatMap(child => [child, ...child._walk()]);
  }
}

class FakeDocument {
  constructor() {
    this.root = new FakeElement('body', this);
    this.hidden = false;
    this.listeners = new Map();
  }

  createElement(tagName) {
    return new FakeElement(tagName, this);
  }

  querySelector(selector) {
    if (this.root.matches(selector)) return this.root;
    return this.root.querySelector(selector);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ type, target: this });
    }
  }
}

function createDomFixture() {
  const documentRef = new FakeDocument();
  const app = documentRef.createElement('div');
  app.className = 'app-container';
  const button = documentRef.createElement('button');
  button.id = 'btn-toggle-view';
  const field = documentRef.createElement('main');
  field.id = 'parallax-container';
  const wrapper = documentRef.createElement('div');
  wrapper.className = 'duel-board-shadow-box';
  const board = documentRef.createElement('div');
  board.id = 'duel-board';
  const existingZone = documentRef.createElement('div');
  existingZone.className = 'card-zone';
  const existingCard = documentRef.createElement('div');
  existingCard.className = 'card-entity';

  documentRef.root.appendChild(app);
  app.appendChild(button);
  app.appendChild(field);
  field.appendChild(wrapper);
  wrapper.appendChild(board);
  board.appendChild(existingZone);
  existingZone.appendChild(existingCard);

  return {
    documentRef,
    app,
    button,
    field,
    wrapper,
    board,
    existingZone,
    existingCard
  };
}

function activeFieldCard(id, sequence = 1, extra = {}) {
  return {
    id,
    uid: `field-${id}-${sequence}`,
    card_type: 'spell',
    type: 'Field Spell',
    race: 'Field',
    isFieldSpell: true,
    location: 'field_zone',
    fieldActivationSequence: sequence,
    ...extra
  };
}

test('Field Environment registry contains every required immutable environment', () => {
  assert.equal(DEFAULT_FIELD_ENVIRONMENT_ID, 'clearing');
  assert.equal(FALLBACK_FIELD_ENVIRONMENT_ID, 'generic');
  assert.deepEqual(
    Object.keys(FIELD_ENVIRONMENT_REGISTRY),
    [
      'clearing',
      'cave',
      'generic',
      'yami',
      'umi',
      'forest',
      'mountain',
      'sogen',
      'wasteland',
      'toon-world',
      'swamp',
      'volcanic',
      'ice',
      'graveyard',
      'city-modern',
      'city-fantasy',
      'castle-palace',
      'temple-sanctuary',
      'arena-stadium',
      'theater-amusement',
      'industrial-lab',
      'mechanical-fortress',
      'digital-cyber',
      'cosmic-dimensional',
      'celestial-light'
    ]
  );
  assert.ok(Object.values(FIELD_ENVIRONMENT_REGISTRY).every(Object.isFrozen));
  assert.ok(Object.values(FIELD_ENVIRONMENT_REGISTRY).every(environment => (
    Object.isFrozen(environment.associatedCardIds)
    && /^\/environments\/[a-z0-9-]+-original\.webp$/.test(environment.backdropUrl)
  )));
  const mappedCardIds = new Set(
    Object.values(FIELD_ENVIRONMENT_REGISTRY)
      .flatMap(environment => environment.associatedCardIds)
  );
  assert.equal(mappedCardIds.size, EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT);
  for (const entry of FIELD_SPELL_ENVIRONMENT_CATALOG) {
    assert.equal(getFieldEnvironmentForCardId(entry.cardId)?.id, entry.environmentId);
  }
  assert.equal(getFieldEnvironmentForCardId('59197169').id, 'yami');
  assert.equal(getFieldEnvironmentForCardId(22702055).id, 'umi');
  assert.equal(getFieldEnvironmentForCardId('87430998').id, 'forest');
  assert.equal(getFieldEnvironmentForCardId('50913601').id, 'mountain');
  assert.equal(getFieldEnvironmentForCardId('86318356').id, 'sogen');
  assert.equal(getFieldEnvironmentForCardId('23424603').id, 'wasteland');
  assert.equal(
    getFieldEnvironmentForCardId('15259703'),
    null,
    'Toon World is a Continuous Spell and must not drive a Field environment'
  );
});

test('Field Environment resolver uses the configured base and never uses translated names', () => {
  assert.equal(resolveFieldEnvironment(null).id, 'clearing');
  assert.equal(
    resolveFieldEnvironment({}, { baseEnvironmentId: 'cave' }).id,
    'cave'
  );

  const yami = activeFieldCard('59197169');
  yami.name = 'Nom librement traduit';
  yami.name_en = 'Another localized name';
  assert.equal(resolveFieldEnvironment({ playerFieldSpell: yami }).id, 'yami');
});

test('face-down, pending, unresolved and negated candidates cannot reveal an environment', () => {
  for (const state of [
    { hidden: true },
    { redacted: true },
    { concealed: true },
    { public: false },
    { visibility: 'private' },
    { isSetFaceDown: true },
    { faceDown: true },
    { activationPending: true },
    { fieldActivationState: 'pending' },
    { fieldActivationState: 'set' },
    { activationResolved: false },
    { resolvedSuccessfully: false },
    { activationNegated: true },
    { active: false }
  ]) {
    const card = activeFieldCard('59197169', 2, state);
    assert.equal(
      resolveFieldEnvironment({ playerFieldSpell: card }).id,
      'clearing'
    );
  }

  assert.equal(
    resolveFieldEnvironment({
      playerFieldSpell: activeFieldCard('59197169', 2, {
        fieldActivationState: 'resolved',
        runtimeInstanceId: 'runtime-current',
        fieldActivationRuntimeInstanceId: 'runtime-stale',
        resolvedSuccessfully: true
      })
    }).id,
    'clearing'
  );

  const previousField = activeFieldCard('22702055', 1);
  const pendingReplacement = {
    card: activeFieldCard('59197169', 2),
    activationPending: true
  };
  assert.equal(
    resolveFieldEnvironment({
      playerFieldSpell: previousField,
      activeFieldSpells: [pendingReplacement]
    }).id,
    'umi'
  );
});

test('only actual Field Spells may select an environment', () => {
  const toonWorld = activeFieldCard('15259703', 4, {
    card_type: 'spell',
    type: 'Spell Card',
    race: 'Continuous',
    isFieldSpell: false
  });
  assert.equal(
    resolveFieldEnvironment({ playerFieldSpell: toonWorld }).id,
    'clearing'
  );

  const hiddenWrapper = {
    hidden: true,
    card: activeFieldCard('59197169', 5)
  };
  assert.equal(
    resolveFieldEnvironment({ activeFieldSpells: [hiddenWrapper] }).id,
    'clearing'
  );
});

test('highest finite resolution sequence wins and sequence ties stay deterministic', () => {
  const playerField = activeFieldCard('59197169', 9);
  const opponentField = activeFieldCard('22702055', 12);
  const state = {
    playerFieldSpell: playerField,
    opponentFieldSpell: opponentField,
    field: {
      playerFieldSpellZone: playerField,
      opponentFieldSpellZone: opponentField
    }
  };

  const selection = resolveFieldEnvironmentSelection(state);
  assert.equal(selection.environmentId, 'umi');
  assert.equal(selection.sourceCardId, '22702055');
  assert.equal(selection.sourceUid, opponentField.uid);
  assert.equal(selection.sequence, 12);
  assert.ok(Object.isFrozen(selection));

  const tiedState = {
    playerFieldSpell: activeFieldCard('59197169', 3),
    opponentFieldSpell: activeFieldCard('22702055', 3)
  };
  assert.equal(resolveFieldEnvironment(tiedState).id, 'umi');
  assert.equal(resolveFieldEnvironment(tiedState).id, 'umi');

  const wrappedSequence = activeFieldCard('59197169', 14);
  assert.equal(
    resolveFieldEnvironment({
      activeFieldSpells: [{
        card: wrappedSequence,
        fieldActivationSequence: null,
        resolved: true
      }]
    }).id,
    'yami',
    'an empty wrapper sequence must not hide the resolved card sequence'
  );
});

test('an active unknown Field Spell safely selects the generic fallback', () => {
  const unknown = activeFieldCard('99999999', 4);
  const selection = resolveFieldEnvironmentSelection({
    activeFieldSpells: [{ card: unknown, resolved: true, sequence: 4 }]
  });
  assert.equal(selection.environmentId, 'generic');
  assert.equal(selection.sourceCardId, '99999999');
  assert.equal(selection.isFallback, true);

  assert.equal(normalizeCardId(' 59197169 '), '59197169');
  assert.equal(normalizeCardId('00059197169'), '59197169');
  assert.equal(normalizeCardId('000'), '0');
  assert.equal(normalizeCardId(0), '0');
  assert.equal(normalizeCardId('not-an-id'), null);
  assert.equal(
    resolveFieldEnvironment({ playerFieldSpell: { id: '<unsafe>' } }).id,
    'clearing'
  );
});

test('RealDuelView lazily mounts one non-interactive layer without moving the board', async () => {
  const fixture = createDomFixture();
  const view = new RealDuelView({
    documentRef: fixture.documentRef,
    fieldElement: fixture.field,
    boardElement: fixture.board
  });
  const gameState = { playerFieldSpell: activeFieldCard('59197169', 1) };

  assert.equal(view.isMounted, false);
  const layer = await view.activate(gameState);
  assert.equal(view.isMounted, true);
  assert.equal(view.getGameState(), gameState);
  assert.equal(fixture.field.children.length, 2);
  assert.equal(fixture.field.children[0], layer);
  assert.equal(fixture.field.children[1], fixture.wrapper);
  assert.equal(fixture.board.parentNode, fixture.wrapper);
  assert.equal(fixture.existingCard.parentNode, fixture.existingZone);
  assert.equal(layer.style.pointerEvents, 'none');
  assert.equal(layer.getAttribute('aria-hidden'), 'true');
  assert.equal(layer.getAttribute('role'), 'presentation');
  assert.equal(layer.inert, true);
  assert.equal(layer.hidden, false);
  assert.equal(layer.dataset.environmentId, 'yami');
  assert.equal(
    layer.style.getPropertyValue('--real-environment-backdrop'),
    'url("/environments/field-occult-dark-original.webp")'
  );
  assert.equal(
    layer.style.getPropertyValue('--real-environment-backdrop-opacity'),
    '1'
  );
  assert.equal(
    fixture.field.style.getPropertyValue('--real-environment-accent'),
    FIELD_ENVIRONMENT_REGISTRY.yami.accentColor
  );

  assert.equal(await view.activate(gameState), layer);
  assert.equal(fixture.field.children.length, 2);
});

test('RealDuelView pauses inactive visuals and reopens directly on current state', async () => {
  const fixture = createDomFixture();
  const view = new RealDuelView({
    documentRef: fixture.documentRef,
    fieldElement: fixture.field,
    boardElement: fixture.board
  });
  const yamiState = { playerFieldSpell: activeFieldCard('59197169', 1) };
  const umiState = { playerFieldSpell: activeFieldCard('22702055', 2) };

  const layer = await view.activate(yamiState);
  assert.equal(layer.dataset.environmentId, 'yami');
  view.deactivate();
  assert.equal(layer.hidden, true);
  assert.equal(layer.dataset.active, 'false');
  assert.equal(layer.style.animationPlayState, 'paused');

  view.update(umiState);
  assert.equal(view.getGameState(), umiState);
  assert.equal(layer.dataset.environmentId, 'yami');

  await view.activate();
  assert.equal(layer.dataset.environmentId, 'umi');
  assert.equal(layer.style.animationPlayState, 'running');
  assert.equal(layer.hidden, false);

  fixture.documentRef.hidden = true;
  fixture.documentRef.dispatch('visibilitychange');
  assert.equal(layer.hidden, true);
  assert.equal(layer.dataset.active, 'true');
  assert.equal(layer.style.animationPlayState, 'paused');

  fixture.documentRef.hidden = false;
  fixture.documentRef.dispatch('visibilitychange');
  assert.equal(layer.hidden, false);
  assert.equal(layer.style.animationPlayState, 'running');

  assert.equal(view.dispose(), true);
  assert.equal(view.dispose(), false);
  assert.equal(
    fixture.documentRef.listeners.get('visibilitychange')?.size || 0,
    0
  );
  assert.equal(fixture.field.children.length, 1);
  assert.equal(
    fixture.field.style.getPropertyValue('--real-environment-accent'),
    ''
  );
  assert.equal(fixture.field.children[0], fixture.wrapper);
  assert.equal(fixture.existingCard.parentNode, fixture.existingZone);
});

test('RealDuelView selects the base environment without a game and sanitizes an adopted layer', async () => {
  const fixture = createDomFixture();
  const adoptedLayer = fixture.documentRef.createElement('div');
  adoptedLayer.dataset.realDuelViewLayer = 'true';
  adoptedLayer.className = 'legacy-layer is-environment-yami';
  adoptedLayer.dataset.environmentId = 'yami';
  adoptedLayer.style.setProperty('--real-environment-accent', 'secret');
  adoptedLayer.style.pointerEvents = 'auto';
  fixture.field.insertBefore(adoptedLayer, fixture.wrapper);
  const view = new RealDuelView({
    documentRef: fixture.documentRef,
    fieldElement: fixture.field,
    boardElement: fixture.board
  });

  assert.equal(await view.activate(null), adoptedLayer);
  assert.equal(adoptedLayer.dataset.environmentId, 'clearing');
  assert.equal(adoptedLayer.style.pointerEvents, 'none');
  assert.equal(adoptedLayer.inert, true);
  assert.equal(adoptedLayer.className, 'real-duel-view-layer is-environment-clearing');
  assert.equal(adoptedLayer.dataset.environmentId, 'clearing');
  assert.notEqual(
    adoptedLayer.style.getPropertyValue('--real-environment-accent'),
    'secret'
  );
  assert.equal(fixture.field.children.length, 2);
});

test('RealDuelView rejects a poisoned remote backdrop before exposing it to CSS', async () => {
  const fixture = createDomFixture();
  const view = new RealDuelView({
    documentRef: fixture.documentRef,
    fieldElement: fixture.field,
    boardElement: fixture.board,
    environmentResolver: () => ({
      environmentId: 'clearing',
      isFallback: false,
      environment: {
        ...FIELD_ENVIRONMENT_REGISTRY.clearing,
        backdropUrl: 'https://example.com/poisoned.webp'
      }
    })
  });

  await assert.rejects(
    view.activate(null),
    /unsafe environment backdrop URL/
  );
  const layer = fixture.field.querySelector('[data-real-duel-view-layer="true"]');
  assert.equal(
    layer.style.getPropertyValue('--real-environment-backdrop'),
    ''
  );
  view.dispose();
});

test('RealDuelView can switch the configured base environment without touching duel state', async () => {
  const fixture = createDomFixture();
  const gameState = { playerLP: 8000 };
  const view = new RealDuelView({
    documentRef: fixture.documentRef,
    fieldElement: fixture.field,
    boardElement: fixture.board
  });
  const layer = await view.activate(gameState);
  assert.equal(layer.dataset.environmentId, 'clearing');

  const selection = view.setEnvironmentOptions({ baseEnvironmentId: 'cave' });
  assert.equal(selection.environmentId, 'cave');
  assert.equal(layer.dataset.environmentId, 'cave');
  assert.equal(view.getGameState(), gameState);
  assert.equal(fixture.existingCard.parentNode, fixture.existingZone);
});

test('RealDuelView safely remounts a layer removed by an external rerender', async () => {
  const fixture = createDomFixture();
  const view = new RealDuelView({
    documentRef: fixture.documentRef,
    fieldElement: fixture.field,
    boardElement: fixture.board
  });
  const originalLayer = await view.activate({
    playerFieldSpell: activeFieldCard('59197169', 1)
  });
  originalLayer.remove();
  assert.equal(view.isMounted, false);

  const selection = view.update({
    playerFieldSpell: activeFieldCard('22702055', 2)
  });
  const remountedLayer = fixture.field.querySelector(
    '[data-real-duel-view-layer="true"]'
  );
  assert.notEqual(remountedLayer, originalLayer);
  assert.equal(view.isMounted, true);
  assert.equal(selection.environmentId, 'umi');
  assert.equal(remountedLayer.dataset.environmentId, 'umi');
  assert.equal(remountedLayer.hidden, false);
  assert.equal(fixture.board.parentNode, fixture.wrapper);
  assert.equal(fixture.existingCard.parentNode, fixture.existingZone);
});

test('DuelViewController uses existing IDs, preserves the live game and loads Real view once', async () => {
  const fixture = createDomFixture();
  const activations = [];
  const updates = [];
  let deactivations = 0;
  let loaderCalls = 0;
  const realView = {
    activate: async gameState => activations.push(gameState),
    update: gameState => {
      updates.push(gameState);
      return gameState;
    },
    deactivate: () => {
      deactivations += 1;
    },
    dispose: () => {}
  };
  const changes = [];
  const controller = new DuelViewController({
    documentRef: fixture.documentRef,
    realViewLoader: async () => {
      loaderCalls += 1;
      return realView;
    },
    onModeChange: (mode, previousMode) => changes.push([mode, previousMode]),
    autoAttach: false
  });
  const liveGame = { playerLP: 8000 };

  assert.deepEqual(DUEL_VIEW_MODES, ['compact', 'arena', 'real']);
  assert.equal(controller.getMode(), 'compact');
  assert.equal(fixture.button.textContent, 'VUE : COMPACTE');
  assert.equal(fixture.button.getAttribute('aria-pressed'), 'false');
  assert.equal(fixture.field.dataset.duelView, 'compact');
  assert.equal(fixture.app.dataset.duelView, 'compact');

  controller.update(liveGame);
  assert.equal(controller.getGameState(), liveGame);
  await controller.setMode('arena');
  assert.equal(loaderCalls, 0);
  assert.equal(fixture.board.classList.contains('arena-mode'), true);
  assert.equal(fixture.board.classList.contains('real-mode'), false);

  await controller.setMode('real');
  assert.equal(loaderCalls, 1);
  assert.equal(controller.getMode(), 'real');
  assert.equal(activations[0], liveGame);
  assert.equal(fixture.board.classList.contains('arena-mode'), false);
  assert.equal(fixture.board.classList.contains('real-mode'), true);
  assert.equal(fixture.field.classList.contains('real-duel-view-active'), true);
  assert.equal(fixture.button.classList.contains('btn-magenta'), true);
  assert.equal(fixture.button.getAttribute('aria-pressed'), 'true');

  const sameLiveGame = liveGame;
  sameLiveGame.playerLP = 7600;
  assert.equal(controller.update(sameLiveGame), sameLiveGame);
  assert.equal(updates.at(-1), liveGame);

  await controller.setMode('compact');
  await controller.setMode('arena');
  await controller.setMode('real');
  assert.equal(loaderCalls, 1);
  assert.equal(activations.at(-1), liveGame);
  assert.ok(deactivations >= 1);
  assert.deepEqual(changes[0], ['arena', 'compact']);
});

test('DuelViewController ignores a stale lazy activation and keeps Classic view usable', async () => {
  const fixture = createDomFixture();
  let resolveLoader;
  let activations = 0;
  const realView = {
    activate: async () => {
      activations += 1;
    },
    update: () => {},
    deactivate: () => {},
    dispose: () => {}
  };
  const loaderPromise = new Promise(resolve => {
    resolveLoader = resolve;
  });
  const controller = new DuelViewController({
    documentRef: fixture.documentRef,
    realViewLoader: () => loaderPromise,
    autoAttach: false
  });

  const pendingRealMode = controller.setMode('real');
  await Promise.resolve();
  assert.equal(fixture.button.disabled, false);
  assert.equal(fixture.button.getAttribute('aria-disabled'), 'true');
  fixture.button.dispatch('click');
  await controller.setMode('compact');
  resolveLoader(realView);

  assert.equal(await pendingRealMode, false);
  assert.equal(controller.getMode(), 'compact');
  assert.equal(activations, 0);
  assert.equal(fixture.button.getAttribute('aria-busy'), 'false');
  assert.equal(fixture.board.classList.contains('real-mode'), false);
});

test('DuelViewController retries a rejected lazy load instead of caching the failure', async () => {
  const fixture = createDomFixture();
  let loaderCalls = 0;
  let activations = 0;
  const errors = [];
  const realView = {
    activate: async () => {
      activations += 1;
    },
    update: () => {},
    deactivate: () => {},
    dispose: () => {}
  };
  const controller = new DuelViewController({
    documentRef: fixture.documentRef,
    realViewLoader: async () => {
      loaderCalls += 1;
      if (loaderCalls === 1) throw new Error('Transient chunk failure');
      return realView;
    },
    onError: error => errors.push(error.message),
    autoAttach: false
  });

  assert.equal(await controller.setMode('real'), false);
  assert.equal(controller.getMode(), 'compact');
  assert.equal(fixture.button.disabled, false);
  assert.equal(fixture.button.getAttribute('aria-disabled'), 'false');

  assert.equal(await controller.setMode('real'), true);
  assert.equal(loaderCalls, 2);
  assert.equal(activations, 1);
  assert.deepEqual(errors, ['Transient chunk failure']);
});

test('DuelViewController reconstructs Real view after an activation failure', async () => {
  const fixture = createDomFixture();
  let loaderCalls = 0;
  let failedDisposals = 0;
  let successfulActivations = 0;
  const controller = new DuelViewController({
    documentRef: fixture.documentRef,
    realViewLoader: async () => {
      loaderCalls += 1;
      if (loaderCalls === 1) {
        return {
          activate: async () => {
            throw new Error('Transient renderer failure');
          },
          update: () => {},
          deactivate: () => {},
          dispose: () => {
            failedDisposals += 1;
          }
        };
      }
      return {
        activate: async () => {
          successfulActivations += 1;
        },
        update: () => {},
        deactivate: () => {},
        dispose: () => {}
      };
    },
    autoAttach: false
  });

  assert.equal(await controller.setMode('real'), false);
  assert.equal(failedDisposals, 1);
  assert.equal(await controller.setMode('real'), true);
  assert.equal(loaderCalls, 2);
  assert.equal(successfulActivations, 1);
});

test('DuelViewController contains an active visual update failure and preserves gameplay', async () => {
  const fixture = createDomFixture();
  const errors = [];
  const changes = [];
  let disposals = 0;
  const realView = {
    activate: async () => {},
    update: () => {
      throw new Error('Invalid visual state');
    },
    deactivate: () => {},
    dispose: () => {
      disposals += 1;
    }
  };
  const controller = new DuelViewController({
    documentRef: fixture.documentRef,
    realViewLoader: async () => realView,
    onError: error => errors.push(error.message),
    onModeChange: (mode, previous) => changes.push([mode, previous]),
    autoAttach: false
  });

  await controller.setMode('real');
  const liveGame = { playerLP: 7400 };
  assert.equal(controller.update(liveGame), null);
  assert.equal(controller.getGameState(), liveGame);
  assert.equal(controller.getMode(), 'compact');
  assert.equal(fixture.board.classList.contains('real-mode'), false);
  assert.equal(disposals, 1);
  assert.deepEqual(errors, ['Invalid visual state']);
  assert.deepEqual(changes.at(-1), ['compact', 'real']);
});

test('DuelViewController rolls back a failed Real view and detaches its button on disposal', async () => {
  const fixture = createDomFixture();
  const errors = [];
  const controller = new DuelViewController({
    documentRef: fixture.documentRef,
    realViewLoader: async () => {
      throw new Error('Renderer unavailable');
    },
    onError: error => errors.push(error.message)
  });

  await controller.setMode('arena');
  assert.equal(await controller.setMode('real'), false);
  assert.equal(controller.getMode(), 'arena');
  assert.equal(fixture.board.classList.contains('arena-mode'), true);
  assert.equal(fixture.board.classList.contains('real-mode'), false);
  assert.equal(fixture.button.getAttribute('aria-busy'), 'false');
  assert.deepEqual(errors, ['Renderer unavailable']);

  assert.equal(controller.dispose(), true);
  assert.equal(controller.dispose(), false);
  const modeAtDisposal = controller.getMode();
  assert.equal(modeAtDisposal, 'compact');
  assert.equal(fixture.board.classList.contains('arena-mode'), false);
  assert.equal(fixture.board.classList.contains('real-mode'), false);
  fixture.button.dispatch('click');
  await Promise.resolve();
  assert.equal(controller.getMode(), modeAtDisposal);
});
