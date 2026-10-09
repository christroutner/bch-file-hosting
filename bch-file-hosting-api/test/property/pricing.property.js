/*
  Property tests for calculatePrice (src/use-cases/pricing.js).

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import { calculatePrice } from '../../src/use-cases/pricing.js'
import { forAll, integerBetween } from './lib/harness.js'

const cfg = { usdPerMbYear: 0.01, minBilledBytes: 100000, minInvoiceSats: 2000 }
const BIG = 5000000000

describe('#pricing.property.js', () => {
  describe('#calculatePrice invariants', () => {
    it('should bill at least minBilledBytes and never price below minInvoiceSats', () => {
      forAll({
        seed: 1,
        runs: 500,
        generate: (random) => ({
          sizeBytes: integerBetween(random, 0, BIG),
          usdPerBch: integerBetween(random, 1, 100000) / 100
        }),
        property: ({ sizeBytes, usdPerBch }) => {
          const result = calculatePrice({ sizeBytes, usdPerBch, cfg })

          assert.equal(result.billedBytes, Math.max(sizeBytes, cfg.minBilledBytes))
          assert.isTrue(Number.isInteger(result.priceSats))
          assert.isAtLeast(result.priceSats, cfg.minInvoiceSats)
          assert.equal(result.priceBch, result.priceSats / 1e8)
        }
      })
    })

    it('should be non-decreasing in sizeBytes', () => {
      forAll({
        seed: 2,
        runs: 500,
        generate: (random) => {
          const a = integerBetween(random, 0, BIG)
          const b = integerBetween(random, 0, BIG)
          return {
            small: Math.min(a, b),
            large: Math.max(a, b),
            usdPerBch: integerBetween(random, 1, 100000) / 100
          }
        },
        property: ({ small, large, usdPerBch }) => {
          const low = calculatePrice({ sizeBytes: small, usdPerBch, cfg })
          const high = calculatePrice({ sizeBytes: large, usdPerBch, cfg })

          assert.isAtMost(low.priceSats, high.priceSats)
        }
      })
    })

    it('should reject negative or non-integer sizeBytes', () => {
      forAll({
        seed: 3,
        runs: 200,
        generate: (random, run) => (run % 2 === 0
          ? integerBetween(random, -BIG, -1)
          : integerBetween(random, 0, BIG) + 0.5),
        property: (sizeBytes) => {
          assert.throws(
            () => calculatePrice({ sizeBytes, usdPerBch: 400, cfg }),
            /sizeBytes must be a non-negative integer/
          )
        }
      })
    })

    it('should reject missing, non-positive, or non-finite usdPerBch', () => {
      for (const usdPerBch of [0, -1, Infinity, -Infinity, NaN, '400', undefined, null]) {
        assert.throws(
          () => calculatePrice({ sizeBytes: 1, usdPerBch, cfg }),
          /usdPerBch must be a positive number/
        )
      }
    })
  })
})
