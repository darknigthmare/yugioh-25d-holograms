import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { createHologramPoseAnimation } from '../src/ui/HologramPoseAnimation.js';
import { createTokenGeometryTools } from '../src/ui/HologramTokenGeometry.js';
import { TOKEN_MONSTER_MODEL_PROFILES } from '../src/ui/TokenMonsterModelProfiles.js';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/token-model-baseline-2026-10-11.json', import.meta.url)));

test('240 native Tokens keep the measured fivefold limit in attack and defense without increasing GPU batches', () => {
  assert.equal(baseline.codes.length, 240);
  assert.deepEqual(baseline.codes.map(row => row.id).sort(), Object.keys(TOKEN_MONSTER_MODEL_PROFILES).sort());
  for (const record of baseline.codes) for (const defense of [false, true]) {
    const model = createHologramMonsterModel({ id: record.id, type: 'Token Monster', isToken: true }, { defense });
    const limit = Math.min(29450, (defense ? record.defenseTriangles : record.attackTriangles) * 5);
    assert.ok(model.userData.triangleCount <= limit, `${record.id} ${defense ? 'DEF' : 'ATK'}: ${model.userData.triangleCount} > ${limit}`);
    assert.ok(model.children.length <= 5, record.id);
    const buffers = model.children.map(mesh => ({ geometry: mesh.geometry, position: mesh.geometry.attributes.position, normal: mesh.geometry.attributes.normal }));
    const animation = createHologramPoseAnimation(model, { kind: 'attack' });
    animation.update(.37);
    model.children.forEach((mesh, index) => {
      assert.equal(mesh.geometry, buffers[index].geometry);
      assert.equal(mesh.geometry.attributes.position, buffers[index].position);
      assert.equal(mesh.geometry.attributes.normal, buffers[index].normal);
    });
    animation.dispose();
    model.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
  }
});

test('tapered organic surfaces change their radius and join their smooth normals at the radial seam', () => {
  let geometry;
  const tools = createTokenGeometryTools({ part: (_name, built) => { geometry = built; } });
  tools.taperedCurve('measured-tail', 'body', [[0, 0, 0], [0, 1, 0], [0, 2, 0]], .24, .018, '#abcdef', 24, 12);
  const position = geometry.attributes.position, normal = geometry.attributes.normal;
  assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(position, 0).length() - .24) < 1e-5);
  assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(position, 24 * 13).distanceTo(new THREE.Vector3(0, 2, 0)) - .018) < 1e-5);
  for (let ring = 0; ring <= 24; ring += 1) {
    const a = new THREE.Vector3().fromBufferAttribute(normal, ring * 13);
    const b = new THREE.Vector3().fromBufferAttribute(normal, ring * 13 + 12);
    assert.ok(a.distanceTo(b) < 1e-6, `normal seam at ring ${ring}`);
    assert.ok(Math.abs(a.length() - 1) < 1e-5);
  }
  geometry.dispose();
});

test('leaf and feather surfaces gain curved depth while retaining finite geometry and smooth normals', () => {
  let geometry;
  const tools = createTokenGeometryTools({ part: (_name, built) => { geometry = built; } });
  tools.curvedSheet('measured-leaf', 'body', [[0, 0], [-.3, .5], [0, 1], [.3, .5]], .03, [0, 0, 0], undefined, '#abcdef', { camber: .14, curl: -.03 });
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.max.z - geometry.boundingBox.min.z > .1);
  assert.ok(geometry.attributes.position.array.every(Number.isFinite));
  assert.ok(geometry.attributes.normal.array.every(Number.isFinite));
  assert.equal(geometry.attributes.position.count, geometry.attributes.normal.count);
  geometry.dispose();
});
