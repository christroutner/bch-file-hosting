# Architect Review — dashboard-table

**Task:** `dashboard-table` (redesign the hosted-files dashboard as a Bootstrap table)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `3d56efb` | specifier | Rewrite `web-dashboard.feature` around a table and row-level cells |
| `321bc03` | coder | Render the dashboard as a Bootstrap table, add the copy control and download cell |
| `56220ff` | refactorer | Extract the clipboard adapter; de-duplicate the cell assertions |
| `74f2a39` | architect | **Fix:** kill the mutation survivors; refresh manifests |

The branch fast-forwards through `master` `4eb675d` (`web-build-compile`
completion). The verification record names `74f2a39`; the review tip adds only
`docs/`.

## Behavior and scope

- `DashboardView` (presentational) renders the `DashboardPage` display state as
  a Bootstrap table: one row per file with File Name, Size, Status, Pins, Paid,
  Hosted Until, CID (truncated with a copy control), and Download. It still uses
  plain `React.createElement`, so the browser page and the Node acceptance run
  render the exact same view.
- `DashboardPage` now owns the download URL (`downloadUrl(base, cid)`), so the
  view only renders `file.downloadUrl` instead of rebuilding URLs.
- `src/services/clipboard.js` is a new output adapter around the browser
  clipboard; `copyToClipboard` is injectable and a no-op when no clipboard
  exists.

## Architectural findings

### Positive — UI/core separation

The view is a pure render of a plain view model and holds no IO or state; the
page service owns the feed state, the cursor, and the URL construction, and
takes the `HostingApi` through the constructor. The clipboard write is behind an
adapter (`clipboard.js`) rather than inside the view, and the click handler is
inert during server-side rendering, so the acceptance run never needs a browser.

### Positive — information hiding

`toDashboardFile` still reduces each feed record to exactly the fields the table
shows, and `downloadUrl` strips trailing slashes from the base before joining.
Both remain testable without the DOM.

### Fix — mutation survivors killed

Three language-mutation survivors were killed without touching production
behavior:

- `dashboard-view.js` `formatSize` (`< -> <=`, boundary at 1000 bytes): added
  the `1000 -> 1.00 KB` unit assertion.
- `dashboard-view.js` `truncateCid` (`<= -> <`, boundary at 16 chars): added
  the exactly-16-character assertion.
- `clipboard.js` `defaultClipboard` (`&& -> ||`): exported `defaultClipboard`
  and added a unit assertion that it returns `null` (not `undefined`) when the
  environment provides no clipboard. The export is a testability seam only; it
  does not change production behavior.

`swarmforge/scripts/mutate-file.sh` refreshed the per-file manifests.

### Observations — follow-ups (no change made)

1. **`DashboardPage.loadMore` still drops the loaded list on a later-page
   error.** This is unchanged and already tracked as `dashboard-loadmore-error`
   in the backlog; it is not a regression against this spec.
2. **One intrinsic Gherkin soft-mutation survivor** (below).

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`
(`--mutate-all` rerun where differential selection under-covered).

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/services/clipboard.js` | 2 | 0 | 0 |
| `src/services/dashboard-page.js` | 6 | 0 | 0 |
| `src/components/app-body/dashboard/dashboard-view.js` | 10 | 0 | 0 |

Before the fix: `clipboard.js` was 1/1 (`defaultClipboard` `&& -> ||`),
`dashboard-view.js` was 8/2 (`formatSize` `< -> <=`, `truncateCid` `<= -> <`),
`dashboard-page.js` was already 6/0. All are now killed.

## DRY (`dry4javascript`)

Scoped to the changed modules
(`dashboard-view.js`, `dashboard-page.js`, `clipboard.js`): **No duplicate
candidates found** (exit 0).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, every analyzed function at **100%** coverage.
Maximum CRAP is **6.0** (`DashboardPage.loadMore`), at (not above) the CRAP 6
target.

## Gherkin acceptance mutation (soft)

| Feature | Total | Killed | Survived |
|---------|-------|--------|----------|
| `bch-file-hosting-web/specs/web-dashboard.feature` | 49 | 48 | 1 |

The one survivor is an intrinsic display-rounding equivalent: scenario 3,
example 2, `api_size 1024 -> 1025` (m34). `formatSize` renders two decimal
places, so `1024` and `1025` both render `1.02 KB`; the exact byte input is not
observable through the table. The run wrote the manifest and omitted the
scenario with the survivor, so it will be re-mutated next run. Killing it would
only be possible by moving the example to a value whose deterministic mutation
crosses a rounding boundary; that is a spec-quality choice for the specifier,
not a production defect.

## Verification record

`swarmforge/scripts/verify.sh web --record
docs/reviews/dashboard-table-verification.json --task dashboard-table`,
`git_sha` = `74f2a39`:

- **web — pass (5/5):** unit **95 pass / 0 fail**, property **75 pass / 0
  fail**, build ok, acceptance **all 5 suites passed**, lint ok.

No integration/mainnet test was run (it needs the network and real BCH).

## Suite status

`bch-file-hosting-web`: `npm test`, `npm run test:property`, `npm run build`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, `npm run lint` all
pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `dashboard-table`.
- No follow-up work assigned to coder or refactorer. The two observations above
  are the carry-forward items.

By architect.
