/*
  Shared acceptance-runner helpers for the bch-file-hosting components.

  Every component acceptance runner orchestrates the same pipeline:
  resolve the single canonical APS checkout, parse each Gherkin feature to JSON
  IR, generate an executable test entry point, then run the generated tests.
  This module centralizes checkout resolution, the generation half, and the
  default sequential run/report loop, so each component's runner is a thin
  adapter that differs only in how it runs the generated tests.

  `run` on the effectful helpers defaults to `sh` and can be injected by tests.
*/
'use strict'

const { execFileSync } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { resolveApsDir } = require('./aps-dir.cjs')

const APS_URL = 'https://github.com/unclebob/Acceptance-Pipeline-Specification.git'

function sh (cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts
  }).toString()
}

// Ensure the single canonical APS checkout is present. When the shared
// ensure-aps.sh script exists, use the path it prints: worktrees share one
// checkout at the repository root, not a worktree-local tmp/aps. Returns the
// resolved checkout directory.
function ensureAps ({ repoRoot, apsDir, run = sh }) {
  const shared = path.join(repoRoot, 'swarmforge', 'scripts', 'ensure-aps.sh')
  const sharedExists = fs.existsSync(shared)
  if (!sharedExists && fs.existsSync(path.join(apsDir, 'bb.edn'))) return apsDir
  const sharedOutput = sharedExists ? run('/bin/bash', [shared]) : ''
  const resolved = resolveApsDir({ repoRoot, sharedExists, sharedOutput })
  if (fs.existsSync(path.join(resolved, 'bb.edn'))) return resolved
  fs.mkdirSync(path.dirname(resolved), { recursive: true })
  run('git', ['clone', '--depth', '1', APS_URL, resolved])
  return resolved
}

function apsCommit (apsDir, run = sh) {
  try {
    return run('git', ['-C', apsDir, 'rev-parse', 'HEAD']).trim()
  } catch (err) {
    return ''
  }
}

function featureHash (featurePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(featurePath)).digest('hex')
}

// True when the generated entry point and metadata already match the current
// feature text and APS checkout, so parse/generate can be skipped.
function isUpToDate ({ genDir, featurePath, base, commit, hash = featureHash }) {
  const testFile = path.join(genDir, `${base}.acceptance.test.js`)
  const metaFile = path.join(genDir, 'metadata', `${base}.json`)
  if (!fs.existsSync(testFile) || !fs.existsSync(metaFile)) return false
  try {
    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
    return meta.feature_hash === hash(featurePath) && meta.aps_commit === commit
  } catch (err) {
    return false
  }
}

// Remove generated tests for features that no longer exist under specs/.
function removeStaleGeneratedTests (genDir, features) {
  const bases = new Set(features.map((f) => f.replace(/\.feature$/i, '')))
  if (!fs.existsSync(genDir)) return
  for (const file of fs.readdirSync(genDir)) {
    if (!file.endsWith('.acceptance.test.js')) continue
    const base = file.replace(/\.acceptance\.test\.js$/, '')
    if (!bases.has(base)) {
      try {
        fs.rmSync(path.join(genDir, file), { force: true })
      } catch (err) {
        // ignore cleanup errors
      }
    }
  }
}

function featureFiles (specsDir) {
  return fs.readdirSync(specsDir).filter((f) => f.endsWith('.feature')).sort()
}

function listGeneratedTests (genDir) {
  return fs.readdirSync(genDir).filter((f) => f.endsWith('.acceptance.test.js')).sort()
}

// Report a completed acceptance run and exit non-zero when any file failed.
function reportAcceptance (tests, failures) {
  if (failures > 0) {
    console.error(`ACCEPTANCE: ${failures} failing test file(s)`)
    process.exit(1)
  } else {
    console.log(`ACCEPTANCE: all ${tests.length} generated test file(s) passed`)
  }
}

// Run generated tests one at a time, streaming each file's output, then report.
// Used by the client and indexer runners.
function runTestsSequentially (genDir, tests) {
  let failures = 0
  for (const testFile of tests) {
    try {
      const out = sh('node', [path.join(genDir, testFile)])
      process.stdout.write(out)
      console.log(`ACCEPTANCE PASS: ${testFile}`)
    } catch (err) {
      failures++
      process.stdout.write(err.stdout || '')
      process.stderr.write(err.stderr || '')
      console.error(`ACCEPTANCE FAIL: ${testFile}`)
    }
  }
  reportAcceptance(tests, failures)
}

// Parse and generate acceptance entry points for every feature, skipping those
// already up to date. Returns the sorted generated test file names.
function generateTests ({
  specsDir,
  irDir,
  genDir,
  apsDir,
  generateScript,
  commit,
  features,
  run = sh
}) {
  fs.mkdirSync(irDir, { recursive: true })
  fs.mkdirSync(genDir, { recursive: true })
  removeStaleGeneratedTests(genDir, features)

  for (const featureFile of features) {
    const base = featureFile.replace(/\.feature$/i, '')
    const featurePath = path.join(specsDir, featureFile)
    if (isUpToDate({ genDir, featurePath, base, commit })) continue

    const irPath = path.join(irDir, `${base}.json`)
    run('bb', ['gherkin-parser', featurePath, irPath], { cwd: apsDir })
    run('node', [generateScript, irPath, genDir, featurePath, commit])
  }

  return listGeneratedTests(genDir)
}

// Full acceptance flow for runners that run generated tests sequentially:
// resolve the APS checkout, generate entry points, run tests, report. Exits
// non-zero when any generated test file fails.
function runSequentialAcceptance ({ specsDir, irDir, genDir, repoRoot, apsDir, generateScript }) {
  const resolvedApsDir = ensureAps({ repoRoot, apsDir })

  const features = featureFiles(specsDir)
  if (features.length === 0) {
    console.log('No feature files found under specs/.')
    return
  }

  const commit = apsCommit(resolvedApsDir)
  const tests = generateTests({
    specsDir,
    irDir,
    genDir,
    apsDir: resolvedApsDir,
    generateScript,
    commit,
    features
  })

  runTestsSequentially(genDir, tests)
}

// Convenience wrapper for the standard component layout: `specs/`,
// `build/acceptance/{ir,generated}`, and a generator at
// `<acceptanceDir>/lib/generate.js`. Used by the client and indexer runners.
function runComponentAcceptance ({ root, acceptanceDir, repoRoot }) {
  return runSequentialAcceptance({
    specsDir: path.join(root, 'specs'),
    irDir: path.join(root, 'build', 'acceptance', 'ir'),
    genDir: path.join(root, 'build', 'acceptance', 'generated'),
    repoRoot,
    apsDir: path.join(repoRoot, 'tmp', 'aps'),
    generateScript: path.join(acceptanceDir, 'lib', 'generate.js')
  })
}

module.exports = {
  sh,
  ensureAps,
  apsCommit,
  featureHash,
  isUpToDate,
  removeStaleGeneratedTests,
  featureFiles,
  listGeneratedTests,
  generateTests,
  reportAcceptance,
  runTestsSequentially,
  runSequentialAcceptance,
  runComponentAcceptance
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T13:24:01.204Z","module_hash":"bd31d5f4320fc048c1cf6d00091a00fe4d22254e8bc30ad418a4677f3bd0e7a1","functions":[{"id":"func/sh","name":"sh","line":23,"end_line":28,"hash":"33148ec8ebb69e97432764af56189ff00f8bbaa3ec322df4511fa69d0a5aa2b4"},{"id":"func/ensureAps","name":"ensureAps","line":34,"end_line":44,"hash":"37cd78e4e8a5e6b1dc16d3e45ae43f364743291fb83cf32b1a496acb476fcb7c"},{"id":"func/apsCommit","name":"apsCommit","line":46,"end_line":52,"hash":"326b159585c6bc910df5d2e4dc8006f953a1c0b4cb8e130141081eac4a8bf037"},{"id":"func/featureHash","name":"featureHash","line":54,"end_line":56,"hash":"3a3c85d2749a4b638146387dddc23954b6f3ec88c719b261b7da3e4bd0a50cfe"},{"id":"func/isUpToDate","name":"isUpToDate","line":60,"end_line":70,"hash":"63baace61fe3131c3d0ca892a408938ecb62764003bfe22214d9fece769db0e6"},{"id":"func/removeStaleGeneratedTests","name":"removeStaleGeneratedTests","line":73,"end_line":87,"hash":"d85937163448bdbbe45d06b7f6433f29d7c4167b731b5a80e7497a13f1800b0b"},{"id":"func/featureFiles","name":"featureFiles","line":89,"end_line":91,"hash":"3679f1ffcf3b03647ceb293ffaf8043b6406e411ded852220844c2f31d17e480"},{"id":"func/listGeneratedTests","name":"listGeneratedTests","line":93,"end_line":95,"hash":"170b71bb91ddfc2972a369733a117755bacab26410b5951e560ca21101cca70b"},{"id":"func/reportAcceptance","name":"reportAcceptance","line":98,"end_line":105,"hash":"35167686f2dade2734f0a583091a494ab874933d8b24510ad164e3d15c30b370"},{"id":"func/runTestsSequentially","name":"runTestsSequentially","line":109,"end_line":124,"hash":"6a9f979c4029884c52b2db3aebebf98cc69f3ea100bcbae01aff5f88cc6a73a6"},{"id":"func/generateTests","name":"generateTests","line":128,"end_line":153,"hash":"89087c1e7f7a92afca170bcb0be0faeb0b334c9e47d66550777e5655ac83a661"},{"id":"func/runSequentialAcceptance","name":"runSequentialAcceptance","line":158,"end_line":179,"hash":"7aefac316d5442622e2ee256ca5cd7cf2c4a6919a53b4ed880bc31c63225236c"},{"id":"func/runComponentAcceptance","name":"runComponentAcceptance","line":184,"end_line":193,"hash":"15306aef8fe7ba3cb41d8c4c599e6fedb866d5b3e49a84752936ef0b5e16b254"}]}
// mutate4javascript-manifest-end
