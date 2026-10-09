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

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T15:57:03.568Z","module_hash":"36c9c633356836772ca32542b677a8775e6f7b726d12d409ddf89448c53b578f","functions":[{"id":"func/line","name":"line","line":15,"end_line":17,"hash":"84c53a0e41895199e67497e49f9761631ab088f7f2a23813e18cc551cae0abd0"},{"id":"func/buildChildren","name":"buildChildren","line":22,"end_line":24,"hash":"11df0e7ff5b1b1b3b6f3a9f225e552109acf0760abc59712a48c7cfcf378d9c7"},{"id":"func/selectChildren","name":"selectChildren","line":27,"end_line":30,"hash":"f109c38d80331ca3d93ee5e8e8918b7ac20f83c521728833b74eb40735e70de8"},{"id":"func/messageChildren","name":"messageChildren","line":33,"end_line":35,"hash":"c2ad5f2045c5adc1c516e7dcfddf0c96263e7b32b51380c152e1e961eedc4a66"}]}
// mutate4javascript-manifest-end
