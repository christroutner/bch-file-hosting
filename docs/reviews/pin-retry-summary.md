# Architect Review — pin-retry

**Task:** `pin-retry` (backlog P5.3, retry failed pins + admin file listing)
**Component:** `bch-file-hosting-api`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `a99e119` | specifier | `specs/pin-retry.feature`, `specs/admin-file-listing.feature`; P5.3 in progress |
| `89bbdfa` | coder | `PaymentUseCases.retryPins`, `AdminUseCases.listFiles`, `FileStore.list`, `RecordStore.listAll`, timer job, `GET /admin/files` |
| `3810813` | refactorer | Extract shared `assertKnownStatus`; property suites for pin-retry and admin file listing |
| `c09c551` | architect | Commit tool-written language and Gherkin mutation manifests |

The verification record `docs/reviews/pin-retry-verification.json` names
`c09c551` (the manifest/review commit). The branch tip is the later docs-only
commit that adds this summary; `git diff c09c551 <tip>` touches only `docs/`.

## Behavior and scope

Adds two operator-facing capabilities without changing existing behavior:

- `PaymentUseCases.retryPins()` re-pins files in `pinFailed` status and returns
  `{ retried, pinned, failed }`. Pinned and staged files are left alone.
- `TimerControllers` gains an hourly `retryPins` job (job overlap is prevented
  by the existing per-job `running` guard).
- `AdminUseCases.listFiles({ status })` validates the status and lists files;
  `GET /admin/files` exposes it behind the admin API key.
- `RecordStore.listAll()` consolidates prefix-range reads used by both stores;
  `FileStore.list`/`InvoiceStore.list` filter by status.
- `assertKnownStatus` deduplicates the invoice/sweep/file status validation.

## Architectural findings

- **Positive — information hiding preserved.** `RecordStore.listAll` keeps the
  LevelDB range construction in one place. Its range
  `['<prefix>', '<prefix-minus-colon>;')` is correct because `:` (0x3A) sorts
  before `;` (0x3B), so `file:`/`invoice:` keys fall inside the range without
  leaking key layout to the use-cases.
- **Positive — dependency direction preserved.** Listing flows
  controller → `AdminUseCases` → store; the retry job flows
  `TimerControllers` → `PaymentUseCases.retryPins` → `pinFile` → provider
  registry. No adapter imports upward, and the admin filter validation lives in
  the use-case, where the HTTP-meaningful `ValidationError` (422) belongs.
- **Positive — `retryPins` reuses the production pin path.** It calls
  `this.pinFile(file)`, so retries get the same per-provider result recording,
  CID-consistency guard, and `pinFailed`/`pinned` settling as the first attempt.
- **Observation (non-blocking) — retry vs. check-payment race.** `checkPayment`
  serializes per `paymentAddress` with `KeyedLock`, but `retryPins` holds no
  lock, so a timer retry and a user `check-payment` can call `pinFile` on the
  same CID concurrently. The timer's `running` guard prevents overlapping
  retries. Consequence is a redundant provider pin and a last-writer-wins `pins`
  array (both providers are idempotent, and no funds are involved), so this is
  left as-is for v1 rather than widening the lock surface. Flagged for a future
  hardening task if pinning becomes expensive or rate-limited.
- **No structural fixes required.** The refactorer's shared
  `assertKnownStatus(value, statuses, label)` is the right consolidation and
  reads clearly at both call sites.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh` (differential
runs that under-selected were rerun with `--mutate-all`):

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/adapters/localdb/invoice-store.js` | 5 | 0 | 0 |
| `src/adapters/localdb/record-store.js` | 3 | 0 | 0 |
| `src/controllers/timer-controllers.js` | 7 | 0 | 0 |
| `src/use-cases/admin-use-cases.js` | 1 | 0 | 0 |
| `src/use-cases/payment-use-cases.js` | 8 | 0 | 0 |

`file-store.js`, `admin/controller.js`, and `admin/index.js` have no mutatable
sites (`--scan` confirmed). No survivors; the full `src/` baseline from Q1 stays
at 0 survived.

## DRY (`dry4javascript src`)

`npm run dry` → **No duplicate candidates found** (exit 0). The
`assertKnownStatus` extraction also removed the previously listed admin status
duplication.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, unit coverage **100%** statements/branches/
functions/lines. New/changed functions:

| Function | CRAP |
|----------|------|
| `PaymentUseCases.retryPins` | 3.0 |
| `TimerControllers.runJob` | 3.0 |
| `RecordStore.listAll` / `get` / `update` | 2.0 |
| `TimerControllers.startTimers` / `stopTimers` | 2.0 |
| `AdminUseCases.listFiles` / `listInvoices` | 1.0 |

Component maximum remains 6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

- `specs/admin-file-listing.feature`: **10 total, 10 killed, 0 survived, 0
  errors.** All three scenarios recorded clean in the committed manifest.
- `specs/pin-retry.feature`: **17 total, 12 killed, 5 survived, 0 errors.**

### Documented survivors (all intrinsic under the current assertions)

- **4 × `cid` case-mutations** (`$.scenarios[0].examples[0..2].cid`,
  `$.scenarios[1].examples[0].cid`). The `cid` column is identical in every row,
  and the assertions (`file_status`, `pin_attempts`) do not depend on the CID
  value — the retry outcome is determined solely by the initial status and the
  provider response. Any CID string yields the same result, so no acceptance
  assertion can distinguish one from another. **Recommendation for the
  specifier:** per the pruning rule in `specifier-prompt.md` §7, move the
  constant CID into the `Background` (a fixed step literal) or drop the column,
  so it is no longer a mutation candidate; or add an assertion tied to the
  Background CID rather than to the mutated `<cid>` value.
- **1 × `http_status` (`500 -> 492`).** Any non-2xx status takes the same
  `readJson` failure branch and records the same `failed` pin; the scenario
  asserts only status and pin attempts. The exact error codes are pinned by the
  unit tests ("should fail when the Lighthouse API errors with a body/no body").

The APS mutator exposes no project filter hook and these values are genuinely
indistinguishable at the acceptance level, so they are documented rather than
chased. This mirrors the `lighthouse-provider` review's handling of the same
two patterns.

## Verification record

`swarmforge/scripts/verify.sh api --record docs/reviews/pin-retry-verification.json --task pin-retry`

- **result: pass (4/4)**, `git_sha` = `c09c551` (the manifest/review commit).
- unit: **391 passing**, coverage **100%** statements/branches/functions/lines.
- property: **18 passing**.
- acceptance: **all 5 generated suites passed** (`pricing`, `upload-validation`,
  `lighthouse-pinning`, `pin-retry`, `admin-file-listing`).
- lint: **ok**.

No integration/mainnet test was run.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass. Unit coverage remains 100%.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `pin-retry`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
