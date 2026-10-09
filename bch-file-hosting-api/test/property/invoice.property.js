/*
  Property tests for Invoice.isPaymentSufficient (src/entities/invoice.js).

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import Invoice from '../../src/entities/invoice.js'
import { forAll, integerBetween } from './lib/harness.js'

const invoice = new Invoice()
const BIG = 10000000

// The rule documented on isPaymentSufficient.
function referenceIsSufficient ({ priceSats, receivedSats, toleranceSats }) {
  return receivedSats > 0 && receivedSats >= priceSats - toleranceSats
}

describe('#invoice.property.js', () => {
  describe('#isPaymentSufficient invariants', () => {
    it('should match the documented rule for valid integer inputs', () => {
      forAll({
        seed: 1,
        runs: 1000,
        generate: (random) => ({
          priceSats: integerBetween(random, 1, BIG),
          receivedSats: integerBetween(random, 0, BIG * 2),
          toleranceSats: integerBetween(random, 0, BIG)
        }),
        property: (input) => {
          assert.equal(invoice.isPaymentSufficient(input), referenceIsSufficient(input))
        }
      })
    })

    it('should never accept an empty address, regardless of tolerance', () => {
      forAll({
        seed: 2,
        runs: 500,
        generate: (random) => ({
          priceSats: integerBetween(random, 1, BIG),
          toleranceSats: integerBetween(random, 0, BIG * 10)
        }),
        property: ({ priceSats, toleranceSats }) => {
          assert.isFalse(invoice.isPaymentSufficient({ priceSats, receivedSats: 0, toleranceSats }))
        }
      })
    })

    it('should be non-decreasing in receivedSats', () => {
      forAll({
        seed: 3,
        runs: 500,
        generate: (random) => {
          const a = integerBetween(random, 0, BIG * 2)
          const b = integerBetween(random, 0, BIG * 2)
          return {
            small: Math.min(a, b),
            large: Math.max(a, b),
            priceSats: integerBetween(random, 1, BIG),
            toleranceSats: integerBetween(random, 0, BIG)
          }
        },
        property: ({ small, large, priceSats, toleranceSats }) => {
          const low = invoice.isPaymentSufficient({ priceSats, receivedSats: small, toleranceSats })
          const high = invoice.isPaymentSufficient({ priceSats, receivedSats: large, toleranceSats })

          assert.isTrue(!low || high)
        }
      })
    })

    it('should reject non-integer or negative receivedSats and toleranceSats', () => {
      const priceSats = 2000

      assert.throws(
        () => invoice.isPaymentSufficient({ priceSats, receivedSats: 0.5, toleranceSats: 0 }),
        /'receivedSats' must be a non-negative integer/
      )
      assert.throws(
        () => invoice.isPaymentSufficient({ priceSats, receivedSats: -1, toleranceSats: 0 }),
        /'receivedSats' must be a non-negative integer/
      )
      assert.throws(
        () => invoice.isPaymentSufficient({ priceSats, receivedSats: 10, toleranceSats: -1 }),
        /'toleranceSats' must be a non-negative integer/
      )
      assert.throws(
        () => invoice.isPaymentSufficient({ priceSats, receivedSats: 10, toleranceSats: 0.5 }),
        /'toleranceSats' must be a non-negative integer/
      )
    })

    it('should reject a missing or non-positive priceSats', () => {
      for (const priceSats of [undefined, 0, -1, 1.5, null, '2000']) {
        assert.throws(
          () => invoice.isPaymentSufficient({ priceSats, receivedSats: 10, toleranceSats: 0 }),
          /'priceSats' must be a positive integer/
        )
      }
    })
  })
})
