/*
  Unit tests for the FileStatusPage service
  (src/services/file-status-page.js).

  The service turns a typed CID plus the hosting API's file record into the
  status view state: a blank-CID prompt, the found file (with its hosting
  window and pins), or the API error. The API adapter is injected, so the tests
  never touch a network.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const FileStatusPage = require('../../src/services/file-status-page')
const { NO_CID_MESSAGE } = FileStatusPage

function apiReturning (file) {
  return { getStatus: async () => file }
}

function apiFailing (message) {
  return {
    getStatus: async () => {
      throw new Error(message)
    }
  }
}

test('shows a prompt when the CID is blank', async () => {
  const page = new FileStatusPage({ hostingApi: apiReturning({}) })

  const state = await page.lookup('   ')

  assert.deepEqual(state, { status: 'no-cid', message: NO_CID_MESSAGE })
  assert.deepEqual(page.getViewModel(), state)
})

test('shows the file details for a found CID', async () => {
  const file = {
    cid: 'bafy',
    filename: 'photo.jpg',
    sizeBytes: 1024,
    status: 'pinned',
    hostedUntil: '2027-10-09T00:00:00.000Z',
    pins: [{ provider: 'local-helia', status: 'pinned', providerRef: 'ref-1', error: null }]
  }
  const page = new FileStatusPage({ hostingApi: apiReturning(file) })

  const state = await page.lookup('bafy')

  assert.deepEqual(state, {
    status: 'found',
    cid: 'bafy',
    filename: 'photo.jpg',
    sizeBytes: 1024,
    fileStatus: 'pinned',
    hostedUntil: '2027-10-09T00:00:00.000Z',
    pins: [{ provider: 'local-helia', status: 'pinned' }]
  })
})

test('shows not paid when the file has no hosting window', async () => {
  const file = {
    cid: 'bafy',
    filename: 'draft.txt',
    sizeBytes: 500,
    status: 'staged',
    hostedUntil: null,
    pins: []
  }
  const page = new FileStatusPage({ hostingApi: apiReturning(file) })

  const state = await page.lookup('bafy')

  assert.equal(state.hostedUntil, 'not paid')
})

test('shows a file with no pins', async () => {
  const page = new FileStatusPage({ hostingApi: apiReturning({ cid: 'bafy', filename: 'draft.txt', sizeBytes: 500, status: 'staged' }) })

  const state = await page.lookup('bafy')

  assert.deepEqual(state.pins, [])
})

test('shows the API error when the status lookup fails', async () => {
  const page = new FileStatusPage({ hostingApi: apiFailing('File not found') })

  const state = await page.lookup('bafy')

  assert.deepEqual(state, { status: 'error', message: 'File not found' })
})

test('reports a generic message when the failure has no message', async () => {
  const page = new FileStatusPage({ hostingApi: { getStatus: async () => { throw new Error() } } })

  const state = await page.lookup('bafy')

  assert.equal(state.status, 'error')
  assert.equal(state.message, 'Status lookup failed')
})

test('requires a hosting API adapter', () => {
  assert.throws(() => new FileStatusPage(), /requires a hosting API adapter/)
})
