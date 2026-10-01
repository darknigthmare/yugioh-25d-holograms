import { hasResolvedFieldSpellActivation } from './FieldSpellRules.js';
import { getClassicFieldSpellModifier } from './ClassicFieldSpellEffects.js';

/**
 * GameStateStabilizer implements TCG Game State Check and Rule Cleanup loops:
 * - Recalculates continuous card modifications (ATK/DEF, levels, types).
 * - Performs mandatory rule cleaning for stale Token entries and Link positions.
 * - Verifies LP and Exodia victories (failed draws are handled by DuelGame).
 * - Prevents infinite loops using state hashes.
 */
const DARK_MAGICIAN_GIRL_GRAVE_IDS = new Set([
  '46986414', // Dark Magician
  '30208479' // Magician of Black Chaos
]);

const DARK_MAGICIAN_GIRL_GRAVE_ALIASES = new Set([
  'dark magician',
  'magicien sombre',
  'magician of black chaos',
  'magicien du chaos sombre'
]);

function normalizeExactCardAlias(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr');
}

function normalizeCardPasscode(value) {
  // Database imports may use a number or the printed eight-digit passcode.
  // Preserve exact identity instead of coercing malformed values to numbers.
  const passcode = String(value ?? '').trim();
  return /^\d{1,8}$/.test(passcode) ? passcode.replace(/^0+(?=\d)/, '') : null;
}

function countsForDarkMagicianGirl(card) {
  if (DARK_MAGICIAN_GIRL_GRAVE_IDS.has(String(card?.id))) return true;
  return [card?.name_en, card?.name]
    .map(normalizeExactCardAlias)
    .some(name => DARK_MAGICIAN_GIRL_GRAVE_ALIASES.has(name));
}

export class GameStateStabilizer {
  constructor() {
    this.maxStabilizationPasses = 100;
  }

  /**
   * Run the state checking loop until the game state hash stabilizes
   */
  stabilize(game) {
    let passes = 0;
    const observedStates = new Set();

    while (passes < this.maxStabilizationPasses) {
      const previousHash = this.computeStateHash(game);
      if (observedStates.has(previousHash)) {
        return { stable: false, passes, reason: 'repeated-state' };
      }
      observedStates.add(previousHash);

      // 1. Recalculate derived statistics & continuous modifiers
      this.recalculateContinuousState(game);

      // 2. Perform rule cleaning
      this.performRuleCleanup(game);

      // 3. Verify win conditions
      this.verifyWinConditions(game);

      const currentHash = this.computeStateHash(game);
      passes += 1;
      if (currentHash === previousHash) return { stable: true, passes };
    }
    return { stable: false, passes, reason: 'pass-limit' };
  }

  getFieldMonsters(game) {
    return [
      ...game.field.playerMonsterZones,
      ...game.field.opponentMonsterZones,
      ...(game.field.extraMonsterZones || []).map(entry => entry?.card)
    ].filter(Boolean);
  }

  computeStateHash(game) {
    // Include the shared Extra Monster Zones and cleanup state; changes there
    // must drive another recalculation pass just like Main Zone changes.
    const parts = [
      game.playerLP,
      game.opponentLP,
      game.winner
    ];

    this.getFieldMonsters(game).forEach(m => {
      parts.push([
        m.uid, m.runtimeInstanceId, m.getAtk(), m.getDef(), m.getLevel(),
        m.location, m.zoneIndex, m.controllerId, m.position, m.isSetFaceDown,
        m.effectNegated, JSON.stringify(m.counters || {})
      ].join(':'));
    });
    for (const side of ['player', 'opponent']) {
      for (const key of ['Graveyard', 'Banished', 'FaceUpExtraDeck']) {
        parts.push((game.field[`${side}${key}`] || []).map(card => card.uid).join(','));
      }
      parts.push((game[`${side}Hand`] || []).map(card => card.uid).join(','));
    }

    return parts.join("|");
  }

  recalculateContinuousState(game) {
    // Both Main and Extra Monster Zones share exactly the same modifier rules.
    const monsters = this.getFieldMonsters(game);
    monsters.forEach(m => {
      m.currentAtk = m.baseAtk;
      m.currentDef = m.baseDef;
      m.currentLevel = m.baseLevel;
      m.currentAttribute = m.attribute;
      m.currentRace = m.race;
      if (m.isSetFaceDown) return;
      (m.activeModifiers || []).forEach(mod => {
        const ownEffect = [String(m.uid), String(m.id)].includes(String(mod.sourceCardId));
        if (m.effectNegated && mod.requiresSourceEffectActive && ownEffect) return;
        if (mod.type === 'atk') m.currentAtk += mod.value;
        if (mod.type === 'def') m.currentDef += mod.value;
        if (mod.type === 'level') m.currentLevel += mod.value;
        if (mod.type === 'attribute') m.currentAttribute = mod.value;
        if (mod.type === 'race') m.currentRace = mod.value;
      });
    });

    const fieldSpells = [game.field.playerFieldSpellZone, game.field.opponentFieldSpellZone]
      .filter(card => card && !card.isSetFaceDown && !card.effectNegated
        && hasResolvedFieldSpellActivation(card));
    monsters.filter(monster => !monster.isSetFaceDown).forEach(monster => {
      fieldSpells.forEach(fieldSpell => {
        const modifier = getClassicFieldSpellModifier(monster, fieldSpell);
        if (!modifier) return;
        monster.currentAtk += modifier.atk;
        monster.currentDef += modifier.def;
      });
    });

    // Dark Magician Girl: +300 ATK for every Dark Magician or Magician of
    // Black Chaos in both Graveyards.
    const spellcastersInGrave = [
      ...game.field.playerGraveyard,
      ...game.field.opponentGraveyard
    ].filter(countsForDarkMagicianGirl).length;

    monsters.forEach(monster => {
      if (String(monster.id) === '38033121' && !monster.isSetFaceDown && !monster.effectNegated) {
        monster.currentAtk += spellcastersInGrave * 300;
      }
    });

  }

  performRuleCleanup(game) {
    // 1. Tokens cease to exist when outside the monster zone
    game.field.playerMonsterZones.forEach((m, idx) => {
      if (m && m.isToken && m.location !== 'monster_zone') {
        game.field.setMonsterZone('player', idx, null);
      }
    });
    game.field.opponentMonsterZones.forEach((m, idx) => {
      if (m && m.isToken && m.location !== 'monster_zone') {
        game.field.setMonsterZone('opponent', idx, null);
      }
    });

    // 2. Link monsters can never be in defense position
    this.getFieldMonsters(game).forEach(m => {
      if (m.type && m.type.includes('Link')) {
        m.position = 'attack';
        m.isSetFaceDown = false;
      }
    });
  }

  verifyWinConditions(game) {
    if (game.winner) return;

    const finish = (winner, reason = 'lp_zero') => {
      if (typeof game.endGame === 'function') game.endGame(winner, reason);
      else {
        game.winner = winner;
        game.callbacks?.onGameOver?.(winner);
      }
    };

    // 1. LP verification
    if (game.playerLP <= 0 && game.opponentLP <= 0) {
      finish('draw');
    } else if (game.playerLP <= 0) {
      finish('opponent');
    } else if (game.opponentLP <= 0) {
      finish('player');
    }
    if (game.winner) return;

    // An effect that draws and then discards must finish before Exodia is
    // checked. LP defeat above still applies immediately during resolution.
    if (game.isResolvingEffect) return;

    // 2. Exodia condition (5 parts in hand)
    const exodiaIds = [
      '33396948', // Exodia the Forbidden One
      '7902349',  // Left Leg of the Forbidden One
      '44519536', // Right Leg of the Forbidden One
      '15303296', // Left Arm of the Forbidden One
      '70903634'  // Right Arm of the Forbidden One
    ];

    const playerPasscodes = new Set(game.playerHand.map(card => normalizeCardPasscode(card.id)));
    const opponentPasscodes = new Set(game.opponentHand.map(card => normalizeCardPasscode(card.id)));
    const playerHasAllExodia = exodiaIds.every(id => playerPasscodes.has(id));
    const opponentHasAllExodia = exodiaIds.every(id => opponentPasscodes.has(id));

    if (playerHasAllExodia && opponentHasAllExodia) {
      finish('draw', 'exodia');
    } else if (playerHasAllExodia) {
      finish('player', 'exodia');
    } else if (opponentHasAllExodia) {
      finish('opponent', 'exodia');
    }
  }
}
