#!/bin/bash
# Bundle size regression guard — runs after `pnpm build` in CI.
#
# Asserts that shared JS and the canonical /request intake route stay under
# budget. The /request route is paid-traffic critical; every unnecessary kB
# burns mobile conversion.
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
set -euo pipefail

MAX_SHARED_KB=160
MAX_REQUEST_ROUTE_KB=25
MAX_REQUEST_FIRST_LOAD_KB=180

BUILD_OUT="/tmp/next-build-output.txt"
if [ ! -f "$BUILD_OUT" ]; then
  echo "❌ Expected build output at $BUILD_OUT — did you run \`pnpm build 2>&1 | tee $BUILD_OUT\` before this script?"
  exit 1
fi

# Capture the "First Load JS shared by all" value. Next 15 prints it like:
#   + First Load JS shared by all                           129 kB
shared_line=$(grep -E "First Load JS shared by all" "$BUILD_OUT" || true)

if [ -z "$shared_line" ]; then
  echo "❌ Could not find 'First Load JS shared by all' line in build output."
  echo "   Next.js may have changed its output format. Inspect $BUILD_OUT."
  exit 1
fi

request_line=$(grep -E "[[:space:]]/request[[:space:]]" "$BUILD_OUT" | head -1 || true)

if [ -z "$request_line" ]; then
  echo "❌ Could not find /request route line in build output."
  echo "   Next.js may have changed its output format. Inspect $BUILD_OUT."
  exit 1
fi

extract_first_kb() {
  echo "$1" | grep -oE '[0-9]+(\.[0-9]+)? kB' | grep -oE '[0-9]+(\.[0-9]+)?' | head -1
}

extract_second_kb() {
  echo "$1" | grep -oE '[0-9]+(\.[0-9]+)? kB' | grep -oE '[0-9]+(\.[0-9]+)?' | sed -n '2p'
}

round_up_kb() {
  echo "$1" | awk '{print int($1 + 0.999)}'
}

shared_kb=$(extract_first_kb "$shared_line")

if [ -z "$shared_kb" ]; then
  echo "❌ Could not parse shared size from: $shared_line"
  exit 1
fi

request_first_load_kb=$(extract_second_kb "$request_line")
request_route_kb=$(extract_first_kb "$request_line")

if [ -z "$request_first_load_kb" ]; then
  echo "❌ Could not parse /request first-load JS from: $request_line"
  exit 1
fi

if [ -z "$request_route_kb" ]; then
  echo "❌ Could not parse /request route JS from: $request_line"
  exit 1
fi

shared_int=$(round_up_kb "$shared_kb")
request_route_int=$(round_up_kb "$request_route_kb")
request_first_load_int=$(round_up_kb "$request_first_load_kb")

if [ "$shared_int" -gt "$MAX_SHARED_KB" ]; then
  echo "❌ FAIL: shared first-load JS is ${shared_kb} kB (budget: ${MAX_SHARED_KB} kB)"
  echo ""
  echo "   Something new is bleeding into the shared bundle. Inspect with:"
  echo "     ANALYZE=true pnpm build"
  echo "     open .next/analyze/client.html"
  echo ""
  exit 1
fi

if [ "$request_route_int" -gt "$MAX_REQUEST_ROUTE_KB" ]; then
  echo "❌ FAIL: /request route JS is ${request_route_kb} kB (budget: ${MAX_REQUEST_ROUTE_KB} kB)"
  echo ""
  echo "   The intake shell is carrying code that should be lazy-loaded. Inspect with:"
  echo "     ANALYZE=true pnpm build"
  echo "     open .next/analyze/client.html"
  echo ""
  exit 1
fi

if [ "$request_first_load_int" -gt "$MAX_REQUEST_FIRST_LOAD_KB" ]; then
  echo "❌ FAIL: /request first-load JS is ${request_first_load_kb} kB (budget: ${MAX_REQUEST_FIRST_LOAD_KB} kB)"
  echo ""
  echo "   Paid-traffic intake is too heavy. Inspect with:"
  echo "     ANALYZE=true pnpm build"
  echo "     open .next/analyze/client.html"
  echo ""
  exit 1
fi

echo "✓ ok: shared first-load JS is ${shared_kb} kB (budget: ${MAX_SHARED_KB} kB)"
echo "✓ ok: /request route JS is ${request_route_kb} kB (budget: ${MAX_REQUEST_ROUTE_KB} kB)"
echo "✓ ok: /request first-load JS is ${request_first_load_kb} kB (budget: ${MAX_REQUEST_FIRST_LOAD_KB} kB)"
