/**
 * DefensiveEngine implements TCG Restrictions, Negations, Protections, Immunités, and Event Replacements.
 * Keeps structural separation between:
 * - Prohibition: Action cannot be initiated.
 * - Activation Negation: Chain link is placed but canceled.
 * - Effect Negation: Resolution is canceled.
 * - Action Negation: Summon/Attack is canceled.
 * - Protection/Immunity: Target remains unaffected.
 * - Event Replacement: Alternative outcome substituted (e.g. detach material instead of destruction).
 */
export class DefensiveEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.restrictions = [];
    this.negatedCards = new Set();
    this.negatedChainLinks = new Set();
    this.protections = [];
    this.replacements = [];
  }

  // === RESTRICTIONS ===

  addRestriction(res) {
    this.restrictions.push({
      id: res.id || Math.random().toString(36).substring(7),
      playerId: res.playerId, // 'player' | 'opponent' | 'both'
      actionType: res.actionType, // 'SPECIAL_SUMMON' | 'DECLARE_ATTACK' | 'ACTIVATE_EFFECT'
      filter: res.filter || (() => true),
      expires: res.expires || 'turn_end'
    });
  }

  isActionProhibited(playerId, actionType, card = null) {
    return this.restrictions.some(res => {
      const matchPlayer = res.playerId === 'both' || res.playerId === playerId;
      const matchAction = res.actionType === actionType;
      const matchFilter = card ? res.filter(card) : true;
      return matchPlayer && matchAction && matchFilter;
    });
  }

  clearTurnRestrictions() {
    this.restrictions = this.restrictions.filter(res => res.expires !== 'turn_end');
  }

  // === NEGATIONS ===

  negateCard(cardUid) {
    this.negatedCards.add(cardUid);
  }

  isCardNegated(cardUid) {
    return this.negatedCards.has(cardUid);
  }

  clearCardNegation(cardUid) {
    this.negatedCards.delete(cardUid);
  }

  getChainLinkKey(linkOrId) {
    if (linkOrId && typeof linkOrId === 'object') {
      return linkOrId.key || `${linkOrId.chainId ?? 'legacy'}:${linkOrId.id}`;
    }
    return `legacy:${linkOrId}`;
  }

  negateChainLink(linkOrId) {
    this.negatedChainLinks.add(this.getChainLinkKey(linkOrId));
  }

  isChainLinkNegated(linkOrId) {
    return this.negatedChainLinks.has(this.getChainLinkKey(linkOrId));
  }

  clearChainNegations() {
    this.negatedChainLinks.clear();
  }

  // === PROTECTIONS ===

  addProtection(prot) {
    this.protections.push({
      id: prot.id || Math.random().toString(36).substring(7),
      cardUid: prot.cardUid,
      cardRuntimeInstanceId: prot.cardRuntimeInstanceId || prot.card?.runtimeInstanceId || null,
      sourceCardUid: prot.sourceCardUid || prot.sourceCard?.uid || prot.cardUid,
      sourceCard: prot.sourceCard || null,
      sourceRuntimeInstanceId: prot.sourceCard?.runtimeInstanceId || null,
      independentOfSource: prot.independentOfSource === true,
      type: prot.type, // 'DESTROY_BY_BATTLE' | 'DESTROY_BY_EFFECT' | 'TARGET'
      filter: prot.filter || (() => true)
    });
  }

  hasProtection(card, protectionType, context = {}) {
    if (!card) return false;
    return this.protections.some(prot => {
      const matchCard = prot.cardUid === card.uid;
      const matchType = prot.type === protectionType;
      const matchFilter = prot.filter(context);
      return matchCard && matchType && matchFilter && this.isDefenseEntryActive(prot, card);
    });
  }

  isDefenseEntryActive(entry, target) {
    if (entry.cardRuntimeInstanceId && entry.cardRuntimeInstanceId !== target.runtimeInstanceId) return false;
    // Negating the recipient does not remove protection applied by another
    // card. A resolved lingering effect can explicitly outlive its source.
    if (entry.independentOfSource) return true;
    const source = entry.sourceCard || (entry.sourceCardUid === target.uid ? target : null);
    if (this.isCardNegated(entry.sourceCardUid) || source?.effectNegated || source?.isSetFaceDown) return false;
    if (entry.sourceRuntimeInstanceId && source?.runtimeInstanceId !== entry.sourceRuntimeInstanceId) return false;
    return true;
  }

  removeProtectionsForCard(cardUid) {
    this.protections = this.protections.filter(p => p.cardUid !== cardUid);
  }

  // === REPLACEMENTS ===

  addReplacement(rep) {
    this.replacements.push({
      id: rep.id || Math.random().toString(36).substring(7),
      cardUid: rep.cardUid,
      cardRuntimeInstanceId: rep.cardRuntimeInstanceId || rep.card?.runtimeInstanceId || null,
      sourceCardUid: rep.sourceCardUid || rep.sourceCard?.uid || rep.cardUid,
      sourceCard: rep.sourceCard || null,
      sourceRuntimeInstanceId: rep.sourceCard?.runtimeInstanceId || null,
      independentOfSource: rep.independentOfSource === true,
      triggerType: rep.triggerType, // 'DESTROY'
      filter: rep.filter || (() => true),
      replaceFn: rep.replaceFn // function modifying the event state
    });
  }

  tryReplaceEvent(event) {
    if (event.replaced) return event;
    // Check if any active replacements match the target card and trigger type
    for (const rep of this.replacements) {
      if (event.type === rep.triggerType && event.targetCard && event.targetCard.uid === rep.cardUid) {
        if (!rep.filter(event) || !this.isDefenseEntryActive(rep, event.targetCard)) {
          continue;
        }

        const success = rep.replaceFn(event);
        if (success === true) {
          event.replaced = true;
          event.replacementSource = rep.id;
          return event;
        }
      }
    }
    return event;
  }

  removeReplacementsForCard(cardUid) {
    this.replacements = this.replacements.filter(r => r.cardUid !== cardUid);
  }
}
