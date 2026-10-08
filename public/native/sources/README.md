# Corresponding source for the native duel engine

The browser-delivered `ocgcore.sync.wasm` contains the EDOPro engine
(AGPL-3.0-or-later) and Lua (MIT). These complete pinned archives include the
native core, Lua, wrapper bridge, build scripts, and dependency metadata.

| Archive | SHA-256 |
| --- | --- |
| `ocgcore-wasm-768af363.tar.gz` | `528d47d409193c95cb343a4f286568b3d52cb4101e54fa170a978c0243ddb48a` |
| `ygopro-core-38d04c9f.tar.gz` (deployed core) | `eb2e32d213c58f23cb9efc3297abfce632d94dca40e4f388e0bb73fff26abc84` |
| `ygopro-core-8e5f4e4f.tar.gz` | `649946c73a37664c3397fccd5f8e177478186063d36146c2d4b51c9c99d15b6c` |
| `lua-75ea9ccb.tar.gz` | `9f2f625653b8a6ce9e4489385370256831e71fe2fc15801d9b738aadde45e98d` |

Extract the wrapper archive and place the contents of the deployed core
archive under `cpp/ygo` and the Lua archive under `cpp/lua`. The deployed core
is official EDOPro revision `38d04c9feb1a26617407091380634c87262fe3f8` from
<https://github.com/edo9300/ygopro-core>. It implements effect 267, used by
Angelechy Endgame Problem. The older archive is retained for the verified
before/after regression. No official Lua or native source is patched.

Activate Emscripten 4.0.9, then run the synchronous recipe:

```sh
bash build-native-core.sh /path/to/extracted/wrapper /path/to/build
```

[build-native-core.sh](build-native-core.sh) preserves the wrapper's upstream
synchronous compiler flags and input file order. Put the deployed core and
Lua sources in the wrapper directories before running it. A clean second
output directory produced the exact same WASM and JavaScript loader hashes.
The loader must be used with its paired WASM. [core-build.json](../core-build.json)
records the compiler revision, pinned source archives, sizes, hashes and ABI
comparison. The C API remains 11.0; public ABI headers are unchanged.

The root application's source also
contains the local wrapper patches, original wrapper TypeScript and this
application's adapters. The [complete application source](https://github.com/darknigthmare/yugioh-25d-holograms/tree/codex/duel-fidelity-2026-10-01),
[native adapters and editable patches](https://github.com/darknigthmare/yugioh-25d-holograms/tree/codex/duel-fidelity-2026-10-01/src/core/native),
and [version history](https://github.com/darknigthmare/yugioh-25d-holograms/commits/codex/duel-fidelity-2026-10-01) are publicly accessible.
The deployed preview's commit is recorded by Vercel and in its pull request.
See [native subsystem notices](../NOTICE.md) for the integration license.

The deployed WASM SHA-256 is
`0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`.
The matching generated loader SHA-256 is
`f4523ad5c2e9f14c8736a91ad94e9e7f8283883a3607781f40afdeae27cdf828`.

The editable `NativeLuaCompatibility.js` bridge in the public application
source adds only a guarded alias from `Group.NewGroup` to the existing native
`Group.CreateGroup` constructor. It resolves one upstream card's spelling
discrepancy without changing the Lua archive. Native effects remain in the
official Lua and core.

Full license notices are in `/native/licenses/`. Source for the Project Ignis
card scripts is delivered verbatim as `/native/scripts.json`.
