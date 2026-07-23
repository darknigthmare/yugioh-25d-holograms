/**
 * TurnEngine handles TCG turn setup, starting hands, first turn exceptions
 * (no draw on first turn, no battle phase), and phase state machine transitions.
 */
export class TurnEngine {
  constructor() {
    this.startingLifePoints = 8000;
    this.startingHandSize = 5;
    this.handLimit = 6;
  }

  /**
   * Draw starting hands of 5 cards for each player.
   * This is done before the first turn starts.
   */
  drawStartingHands(game) {
    for (let i = 0; i < this.startingHandSize; i++) {
      if (game.playerDeck.length > 0) {
        const card = game.playerDeck.pop();
        card.location = 'hand';
        game.playerHand.push(card);
      }
      if (game.opponentDeck.length > 0) {
        const card = game.opponentDeck.pop();
        card.location = 'hand';
        game.opponentHand.push(card);
      }
    }
    game.log("Mains de départ de 5 cartes piochées pour les deux duellistes.", "system");
  }

  /**
   * Determine if the active player should draw a card during the Draw Phase.
   * Modern rule: The starting player does not draw on the first turn of the duel.
   */
  shouldDrawOnDrawPhase(turnCount, isFirstPlayer) {
    if (turnCount === 1 && isFirstPlayer) {
      return false;
    }
    return true;
  }

  /**
   * Validate if entering Battle Phase is legal.
   * Rule: No Battle Phase on the first turn of the duel.
   */
  isBattlePhaseLegal(turnCount) {
    return turnCount > 1;
  }

  /**
   * Discards cards down to hand limit (6 cards) at the end of the turn.
   */
  enforceHandLimit(game, playerId) {
    const hand = playerId === 'player' ? game.playerHand : game.opponentHand;
    if (hand.length > this.handLimit) {
      const discardCount = hand.length - this.handLimit;
      game.log(`${playerId === 'player' ? 'Vous défaussez' : "L'adversaire défausse"} ${discardCount} carte(s) pour respecter la limite de main de ${this.handLimit}.`, "system");

      for (let i = 0; i < discardCount; i++) {
        const discarded = hand.pop();
        game.field.sendToGraveyard(discarded, playerId);
      }
    }
  }
}
