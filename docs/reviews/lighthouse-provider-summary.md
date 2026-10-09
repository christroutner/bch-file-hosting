# Architect Review — lighthouse-provider

**Task:** `lighthouse-provider` (backlog P5.2, first third-party pinning provider)
**Component:** `bch-file-hosting-api`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `010560d` | specifier | `specs/lighthouse-pinning.feature` + P5.2 in progress |
| `1bf2ca0` | coder | `LighthouseProvider`, registry factory, config, acceptance handlers, unit tests |
| `70b6453` | refactorer | Extract pure payload helpers; property tests; harness async variant |
| `912da2b` | architect | Commit tool-written language and Gherkin mutation manifests |

The verification record `docs/reviews/lighthouse-provider-verification.json`
names `912da2b` (the manifest/review commit). The branch tip is the later
docs-only commit that adds this summary; `git diff 912da2b <tip>` touches only
`docs/`.

## Behavior and scope

Adds a config-driven third-party pinning provider without changing existing
runtime behavior when `PINNING_PROVIDERS` does not name `lighthouse`:

- New `src/adapters/pinning/lighthouse.js` implements the existing
  `PinningProvider` contract (`name`, `capabilities`, `pin`, `status`, `unpin`,
  `gatewayUrl`).
- `PinningRegistry` gains a `factories` seam (defaulting to the built-in
  `PROVIDER_FACTORIES`) so tests can inject a fake provider and production
  resolves `lighthouse` by name.
- Config adds `LIGHTHOUSE_API_KEY`, `LIGHTHOUSE_API_URL`, `LIGHTHOUSE_GATEWAY`
  (documented in `.env.example`). No key is committed.
- New acceptance feature covers: pin-by-CID recording, CID-mismatch failure,
  API-error failure, gateway formatting, and config-driven registration.

## Architectural findings

- **Positive — dependency direction preserved.** `LighthouseProvider` sits in
  the adapter layer, extends `PinningProvider`, and is only reachable through
  the registry factory. Use-cases continue to see the provider list via
  `pinning.getProviders()`; nothing in `src/use-cases/` imports Lighthouse.
- **Positive — testable boundary maximized.** The HTTP client is constructor
  injected (`this.fetch = fetch || globalThis.fetch`); the API key and URLs come
  from config. Unit and property tests stub the client, so no network or secret
  is touched. All four `lighthouse.js` helpers used by `pin()`/`status()` are
  pure, raising mutation coverage without IO.
- **Positive — CID consistency guard.** Because the IPFS adapter imports with
  CIDv1 + raw leaves + 1 MiB chunks + directory wrap (P5.1 study §1), a
  byte-upload provider could change the CID. The adapter is pin-by-CID
  (`capabilities.pinByCid = true`, `uploadBytes = false`) and additionally
  rejects a response whose reported CID differs from the issued CID, per
  long-term-plan Q11.
- **Positive — secret handling.** The API key is sent only as a Bearer header;
  it is never logged or included in error text. `readJson` reports the HTTP
  status and response body only.
- **No structural fixes required.** The refactorer's extraction of `payloadOf`,
  `reportedCid`, `reportedRef`, `mapStatus`, `trimTrailingSlash`, and
  `ensureTrailingSlash` is the right level of decomposition, and the acceptance
  harness exercises the real `PaymentUseCases.pinFile` path through the real
  registry rather than reimplementing it.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh` (differential
runs that under-selected were rerun with `--mutate-all`):

- `src/adapters/pinning/lighthouse.js`: **14 killed, 0 survived, 0 uncovered.**
- `src/adapters/pinning/index.js`: **1 killed, 0 survived, 0 uncovered.**
- `config/env/common.js`: **21 killed, 0 survived, 0 uncovered.**

No new survivors and no documented equivalents; the full `src/` baseline from
Q1 stays at 0 survived.

## DRY (`dry4javascript src` and scoped to `src/adapters/pinning`)

`npm run dry` → **No duplicate candidates found** (exit 0). The new provider
does not duplicate `LocalHeliaProvider`; both share only the small
`PinningProvider` contract, which is intended.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, unit coverage **100%** statements/branches/
functions/lines. New provider functions:

| Function | CC | CRAP |
|----------|----|------|
| `LighthouseProvider.pin` | 4 | 4.0 |
| `LighthouseProvider.unpin` | 3 | 3.0 |
| `LighthouseProvider.findUpload` / `status` | 2 | 2.0 |
| `name` / `capabilities` / `headers` / `gatewayUrl` | 1 | 1.0 |

Component maximum remains 6.0 (`calculatePrice`, `InvoiceStore.list`), below the
CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

`gherkin-mutator --level soft --workers 8` on
`bch-file-hosting-api/specs/lighthouse-pinning.feature`: **12 total, 10 killed,
2 survived, 0 errors.** Both survivors are intrinsic equivalents — the
acceptance assertions are intentionally insensitive to the mutated value:

- `$.scenarios[0].examples[1].api_cid` (a mismatching CID, mutated by one
  character): the reported-CID comparison is binary. Any CID different from the
  issued CID follows the identical mismatch branch, records the identical
  `failed` Lighthouse pin, and yields the same `pinFailed` file status. No
  acceptance assertion can distinguish one non-matching CID from another; the
  exact CID values are pinned by the unit test "should fail when Lighthouse
  reports a different CID".
- `$.scenarios[1].examples[0].http_status` (`500 -> 492`): any non-2xx status
  takes the same `readJson` failure path and records the same `failed` pin. The
  scenario asserts only file/pin status, so the exact error code cannot be
  distinguished through acceptance; specific codes (500, 503) are pinned by the
  unit tests.

The APS mutator exposes no project filter hook and these values are genuinely
indistinguishable at the acceptance level, so they are documented rather than
chased. Scenarios 3 and 4 (gateway URL, config registration) were recorded clean
in the committed manifest.

## Verification record

`swarmforge/scripts/verify.sh api --record docs/reviews/lighthouse-provider-verification.json --task lighthouse-provider`

- **result: pass (4/4)**, `git_sha` = `912da2b` (the manifest/review commit).
- unit: **381 passing**, coverage **100%** statements/branches/functions/lines.
- property: **13 passing**.
- acceptance: **all 3 generated suites passed** (`pricing`, `upload-validation`,
  `lighthouse-pinning`).
- lint: **ok**.

No integration/mainnet test was run; the provider is exercised only through the
injected HTTP client.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass. Unit coverage remains 100%.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `lighthouse-provider`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
