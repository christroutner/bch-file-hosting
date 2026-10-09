#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Handoffs sit undelivered if the daemon is not running, so make sure it is
# alive before queueing. Starting it here is idempotent and self-healing.
"$SCRIPT_DIR/ensure_handoff_daemon.sh" || true

exec bb "$SCRIPT_DIR/swarm_handoff.bb" "$@"
