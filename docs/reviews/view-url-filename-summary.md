# Architect Review — view-url-filename

**Task:** `view-url-filename` (end the view URL with the stored, URL-encoded file name; api + web)
**Components:** `bch-file-hosting-api`, `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `47a925c` | specifier | Specify file-named view URLs and the decorative path name |
| `3842a5a` | coder | Implement `GET /view/:cid/:filename`, encode the name in `buildLinks` |
| `418dbc5` | refactorer | Round-trip the file-named view URL in the property suite |
| `2243a14` | architect | Refresh the mutation manifests for the changed source and features |

The branch fast-forwards from the previous review tip `d7816e3`. The
verification records name `2243a14`; the review tip adds only `docs/`.

## Behavior and scope

- `buildLinks` now builds `viewUrl` as `${base}/view/${cid}/${encodeURIComponent(filename)}`;
  `downloadUrl` is unchanged.
- `GET /view/:cid/:filename` was added next to `GET /view/:cid`, both mapped to
  the same `viewFile` controller. The path file name is **decorative**: the
  served content type and `Content-Disposition` still come from the stored file
  record, so the legacy CID-only URL keeps working.
- The feed, already-hosted, and paid-payment payloads all carry the file-named
  `viewUrl`. The web shows the API-supplied URL verbatim, so only web **specs**
  changed (example URLs); no web source change was needed.
- New `File View - 5` acceptance scenario asserts the served view content type
  is derived from the stored file name.

## Architectural findings

### Positive — one source of truth for the view URL shape

The `/view/<cid>/<encoded name>` rule lives only in `buildLinks`; every producer
(feed, already-hosted, paid payment) goes through it, so the API cannot emit an
inconsistent view link. The route table declares the two accepted shapes (legacy
and file-named) explicitly rather than with an optional-segment pattern.

### Positive — the decorative path name cannot change behavior

`viewFile` reads only `req.params.cid`; the path name never reaches the use-case
or the response headers. A tampered file-named URL therefore serves the stored
file name and content type, and `headerFilename` still strips quote/backslash/
CR/LF before the inline header is built. This is the right information-hiding
boundary: the URL is presentation, the record is authoritative.

### Positive — the property suite round-trips the encoding

The refactorer's implementation-independent parse-back property catches a change
of encoding, not just a wrong string, and stays in the separate property suite.

### Observation — `encodeURIComponent(filename)` is unconditional

A missing/empty `filename` would render `/view/<cid>/undefined`. All three
`buildLinks` callers pass the stored `filename`, and `buildGatewayUrls` already
encoded it the same unconditional way, so this follows the established shape.
Noted; no change made.

### Observations — carry-forwards (no change made)

1. The five intrinsic `file-feed` limit/cursor survivors carry over unchanged.
2. `DashboardPage.loadMore` still drops the loaded list on a later-page error
   (`dashboard-loadmore-error`, web side, not touched here).
3. `view-range-requests`: `GET /view/:cid` has no HTTP `Range` support, so video
   seeking re-downloads (specifier backlog).

No structural fix was required; the only architect change is the tool-generated
manifest refresh.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/use-cases/links.js` | 2 | 0 | 0 |
| `src/controllers/rest-api/files/index.js` | 1 | 0 | 0 |

Both changed source files are fully covered and fully killed.

## DRY (`dry4javascript`)

Scoped to the two changed modules: **No duplicate candidates found** (exit 0).

## Cyclomatic complexity / CRAP

- `bch-file-hosting-api`: exit 0, every analyzed function at **100%** coverage.
- `bch-file-hosting-web`: exit 0, every analyzed function at **100%** coverage.

## Gherkin acceptance mutation (soft)

| Component | Feature | Total | Killed | Survived |
|-----------|---------|-------|--------|----------|
| api | `specs/file-view.feature` | 27 | 16 | 11 |
| api | `specs/file-feed.feature` | 26 | 21 | 5 |
| web | `specs/web-dashboard.feature` | 36 | 33 | 3 |
| web | `specs/web-payment.feature` | 22 | 17 | 5 |
| web | `specs/web-upload.feature` | 8 | 8 | 0 |

All survivors are intrinsic equivalents:

- **`file-view` (11):** the seven scenario-1 file-name case flips (`photo.jpg ->
  photO.jpg`, `icon.png -> icon.pnG`, …) that `viewType` lowercases, plus
  scenario 5's two mid-CID case flips (the CID is not asserted there and both
  steps use the same mutated row) and two file-name case flips (`photo.jpG`,
  `archive.Tar`) that lowercase to the same mapping. This is exactly the
  invariant `view.property.js` asserts.
- **`file-feed` (5):** the known limit/cursor survivors carried from
  `feed-provider-gateway` (`limit 10 -> 11`, `0 -> -5`, `101 -> 109`, `abc ->
  Abc`, `bad_cursor not-a-cursor -> not-a-Cursor`); every invalid input maps to
  the same 422 message and `10` already exceeds the three-file feed.
- **`web-dashboard` (3):** two mid-CID case flips whose assertions use separate
  hardcoded API URL columns and the truncated `shown_cid`, and `api_size 1024 ->
  1025`, which formats to the same displayed size.
- **`web-payment` (5):** two `paid_cid` case flips (the view URL comes from a
  separate column), two `paid_name` flips (`photo.jpg -> pHoto.jpg` stays an
  image, `archive.tar -> archivextar` stays non-image), and `shown_target none
  -> value` (any non-`_blank` expectation behaves identically).
- **`web-upload`:** none; the run wrote a valid mutation stamp.

The surviving scenarios are omitted from the manifests, so they re-mutate next
run.

## Verification records

`swarmforge/scripts/verify.sh` for both components, `--task view-url-filename`,
`git_sha` = `2243a14`:

- **api — pass (4/4):** unit **482 passing**, property **43 passing**,
  acceptance **all 9 suites passed**, lint ok.
- **web — pass (5/5):** unit **97 pass / 0 fail**, property **75 pass / 0
  fail**, build ok, acceptance **all 5 suites passed**, lint ok.

Records: `docs/reviews/view-url-filename-api-verification.json`,
`docs/reviews/view-url-filename-web-verification.json`. No integration/mainnet
test was run.

## Suite status

`bch-file-hosting-api` and `bch-file-hosting-web`: `npm test`,
`npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, `npm run lint` all pass; web `npm run build` passes.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `view-url-filename`.
- No follow-up work assigned to coder or refactorer.

By architect.
