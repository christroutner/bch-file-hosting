/*
  Unit tests for the wallet-create command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import WalletCreate, { UsageError } from '../../../src/commands/wallet-create.js'
import WalletStore from '../../../src/lib/wallet-store.js'
import WalletService from '../../../src/lib/wallet-service.js'

const USAGE_MESSAGE = 'You must specify a wallet name with the -n flag.'

describe('#wallet-create', () => {
  let sandbox
  let uut
  let output
  let errorOutput
  let walletStore

  const config = { apiUrl: 'http://localhost:5050' }
  const wallet = { mnemonic: 'secret mnemonic words', cashAddress: 'bitcoincash:qnew' }

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    output = []
    errorOutput = []

    walletStore = {
      has: sandbox.stub().returns(false),
      read: sandbox.stub(),
      write: sandbox.stub().returns(true)
    }

    uut = new WalletCreate({
      config,
      walletStore,
      walletService: { create: sandbox.stub().resolves(wallet) },
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
    it('should store the new wallet under the requested name', async () => {
      const result = await uut.execute({ name: 'payer' })

      assert.deepEqual(result, wallet)
      sinon.assert.calledWith(walletStore.write, 'payer', wallet)
    })

    it('should throw when the name already exists', async () => {
      walletStore.has.returns(true)

      try {
        await uut.execute({ name: 'payer' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.message, 'A wallet named payer already exists.')
      }

      sinon.assert.notCalled(uut.walletService.create)
      sinon.assert.notCalled(walletStore.write)
    })
  })

  describe('#run', () => {
    it('should print the address and return 0 on success', async () => {
      const result = await uut.run({ name: 'payer' })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'bitcoincash:qnew')
      assert.notInclude(output.join('\n'), wallet.mnemonic)
    })

    it('should return 2 and print the usage message when the name flag is missing', async () => {
      const result = await uut.run({})

      assert.equal(result, 2)
      assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
      sinon.assert.notCalled(uut.walletService.create)
    })

    it('should return 2 and reject an unsafe name without touching the store', async () => {
      const result = await uut.run({ name: '../escape' })

      assert.equal(result, 2)
      assert.equal(errorOutput.join('\n'), 'Invalid wallet name "../escape". Use only letters, digits, hyphens, and underscores.')
      sinon.assert.notCalled(walletStore.has)
      sinon.assert.notCalled(uut.walletService.create)
      sinon.assert.notCalled(walletStore.write)
    })

    it('should return 1 and print the error when the name already exists', async () => {
      walletStore.has.returns(true)

      const result = await uut.run({ name: 'payer' })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'A wallet named payer already exists.')
    })
  })

  describe('#constructor', () => {
    it('should build default wallet dependencies from the config', () => {
      const defaultUut = new WalletCreate({ config })

      assert.instanceOf(defaultUut.walletStore, WalletStore)
      assert.instanceOf(defaultUut.walletService, WalletService)
    })
  })
})
