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
