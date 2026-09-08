/**
 * ChainEngine manages LIFO chain stack structures, priority windows, Spell Speeds,
 * and SEGOC simultaneous trigger collecting.
 */
export class ChainEngine {
  constructor() {
    this.nextChainId = 1;
    this.chainStack = [];
    this.chainStatus = 'idle'; // 'idle', 'building', 'resolving'
    this.triggerQueue = []; // Queued trigger events that occurred during chain resolutions
    this.priorityPlayerId = null;
    this.consecutivePasses = 0;
  }

  reset({ preserveSequence = false } = {}) {
    this.chainStack = [];
    this.chainStatus = 'idle';
    this.triggerQueue = [];
    this.priorityPlayerId = null;
    this.consecutivePasses = 0;
    this.activeChainId = null;
    if (!preserveSequence) this.nextChainId = 1;
  }

  getSpellSpeed(card) {
    if (!card) return 1;
    // Database cards use race for the Spell/Trap icon; local cards can use
    // composite types such as Quick-Play Spell instead.
    const type = String(card.type || '');
    const subtype = String(card.race || '');
    if (card.card_type === 'trap' || /trap/i.test(type)) {
      if (/counter/i.test(type) || /^counter$/i.test(subtype)) return 3;
      return 2;
    }
    if (card.card_type === 'spell' || /spell card|spell$/i.test(type)) {
      if (/quick-play/i.test(type) || /^quick-play$/i.test(subtype)) return 2;
      return 1;
    }
    // Monsters
    if (String(card.id) === '44508094') return 2; // Stardust Dragon
    if (card.desc && /quick effect|effet rapide/i.test(card.desc)) {
      return 2;
    }
    return 1;
  }

  canChain(card, lastLinkSpeed = 1) {
    if (this.chainStatus === 'resolving') return false;
    const cardSpeed = this.getSpellSpeed(card);
    if (lastLinkSpeed === 3) {
      return cardSpeed === 3; // Only Spell Speed 3 can chain to Spell Speed 3
    }
    return cardSpeed >= lastLinkSpeed && cardSpeed >= 2;
  }

  pushChainLink(activatingPlayerId, cardState, targets = [], options = {}) {
    // A monster can have both Trigger and Quick Effects. Scripted effects
    // identify their own speed instead of inheriting another effect's text.
    const linkSpeed = [1, 2, 3].includes(options.spellSpeed)
      ? options.spellSpeed
      : this.getSpellSpeed(cardState);
    if (this.chainStack.length === 0) {
      this.activeChainId = this.nextChainId;
      this.nextChainId += 1;
    }
    const linkId = this.chainStack.length + 1;

    const link = {
      id: linkId,
      chainId: this.activeChainId,
      key: `${this.activeChainId}:${linkId}`,
      activatingPlayerId,
      sourceCard: cardState,
      sourceRuntimeInstanceId: cardState?.runtimeInstanceId,
      sourceLocation: cardState?.location,
      spellSpeed: linkSpeed,
      targets: [...targets],
      targetInstances: targets.map(target => ({
        card: target,
        runtimeInstanceId: target?.runtimeInstanceId,
        location: target?.location
      })),
      resolver: typeof options.resolver === 'function' ? options.resolver : null,
      context: options.context || {},
      zoneIndex: options.zoneIndex ?? cardState?.zoneIndex ?? -1,
      activationNegated: false,
      effectNegated: false,
      resolvedSuccessfully: false,
      appliedAnything: false
    };

    link.requiresFaceUpSourceAtActivation = this.requiresFaceUpSource(link);
    this.chainStack.push(link);
    this.chainStatus = 'building';
    this.priorityPlayerId = activatingPlayerId === 'player' ? 'opponent' : 'player';
    this.consecutivePasses = 0;
    return link;
  }

  getLastLink() {
    return this.chainStack[this.chainStack.length - 1] || null;
  }

  getLastLinkSpeed() {
    return this.getLastLink()?.spellSpeed || 1;
  }

  isSourceStillSameInstance(link) {
    return Boolean(
      link?.sourceCard
      && link.sourceCard.runtimeInstanceId === link.sourceRuntimeInstanceId
      && link.sourceCard.location === link.sourceLocation
    );
  }

  requiresFaceUpSource(link) {
    if (typeof link?.requiresFaceUpSourceAtActivation === 'boolean') {
      return link.requiresFaceUpSourceAtActivation;
    }
    if (typeof link?.context?.requiresFaceUpSource === 'boolean') {
      return link.context.requiresFaceUpSource;
    }
    // Graveyard effects of a Continuous card do not inherit the requirement
    // for that card's effects activated on the field.
    if (!['spell_zone', 'pendulum_zone', 'field_zone'].includes(link?.sourceLocation)) {
      return false;
    }
    const card = link.sourceCard;
    return Boolean(
      card?.isPendulumScale
      || card?.isPendingPendulumActivation
      || card?.isFieldSpell
      || /continuous|equip|field/i.test(`${card?.type || ''} ${card?.race || ''}`)
    );
  }

  canResolveLink(link) {
    // Destruction is not negation. Persistent Spell/Trap effects, however,
    // need the same card instance to remain face-up at resolution.
    return Boolean(link) && (
      !this.requiresFaceUpSource(link)
      || (this.isSourceStillSameInstance(link) && !link.sourceCard.isSetFaceDown)
    );
  }

  openResponseWindow(priorityPlayerId) {
    this.chainStatus = 'building';
    this.priorityPlayerId = priorityPlayerId;
    this.consecutivePasses = 0;
  }

  passPriority(playerId) {
    if (this.chainStatus !== 'building' || playerId !== this.priorityPlayerId) return false;
    this.consecutivePasses += 1;
    this.priorityPlayerId = playerId === 'player' ? 'opponent' : 'player';
    if (this.consecutivePasses >= 2) {
      this.chainStatus = 'ready';
      this.priorityPlayerId = null;
      return true;
    }
    return false;
  }

  closeResponseWindow() {
    this.chainStatus = this.chainStack.length > 0 ? 'ready' : 'idle';
    this.priorityPlayerId = null;
    this.consecutivePasses = 0;
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
