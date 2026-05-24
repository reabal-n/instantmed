#!/bin/bash
# Ban the substring-keyword-match anti-pattern in clinical and safety code.
#
# Background: 2026-05-24 shipped a fix where
#     keywords.filter(keyword => lower.includes(keyword))
# in lib/clinical/auto-approval.ts was matching keyword strings INSIDE
# other words ("burns" inside "sunburns", "chronic" inside "chronicled",
# "iv" inside "intravenous"). Real patient input matched these substrings
# and was pushed into manual review, delaying revenue on
# legitimately-auto-approvable intakes.
#
# This script greps for the same anti-pattern in any new code under
# lib/clinical/ and lib/safety/ and fails the build if it returns. Use
# the word-boundary regex pattern documented in the canonical fix:
#     keywords.filter(keyword => keywordBoundaryRegex(keyword).test(text))
#
# Allowed exceptions (intentional substring matches):
# - URLs / paths / dotted identifiers in user agents, etc.
# - JSON.stringify outputs (no keyword-list semantics)
# Add them to the EXEMPT_FILES array below with a code comment.

set -euo pipefail

# Files allowed to use the substring pattern (intentional, not keyword
# matching). Empty for now; populate if false-positives surface.
EXEMPT_FILES=()

# Anti-pattern signatures. Each line is a grep -E pattern. Any match in
# a non-exempt file fails the build.
ANTIPATTERNS=(
  # The exact failure mode that shipped: a .filter() over a keyword list
  # that uses .includes() against lowercased text. Catches the original
  # signature and obvious paraphrases.
  '\.filter\([a-zA-Z_]+ +=> +[a-zA-Z_]+\.includes\([a-zA-Z_]+\)'
  '\.some\([a-zA-Z_]+ +=> +[a-zA-Z_]+\.includes\([a-zA-Z_]+\)'
)

SEARCH_DIRS=(
  "lib/clinical"
  "lib/safety"
)

failures=0

for dir in "${SEARCH_DIRS[@]}"; do
  if [ ! -d "$dir" ]; then
    continue
  fi

  for pattern in "${ANTIPATTERNS[@]}"; do
    matches=$(grep -rEn "$pattern" "$dir" --include="*.ts" --include="*.tsx" 2>/dev/null || true)
    if [ -z "$matches" ]; then
      continue
    fi

    while IFS= read -r line; do
      file=$(echo "$line" | cut -d: -f1)
      skip=0
      for exempt in "${EXEMPT_FILES[@]+"${EXEMPT_FILES[@]}"}"; do
        if [ "$file" = "$exempt" ]; then
          skip=1
          break
        fi
      done

      if [ "$skip" -eq 0 ]; then
        echo "❌ keyword-substring anti-pattern at $line"
        echo "   See lib/clinical/auto-approval.ts containsKeywords for the canonical word-boundary fix."
        failures=$((failures + 1))
      fi
    done <<< "$matches"
  done
done

if [ "$failures" -gt 0 ]; then
  echo ""
  echo "❌ Found $failures keyword-substring anti-pattern match(es) in clinical or safety code."
  echo "   Replace .includes(keyword) with a word-boundary regex per the canonical fix."
  echo "   If this match is intentional (not actually keyword matching), add the file path to EXEMPT_FILES in this script."
  exit 1
fi

echo "ok: no keyword-substring anti-patterns found in clinical or safety code."
