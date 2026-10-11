# bch-file-hosting API Contract

**Status**: specification (docs-only; no code change).
**Owner**: specifier.
**Audience**: the `bch-file-hosting` clients (`bch-file-hosting-cli`,
`bch-file-hosting-web`) and downstream consumers such as `psf-memo-cli`.
**Source of truth for behavior**: the API implementation
(`bch-file-hosting-api/src/`) and the long-term plan
(`dev-docs/long-term-plan.md`, sections 7–10). This document pins the
externally visible surface only.

This document exists because the psf-memo port
(`psf-memo/psf-memo-cli/dev-docs/bch-file-hosting-cli-request.md`, §4–§6) needs
one place that describes every endpoint, payload, status, and error, plus the
stable boundary of the reusable `HostingApi` client adapter.

---

## 1. Conventions

### Base URL

- The server listens on `PORT` (default `5050`).
- A client selects the API with `HOSTING_API_URL` (default
  `http://localhost:5050`). This is the one shared client name.
  - The CLI reads `HOSTING_API_URL` directly (`bch-file-hosting-cli/config`).
  - The web is moving to `HOSTING_API_URL`, with `REACT_APP_HOSTING_API_URL` as
    the documented Create React App mirror (CRA only inlines `REACT_APP_*`);
    it currently reads `REACT_APP_API_URL`, which is deprecated. Tracked by
    `web-hosting-api-url`.
  - Production is served at `https://file-hosting-api.blippost.com`.
- The API builds response URLs from its own `PUBLIC_URL` (default
  `http://localhost:<PORT>`), not from the client's base URL.

### Response envelope

- Success: HTTP 2xx with a JSON body `{ "success": true, ...result }`.
- Error: HTTP 4xx/5xx with `{ "success": false, "error": "<message>" }`.
- `/health` is the one exception: it returns
  `{ "success": <bool>, "version": "<semver>", "ipfs": "up"|"down", "db": "up"|"down" }`
  with HTTP 200 when healthy and 503 when a component is down. It does not use
  the `error` field.

### Errors

| Status | Meaning | Example `error` |
|--------|---------|-----------------|
| 400 | Malformed JSON body (`POST /files/check-payment`) | `Request body is not valid JSON` |
| 400 | Unknown multipart error | multer message |
| 401 | Admin route missing/wrong `x-api-key` | `Invalid or missing x-api-key header` |
| 404 | Unknown invoice, file, or route; unpaid/unpinned download | `File not found: <cid>` |
| 413 | File larger than `MAX_FILE_SIZE_BYTES` | `File exceeds the maximum size of <n> bytes` |
| 422 | Invalid input (no file, wrong field, bad address, bad feed filter) | `Property 'paymentAddress' must be a non-empty string` |
| 429 | Per-IP rate limit reached (`RATE_LIMIT_PER_MIN`, default 30/min) | `Too many requests. Try again in a minute.` |
| 503 | Admin API disabled (`ADMIN_API_KEY` unset) | `Admin API is disabled. Set ADMIN_API_KEY to enable it.` |
| 500 | Unexpected server error | `Internal server error` |

### Amounts and identities

- All amounts are integer **satoshis** (`priceSats`, `receivedSats`,
  `requiredSats`). `priceBch` and `usdPrice` are display-only.
- CIDs are IPFS CIDv1 strings. Payment addresses are
  `bitcoincash:` cash addresses.
- Private keys (WIFs) and mnemonics are never persisted, returned, or logged.

---

## 2. Public endpoints

### `POST /files`

Upload a file (multipart, field name `file`) and receive a price quote and a
fresh payment address, or links if the file is already hosted.

- Rate-limited. `multipart/form-data`. Exactly one file in the `file` field.
- The server adds the file to its local IPFS node staged (not pinned) and
  returns a quote. The temp file is always removed.

**Quote response** (`alreadyHosted: false`):

| Field | Type | Notes |
|-------|------|-------|
| `success` | bool | `true` |
| `alreadyHosted` | bool | `false` |
| `cid` | string | IPFS CIDv1 |
| `filename` | string | sanitized base name, at most 255 chars |
| `sizeBytes` | integer | as uploaded |
| `billedBytes` | integer | `max(sizeBytes, MIN_BILLED_BYTES)` |
| `priceSats` | integer | `max(ceil(usdPrice / usdPerBch * 1e8), MIN_INVOICE_SATS)` |
| `priceBch` | number | `priceSats / 1e8` (display only) |
| `usdPrice` | number | `billedBytes / 1e6 * USD_PER_MB_YEAR` |
| `paymentAddress` | string | unique HD address for this invoice |
| `quoteExpiresAt` | ISO string | `createdAt + QUOTE_TTL_HOURS` (default 24h) |

Re-uploading a file that still has an **open, unexpired** quote returns that
same quote (same payment address). Re-uploading a file that is `pinning`,
`pinned`, or `pinFailed` returns the already-hosted form. Re-uploading a
deleted file creates a new quote.

**Already-hosted response** (`alreadyHosted: true`):

| Field | Type |
|-------|------|
| `cid`, `filename`, `sizeBytes`, `hostedUntil` | as above |
| `downloadUrl`, `viewUrl`, `gatewayUrls` | see §4 |

**`POST /files` errors**: 413 oversize, 422 missing/wrong field
(`Upload a file in the multipart field 'file'` or `Upload exactly one file in
the multipart field 'file'`), 422 zero-byte
(`Property 'sizeBytes' must be a positive integer`).

### `POST /files/check-payment`

Body: `{ "paymentAddress": "<bitcoincash:...>" }` (JSON). Looks up the invoice,
checks the on-chain balance (confirmed + unconfirmed satoshis, so 0-conf
counts), and on payment records it, sweeps it, and starts pinning in the
background.

**Unpaid** (`receivedSats` below `priceSats - UNDERPAY_TOLERANCE_SATS`):

```json
{ "success": true, "status": "unpaid", "receivedSats": 0, "requiredSats": 2000, "quoteExpiresAt": "..." }
```

**Paid** (also returned for an already-paid invoice, without re-sweeping; a
previously failed pin is retried in the background):

```json
{
  "success": true,
  "status": "paid",
  "cid": "bafybei...",
  "filename": "photo.jpg",
  "paidAt": "...",
  "receivedSats": 2000,
  "hostedUntil": "...",
  "downloadUrl": "http://localhost:5050/download/bafybei...",
  "viewUrl": "http://localhost:5050/view/bafybei.../photo.jpg",
  "gatewayUrls": ["https://ipfs.io/ipfs/bafybei.../photo.jpg"]
}
```

**Expired** (invoice `deleted`, or quote window passed while still
`awaitingPayment`):

```json
{ "success": true, "status": "expired", "quoteExpiresAt": "..." }
```

- Payment is confirmed when `receivedSats > 0 &&
  receivedSats >= priceSats - UNDERPAY_TOLERANCE_SATS` (default tolerance 100).
  Overpayment is accepted.
- A payment that arrives after `quoteExpiresAt` but before cleanup deletes the
  file is still honored.
- Idempotent: repeated calls never sweep twice; a pin that previously failed is
  retried, and a `pinning` file already being handled in the background is left
  alone.
- Missing/non-string `paymentAddress`: 422. Unknown address: 404.

### `GET /files`

Public feed of paid files (`pinning`, `pinned`, `pinFailed`), newest paid
first with the CID as a stable tie-break.

| Query | Type | Notes |
|-------|------|-------|
| `limit` | integer 1..100 | default 20; invalid value is 422 `Page limit must be an integer between 1 and 100` |
| `cursor` | string | opaque token from the previous page; pass back exactly as returned; invalid value is 422 `Cursor is not valid` |

Response: `{ "success": true, "files": [ <feed item> ], "nextCursor": "<token>" | null }`.

**Feed item** (public fields only; no HD index or invoice amounts):

| Field | Type |
|-------|------|
| `cid`, `filename`, `sizeBytes`, `status`, `paymentAddress` | string / integer |
| `createdAt`, `paidAt`, `hostedUntil` | ISO strings |
| `downloadUrl`, `viewUrl`, `gatewayUrls` | see §4 |
| `pins` | array of `{ provider, status }` |

### `GET /files/:cid`

Metadata and pins for one file. Returns no download/view URLs.

| Field | Type |
|-------|------|
| `cid`, `filename`, `sizeBytes`, `status` | string / integer |
| `pins` | array of `{ provider, status, ... }` |
| `paidAt`, `hostedUntil` | ISO strings or `null` for a staged file |

Unknown CID: 404 `File not found: <cid>`.

### `GET /download/:cid`

Streams a hosted file as an attachment. Only available when the file is paid
(`pinning`/`pinned`/`pinFailed`) **and** this server still holds a local pin;
otherwise 404 `File not found: <cid>`. Sets
`Content-Disposition: attachment` and `Content-Length` when known.

### `GET /view/:cid` and `GET /view/:cid/:filename`

Streams a hosted file inline. Same paid-plus-local-pin gate as download;
otherwise 404. Images
(`jpg/jpeg/png/gif/webp/svg/bmp/avif`) and videos (`mp4/webm/ogg`) are served
inline with their content type; every other type is served as an attachment
(`application/octet-stream`). The path filename is decorative: the content type
comes from the stored record.

### `GET /health`

Returns `{ success, version, ipfs: "up"|"down", db: "up"|"down" }` with HTTP
200 when `ipfs` and `db` are up, 503 otherwise.

---

## 3. Admin endpoints

All admin routes require the `x-api-key` header to equal `ADMIN_API_KEY`.
They return 503 when `ADMIN_API_KEY` is unset, and 401 when the header is
missing or wrong.

| Method | Path | Query / result |
|--------|------|----------------|
| `GET` | `/admin/invoices` | `status` ∈ `awaitingPayment\|paid\|deleted`; `sweepStatus` ∈ `pending\|swept\|empty` → `{ invoices: [...] }` |
| `GET` | `/admin/files` | `status` ∈ `staged\|pinning\|pinned\|pinFailed\|deleted` → `{ files: [...] }` |
| `POST` | `/admin/files/:cid/delete` | Unpin from every provider and delete the local copy → `{ cid, unpinned, failed }`; 404 if unknown |
| `POST` | `/admin/sweeps/retry` | Sweep unswept paid invoices → `{ swept, failed, empty }` |
| `POST` | `/admin/cleanup/run` | Delete expired unpaid uploads now → `{ checked, deleted, rescued, failed }` |

An unknown filter value is 422 (for example `Unknown invoice status 'x'`).

---

## 4. URL-bearing fields

`buildLinks` produces three fields:

| Field | Value |
|-------|-------|
| `downloadUrl` | `<PUBLIC_URL>/download/<cid>` |
| `viewUrl` | `<PUBLIC_URL>/view/<cid>/<encodeURIComponent(filename)>` |
| `gatewayUrls` | each `PUBLIC_GATEWAYS` prefix + `<cid>/<encodedName>`, plus each active provider's `gatewayUrl(cid, filename)` |

Presence matrix (the downstream port depends on this):

| Payload | `downloadUrl` | `viewUrl` | `gatewayUrls` |
|---------|:---:|:---:|:---:|
| `POST /files` quote | — | — | — |
| `POST /files` already-hosted | yes | yes | yes |
| `POST /files/check-payment` paid | yes | yes | yes |
| `GET /files` feed item | yes | yes | yes |
| `GET /files/:cid` | — (intentionally) | — | — |

These fields must stay present and correctly named on the payloads marked
"yes". `GET /files/:cid` intentionally returns metadata only; adding links
there is a product decision, not a downstream requirement. Regression coverage
is tracked by `links-contract`.

---

## 5. Status values

| Record | Values | Notes |
|--------|--------|-------|
| Invoice `status` | `awaitingPayment`, `paid`, `deleted` | `expired` is computed, never stored |
| Invoice `sweepStatus` | `null`, `pending`, `swept`, `empty` | `null` until a sweep is attempted |
| File `status` | `staged`, `pinning`, `pinned`, `pinFailed`, `deleted` | paid statuses are `pinning`/`pinned`/`pinFailed` |
| `check-payment` `status` | `unpaid`, `paid`, `expired` | response discriminator |
| Pin `status` | provider-defined; `pinned` on success | one entry per provider in `pins[]` |

A paid file is `pinning` while the background upload/pin runs, then `pinned`
when every authoritative provider succeeded and `pinFailed` when one failed.
`local-helia` is best-effort and never fails the file.

---

## 6. `HostingApi` module boundary

Decision (2026-10-11): the adapter is **documented, not published**. Consumers
in other repositories copy this module (or, later, a published package with the
same surface). This section pins the boundary so a copy stays faithful.

- **Source**: `bch-file-hosting-cli/src/lib/hosting-api.js`.
- **Exports**: default `HostingApi`; named `HostingApiError` (an `Error`
  subclass whose `message` is the API's `error` string).
- **Construction**: `new HostingApi({ config, fetch })`.
  - `config.apiUrl` (string): base URL, no trailing slash required.
  - `fetch` (function, optional): defaults to `globalThis.fetch`. The adapter
    must call the transport with the global receiver (`(fetchImpl ||
    fetch).bind(globalThis)`), because a browser rejects a bare `fetch` invoked
    as an instance method. Tracked by `cli-hosting-api-fetch`.
- **Dependencies**: none beyond the injected `fetch` and the standard web APIs
  (`FormData`, `Blob`, `URLSearchParams`). A Node ESM consumer needs no extra
  packages.
- **Methods** (all return the parsed API body on 2xx; on non-2xx they throw
  `HostingApiError` with the API `error` message, falling back to
  `Hosting API request failed with HTTP <status>`):
  - `upload({ filename, buffer })` → `POST /files` (multipart field `file`).
  - `checkPayment({ paymentAddress })` → `POST /files/check-payment`.
  - `getStatus({ cid })` → `GET /files/:cid`, with the CID percent-encoded as a
    single path segment.
  - `listFiles({ limit, cursor })` → `GET /files`; omitted options are not sent.
- **Not implemented**: download/view streaming. Consumers use the returned
  `downloadUrl` / `viewUrl` / `gatewayUrls`.

---

## 7. Stability guarantees and non-goals

Guaranteed stable (downstream may depend on them):

1. The response envelope: `success: true` on 2xx, `success: false` + `error`
   on errors.
2. The URL-bearing fields and their presence matrix (§4).
3. The status vocabularies (§5).
4. `check-payment` idempotency and the 0-conf + tolerance payment rule.
5. Integer-satoshi amounts; CIDs and cash addresses as strings.
6. The `HostingApi` surface in §6.

Non-goals for the contract:

- Public user accounts or authentication; public routes are open and
  rate-limited only.
- A downstream download command; the port prints the API's URLs.

Out-of-scope for the contract (tracked elsewhere):

- `Range` requests on `GET /view/:cid` and large-video seeking
  (`view-range-requests`).
- Publishing `HostingApi` as an npm package; the boundary is documented in §6
  instead (`hosting-api-reuse`).
- Hardening the image gateway link's `rel` attribute (`web-image-link-rel`).

As part of this feature, `bch-file-hosting-api/examples/README.md` was
corrected: its paid `check-payment` example was missing `viewUrl`, which the
real response includes (§2).
