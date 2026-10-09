# Architect Review — web-payment-poll-error

**Task:** `web-payment-poll-error` (follow-up: a rejected check-payment during polling)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `cf2625b` | specifier | Add `Web Payment - 7`: a rejected check-payment shows the API error and stops polling; backlog |
| `2ab8753` | coder | Map a rejected `checkPayment` to the page error state and stop polling; add the acceptance handler and a unit test |
| `e986d8b` | refactorer | Extract `pollOnce` (one check plus its classification) so `waitForConfirmation` drops from CRAP 7.0 to 5.0; add the polling-stop property |
| `9fb446c` | architect | Refresh the tool-written mutation manifests (no code change needed) |

The branch fast-forwards through the specifier's P7.2 completion
(`e1b881f`). This task directly closes the first follow-up recorded in
`docs/reviews/web-payment-summary.md`.

The verification record `docs/reviews/web-payment-poll-error-verification.json`
names `9fb446c`. The branch tip adds only `docs/`, so `git diff 9fb446c <tip>`
touches only `docs/`.

## Behavior and scope

A rejected `POST /files/check-payment` during confirmation polling (an HTTP or
network error) now renders the page error state carrying the API message and
stops polling, instead of rejecting unhandled through the shell. A
never-confirmed payment still shows the pending message.

## Architectural findings

### Positive — `pollOnce` separates one poll from the retry loop

The coder's error handling put a `try`/`catch` inside the polling loop and
pushed `waitForConfirmation` to CRAP 7.0. The refactorer extracted `pollOnce`,
which performs one `checkPayment` call and classifies the result as a terminal
state (paid, expired, or the reused `errorState`) or `null` when the payment is
not yet visible. `waitForConfirmation` is now a plain bounded retry loop.

- `pollOnce` reuses `errorState`, so the new error path has the same shape and
  message handling as the upload and wallet-payment paths; no new state type was
  introduced.
- `pollOnce` is internal to the class (not exported) and is called as
  `this.pollOnce()`; it stays within the injected IO boundary.
- The failure stops the loop on the first terminal result, so a rejected check
  no longer sleeps or retries. The property suite pins that invariant across any
  number of unpaid polls.

The change closes the unhandled-rejection gap flagged in the previous review and
keeps all dependencies injected and testable. No further structural change was
needed.

### Observation (still open from P7.2)

The `Web Payment - 3` acceptance fixture still sets a `filename` the real
paid `check-payment` response does not return. No scenario asserts it, so it
hides no failure, but it remains a specifier follow-up.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

`src/services/file-upload-page.js`: differential selected 5 of 13 covered sites;
`mutate-file.sh` detected the under-selection and the `--mutate-all` rerun
killed **13/13**, 0 survived, 0 uncovered. The tool rewrote the source manifest.
Other modules were unchanged this task and already clean from the P7.2 review.

## DRY (`dry4javascript`)

- Scoped to `src/services/file-upload-page.js`: **No duplicate candidates found**
  (exit 0).
- Broad `npm run dry` on `src` reports only the pre-existing fork duplicates;
  none involve the payment modules.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, all functions at **100%** coverage. Highest CRAP:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `FileUploadPage.waitForConfirmation` | 5 | 100% | 5.0 |
| `errorMessage`, `FileUploadPage.payFromWallet`, `FileUploadPage.pollOnce`, `FileUploadPage.upload`, `formatCountdown` | 4 | 100% | 4.0 |
| `errorState`, `paidChildren`, `quoteState`, `requireTxid`, `resultState` | 3 | 100% | 3.0 |
| the rest | 1–2 | 100% | 1.0–2.0 |

Component maximum 5.0, down from 6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

`specs/web-payment.feature`: the new **Web Payment - 7** ran **4 mutations, all
killed, 0 survived, 0 errors**. The four unchanged example scenarios
(1, 2, 3, 5) reused their clean manifest entries (46 mutations); their injected
check results never take the new error path, so the reuse is safe. The normal
acceptance run passed the whole feature.

## Verification record

`swarmforge/scripts/verify.sh web --record docs/reviews/web-payment-poll-error-verification.json --task web-payment-poll-error`

- **result: pass (4/4)**, `git_sha` = `9fb446c`.
- unit: **42 passing**.
- property: **41 passing** (kept out of unit coverage).
- acceptance: **all 2 generated suites passed** (web-payment, web-upload).
- lint: **ok**.

No integration/mainnet test was run; none exists for the web component.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-web`.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `web-payment-poll-error`.
  The paid-fixture `filename` observation above is the remaining follow-up.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
