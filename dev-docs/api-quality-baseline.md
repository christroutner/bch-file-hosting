# bch-file-hosting-api Quality Baseline (Q1)

**Task name:** `api-quality-baseline`
**Owner:** specifier (specification/routing); refactorer (CRAP, DRY, property
tests); architect (language mutation, verification, record).
**Status:** DRAFT — awaiting user approval to hand off.
**Backlog item:** Q1 in `specs/feature-backlog.md`.

Q1 is a quality/verification deliverable, not runtime behavior. There is **no
Gherkin feature and no Gherkin acceptance mutation** for this task; the
architect verifies against the checklist below. `swarmforge/scripts/verify.sh
api` must pass its existing suites unchanged. This follows the psf-memo
precedent for quality tasks (`cli-quality-hardening`, `cli-quality-audit`).

## Goal

Lock a whole-component language-quality baseline across `bch-file-hosting-api/`
before further feature work (third-party pinning, CLI, web UI) adds surface
area. The core port and the S0 smoke test left unit coverage at 100% but left
CRAP, DRY, language mutation, and property testing unmeasured or red.

## Current evidence (specifier, 2026-10-09, `master` `6ef85fd`)

Measured with `npm test` (the permitted test run; the specifier does not run
quality tools):

- Unit: **337 passing**.
- Coverage: statements/branches/functions/lines **100%** (no uncovered line).
- Gherkin acceptance: 2 feature suites pass (`pricing`, `upload-validation`).
- Lint: clean.
- CRAP (last measured 2026-10-08, pre-S0 backlog): >6 for
  `Invoice.validate` 12, `CleanupUseCases.deleteUnpaid` 7,
  `FileUseCases.uploadAndQuote` 7, `PaymentUseCases.checkPaymentUnlocked` 7.
  `FileUpload.validate` was 12 but **S0 reduced it to 2** (see
  `docs/reviews/reject-empty-upload-summary.md`). The refactorer must
  re-measure rather than trust this list.
- DRY (last measured 2026-10-08): `FileStore.update` / `InvoiceStore.update`;
  the admin/files controller response pattern; the `FileUseCases` /
  `PaymentUseCases` constructor setup.
- Language mutation: **no baseline yet.** No manifest exists.
- Property tests: **none.** `bch-file-hosting-api/package.json` has no
  `test:property` script, so `verify.sh api` records it as skipped.

## Required final state (acceptance criteria)

1. `npm test` — every unit test passes with **100% statements, branches,
   functions, and lines**.
2. `npm run test:property` — every property test passes, and
   `verify.sh api` records the `property` command as **run** (not skipped).
3. `npm run test:acceptance` — every generated Gherkin acceptance suite passes.
4. `npm run crap` — **exit 0**, and every source file's CRAP ≤ 6.0.
5. `npm run dry` — no duplicate candidates. Accepted exceptions are allowed
   only with a written rationale in the architect's review summary.
6. Language mutation across `src/` — **0 survived / 0 uncovered**; intrinsic
   equivalent survivors must be documented in the review summary, not silently
   accepted.
7. `npm run lint` — clean.
8. `swarmforge/scripts/verify.sh api --record docs/reviews/api-quality-baseline-verification.json
   --task api-quality-baseline` — pass 4/4 (unit, property, acceptance, lint),
   record committed.
9. **Behavior must not change.** No new endpoint, response field, status,
   config key, error code, or lifecycle transition. Every existing unit and
   acceptance test keeps passing without changing an assertion.

## Scope

- Every file under `bch-file-hosting-api/src/` plus `bin/` and `config/`.
- The unit suite (`test/unit/`) and the new property suite (`test/property/`).
- The Gherkin acceptance pipeline (`acceptance/`) as run by `verify.sh api`.

Out of scope:

- New runtime behavior, endpoints, dependencies that ship to production, or
  config keys.
- Third-party pinning providers (phase 5, P5.x).
- Gherkin acceptance mutation (there is no feature file for this task).
- Property tests for modules that open GUIs, depend on external devices,
  throw environment errors, emit system errors, or hang under automated tests.
  Only testable modules participate.

## Work breakdown

### Refactorer

- Run `npm run crap`; reduce every file to CRAP ≤ 6.0 without behavior change.
  The known offenders are `Invoice.validate`,
  `CleanupUseCases.deleteUnpaid`, `FileUseCases.uploadAndQuote`, and
  `PaymentUseCases.checkPaymentUnlocked`; re-measure first.
- Run `npm run dry`; remove or justify the duplicate candidates (the two
  `update` methods, the controller response pattern, the two use-case
  constructors).
- Add property testing support:
  - Add a `test:property` npm script that `verify.sh api` picks up
    automatically. A small deterministic harness (seeded PRNG plus integer
    generators) is acceptable when no framework fits; a devDependency is also
    acceptable if it is test-only and does not change production behavior.
  - Add initial property suites for the two functions the backlog names:
    - `calculatePrice` (`src/use-cases/pricing.js`): `billedBytes =
      max(sizeBytes, minBilledBytes)`; `priceSats` is an integer and `>=
      minInvoiceSats`; `priceSats` is non-decreasing in `sizeBytes`;
      `priceBch === priceSats / 1e8`; throws for negative/non-integer
      `sizeBytes` and for non-positive/non-finite `usdPerBch`.
    - `Invoice.isPaymentSufficient` (`src/entities/invoice.js`): sufficient iff
      `receivedSats > 0` and `receivedSats >= priceSats - toleranceSats`;
      `receivedSats === 0` is never sufficient regardless of tolerance;
      sufficiency is non-decreasing in `receivedSats`; throws for non-integer or
      negative `receivedSats`/`toleranceSats` and missing/non-positive
      `priceSats`.
  - Keep property tests **separate** from unit coverage, Gherkin acceptance,
    Gherkin mutation, language mutation, and CRAP, as the constitution
    requires.
- Use the mutation tool's scan/count mode on changed and new source files
  only; do not run mutation tests. Split any changed file that exceeds 100
  mutation sites.
- Preserve mutation manifests and do not hand-edit them.
- Verify with `npm test`, `npm run test:property`, and `npm run lint`; commit
  with `By refactorer.` and hand off to the architect.

### Architect

- Run the language mutation tool one `src/` file at a time in sequence, with
  `--max-workers 8` where supported, and kill the survivors; document intrinsic
  equivalents in the review summary. Do not hand-edit manifests.
- Run `npm run dry` after mutation and confirm the refactorer's exceptions.
- Run the canonical per-component verification and emit
  `docs/reviews/api-quality-baseline-verification.json` and
  `docs/reviews/api-quality-baseline-summary.md`, then hand off to the
  specifier for merge.
- Note in the review summary that soft Gherkin mutation is not applicable (no
  feature file for this task) and why the existing Gherkin suites are
  unaffected.

## Verification checklist (architect)

1. Unit suite green with a 100% coverage table (no uncovered line).
2. Property suite green and recorded by `verify.sh api` as run.
3. Gherkin acceptance suites green (`pricing`, `upload-validation`).
4. CRAP exit 0, every file ≤ 6.0.
5. DRY clean, or exceptions documented with rationale.
6. Language mutation 0 survived / 0 uncovered across `src/`; intrinsic
   equivalents listed.
7. Lint clean.
8. `verify.sh api` pass 4/4 with the record committed.
9. No production behavior change; `git diff` touches only source structure,
   tests, and docs.
10. Summary notes that soft Gherkin mutation is not applicable.

## Process

- Specifier routes Q1 directly to the **refactorer** after user approval. There
  is no coder step: coverage is already 100% and Q1 introduces no behavior
  slice. This matches the backlog annotation `(api; refactorer/architect)` and
  the psf-memo quality-task precedent.
- Refactorer: CRAP/DRY/property pass, commit with `By refactorer.`, hand off to
  the architect.
- Architect: full mutation audit + verification, commit records/summary with
  `By architect.`, hand off to the specifier for merge.
- Specifier: merge `swarmforge-architect` into `master`, verify per
  `specifier-prompt.md` §10, mark Q1 complete in the backlog.

## Related

- `specs/feature-backlog.md` (Q1)
- `dev-docs/long-term-plan.md` §7 (pricing), §13 (roadmap)
- `swarmforge/constitution/articles/engineering.prompt` (quality tooling)
- `docs/reviews/reject-empty-upload-summary.md` (S0 baseline)
