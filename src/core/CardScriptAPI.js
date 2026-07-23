/**
 * CardScriptAPI implements TCG Card Script, declarative effect pipelines,
 * pure check modes (preventing mutations during validations), and ruling overrides.
 */
export class CardScriptAPI {
  constructor() {
    this.scriptsRegistry = new Map();
    this.rulingOverrides = new Map();
  }

  /**
   * Register a card script module containing its effects
   */
  registerScript(cardId, scriptModule) {
    this.scriptsRegistry.set(cardId, scriptModule);
  }

  getScript(cardId) {
    return this.scriptsRegistry.get(cardId);
  }

  /**
   * Apply a ruling override to modify default properties of an effect/card
   */
  registerRulingOverride(overrideId, details) {
    this.rulingOverrides.set(overrideId, details);
  }

  getRulingOverride(overrideId) {
    return this.rulingOverrides.get(overrideId);
  }

  /**
   * Safely check if a cost or condition is payable/satisfied.
   * Runs the check function and enforces no side-effects (read-only verification).
   */
  safeCheck(checkFn, gameContext) {
    const beforeState = this.snapshotState(gameContext);
    const result = checkFn(gameContext);
    const afterState = this.snapshotState(gameContext);

    if (beforeState !== afterState) {
      throw new Error("Impure check detected: Condition or Cost modified game state during validation pass.");
    }

    return result;
  }

  snapshotState(game) {
    // Generate a simple read-only signature of game state properties
    return JSON.stringify({
      playerLP: game.playerLP,
      opponentLP: game.opponentLP,
      pHand: game.playerHand.map(c => c.uid),
      oHand: game.opponentHand.map(c => c.uid),
      pMonsters: game.field.playerMonsterZones.map(m => m ? m.uid : null),
      oMonsters: game.field.opponentMonsterZones.map(m => m ? m.uid : null),
      pGraveyard: game.field.playerGraveyard.map(c => c.uid),
      oGraveyard: game.field.opponentGraveyard.map(c => c.uid),
    });
  }

  // === PSCT CONJUNCTION PIPELINES ===

  /**
   * THEN conjunction: B is resolved only if A resolved successfully.
   */
  executeThen(opA, opB, game) {
    const successA = opA(game);
    if (successA) {
      return opB(game);
    }
    return false;
  }

  /**
   * AND_IF_YOU_DO conjunction: B depends on A success, but they are considered simultaneous.
   */
  executeAndIfYouDo(opA, opB, game) {
    const successA = opA(game);
    if (successA) {
      return opB(game);
    }
    return false;
  }

  /**
   * ALSO conjunction: both A and B are resolved independently.
   */
  executeAlso(opA, opB, game) {
    const successA = opA(game);
    const successB = opB(game);
    return successA || successB;
  }
}
