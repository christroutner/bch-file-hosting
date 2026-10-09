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

module.exports = { copyToClipboard, defaultClipboard }

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-09T23:52:29.150Z","module_hash":"58b69752092084fdf6548f660c66dbddf6f3e3921024bbc10ec459d41d79de29","functions":[{"id":"func/defaultClipboard","name":"defaultClipboard","line":14,"end_line":17,"hash":"e3211984d6afe723cc309e17648b7033660bb2c33f5a00e8ec39d17c43abd19e"},{"id":"func/copyToClipboard","name":"copyToClipboard","line":21,"end_line":25,"hash":"9cc3646ada2d53a3e317baaa20b9a0e247c81dbe5cd84aa544c5d288c12921d5"}]}
// mutate4javascript-manifest-end
