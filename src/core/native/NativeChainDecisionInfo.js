/** Display the window reported by the core, without deriving legal effects from
 * printed cards or reading private identities. Hints describe a timing window;
 * only the core's offered selections decide what may be activated in it. */
const TIMINGS = Object.freeze([
  [0x4000, 'Calcul des dommages'], [0x2000, 'Damage Step'],
  [0x1000, 'Déclaration d’attaque'], [0x100, 'Après une Invocation Flip'],
  [0x80, 'Après une Invocation Spéciale'], [0x40, 'Après une Invocation Normale'],
  [0x8000, 'Après la résolution de la Chaîne'], [0x20, 'End Phase'],
  [0x4, 'Fin de la Main Phase'], [0x2, 'Standby Phase'], [0x1, 'Draw Phase']
]);

export function nativeChainDecisionInfo(prompt) {
  const mask = Number.isSafeInteger(prompt?.hint_timing) ? prompt.hint_timing >>> 0 : 0;
  const windowLabel = TIMINGS.find(([bit]) => (mask & bit) !== 0)?.[1] ?? '';
  const forced = prompt?.forced === true;
  const count = Array.isArray(prompt?.selects) ? prompt.selects.length : 0;
  const description = forced
    ? 'Cet effet est obligatoire. Choisissez le prochain effet à ajouter à la Chaîne. Les Maillons se résolvent dans l’ordre inverse de leur activation.'
    : 'Activez un effet proposé ou passez la priorité à l’autre joueur. Les Maillons se résolvent dans l’ordre inverse de leur activation.';
  return Object.freeze({ forced, count, windowLabel,
    title: forced ? 'PLACER UN EFFET OBLIGATOIRE' : 'RÉPONDRE À LA CHAÎNE',
    description: windowLabel ? `${windowLabel} — ${description}` : description });
}
