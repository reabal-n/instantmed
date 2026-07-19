#!/usr/bin/env bash

set -euo pipefail

event_name="${1:-}"

case "$event_name" in
  pull_request | push) ;;
  *)
    echo "true"
    exit 0
    ;;
esac

found_file=0
while IFS= read -r changed_file; do
  [ -z "$changed_file" ] && continue
  found_file=1

  case "$changed_file" in
    *.md) ;;
    *)
      echo "true"
      exit 0
      ;;
  esac
done

if [ "$found_file" -eq 1 ]; then
  echo "false"
else
  echo "true"
fi
