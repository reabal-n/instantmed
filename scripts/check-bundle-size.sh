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
  "/patient|15|190|The patient dashboard should stay tight. Re-baselined 2026-05-25 after the returning-patient shortcut shipped on the hero; re-baselined 2026-06-05 (route JS 14.2 to 15 kB ceiling, because this guard rounds up and the current patient route measured 14.2 kB on CI with no /patient code delta in the prescribing-flow branch). Investigate dynamic-imports before the next bump."
  "/dashboard|35|422|The staff cockpit first-load floor is now ~399 kB after 2026-06-16 split QueueDialogs and ApprovedTodayList out of the initial queue client, while Next's route Size includes those lazy route chunks and reports ~34.6 kB. Keep first-load below 422 kB; future route-size bumps still need real code reduction or split-chunk accounting, not a blind budget raise."
  "/admin/intakes|23|455|The request ledger should not inherit heavy doctor-review code. Ceiling reflects shared cockpit primitives + refund indicator + renewal badge work (2026-05-20 to 2026-05-21); re-baselined 22->23 on 2026-06-26 for Webpack split-chunk variance (measured 21.9-22.1 kB across builds, no ledger code delta)."
  "/medical-certificate|12|330|The primary paid med-cert landing page should stay server-first with narrow client islands. Re-baselined 2026-05-23 after brand rehaul (live wait counter + signature devices + coral accent + Plus Jakarta Sans)"
  "/consult|12|330|The consult funnel should keep static sections server-rendered and hydrate only interactive section islands. Re-baselined 2026-05-23 after consult overview rebuild + signature devices"
  "/pricing|10|330|The pricing page should keep proof sections server-rendered instead of hydrating as one large client island"
  "/prescriptions|12|340|The prescriptions landing page should stay below the paid-funnel runtime ceiling. Re-baselined 2026-05-23 after brand rehaul; re-baselined 2026-06-16 to 340 kB after measured Webpack split-chunk variance put the route at 338 kB with no prescriptions-page code delta."
  "/erectile-dysfunction|16|335|The ED landing page should not inherit broad service-funnel runtime. Re-baselined 2026-06-26: the page rebuild (d4b70a15d) grew route JS to ~16.7 kB; below-fold sections (ArticleVisuals/FAQ/ContentHubLinks) are now lazy-loaded (~15 kB) and 16 kB leaves split-chunk variance margin. A deeper section-extraction pass to reach 12 kB is tracked separately."
  "/hair-loss|12|340|The hair-loss landing page should not inherit broad service-funnel runtime. Re-baselined 2026-05-23 after IIEF-style hook quiz + brand rehaul; re-baselined 2026-06-16 to 340 kB after measured Webpack split-chunk variance put the route at 336 kB with no hair-loss page code delta."
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
