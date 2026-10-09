/*
  Persistent runner adapter for the APS gherkin-mutator (bch-file-hosting-web).

  The mutator starts this process (once per worker) and sends mutation jobs
  over newline-delimited JSON on stdin. Each job carries the path to a mutated
  feature JSON IR; this worker evaluates it through the same acceptance runtime
  and step handlers used by the normal acceptance pipeline and replies with the
  runner outcome.

  Protocol (mutator-spec.md):
    request:  { "id", "feature_json", "generated_dir", "work_dir" }
    response: { "id", "outcome", "output", "error", "duration" }
      outcome: test_success | test_failure | infrastructure_error

  test_failure (acceptance failed) -> mutation killed
  test_success (acceptance passed) -> mutation survived
*/

'use strict'

const readline = require('node:readline')
const fs = require('node:fs')
const { runFeature } = require('./runtime')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

rl.on('line', async (line) => {
  const started = Date.now()
  const respond = (payload) => {
    process.stdout.write(`${JSON.stringify(payload)}\n`)
  }

  let job
  try {
    job = JSON.parse(line)
  } catch (err) {
    respond({ id: 'unknown', outcome: 'infrastructure_error', output: '', error: `bad job: ${err.message}`, duration: Date.now() - started })
    return
  }

  try {
    const ir = JSON.parse(fs.readFileSync(job.feature_json, 'utf8'))
    const report = await runFeature(ir)
    respond({
      id: job.id,
      outcome: report.failures === 0 ? 'test_success' : 'test_failure',
      output: report.results.map((r) => `${r.status} ${r.name}`).join('\n'),
      error: '',
      duration: Date.now() - started
    })
  } catch (err) {
    respond({
      id: job.id,
      outcome: 'infrastructure_error',
      output: '',
      error: err.message,
      duration: Date.now() - started
    })
  }
})

rl.on('close', () => {
  process.exit(0)
})
