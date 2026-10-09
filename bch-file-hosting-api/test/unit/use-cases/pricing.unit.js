/*
  Unit tests for the pricing calculation.
*/

import { assert } from 'chai'

import { calculatePrice } from '../../../src/use-cases/pricing.js'

describe('#pricing.js', () => {
  let cfg

  beforeEach(() => {
    cfg = {
      usdPerMbYear: 0.01,
      minBilledBytes: 100000,
      minInvoiceSats: 2000
    }
  })

  describe('#calculatePrice', () => {
    it('should bill files below 100 KB as 100 KB and apply the sat floor', () => {
      const result = calculatePrice({ sizeBytes: 20000, usdPerBch: 400, cfg })

      assert.equal(result.billedBytes, 100000)
      assert.equal(result.usdPrice, 0.001)
      assert.equal(result.priceSats, 2000)
      assert.equal(result.priceBch, 0.00002)
    })

    it('should bill an exactly 100 KB file as 100 KB', () => {
      const result = calculatePrice({ sizeBytes: 100000, usdPerBch: 400, cfg })

      assert.equal(result.billedBytes, 100000)
    })

    it('should bill a 0 byte file at the minimum', () => {
      const result = calculatePrice({ sizeBytes: 0, usdPerBch: 400, cfg })

      assert.equal(result.billedBytes, 100000)
      assert.equal(result.priceSats, 2000)
    })

    it('should price 1 MB at exactly 2500 sats when BCH is $400', () => {
      const result = calculatePrice({ sizeBytes: 1000000, usdPerBch: 400, cfg })

      assert.equal(result.billedBytes, 1000000)
      assert.equal(result.usdPrice, 0.01)
      assert.equal(result.priceSats, 2500)
    })

    it('should price 25 MB at 62500 sats when BCH is $400', () => {
      const result = calculatePrice({ sizeBytes: 25000000, usdPerBch: 400, cfg })

      assert.equal(result.priceSats, 62500)
    })

    it('should price 100 MB at 250000 sats when BCH is $400', () => {
      const result = calculatePrice({ sizeBytes: 100000000, usdPerBch: 400, cfg })

      assert.equal(result.usdPrice, 1)
      assert.equal(result.priceSats, 250000)
      assert.equal(result.priceBch, 0.0025)
    })

    it('should round fractional sats up', () => {
      // 1 MB at $300/BCH = 3333.33 sats
      const result = calculatePrice({ sizeBytes: 1000000, usdPerBch: 300, cfg })

      assert.equal(result.priceSats, 3334)
    })

    it('should use the configured price per MB', () => {
      cfg.usdPerMbYear = 0.02
      const result = calculatePrice({ sizeBytes: 1000000, usdPerBch: 400, cfg })

      assert.equal(result.priceSats, 5000)
    })

    it('should use the configured sat floor', () => {
      cfg.minInvoiceSats = 1000
      const result = calculatePrice({ sizeBytes: 20000, usdPerBch: 400, cfg })

      assert.equal(result.priceSats, 1000)
    })

    it('should return integer sats for many sizes and prices', () => {
      for (const sizeBytes of [1, 123456, 999999, 7654321, 99999999]) {
        for (const usdPerBch of [123.45, 300, 412.17, 999.99]) {
          const { priceSats } = calculatePrice({ sizeBytes, usdPerBch, cfg })
          assert.isTrue(Number.isInteger(priceSats))
          assert.isAtLeast(priceSats, cfg.minInvoiceSats)
        }
      }
    })

    it('should throw if sizeBytes is negative', () => {
      assert.throws(
        () => calculatePrice({ sizeBytes: -1, usdPerBch: 400, cfg }),
        /sizeBytes must be a non-negative integer/
      )
    })

    it('should throw if sizeBytes is not an integer', () => {
      assert.throws(
        () => calculatePrice({ sizeBytes: 1.5, usdPerBch: 400, cfg }),
        /sizeBytes must be a non-negative integer/
      )
    })

    it('should throw if usdPerBch is zero', () => {
      assert.throws(
        () => calculatePrice({ sizeBytes: 1000, usdPerBch: 0, cfg }),
        /usdPerBch must be a positive number/
      )
    })

    it('should throw if usdPerBch is not a number', () => {
      assert.throws(
        () => calculatePrice({ sizeBytes: 1000, usdPerBch: '400', cfg }),
        /usdPerBch must be a positive number/
      )
    })

    it('should throw if usdPerBch is not finite', () => {
      assert.throws(
        () => calculatePrice({ sizeBytes: 1000, usdPerBch: Infinity, cfg }),
        /usdPerBch must be a positive number/
      )
    })
  })
})
