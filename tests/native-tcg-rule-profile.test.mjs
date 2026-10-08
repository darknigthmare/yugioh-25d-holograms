import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeDuelRuntime } from '../src/core/native/NativeDuelRuntime.js';
import { NATIVE_TCG_DUEL_FLAGS, NATIVE_TCG_RULE_PROFILE } from '../src/core/native/NativeTCGRuleProfile.js';
import { OcgDuelMode } from '../src/core/native/vendor/ocgcore/index.js';

// These two tests concern forwarding initialization options, not simulated
// summoning outcomes. The companion 70 real-WASM cases verify procedures.
async function configuredRuntime(flags) {
  let received;
  const core = { getVersion: () => [11, 0], createDuel: options => { received = options; return {}; },
    loadScript: () => true, destroyDuel: () => {} };
  const runtime = await createNativeDuelRuntime({ seed: [1n, 2n, 3n, 4n], flags,
    coreModule: { default: async () => core }, cardReader: () => null, scriptReader: () => '' });
  return { runtime, received };
}

test('bare runtime default forwards MR5 and both TCG simultaneous-trigger flags', async () => {
  const { runtime, received } = await configuredRuntime(undefined);
  try {
    assert.equal(received.flags, NATIVE_TCG_DUEL_FLAGS);
    assert.equal(runtime.options.flags, NATIVE_TCG_RULE_PROFILE.flags);
    assert.equal(received.flags & OcgDuelMode.TCG_SEGOC_NONPUBLIC, OcgDuelMode.TCG_SEGOC_NONPUBLIC);
    assert.equal(received.flags & OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER, OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER);
    assert.equal(received.flags & (OcgDuelMode.TEST_MODE | OcgDuelMode.PSEUDO_SHUFFLE), 0n);
  } finally { runtime.close(); }
});

test('an explicitly requested historical rules profile is forwarded without adding TCG flags', async () => {
  const { runtime, received } = await configuredRuntime(OcgDuelMode.MODE_MR4);
  try {
    assert.equal(received.flags, OcgDuelMode.MODE_MR4);
    assert.equal(runtime.options.flags, OcgDuelMode.MODE_MR4);
    assert.equal(received.flags & (OcgDuelMode.TCG_SEGOC_NONPUBLIC | OcgDuelMode.TCG_SEGOC_FIRSTTRIGGER), 0n);
  } finally { runtime.close(); }
});
