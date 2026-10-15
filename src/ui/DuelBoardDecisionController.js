import { nativeBoardTargetSelector } from './NativeDuelBoardInteractionModel.js';

const PILES = new Set(['deck', 'extra', 'graveyard', 'banished']);
const CONTEXTUAL_NATIVE_KINDS = new Set(['SELECT_EFFECTYN', 'SELECT_YESNO', 'SELECT_OPTION',
  'SELECT_POSITION', 'ANNOUNCE_NUMBER', 'SELECT_COUNTER', 'ROCK_PAPER_SCISSORS']);
const OPTIONAL_EFFECT_TYPES = new Set(['activate-monster-effect', 'activate-hand-effect',
  'activate-field-effect', 'activate-graveyard-effect', 'activate-trap']);
const BOARD_CONTROLS = '.card-zone, .card-entity, .monster-hologram-entity, #duel-board, #player-hand, #btn-next-phase, #btn-native-actions, #btn-end-turn';
const TARGET_ATTRIBUTES = ['tabindex', 'role', 'aria-label', 'aria-pressed', 'aria-disabled',
  'aria-describedby', 'data-board-decision-label'];
const selectionKey = values => JSON.stringify(values.map(String).sort());

function bounds(request) {
  const minimum = Math.max(0, Math.floor(Number(request.minimum) || 0));
  const maximum = request.maximum == null ? request.candidates?.length ?? 0
    : Math.max(minimum, Math.floor(Number(request.maximum) || 0));
  return { minimum, maximum };
}

/** A presentation check only; the engine remains the authority on legality. */
export function isBoardDecisionSelectionValid(request, selected) {
  if (!Array.isArray(selected) || new Set(selected.map(String)).size !== selected.length) return false;
  const allowed = new Set((request.candidates ?? []).map(candidate => String(candidate.uid)));
  if (selected.some(value => !allowed.has(String(value)))) return false;
  const { minimum, maximum } = bounds(request);
  if (selected.length < minimum || selected.length > maximum) return false;
  if (Array.isArray(request.validSelections)
    && !request.validSelections.some(selection => selectionKey(selection) === selectionKey(selected))) return false;
  try {
    return typeof request.validateSelection !== 'function' || Boolean(request.validateSelection([...selected]));
  } catch { return false; }
}

/**
 * Presents already-authorized answers on the visible playmat. No card lookup,
 * inference of hidden identities, automatic choice, or engine mutation occurs.
 * Returning false from show leaves the ordinary decision UI in charge.
 */
export class DuelBoardDecisionController {
  constructor({ documentRef = globalThis.document, hostElement, onFinish, onFallback, announce } = {}) {
    this.documentRef = documentRef;
    this.host = hostElement ?? documentRef?.getElementById?.('board-decision-prompt');
    this.onFinish = onFinish;
    this.onFallback = onFallback;
    this.announce = announce;
    this._request = null;
    this._targets = [];
    this._decorated = [];
    this._selected = new Set();
    this._listeners = [];
  }

  get active() { return this._request !== null; }

  show(request) {
    this.clear({ restoreFocus: false });
    if (!this.host || request?.side !== 'player' || request.searchable || request.sequence) return false;
    const plan = this._plan(request);
    if (!plan) return false;
    this._request = request;
    this._previousFocus = this.documentRef.activeElement;
    this._previousFocusUid = this._previousFocus?.dataset?.uid;
    this._selected = new Set();
    this._groupValue = undefined;
    this._render(plan);
    this._listen('click', event => this._click(event));
    this._listen('keydown', event => this._keydown(event));
    this._listen('dragstart', event => {
      if (!this._inSecondaryDialog(event.target) && this._isBoardControl(event.target)) this._stop(event);
    });
    this._listen('pointerdown', event => {
      // Keep hand/zone gesture handlers from starting another action. Native
      // focus and the subsequent touch/click activation remain available.
      if (!this._inSecondaryDialog(event.target)
        && !this.host.contains(event.target) && this._isBoardControl(event.target)) event.stopImmediatePropagation();
    });
    this._listen('focusin', event => {
      this._focusedTargetValue = this._targets.find(target => target.element === event.target)?.value;
    });
    this._status(plan.mode !== 'contextual'
      ? 'Choisissez directement une carte ou une zone éclairée sur le terrain.'
      : 'Choisissez une action. Le terrain reste accessible.');
    const first = this._targets[0]?.element ?? this._actions?.querySelector('button');
    this._focusedTargetValue = this._targets[0]?.value;
    first?.focus?.({ preventScroll: true });
    return true;
  }

  /** Rebind after a board/hand render, preserving valid selections by value. */
  refresh() {
    if (!this.active) return false;
    const plan = this._plan(this._request);
    if (!plan) {
      const request = this._request;
      this.clear({ restoreFocus: false });
      this.onFallback?.(request);
      return false;
    }
    const focused = this.documentRef.activeElement;
    const focusedTarget = this._targets.find(target => target.element === focused)
      ?? (focused === this.documentRef.body ? this._targets.find(target =>
        target.value === this._focusedTargetValue && target.element.isConnected === false) : null);
    const values = new Set(plan.targets.map(target => String(target.value)));
    this._selected = new Set([...this._selected].filter(value => values.has(value)));
    if (this._mode !== plan.mode) this._render(plan);
    else {
      this._planSnapshot = plan;
      this._restoreTargets();
      this._targets = plan.targets;
      for (const target of this._targets) this._decorate(target.element, target.label);
      if (plan.anchor) this._decorate(plan.anchor,
        this._request.card?.label || this._request.card?.name || 'Carte concernée');
      if (this._request.multiple) this._updateSelection();
    }
    if (focusedTarget?.element.isConnected === false) {
      this._targets.find(target => target.value === focusedTarget.value)?.element.focus?.({ preventScroll: true });
    }
    return true;
  }

  clear({ restoreFocus = true } = {}) {
    const wasActive = this.active;
    this._request = null;
    this._restoreTargets();
    for (const [type, listener] of this._listeners) this.documentRef?.removeEventListener?.(type, listener, true);
    this._listeners = [];
    this._targets = [];
    this._selected.clear();
    this.documentRef?.body?.classList.remove('board-decision-active');
    if (this.host) {
      this.host.classList.add('hidden');
      this.host.hidden = true;
      this.host.replaceChildren();
    }
    if (wasActive && restoreFocus) {
      const previous = this._previousFocus?.isConnected !== false && this._visible(this._previousFocus)
        ? this._previousFocus : this._cardByUid(this._previousFocusUid);
      previous?.focus?.({ preventScroll: true });
    }
    this._previousFocus = null;
    this._previousFocusUid = null;
    this._focusedTargetValue = undefined;
  }

  _listen(type, listener) {
    this.documentRef.addEventListener(type, listener, true);
    this._listeners.push([type, listener]);
  }

  _visible(element) {
    if (!element || element.isConnected === false || element.hidden
      || element.closest?.('[hidden], .hidden, [aria-hidden="true"]')) return false;
    if (typeof element.getClientRects === 'function' && element.getClientRects().length === 0) return false;
    const style = this.documentRef.defaultView?.getComputedStyle?.(element);
    return style?.display !== 'none' && style?.visibility !== 'hidden';
  }

  _cardByUid(uid) {
    if (uid == null) return null;
    return [...(this.documentRef.querySelectorAll?.('.card-entity[data-uid]') ?? [])]
      .find(element => String(element.dataset.uid) === String(uid) && this._visible(element)) ?? null;
  }

  _elementFor(option, request) {
    if (option?.boardRef) {
      if (PILES.has(option.boardRef.zoneType)) return null;
      const selector = nativeBoardTargetSelector(option.boardRef);
      const element = selector ? this.documentRef.querySelector(selector) : null;
      return this._visible(element) ? element : null;
    }
    // Native uids are wire indices. Never interpret one as a rendered identity.
    return this._cardByUid(option?.cardUid ?? (!request.nativeKind ? option?.uid : null));
  }

  _plan(request) {
    const choices = OPTIONAL_EFFECT_TYPES.has(request.type) ? [
      { value: true, label: 'OUI, ACTIVER' }, { value: false, label: 'NON' }
    ] : request.choices;
    const hasChoices = Array.isArray(choices) && choices.length > 0;
    const options = hasChoices ? choices : request.candidates;
    if (!Array.isArray(options) || (!options.length && !request.multiple)) return null;
    const targets = [], auxiliary = [];
    let unresolved = false;
    for (const option of options) {
      const value = hasChoices ? (typeof option === 'object' ? option.value : option)
        : request.multiple ? String(option.uid) : option.uid;
      const label = typeof option === 'object' ? option.label ?? option.name ?? '' : String(option);
      const element = this._elementFor(option, request);
      if (element) targets.push({ value, label, element });
      else if (hasChoices && value === null) auxiliary.push({ value, label });
      else unresolved = true;
    }
    const distinct = new Set(targets.map(target => target.element));
    if (!unresolved && distinct.size === targets.length && (targets.length || request.multiple)) {
      return { mode: 'spatial', targets, auxiliary };
    }
    if (!unresolved && hasChoices && distinct.size > 1 && !request.multiple) {
      const groups = new Map();
      for (const target of targets) {
        if (!groups.has(target.element)) groups.set(target.element, { ...target, choices: [] });
        groups.get(target.element).choices.push({ value: target.value, label: target.label });
      }
      return { mode: 'grouped', targets: [...groups.values()], auxiliary };
    }
    // Explicit short action choices remain beside the board. Card choices with
    // an unavailable location always retain the complete conventional picker.
    const contextual = hasChoices && choices.length <= 8 && !request.multiple
      && (OPTIONAL_EFFECT_TYPES.has(request.type) || request.anchorUid != null
        || (!request.nativeKind && !choices.some(choice => choice?.cardUid || choice?.boardRef))
        || CONTEXTUAL_NATIVE_KINDS.has(request.nativeKind)
        || (!unresolved && distinct.size === 1));
    if (!contextual) return null;
    const anchorSelector = nativeBoardTargetSelector(request.card?.boardRef ?? request.boardRef);
    const anchor = request.anchorUid != null ? this._cardByUid(request.anchorUid)
      : anchorSelector ? this.documentRef.querySelector(anchorSelector)
        : !request.nativeKind ? this._cardByUid(request.card?.uid) : null;
    return { mode: 'contextual', targets: [], auxiliary: choices.map(choice => ({
      value: typeof choice === 'object' ? choice.value : choice,
      label: typeof choice === 'object' ? choice.label : String(choice)
    })), anchor: this._visible(anchor) ? anchor : distinct.size === 1 ? targets[0].element : null };
  }

  _render(plan) {
    this._restoreTargets();
    this._mode = plan.mode;
    this._planSnapshot = plan;
    this._targets = plan.targets;
    this.host.replaceChildren();
    this.host.hidden = false;
    this.host.classList.remove('hidden');
    this.host.setAttribute('role', 'region');
    this.host.setAttribute('aria-labelledby', 'board-decision-title');
    this.documentRef.body.classList.add('board-decision-active');
    const heading = this._append('h2', 'board-decision-heading', this._request.title || 'À VOUS DE JOUER');
    heading.id = 'board-decision-title';
    this._append('p', 'board-decision-description', this._request.description
      || (plan.mode === 'spatial' ? 'Sélectionnez les cibles éclairées sur le terrain.' : 'Choisissez une action.'));
    if (this._request.includedCandidates?.length) this._append('p', 'board-decision-included',
      `Déjà inclus : ${this._request.includedCandidates.map(candidate => candidate.label || candidate.name).join(' ; ')}`);
    this._statusElement = this._append('p', 'board-decision-status', '');
    this._statusElement.id = 'board-decision-status';
    this._statusElement.setAttribute('role', 'status');
    this._statusElement.setAttribute('aria-live', 'polite');
    this._actions = this._append('div', 'board-decision-actions', '');
    for (const target of this._targets) this._decorate(target.element, target.label);
    if (plan.anchor) this._decorate(plan.anchor, this._request.card?.label || this._request.card?.name || 'Carte concernée');
    this._renderActions(plan);
  }

  _renderActions(plan) {
    this._actions.replaceChildren();
    this._confirm = null;
    const group = plan.mode === 'grouped' && plan.targets.find(target => target.value === this._groupValue);
    if (group) {
      for (const choice of group.choices) this._button(choice.label, 'board-decision-option', () => this._finish(choice.value));
      this._button('RETOUR AUX CARTES', 'board-decision-back', () => {
        const value = this._groupValue;
        this._groupValue = undefined;
        this._renderActions(this._planSnapshot);
        this._targets.find(target => target.value === value)?.element.focus?.({ preventScroll: true });
        this._status('Choisissez une carte éclairée sur le terrain.');
      });
    }
    for (const choice of plan.auxiliary) this._button(choice.label, 'board-decision-option', () => this._finish(choice.value));
    if (this._request.multiple) {
      this._confirm = this._button('CONFIRMER', 'board-decision-confirm', () => {
        if (isBoardDecisionSelectionValid(this._request, [...this._selected])) this._finish([...this._selected]);
      });
      this._updateSelection();
    } else this._confirm = null;
    if (this.onFallback) this._button('CHOIX EN LISTE', 'board-decision-fallback', () => {
      const request = this._request;
      this.clear({ restoreFocus: false });
      this.onFallback(request);
    });
    if (!this._request.required && !plan.auxiliary.some(choice => choice.value === null)
      && !OPTIONAL_EFFECT_TYPES.has(this._request.type)) {
      this._button(this._request.type === 'chain-response' ? 'PASSER LA PRIORITÉ' : 'ANNULER',
        'board-decision-cancel', () => this._finish(null));
    }
  }

  _append(tag, className, text) {
    const element = this.documentRef.createElement(tag);
    element.className = className;
    element.textContent = text;
    this.host.appendChild(element);
    return element;
  }

  _button(label, className, action) {
    const button = this.documentRef.createElement('button');
    button.type = 'button';
    button.className = `btn ${className}`;
    button.textContent = label;
    button.addEventListener('click', event => { event.stopPropagation(); if (this.active) action(); });
    this._actions.appendChild(button);
    return button;
  }

  _decorate(element, label) {
    const attributes = new Map(TARGET_ATTRIBUTES.map(name => [name, element.getAttribute(name)]));
    element.classList.add('board-decision-target');
    element.setAttribute('data-board-decision-label', label);
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', label || 'Cible autorisée');
    element.setAttribute('aria-disabled', 'false');
    element.setAttribute('aria-describedby', 'board-decision-title board-decision-status');
    this._decorated.push({ element, attributes,
      applied: new Map(TARGET_ATTRIBUTES.map(name => [name, element.getAttribute(name)])) });
  }

  _restoreTargets() {
    for (const { element, attributes, applied } of this._decorated) {
      element.classList.remove('board-decision-target', 'board-decision-selected');
      for (const [name, value] of attributes) {
        // A board render may have supplied a newer accessible label/state.
        // Remove only attributes still owned by this presentation layer.
        if (element.getAttribute(name) !== applied.get(name)) continue;
        if (value === null) element.removeAttribute(name);
        else element.setAttribute(name, value);
      }
    }
    this._decorated = [];
  }

  _isBoardControl(element) { return Boolean(element?.closest?.(BOARD_CONTROLS)); }

  _inSecondaryDialog(element) {
    return Boolean(element?.closest?.('[role="dialog"][aria-modal="true"]'));
  }

  _stop(event) { event.preventDefault(); event.stopImmediatePropagation(); }

  _targetFor(event) {
    const direct = this._targets.find(target => target.element === event.target || target.element.contains?.(event.target));
    if (direct) return direct;
    // CSS 3D can flatten hit testing onto the board plane. Do not guess if two
    // projected targets overlap at the pointer position.
    if (event.type !== 'click' || !this._isBoardControl(event.target)
      || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)
      || (event.clientX === 0 && event.clientY === 0)) return null;
    const hits = this._targets.filter(target => {
      const rect = target.element.getBoundingClientRect?.();
      return rect && event.clientX >= rect.left && event.clientX <= rect.right
        && event.clientY >= rect.top && event.clientY <= rect.bottom;
    });
    return hits.length === 1 ? hits[0] : null;
  }

  _click(event) {
    if (!this.active || this.host.contains(event.target) || this._inSecondaryDialog(event.target)) return;
    const target = this._targetFor(event);
    if (!target && !this._isBoardControl(event.target)) return;
    this._stop(event);
    if (target) this._choose(target);
    else this._status('Sélectionnez une carte ou une zone éclairée, ou une action du bandeau.');
  }

  _keydown(event) {
    if (!this.active || event.key === 'Tab' || this._inSecondaryDialog(event.target)) return;
    if (event.key === 'Escape') {
      this._stop(event);
      if (!this._request.required) this._finish(null);
      else this._status('Ce choix est obligatoire. Sélectionnez une cible autorisée.');
      return;
    }
    if (this.host.contains(event.target) || !this._isBoardControl(event.target)) return;
    if (event.key === 'Enter' || event.key === ' ') {
      this._stop(event);
      const target = this._targetFor(event);
      if (target) this._choose(target);
    } else if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'r') {
      this._stop(event); // A position-change shortcut cannot consume a target.
    }
  }

  _choose(target) {
    if (!this._visible(target.element)) { this.refresh(); return; }
    if (target.choices?.length > 1) {
      this._groupValue = target.value;
      this._renderActions(this._planSnapshot);
      this._actions.querySelector('button')?.focus?.({ preventScroll: true });
      this._status('Choisissez l’action de cette carte, ou revenez aux cartes.');
      return;
    }
    if (!this._request.multiple) { this._finish(target.value); return; }
    const value = String(target.value);
    if (this._selected.has(value)) this._selected.delete(value);
    else if (this._selected.size < bounds(this._request).maximum) this._selected.add(value);
    else { this._status(`Sélectionnez au maximum ${bounds(this._request).maximum} cible(s).`); return; }
    this._updateSelection();
  }

  _updateSelection() {
    const values = [...this._selected];
    for (const target of this._targets) {
      const selected = this._selected.has(String(target.value));
      target.element.classList.toggle('board-decision-selected', selected);
      target.element.setAttribute('aria-pressed', String(selected));
      this._decorated.find(entry => entry.element === target.element)?.applied.set('aria-pressed', String(selected));
    }
    const { maximum } = bounds(this._request);
    this._confirm.disabled = !isBoardDecisionSelectionValid(this._request, values);
    this._confirm.textContent = `CONFIRMER (${values.length}/${maximum})`;
    const summary = typeof this._request.selectionSummary === 'function'
      ? this._request.selectionSummary(values) : '';
    this._status(`${values.length} cible(s) sélectionnée(s) sur ${maximum}.${summary ? ` ${summary}` : ''}`);
  }

  _status(message) {
    if (this._statusElement) this._statusElement.textContent = message;
    this.announce?.(message);
  }

  _finish(value) {
    this.clear();
    this.onFinish?.(value);
  }
}
