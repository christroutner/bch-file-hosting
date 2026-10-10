# Architect Review — dashboard-trim-columns

**Task:** `dashboard-trim-columns` (drop the Status and Pins columns; trim the unused view-model fields)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-10

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `64416ae` | specifier | Drop the Status and Pins columns from `web-dashboard.feature`; scenario 2 now covers CID + download |
| `29ca666` | coder | Remove the Status and Pins columns from the view |
| `9b22426` | refactorer | Trim the unused `status`/`paymentAddress`/`pins` from the dashboard view model |
| `4b92f17` | architect | Refresh the mutation manifests for the trimmed columns |

The branch fast-forwards through the previous review tip `33148a9`. The
verification record names `4b92f17`; the review tip adds only `docs/`.

## Behavior and scope

- `DashboardView` now renders six columns: File Name, Size, Paid, Hosted Until,
  CID (truncated with copy control), and Download. The `statusBadge` and
  `pinsText` helpers are gone.
- `DashboardPage.toDashboardFile` now publishes only the fields the table
  shows: `cid`, `filename`, `sizeBytes`, `paidAt`, `hostedUntil`,
  `downloadUrl`. `status`, `paymentAddress`, and `pins` no longer cross into the
  view model.
- The acceptance handlers for "file with a status", "a pin for a file", "the
  status cell", and "row lists the pins" were removed with the scenarios that
  used them.

## Architectural findings

### Positive — information hiding tightened

The view model boundary now exposes exactly the six values the view renders.
The previous `status` and `pins` fields were dead weight at the boundary: the
dashboard never displayed them after this change, so removing them (rather than
leaving them for a hypothetical future use) keeps the presentation contract
honest and avoids leaking feed fields the dashboard does not own. The removed
helpers and handlers take their now-unreachable code with them.

### Positive — UI/core separation unchanged

`DashboardView` remains a pure render of the view model and `DashboardPage`
remains the state/IO owner with an injected `HostingApi`. No new coupling.

### No code fix required

The language mutation and DRY runs were clean on the first pass; the only
architect change is the tool-generated manifest refresh.

### Observations — follow-ups (no change made)

1. **`DashboardPage.loadMore` still drops the loaded list on a later-page
   error.** Unchanged and already tracked as `dashboard-loadmore-error`.
2. **One intrinsic Gherkin soft-mutation survivor** (below), carried from
   `dashboard-table`.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/components/app-body/dashboard/dashboard-view.js` | 9 | 0 | 0 |
| `src/services/dashboard-page.js` | 5 | 0 | 0 |

## DRY (`dry4javascript`)

Scoped to the changed modules (`dashboard-view.js`, `dashboard-page.js`,
`clipboard.js`): **No duplicate candidates found** (exit 0).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, every analyzed function at **100%** coverage.
Maximum CRAP is **6.0** (`DashboardPage.loadMore`), at the target.

## Gherkin acceptance mutation (soft)

| Feature | Total | Killed | Survived |
|---------|-------|--------|----------|
| `bch-file-hosting-web/specs/web-dashboard.feature` | 34 | 33 | 1 |

The one survivor is the same intrinsic display-rounding equivalent documented
for `dashboard-table`: scenario 3, example 2, `api_size 1024 -> 1025` (m19),
where `formatSize` renders both as `1.02 KB`. The exact byte input is not
observable through the table. The manifest omits the surviving scenario, so it
will be re-mutated next run.

## Verification record

`swarmforge/scripts/verify.sh web --record
docs/reviews/dashboard-trim-columns-verification.json --task
dashboard-trim-columns`, `git_sha` = `4b92f17`:

- **web — pass (5/5):** unit **94 pass / 0 fail**, property **75 pass / 0
  fail**, build ok, acceptance **all 5 suites passed**, lint ok.

No integration/mainnet test was run.

## Suite status

`bch-file-hosting-web`: `npm test`, `npm run test:property`, `npm run build`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, `npm run lint` all
pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `dashboard-trim-columns`.
- No follow-up work assigned to coder or refactorer.

By architect.
