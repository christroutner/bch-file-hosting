/*
  Project step handlers for the bch-file-hosting-cli acceptance pipeline.

  Every scenario drives the real FileUpload command with an injected fake
  hosting API and captured output, so command validation, exit codes, and
  output formatting come from production code. Example-table values stay in the
  IR example store; patterns capture the placeholder name so Gherkin soft
  mutation can change one cell without rewriting the step text.
*/

// Global npm libraries
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Local libraries
import FileUpload from '../../src/commands/file-upload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Resolve component-local temp files from this module, not the process cwd, so
// acceptance and mutation runs write to the same place regardless of launch dir.
const COMPONENT_ROOT = path.resolve(__dirname, '..', '..')

const FIXTURE_BYTES = 'acceptance file fixture'

function exampleValue (example, name) {
  if (!(name in example)) {
    throw new Error(`Missing example value for "${name}"`)
  }
  return example[name]
}

function asInt (value, label) {
  const n = Number(value)
  if (!Number.isInteger(n)) {
    throw new Error(`${label} is not an integer: ${value}`)
  }
  return n
}

// Resolve a placeholder step token like "<printed_error>" to its example value,
// or return a literal string unchanged.
function expectedText (example, token) {
  const placeholder = /^<([A-Za-z0-9_]+)>$/.exec(token)
  if (placeholder) return exampleValue(example, placeholder[1])
  return token
}

function createWorld () {
  const tmpDir = path.join(COMPONENT_ROOT, 'tmp', 'acceptance')
  fs.mkdirSync(tmpDir, { recursive: true })

  const world = {
    tmpDir,
    config: { apiUrl: 'http://localhost:5050' },
    apiResult: null,
    apiError: null,
    stdout: '',
    stderr: '',
    exitCode: null,
    json: null
  }

  world.hostingApi = {
    upload: async () => {
      if (world.apiError) throw new Error(world.apiError)
      return world.apiResult
    }
  }

  world.command = new FileUpload({
    config: world.config,
    hostingApi: world.hostingApi,
    output: (msg) => { world.stdout += `${msg}\n` },
    errorOutput: (msg) => { world.stderr += `${msg}\n` }
  })

  return world
}

// Create (or reuse) a real fixture file for an upload path. The scenario's
// `upload_path` is only an input label; the command reads this temp copy.
function fixturePath (world, requestedPath) {
  const target = path.join(world.tmpDir, path.basename(requestedPath))
  if (!fs.existsSync(target)) fs.writeFileSync(target, FIXTURE_BYTES)
  return target
}

async function runUpload (world, requestedPath, extra = {}) {
  world.exitCode = await world.command.run({ file: fixturePath(world, requestedPath), ...extra })
}

const handlers = [
  {
    pattern: /^a file-upload command$/,
    run () {}
  },
  {
    pattern: /^the hosting API quotes <([A-Za-z0-9_]+)> satoshis at <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult = {
        success: true,
        cid: 'bafyquote',
        filename: 'upload.bin',
        sizeBytes: 1024,
        billedBytes: 100000,
        priceSats: asInt(exampleValue(example, match[1]), match[1]),
        paymentAddress: exampleValue(example, match[2]),
        quoteExpiresAt: '2026-10-10T00:00:00.000Z'
      }
    }
  },
  {
    pattern: /^the hosting API reports the file is already hosted at <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiResult = {
        success: true,
        alreadyHosted: true,
        cid: 'bafyalready',
        downloadUrl: exampleValue(example, match[1])
      }
    }
  },
  {
    pattern: /^the hosting API rejects the upload with error <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      world.apiError = exampleValue(example, match[1])
    }
  },
  {
    pattern: /^I run file-upload for the file (.+)$/,
    async run (match, example, world) {
      await runUpload(world, expectedText(example, match[1]))
    }
  },
  {
    pattern: /^I run file-upload with JSON output for the file (.+)$/,
    async run (match, example, world) {
      await runUpload(world, expectedText(example, match[1]), { json: true })
    }
  },
  {
    pattern: /^I run file-upload with no file flag$/,
    async run (_match, _example, world) {
      world.exitCode = await world.command.run({})
    }
  },
  {
    pattern: /^I try file-upload for the missing file (.+)$/,
    async run (match, example, world) {
      const requested = expectedText(example, match[1])
      const missing = path.join(world.tmpDir, path.basename(requested))
      if (fs.existsSync(missing)) fs.rmSync(missing)
      world.exitCode = await world.command.run({ file: missing })
    }
  },
  {
    pattern: /^the exit code is (\d+)$/,
    run (match, _example, world) {
      const expected = asInt(match[1], 'exit code')
      if (world.exitCode !== expected) {
        throw new Error(`expected exit code ${expected}, got ${world.exitCode}`)
      }
    }
  },
  {
    pattern: /^the command prints the price <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (!world.stdout.includes(`${expected} satoshis`)) {
        throw new Error(`stdout did not print the price ${expected} satoshis: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the payment address <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(expected)) {
        throw new Error(`stdout did not print the payment address ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints the download URL <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (!world.stdout.includes(expected)) {
        throw new Error(`stdout did not print the download URL ${expected}: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^the command prints no payment address$/,
    run (_match, _example, world) {
      if (/payment address/i.test(world.stdout)) {
        throw new Error(`stdout unexpectedly printed a payment address: ${JSON.stringify(world.stdout)}`)
      }
    }
  },
  {
    pattern: /^stderr contains "(.+)"$/,
    run (match, example, world) {
      const expected = expectedText(example, match[1])
      if (!world.stderr.includes(expected)) {
        throw new Error(`stderr did not contain ${JSON.stringify(expected)}: ${JSON.stringify(world.stderr)}`)
      }
    }
  },
  {
    pattern: /^stdout is a single JSON object$/,
    run (_match, _example, world) {
      const trimmed = world.stdout.trim()
      if (trimmed.split('\n').length !== 1) {
        throw new Error(`stdout was not a single line: ${JSON.stringify(world.stdout)}`)
      }

      let parsed
      try {
        parsed = JSON.parse(trimmed)
      } catch (err) {
        throw new Error(`stdout was not valid JSON: ${JSON.stringify(world.stdout)}`)
      }

      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`stdout JSON was not an object: ${JSON.stringify(world.stdout)}`)
      }

      world.json = parsed
    }
  },
  {
    pattern: /^the JSON output has the payment address <([A-Za-z0-9_]+)>$/,
    run (match, example, world) {
      const expected = exampleValue(example, match[1])
      if (world.json.paymentAddress !== expected) {
        throw new Error(`expected JSON payment address ${expected}, got ${world.json.paymentAddress}`)
      }
    }
  },
  {
    pattern: /^the JSON output has the price <([A-Za-z0-9_]+)> satoshis$/,
    run (match, example, world) {
      const expected = asInt(exampleValue(example, match[1]), match[1])
      if (world.json.priceSats !== expected) {
        throw new Error(`expected JSON price ${expected} satoshis, got ${world.json.priceSats}`)
      }
    }
  }
]

async function handleStep (step, example, world) {
  for (const handler of handlers) {
    const match = handler.pattern.exec(step.text)
    if (match) {
      await handler.run(match, example, world, step)
      return
    }
  }
  throw new Error(`Unsupported step: ${step.keyword} ${step.text}`)
}

export { createWorld, handleStep }
