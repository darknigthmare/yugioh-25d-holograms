const FULL_TURN = Math.PI * 2;

export function normalizeAvatarPreviewAngle(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return ((value + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI;
}

export function getAvatarPreviewKeyAction(key) {
  if (key === 'ArrowLeft') return { type: 'rotate', delta: -Math.PI / 8 };
  if (key === 'ArrowRight') return { type: 'rotate', delta: Math.PI / 8 };
  if (key === 'Home') return { type: 'recenter' };
  return null;
}

export function getAvatarPreviewDragRotation(previousX, nextX) {
  if (typeof previousX !== 'number' || typeof nextX !== 'number'
    || !Number.isFinite(previousX) || !Number.isFinite(nextX)) return 0;
  return Math.max(-160, Math.min(160, nextX - previousX)) * .012;
}

/** One preview owns the current host; a late lazy import never reopens a closed modal. */
export class DuelistAvatarPreviewLifecycle {
  constructor({ loadPreview = () => import('./DuelistAvatarPreview3D.js'), isActive = () => true,
    onStateChange = () => {}, onError = () => {} } = {}) {
    this.loadPreview = loadPreview;
    this.isActive = isActive;
    this.onStateChange = onStateChange;
    this.onError = onError;
    this.generation = 0;
    this.preview = null;
    this.pending = null;
    this.host = null;
    this.avatar = null;
    this.active = false;
    this.disposed = false;
  }

  _current(generation, host) {
    return !this.disposed && this.active && generation === this.generation
      && host === this.host && host?.isConnected !== false && this.isActive();
  }

  async show(avatar, host) {
    if (this.disposed || !avatar || !host || host.isConnected === false || !this.isActive()) return false;
    if (this.host && this.host !== host) this.hide();
    this.active = true;
    this.host = host;
    this.avatar = avatar;
    if (this.preview) {
      try {
        this.preview.setAvatar(avatar.id);
        this.preview.setVisible(true);
        return true;
      } catch (error) {
        this.hide();
        this.onError(error);
        return false;
      }
    }
    if (this.pending) return this.pending;
    const generation = ++this.generation;
    this.onStateChange('loading');
    const operation = (async () => {
      let created = null;
      try {
        const module = await Promise.resolve().then(() => this.loadPreview());
        if (!this._current(generation, host)) return false;
        created = await module.createDuelistAvatarPreview3D(host, this.avatar);
        if (!this._current(generation, host)) {
          created?.dispose();
          return false;
        }
        created.setAvatar(this.avatar.id);
        created.setVisible(true);
        this.preview = created;
        this.onStateChange('ready');
        return true;
      } catch (error) {
        created?.dispose();
        if (this.preview === created) this.preview = null;
        if (this._current(generation, host)) {
          this.active = false;
          this.onError(error);
        }
        return false;
      } finally {
        if (generation === this.generation) this.pending = null;
      }
    })();
    this.pending = operation;
    return operation;
  }

  rotateBy(delta) {
    if (!this.disposed && this.active && typeof delta === 'number' && Number.isFinite(delta)) this.preview?.rotateBy(delta);
  }

  recenter() {
    if (!this.disposed && this.active) this.preview?.recenter();
  }

  hide() {
    this.generation++;
    this.active = false;
    this.pending = null;
    this.preview?.dispose();
    this.preview = null;
    this.host = null;
    this.avatar = null;
    if (!this.disposed) this.onStateChange('idle');
  }

  dispose() {
    if (this.disposed) return;
    this.hide();
    this.disposed = true;
  }
}
