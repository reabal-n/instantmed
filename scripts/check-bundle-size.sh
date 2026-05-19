#!/bin/bash
# Bundle size regression guard — runs after `pnpm build` in CI.
#
# Asserts that shared JS and conversion/operator-critical routes stay under
# budget. The /request route is paid-traffic critical; patient/staff portal
# routes are interaction-critical; paid landing pages must not quietly inherit
# heavy client islands.
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

# route|max route JS kB|max first-load JS kB|failure hint
ROUTE_BUDGETS=(
  "/request|25|180|The intake shell is carrying code that should be lazy-loaded"
  "/patient|12|190|The patient dashboard is inheriting portal runtime it should not load"
  "/dashboard|24|405|The staff cockpit is carrying too much client runtime"
  "/admin/intakes|18|455|The request ledger should not inherit heavy doctor-review code"
  "/medical-certificate|12|425|The primary paid med-cert landing page is too heavy"
  "/prescriptions|7|425|The prescriptions landing page is too heavy"
  "/erectile-dysfunction|10|425|The ED landing page is too heavy"
  "/hair-loss|11|425|The hair-loss landing page is too heavy"
)

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

extract_size_kb() {
  local line="$1"
  local index="$2"
  echo "$line" | grep -oE '[0-9]+(\.[0-9]+)? (kB|B)' | sed -n "${index}p" | awk '{
    if ($2 == "B") {
      printf "%.3f", $1 / 1000
    } else {
      print $1
    }
  }'
}

extract_first_kb() {
  extract_size_kb "$1" 1
}

extract_second_kb() {
  extract_size_kb "$1" 2
}

round_up_kb() {
  echo "$1" | awk '{print int($1 + 0.999)}'
}

find_route_line() {
  local route="$1"
  local escaped
  escaped=$(printf '%s\n' "$route" | sed 's/[^^]/[&]/g; s/\^/\\^/g')
  grep -E "[[:space:]]${escaped}[[:space:]]" "$BUILD_OUT" | head -1 || true
}

shared_kb=$(extract_first_kb "$shared_line")

if [ -z "$shared_kb" ]; then
  echo "❌ Could not parse shared size from: $shared_line"
  exit 1
fi

shared_int=$(round_up_kb "$shared_kb")

if [ "$shared_int" -gt "$MAX_SHARED_KB" ]; then
  echo "❌ FAIL: shared first-load JS is ${shared_kb} kB (budget: ${MAX_SHARED_KB} kB)"
  echo ""
  echo "   Something new is bleeding into the shared bundle. Inspect with:"
  echo "     ANALYZE=true pnpm build"
  echo "     open .next/analyze/client.html"
  echo ""
  exit 1
fi

echo "✓ ok: shared first-load JS is ${shared_kb} kB (budget: ${MAX_SHARED_KB} kB)"

for route_budget in "${ROUTE_BUDGETS[@]}"; do
  IFS="|" read -r route max_route_kb max_first_load_kb hint <<< "$route_budget"
  route_line=$(find_route_line "$route")

  if [ -z "$route_line" ]; then
    echo "❌ Could not find ${route} route line in build output."
    echo "   Next.js may have changed its output format. Inspect $BUILD_OUT."
    exit 1
  fi

  route_kb=$(extract_first_kb "$route_line")
  first_load_kb=$(extract_second_kb "$route_line")

  if [ -z "$route_kb" ]; then
    echo "❌ Could not parse ${route} route JS from: $route_line"
    exit 1
  fi

  if [ -z "$first_load_kb" ]; then
    echo "❌ Could not parse ${route} first-load JS from: $route_line"
    exit 1
  fi

  route_int=$(round_up_kb "$route_kb")
  first_load_int=$(round_up_kb "$first_load_kb")

  if [ "$route_int" -gt "$max_route_kb" ]; then
    echo "❌ FAIL: ${route} route JS is ${route_kb} kB (budget: ${max_route_kb} kB)"
    echo ""
    echo "   ${hint}. Inspect with:"
    echo "     ANALYZE=true pnpm build"
    echo "     open .next/analyze/client.html"
    echo ""
    exit 1
  fi

  if [ "$first_load_int" -gt "$max_first_load_kb" ]; then
    echo "❌ FAIL: ${route} first-load JS is ${first_load_kb} kB (budget: ${max_first_load_kb} kB)"
    echo ""
    echo "   ${hint}. Inspect with:"
    echo "     ANALYZE=true pnpm build"
    echo "     open .next/analyze/client.html"
    echo ""
    exit 1
  fi

  echo "✓ ok: ${route} route JS is ${route_kb} kB (budget: ${max_route_kb} kB)"
  echo "✓ ok: ${route} first-load JS is ${first_load_kb} kB (budget: ${max_first_load_kb} kB)"
done
