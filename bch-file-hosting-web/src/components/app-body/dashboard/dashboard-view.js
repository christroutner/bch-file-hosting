/*
  Presentational view for the hosted-files dashboard.

  Renders the DashboardPage display state (the feed in order, each file's
  details and pins, an empty-feed message, or an API error) as a small block of
  HTML. Written in plain React.createElement style so the same view can be used
  by the browser page and by the Node acceptance rendering, without a browser.
*/

'use strict'

const React = require('react')
const { line, buildChildren, selectChildren, messageChildren } = require('../shared/status-view')

const EMPTY_MESSAGE = 'No files are hosted yet.'

function pinLines (file, index) {
  const lines = []
  for (let i = 0; i < (file.pins || []).length; i++) {
    lines.push(line(
      `pin-${index}-${i}`,
      'dashboard-pin',
      `Pin: ${file.pins[i].provider} ${file.pins[i].status}`
    ))
  }
  return lines
}

function fileChildren (file, index) {
  return [
    line(`name-${index}`, 'dashboard-file-name', file.filename),
    line(`cid-${index}`, 'dashboard-file-cid', `CID: ${file.cid}`),
    line(`size-${index}`, 'dashboard-file-size', `${file.sizeBytes} bytes`),
    line(`status-${index}`, 'dashboard-file-status', `Status: ${file.status}`),
    line(`paid-${index}`, 'dashboard-file-paid', `Paid: ${file.paidAt}`),
    line(`until-${index}`, 'dashboard-file-until', `Hosting window: ${file.hostedUntil}`),
    line(`address-${index}`, 'dashboard-file-address', `Address: ${file.paymentAddress}`),
    ...pinLines(file, index)
  ]
}

function fileCard (file, index) {
  return React.createElement(
    'div',
    { key: `file-${index}`, className: 'dashboard-file' },
    ...fileChildren(file, index)
  )
}

function loadedChildren (state) {
  const files = state.files || []
  if (files.length === 0) {
    return [line('empty', 'dashboard-empty', EMPTY_MESSAGE)]
  }
  return files.map(fileCard)
}

// Display status to children builder. A null prototype keeps an unexpected
// status string from resolving to an Object.prototype member instead of the
// empty default.
const STATUS_CHILDREN = buildChildren({
  loaded: loadedChildren,
  error: messageChildren('error', 'dashboard-error')
})

function DashboardView ({ state = { status: 'idle' } } = {}) {
  return React.createElement('div', { className: 'dashboard' }, ...selectChildren(STATUS_CHILDREN, state))
}

module.exports = DashboardView
module.exports.EMPTY_MESSAGE = EMPTY_MESSAGE
