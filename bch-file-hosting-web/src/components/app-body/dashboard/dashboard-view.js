/*
  Presentational view for the hosted-files dashboard.

  Renders the DashboardPage display state as a Bootstrap table: one row per
  file with its formatted size and times, a status badge, provider:status
  pins, a truncated CID with a copy control, and a download link; or the
  empty-feed message, or the API error. Written in plain React.createElement
  style so the same view can be used by the browser page and by the Node
  acceptance rendering, without a browser.
*/

const React = require('react')
const { line, buildChildren, selectChildren, messageChildren } = require('../shared/status-view')
const { copyToClipboard } = require('../../../services/clipboard')

const EMPTY_MESSAGE = 'No files are hosted yet.'
const COLUMNS = [
  'File Name',
  'Size',
  'Status',
  'Pins',
  'Paid',
  'Hosted Until',
  'CID',
  'Download'
]

// Decimal units: 1 KB = 1,000 bytes, 1 MB = 1,000,000 bytes.
function formatSize (bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value)) return ''
  if (value < 1000) return `${value} bytes`
  if (value < 1000000) return `${(value / 1000).toFixed(2)} KB`
  return `${(value / 1000000).toFixed(2)} MB`
}

function pad2 (value) {
  return String(value).padStart(2, '0')
}

// Render an ISO timestamp as a UTC minute timestamp (for example
// "2026-01-02 00:00 UTC"). An unparseable value renders an empty cell.
function formatDate (value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return (
    `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ` +
    `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`
  )
}

// Show the first and last eight characters of a CID; short CIDs are unchanged.
function truncateCid (cid) {
  const value = String(cid)
  if (value.length <= 16) return value
  return `${value.slice(0, 8)}...${value.slice(-8)}`
}

function copyControl (cid) {
  return React.createElement(
    'button',
    {
      key: 'copy',
      type: 'button',
      className: 'dashboard-copy btn btn-sm btn-outline-secondary',
      title: 'Copy CID',
      'aria-label': `Copy CID ${cid}`,
      'data-cid': cid,
      onClick: () => copyToClipboard(cid)
    },
    'Copy'
  )
}

function statusBadge (status) {
  return React.createElement(
    'span',
    { className: `badge dashboard-status dashboard-status-${status}` },
    status
  )
}

function pinsText (file) {
  return (file.pins || []).map((pin) => `${pin.provider}: ${pin.status}`).join(', ')
}

function cidCell (file) {
  return React.createElement(
    'td',
    { key: 'cid', className: 'dashboard-file-cid' },
    React.createElement('span', { className: 'dashboard-cid-text', title: file.cid }, truncateCid(file.cid)),
    ' ',
    copyControl(file.cid)
  )
}

function downloadCell (file) {
  return React.createElement(
    'td',
    { key: 'download', className: 'dashboard-file-download' },
    React.createElement('a', { href: file.downloadUrl, className: 'dashboard-download' }, 'Download')
  )
}

function fileRow (file, index) {
  return React.createElement(
    'tr',
    { key: `file-${index}`, className: 'dashboard-row', 'data-cid': file.cid },
    React.createElement('td', { className: 'dashboard-file-name' }, file.filename),
    React.createElement('td', { className: 'dashboard-file-size' }, formatSize(file.sizeBytes)),
    React.createElement('td', { className: 'dashboard-file-status' }, statusBadge(file.status)),
    React.createElement('td', { className: 'dashboard-file-pins' }, pinsText(file)),
    React.createElement('td', { className: 'dashboard-file-paid' }, formatDate(file.paidAt)),
    React.createElement('td', { className: 'dashboard-file-until' }, formatDate(file.hostedUntil)),
    cidCell(file),
    downloadCell(file)
  )
}

function table (files) {
  return React.createElement(
    'table',
    { className: 'table dashboard-table' },
    React.createElement(
      'thead',
      null,
      React.createElement(
        'tr',
        null,
        ...COLUMNS.map((column, index) => React.createElement('th', { key: index, scope: 'col' }, column))
      )
    ),
    React.createElement('tbody', null, ...files.map(fileRow))
  )
}

function loadedChildren (state) {
  const files = state.files || []
  if (files.length === 0) {
    return [line('empty', 'dashboard-empty', EMPTY_MESSAGE)]
  }
  return [table(files)]
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
module.exports.formatSize = formatSize
module.exports.formatDate = formatDate
module.exports.truncateCid = truncateCid

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T20:22:10.022Z","module_hash":"aae6d7f1c03bc6aa61cbb932094d6de259c59a3d391f2e3b7c868d4d041092a8","functions":[{"id":"func/pinLines","name":"pinLines","line":15,"end_line":25,"hash":"c50544e1beaddfd3d0125fae1bb90813e770f3c9ca3910944cc6731bf0c1766e"},{"id":"func/fileChildren","name":"fileChildren","line":27,"end_line":38,"hash":"ee46e5162efd341b32618014f44747232b431766ca191229fee1c8ec73ed7c1d"},{"id":"func/fileCard","name":"fileCard","line":40,"end_line":46,"hash":"61274a1fe9e0b853d37bee27736af42e1b02e3b3714fd28b7d528fad4bfa7356"},{"id":"func/loadedChildren","name":"loadedChildren","line":48,"end_line":54,"hash":"fba64b4456a39e889ca5db99eb246a16f61a4f354bf4fc24949470512d0781ab"},{"id":"func/DashboardView","name":"DashboardView","line":64,"end_line":66,"hash":"db81742ac5522641ee77b0c216dfa115b7c108f56144186e0949fb232814b612"}]}
// mutate4javascript-manifest-end
