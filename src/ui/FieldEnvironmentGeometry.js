/**
 * Peripheral, real geometry for the Field Spell environments. The dedicated
 * backdrop stays the illustration source; these volumes add parallax and
 * environmental detail without obscuring the playable area or private cards.
 *
 * Inspected illustrations have explicit scenery motifs and palettes below;
 * other profiles retain procedural interpretations. Dimensions are adapted to
 * the playable corridor, so source fidelity is described per profile.
 * No renderer, DOM, card textures, random global state or animation is needed.
 */

export const FIELD_ENVIRONMENT_GEOMETRY_FAMILIES = Object.freeze([
  'clearing', 'cave', 'generic', 'yami', 'umi', 'forest', 'mountain',
  'sogen', 'wasteland', 'toon-world', 'swamp', 'volcanic', 'ice',
  'graveyard', 'city-modern', 'city-fantasy', 'castle-palace',
  'temple-sanctuary', 'arena-stadium', 'theater-amusement',
  'industrial-lab', 'mechanical-fortress', 'digital-cyber',
  'cosmic-dimensional', 'celestial-light'
]);

const FAMILY_SET = new Set(FIELD_ENVIRONMENT_GEOMETRY_FAMILIES);
export const FIELD_ENVIRONMENT_GEOMETRY_BUDGET = Object.freeze({
  maxDrawCallCount: 18,
  maxMaterialCount: 10,
  maxPrimitiveCount: 220,
  maxHorizontalExtent: 48,
  playableCorridor: Object.freeze({
    min: Object.freeze([-9, -3, -18]),
    max: Object.freeze([9, 30, 17])
  })
});
export const FIELD_ENVIRONMENT_CARD_LANDMARKS = Object.freeze({
  '295517': 'submerged-ruins',
  '71645242': 'thorn-garden',
  '75041269': 'clock-tower',
  '62265044': 'ravine',
  '57554544': 'island-caldera',
  '33550694': 'fusion-gate',
  '37694547': 'gearworks',
  '72283691': 'golden-castle',
  '59160188': 'shadow-prison',
  '17228908': 'primeval-grove',
  '39910367': 'arcane-citadel',
  '80921533': 'imperial-mausoleum',
  '24382602': 'white-mausoleum',
  '76375976': 'mine-entrance',
  '47355498': 'funerary-valley',
  '63035430': 'skyscrapers',
  '47596607': 'hero-city',
  '56433456': 'sky-sanctuary',
  '43175858': 'storybook-castle',
  '2084239': 'reed-basin',
  '4064256': 'ruined-crypt',
  '92107604': 'runic-fountain',
  '13035077': 'dragonic-diagram',
  '47679935': 'fusion-meltdown',
  '34487429': 'rainbow-ruins',
  '59054773': 'cyber-islands',
  '66399653': 'union-hangar',
  '67237709': 'orbital-town',
  '41418852': 'numeron-gate-network',
  '77103950': 'primeval-tidal-planet',
  '71832012': 'pressured-planet',
  '89264428': 'seven-star-observatory',
  '5050644': 'aromatic-garden',
  '68462976': 'hidden-spellcaster-village',
  '76136345': 'railway-turntable',
  '50005218': 'airspace-launch-base',
  '1127737': 'dimensional-shipwrecks',
  '58793369': 'stellar-ritual-orbits',
  '36668118': 'launch-silos',
  '95658967': 'ritual-light-basin',
  '95477924': 'twin-salvation-gates',
  '1050355': 'nightmare-mirror',
  '74665651': 'radiant-mirror',
  '94585852': 'archfiend-court',
  '56111151': 'waterfront-counter-tower',
  '56594520': 'gaia-ancient-oak',
  '82999629': 'umiiruka-breaking-waves',
  '81777047': 'luminous-diagonal-rays',
  '18161786': 'plasma-storm-spiral',
  '45778932': 'rising-sky-currents',
  '19384334': 'molten-erupting-volcano',
  '81380218': 'chorus-cloud-garden',
  '59197169': 'yami-magenta-void',
  '22702055': 'umi-cobalt-swell',
  '87430998': 'forest-forked-clearing',
  '50913601': 'mountain-twin-ridges',
  '86318356': 'sogen-grass-terraces',
  '23424603': 'wasteland-stratified-escarpment',
  '48179391': 'orichalcos-six-point-seal',
  '14001430': 'madolche-cake-palace',
  '87624166': 'ancient-forest-canopy',
  '84171830': 'monarch-shadow-hall',
  '33407125': 'labrynth-white-palace',
  '10080320': 'jurassic-caldera-grove',
  '16625614': 'dark-sanctuary-eye-castle',
  '61583217': 'cynet-hexagonal-cosmos'
});

// Individually inspected, original cropped illustrations. These palettes and
// motifs describe the source, not a title-derived/generative scene. The game
// keeps illustrated creatures in the preserved background; peripheral props
// reconstruct the surrounding scenery while leaving the duel corridor clear.
export const FIELD_ENVIRONMENT_INSPECTED_ART_PROFILES = Object.freeze(Object.fromEntries([
  ['56594520', ['#70884f','#775137','#1e4e2b','#bce0ce','#744527','#dce7be'], ['massive branching oak', 'broad exposed roots', 'deep green crown']],
  ['82999629', ['#0879b8','#55796c','#1c75ae','#ecf8ff','#305442','#f5fbff'], ['stacked blue breakers', 'white crests', 'thin distant shoreline']],
  ['81777047', ['#fafafa','#161519','#121217','#ec353e','#222025','#ffffff'], ['white void', 'black diagonal rays', 'red edge streaks']],
  ['18161786', ['#626866','#705d51','#513a8b','#66eaff','#332757','#9e87d3'], ['purple cloud spiral', 'cyan forked lightning', 'low sloping rock']],
  ['45778932', ['#3877ba','#a7bfd2','#729bba','#e1ecf2','#698094','#edf3fa'], ['blue sky', 'diagonal wispy cloud bands', 'open aerial space']],
  ['19384334', ['#2c1b13','#291a13','#493429','#fff03a','#371d13','#ffa137'], ['wide black volcano', 'branching orange lava', 'yellow eruption and debris']],
  ['81380218', ['#b9d4e9','#e6dfc1','#427a43','#e6d781','#a9784e','#f0f3f4'], ['cloud sea', 'pink horizon gate', 'red corner roses and musical notes']],
  ['59197169', ['#080508','#33112d','#5e224f','#e588b4','#301523','#a95783'], ['large black void', 'concave magenta edge mist', 'descending pink rays']],
  ['22702055', ['#0367ab','#156b9c','#0783b5','#b9eef8','#1a628f','#edfaff'], ['cobalt ocean', 'long pale foam lines', 'slanted wave horizon']],
  ['87430998', ['#90ae4c','#759158','#43753e','#c6d797','#758458','#e5ebbf'], ['forked trunks at right', 'dark conifer wall', 'yellow green clearing']],
  ['50913601', ['#6d645f','#796255','#616974','#b7d5e9','#675245','#c3d8e8'], ['tall right rock peak', 'lower left ridge', 'blue mist valley']],
  ['86318356', ['#6d9f43','#637159','#3a8a3b','#abd26c','#577143','#c9dbab'], ['open green plain', 'low distant mountain chain', 'right grassy fissure']],
  ['23424603', ['#8d7861','#8e7764','#474439','#c2ac91','#79604c','#d0c2ae'], ['horizontal barren terraces', 'angular foreground escarpment', 'two bare trees']],
  ['48179391', ['#282d3a','#414855','#424e52','#40ff65','#313845','#e6fff0'], ['two neon green circles', 'six point star', 'dark smoky space']],
  ['14001430', ['#dcc481','#a37544','#aa88bb','#ed94b5','#b2804d','#fff1bd'], ['stacked wafer cake towers', 'cream piping', 'pink strawberry roofs']],
  ['87624166', ['#173d45','#53625b','#43a28e','#c7f5dd','#5e6d5f','#eafff2'], ['tall enclosing trunks', 'cyan green canopy', 'central white light shafts']],
  ['84171830', ['#272634','#4e4b60','#393441','#bbb4c9','#3d3a46','#d8d4e0'], ['tall gray hall columns', 'two immense shadow thrones', 'white overhead light']],
  ['33407125', ['#d6e5f0','#e8eefa','#86b8e9','#ba8bea','#bcc8e8','#faffff'], ['tiered white blue palace', 'pointed blue turrets', 'curved elevated access ramps']],
  ['10080320', ['#345d35','#8e8c7b','#3d8053','#bad0ef','#485d43','#b8cae4'], ['fern jungle and hanging vines', 'encircling stone caldera', 'smoking volcano beyond']],
  ['16625614', ['#4e1738','#341528','#622947','#ae4082','#45202d','#bd659d'], ['dark spired castle on jagged rock', 'red violet sky', 'large surrounding eyes']],
  ['61583217', ['#062d55','#1b4874','#247f99','#7ce9ff','#123459','#b9f7ff'], ['cyan hexagon lattice', 'calibrated orbit discs', 'bright connected nodes']],
  ['2084239', ['#294f40','#638f87','#2c962b','#a5ccd2','#276326','#9baead'], ['dense rain soaked grass', 'horizontal dark water strip', 'low misty mountain horizon']],
  ['56433456', ['#766b62','#d0c6af','#173b2a','#fff3cc','#71645a','#d7e3ec'], ['ruined temple on floating rock', 'broad front stairway', 'orb monument and circular side terrace']],
  ['63035430', ['#1b2437','#303e48','#43515a','#e9eead','#26353c','#b7c9ce'], ['enclosing dark skyscraper facades', 'yellow window grids', 'stepped central spire moon and crossed searchlights']]
].map(([cardId, colors, motifs]) => [cardId, Object.freeze({
  cardId,
  sourceUrl: `https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
  motifs: Object.freeze(motifs),
  palette: Object.freeze({ ground: colors[0], stone: colors[1], foliage: colors[2], accent: colors[3], wood: colors[4], foam: colors[5] })
})])));

function canonicalCardId(value) {
  const id = String(value ?? '').trim();
  return /^\d{1,12}$/.test(id) ? id.replace(/^0+(?=\d)/, '') : null;
}

function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result ^= character.codePointAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

export function resolveFieldEnvironmentGeometryProfile(environmentFamily, cardId = null) {
  const normalizedFamily = String(environmentFamily ?? '').trim().toLowerCase();
  const family = FAMILY_SET.has(normalizedFamily) ? normalizedFamily : 'generic';
  const normalizedCardId = canonicalCardId(cardId);
  const inspectedArt = FIELD_ENVIRONMENT_INSPECTED_ART_PROFILES[normalizedCardId] || null;
  return Object.freeze({
    family,
    cardId: normalizedCardId,
    landmark: FIELD_ENVIRONMENT_CARD_LANDMARKS[normalizedCardId] || family,
    hasDedicatedLandmark: Object.hasOwn(FIELD_ENVIRONMENT_CARD_LANDMARKS, normalizedCardId),
    seed: hash(`${family}:${normalizedCardId || 'base'}`),
    inspectedArt,
    fidelity: inspectedArt ? 'reference-informed-geometry' : 'procedural-interpretation'
  });
}

function readProfile(environment) {
  return resolveFieldEnvironmentGeometryProfile(
    environment?.geometryProfile?.family || environment?.id,
    environment?.fieldSpellCardId || environment?.geometryProfile?.cardId
  );
}

export function getFieldEnvironmentGeometrySignature(environment) {
  const profile = readProfile(environment);
  return [
    profile.family, profile.cardId || 'base', profile.landmark,
    environment?.environmentTint || '', environment?.accentColor || '',
    environment?.surfacePalette?.ground || '',
    environment?.surfacePalette?.platform || ''
  ].join(':');
}

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/** Receives the application's Three namespace so importing the registry stays lean. */
export function createFieldEnvironmentGeometry(THREE, environment = {}) {
  const profile = readProfile(environment);
  const random = seededRandom(profile.seed);
  const root = new THREE.Group();
  root.name = 'field-environment-geometry';
  root.userData = {
    environmentSignature: getFieldEnvironmentGeometrySignature(environment),
    family: profile.family,
    cardId: profile.cardId,
    landmark: profile.landmark,
    hasDedicatedLandmark: profile.hasDedicatedLandmark,
    fidelity: profile.fidelity,
    inspectedArt: profile.inspectedArt,
    publicOnly: true
  };

  const palette = environment.surfacePalette || {};
  const sourcePalette = profile.inspectedArt?.palette || {};
  const tint = sourcePalette.ground || palette.ground || environment.environmentTint || '#34425f';
  const stone = sourcePalette.stone || palette.platform || '#647078';
  const accent = sourcePalette.accent || environment.accentColor || '#79d9ff';
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.85, metalness: 0.04, ...options
  });
  const materials = {
    stone: material(stone),
    ground: material(tint),
    dark: material('#181e23'),
    metal: material('#465158', { metalness: 0.72, roughness: 0.4 }),
    wood: material(sourcePalette.wood || '#453629'),
    leaves: material(sourcePalette.foliage || (['yami', 'graveyard'].includes(profile.family) ? '#292330' : tint)),
    light: material(accent, { emissive: accent, emissiveIntensity: 0.65, roughness: 0.35 }),
    water: material(['umiiruka-breaking-waves','umi-cobalt-swell'].includes(profile.landmark) ? tint : (profile.family === 'swamp' ? '#2c5045' : '#14738b'), {
      roughness: 0.16, metalness: 0.5, transparent: true, opacity: 0.72
    }),
    ice: material('#93d9ee', { roughness: 0.24, metalness: 0.15 }),
    gold: material('#c79b44', { metalness: 0.62, roughness: 0.42 }),
    lava: material('#f04a12', { emissive: '#e53105', emissiveIntensity: 1.1 }),
    paper: material(sourcePalette.foam || '#e8cfa0', { side: THREE.DoubleSide })
  };
  const geometries = new Map();
  const geometry = (key, create) => {
    if (!geometries.has(key)) geometries.set(key, create());
    return geometries.get(key);
  };
  const add = (name, shape, mat, position, scale = [1, 1, 1], rotation = [0, 0, 0], parent = root) => {
    const mesh = new THREE.Mesh(shape, mat);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rotation);
    // Distant skyline shadows never reach the duel and needlessly multiply
    // shadow-map work. Nearby physical scenery still casts real shadows.
    mesh.castShadow = !mat.transparent && Math.abs(position[0]) < 20 && position[2] > -21;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = geometry('box', () => new THREE.BoxGeometry(1, 1, 1));
  const rock = geometry('rock', () => new THREE.DodecahedronGeometry(1, 1));
  const cone = geometry('cone', () => new THREE.ConeGeometry(1, 1, 8));
  const cylinder = geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 12));
  const crown = geometry('crown', () => new THREE.IcosahedronGeometry(1, 1));
  const ring = geometry('ring', () => new THREE.TorusGeometry(1, 0.035, 6, 64));
  const basinRim = geometry('basin-rim', () => new THREE.TorusGeometry(1, 0.1, 8, 48));
  const block = (name, mat, x, y, z, w, h, d, parent = root) => (
    add(name, box, mat, [x, y, z], [w, h, d], [0, 0, 0], parent)
  );
  const boulder = (x, z, scale = 1, mat = materials.stone, y = 0) => (
    add('weathered-rock', rock, mat, [x, y + scale * 0.55, z],
      [scale * 1.35, scale, scale * 0.9], [random() * 0.4, random() * 6, random() * 0.3])
  );
  const tree = (x, z, height, ancient = false) => {
    const trunk = add('tree-trunk', cylinder, materials.wood, [x, height * 0.3, z],
      [height * 0.08, height * 0.6, height * 0.08]);
    trunk.rotation.z = (random() - 0.5) * 0.14;
    for (let branch = 0; branch < 3; branch += 1) {
      const angle = branch * Math.PI * 2 / 3 + random();
      add('canopy-layer', crown, materials.leaves,
        [x + Math.cos(angle) * height * 0.15, height * (0.58 + branch * 0.09),
          z + Math.sin(angle) * height * 0.15],
        [height * 0.3, height * 0.25, height * 0.32], [0, angle, 0]);
    }
    if (ancient) {
      for (const side of [-1, 1]) {
        add('exposed-root', cylinder, materials.wood,
          [x + side * height * 0.11, 0.25, z], [0.22, height * 0.5, 0.22],
          [0, 0, side * 1.12]);
      }
    }
  };
  const tower = (x, z, height, width = 3, mat = materials.stone, fantasy = false) => {
    block('tower-plinth', mat, x, 0.4, z, width * 1.3, 0.8, width * 1.3);
    block('tower', mat, x, height * 0.5, z, width, height, width);
    block('tower-cornice', mat, x, height, z, width * 1.15, 0.45, width * 1.15);
    if (fantasy) add('tower-roof', cone, materials.dark, [x, height + 1.8, z], [width * 0.8, 3.2, width * 0.8]);
    for (let floor = 1.6; floor < height - 0.6; floor += 2) {
      block('illuminated-window', materials.light, x, floor, z + width * 0.506,
        width * 0.36, 0.48, 0.025);
    }
  };
  const columns = (x, z, count = 4, height = 6, mat = materials.stone, baseY = 0) => {
    for (let i = 0; i < count; i += 1) {
      const columnX = x + (i - (count - 1) / 2) * 2.2;
      block('column-base', mat, columnX, baseY + 0.3, z, 1.1, 0.6, 1.1);
      add('fluted-column', cylinder, mat, [columnX, baseY + height * 0.5 + 0.6, z], [0.38, height, 0.38]);
      block('column-capital', mat, columnX, baseY + height + 0.65, z, 1.15, 0.35, 1.15);
    }
    block('temple-entablature', mat, x, baseY + height + 1, z, count * 2.2 + 0.2, 0.55, 1.5);
  };
  const portal = (x, y, z, scale, mat = materials.light) => {
    add('dimensional-ring', ring, mat, [x, y, z], [scale, scale, scale]);
    add('portal-outer-orbit', ring, materials.metal, [x, y, z], [scale * 1.14, scale * 1.14, scale * 1.14], [0, 0.34, 0]);
    for (const side of [-1, 1]) block('portal-anchor', materials.stone, x + side * scale, 1.2, z, 1, 2.4, 2);
  };
  const waterShelf = (side, mat = materials.water) => {
    block('peripheral-water-shelf', mat, side * 18, -0.22, -5, 11, 0.12, 38);
    for (let ripple = 0; ripple < 3; ripple += 1) {
      add('water-ripple', ring, mat, [side * (16 + ripple), -0.12, -12 + ripple * 10],
        [1.4 + ripple * 0.65, 1.4 + ripple * 0.65, 1], [-Math.PI / 2, 0, 0]);
    }
  };
  const scatterRocks = (count, mat = materials.stone) => {
    for (let i = 0; i < count; i += 1) {
      const side = i % 2 ? 1 : -1;
      boulder(side * (17 + random() * 10), -22 + random() * 26, 0.8 + random() * 2.5, mat);
    }
  };
  const beam = (name, start, end, mat = materials.light, radius = 0.055) => {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    const mesh = add(name, cylinder, mat, from.clone().add(to).multiplyScalar(0.5).toArray(),
      [radius, direction.length(), radius]);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return mesh;
  };
  const basin = (x, z, radius, height = 0.7, mat = materials.stone, y = 0) => {
    add('basin-plinth', cylinder, mat, [x, y + height * 0.4, z], [radius * 1.12, height * 0.8, radius * 1.12]);
    add('basin-carved-rim', basinRim, mat, [x, y + height, z], [radius, radius, radius], [Math.PI / 2, 0, 0]);
    add('basin-water', cylinder, materials.water, [x, y + height * 0.9, z], [radius * 0.92, 0.025, radius * 0.92]);
  };
  const cloudBank = (name, x, y, z, width, mat = materials.paper) => {
    for (let puff = 0; puff < 4; puff += 1) add(name, crown, mat,
      [x + (puff - 1.5) * width * 0.32, y + Math.sin(puff * 1.6) * width * 0.08, z],
      [width * 0.4, width * 0.17, width * 0.28]);
  };
  const bareTree = (name, x, z, height, mat = materials.wood) => {
    beam(name, [x, 0, z], [x + 0.3, height, z], mat, 0.14);
    for (const side of [-1, 1]) {
      beam(name, [x, height * 0.58, z], [x + side * 1.4, height * 0.87, z], mat, 0.07);
      beam(name, [x + side * 1.2, height * 0.82, z], [x + side * 1.8, height, z], mat, 0.045);
    }
  };

  // Deform existing application-supplied primitives rather than importing a
  // second Three namespace. Continuous tubes/decks add curved silhouettes with
  // one static draw each; all buffers enter the usual shared-resource disposal.
  let customShapeIndex = 0;
  const curvedTube = (name, mat, path, radii, segments = 80, corrugation = 0) => {
    const shape = geometry(`${name}-${customShapeIndex++}`, () => new THREE.CylinderGeometry(1, 1, 1, 8, segments, true));
    const positions = shape.attributes.position;
    const reference = new THREE.Vector3(0, 0, 1);
    const samples = [];
    for (let row = 0; row <= segments; row += 1) {
      const t = row / segments;
      const point = new THREE.Vector3(...path(t));
      const tangent = new THREE.Vector3(...path(Math.min(1, t + 0.0001)))
        .sub(new THREE.Vector3(...path(Math.max(0, t - 0.0001)))).normalize();
      reference.set(Math.abs(tangent.z) < 0.9 ? 0 : 1, 0, Math.abs(tangent.z) < 0.9 ? 1 : 0);
      const across = reference.clone().cross(tangent).normalize();
      const depth = tangent.clone().cross(across).normalize();
      const radius = radii(t);
      samples.push(Object.freeze(point.toArray()));
      for (let column = 0; column <= 8; column += 1) {
        const angle = column * Math.PI / 4;
        const ripple = 1 + corrugation * (Math.sin(t * 71 + angle * 3) + 0.35 * Math.cos(t * 119 - angle * 2));
        const vertex = point.clone().addScaledVector(across, Math.sin(angle) * radius[0] * ripple)
          .addScaledVector(depth, Math.cos(angle) * radius[1] * ripple);
        positions.setXYZ(row * 9 + column, vertex.x, vertex.y, vertex.z);
      }
    }
    positions.needsUpdate = true;
    shape.computeVertexNormals();
    shape.userData.continuousCurve = Object.freeze(samples);
    const mesh = add(name, shape, mat, [0, 0, 0]);
    mesh.castShadow = false;
    return mesh;
  };
  const curvedDeck = (name, mat, path, width, thickness, segments = 64) => {
    const shape = geometry(`${name}-${customShapeIndex++}`, () => new THREE.BoxGeometry(1, 1, 1, segments, 1, 1));
    const positions = shape.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const t = positions.getX(i) + 0.5;
      const point = new THREE.Vector3(...path(t));
      const tangent = new THREE.Vector3(...path(Math.min(1, t + 0.0001)))
        .sub(new THREE.Vector3(...path(Math.max(0, t - 0.0001))));
      const across = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      point.addScaledVector(across, positions.getZ(i) * width);
      point.y += positions.getY(i) * thickness;
      positions.setXYZ(i, point.x, point.y, point.z);
    }
    positions.needsUpdate = true;
    shape.computeVertexNormals();
    shape.userData.continuousCurve = Object.freeze(Array.from({ length: segments + 1 }, (_, i) => Object.freeze(path(i / segments))));
    const mesh = add(name, shape, mat, [0, 0, 0]);
    mesh.castShadow = false;
    return mesh;
  };
  const radialSurface = (name, mat, vertex, radialSegments = 48, rings = 18, shade = null) => {
    const shape = geometry(`${name}-${customShapeIndex++}`, () => new THREE.CylinderGeometry(1, 1, 1, radialSegments, rings, true));
    const positions = shape.attributes.position;
    const colors = shade ? positions.clone() : null;
    for (let row = 0; row <= rings; row += 1) for (let column = 0; column <= radialSegments; column += 1) {
      const t = row / rings;
      const angle = column * Math.PI * 2 / radialSegments;
      const point = vertex(t, angle);
      const index = row * (radialSegments + 1) + column;
      positions.setXYZ(index, ...point);
      if (colors) colors.setXYZ(index, ...shade(t, angle));
    }
    positions.needsUpdate = true;
    if (colors) shape.setAttribute('color', colors);
    shape.computeVertexNormals();
    shape.userData.radialSurface = Object.freeze({ radialSegments, rings });
    add(name, shape, mat, [0, 0, 0]).castShadow = false;
    // Sample an actual rendered triangle, including its planar normal. Lava
    // uses these points rather than an ideal cone that diverges from the mesh.
    return (t, angle) => {
      const rowT = Math.max(0, Math.min(0.999999, t)) * rings;
      const columnT = ((angle / (Math.PI * 2) % 1) + 1) % 1 * radialSegments;
      const row = Math.floor(rowT);
      const column = Math.floor(columnT);
      const v = rowT - row;
      const u = columnT - column;
      const read = (r, c) => new THREE.Vector3().fromBufferAttribute(positions, r * (radialSegments + 1) + c);
      const a = read(row, column), b = read(row + 1, column);
      const c = read(row + 1, column + 1), d = read(row, column + 1);
      let point, normal;
      if (u + v <= 1) {
        point = a.clone().multiplyScalar(1 - u - v).addScaledVector(b, v).addScaledVector(d, u);
        normal = b.clone().sub(a).cross(d.clone().sub(a)).normalize();
      } else {
        point = b.clone().multiplyScalar(1 - u).addScaledVector(c, u + v - 1).addScaledVector(d, 1 - v);
        normal = c.clone().sub(b).cross(d.clone().sub(b)).normalize();
      }
      if (normal.y < 0) normal.negate();
      return { point, normal };
    };
  };

  if (!profile.inspectedArt) switch (profile.family) {
    case 'clearing':
    case 'forest':
    case 'swamp': {
      const ancient = profile.landmark === 'primeval-grove' || profile.family === 'forest';
      if (profile.family === 'swamp') for (const side of [-1, 1]) waterShelf(side);
      for (let i = 0; i < 14; i += 1) {
        const side = i % 2 ? 1 : -1;
        tree(side * (18 + random() * 8), -24 + random() * 33, 5 + random() * (ancient ? 8 : 5), ancient);
      }
      scatterRocks(5, materials.ground);
      if (profile.landmark === 'primeval-grove') {
        for (const side of [-1, 1]) for (let i = 0; i < 5; i += 1) {
          const z = -17 + i * 4.4;
          for (let leaf = 0; leaf < 3; leaf += 1) add('primeval-fern', cone, materials.leaves,
            [side * 13, 0.6, z], [0.24, 1.9, 0.35], [0.4, leaf * Math.PI * 2 / 3, 0.8]);
        }
      }
      if (profile.landmark === 'thorn-garden') {
        const rose = material('#aa2548');
        for (const side of [-1, 1]) for (let i = 0; i < 7; i += 1) {
          const z = -16 + i * 3.3;
          add('rose-stem', cylinder, materials.wood, [side * 12.5, 0.8, z], [0.07, 1.6, 0.07]);
          add('rose-bloom', crown, rose, [side * 12.5, 1.8, z], [0.38, 0.3, 0.38]);
        }
      }
      if (profile.family === 'swamp') {
        for (const side of [-1, 1]) for (let i = 0; i < 12; i += 1) {
          add('reeds', cone, materials.leaves, [side * (13 + random() * 4), 1.1, -18 + random() * 28], [0.18, 2.2, 0.18]);
        }
      }
      break;
    }
    case 'umi': {
      for (const side of [-1, 1]) waterShelf(side);
      scatterRocks(7, materials.ground);
      if (profile.landmark === 'submerged-ruins') columns(0, -27, 6, 5, materials.stone);
      else for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i += 1) add('coral-spire', cone, materials.stone,
          [side * (14 + random() * 4), 0.6, -19 + i * 6], [0.5, 1.4 + random(), 0.5]);
      }
      break;
    }
    case 'sogen': {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 8; i += 1) {
          boulder(side * (20 + random() * 8), -25 + random() * 30, 2 + random() * 3, materials.ground, -1.4);
          add('grass-clump', cone, materials.leaves, [side * (12 + random() * 3), 0.45, -15 + i * 3], [0.4, 0.9, 0.4]);
        }
      }
      break;
    }
    case 'mountain':
    case 'wasteland':
    case 'volcanic':
    case 'ice':
    case 'cave': {
      const ice = profile.family === 'ice';
      const mat = ice ? materials.ice : materials.stone;
      scatterRocks(10, mat);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i += 1) {
          const height = 5 + random() * 8;
          add(ice ? 'glacier-spire' : 'rock-spire', cone, mat,
            [side * (20 + random() * 10), height * 0.45 - 0.5, -29 + i * 7],
            [3 + random() * 3, height, 3 + random() * 2], [0, random() * 6, 0]);
        }
      }
      if (profile.family === 'cave') {
        for (const side of [-1, 1]) for (let i = 0; i < 4; i += 1) {
          add('mineral-crystal', cone, materials.light, [side * (12.5 + random() * 3), 0.6, -18 + i * 7],
            [0.35, 1.6 + random(), 0.35], [0, random(), side * 0.25]);
        }
      }
      if (profile.family === 'volcanic') {
        for (const side of [-1, 1]) waterShelf(side, materials.lava);
        add('volcanic-caldera', geometry('caldera', () => new THREE.CylinderGeometry(4.4, 6.7, 4.5, 16, 1, true)),
          materials.dark, [0, 2, -29]);
        add('crater-lava', cylinder, materials.lava, [0, 3.6, -29], [3.8, 0.12, 3.8]);
        if (profile.landmark === 'island-caldera') {
          for (const side of [-1, 1]) block('island-shoreline', materials.water,
            side * 25, -0.3, -12, 4, 0.12, 30);
        }
      }
      if (profile.landmark === 'ravine') {
        for (const side of [-1, 1]) boulder(side * 8, -31, 5, materials.stone);
        block('ravine-bridge-deck', materials.wood, 0, 4.4, -27, 19, 0.3, 1.9);
        for (const side of [-1, 1]) block('ravine-bridge-rope', materials.wood,
          0, 5.6, -27 + side * 0.88, 19, 0.09, 0.09);
      }
      if (profile.landmark === 'mine-entrance') {
        for (const side of [-1, 1]) block('mine-timber', materials.wood, side * 2.9, 3, -26, 0.75, 6, 1.2);
        block('mine-lintel', materials.wood, 0, 6.1, -26, 7.2, 0.8, 1.3);
        block('mine-darkness', materials.dark, 0, 2.9, -26.5, 5, 5.8, 0.2);
        for (const side of [-1, 1]) block('mine-rail', materials.metal, side * 0.9, 0.06, -22, 0.1, 0.1, 7);
      }
      break;
    }
    case 'yami':
    case 'graveyard': {
      for (let i = 0; i < 12; i += 1) {
        const side = i % 2 ? 1 : -1;
        const x = side * (13 + random() * 10);
        const z = -23 + random() * 29;
        const height = profile.family === 'yami' ? 3 + random() * 5 : 1.3 + random() * 1.3;
        const marker = block(profile.family === 'yami' ? 'occult-monolith' : 'grave-marker', materials.stone, x, height / 2, z, 0.85, height, 0.7);
        marker.rotation.z = (random() - 0.5) * 0.18;
        if (profile.family === 'yami') block('monolith-energy-slit', materials.light, x, height * 0.62, z + 0.36, 0.08, height * 0.45, 0.02);
      }
      if (profile.landmark === 'funerary-valley') {
        const pyramid = geometry('pyramid', () => new THREE.ConeGeometry(1, 1, 4));
        for (const side of [-1, 1]) add('funerary-pyramid', pyramid, materials.stone,
          [side * 12, 4, -32], [9, 8, 9], [0, Math.PI / 4, 0]);
        columns(0, -28, 4, 5);
      } else {
        columns(0, -27, 3, 5, materials.dark);
        if (profile.landmark === 'shadow-prison') for (let i = 0; i < 10; i += 1) {
          block('shadow-prison-bar', materials.metal, -5 + i * 1.1, 3, -26.8, 0.12, 6, 0.18);
        }
        if (profile.landmark === 'ruined-crypt') {
          block('crypt-roof', materials.stone, 0, 6.4, -28, 9, 0.8, 6);
          block('crypt-back-wall', materials.dark, 0, 3, -31, 9, 6, 0.5);
          block('broken-crypt-wall', materials.stone, -4, 1.5, -28, 0.8, 3, 5);
          boulder(5.5, -26, 2);
        }
      }
      break;
    }
    case 'city-modern':
    case 'city-fantasy': {
      const fantasy = profile.family === 'city-fantasy';
      for (let i = 0; i < 12; i += 1) {
        const side = i % 2 ? 1 : -1;
        tower(side * (16 + random() * 13), -31 + random() * 22,
          5 + random() * (fantasy ? 11 : 15), 2 + random() * 3,
          fantasy ? materials.stone : materials.dark, fantasy);
      }
      if (profile.landmark === 'clock-tower') {
        tower(0, -29, 15, 4.5);
        const face = add('clock-face', cylinder, materials.paper, [0, 12, -26.7], [1.55, 0.08, 1.55], [Math.PI / 2, 0, 0]);
        face.userData.landmarkDetail = 'public-clock';
        block('clock-hand-hour', materials.dark, 0.36, 12.38, -26.59, 0.12, 1.05, 0.06).rotation.z = -0.65;
        block('clock-hand-minute', materials.dark, -0.55, 12.02, -26.57, 1.2, 0.1, 0.06);
      } else if (profile.landmark === 'arcane-citadel') {
        tower(0, -30, 19, 4, materials.stone, true);
        portal(0, 17, -29.8, 3);
      } else if (['skyscrapers', 'hero-city'].includes(profile.landmark)) {
        for (const side of [-1, 1]) tower(side * 7, -33, 22, 4, materials.metal);
        if (profile.landmark === 'hero-city') block('elevated-city-skywalk', materials.metal,
          0, 9, -33, 11, 0.7, 1.8);
      }
      break;
    }
    case 'castle-palace':
    case 'toon-world': {
      const toon = profile.family === 'toon-world';
      const mat = profile.landmark === 'golden-castle' ? materials.gold : (toon ? materials.paper : materials.stone);
      for (const side of [-1, 1]) {
        tower(side * 9, -28, toon ? 8 : 10, 4, mat, true);
        tower(side * 16, -25, 7, 3, mat, true);
      }
      block('castle-curtain-wall', mat, 0, 3, -29, 17, 6, 2);
      block('castle-gate-shadow', materials.dark, 0, 2.5, -27.95, 3, 5, 0.05);
      for (let x = -7.5; x < 8; x += 1.5) block('castle-crenellation', mat, x, 6.35, -29, 0.8, 0.8, 2.1);
      if (toon) for (const side of [-1, 1]) {
        block('storybook-open-page', materials.paper, side * 16, 0.1, 0, 7, 0.12, 10).rotation.z = side * 0.18;
        tree(side * 17, -4, 5);
      }
      if (profile.landmark === 'storybook-castle') {
        for (const side of [-1, 1]) {
          add('paper-castle-flag', cone, materials.light, [side * 9, 12.7, -28], [0.7, 1.3, 0.1], [0, 0, -Math.PI / 2]);
          add('paper-cloud', crown, materials.paper, [side * 14, 12, -31], [3, 0.9, 0.12]);
        }
        block('storybook-spine', materials.gold, 0, 0.1, -32, 1, 0.35, 10);
      }
      break;
    }
    case 'temple-sanctuary':
    case 'celestial-light': {
      const celestial = profile.family === 'celestial-light';
      const mat = profile.landmark === 'white-mausoleum' || celestial ? materials.paper : materials.stone;
      for (let step = 0; step < 3; step += 1) block('sanctuary-step', mat, 0, step * 0.3, -27, 15 - step, 0.3, 9 - step);
      columns(0, -28, 6, 7, mat);
      if (['imperial-mausoleum', 'white-mausoleum'].includes(profile.landmark)) {
        block('mausoleum-inner-chamber', mat, 0, 4, -31, 10, 8, 4);
        block('mausoleum-doorway', materials.dark, 0, 2.8, -28.95, 2.8, 5.6, 0.05);
        block('mausoleum-pediment', mat, 0, 8.4, -28, 14, 0.8, 3);
      }
      if (celestial) {
        for (const side of [-1, 1]) {
          boulder(side * 18, -20, 4, mat, 5);
          columns(side * 18, -20, 2, 4, mat, 10);
        }
        portal(0, 11, -29, 3.5, materials.gold);
      }
      break;
    }
    case 'arena-stadium': {
      for (const side of [-1, 1]) {
        for (let tier = 0; tier < 5; tier += 1) block('spectator-tier', materials.stone,
          side * (14 + tier * 1.2), tier * 0.85, -6, 1.1, 0.8, 29);
        for (const z of [-19, 6]) {
          block('stadium-floodlight-post', materials.metal, side * 18, 5.5, z, 0.4, 11, 0.4);
          block('stadium-floodlight', materials.light, side * 18, 11, z, 2.8, 0.8, 0.35);
        }
      }
      break;
    }
    case 'theater-amusement': {
      block('theater-stage', materials.wood, 0, 0.5, -28, 18, 1, 8);
      for (const side of [-1, 1]) {
        block('proscenium-column', materials.gold, side * 8, 5, -27, 1, 10, 1.3);
        block('theater-curtain', materials.ground, side * 6, 5.5, -28, 3, 9, 0.5);
        portal(side * 17, 4, -15, 3, materials.gold);
      }
      block('proscenium-arch', materials.gold, 0, 10, -27, 17, 1.1, 1.4);
      for (let i = 0; i < 8; i += 1) add('marquee-light', crown, materials.light,
        [-7 + i * 2, 10.1, -26.2], [0.15, 0.15, 0.15]);
      break;
    }
    case 'industrial-lab':
    case 'mechanical-fortress': {
      const industrial = profile.family === 'industrial-lab';
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i += 1) {
          const z = -22 + i * 7;
          block('armored-base', materials.metal, side * 17, 0.9, z, 4, 1.8, 4);
          add(industrial ? 'pressure-reservoir' : 'armored-pylon', cylinder, materials.metal,
            [side * 17, 4, z], [1.3, 6, 1.3]);
          block('industrial-energy-band', materials.light, side * 17, 5.5, z + 1.31, 1.6, 0.25, 0.05);
          if (i < 3) add('connecting-pipe', cylinder, materials.metal, [side * 17, 2, z + 3.5], [0.25, 7, 0.25], [Math.PI / 2, 0, 0]);
        }
      }
      block('gantry-crossbeam', materials.metal, 0, 9, -28, 22, 1, 1);
      for (const side of [-1, 1]) block('gantry-upright', materials.metal, side * 10.5, 4.5, -28, 1, 9, 1);
      if (profile.landmark === 'gearworks') for (const side of [-1, 1]) {
        add('factory-gear-ring', ring, materials.metal, [side * 13, 6, -22], [2.8, 2.8, 2.8]);
        for (let tooth = 0; tooth < 12; tooth += 1) {
          const angle = tooth * Math.PI / 6;
          block('gear-tooth', materials.gold, side * 13 + Math.cos(angle) * 2.8,
            6 + Math.sin(angle) * 2.8, -22, 0.55, 0.7, 0.5).rotation.z = angle - Math.PI / 2;
        }
      }
      break;
    }
    case 'digital-cyber': {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i += 1) {
          const x = side * (14 + i * 1.8);
          const z = -23 + i * 5;
          const height = 3 + random() * 7;
          block('data-node', materials.dark, x, height / 2, z, 1.5, height, 1.5);
          block('data-node-stripe', materials.light, x, height / 2, z + 0.76, 0.14, height * 0.85, 0.02);
          block('network-route', materials.light, side * 17, 0.05, z, 8, 0.05, 0.08);
        }
        block('network-trunk', materials.light, side * 17, 0.06, -11, 0.08, 0.06, 28);
      }
      portal(0, 6.5, -27, 5);
      break;
    }
    case 'cosmic-dimensional':
    case 'generic': {
      const simplePortal = !profile.hasDedicatedLandmark || profile.landmark === 'fusion-gate';
      if (simplePortal) portal(0, 7, -29, profile.landmark === 'fusion-gate' ? 6.5 : 5);
      scatterRocks(9, materials.dark);
      for (const side of [-1, 1]) {
        if (simplePortal) portal(side * 19, 4, -12, 2.5);
        for (let i = 0; i < 4; i += 1) add('floating-fragment', rock, materials.stone,
          [side * (15 + random() * 10), 5 + random() * 7, -25 + random() * 24],
          [0.5 + random(), 0.5 + random(), 0.5 + random()], [random(), random(), random()]);
      }
      if (profile.landmark === 'fusion-gate') {
        for (const side of [-1, 1]) {
          const route = block('fusion-convergence-route', materials.light,
            side * 7, 0.1, -24.5, 0.15, 0.15, 9);
          route.rotation.y = side * 0.62;
          add('fusion-source-orbit', ring, materials.light, [side * 12, 3, -27], [2, 2, 2]);
        }
      }
      break;
    }
  }

  // Named landmarks translate the audited title/effect/illustration contract
  // into real volumes. They use the same peripheral footprint as the families.
  switch (profile.landmark) {
    case 'gaia-ancient-oak': {
      add('gaia-colossal-oak-trunk', cylinder, materials.wood, [0, 7, -33], [2.7, 14, 2.7]);
      const bark = material('#4c311f');
      for (let ridge = 0; ridge < 12; ridge += 1) {
        const angle = ridge * Math.PI / 6;
        const x = Math.cos(angle) * 2.73;
        const z = -33 + Math.sin(angle) * 2.73;
        beam('gaia-deep-bark-furrow', [x, 0.8, z], [x * 0.97, 11.5 + ridge % 3, z], bark, 0.065);
      }
      for (let i = 0; i < 7; i += 1) {
        const angle = i * Math.PI * 2 / 7;
        const x = Math.cos(angle) * 7;
        const z = -33 + Math.sin(angle) * 5;
        beam('gaia-exposed-buttress-root', [0, 3, -33], [x, 0.25, z], materials.wood, 0.5);
        beam('gaia-spreading-oak-limb', [0, 8 + i * 0.7, -33], [x, 15 + i % 3, z], materials.wood, 0.52);
        add('gaia-deep-green-crown', crown, materials.leaves, [x * 0.65, 16 + i % 3, z], [5, 3.7, 4]);
      }
      for (const side of [-1, 1]) {
        tree(side * 20, -20, 9);
        tree(side * 18, -7, 7);
      }
      break;
    }
    case 'umiiruka-breaking-waves':
    case 'umi-cobalt-swell': {
      for (const side of [-1, 1]) {
        waterShelf(side);
        for (let row = 0; row < 4; row += 1) {
          const z = -20 + row * 7.5;
          add('ocean-swell-face', cylinder, materials.water, [side * 17, 0.45 + row * 0.12, z],
            [1.1, 9.3, 1.1], [0, 0, Math.PI / 2]);
          beam('ocean-long-white-crest', [side * 12.8, 1.4 + row * 0.12, z],
            [side * 21.5, 1.4 + row * 0.12, z + (profile.landmark === 'umi-cobalt-swell' ? 2 : 0.2)], materials.paper, 0.14);
          for (let spray = 0; spray < 3; spray += 1) add('breaking-wave-foam', crown, materials.paper,
            [side * (14 + spray * 2.5), 1.4 + row * 0.12, z], [0.65, 0.22, 0.38]);
        }
      }
      if (profile.landmark === 'umiiruka-breaking-waves') {
        block('umiiruka-thin-distant-shore', materials.wood, 0, 0.12, -34, 36, 0.25, 1.2);
        for (let i = 0; i < 5; i += 1) beam('umiiruka-water-splash',
          [-17 + i * 0.3, 1.5, -14], [-17 + i * 0.55, 3.5 + i % 2, -14], materials.paper, 0.04);
      }
      break;
    }
    case 'luminous-diagonal-rays': {
      const black = material('#09090c');
      const white = material('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 });
      for (const side of [-1, 1]) for (let ray = 0; ray < 9; ray += 1) {
        const x = side * (12.7 + ray * 1.1);
        const z = -20 + ray * 2.7;
        beam('luminous-black-diagonal-ray', [x, 1.5, z], [x + side * 4, 18 + ray * 0.4, z - 5], black, 0.12);
        beam('luminous-white-ray', [x + side * 0.25, 1.5, z], [x + side * 4.25, 18 + ray * 0.4, z - 5], white, 0.1);
        if (ray % 2 === 0) beam('luminous-red-edge-streak', [x - side * 0.18, 1.5, z],
          [x + side * 3.82, 18 + ray * 0.4, z - 5], materials.light, 0.035);
      }
      break;
    }
    case 'plasma-storm-spiral': {
      const rim = material('#9a80d4', { roughness: 0.98 });
      const strand = t => {
        const angle = -0.3 + t * Math.PI * 4.8;
        const radius = 1.1 + t * 12.3;
        return [Math.cos(angle) * radius, 14.5 + Math.sin(angle) * radius * 0.65, -34 + Math.sin(angle * 0.6) * 1.2];
      };
      curvedTube('plasma-continuous-purple-vortex', materials.leaves, strand,
        t => [0.5 + t * 1.05, 0.5 + t * 0.55], 144, 0.16);
      curvedTube('plasma-lavender-vortex-lip', rim, t => {
        const point = strand(t);
        point[1] += 0.3 + t * 0.45;
        point[2] += 0.45;
        return point;
      }, t => [0.12 + t * 0.28, 0.18 + t * 0.1], 144, 0.13);
      const cloudGroove = material('#291e49');
      for (let i = 0; i < 24; i += 1) {
        const t = 0.05 + i / 24 * 0.93;
        const point = new THREE.Vector3(...strand(t));
        const tangent = new THREE.Vector3(...strand(t + 0.002)).sub(new THREE.Vector3(...strand(t - 0.002))).normalize();
        const across = new THREE.Vector3(-tangent.y, tangent.x, 0);
        const lobe = add('plasma-attached-cloud-lobe', crown, i % 3 ? materials.leaves : rim,
          [point.x, point.y, point.z + 0.15], [0.55 + t * 0.75, 0.7 + t * 0.5, 0.45 + t * 0.3]);
        lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        const edge = point.clone().addScaledVector(across, 0.25 + t * 0.6);
        edge.z += 0.9;
        const end = edge.clone().addScaledVector(tangent, 0.35 + t * 0.65).addScaledVector(across, 0.12);
        beam('plasma-cloud-curl-groove', edge.toArray(), end.toArray(), cloudGroove, 0.035);
      }
      // The cloud edges curl inward in the source. These connected finer
      // strands preserve that motion instead of another ring of round puffs.
      for (const offset of [-1, 1]) curvedTube('plasma-curled-cloud-fibril', rim, t => {
        const angle = 1.5 + offset * 0.45 + t * Math.PI * 3.8;
        const radius = 2 + t * 9.5;
        return [Math.cos(angle) * radius, 14.5 + Math.sin(angle) * radius * 0.65, -35.2 + offset * 0.4];
      }, t => [0.07 + t * 0.12, 0.08 + t * 0.09], 100);
      add('plasma-bright-vortex-core', crown, materials.light, [0.8, 14.1, -32.6], [0.65, 0.5, 0.35]);
      for (const side of [-1, 1]) {
        const points = [[side * 1.4, 14.4, -32.4], [side * 5, 16.8, -31.6], [side * 8, 12.8, -30.8], [side * 13, 8, -28], [side * 12.5, 3, -25]];
        for (let i = 1; i < points.length; i += 1) beam('plasma-cyan-forked-lightning', points[i - 1], points[i], materials.light, 0.07);
        beam('plasma-lightning-side-fork', points[2], [side * 12, 15.5, -30], materials.light, 0.045);
        beam('plasma-lightning-side-fork', [side * 12, 15.5, -30], [side * 17, 14.8, -29], materials.light, 0.03);
      }
      for (let i = 0; i < 5; i += 1) boulder(16 + i * 2.5, -24 + i * 2, 0.8 + i * 0.1, materials.ground);
      add('plasma-low-sloping-rock-shelf', box, materials.ground, [18, 0.2, -4], [10, 0.5, 25], [0, 0, 0.09]);
      break;
    }
    case 'rising-sky-currents': {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i += 1) {
          cloudBank('rising-diagonal-cloud-wisp', side * 18, 7 + i * 2.7, -20 + i * 5, 5);
          beam('rising-white-aerial-current', [side * 13, 5 + i * 2.8, -20 + i * 4],
            [side * 23, 12 + i * 2.8, -21 + i * 4], materials.paper, 0.035);
        }
      }
      cloudBank('rising-back-sky-wisp', 0, 21, -33, 9);
      break;
    }
    case 'molten-erupting-volcano': {
      const basalt = material('#372721', { vertexColors: true });
      const terrainVertex = (t, angle) => {
        const folds = 1 + 0.075 * Math.sin(angle * 5 + 0.4) + 0.045 * Math.sin(angle * 9 - t * 1.7);
        const radius = (1.5 + 9.3 * Math.pow(t, 1.12)) * folds;
        return [Math.sin(angle) * radius + 0.55 * (1 - t),
          10.6 * (1 - Math.pow(t, 0.85)) + (1 - t) * (0.32 * Math.sin(angle * 5) + 0.18 * Math.cos(angle * 9)),
          -34 + Math.cos(angle) * radius * 0.82];
      };
      const surface = radialSurface('molten-wide-black-volcano', basalt, terrainVertex, 64, 24,
        (t, angle) => {
          const value = 0.45 + 0.22 * Math.sin(angle * 9 + t * 1.7) + 0.07 * Math.sin(t * 37);
          return [value, value * 0.83, value * 0.72];
        });
      radialSurface('molten-summit-crater', materials.stone, (t, angle) => {
        const rim = terrainVertex(0, angle);
        return [0.55 + (rim[0] - 0.55) * (1 - t * 0.5), rim[1] - t * 1.35,
          -34 + (rim[2] + 34) * (1 - t * 0.5)];
      }, 64, 3);
      add('molten-incandescent-crater-pool', cylinder, materials.lava, [0.55, 9.4, -34], [0.82, 0.08, 0.64]);
      const eruption = material('#ffeb38', { emissive: '#ffaf05', emissiveIntensity: 1.4 });
      const surfacePoint = (t, angle, radius) => {
        const { point, normal } = surface(t, angle);
        // Vertical lift accounts for the real triangle's inclination and
        // leaves clearance between samples as each stream winds across folds.
        point.y += (radius + 0.19) / Math.max(0.18, normal.y);
        return point.toArray();
      };
      for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI / 4;
        const radius = 0.18 + (i % 3) * 0.055;
        const routeAngle = t => angle + 0.085 * Math.sin(t * 7 + i * 0.4) + 0.045 * Math.sin(t * 14 + i);
        const points = Array.from({ length: 13 }, (_, j) => {
          const t = 0.025 + j / 12 * 0.91;
          return surfacePoint(t, routeAngle(t), radius);
        });
        for (let j = 1; j < points.length; j += 1) {
          beam('molten-branching-lava-stream', points[j - 1], points[j], materials.lava, radius);
          if (i % 3 === 0 && j < 6) beam('molten-yellow-flow-core',
            points[j - 1].map((v, axis) => axis === 1 ? v + 0.11 : v),
            points[j].map((v, axis) => axis === 1 ? v + 0.11 : v), eruption, 0.07);
        }
        const turn = i % 2 ? -1 : 1;
        const branchStartT = 0.025 + 4 / 12 * 0.91;
        const branchPoints = [points[4], ...Array.from({ length: 6 }, (_, j) => {
          const t = branchStartT + (j + 1) / 6 * (0.91 - branchStartT);
          const branchAngle = routeAngle(branchStartT) + turn * (t - branchStartT) * 0.8 + 0.035 * Math.sin(j * 1.8);
          return surfacePoint(t, branchAngle, 0.095);
        })];
        for (let j = 1; j < branchPoints.length; j += 1) beam('molten-lava-side-branch', branchPoints[j - 1], branchPoints[j], materials.lava, 0.095);
        const x = Math.sin(angle), z = Math.cos(angle);
        add('molten-yellow-eruption-jet', cone, eruption, [0.55 + x * 0.6, 13 + i % 3, -34 + z * 0.5], [0.24, 4 + i % 3, 0.24], [0, 0, x * 0.2]);
        add('molten-airborne-ejected-rock', rock, materials.stone, [x * 7, 14 + i % 4, -34 + z * 5], [0.45, 0.65, 0.45], [i * 0.3, i, 0]);
      }
      for (const side of [-1, 1]) boulder(side * 15, -15, 2.6, materials.stone);
      break;
    }
    case 'chorus-cloud-garden': {
      const rose = material('#d96675');
      const pink = material('#c7a5ca');
      for (const side of [-1, 1]) {
        cloudBank('chorus-white-cloud-sea', side * 18, 0.4, -10, 9);
        for (let i = 0; i < 8; i += 1) {
          add('chorus-corner-rose', crown, rose, [side * (12.5 + i * 0.7), 0.6 + i % 3 * 0.25, 3 + i * 0.5], [0.62, 0.5, 0.6]);
        }
      }
      for (const side of [-1, 1]) block('chorus-pink-heaven-gate-post', pink, side * 2.7, 2.2, -29, 0.22, 4.4, 0.22);
      block('chorus-pink-heaven-gate-lintel', pink, 0, 4.3, -29, 5.8, 0.25, 0.25);
      for (let i = -9; i <= 9; i += 1) block('chorus-thin-pink-horizon-fence', pink, i, 1.8, -29, 0.055, 3.6, 0.055);
      for (let i = 0; i < 6; i += 1) {
        const x = i % 2 ? 15 : -15;
        const y = 5 + i * 1.4;
        add('chorus-floating-musical-note', crown, materials.dark, [x, y, -20 + i * 3], [0.3, 0.14, 0.22]);
        beam('chorus-musical-note-stem', [x + 0.23, y, -20 + i * 3], [x + 0.23, y + 1.3, -20 + i * 3], materials.dark, 0.035);
      }
      break;
    }
    case 'yami-magenta-void': {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i += 1) {
          cloudBank('yami-concave-magenta-mist', side * (15 + i * 2), 0.8 + i * 0.3, -23 + i * 8, 3.5, materials.leaves);
          add('yami-descending-magenta-ray', cone, materials.light, [side * (13 + i * 3), 14 + i, -29 + i * 3], [0.55, 6, 0.2], [0, 0, side * 0.45]);
        }
      }
      break;
    }
    case 'forest-forked-clearing': {
      for (let i = 0; i < 3; i += 1) {
        const x = 15 + i * 4;
        const z = -17 + i * 5;
        tree(x, z, 9 + i, false);
        for (const side of [-1, 1]) beam('forest-forked-trunk-limb', [x, 4.5, z],
          [x + side * 2.1, 8.5 + i, z - 0.4], materials.wood, 0.22);
      }
      for (let i = 0; i < 10; i += 1) {
        add('forest-distant-conifer-wall', cone, materials.leaves, [(i - 4.5) * 3, 4, -33], [2, 8, 2]);
        add('forest-yellow-green-clearing-grass', cone, materials.ground, [i % 2 ? 12.5 : -12.5, 0.45, -19 + i * 2.8], [0.3, 0.9, 0.3]);
      }
      tree(-19, -14, 8);
      break;
    }
    case 'mountain-twin-ridges': {
      const granite = material('#8a8078', { vertexColors: true, roughness: 0.97 });
      const crevice = material('#473b38');
      for (const [name, x, z, height, width, depth, lean] of [
        ['mountain-tall-right-peak', 12, -33, 17, 10, 7.8, 2.4],
        ['mountain-lower-left-ridge', -13, -29, 9, 11, 7, -1.8]
      ]) {
        const surface = radialSurface(name, granite, (t, angle) => {
          const fold = 1 + 0.11 * Math.sin(angle * 7 + 0.7) + 0.04 * Math.cos(angle * 13 - t * 2.4);
          const r = t * fold;
          const rise = Math.pow(1 - t, 1.06) * (1 + 0.17 * Math.sin(angle * 3 + 0.9) * t);
          return [x + Math.sin(angle) * width * r + lean * (1 - t) ** 2,
            height * rise + height * 0.055 * Math.sin(angle * 7 + t * 2.4) * t * (1 - t),
            z + Math.cos(angle) * depth * r + (1 - t) ** 2 * 0.8];
        }, 64, 22, (t, angle) => {
          const shade = 0.66 + 0.17 * Math.sin(angle * 7 + t * 2.4) + 0.07 * Math.sin(t * 29 + angle);
          return [shade, shade * (0.91 + t * 0.1), shade * (0.86 + t * 0.2)];
        });
        for (let groove = 0; groove < 8; groove += 1) {
          const angle = -1.3 + groove * 2.6 / 7;
          const points = Array.from({ length: 7 }, (_, j) => {
            const { point, normal } = surface(0.12 + j * 0.13, angle + Math.sin(j * 0.7 + groove) * 0.055);
            return point.addScaledVector(normal, 0.055).toArray();
          });
          for (let j = 1; j < points.length; j += 1) beam('mountain-jagged-slope-striation', points[j - 1], points[j], crevice, 0.035 + groove % 3 * 0.01);
        }
      }
      for (const side of [-1, 1]) {
        cloudBank('mountain-blue-valley-mist', side * 17, 1.2, -21, 6);
      }
      cloudBank('mountain-distant-mist-saddle', 0, 2, -34, 8);
      break;
    }
    case 'sogen-grass-terraces': {
      for (const side of [-1, 1]) {
        for (let row = 0; row < 5; row += 1) block('sogen-low-grass-bank', materials.ground,
          side * 17, row * 0.12, -22 + row * 7, 8, 0.35, 6.7);
        for (let i = 0; i < 12; i += 1) add('sogen-foreground-grass', cone, materials.leaves,
          [side * (12.5 + i % 3 * 0.5), 0.4, -18 + i * 2.5], [0.15, 0.8, 0.15]);
      }
      for (let i = 0; i < 9; i += 1) add('sogen-low-horizon-mountain', cone, materials.stone,
        [(i - 4) * 4.5, 1.5 + i % 3 * 0.4, -35], [3.3, 3 + i % 3 * 0.8, 2.4]);
      block('sogen-right-grass-fissure', materials.dark, 15, 0.12, -4, 0.7, 0.25, 12);
      break;
    }
    case 'wasteland-stratified-escarpment': {
      for (const side of [-1, 1]) {
        for (let layer = 0; layer < 4; layer += 1) block('wasteland-horizontal-earth-stratum', materials.ground,
          side * (16 + layer * 0.8), layer * 0.6, -4, 7 - layer * 0.5, 0.6, 32);
        bareTree('wasteland-bare-dead-tree', side * 18, -28, 6);
        for (let i = 0; i < 4; i += 1) boulder(side * (13 + i * 3), -20 + i * 7, 0.65 + i * 0.15, materials.stone);
      }
      for (let i = 0; i < 6; i += 1) add('wasteland-angular-foreground-escarpment', rock, materials.stone,
        [16 + i * 1.8, 0.7 + i * 0.35, 6], [1.3, 2 + i * 0.3, 1.2], [0, 0.3, 0]);
      break;
    }
    case 'orichalcos-six-point-seal': {
      for (const side of [-1, 1]) for (let orbit = 0; orbit < 2; orbit += 1) add('orichalcos-neon-green-ring', ring, materials.light,
        [side * 17, 0.25, -11], [4 + orbit * 0.7, 4 + orbit * 0.7, 1], [Math.PI / 2, 0, 0]);
      for (let orbit = 0; orbit < 2; orbit += 1) add('orichalcos-rear-seal-circle', ring, materials.light,
        [0, 7, -31], [6 + orbit * 0.7, 6 + orbit * 0.7, 1]);
      const points = Array.from({ length: 6 }, (_, i) => [Math.sin(i * Math.PI / 3) * 6, 7 + Math.cos(i * Math.PI / 3) * 6, -31]);
      for (let i = 0; i < 6; i += 1) beam('orichalcos-six-point-star', points[i], points[(i + 2) % 6], materials.light, 0.055);
      break;
    }
    case 'madolche-cake-palace': {
      const pink = material('#e991ad');
      const chocolate = material('#87552f');
      const cream = materials.paper;
      for (const side of [-1, 1]) {
        for (let tier = 0; tier < 5; tier += 1) {
          add('madolche-wafer-cake-tier', cylinder, tier % 2 ? chocolate : materials.stone, [side * 8, 1 + tier * 1.5, -30], [2.8, 1.2, 2.8]);
          add('madolche-cream-piping-ring', basinRim, cream, [side * 8, 1.6 + tier * 1.5, -30], [2.7, 2.7, 2.7], [Math.PI / 2, 0, 0]);
        }
        add('madolche-pink-strawberry-dome', crown, pink, [side * 8, 8.6, -30], [2.8, 1.2, 2.8]);
        for (let i = 0; i < 4; i += 1) add('madolche-roof-cream-swirl', cone, cream,
          [side * 8 + (i - 1.5) * 1.2, 9.3, -30], [0.45, 1.3, 0.45]);
      }
      block('madolche-central-cake-wall', materials.stone, 0, 3, -31, 12, 6, 3);
      add('madolche-round-pink-door', cylinder, pink, [0, 2.7, -29.45], [2.1, 0.05, 2.5], [Math.PI / 2, 0, 0]);
      block('madolche-cake-cream-cornice', cream, 0, 6.3, -31, 12.5, 0.5, 3.5);
      break;
    }
    case 'ancient-forest-canopy': {
      for (const side of [-1, 1]) for (let i = 0; i < 5; i += 1) {
        const x = side * (17 + i * 2.5);
        const z = -24 + i * 6;
        bareTree('ancient-forest-tall-enclosing-trunk', x, z, 15 + i % 3 * 2);
        add('ancient-forest-cyan-canopy', crown, materials.leaves, [x, 16 + i % 3 * 2, z], [4, 2.3, 3.5]);
      }
      for (let ray = 0; ray < 6; ray += 1) beam('ancient-forest-white-light-shaft',
        [-3 + ray, 21, -33], [-8 + ray * 1.5, 8, -29], materials.paper, 0.025);
      break;
    }
    case 'monarch-shadow-hall': {
      for (const side of [-1, 1]) {
        columns(side * 16, -24, 3, 17, materials.stone);
        block('monarch-massive-shadow-throne-back', materials.dark, side * 5, 8, -33, 6, 16, 1.3);
        block('monarch-massive-throne-seat', materials.stone, side * 5, 4, -31, 6, 1.3, 4);
        for (const arm of [-1, 1]) block('monarch-throne-arm', materials.dark, side * 5 + arm * 2.5, 5.2, -30.5, 1, 3.2, 3.7);
      }
      for (let ray = 0; ray < 4; ray += 1) beam('monarch-overhead-white-light',
        [ray - 1.5, 22, -34], [ray - 1.5, 10, -30], materials.paper, 0.1);
      break;
    }
    case 'labrynth-white-palace': {
      for (let tier = 0; tier < 3; tier += 1) add('labrynth-tiered-white-palace', cylinder, materials.paper,
        [0, 1.5 + tier * 3, -32], [7 - tier * 1.8, 3, 7 - tier * 1.8]);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i += 1) {
          const x = side * (7 + i * 4);
          const z = -30 + i * 2;
          add('labrynth-white-turret', cylinder, materials.paper, [x, 4 + i, z], [1.3, 8 + i * 2, 1.3]);
          add('labrynth-pointed-blue-roof', cone, materials.leaves, [x, 9.5 + i * 2, z], [1.8, 3, 1.8]);
          add('labrynth-turret-blue-trim', basinRim, materials.leaves, [x, 6.7 + i * 2, z], [1.4, 1.4, 1.4], [Math.PI / 2, 0, 0]);
        }
        const path = t => {
          const angle = -0.3 + t * Math.PI * 1.25;
          const radius = 11.5 - t * 6.5;
          return [side * (6 + Math.cos(angle) * radius), 0.6 + t * 6.1, -32 + Math.sin(angle) * radius * 0.8];
        };
        curvedDeck('labrynth-curved-elevated-palace-ramp', materials.paper, path, 2.1, 0.24);
        for (const edge of [-1, 1]) {
          let previous;
          for (let i = 0; i <= 16; i += 1) {
            const t = i / 16;
            const point = new THREE.Vector3(...path(t));
            const tangent = new THREE.Vector3(...path(Math.min(1, t + 0.0001)))
              .sub(new THREE.Vector3(...path(Math.max(0, t - 0.0001))));
            const across = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            point.addScaledVector(across, edge * 0.99);
            block('labrynth-curved-ramp-baluster', materials.paper, point.x, point.y + 0.4, point.z, 0.08, 0.8, 0.08);
            point.y += 0.8;
            if (previous) beam('labrynth-curved-ramp-guardrail', previous, point.toArray(), materials.paper, 0.065);
            previous = point.toArray();
          }
        }
      }
      add('labrynth-central-blue-spire', cone, materials.leaves, [0, 13.5, -32], [1.7, 7, 1.7]);
      const pink = material('#dd9aeb', { emissive: '#ce7fdd', emissiveIntensity: 0.45 });
      const glyph = [[0, 18.5, -34], [-3, 21, -34], [-2, 23, -34], [0, 21.8, -34], [2, 23, -34], [3, 21, -34], [0, 18.5, -34]];
      for (let i = 1; i < glyph.length; i += 1) beam('labrynth-pink-crown-glyph', glyph[i - 1], glyph[i], pink, 0.08);
      break;
    }
    case 'jurassic-caldera-grove': {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i += 1) {
          const z = -22 + i * 7;
          tree(side * 19, z, 7);
          block('jurassic-caldera-stone-wall', materials.stone, side * 23, 2.8, z, 3, 5.6, 7);
          for (let fern = 0; fern < 3; fern += 1) add('jurassic-foreground-fern', cone, materials.leaves,
            [side * 13, 0.7, z], [0.25, 2, 0.4], [0.4, fern * Math.PI * 2 / 3, 0.9]);
          beam('jurassic-hanging-vine', [side * 19, 7, z], [side * 17.5, 4, z], materials.leaves, 0.045);
        }
      }
      add('jurassic-distant-gray-volcano', cone, materials.stone, [0, 5, -35], [9, 10, 8]);
      cloudBank('jurassic-volcanic-white-smoke', 0, 12, -35, 3.7);
      basin(-15, -12, 2.4, 0.18, materials.ground);
      break;
    }
    case 'dark-sanctuary-eye-castle': {
      add('dark-sanctuary-jagged-rock-foundation', rock, materials.stone, [0, 2, -33], [7, 3.3, 6]);
      tower(0, -33, 11, 4, materials.dark, true);
      for (const side of [-1, 1]) {
        tower(side * 4, -31, 7, 1.8, materials.dark, true);
        add('dark-sanctuary-needle-spire', cone, materials.dark, [side * 4, 12, -31], [0.7, 10, 0.7]);
        for (let i = 0; i < 3; i += 1) {
          const x = side * (13 + i * 4);
          const y = 9 + i * 3;
          add('dark-sanctuary-oval-sky-eye', cylinder, materials.paper, [x, y, -30], [1.5, 0.04, 0.65], [Math.PI / 2, 0, 0]);
          add('dark-sanctuary-sky-eye-iris', cylinder, materials.leaves, [x, y, -29.94], [0.55, 0.03, 0.55], [Math.PI / 2, 0, 0]);
          add('dark-sanctuary-sky-eye-pupil', cylinder, materials.dark, [x, y, -29.89], [0.24, 0.03, 0.36], [Math.PI / 2, 0, 0]);
        }
      }
      break;
    }
    case 'cynet-hexagonal-cosmos': {
      for (const side of [-1, 1]) {
        for (let row = 0; row < 3; row += 1) for (let col = 0; col < 3; col += 1) {
          const x = side * (14 + col * 4.1);
          const y = 2 + row * 4;
          const z = -24 + col * 5;
          const vertices = Array.from({ length: 6 }, (_, i) => [x + Math.cos(i * Math.PI / 3) * 2.1, y + Math.sin(i * Math.PI / 3) * 2.1, z]);
          for (let i = 0; i < 6; i += 1) beam('cynet-cyan-hexagonal-lattice', vertices[i], vertices[(i + 1) % 6], materials.light, 0.035);
          if ((row + col) % 2 === 0) {
            add('cynet-calibrated-network-disc', ring, materials.light, [x, y, z - 0.15], [0.8, 0.8, 1]);
            add('cynet-bright-network-node', crown, materials.paper, [x, y, z], [0.2, 0.2, 0.2]);
          }
        }
        add('cynet-curved-global-orbit', ring, materials.light, [side * 17, 6, -18], [5, 8, 5], [0.4, side * 0.35, 0]);
      }
      break;
    }
    case 'golden-castle': {
      block('golden-castle-drawbridge', materials.wood, 0, 0.25, -24.5, 3.7, 0.5, 5);
      for (const side of [-1, 1]) {
        beam('golden-castle-drawbridge-chain', [side * 1.6, 0.5, -22.3], [side * 1.6, 5, -27.8], materials.gold, 0.065);
        block('golden-castle-enchanted-hedge', materials.leaves, side * 13, 1.2, -21, 2, 2.4, 7);
        add('golden-castle-crown-finial', cone, materials.gold, [side * 9, 14.5, -28], [0.6, 2.1, 0.6]);
      }
      for (let bar = 0; bar < 5; bar += 1) block('golden-castle-portcullis', materials.gold,
        -1.2 + bar * 0.6, 2.5, -27.9, 0.075, 5, 0.08);
      break;
    }
    case 'sky-sanctuary': {
      const cliff = material('#706569');
      add('sky-sanctuary-floating-rock-island', rock, cliff, [0, 0.7, -32], [11, 3.8, 9]);
      for (const side of [-1, 1]) add('sky-sanctuary-hanging-rock-tooth', cone, cliff,
        [side * 5, -3.5, -33], [2.6, 6, 2.7], [Math.PI, 0, side * 0.12]);
      block('sky-sanctuary-ruined-front-foundation', materials.stone, 0, 1.6, -28.5, 12, 2.4, 4);
      columns(0, -27.3, 6, 4.6, materials.paper, 2.7);
      const pediment = geometry('sky-sanctuary-triangular-pediment', () => new THREE.ConeGeometry(1, 1, 4));
      add('sky-sanctuary-front-triangular-pediment', pediment, materials.paper,
        [0, 9, -27.3], [6.5, 2.4, 0.6], [0, Math.PI / 4, 0]);
      add('sky-sanctuary-pediment-circular-relief', basinRim, materials.stone,
        [0, 9.3, -26.65], [0.5, 0.5, 0.5]);
      for (let step = 0; step < 12; step += 1) block('sky-sanctuary-floating-stair', materials.paper,
        0, 0.15 + step * 0.25, -20.3 - step * 0.52, 3.6, 0.24, 0.62);
      block('sky-sanctuary-worn-stair-landing', materials.stone, 0, 0.1, -20.2, 6, 0.25, 1.5);
      add('sky-sanctuary-circular-side-terrace', cylinder, materials.stone, [7.5, 3.4, -31], [4.3, 0.4, 4.3]);
      add('sky-sanctuary-circular-terrace-rail', basinRim, materials.paper, [7.5, 4.4, -31], [4.1, 4.1, 4.1], [Math.PI / 2, 0, 0]);
      add('sky-sanctuary-orb-monument-column', cylinder, materials.stone, [0, 11, -35], [0.45, 6, 0.45]);
      for (const side of [-1, 1]) beam('sky-sanctuary-orb-monument-fork',
        [side * 0.3, 13.2, -35], [side * 1.5, 14.4, -35], materials.paper, 0.18);
      add('sky-sanctuary-orb-monument', crown, materials.light, [0, 14.6, -35], [0.65, 0.65, 0.65]);
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i += 1) add('sky-sanctuary-broken-back-column', cylinder, materials.stone,
          [side * (3 + i * 2.2), 8.4 + i % 2 * 0.7, -34], [0.2, 2.3 + i % 2 * 1.4, 0.2]);
        for (let i = 0; i < 3; i += 1) add('sky-sanctuary-island-evergreen', cone, materials.leaves,
          [side * (8 + i * 0.7), 3 + i * 0.3, -29 - i * 1.2], [0.65, 2.2, 0.65]);
        cloudBank('sky-sanctuary-island-cloud-sea', side * 18, 0.2, -23, 8);
      }
      break;
    }
    case 'reed-basin': {
      const freshGrass = material('#4aaf26');
      const darkGrass = material('#155d2c');
      const rain = material('#b2d0d5', { transparent: true, opacity: 0.42, depthWrite: false });
      const blade = geometry('wetlands-bent-grass-blade', () => new THREE.BoxGeometry(1, 1, 1, 1, 6, 1));
      for (let i = 0; i < blade.attributes.position.count; i += 1) {
        const t = blade.attributes.position.getY(i) + 0.5;
        blade.attributes.position.setXYZ(i,
          blade.attributes.position.getX(i) * (0.23 * (1 - t) + 0.01) + 0.38 * t * t,
          t, blade.attributes.position.getZ(i) * 0.02);
      }
      blade.computeVertexNormals();
      // Five disconnected bent leaves share one clump buffer. Hundreds of
      // blades remain six terrain draws rather than one draw per blade.
      const clump = geometry('wetlands-five-blade-grass-clump', () => {
        const shape = blade.clone();
        for (const [name, template] of Object.entries(blade.attributes)) {
          const attribute = template.clone();
          attribute.array = new template.array.constructor(template.array.length * 5);
          attribute.count = template.count * 5;
          for (let copy = 0; copy < 5; copy += 1) attribute.array.set(template.array, copy * template.array.length);
          shape.setAttribute(name, attribute);
        }
        for (let copy = 0; copy < 5; copy += 1) for (let vertex = 0; vertex < blade.attributes.position.count; vertex += 1) {
          const point = new THREE.Vector3().fromBufferAttribute(blade.attributes.position, vertex);
          point.y *= 1 - copy * 0.075;
          point.x *= 1.15;
          point.applyAxisAngle(new THREE.Vector3(0, 1, 0), copy * Math.PI * 2 / 5);
          shape.attributes.position.setXYZ(copy * blade.attributes.position.count + vertex, point.x, point.y, point.z);
        }
        const indices = blade.index.clone();
        indices.array = new Uint16Array(blade.index.array.length * 5);
        indices.count = blade.index.count * 5;
        for (let copy = 0; copy < 5; copy += 1) for (let i = 0; i < blade.index.count; i += 1) {
          indices.array[copy * blade.index.count + i] = blade.index.array[i] + copy * blade.attributes.position.count;
        }
        shape.setIndex(indices);
        shape.clearGroups();
        shape.computeVertexNormals();
        shape.userData.bladeCount = 5;
        return shape;
      });
      block('wetlands-horizontal-dark-water', materials.water, 0, -0.08, -28, 38, 0.05, 5);
      for (let i = 0; i < 9; i += 1) add('wetlands-low-misty-mountain-horizon', cone, materials.stone,
        [(i - 4) * 4.8, 1 + i % 3 * 0.35, -36], [3.7, 2 + i % 3 * 0.7, 3]);
      for (const side of [-1, 1]) {
        block('wetlands-shallow-peripheral-water', materials.water, side * 18, -0.12, -5, 11, 0.06, 38);
        for (let i = 0; i < 60; i += 1) {
          const x = side * (12.5 + random() * 8);
          const z = -23 + random() * 36;
          add('wetlands-rain-soaked-grass', clump, [materials.leaves, freshGrass, darkGrass][i % 3],
            [x, 0, z], [0.9 + random() * 0.5, 1.4 + random() * 2, 1], [0, random() * Math.PI * 2, (random() - 0.5) * 0.18]);
        }
        for (let i = 0; i < 20; i += 1) {
          const x = side * (12.8 + random() * 9);
          const z = -22 + random() * 34;
          beam('wetlands-diagonal-rain-streak', [x + 1.1, 9, z], [x, 0.5, z], rain, 0.016);
        }
      }
      break;
    }
    case 'skyscrapers': {
      const facade = material('#293541');
      const window = material('#e2e8a0', { emissive: '#c9d87c', emissiveIntensity: 0.55 });
      for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) {
        const x = side * (16.5 + i * 0.5), z = -20 + i * 13;
        const height = 16 + i * 4.5;
        block('skyscraper-enclosing-street-facade', facade, x, height * 0.5, z, 5, height, 7);
        block('skyscraper-projecting-roof-cornice', materials.metal, x, height, z, 5.4, 0.5, 7.3);
        for (let strip = 0; strip < 3; strip += 1) block('skyscraper-yellow-window-strip', window,
          x - side * 2.52, height * 0.5, z + (strip - 1) * 2, 0.035, height * 0.88, 0.65);
        for (let floor = 2; floor < height; floor += 2.5) block('skyscraper-dark-window-spandrel', facade,
          x - side * 2.56, floor, z, 0.06, 0.32, 6.2);
        for (let strip = 0; strip < 2; strip += 1) block('skyscraper-front-yellow-window-strip', window,
          x + (strip - 0.5) * 2.1, height * 0.5, z + 3.53, 0.7, height * 0.84, 0.03);
      }
      for (let tier = 0; tier < 4; tier += 1) {
        const width = 5.2 - tier * 0.95;
        const height = 5.2 - tier * 0.55;
        block('skyscraper-stepped-central-art-deco-spire', facade, 0, 2.6 + tier * 4.3, -35, width, height, width);
        for (let strip = 0; strip < 3; strip += 1) block('skyscraper-spire-window-grid', window,
          (strip - 1) * width * 0.24, 2.6 + tier * 4.3, -35 + width * 0.505, 0.2, height * 0.8, 0.025);
      }
      add('skyscraper-central-pointed-spire', cone, facade, [0, 20.1, -35], [1.15, 5, 1.15]);
      const moon = material('#c2d2cf', { emissive: '#899eac', emissiveIntensity: 0.45 });
      add('skyscraper-high-full-moon', crown, moon, [8, 25.5, -40], [5.5, 5.5, 0.75]);
      for (let i = 0; i < 6; i += 1) add('skyscraper-moon-crater', crown, materials.stone,
        [7 + Math.sin(i * 2.5) * 3, 25.5 + Math.cos(i * 2.5) * 3.5, -39.15], [0.5 + i % 2 * 0.25, 0.45, 0.07]);
      const searchlight = material('#dae6eb', { emissive: '#c4d5e1', emissiveIntensity: 0.2,
        transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true });
      const searchlightShape = geometry('skyscraper-tapered-searchlight', () => new THREE.CylinderGeometry(1, 0.015, 1, 12, 1, true));
      for (const side of [-1, 1]) for (let i = 0; i < 2; i += 1) {
        const from = new THREE.Vector3(side * (7 + i * 5), 3 + i * 4, -33 + i);
        const to = new THREE.Vector3(-side * (16 + i * 2), 28, -38);
        const direction = to.clone().sub(from);
        const mesh = add('skyscraper-crossed-searchlight', searchlightShape, searchlight,
          from.clone().add(to).multiplyScalar(0.5).toArray(), [2.4, direction.length(), 2.4]);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      }
      break;
    }
    case 'runic-fountain': {
      // The existing illustration has one tall fountain and three returning
      // reservoirs. Preserve those separate water routes in physical depth.
      basin(-16, -20, 3.1, 1.1, materials.stone, 3);
      add('runic-fountain-pedestal', cylinder, materials.stone, [-16, 2, -20], [2, 4, 2]);
      add('runic-fountain-spire', cone, materials.ice, [-16, 9, -20], [0.5, 8, 0.5]);
      for (let i = 0; i < 3; i += 1) {
        const x = 13.5 + i * 3.2;
        const z = -22 + i * 2.6;
        basin(x, z, 1.3, 0.75, materials.stone, 2);
        block('runic-return-reservoir', materials.stone, x, 1, z, 2, 2, 2);
        beam('runic-return-water-channel', [x, 2.6, z + 1.1], [x, 0.35, z + 5], materials.water, 0.13);
        beam('runic-fountain-water-jet', [x, 2.8, z], [x, 5.4 + i * 0.6, z], materials.light, 0.045);
      }
      break;
    }
    case 'dragonic-diagram': {
      add('dragonic-relief-dais', cylinder, materials.stone, [0, 0.35, -29], [6.8, 0.7, 6.8]);
      for (let orbit = 0; orbit < 3; orbit += 1) add('dragonic-concentric-relief', ring, materials.gold,
        [0, 0.74, -29], [2 + orbit * 1.6, 2 + orbit * 1.6, 1], [Math.PI / 2, 0, 0]);
      const elementalMaterials = [materials.lava, materials.ice, materials.leaves, materials.gold, materials.light, materials.stone];
      for (let i = 0; i < 6; i += 1) {
        const side = i < 3 ? -1 : 1;
        const x = side * 15;
        const z = -24 + (i % 3) * 7;
        add('dragonic-elemental-seal', ring, elementalMaterials[i], [x, 0.18, z], [2.4, 2.4, 1], [Math.PI / 2, 0, 0]);
        for (let crystal = 0; crystal < 3; crystal += 1) add('diagram-elemental-crystal', cone, elementalMaterials[i],
          [x + (crystal - 1) * 0.7, 1 + crystal * 0.35, z], [0.35, 2 + crystal * 0.7, 0.35]);
      }
      beam('diagram-calibrated-pointer', [0, 0.8, -29], [4.5, 0.8, -30.5], materials.gold, 0.16);
      break;
    }
    case 'fusion-meltdown': {
      for (const side of [-1, 1]) {
        const mat = side < 0 ? materials.lava : materials.ice;
        block('meltdown-opposing-energy-channel', mat, side * 14, 0.1, -8, 2.5, 0.13, 30);
        for (let i = 0; i < 5; i += 1) add('meltdown-faceted-border', cone, mat,
          [side * 16, 1 + i * 0.12, -19 + i * 5], [0.45, 2 + i * 0.24, 0.45]);
        beam('meltdown-converging-current', [side * 14, 0.2, -23], [side * 2, 2.2, -29], mat, 0.17);
        columns(side * 15, -28, 3, 5, materials.dark);
      }
      block('meltdown-fusion-chamber', materials.dark, 0, 5, -31, 5, 10, 3);
      portal(0, 5, -29.3, 2.6);
      break;
    }
    case 'rainbow-ruins': {
      const colors = ['#d35775', '#e89440', '#e8cb5b', '#70bd74', '#5dc1d9', '#7774cb', '#b673bd'];
      for (let i = 0; i < 7; i += 1) {
        const x = (i - 3) * 2.35;
        const mat = material(colors[i], { emissive: colors[i], emissiveIntensity: 0.22 });
        block('rainbow-ruin-pedestal', materials.stone, x, 0.7, -29, 1.6, 1.4, 1.6);
        add('rainbow-crystal-relic', cone, mat, [x, 2.7, -29], [0.65, 3, 0.65], [0, i * 0.2, 0]);
        if (i < 6) beam('rainbow-relic-aqueduct', [x, 0.4, -30.3], [x + 2.35, 0.4, -30.3], mat, 0.07);
      }
      for (const side of [-1, 1]) columns(side * 15, -23, 3, 5);
      break;
    }
    case 'cyber-islands': {
      for (let i = 0; i < 6; i += 1) {
        const side = i % 2 ? 1 : -1;
        const x = side * (14 + (i % 3) * 3);
        const z = -22 + Math.floor(i / 2) * 8;
        add('cyber-arrival-island', cylinder, materials.metal, [x, 2, z], [2, 0.55, 2]);
        add('cyber-island-summon-rim', ring, materials.light, [x, 2.3, z], [1.8, 1.8, 1], [Math.PI / 2, 0, 0]);
        add('cyber-island-keystone', crown, materials.light, [x, 4, z], [0.6, 0.6, 0.6]);
        beam('cyber-island-link', [x, 2.1, z], [side * 22, 2.1, z - 3]);
      }
      break;
    }
    case 'union-hangar': {
      for (const side of [-1, 1]) {
        block('hangar-overhead-service-rail', materials.metal, side * 16, 9, -8, 0.5, 0.6, 29);
        for (let i = 0; i < 3; i += 1) {
          const z = -18 + i * 9;
          block('union-docking-cradle', materials.dark, side * 15, 0.4, z, 4, 0.8, 4);
          for (const claw of [-1, 1]) {
            block('union-cradle-brace', materials.metal, side * 15 + claw * 1.6, 1.5, z, 0.5, 2.5, 3);
            beam('union-service-arm', [side * 16, 8.8, z], [side * 14, 5.8, z], materials.metal, 0.2);
          }
          block('union-service-head', materials.metal, side * 14, 5.5, z, 1.8, 0.65, 0.8);
        }
      }
      break;
    }
    case 'orbital-town': {
      for (const side of [-1, 1]) for (let i = 0; i < 4; i += 1) {
        const x = side * (14 + i * 2.8);
        const z = -27 + i * 3.7;
        tower(x, z, 3.5 + i * 0.8, 2.2, materials.stone, true);
        add('orbital-town-dome', crown, materials.gold, [x, 6.1 + i * 0.8, z], [1.4, 0.8, 1.4]);
      }
      add('kozmotown-orbital-horizon', ring, materials.gold, [0, 14, -34], [9, 5.5, 9], [0.15, 0, -0.3]);
      break;
    }
    case 'numeron-gate-network': {
      const anchors = [[-15, 5, -23], [-15, 5, -7], [15, 5, -23], [15, 5, -7]];
      for (const [x, y, z] of anchors) {
        block('numeron-gate-plinth', materials.metal, x, 0.8, z, 4, 1.6, 4);
        for (const side of [-1, 1]) block('numeron-gate-upright', materials.gold, x + side * 1.5, y, z, 0.65, 7, 0.7);
        block('numeron-gate-lintel', materials.gold, x, 8.4, z, 3.7, 0.65, 0.7);
        add('numeron-gate-orbit', ring, materials.light, [x, y, z], [1.5, 2.4, 1.5]);
      }
      for (const side of [-1, 1]) beam('numeron-linked-route', [side * 15, 0.12, -23], [side * 15, 0.12, -7], materials.light, 0.09);
      beam('numeron-network-cross-route', [-15, 0.12, -26], [15, 0.12, -26], materials.light, 0.09);
      break;
    }
    case 'primeval-tidal-planet': {
      basin(0, -29, 5.2, 0.85, materials.stone);
      for (const side of [-1, 1]) {
        add('perlereino-tidal-arch', basinRim, materials.ice, [side * 15, 3.3, -16], [2.8, 3.8, 2.8]);
        for (let i = 0; i < 3; i += 1) {
          add('perlereino-pearl-relic', crown, materials.paper, [side * (14 + i), 1.4, -22 + i * 7], [0.6, 0.6, 0.6]);
          add('perlereino-sea-flora', cone, materials.leaves, [side * (16 + i), 0.8, -22 + i * 7], [0.3, 1.8, 0.3], [0, 0, side * 0.25]);
        }
      }
      break;
    }
    case 'pressured-planet': {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i += 1) {
          const z = -23 + i * 8;
          block('wraitsoth-extraction-platform', materials.metal, side * 16, 0.5, z, 4.5, 1, 4.5);
          add('wraitsoth-drill-tower', cone, materials.dark, [side * 16, 4, z], [1.2, 7, 1.2]);
          add('wraitsoth-pressure-ring', ring, materials.lava, [side * 16, 4.2, z], [1.4, 1.4, 1], [Math.PI / 2, 0, 0]);
        }
      }
      add('wraitsoth-fractured-planet', rock, materials.ground, [0, 15, -35], [5, 5, 5]);
      add('wraitsoth-orbital-pressure-band', ring, materials.lava, [0, 15, -35], [6.1, 6.1, 6.1], [0.4, 0.2, -0.4]);
      break;
    }
    case 'seven-star-observatory': {
      const stars = [[-9, 14], [-5, 15], [-1, 14.3], [3, 12.5], [5, 8.5], [0.8, 7.8], [-1, 11]];
      for (let i = 0; i < stars.length; i += 1) {
        const [x, y] = stars[i];
        add('big-dipper-star', crown, materials.light, [x, y, -31], [0.35, 0.35, 0.35]);
        if (i > 0) beam('big-dipper-constellation-link', [...stars[i - 1], -31], [x, y, -31], materials.light, 0.025);
      }
      beam('big-dipper-bowl-link', [...stars[6], -31], [...stars[3], -31], materials.light, 0.025);
      for (const side of [-1, 1]) {
        block('ursarctic-observatory-base', materials.ice, side * 15, 1.2, -19, 5, 2.4, 5);
        add('ursarctic-star-instrument', ring, materials.metal, [side * 15, 4.5, -19], [3, 3, 3], [0, side * 0.35, 0]);
      }
      break;
    }
    case 'aromatic-garden': {
      basin(0, -28, 2.8, 0.65, materials.paper);
      for (const side of [-1, 1]) {
        block('aroma-herb-bed', materials.wood, side * 13.5, 0.35, -9, 2.5, 0.7, 26);
        for (let i = 0; i < 9; i += 1) {
          const z = -20 + i * 3;
          add('aroma-flowering-herb', crown, i % 2 ? materials.paper : materials.gold,
            [side * 13.5, 1.1, z], [0.5, 0.6, 0.5]);
          add('aroma-herb-foliage', cone, materials.leaves, [side * 13.5, 0.75, z], [0.55, 1.3, 0.55]);
        }
        for (const x of [side * 12, side * 17]) block('aroma-pergola-post', materials.wood, x, 3.1, -23, 0.25, 6.2, 0.25);
        block('aroma-pergola-lattice', materials.wood, side * 14.5, 6.2, -23, 5.8, 0.3, 2);
      }
      break;
    }
    case 'hidden-spellcaster-village': {
      for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) {
        const x = side * (15 + i * 3.8);
        const z = -24 + i * 6;
        block('spellcaster-cottage', materials.wood, x, 1.7, z, 3.2, 3.4, 3.2);
        add('spellcaster-cottage-roof', cone, materials.stone, [x, 4.3, z], [2.4, 2.4, 2.4], [0, Math.PI / 4, 0]);
        block('spellcaster-lantern-window', materials.light, x, 1.7, z + 1.61, 0.65, 0.9, 0.025);
      }
      columns(0, -29, 3, 4, materials.wood);
      add('hidden-village-seal', ring, materials.light, [0, 4.4, -28.3], [1.8, 1.8, 1.8]);
      break;
    }
    case 'railway-turntable': {
      add('switchyard-turntable-pit', cylinder, materials.dark, [0, 0.12, -29], [7, 0.25, 7]);
      add('switchyard-turntable-rim', ring, materials.metal, [0, 0.3, -29], [6.7, 6.7, 1], [Math.PI / 2, 0, 0]);
      block('switchyard-rotating-bridge', materials.metal, 0, 0.55, -29, 13, 0.65, 2.4).rotation.y = 0.35;
      for (const side of [-1, 1]) {
        for (const rail of [-1, 1]) block('switchyard-track-rail', materials.metal,
          side * 14 + rail * 0.8, 0.1, -6, 0.15, 0.2, 31);
        for (let i = 0; i < 12; i += 1) block('switchyard-track-sleeper', materials.wood,
          side * 14, 0.07, -20 + i * 2.5, 2.5, 0.14, 0.32);
        block('switchyard-signal-mast', materials.metal, side * 12, 3, -18, 0.18, 6, 0.18);
        add('switchyard-signal-light', crown, materials.light, [side * 12, 5.8, -18], [0.23, 0.23, 0.23]);
      }
      break;
    }
    case 'airspace-launch-base': {
      for (const side of [-1, 1]) {
        block('area-zero-launch-deck', materials.metal, side * 16, 1.2, -12, 6, 2.4, 25);
        for (let i = 0; i < 7; i += 1) block('area-zero-runway-guide', materials.light,
          side * 16, 2.43, -22 + i * 3.4, 0.35, 0.03, 1.3);
        block('area-zero-control-mast', materials.dark, side * 21, 6, -23, 2.3, 12, 2.3);
        add('area-zero-radar-dish', basinRim, materials.metal, [side * 21, 13.2, -23], [1.8, 1.8, 1.8], [0.3, side * 0.4, 0]);
      }
      break;
    }
    case 'dimensional-shipwrecks': {
      for (const side of [-1, 1]) {
        const hull = add('sargasso-broken-hull', rock, materials.metal,
          [side * 17, 3.5, -16], [2.5, 1.8, 7], [0.2, side * 0.3, side * 0.12]);
        hull.userData.landmarkDetail = 'empty-environmental-wreck';
        beam('sargasso-broken-mast', [side * 17, 4, -16], [side * 16, 10, -17], materials.wood, 0.14);
        add('sargasso-rift-ring', ring, materials.light, [side * 18, 7, -23], [3.2, 3.2, 3.2], [0.2, side * 0.4, 0]);
        for (let i = 0; i < 3; i += 1) block('sargasso-detached-hull-plank', materials.wood,
          side * (13 + i * 2), 2 + i, -26 - i * 2, 0.5, 0.25, 3).rotation.y = side * 0.5;
      }
      break;
    }
    case 'stellar-ritual-orbits': {
      add('drytron-observation-dais', cylinder, materials.metal, [0, 0.35, -29], [5.3, 0.7, 5.3]);
      for (let i = 0; i < 3; i += 1) add('drytron-calibrated-orbit', ring, materials.gold,
        [0, 6, -29], [3.5 + i * 0.7, 3.5 + i * 0.7, 3.5 + i * 0.7], [i * 0.65, i * 0.45, i * 0.3]);
      add('drytron-star-focus', crown, materials.light, [0, 6, -29], [0.7, 0.7, 0.7]);
      for (const side of [-1, 1]) columns(side * 14, -22, 3, 4, materials.metal);
      break;
    }
    case 'launch-silos': {
      for (const side of [-1, 1]) for (let i = 0; i < 3; i += 1) {
        const z = -22 + i * 9;
        add('boot-sector-launch-tube', cylinder, materials.dark, [side * 15, 2.5, z], [1.7, 5, 1.7]);
        add('boot-sector-open-silo-rim', basinRim, materials.metal, [side * 15, 5, z], [1.7, 1.7, 1.7], [Math.PI / 2, 0, 0]);
        for (const lid of [-1, 1]) block('boot-sector-open-hatch', materials.metal,
          side * 15 + lid * 1.8, 5.15, z, 1.2, 0.35, 3.3).rotation.z = lid * 0.6;
        add('boot-sector-launch-beacon', crown, materials.light, [side * 15, 5.1, z], [0.35, 0.35, 0.35]);
      }
      break;
    }
    case 'ritual-light-basin': {
      basin(0, -28, 3.8, 0.8, materials.paper);
      for (let i = 0; i < 6; i += 1) {
        const angle = i * Math.PI / 3;
        const x = Math.cos(angle) * 5.3;
        const z = -28 + Math.sin(angle) * 5.3;
        block('ritual-offering-plinth', materials.paper, x, 0.8, z, 1, 1.6, 1);
        add('ritual-offering-light', crown, materials.light, [x, 2.2, z], [0.22, 0.4, 0.22]);
      }
      beam('ritual-sanctuary-light-shaft', [0, 1, -28], [0, 12, -28], materials.light, 0.075);
      break;
    }
    case 'twin-salvation-gates': {
      for (const side of [-1, 1]) {
        portal(side * 13, 4.4, -23, 2.8, side < 0 ? materials.light : materials.gold);
        block('salvation-inscribed-stele', materials.stone, side * 13, 2.2, -24, 1.5, 4.4, 0.7);
        for (let row = 0; row < 3; row += 1) block('salvation-stele-relief', materials.gold,
          side * 13, 1.2 + row * 0.85, -23.64, 0.75, 0.1, 0.03);
      }
      beam('salvation-revival-connection', [-13, 0.15, -26], [13, 0.15, -26], materials.light, 0.08);
      break;
    }
    case 'nightmare-mirror':
    case 'radiant-mirror': {
      const radiant = profile.landmark === 'radiant-mirror';
      const frame = radiant ? materials.gold : materials.dark;
      add('dream-mirror-oval-frame', basinRim, frame, [0, 6.2, -26], [3.5, 5, 0.8]);
      // A tinted physical mirror surface contains no scene capture or cards.
      const mirror = material(radiant ? '#b3dae6' : '#3e2459', { metalness: 0.94, roughness: 0.2 });
      add('dream-mirror-reflective-surface', cylinder, mirror, [0, 6.2, -26.05], [3.25, 0.05, 4.6], [Math.PI / 2, 0, 0]);
      for (const side of [-1, 1]) {
        block('dream-mirror-support', frame, side * 3.2, 2.3, -26, 0.6, 4.6, 0.8);
        add(radiant ? 'dream-mirror-dawn-finial' : 'dream-mirror-night-spike', cone,
          radiant ? materials.gold : materials.light, [side * 3.1, 10.7, -26], [0.55, 1.5, 0.55]);
      }
      break;
    }
    case 'archfiend-court': {
      block('pandemonium-court-dais', materials.dark, 0, 0.7, -29, 16, 1.4, 8);
      for (const side of [-1, 1]) {
        block('pandemonium-throne-arm', materials.stone, side * 2.2, 2.8, -30, 1.1, 4, 3);
        add('pandemonium-horned-spire', cone, materials.stone, [side * 5.2, 6, -29], [1, 11, 1], [0, 0, side * -0.2]);
        add('pandemonium-flame-basin', cylinder, materials.gold, [side * 12, 2, -22], [0.8, 0.35, 0.8]);
        add('pandemonium-flame', cone, materials.lava, [side * 12, 2.7, -22], [0.4, 1.5, 0.4]);
      }
      block('pandemonium-empty-throne-back', materials.dark, 0, 4.5, -31, 4, 8, 0.8);
      block('pandemonium-empty-throne-seat', materials.stone, 0, 2.5, -29.9, 3.5, 0.6, 2.7);
      break;
    }
    case 'waterfront-counter-tower': {
      for (const side of [-1, 1]) {
        waterShelf(side);
        block('kyoutou-quayside', materials.stone, side * 13.5, 0.15, -11, 2.5, 0.3, 27);
        for (let i = 0; i < 4; i += 1) {
          const z = -20 + i * 7;
          block('waterfront-harbor-pylon', materials.metal, side * 14, 1.2, z, 0.5, 2.4, 0.5);
          beam('waterfront-mooring-rail', [side * 14, 2, z], [side * 14, 2, z + 5], materials.metal, 0.07);
        }
      }
      tower(0, -30, 14, 3.5, materials.metal);
      for (let i = 0; i < 5; i += 1) block('kyoutou-counter-reservoir', materials.light,
        0, 3.3 + i * 1.8, -28.2, 1.8, 0.45, 0.1);
      break;
    }
  }

  // Materials that a particular family did not use must not leak on a rebuild.
  const usedMaterials = new Set();
  root.traverse(object => {
    if (object.material) usedMaterials.add(object.material);
  });
  for (const mat of Object.values(materials)) if (!usedMaterials.has(mat)) mat.dispose();
  const usedGeometries = new Set();
  root.traverse(object => {
    if (object.geometry) usedGeometries.add(object.geometry);
  });
  for (const shape of geometries.values()) if (!usedGeometries.has(shape)) shape.dispose();
  root.userData.meshCount = batchStaticEnvironmentMeshes(THREE, root);
  root.userData.drawCallCount = root.children.filter(object => object.isMesh).length;
  root.userData.materialCount = usedMaterials.size;
  return root;
}

function batchStaticEnvironmentMeshes(THREE, root) {
  const sourceMeshes = root.children.filter(object => object.isMesh);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of sourceMeshes) {
    mesh.updateMatrix();
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
    for (const [index, axis] of ['x', 'y', 'z'].entries()) {
      min[index] = Math.min(min[index], bounds.min[axis]);
      max[index] = Math.max(max[index], bounds.max[axis]);
    }
  }
  root.userData.bounds = Object.freeze({ min: Object.freeze(min), max: Object.freeze(max) });
  if (!THREE.InstancedMesh) return sourceMeshes.length;
  const batches = new Map();
  for (const mesh of sourceMeshes) {
    const key = `${mesh.geometry.uuid}:${mesh.material.uuid}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(mesh);
  }
  root.clear();
  for (const meshes of batches.values()) {
    const first = meshes[0];
    const batch = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    batch.name = `field-prop-batch-${root.children.length}`;
    batch.userData.instanceNames = Object.freeze(meshes.map(mesh => mesh.name));
    batch.castShadow = meshes.some(mesh => mesh.castShadow);
    batch.receiveShadow = true;
    for (let index = 0; index < meshes.length; index += 1) {
      meshes[index].updateMatrix();
      batch.setMatrixAt(index, meshes[index].matrix);
    }
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingBox();
    batch.computeBoundingSphere();
    root.add(batch);
  }
  return sourceMeshes.length;
}

export function hasFieldEnvironmentLandmarkGeometry(group, name) {
  if (!group || typeof name !== 'string') return false;
  let found = false;
  group.traverse?.(object => {
    if (object.isMesh && (
      object.name === name || object.userData?.instanceNames?.includes(name)
    )) found = true;
  });
  return found;
}

/** Shared shapes/materials are disposed once when a resolved Field is replaced. */
export function disposeFieldEnvironmentGeometry(group) {
  if (!group || group.userData?.disposed) return;
  const geometries = new Set();
  const materials = new Set();
  const instances = new Set();
  group.traverse?.(object => {
    if (object.isInstancedMesh) instances.add(object);
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material) materials.add(material);
    }
  });
  // InstancedMesh owns its GPU instance attributes in addition to the shared
  // geometry/material; its disposal event releases those renderer buffers.
  for (const instance of instances) instance.dispose?.();
  for (const shape of geometries) shape.dispose?.();
  for (const mat of materials) mat.dispose?.();
  group.removeFromParent?.();
  group.clear?.();
  if (group.userData) group.userData.disposed = true;
}
