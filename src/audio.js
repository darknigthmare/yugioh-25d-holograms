let audioCtx = null;
let humNode = null;
let humGain = null;
let isMuted = false;

// BGM Sequencer State
let bgmInterval = null;
let bgmTempo = 95;
let bgmStep = 0;
let bgmIsRunning = false;
let bgmRequested = false;
let bgmStyle = 'normal'; // 'normal', 'battle', 'danger'

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Generate 1.5 seconds of white noise for explosions and snare drums
let noiseBuffer = null;
function getNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;

  const bufferSize = ctx.sampleRate * 1.5;
  noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/**
 * Connects a node to destination with a StereoPannerNode if supported
 */
function connectWithPan(sourceNode, ctx, pan = 0) {
  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, ctx.currentTime);
    sourceNode.connect(panner);
    panner.connect(ctx.destination);
    return panner;
  } else {
    sourceNode.connect(ctx.destination);
    return null;
  }
}

export function toggleMute() {
  isMuted = !isMuted;
  if (humGain) {
    humGain.gain.setValueAtTime(isMuted ? 0 : 0.05, audioCtx ? audioCtx.currentTime : 0);
  }
  if (isMuted) {
    stopBGM();
  } else {
    startBGM();
  }
  return isMuted;
}

export function playClick(pan = 0) {
  if (isMuted) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

  osc.connect(gain);
  connectWithPan(gain, ctx, pan);

  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

export function playDrawCard(pan = 0) {
  if (isMuted) return;
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.25);

  filter.type = 'bandpass';
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(400, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.25);

  gain.gain.setValueAtTime(0.01, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

  osc.connect(filter);
  filter.connect(gain);
  connectWithPan(gain, ctx, pan);

  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

export function playSummon(pan = 0) {
  if (isMuted) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(60, now);
  osc1.frequency.exponentialRampToValueAtTime(880, now + 0.6);

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(62, now);
  osc2.frequency.exponentialRampToValueAtTime(885, now + 0.6);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(100, now);
  filter.frequency.exponentialRampToValueAtTime(3000, now + 0.5);

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  connectWithPan(gain, ctx, pan);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.8);
  osc2.stop(now + 0.8);

  setTimeout(() => {
    if (isMuted) return;
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();

    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(1200, ctx.currentTime);
    chimeOsc.frequency.setValueAtTime(1500, ctx.currentTime + 0.08);
    chimeOsc.frequency.setValueAtTime(1800, ctx.currentTime + 0.16);

    chimeGain.gain.setValueAtTime(0.08, ctx.currentTime);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    chimeOsc.connect(chimeGain);
    connectWithPan(chimeGain, ctx, pan);

    chimeOsc.start();
    chimeOsc.stop(ctx.currentTime + 0.4);
  }, 350);
}

export function playAttack(pan = 0, destPan = pan) {
  if (isMuted) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.4);

  filter.type = 'peaking';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + 0.4);
  filter.Q.value = 5;

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc.connect(filter);
  filter.connect(gain);

  if (ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, now);
    panner.pan.linearRampToValueAtTime(destPan, now + 0.4);
    gain.connect(panner);
    panner.connect(ctx.destination);
  } else {
    gain.connect(ctx.destination);
  }

  osc.start(now);
  osc.stop(now + 0.45);
}

export function playExplosion(pan = 0) {
  if (isMuted) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, now);
  filter.frequency.exponentialRampToValueAtTime(100, now + 0.8);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

  noiseSource.connect(filter);
  filter.connect(gain);
  connectWithPan(gain, ctx, pan);

  const metallicOsc = ctx.createOscillator();
  const metallicGain = ctx.createGain();

  metallicOsc.type = 'triangle';
  metallicOsc.frequency.setValueAtTime(2000, now);
  metallicOsc.frequency.linearRampToValueAtTime(100, now + 0.6);

  metallicGain.gain.setValueAtTime(0.08, now);
  metallicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  metallicOsc.connect(metallicGain);
  connectWithPan(metallicGain, ctx, pan);

  noiseSource.start(now);
  metallicOsc.start(now);

  noiseSource.stop(now + 1.0);
  metallicOsc.stop(now + 0.6);
}

export function playLpLoss(pan = 0) {
  if (isMuted) return;
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const duration = 0.5;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(330, now);
  osc.frequency.setValueAtTime(220, now + 0.1);
  osc.frequency.setValueAtTime(330, now + 0.2);
  osc.frequency.setValueAtTime(220, now + 0.3);
  osc.frequency.setValueAtTime(330, now + 0.4);

  gain.gain.setValueAtTime(0.05, now);
  gain.gain.setValueAtTime(0.05, now + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  connectWithPan(gain, ctx, pan);

  osc.start(now);
  osc.stop(now + duration);
}

export function startHologramHum() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (humNode) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, now);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.5, now);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(2, now);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.05, now);

    osc.connect(humGain);
    humGain.connect(ctx.destination);

    lfo.start(now);
    osc.start(now);

    humNode = { osc, lfo, lfoGain };
  } catch (e) {
    console.error('Failed to start ambient hum:', e);
  }
}

export function stopHologramHum() {
  if (!humNode) return;
  try {
    const now = audioCtx ? audioCtx.currentTime : 0;
    humNode.osc.stop(now);
    humNode.lfo.stop(now);
    humNode = null;
    humGain = null;
  } catch (e) {
    console.error('Failed to stop ambient hum:', e);
  }
}

// ----------------------------------------------------
// DYNAMIC ADAPTIVE MUSIC SYNTHESIZER
// ----------------------------------------------------

export function startBGM() {
  bgmRequested = true;
  if (isMuted || bgmIsRunning || (typeof document !== 'undefined' && document.hidden)) return;
  bgmIsRunning = true;

  const ctx = getAudioContext();
  let nextNoteTime = ctx.currentTime;

  function schedule() {
    while (nextNoteTime < ctx.currentTime + 0.1) {
      playBgmStep(ctx, nextNoteTime);
      const stepDuration = 60.0 / bgmTempo / 2; // Eighth notes scheduler
      nextNoteTime += stepDuration;
    }
  }

  bgmInterval = setInterval(schedule, 50);
}

export function stopBGM() {
  bgmRequested = false;
  stopBGMScheduler();
}

function stopBGMScheduler() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
  bgmIsRunning = false;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopBGMScheduler();
      audioCtx?.suspend?.().catch?.(() => {});
    } else if (bgmRequested && !isMuted) {
      startBGM();
    }
  });
}

export function setBGMStyle(style) {
  bgmStyle = style;
  if (style === 'normal') bgmTempo = 95;
  else if (style === 'battle') bgmTempo = 118;
  else if (style === 'danger') bgmTempo = 135;
}

function playBgmStep(ctx, time) {
  if (isMuted) return;

  // Note frequencies (C1 to G2 notes)
  let bassNotes = [32.7, 32.7, 49.0, 49.0, 46.2, 46.2, 43.6, 43.6]; // C1, C1, G2, G2, Bb1, Bb1, F1, F1
  if (bgmStyle === 'battle') {
    bassNotes = [32.7, 38.9, 43.6, 49.0, 32.7, 38.9, 43.6, 49.0]; // faster, rock riffs
  } else if (bgmStyle === 'danger') {
    bassNotes = [32.7, 34.6, 32.7, 30.9, 32.7, 34.6, 32.7, 30.9]; // scary semitone oscillations
  }

  const note = bassNotes[bgmStep % bassNotes.length];

  // Bass Synthesizer note scheduling
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(note, time);

  // Accentuation logic
  const isBeat = bgmStep % 4 === 0;
  const vol = isBeat ? 0.05 : 0.025;

  // Lowpass filter for smooth synth bass
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 150;

  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.25);

  // Cyber snare drum on beat 2 and 6
  if (bgmStep % 8 === 2 || bgmStep % 8 === 6) {
    const snSource = ctx.createBufferSource();
    snSource.buffer = getNoiseBuffer(ctx);

    const snFilter = ctx.createBiquadFilter();
    snFilter.type = 'bandpass';
    snFilter.frequency.value = 1100;

    const snGain = ctx.createGain();
    snGain.gain.setValueAtTime(0.025, time);
    snGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    snSource.connect(snFilter);
    snFilter.connect(snGain);
    snGain.connect(ctx.destination);

    snSource.start(time);
    snSource.stop(time + 0.1);
  }

  // Synthetic high-hats on off-beats
  if (bgmStep % 2 === 1) {
    const hhOsc = ctx.createOscillator();
    const hhGain = ctx.createGain();

    hhOsc.type = 'sine';
    hhOsc.frequency.setValueAtTime(9500, time);

    hhGain.gain.setValueAtTime(0.004, time);
    hhGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

    hhOsc.connect(hhGain);
    hhGain.connect(ctx.destination);

    hhOsc.start(time);
    hhOsc.stop(time + 0.04);
  }

  // High-pitch alert beep during danger state
  if (bgmStyle === 'danger' && bgmStep % 16 === 0) {
    const beepOsc = ctx.createOscillator();
    const beepGain = ctx.createGain();

    beepOsc.type = 'sine';
    beepOsc.frequency.setValueAtTime(1300, time);

    beepGain.gain.setValueAtTime(0.015, time);
    beepGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);

    beepOsc.connect(beepGain);
    beepGain.connect(ctx.destination);

    beepOsc.start(time);
    beepOsc.stop(time + 0.22);
  }

  bgmStep++;
}
