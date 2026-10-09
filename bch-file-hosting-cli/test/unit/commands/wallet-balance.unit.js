/*
  Unit tests for the wallet-balance command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import WalletBalance, { UsageError } from '../../../src/commands/wallet-balance.js'
import WalletStore from '../../../src/lib/wallet-store.js'
import WalletService from '../../../src/lib/wallet-service.js'

const USAGE_MESSAGE = 'You must specify a wallet name with the -n flag.'

describe('#wallet-balance', () => {
  let sandbox
  let uut
  let output
  let errorOutput
  let walletStore

  const config = { apiUrl: 'http://localhost:5050' }
  const wallet = { mnemonic: 'secret mnemonic words', cashAddress: 'bitcoincash:qpayer' }

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    output = []
    errorOutput = []

    walletStore = {
      has: sandbox.stub(),
      read: sandbox.stub().returns(wallet),
      write: sandbox.stub()
    }

    uut = new WalletBalance({
      config,
      walletStore,
      walletService: { balanceSats: sandbox.stub().resolves(100000) },
      output: (msg) => output.push(msg),
      errorOutput: (msg) => errorOutput.push(msg)
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#validateFlags', () => {
    it('should throw a usage error when no name is given', () => {
      try {
        uut.validateFlags({})
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, USAGE_MESSAGE)
      }
    })

    it('should return true when a name is given', () => {
      assert.equal(uut.validateFlags({ name: 'payer' }), true)
    })
  })

  describe('#execute', () => {
    it('should read the wallet and return its balance', async () => {
      const result = await uut.execute({ name: 'payer' })

      assert.deepEqual(result, { name: 'payer', satoshis: 100000 })
      sinon.assert.calledWith(walletStore.read, 'payer')
      sinon.assert.calledWith(uut.walletService.balanceSats, wallet)
    })

    it('should throw when the wallet does not exist', async () => {
      walletStore.read.returns(null)

      try {
        await uut.execute({ name: 'missing' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.message, 'Wallet "missing" not found.')
      }

      sinon.assert.notCalled(uut.walletService.balanceSats)
    })
  })

  describe('#run', () => {
    it('should print the balance and return 0 on success', async () => {
      const result = await uut.run({ name: 'payer' })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'Balance: 100000 satoshis')
      assert.notInclude(output.join('\n'), wallet.mnemonic)
    })

    it('should return 2 and print the usage message when the name flag is missing', async () => {
      const result = await uut.run({})

      assert.equal(result, 2)
      assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
    })

    it('should return 1 and print the error when the wallet does not exist', async () => {
      walletStore.read.returns(null)

      const result = await uut.run({ name: 'missing' })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Wallet "missing" not found.')
    })
  })

  describe('#constructor', () => {
    it('should build default wallet dependencies from the config', () => {
      const defaultUut = new WalletBalance({ config })

      assert.instanceOf(defaultUut.walletStore, WalletStore)
      assert.instanceOf(defaultUut.walletService, WalletService)
    })
  })
})
