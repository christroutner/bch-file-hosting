/*
  Unit tests for the file-pay command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import FilePay, { UsageError } from '../../../src/commands/file-pay.js'
import HostingApi from '../../../src/lib/hosting-api.js'
import WalletStore from '../../../src/lib/wallet-store.js'
import WalletService from '../../../src/lib/wallet-service.js'

const ADDRESS = 'bitcoincash:qinvoiceaddress00000000000000000000000000'
const WALLET = 'payer'
const TXID = '1111111111111111111111111111111111111111111111111111111111111111'

describe('#file-pay', () => {
  let sandbox
  let uut
  let output
  let errorOutput
  let walletStore

  const config = { apiUrl: 'http://localhost:5050' }
  const storedWallet = { mnemonic: 'stored mnemonic', cashAddress: 'bitcoincash:qpayer' }

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    output = []
    errorOutput = []

    walletStore = {
      has: sandbox.stub().returns(false),
      read: sandbox.stub().returns(storedWallet),
      write: sandbox.stub()
    }

    uut = new FilePay({
      config,
      hostingApi: { checkPayment: sandbox.stub() },
      walletStore,
      walletService: { sendSats: sandbox.stub().resolves(TXID) },
      output: (msg) => output.push(msg),
      errorOutput: (msg) => errorOutput.push(msg)
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#validateFlags', () => {
    it('should throw a usage error when no address is given', () => {
      try {
        uut.validateFlags({ name: WALLET })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, 'You must specify a payment address with the -a flag.')
      }
    })

    it('should throw a usage error when no wallet name is given', () => {
      try {
        uut.validateFlags({ address: ADDRESS })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, 'You must specify a wallet name with the -n flag.')
      }
    })

    it('should throw a usage error when the wallet name is unsafe', () => {
      try {
        uut.validateFlags({ address: ADDRESS, name: '../escape' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.include(err.message, 'Invalid wallet name')
      }
    })

    it('should return true when both flags are given', () => {
      assert.equal(uut.validateFlags({ address: ADDRESS, name: WALLET }), true)
    })
  })

  describe('#run', () => {
    it('should send the outstanding satoshis and print the amount and txid', async () => {
      uut.hostingApi.checkPayment.resolves({
        success: true,
        status: 'unpaid',
        receivedSats: 1500,
        requiredSats: 62500
      })

      const result = await uut.run({ address: ADDRESS, name: WALLET })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'Amount: 61000 satoshis')
      assert.include(output.join('\n'), `Transaction: ${TXID}`)

      sinon.assert.calledWith(uut.hostingApi.checkPayment, { paymentAddress: ADDRESS })
      sinon.assert.calledWith(uut.walletService.sendSats, {
        wallet: storedWallet,
        toAddress: ADDRESS,
        amountSats: 61000
      })
    })

    it('should not pay an already paid invoice and print that it is already paid', async () => {
      uut.hostingApi.checkPayment.resolves({ success: true, status: 'paid' })

      const result = await uut.run({ address: ADDRESS, name: WALLET })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'Already paid')
      sinon.assert.notCalled(uut.walletService.sendSats)
      sinon.assert.notCalled(walletStore.read)
    })

    it('should return 1 and not pay an expired invoice', async () => {
      uut.hostingApi.checkPayment.resolves({ success: true, status: 'expired' })

      const result = await uut.run({ address: ADDRESS, name: WALLET })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Invoice expired.')
      sinon.assert.notCalled(uut.walletService.sendSats)
    })

    it('should return 1 and not pay when the wallet does not exist', async () => {
      uut.hostingApi.checkPayment.resolves({
        success: true,
        status: 'unpaid',
        receivedSats: 0,
        requiredSats: 2000
      })
      walletStore.read.returns(null)

      const result = await uut.run({ address: ADDRESS, name: 'missing' })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Wallet "missing" not found.')
      sinon.assert.notCalled(uut.walletService.sendSats)
    })

    it('should return 1 and not pay when the check is rejected', async () => {
      uut.hostingApi.checkPayment.rejects(new Error('Invoice not found'))

      const result = await uut.run({ address: ADDRESS, name: WALLET })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Invoice not found')
      sinon.assert.notCalled(uut.walletService.sendSats)
    })

    it('should return 2 and print the usage message when the address flag is missing', async () => {
      const result = await uut.run({ name: WALLET })

      assert.equal(result, 2)
      assert.include(errorOutput.join('\n'), 'You must specify a payment address with the -a flag.')
      sinon.assert.notCalled(uut.hostingApi.checkPayment)
      sinon.assert.notCalled(uut.walletService.sendSats)
    })

    it('should return 2 and print the usage message when the wallet name flag is missing', async () => {
      const result = await uut.run({ address: ADDRESS })

      assert.equal(result, 2)
      assert.include(errorOutput.join('\n'), 'You must specify a wallet name with the -n flag.')
      sinon.assert.notCalled(uut.hostingApi.checkPayment)
      sinon.assert.notCalled(uut.walletService.sendSats)
    })

    it('should print a single JSON object when --json is set', async () => {
      uut.hostingApi.checkPayment.resolves({
        success: true,
        status: 'unpaid',
        receivedSats: 0,
        requiredSats: 2000
      })

      const result = await uut.run({ address: ADDRESS, name: WALLET, json: true })

      assert.equal(result, 0)
      assert.equal(output.length, 1)

      const parsed = JSON.parse(output[0])
      assert.equal(parsed.txid, TXID)
      assert.equal(parsed.amountSats, 2000)
    })
  })

  describe('#constructor', () => {
    it('should build default API and wallet dependencies from the config', () => {
      const defaultUut = new FilePay({ config })

      assert.instanceOf(defaultUut.hostingApi, HostingApi)
      assert.instanceOf(defaultUut.walletStore, WalletStore)
      assert.instanceOf(defaultUut.walletService, WalletService)
    })
  })
})
