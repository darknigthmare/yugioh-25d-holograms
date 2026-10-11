import * as THREE from 'three';
import { createDuelistAvatarModel } from './DuelistAvatarModels.js';
import { getDuelistAvatar, DEFAULT_DUELIST_AVATAR_ID } from '../content/DuelistAvatarCatalog.js';
import { normalizeAvatarPreviewAngle, getAvatarPreviewDragRotation, getAvatarPreviewKeyAction } from './DuelistAvatarPreviewLifecycle.js';

export function createDuelistAvatarPreview3D(host, avatar) {
  return new DuelistAvatarPreview3D(host, avatar);
}

/** A local full-body studio preview. This class never receives duel or card state. */
export class DuelistAvatarPreview3D {
  constructor(host, avatar) {
    this.host = host;
    this.document = host.ownerDocument;
    this.window = this.document.defaultView;
    this.disposed = false;
    this.visible = true;
    this.intersecting = true;
    this.frame = null;
    this.pointer = null;
    this.angle = 0;
    this.avatarId = null;
    this.model = null;
    this.elapsed = 0;
    this.previousTime = null;
    this.listeners = [];
    this.motionQuery = this.window.matchMedia?.('(prefers-reduced-motion: reduce)');
    try {
      this.renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(this.window.devicePixelRatio || 1, 1.5));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.domElement.setAttribute('role', 'img');
      this.renderer.domElement.setAttribute('aria-label', 'Aperçu 3D du personnage');
      this.renderer.domElement.setAttribute('data-duelist-avatar-canvas', '');
      this.host.append(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#121a2b');
      this.camera = new THREE.PerspectiveCamera(34, 1, .1, 80);
      this.scene.add(new THREE.HemisphereLight('#dceaff', '#32313c', 2.05));
      const key = new THREE.DirectionalLight('#fff2db', 3.1);
      key.position.set(-4, 8, 8);
      key.castShadow = true;
      key.shadow.mapSize.set(512, 512);
      key.shadow.camera.left = -6;
      key.shadow.camera.right = 6;
      key.shadow.camera.top = 8;
      key.shadow.camera.bottom = -4;
      key.shadow.normalBias = .045;
      this.scene.add(key);
      const rim = new THREE.DirectionalLight('#83d6ff', 2.4);
      rim.position.set(5, 6, -5);
      this.scene.add(rim);
      this.floor = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.2, .14, 48),
        new THREE.MeshStandardMaterial({ color: '#253146', roughness: .8, metalness: .16 }));
      this.floor.position.y = -.08;
      this.floor.receiveShadow = true;
      this.scene.add(this.floor);
      this.ring = new THREE.Mesh(new THREE.TorusGeometry(3.02, .023, 5, 64),
        new THREE.MeshBasicMaterial({ color: '#70a8b9' }));
      this.ring.rotation.x = -Math.PI / 2;
      this.ring.position.y = .005;
      this.scene.add(this.ring);
      this.onDown = event => {
        if (!this._canRender() || (event.button != null && event.button !== 0) || this.pointer) return;
        if (!Number.isFinite(event.clientX)) return;
        this.pointer = { id: event.pointerId, x: event.clientX };
        try { this.host.setPointerCapture?.(event.pointerId); } catch { /* A cancelled native pointer needs no capture. */ }
        this.host.focus({ preventScroll: true });
      };
      this.onMove = event => {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        this.rotateBy(getAvatarPreviewDragRotation(this.pointer.x, event.clientX));
        if (Number.isFinite(event.clientX)) this.pointer.x = event.clientX;
      };
      this.onUp = event => {
        if (!this.pointer || event.pointerId !== this.pointer.id) return;
        try { this.host.releasePointerCapture?.(event.pointerId); } catch { /* Pointer may already have been released. */ }
        this.pointer = null;
      };
      this.onKey = event => {
        const action = getAvatarPreviewKeyAction(event.key);
        if (!action || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        if (action.type === 'recenter') this.recenter();
        else this.rotateBy(action.delta);
      };
      this.onVisibility = () => this._onVisibilityChange();
      this.onMotion = () => {
        if (this.motionQuery?.matches) this.model?.resetPose();
        this._syncFrames();
        this.render();
      };
      this.onContextLost = event => {
        event.preventDefault();
        this.contextLost = true;
        this._stopFrames();
        this.host.dispatchEvent(new this.window.CustomEvent('duelist-avatar-preview-unavailable', { bubbles: true }));
      };
      this.onContextRestored = () => {
        this.contextLost = false;
        this.render();
        this._syncFrames();
      };
      this._listen(this.host, 'pointerdown', this.onDown);
      this._listen(this.host, 'pointermove', this.onMove);
      this._listen(this.host, 'pointerup', this.onUp);
      this._listen(this.host, 'pointercancel', this.onUp);
      this._listen(this.host, 'lostpointercapture', this.onUp);
      this._listen(this.host, 'keydown', this.onKey);
      this._listen(this.document, 'visibilitychange', this.onVisibility);
      this._listen(this.renderer.domElement, 'webglcontextlost', this.onContextLost);
      this._listen(this.renderer.domElement, 'webglcontextrestored', this.onContextRestored);
      if (this.motionQuery?.addEventListener) this._listen(this.motionQuery, 'change', this.onMotion);
      else this.motionQuery?.addListener?.(this.onMotion);
      if (this.window.ResizeObserver) {
        this.resizeObserver = new this.window.ResizeObserver(() => this.render());
        this.resizeObserver.observe(this.host);
      }
      if (this.window.IntersectionObserver) {
        this.intersectionObserver = new this.window.IntersectionObserver(entries => {
          this.intersecting = entries.some(entry => entry.target === this.host && entry.isIntersecting);
          if (this.intersecting) this.render();
          this._syncFrames();
        });
        this.intersectionObserver.observe(this.host);
      }
      this.setAvatar(avatar?.id || avatar);
      this._syncFrames();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  _listen(target, event, handler) {
    target.addEventListener(event, handler);
    this.listeners.push([target, event, handler]);
  }

  _canRender() {
    return !this.disposed && !this.contextLost && this.visible && this.intersecting
      && this.host.isConnected && !this.document.hidden;
  }

  _stopFrames() {
    if (this.frame != null) this.window.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.previousTime = null;
  }

  _onVisibilityChange() {
    if (!this.document.hidden) this.render();
    this._syncFrames();
  }

  _syncFrames() {
    if (!this._canRender() || this.motionQuery?.matches) { this._stopFrames(); return; }
    if (this.frame == null) this.frame = this.window.requestAnimationFrame(time => this._tick(time));
  }

  _tick(time) {
    this.frame = null;
    if (!this._canRender() || this.motionQuery?.matches) return;
    if (this.previousTime != null) this.elapsed += Math.max(0, Math.min(.05, (time - this.previousTime) / 1000));
    this.previousTime = time;
    this.model?.update(this.elapsed, { reducedMotion: false });
    this.render();
    this._syncFrames();
  }

  setAvatar(id) {
    if (this.disposed) return false;
    const avatar = getDuelistAvatar(typeof id === 'string' ? id : id?.id) || getDuelistAvatar(DEFAULT_DUELIST_AVATAR_ID);
    if (avatar.id === this.avatarId && this.model) return true;
    this.model?.dispose();
    this.model = null;
    this.avatarId = avatar.id;
    this.model = createDuelistAvatarModel(avatar.id, { reducedMotion: this.motionQuery?.matches === true });
    this.scene.add(this.model.group);
    this.model.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.model.group);
    const size = bounds.getSize(new THREE.Vector3());
    this.target = new THREE.Vector3(0, (bounds.min.y + bounds.max.y) / 2, 0);
    const extentX = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x));
    const extentZ = Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z));
    this.radius = Math.max(1, Math.hypot(extentX, size.y / 2, extentZ));
    this.floor.position.y = bounds.min.y - .08;
    this.ring.position.y = bounds.min.y + .006;
    this.ring.material.color.set(avatar.visual.accentColor);
    this.floor.scale.setScalar(Math.max(.65, Math.min(1, avatar.visual.height)));
    this.renderer.domElement.setAttribute('aria-label', `Modèle 3D de ${avatar.name}`);
    this.elapsed = 0;
    this.recenter();
    return true;
  }

  rotateBy(delta) {
    if (this.disposed || typeof delta !== 'number' || !Number.isFinite(delta)) return;
    this.angle = normalizeAvatarPreviewAngle(this.angle + delta);
    this.render();
  }

  recenter() {
    if (this.disposed) return;
    this.angle = 0;
    this.model?.resetPose();
    this.render();
  }

  setVisible(visible) {
    if (this.disposed) return;
    this.visible = visible === true;
    if (this.visible) this.render();
    this._syncFrames();
  }

  render() {
    if (!this._canRender() || !this.renderer || !this.model) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    if (width !== this.lastWidth || height !== this.lastHeight) {
      this.renderer.setSize(width, height, false);
      this.lastWidth = width;
      this.lastHeight = height;
    }
    this.camera.aspect = width / height;
    const halfVertical = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * this.camera.aspect);
    const distance = this.radius * 1.12 / Math.sin(Math.min(halfVertical, halfHorizontal));
    this.camera.position.set(0, this.target.y + distance * .045, distance);
    this.camera.far = distance + this.radius + 15;
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.model.group.rotation.y = this.angle;
    this.model.group.updateMatrixWorld(true);
    this.host.dataset.duelistAvatarAngle = String(Math.round(this.angle * 180 / Math.PI));
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this._stopFrames();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    this.listeners.forEach(([target, event, handler]) => target.removeEventListener(event, handler));
    this.listeners = [];
    if (!this.motionQuery?.removeEventListener) this.motionQuery?.removeListener?.(this.onMotion);
    if (this.pointer) {
      try { this.host.releasePointerCapture?.(this.pointer.id); } catch { /* Already released by the browser. */ }
      this.pointer = null;
    }
    this.model?.dispose();
    this.model = null;
    for (const mesh of [this.floor, this.ring]) { mesh?.geometry.dispose(); mesh?.material.dispose(); }
    this.scene?.traverse(object => object.shadow?.dispose());
    this.scene?.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
    delete this.host.dataset.duelistAvatarAngle;
  }
}
