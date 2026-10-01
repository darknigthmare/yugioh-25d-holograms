import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  FIELD_ENVIRONMENT_GEOMETRY_FAMILIES,
  createFieldEnvironmentGeometry,
  disposeFieldEnvironmentGeometry,
  getFieldEnvironmentGeometrySignature,
  resolveFieldEnvironmentGeometryProfile
} from '../src/ui/FieldEnvironmentGeometry.js';
import {
  FIELD_ENVIRONMENT_REGISTRY,
  getFieldEnvironmentForCardId,
  resolveFieldEnvironmentSelection
} from '../src/ui/FieldEnvironmentRegistry.js';
import { FIELD_SPELL_ENVIRONMENT_CATALOG } from '../src/ui/FieldSpellEnvironmentCatalog.js';

function geometrySnapshot(group) {
  const result = [];
  group.traverse(object => {
    if (!object.isMesh) return;
    result.push({
      name: object.name,
      shape: object.geometry.type,
      position: object.position.toArray(),
      scale: object.scale.toArray(),
      rotation: object.rotation.toArray(),
      color: object.material.color.getHexString()
    });
  });
  return result;
}

test('all Field families build distinct peripheral geometry without occupying the duel corridor', () => {
  assert.deepEqual(new Set(FIELD_ENVIRONMENT_GEOMETRY_FAMILIES), new Set(Object.keys(FIELD_ENVIRONMENT_REGISTRY)));
  const signatures = new Set();
  const duelCorridor = new THREE.Box3(
    new THREE.Vector3(-9, -3, -18),
    new THREE.Vector3(9, 30, 17)
  );
  for (const family of FIELD_ENVIRONMENT_GEOMETRY_FAMILIES) {
    const environment = FIELD_ENVIRONMENT_REGISTRY[family];
    const group = createFieldEnvironmentGeometry(THREE, environment);
    signatures.add(JSON.stringify(geometrySnapshot(group)));
    assert.equal(group.userData.publicOnly, true);
    assert.ok(group.userData.meshCount > 10, family);
    assert.ok(group.userData.meshCount < 220, `${family}: excessive draw count`);
    group.updateMatrixWorld(true);
    group.traverse(object => {
      if (!object.isMesh) return;
      const bounds = new THREE.Box3().setFromObject(object);
      assert.equal(bounds.intersectsBox(duelCorridor), false, `${family}/${object.name} obscures the duel`);
      assert.ok(bounds.min.x > -48 && bounds.max.x < 48, `${family}: horizon width`);
      assert.ok(bounds.min.z > -48 && bounds.max.z < 48, `${family}: horizon depth`);
      assert.equal(object.material.map, null, 'scenery cannot receive private card faces');
    });
    disposeFieldEnvironmentGeometry(group);
  }
  assert.equal(signatures.size, FIELD_ENVIRONMENT_GEOMETRY_FAMILIES.length);
});

test('all 336 resolved Field Spells retain dedicated illustration and geometry contracts', () => {
  for (const entry of FIELD_SPELL_ENVIRONMENT_CATALOG) {
    const environment = getFieldEnvironmentForCardId(entry.cardId);
    assert.equal(environment.geometryProfile.family, entry.environmentId);
    assert.equal(environment.geometryProfile.cardId, entry.cardId);
    assert.equal(Object.isFrozen(environment.geometryProfile), true);
    const selection = resolveFieldEnvironmentSelection({ playerFieldSpell: {
      id: entry.cardId, card_type: 'spell', type: 'Spell Card', race: 'Field', resolved: true
    } });
    assert.equal(selection.isFallback, false, entry.name);
    assert.equal(selection.environment, environment);
    assert.match(environment.backdropUrl, new RegExp(`/field-spells/${entry.cardId}-`));
    const group = createFieldEnvironmentGeometry(THREE, environment);
    const corridor = new THREE.Box3(new THREE.Vector3(-9, -3, -18), new THREE.Vector3(9, 30, 17));
    group.updateMatrixWorld(true);
    assert.ok(group.userData.meshCount < 220, `${entry.name}: excessive draw count`);
    group.traverse(object => {
      if (!object.isMesh) return;
      const bounds = new THREE.Box3().setFromObject(object);
      assert.equal(bounds.intersectsBox(corridor), false,
        `${entry.name}/${object.name} obscures the duel`);
      assert.ok(bounds.min.x > -48 && bounds.max.x < 48, `${entry.name}: horizon width`);
      assert.ok(bounds.min.z > -48 && bounds.max.z < 48, `${entry.name}: horizon depth`);
    });
    disposeFieldEnvironmentGeometry(group);
  }
});

test('set, concealed, pending and negated Fields cannot reveal card-specific landmarks', () => {
  const clearingSignature = getFieldEnvironmentGeometrySignature(FIELD_ENVIRONMENT_REGISTRY.clearing);
  for (const overrides of [
    { isSetFaceDown: true }, { hidden: true }, { activationPending: true },
    { fieldActivationState: 'pending' }, { activationNegated: true }, { resolvedSuccessfully: false }
  ]) {
    const selection = resolveFieldEnvironmentSelection({ playerFieldSpell: {
      id: '47355498', card_type: 'spell', type: 'Spell Card', race: 'Field',
      resolved: true, fieldActivationSequence: 9, ...overrides
    } });
    assert.equal(getFieldEnvironmentGeometrySignature(selection.environment), clearingSignature);
    assert.equal(selection.sourceCardId, null);
  }
});

test('geometry stays deterministic and changes for different cards of the same family', () => {
  const first = getFieldEnvironmentForCardId('22702055');
  const second = getFieldEnvironmentForCardId('295517');
  const groups = [first, first, second].map(environment => createFieldEnvironmentGeometry(THREE, environment));
  assert.deepEqual(geometrySnapshot(groups[0]), geometrySnapshot(groups[1]));
  assert.notDeepEqual(geometrySnapshot(groups[0]), geometrySnapshot(groups[2]));
  assert.notEqual(getFieldEnvironmentGeometrySignature(first), getFieldEnvironmentGeometrySignature(second));
  assert.equal(resolveFieldEnvironmentGeometryProfile('umi', '000295517').landmark, 'submerged-ruins');
  assert.equal(resolveFieldEnvironmentGeometryProfile('missing').family, 'generic');
  for (const group of groups) disposeFieldEnvironmentGeometry(group);
});

test('key Field Spells have the expected physical landmarks', () => {
  for (const [cardId, landmark, meshName] of [
    ['47355498', 'funerary-valley', 'funerary-pyramid'],
    ['75041269', 'clock-tower', 'clock-face'],
    ['76375976', 'mine-entrance', 'mine-timber'],
    ['37694547', 'gearworks', 'gear-tooth'],
    ['72283691', 'golden-castle', 'castle-curtain-wall'],
    ['71645242', 'thorn-garden', 'rose-bloom'],
    ['33550694', 'fusion-gate', 'dimensional-ring'],
    ['59160188', 'shadow-prison', 'shadow-prison-bar']
  ]) {
    const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId(cardId));
    assert.equal(group.userData.landmark, landmark);
    assert.ok(group.getObjectByName(meshName), `${cardId}: ${meshName}`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('replacing scenery disposes shared resources once and is safe to repeat', () => {
  const group = createFieldEnvironmentGeometry(THREE, FIELD_ENVIRONMENT_REGISTRY.forest);
  const scene = new THREE.Scene();
  scene.add(group);
  const resources = new Set();
  group.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    if (object.material) resources.add(object.material);
  });
  const counts = new Map();
  for (const resource of resources) resource.addEventListener('dispose', () => {
    counts.set(resource, (counts.get(resource) || 0) + 1);
  });
  disposeFieldEnvironmentGeometry(group);
  disposeFieldEnvironmentGeometry(group);
  assert.equal(scene.children.length, 0);
  assert.equal(group.children.length, 0);
  assert.equal(group.userData.disposed, true);
  for (const resource of resources) assert.equal(counts.get(resource), 1);
});
