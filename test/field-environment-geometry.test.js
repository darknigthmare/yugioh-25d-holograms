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
  FIELD_ENVIRONMENT_INSPECTED_ART_PROFILES,
  FIELD_ENVIRONMENT_GEOMETRY_BUDGET,
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

function findInstances(group, name) {
  const result = [];
  group.traverse(object => {
    if (!object.isInstancedMesh) return;
    object.userData.instanceNames.forEach((instanceName, index) => {
      if (instanceName !== name) return;
      const matrix = new THREE.Matrix4();
      object.getMatrixAt(index, matrix);
      result.push({ object, matrix });
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

test('all 339 resolved Field Spells retain dedicated illustration and geometry contracts', () => {
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
    assert.equal(environment.backdropUrl, `/environments/field-art/${entry.cardId}.jpg`);
    if (['12845564', '33700664', '88288421'].includes(entry.cardId)) {
      assert.equal(environment.fallbackBackdropUrl, `/environments/field-art/${entry.cardId}.jpg`);
    } else {
      assert.match(environment.fallbackBackdropUrl, new RegExp(`/field-spells/${entry.cardId}-`));
    }
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
    ['47355498', 'necrovalley-striated-sunset-gorge', 'necrovalley-two-distant-pyramids'],
    ['75041269', 'clock-prison-two-faced-turret', 'clock-prison-dial'],
    ['76375976', 'mine-entrance', 'mine-timber'],
    ['37694547', 'geartown-interlocking-gear-buildings', 'geartown-open-toothed-building-gear'],
    ['72283691', 'stromberg-golden-gables', 'stromberg-gold-palace'],
    ['72283691', 'stromberg-golden-gables', 'stromberg-broad-ascending-stair'],
    ['56433456', 'sky-sanctuary', 'sky-sanctuary-floating-stair'],
    ['2084239', 'wetlands-dense-pointed-grass-and-rain', 'wetlands-five-blade-grass-tuft'],
    ['71645242', 'black-thorn-framed-plinth', 'black-purple-climbing-rose'],
    ['33550694', 'fusion-violet-funnel-grid', 'fusion-lime-bent-floor-grid'],
    ['59160188', 'darkness-lair-cracked-road-and-crags', 'darkness-lair-broken-angular-road-slab']
  ]) {
    const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId(cardId));
    assert.equal(group.userData.landmark, landmark);
    assert.ok(hasFieldEnvironmentLandmarkGeometry(group, meshName), `${cardId}: ${meshName}`);
    disposeFieldEnvironmentGeometry(group);
  }
});

test('24 additional named terrains contain distinct physical props beyond the family palette', () => {
  for (const [cardId, landmark, meshName] of [
    ['92107604', 'runick-carved-basin-and-twin-water-curtains', 'runick-twin-falling-water-curtain'],
    ['13035077', 'dragonic-diagram', 'dragonic-elemental-seal'],
    ['47679935', 'fusion-meltdown', 'meltdown-opposing-energy-channel'],
    ['34487429', 'rainbow-ruins-curved-stone-stands', 'rainbow-ruins-curved-stone-terraces'],
    ['59054773', 'cyber-islands', 'cyber-arrival-island'],
    ['66399653', 'union-hangar-stacked-yellow-pods', 'union-hangar-yellow-connector-drum'],
    ['67237709', 'orbital-town', 'orbital-town-dome'],
    ['41418852', 'numeron-thorned-orange-network', 'numeron-angular-orange-network-rib'],
    ['77103950', 'perlereino-floating-tidal-discs-and-curtains', 'perlereino-floating-elliptical-water-disc'],
    ['71832012', 'pressured-planet', 'wraitsoth-drill-tower'],
    ['89264428', 'ursarctic-twin-deck-station-and-luminous-hubs', 'ursarctic-circular-side-hub'],
    ['5050644', 'aroma-wrought-arch-cottage', 'aroma-pointed-wrought-arch'],
    ['68462976', 'spellcaster-tree-village', 'village-twisted-trunk'],
    ['76136345', 'switchyard-radial-rails-and-turntable', 'switchyard-rusty-diameter-bridge'],
    ['50005218', 'airspace-launch-base', 'area-zero-launch-deck'],
    ['1127737', 'dimensional-shipwrecks', 'sargasso-broken-hull'],
    ['58793369', 'stellar-ritual-orbits', 'drytron-calibrated-orbit'],
    ['36668118', 'boot-sector-open-red-rotor', 'boot-open-toothed-rotor'],
    ['95658967', 'ritual-sanctuary-golden-display', 'ritual-sanctuary-shallow-golden-oval-plinth'],
    ['95477924', 'twin-salvation-gates', 'salvation-inscribed-stele'],
    ['1050355', 'terror-mirror-magenta-window-bridges', 'terror-mirror-magenta-lancet'],
    ['74665651', 'radiant-mirror', 'dream-mirror-dawn-finial'],
    ['94585852', 'pandemonium-grown-ribbed-arch-court', 'pandemonium-jagged-grown-oval-opening'],
    ['56111151', 'kyoutou-golden-observation-tower', 'kyoutou-wide-blue-observation-gallery']
  ]) {
    const environment = getFieldEnvironmentForCardId(cardId);
    const group = createFieldEnvironmentGeometry(THREE, environment);
    assert.equal(group.userData.landmark, landmark);
    assert.equal(group.userData.hasDedicatedLandmark, true);
    assert.ok(hasFieldEnvironmentLandmarkGeometry(group, meshName), `${environment.displayName}: ${meshName}`);
    assert.ok(group.children.every(object => object.isInstancedMesh), 'static props must be GPU batched');
    disposeFieldEnvironmentGeometry(group);
  }
  assert.equal(FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE.count, 155);
  assert.deepEqual(new Set(FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE.cardIds), new Set(Object.keys(FIELD_ENVIRONMENT_CARD_LANDMARKS)));
  assert.equal(getFieldEnvironmentForCardId('15259703'), null, 'Toon World is a Continuous Spell');
  assert.equal(getFieldEnvironmentForCardId('43175858').geometryProfile.landmark, 'storybook-castle');
});

test('24 inspected original illustrations produce their concrete motifs without divergent family monuments', () => {
  const expectations = [
    ['56594520', 'gaia-massive-buttress-oak', 'rock-spire'],
    ['82999629', 'umiiruka-vertical-observed-splash', 'coral-spire'],
    ['81777047', 'luminous-black-diagonal-ray', 'fluted-column'],
    ['18161786', 'plasma-cyan-forked-lightning', 'occult-monolith'],
    ['45778932', 'rising-diagonal-cloud-wisp', 'column-base'],
    ['19384334', 'molten-branching-lava-stream', 'volcanic-caldera'],
    ['81380218', 'chorus-pink-heaven-gate-post', 'fluted-column'],
    ['59197169', 'yami-concave-magenta-mist', 'occult-monolith'],
    ['22702055', 'umi-continuous-oblique-cobalt-swell', 'coral-spire'],
    ['87430998', 'forest-dark-conifer-row', 'exposed-root'],
    ['50913601', 'mountain-sharp-rear-seamed-peak', 'glacier-spire'],
    ['86318356', 'sogen-exposed-diagonal-fissure', 'weathered-rock'],
    ['23424603', 'wasteland-two-bare-trees', 'rock-spire'],
    ['48179391', 'orichalcos-six-point-star', 'dimensional-ring'],
    ['14001430', 'madolche-cream-piping-ring', 'castle-curtain-wall'],
    ['87624166', 'ancient-parallel-sunlight-shaft', 'exposed-root'],
    ['84171830', 'monarch-domain-tall-chamber-column', 'castle-crenellation'],
    ['33407125', 'labrynth-central-blue-pointed-roof', 'castle-curtain-wall'],
    ['10080320', 'jurassic-hanging-canopy-vine', 'exposed-root'],
    ['16625614', 'dark-sanctuary-long-needle-spire', 'occult-monolith'],
    ['61583217', 'cynet-cyan-hexagonal-lattice', 'data-node'],
    ['2084239', 'wetlands-diagonal-rain-streak', 'wetlands-floating-lily-pad'],
    ['56433456', 'sky-sanctuary-orb-monument', 'sky-sanctuary-radiant-arch'],
    ['63035430', 'skyscraper-crossed-searchlight', 'tower-roof']
  ];
  for (const [cardId, motif, forbidden] of expectations) {
    const environment = getFieldEnvironmentForCardId(cardId);
    const profile = environment.geometryProfile.inspectedArt;
    assert.equal(profile.sourceUrl, environment.referenceArt.sourceUrl);
    assert.equal(Object.isFrozen(profile.palette), true);
    assert.ok(profile.motifs.length >= 3);
    const group = createFieldEnvironmentGeometry(THREE, environment);
    assert.equal(group.userData.fidelity, 'reference-informed-geometry');
    assert.ok(hasFieldEnvironmentLandmarkGeometry(group, motif), `${cardId}: ${motif}`);
    assert.equal(hasFieldEnvironmentLandmarkGeometry(group, forbidden), false, `${cardId}: divergent ${forbidden}`);
    const sourceBounds = new THREE.Box3();
    forEachPrimitiveBounds(group, bounds => sourceBounds.union(bounds));
    for (const [index, axis] of ['x', 'y', 'z'].entries()) {
      assert.ok(Math.abs(group.userData.bounds.min[index] - sourceBounds.min[axis]) < 0.00002);
      assert.ok(Math.abs(group.userData.bounds.max[index] - sourceBounds.max[axis]) < 0.00002);
    }
    disposeFieldEnvironmentGeometry(group);
  }
  assert.equal(FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE.inspectedReferenceArtCount, 141);
  assert.deepEqual(new Set(FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE.inspectedReferenceCardIds), new Set(Object.keys(FIELD_ENVIRONMENT_INSPECTED_ART_PROFILES)));
  assert.equal(FIELD_SPELL_GEOMETRY_LANDMARK_COVERAGE.budget, FIELD_ENVIRONMENT_GEOMETRY_BUDGET);
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

test('Molten winding lava and connected branches clear the actual irregular caldera by their entire tube radius', () => {
  const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId('19384334'));
  const [{ object: coneBatch, matrix: coneMatrix }] = findInstances(group, 'molten-wide-black-volcano');
  const cone = new THREE.Mesh(coneBatch.geometry, coneBatch.material);
  cone.matrixAutoUpdate = false;
  cone.matrix.copy(coneMatrix);
  cone.updateMatrixWorld(true);
  assert.equal(cone.geometry.parameters.radialSegments, 64);
  const vertices = cone.geometry.attributes.position;
  const rimHeights = Array.from({ length: 64 }, (_, i) => vertices.getY(i));
  assert.ok(Math.max(...rimHeights) - Math.min(...rimHeights) > 0.5, 'crater rim is uneven rather than a cone apex');
  assert.ok(vertices.getX(0) ** 2 + (vertices.getZ(0) + 34) ** 2 > 0.5, 'summit opens around a real crater');
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(cone.matrixWorld);
  const ray = new THREE.Raycaster();
  const primary = findInstances(group, 'molten-branching-lava-stream');
  const branches = findInstances(group, 'molten-lava-side-branch');
  assert.equal(primary.length, 96, 'eight meandering channels each contain twelve joined segments');
  assert.equal(branches.length, 48, 'each primary channel has a curved six segment branch');
  const paths = [...primary, ...branches].map(({ matrix }) => {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, quaternion, scale);
    return {
      start: new THREE.Vector3(0, -0.5, 0).applyMatrix4(matrix),
      end: new THREE.Vector3(0, 0.5, 0).applyMatrix4(matrix),
      radius: Math.max(scale.x, scale.z)
    };
  });
  for (const path of paths) {
    for (let sample = 0; sample <= 16; sample += 1) {
      const point = path.start.clone().lerp(path.end, sample / 16);
      ray.set(new THREE.Vector3(point.x, 30, point.z), new THREE.Vector3(0, -1, 0));
      const [hit] = ray.intersectObject(cone);
      assert.ok(hit, 'every lava sample stays above a real volcano face');
      const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      const clearance = point.clone().sub(hit.point).dot(normal);
      assert.ok(clearance > path.radius + 0.035,
        `tube at ${point.toArray()} clips volcano: clearance=${clearance}, radius=${path.radius}`);
    }
  }
  for (let channel = 0; channel < 8; channel += 1) {
    const main = paths.slice(channel * 12, (channel + 1) * 12);
    const branch = paths.slice(primary.length + channel * 6, primary.length + (channel + 1) * 6);
    for (const route of [main, branch]) for (let j = 1; j < route.length; j += 1) {
      assert.ok(route[j - 1].end.distanceTo(route[j].start) < 0.00001, 'segments form a continuous visible route');
    }
    assert.ok(main[4].start.distanceTo(branch[0].start) < 0.00001, 'branch joins the primary channel');
    const straight = new THREE.Line3(main[0].start, main.at(-1).end);
    const deviation = Math.max(...main.map(segment => straight.closestPointToPoint(segment.start, true, new THREE.Vector3()).distanceTo(segment.start)));
    assert.ok(deviation > 0.2, 'lava channels wind across the folded slope');
  }
  disposeFieldEnvironmentGeometry(group);
});

test('Plasma has a continuous inward spiral, Mountain has striated asymmetric reliefs, and Labrynth has broad curved ramps', () => {
  const plasma = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId('18161786'));
  const [vortex] = findInstances(plasma, 'plasma-continuous-purple-vortex');
  const points = vortex.object.geometry.userData.continuousCurve;
  let turn = 0;
  for (let i = 1; i < points.length; i += 1) {
    const angle = point => Math.atan2((point[1] - 14.5) / 0.65, point[0]);
    const delta = angle(points[i]) - angle(points[i - 1]);
    turn += Math.atan2(Math.sin(delta), Math.cos(delta));
    assert.ok(new THREE.Vector3(...points[i]).distanceTo(new THREE.Vector3(...points[i - 1])) < 1.5, 'cloud strand stays continuous');
  }
  assert.ok(turn > Math.PI * 4, 'the cloud coils more than two complete turns into its core');
  assert.equal(hasFieldEnvironmentLandmarkGeometry(plasma, 'plasma-purple-spiral-cloud'), false, 'disconnected puff ring was removed');
  disposeFieldEnvironmentGeometry(plasma);

  const mountain = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId('50913601'));
  const [right] = findInstances(mountain, 'mountain-sharp-rear-seamed-peak');
  const [left] = findInstances(mountain, 'mountain-left-fractured-ridge');
  assert.ok(right.object.geometry.boundingBox.max.y > left.object.geometry.boundingBox.max.y * 1.7, 'right massif remains much taller');
  let totalFolds = 0;
  for (const { object } of [right, left]) {
    const positions = object.geometry.attributes.position;
    const isRight = object === right.object;
    const [cx, cz, rx, rz] = isRight ? [9, -37, 13, 7] : [-15, -30, 8, 5];
    const radii = Array.from({ length: 112 }, (_, i) => {
      const index = 14 * 113 + i;
      return Math.hypot((positions.getX(index) - cx) / rx, (positions.getZ(index) - cz) / rz);
    });
    const folds = radii.filter((r, i) => r > radii[(i + 111) % 112] && r > radii[(i + 1) % 112]).length;
    assert.ok(folds >= 40, 'surface vertices form at least forty real ridge folds per massif');
    assert.ok(Math.max(...radii) - Math.min(...radii) > .15, 'stone silhouette has visible angular relief');
    totalFolds += folds;
    assert.ok(object.geometry.attributes.color, 'stone retains differentiated ridge and valley tones');
  }
  assert.ok(totalFolds >= 80, 'both massifs preserve the previous striation density');
  disposeFieldEnvironmentGeometry(mountain);

  const labrynth = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId('33407125'));
  const ramps = findInstances(labrynth, 'labrynth-broad-white-ascending-spiral-ramp');
  assert.equal(ramps.length, 2);
  for (const { object } of ramps) {
    const route = object.geometry.userData.continuousCurve.map(point => new THREE.Vector3(...point));
    const line = new THREE.Line3(route[0], route.at(-1));
    assert.ok(Math.max(...route.map(point => line.closestPointToPoint(point, true, new THREE.Vector3()).distanceTo(point))) > 5, 'walkway curls around the palace');
    assert.ok(route.at(-1).y - route[0].y > 5, 'walkway climbs as it curves');
    const box = object.geometry.boundingBox;
    assert.ok(box.max.z - box.min.z > 9, 'walkway has a broad arc in depth');
  }
  assert.equal(hasFieldEnvironmentLandmarkGeometry(labrynth, 'labrynth-elevated-palace-ramp'), false, 'straight pipe ramps were removed');
  disposeFieldEnvironmentGeometry(labrynth);
});

test('reference refinements keep valid shared buffers and release custom shapes, materials and instances once', () => {
  for (const cardId of ['18161786', '50913601', '33407125', '19384334', '2084239', '56433456', '63035430']) {
    const group = createFieldEnvironmentGeometry(THREE, getFieldEnvironmentForCardId(cardId));
    const resources = new Set();
    group.traverse(object => {
      if (!object.isMesh) return;
      assert.equal(object.material.map, null, 'no card textures are attached to terrain props');
      for (const attribute of Object.values(object.geometry.attributes)) {
        assert.ok(Array.from(attribute.array).every(Number.isFinite), `${cardId}: valid custom attribute`);
        assert.equal(attribute.array.length, attribute.count * attribute.itemSize);
      }
      if (object.geometry.index) {
        assert.ok(Array.from(object.geometry.index.array).every(index => index < object.geometry.attributes.position.count), `${cardId}: valid mesh indices`);
      } else assert.equal(object.geometry.attributes.position.count % 3, 0, `${cardId}: valid unindexed triangles`);
      resources.add(object.geometry); resources.add(object.material); resources.add(object);
    });
    if (cardId === '2084239') {
      const grasses = findInstances(group, 'wetlands-five-blade-grass-tuft');
      assert.equal(grasses.length, 120);
      assert.ok(grasses.every(({ object }) => object.geometry.userData.grassBladeCount === 5), '600 bent leaves share only three grass draws');
      assert.equal(hasFieldEnvironmentLandmarkGeometry(group, 'basin-carved-rim'), false, 'no masonry basins in a rain soaked grassland');
      assert.equal(hasFieldEnvironmentLandmarkGeometry(group, 'tree-trunk'), false, 'source grassland has no foreground forest');
    }
    const counts = new Map();
    for (const resource of resources) resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1));
    disposeFieldEnvironmentGeometry(group); disposeFieldEnvironmentGeometry(group);
    for (const resource of resources) assert.equal(counts.get(resource), 1, `${cardId}: resource released exactly once`);
  }
});
