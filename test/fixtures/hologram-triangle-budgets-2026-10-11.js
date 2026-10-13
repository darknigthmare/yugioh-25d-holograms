// Measured from HEAD 1371c5ba679d336f5df478720e6f9c4265d08e9d before this modeling wave.
// Original 72-row measurement SHA256: db4ce7a50cc0be92ee0e9766b71106e49f011bfe1955152de17d43b1baf122a0
// Curved geometry may grow to five times its actual previous per-card, per-pose budget.
export const HOLOGRAM_TRIANGLE_BASELINE = Object.freeze({
  '5053103': Object.freeze({ attack: 5088, defense: 5656 }),
  '10000000': Object.freeze({ attack: 2672, defense: 3240 }),
  '10000010': Object.freeze({ attack: 3764, defense: 4332 }),
  '10000020': Object.freeze({ attack: 2992, defense: 3560 }),
  '13039848': Object.freeze({ attack: 1820, defense: 2388 }),
  '14558127': Object.freeze({ attack: 3000, defense: 3568 }),
  '15025844': Object.freeze({ attack: 4752, defense: 5320 }),
  '20721928': Object.freeze({ attack: 3868, defense: 4436 }),
  '23995346': Object.freeze({ attack: 4882, defense: 5450 }),
  '26202165': Object.freeze({ attack: 1988, defense: 2556 }),
  '26905245': Object.freeze({ attack: 4700, defense: 5268 }),
  '28279543': Object.freeze({ attack: 4820, defense: 5388 }),
  '28649820': Object.freeze({ attack: 5980, defense: 6548 }),
  '31560081': Object.freeze({ attack: 4044, defense: 4612 }),
  '32452818': Object.freeze({ attack: 4052, defense: 4620 }),
  '38033121': Object.freeze({ attack: 4692, defense: 5260 }),
  '39552864': Object.freeze({ attack: 1940, defense: 2508 }),
  '40640057': Object.freeze({ attack: 1776, defense: 2344 }),
  '44508094': Object.freeze({ attack: 3834, defense: 4402 }),
  '46986414': Object.freeze({ attack: 4544, defense: 5112 }),
  '54652250': Object.freeze({ attack: 3136, defense: 3704 }),
  '63977008': Object.freeze({ attack: 2356, defense: 2924 }),
  '66602787': Object.freeze({ attack: 5288, defense: 5856 }),
  '68638985': Object.freeze({ attack: 2748, defense: 3316 }),
  '70095154': Object.freeze({ attack: 2596, defense: 3164 }),
  '70781052': Object.freeze({ attack: 3270, defense: 3838 }),
  '71625222': Object.freeze({ attack: 1500, defense: 2068 }),
  '72989439': Object.freeze({ attack: 3396, defense: 3964 }),
  '74677422': Object.freeze({ attack: 4520, defense: 5088 }),
  '77637979': Object.freeze({ attack: 4278, defense: 4846 }),
  '84013237': Object.freeze({ attack: 3176, defense: 3744 }),
  '88819587': Object.freeze({ attack: 3834, defense: 4402 }),
  '89631139': Object.freeze({ attack: 4160, defense: 4728 }),
  '89943723': Object.freeze({ attack: 2760, defense: 3328 }),
  '91152256': Object.freeze({ attack: 2016, defense: 2584 }),
  '97590747': Object.freeze({ attack: 4744, defense: 5312 }),
});

export function getHologramTriangleBudget(id, { defense = false } = {}) {
  const code = String(id).replace(/^0+(?=\d)/, '');
  const baseline = HOLOGRAM_TRIANGLE_BASELINE[code];
  if (!baseline) throw new RangeError(`No measured triangle baseline for ${code}`);
  return baseline[defense ? 'defense' : 'attack'] * 5;
}
