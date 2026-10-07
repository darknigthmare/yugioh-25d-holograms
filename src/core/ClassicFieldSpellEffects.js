import { hasResolvedFieldSpellActivation } from './FieldSpellRules.js';

// These continuous Field Spells affect both players. Their effects are rules
// data; the visual environment registry never changes statistics.
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

// Exact French card text from the linked Konami database entries. Each effect
// is implemented explicitly, without inferring rules from its translated text.
export const ADDITIONAL_FIELD_SPELLS = Object.freeze([
  {
    id: '56594520', name: 'Puissance de Gaïa', name_en: 'Gaia Power',
    attribute: 'EARTH', konamiId: 4932,
    rulesText: "Tous les monstres TERRE gagnent 500 points d'ATK et perdent 400 points de DEF."
  },
  {
    id: '82999629', name: 'Umiiruka', name_en: 'Umiiruka',
    attribute: 'WATER', konamiId: 4933,
    rulesText: "Tous les monstres EAU gagnent 500 points d'ATK et perdent 400 points de DEF."
  },
  {
    id: '81777047', name: 'Éclat Lumineux', name_en: 'Luminous Spark',
    attribute: 'LIGHT', konamiId: 4936,
    rulesText: "Tous les monstres LUMIÈRE gagnent 500 points d'ATK et perdent 400 points de DEF."
  },
  {
    id: '18161786', name: 'Zone de Plasma Mystique', name_en: 'Mystic Plasma Zone',
    attribute: 'DARK', konamiId: 4937,
    rulesText: "Augmente l'ATK de tous les monstres TÉNÈBRES de 500 points et diminue leur DEF de 400 points."
  },
  {
    id: '45778932', name: "Courant d'Air Ascendant", name_en: 'Rising Air Current',
    attribute: 'WIND', konamiId: 4935,
    rulesText: "Tous les monstres VENT gagnent 500 points d'ATK et perdent 400 points de DEF."
  },
  {
    id: '19384334', name: 'Destruction de Lave', name_en: 'Molten Destruction',
    attribute: 'FIRE', konamiId: 4934,
    rulesText: "Tous les monstres FEU gagnent 500 points d'ATK et perdent 400 points de DEF."
  },
  {
    id: '81380218', name: 'Chœur du Sanctuaire', name_en: 'Chorus of Sanctuary',
    modifierKind: 'defense-position', konamiId: 4899,
    rulesText: 'Augmente la DEF de tous les monstres en Position de Défense de 500 points.'
  }
].map(definition => Object.freeze({
  modifierKind: 'attribute', atk: 500, def: -400,
  ...definition,
  ...(definition.modifierKind === 'defense-position' ? { atk: 0, def: 500 } : {}),
  rulesSourceUrl: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${definition.konamiId}&request_locale=fr`
})));

export const WETLANDS_FIELD_SPELL = Object.freeze({
  id: '2084239', name: 'Plaines Marécageuses', name_en: 'Wetlands',
  modifierKind: 'aqua-water-low-level', atk: 1200, def: 0,
  rulesText: "Tous les monstres Type Aqua/EAU/Niveau 2 ou moins gagnent 1200 points d'ATK.",
  rulesSourceUrl: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=7627&request_locale=fr'
});

// These effects require battle or activation/End Step processing. They are
// intentionally excluded from the permanent ATK/DEF modifier registry.
export const SCRIPTED_FIELD_SPELLS = Object.freeze([
  {
    id: '56433456', name: 'Le Sanctuaire Céleste', name_en: 'The Sanctuary in the Sky',
    effectCode: 'SANCTUARY_IN_THE_SKY', effectKind: 'battle-damage', konamiId: 5982,
    rulesText: "Les dommages de combat infligés au contrôleur d'un monstre Elfe d'un combat impliquant le monstre deviennent 0."
  },
  {
    id: '63035430', name: 'Gratte-Ciel', name_en: 'Skyscraper',
    effectCode: 'SKYSCRAPER', effectKind: 'damage-calculation', konamiId: 6399,
    rulesText: 'Si un monstre "HÉROS Élémentaire" attaque un monstre qui a une ATK supérieure, le monstre attaquant gagne 1000 ATK durant le calcul des dommages uniquement.'
  },
  {
    id: '87624166', name: 'Forêt Ancienne', name_en: 'Ancient Forest',
    effectCode: 'ANCIENT_FOREST', effectKind: 'activation-and-battle-end', konamiId: 8338,
    rulesText: "Lorsque vous activez cette carte, changez tous les monstres en Position de Défense en Position d'Attaque face recto. Les effets Flip ne sont pas activés à ce moment. Si un monstre attaque, détruisez-le à la fin de la Battle Phase de ce tour."
  }
].map(definition => Object.freeze({
  ...definition,
  rulesSourceUrl: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${definition.konamiId}&request_locale=fr`
})));

export const CONTINUOUS_FIELD_SPELLS = Object.freeze([
  ...CLASSIC_FIELD_SPELLS, ...ADDITIONAL_FIELD_SPELLS, WETLANDS_FIELD_SPELL
]);

export const IMPLEMENTED_FIELD_SPELLS = Object.freeze([
  ...CONTINUOUS_FIELD_SPELLS, ...SCRIPTED_FIELD_SPELLS
]);

const byId = new Map(CONTINUOUS_FIELD_SPELLS.map(card => [card.id, card]));

// Shared by the live continuous calculation and AI projections. A projection
// can describe a monster in hand without giving it a fake field activation.
export function getContinuousFieldSpellStatModifier(monster, definitionOrId) {
  const id = typeof definitionOrId === 'object' ? definitionOrId?.id : definitionOrId;
  const definition = byId.get(String(id).replace(/^0+(?=\d)/, ''));
  if (!definition || !monster) return { atk: 0, def: 0 };
  let atk = 0;
  let def = 0;
  if (definition.modifierKind === 'aqua-water-low-level') {
    const level = typeof monster.getLevel === 'function' ? monster.getLevel()
      : monster.currentLevel ?? monster.level ?? monster.baseLevel;
    const hasLevel = !['xyz', 'link'].includes(monster.extra_type)
      && !/\b(?:Xyz|Link)\b/i.test(monster.type || '');
    if (hasLevel && Number.isInteger(level) && level >= 1 && level <= 2
      && (monster.currentRace || monster.race) === 'Aqua'
      && (monster.currentAttribute || monster.attribute) === 'WATER') atk = definition.atk;
  } else if (definition.modifierKind === 'attribute') {
    if ((monster.currentAttribute || monster.attribute) === definition.attribute) {
      atk = definition.atk;
      def = definition.def;
    }
  } else if (definition.modifierKind === 'defense-position') {
    if (monster.position === 'defense') def = definition.def;
  } else {
    const race = monster.currentRace || monster.race;
    atk = definition.boostedRaces.includes(race) ? 200
      : definition.weakenedRaces.includes(race) ? -200 : 0;
    def = atk;
  }
  const hasNoDefense = monster.getDef?.() === null || monster.extra_type === 'link'
    || /\bLink\b/i.test(monster.type || '') || monster.def === null;
  return { atk, def: hasNoDefense ? 0 : def };
}

export function getClassicFieldSpellModifier(monster, fieldSpell) {
  if (!hasResolvedFieldSpellActivation(fieldSpell)
    || fieldSpell.effectNegated || fieldSpell.activationNegated
    || !monster || monster.card_type !== 'monster' || monster.isSetFaceDown
    || !['monster_zone', 'extra_monster_zone'].includes(monster.location)) {
    return { atk: 0, def: 0 };
  }
  return getContinuousFieldSpellStatModifier(monster, fieldSpell);
}
