/*
  Browser clipboard adapter.

  Writing to the clipboard is an environment capability, not view logic, so it
  lives behind this small module instead of inside the presentational view. The
  clipboard object is injectable so the write can be exercised without a
  browser; when no clipboard is available the call is a safe no-op (the Node
  acceptance render never invokes the click handler).
*/

'use strict'

// The browser clipboard, or null when the code runs outside a browser.
function defaultClipboard () {
  if (typeof navigator !== 'undefined' && navigator.clipboard) return navigator.clipboard
  return null
}

// Copy a value through a clipboard-like object. No-op without a usable
// clipboard.
function copyToClipboard (value, clipboard = defaultClipboard()) {
  if (clipboard && typeof clipboard.writeText === 'function') {
    clipboard.writeText(value)
  }
}

module.exports = { copyToClipboard }
