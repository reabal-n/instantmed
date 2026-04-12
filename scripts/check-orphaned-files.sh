#!/bin/bash
# Detect orphaned files that should have been cleaned up.
#
# Checks:
#   1. Intake step files not registered in step-registry.ts
#   2. Files under deleted route groups (/flow/)
#   3. @deprecated modules with zero imports
#
# Exit 1 if any orphans found.

set -euo pipefail

orphans=0

echo "Checking for orphaned files..."

# ── 1. Intake steps not in step registry ──────────────────────────────────
registry="lib/request/step-registry.ts"
if [[ -f "$registry" ]]; then
  for step_file in components/request/steps/*-step.tsx; do
    [[ -f "$step_file" ]] || continue
    # Extract component name from filename (e.g., ed-goals-step.tsx -> EdGoalsStep)
    basename_no_ext=$(basename "$step_file" .tsx)
    # Check if the step ID (kebab-case without -step suffix) appears in the registry
    step_id="${basename_no_ext%-step}"
    if ! grep -q "$step_id" "$registry" 2>/dev/null; then
      echo "ORPHAN: $step_file is not registered in $registry"
      orphans=$((orphans + 1))
    fi
  done
fi

# ── 2. Files under deleted /flow/ route group ────────────────────────────
if [[ -d "app/api/flow" ]]; then
  echo "ORPHAN: app/api/flow/ still exists (the /flow system was deleted)"
  orphans=$((orphans + 1))
fi
if [[ -d "app/flow" ]] || [[ -d "app/(flow)" ]]; then
  echo "ORPHAN: app/flow/ or app/(flow)/ still exists (the /flow system was deleted)"
  orphans=$((orphans + 1))
fi

# ── 3. @deprecated modules with zero imports ─────────────────────────────
while IFS= read -r deprecated_file; do
  [[ -f "$deprecated_file" ]] || continue
  # Get the import path (e.g., lib/foo/bar.ts -> @/lib/foo/bar)
  import_path="${deprecated_file%.ts}"
  import_path="${import_path%.tsx}"
  # Check if anything imports from this file (excluding the file itself)
  import_count=$(grep -rl "$import_path" --include="*.ts" --include="*.tsx" . 2>/dev/null \
    | grep -v node_modules \
    | grep -v .next \
    | grep -v .worktrees \
    | grep -v "$deprecated_file" \
    | wc -l | tr -d ' ')
  if [[ "$import_count" -eq 0 ]]; then
    echo "ORPHAN: $deprecated_file is @deprecated with 0 imports"
    orphans=$((orphans + 1))
  fi
done < <(grep -rl "@deprecated" --include="*.ts" --include="*.tsx" . 2>/dev/null \
  | grep -v node_modules \
  | grep -v .next \
  | grep -v .worktrees)

# ── 4. Stale worktree directories ────────────────────────────────────────
if [[ -d ".worktrees" ]]; then
  registered=$(git worktree list --porcelain 2>/dev/null | grep "^worktree " | wc -l | tr -d ' ')
  ondisk=$(find .worktrees -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$ondisk" -gt 0 ]]; then
    echo "WARNING: .worktrees/ has $ondisk directories but only $registered are registered with git"
    orphans=$((orphans + 1))
  fi
fi

# ── Results ──────────────────────────────────────────────────────────────
if [[ $orphans -gt 0 ]]; then
  echo ""
  echo "Found $orphans orphaned file(s). Clean up before deploying."
  exit 1
fi

echo "No orphaned files found."
