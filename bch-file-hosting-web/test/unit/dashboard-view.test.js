/*
  Unit tests for the DashboardView React component
  (src/components/app-body/dashboard/dashboard-view.js).

  The component is presentational: it renders the DashboardPage display state
  as static HTML. The tests render it with ReactDOMServer and assert on the
  visible text and markup, so the browser and the acceptance run share the
  exact same view.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const DashboardView = require('../../src/components/app-body/dashboard/dashboard-view')
const { EMPTY_MESSAGE } = DashboardView

function render (state) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(DashboardView, { state }))
}

test('renders each file in order with its details and pins', () => {
  const html = render({
    status: 'loaded',
    hasMore: false,
    files: [
      {
        cid: 'bafy-a',
        filename: 'photo.jpg',
        sizeBytes: 1024,
        status: 'pinned',
        paymentAddress: 'bitcoincash:qfeed',
        paidAt: '2026-01-02T00:00:00.000Z',
        hostedUntil: '2027-01-02T00:00:00.000Z',
        pins: [{ provider: 'local-helia', status: 'pinned' }]
      },
      {
        cid: 'bafy-b',
        filename: 'notes.txt',
        sizeBytes: 2048,
        status: 'pinFailed',
        paymentAddress: 'bitcoincash:qother',
        paidAt: '2026-01-01T00:00:00.000Z',
        hostedUntil: '2027-01-01T00:00:00.000Z',
        pins: [{ provider: 'lighthouse', status: 'failed' }]
      }
    ]
  })

  assert.ok(html.includes('photo.jpg'))
  assert.ok(html.includes('notes.txt'))
  assert.ok(html.includes('bafy-a'))
  assert.ok(html.includes('1024 bytes'))
  assert.ok(html.includes('pinFailed'))
  assert.ok(html.includes('2027-01-02T00:00:00.000Z'))
  assert.ok(html.includes('bitcoincash:qfeed'))
  assert.ok(html.includes('local-helia'))
  assert.ok(html.includes('lighthouse'))
  assert.equal((html.match(/dashboard-file"/g) || []).length, 2)
  assert.ok(html.indexOf('photo.jpg') < html.indexOf('notes.txt'))
})

test('renders the empty-feed message', () => {
  const html = render({ status: 'loaded', hasMore: false, files: [] })

  assert.ok(html.includes(EMPTY_MESSAGE))
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
