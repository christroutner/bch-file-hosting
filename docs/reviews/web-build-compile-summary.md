# Architect Review — web-build-compile

**Task:** `web-build-compile` (CRA production build hardening + verification)
**Component:** `bch-file-hosting-web` (plus `swarmforge/scripts/verify.mjs`)
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `cc8e73e` | specifier | `dev-docs/web-build-compile.md`, briefing and backlog |
| `13394db` | refactorer | Fix the CRA production build and check it in `verify.sh` |
| `1d77386` | architect | **Manifest refresh:** recompute the eleven web mutation manifests |

The branch also carries `1e6a629` (specifier: record `web-dashboard`
completion) and fast-forwards through `master`. This is a build/verification
deliverable: **no Gherkin feature and no Gherkin acceptance mutation**. The
verification record names `1d77386`; the review tip adds only `docs/`.

## Behavior and scope

The CRA production build failed on merged code because CRA's
`eslint-config-react-app` sets an ES2015 environment, so `globalThis` (used by
the `web-upload-transport` global-receiver binding in `hosting-api.js`) was a
`no-undef` error, and the 11 CommonJS modules warned
`'use strict' is unnecessary inside of modules`. `verify.sh web` never ran the
CRA build, so the error merged.

- `bch-file-hosting-web/package.json`: `eslintConfig.env.es2020 = true` clears
  the `no-undef` at its source (the config's ES level).
- The redundant `'use strict'` directives are removed from the 11 CommonJS
  modules.
- `swarmforge/scripts/verify.mjs`: the `web` component gains the `build`
  command, so `verify.sh web` now runs `npm run build` (5/5).

No runtime behavior changes: no endpoint, response field, status, error code,
or view behavior.

## Architectural findings

### Positive — the fix is at the root cause, not suppressed

`env.es2020` corrects the ESLint language level rather than adding an inline
`/* global globalThis */`, so the config and the source agree on the language
version. The global-receiver binding from `web-upload-transport` is untouched
and still asserted by its unit, property, and acceptance tests.

### Positive — the regression can no longer merge

`build` is now a first-class verification command for the `web` component, so
the CRA ESLint check runs in `verify.sh web` alongside unit, property,
acceptance, and lint.

### Verified negative — the new command genuinely fails on the regression

I temporarily removed `eslintConfig.env` from `package.json` (then restored it
with `git checkout`). With the config regression reintroduced, `npm run build`
exited **1** with:

```text
Failed to compile.
  Line 45:44:  'globalThis' is not defined  no-undef
```

This confirms the added command fails on exactly the class of error it exists
to catch, and that the fix is load-bearing.

### Manifest refresh — directive removal is behavior-neutral

Removing the two `'use strict'`/blank lines shifted every tested web module by
two lines, so the committed mutation manifests carried stale line numbers. I
ran `mutate4javascript` once per module via `swarmforge/scripts/mutate-file.sh`;
the tool detected the differential under-selection, re-ran `--mutate-all`, and
recomputed each manifest. Every **function hash is unchanged**, which is the
machine-checkable evidence that the directive removal changed no function
body. The refresh is manifest-only (no code lines changed).

### Observations — none blocking

1. `hosting-api.js` still relies on `globalThis` for the bound transport. Any
   future `eslintConfig` simplification must keep an ES2020+ environment (or a
   narrower declaration) so the build stays green.
2. The `build` step adds ~11–13 s to `verify.sh web`; acceptable for the
   coverage it adds.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Refreshed one file at a time. All manifests now match the source and report
zero survivors; the function hashes were unchanged by the directive removal.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/components/app-body/dashboard/dashboard-view.js` | 5 | 0 | 0 |
| `src/components/app-body/file-hosting/upload-quote-view.js` | 5 | 0 | 0 |
| `src/components/app-body/file-status/file-status-view.js` | 3 | 0 | 0 |
| `src/components/app-body/shared/status-view.js` | 0 | 0 | 0 |
| `src/services/browser-wallet.js` | 0 | 0 | 0 |
| `src/services/dashboard-page.js` | 6 | 0 | 0 |
| `src/services/errors.js` | 1 | 0 | 0 |
| `src/services/file-status-page.js` | 3 | 0 | 0 |
| `src/services/file-upload-page.js` | 13 | 0 | 0 |
| `src/services/hosting-api.js` | 6 | 0 | 0 |
| `src/services/quote-countdown.js` | 9 | 0 | 0 |

`status-view.js` and `browser-wallet.js` report zero sites structurally (their
functions contain no arithmetic/comparison/boolean/`0<->1` operators), not a
skipped selection.

## DRY (`dry4javascript`)

Scoped to the eleven changed modules: **No duplicate candidates found** (exit 0).

## Cyclomatic complexity / CRAP

Configuration/directive-only change with no new functions; CRAP is unchanged
(last measured component maximum 6.0, at target).

## Gherkin acceptance mutation

Not applicable: there is no feature file for this build/verification task, and
the source change is the removal of redundant directives. The existing web
acceptance suites (all five) pass unchanged.

## Verification record

`swarmforge/scripts/verify.sh web --record docs/reviews/web-build-compile-verification.json --task web-build-compile`

- **result: pass (5/5)**, `git_sha` = `1d77386`.
- unit: **83 pass / 0 fail**.
- property: **73 pass / 0 fail**.
- build: **ok** (`npm run build`, the new command; ran, not skipped).
- acceptance: **all 5 generated suites passed**.
- lint: **ok**.

No integration/mainnet test was run (it needs the network and real BCH).

## Suite status

`bch-file-hosting-web`: `npm test`, `npm run test:property`, `npm run build`,
`npm run test:acceptance`, `npm run lint`, `npm run crap`, `npm run dry` all
pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `web-build-compile`.
- No follow-up work assigned to coder or refactorer, so no priority-00
  handoffs.

By architect.
