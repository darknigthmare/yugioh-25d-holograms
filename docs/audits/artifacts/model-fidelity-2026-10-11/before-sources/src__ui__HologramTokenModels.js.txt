import * as THREE from 'three';
import { buildTokenBotanicalAnatomy } from './HologramTokenBotanicalModels.js';
import { buildTokenCreatureAnatomy } from './HologramTokenCreatureModels.js';
import { buildTokenConstructAnatomy } from './HologramTokenConstructModels.js';
import { buildTokenSpiritAnatomy } from './HologramTokenSpiritModels.js';
import { buildTokenIllustratedExceptions } from './HologramTokenIllustratedExceptions.js';

/** Anatomies accepted by the dedicated Token renderer, independent of duel state. */
export const TOKEN_RENDER_ANATOMIES = Object.freeze([
  'sheep','lamb','hippo','ojama','kuriboh','raccoon','beast','flower','seed','ivy','maize',
  'ant','mantis','spider','beetle','worm','aircraft','gadget','gear','tank','cyber-orb',
  'cyber-polyhedron','clock','network','warrior','fairy','zombie','fiend','serpent',
  'dragon','fish','slime','ice','rock','flame','spirit','unknown-echo','primal-being',
  'block','egg','cloud','avian',
]);

/**
 * Build once into HologramMonsterModels' owned geometry/material buckets.
 * Profiles are canonical public visual metadata; no card text, names, duel
 * state, statistics or passcode-derived random variation are consulted here.
 * Returns false for non-Token profiles; true for every supported Token anatomy.
 */
export function buildTokenMonsterAnatomy(profile, helpers) {
  if (profile?.family !== 'token') return false;
  if (buildTokenBotanicalAnatomy(profile, helpers)
      || buildTokenCreatureAnatomy(profile, helpers)
      || buildTokenIllustratedExceptions(profile, helpers)
      || buildTokenSpiritAnatomy(profile, helpers)
      || buildTokenConstructAnatomy(profile, helpers)) return true;
  // Unknown/copy Tokens have no verified creature identity. A neutral echo
  // deliberately does not claim to reproduce an unavailable card artwork.
  const { part, sphere, rod, ring } = helpers;
  const color = '#9bb6c1';
  part('token-unknown-neutral-echo', new THREE.OctahedronGeometry(.54), 'body', [0,1.49,0], [.78,1.25,.78], undefined, color);
  ring('token-unknown-echo-orbit', 'accent', [0,1.49,0], .83, [Math.PI/2,.35,0], .026, '#d5e5ec');
  for (const side of [-1,1]) {
    rod(`token-unknown-echo-shard-${side}`, 'glow', [side*.57,1.73,-.06], [side*.77,2.03,-.06], .027, .016, '#c7dce3');
    sphere(`token-unknown-echo-light-${side}`, 'eye', [side*.73,1.1,.03], [.045,.045,.045], 1, '#ecf4f7');
  }
  return true;
}
