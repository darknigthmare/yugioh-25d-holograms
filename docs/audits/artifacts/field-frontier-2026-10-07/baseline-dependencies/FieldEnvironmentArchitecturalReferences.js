/**
 * Scenery reconstructed from individually inspected, preserved card art.
 * The volumes occupy the edge of the duel area; their dimensions are adapted
 * for play. Illustrated characters remain in the original backdrop.
 */
export const ARCHITECTURAL_CARD_LANDMARKS = Object.freeze({
  '68462976': 'spellcaster-tree-village',
  '92481084': 'minds-eye-golden-chamber',
  '11102908': 'shien-purple-tiered-castle',
  '53527835': 'dark-city-window-canyon',
  '81231742': 'sorcerous-golden-inscribed-circle',
  '73787254': 'saber-cyan-vault',
  '53819808': 'six-temple-cyan-seal',
  '33981008': 'spellbook-spiral-tower',
  '52518793': 'gladiator-broken-colosseum',
  '12845564': 'angelechy-radiant-plates',
  '18114794': 'summon-breaker-off-switch',
  '95376428': 'extra-net-cyan-lattice'
});

export const ARCHITECTURAL_INSPECTED_ART_PROFILES = Object.freeze(Object.fromEntries([
  ['68462976', ['#a2a66a','#d8d5a0','#798147','#cfffe3','#836345','#f4f1c4'], ['twisting ochre tree trunks', 'round dwellings with moss roofs', 'cyan woodland motes']],
  ['92481084', ['#a38b5b','#deb333','#467354','#ffd862','#893e26','#f9e7b8'], ['gold framed pink chamber', 'striped painted columns', 'red carpet and stepped golden altar']],
  ['11102908', ['#272331','#3b2b53','#282737','#ac5ee3','#42363a','#746684'], ['layered upward curved castle roofs', 'purple backlight', 'enclosing bare branches']],
  ['53527835', ['#535d63','#181c1c','#171a1b','#fff1a1','#191d23','#d2cc9b'], ['dark asymmetric building silhouettes', 'tall golden window rectangles', 'cobbled central street under a yellow moon']],
  ['81231742', ['#7eab91','#829a8d','#678567','#fff277','#426c68','#eeffd8'], ['multiple luminous golden circles', 'angular inscribed ring marks', 'vertical yellow green light shafts around six cloaked figures']],
  ['73787254', ['#769da9','#a4c2c7','#243841','#59eff5','#413632','#fcf5b5'], ['silver beveled chamber', 'cyan zigzag inlays', 'central suspended silver sword and gold cross seals']],
  ['53819808', ['#263a3b','#44505c','#273132','#a5f4f8','#29252d','#c7e6e0'], ['three tiered dark blue temple roofs', 'central round cyan gate seal', 'orange sunset and bare trees']],
  ['33981008', ['#8f9e9d','#c5d4d6','#436975','#21eddc','#374345','#e5eced'], ['tall tapering tower wrapped in silver spiral bands', 'turquoise orbit rings', 'cyan orb in crown with distant pale town']],
  ['52518793', ['#777569','#b4ae97','#566663','#4cc4c9','#585443','#d7e5e7'], ['broken circular stone colosseum', 'turquoise fissures in floor and pillars', 'icy central dais and shafts of white light']],
  ['12845564', ['#426b8e','#d6babe','#456789','#ffb3a2','#353c60','#ffe2b4'], ['long engraved silver plates converging toward armored figure', 'orange pink border rays', 'blue sky with pale radial streaks']],
  ['18114794', ['#35474b','#9cabb9','#33666a','#f274ff','#495460','#e2dde3'], ['large gray switch panel with red horizontal lever', 'magenta stepped light platform and floating diamonds', 'OFF label below lever']],
  ['95376428', ['#bc8f8c','#d79f97','#77baa8','#6effd8','#784e46','#ffffea'], ['pink enclosed room with gold trim', 'cyan curved net strands', 'rectangular pale exit and red wall indicator']]
].map(([cardId, colors, motifs]) => [cardId, Object.freeze({
  cardId,
  sourceUrl: `https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
  motifs: Object.freeze(motifs),
  palette: Object.freeze({ ground: colors[0], stone: colors[1], foliage: colors[2], accent: colors[3], wood: colors[4], foam: colors[5] })
})])));

/** Return false for sources owned by the family/other reference builder. */
export function createArchitecturalReferenceGeometry(ctx) {
  const { THREE, profile, materials: m, material, geometry, add, block, beam,
    cloudBank, bareTree, curvedTube, curvedDeck, box, rock, cone, cylinder, crown, ring } = ctx;
  const id = profile.cardId;
  if (!Object.hasOwn(ARCHITECTURAL_CARD_LANDMARKS, id)) return false;

  // All substantial shapes are behind z=-18 or beside x=+/-9. Continuous
  // source shapes are shared/batched/disposed by the owning geometry factory.
  switch (id) {
    case '68462976': {
      for (const side of [-1, 1]) {
        const x = side * 16;
        curvedTube('village-twisted-trunk', m.wood,
          t => [x + side * Math.sin(t * 5) * 0.8, 14 * t, -20 + Math.sin(t * 3) * 0.65],
          t => [1.65 - t * 0.65, 1.7 - t * 0.7], 28);
        curvedTube('village-overhanging-bough', m.wood,
          t => [x + side * t * 7, 8.6 + Math.sin(t * Math.PI) * 1.8, -21 - t * 4],
          t => [0.55 - t * 0.32, 0.5 - t * 0.3], 20);
        for (let branch = 0; branch < 4; branch += 1) beam('village-high-branch',
          [x, 7 + branch * 1.7, -20], [x + side * (3.2 + branch * 0.6), 9 + branch * 1.6, -23], m.wood, 0.15);
        for (let house = 0; house < 2; house += 1) {
          const hx = side * (13.5 + house * 7), hz = -26 - house * 6;
          add('village-round-plaster-home', rock, m.stone, [hx, 2.3, hz], [2.8, 3.1, 2.7]);
          add('village-moss-roof', rock, m.leaves, [hx, 4.3, hz], [3.1, 1.6, 2.9]);
          add('village-arched-wooden-door', cylinder, m.wood, [hx, 1.6, hz + 2.51], [0.65, 0.08, 1.3], [Math.PI / 2, 0, 0]);
          add('village-round-window', cylinder, m.dark, [hx + side * 1.2, 3.2, hz + 2.27], [0.28, 0.04, 0.28], [Math.PI / 2, 0, 0]);
          for (let step = 0; step < 3; step += 1) block('village-door-stair', m.stone,
            hx, 0.13 + step * 0.17, hz + 3.1 - step * 0.25, 1.8, 0.25, 0.7);
          block('village-chimney', m.wood, hx + side * 1.4, 5.2, hz - 0.4, 0.35, 1.7, 0.5);
        }
        for (let mote = 0; mote < 6; mote += 1) add('village-cyan-mote', crown, m.light,
          [side * (11.5 + mote * 1.1), 2.7 + (mote % 3) * 2.1, -21 - mote * 1.5], [0.08, 0.08, 0.08]);
        for (let canopy = 0; canopy < 3; canopy += 1) add('village-high-mossy-canopy', crown, m.leaves,
          [side * (11 + canopy * 3.8), 14 + canopy * 0.7, -26 - canopy * 2], [3.9, 1.8, 4]);
      }
      curvedTube('village-central-arching-bough', m.wood,
        t => [-16 + t * 32, 10.5 + Math.sin(t * Math.PI) * 2, -25 - Math.sin(t * Math.PI) * 3],
        t => [0.5 + Math.cos(t * Math.PI * 2) * 0.13, 0.4], 40);
      break;
    }
    case '92481084': {
      const red = material('#b44920');
      const pink = material('#ffe5ef', { emissive: '#ffb9d9', emissiveIntensity: 0.55 });
      block('minds-eye-rear-chamber', m.ground, 0, 8, -36, 30, 16, 0.5);
      block('minds-eye-coffered-ceiling', m.ground, 0, 17, -30, 30, 0.5, 12);
      for (const side of [-1, 1]) for (let column = 0; column < 3; column += 1) {
        const x = side * 13, z = -22 - column * 5;
        add('minds-eye-painted-column', cylinder, m.stone, [x, 6.6, z], [0.62, 12.5, 0.62]);
        for (let band = 0; band < 4; band += 1) {
          add('minds-eye-red-column-band', cylinder, red, [x, 1.2 + band * 3.1, z], [0.64, 0.25, 0.64]);
          for (const offset of [-0.3, 0.3]) block('minds-eye-green-painted-stripe', m.leaves,
            x + offset, 2.4 + band * 3.1, z + 0.61, 0.1, 1.7, 0.04);
        }
        add('minds-eye-column-capital', cylinder, m.stone, [x, 13.1, z], [0.87, 0.5, 0.87]);
        add('minds-eye-flame-bowl', cylinder, m.stone, [side * 9.8, 0.4, z], [0.45, 0.5, 0.45]);
        add('minds-eye-flame', cone, m.light, [side * 9.8, 1.1, z], [0.32, 1.15, 0.32]);
      }
      for (let step = 0; step < 5; step += 1) {
        block('minds-eye-golden-altar-step', m.stone, 0, 0.2 + step * 0.35, -27 - step * 0.8,
          13 - step * 1.3, 0.45, 1.2);
        block('minds-eye-red-carpet-step', red, 0, 0.44 + step * 0.35, -26.95 - step * 0.8,
          3.2, 0.035, 1.2);
      }
      block('minds-eye-red-rear-carpet', red, 0, 0.03, -24, 3.2, 0.04, 3.2);
      block('minds-eye-pink-luminous-panel', pink, 0, 8.7, -32, 6.5, 10.3, 0.16);
      for (const side of [-1, 1]) {
        block('minds-eye-golden-panel-frame', m.stone, side * 3.75, 8.7, -31.6, 0.6, 11.3, 0.65);
        for (let joint = 0; joint < 12; joint += 1) block('minds-eye-red-frame-joint', red,
          side * 3.76, 3.6 + joint * 0.85, -31.22, 0.65, 0.06, 0.025);
      }
      for (const y of [3.15, 14.25]) block('minds-eye-golden-panel-lintel', m.stone, 0, y, -31.6, 8, 0.6, 0.65);
      block('minds-eye-projecting-golden-cornice', m.stone, 0, 14.95, -31.3, 9.5, 0.65, 1.5);
      beam('minds-eye-diagonal-golden-staff', [-0.65, 5.8, -31.75], [0.65, 10.8, -31.75], m.gold, 0.1);
      add('minds-eye-staff-eye-frame', ring, m.gold, [0.66, 10.75, -31.69], [0.55, 0.33, 0.12]);
      add('minds-eye-staff-dark-pupil', crown, m.wood, [0.66, 10.75, -31.62], [0.11, 0.17, 0.04]);
      for (const side of [-1, 1]) {
        beam('minds-eye-staff-wing', [0.65, 10.75, -31.68], [0.65 + side * 0.9, 11.15, -31.68], red, 0.09);
        beam('minds-eye-staff-wing-tip', [0.65 + side * 0.9, 11.15, -31.68], [0.65 + side * 1.1, 11.45, -31.68], red, 0.055);
      }
      break;
    }
    case '11102908':
    case '53819808': {
      const shien = id === '11102908';
      const body = shien ? m.stone : material('#c8bab0');
      const roof = material(shien ? '#26203c' : '#28364c');
      const z = -32;
      const tiers = shien ? 4 : 3;
      for (let tier = 0; tier < tiers; tier += 1) {
        const width = 18 - tier * 3.7, y = 2.5 + tier * 3.1;
        block(shien ? 'shien-tiered-keep' : 'six-temple-tiered-keep', body, 0, y, z,
          width * 0.82, 3, 5.5 - tier * 0.65);
        const depth = 7.2 - tier * 0.9;
        const roofShape = geometry(`architectural-${id}-pitched-roof-${tier}`, () => {
          // Two rows across the depth retain a raised center ridge. A deck
          // with only its two outer edges would stay flat after deformation.
          const shape = new THREE.BoxGeometry(width, 0.24, depth, 32, 1, 2);
          const positions = shape.attributes.position;
          for (let i = 0; i < positions.count; i += 1) {
            const x = positions.getX(i), localZ = positions.getZ(i);
            const eave = Math.pow(Math.abs(x) / (width * 0.5), 3) * 1.05;
            const pitch = (1 - Math.abs(localZ) / (depth * 0.5)) * 1.35;
            positions.setY(i, positions.getY(i) + y + 1.7 + eave + pitch);
            positions.setZ(i, localZ + z);
          }
          positions.needsUpdate = true; shape.computeVertexNormals();
          shape.userData.continuousCurve = Object.freeze(Array.from({ length: 33 }, (_, index) => {
            const t = index / 32;
            return Object.freeze([(t - 0.5) * width, y + 1.7 + Math.pow(Math.abs(t - 0.5) * 2, 3) * 1.05, z]);
          }));
          return shape;
        });
        add(shien ? 'shien-upswept-roof' : 'six-temple-upswept-roof', roofShape, roof, [0, 0, 0]);
        beam(shien ? 'shien-ornate-roof-ridge' : 'six-temple-roof-ridge',
          [-width * 0.39, y + 3.1, z], [width * 0.39, y + 3.1, z], roof, 0.08);
        for (let window = -2; window <= 2; window += 1) block(shien ? 'shien-dark-window' : 'six-temple-dark-window',
          m.dark, window * width * 0.125, y + 0.1, z + 2.82 - tier * 0.32, 0.4, 0.6, 0.045);
      }
      for (const side of [-1, 1]) {
        bareTree(shien ? 'shien-bare-branch' : 'six-temple-bare-branch', side * 16, -21, shien ? 12 : 10);
        bareTree(shien ? 'shien-distant-branch' : 'six-temple-distant-branch', side * 22, -31, 7);
        cloudBank(shien ? 'shien-purple-low-mist' : 'six-temple-pale-low-mist', side * 15, 0.6, -25, 5, m.paper);
      }
      if (!shien) {
        block('six-temple-stone-gate', m.stone, 0, 2.1, -28.9, 9.5, 4.2, 1);
        add('six-temple-cyan-seal-ring', ring, m.light, [0, 2.3, -28.3], [1.8, 1.8, 1.8]);
        add('six-temple-cyan-seal-inner-ring', ring, m.light, [0, 2.3, -28.28], [1.4, 1.4, 1.4]);
        for (let spoke = 0; spoke < 6; spoke += 1) {
          const a = spoke * Math.PI / 3;
          beam('six-temple-six-spoke-seal', [Math.cos(a) * 0.6, 2.3 + Math.sin(a) * 0.6, -28.25],
            [Math.cos(a) * 1.2, 2.3 + Math.sin(a) * 1.2, -28.25], m.light, 0.05);
        }
        add('six-temple-cyan-seal-core', crown, m.light, [0, 2.3, -28.2], [0.2, 0.2, 0.08]);
      } else {
        beam('shien-purple-halo-edge', [-8, 0.3, -35], [-8, 13, -35], m.light, 0.045);
        beam('shien-purple-halo-edge', [8, 0.3, -35], [8, 13, -35], m.light, 0.045);
      }
      break;
    }
    case '53527835': {
      for (const side of [-1, 1]) for (let building = 0; building < 5; building += 1) {
        const x = side * (12.6 + building * 0.65), z = -23 + building * 7.3;
        const height = [12, 8.7, 16, 10.3, 19][building];
        block('dark-city-flat-black-facade', m.stone, x, height / 2, z, 4.7, height, 5.2);
        for (let floor = 0; floor < Math.floor(height / 3); floor += 1) for (const column of [-1, 1]) {
          block('dark-city-tall-golden-window', m.light, x + column * 1.08, 1.6 + floor * 2.85,
            z + 2.63, 0.5, 1.65, 0.055);
          if (column === -1) block('dark-city-side-golden-window', m.light, x - side * 2.38, 1.6 + floor * 2.85,
            z - 1.18, 0.055, 1.65, 0.5);
        }
      }
      for (let building = -2; building <= 2; building += 1) {
        const height = [7.8, 11.4, 14.4, 9.6, 12][building + 2], x = building * 4.5;
        block('dark-city-rear-skyline', m.stone, x, height / 2, -30, 4.1, height, 4);
        for (let floor = 0; floor < Math.floor(height / 3); floor += 1) block('dark-city-rear-golden-window',
          m.light, x, 1.7 + floor * 3, -27.95, 0.6, 1.65, 0.04);
      }
      for (let row = 0; row < 5; row += 1) for (let tile = -4; tile <= 4; tile += 1) {
        block('dark-city-rear-cobblestone', m.ground, tile * 1.25 + (row % 2) * 0.3, 0.06,
          -22 - row * 0.85, 1.14, 0.1, 0.73);
      }
      add('dark-city-yellow-moon', crown, m.paper, [-14, 23, -38], [6, 6, 0.65]);
      break;
    }
    case '81231742': {
      for (const radius of [3.8, 4.15, 5.4, 5.8, 6.4]) add('sorcerous-concentric-golden-circle', ring,
        m.light, [0, 0.1, -31], [radius, radius, radius], [-Math.PI / 2, 0, 0]);
      for (let glyph = 0; glyph < 18; glyph += 1) {
        const a = glyph * Math.PI * 2 / 18, x = Math.cos(a) * 4.8, z = -31 + Math.sin(a) * 4.8;
        beam('sorcerous-angular-ring-inscription', [x, 0.16, z],
          [Math.cos(a + 0.07) * 5.25, 0.16, -31 + Math.sin(a + 0.07) * 5.25], m.light, 0.045);
        beam('sorcerous-angular-ring-inscription', [x, 0.16, z],
          [Math.cos(a - 0.07) * 5.25, 0.16, -31 + Math.sin(a - 0.07) * 5.25], m.light, 0.045);
      }
      for (const side of [-1, 1]) for (let shaft = 0; shaft < 4; shaft += 1) {
        beam('sorcerous-vertical-golden-shaft', [side * (12 + shaft * 2.3), 0.1, -24 - shaft * 2.5],
          [side * (12 + shaft * 2.3), 13 + shaft, -24 - shaft * 2.5], m.light, 0.05);
      }
      add('sorcerous-pale-rear-dais', cylinder, m.ground, [0, -0.09, -31], [7, 0.1, 7]);
      break;
    }
    case '73787254': {
      block('saber-silver-vault-wall', m.stone, 0, 7.5, -34, 17.5, 15, 0.65);
      block('saber-silver-vault-plinth', m.stone, 0, 0.45, -29, 18, 0.9, 7);
      for (const side of [-1, 1]) {
        block('saber-dark-vertical-frame', m.dark, side * 9.3, 8, -33, 1.8, 16, 1.3);
        for (let stripe = 0; stripe < 3; stripe += 1) {
          const y = 2 + stripe * 5;
          beam('saber-cyan-chevron-inlay', [side * 9.1, y, -32.3], [side * 9.1, y + 1.7, -32.3], m.light, 0.055);
          beam('saber-cyan-chevron-inlay', [side * 9.1, y + 1.7, -32.3], [side * 8.8, y + 2.1, -32.3], m.light, 0.055);
          beam('saber-cyan-chevron-inlay', [side * 8.8, y + 2.1, -32.3], [side * 9.1, y + 2.5, -32.3], m.light, 0.055);
          add('saber-cyan-round-node', cylinder, m.light, [side * 9.3, y + 3.3, -32.3], [0.35, 0.06, 0.35], [Math.PI / 2, 0, 0]);
        }
        for (const y of [0.95, 1.25]) {
          beam('saber-plinth-cyan-zigzag', [side * 8.5, y, -25.45], [side * 5, y, -25.45], m.light, 0.045);
          beam('saber-plinth-cyan-zigzag', [side * 5, y, -25.45], [side * 4.3, y + 0.4, -25.45], m.light, 0.045);
          beam('saber-plinth-cyan-zigzag', [side * 4.3, y + 0.4, -25.45], [side * 1, y + 0.4, -25.45], m.light, 0.045);
        }
      }
      for (let panel = -2; panel <= 2; panel += 1) block('saber-vault-vertical-joint', m.dark,
        panel * 3.5, 7.5, -33.64, 0.045, 14.5, 0.03);
      const blade = geometry('architectural-saber-pointed-blade', () => {
        const shape = new THREE.BoxGeometry(0.64, 5.9, 0.15, 1, 10, 1);
        const positions = shape.attributes.position;
        for (let i = 0; i < positions.count; i += 1) {
          const t = (positions.getY(i) + 2.95) / 5.9;
          const halfWidth = 0.32 * (t < 0.15 ? t / 0.15 : 0.78 + t * 0.22);
          positions.setX(i, Math.sign(positions.getX(i)) * halfWidth);
        }
        positions.needsUpdate = true; shape.computeVertexNormals(); return shape;
      });
      add('saber-suspended-pointed-sword', blade, m.paper, [0, 8.05, -32.8]);
      beam('saber-gold-crossguard', [-1.3, 11, -32.64], [1.3, 11, -32.64], m.gold, 0.14);
      beam('saber-gold-grip', [0, 11.1, -32.64], [0, 12.3, -32.64], m.gold, 0.14);
      add('saber-gold-pommel', crown, m.gold, [0, 12.45, -32.64], [0.22, 0.22, 0.14]);
      add('saber-gold-cross-seal', cylinder, m.gold, [0, 1.2, -25.4], [0.7, 0.1, 0.7], [Math.PI / 2, 0, 0]);
      for (const angle of [-Math.PI / 4, Math.PI / 4]) add('saber-seal-cross', box, m.light, [0, 1.2, -25.28], [0.85, 0.08, 0.05], [0, 0, angle]);
      break;
    }
    case '33981008': {
      const taper = geometry('architectural-spellbook-taper', () => new THREE.CylinderGeometry(0.7, 5.3, 18, 24));
      add('spellbook-tapering-tower', taper, m.dark, [0, 9, -32]);
      for (let row = 0; row < 8; row += 1) for (let column = -2; column <= 2; column += 1) {
        const y = 1.7 + row * 1.8, radius = 5.3 - y * 4.6 / 18;
        block('spellbook-tower-recessed-window', m.wood, column * radius * 0.24, y, -32 + radius,
          0.22, 0.65, 0.045);
      }
      curvedDeck('spellbook-continuous-silver-spiral', m.stone, t => {
        const a = t * Math.PI * 6, r = 5.8 - t * 5;
        return [Math.cos(a) * r, 0.6 + t * 18, -32 + Math.sin(a) * r];
      }, 1.55, 0.22, 96);
      curvedDeck('spellbook-swept-silver-base', m.stone,
        t => [(t - 0.5) * 20, 0.2 + Math.pow(Math.sin(t * Math.PI), 3) * 4.5, -31], 1.4, 0.23, 48);
      beam('spellbook-thin-top-spire', [0, 17.5, -32], [0, 25, -32], m.stone, 0.17);
      add('spellbook-crown-cyan-orb', crown, m.light, [0, 14.5, -32], [0.75, 0.75, 0.75]);
      for (const side of [-1, 1]) {
        beam('spellbook-silver-sloping-structural-rib', [side * 4.6, 0.2, -28.7], [side * 0.9, 16, -31], m.stone, 0.15);
        beam('spellbook-silver-sloping-structural-rib', [side * 3.4, 0.2, -34.7], [side * 0.7, 16, -32.7], m.stone, 0.15);
      }
      for (const [y, radius] of [[7.3, 7.2], [12, 4.3], [20, 9.3], [24, 1.4]]) add('spellbook-turquoise-orbit', ring,
        m.light, [0, y, -32], [radius, radius, radius], [Math.PI / 2, 0, 0]);
      for (let glyph = 0; glyph < 12; glyph += 1) {
        const a = glyph * Math.PI / 6;
        block('spellbook-orbit-luminous-glyph', m.light, Math.cos(a) * 5, 10.5, -32 + Math.sin(a) * 5, 0.1, 0.48, 0.1);
      }
      for (const side of [-1, 1]) for (let house = 0; house < 4; house += 1) {
        const x = side * (14 + house * 4.4);
        block('spellbook-distant-pale-town', m.stone, x, 1.3, -37, 3, 2.6, 3);
        add('spellbook-distant-town-roof', cone, m.wood, [x, 3.15, -37], [2.2, 1.6, 2.2]);
      }
      break;
    }
    case '52518793': {
      // Unequal teeth and gaps reproduce the damaged oval enclosure. Avoid a
      // closed cylinder/caps: those would hide the opening in the source.
      for (let section = 0; section < 14; section += 1) {
        const a = (section + 0.5) * Math.PI / 14, x = Math.cos(a) * 18, z = -29 - Math.sin(a) * 10;
        const h = 7.2 + (section % 3) * 0.8;
        block('gladiator-ruined-enclosure-pier', m.stone, x, h * 0.5, z, 1.5, h, 2.6).rotation.y = -a;
        block('gladiator-unequal-broken-wall-tooth', m.stone, x, h + 1.2, z, 1, 2.4, 1.7).rotation.z = ((section % 3) - 1) * 0.13;
        beam('gladiator-cyan-stone-fissure', [x - 0.3, 0.4, z + 1.45], [x + 0.2, h * 0.4, z + 1.45], m.light, 0.045);
        beam('gladiator-cyan-stone-fissure', [x + 0.2, h * 0.4, z + 1.45], [x - 0.45, h * 0.75, z + 1.45], m.light, 0.045);
      }
      for (const side of [-1, 1]) {
        for (let pillar = 0; pillar < 3; pillar += 1) {
          const x = side * (12.5 + pillar * 3.4), z = -21 + pillar * 8;
          add('gladiator-foreground-broken-pillar', rock, m.stone, [x, 2.4 + pillar, z], [1.6, 3 + pillar * 1.3, 1.6]);
          beam('gladiator-foreground-cyan-fault', [x - 0.2, 0.4, z + 1.45], [x + 0.4, 5 + pillar, z + 1.45], m.light, 0.055);
        }
      }
      for (const x of [-8, 0, 8]) {
        curvedTube('gladiator-surviving-stone-arch', m.stone,
          t => [x + Math.cos(t * Math.PI) * 3.2, 3.2 + Math.sin(t * Math.PI) * 3.2, -36],
          () => [0.4, 0.4], 20);
        for (const side of [-1, 1]) block('gladiator-arch-stone-support', m.stone, x + side * 3.2, 1.6, -36, 0.8, 3.2, 1);
      }
      for (let row = 0; row < 4; row += 1) for (let tile = -2; tile <= 2; tile += 1) {
        const x = tile * 3.1 + (row % 2) * 0.2, z = -23 - row * 3.1;
        block('gladiator-cracked-stone-paving', m.ground, x, 0.02, z, 2.9, 0.06, 2.9);
        beam('gladiator-cyan-paving-fissure', [x - 1.3, 0.06, z - 1.3], [x + 0.6, 0.06, z + 1.3], m.light, 0.04);
      }
      add('gladiator-icy-central-dais', cylinder, m.paper, [0, 0.6, -30], [3.3, 1.2, 3.3]);
      for (let shard = 0; shard < 9; shard += 1) {
        const a = shard * Math.PI * 2 / 9;
        add('gladiator-icy-dais-shard', cone, m.paper, [Math.cos(a) * 2.9, 1.4, -30 + Math.sin(a) * 2.9], [0.35, 2, 0.4]);
      }
      add('gladiator-gold-dais-rim', ring, m.gold, [0, 1.15, -30], [2.8, 2.8, 2.8], [Math.PI / 2, 0, 0]);
      for (const side of [-1, 1]) beam('gladiator-white-opening-shaft', [side * 0.6, 1.2, -30], [side * 0.6, 15, -30], m.paper, 0.025);
      break;
    }
    case '12845564': {
      const pink = material('#ffafb1', { emissive: '#ff626e', emissiveIntensity: 0.35 });
      for (const side of [-1, 1]) {
        const points = [[side * 12, 0.6, 7], [side * 19, 0.8, 10], [side * 11.5, 6.6, -31], [side * 10.5, 6.6, -31]];
        const plate = geometry(`architectural-angelechy-plate-${side}`, () => {
          const shape = new THREE.BoxGeometry(1, 1, 1);
          const positions = shape.attributes.position;
          for (let i = 0; i < positions.count; i += 1) {
            const t = 0.5 - positions.getZ(i), outer = positions.getX(i) > 0;
            const front = points[outer ? 1 : 0], rear = points[outer ? 2 : 3];
            const vertical = positions.getY(i) * 0.07;
            positions.setXYZ(i, front[0] + (rear[0] - front[0]) * t,
              front[1] + (rear[1] - front[1]) * t + vertical, front[2] + (rear[2] - front[2]) * t);
          }
          positions.needsUpdate = true; shape.computeVertexNormals(); return shape;
        });
        add('angelechy-long-silver-converging-plate', plate, m.paper, [0, 0, 0]).material.side = THREE.DoubleSide;
        beam('angelechy-pink-plate-edge', points[0], points[3], pink, 0.07);
        beam('angelechy-orange-plate-edge', points[1], points[2], m.light, 0.07);
        for (let incision = 0; incision < 5; incision += 1) {
          const t = incision / 5;
          beam('angelechy-plate-cross-incision', [side * (12.1 - t * 1.35), 1.2 + t * 5.1, 4 - t * 31],
            [side * (17.8 - t * 6.1), 1.2 + t * 5.1, 4 - t * 31], m.wood, 0.035);
        }
        for (let ray = 0; ray < 4; ray += 1) beam('angelechy-sky-radial-ray',
          [side * 5, 12, -32], [side * (15 + ray * 4), 15 + ray * 3, -38], m.paper, 0.03);
      }
      break;
    }
    case '18114794': {
      const red = material('#db503b', { roughness: 0.4 });
      const purple = material('#b064ed', { emissive: '#6c36cb', emissiveIntensity: 0.4 });
      for (const side of [-1, 1]) {
        block('summon-breaker-gray-switch-panel', m.stone, side * 14.5, 5, -24, 4, 10, 0.8);
        block('summon-breaker-dark-lever-aperture', m.dark, side * 14.5, 6.2, -23.55, 2.2, 3.6, 0.1);
        add('summon-breaker-red-switch-axle', cylinder, red, [side * 14.5, 6.2, -23.43], [1.15, 0.2, 1.15], [Math.PI / 2, 0, 0]);
        block('summon-breaker-red-off-lever', red, side * 14.5 + 0.7, 6.2, -22.9, 2, 0.8, 1.2);
        block('summon-breaker-red-off-label', red, side * 14.5, 2.9, -23.52, 2.5, 1.2, 0.1);
        // O/F/F is real vector lettering from the source, not a sampled card
        // texture. It remains sharp and readable in the physical scene.
        add('summon-breaker-off-letter-o', ring, m.paper, [side * 14.5 - 0.65, 2.9, -23.44], [0.3, 0.4, 0.2]);
        for (const offset of [0, 0.64]) {
          block('summon-breaker-off-letter-f', m.paper, side * 14.5 + offset - 0.15, 2.9, -23.44, 0.075, 0.78, 0.025);
          for (const y of [2.98, 3.25]) block('summon-breaker-off-letter-f', m.paper,
            side * 14.5 + offset + 0.03, y, -23.44, 0.38, 0.075, 0.025);
        }
        for (const y of [1, 9]) for (const offset of [-1.3, 1.3]) add('summon-breaker-panel-screw', cylinder, m.dark,
          [side * 14.5 + offset, y, -23.53], [0.12, 0.045, 0.12], [Math.PI / 2, 0, 0]);
        for (let tooth = -2; tooth <= 2; tooth += 1) block('summon-breaker-upper-panel-tooth', m.stone,
          side * 14.5 + tooth * 0.65, 10.35, -24, 0.4, 0.7, 0.8);
      }
      for (let step = 0; step < 4; step += 1) {
        const r = 6 - step * 0.75;
        block('summon-breaker-magenta-platform', m.ground, 0, 0.2 + step * 0.28, -31, r * 2, 0.35, r * 2);
        for (const side of [-1, 1]) {
          beam('summon-breaker-magenta-step-edge', [side * r, 0.4 + step * 0.28, -31 - r], [side * r, 0.4 + step * 0.28, -31 + r], m.light, 0.055);
          beam('summon-breaker-magenta-step-edge', [-r, 0.4 + step * 0.28, -31 + side * r], [r, 0.4 + step * 0.28, -31 + side * r], m.light, 0.055);
        }
      }
      for (let crystal = 0; crystal < 5; crystal += 1) {
        const a = crystal * Math.PI * 2 / 5, x = Math.cos(a) * 5, z = -31 + Math.sin(a) * 5;
        add('summon-breaker-floating-purple-diamond', crown, purple, [x, 3.2, z], [0.55, 0.8, 0.55]);
        beam('summon-breaker-magenta-cage-strand', [x, 3.2, z], [0, 7.4, -31], m.light, 0.04);
      }
      break;
    }
    case '95376428': {
      const cyan = material('#26c4a7', { emissive: '#16a892', emissiveIntensity: 0.7, roughness: 0.3 });
      block('extra-net-pink-rear-wall', m.stone, 0, 8, -37, 25, 16, 0.6);
      for (const side of [-1, 1]) {
        block('extra-net-pink-room-pillar', m.stone, side * 15.8, 7, -25, 3.6, 14, 5);
        for (const y of [1.2, 12.8]) block('extra-net-gold-room-trim', m.gold, side * 15.8, y, -22.43, 3.5, 0.18, 0.08);
      }
      block('extra-net-pale-rectangular-exit', m.paper, 4.5, 6.5, -36.65, 7.5, 11, 0.05);
      for (const x of [0.45, 8.55]) block('extra-net-gold-exit-frame', m.gold, x, 6.5, -36.58, 0.22, 11.4, 0.15);
      for (const y of [0.8, 12.2]) block('extra-net-gold-exit-frame', m.gold, 4.5, y, -36.58, 8.3, 0.22, 0.15);
      // Continuous strands and crossing threads share the same bowed surface;
      // all intersections meet rather than leaving a disconnected line grid.
      for (const offset of [-3.2, -1.1, 1.1, 3.2]) curvedTube('extra-net-curved-cyan-strand', cyan,
        t => [-8 + t * 16, 5.7 + offset + Math.sin(t * Math.PI) * 2.4, -31 - Math.sin(t * Math.PI) * 2],
        () => [0.07, 0.07], 24);
      for (let strand = 0; strand < 9; strand += 1) {
        const x = -7.7 + strand * 1.85;
        const bow = Math.sin((x + 8) / 16 * Math.PI), z = -31 - bow * 2;
        beam('extra-net-crossing-cyan-strand', [x, 2.5 + bow * 2.4, z], [x, 8.9 + bow * 2.4, z], cyan, 0.07);
      }
      const red = material('#db4c47');
      block('extra-net-red-wall-indicator', red, 7.7, 14, -36.64, 1.2, 0.45, 0.03);
      break;
    }
  }
  return true;
}
