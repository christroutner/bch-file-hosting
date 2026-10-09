#!/usr/bin/env bash
# Ensure the canonical Acceptance Pipeline Specification checkout at
# <repo-root>/tmp/aps, and optionally update it to latest upstream.
#
# Usage:
#   ensure-aps.sh            # ensure present only (no network if present)
#   ensure-aps.sh --update   # fetch/reset to latest upstream default branch
#   ensure-aps.sh --reclone  # delete and clone fresh
#
# Prints the checkout path on stdout. All APS consumers should use this path
# (tmp/aps) so there is exactly one checkout.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APS_URL="https://github.com/unclebob/Acceptance-Pipeline-Specification.git"

mode="${1:-ensure}"
case "$mode" in
  ensure | --update | --reclone) ;;
  *)
    echo "usage: ensure-aps.sh [--update|--reclone]" >&2
    exit 2
    ;;
esac

common="$(git rev-parse --git-common-dir 2>/dev/null || true)"
if [ -z "$common" ]; then
  echo "ensure-aps: not in a git repository" >&2
  exit 1
fi
common_abs="$(cd "$common" 2>/dev/null && pwd || true)"
project_root="$(dirname "$common_abs")"
APS_DIR="$project_root/tmp/aps"

if [ "$mode" = "--reclone" ]; then
  rm -rf "$APS_DIR"
fi

if [ ! -d "$APS_DIR/.git" ]; then
  rm -rf "$APS_DIR"
  mkdir -p "$(dirname "$APS_DIR")"
  git clone --depth 1 "$APS_URL" "$APS_DIR" >&2
elif [ "$mode" = "--update" ]; then
  if git -C "$APS_DIR" fetch --depth 1 origin main:refs/remotes/origin/main >/dev/null 2>&1; then
    git -C "$APS_DIR" reset --hard refs/remotes/origin/main >/dev/null 2>&1
  elif git -C "$APS_DIR" fetch --depth 1 origin master:refs/remotes/origin/master >/dev/null 2>&1; then
    git -C "$APS_DIR" reset --hard refs/remotes/origin/master >/dev/null 2>&1
  else
    echo "ensure-aps: update failed; using existing checkout" >&2
  fi
fi

echo "$APS_DIR"
