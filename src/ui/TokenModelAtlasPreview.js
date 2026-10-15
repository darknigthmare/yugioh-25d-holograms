import * as THREE from 'three';
import { createHologramMonsterModel } from './HologramMonsterModels.js';
import { getTokenPresentationProfile } from './TokenMonsterProfiles.js';
import { normalizeAvatarPreviewAngle, getAvatarPreviewDragRotation, getAvatarPreviewKeyAction } from './DuelistAvatarPreviewLifecycle.js';
import { createTokenIllustrationComposition, getTokenIllustrationCompositionDefinition, removeAtlasTokenIllustrationPedestal } from './TokenIllustrationComposition.js';
import { getTokenIllustrationFrame, ILLUSTRATED_TOKEN_GROUPS } from './HologramTokenIllustratedGroups.js';

let avatarResources = null;
let avatarResourcesLoading = null;

function commemorativeAvatar(profile) {
  return getTokenIllustrationCompositionDefinition(profile)?.avatarId || null;
}

/** Duel Token browsing never loads the separate human-character model builder. */
export async function prepareTokenAtlasPresentation(presentationId) {
  const profile = getTokenPresentationProfile(presentationId);
  if (!profile?.modelAvailable) throw new Error('Token presentation has no model');
  if (profile.modelKind !== 'duelist-avatar') return profile;
  if (!commemorativeAvatar(profile)) throw new Error('Unverified commemorative character presentation');
  avatarResourcesLoading ||= Promise.all([import('./DuelistIllustrationActor.js'), import('../content/DuelistAvatarCatalog.js')])
    .then(([models, catalogue]) => { avatarResources = { ...models, getDuelistAvatar: catalogue.getDuelistAvatar }; return avatarResources; })
    .catch(error => { avatarResourcesLoading = null; throw error; });
  await avatarResourcesLoading;
  if (!avatarResources.getDuelistAvatar(profile.avatarId)) throw new Error('Unknown commemorative character');
  return profile;
}

export function disposeTokenAtlasModel(model) {
  if (!model) return;
  model.userData?.poseRig?.dispose();
  const geometries = new Set();
  const materials = new Set();
  model.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  model.removeFromParent();
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  model.clear();
}

export async function createTokenModelAtlasPreview(host, profile, options) {
  await prepareTokenAtlasPresentation(profile?.presentationId || profile?.id || profile);
  if (host.isConnected === false || options?.isActive?.() === false) return null;
  return new TokenModelAtlasPreview(host, profile, options);
}

/** Public catalogue geometry only. Rendering is on demand, with no autoplay or RAF. */
export class TokenModelAtlasPreview {
  constructor(host, profile, { defense = false } = {}) {
    this.host = host;
    this.document = host.ownerDocument;
    this.window = this.document.defaultView;
    this.disposed = false;
    this.visible = true;
    this.intersecting = true;
    this.defense = defense === true;
    this.angle = 0;
    this.model = null;
    this.listeners = [];
    this.pointer = null;
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(this.window.devicePixelRatio || 1, 1.5));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1;
      this.renderer.localClippingEnabled = true;
      this.renderer.domElement.setAttribute('role', 'img');
      this.renderer.domElement.setAttribute('data-token-atlas-canvas', '');
      host.append(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#0d1826');
      this.camera = new THREE.PerspectiveCamera(37, 1, .1, 80);
      // Match the character studio: coloured rims must not recolour the art.
      this.scene.add(new THREE.HemisphereLight('#eef2ff', '#262c38', 1.45));
      const key = new THREE.DirectionalLight('#ffffff', 2.9);
      key.position.set(-5, 7, 8);
      const rim = new THREE.DirectionalLight('#b9d2ed', 1.2);
      rim.position.set(5, 4, -5);
      this.scene.add(key, rim);
      this.floor = new THREE.Mesh(new THREE.CircleGeometry(2.65, 48), new THREE.MeshStandardMaterial({ color: '#273b4e', roughness: .9, metalness: .12 }));
      this.floor.rotation.x = -Math.PI / 2;
      this.scene.add(this.floor);
      this.onDown = event => {
        if (!this._canRender() || this.pointer || (event.button != null && event.button !== 0) || !Number.isFinite(event.clientX)) return;
        this.pointer = { id: event.pointerId, x: event.clientX };
        try { host.setPointerCapture?.(event.pointerId); } catch { /* Pointer already cancelled. */ }
        host.focus({ preventScroll: true });
      };
      this.onMove = event => {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        this.rotateBy(getAvatarPreviewDragRotation(this.pointer.x, event.clientX));
        if (Number.isFinite(event.clientX)) this.pointer.x = event.clientX;
      };
      this.onUp = event => {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        try { host.releasePointerCapture?.(event.pointerId); } catch { /* Already released. */ }
        this.pointer = null;
      };
      this.onKey = event => {
        const action = getAvatarPreviewKeyAction(event.key);
        if (!action || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        if (action.type === 'recenter') this.recenter();
        else this.rotateBy(action.delta);
      };
      this.onVisibility = () => { if (!this.document.hidden) this.render(); };
      this.onContextLost = event => {
        event.preventDefault();
        this.contextLost = true;
        host.dispatchEvent(new this.window.CustomEvent('token-atlas-preview-unavailable', { bubbles: true }));
      };
      for (const [target, event, handler] of [[host, 'pointerdown', this.onDown], [host, 'pointermove', this.onMove],
        [host, 'pointerup', this.onUp], [host, 'pointercancel', this.onUp], [host, 'lostpointercapture', this.onUp],
        [host, 'keydown', this.onKey], [this.document, 'visibilitychange', this.onVisibility],
        [this.renderer.domElement, 'webglcontextlost', this.onContextLost]]) {
        target.addEventListener(event, handler);
        this.listeners.push([target, event, handler]);
      }
      if (this.window.ResizeObserver) {
        this.resizeObserver = new this.window.ResizeObserver(() => this.render());
        this.resizeObserver.observe(host);
      }
      if (this.window.IntersectionObserver) {
        this.intersectionObserver = new this.window.IntersectionObserver(entries => {
          this.intersecting = entries.some(entry => entry.target === host && entry.isIntersecting);
          if (this.intersecting) this.render();
        });
        this.intersectionObserver.observe(host);
      }
      this.setAvatar(profile?.presentationId || profile?.id || profile);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  _canRender() { return !this.disposed && !this.contextLost && this.visible && this.intersecting && this.host.isConnected && !this.document.hidden; }

  _disposeCurrentModel() {
    if (this.compositionModel) this.compositionModel.dispose();
    else disposeTokenAtlasModel(this.model);
    this.compositionModel = null;
    this.illustrationFrame = null;
    this.model = null;
  }

  // The shared preview lifecycle uses setAvatar as its public-model identity hook.
  setAvatar(presentationId) {
    if (this.disposed) return false;
    const profile = getTokenPresentationProfile(presentationId);
    if (!profile?.modelAvailable) throw new Error('Token presentation has no monster model');
    const avatarId = commemorativeAvatar(profile);
    if (profile.modelKind === 'duelist-avatar' && (!avatarId || !avatarResources?.getDuelistAvatar(avatarId))) throw new Error('Commemorative character resources are not ready');
    if (this.presentationId === profile.presentationId && this.model) return true;
    this._disposeCurrentModel();
    this.profile = profile;
    this.presentationId = profile.presentationId;
    if (avatarId) {
      this.compositionModel = createTokenIllustrationComposition(profile, { ...avatarResources, reducedMotion: true });
      this.model = this.compositionModel.group;
    } else this.model = createHologramMonsterModel({
      id: profile.cardId, code: profile.code, name: profile.name, type: 'Token Monster', isToken: true,
      race: profile.race, attribute: profile.attribute, level: profile.level, atk: profile.atk, def: profile.def
    }, { defense: this.defense, tokenPresentationId: profile.presentationId });
    this.illustrationFrame = this.compositionModel?.framing || getTokenIllustrationFrame(profile.cardId || profile.code);
    if (this.illustrationFrame && !this.compositionModel) {
      removeAtlasTokenIllustrationPedestal(this.model);
      const frame = this.illustrationFrame;
      const clippingPlanes = [
        new THREE.Plane(new THREE.Vector3(1, 0, 0), -frame.left),
        new THREE.Plane(new THREE.Vector3(-1, 0, 0), frame.right),
        new THREE.Plane(new THREE.Vector3(0, 1, 0), -frame.bottom),
        new THREE.Plane(new THREE.Vector3(0, -1, 0), frame.top)
      ];
      this.model.traverse(object => {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) material.clippingPlanes = clippingPlanes;
      });
    }
    this.scene.add(this.model);
    this.model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.model);
    const size = bounds.getSize(new THREE.Vector3());
    this.target = new THREE.Vector3(0, (bounds.min.y + bounds.max.y) / 2, 0);
    this.radius = Math.max(.7, Math.hypot(Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
      size.y / 2, Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z))));
    this.floor.position.y = bounds.min.y - .025;
    this.floor.scale.setScalar(Math.max(.38, Math.min(1, size.x / 2.8)));
    this.floor.visible = !this.illustrationFrame;
    this.camera = this.illustrationFrame ? new THREE.OrthographicCamera(-2.2, 2.2, 4.3, -.1, .1, 100)
      : new THREE.PerspectiveCamera(37, 1, .1, 80);
    this.renderer.domElement.setAttribute('aria-label', this.compositionModel
      ? `Composition 3D de l’illustration : ${this.compositionModel.subjects.map(subject => subject.name).join(' et ')}`
      : `Modèle 3D du Jeton : ${profile.name}`);
    this.renderer.domElement.dataset.tokenPresentationId = profile.presentationId;
    this.renderer.domElement.dataset.tokenCardId = profile.cardId || '';
    this.renderer.domElement.dataset.tokenAvatarId = avatarId || '';
    this.renderer.domElement.dataset.tokenModelKind = avatarId ? 'illustration-composition' : 'token-monster';
    const groupCode = profile.cardId || profile.code;
    const illustratedGroup = Object.hasOwn(ILLUSTRATED_TOKEN_GROUPS, groupCode) ? ILLUSTRATED_TOKEN_GROUPS[groupCode] : null;
    const subjectCount = this.compositionModel?.subjects.length || illustratedGroup?.subjects.length || 1;
    this.renderer.domElement.dataset.tokenSubjectCount = String(subjectCount);
    this.renderer.domElement.dataset.tokenIllustrationFrame = String(!!this.illustrationFrame);
    this.host.dataset.tokenPresentationId = profile.presentationId;
    this.host.dataset.tokenCardId = profile.cardId || '';
    this.host.dataset.tokenAvatarId = avatarId || '';
    this.host.dataset.tokenModelKind = avatarId ? 'illustration-composition' : 'token-monster';
    this.host.dataset.tokenSubjectCount = String(subjectCount);
    this.host.dataset.tokenIllustrationFrame = String(!!this.illustrationFrame);
    this.host.dataset.tokenPose = avatarId ? 'illustration' : this.defense ? 'defense' : 'attack';
    this.recenter();
    return true;
  }

  setPose(pose) {
    if (this.disposed || this.compositionModel || !['attack', 'defense'].includes(pose)) return false;
    const defense = pose === 'defense';
    if (this.defense === defense) return true;
    const angle = this.angle;
    this.defense = defense;
    const id = this.presentationId;
    this.presentationId = null;
    this.setAvatar(id);
    this.angle = angle;
    this.render();
    return true;
  }

  setVisible(visible) { if (!this.disposed) { this.visible = visible === true; if (this.visible) this.render(); } }
  rotateBy(delta) { if (!this.disposed && typeof delta === 'number' && Number.isFinite(delta)) { this.angle = normalizeAvatarPreviewAngle(this.angle + delta); this.render(); } }
  recenter() { if (!this.disposed) { this.angle = 0; this.compositionModel?.resetPose(); this.model?.userData?.poseRig?.reset(); this.render(); } }

  render() {
    if (!this._canRender() || !this.renderer || !this.model) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    if (width !== this.lastWidth || height !== this.lastHeight) { this.renderer.setSize(width, height, false); this.lastWidth = width; this.lastHeight = height; }
    if (this.illustrationFrame) {
      const frame = this.illustrationFrame;
      const aspect = width / height;
      const halfHeight = Math.max((frame.top - frame.bottom) / 2, (frame.right - frame.left) / (2 * aspect)) * 1.05;
      const halfWidth = halfHeight * aspect;
      this.camera.left = -halfWidth;
      this.camera.right = halfWidth;
      this.camera.top = halfHeight;
      this.camera.bottom = -halfHeight;
      const centerY = (frame.bottom + frame.top) / 2;
      const centerX = (frame.left + frame.right) / 2;
      this.camera.position.set(centerX, centerY, 15);
      this.camera.lookAt(centerX, centerY, 0);
    } else {
      this.camera.aspect = width / height;
      const vertical = THREE.MathUtils.degToRad(this.camera.fov / 2);
      const horizontal = Math.atan(Math.tan(vertical) * this.camera.aspect);
      const distance = this.radius * 1.13 / Math.sin(Math.min(vertical, horizontal));
      this.camera.position.set(0, this.target.y + distance * .075, distance);
      this.camera.far = distance + this.radius + 15;
      this.camera.lookAt(this.target);
    }
    this.camera.updateProjectionMatrix();
    this.model.rotation.y = this.angle;
    this.model.updateMatrixWorld(true);
    this.host.dataset.tokenAtlasAngle = String(Math.round(this.angle * 180 / Math.PI));
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.listeners.forEach(([target, event, handler]) => target.removeEventListener(event, handler));
    this.listeners = [];
    if (this.pointer) { try { this.host.releasePointerCapture?.(this.pointer.id); } catch { /* Already released. */ } this.pointer = null; }
    this._disposeCurrentModel();
    this.floor?.geometry.dispose();
    this.floor?.material.dispose();
    this.scene?.clear();
    if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove(); this.renderer = null; }
    for (const key of ['tokenPresentationId', 'tokenCardId', 'tokenAvatarId', 'tokenModelKind', 'tokenSubjectCount', 'tokenIllustrationFrame', 'tokenPose', 'tokenAtlasAngle']) delete this.host.dataset[key];
  }
}
