/*
  Property tests for the dashboard page service
  (src/services/dashboard-page.js).

  Invariants: load maps every feed file to the same public view model (with a
  download URL built from the configured base) and reports hasMore exactly when
  the API returned a next cursor; loadMore appends the next page to the files
  already shown without dropping or duplicating one; loadMore is a no-op when
  the current page has no cursor; and a feed failure becomes the error state
  with the API message (or the generic fallback).

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const DashboardPage = require('../../src/services/dashboard-page')
const { forAllAsync, integerBetween, randomString } = require('./lib/harness')

const TEXT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_'
const STATUSES = ['pinning', 'pinned', 'pinFailed']
const BASE = 'http://localhost:5050'

function randomFile (random, index) {
  const pinCount = integerBetween(random, 0, 3)
  const pins = []
  for (let i = 0; i < pinCount; i++) {
    pins.push({
      provider: randomString(random, 1, 10),
      status: randomString(random, 1, 8),
      providerRef: randomString(random, 1, 8)
    })
  }
  const cid = `bafy${String(index).padStart(4, '0')}${randomString(random, 4, 8)}`
  return {
    cid,
    filename: `${randomString(random, 1, 12, TEXT_ALPHABET)}.bin`,
    sizeBytes: integerBetween(random, 0, 100000000),
    status: STATUSES[integerBetween(random, 0, STATUSES.length - 1)],
    paymentAddress: `bitcoincash:q${randomString(random, 10, 30)}`,
    paidAt: '2026-01-02T00:00:00.000Z',
    hostedUntil: '2027-01-02T00:00:00.000Z',
    pins
  }
}

function randomPage (random, size) {
  return {
    files: Array.from({ length: size }, (_, index) => randomFile(random, index)),
    nextCursor: random() < 0.5 ? null : randomString(random, 1, 20)
  }
}

// The public view model the service keeps for one feed file.
function publicFile (file) {
  return {
    cid: file.cid,
    filename: file.filename,
    sizeBytes: file.sizeBytes,
    status: file.status,
    paymentAddress: file.paymentAddress,
    paidAt: file.paidAt,
    hostedUntil: file.hostedUntil,
    downloadUrl: `${BASE}/download/${file.cid}`,
    pins: (file.pins || []).map((pin) => ({ provider: pin.provider, status: pin.status }))
  }
}

function apiReturning (pages, calls) {
  let index = 0
  return {
    getFeed: async (params) => {
      calls.push(params)
      return pages[Math.min(index++, pages.length - 1)]
    }
  }
}

test('property: load maps every file and reports hasMore from the next cursor', async () => {
  await forAllAsync({
    seed: 1,
    runs: 200,
    generate: (random) => ({
      pageSize: integerBetween(random, 1, 50),
      page: randomPage(random, integerBetween(random, 0, 20))
    }),
    property: async ({ pageSize, page }) => {
      const calls = []
      const dashboard = new DashboardPage({
        hostingApi: apiReturning([page], calls),
        pageSize,
        downloadBaseUrl: BASE
      })

      const state = await dashboard.load()

      assert.deepEqual(calls, [{ limit: pageSize }])
      assert.equal(state.status, 'loaded')
      assert.deepEqual(state.files, page.files.map(publicFile))
      assert.equal(state.hasMore, Boolean(page.nextCursor))
      assert.deepEqual(dashboard.getViewModel(), state)
    }
  })
})

test('property: loadMore appends the next page without losing or duplicating a file', async () => {
  await forAllAsync({
    seed: 2,
    runs: 200,
    generate: (random) => ({
      first: randomPage(random, integerBetween(random, 1, 10)),
      second: randomPage(random, integerBetween(random, 0, 10))
    }),
    property: async ({ first, second }) => {
      const firstPage = { files: first.files, nextCursor: 'cursor-1' }
      const calls = []
      const dashboard = new DashboardPage({
        hostingApi: apiReturning([firstPage, second], calls),
        downloadBaseUrl: BASE
      })

      await dashboard.load()
      const state = await dashboard.loadMore()

      assert.deepEqual(calls[1], { limit: 20, cursor: 'cursor-1' })
      assert.deepEqual(
        state.files.map((file) => file.cid),
        [...first.files, ...second.files].map((file) => file.cid)
      )
      assert.equal(state.hasMore, Boolean(second.nextCursor))
    }
  })
})

test('property: loadMore is a no-op when the feed has no next cursor', async () => {
  await forAllAsync({
    seed: 3,
    runs: 100,
    generate: (random) => randomPage(random, integerBetween(random, 0, 10)),
    property: async (page) => {
      const calls = []
      const dashboard = new DashboardPage({
        hostingApi: apiReturning([{ files: page.files, nextCursor: null }], calls),
        downloadBaseUrl: BASE
      })
      await dashboard.load()

      const state = await dashboard.loadMore()

      assert.equal(calls.length, 1)
      assert.deepEqual(state.files, page.files.map(publicFile))
    }
  })
})

test('property: a feed failure becomes the error state with the API message', async () => {
  await forAllAsync({
    seed: 4,
    runs: 200,
    generate: (random) => randomString(random, 1, 60, TEXT_ALPHABET),
    property: async (message) => {
      const dashboard = new DashboardPage({
        hostingApi: { getFeed: async () => { throw new Error(message) } },
        downloadBaseUrl: BASE
      })

      const state = await dashboard.load()

      assert.deepEqual(state, { status: 'error', message })
    }
  })
})

test('property: a feed failure with no message uses the generic error text', async () => {
  await forAllAsync({
    seed: 5,
    runs: 50,
    generate: (random) => integerBetween(random, 0, 1000),
    property: async () => {
      const dashboard = new DashboardPage({
        hostingApi: { getFeed: async () => { throw new Error() } },
        downloadBaseUrl: BASE
      })

      const state = await dashboard.load()

      assert.deepEqual(state, { status: 'error', message: 'Could not load the hosted files' })
    }
  })
})
