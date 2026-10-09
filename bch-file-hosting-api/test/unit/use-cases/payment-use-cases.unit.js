/*
  Unit tests for the payment use-cases.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import FileUseCases from '../../../src/use-cases/file-use-cases.js'
import PaymentUseCases from '../../../src/use-cases/payment-use-cases.js'
import { FILE_STATUS } from '../../../src/entities/file-upload.js'
import { INVOICE_STATUS, SWEEP_STATUS } from '../../../src/entities/invoice.js'
import { makeAdapters, makeProvider, TEST_CID } from '../mocks/use-case-adapters.js'

const NOW = new Date('2026-10-08T12:00:00.000Z')
const HOUR = 60 * 60 * 1000

describe('#payment-use-cases.js', () => {
  let sandbox
  let adapters
  let files
  let uut
  let quote

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    adapters = await makeAdapters(sandbox)

    files = new FileUseCases({ adapters })
    files.now = () => NOW
    files.unlink = sandbox.stub().resolves()

    uut = new PaymentUseCases({ adapters })
    uut.now = () => new Date(NOW.getTime() + HOUR)

    // A 2000 sat invoice.
    quote = await files.uploadAndQuote({ filePath: '/tmp/u', filename: 'photo.jpg', sizeBytes: 20000 })
  })

  afterEach(async () => {
    sandbox.restore()
    await adapters.db.close()
  })

  const check = () => uut.checkPayment({ paymentAddress: quote.paymentAddress })

  it('should throw if no adapters are passed in', () => {
    assert.throws(() => new PaymentUseCases(), /requires the adapters/)
  })

  describe('#checkPayment input', () => {
    it('should reject a missing payment address with a 422 error', async () => {
      try {
        await uut.checkPayment({})
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 422)
      }
    })

    it('should reject a call with no arguments', async () => {
      try {
        await uut.checkPayment()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 422)
      }
    })

    it('should throw a 404 error for an unknown address', async () => {
      try {
        await uut.checkPayment({ paymentAddress: 'bitcoincash:qunknown' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.equal(err.status, 404)
      }
    })
  })

  describe('#checkPayment unpaid', () => {
    it('should report an empty address as unpaid', async () => {
      const result = await check()

      assert.deepEqual(result, {
        status: 'unpaid',
        receivedSats: 0,
        requiredSats: 2000,
        quoteExpiresAt: quote.quoteExpiresAt
      })
      assert.isTrue(adapters.wallet.sweep.notCalled)
    })

    it('should not let a 1 sat balance pay a 2000 sat invoice', async () => {
      adapters.wallet.getBalanceSats.resolves(1)

      assert.equal((await check()).status, 'unpaid')
    })

    it('should report an underpayment beyond the tolerance as unpaid', async () => {
      adapters.wallet.getBalanceSats.resolves(1899)

      const result = await check()

      assert.equal(result.status, 'unpaid')
      assert.equal(result.receivedSats, 1899)
    })

    it('should report an unpaid invoice past its quote window as expired', async () => {
      uut.now = () => new Date(NOW.getTime() + 25 * HOUR)

      const result = await check()

      assert.deepEqual(result, { status: 'expired', quoteExpiresAt: quote.quoteExpiresAt })
    })

    it('should report a deleted invoice as expired without checking the balance', async () => {
      await adapters.localdb.invoices.update(quote.paymentAddress, { status: INVOICE_STATUS.DELETED })

      const result = await check()

      assert.equal(result.status, 'expired')
      assert.isTrue(adapters.wallet.getBalanceSats.notCalled)
    })
  })

  describe('#checkPayment paid', () => {
    it('should accept an exact payment and return the links', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)

      const result = await check()

      assert.equal(result.status, 'paid')
      assert.equal(result.cid, TEST_CID)
      assert.equal(result.receivedSats, 2000)
      assert.equal(result.downloadUrl, `http://localhost:5050/download/${TEST_CID}`)
      assert.deepEqual(result.gatewayUrls, [`https://ipfs.io/ipfs/${TEST_CID}/photo.jpg`])
    })

    it('should accept an underpayment within the tolerance', async () => {
      adapters.wallet.getBalanceSats.resolves(1900)

      assert.equal((await check()).status, 'paid')
    })

    it('should accept an overpayment', async () => {
      adapters.wallet.getBalanceSats.resolves(50000)

      const result = await check()

      assert.equal(result.status, 'paid')
      assert.equal(result.receivedSats, 50000)
    })

    it('should host the file for one year from payment', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)

      const result = await check()

      const paidAt = new Date(NOW.getTime() + HOUR)
      assert.equal(result.paidAt, paidAt.toISOString())
      assert.equal(result.hostedUntil, new Date(paidAt.getTime() + 365 * 24 * HOUR).toISOString())
    })

    it('should mark the invoice paid and take it out of the cleanup index', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)

      await check()

      const invoice = await adapters.localdb.invoices.get(quote.paymentAddress)
      assert.equal(invoice.status, INVOICE_STATUS.PAID)
      assert.deepEqual(await adapters.localdb.invoices.listCreatedBefore('2099-01-01T00:00:00.000Z'), [])
    })

    it('should pin the file with every provider and record the pins', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)
      const lighthouse = makeProvider(sandbox, 'lighthouse', 'https://gateway.lighthouse.storage/ipfs/')
      adapters.pinning.providers.push(lighthouse)

      const result = await check()

      const file = await adapters.localdb.files.get(TEST_CID)
      assert.equal(file.status, FILE_STATUS.PINNED)
      assert.deepEqual(file.pins.map(p => [p.provider, p.status]), [['local-helia', 'pinned'], ['lighthouse', 'pinned']])
      assert.isTrue(lighthouse.pin.calledWith({ cid: TEST_CID, filename: 'photo.jpg', sizeBytes: 20000 }))
      assert.include(result.gatewayUrls, `https://gateway.lighthouse.storage/ipfs/${TEST_CID}`)
    })

    it('should sweep the payment to the treasury', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)

      await check()

      assert.isTrue(adapters.wallet.sweep.calledOnceWith(1))
      const invoice = await adapters.localdb.invoices.get(quote.paymentAddress)
      assert.equal(invoice.sweepStatus, SWEEP_STATUS.SWEPT)
      assert.equal(invoice.sweepTxid, 'sweep-txid')
    })

    it('should call the announcer for the paid file', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)

      await check()

      assert.isTrue(adapters.announcer.announce.calledOnce)
      assert.equal(adapters.announcer.announce.firstCall.args[0].cid, TEST_CID)
    })

    it('should honor a payment made before cleanup ran, even past the quote window', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)
      uut.now = () => new Date(NOW.getTime() + 25 * HOUR)

      assert.equal((await check()).status, 'paid')
    })

    it('should be idempotent: a second check does not sweep or pin again', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)

      const first = await check()
      const second = await check()

      assert.deepEqual(second, first)
      assert.isTrue(adapters.wallet.sweep.calledOnce)
      assert.isTrue(adapters.pinning.providers[0].pin.calledOnce)
    })

    it('should only sweep once when two checks run at the same time', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)

      const [a, b] = await Promise.all([check(), check()])

      assert.equal(a.status, 'paid')
      assert.equal(b.status, 'paid')
      assert.isTrue(adapters.wallet.sweep.calledOnce)
    })

    it('should still report paid when the sweep fails, and mark it pending', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)
      adapters.wallet.sweep.rejects(new Error('backend timeout'))

      const result = await check()

      assert.equal(result.status, 'paid')
      const invoice = await adapters.localdb.invoices.get(quote.paymentAddress)
      assert.equal(invoice.sweepStatus, SWEEP_STATUS.PENDING)
    })

    it('should still report paid when a provider fails, and mark the file pinFailed', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)
      const lighthouse = makeProvider(sandbox, 'lighthouse')
      lighthouse.pin.rejects(new Error('quota exceeded'))
      adapters.pinning.providers.push(lighthouse)

      const result = await check()

      assert.equal(result.status, 'paid')
      const file = await adapters.localdb.files.get(TEST_CID)
      assert.equal(file.status, FILE_STATUS.PIN_FAILED)
      assert.deepEqual(file.pins[1], { provider: 'lighthouse', status: 'failed', providerRef: null, pinnedAt: null, error: 'quota exceeded' })
    })

    it('should retry pinning on a later check if pinning had failed', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)
      adapters.pinning.providers[0].pin.onFirstCall().rejects(new Error('busy'))

      await check()
      assert.equal((await adapters.localdb.files.get(TEST_CID)).status, FILE_STATUS.PIN_FAILED)

      await check()
      assert.equal((await adapters.localdb.files.get(TEST_CID)).status, FILE_STATUS.PINNED)
      assert.isTrue(adapters.wallet.sweep.calledOnce)
    })

    it('should still report paid when the announcer fails', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)
      adapters.announcer.announce.rejects(new Error('no funds for OP_RETURN'))

      const result = await check()

      assert.equal(result.status, 'paid')
      assert.isTrue(adapters.logger.error.calledWithMatch(/Announcing .* failed/))
    })

    it('should record a provider reference when one is returned', async () => {
      adapters.wallet.getBalanceSats.resolves(2000)
      adapters.pinning.providers[0].pin.resolves({ providerCid: TEST_CID, providerRef: 'req-123' })

      await check()

      const file = await adapters.localdb.files.get(TEST_CID)
      assert.equal(file.pins[0].providerRef, 'req-123')
    })

    it('should pass balance-check errors through without changing the invoice', async () => {
      adapters.wallet.getBalanceSats.rejects(new Error('backend down'))

      try {
        await check()
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'backend down')
      }
      const invoice = await adapters.localdb.invoices.get(quote.paymentAddress)
      assert.equal(invoice.status, INVOICE_STATUS.AWAITING_PAYMENT)
    })
  })

  describe('#retrySweeps', () => {
    beforeEach(async () => {
      adapters.wallet.getBalanceSats.resolves(2000)
      adapters.wallet.sweep.rejects(new Error('backend timeout'))
      await check()
      adapters.wallet.sweep.reset()
      adapters.wallet.sweep.resolves('retry-txid')
    })

    it('should sweep invoices whose sweep is pending', async () => {
      const result = await uut.retrySweeps()

      assert.deepEqual(result, { swept: [quote.paymentAddress], failed: [], empty: [] })
      const invoice = await adapters.localdb.invoices.get(quote.paymentAddress)
      assert.equal(invoice.sweepStatus, SWEEP_STATUS.SWEPT)
      assert.equal(invoice.sweepTxid, 'retry-txid')
    })

    it('should mark an invoice with nothing left to sweep as empty', async () => {
      adapters.wallet.getBalanceSats.resolves(0)

      const result = await uut.retrySweeps()

      assert.deepEqual(result.empty, [quote.paymentAddress])
      assert.isTrue(adapters.wallet.sweep.notCalled)
      assert.equal((await adapters.localdb.invoices.get(quote.paymentAddress)).sweepStatus, SWEEP_STATUS.EMPTY)
    })

    it('should report a sweep that fails again', async () => {
      adapters.wallet.sweep.rejects(new Error('still down'))

      const result = await uut.retrySweeps()

      assert.deepEqual(result.failed, [quote.paymentAddress])
      assert.equal((await adapters.localdb.invoices.get(quote.paymentAddress)).sweepStatus, SWEEP_STATUS.PENDING)
    })

    it('should report a failed balance check', async () => {
      adapters.wallet.getBalanceSats.rejects(new Error('backend down'))

      const result = await uut.retrySweeps()

      assert.deepEqual(result.failed, [quote.paymentAddress])
    })

    it('should skip invoices that are already swept or empty', async () => {
      await uut.retrySweeps()
      adapters.wallet.sweep.resetHistory()

      const result = await uut.retrySweeps()

      assert.deepEqual(result, { swept: [], failed: [], empty: [] })
      assert.isTrue(adapters.wallet.sweep.notCalled)
    })

    it('should also sweep paid invoices that never recorded a sweep status', async () => {
      await adapters.localdb.invoices.update(quote.paymentAddress, { sweepStatus: null })

      const result = await uut.retrySweeps()

      assert.deepEqual(result.swept, [quote.paymentAddress])
    })
  })
})
