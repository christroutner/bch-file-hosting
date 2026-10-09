#!/usr/bin/env node
/*
  Canonical per-component verification runner for bch-file-hosting.

  Runs the standard verification sequence for one component (unit, property,
  acceptance, lint, and build where defined) and emits a machine-readable JSON
  record. This is the single source of truth for "what does verification mean
  for this component", so roles do not have to transcribe commands.

  A command whose npm script the component does not define yet is recorded as
  skipped, not failed, so verification keeps working while a component grows
  (for example, before its acceptance pipeline or property tests exist).

  Usage:
    node swarmforge/scripts/verify.mjs <api>
    node swarmforge/scripts/verify.mjs <component> --record <file> --task <name>

  Exit codes:
    0  every defined command passed
    1  at least one command failed
    2  usage error
*/

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')

// [record name, npm script name]
const COMPONENTS = {
  api: {
    dir: 'bch-file-hosting-api',
    commands: [
      ['unit', 'test'],
      ['property', 'test:property'],
      ['acceptance', 'test:acceptance'],
      ['lint', 'lint']
    ]
  }
}

function usage () {
  console.error(`usage: verify.mjs <${Object.keys(COMPONENTS).join('|')}> [--record <file>] [--task <name>]`)
}

function git (args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim()
  } catch (err) {
    return ''
  }
}

function summarize (name, out, ok) {
  const clean = out.replace(/\x1b\[[0-9;]*m/g, '') // eslint-disable-line no-control-regex
  if (!ok) {
    const lines = clean.trim().split('\n')
    const tail = lines.slice(-8).join(' | ').replace(/\s+/g, ' ').slice(0, 400)
    return `FAILED: ${tail}`
  }
  let m = clean.match(/(\d+) passing/)
  if (m) return `${m[1]} passing`
  m = clean.match(/# pass (\d+)/)
  if (m) {
    const fail = clean.match(/# fail (\d+)/)
    return `${m[1]} pass / ${fail ? fail[1] : 0} fail`
  }
  m = clean.match(/ACCEPTANCE: all (\d+) generated test file\(s\) passed/)
  if (m) return `all ${m[1]} acceptance suites passed`
  return 'ok'
}

function readScripts (dir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  return pkg.scripts || {}
}

function runCommand (dir, name, script) {
  const args = script === 'test' ? ['test'] : ['run', script]
  const started = Date.now()
  let out = ''
  let exit = 0
  try {
    out = execFileSync('npm', args, {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    })
  } catch (err) {
    exit = typeof err.status === 'number' ? err.status : 1
    out = `${err.stdout || ''}\n${err.stderr || ''}`
  }
  const ok = exit === 0
  process.stderr.write(`  [${ok ? 'ok' : 'FAIL'}] ${name} (${Date.now() - started}ms)\n`)
  return {
    name,
    command: `npm ${args.join(' ')}`,
    exit,
    duration_ms: Date.now() - started,
    summary: summarize(name, out, ok)
  }
}

function skipCommand (name, script) {
  process.stderr.write(`  [skip] ${name} (no "${script}" npm script)\n`)
  return { name, command: `npm run ${script}`, skipped: true, summary: `skipped: no "${script}" npm script` }
}

function main () {
  const argv = process.argv.slice(2)
  const name = argv[0]
  if (!name || !COMPONENTS[name]) {
    usage()
    process.exit(2)
  }
  let recordPath = ''
  let task = ''
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--record') recordPath = argv[++i] || ''
    else if (argv[i] === '--task') task = argv[++i] || ''
    else {
      usage()
      process.exit(2)
    }
  }

  const spec = COMPONENTS[name]
  const componentDir = path.join(repoRoot, spec.dir)
  const scripts = readScripts(componentDir)
  process.stderr.write(`== verify ${spec.dir} ==\n`)

  const commands = spec.commands.map(([cmdName, script]) => (
    scripts[script] ? runCommand(componentDir, cmdName, script) : skipCommand(cmdName, script)
  ))
  const ran = commands.filter((c) => !c.skipped)
  const failed = ran.filter((c) => c.exit !== 0)
  const record = {
    schema_version: 1,
    task: task || null,
    component: spec.dir,
    git_sha: git(['rev-parse', 'HEAD']),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    timestamp: new Date().toISOString(),
    commands,
    result: failed.length === 0 ? 'pass' : 'fail'
  }

  const json = `${JSON.stringify(record, null, 2)}\n`
  if (recordPath) {
    fs.mkdirSync(path.dirname(recordPath), { recursive: true })
    fs.writeFileSync(recordPath, json)
    process.stderr.write(`verification record: ${recordPath}\n`)
  } else {
    process.stdout.write(json)
  }

  const skipped = commands.length - ran.length
  process.stderr.write(
    `result: ${record.result} (${ran.length - failed.length}/${ran.length} commands passed` +
    `${skipped ? `, ${skipped} skipped` : ''})\n`
  )
  process.exit(failed.length === 0 ? 0 : 1)
}

main()
