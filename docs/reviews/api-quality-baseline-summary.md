# Architect Review — api-quality-baseline

**Task:** `api-quality-baseline` (backlog Q1, the quality/verification baseline)
**Component:** `bch-file-hosting-api`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `f823723` | specifier | Specify Q1 in `dev-docs/api-quality-baseline.md`; move Q1 to in progress |
| `e768509` | refactorer | CRAP ≤ 6, DRY clean, property tests, shared store/use-case/response helpers |
| `7e99d55` | architect | Harden: kill all `src/` mutation survivors; record manifests |

The verification record `docs/reviews/api-quality-baseline-verification.json`
names `7e99d55` (the hardening commit). The branch tip is the later docs-only
commit that adds this summary; `git diff 7e99d55 <tip>` touches only `docs/`.

## Behavior and scope

**No production behavior change.** The refactorer split long methods into
focused helpers and introduced three shared bases (`RecordStore`, `UseCase`,
`sendSuccess`). The architect added only tests plus two dead/redundant
expression removals. No endpoint, response field, status, config key, error
code, or lifecycle transition changed. Every pre-existing unit and acceptance
assertion is unchanged and still passes.

## Architectural findings

- **Positive — dependency direction preserved.** The new `RecordStore` base sits
  in `src/adapters/localdb/`; `FileStore`/`InvoiceStore` extend it and keep their
  specific key/index logic. Use-cases depend on the store classes, not on raw
  keys. `UseCase` centralizes `this.adapters`/`this.config`/`this.now` so tests
  can inject a clock. `sendSuccess` removes the repeated controller response
  shape. All are high-cohesion, inward-facing extractions.
- **Positive — property tests are isolated.** `test/property/` uses a
  self-contained seeded harness and is a separate npm script, so it does not
  feed unit coverage, CRAP, language mutation, or Gherkin mutation, per the
  constitution.
- **Fix — removed dead code that produced an unkillable mutant.** The IPFS
  `drain()` helper counted consumed pin-iterator entries but every caller
  discarded the count. Replaced the counter with a pure consume loop. No
  observable change; removes a `0 -> 1` mutant with no test surface.
- **Fix — removed a redundant guard that produced an equivalent mutant.**
  `WalletAdapter.getUsdPerBch` checked both `typeof usdPerBch !== 'number'` and
  `!Number.isFinite(usdPerBch)`. `Number.isFinite` already rejects non-numbers,
  so the first clause is dead; removed it. No behavior change (a string still
  throws the same error) and the surviving `|| -> &&` mutant disappears.
- **No structural fixes required beyond the above.** Module boundaries,
  information hiding, and the UI/IO-vs-core separation are sound; the adapter
  shells (Helia, wallet backend, logger) remain outside the mutation surface.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time, in sequence, via
`swarmforge/scripts/mutate-file.sh`. Differential runs that selected fewer
mutations than were covered were automatically rerun with `--mutate-all`, so
every site was exercised.

**Result across `src/` (44 files): 151 killed, 0 survived, 0 uncovered.**
Zero-valued files were confirmed structural with `--scan` (no mutatable
arithmetic/comparison/boolean/constant site).

- `bin/server.js`: 7 killed, **2 survived** (documented below).
- `config/env/common.js`: 18 killed, 0 survived.
- `config/load-env.js`: 3 killed, 0 survived.

### Documented survivors

`bin/server.js` lines 104 (`process.argv[1]`) and 108 (`process.exit(1)`) sit
inside the `/* c8 ignore start */ … /* c8 ignore stop */` process-entry block.
That block boots the real HTTP server and terminates the process, so it is an
environmentally unsuitable adapter shell per the constitution ("separate
testable modules from modules that … throw environment errors, emit system
errors, or hang under automated tests"). It is not an intrinsic equivalent:
the mutants would change real startup behavior, but exercising them requires
booting the server and killing the test process. It is intentionally excluded
from the testable mutation surface and left uncovered by design. `src/` itself
is 0/0.

## DRY (`dry4javascript src`)

`npm run dry` → **No duplicate candidates found** (exit 0). The four duplicates
tracked in the Q1 baseline (`FileStore.update`/`InvoiceStore.update`, the
controller response pattern, and the two use-case constructors) are all
resolved by `RecordStore`, `sendSuccess`, and `UseCase`. No exceptions needed.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**; every function is at 100% coverage and ≤ 6.0:

| Function | Module | CC | CRAP |
|----------|--------|----|------|
| `calculatePrice` | `src/use-cases/pricing.js` | 6 | 6.0 |
| `InvoiceStore.list` | `src/adapters/localdb/invoice-store.js` | 6 | 6.0 |
| `AdminUseCases.listInvoices` | `src/use-cases/admin-use-cases.js` | 5 | 5.0 |
| `assertAmounts` / `assertIdentity` | `src/entities/invoice.js` | 5 | 5.0 |

The Q1 baseline offenders were all fixed: `Invoice.validate` 12 → 1,
`CleanupUseCases.deleteUnpaid` 7 → 3, `FileUseCases.uploadAndQuote`
7 → 3, `PaymentUseCases.checkPaymentUnlocked` 7 → 5.

## Gherkin acceptance mutation

**Not applicable for this task.** Q1 adds no feature file and changes no Gherkin
example, so there are no example values to mutate. The two existing suites
(`pricing`, `upload-validation`) are unaffected and pass unchanged under
`npm run test:acceptance`; soft Gherkin mutation would only re-cover
already-merged behavior. Documented per `dev-docs/api-quality-baseline.md`.

## Verification record

`swarmforge/scripts/verify.sh api --record docs/reviews/api-quality-baseline-verification.json --task api-quality-baseline`

- **result: pass (4/4)**, `git_sha` = `7e99d55` (the hardening commit).
- unit: **355 passing**, coverage **100%** statements/branches/functions/lines.
- property: **9 passing** — recorded as **run** (no longer skipped).
- acceptance: **all 2 generated suites passed** (`pricing`, `upload-validation`).
- lint: **ok**.

`npm run lint` (`standard --env mocha --fix`) is clean. No integration/mainnet
test was run.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass. Unit coverage remains 100%.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `api-quality-baseline`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
