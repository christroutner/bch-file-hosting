# Architect Review — file-view

**Task:** `file-view` (serve files for viewing through the API; api + web)
**Components:** `bch-file-hosting-api`, `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-10

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `7fe159b` | specifier | Specify `GET /view/:cid`, `viewUrl`, feed URLs, and 404 for unpinned files |
| `5fc2fa3` | coder | Serve files for viewing and point the web at the API view/download links |
| `305a2e2` | refactorer | Cover the view mapping and view URL with property tests |
| `8112f31` | architect | Refresh the file-view language and acceptance mutation manifests |

The branch fast-forwards from the previous review tip `d99c867`. The
verification records name `8112f31`; the review tip adds only `docs/`.

## Behavior and scope

- New `GET /view/:cid` streams images and videos inline with their content
  type and everything else as an attachment.
- `GET /download/:cid` and `GET /view/:cid` now return 404 unless the file is
  paid **and** this server still holds a local pin (`ipfs.isPinned`).
- The public feed and the paid / already-hosted payloads gained `downloadUrl`
  and `viewUrl`. The web paid / already-hosted result shows a single API
  `View:` link, and the dashboard download/view cells point at the API; the
  third-party gateway links were dropped from the web views (they remain in
  the API feed's `gatewayUrls`).

## Architectural findings

### Positive — shared paid + local-pin rule

`FileUseCases.paidPinnedFile` extracts the "paid and locally pinned" guard and
is used by both `getDownload` and `getView`, so the two content endpoints cannot
drift. The guard depends on the stable `ipfs.isPinned` adapter method; the
use-case never sees Helia or Express.

### Positive — view classification is a pure, separately tested module

`src/use-cases/view.js` maps a file name to `{ contentType, disposition }` with
no IO, and the refactorer added `test/property/view.property.js` covering the
case-insensitivity and final-extension invariants. Property tests stay separate
from the unit, CRAP, mutation, and acceptance runs, as the constitution requires.

### Positive — controller streaming is now shared and safe

`openContent` / `pipeContent` factor the read-first-chunk-then-stream pattern out
of `downloadFile` so `viewFile` reuses it; a mid-stream failure is logged with a
per-endpoint label. `headerFilename` strips quote/backslash/CR/LF before the
inline `Content-Disposition` is built, so a hostile file name cannot inject a
header.

### Positive — link shape is centralized

`buildLinks` remains the single place the `/download/<cid>` and `/view/<cid>`
rules live, with a hardened `config = {}` default and `String(config.publicUrl
|| '')`, so a missing public URL yields a relative link instead of throwing.

### Observation — `viewType` returns HTTP vocabulary from the use-case layer

`getView` returns `contentType` / `disposition`, which are HTTP presentation
concepts. It is a boundary blur, but the project already keeps pure mapping
modules in `use-cases/` (`links.js`, `file-feed.js`) and the controller owns the
actual header emission, so this follows the established shape rather than
fighting it. No change made.

### Observation — web view URL has no base fallback

`dashboard-page.js` derives a `downloadUrl` fallback from the configured base
but leaves `viewUrl` empty when the feed omits it. API and web ship together, so
this is acceptable; noted for a future split-version deployment.

### Observations — carry-forwards (no change made)

1. The five intrinsic `file-feed` limit/cursor survivors carry over unchanged.
2. `DashboardPage.loadMore` still drops the loaded list on a later-page error
   (`dashboard-loadmore-error`, web side, not touched here).
3. `view-range-requests`: `GET /view/:cid` has no HTTP `Range` support, so video
   seeking re-downloads. Already recorded in the backlog by the specifier.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| Component | File | Killed | Survived | Uncovered |
|-----------|------|--------|----------|-----------|
| api | `src/use-cases/view.js` | 1 | 0 | 0 |
| api | `src/use-cases/links.js` | 2 | 0 | 0 |
| api | `src/use-cases/file-feed.js` | 22 | 0 | 0 |
| api | `src/use-cases/file-use-cases.js` | 8 | 0 | 0 |
| api | `src/controllers/rest-api/files/controller.js` | 1 | 0 | 0 |
| web | `src/services/dashboard-page.js` | 7 | 0 | 0 |
| web | `src/services/file-upload-page.js` | 12 | 0 | 0 |
| web | `src/components/app-body/file-hosting/upload-quote-view.js` | 2 | 0 | 0 |

The controller differential run under-selected (`Selected 0 < Covered 1`);
`mutate-file.sh` reran it with `--mutate-all` and killed the site.

## DRY (`dry4javascript`)

Scoped to the changed modules in both components: **No duplicate candidates
found** (exit 0 for each).

## Cyclomatic complexity / CRAP

- `bch-file-hosting-api`: exit 0, every analyzed function at **100%** coverage;
  maximum CRAP **5.0** (`PaymentUseCases.checkPaymentUnlocked`).
- `bch-file-hosting-web`: exit 0, every analyzed function at **100%** coverage;
  maximum CRAP **6.0** (`DashboardPage.loadMore`), at the target.

## Gherkin acceptance mutation (soft)

| Component | Feature | Total | Killed | Survived |
|-----------|---------|-------|--------|----------|
| api | `specs/file-view.feature` | 21 | 14 | 7 |
| api | `specs/file-feed.feature` | 24 | 19 | 5 |
| web | `specs/web-dashboard.feature` | 36 | 33 | 3 |
| web | `specs/web-payment.feature` | 22 | 17 | 5 |
| web | `specs/web-upload.feature` | 8 | 8 | 0 |

All survivors are intrinsic equivalents:

- **`file-view` (7):** base-name/extension-case mutations (`photo.jpg ->
  photO.jpg`, `icon.png -> icon.pnG`, …). `viewType` lowercases the final
  extension, so the mapping is unchanged; this is exactly the invariant the
  `view.property.js` suite asserts.
- **`file-feed` (5):** the known limit/cursor survivors carried from
  `feed-provider-gateway` (`limit 10 -> 11`, `0 -> -5`, `101 -> 109`, `abc ->
  Abc`, `bad_cursor -> not-a-Cursor`); every invalid input maps to the same 422
  message and `10` already exceeds the three-file feed.
- **`web-dashboard` (3):** two mid-CID case flips whose assertions use the
  separate hardcoded API URL columns and the truncated `shown_cid` (a middle
  character is unobservable), and `api_size 1024 -> 1025`, which formats to the
  same displayed size (rounding equivalent).
- **`web-payment` (5):** two `paid_cid` case flips (view URL comes from a
  separate column), two `paid_name` flips (`photo.jpg -> pHoto.jpg` stays an
  image, `archive.tar -> archivextar` stays non-image), and `shown_target none
  -> value` (any non-`_blank` expectation behaves identically).

The surviving scenarios are omitted from the manifests, so they re-mutate next
run.

## Verification records

`swarmforge/scripts/verify.sh` for both components, `--task file-view`,
`git_sha` = `8112f31`:

- **api — pass (4/4):** unit **480 passing**, property **42 passing**,
  acceptance **all 9 suites passed**, lint ok.
- **web — pass (5/5):** unit **97 pass / 0 fail**, property **75 pass / 0
  fail**, build ok, acceptance **all 5 suites passed**, lint ok.

Records: `docs/reviews/file-view-api-verification.json`,
`docs/reviews/file-view-web-verification.json`. No integration/mainnet test was
run.

## Suite status

`bch-file-hosting-api` and `bch-file-hosting-web`: `npm test`,
`npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, `npm run lint` all pass; web `npm run build` passes.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `file-view`.
- No follow-up work assigned to coder or refactorer.

By architect.
