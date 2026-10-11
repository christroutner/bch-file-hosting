# Architect Review — web-hosting-api-url

**Task:** `web-hosting-api-url` (resolve the web app's API base URL from the shared `HOSTING_API_URL` name; web)
**Component:** `bch-file-hosting-web`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `ce624b9` | specifier | Backlog: mark `api-contract` complete (carried in this fast-forward) |
| `8ac2ad5` | specifier | New `specs/web-hosting-api-url.feature` (six scenarios) |
| `a598c19` | coder | Pure `src/services/api-url.js` resolver, wired into `src/config/index.js`; acceptance handlers, unit tests, `crap` list |
| `3a4424e` | refactorer | Property suite `test/property/api-url.property.js` |
| `ef1d2ac` | architect | Tool-generated soft-mutation manifest refresh for the new feature |

The branch fast-forwards from the previous review tip `baa2651`. The
verification record names `ef1d2ac`; the review tip adds only `docs/`.

## Behavior and scope

The web app now resolves its API base URL with the precedence

1. `HOSTING_API_URL` (canonical, shared with the CLI),
2. `REACT_APP_HOSTING_API_URL` (the Create React App build mirror, because CRA
   only inlines `REACT_APP_*` into the bundle),
3. `REACT_APP_API_URL` (deprecated fallback),
4. otherwise the documented default `http://localhost:5050`.

The precedence and default match `dev-docs/api-contract.md` (which this task
was specified to satisfy) and the CLI's `config/index.js`. The feature file
covers each single variable, the no-variable default, and both precedence
pairs, each with two examples.

## Architectural review

### Positive — a pure core module with a clean dependency direction

`src/services/api-url.js` is a side-effect-free function over an environment
map. It hides the env-name list and the default, exposing only `resolveApiUrl`
and `DEFAULT_API_URL`. `src/config/index.js` keeps its declarative shape and
delegates to the resolver, so the rule lives in one testable place rather than
inside the config literal. The dependency is inward (config -> pure service);
the acceptance handlers and both test suites drive the real resolver, so the
spec, unit, property, and acceptance oracles cannot drift from the rule.

### Positive — testable boundary, no environmentally unsuitable code

The resolver takes its environment as an argument, so no test or acceptance run
touches the real `process.env` or a network. The existing `HostingApi` adapter
still receives the resolved URL through `config`, so nothing in the service
layer learned about environment plumbing.

### Observation — the deprecated fallback decision stays open

The task's backlog entry left one decision to the user: whether to keep
`REACT_APP_API_URL` as a deprecated fallback or drop it immediately. The coder
kept it, which is the non-breaking choice and matches the contract's stated
precedence. The decision remains tracked in the backlog; no change made here.

### Observation — resolution is a truthiness test, not a validation

A whitespace-only value counts as set and is returned verbatim. That is
consistent with the CLI (which also accepts the raw value) and with the
contract's "no trailing slash required" wording, so it is not a defect. The
unit test covers the empty-string case and the property suite covers
absent/empty/non-empty combinations.

No module boundary, dependency direction, or representation leak required a
structural fix.

## Language mutation (`mutate4javascript`)

`src/services/api-url.js` reports **0 mutation sites** (`--scan`: Total 0,
Changed 0). This is structural, not under-selection: the module only returns
strings from a truthiness loop over a fixed name list, with no
arithmetic/comparison/equality/boolean/logical/`0<->1` sites the tool targets.
No file mutation run was needed; the property suite supplies the behavioral
coverage instead.

## DRY (`dry4javascript`)

Scoped to the changed module and to `src/services/`: **no duplicate candidates
found** for either run. No new duplication was introduced.

## Cyclomatic complexity / CRAP

`npm run crap` (now including `src/services/api-url.js`) -> **exit 0**, every
analyzed function at **100%** unit coverage. `resolveApiUrl` is CRAP **3.0**.
The component maximum remains the pre-existing `DashboardPage.loadMore` at
**6.0**, at the target.

## Gherkin acceptance mutation (soft)

`bch-file-hosting-web/specs/web-hosting-api-url.feature`: **25 total, 21 killed,
4 survived, 0 errors.**

The four survivors are intrinsic losing-input equivalents, not missing
assertions:

- `Web Hosting API URL - 5` (canonical wins over the mirror): the `mirror`
  column, two examples (`https://mirror.example.com`,
  `http://mirror.local:5050`).
- `Web Hosting API URL - 6` (mirror wins over the deprecated fallback): the
  `legacy` column, two examples.

In each precedence scenario the mutated column is the value that *loses*; any
non-empty value produces the same resolved winner, so no assertion can
distinguish the original loss from the mutated loss. APS exposes no
project-specific mutation-filter hook, so these are documented rather than
chased, matching the established equivalents in the `file-feed` and
`lighthouse-pinning` reviews. Scenarios 1-4 (single variable and default) were
fully killed, and the mutator wrote a manifest covering their indices; the two
precedence scenarios were left out so they re-mutate next run.

## Verification record

`swarmforge/scripts/verify.sh web --record docs/reviews/web-hosting-api-url-verification.json --task web-hosting-api-url`, `git_sha` = `ef1d2ac`:

- **web — pass (5/5):** unit **104 pass / 0 fail**, property **80 pass / 0
  fail**, **build ok**, acceptance **all 6 suites passed**, lint **ok**.

No integration/mainnet test exists for the web component.

## Suite status

`bch-file-hosting-web`: `npm test`, `npm run test:property`, `npm run build`,
`npm run test:acceptance`, `npm run crap`, `npm run lint`, and the scoped `dry`
run all pass. The API and CLI components were not touched.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `web-hosting-api-url`.
- No follow-up work assigned to coder or refactorer.

By architect.
