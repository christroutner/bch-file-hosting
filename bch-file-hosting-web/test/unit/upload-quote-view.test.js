/*
  Unit tests for the UploadQuoteView React component.

  The component is presentational: it renders the FileUploadPage display state
  as static HTML. The tests render it with ReactDOMServer and assert on the
  visible text and markup, so the browser and the acceptance run share the
  exact same view.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const UploadQuoteView = require('../../src/components/app-body/file-hosting/upload-quote-view')

function render (state) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(UploadQuoteView, { state }))
}

test('renders the file name, price, and payment address for a quote', () => {
  const html = render({
    status: 'quote',
    filename: 'photo.jpg',
    priceSats: 2000,
    paymentAddress: 'bitcoincash:qquote'
  })

  assert.ok(html.includes('>photo.jpg<'))
  assert.ok(html.includes('2000 satoshis'))
  assert.ok(html.includes('bitcoincash:qquote'))
})

test('renders the file size and a separate billed size when they differ', () => {
  const html = render({
    status: 'quote',
    filename: 'small.txt',
    priceSats: 2000,
    paymentAddress: 'bitcoincash:qquote',
    sizeBytes: 500,
    billedBytes: 100000
  })

  assert.ok(html.includes('500 bytes'))
  assert.ok(html.includes('100000 bytes'))
  assert.ok(html.includes('file-upload-billed-size'))
})

test('omits the billed size when it equals the file size', () => {
  const html = render({
    status: 'quote',
    filename: 'photo.jpg',
    priceSats: 2000,
    paymentAddress: 'bitcoincash:qquote',
    sizeBytes: 1000000,
    billedBytes: 1000000
  })

  assert.ok(html.includes('1000000 bytes'))
  assert.ok(!html.includes('file-upload-billed-size'))
})

test('omits the sizes when the quote does not report them', () => {
  const html = render({
    status: 'quote',
    filename: 'photo.jpg',
    priceSats: 2000,
    paymentAddress: 'bitcoincash:qquote'
  })

  assert.ok(!html.includes('bytes'))
})

test('renders the view URL for an already hosted file', () => {
  const html = render({
    status: 'hosted',
    filename: 'archive.tar',
    viewUrl: 'http://localhost:5050/view/bafy'
  })

  assert.ok(html.includes('>archive.tar<'))
  assert.ok(html.includes('http://localhost:5050/view/bafy'))
  assert.ok(html.includes('href="http://localhost:5050/view/bafy"'))
})

test('renders the prompt when no file was chosen', () => {
  const html = render({ status: 'no-file', message: 'Choose a file to upload.' })

  assert.ok(html.includes('Choose a file to upload.'))
})

test('renders the file name and error message for a rejected upload', () => {
  const html = render({ status: 'error', filename: 'huge.bin', message: 'File is too large' })

  assert.ok(html.includes('>huge.bin<'))
  assert.ok(html.includes('File is too large'))
})

test('renders an empty result container before an upload', () => {
  const html = render({ status: 'idle' })

  assert.ok(html.includes('file-upload-result'))
  assert.ok(!html.includes('satoshis'))
})

test('renders a payment QR code and a countdown for a quote', () => {
  const html = render({
    status: 'quote',
    filename: 'photo.jpg',
    priceSats: 2000,
    paymentAddress: 'bitcoincash:qquote',
    countdown: '24 hours'
  })

  assert.ok(html.includes('file-upload-qr'))
  assert.ok(html.includes('<svg'))
  assert.ok(html.includes('Quote expires in 24 hours'))
})

test('omits the countdown when the quote has none', () => {
  const html = render({
    status: 'quote',
    filename: 'photo.jpg',
    priceSats: 2000,
    paymentAddress: 'bitcoincash:qquote'
  })

  assert.ok(html.includes('file-upload-qr'))
  assert.ok(!html.includes('Quote expires in'))
})

test('renders the CID, view URL, and payment transaction', () => {
  const html = render({
    status: 'paid',
    filename: 'photo.jpg',
    cid: 'bafy123',
    viewUrl: 'http://localhost:5050/view/bafy123',
    txid: 'abc123'
  })

  assert.ok(html.includes('bafy123'))
  assert.ok(html.includes('http://localhost:5050/view/bafy123'))
  assert.ok(html.includes('abc123'))
  assert.ok(!html.includes('file-upload-gateway'))
})

test('renders exactly one view link for a paid file', () => {
  const html = render({
    status: 'paid',
    filename: 'photo.jpg',
    cid: 'bafy123',
    viewUrl: 'http://localhost:5050/view/bafy123',
    txid: 'abc123'
  })

  assert.equal((html.match(/file-upload-view/g) || []).length, 1)
  assert.ok(html.includes('View: '))
})

test('opens an image view link in a new tab', () => {
  const html = render({
    status: 'paid',
    filename: 'photo.jpg',
    cid: 'bafy123',
    viewUrl: 'http://localhost:5050/view/bafy123',
    txid: 'abc123'
  })

  assert.ok(html.includes('target="_blank"'))
})

test('keeps a non-image view link in the current tab', () => {
  const html = render({
    status: 'paid',
    filename: 'archive.tar',
    cid: 'bafy123',
    viewUrl: 'http://localhost:5050/view/bafy123',
    txid: 'abc123'
  })

  assert.ok(!html.includes('target="_blank"'))
})

test('renders the expired and pending messages', () => {
  const expired = render({ status: 'expired', message: 'This quote has expired.' })
  const pending = render({ status: 'pending', message: 'Payment not confirmed.' })

  assert.ok(expired.includes('This quote has expired.'))
  assert.ok(expired.includes('file-upload-expired'))
  assert.ok(pending.includes('Payment not confirmed.'))
  assert.ok(pending.includes('file-upload-pending'))
})
