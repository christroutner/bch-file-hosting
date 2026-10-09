/*
  Property tests for the file status page service
  (src/services/file-status-page.js).

  Invariants: a blank (or whitespace-only, null, or undefined) CID prompts and
  never calls the API; a found file maps to its details with the hosting window
  falling back to "not paid" and its pins projected to provider/status; the CID
  is trimmed before the lookup; and any API failure maps to the error state
  carrying the failure message or the generic one.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const FileStatusPage = require('../../src/services/file-status-page')
const { NO_CID_MESSAGE } = FileStatusPage
const { forAllAsync, integerBetween, randomString } = require('./lib/harness')

const CID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const TEXT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_'

function randomCid (random) {
  return `bafy${randomString(random, 10, 40, CID_ALPHABET)}`
}

function pageReturning (result) {
  const calls = []
  const page = new FileStatusPage({
    hostingApi: {
      getStatus: async (args) => {
        calls.push(args)
        return result
      }
    }
  })
  page.calls = calls
  return page
}

test('property: a blank CID prompts and never calls the API', async () => {
  await forAllAsync({
    seed: 1,
    runs: 200,
    generate: (random) => {
      const choice = integerBetween(random, 0, 2)
      if (choice === 0) return null
      if (choice === 1) return undefined
      return randomString(random, 0, 8, ' \t\n')
    },
    property: async (cid) => {
      const page = pageReturning({ cid: 'bafy' })

      const state = await page.lookup(cid)

      assert.deepEqual(state, { status: 'no-cid', message: NO_CID_MESSAGE })
      assert.equal(page.calls.length, 0)
      assert.equal(page.getViewModel(), state)
    }
  })
})

test('property: a found file maps to its details, hosting window, and pins', async () => {
  await forAllAsync({
    seed: 2,
    runs: 300,
    generate: (random) => {
      const pinCount = integerBetween(random, 0, 4)
      const pins = []
      for (let i = 0; i < pinCount; i++) {
        pins.push({
          provider: randomString(random, 1, 12, TEXT_ALPHABET),
          status: randomString(random, 1, 10, TEXT_ALPHABET),
          providerRef: 'ignored',
          error: null
        })
      }
      return {
        cid: randomCid(random),
        filename: `${randomString(random, 1, 20, TEXT_ALPHABET)}.bin`,
        sizeBytes: integerBetween(random, 0, 100000000),
        status: randomString(random, 1, 10, TEXT_ALPHABET),
        hostedUntil: random() < 0.5 ? new Date(integerBetween(random, 0, 4000000000000)).toISOString() : null,
        pins
      }
    },
    property: async (file) => {
      const page = pageReturning(file)

      const state = await page.lookup(file.cid)

      assert.equal(state.status, 'found')
      assert.equal(state.cid, file.cid)
      assert.equal(state.filename, file.filename)
      assert.equal(state.sizeBytes, file.sizeBytes)
      assert.equal(state.fileStatus, file.status)
      assert.equal(state.hostedUntil, file.hostedUntil || 'not paid')
      assert.deepEqual(state.pins, file.pins.map((pin) => ({ provider: pin.provider, status: pin.status })))
      assert.deepEqual(page.calls, [{ cid: file.cid }])
    }
  })
})

test('property: the CID is trimmed before the lookup', async () => {
  await forAllAsync({
    seed: 3,
    runs: 200,
    generate: (random) => ({
      cid: randomCid(random),
      pad: randomString(random, 1, 6, ' \t')
    }),
    property: async ({ cid, pad }) => {
      const page = pageReturning({ cid, filename: 'f.bin', sizeBytes: 1, status: 'staged', pins: [] })

      await page.lookup(`${pad}${cid}${pad}`)

      assert.deepEqual(page.calls, [{ cid }])
    }
  })
})

test('property: an API failure maps to the error state with the failure message', async () => {
  await forAllAsync({
    seed: 4,
    runs: 200,
    generate: (random) => ({ message: random() < 0.75 ? randomString(random, 1, 60, TEXT_ALPHABET) : '' }),
    property: async ({ message }) => {
      const page = new FileStatusPage({
        hostingApi: {
          getStatus: async () => { throw new Error(message) }
        }
      })

      const state = await page.lookup('bafy')

      assert.equal(state.status, 'error')
      assert.equal(state.message, message || 'Status lookup failed')
      assert.equal(page.getViewModel(), state)
    }
  })
})

test('property: the service requires a hosting API adapter', () => {
  assert.throws(() => new FileStatusPage(), /requires a hosting API adapter/)
  assert.throws(() => new FileStatusPage({}), /requires a hosting API adapter/)
})
