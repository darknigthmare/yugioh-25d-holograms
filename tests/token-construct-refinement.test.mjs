import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { buildTokenConstructAnatomy } from '../src/ui/HologramTokenConstructModels.js';
import { getTokenMonsterModelProfile } from '../src/ui/TokenMonsterModelProfiles.js';

const codes = ['35514097', '28053764', '48411997', '68815402', '93130022', '67949764', '23331401', '82556059', '62125439'];

function dispose(model) {
  model.traverse(object => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
}

test('reference-based construct refinements remain finite, batched and within the Token geometry budget', () => {
  for (const id of codes) {
    const model = createHologramMonsterModel({ id, type: 'Token Monster', isToken: true });
    assert.equal(model.userData.profile.id, `token-${id}`);
    assert.ok(model.userData.meshCount <= 5);
    assert.ok(model.userData.triangleCount <= 6000);
    assert.ok(!model.userData.partNames.includes('token-goat-face'));
    model.traverse(object => {
      if (!object.geometry) return;
      for (const attribute of Object.values(object.geometry.attributes)) {
        assert.ok(attribute.array.every(Number.isFinite), `${id} has finite geometry attributes`);
      }
    });
    const rig = model.userData.poseRig;
    dispose(model);
    assert.equal(rig.disposed, true);
  }
});

test('laser module, perched one-eye dragon, spacecraft orb and crowned crystal keep their distinct source silhouettes', () => {
  const expected = new Map([
    ['35514097', 'token-multi-violet-laser-lens'],
    ['28053764', 'token-dragonoid-chalice-upper-rim'],
    ['93130022', 'token-option-inner-dark-craft'],
    ['67949764', 'token-umbral-elongated-blue-crystal']
  ]);
  for (const [id, identifyingPart] of expected) {
    const model = createHologramMonsterModel({ id });
    const parts = model.userData.partNames;
    assert.ok(parts.includes(identifyingPart));
    assert.ok(!parts.some(name => name.startsWith('token-gadget-piston-leg')));
    assert.ok(!parts.some(name => name.startsWith('token-digital-orb-eye')));
    assert.ok(!parts.some(name => name.startsWith('token-digital-angular-wing')));
    if (id === '28053764') {
      assert.equal(parts.filter(name => name === 'token-dragonoid-single-red-eye').length, 1);
      assert.ok(parts.some(name => name.startsWith('wing--1-token-dragonoid')));
      assert.ok(parts.some(name => name.startsWith('wing-1-token-dragonoid')));
    }
    dispose(model);
  }
});

test('Small Fire and Wild Fire remain faceless while their flame geometries differ', () => {
  const models = ['48411997', '68815402'].map(id => createHologramMonsterModel({ id }));
  for (const model of models) {
    assert.ok(!model.userData.partNames.some(name => /token-flame-(?:eye|smiling-mouth)/.test(name)));
  }
  assert.ok(models[0].userData.partNames.includes('token-flame-core'));
  assert.ok(models[1].userData.partNames.includes('token-wildfire-large-swirling-flame'));
  for (const model of models) dispose(model);
});

test('Engine uses a compact crankcase and wire loops while Synchron uses two green V cylinders', () => {
  const compact = createHologramMonsterModel({ id: '82556059' });
  const synchron = createHologramMonsterModel({ id: '62125439' });
  assert.ok(compact.userData.partNames.includes('token-engine-compact-crankcase'));
  assert.ok(compact.userData.partNames.includes('token-engine-looping-red-wire'));
  assert.ok(compact.userData.partNames.includes('token-engine-looping-blue-wire'));
  assert.ok(!compact.userData.partNames.some(name => name.includes('cooling-fin')));
  for (const side of [-1, 1]) {
    assert.equal(synchron.userData.partNames.filter(name => name.startsWith(`token-synchron-green-cooling-fin-${side}-`)).length, 7);
  }
  assert.ok(!synchron.userData.partNames.includes('token-engine-compact-crankcase'));
  assert.notEqual(compact.userData.triangleCount, synchron.userData.triangleCount);
  dispose(compact); dispose(synchron);
});

test('solar-panel grid bars sit on the tilted panel surface rather than the world XY plane', () => {
  const boxes = [];
  const helpers = {
    box(name, material, position, scale, rotation = [0, 0, 0]) { boxes.push({ name, position, scale, rotation }); },
    part(name, geometry) { geometry.dispose(); },
    sphere() {}, rod() {}, cone() {}, ring() {}
  };
  assert.equal(buildTokenConstructAnatomy(getTokenMonsterModelProfile('23331401'), helpers), true);
  for (const side of [-1, 1]) {
    const frame = boxes.find(box => box.name === `token-solar-panel-frame-${side}`);
    const cell = boxes.find(box => box.name === `token-solar-panel-cell-${side}`);
    const inverse = new THREE.Quaternion().setFromEuler(new THREE.Euler(...frame.rotation)).invert();
    const grid = boxes.filter(box => box.name.startsWith(`token-solar-cell-grid-${side}-`) || box.name.startsWith(`token-solar-cell-grid-column-${side}-`));
    assert.equal(grid.length, 8);
    const cellFront = cell.scale[2] / 2;
    for (const bar of grid) {
      const local = new THREE.Vector3(...bar.position).sub(new THREE.Vector3(...cell.position)).applyQuaternion(inverse);
      assert.deepEqual(bar.rotation, frame.rotation);
      assert.ok(Math.abs(local.z - cellFront) <= .007, 'grid lies just above the cell surface');
      assert.ok(Math.abs(local.x) <= frame.scale[0] / 2);
      assert.ok(Math.abs(local.y) <= frame.scale[1] / 2);
    }
  }
});
