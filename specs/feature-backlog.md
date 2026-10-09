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
**roadmap phase 6 (CLI) is complete**. P7.1 `web-upload` begins roadmap phase 7
by forking `bch-wallet-web3-spa` into `bch-file-hosting-web`; it is complete and
merged at `f2e3615e99`.

## In progress

- **P7.3 `web-file-status` — look up a file and show its status and pins
  (started 2026-10-09):** add a `/status` view with a CID input and a link from
  the payment result; it shows the CID, file name, size, status, hosting window
  (`not paid` when unpaid), and each pin (provider + status), plus a blank-CID
  prompt and the API error. Add `HostingApi.getStatus`, encoding the CID as one
  path segment (gotcha #22) and unit-testing it (the acceptance fake stubs the
  adapter). Spec `bch-file-hosting-web/specs/web-file-status.feature` (four
  scenarios). Handed to the coder as task `web-file-status`.

## Up next (in order)
- **Spec-quality follow-ups:** the CLI `upload_path` cells (file-upload,
  file-host) and the file-host non-JSON `api_txid` cells survive soft mutation
  because no assertion depends on them; either anchor them with a `Then` or
  prune the columns. The wallet mnemonic-hygiene scenarios remain
  mutation-inert.

## Needs a decision from the user

- None open. Q1 (expiry), Q2 (renewals), Q3 (OP_RETURN), and Q9 (late
  payments/refunds) are decided in the long-term plan's Decisions Log
  (D26–D29); none needs new Gherkin.

## Recently completed

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
