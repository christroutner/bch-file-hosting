# Architect Review — web-file-status

**Task:** `web-file-status` (backlog P7.3, look up a CID and show its hosting status)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `3a292f9` | specifier | `specs/web-file-status.feature`: four scenarios (found file with pins, staged file with no hosting window, blank-CID prompt, API error); backlog |
| `631d75c` | coder | `/status` view, `FileStatusPage`, `FileStatusView`, `HostingApi.getStatus` with the CID percent-encoded as one path segment, nav link, status link from the paid result, unit tests |
| `cc38dce` | refactorer | Property suites for the status slice; extract `src/components/app-body/shared/status-view.js` and `src/services/errors.js`; widen the CRAP scope |
| `8755c2f` | architect | Refresh the tool-written mutation manifests (no code change needed) |

The branch fast-forwards through the specifier's P7.2 completion (`5a0c9af`)
and the `web-payment-poll-error` completion (`e1b881f`).

The verification record `docs/reviews/web-file-status-verification.json` names
`8755c2f`. The branch tip adds only `docs/`, so `git diff 8755c2f <tip>` touches
only `docs/`.

## Behavior and scope

Adds a `/status` route: type a CID, `GET /files/:cid`, and render the file name,
size, hosting status, hosting window ("not paid" for staged files), and each
pin, or the blank-CID prompt / API error. The paid hosting result now links to
the status view, and the nav menu exposes it.

## Architectural findings

### Positive — the status slice reuses the established boundaries

- `src/services/file-status-page.js` is a pure page state machine with the
  hosting API injected; `lookup` trims and blanks the CID and maps the record to
  a plain view model (`found`, `no-cid`, `error`).
- `src/services/hosting-api.js` adds `getStatus` on the existing `fetch` IO
  boundary. The CID is percent-encoded into a single path segment, which
  prevents a value such as `../admin/invoices` from being normalized into a
  different endpoint — a real boundary hardening, covered by the property suite.
- `src/components/app-body/file-status/file-status-view.js` is presentational
  and uses the shared null-prototype status lookup; the `/status` component
  (`index.js`) is the thin unsuitable shell.
- `FileStatusPage.lookup` reuses the shared `failureMessage` helper, so the two
  page services map failures identically.

Dependency direction is unchanged: UI/IO → service, and services depend only on
injected abstractions.

### Positive — the refactorer consolidated the new duplication

The status view initially copied the hosting view's status-children pattern, and
both page services repeated the error-message expression. The refactorer
extracted:

- `src/components/app-body/shared/status-view.js` (`line`, `buildChildren`,
  `selectChildren`, `messageChildren`), now shared by both views; and
- `src/services/errors.js` (`failureMessage`), now shared by both page services.

The scoped DRY run is clean, and the broad run's feature duplicates are gone
(only the vendored wallet-template duplicates remain). `FileStatusPage.lookup`
dropped from CRAP 6.0 to 4.0. The shared `selectChildren`/`buildChildren` keeps
the null-prototype guard that an unexpected status string cannot resolve to an
`Object.prototype` member.

No further structural change was needed.

### Observation (still open from P7.2)

The `Web Payment - 3` acceptance fixture still sets a `filename` the real paid
`check-payment` response does not return. No scenario asserts it, so it hides no
failure; it remains a specifier follow-up.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/services/errors.js` | 1 | 0 | 0 |
| `src/services/file-status-page.js` | 3 | 0 | 0 |
| `src/services/hosting-api.js` | 4 | 0 | 0 |
| `src/services/file-upload-page.js` | 12 | 0 | 0 |
| `src/components/app-body/shared/status-view.js` | 0 | 0 | 0 |
| `src/components/app-body/file-status/file-status-view.js` | 3 | 0 | 0 |
| `src/components/app-body/file-hosting/upload-quote-view.js` | 3 | 0 | 0 |

`hosting-api.js` and `file-upload-page.js` carried stale manifests; the
differential runs under-selected (2 of 4 and 0 of 12) and `mutate-file.sh`
reran each with `--mutate-all`. One constructor kill (`sleep || default` →
`&&`) is a timeout kill: the mutant replaces the injected sleep with the real
timer and the test hangs until the mutation timeout, which correctly counts as
killed. `shared/status-view.js` has no mutable operators (confirmed by
`--scan`), so its zero is structural. The tool rewrote every manifest.

## DRY (`dry4javascript`)

- Scoped to the changed/new modules: **No duplicate candidates found** (exit 0).
- Broad `npm run dry` on `src` reports only the pre-existing vendored
  wallet-template duplicates (`import-wallet.js`/`send-token-button.js`,
  `wallet-summary.js`'s two toggles, `placeholder2.js`/`placeholder3.js`). The
  previous page-service/view duplicates are gone.

## Cyclomatic complexity / CRAP

`npm run crap` (scope now includes the status modules and the shared helpers) →
**exit 0**, all functions at **100%** coverage. Highest CRAP:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `FileUploadPage.waitForConfirmation` | 5 | 100% | 5.0 |
| `errorMessage`, `FileStatusPage.lookup`, `FileUploadPage.payFromWallet`, `FileUploadPage.pollOnce`, `FileUploadPage.upload`, `formatCountdown` | 4 | 100% | 4.0 |
| `failureMessage`, `foundState`, `paidChildren`, `quoteState`, `requireTxid`, `resultState` | 3 | 100% | 3.0 |
| the rest | 1–2 | 100% | 1.0–2.0 |

Component maximum 5.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

- `specs/web-file-status.feature` (new): **41 total, 41 killed, 0 survived,
  0 errors**.
- Regressions (features unchanged, handlers shared), forced with `--level full`
  so the mutator re-ran rather than reusing manifests:
  - `specs/web-payment.feature`: **50 total, 50 killed, 0 survived**.
  - `specs/web-upload.feature`: **32 total, 32 killed, 0 survived**.
- The normal acceptance run passed all three suites.

## Verification record

`swarmforge/scripts/verify.sh web --record docs/reviews/web-file-status-verification.json --task web-file-status`

- **result: pass (4/4)**, `git_sha` = `8755c2f`.
- unit: **56 passing**.
- property: **54 passing** (kept out of unit coverage).
- acceptance: **all 3 generated suites passed** (web-file-status, web-payment, web-upload).
- lint: **ok**.

No integration/mainnet test was run; none exists for the web component.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-web`.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `web-file-status`. The
  paid-fixture `filename` observation above is the remaining follow-up.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
