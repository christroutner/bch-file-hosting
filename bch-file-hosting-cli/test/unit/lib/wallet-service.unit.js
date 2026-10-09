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
    this.initialized = false
    this.sentOutputs = null
    FakeBchWallet.lastInstance = this
  }

  async initialize () {
    this.initialized = true
  }

  async getBalance () {
    return this.balance
  }

  async send (outputs) {
    this.sentOutputs = outputs
    return FakeBchWallet.txid
  }
}

describe('#wallet-service', () => {
  beforeEach(() => {
    FakeBchWallet.balance = 42
    FakeBchWallet.txid = 'fake-txid'
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

    it('should accept a zero satoshi balance', async () => {
      FakeBchWallet.balance = 0
      const uut = new WalletService({ config, BchWallet: FakeBchWallet })

      const balance = await uut.balanceSats({ mnemonic: 'test mnemonic', cashAddress: 'bitcoincash:qfake' })

      assert.equal(balance, 0)
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

  describe('#sendSats', () => {
    it('should broadcast a BCH payment and return the transaction id', async () => {
      const uut = new WalletService({ config, BchWallet: FakeBchWallet })

      const txid = await uut.sendSats({
        wallet: { mnemonic: 'test mnemonic', cashAddress: 'bitcoincash:qpayer', hdPath: "m/44'/245'/0'" },
        toAddress: 'bitcoincash:qinvoice',
        amountSats: 2000
      })

      assert.equal(txid, 'fake-txid')
      assert.equal(FakeBchWallet.lastInstance.initialized, true)
      assert.deepEqual(FakeBchWallet.lastInstance.sentOutputs, [
        { address: 'bitcoincash:qinvoice', amountSat: 2000 }
      ])
    })

    it('should broadcast the smallest positive integer amount (1 satoshi)', async () => {
      const uut = new WalletService({ config, BchWallet: FakeBchWallet })

      const txid = await uut.sendSats({
        wallet: { mnemonic: 'test mnemonic', cashAddress: 'bitcoincash:qpayer' },
        toAddress: 'bitcoincash:qinvoice',
        amountSats: 1
      })

      assert.equal(txid, 'fake-txid')
      assert.deepEqual(FakeBchWallet.lastInstance.sentOutputs, [
        { address: 'bitcoincash:qinvoice', amountSat: 1 }
      ])
    })

    it('should throw when the backend returns no transaction id', async () => {
      FakeBchWallet.txid = ''
      const uut = new WalletService({ config, BchWallet: FakeBchWallet })

      try {
        await uut.sendSats({
          wallet: { mnemonic: 'test mnemonic', cashAddress: 'bitcoincash:qpayer' },
          toAddress: 'bitcoincash:qinvoice',
          amountSats: 2000
        })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'Unexpected transaction')
      }
    })

    it('should reject a non-positive or non-integer amount', async () => {
      const uut = new WalletService({ config, BchWallet: FakeBchWallet })

      for (const amountSats of [0, -1, 1.5, '2000']) {
        try {
          await uut.sendSats({
            wallet: { mnemonic: 'test mnemonic', cashAddress: 'bitcoincash:qpayer' },
            toAddress: 'bitcoincash:qinvoice',
            amountSats
          })
          assert.fail(`Unexpected result for ${amountSats}`)
        } catch (err) {
          assert.include(err.message, 'amountSats')
        }
      }
    })
  })
})
