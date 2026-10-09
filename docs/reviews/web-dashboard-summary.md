# Architect Review — web-dashboard

**Task:** `web-dashboard` (public file feed + hosted-files dashboard)
**Components:** `bch-file-hosting-api`, `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `24b6f2b` | specifier | `file-feed.feature`, `web-dashboard.feature`, backlog |
| `3a18cb9` | coder | `GET /files` public feed + the web `/dashboard` view |
| `0618ccd` | refactorer | Refactor the feed and dashboard for a clean quality baseline |
| `35e6953` | architect | **Fix:** reuse the sort comparator for the cursor; cover the cursor edge cases; refresh manifests |

The branch fast-forwards through `master` `6e3441f` (the specifier's
`lighthouse-upload-verify` completion). The verification record names `35e6953`;
the review tip adds only `docs/`.

## Behavior and scope

- **API `GET /files`:** the public file feed. Only paid files (`pinning`,
  `pinned`, `pinFailed`) are published, newest paid first with a CID
  tie-break. `limit` accepts the integers 1..100 (default 20); paging uses an
  opaque `base64url` cursor carrying the last item's `{paidAt, cid}`. The feed
  exposes only public fields and reduces every pin to `{provider, status}`.
  An invalid limit or cursor raises `ValidationError` (HTTP 422).
- **Web `/dashboard`:** `DashboardPage` loads the feed through the injected
  `HostingApi`, owns the list state and the Refresh / Load-more actions;
  `DashboardView` renders it with `React.createElement`. `HostingApi.request`
  centralizes the API error contract, and `buildFeedQuery` omits absent
  options so the API applies its own defaults.

## Architectural findings

### Positive — UI/core separation and dependency direction

The feed is a pure use-case (`src/use-cases/file-feed.js`) with no IO; the
controller reads the store through the use-case, which reads
`localdb.files`. The web dashboard is a service with an injected adapter plus
a presentational view, so both are testable without a browser or network.

### Positive — information hiding at the boundary

`toFeedFile` publishes only the public fields and drops unpaid records; the
cursor is opaque to callers. The dashboard reduces the same shape again in
`toDashboardFile`. Private fields (HD index, invoice amounts) never cross the
boundary.

### Fix — pagination now shares the sort comparator

`isAfterCursor` re-implemented the newest-first ordering with `Date.parse`
subtraction and a separate CID comparison. That duplicated the ordering rule
and left two equivalent mutants (a `< 0` guarded by `!== 0`, and a `0 -> 1`
constant). It now derives directly from `byPaidNewestFirst`:

```js
function isAfterCursor (file, cursor) {
  return byPaidNewestFirst(file, cursor) > 0
}
```

Pagination and ordering can no longer disagree, the duplicated rule is gone,
and all mutants in the function are killed. Added unit tests for a
same-paid-time page and a one-millisecond paid-time gap (API), plus a
dashboard cursor spanning more than two pages (web).

### Observations — follow-ups (no change made)

1. **The feed loads and sorts in memory.** `FileUseCases.listFeed` reads every
   file record and paginates the array in the use-case. Correct at the current
   scale; a status/date range index in `FileStore` is the fix if the feed grows.
   Not a task.
2. **`DashboardPage.loadMore` drops the loaded list on a later-page error.** A
   failed Load-more replaces the whole view with the error state instead of
   keeping the files already shown. Worth a future spec decision; there is no
   behavior regression against the current spec.
3. **Five intrinsic Gherkin survivors** in `file-feed.feature` (below).

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| Component | File | Killed | Survived | Uncovered |
|-----------|------|--------|----------|-----------|
| api | `src/use-cases/file-feed.js` | 22 | 0 | 0 |
| api | `src/use-cases/file-use-cases.js` | 8 | 0 | 0 |
| api | `src/controllers/rest-api/files/controller.js` | 1 | 0 | 0 |
| api | `src/controllers/rest-api/files/index.js` | 1 | 0 | 0 |
| web | `src/services/dashboard-page.js` | 6 | 0 | 0 |
| web | `src/services/hosting-api.js` | 6 | 0 | 0 |
| web | `src/components/app-body/dashboard/dashboard-view.js` | 5 | 0 | 0 |

Before the fix `file-feed.js` was 21 killed / 3 survived (`!== 0`,
`< -> <=`, `0 -> 1`) and `dashboard-page.js` was 5 / 1 (`|| -> &&` on
`page.nextCursor || null`). All are now killed; the tool refreshed every
manifest.

## DRY (`dry4javascript`)

Scoped to the changed modules in each component: **No duplicate candidates
found** (exit 0).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0** in both components, every function at **100%**
coverage. Maximum CRAP is **6.0**: `parsePageLimit` (api) and
`DashboardPage.loadMore` (web), both at (not above) the CRAP 6 target.

## Gherkin acceptance mutation (soft)

| Feature | Total | Killed | Survived | Note |
|---------|-------|--------|----------|------|
| `bch-file-hosting-api/specs/file-feed.feature` | 59 | 54 | 5 | intrinsic, below |
| `bch-file-hosting-web/specs/web-dashboard.feature` | 43 | 43 | 0 | stamp + manifest written |

The five API survivors are all the intrinsic "the exact invalid input is not
load-bearing" class:

- `limit 10 -> 11` (scenario 1): both values exceed the three-file feed, so
  the listed CIDs are unchanged.
- `limit 0 -> -5`, `101 -> 109`, `abc -> Abc` (scenario 3): every invalid
  limit maps to the same 422 message.
- `bad_cursor not-a-cursor -> not-a-Cursor` (scenario 4): every non-cursor
  token maps to the same `Cursor is not valid`.

No behavior regression; these need no assertion unless the error were made
value-specific. The web feature run was clean, so its manifest and stamp are
present. The API feature keeps only its clean scenarios in the manifest.

## Verification record

`swarmforge/scripts/verify.sh` for both components,
`--task web-dashboard`, `git_sha` = `35e6953`:

- **api — pass (4/4):** unit **461 passing**, property **35 passing**,
  acceptance **all 8 suites passed**, lint ok.
- **web — pass (4/4):** unit **83 pass / 0 fail**, property **73 pass / 0
  fail**, acceptance **all 5 suites passed**, lint ok.

Records: `docs/reviews/web-dashboard-api-verification.json`,
`docs/reviews/web-dashboard-web-verification.json`. No integration/mainnet
test was run (it needs the network and real BCH).

## Suite status

`bch-file-hosting-api`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, `npm run lint` all
pass. `bch-file-hosting-web`: same six, all pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `web-dashboard`.
- No follow-up work assigned to coder or refactorer, so no priority-00
  handoffs. The three observations above are the carry-forward items.

By architect.
