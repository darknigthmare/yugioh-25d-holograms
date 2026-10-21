import assert from 'node:assert/strict';
import test from 'node:test';
import { DuelBoardDecisionController, isBoardDecisionSelectionValid } from '../src/ui/DuelBoardDecisionController.js';

// Small DOM fixture with actual bubbling/capture boundaries, attributes and
// replacement semantics. The controller has no dependency on a browser global.
class Element {
  constructor(document, tag = 'div') {
    this.ownerDocument = document;
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.hidden = false;
    this.textContent = '';
    this.classList = {
      add: (...names) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...names])].join(' '); },
      remove: (...names) => { this.className = this.className.split(' ').filter(value => !names.includes(value)).join(' '); },
      contains: name => this.className.split(' ').includes(name),
      toggle: (name, force) => { const next = force ?? !this.classList.contains(name); this.classList[next ? 'add' : 'remove'](name); return next; }
    };
  }
  get className() { return this.attributes.get('class') ?? ''; }
  set className(value) { this.attributes.set('class', value); }
  get id() { return this.attributes.get('id') ?? ''; }
  set id(value) { this.attributes.set('id', value); }
  get isConnected() { return this === this.ownerDocument.body || Boolean(this.parentElement?.isConnected); }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name.startsWith('data-')) delete this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())];
  }
  appendChild(child) { child.parentElement = this; this.children.push(child); return child; }
  replaceChildren(...children) {
    if (this.contains(this.ownerDocument.activeElement)) this.ownerDocument.activeElement = this.ownerDocument.body;
    for (const child of this.children) child.parentElement = null;
    this.children = [];
    children.forEach(child => this.appendChild(child));
  }
  contains(element) { return element === this || this.children.some(child => child.contains(element)); }
  matches(selector) {
    return selector.split(',').some(part => {
      const terms = part.trim().split(/\s+/);
      const own = terms.pop();
      const id = own.match(/#([\w-]+)/)?.[1];
      if (id && this.id !== id) return false;
      const tag = own.match(/^([a-z]+)/)?.[1];
      if (tag && this.tagName !== tag.toUpperCase()) return false;
      if ([...own.matchAll(/\.([\w-]+)/g)].some(match => !this.classList.contains(match[1]))) return false;
      if ([...own.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)]
        .some(([, name, value]) => name === 'hidden' ? !this.hidden
          : value === undefined ? this.getAttribute(name) === null : this.getAttribute(name) !== value)) return false;
      return !terms.length || Boolean(this.parentElement?.closest(terms.join(' ')));
    });
  }
  closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) ?? []).filter(value => value !== listener)); }
  focus() { this.ownerDocument.activeElement = this; }
  getClientRects() { return this.isConnected && !this.hidden ? [{}] : []; }
  getBoundingClientRect() { return this.rect ?? { left: 20, top: 20, right: 80, bottom: 100 }; }
  click() { return this.ownerDocument.dispatch('click', this); }
}

function fixture() {
  const document = {
    listeners: new Map(),
    createElement: tag => new Element(document, tag),
    defaultView: { getComputedStyle: () => ({ display: 'block', visibility: 'visible' }) },
    addEventListener(type, listener, capture) {
      assert.equal(capture, true);
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type, listener) { this.listeners.set(type, (this.listeners.get(type) ?? []).filter(value => value !== listener)); },
    querySelectorAll(selector) { return this.body.querySelectorAll(selector); },
    querySelector(selector) { return this.body.querySelector(selector); },
    getElementById(id) { return this.querySelector(`#${id}`); },
    dispatch(type, target, fields = {}) {
      const event = { type, target, key: '', prevented: false, stopped: false,
        preventDefault() { this.prevented = true; },
        stopPropagation() { this.stopped = true; },
        stopImmediatePropagation() { this.stopped = true; this.immediate = true; }, ...fields };
      for (const listener of this.listeners.get(type) ?? []) { listener(event); if (event.immediate) break; }
      if (!event.immediate) for (const listener of target.listeners.get(type) ?? []) listener(event);
      return event;
    }
  };
  document.body = new Element(document, 'body');
  document.activeElement = document.body;
  const make = (tag, parent, attributes) => {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes ?? {})) element.setAttribute(key, value);
    parent.appendChild(element);
    return element;
  };
  const before = make('button', document.body, { id: 'btn-next-phase' });
  before.focus();
  const board = make('div', document.body, { id: 'duel-board' });
  const hand = make('div', document.body, { id: 'player-hand' });
  const host = make('section', document.body, { id: 'board-decision-prompt', class: 'hidden' });
  host.hidden = true;
  const zone = (index, side = 'player') => make('div', board,
    { class: 'card-zone', 'data-zone-type': 'monster', 'data-side': side, 'data-index': index, tabindex: '-1', 'aria-label': 'Zone initiale' });
  const card = uid => make('div', hand,
    { class: 'card-entity', 'data-uid': uid, 'data-hand-index': hand.children.length, tabindex: '-1', 'aria-disabled': 'true' });
  const results = [], fallbacks = [], announcements = [];
  const controller = new DuelBoardDecisionController({ documentRef: document, hostElement: host,
    onFinish: value => results.push(value), onFallback: request => fallbacks.push(request), announce: value => announcements.push(value) });
  return { document, board, hand, host, before, zone, card, make, controller, results, fallbacks, announcements };
}

const boardRef = (zoneIndex, side = 'player') => ({ side, zoneType: 'monster', zoneIndex });
const nativeChain = () => ({ side: 'player', nativeKind: 'SELECT_CHAIN', required: true,
  choices: [{ value: 0, label: 'Activer cet effet', boardRef: boardRef(1) }] });

test('a native board choice captures the card activation and preserves its numeric wire response', () => {
  const f = fixture();
  const zone = f.zone(1);
  const child = f.make('span', zone);
  assert.equal(f.controller.show(nativeChain()), true);
  assert.equal(f.host.getAttribute('role'), 'region');
  assert.equal(f.host.getAttribute('aria-modal'), null);
  assert.equal(zone.getAttribute('aria-label'), 'Activer cet effet');
  assert.equal(zone.classList.contains('board-decision-target'), true);
  assert.equal(f.document.dispatch('keydown', zone, { key: 'Tab' }).prevented, false);
  const requiredEscape = f.document.dispatch('keydown', zone, { key: 'Escape' });
  assert.equal(requiredEscape.prevented, true);
  assert.equal(f.controller.active, true);
  const click = f.document.dispatch('click', child);
  assert.equal(click.immediate, true);
  assert.deepEqual(f.results, [0]);
  assert.equal(f.controller.active, false);
  assert.equal(f.document.activeElement, f.before);
  assert.equal(zone.getAttribute('aria-label'), 'Zone initiale');
  assert.equal(zone.getAttribute('tabindex'), '-1');
  assert.equal(zone.classList.contains('board-decision-target'), false);
  assert.equal([...f.document.listeners.values()].flat().length, 0);
});

test('Enter selects a highlighted target and Escape cancels only an optional choice', () => {
  const f = fixture(); const zone = f.zone(1);
  f.controller.show(nativeChain());
  assert.equal(f.document.dispatch('keydown', zone, { key: 'Enter' }).immediate, true);
  assert.deepEqual(f.results, [0]);
  f.controller.show({ ...nativeChain(), required: false });
  f.document.dispatch('keydown', zone, { key: 'Escape' });
  assert.deepEqual(f.results, [0, null]);
});

test('multi-selection keeps exact combinations, maximum and engine validation on the terrain', () => {
  const f = fixture();
  const a = f.card('a'), b = f.card('b'), c = f.card('c');
  const request = { side: 'player', required: true, multiple: true, minimum: 1, maximum: 2,
    candidates: ['a', 'b', 'c'].map(uid => ({ uid, name: uid })),
    validSelections: [['a', 'c']], validateSelection: values => values.includes('c'),
    selectionSummary: values => `Valeur : ${values.length * 2}.` };
  assert.equal(f.controller.show(request), true);
  const confirm = f.host.querySelector('.board-decision-confirm');
  assert.equal(confirm.disabled, true);
  a.click(); b.click();
  assert.equal(confirm.disabled, true);
  c.click(); // Maximum reached; no hidden auto-deselection.
  assert.equal(c.getAttribute('aria-pressed'), 'false');
  b.click(); c.click();
  assert.equal(confirm.disabled, false);
  assert.equal(f.host.querySelector('.board-decision-status').textContent.includes('Valeur : 4.'), true);
  assert.equal(a.classList.contains('board-decision-selected'), true);
  confirm.click();
  assert.deepEqual(f.results, [['a', 'c']]);
  assert.equal(a.getAttribute('aria-disabled'), 'true');
  assert.equal(a.getAttribute('aria-pressed'), null);
});

test('the validation helper rejects duplicates, unknown cards, invalid subsets and failed engine checks', () => {
  const request = { candidates: [{ uid: 'a' }, { uid: 'b' }], minimum: 0, maximum: 1,
    validSelections: [[], ['a']], validateSelection: values => !values.includes('b') };
  assert.equal(isBoardDecisionSelectionValid(request, []), true);
  assert.equal(isBoardDecisionSelectionValid(request, ['a']), true);
  for (const values of [['a', 'a'], ['missing'], ['b'], ['a', 'b']])
    assert.equal(isBoardDecisionSelectionValid(request, values), false);
  assert.equal(isBoardDecisionSelectionValid({ ...request, validateSelection: () => { throw Error('stale'); } }, ['a']), false);
  assert.equal(isBoardDecisionSelectionValid({ ...request, maximum: 0 }, ['a']), false);
});

test('a pending target prevents unrelated cards, drag gestures and position shortcuts from mutating play', () => {
  const f = fixture(); f.zone(1); const other = f.zone(2);
  f.controller.show(nativeChain());
  assert.equal(other.click().immediate, true);
  assert.equal(f.document.dispatch('dragstart', other).prevented, true);
  assert.equal(f.document.dispatch('pointerdown', other).immediate, true);
  assert.equal(f.document.dispatch('keydown', other, { key: 'r' }).prevented, true);
  assert.deepEqual(f.results, []);
  assert.equal(f.controller.active, true);
});

test('native response indices are never mistaken for rendered card identities', () => {
  const f = fixture(); const zero = f.card('0');
  assert.equal(f.controller.show({ side: 'player', nativeKind: 'SELECT_CARD', multiple: true,
    candidates: [{ uid: '0', name: 'Carte face verso' }] }), false);
  assert.equal(zero.classList.contains('board-decision-target'), false);
  assert.equal(f.host.hidden, true);
});

test('piles, missing targets and partial visibility keep the complete conventional picker', () => {
  const f = fixture(); f.zone(1);
  for (const candidates of [
    [{ uid: '0', boardRef: { side: 'player', zoneType: 'graveyard' } }],
    [{ uid: '0', boardRef: boardRef(1) }, { uid: '1', boardRef: boardRef(2) }],
    [{ uid: '0', boardRef: boardRef(1) }, { uid: '1' }]
  ]) assert.equal(f.controller.show({ side: 'player', nativeKind: 'SELECT_CARD', multiple: true, candidates }), false);
  assert.equal(f.document.querySelector('.board-decision-target'), null);
});

test('hidden zones are unavailable without invoking any card identity resolver', () => {
  const f = fixture(); const zone = f.zone(1); zone.hidden = true;
  assert.equal(f.controller.show(nativeChain()), false);
  assert.equal(f.host.hidden, true);
});

test('rerender refresh rebinds targets, preserves selection and restores detached attributes', () => {
  const f = fixture(); const a = f.card('a');
  f.controller.show({ side: 'player', multiple: true, minimum: 1, maximum: 1, candidates: [{ uid: 'a', name: 'A' }] });
  a.click(); a.focus();
  const confirm = f.host.querySelector('.board-decision-confirm');
  f.hand.replaceChildren();
  const replacement = f.card('a');
  assert.equal(f.controller.refresh(), true);
  assert.equal(f.host.querySelector('.board-decision-confirm'), confirm, 'refresh keeps the prompt buttons stable');
  assert.equal(replacement.getAttribute('aria-pressed'), 'true');
  assert.equal(f.document.activeElement, replacement);
  assert.equal(a.classList.contains('board-decision-target'), false);
  confirm.click();
  assert.deepEqual(f.results, [['a']]);
});

test('a disappearing target migrates once to fallback without fabricating an answer', () => {
  const f = fixture(); f.zone(1); const request = nativeChain();
  f.controller.show(request);
  f.board.replaceChildren();
  assert.equal(f.controller.refresh(), false);
  assert.equal(f.controller.active, false);
  assert.deepEqual(f.fallbacks, [request]);
  assert.deepEqual(f.results, []);
  assert.equal([...f.document.listeners.values()].flat().length, 0);
});

test('closing a secondary modal cannot silently pass a pending priority choice', () => {
  const f = fixture(); f.zone(1);
  f.controller.show({ ...nativeChain(), required: false });
  const modal = f.make('section', f.document.body, { role: 'dialog', 'aria-modal': 'true' });
  const close = f.make('button', modal);
  assert.equal(f.document.dispatch('keydown', close, { key: 'Escape' }).prevented, false);
  assert.equal(f.controller.active, true);
  assert.deepEqual(f.results, []);
  const otherCard = f.make('div', modal, { class: 'card-entity' });
  assert.equal(otherCard.click().prevented, false);
});

test('cleanup preserves newer accessibility state written by a board render', () => {
  const f = fixture(); const zone = f.zone(1);
  f.controller.show(nativeChain());
  zone.setAttribute('aria-label', 'Nouvelle carte sur le terrain');
  zone.setAttribute('aria-disabled', 'true');
  f.controller.clear();
  assert.equal(zone.getAttribute('aria-label'), 'Nouvelle carte sur le terrain');
  assert.equal(zone.getAttribute('aria-disabled'), 'true');
  assert.equal(zone.getAttribute('data-board-decision-label'), null);
});

test('a short anchored action menu keeps all actions and releases the board after fallback', () => {
  const f = fixture(); const card = f.card('my-card');
  const request = { side: 'player', anchorUid: 'my-card', type: 'monster-field-action',
    choices: [{ value: 'attack', label: 'ATTAQUER' }, { value: 'effect', label: 'EFFET' }] };
  assert.equal(f.controller.show(request), true);
  assert.equal(card.classList.contains('board-decision-target'), true);
  assert.equal(f.host.querySelectorAll('.board-decision-option').length, 2);
  f.host.querySelector('.board-decision-fallback').click();
  assert.deepEqual(f.fallbacks, [request]);
  assert.deepEqual(f.results, []);
  assert.equal(card.classList.contains('board-decision-target'), false);
});

test('native priority passing returns null and duplicate effects remain available by card', () => {
  const f = fixture(); f.zone(1); f.zone(2);
  const request = { ...nativeChain(), required: false,
    choices: [...nativeChain().choices, { value: null, label: 'PASSER LA PRIORITÉ' }] };
  assert.equal(f.controller.show(request), true);
  assert.equal(f.host.querySelector('.board-decision-cancel'), null);
  f.host.querySelector('.board-decision-option').click();
  assert.deepEqual(f.results, [null]);
  assert.equal(f.controller.show({ ...nativeChain(), choices: [
    { value: 0, label: 'Premier effet', boardRef: boardRef(1) },
    { value: 1, label: 'Second effet', boardRef: boardRef(1) },
    { value: 2, label: 'Troisième effet', boardRef: boardRef(2) }
  ] }), true);
  assert.equal(f.host.querySelectorAll('.board-decision-option').length, 0);
  f.document.querySelector('.card-zone[data-index="1"]').click();
  assert.deepEqual(f.host.querySelectorAll('.board-decision-option').map(button => button.textContent), ['Premier effet', 'Second effet']);
  assert.deepEqual(f.results, [null], 'choosing a card cannot automatically select one of its effects');
  f.host.querySelector('.board-decision-back').click();
  assert.equal(f.host.querySelectorAll('.board-decision-option').length, 0);
  assert.equal(f.controller.active, true);
  f.document.querySelector('.card-zone[data-index="1"]').click();
  f.host.querySelectorAll('.board-decision-option')[1].click();
  assert.deepEqual(f.results, [null, 1]);
});

test('grouped contextual choices survive a rerender and return to the replacement card', () => {
  const f = fixture(); const first = f.zone(1); f.zone(2);
  const request = { side: 'player', type: 'native-available-actions', choices: [
    { value: 'summon:a', label: 'INVOQUER A', boardRef: boardRef(1) },
    { value: 'set:a', label: 'POSER A', boardRef: boardRef(1) },
    { value: 'summon:b', label: 'INVOQUER B', boardRef: boardRef(2) }
  ] };
  f.controller.show(request);
  first.click();
  const options = f.host.querySelectorAll('.board-decision-option');
  f.board.replaceChildren();
  const replacement = f.zone(1); f.zone(2);
  assert.equal(f.controller.refresh(), true);
  assert.equal(f.host.querySelector('.board-decision-option'), options[0]);
  f.host.querySelector('.board-decision-back').click();
  assert.equal(f.document.activeElement, replacement);
  replacement.click();
  f.host.querySelectorAll('.board-decision-option')[1].click();
  assert.deepEqual(f.results, ['set:a']);
});

test('projected pointer fallback only selects an unambiguous highlighted target', () => {
  const f = fixture(); const zone = f.zone(1);
  f.controller.show(nativeChain());
  assert.equal(f.document.dispatch('click', f.board, { clientX: 30, clientY: 40 }).immediate, true);
  assert.deepEqual(f.results, [0]);
  const second = f.zone(2); second.rect = zone.getBoundingClientRect();
  f.controller.show({ ...nativeChain(), choices: [...nativeChain().choices,
    { value: 1, label: 'Autre effet', boardRef: boardRef(2) }] });
  f.document.dispatch('click', f.board, { clientX: 30, clientY: 40 });
  assert.deepEqual(f.results, [0]);
  assert.equal(f.controller.active, true);
});
