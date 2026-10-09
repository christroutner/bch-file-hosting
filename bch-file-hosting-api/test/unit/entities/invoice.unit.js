/*
  Unit tests for the Invoice entity.
*/

import { assert } from 'chai'

import Invoice, { INVOICE_STATUS } from '../../../src/entities/invoice.js'

describe('#invoice.js', () => {
  let uut
  let data

  beforeEach(() => {
    uut = new Invoice()
    data = {
      paymentAddress: 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h',
      hdIndex: 1,
      cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      filename: 'photo.jpg',
      sizeBytes: 20000,
      billedBytes: 100000,
      priceSats: 2000,
      usdPrice: 0.001,
      usdPerBch: 400,
      createdAt: '2026-10-08T00:00:00.000Z',
      quoteExpiresAt: '2026-10-09T00:00:00.000Z'
    }
  })

  describe('#validate', () => {
    it('should return a new invoice awaiting payment', () => {
      const result = uut.validate(data)

      assert.equal(result.status, INVOICE_STATUS.AWAITING_PAYMENT)
      assert.equal(result.paymentAddress, data.paymentAddress)
      assert.equal(result.priceSats, 2000)
      assert.equal(result.receivedSats, 0)
      assert.isNull(result.paidAt)
      assert.isNull(result.sweepTxid)
      assert.isNull(result.sweepStatus)
    })

    it('should not keep unknown properties such as a WIF', () => {
      data.wif = 'L1secret'
      const result = uut.validate(data)

      assert.notProperty(result, 'wif')
    })

    it('should accept a 0 byte file', () => {
      data.sizeBytes = 0
      const result = uut.validate(data)

      assert.equal(result.sizeBytes, 0)
    })

    it('should throw if called with no arguments', () => {
      assert.throws(() => uut.validate(), /'paymentAddress' must be a bitcoincash/)
    })

    it('should throw if the payment address is not a cash address', () => {
      data.paymentAddress = 'qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9h'
      assert.throws(() => uut.validate(data), /'paymentAddress' must be a bitcoincash/)
    })

    it('should throw if the payment address contains invalid characters', () => {
      data.paymentAddress = 'bitcoincash:qp2rmj8heytjrksxm2xrjs0hncnvl08xwgkweawu9b'
      assert.throws(() => uut.validate(data), /'paymentAddress' must be a bitcoincash/)
    })

    it('should throw if hdIndex is 0', () => {
      data.hdIndex = 0
      assert.throws(() => uut.validate(data), /'hdIndex' must be a positive integer/)
    })

    it('should throw if the cid is missing', () => {
      delete data.cid
      assert.throws(() => uut.validate(data), /'cid' must be a non-empty string/)
    })

    it('should throw if the cid is an empty string', () => {
      data.cid = ''
      assert.throws(() => uut.validate(data), /'cid' must be a non-empty string/)
    })

    it('should throw if the filename is missing', () => {
      delete data.filename
      assert.throws(() => uut.validate(data), /'filename' must be a non-empty string/)
    })

    it('should throw if the filename is an empty string', () => {
      data.filename = ''
      assert.throws(() => uut.validate(data), /'filename' must be a non-empty string/)
    })

    it('should throw if sizeBytes is negative', () => {
      data.sizeBytes = -5
      assert.throws(() => uut.validate(data), /'sizeBytes' must be a non-negative integer/)
    })

    it('should throw if billedBytes is 0', () => {
      data.billedBytes = 0
      assert.throws(() => uut.validate(data), /'billedBytes' must be a positive integer/)
    })

    it('should throw if priceSats is fractional', () => {
      data.priceSats = 2000.5
      assert.throws(() => uut.validate(data), /'priceSats' must be a positive integer/)
    })

    it('should throw if usdPrice is not positive', () => {
      data.usdPrice = 0
      assert.throws(() => uut.validate(data), /'usdPrice' must be a positive number/)
    })

    it('should throw if usdPerBch is not a number', () => {
      data.usdPerBch = '400'
      assert.throws(() => uut.validate(data), /'usdPerBch' must be a positive number/)
    })

    it('should throw if usdPerBch is zero', () => {
      data.usdPerBch = 0
      assert.throws(() => uut.validate(data), /'usdPerBch' must be a positive number/)
    })

    it('should accept a usdPerBch below 1', () => {
      data.usdPerBch = 0.5
      const result = uut.validate(data)

      assert.equal(result.usdPerBch, 0.5)
    })

    it('should throw if createdAt is not a date', () => {
      data.createdAt = 'yesterday'
      assert.throws(() => uut.validate(data), /'createdAt' must be an ISO date string/)
    })

    it('should throw if quoteExpiresAt is missing', () => {
      delete data.quoteExpiresAt
      assert.throws(() => uut.validate(data), /'quoteExpiresAt' must be an ISO date string/)
    })

    it('should throw if the quote expires before it was created', () => {
      data.quoteExpiresAt = '2026-10-07T00:00:00.000Z'
      assert.throws(() => uut.validate(data), /'quoteExpiresAt' must be after 'createdAt'/)
    })

    it('should throw if the quote expires at the same time it was created', () => {
      data.quoteExpiresAt = data.createdAt
      assert.throws(() => uut.validate(data), /'quoteExpiresAt' must be after 'createdAt'/)
    })
  })

  describe('#isQuoteExpired', () => {
    const quoteExpiresAt = '2026-10-09T00:00:00.000Z'

    it('should return false before the expiry time', () => {
      const now = new Date('2026-10-08T23:59:59.999Z')
      assert.isFalse(uut.isQuoteExpired({ quoteExpiresAt, now }))
    })

    it('should return true at the expiry time', () => {
      const now = new Date(quoteExpiresAt)
      assert.isTrue(uut.isQuoteExpired({ quoteExpiresAt, now }))
    })

    it('should use the current time by default', () => {
      assert.isTrue(uut.isQuoteExpired({ quoteExpiresAt: '2000-01-01T00:00:00.000Z' }))
    })
  })

  describe('#isPaymentSufficient', () => {
    const priceSats = 2000
    const toleranceSats = 100

    it('should accept an exact payment', () => {
      assert.isTrue(uut.isPaymentSufficient({ priceSats, receivedSats: 2000, toleranceSats }))
    })

    it('should accept an underpayment within the tolerance', () => {
      assert.isTrue(uut.isPaymentSufficient({ priceSats, receivedSats: 1900, toleranceSats }))
    })

    it('should reject an underpayment beyond the tolerance', () => {
      assert.isFalse(uut.isPaymentSufficient({ priceSats, receivedSats: 1899, toleranceSats }))
    })

    it('should accept an overpayment', () => {
      assert.isTrue(uut.isPaymentSufficient({ priceSats, receivedSats: 50000, toleranceSats }))
    })

    it('should not let a 1 sat balance pay a 2000 sat invoice', () => {
      assert.isFalse(uut.isPaymentSufficient({ priceSats, receivedSats: 1, toleranceSats }))
    })

    it('should never accept an empty address, even with a huge tolerance', () => {
      assert.isFalse(uut.isPaymentSufficient({ priceSats, receivedSats: 0, toleranceSats: 5000 }))
    })

    it('should accept a 1 sat payment for a 1 sat invoice', () => {
      assert.isTrue(uut.isPaymentSufficient({ priceSats: 1, receivedSats: 1, toleranceSats: 0 }))
    })

    it('should throw if receivedSats is a BCH amount instead of sats', () => {
      assert.throws(
        () => uut.isPaymentSufficient({ priceSats, receivedSats: 0.00002, toleranceSats }),
        /'receivedSats' must be a non-negative integer/
      )
    })

    it('should throw if priceSats is missing', () => {
      assert.throws(
        () => uut.isPaymentSufficient({ receivedSats: 10, toleranceSats }),
        /'priceSats' must be a positive integer/
      )
    })

    it('should throw if toleranceSats is negative', () => {
      assert.throws(
        () => uut.isPaymentSufficient({ priceSats, receivedSats: 10, toleranceSats: -1 }),
        /'toleranceSats' must be a non-negative integer/
      )
    })
  })
})
