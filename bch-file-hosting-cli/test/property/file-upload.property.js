/*
  Property tests for the file-upload command (src/commands/file-upload.js).

  Invariants: the command maps outcomes to exit codes (0 quote, 1 runtime
  error, 2 usage error); a quote always prints its price and payment address;
  an already-hosted result always prints its download URL and never a payment
  address; and --json always emits exactly one JSON object that round-trips
  the API result.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import fs from 'node:fs'
import path from 'node:path'
import { assert } from 'chai'

import FileUpload from '../../src/commands/file-upload.js'
import { forAllAsync, integerBetween } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const USAGE_MESSAGE = 'You must specify a file with the -f flag.'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

let fixture
let absentDir

before(() => {
  const tmpDir = path.join(process.cwd(), 'tmp', 'property')
  fixture = path.join(tmpDir, 'upload.bin')
  absentDir = path.join(tmpDir, 'absent')
  fs.mkdirSync(absentDir, { recursive: true })
  fs.writeFileSync(fixture, 'hosting fixture')
})

function randomString (random, min, max) {
  const length = integerBetween(random, min, max)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[integerBetween(random, 0, ALPHABET.length - 1)]
  }
  return out
}

function randomAddress (random) {
  return `bitcoincash:q${randomString(random, 20, 38)}`
}

function randomQuote (random) {
  return {
    success: true,
    cid: `bafy${randomString(random, 12, 40)}`,
    filename: `${randomString(random, 1, 12)}.bin`,
    sizeBytes: integerBetween(random, 1, 100000000),
    billedBytes: integerBetween(random, 100000, 100000000),
    priceSats: integerBetween(random, 2000, 1000000000),
    paymentAddress: randomAddress(random),
    quoteExpiresAt: '2026-10-10T00:00:00.000Z'
  }
}

// Build a command whose injected hosting API records how often it is called.
function build (uploadImpl) {
  const calls = []
  const output = []
  const errorOutput = []
  const command = new FileUpload({
    config,
    hostingApi: {
      upload: async (...args) => {
        calls.push(args)
        return uploadImpl(...args)
      }
    },
    output: (msg) => output.push(msg),
    errorOutput: (msg) => errorOutput.push(msg)
  })
  return { command, calls, output, errorOutput }
}

describe('#file-upload.property.js', () => {
  it('should echo the full quote as one JSON object when --json is set', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: randomQuote,
      property: async (quote) => {
        const { command, output } = build(async () => quote)

        const code = await command.run({ file: fixture, json: true })

        assert.equal(code, 0)
        assert.lengthOf(output, 1)
        assert.deepEqual(JSON.parse(output[0]), quote)
      }
    })
  })

  it('should print the price and payment address for a fresh quote', () => {
    forAllAsync({
      seed: 2,
      runs: 200,
      generate: randomQuote,
      property: async (quote) => {
        const { command, output } = build(async () => quote)

        const code = await command.run({ file: fixture })
        const text = output.join('\n')

        assert.equal(code, 0)
        assert.include(text, `${quote.priceSats} satoshis`)
        assert.include(text, quote.paymentAddress)
      }
    })
  })

  it('should print the download URL and no payment address for an already hosted file', () => {
    forAllAsync({
      seed: 3,
      runs: 200,
      generate: (random) => ({
        success: true,
        alreadyHosted: true,
        cid: `bafy${randomString(random, 12, 40)}`,
        downloadUrl: `http://localhost:5050/download/bafy${randomString(random, 12, 40)}`
      }),
      property: async (result) => {
        const { command, output } = build(async () => result)

        const code = await command.run({ file: fixture })
        const text = output.join('\n')

        assert.equal(code, 0)
        assert.include(text, result.downloadUrl)
        assert.notInclude(text, 'Payment address')
      }
    })
  })

  it('should return 1 and print the message for any upload failure', () => {
    forAllAsync({
      seed: 4,
      runs: 200,
      generate: (random) => randomString(random, 1, 60),
      property: async (message) => {
        const { command, errorOutput } = build(async () => { throw new Error(message) })

        const code = await command.run({ file: fixture })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), message)
      }
    })
  })

  it('should return 1 and report any unreadable local path without uploading', () => {
    forAllAsync({
      seed: 5,
      runs: 100,
      generate: (random) => path.join(absentDir, `absent-${randomString(random, 1, 20)}.bin`),
      property: async (missing) => {
        assert.isFalse(fs.existsSync(missing))
        const { command, calls, errorOutput } = build(async () => {
          throw new Error('should not upload a missing file')
        })

        const code = await command.run({ file: missing })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), 'Cannot read file')
        assert.lengthOf(calls, 0)
      }
    })
  })

  it('should return 2 and not upload when the file flag is missing', async () => {
    const { command, calls, errorOutput } = build(async () => {
      throw new Error('should not upload without a file')
    })

    const code = await command.run({})

    assert.equal(code, 2)
    assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
    assert.lengthOf(calls, 0)
  })
})
