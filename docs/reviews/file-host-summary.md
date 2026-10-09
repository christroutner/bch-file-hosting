# Architect Review — file-host

**Task:** `file-host` (backlog P6.6, upload, pay, and confirm in one step)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `0a1a72d` | specifier | `specs/file-host.feature`: eight scenarios (upload+pay+retry, unconfirmed, already hosted, missing file, missing wallet, missing local file, upload rejection, JSON) |
| `41005d3` | coder | `FileHost` command, acceptance handlers/steps, CLI registration, unit tests |
| `2a683d5` | refactorer | Extract `attachWallet`/`validateWalletName` from `WalletCommand` so `FileHost` reuses the wallet deps and name grammar; property tests for `FileHost` |
| `1f78ae2` | architect | Cover the poll-sleep boundary (3 mutation survivors); make the JSON scenario's sent amount/address/txid load-bearing; refresh the tool-written manifests |

The branch also fast-forwards through the specifier's `file-pay` completion and
the accepted CLI PSF donation decision (`b5c6e9a`).

The verification record `docs/reviews/file-host-verification.json` names
`1f78ae2`. The branch tip adds only `docs/`, so `git diff 1f78ae2 <tip>` touches
only `docs/`.

## Behavior and scope

Adds `file-host -f <path> -n <name> [--json]`:

- Uploads the file, short-circuits on an `alreadyHosted` quote, otherwise pays
  the quote's `priceSats` from the named local wallet and polls
  `POST /files/check-payment` until the payment is visible, then prints the CID,
  download URL, and gateway URLs. A never-confirmed payment fails with
  `Payment not confirmed.` Exit codes stay 0/1/2.

## Architectural findings

### Fixed — poll-sleep boundary left three mutation survivors

`FileHost.pollPayment` guards the inter-attempt delay with
`if (attempt < this.paymentCheckAttempts - 1)`. The unit suite asserted the
`checkPayment` call count but not the sleep count, so `< -> <=`, `- -> +`, and
`1 -> 0` all survived: each makes the loop sleep after the final check. The
property suite pins the invariant, but property tests do not contribute to
language mutation. Added unit assertions that the delay runs exactly between
attempts and never after the confirming or final check.
`src/commands/file-host.js` now kills all 8 covered sites.

### Fixed — unasserted example columns in the JSON scenario

Soft mutation initially left 19 survivors. Six were the `api_sats`,
`api_address`, and `api_txid` cells of `File Host - 8`: the JSON scenario
asserted only the CID and download URL, so the sent amount, payment address,
and transaction id were unasserted (rule 19). Added
`And the wallet paid <sent_amount> ... to <sent_address>` and
`And the JSON output has the transaction <json_txid>` (with a new step handler)
so those cells are independently load-bearing. The `file-host` survivor count
dropped from 19 to 13.

### Positive — shared wallet helpers keep `FileHost` on one dependency path

`FileHost` extends `FileUpload` (for `readFile` and the `-f` check) and cannot
also extend `WalletCommand`, so the refactorer extracted `attachWallet` and
`validateWalletName` from `wallet-command.js` and `FileHost` calls them
directly. Dependency direction stays command →
`HostingApi`/`WalletStore`/`WalletService`, all injected; `dry4javascript`
reports no duplicate candidates.

### Positive — bounded polling with an injected timer

`sleep`, `paymentCheckAttempts`, and `paymentCheckDelayMs` are all injectable.
The acceptance handlers inject a no-op sleep, so no scenario waits on a real
timer, and the unit tests inject a stub to assert the exact retry count. The
poll is bounded and fails cleanly on exhaustion.

### Observation (intrinsic, documented) — remaining 13 soft-mutation survivors

After the JSON-scenario fix, 13 cells still survive soft mutation:

- **10 are `upload_path` cells** across scenarios 1, 2, 3, 7, and 8. The
  acceptance handler builds the fixture with `path.basename(upload_path)`, so no
  assertion depends on the path value. This is the same intrinsic class as the
  `file-upload` `upload_path` column, which already has a specifier backlog
  follow-up.
- **3 are `api_txid` cells** in scenarios 1 and 2. `file-host` reports only the
  hosted result in text mode, and the unconfirmed scenario throws before it
  reports, so neither observes the broadcast txid.

**Recommendation:** the specifier should either add an independently-asserted
uploaded-filename step (making `upload_path` load-bearing), print and assert
the transaction id on the text path, or prune the unasserted columns — the same
option rule 19 gives for `file-upload`. This is a feature-quality decision, so
it is deferred rather than changed in the review.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/lib/wallet-command.js` | 3 | 0 | 0 |
| `src/commands/file-host.js` | 8 | 0 | 0 |

The first `file-host.js` pass killed 5 and left the three poll-sleep survivors;
the boundary unit tests fixed them, and the `--mutate-all` rerun killed all 8.
No survivors, no uncovered sites. The tool rewrote both manifests.

## DRY (`dry4javascript src`)

`npm run dry` → **No duplicate candidates found** (exit 0). The shared wallet
helpers removed the wallet-name validation duplicate.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, unit coverage **100%** statements/branches/
functions/lines. Highest CRAP:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `FileCheck.report` | 6 | 100% | 6.0 |
| `FileHost.report`, `FileStatus.report`, `WalletService.sendSats` | 5 | 100% | 5.0 |
| `errorMessage`, `FileHost.execute`, `FileHost.pollPayment`, `FilePay.execute` | 4 | 100% | 4.0 |
| `attachWallet`, `Command.run`, and the rest | 1–3 | 100% | 1.0–3.0 |

Component maximum 6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

- `specs/file-host.feature`: first pass **61 total, 42 killed, 19 survived**;
  after the load-bearing fix **67 total, 54 killed, 13 survived, 0 errors**.
  The 13 survivors are the documented intrinsic `upload_path` (10) and non-JSON
  `api_txid` (3) cells above.
- Regressions: `file-upload` 26 killed / 9 documented intrinsic `upload_path`
  survivors; `file-check` 42 mutations and `file-status` 53 reused clean.

## Verification record

`swarmforge/scripts/verify.sh cli --record docs/reviews/file-host-verification.json --task file-host`

- **result: pass (4/4)**, `git_sha` = `1f78ae2` (the acceptance/boundary commit).
- unit: **107 passing**, coverage **100%** statements/branches/functions/lines.
- property: **58 passing** (kept out of unit coverage).
- acceptance: **all 7 generated suites passed** (file-upload, file-check,
  file-status, file-pay, file-host, wallet-create, wallet-balance).
- lint: **ok**.

No integration/mainnet test was run.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-cli`. Unit
coverage remains 100%.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `file-host`. The 13
  soft-mutation survivors above are the open follow-up for the specifier.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
