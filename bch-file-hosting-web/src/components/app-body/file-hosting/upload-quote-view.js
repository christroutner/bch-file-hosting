/*
  Presentational view for the file-hosting upload result.

  Renders the FileUploadPage display state (quote, already hosted, no file, or
  error) as a small block of HTML. Written in plain React.createElement style
  so the same view can be used by the JSX browser page and by the Node
  acceptance rendering, without a browser.
*/

'use strict'

const React = require('react')

function quoteChildren (state) {
  return [
    React.createElement('p', { key: 'price', className: 'file-upload-price' }, `${state.priceSats} satoshis`),
    React.createElement('p', { key: 'address', className: 'file-upload-address' }, state.paymentAddress)
  ]
}

function hostedChildren (state) {
  return [
    React.createElement(
      'p',
      { key: 'download', className: 'file-upload-download' },
      'Download: ',
      React.createElement('a', { href: state.downloadUrl }, state.downloadUrl)
    )
  ]
}

function messageChildren (key, className) {
  return (state) => [React.createElement('p', { key, className }, state.message)]
}

// Display status to children builder. A null prototype keeps an unexpected
// status string (for example "constructor") from resolving to an
// Object.prototype member instead of the empty default.
const STATUS_CHILDREN = Object.assign(Object.create(null), {
  quote: quoteChildren,
  hosted: hostedChildren,
  'no-file': messageChildren('prompt', 'file-upload-prompt'),
  error: messageChildren('error', 'file-upload-error')
})

function statusChildren (state) {
  const build = STATUS_CHILDREN[state.status]
  return build ? build(state) : []
}

function UploadQuoteView ({ state = { status: 'idle' } } = {}) {
  const children = statusChildren(state)

  if (state.filename) {
    children.unshift(
      React.createElement('p', { key: 'filename', className: 'file-upload-name' }, state.filename)
    )
  }

  return React.createElement('div', { className: 'file-upload-result' }, ...children)
}

module.exports = UploadQuoteView
