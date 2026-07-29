import {
  EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT,
  FIELD_SPELL_ENVIRONMENT_CATALOG
} from './FieldSpellEnvironmentCatalog.js';
import {
  FIELD_SPELL_CARD_DATA_SNAPSHOT,
  FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA
} from './FieldSpellCardDataSnapshot.js';
import {
  FIELD_SPELL_RUNTIME_ASSET_ROOT,
  getFieldSpellRuntimeManifestEntry
} from './FieldSpellRuntimeManifest.js';

/**
 * One original illustration contract per playable Field Spell.
 *
 * This file deliberately describes scenes instead of referencing official
 * card artwork. Environment families are only semantic context: every entry
 * owns a distinct slug, prompt and WebP path keyed by the canonical passcode.
 */

export const FIELD_SPELL_ILLUSTRATION_ASSET_ROOT =
  FIELD_SPELL_RUNTIME_ASSET_ROOT;

export const FIELD_SPELL_ILLUSTRATION_BRIEF_SNAPSHOT = Object.freeze({
  expectedCount: EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT,
  catalogueRetrievedOn: '2026-07-29',
  sourceBasis: 'canonical ID, exact English name, API archetype, exact effect text and environment family',
  effectDataSource: FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA.sourceUrl,
  artPolicy: 'original environmental composition; never reproduce official card art'
});

const UNIVERSAL_AVOID = Object.freeze([
  'the official card illustration or its recognizable composition',
  'recognizable franchise characters, signature monsters or copied creature designs',
  'Yu-Gi-Oh!, Konami, archetype or corporate logos',
  'readable lettering, card names, signage or watermarks',
  'cards, card frames, duel UI, zones or interface overlays'
]);

const EFFECT_VISUAL_CUES = Object.freeze([
  Object.freeze({
    pattern: /\b(?:ocean|sea|water|aqua|fish|marine|umi)\b/i,
    cue: 'water level, current paths or marine atmosphere visibly shape the surrounding location'
  }),
  Object.freeze({
    pattern: /\b(?:fire|flame|burn|pyro|volcanic)\b/i,
    cue: 'contained heat, forge light or volcanic energy is integrated into the architecture'
  }),
  Object.freeze({
    pattern: /\b(?:machine|gear|mechanical|cyber)\b/i,
    cue: 'working machinery and engineered movement are readable at environmental scale'
  }),
  Object.freeze({
    pattern: /\bfusion\b/i,
    cue: 'two converging material or energy routes visibly combine at one focal structure'
  }),
  Object.freeze({
    pattern: /\bsynchro\b/i,
    cue: 'concentric calibrated rings suggest several forces aligning in exact resonance'
  }),
  Object.freeze({
    pattern: /\bxyz\b/i,
    cue: 'layered orbital paths and stacked structures suggest equal ranks becoming one system'
  }),
  Object.freeze({
    pattern: /\bpendulum\b/i,
    cue: 'paired opposing towers frame a suspended oscillating environmental mechanism'
  }),
  Object.freeze({
    pattern: /\blink\b/i,
    cue: 'connected luminous routes branch between distinct architectural anchor points'
  }),
  Object.freeze({
    pattern: /\britual\b/i,
    cue: 'a restrained ceremonial threshold and ordered offering spaces define the landmark'
  }),
  Object.freeze({
    pattern: /\bcounter(?:s)?\b/i,
    cue: 'small repeated reservoirs visibly accumulate energy around the focal landmark'
  }),
  Object.freeze({
    pattern: /\bgraveyard\b/i,
    cue: 'weathered memorial routes imply resources returning from a solemn hidden depth'
  }),
  Object.freeze({
    pattern: /\bbanish(?:ed|es|ing)?\b/i,
    cue: 'a clean spatial rift or disappearing path suggests removal beyond the visible world'
  }),
  Object.freeze({
    pattern: /\btoken(?:s)?\b/i,
    cue: 'repeated empty stations imply temporary attendants materializing around one ruler'
  }),
  Object.freeze({
    pattern: /\bsummon(?:ed|s|ing)?\b/i,
    cue: 'one or more arrival thresholds are built into the location without depicting creatures'
  }),
  Object.freeze({
    pattern: /\b(?:battle|attack|damage)\b/i,
    cue: 'fortified sight lines and directional lighting make the location feel battle-ready'
  }),
  Object.freeze({
    pattern: /\b(?:draw|hand|deck)\b/i,
    cue: 'ordered archives or supply channels suggest knowledge and resources circulating'
  })
]);

const RECIPES = Object.freeze({
  yami: recipe(
    'an occult nocturnal realm built around ritual geometry and immense negative space',
    ['#090812', '#24143d', '#542966', '#c993ff'],
    ['black basalt', 'smoked crystal', 'aged silver'],
    ['a moonless void', 'a ring of distant monoliths', 'a fractured violet horizon'],
    ['low violet mist', 'slow ember-like motes', 'thin spectral rain'],
    ['an asymmetrical ritual dais', 'a broken obsidian gate', 'a deep shadow well'],
    'bright pastoral daylight or playful cartoon scenery'
  ),
  umi: recipe(
    'a maritime world where architecture, tide and deep water form a single arena',
    ['#031b2d', '#075a78', '#29a9bd', '#bff7f1'],
    ['wet limestone', 'mother-of-pearl', 'weathered bronze'],
    ['a storm-lit open sea', 'a submerged skyline', 'a luminous reef shelf'],
    ['salt haze', 'suspended droplets', 'subtle bioluminescent plankton'],
    ['a tidal causeway', 'a half-submerged arch', 'a circular abyssal basin'],
    'dry desert geology or flames dominating the scene'
  ),
  forest: recipe(
    'a layered living woodland whose vegetation creates natural walls and pathways',
    ['#071c14', '#185734', '#4c9b50', '#d2e99c'],
    ['mossy stone', 'dark timber', 'translucent leaves'],
    ['a dense ancient canopy', 'a flower-filled valley', 'a misty tree-line'],
    ['pollen shafts', 'ground mist', 'drifting leaves'],
    ['a colossal root arch', 'a secluded woodland pavilion', 'a ring of flowering trees'],
    'sterile cyber grids or a treeless barren horizon'
  ),
  sogen: recipe(
    'an expansive grassland shaped by wind, seasonal colour and a distant open horizon',
    ['#183318', '#4f7c2c', '#9fbe55', '#f1d99a'],
    ['turf', 'fieldstone', 'sun-bleached wood'],
    ['rolling green hills', 'a broad amber plain', 'a rain-washed meadow'],
    ['seed fluff', 'wind-bent grass', 'soft sun haze'],
    ['a lone fieldstone circle', 'a low ceremonial terrace', 'a winding grass path'],
    'enclosed interiors or dense urban skylines'
  ),
  wasteland: recipe(
    'a harsh eroded expanse where monumental ruins emerge from fractured earth',
    ['#2c1b13', '#75402a', '#b77943', '#f0c47b'],
    ['cracked clay', 'sandstone', 'oxidized iron'],
    ['a dust-choked desert', 'a field of eroded pillars', 'a distant ruin ridge'],
    ['windblown dust', 'heat shimmer', 'falling grit'],
    ['a split mesa gateway', 'a buried ruin court', 'a ring of weathered stelae'],
    'lush wet vegetation or pristine polished architecture'
  ),
  mountain: recipe(
    'a high-altitude landscape of vertical rock, powerful wind and distant depth',
    ['#17212b', '#445363', '#8593a0', '#d7e6ef'],
    ['granite', 'slate', 'cold iron'],
    ['a stormy mountain chain', 'a cloud-filled ravine', 'a sunlit summit shelf'],
    ['fast cloud wisps', 'wind-carried snow grains', 'thin blue haze'],
    ['a cliff-spanning bridge', 'a summit shrine silhouette', 'a carved ravine platform'],
    'flat tropical beaches or cramped domestic interiors'
  ),
  cave: recipe(
    'a subterranean chamber defined by depth, mineral formations and concealed passages',
    ['#080f14', '#26343b', '#526b68', '#9bd7c8'],
    ['rough cavern rock', 'mineral crystal', 'old timber'],
    ['a black cave mouth', 'a vaulted underground chamber', 'a descending chasm'],
    ['cold cave mist', 'mineral dust', 'sparse phosphorescent spores'],
    ['a natural stone bridge', 'a sealed underground door', 'a terraced cavern pit'],
    'open sunny skies or a clean modern city'
  ),
  swamp: recipe(
    'a saturated lowland of dark water, tangled growth and chemically coloured vapour',
    ['#101b13', '#354c25', '#66853b', '#c0da68'],
    ['waterlogged wood', 'peat', 'slick stone'],
    ['a drowned forest', 'a flooded reed basin', 'a storm-dark marsh'],
    ['heavy vapour', 'water ripples', 'glowing spores'],
    ['a crooked root island', 'a flooded stone ring', 'a half-sunken walkway'],
    'dry clean marble or brilliant cloudless daylight'
  ),
  volcanic: recipe(
    'a volcanic frontier whose architecture survives between molten fissures and ash',
    ['#170b08', '#5d1d12', '#c44a16', '#ffc15a'],
    ['black lava rock', 'heat-darkened steel', 'obsidian glass'],
    ['an erupting caldera', 'an ash-covered island', 'a red fissured horizon'],
    ['falling ash', 'heat distortion', 'sparse fire sparks'],
    ['an obsidian causeway', 'a forge-like crater gate', 'a basalt crown platform'],
    'snow, lush wetlands or cool pastel lighting'
  ),
  ice: recipe(
    'a frozen basin of translucent ice, deep blue fissures and sculpted snow',
    ['#071b2d', '#225d83', '#72b9d4', '#e2fbff'],
    ['blue ice', 'frosted stone', 'pale metal'],
    ['a glacier wall', 'a frozen cenote', 'a white polar horizon'],
    ['diamond frost', 'fine snow', 'cold ground fog'],
    ['an ice-ring cradle', 'a frozen archipelago shelf', 'a crystalline well'],
    'warm tropical colour or exposed molten rock'
  ),
  graveyard: recipe(
    'a solemn necropolis where age, memory and moonlight shape the terrain',
    ['#0d1117', '#303344', '#666b78', '#c5cee8'],
    ['weathered stone', 'tarnished iron', 'dead wood'],
    ['a moonlit cemetery', 'an ancient funerary city', 'a valley of memorial stones'],
    ['low silver fog', 'spirit-like motes', 'slow falling leaves'],
    ['a sunken memorial court', 'a cracked mausoleum gate', 'a field of leaning markers'],
    'festival colour, comedy props or spotless modern surfaces'
  ),
  'city-modern': recipe(
    'a contemporary metropolis staged through architecture, infrastructure and electric light',
    ['#081724', '#23465e', '#537c91', '#55d8ff'],
    ['concrete', 'glass', 'brushed steel'],
    ['a rain-lit skyline', 'a dense midnight district', 'a bright elevated plaza'],
    ['light rain', 'urban haze', 'reflected neon glow'],
    ['an elevated transit court', 'a canyon of towers', 'a rooftop civic platform'],
    'medieval masonry or untouched wilderness dominating the frame'
  ),
  'city-fantasy': recipe(
    'an impossible city whose towers, bridges and civic spaces are shaped by magic',
    ['#17112d', '#4e3770', '#8a62a8', '#e5c6ff'],
    ['enchanted stone', 'coloured glass', 'patinated brass'],
    ['a floating acropolis', 'a lantern-lit arcane quarter', 'a skyline of crooked towers'],
    ['arcane sparks', 'luminous haze', 'slow floating fragments'],
    ['a suspended civic plaza', 'a many-arched spell tower', 'a bridge around a magic well'],
    'ordinary office blocks or purely realistic engineering'
  ),
  'castle-palace': recipe(
    'a monumental royal complex organized around courtyards, fortifications and ceremony',
    ['#17151a', '#514556', '#917564', '#f0cf9c'],
    ['cut stone', 'dark hardwood', 'aged gold'],
    ['a fortified citadel', 'a torch-lit palace court', 'a distant crown of towers'],
    ['banner movement', 'golden dust', 'thin morning mist'],
    ['a grand audience terrace', 'a fortified drawbridge', 'an enclosed royal garden court'],
    'industrial pipes or abstract data grids'
  ),
  'temple-sanctuary': recipe(
    'a sacred precinct composed with processional paths, ritual stone and calm light',
    ['#28251e', '#6b624d', '#a99d72', '#fff0bd'],
    ['ritual stone', 'cedar', 'warm bronze'],
    ['a mountain sanctuary', 'a sunlit temple court', 'a field of sacred pillars'],
    ['incense haze', 'prayer-light motes', 'soft falling petals'],
    ['a processional stair', 'a circular offering court', 'a monumental sacred doorway'],
    'commercial signage, amusement props or aggressive neon'
  ),
  'arena-stadium': recipe(
    'a competitive venue whose scale, audience architecture and floodlights frame the contest',
    ['#101820', '#344d61', '#6f8291', '#bff4ff'],
    ['competition flooring', 'painted steel', 'reinforced concrete'],
    ['a vast enclosed stadium', 'an open-air circuit', 'a floodlit colosseum'],
    ['spotlight dust', 'subtle crowd haze', 'moving light beams'],
    ['a championship central stage', 'a banked racing curve', 'a ring of monumental stands'],
    'quiet domestic spaces or an empty featureless void'
  ),
  'theater-amusement': recipe(
    'a performance world assembled from theatrical architecture and imaginative spectacle',
    ['#241029', '#713b70', '#bf659e', '#ffd0ec'],
    ['painted stage wood', 'velvet', 'coloured glass'],
    ['a fantastical proscenium', 'a night amusement park', 'a many-level show stage'],
    ['confetti glints', 'stage haze', 'floating marquee bulbs'],
    ['a transforming centre stage', 'a carnival gateway', 'a layered story-theatre set'],
    'military realism or colourless utilitarian architecture'
  ),
  'industrial-lab': recipe(
    'a functional research-industrial complex made legible through machinery and controlled hazards',
    ['#10191b', '#33494b', '#58716e', '#8cf2d5'],
    ['painted steel', 'reinforced glass', 'ceramic panels'],
    ['a sprawling factory lab', 'a reactor hall', 'a city-sized research deck'],
    ['steam jets', 'warning-light haze', 'fine machine sparks'],
    ['a contained experiment chamber', 'a multi-level production line', 'a central reactor gantry'],
    'ancient untouched ruins or soft fairy-tale scenery'
  ),
  'mechanical-fortress': recipe(
    'an armored machine citadel whose moving structures imply immense engineered power',
    ['#111316', '#41464c', '#77736a', '#ffbb69'],
    ['armored steel', 'dark brass', 'carbon composite'],
    ['a mobile fortress deck', 'a horizon of gear towers', 'an enclosed launch bastion'],
    ['engine exhaust', 'orange machine sparks', 'hydraulic vapour'],
    ['an interlocking armored gate', 'a mechanical command platform', 'a rotating gear courtyard'],
    'fragile pastoral decoration or unstructured organic wilderness'
  ),
  'digital-cyber': recipe(
    'a spatialized cyber realm in which data architecture has convincing depth and scale',
    ['#03111f', '#074368', '#087e9b', '#50f5ff'],
    ['luminous data glass', 'dark alloy', 'pixel matter'],
    ['an infinite data horizon', 'a network city', 'a layered circuit void'],
    ['data fragments', 'scan-line haze', 'thin energy streams'],
    ['a volumetric network hub', 'a circuit-etched data plaza', 'a gateway of stacked light planes'],
    'paper UI panels or a flat two-dimensional grid'
  ),
  'cosmic-dimensional': recipe(
    'a physically convincing dimensional frontier framed by celestial scale and spatial anomalies',
    ['#09091c', '#29215b', '#654b9d', '#c4abff'],
    ['dark meteor stone', 'iridescent crystal', 'unknown alloy'],
    ['a many-coloured nebula', 'a fractured planetary horizon', 'a vast dimensional rift'],
    ['stardust', 'slow energy arcs', 'floating rock fragments'],
    ['a ring-shaped world gate', 'a platform between split realities', 'a gravity-defying monolith field'],
    'ordinary terrestrial weather as the only visual idea'
  ),
  'celestial-light': recipe(
    'a luminous upper realm made from cloudstone, radiant architecture and immense sky',
    ['#3e5270', '#8297bd', '#c3d4ed', '#fff4b5'],
    ['pale cloudstone', 'golden metal', 'luminous glass'],
    ['a boundless bright sky', 'a chain of floating islands', 'a star-filled dawn'],
    ['light feathers', 'sunlit vapour', 'slow star motes'],
    ['a radiant sky bridge', 'a haloed floating court', 'a stairway through clouds'],
    'oppressive underground darkness or dirty industrial smoke'
  ),
  'toon-world': recipe(
    'an original pop-up fantasy landscape with handcrafted depth and playful physical exaggeration',
    ['#27133c', '#7451a6', '#ef719e', '#ffe46e'],
    ['painted paper', 'toy-like wood', 'glossy candy glass'],
    ['a folding storybook horizon', 'a whimsical toy kingdom', 'a bright impossible village'],
    ['paper stars', 'soap-like bubbles', 'colourful stage puffs'],
    ['a pop-up castle street', 'a folding illustrated valley', 'a toy theatre plaza'],
    'existing Toon character designs or direct imitation of official Toon World imagery'
  ),
  generic: recipe(
    'a bespoke surreal territory whose landmark translates the card title into physical space',
    ['#101624', '#34425f', '#6f6c98', '#91ecff'],
    ['dark stone', 'holographic glass', 'brushed metal'],
    ['an unfamiliar transformed horizon', 'a layered liminal landscape', 'a monumental abstract territory'],
    ['fine holographic dust', 'coloured atmospheric haze', 'slow geometric fragments'],
    ['a unique title-inspired monument', 'an asymmetrical transformation court', 'a landscape-sized symbolic machine'],
    'a blank generic gradient or an interchangeable empty sci-fi room'
  )
});

const TITLE_CUES = Object.freeze([
  cue(/\b(ocean|sea|umi|waterfront|seaside|abyss|depths|atlanti|cenote)\b/i,
    'water surrounding a tide-shaped landmark', 'visible depth beneath a reflective waterline'),
  cue(/\b(forest|garden|village|flower|bloom|spring|summer|naturia|woodland)\b/i,
    'vegetation growing into a singular architectural landmark', 'layered plants with a clear seasonal identity'),
  cue(/\b(mountain|ravine|peak|canyon|cliff|mist valley)\b/i,
    'a vertical landmark carved into high rock', 'strong altitude cues and distant scale'),
  cue(/\b(volcano|molten|fire|ash|inferno|phoenix)\b/i,
    'a heat-scarred landmark surviving active geology', 'controlled lava light and airborne ash'),
  cue(/\b(ice|frozen|frost|ursarctic)\b/i,
    'a translucent frozen landmark above deep fissures', 'multiple readable layers of ice'),
  cue(/\b(swamp|wetland|venom|acid|downpour|ogdoadic)\b/i,
    'a half-submerged landmark overtaken by saturated terrain', 'dark water with toxic or storm-tinted vapour'),
  cue(/\b(grave|necro|zombie|vampire|memento|vendread|shiranui|forgotten)\b/i,
    'a memorial landmark made ancient by time', 'somber funerary depth without graphic horror'),
  cue(/\b(castle|palace|camelot|chateau|mansion|throne|monarch|kingdom)\b/i,
    'a fortified ceremonial landmark', 'a distinctive court, gate and tower silhouette'),
  cue(/\b(temple|sanctuary|shrine|mausoleum|tomb|sacred|divine)\b/i,
    'a processional sacred landmark', 'ritual architecture and a calm focal light'),
  cue(/\b(stadium|arena|colosseum|match|grand prix|circuit|ballpark|wrestling)\b/i,
    'a purpose-built competitive landmark', 'spectator scale, floodlights and a readable contest route'),
  cue(/\b(theater|theatre|stage|show|playhouse|park|ball|session|dueltaining)\b/i,
    'a transforming performance landmark', 'layered stagecraft and practical show lighting'),
  cue(/\b(lab|factory|plant|specimen|research|recycling|switchyard|hangar|hq)\b/i,
    'a functional industrial landmark centered on one process', 'pipes, gantries and controlled energy flow'),
  cue(/\b(fortress|fortissimo|base|dock|launch|shipyard|carrier|bastion)\b/i,
    'a heavily engineered mobile landmark', 'armored structure with believable access and machinery'),
  cue(/\b(cyber|cynet|network|matrix|circuit|digital|maliss|appliancer|bug)\b/i,
    'a volumetric network landmark', 'data layers that read as architecture rather than flat UI'),
  cue(/\b(space|planet|world|dimension|universe|cosmic|gate|portal|chaos|barian)\b/i,
    'a landmark joining two visibly different realities', 'celestial scale and one coherent spatial anomaly'),
  cue(/\b(light|heaven|sky|star|zodiac|celest|dream|forecast)\b/i,
    'a radiant airborne landmark', 'volumetric light, clouds and distant vertical depth'),
  cue(/\b(dark|nightmare|shadow|curse|yami|pandemonium|dread|malefic)\b/i,
    'an ominous landmark defined by silhouette', 'restrained occult geometry and directional violet light'),
  cue(/\b(toon|fairy|story|doll|ojama|purrely|yummy|madolche|prank|smile)\b/i,
    'a handcrafted whimsical landmark unique to the title', 'physical pop-up layers and playful scale shifts'),
  cue(/\b(city|town|academy|street|skyscraper|resort|country)\b/i,
    'a civic landmark anchoring a distinctive district', 'infrastructure, foreground street level and skyline depth'),
  cue(/\b(prison|lair|dungeon|mine|underground|hidden|labyrinth)\b/i,
    'a concealed landmark reached through a dangerous passage', 'foreground barriers and a visible route into depth'),
  cue(/\b(tower|citadel|acropolis|babel)\b/i,
    'a singular tower landmark visible from every layer', 'a strong vertical silhouette and surrounding lower structures'),
  cue(/\b(island|paradise|calarium)\b/i,
    'an isolated landmark controlling the surrounding landscape', 'clear shoreline or boundary and a distant horizon'),
  cue(/\b(map|diagram|geoglyph|scroll|sign|forecast)\b/i,
    'a landscape-scale symbol translated into terrain', 'physical relief and pathways rather than printed graphics'),
  cue(/\b(zone|field|territory|domain|realm|nation|land)\b/i,
    'a territorial landmark defining a clear environmental boundary', 'a foreground threshold and transformed horizon')
]);

function recipe(setting, palette, materials, horizons, atmospheres, landmarks, avoid) {
  return Object.freeze({
    setting,
    palette: Object.freeze(palette),
    materials: Object.freeze(materials),
    horizons: Object.freeze(horizons),
    atmospheres: Object.freeze(atmospheres),
    landmarks: Object.freeze(landmarks),
    avoid
  });
}

function cue(pattern, focus, required) {
  return Object.freeze({ pattern, focus, required });
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(values, hash, offset = 0) {
  return values[(hash + offset) % values.length];
}

function normalizeCardId(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d{1,12}$/.test(normalized)) return null;
  return normalized.replace(/^0+(?=\d)/, '');
}

function deriveArchetypeHint(name) {
  const significantWords = String(name)
    .replace(/[★☆]/g, ' ')
    .split(/\s+/)
    .map(word => word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''))
    .filter(Boolean)
    .filter(word => ![
      'a', 'an', 'the', 'of', 'and', 'at', 'in', 'to', 'with',
      'world', 'field', 'zone', 'realm', 'domain'
    ].includes(word.toLowerCase()));
  return significantWords.slice(0, 3).join(' ') || String(name);
}

function deriveMechanicCues(effectText) {
  const cues = EFFECT_VISUAL_CUES
    .filter(entry => entry.pattern.test(effectText))
    .slice(0, 2)
    .map(entry => entry.cue);
  return cues.length
    ? cues
    : ['the focal landmark visibly routes environmental energy without adding generic spectacle'];
}

function resolveTitleCue(name, environmentId) {
  return TITLE_CUES.find(entry => entry.pattern.test(name)) || Object.freeze({
    focus: RECIPES[environmentId].landmarks[0],
    required: `one unmistakable environmental motif derived literally from “${name}”`
  });
}

function freezeBrief(brief) {
  Object.freeze(brief.palette);
  Object.freeze(brief.mustInclude);
  Object.freeze(brief.avoid);
  Object.freeze(brief.mechanicCues);
  Object.freeze(brief.sourceBasis);
  return Object.freeze(brief);
}

function buildBrief(catalogEntry) {
  const { cardId, name, environmentId } = catalogEntry;
  const recipeConfig = RECIPES[environmentId];
  if (!recipeConfig) throw new RangeError(`Missing illustration recipe: ${environmentId}`);
  const runtimeEntry = getFieldSpellRuntimeManifestEntry(cardId);
  if (
    !runtimeEntry
    || runtimeEntry.name !== name
    || runtimeEntry.environmentFamily !== environmentId
  ) {
    throw new RangeError(`Missing exact Field Spell runtime contract: ${cardId}`);
  }
  const cardData = FIELD_SPELL_CARD_DATA_SNAPSHOT[cardId];
  if (!cardData || cardData.name !== name) {
    throw new RangeError(`Missing exact Field Spell source data: ${cardId}`);
  }

  const hash = stableHash(`${cardId}:${name}`);
  const titleCue = resolveTitleCue(name, environmentId);
  const archetypeHint = cardData.archetype || deriveArchetypeHint(name);
  const mechanicCues = deriveMechanicCues(cardData.effectText);
  const distinctiveSceneCue = [
    titleCue.required,
    ...mechanicCues
  ].join('; ');
  const material = pick(recipeConfig.materials, hash, 7);
  const horizon = pick(recipeConfig.horizons, hash, 17);
  const atmosphere = pick(recipeConfig.atmospheres, hash, 29);
  const supportingLandmark = pick(recipeConfig.landmarks, hash, 43);
  const viewpoints = [
    'low three-quarter establishing view',
    'elevated diagonal establishing view',
    'ground-level wide establishing view',
    'high oblique cinematic establishing view'
  ];
  const lightMoments = [
    'blue hour with a narrow warm rim light',
    'dramatic overcast light broken by one directional beam',
    'late-afternoon side light with long readable shadows',
    'night illumination driven by the landmark itself',
    'early dawn with cool shadows and a restrained bright horizon'
  ];
  const viewpoint = pick(viewpoints, hash, 59);
  const lightMoment = pick(lightMoments, hash, 71);

  return freezeBrief({
    cardId,
    name,
    slug: runtimeEntry.assetPath
      .slice(`${FIELD_SPELL_ILLUSTRATION_ASSET_ROOT}/${cardId}-`.length)
      .replace(/-original\.webp$/, ''),
    assetPath: runtimeEntry.assetPath,
    archetypeHint,
    environmentFamily: environmentId,
    effectSummary: cardData.effectText,
    distinctiveSceneCue,
    mechanicCues,
    sourceBasis: {
      canonicalId: cardId,
      title: name,
      archetype: cardData.archetype,
      derivation: 'exact effect text, title, API archetype and audited environment classification',
      effectDataRetrievedOn: FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA.retrievedOn,
      effectDataSource: FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA.sourceUrl,
      officialArtUsedAsSource: false
    },
    scene: [
      `Create an original ${viewpoint} for the Field Spell concept “${name}”;`,
      `interpret the title as ${titleCue.focus}, without recreating any official card illustration.`,
      `The location is ${recipeConfig.setting}, opening toward ${horizon}.`,
      `Build the focal structure from ${material}, support it with ${supportingLandmark},`,
      `and make ${distinctiveSceneCue}.`,
      `Ground that visual logic in this exact card effect: ${cardData.effectText}`,
      `Use ${atmosphere} under ${lightMoment}; the visual language should distinctly suggest`,
      `the ${archetypeHint} theme while remaining an unbranded environment with clear foreground,`,
      'midground and background depth suitable for a dedicated 16:9 arena backdrop.'
    ].join(' '),
    palette: { ...runtimeEntry.palette },
    mustInclude: [
      `one singular focal landmark interpreting “${name}” as ${titleCue.focus}`,
      titleCue.required,
      supportingLandmark,
      `${material} as a clearly readable signature material`,
      `${atmosphere} separated from the focal landmark`,
      `an effect-specific environmental cue: ${mechanicCues.join('; ')}`,
      'a clear central arena footprint with unobstructed card readability'
    ],
    avoid: [
      ...UNIVERSAL_AVOID,
      recipeConfig.avoid,
      `interchangeable scenery that could represent a different Field Spell instead of “${name}”`
    ]
  });
}

export const FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST = Object.freeze(
  FIELD_SPELL_ENVIRONMENT_CATALOG.map(buildBrief)
);

export const FIELD_SPELL_ILLUSTRATION_BRIEF_COUNT =
  FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST.length;

const briefByCardId = new Map(
  FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST.map(brief => [brief.cardId, brief])
);

export function getFieldSpellIllustrationBrief(cardId) {
  const normalizedCardId = normalizeCardId(cardId);
  return normalizedCardId ? briefByCardId.get(normalizedCardId) || null : null;
}

export function validateFieldSpellIllustrationBriefManifest(
  manifest = FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST
) {
  const errors = [];
  const expectedCardIds = new Set(FIELD_SPELL_ENVIRONMENT_CATALOG.map(entry => entry.cardId));
  const cardIds = new Set();
  const slugs = new Set();
  const assetPaths = new Set();
  const scenes = new Set();
  const palettes = new Set();
  const signatureAccents = new Set();

  if (!Array.isArray(manifest)) errors.push('manifest must be an array');
  const entries = Array.isArray(manifest) ? manifest : [];
  if (entries.length !== EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT) {
    errors.push(`expected ${EXPECTED_FIELD_SPELL_ENVIRONMENT_COUNT} entries, received ${entries.length}`);
  }

  for (const entry of entries) {
    const cardId = normalizeCardId(entry?.cardId);
    if (!cardId || !expectedCardIds.has(cardId)) errors.push(`unknown canonical card ID: ${entry?.cardId}`);
    else if (cardIds.has(cardId)) errors.push(`duplicate canonical card ID: ${cardId}`);
    else cardIds.add(cardId);

    if (!entry?.name || typeof entry.name !== 'string') errors.push(`missing name: ${cardId}`);
    if (!entry?.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) {
      errors.push(`invalid slug: ${cardId}`);
    } else if (slugs.has(entry.slug)) {
      // Duplicate titles are valid in card data, but illustration slugs must not collide.
      errors.push(`duplicate slug: ${entry.slug}`);
    } else slugs.add(entry.slug);

    if (
      !entry?.assetPath
      || !entry.assetPath.startsWith(`${FIELD_SPELL_ILLUSTRATION_ASSET_ROOT}/`)
      || !entry.assetPath.startsWith(`${FIELD_SPELL_ILLUSTRATION_ASSET_ROOT}/${cardId}-`)
      || !entry.assetPath.endsWith('-original.webp')
    ) {
      errors.push(`invalid dedicated asset path: ${cardId}`);
    } else if (assetPaths.has(entry.assetPath)) errors.push(`duplicate asset path: ${entry.assetPath}`);
    else assetPaths.add(entry.assetPath);

    if (!entry?.scene || entry.scene.length < 300) errors.push(`brief scene is not precise enough: ${cardId}`);
    else if (scenes.has(entry.scene)) errors.push(`duplicate scene brief: ${cardId}`);
    else scenes.add(entry.scene);

    if (!entry?.effectSummary || entry.effectSummary.length < 20) {
      errors.push(`missing exact effect summary: ${cardId}`);
    }
    if (!entry?.distinctiveSceneCue || entry.distinctiveSceneCue.length < 40) {
      errors.push(`missing distinctive scene cue: ${cardId}`);
    }
    if (!Array.isArray(entry?.mechanicCues) || entry.mechanicCues.length < 1) {
      errors.push(`missing effect mechanic cues: ${cardId}`);
    }
    const palette = entry?.palette && Object.values(entry.palette);
    if (!palette || palette.length !== 5 || palette.some(color => !/^#[0-9a-f]{6}$/i.test(color))) {
      errors.push(`invalid five-colour palette: ${cardId}`);
    } else {
      const paletteSignature = palette.join(':').toLowerCase();
      const signatureAccent = entry.palette.signatureAccent.toLowerCase();
      if (palettes.has(paletteSignature)) errors.push(`duplicate palette: ${cardId}`);
      else palettes.add(paletteSignature);
      if (signatureAccents.has(signatureAccent)) {
        errors.push(`duplicate signature accent: ${cardId}`);
      } else signatureAccents.add(signatureAccent);
    }
    if (!Array.isArray(entry?.mustInclude) || entry.mustInclude.length < 6) {
      errors.push(`missing required scene elements: ${cardId}`);
    }
    if (!Array.isArray(entry?.avoid) || entry.avoid.length < 7) {
      errors.push(`missing negative constraints: ${cardId}`);
    }
    if (entry?.sourceBasis?.officialArtUsedAsSource !== false) {
      errors.push(`official art policy not enforced: ${cardId}`);
    }
    if (
      entry?.sourceBasis?.effectDataSource
        !== FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA.sourceUrl
      || entry?.sourceBasis?.effectDataRetrievedOn
        !== FIELD_SPELL_CARD_DATA_SNAPSHOT_METADATA.retrievedOn
    ) {
      errors.push(`missing audited effect source: ${cardId}`);
    }
  }

  for (const expectedCardId of expectedCardIds) {
    if (!cardIds.has(expectedCardId)) errors.push(`missing canonical card ID: ${expectedCardId}`);
  }

  return Object.freeze({
    valid: errors.length === 0,
    count: entries.length,
    uniqueCardIdCount: cardIds.size,
    uniqueSlugCount: slugs.size,
    uniqueAssetPathCount: assetPaths.size,
    uniqueSceneCount: scenes.size,
    uniquePaletteCount: palettes.size,
    uniqueSignatureAccentCount: signatureAccents.size,
    errors: Object.freeze(errors)
  });
}

const manifestValidation = validateFieldSpellIllustrationBriefManifest();
if (!manifestValidation.valid) {
  throw new AggregateError(
    manifestValidation.errors.map(message => new Error(message)),
    'Invalid Field Spell illustration brief manifest'
  );
}

export default FIELD_SPELL_ILLUSTRATION_BRIEF_MANIFEST;
