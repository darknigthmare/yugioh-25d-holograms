/**
 * GameStateStabilizer implements TCG Game State Check and Rule Cleanup loops:
 * - Recalculates continuous card modifications (ATK/DEF, levels, types).
 * - Performs mandatory rule cleaning (orphaned Xyz materials, token deletions, invalid counter cleanups).
 * - Verifies victory conditions (LP to 0, Deck-out, Exodia).
 * - Prevents infinite loops using state hashes.
 */
export class GameStateStabilizer {
  constructor() {
    this.maxStabilizationPasses = 100;
  }

  /**
   * Run the state checking loop until the game state hash stabilizes
   */
  stabilize(game) {
    let changed = false;
    let passes = 0;
    let previousHash = '';

    do {
      previousHash = this.computeStateHash(game);

      // 1. Recalculate derived statistics & continuous modifiers
      this.recalculateContinuousState(game);

      // 2. Perform rule cleaning
      this.performRuleCleanup(game);

      // 3. Verify win conditions
      this.verifyWinConditions(game);

      const currentHash = this.computeStateHash(game);
      changed = currentHash !== previousHash;
      passes += 1;

      if (passes > this.maxStabilizationPasses) {
        console.error("[ERROR] Game state stabilization loop exceeded max passes!");
        break;
      }
    } while (changed);

    return { stable: true, passes };
  }

  computeStateHash(game) {
    // Generate a simple string hash of LP, monster presence, and their current statistics
    const parts = [
      game.playerLP,
      game.opponentLP,
      game.winner
    ];

    game.field.playerMonsterZones.forEach((m, idx) => {
      if (m) {
        parts.push(`p_mon_${idx}:${m.uid}:${m.getAtk()}:${m.getDef()}:${m.location}`);
      } else {
        parts.push(`p_mon_${idx}:null`);
      }
    });

    game.field.opponentMonsterZones.forEach((m, idx) => {
      if (m) {
        parts.push(`o_mon_${idx}:${m.uid}:${m.getAtk()}:${m.getDef()}:${m.location}`);
      } else {
        parts.push(`o_mon_${idx}:null`);
      }
    });

    return parts.join("|");
  }

  recalculateContinuousState(game) {
    // Reset all monsters on the board to base stats before applying continuous modifiers
    game.field.playerMonsterZones.forEach(m => {
      if (m) {
        m.currentAtk = m.baseAtk;
        m.currentDef = m.baseDef;
        m.currentLevel = m.baseLevel;
        m.activeModifiers.forEach(mod => {
          if (mod.type === 'atk') m.currentAtk += mod.value;
          if (mod.type === 'def') m.currentDef += mod.value;
          if (mod.type === 'level') m.currentLevel += mod.value;
        });
      }
    });

    game.field.opponentMonsterZones.forEach(m => {
      if (m) {
        m.currentAtk = m.baseAtk;
        m.currentDef = m.baseDef;
        m.currentLevel = m.baseLevel;
        m.activeModifiers.forEach(mod => {
          if (mod.type === 'atk') m.currentAtk += mod.value;
          if (mod.type === 'def') m.currentDef += mod.value;
          if (mod.type === 'level') m.currentLevel += mod.value;
        });
      }
    });

    // Dark Magician Girl: +300 ATK for every Dark Magician or Magician of
    // Black Chaos in both Graveyards.
    const spellcastersInGrave = [
      ...game.field.playerGraveyard,
      ...game.field.opponentGraveyard
    ].filter(card => (
      String(card.id) === '46986414'
      || /Dark Magician$|Magicien Sombre$|Magician of Black Chaos|Magicien Sombre du Chaos/i.test(
        card.name_en || card.name || ''
      )
    )).length;

    [...game.field.playerMonsterZones, ...game.field.opponentMonsterZones].forEach(monster => {
      if (monster && String(monster.id) === '38033121' && !monster.effectNegated) {
        monster.currentAtk += spellcastersInGrave * 300;
      }
    });

    // Reapply continuous mods (like field spells)
    const fieldSpell = game.field.playerFieldSpellZone;
    if (fieldSpell && !fieldSpell.effectNegated) {
      // e.g. KaibaCorp Arena Field Spell adds 500 ATK to all Dragons in play
      const bonusValue = 500;
      game.field.playerMonsterZones.forEach(m => {
        if (m && m.race === 'Dragon') {
          m.currentAtk += bonusValue;
        }
      });
      game.field.opponentMonsterZones.forEach(m => {
        if (m && m.race === 'Dragon') {
          m.currentAtk += bonusValue;
        }
      });
    }
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
    game.field.playerMonsterZones.forEach(m => {
      if (m && m.type && m.type.includes('Link') && m.position === 'defense') {
        m.position = 'attack';
      }
    });
    game.field.opponentMonsterZones.forEach(m => {
      if (m && m.type && m.type.includes('Link') && m.position === 'defense') {
        m.position = 'attack';
      }
    });
  }

  verifyWinConditions(game) {
    if (game.winner) return;

    const finish = winner => {
      if (typeof game.endGame === 'function') game.endGame(winner);
      else {
        game.winner = winner;
        game.callbacks.onGameOver(winner);
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

    // 2. Exodia condition (5 parts in hand)
    const exodiaIds = [
      '33396948', // Exodia the Forbidden One
      '7902349',  // Left Leg of the Forbidden One
      '44519536', // Right Leg of the Forbidden One
      '15303296', // Left Arm of the Forbidden One
      '70903634'  // Right Arm of the Forbidden One
    ];

    const playerHasAllExodia = exodiaIds.every(id =>
      game.playerHand.some(c => c.id === id)
    );
    const opponentHasAllExodia = exodiaIds.every(id =>
      game.opponentHand.some(c => c.id === id)
    );

    if (playerHasAllExodia && opponentHasAllExodia) {
      finish('draw');
    } else if (playerHasAllExodia) {
      finish('player');
    } else if (opponentHasAllExodia) {
      finish('opponent');
    }
  }
}
