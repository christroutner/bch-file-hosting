# Architect Review — feed-provider-gateway

**Task:** `feed-provider-gateway` (include provider gateway URLs in the public file feed)
**Component:** `bch-file-hosting-api`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-10

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `a05f414` | specifier | Specify provider gateway URLs in `file-feed.feature` (scenario 7) |
| `48b5315` | coder | Append provider gateway URLs to the feed |
| `7b4d8b5` | refactorer | Cover provider gateway composition in the feed property suite |
| `c991cdf` | architect | Refresh the file feed mutation manifests |

The branch fast-forwards through the previous review tip `c695325`. The
verification record names `c991cdf`; the review tip adds only `docs/`.

## Behavior and scope

- `FileUseCases.listFeed` now passes the active providers
  (`this.adapters.pinning.getProviders()`) through `paginateFeed` into
  `toFeedFile`, so each published feed file's `gatewayUrls` is the configured
  public gateways plus each provider's `gatewayUrl(cid, filename)`.
- `toFeedFile`/`paginateFeed` gained an optional `providers` argument
  (default `[]`); a provider that returns no URL contributes none.

## Architectural findings

### Positive — dependency direction

The use-case composes the provider gateway URLs through the pinning registry's
stable `getProviders()` abstraction; it never imports or names a concrete
provider. `buildGatewayUrls` remains the single place the `prefix + cid +
encoded name` rule lives, and the provider loop keeps its null guard.

### Positive — optional dependencies stay optional

`providers` defaults to `[]` in both `toFeedFile` and `paginateFeed`, so a feed
built without the registry still renders the public gateways and the unit /
property suites can exercise composition in isolation.

### No code fix required

Language mutation and DRY were clean on the first pass; the only architect
change is the tool-generated manifest refresh.

### Observations — follow-ups (no change made)

1. **Five intrinsic `file-feed` limit/cursor survivors carry over** (below);
   the exact invalid value is not load-bearing.
2. **`DashboardPage.loadMore` still drops the loaded list on a later-page
   error** (`dashboard-loadmore-error`, web side, not touched here).
3. **The web scenario-2 `filename` unasserted columns** flagged by
   `dashboard-view-link` remain a spec-quality carry-forward.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/use-cases/file-feed.js` | 22 | 0 | 0 |
| `src/use-cases/file-use-cases.js` | 8 | 0 | 0 |

## DRY (`dry4javascript`)

Scoped to the changed modules: **No duplicate candidates found** (exit 0).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, every analyzed function at **100%** coverage.
Maximum CRAP is **6.0** (`calculatePrice`), at the target.

## Gherkin acceptance mutation (soft)

| Feature | Total | Killed | Survived |
|---------|-------|--------|----------|
| `bch-file-hosting-api/specs/file-feed.feature` | 73 | 68 | 5 |

The new scenario 7 (provider gateway) is clean. The five survivors are the
intrinsic limit/cursor values carried from `web-dashboard`:
`limit 10 -> 11`, `limit 0 -> -5`, `limit 101 -> 109`, `limit abc -> Abc`, and
`bad_cursor not-a-cursor -> not-a-Cursor` — every invalid input maps to the same
422 message and `10` already exceeds the three-file feed. The manifest omits
the surviving scenarios, so they will be re-mutated next run.

## Verification record

`swarmforge/scripts/verify.sh api --record
docs/reviews/feed-provider-gateway-verification.json --task
feed-provider-gateway`, `git_sha` = `c991cdf`:

- **api — pass (4/4):** unit **464 passing**, property **37 passing**,
  acceptance **all 8 suites passed**, lint ok.

No integration/mainnet test was run.

## Suite status

`bch-file-hosting-api`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, `npm run lint` all
pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `feed-provider-gateway`.
- No follow-up work assigned to coder or refactorer.

By architect.
