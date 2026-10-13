/**
 * Named, deliberately curated anime silhouettes. This is a roster of 192
 * selectable appearances across the eight television series, not a claim to
 * list every extra or every transformation. Descriptions and structural
 * choices are explicit per appearance; no random character generation occurs.
 */
export const DEFAULT_DUELIST_AVATAR_ID = 'yugi';

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freezeDeep);
  return Object.freeze(value);
}

export const DUELIST_SERIES = freezeDeep([
  { id: 'dm', label: 'Duel Monsters' },
  { id: 'gx', label: 'GX' },
  { id: '5ds', label: "5D’s" },
  { id: 'zexal', label: 'ZEXAL' },
  { id: 'arc-v', label: 'ARC-V' },
  { id: 'vrains', label: 'VRAINS' },
  { id: 'sevens', label: 'SEVENS' },
  { id: 'go-rush', label: 'GO RUSH!!' }
]);

// Tuple fields: id, name, aliases, description, hair, outfit, accessory,
// hair colour, outfit colour, accent, height, build, pose, shape variant,
// unlock, optional skin colour, optional second hair colour.
// Unlock thresholds consume existing local statistics and campaign medals.
const ROSTER = {
  dm: [
    ['yugi', 'Yugi Muto', 'Yûgi Mutô|Yugi Moto', 'Petite stature, mèches étoilées tricolores et Puzzle du Millénium.', 'star', 'school', 'puzzle', '#25152d', '#273b66', '#e9b746', 0.93, 'slim', 'ready', 0, 'starter', '#f4c5a9', '#e9b746'],
    ['atem', 'Atem', 'Yami Yugi|Pharaon|Yûgi des ténèbres', 'Chevelure étoilée, posture droite et cape de pharaon.', 'star', 'robe', 'cape', '#2b1833', '#f6ede0', '#d7ae38', 1.05, 'slim', 'confident', 1, 'medals:12', '#c78d66', '#e6b844'],
    ['kaiba', 'Seto Kaiba', 'Seto', 'Long manteau blanc aux épaules larges et cheveux châtains courts.', 'short', 'long-coat', 'none', '#6c452c', '#eef3f8', '#253a75', 1.19, 'slim', 'confident', 2, 'starter'],
    ['joey', 'Joey Wheeler', 'Jônouchi Katsuya|Katsuya Jonouchi|Joey', 'Frange blonde rabattue et veste verte ouverte.', 'swept', 'school', 'none', '#eec056', '#3c9470', '#f4f0e0', 1.06, 'average', 'energetic', 3, 'starter'],
    ['tea', 'Téa Gardner', 'Tea Gardner|Anzu Mazaki|Anzu', 'Carré châtain et uniforme scolaire à jupe.', 'bob', 'dress', 'none', '#713d33', '#d77d92', '#f4e7df', 1.02, 'slim', 'calm', 4, 'starter'],
    ['tristan', 'Tristan Taylor', 'Hiroto Honda|Honda', 'Haute mèche brune et large veste scolaire.', 'swept', 'school', 'none', '#60402c', '#a88555', '#f0e6d5', 1.12, 'broad', 'ready', 5, 'duels:3'],
    ['serenity', 'Serenity Wheeler', 'Shizuka Kawai|Shizuka Jônouchi', 'Longs cheveux auburn et robe claire sans manteau.', 'long', 'dress', 'none', '#a55b3c', '#efc6bd', '#fbede1', 0.98, 'slim', 'calm', 6, 'duels:5'],
    ['mokuba', 'Mokuba Kaiba', 'Mokuba', 'Petite stature et chevelure noire ébouriffée très longue.', 'long', 'sport', 'necklace', '#252533', '#e5bd46', '#487d90', 0.87, 'slim', 'energetic', 7, 'wins:1'],
    ['mai', 'Mai Valentine', 'Mai Kujaku|Maï Valentine', 'Longue chevelure blonde, haut violet et bottes hautes.', 'long', 'jacket', 'none', '#ebc664', '#813e98', '#f1d8b9', 1.07, 'slim', 'confident', 8, 'wins:3'],
    ['pegasus', 'Maximillion Pegasus', 'Pegasus J. Crawford|Pégasus', 'Longs cheveux argentés masquant un œil et costume rouge.', 'long', 'suit', 'necklace', '#d9d9e1', '#a6313c', '#ecd8ae', 1.15, 'slim', 'calm', 9, 'medals:6'],
    ['bakura', 'Ryou Bakura', 'Ryô Bakura|Bakura', 'Cheveux blancs souples et tenue scolaire bleue.', 'swept', 'school', 'necklace', '#eee9e4', '#627ba3', '#e5dfc9', 1.01, 'slim', 'calm', 10, 'duels:8'],
    ['yami-bakura', 'Bakura des ténèbres', 'Yami Bakura|Dark Bakura', 'Mèches blanches acérées et Anneau du Millénium.', 'star', 'long-coat', 'necklace', '#eee9e4', '#44314f', '#d9ae45', 1.06, 'slim', 'confident', 11, 'wins:12'],
    ['marik', 'Marik Ishtar', 'Malik Ishtar|Marik', 'Cheveux blonds hérissés et cape lilas.', 'star', 'robe', 'cape', '#d9bd76', '#aa82bd', '#ddb140', 1.06, 'slim', 'ready', 12, 'mission:tribute-investment', '#cb986e'],
    ['yami-marik', 'Marik des ténèbres', 'Yami Marik|Yami Malik', 'Grandes pointes blondes, torse sombre et collier doré.', 'star', 'jacket', 'necklace', '#dac477', '#3d3147', '#d5aa39', 1.1, 'average', 'confident', 13, 'wins:20', '#c38c67'],
    ['ishizu', 'Ishizu Ishtar', 'Isis Ishtar', 'Long voile blanc, chevelure noire et Collier du Millénium.', 'long', 'robe', 'necklace', '#26212b', '#f3efe4', '#d4ad40', 1.08, 'slim', 'calm', 14, 'medals:9', '#c6936b'],
    ['odion', 'Odion', 'Rishid Ishtar|Rishid', 'Crâne rasé, forte carrure et robe brune.', 'bald', 'robe', 'none', '#4c352d', '#78624b', '#d2ae51', 1.24, 'broad', 'calm', 15, 'wins:8', '#987052'],
    ['weevil', 'Weevil Underwood', 'Insector Haga|Haga', 'Petite taille, coupe bleu-vert arrondie, lunettes rondes et manteau vert.', 'bob', 'long-coat', 'glasses', '#75b6a9', '#3d7b58', '#e9d276', 0.9, 'slim', 'confident', 0, 'duels:6'],
    ['rex', 'Rex Raptor', 'Dinosaur Ryuzaki|Ryûzaki', 'Chevelure brune à mèche lavande, casquette rouge et veste verte.', 'long', 'jacket', 'hat', '#80664a', '#427558', '#ebe1c4', 1.01, 'average', 'ready', 1, 'duels:7', '#f3c4a5', '#a494b6'],
    ['bandit-keith', 'Bandit Keith', 'Keith Howard', 'Carrure massive, lunettes noires et bandana étoilé.', 'short', 'jacket', 'headband', '#b99a65', '#232938', '#d74145', 1.2, 'broad', 'confident', 2, 'wins:6'],
    ['bonz', 'Bonz', 'Ghost Kotsuzuka|Kotsuzuka', 'Petit corps voûté, cheveux bleu nuit hérissés, veste jaune et teint gris.', 'star', 'jacket', 'none', '#34384f', '#b5b674', '#777b53', 0.87, 'slim', 'calm', 3, 'duels:12', '#b4b0ad'],
    ['mako', 'Mako Tsunami', 'Ryota Kajiki|Ryôta', 'Cheveux noirs pointus, bandeau blanc et tenue de pêcheur.', 'star', 'sport', 'headband', '#252831', '#4374a3', '#f0e5cf', 1.06, 'average', 'energetic', 4, 'mission:terrain-reading', '#cd9b76'],
    ['espa-roba', 'Espa Roba', 'Esper Roba|Esparoba', 'Frange vert menthe symétrique et combinaison rose à col haut.', 'swept', 'uniform', 'earpiece', '#99c2ad', '#b67892', '#e1dbbb', 1.01, 'slim', 'ready', 5, 'duels:15'],
    ['duke', 'Duke Devlin', 'Ryuji Otogi|Ryûji Otogi', 'Queue-de-cheval noire et bandeau rouge.', 'ponytail', 'jacket', 'headband', '#292633', '#303746', '#b83843', 1.09, 'slim', 'confident', 6, 'wins:5'],
    ['rebecca', 'Rebecca Hawkins', 'Rebecca Hopkins', 'Couettes blondes, lunettes et petite silhouette.', 'twin-tail', 'dress', 'glasses', '#e4bf61', '#b9659a', '#f2e5d9', 0.86, 'slim', 'energetic', 7, 'medals:3'],
    ['arthur-hawkins', 'Arthur Hawkins', 'Arthur Hopkins', 'Cheveux blancs courts, lunettes et costume de chercheur.', 'short', 'suit', 'glasses', '#e5e0d5', '#8c816e', '#e8d8bc', 1.08, 'average', 'calm', 8, 'duels:25'],
    ['dartz', 'Dartz', 'Darts', 'Longue chevelure turquoise, manteau ample et ornement frontal.', 'long', 'robe', 'headband', '#8ecbbb', '#ddd8d4', '#cbb965', 1.18, 'slim', 'calm', 9, 'medals:24'],
    ['rafael', 'Rafael', 'Raphaël', 'Carrure musclée, cheveux blonds relevés et manteau sans manches.', 'swept', 'long-coat', 'none', '#d3b16c', '#556169', '#af9465', 1.23, 'broad', 'ready', 10, 'wins:15', '#c28f67'],
    ['solomon', 'Solomon Muto', 'Sugoroku Mutô|Grand-père de Yugi', 'Moustache, cheveux gris et petit chapeau vert.', 'short', 'sport', 'hat', '#b7b7ae', '#718652', '#d3b060', 0.96, 'average', 'calm', 11, 'mission:first-formation']
  ],
  gx: [
    ['jaden', 'Jaden Yuki', 'Judai Yuki|Jûdai Yûki', 'Cheveux bruns à mèches orangées, veste rouge de Slifer et pantalon gris.', 'swept', 'jacket', 'none', '#77472f', '#a63435', '#eee5d8', 1.02, 'average', 'energetic', 0, 'starter', '#f3c4a5', '#b97942'],
    ['syrus', 'Syrus Truesdale', 'Sho Marufuji|Shô', 'Petit gabarit, cheveux bleu clair et lunettes rondes.', 'bob', 'school', 'glasses', '#82b9d0', '#b14a47', '#f0dfce', 0.87, 'slim', 'calm', 1, 'duels:3'],
    ['zane', 'Zane Truesdale', 'Ryo Marufuji|Ryô Marufuji|Hell Kaiser', 'Longue frange bleu sombre et manteau noir ajusté.', 'long', 'long-coat', 'none', '#314251', '#262833', '#888796', 1.13, 'slim', 'confident', 2, 'wins:8'],
    ['alexis', 'Alexis Rhodes', 'Asuka Tenjoin|Asuka Tenjôin', 'Longs cheveux blonds et uniforme blanc d’Obelisk à jupe.', 'long', 'dress', 'none', '#d4b576', '#e9eef3', '#4b79aa', 1.06, 'slim', 'ready', 3, 'wins:3'],
    ['chazz', 'Chazz Princeton', 'Jun Manjoume|Manjôme', 'Pointes noires très hautes et manteau noir.', 'star', 'long-coat', 'none', '#222330', '#30343d', '#858793', 1.07, 'slim', 'confident', 4, 'wins:5'],
    ['bastion', 'Bastion Misawa', 'Daichi Misawa', 'Coupe brune sobre et veste jaune de Ra.', 'short', 'school', 'none', '#4b3a2e', '#d3b552', '#eee3c8', 1.07, 'average', 'calm', 5, 'mission:hold-the-line'],
    ['chumley', 'Chumley Huffington', 'Hayato Maeda', 'Carrure ronde, cheveux bruns courts et veste rouge.', 'short', 'jacket', 'none', '#71553b', '#b14b45', '#efddc4', 1.04, 'broad', 'calm', 6, 'duels:5'],
    ['atticus', 'Atticus Rhodes', 'Fubuki Tenjoin|Fubuki Tenjôin', 'Longue frange châtaine et veste blanche à col haut.', 'swept', 'uniform', 'none', '#945a3f', '#eceef0', '#5782b1', 1.12, 'slim', 'energetic', 7, 'duels:12'],
    ['blair', 'Blair Flannigan', 'Rei Saotome', 'Longue chevelure bleu sombre, veste rouge de Slifer et tenue kaki.', 'long', 'jacket', 'none', '#344263', '#ad4745', '#b9ad79', 0.9, 'slim', 'energetic', 8, 'duels:8'],
    ['aster', 'Aster Phoenix', 'Edo Phoenix|Ed Phoenix', 'Chevelure gris lavande et costume blanc.', 'swept', 'suit', 'none', '#b9b3c8', '#e9e9ed', '#45657c', 1.1, 'slim', 'confident', 9, 'wins:12'],
    ['jesse', 'Jesse Anderson', 'Johan Andersen|Johan', 'Cheveux turquoise et veste bleue ouverte.', 'swept', 'jacket', 'none', '#328f97', '#365f98', '#eff0e3', 1.05, 'slim', 'energetic', 10, 'mission:three-dragons'],
    ['jim', 'Jim Crocodile Cook', 'Jim Cook', 'Chapeau de brousse, chevelure brune et foulard rouge.', 'long', 'jacket', 'hat', '#927650', '#a99562', '#a84935', 1.16, 'average', 'calm', 11, 'duels:20', '#c99870'],
    ['axel', 'Axel Brodie', 'Austin O’Brien|Austin OBrien', 'Dreadlocks sombres, bandeau avec lunettes, gilet tactique brun et haut rouge.', 'braided', 'jacket', 'goggles', '#393b3a', '#786a4f', '#ab4844', 1.13, 'broad', 'ready', 12, 'wins:10', '#9f7551'],
    ['adrian', 'Adrian Gecko', 'Amon Garam', 'Cheveux roux anguleux et veste blanche.', 'swept', 'uniform', 'none', '#b55c35', '#edf0ea', '#538ba5', 1.15, 'average', 'confident', 13, 'medals:15'],
    ['crowler', 'Vellian Crowler', 'Chronos de Medici|Dr. Crowler', 'Longs cheveux blonds bouclés et uniforme bleu à col large.', 'long', 'uniform', 'none', '#d1b16c', '#477cb2', '#e9dcc5', 1.12, 'average', 'confident', 14, 'medals:3'],
    ['banner', 'Lyman Banner', 'Daitokuji|Professeur Banner', 'Cheveux noirs attachés, lunettes et blouse claire.', 'ponytail', 'robe', 'glasses', '#333036', '#d9d7c7', '#52646e', 1.11, 'slim', 'calm', 15, 'duels:15'],
    ['sheppard', 'Sheppard', 'Samejima|Chancelier Sheppard', 'Crâne rasé, barbe grise et tenue professorale blanche.', 'bald', 'suit', 'none', '#c3c3bd', '#edeee9', '#72849a', 1.1, 'broad', 'calm', 0, 'duels:25'],
    ['sartorius', 'Sartorius Kumar', 'Saiou Takuma|Saiô', 'Longs cheveux violets et manteau blanc du culte.', 'long', 'long-coat', 'necklace', '#61506b', '#eee9dd', '#b39851', 1.19, 'slim', 'confident', 1, 'medals:18'],
    ['yubel', 'Yubel', 'Esprit de Yubel', 'Chevelure blanche et violette, cornes et silhouette ailée.', 'long', 'armor', 'wings', '#d8d2e6', '#514262', '#aa7183', 1.12, 'slim', 'confident', 2, 'medals:30', '#c8bbc6', '#75538a'],
    ['camula', 'Camula', 'Vampire Camula', 'Longue chevelure verte et robe rouge de vampire.', 'long', 'dress', 'necklace', '#6d8b76', '#842a45', '#d7b9a2', 1.12, 'slim', 'confident', 3, 'wins:15', '#ddc8c8'],
    ['titan', 'Titan', 'Shadow Rider Titan', 'Grand manteau rouge, chapeau et masque de duelliste.', 'helmet', 'long-coat', 'hat', '#382d3b', '#863d4c', '#dfc483', 1.24, 'broad', 'confident', 4, 'wins:6'],
    ['tania', 'Tania', 'Amazoness Tania', 'Carrure d’Amazonesse, longue natte rouge et armure légère.', 'braided', 'armor', 'headband', '#a44839', '#b8a76c', '#684f43', 1.23, 'broad', 'ready', 5, 'wins:9', '#b77e55'],
    ['kagemaru', 'Kagemaru', 'Chairman Kagemaru', 'Chevelure claire hérissée et tenue sombre du président rajeuni.', 'swept', 'suit', 'none', '#c1b49b', '#374150', '#99aaad', 1.17, 'broad', 'confident', 6, 'wins:25'],
    ['dimitri', 'Dimitri', 'Kagurazaka', 'Petite coupe violette et veste bleue de l’Académie.', 'swept', 'school', 'none', '#675685', '#4565a0', '#ede2d4', 0.99, 'slim', 'ready', 7, 'duels:18'],
    ['trueman', 'Trueman', 'Mr. T|Monsieur T', 'Costume noir, cheveux lissés et lunettes sombres.', 'short', 'suit', 'glasses', '#22252a', '#292b34', '#aab0ba', 1.16, 'average', 'calm', 8, 'wins:30'],
    ['abidos', 'Abidos III', 'Abidos le Troisième', 'Coiffe de pharaon, large collier et robe cérémonielle.', 'helmet', 'robe', 'necklace', '#2b3443', '#e4d9ba', '#c69b38', 1.16, 'average', 'confident', 9, 'medals:21', '#be8960'],
    ['don-zaloog', 'Don Zaloog', 'Dark Scorpion Don Zaloog', 'Cheveux violets, bandeau de pirate et manteau vert.', 'long', 'long-coat', 'headband', '#846390', '#526c54', '#af5749', 1.17, 'broad', 'energetic', 10, 'duels:30', '#c29775'],
    ['alice', 'Alice', 'Alice la poupée|Doll Alice', 'Longs cheveux clairs, grande robe mauve et ruban.', 'long', 'dress', 'headband', '#d2c5b4', '#aa829d', '#e8d6cd', 0.97, 'slim', 'calm', 11, 'duels:22']
  ],
  '5ds': [
    ['yusei', 'Yusei Fudo', 'Yûsei Fudô', 'Pointes noires à mèches jaunes et veste de pilote bleue.', 'star', 'jacket', 'none', '#202633', '#32586e', '#e5b54f', 1.11, 'slim', 'ready', 0, 'starter', '#efbc99', '#d9ad49'],
    ['jack', 'Jack Atlas', 'Jack', 'Mèches blondes hautes et long manteau blanc.', 'swept', 'long-coat', 'none', '#d9ba65', '#e9e8ee', '#7f629d', 1.23, 'average', 'confident', 1, 'wins:5'],
    ['crow', 'Crow Hogan', 'Crow', 'Cheveux orange en crête, bandeau bleu et veste brune.', 'mohawk', 'jacket', 'headband', '#d67c36', '#574c46', '#bd9c71', 1.0, 'average', 'energetic', 2, 'duels:5'],
    ['akiza', 'Akiza Izinski', 'Aki Izayoi|Aki', 'Chevelure bordeaux au carré et robe corsetée.', 'bob', 'dress', 'necklace', '#84344d', '#95445a', '#eadfc8', 1.07, 'slim', 'calm', 3, 'wins:3'],
    ['leo', 'Leo', 'Rua|Lua', 'Petit gabarit, cheveux verts en queue-de-cheval et veste jaune.', 'ponytail', 'sport', 'none', '#6e9e68', '#c5b461', '#e9e4ce', 0.87, 'slim', 'energetic', 4, 'duels:3'],
    ['luna', 'Luna', 'Ruka|Luca', 'Deux petites couettes vertes et robe claire.', 'twin-tail', 'dress', 'none', '#6c9d69', '#d3dbc9', '#d796a0', 0.86, 'slim', 'calm', 5, 'medals:3'],
    ['kalin', 'Kalin Kessler', 'Kiryu Kyosuke|Kiryû Kyôsuke', 'Longues mèches grises et manteau sombre sans manches.', 'long', 'long-coat', 'none', '#b1afbd', '#3e354a', '#838398', 1.16, 'slim', 'confident', 6, 'wins:12'],
    ['carly', 'Carly Carmine', 'Carly Nagisa|Carly', 'Longs cheveux noirs, grosses lunettes rondes et gilet orange de journaliste.', 'long', 'jacket', 'glasses', '#2a2837', '#b87a4a', '#b4c8dd', 1.01, 'slim', 'energetic', 7, 'duels:8'],
    ['mina', 'Mina Simington', 'Mikage Sagiri', 'Cheveux bleus attachés et uniforme d’assistante.', 'ponytail', 'suit', 'none', '#5275a1', '#6b7390', '#eee9e0', 1.09, 'slim', 'calm', 8, 'duels:10'],
    ['trudge', 'Trudge', 'Tetsu Ushio|Tetsu Trudge|Ushio', 'Carrure massive, cheveux bruns relevés et uniforme de sécurité.', 'short', 'uniform', 'none', '#493b30', '#344954', '#e5be52', 1.24, 'broad', 'ready', 9, 'wins:6'],
    ['greiger', 'Greiger', 'Bommer', 'Très large silhouette, cheveux noirs et manteau rouge.', 'short', 'long-coat', 'none', '#34302d', '#8b4141', '#caa877', 1.25, 'broad', 'calm', 10, 'medals:6', '#a77654'],
    ['devack', 'Devack', 'Demak', 'Cheveux violets dressés et manteau de Signer sombre.', 'star', 'long-coat', 'necklace', '#696189', '#46394d', '#b096a4', 1.21, 'broad', 'confident', 11, 'wins:9', '#ab947e'],
    ['misty', 'Misty Tredwell', 'Misty Lola', 'Longue chevelure noire et robe sombre ajustée.', 'long', 'dress', 'necklace', '#292f37', '#44535b', '#9a6f91', 1.13, 'slim', 'calm', 12, 'wins:10'],
    ['roman', 'Roman Goodwin', 'Rudger Goodwin', 'Longs cheveux gris, large manteau et bras mécanique.', 'long', 'long-coat', 'none', '#b5b3b1', '#645950', '#ab9e85', 1.2, 'broad', 'confident', 13, 'medals:15', '#bba185'],
    ['rex-goodwin', 'Rex Goodwin', 'Rex Godwin', 'Cheveux argentés lissés et costume administratif.', 'swept', 'suit', 'none', '#c2c2bb', '#8c7263', '#d4bd87', 1.2, 'broad', 'calm', 14, 'medals:18'],
    ['antinomy', 'Antinomy', 'Bruno|Dark Glass', 'Cheveux bleus, visière rouge et combinaison de pilote bleu nuit.', 'swept', 'armor', 'goggles', '#3d638a', '#334a68', '#b13c45', 1.17, 'average', 'ready', 15, 'mission:synchronization'],
    ['aporia', 'Aporia', 'Aporie', 'Silhouette mécanique imposante et coiffe blanche à pointes rouges.', 'helmet', 'mechanical', 'none', '#e0d8cc', '#e6e0d2', '#b64c3f', 1.25, 'broad', 'confident', 0, 'wins:30', '#b9afa2', '#bd473c'],
    ['z-one', 'Z-one', 'Zone|Z-ONE', 'Masque et haute enveloppe mécanique blanche.', 'helmet', 'mechanical', 'mask', '#d6d4c5', '#dfdacd', '#967b52', 1.25, 'broad', 'calm', 1, 'medals:30', '#b1a38e'],
    ['placido', 'Placido', 'Primo|Placide', 'Chevelure argentée asymétrique et long manteau noir.', 'long', 'long-coat', 'none', '#c4c7c4', '#353d40', '#8b6875', 1.18, 'slim', 'confident', 2, 'wins:15'],
    ['lester', 'Lester', 'Luciano', 'Petite stature, queue-de-cheval rousse et manteau sombre.', 'ponytail', 'long-coat', 'none', '#c1724b', '#3e343c', '#a36267', 0.87, 'slim', 'energetic', 3, 'duels:20'],
    ['jakob', 'Jakob', 'Jose|José', 'Grand corps massif, barbe blanche et manteau sombre.', 'short', 'long-coat', 'none', '#e0dccd', '#4f4644', '#ba9980', 1.25, 'broad', 'calm', 4, 'wins:18'],
    ['sherry', 'Sherry LeBlanc', 'Sherry Leblanc', 'Longue chevelure blonde, combinaison blanche et plastron vert de pilote.', 'long', 'armor', 'none', '#d6bb74', '#e3e8de', '#416255', 1.12, 'slim', 'confident', 5, 'wins:8'],
    ['andre', 'Andre', 'André|Team Unicorn', 'Cheveux bruns courts et combinaison bordeaux.', 'short', 'sport', 'none', '#754f37', '#795454', '#c9bc9c', 1.19, 'average', 'ready', 6, 'duels:25'],
    ['jean', 'Jean', 'Jean de Team Unicorn', 'Cheveux bleu-gris longs et tenue blanche de pilote.', 'long', 'sport', 'none', '#7f9ba1', '#e2e5dc', '#517ca0', 1.14, 'slim', 'calm', 7, 'duels:30']
  ],
  zexal: [
    ['yuma', 'Yuma Tsukumo', 'Yûma Tsukumo', 'Pointes noires et rouges, Duel Gazer à un œil et Clé de l’Empereur au cou.', 'star', 'sport', 'goggles', '#283347', '#ad333e', '#d7ad3c', 0.95, 'slim', 'energetic', 0, 'starter', '#f1bf9d', '#ac3a54'],
    ['astral', 'Astral', 'Esprit Astral', 'Corps bleu luminescent sans cheveux et marques dorées.', 'bald', 'mechanical', 'none', '#84dce4', '#80d4e5', '#e8d15a', 1.09, 'slim', 'calm', 1, 'medals:6', '#89d3e5'],
    ['tori', 'Tori Meadows', 'Kotori Mizuki|Kotori', 'Carré vert asymétrique, ruban rouge, haut menthe et jupe rose.', 'bob', 'dress', 'none', '#70996d', '#c5dec6', '#c45665', 0.97, 'slim', 'calm', 2, 'duels:3'],
    ['bronk', 'Bronk Stone', 'Tetsuo Takeda', 'Grande carrure, cheveux noirs sous une casquette rouge et gilet orange.', 'short', 'sport', 'hat', '#242833', '#c78b56', '#ba3c3c', 1.02, 'broad', 'ready', 3, 'duels:5'],
    ['kite', 'Kite Tenjo', 'Kaito Tenjo|Kaito Tenjô', 'Chevelure blonde aux pointes bleues et manteau blanc.', 'star', 'long-coat', 'none', '#e2cf81', '#edf1ec', '#526f99', 1.12, 'slim', 'confident', 4, 'wins:8', '#f3c6ad', '#6684a4'],
    ['shark', 'Shark', 'Reginald Kastle|Ryoga Kamishiro|Ryôga|Nash', 'Mèches violettes incurvées et veste noire à col rouge.', 'swept', 'jacket', 'necklace', '#696083', '#343543', '#a3394e', 1.05, 'slim', 'ready', 5, 'wins:5'],
    ['rio', 'Rio Kastle', 'Rio Kamishiro|Merag', 'Longue chevelure bleu clair et uniforme blanc.', 'long', 'school', 'none', '#7da1bd', '#e3e8ec', '#9774a5', 1.02, 'slim', 'confident', 6, 'wins:6'],
    ['anna', 'Anna Kaboom', 'Anna Kozuki|Anna Kôzuki', 'Couettes roses anguleuses et veste orange.', 'twin-tail', 'sport', 'none', '#bb5e7d', '#c97c48', '#ecc57f', 0.99, 'average', 'energetic', 7, 'duels:8'],
    ['cathy', 'Cathy Katherine', 'Cathy|Cat-chan', 'Très longs cheveux gris à pointes de chat.', 'twin-tail', 'dress', 'headband', '#a6a4b1', '#947991', '#dfccd1', 0.95, 'slim', 'calm', 8, 'duels:10'],
    ['flip', 'Flip Turner', 'Tokunosuke Omoteura', 'Petite coupe bleue avec frange et tenue violette.', 'bob', 'school', 'none', '#536893', '#77588a', '#c5c090', 0.89, 'slim', 'confident', 9, 'duels:12'],
    ['caswell', 'Caswell Francis', 'Takashi Todoroki', 'Cheveux bleus pointus et lunettes carrées.', 'short', 'school', 'glasses', '#487795', '#7589a3', '#e7e1c9', 0.98, 'slim', 'calm', 10, 'duels:15'],
    ['quinton', 'Quinton', 'Christopher Arclight|V', 'Très longs cheveux blancs et veste de noble bleue.', 'long', 'long-coat', 'none', '#d3d3dc', '#526b84', '#c4ac64', 1.18, 'slim', 'calm', 11, 'wins:15'],
    ['quattro', 'Quattro', 'Thomas Arclight|IV', 'Cheveux rouges et blonds et longue veste bordeaux.', 'swept', 'long-coat', 'none', '#a4443c', '#763c48', '#c59d4c', 1.14, 'slim', 'confident', 12, 'wins:10', '#efbaa0', '#d4b267'],
    ['trey', 'Trey', 'Michael Arclight|III', 'Carré rose corail et longue tenue bordeaux à col blanc.', 'bob', 'robe', 'none', '#d39998', '#6d3d4b', '#e2dbca', 0.98, 'slim', 'calm', 13, 'medals:9'],
    ['vetrix', 'Vetrix', 'Byron Arclight|Tron', 'Petite silhouette masquée et manteau rose orné.', 'bob', 'robe', 'mask', '#ded5c1', '#a977a5', '#d5b667', 0.88, 'slim', 'confident', 14, 'medals:18'],
    ['dr-faker', 'Dr. Faker', 'Doctor Faker', 'Très grand scientifique aux cheveux verts hérissés.', 'star', 'robe', 'none', '#94ae64', '#b8c9a6', '#7897a0', 1.24, 'broad', 'confident', 15, 'wins:25', '#b5b29b'],
    ['heartland', 'Mr. Heartland', 'Monsieur Heartland', 'Cheveux gris lissés, lunettes et costume rouge.', 'swept', 'suit', 'glasses', '#b8b9b6', '#9d4450', '#e3bb60', 1.14, 'average', 'confident', 0, 'duels:25'],
    ['nistro', 'Nistro', 'Gauche', 'Grande carrure, cheveux bruns dressés et manteau rouge.', 'star', 'long-coat', 'none', '#654438', '#9d4043', '#dfb851', 1.23, 'broad', 'ready', 1, 'wins:7', '#bc8b67'],
    ['dextra', 'Dextra', 'Droite', 'Coupe verte asymétrique et veste violette ajustée.', 'bob', 'jacket', 'none', '#6d937c', '#68628d', '#decaa7', 1.09, 'slim', 'calm', 2, 'wins:9'],
    ['girag', 'Girag', 'Gilag', 'Carrure massive, cheveux verts hérissés et chemise blanche ouverte.', 'star', 'jacket', 'none', '#657f55', '#ece8dc', '#a67c4e', 1.24, 'broad', 'energetic', 3, 'duels:30', '#c89570'],
    ['alito', 'Alito', 'Alit', 'Petite silhouette de boxeur, chevelure noire ondulée et haut rouge.', 'swept', 'sport', 'none', '#292a2e', '#b24848', '#e1d9c5', 1.0, 'average', 'energetic', 4, 'wins:12', '#c6926a'],
    ['dumon', 'Dumon', 'Durbe', 'Carré gris mauve, longue écharpe verte et manteau de voyage.', 'bob', 'long-coat', 'scarf', '#b0a7ba', '#8f919d', '#709477', 1.12, 'slim', 'calm', 5, 'medals:15'],
    ['vector', 'Vector', 'Ray Shadows|Rei Shingetsu', 'Cheveux orange à grandes pointes et manteau sombre.', 'star', 'long-coat', 'none', '#c78a45', '#423d5a', '#9d6492', 1.07, 'slim', 'confident', 6, 'wins:20'],
    ['mizar', 'Mizar', 'Mizael', 'Longue chevelure blonde et manteau bleu à col haut.', 'long', 'long-coat', 'none', '#dac780', '#425f86', '#d4b979', 1.17, 'slim', 'confident', 7, 'mission:rank-four']
  ],
  'arc-v': [
    ['yuya', 'Yuya Sakaki', 'Yûya Sakaki', 'Chevelure verte à frange rouge, lunettes dorées et veste rouge de spectacle.', 'swept', 'jacket', 'goggles', '#49946a', '#bc4247', '#d3a650', 1.0, 'slim', 'energetic', 0, 'starter', '#f2c4a6', '#b4474b'],
    ['zuzu', 'Zuzu Boyle', 'Yuzu Hiragi|Yuzu Hiiragi', 'Deux couettes roses et tenue scolaire à jupe rose.', 'twin-tail', 'dress', 'necklace', '#bd7192', '#d18ba0', '#f3e9d4', 0.99, 'slim', 'ready', 1, 'duels:3'],
    ['yuto', 'Yuto', 'Yûto', 'Mèches noires et violettes et manteau noir à col haut.', 'star', 'long-coat', 'none', '#31303d', '#35363f', '#806b94', 1.04, 'slim', 'calm', 2, 'wins:5', '#e8bba3', '#7a6591'],
    ['yugo', 'Yugo', 'Yûgo', 'Chevelure bleue et blonde et combinaison blanche de pilote.', 'swept', 'sport', 'none', '#4c8598', '#e4e6df', '#dfa847', 1.02, 'average', 'energetic', 3, 'mission:synchronization', '#eebc9a', '#d6b35a'],
    ['yuri', 'Yuri', 'Yûri', 'Cheveux violets bicolores et uniforme long de l’Académie.', 'swept', 'uniform', 'none', '#815183', '#705081', '#d1bc74', 1.04, 'slim', 'confident', 4, 'wins:15', '#edc0aa', '#b26c99'],
    ['celina', 'Celina', 'Serena', 'Queue-de-cheval bleu sombre et uniforme rouge.', 'ponytail', 'uniform', 'none', '#454a71', '#a75262', '#eadcc9', 1.03, 'slim', 'confident', 5, 'wins:6'],
    ['rin', 'Rin', 'Rin des Synchros', 'Cheveux verts courts et combinaison de pilote.', 'bob', 'sport', 'none', '#82a575', '#d1d7c4', '#968cad', 1.02, 'slim', 'ready', 6, 'medals:9'],
    ['lulu', 'Lulu Obsidian', 'Ruri Kurosaki', 'Haute queue-de-cheval mauve et uniforme blanc à jupe.', 'ponytail', 'dress', 'none', '#9b8aae', '#e5e0e8', '#a65a85', 1.03, 'slim', 'calm', 7, 'mission:rank-four'],
    ['declan', 'Declan Akaba', 'Reiji Akaba|Reiji', 'Cheveux gris asymétriques, lunettes et longue écharpe rouge.', 'swept', 'long-coat', 'scarf', '#9b9faa', '#4c485b', '#a42e4c', 1.16, 'slim', 'confident', 8, 'wins:10'],
    ['riley', 'Riley Akaba', 'Reira Akaba|Reira', 'Très petite silhouette, cheveux bleus et manteau violet.', 'bob', 'long-coat', 'hat', '#7f93b3', '#83618e', '#b27b8f', 0.85, 'slim', 'calm', 9, 'duels:10'],
    ['shay', 'Shay Obsidian', 'Shun Kurosaki', 'Chevelure bleu sombre à mèches turquoise et long manteau bleu.', 'star', 'long-coat', 'none', '#354d64', '#46627e', '#9a9855', 1.16, 'slim', 'ready', 10, 'wins:8', '#e9bca2', '#59a9a3'],
    ['sora', 'Sora Perse', 'Sora Shiunin', 'Cheveux bleu clair ébouriffés et petite veste blanche.', 'swept', 'jacket', 'none', '#84b8c0', '#e7eadb', '#87649e', 0.9, 'slim', 'energetic', 11, 'duels:8'],
    ['gong', 'Gong Strong', 'Gongenzaka Noboru|Noboru Gongenzaka', 'Carrure massive, haute banane noire et kimono blanc aux bordures rouges.', 'swept', 'robe', 'none', '#252b31', '#eee8dc', '#bd4847', 1.25, 'broad', 'calm', 12, 'mission:hold-the-line'],
    ['silvio', 'Sylvio Sawatari', 'Shingo Sawatari|Silvio Sawatari', 'Chevelure blonde ondulée et long manteau blanc bordé d’or.', 'swept', 'long-coat', 'none', '#d7b558', '#eee9dc', '#c6a25a', 1.07, 'slim', 'confident', 13, 'duels:6'],
    ['yusho', 'Yusho Sakaki', 'Yûshô Sakaki', 'Cheveux bicolores sous un chapeau et cape de scène.', 'swept', 'long-coat', 'hat', '#8d424b', '#a14150', '#dbac54', 1.18, 'slim', 'energetic', 14, 'medals:24', '#ecc1a5', '#729b70'],
    ['yoko', 'Yoko Sakaki', 'Yôko Sakaki', 'Cheveux roux attachés et tenue de motarde.', 'ponytail', 'jacket', 'none', '#b7674d', '#dca552', '#efe2c7', 1.1, 'average', 'confident', 15, 'duels:20'],
    ['leo-akaba', 'Leo Akaba', 'Reo Akaba|Leo', 'Chevelure grise ample, lunettes et manteau de chercheur.', 'long', 'robe', 'glasses', '#b7bdc3', '#b2b7c1', '#7284a2', 1.18, 'slim', 'calm', 0, 'wins:25'],
    ['dennis', 'Dennis McField', 'Dennis MacField|Dennis Macfield', 'Pointes rousses, costume orange et manches bleues de spectacle.', 'star', 'suit', 'none', '#c88449', '#c8793e', '#567ba0', 1.08, 'slim', 'energetic', 1, 'wins:7'],
    ['moon-shadow', 'Moon Shadow', 'Tsukikage|Moonshadow', 'Ninja masqué en tenue bleu sombre.', 'short', 'uniform', 'mask', '#292934', '#43465f', '#a3a1be', 1.1, 'slim', 'calm', 2, 'mission:link-exchange'],
    ['shinji', 'Shinji Weber', 'Shinji', 'Mèches blondes dressées et tenue de pilote verte.', 'swept', 'sport', 'none', '#d1b465', '#5f7161', '#c1b6a4', 1.15, 'average', 'ready', 4, 'wins:9'],
    ['sergey', 'Sergey Volkov', 'Sergei Volkov', 'Cyborg massif au crâne rasé et tenue grise.', 'bald', 'mechanical', 'none', '#5a5350', '#75736f', '#b89d78', 1.25, 'broad', 'confident', 5, 'wins:20', '#a49b88'],
    ['roget', 'Jean-Michel Roget', 'Jean Michel Roget', 'Chevelure blonde lissée et costume blanc administratif.', 'swept', 'suit', 'none', '#d0bd83', '#e8e5dc', '#aa9268', 1.17, 'slim', 'calm', 6, 'duels:30'],
    ['chojiro', 'Chojiro Tokumatsu', 'Chôjirô Tokumatsu|Enjoy Chojiro', 'Cheveux violets épais et grand manteau traditionnel.', 'swept', 'robe', 'none', '#725682', '#67526a', '#c78b53', 1.23, 'broad', 'confident', 7, 'duels:25'],
    ['skip', 'Skip Boyle', 'Shuzo Hiragi|Shûzô Hiiragi', 'Coupe brune hérissée et tenue sportive orangée.', 'star', 'sport', 'none', '#72523a', '#c4804e', '#ead4a8', 1.18, 'broad', 'energetic', 8, 'duels:15'],
    ['gloria', 'Gloria Tyler', 'Gloria sœur Tyler', 'Longue chevelure blonde et uniforme militaire blanc.', 'long', 'uniform', 'none', '#d6bb75', '#e2e1d7', '#7b9384', 1.13, 'slim', 'confident', 9, 'wins:12'],
    ['grace', 'Grace Tyler', 'Grace sœur Tyler', 'Cheveux blonds courts et uniforme blanc à manches courtes.', 'bob', 'uniform', 'none', '#ddc480', '#e9e7dc', '#8baba0', 1.08, 'slim', 'energetic', 10, 'duels:22'],
    ['zarc', 'Z-ARC', 'Zarc|Zarcu', 'Incarnation humanoïde aux pointes vertes, armure et ailes sombres.', 'star', 'armor', 'wings', '#8a9b84', '#4d415b', '#9ab09a', 1.23, 'broad', 'confident', 11, 'medals:36', '#c6b6be'],
    ['ray', 'Ray Akaba', 'Ray', 'Longue chevelure rouge et verte et tenue claire.', 'long', 'dress', 'necklace', '#b7656b', '#ece8df', '#8bb18c', 1.11, 'slim', 'calm', 12, 'mission:adaptive-finale', '#f0c6ae', '#86a77b']
  ],
  vrains: [
    ['playmaker', 'Playmaker', 'Yusaku Fujiki|Yûsaku Fujiki', 'Avatar de LINK VRAINS : pointes rouges et mauves, coiffe dorée et armure verte.', 'star', 'armor', 'earpiece', '#b94a3d', '#28594f', '#edbc4c', 1.07, 'slim', 'ready', 0, 'starter', '#edc0ab', '#9d4a98'],
    ['soulburner', 'Soulburner', 'Takeru Homura|Takeru', 'Chevelure rouge et blonde en flammes et tenue de pilote.', 'star', 'armor', 'goggles', '#b94935', '#6f3e3e', '#dfa83d', 1.08, 'average', 'energetic', 1, 'wins:5', '#eebaa0', '#e4b04a'],
    ['varis', 'Varis', 'Revolver|Ryoken Kogami|Ryôken', 'Coiffe noire et rouge rigide et armure blanche de chevalier.', 'helmet', 'armor', 'mask', '#4a3342', '#e9e8e0', '#a9494a', 1.18, 'slim', 'confident', 2, 'wins:10'],
    ['blue-angel', 'Blue Angel', 'Aoi Zaizen|Skye Zaizen|Ange Bleu', 'Couettes bleues, robe numérique claire et ailes.', 'twin-tail', 'dress', 'wings', '#74a9ca', '#dbeef0', '#6ca4c8', 1.02, 'slim', 'energetic', 3, 'duels:5'],
    ['ghost-gal', 'Ghost Gal', 'Emma Bessho|Ghost Girl', 'Queue-de-cheval blanche à mèche rose et tenue numérique violette.', 'ponytail', 'long-coat', 'earpiece', '#e3dce2', '#645a89', '#d28a9d', 1.13, 'slim', 'confident', 4, 'wins:6', '#f3c4a5', '#c78ca4'],
    ['the-gore', 'The Gore', 'Go Onizuka|Gô Onizuka', 'Cheveux blonds en crête et large carrure de lutteur.', 'mohawk', 'armor', 'headband', '#bfa365', '#7c5446', '#a3806b', 1.25, 'broad', 'ready', 5, 'wins:8', '#a27552'],
    ['ai', 'Ai', 'Ignis Ai|Aï', 'Apparence humanoïde, mèches noires et lilas et costume sombre.', 'swept', 'suit', 'none', '#373443', '#383146', '#a773bd', 1.11, 'slim', 'confident', 6, 'medals:18', '#ecbeab', '#9b6cb3'],
    ['roboppi', 'Roboppi', 'Roboppy|Roboppi humanoïde', 'Petite silhouette, cheveux roses ronds et tenue mécanique.', 'bob', 'mechanical', 'earpiece', '#d493ac', '#ece3de', '#b8839c', 0.85, 'slim', 'energetic', 7, 'duels:12'],
    ['akira', 'Akira Zaizen', 'Akira', 'Cheveux bleu sombre lissés et costume bleu d’administrateur.', 'short', 'suit', 'none', '#334454', '#41516d', '#a5b6c3', 1.19, 'slim', 'calm', 8, 'duels:20'],
    ['shoichi', 'Shoichi Kusanagi', 'Shôichi Kusanagi|Kolter', 'Cheveux noirs hérissés et veste brune de restaurateur.', 'star', 'jacket', 'none', '#2d3439', '#8f6c54', '#d4c3a2', 1.24, 'broad', 'calm', 9, 'duels:15', '#c5916c'],
    ['jin', 'Jin Kusanagi', 'Jin', 'Petite coupe bleue et manteau clair.', 'swept', 'jacket', 'none', '#6e91a6', '#dee4e3', '#91afbb', 1.0, 'slim', 'calm', 10, 'medals:6'],
    ['naoki', 'Naoki Shima', 'Brave Max|Lonely Brave', 'Cheveux orange à grandes pointes et tenue scolaire.', 'star', 'school', 'none', '#c28b53', '#8c9498', '#dbb579', 1.02, 'average', 'energetic', 11, 'duels:3'],
    ['spectre', 'Spectre', 'Specter', 'Chevelure blanche relevée et manteau blanc étroit.', 'swept', 'long-coat', 'none', '#d8d4cf', '#e7e5df', '#927ea0', 1.17, 'slim', 'confident', 12, 'wins:12'],
    ['windy', 'Windy', 'Ignis du vent', 'Petit corps numérique vert et coiffe anguleuse.', 'helmet', 'mechanical', 'earpiece', '#8eaf61', '#86b868', '#d4e89d', 0.85, 'slim', 'confident', 13, 'duels:25', '#8fbb74'],
    ['lightning', 'Lightning', 'Ignis de la lumière', 'Petit corps numérique doré aux pointes symétriques.', 'star', 'mechanical', 'none', '#e1ce6a', '#d4c778', '#f1e9b5', 0.87, 'slim', 'confident', 14, 'wins:20', '#d8ce8e'],
    ['flame', 'Flame', 'Ignis du feu', 'Petit corps numérique rouge aux arêtes de flamme.', 'star', 'mechanical', 'none', '#b65b46', '#bc5847', '#e0a260', 0.86, 'average', 'ready', 15, 'mission:link-exchange', '#bf6a53'],
    ['aqua', 'Aqua', 'Ignis de l’eau', 'Petite silhouette numérique bleue et contours fluides.', 'long', 'mechanical', 'none', '#83bdc8', '#7caec2', '#c4e6e4', 0.86, 'slim', 'calm', 0, 'medals:9', '#92c5d0'],
    ['earth', 'Earth', 'Ignis de la terre', 'Petit corps numérique brun et épaules massives.', 'helmet', 'mechanical', 'none', '#997953', '#977855', '#cfb781', 0.89, 'broad', 'calm', 1, 'mission:measured-resistance', '#a88763'],
    ['kiyoshi', 'Kiyoshi Kogami', 'Dr. Kogami|Docteur Kogami', 'Cheveux gris courts, barbe et blouse de chercheur.', 'short', 'robe', 'glasses', '#bab8b1', '#e4e2d9', '#738596', 1.17, 'average', 'calm', 2, 'duels:30'],
    ['queen', 'Queen', 'SOL Technologies Queen', 'Carré violet anguleux et costume de direction blanc.', 'bob', 'suit', 'earpiece', '#805c84', '#e2dfdf', '#a16a8e', 1.14, 'slim', 'confident', 3, 'wins:25']
  ],
  sevens: [
    ['yuga', 'Yuga Ohdo', 'Yûga Ôdô|Yuga', 'Pointes auburn à frange jaune, veste rouge et blanche, short noir et gants bleus.', 'star', 'jacket', 'none', '#9d4838', '#c94945', '#f1e8d8', 0.89, 'slim', 'energetic', 0, 'starter', '#f1c3a4', '#e8c859'],
    ['luke', 'Luke', 'Tatsuhisa Kamijo|Tatsuhisa Kamijô|Lucidien|Lucidien Kallister', 'Chevelure bleue hérissée, tee-shirt noir au dragon rouge et pantalon olive.', 'star', 'sport', 'none', '#49769a', '#292d36', '#b3424a', 0.99, 'slim', 'confident', 1, 'wins:3'],
    ['romin', 'Romin Kirishima', 'Romin|Romin Kassidy', 'Longs cheveux roses, haut noir, short rouge et leggings lavande.', 'long', 'sport', 'none', '#d75b94', '#252832', '#c44f59', 0.95, 'slim', 'ready', 2, 'duels:3'],
    ['gakuto', 'Gakuto Sogetsu', 'Gakuto Sôgetsu|Gavin Sogetsu', 'Carré violet asymétrique et uniforme bleu clair du conseil.', 'bob', 'uniform', 'none', '#745891', '#b3cbe2', '#eef0e4', 1.0, 'slim', 'calm', 3, 'duels:5'],
    ['roa', 'Roa Kirishima', 'Roa|Roa Kassidy', 'Cheveux vert clair hérissés et long gilet rouge sans manches de musicien.', 'star', 'long-coat', 'none', '#bdd8bc', '#b7444a', '#2b2e36', 1.05, 'slim', 'confident', 4, 'wins:5'],
    ['nail', 'Nail Saionji', 'Neil Saionji|Nail', 'Carré blond pâle et uniforme bleu clair et blanc.', 'bob', 'uniform', 'none', '#d8c8a8', '#c7dce3', '#f0eee3', 0.98, 'slim', 'calm', 5, 'medals:6'],
    ['asana', 'Asana Mutsuba', 'Asana', 'Longue chevelure bleu-gris, manteau rouge et pantalon blanc.', 'long', 'long-coat', 'none', '#899db8', '#a94348', '#e8e3df', 1.04, 'slim', 'confident', 6, 'wins:8'],
    ['mimi', 'Mimi Atachi', 'Mimi|Mimi Imimi', 'Petite apparence, carré auburn et robe rose à col blanc.', 'bob', 'dress', 'none', '#a06f50', '#cb789d', '#eee5d8', 0.85, 'slim', 'energetic', 7, 'duels:8'],
    ['yoshio', 'Yoshio Atachi', 'Yoshio|Yosh', 'Petite silhouette à banane bleue et grand manteau sombre.', 'swept', 'long-coat', 'none', '#526485', '#3e4150', '#b5a593', 0.87, 'average', 'confident', 8, 'duels:10'],
    ['tiger', 'Tiger', 'Haruka Kamijo|Haruka Kamijô|Tiger Kamijo|Tiadosia Kallister|Tiadosia Tiger Kallister', 'Très longue chevelure bleue, haut doré et pantalon vert ample.', 'long', 'sport', 'none', '#496b99', '#d3bc83', '#4d7760', 1.11, 'average', 'ready', 9, 'wins:10', '#edc2a4', '#496b99'],
    ['otes', 'Otes', 'Otis|Otes masqué', 'Grande robe noire et masque métallique.', 'helmet', 'robe', 'mask', '#8f9292', '#34343c', '#b29b63', 1.22, 'slim', 'calm', 10, 'medals:24'],
    ['yuro', 'Yuro Goha', 'Yûrô Goha', 'Mèches blondes ondulées, masque, uniforme blanc et cape gris foncé.', 'swept', 'uniform', 'mask', '#d6bd70', '#e8e4d9', '#78945a', 1.06, 'slim', 'confident', 11, 'duels:15'],
    ['yujin', 'Yujin Goha', 'Yûjin Goha', 'Chevelure bleue relevée et tenue de surfeur.', 'swept', 'sport', 'none', '#53788d', '#70a2b2', '#e9d68b', 1.14, 'average', 'energetic', 12, 'duels:18'],
    ['yuka', 'Yuka Goha', 'Yûka Goha', 'Longue chevelure brune, masque et uniforme blanc à bordures rouges.', 'long', 'uniform', 'mask', '#8d684b', '#e7e4d6', '#b65b5b', 1.03, 'average', 'energetic', 13, 'wins:6'],
    ['yuran', 'Yuran Goha', 'Yûran Goha', 'Cheveux pâles courts et uniforme cérémoniel.', 'short', 'uniform', 'headband', '#b9c9c4', '#8eacc0', '#e6dcc9', 1.05, 'slim', 'calm', 14, 'medals:12'],
    ['yuo', 'Yuo Goha', 'Yûô Goha', 'Petite taille, carré châtain, masque et manteau gris bordé d’or.', 'bob', 'long-coat', 'mask', '#a07b57', '#535158', '#bfac6e', 0.87, 'slim', 'confident', 15, 'wins:15'],
    ['yuga-goha', 'Yuga Goha', 'Yûga Goha', 'Chevelure rouge et noire acérée et tenue sombre.', 'star', 'uniform', 'none', '#982e3c', '#42343f', '#b26686', 0.96, 'slim', 'confident', 0, 'wins:20', '#edbca4', '#31343a'],
    ['ranze', 'Ranze Nanahoshi', 'Ranze', 'Longue queue-de-cheval bleu sombre et uniforme clair.', 'ponytail', 'uniform', 'none', '#465b72', '#dce2e5', '#78a5bb', 1.01, 'slim', 'calm', 1, 'duels:12'],
    ['rinnosuke', 'Rinnosuke Nanahoshi', 'Rinnosuke', 'Cheveux bleus courts et tenue traditionnelle claire.', 'short', 'uniform', 'none', '#4c6780', '#dce0e1', '#8fb5bc', 0.98, 'slim', 'ready', 2, 'duels:14'],
    ['sebastian', 'Sebastian', 'Sebastian le robot', 'Majordome mécanique, tête lisse et costume noir.', 'helmet', 'mechanical', 'none', '#c6c8bb', '#43484d', '#cfcebd', 1.18, 'slim', 'calm', 3, 'mission:adaptive-finale', '#c4c6b9']
  ],
  'go-rush': [
    ['yudias', 'Yudias Velgear', 'Yûdias Velgear|Yudias', 'Pointes argentées à mèches bleues, casque noir et long manteau blanc doublé de rouge.', 'star', 'long-coat', 'earpiece', '#dceaf0', '#eef2f3', '#c64145', 1.13, 'slim', 'ready', 0, 'starter', '#f3c4a5', '#64b8d9'],
    ['yuhi', 'Yuhi Ohdo', 'Yûhi Ôdô|Yuhi', 'Cheveux rouges à mèches blanches, lunettes frontales et tenue orange d’UTS.', 'star', 'sport', 'goggles', '#b14943', '#ca8555', '#e5c768', 0.93, 'slim', 'energetic', 1, 'duels:3', '#f3c4a5', '#eee6dd'],
    ['yuamu', 'Yuamu Ohdo', 'Yûamu Ôdô|Yuamu', 'Chevelure blonde à pointes vertes, grand ruban rose, lunettes et short orange.', 'long', 'jacket', 'glasses', '#d9ca84', '#efe7dc', '#cb6491', 0.93, 'slim', 'confident', 2, 'duels:5', '#f3c4a5', '#86be80'],
    ['zwijo', 'Zuwijo Zwil Velgear', 'Zwijo|Zuwijo|Zir Velgear|Zwijo Zir Velgear', 'Longs cheveux blonds à pointes mauves et manteau noir-violet bordé d’or.', 'long', 'long-coat', 'none', '#d3c4a7', '#373240', '#b8985f', 1.23, 'broad', 'confident', 3, 'wins:10', '#f3c4a5', '#9b7aab'],
    ['manabu', 'Manabu Sogetsu', 'Manabu Sôgetsu|Maddox Sogetsu', 'Cheveux noirs raides et uniforme noir d’enquêteur.', 'short', 'uniform', 'none', '#262833', '#303441', '#9998a5', 1.06, 'slim', 'calm', 4, 'wins:3'],
    ['mitsuko', 'Mitsuko Hiramori', 'Mitsuko', 'Très longue chevelure turquoise et robe sombre.', 'long', 'dress', 'none', '#78a8a5', '#514c62', '#a2b8a8', 1.25, 'slim', 'calm', 5, 'duels:8'],
    ['manya', 'Manya Atachi', 'Manya|Immi Imimi', 'Carré châtain ondulé, chapeau blanc et robe rose de vedette.', 'bob', 'dress', 'hat', '#98764e', '#db98b5', '#f0e9df', 0.91, 'slim', 'energetic', 6, 'duels:10'],
    ['nyandestar', 'Nyandestar', 'Nyandestar|Nyandestar forme féline', 'Chat gris à étoile verte, poitrine blanche et queue rayée ; adaptation de duelliste bipède.', 'short', 'sport', 'none', '#aab1af', '#aab1af', '#78b494', 1.08, 'slim', 'confident', 7, 'wins:5', '#aab1af'],
    ['the-luge', 'The Luge', 'Za Lugh|The☆Luge|Grand Roi de la Terreur', 'Chevelure blanche volumineuse et grande robe royale.', 'long', 'robe', 'cape', '#d4d5d0', '#83779a', '#bfadc8', 1.24, 'broad', 'confident', 8, 'medals:24'],
    ['rovian', 'Rovian Kirishima', 'Rovian', 'Longue chevelure violette et chapeau de musicienne.', 'long', 'long-coat', 'hat', '#8e6b9c', '#71526a', '#d5ad79', 1.06, 'slim', 'calm', 9, 'wins:8'],
    ['yuna', 'Yuna Goha', 'Yûna Goha', 'Longs cheveux bleu sombre et uniforme blanc.', 'long', 'uniform', 'none', '#536381', '#e0e3e8', '#a897b5', 1.0, 'slim', 'confident', 10, 'medals:9'],
    ['asaka', 'Asaka Mutsuba', 'Asaka', 'Longue chevelure rose et uniforme de direction violet.', 'long', 'suit', 'none', '#bd7898', '#705a78', '#dcbf91', 1.14, 'slim', 'confident', 11, 'wins:12'],
    ['london', 'London Kirishima', 'London', 'Longs cheveux rouges attachés et costume blanc de musicien.', 'ponytail', 'suit', 'none', '#a85361', '#e7e3e0', '#7e608e', 1.09, 'slim', 'confident', 12, 'duels:15'],
    ['epoch', 'Epoch', 'Epoch d’UTS', 'Très petite silhouette coiffée d’un casque volumineux.', 'helmet', 'uniform', 'hat', '#c6ac89', '#c49e72', '#8f736c', 0.85, 'average', 'calm', 13, 'medals:3'],
    ['ranran', 'Ranran Nanahoshi', 'Ranran', 'Cheveux bleus attachés et tenue d’enquêtrice blanche.', 'ponytail', 'uniform', 'none', '#5e829d', '#e0e6e5', '#7396b1', 1.09, 'slim', 'ready', 14, 'duels:12'],
    ['tremolo', 'Tremolo Ryugu', 'Tremolo Ryûgû', 'Cheveux bleus longs et uniforme bleu à col haut.', 'long', 'uniform', 'none', '#648aa5', '#476484', '#bcbdd7', 1.14, 'slim', 'confident', 15, 'wins:15'],
    ['phaser', 'Phaser Ryugu', 'Phaser Ryûgû', 'Haute chevelure bleu clair et long uniforme sombre.', 'swept', 'long-coat', 'none', '#91afb9', '#414c66', '#96a1b6', 1.24, 'broad', 'confident', 0, 'wins:20'],
    ['bochi', 'Bochi', 'Bochi|Bochi chien', 'Chien brun et blanc aux grandes oreilles et collier gris à pointes ; adaptation bipède.', 'short', 'sport', 'necklace', '#80562c', '#80562c', '#e9e9dc', 1.11, 'broad', 'ready', 1, 'duels:18', '#80562c'],
    ['chupataro', 'Chupataro', 'Chupatarô', 'Apparence humaine : cheveux bruns à frange orange, veste rose et foulard vert.', 'swept', 'jacket', 'scarf', '#795336', '#d5a3c7', '#6f9a82', 0.86, 'average', 'energetic', 2, 'duels:20', '#f0c1a1', '#d67b3b'],
    ['kuadul', 'Kuaidul Velgear', 'Kuadul Velgear|Kuaidul', 'Longue chevelure claire et tenue militaire sombre.', 'long', 'uniform', 'none', '#d9d7d4', '#4d4b63', '#aba0ba', 1.2, 'slim', 'confident', 3, 'mission:adaptive-finale']
  ]
};

// Verified structural details are optional and use the same bounded visual vocabulary.
// Animals retain their canonical species; the duel rig adapts them to a stylised biped.
const VISUAL_DETAILS = {
  "yugi": {
    "hairOutlineColor": "#b33e79",
    "bottomColor": "#273b66",
    "bootColor": "#252631"
  },
  "atem": {
    "hairOutlineColor": "#b33e79"
  },
  "kaiba": {
    "bottomColor": "#252831",
    "gloveColor": "#252831",
    "bootColor": "#252831"
  },
  "jaden": {
    "bottomColor": "#344b5d",
    "bootColor": "#9d333b"
  },
  "yusei": {
    "bottomColor": "#324455",
    "gloveColor": "#7a5841",
    "bootColor": "#292d34"
  },
  "yuma": {
    "secondaryAccessory": "necklace",
    "bottomStyle": "trousers",
    "bottomColor": "#343a51",
    "bootColor": "#607ca2",
    "accessoryColor": "#b7b2bc"
  },
  "yuya": {
    "bottomColor": "#526b31",
    "bootColor": "#b9434b",
    "accessoryColor": "#d3a650"
  },
  "playmaker": {
    "headdress": "helmet",
    "accessoryColor": "#edbc4c",
    "bottomColor": "#273936",
    "gloveColor": "#202d29",
    "bootColor": "#293930"
  },
  "yuga": {
    "bottomStyle": "shorts",
    "bottomColor": "#34323b",
    "gloveColor": "#5087b9",
    "bootColor": "#4378a9"
  },
  "yudias": {
    "species": "alien",
    "headdress": "helmet",
    "secondaryAccessory": "cape",
    "secondaryAccessoryColor": "#466b97",
    "accessoryColor": "#252a33",
    "bottomColor": "#252a33",
    "gloveColor": "#c53d43",
    "bootColor": "#456796"
  },
  "rex": {
    "headdress": "hat",
    "accessoryColor": "#b8464b"
  },
  "bonz": {
    "bottomColor": "#4f5167"
  },
  "axel": {
    "secondaryAccessory": "headband",
    "accessoryColor": "#bdac8a",
    "bottomColor": "#777357"
  },
  "blair": {
    "bottomStyle": "shorts",
    "bottomColor": "#b7ac79"
  },
  "crow": {
    "accessoryColor": "#54738d",
    "bottomColor": "#465363"
  },
  "antinomy": {
    "accessoryColor": "#b13c45",
    "bottomColor": "#334a68"
  },
  "sherry": {
    "bottomColor": "#e3e8de",
    "gloveColor": "#e3e8de",
    "bootColor": "#365849"
  },
  "tori": {
    "headdress": "headband",
    "accessoryColor": "#c45665",
    "bottomColor": "#d080a7"
  },
  "bronk": {
    "headdress": "hat",
    "bottomStyle": "trousers",
    "accessoryColor": "#ba3c3c",
    "bottomColor": "#77714b"
  },
  "dumon": {
    "accessoryColor": "#709477"
  },
  "declan": {
    "secondaryAccessory": "glasses",
    "accessoryColor": "#a42e4c"
  },
  "gong": {
    "bottomColor": "#eee8dc"
  },
  "dennis": {
    "bottomColor": "#c8793e",
    "bootColor": "#a17848"
  },
  "luke": {
    "bottomStyle": "trousers",
    "bottomColor": "#666951",
    "bootColor": "#547ba4"
  },
  "romin": {
    "bottomStyle": "shorts",
    "bottomColor": "#c44f59",
    "legwearColor": "#afa8d1",
    "bootColor": "#ba515d"
  },
  "gakuto": {
    "bottomColor": "#b3cbe2",
    "bootColor": "#dce4ea"
  },
  "roa": {
    "bottomColor": "#30323c",
    "bootColor": "#30323c"
  },
  "asana": {
    "bottomColor": "#e8e3df",
    "bootColor": "#2c343c"
  },
  "mimi": {
    "bottomStyle": "skirt",
    "bottomColor": "#cb789d"
  },
  "tiger": {
    "bottomStyle": "trousers",
    "bottomColor": "#4d7760",
    "bootColor": "#4d7760"
  },
  "yuro": {
    "headdress": "headband",
    "secondaryAccessory": "cape",
    "accessoryColor": "#535158",
    "bottomColor": "#e8e4d9"
  },
  "yuo": {
    "headdress": "helmet",
    "secondaryAccessory": "cape",
    "accessoryColor": "#535158",
    "bottomColor": "#535158"
  },
  "yuka": {
    "headdress": "headband",
    "secondaryAccessory": "cape",
    "accessoryColor": "#535158",
    "bottomColor": "#e7e4d6"
  },
  "yuhi": {
    "bottomStyle": "trousers",
    "bottomColor": "#ca8555",
    "accessoryColor": "#b68650",
    "gloveColor": "#e9e6da",
    "bootColor": "#6d4c37"
  },
  "yuamu": {
    "headdress": "headband",
    "accessoryColor": "#da6d9b",
    "bottomStyle": "shorts",
    "bottomColor": "#d6a15c",
    "bootColor": "#866955"
  },
  "zwijo": {
    "species": "alien",
    "bottomColor": "#554c5f",
    "bootColor": "#e5ded6"
  },
  "manya": {
    "headdress": "hat",
    "accessoryColor": "#f0e9df"
  },
  "nyandestar": {
    "species": "cat",
    "bottomColor": "#aab1af",
    "bootColor": "#eaeae1",
    "accessoryColor": "#78b494"
  },
  "bochi": {
    "species": "dog",
    "accessoryColor": "#a8b1bb",
    "bottomColor": "#80562c",
    "bootColor": "#e9e9dc"
  },
  "chupataro": {
    "bottomColor": "#a8c3d8",
    "accessoryColor": "#6f9a82",
    "bootColor": "#c65155"
  },
  "astral": {
    "species": "spirit"
  },
  "yubel": {
    "species": "spirit"
  },
  "ai": {
    "species": "robot"
  },
  "sebastian": {
    "species": "robot"
  }
};

function makeAvatar(seriesId, row) {
  const [id, name, aliases, description, hairStyle, outfitStyle, accessory,
    hairColor, outfitColor, accentColor, height, build, pose, variant,
    condition, skinColor = '#f3c4a5', hairAccent = hairColor] = row;
  const [type, detail] = condition.split(':');
  const unlock = type === 'starter' ? { type } : type === 'mission'
    ? { type, missionId: detail } : { type, target: Number(detail) };
  return {
    id, name, seriesId,
    aliases: aliases ? aliases.split('|') : [],
    description,
    visual: { hairStyle, hairColor, hairAccent, skinColor, outfitStyle,
      outfitColor, accentColor, accessory, height, build, pose, variant,
      species: 'human', secondaryAccessory: 'none', headdress: 'none',
      ...VISUAL_DETAILS[id] },
    unlock
  };
}

export const DUELIST_AVATARS = freezeDeep(DUELIST_SERIES.flatMap(series =>
  ROSTER[series.id].map(row => makeAvatar(series.id, row))));

const avatarById = new Map(DUELIST_AVATARS.map(avatar => [avatar.id, avatar]));

/** Unknown and malformed IDs never silently resolve to another character. */
export function getDuelistAvatar(id) {
  return typeof id === 'string' ? avatarById.get(id) || null : null;
}
