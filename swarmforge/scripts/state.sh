#!/usr/bin/env bash
# Print current SwarmForge state: each role branch's HEAD and the main checkout
# working-tree status. Use this to refresh the "Current master HEAD" section of
# the specifier briefing without manual git inspection.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

head_line() {
  local branch="$1"
  if git rev-parse --verify -q "$branch" >/dev/null 2>&1; then
    printf '%s HEAD: %s %s\n' "$branch" "$(git rev-parse --short=10 "$branch")" "$(git log -1 --format=%s "$branch")"
  fi
}

head_line master
head_line swarmforge-coder
head_line swarmforge-refactorer
head_line swarmforge-architect

if [ -n "$(git status --porcelain)" ]; then
  echo "main working tree: dirty"
else
  echo "main working tree: clean"
fi
