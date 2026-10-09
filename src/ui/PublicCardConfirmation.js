import { PrivateCardInspection } from './PrivateCardInspection.js';

/** Display only source-authorized native public confirmations, never a slot. */
export class PublicCardConfirmation extends PrivateCardInspection {
  handle(event, game) {
    if (event?.type !== 'reveal') return false;
    // Test authorization before any card getters or printed-data lookup.
    if (event.private === true || event.publicReveal !== true
      || event.nativeConfirmationConfirmed !== true
      || typeof event.confirmationGroupId !== 'string'
      || !/^native-public-confirmation-[1-9]\d*$/.test(event.confirmationGroupId)
      || game?.engine !== 'ocgcore-wasm' || game.winner || !this.documentRef?.body) return false;
    this._receive(event.card, game, event.confirmationGroupId);
    return true;
  }

  _createPanel() {
    super._createPanel();
    this.panel.classList.add('public-card-confirmation');
    this.panel.setAttribute('aria-labelledby', 'public-card-confirmation-title');
    const header = this.panel.firstElementChild;
    header.firstElementChild.id = 'public-card-confirmation-title';
    header.firstElementChild.textContent = 'Cartes révélées';
    header.children[1].setAttribute('aria-label', 'Fermer les cartes révélées');
    this.list.setAttribute('aria-label', 'Cartes publiquement révélées par cet effet');
  }

  _appendCard(card) {
    super._appendCard(card);
    this.list.lastElementChild.firstElementChild.setAttribute('aria-label',
      `${card.name}. Consulter les détails de cette carte révélée.`);
  }
}
