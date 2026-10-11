# Architect Review — file-list

**Task:** `file-list` (CLI command for the public file feed; cli)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `bb17a83` | specifier | Specify the `file-list` CLI feed command and queue CLI/web parity follow-ups |
| `6085fd9` | coder | Add `file-list [--limit] [--cursor] [--json]` and `HostingApi.listFiles` |
| `b183802` | refactorer | Cover the command and the API query with property tests |
| `ccf1019` | architect | Refresh the file-list mutation manifests |

The branch fast-forwards from the previous review tip `48ff30f`. The
verification record names `ccf1019`; the review tip adds only `docs/`.

## Behavior and scope

- New `file-list [--limit <n>] [--cursor <c>] [--json]` command: calls
  `GET /files` and prints each hosted file's CID, name, size, paid time,
  hosting end, download URL, and view URL, then `Next cursor:` when the feed has
  one. An empty feed prints `No files are hosted yet.`; an API error exits 1
  with the API message; `--json` prints one JSON object.
- New `HostingApi.listFiles({ limit, cursor })` adapter method; the command is
  registered in the entry shell `bch-file-hosting-cli.js`.

## Architectural findings

### Positive — the limit rule is owned by the API, not duplicated in the client

`FileList.validateFlags` accepts any flags and lets the server decide: the
`1..100` bound lives only in the API's `parsePageLimit`, and the CLI surfaces the
422 message through `HostingApiError`. Adding a local range check would create a
second source of truth for a rule the API already enforces.

### Positive — dependency direction and injection preserved

`FileList` extends `FileCommand`, which owns the `HostingApi` adapter;
`hostingApi`, `output`, and `errorOutput` are injected on `this`, so the command
has no IO of its own and is fully unit- and property-testable. The adapter keeps
the same `GET -> readJson -> error` shape as `getStatus`.

### Positive — opaque cursor stays opaque

`listFiles` builds the query with `URLSearchParams` (so any cursor characters are
encoded) and never inspects the cursor, matching the API contract that the token
is passed back exactly as returned.

### Positive — refactorer property coverage is meaningful and separate

The new property suites assert feed order, detail and link printing, the
conditional next cursor, the empty-feed message, flag pass-through, the single
JSON object round trip, and the error exit code; the adapter suite round-trips
limit/cursor into the query string and checks the error fallback. They stay in
`test/property/**`, excluded from unit coverage, CRAP, mutation, and acceptance.

No structural fix was required; the only architect change is the tool-generated
manifest refresh.

### Observations — carry-forwards (no change made)

1. The specifier queued the remaining CLI/web parity gaps in the backlog:
   `cli-quote-details`, `cli-view-link`, `cli-host-txid`.
2. `DashboardPage.loadMore` still drops the loaded list on a later-page error
   (`dashboard-loadmore-error`, web side, not touched here).

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/commands/file-list.js` | 3 | 0 | 0 |
| `src/lib/hosting-api.js` | 2 | 0 | 0 |

A direct `--mutate-all` run confirmed the adapter file has exactly the two
`errorMessage` sites; `listFiles` exposes no site under the tool's operator set,
so the differential run did not under-select.

## DRY (`dry4javascript`)

Scoped to the two changed modules **and** across the whole `src/`: **No
duplicate candidates found** (exit 0 for each).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, every analyzed function at **100%** unit coverage.
Maximum CRAP is **6.0** (`FileList.report`, `FileCheck.report`), at the target;
`HostingApi.listFiles` is **5.0**.

## Gherkin acceptance mutation (soft)

`bch-file-hosting-cli/specs/file-list.feature`: **46 total, 44 killed, 2
survived, 0 errors.**

Both survivors are intrinsic equivalents:

- `File List - 4` `limit: 5 -> 4` and `limit: 100 -> 102`. The scenario runs the
  command with `<limit>` and asserts the API received the same `<limit>`; the
  mutation moves the input and the expectation together, so no fixed value can
  distinguish them. It is a deliberate pass-through check, mirroring how the
  file-feed `limit` survivors behave.

The surviving scenario is omitted from the manifest, so it re-mutates next run.

## Verification record

`swarmforge/scripts/verify.sh cli --record
docs/reviews/file-list-verification.json --task file-list`, `git_sha` =
`ccf1019`:

- **cli — pass (4/4):** unit **120 passing**, property **66 passing**,
  acceptance **all 8 suites passed**, lint ok.

No integration/mainnet test was run.

## Suite status

`bch-file-hosting-cli`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, `npm run lint` all
pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `file-list`.
- No follow-up work assigned to coder or refactorer.

By architect.
