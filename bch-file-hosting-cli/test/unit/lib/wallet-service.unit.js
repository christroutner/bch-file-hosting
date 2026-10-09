/*
  Unit tests for the minimal-slp-wallet wrapper.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import WalletService from '../../../src/lib/wallet-service.js'

const config = {
  walletUrl: 'https://free-bch.fullstack.cash',
  walletInterface: 'consumer-api'
}

// A stand-in for minimal-slp-wallet that never touches the network.
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
    this.balance = FakeBchWallet.balance
  }

  async getBalance () {
    return this.balance
  }
}

describe('#wallet-service', () => {
  beforeEach(() => {
    FakeBchWallet.balance = 42
  })

  describe('#create', () => {
    it('should generate a wallet and return its info', async () => {
      const uut = new WalletService({ config, BchWallet: FakeBchWallet })

      const wallet = await uut.create()

      assert.equal(wallet.cashAddress, 'bitcoincash:qfake')
      assert.equal(wallet.mnemonic, 'generated mnemonic')
    })
  })

  describe('#balanceSats', () => {
    it('should return the integer satoshi balance', async () => {
      const uut = new WalletService({ config, BchWallet: FakeBchWallet })

      const balance = await uut.balanceSats({
        mnemonic: 'test mnemonic',
        cashAddress: 'bitcoincash:qfake',
        hdPath: "m/44'/245'/0'"
      })

      assert.equal(balance, 42)
    })

    it('should throw when the backend returns a non-integer balance', async () => {
      FakeBchWallet.balance = 'nonsense'
      const uut = new WalletService({ config, BchWallet: FakeBchWallet })

      try {
        await uut.balanceSats({ mnemonic: 'test mnemonic', cashAddress: 'bitcoincash:qfake' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'Unexpected balance')
      }
    })
  })
})
