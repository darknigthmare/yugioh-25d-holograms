/**
 * Sculptural details read from preserved card illustrations. These are
 * actual closed volumes, not replacement art planes. Their depth, scale and
 * placement are adapted to the public duel corridor; the painted source stays
 * authoritative for small markings and unseen surfaces.
 */
import { FIELD_CONTINUATION_DETAIL_IDS, FIELD_CONTINUATION_DETAIL_SCOPE,
  createContinuationStageDetails } from './FieldContinuationStageDetails.js';
export const FIELD_REFERENCE_DETAIL_IDS = Object.freeze(['67616300', '81380218', '63883999']);

export const FIELD_REFERENCE_DETAIL_SCOPE = Object.freeze({
  '67616300': Object.freeze({
    features: Object.freeze(['frightened orange mechanical face', 'cyan eyes and chrome teeth', 'three sweat drops', 'green cliff buggy', 'rust-colored forehead tank']),
    limits: 'Illustrated foreshortening, tiny pilot markings, reflections and the unseen rear remain interpreted.'
  }),
  '81380218': Object.freeze({
    features: Object.freeze(['flying red-haired cherub', 'leaf crown and tilted gold halo', 'layered cream wing feathers', 'draped pale-yellow tunic and bare limbs', 'five black musical notes']),
    limits: 'The face, curls, fingers, fabric folds and wing anatomy are sculptural approximations; unseen depth is interpreted.'
  }),
  '63883999': Object.freeze({
    features: Object.freeze(['horned central demon face', 'two secondary masonry faces', 'vertebral small masks', 'bat-shaped crown ears', 'spiral masonry seams and tower apertures']),
    limits: 'Stone grain, every minor carving, lightning and the exact architectural perspective remain in the preserved illustration.'
  })
});

function createDetailBuilder(ctx) {
  const { THREE, geometry, material, add, profile } = ctx;
  const prefix = `reference-detail-${profile.cardId}`;
  const paint = material('#ffffff', {
    vertexColors: true, roughness: profile.cardId === '67616300' ? .55 : .83,
    metalness: profile.cardId === '67616300' ? .12 : 0,
    emissive: '#000000', emissiveIntensity: 0
  });
  const sphere = geometry(`${prefix}-sphere`, () => new THREE.SphereGeometry(1, 12, 9));
  const box = geometry(`${prefix}-box`, () => new THREE.BoxGeometry(1, 1, 1));
  const cone = geometry(`${prefix}-cone`, () => new THREE.ConeGeometry(1, 1, 12));
  const cylinder = geometry(`${prefix}-cylinder`, () => new THREE.CylinderGeometry(1, 1, 1, 12));
  const torus = geometry(`${prefix}-torus`, () => new THREE.TorusGeometry(1, .08, 6, 40));
  const groups = new Map();
  let sequence = 0;
  const part = (group, name, shape, hex, position, scale = [1, 1, 1], rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(shape, paint);
    mesh.position.set(...position); mesh.scale.set(...scale); mesh.rotation.set(...rotation); mesh.updateMatrix();
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ mesh, name, hex });
  };
  const custom = (name, vertices, indices) => geometry(`${prefix}-${sequence++}-${name}`, () => {
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
    shape.setIndex(indices); shape.computeVertexNormals(); return shape;
  });
  const tube = (group, name, hex, path, radius, segments = 14) => {
    const vertices = [], indices = [], sides = 6;
    const closed = new THREE.Vector3(...path(0)).distanceTo(new THREE.Vector3(...path(1))) < .000001;
    for (let row = 0; row <= segments; row++) {
      const t = row / segments, point = new THREE.Vector3(...path(t));
      const before = closed ? (t - .0001 + 1) % 1 : Math.max(0, t - .0001);
      const after = closed ? (t + .0001) % 1 : Math.min(1, t + .0001);
      const tangent = new THREE.Vector3(...path(after)).sub(new THREE.Vector3(...path(before))).normalize();
      const seed = Math.abs(tangent.y) > .95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const normal = seed.cross(tangent).normalize(), binormal = tangent.clone().cross(normal).normalize();
      const r = typeof radius === 'function' ? radius(t) : radius;
      for (let i = 0; i < sides; i++) {
        const a = i / sides * Math.PI * 2;
        vertices.push(point.clone().addScaledVector(normal, Math.cos(a) * r).addScaledVector(binormal, Math.sin(a) * r).toArray());
        if (row < segments) {
          const v = row * sides + i, next = row * sides + (i + 1) % sides;
          indices.push(v, next, v + sides, next, next + sides, v + sides);
        }
      }
    }
    if (!closed) {
      vertices.push(path(0), path(1));
      const start = vertices.length - 2, end = start + 1, last = segments * sides;
      for (let i = 0; i < sides; i++) indices.push(start, (i + 1) % sides, i, end, last + i, last + (i + 1) % sides);
    }
    part(group, name, custom(name, vertices, indices), hex, [0, 0, 0]);
  };
  const line = (group, name, hex, from, to, radius) => tube(group, name, hex,
    t => from.map((v, i) => v + (to[i] - v) * t), radius, 2);
  const prism = (name, outline, depth) => {
    const area = outline.reduce((sum, p, i) => { const q = outline[(i + 1) % outline.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0);
    if (area < 0) outline = [...outline].reverse();
    const vertices = outline.map(([x, y]) => [x, y, depth / 2]).concat(outline.map(([x, y]) => [x, y, -depth / 2]));
    const indices = [], n = outline.length;
    // All outlines below are convex, or explicitly split into convex feathers.
    for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1, n, n + i + 1, n + i);
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; indices.push(i, n + i, j, j, n + i, n + j); }
    return custom(name, vertices, indices);
  };
  const finish = () => {
    const details = [];
    for (const [group, sources] of groups) {
      const positions = [], normals = [], colors = [], indices = [], descriptions = [];
      for (const { mesh, name, hex } of sources) {
        const shape = mesh.geometry, p = shape.attributes.position, n = shape.attributes.normal;
        const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrix), color = new THREE.Color(hex), base = positions.length / 3;
        for (let i = 0; i < p.count; i++) {
          positions.push(...new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrix).toArray());
          normals.push(...new THREE.Vector3().fromBufferAttribute(n, i).applyMatrix3(normalMatrix).normalize().toArray());
          colors.push(color.r, color.g, color.b);
        }
        const sourceIndices = shape.index?.array || Array.from({ length: p.count }, (_, i) => i), indexOffset = indices.length;
        const mirrored = mesh.matrix.determinant() < 0;
        for (let i = 0; i < sourceIndices.length; i += 3) {
          indices.push(base + sourceIndices[i], base + sourceIndices[i + (mirrored ? 2 : 1)], base + sourceIndices[i + (mirrored ? 1 : 2)]);
        }
        shape.computeBoundingBox(); const bounds = shape.boundingBox.clone().applyMatrix4(mesh.matrix);
        descriptions.push(Object.freeze({ name, color: hex, vertexOffset: base, vertexCount: p.count,
          indexOffset, indexCount: sourceIndices.length,
          bounds: Object.freeze({ min: Object.freeze(bounds.min.toArray()), max: Object.freeze(bounds.max.toArray()) }) }));
      }
      const merged = geometry(`${prefix}-${group}-merged`, () => {
        const shape = new THREE.BufferGeometry();
        shape.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        shape.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        shape.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); shape.setIndex(indices);
        shape.userData.detailParts = Object.freeze(descriptions);
        shape.userData.referencePrimitiveCount = descriptions.length; return shape;
      });
      add(group, merged, paint, [0, 0, 0]);
      details.push(Object.freeze({ name: group, primitiveCount: descriptions.length }));
    }
    const primitiveCount = details.reduce((sum, detail) => sum + detail.primitiveCount, 0);
    ctx.root.userData.referencePrimitiveCount = (ctx.root.userData.referencePrimitiveCount ??
      ctx.root.children.filter(mesh => mesh.isMesh).length - groups.size) + primitiveCount;
    ctx.root.userData.referenceDetail = Object.freeze({ cardId: profile.cardId,
      sourceUrl: `https://images.ygoprodeck.com/images/cards_cropped/${profile.cardId}.jpg`,
      fidelity: 'source-inspected-adapted-sculpture', primitiveCount,
      groups: Object.freeze(details), ...(FIELD_REFERENCE_DETAIL_SCOPE[profile.cardId] ?? FIELD_CONTINUATION_DETAIL_SCOPE[profile.cardId]) });
    return true;
  };
  return { part, custom, tube, line, prism, finish, sphere, box, cone, cylinder, torus };
}

function chickenDetails(b) {
  const { part, tube, line, prism, sphere, box, cone, cylinder, torus } = b;
  const face = 'chicken-frightened-mechanical-face', at = (x, y, z) => [17 + x, 12 + y, -18 + z];
  part(face, 'orange-rounded-helmet', sphere, '#b44822', at(0, 0, 0), [6.1, 8.7, 3.9]);
  part(face, 'forehead-orange-armor', box, '#c55326', at(.4, 5.8, .2), [9, 4.2, 5.2], [0, 0, -.12]);
  part(face, 'wide-dark-chrome-grin', sphere, '#172735', at(0, -4.8, 3.45), [5.3, 2.15, .65]);
  for (let i = 0; i < 8; i++) {
    const x = (i - 3.5) * 1.08;
    part(face, 'eight-chrome-grin-teeth', box, i % 2 ? '#d4e4ed' : '#9eb5c7', at(x, -4.8 + .025 * x * x, 3.96), [.86, 2.65 - .10 * Math.abs(x), .38], [0, x * .035, x * .017]);
  }
  for (const side of [-1, 1]) {
    part(face, 'deep-blue-frightened-eye', sphere, '#07243b', at(side * 3.1, 1.1, 3.27), [2, 1.58, .55], [0, side * .18, side * -.25]);
    part(face, 'cyan-eye-lower-glint', sphere, '#64eaf4', at(side * 3.02, .53, 3.73), [1.08, .53, .20]);
    part(face, 'silver-eye-lid-rim', torus, '#b7e4e8', at(side * 3.1, 1.1, 3.48), [1.94, 1.54, .65], [0, side * .18, side * -.25]);
    tube(face, 'swept-orange-brow-ridge', '#dc6b31', t => at(side * (1.2 + 3.6 * t), 2.3 + Math.sin(t * Math.PI) * .45, 3.55 - t * .25), .48, 18);
    tube(face, 'lower-orange-jaw-rim', '#b6401c', t => at(side * 4.8 * t, -7 + 1.7 * t * t, 3.1), .34, 18);
  }
  const nose = prism('angular-forward-orange-nose', [[-2.2, .2], [0, 1.9], [2.5, -.15], [.55, -1.75]], 1.7);
  part(face, 'pointed-forward-nose', nose, '#d86730', at(0, -1.2, 4.25), [1.4, 1, 1], [.12, 0, -.12]);
  for (const side of [-1, 1]) part(face, 'dark-nose-fold', sphere, '#672412', at(side * 1.15, -2.1, 5.08), [.72, .18, .12], [0, 0, side * -.2]);
  const drop = b.custom('pointed-sweat-drop', (() => {
    const vertices = [[0, 1.1, 0], [0, -.65, 0]];
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; vertices.push([Math.cos(a) * .42, -.20, Math.sin(a) * .32]); } return vertices;
  })(), (() => { const faces = []; for (let i = 0; i < 12; i++) { const j = 2 + (i + 1) % 12; faces.push(0, j, 2 + i, 1, 2 + i, j); } return faces; })());
  for (const [x, y, z, tilt] of [[-2.5, 6.8, 2.9, -.25], [-.3, 1.9, 4.1, -.1], [4.9, -1.3, 2.95, .18]]) {
    part(face, 'three-pale-blue-sweat-drops', drop, '#b8e7ee', at(x, y, z), [.85, 1.15, .85], [0, 0, tilt]);
    part(face, 'sweat-drop-white-reflection', sphere, '#e4f9f4', at(x - .12, y - .05, z + .30), [.09, .33, .05], [0, 0, tilt]);
  }
  const car = 'chicken-green-cliff-buggy', carAt = (x, y, z) => [-18 + x, 3.0 + y, -10 + z];
  part(car, 'olive-chassis', box, '#365333', carAt(0, .3, 0), [2.6, .65, 3.6]);
  part(car, 'sloping-olive-hood', box, '#657c4e', carAt(0, .75, 1), [2.3, .5, 1.4], [-.13, 0, 0]);
  part(car, 'rear-open-cab', box, '#4b6745', carAt(0, 1.1, -.65), [2.1, 1.25, 1.55]);
  part(car, 'dark-split-windscreen', box, '#122a2b', carAt(0, 1.32, .20), [1.75, .57, .08], [-.16, 0, 0]);
  line(car, 'windscreen-center-post', '#a5b7a4', carAt(0, 1.03, .25), carAt(0, 1.62, .16), .06);
  part(car, 'silver-front-bumper', box, '#b4c4b7', carAt(0, .24, 1.98), [2.65, .19, .19]);
  for (const side of [-1, 1]) {
    for (const z of [-1.05, 1.02]) {
      part(car, 'four-dark-rubber-wheels', cylinder, '#172524', carAt(side * 1.32, 0, z), [.67, .47, .67], [0, 0, Math.PI / 2]);
      part(car, 'four-silver-wheel-hubs', cylinder, '#a5b6a8', carAt(side * 1.60, 0, z), [.31, .055, .31], [0, 0, Math.PI / 2]);
    }
    part(car, 'two-round-headlights', sphere, '#d6e4cb', carAt(side * .84, .64, 1.78), [.23, .20, .10]);
    line(car, 'cab-exposed-silver-roll-bar', '#a5b7a4', carAt(side * 1.03, .75, -.65), carAt(side * 1.03, 1.88, -1.15), .065);
  }
  for (let i = 0; i < 5; i++) part(car, 'five-engine-hood-ribs', box, '#a0aea0', carAt((i - 2) * .33, 1.035, 1.09), [.16, .075, .71]);
  const tank = 'chicken-rust-forehead-tank', tankAt = (x, y, z) => [18 + x, 20.8 + y, -18 + z];
  part(tank, 'rust-angular-tank-hull', box, '#76513b', tankAt(0, .7, 0), [3.8, 1.35, 3.8], [0, -.16, 0]);
  for (const side of [-1, 1]) {
    part(tank, 'two-dark-tank-track-banks', box, '#4c3b2c', tankAt(side * 1.85, .25, 0), [.73, 1, 4.2]);
    for (let i = 0; i < 5; i++) part(tank, 'ten-rust-track-wheels', cylinder, '#96785c', tankAt(side * 2.24, .25, -1.55 + i * .77), [.34, .1, .34], [0, 0, Math.PI / 2]);
    part(tank, 'two-forward-stub-sponsons', cylinder, '#79573e', tankAt(side * 1.6, .7, 2.5), [.51, 1.45, .51]);
    part(tank, 'sponson-circular-cap', cylinder, '#a98761', tankAt(side * 1.6, 1.48, 2.5), [.61, .16, .61]);
  }
  part(tank, 'raised-rust-turret', cylinder, '#896349', tankAt(0, 1.73, -.4), [1.18, 1.2, 1.05]);
  line(tank, 'projecting-tank-cannon', '#70513a', tankAt(0, 1.77, .35), tankAt(-.5, 1.75, 2.9), .22);
  part(tank, 'dark-cannon-bore', cylinder, '#352c24', tankAt(-.5, 1.75, 2.97), [.14, .10, .14], [Math.PI / 2, 0, 0]);
  part(tank, 'tiny-orange-front-pilot-head', sphere, '#e77726', tankAt(0, .73, 2.17), [.61, .66, .49]);
  for (const side of [-1, 1]) part(tank, 'pilot-two-dark-eyes', sphere, '#472718', tankAt(side * .23, .85, 2.59), [.09, .12, .05]);
  part(tank, 'pilot-yellow-helmet', sphere, '#e6b43d', tankAt(0, 1.27, 2.06), [.75, .29, .52]);
  for (let i = 0; i < 3; i++) part(tank, 'pilot-three-pale-grin-teeth', box, '#e9d6b3', tankAt((i - 1) * .16, .49, 2.59), [.12, .12, .06]);
}

function chorusDetails(b) {
  const { part, tube, line, prism, sphere, cylinder, torus } = b;
  const child = 'chorus-winged-laurel-cherub', at = (x, y, z) => [-4.5 + x, 8.5 + y, -31 + z];
  const skin = '#f4b693', hair = '#ad6035', cream = '#eee0a0';
  part(child, 'large-round-cherub-head', sphere, skin, at(.3, 8, .2), [2.6, 2.8, 2]);
  part(child, 'right-rounded-cheek', sphere, '#f7be9d', at(1.65, 7.5, 1.12), [1.27, 1.55, 1.1]);
  part(child, 'red-hair-rounded-cap', sphere, hair, at(-.3, 9.1, -.55), [2.57, 1.85, 1.85]);
  part(child, 'small-left-ear', sphere, skin, at(-1.77, 7.2, 1.2), [.47, .61, .22]);
  part(child, 'ear-inner-fold', sphere, '#c77c62', at(-1.83, 7.22, 1.40), [.23, .33, .06]);
  for (const [x, y, z, tilt] of [[.05, 8.12, 2.09, -.37], [1.9, 8.45, 1.69, .08]]) {
    part(child, 'two-black-singing-eyes', sphere, '#1a1716', at(x, y, z), [.28, .46, .11], [0, 0, tilt]);
    part(child, 'eye-small-white-highlight', sphere, '#fff6dc', at(x - .075, y + .16, z + .095), [.065, .09, .045]);
    tube(child, 'two-swept-eyebrows', '#533d29', t => at(x - .26 + t * .52, y + .69 + .16 * Math.sin(t * Math.PI), z - .08), .045, 8);
  }
  part(child, 'tiny-raised-nose', sphere, '#f7c5a4', at(1.33, 7.69, 2.13), [.24, .25, .19]);
  const mouth = prism('cherub-open-singing-mouth', [[-.26, .23], [.24, .14], [.15, -.31]], .11);
  part(child, 'open-triangular-singing-mouth', mouth, '#633726', at(1.18, 7.05, 2.06), [1, 1, 1], [0, 0, .20]);
  part(child, 'mouth-small-pink-tongue', sphere, '#dc8a73', at(1.15, 6.89, 2.15), [.13, .09, .035]);
  for (let i = 0; i < 13; i++) {
    const a = i / 12 * Math.PI * 1.25;
    const x = -.45 + Math.cos(a) * 2.10, y = 9.2 + Math.sin(a) * 1.30;
    tube(child, 'thirteen-red-hair-curled-locks', i % 2 ? '#c47d46' : hair, t => at(x + .29 * Math.cos(t * Math.PI * 3.5), y + .36 * Math.sin(t * Math.PI * 3.5), .55 + t * .16), .11, 20);
  }
  for (let i = 0; i < 6; i++) tube(child, 'six-swept-forehead-bangs', '#b76838', t => at(-.45 + i * .42 + .24 * Math.sin(t * Math.PI), 10.1 - t * 1.36, 1.35 + .65 * Math.sin(t * Math.PI)), t => .17 - t * .09, 16);
  const leaf = prism('pointed-laurel-leaf', [[0, -.52], [.22, -.1], [.25, .19], [0, .62], [-.22, .16], [-.2, -.14]], .10);
  tube(child, 'leaf-crown-curving-stem', '#477b2c', t => at(-2 + 3.4 * t, 8.1 + 2.9 * t - .25 * Math.sin(t * Math.PI), 2.15), .07, 20);
  for (let i = 0; i < 12; i++) {
    const t = i / 11, x = -2 + 3.4 * t, y = 8.1 + 2.9 * t - .25 * Math.sin(t * Math.PI), side = i % 2 ? 1 : -1;
    part(child, 'twelve-pointed-green-laurel-leaves', leaf, i % 3 ? '#6ea847' : '#91b957', at(x + side * .23, y, 2.26), [.94, 1.1, 1], [0, 0, side * -.70]);
    line(child, 'laurel-dark-leaf-midvein', '#42702a', at(x + side * .07, y - .34, 2.33), at(x + side * .40, y + .37, 2.33), .025);
  }
  part(child, 'tilted-gold-elliptical-halo', torus, '#ddce4e', at(-1.05, 12.1, -.1), [2.32, 1.15, 1], [.45, .12, .65]);
  part(child, 'bare-cherub-upper-body', sphere, skin, at(-.30, 4.48, .15), [1.38, 2.23, .98], [0, 0, -.18]);
  const clothVertices = [], clothIndices = [], sides = 28, rows = 8;
  for (let j = 0; j <= rows; j++) for (let i = 0; i < sides; i++) {
    const t = j / rows, a = i / sides * Math.PI * 2, r = .93 + t * .98 + Math.sin(a * 5 + t) * .16 * t;
    clothVertices.push([-.4 - t * .5 + Math.cos(a) * r, 5.9 - 4.5 * t + .30 * Math.sin(a * 3) * t, .1 + Math.sin(a) * r * .7]);
    if (j < rows) { const v = j * sides + i, n = j * sides + (i + 1) % sides; clothIndices.push(v, n, v + sides, n, n + sides, v + sides); }
  }
  clothVertices.push([-.4, 5.9, .1], [-.9, 1.4, .1]);
  for (let i = 0; i < sides; i++) { const n = (i + 1) % sides, bottom = rows * sides; clothIndices.push(clothVertices.length - 2, n, i, clothVertices.length - 1, bottom + i, bottom + n); }
  part(child, 'closed-flowing-five-fold-yellow-tunic', b.custom('five-fold-cherub-tunic', clothVertices, clothIndices), cream, at(0, 0, 0));
  tube(child, 'tunic-dark-brown-cord-belt', '#816840', t => at(-.65 + Math.cos(t * Math.PI * 2) * 1.54, 2.67 + .12 * Math.sin(t * Math.PI * 2), .1 + Math.sin(t * Math.PI * 2) * 1.06), .055, 30);
  for (const [name, from, to, r] of [
    ['reaching-upper-arm', [.6, 5.6, 1.12], [3.1, 4.9, 1.35], .45],
    ['reaching-forearm', [3.1, 4.9, 1.35], [4.85, 5.3, 1.57], .35],
    ['lower-bare-arm', [.7, 3.5, 1.1], [2.75, 3.0, 1.6], .31],
    ['bent-near-thigh', [-.85, 1.62, .61], [-2.45, .1, 1.05], .53],
    ['extended-near-shin', [-2.45, .1, 1.05], [-4.8, -.85, 1.17], .38],
    ['bent-far-leg', [-.7, 1.55, -.45], [-3.38, -.27, -.25], .43]
  ]) tube(child, name, skin, t => at(...from.map((v, i) => v + (to[i] - v) * t)), t => r * (1 - t * .15), 10);
  part(child, 'near-bare-rounded-foot', sphere, skin, at(-5.06, -.85, 1.21), [.72, .31, .38], [0, 0, -.36]);
  part(child, 'far-bare-rounded-foot', sphere, skin, at(-3.78, -.16, -.26), [.66, .29, .32], [0, 0, .36]);
  part(child, 'open-reaching-hand', sphere, skin, at(5.0, 5.36, 1.6), [.59, .34, .23], [0, 0, .30]);
  for (let i = 0; i < 4; i++) line(child, 'four-reaching-hand-fingers', skin, at(5.10, 5.14 + i * .17, 1.63), at(5.62 - .09 * Math.abs(i - 1), 5.25 + i * .20, 1.68), .065);
  part(child, 'lower-open-hand', sphere, skin, at(3.0, 3.04, 1.64), [.48, .24, .19]);
  part(child, 'gold-reaching-arm-band', cylinder, '#c9b43e', at(2.15, 5.14, 1.26), [.48, .49, .48], [0, 0, Math.PI / 2 - .23]);
  const feather = prism('closed-pointed-wing-feather', [[-.2, -.45], [.13, -.32], [.22, .45], [0, .82], [-.19, .35]], .12);
  for (const wing of [0, 1]) {
    part(child, 'two-cream-wing-shoulders', sphere, '#f2edc9', at(-1.42, 5.83 + wing * .6, -.70 + wing * .48), [.89, .55, .45], [0, 0, -.34]);
    for (let i = 0; i < 7; i++) {
      const x = -1.6 - i * .32, y = 5.77 + wing * .73 + i * .10, z = -.66 + wing * .48;
      part(child, 'fourteen-layered-cream-wing-feathers', feather, i % 2 ? '#fff4d4' : '#d9cca5', at(x, y, z), [.85, 1.17 + i * .10, 1], [0, .12 * wing, .97 + i * .055]);
    }
  }
  const notes = 'chorus-five-black-musical-notes';
  for (const [i, x, y, tilt] of [[0, -12, 21, -.25], [1, 5, 27, .40], [2, 11, 17, -.18], [3, 9, 9, .18], [4, -12, 7, -.48]]) {
    const anchor = [x, y, -29.5], point = (a, c) => [anchor[0] + a * Math.cos(tilt) - c * Math.sin(tilt), anchor[1] + a * Math.sin(tilt) + c * Math.cos(tilt), anchor[2]];
    part(notes, 'five-black-oval-note-heads', sphere, '#222329', anchor, [.44, .25, .15], [0, 0, tilt + .26]);
    line(notes, 'five-black-note-stems', '#222329', point(.30, 0), point(.30, 1.75), .065);
    if (i % 2 === 0) tube(notes, 'three-curved-eighth-note-flags', '#222329', t => point(.30 + .48 * Math.sin(t * Math.PI), 1.75 - t * .72), .09, 12);
    else { line(notes, 'two-double-note-crossbars', '#222329', point(.30, 1.75), point(1.12, 1.65), .075); line(notes, 'two-second-note-stems', '#222329', point(1.12, 1.65), point(1.12, -.1), .065); part(notes, 'two-second-note-heads', sphere, '#222329', point(.82, -.1), [.43, .24, .15], [0, 0, tilt + .26]); }
  }
}

function palabyrinthDetails(b) {
  const { part, tube, line, prism, sphere, cone, cylinder } = b;
  const fortress = 'palabyrinth-carved-demon-masonry';
  const skull = (name, x, y, z, scale = 1) => {
    const at = (a, c, d) => [x + a * scale, y + c * scale, z + d * scale];
    part(fortress, name + '-carved-cranium', sphere, '#93949d', at(0, .2, 0), [1.3 * scale, 1.45 * scale, .75 * scale]);
    for (const side of [-1, 1]) {
      part(fortress, name + '-recessed-eye', sphere, '#272833', at(side * .63, .36, .65), [.49 * scale, .34 * scale, .13 * scale], [0, 0, side * .18]);
      part(fortress, name + '-overhanging-brow', sphere, '#a5a5ac', at(side * .60, .79, .58), [.73 * scale, .22 * scale, .25 * scale], [0, 0, side * -.20]);
      part(fortress, name + '-angular-cheek', cone, '#80838e', at(side * .82, -.47, .51), [.40 * scale, .9 * scale, .24 * scale], [0, 0, side * -.23]);
    }
    part(fortress, name + '-dark-open-mouth', sphere, '#292933', at(0, -.64, .62), [.70 * scale, .43 * scale, .18 * scale]);
    const nose = prism('demon-triangle-nose', [[-.25, .30], [.25, .30], [0, -.34]], .30);
    part(fortress, name + '-triangular-nose', nose, '#4c4e5a', at(0, -.12, .78), [scale, scale, scale]);
    for (let i = 0; i < 4; i++) part(fortress, name + '-four-stone-fangs', cone, '#b0b0b5', at((i - 1.5) * .29, -.61, .79), [.10 * scale, .48 * scale, .12 * scale], [0, 0, Math.PI]);
  };
  skull('central-crown-face', 0, 28.2, -32.65, 2.10);
  skull('right-projecting-goat-face', 7, 17.7, -31.2, 1.15);
  skull('left-low-masonry-face', -8, 5.3, -32.4, 1.05);
  for (let i = 0; i < 7; i++) tube(fortress, 'seven-central-crown-beard-ribs', '#80828c', t => [(i - 3) * .42, 27.0 - t * 3.15, -31.87 + .24 * Math.sin(t * Math.PI)], t => .12 - t * .05, 14);
  // Split the concave bat-ear into two convex closed pieces rather than a
  // triangle fan crossing its notch.
  const earUpper = prism('bat-ear-upper-point', [[0, -.35], [.3, .52], [1.32, 1.10], [1.00, .02]], .33);
  const earLower = prism('bat-ear-lower-point', [[0, -.90], [1.42, -.35], [.31, .53]], .33);
  for (const side of [-1, 1]) {
    part(fortress, 'two-bat-shaped-upper-crown-ears', earUpper, '#90939e', [side * 2.1, 28.7, -33.0], [side * 1.5, 1.65, 1], [0, 0, side * .08]);
    part(fortress, 'two-bat-shaped-lower-crown-ears', earLower, '#727582', [side * 2.1, 28.7, -33.0], [side * 1.5, 1.65, 1], [0, 0, side * .08]);
    tube(fortress, 'two-curving-right-goat-horns', '#a1a3ac', t => [7 + side * (.65 + 1.55 * t), 18.4 + 1.1 * Math.sin(t * Math.PI) - .35 * t, -31.5 - .22 * t], t => .28 * (1 - t) + .025, 24);
  }
  part(fortress, 'small-conical-crown-spire', cone, '#8d909c', [0, 34.2, -35], [1.55, 3.4, 1.55]);
  part(fortress, 'crown-spire-open-black-aperture', cylinder, '#272833', [0, 32.75, -35], [.96, .23, .96]);
  for (let i = 0; i < 10; i++) {
    const y = 2.6 + i * 2.35;
    for (const side of [-1, 1]) part(fortress, 'twenty-vertebral-mask-eye-hollows', sphere, '#222630', [side * .60, y + .1, -31.81], [.24, .19, .10], [0, 0, side * .2]);
    part(fortress, 'ten-small-vertebral-mask-noses', cone, '#a0a2ad', [0, y + .05, -31.67], [.21, .47, .20], [0, 0, Math.PI]);
  }
  for (let i = 0; i < 16; i++) {
    const t = .04 + i * .058, a = t * Math.PI * 5;
    const x = -8 + Math.cos(a) * 2.1, y = 1 + t * 24, z = -35 + Math.sin(a) * 2.1;
    line(fortress, 'sixteen-spiral-stone-masonry-joints', '#525767', [x - .14 * Math.sin(a), y - .24, z + .14 * Math.cos(a)], [x + .14 * Math.sin(a), y + .24, z - .14 * Math.cos(a)], .055);
  }
  for (const [row, y, r] of [[0, 4.1, 2.62], [1, 8.0, 2.62], [2, 12.0, 2.62]]) for (let i = 0; i < 5; i++) {
    const a = -.85 + i * .425;
    part(fortress, 'fifteen-right-tower-dark-gallery-apertures', cylinder, '#30323d', [8 + Math.sin(a) * r, y, -34 + Math.cos(a) * r], [.22, 1.18 - row * .12, .16], [0, a, 0]);
  }
}

export function createFieldReferenceDetailGeometry(ctx) {
  if (!FIELD_REFERENCE_DETAIL_IDS.includes(ctx.profile.cardId) && !FIELD_CONTINUATION_DETAIL_IDS.includes(ctx.profile.cardId)) return false;
  const builder = createDetailBuilder(ctx);
  if (ctx.profile.cardId === '67616300') chickenDetails(builder);
  else if (ctx.profile.cardId === '81380218') chorusDetails(builder);
  else if (ctx.profile.cardId === '63883999') palabyrinthDetails(builder);
  else createContinuationStageDetails(ctx.profile.cardId, builder);
  return builder.finish();
}
