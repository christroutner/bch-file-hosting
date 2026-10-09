#!/usr/bin/env bash
# Run mutate4javascript on one source file and guard against silent
# differential under-selection.
#
# The default differential run can select fewer covered mutations than exist
# after a function is added or removed. When Selected < Covered, this wrapper
# reruns once with --mutate-all so new mutations are not skipped.
#
# Run from the component directory (so the tool's `npm test` baseline works):
#   swarmforge/scripts/mutate-file.sh src/<file>.js [options...]
set -uo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: mutate-file.sh <source-file.js> [mutate4javascript options...]" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BIN="${MUTATE4JS_BIN:-$ROOT/bch-file-hosting-api/node_modules/mutate4javascript/bin/mutate4javascript.js}"

if [ ! -f "$BIN" ]; then
  echo "mutate-file: cannot find mutate4javascript at $BIN" >&2
  exit 1
fi

SOURCE="$1"
shift

already_all=0
for arg in "$@"; do
  [ "$arg" = "--mutate-all" ] && already_all=1
done

mkdir -p "$ROOT/tmp"
OUT="$(mktemp "$ROOT/tmp/mutate-file.XXXXXX")"
trap 'rm -f "$OUT"' EXIT

node "$BIN" "$SOURCE" "$@" 2>&1 | tee "$OUT"
status=${PIPESTATUS[0]}

if [ "$already_all" -eq 0 ]; then
  covered="$(grep -oE 'Covered mutation sites: [0-9]+' "$OUT" | grep -oE '[0-9]+' | tail -1)"
  selected="$(grep -oE 'Selected mutation sites: [0-9]+' "$OUT" | grep -oE '[0-9]+' | tail -1)"
  if [ -n "${covered:-}" ] && [ -n "${selected:-}" ] && [ "$selected" -lt "$covered" ]; then
    echo "" >&2
    echo "mutate-file: selected $selected of $covered covered sites (differential under-selection); rerunning with --mutate-all" >&2
    node "$BIN" "$SOURCE" "$@" --mutate-all
    status=$?
  fi
fi

exit "$status"
