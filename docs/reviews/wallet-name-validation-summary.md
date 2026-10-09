# Architect Review — wallet-name-validation

**Task:** `wallet-name-validation` (backlog hardening follow-up to `wallet-create`)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `014d8e7` | specifier | `specs/wallet-create.feature`, `specs/wallet-balance.feature`: add scenarios 5 ("an unsafe wallet name is a usage error"); normalize the wallet-balance request-name placeholder |
| `618d69f` | coder | `WalletCommand.validateFlags` rejects names outside `[A-Za-z0-9_-]+` before any store access; unit tests for both commands and the shared base |
| `612e4fc` | refactorer | Extract `randomString`/`randomWallet` into the property harness; add `test/property/wallet-command.property.js` pinning the accepted grammar and store containment |
| `4cc6844` | architect | Move the wallet-name grammar to `WalletStore` and enforce it at the store boundary; unit/property coverage for the guard |

The branch also fast-forwards through the `wallet-create` merge commits and the
specifier's briefing/backlog updates (`49a9563`, `d3e54d4`, `0564342`), which
touch only docs and the feature/backlog files.

The verification record `docs/reviews/wallet-name-validation-verification.json`
names `4cc6844`. The branch tip adds only `docs/`, so `git diff 4cc6844 <tip>`
touches only `docs/`.

## Behavior and scope

Closes the security follow-up raised in `docs/reviews/wallet-create-summary.md`:
wallet names become `<name>.json` files under `.wallets/`, so a name with a path
separator or `..` previously escaped the store. Now both local wallet commands
reject a name outside `[A-Za-z0-9_-]+` with exit code 2 and the message
`Invalid wallet name "<name>". Use only letters, digits, hyphens, and
underscores.`, before reading or writing the store.

## Architectural findings

### Fixed — name-safety invariant was enforced only above the module that owns it

`WalletCommand.validateFlags` held the `[A-Za-z0-9_-]+` pattern while
`WalletStore.filePath` continued to `path.join(dir, \`${name}.json\`)` with the
raw name. The rule and the representation it protects lived in different
modules, and `WalletStore` did not preserve its own invariant for any caller
that skipped the command layer.

The grammar now lives next to the `<name>.json` representation in
`src/lib/wallet-store.js` (`WALLET_NAME_PATTERN`, exported `isValidWalletName`),
and `filePath` throws for an invalid or non-string name. `WalletCommand`
imports `isValidWalletName` and keeps the user-facing `UsageError` (exit 2);
the store guard is defense in depth for direct callers. This is an information
hiding and encapsulation fix: the store now hides the naming rule with the
representation and cannot be used to build a path outside its directory.

### Positive — validation sits in the shared base, not the two commands

Both `WalletCreate` and `WalletBalance` inherit the check from `WalletCommand`,
so the rule and its usage-error message exist once. Dependency direction stays
command → `WalletStore`/`WalletService`; both dependencies are injected, and the
store remains the only filesystem boundary (with `dir`/`fs` injection), so unit
and property tests never touch real state or the network.

### Positive — the property suite is an independent oracle

`test/property/wallet-command.property.js` declares its own `SAFE_NAME` regex
(not the production predicate) and asserts three invariants over 600 generated
inputs plus an adversarial list: a name is accepted exactly when it matches the
grammar, every accepted name resolves to a file directly inside the store, and
a rejected name is a usage error that touches neither the store nor the wallet
service. The refactorer's harness extraction removed the duplicated generators
from four property files.

### Observation (intrinsic, documented) — scenario 4 remains mutation-inert

`Wallet Create - 4` / `Wallet Balance - 4` ("the mnemonic is never printed") are
purely negative assertions: mutating the mnemonic or the create name cannot
change the outcome. The soft-mutation survivors below are all in these two
scenarios. APS exposes no project mutation-filter hook. This was already
reported in the `wallet-create` review; the specifier backlog still carries the
follow-up ("add a positive store assertion or accept the documented
survivors"), so it is left to the specifier rather than chased here.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`. Only the two
`src/` files changed by this task were re-run; the rest are unchanged and their
manifests remain valid.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/lib/wallet-store.js` | 3 | 0 | 0 |
| `src/lib/wallet-command.js` | 3 | 0 | 0 |

Both files under-selected differentially after the guard was added
(`Selected 1 < Covered 3`); `mutate-file.sh` detected it and reran with
`--mutate-all`. No survivors, no uncovered sites. The tool rewrote both embedded
manifests.

## DRY (`dry4javascript src`)

`npm run dry` → **No duplicate candidates found** (exit 0). Centralizing the
grammar removed the only duplicated pattern (the command's copy).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, unit coverage **100%** statements/branches/
functions/lines. Highest CRAP:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `FileCheck.report` | 6 | 100% | 6.0 |
| `errorMessage` | 4 | 100% | 4.0 |
| `Command.run`, `WalletCommand.validateFlags`, `WalletService.balanceSats`, `WalletStore.read` | 3 | 100% | 3.0 |
| `isValidWalletName`, `WalletStore.filePath` (new) | 2 | 100% | 2.0 |

Component maximum 6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

- `specs/wallet-create.feature`: **18 total, 12 killed, 6 survived, 0 errors.**
  Scenario 5's 12 mutations (name + printed error for six examples) are all
  killed and are now recorded in the manifest.
- `specs/wallet-balance.feature`: **20 total, 16 killed, 4 survived, 0 errors.**
  Scenario 5's 12 mutations are all killed and are now recorded in the manifest.
- All 10 survivors are scenario 4 cells (`wallet_name`/`new_mnemonic`/
  `hidden_mnemonic` for wallet-create, `wallet_mnemonic`/`hidden_mnemonic` for
  wallet-balance) — the documented negative-assertion equivalents above.

## Verification record

`swarmforge/scripts/verify.sh cli --record docs/reviews/wallet-name-validation-verification.json --task wallet-name-validation`

- **result: pass (4/4)**, `git_sha` = `4cc6844` (the guard commit).
- unit: **59 passing**, coverage **100%** statements/branches/functions/lines.
- property: **33 passing** (kept out of unit coverage).
- acceptance: **all 4 generated suites passed** (file-upload, file-check,
  wallet-create, wallet-balance; all 12 scenario-5 executions pass).
- lint: **ok**.

No integration/mainnet test was run.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-cli`. Unit
coverage remains 100%.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `wallet-name-validation`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
