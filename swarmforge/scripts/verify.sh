#!/usr/bin/env bash
# Thin wrapper for the canonical per-component verification runner.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec node "$SCRIPT_DIR/verify.mjs" "$@"
