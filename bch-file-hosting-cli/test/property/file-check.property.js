/*
  Property tests for the file-check command (src/commands/file-check.js).

  Invariants: the command maps outcomes to exit codes (0 result, 1 runtime
  error, 2 usage error); a paid result always prints its CID, download URL, and
  every gateway URL; an unpaid result always prints received/required satoshis
  and the quote expiry; any other status prints its status; and --json always
  emits exactly one JSON object that round-trips the API result.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import FileCheck from '../../src/commands/file-check.js'
import { forAllAsync, integerBetween } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const ADDRESS = 'bitcoincash:qcheckaddress00000000000000000000000000'
const USAGE_MESSAGE = 'You must specify a payment address with the -a flag.'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const OTHER_STATUSES = ['expired', 'unknown', 'deleted']

function randomString (random, min, max) {
  const length = integerBetween(random, min, max)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[integerBetween(random, 0, ALPHABET.length - 1)]
  }
  return out
}

function randomCid (random) {
  return `bafy${randomString(random, 12, 40)}`
}

function randomPaid (random) {
  const gatewayUrls = Array.from(
    { length: integerBetween(random, 0, 3) },
    () => `https://${randomString(random, 3, 10)}.example/ipfs/${randomCid(random)}/${randomString(random, 1, 8)}.bin`
  )

  return {
    success: true,
    status: 'paid',
    cid: randomCid(random),
    downloadUrl: `http://localhost:5050/download/${randomCid(random)}`,
    gatewayUrls
  }
}

function randomUnpaid (random) {
  return {
    success: true,
    status: 'unpaid',
    receivedSats: integerBetween(random, 0, 1000000000),
    requiredSats: integerBetween(random, 2000, 1000000000),
    quoteExpiresAt: new Date(integerBetween(random, 0, 4102444800000)).toISOString()
  }
}

function randomResult (random) {
  const roll = random()
  if (roll < 0.4) return randomPaid(random)
  if (roll < 0.8) return randomUnpaid(random)
  return { success: true, status: OTHER_STATUSES[integerBetween(random, 0, OTHER_STATUSES.length - 1)] }
}

// Build a command whose injected hosting API records how often it is called.
function build (checkImpl) {
  const calls = []
  const output = []
  const errorOutput = []
  const command = new FileCheck({
    config,
    hostingApi: {
      checkPayment: async (...args) => {
        calls.push(args)
        return checkImpl(...args)
      }
    },
    output: (msg) => output.push(msg),
    errorOutput: (msg) => errorOutput.push(msg)
  })
  return { command, calls, output, errorOutput }
}

describe('#file-check.property.js', () => {
  it('should echo the full result as one JSON object when --json is set', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: randomResult,
      property: async (result) => {
        const { command, output } = build(async () => result)

        const code = await command.run({ address: ADDRESS, json: true })

        assert.equal(code, 0)
        assert.lengthOf(output, 1)
        assert.deepEqual(JSON.parse(output[0]), result)
      }
    })
  })

  it('should print the CID, download URL, and every gateway URL for a paid invoice', () => {
    forAllAsync({
      seed: 2,
      runs: 200,
      generate: randomPaid,
      property: async (result) => {
        const { command, output } = build(async () => result)

        const code = await command.run({ address: ADDRESS })
        const text = output.join('\n')

        assert.equal(code, 0)
        assert.include(text, `CID: ${result.cid}`)
        assert.include(text, `Download URL: ${result.downloadUrl}`)
        for (const url of result.gatewayUrls) {
          assert.include(text, `Gateway URL: ${url}`)
        }
      }
    })
  })

  it('should print the received, required, and expiry for an unpaid invoice', () => {
    forAllAsync({
      seed: 3,
      runs: 200,
      generate: randomUnpaid,
      property: async (result) => {
        const { command, output } = build(async () => result)

        const code = await command.run({ address: ADDRESS })
        const text = output.join('\n')

        assert.equal(code, 0)
        assert.include(text, `Received: ${result.receivedSats} satoshis`)
        assert.include(text, `Required: ${result.requiredSats} satoshis`)
        assert.include(text, `Quote expires: ${result.quoteExpiresAt}`)
      }
    })
  })

  it('should print the status for any other result', () => {
    forAllAsync({
      seed: 4,
      runs: 200,
      generate: (random) => ({
        success: true,
        status: OTHER_STATUSES[integerBetween(random, 0, OTHER_STATUSES.length - 1)]
      }),
      property: async (result) => {
        const { command, output } = build(async () => result)

        const code = await command.run({ address: ADDRESS })

        assert.equal(code, 0)
        assert.include(output.join('\n'), `Status: ${result.status}`)
      }
    })
  })

  it('should return 1 and print the message for any check failure', () => {
    forAllAsync({
      seed: 5,
      runs: 200,
      generate: (random) => randomString(random, 1, 60),
      property: async (message) => {
        const { command, errorOutput } = build(async () => { throw new Error(message) })

        const code = await command.run({ address: ADDRESS })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), message)
      }
    })
  })

  it('should return 2 and not call the API when the address flag is missing', async () => {
    const { command, calls, errorOutput } = build(async () => {
      throw new Error('should not check without an address')
    })

    const code = await command.run({})

    assert.equal(code, 2)
    assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
    assert.lengthOf(calls, 0)
  })
})
