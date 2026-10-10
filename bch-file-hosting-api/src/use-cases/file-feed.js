/*
  Public file feed: turn stored file records into the newest-paid-first feed
  page that GET /files serves.

  Only paid records (pinning, pinned, pinFailed) are published. The page is
  limited and paginated by an opaque cursor that names the last item of the
  previous page (its paid time and CID), so a caller never depends on the
  cursor encoding.
*/

import { isPaidFileStatus } from '../entities/file-upload.js'
import { buildGatewayUrls } from './links.js'

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

// A cursor that the caller did not supply at all.
function isMissingCursor (raw) {
  return raw === undefined || raw === null || raw === ''
}

// Decode an opaque cursor token into the paid time and CID of the last item
// on the previous page, rejecting anything that is not exactly that.
function decodeCursor (raw) {
  const payload = JSON.parse(Buffer.from(String(raw), 'base64url').toString('utf8'))
  if (!payload || typeof payload.paidAt !== 'string' || typeof payload.cid !== 'string') {
    throw new Error(CURSOR_ERROR)
  }
  return { paidAt: payload.paidAt, cid: payload.cid }
}

// The cursor is an opaque token; callers must pass back exactly what the feed
// returned. It carries the paid time and CID of the last item on the page.
export function parseCursor (raw) {
  if (isMissingCursor(raw)) return null

  try {
    return decodeCursor(raw)
  } catch (err) {
    throw new Error(CURSOR_ERROR)
  }
}

export function encodeCursor ({ paidAt, cid }) {
  return Buffer.from(JSON.stringify({ paidAt, cid }), 'utf8').toString('base64url')
}

// Newest paid first, with the CID as a stable tie-breaker. Byte order is a
// deterministic total order for CIDs across platforms (unlike locale-aware
// string comparison) and agrees with the code-unit order isAfterCursor uses.
function byPaidNewestFirst (a, b) {
  const paidDiff = Date.parse(b.paidAt) - Date.parse(a.paidAt)
  if (paidDiff !== 0) return paidDiff
  return Buffer.compare(Buffer.from(a.cid), Buffer.from(b.cid))
}

// True when `file` sorts strictly after the cursor position in the same
// newest-paid-first order as byPaidNewestFirst, so pagination can never
// disagree with the sort.
function isAfterCursor (file, cursor) {
  return byPaidNewestFirst(file, cursor) > 0
}

// The public fields of one hosted file. Private fields (HD index, invoice
// amounts) are never published.
export function toFeedFile (file, config = {}, providers = []) {
  return {
    cid: file.cid,
    filename: file.filename,
    sizeBytes: file.sizeBytes,
    status: file.status,
    paymentAddress: file.paymentAddress,
    createdAt: file.createdAt,
    paidAt: file.paidAt,
    hostedUntil: file.hostedUntil,
    gatewayUrls: buildGatewayUrls({ cid: file.cid, filename: file.filename, config, providers }),
    pins: (file.pins || []).map((pin) => ({ provider: pin.provider, status: pin.status }))
  }
}

// Slice paid files into one feed page. Returns the page's public files and the
// cursor for the next page (null when this is the last page).
export function paginateFeed (files, { limit, cursor, config = {}, providers = [] } = {}) {
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
    files: page.map((file) => toFeedFile(file, config, providers)),
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-10T00:53:11.895Z","module_hash":"ffa7543f757436299bfa49e962fcdd52d1a1e01f59941ad4405ab8e182aac6a9","functions":[{"id":"func/parsePageLimit","name":"parsePageLimit","line":19,"end_line":27,"hash":"980aa05439df5e8697c07c54bba8140bdc31f3f5b57b48670ded4fae4972d879"},{"id":"func/isMissingCursor","name":"isMissingCursor","line":30,"end_line":32,"hash":"3afe6e15abb027f2f611702ef2457a48443fae89779629b0db22fc23f7c5685b"},{"id":"func/decodeCursor","name":"decodeCursor","line":36,"end_line":42,"hash":"3e3bb1133562ff43d279d5f7038676c863384cc16db3e0362b9cf8dfbd4e5043"},{"id":"func/parseCursor","name":"parseCursor","line":46,"end_line":54,"hash":"c3d69a8c5fc213006ffb7ad3bead55eb5e5cc83919285612025efa98bfe247ce"},{"id":"func/encodeCursor","name":"encodeCursor","line":56,"end_line":58,"hash":"4abb126df149a8dfac2463afec1d0771d1b70553e5d072cf8f11e8db97e4790c"},{"id":"func/byPaidNewestFirst","name":"byPaidNewestFirst","line":63,"end_line":67,"hash":"eaac071f7ca292575cbfb0eaf7248aec2b5b707f943febc349a7787853ecebf2"},{"id":"func/isAfterCursor","name":"isAfterCursor","line":72,"end_line":74,"hash":"3f05dc4274d88a7f05c3e849af7f3549b0ebd7e36c607d96b669203ea79beef9"},{"id":"func/toFeedFile","name":"toFeedFile","line":78,"end_line":91,"hash":"dd0fc830d65991a19e5f28f41868665e09e1f821ea05309308911c31e969ba81"},{"id":"func/paginateFeed","name":"paginateFeed","line":95,"end_line":112,"hash":"3d1e6f104b8b4ac97dec55c7723541d9984003ff7b7a49860963408c754dda02"}]}
// mutate4javascript-manifest-end
