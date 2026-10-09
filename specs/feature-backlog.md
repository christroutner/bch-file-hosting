# bch-file-hosting — Feature Backlog

**Status**: DRAFT
**Owner**: specifier.
**Last updated**: 2026-10-08

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
was integrated in phase 4. Next is the pipeline smoke test (S0), then the
quality baseline (Q1), then third-party pinning (phase 5).

## In progress

- None.

## Up next (in order)

### S0. `reject-empty-upload` — pipeline smoke test (api)

- **Goal:** prove the four-role SwarmForge cycle end to end with a tiny change.
- **Behavior:** `POST /files` with a 0-byte file returns HTTP 422 with
  `{ success: false, error: ... }`, creates no invoice, issues no payment
  address, and deletes the temp file. Today a 0-byte file is accepted and billed
  at the 100 KB minimum.
- **Components:** `bch-file-hosting-api` (entity `FileUpload.validate`).

### Q1. `api-quality-baseline` — quality hardening (api; refactorer/architect)

Measured when SwarmForge was vendored (2026-10-08). Unit coverage is 100%.

- **CRAP > 6:** `FileUpload.validate` 12, `Invoice.validate` 12,
  `CleanupUseCases.deleteUnpaid` 7, `FileUseCases.uploadAndQuote` 7,
  `PaymentUseCases.checkPaymentUnlocked` 7.
- **DRY (`npm run dry`):** `FileStore.update` / `InvoiceStore.update`; the
  admin/files controller response pattern; the `FileUseCases` /
  `PaymentUseCases` constructor setup.
- **Mutation:** no baseline yet. Run `mutate4javascript` on `src/` and kill or
  document survivors.
- **Property tests:** none yet. Add a `test:property` script (picked up
  automatically by `verify.sh api`), starting with `calculatePrice` and
  `Invoice.isPaymentSufficient`.
- **Behavior must not change.**

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
