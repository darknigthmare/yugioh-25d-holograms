/**
 * PhaseEngine manages turns, phases flow, and detailed sub-steps of the Damage Step.
 */
export class PhaseEngine {
  constructor() {
    this.currentTurnOwner = 'player'; // 'player' or 'opponent'
    this.currentPhase = 'draw'; // 'draw', 'standby', 'main1', 'battle', 'main2', 'end'
    this.turnCount = 1;

    // Detailed Battle Phase sub-state machine
    this.battleStep = 'none'; // 'none', 'start', 'battle_step', 'damage_step', 'end_step'
    this.damageStepSubPhase = 'none'; // 'none', 'start', 'before_calc', 'calc', 'after_calc', 'end'

    // Priority State Machine
    this.priorityState = 'OPEN_GAME_STATE';

    // Detailed Battle State Machine
    this.battleState = 'BATTLE_STEP_OPEN';
  }

  reset() {
    this.currentTurnOwner = 'player';
    this.currentPhase = 'draw';
    this.turnCount = 1;
    this.battleStep = 'none';
    this.damageStepSubPhase = 'none';
    this.priorityState = 'OPEN_GAME_STATE';
    this.battleState = 'BATTLE_STEP_OPEN';
  }

  nextPhase() {
    const cycle = ['draw', 'standby', 'main1', 'battle', 'main2', 'end'];
    const idx = cycle.indexOf(this.currentPhase);

    if (idx === -1 || this.currentPhase === 'end') {
      this.currentPhase = 'draw';
      this.currentTurnOwner = this.currentTurnOwner === 'player' ? 'opponent' : 'player';
      this.turnCount++;
    } else {
      // The starting player's first turn has neither Battle Phase nor Main
      // Phase 2 (Main Phase 2 is available only after a Battle Phase).
      this.currentPhase = this.currentPhase === 'main1' && this.turnCount === 1
        ? 'end'
        : cycle[idx + 1];
    }

    // Reset Battle sub-states on phase switch
    if (this.currentPhase !== 'battle') {
      this.battleStep = 'none';
      this.damageStepSubPhase = 'none';
    } else {
      this.battleStep = 'start';
    }
    this.priorityState = 'OPEN_GAME_STATE';
    this.battleState = 'BATTLE_STEP_OPEN';

    return {
      phase: this.currentPhase,
      turn: this.currentTurnOwner,
      turnCount: this.turnCount
    };
  }

  /**
   * Advances the Battle Step
   */
  setBattleStep(step) {
    this.battleStep = step; // 'start', 'battle_step', 'damage_step', 'end_step'
    if (step !== 'damage_step') {
      this.damageStepSubPhase = 'none';
    }
  }

  /**
   * Sub-phases of the Damage Step:
   * 1. start (Start of Damage Step)
   * 2. before_calc (Before Damage Calculation)
   * 3. calc (Damage Calculation)
   * 4. after_calc (After Damage Calculation)
   * 5. end (End of Damage Step)
   */
  setDamageStepSubPhase(subPhase) {
    this.damageStepSubPhase = subPhase;
  }
}
