#!/bin/bash
# Builds Refloat Shaping 3: produces refloat-shaping3.vescpkg in this folder.
set -e
cd "$(dirname "$0")"
export PATH="$HOME/bin:$PATH"
VESC_TOOL="${VESC_TOOL:-$HOME/bin/vesc_tool}"

[ -x "$VESC_TOOL" ] || VESC_TOOL="$(command -v vesc_tool || true)"
[ -n "$VESC_TOOL" ] && [ -x "$VESC_TOOL" ] || { echo "ERROR: vesc_tool not found (set VESC_TOOL=/path/to/vesc_tool)"; exit 1; }
command -v arm-none-eabi-gcc >/dev/null || { echo "ERROR: arm-none-eabi-gcc not found"; exit 1; }
[ "$(cat version)" = "1.3.0-boosterKP-shaping3" ] || { echo "ERROR: unexpected version file"; exit 1; }

# Slider engine tests (if Node is installed): stop on any failure
if command -v node >/dev/null 2>&1; then
  make test
else
  echo "Node not found: engine tests skipped."
fi

make clean >/dev/null
make OLDVT=1 VESC_TOOL="$VESC_TOOL"
[ -f refloat.vescpkg ] || { echo "ERROR: package not produced"; exit 1; }
mv -f refloat.vescpkg refloat-shaping3.vescpkg
ls -l refloat-shaping3.vescpkg
echo "OK: $(pwd)/refloat-shaping3.vescpkg"
