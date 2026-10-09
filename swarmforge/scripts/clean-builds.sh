#!/usr/bin/env bash
# Remove gitignored build directories that bloat mutate4javascript worker
# copies and make mutation runs appear to hang.
#
# Usage: clean-builds.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

for component in bch-file-hosting-api bch-file-hosting-cli; do
  rm -rf "$ROOT/$component/tmp/acceptance" \
         "$ROOT/$component/target/mutation-workers"
done

echo "clean-builds: removed tmp/acceptance and target/mutation-workers for all components"
