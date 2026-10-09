/*
  Unit tests for the file-host command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import FileHost, { UsageError } from '../../../src/commands/file-host.js'
import HostingApi from '../../../src/lib/hosting-api.js'
import WalletStore from '../../../src/lib/wallet-store.js'
import WalletService from '../../../src/lib/wallet-service.js'

const ADDRESS = 'bitcoincash:qinvoiceaddress00000000000000000000000000'
const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
const DOWNLOAD_URL = `http://localhost:5050/download/${CID}`
const GATEWAY_URL = `https://ipfs.io/ipfs/${CID}/photo.jpg`
const TXID = '1111111111111111111111111111111111111111111111111111111111111111'

describe('#file-host', () => {
  let sandbox
  let uut
  let output
  let errorOutput
  let walletStore
  let hostingApi

  const config = { apiUrl: 'http://localhost:5050' }
  const wallet = { mnemonic: 'stored mnemonic', cashAddress: 'bitcoincash:qpayer' }
  const quote = {
    success: true,
    cid: CID,
    filename: 'photo.jpg',
    sizeBytes: 1024,
    priceSats: 2000,
    paymentAddress: ADDRESS
  }
  const paid = {
    success: true,
    status: 'paid',
    cid: CID,
    downloadUrl: DOWNLOAD_URL,
    gatewayUrls: [GATEWAY_URL]
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    output = []
    errorOutput = []

    walletStore = {
      has: sandbox.stub().returns(false),
      read: sandbox.stub().returns(wallet),
      write: sandbox.stub()
    }

    hostingApi = {
      upload: sandbox.stub().resolves(quote),
      checkPayment: sandbox.stub().resolves(paid)
    }

    uut = new FileHost({
      config,
      hostingApi,
      walletStore,
      walletService: { sendSats: sandbox.stub().resolves(TXID) },
      sleep: sandbox.stub().resolves(),
      paymentCheckAttempts: 3,
      paymentCheckDelayMs: 0,
      output: (msg) => output.push(msg),
      errorOutput: (msg) => errorOutput.push(msg)
    })

    sandbox.stub(uut, 'readFile').returns(Buffer.from('file bytes'))
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#validateFlags', () => {
    it('should throw a usage error when no file is given', () => {
      try {
        uut.validateFlags({ name: 'payer' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, 'You must specify a file with the -f flag.')
      }
    })

    it('should throw a usage error when no wallet name is given', () => {
      try {
        uut.validateFlags({ file: './photo.jpg' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, 'You must specify a wallet name with the -n flag.')
      }
    })

    it('should throw a usage error when the wallet name is unsafe', () => {
      try {
        uut.validateFlags({ file: './photo.jpg', name: '../escape' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.include(err.message, 'Invalid wallet name')
      }
    })

    it('should return true when both flags are given', () => {
      assert.equal(uut.validateFlags({ file: './photo.jpg', name: 'payer' }), true)
    })
  })

  describe('#run', () => {
    it('should upload, pay the quote, and print the hosted result', async () => {
      hostingApi.checkPayment.onFirstCall().resolves({
        success: true,
        status: 'unpaid',
        receivedSats: 0,
        requiredSats: 2000
      })
      hostingApi.checkPayment.onSecondCall().resolves(paid)

      const result = await uut.run({ file: './photo.jpg', name: 'payer' })

      assert.equal(result, 0)

      const printed = output.join('\n')
      assert.include(printed, `CID: ${CID}`)
      assert.include(printed, `Download URL: ${DOWNLOAD_URL}`)
      assert.include(printed, `Gateway URL: ${GATEWAY_URL}`)

      sinon.assert.calledWith(hostingApi.upload, {
        filename: 'photo.jpg',
        buffer: sinon.match.instanceOf(Buffer)
      })
      sinon.assert.calledWith(uut.walletService.sendSats, {
        wallet,
        toAddress: ADDRESS,
        amountSats: 2000
      })
      // Sleeps once between the two checks, never after the confirming check.
      sinon.assert.calledOnceWithExactly(uut.sleep, 0)
    })

    it('should not pay an already hosted file and print its download URL', async () => {
      hostingApi.upload.resolves({
        success: true,
        alreadyHosted: true,
        cid: CID,
        downloadUrl: DOWNLOAD_URL
      })

      const result = await uut.run({ file: './photo.jpg', name: 'payer' })

      assert.equal(result, 0)
      assert.include(output.join('\n'), `Download URL: ${DOWNLOAD_URL}`)
      sinon.assert.notCalled(uut.walletService.sendSats)
      sinon.assert.notCalled(walletStore.read)
    })

    it('should return 1 and print Payment not confirmed when the payment never confirms', async () => {
      hostingApi.checkPayment.resolves({
        success: true,
        status: 'unpaid',
        receivedSats: 0,
        requiredSats: 2000
      })

      const result = await uut.run({ file: './photo.jpg', name: 'payer' })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Payment not confirmed.')
      sinon.assert.calledWith(uut.walletService.sendSats, {
        wallet,
        toAddress: ADDRESS,
        amountSats: 2000
      })
      sinon.assert.callCount(hostingApi.checkPayment, 3)
      // Three attempts sleep only between them: two delays, none after the last.
      sinon.assert.callCount(uut.sleep, 2)
      sinon.assert.alwaysCalledWithExactly(uut.sleep, 0)
    })

    it('should return 1 and not pay when the wallet does not exist', async () => {
      walletStore.read.returns(null)

      const result = await uut.run({ file: './photo.jpg', name: 'missing' })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Wallet "missing" not found.')
      sinon.assert.notCalled(uut.walletService.sendSats)
    })

    it('should return 1 and not pay when the upload is rejected', async () => {
      hostingApi.upload.rejects(new Error('File is too large'))

      const result = await uut.run({ file: './huge.bin', name: 'payer' })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'File is too large')
      sinon.assert.notCalled(uut.walletService.sendSats)
    })

    it('should return 1 and not upload when the local file cannot be read', async () => {
      uut.readFile.throws(new Error('Cannot read file: ./absent.bin'))

      const result = await uut.run({ file: './absent.bin', name: 'payer' })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Cannot read file')
      sinon.assert.notCalled(hostingApi.upload)
      sinon.assert.notCalled(uut.walletService.sendSats)
    })

    it('should return 2 and print the usage message when the file flag is missing', async () => {
      const result = await uut.run({ name: 'payer' })

      assert.equal(result, 2)
      assert.include(errorOutput.join('\n'), 'You must specify a file with the -f flag.')
      sinon.assert.notCalled(hostingApi.upload)
    })

    it('should return 2 and print the usage message when the wallet name flag is missing', async () => {
      const result = await uut.run({ file: './photo.jpg' })

      assert.equal(result, 2)
      assert.include(errorOutput.join('\n'), 'You must specify a wallet name with the -n flag.')
      sinon.assert.notCalled(hostingApi.upload)
    })

    it('should print a single JSON object when --json is set', async () => {
      const result = await uut.run({ file: './photo.jpg', name: 'payer', json: true })

      assert.equal(result, 0)
      assert.equal(output.length, 1)

      const parsed = JSON.parse(output[0])
      assert.equal(parsed.cid, CID)
      assert.equal(parsed.downloadUrl, DOWNLOAD_URL)
      assert.equal(parsed.txid, TXID)
    })

    it('should default gateway URLs to an empty list when the API omits them', async () => {
      hostingApi.checkPayment.resolves({
        success: true,
        status: 'paid',
        cid: CID,
        downloadUrl: DOWNLOAD_URL
      })

      const result = await uut.run({ file: './photo.jpg', name: 'payer', json: true })

      assert.equal(result, 0)
      assert.deepEqual(JSON.parse(output[0]).gatewayUrls, [])
    })
  })

  describe('#report', () => {
    it('should print no gateway URLs when the result has none', () => {
      uut.report({ status: 'paid', cid: CID, downloadUrl: DOWNLOAD_URL }, {})

      assert.include(output.join('\n'), `Download URL: ${DOWNLOAD_URL}`)
      assert.notInclude(output.join('\n'), 'Gateway URL')
    })
  })

  describe('#constructor', () => {
    it('should build default API and wallet dependencies from the config', () => {
      const defaultUut = new FileHost({ config })

      assert.instanceOf(defaultUut.hostingApi, HostingApi)
      assert.instanceOf(defaultUut.walletStore, WalletStore)
      assert.instanceOf(defaultUut.walletService, WalletService)
    })

    it('should fall back to a real timer for the payment poll delay', async () => {
      const defaultUut = new FileHost({ config })

      await defaultUut.sleep(0)

      assert.isFunction(defaultUut.sleep)
    })
  })
})
