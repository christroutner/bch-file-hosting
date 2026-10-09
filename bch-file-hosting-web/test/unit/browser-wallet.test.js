/*
  Unit tests for the BrowserWallet adapter
  (src/services/browser-wallet.js).

  The adapter wraps a minimal-slp-wallet instance and exposes a small `send`
  method, so the page service never depends on the wallet library directly.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const BrowserWallet = require('../../src/services/browser-wallet')

test('sends the requested satoshis to the address and returns the txid', async () => {
  const calls = []
  const wallet = {
    send: async (outputs) => {
      calls.push(outputs)
      return 'txid-1'
    }
  }
  const browserWallet = new BrowserWallet({ wallet })

  const txid = await browserWallet.send({ address: 'bitcoincash:qinvoice', amountSats: 2000 })

  assert.deepEqual(calls, [[{ address: 'bitcoincash:qinvoice', amountSat: 2000 }]])
  assert.equal(txid, 'txid-1')
})

test('requires a wallet', () => {
  assert.throws(() => new BrowserWallet(), /requires a wallet/)
  assert.throws(() => new BrowserWallet({}), /requires a wallet/)
})
