import { DUELIST_SERIES, DUELIST_AVATARS, DEFAULT_DUELIST_AVATAR_ID, getDuelistAvatar } from '../content/DuelistAvatarCatalog.js';
import { getDuelistAvatarUnlockState } from '../content/DuelistAvatarProgress.js';
import { escapeHtml } from '../security.js';
import { renderDuelistAvatarPortrait } from './DuelistAvatarPortrait.js';

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
  constructor({ rootElement, dialogElement, getProfile, getContext, onSelect, openDialog, closeDialog, onPreview } = {}) {
    if (!rootElement || !dialogElement) throw new TypeError('Le sélecteur d’avatar nécessite un emplacement et une fenêtre.');
    this.rootElement = rootElement;
    this.dialogElement = dialogElement;
    this.getProfile = getProfile || (() => ({ selectedAvatarId: DEFAULT_DUELIST_AVATAR_ID, earnedAvatarIds: [] }));
    this.getContext = getContext || (() => ({}));
    this.onSelect = onSelect;
    this.openDialog = openDialog;
    this.closeDialog = closeDialog;
    this.onPreview = onPreview;
    this.page = 0;
    this.previewId = null;
    this.query = '';
    this.seriesId = 'all';
    this.status = 'all';
    this.visible = false;
    this.pending = false;
    this.disposed = false;
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
      else if (event.target.closest?.('#duelist-avatar-clear')) { this.query = ''; this.seriesId = 'all'; this.status = 'all'; this.page = 0; this.render(); this.searchElement.focus(); }
    };
    this._onInput = event => {
      if (event.target.id !== 'duelist-avatar-search') return;
      this.query = event.target.value.slice(0, 120);
      this.page = 0;
      this.render();
    };
    this._onChange = event => {
      if (event.target.id === 'duelist-avatar-series') this.seriesId = event.target.value;
      else if (event.target.id === 'duelist-avatar-availability') this.status = event.target.value;
      else return;
      this.page = 0;
      this.render();
    };
    this.rootElement.addEventListener('click', this._onRootClick);
    this.dialogElement.addEventListener('click', this._onClick);
    this.dialogElement.addEventListener('input', this._onInput);
    this.dialogElement.addEventListener('change', this._onChange);
    this._createDialog();
    this.render();
  }

  _createDialog() {
    this.dialogElement.innerHTML = `<div class="modal-content duelist-avatar-dialog" tabindex="-1">
      <div class="duelist-avatar-heading"><div><p class="duelist-avatar-eyebrow">Votre duelliste</p><h2 id="duelist-avatar-title">Choisir mon personnage</h2></div><button id="duelist-avatar-close" type="button" class="duelist-avatar-close" aria-label="Fermer et revenir à la préparation du duel">Fermer <span aria-hidden="true">×</span></button></div>
      <p class="duelist-avatar-intro">Incarnez votre personnage préféré. Jouez des duels et relevez les défis de la campagne pour agrandir votre collection.</p>
      <div class="duelist-avatar-tools"><label class="duelist-avatar-search-label">Rechercher un personnage<input id="duelist-avatar-search" type="search" maxlength="120" placeholder="Yugi, Judai, Aki…" autocomplete="off"></label><label>Série<select id="duelist-avatar-series"><option value="all">Toutes les séries</option>${DUELIST_SERIES.map(series => `<option value="${escapeHtml(series.id)}">${escapeHtml(series.label)}</option>`).join('')}</select></label><label>Collection<select id="duelist-avatar-availability"><option value="all">Tous les personnages</option><option value="available">Disponibles</option><option value="locked">À débloquer</option></select></label></div>
      <div class="duelist-avatar-body"><section class="duelist-avatar-collection" aria-label="Personnages"><div class="duelist-avatar-results"><p id="duelist-avatar-results" role="status" aria-live="polite"></p><span id="duelist-avatar-collection-count"></span></div><div id="duelist-avatar-grid" class="duelist-avatar-grid"></div><div id="duelist-avatar-empty" class="duelist-avatar-empty" hidden><p>Aucun personnage ne correspond à votre recherche.</p><button id="duelist-avatar-clear" type="button" class="duelist-avatar-button">Effacer les filtres</button></div><nav class="duelist-avatar-pagination" aria-label="Pages de personnages"><button id="duelist-avatar-prev" type="button" class="duelist-avatar-button">← Précédent</button><span id="duelist-avatar-page"></span><button id="duelist-avatar-next" type="button" class="duelist-avatar-button">Suivant →</button></nav></section><aside id="duelist-avatar-detail" class="duelist-avatar-detail" aria-label="Aperçu du personnage"></aside></div>
      <p id="duelist-avatar-selection-status" class="duelist-avatar-selection-status" role="status" aria-live="polite"></p>
      <details class="duelist-avatar-help"><summary>Comment débloquer les personnages ?</summary><p>Chaque personnage indique sa condition et votre progression. Les victoires et les duels terminés font progresser la collection ; les défis de campagne peuvent accorder des médailles ou un personnage précis. Un personnage acquis reste disponible dans ce navigateur.</p><p>Votre avatar change votre apparence. Les règles, les cartes et vos chances de gagner restent les mêmes.</p></details>
    </div>`;
    this.dialogElement.setAttribute('aria-labelledby', 'duelist-avatar-title');
    this.searchElement = this.dialogElement.querySelector('#duelist-avatar-search');
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
    detail.innerHTML = `<div class="duelist-avatar-detail-art">${renderDuelistAvatarPortrait(avatar)}<span class="duelist-avatar-detail-tag">${escapeHtml(series?.label || '')}</span></div><div class="duelist-avatar-detail-copy"><p class="duelist-avatar-eyebrow">${state.unlocked ? 'Disponible dans votre collection' : 'Personnage à débloquer'}</p><h3>${escapeHtml(avatar.name)}</h3><p class="duelist-avatar-description">${escapeHtml(avatar.description)}</p><div class="duelist-avatar-unlock ${state.unlocked ? 'duelist-avatar-unlocked' : ''}"><strong>${state.unlocked ? '✓ Disponible' : 'Condition de déblocage'}</strong><p>${escapeHtml(state.conditionLabel)}</p>${progressMarkup(state, avatar.name)}<p class="duelist-avatar-progress-label">${escapeHtml(state.progressLabel)}</p></div><button id="duelist-avatar-select" type="button" class="duelist-avatar-button duelist-avatar-use" ${!state.unlocked || avatar.id === selected.id || this.pending ? 'disabled' : ''}>${avatar.id === selected.id ? '✓ Avatar actuel' : !state.unlocked ? 'Personnage verrouillé' : this.pending ? 'Sélection…' : 'Utiliser cet avatar'}</button></div>`;
    if (this.onPreview && this.visible && previousPreviewId !== avatar.id) this.onPreview(avatar, detail.querySelector('.duelist-avatar-detail-art'));
  }

  open() {
    if (this.disposed) return;
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
    if (this.closeDialog) this.closeDialog(this.dialogElement);
    else this.dialogElement.classList.add('hidden');
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
    this.rootElement.removeEventListener('click', this._onRootClick);
    this.dialogElement.removeEventListener('click', this._onClick);
    this.dialogElement.removeEventListener('input', this._onInput);
    this.dialogElement.removeEventListener('change', this._onChange);
  }
}
