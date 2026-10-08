import { nativeSourceSha256 } from './NativeSourceIntegrity.js';
import { applyNativeCardScriptCorrections } from './NativeCardScriptCorrections.js';

// These exact executed sources contain only public ConfirmCards calls. This
// deliberately bounded list is separate from private looks at either Deck.
export const NATIVE_PUBLIC_REVEAL_SOURCES = Object.freeze([
  [2106266, 'Galloping Gaia', 'e30d5ce8e0e825f14c4152d69bc740d4aa7109c56ae83947bfc0fa3540e1d6a2', 2],
  [43940008, 'Duel Tower', '43d4454ff05c1e05ec47eb69023e45750b4e0e9bf186c4b718e72432ba0f1460', 1, '32bfc7a639718a0f1631dd6eec0ee9018334e7273aeabb09065d5e0eb213a11e'],
  [32807846, 'Reinforcement of the Army', 'dd3e2046df766ec30dcae539b5d7af6511c66930db94577c70f6cdf1e963481c', 2],
  [73628505, 'Terraforming', 'cd9128184802b538e138083d0959c6b62f7f57808bf557b04a1c4d566ceea5c9', 2],
  [62265044, 'Dragon Ravine', '1b985669612df3f337b20d7b9d6b6061b1504da6bc19990d0e77e29303ee9957', 2],
  [66399653, 'Union Hangar', '7cdf4352c2ca829f1671a0ba623e7f5556e002593153c98041c9dab574fde034', 2],
  [26202165, 'Sangan', 'bbe8a2e73fab5ae65d5bc53af7d7b28aaa19761310e7bc2de5295ad8ee9ff3cf', 2],
  [78010363, 'Witch of the Black Forest', 'c26e171e05ae291d19f839a0b20e80660268bea49a1a48027ccf2e4cb86973de', 2]
].map(([code, name, originalSha256, location, effectiveSha256 = originalSha256]) => Object.freeze({
  code, name, filename: `c${code}.lua`, originalSha256, effectiveSha256, location
})));

/** Trust the active native link, never merely any public source in its Chain. */
export function createNativePublicRevealPolicy(resources, { scriptReader } = {}) {
  const trusted = new Map();
  for (const source of NATIVE_PUBLIC_REVEAL_SOURCES) {
    const original = resources?.scripts?.get?.(source.filename);
    if (typeof original !== 'string' || nativeSourceSha256(original) !== source.originalSha256) continue;
    try {
      const effective = scriptReader ? scriptReader(source.filename)
        : applyNativeCardScriptCorrections(source.filename, original);
      if (typeof effective === 'string' && nativeSourceSha256(effective) === source.effectiveSha256) {
        trusted.set(source.code, source);
      }
    } catch { /* A changed or unavailable executed source cannot reveal secrets. */ }
  }
  return (message, location, context) => {
    if (![0, 1].includes(location?.controller) || !Number.isInteger(location?.code)
      || location.code <= 0 || !message?.cards?.includes(location)) return false;
    // These wire messages are public excavations, independent of card policy.
    if (message.type === 30 || message.type === 42) return true;
    if (message.type !== 31 || ![0, 1].includes(message.player)
      || message.player !== 1 - location.controller) return false;
    const link = context?.chains?.get(context.confirmSourceLink);
    if (!link || link.negated || ![0, 1].includes(link.loc?.controller)) return false;
    const source = trusted.get(Number(link.loc.code));
    if (!source || location.location !== source.location) return false;
    return source.code === 43940008 || location.controller === link.loc.controller;
  };
}
