#!/usr/bin/env bash
# Generates AGENTS.md from CLAUDE.md so the two assistant entry-points stay in
# lockstep. CLAUDE.md is the canonical source. The user runs both Claude Code
# and OpenAI Codex against this repo, so each gets a slightly tailored copy
# (titles, "Rules for X" header, and tool-config paths under ~/.claude vs
# ~/.Codex). Everything else is identical.
#
# Usage:
#   scripts/sync-agent-doc.sh           # regenerate AGENTS.md
#   scripts/sync-agent-doc.sh --check   # CI: fail if AGENTS.md drifted
#
# CI wires the --check mode into .github/workflows/ci.yml.

set -euo pipefail

SOURCE="CLAUDE.md"
TARGET="AGENTS.md"

if [ ! -f "$SOURCE" ]; then
  echo "sync-agent-doc: source $SOURCE not found in $(pwd)" >&2
  exit 1
fi

# Transformations applied when projecting CLAUDE.md -> AGENTS.md.
# Keep this list minimal. Anything tool-agnostic stays in CLAUDE.md.
generate() {
  sed \
    -e 's|^# CLAUDE\.md|# AGENTS.md|' \
    -e 's|Rules for Claude|Rules for Codex|g' \
    -e 's|~/\.claude/|~/.Codex/|g' \
    "$SOURCE"
}

case "${1:-}" in
  --check)
    if [ ! -f "$TARGET" ]; then
      echo "sync-agent-doc: $TARGET missing. Run scripts/sync-agent-doc.sh to generate it." >&2
      exit 1
    fi
    if ! diff -u "$TARGET" <(generate) >/dev/null; then
      echo "sync-agent-doc: $TARGET is out of sync with $SOURCE." >&2
      echo "Run: scripts/sync-agent-doc.sh" >&2
      echo "" >&2
      echo "Diff (current vs expected):" >&2
      diff -u "$TARGET" <(generate) >&2 || true
      exit 1
    fi
    echo "sync-agent-doc: $TARGET is in sync with $SOURCE."
    ;;
  "")
    generate > "$TARGET"
    echo "sync-agent-doc: regenerated $TARGET from $SOURCE."
    ;;
  *)
    echo "sync-agent-doc: unknown flag '$1'. Use --check or no args." >&2
    exit 2
    ;;
esac
