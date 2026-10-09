/*
  Unit tests for the service entry point.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import express from 'express'
import request from 'supertest'

import Server from '../../../bin/server.js'

describe('#bin/server.js', () => {
  let sandbox
  let uut
  let adapters
  let proc
  let controllers

  beforeEach(() => {
    sandbox = sinon.createSandbox()

    adapters = {
      logger: { info: sandbox.stub(), error: sandbox.stub() },
      start: sandbox.stub().resolves(true),
      stop: sandbox.stub().resolves(true)
    }
    proc = { once: sandbox.stub(), exit: sandbox.stub() }

    const app = express()
    app.get('/ping', (req, res) => res.json({ pong: true }))
    controllers = {
      buildApp: sandbox.stub().returns(app),
      startTimers: sandbox.stub().returns(2),
      stopTimers: sandbox.stub()
    }

    uut = new Server({ config: { version: '0.1.0', env: 'test', port: 0 }, adapters, proc })
    uut.UseCases = class FakeUseCases { constructor ({ adapters }) { this.adapters = adapters } }
    uut.Controllers = function () { return controllers }
  })

  afterEach(async () => {
    sandbox.restore()
    await uut.closeHttpServer()
  })

  describe('#constructor', () => {
    it('should create its own adapters when none are passed in', () => {
      const server = new Server({ config: { env: 'test', logLevel: 'error' } })

      assert.property(server.adapters, 'ipfs')
      assert.equal(server.process, process)
    })
  })

  describe('#start', () => {
    it('should start the adapters, the HTTP server, and the timers', async () => {
      const result = await uut.start()

      assert.isTrue(result)
      assert.isTrue(adapters.start.calledOnce)
      assert.equal(uut.useCases.adapters, adapters)
      assert.isTrue(controllers.startTimers.calledOnce)
      assert.deepEqual(proc.once.args.map(a => a[0]), ['SIGINT', 'SIGTERM'])

      const res = await request(uut.httpServer).get('/ping')
      assert.deepEqual(res.body, { pong: true })
    })

    it('should shut down when a registered signal arrives', async () => {
      await uut.start()
      const sigintHandler = proc.once.args.find(a => a[0] === 'SIGINT')[1]

      await sigintHandler()

      assert.isTrue(controllers.stopTimers.calledOnce)
      assert.isFalse(uut.httpServer.listening)
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

    it('should fail to start when the port is already in use', async () => {
      await uut.start()
      const port = uut.httpServer.address().port

      const second = new Server({ config: { version: '0.1.0', env: 'test', port }, adapters, proc })
      second.UseCases = uut.UseCases
      second.Controllers = uut.Controllers

      try {
        await second.start()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.code, 'EADDRINUSE')
      }
    })
  })

  describe('#shutdown', () => {
    it('should stop the adapters and exit with 0 even if never started', async () => {
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
