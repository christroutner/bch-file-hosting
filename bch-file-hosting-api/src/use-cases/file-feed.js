/*
  Public file feed: turn stored file records into the newest-paid-first feed
  page that GET /files serves.

  Only paid records (pinning, pinned, pinFailed) are published. The page is
  limited and paginated by an opaque cursor that names the last item of the
  previous page (its paid time and CID), so a caller never depends on the
  cursor encoding.
*/

import { isPaidFileStatus } from '../entities/file-upload.js'

export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 100
export const PAGE_LIMIT_ERROR = 'Page limit must be an integer between 1 and 100'
export const CURSOR_ERROR = 'Cursor is not valid'

export function parsePageLimit (raw) {
  if (raw === undefined || raw === null) return DEFAULT_PAGE_LIMIT

  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_LIMIT) {
    throw new Error(PAGE_LIMIT_ERROR)
  }
  return limit
}

// The cursor is an opaque token; callers must pass back exactly what the feed
// returned. It carries the paid time and CID of the last item on the page.
export function parseCursor (raw) {
  if (raw === undefined || raw === null || raw === '') return null

  try {
    const payload = JSON.parse(Buffer.from(String(raw), 'base64url').toString('utf8'))
    if (!payload || typeof payload.paidAt !== 'string' || typeof payload.cid !== 'string') {
      throw new Error(CURSOR_ERROR)
    }
    return { paidAt: payload.paidAt, cid: payload.cid }
  } catch (err) {
    throw new Error(CURSOR_ERROR)
  }
}

export function encodeCursor ({ paidAt, cid }) {
  return Buffer.from(JSON.stringify({ paidAt, cid }), 'utf8').toString('base64url')
}

// Newest paid first, with the CID as a stable tie-breaker.
function byPaidNewestFirst (a, b) {
  const paidDiff = Date.parse(b.paidAt) - Date.parse(a.paidAt)
  if (paidDiff !== 0) return paidDiff
  if (a.cid === b.cid) return 0
  return a.cid < b.cid ? -1 : 1
}

// True when `file` sorts strictly after the cursor position: an older paid
// time, or the same paid time with a larger CID.
function isAfterCursor (file, cursor) {
  const paidDiff = Date.parse(file.paidAt) - Date.parse(cursor.paidAt)
  if (paidDiff !== 0) return paidDiff < 0
  return file.cid > cursor.cid
}

// The public fields of one hosted file. Private fields (HD index, invoice
// amounts) are never published.
export function toFeedFile (file) {
  return {
    cid: file.cid,
    filename: file.filename,
    sizeBytes: file.sizeBytes,
    status: file.status,
    paymentAddress: file.paymentAddress,
    createdAt: file.createdAt,
    paidAt: file.paidAt,
    hostedUntil: file.hostedUntil,
    pins: (file.pins || []).map((pin) => ({ provider: pin.provider, status: pin.status }))
  }
}

// Slice paid files into one feed page. Returns the page's public files and the
// cursor for the next page (null when this is the last page).
export function paginateFeed (files, { limit, cursor } = {}) {
  const pageLimit = parsePageLimit(limit)
  const after = parseCursor(cursor)

  const paid = files
    .filter((file) => isPaidFileStatus(file.status))
    .sort(byPaidNewestFirst)
  const first = after ? paid.findIndex((file) => isAfterCursor(file, after)) : 0
  const start = first === -1 ? paid.length : first

  const page = paid.slice(start, start + pageLimit)
  const hasMore = start + page.length < paid.length

  return {
    files: page.map(toFeedFile),
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null
  }
}
