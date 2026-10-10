/*
  Unit tests for the file use-cases.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import FileUseCases from '../../../src/use-cases/file-use-cases.js'
import { FILE_STATUS } from '../../../src/entities/file-upload.js'
import { INVOICE_STATUS } from '../../../src/entities/invoice.js'
import { makeAdapters, fakeAddress, TEST_CID } from '../mocks/use-case-adapters.js'

const NOW = new Date('2026-10-08T12:00:00.000Z')
const HOUR = 60 * 60 * 1000

describe('#file-use-cases.js', () => {
  let sandbox
  let adapters
  let uut
  let upload

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    adapters = await makeAdapters(sandbox)
    uut = new FileUseCases({ adapters })
    uut.now = () => NOW
    uut.unlink = sandbox.stub().resolves()

    upload = { filePath: '/tmp/uploads/abc', filename: 'photo.jpg', sizeBytes: 20000 }
  })

  afterEach(async () => {
    sandbox.restore()
    await adapters.db.close()
  })

  it('should throw if no adapters are passed in', () => {
    assert.throws(() => new FileUseCases(), /requires the adapters/)
  })

  describe('#uploadAndQuote', () => {
    it('should add the file to IPFS and return a quote with a new payment address', async () => {
      const result = await uut.uploadAndQuote(upload)

      assert.deepEqual(result, {
        alreadyHosted: false,
        cid: TEST_CID,
        filename: 'photo.jpg',
        sizeBytes: 20000,
        billedBytes: 100000,
        priceSats: 2000,
        priceBch: 0.00002,
        usdPrice: 0.001,
        paymentAddress: fakeAddress(1),
        quoteExpiresAt: new Date(NOW.getTime() + 24 * HOUR).toISOString()
      })
      assert.isTrue(adapters.ipfs.addFile.calledWith({ filePath: '/tmp/uploads/abc', filename: 'photo.jpg' }))
      assert.isTrue(adapters.wallet.getKeyPair.calledWith(1))
    })

    it('should price the file from the current BCH price', async () => {
      upload.sizeBytes = 1000000

      const result = await uut.uploadAndQuote(upload)

      assert.equal(result.priceSats, 2500)
      assert.equal(result.billedBytes, 1000000)
    })

    it('should save the invoice and a staged file record', async () => {
      await uut.uploadAndQuote(upload)

      const invoice = await adapters.localdb.invoices.get(fakeAddress(1))
      assert.equal(invoice.status, INVOICE_STATUS.AWAITING_PAYMENT)
      assert.equal(invoice.hdIndex, 1)
      assert.equal(invoice.cid, TEST_CID)
      assert.equal(invoice.usdPerBch, 400)
      assert.notProperty(invoice, 'wif')

      const file = await adapters.localdb.files.get(TEST_CID)
      assert.equal(file.status, FILE_STATUS.STAGED)
      assert.equal(file.paymentAddress, fakeAddress(1))
      assert.deepEqual(file.pins, [])
    })

    it('should add the invoice to the cleanup index', async () => {
      await uut.uploadAndQuote(upload)

      const old = await adapters.localdb.invoices.listCreatedBefore('2099-01-01T00:00:00.000Z')
      assert.deepEqual(old, [fakeAddress(1)])
    })

    it('should give each new upload its own address', async () => {
      adapters.ipfs.addFile.onSecondCall().resolves('bafy-second-cid')

      const first = await uut.uploadAndQuote(upload)
      const second = await uut.uploadAndQuote({ ...upload, filename: 'other.jpg' })

      assert.notEqual(first.paymentAddress, second.paymentAddress)
    })

    it('should delete the temp file after a successful upload', async () => {
      await uut.uploadAndQuote(upload)

      assert.isTrue(uut.unlink.calledOnceWith('/tmp/uploads/abc'))
    })

    it('should reject an invalid upload with a 422 error and still delete the temp file', async () => {
      upload.sizeBytes = 100000001

      try {
        await uut.uploadAndQuote(upload)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.name, 'ValidationError')
        assert.equal(err.status, 422)
        assert.include(err.message, 'exceeds the maximum size')
      }
      assert.isTrue(adapters.ipfs.addFile.notCalled)
      assert.isTrue(uut.unlink.calledOnceWith('/tmp/uploads/abc'))
    })

    it('should reject a zero-byte upload with a 422 error, create no invoice, and still delete the temp file', async () => {
      upload.sizeBytes = 0

      try {
        await uut.uploadAndQuote(upload)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.name, 'ValidationError')
        assert.equal(err.status, 422)
        assert.include(err.message, 'positive integer')
      }
      assert.isTrue(adapters.ipfs.addFile.notCalled)
      assert.isTrue(adapters.wallet.getKeyPair.notCalled)
      assert.deepEqual(await adapters.localdb.invoices.list(), [])
      assert.isTrue(uut.unlink.calledOnceWith('/tmp/uploads/abc'))
    })

    it('should delete the temp file when IPFS fails', async () => {
      adapters.ipfs.addFile.rejects(new Error('blockstore full'))

      try {
        await uut.uploadAndQuote(upload)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'blockstore full')
      }
      assert.isTrue(uut.unlink.calledOnce)
    })

    it('should not create an invoice when the BCH price is unavailable', async () => {
      adapters.wallet.getUsdPerBch.rejects(new Error('price server down'))

      try {
        await uut.uploadAndQuote(upload)
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'price server down')
      }
      assert.deepEqual(await adapters.localdb.invoices.list(), [])
    })

    it('should ignore a temp file that is already gone', async () => {
      const err = new Error('gone')
      err.code = 'ENOENT'
      uut.unlink.rejects(err)

      await uut.uploadAndQuote(upload)

      assert.isTrue(adapters.logger.error.notCalled)
    })

    it('should log, but not throw, when the temp file cannot be deleted', async () => {
      uut.unlink.rejects(new Error('permission denied'))

      const result = await uut.uploadAndQuote(upload)

      assert.equal(result.cid, TEST_CID)
      assert.include(adapters.logger.error.firstCall.args[0], 'permission denied')
    })

    it('should not try to delete a temp file when no path was given', async () => {
      try {
        await uut.uploadAndQuote({ filename: 'a.txt', sizeBytes: -1 })
      } catch (err) {
        // expected
      }
      assert.isTrue(uut.unlink.notCalled)
    })

    it('should return the same quote when an unpaid file is uploaded again', async () => {
      const first = await uut.uploadAndQuote(upload)
      const second = await uut.uploadAndQuote(upload)

      assert.deepEqual(second, first)
      assert.isTrue(adapters.wallet.getKeyPair.calledOnce)
    })

    it('should issue a new invoice when the earlier quote has expired', async () => {
      const first = await uut.uploadAndQuote(upload)
      uut.now = () => new Date(NOW.getTime() + 25 * HOUR)

      const second = await uut.uploadAndQuote(upload)

      assert.notEqual(second.paymentAddress, first.paymentAddress)
      const file = await adapters.localdb.files.get(TEST_CID)
      assert.equal(file.paymentAddress, second.paymentAddress)
    })

    it('should issue a new invoice when the earlier invoice was deleted', async () => {
      const first = await uut.uploadAndQuote(upload)
      await adapters.localdb.invoices.update(first.paymentAddress, { status: INVOICE_STATUS.DELETED })

      const second = await uut.uploadAndQuote(upload)

      assert.notEqual(second.paymentAddress, first.paymentAddress)
    })

    it('should issue a new invoice for a file that was deleted unpaid', async () => {
      const first = await uut.uploadAndQuote(upload)
      await adapters.localdb.files.update(TEST_CID, { status: FILE_STATUS.DELETED })

      const second = await uut.uploadAndQuote(upload)

      assert.notEqual(second.paymentAddress, first.paymentAddress)
      assert.equal((await adapters.localdb.files.get(TEST_CID)).status, FILE_STATUS.STAGED)
    })

    it('should return links instead of an invoice for a file that is already hosted', async () => {
      await adapters.localdb.files.put({
        cid: TEST_CID,
        filename: 'photo.jpg',
        sizeBytes: 20000,
        status: FILE_STATUS.PINNED,
        hostedUntil: '2027-10-08T12:00:00.000Z'
      })

      const result = await uut.uploadAndQuote(upload)

      assert.isTrue(result.alreadyHosted)
      assert.equal(result.hostedUntil, '2027-10-08T12:00:00.000Z')
      assert.equal(result.downloadUrl, `http://localhost:5050/download/${TEST_CID}`)
      assert.equal(result.viewUrl, `http://localhost:5050/view/${TEST_CID}`)
      assert.deepEqual(result.gatewayUrls, [`https://ipfs.io/ipfs/${TEST_CID}/photo.jpg`])
      assert.notProperty(result, 'paymentAddress')
      assert.isTrue(adapters.wallet.getKeyPair.notCalled)
      assert.isTrue(uut.unlink.calledOnce)
    })

    it('should treat a paid file whose pinning failed as already hosted', async () => {
      await adapters.localdb.files.put({ cid: TEST_CID, filename: 'photo.jpg', status: FILE_STATUS.PIN_FAILED })

      const result = await uut.uploadAndQuote(upload)

      assert.isTrue(result.alreadyHosted)
    })
  })

  describe('#getFileStatus', () => {
    it('should return the file record', async () => {
      await uut.uploadAndQuote(upload)

      const result = await uut.getFileStatus({ cid: TEST_CID })

      assert.equal(result.cid, TEST_CID)
      assert.equal(result.status, FILE_STATUS.STAGED)
      assert.equal(result.filename, 'photo.jpg')
      assert.deepEqual(result.pins, [])
      assert.isNull(result.hostedUntil)
      assert.notProperty(result, 'paymentAddress')
    })

    it('should throw a 404 error for an unknown CID', async () => {
      try {
        await uut.getFileStatus({ cid: 'unknown' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
      }
    })
  })

  describe('#listFeed', () => {
    async function seedFile (overrides = {}) {
      await adapters.localdb.files.put({
        cid: TEST_CID,
        filename: 'photo.jpg',
        sizeBytes: 20000,
        paymentAddress: fakeAddress(1),
        status: FILE_STATUS.PINNED,
        pins: [{ provider: 'local-helia', status: 'pinned' }],
        createdAt: '2026-01-01T00:00:00.000Z',
        paidAt: '2026-01-02T00:00:00.000Z',
        hostedUntil: '2027-01-02T00:00:00.000Z',
        ...overrides
      })
    }

    it('should publish paid files newest paid first and hide unpaid ones', async () => {
      await seedFile({ cid: 'bafy-old', paidAt: '2026-01-01T00:00:00.000Z' })
      await seedFile({ cid: 'bafy-new', paidAt: '2026-01-03T00:00:00.000Z' })
      await seedFile({ cid: 'bafy-staged', status: FILE_STATUS.STAGED, paidAt: null })

      const result = await uut.listFeed({ limit: 10 })

      assert.deepEqual(result.files.map(f => f.cid), ['bafy-new', 'bafy-old'])
      assert.isNull(result.nextCursor)
    })

    it('should publish the public fields of a file', async () => {
      await seedFile()

      const result = await uut.listFeed({ limit: 10 })

      assert.deepEqual(result.files[0], {
        cid: TEST_CID,
        filename: 'photo.jpg',
        sizeBytes: 20000,
        status: FILE_STATUS.PINNED,
        paymentAddress: fakeAddress(1),
        createdAt: '2026-01-01T00:00:00.000Z',
        paidAt: '2026-01-02T00:00:00.000Z',
        hostedUntil: '2027-01-02T00:00:00.000Z',
        downloadUrl: `http://localhost:5050/download/${TEST_CID}`,
        viewUrl: `http://localhost:5050/view/${TEST_CID}`,
        gatewayUrls: [`https://ipfs.io/ipfs/${TEST_CID}/photo.jpg`],
        pins: [{ provider: 'local-helia', status: 'pinned' }]
      })
    })

    it('should include the configured provider gateway URLs in the feed', async () => {
      await seedFile()
      adapters.pinning.getProviders = () => [
        { gatewayUrl: (cid, filename) => `https://pin.example/ipfs/${cid}/${encodeURIComponent(filename)}` }
      ]

      const result = await uut.listFeed({ limit: 10 })

      assert.deepEqual(result.files[0].gatewayUrls, [
        `https://ipfs.io/ipfs/${TEST_CID}/photo.jpg`,
        `https://pin.example/ipfs/${TEST_CID}/photo.jpg`
      ])
    })

    it('should paginate with the cursor from the previous page', async () => {
      await seedFile({ cid: 'bafy-old', paidAt: '2026-01-01T00:00:00.000Z' })
      await seedFile({ cid: 'bafy-new', paidAt: '2026-01-03T00:00:00.000Z' })

      const first = await uut.listFeed({ limit: 1 })
      const second = await uut.listFeed({ limit: 1, cursor: first.nextCursor })

      assert.deepEqual(first.files.map(f => f.cid), ['bafy-new'])
      assert.deepEqual(second.files.map(f => f.cid), ['bafy-old'])
      assert.isNull(second.nextCursor)
    })

    it('should reject an invalid page limit with a 422 error', async () => {
      try {
        await uut.listFeed({ limit: 'abc' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.name, 'ValidationError')
        assert.equal(err.status, 422)
        assert.include(err.message, 'Page limit')
      }
    })

    it('should reject an unknown cursor with a 422 error', async () => {
      try {
        await uut.listFeed({ cursor: 'not-a-cursor' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.name, 'ValidationError')
        assert.equal(err.status, 422)
        assert.include(err.message, 'Cursor is not valid')
      }
    })
  })

  describe('#getDownload', () => {
    it('should stream a paid file', async () => {
      await adapters.localdb.files.put({ cid: TEST_CID, filename: 'photo.jpg', sizeBytes: 20000, status: FILE_STATUS.PINNED })

      const result = await uut.getDownload({ cid: TEST_CID })

      assert.deepEqual(result, { filename: 'photo.jpg', sizeBytes: 20000, content: 'content-stream' })
      assert.isTrue(adapters.ipfs.cat.calledWith({ cid: TEST_CID, filename: 'photo.jpg' }))
    })

    it('should not serve an unpaid file', async () => {
      await uut.uploadAndQuote(upload)

      try {
        await uut.getDownload({ cid: TEST_CID })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
      }
      assert.isTrue(adapters.ipfs.cat.notCalled)
    })

    it('should throw a 404 error for an unknown CID', async () => {
      try {
        await uut.getDownload({ cid: 'unknown' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
      }
    })

    it('should not serve a paid file that the server has not pinned', async () => {
      await adapters.localdb.files.put({ cid: TEST_CID, filename: 'photo.jpg', sizeBytes: 20000, status: FILE_STATUS.PINNED })
      adapters.ipfs.isPinned.resolves(false)

      try {
        await uut.getDownload({ cid: TEST_CID })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
      }
      assert.isTrue(adapters.ipfs.cat.notCalled)
    })
  })

  describe('#getView', () => {
    it('should stream a pinned image inline with its content type', async () => {
      await adapters.localdb.files.put({ cid: TEST_CID, filename: 'photo.jpg', sizeBytes: 20000, status: FILE_STATUS.PINNED })

      const result = await uut.getView({ cid: TEST_CID })

      assert.deepEqual(result, {
        filename: 'photo.jpg',
        sizeBytes: 20000,
        contentType: 'image/jpeg',
        disposition: 'inline',
        content: 'content-stream'
      })
      assert.isTrue(adapters.ipfs.cat.calledWith({ cid: TEST_CID, filename: 'photo.jpg' }))
    })

    it('should serve other file types as a download', async () => {
      await adapters.localdb.files.put({ cid: TEST_CID, filename: 'archive.tar', sizeBytes: 20000, status: FILE_STATUS.PINNED })

      const result = await uut.getView({ cid: TEST_CID })

      assert.equal(result.contentType, 'application/octet-stream')
      assert.equal(result.disposition, 'attachment')
    })

    it('should not serve an unpaid file', async () => {
      await uut.uploadAndQuote(upload)

      try {
        await uut.getView({ cid: TEST_CID })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
      }
      assert.isTrue(adapters.ipfs.cat.notCalled)
    })

    it('should not serve a paid file that the server has not pinned', async () => {
      await adapters.localdb.files.put({ cid: TEST_CID, filename: 'photo.jpg', sizeBytes: 20000, status: FILE_STATUS.PINNED })
      adapters.ipfs.isPinned.resolves(false)

      try {
        await uut.getView({ cid: TEST_CID })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
      }
      assert.isTrue(adapters.ipfs.cat.notCalled)
    })

    it('should throw a 404 error for an unknown CID', async () => {
      try {
        await uut.getView({ cid: 'unknown' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
      }
    })
  })
})
