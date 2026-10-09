/*
  Unit tests for the browser clipboard adapter (src/services/clipboard.js).

  The adapter is the only place the view touches the browser clipboard. The
  clipboard object is injectable, so a write can be asserted without a browser
  and a missing clipboard is a no-op.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const { copyToClipboard } = require('../../src/services/clipboard')

test('writes the value through the injected clipboard exactly once', () => {
  const writes = []
  copyToClipboard('bafy-cid', { writeText: (value) => writes.push(value) })

  assert.deepEqual(writes, ['bafy-cid'])
})

test('does nothing when no clipboard is available', () => {
  assert.doesNotThrow(() => copyToClipboard('bafy-cid', null))
  assert.doesNotThrow(() => copyToClipboard('bafy-cid'))
})

test('ignores a clipboard-like object without writeText', () => {
  assert.doesNotThrow(() => copyToClipboard('bafy-cid', {}))
})
