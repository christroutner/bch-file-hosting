/*
  Property tests for the file status view
  (src/components/app-body/file-status/file-status-view.js).

  Invariants: a found file renders the CID, name, size, hosting status, and
  hosting window, with exactly one line per pin; a no-CID or error state shows
  its message with the matching class; an unknown or idle status renders the
  empty container without throwing; rendering is deterministic; and untrusted
  text is HTML-escaped rather than injected as markup.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const FileStatusView = require('../../src/components/app-body/file-status/file-status-view')
const { forAll, integerBetween, randomString } = require('./lib/harness')

const TEXT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_'

function render (state) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(FileStatusView, { state }))
}

test('property: a found file renders every detail and one line per pin', () => {
  forAll({
    seed: 1,
    runs: 200,
    generate: (random) => {
      const pinCount = integerBetween(random, 0, 4)
      const pins = []
      for (let i = 0; i < pinCount; i++) {
        pins.push({
          provider: randomString(random, 1, 12, TEXT_ALPHABET),
          status: randomString(random, 1, 10, TEXT_ALPHABET)
        })
      }
      return {
        cid: randomString(random, 5, 40, TEXT_ALPHABET),
        filename: randomString(random, 1, 20, TEXT_ALPHABET),
        sizeBytes: integerBetween(random, 0, 100000000),
        fileStatus: randomString(random, 1, 10, TEXT_ALPHABET),
        hostedUntil: randomString(random, 1, 20, TEXT_ALPHABET),
        pins
      }
    },
    property: ({ cid, filename, sizeBytes, fileStatus, hostedUntil, pins }) => {
      const html = render({ status: 'found', cid, filename, sizeBytes, fileStatus, hostedUntil, pins })

      assert.ok(html.includes(`CID: ${cid}`))
      assert.ok(html.includes(`File: ${filename}`))
      assert.ok(html.includes(`${sizeBytes} bytes`))
      assert.ok(html.includes(`Status: ${fileStatus}`))
      assert.ok(html.includes(`Hosting window: ${hostedUntil}`))
      assert.equal((html.match(/file-status-pin/g) || []).length, pins.length)
      for (const pin of pins) assert.ok(html.includes(`Pin: ${pin.provider} ${pin.status}`))
    }
  })
})

test('property: no-CID and error states render their message and class', () => {
  forAll({
    seed: 2,
    runs: 200,
    generate: (random) => ({
      status: random() < 0.5 ? 'no-cid' : 'error',
      message: randomString(random, 1, 40, TEXT_ALPHABET)
    }),
    property: ({ status, message }) => {
      const html = render({ status, message })

      assert.ok(html.includes(message))
      assert.ok(html.includes(`file-status-${status === 'no-cid' ? 'prompt' : 'error'}`))
    }
  })
})

test('property: unknown or idle status renders the empty container', () => {
  const unknownStatuses = ['idle', 'unknown-status', 'found ', '', 'FOUND', 'loading']

  forAll({
    seed: 3,
    runs: 100,
    generate: (random) => unknownStatuses[integerBetween(random, 0, unknownStatuses.length - 1)],
    property: (status) => {
      const html = render({ status })

      assert.ok(html.includes('file-status-result'))
      assert.ok(!html.includes('file-status-pin'))
      assert.ok(!html.includes('bytes'))
    }
  })
})

test('property: rendering is deterministic and idempotent', () => {
  forAll({
    seed: 4,
    runs: 150,
    generate: (random) => ({
      status: random() < 0.5 ? 'found' : 'error',
      cid: randomString(random, 1, 20, TEXT_ALPHABET),
      filename: randomString(random, 1, 20, TEXT_ALPHABET),
      sizeBytes: integerBetween(random, 0, 1000),
      fileStatus: 'pinned',
      hostedUntil: 'not paid',
      pins: [],
      message: randomString(random, 1, 20, TEXT_ALPHABET)
    }),
    property: (state) => {
      assert.equal(render(state), render(state))
    }
  })
})

test('property: untrusted file text is HTML-escaped', () => {
  const hostile = '<script>alert(1)</script>'
  const escaped = '&lt;script&gt;alert(1)&lt;/script&gt;'

  forAll({
    seed: 5,
    runs: 50,
    generate: (random) => ({ sizeBytes: integerBetween(random, 0, 1000) }),
    property: ({ sizeBytes }) => {
      const html = render({
        status: 'found',
        cid: hostile,
        filename: hostile,
        sizeBytes,
        fileStatus: hostile,
        hostedUntil: hostile,
        pins: [{ provider: hostile, status: hostile }]
      })

      assert.ok(!html.includes('<script>'))
      assert.ok(!html.includes('</script>'))
      assert.ok(html.includes(escaped))
    }
  })
})
