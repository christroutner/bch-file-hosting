# Architect Review — wallet-create

**Task:** `wallet-create` (backlog phase 6, local wallet commands)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `af8edf3` | specifier | `specs/wallet-create.feature`, `specs/wallet-balance.feature`; backlog updated |
| `7a73f25` | coder | `wallet-create`/`wallet-balance` commands, `wallet-service`, `wallet-store`, `wallet-command`, config/entry wiring, acceptance handlers, unit tests |
| `edb8e59` | refactorer | Extract shared `WalletCommand` base; property tests for the commands, service, and store |
| `3b6a799` | architect | Tool-written mutation manifests; `FileCommand` split, zero-balance unit test, dead-return removal |

The verification record `docs/reviews/wallet-create-verification.json` names
`3b6a799`. The branch tip adds only docs, so `git diff 3b6a799 <tip>` touches
only `docs/`.

## Behavior and scope

Adds two local-wallet commands to the CLI:

- `wallet-create -n <name>` generates a wallet through `minimal-slp-wallet`,
  stores it as `<name>.json` under the gitignored `.wallets/` directory, and
  prints its address. The mnemonic is persisted (so the wallet can sign later)
  but never printed.
- `wallet-balance -n <name>` reads the named wallet and prints its integer
  satoshi balance; the mnemonic is never printed. Exit codes stay 0/1/2.
- New `WALLET_URL` / `WALLET_INTERFACE` config and the `minimal-slp-wallet`
  dependency. The refactorer extracted a shared `WalletCommand` base
  (`-n <name>` validation plus wallet store/service defaults).

## Architectural findings

### Fixed — generic `Command` base depended on the `HostingApi` IO adapter

`src/lib/command.js` imported `HostingApi` and constructed one by default, so
the adapter-free template-method base (and every wallet command, which has no
HTTP dependency) carried a low-level IO dependency it never used. This is a
Dependency Rule violation: high-level policy depending on a low-level adapter.

Fixed by adding `src/lib/file-command.js`, which owns the default `HostingApi`
construction, and moving `file-upload`/`file-check` onto it. `Command` is now
adapter-free and wallet commands no longer build an unused `HostingApi`.

### Fixed — zero-balance path had no unit coverage

`WalletService.balanceSats` rejects a non-integer or negative backend balance,
but the unit suite only exercised a non-integer and a positive value, so
mutating `balance < 0` to `<= 0` or `< 1` survived (2 mutants). Added a unit
test that a `0` balance is accepted (it is valid per the `wallet-balance`
examples). Mutation now kills all sites.

### Fixed — unused `WalletStore.write` return value

`write` returned a constant `true` that no caller or assertion consumed, so
`true -> false` survived (1 mutant). Removed the dead return value; nothing
depends on it and the store's surface is smaller.

### Positive — wallet boundaries are clean and testable

- Dependency direction is command → `WalletCommand` → `WalletService` /
  `WalletStore`. `WalletStore` is the only filesystem boundary and takes `dir`
  and `fs` by injection; `WalletService` takes the wallet class by injection, so
  unit and property tests never read real state or touch the network.
- The acceptance pipeline exercises the real commands and the real
  `WalletStore` (per-scenario `mkdtemp` directory) with a fake wallet service,
  so exit codes, storage, and output formatting come from production code.
- The mnemonic is written only to the gitignored `.wallets/` store and is
  asserted absent from stdout. This is distinct from the API's invoice-key rule
  ("never persist or log a WIF or mnemonic"), which governs service-side keys;
  a local signing wallet must persist its mnemonic to function.

### Observation (non-blocking) — wallet names are not constrained to the store directory

`WalletStore.filePath` does `path.join(this.dir, \`${name}.json\`)` with the
user-supplied name. A name containing a path separator or `..` escapes
`.wallets/` and can read or overwrite files elsewhere on disk. This is a
robustness/security gap, not a spec violation today (the spec only checks a
missing name). Recommend the specifier add an invalid-name scenario and the
store/command reject names outside the store directory, or document the
accepted name grammar.

### Observation (non-blocking) — scenario 4 of both wallet features is mutation-inert

`Wallet Create - 4` / `Wallet Balance - 4` ("the mnemonic is never printed") are
purely negative assertions: the mnemonic is placed in the fake service/store,
and the only check is its absence from stdout. Changing the mnemonic (or the
wallet name in the create scenario) cannot change the outcome, so those cells
survive soft mutation. This is intrinsic to a negative assertion, but the test
could be made meaningful by first asserting the secret exists in the store.
Recommend the specifier add a positive store assertion tying the wallet name and
mnemonic to the example, or prune the column (the name is already asserted in
scenario 1). APS exposes no project mutation-filter hook, so it is documented
rather than chased.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`:

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/lib/wallet-command.js` | 3 | 0 | 0 |
| `src/lib/wallet-service.js` | 3 | 0 | 0 |
| `src/lib/wallet-store.js` | 2 | 0 | 0 |
| `src/commands/wallet-create.js` | 0 | 0 | 0 |
| `src/commands/wallet-balance.js` | 0 | 0 | 0 |
| `src/lib/command.js` (changed) | 2 | 0 | 0 |
| `src/lib/file-command.js` (new) | 1 | 0 | 0 |
| `src/commands/file-upload.js` (changed) | 1 | 0 | 0 |
| `src/commands/file-check.js` (changed) | 2 | 0 | 0 |

`wallet-create`/`wallet-balance` legitimately have no mutation sites (pure
orchestration: the report shows `Covered mutation sites: 0`). Several files
under-selected differentially after the changes and were rerun with
`--mutate-all`. No survivors, no uncovered sites remain.

## DRY (`dry4javascript src`)

`npm run dry` → **No duplicate candidates found** (exit 0). The shared
`Command`, `FileCommand`, and `WalletCommand` bases removed the command
constructor/run-loop duplication.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, unit coverage **100%** statements/branches/
functions/lines. Highest CRAP:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `FileCheck.report` | 6 | 100% | 6.0 |
| `errorMessage` | 4 | 100% | 4.0 |
| `Command.run`, `FileUpload.report`, `WalletService.balanceSats`, `WalletStore.read` | 3 | 100% | 3.0 |
| others | 1–2 | 100% | 1.0–2.0 |

Component maximum 6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

- `specs/wallet-create.feature`: **18 total, 12 killed, 6 survived, 0 errors.**
  All 6 survivors are in scenario 4: `wallet_name`, `new_mnemonic`, and
  `hidden_mnemonic` for each example (negative-assertion equivalents above).
- `specs/wallet-balance.feature`: **20 total, 16 killed, 4 survived, 0 errors.**
  All 4 are scenario 4's `wallet_mnemonic` and `hidden_mnemonic` for each
  example. The `wallet_name`/`request_name` cells are killed because the command
  must find the wallet by the requested name.
- `specs/file-upload.feature` (regression): 35 total, 26 killed, 9 survived —
  the previously documented intrinsic `upload_path` cells.
- `specs/file-check.feature` (regression): 0 re-run, 42 mutations reused clean
  from the committed manifest.

## Verification record

`swarmforge/scripts/verify.sh cli --record docs/reviews/wallet-create-verification.json --task wallet-create`

- **result: pass (4/4)**, `git_sha` = `3b6a799` (the manifest/fix commit).
- unit: **47 passing**, coverage **100%** statements/branches/functions/lines.
- property: **30 passing** (kept out of unit coverage).
- acceptance: **all 4 generated suites passed** (file-upload, file-check,
  wallet-create, wallet-balance).
- lint: **ok**.

No integration/mainnet test was run.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-cli`. Unit
coverage remains 100%.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `wallet-create`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
