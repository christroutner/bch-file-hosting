/*
  Resolve the canonical Acceptance Pipeline Specification (APS) checkout.

  The shared ensure-aps.sh script single-sources the checkout at the repository
  root (resolved via git-common-dir) and prints that path on stdout. SwarmForge
  worktrees must therefore use the printed path: the worktree-local
  <worktree>/tmp/aps directory is never created when the shared script handles
  the checkout, so running the parser with that path as cwd fails with ENOENT.

  Fall back to <repoRoot>/tmp/aps only when the shared script is unavailable
  (for example, a component checked out on its own), where the acceptance
  runner clones APS itself.
*/
'use strict'

const path = require('node:path')

function resolveApsDir ({ repoRoot, sharedExists, sharedOutput }) {
  if (sharedExists) {
    const printed = String(sharedOutput || '').trim()
    if (printed) return printed
  }
  return path.join(repoRoot, 'tmp', 'aps')
}

module.exports = { resolveApsDir }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T13:20:58.356Z","module_hash":"2f010d93f87b4bb59e7aeb86efb70839d3479f3fa26b67d74f358c41b8c5c5d3","functions":[{"id":"func/resolveApsDir","name":"resolveApsDir","line":18,"end_line":24,"hash":"1b4644886c2cd8224aa28701bad75e765a6ac3a5be54a616815fb04302e905f0"}]}
// mutate4javascript-manifest-end
