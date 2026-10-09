import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const sha256 = value => createHash('sha256').update(value).digest('hex');

/** All decisions below go through the core's typed protocol. No Lua debug API,
 * mutated card data, test-mode flag or JS rules engine is used. Explicit
 * hash-guarded card-script corrections are recorded in scenario evidence. */
export async function loadNativeAuditInputs() {
  const { loadNativeCardResources } = await import('../src/core/native/NativeCardData.js');
  let scriptFiles;
  const resources = await loadNativeCardResources({
    fetch: async url => {
      const path = new URL(`../public${new URL(String(url), 'https://audit.invalid').pathname}`, import.meta.url);
      const text = await readFile(path, 'utf8');
      return { ok: true, status: 200, json: async () => {
        const value = JSON.parse(text);
        if (String(url).endsWith('/scripts.json')) scriptFiles = value.files;
        return value;
      } };
    }
  });
  const coreModule = process.env.NATIVE_CORE_MODULE
    ? await import(pathToFileURL(resolve(process.env.NATIVE_CORE_MODULE)).href)
    : await import('../src/core/native/vendor/ocgcore/index.js');
  const wasm = await readFile(new URL('../public/native/ocgcore.sync.wasm', import.meta.url));
  const coreBuild = JSON.parse(await readFile(new URL('../public/native/core-build.json', import.meta.url), 'utf8'));
  assert.equal(sha256(wasm), coreBuild.wasmSha256, 'Native WASM must match its build provenance');
  const initializer = { wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) };
  resources.auditScriptFiles = scriptFiles;
  return { resources, coreModule, initializer, coreBuild };
}

