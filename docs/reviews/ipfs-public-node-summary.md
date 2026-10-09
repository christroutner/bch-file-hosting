# Architect Review — ipfs-public-node

**Task:** `ipfs-public-node` (join the public IPFS DHT and provide hosted CIDs)
**Component:** `bch-file-hosting-api`
**Branch:** `swarmforge-architect`
**Date:** 2026-10-09

## Commits reviewed

| Commit | Author role | Summary |
|--------|-------------|---------|
| `1a5463c` | specifier | `specs/ipfs-public-node.feature`: DHT services, NAT services, pin-provides-CID; backlog |
| `2ccc8e2` | coder | Project-owned `PublicHeliaNode` factory + `public-network.js` config; IPFS adapter runs it and calls `routing.provide` on pin; new libp2p deps |
| `02eddc5` | refactorer | Property suite for the public-network config merge |
| `2d4493d` | architect | **Fix:** single-source `DHT_CLIENT_MODE` + `dhtClientMode` metadata + test (kills 2 survivors); refresh the tool-written manifests |

The branch fast-forwards through the specifier's `lighthouse-file-link`
completion (`cd38bd5`).

The verification record `docs/reviews/ipfs-public-node-verification.json` names
`2d4493d`. The review tip adds only `docs/`, so `git diff 2d4493d <tip>` touches
only `docs/`.

## Behavior and scope

- `src/adapters/ipfs/public-network.js` (new, pure config): `buildPublicNetworkServices`
  registers the public Amino DHT (`/ipfs/kad/1.0.0`), the PSF DHT
  (`/psf/kad/1.0.0`), NAT services (`upnpNAT`, `dcutr`), and public bootstrap
  peers; `withPublicNetworkServices` merges them over a base service map with the
  public services winning.
- `src/adapters/ipfs/public-helia-node.js` (new): extends helia-coord's
  `CreateHeliaNode`, appends the public bootstrap peers, and merges the public
  services into the libp2p options for the duration of `createNode`.
- `src/adapters/ipfs/index.js`: uses `PublicHeliaNode`; `pin` now calls
  `provide(cid)`, which announces the CID via `helia.routing.provide` so public
  pin services can discover this node.

## Architectural findings

### Positive — the integration is real, not just mock-verified

Checked against the installed libraries (not the stubs):
- `helia.routing.provide(cid)` is a real method (`@helia/interface` `Routing`).
- `@libp2p/kad-dht` exports `removePrivateAddressesMapper`; `@libp2p/dcutr`
  exports `dcutr`; `@libp2p/upnp-nat` exports `uPnPNAT`.
- helia-coord's `createNode` builds `services` locally and calls
  `this.createLibp2p({ ... services })`, so the subclass's temporary override
  actually injects `aminoDHT`/`upnpNAT`/`dcutr` and replaces the base PSF `dht`
  with the project-owned one.
- The three new direct dependencies resolve to the exact versions Helia 5.2.1
  already uses (libp2p 2.7.2, `@libp2p/kad-dht` 14.2.3, `@libp2p/dcutr` 2.0.38,
  `@libp2p/upnp-nat` 3.0.0), so there is no duplicate/mismatched libp2p.

### Positive — clean module boundaries

A pure config module (`public-network.js`) owns the service/protocol/bootstrap
facts; a thin subclass (`public-helia-node.js`) adapts helia-coord; the IPFS
adapter depends on the factory and exposes only `provide`/`pin` to use-cases.
The config is inspectable offline (`dhtProtocols`, `natServices`), and the
subclass is testable by stubbing the parent, so no test starts a node or needs
the network (constitution: maximize testable code, minimize unsuitable shells).

### Architect fix — the DHT client mode was untested (2 mutation survivors)

The first mutation run on `public-network.js` left **2 survivors**: the
`clientMode: false` flags on both DHTs. That flag is load-bearing — with
`clientMode: true` the node queries the DHT but does **not** store/serve
provider records, so public pin services could not find hosted CIDs. The tests
asserted only protocol names, not the mode.

Fix (`2d4493d`):
- Extract one `const DHT_CLIENT_MODE = false` used by both `kadDHT(...)` calls
  (also removes the duplicated literal).
- Expose it in the config metadata as `dhtClientMode`, consistent with the
  existing `dhtProtocols`/`natServices` fields.
- Add a unit test asserting `buildPublicNetworkServices().dhtClientMode` is
  `false`.

Re-run: `public-network.js` now **1 killed, 0 survived, 0 uncovered** (the one
site is the shared constant).

### Observation — a provide failure fails the pin (by design, retried)

`pin` awaits `provide`, so a routing failure rejects the local pin; `pinFile`
records the local-helia pin as `failed` and marks the file `pinFailed`, while
the payment still completes. The hourly retry re-pins (and re-provides). This
matches the existing "all providers must succeed" rule and is recoverable, but
it does mean a transient DHT outage is reported as a pin failure. No change
requested; noted for the owner if `provide` should become best-effort.

No structural change beyond the fix was needed.

## Language mutation (`mutate4javascript`, `--max-workers 8`)

Run one file at a time via `swarmforge/scripts/mutate-file.sh`.

| File | Killed | Survived | Uncovered |
|------|--------|----------|-----------|
| `src/adapters/ipfs/public-network.js` | 1 | 0 | 0 |
| `src/adapters/ipfs/public-helia-node.js` | 0 | 0 | 0 (0 total sites) |
| `src/adapters/ipfs/index.js` | 20 | 0 | 0 |

`public-helia-node.js` has no mutable operators (0 total sites). `index.js`
carried a stale manifest; the differential run under-selected (3 of 20) and
`mutate-file.sh` reran with `--mutate-all`. After the architect fix,
`public-network.js` went from 0 killed / 2 survived to 1 killed / 0 survived.
The tool refreshed every manifest.

## DRY (`dry4javascript`)

Scoped to the changed modules: **No duplicate candidates found** (exit 0).
Extracting `DHT_CLIENT_MODE` also removed the duplicated `clientMode: false`.

## Cyclomatic complexity / CRAP

`npm run crap` → **exit 0**, all functions at **100%** coverage. Changed
functions: `IpfsAdapter.pin` CRAP 3.0; `IpfsAdapter.provide`,
`buildPublicNetworkServices`, `withPublicNetworkServices`, and
`PublicHeliaNode.createNode` each 1.0–2.0. Component maximum is the
pre-existing 6.0, below the CRAP 8 threshold.

## Gherkin acceptance mutation (soft)

`specs/ipfs-public-node.feature` (new): **10 total, 10 killed, 0 survived,
0 errors**. All three scenarios (DHT protocols, NAT services, pin-provides-CID)
are mutation-clean, so the mutator wrote a fresh `# mutation-stamp` and a
complete manifest. Normal acceptance passed all six suites.

## Verification record

`swarmforge/scripts/verify.sh api --record docs/reviews/ipfs-public-node-verification.json --task ipfs-public-node`

- **result: pass (4/4)**, `git_sha` = `2d4493d`.
- unit: **407 passing** (the added client-mode test).
- property: **25 passing**.
- acceptance: **all 6 generated suites passed**.
- lint: **ok**.

No integration/mainnet test was run (it needs the network and real BCH).

## Suite status

`bch-file-hosting-api`: `npm test`, `npm run test:property`,
`npm run test:acceptance`, `npm run crap`, `npm run dry`, and `npm run lint`
all pass.

## Handoffs sent

- End-of-chain `git_handoff` to **specifier** (priority 10),
  `merge_and_process architect <docs-commit>`, task `ipfs-public-node`.
- No follow-up work assigned to coder/refactorer in this batch, so no
  priority-00 handoffs.

By architect.
