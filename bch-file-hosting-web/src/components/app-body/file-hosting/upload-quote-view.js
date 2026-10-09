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

function statusChildren (state) {
  switch (state.status) {
    case 'quote':
      return quoteChildren(state)
    case 'hosted':
      return hostedChildren(state)
    case 'no-file':
      return [React.createElement('p', { key: 'prompt', className: 'file-upload-prompt' }, state.message)]
    case 'error':
      return [React.createElement('p', { key: 'error', className: 'file-upload-error' }, state.message)]
    default:
      return []
  }
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
