/*
  Property tests for the browser wallet adapter (src/services/browser-wallet.js).

  Invariants: send() forwards exactly one output carrying the requested
  address and satoshi amount (as minimal-slp-wallet's `amountSat` field) and
  returns the wallet's transaction id unchanged; it never splits or duplicates
  the payment.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const BrowserWallet = require('../../src/services/browser-wallet')
const { forAllAsync, integerBetween, randomString } = require('./lib/harness')

const ADDRESS_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const TXID_ALPHABET = '0123456789abcdef'

function randomAddress (random) {
  return `bitcoincash:q${randomString(random, 10, 40, ADDRESS_ALPHABET)}`
}

test('property: send forwards the address and satoshi amount and returns the txid', async () => {
  await forAllAsync({
    seed: 1,
    runs: 300,
    generate: (random) => ({
      address: randomAddress(random),
      amountSats: integerBetween(random, 0, 2100000000000000),
      txid: randomString(random, 1, 64, TXID_ALPHABET)
    }),
    property: async ({ address, amountSats, txid }) => {
      const calls = []
      const wallet = {
        send: async (outputs) => {
          calls.push(outputs)
          return txid
        }
      }
      const browserWallet = new BrowserWallet({ wallet })

      const result = await browserWallet.send({ address, amountSats })

      assert.deepEqual(calls, [[{ address, amountSat: amountSats }]])
      assert.equal(result, txid)
    }
  })
})

test('property: send emits exactly one output', async () => {
  await forAllAsync({
    seed: 2,
    runs: 200,
    generate: (random) => ({
      address: randomAddress(random),
      amountSats: integerBetween(random, 0, 100000000)
    }),
    property: async ({ address, amountSats }) => {
      const calls = []
      const wallet = { send: async (outputs) => { calls.push(outputs); return 'txid' } }

      await new BrowserWallet({ wallet }).send({ address, amountSats })

      assert.equal(calls[0].length, 1)
    }
  })
})

test('property: a browser wallet requires an injected wallet', () => {
  assert.throws(() => new BrowserWallet(), /requires a wallet/)
  assert.throws(() => new BrowserWallet({ wallet: null }), /requires a wallet/)
})
