/** Ephemeral local inspection, separate from public zones and combat visuals. */
export class PrivateCardInspection {
  constructor({ documentRef = globalThis.document, imageUrl = () => '', cardDetails = () => null } = {}) {
    this.documentRef = documentRef;
    this.imageUrl = imageUrl;
    this.cardDetails = cardDetails;
    this.panel = null;
    this.game = null;
    this.groupId = null;
    this.cards = [];
  }

  handle(event, game) {
    if (event?.type !== 'inspect') return false;
    // Authorize the native recipient before accessing any card property.
    // The owner of the inspected card can be either side of the duel.
    const controller = game?.playerController;
    if (event.private !== true || event.nativeAudienceConfirmed !== true
      || ![0, 1].includes(controller) || event.audienceController !== controller
      || typeof event.inspectionGroupId !== 'string'
      || !/^native-private-inspection-[1-9]\d*$/.test(event.inspectionGroupId)
      || game.winner || !this.documentRef?.body) return true;
    const card = event.card;
    if (!card) return true;
    const text = (value, limit) => String(value ?? '').slice(0, limit);
    const basic = Object.freeze({ id: text(card.id, 12), name: text(card.name, 160),
      type: text(card.type, 160), desc: text(card.desc, 8000),
      image_url: text(card.image_url, 2000) });
    if (!basic.name) return true;
    // Printed CDB details can enrich this authorized descriptor without a
    // native stat query or lookup of the hidden duel card instance.
    const details = this.cardDetails(basic, game);
    const printed = Object.freeze({ ...basic,
      desc: text(details?.desc ?? basic.desc, 8000),
      image_url: text(details?.image_url ?? basic.image_url, 2000) });
    if (this.game !== game || this.groupId !== event.inspectionGroupId) {
      this.clear();
      this.game = game;
      this.groupId = event.inspectionGroupId;
      this._createPanel();
    }
    this.cards.push(printed);
    this._appendCard(printed);
    this.count.textContent = `${this.cards.length} carte${this.cards.length === 1 ? '' : 's'} reçue${this.cards.length === 1 ? '' : 's'}.`;
    if (this.cards.length === 1) this._inspect(printed, this.list.firstElementChild.firstElementChild);
    return true;
  }

  _element(tag, className, text) {
    const element = this.documentRef.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  _createPanel() {
    const panel = this._element('section', 'private-card-inspection');
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'private-card-inspection-title');
    const header = this._element('div', 'private-card-inspection-header');
    const title = this._element('h2', '', 'Inspection privée');
    title.id = 'private-card-inspection-title';
    const close = this._element('button', 'private-card-inspection-close', 'Fermer');
    close.type = 'button';
    close.setAttribute('aria-label', 'Fermer l’inspection privée');
    close.addEventListener('click', () => this.clear());
    header.append(title, close);
    this.count = this._element('p', 'private-card-inspection-count');
    this.count.setAttribute('role', 'status');
    this.count.setAttribute('aria-live', 'polite');
    this.list = this._element('ul', 'private-card-inspection-list');
    this.list.setAttribute('aria-label', 'Cartes reçues pour cette inspection');
    this.details = this._element('div', 'private-card-inspection-details');
    panel.append(header, this.count, this.list, this.details);
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); this.clear(); }
    });
    this.documentRef.body.append(panel);
    this.panel = panel;
  }

  _appendCard(card) {
    const item = this._element('li');
    const button = this._element('button', 'private-card-inspection-card');
    button.type = 'button';
    button.setAttribute('aria-label', `${card.name}. Consulter ses détails dans cette inspection privée.`);
    button.setAttribute('aria-pressed', 'false');
    const image = this._element('img');
    image.alt = card.name;
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => {
      image.removeAttribute('src'); image.hidden = true;
    }, { once: true });
    const url = this.imageUrl(card);
    if (url) image.src = url;
    else image.hidden = true;
    button.append(image, this._element('span', '', card.name));
    button.addEventListener('click', () => this._inspect(card, button));
    item.append(button); this.list.append(item);
  }

  _inspect(card, button) {
    this.selectedButton?.setAttribute('aria-pressed', 'false');
    this.selectedButton = button;
    button.setAttribute('aria-pressed', 'true');
    this.details.replaceChildren(this._element('h3', '', card.name),
      this._element('p', 'private-card-inspection-type', card.type),
      this._element('p', 'private-card-inspection-description', card.desc));
  }

  clear() {
    // Removing nodes drops their images and listeners as well as every private
    // descriptor; no public inspector, log, storage or renderer is involved.
    this.panel?.remove();
    this.panel = this.count = this.list = this.details = this.selectedButton = null;
    this.game = this.groupId = null;
    this.cards = [];
  }
}
