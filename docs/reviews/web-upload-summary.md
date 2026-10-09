# Architect Review — web-upload

**Task:** `web-upload` (backlog P7.1, web skeleton and upload quote)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `98033a8` | specifier | `specs/web-upload.feature`: four scenarios (quote, already hosted, no file, API error); record the `bch-wallet-web3-spa` fork and dual-payment decision as long-term-plan D30; update the backlog |
| `f3d850d` | coder | Fork `bch-wallet-web3-spa` into `bch-file-hosting-web` and add the upload-quote view, the web acceptance pipeline, and unit tests; onboard the component into `verify.mjs`, `clean-builds.sh`, `architect-startup.sh`, and the monorepo rules |
| `08e24ee` | refactorer | Add the property-test harness and 17 properties; replace the result view's `switch` with a status→children lookup (CRAP 6.0 → 2.0) |
| `314fdc2` | architect | Remove the unused `resultState`/`errorState` exports (information hiding); add the unit test that covers the `hostedState` filename fallback; record the tool-written mutation manifests |

The branch also fast-forwards through the specifier's phase-6 completion and the
Q1/Q2/Q3/Q9 decisions (`2d42022`, `123d8fc`).

The verification record `docs/reviews/web-upload-verification.json` names
`314fdc2`. The branch tip adds only `docs/`, so `git diff 314fdc2 <tip>` touches
only `docs/`. The record left by the coder (`git_sha` `98033a8`, branch
`swarmforge-coder`) was stale and has been regenerated.

## Behavior and scope

Adds the first phase-7 view: choose a file, `POST /files`, then render the quote
(file name, price in satoshis, payment address), the already-hosted download
link, a no-file prompt, or the API error. The forked wallet app is kept intact;
only the upload path is in the tested surface.

## Architectural findings

### Positive — UI, core, and IO are cleanly separated

- `src/services/file-upload-page.js` is a pure page state machine. It maps a
  chosen file plus an injected hosting-API result to one of four display states
  and has no DOM, network, or framework dependency.
- `src/services/hosting-api.js` is a small IO adapter with `fetch` and
  `FormData` injected, so the network boundary is unit-testable without a
  network.
- `src/components/app-body/file-hosting/upload-quote-view.js` is presentational
  and written with plain `React.createElement`, so the browser page and the
  Node acceptance run render the exact same component.
- `src/components/app-body/file-hosting/index.js` is the only environmentally
  unsuitable shell (react-bootstrap hook, file input). It wires the adapter and
  service and delegates all behavior to the testable modules.

Dependency direction is UI/IO → service: the service depends only on the
injected adapter abstraction, and no core module imports a framework or IO
module.

### Fixed — information hiding: unused internal exports removed

`file-upload-page.js` exported `resultState` and `errorState` as public API, but
nothing outside the module consumed them. Removed both exports; the module now
exposes only the class and the stable `NO_FILE_MESSAGE` constant.

### Fixed — mutation survivor in the already-hosted filename fallback

`hostedState` falls back with `response.filename || filename`. The unit suite
only exercised the case where the API filename matched the uploaded name, so
`|| -> &&` survived. Added a unit test that uploads a locally-named file while
the API reports a different stored filename, then asserts the page prefers the
API name. The file now kills all 4 covered sites.

### Observation — the forked wallet template stays outside the tested surface

Most of the fork (`App.js`, the wallet, BCH send, SLP tokens, sweep, deploy
scripts) is untested template code. The refactorer kept it out of the
feature's testable modules and documented the pre-existing DRY candidates there.
That is the right boundary for a phase-7 fork: the feature adds only the upload
path, and the wallet shell is inherited, not authored. The backlog's P7.2/P7.3
will grow the tested surface. No structural change was made to the template.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/services/hosting-api.js` | 4 | 0 | 0 |
| `src/services/file-upload-page.js` | 4 | 0 | 0 |
| `src/components/app-body/file-hosting/upload-quote-view.js` | 0 | 0 | 0 |

`file-upload-page.js` first passed 3 killed / 1 survived (the `hostedState`
fallback above); the added unit test produced a clean rerun. The view has no
mutable operators (arithmetic/comparison/equality/boolean/logical/`0<->1`
constants), confirmed by `--scan`, so its zero is structural, not
under-selected. The tool rewrote both source manifests.

## DRY (`dry4javascript`)

- Scoped to the reviewed modules
  (`src/services/hosting-api.js`, `src/services/file-upload-page.js`,
  `src/components/app-body/file-hosting/upload-quote-view.js`):
  **No duplicate candidates found** (exit 0).
- Broad `npm run dry` on `src` reports only the pre-existing fork duplicates the
  refactorer documented — `import-wallet.js`/`send-token-button.js`,
  `wallet-summary.js`'s two toggles, and `placeholder2.js`/`placeholder3.js`.
  None involve the feature modules, so no change was made.

## Cyclomatic complexity / CRAP

`npm run crap` (scoped to the testable upload modules) → **exit 0**, all
functions at **100%** coverage. Reviewed-module maximum CRAP:

| Function | CC | Coverage | CRAP |
|----------|----|----------|------|
| `errorMessage` | 4 | 100% | 4.0 |
| `errorState`, `FileUploadPage.upload`, `resultState` | 3 | 100% | 3.0 |
| `hostedState`, `HostingApi.upload`, `quoteState`, `readJson`, `statusChildren`, `UploadQuoteView` | 2 | 100% | 2.0 |
| `FileUploadPage.getViewModel`, `hostedChildren`, `messageChildren`, `quoteChildren` | 1 | 100% | 1.0 |

Component maximum 4.0, below the CRAP 8 threshold. The refactorer's
status→children lookup removed the previous 6.0 function.

## Gherkin acceptance mutation (soft)

`specs/web-upload.feature`: **32 total, 32 killed, 0 survived, 0 errors**.
Every example row in all three outlines is load-bearing. The tool rewrote the
feature's mutation stamp and manifest.

## Verification record

`swarmforge/scripts/verify.sh web --record docs/reviews/web-upload-verification.json --task web-upload`

- **result: pass (4/4)**, `git_sha` = `314fdc2`.
- unit: **15 passing**.
- property: **17 passing** (kept out of unit coverage).
- acceptance: **all 1 generated suite passed** (web-upload, 10 executions).
- lint: **ok**.

No integration/mainnet test was run; none exists for the web component.

## Suite status

`npm test`, `npm run test:property`, `npm run test:acceptance`, `npm run crap`,
`npm run dry`, and `npm run lint` all pass in `bch-file-hosting-web`. The
reviewed modules are at 100% CRAP coverage; the component has no c8 coverage
script.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `web-upload`.
- No follow-up work for coder/refactorer, so no priority-00 handoffs.

By architect.
