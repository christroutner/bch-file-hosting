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
const URL_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

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

test('property: a paid upload renders the CID, download, gateways, and transaction', () => {
  forAll({
    seed: 7,
    runs: 150,
    generate: (random) => {
      const gatewayCount = integerBetween(random, 0, 3)
      const gatewayUrls = []
      for (let i = 0; i < gatewayCount; i++) {
        gatewayUrls.push(`https://gw${i}.test/ipfs/${randomString(random, 5, 30, URL_ALPHABET)}`)
      }
      return {
        cid: `bafy${randomString(random, 10, 40, URL_ALPHABET)}`,
        downloadUrl: `http://localhost:5050/download/${randomString(random, 5, 30, URL_ALPHABET)}`,
        gatewayUrls,
        txid: randomString(random, 1, 64, URL_ALPHABET)
      }
    },
    property: ({ cid, downloadUrl, gatewayUrls, txid }) => {
      const html = render({ status: 'paid', filename: 'photo.jpg', cid, downloadUrl, gatewayUrls, txid })

      assert.ok(html.includes(`CID: ${cid}`))
      assert.ok(html.includes(`href="${downloadUrl}"`))
      assert.ok(html.includes(`Payment: ${txid}`))
      for (const url of gatewayUrls) assert.ok(html.includes(url))
    }
  })
})

test('property: expired and pending states render their message and class', () => {
  forAll({
    seed: 8,
    runs: 150,
    generate: (random) => ({
      status: random() < 0.5 ? 'expired' : 'pending',
      message: randomString(random, 1, 40, TEXT_ALPHABET)
    }),
    property: ({ status, message }) => {
      const html = render({ status, message })

      assert.ok(html.includes(message))
      assert.ok(html.includes(`file-upload-${status}`))
    }
  })
})

test('property: a quote with a countdown shows the countdown and a QR code', () => {
  forAll({
    seed: 9,
    runs: 150,
    generate: (random) => ({ countdown: randomString(random, 1, 20, TEXT_ALPHABET) }),
    property: ({ countdown }) => {
      const html = render({ status: 'quote', filename: 'photo.jpg', priceSats: 1, paymentAddress: 'addr', countdown })

      assert.ok(html.includes(`Quote expires in ${countdown}`))
      assert.ok(html.includes('file-upload-countdown'))
      assert.ok(html.includes('file-upload-qr'))
    }
  })
})

test('property: a quote shows a size line only when a size is reported and a billed line only when billing rounded it up', () => {
  forAll({
    seed: 10,
    runs: 300,
    generate: (random) => {
      const sizeBytes = random() < 0.8 ? integerBetween(random, 0, 100000000) : undefined
      let billedBytes
      if (random() < 0.2) billedBytes = undefined
      else if (sizeBytes !== undefined && random() < 0.5) billedBytes = sizeBytes
      else billedBytes = integerBetween(random, 0, 100000000)
      return { sizeBytes, billedBytes }
    },
    property: ({ sizeBytes, billedBytes }) => {
      const html = render({ status: 'quote', filename: 'f.bin', priceSats: 1, paymentAddress: 'addr', sizeBytes, billedBytes })

      const showsSize = sizeBytes !== undefined
      const showsBilled = billedBytes !== undefined && billedBytes !== sizeBytes

      assert.equal(html.includes('file-upload-size'), showsSize)
      assert.equal(html.includes('file-upload-billed-size'), showsBilled)
      if (showsSize) assert.ok(html.includes(`Size: ${sizeBytes} bytes`))
      if (showsBilled) assert.ok(html.includes(`Billed size: ${billedBytes} bytes`))
    }
  })
})

test('property: gateway links open in a new tab exactly for image file names', () => {
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']
  const otherExtensions = ['txt', 'tar', 'bin', 'pdf', 'jpg.txt', 'png.js', 'jpeg.html']

  forAll({
    seed: 11,
    runs: 300,
    generate: (random) => {
      const image = random() < 0.5
      const extension = image
        ? imageExtensions[integerBetween(random, 0, imageExtensions.length - 1)]
        : otherExtensions[integerBetween(random, 0, otherExtensions.length - 1)]
      const filename = `${randomString(random, 1, 12, TEXT_ALPHABET)}.${extension}`
      const gatewayCount = integerBetween(random, 1, 3)
      const gatewayUrls = []
      for (let i = 0; i < gatewayCount; i++) {
        gatewayUrls.push(`https://gw${i}.test/ipfs/bafy/${encodeURIComponent(filename)}`)
      }
      return { filename, gatewayUrls, image }
    },
    property: ({ filename, gatewayUrls, image }) => {
      const html = render({
        status: 'paid',
        filename,
        cid: 'bafy',
        downloadUrl: 'http://localhost:5050/download/bafy',
        gatewayUrls,
        txid: 'tx'
      })

      const blankTargets = (html.match(/target="_blank"/g) || []).length
      assert.equal(blankTargets, image ? gatewayUrls.length : 0)
    }
  })
})
