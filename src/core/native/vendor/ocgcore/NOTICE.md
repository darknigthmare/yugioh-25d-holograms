# Pinned native duel engine

The wrapper is `ocgcore-wasm` 0.1.2, copyright (c) 2025 Simone Miraglia,
licensed under MIT. The embedded EDOPro engine is copyright (c) 2019–2026
Edoardo Lolletti and its contributors, licensed under AGPL-3.0-or-later.
The Lua interpreter is MIT licensed. These licenses are distinct: the
wrapper's MIT declaration does not change the engine's AGPL license.

Full notices are served at `/native/licenses/ocgcore-wrapper-MIT.txt`,
`/native/licenses/ocgcore-LICENSE.txt` (including Fluorohydride and Lua notices),
and `/native/licenses/ocgcore-AGPL-3.0.txt`. Project Ignis Lua scripts have their
own notices in the card-resource archive.
Emscripten's generated runtime and the linked standard libraries retain their
notices in `/native/licenses/emscripten-4.0.9-LICENSE.txt`,
`musl-COPYRIGHT.txt`, `libcxx-LICENSE.txt`, `libcxxabi-LICENSE.txt` and
`compiler-rt-LICENSE.txt` under that same directory.

Published npm tarball:
`https://registry.npmjs.org/ocgcore-wasm/-/ocgcore-wasm-0.1.2.tgz`

- npm integrity: `sha512-Zgjx2xIf2RJf1gjvHGR8lvcLRfw54Cq48QFMOrOxtt3SeAf+/h58IbVNoYpZbK7O5O23GCwLeNqS4T6zODHpWA==`
- npm SHA-1: `5ef0f1ce4a277f688f0e8511ce277f384aa8c794`
- original `dist/index.js` SHA-256: `5642dad500a7e801fa87190fe937b6efb4e8448a7cf6421836a60a039984379d`
- historical npm WASM SHA-256: `7415337a6f88653b38e10faa3a087c0a5ab64dd27a7d7cf8a1e6872747c5c265`
- OCG C API: 11.0

The published source map's 13 TypeScript files match the wrapper revision
below byte for byte. The deployed native binary is rebuilt from the newer
official EDOPro core to support Angelechy's opponent-selected Special Summon
zone (effect 267). No upstream Lua or native engine source is changed.

| Component | Revision | Public corresponding source |
| --- | --- | --- |
| Wrapper and `cpp/wasm.cpp` | `768af363e79bd5c646e9b59f4e74aaeac0625784` | `/native/sources/ocgcore-wasm-768af363.tar.gz` |
| Deployed EDOPro core | `38d04c9feb1a26617407091380634c87262fe3f8` | `/native/sources/ygopro-core-38d04c9f.tar.gz` |
| Lua | `75ea9ccbea7c4886f30da147fb67b693b2624c26` | `/native/sources/lua-75ea9ccb.tar.gz` |

The original npm core revision `8e5f4e4f0ab6b8ca750e8e1c91c1a58f407e3272`
remains available in `/native/sources/ygopro-core-8e5f4e4f.tar.gz` for the
before/after regression and source comparison. `ocgapi.h`, `ocgapi_types.h`
and `ocgapi_constants.h` are byte-identical between these two revisions;
the C ABI remains 11.0.

The deployed WASM SHA-256 is
`0056ce4655dbc0bb949f0a3c32cbb4d9775c488a750fd5a8bb29bc04aca8b026`
(935745 bytes). Its matching generated Emscripten loader is
`ocgcore.sync-MMMSWPBB.js`, SHA-256
`f4523ad5c2e9f14c8736a91ad94e9e7f8283883a3607781f40afdeae27cdf828`
(21357 bytes). Loader and binary are built and deployed together; their
minified import/export names are not a stable interface across builds.
Complete build metadata is served as `/native/core-build.json`.

The unchanged TypeScript is also preserved under `upstream-source/`.
`apply-patches.mjs` is the preferred editable source for the local transforms.
It verifies the published wrapper's SHA-256 and fails if a patch does not match
exactly once. No changes are made to `node_modules`. The synchronous loader
is the byte-exact output of the native build recipe, replacing the npm loader.

Local fixes are based on the pinned `OCG_CardData` structure and
`playerop.cpp`/`card.cpp` message protocol:

1. Correct WASM32 right scale and Link marker offsets to 44 and 48 bytes.
2. Encode sort permutations as index-to-rank bytes, without a length prefix.
3. Consume and expose query `TYPE` fields.
4. Decode counter type before counter count.
5. Preserve signed attack/defense values and consume unknown query payloads.
6. Ship only the synchronous loader and fetch its paired WASM separately.
   JSPI is unnecessary for preloaded card and script readers.
7. Decode sum selection's mandatory list before its optional list, including
   the full location with its 32-bit position before each material value.
8. Consume and expose `MSG_MOVE`'s trailing unsigned 32-bit `reason` flags.
   The native core writes these flags after both complete card locations;
   `OcgMessageMove.reason` preserves the wire value, including Xyz material
   moves whose destination is an overlay under a host still in the Extra Deck.
   The local declaration patch adds the same field. The unmodified upstream
   `messages.ts` and `type_message.ts` remain available for comparison.

Recreate the wrapper after extracting the exact npm tarball and building the
paired native loader:

```sh
node src/core/native/vendor/ocgcore/apply-patches.mjs /path/to/extracted/package src/core/native/vendor/ocgcore /path/to/build/ocgcore.sync.mjs
cp /path/to/build/ocgcore.sync.wasm public/native/ocgcore.sync.wasm
```

To build the native binary from the included corresponding source, extract
the wrapper archive, put the deployed core source in its `cpp/ygo` directory
and Lua in `cpp/lua`, activate Emscripten 4.0.9, then run
`bash scripts/build-native-core.sh /path/to/wrapper /path/to/build` from the
application checkout. This recipe preserves upstream synchronous compiler
flags and source order. It is also served at
`/native/sources/build-native-core.sh`. A second build into a separate output
directory reproduced both deployed hashes exactly. No JSPI binary is built.

After the official helpers load, the application supplies the guarded Lua
alias `Group.NewGroup = Group.CreateGroup` for Dogmatikamacabre's upstream
constructor spelling discrepancy. The editable bridge is
`src/core/native/NativeLuaCompatibility.js` (AGPL-3.0-or-later). This is an
exact alias to the existing native constructor; upstream Lua bytes and native
source stay unchanged. No `Duel.GetMasterRule` compatibility approximation is
added for the unused legacy helper that references it.
