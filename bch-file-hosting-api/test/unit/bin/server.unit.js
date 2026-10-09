/*
  Unit tests for the service entry point.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import Server from '../../../bin/server.js'

describe('#bin/server.js', () => {
  let sandbox
  let uut
  let adapters
  let proc

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    adapters = {
      logger: { info: sandbox.stub(), error: sandbox.stub() },
      start: sandbox.stub().resolves(true),
      stop: sandbox.stub().resolves(true)
    }
    proc = { once: sandbox.stub(), exit: sandbox.stub() }

    uut = new Server({ config: { version: '0.1.0', env: 'test' }, adapters, proc })
  })

  afterEach(() => sandbox.restore())

  describe('#constructor', () => {
    it('should create its own adapters when none are passed in', () => {
      const server = new Server({ config: { env: 'test', logLevel: 'error' } })

      assert.property(server.adapters, 'ipfs')
      assert.equal(server.process, process)
    })
  })

  describe('#start', () => {
    it('should start the adapters and register shutdown handlers', async () => {
      const result = await uut.start()

      assert.isTrue(result)
      assert.isTrue(adapters.start.calledOnce)
      assert.deepEqual(proc.once.args.map(a => a[0]), ['SIGINT', 'SIGTERM'])
    })

    it('should shut down when a registered signal arrives', async () => {
      await uut.start()
      const sigintHandler = proc.once.args.find(a => a[0] === 'SIGINT')[1]

      await sigintHandler()

      assert.isTrue(adapters.stop.calledOnce)
      assert.isTrue(proc.exit.calledWith(0))
    })

    it('should pass startup errors to the caller', async () => {
      adapters.start.rejects(new Error('MNEMONIC is required'))

      try {
        await uut.start()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'MNEMONIC is required')
      }
      assert.isTrue(proc.once.notCalled)
    })
  })

  describe('#shutdown', () => {
    it('should stop the adapters and exit with 0', async () => {
      await uut.shutdown('SIGTERM')

      assert.isTrue(adapters.stop.calledOnce)
      assert.isTrue(proc.exit.calledOnceWith(0))
    })

    it('should only shut down once if signals repeat', async () => {
      await Promise.all([uut.shutdown('SIGINT'), uut.shutdown('SIGINT')])

      assert.isTrue(adapters.stop.calledOnce)
    })

    it('should exit with 1 if stopping fails', async () => {
      adapters.stop.rejects(new Error('db busy'))

      await uut.shutdown('SIGINT')

      assert.isTrue(proc.exit.calledOnceWith(1))
      assert.include(adapters.logger.error.firstCall.args[0], 'db busy')
    })
  })
})
