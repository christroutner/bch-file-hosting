/*
  Presentational view for the file-hosting upload and payment result.

  Renders the FileUploadPage display state (quote, already hosted, paid, no
  file, expired, pending, or error) as a small block of HTML. Written in plain
  React.createElement style so the same view can be used by the JSX browser
  page and by the Node acceptance rendering, without a browser.
*/

'use strict'

const React = require('react')
const { QRCodeSVG } = require('qrcode.react')
const { buildChildren, selectChildren, messageChildren } = require('../shared/status-view')

function linkLine (key, className, label, url) {
  return React.createElement(
    'p',
    { key, className },
    label,
    React.createElement('a', { href: url }, url)
  )
}

function quoteChildren (state) {
  const children = [
    React.createElement('p', { key: 'price', className: 'file-upload-price' }, `${state.priceSats} satoshis`),
    React.createElement('p', { key: 'address', className: 'file-upload-address' }, state.paymentAddress),
    React.createElement(
      'div',
      { key: 'qr', className: 'file-upload-qr' },
      React.createElement(QRCodeSVG, { value: state.paymentAddress })
    )
  ]

  if (state.countdown) {
    children.push(
      React.createElement(
        'p',
        { key: 'countdown', className: 'file-upload-countdown' },
        `Quote expires in ${state.countdown}`
      )
    )
  }

  return children
}

function hostedChildren (state) {
  return [linkLine('download', 'file-upload-download', 'Download: ', state.downloadUrl)]
}

function paidChildren (state) {
  const children = [
    React.createElement('p', { key: 'cid', className: 'file-upload-cid' }, `CID: ${state.cid}`),
    linkLine('download', 'file-upload-download', 'Download: ', state.downloadUrl)
  ]

  const gateways = state.gatewayUrls || []
  for (let i = 0; i < gateways.length; i++) {
    children.push(linkLine(`gateway-${i}`, 'file-upload-gateway', 'Gateway: ', gateways[i]))
  }

  children.push(
    React.createElement('p', { key: 'txid', className: 'file-upload-txid' }, `Payment: ${state.txid}`)
  )
  children.push(
    React.createElement(
      'p',
      { key: 'status-link', className: 'file-upload-status-link' },
      React.createElement('a', { href: `/status?cid=${encodeURIComponent(state.cid)}` }, 'Check hosting status')
    )
  )

  return children
}

// Display status to children builder. A null prototype keeps an unexpected
// status string (for example "constructor") from resolving to an
// Object.prototype member instead of the empty default.
const STATUS_CHILDREN = buildChildren({
  quote: quoteChildren,
  hosted: hostedChildren,
  paid: paidChildren,
  'no-file': messageChildren('prompt', 'file-upload-prompt'),
  error: messageChildren('error', 'file-upload-error'),
  expired: messageChildren('expired', 'file-upload-expired'),
  pending: messageChildren('pending', 'file-upload-pending')
})

function UploadQuoteView ({ state = { status: 'idle' } } = {}) {
  const children = selectChildren(STATUS_CHILDREN, state)

  if (state.filename) {
    children.unshift(
      React.createElement('p', { key: 'filename', className: 'file-upload-name' }, state.filename)
    )
  }

  return React.createElement('div', { className: 'file-upload-result' }, ...children)
}

module.exports = UploadQuoteView

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T15:57:07.738Z","module_hash":"f83ed0263dcc9333d15c3bad4f42a3a062846ed05959a49b3301b697fe28bb77","functions":[{"id":"func/linkLine","name":"linkLine","line":16,"end_line":23,"hash":"6c24c30002c2e60384af7d598f03145cfa7c328e5416447c929f1fb20a590409"},{"id":"func/quoteChildren","name":"quoteChildren","line":25,"end_line":47,"hash":"aeaee6a1fe347f87185e0306945f154aa8b61745f592d7838a4a9a92c4fca5e0"},{"id":"func/hostedChildren","name":"hostedChildren","line":49,"end_line":51,"hash":"52858c79fca6f4c0825666d1e45c80aa84c78bac810cecbf307d98a879f8be46"},{"id":"func/paidChildren","name":"paidChildren","line":53,"end_line":76,"hash":"38d0ccca775e7dfd0779b773b445e11ad30d55aebff4bcd00345180fc2d48c88"},{"id":"func/UploadQuoteView","name":"UploadQuoteView","line":91,"end_line":101,"hash":"7f34f34983ecc59c828d693b3a30e79086f4bac361d921e0e6e9d3eb64649756"}]}
// mutate4javascript-manifest-end
