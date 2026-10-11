import { DUELIST_SERIES, DUELIST_AVATARS, DEFAULT_DUELIST_AVATAR_ID, getDuelistAvatar } from '../content/DuelistAvatarCatalog.js';
import { getDuelistAvatarUnlockState } from '../content/DuelistAvatarProgress.js';
import { escapeHtml } from '../security.js';
import { renderDuelistAvatarPortrait } from './DuelistAvatarPortrait.js';
import { DuelistAvatarPreviewLifecycle } from './DuelistAvatarPreviewLifecycle.js';

export const DUELIST_AVATAR_PAGE_SIZE = 24;

export function normalizeDuelistAvatarSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr').trim();
}

export function filterDuelistAvatars({ query = '', seriesId = 'all', status = 'all', context = {} } = {}) {
  const terms = normalizeDuelistAvatarSearch(query).split(/\s+/).filter(Boolean);
  return DUELIST_AVATARS.filter(avatar => {
    if (seriesId !== 'all' && avatar.seriesId !== seriesId) return false;
    const state = getDuelistAvatarUnlockState(avatar, context);
    if (status === 'available' && !state.unlocked) return false;
    if (status === 'locked' && state.unlocked) return false;
    const series = DUELIST_SERIES.find(entry => entry.id === avatar.seriesId);
    const haystack = normalizeDuelistAvatarSearch([avatar.name, ...(avatar.aliases || []), series?.label || ''].join(' '));
    return terms.every(term => haystack.includes(term));
  });
}

function progressMarkup(state, name) {
  const ratio = Math.max(0, Math.min(1, Number(state.progressRatio) || 0));
  return `<progress class="duelist-avatar-progress" max="1" value="${ratio}" aria-label="${escapeHtml(`Progression pour ${name} : ${state.progressLabel}`)}"></progress>`;
}

/** Human-avatar presentation only. The caller owns profile persistence and validates selection. */
export class DuelistAvatarPicker {
  constructor({ rootElement, dialogElement, getProfile, getContext, onSelect, openDialog, closeDialog, onPreview, onExport, onImport } = {}) {
    if (!rootElement || !dialogElement) throw new TypeError('Le sélecteur d’avatar nécessite un emplacement et une fenêtre.');
    this.rootElement = rootElement;
    this.dialogElement = dialogElement;
    this.getProfile = getProfile || (() => ({ selectedAvatarId: DEFAULT_DUELIST_AVATAR_ID, earnedAvatarIds: [] }));
    this.getContext = getContext || (() => ({}));
    this.onSelect = onSelect;
    this.openDialog = openDialog;
    this.closeDialog = closeDialog;
    this.onPreview = onPreview;
    this.onExport = onExport;
    this.onImport = onImport;
    this.transferPending = false;
    this.previewMode = 'portrait';
    this.previewState = 'idle';
    this.page = 0;
    this.previewId = null;
    this.query = '';
    this.seriesId = 'all';
    this.status = 'all';
    this.visible = false;
    this.pending = false;
    this.disposed = false;
    this.previewLifecycle = new DuelistAvatarPreviewLifecycle({
      isActive: () => this.visible && !this.disposed && this.previewMode === '3d'
        && !this.dialogElement.classList.contains('hidden'),
      onStateChange: state => this._setPreviewState(state),
      onError: () => {
        if (this.disposed) return;
        this.previewMode = 'portrait';
        this.previewLifecycle.hide();
        this._syncPreviewPresentation();
        this.dialogElement.querySelector('#duelist-avatar-preview-status').textContent = 'La vue 3D est indisponible sur cet appareil. Le portrait reste disponible.';
      }
    });
    this._onRootClick = event => {
      if (event.target.closest?.('#duelist-avatar-open')) this.open();
    };
    this._onClick = event => {
      const preview = event.target.closest?.('[data-duelist-avatar-preview]');
      if (preview) { this.previewId = preview.dataset.duelistAvatarPreview; this.render(); return; }
      if (event.target.closest?.('#duelist-avatar-close')) this.close();
      else if (event.target.closest?.('#duelist-avatar-prev')) { this.page--; this.render(); }
      else if (event.target.closest?.('#duelist-avatar-next')) { this.page++; this.render(); }
      else if (event.target.closest?.('#duelist-avatar-select')) void this.select();
      else if (event.target.closest?.('[data-duelist-avatar-mode]')) this.setPreviewMode(event.target.closest('[data-duelist-avatar-mode]').dataset.duelistAvatarMode);
      else if (event.target.closest?.('#duelist-avatar-rotate-left')) this.previewLifecycle.rotateBy(-Math.PI / 8);
      else if (event.target.closest?.('#duelist-avatar-rotate-right')) this.previewLifecycle.rotateBy(Math.PI / 8);
      else if (event.target.closest?.('#duelist-avatar-recenter')) this.previewLifecycle.recenter();
      else if (event.target.closest?.('#duelist-avatar-export')) void this.transferCollection('export');
      else if (event.target.closest?.('#duelist-avatar-import')) this.dialogElement.querySelector('#duelist-avatar-import-file').click();
      else if (event.target.closest?.('#duelist-avatar-clear')) { this.query = ''; this.seriesId = 'all'; this.status = 'all'; this.page = 0; this.render(); this.searchElement.focus(); }
    };
    this._onInput = event => {
      if (event.target.id !== 'duelist-avatar-search') return;
      this.query = event.target.value.slice(0, 120);
      this.page = 0;
      this.render();
    };
    this._onChange = event => {
      if (event.target.id === 'duelist-avatar-import-file') {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void this.transferCollection('import', file);
        return;
      }
      if (event.target.id === 'duelist-avatar-series') this.seriesId = event.target.value;
      else if (event.target.id === 'duelist-avatar-availability') this.status = event.target.value;
      else return;
      this.page = 0;
      this.render();
    };
    this._onPreviewUnavailable = () => {
      if (this.disposed || this.previewMode !== '3d') return;
      this.previewMode = 'portrait';
      this.previewLifecycle.hide();
      this._syncPreviewPresentation();
      this.dialogElement.querySelector('#duelist-avatar-preview-status').textContent = 'La vue 3D est indisponible sur cet appareil. Le portrait reste disponible.';
    };
    this.rootElement.addEventListener('click', this._onRootClick);
    this.dialogElement.addEventListener('click', this._onClick);
    this.dialogElement.addEventListener('input', this._onInput);
    this.dialogElement.addEventListener('change', this._onChange);
    this.dialogElement.addEventListener('duelist-avatar-preview-unavailable', this._onPreviewUnavailable);
    this._createDialog();
    const MutationObserverClass = this.dialogElement.ownerDocument?.defaultView?.MutationObserver;
    if (MutationObserverClass) {
      this.dialogObserver = new MutationObserverClass(() => {
        if (this.dialogElement.classList.contains('hidden') || this.dialogElement.hidden) {
          this.visible = false;
          this.previewLifecycle.hide();
        }
      });
      this.dialogObserver.observe(this.dialogElement, { attributes: true, attributeFilter: ['class', 'hidden'] });
    }
    this.render();
  }

  _createDialog() {
    this.dialogElement.innerHTML = `<div class="modal-content duelist-avatar-dialog" tabindex="-1">
      <div class="duelist-avatar-heading"><div><p class="duelist-avatar-eyebrow">Votre duelliste</p><h2 id="duelist-avatar-title">Choisir mon personnage</h2></div><button id="duelist-avatar-close" type="button" class="duelist-avatar-close" aria-label="Fermer et revenir à la préparation du duel">Fermer <span aria-hidden="true">×</span></button></div>
      <p class="duelist-avatar-intro">Incarnez votre personnage préféré. Jouez des duels et relevez les défis de la campagne pour agrandir votre collection.</p>
      <div class="duelist-avatar-tools"><label class="duelist-avatar-search-label">Rechercher un personnage<input id="duelist-avatar-search" type="search" maxlength="120" placeholder="Yugi, Judai, Aki…" autocomplete="off"></label><label>Série<select id="duelist-avatar-series"><option value="all">Toutes les séries</option>${DUELIST_SERIES.map(series => `<option value="${escapeHtml(series.id)}">${escapeHtml(series.label)}</option>`).join('')}</select></label><label>Collection<select id="duelist-avatar-availability"><option value="all">Tous les personnages</option><option value="available">Disponibles</option><option value="locked">À débloquer</option></select></label></div>
      <div class="duelist-avatar-body"><section class="duelist-avatar-collection" aria-label="Personnages"><div class="duelist-avatar-results"><p id="duelist-avatar-results" role="status" aria-live="polite"></p><span id="duelist-avatar-collection-count"></span></div><div id="duelist-avatar-grid" class="duelist-avatar-grid"></div><div id="duelist-avatar-empty" class="duelist-avatar-empty" hidden><p>Aucun personnage ne correspond à votre recherche.</p><button id="duelist-avatar-clear" type="button" class="duelist-avatar-button">Effacer les filtres</button></div><nav class="duelist-avatar-pagination" aria-label="Pages de personnages"><button id="duelist-avatar-prev" type="button" class="duelist-avatar-button">← Précédent</button><span id="duelist-avatar-page"></span><button id="duelist-avatar-next" type="button" class="duelist-avatar-button">Suivant →</button></nav></section><aside id="duelist-avatar-detail" class="duelist-avatar-detail" aria-label="Aperçu du personnage"></aside></div>
      <p id="duelist-avatar-selection-status" class="duelist-avatar-selection-status" role="status" aria-live="polite"></p>
      <details class="duelist-avatar-help"><summary>Collection et sauvegarde</summary><p>Chaque personnage indique sa condition et votre progression. Les victoires et les duels terminés font progresser la collection ; les défis de campagne peuvent accorder des médailles ou un personnage précis. Un personnage acquis reste disponible dans ce navigateur.</p><p>Votre avatar change votre apparence. Les règles, les cartes et vos chances de gagner restent les mêmes.</p>${this.onExport || this.onImport ? `<div class="duelist-avatar-backup"><p>Sauvegardez votre collection pour la retrouver dans un autre navigateur. Importer une collection conserve vos personnages déjà acquis.</p><div class="duelist-avatar-backup-actions">${this.onExport ? '<button id="duelist-avatar-export" type="button" class="duelist-avatar-button">Exporter ma collection</button>' : ''}${this.onImport ? '<button id="duelist-avatar-import" type="button" class="duelist-avatar-button">Importer ma collection</button><input id="duelist-avatar-import-file" class="duelist-avatar-file-input" type="file" accept=".json,application/json" tabindex="-1" aria-label="Fichier de collection à importer">' : ''}</div><p id="duelist-avatar-transfer-status" role="status" aria-live="polite"></p></div>` : ''}</details>
    </div>`;
    this.dialogElement.setAttribute('aria-labelledby', 'duelist-avatar-title');
    this.searchElement = this.dialogElement.querySelector('#duelist-avatar-search');
    this.dialogElement.querySelector('#duelist-avatar-detail').innerHTML = `<div class="duelist-avatar-preview-pane"><div class="duelist-avatar-preview-modes" role="group" aria-label="Affichage du personnage"><button type="button" class="duelist-avatar-button" data-duelist-avatar-mode="portrait" aria-pressed="true">Portrait</button><button type="button" class="duelist-avatar-button" data-duelist-avatar-mode="3d" aria-pressed="false">Vue 3D</button></div><div class="duelist-avatar-detail-art"><div id="duelist-avatar-svg-preview" class="duelist-avatar-svg-preview"></div><div id="duelist-avatar-preview-stage" class="duelist-avatar-preview-stage" role="region" tabindex="0" aria-label="Faire tourner le personnage en trois dimensions" aria-describedby="duelist-avatar-rotation-help" hidden></div><span class="duelist-avatar-detail-tag"></span></div><div id="duelist-avatar-rotation-controls" class="duelist-avatar-rotation-controls" hidden><div class="duelist-avatar-rotation-buttons" role="group" aria-label="Rotation du personnage"><button id="duelist-avatar-rotate-left" type="button" class="duelist-avatar-button" aria-label="Tourner le personnage à gauche">← Gauche</button><button id="duelist-avatar-recenter" type="button" class="duelist-avatar-button">Recentrer</button><button id="duelist-avatar-rotate-right" type="button" class="duelist-avatar-button" aria-label="Tourner le personnage à droite">Droite →</button></div><p id="duelist-avatar-rotation-help">Glissez horizontalement pour tourner. Au clavier : flèches gauche/droite ; Début pour recentrer.</p></div><p id="duelist-avatar-preview-status" class="duelist-avatar-preview-status" role="status" aria-live="polite"></p></div><div class="duelist-avatar-detail-copy"></div>`;
  }

  _context(profile) {
    const context = this.getContext() || {};
    return { ...context, earnedAvatarIds: [...new Set([...(context.earnedAvatarIds || []), ...(profile.earnedAvatarIds || [])])] };
  }

  render() {
    if (this.disposed) return;
    const focusedAvatar = this.dialogElement.ownerDocument?.activeElement?.dataset?.duelistAvatarPreview;
    const profile = this.getProfile() || {};
    const selected = getDuelistAvatar(profile.selectedAvatarId) || getDuelistAvatar(DEFAULT_DUELIST_AVATAR_ID);
    const context = this._context(profile);
    const availableCount = DUELIST_AVATARS.filter(avatar => getDuelistAvatarUnlockState(avatar, context).unlocked).length;
    this.rootElement.innerHTML = `<button id="duelist-avatar-open" class="duelist-avatar-trigger" type="button" aria-haspopup="dialog" aria-controls="${escapeHtml(this.dialogElement.id)}"><span class="duelist-avatar-trigger-portrait">${renderDuelistAvatarPortrait(selected, { decorative: true })}</span><span class="duelist-avatar-trigger-copy"><span class="duelist-avatar-eyebrow">Mon personnage</span><strong>${escapeHtml(selected.name)}</strong><span>${availableCount} disponibles · choisir mon avatar</span></span><span class="duelist-avatar-trigger-arrow" aria-hidden="true">→</span></button>`;
    const cards = filterDuelistAvatars({ query: this.query, seriesId: this.seriesId, status: this.status, context });
    const pages = Math.max(1, Math.ceil(cards.length / DUELIST_AVATAR_PAGE_SIZE));
    this.page = Math.max(0, Math.min(pages - 1, this.page));
    const visible = cards.slice(this.page * DUELIST_AVATAR_PAGE_SIZE, (this.page + 1) * DUELIST_AVATAR_PAGE_SIZE);
    if (!getDuelistAvatar(this.previewId)) this.previewId = selected.id;
    if (cards.length && !cards.some(avatar => avatar.id === this.previewId)) this.previewId = cards.some(avatar => avatar.id === selected.id) ? selected.id : visible[0].id;
    this.searchElement.value = this.query;
    this.dialogElement.querySelector('#duelist-avatar-series').value = this.seriesId;
    this.dialogElement.querySelector('#duelist-avatar-availability').value = this.status;
    this.dialogElement.querySelector('#duelist-avatar-results').textContent = `${cards.length} personnage${cards.length > 1 ? 's' : ''}`;
    this.dialogElement.querySelector('#duelist-avatar-collection-count').textContent = `${availableCount}/${DUELIST_AVATARS.length} disponibles`;
    this.dialogElement.querySelector('#duelist-avatar-page').textContent = `${this.page + 1} / ${pages}`;
    this.dialogElement.querySelector('#duelist-avatar-prev').disabled = this.page === 0;
    this.dialogElement.querySelector('#duelist-avatar-next').disabled = this.page === pages - 1;
    this.dialogElement.querySelector('#duelist-avatar-empty').hidden = cards.length > 0;
    this.dialogElement.querySelector('#duelist-avatar-grid').innerHTML = visible.map(avatar => {
      const state = getDuelistAvatarUnlockState(avatar, context);
      return `<button class="duelist-avatar-card ${state.unlocked ? 'duelist-avatar-available' : 'duelist-avatar-locked'}" type="button" data-duelist-avatar-preview="${escapeHtml(avatar.id)}" aria-pressed="${avatar.id === this.previewId}" aria-label="${escapeHtml(`Voir ${avatar.name}${state.unlocked ? '' : ' — verrouillé'}`)}"><span class="duelist-avatar-card-portrait">${renderDuelistAvatarPortrait(avatar, { decorative: true })}</span><span class="duelist-avatar-card-badge">${avatar.id === selected.id ? '✓ Mon avatar' : state.unlocked ? 'Disponible' : 'À débloquer'}</span><strong>${escapeHtml(avatar.name)}</strong><span class="duelist-avatar-card-condition">${escapeHtml(state.unlocked ? (state.earned ? 'Acquis' : avatar.unlock.type === 'starter' ? 'Disponible dès le départ' : 'Condition remplie') : state.progressLabel)}</span>${progressMarkup(state, avatar.name)}</button>`;
    }).join('');
    this._renderDetail(getDuelistAvatar(this.previewId) || selected, selected, context);
    if (focusedAvatar) this.dialogElement.querySelector(`[data-duelist-avatar-preview="${focusedAvatar}"]`)?.focus({ preventScroll: true });
  }

  _renderDetail(avatar, selected, context) {
    const state = getDuelistAvatarUnlockState(avatar, context);
    const series = DUELIST_SERIES.find(entry => entry.id === avatar.seriesId);
    const detail = this.dialogElement.querySelector('#duelist-avatar-detail');
    const previousPreviewId = detail.dataset.duelistAvatarId;
    detail.dataset.duelistAvatarId = avatar.id;
    if (previousPreviewId !== avatar.id) detail.querySelector('#duelist-avatar-svg-preview').innerHTML = renderDuelistAvatarPortrait(avatar);
    detail.querySelector('.duelist-avatar-detail-tag').textContent = series?.label || '';
    detail.querySelector('.duelist-avatar-detail-copy').innerHTML = `<p class="duelist-avatar-eyebrow">${state.unlocked ? 'Disponible dans votre collection' : 'Personnage à débloquer'}</p><h3>${escapeHtml(avatar.name)}</h3><p class="duelist-avatar-description">${escapeHtml(avatar.description)}</p><div class="duelist-avatar-unlock ${state.unlocked ? 'duelist-avatar-unlocked' : ''}"><strong>${state.unlocked ? '✓ Disponible' : 'Condition de déblocage'}</strong><p>${escapeHtml(state.conditionLabel)}</p>${progressMarkup(state, avatar.name)}<p class="duelist-avatar-progress-label">${escapeHtml(state.progressLabel)}</p></div><button id="duelist-avatar-select" type="button" class="duelist-avatar-button duelist-avatar-use" ${!state.unlocked || avatar.id === selected.id || this.pending ? 'disabled' : ''}>${avatar.id === selected.id ? '✓ Avatar actuel' : !state.unlocked ? 'Personnage verrouillé' : this.pending ? 'Sélection…' : 'Utiliser cet avatar'}</button>`;
    this._syncPreviewPresentation();
    if (this.previewMode === '3d' && this.visible) void this.previewLifecycle.show(avatar, detail.querySelector('#duelist-avatar-preview-stage'));
    if (this.onPreview && this.visible && previousPreviewId !== avatar.id) this.onPreview(avatar, detail.querySelector('.duelist-avatar-detail-art'));
  }

  _setPreviewState(state) {
    this.previewState = state;
    const status = this.dialogElement.querySelector('#duelist-avatar-preview-status');
    if (status) status.textContent = state === 'loading' ? 'Chargement de la silhouette…' : '';
    this.dialogElement.querySelectorAll('.duelist-avatar-rotation-buttons button').forEach(button => { button.disabled = state !== 'ready'; });
  }

  _syncPreviewPresentation() {
    const detail = this.dialogElement.querySelector('#duelist-avatar-detail');
    detail.dataset.previewMode = this.previewMode;
    detail.querySelector('#duelist-avatar-svg-preview').hidden = this.previewMode === '3d';
    detail.querySelector('#duelist-avatar-preview-stage').hidden = this.previewMode !== '3d';
    detail.querySelector('#duelist-avatar-rotation-controls').hidden = this.previewMode !== '3d';
    detail.querySelectorAll('[data-duelist-avatar-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.duelistAvatarMode === this.previewMode)));
  }

  setPreviewMode(mode) {
    if (this.disposed || !this.visible || !['portrait', '3d'].includes(mode)) return;
    this.previewMode = mode;
    this._syncPreviewPresentation();
    if (mode === 'portrait') this.previewLifecycle.hide();
    else {
      const avatar = getDuelistAvatar(this.previewId);
      if (avatar) void this.previewLifecycle.show(avatar, this.dialogElement.querySelector('#duelist-avatar-preview-stage'));
    }
  }

  open() {
    if (this.disposed) return;
    this.previewMode = 'portrait';
    this.previewLifecycle.hide();
    this.visible = true;
    this.previewId = this.getProfile()?.selectedAvatarId || DEFAULT_DUELIST_AVATAR_ID;
    this.query = '';
    this.seriesId = 'all';
    this.status = 'all';
    this.page = Math.max(0, Math.floor(DUELIST_AVATARS.findIndex(avatar => avatar.id === this.previewId) / DUELIST_AVATAR_PAGE_SIZE));
    this.dialogElement.querySelector('#duelist-avatar-selection-status').textContent = '';
    this.render();
    if (this.openDialog) this.openDialog(this.dialogElement, this.searchElement);
    else { this.dialogElement.classList.remove('hidden'); this.searchElement.focus(); }
  }

  close() {
    if (this.disposed) return;
    this.visible = false;
    this.previewMode = 'portrait';
    this.previewLifecycle.hide();
    this._syncPreviewPresentation();
    if (this.closeDialog) this.closeDialog(this.dialogElement);
    else this.dialogElement.classList.add('hidden');
  }

  async transferCollection(kind, file = null) {
    if (this.transferPending || this.disposed) return;
    const callback = kind === 'import' ? this.onImport : kind === 'export' ? this.onExport : null;
    if (!callback) return;
    const status = this.dialogElement.querySelector('#duelist-avatar-transfer-status');
    if (kind === 'import' && (!file || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 64_000)) {
      status.textContent = 'Choisissez un fichier JSON de collection de 64 Ko au maximum.';
      return;
    }
    this.transferPending = true;
    this.dialogElement.querySelectorAll('.duelist-avatar-backup-actions button').forEach(button => { button.disabled = true; });
    status.textContent = kind === 'import' ? 'Import de la collection…' : 'Préparation de la sauvegarde…';
    try {
      const result = await (kind === 'import' ? callback(file) : callback());
      if (this.disposed) return;
      status.textContent = result?.message || (result?.accepted === false ? (kind === 'import' ? 'La collection n’a pas pu être importée.' : 'La sauvegarde n’a pas pu être préparée.')
        : kind === 'import' ? 'Votre collection a été importée.' : 'Votre collection est prête à être sauvegardée.');
      this.render();
    } catch {
      if (!this.disposed) status.textContent = kind === 'import' ? 'Ce fichier n’a pas pu être importé. Votre collection est conservée.' : 'La sauvegarde n’a pas pu être préparée. Réessayez.';
    } finally {
      this.transferPending = false;
      this.dialogElement.querySelectorAll('.duelist-avatar-backup-actions button').forEach(button => { button.disabled = false; });
    }
  }

  async select() {
    if (this.pending || this.disposed) return;
    const avatar = getDuelistAvatar(this.previewId);
    const profile = this.getProfile() || {};
    if (!avatar || !getDuelistAvatarUnlockState(avatar, this._context(profile)).unlocked) return;
    const status = this.dialogElement.querySelector('#duelist-avatar-selection-status');
    const preserveFocus = this.dialogElement.ownerDocument?.activeElement?.id === 'duelist-avatar-select';
    this.pending = true;
    this.render();
    try {
      const result = await this.onSelect?.(avatar.id);
      if (this.disposed) return;
      if (result?.accepted === true) status.textContent = result.saved === false && result.message
        ? result.message : `${avatar.name} est maintenant votre avatar.`;
      else status.textContent = result?.reason || 'Ce personnage ne peut pas être sélectionné pour le moment.';
    } catch {
      if (!this.disposed) status.textContent = 'Votre choix n’a pas pu être sauvegardé. Réessayez.';
    } finally {
      this.pending = false;
      this.render();
      if (preserveFocus && this.visible && !this.disposed) {
        this.dialogElement.querySelector(`[data-duelist-avatar-preview="${avatar.id}"]`)?.focus({ preventScroll: true });
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.visible = false;
    this.previewLifecycle.dispose();
    this.dialogObserver?.disconnect();
    this.rootElement.removeEventListener('click', this._onRootClick);
    this.dialogElement.removeEventListener('click', this._onClick);
    this.dialogElement.removeEventListener('input', this._onInput);
    this.dialogElement.removeEventListener('change', this._onChange);
    this.dialogElement.removeEventListener('duelist-avatar-preview-unavailable', this._onPreviewUnavailable);
  }
}
