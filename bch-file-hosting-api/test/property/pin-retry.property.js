/*
  Property tests for PaymentUseCases.retryPins.

  The invariant: retryPins retries exactly the pinFailed files, marks each one
  pinned or pinFailed according to the provider outcome, and leaves every other
  file untouched.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import PaymentUseCases from '../../src/use-cases/payment-use-cases.js'
import { FILE_STATUS } from '../../src/entities/file-upload.js'
import { forAllAsync, integerBetween } from './lib/harness.js'

const STATUSES = [FILE_STATUS.STAGED, FILE_STATUS.PINNED, FILE_STATUS.PIN_FAILED, FILE_STATUS.DELETED]

function makeFilesStore (files) {
  const store = new Map(files.map(file => [file.cid, { ...file }]))
  return {
    async list ({ status } = {}) {
      return [...store.values()].filter(file => !status || file.status === status)
    },
    async update (cid, changes) {
      const updated = { ...store.get(cid), ...changes, cid }
      store.set(cid, updated)
      return updated
    },
    async get (cid) {
      return store.get(cid) || null
    }
  }
}

function build (files, providerPin) {
  const adapters = {
    config: {},
    localdb: { files: makeFilesStore(files) },
    pinning: { getProviders: () => [{ name: 'test-provider', pin: providerPin }] },
    logger: { info () {}, error () {} }
  }
  return { payments: new PaymentUseCases({ adapters }), adapters }
}

function sorted (list) {
  return [...list].sort()
}

describe('#pin-retry.property.js', () => {
  it('should retry exactly the pinFailed files and classify each by provider outcome', () => {
    forAllAsync({
      seed: 1,
      runs: 50,
      generate: (random) => {
        const count = integerBetween(random, 0, 8)
        return Array.from({ length: count }, (_, i) => ({
          cid: `bafy-${i}-${integerBetween(random, 0, 1000000000)}`,
          filename: `file-${i}`,
          sizeBytes: i,
          status: STATUSES[integerBetween(random, 0, STATUSES.length - 1)],
          pinSucceeds: random() < 0.5
        }))
      },
      property: async (files) => {
        const byCid = new Map(files.map(file => [file.cid, file]))
        const providerPin = async ({ cid }) => {
          if (!byCid.get(cid).pinSucceeds) throw new Error('provider down')
          return { providerCid: cid, providerRef: null }
        }
        const { payments, adapters } = build(files, providerPin)

        const result = await payments.retryPins()

        const retryCids = files.filter(file => file.status === FILE_STATUS.PIN_FAILED).map(file => file.cid)
        assert.deepEqual(sorted(result.retried), sorted(retryCids))
        assert.deepEqual(sorted(result.pinned), sorted(retryCids.filter(cid => byCid.get(cid).pinSucceeds)))
        assert.deepEqual(sorted(result.failed), sorted(retryCids.filter(cid => !byCid.get(cid).pinSucceeds)))

        for (const file of files) {
          const stored = await adapters.localdb.files.get(file.cid)
          if (file.status !== FILE_STATUS.PIN_FAILED) {
            assert.equal(stored.status, file.status)
          } else {
            assert.equal(stored.status, file.pinSucceeds ? FILE_STATUS.PINNED : FILE_STATUS.PIN_FAILED)
          }
        }
      }
    })
  })

  it('should be a no-op on a second run once every retry has settled', () => {
    forAllAsync({
      seed: 2,
      runs: 30,
      generate: (random) => {
        const count = integerBetween(random, 1, 6)
        return Array.from({ length: count }, (_, i) => ({
          cid: `bafy-${i}-${integerBetween(random, 0, 1000000000)}`,
          filename: `file-${i}`,
          sizeBytes: i,
          status: FILE_STATUS.PIN_FAILED,
          pinSucceeds: random() < 0.5
        }))
      },
      property: async (files) => {
        const byCid = new Map(files.map(file => [file.cid, file]))
        const providerPin = async ({ cid }) => {
          if (!byCid.get(cid).pinSucceeds) throw new Error('provider down')
          return { providerCid: cid, providerRef: null }
        }
        const { payments } = build(files, providerPin)

        await payments.retryPins()
        const second = await payments.retryPins()

        // Only the files that failed the first time are retried again.
        assert.deepEqual(sorted(second.retried), sorted(files.filter(file => !file.pinSucceeds).map(file => file.cid)))
      }
    })
  })
})
