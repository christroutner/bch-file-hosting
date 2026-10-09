# Architect Review — cli-skeleton

**Task:** `cli-skeleton` (backlog P6.1, first CLI command)
**Component:** `bch-file-hosting-cli` (new); shared SwarmForge scripts
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `c005915` | specifier | `bch-file-hosting-cli/specs/file-upload.feature`; backlog P6.1 in progress |
| `bd7b173` | coder | New CLI component: `file-upload` command, API adapter, acceptance pipeline, unit tests; registers CLI in `verify.mjs`, `monorepo.prompt`, `clean-builds.sh`, `architect-startup.sh` |
| `10d1a0c` | refactorer | CLI property suite (file-upload + hosting-api) and seeded harness |
| `1ecb9f7` | architect | Tool-written mutation manifests; acceptance fixture-handler fixes |

The verification record `docs/reviews/cli-skeleton-verification.json` names
`1ecb9f7`. The branch tip adds only docs, so `git diff 1ecb9f7 <tip>` touches
only `docs/`.

## Behavior and scope

Creates the second active component, a Commander CLI that talks to the hosting
REST API:

- `file-upload -f <path> [--json]` reads a local file, POSTs it to `/files`, and
  prints the quote (price + payment address), an already-hosted download link,
  or an error. Exit codes: 0 success, 1 runtime/API error, 2 usage error.
- The API boundary is `src/lib/hosting-api.js` (injected `fetch`, multipart
  upload, JSON error mapping). The command is `src/commands/file-upload.js`.
- `HOSTING_API_URL` is read from the environment via `config/index.js`, which
  skips `.env` under `SVC_ENV=test`.
- The task also adds the CLI to the monorepo registry (`verify.mjs`,
  `monorepo.prompt`, `clean-builds.sh`, `architect-startup.sh`) and gives it its
  own Gherkin acceptance pipeline and runner adapter.

## Architectural findings

### Fixed — acceptance handler never resolved the `<upload_path>` placeholder

`acceptance/lib/handlers.js` matched `I run file-upload for the file (.+)` and
passed `match[1]` straight to the command. The parser leaves example
placeholders in the step text, so every upload scenario read a literal file
named `<upload_path>` under `tmp/acceptance/`, and the `upload_path` example
column was never exercised. The suite still passed because the fake API's
response is independent of the uploaded path. This is a test-boundary defect:
the acceptance suite did not actually drive the specified input.

Fixed by resolving the token through the existing `expectedText(example, …)`
helper (same convention the other handlers use), in both the normal and the
missing-file steps. Fixtures now appear as `photo.jpg`, `archive.tar`,
`huge.bin`, and `broken.bin`, matching the examples.

### Fixed — acceptance runtime wrote temp files relative to the process cwd

`createWorld` built `path.join(process.cwd(), 'tmp', 'acceptance')`. Under
`gherkin-mutator` the runner worker is launched with the mutator's cwd
(`tmp/aps`), so mutation fixtures landed outside the component. Anchored the
path to the module (`COMPONENT_ROOT = ../../`), so normal acceptance and
mutation runs use the same component-local `tmp/acceptance` regardless of
launch directory. Unit/property tests keep their own `tmp/` trees.

### Positive — clean layering and dependency direction

The component follows the project's Clean Architecture conventions:

- `bch-file-hosting-cli.js` is the only environmentally unsuitable shell
  (Commander wiring, `process.exitCode`); it is excluded from `c8` (`src/**`).
- `src/commands/file-upload.js` (command/controller) depends on
  `src/lib/hosting-api.js` (adapter) and `config`; the adapter knows nothing
  about the command.
- Every collaborator is injected and placed on `this` (`config`, `hostingApi`,
  `output`, `errorOutput`, `fs`, `path`), so unit tests replace all IO and the
  command is fully testable offline. `fetch` is injected into `HostingApi`.
- The acceptance pipeline drives the real production command with an injected
  fake API and captured output, so exit codes and formatting are exercised by
  production code rather than reimplemented in the test layer.

### Positive — test boundaries kept separate

- `test/unit/**` (Mocha/Chai/Sinon, `c8` coverage) is separate from
  `test/property/**`; the property suite is its own `test:property` command and
  does not contribute to coverage, CRAP, or mutation runs.
- The property harness (`test/property/lib/harness.js`) is a test helper under
  the property tree, not mixed into production `src/`.
- The shared `swarmforge/scripts/lib/acceptance-runner.cjs` is reused; the CLI's
  `acceptance/acceptance.js` is a thin adapter, and the APS `runner-worker`
  delegates to the same runtime/handlers as normal acceptance.

### Observation (non-blocking) — `upload_path` is not load-bearing

The feature varies `upload_path` across example rows, but no assertion depends
on the path: the fake API returns the same quote/rejection whatever file is
read, and the command never prints the filename. Mutating the column is
therefore indistinguishable at the acceptance level (see survivors below). Per
the pruning rule, the specifier should either move a single fixed path into the
`Background` (so it is no longer a mutation candidate) or add a `Then` assertion
that ties the uploaded filename to the example. This mirrors the pin-retry
`cid`-column recommendation.

### Observation (non-blocking) — entry shell does not await `parseAsync`

`program.parseAsync(process.argv)` is not awaited or `.catch`-guarded. Risk is
low because `FileUpload.run` catches every error and only sets
`process.exitCode`; left as-is rather than widening the entry shell.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`:

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/commands/file-upload.js` | 4 | 0 | 0 |
| `src/lib/hosting-api.js` | 2 | 0 | 0 |

No survivors and no uncovered sites.

## DRY (`dry4javascript src`)

`npm run dry` → **No duplicate candidates found** (exit 0).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, unit coverage **100%** statements/branches/
functions/lines. Highest CRAP in the component:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `errorMessage` | 4 | 100% | 4.0 |
| `FileUpload.report` | 3 | 100% | 3.0 |
| `FileUpload.run` | 3 | 100% | 3.0 |
| others (`readFile`, `validateFlags`, `HostingApi.upload`, `readJson`) | 2 | 100% | 2.0 |

## Gherkin acceptance mutation (soft)

`specs/file-upload.feature`: **35 total, 26 killed, 9 survived, 0 errors.**

All 9 survivors are `upload_path` example mutations and are intrinsic under the
current assertions:

| Path | Mutation |
|------|----------|
| `$.scenarios[0].examples[0].upload_path` | `./photo.jpg` → `./pHoto.jpg` |
| `$.scenarios[0].examples[1].upload_path` | `./archive.tar` → `./archivE.tar` |
| `$.scenarios[1].examples[0].upload_path` | `./photo.jpg` → `./photo.jpG` |
| `$.scenarios[1].examples[1].upload_path` | `./archive.tar` → `./arcHive.tar` |
| `$.scenarios[3].examples[0].upload_path` | `./huge.bin` → `x/huge.bin` |
| `$.scenarios[3].examples[1].upload_path` | `./broken.bin` → `./broken.biN` |
| `$.scenarios[3].examples[2].upload_path` | `./photo.jpg` → `x/photo.jpg` |
| `$.scenarios[5].examples[0].upload_path` | `./photo.jpg` → `./phOto.jpg` |
| `$.scenarios[5].examples[1].upload_path` | `./archive.tar` → `./archivextar` |

Each mutated path still resolves (via `path.basename`) to a readable fixture,
and every scenario asserts only exit code / printed price / address / download
URL / JSON fields, none of which depend on the filename. APS exposes no project
mutation filter hook, so these are documented rather than chased; the specifier
prune/anchor recommendation above would remove them.

## Verification record

`swarmforge/scripts/verify.sh cli --record docs/reviews/cli-skeleton-verification.json --task cli-skeleton`

- **result: pass (4/4)**, `git_sha` = `1ecb9f7` (the manifest/handler commit).
- unit: **12 passing**, coverage **100%** statements/branches/functions/lines.
- property: **9 passing** (kept out of unit coverage).
- acceptance: **1 generated suite passed** (11 scenario executions).
- lint: **ok**.

The shared-script changes (`verify.mjs`, `monorepo.prompt`, `clean-builds.sh`,
`architect-startup.sh`) also touch the API component, so the API suite was run
as a regression check: `verify.sh api` **pass 4/4** (unit 391, property 18,
acceptance all 5 suites, lint ok), `git_sha` `1ecb9f7`. No API record is
committed because the task's primary component is the CLI.

No integration/mainnet test was run.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-cli`. Unit
coverage remains 100%. The API suite is unaffected.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `cli-skeleton`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
