import assert from 'node:assert/strict';
import test from 'node:test';

let moduleIndex = 0;

async function audioHarness(t, { unsupported = false, constructorFails = false, resumeFails = false, stopFails = false } = {}) {
  const timers = new Map();
  const delays = new Map();
  const handlers = new Map();
  const contexts = [];
  let nextTimer = 0;
  const document = { hidden: false, addEventListener: (name, fn) => handlers.set(name, fn) };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class FakeContext {
    constructor() {
      if (constructorFails) throw new Error('No audio device');
      this.state = 'running';
      this.currentTime = 0;
      this.sampleRate = 16;
      this.destination = {};
      this.nodes = [];
      contexts.push(this);
    }
    node() {
      const node = {
        frequency: param(), gain: param(), Q: param(), pan: param(),
        disconnected: false, stopped: false, started: false,
        connect() {}, disconnect() { this.disconnected = true; },
        start() { this.started = true; },
        stop() { this.stopped = true; if (stopFails) throw new Error('Already stopped'); }
      };
      this.nodes.push(node);
      return node;
    }
    createOscillator() { return this.node(); }
    createGain() { return this.node(); }
    createBiquadFilter() { return this.node(); }
    createStereoPanner() { return this.node(); }
    createBufferSource() { return this.node(); }
    createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    resume() {
      if (resumeFails) return Promise.reject(new Error('Autoplay denied'));
      this.state = 'running';
      return Promise.resolve();
    }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  const values = {
    window: unsupported ? {} : { AudioContext: FakeContext },
    document,
    setInterval: fn => { const id = nextTimer++; timers.set(id, fn); return id; },
    clearInterval: id => timers.delete(id),
    setTimeout: fn => { const id = nextTimer++; delays.set(id, fn); return id; },
    clearTimeout: id => delays.delete(id)
  };
  for (const [key, value] of Object.entries(values)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  const audio = await import(`../src/audio.js?reliability-test=${moduleIndex++}`);
  t.after(() => { audio.stopBGM(); audio.stopHologramHum(); });
  return { audio, contexts, timers, delays, handlers, document, enableDevice: () => { constructorFails = false; } };
}

test('missing Web Audio is silent and never breaks duel actions', async t => {
  const { audio, timers } = await audioHarness(t, { unsupported: true });
  for (const name of ['playClick', 'playDrawCard', 'playSummon', 'playAttack', 'playExplosion', 'playLpLoss', 'startHologramHum', 'stopHologramHum', 'startBGM', 'stopBGM']) {
    assert.doesNotThrow(() => audio[name](), name);
  }
  assert.equal(timers.size, 0);
});

test('failed audio device creation does not leave the BGM marked as running', async t => {
  const { audio, timers, enableDevice } = await audioHarness(t, { constructorFails: true });
  assert.doesNotThrow(() => audio.playClick());
  assert.doesNotThrow(() => audio.startBGM());
  assert.equal(timers.size, 0);
  enableDevice();
  audio.startBGM();
  assert.equal(timers.size, 1);
});

test('unmuting starts music only when the duel requested it and mute preserves that request', async t => {
  const { audio, timers, contexts } = await audioHarness(t);
  assert.equal(audio.toggleMute(), true);
  assert.equal(audio.toggleMute(), false);
  assert.equal(contexts.length, 0, 'menu unmute must not create an audio context');
  audio.startBGM();
  assert.equal(timers.size, 1);
  audio.toggleMute();
  assert.equal(timers.size, 0, 'even scheduler id zero must be cleared');
  audio.toggleMute();
  assert.equal(timers.size, 1);
  audio.stopBGM();
  audio.toggleMute();
  audio.toggleMute();
  assert.equal(timers.size, 0, 'explicit stop cancels resume intent');
});

test('stalled main thread does not synthesize all missed notes on the next scheduler tick', async t => {
  const { audio, timers, contexts } = await audioHarness(t);
  audio.startBGM();
  const ctx = contexts[0];
  ctx.currentTime = 3600;
  [...timers.values()][0]();
  assert.ok(ctx.nodes.length > 0);
  assert.ok(ctx.nodes.length < 20, `bounded scheduler created ${ctx.nodes.length} nodes`);
});

test('hidden tabs pause music and resume a single scheduler only when visible', async t => {
  const { audio, timers, contexts, handlers, document } = await audioHarness(t);
  audio.startBGM();
  audio.startBGM();
  assert.equal(timers.size, 1);
  document.hidden = true;
  handlers.get('visibilitychange')();
  assert.equal(timers.size, 0);
  assert.equal(contexts[0].state, 'suspended');
  document.hidden = false;
  handlers.get('visibilitychange')();
  handlers.get('visibilitychange')();
  assert.equal(timers.size, 1);
  assert.equal(contexts.length, 1);
});

test('autoplay rejection is handled and stops the unusable music scheduler', async t => {
  const { audio, timers, contexts } = await audioHarness(t, { resumeFails: true });
  audio.playClick();
  contexts[0].state = 'suspended';
  assert.doesNotThrow(() => audio.startBGM());
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(timers.size, 0);
});

test('hum teardown disconnects every persistent node even when stop throws', async t => {
  const { audio, contexts } = await audioHarness(t, { stopFails: true });
  audio.startHologramHum();
  const firstNodes = [...contexts[0].nodes];
  audio.stopHologramHum();
  assert.ok(firstNodes.length >= 4);
  assert.ok(firstNodes.every(node => node.disconnected));
  audio.startHologramHum();
  assert.ok(contexts[0].nodes.length > firstNodes.length, 'teardown must release stale hum state');
});

test('delayed summon chime ignores a device that closed while it was pending', async t => {
  const { audio, contexts, delays } = await audioHarness(t);
  audio.playSummon();
  const ctx = contexts[0];
  const nodeCount = ctx.nodes.length;
  ctx.state = 'closed';
  for (const callback of delays.values()) assert.doesNotThrow(callback);
  assert.equal(ctx.nodes.length, nodeCount);
  audio.playClick();
  assert.equal(contexts.length, 2, 'next user gesture can create a replacement context');
});
