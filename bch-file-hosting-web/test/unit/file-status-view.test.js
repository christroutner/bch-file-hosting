/*
  Unit tests for the FileStatusView React component
  (src/components/app-body/file-status/file-status-view.js).

  The component is presentational: it renders the FileStatusPage display state
  as static HTML. The tests render it with ReactDOMServer and assert on the
  visible text and markup, so the browser and the acceptance run share the
  exact same view.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const FileStatusView = require('../../src/components/app-body/file-status/file-status-view')

function render (state) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(FileStatusView, { state }))
}

test('renders the CID, name, size, status, hosting window, and pins', () => {
  const html = render({
    status: 'found',
    cid: 'bafy123',
    filename: 'photo.jpg',
    sizeBytes: 1024,
    fileStatus: 'pinned',
    hostedUntil: '2027-10-09T00:00:00.000Z',
    pins: [
      { provider: 'local-helia', status: 'pinned' },
      { provider: 'lighthouse', status: 'failed' }
    ]
  })

  assert.ok(html.includes('bafy123'))
  assert.ok(html.includes('photo.jpg'))
  assert.ok(html.includes('1024 bytes'))
  assert.ok(html.includes('pinned'))
  assert.ok(html.includes('2027-10-09T00:00:00.000Z'))
  assert.ok(html.includes('local-helia'))
  assert.ok(html.includes('lighthouse'))
  assert.ok(html.includes('failed'))
  assert.equal((html.match(/file-status-pin/g) || []).length, 2)
})

test('renders the not paid hosting window', () => {
  const html = render({
    status: 'found',
    cid: 'bafy123',
    filename: 'draft.txt',
    sizeBytes: 500,
    fileStatus: 'staged',
    hostedUntil: 'not paid',
    pins: []
  })

  assert.ok(html.includes('not paid'))
})

test('renders the no-CID prompt', () => {
  const html = render({ status: 'no-cid', message: 'Enter a CID to look up.' })

  assert.ok(html.includes('Enter a CID to look up.'))
})

test('renders the error message', () => {
  const html = render({ status: 'error', message: 'File not found' })

  assert.ok(html.includes('File not found'))
})

test('renders an empty container before a lookup', () => {
  const html = render({ status: 'idle' })

  assert.ok(html.includes('file-status-result'))
  assert.ok(!html.includes('bytes'))
})
