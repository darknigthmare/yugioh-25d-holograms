import { hasResolvedFieldSpellActivation } from './FieldSpellRules.js';

// These six original Field Spells affect both players. Their continuous
// effects are rules data; the visual environment registry never changes stats.
export const CLASSIC_FIELD_SPELLS = Object.freeze([
  ['59197169', 'Yami', 'Yami', ['Fiend', 'Spellcaster'], ['Fairy']],
  ['22702055', 'Umi', 'Umi', ['Fish', 'Sea Serpent', 'Thunder', 'Aqua'], ['Machine', 'Pyro']],
  ['87430998', 'Forêt', 'Forest', ['Insect', 'Beast', 'Plant', 'Beast-Warrior'], []],
  ['50913601', 'Montagne', 'Mountain', ['Dragon', 'Winged Beast', 'Thunder'], []],
  ['86318356', 'Sogen', 'Sogen', ['Warrior', 'Beast-Warrior'], []],
  ['23424603', 'Terre Dévastée', 'Wasteland', ['Dinosaur', 'Zombie', 'Rock'], []]
].map(([id, name, name_en, boostedRaces, weakenedRaces]) => Object.freeze({
  id, name, name_en,
  boostedRaces: Object.freeze(boostedRaces),
  weakenedRaces: Object.freeze(weakenedRaces)
})));

const byId = new Map(CLASSIC_FIELD_SPELLS.map(card => [card.id, card]));

export function getClassicFieldSpellModifier(monster, fieldSpell) {
  const definition = byId.get(String(fieldSpell?.id).replace(/^0+(?=\d)/, ''));
  if (!definition || !hasResolvedFieldSpellActivation(fieldSpell)
    || fieldSpell.effectNegated || fieldSpell.activationNegated
    || !monster || monster.card_type !== 'monster' || monster.isSetFaceDown
    || !['monster_zone', 'extra_monster_zone'].includes(monster.location)) {
    return { atk: 0, def: 0 };
  }
  const race = monster.currentRace || monster.race;
  const value = definition.boostedRaces.includes(race) ? 200
    : definition.weakenedRaces.includes(race) ? -200 : 0;
  return { atk: value, def: monster.getDef() === null ? 0 : value };
}
