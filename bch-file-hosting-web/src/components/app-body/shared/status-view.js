/*
  Shared presentational helpers for the hosting result and file status views.

  Both views render a plain display state as a small block of HTML using the
  same shape: a null-prototype lookup from status to a children builder, a
  message-line builder, and a safe selector. Written with React.createElement
  so the Node acceptance run can render the same views without a browser.
*/

'use strict'

const React = require('react')

// A <p> line with a stable key and class name.
function line (key, className, text) {
  return React.createElement('p', { key, className }, text)
}

// Build a status-to-children lookup with a null prototype, so an unexpected
// status string (for example "constructor") resolves to the empty default
// instead of an Object.prototype member.
function buildChildren (builders) {
  return Object.assign(Object.create(null), builders)
}

// Select the children for a display state, or [] for an unknown status.
function selectChildren (builders, state) {
  const build = builders[state.status]
  return build ? build(state) : []
}

// A builder for the states that only show a message line.
function messageChildren (key, className) {
  return (state) => [line(key, className, state.message)]
}

module.exports = { line, buildChildren, selectChildren, messageChildren }
