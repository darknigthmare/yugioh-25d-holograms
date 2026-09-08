import { STARTER_CARDS, EXTRA_DECK_CARDS } from '../cards.js';

export const SOLO_CAMPAIGN_VERSION = 1;
const MAX_RESULTS = 8192;
const MAX_SAVE_LENGTH = 1_500_000;
const RESULT_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/;
const EXTRA_TYPES = ['fusion', 'synchro', 'xyz', 'link'];

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freezeDeep);
  return Object.freeze(value);
}

// Only canonical local cards with implemented procedures are used. Every
// supplied Main Deck contains thirteen different playsets and one Reborn.
const C = Object.freeze({
  blue: '89631139', dark: '46986414', red: '74677422', girl: '38033121',
  skull: '70781052', celtic: '91152256', kuriboh: '40640057', stone: '13039848',
  baby: '88819587', timeWizard: '71625222', junk: '63977008', reborn: '83764718',
  raigeki: '12580477', mirror: '44095762', trap: '04206964', poly: '24094653',
  ritual: '55761792', bls: '05405694', stargazer: '94415058', timegazer: '20409757',
  battleOx: '05053103', laJinn: '97590747', vorse: '14898066', saggi: '66602787',
  elf: '15025844', wildImp: '41392891', beaver: '32452818', curse: '28279543',
  gaia: '06368038', axe: '48305365', alligator: '64428736', masaki: '44287299',
  tiger: '49791927', yami: '59197169', forest: '87430998', mountain: '50913601',
  sogen: '86318356', wasteland: '23424603', ultimate: '23995346',
  stardust: '44508094', arcanite: '31924889', utopia: '84013237', lan: '77637979'
});

function deck(names) {
  if (names.length !== 13 || new Set(names).size !== 13 || names.some(name => !C[name])) {
    throw new Error('A campaign deck must contain thirteen distinct local playsets.');
  }
  return [...names.flatMap(name => [C[name], C[name], C[name]]), C.reborn];
}

const PLAYERS = {
  foundations: deck(['vorse', 'laJinn', 'axe', 'battleOx', 'celtic', 'alligator', 'tiger', 'masaki', 'stone', 'elf', 'saggi', 'beaver', 'baby']),
  defense: deck(['stone', 'elf', 'saggi', 'kuriboh', 'trap', 'mirror', 'vorse', 'laJinn', 'axe', 'battleOx', 'celtic', 'forest', 'beaver']),
  tribute: deck(['blue', 'dark', 'skull', 'baby', 'stone', 'elf', 'laJinn', 'vorse', 'celtic', 'axe', 'mirror', 'trap', 'raigeki']),
  fields: deck(['yami', 'forest', 'mountain', 'laJinn', 'saggi', 'elf', 'beaver', 'battleOx', 'tiger', 'baby', 'blue', 'mirror', 'raigeki']),
  // The only strict-compatible local Fusion is Blue-Eyes Ultimate Dragon.
  // Defensive bodies keep this optional expert challenge alive long enough to
  // assemble its exact three-copy material recipe without falsifying it.
  fusion: deck(['blue', 'poly', 'stone', 'elf', 'kuriboh', 'baby', 'saggi', 'beaver', 'wildImp', 'celtic', 'forest', 'mirror', 'trap']),
  synchro: deck(['junk', 'elf', 'saggi', 'baby', 'timeWizard', 'kuriboh', 'vorse', 'axe', 'celtic', 'yami', 'mirror', 'trap', 'raigeki']),
  xyz: deck(['vorse', 'laJinn', 'axe', 'battleOx', 'celtic', 'alligator', 'beaver', 'stone', 'elf', 'tiger', 'sogen', 'mirror', 'trap']),
  link: deck(['baby', 'kuriboh', 'celtic', 'stone', 'elf', 'beaver', 'axe', 'vorse', 'laJinn', 'battleOx', 'forest', 'mirror', 'trap']),
  ritual: deck(['bls', 'ritual', 'stone', 'elf', 'vorse', 'celtic', 'axe', 'battleOx', 'tiger', 'sogen', 'mirror', 'trap', 'raigeki']),
  pendulum: deck(['stargazer', 'timegazer', 'vorse', 'laJinn', 'elf', 'stone', 'battleOx', 'axe', 'celtic', 'tiger', 'sogen', 'mirror', 'trap']),
  resilience: deck(['kuriboh', 'stone', 'elf', 'saggi', 'mirror', 'trap', 'raigeki', 'vorse', 'laJinn', 'axe', 'skull', 'wasteland', 'beaver']),
  synthesis: deck(['junk', 'elf', 'stargazer', 'timegazer', 'vorse', 'axe', 'battleOx', 'stone', 'baby', 'kuriboh', 'mirror', 'raigeki', 'sogen'])
};

const OPPONENTS = {
  cadet: deck(['celtic', 'alligator', 'tiger', 'masaki', 'stone', 'elf', 'saggi', 'beaver', 'baby', 'kuriboh', 'wildImp', 'curse', 'battleOx']),
  assault: deck(['vorse', 'laJinn', 'axe', 'battleOx', 'alligator', 'tiger', 'masaki', 'celtic', 'skull', 'raigeki', 'sogen', 'stone', 'elf']),
  guard: deck(['stone', 'elf', 'saggi', 'beaver', 'kuriboh', 'vorse', 'laJinn', 'axe', 'celtic', 'wasteland', 'mirror', 'trap', 'raigeki']),
  territories: deck(['wasteland', 'sogen', 'stone', 'beaver', 'axe', 'battleOx', 'alligator', 'masaki', 'celtic', 'tiger', 'gaia', 'mirror', 'trap']),
  bastion: deck(['stone', 'elf', 'saggi', 'beaver', 'kuriboh', 'celtic', 'alligator', 'masaki', 'baby', 'wildImp', 'wasteland', 'forest', 'tiger']),
  spellcasters: deck(['dark', 'girl', 'saggi', 'elf', 'laJinn', 'skull', 'yami', 'kuriboh', 'stone', 'celtic', 'mirror', 'trap', 'raigeki']),
  rock: deck(['stone', 'elf', 'wasteland', 'trap', 'mirror', 'celtic', 'alligator', 'axe', 'beaver', 'tiger', 'wildImp', 'saggi', 'raigeki']),
  exchanges: deck(['axe', 'battleOx', 'vorse', 'laJinn', 'celtic', 'alligator', 'masaki', 'wildImp', 'forest', 'mirror', 'trap', 'stone', 'beaver']),
  dragons: deck(['blue', 'red', 'curse', 'baby', 'mountain', 'vorse', 'laJinn', 'axe', 'stone', 'elf', 'mirror', 'trap', 'raigeki']),
  disruption: deck(['vorse', 'laJinn', 'axe', 'battleOx', 'sogen', 'raigeki', 'mirror', 'trap', 'skull', 'stone', 'elf', 'celtic', 'alligator']),
  pressure: deck(['vorse', 'laJinn', 'axe', 'battleOx', 'skull', 'blue', 'mountain', 'celtic', 'alligator', 'raigeki', 'mirror', 'trap', 'baby']),
  examiner: deck(['junk', 'elf', 'saggi', 'stargazer', 'timegazer', 'vorse', 'laJinn', 'yami', 'skull', 'mirror', 'trap', 'raigeki', 'baby'])
};

export const SOLO_CHAPTERS = freezeDeep([
  { id: 'foundations', number: 1, title: 'Lire le duel', description: 'Positions, ressources et influence des Terrains.' },
  { id: 'extra-deck', number: 2, title: 'Construire son Extra Deck', description: 'Quatre recettes et quatre façons de convertir ses monstres.' },
  { id: 'mastery', number: 3, title: 'Adapter sa stratégie', description: 'Rituel, Pendule, résistance et combinaison des acquis.' }
]);

function objective(id, label, stat, target, comparison = 'at-least', options = {}) {
  return { id, label, stat, target, comparison, ...options };
}

const DEFINITIONS = [
  {
    id: 'first-formation', title: 'Première formation', player: 'foundations', opponent: 'cadet',
    opponentName: 'Cadet de la salle', aiDifficulty: 'easy', firstPlayerId: 'player',
    mechanics: ['normal'],
    briefing: 'Un affrontement centré sur les monstres : comparez les statistiques publiques et gardez une présence sur le Terrain.',
    strategy: 'Invoquez vos attaquants de Niveau 4. Une carte de plus sur le Terrain vaut parfois mieux qu’une attaque précipitée.',
    opponentPlan: 'Monstres simples, quelques défenseurs et un Dragon de Niveau 5 ; aucun piège de destruction.',
    technique: objective('formation', 'Gagner après au moins 2 Invocations Normales.', 'normalSummons', 2),
    mastery: objective('reserve', 'Terminer avec au moins 6000 LP.', 'playerLP', 6000)
  },
  {
    id: 'hold-the-line', title: 'Tenir la ligne', player: 'defense', opponent: 'assault',
    opponentName: 'Avant-garde', aiDifficulty: 'easy', firstPlayerId: 'opponent',
    mechanics: ['set', 'defense'],
    briefing: 'L’adversaire dispose d’attaquants de Niveau 4 et de destructions. Vos défenseurs, Kuriboh et pièges permettent de préparer une riposte.',
    strategy: 'Posez Soldat de Pierre Géant ou Elfe Mystique. L’égalité ATK/DEF ne détruit pas un défenseur.',
    opponentPlan: 'Pression offensive avec Sogen, Crâne Invoqué et cartes de destruction.',
    technique: objective('fortify', 'Gagner après avoir Posé au moins 2 monstres.', 'monsterSets', 2),
    mastery: objective('guarded', 'Subir au maximum 2500 dommages.', 'damageTaken', 2500, 'at-most')
  },
  {
    id: 'tribute-investment', title: 'Le prix de la puissance', player: 'tribute', opponent: 'guard',
    opponentName: 'Gardien des remparts', aiDifficulty: 'normal', firstPlayerId: 'player',
    mechanics: ['tribute'],
    briefing: 'Vos grands monstres demandent des Sacrifices. Il faut protéger les petites créatures sans épuiser toutes vos ressources.',
    strategy: 'Crâne Invoqué demande un Sacrifice ; Dragon Blanc et Magicien Sombre en demandent deux.',
    opponentPlan: 'Défense, Terre Dévastée et pièges capables de punir un investissement trop tôt.',
    technique: objective('tribute', 'Gagner après au moins 1 Invocation Sacrifice.', 'tributeSummons', 1),
    mastery: objective('tempo', 'Gagner en 12 tours maximum.', 'turnCount', 12, 'at-most')
  },
  {
    id: 'terrain-reading', title: 'Lire le Terrain', player: 'fields', opponent: 'territories',
    opponentName: 'Géomètre des plaines', aiDifficulty: 'normal', firstPlayerId: 'player',
    mechanics: ['field-spell'],
    briefing: 'Yami, Forêt et Montagne renforcent des Types différents. Les Terrains de l’adversaire peuvent aussi renforcer vos monstres.',
    strategy: 'Choisissez selon les Types actuellement présents ; les effets continus concernent les deux camps après résolution.',
    opponentPlan: 'Guerriers, Bêtes-Guerriers et Rocher, soutenus par Sogen et Terre Dévastée.',
    technique: objective('field', 'Gagner après la résolution d’au moins 1 Magie de Terrain.', 'fieldSpellActivations', 1),
    mastery: objective('reserve', 'Terminer avec au moins 5000 LP.', 'playerLP', 5000)
  },
  {
    id: 'three-dragons', title: 'Les trois Dragons — défi expert', player: 'fusion', opponent: 'bastion',
    opponentName: 'Bastion patient', aiDifficulty: 'easy', firstPlayerId: 'player',
    playerExtra: ['ultimate'], mechanics: ['fusion'],
    briefing: 'La seule Fusion du pool strict exige réellement Polymérisation et les trois Dragons Blancs. La médaille Fusion est un objectif expert facultatif, dépendant de votre pioche.',
    strategy: 'Les matériaux peuvent venir de la main ou de votre Terrain. Préservez les trois Dragons et utilisez vos défenseurs pour prolonger le Duel ; une victoire sans Fusion donne toujours le bronze.',
    opponentPlan: 'Défense et Terrains, sans Raigeki ni pièges de destruction dans son deck.',
    technique: objective('fusion', 'Gagner après au moins 1 Invocation Fusion.', 'fusionSummons', 1),
    mastery: objective('reserve', 'Terminer avec au moins 4000 LP.', 'playerLP', 4000)
  },
  {
    id: 'synchronization', title: 'Accorder les Niveaux', player: 'synchro', opponent: 'spellcasters',
    opponentName: 'Cercle des mages', aiDifficulty: 'normal', firstPlayerId: 'player',
    playerExtra: ['arcanite', 'stardust'], opponentExtra: ['utopia'], mechanics: ['synchro'],
    briefing: 'Robot Synchronique ouvre deux recettes : Magicien des Arcanes pour le contrôle ou Dragon Poussière d’Étoile pour la protection.',
    strategy: 'Robot Synchronique (3) + Elfe Mystique (4) invoquent Magicien des Arcanes. Robot (3) + Bébé Dragon (3) + Magicien du Temps (2) totalisent 8 pour Stardust.',
    opponentPlan: 'Magiciens et Démons sous Yami, avec destructions et possibilité d’Utopie.',
    technique: objective('synchro', 'Gagner après au moins 1 Invocation Synchro.', 'synchroSummons', 1),
    mastery: objective('tempo', 'Gagner en 12 tours maximum.', 'turnCount', 12, 'at-most')
  },
  {
    id: 'rank-four', title: 'Deux Niveaux, un Rang', player: 'xyz', opponent: 'rock',
    opponentName: 'Sentinelle de pierre', aiDifficulty: 'normal', firstPlayerId: 'opponent',
    playerExtra: ['utopia', 'utopia'], opponentExtra: ['utopia'], mechanics: ['xyz'],
    briefing: 'De nombreux Niveaux 4 permettent de superposer deux monstres. Les matériaux d’Utopie constituent ensuite une réserve limitée.',
    strategy: 'Détachez pour annuler une attaque utile à l’adversaire, puis surveillez le dernier matériau : Utopie vide se détruit lorsqu’elle est ciblée pour une attaque.',
    opponentPlan: 'Défense renforcée par Terre Dévastée, pièges et Utopie adverse.',
    technique: objective('xyz', 'Gagner après au moins 1 Invocation Xyz.', 'xyzSummons', 1),
    mastery: objective('guarded', 'Subir au maximum 3500 dommages.', 'damageTaken', 3500, 'at-most')
  },
  {
    id: 'link-exchange', title: 'Relier les ressources', player: 'link', opponent: 'exchanges',
    opponentName: 'Tacticien des échanges', aiDifficulty: 'normal', firstPlayerId: 'player',
    playerExtra: ['lan', 'lan'], opponentExtra: ['lan'], mechanics: ['link'],
    briefing: 'Deux petits monstres peuvent devenir LANphorhynchus. Ce choix consomme une présence sur le Terrain et doit apporter un avantage réel.',
    strategy: 'LANphorhynchus accepte deux monstres et reste en Attaque. Une Invocation Lien ne doit pas vous laisser sans défense face aux pièges adverses.',
    opponentPlan: 'Monstres de combat, destructions et conversion possible de ses propres ressources en Lien.',
    technique: objective('link', 'Gagner après au moins 1 Invocation Lien.', 'linkSummons', 1),
    mastery: objective('tempo', 'Gagner en 14 tours maximum.', 'turnCount', 14, 'at-most')
  },
  {
    id: 'ritual-balance', title: 'L’équilibre du Rituel', player: 'ritual', opponent: 'dragons',
    opponentName: 'Escadre draconique', aiDifficulty: 'normal', firstPlayerId: 'player',
    opponentExtra: ['utopia'], mechanics: ['ritual'],
    briefing: 'Soldat du Lustre Noir et son Rituel occupent chacun trois places du deck. Les Niveaux 4 facilitent le choix exact des Sacrifices.',
    strategy: 'Gardez le monstre Rituel en main et utilisez deux Niveaux 4 pour atteindre 8. Les autres cartes restent disponibles pour la suite du duel.',
    opponentPlan: 'Dragons à Sacrifices et Montagne ; sa puissance augmente si sa préparation aboutit.',
    technique: objective('ritual', 'Gagner après au moins 1 Invocation Rituelle.', 'ritualSummons', 1),
    mastery: objective('guarded', 'Subir au maximum 3000 dommages.', 'damageTaken', 3000, 'at-most')
  },
  {
    id: 'pendulum-window', title: 'Ouvrir les échelles', player: 'pendulum', opponent: 'disruption',
    opponentName: 'Briseur de formations', aiDifficulty: 'hard', firstPlayerId: 'player',
    playerExtra: ['utopia', 'lan'], opponentExtra: ['utopia', 'lan'], mechanics: ['pendulum'],
    briefing: 'Établissez les deux Magiciens Pendule pour déployer vos monstres. L’adversaire possède plusieurs moyens de détruire une formation étendue.',
    strategy: 'Activez Observateur du Temps avant de contrôler un monstre. Les deux Magiciens forment les échelles 1 et 8 ; n’exposez pas toute votre main sans nécessité.',
    opponentPlan: 'Raigeki, Force de Miroir, Trappe et Invocations Extra contre les formations nombreuses.',
    technique: objective('pendulum', 'Gagner après au moins 1 Invocation Pendule.', 'pendulumSummons', 1),
    mastery: objective('guarded', 'Subir au maximum 3000 dommages.', 'damageTaken', 3000, 'at-most')
  },
  {
    id: 'measured-resistance', title: 'Résister et reprendre', player: 'resilience', opponent: 'pressure',
    opponentName: 'Avant-garde renforcée', aiDifficulty: 'hard', firstPlayerId: 'opponent',
    playerExtra: ['utopia'], opponentExtra: ['utopia', 'lan'], mechanics: ['survival', 'defense'],
    briefing: 'Le deck adverse privilégie la pression. Vos cartes défensives doivent limiter les dommages, conserver des ressources puis reprendre l’initiative.',
    strategy: 'Kuriboh annule les dommages d’une attaque adverse, pas la destruction de votre monstre. Protégez vos LP et concluez dès que la pression est stabilisée.',
    opponentPlan: 'Attaquants solides, grands monstres, destructions et Extra Deck disponibles dès qu’une ligne légale existe.',
    technique: objective('guarded', 'Gagner en subissant au maximum 2500 dommages.', 'damageTaken', 2500, 'at-most'),
    mastery: objective('tempo', 'Gagner en 14 tours maximum.', 'turnCount', 14, 'at-most')
  },
  {
    id: 'adaptive-finale', title: 'L’épreuve de synthèse', player: 'synthesis', opponent: 'examiner',
    opponentName: 'Examinateur de l’arène', aiDifficulty: 'hard', firstPlayerId: 'opponent',
    playerExtra: ['arcanite', 'stardust', 'utopia', 'lan'],
    opponentExtra: ['arcanite', 'stardust', 'utopia', 'lan'], mechanics: ['synchro', 'xyz', 'link', 'pendulum'],
    briefing: 'Les deux camps disposent de plusieurs procédures d’Invocation. Choisissez vos lignes selon les ressources et le Terrain présents.',
    strategy: 'Conservez Robot Synchronique pour une Synchro si elle est utile ; deux Niveaux 4 ouvrent Utopie, et deux monstres peuvent devenir LANphorhynchus.',
    opponentPlan: 'Magiciens, Pendules, Yami, destructions et quatre monstres Extra aux rôles différents.',
    technique: objective(
      'variety',
      'Gagner avec au moins 2 types d’Invocation Extra disponibles : Synchro, Xyz ou Lien.',
      'extraSummonTypes',
      2,
      'distinct',
      { allowedValues: ['synchro', 'xyz', 'link'] }
    ),
    mastery: objective('reserve', 'Terminer avec au moins 4000 LP.', 'playerLP', 4000)
  }
];

export const SOLO_MISSIONS = freezeDeep(DEFINITIONS.map((definition, index) => ({
  id: definition.id,
  number: index + 1,
  chapterId: SOLO_CHAPTERS[Math.floor(index / 4)].id,
  title: definition.title,
  opponentName: definition.opponentName,
  aiDifficulty: definition.aiDifficulty,
  firstPlayerId: definition.firstPlayerId,
  rulesMode: 'strict',
  mode: 'duel',
  unlocksAfter: index === 0 ? null : DEFINITIONS[index - 1].id,
  goal: 'Remporter le Duel pour obtenir le bronze et débloquer la mission suivante.',
  briefing: definition.briefing,
  strategy: definition.strategy,
  opponentPlan: definition.opponentPlan,
  mechanics: definition.mechanics,
  objectives: [definition.technique, definition.mastery],
  playerDeck: PLAYERS[definition.player],
  playerExtraDeck: (definition.playerExtra || []).map(name => C[name]),
  opponentDeck: OPPONENTS[definition.opponent],
  opponentExtraDeck: (definition.opponentExtra || []).map(name => C[name])
})));

const missionMap = new Map(SOLO_MISSIONS.map(mission => [mission.id, mission]));
const templates = new Map([...STARTER_CARDS, ...EXTRA_DECK_CARDS].map(template => [String(template.id), template]));

export function getMission(id) {
  return typeof id === 'string' ? missionMap.get(id) || null : null;
}

function cloneTemplate(id) {
  const template = templates.get(String(id));
  if (!template) throw new RangeError(`Unknown local campaign card: ${id}`);
  // Local templates are JSON data; runtime CardStates are created by DuelGame.
  return JSON.parse(JSON.stringify(template));
}

export function buildMissionDecks(id) {
  const mission = getMission(id);
  if (!mission) return null;
  return Object.fromEntries(['player', 'opponent'].map(side => [side, {
    mainDeck: mission[`${side}Deck`].map(cloneTemplate),
    extraDeck: mission[`${side}ExtraDeck`].map(cloneTemplate),
    sideDeck: []
  }]));
}

function emptyEntry() {
  return { attempts: 0, wins: 0, bestMedal: 0, bestPlayerLP: 0, bestTurnCount: null };
}

export function createCampaignProgress() {
  return {
    version: SOLO_CAMPAIGN_VERSION,
    missions: Object.fromEntries(SOLO_MISSIONS.map(mission => [mission.id, emptyEntry()])),
    processedResultIds: []
  };
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function integer(value, maximum = 1_000_000) {
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : 0;
}

export function validateCampaignProgress(raw) {
  const fresh = createCampaignProgress();
  const issues = [];
  if (raw === null || raw === undefined) return { valid: true, issues, progress: fresh };
  if (typeof raw === 'string') {
    if (raw.length > MAX_SAVE_LENGTH) return { valid: false, issues: ['save-too-large'], progress: fresh };
    try { raw = JSON.parse(raw); } catch { return { valid: false, issues: ['invalid-json'], progress: fresh }; }
  }
  if (!plainObject(raw) || raw.version !== SOLO_CAMPAIGN_VERSION) {
    return { valid: false, issues: ['unsupported-version'], progress: fresh };
  }
  if (!plainObject(raw.missions) || !Array.isArray(raw.processedResultIds)) {
    return { valid: false, issues: ['invalid-progress-shape'], progress: fresh };
  }
  const ids = raw.processedResultIds.filter(id => typeof id === 'string' && RESULT_ID_PATTERN.test(id));
  if (ids.length !== raw.processedResultIds.length || new Set(ids).size !== ids.length || ids.length > MAX_RESULTS) {
    issues.push('invalid-result-history');
  }
  fresh.processedResultIds = [...new Set(ids)].slice(0, MAX_RESULTS);
  for (const mission of SOLO_MISSIONS) {
    const entry = Object.hasOwn(raw.missions, mission.id) ? raw.missions[mission.id] : null;
    if (!plainObject(entry)) {
      if (entry !== null) issues.push(`invalid-entry:${mission.id}`);
      continue;
    }
    const attempts = integer(entry.attempts);
    const wins = Math.min(integer(entry.wins), attempts);
    const bestMedal = wins > 0 ? Math.max(1, integer(entry.bestMedal, 3)) : 0;
    const bestPlayerLP = wins > 0 ? integer(entry.bestPlayerLP) : 0;
    const bestTurnCount = wins > 0 && integer(entry.bestTurnCount, 10000) > 0 ? entry.bestTurnCount : null;
    if (attempts !== entry.attempts || wins !== entry.wins || bestMedal !== entry.bestMedal
      || bestPlayerLP !== entry.bestPlayerLP || bestTurnCount !== entry.bestTurnCount) {
      issues.push(`invalid-entry-values:${mission.id}`);
    }
    if (mission.unlocksAfter && fresh.missions[mission.unlocksAfter].bestMedal === 0 && attempts > 0) {
      issues.push(`locked-entry:${mission.id}`);
      continue;
    }
    fresh.missions[mission.id] = { attempts, wins, bestMedal, bestPlayerLP, bestTurnCount };
  }
  return { valid: issues.length === 0, issues, progress: fresh };
}

export function normalizeCampaignProgress(raw) {
  return validateCampaignProgress(raw).progress;
}

export function getMissionStatus(progress, id) {
  const mission = getMission(id);
  if (!mission) return null;
  const normalized = normalizeCampaignProgress(progress);
  const entry = normalized.missions[mission.id];
  return {
    ...entry,
    unlocked: !mission.unlocksAfter || normalized.missions[mission.unlocksAfter].bestMedal > 0,
    completed: entry.bestMedal > 0,
    medals: entry.bestMedal
  };
}

function normalizeResultStats(stats) {
  const source = plainObject(stats) ? stats : {};
  const result = {};
  const providedStats = new Set();
  for (const key of [
    'normalSummons', 'monsterSets', 'tributeSummons', 'fieldSpellActivations',
    'fusionSummons', 'synchroSummons', 'xyzSummons', 'linkSummons', 'ritualSummons',
    'pendulumSummons', 'damageTaken', 'playerLP'
  ]) {
    result[key] = integer(source[key]);
    if (Number.isSafeInteger(source[key]) && source[key] >= 0 && source[key] <= 1_000_000) {
      providedStats.add(key);
    }
  }
  result.turnCount = integer(source.turnCount, 10000);
  if (Number.isSafeInteger(source.turnCount) && source.turnCount > 0 && source.turnCount <= 10000) {
    providedStats.add('turnCount');
  }
  result.extraSummonTypes = Array.isArray(source.extraSummonTypes)
    ? [...new Set(source.extraSummonTypes.filter(type => EXTRA_TYPES.includes(type)))] : [];
  result.providedStats = providedStats;
  return result;
}

function meetsObjective(requirement, stats) {
  if (requirement.comparison === 'distinct') {
    const values = requirement.allowedValues
      ? stats[requirement.stat].filter(value => requirement.allowedValues.includes(value))
      : stats[requirement.stat];
    return values.length >= requirement.target;
  }
  const value = stats[requirement.stat];
  if (requirement.comparison === 'at-most') {
    return stats.providedStats.has(requirement.stat) && value <= requirement.target;
  }
  return value >= requirement.target;
}

/**
 * Pure reducer. Call once after a completed mission Duel with one stable
 * resultId retained by the caller across duplicate game-over notifications.
 * Progress is local and user-editable, not an anti-cheat or ranked service.
 */
export function recordMissionResult(progress, id, outcome, stats = {}) {
  const next = normalizeCampaignProgress(progress);
  const reject = (reason, duplicate = false) => ({ progress: next, accepted: false, duplicate, reason, newlyUnlocked: [] });
  const mission = getMission(id);
  if (!mission) return reject('unknown-mission');
  const resultId = plainObject(stats) ? stats.resultId : null;
  if (typeof resultId !== 'string' || !RESULT_ID_PATTERN.test(resultId)) return reject('invalid-result-id');
  if (next.processedResultIds.includes(resultId)) return reject('duplicate-result', true);
  if (!getMissionStatus(next, id).unlocked) return reject('mission-locked');
  const normalizedOutcome = { win: 'player', loss: 'opponent' }[outcome] || outcome;
  if (!['player', 'opponent', 'draw'].includes(normalizedOutcome)) return reject('invalid-outcome');
  if (next.processedResultIds.length >= MAX_RESULTS) return reject('result-history-full');
  const facts = normalizeResultStats(stats);
  const entry = next.missions[mission.id];
  const wasCompleted = entry.bestMedal > 0;
  entry.attempts = Math.min(1_000_000, entry.attempts + 1);
  let earnedMedal = 0;
  const objectives = mission.objectives.map(requirement => ({ id: requirement.id, met: meetsObjective(requirement, facts) }));
  if (normalizedOutcome === 'player') {
    entry.wins = Math.min(entry.attempts, entry.wins + 1);
    earnedMedal = 1 + Number(objectives[0].met) + Number(objectives[0].met && objectives[1].met);
    entry.bestMedal = Math.max(entry.bestMedal, earnedMedal);
    entry.bestPlayerLP = Math.max(entry.bestPlayerLP, facts.playerLP);
    if (facts.turnCount > 0) entry.bestTurnCount = entry.bestTurnCount === null
      ? facts.turnCount : Math.min(entry.bestTurnCount, facts.turnCount);
  }
  next.processedResultIds.push(resultId);
  const newlyUnlocked = !wasCompleted && entry.bestMedal > 0
    ? SOLO_MISSIONS.filter(candidate => candidate.unlocksAfter === id).map(candidate => candidate.id) : [];
  return {
    progress: next, accepted: true, duplicate: false, reason: null,
    newlyUnlocked, earnedMedal, objectives,
    completed: entry.bestMedal > 0, bestMedal: entry.bestMedal
  };
}
