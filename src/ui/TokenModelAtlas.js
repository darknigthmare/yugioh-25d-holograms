import { TOKEN_PRESENTATION_CATALOG, getTokenPresentationProfile } from './TokenMonsterProfiles.js';
import { DuelistAvatarPreviewLifecycle } from './DuelistAvatarPreviewLifecycle.js';
import { escapeHtml } from '../security.js';

export const TOKEN_ATLAS_PAGE_SIZE = 24;
const KIND_LABELS = Object.freeze({ duel: 'Jeton de Duel', decorative: 'Carte Jeton imprimée', placeholder: 'Repère natif' });
const RACE_LABELS = Object.freeze({ Warrior: 'Guerrier', Spellcaster: 'Magicien', Fairy: 'Elfe', Fiend: 'Démon', Zombie: 'Zombie', Machine: 'Machine', Aqua: 'Aqua', Pyro: 'Pyro', Rock: 'Rocher', 'Winged Beast': 'Bête Ailée', Plant: 'Plante', Insect: 'Insecte', Thunder: 'Tonnerre', Dragon: 'Dragon', Beast: 'Bête', 'Beast-Warrior': 'Bête-Guerrier', Dinosaur: 'Dinosaure', Fish: 'Poisson', 'Sea Serpent': 'Serpent de Mer', Reptile: 'Reptile', Psychic: 'Psychique', 'Divine-Beast': 'Bête Divine', 'Creator God': 'Dieu Créateur', Wyrm: 'Wyrm', Cyberse: 'Cyberse', Illusion: 'Illusion' });
const ATTRIBUTE_LABELS = Object.freeze({ EARTH: 'TERRE', WATER: 'EAU', FIRE: 'FEU', WIND: 'VENT', LIGHT: 'LUMIÈRE', DARK: 'TÉNÈBRES', DIVINE: 'DIVIN' });
const ANATOMY_SEARCH_TERMS = Object.freeze({ sheep: 'mouton', lamb: 'agneau', hippo: 'hippopotame', avian: 'oiseau', flower: 'fleur', ant: 'fourmi', beetle: 'scarabée', spider: 'araignée', raccoon: 'raton laveur', egg: 'œuf', fish: 'poisson', aircraft: 'avion', gear: 'engrenage', maize: 'maïs' });

export function normalizeTokenAtlasSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr').trim();
}

export function formatTokenAtlasStat(value) {
  if (value === -2 || value === -1) return '?';
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? String(value) : '—';
}

export function filterTokenAtlasProfiles({ query = '', kind = 'all', race = 'all', attribute = 'all' } = {}) {
  const terms = normalizeTokenAtlasSearch(query).split(/\s+/).filter(Boolean);
  return TOKEN_PRESENTATION_CATALOG.filter(profile => {
    if (kind !== 'all' && profile.kind !== kind) return false;
    if (race !== 'all' && profile.race !== race) return false;
    if (attribute !== 'all' && profile.attribute !== attribute) return false;
    const text = normalizeTokenAtlasSearch([profile.name, ...(profile.aliases || []), profile.cardId, profile.presentationId,
      profile.race, RACE_LABELS[profile.race], profile.attribute, ATTRIBUTE_LABELS[profile.attribute], KIND_LABELS[profile.kind], ANATOMY_SEARCH_TERMS[profile.tokenAnatomy]].join(' '));
    return terms.every(term => text.includes(term));
  });
}

function localReferencePath(value) {
  return typeof value === 'string' && /^\/(?!\/)[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g)$/i.test(value) && !value.split('/').includes('..') ? value : null;
}

function referenceHref(value) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; }
  catch { return null; }
}

function kindDescription(profile) {
  if (profile.kind === 'placeholder') return 'Repère technique de la base native. Cette entrée ne représente pas un monstre officiel et ne possède pas de modèle de monstre.';
  if (profile.modelKind === 'duelist-avatar') return 'Carte Jeton commémorative imprimée. Elle sert de repère visuel sans caractéristiques propres de monstre. L’aperçu représente uniquement le duelliste illustré.';
  if (profile.kind === 'decorative') return 'Présentation d’une carte Jeton imprimée. Son illustration sert de repère ; elle ne crée pas de monstre et ne s’ajoute pas à un Deck.';
  return 'Jeton créé sur le Terrain par un effet de carte. Un Jeton ne s’ajoute pas à un Deck et cesse d’exister lorsqu’il quitte le Terrain.';
}

/** Browses public Token records without accepting a duel or a deck mutation callback. */
export class TokenModelAtlas {
  constructor({ dialogElement, openDialog, closeDialog } = {}) {
    if (!dialogElement) throw new TypeError('L’Atlas des Jetons nécessite une fenêtre.');
    this.dialogElement = dialogElement;
    this.openDialog = openDialog;
    this.closeDialog = closeDialog;
    this.query = '';
    this.kind = 'all';
    this.race = 'all';
    this.attribute = 'all';
    this.page = 0;
    this.selectedId = null;
    this.pose = 'attack';
    this.visible = false;
    this.disposed = false;
    this.previewState = 'idle';
    this.previewRequest = 0;
    this.previewLifecycle = new DuelistAvatarPreviewLifecycle({
      loadPreview: async () => {
        const module = await import('./TokenModelAtlasPreview.js');
        return { createDuelistAvatarPreview3D: (host, profile) => module.createTokenModelAtlasPreview(host, profile, {
          defense: this.pose === 'defense', isActive: () => this.visible && !this.disposed && !this.dialogElement.classList.contains('hidden') && !this.dialogElement.hidden
        }) };
      },
      isActive: () => this.visible && !this.disposed && !!this.selectedId && !this.dialogElement.classList.contains('hidden') && !this.dialogElement.hidden,
      onStateChange: state => this._setPreviewState(state),
      onError: () => this._previewUnavailable()
    });
    this._onClick = event => {
      const card = event.target.closest?.('[data-token-presentation-id]');
      if (card?.tagName === 'BUTTON') { this.selectedId = card.dataset.tokenPresentationId; this.render(); return; }
      if (event.target.closest?.('#token-atlas-close')) this.close();
      else if (event.target.closest?.('#token-atlas-prev')) { this.page--; this.render(); }
      else if (event.target.closest?.('#token-atlas-next')) { this.page++; this.render(); }
      else if (event.target.closest?.('#token-atlas-rotate-left')) this.previewLifecycle.rotateBy(-Math.PI / 8);
      else if (event.target.closest?.('#token-atlas-rotate-right')) this.previewLifecycle.rotateBy(Math.PI / 8);
      else if (event.target.closest?.('#token-atlas-recenter')) this.previewLifecycle.recenter();
      else if (event.target.closest?.('button[data-token-pose]')) this.setPose(event.target.closest('button[data-token-pose]').dataset.tokenPose);
      else if (event.target.closest?.('#token-atlas-retry')) this._showPreview();
      else if (event.target.closest?.('#token-atlas-reset-filters')) { this.query = ''; this.kind = 'all'; this.race = 'all'; this.attribute = 'all'; this.page = 0; this.render(); this.searchElement.focus(); }
    };
    this._onInput = event => { if (event.target.id === 'token-atlas-search') { this.query = event.target.value.slice(0, 120); this.page = 0; this.render(); } };
    this._onChange = event => {
      if (event.target.id === 'token-atlas-kind') this.kind = event.target.value;
      else if (event.target.id === 'token-atlas-race') this.race = event.target.value;
      else if (event.target.id === 'token-atlas-attribute') this.attribute = event.target.value;
      else return;
      this.page = 0;
      this.render();
    };
    this._onUnavailable = () => this._previewUnavailable();
    this._onKey = event => {
      if (event.key === 'Escape' && this.visible && !this.closeDialog) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      }
    };
    this._createContent();
    dialogElement.addEventListener('click', this._onClick);
    dialogElement.addEventListener('input', this._onInput);
    dialogElement.addEventListener('change', this._onChange);
    dialogElement.addEventListener('token-atlas-preview-unavailable', this._onUnavailable);
    dialogElement.addEventListener('keydown', this._onKey);
    const Observer = dialogElement.ownerDocument?.defaultView?.MutationObserver;
    if (Observer) {
      this.dialogObserver = new Observer(() => {
        if (dialogElement.hidden || dialogElement.classList.contains('hidden')) { this.visible = false; this.previewRequest++; this.previewLifecycle.hide(); }
      });
      this.dialogObserver.observe(dialogElement, { attributes: true, attributeFilter: ['class', 'hidden'] });
    }
    this.render();
  }

  _createContent() {
    const races = [...new Set(TOKEN_PRESENTATION_CATALOG.map(profile => profile.race).filter(Boolean))].sort();
    const attributes = [...new Set(TOKEN_PRESENTATION_CATALOG.map(profile => profile.attribute).filter(Boolean))].sort();
    this.dialogElement.innerHTML = `<div class="modal-content token-atlas-dialog" tabindex="-1"><header class="token-atlas-heading"><div><p class="token-atlas-eyebrow">Créatures et hologrammes</p><h2 id="token-atlas-title">Atlas des Jetons</h2></div><button id="token-atlas-close" class="token-atlas-button" type="button">Fermer <span aria-hidden="true">×</span></button></header><p class="token-atlas-intro">Retrouvez les Jetons du Duel, examinez leurs modèles en trois dimensions et distinguez les cartes imprimées utilisées comme repères.</p><p id="token-atlas-summary" class="token-atlas-summary"></p><div class="token-atlas-tools"><label class="token-atlas-search-label">Rechercher un Jeton<input id="token-atlas-search" type="search" maxlength="120" placeholder="Mouton, Scapegoat, code de carte…" autocomplete="off"></label><label>Présentation<select id="token-atlas-kind"><option value="all">Toutes les présentations</option><option value="duel">Jetons de Duel</option><option value="decorative">Cartes imprimées</option><option value="placeholder">Repères natifs</option></select></label><label>Type de monstre<select id="token-atlas-race"><option value="all">Tous les types</option>${races.map(race => `<option value="${escapeHtml(race)}">${escapeHtml(RACE_LABELS[race] || race)}</option>`).join('')}</select></label><label>Attribut<select id="token-atlas-attribute"><option value="all">Tous les attributs</option>${attributes.map(attribute => `<option value="${escapeHtml(attribute)}">${escapeHtml(ATTRIBUTE_LABELS[attribute] || attribute)}</option>`).join('')}</select></label></div><div class="token-atlas-body"><section class="token-atlas-collection" aria-label="Liste des Jetons"><p id="token-atlas-results" class="token-atlas-results" role="status" aria-live="polite"></p><div id="token-atlas-list" class="token-atlas-list"></div><div id="token-atlas-empty" class="token-atlas-empty" hidden><p>Aucune présentation ne correspond à ces filtres.</p><button id="token-atlas-reset-filters" type="button" class="token-atlas-button">Effacer les filtres</button></div><nav class="token-atlas-pagination" aria-label="Pages de Jetons"><button id="token-atlas-prev" type="button" class="token-atlas-button">← Précédent</button><span id="token-atlas-page"></span><button id="token-atlas-next" type="button" class="token-atlas-button">Suivant →</button></nav></section><aside id="token-atlas-detail" class="token-atlas-detail" aria-label="Jeton sélectionné"><div class="token-atlas-stage-wrap"><div id="token-atlas-preview" class="token-atlas-preview" role="region" tabindex="0" aria-label="Faire tourner le modèle du Jeton" aria-describedby="token-atlas-rotation-help"></div><p id="token-atlas-no-model" class="token-atlas-no-model" hidden></p><span id="token-atlas-kind-label" class="token-atlas-kind-label"></span></div><p id="token-atlas-preview-status" class="token-atlas-preview-status" role="status" aria-live="polite"></p><button id="token-atlas-retry" type="button" class="token-atlas-button token-atlas-retry" hidden>Réessayer la vue 3D</button><div class="token-atlas-view-controls"><div class="token-atlas-rotation-buttons" role="group" aria-label="Rotation du Jeton"><button id="token-atlas-rotate-left" class="token-atlas-button" type="button">← Gauche</button><button id="token-atlas-recenter" class="token-atlas-button" type="button">Recentrer</button><button id="token-atlas-rotate-right" class="token-atlas-button" type="button">Droite →</button></div><div class="token-atlas-poses" role="group" aria-label="Position du Jeton"><button type="button" class="token-atlas-button" data-token-pose="attack" aria-pressed="true">Attaque</button><button type="button" class="token-atlas-button" data-token-pose="defense" aria-pressed="false">Défense</button></div><p id="token-atlas-rotation-help">Glissez horizontalement pour tourner. Au clavier : flèches gauche/droite ; Début pour recentrer.</p></div><div id="token-atlas-info" class="token-atlas-info"></div></aside></div><details class="token-atlas-help"><summary>Jetons de Duel, cartes imprimées et repères natifs</summary><p>Un effet de carte détermine les propriétés d’un Jeton lorsqu’il est créé. Les chiffres de cet Atlas décrivent l’entrée de référence ; un effet peut lui donner d’autres valeurs pendant le Duel.</p><p>Les cartes Jeton imprimées servent de repères visuels. Les repères natifs sont des entrées techniques distinctes des monstres officiels. Aucune présentation de cet Atlas n’est ajoutée à votre Deck.</p></details></div>`;
    this.dialogElement.setAttribute('aria-labelledby', 'token-atlas-title');
    this.searchElement = this.dialogElement.querySelector('#token-atlas-search');
    this.previewHost = this.dialogElement.querySelector('#token-atlas-preview');
  }

  render() {
    if (this.disposed) return;
    const focused = this.dialogElement.ownerDocument?.activeElement?.dataset?.tokenPresentationId;
    const profiles = filterTokenAtlasProfiles(this);
    const pages = Math.max(1, Math.ceil(profiles.length / TOKEN_ATLAS_PAGE_SIZE));
    this.page = Math.max(0, Math.min(pages - 1, this.page));
    const visible = profiles.slice(this.page * TOKEN_ATLAS_PAGE_SIZE, (this.page + 1) * TOKEN_ATLAS_PAGE_SIZE);
    if (!profiles.some(profile => profile.presentationId === this.selectedId)) this.selectedId = visible[0]?.presentationId || null;
    const counts = Object.fromEntries(['duel', 'decorative', 'placeholder'].map(kind => [kind, TOKEN_PRESENTATION_CATALOG.filter(profile => profile.kind === kind).length]));
    this.dialogElement.querySelector('#token-atlas-summary').textContent = `${counts.duel} Jetons de Duel · ${counts.decorative} présentations imprimées · ${counts.placeholder} repères natifs`;
    this.searchElement.value = this.query;
    for (const key of ['kind', 'race', 'attribute']) this.dialogElement.querySelector(`#token-atlas-${key}`).value = this[key];
    this.dialogElement.querySelector('#token-atlas-results').textContent = `${profiles.length} présentation${profiles.length > 1 ? 's' : ''}`;
    this.dialogElement.querySelector('#token-atlas-page').textContent = `${this.page + 1} / ${pages}`;
    this.dialogElement.querySelector('#token-atlas-prev').disabled = this.page === 0;
    this.dialogElement.querySelector('#token-atlas-next').disabled = this.page === pages - 1;
    this.dialogElement.querySelector('#token-atlas-empty').hidden = profiles.length > 0;
    this.dialogElement.querySelector('#token-atlas-list').innerHTML = visible.map(profile => `<button class="token-atlas-card" type="button" data-token-presentation-id="${escapeHtml(profile.presentationId)}" data-token-card-id="${escapeHtml(profile.cardId || '')}" aria-pressed="${this.selectedId === profile.presentationId}"><span class="token-atlas-card-icon" aria-hidden="true">◇</span><span class="token-atlas-card-copy"><strong>${escapeHtml(profile.name)}</strong><span>${escapeHtml(KIND_LABELS[profile.kind] || '')}</span><span>${escapeHtml([RACE_LABELS[profile.race] || profile.race, ATTRIBUTE_LABELS[profile.attribute] || profile.attribute].filter(Boolean).join(' · '))}</span></span><span class="token-atlas-card-model">${profile.modelAvailable ? profile.modelKind === 'duelist-avatar' ? 'Duelliste 3D' : '3D' : 'Repère'}</span></button>`).join('');
    const detail = this.dialogElement.querySelector('#token-atlas-detail');
    const profile = getTokenPresentationProfile(this.selectedId);
    detail.hidden = !profile;
    if (!profile) { this.previewRequest++; this.previewLifecycle.hide(); }
    else this._renderDetail(profile);
    if (focused) [...this.dialogElement.querySelectorAll('[data-token-presentation-id]')].find(element => element.tagName === 'BUTTON' && element.dataset.tokenPresentationId === focused)?.focus({ preventScroll: true });
  }

  _renderDetail(profile) {
    const detail = this.dialogElement.querySelector('#token-atlas-detail');
    const changed = detail.dataset.tokenPresentationId !== profile.presentationId;
    detail.dataset.tokenPresentationId = profile.presentationId;
    detail.dataset.tokenCardId = profile.cardId || '';
    const commemorative = profile.modelKind === 'duelist-avatar';
    this.previewHost.setAttribute('aria-label', commemorative ? 'Faire tourner la silhouette du duelliste' : 'Faire tourner le modèle du Jeton');
    this.dialogElement.querySelector('#token-atlas-kind-label').textContent = commemorative ? 'Carte Jeton commémorative' : KIND_LABELS[profile.kind] || '';
    this.previewHost.hidden = !profile.modelAvailable;
    const noModel = this.dialogElement.querySelector('#token-atlas-no-model');
    noModel.hidden = profile.modelAvailable;
    noModel.textContent = profile.kind === 'placeholder' ? 'Repère natif — aucun monstre officiel à représenter.' : 'Cette présentation ne possède pas de modèle de monstre.';
    const art = localReferencePath(profile.referenceArtPath);
    const link = referenceHref(profile.referenceArtUrl);
    const referenceLabel = profile.referenceKind === 'generator' ? 'Carte génératrice — illustration du Jeton indisponible' : commemorative ? 'Carte Jeton commémorative imprimée' : profile.referenceSet ? `Carte Jeton imprimée — ${profile.referenceSet}` : 'Illustration de référence du Jeton';
    this.dialogElement.querySelector('#token-atlas-info').innerHTML = `<p class="token-atlas-eyebrow">${escapeHtml(KIND_LABELS[profile.kind] || '')}</p><h3>${escapeHtml(profile.name)}</h3><p class="token-atlas-kind-description">${escapeHtml(kindDescription(profile))}</p>${commemorative ? `<p class="token-atlas-model-description">${escapeHtml(profile.modelDescription || 'Silhouette stylisée du duelliste imprimé.')}</p>` : ''}${profile.kind !== 'placeholder' && !commemorative ? `<dl class="token-atlas-stats"><div><dt>Type</dt><dd>${escapeHtml(RACE_LABELS[profile.race] || profile.race || '—')}</dd></div><div><dt>Attribut</dt><dd>${escapeHtml(ATTRIBUTE_LABELS[profile.attribute] || profile.attribute || '—')}</dd></div><div><dt>Niveau</dt><dd>${escapeHtml(formatTokenAtlasStat(profile.level))}</dd></div><div><dt>ATK</dt><dd>${escapeHtml(formatTokenAtlasStat(profile.atk))}</dd></div><div><dt>DEF</dt><dd>${escapeHtml(formatTokenAtlasStat(profile.def))}</dd></div></dl>` : ''}<p class="token-atlas-code">${profile.cardId ? `Code de référence : ${escapeHtml(profile.cardId)}` : profile.physicalSetCode ? `Référence imprimée : ${escapeHtml(profile.physicalSetCode)}` : 'Présentation imprimée sans entrée de monstre native.'}</p><div class="token-atlas-reference">${art ? `<figure><img id="token-atlas-reference-image" src="${escapeHtml(art)}" alt="${escapeHtml(referenceLabel + ' : ' + profile.name)}" loading="lazy"><figcaption>${escapeHtml(referenceLabel)}</figcaption></figure>` : '<p>Illustration de référence indisponible dans cette collection.</p>'}${link ? `<a id="token-atlas-reference-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Voir la référence de cette présentation ↗</a>` : ''}</div>`;
    if (changed) this.dialogElement.querySelector('#token-atlas-retry').hidden = true;
    this.dialogElement.querySelector('.token-atlas-poses').hidden = commemorative;
    this.dialogElement.querySelectorAll('button[data-token-pose]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.tokenPose === this.pose)); button.disabled = !profile.modelAvailable || commemorative; });
    if (!profile.modelAvailable) { this.previewRequest++; this.previewLifecycle.hide(); this.dialogElement.querySelector('#token-atlas-preview-status').textContent = ''; }
    else if (this.visible) this._showPreview();
  }

  _setPreviewState(state) {
    this.previewState = state;
    const status = this.dialogElement.querySelector('#token-atlas-preview-status');
    if (status) status.textContent = state === 'loading' ? 'Chargement du modèle…' : '';
    this.dialogElement.querySelectorAll('.token-atlas-rotation-buttons button').forEach(button => { button.disabled = state !== 'ready'; });
    if (state === 'ready') this.previewLifecycle.preview?.setPose(this.pose);
  }

  async _showPreview() {
    if (this.disposed || !this.visible) return;
    const profile = getTokenPresentationProfile(this.selectedId);
    if (!profile?.modelAvailable) return;
    const request = ++this.previewRequest;
    this.dialogElement.querySelector('#token-atlas-retry').hidden = true;
    if (profile.modelKind === 'duelist-avatar') {
      this._setPreviewState('loading');
      try {
        const module = await import('./TokenModelAtlasPreview.js');
        await module.prepareTokenAtlasPresentation(profile.presentationId);
      } catch {
        if (request === this.previewRequest && this.visible && this.selectedId === profile.presentationId) this._previewUnavailable();
        return;
      }
      if (request !== this.previewRequest || this.disposed || !this.visible || this.selectedId !== profile.presentationId) return;
    }
    const ready = await this.previewLifecycle.show({ id: profile.presentationId, presentationId: profile.presentationId }, this.previewHost);
    if (ready && request === this.previewRequest && !this.disposed && this.visible && this.selectedId === profile.presentationId) this._setPreviewState('ready');
  }

  _previewUnavailable() {
    if (this.disposed || !this.visible) return;
    this.previewLifecycle.hide();
    this.previewRequest++;
    this.dialogElement.querySelector('#token-atlas-preview-status').textContent = 'La vue 3D est indisponible sur cet appareil. Les références et les propriétés restent consultables.';
    this.dialogElement.querySelector('#token-atlas-retry').hidden = false;
  }

  setPose(pose) {
    if (this.disposed || getTokenPresentationProfile(this.selectedId)?.modelKind === 'duelist-avatar' || !['attack', 'defense'].includes(pose)) return;
    this.pose = pose;
    this.dialogElement.querySelectorAll('button[data-token-pose]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tokenPose === pose)));
    this.previewLifecycle.preview?.setPose(pose);
  }

  open({ cardId, presentationId } = {}) {
    if (this.disposed) return;
    this.returnFocus = this.dialogElement.ownerDocument.activeElement;
    this.query = '';
    this.kind = 'all';
    this.race = 'all';
    this.attribute = 'all';
    const requested = getTokenPresentationProfile(presentationId) || TOKEN_PRESENTATION_CATALOG.find(profile => String(profile.cardId) === String(cardId) && profile.kind === 'duel');
    if (requested) this.selectedId = requested.presentationId;
    const index = TOKEN_PRESENTATION_CATALOG.findIndex(profile => profile.presentationId === this.selectedId);
    this.page = Math.max(0, Math.floor(index / TOKEN_ATLAS_PAGE_SIZE));
    this.visible = true;
    this.render();
    if (this.openDialog) this.openDialog(this.dialogElement, this.searchElement);
    else { this.dialogElement.classList.remove('hidden'); this.dialogElement.hidden = false; this.searchElement.focus(); }
    this._showPreview();
  }

  close() {
    if (this.disposed) return;
    this.visible = false;
    this.previewRequest++;
    this.previewLifecycle.hide();
    if (this.closeDialog) this.closeDialog(this.dialogElement);
    else { this.dialogElement.classList.add('hidden'); if (this.returnFocus?.isConnected) this.returnFocus.focus(); }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.visible = false;
    this.previewRequest++;
    this.previewLifecycle.dispose();
    this.dialogObserver?.disconnect();
    for (const [event, handler] of [['click', this._onClick], ['input', this._onInput], ['change', this._onChange], ['token-atlas-preview-unavailable', this._onUnavailable], ['keydown', this._onKey]]) this.dialogElement.removeEventListener(event, handler);
  }
}
