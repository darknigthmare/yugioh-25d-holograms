/**
 * Static visual catalogue for the official Field Spell snapshot.
 *
 * The card name is audit metadata only. Runtime lookup is deliberately and
 * exclusively keyed by the canonical numeric card ID/passcode.
 */

export const EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT = 336;

export const FIELD_SPELL_ENVIRONMENT_SNAPSHOT = Object.freeze({
  apiVersion: 'v7',
  retrievedOn: '2026-07-29',
  scope: 'Spell Card / Field, TCG and OCG catalogue'
});

export const FIELD_SPELL_ENVIRONMENT_IDS = Object.freeze([
  'yami',
  'umi',
  'forest',
  'sogen',
  'wasteland',
  'mountain',
  'cave',
  'swamp',
  'volcanic',
  'ice',
  'graveyard',
  'city-modern',
  'city-fantasy',
  'castle-palace',
  'temple-sanctuary',
  'arena-stadium',
  'theater-amusement',
  'industrial-lab',
  'mechanical-fortress',
  'digital-cyber',
  'cosmic-dimensional',
  'celestial-light',
  'toon-world',
  'generic'
]);

const RAW_FIELD_SPELL_ENVIRONMENT_CATALOG = [
  ['295517', 'A Legendary Ocean', 'umi'],
  ['77297908', 'Abyss Playhouse - Fantastic Theater', 'theater-amusement'],
  ['35956022', 'Acidic Downpour', 'swamp'],
  ['46552140', 'Adamancipator Laputite', 'cave'],
  ['12644061', 'Advanced Dark', 'yami'],
  ['31322640', 'Allure Palace', 'castle-palace'],
  ['33773528', 'Amazement Precious Park', 'theater-amusement'],
  ['712559', 'Amazoness Village', 'forest'],
  ['23160024', 'Amorphous Persona', 'generic'],
  ['34487429', 'Ancient City - Rainbow Ruins', 'city-fantasy'],
  ['87624166', 'Ancient Forest', 'forest'],
  ['17782288', 'Angelechy Problem', 'celestial-light'],
  ['3875465', 'Appliancer Electrilyrical World', 'digital-cyber'],
  ['63883999', 'Archfiend Palabyrinth', 'castle-palace'],
  ['90764871', 'Archfiend Strategy', 'yami'],
  ['2674965', 'Argostars - Home Stadium', 'arena-stadium'],
  ['5050644', 'Aroma Garden', 'sogen'],
  ['69296555', 'Array of Revealing Light', 'celestial-light'],
  ['74733322', 'Artmage Academic Arcane Arts Acropolis', 'city-fantasy'],
  ['2906939', 'Ashtrashen - Gateway to the Worlds Beyond', 'cosmic-dimensional'],
  ['38391684', 'Atlantis, City of the Sea Dragon', 'umi'],
  ['59048135', 'Augmented Heraldry', 'generic'],
  ['975299', 'B.E.F. Zelos', 'mechanical-fortress'],
  ['30761649', 'Barian Untopia', 'cosmic-dimensional'],
  ['64213017', 'Beetrooper Formation', 'forest'],
  ['100458006', 'Beresennet Em Heru', 'temple-sanctuary'],
  ['71645242', 'Black Garden', 'forest'],
  ['36668118', 'Boot Sector Launch', 'mechanical-fortress'],
  ['85668449', 'Brain Research Lab', 'industrial-lab'],
  ['69217334', 'Breaking of the World', 'cosmic-dimensional'],
  ['86643777', 'Bug Matrix', 'digital-cyber'],
  ['80749819', 'Call of the Forgotten', 'graveyard'],
  ['15635751', 'Camelot, Realm of Noble Knights and Noble Arms', 'castle-palace'],
  ['28120197', 'Canyon', 'wasteland'],
  ['22198672', 'Castle Link', 'castle-palace'],
  ['65959844', 'Catalyst Field', 'industrial-lab'],
  ['14289852', 'Catapult Zone', 'mechanical-fortress'],
  ['43912676', 'Celestia', 'celestial-light'],
  ['1801154', 'Centrifugal Field', 'industrial-lab'],
  ['94243005', 'Chaos Zone', 'cosmic-dimensional'],
  ['67616300', 'Chicken Game', 'arena-stadium'],
  ['81380218', 'Chorus of Sanctuary', 'temple-sanctuary'],
  ['4357063', 'Chronomaly City Babylon', 'city-fantasy'],
  ['33900648', 'Clear World', 'cosmic-dimensional'],
  ['75041269', 'Clock Tower Prison', 'city-modern'],
  ['78082039', 'Closed Forest', 'forest'],
  ['52518793', 'Colosseum - Cage of the Gladiator Beasts', 'arena-stadium'],
  ['69039982', 'Crusadia Revival', 'arena-stadium'],
  ['3576031', 'Crystolic Potential', 'industrial-lab'],
  ['81788994', 'Curse of the Shadow Prison', 'yami'],
  ['44352516', 'Cyberdark Inferno', 'industrial-lab'],
  ['42461852', 'Cynet Storm', 'digital-cyber'],
  ['61583217', 'Cynet Universe', 'digital-cyber'],
  ['23213239', 'Danger! Disturbance! Disorder!', 'forest'],
  ['53527835', 'Dark City', 'city-modern'],
  ['4663194', 'Dark City at Midnight', 'city-modern'],
  ['33814281', 'Dark Contract with Patent License', 'generic'],
  ['16625614', 'Dark Sanctuary', 'yami'],
  ['59687381', 'Defense Zone', 'generic'],
  ['3129133', 'Delta of Invitation', 'cosmic-dimensional'],
  ['12215894', 'Deskbot Base', 'industrial-lab'],
  ['99543666', 'Despia, Theater of the Branded', 'theater-amusement'],
  ['11808215', 'Dice Dungeon', 'cave'],
  ['41128647', 'Dinomic Powerload', 'mechanical-fortress'],
  ['12397569', 'Divine Domain Baatistina', 'temple-sanctuary'],
  ['53639887', 'Divine Temple of the Snake-Eye', 'temple-sanctuary'],
  ['15854426', 'Divine Wind of Mist Valley', 'mountain'],
  ['65589010', 'Dogmatika Nation', 'city-fantasy'],
  ['67331360', 'Doll House', 'theater-amusement'],
  ['84171830', 'Domain of the True Monarchs', 'castle-palace'],
  ['65938950', "Don't Slip, the Dogs of War", 'arena-stadium'],
  ['62265044', 'Dragon Ravine', 'mountain'],
  ['13035077', 'Dragonic Diagram', 'generic'],
  ['71817640', 'Dragonic Pendulum', 'generic'],
  ['7917970', 'Dragunity Divine Wind', 'mountain'],
  ['74665651', 'Dream Mirror of Joy', 'celestial-light'],
  ['1050355', 'Dream Mirror of Terror', 'yami'],
  ['26920296', 'Dreamland', 'toon-world'],
  ['58793369', 'Drytron Fafnir', 'cosmic-dimensional'],
  ['5833312', 'Duel Academy', 'city-modern'],
  ['91002901', 'Duel Evolution - Assault Zone', 'arena-stadium'],
  ['43940008', 'Duel Tower', 'arena-stadium'],
  ['19162134', 'Dueltaining', 'theater-amusement'],
  ['44710391', 'Earthbound Geoglyph', 'yami'],
  ['71089030', 'Earthbound Prison', 'yami'],
  ['60514625', 'Ecole de Zone', 'city-modern'],
  ['92223430', 'Elborz, the Sacred Lands of Simorgh', 'mountain'],
  ['54250060', 'Empowerment', 'generic'],
  ['17621695', 'Enneapolis', 'city-fantasy'],
  ['9547962', "Euler's Circuit", 'digital-cyber'],
  ['70122149', 'Evil Eye Domain - Pareidolia', 'castle-palace'],
  ['95376428', 'Extra Net', 'digital-cyber'],
  ['39838559', 'F.A. Circuit Grand Prix', 'arena-stadium'],
  ['1061200', 'F.A. City Grand Prix', 'arena-stadium'],
  ['2144946', 'F.A. Off-Road Grand Prix', 'arena-stadium'],
  ['56725612', 'Fairy Tail Ball', 'toon-world'],
  ['43236494', "Fairy Tale Prologue: Journey's Dawn", 'toon-world'],
  ['13301895', 'Fallen Paradise', 'yami'],
  ['65861210', 'Fallen Paradise of the Sacred Beasts', 'yami'],
  ['26162470', 'Fandora, the Flying Fighting Furtress', 'mechanical-fortress'],
  ['64400161', 'Fandora, the Flying Furtress', 'mechanical-fortress'],
  ['66750703', 'Fire Fortress atop Liang Peak', 'mountain'],
  ['57554544', 'Fire King Island', 'volcanic'],
  ['269510', 'Fire Prison', 'volcanic'],
  ['5063379', 'Flavian - Colosseum of the Gladiator Beasts', 'arena-stadium'],
  ['39730727', 'Flawless Perfection of the Tenyi', 'temple-sanctuary'],
  ['28126717', 'Floowandereeze and the Magnificent Map', 'toon-world'],
  ['87430998', 'Forest', 'forest'],
  ['91228233', 'Forest of Lost Flowers', 'forest'],
  ['86997073', 'Fortissimo the Mobile Fortress', 'mechanical-fortress'],
  ['33550694', 'Fusion Gate', 'cosmic-dimensional'],
  ['22829942', 'Fusion Recycling Plant', 'industrial-lab'],
  ['87902575', 'Future Visions', 'cosmic-dimensional'],
  ['56594520', 'Gaia Power', 'mountain'],
  ['2106266', 'Galloping Gaia', 'mountain'],
  ['40089744', 'Gateway to Chaos', 'cosmic-dimensional'],
  ['37694547', 'Geartown', 'industrial-lab'],
  ['38053381', 'Generaider Boss Stage', 'theater-amusement'],
  ['99795159', 'Ghostrick Mansion', 'castle-palace'],
  ['7617062', 'Ghostrick Museum', 'theater-amusement'],
  ['29400787', 'Ghostrick Parade', 'theater-amusement'],
  ['58012707', 'Giant Ballpark', 'arena-stadium'],
  ['74378580', 'GMX Lab #5', 'industrial-lab'],
  ['72283691', 'Golden Castle of Stromberg', 'castle-palace'],
  ['85638822', 'Gouki Cage Match', 'arena-stadium'],
  ['38057522', 'Grand Spiritual Art - Ichirin', 'temple-sanctuary'],
  ['60884672', 'Great Sand Sea - Gold Golgonda', 'wasteland'],
  ['50186558', 'Guardragon Shield', 'generic'],
  ['62200831', 'Gunkan Sushipyard Seaside Supper Spot', 'umi'],
  ['75782277', "Harpies' Hunting Ground", 'mountain'],
  ['17255673', 'Heavenly Gate of the Mikanko', 'temple-sanctuary'],
  ['3113667', 'Heavy Metal Raiders', 'mechanical-fortress'],
  ['70422863', 'Hexatellarknight', 'celestial-light'],
  ['94317736', 'Hidden Springs of the Far East', 'temple-sanctuary'],
  ['26232916', 'Hidden Village of Ninjitsu Arts', 'forest'],
  ['37654623', 'Hideout in the Sky, Coulomb', 'celestial-light'],
  ['7142724', 'Icejade Cenote Enion Cradle', 'ice'],
  ['59054773', 'Ignister A.I.Land', 'digital-cyber'],
  ['79555535', 'Ignition Phoenix', 'mechanical-fortress'],
  ['13482262', 'Impcantation Thanatosis', 'yami'],
  ['53039326', 'Iron Core Specimen Lab', 'industrial-lab'],
  ['14442329', 'JJ "Kewl Tune"', 'theater-amusement'],
  ['10080320', 'Jurassic World', 'forest'],
  ['89948817', 'Jurrac Volcano', 'volcanic'],
  ['22751868', 'Karakuri Showdown Castle', 'mechanical-fortress'],
  ['67237709', 'Kozmotown', 'cosmic-dimensional'],
  ['56111151', 'Kyoutou Waterfront', 'city-modern'],
  ['33407125', 'Labrynth Labyrinth', 'castle-palace'],
  ['34771947', 'Labyrinth Wall Shadow', 'cave'],
  ['59160188', 'Lair of Darkness', 'yami'],
  ['43034264', 'Laser Qlip', 'digital-cyber'],
  ['34103656', 'Lemuria, the Forgotten City', 'umi'],
  ['18890039', 'Libromancer First Appearance', 'city-modern'],
  ['73206827', 'Light Barrier', 'celestial-light'],
  ['35487920', 'Live☆Twin Channel', 'digital-cyber'],
  ['17228908', 'Lost World', 'forest'],
  ['81777047', 'Luminous Spark', 'celestial-light'],
  ['14001430', 'Madolche Chateau', 'toon-world'],
  ['26534688', 'Magellanica, the Deep Sea City', 'umi'],
  ['39910367', 'Magical Citadel of Endymion', 'city-fantasy'],
  ['47679935', 'Magical Meltdown', 'generic'],
  ['71650854', 'Magical Mid-Breaker Field', 'generic'],
  ['95477924', "Magician's Salvation", 'temple-sanctuary'],
  ['35815783', 'Magikey World', 'city-fantasy'],
  ['4740489', 'Magnetic Field', 'industrial-lab'],
  ['76473843', "Majesty's Pegasus", 'forest'],
  ['27564031', 'Malefic World', 'city-modern'],
  ['68337209', 'Maliss in Underground', 'digital-cyber'],
  ['36890111', 'Mansion of the Dreadful Dolls', 'castle-palace'],
  ['91027843', 'Marincess Battle Ocean', 'umi'],
  ['66059345', 'Materiactor Meltthrough', 'cosmic-dimensional'],
  ['80921533', 'Mausoleum of the Emperor', 'temple-sanctuary'],
  ['24382602', 'Mausoleum of White', 'temple-sanctuary'],
  ['84504242', 'Megalith Portal', 'temple-sanctuary'],
  ['44139064', 'Megaroid City', 'industrial-lab'],
  ['67328336', 'Meklord Fortress', 'mechanical-fortress'],
  ['43338320', 'Mementomictlan', 'graveyard'],
  ['46500985', 'Metamorformation', 'industrial-lab'],
  ['20720928', 'Metaphys Factor', 'cosmic-dimensional'],
  ['86809440', 'Mimighoul Dungeon', 'cave'],
  ['19384334', 'Molten Destruction', 'volcanic'],
  ['56074358', 'Morphtronic Map', 'digital-cyber'],
  ['269012', 'Mound of the Bound Creator', 'temple-sanctuary'],
  ['70222318', 'Mount Sylvania', 'forest'],
  ['50913601', 'Mountain', 'mountain'],
  ['885016', 'Multi-Universe', 'cosmic-dimensional'],
  ['76375976', 'Mystic Mine', 'cave'],
  ['18161786', 'Mystic Plasma Zone', 'yami'],
  ['34572613', 'Myutant Evolution Lab', 'industrial-lab'],
  ['37322745', 'Naturia Forest', 'forest'],
  ['47355498', 'Necrovalley', 'graveyard'],
  ['42015635', 'Neo Space', 'cosmic-dimensional'],
  ['56787189', 'New Frontier', 'sogen'],
  ['62314831', 'New World - Amritara', 'celestial-light'],
  ['93729896', 'Nightmare Throne', 'yami'],
  ['25807544', 'Noble Arms Museum', 'castle-palace'],
  ['55742055', 'Noble Knights of the Round Table', 'castle-palace'],
  ['15388353', 'Nouvelles Restaurant "At Table"', 'theater-amusement'],
  ['41418852', 'Numeron Network', 'digital-cyber'],
  ['3055018', 'Obsidim, the Ashened City', 'city-fantasy'],
  ['60448701', 'Ogdoadic Origin', 'swamp'],
  ['90011152', 'Ojama Country', 'toon-world'],
  ['26493435', 'Onomatopia', 'toon-world'],
  ['32354768', 'Oracle of Zefra', 'celestial-light'],
  ['90351981', 'Orcustrated Babel', 'mechanical-fortress'],
  ['60946968', 'Otherworld - The "A" Zone', 'cosmic-dimensional'],
  ['49370016', 'P.U.N.K. JAM Extreme Session', 'theater-amusement'],
  ['2819435', 'Pacifis, the Phantasm City', 'umi'],
  ['61557074', 'Palace of the Elemental Lords', 'castle-palace'],
  ['94585852', 'Pandemonium', 'yami'],
  ['82460246', 'Peaceful Planet Calarium', 'celestial-light'],
  ['13764602', 'Perfect Sync - A-Un', 'temple-sanctuary'],
  ['55553602', 'Performapal Dramatic Theater', 'theater-amusement'],
  ['93031067', 'Plunder Patroll Shipyarrrd', 'umi'],
  ['51669847', 'Plundered Power Patron Plane - Vidolia', 'cosmic-dimensional'],
  ['16269385', 'Prank-Kids Place', 'theater-amusement'],
  ['71832012', 'Pressured Planet Wraitsoth', 'wasteland'],
  ['77103950', 'Primeval Planet Perlereino', 'umi'],
  ['56063182', 'Primitive Planet Reichphobia', 'wasteland'],
  ['77584012', 'Pseudo Space', 'cosmic-dimensional'],
  ['575512', 'PSY-Frame Circuit', 'digital-cyber'],
  ['78710386', 'R.B. Funk Dock', 'mechanical-fortress'],
  ['79698395', 'Realm of Danger!', 'forest'],
  ['36099620', 'Realm of Light', 'celestial-light'],
  ['17000165', 'Reptilianne Recoil', 'swamp'],
  ['63899465', 'Rescue-ACE HQ', 'industrial-lab'],
  ['76136345', 'Revolving Switchyard', 'industrial-lab'],
  ['76869711', 'Rikka Konkon', 'forest'],
  ['45778932', 'Rising Air Current', 'celestial-light'],
  ['95658967', 'Ritual Sanctuary', 'temple-sanctuary'],
  ['92107604', 'Runick Fountain', 'city-fantasy'],
  ['55276522', 'Ryu-Ge War Zone', 'arena-stadium'],
  ['6798031', 'Ryzeal Cross', 'mechanical-fortress'],
  ['23377425', 'S-Force Bridgehead', 'digital-cyber'],
  ['73787254', 'Saber Vault', 'mountain'],
  ['24793135', 'Sacred Scrolls of the Gizmek Legend', 'temple-sanctuary'],
  ['1295111', 'Salamangreat Sanctuary', 'digital-cyber'],
  ['30336082', 'Sangen Summoning', 'volcanic'],
  ['1127737', 'Sargasso the D.D. Battlefield', 'cosmic-dimensional'],
  ['32391631', 'Savage Colosseum', 'arena-stadium'],
  ['28388296', 'Scrap Factory', 'industrial-lab'],
  ['68462976', 'Secret Village of the Spellcasters', 'forest'],
  ['39513225', "Seventh Barian's", 'cosmic-dimensional'],
  ['11102908', "Shien's Castle of Mist", 'castle-palace'],
  ['40005099', 'Shiranui Style Synthesis', 'graveyard'],
  ['4215636', 'Shrine of Mist Valley', 'temple-sanctuary'],
  ['27813661', 'Sky Iris', 'celestial-light'],
  ['50005218', 'Sky Striker Airspace - Area Zero', 'industrial-lab'],
  ['63035430', 'Skyscraper', 'city-modern'],
  ['47596607', 'Skyscraper 2 - Hero City', 'city-modern'],
  ['47870325', 'Smile Action', 'theater-amusement'],
  ['86318356', 'Sogen', 'sogen'],
  ['29650040', 'Solfachord Harmonia', 'theater-amusement'],
  ['81231742', 'Sorcerous Spell Wall', 'generic'],
  ['6909330', 'Soul Binding Gate', 'yami'],
  ['69408987', 'Spider Web', 'swamp'],
  ['60600821', 'Spring', 'sogen'],
  ['54631665', 'SPYRAL Resort', 'city-modern'],
  ['22555834', 'Stairway to a Fabled Realm', 'celestial-light'],
  ['41371602', 'Stand Up Centur-Ion!', 'mechanical-fortress'],
  ['1003840', 'Starlight Junktion', 'cosmic-dimensional'],
  ['58406094', 'Starry Knight Sky', 'celestial-light'],
  ['15306543', 'Stars Align Above the Shrine', 'temple-sanctuary'],
  ['20212491', 'Stray Purrely Street', 'toon-world'],
  ['97254001', 'Summer', 'sogen'],
  ['18114794', 'Summon Breaker', 'generic'],
  ['48015771', 'Summon Over', 'generic'],
  ['10424147', 'Super Quantal Mech Ship Magnacarrier', 'mechanical-fortress'],
  ['72043279', "Supreme King's Castle", 'castle-palace'],
  ['75304793', 'Symph Amplifire', 'theater-amusement'],
  ['36742774', 'Synchro World', 'cosmic-dimensional'],
  ['34225426', 'Tearlaments Perlegia', 'umi'],
  ['92481084', "Temple of the Mind's Eye", 'temple-sanctuary'],
  ['53819808', 'Temple of the Six', 'temple-sanctuary'],
  ['9597987', 'Tenchi Kaimei', 'temple-sanctuary'],
  ['77946022', 'Tenyinfinity', 'celestial-light'],
  ['33017655', 'The Gates of Dark World', 'yami'],
  ['33981008', 'The Grand Spellbook Tower', 'city-fantasy'],
  ['5697558', 'The Hidden City', 'cave'],
  ['8794055', 'The Most Distant, Deepest Depths', 'umi'],
  ['50433147', 'The Nordic Lights', 'celestial-light'],
  ['56433456', 'The Sanctuary in the Sky', 'celestial-light'],
  ['48179391', 'The Seal of Orichalcos', 'yami'],
  ['18720257', 'The Weather Forecast', 'celestial-light'],
  ['84792926', 'Therion Discolosseum', 'arena-stadium'],
  ['20216608', 'Tilted Try', 'arena-stadium'],
  ['43175858', 'Toon Kingdom', 'toon-world'],
  ['7293697', 'Toon World the Perfect World', 'toon-world'],
  ['12801833', 'Traptrip Garden', 'forest'],
  ['69299029', 'Treasures of the Kings', 'temple-sanctuary'],
  ['45383307', 'Triamid Cruiser', 'wasteland'],
  ['9989792', 'Triamid Fortress', 'wasteland'],
  ['72772445', 'Triamid Kingolem', 'wasteland'],
  ['63492244', 'Trickstar Light Arena', 'theater-amusement'],
  ['35371948', 'Trickstar Light Stage', 'theater-amusement'],
  ['51208046', 'Trickstar Live Stage', 'theater-amusement'],
  ['12931061', 'U.A. Hyper Stadium', 'arena-stadium'],
  ['19814508', 'U.A. Stadium', 'arena-stadium'],
  ['22702055', 'Umi', 'umi'],
  ['82999629', 'Umiiruka', 'umi'],
  ['66399653', 'Union Hangar', 'industrial-lab'],
  ['89264428', 'Ursarctic Big Dipper', 'cosmic-dimensional'],
  ['39210885', 'Vaalmonica, the Agathokakological Voice', 'celestial-light'],
  ['62188962', 'Vampire Kingdom', 'graveyard'],
  ['35550352', 'Vanquish Soul, Start!', 'arena-stadium'],
  ['75952542', 'Vaylantz World - Konig Wissen', 'mechanical-fortress'],
  ['49568943', 'Vaylantz World - Shinra Bansho', 'forest'],
  ['76871889', 'Vendread Nights', 'graveyard'],
  ['54306223', 'Venom Swamp', 'swamp'],
  ['7206349', 'Vernusylph in Full Bloom', 'sogen'],
  ['34822850', 'Void Expansion', 'cosmic-dimensional'],
  ['26984177', 'Walls of the Imperial Tomb', 'temple-sanctuary'],
  ['45943516', 'War Rock Mountain', 'mountain'],
  ['23424603', 'Wasteland', 'wasteland'],
  ['58924378', 'Wattcastle', 'mechanical-fortress'],
  ['91880660', "Way Where There's a Will", 'celestial-light'],
  ['63017368', 'Wedju Temple', 'temple-sanctuary'],
  ['2084239', 'Wetlands', 'swamp'],
  ['84335863', 'White Rose Cloister', 'forest'],
  ['4398189', 'Witch of the White Forest', 'forest'],
  ['32353566', 'Witchcrafter Walpurgis', 'city-fantasy'],
  ['90173539', 'World Dino Wrestling', 'arena-stadium'],
  ['61654098', 'World Legacy Discovery', 'forest'],
  ['67831115', 'World Legacy in Shadow', 'cave'],
  ['35546670', 'World Legacy Scars', 'wasteland'],
  ['25163979', "World Legacy's Nightmare", 'yami'],
  ['5414777', 'World of Spirits', 'celestial-light'],
  ['32999573', 'Xyz Override', 'cosmic-dimensional'],
  ['4545854', 'Xyz Territory', 'cosmic-dimensional'],
  ['59197169', 'Yami', 'yami'],
  ['93360904', 'Yummyusment★Acroquey', 'theater-amusement'],
  ['66975205', 'Yummyusment☆Mignon', 'theater-amusement'],
  ['64230128', 'Zaralaam the Dark Palace', 'castle-palace'],
  ['95856586', 'Zexal Field', 'cosmic-dimensional'],
  ['675319', 'Zodiac Sign', 'celestial-light'],
  ['4064256', 'Zombie World', 'graveyard']
];

function normalizeCatalogCardId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d{1,12}$/.test(normalized)) return null;
  return normalized.replace(/^0+(?=\d)/, '');
}

function buildCatalog(rawCatalog) {
  const validEnvironmentIds = new Set(FIELD_SPELL_ENVIRONMENT_IDS);
  const seenCardIds = new Set();
  const catalog = [];

  for (const rawEntry of rawCatalog) {
    if (!Array.isArray(rawEntry) || rawEntry.length !== 3) {
      throw new TypeError('Each Field Spell environment entry must contain ID, name and environment ID.');
    }
    const [rawCardId, rawName, rawEnvironmentId] = rawEntry;
    const cardId = normalizeCatalogCardId(rawCardId);
    const name = String(rawName ?? '').trim();
    const environmentId = String(rawEnvironmentId ?? '').trim().toLowerCase();

    if (!cardId) throw new TypeError(`Invalid Field Spell card ID: ${rawCardId}`);
    if (seenCardIds.has(cardId)) throw new TypeError(`Duplicate Field Spell card ID: ${cardId}`);
    if (!name) throw new TypeError(`Missing Field Spell name for card ID: ${cardId}`);
    if (!validEnvironmentIds.has(environmentId)) {
      throw new TypeError(`Unknown Field Spell environment ID: ${environmentId}`);
    }

    seenCardIds.add(cardId);
    catalog.push(Object.freeze({ cardId, name, environmentId }));
  }

  if (catalog.length !== EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT) {
    throw new RangeError(
      `Expected ${EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT} Field Spells, received ${catalog.length}.`
    );
  }
  return Object.freeze(catalog);
}

export const FIELD_SPELL_ENVIRONMENT_CATALOG = buildCatalog(
  RAW_FIELD_SPELL_ENVIRONMENT_CATALOG
);

export const FIELD_SPELL_ENVIRONMENT_COUNT =
  FIELD_SPELL_ENVIRONMENT_CATALOG.length;

const catalogEntryByCardId = new Map(
  FIELD_SPELL_ENVIRONMENT_CATALOG.map(entry => [entry.cardId, entry])
);

export const FIELD_SPELL_CARD_IDS_BY_ENVIRONMENT = Object.freeze(
  Object.fromEntries(FIELD_SPELL_ENVIRONMENT_IDS.map(environmentId => [
    environmentId,
    Object.freeze(FIELD_SPELL_ENVIRONMENT_CATALOG
      .filter(entry => entry.environmentId === environmentId)
      .map(entry => entry.cardId))
  ]))
);

export function getFieldSpellEnvironmentCatalogEntry(cardId) {
  const normalizedCardId = normalizeCatalogCardId(cardId);
  return normalizedCardId ? catalogEntryByCardId.get(normalizedCardId) || null : null;
}

export function getCatalogEnvironmentIdForCardId(cardId) {
  return getFieldSpellEnvironmentCatalogEntry(cardId)?.environmentId || null;
}

export function validateFieldSpellEnvironmentCatalog() {
  const groupedCardIds = FIELD_SPELL_ENVIRONMENT_IDS.flatMap(
    environmentId => FIELD_SPELL_CARD_IDS_BY_ENVIRONMENT[environmentId]
  );
  const groupedUniqueCardIds = new Set(groupedCardIds);
  return Object.freeze({
    valid: (
      FIELD_SPELL_ENVIRONMENT_COUNT === EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT
      && groupedCardIds.length === FIELD_SPELL_ENVIRONMENT_COUNT
      && groupedUniqueCardIds.size === FIELD_SPELL_ENVIRONMENT_COUNT
    ),
    count: FIELD_SPELL_ENVIRONMENT_COUNT,
    uniqueCardIdCount: groupedUniqueCardIds.size,
    environmentCount: FIELD_SPELL_ENVIRONMENT_IDS.length
  });
}

export default FIELD_SPELL_ENVIRONMENT_CATALOG;
