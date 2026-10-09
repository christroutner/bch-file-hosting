/*
  Unit tests for the public file feed page builder.
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
} from '../../../src/use-cases/file-feed.js'

function file (overrides = {}) {
  return {
    cid: 'bafy-a',
    filename: 'a.txt',
    sizeBytes: 1024,
    status: 'pinned',
    paymentAddress: 'bitcoincash:qpaidad',
    createdAt: '2026-01-01T00:00:00.000Z',
    paidAt: '2026-01-02T00:00:00.000Z',
    hostedUntil: '2027-01-02T00:00:00.000Z',
    pins: [{ provider: 'local-helia', status: 'pinned' }],
    ...overrides
  }
}

describe('#file-feed.js', () => {
  describe('#parsePageLimit', () => {
    it('should default to the default page limit when no limit is given', () => {
      assert.equal(parsePageLimit(undefined), DEFAULT_PAGE_LIMIT)
      assert.equal(parsePageLimit(null), DEFAULT_PAGE_LIMIT)
    })

    it('should parse a numeric string within the allowed range', () => {
      assert.equal(parsePageLimit('2'), 2)
      assert.equal(parsePageLimit('100'), MAX_PAGE_LIMIT)
      assert.equal(parsePageLimit(1), 1)
    })

    it('should reject a limit below one', () => {
      for (const value of ['0', 0, '-1', -3, '1.5', 1.5]) {
        assert.throws(() => parsePageLimit(value), PAGE_LIMIT_ERROR)
      }
    })

    it('should reject a limit above the maximum', () => {
      assert.throws(() => parsePageLimit('101'), PAGE_LIMIT_ERROR)
      assert.throws(() => parsePageLimit(1000), PAGE_LIMIT_ERROR)
    })

    it('should reject a non-numeric limit', () => {
      assert.throws(() => parsePageLimit('abc'), PAGE_LIMIT_ERROR)
      assert.throws(() => parsePageLimit(''), PAGE_LIMIT_ERROR)
    })
  })

  describe('#parseCursor', () => {
    it('should treat a missing or empty cursor as no cursor', () => {
      assert.isNull(parseCursor(undefined))
      assert.isNull(parseCursor(null))
      assert.isNull(parseCursor(''))
    })

    it('should round-trip an encoded cursor', () => {
      const cursor = encodeCursor({ paidAt: '2026-01-02T00:00:00.000Z', cid: 'bafy-a' })

      assert.deepEqual(parseCursor(cursor), { paidAt: '2026-01-02T00:00:00.000Z', cid: 'bafy-a' })
    })

    it('should reject a token that is not a cursor', () => {
      assert.throws(() => parseCursor('not-a-cursor'), CURSOR_ERROR)
    })

    it('should reject a token that does not carry a paid time and CID', () => {
      const bad = Buffer.from(JSON.stringify({ cid: 'bafy-a' }), 'utf8').toString('base64url')

      assert.throws(() => parseCursor(bad), CURSOR_ERROR)
    })

    it('should reject a token whose payload is not an object', () => {
      const bad = Buffer.from(JSON.stringify(null), 'utf8').toString('base64url')

      assert.throws(() => parseCursor(bad), CURSOR_ERROR)
    })

    it('should reject a token whose paid time or CID is not a string', () => {
      const badPaidAt = Buffer.from(JSON.stringify({ paidAt: 123, cid: 'bafy-a' }), 'utf8').toString('base64url')
      const badCid = Buffer.from(JSON.stringify({ paidAt: '2026-01-02T00:00:00.000Z', cid: 7 }), 'utf8').toString('base64url')

      assert.throws(() => parseCursor(badPaidAt), CURSOR_ERROR)
      assert.throws(() => parseCursor(badCid), CURSOR_ERROR)
    })
  })

  describe('#toFeedFile', () => {
    it('should publish only the public fields', () => {
      const result = toFeedFile(file())

      assert.deepEqual(result, {
        cid: 'bafy-a',
        filename: 'a.txt',
        sizeBytes: 1024,
        status: 'pinned',
        paymentAddress: 'bitcoincash:qpaidad',
        createdAt: '2026-01-01T00:00:00.000Z',
        paidAt: '2026-01-02T00:00:00.000Z',
        hostedUntil: '2027-01-02T00:00:00.000Z',
        pins: [{ provider: 'local-helia', status: 'pinned' }]
      })
      assert.notProperty(result, 'hdIndex')
    })

    it('should reduce each pin to its provider and status', () => {
      const result = toFeedFile(file({
        pins: [{ provider: 'lighthouse', status: 'failed', providerRef: 'ref', error: 'boom' }]
      }))

      assert.deepEqual(result.pins, [{ provider: 'lighthouse', status: 'failed' }])
    })

    it('should treat a missing pin list as empty', () => {
      assert.deepEqual(toFeedFile(file({ pins: undefined })).pins, [])
    })
  })

  describe('#paginateFeed', () => {
    const old = file({ cid: 'bafy-old', paidAt: '2026-01-01T00:00:00.000Z' })
    const middle = file({ cid: 'bafy-mid', paidAt: '2026-01-02T00:00:00.000Z' })
    const newest = file({ cid: 'bafy-new', paidAt: '2026-01-03T00:00:00.000Z' })

    it('should publish only paid files, newest paid first', () => {
      const result = paginateFeed([
        old,
        { ...file(), cid: 'bafy-staged', status: 'staged', paidAt: null },
        newest,
        { ...file(), cid: 'bafy-deleted', status: 'deleted' },
        middle
      ], { limit: 10 })

      assert.deepEqual(result.files.map(f => f.cid), ['bafy-new', 'bafy-mid', 'bafy-old'])
      assert.isNull(result.nextCursor)
    })

    it('should limit the page and offer a cursor for more', () => {
      const result = paginateFeed([old, middle, newest], { limit: 2 })

      assert.deepEqual(result.files.map(f => f.cid), ['bafy-new', 'bafy-mid'])
      assert.isNotNull(result.nextCursor)
    })

    it('should return the next page from the cursor', () => {
      const first = paginateFeed([old, middle, newest], { limit: 2 })
      const second = paginateFeed([old, middle, newest], { limit: 2, cursor: first.nextCursor })

      assert.deepEqual(second.files.map(f => f.cid), ['bafy-old'])
      assert.isNull(second.nextCursor)
    })

    it('should continue after a cursor whose file is gone', () => {
      const cursor = encodeCursor({ paidAt: middle.paidAt, cid: middle.cid })

      const result = paginateFeed([old, newest], { limit: 10, cursor })

      assert.deepEqual(result.files.map(f => f.cid), ['bafy-old'])
    })

    it('should order files that share a paid time by CID', () => {
      const sameTime = '2026-01-02T00:00:00.000Z'
      const result = paginateFeed([
        file({ cid: 'bafy-b', paidAt: sameTime }),
        file({ cid: 'bafy-a', paidAt: sameTime })
      ], { limit: 10 })

      assert.deepEqual(result.files.map(f => f.cid), ['bafy-a', 'bafy-b'])
    })

    it('should treat files with the same paid time and CID as equal', () => {
      const same = file({ cid: 'bafy-same', paidAt: '2026-01-02T00:00:00.000Z' })

      const result = paginateFeed([same, { ...same }], { limit: 10 })

      assert.deepEqual(result.files.map(f => f.cid), ['bafy-same', 'bafy-same'])
    })

    it('should return an empty page when the cursor is past the end', () => {
      const cursor = encodeCursor({ paidAt: '2020-01-01T00:00:00.000Z', cid: 'bafy-z' })

      const result = paginateFeed([old, middle, newest], { limit: 10, cursor })

      assert.deepEqual(result.files, [])
      assert.isNull(result.nextCursor)
    })

    it('should reject an invalid limit', () => {
      assert.throws(() => paginateFeed([old], { limit: 'abc' }), PAGE_LIMIT_ERROR)
    })

    it('should reject an invalid cursor', () => {
      assert.throws(() => paginateFeed([old], { cursor: 'not-a-cursor' }), CURSOR_ERROR)
    })
  })
})
