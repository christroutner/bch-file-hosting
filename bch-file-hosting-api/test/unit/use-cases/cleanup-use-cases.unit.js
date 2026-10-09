/*
  Unit tests for the cleanup use-cases.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import FileUseCases from '../../../src/use-cases/file-use-cases.js'
import PaymentUseCases from '../../../src/use-cases/payment-use-cases.js'
import CleanupUseCases from '../../../src/use-cases/cleanup-use-cases.js'
import InvoiceStore from '../../../src/adapters/localdb/invoice-store.js'
import FileStore from '../../../src/adapters/localdb/file-store.js'
import MetaStore from '../../../src/adapters/localdb/meta-store.js'
import { FILE_STATUS } from '../../../src/entities/file-upload.js'
import { INVOICE_STATUS } from '../../../src/entities/invoice.js'
import { makeAdapters, TEST_CID } from '../mocks/use-case-adapters.js'

const NOW = new Date('2026-10-08T12:00:00.000Z')
const HOUR = 60 * 60 * 1000

describe('#cleanup-use-cases.js', () => {
  let sandbox
  let adapters
  let files
  let payments
  let uut
  let quote

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    adapters = await makeAdapters(sandbox)

    files = new FileUseCases({ adapters })
    files.now = () => NOW
    files.unlink = sandbox.stub().resolves()

    payments = new PaymentUseCases({ adapters })
    uut = new CleanupUseCases({ adapters, payments })

    // 25 hours after the upload, so its 24 hour quote window has passed.
    uut.now = () => new Date(NOW.getTime() + 25 * HOUR)
    payments.now = uut.now

    quote = await files.uploadAndQuote({ filePath: '/tmp/u', filename: 'photo.jpg', sizeBytes: 20000 })
  })

  afterEach(async () => {
    sandbox.restore()
    await adapters.db.close()
  })

  describe('#constructor', () => {
    it('should require the adapters and the payment use-cases', () => {
      assert.throws(() => new CleanupUseCases(), /requires the adapters/)
      assert.throws(() => new CleanupUseCases({ adapters }), /requires the payment use-cases/)
    })
  })

  describe('#deleteUnpaid', () => {
    it('should delete an unpaid upload once its quote window has passed', async () => {
      const result = await uut.deleteUnpaid()

      assert.deepEqual(result, { checked: 1, deleted: 1, rescued: 0, failed: 0 })
      assert.isTrue(adapters.ipfs.remove.calledOnceWith(TEST_CID))
      assert.equal((await adapters.localdb.files.get(TEST_CID)).status, FILE_STATUS.DELETED)

      const invoice = await adapters.localdb.invoices.get(quote.paymentAddress)
      assert.equal(invoice.status, INVOICE_STATUS.DELETED)
      assert.equal(invoice.deletedAt, uut.now().toISOString())
      assert.deepEqual(await adapters.localdb.invoices.listCreatedBefore('2099-01-01T00:00:00.000Z'), [])
    })

    it('should leave uploads that are still inside their quote window', async () => {
      uut.now = () => new Date(NOW.getTime() + 23 * HOUR)

      const result = await uut.deleteUnpaid()

      assert.deepEqual(result, { checked: 0, deleted: 0, rescued: 0, failed: 0 })
      assert.isTrue(adapters.ipfs.remove.notCalled)
      assert.isTrue(adapters.logger.info.neverCalledWithMatch('Unpaid upload cleanup finished'))
    })

    it('should rescue a payment that arrived just before the deadline', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)

      const result = await uut.deleteUnpaid()

      assert.deepEqual(result, { checked: 1, deleted: 0, rescued: 1, failed: 0 })
      assert.isTrue(adapters.ipfs.remove.notCalled)
      assert.equal((await adapters.localdb.invoices.get(quote.paymentAddress)).status, INVOICE_STATUS.PAID)
      assert.equal((await adapters.localdb.files.get(TEST_CID)).status, FILE_STATUS.PINNED)
    })

    it('should keep the upload if the balance cannot be checked, and try again next run', async () => {
      adapters.wallet.getBalanceSats.rejects(new Error('backend down'))

      const result = await uut.deleteUnpaid()

      assert.deepEqual(result, { checked: 1, deleted: 0, rescued: 0, failed: 1 })
      assert.isTrue(adapters.ipfs.remove.notCalled)
      assert.deepEqual(await adapters.localdb.invoices.listCreatedBefore('2099-01-01T00:00:00.000Z'), [quote.paymentAddress])
    })

    it('should drop stale index entries for invoices that are no longer awaiting payment', async () => {
      await adapters.localdb.invoices.update(quote.paymentAddress, { status: INVOICE_STATUS.PAID })

      const result = await uut.deleteUnpaid()

      assert.equal(result.deleted, 0)
      assert.isTrue(adapters.ipfs.remove.notCalled)
      assert.deepEqual(await adapters.localdb.invoices.listCreatedBefore('2099-01-01T00:00:00.000Z'), [])
    })

    it('should skip index entries whose invoice is missing', async () => {
      await adapters.db.del(`invoice:${quote.paymentAddress}`)

      const result = await uut.deleteUnpaid()

      assert.deepEqual(result, { checked: 1, deleted: 0, rescued: 0, failed: 0 })
    })

    it('should not remove content that a newer invoice for the same file still needs', async () => {
      // Re-upload after the first quote expired, which issues a second invoice.
      files.now = () => new Date(NOW.getTime() + 24.5 * HOUR)
      const second = await files.uploadAndQuote({ filePath: '/tmp/u', filename: 'photo.jpg', sizeBytes: 20000 })

      const result = await uut.deleteUnpaid()

      assert.equal(result.deleted, 1)
      assert.isTrue(adapters.ipfs.remove.notCalled)
      assert.equal((await adapters.localdb.invoices.get(quote.paymentAddress)).status, INVOICE_STATUS.DELETED)
      const file = await adapters.localdb.files.get(TEST_CID)
      assert.equal(file.status, FILE_STATUS.STAGED)
      assert.equal(file.paymentAddress, second.paymentAddress)
    })

    it('should not remove content that has since been paid for', async () => {
      await adapters.localdb.files.update(TEST_CID, { status: FILE_STATUS.PINNED })

      await uut.deleteUnpaid()

      assert.isTrue(adapters.ipfs.remove.notCalled)
    })

    it('should find unpaid uploads after a restart', async () => {
      // A restart builds new stores over the same database.
      adapters.localdb = {
        invoices: new InvoiceStore({ db: adapters.db }),
        files: new FileStore({ db: adapters.db }),
        meta: new MetaStore({ db: adapters.db })
      }

      const result = await uut.deleteUnpaid()

      assert.equal(result.deleted, 1)
      assert.isTrue(adapters.ipfs.remove.calledOnceWith(TEST_CID))
    })

    it('should keep going when one invoice fails', async () => {
      files.now = () => new Date(NOW.getTime() + HOUR)
      adapters.ipfs.addFile.resolves('bafy-other-cid')
      await files.uploadAndQuote({ filePath: '/tmp/u2', filename: 'other.jpg', sizeBytes: 20000 })
      uut.now = () => new Date(NOW.getTime() + 26 * HOUR)
      adapters.ipfs.remove.onFirstCall().rejects(new Error('blockstore locked'))

      const result = await uut.deleteUnpaid()

      assert.deepEqual(result, { checked: 2, deleted: 1, rescued: 0, failed: 1 })
    })
  })
})
