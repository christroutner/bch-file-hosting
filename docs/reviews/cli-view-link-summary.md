# Architect Review — cli-view-link

**Task:** `cli-view-link` (print the API view URL in the CLI results; cli)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `660fb24` | specifier | Specify `View URL` in `file-check`, `file-host`, and `file-upload` results |
| `dede310` | coder | Print the API `viewUrl` in the three commands |
| `a64a9dd` | refactorer | Cover the view URL in the CLI result property suites |
| `47eedd0` | architect | Refresh the cli-view-link mutation manifests |

The branch fast-forwards from the previous review tip `ab9e5aa`. The
verification record names `47eedd0`; the review tip adds only `docs/`.

## Behavior and scope

- `file-check` (paid), `file-host` (paid and already-hosted), and the
  already-hosted branch of `file-upload` now print `View URL: <api viewUrl>`,
  matching the web `View:` link. `file-host` carries `viewUrl` through from the
  paid check-payment result into its own result object. No adapter or API
  change was needed: the API already returns `viewUrl` in every one of these
  responses.

## Architectural findings

### Positive — presentation-only, no new coupling

The three commands read `result.viewUrl` and print it; the value already flows
through the existing `HostingApi` responses. No new adapter method, query, or
dependency direction change.

### Positive — `file-host` keeps one result shape

`file-host` copies `viewUrl` from the paid result into the object it reports, so
the inherited `FileUpload.report` and the `file-host` overrides render the same
field from the same shape rather than each reaching back into `paid`.

### Positive — the refactorer keeps the field load-bearing

The property suites for `file-check`, `file-host`, and `file-upload` now assert
the printed view URL, so a future regression that drops the line fails a
property test rather than only the acceptance suite.

### Observation — `View URL: undefined` if an API omits the field

The commands print the field unconditionally. API and CLI ship together and
every producer (feed, paid check-payment, `alreadyHosted`) already returns
`viewUrl`, so this matches the existing convention for `downloadUrl`. Noted; no
change.

No structural fix was required; the only architect change is the tool-generated
manifest refresh.

### Observations — carry-forwards (no change made)

1. The three non-JSON `api_txid` soft-mutation survivors below are the
   previously documented gap now tracked as backlog **`cli-host-txid`**.
2. The intrinsic `upload_path` survivors are unchanged from the earlier CLI
   reviews.
3. `DashboardPage.loadMore` still drops the loaded list on a later-page error
   (`dashboard-loadmore-error`, web side, not touched here).

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/commands/file-check.js` | 2 | 0 | 0 |
| `src/commands/file-host.js` | 8 | 0 | 0 |
| `src/commands/file-upload.js` | 1 | 0 | 0 |

Every changed source file is fully killed.

## DRY (`dry4javascript`)

Scoped to the three changed modules **and** across the whole `src/`: **No
duplicate candidates found** (exit 0 for each).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, every analyzed function at **100%** unit coverage.
Maximum CRAP is **6.0** (`FileList.report`, `FileCheck.report`), at the target.

## Gherkin acceptance mutation (soft)

| Feature | Total | Killed | Survived |
|---------|-------|--------|----------|
| `specs/file-check.feature` | 20 | 20 | 0 |
| `specs/file-host.feature` | 75 | 62 | 13 |
| `specs/file-upload.feature` | 39 | 30 | 9 |

- **`file-check`:** clean; the run wrote a valid mutation stamp.
- **`file-host` (13):** the ten documented intrinsic `upload_path` case/path
  mutations, plus the three pre-existing non-JSON `api_txid` cells that the text
  output does not print or assert (backlog `cli-host-txid`). The new `viewUrl`
  cells all killed.
- **`file-upload` (9):** the nine documented intrinsic `upload_path`
  case/path mutations, unchanged from the earlier CLI reviews. The new
  `viewUrl` cells all killed.

The surviving scenarios are omitted from the manifests, so they re-mutate next
run.

## Verification record

`swarmforge/scripts/verify.sh cli --record
docs/reviews/cli-view-link-verification.json --task cli-view-link`, `git_sha` =
`47eedd0`:

- **cli — pass (4/4):** unit **120 passing**, property **66 passing**,
  acceptance **all 8 suites passed**, lint ok.

No integration/mainnet test was run.

## Suite status

`bch-file-hosting-cli`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, `npm run lint` all
pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `cli-view-link`.
- No follow-up work assigned to coder or refactorer.

By architect.
