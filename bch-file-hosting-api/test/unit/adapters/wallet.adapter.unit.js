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
  let builders
  let invoiceUtxos

  // Fake bch-js pieces used by sweep(). The transaction builder records what
  // it was given so tests can check the transaction that would be broadcast.
  function makeFakeBchjs () {
    return {
      Address: {
        toCashAddress: sandbox.stub().callsFake((addr) => {
          if (!addr.startsWith('bitcoincash:')) throw new Error('Unsupported address format')
          return addr
        })
      },
      BitcoinCash: {
        getByteCount: sandbox.stub().callsFake((ins, outs) => 10 + 148 * ins.P2PKH + 34 * outs.P2PKH)
      },
      ECPair: { fromWIF: sandbox.stub().callsFake((wif) => ({ wif })) },
      TransactionBuilder: class FakeTxBuilder {
        constructor () {
          this.inputs = []
          this.outputs = []
          this.signed = []
          this.hashTypes = { SIGHASH_ALL: 1 }
          builders.push(this)
        }

        addInput (txid, vout) { this.inputs.push({ txid, vout }) }
        addOutput (address, sats) { this.outputs.push({ address, sats }) }
        sign (i, keyPair, redeemScript, hashType, value) { this.signed.push({ i, wif: keyPair.wif, value }) }
        build () { return { toHex: () => 'signed-tx-hex' } }
      }
    }
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    instances = []
    builders = []
    invoiceUtxos = [
      { tx_hash: 'txa', tx_pos: 0, value: 2000 },
      { tx_hash: 'txb', tx_pos: 1, value: 3000 }
    ]

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
        this.broadcast = sandbox.stub().resolves('sweep-txid')
        this.bchjs = makeFakeBchjs()
        this.utxos = { utxoStore: { bchUtxos: invoiceUtxos } }
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

    it('should throw if the treasury address is not a valid BCH address', async () => {
      config.treasuryAddress = 'not-an-address'
      try {
        await uut.init()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'TREASURY_ADDRESS is not a valid BCH address')
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
    it('should spend every UTXO to a single treasury output and broadcast it', async () => {
      await uut.init()

      const txid = await uut.sweep(4)

      assert.equal(txid, 'sweep-txid')
      const invoiceWallet = instances[1]
      assert.equal(invoiceWallet.secret, 'wif4')
      assert.isTrue(invoiceWallet.initialize.calledOnce)

      const txb = builders[0]
      assert.deepEqual(txb.inputs, [{ txid: 'txa', vout: 0 }, { txid: 'txb', vout: 1 }])
      assert.deepEqual(txb.signed, [{ i: 0, wif: 'wif4', value: 2000 }, { i: 1, wif: 'wif4', value: 3000 }])
      assert.isTrue(invoiceWallet.broadcast.calledWith({ hex: 'signed-tx-hex' }))
    })

    it('should pay only the miner fee, with no donation output', async () => {
      await uut.init()

      await uut.sweep(4)

      // 2 inputs, 1 output: (10 + 296 + 34) bytes * 1.2 sats/byte = 408 sats
      assert.deepEqual(builders[0].outputs, [{ address: TREASURY, sats: 5000 - 408 }])
    })

    it('should sweep a single minimum invoice', async () => {
      invoiceUtxos.splice(0, invoiceUtxos.length, { tx_hash: 'txa', tx_pos: 0, value: 2000 })
      await uut.init()

      await uut.sweep(4)

      // (10 + 148 + 34) * 1.2 = 230.4 -> 231 sats
      assert.deepEqual(builders[0].outputs, [{ address: TREASURY, sats: 2000 - 231 }])
    })

    it('should refuse to sweep when nothing would be left above the dust limit', async () => {
      invoiceUtxos.splice(0, invoiceUtxos.length, { tx_hash: 'txa', tx_pos: 0, value: 700 })
      await uut.init()

      try {
        await uut.sweep(4)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'too small to sweep')
      }
      assert.isTrue(instances[1].broadcast.notCalled)
    })

    it('should throw when the invoice address has no UTXOs', async () => {
      invoiceUtxos.splice(0, invoiceUtxos.length)
      await uut.init()

      try {
        await uut.sweep(4)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'No BCH UTXOs to sweep')
      }
    })

    it('should treat a missing UTXO list as empty', async () => {
      await uut.init()
      const origCreate = uut.createWallet.bind(uut)
      sandbox.stub(uut, 'createWallet').callsFake(async (secret) => {
        const wallet = await origCreate(secret)
        wallet.utxos.utxoStore = {}
        return wallet
      })

      try {
        await uut.sweep(4)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'No BCH UTXOs to sweep')
      }
    })

    it('should pass broadcast errors through', async () => {
      await uut.init()
      const origCreate = uut.createWallet.bind(uut)
      sandbox.stub(uut, 'createWallet').callsFake(async (secret) => {
        const wallet = await origCreate(secret)
        wallet.broadcast.rejects(new Error('txn-mempool-conflict'))
        return wallet
      })

      try {
        await uut.sweep(4)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'txn-mempool-conflict')
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
