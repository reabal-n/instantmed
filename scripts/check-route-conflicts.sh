#!/bin/bash
# Detect Next.js route conflicts: a page.tsx inside a route group that
# duplicates a page.tsx at the same effective URL path.
#
# Route groups use (parentheses) and don't add URL segments, so:
#   app/foo/page.tsx  AND  app/foo/(bar)/page.tsx  → both resolve to /foo
#
# Exit 1 if any conflicts found.

set -euo pipefail

conflicts=0

# Find all page.tsx files inside route groups (dirs with parens)
while IFS= read -r grouped_page; do
  # Get the route group dir, e.g. app/medical-certificate/(main)
  group_dir=$(dirname "$grouped_page")
  # Get the parent dir, e.g. app/medical-certificate
  parent_dir=$(dirname "$group_dir")
  # Check if parent also has a page.tsx
  if [[ -f "$parent_dir/page.tsx" || -f "$parent_dir/page.ts" || -f "$parent_dir/page.jsx" || -f "$parent_dir/page.js" ]]; then
    echo "CONFLICT: $grouped_page conflicts with $(ls "$parent_dir"/page.* 2>/dev/null | head -1)"
    echo "  Both resolve to the same URL. Remove one."
    conflicts=$((conflicts + 1))
  fi
done < <(find app -path '*/(*)/page.tsx' -o -path '*/(*)/page.ts' -o -path '*/(*)/page.jsx' -o -path '*/(*)/page.js' 2>/dev/null)

if [[ $conflicts -gt 0 ]]; then
  echo ""
  echo "Found $conflicts route conflict(s). Fix before deploying."
  exit 1
fi

echo "No route conflicts found."
