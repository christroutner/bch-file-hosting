#!/usr/bin/env bash
# Consolidated architect startup verification.
#
# Verifies every SwarmForge tool the architect needs is present, at the latest
# upstream version, and runnable — in a single command. Run this once at startup
# instead of issuing many separate checks. It is read-only: it never reinstalls
# or rebuilds tools, it only confirms they are ready.
#
# Usage: swarmforge/scripts/architect-startup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

pass=0; fail=0
ok()  { echo "  [ok]   $1"; pass=$((pass+1)); }
bad() { echo "  [FAIL] $1"; fail=$((fail+1)); }

echo "== Tool repos at latest upstream =="
# APS uses the single canonical checkout under tmp/aps; refresh it in place.
if "$ROOT/swarmforge/scripts/ensure-aps.sh" --update >/dev/null 2>&1; then
  ok "tmp/aps present"
else
  bad "tmp/aps ensure/update failed"
fi
# The JavaScript tools are GitHub devDependencies of bch-file-hosting-api.
# Compare the commit pinned in package-lock.json with the upstream HEAD.
API=bch-file-hosting-api
for tool in mutate4javascript crap4javascript dry4javascript; do
  pinned=$(node -e "
    const lock = require('./$API/package-lock.json')
    const entry = lock.packages['node_modules/$tool'] || {}
    process.stdout.write((entry.resolved || '').split('#')[1] || '')
  " 2>/dev/null || true)
  if [ -z "$pinned" ]; then
    bad "$tool not in $API/package-lock.json (cd $API && npm install)"; continue
  fi
  up=$(git ls-remote "https://github.com/FullStack-Agents/$tool" HEAD 2>/dev/null | awk '{print $1}')
  if [ -z "$up" ]; then
    bad "$tool upstream lookup failed"
  elif [ "$pinned" = "$up" ]; then
    ok "$tool at latest ($(printf '%s' "$pinned" | cut -c1-10))"
  else
    bad "$tool behind upstream (cd $API && npm install $tool@github:FullStack-Agents/$tool)"
  fi
done

echo "== Language tools (JavaScript) =="
if grep -q "Missing source file argument" \
    <<< "$(bch-file-hosting-api/node_modules/.bin/mutate4javascript 2>&1)"; then
  ok "mutate4javascript"
else
  bad "mutate4javascript"
fi
if grep -q "Usage: dry4javascript" \
    <<< "$(bch-file-hosting-api/node_modules/.bin/dry4javascript --help 2>&1)"; then
  ok "dry4javascript"
else
  bad "dry4javascript"
fi
# --help only: a bare run analyzes the whole component and runs its tests.
if grep -q "Usage: crap4javascript" \
    <<< "$(bch-file-hosting-api/node_modules/.bin/crap4javascript --help 2>&1)"; then
  ok "crap4javascript"
else
  bad "crap4javascript"
fi

echo "== APS Babashka tools =="
if grep -q "usage: gherkin-parser" \
    <<< "$(cd tmp/aps && bb gherkin-parser 2>&1)"; then
  ok "gherkin-parser"
else
  bad "gherkin-parser"
fi
if grep -qF -- "--runner-worker is required" \
    <<< "$(cd tmp/aps && bb gherkin-mutator 2>&1)"; then
  ok "gherkin-mutator"
else
  bad "gherkin-mutator"
fi

echo "== Runner adapters =="
for c in bch-file-hosting-api bch-file-hosting-cli; do
  [ -f "$c/acceptance/lib/runner-worker.js" ] \
    && ok "$c runner-worker" || bad "$c runner-worker"
done

echo "== Bloated build dirs (slow mutation copies) =="
# tmp/acceptance and target/mutation-workers are gitignored build artifacts
# that mutate4javascript copies into every worker. If they grow large, the
# worker copy alone can be many GB and mutation runs appear to hang. Flag any
# dir over the threshold so it can be cleaned before a mutation run.
BLOAT_KB=102400  # 100 MB
for d in bch-file-hosting-api/tmp/acceptance bch-file-hosting-api/target/mutation-workers \
         bch-file-hosting-cli/build/acceptance bch-file-hosting-cli/target/mutation-workers; do
  if [ -d "$d" ]; then
    size_kb=$(du -sk "$d" 2>/dev/null | awk '{print $1}')
    if [ -n "$size_kb" ] && [ "$size_kb" -gt "$BLOAT_KB" ]; then
      bad "$d is ${size_kb}KB (clean with: rm -rf $d)"
    else
      ok "$d clean"
    fi
  else
    ok "$d absent"
  fi
done

echo
echo "Result: $pass ok, $fail fail"
[ "$fail" -eq 0 ]
