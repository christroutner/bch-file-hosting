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

test('prefers the API file name over the uploaded name for an already hosted file', async () => {
  const page = new FileUploadPage({
    hostingApi: apiReturning({
      alreadyHosted: true,
      filename: 'archive.tar',
      downloadUrl: 'http://localhost:5050/download/bafy'
    })
  })

  const state = await page.upload({ name: 'local-name.tar' })

  assert.equal(state.filename, 'archive.tar')
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

// -- payment and confirmation --

// A page whose upload always returns a quote, with the payment dependencies
// injected. `checkResults` is returned by check-payment in order (the last
// result repeats), so a scenario can model an unpaid-then-paid poll.
function paymentPage ({ quote = {}, checkResults = [{ status: 'unpaid' }], wallet, sleep, maxConfirmations } = {}) {
  const checks = []
  const page = new FileUploadPage({
    hostingApi: {
      upload: async () => ({ alreadyHosted: false, priceSats: 2000, paymentAddress: 'bitcoincash:qinvoice', ...quote }),
      checkPayment: async ({ paymentAddress }) => {
        checks.push(paymentAddress)
        const index = Math.min(checks.length - 1, checkResults.length - 1)
        return checkResults[index]
      }
    },
    wallet,
    sleep,
    maxConfirmations
  })
  page.checks = checks
  return page
}

const FIXED_NOW = Date.parse('2026-10-09T12:00:00Z')

test('composes the countdown from the quote expiry', async () => {
  const quoteExpiresAt = new Date(FIXED_NOW + 90 * 60 * 1000).toISOString()
  const page = paymentPage({ quote: { quoteExpiresAt } })
  page.now = () => FIXED_NOW

  const state = await page.upload({ name: 'photo.jpg' })

  assert.equal(state.quoteExpiresAt, quoteExpiresAt)
  assert.equal(state.countdown, '1 hour 30 minutes')
})

test('omits the countdown when the API does not set an expiry', async () => {
  const page = paymentPage({})

  const state = await page.upload({ name: 'photo.jpg' })

  assert.equal('countdown' in state, false)
})

test('pays the quote price to the payment address from the wallet', async () => {
  const sends = []
  const wallet = { send: async (args) => { sends.push(args); return 'txid-9' } }
  const page = paymentPage({ quote: { priceSats: 62500 }, wallet })
  await page.upload({ name: 'photo.jpg' })

  const txid = await page.payFromWallet()

  assert.deepEqual(sends, [{ address: 'bitcoincash:qinvoice', amountSats: 62500 }])
  assert.equal(txid, 'txid-9')
})

test('shows the wallet error when the payment fails', async () => {
  const wallet = { send: async () => { throw new Error('Insufficient funds') } }
  const page = paymentPage({ wallet })
  await page.upload({ name: 'photo.jpg' })

  const txid = await page.payFromWallet()

  assert.equal(txid, null)
  assert.deepEqual(page.getViewModel(), { status: 'error', filename: 'photo.jpg', message: 'Insufficient funds' })
})

test('shows an error when the wallet returns no transaction id', async () => {
  const wallet = { send: async () => '' }
  const page = paymentPage({ wallet })
  await page.upload({ name: 'photo.jpg' })

  const txid = await page.payFromWallet()

  assert.equal(txid, null)
  assert.deepEqual(page.getViewModel(), {
    status: 'error',
    filename: 'photo.jpg',
    message: 'Unexpected transaction id from wallet'
  })
})

test('confirms a payment that becomes visible on a later poll', async () => {
  const paid = {
    status: 'paid',
    cid: 'bafy',
    filename: 'photo.jpg',
    downloadUrl: 'http://localhost:5050/download/bafy',
    gatewayUrls: ['https://ipfs.io/ipfs/bafy/photo.jpg']
  }
  const sleeps = []
  const page = paymentPage({
    checkResults: [{ status: 'unpaid' }, paid],
    wallet: { send: async () => 'txid-9' },
    sleep: async (ms) => sleeps.push(ms)
  })
  await page.upload({ name: 'photo.jpg' })
  await page.payFromWallet()

  const state = await page.waitForConfirmation()

  assert.equal(page.checks.length, 2)
  assert.equal(sleeps.length, 1)
  assert.deepEqual(state, {
    status: 'paid',
    filename: 'photo.jpg',
    cid: 'bafy',
    downloadUrl: 'http://localhost:5050/download/bafy',
    gatewayUrls: ['https://ipfs.io/ipfs/bafy/photo.jpg'],
    txid: 'txid-9'
  })
})

test('shows the expired message when the quote has expired', async () => {
  const page = paymentPage({
    checkResults: [{ status: 'expired' }],
    wallet: { send: async () => 'txid-9' },
    sleep: async () => {}
  })
  await page.upload({ name: 'photo.jpg' })
  await page.payFromWallet()

  const state = await page.waitForConfirmation()

  assert.deepEqual(state, { status: 'expired', message: 'This quote has expired.' })
})

test('shows the pending message when the payment never confirms', async () => {
  const sleeps = []
  const page = paymentPage({
    checkResults: [{ status: 'unpaid' }],
    wallet: { send: async () => 'txid-9' },
    sleep: async (ms) => sleeps.push(ms),
    maxConfirmations: 3
  })
  await page.upload({ name: 'photo.jpg' })
  await page.payFromWallet()

  const state = await page.waitForConfirmation()

  assert.deepEqual(state, { status: 'pending', message: 'Payment not confirmed.' })
  assert.equal(page.checks.length, 3)
  assert.equal(sleeps.length, 2)
})

test('requires a wallet and an open quote to pay', async () => {
  const page = new FileUploadPage({ hostingApi: paymentPage({}).hostingApi })

  await assert.rejects(() => page.payFromWallet(), /wallet/)
})
