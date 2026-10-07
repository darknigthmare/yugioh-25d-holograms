import { hasResolvedFieldSpellActivation } from './FieldSpellRules.js';

const CLASSIC_RULE_TEXT = {
  '59197169': [4341, 'Tous les monstres Démon et Magicien sur le Terrain gagnent 200 ATK/DEF, et aussi, tous les monstres Elfe sur le Terrain perdent 200 ATK/DEF.'],
  '22702055': [4340, 'Tous les monstres Poisson, Serpent de Mer, Tonnerre ou Aqua sur le Terrain gagnent 200 ATK/DEF, et aussi, tous les monstres Machine et Pyro sur le Terrain perdent 200 ATK/DEF.'],
  '87430998': [4336, 'Tous les monstres Insecte/Bête/Plante/Bête-Guerrier sur le Terrain gagnent 200 ATK/DEF.'],
  '50913601': [4338, 'Tous les monstres Dragon, Bête Ailée et Tonnerre sur le Terrain gagnent 200 ATK/DEF.'],
  '86318356': [4339, 'Tous les monstres Guerrier et Bête-Guerrier sur le Terrain gagnent 200 ATK/DEF.'],
  '23424603': [4337, 'Tous les monstres Dinosaure, Zombie et Rocher sur le Terrain gagnent 200 ATK/DEF.']
};

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
  konamiId: CLASSIC_RULE_TEXT[id][0],
  rulesText: CLASSIC_RULE_TEXT[id][1],
  rulesSourceUrl: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${CLASSIC_RULE_TEXT[id][0]}&request_locale=fr`,
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

export const TRANSVERSE_CONTINUOUS_FIELD_SPELLS = Object.freeze([
  {
    id: '295517', name: 'Océan Légendaire', name_en: 'A Legendary Ocean',
    modifierKind: 'attribute', attribute: 'WATER', atk: 200, def: 200,
    levelModifier: -1, permanentName: 'Umi', konamiId: 5387,
    rulesText: '(Cette carte est toujours traitée comme "Umi".)\nTous les monstres EAU sur le Terrain gagnent 200 ATK/DEF. Réduisez le Niveau de tous les monstres EAU dans la main de chaque joueur et sur le Terrain de 1.'
  },
  {
    id: '73787254', name: 'Chambre Forte du Sabre', name_en: 'Saber Vault',
    modifierKind: 'x-saber-level', konamiId: 9032,
    rulesText: 'Chaque monstre "Sabre X" face recto sur le Terrain gagne 100 points d\'ATK x son Niveau, et perd 100 points de DEF x son Niveau.'
  },
  {
    id: '78082039', name: 'Forêt Interdite', name_en: 'Closed Forest',
    modifierKind: 'own-beast-graveyard', effectCode: 'CLOSED_FOREST', konamiId: 8585,
    rulesText: 'Tous les monstres de Type Bête que vous contrôlez gagnent 100 ATK pour chaque monstre dans votre Cimetière. Les Cartes Magie de Terrain ne peuvent pas être activées. Les Cartes Magie de Terrain ne peuvent pas être activées durant le tour où cette carte est détruite.'
  },
  {
    id: '10080320', name: 'Monde Jurassique', name_en: 'Jurassic World',
    modifierKind: 'race', race: 'Dinosaur', atk: 300, def: 300, konamiId: 6823,
    rulesText: 'Tous les monstres de Type Dinosaure gagnent 300 ATK/DEF.'
  },
  {
    id: '35956022', name: "Pluie d'Acide", name_en: 'Acidic Downpour',
    modifierKind: 'attribute', attribute: 'EARTH', atk: -500, def: 400, konamiId: 7457,
    rulesText: "Tous les monstres TERRE perdent 500 points d'ATK et gagnent 400 points de DEF."
  },
  {
    id: '81231742', name: 'Mur de Magie Enchanteur', name_en: 'Sorcerous Spell Wall',
    modifierKind: 'own-turn', konamiId: 11146,
    rulesText: 'Durant votre tour uniquement, tous les monstres que vous contrôlez gagnent 300 ATK. Durant le tour de votre adversaire uniquement, tous les monstres que vous contrôlez gagnent 300 DEF.'
  }
].map(definition => Object.freeze({
  ...definition,
  rulesSourceUrl: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${definition.konamiId}&request_locale=fr`
})));

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
  },
  {
    id: '4064256', name: 'Monde Zombie', name_en: 'Zombie World',
    effectCode: 'ZOMBIE_WORLD', effectKind: 'type-and-tribute', konamiId: 7857,
    rulesText: 'Tous les monstres sur le Terrain et dans les Cimetières deviennent des monstres Zombie. Aucun joueur ne peut Invoquer par Sacrifice de monstres (monstres Zombie exclus).'
  },
  {
    id: '68462976', name: 'Village Secret des Magiciens', name_en: 'Secret Village of the Spellcasters',
    effectCode: 'SECRET_VILLAGE', effectKind: 'spell-activation', konamiId: 7916,
    rulesText: 'Si vous seul contrôlez un monstre Magicien, votre adversaire ne peut pas activer de Cartes Magie. Si vous ne contrôlez aucun monstre Magicien, vous ne pouvez pas activer de Cartes Magie.'
  },
  {
    id: '92481084', name: "Temple de l'Oeil de l'Esprit", name_en: "Temple of the Mind's Eye",
    effectCode: 'TEMPLE_MINDS_EYE', effectKind: 'battle-damage', konamiId: 13280,
    rulesText: 'Les dommages de combat reçus par un joueur deviennent 1000.'
  },
  {
    id: '28120197', name: 'Canyon', name_en: 'Canyon',
    effectCode: 'CANYON', effectKind: 'battle-damage', konamiId: 6642,
    rulesText: 'Si un monstre de Type Rocher en Position de Défense est attaqué, doublez tous les dommages de combat que le contrôleur du monstre attaquant reçoit.'
  },
  {
    id: '11102908', name: 'Château de Brume de Shien', name_en: "Shien's Castle of Mist",
    effectCode: 'SHIENS_CASTLE_MIST', effectKind: 'damage-calculation', konamiId: 7003,
    rulesText: 'Lorsqu\'un monstre "Six Samouraïs" est attaqué, le monstre attaquant perd 500 points d\'ATK durant le calcul des dommages uniquement.'
  },
  {
    id: '53527835', name: 'Ville Ténébreuse', name_en: 'Dark City',
    effectCode: 'DARK_CITY', effectKind: 'damage-calculation', konamiId: 6758,
    rulesText: 'Si un monstre "HÉROS de la Destinée" attaque un monstre avec une ATK supérieure, le monstre attaquant gagne 1000 ATK durant le calcul des dommages uniquement.'
  }
].map(definition => Object.freeze({
  ...definition,
  rulesSourceUrl: `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=${definition.konamiId}&request_locale=fr`
})));

export const CONTINUOUS_FIELD_SPELLS = Object.freeze([
  ...CLASSIC_FIELD_SPELLS, ...ADDITIONAL_FIELD_SPELLS, WETLANDS_FIELD_SPELL,
  ...TRANSVERSE_CONTINUOUS_FIELD_SPELLS
]);

export const IMPLEMENTED_FIELD_SPELLS = Object.freeze([
  ...CONTINUOUS_FIELD_SPELLS, ...SCRIPTED_FIELD_SPELLS
]);

const byId = new Map(CONTINUOUS_FIELD_SPELLS.map(card => [card.id, card]));

// Shared by the live continuous calculation and AI projections. A projection
// can describe a monster in hand without giving it a fake field activation.
export function getContinuousFieldSpellLevelModifier(monster, definitionOrId) {
  const id = typeof definitionOrId === 'object' ? definitionOrId?.id : definitionOrId;
  const definition = byId.get(String(id).replace(/^0+(?=\d)/, ''));
  if (!monster || !definition?.levelModifier
    || ['xyz', 'link'].includes(monster.extra_type)
    || /\b(?:Xyz|Link)\b/i.test(monster.type || '')) return 0;
  return (monster.currentAttribute || monster.attribute) === definition.attribute
    ? definition.levelModifier : 0;
}

export function getContinuousFieldSpellStatModifier(monster, definitionOrId, context = {}) {
  const id = typeof definitionOrId === 'object' ? definitionOrId?.id : definitionOrId;
  const definition = byId.get(String(id).replace(/^0+(?=\d)/, ''));
  if (!definition || !monster) return { atk: 0, def: 0 };
  let atk = 0;
  let def = 0;
  if (definition.modifierKind === 'x-saber-level') {
    const name = monster.getName?.() || monster.name_en || monster.name || '';
    const isSaber = /(?:X-Saber|Sabre X)/i.test(name)
      || ['X-Saber', 'XX-Saber'].includes(monster.archetype);
    const level = monster.getLevel?.() ?? monster.currentLevel ?? monster.level ?? monster.baseLevel;
    const hasLevel = !['xyz', 'link'].includes(monster.extra_type)
      && !/\b(?:Xyz|Link)\b/i.test(monster.type || '');
    if (isSaber && hasLevel && Number.isInteger(level) && level >= 1) {
      atk = 100 * level;
      def = -atk;
    }
  } else if (definition.modifierKind === 'own-beast-graveyard') {
    if (context.controllerId && monster.controllerId === context.controllerId
      && (monster.currentRace || monster.race) === 'Beast') {
      atk = 100 * Math.max(0, Number(context.graveyardMonsterCount) || 0);
    }
  } else if (definition.modifierKind === 'own-turn') {
    if (context.controllerId && monster.controllerId === context.controllerId
      && ['player', 'opponent'].includes(context.currentTurn)) {
      if (context.currentTurn === context.controllerId) atk = 300;
      else def = 300;
    }
  } else if (definition.modifierKind === 'race') {
    if ((monster.currentRace || monster.race) === definition.race) {
      atk = definition.atk;
      def = definition.def;
    }
  } else if (definition.modifierKind === 'aqua-water-low-level') {
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

export function getClassicFieldSpellModifier(monster, fieldSpell, game = null) {
  if (!hasResolvedFieldSpellActivation(fieldSpell)
    || fieldSpell.effectNegated || fieldSpell.activationNegated
    || !monster || monster.card_type !== 'monster' || monster.isSetFaceDown
    || !['monster_zone', 'extra_monster_zone'].includes(monster.location)) {
    return { atk: 0, def: 0 };
  }
  const side = fieldSpell.controllerId;
  const graveyard = ['player', 'opponent'].includes(side) ? game?.field?.[`${side}Graveyard`] || [] : [];
  return getContinuousFieldSpellStatModifier(monster, fieldSpell, {
    controllerId: side,
    currentTurn: game?.currentTurn,
    graveyardMonsterCount: graveyard.filter(card => card.card_type === 'monster').length
  });
}
