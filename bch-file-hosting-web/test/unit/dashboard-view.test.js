/*
  Unit tests for the DashboardView React component
  (src/components/app-body/dashboard/dashboard-view.js).

  The component is presentational: it renders the DashboardPage display state
  as a Bootstrap table. The tests render it with ReactDOMServer and assert on
  the visible text and markup, so the browser and the acceptance run share the
  exact same view.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const DashboardView = require('../../src/components/app-body/dashboard/dashboard-view')
const { EMPTY_MESSAGE } = DashboardView

const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
const COLUMNS = ['File Name', 'Size', 'Status', 'Pins', 'Paid', 'Hosted Until', 'CID', 'Download']

function file (overrides = {}) {
  return {
    cid: CID,
    filename: 'photo.jpg',
    sizeBytes: 1024,
    status: 'pinned',
    paymentAddress: 'bitcoincash:qfeed',
    paidAt: '2026-01-02T00:00:00.000Z',
    hostedUntil: '2027-01-02T00:00:00.000Z',
    downloadUrl: `http://localhost:5050/download/${CID}`,
    pins: [{ provider: 'local-helia', status: 'pinned' }],
    ...overrides
  }
}

function render (state) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(DashboardView, { state }))
}

function renderFile (overrides) {
  return render({ status: 'loaded', hasMore: false, files: [file(overrides)] })
}

test('renders the hosting table with the required columns', () => {
  const html = renderFile()

  for (const column of COLUMNS) {
    assert.ok(html.includes(`>${column}</th>`), `missing column ${column}`)
  }
})

test('renders one row per file in feed order', () => {
  const html = render({
    status: 'loaded',
    hasMore: false,
    files: [
      file({ cid: 'bafy-a', filename: 'photo.jpg' }),
      file({ cid: 'bafy-b', filename: 'notes.txt' })
    ]
  })

  assert.equal((html.match(/dashboard-row/g) || []).length, 2)
  assert.ok(html.indexOf('photo.jpg') < html.indexOf('notes.txt'))
})

test('formats the size in decimal units', () => {
  assert.ok(renderFile({ sizeBytes: 999 }).includes('999 bytes'))
  assert.ok(renderFile({ sizeBytes: 1024 }).includes('1.02 KB'))
  assert.ok(renderFile({ sizeBytes: 1000000 }).includes('1.00 MB'))
})

test('formats the paid and hosting times as UTC minute timestamps', () => {
  const html = renderFile({
    paidAt: '2026-02-15T13:45:00.000Z',
    hostedUntil: '2027-02-15T13:45:00.000Z'
  })

  assert.ok(html.includes('2026-02-15 13:45 UTC'))
  assert.ok(html.includes('2027-02-15 13:45 UTC'))
})

test('renders the status and each pin as provider: status', () => {
  const html = renderFile({
    status: 'pinFailed',
    pins: [{ provider: 'lighthouse', status: 'failed' }]
  })

  assert.ok(html.includes('>pinFailed<'))
  assert.ok(html.includes('lighthouse: failed'))
  assert.ok(!html.includes('Pin: lighthouse'))
})

test('truncates the CID and offers a copy control', () => {
  const html = renderFile()

  assert.ok(html.includes('bafybeig...y55fbzdi'))
  assert.ok(!html.includes(`>${CID}<`))
  assert.ok(/<button[^>]*class="[^"]*dashboard-copy/.test(html))
})

test('links the download cell to the file download URL', () => {
  const html = renderFile({ downloadUrl: 'http://localhost:5050/download/bafy-x' })

  assert.ok(html.includes('href="http://localhost:5050/download/bafy-x"'))
})

test('renders the empty-feed message without a table', () => {
  const html = render({ status: 'loaded', hasMore: false, files: [] })

  assert.ok(html.includes(EMPTY_MESSAGE))
  assert.ok(!html.includes('dashboard-table'))
})

test('renders the API error message', () => {
  const html = render({ status: 'error', message: 'Hosting API down' })

  assert.ok(html.includes('Hosting API down'))
})

test('renders an empty container before the feed loads', () => {
  const html = render({ status: 'idle' })

  assert.ok(html.includes('dashboard'))
  assert.ok(!html.includes('bytes'))
})
