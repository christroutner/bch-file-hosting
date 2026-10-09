/*
  Property tests for the browser clipboard adapter (src/services/clipboard.js).

  Invariants: with a working clipboard, one call writes exactly the given value
  once (no truncation and no extra writes); with an absent or unwritable
  clipboard the call is a safe no-op that never throws.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { copyToClipboard } = require('../../src/services/clipboard')
const { forAll, integerBetween, randomString } = require('./lib/harness')

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_:/'

test('property: a working clipboard receives exactly the copied value once', () => {
  forAll({
    seed: 1,
    runs: 300,
    generate: (random) => randomString(random, 0, 80, ALPHABET),
    property: (value) => {
      const writes = []
      copyToClipboard(value, { writeText: (written) => writes.push(written) })

      assert.deepEqual(writes, [value])
    }
  })
})

test('property: an absent or unwritable clipboard is a safe no-op', () => {
  forAll({
    seed: 2,
    runs: 200,
    generate: (random) => ({
      value: randomString(random, 1, 40, ALPHABET),
      mode: integerBetween(random, 0, 2)
    }),
    property: ({ value, mode }) => {
      const clipboard = mode === 0 ? null : (mode === 1 ? {} : { writeText: 'not-a-function' })
      assert.doesNotThrow(() => copyToClipboard(value, clipboard))
    }
  })
})
