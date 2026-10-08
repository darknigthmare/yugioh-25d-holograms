/** Closed sculpture read from six immutable, locally preserved card JPEGs.
 * Existing scenery and its public corridor placement remain in place. These
 * details restore distinctive illustrated motifs; unseen depth is adapted. */
export const FIELD_CONTINUATION_DETAIL_IDS = Object.freeze([
  '7617062', '15388353', '49370016', '63492244', '51208046', '35371948'
]);
const scope = (features, limits) => Object.freeze({ features: Object.freeze(features), limits });
export const FIELD_CONTINUATION_DETAIL_SCOPE = Object.freeze({
  '7617062': scope(['long dinosaur fossil skull with open jaws and pointed teeth', 'gilded mirror scrolls and finials', 'broken golden vessel and scattered shards'],
    'Fossil anatomy and mirror ornament are adapted closed volumes. The mummy, riders, ghost portrait and unseen museum depth remain painted.'),
  '15388353': scope(['golden arched-window radial mullions', 'ornamental iron fish sign', 'stair gate pickets and golden finials', 'dark slate ridge with small heart ornaments'],
    'Window and gate placements follow the existing corridor adaptation. The exact facade perspective, engraving, vegetation and unseen building depth remain interpreted.'),
  '49370016': scope(['cyan beveled speaker-panel outlines', 'concentric cyan driver membranes', 'radial gold hub rings', 'segmented pink and yellow light tubes'],
    'Speaker topology, borders and tube color bands follow the source. The performer, deity figure, painted reflections and unseen rear remain in the illustration.'),
  '63492244': scope(['rounded two-lobed red owl logos', 'three lower pink logo lobes', 'white oval eye reflections', 'dense flowers with leaves along the stage border'],
    'Logo lobes and flowers use adapted closed sculpture. The full crowd, moving confetti, optical beams and exact floral count remain painted.'),
  '51208046': scope(['large domed pink skull silhouette with three lower teeth', 'two pale oval eyes and a heart-shaped nose', 'golden round skull edge', 'concentric speaker membranes and small ports'],
    'Skull depth, speaker scale and golden border are adapted to the existing stage. The performers, audience, lens glare and unseen faces remain painted.'),
  '35371948': scope(['multicolored jewel-flower bouquets', 'golden stems and column arabesques', 'small gold crest leaves around the existing curls'],
    'Flower jewels and gold filigree are adapted volumes. The four performers, mirrored screen image, cloth, lighting and exact spatial perspective remain painted.')
});

const ovalLoop = (b, group, name, hex, x, y, z, rx, ry, radius = .06, segments = 36) =>
  b.tube(group, name, hex, t => [x + Math.cos(t * Math.PI * 2) * rx, y + Math.sin(t * Math.PI * 2) * ry, z], radius, segments);

function museum(b) {
  const { part, sphere, cone, prism, tube, line } = b, group = 'museum-fossil-mirror-and-relics';
  // The fossil is the long pale skull in the upper-right background, rather
  // than the foreground mummy. Its entire silhouette sits beyond z=-18.
  const at = (x, y, z) => [3 + x, 22 + y, -34 + z];
  part(group, 'fossil-high-cranium', sphere, '#c6d7d6', at(5.2, 1.0, -.8), [3.7, 2.5, 1.7]);
  part(group, 'fossil-long-upper-snout', sphere, '#d6e2db', at(-.4, .35, .25), [5.9, 1.20, 1.4], [0, 0, .09]);
  part(group, 'fossil-dark-eye-socket', sphere, '#3c5b65', at(5.0, 1.18, 1.0), [1.21, .84, .20], [0, 0, -.25]);
  part(group, 'fossil-dark-nasal-socket', sphere, '#43616b', at(-3.9, .58, 1.50), [.88, .34, .12], [0, 0, -.2]);
  // Split the slightly concave jaw into a closed long beam and rear hinge.
  part(group, 'fossil-sloping-lower-jaw', b.box, '#b4c9cc', at(-.4, -1.8, .25), [9.8, .48, 1.05], [0, 0, .13]);
  part(group, 'fossil-lower-jaw-hinge', sphere, '#a9c1c8', at(4.2, -.4, -.18), [1.1, 1.9, 1.15], [0, 0, -.27]);
  for (let i = 0; i < 9; i++) {
    const x = -4.8 + i * .91;
    part(group, 'fossil-nine-upper-pointed-teeth', cone, '#e0e8df', at(x, -.79 + x * .09, 1.1), [.20, .77 - .025 * i, .24], [0, 0, Math.PI]);
    if (i < 7) part(group, 'fossil-seven-lower-pointed-teeth', cone, '#d5e1d9', at(x + .2, -1.36 + x * .13, .92), [.16, .52, .21]);
  }
  for (let i = 0; i < 4; i++) part(group, 'fossil-four-neck-vertebrae', sphere, '#9cb8c1', at(8.5 + i * 1.7, 1.7 + i * 1.6, -1.2), [1.25, .72, 1.02], [0, 0, -.45]);
  for (const side of [-1, 1]) {
    tube(group, 'mirror-two-gold-scrolls', '#c9a36b', t => {
      const a = t * Math.PI * 2.5, r = .10 + t * .60;
      return [10 + side * (2.8 + Math.cos(a) * r), 19.4 + Math.sin(a) * r, -32.6];
    }, .10, 30);
    part(group, 'mirror-two-gold-shoulder-finials', sphere, '#d7b780', [10 + side * 2.4, 19.0, -32.55], [.22, .38, .16]);
  }
  part(group, 'mirror-crown-gold-bead', sphere, '#e3c69a', [10, 19.75, -32.5], [.36, .36, .16]);
  const shard = prism('relic-convex-gold-shard', [[-.8, -.3], [.1, -.6], [.8, .3], [-.25, .54]], .16);
  for (let i = 0; i < 7; i++) part(group, 'relic-seven-scattered-gold-shards', shard, i % 2 ? '#d6a640' : '#f1cd67', [12.7 + i % 3 * 1.8, .36 + i % 2 * .14, -23 - Math.floor(i / 3) * 1.5], [1, .8, 1], [-Math.PI / 2, i * .75, 0]);
  ovalLoop(b, group, 'relic-broken-vessel-gold-rim', '#d8b456', 16, 1.4, -24.6, 1.15, .52, .16);
  line(group, 'relic-vessel-gold-handle', '#d8b456', [17.1, 1.2, -24.6], [17.8, .58, -24.6], .14);
}

function restaurant(b) {
  const { part, line, tube, sphere, box, cone } = b, group = 'restaurant-window-sign-and-ironwork';
  for (const x of [-6, 0, 6]) for (const y of [2, 12]) {
    line(group, 'restaurant-six-window-center-mullions', '#817054', [x, y, -32.72], [x, y + 5.82, -32.72], .095);
    for (const dy of [1.65, 3.15]) line(group, 'restaurant-twelve-window-cross-mullions', '#817054', [x - 1.66, y + dy, -32.72], [x + 1.66, y + dy, -32.72], .09);
    for (const dx of [-1.38, 1.38]) line(group, 'restaurant-twelve-arched-window-fan-rays', '#817054', [x, y + 3.66, -32.71], [x + dx, y + 5.24, -32.71], .085);
  }
  // A thin gold fish on the curved iron sign is kept on the public horizon.
  tube(group, 'restaurant-arched-black-sign-cartouche', '#404650', t => [-3.2 + 6.4 * t, 10.3 + Math.sin(t * Math.PI) * 1.0, -26.75], .26, 36);
  part(group, 'restaurant-sign-gold-fish-body', sphere, '#ddd3b2', [0, 10.96, -26.43], [.83, .23, .06]);
  part(group, 'restaurant-sign-gold-fish-tail', cone, '#ddd3b2', [-1.02, 10.98, -26.43], [.29, .47, .07], [0, 0, Math.PI / 2]);
  part(group, 'restaurant-sign-dark-fish-eye', sphere, '#404650', [.43, 11.02, -26.36], [.055, .055, .025]);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const x = side * (5.6 + i * .46);
      line(group, 'restaurant-fourteen-iron-gate-pickets', '#6e6477', [x, .75, -21.9], [x, 3.3, -21.9], .06);
      part(group, 'restaurant-fourteen-gate-gold-finials', sphere, '#e5cd82', [x, 3.44, -21.9], [.12, .18, .12]);
    }
    line(group, 'restaurant-two-gate-cross-rails', '#6e6477', [side * 5.35, 2.3, -21.9], [side * 8.65, 2.3, -21.9], .09);
    part(group, 'restaurant-two-main-stair-gold-knobs', sphere, '#f0d58a', [side * 5, 4.18, -29], [.28, .28, .28]);
  }
  part(group, 'restaurant-dark-slate-top-ridge', box, '#4e586b', [0, 23.0, -36.4], [20, .28, .42]);
  for (let i = 0; i < 9; i++) {
    const x = -8.8 + i * 2.2;
    // Two lobes and the downward point form closed miniature heart ornaments.
    for (const side of [-1, 1]) part(group, 'restaurant-eighteen-ridge-heart-lobes', sphere, '#cbb0ae', [x + side * .09, 23.32, -36.3], [.11, .13, .10]);
    part(group, 'restaurant-nine-ridge-heart-points', cone, '#cbb0ae', [x, 23.18, -36.3], [.15, .23, .10], [0, 0, Math.PI]);
  }
}

function punk(b) {
  const { part, sphere, line } = b, group = 'punk-speaker-rims-and-neon-bands';
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = side * (13 + i * 2), y = 3 + i * 5, a = side * .3;
    const point = (dx, dy) => [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a), -30.56];
    for (const [from, to] of [[[-1.9, -1.4], [1.9, -1.4]], [[1.9, -1.4], [1.9, 1.4]], [[1.9, 1.4], [-1.9, 1.4]], [[-1.9, 1.4], [-1.9, -1.4]]])
      line(group, 'punk-twenty-four-cyan-beveled-panel-edges', '#54d9dc', point(...from), point(...to), .105);
    ovalLoop(b, group, 'punk-six-concentric-driver-rims', '#98eee0', x, y, -30.23, .69, .69, .08);
    part(group, 'punk-six-green-driver-dust-caps', sphere, '#42bcb3', [x, y, -30.20], [.26, .26, .14]);
    for (const dx of [-1.5, 1.5]) part(group, 'punk-twelve-panel-corner-rivets', sphere, '#e2f2ba', point(dx, 1.0), [.07, .07, .07]);
  }
  for (const [x, y] of [[-12, 23], [12, 24], [0, 7]]) {
    ovalLoop(b, group, 'punk-three-gold-radial-hub-rings', '#f3da69', x, y, -29.65, 1.31, 1.31, .10);
    part(group, 'punk-three-gold-hub-center-caps', sphere, '#f8e899', [x, y, -29.62], [.36, .36, .09]);
  }
  for (const side of [-1, 1]) for (let i = 0; i < 10; i++) {
    const t = (i + .2) / 10, u = (i + .75) / 10;
    line(group, 'punk-twenty-yellow-neon-tube-bands', '#eddb64', [side * (22 - 4 * t), 1 + t * 23, -28.82], [side * (22 - 4 * u), 1 + u * 23, -28.82], .145);
  }
}

function arena(b) {
  const { part, sphere, cone, line } = b, group = 'arena-owl-logos-and-flower-border';
  for (const side of [-1, 1]) {
    const x = side * 16;
    part(group, 'arena-two-red-rounded-logo-bodies', sphere, '#b55366', [x, 22.1, -34.28], [2.50, 2.10, .58]);
    for (const dx of [-1.04, 1.04]) {
      part(group, 'arena-four-upper-red-logo-lobes', sphere, '#ce5c6b', [x + dx, 23.05, -34.03], [1.36, 1.46, .50]);
      part(group, 'arena-four-white-oval-logo-eyes', sphere, '#fff6eb', [x + dx, 23.15, -33.51], [.53, .73, .11], [0, 0, dx * -.19]);
    }
    for (const dx of [-1.05, 0, 1.05]) part(group, 'arena-six-small-lower-pink-logo-lobes', sphere, '#d47783', [x + dx, 20.45, -33.72], [.35, .55, .18]);
    part(group, 'arena-two-logo-dark-mouths', sphere, '#89354f', [x, 21.21, -33.64], [1.25, .34, .10]);
  }
  for (let i = 0; i < 8; i++) {
    const x = -19 + i * 5.4, y = .93, z = -23.55, colors = ['#efd3ea', '#f3dfa4', '#a8d3a5', '#baacdb'];
    for (let petal = 0; petal < 5; petal++) {
      const a = petal / 5 * Math.PI * 2;
      part(group, 'arena-forty-border-blossom-petals', sphere, colors[i % colors.length], [x + Math.cos(a) * .42, y, z + Math.sin(a) * .42], [.36, .22, .32]);
    }
    part(group, 'arena-eight-warm-flower-centers', sphere, '#dcc67c', [x, y + .17, z], [.19, .16, .19]);
    part(group, 'arena-eight-pointed-border-leaves', cone, '#547b4a', [x + .7, .78, z + .23], [.24, 1.10, .15], [0, 0, -1.1]);
  }
  line(group, 'arena-olive-stage-border-stem', '#6c8a4d', [-20, .69, -23.55], [20, .69, -23.55], .08);
}

function live(b) {
  const { part, sphere, cone, tube } = b, group = 'live-pink-skull-and-speaker-membranes';
  part(group, 'live-domed-pink-skull-head', sphere, '#df7db8', [0, 15.8, -35.42], [8.15, 7.75, .62]);
  for (const side of [-1, 1]) part(group, 'live-two-pale-pink-oval-skull-eyes', sphere, '#ecc3df', [side * 3.43, 17.25, -34.82], [1.94, 2.55, .13], [0, 0, side * .52]);
  for (let i = -1; i <= 1; i++) part(group, 'live-three-lower-pink-skull-teeth', sphere, i ? '#dd80bd' : '#e38bc4', [i * 2.12, 8.7, -35.05], [1.55, 2.05, .39]);
  for (const side of [-1, 1]) part(group, 'live-two-heart-nose-lobes', sphere, '#f0d9e1', [side * .30, 13.4, -34.72], [.38, .46, .11]);
  part(group, 'live-heart-nose-downward-point', cone, '#f0d9e1', [0, 13.12, -34.70], [.43, .58, .11], [0, 0, Math.PI]);
  // The source skull's nearly round golden rim differs from a heart outline.
  tube(group, 'live-continuous-gold-skull-outline', '#e5be61', t => {
    const a = t * Math.PI * 2;
    return [Math.cos(a) * 8.38, 15.8 + Math.sin(a) * 7.89, -34.73];
  }, .17, 56);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ovalLoop(b, group, 'live-six-speaker-driver-surrounds', '#756b7a', side * 15, 2.3 + i * 3.2, -29.74, 1.26, 1.26, .095);
      ovalLoop(b, group, 'live-six-speaker-inner-membrane-rings', '#a29aa8', side * 15, 2.3 + i * 3.2, -29.63, .76, .76, .055);
      part(group, 'live-six-speaker-dark-dust-caps', sphere, '#3d3648', [side * 15, 2.3 + i * 3.2, -29.61], [.37, .37, .15]);
    }
    for (const dx of [-1.24, 1.24]) part(group, 'live-four-small-burgundy-cabinet-ports', sphere, '#965365', [side * 15 + dx, 5.5, -29.70], [.30, .30, .10]);
  }
}

function lightStage(b) {
  const { part, sphere, cone, tube, prism, line } = b, group = 'light-stage-jewel-bouquets-and-gold-filigrane';
  const leaf = prism('light-stage-convex-gold-leaf', [[0, -.60], [.25, -.04], [0, .67], [-.25, -.04]], .12);
  for (const side of [-1, 1]) {
    const x = side * 16, z = -30.70;
    // The source has a distinct bright flower jewel bouquet on each column,
    // with gold stems below, rather than a stack of identical heart icons.
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, r = i % 2 ? 1.10 : .56;
      part(group, 'light-stage-twenty-four-multicolor-bouquet-jewels', sphere, ['#df626f', '#efbd55', '#74c9b7', '#5a9fd3', '#a881d3', '#c981ad'][i % 6], [x + Math.cos(a) * r, 7.8 + Math.sin(a) * r * 1.23, z], [.32, .43, .13], [0, 0, -a]);
    }
    part(group, 'light-stage-two-gold-bouquet-centers', sphere, '#e4c459', [x, 7.8, z + .05], [.31, .40, .17]);
    tube(group, 'light-stage-two-curving-golden-flower-stems', '#c3a747', t => [x + side * .6 * Math.sin(t * Math.PI), 1.5 + t * 5.7, z - .03], .09, 32);
    for (let i = 0; i < 5; i++) {
      const y = 2.2 + i * .83;
      part(group, 'light-stage-ten-gold-column-leaves', leaf, '#d5b649', [x + side * (i % 2 ? -.5 : .7), y, z], [.78, 1, 1], [0, 0, side * (i % 2 ? -.7 : .7)]);
      tube(group, 'light-stage-ten-gold-column-scrolls', '#c0a844', t => {
        const a = t * Math.PI * 2.3, r = .06 + t * .46;
        return [x + Math.cos(a) * r * side, y + Math.sin(a) * r, z + .12];
      }, .045, 25);
    }
    for (let i = 0; i < 4; i++) {
      const xLeaf = side * (1.45 + i * 1.1), y = 15.6 + Math.sin(i / 3 * Math.PI) * .7;
      part(group, 'light-stage-eight-crest-pointed-leaves', leaf, '#c6b34d', [xLeaf, y, -31.76], [1, 1, 1], [0, 0, side * -.55]);
      line(group, 'light-stage-eight-crest-leaf-midveins', '#72934c', [xLeaf, y - .42, -31.65], [xLeaf, y + .40, -31.65], .022);
    }
  }
}

const BUILDERS = Object.freeze({ '7617062': museum, '15388353': restaurant, '49370016': punk,
  '63492244': arena, '51208046': live, '35371948': lightStage });
export function createContinuationStageDetails(cardId, builder) {
  const create = BUILDERS[cardId];
  if (!create) return false;
  create(builder); return true;
}
