/*
  Property tests for the file-hosting page service
  (src/services/file-upload-page.js).

  Invariants: submitting no file always prompts and never calls the API; a
  successful response maps to exactly one display state (quote when not already
  hosted, hosted when already hosted), the price is always numeric, and the file
  name falls back to the submitted file's name when the API omits it; any API
  failure maps to the error state carrying the failure message, or the generic
  message when the failure has none.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

const FileUploadPage = require('../../src/services/file-upload-page')
const { NO_FILE_MESSAGE } = FileUploadPage
const { forAllAsync, integerBetween, randomString } = require('./lib/harness')

const ADDRESS_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const TEXT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .-_'

function randomFilename (random) {
  return `${randomString(random, 1, 20, TEXT_ALPHABET)}.bin`
}

function randomAddress (random) {
  return `bitcoincash:q${randomString(random, 10, 40, ADDRESS_ALPHABET)}`
}

function randomDownloadUrl (random) {
  return `http://localhost:5050/download/${randomString(random, 5, 40, ADDRESS_ALPHABET)}`
}

test('property: uploading no file prompts and never calls the API', async () => {
  await forAllAsync({
    seed: 1,
    runs: 100,
    generate: () => null,
    property: async () => {
      let calls = 0
      const page = new FileUploadPage({
        hostingApi: {
          upload: async () => {
            calls++
            return { alreadyHosted: false, priceSats: 1, paymentAddress: 'addr' }
          }
        }
      })

      const state = await page.upload(null)

      assert.deepEqual(state, { status: 'no-file', message: NO_FILE_MESSAGE })
      assert.equal(calls, 0)
      assert.equal(page.getViewModel(), state)
    }
  })
})

test('property: a successful upload maps to the quote or hosted state', async () => {
  await forAllAsync({
    seed: 2,
    runs: 400,
    generate: (random) => {
      const alreadyHosted = random() < 0.5
      return {
        alreadyHosted,
        apiFilename: random() < 0.5 ? randomString(random, 1, 20, TEXT_ALPHABET) : '',
        uploadName: randomFilename(random),
        priceSats: integerBetween(random, 1, 100000000),
        paymentAddress: randomAddress(random),
        downloadUrl: randomDownloadUrl(random)
      }
    },
    property: async ({ alreadyHosted, apiFilename, uploadName, priceSats, paymentAddress, downloadUrl }) => {
      const page = new FileUploadPage({
        hostingApi: {
          upload: async () => ({
            alreadyHosted,
            filename: apiFilename,
            priceSats,
            paymentAddress,
            downloadUrl
          })
        }
      })

      const state = await page.upload({ name: uploadName })
      const expectedName = apiFilename || uploadName

      assert.equal(state.filename, expectedName)
      if (alreadyHosted) {
        assert.equal(state.status, 'hosted')
        assert.equal(state.downloadUrl, downloadUrl)
      } else {
        assert.equal(state.status, 'quote')
        assert.equal(state.priceSats, Number(priceSats))
        assert.equal(typeof state.priceSats, 'number')
        assert.equal(state.paymentAddress, paymentAddress)
      }
      assert.equal(page.getViewModel(), state)
    }
  })
})

test('property: an API failure maps to the error state with the failure message', async () => {
  await forAllAsync({
    seed: 3,
    runs: 300,
    generate: (random) => ({
      message: random() < 0.75 ? randomString(random, 1, 60, TEXT_ALPHABET) : '',
      uploadName: randomFilename(random)
    }),
    property: async ({ message, uploadName }) => {
      const page = new FileUploadPage({
        hostingApi: {
          upload: async () => { throw new Error(message) }
        }
      })

      const state = await page.upload({ name: uploadName })

      assert.equal(state.status, 'error')
      assert.equal(state.filename, uploadName)
      assert.equal(state.message, message || 'Upload failed')
      assert.equal(page.getViewModel(), state)
    }
  })
})

test('property: a failure without a message uses the generic message', async () => {
  await forAllAsync({
    seed: 4,
    runs: 100,
    generate: (random) => ({ uploadName: randomFilename(random) }),
    property: async ({ uploadName }) => {
      const page = new FileUploadPage({
        hostingApi: { upload: async () => { throw new Error() } }
      })

      const state = await page.upload({ name: uploadName })

      assert.equal(state.status, 'error')
      assert.equal(state.message, 'Upload failed')
      assert.equal(state.filename, uploadName)
    }
  })
})

test('property: the service requires a hosting API adapter', () => {
  assert.throws(() => new FileUploadPage(), /requires a hosting API adapter/)
  assert.throws(() => new FileUploadPage({}), /requires a hosting API adapter/)
})

test('property: every upload resolves to a known display status', async () => {
  await forAllAsync({
    seed: 5,
    runs: 200,
    generate: (random) => ({ uploadName: randomFilename(random) }),
    property: async ({ uploadName }) => {
      const page = new FileUploadPage({
        hostingApi: { upload: async () => ({ alreadyHosted: false, priceSats: 1, paymentAddress: 'addr' }) }
      })

      const state = await page.upload({ name: uploadName })

      assert.ok(['quote', 'hosted', 'error', 'no-file', 'idle'].includes(state.status))
      assert.equal(state.status, 'quote')
    }
  })
})

// -- payment and confirmation --

// A page whose upload always returns a quote with an injected hosting API and
// wallet. `checkResults` is returned by check-payment in order (the last
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

test('property: a quote with an expiry carries a countdown and one without omits it', async () => {
  await forAllAsync({
    seed: 6,
    runs: 200,
    generate: (random) => {
      const now = integerBetween(random, 0, 1000000000000)
      return {
        now,
        hasExpiry: random() < 0.5,
        offsetMs: integerBetween(random, -3600000, 172800000)
      }
    },
    property: async ({ now, hasExpiry, offsetMs }) => {
      const quoteExpiresAt = new Date(now + offsetMs).toISOString()
      const page = paymentPage({ quote: hasExpiry ? { quoteExpiresAt } : {} })
      page.now = () => now

      const state = await page.upload({ name: 'photo.jpg' })

      if (hasExpiry) {
        assert.equal(state.quoteExpiresAt, quoteExpiresAt)
        assert.equal(typeof state.countdown, 'string')
        assert.ok(state.countdown.length > 0)
      } else {
        assert.equal('countdown' in state, false)
        assert.equal('quoteExpiresAt' in state, false)
      }
    }
  })
})

test('property: payFromWallet sends the quote address and price and returns the txid', async () => {
  await forAllAsync({
    seed: 7,
    runs: 300,
    generate: (random) => ({
      paymentAddress: randomAddress(random),
      priceSats: integerBetween(random, 1, 100000000),
      txid: randomString(random, 1, 64, ADDRESS_ALPHABET)
    }),
    property: async ({ paymentAddress, priceSats, txid }) => {
      const sends = []
      const page = paymentPage({
        quote: { paymentAddress, priceSats },
        wallet: { send: async (args) => { sends.push(args); return txid } }
      })
      await page.upload({ name: 'photo.jpg' })

      const result = await page.payFromWallet()

      assert.deepEqual(sends, [{ address: paymentAddress, amountSats: priceSats }])
      assert.equal(result, txid)
    }
  })
})

test('property: a wallet failure maps to the error state and returns null', async () => {
  await forAllAsync({
    seed: 8,
    runs: 200,
    generate: (random) => ({ message: randomString(random, 1, 60, TEXT_ALPHABET) }),
    property: async ({ message }) => {
      const page = paymentPage({ wallet: { send: async () => { throw new Error(message) } } })
      await page.upload({ name: 'photo.jpg' })

      const result = await page.payFromWallet()

      assert.equal(result, null)
      assert.deepEqual(page.getViewModel(), { status: 'error', filename: 'photo.jpg', message })
    }
  })
})

test('property: an invalid transaction id maps to the wallet error state', async () => {
  const invalidTxids = ['', null, undefined, 0, 123, {}, [], true, false, () => {}]

  await forAllAsync({
    seed: 9,
    runs: 200,
    generate: (random) => invalidTxids[integerBetween(random, 0, invalidTxids.length - 1)],
    property: async (txid) => {
      const page = paymentPage({ wallet: { send: async () => txid } })
      await page.upload({ name: 'photo.jpg' })

      const result = await page.payFromWallet()

      assert.equal(result, null)
      assert.equal(page.getViewModel().message, 'Unexpected transaction id from wallet')
    }
  })
})

test('property: confirmation polls until paid and returns the hosted result', async () => {
  await forAllAsync({
    seed: 10,
    runs: 200,
    generate: (random) => ({
      unpaidBeforePaid: integerBetween(random, 0, 4),
      cid: `bafy${randomString(random, 10, 40, ADDRESS_ALPHABET)}`,
      gatewayUrls: [randomDownloadUrl(random), randomDownloadUrl(random)],
      txid: randomString(random, 1, 64, ADDRESS_ALPHABET)
    }),
    property: async ({ unpaidBeforePaid, cid, gatewayUrls, txid }) => {
      const downloadUrl = `http://localhost:5050/download/${cid}`
      const paid = {
        status: 'paid',
        filename: 'photo.jpg',
        cid,
        downloadUrl,
        gatewayUrls
      }
      const checkResults = []
      for (let i = 0; i < unpaidBeforePaid; i++) checkResults.push({ status: 'unpaid' })
      checkResults.push(paid)

      const sleeps = []
      const page = paymentPage({
        checkResults,
        wallet: { send: async () => txid },
        sleep: async (ms) => sleeps.push(ms),
        maxConfirmations: 10
      })
      await page.upload({ name: 'photo.jpg' })
      await page.payFromWallet()

      const state = await page.waitForConfirmation()

      assert.deepEqual(state, {
        status: 'paid',
        filename: 'photo.jpg',
        cid,
        downloadUrl,
        gatewayUrls,
        txid
      })
      assert.equal(page.checks.length, unpaidBeforePaid + 1)
      assert.equal(sleeps.length, unpaidBeforePaid)
    }
  })
})

test('property: confirmation reports expired without polling again', async () => {
  await forAllAsync({
    seed: 11,
    runs: 100,
    generate: () => ({}),
    property: async () => {
      const page = paymentPage({
        checkResults: [{ status: 'expired' }],
        wallet: { send: async () => 'txid' },
        sleep: async () => {}
      })
      await page.upload({ name: 'photo.jpg' })
      await page.payFromWallet()

      const state = await page.waitForConfirmation()

      assert.deepEqual(state, { status: 'expired', message: 'This quote has expired.' })
      assert.equal(page.checks.length, 1)
    }
  })
})

test('property: an unconfirmed payment polls the full window then reports pending', async () => {
  await forAllAsync({
    seed: 12,
    runs: 100,
    generate: (random) => ({ maxConfirmations: integerBetween(random, 1, 10) }),
    property: async ({ maxConfirmations }) => {
      const sleeps = []
      const page = paymentPage({
        checkResults: [{ status: 'unpaid' }],
        wallet: { send: async () => 'txid' },
        sleep: async (ms) => sleeps.push(ms),
        maxConfirmations
      })
      await page.upload({ name: 'photo.jpg' })
      await page.payFromWallet()

      const state = await page.waitForConfirmation()

      assert.deepEqual(state, { status: 'pending', message: 'Payment not confirmed.' })
      assert.equal(page.checks.length, maxConfirmations)
      assert.equal(sleeps.length, maxConfirmations - 1)
    }
  })
})

test('property: a rejected payment check stops polling with the API error', async () => {
  await forAllAsync({
    seed: 13,
    runs: 200,
    generate: (random) => ({
      unpaidBeforeError: integerBetween(random, 0, 4),
      message: randomString(random, 1, 60, TEXT_ALPHABET)
    }),
    property: async ({ unpaidBeforeError, message }) => {
      let checks = 0
      const sleeps = []
      const page = new FileUploadPage({
        hostingApi: {
          upload: async () => ({ alreadyHosted: false, priceSats: 2000, paymentAddress: 'bitcoincash:qinvoice' }),
          checkPayment: async () => {
            checks++
            if (checks > unpaidBeforeError) throw new Error(message)
            return { status: 'unpaid' }
          }
        },
        wallet: { send: async () => 'txid' },
        sleep: async (ms) => sleeps.push(ms),
        maxConfirmations: 10
      })
      await page.upload({ name: 'photo.jpg' })
      await page.payFromWallet()

      const state = await page.waitForConfirmation()

      assert.deepEqual(state, { status: 'error', filename: 'photo.jpg', message })
      assert.equal(checks, unpaidBeforeError + 1)
      assert.equal(sleeps.length, unpaidBeforeError)
    }
  })
})

test('property: paying requires a wallet and an open quote', async () => {
  await assert.rejects(
    () => new FileUploadPage({ hostingApi: { upload: async () => ({}) } }).payFromWallet(),
    /wallet/
  )

  const noQuote = new FileUploadPage({ hostingApi: paymentPage({}).hostingApi, wallet: { send: async () => 'txid' } })
  await assert.rejects(() => noQuote.payFromWallet(), /open quote/)
})

test('property: confirming requires an open quote', async () => {
  const page = new FileUploadPage({ hostingApi: paymentPage({}).hostingApi, wallet: { send: async () => 'txid' } })

  await assert.rejects(() => page.waitForConfirmation(), /open quote/)
})
