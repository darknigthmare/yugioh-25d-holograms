import * as THREE from 'three';

const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

/** Observed in the local printed scans, in the composition's x[-2,2], y[0,4] frame.
 * These are traced estimates from one printed view, not new attacks or a claim
 * that the unillustrated reverse side has an official appearance. */
export const TOKEN_ILLUSTRATION_EFFECT_REFERENCES = freeze({
  'commemorative:YGLD-ENTKN': {
    source: '/tokens/commemorative/YGLD-ENTKN.png',
    kinds: ['gold-silhouette-aura'], chargeAnchor: null,
    observation: 'Yellow-white light follows Yami Yugi’s hair, cape and torso; no projectile.',
  },
  'commemorative:LDK2-ENT01': {
    source: '/tokens/commemorative/LDK2-ENT01.png',
    kinds: ['cyan-background-fractures', 'violet-magenta-background-glow'], chargeAnchor: null,
    observation: 'Cyan broken contours and violet glow surround Yami Yugi and Dark Magician; no projectile.',
  },
  'commemorative:LDK2-ENT02': {
    source: '/tokens/commemorative/LDK2-ENT02.png',
    kinds: ['cyan-white-mouth-charge', 'cyan-radial-rays'], chargeAnchor: [-1.304, 1.908, -.1],
    observation: 'A white-cyan charge sits below Blue-Eyes’ open muzzle, at the left of Kaiba.',
  },
  'commemorative:LDK2-ENT03': {
    source: '/tokens/commemorative/LDK2-ENT03.png',
    kinds: ['white-amber-mouth-charge', 'cyan-background-fractures', 'violet-magenta-background-glow'],
    chargeAnchor: [-.984, 2.1, -.1],
    observation: 'White light with an amber lower edge fills Red-Eyes’ mouth area, behind Joey’s left shoulder.',
  },
});

const VERTEX = `
  attribute vec3 color;
  attribute float illustrationAlpha;
  varying vec3 vIllustrationColor;
  varying float vIllustrationAlpha;
  #include <clipping_planes_pars_vertex>
  void main() {
    vIllustrationColor = color;
    vIllustrationAlpha = illustrationAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <clipping_planes_vertex>
  }
`;
const FRAGMENT = `
  uniform float illustrationIntensity;
  varying vec3 vIllustrationColor;
  varying float vIllustrationAlpha;
  #include <clipping_planes_pars_fragment>
  void main() {
    #include <clipping_planes_fragment>
    gl_FragColor = vec4(vIllustrationColor, vIllustrationAlpha * illustrationIntensity);
    #include <colorspace_fragment>
  }
`;

function createEffectBatch(name) {
  const positions = [], colors = [], alphas = [], indices = [];
  const colorCache = new Map();
  function vertex(position, color, alpha) {
    if (!colorCache.has(color)) colorCache.set(color, new THREE.Color(color));
    const tint = colorCache.get(color), index = positions.length / 3;
    positions.push(...position); colors.push(tint.r, tint.g, tint.b); alphas.push(alpha);
    return index;
  }
  function triangle(a, b, c) { indices.push(a, b, c); }
  function ribbon(points, halfWidth, color, alpha) {
    // Perpendicular offsets follow the traced broken line; no frame-time paths.
    const rows = points.map((point, index) => {
      const previous = points[Math.max(0, index - 1)], next = points[Math.min(points.length - 1, index + 1)];
      const dx = next[0] - previous[0], dy = next[1] - previous[1], length = Math.hypot(dx, dy) || 1;
      return [-1, 0, 1].map(side => vertex([
        point[0] - dy / length * halfWidth * side,
        point[1] + dx / length * halfWidth * side, point[2],
      ], color, side ? 0 : alpha));
    });
    for (let row = 1; row < rows.length; row++) for (let column = 0; column < 2; column++) {
      const a = rows[row - 1][column], b = rows[row][column], c = rows[row - 1][column + 1], d = rows[row][column + 1];
      triangle(a, b, c); triangle(b, d, c);
    }
  }
  function glow(center, radiusX, radiusY, color, strength, depth = 0) {
    const rings = [0, .3, .65, 1], opacity = [strength, strength * .8, strength * .23, 0], segments = 24;
    const rows = rings.map((radius, row) => Array.from({ length: segments + 1 }, (_, segment) => {
      const angle = segment / segments * Math.PI * 2;
      return vertex([
        center[0] + Math.cos(angle) * radiusX * radius,
        center[1] + Math.sin(angle) * radiusY * radius,
        center[2] + Math.sqrt(Math.max(0, 1 - radius * radius)) * depth,
      ], color, opacity[row]);
    }));
    for (let row = 1; row < rows.length; row++) for (let segment = 0; segment < segments; segment++) {
      if (row > 1) triangle(rows[row - 1][segment], rows[row][segment], rows[row - 1][segment + 1]);
      triangle(rows[row][segment], rows[row][segment + 1], rows[row - 1][segment + 1]);
    }
  }
  function finish() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('illustrationAlpha', new THREE.Float32BufferAttribute(alphas, 1));
    geometry.setIndex(indices); geometry.computeBoundingSphere(); geometry.computeBoundingBox();
    const material = new THREE.ShaderMaterial({
      name: `${name}-material`, vertexShader: VERTEX, fragmentShader: FRAGMENT,
      uniforms: { illustrationIntensity: { value: 1 } },
      transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      depthTest: true, depthWrite: false, toneMapped: false, clipping: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.userData.triangleCount = indices.length / 3;
    return mesh;
  }
  return { ribbon, glow, finish };
}

const cyan = '#57dfff', white = '#f0fdff', violet = '#7049f1', magenta = '#e738c5';
function fracture(batch, points) {
  batch.ribbon(points, .065, cyan, .2);
  batch.ribbon(points, .014, '#b6f6ff', .65);
}
function illustratedBackground(batch, edition) {
  if (edition === 'YGLD-ENTKN') {
    // The scan has a silhouette rim, rather than a circular magic seal.
    const contour = [[-.01,3.93,-.8],[.25,3.26,-.8],[1.01,3.5,-.8],[.68,2.85,-.8],
      [1,2.88,-.8],[.61,2.53,-.8],[.77,2.22,-.8],[1.35,2.14,-.8],[1.64,1.96,-.8],
      [1.4,1.65,-.8],[1.66,1.96,-.8],[1.82,1.29,-.8],[1.14,.74,-.8],[.69,.67,-.8],
      [.55,.01,-.8],[-.58,.01,-.8],[-.52,.57,-.8],[-.58,.78,-.8],[-.57,1.04,-.8],
      [-1.39,1.26,-.8],[-1.77,1.62,-.8],[-1.79,2.02,-.8],[-1.32,2.26,-.8],
      [-1.29,2.35,-.8],[-.91,2.28,-.8],[-.48,2.66,-.8],[-1.03,2.81,-.8],
      [-.58,2.78,-.8],[-1.08,3.38,-.8],[-.33,3.15,-.8],[-.01,3.93,-.8]];
    batch.ribbon(contour, .16, '#e9ef4d', .32);
    batch.ribbon(contour, .055, '#fff0a1', .38);
    return;
  }
  if (edition === 'LDK2-ENT02') {
    // Long straight cyan rays in this scan radiate from the mouth, not a ring.
    const center = [-1.304, 1.908, -.9];
    for (const end of [[-1.98,3.1,-.9],[-1.95,2.7,-.9],[-1.99,2.24,-.9],[-1.98,1.67,-.9],[-1.91,.67,-.9],[-1.34,.05,-.9],[-.75,.05,-.9],[-.19,.1,-.9],[.52,.25,-.9]]) {
      batch.ribbon([center, end], .038, cyan, .28);
      batch.ribbon([center, end], .007, '#cefbff', .56);
    }
    batch.glow([-1.214, 1.878, -1], .73, 1.08, '#23abef', .25);
    return;
  }
  const joey = edition === 'LDK2-ENT03';
  for (const [center, x, y, color] of [
    [[-1.58,3.6,-1.02],.52,.56,magenta], [[.25,3.65,-1.02],.72,.4,violet],
    [[1.65,2.8,-1.02],.35,.86,joey ? magenta : violet], [[-1.4,.65,-1.02],.56,.64,joey ? magenta : violet],
  ]) batch.glow(center, x, y, color, joey ? .26 : .19);
  const fractures = joey ? [
    [[-1.95,3.95,-.88],[-1.71,3.74,-.88],[-1.82,3.37,-.88],[-1.61,3.18,-.88]],
    [[-.42,3.97,-.88],[-.55,3.71,-.88],[-.32,3.44,-.88],[-.44,3.14,-.88]],
    [[1.93,3.91,-.88],[1.6,3.65,-.88],[1.76,3.35,-.88],[1.34,3.12,-.88],[1.63,2.83,-.88]],
    [[1.97,2.6,-.88],[1.62,2.35,-.88],[1.83,2.12,-.88],[1.57,1.71,-.88],[1.92,1.51,-.88]],
    [[-1.97,.36,-.88],[-1.66,.67,-.88],[-1.8,.96,-.88],[-1.54,1.17,-.88]],
  ] : [
    [[-1.99,3.63,-.88],[-1.73,3.33,-.88],[-1.85,2.98,-.88],[-1.59,2.8,-.88]],
    [[-.44,3.98,-.88],[-.23,3.74,-.88],[-.35,3.51,-.88],[-.19,3.33,-.88]],
    [[1.09,3.98,-.88],[1.34,3.64,-.88],[1.22,3.39,-.88],[1.5,3.14,-.88]],
    [[1.97,3.05,-.88],[1.73,2.7,-.88],[1.88,2.41,-.88],[1.65,2.09,-.88],[1.88,1.8,-.88]],
    [[-1.98,1.64,-.88],[-1.64,1.45,-.88],[-1.78,1.16,-.88],[-1.53,.86,-.88],[-1.64,.45,-.88]],
  ];
  fractures.forEach(points => fracture(batch, points));
}

function illustratedCharge(batch, warm) {
  // A shallow volume and bent geometric rays retain a visible charge at 3/4.
  const edge = warm ? '#f5ba66' : cyan;
  batch.glow([0, 0, -.065], .42, .48, edge, .5, .08);
  batch.glow([0, .01, 0], .27, .31, warm ? '#fff6db' : '#b5f5ff', .82, .11);
  batch.glow([0, .015, .075], .15, .19, white, .96, .105);
  for (let ray = 0; ray < 18; ray++) {
    const angle = ray / 18 * Math.PI * 2, length = .26 + (ray % 4) * .051;
    const start = [.07*Math.cos(angle), .07*Math.sin(angle), .035];
    const middle = [length*.62*Math.cos(angle+.045), length*.7*Math.sin(angle+.045), ray%2 ? .02 : .075];
    const end = [length*Math.cos(angle), length*1.07*Math.sin(angle), -.015];
    batch.ribbon([start, middle, end], .025, edge, .4);
    batch.ribbon([start, middle, end], .006, white, .85);
  }
}

/** No RAF, textures, random particles or buffer uploads. The caller renders on
 * demand and owns visibility. reducedMotion preserves the illustrated light. */
export function createTokenIllustrationEffects(presentationId, { reducedMotion = false, visible = true, chargePosition, frameSize = 4 } = {}) {
  if (typeof presentationId !== 'string' || !Object.hasOwn(TOKEN_ILLUSTRATION_EFFECT_REFERENCES, presentationId)) return null;
  const reference = TOKEN_ILLUSTRATION_EFFECT_REFERENCES[presentationId];
  const edition = presentationId.slice('commemorative:'.length);
  const scale = Number.isFinite(frameSize) && frameSize > 0 && frameSize <= 100 ? frameSize / 4 : 1;
  const group = new THREE.Group();
  group.name = `token-illustration-effects-${edition}`;
  group.visible = visible === true;
  group.userData = { source: reference.source, kinds: reference.kinds, frameSize: scale * 4, fidelity: 'single-view-procedural-interpretation' };
  const background = createEffectBatch(`${edition}-illustrated-background`);
  illustratedBackground(background, edition);
  const backgroundMesh = background.finish();
  backgroundMesh.scale.setScalar(scale);
  group.add(backgroundMesh);
  if (reference.chargeAnchor) {
    const charge = createEffectBatch(`${edition}-illustrated-mouth-charge`);
    illustratedCharge(charge, edition === 'LDK2-ENT03');
    const mesh = charge.finish();
    const hasWorldAnchor = Array.isArray(chargePosition) && chargePosition.length === 3 && chargePosition.every(Number.isFinite);
    mesh.position.fromArray(hasWorldAnchor ? chargePosition : reference.chargeAnchor);
    // A mouth measured on the posed monster is already in composition units.
    if (!hasWorldAnchor) mesh.position.multiplyScalar(scale);
    mesh.scale.setScalar(scale);
    group.add(mesh);
  }
  let disposed = false;
  const meshes = [...group.children];
  function reset() {
    if (disposed) return false;
    meshes.forEach(mesh => { mesh.material.uniforms.illustrationIntensity.value = 1; });
    return true;
  }
  return {
    group,
    update(timeSeconds) {
      if (disposed || reducedMotion || !group.visible || !Number.isFinite(timeSeconds)) return false;
      const intensity = 1 + Math.sin(timeSeconds * 1.3) * .035;
      meshes.forEach(mesh => { mesh.material.uniforms.illustrationIntensity.value = intensity; });
      return true;
    },
    setVisible(value) { if (disposed) return false; group.visible = value === true; return true; },
    reset,
    dispose() {
      if (disposed) return;
      disposed = true;
      meshes.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
      group.removeFromParent(); group.clear();
      group.userData.disposed = true;
    },
  };
}
