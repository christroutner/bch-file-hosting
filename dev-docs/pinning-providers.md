# Third-Party Pinning Providers — Study (P5.1)

**Task name:** `pinning-provider-study`
**Owner:** specifier (with the user).
**Status:** DRAFT — awaiting user review.
**Backlog item:** P5.1 in `specs/feature-backlog.md`.
**Criteria source:** `dev-docs/long-term-plan.md` §10.
**Inputs:** `dev-docs/ipfs-third-party-candidates.md`, provider docs (fetched
2026-10-09).

This is a docs-only research deliverable, not runtime behavior. There is **no
Gherkin feature** for this task. It informs P5.2 (`lighthouse-provider`) and
later provider adapters.

---

## 1. The CID-compatibility question (read this first)

Every provider adapter must preserve the CID the API already issued. The IPFS
adapter imports each upload with an exact profile (`src/adapters/ipfs/index.js`):

```js
helia.fs.addAll([{ path: filename, content }], { cidVersion: 1, wrapWithDirectory: true })
```

The `@helia/unixfs` defaults that apply are (`@helia/unixfs` `add.js`):

| Setting | Value |
|---------|-------|
| CID version | **1** (explicit) |
| Content codec | dag-pb directory wrapper (explicit `wrapWithDirectory: true`) |
| Leaf codec | **raw** (`rawLeaves: true`, Helia default) |
| Hash | sha2-256 |
| Chunker | fixed-size, **1 MiB** (`chunkSize: 1048576`, Helia default) |
| Root CID | the **directory** CID, containing one entry named `<filename>` |

Implication:

- A provider that **pins by CID** fetches our DAG from the IPFS network and
  stores it under our exact CID. No re-hashing, so the CID always matches. This
  is the preferred integration.
- A provider that **uploads bytes** re-imports and computes its own CID. To
  match ours it would have to reproduce CIDv1 + raw leaves + 1 MiB chunks +
  the directory wrap with the same filename. Most providers default to CIDv0
  and/or 256 KiB chunks and/or no wrapping, so a match is unlikely without an
  explicit CID-matching import. Our `uploadBytes` capability must therefore
  **verify the returned CID equals ours and record the pin as `failed` on any
  mismatch** (long-term plan Q11), and no provider should be adopted on the
  strength of byte upload alone.
- Pin-by-CID requires our Helia node to be reachable by the provider
  (long-term plan Q13). Several providers accept explicit origin multiaddrs
  (Pinata `hostNodes`, Filebase `origins`) so we can advertise our node.

**Cost context:** revenue is `$0.01 USD per MB per year` = **$10,000/TB/year**
(≈ $833/TB/month). Every provider below costs far less, so price is not the
binding constraint; CID fidelity, auth fit, and unpin support are.

---

## 2. Recommendation summary

| Priority | Provider | Adapter shape | Why |
|----------|----------|---------------|-----|
| 1 (P5.2) | **Lighthouse** | pin by CID; API key; unpin by fileId | Chosen provider; API-key config; Filecoin-backed; pin-by-CID available |
| 2 | **Filebase** | pin by CID via standard PSA; bearer token; unpin by requestid | Vendor-neutral IPFS Pinning Service API, cleanest contract |
| 3 | **Pinata** | pin by CID with `hostNodes`; JWT; unpin by CID | Mature, per-CID unpin; strongest free tier for tests |
| later | **Storacha** | upload a CAR we build (CID control) | UCAN auth + no static key; no pin-by-CID; more adapter work |
| later | **Filecoin Onchain Cloud / Filecoin Pin** | pin by CID via PSA or Synapse upload | Strongest durability, but wallet + USDFC payments, highest complexity |

---

## 3. Provider details

### 3.1 Lighthouse (first adapter, P5.2)

| Criterion | Finding |
|-----------|---------|
| API style / SDK | REST at `https://api.lighthouse.storage`; official JS SDK `@lighthouse-web3/sdk` v0.4.7 (`dist/Lighthouse/index.js`, CommonJS main, ESM-importable via interop). Docs: docs.lighthouse.storage |
| Auth | API key; `Authorization: Bearer <key>` (docs also show raw `Authorization: <key>` for Filecoin First). One server secret: `LIGHTHOUSE_API_KEY` |
| Pin by CID | **Yes.** Pin a CID with optional display name (`POST` with `cid`/`fileName`; Go SDK `Files().Pin`). The JS SDK v0.4.7 does **not** export a pin function, so the adapter calls the REST endpoint directly (or a thin wrapper). Exact path to confirm at P5.2 |
| Upload bytes | `upload`, `uploadBuffer`, `uploadCAR`; supports `cidVersion` but **no** chunker/raw-leaves/wrap options → cannot match our CID reliably |
| Unpin / delete | `deleteFile(apiKey, fileId)` by **UUID, not CID** (`DELETE /api/user/delete_file?id=`). Adapter must map CID → fileId via `getUploads`, then delete |
| Pricing | Free 5 GB; Lite 500 GB; Pro 2.5 TB. Candidate doc: $12/mo Lite, $49/mo Pro; annual listings ~$120/yr Lite, ~$499/yr Premium. Annual storage type via `headers.storageType: 'annual'`. Also Filecoin First pay-per-deal (endowment, pay once) and x402 pay-per-use. Pricing page is JS-rendered — **confirm exact numbers at P5.2** |
| Durability | IPFS + Filecoin deals (auto-renewed from an endowment) + optional Walrus. `dealStatus(cid)` reports deal IDs |
| Gateway | `https://gateway.lighthouse.storage/ipfs/<cid>` now restricted to premium; other accounts use a **dedicated URL** from the dashboard. So `gatewayUrl()` should use a configurable dedicated gateway host (`LIGHTHOUSE_GATEWAY`) with a documented default |
| Limits | Not stated in the fetched docs — confirm max file size and rate limits at P5.2 |
| Status / proof | `getFileInfo(cid)`, `getUploads`, `dealStatus(cid)`; `podsi` proof docs exist for PoDSI |

**P5.2 plan:** implement `LighthouseProvider extends PinningProvider` with
`capabilities = { pinByCid: true, uploadBytes: false, unpin: true }`;
`pin()` posts the CID (passing our node multiaddrs as origins if the endpoint
accepts them), records `providerRef` (Lighthouse file/job id), and stores
`providerCid: cid`; `status()` maps `getFileInfo`/`getUploads`; `unpin()`
resolves the fileId by CID then deletes; `gatewayUrl()` uses the configured
dedicated gateway. Unit tests stub the HTTP client.

### 3.2 Filebase

| Criterion | Finding |
|-----------|---------|
| API style / SDK | Implements the **standard IPFS Pinning Service API (PSA)**: base `https://api.filebase.io/v1/ipfs/pins`. Also S3-compatible object storage. Vendor-neutral — the same client could serve other PSA providers |
| Auth | Per-bucket IPFS RPC token, `Authorization: Bearer <token>` |
| Pin by CID | **Yes.** `POST /pins` with `cid`, optional `name`, `origins[]` (multiaddrs of nodes holding the data), `meta{}` |
| Upload bytes | S3 PutObject; CID is Filebase's own |
| Unpin / delete | `DELETE /v1/ipfs/pins/{requestid}` |
| Pricing | Free 5 GB / 500 pinned files; **Pro $7.50/mo**, 500 GB storage + unlimited pinned files; extra $0.015/GB. (Changed from the candidate doc's $5.99/mo 1 TB) |
| Durability | IPFS pinning; Filecoin backing available |
| Gateway | `https://ipfs.filebase.io/ipfs/<cid>` and per-bucket `<bucket>.ipfs.filebase.io`. **"Bucket CID Support" is a Pro feature** on the current pricing page — confirm before relying on bucket gateway URLs |
| Limits | **100 requests/second**; `cid` list filter limited to 2000 chars/URL. Max object size not stated — confirm |
| Status / proof | `GET /v1/ipfs/pins/{requestid}` returns `queued`/`pinning`/`pinned`/`failed` |

Best "second provider" if we want a standardized, low-coupling adapter.

### 3.3 Pinata

| Criterion | Finding |
|-----------|---------|
| API style / SDK | REST `https://api.pinata.cloud`; legacy `@pinata/sdk` (key + secret) and new `pinata` SDK (JWT) |
| Auth | **JWT recommended** (`PINATA_JWT`); legacy API key + secret still supported |
| Pin by CID | **Yes.** `POST /pinning/pinByHash` with `hashToPin` and `pinataOptions.hostNodes` (up to 5 multiaddrs). Job status via the list-pin-by-CID-jobs endpoint |
| Upload bytes | `pinFileToIPFS`; `cidVersion` option only → mismatch risk |
| Unpin / delete | `DELETE /pinning/unpin/{CID}` — unpin **by CID**, the cleanest unpin contract |
| Pricing | Free: 1 GB storage, 500 pins, 1 dedicated gateway, 10 GB bandwidth, 10k requests/mo. Picnic $20/mo (1 TB, 500 GB bw); Fiesta $100/mo (5 TB, 2.5 TB bw); extra storage $0.07/GB (Picnic) / $0.035/GB (Fiesta) |
| Durability | IPFS pinning; no Filecoin by default |
| Gateway | Dedicated gateways (1 included free) plus public `gateway.pinata.cloud` |
| Limits | "Beyond 100 MB the max file size is 25 GB" (multipart; 15 GB recommended); free plan caps at 500 pins; per-account rate limits apply |
| Status / proof | Pin list / pin-by-CID job status; `pinList` filters |

### 3.4 Storacha (formerly Web3.Storage)

| Criterion | Finding |
|-----------|---------|
| API style / SDK | `@web3-storage/w3up-client` (ESM, Node 18+), UCAN/ucanto RPC |
| Auth | **UCAN delegation**, not a static API key: a local Agent key + a Space, authorized by email confirmation (`login`) or by injecting a delegation (`addSpace`). The server must hold an agent/delegation secret |
| Pin by CID | **No pin-by-CID.** Upload-oriented. However `@web3-storage/upload-client` lets us `UnixFS.encodeFile` → `CAR.encode` → `Blob.add` → `Upload.add`, so we could build the CAR from our own DAG and register our exact CID. That is real adapter work and must produce the same CID we issued |
| Unpin / delete | `blob/remove` capability exists; README warns removal only clears the account listing — network copies may persist. Not a durability-safe delete |
| Pricing | Consumer plans via console.storacha.network; public `storacha.network` now fronts **Fil One** (S3-compatible, $5.99/TB/mo, $0 egress). Consumer pricing must be confirmed |
| Durability | Filecoin-backed with proofs |
| Gateway | `https://<cid>.ipfs.w3s.link` (w3s.link) |
| Limits | Max file/CAR size and rate limits not stated — confirm |
| Status / proof | Space/blob listing; no simple per-CID status API documented |

Not a fit for the simple API-key adapter model.

### 3.5 Filecoin Onchain Cloud / Filecoin Pin

| Criterion | Finding |
|-----------|---------|
| API style / SDK | **Synapse SDK** `@filoz/synapse-sdk` (+ `viem` peer) for storage; **Filecoin Pin** CLI/API server implements the IPFS Pinning Service API over FOC |
| Auth | Ethereum-style (Filecoin) wallet private key; **FIL** for gas + **USDFC** stablecoin for storage via Filecoin Pay. Not BCH |
| Pin by CID | Filecoin Pin migrates/pins existing IPFS CIDs (keeps the Root CID; links it to a piece CID); Synapse `storage.upload(bytes)` is object-store and returns a **pieceCid**, not an IPFS CID. Minimum upload 127 bytes |
| Upload bytes | `synapse.storage.upload(data)` stores 2 provider copies by default; retrieval by pieceCid |
| Unpin / delete | Remove a piece / terminate the data set (on-chain operation, gas) |
| Pricing | $2.50/TiB/month/**copy** (minimum 2 copies) + $0.12/data-set/month proving; Beam egress up to $14/TiB; one-time on-chain fees from a ~$0.50 refundable reserve. Empty data sets cost nothing recurring |
| Durability | Strongest: PDP daily proofs across independent providers |
| Gateway | Standard IPFS gateways (`dweb.link`, `inbrowser.link`); optional Filecoin Beam CDN |
| Limits | Min 127 bytes/upload; proving/providers otherwise flexible |
| Status / proof | On-chain data sets, live PDP proofs (`filecoin-pin data-set show`) |

High complexity (wallet custody, USDFC funding, on-chain lifecycle). Best
evaluated after the API-key providers.

---

## 4. Comparison matrix

| Criterion | Lighthouse | Filebase | Pinata | Storacha | FOC / Filecoin Pin |
|-----------|-----------|----------|--------|----------|--------------------|
| Pin by CID | Yes (REST) | Yes (PSA) | Yes (`pinByHash`) | No (CAR upload) | Yes (Filecoin Pin PSA) |
| Upload bytes | Yes | Yes (S3) | Yes | Yes (CAR/blob) | Yes (Synapse) |
| Auth | API key | Per-bucket token | JWT / key+secret | UCAN delegation | Wallet + USDFC |
| Unpin | By fileId | By requestid | **By CID** | `blob/remove` (soft) | On-chain |
| Filecoin backing | Yes | Optional | No | Yes | Yes (native) |
| Gateway | dedicated (premium) | filebase.io | dedicated / public | w3s.link | public gateways / Beam |
| Adapter complexity | Low | Low | Low | Medium | High |
| CID fidelity with pin-by-CID | Exact | Exact | Exact | CAR-controlled | Exact (Filecoin Pin) |
| Fits $0.01/MB/yr | Yes | Yes | Yes | Yes | Yes |

---

## 5. Open questions to settle during P5.2

1. Lighthouse pin-by-CID REST endpoint path, request shape, and whether it
   accepts origin multiaddrs; whether the JS SDK adds a pin export.
2. Lighthouse exact current plan prices and whether a chosen plan covers the
   expected hosted volume; max file size and rate limits.
3. Lighthouse `gatewayUrl()` host for non-premium accounts (dedicated gateway)
   and how to configure it.
4. Lighthouse unpin: confirm `getUploads` reliably maps CID → fileId after a
   pin-by-CID, and delete semantics.
5. Whether our Helia node is reachable for pin-by-CID (public IP / circuit
   relay) or whether passing origin multiaddrs is enough (Q13).
6. Filebase: confirm "Bucket CID Support" on the chosen plan and max object
   size.
7. Pinata: `hostNodes` behavior and pin-by-CID job status polling.
8. Storacha consumer pricing and whether `blob/remove` is acceptable for
   expiry/moderation.
9. FOC/Filecoin Pin: PSA server pin-by-CID auth and USDFC funding model.

## 6. Related

- `dev-docs/ipfs-third-party-candidates.md`
- `dev-docs/long-term-plan.md` §10 (providers), §14 Q11/Q13 (CID consistency,
  reachability), §7 (pricing)
- `specs/feature-backlog.md` P5.1–P5.3
