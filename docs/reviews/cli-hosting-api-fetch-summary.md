# Architect Review — cli-hosting-api-fetch

**Task:** `cli-hosting-api-fetch` (bind the CLI `HostingApi` transport to the global receiver; cli)
**Component:** `bch-file-hosting-cli`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `3405d90` | specifier | Backlog: mark `web-hosting-api-url` complete (carried in this fast-forward) |
| `a39cd9f` | specifier | New `specs/cli-hosting-api-transport.feature` (four scenarios) |
| `7adf1d5` | coder | Bind `fetch` to `globalThis` in `HostingApi`; receiver-sensitive unit tests and acceptance handlers |
| `15875da` | refactorer | Receiver property test in `test/property/hosting-api.property.js` |
| `571517c` | architect | Tool-generated language and Gherkin mutation manifests |

The branch fast-forwards from the previous review tip `74270bf`. The
verification record names `571517c`; the review tip adds only `docs/`.

## Behavior and scope

`HostingApi` previously stored the injected (or global) `fetch` and invoked it as
`this.fetch(...)`. A browser's native `fetch` rejects any receiver other than the
global object, so the call failed before a request was sent. The constructor now
stores `(fetchImpl || fetch).bind(globalThis)`, so `upload`, `checkPayment`,
`getStatus`, and `listFiles` all invoke the transport with the global receiver.

This is the CLI counterpart of the already-merged `web-upload-transport` fix, and
the CLI now matches `bch-file-hosting-web/src/services/hosting-api.js`
(`(fetchImpl || fetch).bind(globalThis)`).

## Architectural review

### Positive — the binding lives in the adapter, not the callers

The receiver requirement is a transport detail of the REST adapter, so binding it
once in `HostingApi`'s constructor is the right boundary. The command layer still
receives an injected adapter and knows nothing about `fetch` or its receiver, and
no command changed. Dependency direction is unchanged.

### Positive — the contract is pinned at all three test levels

The unit suite uses a browser-like double that throws on a non-global receiver,
the property suite asserts `this === globalThis` across all four methods over
random inputs, and the acceptance feature drives the real adapter through the
same double. A future regression to a bare `this.fetch(...)` fails all three, so
the fix cannot be silently reverted (matching the `web-upload-transport`
coverage).

### Observation — falsy injected transport falls back to the global

`(fetchImpl || fetch)` treats a falsy injected value as absent and binds the
global `fetch`. That is defensive and correct for the documented
`{ config, fetch }` contract; an intentional non-function truthy value would
still fail at call time, as before. No change needed.

### Observation — Node 22 guarantees the global `fetch`

The fallback references the global `fetch`, which exists on Node 18+ and is
guaranteed by the component's `engines` target (Node 22). No polyfill is needed.

No structural fix was required; the only architect changes are the tool-generated
manifests.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run via `swarmforge/scripts/mutate-file.sh src/lib/hosting-api.js`:

- `--scan` reports **3 total sites**; the run selected and evaluated all 3
  (Selected == Covered, so no `--mutate-all` fallback), **3 killed, 0 survived,
  0 uncovered**.

## DRY (`dry4javascript`)

Scoped to the changed module and to `src/lib/`: **no duplicate candidates found**
for either run.

## Cyclomatic complexity / CRAP

`npm run crap` -> **exit 0**, every analyzed function at **100%** unit coverage.
`HostingApi` functions are at most **5.0** (`listFiles`). The component maximum
remains the pre-existing `FileCheck.report`, `FileList.report`, and
`FileUpload.report` at **6.0**, at the target.

## Gherkin acceptance mutation (soft)

`bch-file-hosting-cli/specs/cli-hosting-api-transport.feature`: **40 total, 40
killed, 0 survived, 0 errors.** Every example in all four scenarios is
load-bearing, so the mutator wrote a complete manifest covering indices 0-3.

## Verification record

`swarmforge/scripts/verify.sh cli --record docs/reviews/cli-hosting-api-fetch-verification.json --task cli-hosting-api-fetch`, `git_sha` = `571517c`:

- **cli — pass (4/4):** unit **125 passing**, property **67 passing**,
  acceptance **all 9 suites passed**, lint **ok**.

No integration/mainnet test was run.

## Suite status

`bch-file-hosting-cli`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run lint`, and the scoped `dry`
run all pass. The API and web components were not touched.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `cli-hosting-api-fetch`.
- No follow-up work assigned to coder or refactorer.

By architect.
