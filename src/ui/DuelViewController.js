export const DUEL_VIEW_MODES = Object.freeze(['compact', 'arena', 'real']);

const VIEW_LABELS = Object.freeze({
  compact: 'COMPACTE',
  arena: 'ARÈNE',
  real: 'RÉELLE'
});

function resolveElement(documentRef, explicitElement, selector) {
  return explicitElement || documentRef?.querySelector?.(selector) || null;
}

function normalizeMode(mode) {
  return DUEL_VIEW_MODES.includes(mode) ? mode : null;
}

function deriveMode(boardElement) {
  if (boardElement?.classList?.contains?.('real-mode')) return 'real';
  if (boardElement?.classList?.contains?.('arena-mode')) return 'arena';
  return 'compact';
}

/**
 * Coordinates the three existing presentation modes without owning or cloning
 * the DuelGame instance.
 */
export class DuelViewController {
  constructor(options = {}) {
    this.documentRef = options.documentRef || globalThis.document || null;
    this.buttonElement = resolveElement(
      this.documentRef,
      options.buttonElement,
      '#btn-toggle-view'
    );
    this.boardElement = resolveElement(
      this.documentRef,
      options.boardElement,
      '#duel-board'
    );
    this.fieldElement = resolveElement(
      this.documentRef,
      options.fieldElement,
      '#parallax-container'
    );
    this.handElement = resolveElement(
      this.documentRef,
      options.handElement,
      '#player-hand'
    );
    this.appElement = resolveElement(
      this.documentRef,
      options.appElement,
      '.app-container'
    );
    this.realViewLoader = options.realViewLoader
      || (() => import('./RealDuelView.js'));
    this.onModeChange = typeof options.onModeChange === 'function'
      ? options.onModeChange
      : () => {};
    this.onError = typeof options.onError === 'function'
      ? options.onError
      : () => {};
    this.gameState = options.gameState || null;
    this.environmentOptions = Object.freeze({
      ...(options.environmentOptions || {})
    });
    this.mode = normalizeMode(options.initialMode) || deriveMode(this.boardElement);
    this.realView = null;
    this._realViewPromise = null;
    this._transitionGeneration = 0;
    this._attached = false;
    this._disposed = false;
    this._buttonBusy = false;
    this._boundButtonClick = () => {
      // aria-disabled keeps the focused control discoverable while the lazy
      // chunk loads; this guard gives it the same behavioural semantics as a
      // native disabled button without forcing focus away.
      if (this._buttonBusy) return;
      void this.cycle().catch(error => this._notifyError(error));
    };

    this._applyModePresentation();
    if (options.autoAttach !== false) this.attach();
  }

  getMode() {
    return this.mode;
  }

  getGameState() {
    return this.gameState;
  }

  setEnvironmentOptions(options = {}) {
    if (this._disposed) return null;
    this.environmentOptions = Object.freeze({ ...options });
    return this.realView?.setEnvironmentOptions?.(this.environmentOptions) ?? null;
  }

  attach() {
    if (this._disposed || this._attached || !this.buttonElement?.addEventListener) {
      return false;
    }
    this.buttonElement.addEventListener('click', this._boundButtonClick);
    this._attached = true;
    return true;
  }

  detach() {
    if (!this._attached) return false;
    this.buttonElement?.removeEventListener?.('click', this._boundButtonClick);
    this._attached = false;
    return true;
  }

  update(gameState) {
    if (this._disposed) return null;
    // Preserve identity: this is the live game object shared by every view.
    this.gameState = gameState;
    try {
      return this.realView?.update?.(gameState) ?? null;
    } catch (error) {
      if (this.mode === 'real') {
        const previousMode = this.mode;
        this.realView?.deactivate?.();
        this.realView?.dispose?.();
        this.realView = null;
        this._realViewPromise = null;
        this.mode = 'compact';
        this._applyModePresentation();
        this._setButtonBusy(false);
        this._notifyError(error);
        this._notifyModeChange(this.mode, previousMode);
      }
      return null;
    }
  }

  async cycle() {
    const currentIndex = DUEL_VIEW_MODES.indexOf(this.mode);
    const nextMode = DUEL_VIEW_MODES[(currentIndex + 1) % DUEL_VIEW_MODES.length];
    return this.setMode(nextMode);
  }

  async setMode(requestedMode) {
    if (this._disposed) return false;
    const nextMode = normalizeMode(requestedMode);
    if (!nextMode) {
      throw new RangeError(`Unknown duel view mode: ${requestedMode}`);
    }

    const generation = ++this._transitionGeneration;
    const previousMode = this.mode;
    if (nextMode === 'real') {
      this._setButtonBusy(true);
      try {
        const realView = await this._loadRealView();
        if (this._disposed || generation !== this._transitionGeneration) {
          return false;
        }
        this.realView = realView;
        this.mode = 'real';
        this._applyModePresentation();
        await realView.activate?.(this.gameState);
        if (this._disposed || generation !== this._transitionGeneration) {
          realView.deactivate?.();
          return false;
        }
        if (previousMode !== this.mode) {
          this._notifyModeChange(this.mode, previousMode);
        }
        return true;
      } catch (error) {
        if (generation === this._transitionGeneration) {
          const failedRealView = this.realView;
          failedRealView?.deactivate?.();
          failedRealView?.dispose?.();
          this.realView = null;
          // Module imports are cached by the browser, but the view instance
          // must be reconstructed after a failed activation.
          this._realViewPromise = null;
          this.mode = previousMode;
          this._applyModePresentation();
          this._notifyError(error);
        }
        return false;
      } finally {
        if (generation === this._transitionGeneration) this._setButtonBusy(false);
      }
    }

    this._setButtonBusy(false);
    this.realView?.deactivate?.();
    this.mode = nextMode;
    this._applyModePresentation();
    if (previousMode !== nextMode) {
      this._notifyModeChange(nextMode, previousMode);
    }
    return true;
  }

  dispose() {
    if (this._disposed) return false;
    this._disposed = true;
    this._transitionGeneration += 1;
    this.detach();
    this.realView?.dispose?.();
    this.realView = null;
    this._realViewPromise = null;
    this.gameState = null;
    this.mode = 'compact';
    this._applyModePresentation();
    this._setButtonBusy(false);
    return true;
  }

  async _loadRealView() {
    if (!this._realViewPromise) {
      const loadPromise = Promise.resolve()
        .then(() => this.realViewLoader())
        .then(moduleOrView => {
          if (moduleOrView?.activate && moduleOrView?.update) return moduleOrView;
          const RealView = moduleOrView?.RealDuelView || moduleOrView?.default;
          if (typeof RealView !== 'function') {
            throw new TypeError('The Real Duel View module has no usable constructor.');
          }
          return new RealView({
            documentRef: this.documentRef,
            fieldElement: this.fieldElement,
            boardElement: this.boardElement,
            handElement: this.handElement,
            environmentOptions: this.environmentOptions
          });
        });
      this._realViewPromise = loadPromise;
    }
    const pendingLoad = this._realViewPromise;
    try {
      return await pendingLoad;
    } catch (error) {
      // Do not permanently cache a rejected lazy-load promise. A transient
      // chunk/network failure must leave the user able to try again.
      if (this._realViewPromise === pendingLoad) {
        this._realViewPromise = null;
      }
      throw error;
    }
  }

  _applyModePresentation() {
    const isArena = this.mode === 'arena';
    const isReal = this.mode === 'real';
    this.boardElement?.classList?.toggle?.('arena-mode', isArena);
    this.boardElement?.classList?.toggle?.('real-mode', isReal);
    this.fieldElement?.classList?.toggle?.('real-duel-view-active', isReal);
    this.appElement?.classList?.toggle?.('real-duel-view-active', isReal);

    for (const element of [this.fieldElement, this.appElement]) {
      if (element?.dataset) element.dataset.duelView = this.mode;
    }

    const button = this.buttonElement;
    if (!button) return;
    button.textContent = `VUE : ${VIEW_LABELS[this.mode]}`;
    button.dataset.viewMode = this.mode;
    button.classList?.toggle?.('btn-magenta', isReal);
    button.setAttribute?.('aria-pressed', isReal ? 'true' : 'false');
    const nextMode = DUEL_VIEW_MODES[
      (DUEL_VIEW_MODES.indexOf(this.mode) + 1) % DUEL_VIEW_MODES.length
    ];
    button.setAttribute?.(
      'aria-label',
      `Vue active : ${VIEW_LABELS[this.mode]}. Activer la vue ${VIEW_LABELS[nextMode]}.`
    );
    button.setAttribute?.('title', `Activer la vue ${VIEW_LABELS[nextMode]}`);
  }

  _setButtonBusy(busy) {
    this._buttonBusy = Boolean(busy);
    const button = this.buttonElement;
    button?.setAttribute?.('aria-busy', busy ? 'true' : 'false');
    button?.setAttribute?.('aria-disabled', busy ? 'true' : 'false');
    this.fieldElement?.setAttribute?.('aria-busy', busy ? 'true' : 'false');
  }

  _notifyModeChange(mode, previousMode) {
    try {
      this.onModeChange(mode, previousMode);
    } catch (error) {
      this._notifyError(error);
    }
  }

  _notifyError(error) {
    try {
      this.onError(error);
    } catch {
      // Presentation callbacks are deliberately isolated from the live duel.
      // A reporting failure must never interrupt game state propagation.
    }
  }
}

export function createDuelViewController(options = {}) {
  return new DuelViewController(options);
}

export default DuelViewController;
