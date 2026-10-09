/*
  Unit tests for the timer controllers and the top-level controllers library.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import TimerControllers from '../../../src/controllers/timer-controllers.js'
import Controllers from '../../../src/controllers/index.js'

describe('#timer-controllers.js', () => {
  let sandbox
  let useCases
  let logger
  let uut

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    useCases = {
      cleanup: { deleteUnpaid: sandbox.stub().resolves({}) },
      payments: { retrySweeps: sandbox.stub().resolves({}) }
    }
    logger = { error: sandbox.stub(), info: sandbox.stub() }
    uut = new TimerControllers({ useCases, logger })
    uut.setInterval = sandbox.stub().callsFake((fn, ms) => ({ fn, ms }))
    uut.clearInterval = sandbox.stub()
  })

  afterEach(() => sandbox.restore())

  it('should require the use-cases', () => {
    assert.throws(() => new TimerControllers(), /requires the use-cases/)
  })

  describe('#startTimers', () => {
    it('should run cleanup hourly and sweep retries every 30 minutes', () => {
      const count = uut.startTimers()

      assert.equal(count, 2)
      assert.deepEqual(uut.setInterval.args.map(a => a[1]), [60 * 60 * 1000, 30 * 60 * 1000])
    })

    it('should call the use-cases when the timers fire', async () => {
      uut.startTimers()

      for (const handle of uut.handles) await handle.fn()

      assert.isTrue(useCases.cleanup.deleteUnpaid.calledOnce)
      assert.isTrue(useCases.payments.retrySweeps.calledOnce)
    })

    it('should not create duplicate timers when started twice', () => {
      uut.startTimers()
      uut.startTimers()

      assert.lengthOf(uut.handles, 2)
      assert.equal(uut.clearInterval.callCount, 2)
    })
  })

  describe('#runJob', () => {
    it('should skip a job whose previous run is still going', async () => {
      let release
      useCases.cleanup.deleteUnpaid.callsFake(() => new Promise(resolve => { release = resolve }))
      const job = uut.jobs[0]

      const first = uut.runJob(job)
      const second = await uut.runJob(job)
      release()

      assert.isFalse(second)
      assert.isTrue(await first)
      assert.isTrue(useCases.cleanup.deleteUnpaid.calledOnce)
    })

    it('should log and survive a failing job', async () => {
      useCases.payments.retrySweeps.rejects(new Error('backend down'))

      const result = await uut.runJob(uut.jobs[1])

      assert.isFalse(result)
      assert.include(logger.error.firstCall.args[0], 'retrySweeps failed: backend down')
      assert.isTrue(await uut.runJob(uut.jobs[0]))
    })
  })

  describe('#stopTimers', () => {
    it('should clear every timer', () => {
      uut.startTimers()
      uut.stopTimers()

      assert.equal(uut.clearInterval.callCount, 2)
      assert.lengthOf(uut.handles, 0)
    })
  })

  describe('real timers', () => {
    it('should use the global setInterval by default and stop cleanly', () => {
      const real = new TimerControllers({ useCases, logger })

      real.startTimers()
      assert.lengthOf(real.handles, 2)
      real.stopTimers()
      assert.lengthOf(real.handles, 0)
    })
  })
})

describe('#controllers/index.js', () => {
  it('should require its dependencies', () => {
    assert.throws(() => new Controllers(), /requires the use-cases/)
    assert.throws(() => new Controllers({ useCases: {} }), /requires the adapters/)
    assert.throws(() => new Controllers({ useCases: {}, adapters: {} }), /requires a config object/)
  })

  it('should build the app and manage the timers', () => {
    const uut = new Controllers({
      useCases: {},
      adapters: { logger: {} },
      config: { uploadTmpDir: './tmp/test/x', maxFileSizeBytes: 10, rateLimitPerMin: 10, adminApiKey: '' }
    })
    sinon.stub(uut.timers, 'startTimers').returns(2)
    sinon.stub(uut.timers, 'stopTimers')

    assert.isFunction(uut.buildApp())
    assert.equal(uut.startTimers(), 2)
    uut.stopTimers()
    assert.isTrue(uut.timers.stopTimers.calledOnce)
  })
})
