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
  registerHOPT(cardName, turnCount) {
    const key = `${cardName}_turn_${turnCount}`;
    this.hoptRegistry[key] = true;
  }

  hasUsedHOPT(cardName, turnCount) {
    const key = `${cardName}_turn_${turnCount}`;
    return !!this.hoptRegistry[key];
  }

  registerOncePerDuel(cardName) {
    this.duelHoptRegistry[cardName] = true;
  }

  hasUsedOncePerDuel(cardName) {
    return !!this.duelHoptRegistry[cardName];
  }

  // --- PSCT CONJUNCTION RESOLUTION PIPELINE ---
  /**
   * Processes two sub-effects A and B based on the conjunction rule:
   * - "THEN" (A then B): Sequential. B happens only if A succeeds.
   * - "AND_IF_YOU_DO" (A and if you do, B): Simultaneous timing but B depends on A's success.
   * - "ALSO" (A also B): Sequential. Both happen independently.
   * - "AND" (A and B): Simultaneous. Both happen, both are dependent.
   *
   * @param {string} conjunctionType - 'THEN' | 'AND_IF_YOU_DO' | 'ALSO' | 'AND'
   * @param {Function} resolveA - Function returning boolean (success of A)
   * @param {Function} resolveB - Function returning boolean (success of B)
   * @returns {boolean} Combined success status
   */
  resolveConjunction(conjunctionType, resolveA, resolveB) {
    const successA = resolveA();

    switch (conjunctionType) {
      case 'THEN':
      case 'AND_IF_YOU_DO':
        if (successA) {
          return resolveB();
        }
        return false;

      case 'ALSO':
        const successBAlso = resolveB();
        return successA || successBAlso;

      case 'AND':
        const successBAnd = resolveB();
        return successA && successBAnd;

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
