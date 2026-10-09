# Architect Review — web-upload-quote-columns

**Task:** `web-upload-quote-columns` (make the new size-scenario setup columns load-bearing)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `d380348` | specifier | `specs/web-upload.feature`: scenarios 5 and 6 gain `shown_name`/`shown_sats`/`shown_address` columns and the existing "shows the file name / price / payment address" assertions; backlog |
| `bbe1a02` | architect | Refresh the tool-written Gherkin manifests (no source change) |

The branch fast-forwards through the specifier's `web-upload-size` completion
(`b3d84b4`).

The verification record `docs/reviews/web-upload-quote-columns-verification.json`
names `bbe1a02`. The review tip adds only `docs/`, so `git diff bbe1a02 <tip>`
touches only `docs/`.

## Behavior and scope

Spec-only follow-up to the `web-upload-size` review. Scenarios `Web Upload - 5`
and `Web Upload - 6` previously asserted only the size and billed-size lines, so
the `api_sats`, `api_address`, and `upload_name` setup columns were
mutation-inert (12 survivors). The specifier added the established assertions
`Then the page shows the file name <shown_name>` / `... the price
<shown_sats> satoshis` / `... the payment address <shown_address>` and the
matching `shown_*` columns to both scenarios. No step wording is new and no
handler changed; the existing `the page shows the file name / price / payment
address` handlers are reused.

## Architectural findings

### Positive — no production change was needed

This is a specification-only correction. The assertions reuse the existing
acceptance handlers and the existing page state machine (`quoteState` already
carries `filename`, `priceSats`, and `paymentAddress`), so no service, view, or
boundary moved. UI/core separation and dependency direction are untouched.

### Positive — every example column is now load-bearing

Each input column now has an independent assertion tied to it, so a mutated
setup value fails the corresponding `Then`. This closes the spec-quality gap
flagged in `docs/reviews/web-upload-size-summary.md` without adding redundant
parameters: the new `shown_*` columns mirror the inputs intentionally (mutating
either side kills the mutant).

No structural change was needed, and none was possible in this task's scope.

## Language mutation (`mutate4javascript`)

Not run. The task changed no source module (only `specs/web-upload.feature` and
the backlog), so there is no changed source file to mutate. The last per-module
runs remain valid: `file-upload-page.js` 13/0/0 and `upload-quote-view.js`
4/0/0 (`docs/reviews/web-upload-size-summary.md`).

## DRY (`dry4javascript`)

Not run. No source module changed; the `web-upload-size` scoped run already
reported no duplicate candidates for the feature modules. No new duplication can
be introduced by a feature-file edit.

## Cyclomatic complexity / CRAP

Not applicable: no source changed. The component maximum remains the
pre-existing `FileUploadPage.waitForConfirmation` at CRAP 5.0 with 100%
coverage.

## Gherkin acceptance mutation (soft)

`specs/web-upload.feature` (scenarios 5 and 6 changed; 1, 2, 4 unchanged):

- Differential soft mutation skipped the three clean scenarios (1, 2, 4;
  32 mutations) and re-ran the two changed scenarios.
- **38 total, 38 killed, 0 survived, 0 errors.**

The 12 unasserted-column survivors from `web-upload-size` are gone. Because the
run is fully clean, the mutator wrote a fresh `# mutation-stamp` and a complete
scenario manifest covering indexes 0, 1, 3, 4, and 5. Normal acceptance passed
all four suites (`web-upload`, `web-upload-transport`, `web-file-status`,
`web-payment`).

## Verification record

`swarmforge/scripts/verify.sh web --record docs/reviews/web-upload-quote-columns-verification.json --task web-upload-quote-columns`

- **result: pass (4/4)**, `git_sha` = `bbe1a02`.
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
  `merge_and_process architect <docs-commit>`, task `web-upload-quote-columns`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
