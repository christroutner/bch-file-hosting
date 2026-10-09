/*
  Quote countdown formatting.

  Turns the time left before a hosting quote expires into a coarse, stable
  label such as "24 hours", "30 minutes", or "1 hour 30 minutes". Pure and
  deterministic so the page view and the acceptance run agree.
*/

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
// {"version":1,"tested_at":"2026-10-09T20:23:04.628Z","module_hash":"f40430acdcc0d79d68b1c97416a2cc40b88bd48e6eccf2e4b9e17b286ef2dd89","functions":[{"id":"func/plural","name":"plural","line":11,"end_line":13,"hash":"f629612b67e15063de31d69f84ee41b847f1fe69107ed3fc8652ca00efabf97d"},{"id":"func/formatCountdown","name":"formatCountdown","line":17,"end_line":27,"hash":"954db78cef80bbe7baf001c656b92f7554e207860b1dfaee4e2fa3ae668bf5c2"}]}
// mutate4javascript-manifest-end
