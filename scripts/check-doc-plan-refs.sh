#!/usr/bin/env bash
# scripts/check-doc-plan-refs.sh
# Fails if any surviving canon doc references a docs/plans/*.md path that does
# not exist on disk. Scoped to canon, not plans (plans referencing each other
# during a multi-step build is normal).
#
# Pattern: docs/plans/<slug>.md OR docs/plans/archive/<slug>.md
#
# Standalone or called from scripts/doc-audit.sh.

set -euo pipefail
cd "$(dirname "$0")/.."

BROKEN=()

# Canon set: root laws + docs/ excluding docs/plans/
CANON_FILES=$(find . -maxdepth 4 -name "*.md" \
  -not -path "./docs/plans/*" \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./.next/*" \
  -not -path "./.next-stale-*/*" \
  -not -path "./.agents/*" \
  | grep -E "^\./(CLAUDE\.md|AGENTS\.md|PRODUCT\.md|DESIGN\.md|docs/)" || true)

while IFS= read -r FILE; do
  [ -z "$FILE" ] && continue
  REFS=$(grep -oE 'docs/plans/(archive/)?[a-zA-Z0-9_./-]+\.md' "$FILE" || true)
  while IFS= read -r REF; do
    [ -z "$REF" ] && continue
    if [ ! -f "$REF" ]; then
      BROKEN+=("$FILE -> $REF")
    fi
  done <<< "$REFS"
done <<< "$CANON_FILES"

if [ ${#BROKEN[@]} -gt 0 ]; then
  echo "FAIL: broken docs/plans/ references in surviving canon:"
  for B in "${BROKEN[@]}"; do
    echo "  $B"
  done
  echo ""
  echo "Either restore the missing file, update the reference path (e.g. add archive/), or remove the reference."
  exit 1
fi

echo "OK: no broken docs/plans/ references in canon"
