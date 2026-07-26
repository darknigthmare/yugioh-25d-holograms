import { Scene } from 'three';
import {
  CSS3DObject,
  CSS3DRenderer
} from 'three/addons/renderers/CSS3DRenderer.js';

const BOARD_CSS_WIDTH = 900;
const BOARD_CSS_HEIGHT = 1125;
const BOARD_WORLD_SCALE = 16 / BOARD_CSS_WIDTH;
const HAND_CSS_WIDTH = 900;
const HAND_WORLD_SCALE = 10.5 / HAND_CSS_WIDTH;

export const REAL_DUEL_DOM_3D_LAYOUT = Object.freeze({
  board: Object.freeze({
    cssWidth: BOARD_CSS_WIDTH,
    cssHeight: BOARD_CSS_HEIGHT,
    worldWidth: 16,
    worldDepth: 20,
    position: Object.freeze([0, 0.62, 0]),
    rotation: Object.freeze([-Math.PI / 2, 0, 0]),
    scale: BOARD_WORLD_SCALE
  }),
  hand: Object.freeze({
    cssWidth: HAND_CSS_WIDTH,
    worldWidth: 10.5,
    position: Object.freeze([0, 1.45, 11.2]),
    rotation: Object.freeze([-Math.PI / 2 + 0.3, 0, 0]),
    scale: HAND_WORLD_SCALE
  })
});

const ELEMENT_STYLE_FALLBACK_PROPERTIES = Object.freeze([
  'height',
  'maxHeight',
  'maxWidth',
  'minHeight',
  'minWidth',
  'pointerEvents',
  'position',
  'transform',
  'transformOrigin',
  'userSelect',
  'width'
]);

function requireElement(element, name) {
  if (!element || typeof element !== 'object') {
    throw new TypeError(`RealDuelDOM3DAdapter requires ${name}.`);
  }
  return element;
}

function validateCamera(camera) {
  if (!camera?.isPerspectiveCamera) {
    throw new TypeError(
      'RealDuelDOM3DAdapter.mount(camera) requires a PerspectiveCamera.'
    );
  }
  return camera;
}

function setVector(vector, values) {
  if (typeof vector?.set === 'function') {
    vector.set(values[0], values[1], values[2]);
    return;
  }
  if (!vector) return;
  [vector.x, vector.y, vector.z] = values;
}

function setUniformScale(vector, value) {
  if (typeof vector?.setScalar === 'function') {
    vector.setScalar(value);
    return;
  }
  if (typeof vector?.set === 'function') {
    vector.set(value, value, value);
    return;
  }
  if (!vector) return;
  vector.x = value;
  vector.y = value;
  vector.z = value;
}

function hasAttribute(element, name) {
  return typeof element?.hasAttribute === 'function'
    ? element.hasAttribute(name)
    : element?.getAttribute?.(name) != null;
}

function captureStyleFallback(style) {
  const values = {};
  for (const property of ELEMENT_STYLE_FALLBACK_PROPERTIES) {
    values[property] = style?.[property];
  }
  return values;
}

function captureElement(element) {
  const parentNode = element.parentNode || null;
  const childNodes = parentNode?.childNodes
    ? Array.from(parentNode.childNodes)
    : Array.from(parentNode?.children || []);

  return {
    element,
    parentNode,
    nextSibling: element.nextSibling || null,
    previousSibling: element.previousSibling || null,
    childIndex: Math.max(0, childNodes.indexOf(element)),
    styleAttributeSupported: typeof element.getAttribute === 'function',
    styleAttribute: element.getAttribute?.('style') ?? null,
    styleCssText: element.style?.cssText,
    styleFallback: captureStyleFallback(element.style),
    draggableAttributePresent: hasAttribute(element, 'draggable'),
    draggableAttribute: element.getAttribute?.('draggable') ?? null,
    draggableProperty: element.draggable
  };
}

function restoreAttribute(element, name, present, value) {
  if (present) {
    element.setAttribute?.(name, value ?? '');
  } else {
    element.removeAttribute?.(name);
  }
}

function restoreElementStyle(snapshot) {
  const { element } = snapshot;
  if (snapshot.styleAttributeSupported) {
    if (snapshot.styleAttribute == null) {
      element.removeAttribute?.('style');
    } else {
      element.setAttribute?.('style', snapshot.styleAttribute);
    }
    return;
  }

  if (element.style && typeof snapshot.styleCssText === 'string') {
    element.style.cssText = snapshot.styleCssText;
    return;
  }

  for (const [property, value] of Object.entries(snapshot.styleFallback)) {
    if (!element.style) break;
    element.style[property] = value ?? '';
  }
}

function restoreElementPosition(snapshot) {
  const { element, parentNode } = snapshot;
  if (!parentNode) {
    element.remove?.();
    return;
  }

  if (snapshot.nextSibling?.parentNode === parentNode) {
    parentNode.insertBefore?.(element, snapshot.nextSibling);
    return;
  }

  const children = parentNode.childNodes
    ? Array.from(parentNode.childNodes)
    : Array.from(parentNode.children || []);
  const elementAtOriginalIndex = children[snapshot.childIndex];
  if (elementAtOriginalIndex && elementAtOriginalIndex !== element) {
    parentNode.insertBefore?.(element, elementAtOriginalIndex);
    return;
  }

  if (snapshot.previousSibling?.parentNode === parentNode) {
    const followingSibling = snapshot.previousSibling.nextSibling || null;
    if (followingSibling) {
      parentNode.insertBefore?.(element, followingSibling);
    } else {
      parentNode.appendChild?.(element);
    }
    return;
  }

  parentNode.appendChild?.(element);
}

function restoreElement(snapshot) {
  if (!snapshot?.element) return;
  restoreElementStyle(snapshot);
  restoreAttribute(
    snapshot.element,
    'draggable',
    snapshot.draggableAttributePresent,
    snapshot.draggableAttribute
  );
  if (
    !snapshot.draggableAttributePresent
    && typeof snapshot.draggableProperty === 'boolean'
    && !snapshot.element.removeAttribute
  ) {
    snapshot.element.draggable = snapshot.draggableProperty;
  }
  restoreElementPosition(snapshot);
}

function configureInteractiveElement(element, styles) {
  if (!element.style) return;
  for (const [property, value] of Object.entries(styles)) {
    element.style[property] = value;
  }
}

function configureObject(object, layout) {
  setVector(object.position, layout.position);
  setVector(object.rotation, layout.rotation);
  setUniformScale(object.scale, layout.scale);
}

/**
 * Keeps the existing accessible duel DOM aligned with the real Three.js scene.
 *
 * No card or zone is cloned. Activation moves the exact board and hand nodes
 * into two CSS3DObjects; deactivation restores their original parent, sibling
 * position, inline style and draggable attribute.
 */
export class RealDuelDOM3DAdapter {
  constructor(options = {}) {
    this.documentRef = options.documentRef
      || options.boardElement?.ownerDocument
      || globalThis.document
      || null;
    this.boardElement = requireElement(options.boardElement, 'boardElement');
    this.handElement = requireElement(options.handElement, 'handElement');
    this.interactionHostElement = requireElement(
      options.interactionHostElement,
      'interactionHostElement'
    );
    if (this.boardElement === this.handElement) {
      throw new TypeError('The duel board and player hand must be distinct nodes.');
    }
    if (
      this.boardElement.contains?.(this.interactionHostElement)
      || this.handElement.contains?.(this.interactionHostElement)
    ) {
      throw new TypeError('The CSS 3D interaction host cannot be inside moved DOM.');
    }

    this.rendererFactory = options.rendererFactory
      || (() => new CSS3DRenderer());
    this.objectFactory = options.objectFactory
      || (element => new CSS3DObject(element));
    this.sceneFactory = options.sceneFactory || (() => new Scene());

    this.camera = null;
    this.scene = null;
    this.renderer = null;
    this.rootElement = null;
    this.boardObject = null;
    this.handObject = null;
    this._boardSnapshot = null;
    this._handSnapshot = null;
    this.active = false;
    this.disposed = false;
  }

  get isMounted() {
    return Boolean(
      this.rootElement
      && this.rootElement.parentNode === this.interactionHostElement
    );
  }

  get isActive() {
    return this.active;
  }

  getElement() {
    return this.rootElement;
  }

  mount(camera) {
    if (this.disposed) {
      throw new Error('A disposed RealDuelDOM3DAdapter cannot be mounted.');
    }
    this.camera = validateCamera(camera);
    if (this.isMounted) return this.rootElement;

    // A host rerender may have detached the renderer root. Reuse neither the
    // stale renderer nor its camera element; create one clean DOM hierarchy.
    this._removeRendererRoot();
    try {
      this.scene = this.sceneFactory();
      this.renderer = this.rendererFactory();
      const root = requireElement(
        this.renderer?.domElement,
        'a CSS3DRenderer DOM root'
      );
      root.classList?.add?.('real-duel-css3d-root');
      if (root.dataset) root.dataset.realDuelCss3dRoot = 'true';
      configureInteractiveElement(root, {
        inset: '0',
        overflow: 'visible',
        pointerEvents: 'none',
        position: 'absolute'
      });
      this.interactionHostElement.appendChild(root);
      this.rootElement = root;
      return root;
    } catch (error) {
      this._removeRendererRoot();
      this.scene = null;
      this.renderer = null;
      throw error;
    }
  }

  activate() {
    if (this.disposed) return false;
    if (!this.isMounted || !this.renderer || !this.scene || !this.camera) {
      throw new Error('RealDuelDOM3DAdapter must be mounted before activation.');
    }
    if (this.active) return true;
    if (!this.boardElement.parentNode || !this.handElement.parentNode) {
      throw new Error('The existing duel board and player hand must be attached.');
    }

    this._boardSnapshot = captureElement(this.boardElement);
    this._handSnapshot = captureElement(this.handElement);
    try {
      configureInteractiveElement(this.boardElement, {
        height: `${BOARD_CSS_HEIGHT}px`,
        maxHeight: 'none',
        maxWidth: 'none',
        minHeight: '0',
        minWidth: '0',
        pointerEvents: 'auto',
        position: 'absolute',
        transformOrigin: '50% 50%',
        width: `${BOARD_CSS_WIDTH}px`
      });
      configureInteractiveElement(this.handElement, {
        maxWidth: 'none',
        minWidth: '0',
        pointerEvents: 'auto',
        position: 'absolute',
        transformOrigin: '50% 50%',
        width: `${HAND_CSS_WIDTH}px`
      });

      this.boardObject = this.objectFactory(this.boardElement);
      this.handObject = this.objectFactory(this.handElement);
      // CSS3DObject defensively writes draggable="false". The live board and
      // hand must keep their original drag semantics while they are mounted.
      restoreAttribute(
        this.boardElement,
        'draggable',
        this._boardSnapshot.draggableAttributePresent,
        this._boardSnapshot.draggableAttribute
      );
      restoreAttribute(
        this.handElement,
        'draggable',
        this._handSnapshot.draggableAttributePresent,
        this._handSnapshot.draggableAttribute
      );
      this.boardElement.style.pointerEvents = 'auto';
      this.handElement.style.pointerEvents = 'auto';

      configureObject(this.boardObject, REAL_DUEL_DOM_3D_LAYOUT.board);
      configureObject(this.handObject, REAL_DUEL_DOM_3D_LAYOUT.hand);
      this.scene.add(this.boardObject);
      this.scene.add(this.handObject);
      this.active = true;
      this.renderer.render(this.scene, this.camera);
      return true;
    } catch (error) {
      this._restoreMovedDOM();
      throw error;
    }
  }

  resize(width, height) {
    if (this.disposed || !this.renderer || !this.camera) return false;
    const safeWidth = Number(width);
    const safeHeight = Number(height);
    if (
      !Number.isFinite(safeWidth)
      || !Number.isFinite(safeHeight)
      || safeWidth <= 0
      || safeHeight <= 0
    ) {
      throw new RangeError('CSS 3D renderer dimensions must be positive.');
    }

    try {
      this.camera.aspect = safeWidth / safeHeight;
      this.camera.updateProjectionMatrix?.();
      this.renderer.setSize(safeWidth, safeHeight);
      return true;
    } catch (error) {
      if (this.active) this._restoreMovedDOM();
      throw error;
    }
  }

  render() {
    if (
      this.disposed
      || !this.active
      || !this.renderer
      || !this.scene
      || !this.camera
    ) return false;

    try {
      this.renderer.render(this.scene, this.camera);
      return true;
    } catch (error) {
      this._restoreMovedDOM();
      throw error;
    }
  }

  deactivate() {
    if (this.disposed) return false;
    return this._restoreMovedDOM();
  }

  dispose() {
    if (this.disposed) return false;
    this._restoreMovedDOM();
    this._removeRendererRoot();
    this.scene?.clear?.();
    this.camera = null;
    this.scene = null;
    this.renderer = null;
    this.rootElement = null;
    this.disposed = true;
    return true;
  }

  _restoreMovedDOM() {
    const hadActiveDOM = Boolean(
      this.active
      || this._boardSnapshot
      || this._handSnapshot
      || this.boardObject
      || this.handObject
    );
    this.active = false;

    for (const object of [this.handObject, this.boardObject]) {
      if (!object) continue;
      try {
        object.removeFromParent?.();
      } catch {
        try {
          this.scene?.remove?.(object);
        } catch {
          // The snapshots below remain sufficient for a complete DOM rollback.
        }
      }
    }

    // Restore both nodes even if a renderer moved only one before failing.
    restoreElement(this._handSnapshot);
    restoreElement(this._boardSnapshot);
    this.handObject = null;
    this.boardObject = null;
    this._handSnapshot = null;
    this._boardSnapshot = null;
    return hadActiveDOM;
  }

  _removeRendererRoot() {
    const roots = new Set([
      this.rootElement,
      this.renderer?.domElement
    ]);
    for (const root of roots) {
      try {
        root?.remove?.();
      } catch {
        if (root?.parentNode?.removeChild) {
          root.parentNode.removeChild(root);
        }
      }
    }
    this.rootElement = null;
  }
}

export function createRealDuelDOM3DAdapter(options = {}) {
  return new RealDuelDOM3DAdapter(options);
}

export default RealDuelDOM3DAdapter;
