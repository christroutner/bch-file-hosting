/*
  Unit tests for the REST API, using supertest against the Express app with
  the use-cases stubbed. Uploads go through the real multer middleware.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import request from 'supertest'
import { existsSync, readdirSync, rmSync } from 'fs'

import RestApi from '../../../src/controllers/rest-api/index.js'
import { ValidationError, NotFoundError } from '../../../src/use-cases/errors.js'

const UPLOAD_DIR = './tmp/test/rest-uploads'
const ADDRESS = 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h'

function makeConfig (overrides = {}) {
  return {
    version: '0.1.0',
    uploadTmpDir: UPLOAD_DIR,
    maxFileSizeBytes: 1000,
    rateLimitPerMin: 1000,
    adminApiKey: 'secret-key',
    trustProxy: false,
    ...overrides
  }
}

async function * chunks (...parts) {
  for (const part of parts) yield Buffer.from(part)
}

describe('#rest-api', () => {
  let sandbox
  let useCases
  let adapters
  let config
  let app

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    rmSync(UPLOAD_DIR, { recursive: true, force: true })

    useCases = {
      files: {
        uploadAndQuote: sandbox.stub().resolves({ alreadyHosted: false, cid: 'bafy', paymentAddress: ADDRESS, priceSats: 2000 }),
        listFeed: sandbox.stub().resolves({ files: [{ cid: 'bafy', status: 'pinned' }], nextCursor: 'next-cursor' }),
        getFileStatus: sandbox.stub().resolves({ cid: 'bafy', status: 'pinned' }),
        getDownload: sandbox.stub().callsFake(async () => ({ filename: 'hello.txt', sizeBytes: 11, content: chunks('hello', ' world') }))
      },
      payments: {
        checkPayment: sandbox.stub().resolves({ status: 'unpaid', receivedSats: 0, requiredSats: 2000 }),
        retrySweeps: sandbox.stub().resolves({ swept: [], failed: [], empty: [] })
      },
      cleanup: { deleteUnpaid: sandbox.stub().resolves({ checked: 1, deleted: 1, rescued: 0, failed: 0 }) },
      admin: {
        listInvoices: sandbox.stub().resolves([{ paymentAddress: ADDRESS }]),
        listFiles: sandbox.stub().resolves([{ cid: 'bafy', status: 'pinFailed' }]),
        removeFile: sandbox.stub().resolves({ cid: 'bafy', unpinned: ['local-helia'], failed: [] })
      }
    }

    adapters = {
      logger: { info: sandbox.stub(), error: sandbox.stub() },
      ipfs: { getStatus: sandbox.stub().returns({ isReady: true }) },
      localdb: { isOpen: sandbox.stub().returns(true) }
    }

    config = makeConfig()
    app = new RestApi({ useCases, adapters, config }).buildApp()
  })

  afterEach(() => {
    sandbox.restore()
    rmSync(UPLOAD_DIR, { recursive: true, force: true })
  })

  describe('#constructor', () => {
    it('should require the use-cases, adapters, and config', () => {
      assert.throws(() => new RestApi(), /requires the use-cases/)
      assert.throws(() => new RestApi({ useCases }), /requires the adapters/)
      assert.throws(() => new RestApi({ useCases, adapters }), /requires a config object/)
    })

    it('should trust the proxy when configured', () => {
      const proxied = new RestApi({ useCases, adapters, config: makeConfig({ trustProxy: true }) }).buildApp()

      assert.equal(proxied.get('trust proxy'), 1)
    })
  })

  describe('GET /health', () => {
    it('should report healthy', async () => {
      const res = await request(app).get('/health')

      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, version: '0.1.0', ipfs: 'up', db: 'up' })
    })

    it('should return 503 when IPFS or the database is down', async () => {
      adapters.ipfs.getStatus.returns({ isReady: false })
      adapters.localdb.isOpen.returns(false)

      const res = await request(app).get('/health')

      assert.equal(res.status, 503)
      assert.deepEqual(res.body, { success: false, version: '0.1.0', ipfs: 'down', db: 'down' })
    })

    it('should return 503 when only the database is down', async () => {
      adapters.localdb.isOpen.returns(false)

      const res = await request(app).get('/health')

      assert.equal(res.status, 503)
      assert.deepEqual(res.body, { success: false, version: '0.1.0', ipfs: 'up', db: 'down' })
    })
  })

  describe('POST /files', () => {
    it('should pass the uploaded temp file to the use-case and return the quote', async () => {
      const res = await request(app).post('/files').attach('file', Buffer.from('hello world'), 'hello.txt')

      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, alreadyHosted: false, cid: 'bafy', paymentAddress: ADDRESS, priceSats: 2000 })

      const args = useCases.files.uploadAndQuote.firstCall.args[0]
      assert.equal(args.filename, 'hello.txt')
      assert.equal(args.sizeBytes, 11)
      assert.include(args.filePath, 'rest-uploads')
      assert.isTrue(existsSync(args.filePath))
    })

    it('should keep UTF-8 file names intact', async () => {
      await request(app).post('/files').attach('file', Buffer.from('x'), 'résumé-日本.txt')

      assert.equal(useCases.files.uploadAndQuote.firstCall.args[0].filename, 'résumé-日本.txt')
    })

    it('should return 413 and keep no temp file for an oversized upload', async () => {
      const res = await request(app).post('/files').attach('file', Buffer.alloc(1001), 'big.bin')

      assert.equal(res.status, 413)
      assert.deepEqual(res.body, { success: false, error: 'File exceeds the maximum size of 1000 bytes' })
      assert.isTrue(useCases.files.uploadAndQuote.notCalled)
      assert.deepEqual(existsSync(UPLOAD_DIR) ? readdirSync(UPLOAD_DIR) : [], [])
    })

    it('should return 422 when no file is sent', async () => {
      const res = await request(app).post('/files').field('note', 'no file here')

      assert.equal(res.status, 422)
      assert.include(res.body.error, "multipart field 'file'")
    })

    it('should return 422 when the file is in the wrong field', async () => {
      const res = await request(app).post('/files').attach('upload', Buffer.from('x'), 'a.txt')

      assert.equal(res.status, 422)
      assert.include(res.body.error, "multipart field 'file'")
    })

    it('should return 422 for a validation error from the use-case', async () => {
      useCases.files.uploadAndQuote.rejects(new ValidationError("Property 'filename' must contain a usable file name"))

      const res = await request(app).post('/files').attach('file', Buffer.from('x'), 'a.txt')

      assert.equal(res.status, 422)
      assert.include(res.body.error, 'usable file name')
    })

    it('should return a generic 500 for unexpected errors and log the details', async () => {
      useCases.files.uploadAndQuote.rejects(new Error('blockstore exploded at /secret/path'))

      const res = await request(app).post('/files').attach('file', Buffer.from('x'), 'a.txt')

      assert.equal(res.status, 500)
      assert.deepEqual(res.body, { success: false, error: 'Internal server error' })
      assert.include(adapters.logger.error.firstCall.args[0], 'blockstore exploded')
    })
  })

  describe('POST /files/check-payment', () => {
    it('should check the payment for the given address', async () => {
      const res = await request(app).post('/files/check-payment').send({ paymentAddress: ADDRESS })

      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, status: 'unpaid', receivedSats: 0, requiredSats: 2000 })
      assert.isTrue(useCases.payments.checkPayment.calledWith({ paymentAddress: ADDRESS }))
    })

    it('should pass an undefined address through when the body is empty', async () => {
      useCases.payments.checkPayment.rejects(new ValidationError("Property 'paymentAddress' must be a non-empty string"))

      const res = await request(app).post('/files/check-payment')

      assert.equal(res.status, 422)
      assert.isTrue(useCases.payments.checkPayment.calledWith({ paymentAddress: undefined }))
    })

    it('should return 400 for malformed JSON', async () => {
      const res = await request(app)
        .post('/files/check-payment')
        .set('Content-Type', 'application/json')
        .send('{"paymentAddress":')

      assert.equal(res.status, 400)
      assert.equal(res.body.success, false)
      assert.equal(res.body.error, 'Request body is not valid JSON')
    })

    it('should return 404 for an unknown invoice', async () => {
      useCases.payments.checkPayment.rejects(new NotFoundError('Invoice not found: x'))

      const res = await request(app).post('/files/check-payment').send({ paymentAddress: 'x' })

      assert.equal(res.status, 404)
      assert.deepEqual(res.body, { success: false, error: 'Invoice not found: x' })
    })
  })

  describe('GET /files', () => {
    it('should return the feed page and pass the limit and cursor through', async () => {
      const res = await request(app).get('/files?limit=2&cursor=abc123')

      assert.equal(res.status, 200)
      assert.deepEqual(res.body, {
        success: true,
        files: [{ cid: 'bafy', status: 'pinned' }],
        nextCursor: 'next-cursor'
      })
      assert.isTrue(useCases.files.listFeed.calledWith({ limit: '2', cursor: 'abc123' }))
    })

    it('should pass an undefined limit and cursor when none are given', async () => {
      await request(app).get('/files')

      assert.isTrue(useCases.files.listFeed.calledWith({ limit: undefined, cursor: undefined }))
    })

    it('should return 422 for a validation error from the use-case', async () => {
      useCases.files.listFeed.rejects(new ValidationError('Page limit must be an integer between 1 and 100'))

      const res = await request(app).get('/files?limit=0')

      assert.equal(res.status, 422)
      assert.deepEqual(res.body, { success: false, error: 'Page limit must be an integer between 1 and 100' })
    })
  })

  describe('GET /files/:cid', () => {
    it('should return the file status', async () => {
      const res = await request(app).get('/files/bafy')

      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, cid: 'bafy', status: 'pinned' })
      assert.isTrue(useCases.files.getFileStatus.calledWith({ cid: 'bafy' }))
    })
  })

  describe('GET /download/:cid', () => {
    it('should stream the file as an attachment', async () => {
      const res = await request(app).get('/download/bafy').buffer(true).parse((r, cb) => {
        const parts = []
        r.on('data', c => parts.push(c))
        r.on('end', () => cb(null, Buffer.concat(parts)))
      })

      assert.equal(res.status, 200)
      assert.equal(res.body.toString(), 'hello world')
      assert.equal(res.headers['content-disposition'], 'attachment; filename="hello.txt"')
      assert.equal(res.headers['content-length'], '11')
      assert.include(res.headers['content-type'], 'text/plain')
    })

    it('should handle an empty file', async () => {
      useCases.files.getDownload.callsFake(async () => ({ filename: 'empty.txt', sizeBytes: 0, content: chunks() }))

      const res = await request(app).get('/download/bafy')

      assert.equal(res.status, 200)
      assert.equal(res.headers['content-length'], '0')
    })

    it('should omit Content-Length when the size is unknown', async () => {
      useCases.files.getDownload.callsFake(async () => ({ filename: 'a.bin', sizeBytes: undefined, content: chunks('abc') }))

      const res = await request(app).get('/download/bafy')

      assert.equal(res.status, 200)
      assert.notEqual(res.headers['content-length'], '0')
    })

    it('should return 404 for a file that is not hosted', async () => {
      useCases.files.getDownload.rejects(new NotFoundError('File not found: bafy'))

      const res = await request(app).get('/download/bafy')

      assert.equal(res.status, 404)
    })

    it('should return a JSON 500 if the file cannot be read at all', async () => {
      useCases.files.getDownload.callsFake(async () => ({
        filename: 'a.txt',
        sizeBytes: 5,
        content: (async function * () { throw new Error('block missing') })()
      }))

      const res = await request(app).get('/download/bafy')

      assert.equal(res.status, 500)
      assert.equal(res.body.error, 'Internal server error')
      assert.isUndefined(res.headers['content-disposition'])
    })

    it('should drop the connection and log if reading fails mid-stream', async () => {
      useCases.files.getDownload.callsFake(async () => ({
        filename: 'a.txt',
        sizeBytes: 100,
        content: (async function * () { yield Buffer.from('partial'); throw new Error('peer went away') })()
      }))

      try {
        await request(app).get('/download/bafy')
      } catch (err) {
        // The client sees an aborted response.
      }

      await new Promise(resolve => setTimeout(resolve, 20))
      assert.isTrue(adapters.logger.error.calledWithMatch(/Download of bafy stopped: peer went away/))
    })
  })

  describe('admin routes', () => {
    it('should return 401 without an API key', async () => {
      const res = await request(app).get('/admin/invoices')

      assert.equal(res.status, 401)
      assert.isFalse(res.body.success)
      assert.isTrue(useCases.admin.listInvoices.notCalled)
    })

    it('should return 401 with the wrong API key', async () => {
      const res = await request(app).get('/admin/invoices').set('x-api-key', 'wrong')

      assert.equal(res.status, 401)
      assert.isFalse(res.body.success)
    })

    it('should return 503 when no admin key is configured', async () => {
      const noAdmin = new RestApi({ useCases, adapters, config: makeConfig({ adminApiKey: '' }) }).buildApp()

      const res = await request(noAdmin).get('/admin/invoices').set('x-api-key', 'anything')

      assert.equal(res.status, 503)
      assert.isFalse(res.body.success)
    })

    it('should list invoices with filters', async () => {
      const res = await request(app).get('/admin/invoices?status=paid&sweepStatus=pending').set('x-api-key', 'secret-key')

      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, invoices: [{ paymentAddress: ADDRESS }] })
      assert.isTrue(useCases.admin.listInvoices.calledWith({ status: 'paid', sweepStatus: 'pending' }))
    })

    it('should list files by status', async () => {
      const res = await request(app).get('/admin/files?status=pinFailed').set('x-api-key', 'secret-key')

      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, files: [{ cid: 'bafy', status: 'pinFailed' }] })
      assert.isTrue(useCases.admin.listFiles.calledWith({ status: 'pinFailed' }))
    })

    it('should list every file when no status is given', async () => {
      const res = await request(app).get('/admin/files').set('x-api-key', 'secret-key')

      assert.equal(res.status, 200)
      assert.isTrue(useCases.admin.listFiles.calledWith({ status: undefined }))
    })

    it('should remove a file', async () => {
      const res = await request(app).post('/admin/files/bafy/delete').set('x-api-key', 'secret-key')

      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, cid: 'bafy', unpinned: ['local-helia'], failed: [] })
    })

    it('should retry sweeps', async () => {
      const res = await request(app).post('/admin/sweeps/retry').set('x-api-key', 'secret-key')

      assert.equal(res.status, 200)
      assert.deepEqual(res.body, { success: true, swept: [], failed: [], empty: [] })
    })

    it('should run the unpaid upload cleanup', async () => {
      const res = await request(app).post('/admin/cleanup/run').set('x-api-key', 'secret-key')

      assert.equal(res.status, 200)
      assert.equal(res.body.deleted, 1)
    })
  })

  describe('rate limiting', () => {
    it('should return 429 once the per-minute limit is reached', async () => {
      const limited = new RestApi({ useCases, adapters, config: makeConfig({ rateLimitPerMin: 2 }) }).buildApp()

      await request(limited).get('/files/bafy')
      await request(limited).get('/files/bafy')
      const res = await request(limited).get('/files/bafy')

      assert.equal(res.status, 429)
      assert.equal(res.body.success, false)
      assert.isUndefined(res.headers['x-ratelimit-limit'])
    })

    it('should not rate limit /health', async () => {
      const limited = new RestApi({ useCases, adapters, config: makeConfig({ rateLimitPerMin: 1 }) }).buildApp()

      await request(limited).get('/health')
      const res = await request(limited).get('/health')

      assert.equal(res.status, 200)
    })
  })

  describe('unknown routes', () => {
    it('should return a JSON 404', async () => {
      const res = await request(app).get('/nope')

      assert.equal(res.status, 404)
      assert.deepEqual(res.body, { success: false, error: 'Route not found: GET /nope' })
    })
  })
})
