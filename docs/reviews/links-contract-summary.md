# Architect Review — links-contract

**Task:** `links-contract` (lock the hosted URL-bearing fields with acceptance assertions; api)
**Component:** `bch-file-hosting-api`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `58bd08b` | specifier | Backlog: mark `cli-hosting-api-fetch` / `hosting-api-reuse` complete (carried in this fast-forward) |
| `ef76938` | specifier | New `specs/links-contract.feature` (two scenarios) |
| `98330e1` | coder | Acceptance step handlers asserting the three URL fields on the paid and already-hosted results |
| `fa3ac2f` | architect | Tool-generated soft-mutation manifest refresh for the new feature |

The branch fast-forwards from the previous review tip `fd38caa`. The
verification record names `fa3ac2f`; the review tip adds only `docs/`.

## Behavior and scope

This is an acceptance-test-only task; no production file changed.

`specs/links-contract.feature` adds two scenarios that pin the URL-bearing
fields the downstream `HostingApi` contract depends on:

- `Links Contract - 1`: the paid `check-payment` result reports `downloadUrl`,
  `viewUrl`, and a `gatewayUrls` entry.
- `Links Contract - 2`: the `alreadyHosted` upload result reports the same three
  fields.

The handlers use the real production use-cases, not fakes of the result:

- Scenario 1 runs `PaymentUseCases.checkPayment` against the deterministic
  offline invoice/wallet/lighthouse adapters and asserts on the returned
  `paidResult`.
- Scenario 2 constructs the real `FileUseCases` and runs `uploadAndQuote`
  against a stored `pinned` file, so the assertions cover the real
  `existingQuote -> alreadyHosted -> buildLinks` path.

## Architectural review

### Positive — the contract is verified at the boundary that can break it

`dev-docs/api-contract.md` §4 guarantees the presence and naming of
`downloadUrl`, `viewUrl`, and `gatewayUrls` on the paid and already-hosted
payloads. These scenarios fail if any of them is renamed, dropped, or built from
the wrong source, using the real `buildLinks`/`paidResult`/`alreadyHosted` code.
That closes the gap the contract explicitly tracked as `links-contract`.

### Positive — assertions are scoped correctly

`assertLinkField` requires exact equality for the single-value fields.
`assertGatewayUrl` checks membership in `gatewayUrls`, which is the right choice:
providers and extra `PUBLIC_GATEWAYS` prefixes legitimately append to that list,
so exact array equality would be brittle and would couple the test to an
unrelated provider set.

### Positive — the paid-file setup step was generalized compatibly

The existing `a paid file with CID ... and filename ...` step now accepts
`<parameter>` placeholders (via `resolveValue`) as well as literals, so the new
feature can drive the setup from its `Examples` columns without changing the
older callers. All 10 acceptance suites pass, including the pre-existing ones.

### Observation — the `already-hosted` setup hand-builds a file record

Scenario 2 seeds `world.hostedFile` in the acceptance handler rather than through
a store, which is the established pattern for the offline acceptance world and
is intentional: it drives the real `uploadAndQuote` decision with a known paid
status. No change needed.

No module boundary, dependency direction, or source structure changed; there was
nothing to reorganize in a test-only change.

## Language mutation (`mutate4javascript`)

Not run. No `src/` module changed; the change is confined to
`acceptance/lib/handlers.js` and a feature file. The `api-quality-baseline`
module results remain the reference for the component.

## DRY (`dry4javascript`)

Not run. No production module changed; test-support handlers are not a DRY
target, and the new helpers (`assertLinkField`, `assertGatewayUrl`) replace no
existing code.

## Cyclomatic complexity / CRAP

Not applicable: no production source changed. The component maximum remains at
the target from `docs/reviews/api-quality-baseline-summary.md`.

## Gherkin acceptance mutation (soft)

`bch-file-hosting-api/specs/links-contract.feature`: **20 total, 20 killed, 0
survived, 0 errors.** Both scenarios are fully load-bearing, so the mutator
wrote a complete manifest covering indices 0 and 1.

## Verification record

`swarmforge/scripts/verify.sh api --record docs/reviews/links-contract-verification.json --task links-contract`, `git_sha` = `fa3ac2f`:

- **api — pass (4/4):** unit **482 passing**, property **43 passing**,
  acceptance **all 10 suites passed** (up from 9; the new suite is included),
  lint **ok**.

No integration/mainnet test was run; `npm run test:integration` is human-only.

## Suite status

`bch-file-hosting-api`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, and `npm run lint` all pass. The CLI and web
components were not touched.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `links-contract`.
- No follow-up work assigned to coder or refactorer.

By architect.
