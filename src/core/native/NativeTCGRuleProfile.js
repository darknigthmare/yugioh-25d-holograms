import { OcgDuelMode } from './vendor/ocgcore/index.js';

/** Current TCG procedures and simultaneous-trigger ordering. Keep this profile
 * shared by the bare WASM runtime and the browser facade: using MODE_MR5 alone
 * applies the modern board but does not enable the TCG SEGOC distinctions. */
export const NATIVE_TCG_DUEL_FLAGS = OcgDuelMode.MODE_MR5
  | OcgDuelMode.TCG_SEGOC_NONPUBLIC | OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER;

export const NATIVE_TCG_RULE_PROFILE = Object.freeze({
  format: 'TCG',
  masterRule: '2020-04-01',
  flags: NATIVE_TCG_DUEL_FLAGS,
  flagsNames: Object.freeze(['MODE_MR5', 'TCG_SEGOC_NONPUBLIC', 'TCG_SEGOC_FIRSTTRIGGER'])
});
