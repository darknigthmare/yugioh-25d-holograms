/** Unmodified, filename-keyed Lua source archive. This is not a playability list. */
export function createNativeScriptArchive(payload) {
  if (payload?.format !== 'project-ignis-lua-v1' || !payload.scripts || typeof payload.scripts !== 'object') {
    throw new TypeError('Invalid native Lua archive');
  }
  const scripts = new Map();
  for (const [name, source] of Object.entries(payload.scripts)) {
    if (!/^[a-zA-Z0-9_]+\.lua$/.test(name) || typeof source !== 'string') {
      throw new TypeError(`Invalid native Lua source: ${name}`);
    }
    scripts.set(name, source);
  }
  for (const required of ['constant.lua', 'utility.lua', 'proc_unofficial.lua']) {
    if (!scripts.has(required)) throw new Error(`Missing native Lua helper: ${required}`);
  }
  return scripts;
}
