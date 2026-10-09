# Architect Review — file-pay

**Task:** `file-pay` (backlog P6.5, pay an invoice from a local wallet)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `4d6457c` | specifier | `specs/file-pay.feature`: eight scenarios (pay unpaid, already paid, expired, missing address, missing wallet, unknown wallet, API error, JSON) |
| `e8a0dab` | coder | `FilePay` command, `WalletService.sendSats`, CLI registration, acceptance handlers/steps, unit tests |
| `485cad8` | refactorer | `FilePay` now extends `WalletCommand` (drops a duplicated constructor and wallet-name validation); property tests for `FilePay` and `WalletService.sendSats` |
| `1a7d74b` | architect | Cover the 1-satoshi payment boundary (mutation survivor); document the PSF donation in the adapter; refresh the tool-written manifests |

The branch also fast-forwards through the specifier's `file-status` backlog
commit (`05956a4`).

The verification record `docs/reviews/file-pay-verification.json` names
`1a7d74b`. The branch tip adds only `docs/`, so `git diff 1a7d74b <tip>` touches
only `docs/`.

## Behavior and scope

Adds `file-pay -a <address> -n <name> [--json]`:

- Calls `POST /files/check-payment`; an unpaid invoice sends
  `requiredSats - receivedSats` from the named local wallet to the invoice
  address and prints the amount and txid. A paid invoice is a no-op success; an
  expired invoice, an unknown wallet, or an API error fails with exit 1.
- `WalletService.sendSats` builds a wallet from the stored mnemonic/hdPath,
  `initialize()`s it, and sends one `{ address, amountSat }` output.

## Architectural findings

### Fixed — mutation survivor at the payment-amount boundary

`WalletService.sendSats` guards `!Number.isInteger(amountSats) || amountSats <= 0`,
but no test sent exactly one satoshi, so the `<= 0 -> <= 1` mutant survived
(lowering the valid range to `>= 2`). Added a unit test that broadcasts the
smallest valid amount (1 sat) and asserts the exact output. `wallet-service.js`
now kills all 7 covered mutations.

### Decision required — every CLI payment adds a 2,000-sat PSF donation

`WalletService.sendSats` calls `minimal-slp-wallet`'s `send()`. That method
unconditionally appends a 2,000-sat PSF donation output
(`node_modules/minimal-slp-wallet/lib/send-bch.js`), so a `file-pay` payment
debits the payer `amountSats + 2,000 + miner fee`, not `amountSats + miner fee`.
This is the exact donation the project deliberately avoids on the server side:
`WalletAdapter.sweep` builds its own transaction, and specifier rule 12 records
that the donation "made every sweep of a minimum invoice fail." For the CLI the
payment still succeeds, but on a 2,000-sat minimum invoice it doubles the
payer's cost, and the effect is invisible to the unit/acceptance/property suites
because they stub `sendSats`.

The adapter now documents the side effect next to the call. The architect did
**not** hand-roll a donation-free payment transaction during review, because
(a) it cannot be validated against mainnet (integration tests are human-only,
per the constitution) and (b) whether the CLI should donate to PSF is a
product decision. **Recommendation:** the specifier should add a follow-up to
either build a donation-free `sendSats` mirroring `WalletAdapter.sweep` (with
change) or explicitly accept and document the donation.

### Positive — `FilePay` reuses `WalletCommand` cleanly

The refactorer removed a duplicated constructor and a copy of the wallet-name
validation by making `FilePay` extend `WalletCommand`. `FilePay` adds only the
`HostingApi` dependency and checks `-a` before delegating `-n` to
`super.validateFlags`. Dependency direction stays command →
`HostingApi`/`WalletStore`/`WalletService`, all injected, so the acceptance
handlers can stub `sendSats` and no scenario can spend real BCH.

### Positive — satoshi units are correct end to end

`sendSats` passes `amountSat` (satoshis), matching `minimal-slp-wallet`'s output
shape; the property tests pin the exact `{ address, amountSat }` object, and the
guard rejects non-integer/non-positive amounts before building a wallet. This
keeps the "satoshis only" rule from the long-term plan.

### Observation (non-blocking) — one line of adapter construction duplicated

`FilePay` constructs its own default `HostingApi` because it extends
`WalletCommand`, not `FileCommand`. It is a single line and `dry4javascript`
reports no duplicate candidates, so no change is warranted.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/commands/file-pay.js` | 2 | 0 | 0 |
| `src/lib/wallet-service.js` | 7 | 0 | 0 |

The first `wallet-service.js` pass killed 6 and left the `<= 0 -> <= 1`
survivor; the boundary test fixed it, and the `--mutate-all` rerun killed all 7.
No survivors, no uncovered sites. The tool rewrote both manifests.

## DRY (`dry4javascript src`)

`npm run dry` → **No duplicate candidates found** (exit 0). The refactorer's
`WalletCommand` reuse removed the duplicated wallet-name validation.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, unit coverage **100%** statements/branches/
functions/lines. Highest CRAP:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `FileCheck.report` | 6 | 100% | 6.0 |
| `FileStatus.report`, `WalletService.sendSats` | 5 | 100% | 5.0 |
| `errorMessage`, `FilePay.execute` | 4 | 100% | 4.0 |
| `Command.run`, `FilePay.report`, others | 1–3 | 100% | 1.0–3.0 |

Component maximum 6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

- `specs/file-pay.feature`: **36 total, 36 killed, 0 survived, 0 errors.**
  Scenario 1 (pay unpaid) 18/18, scenario 6 (unknown wallet) 4/4, scenario 7
  (API error) 4/4, scenario 8 (JSON) 10/10. Scenarios 2–5 have no example cells.
- Regressions: `file-status` 53 mutations and `file-check` 42 reused clean;
  `file-upload` 26 killed / 9 documented intrinsic `upload_path` survivors;
  `wallet-create`/`wallet-balance` re-ran only their documented scenario-4
  mnemonic-hygiene survivors. No new survivors.

## Verification record

`swarmforge/scripts/verify.sh cli --record docs/reviews/file-pay-verification.json --task file-pay`

- **result: pass (4/4)**, `git_sha` = `1a7d74b` (the boundary/documentation commit).
- unit: **90 passing**, coverage **100%** statements/branches/functions/lines.
- property: **52 passing** (kept out of unit coverage).
- acceptance: **all 6 generated suites passed** (file-upload, file-check,
  file-status, file-pay, wallet-create, wallet-balance).
- lint: **ok**.

No integration/mainnet test was run.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-cli`. Unit
coverage remains 100%.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `file-pay`. The
  2,000-sat-donation decision above is the one open follow-up for the specifier.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
