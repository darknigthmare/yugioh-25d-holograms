import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE } from './FieldGeometryThree.js';
import {
  normalizeRealDuelCameraPreset,
  resolveRealDuelCameraPose
} from './RealDuelCameraPresets.js';
import { createHologramMonsterModel } from './HologramMonsterModels.js';
import { resolveHologramMonsterProfile } from './CombatVisualProfiles.js';
import { createCombatVisualEffect } from './CombatVisualEffects.js';
import { createHologramPoseAnimation } from './HologramPoseAnimation.js';
import { createDuelistAvatarModel } from './DuelistAvatarModels.js';
import { getDuelistAvatar } from '../content/DuelistAvatarCatalog.js';
import {
  createFieldEnvironmentGeometry,
  disposeFieldEnvironmentGeometry,
  getFieldEnvironmentGeometrySignature
} from './FieldEnvironmentGeometry.js';

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
    surfacePalette: {
      ...(ENVIRONMENT_PALETTES[id] || ENVIRONMENT_PALETTES.generic),
      ...(candidate.surfacePalette || {})
    },
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

function disposeMaterial(material, disposedTextures = new Set()) {
  if (!material) return;
  for (const value of Object.values(material)) {
    if (value?.isTexture && !disposedTextures.has(value)) {
      disposedTextures.add(value);
      value.dispose();
    }
  }
  material.dispose?.();
}

function disposeObject3D(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root?.traverse?.(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose?.());
  materials.forEach(material => disposeMaterial(material, textures));
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
    this._animatedVisualsActive = false;
    this._duelistAvatars = new Map();
    this._duelistAvatarIds = Object.freeze({ playerAvatarId: 'yugi', opponentAvatarId: 'kaiba' });
    this._duelistAnimationElapsed = 0;
    this._duelistAnimationLastNow = null;
    this._motionPreference = this.windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    this._reducedMotion = this._motionPreference?.matches === true;
    this._boundMotionPreference = event => {
      this._reducedMotion = event.matches === true;
      this._duelistAnimationLastNow = null;
      if (this._reducedMotion) {
        this._duelistAvatars.forEach(avatar => avatar.resetPose());
        this.render();
        if (!this._requiresAnimationFrame()) this._stopFrameLoop();
      } else if (this.active) this.start();
    };
    this._fieldHolograms = new Map();
    this._combatEffects = [];
    this._monsterPoses = new Map();
    this._fieldEnvironmentGeometry = null;
    this._fieldEnvironmentGeometrySignature = null;
    this._effectsPausedAt = null;
    this._cameraUpdateCallback = null;
    this._boundFrame = timestamp => this._onFrame(timestamp);
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
      if (!this._requiresAnimationFrame()) this._stopFrameLoop();
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
      toFov: pose.fov,
      pausedAt: null
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

  _requiresAnimationFrame() {
    return Boolean(this._cameraTransition || this._animatedVisualsActive || this._combatEffects.length || this._monsterPoses.size
      || (this._duelistAvatars.size && !this._reducedMotion));
  }

  /** Public appearance IDs only; choices are retained before WebGL is mounted. */
  setDuelistAvatars({ playerAvatarId, opponentAvatarId } = {}) {
    if (this.disposed) return false;
    const ids = {
      playerAvatarId: getDuelistAvatar(playerAvatarId)?.id || this._duelistAvatarIds.playerAvatarId,
      opponentAvatarId: getDuelistAvatar(opponentAvatarId)?.id || this._duelistAvatarIds.opponentAvatarId
    };
    this._duelistAvatarIds = Object.freeze(ids);
    if (this.root?.dataset) {
      this.root.dataset.playerAvatarId = ids.playerAvatarId;
      this.root.dataset.opponentAvatarId = ids.opponentAvatarId;
    }
    if (!this.scene?.add) return true;
    for (const owner of ['player', 'opponent']) {
      const avatarId = ids[`${owner}AvatarId`];
      if (this._duelistAvatars.get(owner)?.avatarId === avatarId) continue;
      this._duelistAvatars.get(owner)?.dispose();
      const avatar = createDuelistAvatarModel(avatarId, { owner, reducedMotion: this._reducedMotion });
      if (owner === 'player') {
        // Behind the left side of the console; the CSS card layer remains on top.
        avatar.group.position.set(-3.4, 0, 14.2);
        avatar.group.rotation.y = 2.73;
      } else {
        avatar.group.position.set(0, 0, -15.1);
      }
      this._duelistAvatars.set(owner, avatar);
      this.scene.add(avatar.group);
    }
    this._positionPlayerAvatar();
    this.render();
    if (this.active) this.start();
    return true;
  }

  getDuelistAvatars() {
    return this._duelistAvatarIds;
  }

  _positionPlayerAvatar() {
    const player = this._duelistAvatars.get('player');
    if (!player || this._width <= 1 || this._height <= 1) return;
    // Derive the margin from the actual field aspect, rather than the window
    // size. No camera or interactive zone moves when a narrow view is resized.
    const pose = resolveRealDuelCameraPose('player', this._width);
    const camera = new THREE.PerspectiveCamera(pose.fov, this._width / this._height, 0.1, 120);
    camera.position.set(...pose.position);
    camera.lookAt(new THREE.Vector3(...pose.target));
    camera.updateMatrixWorld();
    const anchor = new THREE.Vector3(1, 4.86 * player.group.scale.y, 14.2).project(camera);
    player.group.position.x = Math.max(-6.9, Math.min(-1.9, -0.7 / anchor.x));
  }

  _updateDuelistAvatars(now) {
    if (!this._duelistAvatars.size || this._reducedMotion) return false;
    if (this._duelistAnimationLastNow !== null) {
      this._duelistAnimationElapsed += Math.min(0.1, Math.max(0, (now - this._duelistAnimationLastNow) / 1000));
    }
    this._duelistAnimationLastNow = now;
    this._duelistAvatars.forEach(avatar => avatar.update(this._duelistAnimationElapsed, { reducedMotion: this._reducedMotion }));
    return true;
  }

  _pauseCameraTransitionClock() {
    if (this._cameraTransition && this._cameraTransition.pausedAt === null) {
      this._cameraTransition.pausedAt = this._now();
    }
  }

  _resumeCameraTransitionClock() {
    const transition = this._cameraTransition;
    if (!transition || transition.pausedAt === null) return;
    transition.startedAt += Math.max(0, this._now() - transition.pausedAt);
    transition.pausedAt = null;
  }

  _stopFrameLoop() {
    this.running = false;
    if (this._frameHandle !== null) {
      const cancel = this.windowRef?.cancelAnimationFrame
        || globalThis.cancelAnimationFrame;
      cancel?.(this._frameHandle);
      this._frameHandle = null;
    }
  }

  /**
   * Explicit opt-in for continuously animated props. Monster meshes and field
   * scenery remain static; combat effects request RAF only until completion.
   */
  setAnimatedVisualsActive(active) {
    if (this.disposed) return false;
    this._animatedVisualsActive = active === true;
    if (this._animatedVisualsActive && this.active) {
      this.start();
    } else if (!this._requiresAnimationFrame()) {
      this._stopFrameLoop();
    }
    return this._animatedVisualsActive;
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
    this.scene.add(this._createOpponentConsole());
    this.setDuelistAvatars(this._duelistAvatarIds);
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
    shell.name = `${name}-shell`;
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
      panel.name = `${name}-public-panel`;
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
    display.name = `${name}-display`;
    display.position.set(0, withPlaymat ? 1.72 : 1.6, withPlaymat ? -1.82 : -0.45);
    display.rotation.x = 0.3;
    group.add(display);
    return group;
  }

  _createOpponentConsole() {
    // The opposing terminal is deliberately static geometry. It receives no
    // hand or card objects, so perspective can never expose private faces.
    const console = this._createConsole({
      name: 'opponent-console',
      z: -12.05,
      rotationY: Math.PI,
      widthFront: 10.5,
      widthBack: 8.8,
      scale: 0.88
    });

    const terminalMaterial = new THREE.MeshStandardMaterial({
      color: '#56636b',
      metalness: 0.68,
      roughness: 0.34
    });
    const terminalColumn = new THREE.Mesh(
      new THREE.BoxGeometry(3.55, 2.4, 1.05),
      terminalMaterial
    );
    terminalColumn.name = 'opponent-console-terminal-column';
    terminalColumn.position.set(0, 2.9, 0.85);
    terminalColumn.castShadow = true;
    terminalColumn.receiveShadow = true;
    console.add(terminalColumn);

    const terminalFrame = new THREE.Mesh(
      new THREE.BoxGeometry(5.15, 1.85, 0.38),
      terminalMaterial
    );
    terminalFrame.name = 'opponent-console-terminal-frame';
    terminalFrame.position.set(0, 4.45, 0.72);
    terminalFrame.rotation.x = -0.08;
    terminalFrame.castShadow = true;
    console.add(terminalFrame);

    const publicDisplayMaterial = new THREE.MeshStandardMaterial({
      color: '#18353d',
      emissive: '#0e7388',
      emissiveIntensity: 0.78,
      metalness: 0.52,
      roughness: 0.24
    });
    this._accentMaterials.push(publicDisplayMaterial);
    const publicDisplay = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 1.22, 0.08),
      publicDisplayMaterial
    );
    publicDisplay.name = 'opponent-console-terminal-public-display';
    publicDisplay.position.set(0, 4.45, 0.28);
    publicDisplay.rotation.x = -0.08;
    console.add(publicDisplay);

    console.userData.visibility = 'public-only';
    return console;
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

  _attachListeners() {
    this.documentRef?.addEventListener?.('visibilitychange', this._boundVisibility);
    this.windowRef?.addEventListener?.('resize', this._boundResize, { passive: true });
    this._motionPreference?.addEventListener?.('change', this._boundMotionPreference);
  }

  _detachListeners() {
    this.documentRef?.removeEventListener?.('visibilitychange', this._boundVisibility);
    this.windowRef?.removeEventListener?.('resize', this._boundResize);
    this._motionPreference?.removeEventListener?.('change', this._boundMotionPreference);
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
    const palette = this.environment.surfacePalette
      || ENVIRONMENT_PALETTES[this.environment.id]
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
    const publicEnvironment = selectionOrEnvironment?.environment || selectionOrEnvironment;
    const geometryEnvironment = {
      ...this.environment,
      fieldSpellCardId: publicEnvironment?.fieldSpellCardId,
      geometryProfile: publicEnvironment?.geometryProfile
    };
    const geometrySignature = getFieldEnvironmentGeometrySignature(geometryEnvironment);
    if (geometrySignature !== this._fieldEnvironmentGeometrySignature && this.scene.add) {
      disposeFieldEnvironmentGeometry(this._fieldEnvironmentGeometry);
      this._fieldEnvironmentGeometry = createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE, geometryEnvironment);
      this._fieldEnvironmentGeometrySignature = geometrySignature;
      this.scene.add(this._fieldEnvironmentGeometry);
    }
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
    palette = this.environment.surfacePalette
      || ENVIRONMENT_PALETTES[this.environment.id]
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
    if (this.publicSummary?.duelEnded) {
      this.clearCombatEffects();
      this.pause();
    }
    return this.publicSummary;
  }

  /** Caller supplies public, face-up field descriptors. Hidden cards are never read. */
  updateFieldHolograms(descriptors = []) {
    if (this.disposed || !this.scene?.add) return { renderedKeys: [] };
    const retained = new Set();
    for (const descriptor of Array.isArray(descriptors) ? descriptors.slice(0, 12) : []) {
      if (!descriptor || descriptor.faceUp !== true || descriptor.hidden === true) continue;
      const owner = descriptor.owner;
      if (owner !== 'player' && owner !== 'opponent') continue;
      const zoneType = descriptor.zoneType === 'extra' ? 'extra' : 'main';
      const zoneIndex = Number(descriptor.zoneIndex);
      if (!Number.isInteger(zoneIndex) || zoneIndex < 0 || zoneIndex >= (zoneType === 'extra' ? 2 : 5)) continue;
      const key = String(descriptor.key || `${owner}:${zoneType}:${zoneIndex}`).slice(0, 96);
      if (retained.has(key)) continue;
      const card = descriptor.card;
      if (!card || typeof card !== 'object') continue;
      // Deliberately allowlist visual metadata: never retain image URLs, UID,
      // effects, descriptions, decks, hands, or the caller's object reference.
      const publicCard = Object.fromEntries(['id', 'name', 'name_en', 'race', 'attribute', 'type']
        .map(field => [field, String(card[field] || '').slice(0, 120)]));
      const defense = descriptor.position === 'defense';
      const signature = JSON.stringify([resolveHologramMonsterProfile(publicCard).id, defense]);
      let entry = this._fieldHolograms.get(key);
      if (entry?.signature !== signature) {
        if (entry) {
          this._cancelMonsterPose(entry.object);
          entry.object.removeFromParent();
          disposeObject3D(entry.object);
        }
        const object = createHologramMonsterModel(publicCard, { defense });
        this.scene.add(object);
        entry = { object, signature, owner, zoneType, zoneIndex };
        this._fieldHolograms.set(key, entry);
      }
      const position = this._validatedWorldPosition(descriptor.worldPosition)
        || [(zoneIndex - (zoneType === 'extra' ? 0.5 : 2)) * (zoneType === 'extra' ? 4.5 : 2.25), RealDuelScene3D.ARENA_TOP_Y + 0.08, zoneType === 'extra' ? 0 : owner === 'player' ? 3.4 : -3.4];
      entry.owner = owner;
      entry.zoneType = zoneType;
      entry.zoneIndex = zoneIndex;
      entry.object.position.set(...position);
      entry.object.rotation.y = owner === 'player' ? Math.PI : 0;
      retained.add(key);
    }
    for (const [key, entry] of this._fieldHolograms) {
      if (retained.has(key)) continue;
      this._cancelMonsterPose(entry.object);
      entry.object.removeFromParent();
      disposeObject3D(entry.object);
      this._fieldHolograms.delete(key);
    }
    this.render();
    return { renderedKeys: [...retained] };
  }

  _validatedWorldPosition(value) {
    if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) return null;
    return Math.abs(value[0]) <= 24 && value[1] >= -2 && value[1] <= 16 && Math.abs(value[2]) <= 30
      ? value.slice() : null;
  }

  _resolveCombatEndpoint(endpoint, fallbackOwner = 'player', aimAtMonster = false) {
    const explicit = this._validatedWorldPosition(endpoint)
      || this._validatedWorldPosition(endpoint?.worldPosition);
    if (explicit) {
      // Zone centers live on the board plane; combat aims at the creature.
      // Absolute vector endpoints and direct console strikes stay explicit.
      if (aimAtMonster && !Array.isArray(endpoint) && endpoint?.direct !== true) explicit[1] += 1.5;
      return explicit;
    }
    const owner = endpoint?.owner === 'opponent' ? 'opponent'
      : endpoint?.owner === 'player' ? 'player' : fallbackOwner;
    if (endpoint?.direct === true) return [0, 3.1, owner === 'player' ? 10.7 : -10.7];
    const zoneType = endpoint?.zoneType === 'extra' ? 'extra' : 'main';
    const index = Number(endpoint?.zoneIndex);
    const zoneIndex = Number.isInteger(index) && index >= 0 && index < (zoneType === 'extra' ? 2 : 5) ? index : 2;
    for (const entry of this._fieldHolograms.values()) {
      if (entry.owner === owner && entry.zoneType === zoneType && entry.zoneIndex === zoneIndex) {
        return [entry.object.position.x, entry.object.position.y + 1.5, entry.object.position.z];
      }
    }
    return [(zoneIndex - (zoneType === 'extra' ? 0.5 : 2)) * (zoneType === 'extra' ? 4.5 : 2.25), 2.2, zoneType === 'extra' ? 0 : owner === 'player' ? 3.4 : -3.4];
  }

  playCombatEffect(event = {}) {
    if (this.disposed || !this.active || !this.scene?.add || !this.webglAvailable
      || this.publicSummary?.duelEnded || event.hidden === true) return false;
    // Chain negation and attack negation share a visual profile. Only the
    // confirmed public attack result may retire that attack's travel/impact.
    const cancelledAttack = event.kind === 'negate' && event.nativeAttackNegated === true
      && this._cancelAttackEffects(event.sourceRef || event.source);
    // The accessible DOM already shows action feedback with reduced motion.
    // Avoid flashes, camera motion and a hidden animation loop in this mode.
    if (this.documentRef?.hidden === true
      || this.windowRef?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true) {
      if (cancelledAttack && this.documentRef?.hidden !== true) this.render();
      return false;
    }
    const owner = (event.sourceRef?.owner || event.source?.owner) === 'opponent' ? 'opponent' : 'player';
    const aimAtMonster = event.kind === 'attack';
    const source = this._resolveCombatEndpoint(event.source, owner, aimAtMonster);
    const target = event.target ? this._resolveCombatEndpoint(event.target, owner, aimAtMonster) : source;
    this._resumeCombatEffectClock();
    if (this._combatEffects.length >= 6) this._combatEffects.shift().dispose();
    const effect = createCombatVisualEffect({ ...event, source, target });
    if (event.kind === 'attack') effect.attackSourceRef = this._combatSourceReference(event.sourceRef || event.source);
    effect.startedAt = this._now();
    this._combatEffects.push(effect);
    this.scene.add(effect.group);
    const sourceRef = event.sourceRef || event.source;
    const targetRef = event.targetRef || event.target;
    const defaultPoseKind = event.kind === 'attack' ? 'attack'
      : event.kind === 'summon' ? 'summon'
        : event.kind === 'destroy' ? 'recoil' : 'casting';
    const poseKind = ['attack', 'summon', 'recoil', 'casting'].includes(event.poseKind)
      ? event.poseKind : defaultPoseKind;
    const poseRef = event.poseTarget === 'target' ? targetRef : sourceRef;
    this._startMonsterPose(poseRef, poseKind, effect.startedAt, effect.duration, effect);
    if (event.kind === 'attack') {
      this._startMonsterPose(targetRef, 'recoil', effect.startedAt + effect.duration * 0.55, 360, effect);
    }
    this.start();
    return true;
  }

  _combatSourceReference(reference) {
    if (!reference || Array.isArray(reference) || reference.direct
      || !['player', 'opponent'].includes(reference.owner)) return null;
    const zoneType = reference.zoneType || 'main';
    const zoneIndex = reference.zoneIndex;
    if (!['main', 'extra'].includes(zoneType) || !Number.isInteger(zoneIndex)
      || zoneIndex < 0 || zoneIndex >= (zoneType === 'extra' ? 2 : 5)) return null;
    return Object.freeze({ owner: reference.owner, zoneType, zoneIndex });
  }

  _cancelAttackEffects(reference) {
    const source = this._combatSourceReference(reference);
    if (!source) return false;
    let cancelled = false;
    this._combatEffects = this._combatEffects.filter(effect => {
      const attack = effect.attackSourceRef;
      if (!attack || attack.owner !== source.owner || attack.zoneType !== source.zoneType
        || attack.zoneIndex !== source.zoneIndex) return true;
      // A later effect may already own a pose on the same monster. Restore
      // only this attack's poses, including a recoil that has not begun yet.
      for (const [object, pose] of this._monsterPoses) {
        if (pose.combatEffect === effect) this._cancelMonsterPose(object);
      }
      effect.dispose();
      cancelled = true;
      return false;
    });
    if (cancelled && !this._requiresAnimationFrame()) this._stopFrameLoop();
    return cancelled;
  }

  _cancelMonsterPose(object) {
    const pose = this._monsterPoses.get(object);
    if (!pose) return false;
    pose.animation.dispose();
    this._monsterPoses.delete(object);
    return true;
  }

  _startMonsterPose(reference, kind, startedAt, duration, combatEffect = null) {
    if (!reference || Array.isArray(reference) || reference.direct
      || !['player', 'opponent'].includes(reference.owner)) return false;
    const zoneType = reference.zoneType || 'main';
    if (!['main', 'extra'].includes(zoneType) || !Number.isInteger(reference.zoneIndex)) return false;
    const entry = [...this._fieldHolograms.values()].find(value => (
      value.owner === reference.owner && value.zoneType === zoneType && value.zoneIndex === reference.zoneIndex
    ));
    if (!entry) return false;
    this._cancelMonsterPose(entry.object);
    const animation = createHologramPoseAnimation(entry.object, { kind, duration });
    this._monsterPoses.set(entry.object, { animation, startedAt, combatEffect });
    return true;
  }

  _updateMonsterPoses(now) {
    if (!this._monsterPoses.size) return false;
    for (const [object, pose] of this._monsterPoses) {
      if (now < pose.startedAt) continue;
      if (pose.animation.update((now - pose.startedAt) / pose.animation.duration)) continue;
      pose.animation.dispose();
      this._monsterPoses.delete(object);
    }
    return true;
  }

  _updateCombatEffects(now) {
    if (!this._combatEffects.length) return false;
    this._combatEffects = this._combatEffects.filter(effect => {
      if (effect.update((now - effect.startedAt) / effect.duration)) return true;
      effect.dispose();
      return false;
    });
    return true;
  }

  _resumeCombatEffectClock() {
    if (this._effectsPausedAt === null) return;
    const pausedDuration = Math.max(0, this._now() - this._effectsPausedAt);
    this._combatEffects.forEach(effect => { effect.startedAt += pausedDuration; });
    this._monsterPoses.forEach(pose => { pose.startedAt += pausedDuration; });
    this._effectsPausedAt = null;
  }

  clearCombatEffects() {
    const hadEffects = this._combatEffects.length > 0 || this._monsterPoses.size > 0;
    this._combatEffects.forEach(effect => effect.dispose());
    this._combatEffects = [];
    this._monsterPoses.forEach(pose => pose.animation.dispose());
    this._monsterPoses.clear();
    this._effectsPausedAt = null;
    if (!this._requiresAnimationFrame()) this._stopFrameLoop();
    if (hadEffects) this.render();
    return true;
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
    if (!this._requiresAnimationFrame()) this._stopFrameLoop();
    this._applyCameraPose(
      resolveRealDuelCameraPose(this.cameraPreset, nextWidth)
    );
    this.camera.aspect = nextWidth / nextHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(nextWidth, nextHeight, false);
    this._positionPlayerAvatar();
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
    this._resumeCameraTransitionClock();
    this._resumeCombatEffectClock();
    // Static geometry is rendered exactly once when made visible. A RAF loop
    // is reserved for a camera interpolation or an explicitly animated prop.
    this.render();
    if (this._requiresAnimationFrame()) {
      this.running = true;
      this._scheduleFrame();
    }
    return true;
  }

  pause() {
    this._duelistAnimationLastNow = null;
    this._pauseCameraTransitionClock();
    if ((this._combatEffects.length || this._monsterPoses.size) && this._effectsPausedAt === null) this._effectsPausedAt = this._now();
    this._stopFrameLoop();
    return true;
  }

  deactivate() {
    if (this.disposed) return false;
    this.active = false;
    this.clearCombatEffects();
    this.pause();
    if (this.root) this.root.hidden = true;
    return true;
  }

  _scheduleFrame() {
    if (!this.running || this._frameHandle !== null) return;
    const request = this.windowRef?.requestAnimationFrame
      || globalThis.requestAnimationFrame;
    if (!request) {
      const transition = this._cameraTransition;
      if (transition) {
        this._updateCameraTransition(
          transition.startedAt + transition.duration
        );
        this._notifyCameraUpdate();
      }
      this.clearCombatEffects();
      this.render();
      this._stopFrameLoop();
      return;
    }
    this._frameHandle = request(this._boundFrame);
  }

  _onFrame(timestamp) {
    this._frameHandle = null;
    if (!this.running) return;
    const now = Number.isFinite(timestamp) ? timestamp : this._now();
    const cameraChanged = this._updateCameraTransition(now);
    const combatChanged = this._updateCombatEffects(now);
    const poseChanged = this._updateMonsterPoses(now);
    const avatarChanged = this._updateDuelistAvatars(now);
    if (cameraChanged || combatChanged || poseChanged || avatarChanged || this._animatedVisualsActive) this.render();
    if (cameraChanged) this._notifyCameraUpdate();
    if (this._requiresAnimationFrame()) {
      this._scheduleFrame();
    } else {
      this.running = false;
    }
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
    this.clearCombatEffects();
    this._duelistAvatars.forEach(avatar => avatar.dispose());
    this._duelistAvatars.clear();
    disposeFieldEnvironmentGeometry(this._fieldEnvironmentGeometry);
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
    this._animatedVisualsActive = false;
    this._fieldHolograms.clear();
    this._fieldEnvironmentGeometry = null;
    this._fieldEnvironmentGeometrySignature = null;
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
