#!/bin/bash
# Bundle size regression guard — runs after `pnpm build` in CI.
#
# Asserts that shared JS and conversion/operator-critical routes stay under
# their first-load budgets. Next's route "Size" column is only a unique
# route-chunk estimate: it can rise when Webpack moves unchanged modules out of
# a shared chunk even while total initial JS falls, so that estimate warns but
# does not block. The /request route is paid-traffic critical; patient/staff
# portal routes are interaction-critical; paid landing pages must not quietly
# inherit heavy client islands.
#
# If this fails:
#   - Inspect `.next/analyze/client.html` (run `pnpm analyze`) to find the
#     new culprit in the shared chunk.
#   - Common causes: a third-party dep pulled into root layout, a barrel
#     export that prevents tree-shaking, a dev-tool leaking into prod build
#     (see the Next 15.5.x next-devtools/dev-overlay incident in next.config.mjs).
#   - If a first-load increase is genuine and approved, change the relevant
#     hard budget here in the same PR, with a commit explaining why.
#
set -euo pipefail

MAX_SHARED_KB=160
MAX_REQUEST_ROUTE_KB=26
MAX_REQUEST_FIRST_LOAD_KB=180

# route|max unique route-chunk estimate kB|max first-load JS kB|failure hint
ROUTE_BUDGETS=(
  "/request|26|180|The intake shell is carrying code that should be lazy-loaded. Re-baselined 25->26 on 2026-07-10: main had saturated the budget at exactly 25.0 kB, and the intake state-lifecycle correctness package (scoped per-service drafts, hydration-gated URL decisions, prefill-once - PR #308) added ~0.8 kB of client logic that cannot be lazy-loaded (it IS the shell's state machinery). Before the next bump, lazy-load the conditional shell chrome instead: DraftRestorationBanner, SubtypeMismatchBanner, and FlowErrorScreen all render only in exceptional states."
  "/patient|15|190|The patient dashboard should stay tight. Re-baselined 2026-05-25 after the returning-patient shortcut shipped on the hero; re-baselined 2026-06-05 (route JS 14.2 to 15 kB ceiling, because this guard rounds up and the current patient route measured 14.2 kB on CI with no /patient code delta in the prescribing-flow branch). Investigate dynamic-imports before the next bump."
  "/dashboard|37|400|The 2026-07-16 money-page consolidation changed Webpack chunk ownership without changing dashboard source: 14 unchanged modules moved from a shared chunk into the route entry, so Next's unique estimate rose from 29.9 to 36.8 kB. Actual initial dashboard JS fell from 390 to 389 kB. The 400 kB first-load ceiling is the authoritative tightened budget; investigate any real increase before changing it."
  "/admin/intakes|23|260|The request ledger must keep the clinical review cockpit behind an explicit-open dynamic import. First-load JS fell from 450 kB to 248 kB on 2026-07-14 after app/admin/intakes/intakes-ledger-client.tsx stopped eagerly importing IntakeReviewPanel; 260 kB preserves a 12 kB Webpack-variance margin. Acquisition classification must also stay server-side in app/admin/intakes/page.tsx so its zod-bearing heard-about-us graph does not return to the client bundle."
  "/medical-certificate|12|330|The primary paid med-cert landing page should stay server-first with narrow client islands. Re-baselined 2026-05-23 after brand rehaul (live wait counter + signature devices + coral accent + Plus Jakarta Sans)"
  "/consult|12|330|The consult funnel should keep static sections server-rendered and hydrate only interactive section islands. Re-baselined 2026-05-23 after consult overview rebuild + signature devices"
  "/pricing|10|330|The pricing page should keep proof sections server-rendered instead of hydrating as one large client island"
  "/prescriptions|12|340|The prescriptions landing page should stay below the paid-funnel runtime ceiling. Re-baselined 2026-05-23 after brand rehaul; re-baselined 2026-06-16 to 340 kB after measured Webpack split-chunk variance put the route at 338 kB with no prescriptions-page code delta."
  "/erectile-dysfunction|16|335|The ED landing page should not inherit broad service-funnel runtime. Re-baselined 2026-06-26: the page rebuild (d4b70a15d) grew route JS to ~16.7 kB; below-fold sections (ArticleVisuals/FAQ/ContentHubLinks) are now lazy-loaded (~15 kB) and 16 kB leaves split-chunk variance margin. A deeper section-extraction pass to reach 12 kB is tracked separately."
  "/hair-loss|12|340|The hair-loss landing page should not inherit broad service-funnel runtime. Re-baselined 2026-05-23 after IIEF-style hook quiz + brand rehaul; re-baselined 2026-06-16 to 340 kB after measured Webpack split-chunk variance put the route at 336 kB with no hair-loss page code delta."
)

BUILD_OUT="${BUILD_OUT:-/tmp/next-build-output.txt}"
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
    echo "⚠ warning: ${route} unique route-chunk estimate is ${route_kb} kB (guide: ${max_route_kb} kB)"
    echo ""
    echo "   Next's Size column counts chunks unique to one route and can rise when total initial JS falls."
    echo "   ${hint} Inspect unexpected ownership changes with:"
    echo "     ANALYZE=true pnpm build"
    echo "     open .next/analyze/client.html"
    echo ""
    if [ -n "${GITHUB_ACTIONS:-}" ]; then
      echo "::warning::${route} unique route-chunk estimate is ${route_kb} kB (guide: ${max_route_kb} kB)"
    fi
  else
    echo "✓ ok: ${route} unique route-chunk estimate is ${route_kb} kB (guide: ${max_route_kb} kB)"
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

  echo "✓ ok: ${route} first-load JS is ${first_load_kb} kB (budget: ${max_first_load_kb} kB)"
done
