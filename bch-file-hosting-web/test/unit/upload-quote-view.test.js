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

test('renders the download URL for an already hosted file', () => {
  const html = render({
    status: 'hosted',
    filename: 'archive.tar',
    downloadUrl: 'http://localhost:5050/download/bafy'
  })

  assert.ok(html.includes('>archive.tar<'))
  assert.ok(html.includes('http://localhost:5050/download/bafy'))
  assert.ok(html.includes('href="http://localhost:5050/download/bafy"'))
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

test('renders the CID, download URL, gateway URL, and payment transaction', () => {
  const html = render({
    status: 'paid',
    filename: 'photo.jpg',
    cid: 'bafy123',
    downloadUrl: 'http://localhost:5050/download/bafy123',
    gatewayUrls: ['https://ipfs.io/ipfs/bafy123/photo.jpg'],
    txid: 'abc123'
  })

  assert.ok(html.includes('bafy123'))
  assert.ok(html.includes('http://localhost:5050/download/bafy123'))
  assert.ok(html.includes('https://ipfs.io/ipfs/bafy123/photo.jpg'))
  assert.ok(html.includes('abc123'))
})

test('renders the expired and pending messages', () => {
  const expired = render({ status: 'expired', message: 'This quote has expired.' })
  const pending = render({ status: 'pending', message: 'Payment not confirmed.' })

  assert.ok(expired.includes('This quote has expired.'))
  assert.ok(expired.includes('file-upload-expired'))
  assert.ok(pending.includes('Payment not confirmed.'))
  assert.ok(pending.includes('file-upload-pending'))
})
