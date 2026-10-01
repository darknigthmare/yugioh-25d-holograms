import * as THREE from 'three';

const JOINT_NAMES = Object.freeze({
  BODY: 0, LEFT_WING: 1, RIGHT_WING: 2, STAFF: 3, JAW: 4, WEAPON: 5, BASE: 6,
  LEFT_PINCER: 7, RIGHT_PINCER: 8
});
export const HOLOGRAM_JOINTS = JOINT_NAMES;

/** Used while building a model; the joint attribute survives material merging. */
export function resolveHologramPartJoint(name) {
  if (/^projection-|^defense-/.test(name)) return JOINT_NAMES.BASE;
  if (/^wing--1-/.test(name)) return JOINT_NAMES.LEFT_WING;
  if (/^wing-1-/.test(name)) return JOINT_NAMES.RIGHT_WING;
  if (/^staff|^mage-arm-1|^mage-glove-1|^faith-hand-1|^faith-orb/.test(name)) return JOINT_NAMES.STAFF;
  if (/^pincer-.*--1(?:-|$)/.test(name)) return JOINT_NAMES.LEFT_PINCER;
  if (/^pincer-.*-1(?:-|$)/.test(name)) return JOINT_NAMES.RIGHT_PINCER;
  if (/^jaw-/.test(name)) return JOINT_NAMES.JAW;
  if (/^sword|^gauntlet-1|^hand-1|^upper-arm-1/.test(name)) return JOINT_NAMES.WEAPON;
  return JOINT_NAMES.BODY;
}

const RIG_SHADER = /* glsl */`
attribute float hologramJoint;
uniform vec4 uHologramPose;
uniform vec4 uHologramLife;
uniform float uHologramWingY;
mat3 hologramRotateX(float angle) {
  float c = cos(angle), s = sin(angle);
  return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c);
}
mat3 hologramRotateZ(float angle) {
  float c = cos(angle), s = sin(angle);
  return mat3(c,s,0.0, -s,c,0.0, 0.0,0.0,1.0);
}
vec3 hologramMove(vec3 value, bool normalOnly) {
  if (hologramJoint > 5.5 && hologramJoint < 6.5) return value;
  vec3 pivot = vec3(0.0);
  mat3 jointRotation = mat3(1.0);
  if (hologramJoint > 0.5 && hologramJoint < 2.5) {
    float side = hologramJoint < 1.5 ? -1.0 : 1.0;
    pivot = vec3(side * 0.28, uHologramWingY - 0.3, -0.2);
    jointRotation = hologramRotateZ(side * uHologramPose.x);
  } else if (hologramJoint > 2.5 && hologramJoint < 3.5) {
    pivot = vec3(0.43, 2.41, 0.0);
    jointRotation = hologramRotateX(uHologramPose.y);
  } else if (hologramJoint > 3.5 && hologramJoint < 4.5) {
    pivot = vec3(0.0, 2.91, 0.56);
    jointRotation = hologramRotateX(uHologramPose.w);
  } else if (hologramJoint > 4.5 && hologramJoint < 5.5) {
    pivot = vec3(0.67, 2.37, 0.0);
    jointRotation = hologramRotateX(uHologramPose.y);
  } else if (hologramJoint > 6.5 && hologramJoint < 8.5) {
    float side = hologramJoint < 7.5 ? -1.0 : 1.0;
    pivot = vec3(side * 0.41, 1.96, 0.06);
    jointRotation = hologramRotateZ(side * uHologramPose.y);
  }
  mat3 bodyRotation = hologramRotateX(uHologramPose.z);
  if (normalOnly) return bodyRotation * jointRotation * value;
  value = jointRotation * (value - pivot) + pivot;
  vec3 center = vec3(0.0, 0.1, 0.0);
  value = bodyRotation * (value - center) * uHologramLife.y + center;
  value += vec3(uHologramLife.w, uHologramLife.x, uHologramLife.z);
  return value;
}
`;

/**
 * GPU deformation adds no meshes, geometry uploads or animation timers.
 * The same deformation is applied to visible geometry, normals and shadows.
 */
export function installHologramPoseRig(model, profile = {}) {
  const pose = { value: new THREE.Vector4(0, 0, 0, 0) };
  const life = { value: new THREE.Vector4(0, 1, 0, 0) };
  const wingY = { value: profile.family === 'fiend' ? 2.43 : profile.family === 'avian' ? 2.15 : 2.55 };
  let disposed = false;
  let generation = 0;
  function bind(material) {
    material.onBeforeCompile = shader => {
      shader.uniforms.uHologramPose = pose;
      shader.uniforms.uHologramLife = life;
      shader.uniforms.uHologramWingY = wingY;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${RIG_SHADER}`)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = hologramMove(transformed, false);')
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = hologramMove(objectNormal, true);');
    };
    material.customProgramCacheKey = () => 'hologram-pose-v1';
    return material;
  }
  const depth = bind(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
  const distance = bind(new THREE.MeshDistanceMaterial());
  const materialDisposal = () => dispose();
  const materials = new Set();
  model.traverse(object => {
    if (!object.isMesh) return;
    bind(object.material);
    materials.add(object.material);
    if (object.castShadow) {
      object.customDepthMaterial = depth;
      object.customDistanceMaterial = distance;
    }
    // GPU pose displacement must not be culled using the undeformed bounds.
    object.geometry.computeBoundingSphere();
    object.geometry.boundingSphere.radius += 1.2;
  });
  materials.forEach(material => material.addEventListener('dispose', materialDisposal));
  function reset() {
    pose.value.set(0, 0, 0, 0);
    life.value.set(0, 1, 0, 0);
  }
  function dispose() {
    if (disposed) return false;
    disposed = true;
    generation += 1;
    reset();
    materials.forEach(material => material.removeEventListener('dispose', materialDisposal));
    depth.dispose();
    distance.dispose();
    return true;
  }
  const rig = {
    pose, life, profile, reset, dispose,
    begin() { if (disposed) return null; generation += 1; reset(); return generation; },
    isCurrent(token) { return !disposed && token === generation; },
    get disposed() { return disposed; }
  };
  model.userData.poseRig = rig;
  return rig;
}

/**
 * A scene-owned, finite action animation. Caller schedules frames and can pause
 * its clock together with combat effects; no idle animation is installed.
 */
export function createHologramPoseAnimation(model, options = {}) {
  const rig = model?.userData?.poseRig;
  const reduced = options.reducedMotion === true;
  const token = rig?.begin() ?? null;
  const kind = options.kind || 'attack';
  const duration = Math.min(1500, Math.max(180, Number(options.duration) || (kind === 'summon' ? 900 : kind === 'recoil' ? 450 : 780)));
  let disposed = false;
  function update(progress) {
    if (disposed || !rig?.isCurrent(token) || reduced) return false;
    const p = Math.min(1, Math.max(0, Number(progress) || 0));
    if (p >= 1) { rig.reset(); return false; }
    const envelope = Math.sin(p * Math.PI);
    const pose = rig.pose.value;
    const life = rig.life.value;
    pose.set(0, 0, 0, 0);
    life.set(0, 1, 0, 0);
    if (kind === 'summon') {
      const ease = 1 - (1 - p) ** 3;
      life.set(-0.7 * (1 - ease), 0.3 + ease * 0.7, 0, 0);
      pose.x = Math.sin(p * Math.PI * 2) * 0.2 * (1 - p);
    } else if (kind === 'recoil' || kind === 'damage') {
      const hit = Math.sin(Math.min(1, p * 1.8) * Math.PI);
      life.z = -hit * 0.28;
      life.w = Math.sin(p * Math.PI * 5) * 0.045 * (1 - p);
      pose.z = hit * 0.13;
      pose.x = hit * -0.16;
    } else if (kind === 'casting' || kind === 'activate' || kind === 'shield') {
      pose.y = -envelope * 0.38;
      pose.x = Math.sin(p * Math.PI * 2) * 0.16 * envelope;
      pose.z = envelope * -0.05;
      life.x = envelope * 0.055;
    } else {
      const strike = Math.sin(Math.min(1, p / 0.72) * Math.PI);
      pose.x = Math.sin(p * Math.PI * 2) * 0.32 * envelope;
      pose.y = -strike * (rig.profile.family === 'warrior' ? 0.85 : 0.32);
      pose.z = -strike * 0.1;
      pose.w = strike * 0.35;
      life.z = strike * 0.36;
    }
    return true;
  }
  function dispose() {
    if (disposed) return false;
    disposed = true;
    if (rig?.isCurrent(token)) rig.reset();
    return true;
  }
  if (!reduced) update(0);
  return { duration, kind, update, dispose };
}
