/*
  Property tests for the file-hosting upload result view
  (src/components/app-body/file-hosting/upload-quote-view.js).

  Invariants: the view renders the file name when present; a quote shows the
  price and payment address; an already-hosted upload shows the download URL as
  both text and an anchor href; no-file and error states show their message; any
  unknown status renders the empty container without throwing; rendering is
  deterministic and idempotent; and untrusted text is HTML-escaped rather than
  injected as markup.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')

const UploadQuoteView = require('../../src/components/app-body/file-hosting/upload-quote-view')
const { forAll, integerBetween, randomString } = require('./lib/harness')

const TEXT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_'

function render (state) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(UploadQuoteView, { state }))
}

test('property: a quote renders the price, address, and file name', () => {
  forAll({
    seed: 1,
    runs: 300,
    generate: (random) => ({
      filename: `f${randomString(random, 0, 12, TEXT_ALPHABET)}`,
      priceSats: integerBetween(random, 0, 100000000),
      paymentAddress: `bitcoincash:q${randomString(random, 5, 40, TEXT_ALPHABET)}`
    }),
    property: ({ filename, priceSats, paymentAddress }) => {
      const html = render({ status: 'quote', filename, priceSats, paymentAddress })

      assert.ok(html.includes(`${priceSats} satoshis`))
      assert.ok(html.includes(paymentAddress))
      assert.ok(html.includes(`>${filename}<`))
      assert.ok(html.includes('file-upload-result'))
    }
  })
})

test('property: an already-hosted upload renders the download URL as text and href', () => {
  forAll({
    seed: 2,
    runs: 300,
    generate: (random) => ({
      downloadUrl: `http://localhost:5050/download/${randomString(random, 5, 40, TEXT_ALPHABET)}`
    }),
    property: ({ downloadUrl }) => {
      const html = render({ status: 'hosted', downloadUrl })

      assert.ok(html.includes(downloadUrl))
      assert.ok(html.includes(`href="${downloadUrl}"`))
    }
  })
})

test('property: no-file and error states render their message', () => {
  forAll({
    seed: 3,
    runs: 200,
    generate: (random) => ({
      status: random() < 0.5 ? 'no-file' : 'error',
      message: randomString(random, 1, 40, TEXT_ALPHABET)
    }),
    property: ({ status, message }) => {
      const html = render({ status, message })

      assert.ok(html.includes(message))
      assert.ok(html.includes(`file-upload-${status === 'no-file' ? 'prompt' : 'error'}`))
    }
  })
})

test('property: rendering is deterministic and idempotent', () => {
  forAll({
    seed: 4,
    runs: 200,
    generate: (random) => ({
      status: random() < 0.5 ? 'idle' : 'unknown-status',
      payload: randomString(random, 0, 20, TEXT_ALPHABET)
    }),
    property: ({ status, payload }) => {
      const state = { status, filename: payload }

      const first = render(state)
      const second = render(state)

      assert.equal(first, second)
      assert.ok(first.includes('file-upload-result'))
    }
  })
})

test('property: unknown or missing status renders an empty container', () => {
  const unknownStatuses = ['idle', 'unknown-status', 'loading', 'quote ', '', 'QUOTE']

  forAll({
    seed: 5,
    runs: 100,
    generate: (random) => unknownStatuses[integerBetween(random, 0, unknownStatuses.length - 1)],
    property: (status) => {
      const html = render({ status })

      assert.ok(html.includes('file-upload-result'))
      assert.ok(!html.includes('satoshis'))
      assert.ok(!html.includes('file-upload-download'))
    }
  })
})

test('property: untrusted file names and messages are HTML-escaped', () => {
  const hostile = '<script>alert(1)</script>'
  const escaped = '&lt;script&gt;alert(1)&lt;/script&gt;'

  forAll({
    seed: 6,
    runs: 50,
    generate: (random) => ({
      status: random() < 0.5 ? 'quote' : 'error',
      priceSats: integerBetween(random, 0, 1000)
    }),
    property: ({ status, priceSats }) => {
      const html = render({
        status,
        filename: hostile,
        priceSats,
        paymentAddress: hostile,
        message: hostile
      })

      assert.ok(!html.includes('<script>'))
      assert.ok(!html.includes('</script>'))
      assert.ok(html.includes(escaped))
    }
  })
})
