#!/bin/bash
# Fast local/CI guard for the active Node runtime.
# Stack pins check package metadata; this checks the executable actually in use.

set -euo pipefail

EXPECTED_NODE_MAJOR="24"
EXPECTED_PACKAGE_MANAGER="pnpm@10.23.0"

if ! command -v node >/dev/null 2>&1; then
  echo "FAIL: node is not available on PATH"
  exit 1
fi

actual_node_version="$(node -p "process.versions.node")"
actual_node_major="${actual_node_version%%.*}"

if [[ "$actual_node_major" != "$EXPECTED_NODE_MAJOR" ]]; then
  echo "FAIL: active Node is v${actual_node_version}; expected Node ${EXPECTED_NODE_MAJOR}.x"
  echo "Use \`nvm use\`, \`fnm use\`, \`mise use\`, or Homebrew node@24 before running project commands."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "FAIL: pnpm is not available on PATH"
  exit 1
fi

expected_pnpm="${EXPECTED_PACKAGE_MANAGER#pnpm@}"
actual_pnpm="$(pnpm -v)"

if [[ "$actual_pnpm" != "$expected_pnpm" ]]; then
  echo "FAIL: active pnpm is ${actual_pnpm}; expected ${expected_pnpm}"
  echo "Run \`corepack prepare ${EXPECTED_PACKAGE_MANAGER} --activate\` or install the pinned pnpm version."
  exit 1
fi

echo "ok: active Node v${actual_node_version} and pnpm ${actual_pnpm}"
