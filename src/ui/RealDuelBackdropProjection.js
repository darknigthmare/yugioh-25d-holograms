import { Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { resolveRealDuelCameraPose } from './RealDuelCameraPresets.js';

const BACKDROP_DISTANCE_BEHIND_BOARD = 16;

/**
 * A distant scenic image, separate from the arena's horizontal ground.
 *
 * The painting keeps its original orientation: buildings and sky are never
 * flattened onto a playmat. Its plane stays in the reference player view's
 * world orientation while the live duel camera moves around the arena.
 */
export function resolveRealDuelBackdropPlane(width, height, fit = 'cover') {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) {
    throw new RangeError('Backdrop viewport dimensions must be positive.');
  }
  const pose = resolveRealDuelCameraPose('player', width);
  const referenceCamera = new PerspectiveCamera(pose.fov, width / height, 0.1, 120);
  referenceCamera.position.set(...pose.position);
  const target = new Vector3(...pose.target);
  referenceCamera.lookAt(target);
  referenceCamera.updateMatrixWorld();

  const distance = referenceCamera.position.distanceTo(target)
    + BACKDROP_DISTANCE_BEHIND_BOARD;
  // Full reference illustrations retain their original aspect and complete
  // composition. Scenic wide backdrops overscan to fill diagonal views too.
  const framing = fit === 'contain' ? 0.94 : 1.8;
  const worldHeight = 2 * distance * Math.tan(pose.fov * Math.PI / 360) * framing;
  const scale = worldHeight / height;
  const worldMatrix = referenceCamera.matrixWorld.clone()
    .multiply(new Matrix4().makeTranslation(0, 0, -distance))
    .multiply(new Matrix4().makeScale(scale, -scale, 1))
    .multiply(new Matrix4().makeTranslation(-width / 2, -height / 2, 0));

  return { width, height, worldMatrix };
}

/** Exact WebGL clip-to-screen projection expressed as a CSS projective matrix. */
export function createRealDuelBackdropProjection(camera, width, height, fit = 'cover') {
  if (!camera?.isPerspectiveCamera || !camera.projectionMatrix?.isMatrix4
    || !camera.matrixWorldInverse?.isMatrix4) return null;
  const plane = resolveRealDuelBackdropPlane(width, height, fit);
  camera.updateMatrixWorld?.();
  const viewport = new Matrix4().set(
    width / 2, 0, 0, width / 2,
    0, -height / 2, 0, height / 2,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
  const matrix = viewport.multiply(camera.projectionMatrix)
    .multiply(camera.matrixWorldInverse).multiply(plane.worldMatrix);
  // A common homogeneous divisor leaves the projection unchanged and keeps
  // CSS coefficients near one even in the distant scene.
  const e = matrix.elements;
  const centerW = e[3] * width / 2 + e[7] * height / 2 + e[15];
  if (!Number.isFinite(centerW) || centerW <= 0) return null;
  matrix.multiplyScalar(1 / centerW);
  // This is a painted plane in a DOM stacking layer, not CSS depth geometry.
  // Embed its exact X/Y/W homography with an identity local Z axis. Retaining
  // WebGL clip Z here would make browsers misclassify the painting's face.
  matrix.elements[2] = matrix.elements[6] = matrix.elements[14] = 0;
  matrix.elements[8] = matrix.elements[9] = matrix.elements[11] = 0;
  matrix.elements[10] = 1;
  if (!matrix.elements.every(Number.isFinite)) return null;
  return {
    ...plane,
    matrix,
    transform: `matrix3d(${matrix.elements.map(value => Math.abs(value) < 1e-12 ? 0 : value).join(',')})`
  };
}
