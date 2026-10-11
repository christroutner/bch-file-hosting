/*
  Property tests for the file-list command (src/commands/file-list.js).

  Invariants: the command maps outcomes to exit codes (0 result, 1 runtime
  error); it prints every file of the feed in feed order with its details and
  links, prints the next cursor only when there is one, prints the empty message
  for a feed without files, passes the limit and cursor flags through unchanged,
  and --json always emits exactly one JSON object that round-trips the API
  result.

  Kept separate from the unit suite. Per the constitution, property tests do not
  contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import FileList from '../../src/commands/file-list.js'
import { forAllAsync, integerBetween, randomString } from './lib/harness.js'

const config = { apiUrl: 'http://localhost:5050' }
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomCid (random) {
  return `bafy${randomString(random, 12, 40, ALPHABET)}`
}

function randomFile (random) {
  const cid = randomCid(random)
  const filename = `${randomString(random, 1, 12, ALPHABET)}.bin`
  return {
    cid,
    filename,
    sizeBytes: integerBetween(random, 0, 100000000),
    paidAt: new Date(integerBetween(random, 0, 4102444800000)).toISOString(),
    hostedUntil: new Date(integerBetween(random, 0, 4102444800000)).toISOString(),
    downloadUrl: `${config.apiUrl}/download/${cid}`,
    viewUrl: `${config.apiUrl}/view/${cid}/${filename}`
  }
}

function randomFeed (random) {
  return {
    success: true,
    files: Array.from({ length: integerBetween(random, 0, 4) }, () => randomFile(random)),
    nextCursor: random() < 0.5 ? randomString(random, 1, 30, ALPHABET) : null
  }
}

// Build a command whose injected hosting API records its calls.
function build (listFilesImpl) {
  const calls = []
  const output = []
  const errorOutput = []
  const command = new FileList({
    config,
    hostingApi: {
      listFiles: async (...args) => {
        calls.push(args)
        return listFilesImpl(...args)
      }
    },
    output: (msg) => output.push(msg),
    errorOutput: (msg) => errorOutput.push(msg)
  })
  return { command, calls, output, errorOutput }
}

describe('#file-list.property.js', () => {
  it('should echo the full result as one JSON object when --json is set', () => {
    forAllAsync({
      seed: 1,
      runs: 200,
      generate: randomFeed,
      property: async (feed) => {
        const { command, output } = build(async () => feed)

        const code = await command.run({ json: true })

        assert.equal(code, 0)
        assert.lengthOf(output, 1)
        assert.deepEqual(JSON.parse(output[0]), feed)
      }
    })
  })

  it('should print every file in feed order with its details and links, then the next cursor', () => {
    forAllAsync({
      seed: 2,
      runs: 200,
      generate: randomFeed,
      property: async (feed) => {
        const { command, output } = build(async () => feed)

        const code = await command.run({})
        const text = output.join('\n')

        assert.equal(code, 0)

        if (feed.files.length === 0) {
          assert.equal(text, 'No files are hosted yet.')
          return
        }

        for (const file of feed.files) {
          assert.include(text, `CID: ${file.cid}`)
          assert.include(text, `File name: ${file.filename}`)
          assert.include(text, `Size: ${file.sizeBytes} bytes`)
          assert.include(text, `Paid: ${file.paidAt}`)
          assert.include(text, `Hosting end: ${file.hostedUntil}`)
          assert.include(text, `Download URL: ${file.downloadUrl}`)
          assert.include(text, `View URL: ${file.viewUrl}`)
        }

        for (let i = 1; i < feed.files.length; i++) {
          assert.isBelow(
            output.indexOf(`CID: ${feed.files[i - 1].cid}`),
            output.indexOf(`CID: ${feed.files[i].cid}`)
          )
        }

        if (feed.nextCursor) {
          assert.include(text, `Next cursor: ${feed.nextCursor}`)
        } else {
          assert.notInclude(text, 'Next cursor:')
        }
      }
    })
  })

  it('should treat a response without a files array as an empty feed', () => {
    forAllAsync({
      seed: 3,
      runs: 100,
      generate: (random) => ({
        success: true,
        nextCursor: random() < 0.5 ? randomString(random, 1, 30, ALPHABET) : null
      }),
      property: async (feed) => {
        const { command, output } = build(async () => feed)

        const code = await command.run({})

        assert.equal(code, 0)
        assert.deepEqual(output, ['No files are hosted yet.'])
      }
    })
  })

  it('should pass the limit and cursor flags to the API unchanged', () => {
    forAllAsync({
      seed: 4,
      runs: 200,
      generate: (random) => ({
        limit: random() < 0.5 ? String(integerBetween(random, 1, 100)) : undefined,
        cursor: random() < 0.5 ? randomString(random, 1, 30, ALPHABET) : undefined
      }),
      property: async ({ limit, cursor }) => {
        const { command, calls } = build(async () => ({ success: true, files: [], nextCursor: null }))

        const code = await command.run({ limit, cursor })

        assert.equal(code, 0)
        assert.deepEqual(calls, [[{ limit, cursor }]])
      }
    })
  })

  it('should return 1 and print the message for any feed failure', () => {
    forAllAsync({
      seed: 5,
      runs: 200,
      generate: (random) => randomString(random, 1, 60, ALPHABET),
      property: async (message) => {
        const { command, errorOutput } = build(async () => { throw new Error(message) })

        const code = await command.run({})

        assert.equal(code, 1)
        assert.include(errorOutput.join('\n'), message)
      }
    })
  })
})
