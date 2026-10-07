/**
 * Isolated authoritative EDOPro runtime. The native core owns all duel rules;
 * callers render its messages and explicitly answer its selection prompts.
 * Assets/readers are injected so initialization never fetches during a duel.
 */
import { loadNativeCoreWasm } from './NativeCoreAssets.js';
import { nativeCardMatchesAnnounceOpcode } from './NativeDuelDecisions.js';
import { NATIVE_LUA_COMPATIBILITY_NAME, NATIVE_LUA_COMPATIBILITY_SOURCE } from './NativeLuaCompatibility.js';

export const NATIVE_CORE_PACKAGE = 'ocgcore-wasm';
export const NATIVE_CORE_PACKAGE_VERSION = '0.1.2';
export const NATIVE_CORE_API_VERSION = Object.freeze([11, 0]);

const DEFAULT_TEAM = Object.freeze({
  startingLP: 8000, startingDrawCount: 5, drawCountPerTurn: 1
});

function createSeed() {
  const words = new Uint32Array(8);
  globalThis.crypto.getRandomValues(words);
  const seed = Array.from({ length: 4 }, (_, index) => (
    (BigInt(words[index * 2]) << 32n) | BigInt(words[index * 2 + 1])
  ));
  if (seed.every(value => value === 0n)) seed[0] = 1n;
  return seed;
}

function synchronousReader(reader, label) {
  return key => {
    const value = reader(key);
    if (value && typeof value.then === 'function') {
      throw new TypeError(`${label} must use preloaded synchronous assets`);
    }
    return value ?? null;
  };
}

/** Accept both canonical official/c123.lua paths and core c123.lua requests. */
export function createNativeScriptReader(scripts) {
  if (!(scripts instanceof Map)) throw new TypeError('scripts must be a Map');
  return name => scripts.get(name)
    ?? (/^c\d+\.lua$/.test(name) ? scripts.get(`official/${name}`) : null)
    ?? null;
}

export async function createNativeDuelRuntime(options = {}) {
  const coreModule = options.coreModule ?? await import('./vendor/ocgcore/index.js');
  const createCore = options.createCore ?? coreModule.default;
  if (typeof createCore !== 'function') throw new TypeError('Missing native core factory');
  const cardReader = options.cardReader ?? (options.cards instanceof Map
    ? code => options.cards.get(Number(code)) ?? options.cards.get(String(code)) ?? null
    : null);
  const scriptReader = options.scriptReader ?? (options.scripts instanceof Map
    ? createNativeScriptReader(options.scripts) : null);
  if (typeof cardReader !== 'function' || typeof scriptReader !== 'function') {
    throw new TypeError('Native duel requires cardReader and scriptReader');
  }
  const initializer = { ...options.initializer, sync: true };
  if (!options.coreModule && !initializer.wasmBinary) {
    initializer.wasmBinary = await loadNativeCoreWasm(options);
  }
  const core = await createCore(initializer);
  const version = core.getVersion();
  if (version[0] !== NATIVE_CORE_API_VERSION[0]) {
    throw new Error(`Unsupported OCG API ${version.join('.')}; expected API 11`);
  }
  const runtime = new NativeDuelRuntime(core, coreModule, {
    ...options,
    cardReader: synchronousReader(cardReader, 'cardReader'),
    scriptReader: synchronousReader(scriptReader, 'scriptReader')
  });
  try {
    runtime.initialize();
    return runtime;
  } catch (error) {
    runtime.close();
    throw error;
  }
}

export class NativeDuelRuntime {
  constructor(core, constants, options) {
    this.core = core;
    this.constants = constants;
    this.options = options;
    this.handle = null;
    this.started = false;
    this.closed = false;
    this.ended = false;
    this.pendingPrompt = null;
    this.errors = [];
  }

  initialize() {
    const { OcgDuelMode } = this.constants;
    const seed = this.options.seed ?? createSeed();
    if (!Array.isArray(seed) || seed.length !== 4 || seed.some(value => typeof value !== 'bigint')
      || seed.every(value => value === 0n)) {
      throw new TypeError('seed must contain four BigInts and may not be all zero');
    }
    this.handle = this.core.createDuel({
      flags: this.options.flags ?? OcgDuelMode.MODE_MR5,
      seed,
      team1: { ...DEFAULT_TEAM, ...this.options.team1 },
      team2: { ...DEFAULT_TEAM, ...this.options.team2 },
      cardReader: this.options.cardReader,
      scriptReader: this.options.scriptReader,
      errorHandler: (type, text) => {
        const entry = Object.freeze({ type, text });
        this.errors.push(entry);
        this.options.errorHandler?.(type, text);
      }
    });
    if (!this.handle) throw new Error('Native core failed to create duel');
    for (const name of ['constant.lua', 'utility.lua']) {
      const script = this.options.scriptReader(name);
      if (typeof script !== 'string' || !this.core.loadScript(this.handle, name, script)) {
        throw new Error(`Failed to preload ${name}`);
      }
    }
    if (!this.core.loadScript(this.handle, NATIVE_LUA_COMPATIBILITY_NAME, NATIVE_LUA_COMPATIBILITY_SOURCE)) {
      throw new Error(`Failed to preload ${NATIVE_LUA_COMPATIBILITY_NAME}`);
    }
  }

  assertOpen() {
    if (this.closed || !this.handle) throw new Error('Native duel is closed');
  }

  addCard(card) {
    this.assertOpen();
    if (this.started) throw new Error('Cards may only be injected before starting the duel');
    const canonicalCode = Number(card?.code);
    const code = Number(this.options.canonicalCodeToSource?.get(canonicalCode) ?? canonicalCode);
    if (!Number.isInteger(code) || code <= 0 || !this.options.cardReader(code)) {
      throw new Error(`Missing native card data: ${card?.code}`);
    }
    const controller = card.controller ?? card.team;
    if (![0, 1].includes(controller) || ![0, 1].includes(card.team ?? controller)) {
      throw new TypeError('Native card team/controller must be 0 or 1');
    }
    this.core.duelNewCard(this.handle, {
      duelist: 0, sequence: 0, position: this.constants.OcgPosition.FACEDOWN_DEFENSE,
      ...card, code, controller, team: card.team ?? controller
    });
    return this;
  }

  addCards(cards) {
    for (const card of cards) this.addCard(card);
    return this;
  }

  start() {
    this.assertOpen();
    if (this.started) throw new Error('Native duel has already started');
    this.core.startDuel(this.handle);
    this.started = true;
    return this;
  }

  /** Advance to the next player decision without making any implicit choices. */
  advance({ maxSteps = 4096 } = {}) {
    this.assertOpen();
    if (!this.started) throw new Error('Native duel has not started');
    if (!Number.isInteger(maxSteps) || maxSteps < 1) throw new TypeError('maxSteps must be positive');
    const { OcgProcessResult } = this.constants;
    if (this.ended) return { status: OcgProcessResult.END, prompt: null, messages: [] };
    if (this.pendingPrompt) {
      return { status: OcgProcessResult.WAITING, prompt: this.pendingPrompt, messages: [] };
    }
    const messages = [];
    for (let step = 0; step < maxSteps; step += 1) {
      const status = this.core.duelProcess(this.handle);
      const batch = this.core.duelGetMessage(this.handle);
      messages.push(...batch);
      this.options.onMessages?.(batch);
      if (status === OcgProcessResult.END) {
        this.ended = true;
        return { status, prompt: null, messages };
      }
      if (status === OcgProcessResult.WAITING) {
        this.pendingPrompt = batch.at(-1);
        if (!this.pendingPrompt) throw new Error('Native core waited without a decision prompt');
        return { status, prompt: this.pendingPrompt, messages };
      }
      if (status !== OcgProcessResult.CONTINUE) throw new Error(`Unknown native process status: ${status}`);
    }
    // A step budget yields control while preserving every emitted message.
    return { status: OcgProcessResult.CONTINUE, prompt: null, messages };
  }

  respond(response) {
    this.assertOpen();
    if (!this.pendingPrompt || this.ended) throw new Error('Native duel is not awaiting a response');
    if (!response || !Number.isInteger(response.type)) throw new TypeError('Expected typed native response');
    this.core.duelSetResponse(this.handle, response);
    this.pendingPrompt = null;
    return this;
  }

  queryCard(query) {
    this.assertOpen();
    return this.core.duelQuery(this.handle, { overlaySequence: 0, ...query });
  }

  isCardDeclarable(code, opcodes) {
    this.assertOpen();
    return nativeCardMatchesAnnounceOpcode(this.options.cardReader(Number(code)), opcodes, this.constants);
  }

  queryLocation(query) {
    this.assertOpen();
    return this.core.duelQueryLocation(this.handle, query);
  }

  queryCount(controller, location) {
    this.assertOpen();
    return this.core.duelQueryCount(this.handle, controller, location);
  }

  queryField() {
    this.assertOpen();
    return this.core.duelQueryField(this.handle);
  }

  close() {
    if (this.handle && !this.closed) this.core.destroyDuel(this.handle);
    this.handle = null;
    this.pendingPrompt = null;
    this.closed = true;
  }
}
