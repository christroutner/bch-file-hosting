/*
  Presentational view for the hosted-files dashboard.

  Renders the DashboardPage display state (the feed in order, each file's
  details and pins, an empty-feed message, or an API error) as a small block of
  HTML. Written in plain React.createElement style so the same view can be used
  by the browser page and by the Node acceptance rendering, without a browser.
*/

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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T20:22:10.022Z","module_hash":"aae6d7f1c03bc6aa61cbb932094d6de259c59a3d391f2e3b7c868d4d041092a8","functions":[{"id":"func/pinLines","name":"pinLines","line":15,"end_line":25,"hash":"c50544e1beaddfd3d0125fae1bb90813e770f3c9ca3910944cc6731bf0c1766e"},{"id":"func/fileChildren","name":"fileChildren","line":27,"end_line":38,"hash":"ee46e5162efd341b32618014f44747232b431766ca191229fee1c8ec73ed7c1d"},{"id":"func/fileCard","name":"fileCard","line":40,"end_line":46,"hash":"61274a1fe9e0b853d37bee27736af42e1b02e3b3714fd28b7d528fad4bfa7356"},{"id":"func/loadedChildren","name":"loadedChildren","line":48,"end_line":54,"hash":"fba64b4456a39e889ca5db99eb246a16f61a4f354bf4fc24949470512d0781ab"},{"id":"func/DashboardView","name":"DashboardView","line":64,"end_line":66,"hash":"db81742ac5522641ee77b0c216dfa115b7c108f56144186e0949fb232814b612"}]}
// mutate4javascript-manifest-end
