/*
  Unit tests for the DashboardPage service
  (src/services/dashboard-page.js).

  The service loads the public feed through the injected hosting API adapter
  and owns the dashboard display state: the feed in order (with Refresh and
  Load more), the empty-feed state, or the API error. No network is touched.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const DashboardPage = require('../../src/services/dashboard-page')
const { EMPTY_MESSAGE, DEFAULT_PAGE_SIZE } = DashboardPage

function file (overrides = {}) {
  return {
    cid: 'bafy-a',
    filename: 'photo.jpg',
    sizeBytes: 1024,
    status: 'pinned',
    paymentAddress: 'bitcoincash:qfeed',
    paidAt: '2026-01-02T00:00:00.000Z',
    hostedUntil: '2027-01-02T00:00:00.000Z',
    pins: [{ provider: 'local-helia', status: 'pinned' }],
    ...overrides
  }
}

function apiReturning (pages) {
  const calls = []
  let index = 0
  return {
    calls,
    getFeed: async (params) => {
      calls.push(params)
      return pages[Math.min(index++, pages.length - 1)]
    }
  }
}

test('requires a hosting API adapter', () => {
  assert.throws(() => new DashboardPage(), /requires a hosting API adapter/)
})

test('loads the first page in feed order and reduces each file to its public fields', async () => {
  const api = apiReturning([{ files: [file(), file({ cid: 'bafy-b', filename: 'notes.txt' })], nextCursor: 'cursor-1' }])
  const page = new DashboardPage({ hostingApi: api })

  const state = await page.load()

  assert.deepEqual(api.calls, [{ limit: DEFAULT_PAGE_SIZE }])
  assert.equal(state.status, 'loaded')
  assert.deepEqual(state.files.map((f) => f.filename), ['photo.jpg', 'notes.txt'])
  assert.equal(state.hasMore, true)
  assert.deepEqual(state.files[0], {
    cid: 'bafy-a',
    filename: 'photo.jpg',
    sizeBytes: 1024,
    status: 'pinned',
    paymentAddress: 'bitcoincash:qfeed',
    paidAt: '2026-01-02T00:00:00.000Z',
    hostedUntil: '2027-01-02T00:00:00.000Z',
    pins: [{ provider: 'local-helia', status: 'pinned' }]
  })
  assert.deepEqual(page.getViewModel(), state)
})

test('shows an empty feed as a loaded page with no files', async () => {
  const page = new DashboardPage({ hostingApi: apiReturning([{ files: [], nextCursor: null }]) })

  const state = await page.load()

  assert.deepEqual(state, { status: 'loaded', files: [], hasMore: false })
  assert.equal(EMPTY_MESSAGE, 'No files are hosted yet.')
})

test('shows the API error when the feed fails to load', async () => {
  const page = new DashboardPage({
    hostingApi: { getFeed: async () => { throw new Error('Hosting API down') } }
  })

  const state = await page.load()

  assert.deepEqual(state, { status: 'error', message: 'Hosting API down' })
})

test('reports a generic message when the feed failure has no message', async () => {
  const page = new DashboardPage({
    hostingApi: { getFeed: async () => { throw new Error() } }
  })

  const state = await page.load()

  assert.equal(state.status, 'error')
  assert.equal(state.message, 'Could not load the hosted files')
})

test('loadMore appends the next page and follows its cursor', async () => {
  const api = apiReturning([
    { files: [file()], nextCursor: 'cursor-1' },
    { files: [file({ cid: 'bafy-b', filename: 'notes.txt' })], nextCursor: null }
  ])
  const page = new DashboardPage({ hostingApi: api })
  await page.load()

  const state = await page.loadMore()

  assert.deepEqual(api.calls[1], { limit: DEFAULT_PAGE_SIZE, cursor: 'cursor-1' })
  assert.deepEqual(state.files.map((f) => f.filename), ['photo.jpg', 'notes.txt'])
  assert.equal(state.hasMore, false)
})

test('loadMore follows the cursor from the next page', async () => {
  const api = apiReturning([
    { files: [file()], nextCursor: 'cursor-1' },
    { files: [file({ cid: 'bafy-b', filename: 'notes.txt' })], nextCursor: 'cursor-2' },
    { files: [file({ cid: 'bafy-c', filename: 'third.txt' })], nextCursor: null }
  ])
  const page = new DashboardPage({ hostingApi: api })
  await page.load()
  await page.loadMore()
  await page.loadMore()

  assert.deepEqual(api.calls[2], { limit: DEFAULT_PAGE_SIZE, cursor: 'cursor-2' })
})

test('loadMore does nothing when the feed has no next page', async () => {
  const api = apiReturning([{ files: [file()], nextCursor: null }])
  const page = new DashboardPage({ hostingApi: api })
  await page.load()

  const state = await page.loadMore()

  assert.equal(api.calls.length, 1)
  assert.deepEqual(state.files.map((f) => f.filename), ['photo.jpg'])
})

test('loadMore does nothing while no feed has been loaded', async () => {
  const api = apiReturning([{ files: [file()], nextCursor: null }])
  const page = new DashboardPage({ hostingApi: api })

  const state = await page.loadMore()

  assert.equal(api.calls.length, 0)
  assert.deepEqual(state, { status: 'idle' })
})

test('loadMore shows the API error when the next page fails', async () => {
  let call = 0
  const page = new DashboardPage({
    hostingApi: {
      getFeed: async () => {
        if (call++ === 0) return { files: [file()], nextCursor: 'cursor-1' }
        throw new Error('Feed unavailable')
      }
    }
  })
  await page.load()

  const state = await page.loadMore()

  assert.deepEqual(state, { status: 'error', message: 'Feed unavailable' })
})

test('refresh reloads the first page and drops the previous files', async () => {
  const api = apiReturning([
    { files: [file()], nextCursor: null },
    { files: [file({ cid: 'bafy-b', filename: 'notes.txt' })], nextCursor: null }
  ])
  const page = new DashboardPage({ hostingApi: api })
  await page.load()

  const state = await page.load()

  assert.deepEqual(state.files.map((f) => f.filename), ['notes.txt'])
})

test('uses the configured page size', async () => {
  const api = apiReturning([{ files: [], nextCursor: null }])
  const page = new DashboardPage({ hostingApi: api, pageSize: 2 })

  await page.load()

  assert.deepEqual(api.calls, [{ limit: 2 }])
})
