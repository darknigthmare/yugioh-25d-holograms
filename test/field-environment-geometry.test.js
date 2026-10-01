import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  FIELD_ENVIRONMENT_GEOMETRY_FAMILIES,
  createFieldEnvironmentGeometry,
  disposeFieldEnvironmentGeometry,
  getFieldEnvironmentGeometrySignature,
  hasFieldEnvironmentLandmarkGeometry,
  FIELD_ENVIRONMENT_CARD_LANDMARKS,
  resolveFieldEnvironmentGeometryProfile
} from '../src/ui/FieldEnvironmentGeometry.js';
import {
  FIELD_ENVIRONMENT_REGISTRY,
  FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE,
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
      color: object.material.color.getHexString(),
      instanceNames: object.userData.instanceNames,
      instanceMatrices: object.isInstancedMesh ? Array.from(object.instanceMatrix.array) : null
    });
  });
  return result;
}

function forEachPrimitiveBounds(group, callback) {
  group.updateMatrixWorld(true);
  group.traverse(object => {
    if (!object.isMesh) return;
    if (!object.isInstancedMesh) {
      callback(new THREE.Box3().setFromObject(object), object.name, object);
      return;
    }
    object.geometry.computeBoundingBox();
    const matrix = new THREE.Matrix4();
    for (let index = 0; index < object.count; index += 1) {
      object.getMatrixAt(index, matrix);
      matrix.premultiply(object.matrixWorld);
      callback(object.geometry.boundingBox.clone().applyMatrix4(matrix),
        object.userData.instanceNames[index], object);
    }
  });
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
    assert.ok(group.userData.drawCallCount <= 18, `${family}: excessive draw calls`);
    forEachPrimitiveBounds(group, (bounds, name, object) => {
      assert.equal(bounds.intersectsBox(duelCorridor), false, `${family}/${name} obscures the duel`);
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
    assert.ok(group.userData.meshCount < 220, `${entry.name}: excessive draw count`);
    assert.ok(group.userData.drawCallCount <= 18, `${entry.name}: excessive draw calls`);
    assert.ok(group.userData.materialCount <= 10, `${entry.name}: excessive materials`);
    forEachPrimitiveBounds(group, (bounds, name) => {
      assert.equal(bounds.intersectsBox(corridor), false,
        `${entry.name}/${name} obscures the duel`);
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
    ['72283691', 'golden-castle', 'golden-castle-drawbridge-chain'],
    ['56433456', 'sky-sanctuary', 'sky-sanctuary-floating-stair'],
    ['2084239', 'reed-basin', 'wetlands-floating-lily-pad'],
    ['71645242', 'thorn-garden', 'rose-bloom'],
    ['33550694', 'fusion-gate', 'dimensional-ring'],
    ['59160188', 'shadow-prison', 'shadow-prison-bar']
  ]) {
    const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId(cardId));
    assert.equal(group.userData.landmark, landmark);
    assert.ok(hasFieldEnvironmentLandmarkGeometry(group, meshName), `${cardId}: ${meshName}`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('24 additional named terrains contain distinct physical props beyond the family palette', () => {
  for (const [cardId, landmark, meshName] of [
    ['92107604', 'runic-fountain', 'runic-fountain-spire'],
    ['13035077', 'dragonic-diagram', 'dragonic-elemental-seal'],
    ['47679935', 'fusion-meltdown', 'meltdown-opposing-energy-channel'],
    ['34487429', 'rainbow-ruins', 'rainbow-crystal-relic'],
    ['59054773', 'cyber-islands', 'cyber-arrival-island'],
    ['66399653', 'union-hangar', 'union-docking-cradle'],
    ['67237709', 'orbital-town', 'orbital-town-dome'],
    ['41418852', 'numeron-gate-network', 'numeron-gate-upright'],
    ['77103950', 'primeval-tidal-planet', 'perlereino-tidal-arch'],
    ['71832012', 'pressured-planet', 'wraitsoth-drill-tower'],
    ['89264428', 'seven-star-observatory', 'big-dipper-star'],
    ['5050644', 'aromatic-garden', 'aroma-flowering-herb'],
    ['68462976', 'hidden-spellcaster-village', 'spellcaster-cottage'],
    ['76136345', 'railway-turntable', 'switchyard-rotating-bridge'],
    ['50005218', 'airspace-launch-base', 'area-zero-launch-deck'],
    ['1127737', 'dimensional-shipwrecks', 'sargasso-broken-hull'],
    ['58793369', 'stellar-ritual-orbits', 'drytron-calibrated-orbit'],
    ['36668118', 'launch-silos', 'boot-sector-open-hatch'],
    ['95658967', 'ritual-light-basin', 'ritual-offering-plinth'],
    ['95477924', 'twin-salvation-gates', 'salvation-inscribed-stele'],
    ['1050355', 'nightmare-mirror', 'dream-mirror-night-spike'],
    ['74665651', 'radiant-mirror', 'dream-mirror-dawn-finial'],
    ['94585852', 'archfiend-court', 'pandemonium-empty-throne-seat'],
    ['56111151', 'waterfront-counter-tower', 'kyoutou-counter-reservoir']
  ]) {
    const environment = getFieldEnvironmentForCardId(cardId);
    const group = createFieldEnvironmentGeometry(THREE, environment);
    assert.equal(group.userData.landmark, landmark);
    assert.equal(group.userData.hasDedicatedLandmark, true);
    assert.ok(hasFieldEnvironmentLandmarkGeometry(group, meshName), `${environment.displayName}: ${meshName}`);
    assert.ok(group.children.every(object => object.isInstancedMesh), 'static props must be GPU batched');
    disposeFieldEnvironmentGeometry(group);
  }
  assert.equal(FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE.count, 45);
  assert.deepEqual(new Set(FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE.cardIds), new Set(Object.keys(FIELD_ENVIRONMENT_CARD_LANDMARKS)));
  assert.equal(getFieldEnvironmentForCardId('15259703'), null, 'Toon World is a Continuous Spell');
  assert.equal(getFieldEnvironmentForCardId('43175858').geometryProfile.landmark, 'storybook-castle');
});

test('replacing scenery disposes shared resources once and is safe to repeat', () => {
  const group = createFieldEnvironmentGeometry(THREE, FIELD_ENVIRONMENT_REGISTRY.forest);
  const scene = new THREE.Scene();
  scene.add(group);
  const resources = new Set();
  group.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    if (object.material) resources.add(object.material);
    if (object.isInstancedMesh) resources.add(object);
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
