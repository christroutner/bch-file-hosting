/*
  Unit tests for the admin use-cases.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import AdminUseCases from '../../../src/use-cases/admin-use-cases.js'
import { FILE_STATUS } from '../../../src/entities/file-upload.js'
import { makeAdapters, makeProvider, TEST_CID } from '../mocks/use-case-adapters.js'

describe('#admin-use-cases.js', () => {
  let sandbox
  let adapters
  let uut

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    adapters = await makeAdapters(sandbox)
    uut = new AdminUseCases({ adapters })
    uut.now = () => new Date('2026-10-08T12:00:00.000Z')

    await adapters.localdb.invoices.create({ paymentAddress: 'addr-1', status: 'paid', sweepStatus: 'pending', createdAt: '2026-10-08T00:00:00.000Z' })
    await adapters.localdb.invoices.create({ paymentAddress: 'addr-2', status: 'awaitingPayment', sweepStatus: null, createdAt: '2026-10-08T01:00:00.000Z' })
    await adapters.localdb.files.put({ cid: TEST_CID, filename: 'a.txt', status: FILE_STATUS.PINNED })
  })

  afterEach(async () => {
    sandbox.restore()
    await adapters.db.close()
  })

  it('should throw if no adapters are passed in', () => {
    assert.throws(() => new AdminUseCases(), /requires the adapters/)
  })

  describe('#listInvoices', () => {
    it('should list all invoices', async () => {
      assert.lengthOf(await uut.listInvoices(), 2)
    })

    it('should filter by status and sweep status', async () => {
      const result = await uut.listInvoices({ status: 'paid', sweepStatus: 'pending' })

      assert.deepEqual(result.map(i => i.paymentAddress), ['addr-1'])
    })

    it('should reject an unknown status with a 422 error', async () => {
      try {
        await uut.listInvoices({ status: 'refunded' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 422)
      }
    })

    it('should reject an unknown sweep status with a 422 error', async () => {
      try {
        await uut.listInvoices({ sweepStatus: 'lost' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 422)
      }
    })
  })

  describe('#listFiles', () => {
    beforeEach(async () => {
      await adapters.localdb.files.put({ cid: 'bafy-pinFailed', filename: 'b.txt', status: FILE_STATUS.PIN_FAILED })
      await adapters.localdb.files.put({ cid: 'bafy-staged', filename: 'c.txt', status: FILE_STATUS.STAGED })
    })

    it('should list every file when no status is given', async () => {
      const result = await uut.listFiles()

      assert.deepEqual(result.map(f => f.cid).sort(), ['bafy-pinFailed', 'bafy-staged', TEST_CID])
    })

    it('should list only files with the requested status', async () => {
      const result = await uut.listFiles({ status: FILE_STATUS.PIN_FAILED })

      assert.deepEqual(result.map(f => f.cid), ['bafy-pinFailed'])
    })

    it('should reject an unknown file status with a 422 error', async () => {
      try {
        await uut.listFiles({ status: 'bogus' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 422)
        assert.equal(err.message, "Unknown file status 'bogus'")
      }
    })
  })

  describe('#removeFile', () => {
    it('should unpin from third-party providers, remove the local copy, and mark the file deleted', async () => {
      const lighthouse = { ...makeProvider(sandbox, 'lighthouse'), unpin: sandbox.stub().resolves() }
      adapters.pinning.providers.push(lighthouse)

      const result = await uut.removeFile({ cid: TEST_CID })

      assert.deepEqual(result, { cid: TEST_CID, unpinned: ['lighthouse', 'local-helia'], failed: [] })
      assert.isTrue(lighthouse.unpin.calledWith(TEST_CID))
      assert.isTrue(adapters.ipfs.remove.calledWith(TEST_CID))

      const file = await adapters.localdb.files.get(TEST_CID)
      assert.equal(file.status, FILE_STATUS.DELETED)
      assert.equal(file.removedAt, '2026-10-08T12:00:00.000Z')
    })

    it('should still remove the local copy when a provider fails to unpin', async () => {
      const lighthouse = { ...makeProvider(sandbox, 'lighthouse'), unpin: sandbox.stub().rejects(new Error('API down')) }
      adapters.pinning.providers.push(lighthouse)

      const result = await uut.removeFile({ cid: TEST_CID })

      assert.deepEqual(result.failed, [{ provider: 'lighthouse', error: 'API down' }])
      assert.deepEqual(result.unpinned, ['local-helia'])
      assert.isTrue(adapters.ipfs.remove.calledOnce)
    })

    it('should throw a 404 error for an unknown file', async () => {
      try {
        await uut.removeFile({ cid: 'unknown' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
      }
    })
  })

  it('should use the real clock by default', () => {
    const real = new AdminUseCases({ adapters })
    assert.instanceOf(real.now(), Date)
  })
})
