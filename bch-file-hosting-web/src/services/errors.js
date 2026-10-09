/*
  Shared error-message helper for the web page services.

  A failed API or wallet call is shown to the visitor using the failure's own
  message when it has one, and the caller's fallback otherwise. Kept in one
  place so the page services map failures the same way.
*/

'use strict'

function failureMessage (err, fallback) {
  return err && err.message ? err.message : fallback
}

module.exports = { failureMessage }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T15:56:47.650Z","module_hash":"c6a5734aeaa7e55d15bc7aa35974891bb5737daff1acd3669333c8bf05dd2404","functions":[{"id":"func/failureMessage","name":"failureMessage","line":11,"end_line":13,"hash":"c3530956970ce4eeb22ba802c48ebeeb77d92ca21411fc4a9aa17b5e80474640"}]}
// mutate4javascript-manifest-end
