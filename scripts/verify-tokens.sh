#!/bin/bash
# Design token guard: hard-fail if prohibited design-system patterns land in the codebase.
#
# Why: The Morning Canvas design system (v1.0.0) mandates:
#   - Shadow tokens: shadow-{sm|md|lg|xl} shadow-{color}/{opacity} — never shadow-[0_...] arbitrary values
#   - Motion canon: initial={{}} on motion components — never initial={false}
#   - No spring physics in transitions (stiffness/damping belong only in useSpring MotionValues
#     or intentional mouse-tracking interactions, not entrance/exit transitions)
#   - No violet/purple shadow colours — rgba(139,92,246) is prohibited (Phase 2a kill)
#
# Intentional exceptions (do not "fix" these):
#   - AnimatePresence initial={false}  ← valid boolean API prop, not a violation
#   - useSpring() in stat-strip.tsx    ← animated counter MotionValue, not a transition
#   - stiffness/damping in perspective-tilt-card.tsx and interactive-product-mockup.tsx
#     ← mouse-tracking physics, not entrance transitions
#   - drop-shadow-[...] in cinematic-switch.tsx ← CSS filter on text, no canonical alternative
#
# Exit 1 if any violation is found.

set -euo pipefail

SEARCH_DIRS="components app"
errors=0

# ─── Helper ────────────────────────────────────────────────────────────────
fail() {
  echo "❌ FAIL: $1"
  errors=$((errors + 1))
}

ok() {
  echo "✓  ok:   $1"
}

# ─── 1. Custom shadow arbitrary values ─────────────────────────────────────
echo "── Shadow arbitrary check ──"
# Match shadow-[0_ (box-shadow arbitraries). drop-shadow-[ (filter) is excluded.
shadow_hits=$(grep -rn 'shadow-\[0_' $SEARCH_DIRS \
  --include="*.tsx" --include="*.ts" \
  2>/dev/null \
  | grep -v 'drop-shadow-\[0_' \
  || true)

if [[ -n "$shadow_hits" ]]; then
  fail "Custom box-shadow arbitrary value(s) found. Replace with shadow-{sm|md|lg|xl} shadow-{color}/{opacity}."
  echo "$shadow_hits"
else
  ok "No custom shadow-[0_...] arbitraries"
fi

# ─── 2. initial={false} on motion elements (NOT AnimatePresence) ───────────
echo ""
echo "── Motion initial={false} check ──"
# Grep for initial={false}, then exclude AnimatePresence lines.
motion_false=$(grep -rn 'initial={false}' $SEARCH_DIRS \
  --include="*.tsx" --include="*.ts" \
  2>/dev/null | grep -v 'AnimatePresence' || true)

if [[ -n "$motion_false" ]]; then
  fail "motion element with initial={false} found. Use initial={{}} per motion canon (M6-A)."
  echo "$motion_false"
else
  ok "No motion initial={false} violations"
fi

# ─── 3. Spring physics in transition objects ────────────────────────────────
echo ""
echo "── Spring physics (transition) check ──"
# Look for stiffness: or type: "spring" / type: 'spring'
# Exclude the known-intentional files: perspective-tilt-card, interactive-product-mockup, stat-strip.
spring_hits=$(grep -rn -E "(stiffness:|type:[[:space:]]*['\"]spring['\"])" $SEARCH_DIRS \
  --include="*.tsx" --include="*.ts" \
  2>/dev/null \
  | grep -v 'perspective-tilt-card' \
  | grep -v 'interactive-product-mockup' \
  | grep -v 'stat-strip' \
  || true)

if [[ -n "$spring_hits" ]]; then
  fail "Spring physics in transition (stiffness/type:spring) found outside allowed files. Replace with { duration: 0.2, ease: 'easeOut' } per motion canon (M6-B)."
  echo "$spring_hits"
else
  ok "No prohibited spring physics in transitions"
fi

# ─── 4. Violet/purple shadow colours ───────────────────────────────────────
echo ""
echo "── Violet shadow colour check ──"
# rgba(139,92,246) is #8B5CF6 — violet-500. Prohibited per Phase 2a C1 kill.
violet_hits=$(grep -rn 'rgba(139,92,246' $SEARCH_DIRS \
  --include="*.tsx" --include="*.ts" \
  2>/dev/null || true)

if [[ -n "$violet_hits" ]]; then
  fail "Violet/purple shadow colour rgba(139,92,246,...) found. Replace with shadow-primary/{opacity} or dark:shadow-none per Phase 2a C1 kill."
  echo "$violet_hits"
else
  ok "No violet/purple shadow colours"
fi

# ─── 5. entrance duration > 0.3s ───────────────────────────────────────────
echo ""
echo "── Motion duration cap check ──"
# Flag duration: 0.4 or higher (0.5, 0.6, ...) in transition objects.
# Exclude durations that are likely intentional infinite-loop animations
# (those typically use 1.2, 1.5, 0.8, etc. and live in specific files).
# We check for duration: 0.4 because canon max is 0.3.
duration_hits=$(grep -rn -E 'duration:[[:space:]]*0\.[4-9][0-9]*' $SEARCH_DIRS \
  --include="*.tsx" --include="*.ts" \
  2>/dev/null \
  | grep -v 'pulse\|shimmer\|spin\|marquee\|loop\|infinite\|breathing\|float\|stat-strip\|clip-path-image\|animated-beam\|border-beam\|particles\|ripple\|shine\|loader' \
  || true)

if [[ -n "$duration_hits" ]]; then
  fail "Entrance animation duration > 0.3s found. Cap entrance transitions at 0.3s per motion canon (M6-C)."
  echo "$duration_hits"
else
  ok "No entrance durations > 0.3s"
fi

# ─── Summary ────────────────────────────────────────────────────────────────
echo ""
if [[ $errors -gt 0 ]]; then
  echo "✖ $errors design token violation(s) found."
  echo ""
  echo "See docs/DESIGN_SYSTEM.md for canonical patterns."
  echo "Run: grep -rn 'shadow-\\[0_' components/ app/ for shadows"
  echo "     grep -rn 'initial={false}' components/ app/ | grep -v AnimatePresence for motion"
  exit 1
fi

echo "✓ All design token checks passed."
