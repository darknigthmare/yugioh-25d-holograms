import * as THREE from 'three';

/** Construction-only geometry helpers. The scene owns batching, rig and disposal. */
export function createTokenGeometryTools(helpers) {
  const { part, sphere, rod } = helpers;

  function solid(name, material, outline, depth, position = [0, 0, 0], rotation, tint) {
    const shape = new THREE.Shape();
    outline.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
    geometry.translate(0, 0, -depth / 2);
    part(name, geometry, material, position, [1, 1, 1], rotation, tint);
  }

  function curve(name, material, points, radius, tint, segments = 12) {
    const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    part(name, new THREE.TubeGeometry(path, segments, radius, 7, false), material, [0, 0, 0], undefined, undefined, tint);
  }

  function taperedPath(name, material, points, radius, endRadius, tint) {
    for (let index = 1; index < points.length; index += 1) {
      const start = radius + (endRadius - radius) * (index - 1) / (points.length - 1);
      const end = radius + (endRadius - radius) * index / (points.length - 1);
      rod(`${name}-${index}`, material, points[index - 1], points[index], start, end, tint);
    }
  }

  function eyes(prefix, { y, z, x = 0, spread = 0.18, size = 0.07, pupil = true, white = false, tint } = {}) {
    for (const side of [-1, 1]) {
      const position = [x + side * spread, y, z];
      if (white) sphere(`${prefix}-eye-white-${side}`, 'body', position, [size * 1.45, size * 1.35, size * 0.45], 1, '#f5f0df');
      sphere(`${prefix}-eye-${side}`, 'eye', [position[0], position[1], position[2] + (white ? size * 0.35 : 0)], [size, size * 1.03, size * 0.42], 1, tint);
      if (pupil) {
        sphere(`${prefix}-pupil-${side}`, 'dark', [position[0], position[1], position[2] + size * (white ? 0.75 : 0.4)], [size * 0.42, size * 0.75, size * 0.22], 0, '#131321');
        sphere(`${prefix}-eye-glint-${side}`, 'eye', [position[0] - size * 0.22, position[1] + size * 0.35, position[2] + size * (white ? 0.93 : 0.62)], [size * 0.2, size * 0.2, size * 0.13], 0, '#fffdf4');
      }
    }
  }

  function spokes(prefix, material, center, radius, count, width = 0.025, tint) {
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2;
      rod(`${prefix}-${index}`, material, center, [center[0] + Math.sin(angle) * radius, center[1] + Math.cos(angle) * radius, center[2]], width, width, tint);
    }
  }

  return { solid, curve, taperedPath, eyes, spokes };
}
