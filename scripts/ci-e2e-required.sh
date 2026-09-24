#!/usr/bin/env bash
# Fail closed: only known presentation/content paths use focused merge checks.
set -euo pipefail

event_name="${1:-}"
mode="${2:-full}"
found_file=0
docs_only=true
full=false

case "$event_name" in
  pull_request | push) ;;
  *)
    if [ "$mode" = docs ]; then echo false; else echo true; fi
    exit 0
    ;;
esac

while IFS= read -r changed_file; do
  [ -z "$changed_file" ] && continue
  found_file=1
  case "$changed_file" in
    *.md | docs/bookkeeping/expected-md-count) continue ;;
  esac
  docs_only=false
  case "$changed_file" in
    */route.ts | */route.js | */actions.ts | */actions.js | */actions/*) full=true ;;
    components/marketing/* | components/blog/* | lib/marketing/* | lib/blog/* | lib/seo/* | content/blog/* | public/images/* | public/fonts/*) ;;
    app/page.tsx | app/about/* | app/faq/* | app/contact/* | app/blog/* | app/conditions/* | app/medical-certificate/* | app/prescriptions/* | app/erectile-dysfunction/* | app/hair-loss/* | app/womens-health/* | app/weight-loss/*) ;;
    *) full=true ;;
  esac
done

if [ "$found_file" -eq 0 ]; then docs_only=false; full=true; fi
if [ "$mode" = docs ]; then echo "$docs_only"; else echo "$full"; fi
