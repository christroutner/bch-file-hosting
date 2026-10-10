/*
  Property tests for the public file feed (src/use-cases/file-feed.js).

  Invariants: an encoded cursor round-trips through parseCursor; the page limit
  accepts exactly the integers 1..100 and rejects everything else; the feed
  publishes exactly the paid files, newest paid first with a stable CID
  tie-break, in pages no larger than the limit; walking the cursors visits every
  paid file exactly once and ends only when the next cursor is null; and each
  published record exposes only public fields with pins reduced to provider and
  status and with gateway URLs composed from the public gateways plus the
  active providers.

  Kept separate from the unit suite. Per the constitution, property tests do
  not contribute to unit coverage, CRAP, Gherkin acceptance, or mutation runs.
*/

import { assert } from 'chai'

import {
  parsePageLimit,
  parseCursor,
  encodeCursor,
  toFeedFile,
  paginateFeed,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  PAGE_LIMIT_ERROR,
  CURSOR_ERROR
} from '../../src/use-cases/file-feed.js'
import { forAll, integerBetween } from './lib/harness.js'

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
const PAID_STATUSES = ['pinning', 'pinned', 'pinFailed']
const UNPAID_STATUSES = ['staged', 'deleted']
const ALL_STATUSES = [...PAID_STATUSES, ...UNPAID_STATUSES]

// A few fixed paid times so generated feeds share timestamps and exercise the
// CID tie-break instead of always comparing distinct times.
const PAID_TIMES = [
  '2026-01-01T00:00:00.000Z',
  '2026-01-02T00:00:00.000Z',
  '2026-01-03T00:00:00.000Z'
]

function randomString (random, min, max) {
  const length = integerBetween(random, min, max)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[integerBetween(random, 0, ALPHABET.length - 1)]
  }
  return out
}

// Build a feed record with a unique CID. paidAt is null for unpaid records.
function randomFile (random, index) {
  const status = ALL_STATUSES[integerBetween(random, 0, ALL_STATUSES.length - 1)]
  const paid = PAID_STATUSES.includes(status)
  const pinCount = integerBetween(random, 0, 3)
  const pins = []
  for (let i = 0; i < pinCount; i++) {
    pins.push({
      provider: randomString(random, 1, 10),
      status: randomString(random, 1, 8),
      providerRef: randomString(random, 1, 8),
      error: randomString(random, 1, 8)
    })
  }
  return {
    cid: `bafy${String(index).padStart(4, '0')}${randomString(random, 4, 10)}`,
    filename: `${randomString(random, 1, 12)}.bin`,
    sizeBytes: integerBetween(random, 0, 100000000),
    status,
    paymentAddress: `bitcoincash:q${randomString(random, 10, 30)}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    paidAt: paid ? PAID_TIMES[integerBetween(random, 0, PAID_TIMES.length - 1)] : null,
    hostedUntil: paid ? '2027-01-02T00:00:00.000Z' : null,
    pins
  }
}

// The expected order, computed independently of the implementation: newest
// paid first, then ascending CID.
function expectedOrder (files) {
  return files
    .filter((file) => PAID_STATUSES.includes(file.status))
    .sort((a, b) => {
      const paidDiff = Date.parse(b.paidAt) - Date.parse(a.paidAt)
      if (paidDiff !== 0) return paidDiff
      if (a.cid === b.cid) return 0
      return a.cid < b.cid ? -1 : 1
    })
}

describe('#file-feed.property.js', () => {
  describe('#parseCursor and #encodeCursor', () => {
    it('should round-trip every cursor through encode and parse', () => {
      forAll({
        seed: 1,
        runs: 500,
        generate: (random) => ({
          paidAt: new Date(integerBetween(random, 0, 4102444800000)).toISOString(),
          cid: `bafy${randomString(random, 4, 40)}`
        }),
        property: (cursor) => {
          assert.deepEqual(parseCursor(encodeCursor(cursor)), cursor)
          assert.equal(encodeCursor(cursor), encodeCursor(cursor))
        }
      })
    })

    it('should reject payloads that are not a paid time plus a CID', () => {
      const malformed = [
        null,
        42,
        'a string',
        [],
        {},
        { paidAt: '2026-01-02T00:00:00.000Z' },
        { cid: 'bafy-a' },
        { paidAt: 5, cid: 'bafy-a' },
        { paidAt: '2026-01-02T00:00:00.000Z', cid: 9 }
      ]

      forAll({
        seed: 2,
        runs: malformed.length,
        generate: (random, run) => malformed[run],
        property: (payload) => {
          const token = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
          assert.throws(() => parseCursor(token), CURSOR_ERROR)
        }
      })
    })
  })

  describe('#parsePageLimit', () => {
    it('should accept exactly the integers 1..100', () => {
      forAll({
        seed: 3,
        runs: 500,
        generate: (random) => integerBetween(random, 1, MAX_PAGE_LIMIT),
        property: (limit) => {
          assert.equal(parsePageLimit(limit), limit)
          assert.equal(parsePageLimit(String(limit)), limit)
        }
      })
    })

    it('should reject non-integers and integers outside 1..100', () => {
      forAll({
        seed: 4,
        runs: 400,
        generate: (random, run) => (run % 2 === 0
          ? integerBetween(random, -1000, 0)
          : integerBetween(random, MAX_PAGE_LIMIT + 1, 100000)),
        property: (limit) => {
          assert.throws(() => parsePageLimit(limit), PAGE_LIMIT_ERROR)
        }
      })
    })

    it('should default to the documented page limit when no limit is given', () => {
      assert.equal(parsePageLimit(undefined), DEFAULT_PAGE_LIMIT)
      assert.equal(parsePageLimit(null), DEFAULT_PAGE_LIMIT)
    })
  })

  describe('#paginateFeed', () => {
    it('should publish every paid file exactly once, in order, in bounded pages', () => {
      forAll({
        seed: 5,
        runs: 200,
        generate: (random) => ({
          files: Array.from(
            { length: integerBetween(random, 0, 40) },
            (_, index) => randomFile(random, index)
          ),
          limit: integerBetween(random, 1, 7)
        }),
        property: ({ files, limit }) => {
          const expected = expectedOrder(files)
          const seen = []
          let cursor
          let pages = 0

          while (true) {
            const page = paginateFeed(files, { limit, cursor })

            assert.isAtMost(page.files.length, limit)
            for (const file of page.files) {
              assert.include(PAID_STATUSES, file.status)
              seen.push(file.cid)
            }

            if (page.nextCursor === null) break
            cursor = page.nextCursor
            pages++
            assert.isBelow(pages, 1000)
          }

          assert.deepEqual(seen, expected.map((file) => file.cid))
          assert.lengthOf(new Set(seen), seen.length)
        }
      })
    })

    it('should publish only public fields and reduce pins to provider and status', () => {
      forAll({
        seed: 6,
        runs: 300,
        generate: (random) => randomFile(random, 0),
        property: (file) => {
          const published = toFeedFile(file)

          assert.deepEqual(Object.keys(published).sort(), [
            'cid',
            'createdAt',
            'downloadUrl',
            'filename',
            'gatewayUrls',
            'hostedUntil',
            'paidAt',
            'paymentAddress',
            'pins',
            'sizeBytes',
            'status',
            'viewUrl'
          ])
          assert.deepEqual(
            published.pins,
            (file.pins || []).map((pin) => ({ provider: pin.provider, status: pin.status }))
          )
          assert.notProperty(published, 'hdIndex')
        }
      })
    })

    it('should build every gateway URL from the configured public gateways', () => {
      forAll({
        seed: 7,
        runs: 200,
        generate: (random) => {
          const prefixCount = integerBetween(random, 0, 3)
          const publicGateways = []
          for (let i = 0; i < prefixCount; i++) publicGateways.push(`https://gw${i}.example/ipfs/`)
          return { file: randomFile(random, 0), publicGateways }
        },
        property: ({ file, publicGateways }) => {
          const published = toFeedFile(file, { publicGateways })

          assert.deepEqual(
            published.gatewayUrls,
            publicGateways.map((prefix) => `${prefix}${file.cid}/${encodeURIComponent(file.filename)}`)
          )
        }
      })
    })

    it('should append each provider gateway URL after the public gateways', () => {
      forAll({
        seed: 8,
        runs: 300,
        generate: (random) => {
          const publicGateways = []
          const prefixCount = integerBetween(random, 0, 3)
          for (let i = 0; i < prefixCount; i++) publicGateways.push(`https://pub${i}.example/ipfs/`)

          const providers = []
          const providerCount = integerBetween(random, 0, 4)
          for (let i = 0; i < providerCount; i++) {
            // Half the providers offer no gateway URL and must contribute none.
            const offers = random() < 0.5
            providers.push({
              gatewayUrl: (cid, filename) => (offers ? `https://pin${i}.example/ipfs/${cid}/${encodeURIComponent(filename)}` : null)
            })
          }
          return { file: randomFile(random, 0), publicGateways, providers }
        },
        property: ({ file, publicGateways, providers }) => {
          const published = toFeedFile(file, { publicGateways }, providers)

          const expected = publicGateways.map((prefix) => `${prefix}${file.cid}/${encodeURIComponent(file.filename)}`)
          for (const provider of providers) {
            const url = provider.gatewayUrl(file.cid, file.filename)
            if (url) expected.push(url)
          }

          assert.deepEqual(published.gatewayUrls, expected)
        }
      })
    })
  })
})
