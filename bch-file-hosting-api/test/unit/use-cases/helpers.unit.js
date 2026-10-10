/*
  Unit tests for the small use-case helpers: errors, links, keyed lock, and the
  top-level use-cases library.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import { ValidationError, NotFoundError } from '../../../src/use-cases/errors.js'
import { buildLinks } from '../../../src/use-cases/links.js'
import KeyedLock from '../../../src/use-cases/keyed-lock.js'
import UseCases from '../../../src/use-cases/index.js'
import { makeAdapters, makeConfig } from '../mocks/use-case-adapters.js'

describe('#use-case helpers', () => {
  describe('#errors', () => {
    it('should carry the HTTP status for each error type', () => {
      const validation = new ValidationError('bad input')
      const notFound = new NotFoundError('missing')

      assert.equal(validation.status, 422)
      assert.equal(validation.name, 'ValidationError')
      assert.equal(validation.message, 'bad input')
      assert.equal(notFound.status, 404)
      assert.equal(notFound.name, 'NotFoundError')
      assert.instanceOf(notFound, Error)
    })
  })

  describe('#buildLinks', () => {
    it('should build the download URL and gateway URLs with the file name', () => {
      const config = makeConfig({ publicGateways: ['https://ipfs.io/ipfs/', 'https://dweb.link/ipfs/'] })

      const result = buildLinks({ cid: 'bafy', filename: 'my photo.jpg', config })

      assert.deepEqual(result, {
        downloadUrl: 'http://localhost:5050/download/bafy',
        viewUrl: 'http://localhost:5050/view/bafy',
        gatewayUrls: ['https://ipfs.io/ipfs/bafy/my%20photo.jpg', 'https://dweb.link/ipfs/bafy/my%20photo.jpg']
      })
    })

    it('should not double the slash when PUBLIC_URL ends with one', () => {
      const config = makeConfig({ publicUrl: 'https://files.example.com/' })

      const result = buildLinks({ cid: 'bafy', filename: 'a.txt', config })

      assert.equal(result.downloadUrl, 'https://files.example.com/download/bafy')
      assert.equal(result.viewUrl, 'https://files.example.com/view/bafy')
    })

    it('should add provider gateway URLs and skip providers without one', () => {
      const providers = [{ gatewayUrl: () => null }, { gatewayUrl: (cid) => `https://gw.example/ipfs/${cid}` }]

      const result = buildLinks({ cid: 'bafy', filename: 'a.txt', config: makeConfig(), providers })

      assert.deepEqual(result.gatewayUrls, ['https://ipfs.io/ipfs/bafy/a.txt', 'https://gw.example/ipfs/bafy'])
    })

    it('should pass the file name to provider gateway URLs', () => {
      const providers = [
        { gatewayUrl: (cid, filename) => `https://gw.example/ipfs/${cid}/${encodeURIComponent(filename)}` }
      ]

      const result = buildLinks({
        cid: 'bafy',
        filename: 'my photo.jpg',
        config: makeConfig({ publicGateways: [] }),
        providers
      })

      assert.deepEqual(result.gatewayUrls, ['https://gw.example/ipfs/bafy/my%20photo.jpg'])
    })
  })

  describe('#KeyedLock', () => {
    it('should run tasks for the same key one at a time, in order', async () => {
      const lock = new KeyedLock()
      const order = []
      let release
      const gate = new Promise(resolve => { release = resolve })

      const first = lock.run('a', async () => { await gate; order.push('first') })
      const second = lock.run('a', async () => { order.push('second') })

      await new Promise(resolve => setImmediate(resolve))
      assert.deepEqual(order, [])

      release()
      await Promise.all([first, second])
      assert.deepEqual(order, ['first', 'second'])
    })

    it('should run tasks for different keys independently', async () => {
      const lock = new KeyedLock()
      let release
      const gate = new Promise(resolve => { release = resolve })

      const blocked = lock.run('a', () => gate)
      const result = await lock.run('b', async () => 'b done')

      assert.equal(result, 'b done')
      release()
      await blocked
    })

    it('should keep running later tasks after one fails', async () => {
      const lock = new KeyedLock()

      const failed = lock.run('a', async () => { throw new Error('boom') })
      const next = lock.run('a', async () => 'ok')

      try {
        await failed
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.message, 'boom')
      }
      assert.equal(await next, 'ok')
    })

    it('should forget keys once their tasks finish', async () => {
      const lock = new KeyedLock()

      await lock.run('a', async () => 1)
      await new Promise(resolve => setImmediate(resolve))

      assert.equal(lock.size, 0)
    })
  })

  describe('#UseCases', () => {
    it('should use the real clock by default in every use-case class', async () => {
      const sandbox = sinon.createSandbox()
      const adapters = await makeAdapters(sandbox)

      const uut = new UseCases({ adapters })

      for (const useCase of [uut.files, uut.payments, uut.cleanup]) {
        const now = useCase.now()
        assert.instanceOf(now, Date)
        assert.isBelow(Math.abs(now.getTime() - Date.now()), 5000)
      }

      sandbox.restore()
      await adapters.db.close()
    })

    it('should throw if no adapters are passed in', () => {
      assert.throws(() => new UseCases(), /Instance of adapters must be passed in/)
    })

    it('should create the file, payment, and cleanup use-cases', async () => {
      const sandbox = sinon.createSandbox()
      const adapters = await makeAdapters(sandbox)

      const uut = new UseCases({ adapters })

      assert.property(uut.files, 'uploadAndQuote')
      assert.property(uut.payments, 'checkPayment')
      assert.property(uut.cleanup, 'deleteUnpaid')
      assert.equal(uut.cleanup.payments, uut.payments)

      sandbox.restore()
      await adapters.db.close()
    })
  })
})
