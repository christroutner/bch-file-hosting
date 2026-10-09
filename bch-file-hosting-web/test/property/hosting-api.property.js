/*
  Property tests for the bch-file-hosting web API adapter
  (src/services/hosting-api.js).

  Invariants: an upload always POSTs the named file to the configured
  `<apiUrl>/files` endpoint as a FormData body and resolves to the parsed
  response body; every non-ok response becomes a HostingApiError whose message
  is the server error string when present, and otherwise falls back to the HTTP
  status. The adapter never throws a non-HostingApiError for an HTTP failure.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const HostingApi = require('../../src/services/hosting-api')
const { HostingApiError } = HostingApi
const { forAllAsync, integerBetween, randomString } = require('./lib/harness')

const URL_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const NAME_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_'

// Minimal FormData stand-in that records appended fields.
class RecordingFormData {
  constructor () {
    this.entries = []
  }

  append (name, value, filename) {
    this.entries.push({ name, value, filename })
  }
}

function randomApiUrl (random) {
  return `http://api${randomString(random, 1, 12, URL_ALPHABET)}.test`
}

function randomFilename (random) {
  return `${randomString(random, 1, 20, NAME_ALPHABET)}.bin`
}

function makeApi ({ apiUrl, fetch, FormData = RecordingFormData }) {
  return new HostingApi({ config: { apiUrl }, fetch, FormData })
}

async function capture (promise) {
  try {
    return { result: await promise, error: null }
  } catch (err) {
    return { result: null, error: err }
  }
}

test('property: upload POSTs the named file to the configured /files URL', async () => {
  await forAllAsync({
    seed: 1,
    runs: 200,
    generate: (random) => ({
      apiUrl: randomApiUrl(random),
      filename: randomFilename(random),
      body: { success: true, priceSats: integerBetween(random, 1, 1000000) }
    }),
    property: async ({ apiUrl, filename, body }) => {
      const calls = []
      const fetch = async (url, options) => {
        calls.push({ url, options })
        return { ok: true, status: 200, json: async () => body }
      }
      const api = makeApi({ apiUrl, fetch })
      const file = { name: filename }

      const result = await api.upload(file)

      assert.equal(calls.length, 1)
      assert.equal(calls[0].url, `${apiUrl}/files`)
      assert.equal(calls[0].options.method, 'POST')
      assert.ok(calls[0].options.body instanceof RecordingFormData)
      assert.deepEqual(calls[0].options.body.entries, [
        { name: 'file', value: file, filename }
      ])
      assert.deepEqual(result, body)
    }
  })
})

test('property: a successful response resolves to the exact parsed body', async () => {
  await forAllAsync({
    seed: 2,
    runs: 200,
    generate: (random) => ({
      status: integerBetween(random, 200, 299),
      body: {
        success: true,
        cid: `bafy${randomString(random, 10, 40, URL_ALPHABET)}`,
        priceSats: integerBetween(random, 1, 100000000),
        paymentAddress: `bitcoincash:q${randomString(random, 10, 40, URL_ALPHABET)}`
      }
    }),
    property: async ({ status, body }) => {
      const api = makeApi({
        apiUrl: 'http://localhost:5050',
        fetch: async () => ({ ok: true, status, json: async () => body })
      })

      const result = await api.upload({ name: 'file.bin' })

      assert.deepEqual(result, body)
    }
  })
})

test('property: a non-ok response rejects with the server error string', async () => {
  await forAllAsync({
    seed: 3,
    runs: 200,
    generate: (random) => ({
      status: integerBetween(random, 400, 599),
      error: randomString(random, 1, 60, NAME_ALPHABET)
    }),
    property: async ({ status, error }) => {
      const api = makeApi({
        apiUrl: 'http://localhost:5050',
        fetch: async () => ({ ok: false, status, json: async () => ({ success: false, error }) })
      })

      const { error: thrown } = await capture(api.upload({ name: 'file.bin' }))

      assert.ok(thrown instanceof HostingApiError)
      assert.equal(thrown.message, error)
    }
  })
})

test('property: a non-ok response with no usable error body falls back to the HTTP status', async () => {
  const unusableBodies = [null, {}, { error: '' }, { error: 0 }, { error: 42 }, { error: false }]

  await forAllAsync({
    seed: 4,
    runs: 200,
    generate: (random) => ({
      status: integerBetween(random, 400, 599),
      body: unusableBodies[integerBetween(random, 0, unusableBodies.length - 1)]
    }),
    property: async ({ status, body }) => {
      const api = makeApi({
        apiUrl: 'http://localhost:5050',
        fetch: async () => ({ ok: false, status, json: async () => body })
      })

      const { error: thrown } = await capture(api.upload({ name: 'file.bin' }))

      assert.ok(thrown instanceof HostingApiError)
      assert.ok(thrown.message.includes(`HTTP ${status}`))
    }
  })
})

test('property: an unreadable error body still rejects with a HostingApiError', async () => {
  await forAllAsync({
    seed: 5,
    runs: 100,
    generate: (random) => ({ status: integerBetween(random, 400, 599) }),
    property: async ({ status }) => {
      const api = makeApi({
        apiUrl: 'http://localhost:5050',
        fetch: async () => ({
          ok: false,
          status,
          json: async () => { throw new Error('not json') }
        })
      })

      const { error: thrown } = await capture(api.upload({ name: 'file.bin' }))

      assert.ok(thrown instanceof HostingApiError)
      assert.ok(thrown.message.includes(`HTTP ${status}`))
    }
  })
})

test('property: checkPayment POSTs the address as JSON to /files/check-payment', async () => {
  await forAllAsync({
    seed: 6,
    runs: 300,
    generate: (random) => ({
      apiUrl: randomApiUrl(random),
      paymentAddress: `bitcoincash:q${randomString(random, 10, 40, URL_ALPHABET)}`,
      body: { success: true, status: 'unpaid', receivedSats: 0, requiredSats: integerBetween(random, 1, 100000) }
    }),
    property: async ({ apiUrl, paymentAddress, body }) => {
      const calls = []
      const fetch = async (url, options) => {
        calls.push({ url, options })
        return { ok: true, status: 200, json: async () => body }
      }
      const api = makeApi({ apiUrl, fetch })

      const result = await api.checkPayment({ paymentAddress })

      assert.equal(calls.length, 1)
      assert.equal(calls[0].url, `${apiUrl}/files/check-payment`)
      assert.equal(calls[0].options.method, 'POST')
      assert.equal(calls[0].options.headers['Content-Type'], 'application/json')
      assert.equal(calls[0].options.body, JSON.stringify({ paymentAddress }))
      assert.deepEqual(result, body)
    }
  })
})

test('property: a non-ok check response rejects with the server error string', async () => {
  await forAllAsync({
    seed: 7,
    runs: 200,
    generate: (random) => ({
      status: integerBetween(random, 400, 599),
      error: randomString(random, 1, 60, NAME_ALPHABET)
    }),
    property: async ({ status, error }) => {
      const api = makeApi({
        apiUrl: 'http://localhost:5050',
        fetch: async () => ({ ok: false, status, json: async () => ({ success: false, error }) })
      })

      const { error: thrown } = await capture(api.checkPayment({ paymentAddress: 'bitcoincash:qcheck' }))

      assert.ok(thrown instanceof HostingApiError)
      assert.equal(thrown.message, error)
    }
  })
})

test('property: a non-ok check response without a usable error falls back to the HTTP status', async () => {
  const unusableBodies = [null, {}, { error: '' }, { error: 0 }, { error: false }]

  await forAllAsync({
    seed: 8,
    runs: 200,
    generate: (random) => ({
      status: integerBetween(random, 400, 599),
      body: unusableBodies[integerBetween(random, 0, unusableBodies.length - 1)]
    }),
    property: async ({ status, body }) => {
      const api = makeApi({
        apiUrl: 'http://localhost:5050',
        fetch: async () => ({ ok: false, status, json: async () => body })
      })

      const { error: thrown } = await capture(api.checkPayment({ paymentAddress: 'bitcoincash:qcheck' }))

      assert.ok(thrown instanceof HostingApiError)
      assert.ok(thrown.message.includes(`HTTP ${status}`))
    }
  })
})

// Characters that could escape or reshape the /files/:cid path if left
// unencoded, plus a space and a dot for traversal-shaped values.
const RAW_CID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789/?#%. '

test('property: getStatus GETs /files/<encoded cid> as a single path segment', async () => {
  await forAllAsync({
    seed: 9,
    runs: 300,
    generate: (random) => ({
      apiUrl: randomApiUrl(random),
      cid: randomString(random, 1, 30, RAW_CID_ALPHABET),
      body: { success: true, cid: 'bafy', status: 'pinned', pins: [] }
    }),
    property: async ({ apiUrl, cid, body }) => {
      const calls = []
      const fetch = async (url, options) => {
        calls.push({ url, options })
        return { ok: true, status: 200, json: async () => body }
      }
      const api = makeApi({ apiUrl, fetch })

      const result = await api.getStatus({ cid })

      const prefix = `${apiUrl}/files/`
      const segment = calls[0].url.slice(prefix.length)
      assert.equal(calls.length, 1)
      assert.ok(calls[0].url.startsWith(prefix))
      assert.equal(segment, encodeURIComponent(cid))
      assert.ok(!segment.includes('/'))
      assert.ok(!segment.includes('?'))
      assert.ok(!segment.includes('#'))
      assert.equal(calls[0].options.method, 'GET')
      assert.deepEqual(result, body)
    }
  })
})

test('property: a non-ok getStatus response rejects with the server error string', async () => {
  await forAllAsync({
    seed: 10,
    runs: 200,
    generate: (random) => ({
      status: integerBetween(random, 400, 599),
      error: randomString(random, 1, 60, NAME_ALPHABET)
    }),
    property: async ({ status, error }) => {
      const api = makeApi({
        apiUrl: 'http://localhost:5050',
        fetch: async () => ({ ok: false, status, json: async () => ({ success: false, error }) })
      })

      const { error: thrown } = await capture(api.getStatus({ cid: 'bafy' }))

      assert.ok(thrown instanceof HostingApiError)
      assert.equal(thrown.message, error)
    }
  })
})

test('property: a non-ok getStatus response without a usable error falls back to the HTTP status', async () => {
  const unusableBodies = [null, {}, { error: '' }, { error: 0 }, { error: false }]

  await forAllAsync({
    seed: 11,
    runs: 200,
    generate: (random) => ({
      status: integerBetween(random, 400, 599),
      body: unusableBodies[integerBetween(random, 0, unusableBodies.length - 1)]
    }),
    property: async ({ status, body }) => {
      const api = makeApi({
        apiUrl: 'http://localhost:5050',
        fetch: async () => ({ ok: false, status, json: async () => body })
      })

      const { error: thrown } = await capture(api.getStatus({ cid: 'bafy' }))

      assert.ok(thrown instanceof HostingApiError)
      assert.ok(thrown.message.includes(`HTTP ${status}`))
    }
  })
})
