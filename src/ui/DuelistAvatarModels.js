import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getDuelistAvatar, DEFAULT_DUELIST_AVATAR_ID } from '../content/DuelistAvatarCatalog.js';
import { createDuelistGestureController } from './DuelistAvatarGestures.js';

const UP = new THREE.Vector3(0, 1, 0);
// These are shape decisions from the retained public character illustrations,
// not measurements of unseen turnaround sheets. Keep them independent of the
// progression catalogue and of every piece of private duel state.
const FACE_DETAILS = Object.freeze({
  yugi: { iris: '#884098', eyeHeight: 0.135, jaw: 0.74 },
  atem: { iris: '#a3449b', eyeHeight: 0.098, tilt: 0.17, jaw: 0.6 },
  kaiba: { iris: '#477fbd', eyeHeight: 0.085, tilt: 0.2, jaw: 0.57 },
  joey: { iris: '#996134', eyeHeight: 0.108, tilt: 0.08, jaw: 0.75 },
  bakura: { iris: '#685274', eyeHeight: 0.12, jaw: 0.67 },
  'yami-bakura': { iris: '#6a4b85', eyeHeight: 0.086, tilt: 0.2, jaw: 0.6 },
  marik: { iris: '#8b6aab', eyeHeight: 0.097, tilt: 0.13, jaw: 0.66 },
  'yami-marik': { iris: '#9563a9', eyeHeight: 0.082, tilt: 0.21, jaw: 0.6 },
  tea: { iris: '#518ec5', eyeHeight: 0.12, jaw: 0.62 },
  mai: { iris: '#7955a5', eyeHeight: 0.098, tilt: 0.1, jaw: 0.6 },
  pegasus: { iris: '#6f557e', eyeHeight: 0.087, jaw: 0.62 },
  jaden: { iris: '#845439', eyeHeight: 0.124, jaw: 0.7 },
  yusei: { iris: '#526eb8', eyeHeight: 0.09, tilt: 0.12, jaw: 0.59 },
  yuma: { iris: '#be3e59', eyeHeight: 0.13, jaw: 0.72 },
  yuya: { iris: '#469477', eyeHeight: 0.123, jaw: 0.7 },
  playmaker: { iris: '#439775', eyeHeight: 0.1, tilt: 0.1, jaw: 0.62 },
  yuga: { iris: '#66a86b', eyeHeight: 0.126, jaw: 0.76 },
  luke: { iris: '#c5536c', eyeHeight: 0.119, jaw: 0.73 },
  romin: { iris: '#578eb9', eyeHeight: 0.13, jaw: 0.62 },
  yudias: { iris: '#58b5ba', eyeHeight: 0.1, tilt: 0.12, jaw: 0.6 },
  zwijo: { iris: '#85609e', eyeHeight: 0.079, tilt: 0.16, jaw: 0.56 }
});

// The retained Oct 13 broadcaster illustrations and licensed figure views
// clarify these costumes without changing the progression catalogue. A later
// figure's alternate shirt is never copied onto Joey's green-jacket appearance.
const MULTIVIEW_COSTUMES = Object.freeze({
  atem: { skin: '#c78d66', cloth: '#f1e8da', cape: '#302d55', legwear: '#c78d66', shoes: '#dcb657' },
  yusei: { shoes: '#695546' }
});

/**
 * Builds a public, texture-free duelist likeness from the character catalogue.
 *
 * The returned { group, update(elapsedSeconds), playGesture(), clearGesture(),
 * getGestureState(), resetPose(), dispose() } owns
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
  const animal = visual.species === 'cat' || visual.species === 'dog';
  const feline = visual.species === 'cat';
  const multiviewCostume = MULTIVIEW_COSTUMES[id] || {};
  const palette = {
    skin: multiviewCostume.skin || visual.skinColor,
    cloth: multiviewCostume.cloth || visual.outfitColor,
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
  root.userData.visualStyle = 'reference-informed-anime-volumes';
  root.userData.fidelityVersion = 2;
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
  let lastModelElapsed = 0;
  let lastMotionReduced = reducedMotion === true;

  function jointForPart(name) {
    if (name.startsWith('duel-disk-') || name.startsWith('empty-duel-disk-slot-')) return 4;
    if (name === 'ceremonial-staff' || name === 'staff-crown') return 7;
    const side = /^(?:shoulder|sleeve|elbow|forearm|hand|finger|thumb|pauldron|jacket-cuff|kaiba-shoulder-panel|kaiba-shoulder-stud)-(-1|1)(?:-|$)/.exec(name);
    if (!side) return 0;
    const right = side[1] === '1';
    if (/^(?:hand|finger|thumb)-/.test(name)) return right ? 7 : 3;
    if (/^(?:forearm|elbow|jacket-cuff)-/.test(name)) return right ? 6 : 2;
    return right ? 5 : 1;
  }

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
    if (stage === 'body') {
      // Rigid weights preserve the original mesh outline, while real nested
      // bone pivots articulate sleeves, forearms, hands and the attached disk.
      const joint = jointForPart(name);
      const indices = new Uint16Array(geometry.attributes.position.count * 4);
      const weights = new Float32Array(indices.length);
      for (let i = 0; i < indices.length; i += 4) { indices[i] = joint; weights[i] = 1; }
      geometry.setAttribute('skinIndex', new THREE.BufferAttribute(indices, 4));
      geometry.setAttribute('skinWeight', new THREE.BufferAttribute(weights, 4));
    }
    const key = `${stage}:${material}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(geometry);
    root.userData.partNames.push(name);
  }
  // Round visible anatomy, but leave small rivets and highlights inexpensive.
  const sphere = (name, tint, position, scale, stage = 'body', material = 'matte') => {
    const small = Math.max(...scale) < 0.13;
    add(name, new THREE.SphereGeometry(1, small ? 12 : 20, small ? 8 : 12), tint, position, scale, undefined, stage, material);
  };
  const box = (name, tint, position, scale, rotation, stage = 'body', material = 'matte') => add(name, new THREE.BoxGeometry(1, 1, 1), tint, position, scale, rotation, stage, material);
  const ring = (name, tint, position, radius, tube = 0.024, rotation = [0, 0, 0], stage = 'body', material = 'metal') => add(name, new THREE.TorusGeometry(radius, tube, 8, 28), tint, position, undefined, rotation, stage, material);
  function rod(name, tint, start, end, radius = 0.12, tipRadius = radius, stage = 'body', material = 'matte') {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const midpoint = a.add(b).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
    const geometry = new THREE.CylinderGeometry(tipRadius, radius, direction.length(), radius < 0.05 ? 8 : 16);
    geometry.applyQuaternion(quaternion);
    add(name, geometry, tint, midpoint.toArray(), undefined, undefined, stage, material);
  }
  function curveStroke(name, tint, points, radius = 0.012, stage = 'body', material = 'matte', segments = 12) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    add(name, new THREE.TubeGeometry(curve, segments, radius, 6, false), tint, undefined, undefined, undefined, stage, material);
  }
  function smoothRadialSeam(geometry, rows, sides) {
    const normals = geometry.attributes.normal;
    for (let row = 0; row < rows; row += 1) {
      const first = row * (sides + 1), last = first + sides;
      const normal = new THREE.Vector3(normals.getX(first) + normals.getX(last), normals.getY(first) + normals.getY(last), normals.getZ(first) + normals.getZ(last)).normalize();
      normals.setXYZ(first, normal.x, normal.y, normal.z);
      normals.setXYZ(last, normal.x, normal.y, normal.z);
    }
  }
  function hairLock(name, tint, base, tip, width, depth, bend = 0.1, controlPoints = null) {
    // A lenticular, curved lock has front/back volume and a tapered point;
    // subdividing an old pyramid would not recover this silhouette.
    const start = new THREE.Vector3(...base), end = new THREE.Vector3(...tip);
    const curve = controlPoints ? new THREE.CatmullRomCurve3([base, ...controlPoints, tip].map(point => new THREE.Vector3(...point))) : null;
    const direction = end.clone().sub(start).normalize();
    let lateral = new THREE.Vector3(direction.y, -direction.x, 0).normalize();
    if (lateral.lengthSq() === 0) lateral = new THREE.Vector3(1, 0, 0);
    const positions = [], indices = [];
    const rings = 7, sides = 8;
    for (let section = 0; section <= rings; section += 1) {
      const t = section / rings;
      const center = curve ? curve.getPoint(t) : start.clone().lerp(end, t);
      if (curve) {
        const tangent = curve.getTangent(t);
        lateral.set(tangent.y, -tangent.x, 0).normalize();
      } else center.z += Math.sin(t * Math.PI) * bend;
      const taper = Math.max(0.004, Math.pow(1 - t, 0.68));
      const swell = 0.75 + 0.42 * Math.sin(t * Math.PI);
      for (let side = 0; side <= sides; side += 1) {
        const angle = side * Math.PI * 2 / sides;
        positions.push(center.x + lateral.x * Math.cos(angle) * width * taper * swell * 0.5,
          center.y + lateral.y * Math.cos(angle) * width * taper * swell * 0.5,
          center.z + Math.sin(angle) * depth * taper * 0.5);
        if (section < rings && side < sides) {
          const a = section * (sides + 1) + side, b = a + sides + 1;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    smoothRadialSeam(geometry, rings + 1, sides);
    add(name, geometry, tint, undefined, undefined, undefined, 'hair');
  }
  function wedge(name, tint, base, tip, width, depth, stage = 'hair', material = 'matte') {
    if (stage === 'hair' && material === 'matte' && !/star-outline|star-inner|animal|headband|helmet/.test(name)) {
      hairLock(name, tint, base, tip, width, depth, name.includes('fringe') ? 0.055 : 0.11);
      return;
    }
    const [x, y, z] = base;
    const vertices = [x - width / 2, y, z + depth / 2, x + width / 2, y, z + depth / 2,
      x + width / 2, y, z - depth / 2, x - width / 2, y, z - depth / 2, ...tip];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4, 0, 3, 2, 0, 2, 1]);
    geometry.computeVertexNormals();
    add(name, geometry, tint, undefined, undefined, undefined, stage, material);
  }
  function panel(name, tint, points, thickness = 0.08, stage = 'cloth', material = 'matte', z = -0.28) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
    add(name, geometry, tint, [0, 0, z], undefined, undefined, stage, material);
  }
  function tailoredVolume(name, tint, contours, depth = 0.34, stage = 'body') {
    const points = contours.map(([radius, y]) => new THREE.Vector2(radius, y));
    add(name, new THREE.LatheGeometry(points, 24), tint, [0, 0, 0], [1, 1, depth], undefined, stage);
  }
  function drapedSurface(name, tint, rows, thickness = 0.045, stage = 'cloth') {
    // Rows give y, left/right bounds, depth and fold amplitude. Both surfaces
    // and their hem are closed: cloth now has a curved back and a visible edge.
    const positions = [], indices = [], columns = 12, stride = columns + 1;
    for (const face of [-1, 1]) for (const [y, left, right, z, folds = 0] of rows) {
      for (let column = 0; column <= columns; column += 1) {
        const t = column / columns;
        positions.push(THREE.MathUtils.lerp(left, right, t), y,
          z + Math.sin(t * Math.PI) * folds + Math.sin(t * Math.PI * 3) * folds * 0.27 + face * thickness * 0.5);
      }
    }
    const faceSize = rows.length * stride;
    for (let row = 0; row < rows.length - 1; row += 1) for (let column = 0; column < columns; column += 1) {
      const a = row * stride + column, b = a + stride;
      indices.push(a, a + 1, b, b, a + 1, b + 1,
        a + faceSize, b + faceSize, a + 1 + faceSize, b + faceSize, b + 1 + faceSize, a + 1 + faceSize);
    }
    const close = (a, b) => indices.push(a, b, a + faceSize, b, b + faceSize, a + faceSize);
    for (let column = 0; column < columns; column += 1) {
      close(column + 1, column);
      close((rows.length - 1) * stride + column, (rows.length - 1) * stride + column + 1);
    }
    for (let row = 0; row < rows.length - 1; row += 1) {
      close(row * stride, (row + 1) * stride);
      close((row + 1) * stride + columns, row * stride + columns);
    }
    // Mirrored garment rows reverse X. Reverse every face, including the hem,
    // so opaque FrontSide materials remain visible from the exterior.
    if (rows[0][2] < rows[0][1]) for (let triangle = 0; triangle < indices.length; triangle += 3) {
      [indices[triangle + 1], indices[triangle + 2]] = [indices[triangle + 2], indices[triangle + 1]];
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    add(name, geometry, tint, undefined, undefined, undefined, stage);
  }
  const broad = visual.build === 'broad' ? 1.2 : visual.build === 'slim' ? 0.88 : 1;
  const skirt = !animal && (visual.outfitStyle === 'robe' || visual.bottomStyle === 'skirt'
    || (!visual.bottomStyle && (visual.outfitStyle === 'dress' || visual.outfitStyle === 'robe' || id === 'mai')));
  const shorts = !animal && (visual.bottomStyle === 'shorts'
    || (!visual.bottomStyle && visual.outfitStyle === 'sport'));
  const robot = visual.outfitStyle === 'mechanical';
  const armor = visual.outfitStyle === 'armor' || robot;
  const legColor = multiviewCostume.legwear || visual.legwearColor || (animal || skirt || shorts ? palette.skin : visual.bottomColor || palette.dark);
  const shoeColor = multiviewCostume.shoes || visual.bootColor || (animal ? palette.skin : visual.outfitStyle === 'sport' ? palette.white : palette.dark);
  const handColor = visual.gloveColor || palette.skin;
  const variant = visual.variant;
  const shortSleeved = ['atem', 'yuya', 'yuma', 'romin', 'luke'].includes(id);

  const skeletonRoot = new THREE.Bone();
  skeletonRoot.name = 'duelist-skeleton-root';
  body.add(skeletonRoot);
  const bones = [skeletonRoot];
  function bone(name, parent, pivot, parentPivot) {
    const joint = new THREE.Bone();
    joint.name = name;
    joint.position.set(pivot[0] - parentPivot[0], pivot[1] - parentPivot[1], pivot[2] - parentPivot[2]);
    parent.add(joint);
    bones.push(joint);
    return joint;
  }
  const origin = [0, 0, 0];
  const leftShoulderPivot = [-0.64 * broad, 4.05, 0];
  const leftElbowPivot = [-0.89 * broad, 3.35, 0.26];
  const leftWristPivot = [-0.88 * broad, 3.12, 0.72];
  const leftShoulder = bone('duelist-left-shoulder', skeletonRoot, leftShoulderPivot, origin);
  const leftElbow = bone('duelist-left-elbow', leftShoulder, leftElbowPivot, leftShoulderPivot);
  const leftWrist = bone('duelist-left-wrist', leftElbow, leftWristPivot, leftElbowPivot);
  const duelDisk = bone('duelist-duel-disk-pivot', leftWrist, [-0.8 * broad, 3.3, 0.67], leftWristPivot);
  const rightShoulderPivot = [0.64 * broad, 4.05, 0];
  const rightElbowPivot = [0.89 * broad, 3.35, 0.03];
  const rightWristPivot = [0.88 * broad, 2.96, 0.22];
  const rightShoulder = bone('duelist-right-shoulder', skeletonRoot, rightShoulderPivot, origin);
  const rightElbow = bone('duelist-right-elbow', rightShoulder, rightElbowPivot, rightShoulderPivot);
  const rightWrist = bone('duelist-right-wrist', rightElbow, rightWristPivot, rightElbowPivot);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const rig = Object.freeze({ leftShoulder, leftElbow, leftWrist, duelDisk, rightShoulder, rightElbow, rightWrist });
  const gestures = createDuelistGestureController({ body, head, hair, cloth, ...rig }, { reducedMotion });

  // Complete anatomy, including separate feet, articulated elbows and fingers.
  for (const side of [-1, 1]) {
    const legX = side * 0.27 * broad;
    rod(`thigh-${side}`, legColor, [legX, 2.57, 0], [legX * 1.08, 1.42, 0.02], skirt ? 0.16 : 0.22, skirt ? 0.14 : 0.18);
    sphere(`knee-${side}`, legColor, [legX * 1.08, 1.43, 0.07], [0.16, 0.18, 0.15]);
    rod(`calf-${side}`, legColor, [legX * 1.08, 1.4, 0.02], [legX * 1.2, 0.4, 0.09], 0.14, 0.18);
    rod(`boot-shaft-${side}`, id === 'atem' ? palette.skin : shoeColor, [legX * 1.2, 0.23, 0.08], [legX * 1.15, id === 'kaiba' ? 1.28 : id === 'yusei' ? 1.13 : skirt ? 0.95 : 0.63, 0.08], id === 'atem' ? 0.14 : 0.2, 0.18);
    sphere(`boot-toe-${side}`, shoeColor, [legX * 1.2, 0.2, 0.29], [animal ? 0.29 : 0.23, 0.17, 0.39]);
    box(`boot-sole-${side}`, animal ? palette.skin : '#303746', [legX * 1.2, 0.085, 0.22], [0.46, 0.08, 0.75]);
    if (armor) {
      box(`shin-armor-${side}`, id === 'playmaker' ? palette.cloth : palette.trim, [legX * 1.13, 0.86, 0.23], [0.3, 0.76, 0.15], undefined, 'body', 'metal');
      sphere(`armored-knee-${side}`, palette.cloth, [legX * 1.08, 1.46, 0.21], [0.23, 0.23, 0.12], 'body', 'metal');
    }
  }
  sphere('pelvis', animal ? palette.skin : palette.dark, [0, 2.62, 0], [0.47 * broad, 0.38, 0.3]);
  if (animal) sphere('tailored-torso', palette.skin, [0, 3.43, 0], [0.62 * broad, 0.81, 0.47]);
  else tailoredVolume('tailored-torso', palette.cloth,
    [[0, 2.69], [0.38 * broad, 2.73], [0.44 * broad, 2.95], [0.46 * broad, 3.23],
      [0.55 * broad, 3.64], [0.6 * broad, 3.91], [0.46 * broad, 4.08], [0.2, 4.2], [0, 4.21]], 0.54);
  if (!animal) {
    box('belt', palette.dark, [0, 2.78, 0], [0.89 * broad, 0.13, 0.63]);
    box('belt-clasp', palette.trim, [0, 2.79, 0.33], [0.19, 0.14, 0.07], undefined, 'body', 'metal');
  }
  rod('neck', palette.skin, [0, 4.07, 0], [0, 4.47, 0], 0.19);

  for (const side of [-1, 1]) {
    const shoulderX = side * 0.64 * broad;
    const elbow = [side * (0.89 * broad), 3.35, side < 0 ? 0.26 : 0.03];
    const wrist = [side * (0.88 * broad), side < 0 ? 3.12 : 2.96, side < 0 ? 0.72 : 0.22];
    sphere(`shoulder-${side}`, animal ? palette.skin : palette.cloth, [shoulderX, 4.04, 0], [0.3, 0.3, 0.3]);
    rod(`sleeve-${side}`, animal || shortSleeved ? palette.skin : palette.cloth, [shoulderX, 4.05, 0], elbow, 0.23, 0.21);
    sphere(`elbow-${side}`, animal || shortSleeved ? palette.skin : palette.cloth, elbow, [0.2, 0.2, 0.2]);
    rod(`forearm-${side}`, animal || shortSleeved || visual.outfitStyle === 'sport' || skirt ? palette.skin : palette.cloth, elbow, wrist, 0.16, 0.18);
    sphere(`hand-${side}`, handColor, wrist, [animal ? 0.24 : 0.18, 0.21, 0.13]);
    for (let finger = 0; finger < 4; finger += 1) {
      const x = wrist[0] + (finger - 1.5) * 0.052;
      const length = finger === 0 || finger === 3 ? 0.13 : 0.17;
      rod(`finger-${side}-${finger}`, handColor, [x, wrist[1] - 0.08, wrist[2] + 0.065], [x, wrist[1] - 0.08 - length, wrist[2] + 0.065], 0.026, 0.022);
      rod(`finger-${side}-${finger}-tip`, handColor, [x, wrist[1] - 0.08 - length, wrist[2] + 0.065], [x, wrist[1] - 0.14 - length, wrist[2] + 0.027], 0.022, 0.015);
    }
    sphere(`thumb-${side}`, handColor, [wrist[0] + side * 0.15, wrist[1] - 0.06, wrist[2] + 0.015], [0.075, 0.11, 0.065]);
    if (armor) sphere(`pauldron-${side}`, id === 'playmaker' ? '#252a3b' : palette.trim, [shoulderX, 4.12, 0], id === 'playmaker' ? [0.33, 0.17, 0.32] : [0.44, 0.28, 0.43], 'body', 'metal');
  }

  // Garment cuts change the outline rather than recolouring a mannequin.
  if (animal) {
    sphere('animal-belly', '#e7ecef', [0, 3.23, 0.36], [0.5 * broad, 0.69, 0.18]);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 2.61, -0.28), new THREE.Vector3(0.55, 2.56, -0.84), new THREE.Vector3(0.9, feline ? 3.65 : 3.09, -0.81), new THREE.Vector3(0.72, feline ? 4.02 : 3.2, -0.56)]);
    add('animal-tail', new THREE.TubeGeometry(curve, 16, feline ? 0.11 : 0.14, 7, false), palette.skin);
  } else if (visual.outfitStyle === 'long-coat') {
    for (const side of [-1, 1]) {
      if (id === 'kaiba') drapedSurface(`long-coat-tail-${side}`, palette.cloth,
        [[3.62, side * 0.12, side * 0.57, -0.31, -0.03], [2.83, side * 0.24, side * 0.63, -0.38, -0.08],
          [2.02, side * 0.3, side * 0.88, -0.44, -0.14], [1.1, side * 0.44, side * 1.15, -0.46, -0.16]], 0.065);
      else panel(`long-coat-tail-${side}`, palette.cloth, [[side * 0.11, 3.6], [side * 0.65, 3.72], [side * 1.04, 1.13], [side * 0.4, 1.02]], 0.09);
      wedge(`raised-coat-collar-${side}`, palette.cloth, [side * 0.43, 4.12, 0.08], [side * 0.51, 4.71, -0.08], 0.39, 0.2, 'body');
      box(`coat-lapel-${side}`, id === 'kaiba' ? palette.cloth : palette.trim, [side * 0.35, 3.81, 0.31], [0.16, 0.66, 0.055], [0, 0, side * -0.28]);
      for (let button = 0; button < 3; button += 1) sphere(`coat-rivet-${side}-${button}`, palette.metal, [side * 0.46, 3.73 - button * 0.25, 0.34], [0.04, 0.04, 0.025], 'body', 'metal');
    }
    box('coat-inner-vest', palette.dark, [0, 3.56, 0.29], [0.5, 0.98, 0.075]);
  } else if (id === 'atem') {
    add('atem-short-tunic', new THREE.CylinderGeometry(0.39 * broad, 0.54 * broad, 0.83, 24), palette.cloth,
      [0, 2.48, 0], [1, 1, 0.78], undefined, 'cloth');
    panel('atem-blue-front-sash', '#779ab2', [[-0.16, 2.92], [0.15, 2.92], [0.29, 2.02], [-0.1, 1.93]], 0.06, 'cloth', 'matte', 0.31);
    for (let band = 0; band < 3; band += 1) ring(`atem-waist-gold-band-${band}`, palette.gold, [0, 2.9 + band * 0.085, 0], 0.37, 0.045, [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      box(`atem-sandal-strap-${side}`, palette.gold, [side * 0.32 * broad, 0.29, 0.31], [0.39, 0.08, 0.26]);
      ring(`atem-anklet-${side}`, palette.gold, [side * 0.31 * broad, 0.57, 0.07], 0.16, 0.043, [Math.PI / 2, 0, 0]);
    }
  } else if (skirt) {
    const long = visual.outfitStyle === 'robe';
    add(long ? 'flowing-robe' : 'pleated-skirt', new THREE.CylinderGeometry(0.4 * broad, (long ? 0.91 : 0.77) * broad, long ? 2.18 : 1.03, 12, 1), long ? palette.cloth : visual.bottomColor || palette.cloth,
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
    if (id === 'playmaker') drapedSurface('segmented-chest-armor', '#232b39',
      [[4.0, -0.39, 0.39, 0.265, 0.09], [3.66, -0.44, 0.44, 0.29, 0.075], [3.3, -0.28, 0.28, 0.27, 0.075]], 0.045, 'body');
    else box('segmented-chest-armor', palette.trim, [0, 3.55, 0.32], [0.95 * broad, 0.73, 0.18], undefined, 'body', 'metal');
    for (let plate = 0; plate < 3; plate += 1) box(`abdominal-armor-${plate}`, palette.cloth, [0, 3.21 - plate * 0.17, 0.34], [0.65 * broad, 0.12, 0.11], undefined, 'body', 'metal');
    if (robot) {
      for (const side of [-1, 1]) box(`mechanical-back-vane-${side}`, palette.trim, [side * 0.63, 3.77, -0.41], [0.3, 1.11, 0.33], [0.12, 0, side * -0.33], 'cloth', 'metal');
      sphere('mechanical-chest-core', '#75e6ff', [0, 3.63, 0.46], [0.13, 0.13, 0.07], 'body', 'eye');
    }
  } else {
    const suit = visual.outfitStyle === 'suit';
    const school = visual.outfitStyle === 'school' || visual.outfitStyle === 'uniform';
    const sport = visual.outfitStyle === 'sport';
    box('visible-inner-shirt', id === 'yugi' ? palette.dark : suit || school ? palette.white : palette.dark, [0, 3.6, 0.29], [0.36, 0.93, 0.07]);
    for (const side of [-1, 1]) {
      box(`jacket-front-${side}`, palette.cloth, [side * 0.34 * broad, 3.56, 0.27], [0.3 * broad, 1.08, 0.18], [0, 0, side * -0.06]);
      wedge(`tailored-collar-${side}`, suit || school ? palette.white : palette.trim, [side * 0.16, 4.07, 0.3], [side * 0.38, 3.8, 0.36], 0.24, 0.06, 'body');
      if (id !== 'romin') box(`jacket-cuff-${side}`, id === 'yuya' ? palette.cloth : id === 'yuma' ? '#427e91' : id === 'luke' ? palette.dark : palette.trim,
        [side * 0.88 * broad, side < 0 ? 3.2 : 3.12, side < 0 ? 0.62 : 0.2], [0.33, 0.13, 0.3]);
    }
    if ((suit || school) && id !== 'yugi' && id !== 'joey' && id !== 'bakura') {
      wedge('tie', palette.trim, [0, 4, 0.37], [0, 3.36, 0.4], 0.14, 0.055, 'body');
      box('tie-knot', palette.trim, [0, 4.03, 0.36], [0.15, 0.15, 0.07], [0, 0, Math.PI / 4]);
    }
    if (sport) {
      box('sport-chest-stripe', palette.trim, [0, 3.67, 0.37], [1.08 * broad, 0.15, 0.05]);
    }
  }
  if (shorts) for (const side of [-1, 1]) box(`sport-shorts-${side}`, visual.bottomColor || palette.cloth, [side * 0.25, 2.32, 0], [0.48, 0.67, 0.56]);
  if (id === 'girag') {
    // Girag's wide, open white shirt exposes his chest, unlike Shoichi's
    // closed undershirt and Dr. Faker's full-length robe.
    panel('girag-open-shirt-chest', palette.skin, [[-0.3, 4.12], [0.3, 4.12], [0.19, 3.34], [-0.19, 3.34]], 0.035, 'body', 'matte', 0.38);
    for (const side of [-1, 1]) box(`girag-open-shirt-lapel-${side}`, palette.cloth, [side * 0.33, 3.84, 0.39], [0.2, 0.76, 0.1], [0, 0, side * -0.2]);
  }

  // Tailoring is visible from the side and behind, including hem thickness,
  // sleeve seams and shoe construction. These reuse the same bounded batches.
  if (!animal) for (const side of [-1, 1]) {
    curveStroke(`boot-side-seam-${side}`, new THREE.Color(shoeColor).multiplyScalar(0.72),
      [[side * (0.27 * broad + 0.16), 0.18, 0.34], [side * (0.27 * broad + 0.16), 0.34, 0.17], [side * (0.27 * broad + 0.13), skirt ? 0.8 : 0.57, 0.12]], 0.012);
    box(`boot-heel-${side}`, shoeColor, [side * 0.324 * broad, 0.13, -0.075], [0.34, 0.16, 0.2]);
    if (!skirt && !shorts && !armor) curveStroke(`trouser-crease-${side}`, new THREE.Color(legColor).multiplyScalar(0.78),
      [[side * 0.27 * broad, 2.52, 0.215], [side * 0.29 * broad, 1.48, 0.183], [side * 0.32 * broad, 0.66, 0.205]], 0.01);
    if (!armor && !shortSleeved) curveStroke(`sleeve-${side}-tailoring-seam`, new THREE.Color(palette.cloth).multiplyScalar(0.7),
      [[side * 0.68 * broad, 4.18, 0.155], [side * 0.83 * broad, 3.82, 0.194], [side * 0.9 * broad, 3.44, side < 0 ? 0.38 : 0.165]], 0.012);
    if (visual.outfitStyle === 'long-coat') curveStroke(`coat-hem-${side}`, new THREE.Color(palette.cloth).multiplyScalar(0.77),
      [[side * 0.45, 1.08, -0.23], [side * 0.73, 1.16, -0.23], [side * 1.02, 1.18, -0.23]], 0.02, 'cloth');
  }
  if (id === 'yugi') {
    for (const side of [-1, 1]) {
      panel(`yugi-high-school-collar-${side}`, palette.white,
        [[side * 0.12, 4.08], [side * 0.2, 4.36], [side * 0.38, 4.13], [side * 0.29, 3.93]], 0.035, 'body', 'matte', 0.32);
      box(`yugi-uniform-shoulder-edge-${side}`, palette.white, [side * 0.49, 4.08, 0.2], [0.22, 0.042, 0.025], [0, 0, side * -0.23]);
    }
    box('yugi-school-belt', palette.white, [0, 2.86, 0.343], [0.73, 0.066, 0.031]);
    drapedSurface('yugi-school-jacket-back-hem', palette.cloth,
      [[3.34, -0.44, 0.44, -0.29, -0.035], [2.81, -0.48, 0.48, -0.33, -0.07], [2.54, -0.65, 0.65, -0.38, -0.13]], 0.06);
    for (const side of [-1, 1]) {
      box(`yugi-belt-side-tab-${side}`, palette.dark, [side * 0.39, 2.81, 0.17], [0.17, 0.3, 0.15], [0, 0, side * -0.15]);
      for (let stud = 0; stud < 3; stud += 1) sphere(`yugi-belt-stud-${side}-${stud}`, palette.metal,
        [side * (0.16 + stud * 0.1), 2.84, 0.373], [0.024, 0.024, 0.012], 'body', 'metal');
    }
  }
  if (id === 'joey') {
    box('joey-white-tee', palette.white, [0, 3.63, 0.368], [0.44, 0.75, 0.045]);
    curveStroke('joey-tee-neckline', palette.white, [[-0.21, 4.05, 0.34], [0, 3.98, 0.38], [0.21, 4.05, 0.34]], 0.035);
  }
  if (id === 'jaden') {
    drapedSurface('jaden-white-back-yoke', palette.white,
      [[4.13, -0.32, 0.32, -0.23, -0.018], [4.0, -0.55, 0.55, -0.26, -0.042], [3.79, -0.39, 0.39, -0.305, -0.035]], 0.025, 'body');
    curveStroke('jaden-yoke-dark-edge', '#682b2e', [[-0.49, 3.97, -0.335], [-0.3, 3.79, -0.362], [0, 3.75, -0.372], [0.3, 3.79, -0.362], [0.49, 3.97, -0.335]], 0.018);
    curveStroke('jaden-back-center-seam', '#892f35', [[0, 3.75, -0.346], [0, 3.26, -0.346], [0, 2.82, -0.408]], 0.01);
    for (const side of [-1, 1]) {
      panel(`jaden-slifer-collar-${side}`, palette.white,
        [[side * 0.04, 4.04], [side * 0.22, 4.3], [side * 0.44, 4.2], [side * 0.35, 3.9]], 0.07, 'body', 'matte', 0.3);
      sphere(`jaden-collar-button-${side}`, '#9c303b', [side * 0.31, 4.07, 0.382], [0.062, 0.069, 0.021]);
      curveStroke(`jaden-jacket-piping-${side}`, '#842b31', [[side * 0.31, 3.97, 0.38], [side * 0.22, 3.34, 0.398], [side * 0.27, 2.94, 0.38]], 0.017);
      drapedSurface(`jaden-flared-jacket-tail-${side}`, palette.cloth,
        [[3.03, side * 0.02, side * 0.42, -0.32, -0.02], [2.8, side * 0.06, side * 0.57, -0.36, -0.07], [2.42, side * 0.2, side * 0.74, -0.42, -0.13]], 0.055);
      box(`jaden-shoe-dark-ankle-strap-${side}`, '#2d2f35', [side * 0.324 * broad, 0.39, 0.22], [0.4, 0.14, 0.37]);
      box(`jaden-shoe-dark-tongue-${side}`, '#2d2f35', [side * 0.324 * broad, 0.29, 0.46], [0.14, 0.04, 0.22], [-0.18, 0, 0]);
    }
  }
  if (id === 'kaiba') {
    drapedSurface('kaiba-continuous-coat-back', palette.cloth,
      [[4.14, -0.47, 0.47, -0.255, -0.028], [3.85, -0.5, 0.5, -0.3, -0.036], [3.4, -0.44, 0.44, -0.33, -0.036], [2.85, -0.38, 0.38, -0.32, -0.035]], 0.05, 'body');
    curveStroke('kaiba-back-waist-seam', '#c5cbd5', [[-0.34, 2.86, -0.355], [0, 2.82, -0.399], [0.34, 2.86, -0.355]], 0.012);
    for (const side of [-1, 1]) {
      panel(`kaiba-red-coat-lining-${side}`, '#97363b',
        [[side * 0.22, 3.31], [side * 0.52, 3.29], [side * 0.9, 1.26], [side * 0.49, 1.13]], 0.035, 'cloth', 'matte', -0.174);
      for (let strap = 0; strap < 3; strap += 1) {
        const y = 3.6 - strap * 0.155;
        box(`forearm-${side}-kaiba-strap-${strap}`, palette.dark, [side * 0.86 * broad, y, side < 0 ? 0.49 : 0.18], [0.38, 0.095, 0.28]);
        box(`forearm-${side}-kaiba-buckle-${strap}`, palette.metal, [side * 1.03 * broad, y, side < 0 ? 0.505 : 0.2], [0.079, 0.078, 0.032], undefined, 'body', 'metal');
      }
    }
    ring('kaiba-card-pendant-chain', '#4d423a', [0, 3.95, 0.21], 0.24, 0.013, [0.3, 0, 0], 'body', 'matte');
    box('kaiba-card-pendant', '#78513b', [0, 3.53, 0.414], [0.22, 0.32, 0.04], [0, 0, -0.15]);
    box('kaiba-card-pendant-inset', '#332d35', [0, 3.53, 0.438], [0.13, 0.23, 0.009], [0, 0, -0.15]);
    for (let stud = 0; stud < 5; stud += 1) sphere(`kaiba-back-collar-rivet-${stud}`, palette.metal,
      [(stud - 2) * 0.15, 4.49, -0.285], [0.041, 0.041, 0.028], 'body', 'metal');
    drapedSurface('kaiba-raised-back-collar', palette.cloth,
      [[4.2, -0.42, 0.42, -0.24, -0.035], [4.51, -0.38, 0.38, -0.235, -0.052]], 0.08, 'body');
    for (const side of [-1, 1]) for (let strap = 0; strap < 2; strap += 1) {
      const y = 0.89 + strap * 0.3;
      box(`kaiba-boot-strap-${side}-${strap}`, '#354366', [side * 0.31 * broad, y, 0.17], [0.41, 0.09, 0.24], [0, 0, side * -0.08]);
      box(`kaiba-boot-strap-buckle-${side}-${strap}`, palette.metal, [side * 0.47 * broad, y, 0.22], [0.07, 0.08, 0.06], undefined, 'body', 'metal');
    }
  }

  // A tapered jaw and almond-shaped lids replace the stacked round balls. The
  // additional vertices describe cheek, temple and chin contours, rather than
  // merely subdividing the original mannequin.
  const faceDetails = FACE_DETAILS[id] || {};
  const eyeHeight = faceDetails.eyeHeight || (visual.height < 1 ? 0.12 : visual.pose === 'confident' ? 0.095 : 0.108);
  const eyeTilt = faceDetails.tilt || (visual.pose === 'confident' ? 0.1 : 0.025);
  const jaw = faceDetails.jaw || (broad > 1 ? 0.83 : visual.height < 1 ? 0.75 : 0.65);
  if (animal) {
    sphere('face', palette.skin, [0, 4.85, 0.035], [0.61, 0.59, 0.41], 'head');
    sphere('chin', palette.skin, [0, 4.49, 0.16], [0.41, 0.21, 0.27], 'head');
  } else {
    const contours = [[4.32, 0.035, 0.09], [4.39, 0.18 * jaw, 0.21], [4.49, 0.35 * jaw, 0.29],
      [4.63, 0.41, 0.355], [4.84, 0.46, 0.4], [5.04, 0.455, 0.405],
      [5.24, 0.43, 0.36], [5.42, 0.33, 0.26], [5.5, 0.15, 0.13], [5.52, 0.001, 0.001]];
    const positions = [], indices = [], sides = 32;
    contours.forEach(([y, width, depth], row) => {
      for (let side = 0; side <= sides; side += 1) {
        const angle = side / sides * Math.PI * 2;
        positions.push(Math.sin(angle) * width, y, Math.cos(angle) * depth + 0.025);
        if (row < contours.length - 1 && side < sides) {
          const a = row * (sides + 1) + side, b = a + sides + 1;
          indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    smoothRadialSeam(geometry, contours.length, sides);
    add('face', geometry, palette.skin, undefined, undefined, undefined, 'head');
    sphere('chin', palette.skin, [0, 4.405, 0.145], [0.115, 0.07, 0.092], 'head');
  }
  sphere('nose', animal ? '#30313b' : palette.skin, [0, 4.79, animal ? 0.65 : 0.444], [animal ? 0.08 : 0.035, animal ? 0.045 : 0.092, animal ? 0.04 : 0.057], 'head');
  curveStroke('mouth', '#8b5353', [[-0.077, 4.57, 0.345], [0, 4.557, 0.363], [0.077, 4.57, 0.345]], 0.009, 'head', 'matte', 8);
  function eyeSurface(name, tint, side, size, z) {
    const shape = new THREE.Shape();
    const w = 0.152 * size, h = eyeHeight * size;
    shape.moveTo(-w, -side * eyeTilt * w);
    shape.quadraticCurveTo(-w * 0.5, h * 0.94, w * 0.23, h * 0.78);
    shape.quadraticCurveTo(w * 0.73, h * 0.52, w, side * eyeTilt * w);
    shape.quadraticCurveTo(w * 0.42, -h * 0.8, -w * 0.25, -h * 0.65);
    shape.quadraticCurveTo(-w * 0.73, -h * 0.43, -w, -side * eyeTilt * w);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.009, curveSegments: 10, bevelEnabled: false });
    add(name, geometry, tint, [side * 0.204, 4.962, z], undefined, [0, side * 0.13, 0], 'head', 'eye');
  }
  for (const side of [-1, 1]) {
    sphere(`ear-${side}`, palette.skin, [side * 0.465, 4.87, 0.035], [0.09, 0.16, 0.105], 'head');
    sphere(`ear-concha-${side}`, new THREE.Color(palette.skin).multiplyScalar(0.8), [side * 0.49, 4.87, 0.105], [0.036, 0.094, 0.014], 'head');
    if (animal) sphere(`eye-white-${side}`, palette.white, [side * 0.198, 4.96, 0.383], [0.151, eyeHeight, 0.038], 'head', 'eye');
    else {
      eyeSurface(`eye-lid-outline-${side}`, '#25212a', side, 1.12, 0.403);
      eyeSurface(`eye-white-${side}`, palette.white, side, 1, 0.416);
    }
    sphere(`iris-${side}`, faceDetails.iris || palette.trim, [side * 0.198, 4.966, 0.442], [0.057, eyeHeight * 0.77, 0.012], 'head', 'eye');
    sphere(`pupil-${side}`, '#151824', [side * 0.198, 4.967, 0.453], [0.026, eyeHeight * 0.57, 0.009], 'head', 'eye');
    sphere(`eye-highlight-${side}`, '#ffffff', [side * 0.198 - 0.016, 4.995, 0.462], [0.012, 0.018, 0.007], 'head', 'eye');
    curveStroke(`eyebrow-${side}`, palette.hair, [[side * 0.083, 5.1 - eyeTilt * 0.1, 0.403], [side * 0.21, 5.118, 0.399], [side * 0.338, 5.11 + eyeTilt * 0.1, 0.367]], 0.017, 'head', 'matte', 8);
  }

  const hairStyle = animal ? 'bald' : id === 'yusei' ? 'swept' : visual.hairStyle;
  if (hairStyle !== 'bald') {
    // The former complete hemisphere crossed both eyes as an opaque mask.
    // Open the front hairline while retaining the lower scalp at the back;
    // individual fringe locks supply the character's actual forehead shape.
    const cap = new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.57);
    const positions = cap.attributes.position;
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const front = Math.max(0, positions.getZ(vertex));
      const y = positions.getY(vertex);
      const hairline = (5.13 - 4.97) / 0.62;
      if (front > 0) positions.setY(vertex, y + Math.max(0, hairline - y) * Math.min(1, front * 3));
    }
    cap.computeVertexNormals();
    add('hair-cap', cap, palette.hair,
      [0, 4.97, -0.02], [0.52, 0.62, 0.46], undefined, 'hair');
  }
  if (hairStyle === 'star') {
    const isYugi = id === 'yugi' || id === 'atem' || id.includes('yami-yugi');
    const isYuma = id === 'yuma';
    const spikes = isYugi ? 7 : 6 + variant % 3;
    if (isYugi) {
      // One filled, extruded star silhouette retains the black mass and the
      // magenta edge seen in the artwork; separate narrow pyramids looked like
      // antlers and left unintended holes between the characteristic points.
      const outline = [[-1.2, 5.2], [-0.88, 5.96], [-0.36, 5.72], [0.06, 6.35],
        [0.38, 5.72], [0.93, 6.0], [0.87, 5.5], [1.2, 5.32], [0.81, 5.13],
        [1.01, 4.86], [0.47, 5.01], [0.34, 4.75], [-0.02, 4.94], [-0.4, 4.76],
        [-0.5, 5.02], [-1.02, 4.9], [-0.78, 5.18]];
      panel('star-outline-0', visual.hairOutlineColor || '#a53471', outline, 0.2, 'hair', 'matte', -0.34);
      panel('star-inner-0', palette.hair, outline.map(([x, y]) => [x * 0.925, 5.2 + (y - 5.2) * 0.925]), 0.16, 'hair', 'matte', -0.128);
    } else for (let spike = 0; spike < spikes; spike += 1) {
      const angle = -1.34 + spike * 2.68 / (spikes - 1);
      const reach = isYugi ? (spike % 2 ? 1.08 : 1.3) : 0.93 + (spike % 2) * 0.21;
      const tip = [Math.sin(angle) * reach, 5.07 + Math.cos(angle) * reach, -0.14];
      const base = [Math.sin(angle) * 0.29, 5.13 + Math.cos(angle) * 0.2, -0.14];
      wedge(`star-outline-${spike}`, visual.hairOutlineColor || (isYugi ? '#a53471' : isYuma ? palette.hair : palette.hairAccent), base, tip, 0.62, 0.43);
      wedge(`star-inner-${spike}`, isYuma && spike > 1 && spike < 5 ? palette.hairAccent : palette.hair,
        [base[0], base[1] + 0.015, base[2] + 0.13], [tip[0] * 0.93, tip[1] - 0.06, tip[2] + 0.2], 0.48, 0.19);
    }
    for (let fringe = 0; fringe < 5; fringe += 1) {
      const x = (fringe - 2) * 0.17;
      wedge(`star-fringe-${fringe}`, isYugi ? palette.gold : isYuma || id === 'yudias' || id === 'playmaker' || id === 'yuga' ? palette.hairAccent : palette.hair,
        [x * 0.8, 5.48 + (fringe % 2) * 0.11, 0.3],
        [x * (isYugi ? 1.46 : 1.36), isYugi && (fringe === 0 || fringe === 4) ? 4.61 : 5.05 - (fringe % 2) * 0.12, 0.43],
        isYugi ? 0.27 : 0.24, isYugi ? 0.18 : 0.13);
    }
    if (isYugi) for (const side of [-1, 1]) {
      hairLock(`gold-fringe-ridge-${side}`, '#f4d56d', [side * 0.18, 5.52, 0.405], [side * 0.12, 5.0, 0.51], 0.055, 0.033, 0.025);
      hairLock(`gold-temple-lock-${side}`, palette.gold, [side * 0.36, 5.28, 0.27], [side * 0.43, 4.65, 0.31], 0.17, 0.12, 0.055);
    }
    if (isYugi) {
      // The licensed rear view shows actual raised, magenta-backed locks, not
      // a second front fringe pasted onto a flat star silhouette.
      const rearLocks = [[-0.85, 5.91, -0.33], [-0.35, 5.76, -0.59], [0.055, 6.23, -0.39],
        [0.43, 5.76, -0.55], [0.9, 5.97, -0.3], [-0.84, 5.07, -0.44], [0.88, 5.17, -0.4]];
      rearLocks.forEach((tip, lock) => hairLock(`yugi-rear-star-lock-${lock}`, visual.hairOutlineColor || '#a53471',
        [tip[0] * 0.2, 5.24, -0.32], tip, 0.48, 0.32, -0.12));
      hairLock('yugi-nape-lock', visual.hairOutlineColor || '#a53471', [0, 5.18, -0.42], [0, 4.82, -0.35], 0.39, 0.22, -0.12);
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
      const tint = palette.hair;
      if (id === 'kaiba') {
        hairLock(`swept-hair-${lock}`, tint, [x, 5.51 - Math.abs(x) * 0.22, -0.03],
          [x + direction * 0.1, 5.08 - (1 - Math.abs(x)) * 0.17, 0.4 - Math.abs(x) * 0.1], 0.26, 0.19, 0.15);
      } else if (joey) {
        hairLock(`swept-hair-${lock}`, tint, [x + 0.12, 5.47 - Math.abs(x) * 0.15, -0.07],
          [x - 0.23, 5.2 + Math.abs(x) * 0.1, 0.24], 0.33, 0.17, 0.09);
      } else if (hairStyle === 'short' || jaden) {
        const softY = 5.35 + (1 - Math.abs(x)) * (jaden ? 0.14 : 0.055) + variant * 0.004;
        add(`swept-hair-${lock}`, new THREE.SphereGeometry(1, 20, 12), tint,
          [x, softY, -0.05 - lock % 2 * 0.06], [0.23, jaden ? 0.26 : 0.18, 0.36], [0, 0, joey ? -0.2 : direction * -0.23], 'hair');
        if (jaden) wedge(`tousled-hair-tip-${lock}`, tint, [x, 5.33, -0.06], [x + direction * 0.29, 5.42 + long * (1 - Math.abs(x)), -0.15], 0.28, 0.3);
      } else {
        const tips = [[-1, 5.03, -0.12], [-0.85, 5.48, -0.2], [-0.52, 5.94, -0.24], [0, 5.63, -0.2], [0.52, 5.94, -0.24], [0.85, 5.48, -0.2], [1, 5.03, -0.12]];
        wedge(`swept-hair-${lock}`, tint, [x, 5.22, -0.01], yusei ? tips[lock] :
          [x + direction * long * 0.55, 5.55 + long * (1 - Math.abs(x) * 0.85), -0.16 - lock % 2 * 0.18], yusei ? 0.46 : 0.36, yusei ? 0.3 : 0.37);
      }
      if (yusei && lock % 2 === 0) {
        const tips = [[-0.94, 5.06, 0.014], [], [-0.49, 5.86, -0.076], [], [0.49, 5.86, -0.076], [], [0.94, 5.06, 0.014]];
        wedge(`gold-hair-streak-${lock}`, palette.hairAccent, [x, 5.26, 0.13], tips[lock], 0.11, 0.047);
      }
    }
    for (let fringe = 0; fringe < 4; fringe += 1) {
      const tint = yuya ? palette.hairAccent : palette.hair;
      wedge(`swept-fringe-${fringe}`, tint,
        [joey ? 0.22 + (fringe - 1.5) * 0.17 : (fringe - 1.5) * 0.22, 5.42, 0.27],
        [joey ? -0.48 + fringe * 0.23 : (fringe - 1.5) * 0.26, id === 'kaiba' ? 4.96 + Math.abs(fringe - 1.5) * 0.1 : joey ? 4.96 + fringe * 0.065 : 5.01 - fringe % 2 * 0.14 - variant * 0.006, 0.4],
        joey ? 0.42 : 0.3, joey ? 0.09 : 0.14);
    }
    if (id === 'kaiba') for (let lock = 0; lock < 9; lock += 1) {
      const x = (lock - 4) * 0.083;
      hairLock(`kaiba-combed-fringe-${lock}`, lock % 2 ? '#704b30' : palette.hair,
        [x - 0.04, 5.42, 0.28], [x + 0.03, 4.94 + Math.abs(x) * 0.3, 0.428], 0.086, 0.025, 0.04);
    }
    if (id === 'kaiba') for (let lock = 0; lock < 7; lock += 1) {
      const x = (lock - 3) * 0.105;
      hairLock(`kaiba-combed-nape-${lock}`, lock % 2 ? '#704b30' : palette.hair,
        [x, 5.4 - Math.abs(x) * 0.22, -0.25], [x * 0.85, 4.72 + Math.abs(x) * 0.23, -0.23], 0.15, 0.105, -0.16);
    }
    if (jaden) for (const side of [-1, 1]) {
      hairLock(`jaden-orange-crown-${side}`, palette.hairAccent, [side * 0.05, 5.53, 0.04], [side * 0.31, 5.25, 0.33], 0.33, 0.13, 0.12);
      hairLock(`jaden-cheek-lock-${side}`, palette.hair, [side * 0.43, 5.09, -0.035], [side * 0.47, 4.57, 0.16], 0.25, 0.2, 0.08);
      for (let lock = 0; lock < 3; lock += 1) hairLock(`jaden-rear-flare-${side}-${lock}`, palette.hair,
        [side * 0.12, 5.46 - lock * 0.19, -0.24], [side * (0.71 - lock * 0.06), 5.65 - lock * 0.27, -0.27 - lock * 0.04], 0.43 - lock * 0.05, 0.3, -0.12);
      hairLock(`jaden-nape-tip-${side}`, palette.hair, [side * 0.21, 4.94, -0.35], [side * 0.22, 4.62, -0.24], 0.25, 0.19, -0.1);
    }
    if (joey) for (const side of [-1, 1]) hairLock(`joey-back-lock-${side}`, palette.hair,
      [side * 0.39, 5.24, -0.28], [side * 0.59, 4.8, -0.1], 0.33, 0.21, -0.08);
    if (joey) for (let lock = 0; lock < 5; lock += 1) {
      const x = (lock - 2) * 0.16;
      hairLock(`joey-layered-nape-${lock}`, palette.hair, [x + 0.12, 5.32, -0.23],
        [x - 0.15, 4.76 + Math.abs(x) * 0.18, -0.21], 0.3, 0.14, -0.13);
    }
    if (yusei) {
      for (const side of [-1, 1]) for (let lock = 0; lock < 2; lock += 1) hairLock(`yusei-rear-spike-${side}-${lock}`, palette.hair,
        [side * 0.22, 5.32 - lock * 0.15, -0.23], [side * (0.68 + lock * 0.1), 5.6 - lock * 0.38, -0.42], 0.38, 0.28, -0.12);
      for (let lock = 0; lock < 3; lock += 1) hairLock(`yusei-nape-lock-${lock}`, palette.hair,
        [(lock - 1) * 0.17, 5.25, -0.31], [(lock - 1) * 0.14 - 0.04, 4.7 + lock % 2 * 0.13, -0.22], 0.24, 0.19, -0.19);
    }
  } else if (hairStyle === 'helmet') {
    sphere('helmet-shell', palette.hair, [0, 5.06, -0.06], [0.62, 0.68, 0.55], 'hair', 'metal');
    for (const side of [-1, 1]) wedge(`helmet-fin-${side}`, palette.hairAccent, [side * 0.41, 5.1, -0.01], [side * 0.74, 5.84, -0.11], 0.25, 0.18, 'hair', 'metal');
    box('helmet-visor', palette.trim, [0, 4.98, 0.472], [0.85, 0.24, 0.045], undefined, 'head', 'eye');
  } else if (hairStyle !== 'bald') {
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
      const tipY = 3.15 - lock % 2 * 0.06 - Math.abs(x) * 0.16 - variant * 0.008;
      hairLock(`long-hair-lock-${lock}`, id !== 'zwijo' && lock % 3 === 0 ? palette.hairAccent : palette.hair,
        [x, 5.1, -0.32], [x + (lock % 2 ? 0.08 : -0.08), tipY, -0.3], 0.36, 0.32, -0.1,
        [[x + (lock % 2 ? 0.09 : -0.09), 4.37, -0.49], [x - (lock % 2 ? 0.08 : -0.08), 3.68, -0.39]]);
      if (id === 'zwijo') sphere(`zwijo-purple-hair-tip-${lock}`, palette.hairAccent, [x, 3.23 - (lock % 2) * 0.06, -0.28], [0.151, 0.26, 0.233], 'hair');
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
  if (id === 'mai') for (const side of [-1, 1]) {
    hairLock(`mai-curl-${side}`, palette.hair, [side * 0.34, 5.36, 0.03], [side * 0.5, 3.66, 0.12], 0.37, 0.23, 0,
      [[side * 0.71, 4.87, 0.07], [side * 0.52, 4.42, 0.22], [side * 0.78, 4.1, 0.01]]);
    hairLock(`mai-crown-wave-${side}`, '#f0d987', [side * 0.03, 5.43, 0.27], [side * 0.47, 5.08, 0.38], 0.23, 0.12, 0.1,
      [[side * 0.32, 5.66, 0.23], [side * 0.4, 5.3, 0.38]]);
  }

  function cape(tint = palette.cloth) {
    // The cape sits behind both torso and coat tails. Separate depth avoids
    // coplanar surfaces flickering through each other when viewed from behind.
    if (id === 'atem') {
      drapedSurface('cape-mantle', multiviewCostume.cape,
        [[4.22, -0.6, 0.6, -0.32, -0.045], [3.87, -0.71, 0.71, -0.43, -0.11], [3.03, -0.74, 0.74, -0.5, -0.12],
          [2.11, -0.84, 0.84, -0.57, -0.2], [1.34, -0.93, 0.93, -0.6, -0.19]], 0.06);
      for (const side of [-1, 1]) curveStroke(`cape-fold-${side}`, '#242544',
        [[side * 0.28, 4.11, -0.409], [side * 0.38, 3.47, -0.665], [side * 0.62, 1.42, -0.77]], 0.016, 'cloth');
    } else {
      panel('cape-mantle', tint, [[-0.72 * broad, 4.12], [0.72 * broad, 4.12], [1.13 * broad, 1.39], [0.48, 1.12], [0, 1.44], [-0.48, 1.12], [-1.13 * broad, 1.39]], 0.07, 'cloth', 'matte', -0.48);
      for (const side of [-1, 1]) rod(`cape-fold-${side}`, id === 'yudias' ? palette.gold : palette.trim, [side * 0.36, 4.05, -0.5], [side * 0.69, 1.5, -0.5], 0.025, 0.012, 'cloth');
    }
  }
  function addAccessory(accessory, accessoryTint = visual.accessoryColor) {
    if (accessory === 'puzzle') {
      ring('millennium-chain', palette.gold, [0, 3.93, 0.23], 0.3, 0.025, [0.2, 0, 0]);
      add('millennium-puzzle', new THREE.ConeGeometry(0.29, 0.43, 4), palette.gold, [0, 3.41, 0.43], [1, 1, 0.85], [Math.PI, Math.PI / 4, 0], 'body', 'metal');
      for (const side of [-1, 1]) curveStroke(`millennium-chain-drop-${side}`, palette.gold,
        [[side * 0.21, 4.18, 0.26], [side * 0.16, 3.87, 0.36], [side * 0.05, 3.63, 0.45]], 0.022, 'body', 'metal');
      ring('puzzle-eye-outline', '#704820', [0, 3.48, 0.571], 0.067, 0.012, [0, 0, 0], 'body', 'matte');
      sphere('puzzle-eye-mark', '#704820', [0, 3.48, 0.584], [0.017, 0.025, 0.01]);
      for (const side of [-1, 1]) rod(`puzzle-eye-wing-${side}`, '#704820', [side * 0.07, 3.48, 0.569], [side * 0.13, 3.51, 0.55], 0.012, 0.008);
      curveStroke('puzzle-eye-teardrop', '#704820', [[0.012, 3.43, 0.57], [0.027, 3.39, 0.558], [0.063, 3.405, 0.544]], 0.009);
    } else if (accessory === 'cape' || accessory === 'wings') {
      if (accessory === 'cape') cape(accessoryTint || palette.cloth);
      else for (const side of [-1, 1]) {
        panel(`wing-${side}`, palette.trim, [[side * 0.35, 3.77], [side * 1.72, 4.49], [side * 1.56, 3.57], [side * 1.12, 2.8], [side * 0.44, 3.19]], 0.09);
        for (let feather = 0; feather < 4; feather += 1) wedge(`wing-feather-${side}-${feather}`, palette.white, [side * (0.63 + feather * 0.23), 3.58, -0.3], [side * (0.84 + feather * 0.26), 2.97 - feather * 0.05, -0.32], 0.25, 0.12, 'cloth');
      }
    } else if (accessory === 'goggles' || accessory === 'glasses') {
      const goggles = accessory === 'goggles';
      if (id === 'yuma') {
        ring('yuma-duel-gazer-frame', '#d9b651', [0.21, 4.994, 0.452], 0.176, 0.028, [0, 0, 0], 'head');
        sphere('yuma-duel-gazer-lens', '#64b894', [0.21, 4.994, 0.458], [0.146, 0.144, 0.018], 'head', 'eye');
        box('yuma-duel-gazer-temple', '#d9b651', [0.42, 5.015, 0.283], [0.16, 0.088, 0.36], undefined, 'head', 'metal');
      } else for (const side of [-1, 1]) {
        ring(`eyewear-frame-${side}`, id === 'yuya' ? palette.gold : goggles ? palette.dark : palette.metal, [side * 0.2, goggles ? 5.48 : 4.99, goggles ? 0.3 : 0.447], goggles ? 0.16 : 0.14, 0.023, [0, 0, 0], 'head');
        if (goggles) sphere(`goggle-lens-${side}`, '#77d1cf', [side * 0.2, 5.48, 0.305], [0.135, 0.135, 0.03], 'head', 'eye');
      }
      if (id !== 'yuma') box('eyewear-bridge', palette.dark, [0, goggles ? 5.48 : 4.99, goggles ? 0.32 : 0.461], [0.15, 0.032, 0.031], undefined, 'head');
    } else if (accessory === 'hat') {
      add('hat-crown', new THREE.CylinderGeometry(0.36, 0.49, 0.48, 12), accessoryTint || palette.cloth, [0, 5.62, -0.04], undefined, undefined, 'head');
      add('hat-brim', new THREE.CylinderGeometry(0.72, 0.72, 0.065, 16), accessoryTint || palette.trim, [0, 5.36, -0.02], undefined, undefined, 'head');
    } else if (accessory === 'headband') {
      box('headband-front', accessoryTint || palette.trim, [0, 5.27, 0.383], [0.87, 0.16, 0.058], undefined, 'head');
      for (const side of [-1, 1]) wedge(`headband-tail-${side}`, accessoryTint || palette.trim, [side * 0.47, 5.18, -0.36], [side * 0.62, 4.56, -0.42], 0.13, 0.035, 'hair');
    } else if (accessory === 'mask') {
      box('cyber-mask-brow', palette.trim, [0, 5.15, 0.43], [0.81, 0.12, 0.075], undefined, 'head', 'metal');
      for (const side of [-1, 1]) wedge(`cyber-mask-cheek-${side}`, palette.trim, [side * 0.31, 4.83, 0.42], [side * 0.52, 5.17, 0.38], 0.19, 0.075, 'head', 'metal');
    } else if (accessory === 'scarf') {
      ring('scarf-collar', accessoryTint || palette.trim, [0, 4.22, 0], 0.28, 0.09, [Math.PI / 2, 0, 0], 'body', 'matte');
      panel('scarf-tail', accessoryTint || palette.trim, [[-0.24, 4.12], [0.05, 4.15], [-0.18, 2.99], [-0.48, 3.13]], 0.055);
    } else if (accessory === 'necklace') {
      ring('necklace-chain', palette.gold, [0, 3.98, 0.21], 0.28, 0.019, [0.16, 0, 0]);
      if (id === 'bakura' || id === 'yami-bakura') {
        ring('bakura-millennium-ring', palette.gold, [0, 3.48, 0.427], 0.22, 0.031, [0, 0, 0]);
        wedge('bakura-ring-triangle', palette.gold, [0, 3.39, 0.43], [0, 3.68, 0.43], 0.28, 0.038, 'body', 'metal');
        for (let point = 0; point < 5; point += 1) {
          const angle = Math.PI * 0.13 + point * Math.PI * 0.185;
          add(`bakura-ring-pointer-${point}`, new THREE.ConeGeometry(0.042, 0.23, 8), palette.gold,
            [Math.cos(angle) * 0.21, 3.26 - Math.sin(angle) * 0.08, 0.429], undefined, [Math.PI, 0, 0], 'body', 'metal');
        }
        box('bakura-ring-eye', '#694721', [0, 3.53, 0.458], [0.084, 0.035, 0.012]);
      } else if (id === 'yuma') {
        box('yuma-emperor-key-head', '#c1b8ba', [0, 3.69, 0.37], [0.14, 0.23, 0.06], undefined, 'body', 'metal');
        rod('yuma-emperor-key-stem', '#c1b8ba', [0, 3.56, 0.38], [0, 3.27, 0.38], 0.038, 0.038, 'body', 'metal');
        for (let tooth = 0; tooth < 2; tooth += 1) box(`yuma-emperor-key-tooth-${tooth}`, '#c1b8ba', [0.054, 3.3 + tooth * 0.072, 0.38], [0.08, 0.03, 0.055], undefined, 'body', 'metal');
      } else sphere('necklace-jewel', palette.trim, [0, 3.63, 0.35], [0.12, 0.18, 0.055], 'body', 'metal');
    } else if (accessory === 'earpiece') {
      box('duelist-earpiece', accessoryTint || palette.metal, [0.51, 4.92, 0], [0.12, 0.23, 0.18], undefined, 'head', 'metal');
      rod('earpiece-microphone', palette.dark, [0.5, 4.84, 0.04], [0.32, 4.65, 0.44], 0.024, 0.024, 'head');
    } else if (accessory === 'staff') {
      rod('ceremonial-staff', palette.gold, [0.9, 1.2, 0.27], [0.9, 5.8, 0.27], 0.055, 0.055, 'body', 'metal');
      add('staff-crown', new THREE.OctahedronGeometry(0.25), palette.trim, [0.9, 5.99, 0.27], undefined, undefined, 'body', 'metal');
    }
  }
  if (!(animal && id === 'bochi' && visual.accessory === 'necklace')) addAccessory(visual.accessory);
  if (visual.secondaryAccessory && visual.secondaryAccessory !== visual.accessory) addAccessory(visual.secondaryAccessory, visual.secondaryAccessoryColor);
  if (id === 'atem' && visual.accessory !== 'puzzle' && visual.secondaryAccessory !== 'puzzle') addAccessory('puzzle');
  if (visual.headdress === 'helmet' && hairStyle !== 'helmet') {
    const helmetColor = visual.accessoryColor || palette.dark;
    if (id === 'playmaker') panel('headgear-helmet', helmetColor,
      [[-0.44, 5.34], [-0.51, 5.72], [-0.15, 5.59], [0.27, 6.12], [0.19, 5.65], [0.42, 5.35], [0.05, 5.24]], 0.095, 'head', 'metal', 0.17);
    else sphere('headgear-helmet', helmetColor, [0, 5.27, -0.04], [0.55, 0.26, 0.47], 'head', 'metal');
    box('headgear-forehead-band', helmetColor, [0, 5.24, 0.377], [0.96, 0.14, 0.1], undefined, 'head', 'metal');
    for (const side of [-1, 1]) box(`headgear-temple-${side}`, helmetColor, [side * 0.5, 5.04, 0.09], [0.16, 0.43, 0.19], undefined, 'head', 'metal');
  } else if (visual.headdress === 'hat' && visual.accessory !== 'hat' && visual.secondaryAccessory !== 'hat') addAccessory('hat');
  else if (visual.headdress === 'headband' && visual.accessory !== 'headband' && visual.secondaryAccessory !== 'headband') addAccessory('headband');
  // Pegasus's brushed silver curtain and Kaiba's studded shoulder silhouette.
  if (id === 'pegasus') {
    sphere('pegasus-hidden-eye-lock', palette.hair, [-0.25, 4.79, 0.33], [0.27, 0.54, 0.12], 'hair');
    box('pegasus-bowtie', palette.dark, [0, 4.04, 0.39], [0.31, 0.14, 0.055]);
  }
  if (id === 'kaiba') for (const side of [-1, 1]) {
    box(`kaiba-shoulder-panel-${side}`, palette.cloth, [side * 0.77, 4.18, 0.04], [0.47, 0.2, 0.54], [0, 0, side * -0.13]);
    for (let stud = 0; stud < 3; stud += 1) sphere(`kaiba-shoulder-stud-${side}-${stud}`, palette.metal, [side * 0.78, 4.28, -0.12 + stud * 0.15], [0.047, 0.05, 0.047], 'body', 'metal');
  }
  if (id === 'yusei') {
    drapedSurface('yusei-riding-jacket-back', palette.cloth,
      [[3.97, -0.43, 0.43, -0.26, -0.029], [3.64, -0.5, 0.5, -0.3, -0.048], [3.04, -0.38, 0.38, -0.31, -0.058],
        [2.77, -0.49, 0.49, -0.39, -0.095], [2.48, -0.66, 0.66, -0.43, -0.11]], 0.065, 'body');
    curveStroke('yusei-back-yoke-edging', '#9a855b', [[-0.45, 3.91, -0.32], [-0.34, 3.64, -0.353], [-0.1, 3.57, -0.396], [0, 3.63, -0.409], [0.1, 3.57, -0.396], [0.34, 3.64, -0.353], [0.45, 3.91, -0.32]], 0.017);
    curveStroke('yusei-back-center-seam', '#27394a', [[0, 4.06, -0.29], [0, 3.44, -0.391], [0, 2.61, -0.55]], 0.012);
    curveStroke('yusei-cheek-marker', '#d1a54d', [[0.33, 4.84, 0.32], [0.36, 4.71, 0.3], [0.27, 4.69, 0.346], [0.3, 4.58, 0.29]], 0.014, 'head');
    for (const side of [-1, 1]) {
      sphere(`shoulder-${side}-yusei-orange-pad`, '#bd6537', [side * 0.59, 4.13, 0.095], [0.29, 0.16, 0.29]);
      ring(`shoulder-${side}-yusei-pad-rim`, palette.dark, [side * 0.59, 4.21, 0.095], 0.22, 0.02, [Math.PI / 2, 0, 0], 'body', 'matte');
      box(`yusei-jacket-metal-toggle-${side}`, palette.metal, [side * 0.26, 3.87, 0.39], [0.095, 0.18, 0.045], [0, 0, side * -0.2], 'body', 'metal');
      sphere(`elbow-${side}-yusei-orange-protector`, '#bd6537', [side * 0.89 * broad, 3.35, side < 0 ? 0.44 : 0.21], [0.11, 0.15, 0.047]);
      sphere(`yusei-orange-knee-pad-${side}`, '#bd6537', [side * 0.291 * broad, 1.43, 0.24], [0.11, 0.145, 0.059]);
      ring(`yusei-boot-top-band-${side}`, '#2c2f36', [side * 0.31 * broad, 1.09, 0.08], 0.178, 0.034, [Math.PI / 2, 0, 0], 'body', 'matte');
      box(`yusei-boot-side-buckle-${side}`, palette.metal, [side * 0.48 * broad, 1.035, 0.1], [0.055, 0.08, 0.072], undefined, 'body', 'metal');
    }
    panel('yusei-riding-shirt-stripe', '#aa3e4b', [[-0.12, 4.05], [0.06, 4.01], [0.25, 3.44], [0.18, 3.08], [0.06, 3.35]], 0.035, 'body', 'matte', 0.36);
  }
  if (id === 'marik' || id === 'yami-marik' || id === 'atem' || id === 'ishizu') {
    for (const side of [-1, 1]) {
      ring(`earring-${side}`, palette.gold, [side * 0.48, 4.69, 0.04], 0.074, 0.019, [0, 0, 0], 'head');
      box(`forearm-${side}-ceremonial-gold-band`, palette.gold, [side * 0.88 * broad, side < 0 ? 3.23 : 3.08, side < 0 ? 0.54 : 0.18], [0.36, 0.13, 0.32], undefined, 'body', 'metal');
    }
    ring('ceremonial-neck-collar', palette.gold, [0, 4.24, 0], 0.25, 0.055, [Math.PI / 2, 0, 0]);
  }
  if (id === 'atem') {
    panel('atem-pharaoh-eye-diadem', palette.gold, [[-0.45, 5.18], [-0.32, 5.36], [0, 5.48], [0.32, 5.36], [0.45, 5.18], [0.25, 5.15], [0, 5.3], [-0.25, 5.15]], 0.055, 'head', 'metal', 0.27);
    ring('atem-diadem-eye', '#74442c', [0, 5.34, 0.339], 0.052, 0.011, [0, 0, 0], 'head', 'matte');
    sphere('atem-diadem-pupil', '#74442c', [0, 5.34, 0.351], [0.018, 0.02, 0.006], 'head');
    for (const side of [-1, 1]) {
      panel(`atem-diadem-wing-${side}`, palette.gold, [[side * 0.28, 5.38], [side * 0.62, 5.49], [side * 0.56, 5.22], [side * 0.34, 5.16]], 0.055, 'head', 'metal', 0.08);
      ring(`shoulder-${side}-atem-upper-arm-band`, palette.gold, [side * 0.76 * broad, 3.85, 0.069], 0.216, 0.045, [0.14, 0, side * -0.31]);
    }
    panel('atem-gold-pectoral', palette.gold, [[-0.34, 4.1], [-0.22, 3.84], [0, 3.76], [0.22, 3.84], [0.34, 4.1]], 0.045, 'body', 'metal', 0.31);
    drapedSurface('atem-purple-neck-mantle', multiviewCostume.cape, [[4.18, -0.37, 0.37, 0.14, 0.02], [4.03, -0.42, 0.42, 0.25, 0.042]], 0.075, 'body');
  }
  if (id === 'playmaker') {
    for (const side of [-1, 1]) {
      panel(`playmaker-gold-headcrest-${side}`, '#ebc44e',
        [[side * 0.025, 5.28], [side * 0.36, 5.46], [side * 0.52, 6.02], [side * 0.36, 5.92], [side * 0.18, 5.55]], 0.075, 'head', 'metal', 0.22);
      panel(`playmaker-purple-headcrest-inset-${side}`, '#a454a0',
        [[side * 0.06, 5.33], [side * 0.3, 5.5], [side * 0.43, 5.9], [side * 0.28, 5.59]], 0.028, 'head', 'matte', 0.303);
      curveStroke(`playmaker-chest-circuit-${side}`, '#ec9b42', [[side * 0.43, 4.03, 0.45], [side * 0.35, 3.7, 0.47], [side * 0.22, 3.51, 0.47], [side * 0.25, 3.3, 0.44]], 0.026, 'body', 'eye');
      box(`finger-${side}-playmaker-knuckle-signal`, '#eeae47', [side * 0.88 * broad, side < 0 ? 3.14 : 3.0, side < 0 ? 0.858 : 0.35], [0.055, 0.075, 0.012], undefined, 'body', 'eye');
      panel(`playmaker-green-flank-panel-${side}`, palette.cloth,
        [[side * 0.29, 3.95], [side * 0.46, 3.79], [side * 0.38, 3.46], [side * 0.25, 3.35], [side * 0.15, 3.58]], 0.06, 'body', 'matte', 0.35);
      curveStroke(`playmaker-calf-circuit-${side}`, '#ec9b42', [[side * 0.29 * broad, 1.03, 0.322], [side * 0.24 * broad, 0.94, 0.327], [side * 0.25 * broad, 0.67, 0.328]], 0.019, 'body', 'eye');
      panel(`playmaker-high-neck-collar-${side}`, '#29313f', [[side * 0.03, 4.1], [side * 0.2, 4.33], [side * 0.38, 4.2], [side * 0.2, 3.95]], 0.075, 'body', 'matte', 0.24);
    }
    curveStroke('playmaker-asymmetric-bright-seam', '#ffb548', [[0.41, 4.13, 0.379], [0.32, 3.95, 0.447], [0.19, 3.72, 0.463], [0.04, 3.62, 0.441], [0.12, 3.44, 0.4], [0.09, 3.11, 0.395]], 0.031, 'body', 'eye');
  }
  if (id === 'yuya') {
    hairLock('yuya-forehead-cowlick', palette.hair, [-0.17, 5.5, -0.02], [0.47, 5.88, -0.1], 0.16, 0.11, 0.18);
    for (const side of [-1, 1]) {
      panel(`yuya-performer-shoulder-cape-${side}`, '#e7e9f4',
        [[side * 0.17, 4.18], [side * 0.56, 4.34], [side * 0.91, 3.24], [side * 0.49, 3.3]], 0.065, 'cloth', 'matte', -0.22);
      curveStroke(`yuya-cape-gold-edge-${side}`, '#d5b151', [[side * 0.23, 4.18, -0.14], [side * 0.55, 4.27, -0.14], [side * 0.87, 3.25, -0.14]], 0.025, 'cloth');
      sphere(`yuya-jacket-gold-button-${side}`, '#dab44b', [side * 0.2, 3.93, 0.41], [0.059, 0.068, 0.016], 'body', 'metal');
      box(`yuya-cargo-pocket-${side}`, '#3d542b', [side * 0.4, 2.22, 0.16], [0.22, 0.44, 0.15], [0, 0, side * -0.09]);
      box(`yuya-cargo-pocket-gold-tab-${side}`, palette.gold, [side * 0.405, 2.42, 0.25], [0.15, 0.07, 0.035], [0, 0, side * -0.09]);
      box(`yuya-shoe-dark-toe-${side}`, '#30333d', [side * 0.324 * broad, 0.15, 0.625], [0.27, 0.09, 0.09]);
      curveStroke(`yuya-shoe-gold-trim-${side}`, '#e1bc49', [[side * 0.324 * broad - 0.19, 0.112, 0.26], [side * 0.324 * broad - 0.16, 0.115, 0.54], [side * 0.324 * broad, 0.115, 0.643], [side * 0.324 * broad + 0.16, 0.115, 0.54]], 0.012);
      curveStroke(`yuya-goggle-side-strap-${side}`, '#4c3130', [[side * 0.33, 5.48, 0.22], [side * 0.5, 5.38, 0.03], [side * 0.48, 5.33, -0.25]], 0.03, 'head');
    }
    ring('yuya-pendant-chain', '#59392c', [0, 3.93, 0.19], 0.235, 0.012, [0.1, 0, 0], 'body', 'matte');
    add('yuya-pendulum-pendant', new THREE.OctahedronGeometry(0.105), '#89c7ac', [0, 3.66, 0.388], [0.75, 1.25, 0.32], undefined, 'body', 'eye');
  }
  if (id === 'yuga') {
    for (const side of [-1, 1]) {
      panel(`yuga-white-hood-${side}`, '#f5eee1', [[side * 0.08, 4.09], [side * 0.17, 4.32], [side * 0.51, 4.19], [side * 0.32, 3.98]], 0.075, 'body', 'matte', 0.24);
      box(`yuga-cargo-short-pocket-${side}`, '#36343e', [side * 0.405, 2.27, 0.2], [0.21, 0.38, 0.14]);
      box(`yuga-cargo-short-pocket-flap-${side}`, '#48464f', [side * 0.405, 2.43, 0.28], [0.22, 0.075, 0.045]);
    }
    box('yuga-yellow-tee', '#e8c859', [0, 3.69, 0.36], [0.35, 0.7, 0.039]);
  }
  if (id === 'yudias') {
    for (const side of [-1, 1]) {
      panel(`yudias-red-coat-lining-${side}`, '#9f343e', [[side * 0.18, 3.38], [side * 0.5, 3.37], [side * 0.89, 1.33], [side * 0.47, 1.19]], 0.035, 'cloth', 'matte', -0.174);
      curveStroke(`yudias-mantle-gold-braid-${side}`, '#d6b44b', [[side * 0.15, 4.27, -0.13], [side * 0.56, 4.02, -0.3], [side * 0.85, 3.72, -0.39]], 0.03, 'cloth', 'metal');
      panel(`yudias-blue-shin-inlay-${side}`, '#345b8a', [[side * 0.2, 1.19], [side * 0.34, 1.55], [side * 0.43, 1.19], [side * 0.35, 0.65]], 0.028, 'body', 'metal', 0.233);
    }
    sphere('yudias-mantle-red-jewel', '#be3b48', [0, 4.12, 0.366], [0.079, 0.105, 0.032], 'body', 'metal');
    panel('yudias-crossed-coat-strap', '#303442', [[-0.46, 4.1], [-0.34, 4.18], [0.44, 3.31], [0.33, 3.23]], 0.037, 'body', 'matte', 0.359);
  }
  if (animal) {
    sphere('animal-muzzle', '#f0f2ed', [0, 4.65, 0.45], [0.3, 0.19, 0.21], 'head');
    if (feline) {
      for (const side of [-1, 1]) {
        wedge(`animal-cat-ear-${side}`, palette.skin, [side * 0.4, 5.25, -0.04], [side * 0.57, 5.95, -0.045], 0.47, 0.32, 'head');
        wedge(`animal-cat-inner-ear-${side}`, '#bd9da6', [side * 0.41, 5.3, 0.16], [side * 0.55, 5.86, 0.135], 0.27, 0.05, 'head');
        for (let whisker = 0; whisker < 3; whisker += 1) rod(`animal-whisker-${side}-${whisker}`, '#e1e6e9', [side * 0.2, 4.7, 0.54], [side * 0.78, 4.75 + (whisker - 1) * 0.13, 0.43], 0.01, 0.005, 'head');
      }
      const star = new THREE.Shape();
      for (let point = 0; point < 10; point += 1) {
        const angle = Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 ? 0.076 : 0.18;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
        if (point === 0) star.moveTo(x, y); else star.lineTo(x, y);
      }
      star.closePath();
      add('nyandestar-forehead-star', new THREE.ExtrudeGeometry(star, { depth: 0.025, bevelEnabled: false }), palette.trim, [0, 5.21, 0.414], undefined, undefined, 'head');
    } else {
      for (const side of [-1, 1]) {
        wedge(`animal-dog-ear-${side}`, palette.hair, [side * 0.42, 5.2, -0.02], [side * 0.75, 5.88, -0.04], 0.57, 0.3, 'head');
        wedge(`animal-dog-inner-ear-${side}`, '#d9a6bd', [side * 0.43, 5.27, 0.16], [side * 0.71, 5.78, 0.13], 0.33, 0.045, 'head');
        sphere(`bochi-white-brow-${side}`, palette.white, [side * 0.27, 5.11, 0.374], [0.1, 0.12, 0.045], 'head');
      }
      wedge('bochi-white-forehead-stripe', palette.white, [0, 4.91, 0.416], [0, 5.51, 0.335], 0.17, 0.045, 'head');
      ring('bochi-spiked-collar', visual.accessoryColor || palette.metal, [0, 4.22, 0], 0.27, 0.09, [Math.PI / 2, 0, 0], 'body', 'matte');
      for (let spike = 0; spike < 8; spike += 1) {
        const angle = spike * Math.PI / 4;
        add(`bochi-collar-spike-${spike}`, new THREE.ConeGeometry(0.075, 0.34, 6), palette.metal, [Math.sin(angle) * 0.41, 4.22, Math.cos(angle) * 0.41], undefined, [Math.PI / 2, 0, -angle], 'body', 'metal');
      }
    }
  } else if (id === 'bochi') {
    sphere('bochi-muzzle', palette.skin, [0, 4.74, 0.43], [0.25, 0.18, 0.19], 'head');
    sphere('bochi-nose', '#333038', [0, 4.81, 0.607], [0.09, 0.065, 0.035], 'head');
    for (const side of [-1, 1]) sphere(`bochi-floppy-ear-${side}`, palette.hair, [side * 0.52, 4.78, -0.015], [0.19, 0.37, 0.14], 'hair');
  }
  if (id === 'nyandestar' && !animal) for (const side of [-1, 1]) {
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
    const mesh = stage === 'body'
      ? new THREE.SkinnedMesh(geometry, materials[material])
      : new THREE.Mesh(geometry, materials[material]);
    mesh.name = `duelist-${key.replace(':', '-')}`;
    mesh.castShadow = material !== 'eye';
    mesh.receiveShadow = true;
    stages[stage].add(mesh);
    if (mesh.isSkinnedMesh) {
      mesh.bind(skeleton);
      // A cached bind-pose bounding sphere would clip an extended hand. These
      // two bounded avatar batches bypass frustum culling, without frame-time
      // geometry or bounding-volume allocations.
      mesh.frustumCulled = false;
    }
    triangles += geometry.attributes.position.count / 3;
  }
  root.userData.drawCalls = batches.size;
  root.userData.triangles = triangles;
  root.userData.partNames = Object.freeze(root.userData.partNames);
  root.updateMatrixWorld(true);

  function resetTransforms() {
    body.position.y = 0;
    body.scale.y = 1;
    body.rotation.set(0, 0, 0);
    head.rotation.set(0, 0, 0);
    hair.rotation.set(0, 0, 0);
    cloth.rotation.set(0, 0, 0);
    for (const joint of bones) joint.rotation.set(0, 0, 0);
  }
  function resetPose() {
    gestures.clear();
    resetTransforms();
  }
  function clearGesture() {
    const cleared = gestures.clear();
    if (cleared) resetTransforms();
    return cleared;
  }
  function playGesture(kind, options = {}) {
    if (disposed || !gestures.play(kind, options)) return false;
    resetTransforms();
    if (options.hold === true && options.immediate === true) {
      gestures.update(lastModelElapsed, { reducedMotion: lastMotionReduced });
    }
    return true;
  }
  function update(elapsedSeconds, { reducedMotion: motionPreference = reducedMotion } = {}) {
    if (disposed) return false;
    const elapsed = Number(elapsedSeconds);
    resetTransforms();
    if (!Number.isFinite(elapsed)) return false;
    lastModelElapsed = elapsed;
    lastMotionReduced = motionPreference === true;
    const phase = elapsed + variant * 0.23;
    const energetic = visual.pose === 'energetic' ? 1.35 : visual.pose === 'calm' ? 0.7 : 1;
    if (!lastMotionReduced) {
      const breath = Math.sin(phase * 1.55) * energetic;
      body.position.y = breath * 0.013;
      body.scale.y = 1 + breath * 0.0028;
      head.rotation.y = Math.sin(phase * 0.36) * 0.038;
      head.rotation.z = Math.sin(phase * 0.57) * 0.012;
      hair.rotation.z = Math.sin(phase * 0.73 + 0.3) * 0.008;
      cloth.rotation.x = Math.sin(phase * 0.85) * 0.012;
      cloth.rotation.z = Math.sin(phase * 0.67) * 0.007;
    }
    const gestureChanged = gestures.update(elapsed, { reducedMotion: lastMotionReduced });
    return !lastMotionReduced || gestureChanged;
  }
  function dispose() {
    if (disposed) return false;
    root.removeFromParent();
    root.traverse(object => object.geometry?.dispose());
    Object.values(materials).forEach(material => material.dispose());
    gestures.dispose();
    skeleton.dispose();
    root.clear();
    disposed = true;
    return true;
  }
  return { group: root, avatarId: id, rig, update, resetPose, playGesture, clearGesture,
    getGestureState: () => gestures.getState(), dispose,
    get hasActiveGesture() { return gestures.hasActiveGesture; },
    get disposed() { return disposed; } };
}

export default createDuelistAvatarModel;
