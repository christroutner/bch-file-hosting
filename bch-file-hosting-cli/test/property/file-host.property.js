/*
  Property tests for the file-host command (src/commands/file-host.js).

  Invariants: the command uploads, pays exactly the quote's priceSats from the
  named wallet, and polls check-payment until the payment is visible; it sleeps
  only between poll attempts; an already-hosted upload short-circuits without a
  wallet read or payment; a never-confirmed payment fails after the configured
  attempts; and --json emits exactly one JSON object that round-trips the result.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import FileHost from '../../src/commands/file-host.js'
import { forAllAsync, integerBetween, randomString, randomWallet } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const TXID = '1111111111111111111111111111111111111111111111111111111111111111'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const STORED_WALLET = { mnemonic: 'stored mnemonic', cashAddress: 'bitcoincash:qpayer', hdPath: "m/44'/245'/0'/0/0" }

function randomCid (random) {
  return `bafy${randomString(random, 12, 40, ALPHABET)}`
}

function randomAddress (random) {
  return `bitcoincash:q${randomString(random, 20, 38, ALPHABET)}`
}

function randomQuote (random) {
  return {
    success: true,
    cid: randomCid(random),
    filename: `${randomString(random, 1, 10, ALPHABET)}.bin`,
    sizeBytes: integerBetween(random, 1, 100000000),
    priceSats: integerBetween(random, 1, 1000000),
    paymentAddress: randomAddress(random)
  }
}

function randomPaid (random, quote) {
  return {
    success: true,
    status: 'paid',
    cid: quote.cid,
    downloadUrl: `http://localhost:5050/download/${quote.cid}`,
    gatewayUrls: Array.from(
      { length: integerBetween(random, 0, 2) },
      () => `https://gw.example/ipfs/${quote.cid}`
    )
  }
}

function unpaid (requiredSats) {
  return { success: true, status: 'unpaid', receivedSats: 0, requiredSats }
}

// Build a command with an injected API, store, service, and timer that record
// calls. `checks` is the sequence of check-payment results; the last repeats.
function build ({ quote, checks = [], wallet = STORED_WALLET, send = async () => TXID, attempts = 3, uploadError = null } = {}) {
  const calls = { upload: [], check: [], read: [], send: [], sleep: [] }
  const output = []
  const errorOutput = []
  const command = new FileHost({
    config,
    hostingApi: {
      upload: async (args) => {
        calls.upload.push(args)
        if (uploadError) throw uploadError
        return quote
      },
      checkPayment: async (args) => {
        calls.check.push(args)
        const index = calls.check.length - 1
        return checks[index] ?? checks[checks.length - 1]
      }
    },
    walletStore: {
      has: () => false,
      read: (name) => {
        calls.read.push(name)
        return wallet
      },
      write: () => {}
    },
    walletService: {
      sendSats: async (args) => {
        calls.send.push(args)
        return send(args)
      }
    },
    sleep: async (ms) => { calls.sleep.push(ms) },
    paymentCheckAttempts: attempts,
    paymentCheckDelayMs: 7,
    output: (msg) => output.push(msg),
    errorOutput: (msg) => errorOutput.push(msg)
  })
  command.readFile = () => Buffer.from('file bytes')
  return { command, calls, output, errorOutput }
}

describe('#file-host.property.js', () => {
  it('should echo the paid result as one JSON object when --json is set', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: (random) => {
        const quote = randomQuote(random)
        return { quote, paid: randomPaid(random, quote), txid: randomString(random, 1, 64, ALPHABET) }
      },
      property: async ({ quote, paid, txid }) => {
        const { command, output } = build({ quote, checks: [unpaid(quote.priceSats), paid], send: async () => txid })

        const code = await command.run({ file: './upload.bin', name: 'payer', json: true })

        assert.equal(code, 0)
        assert.lengthOf(output, 1)
        assert.deepEqual(JSON.parse(output[0]), {
          status: 'paid',
          cid: paid.cid,
          downloadUrl: paid.downloadUrl,
          gatewayUrls: paid.gatewayUrls || [],
          txid,
          paymentAddress: quote.paymentAddress
        })
      }
    })
  })

  it('should pay the quote price and poll until the payment is visible', () => {
    forAllAsync({
      seed: 2,
      runs: 200,
      generate: (random) => {
        const quote = randomQuote(random)
        return {
          quote,
          unpaidCount: integerBetween(random, 0, 3),
          paid: randomPaid(random, quote),
          txid: randomString(random, 1, 64, ALPHABET),
          wallet: randomWallet(random)
        }
      },
      property: async ({ quote, unpaidCount, paid, txid, wallet }) => {
        const checks = [
          ...Array.from({ length: unpaidCount }, () => unpaid(quote.priceSats)),
          paid
        ]
        const { command, calls, output } = build({
          quote,
          checks,
          attempts: unpaidCount + 1,
          wallet,
          send: async () => txid
        })

        const code = await command.run({ file: './upload.bin', name: 'payer' })

        assert.equal(code, 0)
        assert.equal(calls.upload[0].filename, 'upload.bin')
        assert.equal(calls.upload[0].buffer.toString(), 'file bytes')
        assert.deepEqual(calls.read, ['payer'])
        assert.deepEqual(calls.send, [{ wallet, toAddress: quote.paymentAddress, amountSats: quote.priceSats }])
        assert.lengthOf(calls.check, unpaidCount + 1)
        // Sleeps only between attempts, never after the confirming check.
        assert.lengthOf(calls.sleep, unpaidCount)

        const text = output.join('\n')
        assert.include(text, `CID: ${paid.cid}`)
        assert.include(text, `Download URL: ${paid.downloadUrl}`)
        for (const url of paid.gatewayUrls || []) {
          assert.include(text, `Gateway URL: ${url}`)
        }
      }
    })
  })

  it('should fail after the configured attempts and sleep between them', () => {
    forAllAsync({
      seed: 3,
      runs: 100,
      generate: (random) => ({ quote: randomQuote(random), attempts: integerBetween(random, 1, 5) }),
      property: async ({ quote, attempts }) => {
        const { command, calls, errorOutput } = build({ quote, checks: [unpaid(quote.priceSats)], attempts })

        const code = await command.run({ file: './upload.bin', name: 'payer' })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), 'Payment not confirmed.')
        assert.lengthOf(calls.check, attempts)
        assert.lengthOf(calls.sleep, attempts - 1)
        assert.lengthOf(calls.send, 1)
      }
    })
  })

  it('should short-circuit an already hosted upload without reading a wallet or paying', () => {
    forAllAsync({
      seed: 4,
      runs: 100,
      generate: (random) => {
        const cid = randomCid(random)
        return { cid, downloadUrl: `http://localhost:5050/download/${cid}` }
      },
      property: async ({ cid, downloadUrl }) => {
        const { command, calls, output } = build({
          quote: { success: true, alreadyHosted: true, cid, downloadUrl }
        })

        const code = await command.run({ file: './upload.bin', name: 'payer' })

        assert.equal(code, 0)
        assert.include(output.join('\n'), `Download URL: ${downloadUrl}`)
        assert.lengthOf(calls.read, 0)
        assert.lengthOf(calls.send, 0)
        assert.lengthOf(calls.check, 0)
      }
    })
  })

  it('should return 1 and not pay when the named wallet does not exist', () => {
    forAllAsync({
      seed: 5,
      runs: 100,
      generate: (random) => ({ quote: randomQuote(random), name: randomString(random, 1, 20, ALPHABET) }),
      property: async ({ quote, name }) => {
        const { command, calls, errorOutput } = build({ quote, wallet: null })

        const code = await command.run({ file: './upload.bin', name })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), `Wallet "${name}" not found.`)
        assert.lengthOf(calls.send, 0)
        assert.lengthOf(calls.check, 0)
      }
    })
  })

  it('should return 1 and not pay when the upload is rejected', () => {
    forAllAsync({
      seed: 6,
      runs: 100,
      generate: (random) => randomString(random, 1, 50, ALPHABET),
      property: async (message) => {
        const { command, calls, errorOutput } = build({ uploadError: new Error(message) })

        const code = await command.run({ file: './upload.bin', name: 'payer' })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), message)
        assert.lengthOf(calls.read, 0)
        assert.lengthOf(calls.send, 0)
      }
    })
  })
})
