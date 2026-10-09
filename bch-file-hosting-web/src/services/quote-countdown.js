/*
  Quote countdown formatting.

  Turns the time left before a hosting quote expires into a coarse, stable
  label such as "24 hours", "30 minutes", or "1 hour 30 minutes". Pure and
  deterministic so the page view and the acceptance run agree.
*/

'use strict'

const MINUTE_MS = 60 * 1000

function plural (count, unit) {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

// Format a signed millisecond duration as whole hours and minutes. A duration
// under a minute, including a past expiry, reads "less than a minute".
function formatCountdown (ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / MINUTE_MS))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  const parts = []
  if (hours > 0) parts.push(plural(hours, 'hour'))
  if (minutes > 0) parts.push(plural(minutes, 'minute'))

  return parts.length > 0 ? parts.join(' ') : 'less than a minute'
}

module.exports = { formatCountdown }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T15:19:39.235Z","module_hash":"a93c79e54c308c2766330c0f1403a129663f53b5b0817fd4a30d330838479484","functions":[{"id":"func/plural","name":"plural","line":13,"end_line":15,"hash":"f629612b67e15063de31d69f84ee41b847f1fe69107ed3fc8652ca00efabf97d"},{"id":"func/formatCountdown","name":"formatCountdown","line":19,"end_line":29,"hash":"954db78cef80bbe7baf001c656b92f7554e207860b1dfaee4e2fa3ae668bf5c2"}]}
// mutate4javascript-manifest-end
