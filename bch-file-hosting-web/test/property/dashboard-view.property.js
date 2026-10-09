/*
  Property tests for the dashboard view
  (src/components/app-body/dashboard/dashboard-view.js).

  Invariants: a loaded state renders one card per file, in order, with every
  public detail and exactly one line per pin; an empty feed shows the empty
  message; an error state shows its message; an unknown or idle status renders
  the empty container without throwing; and rendering is deterministic.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const DashboardView = require('../../src/components/app-body/dashboard/dashboard-view')
const { EMPTY_MESSAGE } = DashboardView
const { forAll, integerBetween, randomString } = require('./lib/harness')

const TEXT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_'
const STATUSES = ['pinning', 'pinned', 'pinFailed']

function render (state) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(DashboardView, { state }))
}

function randomFile (random, index) {
  const pinCount = integerBetween(random, 0, 3)
  const pins = []
  for (let i = 0; i < pinCount; i++) {
    pins.push({
      provider: randomString(random, 1, 10, TEXT_ALPHABET),
      status: randomString(random, 1, 8, TEXT_ALPHABET)
    })
  }
  return {
    cid: `bafy${String(index).padStart(4, '0')}${randomString(random, 4, 8)}`,
    filename: `${randomString(random, 1, 12, TEXT_ALPHABET)}.bin`,
    sizeBytes: integerBetween(random, 0, 100000000),
    status: STATUSES[integerBetween(random, 0, STATUSES.length - 1)],
    paymentAddress: `bitcoincash:q${randomString(random, 10, 30)}`,
    paidAt: '2026-01-02T00:00:00.000Z',
    hostedUntil: '2027-01-02T00:00:00.000Z',
    pins
  }
}

test('property: a loaded feed renders one card per file with every detail and pin', () => {
  forAll({
    seed: 1,
    runs: 200,
    generate: (random) => ({
      files: Array.from(
        { length: integerBetween(random, 1, 8) },
        (_, index) => randomFile(random, index)
      )
    }),
    property: ({ files }) => {
      const html = render({ status: 'loaded', hasMore: false, files })

      assert.equal((html.match(/dashboard-file-name"/g) || []).length, files.length)
      assert.equal(
        (html.match(/dashboard-pin"/g) || []).length,
        files.reduce((total, file) => total + file.pins.length, 0)
      )
      for (const file of files) {
        assert.ok(html.includes(file.filename))
        assert.ok(html.includes(`CID: ${file.cid}`))
        assert.ok(html.includes(`${file.sizeBytes} bytes`))
        assert.ok(html.includes(`Status: ${file.status}`))
        assert.ok(html.includes(`Paid: ${file.paidAt}`))
        assert.ok(html.includes(`Hosting window: ${file.hostedUntil}`))
        assert.ok(html.includes(`Address: ${file.paymentAddress}`))
        for (const pin of file.pins) {
          assert.ok(html.includes(`Pin: ${pin.provider} ${pin.status}`))
        }
      }
    }
  })
})

test('property: an empty loaded feed shows the empty message', () => {
  forAll({
    seed: 2,
    runs: 100,
    generate: (random) => ({ hasMore: random() < 0.5 }),
    property: ({ hasMore }) => {
      const html = render({ status: 'loaded', hasMore, files: [] })

      assert.ok(html.includes(EMPTY_MESSAGE))
      assert.ok(!html.includes('dashboard-file-name'))
    }
  })
})

test('property: an error state shows its message', () => {
  forAll({
    seed: 3,
    runs: 200,
    generate: (random) => randomString(random, 1, 60, TEXT_ALPHABET),
    property: (message) => {
      const html = render({ status: 'error', message })

      assert.ok(html.includes(message))
      assert.ok(html.includes('dashboard-error'))
    }
  })
})

test('property: an unknown or idle status renders the empty container', () => {
  const unknownStatuses = ['idle', 'unknown-status', 'loaded ', '', 'LOADED', 'loading']

  forAll({
    seed: 4,
    runs: 100,
    generate: (random) => unknownStatuses[integerBetween(random, 0, unknownStatuses.length - 1)],
    property: (status) => {
      const html = render({ status })

      assert.ok(html.includes('dashboard'))
      assert.ok(!html.includes('dashboard-file-name'))
      assert.ok(!html.includes('dashboard-error'))
    }
  })
})

test('property: rendering is deterministic and idempotent', () => {
  forAll({
    seed: 5,
    runs: 150,
    generate: (random) => {
      const loaded = random() < 0.5
      return loaded
        ? { status: 'loaded', hasMore: false, files: [randomFile(random, 0)] }
        : { status: 'error', message: randomString(random, 1, 20, TEXT_ALPHABET) }
    },
    property: (state) => {
      assert.equal(render(state), render(state))
    }
  })
})
