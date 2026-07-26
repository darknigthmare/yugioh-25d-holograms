import {
  resolveFieldEnvironmentSelection
} from './FieldEnvironmentRegistry.js';
import { RealDuelScene3D } from './RealDuelScene3D.js';
import { RealDuelDOM3DAdapter } from './RealDuelDOM3DAdapter.js';

export const REAL_DUEL_LAYER_SELECTOR = '[data-real-duel-view-layer="true"]';

function resolveElement(documentRef, explicitElement, selector) {
  return explicitElement || documentRef?.querySelector?.(selector) || null;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Strict privacy boundary between DuelGame and the decorative WebGL scene.
 * Card objects, IDs, names and hidden state never cross this boundary.
 */
export function createPublicDuelSceneSummary(gameState) {
  return Object.freeze({
    playerLP: Math.max(0, finiteNumber(gameState?.playerLP, 8000)),
    opponentLP: Math.max(0, finiteNumber(gameState?.opponentLP, 8000)),
    currentTurn: gameState?.currentTurn === 'opponent' ? 'opponent' : 'player',
    currentPhase: String(gameState?.currentPhase || 'draw').slice(0, 24),
    turnCount: Math.max(0, finiteNumber(gameState?.turnCount, 0)),
    playerHandCount: Array.isArray(gameState?.playerHand)
      ? gameState.playerHand.length
      : 0,
    opponentHandCount: Array.isArray(gameState?.opponentHand)
      ? gameState.opponentHand.length
      : 0,
    duelEnded: Boolean(gameState?.winner || gameState?._duelEnded)
  });
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
 * Lifecycle owner for the visual-only immersive 3D environment.
 *
 * This class never creates a card, a zone, a HUD, or a second game state. It
 * synchronises one inert WebGL scene with CSS3D projections of the exact
 * existing board and hand nodes.
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
    this.handElement = resolveElement(
      this.documentRef,
      options.handElement,
      '#player-hand'
    );
    this.windowRef = options.windowRef
      || this.documentRef?.defaultView
      || globalThis.window
      || null;
    this.environmentResolver = options.environmentResolver
      || resolveFieldEnvironmentSelection;
    this.environmentOptions = Object.freeze({ ...(options.environmentOptions || {}) });
    this.sceneFactory = options.sceneFactory
      || (sceneOptions => new RealDuelScene3D(sceneOptions));
    this.domAdapterFactory = options.domAdapterFactory
      || (adapterOptions => new RealDuelDOM3DAdapter(adapterOptions));
    // Lightweight DOM-only fixtures and non-browser renderers keep the safe
    // original fallback. The shipped app always has both nodes and a window.
    this.enable3D = options.enable3D ?? Boolean(
      this.boardElement
      && this.handElement
      && this.windowRef
    );
    this.layerElement = null;
    this.scene3D = null;
    this.dom3DAdapter = null;
    this.gameState = null;
    this.selection = null;
    this.active = false;
    this.disposed = false;
    this._visibilityListenerAttached = false;
    this._boundVisibilityChange = () => this._syncLayerActivity();
    this._bound3DResize = () => this._resize3D();
    this._resizeListenerAttached = false;
    this._resizeObserver = null;
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
    if (this.isMounted) {
      this._mount3D();
      return this.layerElement;
    }
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
      this._mount3D();
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
    this._mount3D();
    return layer;
  }

  _mount3D() {
    if (!this.enable3D || this.scene3D || !this.layerElement) return false;
    const scene3D = this.sceneFactory({
      documentRef: this.documentRef,
      windowRef: this.windowRef,
      hostElement: this.layerElement,
      pixelRatioLimit: 1.5
    });
    scene3D.mount?.(this.layerElement);
    if (scene3D.webglAvailable === false || !scene3D.getCamera?.()) {
      scene3D.dispose?.();
      throw new Error('WebGL 3D is unavailable; the classic duel remains active.');
    }

    let domAdapter = null;
    try {
      domAdapter = this.domAdapterFactory({
        documentRef: this.documentRef,
        boardElement: this.boardElement,
        handElement: this.handElement,
        interactionHostElement: this.fieldElement
      });
      domAdapter.mount?.(scene3D.getCamera());
      this.scene3D = scene3D;
      this.dom3DAdapter = domAdapter;
      this._attach3DResizeListener();
      this._resize3D();
      return true;
    } catch (error) {
      domAdapter?.dispose?.();
      scene3D.dispose?.();
      throw error;
    }
  }

  _attach3DResizeListener() {
    if (!this._resizeListenerAttached && this.windowRef?.addEventListener) {
      this.windowRef.addEventListener('resize', this._bound3DResize, { passive: true });
      this._resizeListenerAttached = true;
    }
    const ResizeObserverClass = this.windowRef?.ResizeObserver
      || globalThis.ResizeObserver;
    if (!this._resizeObserver && typeof ResizeObserverClass === 'function') {
      this._resizeObserver = new ResizeObserverClass(this._bound3DResize);
      this._resizeObserver.observe?.(this.fieldElement);
    }
  }

  _detach3DResizeListener() {
    if (this._resizeListenerAttached) {
      this.windowRef?.removeEventListener?.('resize', this._bound3DResize);
      this._resizeListenerAttached = false;
    }
    this._resizeObserver?.disconnect?.();
    this._resizeObserver = null;
  }

  _resize3D() {
    if (!this.scene3D || !this.dom3DAdapter || !this.fieldElement) return false;
    const bounds = this.fieldElement.getBoundingClientRect?.();
    const width = Math.max(
      1,
      Math.round(Number(bounds?.width) || this.fieldElement.clientWidth || 1)
    );
    const height = Math.max(
      1,
      Math.round(Number(bounds?.height) || this.fieldElement.clientHeight || 1)
    );
    this.scene3D.resize?.(width, height);
    this.dom3DAdapter.resize?.(width, height);
    this.dom3DAdapter.render?.();
    return true;
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
    const interactionRoot = this.dom3DAdapter?.getElement?.();
    if (interactionRoot) interactionRoot.hidden = !shouldRender;
    if (shouldRender) {
      if (this.scene3D?.publicSummary?.duelEnded) {
        this.scene3D.pause?.();
      } else {
        this.scene3D?.start?.();
      }
      this.dom3DAdapter?.render?.();
    } else {
      this.scene3D?.pause?.();
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
    try {
      if (this.enable3D) {
        const sceneActivated = await this.scene3D?.activate?.(
          selection,
          createPublicDuelSceneSummary(gameState)
        );
        if (sceneActivated !== true) {
          throw new Error('The true 3D renderer could not be activated.');
        }
        this.dom3DAdapter?.activate?.();
        this._resize3D();
      }
      this.active = true;
      this._syncLayerActivity();
      return layer;
    } catch (error) {
      this.dom3DAdapter?.deactivate?.();
      this.scene3D?.deactivate?.();
      this.active = false;
      this._syncLayerActivity();
      throw error;
    }
  }

  update(gameState) {
    if (this.disposed) return null;
    // Keep the exact live object. The immersive view must not clone or own duel
    // state, including while it is inactive.
    this.gameState = gameState;
    if (!this.active) return this.selection;
    if (!this.isMounted) this.mount();
    const selection = this._applyCurrentEnvironment();
    if (this.enable3D) {
      this.scene3D?.updatePublicSummary?.(
        createPublicDuelSceneSummary(gameState)
      );
      this.dom3DAdapter?.render?.();
    }
    this._syncLayerActivity();
    return selection;
  }

  deactivate() {
    if (this.disposed) return false;
    this.active = false;
    // Restore the exact board/hand nodes before Classic/Arena styles resume.
    this.dom3DAdapter?.deactivate?.();
    this.scene3D?.deactivate?.();
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
    this._detach3DResizeListener();
    this.dom3DAdapter?.dispose?.();
    this.scene3D?.dispose?.();
    this.dom3DAdapter = null;
    this.scene3D = null;
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
    if (this.active && this.enable3D) {
      this.scene3D?.updateEnvironment?.(selection);
      this.dom3DAdapter?.render?.();
    }
    return selection;
  }
}

export function createRealDuelView(options = {}) {
  return new RealDuelView(options);
}

export default RealDuelView;
