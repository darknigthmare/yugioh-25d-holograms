/** Public protocol bookkeeping only. The native core still owns every rule,
 * attack permission, replay response, calculation and victory condition. */
const PHASES = Object.freeze({
  1: ['draw', null, 'Draw Phase'], 2: ['standby', null, 'Standby Phase'],
  4: ['main1', null, 'Main Phase 1'], 8: ['battle', 'start', 'Battle Phase · Start Step'],
  16: ['battle', 'battle', 'Battle Phase · Battle Step'],
  32: ['battle', 'damage', 'Battle Phase · Damage Step'],
  64: ['battle', 'damage-calculation', 'Battle Phase · Damage Calculation'],
  128: ['battle', 'end', 'Battle Phase · End Step'],
  256: ['main2', null, 'Main Phase 2'], 512: ['end', null, 'End Phase']
});

export function nativePhasePresentation(phase) {
  if (!Number.isInteger(phase)) return null;
  const entry = PHASES[phase];
  return entry ? Object.freeze({ phase: entry[0], battleStep: entry[1], label: entry[2], nativePhase: phase }) : null;
}

export function nativeVictoryPresentation(message, playerController = 0) {
  if (message?.type !== 5 || ![0, 1, 2].includes(message.player)
    || !Number.isInteger(message.reason) || message.reason < 0 || message.reason > 255
    || ![0, 1].includes(playerController)) return null;
  const winner = message.player === 2 ? 'draw' : message.player === playerController ? 'player' : 'opponent';
  const reasons = { 1: ['lp_zero', 'Points de Vie épuisés'], 2: ['deck_out', 'Pioche impossible'],
    3: ['surrender', 'Abandon'], 16: ['exodia', 'Exodia assemblé'] };
  const [reason, label] = reasons[message.reason] ?? ['native_effect', 'Condition de victoire d’un effet'];
  return Object.freeze({ winner, reason, label, nativeReason: message.reason,
    nativeWinner: message.player, nativeVictoryConfirmed: true });
}

const attackerKey = loc => loc && [0, 1].includes(loc.controller) && loc.location === 4
  && Number.isInteger(loc.sequence) && loc.sequence >= 0 && loc.sequence <= 6
  ? `${loc.controller}:${loc.location}:${loc.sequence}` : null;

export function createNativeBattleLifecycle() {
  return { attackSequence: 0, activeAttacker: null, activeAttackId: null,
    battleCommandAvailable: false, activeCommandWindow: false,
    replayOffered: false, replayCount: 0, damageStepActive: false,
    phase: null, battleStep: null, ended: false };
}

/** Observe the exact decoded API 11 stream, including prompts. Optional replay
 * uses SELECT_YESNO description 30. Must-attack effects bypass that question;
 * their second MSG_ATTACK belongs to the same native command window before
 * Damage Step. Same zone without that native boundary never proves a replay. */
export function observeNativeBattleLifecycle(state, message) {
  const msg = message ?? {};
  const result = {};
  if (state.ended) return result;
  if (msg.type === 5 && !nativeVictoryPresentation(msg)) return result;
  if (msg.type === 40) {
    state.activeAttacker = state.activeAttackId = null;
    state.replayOffered = state.damageStepActive = false;
    state.battleCommandAvailable = state.activeCommandWindow = false;
    state.replayCount = 0;
    state.phase = state.battleStep = null;
  } else if (msg.type === 41) {
    const phase = nativePhasePresentation(msg.phase);
    if (phase) {
      state.phase = phase.phase; state.battleStep = phase.battleStep;
      result.phase = phase;
      if (phase.phase !== 'battle') {
        state.activeAttacker = state.activeAttackId = null;
        state.replayOffered = state.damageStepActive = false;
        state.battleCommandAvailable = state.activeCommandWindow = false;
      }
    }
  } else if (msg.type === 13 && (msg.description === 30n || msg.description === 30) && state.activeAttacker) {
    state.replayOffered = true;
    result.replayOffered = true;
    result.attackId = state.activeAttackId;
  } else if (msg.type === 110) {
    const key = attackerKey(msg.card);
    if (key) {
      const replay = (state.replayOffered || state.activeCommandWindow)
        && key === state.activeAttacker && !state.damageStepActive;
      if (!replay) {
        state.activeAttackId = `native-public-attack-${++state.attackSequence}`;
        state.replayCount = 0;
        state.activeCommandWindow = state.battleCommandAvailable;
      } else state.replayCount += 1;
      state.battleCommandAvailable = false;
      state.activeAttacker = key; state.replayOffered = false;
      result.attackId = state.activeAttackId; result.replayed = replay; result.replayCount = state.replayCount;
    }
  } else if (msg.type === 113) {
    state.damageStepActive = true; state.battleStep = 'damage';
    result.battleStep = 'damage'; result.evidence = 'DAMAGE_STEP_START';
  } else if (msg.type === 111 && state.damageStepActive) {
    state.battleStep = 'damage-calculation';
    result.battleStep = 'damage-calculation'; result.evidence = 'BATTLE';
  } else if ([10, 11, 112, 114, 5].includes(msg.type)) {
    if (state.activeAttacker && !state.damageStepActive && [10, 11].includes(msg.type)) {
      result.attackStopped = true;
      result.replayOffered = state.replayOffered;
      result.attackId = state.activeAttackId;
    }
    state.activeAttacker = state.activeAttackId = null;
    state.replayOffered = state.damageStepActive = false;
    state.activeCommandWindow = false;
    state.battleCommandAvailable = msg.type === 10;
    if (msg.type === 10 || msg.type === 114) {
      state.battleStep = 'battle'; result.battleStep = 'battle';
      result.evidence = msg.type === 10 ? 'SELECT_BATTLECMD' : 'DAMAGE_STEP_END';
    }
    if (msg.type === 5) { state.ended = true; result.victoryConfirmed = true; }
  }
  return Object.freeze(result);
}
