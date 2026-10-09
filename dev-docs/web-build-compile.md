# Web Production Build Hardening (`web-build-compile`)

**Task name:** `web-build-compile`
**Owner:** specifier (specification/routing); coder (fix); refactorer (sanity
pass); architect (verification record).
**Status:** DRAFT — awaiting user approval to hand off.
**Backlog item:** `web-build-compile` in `specs/feature-backlog.md`.

This is a build/verification deliverable, not runtime behavior. There is **no
Gherkin feature and no Gherkin acceptance mutation**; the architect verifies
against the checklist below. This follows the `api-quality-baseline` precedent
for quality tasks.

## Problem

The CRA production build fails on merged code. `react-scripts build` runs
`eslint-config-react-app`, which sets `env: { browser: true, es6: true }` (ES2015)
and `parserOptions.sourceType: 'module'`. Two consequences:

1. **Error (blocks the build):** `src/services/hosting-api.js:47:44`
   `'globalThis' is not defined` (`no-undef`). `globalThis` is ES2020; the
   `web-upload-transport` adapter binds the fetch transport with
   `(fetchImpl || fetch).bind(globalThis)` (see `specifier-prompt.md` §9 gotcha
   #24), and CRA's ESLint does not know the global.
2. **Warnings:** `'use strict' is unnecessary inside of modules` in the 11
   CommonJS service/view modules (`require`/`module.exports`), because the same
   config forces `sourceType: 'module'`.

`swarmforge/scripts/verify.sh web` runs `npm test`, `npm run test:property`,
`npm run test:acceptance`, and `npm run lint` (`standard --env mocha`).
`standard` accepts `globalThis` and does not apply CRA's `sourceType`, and
`verify.sh` never runs `react-scripts build`. Both features
(`web-upload-transport` and `web-dashboard`) therefore merged with a broken
production build.

## Current evidence (specifier, 2026-10-09, `master` `1e6a629`)

- Reproduce: `npx --no-install eslint src/services/hosting-api.js` →
  `1 error, 1 warning` (`globalThis` no-undef; `'use strict'`).
- Candidate fix, **verified**: add
  `"eslintConfig": { "extends": "react-app", "env": { "es2020": true } }` to
  `bch-file-hosting-web/package.json`. `CI=false npm run build` then exits **0**
  (only the `'use strict'` warnings remain).
- `swarmforge/scripts/verify.mjs` web commands: `unit`, `property`,
  `acceptance`, `lint` — no build or CRA-lint check.

## Required final state (acceptance criteria)

1. `npm run build` in `bch-file-hosting-web/` exits **0** with **no ESLint
   errors** and, ideally, no ESLint warnings. Any remaining warning must be
   justified in the architect's summary.
2. The global-receiver binding behavior is preserved: the
   `web-upload-transport` unit and property tests and the
   `web-upload-transport` acceptance suite still pass without weakening the
   assertion that `fetch` is called with the global receiver.
3. `verify.sh web` now runs a check that fails on this class of error, so a
   future CRA ESLint error cannot merge. This adds a fifth web verification
   command (a CRA build or an equivalent CRA-ESLint invocation) to
   `swarmforge/scripts/verify.mjs`.
4. Every existing web suite still passes: `npm test`, `npm run test:property`,
   `npm run test:acceptance` (all five acceptance suites), and `npm run lint`
   (`standard`).
5. **No runtime behavior change.** No new endpoint, response field, status,
   error code, or UI behavior. The fix is build/ESLint configuration only,
   except for removing the redundant `'use strict'` directives.
6. `swarmforge/scripts/verify.sh web --record
   docs/reviews/web-build-compile-verification.json --task web-build-compile`
   passes with the new command included (5/5).

## Scope

- `bch-file-hosting-web/package.json` — the `eslintConfig` and, if needed, a
  script for the CRA check.
- The 11 CommonJS modules under `bch-file-hosting-web/src/` that open with
  `'use strict'`, if the coder chooses to remove the warnings rather than
  suppress the rule.
- `swarmforge/scripts/verify.mjs` — add the CRA build/lint command to the
  `web` component.
- Tests only if needed to lock the new behavior (a build regression check is
  the verification command itself; no new Gherkin).

Out of scope:

- Any runtime behavior, API, or presentational change.
- Ejecting `react-scripts` or changing the CRA toolchain.
- Gherkin acceptance mutation (there is no feature file for this task).

## Options for the coder (choose the least invasive that meets the criteria)

- **ESLint env:** add `env: { es2020: true }` to `eslintConfig`. Verified to
  clear the error. Does not touch runtime files.
- **Inline declaration:** add `/* global globalThis */` to
  `src/services/hosting-api.js`. Narrower, but leaves the root cause (the
  config's ES level) in place.
- **Warnings:** remove `'use strict'` from the CommonJS modules (they are
  parsed as modules by CRA and loaded as CommonJS by Node), or scope the
  `strict`/`sourceType` rule to those files. `standard` and the Node tests must
  still pass.
- **Verification:** add `build` (`npm run build`) to the `web` component in
  `verify.mjs`. `react-scripts build` writes to the gitignored `build/`
  directory; it is the sanctioned CRA check and needs no new dependency.

Do not weaken the `web-upload-transport` global-receiver requirement to make
the build pass.

## Work breakdown

### Coder

- Fix the CRA ESLint error at its source and clear the warnings (criteria 1–2).
- Add the CRA build/lint command to `swarmforge/scripts/verify.mjs` for `web`
  (criterion 3).
- Verify locally: `npm run build`, `npm test`, `npm run test:property`,
  `npm run test:acceptance`, `npm run lint`, and
  `swarmforge/scripts/verify.sh web`.
- Commit with `By coder.` and hand off to the refactorer.

### Refactorer

- Sanity-check the change: no runtime behavior drift, no new dependency,
  the ESLint/CRA configuration is minimal and justified, and the verification
  command is wired correctly. Adjust only if needed.
- Confirm `standard`, the unit/property suites, and the acceptance suites still
  pass; CRAP and DRY are unaffected (configuration-only change).
- Commit with `By refactorer.` and hand off to the architect.

### Architect

- Run the new `verify.sh web` and confirm the added command **runs** (not
  skipped) and genuinely fails when the ESLint error is reintroduced.
- Run the web suite (`npm test`, `npm run test:property`,
  `npm run test:acceptance`, `npm run lint`) and confirm no regressions.
- Write `docs/reviews/web-build-compile-verification.json` (or the
  per-component name) and `docs/reviews/web-build-compile-summary.md`; note
  that no Gherkin feature exists for this task.
- Hand off to the specifier for merge.

### Specifier

- Merge `swarmforge-architect` into `master`, verify per
  `specifier-prompt.md` §10 (the new `build`/CRA-lint command must appear in the
  verification record), and mark `web-build-compile` complete in the backlog.

## Related

- `specs/feature-backlog.md` (`web-build-compile`)
- `specifier-prompt.md` §9 gotcha #24 (browser `fetch` receiver) and §10 (verify)
- `bch-file-hosting-web/specs/web-upload-transport.feature`
- `dev-docs/api-quality-baseline.md` (quality-task spec precedent)
- `swarmforge/scripts/verify.mjs`, `swarmforge/scripts/verify.sh`
