#!/bin/bash
# Stack pin guard: hard-fail if any framework dep drifts from the locked version.
#
# Why: Next.js 16 / React 19 / Turbopack / Framer Motion 12 caused recurring
# dev-server crashes and required local workarounds. We pinned the stable stack
# in 2026-04-07 (commit 548e6e3da). This script enforces that pin in CI so an
# accidental `pnpm add next@latest` (or an LLM-suggested upgrade) cannot land.
#
# To intentionally upgrade: edit EXPECTED_* below in the same PR that bumps
# package.json, document the reason in CLAUDE.md gotchas, and have a human
# explicitly approve. NEVER bypass this script.
#
# Exit 1 if any pin is wrong.

set -euo pipefail

# ─── EXPECTED PINNED VERSIONS ──────────────────────────────────────────────
# Update these in lockstep with package.json + pnpm.overrides.
EXPECTED_NEXT="15.5.14"
EXPECTED_REACT="18.3.1"
EXPECTED_REACT_DOM="18.3.1"
EXPECTED_FRAMER_MOTION="11.18.2"
EXPECTED_TAILWIND="4.2.2"
EXPECTED_TAILWIND_POSTCSS="4.2.2"
# ───────────────────────────────────────────────────────────────────────────

PKG="package.json"
errors=0

if [[ ! -f "$PKG" ]]; then
  echo "ERROR: $PKG not found. Run from repo root."
  exit 1
fi

# Pull a "name": "version" from dependencies / devDependencies (exact match,
# not a range with ^ or ~). Returns empty if not found or if range syntax used.
get_exact_version() {
  local name="$1"
  # node -e is more reliable than grep for JSON parsing
  node -e "
    const pkg = require('./$PKG');
    const v = (pkg.dependencies && pkg.dependencies['$name']) ||
              (pkg.devDependencies && pkg.devDependencies['$name']) || '';
    process.stdout.write(v);
  "
}

get_override_version() {
  local name="$1"
  node -e "
    const pkg = require('./$PKG');
    const v = (pkg.pnpm && pkg.pnpm.overrides && pkg.pnpm.overrides['$name']) || '';
    process.stdout.write(v);
  "
}

check_pin() {
  local name="$1"
  local expected="$2"
  local source="$3"  # "deps" or "override"

  local actual
  if [[ "$source" == "override" ]]; then
    actual=$(get_override_version "$name")
  else
    actual=$(get_exact_version "$name")
  fi

  if [[ -z "$actual" ]]; then
    echo "FAIL: $name not found in $PKG ($source)"
    errors=$((errors + 1))
    return
  fi

  # Reject any range syntax (^, ~, >, *, x)
  if [[ "$actual" =~ [\^~\>*x] ]]; then
    echo "FAIL: $name = '$actual' uses range syntax — must be exact ($expected)"
    errors=$((errors + 1))
    return
  fi

  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: $name = '$actual', expected '$expected' ($source)"
    errors=$((errors + 1))
    return
  fi

  echo "ok:   $name = $actual ($source)"
}

echo "── Stack pin check ──"
check_pin "next"                  "$EXPECTED_NEXT"             "deps"
check_pin "react"                 "$EXPECTED_REACT"            "deps"
check_pin "react-dom"             "$EXPECTED_REACT_DOM"        "deps"
check_pin "framer-motion"         "$EXPECTED_FRAMER_MOTION"    "deps"
check_pin "tailwindcss"           "$EXPECTED_TAILWIND"         "deps"
check_pin "@tailwindcss/postcss"  "$EXPECTED_TAILWIND_POSTCSS" "deps"

echo "── pnpm.overrides check ──"
check_pin "next"                  "$EXPECTED_NEXT"             "override"
check_pin "react"                 "$EXPECTED_REACT"            "override"
check_pin "react-dom"             "$EXPECTED_REACT_DOM"        "override"
check_pin "framer-motion"         "$EXPECTED_FRAMER_MOTION"    "override"
check_pin "tailwindcss"           "$EXPECTED_TAILWIND"         "override"
check_pin "@tailwindcss/postcss"  "$EXPECTED_TAILWIND_POSTCSS" "override"

if [[ $errors -gt 0 ]]; then
  echo ""
  echo "✖ $errors stack pin violation(s)."
  echo ""
  echo "Why this exists: Next 16 / React 19 / Turbopack caused recurring dev-server"
  echo "crashes (see CLAUDE.md → Stack Pin Policy and docs/plans/2026-04-07-stable-stack-downgrade.md)."
  echo ""
  echo "If this drift is intentional, update EXPECTED_* in scripts/check-stack-pins.sh"
  echo "in the same PR — and document why in CLAUDE.md."
  exit 1
fi

echo ""
echo "✓ All framework versions pinned correctly."
