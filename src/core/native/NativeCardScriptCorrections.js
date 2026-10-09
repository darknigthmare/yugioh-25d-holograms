import { correctNativeDiceDungeonScript, NATIVE_DICE_DUNGEON_SCRIPT_CORRECTION } from './NativeDiceDungeonScriptCorrection.js';
import { correctNativeDuelTowerScript, NATIVE_DUEL_TOWER_SCRIPT_CORRECTION } from './NativeDuelTowerScriptCorrection.js';

// The archive stays original. Only these documented, hash-guarded sources are
// corrected when a normal synchronous reader supplies them to the native core.
export const NATIVE_CARD_SCRIPT_CORRECTIONS = Object.freeze([
  NATIVE_DICE_DUNGEON_SCRIPT_CORRECTION, NATIVE_DUEL_TOWER_SCRIPT_CORRECTION
]);
const transforms = new Map([
  [NATIVE_DICE_DUNGEON_SCRIPT_CORRECTION.filename, correctNativeDiceDungeonScript],
  [NATIVE_DUEL_TOWER_SCRIPT_CORRECTION.filename, correctNativeDuelTowerScript]
]);
export function getNativeCardScriptCorrection(name) {
  return NATIVE_CARD_SCRIPT_CORRECTIONS.find(entry => entry.filename === String(name).split('/').at(-1)) ?? null;
}
export function applyNativeCardScriptCorrections(name, source) {
  const transform = transforms.get(String(name).split('/').at(-1));
  return transform ? transform(source) : source;
}
