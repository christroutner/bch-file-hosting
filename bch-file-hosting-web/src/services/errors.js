/*
  Shared error-message helper for the web page services.

  A failed API or wallet call is shown to the visitor using the failure's own
  message when it has one, and the caller's fallback otherwise. Kept in one
  place so the page services map failures the same way.
*/

function failureMessage (err, fallback) {
  return err && err.message ? err.message : fallback
}

module.exports = { failureMessage }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T20:22:38.727Z","module_hash":"a3ecbbb19002dd31e4820c1c67f8083f478fc72632a5394eb59160b88347d2e0","functions":[{"id":"func/failureMessage","name":"failureMessage","line":9,"end_line":11,"hash":"c3530956970ce4eeb22ba802c48ebeeb77d92ca21411fc4a9aa17b5e80474640"}]}
// mutate4javascript-manifest-end
