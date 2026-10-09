/*
  Normal acceptance runner for bch-file-hosting-web.

  The shared generation and run pipeline lives in
  swarmforge/scripts/lib/acceptance-runner.cjs; this is the thin adapter that
  supplies the component's root and paths.

  Exit code 0 when all acceptance tests pass; non-zero otherwise.
*/

'use strict'

const path = require('node:path')
const { runComponentAcceptance } = require('../../swarmforge/scripts/lib/acceptance-runner.cjs')

const root = path.resolve(__dirname, '..')

runComponentAcceptance({
  root,
  acceptanceDir: __dirname,
  repoRoot: path.resolve(root, '..')
})
