# Architect Review — file-status

**Task:** `file-status` (backlog P6.4, look up a file and print its status and pins)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `d919ea5` | specifier | `specs/file-status.feature`: five scenarios (found file with pins, staged file with no window, missing CID, API error, JSON output) |
| `7806bd9` | coder | `FileStatus` command, `HostingApi.getStatus`, CLI registration, acceptance handlers/steps, unit tests |
| `1698d15` | refactorer | Move the shared subcommand-hook bindings into `FileCommand`; property tests for `FileStatus` and `HostingApi.getStatus`; `hostedUntil`/`pins` fallback unit tests |
| `9446cb9` | architect | Encode the CID path segment in `getStatus` so it cannot change the request path; refresh the tool-written manifests |

The branch also fast-forwards through the specifier's backlog/briefing commits
(`3e50b79` completes `wallet-name-validation`, `d919ea5` specifies this task).

The verification record `docs/reviews/file-status-verification.json` names
`9446cb9`. The branch tip adds only `docs/`, so `git diff 9446cb9 <tip>` touches
only `docs/`.

## Behavior and scope

Adds `file-status -c <cid> [--json]`:

- `HostingApi.getStatus` sends `GET /files/:cid` and maps a non-ok response to a
  `HostingApiError` through the same `errorMessage`/`readJson` helpers as
  `upload` and `checkPayment`.
- `FileStatus` prints the CID, name, size, status, hosting window (or
  `not paid`), and every pin (`Pin: <provider> <status>`); `--json` prints the
  API result as a single line. Exit codes stay 0/1/2.

## Architectural findings

### Fixed — user-supplied CID was interpolated into the request path unencoded

`HostingApi.getStatus` built `${apiUrl}/files/${cid}` from the raw flag. A CID
such as `../admin/invoices?x=1` is normalized by the URL parser, so the CLI
requested a different endpoint instead of `GET /files/:cid`. This is the same
class of path-injection gap the previous task fixed for wallet names: user input
must not be able to change the resource path in the adapter.

`getStatus` now encodes the CID as a single path segment
(`encodeURIComponent(cid)`), so a crafted CID reaches `GET /files/:cid` (and the
API returns its normal unknown-CID response). A unit test pins the encoded URL
for `../admin/invoices?x=1`; valid base32 CIDs are unaffected, so the
acceptance and property suites are unchanged.

### Positive — `getStatus` reuses the adapter's error contract and stays testable

`getStatus` is built on the existing `readJson`/`errorMessage`/`HostingApiError`
machinery, so HTTP errors and non-JSON bodies surface consistently with the other
two endpoints, and `fetch` remains injected. `FileStatus` extends `FileCommand`,
so dependency direction stays command → `HostingApi` adapter with no upward
imports. The acceptance handler builds the real command against a fake
`getStatus` and asserts the CID the adapter received, so exit codes and output
formatting come from production code.

### Positive — the refactorer's binding dedup landed cleanly

Moving `validateFlags`/`execute`/`report` bindings from `FileCheck`/`FileStatus`
constructors into `FileCommand` removed two duplicate constructors and trimmed
`FileUpload`; `FileUpload` still binds its own `readFile`. `WalletCommand`
retains its own bindings for its separate hierarchy, and `dry4javascript`
reports no duplicate candidates, so the two specialization bases are not
redundant.

### Observation (non-blocking) — the acceptance step registry keeps growing

`acceptance/lib/handlers.js` is now a single registry for file-upload,
file-check, file-status, wallet-create, and wallet-balance steps. It is the
established APS project-handler pattern and each handler is small and cohesive;
splitting it by command would add indirection without sharpening a boundary, so
it is left intact.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`. Only the files
this task changed were re-run; unchanged files keep valid manifests.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/commands/file-status.js` | 3 | 0 | 0 |
| `src/lib/hosting-api.js` | 2 | 0 | 0 |
| `src/lib/file-command.js` | 1 | 0 | 0 |
| `src/commands/file-check.js` | 2 | 0 | 0 |
| `src/commands/file-upload.js` | 1 | 0 | 0 |

Four of the five under-selected differentially (`Selected < Covered`);
`mutate-file.sh` detected it and reran with `--mutate-all`. No survivors, no
uncovered sites. The tool rewrote all five embedded manifests.

## DRY (`dry4javascript src`)

`npm run dry` → **No duplicate candidates found** (exit 0).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, unit coverage **100%** statements/branches/
functions/lines. Highest CRAP:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `FileCheck.report` | 6 | 100% | 6.0 |
| `FileStatus.report` | 5 | 100% | 5.0 |
| `errorMessage` | 4 | 100% | 4.0 |
| `Command.run`, `FileUpload.report`, `WalletCommand.validateFlags`, `WalletService.balanceSats`, `WalletStore.read` | 3 | 100% | 3.0 |
| `HostingApi.getStatus` and the remaining functions | 1–2 | 100% | 1.0–2.0 |

Component maximum 6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

- `specs/file-status.feature`: **53 total, 53 killed, 0 survived, 0 errors.**
  Scenario 1 (found file with pins) 32/32, scenario 2 (staged, no window) 9/9,
  scenario 4 (API error) 4/4, scenario 5 (JSON) 8/8. Scenario 3 (missing CID)
  has no example cells to mutate.
- `specs/file-check.feature` (regression): 42 mutations reused clean from the
  committed manifest, 0 re-run (feature unchanged).
- `specs/file-upload.feature` (regression): **35 total, 26 killed, 9 survived** —
  all 9 are the previously documented intrinsic `upload_path` survivors (no
  assertion depends on the path). The specifier backlog still carries the
  follow-up to prune/anchor that column, so it is not chased here.

## Verification record

`swarmforge/scripts/verify.sh cli --record docs/reviews/file-status-verification.json --task file-status`

- **result: pass (4/4)**, `git_sha` = `9446cb9` (the encoding/manifest commit).
- unit: **73 passing**, coverage **100%** statements/branches/functions/lines.
- property: **41 passing** (kept out of unit coverage).
- acceptance: **all 5 generated suites passed** (file-upload, file-check,
  file-status, wallet-create, wallet-balance).
- lint: **ok**.

No integration/mainnet test was run.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-cli`. Unit
coverage remains 100%.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `file-status`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
