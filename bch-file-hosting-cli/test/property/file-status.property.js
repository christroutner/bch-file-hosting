/*
  Property tests for the file-status command (src/commands/file-status.js).

  Invariants: the command maps outcomes to exit codes (0 result, 1 runtime
  error, 2 usage error); a file record always prints its CID, name, size,
  status, and hosting window (or "not paid" when it has none) plus every pin;
  and --json always emits exactly one JSON object that round-trips the API
  result.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import FileStatus from '../../src/commands/file-status.js'
import { forAllAsync, integerBetween, randomString } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
const USAGE_MESSAGE = 'You must specify a CID with the -c flag.'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const PROVIDERS = ['local-helia', 'lighthouse', 'pinata', 'filebase']
const PIN_STATUSES = ['pinned', 'pinning', 'failed', 'unknown']
const FILE_STATUSES = ['staged', 'pinned', 'pinFailed', 'expired']

function randomCid (random) {
  return `bafy${randomString(random, 12, 40, ALPHABET)}`
}

function randomPin (random) {
  return {
    provider: PROVIDERS[integerBetween(random, 0, PROVIDERS.length - 1)],
    status: PIN_STATUSES[integerBetween(random, 0, PIN_STATUSES.length - 1)]
  }
}

function randomFile (random) {
  return {
    success: true,
    cid: randomCid(random),
    filename: `${randomString(random, 1, 12, ALPHABET)}.bin`,
    sizeBytes: integerBetween(random, 0, 100000000),
    status: FILE_STATUSES[integerBetween(random, 0, FILE_STATUSES.length - 1)],
    hostedUntil: random() < 0.5
      ? new Date(integerBetween(random, 0, 4102444800000)).toISOString()
      : null,
    pins: Array.from({ length: integerBetween(random, 0, 3) }, () => randomPin(random))
  }
}

// Build a command whose injected hosting API records how often it is called.
function build (getStatusImpl) {
  const calls = []
  const output = []
  const errorOutput = []
  const command = new FileStatus({
    config,
    hostingApi: {
      getStatus: async (...args) => {
        calls.push(args)
        return getStatusImpl(...args)
      }
    },
    output: (msg) => output.push(msg),
    errorOutput: (msg) => errorOutput.push(msg)
  })
  return { command, calls, output, errorOutput }
}

describe('#file-status.property.js', () => {
  it('should echo the full result as one JSON object when --json is set', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: randomFile,
      property: async (file) => {
        const { command, output } = build(async () => file)

        const code = await command.run({ cid: CID, json: true })

        assert.equal(code, 0)
        assert.lengthOf(output, 1)
        assert.deepEqual(JSON.parse(output[0]), file)
      }
    })
  })

  it('should print the file details, hosting window, and every pin', () => {
    forAllAsync({
      seed: 2,
      runs: 200,
      generate: randomFile,
      property: async (file) => {
        const { command, output } = build(async () => file)

        const code = await command.run({ cid: CID })
        const text = output.join('\n')

        assert.equal(code, 0)
        assert.include(text, `CID: ${file.cid}`)
        assert.include(text, `File name: ${file.filename}`)
        assert.include(text, `Size: ${file.sizeBytes} bytes`)
        assert.include(text, `Status: ${file.status}`)
        assert.include(text, `Hosting window: ${file.hostedUntil || 'not paid'}`)
        for (const pin of file.pins) {
          assert.include(text, `Pin: ${pin.provider} ${pin.status}`)
        }
      }
    })
  })

  it('should fall back to "not paid" and print no pins when they are absent', () => {
    forAllAsync({
      seed: 3,
      runs: 100,
      generate: (random) => {
        const file = randomFile(random)
        file.hostedUntil = null
        delete file.pins
        return file
      },
      property: async (file) => {
        const { command, output } = build(async () => file)
        const text = output.join('\n')

        const code = await command.run({ cid: CID })

        assert.equal(code, 0)
        assert.include(text, 'Hosting window: not paid')
        assert.notInclude(text, 'Pin:')
      }
    })
  })

  it('should return 1 and print the message for any lookup failure', () => {
    forAllAsync({
      seed: 4,
      runs: 200,
      generate: (random) => randomString(random, 1, 60, ALPHABET),
      property: async (message) => {
        const { command, errorOutput } = build(async () => { throw new Error(message) })

        const code = await command.run({ cid: CID })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), message)
      }
    })
  })

  it('should return 2 and not call the API when the CID flag is missing', async () => {
    const { command, calls, errorOutput } = build(async () => {
      throw new Error('should not look up without a CID')
    })

    const code = await command.run({})

    assert.equal(code, 2)
    assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
    assert.lengthOf(calls, 0)
  })
})
