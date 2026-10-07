import { getFieldSpellCoverageSummary, filterFieldSpellCoverage } from './FieldSpellCoverage.js';
import { getFieldEnvironmentForCardId } from './FieldEnvironmentRegistry.js';

const PAGE_SIZE = 12;

export class FieldSpellAtlas {
  constructor(dialog, { engine = 'native' } = {}) {
    this.dialog = dialog;
    this.engine = engine;
    this.page = 0;
    this.selectedId = null;
    this.preview = null;
    this.generation = 0;
    this.visible = false;
    this.query = dialog.querySelector('#field-atlas-search');
    this.filter = dialog.querySelector('#field-atlas-filter');
    this.query.addEventListener('input', () => { this.page = 0; this.render(); });
    this.filter.addEventListener('change', () => { this.page = 0; this.render(); });
    dialog.querySelector('#field-atlas-prev').addEventListener('click', () => { this.page--; this.render(); });
    dialog.querySelector('#field-atlas-next').addEventListener('click', () => { this.page++; this.render(); });
    dialog.querySelectorAll('[data-atlas-angle]').forEach(button => button.addEventListener('click', () => {
      this.preview?.setAngle(Number(button.dataset.atlasAngle));
    }));
  }

  open() {
    this.visible = true;
    const count = getFieldSpellCoverageSummary();
    const effects = this.engine === 'native'
      ? `${count.nativeAvailable} effets disponibles · ${count.nativeEffectTested} Terrains vérifiés en scénarios`
      : `${count.implementedRules} effets jouables`;
    this.dialog.querySelector('#field-atlas-summary').textContent = `${count.total} Terrains · ${count.sourceArt} illustrations originales · ${count.inspectedGeometry} décors étudiés · ${effects}`;
    const playableOption = this.filter.querySelector?.('option[value="playable"]');
    if (playableOption) playableOption.textContent = this.engine === 'native' ? 'Effets disponibles' : 'Effets jouables';
    this.render();
  }

  close() {
    this.visible = false;
    this.generation++;
    this.preview?.dispose();
    this.preview = null;
  }

  render() {
    const cards = filterFieldSpellCoverage({ query: this.query.value, status: this.filter.value, engine: this.engine });
    const pages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
    this.page = Math.max(0, Math.min(pages - 1, this.page));
    const visible = cards.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);
    const list = this.dialog.querySelector('#field-atlas-list');
    list.replaceChildren();
    this.dialog.querySelector('#field-atlas-results').textContent = `${cards.length} Terrain${cards.length > 1 ? 's' : ''} · page ${this.page + 1}/${pages}`;
    this.dialog.querySelector('#field-atlas-prev').disabled = this.page === 0;
    this.dialog.querySelector('#field-atlas-next').disabled = this.page === pages - 1;
    visible.forEach(card => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'field-atlas-card';
      button.dataset.fieldId = card.cardId;
      button.setAttribute('aria-pressed', String(card.cardId === this.selectedId));
      const image = document.createElement('img');
      image.src = card.sourceArtUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.width = 160;
      image.height = 160;
      const name = document.createElement('strong');
      name.textContent = card.name;
      const status = document.createElement('span');
      const available = this.engine === 'native' ? card.nativeGameplayAvailable : card.gameplayImplemented;
      status.textContent = available ? (this.engine === 'native' ? 'Effet disponible' : 'Effet jouable') : 'Effet à intégrer';
      status.className = available ? 'atlas-playable' : 'atlas-pending';
      button.append(image, name, status);
      button.addEventListener('click', () => void this.select(card));
      list.append(button);
    });
    if (!visible.some(card => card.cardId === this.selectedId)) {
      if (visible[0]) void this.select(visible[0]);
      else this.clearSelection();
    } else if (!this.preview && this.visible) {
      void this.select(visible.find(card => card.cardId === this.selectedId));
    }
  }

  clearSelection() {
    this.generation++;
    this.selectedId = null;
    this.preview?.dispose();
    this.preview = null;
    this.dialog.querySelector('#field-atlas-detail').hidden = true;
    this.dialog.querySelector('#field-atlas-empty').hidden = false;
  }

  async select(card) {
    this.selectedId = card.cardId;
    const generation = ++this.generation;
    this.dialog.querySelector('#field-atlas-detail').hidden = false;
    this.dialog.querySelector('#field-atlas-empty').hidden = true;
    this.dialog.querySelectorAll('[data-field-id]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.fieldId === card.cardId)));
    this.dialog.querySelector('#field-atlas-name').textContent = card.name;
    this.dialog.querySelector('#field-atlas-passcode').textContent = `Passcode ${card.cardId.padStart(8, '0')}`;
    this.dialog.querySelector('#field-atlas-publication').textContent = card.publication
      ? `${card.publication.formats.join(' / ')} · ${card.publication.status === 'announced' ? 'Sortie annoncée' : 'Publié le'} ${card.publication.regionalReleaseDates?.TCG_EU || card.publication.releaseDate}` : '';
    const image = this.dialog.querySelector('#field-atlas-source');
    image.src = card.sourceArtUrl;
    image.alt = `Illustration originale de ${card.name}`;
    this.dialog.querySelector('#field-atlas-model-status').textContent = card.hasSourceReconstructedGeometry
      ? 'Volumes reconstruits depuis l’illustration ; dimensions et placement adaptés au plateau.'
      : card.hasInspectedGeometry ? 'Illustration étudiée ; interprétation 3D adaptée au plateau.'
      : card.hasDedicatedGeometry ? 'Première silhouette dédiée ; détails à compléter depuis l’illustration.' : 'Décor de famille ; reconstruction dédiée à réaliser.';
    this.dialog.querySelector('#field-atlas-rule-status').textContent = this.engine === 'native'
      ? card.nativeGameplayAvailable
        ? `Pris en charge par le moteur natif ; initialisation vérifiée.${card.nativeEffectTested ? ' Effet vérifié en scénario.' : ' Scénarios d’effets à compléter.'}`
        : 'Effet à intégrer au moteur de duel'
      : card.gameplayImplemented ? 'Effet intégré au mode strict' : 'Effet à intégrer au moteur de duel';
    this.dialog.querySelector('#field-atlas-effect').textContent = card.rulesText || card.effectText;
    const link = this.dialog.querySelector('#field-atlas-rules-link');
    const rulesSourceUrl = card.rulesSourceUrl || (this.engine === 'native' ? card.nativeRulesSourceUrl : null);
    link.hidden = !rulesSourceUrl;
    link.textContent = card.rulesSourceUrl ? 'Texte officiel Konami' : 'Source de l’effet — Project Ignis';
    if (rulesSourceUrl) link.href = rulesSourceUrl;
    this.preview?.dispose();
    this.preview = null;
    const container = this.dialog.querySelector('#field-atlas-canvas');
    container.replaceChildren();
    this.dialog.querySelector('#field-atlas-preview-status').textContent = 'Chargement du décor…';
    try {
      const { FieldSpellAtlasPreview } = await import('./FieldSpellAtlasPreview.js');
      if (generation !== this.generation || !this.visible) return;
      this.preview = new FieldSpellAtlasPreview(container, getFieldEnvironmentForCardId(card.cardId));
      this.dialog.querySelector('#field-atlas-preview-status').textContent = 'Vue 3D : glissez pour tourner ou choisissez un angle.';
    } catch {
      if (generation === this.generation && this.visible) {
        this.dialog.querySelector('#field-atlas-preview-status').textContent = 'La vue 3D est indisponible ici. L’illustration et les règles restent consultables.';
      }
    }
  }
}
