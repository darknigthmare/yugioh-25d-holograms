import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { resolveHologramMonsterProfile } from './CombatVisualProfiles.js';
import { installHologramPoseRig, resolveHologramPartJoint } from './HologramPoseAnimation.js';

/** Texture-free articulated silhouettes, merged by material to bound draw calls. */
export function createHologramMonsterModel(card = {}, { defense = false } = {}) {
  const profile = resolveHologramMonsterProfile(card);
  const root = new THREE.Group();
  root.name = `hologram-${profile.id}`;
  root.userData.profile = profile;
  root.userData.partNames = [];
  const materials = {
    body: new THREE.MeshStandardMaterial({ color: profile.body, emissive: profile.accent, emissiveIntensity: 0.12, metalness: 0.55, roughness: 0.32 }),
    accent: new THREE.MeshStandardMaterial({ color: profile.accent, emissive: profile.accent, emissiveIntensity: 0.24, metalness: 0.65, roughness: 0.25 }),
    dark: new THREE.MeshStandardMaterial({ color: profile.hair || '#263447', emissive: profile.accent, emissiveIntensity: 0.08, metalness: 0.45, roughness: 0.46, side: THREE.DoubleSide }),
    eye: new THREE.MeshBasicMaterial({ color: profile.eye, toneMapped: false }),
    glow: new THREE.MeshBasicMaterial({ color: profile.accent, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false })
  };
  const batches = new Map(Object.keys(materials).map(key => [key, []]));
  function registerGeometry(name, geometry, material) {
    const joint = new Float32Array(geometry.attributes.position.count);
    joint.fill(resolveHologramPartJoint(name));
    geometry.setAttribute('hologramJoint', new THREE.BufferAttribute(joint, 1));
    batches.get(material).push(geometry);
    root.userData.partNames.push(name);
  }
  function part(name, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const transform = new THREE.Object3D();
    transform.position.set(...position);
    transform.scale.set(...scale);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    geometry.applyMatrix4(transform.matrix);
    // All families use indexed positions, normals and UVs, including membranes.
    registerGeometry(name, geometry, material);
  }
  const sphere = (name, material, position, scale, detail = 1) => part(name, new THREE.IcosahedronGeometry(1, detail), material, position, scale);
  const box = (name, material, position, scale, rotation) => part(name, new THREE.BoxGeometry(1, 1, 1), material, position, scale, rotation);
  const cone = (name, material, position, scale, rotation) => part(name, new THREE.ConeGeometry(1, 1, 10), material, position, scale, rotation);
  const ring = (name, material, position, radius, rotation = [Math.PI / 2, 0, 0], tube = 0.025) => part(name, new THREE.TorusGeometry(radius, tube, 5, 28), material, position, [1, 1, 1], rotation);
  function rod(name, material, start, end, radius = 0.075, endRadius = radius) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const transform = new THREE.Object3D();
    transform.position.copy(a.add(b).multiplyScalar(0.5));
    transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    transform.updateMatrix();
    const geometry = new THREE.CylinderGeometry(endRadius, radius, direction.length(), 8);
    geometry.applyMatrix4(transform.matrix);
    registerGeometry(name, geometry, material);
  }
  function membrane(name, material, vertices) {
    const shape = new THREE.Shape();
    vertices.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    part(name, new THREE.ShapeGeometry(shape), material, [0, 0, -0.14]);
  }
  function eyePair(y, z, spread = 0.16, size = 0.055) {
    for (const side of [-1, 1]) sphere(`eye-${side}`, 'eye', [side * spread, y, z], [size, size * 0.8, size * 0.5]);
  }
  function wings({ baseY = 2.5, width = 2.1, bony = false } = {}) {
    for (const side of [-1, 1]) {
      const shoulder = [side * 0.28, baseY - 0.3, -0.2];
      const elbow = [side * width * 0.56, baseY + 0.7, -0.15];
      const tip = [side * width, baseY + 0.55, -0.12];
      rod(`wing-${side}-arm`, 'body', shoulder, elbow, 0.11, 0.07);
      rod(`wing-${side}-tip`, 'accent', elbow, tip, 0.06, 0.025);
      const vertices = [[shoulder[0], shoulder[1]], [elbow[0], elbow[1]], [tip[0], tip[1]], [side * width * 0.77, baseY - 0.05], [side * width * 0.63, baseY + 0.05], [side * width * 0.44, baseY - 0.5], [side * 0.35, baseY - 0.7]];
      membrane(`wing-${side}-membrane`, bony ? 'glow' : 'dark', vertices);
      for (const fraction of [0.45, 0.65, 0.85]) rod(`wing-${side}-rib-${fraction}`, 'accent', elbow, [side * width * fraction, baseY - 0.4, -0.12], 0.027);
    }
  }
  function armoredHumanoid({ machine = false, rock = false } = {}) {
    const stone = rock ? 'body' : 'accent';
    sphere('armored-torso', 'body', [0, 1.95, 0], [0.58, 0.75, 0.33]);
    box('chest-plate', stone, [0, 2.13, 0.31], [0.75, 0.7, 0.15]);
    sphere('head', 'body', [0, 3.03, 0], [0.3, 0.37, 0.3]);
    box('helmet-brow', 'accent', [0, 3.2, 0.24], [0.63, 0.13, 0.17]);
    eyePair(3.05, 0.28);
    box('belt', 'dark', [0, 1.36, 0], [0.77, 0.17, 0.5]);
    for (const side of [-1, 1]) {
      sphere(`shoulder-${side}`, stone, [side * 0.66, 2.4, 0], [0.35, 0.35, 0.35]);
      rod(`upper-arm-${side}`, 'body', [side * 0.67, 2.37, 0], [side * 0.9, 1.87, 0.16], 0.16);
      rod(`gauntlet-${side}`, stone, [side * 0.9, 1.87, 0.16], [side * 0.93, 1.4, 0.32], 0.21, 0.17);
      sphere(`hand-${side}`, 'body', [side * 0.93, 1.38, 0.33], [0.21, 0.2, 0.18]);
      rod(`thigh-${side}`, 'body', [side * 0.28, 1.3, 0], [side * 0.4, 0.81, 0.05], 0.22);
      sphere(`knee-${side}`, 'accent', [side * 0.4, 0.78, 0.17], [0.21, 0.2, 0.13]);
      rod(`shin-${side}`, stone, [side * 0.4, 0.75, 0.05], [side * 0.43, 0.25, 0.1], 0.21, 0.18);
      box(`boot-${side}`, 'dark', [side * 0.43, 0.21, 0.24], [0.39, 0.25, 0.65]);
      if (machine) {
        ring(`gear-${side}`, 'accent', [side * 0.68, 2.41, 0.25], 0.22, [0, 0, 0], 0.045);
        box(`exhaust-${side}`, 'dark', [side * 0.3, 2.6, -0.38], [0.2, 0.75, 0.23]);
      }
    }
    if (!machine && !rock) {
      cone('helmet-crest', 'accent', [0, 3.49, -0.08], [0.15, 0.49, 0.15]);
      rod('sword-grip', 'dark', [0.95, 1.28, 0.4], [0.95, 1.8, 0.4], 0.065);
      box('sword-guard', 'accent', [0.95, 1.78, 0.4], [0.62, 0.1, 0.12]);
      cone('sword-blade', 'body', [0.95, 2.59, 0.4], [0.14, 1.65, 0.07]);
      sphere('shield', 'accent', [-0.96, 1.85, 0.53], [0.49, 0.65, 0.11]);
      sphere('shield-boss', 'body', [-0.96, 1.85, 0.64], [0.15, 0.15, 0.1]);
    }
    if (rock) for (let i = 0; i < 4; i += 1) box(`stone-joint-${i}`, 'dark', [0, 1.68 + i * 0.2, 0.34], [0.61, 0.026, 0.023], [0, 0, i % 2 ? 0.12 : -0.08]);
  }

  if (profile.family === 'dragon') {
    sphere('dragon-breast', 'body', [0, 1.67, 0], [0.55, 0.85, 0.55]);
    sphere('dragon-belly', 'accent', [0, 1.5, 0.42], [0.37, 0.59, 0.12]);
    for (let i = 0; i < 5; i += 1) ring(`belly-scale-${i}`, 'body', [0, 1.2 + i * 0.19, 0.34], 0.28 + Math.sin(i / 5 * Math.PI) * 0.08, [Math.PI / 2, 0, 0], 0.028);
    const heads = profile.heads || 1;
    for (let h = 0; h < heads; h += 1) {
      const x = heads > 1 ? (h - 1) * 0.66 : 0;
      rod(`neck-${h}`, 'body', [x * 0.4, 2.1, 0], [x, 3.06 + (h === 1 ? 0.12 : 0), 0.16], 0.26, 0.18);
      sphere(`dragon-head-${h}`, 'body', [x, 3.12, 0.32], [0.3, 0.29, 0.42]);
      sphere(`dragon-muzzle-${h}`, 'body', [x, 2.99, 0.63], [0.23, 0.15, 0.29]);
      box(`jaw-${h}`, 'dark', [x, 2.91, 0.72], [0.35, 0.026, 0.36]);
      for (const side of [-1, 1]) {
        sphere(`dragon-eye-${h}-${side}`, 'eye', [x + side * 0.23, 3.18, 0.57], [0.067, 0.045, 0.065]);
        cone(`dragon-horn-${h}-${side}`, 'accent', [x + side * 0.2, 3.43, 0.18], [0.085, 0.51, 0.085], [-0.3, 0, side * -0.2]);
        for (let tooth = 0; tooth < 3; tooth += 1) cone(`fang-${h}-${side}-${tooth}`, 'accent', [x + side * 0.14, 2.88, 0.6 + tooth * 0.1], [0.022, 0.11, 0.022], [Math.PI, 0, 0]);
      }
    }
    wings({ baseY: 2.55, width: profile.baby ? 1.45 : 2.1 });
    for (const side of [-1, 1]) {
      rod(`foreleg-${side}`, 'body', [side * 0.43, 2, 0.22], [side * 0.82, 1.3, 0.57], 0.13, 0.1);
      sphere(`haunch-${side}`, 'body', [side * 0.43, 0.94, 0], [0.31, 0.48, 0.4]);
      rod(`hindleg-${side}`, 'body', [side * 0.43, 1, 0.07], [side * 0.61, 0.31, 0.4], 0.17, 0.12);
      sphere(`dragon-foot-${side}`, 'body', [side * 0.61, 0.27, 0.54], [0.28, 0.15, 0.4]);
      for (let claw = 0; claw < 3; claw += 1) cone(`claw-${side}-${claw}`, 'accent', [side * 0.61 + (claw - 1) * 0.16, 0.27, 0.92], [0.055, 0.24, 0.055], [Math.PI / 2, 0, 0]);
    }
    const tail = [[0, 1.1, -0.38], [0.25, 0.65, -0.9], [0.68, 0.4, -1.4], [1.14, 0.54, -1.75]];
    for (let i = 1; i < tail.length; i += 1) rod(`tail-${i}`, 'body', tail[i - 1], tail[i], 0.21 / i, 0.12 / i);
    for (let i = 0; i < 5; i += 1) cone(`spine-${i}`, 'accent', [0, 2.6 - i * 0.29, -0.38 - i * 0.09], [0.09, 0.35, 0.09], [-0.7, 0, 0]);
    if (profile.digital) {
      for (let i = 0; i < 4; i += 1) {
        box(`cyber-chest-panel-${i}`, 'dark', [0, 1.27 + i * 0.23, 0.56], [0.55 - i * 0.04, 0.09, 0.06]);
        for (const side of [-1, 1]) {
          rod(`wing-${side}-circuit-${i}`, 'eye', [side * (0.52 + i * 0.3), 2.67, -0.1], [side * (0.72 + i * 0.3), 2.9, -0.1], 0.018);
        }
      }
      cone('cyber-beak', 'accent', [0, 3.03, 0.95], [0.13, 0.75, 0.12], [Math.PI / 2, 0, 0]);
      sphere('cyber-core', 'eye', [0, 2.14, 0.54], [0.12, 0.13, 0.06]);
    }
  } else if (profile.family === 'magician' || profile.family === 'faith') {
    cone('layered-robe', 'body', [0, 1.35, 0], [0.71, 1.91, 0.51]);
    cone('robe-hem', 'accent', [0, 0.5, 0], [0.76, 0.2, 0.55]);
    sphere('mage-torso', 'body', [0, 2.18, 0], [0.42, 0.52, 0.3]);
    sphere('mage-face', 'accent', [0, 2.96, 0.05], [0.26, 0.32, 0.25]);
    if (profile.family === 'faith') {
      sphere('faith-hair-crown', 'dark', [0, 3.13, -0.05], [0.31, 0.23, 0.3]);
      for (const side of [-1, 1]) {
        rod(`faith-hair-lock-${side}`, 'dark', [side * 0.24, 3.08, 0.04], [side * 0.31, 2.57, -0.11], 0.095, 0.04);
        membrane(`faith-cape-${side}`, 'body', [[side * 0.18, 2.59], [side * 0.85, 2.18], [side * 0.74, 0.64], [side * 0.24, 0.33]]);
      }
      ring('faith-halo', 'glow', [0, 3.5, -0.09], 0.36, [Math.PI / 2, 0, 0], 0.035);
      sphere('faith-heart-gem', 'eye', [0, 2.24, 0.3], [0.1, 0.14, 0.045]);
      ring('faith-orb-aureole', 'glow', [0.91, 3.46, 0.49], 0.35, [0, 0, 0], 0.018);
    } else {
      cone('pointed-hat', 'body', [0, 3.58, -0.07], [0.41, 1.18, 0.32], [-0.15, 0, 0]);
      ring('hat-brim', 'accent', [0, 3.15, 0], 0.34, [Math.PI / 2, 0, 0], 0.055);
      for (let i = 0; i < 3; i += 1) ring(`hat-gilding-${i}`, 'accent', [0, 3.25 + i * 0.21, -i * 0.025], 0.27 - i * 0.062, [Math.PI / 2, 0, 0], 0.018);
    }
    eyePair(3.02, 0.28, 0.12, 0.035);
    for (const side of [-1, 1]) {
      cone(`pauldron-${side}`, 'accent', [side * 0.56, 2.52, 0], [0.36, 0.36, 0.34], [0, 0, side * 0.9]);
      rod(`mage-arm-${side}`, 'body', [side * 0.43, 2.41, 0], [side * 0.82, 1.9, 0.32], 0.14);
      rod(`mage-glove-${side}`, 'accent', [side * 0.82, 1.9, 0.32], [side * 0.87, 1.6, 0.45], 0.17, 0.12);
      for (let i = 0; i < 3; i += 1) ring(`robe-trim-${side}-${i}`, 'accent', [side * 0.23, 1.03 + i * 0.35, 0.25], 0.15, [0, 0, 0], 0.018);
    }
    rod('staff', 'dark', [0.91, 0.25, 0.49], [0.91, 3.44, 0.49], 0.055);
    ring('staff-crown', 'accent', [0.91, 3.46, 0.49], 0.24, [0, 0, 0], 0.045);
    sphere('staff-crystal', 'eye', [0.91, 3.46, 0.49], [0.12, 0.17, 0.12]);
    if (profile.digital) {
      part('staff-digital-core', new THREE.OctahedronGeometry(0.2), 'accent', [0.91, 3.46, 0.49]);
      ring('cyber-mage-halo', 'glow', [0, 2.75, -0.24], 0.68, [0, 0, 0], 0.025);
    }
  } else if (['warrior', 'machine', 'rock'].includes(profile.family)) {
    armoredHumanoid({ machine: profile.family === 'machine', rock: profile.family === 'rock' });
  } else if (profile.family === 'kuriboh' || profile.family === 'sangan') {
    sphere('fur-body', 'body', [0, 1.1, 0], [0.8, 0.82, 0.67], 2);
    for (let i = 0; i < 34; i += 1) {
      const angle = i * 2.399963;
      const y = 1 - i / 17;
      const radial = Math.sqrt(1 - y * y);
      const axis = new THREE.Vector3(Math.cos(angle) * radial, y, Math.sin(angle) * radial);
      const geometry = new THREE.ConeGeometry(0.13, 0.34, 5);
      const transform = new THREE.Object3D();
      transform.position.set(axis.x * 0.74, 1.1 + axis.y * 0.75, axis.z * 0.61);
      transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      transform.updateMatrix();
      geometry.applyMatrix4(transform.matrix);
      registerGeometry(`fur-tuft-${i}`, geometry, i % 3 ? 'body' : 'accent');
    }
    if (profile.family === 'sangan') {
      sphere('sangan-third-eye', 'eye', [0, 1.69, 0.61], [0.18, 0.21, 0.09]);
      sphere('sangan-third-pupil', 'dark', [0, 1.69, 0.7], [0.08, 0.115, 0.025]);
      box('sangan-mouth', 'dark', [0, 0.94, 0.67], [0.31, 0.1, 0.04]);
      for (const side of [-1, 1]) cone(`sangan-fang-${side}`, 'accent', [side * 0.09, 0.89, 0.69], [0.04, 0.15, 0.03], [Math.PI, 0, 0]);
    }
    for (const side of [-1, 1]) {
      sphere(`wide-eye-${side}`, 'eye', [side * 0.25, 1.34, 0.61], [0.17, 0.21, 0.09]);
      sphere(`pupil-${side}`, 'dark', [side * 0.25, 1.32, 0.69], [0.08, 0.12, 0.032]);
      sphere(`paw-${side}`, 'accent', [side * 0.6, 0.45, 0.4], [0.24, 0.14, 0.29]);
      for (let i = 0; i < 3; i += 1) cone(`paw-claw-${side}-${i}`, 'body', [side * 0.6 + (i - 1) * 0.1, 0.44, 0.67], [0.045, 0.23, 0.045], [Math.PI / 2, 0, 0]);
    }
  } else if (profile.family === 'insect') {
    sphere('insect-carapace', 'body', [0, 1.45, -0.06], [0.51, 0.78, 0.42]);
    sphere('insect-abdomen', 'dark', [0, 0.94, -0.14], [0.55, 0.57, 0.48]);
    for (let i = 0; i < 4; i += 1) ring(`insect-carapace-segment-${i}`, 'accent', [0, 1.11 + i * 0.2, 0], 0.38 + Math.sin(i) * 0.05, [Math.PI / 2, 0, 0], 0.035);
    sphere('insect-head', 'body', [0, 2.21, 0.13], [0.38, 0.31, 0.28]);
    for (const side of [-1, 1]) {
      sphere(`insect-compound-eye-${side}`, 'eye', [side * 0.29, 2.27, 0.32], [0.15, 0.18, 0.09]);
      rod(`insect-antenna-${side}`, 'accent', [side * 0.21, 2.46, 0.13], [side * 0.35, 2.9, 0.06], 0.025);
      sphere(`insect-antenna-tip-${side}`, 'dark', [side * 0.35, 2.9, 0.06], [0.06, 0.06, 0.06]);
      rod(`insect-mandible-${side}`, 'accent', [side * 0.21, 2.09, 0.29], [side * 0.16, 1.93, 0.48], 0.065, 0.025);
      rod(`pincer-upper-arm-${side}`, 'body', [side * 0.41, 1.96, 0.06], [side * 0.99, 1.8, 0.16], 0.085);
      rod(`pincer-blade-${side}`, 'accent', [side * 0.99, 1.8, 0.16], [side * 0.72, 2.44, 0.31], 0.11, 0.025);
      for (let tooth = 0; tooth < 4; tooth += 1) cone(`pincer-tooth-${side}-${tooth}`, 'dark', [side * (0.95 - tooth * 0.055), 1.91 + tooth * 0.12, 0.2], [0.04, 0.14, 0.04], [0, 0, side * Math.PI / 2]);
      for (let leg = 0; leg < 3; leg += 1) {
        const y = 0.94 + leg * 0.24;
        rod(`insect-leg-upper-${side}-${leg}`, 'body', [side * 0.39, y, 0.02], [side * (0.79 + leg * 0.09), y - 0.16, 0.05 - leg * 0.1], 0.057);
        rod(`insect-leg-lower-${side}-${leg}`, 'accent', [side * (0.79 + leg * 0.09), y - 0.16, 0.05 - leg * 0.1], [side * (1.05 + leg * 0.07), 0.23, 0.36 - leg * 0.28], 0.04, 0.018);
      }
    }
  } else if (profile.family === 'token') {
    sphere('token-fleece-core', 'body', [0, 1.04, 0], [0.64, 0.56, 0.49]);
    for (let i = 0; i < 12; i += 1) {
      const angle = i * Math.PI / 6;
      sphere(`token-fleece-curl-${i}`, i % 3 ? 'body' : 'accent', [Math.cos(angle) * 0.53, 1.06 + (i % 2) * 0.16, Math.sin(angle) * 0.39], [0.23, 0.23, 0.23]);
    }
    sphere('token-goat-face', 'dark', [0, 1.4, 0.49], [0.28, 0.31, 0.3]);
    eyePair(1.49, 0.75, 0.145, 0.045);
    for (const side of [-1, 1]) {
      cone(`token-horn-${side}`, 'accent', [side * 0.22, 1.77, 0.41], [0.075, 0.36, 0.075], [0, 0, side * -0.3]);
      sphere(`token-ear-${side}`, 'body', [side * 0.4, 1.48, 0.47], [0.2, 0.07, 0.11]);
      for (const z of [-0.24, 0.29]) {
        rod(`token-leg-${side}-${z}`, 'dark', [side * 0.39, 0.83, z], [side * 0.42, 0.28, z], 0.055);
        box(`token-hoof-${side}-${z}`, 'accent', [side * 0.42, 0.21, z + 0.03], [0.18, 0.16, 0.2]);
      }
    }
  } else if (profile.family === 'fiend') {
    sphere('fiend-pelvis', 'accent', [0, 1.3, 0], [0.48, 0.34, 0.34]);
    rod('spinal-column', 'body', [0, 1.35, 0], [0, 2.6, 0], 0.1);
    for (let i = 0; i < 5; i += 1) ring(`rib-${i}`, 'body', [0, 1.73 + i * 0.17, 0], 0.38 + i * 0.027, [Math.PI / 2, 0, 0], 0.052);
    sphere('skull', 'body', [0, 3.02, 0.09], [0.34, 0.37, 0.32]);
    box('skull-jaw', 'body', [0, 2.79, 0.24], [0.43, 0.17, 0.3]);
    eyePair(3.07, 0.4, 0.17, 0.07);
    for (const side of [-1, 1]) {
      cone(`fiend-horn-${side}`, 'body', [side * 0.38, 3.45, -0.04], [0.15, 0.98, 0.15], [0, 0, side * -0.53]);
      rod(`fiend-arm-${side}`, 'accent', [side * 0.49, 2.52, 0], [side * 0.85, 1.56, 0.32], 0.13);
      rod(`fiend-leg-${side}`, 'accent', [side * 0.3, 1.35, 0], [side * 0.53, 0.26, 0.29], 0.17);
      sphere(`fiend-foot-${side}`, 'body', [side * 0.53, 0.2, 0.41], [0.2, 0.16, 0.3]);
      for (let i = 0; i < 3; i += 1) rod(`fiend-finger-${side}-${i}`, 'body', [side * 0.86 + (i - 1) * 0.11, 1.6, 0.32], [side * 0.94 + (i - 1) * 0.13, 1.24, 0.42], 0.035);
    }
    wings({ baseY: 2.43, width: 1.8, bony: true });
  } else if (profile.family === 'clock') {
    sphere('clock-shell', 'body', [0, 1.8, 0], [0.81, 0.91, 0.23]);
    part('clock-face', new THREE.CircleGeometry(0.67, 32), 'accent', [0, 1.8, 0.245]);
    ring('clock-bezel', 'dark', [0, 1.8, 0.27], 0.7, [0, 0, 0], 0.06);
    for (let i = 0; i < 12; i += 1) {
      const angle = i * Math.PI / 6;
      box(`clock-tick-${i}`, 'dark', [Math.sin(angle) * 0.56, 1.8 + Math.cos(angle) * 0.56, 0.275], [0.035, 0.1, 0.023], [0, 0, -angle]);
    }
    rod('clock-minute', 'dark', [0, 1.8, 0.3], [0, 2.23, 0.3], 0.035);
    rod('clock-hour', 'dark', [0, 1.8, 0.31], [0.29, 1.64, 0.31], 0.045);
    cone('wizard-clock-hat', 'body', [0, 3.11, 0], [0.46, 1.02, 0.35], [0, 0, -0.15]);
    for (const side of [-1, 1]) {
      rod(`clock-arm-${side}`, 'body', [side * 0.72, 1.9, 0], [side * 1, 1.46, 0.06], 0.09);
      sphere(`clock-shoe-${side}`, 'body', [side * 0.36, 0.56, 0.17], [0.31, 0.18, 0.35]);
    }
  } else if (profile.family === 'aquatic') {
    sphere('aquatic-body', 'body', [0, 1.4, 0], [0.57, 1.25, 0.37]);
    sphere('aquatic-head', 'body', [0, 2.67, 0.22], [0.38, 0.38, 0.5]);
    eyePair(2.78, 0.62, 0.23);
    for (const side of [-1, 1]) membrane(`fin-${side}`, 'accent', [[side * 0.33, 1.95], [side * 1.35, 2.4], [side * 0.93, 1.1], [side * 0.23, 0.7]]);
    cone('tail-fin', 'accent', [0, 0.26, -0.3], [0.6, 0.64, 0.1]);
    for (let i = 0; i < 4; i += 1) ring(`water-scale-${i}`, 'accent', [0, 0.9 + i * 0.34, 0], 0.43, [Math.PI / 2, 0, 0], 0.025);
  } else if (profile.family === 'beast' || profile.family === 'avian') {
    sphere('creature-body', 'body', [0, 1.6, 0], [0.55, 0.74, 0.92]);
    sphere('creature-head', 'body', [0, 2.2, 0.72], [0.42, 0.45, 0.46]);
    eyePair(2.31, 1.1, 0.23);
    for (const side of [-1, 1]) {
      cone(`ear-${side}`, 'accent', [side * 0.26, 2.66, 0.62], [0.17, 0.43, 0.18]);
      for (const z of [-0.48, 0.6]) {
        rod(`creature-leg-${side}-${z}`, 'body', [side * 0.42, 1.38, z], [side * 0.58, 0.3, z + 0.17], 0.16);
        sphere(`creature-paw-${side}-${z}`, 'accent', [side * 0.58, 0.25, z + 0.27], [0.22, 0.17, 0.31]);
      }
    }
    if (profile.family === 'avian') wings({ baseY: 2.15, width: 1.8 });
    else rod('creature-tail', 'accent', [0, 1.65, -0.72], [0.67, 1.15, -1.44], 0.14, 0.04);
  } else {
    sphere('spirit-heart', 'body', [0, 1.6, 0], [0.55, 0.82, 0.55]);
    sphere('spirit-head', 'accent', [0, 2.6, 0.08], [0.3, 0.4, 0.3]);
    eyePair(2.65, 0.36);
    for (let i = 0; i < 3; i += 1) ring(`spirit-orbit-${i}`, 'glow', [0, 1.65, 0], 0.94, [i * 0.65, i * 0.85, 0], 0.025);
  }

  ring('projection-circle', 'glow', [0, 0.08, 0], 0.92, [Math.PI / 2, 0, 0], 0.028);
  ring('projection-inner-circle', 'accent', [0, 0.08, 0], 0.73, [Math.PI / 2, 0, 0], 0.016);
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    box(`projection-glyph-${i}`, 'glow', [Math.sin(angle) * 0.82, 0.08, Math.cos(angle) * 0.82], [0.04, 0.015, 0.14], [0, angle, 0]);
  }
  if (profile.digital) {
    for (const side of [-1, 1]) cone(`projection-link-arrow-${side}`, 'eye', [side * 0.59, 0.09, 0.62], [0.15, 0.31, 0.015], [Math.PI / 2, 0, side * -Math.PI / 4]);
  }
  if (defense) {
    part('defense-barrier', new THREE.SphereGeometry(1, 16, 10, 0, Math.PI), 'glow', [0, 1.6, 0.15], [1.12, 1.64, 0.93]);
    ring('defense-barrier-rim', 'glow', [0, 1.6, 0.18], 1, [0, 0, 0], 0.035);
  }
  for (const [key, geometries] of batches) {
    if (!geometries.length) {
      materials[key].dispose();
      continue;
    }
    // ShapeGeometry is indexed; IcosahedronGeometry is not. Normalize before merge.
    const normalized = geometries.map(geometry => geometry.index ? geometry.toNonIndexed() : geometry);
    const geometry = mergeGeometries(normalized, false);
    geometries.forEach(original => original.dispose());
    normalized.forEach(original => { if (!geometries.includes(original)) original.dispose(); });
    const mesh = new THREE.Mesh(geometry, materials[key]);
    mesh.name = `${profile.id}-${key}`;
    mesh.castShadow = key !== 'glow' && key !== 'eye';
    mesh.receiveShadow = key !== 'glow';
    root.add(mesh);
  }
  root.scale.setScalar(profile.family === 'kuriboh' ? 0.77 : 0.7);
  root.userData.meshCount = root.children.length;
  root.userData.triangleCount = root.children.reduce((count, mesh) => count + mesh.geometry.attributes.position.count / 3, 0);
  root.userData.fidelity = 'procedural-interpretation';
  installHologramPoseRig(root, profile);
  return root;
}
