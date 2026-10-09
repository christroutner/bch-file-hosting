/*
  Unit tests for the wallet adapter. minimal-slp-wallet is replaced with a
  fake class, so no network calls are made.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import WalletAdapter from '../../../src/adapters/wallet.adapter.js'

const TREASURY = 'bitcoincash:qqtreasury'

describe('#wallet.adapter.js', () => {
  let sandbox
  let uut
  let config
  let instances

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    instances = []

    config = {
      mnemonic: 'test mnemonic words',
      treasuryAddress: TREASURY,
      walletInterface: 'web3',
      apiServer: 'https://free-bch.fullstack.cash',
      walletWifX402: ''
    }

    uut = new WalletAdapter({ config })

    // Fake minimal-slp-wallet that records how it was constructed.
    uut.BchWallet = class FakeBchWallet {
      constructor (secret, options) {
        this.secret = secret
        this.options = options
        this.walletInfoPromise = Promise.resolve(true)
        this.getKeyPair = sandbox.stub().callsFake(async (i) => ({
          cashAddress: `bitcoincash:addr${i}`,
          wif: `wif${i}`,
          hdIndex: i
        }))
        this.getBalance = sandbox.stub().resolves(2500)
        this.getUsd = sandbox.stub().resolves(400.5)
        this.initialize = sandbox.stub().resolves(true)
        this.sendAll = sandbox.stub().resolves('sweep-txid')
        instances.push(this)
      }
    }
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should throw if no config is passed in', () => {
      assert.throws(() => new WalletAdapter(), /requires a config object/)
    })
  })

  describe('#getWalletOptions', () => {
    it('should use the consumer API for web3', () => {
      assert.deepEqual(uut.getWalletOptions(), {
        interface: 'consumer-api',
        restURL: 'https://free-bch.fullstack.cash'
      })
    })

    it('should use the REST API for web2', () => {
      config.walletInterface = 'web2'
      config.apiServer = 'https://bch.fullstack.cash/v6/'

      assert.deepEqual(uut.getWalletOptions(), {
        interface: 'rest-api',
        restURL: 'https://bch.fullstack.cash/v6/'
      })
    })

    it('should pass the paying WIF for x402', () => {
      config.walletInterface = 'x402'
      config.walletWifX402 = 'L1payer'

      const options = uut.getWalletOptions()
      assert.equal(options.interface, 'rest-api')
      assert.equal(options.wif, 'L1payer')
    })

    it('should throw for x402 without a paying WIF', () => {
      config.walletInterface = 'x402'

      assert.throws(() => uut.getWalletOptions(), /WALLET_WIF_X402 is required/)
    })

    it('should throw for an unknown interface', () => {
      config.walletInterface = 'web4'

      assert.throws(() => uut.getWalletOptions(), /Unknown WALLET_INTERFACE 'web4'/)
    })
  })

  describe('#init', () => {
    it('should open the server wallet from the mnemonic', async () => {
      const result = await uut.init()

      assert.isTrue(result)
      assert.equal(instances[0].secret, 'test mnemonic words')
      assert.equal(instances[0].options.interface, 'consumer-api')
      assert.equal(uut.bchWallet, instances[0])
    })

    it('should throw if the mnemonic is missing', async () => {
      config.mnemonic = ''
      try {
        await uut.init()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'MNEMONIC is required')
      }
    })

    it('should throw if the treasury address is missing', async () => {
      config.treasuryAddress = ''
      try {
        await uut.init()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'TREASURY_ADDRESS is required')
      }
    })
  })

  describe('#getKeyPair', () => {
    it('should throw before init', async () => {
      try {
        await uut.getKeyPair(1)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'has not been initialized')
      }
    })

    it('should derive the key pair for an invoice index', async () => {
      await uut.init()

      const result = await uut.getKeyPair(7)

      assert.deepEqual(result, { cashAddress: 'bitcoincash:addr7', wif: 'wif7', hdIndex: 7 })
      assert.isTrue(uut.bchWallet.getKeyPair.calledWith(7))
    })

    it('should refuse index 0, the server wallet', async () => {
      await uut.init()
      try {
        await uut.getKeyPair(0)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'at least 1')
      }
    })

    it('should refuse a non-integer index', async () => {
      await uut.init()
      try {
        await uut.getKeyPair('3')
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'at least 1')
      }
    })
  })

  describe('#getBalanceSats', () => {
    it('should return the balance in satoshis', async () => {
      await uut.init()

      const result = await uut.getBalanceSats('bitcoincash:addr1')

      assert.equal(result, 2500)
      assert.isTrue(uut.bchWallet.getBalance.calledWith({ bchAddress: 'bitcoincash:addr1' }))
    })

    it('should throw if the backend returns a BCH amount instead of sats', async () => {
      await uut.init()
      uut.bchWallet.getBalance.resolves(0.000025)

      try {
        await uut.getBalanceSats('bitcoincash:addr1')
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'Unexpected balance')
      }
    })

    it('should throw before init', async () => {
      try {
        await uut.getBalanceSats('bitcoincash:addr1')
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'has not been initialized')
      }
    })
  })

  describe('#sweep', () => {
    it('should send everything from the invoice address to the treasury', async () => {
      await uut.init()

      const txid = await uut.sweep(4)

      assert.equal(txid, 'sweep-txid')
      const invoiceWallet = instances[1]
      assert.equal(invoiceWallet.secret, 'wif4')
      assert.isTrue(invoiceWallet.initialize.calledOnce)
      assert.isTrue(invoiceWallet.sendAll.calledWith(TREASURY))
    })

    it('should pass errors from the send through', async () => {
      await uut.init()
      const origCreate = uut.createWallet.bind(uut)
      sandbox.stub(uut, 'createWallet').callsFake(async (secret) => {
        const wallet = await origCreate(secret)
        wallet.sendAll.rejects(new Error('insufficient funds'))
        return wallet
      })

      try {
        await uut.sweep(4)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'insufficient funds')
      }
    })
  })

  describe('#getUsdPerBch', () => {
    it('should return the BCH price in USD', async () => {
      await uut.init()

      assert.equal(await uut.getUsdPerBch(), 400.5)
    })

    it('should throw on an invalid price', async () => {
      await uut.init()
      uut.bchWallet.getUsd.resolves(0)

      try {
        await uut.getUsdPerBch()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'Unexpected BCH price')
      }
    })

    it('should throw on a non-numeric price', async () => {
      await uut.init()
      uut.bchWallet.getUsd.resolves('400')

      try {
        await uut.getUsdPerBch()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'Unexpected BCH price')
      }
    })
  })
})
