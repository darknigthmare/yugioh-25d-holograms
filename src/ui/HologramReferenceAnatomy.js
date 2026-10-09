import * as THREE from 'three';

/** Volumes interpreted from the checked local illustration, without textures. */
export function buildReferenceMonsterAnatomy(profile, build) {
  const { part, sphere, box, cone, ring, rod, membrane } = build;
  const compactRing = (name, material, position, radius, rotation = [Math.PI / 2, 0, 0], tint, scale = [1, 1, 1]) =>
    part(name, new THREE.TorusGeometry(radius, 0.024, 4, 16), material, position, scale, rotation, tint);
  const ribbon = (name, material, points, width, tint) => {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    part(name, new THREE.TubeGeometry(curve, 12, width, 5, false), material, [0, 0, 0], undefined, undefined, tint);
  };

  if (profile.anatomy === 'armored-blue-dragon' || profile.anatomy === 'spiked-black-dragon') {
    const black = profile.anatomy === 'spiked-black-dragon';
    const plate = black ? '#68667f' : '#dfedf0';
    const tooth = black ? '#aaa6b1' : '#f0f5f2';
    sphere('dragon-breast', 'body', [0, 1.55, -0.09], [0.48, 0.76, 0.43]);
    sphere('dragon-pelvic-armor', 'body', [0, 0.99, -0.17], [0.49, 0.43, 0.43]);
    sphere('dragon-belly', 'accent', [0, 1.54, 0.31], [0.31, 0.63, 0.12]);
    for (let i = 0; i < 5; i += 1) box(`belly-scale-${i}`, 'accent', [0, 1.14 + i * 0.2, 0.39], [0.46 - Math.abs(2 - i) * 0.04, 0.115, 0.08], [0.05, 0, 0], plate);
    const neck = [[0, 1.91, -0.04], [0, 2.25, -0.03], [0, 2.6, 0.02], [0, 2.9, 0.16], [0, 3.11, 0.3]];
    for (let i = 1; i < neck.length; i += 1) {
      rod(`neck-${i - 1}`, 'body', neck[i - 1], neck[i], 0.21 - i * 0.013, 0.2 - i * 0.013);
      compactRing(`neck-collar-${i}`, 'accent', [0, neck[i][1] - 0.08, neck[i][2]], 0.19 - i * 0.008, [Math.PI / 2 + i * 0.055, 0, 0], plate);
    }
    const outline = new THREE.Shape();
    const points = black
      ? [[-0.29, 0.07], [-0.05, 0.3], [0.43, 0.16], [0.9, -0.07], [1.06, -0.29], [0.58, -0.12], [0.02, -0.18]]
      : [[-0.27, 0.04], [-0.1, 0.3], [0.39, 0.24], [0.79, 0.02], [0.79, -0.16], [0.16, -0.12]];
    points.forEach(([x, y], index) => index ? outline.lineTo(x, y) : outline.moveTo(x, y));
    outline.closePath();
    part('dragon-head-0', new THREE.ExtrudeGeometry(outline, { depth: 0.44, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1, steps: 1 }), 'body', [0.22, 3.1, 0.23], undefined, [0, -Math.PI / 2, 0]);
    sphere('dragon-muzzle-0', 'body', [0, 3.03, black ? 0.98 : 0.82], [0.21, 0.12, 0.24]);
    box('jaw-0', 'dark', [0, 2.86, 0.77], [0.34, 0.1, black ? 0.72 : 0.48], [-0.1, 0, 0], black ? '#392738' : '#457084');
    for (const side of [-1, 1]) {
      sphere(`dragon-eye-0-${side}`, 'eye', [side * 0.235, 3.23, 0.54], [0.038, black ? 0.024 : 0.055, 0.075]);
      sphere(`dragon-eye-pupil-${side}`, 'dark', [side * 0.264, 3.232, 0.555], [0.015, 0.04, 0.025], 0, '#071b2b');
      for (let toothIndex = 0; toothIndex < 5; toothIndex += 1) {
        cone(`fang-0-${side}-${toothIndex}`, 'accent', [side * 0.16, 2.88, 0.5 + toothIndex * 0.103], [0.025, 0.105, 0.026], [Math.PI, 0, 0], tooth);
      }
      rod(`dragon-horn-0-${side}`, 'accent', [side * 0.14, 3.31, 0.15], [side * 0.31, black ? 3.89 : 3.72, -0.38], 0.1, 0.015, plate);
      for (let fin = 0; fin < (black ? 3 : 2); fin += 1) rod(`dragon-cheek-fin-${side}-${fin}`, 'body', [side * 0.2, 3.06 + fin * 0.13, 0.19], [side * (0.51 + fin * 0.08), 3.12 + fin * 0.18, -0.42], 0.07, 0.006);
      sphere(`dragon-shoulder-armor-${side}`, 'body', [side * 0.5, 1.92, 0.02], [0.24, 0.32, 0.28]);
      rod(`foreleg-${side}`, 'body', [side * 0.47, 1.89, 0.15], [side * 0.73, 1.45, 0.59], 0.12, 0.105);
      sphere(`foreleg-elbow-${side}`, 'accent', [side * 0.73, 1.45, 0.59], [0.15, 0.15, 0.15]);
      rod(`dragon-wrist-${side}`, 'body', [side * 0.73, 1.44, 0.59], [side * 0.6, 1.18, 0.87], 0.1, 0.085);
      for (let claw = 0; claw < 3; claw += 1) rod(`foreclaw-${side}-${claw}`, 'accent', [side * 0.6 + (claw - 1) * 0.11, 1.18, 0.87], [side * 0.64 + (claw - 1) * 0.14, 0.94, 1.19], 0.05, 0.008, tooth);
      sphere(`haunch-${side}`, 'body', [side * 0.46, 0.83, -0.07], [0.33, 0.46, 0.38]);
      rod(`hindleg-${side}`, 'body', [side * 0.46, 0.8, 0.02], [side * 0.57, 0.3, 0.39], 0.18, 0.13);
      sphere(`dragon-foot-${side}`, 'body', [side * 0.57, 0.24, 0.55], [0.29, 0.15, 0.39]);
      for (let claw = 0; claw < 3; claw += 1) rod(`claw-${side}-${claw}`, 'accent', [side * 0.57 + (claw - 1) * 0.15, 0.23, 0.79], [side * 0.59 + (claw - 1) * 0.16, 0.12, 1.04], 0.055, 0.006, tooth);
      const shoulder = [side * 0.28, 2.25, -0.2];
      const elbow = [side * 1.0, 3.5, -0.14];
      const tip = [side * 2.17, black ? 4.06 : 3.81, -0.14];
      rod(`wing-${side}-arm`, 'body', shoulder, elbow, 0.13, 0.07);
      rod(`wing-${side}-tip`, 'accent', elbow, tip, 0.07, 0.015, plate);
      membrane(`wing-${side}-membrane`, 'dark', [[shoulder[0], shoulder[1]], [elbow[0], elbow[1]], [tip[0], tip[1]], [side * 1.75, 2.41], [side * 1.53, 2.63], [side * 1.08, 1.84], [side * 0.85, 2.01], [side * 0.34, 1.55]], profile.membrane);
      for (const [index, x, y] of [[0, 1.75, 2.41], [1, 1.08, 1.84], [2, 0.34, 1.55]]) rod(`wing-${side}-rib-${index}`, 'accent', elbow, [side * x, y, -0.12], 0.035, 0.018, plate);
      if (black) for (let spike = 0; spike < 3; spike += 1) rod(`wing-${side}-edge-spike-${spike}`, 'body', [side * (0.87 + spike * 0.3), 3.51 + spike * 0.13, -0.14], [side * (1.09 + spike * 0.3), 3.96 + spike * 0.17, -0.17], 0.07, 0.006);
    }
    const tail = [[0, 1, -0.39], [0.22, 0.6, -0.93], [0.63, 0.34, -1.44], [1.09, 0.43, -1.74], [1.37, black ? 0.94 : 0.69, -1.82]];
    for (let i = 1; i < tail.length; i += 1) rod(`tail-${i}`, 'body', tail[i - 1], tail[i], 0.2 / i, 0.14 / i);
    for (let i = 0; i < (black ? 8 : 5); i += 1) rod(`spine-${i}`, 'accent', [0, 2.77 - i * 0.2, -0.17 - i * 0.04], [0, 2.93 - i * 0.2, -0.5 - i * 0.07], 0.08, 0.006, plate);
    return true;
  }

  if (profile.anatomy === 'armored-dark-magician' || profile.anatomy === 'dark-magician-girl') {
    const girl = profile.anatomy === 'dark-magician-girl';
    const skin = profile.skin;
    sphere('mage-torso', 'body', [0, 2.13, 0], [0.39, 0.5, 0.27]);
    sphere('mage-face', 'body', [0, 2.91, 0.07], [0.235, 0.29, 0.225], 1, skin);
    sphere('mage-nose', 'body', [0, 2.86, 0.295], [0.037, 0.057, 0.05], 0, skin);
    box('mage-mouth', 'dark', [0, 2.76, 0.279], [0.076, 0.019, 0.017], undefined, '#764851');
    for (const side of [-1, 1]) {
      sphere(`eye-${side}`, 'eye', [side * 0.096, 2.95, 0.277], [girl ? 0.061 : 0.036, girl ? 0.072 : 0.027, 0.024]);
      sphere(`eye-pupil-${side}`, 'dark', [side * 0.096, 2.95, 0.298], [0.015, 0.035, 0.009], 0, '#152334');
      sphere(`mage-ear-${side}`, 'body', [side * 0.234, 2.92, 0.085], [0.044, 0.074, 0.05], 0, skin);
      sphere(`pauldron-${side}`, 'body', [side * 0.49, 2.43, 0], [girl ? 0.23 : 0.31, 0.2, 0.25]);
      compactRing(`pauldron-trim-${side}`, 'accent', [side * 0.5, 2.43, 0.12], girl ? 0.17 : 0.23, [0, 0, 0]);
      rod(`mage-arm-${side}`, 'body', [side * 0.43, 2.41, 0], [side * 0.73, 1.96, 0.26], 0.105, 0.09, girl ? skin : undefined);
      rod(`mage-glove-${side}`, 'body', [side * 0.73, 1.96, 0.26], [side * 0.88, 1.73, 0.45], 0.13, 0.085);
      compactRing(`mage-glove-band-${side}`, 'accent', [side * 0.75, 1.94, 0.28], 0.13, [0.2, 0, 0.35 * side]);
      sphere(`mage-hand-${side}`, 'body', [side * 0.89, 1.68, 0.48], [0.11, 0.13, 0.1], 1, skin);
      rod(`mage-shin-${side}`, 'body', [side * 0.21, 0.9, 0.01], [side * 0.25, 0.26, 0.12], 0.11, 0.1, girl ? skin : undefined);
      sphere(`mage-pointed-boot-${side}`, 'body', [side * 0.25, 0.22, 0.31], [0.16, 0.17, 0.34]);
      compactRing(`mage-boot-band-${side}`, 'accent', [side * 0.25, 0.54, 0.08], 0.12);
      if (girl) {
        ribbon(`hair-long-lock-${side}`, 'dark', [[side * 0.23, 3.1, 0.09], [side * 0.31, 2.78, 0.03], [side * 0.48, 2.49, -0.16], [side * 0.71, 2.36, -0.51]], 0.095, profile.hair);
        ribbon(`hair-front-lock-${side}`, 'dark', [[side * 0.11, 3.17, 0.21], [side * 0.21, 2.89, 0.2], [side * 0.25, 2.57, 0.13]], 0.057, profile.hair);
      } else {
        membrane(`helmet-cheekguard-${side}`, 'body', [[side * 0.19, 3.1], [side * 0.31, 2.82], [side * 0.16, 2.66], [side * 0.12, 2.79]]);
      }
    }
    // The armor is segmented rather than a single featureless cone.
    cone('layered-robe', 'body', [0, girl ? 1.42 : 1.15, 0], [girl ? 0.54 : 0.62, girl ? 0.65 : 1.22, 0.4]);
    compactRing('robe-hem', 'accent', [0, girl ? 1.15 : 0.58, 0], girl ? 0.47 : 0.56, undefined, undefined, [1, 1, 0.72]);
    compactRing('mage-waist-band', 'accent', [0, 1.76, 0], 0.34, undefined, undefined, [1, 1, 0.72]);
    if (girl) {
      sphere('mage-neckline-jewel', 'eye', [0, 2.39, 0.27], [0.08, 0.095, 0.035], 1, '#e73c4a');
      compactRing('mage-belt-star-ring', 'accent', [0, 1.72, 0.27], 0.13, [0, 0, 0]);
      for (let i = 0; i < 5; i += 1) {
        const a = i * Math.PI * 0.4;
        const b = a + Math.PI * 0.8;
        rod(`mage-belt-star-${i}`, 'accent', [Math.sin(a) * 0.1, 1.72 + Math.cos(a) * 0.1, 0.29], [Math.sin(b) * 0.1, 1.72 + Math.cos(b) * 0.1, 0.29], 0.008, 0.008, profile.staffColor);
      }
      sphere('hair-crown', 'dark', [0, 3.11, -0.04], [0.26, 0.18, 0.24], 1, profile.hair);
    } else {
      for (const side of [-1, 1]) {
        membrane(`layered-skirt-plate-${side}`, 'body', [[side * 0.14, 1.77], [side * 0.65, 1.48], [side * 0.58, 0.72], [side * 0.19, 0.79]]);
        const curl = [];
        for (let i = 0; i <= 18; i += 1) {
          const angle = i / 18 * Math.PI * 3;
          const r = 0.012 + i / 18 * 0.16;
          curl.push([side * 0.3 + Math.cos(angle) * r, 1.26 + Math.sin(angle) * r, 0.395]);
        }
        ribbon(`robe-spiral-${side}`, 'accent', curl, 0.018);
      }
    }
    cone('pointed-hat', 'body', [girl ? 0.06 : 0.02, 3.61, -0.11], [girl ? 0.38 : 0.34, 1.22, 0.3], [-0.2, 0, girl ? -0.2 : -0.12]);
    compactRing('hat-brim', 'accent', [0, 3.18, 0], girl ? 0.34 : 0.3);
    for (let i = 0; i < 3; i += 1) compactRing(`hat-gilding-${i}`, 'accent', [0.02, 3.28 + i * 0.22, -0.025 - i * 0.03], 0.245 - i * 0.052, [Math.PI / 2 + 0.1, 0, 0]);
    if (girl) {
      compactRing('hat-ear-spiral', 'accent', [0.3, 3.21, 0.04], 0.14, [0, Math.PI / 2, 0]);
      rod('staff', 'body', [0.91, 0.55, 0.49], [0.91, 3.03, 0.49], 0.044, 0.044, profile.staffColor);
      compactRing('staff-crown', 'accent', [0.91, 3.15, 0.49], 0.2, [0, 0, 0], profile.staffColor);
      const spiral = [];
      for (let i = 0; i <= 20; i += 1) { const a = i / 20 * Math.PI * 3.6; const r = i / 20 * 0.16; spiral.push([0.91 + Math.cos(a) * r, 3.15 + Math.sin(a) * r, 0.49]); }
      ribbon('staff-gold-spiral', 'accent', spiral, 0.022, profile.staffColor);
      sphere('staff-crystal', 'eye', [0.91, 3.15, 0.49], [0.035, 0.04, 0.035], 0, '#fff3c3');
    } else {
      rod('staff', 'body', [0.91, 0.23, 0.49], [0.91, 3.18, 0.49], 0.05, 0.05, profile.staffColor);
      for (const y of [0.7, 1.1, 1.55, 2.02, 2.57]) compactRing(`staff-band-${y}`, 'accent', [0.91, y, 0.49], 0.055, undefined, '#7ddf9b');
      sphere('staff-crown', 'body', [0.91, 3.36, 0.49], [0.18, 0.35, 0.105], 1, profile.staffColor);
      compactRing('staff-crown-border', 'accent', [0.91, 3.36, 0.58], 0.21, [0, 0, 0], '#b1e7b6', [0.74, 1.38, 1]);
      sphere('staff-crystal', 'eye', [0.91, 3.35, 0.595], [0.085, 0.095, 0.045], 1, '#c5e767');
    }
    return true;
  }
  if (profile.anatomy === 'sparkman') {
    const silver = '#a4c5c8';
    const gold = '#d9c373';
    const gem = '#e9a12b';
    sphere('sparkman-torso', 'body', [0, 2.02, 0], [0.48, 0.7, 0.28]);
    cone('sparkman-chest-chevron', 'accent', [0, 2.13, 0.26], [0.51, 0.72, 0.1], [Math.PI, 0, 0], silver);
    rod('sparkman-chest-gold-line', 'accent', [-0.42, 2.32, 0.35], [0, 1.78, 0.38], 0.045, 0.045, gold);
    rod('sparkman-chest-gold-line-2', 'accent', [0.42, 2.32, 0.35], [0, 1.78, 0.38], 0.045, 0.045, gold);
    sphere('sparkman-neck', 'body', [0, 2.73, 0], [0.18, 0.2, 0.18]);
    sphere('sparkman-helmet', 'accent', [0, 3.07, 0], [0.27, 0.38, 0.27], 1, silver);
    cone('sparkman-faceplate-point', 'accent', [0, 3.04, 0.22], [0.235, 0.71, 0.06], [Math.PI, 0, 0], silver);
    box('sparkman-visor', 'dark', [0, 3.03, 0.282], [0.32, 0.048, 0.02], undefined, '#183a4c');
    sphere('sparkman-visor-light', 'eye', [0, 3.03, 0.3], [0.075, 0.025, 0.012]);
    for (const side of [-1, 1]) {
      rod(`sparkman-antenna-${side}`, 'accent', [side * 0.2, 3.2, -0.03], [side * 0.27, 3.87, -0.14], 0.055, 0.009, gold);
      sphere(`sparkman-shoulder-${side}`, 'accent', [side * 0.65, 2.45, -0.01], [0.36, 0.37, 0.34], 1, silver);
      compactRing(`sparkman-shoulder-rim-${side}`, 'accent', [side * 0.66, 2.5, 0.23], 0.25, [0, 0, 0], gold);
      sphere(`sparkman-shoulder-gem-${side}`, 'accent', [side * 0.68, 2.55, 0.28], [0.12, 0.12, 0.063], 1, gem);
      rod(`upper-arm-${side}`, 'body', [side * 0.67, 2.37, 0], [side * 0.96, 1.99, 0.19], 0.17, 0.14);
      rod(`gauntlet-${side}`, 'accent', [side * 0.96, 1.99, 0.19], [side * 1.09, 1.64, 0.42], 0.23, 0.16, silver);
      compactRing(`gauntlet-${side}-gold-band`, 'accent', [side * 1.04, 1.79, 0.32], 0.2, [0.45, 0, 0.25 * side], gold);
      sphere(`hand-${side}`, 'body', [side * 1.1, 1.56, 0.5], [0.19, 0.21, 0.1]);
      sphere(`hand-${side}-palm-energy`, 'eye', [side * 1.1, 1.57, 0.61], [0.07, 0.08, 0.027]);
      compactRing(`hand-${side}-palm-corona`, 'glow', [side * 1.1, 1.57, 0.63], 0.11, [0, 0, 0], '#9afdf4');
      for (let finger = 0; finger < 4; finger += 1) rod(`hand-${side}-finger-${finger}`, 'body', [side * 1.1 + (finger - 1.5) * 0.09, 1.48, 0.5], [side * 1.1 + (finger - 1.5) * 0.12, 1.16, 0.55], 0.035, 0.026);
      rod(`hand-${side}-thumb`, 'body', [side * 0.96, 1.62, 0.5], [side * 0.79, 1.43, 0.6], 0.046, 0.03);
      rod(`sparkman-thigh-${side}`, 'body', [side * 0.23, 1.37, 0], [side * 0.38, 0.84, 0.04], 0.2, 0.16);
      rod(`sparkman-shin-${side}`, 'body', [side * 0.38, 0.85, 0.04], [side * 0.42, 0.24, 0.11], 0.16, 0.12);
      sphere(`sparkman-boot-${side}`, 'body', [side * 0.42, 0.18, 0.29], [0.17, 0.17, 0.36]);
      ribbon(`sparkman-shin-lightning-${side}`, 'accent', [[side * 0.38, 0.95, 0.21], [side * 0.5, 0.78, 0.22], [side * 0.32, 0.63, 0.24], [side * 0.43, 0.39, 0.25]], 0.038, gold);
      box(`sparkman-back-fin-${side}`, 'body', [side * 0.72, 2.72, -0.37], [0.33, 1.51, 0.12], [0, 0, side * -0.12]);
      rod(`sparkman-back-fin-border-${side}`, 'accent', [side * 0.55, 2.02, -0.3], [side * 0.63, 3.45, -0.3], 0.025, 0.025, gold);
    }
    for (let i = 0; i < 3; i += 1) sphere(`sparkman-waist-gem-${i}`, 'accent', [0.17, 1.47 + i * 0.16, 0.29], [0.075, 0.075, 0.035], 1, gem);
    return true;
  }
  if (profile.anatomy === 'slime-toad') {
    part('slime-toad-body', new THREE.SphereGeometry(1, 24, 16), 'body', [0, 0.86, -0.04], [0.86, 0.68, 0.6]);
    sphere('slime-toad-throat', 'accent', [0, 0.62, 0.42], [0.62, 0.42, 0.21], 2, '#438e69');
    ribbon('slime-toad-downturned-mouth', 'dark', [[-0.65, 0.9, 0.5], [-0.35, 1.09, 0.63], [0, 1.14, 0.65], [0.35, 1.09, 0.63], [0.65, 0.9, 0.5]], 0.067, '#091d14');
    ribbon('slime-toad-lower-lip', 'body', [[-0.63, 0.8, 0.52], [-0.29, 0.98, 0.67], [0, 1.01, 0.72], [0.29, 0.98, 0.67], [0.63, 0.8, 0.52]], 0.057, '#25875c');
    for (const side of [-1, 1]) {
      sphere(`slime-toad-eye-brow-${side}`, 'body', [side * 0.42, 1.4, 0.24], [0.27, 0.23, 0.24]);
      sphere(`slime-toad-eye-${side}`, 'eye', [side * 0.42, 1.4, 0.44], [0.18, 0.15, 0.045]);
      box(`slime-toad-eye-slit-${side}`, 'dark', [side * 0.42, 1.41, 0.485], [0.18, 0.018, 0.025], [0, 0, side * 0.13], '#122118');
      sphere(`slime-toad-nostril-${side}`, 'dark', [side * 0.075, 1.24, 0.59], [0.025, 0.045, 0.015], 0, '#091d14');
      sphere(`slime-toad-side-fold-${side}`, 'body', [side * 0.84, 0.37, -0.03], [0.4, 0.23, 0.39]);
      sphere(`slime-toad-foot-${side}`, 'body', [side * 0.97, 0.23, 0.23], [0.4, 0.14, 0.31]);
      for (let i = 0; i < 3; i += 1) sphere(`slime-toad-skin-spot-${side}-${i}`, 'dark', [side * (0.27 + i * 0.16), 1.14 - i * 0.14, -0.4], [0.065, 0.07, 0.028], 0, '#185d3d');
    }
    compactRing('slime-toad-belly-fold', 'body', [0, 0.42, 0.01], 0.67, undefined, '#17613e', [1.17, 1, 0.81]);
    return true;
  }
  if (profile.anatomy === 'shine-ball') {
    const pearl = new THREE.SphereGeometry(0.62, 24, 16);
    const colors = new Float32Array(pearl.attributes.position.count * 3);
    const a = new THREE.Color('#d7bee2');
    const b = new THREE.Color('#a4e1dd');
    const c = new THREE.Color('#f8faf0');
    const tint = new THREE.Color();
    for (let i = 0; i < pearl.attributes.position.count; i += 1) {
      const x = pearl.attributes.position.getX(i);
      const y = pearl.attributes.position.getY(i);
      tint.copy(a).lerp(b, (Math.sin(x * 8 + y * 5) + 1) * 0.5).lerp(c, 0.28);
      colors[i * 3] = tint.r; colors[i * 3 + 1] = tint.g; colors[i * 3 + 2] = tint.b;
    }
    pearl.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    part('shine-ball-opalescent-core', pearl, 'eye', [0, 1.15, 0]);
    sphere('shine-ball-aura', 'glow', [0, 1.15, 0], [0.72, 0.72, 0.72], 2, '#315665');
    for (let i = 0; i < 3; i += 1) compactRing(`shine-ball-cloud-orbit-${i}`, 'glow', [0, 0.55 + i * 0.55, 0], 0.95 - i * 0.13, [Math.PI / 2, 0, i * 0.13], '#f4ffff');
    return true;
  }
  if (profile.anatomy === 'metal-reflect-slime') {
    // The crop shows an irregular folded metallic mass surrounding a separate
    // spiked silver sphere, rather than the generic aquatic fish silhouette.
    const mass = [];
    for (let i = 0; i <= 40; i += 1) {
      const a = -2.2 + i / 40 * Math.PI * 2.8;
      const r = 1.15 + Math.sin(a * 2.1) * 0.14;
      mass.push(new THREE.Vector3(Math.cos(a) * r, 2.05 + Math.sin(a) * r, -0.22 + Math.sin(a * 2) * 0.2));
    }
    const curve = new THREE.CatmullRomCurve3(mass);
    const folded = new THREE.TubeGeometry(curve, 40, 0.32, 7, false);
    const color = new Float32Array(folded.attributes.position.count * 3);
    const shade = new THREE.Color('#4b4240'), bronze = new THREE.Color('#928477'), shine = new THREE.Color('#ede8df');
    const temp = new THREE.Color();
    for (let i = 0; i < folded.attributes.position.count; i += 1) {
      const t = folded.attributes.uv.getX(i), u = folded.attributes.uv.getY(i);
      const center = curve.getPointAt(t);
      const scale = 0.83 + 0.17 * Math.cos(t * Math.PI * 12);
      const p = new THREE.Vector3().fromBufferAttribute(folded.attributes.position, i).sub(center).multiplyScalar(scale).add(center);
      folded.attributes.position.setXYZ(i, p.x, p.y, p.z);
      temp.copy(shade).lerp(bronze, 0.62).lerp(shine, Math.max(0, Math.cos(u * Math.PI * 2 + t * Math.PI * 12)) ** 5 * 0.8);
      color.set([temp.r, temp.g, temp.b], i * 3);
    }
    folded.computeVertexNormals();folded.setAttribute('color', new THREE.BufferAttribute(color, 3));
    part('metal-slime-continuous-folded-coil', folded, 'body', [0, 0, 0]);
    for (let i = 0; i < 12; i += 1) {
      const a = i / 12 * Math.PI * 2;
      const center = [Math.cos(a) * 1.14, 2.05 + Math.sin(a) * 1.14, -0.09];
      sphere(`metal-slime-fold-${i}`, 'body', center, [0.3, 0.24, 0.28], 1, i % 3 ? '#9b8f84' : '#bdb2a8');
      ribbon(`metal-slime-bright-fold-ridge-${i}`, 'accent', [[center[0] - 0.15, center[1] - 0.11, 0.12], [center[0], center[1] + 0.13, 0.22], [center[0] + 0.16, center[1] + 0.18, 0.1]], 0.022, '#eee9e1');
    }
    ribbon('metal-slime-lower-drooping-extension', 'body', [[-0.75, 1.29, -0.05], [-1.17, 0.77, 0], [-1.03, 0.38, 0.11], [-1.33, 0.4, 0.3]], 0.19, '#9d9388');
    sphere('metal-slime-central-spiked-sphere', 'accent', [0.05, 1.94, 0.61], [0.64, 0.67, 0.57], 2, '#cddbdc');
    for (let i = 0; i < 9; i += 1) {
      const a = i / 9 * Math.PI * 2 + 0.12;
      const start = [0.05 + Math.sin(a) * 0.49, 1.94 + Math.cos(a) * 0.49, 0.64];
      const end = [0.05 + Math.sin(a) * (i === 4 ? 1.03 : 0.96), 1.94 + Math.cos(a) * (i === 4 ? 1.03 : 0.96), 0.8];
      rod(`metal-slime-silver-radial-spike-${i}`, 'accent', start, end, 0.15, 0.004, '#edf4ed');
      rod(`metal-slime-dark-spike-seam-${i}`, 'dark', [start[0] - 0.045, start[1], start[2] + 0.035], [end[0], end[1], end[2] + 0.012], 0.02, 0.002, '#26363c');
    }
    rod('metal-slime-forward-central-spike', 'accent', [0.14, 2.04, 1.08], [0.16, 2.36, 1.7], 0.17, 0.005, '#eef4eb');
    sphere('metal-slime-lower-spiked-droplet', 'accent', [0.03, 0.92, 0.69], [0.26, 0.28, 0.24], 1, '#bccdce');
    for (const side of [-1, 1]) rod(`metal-slime-lower-droplet-side-spike-${side}`, 'accent', [side * 0.12, 0.94, 0.68], [side * 0.5, 1.01, 0.73], 0.09, 0.003, '#e4ebe8');
    rod('metal-slime-long-downward-silver-point', 'accent', [0.03, 0.78, 0.69], [0.05, 0.14, 0.72], 0.12, 0.003, '#e4ebe8');
    // Red belongs to the illustration's radiating backdrop, not an invented eye.
    return true;
  }
  if (profile.anatomy === 'armored-cobra-apophis') {
    const gold = '#d9a82e', lightGold = '#f4d665', violet = '#966084', ivory = '#ede2b9';
    sphere('apophis-armored-torso', 'body', [0, 1.97, 0.1], [0.5, 0.7, 0.33]);
    sphere('apophis-serpent-lower-coil', 'body', [-0.15, 0.47, -0.15], [0.75, 0.34, 0.62]);
    const tailCurve = new THREE.CatmullRomCurve3([[-0.6, 0.55, -0.2], [-0.98, 0.3, 0.2], [-0.38, 0.24, 0.68], [0.31, 0.32, 0.47], [0.66, 0.4, -0.14]].map(p => new THREE.Vector3(...p)));
    part('apophis-coiled-tail', new THREE.TubeGeometry(tailCurve, 8, 0.18, 4, false), 'body', [0,0,0]);
    for (let i = 0; i < 8; i += 1) {
      sphere(`apophis-purple-ventral-plate-${i}`, 'dark', [0, 0.74 + i * 0.19, 0.36], [0.35 + i * 0.015, 0.13, 0.16], 0, violet);
      ribbon(`apophis-ventral-plate-seam-${i}`, 'dark', [[-0.27, 0.76 + i * 0.19, 0.45], [0, 0.72 + i * 0.19, 0.53], [0.27, 0.76 + i * 0.19, 0.45]], 0.015, '#3d273e');
    }
    const cobra = [[0.04, 1.14, -0.17], [0.31, 2.02, -0.46], [0.6, 2.88, -0.56], [0.58, 3.78, -0.5], [0.13, 4.18, -0.34], [-0.65, 4.08, -0.19], [-1.02, 3.93, 0.01]];
    const cobraCurve = new THREE.CatmullRomCurve3(cobra.map(p => new THREE.Vector3(...p)));
    part('apophis-rear-raised-cobra-neck', new THREE.TubeGeometry(cobraCurve, 24, 0.26, 6, false), 'body', [0, 0, 0]);
    for (let i = 0; i < 12; i += 1) {
      const p = cobraCurve.getPointAt(0.18 + i * 0.054);
      part(`apophis-rear-cobra-purple-belly-${i}`, new THREE.SphereGeometry(1, 8, 4), 'dark', [p.x, p.y, p.z + 0.24], [0.23, 0.105, 0.064], undefined, violet);
    }
    sphere('apophis-rear-cobra-skull', 'body', [-1.11, 3.97, 0.06], [0.37, 0.16, 0.27], 0, '#5e4c33');
    sphere('apophis-rear-cobra-open-jaw', 'dark', [-1.08, 3.69, 0.12], [0.29, 0.09, 0.25], 0, '#514224');
    for (const side of [-1, 1]) {
      sphere(`apophis-rear-cobra-red-eye-${side}`, 'eye', [-1.15 + side * 0.16, 4.03, 0.26], [0.05, 0.035, 0.026]);
      rod(`apophis-rear-cobra-ivory-fang-${side}`, 'accent', [-1.21 + side * 0.12, 3.92, 0.26], [-1.25 + side * 0.1, 3.61, 0.26], 0.043, 0.003, ivory);
    }
    ribbon('apophis-rear-cobra-forked-tongue', 'eye', [[-1.07, 3.7, 0.35], [-1.15, 3.5, 0.41], [-1.33, 3.24, 0.4]], 0.022, '#c84457');
    rod('apophis-rear-cobra-tongue-fork', 'eye', [-1.23, 3.38, 0.4], [-1.43, 3.28, 0.4], 0.017, 0.003, '#c84457');
    sphere('apophis-black-guardian-helmet', 'body', [-0.16, 2.94, 0.15], [0.3, 0.5, 0.29]);
    const face = new THREE.Shape();face.moveTo(-0.39,3.04);face.lineTo(-0.03,3.04);face.lineTo(0.02,2.67);face.lineTo(-0.16,2.44);face.lineTo(-0.35,2.67);face.closePath();
    part('apophis-pointed-black-faceplate',new THREE.ExtrudeGeometry(face,{depth:0.035,bevelEnabled:false,steps:1}),'body',[0,0,0.4],undefined,undefined,'#152532');
    for (const side of [-1, 1]) {
      ribbon(`apophis-helmet-gold-crest-${side}`, 'accent', [[-0.16 + side * 0.06, 3.38, 0.25], [-0.16 + side * 0.17, 3.2, 0.38], [-0.16 + side * 0.12, 2.83, 0.44], [-0.16 + side * 0.24, 2.65, 0.35]], 0.024, lightGold);
      sphere(`apophis-guardian-red-eye-${side}`, 'eye', [-0.16 + side * 0.105, 2.84, 0.411], [0.07, 0.026, 0.025]);
      cone(`apophis-guardian-ivory-chin-fang-${side}`, 'accent', [-0.16 + side * 0.17, 2.55, 0.46], [0.04,0.19,0.04], [Math.PI,0,side*0.15], ivory);
      rod(`apophis-gold-brow-${side}`, 'accent', [-0.16 + side * 0.035, 2.89, 0.43], [-0.16 + side * 0.21, 2.94, 0.4], 0.026, 0.018, gold);
      sphere(`apophis-black-pauldron-${side}`, 'body', [side * 0.55, 2.51, 0.01], [0.42, 0.26, 0.4]);
      ribbon(`apophis-gold-shoulder-scroll-${side}`, 'accent', [[side * 0.2, 2.62, 0.32], [side * 0.39, 2.7, 0.37], [side * 0.71, 2.46, 0.38], [side * 0.88, 2.43, 0.29]], 0.042, lightGold);
      ribbon(`apophis-gold-chest-rim-${side}`, 'accent', [[side * 0.16, 2.49, 0.37], [side * 0.38, 2.2, 0.45], [side * 0.29, 1.88, 0.5], [0, 1.76, 0.5]], 0.046, gold);
      sphere(`apophis-chest-serpent-red-gem-${side}`, 'eye', [side * 0.15, 1.78, 0.58], [0.09, 0.115, 0.046]);
      box(`apophis-chest-serpent-eye-slit-${side}`, 'dark', [side * 0.15,1.78,0.63],[0.018,0.17,0.012],undefined,'#172228');
      rod(`apophis-chest-ivory-fang-${side}`, 'accent', [side * 0.13, 1.68, 0.52], [side * 0.2, 1.41, 0.55], 0.047, 0.003, ivory);
      const elbow = [side * 0.89, 1.95, 0.22];
      rod(`upper-arm-${side}-apophis`, 'dark', [side * 0.56, 2.47, 0.09], elbow, 0.16, 0.13, violet);
      for (let i = 0; i < 4; i += 1) box(`apophis-arm-violet-scale-${side}-${i}`, 'dark', [side * (0.6 + i * 0.08), 2.4 - i * 0.12, 0.24], [0.25, 0.065, 0.09], [0, 0, side * 0.42], violet);
      const wrist = side === 1 ? [0.65, 1.18, 0.72] : [-0.84, 1.1, 0.46];
      rod(`gauntlet-${side}-apophis`, 'body', elbow, wrist, 0.18, 0.13);
      sphere(`hand-${side}-apophis`, 'body', wrist, [0.16, 0.2, 0.12]);
      sphere(`apophis-gold-hip-ring-${side}`, 'accent', [side * 0.46, 1.36, 0.15], [0.16, 0.2, 0.19], 0, gold);
    }
    // The illustrated blade is a long ivory crescent, with physical thickness.
    const blade = new THREE.Shape();blade.moveTo(0.55, 1.06);blade.quadraticCurveTo(1.1, 1.55, 1.54, 2.28);blade.quadraticCurveTo(1.87, 2.96, 2.02, 3.91);blade.quadraticCurveTo(2.05, 2.65, 1.65, 1.91);blade.quadraticCurveTo(1.12, 1.21, 0.68, 0.89);blade.closePath();
    part('sword-apophis-ivory-crescent-blade', new THREE.ExtrudeGeometry(blade, {depth:0.08,bevelEnabled:true,bevelThickness:0.012,bevelSize:0.012,bevelSegments:1,steps:1,curveSegments:8}), 'accent', [0,0,0.82], undefined, undefined, ivory);
    rod('sword-apophis-dark-grip','body',[0.51,0.75,0.84],[0.69,1.17,0.84],0.06,0.06);
    ribbon('sword-apophis-serpent-guard','accent',[[0.35,0.83,0.84],[0.28,1.09,0.86],[0.4,1.23,0.86],[0.52,1.17,0.86]],0.045,gold);
    sphere('sword-apophis-red-hilt-eye','eye',[0.4,1.16,0.91],[0.045,0.065,0.03]);
    // The lower gold ornament carries the literal red slit-eye motifs.
    sphere('apophis-gold-serpent-ornament','accent',[0.87,1.01,0.64],[0.48,0.55,0.14],0,gold);
    for(let i=0;i<3;i+=1){const x=0.6+i*0.27,y=0.82+Math.sin(i*1.6)*0.32;sphere(`apophis-ornament-red-eye-${i}`,'eye',[x,y,0.79],[0.105,0.135,0.045]);box(`apophis-ornament-dark-slit-${i}`,'dark',[x,y,0.84],[0.023,0.2,0.012],undefined,'#142025');}
    return true;
  }
  if (profile.anatomy === 'emerald-genie') {
    const gold = '#e0bf59', pale = '#bbd994', deep = '#116943';
    sphere('genie-muscular-trunk', 'body', [0, 2.01, -0.01], [0.63, 0.77, 0.37]);
    for (const side of [-1, 1]) {
      sphere(`genie-pectoral-${side}`, 'body', [side * 0.28, 2.3, 0.25], [0.4, 0.34, 0.24]);
      sphere(`genie-deltoid-${side}`, 'body', [side * 0.69, 2.4, 0.02], [0.38, 0.42, 0.38]);
      const elbow = [side * 0.97, 1.9, 0.21], wrist = [side * 0.88, 1.4, 0.42];
      rod(`upper-arm-${side}-genie`, 'body', [side * 0.67, 2.37, 0], elbow, 0.27, 0.21);
      sphere(`upper-arm-${side}-genie-biceps`, 'body', [side * 0.86, 2.05, 0.22], [0.23, 0.32, 0.24]);
      rod(`gauntlet-${side}-genie-forearm`, 'body', elbow, wrist, 0.22, 0.16);
      compactRing(`gauntlet-${side}-genie-gold-cuff`, 'accent', wrist, 0.18, [0.25, 0, -side * 0.15], gold);
      compactRing(`gauntlet-${side}-genie-gold-cuff-rim`, 'accent', [wrist[0], wrist[1] + 0.12, wrist[2] - 0.015], 0.19, [0.25, 0, -side * 0.15], '#f0d878');
      sphere(`hand-${side}-genie-fist`, 'body', [side * 0.9, 1.22, 0.49], [0.25, 0.24, 0.22]);
      for (let finger = 0; finger < 4; finger += 1) {
        sphere(`hand-${side}-genie-knuckle-${finger}`, 'body', [side * 0.9 + (finger - 1.5) * 0.095, 1.3, 0.67], [0.058, 0.09, 0.047], 0);
        rod(`hand-${side}-genie-finger-crease-${finger}`, 'dark', [side * 0.9 + (finger - 1.5) * 0.095, 1.16, 0.674], [side * 0.9 + (finger - 1.5) * 0.095, 1.25, 0.705], 0.008, 0.006, deep);
      }
      compactRing(`genie-shoulder-gold-torque-${side}`, 'accent', [side * 0.47, 2.5, 0.16], 0.39, [0, 0.35 * side, 0], gold, [0.7, 1.1, 1]);
      sphere(`genie-ear-${side}`, 'body', [side * 0.29, 3.09, 0.07], [0.085, 0.17, 0.08], 0);
      compactRing(`genie-ear-gold-hoop-${side}`, 'accent', [side * 0.32, 2.99, 0.14], 0.058, [0, 0, 0], gold);
      ribbon(`genie-narrow-closed-eye-${side}`, 'dark', [[side * 0.05, 3.11, 0.313], [side * 0.14, 3.08, 0.32], [side * 0.23, 3.13, 0.275]], 0.014, '#10291e');
      ribbon(`genie-downward-moustache-${side}`, 'dark', [[side * 0.025, 2.88, 0.366], [side * 0.12, 2.88, 0.354], [side * 0.21, 2.77, 0.295], [side * 0.23, 2.41, 0.27]], 0.015, '#14291e');
    }
    for (let row = 0; row < 3; row += 1) sphere(`genie-abdominal-volume-${row}`, 'body', [0, 1.59 + row * 0.21, 0.29], [0.29 - row * 0.025, 0.18, 0.12]);
    rod('genie-neck', 'body', [0, 2.54, 0], [0, 2.88, 0.05], 0.24, 0.2);
    sphere('genie-bald-head', 'body', [0, 3.12, 0.05], [0.31, 0.4, 0.29]);
    sphere('genie-prominent-chin', 'body', [0, 2.82, 0.19], [0.22, 0.21, 0.22]);
    const nose = new THREE.Shape();nose.moveTo(-0.055, 3.16);nose.lineTo(0.045, 3.14);nose.lineTo(0.085, 2.99);nose.lineTo(-0.075, 2.98);nose.closePath();
    part('genie-long-angular-nose', new THREE.ExtrudeGeometry(nose, { depth: 0.17, bevelEnabled: false }), 'body', [0, 0, 0.27]);
    ribbon('genie-narrow-black-goatee', 'dark', [[0, 2.82, 0.396], [0.015, 2.65, 0.37], [0.01, 2.42, 0.32]], 0.026, '#12291f');
    sphere('genie-blue-red-gold-cap', 'dark', [0, 3.48, -0.015], [0.28, 0.15, 0.23], 1, '#193f75');
    compactRing('genie-cap-red-band', 'dark', [0, 3.43, 0], 0.25, undefined, '#ab4027', [1, 1, 0.82]);
    compactRing('genie-cap-gold-rim', 'accent', [0, 3.47, -0.015], 0.26, undefined, gold, [1, 1, 0.82]);
    sphere('genie-cap-gold-button', 'accent', [0, 3.64, 0], [0.043, 0.026, 0.043], 0, gold);
    const mistCurve = new THREE.CatmullRomCurve3([[0, 1.54, 0], [-0.24, 1.17, 0.07], [0.18, 0.93, 0.04], [0.45, 0.58, -0.04], [0.1, 0.32, 0.1], [-0.19, 0.21, 0.04]].map(p => new THREE.Vector3(...p)));
    const mist = new THREE.TubeGeometry(mistCurve, 12, 0.14, 5, false);
    const mistPositions = mist.attributes.position;
    for (let vertex = 0; vertex < mistPositions.count; vertex += 1) {
      const t = Math.floor(vertex / 6) / 12, center = mistCurve.getPointAt(t);
      const point = new THREE.Vector3().fromBufferAttribute(mistPositions, vertex).sub(center).multiplyScalar(1 - t * 0.88).add(center);
      mistPositions.setXYZ(vertex, point.x, point.y, point.z);
    }
    mist.computeVertexNormals();
    part('genie-tapered-green-mist-tail', mist, 'body', [0, 0, 0]);
    ribbon('genie-pale-mist-curl', 'accent', [[-0.19, 0.22, 0.07], [-0.44, 0.39, 0.03], [-0.32, 0.58, 0.04], [-0.1, 0.54, 0.05], [-0.15, 0.4, 0.07]], 0.043, pale);
    ribbon('genie-pale-shoulder-mist-curl', 'accent', [[0.18, 2.67, -0.2], [0.38, 2.98, -0.22], [0.22, 3.23, -0.24], [0.02, 3.19, -0.25], [0.03, 3.03, -0.24], [0.16, 3.08, -0.24]], 0.034, pale);
    return true;
  }

  if (profile.anatomy === 'mystical-elf-prayer') {
    const ivory = '#e4e9dc', hair = '#bd8f2b', green = '#477d49', blue = profile.body;
    part('elf-inferred-green-robe', new THREE.CylinderGeometry(0.34, 0.61, 1.66, 12), 'body', [0, 0.93, -0.02], [1, 1, 0.64], undefined, green);
    sphere('elf-green-bodice', 'body', [0, 1.87, 0.02], [0.47, 0.59, 0.27], 1, '#548453');
    for (const side of [-1, 1]) {
      ribbon(`elf-green-gown-fold-${side}`, 'dark', [[side * 0.13, 1.61, 0.29], [side * 0.23, 1.04, 0.33], [side * 0.39, 0.28, 0.3]], 0.018, '#2b5638');
      sphere(`elf-blue-shoulder-${side}`, 'body', [side * 0.41, 2.41, 0.015], [0.22, 0.24, 0.22], 1, blue);
      const elbow = [side * 0.58, 1.92, 0.12], wrist = [side * 0.07, 2.17, 0.43];
      rod(`prayer-upper-arm-${side}`, 'body', [side * 0.43, 2.41, 0], elbow, 0.12, 0.095, blue);
      rod(`prayer-forearm-${side}`, 'body', elbow, wrist, 0.095, 0.075, blue);
      sphere(`prayer-clasped-palm-${side}`, 'body', [side * 0.066, 2.23, 0.48], [0.085, 0.17, 0.078], 1, blue);
      for (let finger = 0; finger < 4; finger += 1) {
        const y = 2.18 + finger * 0.057;
        ribbon(`prayer-interlaced-finger-${side}-${finger}`, 'body', [[side * 0.1, y, 0.51], [-side * 0.005, y + 0.035, 0.56], [-side * 0.065, y + 0.003, 0.515]], 0.025, finger % 2 ? '#80c7e8' : blue);
      }
      ribbon(`prayer-thumb-${side}`, 'body', [[side * 0.14, 2.23, 0.465], [side * 0.07, 2.38, 0.49], [side * 0.015, 2.4, 0.52]], 0.035, blue);
      const shoulder = new THREE.Shape();shoulder.moveTo(side * 0.49, 2.02);shoulder.quadraticCurveTo(side * 0.84, 1.92, side * 0.87, 2.28);shoulder.lineTo(side * 0.79, 2.69);shoulder.quadraticCurveTo(side * 0.71, 2.44, side * 0.57, 2.3);shoulder.closePath();
      part(`elf-ivory-shoulder-crescent-${side}`, new THREE.ExtrudeGeometry(shoulder, { depth: 0.11, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 6 }), 'accent', [0, 0, 0.15], undefined, undefined, ivory);
      const crown = new THREE.Shape();crown.moveTo(0, 3.27);crown.quadraticCurveTo(side * 0.18, 3.39, side * 0.36, 3.47);crown.quadraticCurveTo(side * 0.41, 3.7, side * 0.6, 3.87);crown.quadraticCurveTo(side * 0.56, 3.67, side * 0.55, 3.47);crown.quadraticCurveTo(side * 0.59, 3.27, side * 0.51, 3.02);crown.quadraticCurveTo(side * 0.51, 3.3, side * 0.36, 3.32);crown.quadraticCurveTo(side * 0.17, 3.31, 0, 3.13);crown.closePath();
      part(`elf-white-swept-crown-horn-${side}`, new THREE.ExtrudeGeometry(crown, { depth: 0.065, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 6 }), 'accent', [0, 0, 0.29], undefined, undefined, ivory);
      ribbon(`elf-white-inner-crown-prong-${side}`, 'accent', [[0, 3.3, 0.37], [side * 0.18, 3.56, 0.22], [side * 0.3, 3.62, 0.04]], 0.021, ivory);
      ribbon(`elf-dark-closed-eyelid-${side}`, 'dark', [[side * 0.08, 3.025, 0.326], [side * 0.17, 3.01, 0.317], [side * 0.245, 3.05, 0.27]], 0.009, '#23475e');
      const curtain = new THREE.Shape();curtain.moveTo(side * 0.19, 3.47);curtain.quadraticCurveTo(side * 0.48, 3.45, side * 0.43, 2.29);curtain.lineTo(side * 0.27, 2.3);curtain.lineTo(side * 0.21, 3.03);curtain.closePath();
      part(`elf-long-blond-hair-curtain-${side}`, new THREE.ExtrudeGeometry(curtain, { depth: 0.2, bevelEnabled: false, curveSegments: 8 }), 'dark', [0, 0, -0.12], undefined, undefined, hair);
      for (let strand = 0; strand < 4; strand += 1) rod(`elf-blond-hair-strand-${side}-${strand}`, 'dark', [side * (0.27 + strand * 0.045), 3.33, 0.1], [side * (0.3 + strand * 0.029), 2.31, 0.12], 0.012, 0.009, strand % 2 ? '#e0b94e' : '#94712b');
    }
    sphere('elf-bare-blue-upper-chest', 'body', [0, 2.38, 0], [0.44, 0.22, 0.22], 1, blue);
    rod('elf-long-blue-neck', 'body', [0, 2.46, 0], [0, 2.84, 0.015], 0.115, 0.1, blue);
    sphere('elf-serene-blue-face', 'body', [0, 3.07, 0.06], [0.265, 0.365, 0.25], 1, blue);
    sphere('elf-small-blue-nose', 'body', [0, 2.97, 0.317], [0.035, 0.055, 0.03], 0, '#82c7e3');
    rod('elf-quiet-mouth', 'dark', [-0.042, 2.86, 0.27], [0.042, 2.86, 0.27], 0.008, 0.007, '#32728f');
    sphere('elf-golden-hair-crown', 'dark', [0, 3.33, -0.05], [0.3, 0.27, 0.24], 1, hair);
    cone('elf-central-blond-fringe', 'dark', [0, 3.16, 0.308], [0.08, 0.25, 0.025], [Math.PI, 0, 0], '#cba13e');
    ribbon('elf-white-curved-chest-trim', 'accent', [[-0.7, 2.08, 0.21], [-0.4, 2.02, 0.32], [0, 2.01, 0.34], [0.4, 2.02, 0.32], [0.7, 2.08, 0.21]], 0.042, ivory);
    return true;
  }

  if (profile.anatomy === 'blue-armored-rodent') {
    const fur = '#9883a5', armor = '#377bb3', rim = '#78b2d1', shield = '#8b9d8a', ivory = '#e5ebda';
    sphere('beaver-round-purple-body', 'body', [0, 1.61, -0.05], [0.6, 0.71, 0.39], 1, fur);
    sphere('beaver-blue-chest-cuirass', 'accent', [0, 1.96, 0.08], [0.62, 0.61, 0.43], 1, armor);
    sphere('beaver-blue-chest-front-plate', 'accent', [0, 1.95, 0.48], [0.46, 0.44, 0.14], 1, '#5794c1');
    box('beaver-pale-blue-belt', 'accent', [0, 1.56, 0.35], [0.91, 0.14, 0.12], undefined, rim);
    box('beaver-black-belt-buckle', 'dark', [0, 1.56, 0.45], [0.21, 0.18, 0.075], undefined, '#182c35');
    box('beaver-buckle-inner-band', 'accent', [0, 1.56, 0.499], [0.13, 0.07, 0.016], undefined, '#5390b5');
    for (const side of [-1, 1]) {
      sphere(`beaver-purple-haunch-${side}`, 'body', [side * 0.32, 1.05, 0], [0.31, 0.35, 0.32], 1, fur);
      rod(`beaver-short-fur-shin-${side}`, 'body', [side * 0.34, 0.87, 0.05], [side * 0.39, 0.44, 0.13], 0.21, 0.17, '#879581');
      sphere(`beaver-blue-rounded-boot-${side}`, 'accent', [side * 0.39, 0.31, 0.23], [0.41, 0.22, 0.59], 1, armor);
      const tab = new THREE.Shape();tab.moveTo(side * 0.08, 1.45);tab.lineTo(side * 0.56, 1.51);tab.lineTo(side * 0.58, 1.12);tab.lineTo(side * 0.19, 0.97);tab.closePath();
      part(`beaver-blue-hip-tab-${side}`, new THREE.ExtrudeGeometry(tab, { depth: 0.07, bevelEnabled: false }), 'accent', [0, 0, 0.24], undefined, undefined, armor);
      sphere(`beaver-blue-shoulder-${side}`, 'accent', [side * 0.65, 2.37, 0], [0.24, 0.29, 0.27], 1, armor);
      cone(`beaver-blue-shoulder-spike-${side}`, 'accent', [side * 0.68, 2.69, -0.015], [0.09, 0.47, 0.09], [0, 0, -side * 0.14], '#316a98');
      const elbow = [side * 0.86, 1.98, 0.29], wrist = [side * 0.92, 1.78, 0.49];
      rod(side === -1 ? 'beaver-sword-arm-upper' : 'beaver-shield-arm-upper', 'body', [side * 0.67, 2.37, 0], elbow, 0.16, 0.14, fur);
      rod(side === -1 ? 'beaver-sword-arm-forearm' : 'beaver-shield-arm-forearm', 'body', elbow, wrist, 0.15, 0.12, fur);
      sphere(side === -1 ? 'beaver-sword-hand-fist' : 'beaver-shield-hand-fist', 'body', wrist, [0.19, 0.22, 0.18], 1, fur);
      for (let finger = 0; finger < 3; finger += 1) rod(side === -1 ? `beaver-sword-fist-fold-${finger}` : `beaver-shield-fist-fold-${finger}`, 'dark', [side * 0.94 - 0.11, 1.68 + finger * 0.07, 0.62], [side * 0.94 + 0.09, 1.68 + finger * 0.07, 0.62], 0.009, 0.008, '#594666');
      const ear = new THREE.Shape();ear.moveTo(side * 0.3, 3.12);ear.lineTo(side * 0.9, 3.61);ear.lineTo(side * 0.66, 2.98);ear.closePath();
      part(`beaver-large-pointed-purple-ear-${side}`, new THREE.ExtrudeGeometry(ear, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1 }), 'body', [0, 0, -0.05], undefined, undefined, fur);
      cone(`beaver-dark-ear-inner-${side}`, 'dark', [side * 0.64, 3.28, 0.06], [0.18, 0.34, 0.035], [0, 0, -side * 0.62], '#352944');
      sphere(`beaver-white-eye-sclera-${side}`, 'accent', [side * 0.305, 2.93, 0.415], [0.125, 0.105, 0.045], 0, ivory);
      sphere(`beaver-red-eye-${side}`, 'eye', [side * 0.31, 2.945, 0.451], [0.074, 0.083, 0.022], 1);
      sphere(`beaver-black-eye-pupil-${side}`, 'dark', [side * 0.31, 2.945, 0.472], [0.025, 0.06, 0.008], 0, '#172132');
      sphere(`beaver-eye-white-glint-${side}`, 'eye', [side * 0.29, 2.98, 0.479], [0.018, 0.02, 0.007], 0, '#f2f5ec');
      rod(`beaver-dark-angry-brow-${side}`, 'dark', [side * 0.17, 3.045, 0.43], [side * 0.43, 3.1, 0.39], 0.021, 0.012, '#292737');
      cone(`beaver-helmet-top-spike-${side}`, 'accent', [side * 0.21, 3.57, -0.03], [0.09, 0.45, 0.09], [0, 0, -side * 0.22], '#317aa4');
      box(`beaver-blue-helmet-cheekguard-${side}`, 'accent', [side * 0.48, 2.83, -0.005], [0.14, 0.62, 0.35], [0, 0, -side * 0.12], '#225481');
      rod(`beaver-pale-cheekguard-rim-${side}`, 'accent', [side * 0.52, 3.14, 0.2], [side * 0.48, 2.54, 0.25], 0.035, 0.029, rim);
    }
    sphere('beaver-rounded-purple-head', 'body', [0, 2.98, 0], [0.5, 0.55, 0.42], 1, fur);
    sphere('beaver-projecting-rodent-muzzle', 'body', [0, 2.72, 0.42], [0.4, 0.26, 0.35], 1, '#ac9bba');
    sphere('beaver-black-rodent-nose', 'dark', [0, 2.84, 0.756], [0.16, 0.105, 0.077], 1, '#15212a');
    ribbon('beaver-dark-muzzle-smile', 'dark', [[-0.26, 2.66, 0.633], [-0.13, 2.6, 0.736], [0, 2.59, 0.761], [0.13, 2.6, 0.736], [0.26, 2.66, 0.633]], 0.012, '#513d5b');
    for (const side of [-1, 1]) box(`beaver-large-incisor-${side}`, 'accent', [side * 0.063, 2.51, 0.744], [0.111, 0.2, 0.07], [0, 0, -side * 0.07], ivory);
    sphere('beaver-deep-blue-helmet-crown', 'accent', [0, 3.4, -0.04], [0.48, 0.25, 0.43], 1, '#203b6c');
    ribbon('beaver-blue-helmet-swept-brow', 'accent', [[-0.47, 3.22, 0.21], [-0.22, 3.31, 0.35], [0, 3.34, 0.39], [0.22, 3.31, 0.35], [0.47, 3.22, 0.21]], 0.065, '#6096bd');
    const tail = [[0, 1.18, -0.41], [0.64, 0.9, -0.78], [1.12, 1.07, -0.82], [1.45, 1.76, -0.71], [1.57, 2.42, -0.57], [1.47, 3.05, -0.42]];
    for (let segment = 1; segment < tail.length; segment += 1) rod(`beaver-long-curved-segmented-tail-${segment}`, 'body', tail[segment - 1], tail[segment], 0.115 - segment * 0.012, 0.115 - (segment + 1) * 0.012, segment % 2 ? '#a3b6a3' : '#6f897c');
    const blade = new THREE.Shape();blade.moveTo(-1.16, 2.27);blade.lineTo(-1.38, 3.64);blade.lineTo(-1.06, 3.89);blade.lineTo(-0.75, 3.26);blade.lineTo(-0.79, 2.28);blade.closePath();
    part('sword-beaver-wide-pentagonal-blade', new THREE.ExtrudeGeometry(blade, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 1 }), 'accent', [0, 0, 0.48], undefined, undefined, '#c2d3ce');
    rod('sword-beaver-dark-center-groove', 'dark', [-0.98, 2.3, 0.63], [-1.08, 3.56, 0.63], 0.012, 0.004, '#44565d');
    rod('sword-beaver-grip', 'dark', [-0.97, 1.54, 0.5], [-0.97, 2.26, 0.5], 0.07, 0.07, '#3f564c');
    rod('sword-beaver-greenish-crossguard', 'accent', [-1.36, 2.25, 0.54], [-0.6, 2.25, 0.54], 0.06, 0.06, '#899f85');
    compactRing('sword-beaver-hilt-gem-rim', 'accent', [-0.98, 2.25, 0.575], 0.13, [0, 0, 0], '#b4c5b1');
    sphere('sword-beaver-emerald-hilt-gem', 'eye', [-0.98, 2.25, 0.62], [0.075, 0.075, 0.05], 1, '#439b45');
    const shieldShape = new THREE.Shape();shieldShape.moveTo(-0.48, 0.64);shieldShape.quadraticCurveTo(0, 0.88, 0.49, 0.63);shieldShape.lineTo(0.57, 0.05);shieldShape.lineTo(0.35, -0.56);shieldShape.lineTo(0, -0.78);shieldShape.lineTo(-0.4, -0.52);shieldShape.lineTo(-0.57, 0.06);shieldShape.closePath();
    for (const side of [-1, 1]) { const hole = new THREE.Path();hole.moveTo(side * 0.12, 0.33);hole.lineTo(side * 0.39, 0.27);hole.lineTo(side * 0.23, -0.37);hole.lineTo(side * 0.09, -0.18);hole.closePath();shieldShape.holes.push(hole); }
    part('beaver-thick-kite-shield-with-cutouts', new THREE.ExtrudeGeometry(shieldShape, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1, curveSegments: 6 }), 'dark', [1.04, 1.94, 0.5], undefined, [0, -0.2, 0], shield);
    ribbon('beaver-shield-pale-rim', 'accent', [[0.55, 2.58, 0.69], [1.05, 2.75, 0.74], [1.54, 2.56, 0.75], [1.6, 1.99, 0.75], [1.39, 1.39, 0.75], [1.03, 1.17, 0.69], [0.65, 1.4, 0.65], [0.49, 1.98, 0.64], [0.55, 2.58, 0.69]], 0.029, '#b7c7b0');
    for (const [index, x, y] of [[0, .78, 2.55], [1, 1.18, 2.6], [2, 1.44, 2.42], [3, 1.05, 1.31]]) sphere(`beaver-shield-raised-stud-${index}`, 'accent', [x, y, 0.73], [0.055, 0.065, 0.04], 0, '#bfcebb');
    rod('beaver-shield-ivory-horn', 'accent', [1.12, 2.68, 0.52], [1.28, 3.17, 0.4], 0.077, 0.006, '#c2d4bd');
    return true;
  }
  if (profile.anatomy === 'red-armored-bull') {
    const brown = '#76503a', red = '#d62031', gold = '#c8b337', edge = '#ebe68d';
    sphere('ox-massive-brown-trunk', 'body', [0, 1.99, 0], [0.68, 0.75, 0.43], 1, brown);
    sphere('ox-red-chest-cuirass', 'accent', [0, 2.1, 0.31], [0.58, 0.58, 0.2], 1, red);
    ribbon('ox-gold-chest-border', 'accent', [[-.58, 2.43, .35], [-.43, 1.65, .4], [0, 1.48, .44], [.43, 1.65, .4], [.58, 2.43, .35]], .042, gold);
    sphere('ox-heavy-bovine-head', 'body', [0, 3.04, .02], [.34, .44, .34], 1, brown);
    sphere('ox-long-brown-muzzle', 'body', [0, 2.87, .36], [.235, .28, .27], 1, '#8d6246');
    for (const side of [-1, 1]) {
      sphere(`ox-black-nostril-${side}`, 'dark', [side * .085, 2.825, .59], [.042, .075, .019], 0, '#191913');
      sphere(`ox-narrow-red-eye-${side}`, 'eye', [side * .175, 3.11, .316], [.054, .024, .025], 0, '#c7342e');
      sphere(`ox-red-helmet-cheek-${side}`, 'accent', [side * .31, 3.05, -.02], [.13, .41, .29], 1, red);
      ribbon(`ox-gold-cheek-rim-${side}`, 'accent', [[side * .35, 3.4, .18], [side * .3, 3.17, .32], [side * .26, 2.7, .29], [side * .12, 2.61, .4]], .048, gold);
      sphere(`ox-red-shoulder-pauldron-${side}`, 'accent', [side * .73, 2.47, -.02], [.41, .48, .4], 1, red);
      compactRing(`ox-gold-shoulder-rim-${side}`, 'accent', [side * .74, 2.47, .36], .34, [0, 0, side * .12], gold, [1, 1.2, 1]);
      for (let rivet = 0; rivet < 7; rivet += 1) {
        const a = rivet / 7 * Math.PI * 2;
        sphere(`ox-gold-shoulder-rivet-${side}-${rivet}`, 'accent', [side * .74 + Math.sin(a) * .33, 2.47 + Math.cos(a) * .38, .39], [.045, .045, .025], 0, edge);
      }
      ribbon(`ox-long-swept-gold-horn-${side}`, 'accent', [[side * .29, 3.5, -.02], [side * .6, 3.54, -.04], [side * 1.08, 3.7, -.03], [side * 1.55, 3.93, .03]], .075, gold);
      rod(`ox-pointed-horn-tip-${side}`, 'accent', [side * 1.37, 3.83, .01], [side * 1.69, 4.06, .04], .075, .003, edge);
      compactRing(`ox-gold-horn-collar-${side}`, 'accent', [side * .44, 3.53, -.02], .11, [0, 0, Math.PI / 2], gold);
      const elbow = [side * .94, 1.98, .22], wrist = [side * .12, side === 1 ? 2.05 : 1.64, .77];
      rod(`ox-gripping-upper-arm-${side}`, 'body', [side * .67, 2.37, .04], elbow, .235, .2, brown);
      rod(`ox-gripping-forearm-${side}`, 'body', elbow, wrist, .21, .18, brown);
      sphere(`ox-gripping-broad-fist-${side}`, 'body', wrist, [.23, .25, .2], 1, '#93694f');
      for (let finger = 0; finger < 4; finger += 1) {
        box(`ox-gripping-knuckle-${side}-${finger}`, 'body', [wrist[0] - .14 + finger * .085, wrist[1] + .1, .92], [.08, .145, .065], [0, 0, -.13], '#a17a5a');
        rod(`ox-gripping-finger-fold-${side}-${finger}`, 'dark', [wrist[0] - .175 + finger * .085, wrist[1] + .02, .963], [wrist[0] - .175 + finger * .085, wrist[1] + .12, .963], .007, .007, '#4d3528');
      }
      compactRing(`ox-gripping-gold-wrist-cuff-${side}`, 'accent', [side * .33, side === 1 ? 2.045 : 1.74, .69], .195, [Math.PI / 2, -.75 * side, 0], gold);
      // The illustration is a cropped bust: these lower limbs continue its
      // brown body/red armor, rather than claiming an unseen full-body design.
      rod(`ox-inferred-brown-thigh-${side}`, 'body', [side * .27, 1.38, 0], [side * .36, .79, .04], .23, .19, brown);
      rod(`ox-inferred-brown-shin-${side}`, 'body', [side * .36, .79, .04], [side * .4, .24, .11], .19, .17, brown);
      sphere(`ox-inferred-red-greave-${side}`, 'accent', [side * .39, .48, .17], [.23, .35, .19], 1, red);
      box(`ox-inferred-dark-hoof-${side}`, 'dark', [side * .4, .17, .21], [.4, .22, .44], undefined, '#2f241c');
      box(`ox-inferred-hoof-cleft-${side}`, 'body', [side * .4, .17, .439], [.022, .15, .008], undefined, '#916c4b');
    }
    sphere('ox-red-high-helmet-crown', 'accent', [0, 3.5, -.05], [.32, .43, .3], 1, red);
    ribbon('ox-gold-v-shaped-visor', 'accent', [[-.34, 3.38, .27], [0, 3.15, .39], [.34, 3.38, .27]], .06, gold);
    ribbon('ox-gold-helmet-crown-rim', 'accent', [[-.3, 3.57, .21], [-.17, 3.79, .17], [0, 3.93, .12], [.17, 3.79, .17], [.3, 3.57, .21]], .047, gold);
    cone('ox-helmet-central-gold-spike', 'accent', [0, 3.94, .15], [.09, .62, .11], [0, 0, -.05], edge);
    rod('ox-dark-bovine-mouth', 'dark', [-.1, 2.69, .53], [.1, 2.69, .53], .013, .009, '#241c17');
    box('ox-inferred-red-belt', 'accent', [0, 1.38, .15], [1.0, .18, .54], undefined, red);
    box('ox-inferred-gold-belt-buckle', 'accent', [0, 1.38, .435], [.21, .16, .06], undefined, gold);
    rod('axe-ox-green-handle', 'body', [.04, 1.13, .79], [.14, 2.64, .79], .075, .066, '#2c6541');
    ribbon('axe-ox-green-handle-ridge', 'accent', [[-.01, 1.16, .84], [.04, 1.7, .86], [.11, 2.6, .85]], .016, '#579467');
    const blade = new THREE.Shape();blade.moveTo(.1, 2.35);blade.quadraticCurveTo(.52, 3.18, 1.8, 3.64);blade.quadraticCurveTo(1.47, 2.99, .73, 2.65);blade.quadraticCurveTo(1.4, 2.64, 1.88, 2.97);blade.quadraticCurveTo(1.5, 2.21, .14, 2.12);blade.closePath();
    part('axe-ox-double-swept-silver-blade', new THREE.ExtrudeGeometry(blade, { depth: .1, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 1, curveSegments: 8 }), 'accent', [0, 0, .74], undefined, undefined, '#d4e2df');
    ribbon('axe-ox-blue-beveled-upper-edge', 'accent', [[.12, 2.36, .87], [.63, 2.98, .87], [1.76, 3.6, .87]], .026, '#9bc8db');
    const socket = new THREE.Shape();socket.moveTo(-.12, 2.05);socket.lineTo(-.35, 2.34);socket.lineTo(-.21, 2.6);socket.lineTo(.14, 2.54);socket.lineTo(.35, 2.23);socket.closePath();
    part('axe-ox-dark-angular-socket', new THREE.ExtrudeGeometry(socket, { depth: .12, bevelEnabled: false }), 'dark', [0, 0, .75], undefined, undefined, '#20272a');
    sphere('axe-ox-silver-socket-boss', 'accent', [0, 2.3, .912], [.14, .18, .04], 1, '#b8c3c1');
    return true;
  }

  if (profile.anatomy === 'asymmetric-jester') {
    const teal = '#17799c', purple = '#755396', white = '#dbe4dc', red = '#dc3b4a', gold = '#e8e66b';
    const fingerCurve = (name, points, width, tint) => part(name,
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 6, width, 4, false),
      'dark', [0, 0, 0], undefined, undefined, tint);
    sphere('clown-blue-costumed-trunk', 'body', [0, 1.95, -.06], [.5, .64, .28], 1, teal);
    part('clown-inferred-continuous-blue-tunic-skirt', new THREE.CylinderGeometry(.27, .58, 1.04, 10), 'body', [0, 1.11, -.03], [1, 1, .65], undefined, teal);
    sphere('clown-asymmetric-long-mask', 'body', [0, 3.02, .01], [.32, .5, .245], 1, teal);
    const mask = new THREE.Shape();mask.moveTo(-.24, 3.43);mask.quadraticCurveTo(.12, 3.65, .055, 2.79);mask.lineTo(-.24, 2.6);mask.quadraticCurveTo(-.35, 2.97, -.24, 3.43);mask.closePath();
    part('clown-white-left-face-mask', new THREE.ExtrudeGeometry(mask, { depth: .055, bevelEnabled: false, curveSegments: 8 }), 'accent', [0, 0, .17], undefined, undefined, white);
    sphere('clown-red-round-nose', 'accent', [-.115, 3.075, .35], [.098, .1, .082], 1, '#e33e3b');
    const star = new THREE.Shape();for (let i = 0; i < 10; i += 1) {const a = i * Math.PI / 5 + Math.PI / 2, r = i % 2 ? .065 : .16;const x = -.14 + Math.cos(a) * r, y = 3.275 + Math.sin(a) * r;i ? star.lineTo(x, y) : star.moveTo(x, y);}star.closePath();
    part('clown-yellow-star-over-left-eye', new THREE.ExtrudeGeometry(star, { depth: .025, bevelEnabled: false }), 'eye', [0, 0, .242], undefined, undefined, gold);
    sphere('clown-pink-slanted-right-eyelid', 'accent', [.185, 3.25, .245], [.14, .05, .024], 1, '#dd81ac');
    sphere('clown-yellow-right-iris', 'eye', [.165, 3.245, .275], [.032, .032, .014], 0, gold);
    sphere('clown-black-right-pupil', 'dark', [.166, 3.245, .29], [.012, .023, .006], 0, '#172525');
    ribbon('clown-magenta-wide-smile-border', 'accent', [[-.25, 2.78, .21], [-.08, 2.87, .279], [.14, 2.99, .248], [.27, 3.12, .14]], .05, '#cf6ca1');
    ribbon('clown-wide-white-grinning-teeth', 'accent', [[-.23, 2.8, .244], [-.08, 2.9, .309], [.14, 3.015, .274], [.25, 3.1, .183]], .028, white);
    for (let tooth = 0; tooth < 8; tooth += 1) {const x = -.2 + tooth * .059, y = 2.82 + tooth * .034;rod(`clown-individual-black-tooth-gap-${tooth}`, 'dark', [x, y -.021, .301 - Math.abs(x) * .27], [x + .012, y + .024, .301 - Math.abs(x) * .27], .005, .005, '#263537');}
    ribbon('clown-right-cheek-teal-swirl', 'dark', [[.26, 3.17, .198], [.22, 3.15, .246], [.205, 3.05, .266], [.27, 3.075, .19]], .011, '#0c4b5c');
    rod('clown-striped-neck', 'body', [0, 2.32, .0], [0, 2.63, .04], .12, .12, purple);
    for (let band = 0; band < 3; band += 1) compactRing(`clown-neck-gold-band-${band}`, 'accent', [0, 2.35 + band * .105, .01], .124, undefined, gold);
    for (const side of [-1, 1]) {
      const ear = new THREE.Shape();ear.moveTo(side * .25, 3.23);ear.lineTo(side * .78, 3.16);ear.lineTo(side * .31, 2.95);ear.closePath();
      part(`clown-large-silver-pointed-ear-${side}`, new THREE.ExtrudeGeometry(ear, { depth: .065, bevelEnabled: false }), 'accent', [0, 0, -.04], undefined, undefined, '#bac9c2');
      ribbon(`clown-dark-ear-inner-${side}`, 'dark', [[side * .31, 3.18, .04], [side * .63, 3.15, .04], [side * .36, 3.045, .04]], .021, '#52676a');
      sphere(`clown-blue-puffed-sleeve-${side}`, 'body', [side * .52, 2.18, -.02], [.32, .39, .3], 1, teal);
      for (let point = 0; point < 3; point += 1) {
        const x = side * (.34 + point * .14), y = 2.18 + Math.sin(point * .9) * .21;
        cone(`clown-purple-sleeve-zigzag-${side}-${point}`, 'dark', [x, y, .275], [.07, .22, .025], [0, 0, side * .2], purple);
      }
      const elbow = [side * .81, 1.62, .13], wrist = [side * .42, 2.03, .58], palm = [side * .42, 2.22, .66];
      rod(`clown-casting-white-upper-arm-${side}`, 'accent', [side * .56, 2.12, .0], elbow, .12, .1, white);
      rod(`clown-casting-white-forearm-${side}`, 'accent', elbow, wrist, .11, .09, white);
      compactRing(`clown-casting-gold-elbow-cuff-${side}`, 'accent', elbow, .123, [Math.PI / 2, 0, side * .7], gold);
      compactRing(`clown-casting-purple-wrist-cuff-${side}`, 'dark', wrist, .115, [Math.PI / 2, 0, -side * .65], purple);
      sphere(`clown-casting-open-purple-palm-${side}`, 'dark', palm, [.18, .23, .105], 1, purple);
      for (let finger = 0; finger < 3; finger += 1) {
        const x = palm[0] + (finger - 1) * .11;
        fingerCurve(`clown-casting-curled-long-finger-${side}-${finger}`, [[x, 2.3, .67], [x + side * .022, 2.57 + finger * .07, .69], [x + side * .07, 2.65 + finger * .07, .57], [x + side * .13, 2.58 + finger * .07, .53]], .046, finger % 2 ? '#966caf' : purple);
      }
      fingerCurve(`clown-casting-inward-thumb-${side}`, [[palm[0] - side * .14, 2.19, .66], [palm[0] - side * .23, 2.3, .69], [palm[0] - side * .2, 2.43, .62]], .055, purple);
      // Lower legs are not visible in the archived bust illustration.
      rod(`clown-inferred-purple-leg-${side}`, 'dark', [side * .2, .85, 0], [side * .25, .23, .02], .09, .085, purple);
      sphere(`clown-inferred-blue-shoe-${side}`, 'body', [side * .3, .17, .23], [.22, .16, .4], 1, teal);
      for (let point = 0; point < 3; point += 1) {
        const baseY = 2.48 - point * .16, tipX = side * (1.05 + point * .03), tipY = baseY + .14;
        const collar = new THREE.Shape();collar.moveTo(side * .15, baseY -.08);collar.lineTo(tipX, tipY);collar.lineTo(side * .43, baseY + .23);collar.closePath();
        part(`clown-red-radial-collar-point-${side}-${point}`, new THREE.ExtrudeGeometry(collar, { depth: .055, bevelEnabled: false }), 'accent', [0, 0, -.16], undefined, undefined, red);
        sphere(`clown-gold-collar-bell-${side}-${point}`, 'eye', [tipX, tipY, -.125], [.07, .07, .07], 1, gold);
      }
    }
    const hat = new THREE.Shape();hat.moveTo(-1.02, 3.75);hat.quadraticCurveTo(-.39, 3.55, .57, 3.2);hat.quadraticCurveTo(.95, 3.18, 1.01, 3.65);hat.quadraticCurveTo(.82, 3.4, .56, 3.5);hat.quadraticCurveTo(-.31, 3.87, -1.02, 3.75);hat.closePath();
    part('clown-wide-curved-purple-hat-brim', new THREE.ExtrudeGeometry(hat, { depth: .35, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 1, curveSegments: 8 }), 'dark', [0, 0, -.2], undefined, undefined, '#493468');
    const crown = new THREE.Shape();crown.moveTo(-.31, 3.68);crown.lineTo(-.24, 4.02);crown.lineTo(-.08, 3.85);crown.lineTo(.16, 4.19);crown.lineTo(.16, 3.94);crown.lineTo(.39, 4.12);crown.lineTo(.4, 3.63);crown.closePath();
    part('clown-red-sawtooth-hat-crown', new THREE.ExtrudeGeometry(crown, { depth: .26, bevelEnabled: false }), 'accent', [0, 0, -.22], undefined, undefined, red);
    // The source hat is asymmetric: the left brim sweeps to a bare point;
    // only the separate curled right crown point carries a golden bell.
    ribbon('clown-purple-right-curved-crown-horn', 'dark', [[.16, 3.79, -.19], [.47, 4.17, -.17], [.81, 4.31, -.1], [1.08, 4.04, .02]], .078, purple);
    sphere('clown-gold-right-crown-tip-bell', 'eye', [1.08, 4.04, .02], [.085, .085, .085], 1, gold);
    ribbon('clown-purple-left-swept-brim-horn', 'dark', [[-.76, 3.72, -.05], [-1.0, 3.82, -.04], [-1.16, 4.09, -.06]], .067, purple);
    rod('clown-purple-left-bare-hat-point', 'dark', [-1.13, 4.04, -.06], [-1.19, 4.29, -.08], .065, .003, purple);
    return true;
  }

  if (profile.anatomy === 'olive-winged-serpent') {
    const olive = '#879451', light = '#d6d98b', dark = '#273d25', vent = '#dc4525';
    const curve = new THREE.CatmullRomCurve3([[0, 2.86, .34], [0, 2.2, -.16], [.28, 1.55, -.51], [.86, 1.07, -.46], [1.2, 1.36, -.23], [1.23, 2.07, -.14], [1.09, 2.62, -.19]].map(p => new THREE.Vector3(...p)));
    part('curse-continuous-looped-serpent-trunk', new THREE.TubeGeometry(curve, 30, .22, 8, false), 'body', [0, 0, 0], undefined, undefined, olive);
    for (let segment = 0; segment < 11; segment += 1) {
      const t = segment / 12, p = curve.getPoint(t), tangent = curve.getTangent(t), rotation = [0, 0, -Math.atan2(tangent.x, tangent.y)];
      box(`curse-red-segmented-ventral-plate-${segment}`, 'accent', [p.x, p.y, p.z + .225], [.23, .105, .045], rotation, vent);
      for (const side of [-1, 1]) sphere(`curse-dark-ventral-border-${segment}-${side}`, 'dark', [p.x + side * .123, p.y, p.z + .207], [.025, .07, .025], 0, dark);
    }
    const head = new THREE.Shape();head.moveTo(-.2, -.08);head.lineTo(-.27, .22);head.lineTo(.16, .43);head.lineTo(.74, .26);head.lineTo(1.04, -.04);head.lineTo(.58, .08);head.lineTo(.42, -.12);head.closePath();
    const skull = new THREE.ExtrudeGeometry(head, { depth: .4, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 1 });
    const skullPositions = skull.attributes.position;
    // A profile extrusion alone yields a rectangular snout from the front.
    // Taper its real depth toward the source's narrow hooked nose.
    for (let vertex = 0; vertex < skullPositions.count; vertex += 1) {
      const taper = Math.max(.35, 1 - Math.max(0, skullPositions.getX(vertex) - .2) * .8);
      skullPositions.setZ(vertex, .2 + (skullPositions.getZ(vertex) - .2) * taper);
    }
    skull.computeVertexNormals();
    part('curse-long-angular-horned-skull', skull, 'body', [.2, 2.94, .35], undefined, [0, -Math.PI / 2, 0], light);
    sphere('curse-raised-olive-forehead-plate', 'body', [0, 3.29, .48], [.27, .2, .23], 1, olive);
    sphere('curse-raised-long-nasal-plate', 'body', [0, 3.17, .81], [.13, .12, .29], 1, '#a7b167');
    rod('curse-narrow-ivory-nasal-ridge', 'accent', [0, 3.38, .49], [0, 3.16, 1.11], .042, .012, light);
    box('curse-dark-open-mouth', 'dark', [0, 2.885, .95], [.31, .19, .51], undefined, '#18271b');
    sphere('curse-red-mouth-interior', 'accent', [0, 2.85, 1.06], [.12, .105, .26], 1, '#b83628');
    ribbon('jaw-curse-curved-hooked-lower-mandible', 'body', [[0, 2.91, .53], [0, 2.64, .67], [0, 2.69, 1.0], [0, 2.85, 1.24]], .095, light);
    for (const side of [-1, 1]) {
      sphere(`curse-red-recessed-eye-${side}`, 'eye', [side * .229, 3.155, .6], [.024, .04, .08], 1, vent);
      sphere(`curse-black-eye-slit-${side}`, 'dark', [side * .25, 3.155, .61], [.01, .043, .02], 0, '#172514');
      ribbon(`curse-ivory-long-head-horn-${side}`, 'accent', [[side * .16, 3.25, .34], [side * .28, 3.55, .14], [side * .4, 3.97, -.04]], .07, light);
      rod(`curse-head-horn-point-${side}`, 'accent', [side * .38, 3.88, -.01], [side * .47, 4.18, -.12], .065, .002, light);
      for (let tooth = 0; tooth < 3; tooth += 1) cone(`curse-ivory-upper-fang-${side}-${tooth}`, 'accent', [side * .13, 2.94, .75 + tooth * .15], [.026, .14, .024], [Math.PI, 0, 0], '#ecead2');
      cone(`jaw-curse-long-lower-fang-${side}`, 'accent', [side * .1, 2.79, .82], [.025, .19, .026], undefined, '#ecead2');
      sphere(`curse-long-red-skull-vent-${side}`, 'accent', [side * .222, 3.11, .93], [.025, .075, .19], 1, vent);
      for (let rib = 0; rib < 5; rib += 1) rod(`curse-black-skull-vent-rib-${side}-${rib}`, 'dark', [side * .247, 3.04, .81 + rib * .049], [side * .247, 3.17, .82 + rib * .049], .009, .008, dark);
      const shoulder = [side * .28, 2.25, -.2], elbow = [side * 1.02, 3.1, -.21], tip = [side * 1.95, 3.64, -.16];
      ribbon(`wing-${side}-curse-heavy-curved-leading-edge`, 'body', [shoulder, elbow, [side * 1.65, 3.18, -.19], tip], .1, olive);
      const wing = new THREE.Shape();wing.moveTo(shoulder[0], shoulder[1]);wing.quadraticCurveTo(side * .75, 3.26, elbow[0], elbow[1]);wing.quadraticCurveTo(side * 1.36, 2.99, tip[0], tip[1]);wing.quadraticCurveTo(side * 2.28, 2.91, side * 1.88, 2.44);wing.lineTo(side * 1.6, 2.7);wing.lineTo(side * 1.25, 2.37);wing.lineTo(side * 1.32, 2.16);wing.quadraticCurveTo(side * .86, 2.46, shoulder[0], shoulder[1]);wing.closePath();
      part(`wing-${side}-curse-sculpted-swept-olive-membrane`, new THREE.ExtrudeGeometry(wing, { depth: .06, bevelEnabled: false, curveSegments: 8 }), 'body', [0, 0, -.23], undefined, undefined, olive);
      ribbon(`wing-${side}-curse-dark-scalloped-trailing-rim`, 'dark', [[tip[0], tip[1], -.13], [side * 2.05, 3.05, -.13], [side * 1.88, 2.44, -.13], [side * 1.6, 2.7, -.13], [side * 1.25, 2.37, -.13], [side * 1.32, 2.16, -.13], [side * .65, 2.4, -.13]], .025, dark);
      sphere(`wing-${side}-curse-red-oval-vent`, 'accent', [side * 1.08, 2.81, -.125], [.22, .045, .022], 1, vent);
      for (let rib = 0; rib < 5; rib += 1) rod(`wing-${side}-curse-black-vent-rib-${rib}`, 'dark', [side * (.91 + rib * .073), 2.77, -.095], [side * (.91 + rib * .073), 2.85, -.095], .008, .008, dark);
      rod(`curse-back-swept-scapular-spike-${side}`, 'accent', [side * .12, 1.87, -.35], [side * .72, 1.61, -.73], .1, .003, light);
      rod(`curse-loop-body-swept-spike-${side}`, 'body', [.87 + side * .17, 1.15, -.47], [.92 + side * .43, .7, -.5], .087, .003, olive);
    }
    ribbon('curse-hooked-tail-tip', 'body', [[1.09, 2.62, -.19], [.92, 2.88, -.18], [.77, 2.79, -.12], [.86, 2.61, -.08]], .07, olive);
    rod('curse-pointed-tail-terminal', 'accent', [.86, 2.61, -.08], [1.03, 2.78, -.02], .057, .002, light);
    return true;
  }
  return false;
}
