# Architect Review — web-payment

**Task:** `web-payment` (backlog P7.2, quote QR, countdown, wallet payment, and confirmation)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `8d6f2b2` | specifier | `specs/web-payment.feature`: six scenarios (QR + price + countdown, Pay now, confirmed result, expired, wallet error, never-confirmed); backlog |
| `3012127` | coder | Quote QR/countdown, `BrowserWallet`, `checkPayment` on the adapter, the pay/poll state machine, the paid/expired/pending view states, acceptance handlers, unit tests |
| `8df5d5b` | refactorer | Property suites for the payment slice; extract `requireTxid` and reuse `errorState` in `payFromWallet` (CRAP 8.1 → 4.0); add the two new services to the CRAP scope |
| `83e4b5e` | architect | Add the gateway-count unit test that kills the `paidChildren` loop survivor; record the refreshed mutation manifests |

The branch also fast-forwards through the specifier's P7.1 completion
(`e8852d7`).

The verification record `docs/reviews/web-payment-verification.json` names
`83e4b5e`. The branch tip adds only `docs/`, so `git diff 83e4b5e <tip>` touches
only `docs/`.

## Behavior and scope

Extends the hosting view with the payment flow: the quote shows a payment QR
code and a quote-expiry countdown; "Pay now" pays `priceSats` to the quote
address from the injected browser wallet; the page polls
`POST /files/check-payment` and renders the paid result (CID, download and
gateway links, transaction id), or the expired, wallet-error, or pending
message.

## Architectural findings

### Positive — the payment slice keeps the same clean boundaries

- `src/services/browser-wallet.js` wraps a `minimal-slp-wallet` instance and is
  injected, so the page service never imports the wallet library.
- `src/services/quote-countdown.js` is a pure, deterministic formatter shared by
  the page and the acceptance run.
- `src/services/file-upload-page.js` owns the page state machine with every
  environment dependency injected: `hostingApi`, `wallet`, `now`, `sleep`,
  `maxConfirmations`, and `pollDelayMs`. All payment behavior is unit-testable
  without a browser, network, or clock.
- `src/services/hosting-api.js` grows only a second IO method (`checkPayment`)
  on the existing `fetch`/`FormData` boundary.
- `src/components/app-body/file-hosting/upload-quote-view.js` stays
  presentational and now renders `QRCodeSVG` server-side, so the acceptance run
  exercises the exact view the browser uses.
- `src/components/app-body/file-hosting/index.js` remains the only unsuitable
  shell; it wires `appData.wallet` through `BrowserWallet` and delegates to the
  service. One `useRef` page instance holds the open quote across upload, pay,
  and poll.

Dependency direction is unchanged: UI/IO → service, and the service depends only
on injected abstractions.

### Fixed — one mutation survivor in the paid gateway loop

`paidChildren` iterates `for (let i = 0; i < gateways.length; i++)`. No unit
assertion counted the rendered gateway links, so `< -> <=` survived (the extra
iteration renders an empty gateway paragraph and the URL checks still pass).
Added a unit test that renders two gateway URLs and asserts exactly two
`file-upload-gateway` nodes and no empty anchor. All three view sites now die.

### Observation (follow-up) — a check-payment failure during polling rejects unhandled

`waitForConfirmation` does not catch a rejected `hostingApi.checkPayment`. A
check-payment HTTP/network error therefore rejects the promise and escapes
`handlePay` in the shell (`try`/`finally`, no `catch`), producing an unhandled
rejection and leaving the page on the quote. The CLI's `FileHost.pollPayment`
uses the same propagate-on-error design, and the `web-payment` spec defines no
check-payment-failure scenario. **Recommendation:** the specifier should decide
whether a poll error maps to the pending message, the error state, or a retry,
and add the scenario; the service change is small once that is specified. Left
unchanged in this review rather than inventing user-visible behavior.

### Observation (follow-up) — the acceptance fake adds a `filename` the real API omits

The `Web Payment - 3` handler sets `filename: 'upload.bin'` on the paid
`check-payment` response, but the API's paid response is
`{ status, cid, downloadUrl, gatewayUrls, hostedUntil }` with no `filename`, so
`paidState` leaves `state.filename` undefined in production (the view then omits
the file name). No scenario asserts the filename, so this does not hide a
failure, but the handler is testing a shape the API does not return.
**Recommendation:** the specifier should either assert a filename the API
actually supplies or drop it from the fixture.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/services/quote-countdown.js` | 9 | 0 | 0 |
| `src/services/browser-wallet.js` | 0 | 0 | 0 |
| `src/services/hosting-api.js` | 4 | 0 | 0 |
| `src/services/file-upload-page.js` | 13 | 0 | 0 |
| `src/components/app-body/file-hosting/upload-quote-view.js` | 3 | 0 | 0 |

`upload-quote-view.js` first passed 2 killed / 1 survived (the gateway loop
above); the added unit test produced a clean rerun. `browser-wallet.js` has no
mutable operators (confirmed by `--scan`), so its zero is structural.
`file-upload-page.js` carried a stale P7.1 manifest; the differential run
selected 0 of 13, `mutate-file.sh` detected the under-selection, and the
`--mutate-all` rerun killed all 13. The tool rewrote every manifest.

## DRY (`dry4javascript`)

- Scoped to the reviewed modules (`hosting-api.js`, `file-upload-page.js`,
  `browser-wallet.js`, `quote-countdown.js`, `upload-quote-view.js`):
  **No duplicate candidates found** (exit 0).
- Broad `npm run dry` on `src` reports only the pre-existing fork duplicates —
  `import-wallet.js`/`send-token-button.js`, `wallet-summary.js`'s two toggles,
  and `placeholder2.js`/`placeholder3.js`. None involve the payment modules, so
  no change was made.

## Cyclomatic complexity / CRAP

`npm run crap` (scoped to the five testable modules) → **exit 0**, all functions
at **100%** coverage. Highest CRAP:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `FileUploadPage.waitForConfirmation` | 6 | 100% | 6.0 |
| `errorMessage`, `FileUploadPage.payFromWallet`, `FileUploadPage.upload`, `formatCountdown` | 4 | 100% | 4.0 |
| `errorState`, `paidChildren`, `quoteState`, `requireTxid`, `resultState` | 3 | 100% | 3.0 |
| the rest | 1–2 | 100% | 1.0–2.0 |

Component maximum 6.0, at the CRAP threshold. The refactorer's `requireTxid`
extraction removed the previous 8.1 function.

## Gherkin acceptance mutation (soft)

- `specs/web-payment.feature`: **46 total, 46 killed, 0 survived, 0 errors**.
- Regression `specs/web-upload.feature`: the soft run reused its unchanged
  manifest (0 run, 32 skipped); forced with `--level full` (same mutation set,
  skips disabled) → **32 total, 32 killed, 0 survived, 0 errors**. The normal
  acceptance run already passed both suites.

## Verification record

`swarmforge/scripts/verify.sh web --record docs/reviews/web-payment-verification.json --task web-payment`

- **result: pass (4/4)**, `git_sha` = `83e4b5e`.
- unit: **41 passing**.
- property: **40 passing** (kept out of unit coverage).
- acceptance: **all 2 generated suites passed** (web-payment, web-upload).
- lint: **ok**.

No integration/mainnet test was run; none exists for the web component.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-web`.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `web-payment`. The two
  observations above are the open follow-ups for the specifier.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
