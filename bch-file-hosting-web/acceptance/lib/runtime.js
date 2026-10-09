/*
  Acceptance runtime for bch-file-hosting-web.

  Expands each scenario (and each example row) from parser JSON IR into
  scenario executions, prepends background steps, and dispatches every step to
  the project step handlers. Unsupported steps, invalid example values, or
  failed assertions fail that execution.
*/

'use strict'

const { createWorld, handleStep } = require('./handlers')

// Expand the IR scenarios into concrete executions.
// For scenario outlines with examples, one execution per example row; for
// scenarios without examples, one execution with an empty example store.
function expandScenarios (ir) {
  const executions = []
  const background = ir.background || []

  for (const scenario of ir.scenarios) {
    const examples = (scenario.examples && scenario.examples.length > 0)
      ? scenario.examples.map((example, i) => ({ example, suffix: `example_${i + 1}` }))
      : [{ example: {}, suffix: 'example_1' }]

    for (const { example, suffix } of examples) {
      executions.push({
        name: `${scenario.name}/${suffix}`,
        steps: [...background, ...scenario.steps],
        example
      })
    }
  }

  return executions
}

// Run a full feature and return a report of scenario outcomes.
async function runFeature (ir) {
  const executions = expandScenarios(ir)
  const results = []
  let failures = 0

  for (const ex of executions) {
    // A fresh world/state object for each scenario execution.
    const world = createWorld()
    let failure = null

    for (const step of ex.steps) {
      try {
        await handleStep(step, ex.example, world)
      } catch (err) {
        failure = err.message
        break
      }
    }

    if (failure) {
      failures++
      results.push({ name: ex.name, status: 'failed', detail: failure })
    } else {
      results.push({ name: ex.name, status: 'passed' })
    }
  }

  return { feature: ir.name, results, failures, total: results.length }
}

module.exports = { expandScenarios, runFeature }
