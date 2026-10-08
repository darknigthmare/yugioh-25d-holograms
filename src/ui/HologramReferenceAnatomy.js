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
  return false;
}
