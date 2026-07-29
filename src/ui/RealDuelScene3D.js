import * as THREE from 'three';
import {
  normalizeRealDuelCameraPreset,
  resolveRealDuelCameraPose
} from './RealDuelCameraPresets.js';

const PLAYER_CONSOLE_PLAYMAT_URL =
  '/playmats/player-console-playmat-original.webp';

const DEFAULT_ENVIRONMENT = Object.freeze({
  id: 'clearing',
  arenaMaterial: 'kaibacorp-steel',
  environmentTint: '#243d32',
  accentColor: '#48d9ff',
  lighting: Object.freeze({
    ambient: '#b8d6c4',
    directional: '#fff4d6',
    intensity: 0.9
  }),
  fog: Object.freeze({ color: '#678075', density: 0.018 })
});

const DEFAULT_ARENA_MATERIAL_PROFILE = Object.freeze({
  platformTintBlend: 0.34,
  platformMetalness: 0.42,
  platformRoughness: 0.5,
  platformEmissiveIntensity: 0.08,
  playmatTintBlend: 0.34,
  playmatMetalness: 0.14,
  playmatRoughness: 0.76,
  playmatEmissiveIntensity: 0.12
});

const ARENA_MATERIAL_PROFILES = Object.freeze({
  'kaibacorp-steel': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.2,
    platformMetalness: 0.58,
    platformRoughness: 0.42,
    playmatTintBlend: 0.22
  }),
  'weathered-holographic-stone': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.46,
    platformMetalness: 0.16,
    platformRoughness: 0.82,
    platformEmissiveIntensity: 0.12,
    playmatTintBlend: 0.42,
    playmatRoughness: 0.84
  }),
  'neutral-hologram': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.42,
    platformMetalness: 0.34,
    platformRoughness: 0.4,
    platformEmissiveIntensity: 0.18,
    playmatTintBlend: 0.38,
    playmatEmissiveIntensity: 0.18
  }),
  'dark-hologram': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.52,
    platformMetalness: 0.28,
    platformRoughness: 0.5,
    platformEmissiveIntensity: 0.22,
    playmatTintBlend: 0.5,
    playmatEmissiveIntensity: 0.22
  }),
  'aquatic-hologram': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.56,
    platformMetalness: 0.38,
    platformRoughness: 0.34,
    platformEmissiveIntensity: 0.2,
    playmatTintBlend: 0.46,
    playmatRoughness: 0.58,
    playmatEmissiveIntensity: 0.2
  }),
  'verdant-hologram': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.5,
    platformMetalness: 0.2,
    platformRoughness: 0.68,
    platformEmissiveIntensity: 0.14,
    playmatTintBlend: 0.44,
    playmatRoughness: 0.8
  }),
  'storm-hologram': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.44,
    platformMetalness: 0.5,
    platformRoughness: 0.36,
    platformEmissiveIntensity: 0.17,
    playmatTintBlend: 0.38,
    playmatMetalness: 0.22,
    playmatRoughness: 0.62
  }),
  'plains-hologram': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.48,
    platformMetalness: 0.18,
    platformRoughness: 0.72,
    platformEmissiveIntensity: 0.1,
    playmatTintBlend: 0.4,
    playmatRoughness: 0.82
  }),
  'dust-hologram': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.58,
    platformMetalness: 0.12,
    platformRoughness: 0.86,
    platformEmissiveIntensity: 0.1,
    playmatTintBlend: 0.48,
    playmatRoughness: 0.88
  }),
  'toon-hologram': Object.freeze({
    ...DEFAULT_ARENA_MATERIAL_PROFILE,
    platformTintBlend: 0.54,
    platformMetalness: 0.22,
    platformRoughness: 0.46,
    platformEmissiveIntensity: 0.24,
    playmatTintBlend: 0.42,
    playmatEmissiveIntensity: 0.24
  })
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
  const arenaMaterial = String(candidate.arenaMaterial ?? '')
    .trim()
    .toLowerCase();
  return {
    id: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ? id : 'generic',
    arenaMaterial: Object.hasOwn(ARENA_MATERIAL_PROFILES, arenaMaterial)
      ? arenaMaterial
      : 'neutral-hologram',
    environmentTint: candidate.environmentTint
      || DEFAULT_ENVIRONMENT.environmentTint,
    accentColor: candidate.accentColor || DEFAULT_ENVIRONMENT.accentColor,
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

function resolveArenaMaterialProfile(value) {
  const id = String(value ?? '').trim().toLowerCase();
  return ARENA_MATERIAL_PROFILES[id] || DEFAULT_ARENA_MATERIAL_PROFILE;
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
    this.textureLoaderFactory = options.textureLoaderFactory
      || (() => new THREE.TextureLoader());
    this.pixelRatioLimit = Math.max(1, Number(options.pixelRatioLimit) || 1.75);
    this.root = null;
    this.canvas = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.cameraPreset = normalizeRealDuelCameraPreset(options.cameraPreset);
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
    this._playerPlaymatMaterial = null;
    this._playerPlaymatFrameMaterial = null;
    this._playerPlaymatTexture = null;
    this._cameraLookTarget = new THREE.Vector3();
    this._cameraTransition = null;
    this._cameraUpdateCallback = null;
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

  getCameraPreset() {
    return this.cameraPreset;
  }

  setCameraUpdateCallback(callback) {
    this._cameraUpdateCallback = typeof callback === 'function' ? callback : null;
    return this._cameraUpdateCallback;
  }

  setCameraPreset(presetId, options = {}) {
    if (this.disposed) return false;
    const nextPreset = normalizeRealDuelCameraPreset(presetId);
    const pose = resolveRealDuelCameraPose(nextPreset, this._width);
    const reducedMotion = this.windowRef?.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    )?.matches === true;
    const immediate = options.immediate === true
      || reducedMotion
      || !this.camera
      || this.publicSummary?.duelEnded === true;
    this.cameraPreset = nextPreset;
    if (this.root?.dataset) this.root.dataset.cameraPreset = nextPreset;

    if (immediate) {
      this._cameraTransition = null;
      this.root?.removeAttribute?.('data-camera-transitioning');
      this._applyCameraPose(pose);
      this.render();
      this._notifyCameraUpdate();
      return true;
    }

    const duration = Math.min(
      1200,
      Math.max(180, Number(options.duration) || 420)
    );
    this._cameraTransition = {
      startedAt: this._now(),
      duration,
      fromPosition: this.camera.position.clone(),
      fromTarget: this._cameraLookTarget.clone(),
      fromFov: this.camera.fov,
      toPosition: new THREE.Vector3(...pose.position),
      toTarget: new THREE.Vector3(...pose.target),
      toFov: pose.fov
    };
    if (this.root?.dataset) this.root.dataset.cameraTransitioning = 'true';
    this.start();
    return true;
  }

  _now() {
    return this.windowRef?.performance?.now?.()
      ?? globalThis.performance?.now?.()
      ?? Date.now();
  }

  _applyCameraPose(pose) {
    if (!this.camera || !pose) return false;
    this.camera.position.set(...pose.position);
    this._cameraLookTarget.set(...pose.target);
    this.camera.fov = pose.fov;
    this.camera.lookAt(this._cameraLookTarget);
    this.camera.updateProjectionMatrix();
    return true;
  }

  _notifyCameraUpdate() {
    try {
      this._cameraUpdateCallback?.(this.camera, this.cameraPreset);
    } catch {
      // A CSS projection failure is contained by its lifecycle owner.
    }
  }

  _updateCameraTransition(now = this._now()) {
    const transition = this._cameraTransition;
    if (!transition || !this.camera) return false;
    const linearProgress = Math.min(
      1,
      Math.max(0, (now - transition.startedAt) / transition.duration)
    );
    const progress = linearProgress < 0.5
      ? 4 * linearProgress ** 3
      : 1 - ((-2 * linearProgress + 2) ** 3) / 2;
    this.camera.position.lerpVectors(
      transition.fromPosition,
      transition.toPosition,
      progress
    );
    this._cameraLookTarget.lerpVectors(
      transition.fromTarget,
      transition.toTarget,
      progress
    );
    this.camera.fov = transition.fromFov
      + (transition.toFov - transition.fromFov) * progress;
    this.camera.lookAt(this._cameraLookTarget);
    this.camera.updateProjectionMatrix();

    if (linearProgress >= 1) {
      this._cameraTransition = null;
      this.root?.removeAttribute?.('data-camera-transitioning');
    }
    return true;
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
    this._applyCameraPose(
      resolveRealDuelCameraPose(this.cameraPreset, this._width)
    );

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
    platform.name = 'arena-platform-surface';
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
      widthBack: 12.6,
      withPlaymat: true
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
    scale = 1,
    withPlaymat = false
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

    if (withPlaymat) {
      this._addPlayerConsolePlaymat(group);
    } else {
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
    }

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: '#80dce7',
      emissive: '#147487',
      emissiveIntensity: 1.1,
      metalness: 0.4,
      roughness: 0.24
    });
    this._accentMaterials.push(accentMaterial);
    const display = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.18, withPlaymat ? 0.36 : 0.8),
      accentMaterial
    );
    display.position.set(0, withPlaymat ? 1.72 : 1.6, withPlaymat ? -1.82 : -0.45);
    display.rotation.x = 0.3;
    group.add(display);
    return group;
  }

  _addPlayerConsolePlaymat(group) {
    this._playerPlaymatFrameMaterial = new THREE.MeshStandardMaterial({
      color: '#29151c',
      metalness: 0.68,
      roughness: 0.34
    });
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(12, 0.18, 4),
      this._playerPlaymatFrameMaterial
    );
    frame.name = 'player-console-playmat-frame';
    frame.position.set(0, 1.32, -0.2);
    frame.rotation.x = 0.3;
    frame.castShadow = true;
    frame.receiveShadow = true;
    group.add(frame);

    this._playerPlaymatMaterial = new THREE.MeshStandardMaterial({
      color: '#102433',
      emissive: '#061923',
      emissiveIntensity: 0.28,
      metalness: 0.14,
      roughness: 0.76
    });
    const playmat = new THREE.Mesh(
      new THREE.BoxGeometry(11.4, 0.025, 3.8),
      this._playerPlaymatMaterial
    );
    playmat.name = 'player-console-playmat';
    playmat.position.set(0, 1.45, -0.2);
    playmat.rotation.x = 0.3;
    playmat.receiveShadow = true;
    group.add(playmat);
    this._loadPlayerConsolePlaymatTexture(this._playerPlaymatMaterial);
    return playmat;
  }

  _loadPlayerConsolePlaymatTexture(material) {
    let requestedTexture = null;
    const applyTexture = texture => {
      if (!texture) return;
      if (this.disposed) {
        texture.dispose?.();
        return;
      }
      if (
        this._playerPlaymatTexture
        && this._playerPlaymatTexture !== texture
      ) {
        this._playerPlaymatTexture.dispose?.();
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.anisotropy = Math.min(
        4,
        Number(this.renderer?.capabilities?.getMaxAnisotropy?.()) || 1
      );
      this._playerPlaymatTexture = texture;
      material.map = texture;
      this._applyEnvironmentSurfaceMaterials();
      material.needsUpdate = true;
      if (this.root?.dataset) this.root.dataset.playerPlaymatLoaded = 'true';
      this.render();
    };
    const keepFallback = () => {
      if (requestedTexture) {
        if (this._playerPlaymatTexture === requestedTexture) {
          this._playerPlaymatTexture = null;
        }
        requestedTexture.dispose?.();
      }
      material.map = null;
      this._applyEnvironmentSurfaceMaterials();
      material.needsUpdate = true;
      if (this.root?.dataset) this.root.dataset.playerPlaymatLoaded = 'false';
      this.render();
    };

    try {
      const loader = this.textureLoaderFactory?.();
      if (!loader?.load) throw new Error('No texture loader is available.');
      requestedTexture = loader.load(
        PLAYER_CONSOLE_PLAYMAT_URL,
        applyTexture,
        undefined,
        keepFallback
      );
      if (requestedTexture && material.map !== requestedTexture) {
        applyTexture(requestedTexture);
      }
    } catch {
      keepFallback();
    }
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
    const tint = color(this.environment.environmentTint, palette.ground);
    // Keep the generated original scenic bitmap visible behind the transparent
    // renderer while all gameplay-critical volumes remain genuine geometry.
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(
      color(this.environment.fog?.color, palette.background),
      Math.min(0.065, Math.max(0.002, Number(this.environment.fog?.density) * 0.09 || 0.012))
    );
    this._groundMaterial?.color?.set('#0b0f0d');
    this._applyEnvironmentSurfaceMaterials(palette, accent, tint);
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
    if (this.root) {
      this.root.dataset.environmentId = this.environment.id;
      this.root.dataset.arenaMaterial = this.environment.arenaMaterial
        || 'neutral-hologram';
    }
    this.render();
    return this.environment;
  }

  _applyEnvironmentSurfaceMaterials(
    palette = ENVIRONMENT_PALETTES[this.environment.id]
      || ENVIRONMENT_PALETTES.generic,
    accent = color(this.environment.accentColor, palette.rail),
    tint = color(this.environment.environmentTint, palette.ground)
  ) {
    const arenaMaterial = this.environment.arenaMaterial
      || 'neutral-hologram';
    const environmentId = this.environment.id || 'generic';
    const profile = resolveArenaMaterialProfile(arenaMaterial);

    if (this._platformMaterial) {
      this._platformMaterial.color.copy(
        color(palette.platform, '#303b4c').lerp(
          tint,
          profile.platformTintBlend
        )
      );
      this._platformMaterial.emissive.copy(accent);
      this._platformMaterial.emissiveIntensity =
        profile.platformEmissiveIntensity;
      this._platformMaterial.metalness = profile.platformMetalness;
      this._platformMaterial.roughness = profile.platformRoughness;
      this._platformMaterial.userData.environmentId = environmentId;
      this._platformMaterial.userData.arenaMaterial = arenaMaterial;
      this._platformMaterial.needsUpdate = true;
    }

    if (this._playerPlaymatMaterial) {
      const playmatBase = this._playerPlaymatMaterial.map
        ? color('#ffffff', '#ffffff').lerp(tint, profile.playmatTintBlend)
        : color('#102433', '#102433').lerp(tint, 0.62);
      this._playerPlaymatMaterial.color.copy(playmatBase);
      this._playerPlaymatMaterial.emissive.copy(accent);
      this._playerPlaymatMaterial.emissiveIntensity =
        profile.playmatEmissiveIntensity;
      this._playerPlaymatMaterial.metalness = profile.playmatMetalness;
      this._playerPlaymatMaterial.roughness = profile.playmatRoughness;
      this._playerPlaymatMaterial.userData.environmentId = environmentId;
      this._playerPlaymatMaterial.userData.arenaMaterial = arenaMaterial;
      this._playerPlaymatMaterial.needsUpdate = true;
    }

    if (this._playerPlaymatFrameMaterial) {
      this._playerPlaymatFrameMaterial.color.copy(
        color('#29151c', '#29151c').lerp(tint, 0.16)
      );
      this._playerPlaymatFrameMaterial.emissive.copy(accent);
      this._playerPlaymatFrameMaterial.emissiveIntensity = 0.05;
      this._playerPlaymatFrameMaterial.needsUpdate = true;
    }
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
    this._cameraTransition = null;
    this.root?.removeAttribute?.('data-camera-transitioning');
    this._applyCameraPose(
      resolveRealDuelCameraPose(this.cameraPreset, nextWidth)
    );
    this.camera.aspect = nextWidth / nextHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(nextWidth, nextHeight, false);
    this.render();
    this._notifyCameraUpdate();
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
    const cameraChanged = this._updateCameraTransition();
    this.render();
    if (cameraChanged) this._notifyCameraUpdate();
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
    this._cameraTransition = null;
    this._cameraUpdateCallback = null;
    this._accentMaterials = [];
    this._platformMaterial = null;
    this._groundMaterial = null;
    this._hemiLight = null;
    this._directionalLight = null;
    this._playerPlaymatMaterial = null;
    this._playerPlaymatFrameMaterial = null;
    this._playerPlaymatTexture = null;
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
