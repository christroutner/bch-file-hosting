# bch-file-hosting — Feature Backlog

**Status**: DRAFT
**Owner**: specifier.
**Last updated**: 2026-10-09

Roadmap phases refer to `dev-docs/long-term-plan.md` (section 13). Decisions
referenced as `Dn` are in its Decisions Log.

---

## Goal

A REST API that hosts files on IPFS for **$0.01 USD per MB per year**, paid in
BCH. A user uploads a file, pays a unique BCH address, and receives the IPFS CID
and download links. Paid files are pinned to the service's own Helia node and to
pluggable third-party pinning services.

---

## Current direction

The core port (roadmap phase 3) is complete and verified on mainnet. SwarmForge
was integrated in phase 4, and the pipeline smoke test (S0) completed the first
full four-role cycle. Q1 set the language-quality baseline, P5.1 finished the
pinning-provider study, P5.2 added the Lighthouse provider, and P5.3 added the
pin-retry timer and admin file listing. P6.1, the CLI skeleton, is complete
and merged to `master` at `cde36aef70`. P6.2 `file-check` is complete and
merged to `master` at `55c3ddc714`. P6.3 `wallet-create`/`wallet-balance` is
complete and merged to `master` at `d3e54d4cf2`. The `wallet-name-validation`
follow-up hardening is complete and merged at `08c2cd88dc`. P6.4 `file-status`
is complete and merged at `faabc07d8e`. P6.5 `file-pay` is complete and merged
at `f579aafd67`. P6.6 `file-host` is complete and merged at `8a93edf5f7`, so
**roadmap phase 6 (CLI) is complete**. Roadmap phase 7 forked
`bch-wallet-web3-spa` into `bch-file-hosting-web`: P7.1 `web-upload` merged at
`f2e3615e99`, P7.2 `web-payment` (plus the `web-payment-poll-error` hardening)
and P7.3 `web-file-status` followed, so **roadmap phase 7 (web UI) is complete**
as of `5ed6759239`. The `web-upload-transport` hardening (browser `fetch`
receiver in the web API adapter) is complete and merged at `279e8a77ba`. The
`web-upload-size` hardening (file and billed sizes on the web quote) is
complete and merged at `dba049d435`. The `web-upload-quote-columns` spec
cleanup (anchor the size-scenario setup columns) is complete and merged at
`959cf421e5`. The `lighthouse-file-link` feature (Lighthouse link opens the
file; image links open in a new tab) is complete and merged at `a0685a12e1`.
The `ipfs-public-node` feature (public Amino DHT + CID provide) is complete and
merged at `e2b9f571d1`. The `ipfs-provide-best-effort` fix (best-effort
content-routing provide) is complete and merged at `4fe4d5b010`. A real-network
test then showed hosted files are still not retrievable: the provide never
completes (180 s kad-dht timeout) so the CID is never announced, and Lighthouse's
asynchronous pin-by-CID never fetches the bytes. The fix is to upload the file
bytes to Lighthouse's IPFS-compatible endpoint (`lighthouse-upload-verify`), in
the background, plus a web dashboard to watch progress (`web-dashboard`). The
`lighthouse-upload-verify` feature is complete and merged at `641bf94`. The
`web-dashboard` feature (a public server-wide file feed at `GET /files` plus the
web `/dashboard` view) is complete and merged at `76ec973e1c`.

## In progress

- **`web-build-compile` (web build + verification):** the CRA production build
  fails on merged code (`globalThis` is not defined in
  `src/services/hosting-api.js`, plus `'use strict'` warnings), and
  `verify.sh web` never runs the CRA build so it was not caught. Fix the CRA
  ESLint configuration at its source and add a CRA build/lint command to the
  `web` component in `swarmforge/scripts/verify.mjs`. Spec:
  `dev-docs/web-build-compile.md`. No Gherkin (build/verification deliverable).

## Up next (in order)

- **`dashboard-loadmore-error` (web, small):** `DashboardPage.loadMore` replaces
  the whole view with the error state when a later page fails, dropping the files
  already shown. Decide whether to keep the list and show the error inline.
  Flagged by the `web-dashboard` architect.
- **`pin-recovery`:** a crash mid-pin can strand a file in `pinning` —
  `needsPinRetry` recovers `pinFailed` or a file with a failed pin, but not a
  `pinning` record left by a killed process (all recorded pins `pinned`, status
  not yet updated). Treat `pinning` as needing recovery. Flagged by the
  `lighthouse-upload-verify` architect.
- **`shutdown-drain`:** `PaymentUseCases.whenBackgroundIdle()` exists but is not
  wired into `Server.stop()`, so SIGINT exits without draining background pins.
  A naive drain could hang if the Lighthouse HTTP call hangs (no request
  timeout), so add a bounded drain (or an HTTP timeout). Flagged by the
  `lighthouse-upload-verify` architect.
- **`lighthouse-verify-content-length`:** `verifyOnce` requires a
  `content-length` and treats a chunked (headerless) response as 0 ≠ sizeBytes,
  failing verification. Acceptable for Lighthouse today; accept chunked
  responses if a gateway changes. Flagged by the `lighthouse-upload-verify`
  architect.
- **Roadmap phase 8: x402-bch** — dynamic-price x402 middleware, `POST
  /x402/files`, and a facilitator deployment note; scope it with the user.
- **`ipfs-public-node` manual verification (pending):** restart the API with the
  merged code and `LIGHTHOUSE_GATEWAY=https://open-sheep-fwyxe.lighthouseweb3.xyz/ipfs/`,
  then confirm `delegated-ipfs.dev/routing/v1/providers/<cid>` returns our peer
  and Lighthouse `file_info` returns 200 after a pin. The offline suites cannot
  prove real DHT reachability.
- **Spec-quality follow-ups:** the CLI `upload_path` cells (file-upload,
  file-host) and the file-host non-JSON `api_txid` cells survive soft mutation
  because no assertion depends on them; either anchor them with a `Then` or
  prune the columns. The same applies to `web-payment.feature` scenario 8
  (`paid_cid` and `paid_name`; 4 survivors) — add `Then the page shows the CID`
  / `the paid file name` assertions and their `shown_*` columns. The wallet
  mnemonic-hygiene scenarios remain mutation-inert. The
  `lighthouse-upload-verify` architect added equivalents: `lighthouse-pinning`
  1/5 `upload_cid` and `pin-retry` 1/2 `cid` are echoed-input equivalents (any
  mismatch fails the pin), and `http_status 500` is any-error (any 4xx/5xx
  fails). Anchor them (for example assert the error message carries the reported
  CID) or accept them as documented equivalents. The `web-dashboard` architect
  added five intrinsic `file-feed` survivors: the invalid `limit` values
  (`10→11`, `0→-5`, `101→109`, `abc→Abc`) all map to the same 422 message, and
  `bad_cursor` is any non-cursor token; the exact invalid value is not
  load-bearing.
- **Hardening follow-up (`web-image-link-rel`):** the image gateway link sets
  `target="_blank"` without `rel`; every other `_blank` anchor in
  `bch-file-hosting-web` uses `rel="noreferrer"`. Add `rel="noreferrer"` (with
  a unit assertion). Flagged by the `lighthouse-file-link` architect.
- **Hardening follow-up (`ipfs-service-dependencies`):** the general regression
  test is still missing. `Ipfs Public Node - 2` only inspects the `natServices`
  metadata, so it missed that `uPnPNAT()` requires the `@libp2p/autonat`
  capability (the API failed to start) — hotfixed with `autoConfirmAddress:
  true` and now covered by a flag test. Add a test that builds the public-network
  service set and asserts every `serviceDependencies` capability is provided, so
  the next added service cannot break startup silently.

## Needs a decision from the user

- None open. Q1 (expiry), Q2 (renewals), Q3 (OP_RETURN), and Q9 (late
  payments/refunds) are decided in the long-term plan's Decisions Log
  (D26–D29); none needs new Gherkin. The `ipfs-public-node` provide-failure
  question is decided and implemented: `provide` is best-effort
  (`ipfs-provide-best-effort`, merged). For `lighthouse-upload-verify` the user
  decided: the verified Lighthouse copy is the success criterion (not the local
  pin), and the upload+verify runs in the background.

## Recently completed

- **`web-dashboard` — public file feed and hosted-files dashboard (2026-10-09):**
  new public `GET /files` endpoint returns only paid files (`pinning`, `pinned`,
  `pinFailed`), newest paid first with a CID tie-break, paginated by an opaque
  base64url cursor (`limit` 1..100, default 20); each file exposes `cid,
  filename, sizeBytes, status, paymentAddress, createdAt, paidAt, hostedUntil,
  pins[{provider,status}]`; an invalid limit or cursor is rejected with 422. The
  web `/dashboard` route and nav link render the feed through
  `HostingApi.listFiles`/`DashboardPage`/`DashboardView`, preserving feed order
  and offering Refresh and Load-more actions (no localStorage, no auto-polling).
  Specs `bch-file-hosting-api/specs/file-feed.feature` (5 scenarios) and
  `bch-file-hosting-web/specs/web-dashboard.feature` (6 scenarios). Pipeline
  commits: specifier `24b6f2b`, coder `3a18cb9`, refactorer `0618ccd`, architect
  `35e6953` (verification `git_sha`), docs `76ec973`, merged to `master` at
  `76ec973e1c` (fast-forward). The architect first collapsed the duplicated
  cursor/order comparison onto the shared sort comparator. `verify.sh api` pass
  4/4 (unit 461, property 35, acceptance all 8 suites, lint ok) and `verify.sh
  web` pass 4/4 (unit 83, property 73, acceptance all 5 suites, lint ok);
  language mutation 0 survived / 0 uncovered across the seven changed modules;
  DRY clean; CRAP ≤ 6.0. Independent post-merge acceptance checks: file-feed
  9/9 and web-dashboard 8/8. Architect summary:
  `docs/reviews/web-dashboard-summary.md`. Follow-ups: `dashboard-loadmore-error`
  and five intrinsic `file-feed` soft-mutation survivors (both tracked above).

- **`lighthouse-upload-verify` — upload bytes to Lighthouse and pin in the
  background (2026-10-09):** `LighthouseProvider.pin` now uploads the file bytes
  to the IPFS-compatible `upload.lighthouse.storage/api/v0/add` endpoint
  (`wrap-with-directory=true&cid-version=1&raw-leaves=true&pin=true`), fails on a
  reported-CID mismatch, then verifies retrieval with
  `HEAD <gateway>/<cid>/<filename>` (bounded retries). The endpoint reproduces
  our exact wrapping-directory CID (verified byte-for-byte at 1.5 KB and 3 MB
  multi-chunk). `completePayment` records the payment, sets a new `pinning`
  status, and runs pin+announce off the request path (`runInBackground`, tracked
  `background` Set, `whenBackgroundIdle()` for tests/shutdown). Providers carry
  `authoritative` in their capabilities: the file is `pinned` when every
  authoritative provider succeeded, and `local-helia` is best-effort, so a failed
  local pin is recorded but does not fail the file. `pinFile` skips
  already-pinned providers, so `retryPins` (which now also recovers a failed
  local pin) never re-uploads. Config: `LIGHTHOUSE_UPLOAD_URL`,
  `LIGHTHOUSE_VERIFY_ATTEMPTS`, `LIGHTHOUSE_VERIFY_DELAY_MS`. Pipeline commits:
  specifier `e931b78`, coder `0388fe7`, refactorer `96fa16e`, architect `f6f10f5`
  (verification `git_sha`), docs `641bf94`, merged to `master` at `641bf94`
  (fast-forward). `verify.sh api` pass 4/4 (unit 428, property 28, acceptance
  all 7 suites, lint ok); language mutation `lighthouse.js` 22 killed / 1
  equivalent (0 uncovered) and four other modules 0 survivors; soft Gherkin
  `background-pinning` 9/9, `lighthouse-pinning` 16/19, `pin-retry` 17/22
  (survivors are documented equivalents); DRY clean; CRAP ≤ 6.0. Independent
  post-merge acceptance check: all 7 suites. Architect summary:
  `docs/reviews/lighthouse-upload-verify-summary.md`. Follow-ups: `pin-recovery`,
  `shutdown-drain`, `lighthouse-verify-content-length`.

- **`ipfs-provide-best-effort` — do not block or fail the pin on content-routing
  provide (2026-10-09):** `IpfsAdapter.pin` now fires `provideInBackground`
  (logged, not awaited), so a slow or failing DHT `provide` no longer stalls
  `POST /files/check-payment` for the kad-dht `DEFAULT_QUERY_TIMEOUT` (180 s) or
  marks a durable local pin as `pinFailed`; `pins.add` alone decides pin
  success. The `upnpNAT({ autoConfirmAddress: true })` hotfix is now
  test-covered and extracted as `UPNP_AUTO_CONFIRM_ADDRESS`. Spec
  `ipfs-public-node.feature` gained scenarios 4 and 5. Pipeline commits:
  specifier hotfix `bb0e811`, specifier `079370b`, coder `b248136`, refactorer
  `bde9a22`, architect `55f04b7` (verification `git_sha`), docs `4fe4d5b`,
  merged to `master` at `4fe4d5b010` (fast-forward). `verify.sh api` pass 4/4
  (unit 410, property 26, acceptance all 6 suites, lint ok); language mutation
  22/22 killed / 0 uncovered; soft Gherkin 8/8 killed; DRY clean; CRAP <= 6.0.
  Independent post-merge acceptance check: ipfs-public-node 10/10. Architect
  summary: `docs/reviews/ipfs-provide-best-effort-summary.md`. The flagged
  re-provide gap (`ipfs-reprovide`) is closed: Helia's DHT `Reprovider`
  re-announces stored provider entries (see gotcha #26).

- **`ipfs-public-node` — join the public IPFS network and provide hosted CIDs
  (2026-10-09):** the Helia node now runs a project-owned `PublicHeliaNode`
  factory that registers the public Amino DHT (`aminoDHT`, `/ipfs/kad/1.0.0`)
  and keeps the PSF DHT, adds public bootstrap peers, and enables NAT traversal
  (`upnpNAT`, `dcutr`). The IPFS adapter's `pin` publishes the CID via
  `helia.routing.provide(cid)`, so public pin services can discover hosted
  files. Pure config lives in `src/adapters/ipfs/public-network.js`; both DHTs
  run in server mode (`clientMode: false`) so provider records are served. Spec
  `ipfs-public-node.feature` (three scenarios). Pipeline commits: specifier
  `1a5463c`, coder `2ccc8e2`, refactorer `02eddc5`, architect `2d4493d`
  (verification `git_sha`), docs `e2b9f57`, merged to `master` at `e2b9f571d1`
  (fast-forward). `verify.sh api` pass 4/4 (unit 407, property 25, acceptance
  all 6 suites, lint ok); language mutation 21/21 killed / 0 uncovered; soft
  Gherkin 10/10 killed; DRY clean; CRAP <= 6.0. Independent post-merge
  acceptance check: ipfs-public-node 6/6. Architect summary:
  `docs/reviews/ipfs-public-node-summary.md`. Real-network verification is
  manual (see Up next); a `provide` failure makes the pin fail (see the decision
  above).

- **`lighthouse-file-link` — link files on the Lighthouse gateway; open image
  links in a new tab (2026-10-09):** `PinningProvider.gatewayUrl(cid, filename)`
  now receives the filename; `LighthouseProvider` appends the URL-encoded name
  so the gateway link opens the file instead of the wrapping directory, and
  `buildLinks` passes the raw name through. On the web paid result, gateway
  links for image file names open with `target="_blank"` (non-images keep the
  default). Specs `lighthouse-pinning.feature` (scenario 3) and
  `web-payment.feature` (`Web Payment - 8`). Pipeline commits: specifier
  `79bbe45`, coder `acc1c3b`, refactorer `f6b9b2d`, architect `3560850`
  (verification `git_sha` for both components), docs `a0685a1`, merged to
  `master` at `a0685a12e1` (fast-forward). `verify.sh api` pass 4/4 (unit 393,
  property 22, acceptance all 5 suites, lint ok) and `verify.sh web` pass 4/4
  (unit 64, property 58, acceptance all 4 suites, lint ok); language mutation
  19/19 killed / 0 uncovered across the changed modules; DRY clean; CRAP <= 6.0.
  Independent post-merge acceptance checks: lighthouse-pinning 6/6 and
  web-payment 15/15. Architect summary:
  `docs/reviews/lighthouse-file-link-summary.md`. Follow-ups: the `rel`
  hardening and the `web-payment` scenario-8 `paid_cid`/`paid_name` survivors
  (both tracked below).

- **`web-upload-quote-columns` — make the size-scenario setup columns
  load-bearing (2026-10-09):** spec-only follow-up to `web-upload-size`.
  Scenarios `Web Upload - 5` and `Web Upload - 6` gained the established
  `Then the page shows the file name / price / payment address` assertions and
  the matching `shown_*` columns, so `api_sats`, `api_address`, and
  `upload_name` are no longer mutation-inert. No handler or source change.
  Pipeline commits: specifier `d380348`, architect `bbe1a02` (verification
  `git_sha`), docs `959cf42`, merged to `master` at `959cf421e5` (fast-forward).
  `verify.sh web` pass 4/4 (unit 62, property 57, acceptance all 4 suites, lint
  ok); soft Gherkin 38/38 killed, 0 survived (the prior 12 survivors are gone);
  independent post-merge acceptance check: web-upload 12/12. Architect summary:
  `docs/reviews/web-upload-quote-columns-summary.md`.

- **`web-upload-size` — show the file and billed sizes on the web quote
  (2026-10-09):** the `/host` quote view now shows `Size: <n> bytes` whenever
  the API reports a size, plus a separate `Billed size: <n> bytes` line only
  when the billed size differs from the selected size (a file below the 100 KB
  minimum). `quoteState` carries `sizeBytes`/`billedBytes` through an
  `optionalNumber` helper; the view renders the billed line on the presence and
  inequality rule. Spec `web-upload.feature` gained scenarios `Web Upload - 5`
  and `Web Upload - 6`. Pipeline commits: specifier `c848678`, coder `f101108`,
  refactorer `1ccf906`, architect `e9593f7` (verification `git_sha`), docs
  `dba049d`, merged to `master` at `dba049d435` (fast-forward). `verify.sh web`
  pass 4/4 (unit 62, property 57, acceptance all 4 suites, lint ok); language
  mutation 17/17 killed / 0 uncovered across the two changed modules; DRY
  clean; CRAP <= 5.0. Independent post-merge acceptance check: web-upload
  12/12. Architect summary: `docs/reviews/web-upload-size-summary.md`. Soft
  Gherkin: 14/26 killed, 12 survivors — the `api_sats`, `api_address`, and
  `upload_name` setup columns in scenarios 5 and 6 are unasserted (see the
  spec-quality follow-up below).

- **`web-upload-transport` — send web uploads through the browser `fetch`
  transport (2026-10-09):** fixed the reported `/host` upload failure
  `'fetch' called on an object that does not implement interface Window.`
  `HostingApi` stored the bare global `fetch` and called it as `this.fetch(...)`,
  so the receiver was the adapter instance and browsers rejected the call before
  any request. The adapter now binds the transport once in its constructor
  (`(fetchImpl || fetch).bind(globalThis)`), covering `upload`, `checkPayment`,
  and `getStatus`. Spec `web-upload-transport.feature` (one scenario, two
  examples) drives the real adapter over a browser-like global fetch; the
  refactorer's property test asserts the global receiver across all three
  methods. Pipeline commits: specifier `d926571`, coder `4621cb7`, refactorer
  `4fe1ce0`, architect `6fdbdf3` (verification `git_sha`), docs `279e8a7`,
  merged to `master` at `279e8a77ba` (fast-forward). `verify.sh web` pass 4/4
  (unit 57, property 55, acceptance all 4 suites, lint ok); language mutation of
  `hosting-api.js` 4/4 killed; soft Gherkin 14/14 killed. Independent
  post-merge acceptance check: 2/2. Architect summary:
  `docs/reviews/web-upload-transport-summary.md`.

- **P7.3 `web-file-status` — look up a file and show its status and pins
  (2026-10-09):** added a `/status` route and nav link with a CID input; it
  shows the file name, size, hosting status, hosting window (`not paid` for
  staged files), and each pin, or the blank-CID prompt / API error. The paid
  result links to it. `HostingApi.getStatus` percent-encodes the CID as one
  path segment (gotcha #22). The refactorer extracted the shared
  `status-view.js` view helpers and `errors.js` `failureMessage`. Spec
  `web-file-status.feature` (four scenarios). Pipeline commits: specifier
  `3a292f9`, coder `631d75c`, refactorer `cc38dce`, architect `8755c2f`
  (verification `git_sha`), docs `5ed6759`, merged to `master` at `5ed6759239`
  (fast-forward). `verify.sh web` pass 4/4 (unit 56, property 54, acceptance 3
  suites, lint ok); language mutation 0 survived across the seven touched
  modules; scoped DRY clean; independent post-merge acceptance check
  web-file-status 6/6, web-payment 13/13, web-upload 8/8. Architect summary:
  `docs/reviews/web-file-status-summary.md`. This completes roadmap phase 7.
  - The architect again repeated the `Web Payment - 3` `filename` observation;
    it remains a false alarm (the real `paidResult` includes `filename`).

- **`web-payment-poll-error` — check-payment failure handling (2026-10-09):**
  a rejected `POST /files/check-payment` during confirmation polling now renders
  the page error state with the API message and stops polling, instead of
  rejecting unhandled through the shell. The refactorer extracted `pollOnce` to
  keep `waitForConfirmation` at CRAP 5.0. Spec `web-payment.feature` gained
  `Web Payment - 7`. Pipeline commits: specifier `cf2625b`, coder `2ab8753`,
  refactorer `e986d8b`, architect `9fb446c` (verification `git_sha`), docs
  `431eb18`, merged to `master` at `431eb180d3` (fast-forward). `verify.sh web`
  pass 4/4 (unit 42, property 41, acceptance 2 suites, lint ok); language
  mutation of `file-upload-page.js` 13/13 killed; independent post-merge
  acceptance check web-payment 13/13 and web-upload 8/8. Architect summary:
  `docs/reviews/web-payment-poll-error-summary.md`.
  - The architect re-flagged the `Web Payment - 3` fixture `filename`; verified
    again that the real paid response includes it (`paidResult` in
    `bch-file-hosting-api/src/use-cases/payment-use-cases.js`, returned straight
    by the controller), so there is nothing to change.

- **P7.2 `web-payment` — pay the quote and confirm (2026-10-09):** the
  `bch-file-hosting-web` quote view now shows a payment QR code and an expiry
  countdown; "Pay now" pays the quote's `priceSats` to its address from the
  loaded in-browser wallet via `BrowserWallet` (keeping the 2,000-sat PSF
  donation), then `FileUploadPage` polls `POST /files/check-payment` with an
  injected `sleep` and renders the paid result (CID, download URL, gateway
  URLs, transaction id) or the expired / wallet-error / pending message. New
  pure modules `quote-countdown.js` and `browser-wallet.js`. Spec
  `web-payment.feature` (six scenarios). Pipeline commits: specifier `8d6f2b2`,
  coder `3012127`, refactorer `8df5d5b`, architect `83e4b5e` (verification
  `git_sha`), docs `b00b6b7`, merged to `master` at `b00b6b7257` (fast-forward).
  `verify.sh web` pass 4/4 (unit 41, property 40, acceptance 2 suites, lint ok);
  all testable functions at 100% CRAP coverage (max 6.0); language mutation 0
  survived / 0 uncovered across the five feature modules; DRY clean on the
  feature modules; soft Gherkin web-payment 46/46 killed and web-upload
  re-run 32/32 killed. Independent post-merge acceptance check: web-payment
  11/11 and web-upload 8/8. Architect summary:
  `docs/reviews/web-payment-summary.md`.
  - **Open follow-up (spec):** `waitForConfirmation` does not catch a rejected
    `check-payment`; a poll HTTP/network error escapes as an unhandled
    rejection. Decide whether it maps to the error state, the pending message,
    or a retry, and add a scenario. The other architect observation is a false
    alarm: the fake paid fixture's `filename` matches the real API
    `paidResult` response (`bch-file-hosting-api/src/use-cases/payment-use-cases.js`),
    so no change is needed there.

- **P7.1 `web-upload` — web skeleton and upload quote (2026-10-09):** forked
  `bch-wallet-web3-spa` into `bch-file-hosting-web/` (CRA 5, React 19,
  react-bootstrap, react-router, `qrcode.react`, `minimal-slp-wallet`) with the
  wallet app kept intact, and added the first file-hosting view: pick a file,
  `POST /files`, then show the quote (file name, price in satoshis, payment
  address), the already-hosted download link, a no-file prompt, or the API
  error. Pure `FileUploadPage` state machine + injected `HostingApi` adapter +
  presentational `UploadQuoteView`. Spec `web-upload.feature` (four scenarios).
  Onboarded the component into `verify.mjs`, `monorepo.prompt`,
  `clean-builds.sh`, and `architect-startup.sh`, with a `node --test` +
  `ReactDOMServer` acceptance pipeline. Pipeline commits: specifier `98033a8`,
  coder `f3d850d`, refactorer `08e24ee`, architect `314fdc2` (verification
  `git_sha`), docs `f2e3615`, merged to `master` at `f2e3615e99`
  (fast-forward). `verify.sh web` pass 4/4 (unit 15, property 17, acceptance
  web-upload suite, lint ok); testable modules at 100% CRAP coverage; language
  mutation 0 survived / 0 uncovered across the three feature modules; DRY clean
  on the feature modules; soft Gherkin web-upload 32/32 killed. Independent
  post-merge acceptance check: 8/8 executions passed. Architect summary:
  `docs/reviews/web-upload-summary.md`.

- **P6.6 `file-host` — upload, pay, and confirm in one step (2026-10-09):**
  `file-host -f <path> -n <name> [--json]` uploads the file, short-circuits on
  an `alreadyHosted` quote, otherwise pays the quote's `priceSats` from the
  named local wallet and polls `POST /files/check-payment` (bounded retries with
  an injected sleep) until the payment is visible, then prints the CID, download
  URL, and gateway URLs; a never-confirmed payment fails with
  `Payment not confirmed.` Exit codes 0/1/2. `FileHost` extends `FileUpload` and
  reuses the refactorer's shared `attachWallet`/`validateWalletName` helpers.
  Spec `file-host.feature` (eight scenarios). Pipeline commits: specifier
  `0a1a72d`, coder `41005d3`, refactorer `2a683d5`, architect `1f78ae2`
  (verification `git_sha`), docs `8a93edf`, merged to `master` at `8a93edf5f7`
  (fast-forward). `verify.sh cli` pass 4/4 (unit 107, property 58, acceptance
  all 7 suites, lint ok); unit coverage 100%; language mutation 0 survived / 0
  uncovered across `file-host.js` and `wallet-command.js`; DRY clean; CRAP <=
  6.0; soft Gherkin file-host 54/67 killed. Independent acceptance check after
  merge: all 7 suites passed, including the 13 file-host executions. Architect
  summary: `docs/reviews/file-host-summary.md`. This completes roadmap phase 6.
  - Follow-up (mutation): the `upload_path` cells (10 in file-host, 9 in
    file-upload) and the non-JSON `api_txid` cells (3 in file-host) are
    unasserted and survive soft mutation; anchor them or prune.

- **P6.5 `file-pay` — pay an invoice from a local wallet (2026-10-09):**
  `file-pay -a <address> -n <name> [--json]` looks up the invoice via
  `POST /files/check-payment`; a paid invoice is a no-op success (`Already
  paid`), while an expired invoice, unknown wallet, or API error fails with exit
  1, and an unpaid invoice sends `requiredSats - receivedSats` from the named
  local wallet and prints the amount and txid. `FilePay` extends
  `WalletCommand`; `WalletService.sendSats` sends one `{ address, amountSat }`
  output. Spec `file-pay.feature` (eight scenarios). Pipeline commits: specifier
  `4d6457c`, coder `e8a0dab`, refactorer `485cad8`, architect `1a7d74b`
  (verification `git_sha`), docs `f579aaf`, merged to `master` at `f579aafd67`
  (fast-forward). `verify.sh cli` pass 4/4 (unit 90, property 52, acceptance all
  6 suites, lint ok); unit coverage 100%; language mutation 0 survived / 0
  uncovered across `file-pay.js` and `wallet-service.js`; DRY clean; CRAP <=
  6.0; soft Gherkin file-pay 36/36 killed. Independent acceptance check after
  merge: all 6 suites passed, including the 12 file-pay executions. Architect
  summary: `docs/reviews/file-pay-summary.md`.
  - **Accepted (product decision):** every CLI payment deliberately adds a
    2,000-sat PSF donation because `sendSats` uses `minimal-slp-wallet.send()`;
    `file-pay` therefore costs `amountSats + 2,000 + fee`. This is kept as a
    documented PSF contribution; `wallet-service.js` documents the side effect
    and a unit test covers it.

- **P6.4 `file-status` — look up a file and print its status and pins
  (2026-10-09):** `file-status -c <cid> [--json]` calls `GET /files/:cid` and
  prints the CID, file name, size, status, hosting window (`not paid` when
  unpaid), and each pin (`Pin: <provider> <status>`); exit 0/1/2 for
  success/runtime/usage. `HostingApi.getStatus` encodes the CID as a single path
  segment. The refactorer moved the shared subcommand-hook bindings into
  `FileCommand` and added property coverage. Spec `file-status.feature` (five
  scenarios). Pipeline commits: specifier `d919ea5`, coder `7806bd9`,
  refactorer `1698d15`, architect `9446cb9` (verification `git_sha`), docs
  `faabc07`, merged to `master` at `faabc07d8e` (fast-forward). `verify.sh cli`
  pass 4/4 (unit 73, property 41, acceptance all 5 suites, lint ok); unit
  coverage 100%; language mutation 0 survived / 0 uncovered across the five
  changed `src/` files; DRY clean; CRAP <= 6.0; soft Gherkin file-status 53/53
  killed. Independent acceptance check after merge: all 5 suites passed,
  including the 8 file-status executions. Architect summary:
  `docs/reviews/file-status-summary.md`.

- **Follow-up hardening `wallet-name-validation` — reject unsafe wallet names
  (2026-10-09):** both local wallet commands now reject a name outside
  `[A-Za-z0-9_-]+` with a usage error (exit 2) and the message
  `Invalid wallet name "<name>". Use only letters, digits, hyphens, and
  underscores.`, before reading or writing the store. The grammar lives in
  `WalletStore` (`WALLET_NAME_PATTERN`, exported `isValidWalletName`) and is
  enforced at the `filePath` boundary as defense in depth; the shared
  `WalletCommand.validateFlags` maps it to the user-facing `UsageError`. The
  refactorer extracted shared property generators and added
  `wallet-command.property.js`; the architect added the store-boundary guard.
  Specs `wallet-create.feature`/`wallet-balance.feature` gained scenario 5 (six
  invalid names each). Pipeline commits: specifier `014d8e75`, coder `618d69f`,
  refactorer `612e4fc`, architect `4cc6844` (verification `git_sha`), docs
  `08c2cd8`, merged to `master` at `08c2cd88dc` (fast-forward). `verify.sh cli`
  pass 4/4 (unit 59, property 33, acceptance all 4 suites, lint ok); unit
  coverage 100%; language mutation 0 survived / 0 uncovered across
  `wallet-store.js` and `wallet-command.js`; DRY clean; CRAP <= 6.0; soft
  Gherkin scenario 5 killed 12/12 in each file (all 10 survivors remain the two
  documented mnemonic-hygiene scenario 4 cells). Independent acceptance check
  after merge: all 4 suites passed, including the 12 new scenario-5 executions.
  Architect summary: `docs/reviews/wallet-name-validation-summary.md`.

- **P6.3 `wallet-create` / `wallet-balance` — minimal wallet for paying
  (2026-10-09):** `wallet-create -n <name>` generates a `minimal-slp-wallet`
  wallet, stores it under the gitignored `.wallets/`, prints its address,
  rejects a duplicate name, and never prints the mnemonic;
  `wallet-balance -n <name>` prints the integer satoshi balance and never prints
  the mnemonic. New `WALLET_URL`/`WALLET_INTERFACE` config; the refactorer
  extracted `WalletCommand` and split the HTTP adapter out of the generic
  `Command` via `FileCommand`. Specs `wallet-create.feature`,
  `wallet-balance.feature` (four scenarios each). Pipeline commits: coder
  `7a73f25`, refactorer `edb8e59`, architect `3b6a799` (verification `git_sha`),
  docs `cc79bb1`, merged to `master` at `d3e54d4cf2`. `verify.sh cli` pass 4/4
  (unit 47, property 30, acceptance all 4 suites, lint ok); language mutation 0
  survived / 0 uncovered across nine `src/` files; DRY clean; CRAP <= 6.0; soft
  Gherkin wallet-create 12/18 killed and wallet-balance 16/20 killed (all 10
  survivors are the two negative mnemonic-hygiene scenarios). Independent
  acceptance check after merge: all 4 suites passed (33 executions). Architect
  summary: `docs/reviews/wallet-create-summary.md`.
  - Follow-up (mutation): the mnemonic-hygiene scenarios are negative and
    mutation-inert; add a positive store assertion or accept the documented
    survivors.
- **P6.2 `file-check` — check a payment and print the result (2026-10-09):**
  `file-check -a <address> [--json]` calls `POST /files/check-payment` and
  prints the paid result (CID + download + gateway links), the unpaid result
  (received/required satoshis and the quote expiry), or the expired status;
  exit 0 for a successful query, 1 for an API error, 2 for a missing `-a`. The
  refactorer extracted a shared `Command` base (`src/lib/command.js`) and moved
  `file-upload` onto it, removing duplicate constructors and run loops. Spec
  `bch-file-hosting-cli/specs/file-check.feature` (six scenarios). Pipeline
  commits: coder `0550367`, refactorer `fd6f057`, architect `af4739a`
  (verification `git_sha`), docs `30d5326`, merged to `master` at `55c3ddc714`.
  `verify.sh cli` pass 4/4 (unit 24, property 17, acceptance all 2 suites, lint
  ok); language mutation 0 survived / 0 uncovered across four `src/` files; DRY
  clean; CRAP <= 6.0; soft Gherkin file-check 42/42 killed (file-upload's 9
  documented `upload_path` survivors unchanged). Independent acceptance check
  after merge: file-check 11/11 and file-upload 11/11. Architect summary:
  `docs/reviews/file-check-summary.md`.
- **P6.1 `cli-skeleton` — first CLI command (2026-10-09):** new
  `bch-file-hosting-cli/` component (Commander, ESM) with `file-upload -f <path>
  [--json]`: reads a local file, POSTs multipart to `POST /files`, and prints
  the quote (price + payment address), an already-hosted download link, or an
  error; exit codes 0/1/2 (success/runtime/usage). API boundary
  `src/lib/hosting-api.js`; `HOSTING_API_URL` comes from the environment.
  Registers the component in `verify.mjs`, `monorepo.prompt`, `clean-builds.sh`,
  and `architect-startup.sh`, and gives it its own Gherkin acceptance pipeline.
  Spec `bch-file-hosting-cli/specs/file-upload.feature` (six scenarios).
  Pipeline commits: coder `bd7b173`, refactorer `10d1a0c`, architect `1ecb9f7`
  (verification `git_sha`), docs `0ea5f11`, merged to `master` at `cde36aef70`.
  `verify.sh cli` pass 4/4 (unit 12, property 9, acceptance 11 executions, lint
  ok); `verify.sh api` regression pass 4/4 (unit 391, property 18, acceptance
  all 5 suites, lint ok); language mutation 0 survived / 0 uncovered; DRY clean;
  CRAP <= 4.0; soft Gherkin 26/35 killed with 9 documented intrinsic
  `upload_path` survivors. Independent acceptance check after merge:
  file-upload 11/11. Architect summary: `docs/reviews/cli-skeleton-summary.md`.
  - Follow-up prune: `upload_path` is not load-bearing (no assertion depends on
    it). Either move a fixed path into the `Background` or add a `Then` that
    ties the uploaded filename to the example; the pin-retry `cid` column has
    the same smell.
- **P5.3 `pin-retry` — retry failed pins and admin file listing (2026-10-09):**
  `PaymentUseCases.retryPins()` re-pins `pinFailed` files (leaving `pinned` and
  `staged` alone) with an hourly `retryPins` timer job; `AdminUseCases.listFiles`
  and `GET /admin/files` list files by status behind the admin key. Shared
  `RecordStore.listAll` and `assertKnownStatus` removed duplication. Specs
  `specs/pin-retry.feature`, `specs/admin-file-listing.feature`. Pipeline
  commits: coder `89bbdfa`, refactorer `3810813`, architect `c09c551`
  (verification `git_sha`), merged to `master` at `d418a1145c` (fast-forward).
  `verify.sh api` pass 4/4 (unit 391, property 18, acceptance all 5 suites,
  lint ok); language mutation 0 survived; soft Gherkin admin-file-listing
  10/10 killed, pin-retry 12/17 killed with 5 documented intrinsic survivors
  (4 are a redundant constant `cid` example column the architect flagged for a
  future spec prune; pruning it needs a matching handler change). Independent
  acceptance check after merge: pin-retry 5/5 and admin-file-listing 5/5 (all 5
  suites). Architect summary: `docs/reviews/pin-retry-summary.md`.
- **P5.2 `lighthouse-provider` — first third-party pinning provider
  (2026-10-09):** `LighthouseProvider` pins by CID through an injected HTTP
  client and is registered under `lighthouse` when `PINNING_PROVIDERS=lighthouse`;
  new `LIGHTHOUSE_API_KEY`, `LIGHTHOUSE_API_URL`, and `LIGHTHOUSE_GATEWAY`
  config. A CID mismatch or API error records a failed pin. Spec
  `bch-file-hosting-api/specs/lighthouse-pinning.feature`. Pipeline commits:
  coder `1bf2ca0`, refactorer `70b6453`, architect `912da2b` (verification
  `git_sha`), merged to `master` at `2e2d7464`. `verify.sh api` pass 4/4 (unit
  381, property 13, acceptance all 3 suites, lint ok); language mutation 0
  survived; soft Gherkin 10/12 killed with 2 documented intrinsic survivors.
  Independent acceptance check after merge: lighthouse-pinning 5/5 (all 3
  suites). Architect summary: `docs/reviews/lighthouse-provider-summary.md`.
- **P5.1 `pinning-provider-study` — provider research (2026-10-09):**
  `dev-docs/pinning-providers.md` documents our CID profile (CIDv1, raw leaves,
  1 MiB chunks, dag-pb directory wrap), the pin-by-CID vs upload-bytes
  trade-off, and Lighthouse, Filebase, Pinata, Storacha, and Filecoin Onchain
  Cloud against the §10 criteria. Recommends pin-by-CID for P5.2 (Lighthouse),
  Filebase as the second adapter, Pinata third; defers Storacha and FOC. No
  code; docs-only.
- **Q1 `api-quality-baseline` — quality baseline (2026-10-09):** full
  refactorer -> architect quality pass over `bch-file-hosting-api/`, behavior
  unchanged. Spec `dev-docs/api-quality-baseline.md`. Refactorer `e768509`:
  CRAP ≤ 6.0 everywhere, DRY clean, a new seeded property suite for
  `calculatePrice` and `Invoice.isPaymentSufficient` (9 passing), and shared
  `RecordStore`, `UseCase`, and `sendSuccess` helpers. Architect `7e99d55dbe`:
  language mutation across `src/` 151 killed / **0 survived / 0 uncovered**;
  the two remaining `bin/server.js` mutants are documented
  environmentally-unsuitable entry-shell survivors excluded by design.
  `verify.sh api` pass 4/4 (unit 355, property 9, acceptance all 2 suites, lint
  ok). Merged to `master` at `e960d1af82` (fast-forward; verification record
  `docs/reviews/api-quality-baseline-verification.json` names `7e99d55dbe`,
  and the branch tip adds only docs, so it is valid). Independent check after
  merge: acceptance 2/2 suites and property 9/9. Architect summary:
  `docs/reviews/api-quality-baseline-summary.md`.
- **S0 `reject-empty-upload` — pipeline smoke test (2026-10-09):** the first
  full four-role cycle (specifier -> coder -> refactorer -> architect).
  `FileUpload.validate` now requires a strictly positive `sizeBytes`, so
  `POST /files` with a 0-byte file returns HTTP 422 with
  `{ success: false, error }` and creates no invoice or payment address. Spec
  `bch-file-hosting-api/specs/upload-validation.feature`; verification record
  `docs/reviews/reject-empty-upload-verification.json` (pass).
  `FileUpload.validate` CRAP 12 -> 2. Merged to `master` at `1cc2bcaf51`.
- **Core port, roadmap phase 3 (2026-10-08, built outside the swarm):**
  upload and quote, BCH invoices on unique HD addresses, payment checks,
  local Helia pinning, downloads, 24-hour unpaid cleanup, admin routes, timers.
  Verified on BCH mainnet with `npm run test:integration` (payment txid
  `2c46851a2f7fa7688707ab623bc53976e843c268ce12a06a0c69f27bfb24c360`).
  Commits `c53f614` through `266f55f`.
- **SwarmForge integration, roadmap phase 4 (2026-10-08):** vendored from
  psf-memo; see `docs/process-improvements.md`.
- **Acceptance pipeline proof (2026-10-08):** `bch-file-hosting-api/specs/pricing.feature`
  plus `acceptance/` runner. `npm run test:acceptance` parses, generates, and
  runs the worked pricing examples.
