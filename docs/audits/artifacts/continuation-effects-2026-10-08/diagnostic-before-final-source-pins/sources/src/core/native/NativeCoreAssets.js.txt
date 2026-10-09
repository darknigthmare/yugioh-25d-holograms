let wasmBinaryPromise;

/** Load the pinned WASM once, before creating any synchronous duel callbacks. */
export async function loadNativeCoreWasm(options = {}) {
  if (options.wasmBinary) return options.wasmBinary;
  const isDefault = options.fetch === undefined && options.wasmUrl === undefined;
  if (isDefault && wasmBinaryPromise) return wasmBinaryPromise;
  const load = async () => {
    if (isDefault && typeof process !== 'undefined' && process.versions?.node && typeof window === 'undefined') {
      const moduleName = 'node:fs/promises';
      const { readFile } = await import(/* @vite-ignore */ moduleName);
      const path = new URL('../../../public/native/ocgcore.sync.wasm', import.meta.url);
      const buffer = await readFile(path);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }
    const fetchResource = options.fetch ?? globalThis.fetch;
    const baseUrl = import.meta.env?.BASE_URL ?? '/';
    const response = await fetchResource(options.wasmUrl ?? `${baseUrl}native/ocgcore.sync.wasm`);
    if (!response.ok) throw new Error(`Unable to load native duel engine (${response.status})`);
    return response.arrayBuffer();
  };
  const pending = load();
  if (isDefault) {
    wasmBinaryPromise = pending;
    pending.catch(() => { if (wasmBinaryPromise === pending) wasmBinaryPromise = undefined; });
  }
  return pending;
}
