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
const GATEWAY = 'https://gateway.lighthouse.storage/ipfs/'
const KNOWN_STATUSES = ['pinned', 'pinning', 'failed']

const TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomToken (random, length) {
  let token = ''
  for (let i = 0; i < length; i++) token += TOKEN_CHARS[integerBetween(random, 0, TOKEN_CHARS.length - 1)]
  return token
}

function jsonResponse (body, status = 200) {
  return new Response(body === undefined ? '' : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('#lighthouse.property.js', () => {
  let sandbox
  let fetch

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetch = sandbox.stub()
  })

  afterEach(() => sandbox.restore())

  function build (overrides = {}) {
    return new LighthouseProvider({
      config: { lighthouseApiKey: 'k', lighthouseApiUrl: API, lighthouseGateway: GATEWAY, ...overrides },
      fetch
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
  })

  describe('#pin CID consistency', () => {
    it('should resolve with the expected CID and reject on a reported mismatch', () => {
      forAllAsync({
        seed: 2,
        runs: 200,
        generate: (random) => ({
          expected: randomToken(random, 46),
          mismatched: `x${randomToken(random, 46)}`,
          reportMatch: random() < 0.5
        }),
        property: async ({ expected, mismatched, reportMatch }) => {
          fetch.reset()
          fetch.resolves(jsonResponse({ data: { cid: reportMatch ? expected : mismatched } }))

          if (reportMatch) {
            const result = await build().pin({ cid: expected, filename: 'f' })
            assert.deepEqual(result, { providerCid: expected, providerRef: null })
            return
          }

          let threw = false
          try {
            await build().pin({ cid: expected, filename: 'f' })
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
    it('should reject with the HTTP status for every non-2xx code', () => {
      forAllAsync({
        seed: 3,
        runs: 100,
        generate: (random) => ({ status: integerBetween(random, 300, 599), cid: randomToken(random, 46) }),
        property: async ({ status, cid }) => {
          fetch.reset()
          fetch.resolves(jsonResponse({ error: 'nope' }, status))

          let threw = false
          try {
            await build().pin({ cid, filename: 'f' })
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
