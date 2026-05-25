#!/usr/bin/env bash
# scripts/doc-audit.sh
# Detects drift in the documentation surface.
# Run as: pnpm doc:audit
#
# Fails if:
#   - AGENTS.md drifted from CLAUDE.md (scripts/sync-agent-doc.sh --check)
#   - any of the 8 doc-pinning Vitest contracts fails
#   - the .md file count differs from docs/bookkeeping/expected-md-count
#   - any docs/plans/*.md reference in surviving canon points at a non-existent file
#
# If the count check fails intentionally (you added/removed a doc),
# update docs/bookkeeping/expected-md-count AND docs/bookkeeping/file-map.md
# in the same commit.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Sync check: AGENTS.md projected from CLAUDE.md"
scripts/sync-agent-doc.sh --check

echo "==> Vitest: doc-pinning contracts (8 specs)"
pnpm exec vitest run --reporter=dot \
  lib/__tests__/project-docs-drift-contract.test.ts \
  lib/__tests__/code-clean-retirement-contract.test.ts \
  lib/__tests__/release-check-contract.test.ts \
  lib/__tests__/service-launch-checklists-contract.test.ts \
  lib/__tests__/cron-surface-contract.test.ts \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts \
  lib/__tests__/password-reset-flow-contract.test.ts

echo "==> Doc surface count"
ACTUAL=$(find . -name "*.md" \
  -not -path "./node_modules/*" \
  -not -path "./.next/*" \
  -not -path "./.next-stale-*/*" \
  -not -path "./.git/*" \
  -not -path "./output/*" \
  -not -path "./playwright-report/*" \
  -not -path "./test-results/*" \
  -not -path "./.vercel/*" \
  -not -path "./.lighthouseci/*" \
  -not -path "./.playwright-cli/*" \
  -not -path "./.agents/*" \
  -not -path "./docs/reviews/*/*" \
  -not -path "./scripts/blog-photos/*" \
  | wc -l | tr -d ' ')
EXPECTED=$(cat docs/bookkeeping/expected-md-count | tr -d ' \n')
if [ "$ACTUAL" -ne "$EXPECTED" ]; then
  echo "FAIL: expected $EXPECTED .md files, found $ACTUAL"
  echo "If intentional, update docs/bookkeeping/expected-md-count AND docs/bookkeeping/file-map.md in the same commit."
  exit 1
fi
echo "OK: $ACTUAL .md files (matches expected)"

echo "==> Broken plan-reference check"
scripts/check-doc-plan-refs.sh

echo "==> doc:audit passed"
