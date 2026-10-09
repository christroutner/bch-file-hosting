# Architect Review — file-check

**Task:** `file-check` (backlog P6.2, check a payment and print the result)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `47209e7` | specifier | `bch-file-hosting-cli/specs/file-check.feature`; backlog P6.2 in progress |
| `0550367` | coder | `file-check` command, `HostingApi.checkPayment`, acceptance handlers, unit tests |
| `fd6f057` | refactorer | Extract `src/lib/command.js` base, move `file-upload` onto it; property tests for `file-check` and `checkPayment` |
| `af4739a` | architect | Tool-written mutation manifests; tightened CID acceptance assertion |

The verification record `docs/reviews/file-check-verification.json` names
`af4739a`. The branch tip adds only docs, so `git diff af4739a <tip>` touches
only `docs/`.

## Behavior and scope

Adds the second CLI command:

- `file-check -a <address> [--json]` calls `POST /files/check-payment` and
  prints paid (CID + download URL + gateway URLs), unpaid (received/required
  satoshis + quote expiry), or any other status. Exit codes: 0 success, 1
  runtime/API error, 2 usage error.
- `HostingApi.checkPayment` posts JSON through the injected `fetch` and reuses
  the existing `errorMessage`/`readJson` mapping.
- The refactorer extracted a `Command` base class (`validateFlags` / `execute` /
  `report`, with `run` owning the 0/1/2 exit-code policy) and moved `file-upload`
  onto it, removing the duplicated constructors and run loops.

## Architectural findings

### Fixed — CID acceptance assertion was a bare substring match

`Then the command prints the CID <printed_cid>` asserted
`world.stdout.includes(expected)`. The printed download and gateway URLs also
embed the CID, so when soft mutation changed `api_cid` the unmutated CID still
appeared in those URLs and the scenario passed (2 survivors). The step now
asserts the labeled line, `CID: <printed_cid>`, which is exactly what the
command prints. Soft mutation for `file-check.feature` now kills all 42
mutations.

### Positive — the `Command` base is a clean template-method extraction

`src/lib/command.js` owns the shared run/exit-code policy (0 success, 2
`UsageError`, 1 otherwise); subclasses supply `validateFlags`, `execute`, and
`report`. Dependency injection is preserved through `super(deps)`, and
`file-upload`/`file-check` no longer duplicate constructor wiring or the
try/catch mapping. This directly raised cohesion without hiding behavior.

### Positive — dependency direction and boundaries hold

- `command.js` (policy) depends on `hosting-api.js` (adapter) only; the adapter
  imports nothing upward, and `fetch` remains injectable.
- `bch-file-hosting-cli.js` is still the only unsuitable shell (Commander
  wiring) and stays out of `c8` (`src/**`).
- The acceptance handlers now build either command through a single
  `buildCommand` helper, so both suites drive production command code with a
  fake API and captured output.

### Observation (non-blocking) — duplicate example columns are load-bearing

`file-check.feature` carries paired `request_address`/`received_address`,
`api_cid`/`printed_cid`, `api_download_url`/`printed_download_url`, and
`api_gateway_url`/`printed_gateway_url` columns. They look redundant, but each
pair ties an API input to an independently asserted output, so all are
load-bearing and survive-or-kill correctly. No pruning recommended here.

### Observation (non-blocking) — `UsageError` re-exported by each command

`file-upload.js` and `file-check.js` both re-export `UsageError` imported from
`command.js`. It is harmless and keeps each command self-contained; tests could
import from the base instead, but no change is warranted.

### Observation — stale embedded manifest caught by the guard

The refactor changed `file-upload.js` and added `checkPayment` to
`hosting-api.js`, leaving their embedded `mutate4javascript` manifests stale.
`swarmforge/scripts/mutate-file.sh` detected `Selected < Covered` and reran both
with `--mutate-all`; the tool then rewrote the manifests. This is the guard
working as designed.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`:

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/lib/command.js` | 3 | 0 | 0 |
| `src/commands/file-upload.js` | 1 | 0 | 0 |
| `src/commands/file-check.js` | 2 | 0 | 0 |
| `src/lib/hosting-api.js` | 2 | 0 | 0 |

`file-upload.js` and `hosting-api.js` under-selected differentially and were
automatically rerun with `--mutate-all`. No survivors, no uncovered sites.

## DRY (`dry4javascript src`)

`npm run dry` → **No duplicate candidates found** (exit 0). The `Command`
extraction removed the pre-existing constructor/run-loop duplication.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, unit coverage **100%** statements/branches/
functions/lines. Highest CRAP in the component:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `FileCheck.report` | 6 | 100% | 6.0 |
| `errorMessage` | 4 | 100% | 4.0 |
| `Command.run` | 3 | 100% | 3.0 |
| `FileUpload.report` | 3 | 100% | 3.0 |
| others (`validateFlags`, `execute`, adapters) | 1–2 | 100% | 1.0–2.0 |

Component maximum 6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

- `specs/file-check.feature`: **42 total, 42 killed, 0 survived, 0 errors.**
  The first pass produced 2 `api_cid` survivors (40 killed); after the CID
  assertion fix the differential rerun re-executed scenario 1's 16 mutations
  (16 killed) and reused the 26 already-clean mutations.
- `specs/file-upload.feature`: **35 total, 26 killed, 9 survived, 0 errors.**
  All 9 are the previously documented intrinsic `upload_path` survivors
  (no assertion depends on the path). The specifier has since added rule 19 to
  `specifier-prompt.md` and a backlog follow-up to prune/anchor the column, so
  no further action here.

## Verification record

`swarmforge/scripts/verify.sh cli --record docs/reviews/file-check-verification.json --task file-check`

- **result: pass (4/4)**, `git_sha` = `af4739a` (the manifest/handler commit).
- unit: **24 passing**, coverage **100%** statements/branches/functions/lines.
- property: **17 passing** (kept out of unit coverage).
- acceptance: **all 2 generated suites passed** (file-upload 11 + file-check 11
  scenario executions).
- lint: **ok**.

No integration/mainnet test was run.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-cli`. Unit
coverage remains 100%.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `file-check`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
