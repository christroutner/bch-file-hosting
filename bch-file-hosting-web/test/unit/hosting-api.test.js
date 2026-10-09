/*
  Unit tests for the HostingApi adapter.

  The adapter is the network boundary for the web client, so the tests inject a
  fake fetch and fake FormData and assert on the request shape, the parsed
  response, and the error mapping. No network is touched.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const HostingApi = require('../../src/services/hosting-api')
const { HostingApiError } = HostingApi

// Minimal FormData stand-in that records appended fields.
class FakeFormData {
  constructor () {
    this.entries = []
  }

  append (name, value, filename) {
    this.entries.push({ name, value, filename })
  }
}

function jsonResponse (status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  }
}

test('uploads the file to POST /files and returns the parsed body', async () => {
  const calls = []
  const fakeFetch = async (url, options) => {
    calls.push({ url, options })
    return jsonResponse(200, { success: true, priceSats: 2000, paymentAddress: 'bitcoincash:qquote' })
  }
  const api = new HostingApi({
    config: { apiUrl: 'http://localhost:5050' },
    fetch: fakeFetch,
    FormData: FakeFormData
  })
  const file = { name: 'photo.jpg' }

  const body = await api.upload(file)

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://localhost:5050/files')
  assert.equal(calls[0].options.method, 'POST')
  assert.ok(calls[0].options.body instanceof FakeFormData)
  assert.deepEqual(calls[0].options.body.entries, [
    { name: 'file', value: file, filename: 'photo.jpg' }
  ])
  assert.equal(body.priceSats, 2000)
})

test('calls the fetch transport with the browser receiver, not the adapter', async () => {
  // A browser's native fetch rejects any receiver that is not the global
  // object, throwing before the request is sent. Simulate that contract so a
  // bare `this.fetch(...)` call is caught rather than masked.
  const calls = []
  function browserFetch (url, options) {
    if (this !== globalThis) {
      throw new TypeError("'fetch' called on an object that does not implement interface Window.")
    }
    calls.push({ url, options })
    return Promise.resolve(jsonResponse(200, { success: true, priceSats: 2000, paymentAddress: 'bitcoincash:qquote' }))
  }
  const api = new HostingApi({
    config: { apiUrl: 'http://localhost:5050' },
    fetch: browserFetch,
    FormData: FakeFormData
  })

  const body = await api.upload({ name: 'photo.jpg' })

  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, 'http://localhost:5050/files')
  assert.equal(body.priceSats, 2000)
})

test('throws HostingApiError carrying the server error message', async () => {
  const fakeFetch = async () => jsonResponse(413, { error: 'File is too large' })
  const api = new HostingApi({
    config: { apiUrl: 'http://localhost:5050' },
    fetch: fakeFetch,
    FormData: FakeFormData
  })

  await assert.rejects(
    () => api.upload({ name: 'huge.bin' }),
    (err) => {
      assert.ok(err instanceof HostingApiError)
      assert.equal(err.message, 'File is too large')
      return true
    }
  )
})

test('falls back to the HTTP status when the error body is unreadable', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 500,
    json: async () => {
      throw new Error('not json')
    }
  })
  const api = new HostingApi({
    config: { apiUrl: 'http://localhost:5050' },
    fetch: fakeFetch,
    FormData: FakeFormData
  })

  await assert.rejects(() => api.upload({ name: 'broken.bin' }), /HTTP 500/)
})

test('checks a payment at POST /files/check-payment and returns the parsed body', async () => {
  const calls = []
  const fakeFetch = async (url, options) => {
    calls.push({ url, options })
    return jsonResponse(200, { success: true, status: 'unpaid', receivedSats: 0, requiredSats: 2000 })
  }
  const api = new HostingApi({
    config: { apiUrl: 'http://localhost:5050' },
    fetch: fakeFetch,
    FormData: FakeFormData
  })

  const body = await api.checkPayment({ paymentAddress: 'bitcoincash:qinvoice' })

  assert.equal(calls[0].url, 'http://localhost:5050/files/check-payment')
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json')
  assert.equal(calls[0].options.body, JSON.stringify({ paymentAddress: 'bitcoincash:qinvoice' }))
  assert.equal(body.status, 'unpaid')
})

test('maps a check-payment rejection to HostingApiError', async () => {
  const fakeFetch = async () => jsonResponse(404, { error: 'Invoice not found' })
  const api = new HostingApi({
    config: { apiUrl: 'http://localhost:5050' },
    fetch: fakeFetch,
    FormData: FakeFormData
  })

  await assert.rejects(
    () => api.checkPayment({ paymentAddress: 'bitcoincash:qmissing' }),
    (err) => {
      assert.ok(err instanceof HostingApiError)
      assert.equal(err.message, 'Invoice not found')
      return true
    }
  )
})

test('gets a file status with the CID encoded as one path segment', async () => {
  const calls = []
  const fakeFetch = async (url, options) => {
    calls.push({ url, options })
    return jsonResponse(200, { success: true, cid: 'bafy', status: 'pinned' })
  }
  const api = new HostingApi({
    config: { apiUrl: 'http://localhost:5050' },
    fetch: fakeFetch,
    FormData: FakeFormData
  })

  const body = await api.getStatus({ cid: 'bafy/../admin' })

  assert.equal(calls[0].url, 'http://localhost:5050/files/bafy%2F..%2Fadmin')
  assert.equal(calls[0].options.method, 'GET')
  assert.equal(body.cid, 'bafy')
})

test('maps a status rejection to HostingApiError', async () => {
  const fakeFetch = async () => jsonResponse(404, { error: 'File not found' })
  const api = new HostingApi({
    config: { apiUrl: 'http://localhost:5050' },
    fetch: fakeFetch,
    FormData: FakeFormData
  })

  await assert.rejects(
    () => api.getStatus({ cid: 'bafymissing' }),
    (err) => {
      assert.ok(err instanceof HostingApiError)
      assert.equal(err.message, 'File not found')
      return true
    }
  )
})
