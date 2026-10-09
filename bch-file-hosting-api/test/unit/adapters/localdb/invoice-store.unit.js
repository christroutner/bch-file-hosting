/*
  Unit tests for the invoice store, run against an in-memory LevelDB.
*/

import { assert } from 'chai'
import { MemoryLevel } from 'memory-level'

import InvoiceStore from '../../../../src/adapters/localdb/invoice-store.js'

function makeInvoice (overrides = {}) {
  return {
    paymentAddress: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
    hdIndex: 1,
    cid: 'bafy-test-cid',
    priceSats: 2000,
    status: 'awaitingPayment',
    sweepStatus: null,
    createdAt: '2026-10-08T00:00:00.000Z',
    quoteExpiresAt: '2026-10-09T00:00:00.000Z',
    ...overrides
  }
}

describe('#invoice-store.js', () => {
  let db
  let uut

  beforeEach(async () => {
    db = new MemoryLevel({ valueEncoding: 'json' })
    await db.open()
    uut = new InvoiceStore({ db })
  })

  afterEach(async () => {
    await db.close()
  })

  describe('#constructor', () => {
    it('should throw if no db is passed in', () => {
      assert.throws(() => new InvoiceStore(), /requires a db instance/)
    })
  })

  describe('#create and #get', () => {
    it('should save an invoice and read it back', async () => {
      const invoice = makeInvoice()
      await uut.create(invoice)

      const result = await uut.get(invoice.paymentAddress)
      assert.deepEqual(result, invoice)
    })

    it('should write the cleanup index entry with the invoice', async () => {
      const invoice = makeInvoice()
      await uut.create(invoice)

      const value = await db.get(`idx:created:${invoice.createdAt}:${invoice.paymentAddress}`)
      assert.equal(value, invoice.paymentAddress)
    })

    it('should return null for an unknown address', async () => {
      const result = await uut.get('bitcoincash:unknown')
      assert.isNull(result)
    })
  })

  describe('#update', () => {
    it('should merge changes into the stored invoice', async () => {
      const invoice = makeInvoice()
      await uut.create(invoice)

      const updated = await uut.update(invoice.paymentAddress, { status: 'paid', receivedSats: 2000 })

      assert.equal(updated.status, 'paid')
      assert.equal(updated.receivedSats, 2000)
      assert.equal(updated.priceSats, 2000)
      assert.deepEqual(await uut.get(invoice.paymentAddress), updated)
    })

    it('should not allow the payment address to be changed', async () => {
      const invoice = makeInvoice()
      await uut.create(invoice)

      const updated = await uut.update(invoice.paymentAddress, { paymentAddress: 'other' })
      assert.equal(updated.paymentAddress, invoice.paymentAddress)
    })

    it('should throw for an unknown address', async () => {
      try {
        await uut.update('bitcoincash:unknown', { status: 'paid' })
        assert.fail('Unexpected result')
      } catch (err) {
        assert.include(err.message, 'Invoice not found')
      }
    })
  })

  describe('#listCreatedBefore', () => {
    it('should return only invoices created before the given time, oldest first', async () => {
      await uut.create(makeInvoice({ paymentAddress: 'addr-b', createdAt: '2026-10-08T02:00:00.000Z' }))
      await uut.create(makeInvoice({ paymentAddress: 'addr-a', createdAt: '2026-10-08T01:00:00.000Z' }))
      await uut.create(makeInvoice({ paymentAddress: 'addr-c', createdAt: '2026-10-08T03:00:00.000Z' }))

      const result = await uut.listCreatedBefore('2026-10-08T03:00:00.000Z')
      assert.deepEqual(result, ['addr-a', 'addr-b'])
    })

    it('should not include invoice records themselves', async () => {
      await uut.create(makeInvoice())

      const result = await uut.listCreatedBefore('2099-01-01T00:00:00.000Z')
      assert.deepEqual(result, [makeInvoice().paymentAddress])
    })

    it('should return an empty list when nothing is old enough', async () => {
      await uut.create(makeInvoice())

      const result = await uut.listCreatedBefore('2000-01-01T00:00:00.000Z')
      assert.deepEqual(result, [])
    })
  })

  describe('#removeCreatedIndex', () => {
    it('should remove the cleanup index entry but keep the invoice', async () => {
      const invoice = makeInvoice()
      await uut.create(invoice)

      await uut.removeCreatedIndex(invoice)

      assert.deepEqual(await uut.listCreatedBefore('2099-01-01T00:00:00.000Z'), [])
      assert.isNotNull(await uut.get(invoice.paymentAddress))
    })
  })

  describe('#list', () => {
    beforeEach(async () => {
      await uut.create(makeInvoice({ paymentAddress: 'addr-1', status: 'awaitingPayment' }))
      await uut.create(makeInvoice({ paymentAddress: 'addr-2', status: 'paid', sweepStatus: 'pending' }))
      await uut.create(makeInvoice({ paymentAddress: 'addr-3', status: 'paid', sweepStatus: 'swept' }))
    })

    it('should list all invoices when no filter is given', async () => {
      const result = await uut.list()
      assert.lengthOf(result, 3)
    })

    it('should filter by status', async () => {
      const result = await uut.list({ status: 'paid' })
      assert.deepEqual(result.map(x => x.paymentAddress), ['addr-2', 'addr-3'])
    })

    it('should filter by sweep status', async () => {
      const result = await uut.list({ sweepStatus: 'pending' })
      assert.deepEqual(result.map(x => x.paymentAddress), ['addr-2'])
    })

    it('should not include index entries or other record types', async () => {
      await db.put('file:some-cid', { cid: 'some-cid' })
      await db.put('meta:nextHdIndex', 5)

      const result = await uut.list()
      assert.lengthOf(result, 3)
    })
  })
})
