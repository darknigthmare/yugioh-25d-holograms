/**
 * ChainEngine manages LIFO chain stack structures, priority windows, Spell Speeds,
 * and SEGOC simultaneous trigger collecting.
 */
export class ChainEngine {
  constructor() {
    this.chainStack = [];
    this.chainStatus = 'idle'; // 'idle', 'building', 'resolving'
    this.triggerQueue = []; // Queued trigger events that occurred during chain resolutions
  }

  reset() {
    this.chainStack = [];
    this.chainStatus = 'idle';
    this.triggerQueue = [];
  }

  getSpellSpeed(card) {
    if (!card) return 1;
    if (card.card_type === 'trap') {
      if (card.type && card.type.includes('Counter')) return 3;
      return 2;
    }
    if (card.card_type === 'spell') {
      if (card.type && card.type.includes('Quick-Play')) return 2;
      return 1;
    }
    // Monsters
    if (card.desc && card.desc.toLowerCase().includes('quick effect')) {
      return 2;
    }
    return 1;
  }

  canChain(card, lastLinkSpeed = 1) {
    const cardSpeed = this.getSpellSpeed(card);
    if (lastLinkSpeed === 3) {
      return cardSpeed === 3; // Only Spell Speed 3 can chain to Spell Speed 3
    }
    return cardSpeed >= lastLinkSpeed && cardSpeed >= 2;
  }

  pushChainLink(activatingPlayerId, cardState, targets = []) {
    const linkSpeed = this.getSpellSpeed(cardState);
    const linkId = this.chainStack.length + 1;

    const link = {
      id: linkId,
      activatingPlayerId,
      sourceCard: cardState,
      spellSpeed: linkSpeed,
      targets: [...targets],
      activationNegated: false,
      effectNegated: false,
      resolvedSuccessfully: false,
      appliedAnything: false
    };

    this.chainStack.push(link);
    this.chainStatus = 'building';
    return link;
  }

  queueTriggeredEvent(event) {
    this.triggerQueue.push(event);
  }

  /**
   * SEGOC (Simultaneous Effects Go On Chain)
   * Groups trigger candidates based on TCG rules order:
   * 1. Active player mandatory
   * 2. Non-active player mandatory
   * 3. Active player optional
   * 4. Non-active player optional
   */
  resolveSEGOC(candidates, activePlayerId) {
    const activePlayerMandatory = [];
    const nonActivePlayerMandatory = [];
    const activePlayerOptional = [];
    const nonActivePlayerOptional = [];

    candidates.forEach(cand => {
      const isControllerActive = cand.controllerId === activePlayerId;
      if (cand.mandatory) {
        if (isControllerActive) activePlayerMandatory.push(cand);
        else nonActivePlayerMandatory.push(cand);
      } else {
        if (isControllerActive) activePlayerOptional.push(cand);
        else nonActivePlayerOptional.push(cand);
      }
    });

    // Concatenate according to priorities
    return [
      ...activePlayerMandatory,
      ...nonActivePlayerMandatory,
      ...activePlayerOptional,
      ...nonActivePlayerOptional
    ];
  }

  canActivateInDamageStep(effect, timing) {
    if (!effect || !effect.timing) return false;
    if (!effect.timing.usableInDamageStep) return false;
    if (!effect.timing.allowedDamageTimings || !effect.timing.allowedDamageTimings.includes(timing)) return false;
    if (effect.timing.atkDefModifier && timing === "DURING_DAMAGE_CALCULATION" && !effect.textExplicitlyAllowsDamageCalculation) {
      return false;
    }
    return true;
  }
}
