# Architect Review — web-upload-size

**Task:** `web-upload-size` (show the selected file size and a separate billed size on the web quote)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `c848678` | specifier | `specs/web-upload.feature`: scenarios 5 and 6 (separate billed size; no billed line at/above the minimum); backlog |
| `f101108` | coder | Normalize `sizeBytes`/`billedBytes` in `quoteState`; render the optional size / billed-size lines in `quoteChildren`; unit tests; acceptance handlers |
| `1ccf906` | refactorer | Extract `optionalNumber` (`quoteState` CRAP 7.0 → 5.0); property tests for the size and billed-size paths |
| `e9593f7` | architect | Refresh the tool-written mutation manifests (no source change) |

The branch fast-forwards through the specifier's `web-upload-transport`
completion (`dc725bb`).

The verification record `docs/reviews/web-upload-size-verification.json` names
`e9593f7`. The review tip adds only `docs/`, so `git diff e9593f7 <tip>` touches
only `docs/`.

## Behavior and scope

A quote now carries the API's `sizeBytes` and `billedBytes` when reported. The
quote view shows a `Size: <n> bytes` line whenever a size is reported, and a
second `Billed size: <n> bytes` line only when the billed size differs from the
selected size (i.e. billing rounded the file up to `MIN_BILLED_BYTES`). A file
at or above the billing minimum shows a single size line. `undefined`/`null`
size fields are treated as "not reported" and produce no line.

## Architectural findings

### Positive — normalization stays in the service, formatting in the view

- `optionalNumber` lives in `src/services/file-upload-page.js` and keeps the
  view model carrying only numbers (or omitting the key). The presentational
  `quoteChildren` reads presence and equality only; it never parses API input.
- UI/core separation and dependency direction are unchanged: view → page state
  machine → injected `hostingApi`. No new IO or framework detail crosses a
  boundary.
- Extracting `optionalNumber` removed the inline null handling and made the
  "only reported sizes are kept" invariant explicit and independently covered
  by a property suite.

### Positive — the added property tests cover the boundary

`test/property/file-upload-page.property.js` covers reported, `null`, and
`undefined` sizes; `test/property/upload-quote-view.property.js` covers the
presence rule (`size` line iff reported; `billed` line iff reported and
different). Both match the unit tests, so the new conditional rendering is
covered from both directions.

No structural change was needed.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/services/file-upload-page.js` | 13 | 0 | 0 |
| `src/components/app-body/file-hosting/upload-quote-view.js` | 4 | 0 | 0 |

Both files carried stale manifests; the differential runs under-selected (3 of
13 and 1 of 4) and `mutate-file.sh` reran each with `--mutate-all`. No survivors
and no uncovered sites. The tool refreshed both manifests.

## DRY (`dry4javascript`)

Scoped to the changed modules:
`dry4javascript src/services/file-upload-page.js src/components/app-body/file-hosting/upload-quote-view.js`
→ **No duplicate candidates found** (exit 0). The two size lines share a shape
but differ in class/label and fall below the candidate threshold; the task
introduced no duplication.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, every function at **100%** coverage. The changed
functions are `quoteState` CRAP 5.0, `quoteChildren` CRAP 5.0 (down from 7.0),
`optionalNumber` 3.0, `paidChildren` 3.0. Component maximum is the pre-existing,
unchanged `FileUploadPage.waitForConfirmation` at 5.0, below the CRAP 8
threshold.

## Gherkin acceptance mutation (soft)

`specs/web-upload.feature` now has scenarios 1–6. Differential soft mutation
skipped the three unchanged, previously-clean scenarios (1, 2, 4; 32 mutations)
and re-ran the two new scenarios:

- **26 total, 14 killed, 12 survived, 0 errors.**

All 12 survivors are unasserted example columns in scenarios 5 and 6:

| Scenario | Column | Rows | Why it survives |
|----------|--------|------|-----------------|
| Web Upload - 5 | `api_address` | 2 | no `Then` asserts the payment address |
| Web Upload - 5 | `api_sats` | 2 | no `Then` asserts the price |
| Web Upload - 5 | `upload_name` | 2 | no `Then` asserts the file name |
| Web Upload - 6 | `api_address` | 2 | no `Then` asserts the payment address |
| Web Upload - 6 | `api_sats` | 2 | no `Then` asserts the price |
| Web Upload - 6 | `upload_name` | 2 | no `Then` asserts the file name |

The two scenarios assert only `api_size`/`api_billed`/`shown_size`/
`shown_billed`, so the setup-only columns are mutation-inert. This is the same
unasserted-example-column class already tracked in the backlog (the CLI
`upload_path` and pin-retry `cid` columns; specifier gotcha #19). Because the
run had survivors, the mutator wrote no feature `# mutation-stamp` and left
scenarios 5–6 out of the manifest — expected per `tmp/aps/mutator-spec.md`
(stamps/manifests record only clean scenarios).

**Specifier follow-up:** make `api_address`, `api_sats`, and `upload_name`
load-bearing in scenarios 5 and 6 (add the corresponding `Then ... shows the
payment address / price / file name` assertions) or move the setup to fixed
values so the columns can be pruned. Until then those 12 survivors recur on
every soft/hard run.

Normal acceptance passed all four suites (`web-upload`, `web-upload-transport`,
`web-file-status`, `web-payment`).

## Verification record

`swarmforge/scripts/verify.sh web --record docs/reviews/web-upload-size-verification.json --task web-upload-size`

- **result: pass (4/4)**, `git_sha` = `e9593f7`.
- unit: **62 passing**.
- property: **57 passing** (kept out of unit coverage).
- acceptance: **all 4 generated suites passed**.
- lint: **ok**.

No integration/mainnet test was run; none exists for the web component.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-web`.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `web-upload-size`. The
  unasserted-column follow-up above is the carry-forward item.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
