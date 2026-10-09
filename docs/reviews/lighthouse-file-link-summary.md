# Architect Review — lighthouse-file-link

**Task:** `lighthouse-file-link` (link files on the Lighthouse gateway; open image gateway links in a new tab)
**Components:** `bch-file-hosting-api`, `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `79bbe45` | specifier | `lighthouse-pinning.feature` scenario 3 now includes the filename (and a spaced name); new `web-payment.feature` scenario 8 (image link target); backlog |
| `acc1c3b` | coder | `PinningProvider.gatewayUrl(cid, filename)`; Lighthouse appends the encoded name; `buildLinks` passes the raw name; web `linkLine` takes a target and `paidChildren` opens images in a new tab |
| `f6b9b2d` | refactorer | Property suites for link building, the Lighthouse gateway name, and the image new-tab rule |
| `3560850` | architect | Refresh the tool-written mutation manifests (no source change) |

The branch fast-forwards through the specifier's `web-upload-quote-columns`
completion (`220bab8`).

Verification records (two components):
- `docs/reviews/lighthouse-file-link-api-verification.json` — `git_sha`
  `3560850`.
- `docs/reviews/lighthouse-file-link-web-verification.json` — `git_sha`
  `3560850`.

The review tip adds only `docs/`, so `git diff 3560850 <tip>` touches only
`docs/`.

## Behavior and scope

- **API:** `buildLinks` now passes the raw `filename` to each provider's
  `gatewayUrl`. The base `PinningProvider.gatewayUrl(cid, filename)` still
  returns `null`; `LighthouseProvider` appends `encodeURIComponent(filename)` to
  its gateway base (CIDs are wrapping directories), and falls back to the bare
  CID when no filename is given. Public gateway URLs already appended the
  encoded name.
- **Web:** the paid result renders a gateway link per URL; when the hosted file
  name has an image extension (`png|jpe?g|gif|webp|svg|bmp|avif`, case
  insensitive) the link opens in a new tab, otherwise it keeps the default
  target.

## Architectural findings

### Positive — the provider interface extension is consistent and contained

- `PinningProvider.gatewayUrl(cid, filename)` documents that a provider serving
  the file itself should use the filename. `LighthouseProvider` is the only
  override; `local-helia` inherits the base `null`, so no provider is
  inconsistent.
- URL encoding stays where it belongs: the use-case passes the raw filename and
  each provider owns its own URL scheme. The public-gateway branch and the
  Lighthouse adapter both `encodeURIComponent`, so a name with a space or
  `/`/`..` cannot escape the requested path.
- Dependency direction is unchanged: use-case → provider adapter, and web
  view → page state machine → injected API adapter.

### Positive — the web rule is a small, testable predicate

`isImageName` is a pure function in the presentational view; `linkLine` gained
one optional argument. The unit tests cover image and non-image, and the
property test covers all eight extensions plus non-image and extension-spoof
names (`jpg.txt`, `png.js`, `jpeg.html`). The rule is a display decision and is
correctly kept out of the API.

### Observation — new-tab link lacks `rel` (minor)

The gateway link sets `target="_blank"` without `rel`. Every other
`target="_blank"` anchor in `bch-file-hosting-web` uses `rel='noreferrer'` (or
`'noopener noreferrer'`). Modern browsers imply `noopener` for `_blank`, so
there is no practical reverse-tabnabbing risk, but for consistency and defense
in depth a coder follow-up should add `rel='noreferrer'` (with a unit
assertion). Not fixed here because it is outside the task's specified behavior.

No structural change was needed.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| Component | File | Killed | Survived | Uncovered |
|-----------|------|--------|----------|-----------|
| api | `src/use-cases/links.js` | 0 | 0 | 0 (0 total sites) |
| api | `src/adapters/pinning/lighthouse.js` | 14 | 0 | 0 |
| api | `src/adapters/pinning/pinning-provider.js` | 0 | 0 | 0 (0 total sites) |
| web | `src/components/app-body/file-hosting/upload-quote-view.js` | 5 | 0 | 0 |

`links.js` and `pinning-provider.js` have no mutable operators (confirmed by the
tool's `Total mutation sites: 0`), so the zeros are structural. `lighthouse.js`
and `upload-quote-view.js` carried stale manifests; the differential runs
under-selected and `mutate-file.sh` reran each with `--mutate-all`. No survivors
and no uncovered sites; the tool refreshed every manifest.

## DRY (`dry4javascript`)

Scoped to the changed modules in each component: **No duplicate candidates
found** (exit 0 for both). The task introduced no duplication.

## Cyclomatic complexity / CRAP

`npm run crap` in both components → **exit 0**, all functions at **100%**
coverage.

| Component | Changed function | CC | CRAP |
|-----------|------------------|----|------|
| api | `buildLinks` | 3 | 3.0 |
| api | `LighthouseProvider.gatewayUrl` | 2 | 2.0 |
| api | `PinningProvider.gatewayUrl` | 1 | 1.0 |
| web | `paidChildren` | 4 | 4.0 |
| web | `isImageName` | 2 | 2.0 |
| web | `linkLine` | 2 | 2.0 |

Component maxima are the pre-existing `6.0` (api) and `5.0` (web), below the
CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

### API — `specs/lighthouse-pinning.feature`

- **15 total, 13 killed, 2 survived, 0 errors**; 1 clean scenario skipped
  (1 mutation).
- The changed scenario 3 (gateway URL + encoded name) is **6/6 killed**.
- The 2 survivors are the same pre-existing P5.2 intrinsic equivalents, in
  **unchanged** scenarios 1 and 2:
  - `api_cid` in scenario 1 is both the API-reported CID and the expected
    stored CID (input echoed as output), and
  - `http_status 500 -> 492` in scenario 2 still maps to `failed` (any 4xx/5xx
    does).
  No action; already documented in `docs/reviews/lighthouse-provider-summary.md`.

### Web — `specs/web-payment.feature`

- **10 total, 5 killed, 5 survived, 0 errors**; 5 clean scenarios skipped
  (50 mutations). All 10 mutations are in the new scenario 8.
- Killed (5): both `paid_gateway_url` cells, both `shown_gateway_url` cells, and
  the `shown_target _blank` cell — the asserted link/target behavior.
- Survived (5), all in scenario 8:
  - `paid_cid` (rows 0 and 1): the scenario never asserts the CID.
  - `paid_name` (rows 0 and 1): the mutations (`photo.jpg -> pHoto.jpg`,
    `archive.tar -> archivextar`) preserve the image/non-image classification,
    and the scenario never asserts the shown file name.
  - `shown_target none -> value` (row 1): intrinsic — the handler treats any
    value other than `_blank` as the default target.

**Specifier follow-up (scenario 8):** assert the paid CID (`Then the page shows
the CID <shown_cid>`) and the shown file name (`Then the page shows the paid
file name <shown_name>`), and their `shown_*` columns, so the `paid_cid` and
`paid_name` columns are load-bearing. The `shown_target` sentinel is an
intrinsic equivalent (the handler's default branch accepts any non-`_blank`
string).

Normal acceptance passed all suites in both components.

## Verification records

- `swarmforge/scripts/verify.sh api --record docs/reviews/lighthouse-file-link-api-verification.json --task lighthouse-file-link`
  — **pass (4/4)**: unit **393**, property **22**, acceptance **all 5 suites**, lint **ok**; `git_sha` `3560850`.
- `swarmforge/scripts/verify.sh web --record docs/reviews/lighthouse-file-link-web-verification.json --task lighthouse-file-link`
  — **pass (4/4)**: unit **64**, property **58**, acceptance **all 4 suites**, lint **ok**; `git_sha` `3560850`.

No integration/mainnet test was run.

## Suite status

`bch-file-hosting-api` and `bch-file-hosting-web`: `npm test`,
`npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `lighthouse-file-link`. The
  new-tab `rel` observation and the web scenario-8 survivor follow-up above are
  the carry-forward items.
- No follow-up work assigned to coder/refactorer in this batch, so no
  priority-00 handoffs.

By architect.
