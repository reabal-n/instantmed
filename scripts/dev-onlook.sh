#!/bin/bash
# Run dev server with Onlook visual editor enabled
# This temporarily disables instrumentation (incompatible with Onlook's SWC plugin)

cd "$(dirname "$0")/.."

# Backup instrumentation file
if [ -f instrumentation.ts ]; then
  mv instrumentation.ts instrumentation.ts.bak
  echo "✓ Temporarily disabled instrumentation.ts"
fi

# Restore on exit
cleanup() {
  if [ -f instrumentation.ts.bak ]; then
    mv instrumentation.ts.bak instrumentation.ts
    echo "✓ Restored instrumentation.ts"
  fi
}
trap cleanup EXIT

# Run dev server with Onlook (suppress Sentry warning about missing instrumentation)
rm -rf .next
ONLOOK=1 SENTRY_SUPPRESS_INSTRUMENTATION_FILE_WARNING=1 npx next dev

