/*
  Unit tests for the FileUploadPage service.

  The service turns a chosen browser file plus a hosting API response into the
  page's display state. The API adapter is injected so the tests exercise the
  state machine (no file, quote, already hosted, error) without a network.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const FileUploadPage = require('../../src/services/file-upload-page')

function apiReturning (result) {
  return { upload: async () => result }
}

function apiFailing (message) {
  return {
    upload: async () => {
      throw new Error(message)
    }
  }
}

test('shows a prompt when no file is chosen', async () => {
  const page = new FileUploadPage({ hostingApi: apiReturning({}) })

  const state = await page.upload(null)

  assert.equal(state.status, 'no-file')
  assert.equal(state.message, 'Choose a file to upload.')
  assert.deepEqual(page.getViewModel(), state)
})

test('shows the quote for an uploaded file', async () => {
  const page = new FileUploadPage({
    hostingApi: apiReturning({
      alreadyHosted: false,
      filename: 'photo.jpg',
      priceSats: 2000,
      paymentAddress: 'bitcoincash:qquote'
    })
  })

  const state = await page.upload({ name: 'photo.jpg' })

  assert.deepEqual(state, {
    status: 'quote',
    filename: 'photo.jpg',
    priceSats: 2000,
    paymentAddress: 'bitcoincash:qquote'
  })
})

test('shows the download link for an already hosted file', async () => {
  const page = new FileUploadPage({
    hostingApi: apiReturning({
      alreadyHosted: true,
      filename: 'archive.tar',
      downloadUrl: 'http://localhost:5050/download/bafy'
    })
  })

  const state = await page.upload({ name: 'archive.tar' })

  assert.deepEqual(state, {
    status: 'hosted',
    filename: 'archive.tar',
    downloadUrl: 'http://localhost:5050/download/bafy'
  })
})

test('falls back to the uploaded file name when the API omits it', async () => {
  const page = new FileUploadPage({
    hostingApi: apiReturning({ alreadyHosted: false, priceSats: 2000, paymentAddress: 'addr' })
  })

  const state = await page.upload({ name: 'archive.tar' })

  assert.equal(state.filename, 'archive.tar')
})

test('shows the API error for a rejected upload and keeps the file name', async () => {
  const page = new FileUploadPage({ hostingApi: apiFailing('File is too large') })

  const state = await page.upload({ name: 'huge.bin' })

  assert.deepEqual(state, {
    status: 'error',
    filename: 'huge.bin',
    message: 'File is too large'
  })
})

test('reports a generic message when the failure has no message', async () => {
  const page = new FileUploadPage({ hostingApi: { upload: async () => { throw new Error() } } })

  const state = await page.upload({ name: 'broken.bin' })

  assert.equal(state.status, 'error')
  assert.equal(state.message, 'Upload failed')
})
