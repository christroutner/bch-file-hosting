# Architect Review — cli-quote-details

**Task:** `cli-quote-details` (print the full upload quote in the CLI; cli)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `7bea6f6` | specifier | Specify the quote detail lines and the at-or-above-minimum scenario |
| `9c49f5b` | coder | Print file name, size, conditional billed size, and quote expiry |
| `91f2e50` | refactorer | Cover the file-upload quote details in the property suite |
| `3c00687` | architect | Refresh the cli-quote-details mutation manifests |

The branch fast-forwards from the previous review tip `7cf3380`. The
verification record names `3c00687`; the review tip adds only `docs/`.

## Behavior and scope

- The `file-upload` success quote now prints `File name`, `Size`, a separate
  `Billed size` **only when it differs from the size**, `Price`, `Payment
  address`, and `Quote expires` when the API returns one, matching the web
  quote. The already-hosted branch is unchanged. All printed values already
  come from the API response; no adapter or API change was needed.
- New `File Upload - 7` covers a file at or above the billing minimum, asserting
  that no `Billed size` line is printed.

## Architectural findings

### Positive — presentation-only, no new coupling

`FileUpload.report` reads `result.filename`, `sizeBytes`, `billedBytes`, and
`quoteExpiresAt` and prints them. Nothing is computed or re-derived in the
client, so the pricing/units rules stay owned by the API.

### Positive — the "rounds up" rule is stated once, in place

The conditional is `billedBytes !== undefined && billedBytes !== sizeBytes`,
with a comment explaining that a separate line is only useful when billing
rounds the size up. This is the single place the display rule lives, and it
matches the web quote.

### Positive — optional fields are guarded

`billedBytes` and `quoteExpiresAt` are both guarded, so a response that omits
them renders the concise quote instead of `undefined`.

### Positive — the refactorer keeps the new fields load-bearing

The file-upload property suite now asserts the quote fields, so a regression
that drops one fails a property test as well as the acceptance suite.

No structural fix was required; the only architect change is the tool-generated
manifest refresh.

### Observations — carry-forwards (no change made)

1. The three non-JSON `api_txid` `file-host` survivors remain the tracked backlog
   item **`cli-host-txid`**.
2. The intrinsic `upload_path` survivors are unchanged from the earlier CLI
   reviews (now eleven, the two new ones from scenario 7).
3. `DashboardPage.loadMore` still drops the loaded list on a later-page error
   (`dashboard-loadmore-error`, web side, not touched here).

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run via `swarmforge/scripts/mutate-file.sh`:

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/commands/file-upload.js` | 2 | 0 | 0 |

The changed source file is fully killed.

## DRY (`dry4javascript`)

Scoped to the changed module **and** across the whole `src/`: **No duplicate
candidates found** (exit 0 for each).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, every analyzed function at **100%** unit coverage.
Maximum CRAP is **6.0** (`FileUpload.report`, `FileList.report`,
`FileCheck.report`), at the target.

## Gherkin acceptance mutation (soft)

`bch-file-hosting-cli/specs/file-upload.feature`: **75 total, 64 killed, 11
survived, 0 errors.**

All eleven survivors are the documented intrinsic `upload_path` case/path
mutations (`./photo.jpg -> ./pHoto.jpg`, `./archive.tar -> x/archive.tar`, …):
the API is mocked, the printed values come from separate example columns, and no
assertion depends on the upload path. Scenario 7 contributes two more of the
same kind. The new file-name, size, billed-size, and expiry cells all killed.

The surviving scenarios are omitted from the manifest, so they re-mutate next
run.

## Verification record

`swarmforge/scripts/verify.sh cli --record
docs/reviews/cli-quote-details-verification.json --task cli-quote-details`,
`git_sha` = `3c00687`:

- **cli — pass (4/4):** unit **121 passing**, property **66 passing**,
  acceptance **all 8 suites passed**, lint ok.

No integration/mainnet test was run.

## Suite status

`bch-file-hosting-cli`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, `npm run lint` all
pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `cli-quote-details`.
- No follow-up work assigned to coder or refactorer.

By architect.
