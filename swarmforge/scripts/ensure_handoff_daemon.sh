#!/usr/bin/env bash
# Ensure the SwarmForge handoff daemon is running for this project.
#
# The daemon delivers queued handoffs from each role's outbox to recipient
# inboxes and wakes the recipients. If it is not running, handoffs sit
# undelivered. This script is idempotent: it starts the daemon only when no
# live pid exists and no stop file is present.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v bb >/dev/null 2>&1; then
  echo "ensure_handoff_daemon: bb not found; cannot ensure handoff daemon" >&2
  exit 0
fi

common="$(git rev-parse --git-common-dir 2>/dev/null || true)"
if [ -z "$common" ]; then
  exit 0
fi
common_abs="$(cd "$common" 2>/dev/null && pwd || true)"
if [ -z "$common_abs" ]; then
  exit 0
fi

project_root="$(dirname "$common_abs")"
if [ ! -f "$project_root/.swarmforge/roles.tsv" ]; then
  exit 0
fi

daemon_dir="$project_root/.swarmforge/daemon"
pid_file="$daemon_dir/handoffd.pid"
stop_file="$daemon_dir/stop"

if [ -f "$stop_file" ]; then
  exit 0
fi

if [ -f "$pid_file" ]; then
  pid="$(tr -dc '0-9' < "$pid_file" 2>/dev/null || true)"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    exit 0
  fi
fi

mkdir -p "$daemon_dir"
nohup bb "$SCRIPT_DIR/handoffd.bb" "$project_root" >/dev/null 2>&1 &
disown 2>/dev/null || true
# stderr, so it never mixes into callers' parseable stdout (HANDOFF QUEUED: ...).
echo "ensure_handoff_daemon: started handoff daemon for $project_root" >&2
