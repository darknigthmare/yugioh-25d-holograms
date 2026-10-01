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
const CARD_LANDMARKS = Object.freeze({
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
  '4064256': 'ruined-crypt'
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
    landmark: CARD_LANDMARKS[normalizedCardId] || family,
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
      portal(0, 7, -29, profile.landmark === 'fusion-gate' ? 6.5 : 5);
      scatterRocks(9, materials.dark);
      for (const side of [-1, 1]) {
        portal(side * 19, 4, -12, 2.5);
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
  let meshCount = 0;
  root.traverse(object => { if (object.isMesh) meshCount += 1; });
  root.userData.meshCount = meshCount;
  return root;
}

/** Shared shapes/materials are disposed once when a resolved Field is replaced. */
export function disposeFieldEnvironmentGeometry(group) {
  if (!group || group.userData?.disposed) return;
  const geometries = new Set();
  const materials = new Set();
  group.traverse?.(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material) materials.add(material);
    }
  });
  for (const shape of geometries) shape.dispose?.();
  for (const mat of materials) mat.dispose?.();
  group.removeFromParent?.();
  group.clear?.();
  if (group.userData) group.userData.disposed = true;
}
