import * as THREE from 'three';

const DEFAULT_ENVIRONMENT = Object.freeze({
  id: 'clearing',
  environmentTint: '#243d32',
  accentColor: '#48d9ff',
  lighting: Object.freeze({
    ambient: '#b8d6c4',
    directional: '#fff4d6',
    intensity: 0.9
  }),
  fog: Object.freeze({ color: '#678075', density: 0.018 })
});

const ENVIRONMENT_PALETTES = Object.freeze({
  clearing: Object.freeze({
    background: '#172c25',
    ground: '#263f32',
    platform: '#414b50',
    rail: '#80dce7'
  }),
  cave: Object.freeze({
    background: '#111722',
    ground: '#252836',
    platform: '#353b45',
    rail: '#6ed8ff'
  }),
  generic: Object.freeze({
    background: '#08101e',
    ground: '#111d32',
    platform: '#303b4c',
    rail: '#79d9ff'
  }),
  yami: Object.freeze({
    background: '#110b1d',
    ground: '#241535',
    platform: '#342d40',
    rail: '#c36cff'
  }),
  umi: Object.freeze({
    background: '#071c2c',
    ground: '#0b3852',
    platform: '#294758',
    rail: '#35d9ff'
  }),
  forest: Object.freeze({
    background: '#102319',
    ground: '#1c3d28',
    platform: '#344a3c',
    rail: '#62ff7c'
  }),
  mountain: Object.freeze({
    background: '#28303e',
    ground: '#424b58',
    platform: '#505966',
    rail: '#b8d5ff'
  }),
  sogen: Object.freeze({
    background: '#35482f',
    ground: '#5d744f',
    platform: '#555e50',
    rail: '#d8ff8d'
  }),
  wasteland: Object.freeze({
    background: '#3d261d',
    ground: '#6a4430',
    platform: '#55443b',
    rail: '#ff9f61'
  }),
  'toon-world': Object.freeze({
    background: '#401a51',
    ground: '#713365',
    platform: '#5a456c',
    rail: '#fff16b'
  })
});

function resolveEnvironment(value) {
  const candidate = value?.environment || value;
  if (!candidate || typeof candidate !== 'object') return DEFAULT_ENVIRONMENT;
  const id = String(candidate.id || value?.environmentId || 'generic')
    .trim()
    .toLowerCase();
  return {
    ...DEFAULT_ENVIRONMENT,
    ...candidate,
    id: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ? id : 'generic',
    lighting: {
      ...DEFAULT_ENVIRONMENT.lighting,
      ...(candidate.lighting || {})
    },
    fog: {
      ...DEFAULT_ENVIRONMENT.fog,
      ...(candidate.fog || {})
    }
  };
}

function color(value, fallback) {
  try {
    return new THREE.Color(value || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

function createTrapezoidGeometry(widthFront, widthBack, depth, height) {
  const frontZ = depth / 2;
  const backZ = -depth / 2;
  const vertices = new Float32Array([
    -widthFront / 2, 0, frontZ,
    widthFront / 2, 0, frontZ,
    -widthBack / 2, 0, backZ,
    widthBack / 2, 0, backZ,
    -widthFront / 2, -height, frontZ,
    widthFront / 2, -height, frontZ,
    -widthBack / 2, -height, backZ,
    widthBack / 2, -height, backZ
  ]);
  const indices = [
    0, 1, 2, 2, 1, 3,
    4, 6, 5, 5, 6, 7,
    0, 4, 1, 1, 4, 5,
    2, 3, 6, 6, 3, 7,
    0, 2, 4, 4, 2, 6,
    1, 5, 3, 3, 5, 7
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function disposeMaterial(material) {
  if (!material) return;
  for (const value of Object.values(material)) {
    if (value?.isTexture) value.dispose();
  }
  material.dispose?.();
}

function disposeObject3D(root) {
  root?.traverse?.(object => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) {
      object.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(object.material);
    }
  });
}

/**
 * Owns the single WebGL renderer used by the immersive duel view.
 *
 * The class is deliberately visual-only: it never clones cards, owns duel
 * state, or captures pointer events. Existing DOM interaction layers can use
 * getCamera() and the exported world dimensions to share the same projection.
 */
export class RealDuelScene3D {
  static ARENA_WIDTH = 16;
  static ARENA_DEPTH = 20;
  static ARENA_TOP_Y = 0.62;

  constructor(options = {}) {
    this.documentRef = options.documentRef || globalThis.document || null;
    this.windowRef = options.windowRef || globalThis.window || null;
    this.hostElement = options.hostElement || null;
    this.rendererFactory = options.rendererFactory
      || (rendererOptions => new THREE.WebGLRenderer(rendererOptions));
    this.pixelRatioLimit = Math.max(1, Number(options.pixelRatioLimit) || 1.75);
    this.root = null;
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.environment = DEFAULT_ENVIRONMENT;
    this.publicSummary = null;
    this.active = false;
    this.running = false;
    this.disposed = false;
    this.webglAvailable = true;
    this._frameHandle = null;
    this._width = 1;
    this._height = 1;
    this._accentMaterials = [];
    this._platformMaterial = null;
    this._groundMaterial = null;
    this._hemiLight = null;
    this._directionalLight = null;
    this._boundFrame = () => this._onFrame();
    this._boundVisibility = () => {
      if (this.documentRef?.hidden === true) this.pause();
      else if (this.active) this.start();
    };
    this._boundResize = () => this.resize();
  }

  getCamera() {
    return this.camera;
  }

  mount(hostElement = this.hostElement) {
    if (this.disposed) {
      throw new Error('A disposed RealDuelScene3D cannot be mounted.');
    }
    if (this.root?.parentNode) return this.root;
    if (!hostElement || !this.documentRef?.createElement) {
      throw new Error('RealDuelScene3D requires an existing host element.');
    }
    this.hostElement = hostElement;
    const root = this.documentRef.createElement('div');
    root.className = 'real-duel-scene-3d';
    root.dataset.realDuelScene3d = 'true';
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('role', 'presentation');
    root.inert = true;
    Object.assign(root.style, {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden',
      pointerEvents: 'none'
    });
    this.root = root;
    hostElement.appendChild(root);

    try {
      this._createRenderer();
      this._createScene();
      this._attachListeners();
      this.resize();
      this.updateEnvironment(this.environment);
      this.render();
    } catch (error) {
      this.webglAvailable = false;
      this._destroyRenderer();
      root.dataset.webglAvailable = 'false';
      root.hidden = true;
      if (typeof this.onError === 'function') this.onError(error);
    }
    return root;
  }

  _createRenderer() {
    if (this.renderer) return this.renderer;
    const renderer = this.rendererFactory({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    if (!renderer?.domElement) {
      throw new Error('The WebGL renderer did not provide a canvas.');
    }
    this.renderer = renderer;
    this.canvas = renderer.domElement;
    this.canvas.className = 'real-duel-scene-3d-canvas';
    this.canvas.setAttribute?.('aria-hidden', 'true');
    this.canvas.setAttribute?.('role', 'presentation');
    this.canvas.tabIndex = -1;
    this.canvas.inert = true;
    Object.assign(this.canvas.style || {}, {
      display: 'block',
      width: '100%',
      height: '100%',
      pointerEvents: 'none'
    });
    renderer.setPixelRatio?.(
      Math.min(Number(this.windowRef?.devicePixelRatio) || 1, this.pixelRatioLimit)
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    this.root.appendChild(this.canvas);
    this.root.dataset.webglAvailable = 'true';
    return renderer;
  }

  _createScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(0, 0, 0);

    this._hemiLight = new THREE.HemisphereLight('#cce7db', '#18221f', 1);
    this.scene.add(this._hemiLight);
    this._directionalLight = new THREE.DirectionalLight('#fff4dc', 2.2);
    this._directionalLight.position.set(-7, 18, 14);
    this._directionalLight.castShadow = true;
    this._directionalLight.shadow.mapSize.set(1024, 1024);
    this._directionalLight.shadow.camera.left = -22;
    this._directionalLight.shadow.camera.right = 22;
    this._directionalLight.shadow.camera.top = 28;
    this._directionalLight.shadow.camera.bottom = -15;
    this.scene.add(this._directionalLight);

    const groundGeometry = new THREE.CircleGeometry(48, 48);
    // Transparent receiving plane: the original generated scenic artwork
    // supplies the ground detail while real meshes still cast soft shadows.
    this._groundMaterial = new THREE.ShadowMaterial({
      color: '#101815',
      opacity: 0.34,
      transparent: true
    });
    const ground = new THREE.Mesh(groundGeometry, this._groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.64;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const arena = new THREE.Group();
    arena.name = 'arena-platform';
    const platformGeometry = new THREE.BoxGeometry(
      RealDuelScene3D.ARENA_WIDTH,
      1.2,
      RealDuelScene3D.ARENA_DEPTH
    );
    this._platformMaterial = new THREE.MeshStandardMaterial({
      color: '#414b50',
      metalness: 0.48,
      roughness: 0.52
    });
    const platform = new THREE.Mesh(platformGeometry, this._platformMaterial);
    platform.receiveShadow = true;
    platform.castShadow = true;
    arena.add(platform);

    const railMaterial = new THREE.MeshStandardMaterial({
      color: '#80dce7',
      emissive: '#147487',
      emissiveIntensity: 0.85,
      metalness: 0.6,
      roughness: 0.25
    });
    this._accentMaterials.push(railMaterial);
    for (const x of [-8.18, 8.18]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.34, 20.45),
        railMaterial
      );
      rail.position.set(x, 0.75, 0);
      rail.castShadow = true;
      arena.add(rail);
    }
    for (const z of [-10.18, 10.18]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(16.6, 0.34, 0.28),
        railMaterial
      );
      rail.position.set(0, 0.75, z);
      rail.castShadow = true;
      arena.add(rail);
    }

    const seamMaterial = new THREE.MeshBasicMaterial({
      color: '#151c21',
      transparent: true,
      opacity: 0.7
    });
    for (let z = -7.5; z <= 7.5; z += 5) {
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(15.7, 0.018, 0.04),
        seamMaterial
      );
      seam.position.set(0, RealDuelScene3D.ARENA_TOP_Y, z);
      arena.add(seam);
    }
    for (const x of [-5.25, 0, 5.25]) {
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.018, 19.7),
        seamMaterial
      );
      seam.position.set(x, RealDuelScene3D.ARENA_TOP_Y, 0);
      arena.add(seam);
    }
    this.scene.add(arena);

    this.scene.add(this._createConsole({
      name: 'player-console',
      z: 11.4,
      rotationY: 0,
      widthFront: 14.5,
      widthBack: 12.6
    }));
    this.scene.add(this._createConsole({
      name: 'opponent-console',
      z: -12.05,
      rotationY: Math.PI,
      widthFront: 10.5,
      widthBack: 8.8,
      scale: 0.88
    }));
    this.scene.add(this._createOpponent());
  }

  _createConsole({
    name,
    z,
    rotationY,
    widthFront,
    widthBack,
    scale = 1
  }) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(0, 0, z);
    group.rotation.y = rotationY;
    group.scale.setScalar(scale);

    const shellMaterial = new THREE.MeshStandardMaterial({
      color: '#4b2830',
      metalness: 0.45,
      roughness: 0.48
    });
    const shell = new THREE.Mesh(
      createTrapezoidGeometry(widthFront, widthBack, 4.1, 2.25),
      shellMaterial
    );
    shell.position.y = 1.25;
    shell.castShadow = true;
    shell.receiveShadow = true;
    group.add(shell);

    const panelMaterial = new THREE.MeshStandardMaterial({
      color: '#17272e',
      emissive: '#0c3d49',
      emissiveIntensity: 0.6,
      metalness: 0.68,
      roughness: 0.28
    });
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(widthBack * 0.7, 0.14, 2.35),
      panelMaterial
    );
    panel.position.set(0, 1.42, -0.15);
    panel.rotation.x = 0.3;
    group.add(panel);

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: '#80dce7',
      emissive: '#147487',
      emissiveIntensity: 1.1,
      metalness: 0.4,
      roughness: 0.24
    });
    this._accentMaterials.push(accentMaterial);
    const display = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.18, 0.8),
      accentMaterial
    );
    display.position.set(0, 1.6, -0.45);
    display.rotation.x = 0.3;
    group.add(display);
    return group;
  }

  _createOpponent() {
    const opponent = new THREE.Group();
    opponent.name = 'opponent-character';
    opponent.position.set(0, 0, -15.1);

    const clothing = new THREE.MeshStandardMaterial({
      color: '#23344e',
      roughness: 0.76
    });
    const hair = new THREE.MeshStandardMaterial({
      color: '#21182d',
      roughness: 0.82
    });
    const skin = new THREE.MeshStandardMaterial({
      color: '#c89474',
      roughness: 0.9
    });
    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.78, 2.2, 5, 10),
      clothing
    );
    torso.position.y = 3.2;
    torso.castShadow = true;
    opponent.add(torso);

    const shoulders = new THREE.Mesh(
      new THREE.BoxGeometry(2.15, 0.48, 0.76),
      clothing
    );
    shoulders.position.set(0, 4.12, 0.02);
    shoulders.castShadow = true;
    opponent.add(shoulders);

    const hairMass = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.74, 0),
      hair
    );
    hairMass.position.set(0, 5.35, -0.22);
    hairMass.castShadow = true;
    opponent.add(hairMass);

    const head = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.63, 1),
      skin
    );
    head.position.set(0, 5.12, 0.2);
    head.castShadow = true;
    opponent.add(head);
    for (const [x, rotationZ] of [
      [-0.58, -0.48],
      [-0.28, -0.2],
      [0, 0],
      [0.28, 0.2],
      [0.58, 0.48]
    ]) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.82, 5),
        hair
      );
      spike.position.set(x, 5.95 - Math.abs(x) * 0.25, -0.2);
      spike.rotation.z = rotationZ;
      spike.castShadow = true;
      opponent.add(spike);
    }
    for (const x of [-0.68, 0.68]) {
      const arm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 1.8, 4, 8),
        clothing
      );
      arm.position.set(x, 3.2, 0);
      arm.rotation.z = x < 0 ? -0.18 : 0.18;
      arm.castShadow = true;
      opponent.add(arm);
    }
    return opponent;
  }

  _attachListeners() {
    this.documentRef?.addEventListener?.('visibilitychange', this._boundVisibility);
    this.windowRef?.addEventListener?.('resize', this._boundResize, { passive: true });
  }

  _detachListeners() {
    this.documentRef?.removeEventListener?.('visibilitychange', this._boundVisibility);
    this.windowRef?.removeEventListener?.('resize', this._boundResize);
  }

  async activate(selectionOrEnvironment = this.environment, publicSummary = null) {
    if (this.disposed) return false;
    if (!this.root?.parentNode) this.mount();
    if (!this.webglAvailable) return false;
    this.active = true;
    this.root.hidden = false;
    this.updateEnvironment(selectionOrEnvironment);
    this.updatePublicSummary(publicSummary);
    this.resize();
    this.start();
    return true;
  }

  updateEnvironment(selectionOrEnvironment) {
    this.environment = resolveEnvironment(selectionOrEnvironment);
    if (!this.scene) return this.environment;
    const palette = ENVIRONMENT_PALETTES[this.environment.id]
      || ENVIRONMENT_PALETTES.generic;
    const accent = color(this.environment.accentColor, palette.rail);
    // Keep the generated original scenic bitmap visible behind the transparent
    // renderer while all gameplay-critical volumes remain genuine geometry.
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(
      color(this.environment.fog?.color, palette.background),
      Math.min(0.065, Math.max(0.002, Number(this.environment.fog?.density) * 0.09 || 0.012))
    );
    this._groundMaterial?.color?.set('#0b0f0d');
    this._platformMaterial?.color?.set(palette.platform);
    for (const material of this._accentMaterials) {
      material.color.copy(accent);
      material.emissive.copy(accent).multiplyScalar(0.48);
    }
    this._hemiLight?.color?.set(this.environment.lighting?.ambient);
    this._hemiLight?.groundColor?.set(palette.ground);
    if (this._hemiLight) {
      this._hemiLight.intensity = Math.max(
        0.35,
        Number(this.environment.lighting?.intensity) || 0.8
      );
    }
    this._directionalLight?.color?.set(this.environment.lighting?.directional);
    if (this._directionalLight) {
      this._directionalLight.intensity = 1.5 + (
        Number(this.environment.lighting?.intensity) || 0.8
      );
    }
    if (this.root) this.root.dataset.environmentId = this.environment.id;
    this.render();
    return this.environment;
  }

  updatePublicSummary(publicSummary) {
    // Retain only the caller-provided public aggregate. The scene currently
    // uses no private card data and intentionally does not inspect hands.
    this.publicSummary = publicSummary || null;
    if (this.publicSummary?.duelEnded) this.pause();
    return this.publicSummary;
  }

  resize(width, height) {
    if (!this.renderer || !this.camera || !this.root) return false;
    const bounds = this.root.getBoundingClientRect?.();
    const nextWidth = Math.max(
      1,
      Math.round(Number(width) || bounds?.width || this.root.clientWidth || 1)
    );
    const nextHeight = Math.max(
      1,
      Math.round(Number(height) || bounds?.height || this.root.clientHeight || 1)
    );
    if (nextWidth === this._width && nextHeight === this._height) return true;
    this._width = nextWidth;
    this._height = nextHeight;
    const isMobile = nextWidth <= 600;
    const isTablet = !isMobile && nextWidth <= 1050;
    this.camera.fov = isMobile ? 54 : (isTablet ? 43 : 36);
    this.camera.position.set(
      0,
      isMobile ? 16 : (isTablet ? 15.5 : 15),
      isMobile ? 27 : (isTablet ? 26 : 25)
    );
    this.camera.lookAt(0, isMobile ? 0.8 : (isTablet ? 2.2 : 0), 0);
    this.camera.aspect = nextWidth / nextHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(nextWidth, nextHeight, false);
    this.render();
    return true;
  }

  start() {
    if (
      this.disposed
      || !this.active
      || !this.webglAvailable
      || this.publicSummary?.duelEnded
      || this.documentRef?.hidden === true
    ) return false;
    if (this.running) return true;
    this.running = true;
    this._scheduleFrame();
    return true;
  }

  pause() {
    this.running = false;
    if (this._frameHandle !== null) {
      const cancel = this.windowRef?.cancelAnimationFrame
        || globalThis.cancelAnimationFrame;
      cancel?.(this._frameHandle);
      this._frameHandle = null;
    }
    return true;
  }

  deactivate() {
    if (this.disposed) return false;
    this.active = false;
    this.pause();
    if (this.root) this.root.hidden = true;
    return true;
  }

  _scheduleFrame() {
    if (!this.running || this._frameHandle !== null) return;
    const request = this.windowRef?.requestAnimationFrame
      || globalThis.requestAnimationFrame;
    if (!request) {
      this.render();
      this.running = false;
      return;
    }
    this._frameHandle = request(this._boundFrame);
  }

  _onFrame() {
    this._frameHandle = null;
    if (!this.running) return;
    this.render();
    this._scheduleFrame();
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera || !this.webglAvailable) {
      return false;
    }
    this.renderer.render(this.scene, this.camera);
    return true;
  }

  _destroyRenderer() {
    this.pause();
    disposeObject3D(this.scene);
    this.scene?.clear?.();
    this.renderer?.renderLists?.dispose?.();
    this.renderer?.dispose?.();
    this.renderer?.forceContextLoss?.();
    this.canvas?.remove?.();
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this._accentMaterials = [];
    this._platformMaterial = null;
    this._groundMaterial = null;
    this._hemiLight = null;
    this._directionalLight = null;
  }

  dispose() {
    if (this.disposed) return false;
    this.deactivate();
    this._detachListeners();
    this._destroyRenderer();
    this.root?.remove?.();
    this.root = null;
    this.hostElement = null;
    this.publicSummary = null;
    this.disposed = true;
    return true;
  }
}

export function createRealDuelScene3D(options = {}) {
  return new RealDuelScene3D(options);
}

export default RealDuelScene3D;
