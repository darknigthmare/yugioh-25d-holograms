import { nativeSourceSha256 } from './NativeSourceIntegrity.js';

/** The upstream archive remains byte-exact. This documented correction is
 * applied only to the pinned Lua source returned by the normal script reader. */
export const NATIVE_DICE_DUNGEON_SCRIPT_CORRECTION = Object.freeze({
  cardId: 11808215,
  filename: 'c11808215.lua',
  upstreamSha256: 'bdabb87f4746b36edb8a88d6e5620e426cc97e4317a67439faa120e55466c86e',
  correctedSha256: 'ec1b64aa682d4ff098fcc3ef8239eece2a03a479511e79006fdee09cd6c6832c',
  upstreamBytes: 2948,
  correctedBytes: 2992,
  reason: 'Each player applies their own die result. The upstream script assigns the turn player\'s result to the Field controller when those players differ.',
  scope: 'Swap the two already-rolled results when turn_p differs from tp; preserve the native RNG calls, roll messages, target groups and End Phase resets.'
});

export function correctNativeDiceDungeonScript(source) {
  if (typeof source !== 'string') throw new TypeError('Dice Dungeon Lua must be a string');
  const provenance=NATIVE_DICE_DUNGEON_SCRIPT_CORRECTION;
  if (nativeSourceSha256(source)!==provenance.upstreamSha256) {
    throw new Error('Dice Dungeon correction requires its exact pinned upstream Lua');
  }
  const anchor='\tlocal res2=Duel.TossDice(1-turn_p,1)\n';
  const corrected=source.replace(anchor,`${anchor}\tif turn_p~=tp then res1,res2=res2,res1 end\n`);
  if (nativeSourceSha256(corrected)!==provenance.correctedSha256) {
    throw new Error('Dice Dungeon effective Lua does not match correction provenance');
  }
  return corrected;
}
