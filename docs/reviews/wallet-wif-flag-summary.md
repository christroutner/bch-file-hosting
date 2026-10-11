# Architect Review — wallet-wif-flag

**Task:** `wallet-wif-flag` (accept a `--wif <wif>` wallet source beside `-n <name>`; cli)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `a5345c4` | specifier | Backlog: mark `links-contract` complete (carried in this fast-forward) |
| `afcdb13` | specifier | New `specs/wallet-source.feature`; usage-message updates in the three wallet features |
| `734f9aa` | coder | `--wif` flag wired through the CLI, `validateWalletSource`/`resolveWalletSource`, WIF-capable `WalletService`, unit + acceptance coverage |
| `54ba55a` | refactorer | Property coverage for the wallet-source validation, resolution, and WIF service paths |
| `a5dc711` | architect | Unit assertion that pins the balance address; tool-generated language and Gherkin manifests |

The branch fast-forwards from the previous review tip `b6f5e1d`. The
verification record names `a5dc711`; the review tip adds only `docs/`.

## Behavior and scope

`wallet-balance`, `file-pay`, and `file-host` now accept `--wif <wif>` as an
alternative to `-n <name>`. Exactly one source is required:
`validateWalletSource` rejects a missing source (`You must specify a wallet name
with the -n flag or a WIF with the --wif flag.`) and a conflicting pair
(`Specify either a wallet name (-n) or a WIF (--wif), not both.`) with a usage
error (exit 2). `resolveWalletSource` returns an inline `{ wif }` without
touching the store, or reads the named wallet from the store. `WalletService`
maps the source to a constructor secret (`walletSecret`: a WIF has no HD path)
and reads the balance from the wallet's own derived address when the source has
no stored address. `wallet-create` stays name-only.

## Architectural review

### Positive — the WIF secret stays inside the adapter boundary

A WIF flows flag -> `resolveWalletSource` -> `WalletService.walletSecret` ->
`new BchWallet(secret, ...)`. It is never stored, returned in a result object,
or printed: `wallet-balance` prints only the satoshi balance, `file-pay` prints
the amount and txid, and `file-host` prints the CID and URLs. No command result
or error path echoes the wallet source. The new acceptance step
`the command does not print the WIF` asserts this, and `walletSecret` is the one
place that maps a source to a constructor secret, so the representation is not
leaked into the command layer.

### Positive — exactly-one-source validation is centralized

`validateWalletSource` is the single rule, reused by `WalletCommand`
(wallet-balance, file-pay) and composed by `FileHost` (which extends
`FileUpload`, not `WalletCommand`). `FileHost.resolveWallet` is a one-line
delegation to the shared `resolveWalletSource`. `wallet-create` overrides
`validateFlags` with `validateWalletName` so a WIF cannot create a wallet.

### Positive — dependencies remain injected

`walletStore`, `walletService`, and `BchWallet` are injectable, so unit and
property tests never read disk state or the network. The acceptance suite uses
the real `WalletCommand`/`FilePay`/`FileHost` with a stubbed wallet service and
records the wallet source so a WIF payer is asserted (not just the amount and
address).

### Observation — a WIF on the command line is visible to the OS

Passing `--wif` exposes the key to `ps`/process listings and shell history. This
is inherent to the requested flag (the CLI already accepted `--wif` on the
psf-memo side) and is the operator's choice; the alternative is a name/password
source. Documented, not changed.

### Fix applied — pin the balance address (killed a language-mutation survivor)

`WalletService.balanceSats` reads `walletData.cashAddress || wallet.walletInfo.cashAddress`.
The `|| -> &&` mutant survived because the unit suite stubbed `getBalance` with
no argument assertion: for a WIF source the mutant queries the balance with an
undefined address. The property suite already asserted the address, but the
language mutation tool runs only the unit suite (property tests are excluded by
the constitution), so it did not see that assertion. I added the address
assertion to the unit fixture and the WIF/stored-wallet tests; the survivor is
now killed. This is a real contract (the WIF's own derived address), not a
tautological check.

No module boundary or dependency direction needed a structural fix.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

One run per changed source file via `swarmforge/scripts/mutate-file.sh`:

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/lib/wallet-command.js` | 5 | 0 | 0 |
| `src/lib/wallet-service.js` | 8 | 0 | 0 |
| `src/lib/wallet-balance.js` | 0 | 0 | 0 |
| `src/commands/wallet-create.js` | 0 | 0 | 0 |
| `src/commands/file-pay.js` | 2 | 0 | 0 |
| `src/commands/file-host.js` | 8 | 0 | 0 |

**23 killed, 0 survived, 0 uncovered.** `wallet-command.js`, `file-host.js`, and
`file-pay.js` were differentially under-selected on the first pass; the wrapper
reran them with `--mutate-all` and all covered sites are now accounted for. The
two zero-site modules are structural (no targetable operators).

## DRY (`dry4javascript`)

Scoped to the changed modules and to `src`: **no duplicate candidates found** for
either run.

## Cyclomatic complexity / CRAP

`npm run crap` -> **exit 0**, every analyzed function at **100%** unit coverage.
Changed functions peak at **5.0** (`validateWalletSource`,
`WalletService.sendSats`, `FileHost.report`). The component maximum remains the
pre-existing `FileCheck.report`, `FileList.report`, and `FileUpload.report` at
**6.0**.

## Gherkin acceptance mutation (soft)

| Feature | Total | Killed | Survived | Errors |
|---------|------:|-------:|---------:|-------:|
| `wallet-source.feature` (new) | 50 | 30 | 20 | 0 |
| `wallet-balance.feature` | 8 | 4 | 4 | 0 |
| `file-pay.feature` | 0 | 0 | 0 | 0 |
| `file-host.feature` | 77 | 66 | 11 | 0 |

The `wallet-balance` and `file-host` survivors are the previously documented
intrinsic ones (mnemonic-hygiene scenario, `upload_path` cells, and the
`File Host - 2` `api_txid`). The `file-pay` change touched a plain scenario with
no examples, so soft mutation has nothing to mutate there.

**`wallet-source.feature` survivor taxonomy (20):**

- **`wif` (8) — intrinsic.** The acceptance wallet service is stubbed, so the
  WIF's exact value is opaque to the command; the assertions compare the sent
  source to the same column, and a mutated WIF stays self-consistent. Only the
  real `WalletService` (unit/property tested) can observe the string.
- **`hidden_wif` (6) — intrinsic, prune candidate.** The "does not print the WIF"
  step checks a copy column that is never tied to the flag actually passed. Its
  exact value is unobservable because the command prints neither. Removing the
  column (asserting against the `wif` value) would drop these six without losing
  coverage.
- **`request_name` (2) — intrinsic.** The both-sources usage error does not
  mention the name, so its value is not load-bearing.
- **`upload_path` (2) — intrinsic.** The documented case/path survivors; the
  printed CID comes from a separate column.
- **`api_txid` (2) — fixable spec gap.** `Wallet Source - 3` (file-host pays from
  a WIF) verifies the payment and the printed CID but never asserts the printed
  transaction, so the broadcast txid is not load-bearing. `Wallet Source - 2`
  (file-pay) does assert it and is fully killed. Adding
  `And the command prints the transaction <printed_txid>` and a `printed_txid`
  column to scenario 3 would kill both — the same fix the specifier applied to
  `File Host - 1` in `cli-host-txid`. Left to the specifier (feature ownership);
  flagged below.

## Verification record

`swarmforge/scripts/verify.sh cli --record docs/reviews/wallet-wif-flag-verification.json --task wallet-wif-flag`, `git_sha` = `a5dc711`:

- **cli — pass (4/4):** unit **136 passing**, property **72 passing**,
  acceptance **all 10 suites passed** (up from 9; the new wallet-source suite is
  included), lint **ok**.

No integration/mainnet test was run.

## Suite status

`bch-file-hosting-cli`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run lint`, and the scoped `dry`
run all pass. The API and web components were not touched.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `wallet-wif-flag`.
- Follow-ups for the specifier (no coder/refactorer work): assert the printed
  transaction in `Wallet Source - 3`, and consider pruning the redundant
  `hidden_wif` column in `wallet-source.feature`.

By architect.
