#!/bin/bash
# Production build wrapper used by CI and local release checks.
# Keeps build timing and output capture consistent for the bundle gate.

set -euo pipefail

BUILD_OUT="${BUILD_OUT:-/tmp/next-build-output.txt}"
BUILD_TARGET_SECONDS="${BUILD_TARGET_SECONDS:-180}"
BUILD_BUDGET_SECONDS="${BUILD_BUDGET_SECONDS:-210}"

rm -f "$BUILD_OUT"

start="$(date +%s)"
pnpm build 2>&1 | tee "$BUILD_OUT"
elapsed=$(( $(date +%s) - start ))

echo "Build completed in ${elapsed}s (target: ${BUILD_TARGET_SECONDS}s; warning budget: ${BUILD_BUDGET_SECONDS}s)"

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## Build timing"
    echo ""
    echo "- Build: ${elapsed}s"
    echo "- Target: ${BUILD_TARGET_SECONDS}s"
    echo "- Warning budget: ${BUILD_BUDGET_SECONDS}s"
    echo "- Output: \`${BUILD_OUT}\`"
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [[ "$elapsed" -gt "$BUILD_BUDGET_SECONDS" ]]; then
  message="Build exceeded ${BUILD_BUDGET_SECONDS}s warning budget (${elapsed}s; target ${BUILD_TARGET_SECONDS}s) -- check for route or bundle bloat"
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "::warning::${message}"
  else
    echo "WARNING: ${message}"
  fi
fi
