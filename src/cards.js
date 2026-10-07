import { FIELD_SPELL_ENVIRONMENT_CATALOG } from './ui/FieldSpellEnvironmentCatalog.js';
const nativeFieldImageIds = new Set(FIELD_SPELL_ENVIRONMENT_CATALOG.map(card => String(card.cardId)));
import {
  ADDITIONAL_FIELD_SPELLS, CLASSIC_FIELD_SPELLS, SCRIPTED_FIELD_SPELLS, WETLANDS_FIELD_SPELL,
  TRANSVERSE_CONTINUOUS_FIELD_SPELLS
} from './core/ClassicFieldSpellEffects.js';

export const STARTER_CARDS = [
  {
    id: "89631139",
    name: "Dragon Blanc aux Yeux Bleus",
    name_en: "Blue-Eyes White Dragon",
    type: "Normal Monster",
    desc: "Ce dragon légendaire est une bête puissante détruisant tout sur son passage. Très peu de duellistes ont vu cette carte et ont survécu pour en témoigner.",
    atk: 3000,
    def: 2500,
    level: 8,
    race: "Dragon",
    attribute: "LIGHT",
    card_type: "monster"
  },
  {
    id: "46986414",
    name: "Magicien Sombre",
    name_en: "Dark Magician",
    type: "Normal Monster",
    desc: "Le plus grand magicien en termes d'attaque et de défense.",
    atk: 2500,
    def: 2100,
    level: 7,
    race: "Spellcaster",
    attribute: "DARK",
    card_type: "monster"
  },
  {
    id: "74677422",
    name: "Dragon Noir aux Yeux Rouges",
    name_en: "Red-Eyes Black Dragon",
    type: "Normal Monster",
    desc: "Un dragon féroce dont l'attaque est mortelle.",
    atk: 2400,
    def: 2000,
    level: 7,
    race: "Dragon",
    attribute: "DARK",
    card_type: "monster"
  },
  {
    id: "38033121",
    name: "Magicienne des Ténèbres",
    name_en: "Dark Magician Girl",
    type: "Effect Monster",
    rulesText: "Gagne 300 ATK pour chaque « Magicien Sombre » ou « Magicien du Chaos Sombre » dans les Cimetières.",
    desc: "Gagne 300 ATK pour chaque « Magicien Sombre » ou « Magicien du Chaos Sombre » dans les Cimetières.",
    atk: 2000,
    def: 1700,
    level: 6,
    race: "Spellcaster",
    attribute: "DARK",
    card_type: "monster"
  },
  {
    id: "70781052",
    name: "Crâne Invoqué",
    name_en: "Summoned Skull",
    type: "Normal Monster",
    desc: "Démon doté de pouvoirs intellectuels et d'une force d'attaque impressionnante.",
    atk: 2500,
    def: 1200,
    level: 6,
    race: "Fiend",
    attribute: "DARK",
    card_type: "monster"
  },
  {
    id: "91152256",
    name: "Gardien Celtique",
    name_en: "Celtic Guardian",
    type: "Normal Monster",
    desc: "Un elfe qui a appris à manier l'épée, il trompe ses ennemis en attaquant avec agilité.",
    atk: 1400,
    def: 1200,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",
    card_type: "monster"
  },
  {
    id: "40640057",
    name: "Kuriboh",
    name_en: "Kuriboh",
    type: "Effect Monster",
    rulesText: "Durant le calcul des dommages, si vous allez recevoir des dommages de combat d'une attaque de monstre de l'adversaire (Effet Rapide) : vous pouvez défausser cette carte ; vous ne recevez aucun dommage de combat de ce combat.",
    desc: "Durant le calcul des dommages, défaussez cette carte pour ne recevoir aucun dommage de combat de ce combat.",
    atk: 300,
    def: 200,
    level: 1,
    race: "Fiend",
    attribute: "DARK",
    card_type: "monster",
    effectCode: "KURIBOH_PREVENT_BATTLE_DAMAGE",
    timing: { event: "DAMAGE_CALCULATION", spellSpeed: 2 }
  },
  {
    id: "13039848",
    name: "Soldat de Pierre Géant",
    name_en: "Giant Soldier of Stone",
    type: "Normal Monster",
    desc: "Un guerrier de pierre géant. Sa défense est extrêmement solide.",
    atk: 1300,
    def: 2000,
    level: 3,
    race: "Rock",
    attribute: "EARTH",
    card_type: "monster"
  },
  {
    id: "88819587",
    name: "Bébé Dragon",
    name_en: "Baby Dragon",
    type: "Normal Monster",
    desc: "Plus qu'un bébé dragon, cette créature possède un grand potentiel encore inexploité.",
    atk: 1200,
    def: 700,
    level: 3,
    race: "Dragon",
    attribute: "WIND",
    card_type: "monster"
  },
  {
    id: "71625222",
    name: "Magicien du Temps",
    name_en: "Time Wizard",
    type: "Effect Monster",
    rulesText: "Une fois par tour : vous pouvez lancer une pièce et appeler pile ou face. Si vous gagnez, détruisez tous les monstres contrôlés par votre adversaire. Si vous perdez, détruisez autant de monstres que possible que vous contrôlez, et si vous le faites, recevez des dommages égaux à la moitié de la somme de l'ATK que ces monstres détruits avaient face recto sur le Terrain.",
    desc: "Lancez une pièce : détruisez les monstres adverses si l'appel est correct, sinon vos monstres et recevez la moitié de leur ATK face recto actuelle.",
    atk: 500,
    def: 400,
    level: 2,
    race: "Spellcaster",
    attribute: "LIGHT",
    card_type: "monster",
    effectCode: "TIME_WIZARD_COIN_TOSS"
  },
  {
    id: "63977008",
    name: "Robot Synchronique",
    name_en: "Junk Synchron",
    type: "Tuner Effect Monster",
    rulesText: "Lorsque cette carte est Invoquée Normalement : vous pouvez cibler 1 monstre de Niveau 2 ou moins dans votre Cimetière ; Invoquez Spécialement la cible en Position de Défense, mais annulez ses effets.",
    desc: "À son Invocation Normale, ciblez un monstre de Niveau 2 ou moins dans votre Cimetière et Invoquez-le en Défense avec ses effets annulés.",
    atk: 1300,
    def: 500,
    level: 3,
    race: "Warrior",
    attribute: "DARK",
    card_type: "monster",
    effectCode: "JUNK_SYNCHRON_REVIVE",
    timing: { event: "SUMMON_SUCCESS", optional: true }
  },
  {
    id: "54652250",
    name: "Insecte Mangeur d'Hommes",
    name_en: "Man-Eater Bug",
    type: "Flip Effect Monster",
    rulesText: "FLIP : Ciblez 1 monstre sur le Terrain ; détruisez-le.",
    desc: "FLIP : Ciblez 1 monstre sur le Terrain ; détruisez-le.",
    atk: 450,
    def: 600,
    level: 2,
    race: "Insect",
    attribute: "EARTH",
    card_type: "monster",
    effectCode: "MAN_EATER_BUG_DESTROY",
    timing: { event: "FLIPPED_FACE_UP", spellSpeed: 1, usableInDamageStep: true, allowedDamageTimings: ["AFTER_DAMAGE_CALCULATION"] }
  },
  {
    id: "31560081",
    name: "Magicien de la Foi",
    name_en: "Magician of Faith",
    type: "Flip Effect Monster",
    rulesText: "FLIP : Ciblez 1 Magie dans votre Cimetière ; ajoutez la cible à votre main.",
    desc: "FLIP : Ciblez 1 Magie dans votre Cimetière ; ajoutez la cible à votre main.",
    atk: 300,
    def: 400,
    level: 1,
    race: "Spellcaster",
    attribute: "LIGHT",
    card_type: "monster",
    effectCode: "MAGICIAN_OF_FAITH_RECOVER",
    timing: { event: "FLIPPED_FACE_UP", spellSpeed: 1, usableInDamageStep: true, allowedDamageTimings: ["AFTER_DAMAGE_CALCULATION"] }
  },
  {
    id: "26202165",
    name: "Sangan",
    name_en: "Sangan",
    type: "Effect Monster",
    rulesText: "Si cette carte est envoyée depuis le Terrain au Cimetière : ajoutez 1 monstre avec max. 1500 ATK depuis votre Deck à votre main, mais vous ne pouvez activer ni de cartes ni d'effets de carte de ce nom le reste de ce tour. Vous ne pouvez utiliser cet effet de \"Sangan\" qu'une fois par tour.",
    desc: "Si cette carte est envoyée depuis le Terrain au Cimetière : ajoutez 1 monstre avec max. 1500 ATK depuis votre Deck à votre main, mais vous ne pouvez activer ni de cartes ni d'effets de carte de ce nom le reste de ce tour. Vous ne pouvez utiliser cet effet de \"Sangan\" qu'une fois par tour.",
    atk: 1000,
    def: 600,
    level: 3,
    race: "Fiend",
    attribute: "DARK",
    card_type: "monster",
    effectCode: "SANGAN_SEARCH",
    timing: { event: "SENT_FROM_FIELD_TO_GRAVEYARD", spellSpeed: 1, usableInDamageStep: true, allowedDamageTimings: ["START_OF_DAMAGE_STEP", "BEFORE_DAMAGE_CALCULATION", "DURING_DAMAGE_CALCULATION", "AFTER_DAMAGE_CALCULATION", "END_OF_DAMAGE_STEP"] }
  },
  {
    id: "83764718",
    name: "Monster Reborn",
    name_en: "Monster Reborn",
    type: "Spell Card",
    rulesText: "Ciblez 1 monstre dans l'un des Cimetières ; Invoquez-le Spécialement.",
    desc: "Ciblez 1 monstre dans l'un des Cimetières ; Invoquez-le Spécialement.",
    atk: 0,
    def: 0,
    level: 0,
    race: "Normal",
    attribute: "SPELL",
    card_type: "spell",
    effectCode: "MONSTER_REBORN"
  },
  {
    id: "12580477",
    name: "Raigeki",
    name_en: "Raigeki",
    type: "Spell Card",
    desc: "Détruisez tous les monstres contrôlés par votre adversaire.",
    atk: 0,
    def: 0,
    level: 0,
    race: "Normal",
    attribute: "SPELL",
    card_type: "spell"
  },
  {
    id: "05318639",
    name: "Typhon d'Espace Mystique",
    name_en: "Mystical Space Typhoon",
    type: "Spell Card",
    rulesText: "Ciblez 1 Magie/Piège sur le Terrain ; détruisez la cible.",
    desc: "Ciblez 1 Magie/Piège sur le Terrain ; détruisez la cible.",
    atk: 0,
    def: 0,
    level: 0,
    race: "Quick-Play",
    attribute: "SPELL",
    card_type: "spell",
    effectCode: "MYSTICAL_SPACE_TYPHOON",
    timing: { spellSpeed: 2 }
  },
  {
    id: "14087893",
    name: "Livre de la Lune",
    name_en: "Book of Moon",
    type: "Spell Card",
    rulesText: "Ciblez 1 monstre face recto sur le Terrain ; changez la cible en Position de Défense face verso.",
    desc: "Ciblez 1 monstre face recto sur le Terrain ; changez la cible en Position de Défense face verso.",
    atk: 0,
    def: 0,
    level: 0,
    race: "Quick-Play",
    attribute: "SPELL",
    card_type: "spell",
    effectCode: "BOOK_OF_MOON",
    timing: { spellSpeed: 2 }
  },
  {
    id: "55144522",
    name: "Pot de Cupidité",
    name_en: "Pot of Greed",
    type: "Spell Card",
    desc: "Piochez 2 cartes de votre Deck.",
    atk: 0,
    def: 0,
    level: 0,
    race: "Normal",
    attribute: "SPELL",
    card_type: "spell"
  },
  {
    id: "44095762",
    name: "Force de Miroir",
    name_en: "Mirror Force",
    type: "Trap Card",
    desc: "Lorsqu'un monstre de l'adversaire déclare une attaque : détruisez tous les monstres en Position d'Attaque contrôlés par votre adversaire.",
    atk: 0,
    def: 0,
    level: 0,
    race: "Normal",
    attribute: "TRAP",
    card_type: "trap",
    effectCode: "MIRROR_FORCE",
    timing: { event: "ATTACK_DECLARED", optional: true }
  },
  {
    id: "04206964",
    name: "Trappe",
    name_en: "Trap Hole",
    type: "Trap Card",
    desc: "Quand votre adversaire Invoque Normalement ou Invoque par Flip un monstre avec 1000 ATK ou plus : ciblez ce monstre ; détruisez la cible.",
    atk: 0,
    def: 0,
    level: 0,
    race: "Normal",
    attribute: "TRAP",
    card_type: "trap",
    effectCode: "TRAP_HOLE",
    timing: { event: "SUMMON_SUCCESS", optional: true }
  },
  {
    id: "24094653",
    name: "Polymérisation",
    name_en: "Polymerization",
    type: "Spell Card",
    desc: "Invoquez par Fusion 1 Monstre Fusion depuis votre Extra Deck, en utilisant des monstres depuis votre main ou Terrain comme Matériel Fusion.",
    atk: 0,
    def: 0,
    level: 0,
    race: "Normal",
    attribute: "SPELL",
    card_type: "spell"
  },
  {
    id: "55761792",
    name: "Rituel du Lustre Noir",
    name_en: "Black Luster Ritual",
    type: "Ritual Spell Card",
    rulesText: "Cette carte est utilisée pour Invoquer Rituellement « Soldat du Lustre Noir ». Vous devez aussi Sacrifier des monstres depuis votre main ou Terrain dont le Niveau total est égal à min. 8.",
    desc: "Invoquez Rituellement Soldat du Lustre Noir en Sacrifiant depuis la main ou le Terrain des monstres dont la somme des Niveaux est au moins 8.",
    atk: 0,
    def: 0,
    level: 0,
    race: "Ritual",
    attribute: "SPELL",
    card_type: "spell",
    effectCode: "BLACK_LUSTER_RITUAL",
    ritualMonsterIds: ["05405694"],
    requiredRitualLevel: 8
  },
  {
    id: "05405694",
    name: "Soldat du Lustre Noir",
    name_en: "Black Luster Soldier",
    type: "Ritual Monster",
    rulesText: "Vous pouvez Invoquer Rituellement cette carte avec « Rituel du Lustre Noir ».",
    desc: "Guerrier Rituel légendaire de Niveau 8.",
    atk: 3000,
    def: 2500,
    level: 8,
    race: "Warrior",
    attribute: "EARTH",
    card_type: "monster",
    isRitualMonster: true,
    ritualSpellId: "55761792"
  },
  {
    id: "94415058",
    name: "Magicien Observateur des Étoiles",
    name_en: "Stargazer Magician",
    type: "Pendulum Effect Monster",
    rulesText: "Effet Pendule (Échelle 1) : si un Monstre Pendule que vous contrôlez combat, votre adversaire ne peut pas activer de Cartes Magie jusqu'à la fin de la Damage Step. Sauf si vous avez une carte « Magicien » ou « Yeux Impairs » dans votre autre Zone Pendule, l'Échelle Pendule de cette carte devient 4. Effet de monstre : une fois par tour, lorsqu'exactement 1 autre Monstre Pendule que vous contrôlez (et aucune autre carte) est renvoyé à votre main par un effet de carte de votre adversaire (sauf durant la Damage Step), vous pouvez Invoquer Spécialement depuis votre main 1 monstre du même nom que le monstre renvoyé.",
    desc: "Magicien Pendule d'Échelle 1 utilisé avec un autre Magicien Pendule.",
    atk: 1200,
    def: 2400,
    level: 5,
    race: "Spellcaster",
    attribute: "DARK",
    card_type: "monster",
    isPendulumMonster: true,
    pendulumScale: 1,
    pendulumArchetypes: ["Magician"],
    effectCode: "STARGAZER_MAGICIAN"
  },
  {
    id: "20409757",
    name: "Magicien Observateur du Temps",
    name_en: "Timegazer Magician",
    type: "Pendulum Effect Monster",
    rulesText: "Effet Pendule (Échelle 8) : vous ne devez contrôler aucun monstre pour activer cette carte. Si un Monstre Pendule que vous contrôlez combat, votre adversaire ne peut pas activer de Cartes Piège jusqu'à la fin de la Damage Step. Sauf si vous avez une carte « Magicien » ou « Yeux Impairs » dans votre autre Zone Pendule, l'Échelle Pendule de cette carte devient 4. Effet de monstre : chaque tour, la première fois qu'une ou plusieurs cartes dans votre Zone Pendule devraient être détruites par un effet de carte de votre adversaire, elles ne sont pas détruites.",
    desc: "Magicien Pendule d'Échelle 8 qui doit être activé lorsque vous ne contrôlez aucun monstre.",
    atk: 1200,
    def: 600,
    level: 3,
    race: "Spellcaster",
    attribute: "DARK",
    card_type: "monster",
    isPendulumMonster: true,
    pendulumScale: 8,
    pendulumArchetypes: ["Magician"],
    pendulumActivationRequiresEmptyMonsterField: true,
    effectCode: "TIMEGAZER_MAGICIAN"
  },
  {
    id: "05053103",
    name: "Bœuf de Combat",
    name_en: "Battle Ox",
    type: "Normal Monster",
    desc: "Un monstre à la puissance foudroyante qui détruit ses ennemis d'un simple coup de hache.",
    atk: 1700,
    def: 1000,
    level: 4,
    race: "Beast-Warrior",
    attribute: "EARTH",
    card_type: "monster"
  },
  {
    id: "97590747",
    name: "La Jinn, Génie Mystique de la Lampe",
    name_en: "La Jinn the Mystical Genie of the Lamp",
    type: "Normal Monster",
    desc: "Un génie de la lampe au service de son maître.",
    atk: 1800,
    def: 1000,
    level: 4,
    race: "Fiend",
    attribute: "DARK",
    card_type: "monster"
  },
  {
    id: "14898066",
    name: "Vorse Raider",
    name_en: "Vorse Raider",
    type: "Normal Monster",
    desc: "Cette bête guerrière manipule une grande variété d'armes.",
    atk: 1900,
    def: 1200,
    level: 4,
    race: "Beast-Warrior",
    attribute: "DARK",
    card_type: "monster"
  },
  {
    id: "66602787",
    name: "Saggi le Bouffon des Ténèbres",
    name_en: "Saggi the Dark Clown",
    type: "Normal Monster",
    desc: "Un bouffon des ténèbres qui utilise des attaques étranges.",
    atk: 600,
    def: 1500,
    level: 3,
    race: "Spellcaster",
    attribute: "DARK",
    card_type: "monster"
  },
  {
    id: "15025844",
    name: "Elfe Mystique",
    name_en: "Mystical Elf",
    type: "Normal Monster",
    desc: "Une elfe délicate possédant une défense renforcée par un pouvoir mystique.",
    atk: 800,
    def: 2000,
    level: 4,
    race: "Spellcaster",
    attribute: "LIGHT",
    card_type: "monster"
  },
  {
    id: "41392891",
    name: "Démon Sauvage",
    name_en: "Feral Imp",
    type: "Normal Monster",
    desc: "Un petit démon agile qui attaque avec ses griffes.",
    atk: 1300,
    def: 1400,
    level: 4,
    race: "Fiend",
    attribute: "DARK",
    card_type: "monster"
  },
  {
    id: "32452818",
    name: "Guerrier Castor",
    name_en: "Beaver Warrior",
    type: "Normal Monster",
    desc: "Cette créature se retranche en défense lorsqu'elle combat dans la prairie.",
    atk: 1200,
    def: 1500,
    level: 4,
    race: "Beast-Warrior",
    attribute: "EARTH",
    card_type: "monster"
  },
  {
    id: "28279543",
    name: "Malédiction du Dragon",
    name_en: "Curse of Dragon",
    type: "Normal Monster",
    desc: "Un dragon malfaisant qui exploite les forces des ténèbres.",
    atk: 2000,
    def: 1500,
    level: 5,
    race: "Dragon",
    attribute: "DARK",
    card_type: "monster"
  },
  {
    id: "06368038",
    name: "Gaïa le Chevalier Implacable",
    name_en: "Gaia The Fierce Knight",
    type: "Normal Monster",
    desc: "Un chevalier dont le cheval voyage plus vite que le vent.",
    atk: 2300,
    def: 2100,
    level: 7,
    race: "Warrior",
    attribute: "EARTH",
    card_type: "monster"
  },
  {
    id: "48305365",
    name: "Assaillant à la Hache",
    name_en: "Axe Raider",
    type: "Normal Monster",
    desc: "Un guerrier maniant une hache avec une force extraordinaire.",
    atk: 1700,
    def: 1150,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",
    card_type: "monster"
  },
  {
    id: "64428736",
    name: "Épée de l'Alligator",
    name_en: "Alligator's Sword",
    type: "Normal Monster",
    desc: "Un alligator guerrier expert dans le maniement de l'épée.",
    atk: 1500,
    def: 1200,
    level: 4,
    race: "Beast",
    attribute: "EARTH",
    card_type: "monster"
  },
  {
    id: "44287299",
    name: "Masaki le Spadassin Légendaire",
    name_en: "Masaki the Legendary Swordsman",
    type: "Normal Monster",
    desc: "Un épéiste de légende reconnu pour ses attaques rapides.",
    atk: 1100,
    def: 1100,
    level: 4,
    race: "Warrior",
    attribute: "EARTH",
    card_type: "monster"
  },
  {
    id: "49791927",
    name: "Hache du Tigre",
    name_en: "Tiger Axe",
    type: "Normal Monster",
    desc: "Un guerrier tigre armé d'une hache redoutable.",
    atk: 1300,
    def: 1100,
    level: 4,
    race: "Beast-Warrior",
    attribute: "EARTH",
    card_type: "monster"
  }
];

// Normal Monsters provide canonical playable partners for the implemented
// Elemental HERO, Aqua/WATER and Fairy Field Spell interactions.
STARTER_CARDS.push(
  {
    id: '23115241', name: 'Anapelera, Sabre X', name_en: 'X-Saber Anu Piranha',
    type: 'Normal Monster', card_type: 'monster', archetype: 'X-Saber',
    race: 'Warrior', attribute: 'EARTH', level: 4, atk: 1800, def: 1100,
    desc: "Une guerrière Sabre X redoutée pour ses attaques félines et son sang-froid durant les batailles. Son ambition sans limite et ses assauts impitoyables provoquent la peur au plus profond de ses ennemis.",
    rulesSourceUrl: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=7821&request_locale=fr'
  },
  {
    id: '44430454', name: 'Chambellan des Six Samouraïs', name_en: 'Chamberlain of the Six Samurai',
    type: 'Normal Monster', card_type: 'monster', archetype: 'Six Samurai',
    race: 'Warrior', attribute: 'EARTH', level: 3, atk: 200, def: 2000,
    desc: "Ce silencieux et mystérieux guerrier est l'éminence grise qui aide en secret les Six Samouraïs. Personne ne connaît son passé, mais ses nombreuses cicatrices sont la preuve de son immense expérience.",
    rulesSourceUrl: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=7276&request_locale=fr'
  },
  {
    id: '81823360', name: 'Mégalobroyeur X', name_en: 'Megalosmasher X',
    type: 'Normal Monster', card_type: 'monster', race: 'Dinosaur', attribute: 'WATER',
    level: 4, atk: 2000, def: 0,
    desc: "Seule la phosphorescence de ce prédateur primitif à l'armure insonorisante et la mâchoire gargantuesque permettait à ses proies primitives d'en échapper.",
    rulesSourceUrl: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=13012&request_locale=fr'
  },
  {
    id: '43793530', name: 'Giga Gagagigo', name_en: 'Giga Gagagigo',
    type: 'Normal Monster', card_type: 'monster', race: 'Reptile', attribute: 'WATER',
    level: 5, atk: 2450, def: 1500,
    desc: "Afin de combattre un mal épouvantable, il a obtenu une puissance considérable par une reconstruction du corps, mais y a perdu son cœur et sa rédemption.",
    rulesSourceUrl: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=5871&request_locale=fr'
  },
  {
    id: '20721928', name: 'Sparkman, HÉROS Élémentaire', name_en: 'Elemental HERO Sparkman',
    type: 'Normal Monster', card_type: 'monster', archetype: 'Elemental HERO',
    race: 'Warrior', attribute: 'LIGHT', level: 4, atk: 1600, def: 1400,
    desc: "Un HÉROS Élémentaire et un guerrier de lumière capable de manier parfaitement toute une panoplie d'armes. Son Éclair de Haute Luminescence barre la route à l'infamie.",
    rulesSourceUrl: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=6313&request_locale=fr'
  },
  {
    id: '68638985', name: 'Crapaud Slime', name_en: 'Slime Toad',
    type: 'Normal Monster', card_type: 'monster', race: 'Aqua', attribute: 'WATER',
    level: 2, atk: 700, def: 500,
    desc: 'Dépôt visqueux à tête de grenouille, cette créature attaque dans un horrible croassement.',
    rulesSourceUrl: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=4555&request_locale=fr'
  },
  {
    id: '39552864', name: 'Sphère Mystique Lumineuse', name_en: 'Mystical Shine Ball',
    type: 'Normal Monster', card_type: 'monster', race: 'Fairy', attribute: 'LIGHT',
    level: 2, atk: 500, def: 500,
    desc: "Une âme de lumière recouverte d'une aura mystique. Si vous apercevez sa forme magnifique, votre souhait sera exaucé.",
    rulesSourceUrl: 'https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=2&cid=5949&request_locale=fr'
  }
);

for (const terrain of CLASSIC_FIELD_SPELLS) {
  const description = terrain.rulesText;
  STARTER_CARDS.push({
    id: terrain.id, name: terrain.name, name_en: terrain.name_en,
    type: 'Spell Card', card_type: 'spell', race: 'Field', attribute: 'SPELL',
    atk: 0, def: 0, level: 0, rulesText: description, desc: description,
    rulesSourceUrl: terrain.rulesSourceUrl, effectCode: 'CLASSIC_FIELD_STATS'
  });
}

for (const terrain of [...ADDITIONAL_FIELD_SPELLS, WETLANDS_FIELD_SPELL, ...TRANSVERSE_CONTINUOUS_FIELD_SPELLS, ...SCRIPTED_FIELD_SPELLS]) {
  STARTER_CARDS.push({
    id: terrain.id, name: terrain.name, name_en: terrain.name_en,
    type: 'Spell Card', card_type: 'spell', race: 'Field', attribute: 'SPELL',
    atk: 0, def: 0, level: 0, rulesText: terrain.rulesText, desc: terrain.rulesText,
    rulesSourceUrl: terrain.rulesSourceUrl, effectCode: terrain.effectCode || 'CLASSIC_FIELD_STATS'
  });
}

export function normalizeCardImageId(id) {
  const value = String(id ?? '');
  return /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, '') : value;
}

export function getCardImageUrl(id) {
  const terrain = CLASSIC_FIELD_SPELLS.find(card => card.id === normalizeCardImageId(id));
  if (terrain) {
    return `/environments/field-spells/${terrain.id}-${terrain.name_en.toLowerCase()}-original.webp`;
  }
  return `/cards/small/${normalizeCardImageId(id)}.jpg`;
}

export function getCardCroppedImageUrl(id) {
  if (CLASSIC_FIELD_SPELLS.some(card => card.id === normalizeCardImageId(id))) return getCardImageUrl(id);
  const normalized = normalizeCardImageId(id);
  if (nativeFieldImageIds.has(normalized) && !STARTER_CARDS.some(card => normalizeCardImageId(card.id) === normalized)) return `/environments/field-art/${normalized}.jpg`;
  return `/cards/cropped/${normalized}.jpg`;
}

export const EXTRA_DECK_CARDS = [
  {
    id: "23995346",
    name: "Dragon Ultime aux Yeux Bleus",
    name_en: "Blue-Eyes Ultimate Dragon",
    type: "Fusion Monster",
    desc: "\"Dragon Blanc aux Yeux Bleus\" + \"Dragon Blanc aux Yeux Bleus\" + \"Dragon Blanc aux Yeux Bleus\". (ATK 4500 / DEF 3800)",
    atk: 4500,
    def: 3800,
    level: 12,
    race: "Dragon",
    attribute: "LIGHT",
    card_type: "monster",
    extra_type: "fusion",
    belongsInExtraDeck: true,
    fusionMaterials: ["89631139", "89631139", "89631139"]
  },
  {
    id: "44508094",
    name: "Dragon Poussière d'Étoile",
    name_en: "Stardust Dragon",
    type: "Synchro Effect Monster",
    rulesText: "1 Syntoniseur + 1+ monstre non-Syntoniseur. Lorsqu'une carte ou un effet qui va détruire une ou plusieurs cartes sur le Terrain est activé (Effet Rapide) : vous pouvez Sacrifier cette carte ; annulez l'activation, et si vous le faites, détruisez-la. Durant la End Phase, si cet effet a été activé ce tour et n'a pas été annulé : vous pouvez Invoquer Spécialement cette carte depuis votre Cimetière.",
    desc: "1 Syntoniseur + 1 monstre non-Syntoniseur ou plus. (ATK 2500 / DEF 2000)",
    atk: 2500,
    def: 2000,
    level: 8,
    race: "Dragon",
    attribute: "WIND",
    card_type: "monster",
    extra_type: "synchro",
    belongsInExtraDeck: true,
    effectCode: "STARDUST_NEGATE_DESTRUCTION",
    timing: { event: "CHAIN_BUILDING", spellSpeed: 2, optional: true, usableInDamageStep: true,
      allowedDamageTimings: ["START_OF_DAMAGE_STEP", "BEFORE_DAMAGE_CALCULATION", "DURING_DAMAGE_CALCULATION", "AFTER_DAMAGE_CALCULATION", "END_OF_DAMAGE_STEP"] }
  },
  {
    id: "31924889",
    name: "Magicien des Arcanes",
    name_en: "Arcanite Magician",
    type: "Synchro Effect Monster",
    rulesText: "1 Syntoniseur + 1+ monstre non-Syntoniseur Magicien. Si cette carte est Invoquée par Synchronisation : placez 2 Compteurs Magie sur elle. Cette carte gagne 1000 ATK pour chaque Compteur Magie sur elle. Vous pouvez retirer 1 Compteur Magie d'une carte que vous contrôlez, puis ciblez 1 carte contrôlée par votre adversaire ; détruisez la cible.",
    desc: "1 Syntoniseur + 1 monstre non-Syntoniseur Magicien ou plus. Lors de son Invocation Synchro, il reçoit 2 Compteurs Magie et gagne 1000 ATK par compteur.",
    atk: 400,
    def: 1800,
    level: 7,
    race: "Spellcaster",
    attribute: "LIGHT",
    card_type: "monster",
    extra_type: "synchro",
    belongsInExtraDeck: true,
    effectCode: "ARCANITE_COUNTERS",
    synchroNonTunerRace: "Spellcaster"
  },
  {
    id: "84013237",
    name: "Numéro 39 : Utopie",
    name_en: "Number 39: Utopia",
    type: "Xyz Effect Monster",
    rulesText: "2 monstres de Niveau 4. Lorsqu'un monstre déclare une attaque : vous pouvez détacher 1 Matériel de cette carte ; annulez l'attaque. Si cette carte est ciblée par une attaque tant qu'elle n'a aucun Matériel : détruisez cette carte.",
    desc: "2 monstres de Niveau 4. Peut détacher 1 Matériel pour annuler une attaque.",
    atk: 2500,
    def: 2000,
    level: 0,
    rank: 4,
    race: "Warrior",
    attribute: "LIGHT",
    card_type: "monster",
    extra_type: "xyz",
    belongsInExtraDeck: true,
    xyzMaterialCount: 2,
    effectCode: "UTOPIA_NEGATE_ATTACK",
    timing: { event: "ATTACK_DECLARED", optional: true }
  },
  {
    id: "77637979",
    name: "LANphorhynchus",
    name_en: "LANphorhynchus",
    type: "Link Monster",
    rulesText: "2 monstres.",
    desc: "2 monstres. Monstre Lien-2 sans effet.",
    atk: 1200,
    def: 0,
    level: 0,
    race: "Cyberse",
    attribute: "LIGHT",
    card_type: "monster",
    extra_type: "link",
    belongsInExtraDeck: true,
    linkRating: 2,
    minimumMaterialCount: 2,
    maximumMaterialCount: 2,
    requiresEffectMonsters: false,
    linkArrows: ["bottom-left", "bottom-right"]
  }
];
