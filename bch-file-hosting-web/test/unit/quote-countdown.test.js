/*
  Unit tests for the quote countdown formatter
  (src/services/quote-countdown.js).
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { formatCountdown } = require('../../src/services/quote-countdown')

const MINUTE = 60 * 1000

test('formats whole hours', () => {
  assert.equal(formatCountdown(24 * 60 * MINUTE), '24 hours')
})

test('formats whole minutes', () => {
  assert.equal(formatCountdown(30 * MINUTE), '30 minutes')
})

test('formats hours and minutes together', () => {
  assert.equal(formatCountdown(90 * MINUTE), '1 hour 30 minutes')
})

test('uses a singular hour', () => {
  assert.equal(formatCountdown(60 * MINUTE), '1 hour')
})

test('uses a singular minute', () => {
  assert.equal(formatCountdown(MINUTE), '1 minute')
})

test('rounds a partial minute down', () => {
  assert.equal(formatCountdown(90 * MINUTE + 59 * 1000), '1 hour 30 minutes')
})

test('reports a past expiry as less than a minute', () => {
  assert.equal(formatCountdown(-1), 'less than a minute')
})

test('reports zero as less than a minute', () => {
  assert.equal(formatCountdown(0), 'less than a minute')
})
