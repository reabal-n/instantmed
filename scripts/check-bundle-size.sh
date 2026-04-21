#!/bin/bash
# Bundle size regression guard — runs after `pnpm build` in CI.
#
# Asserts that the "First Load JS shared by all" chunk stays under budget.
# This is the chunk that loads on EVERY page, so bloat here multiplies across
# the whole site. Today's baseline (2026-04-21 after devtools stub) is 129 KB;
# we leave a 30 KB ceiling for legitimate new framework deps.
#
# If this fails:
#   - Inspect `.next/analyze/client.html` (run `pnpm analyze`) to find the
#     new culprit in the shared chunk.
#   - Common causes: a third-party dep pulled into root layout, a barrel
#     export that prevents tree-shaking, a dev-tool leaking into prod build
#     (see the Next 15.5.x next-devtools/dev-overlay incident in next.config.mjs).
#   - If the increase is genuine and approved, bump MAX_SHARED_KB here in the
#     same PR, with a commit explaining why.
#
# To also track per-route first-load, extend this script to parse each page
# line from `next build` output.

set -euo pipefail

MAX_SHARED_KB=160

BUILD_OUT="/tmp/next-build-output.txt"
if [ ! -f "$BUILD_OUT" ]; then
  echo "❌ Expected build output at $BUILD_OUT — did you run \`pnpm build 2>&1 | tee $BUILD_OUT\` before this script?"
  exit 1
fi

# Capture the "First Load JS shared by all" value. Next 15 prints it like:
#   + First Load JS shared by all                           129 kB
line=$(grep -E "First Load JS shared by all" "$BUILD_OUT" || true)

if [ -z "$line" ]; then
  echo "❌ Could not find 'First Load JS shared by all' line in build output."
  echo "   Next.js may have changed its output format. Inspect $BUILD_OUT."
  exit 1
fi

# Extract the numeric size in kB.
size_kb=$(echo "$line" | grep -oE '[0-9]+(\.[0-9]+)? kB' | grep -oE '[0-9]+(\.[0-9]+)?' | head -1)

if [ -z "$size_kb" ]; then
  echo "❌ Could not parse size from: $line"
  exit 1
fi

# Round up for the comparison.
size_int=$(echo "$size_kb" | awk '{print int($1 + 0.999)}')

if [ "$size_int" -gt "$MAX_SHARED_KB" ]; then
  echo "❌ FAIL: shared first-load JS is ${size_kb} kB (budget: ${MAX_SHARED_KB} kB)"
  echo ""
  echo "   Something new is bleeding into the shared bundle. Inspect with:"
  echo "     ANALYZE=true pnpm build"
  echo "     open .next/analyze/client.html"
  echo ""
  exit 1
fi

echo "✓ ok: shared first-load JS is ${size_kb} kB (budget: ${MAX_SHARED_KB} kB)"
