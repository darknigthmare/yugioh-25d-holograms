import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { resolveHologramMonsterProfile } from './CombatVisualProfiles.js';
import { HOLOGRAM_JOINTS, installHologramPoseRig, resolveHologramPartJoint } from './HologramPoseAnimation.js';
import { buildReferenceMonsterAnatomy } from './HologramReferenceAnatomy.js';
import { buildPopularGodMonsterAnatomy } from './HologramPopularGodModels.js';
import { buildPopularStapleAnatomy } from './HologramPopularStapleModels.js';
import { buildTokenMonsterAnatomy } from './HologramTokenModels.js';

/** Texture-free articulated silhouettes, merged by material to bound draw calls. */
export function createHologramMonsterModel(card = {}, { defense = false } = {}) {
  const profile = resolveHologramMonsterProfile(card);
  const root = new THREE.Group();
  root.name = `hologram-${profile.id}`;
  root.userData.profile = profile;
  root.userData.partNames = [];
  // Fur, cloth, skin and insects scatter broad matte light; armor and machines
  // keep the metal response selected by their illustrated identity.
  const organic = ['kuriboh','sangan','insect','aquatic','faith','beast','avian','spirit'].includes(profile.family)
    || profile.baby === true || ['emerald-genie','mystical-elf-prayer','blue-armored-rodent','red-armored-bull','asymmetric-jester'].includes(profile.anatomy);
  const defaultMetalness = organic ? 0.04 : profile.family === 'dragon' ? 0.35 : 0.5;
  const defaultRoughness = organic ? 0.72 : profile.family === 'dragon' ? 0.4 : 0.36;
  const materials = {
    body: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, emissive: profile.accent, emissiveIntensity: 0.08, metalness: profile.bodyMetalness ?? defaultMetalness, roughness: profile.bodyRoughness ?? defaultRoughness, side: THREE.DoubleSide }),
    accent: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, emissive: profile.accent, emissiveIntensity: 0.13, metalness: profile.accentMetalness ?? (organic ? 0.12 : 0.65), roughness: profile.accentRoughness ?? (organic ? 0.6 : 0.28), side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, emissive: profile.accent, emissiveIntensity: 0.04, metalness: profile.darkMetalness ?? (organic ? 0.03 : 0.45), roughness: organic ? 0.72 : 0.46, side: THREE.DoubleSide }),
    eye: new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, toneMapped: false }),
    glow: new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, blending: THREE.AdditiveBlending, toneMapped: false })
  };
  const palette = { body: profile.body, accent: profile.accent, dark: profile.hair || '#263447', eye: profile.eye, glow: profile.accent };
  const batches = new Map(Object.keys(materials).map(key => [key, []]));
  function registerGeometry(name, geometry, material, tint) {
    const joint = new Float32Array(geometry.attributes.position.count);
    // The clasped hands must move together; the source rodent holds its blade
    // on the opposite side to the generic warrior. Rotation is around X, so
    // the existing rig pivot remains valid for either shoulder at y=2.37.
    const anatomicalJoint = profile.anatomy === 'mystical-elf-prayer' && /^prayer-/.test(name)
      ? HOLOGRAM_JOINTS.STAFF
      : profile.anatomy === 'blue-armored-rodent' && /^beaver-sword-(?:arm|hand|fist)/.test(name)
        ? HOLOGRAM_JOINTS.WEAPON
        : profile.anatomy === 'red-armored-bull' && /^(?:ox-gripping-|axe-)/.test(name)
          ? HOLOGRAM_JOINTS.WEAPON
          : profile.anatomy === 'asymmetric-jester' && /^clown-casting-/.test(name)
            ? HOLOGRAM_JOINTS.STAFF : resolveHologramPartJoint(name);
    joint.fill(anatomicalJoint);
    geometry.setAttribute('hologramJoint', new THREE.BufferAttribute(joint, 1));
    if (!geometry.attributes.color) {
      const vertexColor = new THREE.Color(tint || palette[material]);
      const colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = vertexColor.r; colors[i + 1] = vertexColor.g; colors[i + 2] = vertexColor.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    batches.get(material).push(geometry);
    root.userData.partNames.push(name);
  }
  function part(name, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0], tint) {
    const transform = new THREE.Object3D();
    transform.position.set(...position);
    transform.scale.set(...scale);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    geometry.applyMatrix4(transform.matrix);
    // All families use indexed positions, normals and UVs, including membranes.
    registerGeometry(name, geometry, material, tint);
  }
  // Smooth visible anatomy with UV latitude rings. Tokens keep their own
  // economical tiny glints; crystalline stone keeps its faceted surface.
  const smoothAnatomy = profile.family !== 'token' && profile.family !== 'rock';
  const sphere = (name, material, position, scale, detail = 1, tint) => {
    const resolution = detail >= 2 ? [20, 12] : detail === 1 ? [12, 8] : [8, 6];
    const geometry = profile.family === 'token' && detail > 0
      ? new THREE.SphereGeometry(1, 20, 12)
      : smoothAnatomy ? new THREE.SphereGeometry(1, ...resolution)
        : new THREE.IcosahedronGeometry(1, detail);
    part(name, geometry, material, position, scale, undefined, tint);
  };
  const box = (name, material, position, scale, rotation, tint) => part(name, new THREE.BoxGeometry(1, 1, 1), material, position, scale, rotation, tint);
  const cone = (name, material, position, scale, rotation, tint) => part(name, new THREE.ConeGeometry(1, 1, smoothAnatomy ? 20 : 10), material, position, scale, rotation, tint);
  const ring = (name, material, position, radius, rotation = [Math.PI / 2, 0, 0], tube = 0.025, tint) => part(name, new THREE.TorusGeometry(radius, tube, 5, 28), material, position, [1, 1, 1], rotation, tint);
  function rod(name, material, start, end, radius = 0.075, endRadius = radius, tint) {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const direction = b.clone().sub(a);
    const transform = new THREE.Object3D();
    transform.position.copy(a.add(b).multiplyScalar(0.5));
    transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    transform.updateMatrix();
    const geometry = new THREE.CylinderGeometry(endRadius, radius, direction.length(), smoothAnatomy ? 16 : 8);
    geometry.applyMatrix4(transform.matrix);
    registerGeometry(name, geometry, material, tint);
  }
  function membrane(name, material, vertices, tint) {
    const shape = new THREE.Shape();
    vertices.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const geometry = smoothAnatomy
      ? new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: false, steps: 1, curveSegments: 1 })
      : new THREE.ShapeGeometry(shape);
    if (smoothAnatomy) geometry.translate(0, 0, -0.0225);
    part(name, geometry, material, [0, 0, -0.14], undefined, undefined, tint);
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
    if(profile.id==='junk-synchron') {
      const orange='#e67b37',pale='#e9ebe7',dark='#2a3439',brass='#c5b478';
      sphere('junk-rounded-black-torso','dark',[0,1.94,0],[.48,.56,.31],2,dark);
      box('junk-riveted-orange-chest','body',[0,2.025,.273],[.64,.89,.119],undefined,orange);
      sphere('junk-white-face-mask','accent',[0,2.8,.045],[.31,.31,.261],2,pale);
      part('junk-tall-orange-cylinder-hat',new THREE.CylinderGeometry(.35,.36,.66,24,1,false),'body',[0,3.176,.04],undefined,[0,0,-.045],orange);
      part('junk-recessed-hat-rim',new THREE.TorusGeometry(.335,.037,6,24),'accent',[0,3.498,.04],undefined,[Math.PI/2,0,-.045],'#f0bc64');
      sphere('junk-hat-small-dent','body',[.203,3.302,.329],[.052,.077,.016],1,'#ed9952');
      box('junk-eyes-black-slit','dark',[0,2.844,.284],[.51,.108,.041],undefined,dark);
      sphere('junk-scarf-padded-neck-ring','accent',[0,2.59,.03],[.393,.132,.328],2,pale);
      membrane('junk-left-streaming-scarf','accent',[[-.17,2.64],[-.52,2.95],[-.8,3.35],[-.72,2.93],[-.4,2.51]],pale);
      membrane('junk-right-streaming-scarf','accent',[[.17,2.64],[.54,2.91],[.9,3.04],[.83,2.72],[.48,2.53]],pale);
      for(const side of[-1,1]) {
        sphere(`junk-tired-eye-${side}`,'eye',[side*.116,2.832,.314],[.074,.045,.018],1,'#eddfbc');
        rod(`junk-dark-drooping-eyelid-${side}`,'dark',[side*.067,2.876,.316],[side*.17,2.86,.302],.018,.014,dark);
        sphere(`junk-large-orange-pauldron-${side}`,'body',[side*.6,2.356,.027],[.33,.365,.309],2,orange);
        part(`gear-${side}`,new THREE.TorusGeometry(.174,.044,6,20),'accent',[side*.623,2.36,.282],undefined,[0,0,0],brass);
        sphere(`gear-${side}-dark-center`,'dark',[side*.623,2.36,.301],[.114,.114,.033],1,dark);
        rod(`upper-arm-${side}-junk-dark-sleeve`,'dark',[side*.62,2.196,.048],[side*.823,1.92,.189],.173,.159,dark);
        rod(`gauntlet-${side}-junk-orange`,'body',[side*.823,1.92,.189],[side*.852,1.616,.379],.2,.16,orange);
        sphere(`hand-${side}-junk-brass-glove`,'accent',[side*.854,1.515,.436],[.178,.159,.145],1,brass);
        for(let f=0;f<4;f++) sphere(`hand-${side}-junk-rounded-knuckle-${f}`,'accent',[side*.854+(f-1.5)*.073,1.498,.549],[.036,.06,.031],1,'#ddd1a3');
        rod(`junk-dark-thigh-${side}`,'dark',[side*.223,1.47,0],[side*.345,.9,.03],.206,.157,dark);
        sphere(`junk-brass-knee-${side}`,'accent',[side*.35,.852,.141],[.147,.147,.09],1,brass);
        rod(`junk-short-black-shin-${side}`,'dark',[side*.35,.846,.043],[side*.414,.327,.126],.153,.126,dark);
        sphere(`junk-rounded-orange-shoe-${side}`,'body',[side*.416,.251,.238],[.293,.237,.379],2,orange);
        sphere(`junk-shoe-round-rivet-${side}`,'accent',[side*.416,.354,.562],[.042,.045,.022],1,brass);
        for(let i=0;i<3;i++) sphere(`junk-chest-rivet-${side}-${i}`,'accent',[side*.244,1.747+i*.284,.351],[.027,.027,.022],1,brass);
      }
      return;
    }
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

  const helpers = { part, sphere, box, cone, ring, rod, membrane };
  const refined = buildTokenMonsterAnatomy(profile, helpers)
    || buildPopularGodMonsterAnatomy(profile, helpers)
    || buildPopularStapleAnatomy(profile, helpers)
    || buildReferenceMonsterAnatomy(profile, helpers);
  if (refined) {
    root.userData.referenceArt = profile.referenceArt;
  } else if (profile.family === 'dragon') {
    sphere('dragon-breast', 'body', [0, 1.67, 0], [0.55, 0.85, 0.55]);
    sphere('dragon-belly', 'accent', [0, 1.5, 0.42], [0.37, 0.59, 0.12]);
    for (let i = 0; i < 5; i += 1) ring(`belly-scale-${i}`, 'body', [0, 1.2 + i * 0.19, 0.34], 0.28 + Math.sin(i / 5 * Math.PI) * 0.08, [Math.PI / 2, 0, 0], 0.028);
    const heads = profile.heads || 1;
    for (let h = 0; h < heads; h += 1) {
      const x = heads > 1 ? (h - 1) * 0.66 : 0;
      rod(`neck-${h}`, 'body', [x * 0.4, 2.1, 0], [x, 3.06 + (h === 1 ? 0.12 : 0), 0.16], 0.26, 0.18);
      sphere(`dragon-head-${h}`, 'body', [x, 3.12, 0.32], [profile.baby?.43:.3, profile.baby?.39:.29, .42]);
      sphere(`dragon-muzzle-${h}`, 'body', [x, 2.99, 0.63], [profile.baby?.31:.23, profile.baby?.21:.15, .29]);
      box(`jaw-${h}`, 'dark', [x, 2.91, 0.72], [0.35, 0.026, 0.36]);
      for (const side of [-1, 1]) {
        sphere(`dragon-eye-${h}-${side}`, 'eye', [x + side * 0.23, 3.18, 0.57], [profile.baby?.105:.067, profile.baby?.15:.045, .065],1,profile.baby?'#4a8ad0':undefined);
        if(profile.baby) sphere(`baby-dragon-glossy-eye-highlight-${side}`,'eye',[x+side*.233,3.228,.627],[.031,.047,.013],1,'#fff8ef');
        cone(`dragon-horn-${h}-${side}`, 'accent', [x + side * 0.2, 3.43, 0.18], [0.085, profile.baby?.31:.51, 0.085], [-0.3, 0, side * -0.2]);
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
    const tuftCount = profile.family === 'kuriboh' ? 90 : 64;
    for (let i = 0; i < tuftCount; i += 1) {
      const angle = i * 2.399963;
      const y = 1 - i * 2 / tuftCount;
      const radial = Math.sqrt(1 - y * y);
      const axis = new THREE.Vector3(Math.cos(angle) * radial, y, Math.sin(angle) * radial);
      // Printed faces are clear; reserve dense fur for the outline and back.
      if(axis.z > .35 && Math.abs(axis.x) < .55 && axis.y > -.55 && axis.y < .85) continue;
      const geometry = new THREE.ConeGeometry(profile.family === 'kuriboh' ? .085 : .105, profile.family === 'kuriboh' ? .31 : .23, 8);
      const transform = new THREE.Object3D();
      transform.position.set(axis.x * 0.74, 1.1 + axis.y * 0.75, axis.z * 0.61);
      transform.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      transform.updateMatrix();
      geometry.applyMatrix4(transform.matrix);
      registerGeometry(`fur-tuft-${i}`, geometry, i % 3 ? 'body' : 'accent', profile.family === 'sangan' ? (i % 3 ? '#9e4d30' : '#2d231f') : undefined);
    }
    if (profile.family === 'sangan') {
      sphere('sangan-third-eye', 'eye', [0, 1.69, 0.61], [0.18, 0.21, 0.09], 1, '#e4b95c');
      sphere('sangan-third-pupil', 'dark', [0, 1.69, 0.7], [0.022, 0.15, 0.025], 1, '#181614');
      box('sangan-mouth', 'dark', [0, 0.94, 0.67], [0.68, 0.19, 0.04]);
      for(let i=0;i<8;i++) {
        cone(`sangan-upper-serrated-tooth-${i}`,'accent',[-.294+i*.084,1.015,.71],[.042,.11,.026],[Math.PI,0,0],'#e5dcc5');
        cone(`sangan-lower-serrated-tooth-${i}`,'accent',[-.284+i*.081,.863,.71],[.037,.091,.024],undefined,'#e5dcc5');
      }
      for (const side of [-1, 1]) cone(`sangan-fang-${side}`, 'accent', [side * 0.09, 0.89, 0.69], [0.04, 0.15, 0.03], [Math.PI, 0, 0]);
    }
    for (const side of [-1, 1]) {
      sphere(`wide-eye-${side}`, 'eye', [side * 0.25, 1.34, 0.61], [0.17, 0.21, 0.09], 1, profile.family === 'sangan' ? '#e4b95c' : profile.eye);
      if(profile.family==='kuriboh') part(`kuriboh-golden-eye-rim-${side}`,new THREE.TorusGeometry(.173,.025,6,24),'accent',[side*.25,1.34,.676],[1,1.13,1],undefined,'#eac459');
      sphere(`pupil-${side}`, 'dark', [side * 0.25, 1.32, 0.69], [profile.family==='sangan'?.021:.061, 0.14, 0.032],1,profile.family==='sangan'?'#181614':'#573689');
      sphere(`paw-${side}`, 'accent', [side * 0.6, 0.45, 0.4], [0.24, 0.14, 0.29],1,'#438652');
      const sangan=profile.family==='sangan',handY=sangan?1.93:1.11,clawColor=sangan?'#d5d0de':'#e3c07b';
      sphere(`fur-green-hand-${side}`,'body',[side*.76,handY,.387],[.166,.185,.171],1,'#438652');
      if(sangan) rod(`sangan-raised-green-wrist-${side}`,'body',[side*.62,1.576,.139],[side*.76,1.886,.317],.081,.111,'#438652');
      for(let finger=0;finger<3;finger++) {
        const x=side*.76+(finger-1)*.082,tipY=handY+(sangan?.187:-.187);
        rod(`fur-green-finger-${side}-${finger}`,'body',[x,handY-.005,.499],[x+(finger-1)*.016,tipY,.537],.044,.033,'#438652');
        cone(`fur-illustrated-hand-claw-${side}-${finger}`,'accent',[x+(finger-1)*.016,tipY+(sangan?.054:-.054),.579],[.026,.16,.029],[sangan?.32:Math.PI-.32,0,0],clawColor);
      }
      for (let i = 0; i < 3; i += 1) cone(`paw-claw-${side}-${i}`, 'body', [side * 0.6 + (i - 1) * 0.1, 0.44, 0.67], [0.045, 0.23, 0.045], [Math.PI / 2, 0, 0], clawColor);
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
