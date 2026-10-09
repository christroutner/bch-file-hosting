/*
  Property tests for the file-pay command (src/commands/file-pay.js).

  Invariants: the command maps outcomes to exit codes (0 success, 1 runtime
  error, 2 usage error); an unpaid invoice sends exactly
  requiredSats - receivedSats from the named wallet to the invoice address and
  prints the amount and txid; a paid invoice is a no-op; and --json always
  emits exactly one JSON object that round-trips the result.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import FilePay from '../../src/commands/file-pay.js'
import { forAllAsync, integerBetween, randomString, randomWallet } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const ADDRESS = 'bitcoincash:qinvoiceaddress00000000000000000000000000'
const WALLET = 'payer'
const TXID = '1111111111111111111111111111111111111111111111111111111111111111'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const STORED_WALLET = { mnemonic: 'stored mnemonic', cashAddress: 'bitcoincash:qpayer', hdPath: "m/44'/245'/0'/0/0" }
const MISSING_ADDRESS_MESSAGE = 'You must specify a payment address with the -a flag.'
const MISSING_WALLET_MESSAGE = 'You must specify a wallet name with the -n flag.'

function randomAddress (random) {
  return `bitcoincash:q${randomString(random, 20, 38, ALPHABET)}`
}

function randomUnpaid (random) {
  const receivedSats = integerBetween(random, 0, 100000)
  const requiredSats = receivedSats + integerBetween(random, 1, 100000)
  return { success: true, status: 'unpaid', receivedSats, requiredSats }
}

// Build a command with an injected API, store, and service that record calls.
function build ({ check, wallet = STORED_WALLET, send = async () => TXID } = {}) {
  const calls = { check: [], read: [], send: [] }
  const output = []
  const errorOutput = []
  const command = new FilePay({
    config,
    hostingApi: {
      checkPayment: async (args) => {
        calls.check.push(args)
        return check(args)
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
    output: (msg) => output.push(msg),
    errorOutput: (msg) => errorOutput.push(msg)
  })
  return { command, calls, output, errorOutput }
}

describe('#file-pay.property.js', () => {
  it('should echo the sent result as one JSON object when --json is set', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: (random) => ({
        invoice: randomUnpaid(random),
        txid: randomString(random, 1, 64, ALPHABET),
        address: randomAddress(random)
      }),
      property: async ({ invoice, txid, address }) => {
        const { command, output } = build({ check: async () => invoice, send: async () => txid })

        const code = await command.run({ address, name: WALLET, json: true })

        assert.equal(code, 0)
        assert.lengthOf(output, 1)
        assert.deepEqual(JSON.parse(output[0]), {
          status: 'sent',
          amountSats: invoice.requiredSats - invoice.receivedSats,
          txid,
          paymentAddress: address
        })
      }
    })
  })

  it('should send the outstanding satoshis from the named wallet and print the amount and txid', () => {
    forAllAsync({
      seed: 2,
      runs: 200,
      generate: (random) => ({
        invoice: randomUnpaid(random),
        txid: randomString(random, 1, 64, ALPHABET),
        address: randomAddress(random),
        wallet: randomWallet(random)
      }),
      property: async ({ invoice, txid, address, wallet }) => {
        const { command, calls, output } = build({
          check: async () => invoice,
          wallet,
          send: async () => txid
        })

        const code = await command.run({ address, name: WALLET })
        const text = output.join('\n')
        const amountSats = invoice.requiredSats - invoice.receivedSats

        assert.equal(code, 0)
        assert.include(text, `Amount: ${amountSats} satoshis`)
        assert.include(text, `Transaction: ${txid}`)
        assert.deepEqual(calls.check, [{ paymentAddress: address }])
        assert.deepEqual(calls.read, [WALLET])
        assert.deepEqual(calls.send, [{ wallet, toAddress: address, amountSats }])
      }
    })
  })

  it('should not pay an already paid invoice', () => {
    forAllAsync({
      seed: 3,
      runs: 100,
      generate: randomAddress,
      property: async (address) => {
        const { command, calls, output } = build({ check: async () => ({ success: true, status: 'paid' }) })

        const code = await command.run({ address, name: WALLET })

        assert.equal(code, 0)
        assert.include(output.join('\n'), 'Already paid')
        assert.lengthOf(calls.read, 0)
        assert.lengthOf(calls.send, 0)
      }
    })
  })

  it('should return 1 and not pay an expired invoice', () => {
    forAllAsync({
      seed: 4,
      runs: 100,
      generate: randomAddress,
      property: async (address) => {
        const { command, calls, errorOutput } = build({ check: async () => ({ success: true, status: 'expired' }) })

        const code = await command.run({ address, name: WALLET })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), 'Invoice expired.')
        assert.lengthOf(calls.send, 0)
      }
    })
  })

  it('should return 1 and not pay when the named wallet does not exist', () => {
    forAllAsync({
      seed: 5,
      runs: 100,
      generate: (random) => ({ invoice: randomUnpaid(random), name: randomString(random, 1, 20, ALPHABET) }),
      property: async ({ invoice, name }) => {
        const { command, calls, errorOutput } = build({ check: async () => invoice, wallet: null })

        const code = await command.run({ address: ADDRESS, name })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), `Wallet "${name}" not found.`)
        assert.lengthOf(calls.send, 0)
      }
    })
  })

  it('should return 1 and not pay when the check is rejected', () => {
    forAllAsync({
      seed: 6,
      runs: 100,
      generate: (random) => randomString(random, 1, 60, ALPHABET),
      property: async (message) => {
        const { command, calls, errorOutput } = build({ check: async () => { throw new Error(message) } })

        const code = await command.run({ address: ADDRESS, name: WALLET })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), message)
        assert.lengthOf(calls.send, 0)
      }
    })
  })

  it('should return 2 and touch nothing when the address flag is missing', async () => {
    const { command, calls, errorOutput } = build({ check: async () => ({ success: true, status: 'paid' }) })

    const code = await command.run({ name: WALLET })

    assert.equal(code, 2)
    assert.include(errorOutput.join('\n'), MISSING_ADDRESS_MESSAGE)
    assert.lengthOf(calls.check, 0)
    assert.lengthOf(calls.read, 0)
    assert.lengthOf(calls.send, 0)
  })

  it('should return 2 and touch nothing when the wallet name is missing or unsafe', async () => {
    const cases = [
      { flags: { address: ADDRESS }, message: MISSING_WALLET_MESSAGE },
      { flags: { address: ADDRESS, name: '../escape' }, message: 'Invalid wallet name' },
      { flags: { address: ADDRESS, name: 'has space' }, message: 'Invalid wallet name' }
    ]

    for (const { flags, message } of cases) {
      const { command, calls, errorOutput } = build({ check: async () => ({ success: true, status: 'paid' }) })

      const code = await command.run(flags)

      assert.equal(code, 2)
      assert.include(errorOutput.join('\n'), message)
      assert.lengthOf(calls.check, 0)
      assert.lengthOf(calls.read, 0)
      assert.lengthOf(calls.send, 0)
    }
  })
})
