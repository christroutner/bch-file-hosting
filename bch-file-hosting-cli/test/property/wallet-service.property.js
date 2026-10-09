/*
  Property tests for the minimal-slp-wallet wrapper (src/lib/wallet-service.js).

  Invariants: `balanceSats` returns exactly the backend's integer satoshi
  balance and re-derives the wallet from the stored mnemonic and hdPath;
  non-integer or negative backend balances are rejected; and `walletOptions`
  always carries the configured interface/URL with per-call extras merged on
  top.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import WalletService from '../../src/lib/wallet-service.js'
import { forAll, forAllAsync, integerBetween } from './lib/harness.js'

const config = {
  walletUrl: 'https://free-bch.fullstack.cash',
  walletInterface: 'consumer-api'
}
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789-_'

function randomString (random, min, max) {
  const length = integerBetween(random, min, max)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[integerBetween(random, 0, ALPHABET.length - 1)]
  }
  return out
}

// A stand-in for minimal-slp-wallet that never touches the network and records
// the constructor arguments and getBalance call of each instance.
function makeFakeWalletClass () {
  const state = { instances: [], balance: 0 }

  class FakeBchWallet {
    constructor (mnemonic, options) {
      this.mnemonic = mnemonic
      this.options = options
      this.walletInfo = {
        mnemonic: mnemonic || 'generated mnemonic',
        cashAddress: 'bitcoincash:qfake',
        hdPath: options.hdPath || "m/44'/245'/0'"
      }
      this.walletInfoPromise = Promise.resolve(this.walletInfo)
      state.instances.push(this)
    }

    async getBalance (args) {
      this.balanceArgs = args
      return state.balance
    }
  }

  return { FakeBchWallet, state }
}

describe('#wallet-service.property.js', () => {
  it('should return the backend balance and re-derive from the stored mnemonic and hdPath', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: (random) => ({
        balance: integerBetween(random, 0, 1000000000),
        mnemonic: randomString(random, 1, 60),
        hdPath: `m/44'/245'/0'/0/${integerBetween(random, 0, 100000)}`,
        cashAddress: `bitcoincash:q${randomString(random, 10, 30)}`
      }),
      property: async ({ balance, mnemonic, hdPath, cashAddress }) => {
        const { FakeBchWallet, state } = makeFakeWalletClass()
        state.balance = balance
        const uut = new WalletService({ config, BchWallet: FakeBchWallet })

        const result = await uut.balanceSats({ mnemonic, hdPath, cashAddress })

        assert.equal(result, balance)
        assert.equal(state.instances[0].mnemonic, mnemonic)
        assert.equal(state.instances[0].options.hdPath, hdPath)
        assert.equal(state.instances[0].balanceArgs.bchAddress, cashAddress)
      }
    })
  })

  it('should reject any non-integer or negative backend balance', () => {
    forAllAsync({
      seed: 2,
      runs: 100,
      generate: (random, run) => (run % 2 === 0
        ? integerBetween(random, -1000000000, -1)
        : integerBetween(random, 0, 1000) + 0.5),
      property: async (balance) => {
        const { FakeBchWallet, state } = makeFakeWalletClass()
        state.balance = balance
        const uut = new WalletService({ config, BchWallet: FakeBchWallet })

        let threw = false
        try {
          await uut.balanceSats({ mnemonic: 'test mnemonic', cashAddress: 'bitcoincash:qfake' })
        } catch (err) {
          threw = true
          assert.include(err.message, 'Unexpected balance')
        }
        assert.isTrue(threw)
      }
    })
  })

  it('should merge extra options over the configured wallet defaults', () => {
    forAll({
      seed: 3,
      runs: 100,
      generate: (random) => ({
        hdPath: `m/44'/245'/0'/0/${integerBetween(random, 0, 100000)}`,
        custom: randomString(random, 1, 12)
      }),
      property: ({ hdPath, custom }) => {
        const { FakeBchWallet } = makeFakeWalletClass()
        const uut = new WalletService({ config, BchWallet: FakeBchWallet })

        const options = uut.walletOptions({ hdPath, custom })

        assert.equal(options.interface, config.walletInterface)
        assert.equal(options.restURL, config.walletUrl)
        assert.equal(options.hdPath, hdPath)
        assert.equal(options.custom, custom)
      }
    })
  })

  it('should generate a wallet without a supplied mnemonic', () => {
    forAllAsync({
      seed: 4,
      runs: 100,
      generate: (random) => randomString(random, 1, 12),
      property: async () => {
        const { FakeBchWallet, state } = makeFakeWalletClass()
        const uut = new WalletService({ config, BchWallet: FakeBchWallet })

        const wallet = await uut.create()

        assert.equal(wallet.mnemonic, 'generated mnemonic')
        assert.isUndefined(state.instances[0].mnemonic)
      }
    })
  })
})
