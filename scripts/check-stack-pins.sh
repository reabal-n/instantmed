#!/bin/bash
# Stack pin guard: hard-fail if any framework dep or framework-adjacent tool
# drifts from the locked version.
#
# Why: Next.js 16 / React 19 / Turbopack / Framer Motion 12 caused recurring
# dev-server crashes and required local workarounds. We pinned the stable stack
# in 2026-04-07 (commit 548e6e3da). This script enforces that pin in CI so an
# accidental `pnpm add next@latest` (or an LLM-suggested upgrade) cannot land.
#
# To intentionally upgrade: edit EXPECTED_* below in the same PR that bumps
# package.json, document the reason in CLAUDE.md gotchas, and have a human
# explicitly approve. NEVER bypass this script.
#
# Exit 1 if any pin is wrong.

set -euo pipefail

# ─── EXPECTED PINNED VERSIONS ──────────────────────────────────────────────
# Update these in lockstep with package.json + pnpm.overrides.
EXPECTED_NEXT="15.5.18"
EXPECTED_NEXT_TOOLING="15.5.18"
EXPECTED_REACT="18.3.1"
EXPECTED_REACT_DOM="18.3.1"
EXPECTED_TYPES_REACT="18.3.12"
EXPECTED_TYPES_REACT_DOM="18.3.1"
EXPECTED_FRAMER_MOTION="11.18.2"
EXPECTED_TAILWIND="4.2.2"
EXPECTED_TAILWIND_POSTCSS="4.2.2"
EXPECTED_NODE_ENGINE="24.x"
EXPECTED_NVMRC="24"
EXPECTED_NODE_VERSION_FILE="24"
EXPECTED_PACKAGE_MANAGER="pnpm@10.23.0"
EXPECTED_CHECKOUT_ACTION="actions/checkout@v6.0.2"
EXPECTED_SETUP_NODE_ACTION="actions/setup-node@v6.4.0"
EXPECTED_PNPM_ACTION="pnpm/action-setup@v6.0.5"
EXPECTED_UPLOAD_ARTIFACT_ACTION="actions/upload-artifact@v7.0.1"
# ───────────────────────────────────────────────────────────────────────────

PKG="package.json"
errors=0

if [[ ! -f "$PKG" ]]; then
  echo "ERROR: $PKG not found. Run from repo root."
  exit 1
fi

# Pull a "name": "version" from dependencies / devDependencies (exact match,
# not a range with ^ or ~). Returns empty if not found or if range syntax used.
get_exact_version() {
  local name="$1"
  # node -e is more reliable than grep for JSON parsing
  node -e "
    const pkg = require('./$PKG');
    const v = (pkg.dependencies && pkg.dependencies['$name']) ||
              (pkg.devDependencies && pkg.devDependencies['$name']) || '';
    process.stdout.write(v);
  "
}

get_override_version() {
  local name="$1"
  node -e "
    const pkg = require('./$PKG');
    const v = (pkg.pnpm && pkg.pnpm.overrides && pkg.pnpm.overrides['$name']) || '';
    process.stdout.write(v);
  "
}

check_pin() {
  local name="$1"
  local expected="$2"
  local source="$3"  # "deps" or "override"

  local actual
  if [[ "$source" == "override" ]]; then
    actual=$(get_override_version "$name")
  else
    actual=$(get_exact_version "$name")
  fi

  if [[ -z "$actual" ]]; then
    echo "FAIL: $name not found in $PKG ($source)"
    errors=$((errors + 1))
    return
  fi

  # Single equality check is sufficient. We previously had a bracket-class
  # regex to detect range syntax (^/~/>/*/x) but bash regex bracket-class
  # parsing differs between bash 3 (macOS) and bash 5 (Ubuntu CI) and was
  # producing false positives. If anyone introduces "^15.5.14" instead of
  # "15.5.14", the equality check below catches it just as well — the
  # error message is slightly less specific but the gate still holds.
  if [[ "$actual" != "$expected" ]]; then
    if [[ "$actual" == *"^"* || "$actual" == *"~"* || "$actual" == *">"* || "$actual" == *"*"* || "$actual" == *"x"* ]]; then
      echo "FAIL: $name = '$actual' uses range syntax — must be exact ($expected)"
    else
      echo "FAIL: $name = '$actual', expected '$expected' ($source)"
    fi
    errors=$((errors + 1))
    return
  fi

  echo "ok:   $name = $actual ($source)"
}

check_package_field() {
  local field="$1"
  local expected="$2"

  local actual
  actual=$(node -e "
    const pkg = require('./$PKG');
    const value = '$field'.split('.').reduce((current, key) => current && current[key], pkg) || '';
    process.stdout.write(value);
  ")

  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: $field = '$actual', expected '$expected'"
    errors=$((errors + 1))
    return
  fi

  echo "ok:   $field = $actual"
}

check_no_duplicate_dependencies() {
  local duplicates
  duplicates=$(node -e "
    const pkg = require('./$PKG');
    const deps = Object.keys(pkg.dependencies || {});
    const devDeps = new Set(Object.keys(pkg.devDependencies || {}));
    process.stdout.write(deps.filter((name) => devDeps.has(name)).join(', '));
  ")

  if [[ -n "$duplicates" ]]; then
    echo "FAIL: packages listed in both dependencies and devDependencies: $duplicates"
    errors=$((errors + 1))
    return
  fi

  echo "ok:   no duplicate dependency declarations"
}

check_no_turbopack_flags() {
  local matches
  matches=$(node -e "
    const pkg = require('./$PKG');
    const scripts = Object.entries(pkg.scripts || {});
    const flagged = scripts
      .filter(([, command]) => /--turbo\\b|--turbopack\\b/.test(command))
      .map(([name, command]) => name + '=' + command);
    process.stdout.write(flagged.join(' | '));
  ")

  if [[ -n "$matches" ]]; then
    echo "FAIL: Turbopack flags are not allowed in package scripts: $matches"
    errors=$((errors + 1))
    return
  fi

  echo "ok:   package scripts use webpack, not Turbopack flags"
}

check_workflow_node_runtime_source() {
  local result
  result=$(node -e "
    const fs = require('fs');
    const path = require('path');
    const dir = '.github/workflows';
    if (!fs.existsSync(dir)) {
      process.stdout.write(JSON.stringify({ missingDir: true, hardcoded: [], missingNvmrc: [] }));
      process.exit(0);
    }
    const files = fs.readdirSync(dir)
      .filter((name) => /\\.ya?ml$/.test(name))
      .map((name) => path.join(dir, name));
    const hardcoded = [];
    const missingNvmrc = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes('actions/setup-node')) continue;
      const lines = content.split(/\\r?\\n/);
      lines.forEach((line, index) => {
        if (/\\bnode-version\\s*:/.test(line)) {
          hardcoded.push(file + ':' + (index + 1));
        }
      });
      if (!/node-version-file\\s*:\\s*['\\\"]?\\.nvmrc['\\\"]?/.test(content)) {
        missingNvmrc.push(file);
      }
    }
    process.stdout.write(JSON.stringify({ missingDir: false, hardcoded, missingNvmrc }));
  ")

  local missing_dir hardcoded missing_nvmrc
  missing_dir=$(node -e "const r = $result; process.stdout.write(String(r.missingDir));")
  hardcoded=$(node -e "const r = $result; process.stdout.write(r.hardcoded.join(', '));")
  missing_nvmrc=$(node -e "const r = $result; process.stdout.write(r.missingNvmrc.join(', '));")

  if [[ "$missing_dir" == "true" ]]; then
    echo "ok:   no GitHub workflow directory to check"
    return
  fi

  if [[ -n "$hardcoded" ]]; then
    echo "FAIL: GitHub workflows must use node-version-file: .nvmrc, not hardcoded node-version: $hardcoded"
    errors=$((errors + 1))
    return
  fi

  if [[ -n "$missing_nvmrc" ]]; then
    echo "FAIL: GitHub setup-node steps missing node-version-file: .nvmrc in $missing_nvmrc"
    errors=$((errors + 1))
    return
  fi

  echo "ok:   GitHub workflows read Node runtime from .nvmrc"
}

check_workflow_action_pins() {
  local violations
  violations=$(node -e "
    const fs = require('fs');
    const path = require('path');
    const dir = '.github/workflows';
    const expected = new Map([
      ['actions/checkout', '$EXPECTED_CHECKOUT_ACTION'],
      ['actions/setup-node', '$EXPECTED_SETUP_NODE_ACTION'],
      ['actions/upload-artifact', '$EXPECTED_UPLOAD_ARTIFACT_ACTION'],
      ['pnpm/action-setup', '$EXPECTED_PNPM_ACTION'],
    ]);
    if (!fs.existsSync(dir)) {
      process.exit(0);
    }
    const files = fs.readdirSync(dir)
      .filter((name) => /\\.ya?ml$/.test(name))
      .map((name) => path.join(dir, name));
    const failures = [];
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split(/\\r?\\n/);
      lines.forEach((line, index) => {
        const match = line.match(/uses:\\s*([^\\s#]+)/);
        if (!match) return;
        for (const [prefix, wanted] of expected) {
          if (match[1].startsWith(prefix + '@') && match[1] !== wanted) {
            failures.push(file + ':' + (index + 1) + ' uses ' + match[1] + ', expected ' + wanted);
          }
        }
      });
    }
    process.stdout.write(failures.join('\\n'));
  ")

  if [[ -n "$violations" ]]; then
    echo "FAIL: GitHub workflow action pins drifted:"
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      echo "  $line"
    done <<< "$violations"
    errors=$((errors + 1))
    return
  fi

  echo "ok:   GitHub workflow actions are pinned to Node 24-compatible versions"
}

check_file_content() {
  local file="$1"
  local expected="$2"

  if [[ ! -f "$file" ]]; then
    echo "FAIL: $file is missing"
    errors=$((errors + 1))
    return
  fi

  local actual
  actual=$(tr -d '\r\n' < "$file")

  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: $file = '$actual', expected '$expected'"
    errors=$((errors + 1))
    return
  fi

  echo "ok:   $file = $actual"
}

echo "── Stack pin check ──"
check_pin "next"                  "$EXPECTED_NEXT"             "deps"
check_pin "@next/bundle-analyzer" "$EXPECTED_NEXT_TOOLING"     "deps"
check_pin "@next/eslint-plugin-next" "$EXPECTED_NEXT_TOOLING"  "deps"
check_pin "react"                 "$EXPECTED_REACT"            "deps"
check_pin "react-dom"             "$EXPECTED_REACT_DOM"        "deps"
check_pin "@types/react"          "$EXPECTED_TYPES_REACT"      "deps"
check_pin "@types/react-dom"      "$EXPECTED_TYPES_REACT_DOM"  "deps"
check_pin "framer-motion"         "$EXPECTED_FRAMER_MOTION"    "deps"
check_pin "tailwindcss"           "$EXPECTED_TAILWIND"         "deps"
check_pin "@tailwindcss/postcss"  "$EXPECTED_TAILWIND_POSTCSS" "deps"

echo "── pnpm.overrides check ──"
check_pin "next"                  "$EXPECTED_NEXT"             "override"
check_pin "@next/bundle-analyzer" "$EXPECTED_NEXT_TOOLING"     "override"
check_pin "@next/eslint-plugin-next" "$EXPECTED_NEXT_TOOLING"  "override"
check_pin "react"                 "$EXPECTED_REACT"            "override"
check_pin "react-dom"             "$EXPECTED_REACT_DOM"        "override"
check_pin "@types/react"          "$EXPECTED_TYPES_REACT"      "override"
check_pin "@types/react-dom"      "$EXPECTED_TYPES_REACT_DOM"  "override"
check_pin "framer-motion"         "$EXPECTED_FRAMER_MOTION"    "override"
check_pin "tailwindcss"           "$EXPECTED_TAILWIND"         "override"
check_pin "@tailwindcss/postcss"  "$EXPECTED_TAILWIND_POSTCSS" "override"

echo "── Runtime/tooling consistency check ──"
check_package_field "engines.node" "$EXPECTED_NODE_ENGINE"
check_file_content ".nvmrc" "$EXPECTED_NVMRC"
check_file_content ".node-version" "$EXPECTED_NODE_VERSION_FILE"
check_package_field "packageManager" "$EXPECTED_PACKAGE_MANAGER"
check_no_duplicate_dependencies
check_no_turbopack_flags
check_workflow_node_runtime_source
check_workflow_action_pins

if [[ $errors -gt 0 ]]; then
  echo ""
  echo "✖ $errors stack pin violation(s)."
  echo ""
  echo "Why this exists: Next 16 / React 19 / Turbopack caused recurring dev-server"
  echo "crashes (see CLAUDE.md → Stack Pin Policy and docs/plans/2026-04-07-stable-stack-downgrade.md)."
  echo ""
  echo "If this drift is intentional, update EXPECTED_* in scripts/check-stack-pins.sh"
  echo "in the same PR — and document why in CLAUDE.md."
  exit 1
fi

echo ""
echo "✓ All framework versions and stack tooling are pinned consistently."
