/*
  Unit tests for the file store, run against an in-memory LevelDB.
*/

import { assert } from 'chai'
import { MemoryLevel } from 'memory-level'

import FileStore from '../../../../src/adapters/localdb/file-store.js'

describe('#file-store.js', () => {
  let db
  let uut
  const file = { cid: 'bafy-test-cid', filename: 'a.txt', sizeBytes: 10, status: 'staged', pins: [] }

  beforeEach(async () => {
    db = new MemoryLevel({ valueEncoding: 'json' })
    await db.open()
    uut = new FileStore({ db })
  })

  afterEach(async () => {
    await db.close()
  })

  it('should throw if no db is passed in', () => {
    assert.throws(() => new FileStore(), /requires a db instance/)
  })

  it('should save a file record and read it back', async () => {
    await uut.put(file)

    assert.deepEqual(await uut.get(file.cid), file)
  })

  it('should return null for an unknown cid', async () => {
    assert.isNull(await uut.get('unknown'))
  })

  it('should merge changes and keep the cid', async () => {
    await uut.put(file)

    const updated = await uut.update(file.cid, { status: 'pinned', cid: 'other' })

    assert.equal(updated.status, 'pinned')
    assert.equal(updated.cid, file.cid)
    assert.equal(updated.filename, 'a.txt')
    assert.deepEqual(await uut.get(file.cid), updated)
  })

  it('should throw when updating an unknown cid', async () => {
    try {
      await uut.update('unknown', { status: 'pinned' })
      assert.fail('Unexpected result')
    } catch (err) {
      assert.include(err.message, 'File not found')
    }
  })

  it('should list every file when no status is given', async () => {
    await uut.put(file)
    await uut.put({ ...file, cid: 'bafy-other', status: 'pinned' })

    const result = await uut.list()

    assert.deepEqual(result.map(f => f.cid).sort(), ['bafy-other', 'bafy-test-cid'])
  })

  it('should list only files with the requested status', async () => {
    await uut.put(file)
    await uut.put({ ...file, cid: 'bafy-other', status: 'pinned' })

    const result = await uut.list({ status: 'pinned' })

    assert.deepEqual(result.map(f => f.cid), ['bafy-other'])
  })
})
