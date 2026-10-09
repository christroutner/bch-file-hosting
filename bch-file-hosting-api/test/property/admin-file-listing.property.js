/*
  Property tests for AdminUseCases.listFiles.

  Invariants: a known status filters to exactly the files with that status, no
  status returns every file, and any other value is rejected.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import AdminUseCases from '../../src/use-cases/admin-use-cases.js'
import { FILE_STATUS } from '../../src/entities/file-upload.js'
import { forAllAsync, integerBetween } from './lib/harness.js'

const VALID_STATUSES = Object.values(FILE_STATUS)

function makeFilesStore (files) {
  return {
    async list ({ status } = {}) {
      return files.filter(file => !status || file.status === status)
    }
  }
}

function build (files) {
  return new AdminUseCases({ adapters: { config: {}, localdb: { files: makeFilesStore(files) } } })
}

function randomFiles (random) {
  const count = integerBetween(random, 0, 8)
  return Array.from({ length: count }, (_, i) => ({
    cid: `bafy-${i}-${integerBetween(random, 0, 1000000000)}`,
    status: VALID_STATUSES[integerBetween(random, 0, VALID_STATUSES.length - 1)]
  }))
}

describe('#admin-file-listing.property.js', () => {
  it('should return exactly the files with a requested known status', () => {
    forAllAsync({
      seed: 1,
      runs: 100,
      generate: (random) => ({
        files: randomFiles(random),
        status: VALID_STATUSES[integerBetween(random, 0, VALID_STATUSES.length - 1)]
      }),
      property: async ({ files, status }) => {
        const result = await build(files).listFiles({ status })

        assert.deepEqual(
          result.map(file => file.cid).sort(),
          files.filter(file => file.status === status).map(file => file.cid).sort()
        )
      }
    })
  })

  it('should list every file when no status is given', () => {
    forAllAsync({
      seed: 2,
      runs: 100,
      generate: (random) => randomFiles(random),
      property: async (files) => {
        const result = await build(files).listFiles()
        assert.lengthOf(result, files.length)
      }
    })
  })

  it('should reject every value that is not a known file status', () => {
    forAllAsync({
      seed: 3,
      runs: 100,
      generate: (random) => `unknown-${integerBetween(random, 0, 1000000000)}`,
      property: async (status) => {
        let threw = false
        try {
          await build([]).listFiles({ status })
        } catch (err) {
          threw = true
          assert.equal(err.status, 422)
          assert.include(err.message, status)
        }
        assert.isTrue(threw)
      }
    })
  })
})
