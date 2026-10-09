# Architect Review — reject-empty-upload

**Task:** `reject-empty-upload` (backlog S0, the four-role pipeline smoke test)
**Component:** `bch-file-hosting-api`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `5a665f5` | specifier | Add upload validation spec rejecting zero-byte files |
| `c4e767a` | coder | Reject zero-byte uploads |
| `eeb415c` | refactorer | Split `FileUpload.validate` into focused validators |
| `94186ed` | architect | Merge refactorer branch into `swarmforge-architect` |
| `1a91fdd` | architect | Harden: kill filename-validation mutation survivors; record manifests |

## Behavior

`FileUpload.validate` now requires a strictly positive integer `sizeBytes`
(`requirePositiveInteger`), so a 0-byte upload is rejected before any IPFS add,
invoice, or payment-address derivation. `FileUseCases.uploadAndQuote` maps the
entity error to `ValidationError` (HTTP 422) and still deletes the temp file in
its `finally`. A 0-byte request therefore produces `{ success: false, error }`
with no invoice and no address.

## Architectural findings

- **Positive:** The refactorer extracted the inline validation in
  `FileUpload.validate` into single-purpose helpers (`requireFilename`,
  `cleanFilename`, `requireUsableFilename`, `requirePositiveInteger`). This is
  the right direction for cohesion and local readability.
- **Positive:** The acceptance step drives the real `FileUseCases` through the
  production validation path with deterministic offline adapters; no network,
  filesystem, or framework leaks into the core assertion.
- **Positive:** Dependency direction is preserved — the entity stays pure
  (`path` only, no IO); the use-case owns the HTTP-meaningful `ValidationError`;
  the controller remains thin.
- **No structural fixes required.** The only architect changes were hardening
  tests and committing the tool-written manifests (no production behavior
  change).

## Mutation

`mutate4javascript src/entities/file-upload.js --max-workers 8` (via
`swarmforge/scripts/mutate-file.sh`, which reran with `--mutate-all` after
differential under-selection):

- **Round 1:** 7 killed, 2 survived (`requireUsableFilename` line 35
  `|| -> &&`; line 38 `> -> >=`).
- **Round 2 (after hardening tests):** **9 killed, 0 survived, 0 uncovered.**

The two survivors were pre-existing weak spots that the function extraction
made addressable; killed by boundary tests for filenames that clean to an empty
string, a single `.`, and exactly `MAX_FILENAME_LENGTH` (255) characters.

## DRY

`dry4javascript src/entities` and `dry4javascript src/entities/file-upload.js`:
**no duplicate candidates found** in the changed scope. The three pre-existing
component-wide duplicates (store `update`, controller response shape, use-case
constructor setup) are unchanged and remain tracked under backlog Q1.

## Cyclomatic complexity (CRAP, 100% coverage)

`crap4javascript src/entities/file-upload.js`:

| Function | CC | CRAP |
|----------|----|------|
| `requireUsableFilename` | 5 | 5.0 |
| `requireFilename` | 3 | 3.0 |
| `requirePositiveInteger` | 3 | 3.0 |
| `FileUpload.validate` | 2 | 2.0 |
| `isPaidFileStatus` | 2 | 2.0 |
| `cleanFilename` | 1 | 1.0 |

`FileUpload.validate` dropped from the Q1 baseline **CRAP 12 → 2**. All
functions are under the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

`gherkin-mutator --level soft --workers 8` on
`bch-file-hosting-api/specs/upload-validation.feature`: **1 killed, 1 survivor.**

- `http_status: 422 -> 419` — **killed**.
- `size_bytes: 0 -> -1` — **survived; intrinsic equivalent.** Both values are
  non-positive and fail the identical `requirePositiveInteger` branch with the
  same 422 and the same "positive integer" message, so no acceptance assertion
  (or production rule) can distinguish them. Documented rather than chased, as
  the APS mutator exposes no project filter hook.

## Verification record

`swarmforge/scripts/verify.sh api --record docs/reviews/reject-empty-upload-verification.json --task reject-empty-upload`

- **result: pass** (3/3, 1 skipped), `git_sha` = `1a91fdd` (the harden/review commit).
- unit: **337 passing**
- property: skipped (no `test:property` script yet — backlog Q1)
- acceptance: **all 2 generated suites passed** (pricing + upload-validation)
- lint: **ok**

## Suite status

`npm test`, `npm run test:acceptance`, and `npm run lint` all pass. No
integration/mainnet test was run.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <review-commit>`, task `reject-empty-upload`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
