import {
  isSafeFieldEnvironmentBackdropUrl,
  resolveFieldEnvironmentSelection
} from './FieldEnvironmentRegistry.js';
import { RealDuelScene3D } from './RealDuelScene3D.js';
import { RealDuelDOM3DAdapter } from './RealDuelDOM3DAdapter.js';
import {
  REAL_DUEL_CAMERA_PRESET_IDS,
  REAL_DUEL_CAMERA_PRESETS,
  normalizeRealDuelCameraPreset
} from './RealDuelCameraPresets.js';

export const REAL_DUEL_LAYER_SELECTOR = '[data-real-duel-view-layer="true"]';
export const REAL_DUEL_BACKDROP_LAYER_COUNT = 2;

function resolveElement(documentRef, explicitElement, selector) {
  return explicitElement || documentRef?.querySelector?.(selector) || null;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isTypingTarget(target) {
  const tagName = String(target?.tagName || '').toLowerCase();
  return target?.isContentEditable === true
    || ['input', 'select', 'textarea'].includes(tagName);
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
  '--real-environment-backdrop',
  '--real-environment-backdrop-fallback',
  '--real-environment-backdrop-filter',
  '--real-environment-backdrop-opacity',
  '--real-environment-accent',
  '--real-environment-tint',
  '--real-environment-fog',
  '--real-environment-transition-duration'
]);

function toSafeBackdropCssValue(value) {
  const publicUrl = String(value ?? '').trim();
  if (!isSafeFieldEnvironmentBackdropUrl(publicUrl)) {
    throw new TypeError('RealDuelView received an unsafe environment backdrop URL.');
  }
  return `url("${publicUrl}")`;
}

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
    this.imageFactory = options.imageFactory
      || (() => {
        const ImageClass = this.windowRef?.Image || globalThis.Image;
        return typeof ImageClass === 'function' ? new ImageClass() : null;
      });
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
    this.backdropLayers = [];
    this._activeBackdropLayerIndex = -1;
    this._backdropVisualKey = null;
    this._backdropTargetVisualKey = null;
    this._backdropRequestToken = 0;
    this._backdropPreload = null;
    this._decodedBackdropUrls = new Set();
    this.scene3D = null;
    this.dom3DAdapter = null;
    this.cameraPreset = normalizeRealDuelCameraPreset(options.cameraPreset);
    this.cameraControlsElement = null;
    this.cameraStatusElement = null;
    this.cameraButtons = new Map();
    this._cameraControlCleanups = [];
    this._cameraShortcutAttached = false;
    this.gameState = null;
    this.selection = null;
    this.active = false;
    this.disposed = false;
    this._visibilityListenerAttached = false;
    this._boundVisibilityChange = () => this._syncLayerActivity();
    this._bound3DResize = () => this._resize3D();
    this._resizeListenerAttached = false;
    this._resizeObserver = null;
    this._boundCameraShortcut = event => {
      if (
        !this.active
        || event.altKey !== true
        || event.ctrlKey
        || event.metaKey
        || event.shiftKey
        || isTypingTarget(event.target)
      ) return;
      const index = Number(event.key) - 1;
      const presetId = REAL_DUEL_CAMERA_PRESET_IDS[index];
      if (!presetId) return;
      event.preventDefault?.();
      this.setCameraPreset(presetId);
    };
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

  getCameraPreset() {
    return this.cameraPreset;
  }

  setCameraPreset(presetId, options = {}) {
    if (this.disposed) return null;
    const nextPreset = normalizeRealDuelCameraPreset(
      presetId,
      this.cameraPreset
    );
    this.cameraPreset = nextPreset;
    this.scene3D?.setCameraPreset?.(nextPreset, {
      duration: options.duration,
      immediate: options.immediate === true || !this.active
    });
    this.dom3DAdapter?.render?.();
    this._syncCameraControls();
    return nextPreset;
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
    this._resetBackdropLayers();

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
      scene3D.setCameraUpdateCallback?.(() => {
        this.dom3DAdapter?.render?.();
      });
      scene3D.setCameraPreset?.(this.cameraPreset, { immediate: true });
      this._ensureCameraControls();
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

  _ensureCameraControls() {
    if (!this.enable3D || !this.documentRef?.createElement || !this.fieldElement) {
      return null;
    }
    if (this.cameraControlsElement?.parentNode === this.fieldElement) {
      this._syncCameraControls();
      return this.cameraControlsElement;
    }
    this._destroyCameraControls();

    const controls = this.documentRef.createElement('div');
    controls.className = 'real-duel-camera-controls';
    controls.dataset.realDuelCameraControls = 'true';
    controls.setAttribute('role', 'toolbar');
    controls.setAttribute('aria-label', 'Angles de caméra de la Vue Réelle');
    controls.setAttribute('aria-orientation', 'horizontal');
    controls.hidden = true;

    const title = this.documentRef.createElement('span');
    title.className = 'real-duel-camera-title';
    title.textContent = 'CAMÉRA';
    title.setAttribute('aria-hidden', 'true');
    controls.appendChild(title);

    for (const [index, presetId] of REAL_DUEL_CAMERA_PRESET_IDS.entries()) {
      const config = REAL_DUEL_CAMERA_PRESETS[presetId];
      const button = this.documentRef.createElement('button');
      button.type = 'button';
      button.className = 'real-duel-camera-button';
      button.dataset.cameraPreset = presetId;
      button.textContent = config.label;
      button.setAttribute('aria-label', `${config.accessibleLabel}. ${config.shortcut}.`);
      button.setAttribute('title', `${config.accessibleLabel} (${config.shortcut})`);
      const onClick = () => this.setCameraPreset(presetId);
      const onKeyDown = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault?.();
        let nextIndex = index;
        if (event.key === 'ArrowLeft') {
          nextIndex = (index - 1 + REAL_DUEL_CAMERA_PRESET_IDS.length)
            % REAL_DUEL_CAMERA_PRESET_IDS.length;
        } else if (event.key === 'ArrowRight') {
          nextIndex = (index + 1) % REAL_DUEL_CAMERA_PRESET_IDS.length;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = REAL_DUEL_CAMERA_PRESET_IDS.length - 1;
        }
        this.cameraButtons.get(
          REAL_DUEL_CAMERA_PRESET_IDS[nextIndex]
        )?.focus?.();
      };
      button.addEventListener('click', onClick);
      button.addEventListener('keydown', onKeyDown);
      this._cameraControlCleanups.push(() => {
        button.removeEventListener('click', onClick);
        button.removeEventListener('keydown', onKeyDown);
      });
      this.cameraButtons.set(presetId, button);
      controls.appendChild(button);
    }

    const status = this.documentRef.createElement('span');
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    controls.appendChild(status);

    this.fieldElement.appendChild(controls);
    this.cameraControlsElement = controls;
    this.cameraStatusElement = status;
    if (!this._cameraShortcutAttached && this.documentRef?.addEventListener) {
      this.documentRef.addEventListener('keydown', this._boundCameraShortcut);
      this._cameraShortcutAttached = true;
    }
    this._syncCameraControls();
    return controls;
  }

  _syncCameraControls() {
    if (!this.cameraControlsElement) return;
    this.cameraControlsElement.dataset.cameraPreset = this.cameraPreset;
    for (const [presetId, button] of this.cameraButtons) {
      const isActive = presetId === this.cameraPreset;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.classList?.toggle?.('is-active', isActive);
    }
    const config = REAL_DUEL_CAMERA_PRESETS[this.cameraPreset];
    if (this.cameraStatusElement && config) {
      this.cameraStatusElement.textContent = `Caméra : ${config.accessibleLabel}.`;
    }
  }

  _destroyCameraControls() {
    for (const cleanup of this._cameraControlCleanups.splice(0)) cleanup();
    if (this._cameraShortcutAttached) {
      this.documentRef?.removeEventListener?.('keydown', this._boundCameraShortcut);
      this._cameraShortcutAttached = false;
    }
    this.cameraControlsElement?.remove?.();
    this.cameraControlsElement = null;
    this.cameraStatusElement = null;
    this.cameraButtons.clear();
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
    if (this.cameraControlsElement) {
      this.cameraControlsElement.hidden = !shouldRender;
    }
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
    layer.dataset.realDuelViewLayer = 'true';
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
    this._prepareBackdropLayers(layer);
  }

  _resetBackdropLayers() {
    this._cancelBackdropPreload();
    this._backdropRequestToken += 1;
    this.backdropLayers = [];
    this._activeBackdropLayerIndex = -1;
    this._backdropVisualKey = null;
    this._backdropTargetVisualKey = null;
  }

  _prepareBackdropLayers(layer) {
    const existingLayers = Array.from(layer?.children || []).filter(
      child => child?.dataset?.realDuelBackdropLayer === 'true'
    );
    const layers = [];

    for (let index = 0; index < REAL_DUEL_BACKDROP_LAYER_COUNT; index += 1) {
      const backdropLayer = existingLayers[index]
        || this.documentRef?.createElement?.('div');
      if (!backdropLayer) continue;
      backdropLayer.className = 'real-duel-environment-backdrop';
      backdropLayer.dataset.realDuelBackdropLayer = 'true';
      backdropLayer.dataset.backdropSlot = String(index);
      backdropLayer.dataset.active = 'false';
      backdropLayer.setAttribute?.('aria-hidden', 'true');
      backdropLayer.setAttribute?.('role', 'presentation');
      backdropLayer.inert = true;
      if (backdropLayer.style) {
        backdropLayer.style.backgroundImage = '';
        backdropLayer.style.filter = 'none';
      }
      if (backdropLayer.parentNode !== layer) layer.appendChild?.(backdropLayer);
      layers.push(backdropLayer);
    }
    for (const extraLayer of existingLayers.slice(REAL_DUEL_BACKDROP_LAYER_COUNT)) {
      extraLayer.remove?.();
    }

    this.backdropLayers = layers;
    this._activeBackdropLayerIndex = -1;
    this._backdropVisualKey = null;
    return layers;
  }

  _applyBackdropCrossfade({
    backgroundImage,
    backdropFilter,
    visualKey
  }) {
    if (this.backdropLayers.length !== REAL_DUEL_BACKDROP_LAYER_COUNT) {
      this._prepareBackdropLayers(this.layerElement);
    }
    if (visualKey === this._backdropVisualKey) return false;

    const isInitialBackdrop = this._activeBackdropLayerIndex < 0;
    const nextIndex = isInitialBackdrop
      ? 0
      : (this._activeBackdropLayerIndex + 1) % REAL_DUEL_BACKDROP_LAYER_COUNT;
    const nextLayer = this.backdropLayers[nextIndex];
    if (!nextLayer) return false;

    nextLayer.style.backgroundImage = backgroundImage;
    nextLayer.style.filter = backdropFilter;
    nextLayer.dataset.active = 'true';
    for (const [index, backdropLayer] of this.backdropLayers.entries()) {
      if (index !== nextIndex) backdropLayer.dataset.active = 'false';
    }

    this._activeBackdropLayerIndex = nextIndex;
    this._backdropVisualKey = visualKey;
    return true;
  }

  _cancelBackdropPreload() {
    const preload = this._backdropPreload;
    this._backdropPreload = null;
    preload?.cancel?.();
  }

  _startBackdropPreload({
    backdropUrl,
    finalBackgroundImage,
    backdropFilter,
    finalVisualKey,
    requestToken
  }) {
    let image = null;
    try {
      image = this.imageFactory?.();
    } catch {
      return false;
    }
    if (!image) return false;

    let cancelled = false;
    let settled = false;
    let decodeStarted = false;
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
    };
    const finish = success => {
      if (cancelled || settled) return;
      settled = true;
      cleanup();
      if (this._backdropPreload?.image === image) {
        this._backdropPreload = null;
      }
      if (success) this._decodedBackdropUrls.add(backdropUrl);
      if (
        !success
        || this.disposed
        || requestToken !== this._backdropRequestToken
        || finalVisualKey !== this._backdropTargetVisualKey
        || !this.isMounted
      ) return;
      this._applyBackdropCrossfade({
        backgroundImage: finalBackgroundImage,
        backdropFilter,
        visualKey: finalVisualKey
      });
    };
    const decodeOrFinish = () => {
      if (cancelled || settled || decodeStarted) return;
      if (typeof image.decode !== 'function') {
        finish(Number(image.naturalWidth) > 0);
        return;
      }
      decodeStarted = true;
      Promise.resolve()
        .then(() => image.decode())
        .then(
          () => finish(true),
          () => finish(
            image.complete === true && Number(image.naturalWidth) > 0
          )
        );
    };
    const cancel = () => {
      if (cancelled || settled) return;
      cancelled = true;
      cleanup();
      try {
        // Clearing src releases the element's pending network/decode work.
        image.src = '';
      } catch {
        // Synthetic loaders and already-disposed documents may reject writes.
      }
    };
    const preloadRecord = { image, cancel, requestToken };
    this._backdropPreload = preloadRecord;

    image.onload = decodeOrFinish;
    image.onerror = () => finish(false);
    try {
      image.decoding = 'async';
      image.src = backdropUrl;
      if (typeof image.decode === 'function') {
        decodeOrFinish();
      } else if (image.complete === true) {
        Promise.resolve().then(decodeOrFinish);
      }
    } catch {
      cancel();
      if (this._backdropPreload === preloadRecord) {
        this._backdropPreload = null;
      }
      return false;
    }
    return true;
  }

  _requestBackdropTransition({
    backdropUrl,
    backdropCss,
    fallbackBackdropCss,
    backdropFilter,
    finalVisualKey
  }) {
    if (finalVisualKey === this._backdropTargetVisualKey) return false;
    this._cancelBackdropPreload();
    this._backdropRequestToken += 1;
    const requestToken = this._backdropRequestToken;
    this._backdropTargetVisualKey = finalVisualKey;
    const finalBackgroundImage = `${backdropCss}, ${fallbackBackdropCss}`;

    if (
      backdropCss === fallbackBackdropCss
      || this._decodedBackdropUrls.has(backdropUrl)
    ) {
      return this._applyBackdropCrossfade({
        backgroundImage: finalBackgroundImage,
        backdropFilter,
        visualKey: finalVisualKey
      });
    }

    // The family fallback becomes the complete visible layer while the
    // dedicated bitmap loads and decodes off-DOM. It therefore cannot pop in
    // halfway through a CSS fade.
    this._applyBackdropCrossfade({
      backgroundImage: fallbackBackdropCss,
      backdropFilter,
      visualKey: `pending|${fallbackBackdropCss}|${backdropFilter}`
    });
    const preloadStarted = this._startBackdropPreload({
      backdropUrl,
      finalBackgroundImage,
      backdropFilter,
      finalVisualKey,
      requestToken
    });
    if (!preloadStarted) {
      // Non-browser fixtures have no Image constructor. Preserve their inert
      // deterministic rendering while real browsers always use decode().
      return this._applyBackdropCrossfade({
        backgroundImage: finalBackgroundImage,
        backdropFilter,
        visualKey: finalVisualKey
      });
    }
    return true;
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
    this._destroyCameraControls();
    this.dom3DAdapter?.dispose?.();
    this.scene3D?.dispose?.();
    this.dom3DAdapter = null;
    this.scene3D = null;
    this.layerElement?.remove?.();
    clearEnvironmentStyles(this.fieldElement);
    this.layerElement = null;
    this._resetBackdropLayers();
    this._decodedBackdropUrls.clear();
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

    const environment = selection.environment;
    // Validate both URLs before mutating any DOM-backed visual state. This
    // keeps a poisoned dedicated or fallback URL out of CSS entirely.
    const backdropCss = toSafeBackdropCssValue(environment.backdropUrl);
    const fallbackBackdropCss = toSafeBackdropCssValue(
      environment.fallbackBackdropUrl || environment.backdropUrl
    );
    const backdropFilter = environment.backdropFilter || 'none';
    const backdropVisualKey = [
      backdropCss,
      fallbackBackdropCss,
      backdropFilter
    ].join('|');

    const previousEnvironmentId = this.selection?.environmentId || null;
    if (previousEnvironmentId !== safeEnvironmentId && previousEnvironmentId) {
      this.layerElement.classList?.remove?.(`is-environment-${previousEnvironmentId}`);
    }
    this.layerElement.classList?.add?.(`is-environment-${safeEnvironmentId}`);

    this.layerElement.dataset.environmentId = safeEnvironmentId;
    this.layerElement.dataset.environmentFallback = selection.isFallback ? 'true' : 'false';
    this.layerElement.dataset.transitionDuration = String(
      Number(environment.transitionDuration) || 0
    );
    setStyleProperty(
      this.layerElement,
      '--real-environment-backdrop',
      backdropCss
    );
    setStyleProperty(
      this.layerElement,
      '--real-environment-backdrop-fallback',
      fallbackBackdropCss
    );
    setStyleProperty(
      this.layerElement,
      '--real-environment-backdrop-opacity',
      1
    );
    setStyleProperty(
      this.layerElement,
      '--real-environment-backdrop-filter',
      backdropFilter
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
    this._requestBackdropTransition({
      backdropUrl: environment.backdropUrl,
      backdropCss,
      fallbackBackdropCss,
      backdropFilter,
      finalVisualKey: backdropVisualKey
    });
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
