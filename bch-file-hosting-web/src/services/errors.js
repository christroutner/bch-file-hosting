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
