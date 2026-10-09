/*
  Property tests for the quote countdown formatter
  (src/services/quote-countdown.js).

  Invariants: the label round-trips to the whole minutes remaining; durations
  under a minute (including a past expiry) always read "less than a minute";
  units are ordered hours then minutes and never use a plural for a count of
  one; and formatting is deterministic.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { formatCountdown } = require('../../src/services/quote-countdown')
const { forAll, integerBetween } = require('./lib/harness')

const MINUTE_MS = 60 * 1000
const BIG = 1000 * 60 * MINUTE_MS // 1000 hours in ms

// Parse a generated label back into whole minutes.
function labelMinutes (label) {
  if (label === 'less than a minute') return 0
  let total = 0
  const hours = /(\d+) hours?/.exec(label)
  const minutes = /(\d+) minutes?/.exec(label)
  if (hours) total += Number(hours[1]) * 60
  if (minutes) total += Number(minutes[1])
  return total
}

test('property: the label round-trips to the whole minutes remaining', () => {
  forAll({
    seed: 1,
    runs: 500,
    generate: (random) => integerBetween(random, 0, BIG),
    property: (ms) => {
      const label = formatCountdown(ms)

      assert.equal(labelMinutes(label), Math.floor(ms / MINUTE_MS))
    }
  })
})

test('property: durations under a minute read less than a minute', () => {
  forAll({
    seed: 2,
    runs: 300,
    generate: (random) => integerBetween(random, -BIG, MINUTE_MS - 1),
    property: (ms) => {
      assert.equal(formatCountdown(ms), 'less than a minute')
    }
  })
})

test('property: a count of one is never plural', () => {
  forAll({
    seed: 3,
    runs: 400,
    generate: (random) => integerBetween(random, MINUTE_MS, BIG),
    property: (ms) => {
      const label = formatCountdown(ms)
      if (label === 'less than a minute') return

      const hours = /(\d+) hour(s?)/.exec(label)
      const minutes = /(\d+) minute(s?)/.exec(label)
      if (hours) assert.equal(hours[2], Number(hours[1]) === 1 ? '' : 's')
      if (minutes) assert.equal(minutes[2], Number(minutes[1]) === 1 ? '' : 's')
    }
  })
})

test('property: units are ordered hours then minutes and repeated only once', () => {
  forAll({
    seed: 4,
    runs: 400,
    generate: (random) => integerBetween(random, 0, BIG),
    property: (ms) => {
      const label = formatCountdown(ms)
      if (label === 'less than a minute') return

      const hoursMatch = label.match(/hour/g) || []
      const minutesMatch = label.match(/minute/g) || []
      assert.ok(hoursMatch.length <= 1)
      assert.ok(minutesMatch.length <= 1)

      const hourIndex = label.indexOf('hour')
      const minuteIndex = label.indexOf('minute')
      if (hourIndex !== -1 && minuteIndex !== -1) assert.ok(hourIndex < minuteIndex)
    }
  })
})

test('property: formatting is deterministic', () => {
  forAll({
    seed: 5,
    runs: 200,
    generate: (random) => integerBetween(random, -BIG, BIG),
    property: (ms) => {
      assert.equal(formatCountdown(ms), formatCountdown(ms))
    }
  })
})
