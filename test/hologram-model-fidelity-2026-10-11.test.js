import assert from 'node:assert/strict';
import test from 'node:test';
import { Box3, Vector3 } from 'three';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { createHologramPoseAnimation, HOLOGRAM_JOINTS, resolveHologramPartJoint } from '../src/ui/HologramPoseAnimation.js';
import { buildPopularGodMonsterAnatomy, POPULAR_GOD_MODEL_PROFILES } from '../src/ui/HologramPopularGodModels.js';
import { HOLOGRAM_TRIANGLE_BASELINE, getHologramTriangleBudget } from './fixtures/hologram-triangle-budgets-2026-10-11.js';

function release(model) {
  for (const mesh of model.children) { mesh.geometry.dispose(); mesh.material.dispose(); }
}

for (const id of Object.keys(HOLOGRAM_TRIANGLE_BASELINE)) {
  test(`refined ${id}: measured fivefold budget, finite full volume, immutable animated buffers and release in both positions`, () => {
    for (const defense of [false, true]) {
      const model = createHologramMonsterModel({ id }, { defense });
      assert.ok(model.userData.triangleCount <= getHologramTriangleBudget(id, { defense }));
      assert.ok(model.children.length <= 5);
      const size = new Box3().setFromObject(model).getSize(new Vector3());
      assert.ok(size.x > .3 && size.y > .3 && size.z > .3);
      const buffers = model.children.map(mesh => Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([key, attribute]) => [key, { array: attribute.array, version: attribute.version }])));
      for (const mesh of model.children) {
        assert.equal(mesh.material.map, null);
        assert.equal(mesh.geometry.attributes.hologramJoint.count, mesh.geometry.attributes.position.count);
        for (const attribute of Object.values(mesh.geometry.attributes)) assert.ok([...attribute.array].every(Number.isFinite));
      }
      for (const kind of ['attack', 'casting', 'recoil', 'summon']) {
        const pose = createHologramPoseAnimation(model, { kind });
        pose.update(.4);
        model.children.forEach((mesh, index) => {
          for (const [key, attribute] of Object.entries(mesh.geometry.attributes)) {
            assert.equal(attribute.array, buffers[index][key].array);
            assert.equal(attribute.version, buffers[index][key].version);
          }
        });
        pose.update(1); pose.dispose();
      }
      const resources = new Set();
      model.traverse(object => {
        for (const resource of [object.geometry, object.material, object.customDepthMaterial, object.customDistanceMaterial]) if (resource) resources.add(resource);
      });
      const disposed = new Map([...resources].map(resource => [resource, 0]));
      for (const resource of resources) resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource) + 1));
      release(model);
      assert.ok([...disposed.values()].every(count => count === 1));
      assert.equal(model.userData.poseRig.disposed, true);
    }
  });
}

test('new fine armor, glove and upper jaw details follow the actual moving parent rather than the torso', () => {
  const pairs = [
    ['upper-arm-1-neos-sculpted-lateral-bicep', 'upper-arm-1-neos-muscle'],
    ['hand-1-utopia-gold-grip-seam-0', 'hand-1-utopia-dark-glove'],
    ['upper-arm-1-utopia-visible-dark-elbow-pivot', 'upper-arm-1-utopia-white'],
    ['mage-glove-1-spiral-trim', 'mage-glove-1'],
    ['hand-1-obelisk-articulated-knuckle-0', 'hand-1-obelisk-clenched-fist'],
    ['hand-1-junk-rounded-knuckle-0', 'hand-1-junk-brass-glove']
  ];
  for (const [detail, parent] of pairs) {
    assert.equal(resolveHologramPartJoint(detail), resolveHologramPartJoint(parent), detail);
    assert.notEqual(resolveHologramPartJoint(detail), HOLOGRAM_JOINTS.BODY, detail);
  }
  assert.equal(resolveHologramPartJoint('ra-visible-upper-ivory-tooth-1-0'), HOLOGRAM_JOINTS.BODY);
  assert.equal(resolveHologramPartJoint('jaw-ra-pointed-lower-golden-beak'), HOLOGRAM_JOINTS.JAW);
});

test('fur and baby skin use matte material while the illustrated Cyber Dragon keeps a metallic body', () => {
  for (const id of ['40640057', '26202165', '88819587']) {
    const model = createHologramMonsterModel({ id });
    const body = model.children.find(mesh => mesh.name.endsWith('-body')).material;
    assert.ok(body.metalness <= .05 && body.roughness >= .7);
    release(model);
  }
  const cyber = createHologramMonsterModel({ id: '70095154' });
  assert.ok(cyber.children.find(mesh => mesh.name.endsWith('-body')).material.metalness >= .7);
  release(cyber);
});

test('serpentine God tubes close the exact radial boundary and weld the UV seam normal after radius sculpting', () => {
  for (const id of ['10000020', '10000010']) {
    const geometries = new Map();
    const capture = (name, geometry) => geometries.set(name, geometry);
    const ignore = () => {};
    try {
      assert.equal(buildPopularGodMonsterAnatomy(POPULAR_GOD_MODEL_PROFILES[id], { part: capture, sphere: ignore, box: ignore, cone: ignore, rod: ignore }), true);
      const tubes = [...geometries].filter(([name, geometry]) => geometry.type === 'TubeGeometry');
      assert.ok(tubes.length > 0);
      for (const [name, geometry] of tubes) {
        const { tubularSegments, radialSegments } = geometry.parameters;
        const stride = radialSegments + 1, position = geometry.attributes.position, normal = geometry.attributes.normal;
        for (const [label, row] of [['start', 0], ['end', tubularSegments]]) {
          const cap = geometries.get(`${name}-${label}-closed-cap`);
          assert.ok(cap && cap.index.count === radialSegments * 3);
          for (let column = 0; column <= radialSegments; column++) {
            const original = new Vector3().fromBufferAttribute(position, row * stride + column);
            const closed = new Vector3().fromBufferAttribute(cap.attributes.position, column + 1);
            assert.ok(original.distanceTo(closed) <= 1e-7, `${name}: exact ${label} boundary`);
          }
        }
        for (let row = 0; row <= tubularSegments; row++) {
          const first = new Vector3().fromBufferAttribute(normal, row * stride);
          const last = new Vector3().fromBufferAttribute(normal, row * stride + radialSegments);
          assert.ok(first.distanceTo(last) <= 1e-7, `${name}: radial shading seam`);
        }
      }
    } finally {
      for (const geometry of geometries.values()) geometry.dispose();
    }
  }
});
