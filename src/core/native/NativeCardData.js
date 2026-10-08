import { createNativeScriptArchive } from './NativeScriptArchive.js';

const TYPE_LINK = 0x4000000;
const RESOURCE_PATH = '/native';
let defaultResourcesPromise;

/** SQLite packs up to four 16-bit archetypes into a signed 64-bit integer. */
export function unpackNativeSetcodes(rawSetcode) {
  let packed = BigInt.asUintN(64, BigInt(rawSetcode));
  const setcodes = [];
  while (packed) {
    const setcode = Number(packed & 0xffffn);
    if (setcode) setcodes.push(setcode);
    packed >>= 16n;
  }
  return setcodes;
}

/** Translate source CDB columns to the ocgcore-wasm OcgCardData contract. */
export function createNativeCardDataMaps(payload) {
  if (payload?.format !== 'project-ignis-cdb-v1' || !Array.isArray(payload.rows)) {
    throw new TypeError('Invalid native CDB archive');
  }
  const cards = new Map();
  const metadata = new Map();
  for (const row of payload.rows) {
    const [code, ot, alias, setcode, type, attack, defense, packedLevel, race, attribute,
      category, name, description, strings, sourceDatabase] = row;
    if (!Number.isInteger(code) || code <= 0 || cards.has(code) || typeof name !== 'string') {
      throw new TypeError(`Invalid or duplicate native card: ${code}`);
    }
    const packed = Number(packedLevel) >>> 0;
    cards.set(code, {
      code, alias, setcodes: unpackNativeSetcodes(setcode), type,
      level: packed & 0xff, attribute, race: BigInt.asUintN(64, BigInt(race)), attack, defense,
      lscale: (packed >>> 24) & 0xff, rscale: (packed >>> 16) & 0xff,
      link_marker: (type & TYPE_LINK) ? defense : 0
    });
    metadata.set(code, {
      code, sourceCode: code, name, description, strings: [...strings], ot, category,
      sourceDatabase, rawSetcode: setcode, rawRace: race, rawLevel: packedLevel
    });
  }
  const canonicalCodeToSource = new Map();
  const sourceCodeToCanonical = new Map();
  for (const binding of payload.canonicalBindings ?? []) {
    const { canonicalCode, sourceCode, name } = binding;
    if (cards.has(canonicalCode) || !cards.has(sourceCode) || sourceCodeToCanonical.has(sourceCode)) {
      throw new Error(`Invalid canonical native binding: ${canonicalCode} -> ${sourceCode}`);
    }
    canonicalCodeToSource.set(canonicalCode, sourceCode);
    sourceCodeToCanonical.set(sourceCode, canonicalCode);
    // Canonical lookup points to the exact upstream row, retaining its source
    // code and genuine CDB alias. Native duel insertion uses the explicit map.
    cards.set(canonicalCode, cards.get(sourceCode));
    metadata.set(canonicalCode, { ...metadata.get(sourceCode), code: canonicalCode, name, canonicalBinding: binding });
  }
  return {
    cards, metadata, canonicalCodeToSource, sourceCodeToCanonical,
    canonicalToNative: canonicalCodeToSource, nativeToCanonical: sourceCodeToCanonical
  };
}

async function readJson(fetchResource, url) {
  const response = await fetchResource(url);
  if (!response.ok) throw new Error(`Unable to load native resources: ${url} (${response.status})`);
  return response.json();
}

/**
 * Lazy-load local factual card data and unmodified official/prerelease Lua.
 * The default request is cached; a failed request can be retried. Custom fetch
 * enables deterministic Node tests without inserting Node imports into the app.
 */
export async function loadNativeCardResources(options = {}) {
  const isDefault = options.fetch === undefined && options.baseUrl === undefined;
  if (isDefault && defaultResourcesPromise) return defaultResourcesPromise;
  const fetchResource = options.fetch ?? globalThis.fetch;
  if (typeof fetchResource !== 'function') throw new Error('A fetch implementation is required for native resources');
  const baseUrl = (options.baseUrl ?? RESOURCE_PATH).replace(/\/$/, '');
  const load = async () => {
    const [data, archive, manifest, banlists] = await Promise.all([
      readJson(fetchResource, `${baseUrl}/card-data.json`),
      readJson(fetchResource, `${baseUrl}/scripts.json`),
      readJson(fetchResource, `${baseUrl}/manifest.json`),
      readJson(fetchResource, `${baseUrl}/field-banlists.json`)
    ]);
    const cardMaps = createNativeCardDataMaps(data);
    const scripts = createNativeScriptArchive(archive);
    const fieldBanlists = new Map(banlists.entries.map(entry => [Number(entry.id), entry]));
    for (const [code, limits] of fieldBanlists) {
      const entry = cardMaps.metadata.get(code);
      if (entry) entry.banlist = limits;
    }
    return { ...cardMaps, scripts, manifest, fieldBanlists, banlists };
  };
  const pending = load();
  if (isDefault) {
    defaultResourcesPromise = pending;
    pending.catch(() => { if (defaultResourcesPromise === pending) defaultResourcesPromise = undefined; });
  }
  return pending;
}
