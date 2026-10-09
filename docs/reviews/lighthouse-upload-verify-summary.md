# Architect Review — lighthouse-upload-verify

**Task:** `lighthouse-upload-verify` (upload bytes to Lighthouse and pin in the background)
**Component:** `bch-file-hosting-api`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `e931b78` | specifier | `background-pinning.feature` (new), `lighthouse-pinning.feature`/`pin-retry.feature` updated; backlog |
| `0388fe7` | coder | Lighthouse uploads bytes + verifies the gateway; background pinning; authoritative providers; retry without re-upload; `PINNING` status; config |
| `96fa16e` | refactorer | Split the Lighthouse response/content helpers, full branch coverage, property tests |
| `f6f10f5` | architect | **Fix:** kill two Lighthouse mutants with tests; refresh the tool-written manifests |

The branch fast-forwards through the specifier's `ipfs-provide-best-effort`
completion (`494e7ee`), the re-provide follow-up closure (`42a80b3`), and the
backlog update (`e01ca7a`).

The verification record `docs/reviews/lighthouse-upload-verify-verification.json`
names `f6f10f5`. The review tip adds only `docs/`, so `git diff f6f10f5 <tip>`
touches only `docs/`.

## Behavior and scope

- **Lighthouse adapter:** pins by uploading the file bytes to the kubo-compatible
  `/api/v0/add?wrap-with-directory=true&cid-version=1&raw-leaves=true&pin=true`
  endpoint (so the reported CID can match our wrapping-directory CID), fails on
  a reported-CID mismatch, then verifies retrieval with `HEAD <gateway>/<cid>/<filename>`
  (retrying `verifyAttempts` times). `capabilities` is now
  `{ pinByCid: false, uploadBytes: true, unpin: true, authoritative: true }`.
  Content is normalized from a Blob, web ReadableStream, or async iterable.
- **Background pinning:** `completePayment` records the payment, sets the file to
  `pinning`, and runs pin+announce off the request path (`runInBackground`, a
  tracked `background` Set with `whenBackgroundIdle()` for tests/shutdown).
- **Authoritative providers:** the file is `pinned` when every authoritative
  provider succeeded; `local-helia` is `authoritative: false`, so a failed local
  pin is recorded but does not fail the file.
- **Retry:** `pinFile` skips providers already recorded `pinned`, so a retry
  never re-uploads; `needsPinRetry` also retries a failed best-effort local pin.
- New `PINNING` file status and `isPaidFileStatus` includes it.
- Config: `LIGHTHOUSE_UPLOAD_URL`, `LIGHTHOUSE_VERIFY_ATTEMPTS`,
  `LIGHTHOUSE_VERIFY_DELAY_MS`.

## Architectural findings

### Positive — the slow IO is off the request path, and tracked

Background pinning is scoped to `PaymentUseCases` with a tracked `background`
Set and `whenBackgroundIdle()`, so tests are deterministic and shutdown *can*
drain it. `runInBackground` catches and logs, so no unhandled rejection. The
`pinning` status is a first-class entity state and downloads stay allowed
(`isPaidFileStatus`).

### Positive — authoritative vs best-effort is explicit

Modeling `authoritative` on the provider capability map (rather than hard-coding
Lighthouse) keeps the use-case provider-agnostic and preserves the old behavior
when no provider declares itself authoritative.

### Positive — the upload-bytes CID risk is handled

The study warned upload-bytes providers cannot match our CID reliably; the
adapter uses the CID-matching add query *and* rejects a reported mismatch, then
verifies the gateway content length. Real APIs checked: `ipfs.cat({ cid, filename })`
matches the real adapter (so `pinArgs` is correct); `FormData`, `Blob`,
`Response`, `TextEncoder` exist on Node 22; the endpoint/query shape matches the
Lighthouse upload API.

### Architect fix — two Lighthouse mutants killed

`mutate4javascript` on the rewritten `lighthouse.js` left **3 survivors**:

| Line | Function | Mutant | Action |
|------|----------|--------|--------|
| 78 | `isWrappingDirectory` | `\|\| -> &&` | **Killed** by a test where the wrapping directory is not the last add-response entry |
| 193 | `verify` | `true -> false` | **Killed** by asserting `verify` resolves `true` |
| 101 | `isReadableStream` | `&& -> \|\|` | **Documented equivalent** |

The `isReadableStream` mutant is a true equivalent: `isBlob` short-circuits for
Blobs, and for an async iterable Node's `new Response(iterable).blob()` yields
byte-identical output to `collectChunks` (verified directly:
`[104,101,108,108,111,1,2,3]`). No test can distinguish them because there is no
behavioral difference.

### Observations — follow-ups (no change made)

1. **`whenBackgroundIdle()` is not wired into shutdown.** Its comment says "used
   by tests and shutdown", but `Server.stop()`/`shutdown()` never call it, so a
   SIGINT exits without draining background pins. Wiring it naively could hang
   shutdown if the Lighthouse HTTP call hangs (no request timeout); a bounded
   drain (or an HTTP timeout) is the right fix. This is new behavior and belongs
   in a spec.
2. **A crash mid-pin can strand a file in `pinning`.** `needsPinRetry` only
   recovers `pinFailed` or a file with a failed pin; a `pinning` record left by a
   killed process (all recorded pins `pinned`, status not yet updated) is never
   retried. Consider treating `pinning` as needing recovery.
3. **`verifyOnce` requires `content-length`.** A gateway that streams chunked
   (no `content-length`) yields `Number(null) === 0 !== sizeBytes` and fails
   verification. Acceptable for Lighthouse today; worth noting.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`. Mutation runs
took up to ~90s, so they were given a longer guard than the 60s used for quick
commands.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/adapters/pinning/lighthouse.js` | 22 | 1 (equivalent) | 0 |
| `src/use-cases/payment-use-cases.js` | 16 | 0 | 0 |
| `src/adapters/pinning/local-helia.js` | 4 | 0 | 0 |
| `src/entities/file-upload.js` | 10 | 0 | 0 |
| `src/adapters/pinning/pinning-provider.js` | 0 | 0 | 0 (0 total sites) |

Before the fix, `lighthouse.js` was 20 killed / 3 survived; after, 22/1. Three
files carried stale manifests and were rerun with `--mutate-all`. The tool
refreshed every manifest.

## DRY (`dry4javascript`)

Scoped to the five changed modules: **No duplicate candidates found** (exit 0).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, all functions at **100%** coverage. Highest changed
functions: `PaymentUseCases.pinFile` 6.0, `LighthouseProvider.pin` 5.0,
`parseAddedCid` 5.0, `LighthouseProvider.verify`/`verifyOnce` 4.0. The component
maximum is 6.0, at (not above) the CRAP 6 target.

## Gherkin acceptance mutation (soft)

| Feature | Total | Killed | Survived | Note |
|---------|-------|--------|----------|------|
| `background-pinning.feature` (new) | 9 | 9 | 0 | clean; stamp written |
| `lighthouse-pinning.feature` | 19 | 16 | 3 | intrinsic, below |
| `pin-retry.feature` | 22 | 17 | 5 | intrinsic, below |

All survivors are intrinsic equivalents of the documented
echoed-input/any-error class, not new behavior regressions:

- `upload_cid` (lighthouse scenario 1 row 1 and scenario 5): any CID different
  from the file CID fails the pin, so the exact value is not load-bearing.
- `cid` (pin-retry scenarios 1 and 2): the CID is used consistently for the file
  and the upload, so mutating it still succeeds.
- `http_status 500 -> 492` (lighthouse and pin-retry): any 4xx/5xx maps to a
  failed pin.

**Specifier follow-up:** anchor these columns with an independent assertion (for
example the error message includes the reported CID) or accept them as
documented equivalents, matching the existing CLI `upload_path`/pin-retry `cid`
follow-up. Because these runs had survivors, their feature stamps are absent and
their manifests hold only clean scenarios.

Normal acceptance passed all seven suites.

## Verification record

`swarmforge/scripts/verify.sh api --record docs/reviews/lighthouse-upload-verify-verification.json --task lighthouse-upload-verify`

- **result: pass (4/4)**, `git_sha` = `f6f10f5`.
- unit: **428 passing** (the two added Lighthouse tests).
- property: **28 passing**.
- acceptance: **all 7 generated suites passed**.
- lint: **ok**.

No integration/mainnet test was run (it needs the network and real BCH).

## Suite status

`bch-file-hosting-api`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, and `npm run lint`
all pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `lighthouse-upload-verify`.
  The shutdown-drain, `pinning` recovery, and Gherkin-column follow-ups above are
  the carry-forward items.
- No follow-up work assigned to coder/refactorer in this batch, so no
  priority-00 handoffs.

By architect.
