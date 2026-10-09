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
