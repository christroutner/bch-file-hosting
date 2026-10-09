# Architect Review — web-upload-transport

**Task:** `web-upload-transport` (fix the browser `fetch` receiver in the web upload adapter)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `d926571` | specifier | `specs/web-upload-transport.feature`: one scenario outline driving the real adapter over a browser-like global fetch; backlog |
| `4621cb7` | coder | Bind the fetch transport to `globalThis` in `HostingApi`; unit test that fails for a receiver-sensitive fetch; acceptance handlers that drive the real adapter |
| `4fe1ce0` | refactorer | Property test: every transport call (`upload`, `checkPayment`, `getStatus`) invokes fetch with the global receiver |
| `6fdbdf3` | architect | Refresh the tool-written mutation manifests (no source change) |

The branch fast-forwards through the specifier's roadmap phase 7 completion
(`f4161cd`) and the `web-file-status` architect review (`5ed6759`).

The verification record `docs/reviews/web-upload-transport-verification.json`
names `6fdbdf3`. The review tip adds only `docs/`, so `git diff 6fdbdf3 <tip>`
touches only `docs/`.

## Behavior and scope

`HostingApi` stored the bare global `fetch` and later called it as
`this.fetch(...)`, so the receiver was the adapter instance. A browser's native
`fetch` rejects any receiver other than the global object, throwing
`"'fetch' called on an object that does not implement interface Window."`
before any request. The adapter now binds the transport once in its constructor
(`(fetchImpl || fetch).bind(globalThis)`), so all three methods (`upload`,
`checkPayment`, `getStatus`) invoke it with the global receiver. No API or view
behavior changes; the payload/URL paths are untouched.

## Architectural findings

### Positive — the fix lives at the correct boundary

- `src/services/hosting-api.js` is the component's only IO adapter and already
  injects `fetch`/`FormData`, so the page state machines stay testable without a
  browser. The receiver fix is contained there and does not leak into the
  services or views.
- Dependency direction is unchanged: views/UI → page service → injected adapter.
  The browser-environment concern (`globalThis`) is expressed inside the adapter
  that owns the transport.
- The previously implicit "which object is `this`?" invariant is now explicit,
  documented in the constructor comment, and encoded in both a unit test that
  simulates the browser contract and a property test over all three methods.
  Information hiding improves: callers cannot observe the transport binding.

### Positive — the refactorer covered the invariant, not just the symptom

The unit test pins the concrete failure (a `this !== globalThis` fetch throws);
the property test independently asserts the invariant across `upload`,
`checkPayment`, and `getStatus` for any injected transport. Together they kill
the `||`→`&&` constructor mutants that would restore the bare-`fetch` bug.

### Observation (harness state, no change requested)

The new acceptance double assigns `globalThis.fetch` and does not restore it.
This is harmless today: every other feature injects the fake `makeHostingApi`,
and each scenario builds a fresh adapter, so no suite observes a leaked
transport. It is process-global test state worth remembering if a future
feature uses the real adapter without setting its own transport.

No structural change was needed.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/services/hosting-api.js` | 4 | 0 | 0 |

The four sites are the two `&&`→`||` errors in `errorMessage` and the two
`||`→`&&` sites of the `(fetchImpl || fetch)` fallback in the constructor; the
constructor mutants fail the receiver-sensitive fetch (unit) and receiver
assertion (property). The coder's `hosting-api.js` carried a stale manifest; the
run refreshed it. No survivors and no uncovered sites.

## DRY (`dry4javascript`)

Scoped to the changed module: `dry4javascript src/services/hosting-api.js` →
**No duplicate candidates found** (exit 0). The task introduced no new
duplication.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, every function at **100%** coverage. The changed
module stays low (`HostingApi.upload`, `checkPayment`, `getStatus`, `readJson`
at CC 2 → CRAP 2.0; the constructor and helpers at 1.0). Component maximum is
the pre-existing, unchanged `FileUploadPage.waitForConfirmation` at CRAP 5.0,
well below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

- `specs/web-upload-transport.feature` (new): **14 total, 14 killed,
  0 survived, 0 errors**. The tool wrote the `# mutation-stamp` and
  `# acceptance-mutation-manifest-*` blocks, committed as-is.
- Normal acceptance passed all four suites (`web-upload-transport`,
  `web-file-status`, `web-payment`, `web-upload`).
- No regression mutation re-run: the shared handler change is guarded by
  `world.browserTransport`, other features use the fake `makeHostingApi`, and
  the normal acceptance run passed every suite.

## Verification record

`swarmforge/scripts/verify.sh web --record docs/reviews/web-upload-transport-verification.json --task web-upload-transport`

- **result: pass (4/4)**, `git_sha` = `6fdbdf3`.
- unit: **57 passing**.
- property: **55 passing** (kept out of unit coverage).
- acceptance: **all 4 generated suites passed**.
- lint: **ok**.

No integration/mainnet test was run; none exists for the web component.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-web`.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `web-upload-transport`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
