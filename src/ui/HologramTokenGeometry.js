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
    part(name, new THREE.TubeGeometry(path, radius <= .022 ? Math.max(8, segments) : Math.max(16, segments * 2), radius, radius <= .022 ? 8 : 12, false), material, [0, 0, 0], undefined, undefined, tint);
  }

  // Armour keeps its flat face, but its silhouette gains a real rounded rim.
  function roundedSolid(name, material, outline, depth, position = [0, 0, 0], rotation, tint, bevel = .025) {
    const shape = new THREE.Shape();
    outline.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const rim = Math.min(Math.abs(depth) * .3, Math.max(0, bevel));
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(.001, depth - rim * 2), bevelEnabled: rim > 0, bevelThickness: rim, bevelSize: rim, bevelSegments: 3, steps: 1, curveSegments: 12 });
    geometry.translate(0, 0, -depth / 2 + rim);
    part(name, geometry, material, position, [1, 1, 1], rotation, tint);
  }

  // A Catmull-Rom tube with an actual changing radius. The surface remains
  // smooth around bends, unlike a chain of disconnected conical cylinders.
  function taperedCurve(name, material, points, startRadius, endRadius, tint, segments = 24, radialSegments = 12, flatten = 1) {
    const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    const geometry = new THREE.TubeGeometry(path, segments, 1, radialSegments, false);
    const position = geometry.attributes.position;
    for (let ring = 0; ring <= segments; ring += 1) {
      const t = ring / segments, center = path.getPointAt(t);
      const radius = startRadius * (1 - t) + endRadius * t;
      for (let around = 0; around <= radialSegments; around += 1) {
        const vertex = ring * (radialSegments + 1) + around;
        const point = new THREE.Vector3().fromBufferAttribute(position, vertex).sub(center);
        // flatten scales one transported radial axis, never the path itself.
        const normal = geometry.normals[ring], amount = point.dot(normal);
        point.addScaledVector(normal, amount * (flatten - 1)).multiplyScalar(radius).add(center);
        position.setXYZ(vertex, point.x, point.y, point.z);
      }
    }
    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;
    for (let ring = 0; ring <= segments; ring += 1) {
      const first = ring * (radialSegments + 1), last = first + radialSegments;
      const seam = new THREE.Vector3().fromBufferAttribute(normals, first).add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize();
      normals.setXYZ(first, seam.x, seam.y, seam.z); normals.setXYZ(last, seam.x, seam.y, seam.z);
    }
    part(name, geometry, material, [0, 0, 0], undefined, undefined, tint);
  }

  // Subdivision samples a curved *surface*: leaves, feathers, cloth and fur
  // acquire thickness, a bowed center and a curled tip, not extra flat faces.
  function curvedSheet(name, material, outline, depth, position = [0, 0, 0], rotation, tint, options = {}) {
    const { camber = .09, curl = .05, subdivisions = 2, wave = 0 } = options;
    const shape = new THREE.Shape();
    outline.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
    shape.closePath();
    const planar = new THREE.ShapeGeometry(shape);
    let vertices = Array.from({ length: planar.attributes.position.count }, (_, index) => [planar.attributes.position.getX(index), planar.attributes.position.getY(index)]);
    let faces = Array.from(planar.index.array);
    planar.dispose();
    for (let iteration = 0; iteration < Math.min(3, Math.max(0, subdivisions)); iteration += 1) {
      const midpoints = new Map(), refined = [];
      function middle(a, b) {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (!midpoints.has(key)) {
          midpoints.set(key, vertices.length);
          vertices.push([(vertices[a][0] + vertices[b][0]) / 2, (vertices[a][1] + vertices[b][1]) / 2]);
        }
        return midpoints.get(key);
      }
      for (let face = 0; face < faces.length; face += 3) {
        const [a, b, c] = faces.slice(face, face + 3), ab = middle(a, b), bc = middle(b, c), ca = middle(c, a);
        refined.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
      }
      faces = refined;
    }
    const minX = Math.min(...vertices.map(p => p[0])), maxX = Math.max(...vertices.map(p => p[0]));
    const minY = Math.min(...vertices.map(p => p[1])), maxY = Math.max(...vertices.map(p => p[1]));
    const positions = [], uv = [], indices = [], count = vertices.length, edges = new Map();
    for (const side of [1, -1]) for (const [x, y] of vertices) {
      const u = (x - minX) / Math.max(.001, maxX - minX), v = (y - minY) / Math.max(.001, maxY - minY);
      const bow = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * camber;
      const tipCurl = v * v * v * curl, fold = Math.sin(u * Math.PI * 4) * Math.sin(v * Math.PI) * wave;
      positions.push(x, y, bow + tipCurl + fold + side * depth / 2); uv.push(u, v);
    }
    for (let face = 0; face < faces.length; face += 3) {
      const [a, b, c] = faces.slice(face, face + 3);
      indices.push(a, b, c, c + count, b + count, a + count);
      for (const [from, to] of [[a, b], [b, c], [c, a]]) {
        const key = from < to ? `${from}:${to}` : `${to}:${from}`;
        if (edges.has(key)) edges.delete(key); else edges.set(key, [from, to]);
      }
    }
    for (const [a, b] of edges.values()) indices.push(a, a + count, b, b, a + count, b + count);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    part(name, geometry, material, position, [1, 1, 1], rotation, tint);
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

  return { solid, roundedSolid, curvedSheet, curve, taperedCurve, taperedPath, eyes, spokes };
}
