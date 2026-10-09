/*
  Unit tests for middleware branches that are awkward to reach over HTTP.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import multer from 'multer'

import { createErrorHandler } from '../../../src/controllers/rest-api/middleware/errors.js'
import FilesRouter from '../../../src/controllers/rest-api/files/index.js'
import FilesController from '../../../src/controllers/rest-api/files/controller.js'
import AdminRouter from '../../../src/controllers/rest-api/admin/index.js'
import AdminController from '../../../src/controllers/rest-api/admin/controller.js'

function makeRes () {
  const res = {
    headersSent: false,
    status: sinon.stub(),
    json: sinon.stub(),
    destroy: sinon.stub()
  }
  res.status.returns(res)
  return res
}

describe('#rest-api middleware', () => {
  describe('#createErrorHandler', () => {
    let handler
    let logger

    beforeEach(() => {
      logger = { error: sinon.stub() }
      handler = createErrorHandler({ logger, config: { maxFileSizeBytes: 10 } })
    })

    it('should return 400 for unrecognized multer errors', () => {
      const res = makeRes()

      handler(new multer.MulterError('LIMIT_PART_COUNT'), { method: 'POST', path: '/files' }, res)

      assert.isTrue(res.status.calledWith(400))
      assert.isFalse(res.json.firstCall.args[0].success)
    })

    it('should return 422 when too many files are sent', () => {
      const res = makeRes()

      handler(new multer.MulterError('LIMIT_FILE_COUNT'), { method: 'POST', path: '/files' }, res)

      assert.isTrue(res.status.calledWith(422))
    })

    it('should destroy the connection if headers were already sent', () => {
      const res = makeRes()
      res.headersSent = true

      handler(new Error('late failure'), { method: 'GET', path: '/download/x' }, res)

      assert.isTrue(res.destroy.calledOnce)
      assert.isTrue(res.json.notCalled)
    })

    it('should log the message when an error has no stack', () => {
      const res = makeRes()
      const err = { message: 'plain object error' }

      handler(err, { method: 'GET', path: '/x' }, res)

      assert.include(logger.error.firstCall.args[0], 'plain object error')
      assert.isTrue(res.status.calledWith(500))
    })

    it('should treat 5xx statuses on errors as internal errors', () => {
      const res = makeRes()
      const err = new Error('upstream down')
      err.status = 502

      handler(err, { method: 'GET', path: '/x' }, res)

      assert.isTrue(res.status.calledWith(500))
    })

    it('should treat a 500 status as an internal error and not leak its message', () => {
      const res = makeRes()
      const err = new Error('secret database details')
      err.status = 500

      handler(err, { method: 'GET', path: '/x' }, res)

      assert.isTrue(res.status.calledWith(500))
      assert.deepEqual(res.json.firstCall.args[0], { success: false, error: 'Internal server error' })
    })
  })

  describe('#constructors', () => {
    it('should require their dependencies', () => {
      assert.throws(() => new FilesRouter(), /requires the use-cases/)
      assert.throws(() => new FilesRouter({ useCases: {} }), /requires a config object/)
      assert.throws(() => new FilesController(), /requires the use-cases/)
      assert.throws(() => new AdminRouter(), /requires the use-cases/)
      assert.throws(() => new AdminRouter({ useCases: {} }), /requires a config object/)
      assert.throws(() => new AdminController(), /requires the use-cases/)
    })

    it('should attach file routes without a rate limiter', () => {
      const router = new FilesRouter({ useCases: {}, config: { uploadTmpDir: './tmp/test/x', maxFileSizeBytes: 10 } })
      const app = { post: sinon.stub(), get: sinon.stub() }

      router.attach(app)

      const passThrough = app.get.firstCall.args[1]
      const next = sinon.stub()
      passThrough({}, {}, next)
      assert.isTrue(next.calledOnce)
    })
  })
})
