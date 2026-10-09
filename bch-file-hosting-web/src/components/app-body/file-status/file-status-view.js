/*
  Presentational view for the file status result.

  Renders the FileStatusPage display state (a found file with its hosting
  window and pins, a no-CID prompt, or an error) as a small block of HTML.
  Written in plain React.createElement style so the same view can be used by
  the JSX browser page and by the Node acceptance rendering, without a
  browser.
*/

'use strict'

const React = require('react')
const { line, buildChildren, selectChildren, messageChildren } = require('../shared/status-view')

function pinLines (pins) {
  const lines = []
  for (let i = 0; i < pins.length; i++) {
    lines.push(line(`pin-${i}`, 'file-status-pin', `Pin: ${pins[i].provider} ${pins[i].status}`))
  }
  return lines
}

function foundChildren (state) {
  return [
    line('cid', 'file-status-cid', `CID: ${state.cid}`),
    line('name', 'file-status-name', `File: ${state.filename}`),
    line('size', 'file-status-size', `${state.sizeBytes} bytes`),
    line('state', 'file-status-state', `Status: ${state.fileStatus}`),
    line('hosted', 'file-status-hosted-until', `Hosting window: ${state.hostedUntil}`),
    ...pinLines(state.pins || [])
  ]
}

// Display status to children builder. A null prototype keeps an unexpected
// status string (for example "constructor") from resolving to an
// Object.prototype member instead of the empty default.
const STATUS_CHILDREN = buildChildren({
  found: foundChildren,
  'no-cid': messageChildren('prompt', 'file-status-prompt'),
  error: messageChildren('error', 'file-status-error')
})

function FileStatusView ({ state = { status: 'idle' } } = {}) {
  return React.createElement('div', { className: 'file-status-result' }, ...selectChildren(STATUS_CHILDREN, state))
}

module.exports = FileStatusView
