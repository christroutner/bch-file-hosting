/*
  Unit tests for the metadata store, run against an in-memory LevelDB.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import { MemoryLevel } from 'memory-level'

import MetaStore from '../../../../src/adapters/localdb/meta-store.js'

describe('#meta-store.js', () => {
  let db
  let uut
  let sandbox

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    db = new MemoryLevel({ valueEncoding: 'json' })
    await db.open()
    uut = new MetaStore({ db })
  })

  afterEach(async () => {
    sandbox.restore()
    await db.close()
  })

  it('should throw if no db is passed in', () => {
    assert.throws(() => new MetaStore(), /requires a db instance/)
  })

  describe('#nextHdIndex', () => {
    it('should start at 1, since index 0 is the server wallet', async () => {
      assert.equal(await uut.nextHdIndex(), 1)
    })

    it('should increment on each call', async () => {
      assert.equal(await uut.nextHdIndex(), 1)
      assert.equal(await uut.nextHdIndex(), 2)
      assert.equal(await uut.nextHdIndex(), 3)
    })

    it('should return unique values for concurrent calls', async () => {
      const results = await Promise.all(Array.from({ length: 20 }, () => uut.nextHdIndex()))

      assert.equal(new Set(results).size, 20)
      assert.deepEqual([...results].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1))
    })

    it('should continue from the stored value after a restart', async () => {
      await uut.nextHdIndex()
      await uut.nextHdIndex()

      const restarted = new MetaStore({ db })
      assert.equal(await restarted.nextHdIndex(), 3)
    })

    it('should keep working after a failed reservation', async () => {
      sandbox.stub(db, 'put').onFirstCall().rejects(new Error('disk full')).callThrough()

      try {
        await uut.nextHdIndex()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'disk full')
      }

      assert.equal(await uut.nextHdIndex(), 1)
    })
  })
})
