import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getDuelistAvatar, DEFAULT_DUELIST_AVATAR_ID } from '../content/DuelistAvatarCatalog.js';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Builds a public, texture-free duelist likeness from the character catalogue.
 *
 * The returned { group, update(elapsedSeconds), resetPose(), dispose() } owns
 * its geometry and materials. Only catalogue IDs are accepted: supplied object
 * metadata cannot replace the trusted character design. Nothing here receives
 * a duel, a hand, a card identity, or an engine callback.
 */
export function createDuelistAvatarModel(avatarIdOrProfile, { owner = 'player', reducedMotion = false } = {}) {
  const requestedId = typeof avatarIdOrProfile === 'string'
    ? avatarIdOrProfile : avatarIdOrProfile?.id;
  const avatar = getDuelistAvatar(requestedId) || getDuelistAvatar(DEFAULT_DUELIST_AVATAR_ID);
  const visual = avatar.visual;
  const id = avatar.id;
  const palette = {
    skin: visual.skinColor,
    cloth: visual.outfitColor,
    trim: visual.accentColor,
    hair: visual.hairColor,
    hairAccent: visual.hairAccent,
    dark: '#141a2b',
    white: '#f6f2e7',
    metal: '#bfcbd7',
    gold: '#eec35d'
  };
  const root = new THREE.Group();
  root.name = `${owner === 'opponent' ? 'opponent' : 'player'}-character`;
  root.userData.avatarId = id;
  root.userData.owner = owner === 'opponent' ? 'opponent' : 'player';
  root.userData.partNames = [];
  root.userData.visualStyle = 'stylized-catalogue-silhouette';
  root.scale.setScalar(visual.height);

  const body = new THREE.Group();
  body.name = 'duelist-breathing-rig';
  root.add(body);
  const head = new THREE.Group();
  head.name = 'duelist-gaze-rig';
  head.position.y = 4.86;
  body.add(head);
  const hair = new THREE.Group();
  hair.name = 'duelist-hair-rig';
  head.add(hair);
  const cloth = new THREE.Group();
  cloth.name = 'duelist-cloth-rig';
  cloth.position.set(0, 2.77, -0.14);
  body.add(cloth);
  const stages = { body, head, hair, cloth };
  const origins = { body: [0, 0, 0], head: [0, 4.86, 0], hair: [0, 4.86, 0], cloth: [0, 2.77, -0.14] };
  const batches = new Map();
  const materials = {
    matte: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.72, metalness: 0.025 }),
    metal: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.33, metalness: 0.68 }),
    eye: new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true })
  };
  let disposed = false;

  function add(name, geometry, tint, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0], stage = 'body', material = 'matte') {
    const origin = origins[stage];
    const transform = new THREE.Object3D();
    transform.position.set(position[0] - origin[0], position[1] - origin[1], position[2] - origin[2]);
    transform.scale.set(...scale);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    geometry.applyMatrix4(transform.matrix);
    if (geometry.index) {
      const expanded = geometry.toNonIndexed();
      geometry.dispose();
      geometry = expanded;
    }
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
    const color = new THREE.Color(tint);
    const values = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) { values[i] = color.r; values[i + 1] = color.g; values[i + 2] = color.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
    const key = `${stage}:${material}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(geometry);
    root.userData.partNames.push(name);
  }
  const sphere = (name, tint, position, scale, stage = 'body', material = 'matte') => add(name, new THREE.SphereGeometry(1, 12, 8), tint, position, scale, undefined, stage, material);
  const box = (name, tint, position, scale, rotation, stage = 'body', material = 'matte') => add(name, new THREE.BoxGeometry(1, 1, 1), tint, position, scale, rotation, stage, material);
  const ring = (name, tint, position, radius, tube = 0.024, rotation = [0, 0, 0], stage = 'body', material = 'metal') => add(name, new THREE.TorusGeometry(radius, tube, 5, 20), tint, position, undefined, rotation, stage, material);
  function rod(name, tint, start, end, radius = 0.12, tipRadius = radius, stage = 'body', material = 'matte') {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const midpoint = a.add(b).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
    const geometry = new THREE.CylinderGeometry(tipRadius, radius, direction.length(), 10);
    geometry.applyQuaternion(quaternion);
    add(name, geometry, tint, midpoint.toArray(), undefined, undefined, stage, material);
  }
  function wedge(name, tint, base, tip, width, depth, stage = 'hair', material = 'matte') {
    const [x, y, z] = base;
    const vertices = [x - width / 2, y, z + depth / 2, x + width / 2, y, z + depth / 2,
      x + width / 2, y, z - depth / 2, x - width / 2, y, z - depth / 2, ...tip];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4, 0, 3, 2, 0, 2, 1]);
    geometry.computeVertexNormals();
    add(name, geometry, tint, undefined, undefined, undefined, stage, material);
  }
  function panel(name, tint, points, thickness = 0.08, stage = 'cloth', material = 'matte') {
    const shape = new THREE.Shape();
    points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
    add(name, geometry, tint, [0, 0, -0.28], undefined, undefined, stage, material);
  }
  const broad = visual.build === 'broad' ? 1.2 : visual.build === 'slim' ? 0.88 : 1;
  const skirt = visual.outfitStyle === 'dress' || visual.outfitStyle === 'robe' || id === 'mai';
  const robot = visual.outfitStyle === 'mechanical';
  const armor = visual.outfitStyle === 'armor' || robot;
  const legColor = skirt ? palette.skin : visual.outfitStyle === 'sport' ? palette.skin : palette.dark;
  const shoeColor = visual.outfitStyle === 'sport' ? palette.white : palette.dark;
  const variant = visual.variant;

  // Complete anatomy, including separate feet, articulated elbows and fingers.
  for (const side of [-1, 1]) {
    const legX = side * 0.27 * broad;
    rod(`thigh-${side}`, legColor, [legX, 2.57, 0], [legX * 1.08, 1.42, 0.02], skirt ? 0.16 : 0.22, skirt ? 0.14 : 0.18);
    sphere(`knee-${side}`, legColor, [legX * 1.08, 1.43, 0.07], [0.16, 0.18, 0.15]);
    rod(`calf-${side}`, legColor, [legX * 1.08, 1.4, 0.02], [legX * 1.2, 0.4, 0.09], 0.14, 0.18);
    rod(`boot-shaft-${side}`, shoeColor, [legX * 1.2, 0.23, 0.08], [legX * 1.15, skirt ? 0.95 : 0.63, 0.08], 0.2, 0.18);
    sphere(`boot-toe-${side}`, shoeColor, [legX * 1.2, 0.2, 0.29], [0.23, 0.17, 0.39]);
    box(`boot-sole-${side}`, '#303746', [legX * 1.2, 0.085, 0.22], [0.46, 0.08, 0.75]);
    if (armor) {
      box(`shin-armor-${side}`, palette.trim, [legX * 1.13, 0.86, 0.23], [0.3, 0.76, 0.15], undefined, 'body', 'metal');
      sphere(`armored-knee-${side}`, palette.cloth, [legX * 1.08, 1.46, 0.21], [0.23, 0.23, 0.12], 'body', 'metal');
    }
  }
  sphere('pelvis', palette.dark, [0, 2.62, 0], [0.47 * broad, 0.38, 0.3]);
  sphere('tailored-torso', palette.cloth, [0, 3.43, 0], [0.62 * broad, 0.81, 0.32]);
  box('belt', palette.dark, [0, 2.78, 0], [0.89 * broad, 0.13, 0.63]);
  box('belt-clasp', palette.trim, [0, 2.79, 0.33], [0.19, 0.14, 0.07], undefined, 'body', 'metal');
  rod('neck', palette.skin, [0, 4.07, 0], [0, 4.47, 0], 0.19);

  for (const side of [-1, 1]) {
    const shoulderX = side * 0.64 * broad;
    const elbow = [side * (0.89 * broad), 3.35, side < 0 ? 0.26 : 0.03];
    const wrist = [side * (0.88 * broad), side < 0 ? 3.12 : 2.96, side < 0 ? 0.72 : 0.22];
    sphere(`shoulder-${side}`, palette.cloth, [shoulderX, 4.04, 0], [0.3, 0.3, 0.3]);
    rod(`sleeve-${side}`, palette.cloth, [shoulderX, 4.05, 0], elbow, 0.23, 0.21);
    sphere(`elbow-${side}`, palette.cloth, elbow, [0.2, 0.2, 0.2]);
    rod(`forearm-${side}`, visual.outfitStyle === 'sport' || skirt ? palette.skin : palette.cloth, elbow, wrist, 0.16, 0.18);
    sphere(`hand-${side}`, palette.skin, wrist, [0.18, 0.21, 0.13]);
    for (let finger = 0; finger < 4; finger += 1) {
      const x = wrist[0] + (finger - 1.5) * 0.052;
      rod(`finger-${side}-${finger}`, palette.skin, [x, wrist[1] - 0.09, wrist[2] + 0.065], [x, wrist[1] - 0.26, wrist[2] + 0.045], 0.025, 0.02);
    }
    sphere(`thumb-${side}`, palette.skin, [wrist[0] + side * 0.15, wrist[1] - 0.06, wrist[2] + 0.015], [0.075, 0.11, 0.065]);
    if (armor) sphere(`pauldron-${side}`, palette.trim, [shoulderX, 4.12, 0], [0.44, 0.28, 0.43], 'body', 'metal');
  }

  // Garment cuts change the outline rather than recolouring a mannequin.
  if (visual.outfitStyle === 'long-coat') {
    for (const side of [-1, 1]) {
      panel(`long-coat-tail-${side}`, palette.cloth, [[side * 0.11, 3.6], [side * 0.65, 3.72], [side * 1.04, 1.13], [side * 0.4, 1.02]], 0.09);
      wedge(`raised-coat-collar-${side}`, palette.cloth, [side * 0.43, 4.12, 0.08], [side * 0.51, 4.71, -0.08], 0.39, 0.2, 'body');
      box(`coat-lapel-${side}`, palette.trim, [side * 0.35, 3.81, 0.31], [0.16, 0.66, 0.055], [0, 0, side * -0.28]);
      for (let button = 0; button < 3; button += 1) sphere(`coat-rivet-${side}-${button}`, palette.metal, [side * 0.46, 3.73 - button * 0.25, 0.34], [0.04, 0.04, 0.025], 'body', 'metal');
    }
    box('coat-inner-vest', palette.dark, [0, 3.56, 0.29], [0.5, 0.98, 0.075]);
  } else if (skirt) {
    const long = visual.outfitStyle === 'robe';
    add(long ? 'flowing-robe' : 'pleated-skirt', new THREE.CylinderGeometry(0.4 * broad, (long ? 0.91 : 0.77) * broad, long ? 2.18 : 1.03, 12, 1), palette.cloth,
      [0, long ? 1.59 : 2.27, 0], [1, 1, 0.8], undefined, 'cloth');
    for (let fold = 0; fold < 8; fold += 1) {
      const angle = fold * Math.PI / 4;
      rod(`garment-fold-${fold}`, palette.trim, [Math.sin(angle) * 0.41 * broad, 2.73, Math.cos(angle) * 0.31],
        [Math.sin(angle) * (long ? 0.86 : 0.7) * broad, long ? 0.56 : 1.79, Math.cos(angle) * (long ? 0.68 : 0.56)], 0.018, 0.01, 'cloth');
    }
    box('dress-waistband', palette.trim, [0, 2.89, 0.22], [0.88 * broad, 0.16, 0.29]);
    if (id === 'mai') box('mai-midriff', palette.skin, [0, 3.13, 0.309], [0.67, 0.31, 0.062]);
    for (const side of [-1, 1]) box(`dress-neckline-${side}`, palette.skin, [side * 0.14, 4.05, 0.29], [0.25, 0.25, 0.07], [0, 0, side * 0.53]);
  } else if (armor) {
    box('segmented-chest-armor', palette.trim, [0, 3.55, 0.32], [0.95 * broad, 0.73, 0.18], undefined, 'body', 'metal');
    for (let plate = 0; plate < 3; plate += 1) box(`abdominal-armor-${plate}`, palette.cloth, [0, 3.21 - plate * 0.17, 0.34], [0.65 * broad, 0.12, 0.11], undefined, 'body', 'metal');
    if (robot) {
      for (const side of [-1, 1]) box(`mechanical-back-vane-${side}`, palette.trim, [side * 0.63, 3.77, -0.41], [0.3, 1.11, 0.33], [0.12, 0, side * -0.33], 'cloth', 'metal');
      sphere('mechanical-chest-core', '#75e6ff', [0, 3.63, 0.46], [0.13, 0.13, 0.07], 'body', 'eye');
    }
  } else {
    const suit = visual.outfitStyle === 'suit';
    const school = visual.outfitStyle === 'school' || visual.outfitStyle === 'uniform';
    const sport = visual.outfitStyle === 'sport';
    box('visible-inner-shirt', suit || school ? palette.white : palette.dark, [0, 3.6, 0.29], [0.36, 0.93, 0.07]);
    for (const side of [-1, 1]) {
      box(`jacket-front-${side}`, palette.cloth, [side * 0.34 * broad, 3.56, 0.27], [0.3 * broad, 1.08, 0.18], [0, 0, side * -0.06]);
      wedge(`tailored-collar-${side}`, suit || school ? palette.white : palette.trim, [side * 0.16, 4.07, 0.3], [side * 0.38, 3.8, 0.36], 0.24, 0.06, 'body');
      box(`jacket-cuff-${side}`, palette.trim, [side * 0.88 * broad, side < 0 ? 3.2 : 3.12, side < 0 ? 0.62 : 0.2], [0.33, 0.13, 0.3]);
    }
    if (suit || school) {
      wedge('tie', palette.trim, [0, 4, 0.37], [0, 3.36, 0.4], 0.14, 0.055, 'body');
      box('tie-knot', palette.trim, [0, 4.03, 0.36], [0.15, 0.15, 0.07], [0, 0, Math.PI / 4]);
    }
    if (sport) {
      for (const side of [-1, 1]) box(`sport-shorts-${side}`, palette.cloth, [side * 0.25, 2.32, 0], [0.48, 0.67, 0.56]);
      box('sport-chest-stripe', palette.trim, [0, 3.67, 0.37], [1.08 * broad, 0.15, 0.05]);
    }
  }

  // Anime face: rounded jaw, visible ears, sclera, iris, pupils and eyebrows.
  sphere('face', palette.skin, [0, 4.85, 0.035], [0.48, 0.59, 0.41], 'head');
  sphere('chin', palette.skin, [0, 4.49, 0.16], [0.3, 0.21, 0.27], 'head');
  sphere('nose', palette.skin, [0, 4.81, 0.443], [0.055, 0.1, 0.09], 'head');
  box('mouth', '#9d665f', [0, 4.59, 0.398], [0.15, 0.021, 0.018], undefined, 'head');
  for (const side of [-1, 1]) {
    sphere(`ear-${side}`, palette.skin, [side * 0.465, 4.87, 0.035], [0.09, 0.16, 0.105], 'head');
    sphere(`eye-white-${side}`, palette.white, [side * 0.198, 4.96, 0.383], [0.151, 0.097, 0.038], 'head', 'eye');
    sphere(`iris-${side}`, palette.trim, [side * 0.192, 4.965, 0.419], [0.059, 0.082, 0.023], 'head', 'eye');
    sphere(`pupil-${side}`, '#151824', [side * 0.191, 4.968, 0.44], [0.029, 0.055, 0.015], 'head', 'eye');
    sphere(`eye-highlight-${side}`, '#ffffff', [side * 0.191 - 0.015, 4.998, 0.453], [0.014, 0.022, 0.011], 'head', 'eye');
    box(`eyebrow-${side}`, palette.hair, [side * 0.21, 5.092, 0.395], [0.24, 0.035, 0.025], [0, 0, side * -0.12], 'head');
  }

  const hairStyle = id === 'yusei' ? 'swept' : visual.hairStyle;
  if (hairStyle !== 'bald') {
    add('hair-cap', new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.57), palette.hair,
      [0, 4.97, -0.02], [0.52, 0.62, 0.46], undefined, 'hair');
  }
  if (hairStyle === 'star') {
    const isYugi = id === 'yugi' || id === 'atem' || id.includes('yami-yugi');
    const isYuma = id === 'yuma';
    const spikes = isYugi ? 7 : 6 + variant % 3;
    for (let spike = 0; spike < spikes; spike += 1) {
      const angle = -1.34 + spike * 2.68 / (spikes - 1);
      const reach = isYugi ? (spike % 2 ? 1.08 : 1.3) : 0.93 + (spike % 2) * 0.21;
      const tip = [Math.sin(angle) * reach, 5.07 + Math.cos(angle) * reach, -0.14];
      const base = [Math.sin(angle) * 0.29, 5.13 + Math.cos(angle) * 0.2, -0.14];
      wedge(`star-outline-${spike}`, isYugi ? '#a53471' : palette.hairAccent, base, tip, 0.62, 0.43);
      wedge(`star-inner-${spike}`, palette.hair, [base[0], base[1] + 0.015, base[2] + 0.13], [tip[0] * 0.93, tip[1] - 0.06, tip[2] + 0.2], 0.48, 0.19);
    }
    for (let fringe = 0; fringe < 5; fringe += 1) {
      const x = (fringe - 2) * 0.17;
      wedge(`star-fringe-${fringe}`, isYugi ? palette.gold : isYuma ? palette.hairAccent : palette.hair,
        [x * 0.8, 5.48 + (fringe % 2) * 0.11, 0.3], [x * 1.36, 5.05 - (fringe % 2) * 0.12, 0.43], 0.24, 0.13);
    }
  } else if (hairStyle === 'swept' || hairStyle === 'mohawk' || hairStyle === 'short') {
    const yusei = id === 'yusei';
    const joey = id === 'joey';
    const jaden = id === 'jaden';
    const yuya = id === 'yuya';
    const count = hairStyle === 'mohawk' ? 5 : 7;
    for (let lock = 0; lock < count; lock += 1) {
      const x = hairStyle === 'mohawk' ? 0 : (lock - (count - 1) / 2) * 0.14;
      const direction = lock < count / 2 ? -1 : 1;
      const long = hairStyle === 'short' ? 0.17 + variant * 0.005 : yusei ? 0.82 : jaden ? 0.37 : joey ? 0.2 : 0.54 + variant * 0.006;
      const tint = yuya && lock % 2 === 0 ? palette.hairAccent : palette.hair;
      if (hairStyle === 'short' || joey || jaden) {
        const softY = 5.35 + (1 - Math.abs(x)) * (jaden ? 0.14 : 0.055) + variant * 0.004;
        add(`swept-hair-${lock}`, new THREE.SphereGeometry(1, 12, 8), tint,
          [x, softY, -0.05 - lock % 2 * 0.06], [0.23, jaden ? 0.26 : 0.18, 0.36], [0, 0, joey ? -0.2 : direction * -0.23], 'hair');
        if (jaden) wedge(`tousled-hair-tip-${lock}`, tint, [x, 5.33, -0.06], [x + direction * 0.29, 5.42 + long * (1 - Math.abs(x)), -0.15], 0.28, 0.3);
      } else {
        wedge(`swept-hair-${lock}`, tint, [x, 5.22, -0.01],
          [x + direction * long * 0.55, 5.55 + long * (1 - Math.abs(x) * 0.85), -0.16 - lock % 2 * 0.18], 0.36, 0.37);
      }
      if (yusei && lock % 2 === 0) wedge(`gold-hair-streak-${lock}`, palette.hairAccent, [x, 5.26, 0.11], [x + direction * long * 0.42, 5.51 + long * (1 - Math.abs(x)), 0.06], 0.12, 0.07);
    }
    for (let fringe = 0; fringe < 4; fringe += 1) {
      const tint = yuya && fringe % 2 === 0 ? palette.hairAccent : palette.hair;
      wedge(`swept-fringe-${fringe}`, tint,
        [(fringe - 1.5) * 0.22, 5.42, 0.27], [(fringe - 1.5) * 0.26 + (joey ? -0.18 : 0), 5.01 - fringe % 2 * 0.14 - variant * 0.006, 0.37], joey ? 0.39 : 0.3, 0.14);
    }
  } else if (hairStyle === 'helmet') {
    sphere('helmet-shell', palette.hair, [0, 5.06, -0.06], [0.62, 0.68, 0.55], 'hair', 'metal');
    for (const side of [-1, 1]) wedge(`helmet-fin-${side}`, palette.hairAccent, [side * 0.41, 5.1, -0.01], [side * 0.74, 5.84, -0.11], 0.25, 0.18, 'hair', 'metal');
    box('helmet-visor', palette.trim, [0, 4.98, 0.472], [0.85, 0.24, 0.045], undefined, 'head', 'eye');
  } else {
    const bob = hairStyle === 'bob';
    const long = hairStyle === 'long' || hairStyle === 'braided';
    for (const side of [-1, 1]) {
      sphere(`hair-side-${side}`, palette.hair, [side * 0.41, bob ? 4.83 : 4.89, -0.05], [0.23, bob ? 0.63 : 0.53, 0.38], 'hair');
      wedge(`side-fringe-${side}`, palette.hair, [side * 0.35, 5.42, 0.22], [side * 0.48, 4.74, 0.21], 0.27, 0.18);
    }
    for (let fringe = 0; fringe < 5; fringe += 1) wedge(`soft-fringe-${fringe}`, palette.hair,
      [(fringe - 2) * 0.15, 5.45, 0.28], [(fringe - 2) * 0.2, 5.04 - fringe % 2 * 0.13, 0.35], 0.2, 0.11);
    if (long) for (let lock = 0; lock < 7; lock += 1) {
      const x = (lock - 3) * 0.17;
      sphere(`long-hair-lock-${lock}`, lock % 3 === 0 ? palette.hairAccent : palette.hair, [x, 4.18 - (lock % 2) * 0.06, -0.28], [0.15, 1.03 + Math.abs(x) * 0.16 + variant * 0.008, 0.23], 'hair');
    }
    if (hairStyle === 'ponytail' || hairStyle === 'twin-tail' || hairStyle === 'braided') {
      const sides = hairStyle === 'twin-tail' ? [-1, 1] : [0];
      for (const side of sides) {
        const x = side * 0.57;
        sphere(`hair-tie-${side}`, palette.trim, [x, 5.15, -0.4], [0.14, 0.16, 0.15], 'hair');
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 5.1, -0.45), new THREE.Vector3(x + side * 0.25, 4.52, -0.52), new THREE.Vector3(x + side * 0.31, 3.68 - variant * 0.012, -0.24)]);
        add(`falling-tail-${side}`, new THREE.TubeGeometry(curve, 12, 0.2, 7, false), palette.hair, undefined, undefined, undefined, 'hair');
        if (hairStyle === 'braided') for (let braid = 0; braid < 7; braid += 1) sphere(`braid-knot-${braid}`, braid % 2 ? palette.hairAccent : palette.hair, [(braid % 2 ? 0.08 : -0.08), 4.87 - braid * 0.18, -0.46], [0.17, 0.15, 0.19], 'hair');
      }
    }
  }

  function cape() {
    panel('cape-mantle', palette.cloth, [[-0.72 * broad, 4.12], [0.72 * broad, 4.12], [1.13 * broad, 1.39], [0.48, 1.12], [0, 1.44], [-0.48, 1.12], [-1.13 * broad, 1.39]], 0.07);
    for (const side of [-1, 1]) rod(`cape-fold-${side}`, palette.trim, [side * 0.36, 4.05, -0.23], [side * 0.69, 1.5, -0.24], 0.025, 0.012, 'cloth');
  }
  const accessory = visual.accessory;
  if (accessory === 'puzzle' || id === 'atem') {
    ring('millennium-chain', palette.gold, [0, 3.93, 0.23], 0.3, 0.025, [0.2, 0, 0]);
    add('millennium-puzzle', new THREE.ConeGeometry(0.26, 0.43, 3), palette.gold, [0, 3.41, 0.43], [1, 1, 0.66], [Math.PI, 0, 0], 'body', 'metal');
    box('puzzle-eye-mark', '#704820', [0, 3.43, 0.555], [0.13, 0.035, 0.018], undefined, 'body');
    if (id === 'atem' && accessory === 'cape') cape();
  } else if (accessory === 'cape' || accessory === 'wings') {
    if (accessory === 'cape') cape();
    else for (const side of [-1, 1]) {
      panel(`wing-${side}`, palette.trim, [[side * 0.35, 3.77], [side * 1.72, 4.49], [side * 1.56, 3.57], [side * 1.12, 2.8], [side * 0.44, 3.19]], 0.09);
      for (let feather = 0; feather < 4; feather += 1) wedge(`wing-feather-${side}-${feather}`, palette.white, [side * (0.63 + feather * 0.23), 3.58, -0.3], [side * (0.84 + feather * 0.26), 2.97 - feather * 0.05, -0.32], 0.25, 0.12, 'cloth');
    }
  } else if (accessory === 'goggles' || accessory === 'glasses') {
    const goggles = accessory === 'goggles';
    for (const side of [-1, 1]) {
      ring(`eyewear-frame-${side}`, goggles ? palette.dark : palette.metal, [side * 0.2, goggles ? 5.48 : 4.99, goggles ? 0.3 : 0.447], goggles ? 0.16 : 0.14, 0.023, [0, 0, 0], 'head');
      if (goggles) sphere(`goggle-lens-${side}`, '#77d1cf', [side * 0.2, 5.48, 0.305], [0.135, 0.135, 0.03], 'head', 'eye');
    }
    box('eyewear-bridge', palette.dark, [0, goggles ? 5.48 : 4.99, goggles ? 0.32 : 0.461], [0.15, 0.032, 0.031], undefined, 'head');
  } else if (accessory === 'hat') {
    add('hat-crown', new THREE.CylinderGeometry(0.36, 0.49, 0.48, 12), palette.cloth, [0, 5.62, -0.04], undefined, undefined, 'head');
    add('hat-brim', new THREE.CylinderGeometry(0.72, 0.72, 0.065, 16), palette.trim, [0, 5.36, -0.02], undefined, undefined, 'head');
  } else if (accessory === 'headband') {
    box('headband-front', palette.trim, [0, 5.27, 0.383], [0.87, 0.16, 0.058], undefined, 'head');
    for (const side of [-1, 1]) wedge(`headband-tail-${side}`, palette.trim, [side * 0.47, 5.18, -0.36], [side * 0.62, 4.56, -0.42], 0.13, 0.035, 'hair');
  } else if (accessory === 'mask') {
    box('cyber-mask-brow', palette.trim, [0, 5.15, 0.43], [0.81, 0.12, 0.075], undefined, 'head', 'metal');
    for (const side of [-1, 1]) wedge(`cyber-mask-cheek-${side}`, palette.trim, [side * 0.31, 4.83, 0.42], [side * 0.52, 5.17, 0.38], 0.19, 0.075, 'head', 'metal');
  } else if (accessory === 'scarf') {
    ring('scarf-collar', palette.trim, [0, 4.22, 0], 0.28, 0.09, [Math.PI / 2, 0, 0], 'body', 'matte');
    panel('scarf-tail', palette.trim, [[-0.24, 4.12], [0.05, 4.15], [-0.18, 2.99], [-0.48, 3.13]], 0.055);
  } else if (accessory === 'necklace') {
    ring('necklace-chain', palette.gold, [0, 3.98, 0.21], 0.28, 0.019, [0.16, 0, 0]);
    sphere('necklace-jewel', palette.trim, [0, 3.63, 0.35], [0.12, 0.18, 0.055], 'body', 'metal');
  } else if (accessory === 'earpiece') {
    box('duelist-earpiece', palette.metal, [0.51, 4.92, 0], [0.12, 0.23, 0.18], undefined, 'head', 'metal');
    rod('earpiece-microphone', palette.dark, [0.5, 4.84, 0.04], [0.32, 4.65, 0.44], 0.024, 0.024, 'head');
  } else if (accessory === 'staff') {
    rod('ceremonial-staff', palette.gold, [0.9, 1.2, 0.27], [0.9, 5.8, 0.27], 0.055, 0.055, 'body', 'metal');
    add('staff-crown', new THREE.OctahedronGeometry(0.25), palette.trim, [0.9, 5.99, 0.27], undefined, undefined, 'body', 'metal');
  }
  // Pegasus's brushed silver curtain and Kaiba's studded shoulder silhouette.
  if (id === 'pegasus') {
    sphere('pegasus-hidden-eye-lock', palette.hair, [-0.25, 4.79, 0.33], [0.27, 0.54, 0.12], 'hair');
    box('pegasus-bowtie', palette.dark, [0, 4.04, 0.39], [0.31, 0.14, 0.055]);
  }
  if (id === 'kaiba') for (const side of [-1, 1]) {
    box(`kaiba-shoulder-panel-${side}`, palette.cloth, [side * 0.77, 4.18, 0.04], [0.47, 0.2, 0.54], [0, 0, side * -0.13]);
    for (let stud = 0; stud < 3; stud += 1) sphere(`kaiba-shoulder-stud-${side}-${stud}`, palette.metal, [side * 0.78, 4.28, -0.12 + stud * 0.15], [0.047, 0.05, 0.047], 'body', 'metal');
  }
  if (id === 'bochi') {
    sphere('bochi-muzzle', palette.skin, [0, 4.74, 0.43], [0.25, 0.18, 0.19], 'head');
    sphere('bochi-nose', '#333038', [0, 4.81, 0.607], [0.09, 0.065, 0.035], 'head');
    for (const side of [-1, 1]) sphere(`bochi-floppy-ear-${side}`, palette.hair, [side * 0.52, 4.78, -0.015], [0.19, 0.37, 0.14], 'hair');
  }
  if (id === 'nyandestar') for (const side of [-1, 1]) {
    wedge(`nyandestar-cat-ear-${side}`, palette.hair, [side * 0.42, 5.43, -0.08], [side * 0.5, 5.91, -0.06], 0.29, 0.22);
    wedge(`nyandestar-inner-ear-${side}`, palette.trim, [side * 0.42, 5.47, 0.05], [side * 0.5, 5.86, 0.057], 0.18, 0.075);
  }

  // Empty Duel Disk slots are geometry only, with no relationship to cards.
  box('duel-disk-wrist-cuff', palette.metal, [-0.86 * broad, 3.17, 0.52], [0.41, 0.27, 0.4], undefined, 'body', 'metal');
  box('duel-disk-chassis', palette.metal, [-1.18 * broad, 3.23, 0.75], [1.42, 0.13, 0.54], [0.08, 0, 0.12], 'body', 'metal');
  sphere('duel-disk-hub', palette.dark, [-0.8 * broad, 3.3, 0.67], [0.26, 0.13, 0.27], 'body', 'metal');
  for (let slot = 0; slot < 5; slot += 1) box(`empty-duel-disk-slot-${slot}`, '#2c4755', [-1.75 * broad + slot * 0.255, 3.32, 0.78], [0.205, 0.025, 0.36], [0.08, 0, 0.12], 'body', 'metal');
  box('duel-disk-indicator', palette.trim, [-0.8 * broad, 3.43, 0.67], [0.14, 0.025, 0.15], undefined, 'body', 'eye');

  let triangles = 0;
  for (const [key, pieces] of batches) {
    const [stage, material] = key.split(':');
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach(piece => piece.dispose());
    if (!geometry) throw new Error(`Cannot merge duelist geometry: ${key}`);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, materials[material]);
    mesh.name = `duelist-${key.replace(':', '-')}`;
    mesh.castShadow = material !== 'eye';
    mesh.receiveShadow = true;
    stages[stage].add(mesh);
    triangles += geometry.attributes.position.count / 3;
  }
  root.userData.drawCalls = batches.size;
  root.userData.triangles = triangles;
  root.userData.partNames = Object.freeze(root.userData.partNames);
  root.updateMatrixWorld(true);

  function resetPose() {
    body.position.y = 0;
    body.scale.y = 1;
    head.rotation.set(0, 0, 0);
    hair.rotation.set(0, 0, 0);
    cloth.rotation.set(0, 0, 0);
  }
  function update(elapsedSeconds, { reducedMotion: motionPreference = reducedMotion } = {}) {
    if (disposed) return false;
    const elapsed = Number(elapsedSeconds);
    if (motionPreference || !Number.isFinite(elapsed)) { resetPose(); return false; }
    const phase = elapsed + variant * 0.23;
    const energetic = visual.pose === 'energetic' ? 1.35 : visual.pose === 'calm' ? 0.7 : 1;
    const breath = Math.sin(phase * 1.55) * energetic;
    body.position.y = breath * 0.013;
    body.scale.y = 1 + breath * 0.0028;
    head.rotation.y = Math.sin(phase * 0.36) * 0.038;
    head.rotation.z = Math.sin(phase * 0.57) * 0.012;
    hair.rotation.z = Math.sin(phase * 0.73 + 0.3) * 0.008;
    cloth.rotation.x = Math.sin(phase * 0.85) * 0.012;
    cloth.rotation.z = Math.sin(phase * 0.67) * 0.007;
    return true;
  }
  function dispose() {
    if (disposed) return false;
    root.removeFromParent();
    root.traverse(object => object.geometry?.dispose());
    Object.values(materials).forEach(material => material.dispose());
    root.clear();
    disposed = true;
    return true;
  }
  return { group: root, avatarId: id, update, resetPose, dispose, get disposed() { return disposed; } };
}

export default createDuelistAvatarModel;
