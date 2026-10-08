/** Presentation labels for authoritative native characteristics, not card rules. */
import { OcgType, OcgRace, OcgAttribute } from './vendor/ocgcore/index.js';

const compoundRaces = Object.freeze({
  WINGEDBEAST: 'Winged Beast', BEASTWARRIOR: 'Beast-Warrior', SEASERPENT: 'Sea Serpent',
  DIVINE: 'Divine-Beast', CREATORGOD: 'Creator-God', MAGICALKNIGHT: 'Magical Knight',
  HIGHDRAGON: 'High Dragon', OMEGAPSYCHIC: 'Omega Psychic', CELESTIALWARRIOR: 'Celestial Warrior'
});
const title = name => name.toLowerCase().replace(/(^|_)([a-z])/g, (_, separator, letter) => `${separator ? '-' : ''}${letter.toUpperCase()}`);

export function nativeCardKind(type) {
  return type & OcgType.MONSTER ? 'monster' : type & OcgType.SPELL ? 'spell' : type & OcgType.TRAP ? 'trap' : null;
}

export function nativeCardTypeLabel(type) {
  const kind = nativeCardKind(type);
  if (kind === 'spell') return 'Spell Card';
  if (kind === 'trap') return 'Trap Card';
  if (kind !== 'monster') return '';
  return `${['FUSION', 'RITUAL', 'SYNCHRO', 'XYZ', 'PENDULUM', 'LINK', 'TUNER', 'TOKEN', 'TRAPMONSTER', 'FLIP', 'SPIRIT', 'UNION', 'GEMINI', 'TOON', 'EFFECT', 'NORMAL']
    .filter(name => type & OcgType[name]).map(name => name === 'TRAPMONSTER' ? 'Trap' : title(name)).join(' ')} Monster`.trim();
}

function maskName(value, names, format) {
  if (value == null) return '';
  let mask;
  try { mask = BigInt(value); } catch { return ''; }
  const entries = Object.entries(names).filter(([, code]) => typeof code === 'number' || typeof code === 'bigint');
  const exact = entries.find(([, code]) => BigInt(code) === mask);
  if (exact) return format(exact[0]);
  return entries.filter(([, code]) => {
    const bit = BigInt(code);
    return bit > 0n && (bit & (bit - 1n)) === 0n && (mask & bit) !== 0n;
  }).map(([name]) => format(name)).join(' / ');
}

export const nativeRaceName = value => maskName(value, OcgRace, name => compoundRaces[name] || title(name));
export const nativeAttributeName = value => maskName(value, OcgAttribute, title);
