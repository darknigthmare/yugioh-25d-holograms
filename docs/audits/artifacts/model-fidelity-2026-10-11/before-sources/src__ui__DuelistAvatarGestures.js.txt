/** Public visual gestures. No engine, cards, outcomes, or private state are read. */
export const DUELIST_GESTURE_DURATIONS = Object.freeze({
  summon: 1.2,
  casting: 1.35,
  attack: 1,
  damage: 0.8,
  victory: 1.7,
  defeat: 1.65,
  draw: 1.25
});

export const DUELIST_GESTURE_KINDS = Object.freeze(Object.keys(DUELIST_GESTURE_DURATIONS));
const OUTCOMES = new Set(['victory', 'defeat', 'draw']);
const JOINT_NAMES = Object.freeze(['body', 'head', 'hair', 'cloth', 'leftShoulder', 'leftElbow', 'leftWrist', 'duelDisk', 'rightShoulder', 'rightElbow', 'rightWrist']);
const POSES = {
  summon: { body: [0, -0.1, 0], head: [-0.045, 0.1, 0], leftShoulder: [-0.48, -0.05, -0.16], leftElbow: [-0.3, 0, 0], leftWrist: [0.08, -0.08, 0], duelDisk: [0.14, 0, 0.03], rightShoulder: [-0.9, 0.16, 0.32], rightElbow: [-0.42, 0, 0.05], rightWrist: [0.38, 0, -0.06], cloth: [0.025, 0.035, 0] },
  casting: { body: [0, -0.14, 0], head: [0.025, 0.13, -0.025], leftShoulder: [-0.62, -0.09, -0.18], leftElbow: [-0.2, 0, 0], leftWrist: [-0.05, -0.14, 0], duelDisk: [0.16, 0.05, 0.08], rightShoulder: [-0.78, 0.22, 0.48], rightElbow: [-0.64, 0, -0.06], rightWrist: [0.5, -0.18, 0.12], hair: [0, 0, -0.016], cloth: [-0.025, 0.045, 0] },
  attack: { body: [-0.022, -0.2, 0], head: [-0.035, 0.13, 0], leftShoulder: [-0.3, 0.08, -0.12], leftElbow: [-0.17, 0, 0], duelDisk: [0.1, 0, 0], rightShoulder: [-1.12, 0.22, 0.34], rightElbow: [-0.31, 0, -0.08], rightWrist: [0.12, -0.12, -0.08], cloth: [-0.035, 0.055, 0.015] },
  damage: { body: [-0.055, 0.065, 0.022], head: [0.16, -0.06, 0.04], leftShoulder: [-0.18, 0, -0.12], leftElbow: [-0.36, 0, 0], leftWrist: [-0.12, 0, 0], rightShoulder: [-0.17, -0.08, -0.12], rightElbow: [-0.32, 0, 0], rightWrist: [-0.06, 0, 0], cloth: [0.045, 0, -0.016] },
  victory: { body: [0, -0.055, 0], head: [-0.07, 0.04, -0.025], leftShoulder: [-0.28, 0, -0.12], leftElbow: [-0.22, 0, 0], duelDisk: [0.12, 0, 0.025], rightShoulder: [-0.35, 0.12, 2.32], rightElbow: [-0.16, 0, 0.3], rightWrist: [0.12, 0, 0.05], cloth: [-0.016, 0.03, 0] },
  defeat: { body: [0.12, 0, 0], head: [0.27, -0.08, 0.02], leftShoulder: [0.14, 0, 0.025], leftElbow: [0.16, 0, 0], leftWrist: [0.08, 0, 0], duelDisk: [-0.1, 0, 0], rightShoulder: [0.12, 0, -0.025], rightElbow: [0.1, 0, 0], rightWrist: [0.06, 0, 0], cloth: [0.026, 0, 0] },
  draw: { body: [0, 0, 0], head: [0.06, 0, 0], leftShoulder: [-0.13, 0, -0.035], leftElbow: [-0.06, 0, 0], rightShoulder: [-0.13, 0, 0.035], rightElbow: [-0.06, 0, 0], rightWrist: [0.05, 0, 0] }
};
for (const pose of Object.values(POSES)) {
  Object.values(pose).forEach(Object.freeze);
  Object.freeze(pose);
}
Object.freeze(POSES);

const smoothstep = value => value * value * (3 - 2 * value);

/**
 * Drives already allocated anatomical joints. elapsedSeconds is the model's
 * existing animation clock, not wall time. Replacement cancels the previous
 * gesture; backwards clocks never rewind a pose or restore consumed time.
 */
export function createDuelistGestureController(joints, { reducedMotion = false } = {}) {
  let state = null;
  let lastElapsed = null;
  let sequence = 0;
  let motionReduced = reducedMotion === true;
  let disposed = false;

  function applyPose(kind, weight) {
    const pose = POSES[kind];
    for (const name of JOINT_NAMES) {
      const target = joints[name];
      const rotation = pose[name];
      if (!target || !rotation) continue;
      target.rotation.x += rotation[0] * weight;
      target.rotation.y += rotation[1] * weight;
      target.rotation.z += rotation[2] * weight;
    }
  }

  function play(kind, options = {}) {
    if (disposed || typeof kind !== 'string' || !Object.hasOwn(DUELIST_GESTURE_DURATIONS, kind)) return false;
    const strength = typeof options.strength === 'number' && Number.isFinite(options.strength)
      ? Math.max(0, Math.min(1.25, options.strength)) : 1;
    const hold = options.hold === true && OUTCOMES.has(kind);
    const immediate = hold && options.immediate === true;
    state = { gestureId: ++sequence, kind, strength, duration: DUELIST_GESTURE_DURATIONS[kind], elapsed: immediate ? DUELIST_GESTURE_DURATIONS[kind] : 0, held: hold, reducedMotion: motionReduced };
    return true;
  }

  function clear() {
    if (disposed || !state) return false;
    state = null;
    return true;
  }

  function update(elapsedSeconds, { reducedMotion: nextReducedMotion = motionReduced } = {}) {
    if (disposed || !Number.isFinite(elapsedSeconds)) return false;
    motionReduced = nextReducedMotion === true;
    const delta = lastElapsed === null ? 0 : Math.max(0, elapsedSeconds - lastElapsed);
    lastElapsed = elapsedSeconds;
    if (!state) return false;
    state.reducedMotion = motionReduced;
    state.elapsed = Math.min(state.duration, state.elapsed + delta);
    if (motionReduced && !state.held) {
      // Transient gestures are omitted; terminal public results remain visible.
      state = null;
      return false;
    }
    const progress = state.elapsed / state.duration;
    if (!state.held && progress >= 1) { state = null; return false; }
    const envelope = state.held
      ? smoothstep(Math.min(1, progress / 0.36))
      : progress < 0.24 ? smoothstep(progress / 0.24)
        : progress < 0.5 ? 1 : 1 - smoothstep((progress - 0.5) / 0.5);
    const gentle = motionReduced ? 0.2 : 1;
    applyPose(state.kind, envelope * state.strength * gentle);
    return envelope > 0;
  }

  function getState() {
    if (!state) return null;
    return Object.freeze({ ...state, progress: state.elapsed / state.duration,
      active: state.elapsed < state.duration && !state.reducedMotion });
  }

  function dispose() {
    if (disposed) return false;
    state = null;
    disposed = true;
    return true;
  }

  return { play, clear, update, getState, dispose,
    get hasActiveGesture() { return Boolean(state && state.elapsed < state.duration && !state.reducedMotion); } };
}

export default createDuelistGestureController;
