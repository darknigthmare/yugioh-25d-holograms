/**
 * EffectEngine manages PSCT effect categories, conjunction resolution pipelines (then, also, and, and if you do),
 * Hard Once Per Turn (HOPT) restrictions, lingering durations, and immunity checking.
 */
export class EffectEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.hoptRegistry = {}; // key (cardName_turnCount) -> boolean (used)
    this.duelHoptRegistry = {}; // key (cardName) -> boolean (used in duel)
    this.lingeringEffects = []; // list of active temporary/lingering modifiers
    this.activeRestrictions = []; // list of restriction filters (e.g. "only summon Dragons")
  }

  // --- HOPT & OPT TRACKING ---
  usageKey(cardName, { playerId = 'player', effectId = 'shared' } = {}) {
    return JSON.stringify([playerId, String(cardName), effectId]);
  }

  registerHOPT(cardName, turnCount, scope = {}) {
    const key = `${this.usageKey(cardName, scope)}_turn_${turnCount}`;
    this.hoptRegistry[key] = true;
  }

  hasUsedHOPT(cardName, turnCount, scope = {}) {
    const key = `${this.usageKey(cardName, scope)}_turn_${turnCount}`;
    return !!this.hoptRegistry[key];
  }

  registerOncePerDuel(cardName, scope = {}) {
    this.duelHoptRegistry[this.usageKey(cardName, scope)] = true;
  }

  hasUsedOncePerDuel(cardName, scope = {}) {
    return !!this.duelHoptRegistry[this.usageKey(cardName, scope)];
  }

  // --- PSCT CONJUNCTION RESOLUTION PIPELINE ---
  /**
   * Processes two sub-effects A and B based on the conjunction rule:
   * - "THEN" (A then B): Sequential. B happens only if A succeeds.
   * - "AND_IF_YOU_DO" (A and if you do, B): Simultaneous timing but B depends on A's success.
   * - "ALSO" (A also B): Simultaneous. Both happen independently.
   * - "AND" (A and B): Simultaneous. Both happen, both are dependent.
   *
   * @param {string} conjunctionType - 'THEN' | 'AND_IF_YOU_DO' | 'ALSO' | 'AND'
   * @param {Function} resolveA - Function returning boolean (success of A)
   * @param {Function} resolveB - Function returning boolean (success of B)
   * @param {object} options - AND requires pure canResolveA/canResolveB checks.
   * @returns {boolean} Whether any part of the effect was applied
   */
  resolveConjunction(conjunctionType, resolveA, resolveB, options = {}) {
    // AND is all-or-nothing. Side-effecting resolvers cannot be called to
    // discover legality after the first action has already changed the duel.
    // Card scripts must provide pure preflight checks for this conjunction.
    if (conjunctionType === 'AND') {
      if (typeof options.canResolveA !== 'function' || typeof options.canResolveB !== 'function') {
        throw new TypeError('AND requires canResolveA and canResolveB preflight checks');
      }
      if (!options.canResolveA() || !options.canResolveB()) return false;
      const successA = resolveA();
      const successB = resolveB();
      return Boolean(successA && successB);
    }
    const successA = resolveA();

    switch (conjunctionType) {
      case 'THEN':
      case 'AND_IF_YOU_DO':
        if (successA) {
          resolveB();
          return true; // A still applied even if B became impossible.
        }
        return false;

      case 'ALSO':
      case 'ALSO_AFTER_THAT':
        const successBAlso = resolveB();
        return successA || successBAlso;

      default:
        return successA;
    }
  }

  // --- LINGER AND RESTRICTION REGISTRATION ---
  addLingeringEffect(effect) {
    this.lingeringEffects.push(effect);
  }

  expireLingeringEffects(conditionType) {
    this.lingeringEffects = this.lingeringEffects.filter(eff => {
      return eff.expiration !== conditionType;
    });
  }

  addRestriction(restriction) {
    this.activeRestrictions.push(restriction);
  }

  checkRestrictions(actionType, details) {
    return this.activeRestrictions.every(rest => {
      if (rest.actionType !== actionType) return true;
      return rest.validate(details);
    });
  }
}
