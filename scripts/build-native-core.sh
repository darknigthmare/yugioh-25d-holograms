#!/usr/bin/env bash
# Build the synchronous EDOPro module and its matching Emscripten loader.
# Pinned sources, toolchain and output hashes: public/native/core-build.json.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo 'Usage: bash build-native-core.sh /path/to/wrapper-source /path/to/output-directory' >&2
  exit 2
fi
NATIVE_BUILD_ROOT=$(cd "$1" && pwd)
mkdir -p "$2"
NATIVE_OUTDIR=$(cd "$2" && pwd)
NATIVE_EM_VERSION=$(em++ --version)
if [[ "$NATIVE_EM_VERSION" != *' 4.0.9 '* ]]; then
  echo 'Activate the pinned Emscripten 4.0.9 SDK before building.' >&2
  exit 2
fi
cd "$NATIVE_BUILD_ROOT"

# Preserve upstream scripts/build.sh input order and all synchronous flags.
NATIVE_YGO_FILES=(card duel effect field interpreter libcard libdebug libduel libeffect libgroup ocgapi operations playerop processor_visit processor scriptlib)
NATIVE_LUA_FILES=(lapi lauxlib lbaselib lcode lcorolib lctype ldblib ldebug ldo ldump lfunc lgc linit liolib llex lmathlib lmem loadlib lobject lopcodes loslib lparser lstate lstring lstrlib ltable ltablib ltm lundump lutf8lib lvm lzio)
NATIVE_SOURCES=()
for NATIVE_FILE in "${NATIVE_LUA_FILES[@]}"; do NATIVE_SOURCES+=("./cpp/lua/$NATIVE_FILE.c"); done
for NATIVE_FILE in "${NATIVE_YGO_FILES[@]}"; do NATIVE_SOURCES+=("./cpp/ygo/$NATIVE_FILE.cpp"); done

em++ \
  -Os -g0 --closure 1 -sASSERTIONS=0 \
  -sMODULARIZE=1 -sALLOW_MEMORY_GROWTH=1 -sMALLOC=emmalloc \
  -fwasm-exceptions -sSUPPORT_LONGJMP=wasm \
  -fno-rtti -sNO_EXIT_RUNTIME=1 -sENVIRONMENT=web \
  "-sEXPORTED_FUNCTIONS=['_malloc','_free']" \
  "-sEXPORTED_RUNTIME_METHODS=['stackSave','stackRestore','stackAlloc','getValue','stringToUTF8','lengthBytesUTF8','HEAP8','HEAPU8']" \
  -I./cpp/lua "${NATIVE_SOURCES[@]}" ./cpp/wasm.cpp \
  -o "$NATIVE_OUTDIR/ocgcore.sync.mjs"

# Deploy these as a pair. Emscripten import/export minification is not a stable
# cross-build interface: the previously generated loader must not be reused.
sha256sum "$NATIVE_OUTDIR/ocgcore.sync.wasm" "$NATIVE_OUTDIR/ocgcore.sync.mjs"
