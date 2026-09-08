#!/usr/bin/env bash
# Codex reads .agents/skills directly. Claude uses relative project-local links.
# Refuse to replace real files/directories or unrelated links.
set -euo pipefail
cd "$(dirname "$0")/.."
SOURCE_DIR=".agents/skills"
TARGET_DIR=".claude/skills"
case "${1:-}" in
  ""|--check) ;;
  *) echo "Usage: scripts/sync-agent-skills.sh [--check]" >&2; exit 2 ;;
esac
failed=0
count=0
for source_path in "$SOURCE_DIR"/*; do
  [ -f "$source_path/SKILL.md" ] || continue
  skill="${source_path##*/}"
  target_path="$TARGET_DIR/$skill"
  expected="../../.agents/skills/$skill"
  count=$((count + 1))
  if [ -L "$target_path" ] && [ "$(readlink "$target_path")" = "$expected" ]; then
    continue
  fi
  if [ "${1:-}" = --check ] || [ -e "$target_path" ] || [ -L "$target_path" ]; then
    echo "sync-agent-skills: missing or conflicting project link $target_path" >&2
    failed=1
  else
    mkdir -p "$TARGET_DIR"
    ln -s "$expected" "$target_path"
  fi
done
if [ "$count" -eq 0 ]; then
  echo "sync-agent-skills: no source skills found" >&2
  exit 1
fi
[ "$failed" -eq 0 ] || exit 1
echo "sync-agent-skills: $count project-local links match $SOURCE_DIR."
