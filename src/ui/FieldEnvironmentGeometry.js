/**
 * Peripheral, real geometry for the Field Spell environments. The dedicated
 * backdrop stays the illustration source; these volumes add parallax and
 * environmental detail without obscuring the playable area or private cards.
 *
 * This is a procedural interpretation, not a recreation of official artwork.
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
  '56111151': 'waterfront-counter-tower'
});

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
  return Object.freeze({
    family,
    cardId: normalizedCardId,
    landmark: FIELD_ENVIRONMENT_CARD_LANDMARKS[normalizedCardId] || family,
    hasDedicatedLandmark: Object.hasOwn(FIELD_ENVIRONMENT_CARD_LANDMARKS, normalizedCardId),
    seed: hash(`${family}:${normalizedCardId || 'base'}`),
    fidelity: 'procedural-interpretation'
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
    publicOnly: true
  };

  const palette = environment.surfacePalette || {};
  const tint = palette.ground || environment.environmentTint || '#34425f';
  const stone = palette.platform || '#647078';
  const accent = environment.accentColor || '#79d9ff';
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 0.85, metalness: 0.04, ...options
  });
  const materials = {
    stone: material(stone),
    ground: material(tint),
    dark: material('#181e23'),
    metal: material('#465158', { metalness: 0.72, roughness: 0.4 }),
    wood: material('#453629'),
    leaves: material(['yami', 'graveyard'].includes(profile.family) ? '#292330' : tint),
    light: material(accent, { emissive: accent, emissiveIntensity: 0.65, roughness: 0.35 }),
    water: material(profile.family === 'swamp' ? '#2c5045' : '#14738b', {
      roughness: 0.16, metalness: 0.5, transparent: true, opacity: 0.72
    }),
    ice: material('#93d9ee', { roughness: 0.24, metalness: 0.15 }),
    gold: material('#c79b44', { metalness: 0.62, roughness: 0.42 }),
    lava: material('#f04a12', { emissive: '#e53105', emissiveIntensity: 1.1 }),
    paper: material('#e8cfa0', { side: THREE.DoubleSide })
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

  switch (profile.family) {
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
      for (const side of [-1, 1]) {
        for (let step = 0; step < 9; step += 1) block('sky-sanctuary-floating-stair', materials.paper,
          side * 18, 6.5 + step * 0.42, -26 + step * 0.6, 2.1, 0.23, 0.75);
        beam('sky-sanctuary-airborne-bridge', [side * 6, 2.8, -30], [side * 18, 7, -26], materials.paper, 0.3);
        add('sky-sanctuary-radiant-arch', basinRim, materials.gold, [side * 8, 8, -33], [2.5, 4, 1]);
      }
      break;
    }
    case 'reed-basin': {
      for (const side of [-1, 1]) {
        basin(side * 18, -16, 2.8, 0.13, materials.ground);
        for (let i = 0; i < 6; i += 1) {
          const x = side * (14.5 + i * 0.55);
          const z = -18 + i * 3.6;
          add('wetlands-floating-lily-pad', cylinder, materials.leaves, [x, -0.06, z], [0.65, 0.03, 0.65]);
          add('wetlands-cattail-stem', cylinder, materials.leaves, [side * 13, 1.1, z], [0.035, 2.2, 0.035]);
          add('wetlands-cattail-seedhead', cylinder, materials.wood, [side * 13, 2.25, z], [0.12, 0.5, 0.12]);
        }
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
