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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T15:57:05.275Z","module_hash":"8bdce336c737a176dfbcd13bb3daaabbf6648004b4985d0da37b6f9563b78fdc","functions":[{"id":"func/pinLines","name":"pinLines","line":16,"end_line":22,"hash":"3c8341789fbe1a1d03074876d9e08ceab2f589f4e3d11d2f114f67220e0ee176"},{"id":"func/foundChildren","name":"foundChildren","line":24,"end_line":33,"hash":"51ad3694c470619514230aa2cb5e9b9bfb5b1757629b951e7f06d39d18403515"},{"id":"func/FileStatusView","name":"FileStatusView","line":44,"end_line":46,"hash":"a78874bcf5282c8cce63eb2590c60f6d9803f25b0855b253c8ccd8c19e105d1e"}]}
// mutate4javascript-manifest-end
