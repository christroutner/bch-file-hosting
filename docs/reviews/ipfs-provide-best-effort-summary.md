# Architect Review — ipfs-provide-best-effort

**Task:** `ipfs-provide-best-effort` (make content-routing provide best-effort on pin)
**Component:** `bch-file-hosting-api`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `bb0e811` | specifier (hotfix) | `uPnPNAT({ autoConfirmAddress: true })` so startup does not require the absent `@libp2p/autonat` service |
| `079370b` | specifier | `ipfs-public-node.feature`: scenarios 4 (failing provide does not fail the pin) and 5 (pin does not wait for provide); backlog |
| `b248136` | coder | `pin` fires `provideInBackground` (logged, not awaited); unit + acceptance coverage |
| `bde9a22` | refactorer | Property suite for pin/provide outcomes (resolve, reject, hang) and `dhtClientMode` |
| `55f04b7` | architect | **Fix:** cover the UPnP `autoConfirmAddress` flag (kills its survivor); refresh the tool-written manifests |

The branch fast-forwards through the specifier's `ipfs-public-node` completion
(`62accd3`) and carries the `bb0e811` hotfix, which had not been through the
pipeline. Both are reviewed below.

The verification record `docs/reviews/ipfs-provide-best-effort-verification.json`
names `55f04b7`. The review tip adds only `docs/`, so `git diff 55f04b7 <tip>`
touches only `docs/`.

## Behavior and scope

- `IpfsAdapter.pin` now calls `provideInBackground(cid)` instead of awaiting
  `provide(cid)`. `provideInBackground` catches and logs a failure
  (`this.logger?.warn?.(...)`) and drops it, so `pins.add` alone decides pin
  success. A slow or failing DHT query no longer blocks `check-payment` or
  marks a durable local pin as `pinFailed`.
- `provide(cid)` remains a public, awaited method (announce the CID via
  `helia.routing.provide`).
- `public-network.js` keeps `uPnPNAT({ autoConfirmAddress: true })` from the
  hotfix.

## Architectural findings

### Positive — the fix removes the request-path coupling

The best-effort change is the right shape for this boundary: the durable local
pin is the only success signal, and content routing is advisory. The failure is
logged rather than swallowed silently, which keeps the operation observable.
`provide` stays a separate awaited method, so a caller that *does* need a
confirmed announcement can still use it.

### Positive — the hotfix is technically correct

Verified against the installed library: `@libp2p/upnp-nat` exposes
`autoConfirmAddress`, and without it `uPnPNAT` requires the `@libp2p/autonat`
service (`upnp-nat.js`), which the node's service map does not include — so the
hotfix prevents a real startup failure.

### Architect fix — the UPnP auto-confirm flag was untested (1 survivor)

Re-running mutation on the post-hotfix `public-network.js` left **1 survivor**:
`autoConfirmAddress: true` (its only test-time-visible effect). `false` would
restore the startup failure the hotfix fixed, but nothing asserted it.

Fix (`55f04b7`):
- Extract `const UPNP_AUTO_CONFIRM_ADDRESS = true`, used by `uPnPNAT(...)`.
- Expose it as `natAutoConfirmAddress` in the config metadata (consistent with
  `dhtProtocols`/`dhtClientMode`/`natServices`).
- Add a unit test asserting `buildPublicNetworkServices().natAutoConfirmAddress`
  is `true`.

Re-run: `public-network.js` now **2 killed, 0 survived, 0 uncovered** (the two
boolean constants).

### Observation — no retry for a failed initial provide (follow-up candidate)

With best-effort provide, a file whose local pin succeeds but whose provide
fails is marked `pinned`, so the hourly `retryPins` job (which only re-pins
`pinFailed` files) will not re-provide it. There is no explicit re-provide timer
in the API. If Helia's periodic re-provide does not cover a *failed* initial
provide, the CID stays unannounced until the node restarts or the file is
re-pinned. Worth a small follow-up (a re-provide timer or a `provided` flag on
the pin record) if public discoverability matters for every hosted CID. No
change made here: it is new behavior and belongs in a spec.

No other structural change was needed.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/adapters/ipfs/public-network.js` | 2 | 0 | 0 |
| `src/adapters/ipfs/index.js` | 20 | 0 | 0 |

`public-network.js` went from 1 killed / 1 survived (post-hotfix) to 2 killed /
0 survived after the fix. `index.js` carried a stale manifest; the differential
run under-selected (1 of 20) and `mutate-file.sh` reran with `--mutate-all`. The
tool refreshed both manifests.

## DRY (`dry4javascript`)

Scoped to the changed modules: **No duplicate candidates found** (exit 0).

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, all functions at **100%** coverage.
`IpfsAdapter.pin` CRAP 3.0; `provide`, `provideInBackground`, and
`buildPublicNetworkServices` each 1.0–2.0. Component maximum is the pre-existing
6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

`specs/ipfs-public-node.feature`: differential soft mutation skipped the three
unchanged clean scenarios (1–3; 10 mutations) and re-ran the two new scenarios:

- **8 total, 8 killed, 0 survived, 0 errors.**

Both `Ipfs Public Node - 4` (failing provide) and `-5` (never-settling provide)
are mutation-clean, so the mutator wrote a fresh `# mutation-stamp` and a
complete manifest. Normal acceptance passed all six suites.

## Verification record

`swarmforge/scripts/verify.sh api --record docs/reviews/ipfs-provide-best-effort-verification.json --task ipfs-provide-best-effort`

- **result: pass (4/4)**, `git_sha` = `55f04b7`.
- unit: **410 passing** (the added auto-confirm test).
- property: **26 passing**.
- acceptance: **all 6 generated suites passed**.
- lint: **ok**.

No integration/mainnet test was run (it needs the network and real BCH).

## Suite status

`bch-file-hosting-api`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, and `npm run lint`
all pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `ipfs-provide-best-effort`.
  The re-provide follow-up above is the carry-forward item.
- No follow-up work assigned to coder/refactorer in this batch, so no
  priority-00 handoffs.

By architect.
