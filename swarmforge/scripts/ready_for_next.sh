#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Recovery: if the handoff daemon died, wake-ups never arrive and queued
# handoffs sit in outboxes. Ensure it is alive before checking for work.
"$SCRIPT_DIR/ensure_handoff_daemon.sh" || true

exec bb "$SCRIPT_DIR/ready_for_next.bb" "$@"
