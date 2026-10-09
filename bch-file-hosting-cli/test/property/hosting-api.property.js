/*
  Property tests for the bch-file-hosting REST API adapter
  (src/lib/hosting-api.js).

  Invariants: an upload round-trips the filename and bytes into the multipart
  body and returns the parsed response body; every non-ok response becomes a
  HostingApiError carrying the API error string; and a body without a usable
  error string falls back to the HTTP status.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import HostingApi, { HostingApiError } from '../../src/lib/hosting-api.js'
import { forAllAsync, integerBetween, randomString as generateString } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_'
const CID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

// Draw general text (filenames, byte payloads, errors) from this file's
// alphabet, or a CID-shaped value from the base32-friendly alphabet.
function randomString (random, min, max) {
  return generateString(random, min, max, ALPHABET)
}

function randomCid (random) {
  return `bafy${generateString(random, 12, 40, CID_ALPHABET)}`
}

function randomFilename (random) {
  return `${randomString(random, 1, 20)}.${randomString(random, 1, 4)}`
}

async function uploadWith (fetch, { filename = 'file.bin', buffer = Buffer.from('') } = {}) {
  const uut = new HostingApi({ config, fetch })
  try {
    return { result: await uut.upload({ filename, buffer }), error: null }
  } catch (err) {
    return { result: null, error: err }
  }
}

async function checkWith (fetch, paymentAddress) {
  const uut = new HostingApi({ config, fetch })
  try {
    return { result: await uut.checkPayment({ paymentAddress }), error: null }
  } catch (err) {
    return { result: null, error: err }
  }
}

async function statusWith (fetch, cid) {
  const uut = new HostingApi({ config, fetch })
  try {
    return { result: await uut.getStatus({ cid }), error: null }
  } catch (err) {
    return { result: null, error: err }
  }
}

describe('#hosting-api.property.js', () => {
  it('should round-trip the filename and bytes and return the parsed body', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: (random) => ({
        filename: randomFilename(random),
        bytes: randomString(random, 0, 64)
      }),
      property: async ({ filename, bytes }) => {
        let captured
        const fetch = async (url, options) => {
          captured = { url, options }
          return { ok: true, status: 200, json: async () => ({ success: true, cid: 'bafy-test', name: filename }) }
        }

        const { result, error } = await uploadWith(fetch, { filename, buffer: Buffer.from(bytes) })

        assert.isNull(error)
        assert.equal(result.name, filename)
        assert.equal(captured.url, `${config.apiUrl}/files`)
        assert.equal(captured.options.method, 'POST')

        const uploaded = captured.options.body.get('file')
        assert.equal(uploaded.name, filename)
        assert.equal(await uploaded.text(), bytes)
      }
    })
  })

  it('should surface the API error string for any non-ok response', () => {
    forAllAsync({
      seed: 2,
      runs: 200,
      generate: (random) => ({
        status: integerBetween(random, 400, 599),
        error: randomString(random, 1, 40)
      }),
      property: async ({ status, error }) => {
        const fetch = async () => ({ ok: false, status, json: async () => ({ success: false, error }) })

        const { error: thrown } = await uploadWith(fetch)

        assert.instanceOf(thrown, HostingApiError)
        assert.equal(thrown.message, error)
      }
    })
  })

  it('should fall back to the HTTP status when the error body has no usable message', () => {
    forAllAsync({
      seed: 3,
      runs: 200,
      generate: (random) => ({
        status: integerBetween(random, 400, 599),
        body: random() < 0.5 ? null : { success: false, error: '' }
      }),
      property: async ({ status, body }) => {
        const fetch = async () => ({ ok: false, status, json: async () => body })

        const { error: thrown } = await uploadWith(fetch)

        assert.instanceOf(thrown, HostingApiError)
        assert.include(thrown.message, `HTTP ${status}`)
      }
    })
  })

  it('should round-trip the payment address and return the parsed body', () => {
    forAllAsync({
      seed: 4,
      runs: 200,
      generate: (random) => `bitcoincash:q${randomString(random, 20, 38)}`,
      property: async (paymentAddress) => {
        let captured
        const fetch = async (url, options) => {
          captured = { url, options }
          return { ok: true, status: 200, json: async () => ({ success: true, status: 'paid', cid: 'bafy-paid' }) }
        }

        const { result, error } = await checkWith(fetch, paymentAddress)

        assert.isNull(error)
        assert.equal(result.cid, 'bafy-paid')
        assert.equal(captured.url, `${config.apiUrl}/files/check-payment`)
        assert.equal(captured.options.method, 'POST')
        assert.equal(captured.options.headers['Content-Type'], 'application/json')
        assert.deepEqual(JSON.parse(captured.options.body), { paymentAddress })
      }
    })
  })

  it('should surface the API error string for any non-ok check response', () => {
    forAllAsync({
      seed: 5,
      runs: 200,
      generate: (random) => ({
        status: integerBetween(random, 400, 599),
        error: randomString(random, 1, 40)
      }),
      property: async ({ status, error }) => {
        const fetch = async () => ({ ok: false, status, json: async () => ({ success: false, error }) })

        const { error: thrown } = await checkWith(fetch, 'bitcoincash:qcheck')

        assert.instanceOf(thrown, HostingApiError)
        assert.equal(thrown.message, error)
      }
    })
  })

  it('should GET the CID path and return the parsed body', () => {
    forAllAsync({
      seed: 6,
      runs: 200,
      generate: randomCid,
      property: async (cid) => {
        let captured
        const fetch = async (url, options) => {
          captured = { url, options }
          return { ok: true, status: 200, json: async () => ({ success: true, cid, status: 'pinned' }) }
        }

        const { result, error } = await statusWith(fetch, cid)

        assert.isNull(error)
        assert.equal(result.cid, cid)
        assert.equal(captured.url, `${config.apiUrl}/files/${cid}`)
        assert.equal(captured.options.method, 'GET')
      }
    })
  })

  it('should surface the API error string for any non-ok status response', () => {
    forAllAsync({
      seed: 7,
      runs: 200,
      generate: (random) => ({
        status: integerBetween(random, 400, 599),
        error: randomString(random, 1, 40)
      }),
      property: async ({ status, error }) => {
        const fetch = async () => ({ ok: false, status, json: async () => ({ success: false, error }) })

        const { error: thrown } = await statusWith(fetch, 'bafy-known')

        assert.instanceOf(thrown, HostingApiError)
        assert.equal(thrown.message, error)
      }
    })
  })

  it('should fall back to the HTTP status when the status error body has no usable message', () => {
    forAllAsync({
      seed: 8,
      runs: 200,
      generate: (random) => ({
        status: integerBetween(random, 400, 599),
        body: random() < 0.5 ? null : { success: false, error: '' }
      }),
      property: async ({ status, body }) => {
        const fetch = async () => ({ ok: false, status, json: async () => body })

        const { error: thrown } = await statusWith(fetch, 'bafy-known')

        assert.instanceOf(thrown, HostingApiError)
        assert.include(thrown.message, `HTTP ${status}`)
      }
    })
  })
})
