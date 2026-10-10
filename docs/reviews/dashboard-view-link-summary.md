# Architect Review — dashboard-view-link

**Task:** `dashboard-view-link` (report feed gateway URLs; add a dashboard View column)
**Components:** `bch-file-hosting-api`, `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-10

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `5c0433e` | specifier | Add a `View` column and feed gateway URLs to the specs |
| `9278abc` | coder | Publish feed `gatewayUrls`; add the dashboard View column |
| `835cb28` | refactorer | Share the dashboard link-cell assertion; tidy the feed comment |
| `1dbeae1` | architect | Refresh the feed and dashboard mutation manifests |

The branch fast-forwards through the previous review tip `7447ff7`. Each
component's verification record names `1dbeae1`; the review tip adds only
`docs/`.

## Behavior and scope

- **API `GET /files`:** each published file now carries `gatewayUrls`, built
  from `config.publicGateways` (each prefix + CID + URL-encoded file name) plus
  any provider gateway. `buildGatewayUrls` was extracted from `buildLinks` and
  is now shared by both call sites; `FileUseCases.listFeed` passes its injected
  `config` through `paginateFeed` to `toFeedFile`.
- **Web `/dashboard`:** a `View` column links the first gateway URL in a new
  tab (`target="_blank" rel="noreferrer"`). `toDashboardFile` maps
  `gatewayUrls[0]` to `viewUrl` (empty when the feed reports none), and the view
  renders an empty cell in that case.

## Architectural findings

### Positive — one gateway-URL rule, two callers

`buildLinks` previously built the gateway list inline. Extracting
`buildGatewayUrls` and having both the paid-result links and the public feed use
it removes the duplicated prefix/encoding rule, and the feed no longer has to
reach into the provider list itself. `publicGateways` is now defaulted, so a
feed built without config degrades to an empty list instead of throwing.

### Positive — dependency direction preserved

The API derives the URLs inside the use-case from injected config (`config` is
passed down through `paginateFeed`), and the web page service derives `viewUrl`
from the feed shape before handing a plain view model to the presentational
view. No framework or IO leaks into either boundary, and the `View` anchor is
the only `_blank` link added and it carries `rel="noreferrer"`.

### No code fix required

Language mutation and DRY were clean on the first pass in both components; the
only architect change is the tool-generated manifest refresh.

### Observations — follow-ups (no change made)

1. **Web scenario 2 `filename` columns are unasserted** (3 soft-mutation
   survivors, below). The View-link assertion reads the independently supplied
   `api_gateway_url`, so the feed record's `filename` is not load-bearing. Fix
   by asserting the File Name cell (add a `shown_name` column plus a cell
   handler) or by dropping the `filename` column from the example table. This is
   the same class as the tracked CLI `upload_path` / `web-payment` `paid_name`
   spec-quality follow-ups.
2. **Five intrinsic `file-feed` limit/cursor survivors carry over** from
   `web-dashboard` (the exact invalid value is not load-bearing).
3. **One intrinsic display-rounding survivor** in `web-dashboard.feature`
   scenario 3 (`api_size 1024 -> 1025`), carried from `dashboard-table`.
4. **`DashboardPage.loadMore` still drops the loaded list on a later-page
   error.** Already tracked as `dashboard-loadmore-error`.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| Component | File | Killed | Survived | Uncovered |
|-----------|------|--------|----------|-----------|
| api | `src/use-cases/links.js` | 1 | 0 | 0 |
| api | `src/use-cases/file-feed.js` | 22 | 0 | 0 |
| api | `src/use-cases/file-use-cases.js` | 8 | 0 | 0 |
| web | `src/components/app-body/dashboard/dashboard-view.js` | 9 | 0 | 0 |
| web | `src/services/dashboard-page.js` | 8 | 0 | 0 |

## DRY (`dry4javascript`)

Scoped to the changed modules in each component: **No duplicate candidates
found** (exit 0 in both).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0** in both components, every analyzed function at
**100%** coverage. Maximum CRAP is **6.0**: `calculatePrice` (api) and
`DashboardPage.loadMore` (web), both at the target.

## Gherkin acceptance mutation (soft)

| Component | Feature | Total | Killed | Survived |
|-----------|---------|-------|--------|----------|
| api | `specs/file-feed.feature` | 67 | 62 | 5 |
| web | `specs/web-dashboard.feature` | 43 | 39 | 4 |

API survivors (all intrinsic, carried over):
`limit 10 -> 11`, `limit 0 -> -5`, `limit 101 -> 109`, `limit abc -> Abc`, and
`bad_cursor not-a-cursor -> not-a-Cursor` — every invalid input maps to the same
422 message and `10` already exceeds the three-file feed.

Web survivors: the three scenario-2 `filename` cells (`photo.jpg -> phOto.jpg`,
`notes.txt -> nOtes.txt`, `archive.tar -> archive.Tar`) are unasserted columns
(observation 1), and `api_size 1024 -> 1025` is the intrinsic rounding
equivalent (observation 3). The surviving scenarios are omitted from the
manifests, so they will be re-mutated next run.

## Verification records

`swarmforge/scripts/verify.sh` for both components, `--task
dashboard-view-link`, `git_sha` = `1dbeae1`:

- **api — pass (4/4):** unit **462 passing**, property **36 passing**,
  acceptance **all 8 suites passed**, lint ok.
- **web — pass (5/5):** unit **97 pass / 0 fail**, property **75 pass / 0
  fail**, build ok, acceptance **all 5 suites passed**, lint ok.

Records: `docs/reviews/dashboard-view-link-api-verification.json`,
`docs/reviews/dashboard-view-link-web-verification.json`. No
integration/mainnet test was run.

## Suite status

`bch-file-hosting-api` and `bch-file-hosting-web`: `npm test`,
`npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, `npm run lint` all pass (the web component also passes
`npm run build`).

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `dashboard-view-link`.
- No follow-up work assigned to coder or refactorer. Observation 1 is the
  spec-quality carry-forward.

By architect.
