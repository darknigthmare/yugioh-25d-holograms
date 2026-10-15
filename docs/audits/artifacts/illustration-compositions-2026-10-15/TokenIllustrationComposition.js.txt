import * as THREE from 'three';
import { createHologramMonsterModel } from './HologramMonsterModels.js';
import { HOLOGRAM_JOINTS } from './HologramPoseAnimation.js';
import { createTokenIllustrationEffects } from './TokenIllustrationEffects.js';

// These are layouts of four inspected printed illustrations, not native cards.
// x points right, y points up and z points towards the illustration camera.
// The square crop includes only the parts visible in the printed artwork.
const ART_FRAME = Object.freeze({ left: -2.1, right: 2.1, bottom: 0, top: 4.2 });
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const DEFINITIONS = freeze({
  'commemorative:YGLD-ENTKN': { avatarId: 'atem', actorHead: [.0546, 2.6334, .72], actorScale: 1.02, subjects: ['Yami Yugi'] },
  'commemorative:LDK2-ENT01': { avatarId: 'atem', actorHead: [.819, 2.1504, .85], actorScale: 1.30,
    monster: { code: '46986414', name: 'Dark Magician', head: [-1.3818, 2.4864, -.35], scale: 1.68, rotation: [.04, -.12, -.06] }, subjects: ['Yami Yugi', 'Dark Magician'] },
  'commemorative:LDK2-ENT02': { avatarId: 'kaiba', actorHead: [.4368, 2.6544, .85], actorScale: 1.20,
    monster: { code: '89631139', name: 'Blue-Eyes White Dragon', head: [-1.3482, 3.0702, -.55], scale: 2.20, rotation: [0, -.65, .128] }, subjects: ['Seto Kaiba', 'Blue-Eyes White Dragon'] },
  'commemorative:LDK2-ENT03': { avatarId: 'joey', actorHead: [.6048, 2.5074, .85], actorScale: 1.20,
    monster: { code: '74677422', name: 'Red-Eyes Black Dragon', head: [-.945, 2.6334, -.55], scale: 1.68, rotation: [0, -.05, .15] }, subjects: ['Joey Wheeler', 'Red-Eyes Black Dragon'] }
});

export function getTokenIllustrationCompositionDefinition(profile) {
  const definition = typeof profile?.presentationId === 'string' && Object.hasOwn(DEFINITIONS, profile.presentationId) ? DEFINITIONS[profile.presentationId] : null;
  if (!definition || profile.kind !== 'decorative' || profile.modelKind !== 'duelist-avatar'
    || profile.avatarId !== definition.avatarId || profile.cardId != null || profile.tokenAnatomy != null) return null;
  return definition;
}

function disposeMonster(model) {
  model.userData?.poseRig?.dispose();
  const geometries = new Set(), materials = new Set();
  model.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  model.removeFromParent();
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  model.clear();
}

/** The Atlas owns this instance. Duel instances keep their projection base. */
export function removeAtlasTokenIllustrationPedestal(model) {
  model.traverse(mesh => {
    const original = mesh.geometry;
    const joints = original?.getAttribute('hologramJoint');
    if (!joints) return;
    const keep = [];
    for (let i = 0; i < joints.count; i += 3) if (joints.getX(i) !== HOLOGRAM_JOINTS.BASE) keep.push(i, i + 1, i + 2);
    if (keep.length === joints.count) return;
    const geometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(original.attributes)) {
      const values = new attribute.array.constructor(keep.length * attribute.itemSize);
      keep.forEach((from, to) => {
        for (let component = 0; component < attribute.itemSize; component++) values[to * attribute.itemSize + component] = attribute.array[from * attribute.itemSize + component];
      });
      geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized));
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    mesh.geometry = geometry;
    original.dispose();
  });
  model.userData.partNames = model.userData.partNames.filter(name => !name.startsWith('projection-'));
  model.userData.triangleCount = model.children.reduce((count, mesh) => count + (mesh.geometry?.attributes.position.count || 0) / 3, 0);
  return model;
}

/** Bake the illustrated staff/arm pose once; no frame-time vertex uploads. */
function poseIllustratedMonster(model, magician) {
  const pivot = new THREE.Vector3(.43, 2.41, 0);
  const turn = new THREE.Matrix4().makeRotationZ(-.24);
  const normalTurn = new THREE.Matrix3().setFromMatrix4(turn);
  const staffTurn = new THREE.Matrix4().makeRotationZ(1.02);
  const staffNormalTurn = new THREE.Matrix3().setFromMatrix4(staffTurn);
  const staffGrip = new THREE.Vector3(.89, 1.68, .48);
  const posedGrip = staffGrip.clone().sub(pivot).applyMatrix4(turn).add(pivot);
  const staffColors = ['#178866', '#7ddf9b', '#b1e7b6', '#c5e767'].map(color => new THREE.Color(color));
  const point = new THREE.Vector3();
  const neckPivot = new THREE.Vector3(0, 2.55, .02);
  const headRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(model.userData.profile.id === 'red-eyes' ? .23 : 1.226, -.10, 0));
  const neckRotation = new THREE.Quaternion();
  function bendDragonHead(value, normalOnly = false, blend = 1) {
    neckRotation.identity().slerp(headRotation, blend);
    if (!normalOnly) value.sub(neckPivot);
    value.applyQuaternion(neckRotation);
    if (!normalOnly) value.add(neckPivot);
    return value;
  }
  model.traverse(mesh => {
    if (!mesh.geometry) return;
    const original = mesh.geometry;
    const joints = original.getAttribute('hologramJoint');
    // The duel pedestal is not present on these prints. Remove its triangles,
    // rather than retaining a glowing platform behind the portrait crop.
    const keep = [];
    for (let i = 0; i < joints.count; i += 3) if (joints.getX(i) !== HOLOGRAM_JOINTS.BASE) keep.push(i, i + 1, i + 2);
    const geometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(original.attributes)) {
      const array = new attribute.array.constructor(keep.length * attribute.itemSize);
      keep.forEach((source, destination) => {
        for (let component = 0; component < attribute.itemSize; component++) array[destination * attribute.itemSize + component] = attribute.array[source * attribute.itemSize + component];
      });
      geometry.setAttribute(name, new THREE.BufferAttribute(array, attribute.itemSize, attribute.normalized));
    }
    if (magician) {
      const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
      const posedJoints = geometry.getAttribute('hologramJoint');
      const colors = geometry.getAttribute('color');
      for (let i = 0; i < positions.count; i++) {
        if (posedJoints.getX(i) !== HOLOGRAM_JOINTS.STAFF) continue;
        const isStaff = staffColors.some(color => Math.abs(colors.getX(i) - color.r) < 1e-5
          && Math.abs(colors.getY(i) - color.g) < 1e-5 && Math.abs(colors.getZ(i) - color.b) < 1e-5);
        if (isStaff) point.fromBufferAttribute(positions, i).sub(staffGrip).applyMatrix4(staffTurn).add(posedGrip);
        else point.fromBufferAttribute(positions, i).sub(pivot).applyMatrix4(turn).add(pivot);
        positions.setXYZ(i, point.x, point.y, point.z);
        point.fromBufferAttribute(normals, i).applyMatrix3(isStaff ? staffNormalTurn : normalTurn).normalize();
        normals.setXYZ(i, point.x, point.y, point.z);
      }
    } else {
      const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
      const posedJoints = geometry.getAttribute('hologramJoint');
      for (let i = 0; i < positions.count; i++) {
        if (![HOLOGRAM_JOINTS.BODY, HOLOGRAM_JOINTS.JAW].includes(posedJoints.getX(i))) continue;
        const blend = THREE.MathUtils.smoothstep(positions.getY(i), 2.35, 2.9);
        if (!blend) continue;
        bendDragonHead(point.fromBufferAttribute(positions, i), false, blend);
        positions.setXYZ(i, point.x, point.y, point.z);
        bendDragonHead(point.fromBufferAttribute(normals, i), true, blend).normalize();
        normals.setXYZ(i, point.x, point.y, point.z);
      }
    }
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    mesh.geometry = geometry;
    original.dispose();
  });
  model.userData.partNames = model.userData.partNames.filter(name => !name.startsWith('projection-'));
  model.userData.triangleCount = model.children.reduce((count, mesh) => count + (mesh.geometry?.attributes.position.count || 0) / 3, 0);
  model.userData.illustrationPose = magician ? 'diagonal-staff-behind-duelist' : 'three-quarter-descending-dragon';
  const head = magician ? new THREE.Vector3(0, 2.91, .07) : bendDragonHead(new THREE.Vector3(0, 3.16, .38));
  const mouth = magician ? null : bendDragonHead(new THREE.Vector3(0, 2.975, model.userData.profile.id === 'blue-eyes' ? 1.05 : 1.16));
  const staffCrown = magician ? new THREE.Vector3(.91, 3.35, .595).sub(staffGrip).applyMatrix4(staffTurn).add(posedGrip) : null;
  model.userData.illustrationLandmarks = freeze({ head: head.toArray(), mouth: mouth?.toArray() || null,
    staffGrip: magician ? posedGrip.toArray() : null, staffCrown: staffCrown?.toArray() || null });
}

function locate(group, localAnchor, worldAnchor, scale, rotation = [0, 0, 0]) {
  group.scale.multiplyScalar(scale);
  group.rotation.set(...rotation);
  group.updateMatrixWorld(true);
  const anchor = new THREE.Vector3(...localAnchor).applyMatrix4(group.matrixWorld);
  group.position.add(new THREE.Vector3(...worldAnchor).sub(anchor));
  group.updateMatrixWorld(true);
}

/**
 * Complete printed scene. The caller supplies the lazily imported human actor.
 * No scheduler, animation timer or renderer is created by this factory.
 */
export function createTokenIllustrationComposition(profile, { createDuelistIllustrationActor, reducedMotion = true } = {}) {
  const definition = getTokenIllustrationCompositionDefinition(profile);
  if (!definition || typeof createDuelistIllustrationActor !== 'function') throw new Error('Verified illustration actors are required');
  const group = new THREE.Group();
  group.name = `token-illustration-${profile.physicalSetCode}`;
  group.userData.avatarId = definition.avatarId;
  group.userData.presentationId = profile.presentationId;
  group.userData.modelKind = 'illustration-composition';
  group.userData.illustratedCharacters = [...definition.subjects];
  group.userData.fidelity = 'procedural-illustration-interpretation';
  const subjects = [];
  let actor, monster, effects, disposed = false;
  try {
    actor = createDuelistIllustrationActor(definition.avatarId, { presentationId: profile.presentationId, reducedMotion: true, framing: 'printed-portrait' });
    if (!actor?.group) throw new Error('Illustration actor has no group');
    const head = actor.landmarks?.head || actor.group.userData.illustrationLandmarks?.head || [0, 5, .15];
    locate(actor.group, head, definition.actorHead, definition.actorScale);
    actor.group.userData.illustrationSubject = definition.subjects[0];
    group.add(actor.group);
    subjects.push(Object.freeze({ name: definition.subjects[0], role: 'duelist', group: actor.group }));
    if (definition.monster) {
      const layout = definition.monster;
      monster = createHologramMonsterModel({ id: layout.code, name: layout.name });
      poseIllustratedMonster(monster, layout.code === '46986414');
      locate(monster, monster.userData.illustrationLandmarks.head, layout.head, layout.scale, layout.rotation);
      monster.userData.illustrationSubject = layout.name;
      group.add(monster);
      subjects.push(Object.freeze({ name: layout.name, role: 'monster', code: layout.code, group: monster }));
    }
    const chargePosition = monster && definition.monster.code !== '46986414'
      ? monster.localToWorld(new THREE.Vector3(...monster.userData.illustrationLandmarks.mouth)).toArray() : undefined;
    effects = createTokenIllustrationEffects(profile.presentationId, { reducedMotion, chargePosition, frameSize: ART_FRAME.top - ART_FRAME.bottom });
    if (effects?.group) group.add(effects.group);
    // Clip to the inspected square print crop. This is scoped to this scene's
    // owned materials and never alters any duel monster or avatar instance.
    const clippingPlanes = [
      new THREE.Plane(new THREE.Vector3(1, 0, 0), -ART_FRAME.left),
      new THREE.Plane(new THREE.Vector3(-1, 0, 0), ART_FRAME.right),
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -ART_FRAME.bottom),
      new THREE.Plane(new THREE.Vector3(0, -1, 0), ART_FRAME.top)
    ];
    group.traverse(object => {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) material.clippingPlanes = clippingPlanes;
    });
    group.userData.subjectCount = subjects.length;
    group.updateMatrixWorld(true);
  } catch (error) {
    effects?.dispose();
    if (monster) disposeMonster(monster);
    actor?.dispose();
    group.clear();
    throw error;
  }
  function resetPose() {
    if (disposed) return false;
    actor.resetPose();
    monster?.userData?.poseRig?.reset();
    effects?.reset();
    group.rotation.set(0, 0, 0);
    group.updateMatrixWorld(true);
    return true;
  }
  function dispose() {
    if (disposed) return false;
    disposed = true;
    effects?.dispose();
    if (monster) disposeMonster(monster);
    actor.dispose();
    group.removeFromParent(); group.clear();
    return true;
  }
  return { group, avatarId: definition.avatarId, subjects: Object.freeze(subjects), framing: ART_FRAME,
    update(elapsedSeconds) { return !disposed && (effects?.update(elapsedSeconds) || false); },
    resetPose, dispose, get disposed() { return disposed; } };
}
