/*
  Unit tests for the LevelDB adapter. The Level class is swapped for an
  in-memory database.
*/

import { assert } from 'chai'
import sinon from 'sinon'
import { MemoryLevel } from 'memory-level'

import LocalDB from '../../../../src/adapters/localdb/index.js'

describe('#localdb/index.js', () => {
  let uut
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    uut = new LocalDB({ config: { levelDbPath: './tmp/test/.leveldb' } })
    uut.Level = class extends MemoryLevel {
      constructor (location, options) { super(options) }
    }
    uut.mkdir = sandbox.stub().resolves()
  })

  afterEach(async () => {
    sandbox.restore()
    await uut.close()
  })

  it('should throw if no config is passed in', () => {
    assert.throws(() => new LocalDB(), /requires a config object/)
  })

  describe('#open', () => {
    it('should create the directory, open the db, and expose the stores', async () => {
      await uut.open()

      assert.isTrue(uut.mkdir.calledWith('./tmp/test/.leveldb', { recursive: true }))
      assert.isTrue(uut.isOpen())
      assert.property(uut.invoices, 'create')
      assert.property(uut.files, 'put')
      assert.property(uut.meta, 'nextHdIndex')
    })

    it('should store JSON values', async () => {
      await uut.open()
      await uut.files.put({ cid: 'abc', pins: [] })

      assert.deepEqual(await uut.files.get('abc'), { cid: 'abc', pins: [] })
    })
  })

  describe('#isOpen', () => {
    it('should return false before open', () => {
      assert.isFalse(uut.isOpen())
    })

    it('should return false after close', async () => {
      await uut.open()
      await uut.close()

      assert.isFalse(uut.isOpen())
    })
  })

  describe('#close', () => {
    it('should do nothing if the db was never opened', async () => {
      await uut.close()
      assert.isNull(uut.db)
    })
  })
})
