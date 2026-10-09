/*
  Unit tests for the bch-file-hosting REST API adapter.
*/

// Global npm libraries
import { assert } from 'chai'
import sinon from 'sinon'

// Local libraries
import HostingApi, { HostingApiError } from '../../../src/lib/hosting-api.js'

describe('#hosting-api', () => {
  let sandbox
  const config = { apiUrl: 'http://localhost:5050' }

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('#upload', () => {
    it('POSTs the file to /files as multipart form data', async () => {
      const fetch = sandbox.stub().resolves({
        ok: true,
        status: 200,
        json: async () => ({ success: true, cid: 'bafy-test-cid' })
      })
      const uut = new HostingApi({ config, fetch })

      const result = await uut.upload({
        filename: 'photo.jpg',
        buffer: Buffer.from('file bytes')
      })

      assert.equal(result.cid, 'bafy-test-cid')
      sinon.assert.calledOnce(fetch)

      const [url, options] = fetch.firstCall.args
      assert.equal(url, 'http://localhost:5050/files')
      assert.equal(options.method, 'POST')
      assert.instanceOf(options.body, FormData)

      const uploaded = options.body.get('file')
      assert.equal(uploaded.name, 'photo.jpg')
      assert.equal(await uploaded.text(), 'file bytes')
    })

    it('throws the API error message when the response is not ok', async () => {
      const fetch = sandbox.stub().resolves({
        ok: false,
        status: 422,
        json: async () => ({ success: false, error: 'File is too large' })
      })
      const uut = new HostingApi({ config, fetch })

      try {
        await uut.upload({ filename: 'huge.bin', buffer: Buffer.from('') })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, HostingApiError)
        assert.equal(err.message, 'File is too large')
      }
    })

    it('throws a generic message when the error body is not JSON', async () => {
      const fetch = sandbox.stub().resolves({
        ok: false,
        status: 500,
        json: async () => { throw new Error('not json') }
      })
      const uut = new HostingApi({ config, fetch })

      try {
        await uut.upload({ filename: 'broken.bin', buffer: Buffer.from('') })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'HTTP 500')
      }
    })
  })

  describe('#checkPayment', () => {
    it('POSTs the payment address to /files/check-payment as JSON', async () => {
      const fetch = sandbox.stub().resolves({
        ok: true,
        status: 200,
        json: async () => ({ success: true, status: 'paid', cid: 'bafy-paid' })
      })
      const uut = new HostingApi({ config, fetch })

      const result = await uut.checkPayment({ paymentAddress: 'bitcoincash:qcheck' })

      assert.equal(result.cid, 'bafy-paid')
      sinon.assert.calledOnce(fetch)

      const [url, options] = fetch.firstCall.args
      assert.equal(url, 'http://localhost:5050/files/check-payment')
      assert.equal(options.method, 'POST')
      assert.equal(options.headers['Content-Type'], 'application/json')
      assert.deepEqual(JSON.parse(options.body), { paymentAddress: 'bitcoincash:qcheck' })
    })

    it('throws the API error message when the response is not ok', async () => {
      const fetch = sandbox.stub().resolves({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'Invoice not found' })
      })
      const uut = new HostingApi({ config, fetch })

      try {
        await uut.checkPayment({ paymentAddress: 'bitcoincash:qmissing' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, HostingApiError)
        assert.equal(err.message, 'Invoice not found')
      }
    })
  })

  describe('#getStatus', () => {
    it('GETs /files/:cid and returns the parsed body', async () => {
      const fetch = sandbox.stub().resolves({
        ok: true,
        status: 200,
        json: async () => ({ success: true, cid: 'bafy-known', status: 'pinned' })
      })
      const uut = new HostingApi({ config, fetch })

      const result = await uut.getStatus({ cid: 'bafy-known' })

      assert.equal(result.status, 'pinned')
      sinon.assert.calledOnce(fetch)

      const [url, options] = fetch.firstCall.args
      assert.equal(url, 'http://localhost:5050/files/bafy-known')
      assert.equal(options.method, 'GET')
    })

    it('throws the API error message when the response is not ok', async () => {
      const fetch = sandbox.stub().resolves({
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: 'File not found' })
      })
      const uut = new HostingApi({ config, fetch })

      try {
        await uut.getStatus({ cid: 'bafy-missing' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.instanceOf(err, HostingApiError)
        assert.equal(err.message, 'File not found')
      }
    })

    it('throws a generic message when the error body is not JSON', async () => {
      const fetch = sandbox.stub().resolves({
        ok: false,
        status: 500,
        json: async () => { throw new Error('not json') }
      })
      const uut = new HostingApi({ config, fetch })

      try {
        await uut.getStatus({ cid: 'bafy-known' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'HTTP 500')
      }
    })
  })
})
