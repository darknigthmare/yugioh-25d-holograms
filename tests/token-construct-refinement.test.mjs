import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHologramMonsterModel } from '../src/ui/HologramMonsterModels.js';
import { buildTokenConstructAnatomy } from '../src/ui/HologramTokenConstructModels.js';
import { getTokenMonsterModelProfile } from '../src/ui/TokenMonsterModelProfiles.js';
import { resolveHologramPartJoint, HOLOGRAM_JOINTS } from '../src/ui/HologramPoseAnimation.js';

// Measured attack-pose geometry before this fidelity pass (source 1371c5ba).
// Native defense geometry adds the same 568-triangle position frame.
const baselineTriangles = {
  10389143: 1160, 904186: 1160, 14089429: 1364, 29491335: 1160,
  35514097: 1232, 28053764: 2956, 48411997: 1956, 68815402: 2292,
  93130022: 2564, 67949764: 1008, 23331401: 1040, 44586427: 1508,
  82556059: 2164, 62125439: 1828, 93104633: 1060, 44052075: 1328,
  48115278: 1664, 27450401: 1116, 84816245: 2052, 13536607: 1612, 176393: 1926
};
const codes = Object.keys(baselineTriangles);

function dispose(model) {
  model.traverse(object => {
    object.geometry?.dispose();
    object.material?.dispose();
  });
}

test('reference-based construct refinements remain finite, batched and within the Token geometry budget', () => {
  for (const id of codes) for (const defense of [false, true]) {
    const model = createHologramMonsterModel({ id, type: 'Token Monster', isToken: true }, { defense });
    assert.equal(model.userData.profile.id, `token-${id}`);
    assert.ok(model.userData.meshCount <= 5);
    assert.ok(model.userData.triangleCount <= (baselineTriangles[id] + (defense ? 568 : 0)) * 5, `${id}/${defense ? 'DEF' : 'ATK'} fits its measured fivefold budget`);
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

test('fork, double-pod fighter, flattened delta and conventional jet remain different geometries', () => {
  const models = ['14089429', '29491335', '10389143', '904186'].map(id => createHologramMonsterModel({ id }));
  const [option, fighter, eagle, jet] = models.map(model => model.userData.partNames);
  assert.equal(option.filter(name => /^token-option-forward-rail-/.test(name)).length, 2);
  assert.ok(option.includes('token-option-rear-reactor'));
  assert.ok(!option.some(name => name.includes('aircraft-swept-panel') || name.includes('aircraft-cockpit')));
  assert.ok(fighter.includes('token-dogfighter-black-transverse-bridge'));
  assert.equal(fighter.filter(name => name.includes('token-dogfighter-red-nose')).length, 2);
  assert.ok(!fighter.some(name => name.includes('aircraft-cockpit')));
  assert.ok(eagle.includes('token-battle-eagle-curved-whip-tail'));
  assert.equal(eagle.filter(name => name.includes('aircraft-swept-panel')).length, 2);
  assert.ok(!eagle.some(name => name.includes('aircraft-engine')));
  assert.ok(jet.includes('token-aircraft-streamlined-fuselage'));
  assert.ok(jet.includes('token-aircraft-cockpit'));
  for (const model of models) dispose(model);
});

test('V-LAN has three independent armoured serpent heads, luminous necks and a coiled lower body', () => {
  const model = createHologramMonsterModel({ id: '13536607' });
  const names = model.userData.partNames;
  assert.equal(names.filter(name => /^token-vlan-snake-head-/.test(name)).length, 3);
  assert.equal(names.filter(name => /^token-vlan-network-cable-/.test(name)).length, 3);
  assert.equal(names.filter(name => /^token-vlan-snake-open-mouth-/.test(name)).length, 2);
  assert.ok(names.includes('token-vlan-snake-closed-jaw-line-0'));
  assert.ok(names.includes('token-vlan-coiled-metal-serpent-body'));
  assert.equal(names.filter(name => /^token-vlan-coiled-armor-course-/.test(name)).length, 18);
  assert.ok(!names.includes('token-digital-polyhedral-core'));
  dispose(model);
});

test('source-specific mechanisms preserve visible batteries, lenses, brick studs and four Koa’ki Meiru arms', () => {
  const expected = new Map([
    ['44586427', ['token-battery-raised-solar-frame--1', 'token-battery-raised-solar-frame-1', 'token-battery-frowning-mouth']],
    ['23331401', ['token-data-solar-bent-neck', 'token-data-solar-mechanical-bird-head', 'token-data-solar-turbine-gold-rim']],
    ['93104633', ['token-security-orange-slot-frame', 'token-security-lower-lance-tip', 'token-security-lens-highlight-large']],
    ['44052075', ['token-gear-rear-pinion-body', 'token-gear-front-hub', 'token-gear-rear-bearing-collar']],
    ['84816245', ['token-acorn-usb-dark-lower-socket', 'token-acorn-usb-lower-blue-tongue', 'token-acorn-cup-layer-2']],
    ['176393', ['token-koaki-camera-concentric-aperture', 'token-koaki-seal-central-dot']]
  ]);
  for (const [id, parts] of expected) {
    const model = createHologramMonsterModel({ id });
    for (const name of parts) assert.ok(model.userData.partNames.includes(name), `${id}: ${name}`);
    if (id === '176393') assert.equal(model.userData.partNames.filter(name => /^token-koaki-armored-gauntlet-/.test(name)).length, 4);
    dispose(model);
  }
  const block = createHologramMonsterModel({ id: '48115278' });
  assert.equal(block.userData.partNames.filter(name => /^token-block-head-stud-/.test(name)).length, 4);
  assert.equal(block.userData.partNames.filter(name => /^token-block-round-stud-/.test(name)).length, 12);
  assert.equal(block.userData.partNames.filter(name => /^hand-.*-token-block-finger-(?:upper|lower)-/.test(name)).length, 16);
  dispose(block);
});

test('added fingers and gauntlet details share their existing hand’s deformation joint', () => {
  for (const side of [-1, 1]) {
    for (let finger = 0; finger < 4; finger++) assert.equal(resolveHologramPartJoint(`token-battery-finger-${side}-${finger}`), resolveHologramPartJoint(`token-battery-hand-${side}`));
    assert.equal(resolveHologramPartJoint(`token-battery-thumb-${side}`), HOLOGRAM_JOINTS.BODY);
    for (let finger = 0; finger < 3; finger++) assert.equal(resolveHologramPartJoint(`hand-${side}-token-gadget-separate-finger-${finger}`), resolveHologramPartJoint(`hand-${side}-token-gadget`));
    for (let arm = 0; arm < 2; arm++) {
      assert.equal(resolveHologramPartJoint(`token-koaki-armored-gauntlet-${side}-${arm}`), HOLOGRAM_JOINTS.BODY);
      assert.equal(resolveHologramPartJoint(`token-koaki-gauntlet-gold-trace-${side}-${arm}`), HOLOGRAM_JOINTS.BODY);
    }
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
  boxes.length = 0;
  assert.equal(buildTokenConstructAnatomy(getTokenMonsterModelProfile('44586427'), helpers), true);
  for (const side of [-1, 1]) {
    const frame = boxes.find(box => box.name === `token-battery-raised-solar-frame-${side}`);
    const cell = boxes.find(box => box.name === `token-battery-raised-solar-cell-${side}`);
    const inverse = new THREE.Quaternion().setFromEuler(new THREE.Euler(...frame.rotation)).invert();
    const grid = boxes.filter(box => box.name.startsWith(`token-battery-raised-grid-row-${side}-`) || box.name.startsWith(`token-battery-raised-grid-column-${side}-`));
    assert.equal(grid.length, 7);
    for (const bar of grid) {
      const local = new THREE.Vector3(...bar.position).sub(new THREE.Vector3(...cell.position)).applyQuaternion(inverse);
      assert.deepEqual(bar.rotation, frame.rotation);
      assert.ok(Math.abs(local.z - cell.scale[2] / 2) <= .007, 'raised grid follows its own tilted panel');
      assert.ok(Math.abs(local.x) <= frame.scale[0] / 2);
      assert.ok(Math.abs(local.y) <= frame.scale[1] / 2);
    }
  }
});
