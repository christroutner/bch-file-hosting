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
full four-role cycle. Q1 set the language-quality baseline. Next is
third-party pinning (phase 5), starting with the P5.1 provider study.

## In progress

- None.

## Up next (in order)

### P5.1. `pinning-provider-study` — research (docs only)

- Fill in `dev-docs/pinning-providers.md` using the criteria in the long-term
  plan (section 10) for Lighthouse first, then Pinata, Filebase, Storacha, and
  Filecoin Onchain Cloud.
- Key questions for Lighthouse: pin by CID or upload bytes? Does an upload
  return the same CID as our Helia import (CIDv1, raw leaves, 1 MiB chunks,
  wrapping directory)? Is unpin supported? Gateway URL format?
- Not a coding task; the specifier does it with the user before P5.2.

### P5.2. `lighthouse-provider` — first third-party pinning provider (api)

- `LighthouseProvider extends PinningProvider` in
  `src/adapters/pinning/lighthouse.js`, registered under `lighthouse` in
  `PROVIDER_FACTORIES`, enabled with `PINNING_PROVIDERS=lighthouse`.
- New config: `LIGHTHOUSE_API_KEY` (the user provides the key; never commit it).
- `pin()` records `providerRef`; `gatewayUrl()` returns the Lighthouse gateway
  link, which `buildLinks` already appends to `gatewayUrls`.
- If Lighthouse returns a different CID than ours, the pin is recorded as
  `failed` with a clear error (long-term plan Q11).
- Unit tests stub the HTTP client; no real Lighthouse calls in tests.

### P5.3. `pin-retry` — retry failed pins (api)

- A timer retries pinning for files in `pinFailed` status.
- `GET /admin/files?status=pinFailed` lists them (admin API key).

### P6.1. `cli-skeleton` — first CLI command (new component)

- Create `bch-file-hosting-cli/` following `/home/trout/work/llm/prompt/cli/README.md`
  and add it to `verify.mjs`, `monorepo.prompt`, `clean-builds.sh`, and
  `architect-startup.sh`.
- First command: `file-upload -f <path>` prints the quote.

## Needs a decision from the user

These come from the long-term plan's open questions (section 14). Do not spec
them until the user decides.

- **Expiry policy (Q1):** what happens when a file's year of hosting ends.
- **Renewals / multi-year (Q2).**
- **OP_RETURN announcement format (Q3)** for the stubbed announcer.
- **Late payments and refunds (Q9).**

## Recently completed

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
