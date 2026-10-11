# Architect Review — cli-host-txid

**Task:** `cli-host-txid` (print the payment transaction in the CLI `file-host` result; cli)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `c55fda6` | specifier | Assert the printed transaction in `File Host - 1` |
| `05eb731` | coder | Print `Transaction:` in the paid `file-host` result |
| `d754634` | refactorer | Cover the file-host transaction in the property suite |
| `bba0e2e` | architect | Refresh the cli-host-txid mutation manifests |

The branch fast-forwards from the previous review tip `30b41d4`. The
verification record names `bba0e2e`; the review tip adds only `docs/`.

## Behavior and scope

- The paid `file-host` result now prints `Transaction: <txid>` after the
  gateway URLs, matching the web paid result. The `txid` was already carried in
  the command's own result object; no adapter or API change was needed. The
  already-hosted branch is unchanged because no payment happens.
- `File Host - 1` gained a `printed_txid` column and a `the command prints the
  transaction` assertion, making the cell load-bearing.

## Architectural findings

### Positive — the task closes the previously documented mutation gap

The three `api_txid` soft-mutation survivors reported since the `file-host`
review are now down to one intrinsic case: both `File Host - 1` cells are killed
because the printed transaction is asserted.

### Positive — presentation-only, no new coupling

`FileHost.report` prints `result.txid`, which `execute` already builds from the
wallet's broadcast. Nothing is recomputed and the API contract is untouched.

### Observation — the failing scenario's txid stays intrinsic

`File Host - 2` (unconfirmed payment fails after the retries) still has one
surviving `api_txid` mutation. The command exits with code 1 before printing the
paid result, so the broadcast txid is only a mock return value and never reaches
any assertion. This is inherent to the scenario's purpose (it checks the failure
path), so it is documented rather than chased; APS exposes no project mutation
filter hook.

No structural fix was required; the only architect change is the tool-generated
manifest refresh.

### Observations — carry-forwards (no change made)

1. The remaining `file-host` survivors are the documented intrinsic
   `upload_path` case/path mutations plus the one failing-scenario txid above.
2. `DashboardPage.loadMore` still drops the loaded list on a later-page error
   (`dashboard-loadmore-error`, web side, not touched here).

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run via `swarmforge/scripts/mutate-file.sh`:

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/commands/file-host.js` | 8 | 0 | 0 |

The changed source file is fully killed.

## DRY (`dry4javascript`)

Scoped to the changed module **and** across the whole `src/`: **No duplicate
candidates found** (exit 0 for each).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, every analyzed function at **100%** unit coverage.
Maximum CRAP is **6.0** (`FileUpload.report`, `FileList.report`,
`FileCheck.report`), at the target.

## Gherkin acceptance mutation (soft)

`bch-file-hosting-cli/specs/file-host.feature`: **77 total, 66 killed, 11
survived, 0 errors.**

- Ten are the documented intrinsic `upload_path` case/path mutations (the
  mocked API and the printed links come from separate example columns).
- One is the `File Host - 2` `api_txid` cell described above.

The two `File Host - 1` `api_txid` cells that survived before this task are now
killed. The surviving scenarios are omitted from the manifest, so they re-mutate
next run.

## Verification record

`swarmforge/scripts/verify.sh cli --record
docs/reviews/cli-host-txid-verification.json --task cli-host-txid`, `git_sha` =
`bba0e2e`:

- **cli — pass (4/4):** unit **121 passing**, property **66 passing**,
  acceptance **all 8 suites passed**, lint ok.

No integration/mainnet test was run.

## Suite status

`bch-file-hosting-cli`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, `npm run lint` all
pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `cli-host-txid`.
- No follow-up work assigned to coder or refactorer.

By architect.
