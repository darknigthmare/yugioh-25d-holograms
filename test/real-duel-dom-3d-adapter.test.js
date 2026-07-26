import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REAL_DUEL_DOM_3D_LAYOUT,
  RealDuelDOM3DAdapter
} from '../src/ui/RealDuelDOM3DAdapter.js';

function createStyle() {
  const properties = new Map();
  const target = {
    get cssText() {
      return Array.from(properties, ([name, value]) => `${name}: ${value};`).join(' ');
    },
    set cssText(value) {
      properties.clear();
      for (const declaration of String(value || '').split(';')) {
        const separator = declaration.indexOf(':');
        if (separator < 0) continue;
        const name = declaration.slice(0, separator).trim();
        const propertyValue = declaration.slice(separator + 1).trim();
        if (name) properties.set(name, propertyValue);
      }
    }
  };
  return new Proxy(target, {
    get(object, property) {
      if (property in object) return object[property];
      return properties.get(String(property)) || '';
    },
    set(object, property, value) {
      if (property === 'cssText') {
        object.cssText = value;
      } else {
        properties.set(String(property), String(value));
      }
      return true;
    }
  });
}

class FakeElement {
  constructor(name) {
    this.name = name;
    this.parentNode = null;
    this.children = [];
    this.childNodes = this.children;
    this.style = createStyle();
    this.dataset = {};
    this.attributes = new Map();
    this.classes = new Set();
    this.classList = {
      add: value => this.classes.add(value)
    };
    this.draggable = false;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const index = this.parentNode.children.indexOf(this);
    return this.parentNode.children[index + 1] || null;
  }

  get previousSibling() {
    if (!this.parentNode) return null;
    const index = this.parentNode.children.indexOf(this);
    return this.parentNode.children[index - 1] || null;
  }

  appendChild(child) {
    child.remove();
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  insertBefore(child, reference) {
    child.remove();
    const index = this.children.indexOf(reference);
    if (index < 0) return this.appendChild(child);
    this.children.splice(index, 0, child);
    child.parentNode = this;
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }

  contains(candidate) {
    if (candidate === this) return true;
    return this.children.some(child => child.contains(candidate));
  }

  hasAttribute(name) {
    if (name === 'style') return this.style.cssText.length > 0;
    return this.attributes.has(name);
  }

  getAttribute(name) {
    if (name === 'style') return this.style.cssText || null;
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    if (name === 'style') {
      this.style.cssText = String(value);
      return;
    }
    this.attributes.set(name, String(value));
    if (name === 'draggable') this.draggable = String(value) === 'true';
  }

  removeAttribute(name) {
    if (name === 'style') {
      this.style.cssText = '';
      return;
    }
    this.attributes.delete(name);
    if (name === 'draggable') this.draggable = false;
  }
}

function vector() {
  return {
    x: 0,
    y: 0,
    z: 0,
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
    },
    setScalar(value) {
      this.set(value, value, value);
    }
  };
}

function createFixture({ failRender = false } = {}) {
  const boardParent = new FakeElement('board-parent');
  const beforeBoard = new FakeElement('before-board');
  const board = new FakeElement('board');
  const afterBoard = new FakeElement('after-board');
  boardParent.appendChild(beforeBoard);
  boardParent.appendChild(board);
  boardParent.appendChild(afterBoard);
  board.setAttribute('style', 'color: red; pointerEvents: inherit;');
  board.setAttribute('draggable', 'true');

  const handParent = new FakeElement('hand-parent');
  const hand = new FakeElement('hand');
  const commandPanel = new FakeElement('command-panel');
  handParent.appendChild(hand);
  handParent.appendChild(commandPanel);

  const host = new FakeElement('interaction-host');
  const rendererRoot = new FakeElement('renderer-root');
  const scene = {
    children: [],
    add(...objects) {
      for (const object of objects) {
        object.parent = this;
        this.children.push(object);
      }
    },
    remove(object) {
      this.children = this.children.filter(candidate => candidate !== object);
      object.parent = null;
      object.element.remove();
    },
    clear() {
      this.children = [];
    }
  };
  const objectFactory = element => {
    // Match the mutation performed by the real CSS3DObject constructor.
    element.setAttribute('draggable', 'false');
    element.style.position = 'absolute';
    element.style.userSelect = 'none';
    return {
      element,
      position: vector(),
      rotation: vector(),
      scale: vector(),
      parent: null,
      removeFromParent() {
        this.parent?.remove(this);
      }
    };
  };
  const renderer = {
    domElement: rendererRoot,
    renderCalls: 0,
    render(renderScene) {
      this.renderCalls += 1;
      for (const object of renderScene.children) {
        rendererRoot.appendChild(object.element);
      }
      if (failRender) throw new Error('CSS renderer failed');
    },
    setSize(width, height) {
      this.size = [width, height];
    }
  };
  const camera = {
    isPerspectiveCamera: true,
    aspect: 1,
    projectionUpdates: 0,
    updateProjectionMatrix() {
      this.projectionUpdates += 1;
    }
  };
  const adapter = new RealDuelDOM3DAdapter({
    boardElement: board,
    handElement: hand,
    interactionHostElement: host,
    rendererFactory: () => renderer,
    objectFactory,
    sceneFactory: () => scene
  });

  return {
    adapter,
    afterBoard,
    board,
    boardParent,
    camera,
    commandPanel,
    hand,
    handParent,
    host,
    renderer
  };
}

test('DOM CSS 3D adapter moves the live board and hand then restores them exactly', () => {
  const fixture = createFixture();
  const originalBoardStyle = fixture.board.getAttribute('style');
  const originalHandStyle = fixture.hand.getAttribute('style');
  const root = fixture.adapter.mount(fixture.camera);

  assert.equal(root.parentNode, fixture.host);
  assert.equal(root.style.pointerEvents, 'none');
  assert.equal(fixture.adapter.activate(), true);
  assert.equal(fixture.board.parentNode, root);
  assert.equal(fixture.hand.parentNode, root);
  assert.equal(fixture.board.style.pointerEvents, 'auto');
  assert.equal(fixture.hand.style.pointerEvents, 'auto');
  assert.equal(fixture.board.getAttribute('draggable'), 'true');
  assert.equal(fixture.hand.hasAttribute('draggable'), false);
  assert.equal(fixture.board.style.width, '900px');
  assert.equal(fixture.board.style.height, '1125px');

  assert.deepEqual(
    [
      fixture.adapter.boardObject.position.x,
      fixture.adapter.boardObject.position.y,
      fixture.adapter.boardObject.position.z
    ],
    REAL_DUEL_DOM_3D_LAYOUT.board.position
  );
  assert.equal(
    fixture.adapter.boardObject.scale.x,
    REAL_DUEL_DOM_3D_LAYOUT.board.scale
  );
  assert.equal(
    fixture.adapter.handObject.rotation.x,
    REAL_DUEL_DOM_3D_LAYOUT.hand.rotation[0]
  );

  assert.equal(fixture.adapter.resize(1920, 1080), true);
  assert.deepEqual(fixture.renderer.size, [1920, 1080]);
  assert.equal(fixture.camera.aspect, 1920 / 1080);
  assert.equal(fixture.adapter.render(), true);

  assert.equal(fixture.adapter.deactivate(), true);
  assert.deepEqual(
    fixture.boardParent.children.map(element => element.name),
    ['before-board', 'board', 'after-board']
  );
  assert.deepEqual(
    fixture.handParent.children.map(element => element.name),
    ['hand', 'command-panel']
  );
  assert.equal(fixture.board.getAttribute('style'), originalBoardStyle);
  assert.equal(fixture.hand.getAttribute('style'), originalHandStyle);
  assert.equal(fixture.board.getAttribute('draggable'), 'true');
  assert.equal(fixture.hand.hasAttribute('draggable'), false);
  assert.equal(fixture.adapter.dispose(), true);
  assert.equal(fixture.adapter.dispose(), false);
  assert.equal(root.parentNode, null);
});

test('DOM CSS 3D adapter rolls both nodes back if the CSS renderer fails', () => {
  const fixture = createFixture({ failRender: true });
  const originalBoardStyle = fixture.board.getAttribute('style');
  const originalHandStyle = fixture.hand.getAttribute('style');
  fixture.adapter.mount(fixture.camera);

  assert.throws(() => fixture.adapter.activate(), /CSS renderer failed/);
  assert.equal(fixture.adapter.isActive, false);
  assert.equal(fixture.board.parentNode, fixture.boardParent);
  assert.equal(fixture.board.nextSibling, fixture.afterBoard);
  assert.equal(fixture.hand.parentNode, fixture.handParent);
  assert.equal(fixture.hand.nextSibling, fixture.commandPanel);
  assert.equal(fixture.board.getAttribute('style'), originalBoardStyle);
  assert.equal(fixture.hand.getAttribute('style'), originalHandStyle);
});
