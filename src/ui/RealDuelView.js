import {
  resolveFieldEnvironmentSelection
} from './FieldEnvironmentRegistry.js';

export const REAL_DUEL_LAYER_SELECTOR = '[data-real-duel-view-layer="true"]';

function resolveElement(documentRef, explicitElement, selector) {
  return explicitElement || documentRef?.querySelector?.(selector) || null;
}

function setStyleProperty(element, property, value) {
  element?.style?.setProperty?.(property, String(value));
}

const ENVIRONMENT_STYLE_PROPERTIES = Object.freeze([
  '--real-environment-accent',
  '--real-environment-tint',
  '--real-environment-fog',
  '--real-environment-transition-duration'
]);

function clearEnvironmentStyles(element) {
  for (const property of ENVIRONMENT_STYLE_PROPERTIES) {
    element?.style?.removeProperty?.(property);
  }
}

/**
 * Lifecycle owner for the visual-only immersive environment.
 *
 * This class never creates a card, a zone, a HUD, or a second game state. It
 * mounts one pointer-transparent sibling behind the existing duel board.
 */
export class RealDuelView {
  constructor(options = {}) {
    this.documentRef = options.documentRef
      || options.fieldElement?.ownerDocument
      || globalThis.document
      || null;
    this.fieldElement = resolveElement(
      this.documentRef,
      options.fieldElement,
      '#parallax-container'
    );
    this.boardElement = resolveElement(
      this.documentRef,
      options.boardElement,
      '#duel-board'
    );
    this.environmentResolver = options.environmentResolver
      || resolveFieldEnvironmentSelection;
    this.environmentOptions = Object.freeze({ ...(options.environmentOptions || {}) });
    this.layerElement = null;
    this.gameState = null;
    this.selection = null;
    this.active = false;
    this.disposed = false;
    this._visibilityListenerAttached = false;
    this._boundVisibilityChange = () => this._syncLayerActivity();
  }

  get isMounted() {
    return Boolean(
      this.layerElement
      && this.layerElement.parentNode === this.fieldElement
    );
  }

  getGameState() {
    return this.gameState;
  }

  getSelection() {
    return this.selection;
  }

  setEnvironmentOptions(options = {}) {
    if (this.disposed) return this.selection;
    this.environmentOptions = Object.freeze({ ...options });
    return this.active ? this._applyCurrentEnvironment() : this.selection;
  }

  mount() {
    if (this.disposed) {
      throw new Error('A disposed RealDuelView cannot be mounted.');
    }
    if (!this.fieldElement || !this.documentRef?.createElement) {
      throw new Error('RealDuelView requires the existing duel field element.');
    }
    if (this.isMounted) return this.layerElement;
    if (this.layerElement?.parentNode) {
      this.layerElement.remove?.();
    }
    this.layerElement = null;
    this.selection = null;

    const existingLayer = this.fieldElement.querySelector?.(REAL_DUEL_LAYER_SELECTOR);
    if (existingLayer) {
      this.layerElement = existingLayer;
      this.selection = null;
      this._prepareLayer(existingLayer);
      this._attachVisibilityListener();
      return existingLayer;
    }

    const layer = this.documentRef.createElement('div');
    layer.className = 'real-duel-view-layer';
    layer.dataset.realDuelViewLayer = 'true';
    this._prepareLayer(layer);

    const boardWrapper = this.boardElement?.parentNode;
    if (boardWrapper?.parentNode === this.fieldElement) {
      this.fieldElement.insertBefore(layer, boardWrapper);
    } else if (this.fieldElement.firstChild) {
      this.fieldElement.insertBefore(layer, this.fieldElement.firstChild);
    } else {
      this.fieldElement.appendChild(layer);
    }

    this.layerElement = layer;
    this.selection = null;
    this._attachVisibilityListener();
    return layer;
  }

  _attachVisibilityListener() {
    if (
      this._visibilityListenerAttached
      || !this.documentRef?.addEventListener
    ) return;
    this.documentRef.addEventListener(
      'visibilitychange',
      this._boundVisibilityChange
    );
    this._visibilityListenerAttached = true;
  }

  _syncLayerActivity() {
    if (!this.layerElement) return;
    const shouldRender = this.active && this.documentRef?.hidden !== true;
    this.layerElement.dataset.active = this.active ? 'true' : 'false';
    this.layerElement.hidden = !shouldRender;
    if (this.layerElement.style) {
      this.layerElement.style.animationPlayState = shouldRender
        ? 'running'
        : 'paused';
    }
  }

  _prepareLayer(layer) {
    // An adopted or externally reinserted layer must not retain stale theme
    // classes, provenance, or custom properties from another view instance.
    layer.className = 'real-duel-view-layer';
    layer.dataset.active = 'false';
    delete layer.dataset.environmentId;
    delete layer.dataset.environmentFallback;
    delete layer.dataset.transitionDuration;
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('role', 'presentation');
    layer.tabIndex = -1;
    layer.hidden = true;
    layer.inert = true;
    if (layer.style) {
      layer.style.pointerEvents = 'none';
      layer.style.animationPlayState = 'paused';
      clearEnvironmentStyles(layer);
    }
  }

  async activate(gameState = this.gameState) {
    const layer = this.mount();
    this.gameState = gameState;
    const selection = this._applyCurrentEnvironment();
    if (!selection?.environment || !selection.environmentId) {
      throw new TypeError('RealDuelView could not resolve a safe environment.');
    }
    this.active = true;
    this._syncLayerActivity();
    return layer;
  }

  update(gameState) {
    if (this.disposed) return null;
    // Keep the exact live object. The immersive view must not clone or own duel
    // state, including while it is inactive.
    this.gameState = gameState;
    if (!this.active) return this.selection;
    if (!this.isMounted) this.mount();
    const selection = this._applyCurrentEnvironment();
    this._syncLayerActivity();
    return selection;
  }

  deactivate() {
    if (this.disposed) return false;
    this.active = false;
    this._syncLayerActivity();
    return true;
  }

  dispose() {
    if (this.disposed) return false;
    this.deactivate();
    if (this._visibilityListenerAttached) {
      this.documentRef?.removeEventListener?.(
        'visibilitychange',
        this._boundVisibilityChange
      );
      this._visibilityListenerAttached = false;
    }
    this.layerElement?.remove?.();
    clearEnvironmentStyles(this.fieldElement);
    this.layerElement = null;
    this.selection = null;
    this.gameState = null;
    this.disposed = true;
    return true;
  }

  _applyCurrentEnvironment() {
    if (!this.layerElement) return this.selection;
    const selection = this.environmentResolver(
      this.gameState,
      this.environmentOptions
    );
    if (!selection?.environment || !selection.environmentId) {
      throw new TypeError('RealDuelView received an invalid environment selection.');
    }
    const safeEnvironmentId = String(selection.environmentId).trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(safeEnvironmentId)) {
      throw new TypeError('RealDuelView received an unsafe environment ID.');
    }

    const previousEnvironmentId = this.selection?.environmentId || null;
    if (previousEnvironmentId !== safeEnvironmentId) {
      if (previousEnvironmentId) {
        this.layerElement.classList?.remove?.(`is-environment-${previousEnvironmentId}`);
      }
    }
    this.layerElement.classList?.add?.(`is-environment-${safeEnvironmentId}`);

    const environment = selection.environment;
    this.layerElement.dataset.environmentId = safeEnvironmentId;
    this.layerElement.dataset.environmentFallback = selection.isFallback ? 'true' : 'false';
    this.layerElement.dataset.transitionDuration = String(
      Number(environment.transitionDuration) || 0
    );
    setStyleProperty(
      this.layerElement,
      '--real-environment-accent',
      environment.accentColor
    );
    setStyleProperty(
      this.layerElement,
      '--real-environment-tint',
      environment.environmentTint
    );
    setStyleProperty(
      this.layerElement,
      '--real-environment-fog',
      environment.fog?.color
    );
    setStyleProperty(
      this.layerElement,
      '--real-environment-transition-duration',
      `${Number(environment.transitionDuration) || 0}ms`
    );
    // The existing board is a sibling of the decorative layer. Mirror only
    // non-sensitive visual values to their common field ancestor so the board
    // material can inherit the resolved public environment accent.
    setStyleProperty(
      this.fieldElement,
      '--real-environment-accent',
      environment.accentColor
    );
    setStyleProperty(
      this.fieldElement,
      '--real-environment-tint',
      environment.environmentTint
    );
    setStyleProperty(
      this.fieldElement,
      '--real-environment-fog',
      environment.fog?.color
    );
    setStyleProperty(
      this.fieldElement,
      '--real-environment-transition-duration',
      `${Number(environment.transitionDuration) || 0}ms`
    );

    this.selection = selection;
    return selection;
  }
}

export function createRealDuelView(options = {}) {
  return new RealDuelView(options);
}

export default RealDuelView;
