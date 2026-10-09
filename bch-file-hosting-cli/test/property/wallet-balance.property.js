/*
  Property tests for the wallet-balance command (src/commands/wallet-balance.js).

  Invariants: the integer satoshi balance of a stored wallet is printed (and the
  mnemonic never is); an unknown wallet fails without calling the wallet
  service; and a missing name is a usage error that never reads the store.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import WalletBalance from '../../src/commands/wallet-balance.js'
import { forAllAsync, integerBetween } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const USAGE_MESSAGE = 'You must specify a wallet name with the -n flag.'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789-_'

function randomString (random, min, max) {
  const length = integerBetween(random, min, max)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[integerBetween(random, 0, ALPHABET.length - 1)]
  }
  return out
}

function randomWallet (random) {
  return {
    mnemonic: `mnemonic ${randomString(random, 10, 60)}`,
    cashAddress: `bitcoincash:q${randomString(random, 20, 38)}`,
    hdPath: `m/44'/245'/0'/0/${integerBetween(random, 0, 100000)}`
  }
}

// Build a command with an injected store and service that record every call.
function build ({ storedWallet = null, balance = 0, balanceError = null } = {}) {
  const calls = { read: [], balanceSats: [] }
  const output = []
  const errorOutput = []
  const walletStore = {
    has: () => false,
    read: (name) => { calls.read.push(name); return storedWallet },
    write: () => true
  }
  const walletService = {
    balanceSats: async (wallet) => {
      calls.balanceSats.push(wallet)
      if (balanceError) throw balanceError
      return balance
    }
  }
  const command = new WalletBalance({
    config,
    walletStore,
    walletService,
    output: (msg) => output.push(msg),
    errorOutput: (msg) => errorOutput.push(msg)
  })
  return { command, calls, output, errorOutput }
}

describe('#wallet-balance.property.js', () => {
  it('should print the balance of the stored wallet and never its mnemonic', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: (random) => ({
        name: randomString(random, 1, 20),
        wallet: randomWallet(random),
        balance: integerBetween(random, 0, 1000000000)
      }),
      property: async ({ name, wallet, balance }) => {
        const { command, calls, output } = build({ storedWallet: wallet, balance })

        const code = await command.run({ name })

        assert.equal(code, 0)
        assert.include(output.join('\n'), `Balance: ${balance} satoshis`)
        assert.notInclude(output.join('\n'), wallet.mnemonic)
        assert.deepEqual(calls.balanceSats, [wallet])
      }
    })
  })

  it('should reject an unknown wallet without calling the wallet service', () => {
    forAllAsync({
      seed: 2,
      runs: 200,
      generate: (random) => randomString(random, 1, 20),
      property: async (name) => {
        const { command, calls, errorOutput } = build({ storedWallet: null })

        const code = await command.run({ name })

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), `Wallet "${name}" not found.`)
        assert.lengthOf(calls.balanceSats, 0)
      }
    })
  })

  it('should return 2 and never read the store when the name flag is missing', async () => {
    const { command, calls, errorOutput } = build()

    const code = await command.run({})

    assert.equal(code, 2)
    assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
    assert.lengthOf(calls.read, 0)
    assert.lengthOf(calls.balanceSats, 0)
  })
})
