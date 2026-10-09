/*
  Unit tests for the file-check command.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import FileCheck, { UsageError } from '../../../src/commands/file-check.js'
import HostingApi from '../../../src/lib/hosting-api.js'

const USAGE_MESSAGE = 'You must specify a payment address with the -a flag.'
const ADDRESS = 'bitcoincash:qcheckaddress00000000000000000000000000'

describe('#file-check', () => {
  let sandbox
  let uut
  let output
  let errorOutput

  const config = { apiUrl: 'http://localhost:5050' }

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    output = []
    errorOutput = []

    uut = new FileCheck({
      config,
      hostingApi: { checkPayment: sandbox.stub() },
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
        uut.validateFlags({})
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, UsageError)
        assert.equal(err.message, USAGE_MESSAGE)
      }
    })

    it('should return true when an address is given', () => {
      assert.equal(uut.validateFlags({ address: ADDRESS }), true)
    })
  })

  describe('#run', () => {
    it('should print the CID and links for a paid invoice', async () => {
      uut.hostingApi.checkPayment.resolves({
        success: true,
        status: 'paid',
        cid: 'bafy-paid',
        downloadUrl: 'http://localhost:5050/download/bafy-paid',
        gatewayUrls: ['https://ipfs.io/ipfs/bafy-paid/photo.jpg']
      })

      const result = await uut.run({ address: ADDRESS })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'bafy-paid')
      assert.include(output.join('\n'), 'http://localhost:5050/download/bafy-paid')
      assert.include(output.join('\n'), 'https://ipfs.io/ipfs/bafy-paid/photo.jpg')

      sinon.assert.calledWith(uut.hostingApi.checkPayment, { paymentAddress: ADDRESS })
    })

    it('should print a paid invoice with no gateway URLs', async () => {
      uut.hostingApi.checkPayment.resolves({
        success: true,
        status: 'paid',
        cid: 'bafy-paid',
        downloadUrl: 'http://localhost:5050/download/bafy-paid'
      })

      const result = await uut.run({ address: ADDRESS })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'bafy-paid')
      assert.notInclude(output.join('\n'), 'Gateway URL')
    })

    it('should print the received, required, and expiry for an unpaid invoice', async () => {
      uut.hostingApi.checkPayment.resolves({
        success: true,
        status: 'unpaid',
        receivedSats: 1500,
        requiredSats: 62500,
        quoteExpiresAt: '2026-10-11T12:00:00.000Z'
      })

      const result = await uut.run({ address: ADDRESS })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'Received: 1500 satoshis')
      assert.include(output.join('\n'), 'Required: 62500 satoshis')
      assert.include(output.join('\n'), '2026-10-11T12:00:00.000Z')
    })

    it('should print the expired status for an expired invoice', async () => {
      uut.hostingApi.checkPayment.resolves({ success: true, status: 'expired' })

      const result = await uut.run({ address: ADDRESS })

      assert.equal(result, 0)
      assert.include(output.join('\n'), 'expired')
    })

    it('should return 1 and print the API error when the check is rejected', async () => {
      uut.hostingApi.checkPayment.rejects(new Error('Invoice not found'))

      const result = await uut.run({ address: ADDRESS })

      assert.equal(result, 1)
      assert.include(errorOutput.join('\n'), 'Invoice not found')
    })

    it('should return 2 and print the usage message when the address flag is missing', async () => {
      const result = await uut.run({})

      assert.equal(result, 2)
      assert.include(errorOutput.join('\n'), USAGE_MESSAGE)
      sinon.assert.notCalled(uut.hostingApi.checkPayment)
    })

    it('should print a single JSON object when --json is set', async () => {
      uut.hostingApi.checkPayment.resolves({
        success: true,
        status: 'paid',
        cid: 'bafy-paid',
        downloadUrl: 'http://localhost:5050/download/bafy-paid',
        gatewayUrls: []
      })

      const result = await uut.run({ address: ADDRESS, json: true })

      assert.equal(result, 0)
      assert.equal(output.length, 1)

      const parsed = JSON.parse(output[0])
      assert.equal(parsed.status, 'paid')
      assert.equal(parsed.cid, 'bafy-paid')
      assert.equal(parsed.downloadUrl, 'http://localhost:5050/download/bafy-paid')
    })
  })

  describe('#constructor', () => {
    it('should build a default HostingApi from the config', () => {
      const defaultUut = new FileCheck({ config })

      assert.instanceOf(defaultUut.hostingApi, HostingApi)
    })
  })
})
