# Architect Review — api-contract

**Task:** `api-contract` (pin the REST API contract and the `HostingApi` module boundary for the psf-memo-cli port; docs-only)
**Components:** docs (`dev-docs/`, `specs/`) plus a markdown fix in `bch-file-hosting-api/examples/`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-11

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `e3a2962` | specifier | Backlog: mark `file-list` and the `cli-view-link`/`cli-quote-details`/`cli-host-txid` parity tasks complete |
| `ab4ed3e` | specifier | Add `dev-docs/api-contract.md`; correct the stale paid `viewUrl`-less example in `bch-file-hosting-api/examples/README.md` |
| (architect, this review) | architect | Correct three factual mismatches in `dev-docs/api-contract.md`; add the verification record and this summary |

The branch fast-forwards from the previous review tip `dc054f2`. The
verification record names `ab4ed3e`; the review tip adds only `docs/`.

## Behavior and scope

The specifier commit `ab4ed3e` is docs-only and does not touch source or
feature files:

- New `dev-docs/api-contract.md` (333 lines) documents every public and admin
  endpoint, the response envelope and error statuses/messages, the amount/identity
  rules, the status vocabularies, URL-bearing fields and their presence matrix,
  and the `HostingApi` module boundary for downstream consumers.
- `bch-file-hosting-api/examples/README.md` corrects the paid `check-payment`
  example, which omitted the `viewUrl` the real response now includes, and
  updates the already-hosted sentence to mention download, view, and gateway
  links.
- `e3a2962` is the specifier's backlog bookkeeping for the merged CLI parity
  tasks and `file-list`.

## Architectural review

I checked the contract against the implementation
(`bch-file-hosting-api/src/`) and the CLI adapter
(`bch-file-hosting-cli/src/lib/hosting-api.js`). The endpoint inventory is
complete (health, files, check-payment, feed, status, download, view, and the
five admin routes), the error table matches the middleware and use-case errors,
the status vocabularies match `file-upload.js`/`invoice.js`, and the
`buildLinks` presence matrix matches `links.js` and `file-feed.js`. The
`HostingApi` export/constructor/method surface matches the CLI adapter.

Three statements did not match the current implementation, so I corrected them
in the review commit (keeps the contract aligned with the code the downstream
port will rely on; no source behavior changed):

1. **`check-payment` paid idempotency.** The contract said an already-paid
   invoice is returned "without re-sweeping or re-pinning". `PaymentUseCases.repayPaidInvoice`
   does re-pin a file whose status is `pinFailed` (but never sweeps twice). The
   long-term plan (§A4) and the code comment already state this; the wording now
   says "without re-sweeping; a previously failed pin is retried in the
   background". The later idempotency bullet was corrected the same way, and it
   now also notes that a `pinning` file is left to its existing background task.
2. **Web base-URL name.** The contract stated the web "reads `HOSTING_API_URL`".
   The web currently reads `REACT_APP_API_URL` (`bch-file-hosting-web/src/config/index.js`);
   the shared-name migration is the tracked `web-hosting-api-url` task. The text
   now says the web is *moving* to `HOSTING_API_URL`, names both the CRA mirror
   and the current/deprecated variable, and keeps the tracking pointer.
3. The §6 note that the adapter "must" bind `fetch` to `globalThis` is a boundary
   requirement, not yet implemented; it already carries the
   `cli-hosting-api-fetch` tracking pointer, so it was left as the required
   contract surface rather than reworded.

### Observations (no change made)

- The admin endpoint table gives the result object names (`{ invoices }`,
  `{ files }`, unpin/sweep/cleanup summaries) but does not enumerate the stored
  invoice/file record fields. That is sufficient for the contract's stated
  client audience; the storage key layout remains in
  `dev-docs/long-term-plan.md` §A3.
- `GET /files/:cid` intentionally omits `downloadUrl`/`viewUrl`/`gatewayUrls`;
  the contract states this explicitly, matching `FileUseCases.getFileStatus`.
  The optional `links-contract` item would add regression coverage.
- The contract correctly documents the open downstream decisions
  (`hosting-api-reuse`, `web-hosting-api-url`) in the backlog rather than
  guessing at them.

No module boundary, dependency direction, or source structure changed; there
was nothing to reorganize in a docs-only task.

## Language mutation (`mutate4javascript`)

Not run. The task changed no source module (only `dev-docs/`, `specs/`, and a
component `README.md`), so there is no changed source file to mutate. The last
per-module runs remain valid (`docs/reviews/cli-host-txid-summary.md` and the
component summaries).

## DRY (`dry4javascript`)

Not run. No source module changed; a docs edit cannot introduce duplication.

## Cyclomatic complexity / CRAP

Not applicable: no source changed. The component maximum remains at the target
from `docs/reviews/api-quality-baseline-summary.md`.

## Gherkin acceptance mutation (soft)

Not run. The task changed no `.feature` file, so there is nothing to mutate.
Normal acceptance did run as part of verification (below).

## Verification record

`swarmforge/scripts/verify.sh api --record docs/reviews/api-contract-verification.json --task api-contract`, `git_sha` = `ab4ed3e`:

- **api — pass (4/4):** unit **482 passing**, property **43 passing**,
  acceptance **all 9 suites passed**, lint **ok**.

No integration/mainnet test was run; `npm run test:integration` is human-only.

## Suite status

`bch-file-hosting-api`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, and `npm run lint` all pass. The CLI and web
components were not touched, so their suites were not re-run.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10) to merge
  `swarmforge-architect` into `master`, task `api-contract`.
- No follow-up work assigned to coder or refactorer; the contract's open items
  are already tracked in the backlog.

By architect.
