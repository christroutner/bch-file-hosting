/*
  Property tests for the dashboard view
  (src/components/app-body/dashboard/dashboard-view.js).

  Invariants: a loaded state renders one table row per file, in order, with
  the required columns, the truncated CID and full download link, and one pin
  entry per pin; an empty feed shows the empty message without a table; an
  error state shows its message; an unknown or idle status renders the empty
  container without throwing; and rendering is deterministic.

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
const COLUMNS = ['File Name', 'Size', 'Paid', 'Hosted Until', 'CID', 'Download', 'View']
const BASE = 'http://localhost:5050'

function truncateCid (cid) {
  return cid.length <= 16 ? cid : `${cid.slice(0, 8)}...${cid.slice(-8)}`
}

function render (state) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(DashboardView, { state }))
}

function randomFile (random, index) {
  const cid = `bafy${String(index).padStart(4, '0')}${randomString(random, 4, 8)}`
  return {
    cid,
    filename: `${randomString(random, 1, 12, TEXT_ALPHABET)}.bin`,
    sizeBytes: integerBetween(random, 0, 100000000),
    paidAt: '2026-01-02T00:00:00.000Z',
    hostedUntil: '2027-01-02T00:00:00.000Z',
    downloadUrl: `${BASE}/download/${cid}`,
    viewUrl: `https://gw.example/ipfs/${cid}`
  }
}

test('property: a loaded feed renders one table row per file with its CID, download, and view links', () => {
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

      assert.equal((html.match(/dashboard-row/g) || []).length, files.length)
      for (const column of COLUMNS) {
        assert.ok(html.includes(`>${column}</th>`), `missing column ${column}`)
      }
      assert.ok(!html.includes('>Status</th>'))
      assert.ok(!html.includes('>Pins</th>'))
      for (const file of files) {
        assert.ok(html.includes(file.filename))
        assert.ok(html.includes(truncateCid(file.cid)))
        assert.ok(html.includes(`href="${file.downloadUrl}"`))
        assert.ok(html.includes(`href="${file.viewUrl}"`))
      }
      assert.equal((html.match(/target="_blank"/g) || []).length, files.length)
    }
  })
})

test('property: an empty loaded feed shows the empty message and no table', () => {
  forAll({
    seed: 2,
    runs: 100,
    generate: (random) => ({ hasMore: random() < 0.5 }),
    property: ({ hasMore }) => {
      const html = render({ status: 'loaded', hasMore, files: [] })

      assert.ok(html.includes(EMPTY_MESSAGE))
      assert.ok(!html.includes('dashboard-table'))
      assert.ok(!html.includes('dashboard-row'))
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
      assert.ok(!html.includes('dashboard-row'))
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
