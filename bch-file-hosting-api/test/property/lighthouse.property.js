/*
  Property tests for the Lighthouse pinning provider.

  These cover the parsing/formatting boundaries with a wider input range than the
  example-based unit tests: gateway URL building, CID-consistency enforcement,
  HTTP error reporting, and status mapping. The HTTP client is injected, so the
  suite never touches the network.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'
import sinon from 'sinon'

import LighthouseProvider from '../../src/adapters/pinning/lighthouse.js'
import { forAll, forAllAsync, integerBetween } from './lib/harness.js'

const API = 'https://api.lighthouse.storage'
const UPLOAD = 'https://upload.lighthouse.storage'
const GATEWAY = 'https://gateway.lighthouse.storage/ipfs/'
const SIZE = 1024
const KNOWN_STATUSES = ['pinned', 'pinning', 'failed']

const TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
const FILENAME_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_#?%&'

function randomToken (random, length) {
  let token = ''
  for (let i = 0; i < length; i++) token += TOKEN_CHARS[integerBetween(random, 0, TOKEN_CHARS.length - 1)]
  return token
}

function randomFilename (random) {
  let name = ''
  const length = integerBetween(random, 1, 20)
  for (let i = 0; i < length; i++) name += FILENAME_CHARS[integerBetween(random, 0, FILENAME_CHARS.length - 1)]
  return name
}

function jsonResponse (body, status = 200) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function addResponse (cid) {
  return new Response(`{"Name":"f","Hash":"bafyfile"}\n{"Name":"","Hash":"${cid}"}\n`, { status: 200 })
}

function headResponse (status = 200, length = SIZE) {
  return new Response(null, { status, headers: length === undefined ? {} : { 'content-length': String(length) } })
}

function content () {
  return new Blob([new Uint8Array(SIZE)])
}

describe('#lighthouse.property.js', () => {
  let sandbox
  let fetch
  let sleep

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetch = sandbox.stub()
    sleep = sandbox.stub().resolves()
  })

  afterEach(() => sandbox.restore())

  function build (overrides = {}) {
    return new LighthouseProvider({
      config: {
        lighthouseApiKey: 'k',
        lighthouseApiUrl: API,
        lighthouseUploadUrl: UPLOAD,
        lighthouseGateway: GATEWAY,
        lighthouseVerifyAttempts: 1,
        lighthouseVerifyDelayMs: 0,
        ...overrides
      },
      fetch,
      sleep
    })
  }

  describe('#gatewayUrl', () => {
    it('should place exactly one slash between the gateway and the CID', () => {
      forAll({
        seed: 1,
        runs: 200,
        generate: (random) => ({
          cid: randomToken(random, 46),
          base: `https://gateway.example/ipfs${random() < 0.5 ? '' : '/'}`
        }),
        property: ({ cid, base }) => {
          assert.equal(build({ lighthouseGateway: base }).gatewayUrl(cid), `https://gateway.example/ipfs/${cid}`)
        }
      })
    })

    it('should append the URL-encoded file name and fall back to the bare CID without one', () => {
      forAll({
        seed: 5,
        runs: 200,
        generate: (random) => ({
          cid: randomToken(random, 46),
          filename: randomFilename(random)
        }),
        property: ({ cid, filename }) => {
          assert.equal(
            build().gatewayUrl(cid, filename),
            `${GATEWAY}${cid}/${encodeURIComponent(filename)}`
          )
          for (const missing of [undefined, '', null]) {
            assert.equal(build().gatewayUrl(cid, missing), `${GATEWAY}${cid}`)
          }
        }
      })
    })
  })

  describe('#pin CID consistency', () => {
    it('should resolve with the expected CID and reject on a reported mismatch', () => {
      forAllAsync({
        seed: 2,
        runs: 200,
        generate: (random) => ({
          expected: `bafy${randomToken(random, 42)}`,
          mismatched: `bafy${randomToken(random, 42)}`,
          reportMatch: random() < 0.5
        }),
        property: async ({ expected, mismatched, reportMatch }) => {
          fetch.reset()
          fetch.onFirstCall().resolves(addResponse(reportMatch ? expected : mismatched))
          fetch.onSecondCall().resolves(headResponse(200, SIZE))

          if (reportMatch) {
            const result = await build().pin({ cid: expected, filename: 'f', sizeBytes: SIZE, content: content() })
            assert.deepEqual(result, { providerCid: expected, providerRef: null })
            return
          }

          let threw = false
          try {
            await build().pin({ cid: expected, filename: 'f', sizeBytes: SIZE, content: content() })
          } catch (err) {
            threw = true
            assert.include(err.message, expected)
            assert.include(err.message, mismatched)
          }
          assert.isTrue(threw)
        }
      })
    })
  })

  describe('#pin HTTP errors', () => {
    it('should reject with the HTTP status for every non-2xx upload code', () => {
      forAllAsync({
        seed: 3,
        runs: 100,
        generate: (random) => ({ status: integerBetween(random, 300, 599), cid: randomToken(random, 46) }),
        property: async ({ status, cid }) => {
          fetch.reset()
          fetch.resolves(jsonResponse({ error: 'nope' }, status))

          let threw = false
          try {
            await build().pin({ cid, filename: 'f', sizeBytes: SIZE, content: content() })
          } catch (err) {
            threw = true
            assert.include(err.message, String(status))
          }
          assert.isTrue(threw)
        }
      })
    })
  })

  describe('#status mapping', () => {
    it('should echo a known status and report every other status as unknown', () => {
      forAllAsync({
        seed: 4,
        runs: 200,
        generate: (random) => {
          const known = random() < 0.5
          return {
            cid: randomToken(random, 46),
            known,
            status: known
              ? KNOWN_STATUSES[integerBetween(random, 0, KNOWN_STATUSES.length - 1)]
              : `s${randomToken(random, 6)}`
          }
        },
        property: async ({ cid, known, status }) => {
          fetch.reset()
          fetch.resolves(jsonResponse({ fileList: [{ cid, id: 'file-1', status }] }))

          assert.equal(await build().status(cid), known ? status : 'unknown')
        }
      })
    })
  })
})
