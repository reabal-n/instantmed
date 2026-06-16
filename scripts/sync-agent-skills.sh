#!/usr/bin/env bash
# Installs the repo-owned InstantMed agent skills into local tool discovery
# folders. The canonical source is .agent-skills/; ~/.agents/skills and
# ~/.claude/skills are generated install targets.
#
# Usage:
#   scripts/sync-agent-skills.sh           # install/update local targets
#   scripts/sync-agent-skills.sh --check   # fail if installed targets drift

set -euo pipefail
cd "$(dirname "$0")/.."

SOURCE_DIR=".agent-skills"
TARGETS=(
  "$HOME/.agents/skills"
  "$HOME/.claude/skills"
)

if [ ! -d "$SOURCE_DIR" ]; then
  echo "sync-agent-skills: source $SOURCE_DIR not found in $(pwd)" >&2
  exit 1
fi

SKILLS=()
while IFS= read -r skill; do
  SKILLS+=("$skill")
done < <(find "$SOURCE_DIR" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)

if [ "${#SKILLS[@]}" -eq 0 ]; then
  echo "sync-agent-skills: no skills found under $SOURCE_DIR" >&2
  exit 1
fi

check_skill() {
  local skill="$1"
  local target_root="$2"
  local source_path="$SOURCE_DIR/$skill"
  local target_path="$target_root/$skill"

  if [ ! -d "$target_path" ]; then
    echo "sync-agent-skills: missing installed skill $target_path" >&2
    return 1
  fi

  diff -ru "$source_path" "$target_path" >/dev/null
}

install_skill() {
  local skill="$1"
  local target_root="$2"
  local source_path="$SOURCE_DIR/$skill"
  local target_path="$target_root/$skill"

  mkdir -p "$target_root"
  rm -rf "$target_path"
  cp -R "$source_path" "$target_path"
}

case "${1:-}" in
  --check)
    failed=0
    for target in "${TARGETS[@]}"; do
      for skill in "${SKILLS[@]}"; do
        if ! check_skill "$skill" "$target"; then
          echo "sync-agent-skills: $target/$skill differs from $SOURCE_DIR/$skill" >&2
          failed=1
        fi
      done
    done

    if [ "$failed" -ne 0 ]; then
      echo "sync-agent-skills: run scripts/sync-agent-skills.sh to refresh local installs." >&2
      exit 1
    fi

    echo "sync-agent-skills: local Codex and Claude skill installs match $SOURCE_DIR."
    ;;
  "")
    for target in "${TARGETS[@]}"; do
      for skill in "${SKILLS[@]}"; do
        install_skill "$skill" "$target"
      done
      echo "sync-agent-skills: installed ${#SKILLS[@]} skills into $target."
    done
    ;;
  *)
    echo "sync-agent-skills: unknown flag '$1'. Use --check or no args." >&2
    exit 2
    ;;
esac
