# bch-file-hosting — Short-Term Plan

**Status**: DRAFT
**Created**: 2026-10-08
**Covers**: Roadmap phases 3 and 4 of [long-term-plan.md](./long-term-plan.md)

Goal: get the basic hosting workflow working on BCH mainnet (upload -> pay ->
check payment -> download), then hand the repo to Swarm Forge for all further
development.

- **Part A** (phase 3): core port, built by a single agent session.
- **Part B** (phase 4): Swarm Forge integration, vendored from psf-memo.

Decisions referenced as `Dn` are in the Decisions Log of the long-term plan.

---

## Part A — Core Port (phase 3)

### A1. Scaffold

- [ ] `git init` at the repo root; root `README.md` and `.gitignore` (ignore
      `node_modules/`, `coverage/`, `.env`, `tmp/`, `.ipfsdata/`, `.leveldb/`,
      `.swarmforge/`, `.worktrees/`, `wallet.json`).
- [ ] Create `bch-file-hosting-api/` with this layout (Clean Architecture prompt):

```text
bch-file-hosting-api/
├── bin/server.js                 # Express 5 app startup + graceful shutdown
├── config/
│   ├── index.js                  # selects env file by SVC_ENV
│   └── env/{common,development,test,production}.js
├── src/
│   ├── entities/
│   │   ├── file-upload.js        # validate name, size, cid
│   │   └── invoice.js            # validate address, hdIndex, priceSats, status
│   ├── use-cases/
│   │   ├── index.js
│   │   ├── file-use-cases.js     # uploadAndQuote, getFileStatus
│   │   ├── payment-use-cases.js  # checkPayment, retrySweeps
│   │   ├── pricing.js            # pure price calculation (section A4)
│   │   └── cleanup-use-cases.js  # deleteUnpaid
│   ├── adapters/
│   │   ├── index.js
│   │   ├── wallet.adapter.js     # minimal-slp-wallet: keys, balance, sweep, getUsd
│   │   ├── ipfs/                 # helia-coord node: add, cat, pin, remove
│   │   ├── localdb/              # LevelDB stores: invoices, files, meta
│   │   ├── pinning/
│   │   │   ├── index.js          # registry, built from PINNING_PROVIDERS
│   │   │   └── local-helia.js    # PinningProvider wrapping the local node
│   │   ├── announcement/
│   │   │   └── noop-announcer.js # OP_RETURN stub (D12)
│   │   └── logger.js             # winston
│   └── controllers/
│       ├── index.js
│       ├── rest-api/
│       │   ├── index.js
│       │   ├── files/            # router + controller for /files, /download
│       │   ├── admin/            # router + controller for /admin (API key)
│       │   └── middleware/       # upload (multer), rate limit, admin auth, errors
│       └── timer-controllers.js
├── test/
│   ├── unit/                     # mirrors src/; *.unit.js; fully mocked
│   └── integration/              # manual mainnet scripts (small amounts)
├── examples/                     # curl / node examples of the workflow
├── .env.example
└── package.json
```

- [ ] `package.json`: `"type": "module"`, `"engines": { "node": ">=22" }`.
      Scripts: `start`, `test` (`c8 mocha --recursive test/unit`), `test:integration`,
      `lint` (`standard --env mocha --fix`), `coverage`.
- [ ] Dependencies (pin exact versions): `express@5`, `multer@2`, `express-rate-limit`,
      `cors`, `level`, `helia-coord`, `minimal-slp-wallet`, `winston`,
      `winston-daily-rotate-file`. Copy the `libp2p` / multiaddr `overrides`
      block from ipfs-file-stager's `package.json` if helia-coord still needs it.
- [ ] Dev dependencies: `mocha`, `chai`, `sinon`, `c8`, `standard`, `supertest`.

### A2. Configuration (`.env.example`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `SVC_ENV` | `development` | `development` / `test` / `production` |
| `PORT` | `5050` | REST port |
| `PUBLIC_URL` | `http://localhost:5050` | Base for `downloadUrl` |
| `MNEMONIC` | (required) | Server HD wallet (D10) |
| `TREASURY_ADDRESS` | (required) | Sweep destination (D9) |
| `WALLET_INTERFACE` | `web3` | `web3` / `web2` / `x402` (D7) |
| `APISERVER` | per interface | BCH backend URL |
| `WALLET_WIF_X402` | — | WIF that pays for x402 backend calls |
| `USD_PER_MB_YEAR` | `0.01` | D2 |
| `MIN_BILLED_BYTES` | `100000` | D4 |
| `MIN_INVOICE_SATS` | `2000` | D5 |
| `UNDERPAY_TOLERANCE_SATS` | `100` | D8 |
| `QUOTE_TTL_HOURS` | `24` | Quote lock and unpaid deletion window |
| `MAX_FILE_SIZE_BYTES` | `100000000` | D14 |
| `UPLOAD_TMP_DIR` | `./tmp/uploads` | multer disk storage |
| `LEVEL_DB_PATH` | `./.leveldb` | D13 |
| `IPFS_DIR` | `./.ipfsdata` | Helia blockstore + seed |
| `IPFS_TCP_PORT`, `IPFS_WS_PORT` | `4001`, `4003` | libp2p ports |
| `ENABLE_CIRCUIT_RELAY` | `false` | helia-coord relay mode |
| `COORD_NAME` | `bch-file-hosting` | helia-coord announce name |
| `PUBLIC_GATEWAYS` | `https://ipfs.io/ipfs/,https://dweb.link/ipfs/` | Gateway URL prefixes (D16) |
| `PINNING_PROVIDERS` | `` (empty) | Third-party providers; Lighthouse added in phase 5 |
| `ADMIN_API_KEY` | (required in production) | D19 |
| `RATE_LIMIT_PER_MIN` | `30` | Per-IP limit on public routes |

### A3. Adapters

- [ ] **wallet.adapter.js** (port from ipfs-file-stager `wallet.adapter.js`, fixed):
  - `init()`: open `minimal-slp-wallet` from `MNEMONIC` with the configured interface.
  - `getKeyPair(hdIndex)`: delegate to `wallet.getKeyPair(hdIndex)`; returns
    `{ cashAddress, wif, hdIndex }`. The WIF is used in memory only.
  - `getBalanceSats(address)`: `wallet.getBalance({ bchAddress })` (confirmed +
    unconfirmed satoshis, D8).
  - `sweep(hdIndex)`: build a temporary wallet from the derived WIF and
    `sendAll(TREASURY_ADDRESS)`; return the txid.
  - `getUsdPerBch()`: `wallet.getUsd()`.
- [ ] **ipfs/** (port from ipfs-file-stager `src/adapters/ipfs/`):
  - Start Helia via `helia-coord/create-helia-node`, then `IpfsCoord`.
  - `addFile({ filePath, filename })` -> CID (CIDv1, `wrapWithDirectory: true`
    to keep the filename; see open question Q12).
  - `cat(cid)` -> async iterable of bytes for `/download/:cid`.
  - `pin(cid)` / `unpin(cid)` / `remove(cid)` (unpin, then delete blocks or GC).
  - `stop()`.
- [ ] **localdb/** (LevelDB, JSON values). Key layout:

| Key | Value |
|-----|-------|
| `invoice:<paymentAddress>` | `{ paymentAddress, hdIndex, cid, filename, sizeBytes, billedBytes, priceSats, usdPrice, usdPerBch, status, createdAt, quoteExpiresAt, paidAt, receivedSats, sweepTxid, sweepStatus }` |
| `file:<cid>` | `{ cid, filename, sizeBytes, paymentAddress, status, pins: [], hostedUntil }` |
| `idx:created:<isoTimestamp>:<paymentAddress>` | `''` (range scan for 24h cleanup) |
| `meta:nextHdIndex` | integer, starts at 1 |

  - Expose small store classes (`InvoiceStore`, `FileStore`, `MetaStore`) so
    use-cases never touch raw keys.
  - `MetaStore.nextHdIndex()` increments under an in-process mutex.
- [ ] **pinning/**: `PinningProvider` contract from the long-term plan
  (section 10), `local-helia.js` implementing it, and a registry that returns
  `[localHelia, ...thirdPartyFromConfig]`. With `PINNING_PROVIDERS` empty, only
  the local node is used.
- [ ] **announcement/noop-announcer.js**: `announce()` returns
  `{ announced: false, txid: null }`.
- [ ] **logger.js**: winston with daily rotate; no secrets in logs.

### A4. Use-cases

- [ ] **pricing.js** (pure function, 100% branch coverage):

```js
export function calculatePrice ({ sizeBytes, usdPerBch, cfg }) {
  const billedBytes = Math.max(sizeBytes, cfg.minBilledBytes)
  const usdPrice = (billedBytes / 1_000_000) * cfg.usdPerMbYear
  const rawSats = Math.ceil((usdPrice / usdPerBch) * 1e8)
  const priceSats = Math.max(rawSats, cfg.minInvoiceSats)
  return { billedBytes, usdPrice, priceSats, priceBch: priceSats / 1e8 }
}
```

- [ ] **uploadAndQuote({ filePath, filename, sizeBytes })**:
  1. Validate with the `FileUpload` entity (size <= `MAX_FILE_SIZE_BYTES`).
  2. `ipfs.addFile()` -> CID. Always delete the temp file (`finally`).
  3. `usdPerBch = wallet.getUsdPerBch()`; `calculatePrice()`.
  4. `hdIndex = meta.nextHdIndex()`; `wallet.getKeyPair(hdIndex)` -> address.
  5. Save invoice (`awaitingPayment`), file (`staged`), and the cleanup index.
  6. Return the quote.
  - If the same CID already has a paid file, return `alreadyHosted: true` with
    links instead of a new invoice.
- [ ] **checkPayment({ paymentAddress })**:
  1. Load the invoice; 404 if unknown; return the stored result if already paid.
  2. If `quoteExpiresAt` has passed, return `expired`.
  3. `receivedSats = wallet.getBalanceSats(address)`.
  4. If `receivedSats < priceSats - UNDERPAY_TOLERANCE_SATS`, return `unpaid`.
  5. Mark `paid`, set `hostedUntil = paidAt + 1 year` (D1).
  6. Pin via each registry provider; record `pins[]`.
  7. `announcement.announce()` (no-op).
  8. Sweep; on failure set `sweepStatus: 'pending'` (does not block the response).
  9. Return the CID, `downloadUrl`, and `gatewayUrls`.
- [ ] **getFileStatus({ cid })**: file record + pins + `hostedUntil`.
- [ ] **deleteUnpaid()**: range-scan `idx:created:` older than `QUOTE_TTL_HOURS`;
  for invoices still `awaitingPayment`, re-check the balance once (so a payment
  made just before the deadline is not lost), otherwise `ipfs.remove(cid)` and
  mark the invoice and file `deleted`.
- [ ] **retrySweeps()**: sweep invoices with `sweepStatus: 'pending'`.

### A5. REST API (Express 5)

All responses are JSON with a `success` boolean, except `/download`.

| Method | Path | Body / params | Success response |
|--------|------|---------------|------------------|
| `POST` | `/files` | multipart, field `file` | `{ success, cid, filename, sizeBytes, billedBytes, priceSats, priceBch, usdPrice, paymentAddress, quoteExpiresAt }` |
| `POST` | `/files/check-payment` | `{ paymentAddress }` | Paid: `{ success, status: 'paid', cid, downloadUrl, gatewayUrls, hostedUntil }`. Unpaid: `{ success, status: 'unpaid', receivedSats, requiredSats, quoteExpiresAt }`. Expired: `{ success, status: 'expired' }` |
| `GET` | `/files/:cid` | — | `{ success, cid, status, sizeBytes, pins, hostedUntil }` |
| `GET` | `/download/:cid` | — | File bytes (only for paid files), `Content-Disposition` with filename |
| `GET` | `/health` | — | `{ success, ipfs: 'up', db: 'up', version }` |
| `GET` | `/admin/invoices` | `?status=`, header `x-api-key` | `{ success, invoices: [...] }` |
| `POST` | `/admin/files/:cid/delete` | header `x-api-key` | `{ success }` (moderation: unpin everywhere) |
| `POST` | `/admin/sweeps/retry` | header `x-api-key` | `{ success, swept: [...] }` |

- [ ] Upload middleware: multer disk storage in `UPLOAD_TMP_DIR`,
      `limits.fileSize = MAX_FILE_SIZE_BYTES`, single field `file`. Oversize ->
      HTTP 413.
- [ ] Error middleware maps entity/validation errors to 422, unknown invoice to
      404, and anything else to 500 without leaking stack traces.
- [ ] Rate limiting (`express-rate-limit`) on `/files*` and `/download/*`.
- [ ] Admin middleware compares `x-api-key` to `ADMIN_API_KEY` with a
      constant-time compare; if `ADMIN_API_KEY` is unset, admin routes return 503.
- [ ] Each router is a class with `attach(app)`, controllers receive `useCases`
      via the constructor (CA prompt pattern).

### A6. Timers

- [ ] `deleteUnpaid` every 60 minutes; `retrySweeps` every 30 minutes.
- [ ] Store every interval handle; `stopTimers()` clears all of them and is
      called from graceful shutdown (`SIGINT` / `SIGTERM`), which also stops
      Helia and closes LevelDB.

### A7. Tests

- [ ] Unit tests (`test/unit/**/*.unit.js`), fully mocked with Sinon sandboxes;
      follow `/home/trout/work/llm/prompt/testing/testing-prompt.md` (classes,
      deps on `this`, assert structure not brittle values). Target 100% line
      coverage on `src/use-cases/` and `src/entities/`, high coverage elsewhere.
- [ ] Required cases:
  - Pricing: below minimum size, exact 100 KB, 1 MB, 100 MB, sat floor applied,
    fractional sats rounded up.
  - Payment: exact payment, within tolerance, below tolerance, overpayment,
    already paid (idempotent, no second sweep), expired quote, unknown address.
  - Units regression: a balance of 1 sat must not satisfy a 2,000-sat invoice.
  - Sweep failure leaves `sweepStatus: 'pending'` and still returns `paid`.
  - Cleanup: deletes only expired unpaid invoices; last-chance balance check
    rescues a late payment; survives a simulated restart (state from LevelDB).
  - HD counter: concurrent `nextHdIndex()` calls return unique values.
  - Upload: temp file deleted on success and on failure; 413 on oversize.
  - Admin: missing/wrong key -> 401; unset key -> 503.
  - REST controllers via `supertest` with use-cases stubbed.
- [ ] Manual mainnet integration (`test/integration/`, run by hand):
  `host-file.js` uploads a small file, pays the invoice from a funded test
  wallet (`TEST_PAYER_WIF`), polls `check-payment`, downloads the file, and
  compares bytes. Keep amounts at the sat floor.

### A8. Part A exit criteria

- [ ] `npm run lint` and `npm test` pass in `bch-file-hosting-api/`.
- [ ] On mainnet: upload -> pay -> check-payment returns CID + links ->
      `/download/:cid` returns identical bytes -> funds arrive at the treasury.
- [ ] An unpaid upload is removed after `QUOTE_TTL_HOURS` (verify with a short
      TTL such as 0.05 hours in development).
- [ ] Restarting the server keeps invoices, the HD counter, and the cleanup
      schedule.
- [ ] `examples/` shows the 3-step workflow with `curl`.

---

## Part B — Swarm Forge Integration (phase 4)

Source: psf-memo's adapted copy (D24), which adds `verify.sh`, `monorepo.prompt`,
the self-healing handoff daemon, and the architect end-of-chain handoff.

### B1. Prerequisites (on the dev machine)

- [ ] bash, git with `user.name` / `user.email`, tmux (>= 3.5), Babashka (`bb`),
      Node 22, and the `pi` agent CLI authenticated with access to
      `deepseek-v4.1-flash:cloud` (D24).

### B2. Copy from `/home/trout/work/psf/code/psf-memo`

- [ ] Root launchers: `swarm`, `close-swarm`, `bb.edn`, `tools/` (`sf-queue`, `sf-tokens`).
- [ ] `swarmforge/`: `swarmforge.conf`, `constitution.prompt`,
      `constitution/articles/` (`engineering`, `handoffs`, `workflow`, `project`,
      `monorepo`), `roles/` (all four), `scripts/` (all, including `verify.sh`,
      `verify.mjs`, `ensure-aps.sh`, `ensure_handoff_daemon.sh`, `gherkin-parser`,
      `lib/`, `shared-articles/`, `terminal-adapters/`).
- [ ] `doc/` (Swarm Forge reference docs) unchanged.
- [ ] `docs/` skeleton: `architect-startup.md`, an empty `architect-process-notes.md`,
      a fresh `process-improvements.md`, and an empty `reviews/`.
- [ ] Root `.gitignore` entries for `.swarmforge/`, `.worktrees/`, `tmp/`.

### B3. Adapt for this repo

- [ ] `swarmforge.conf`: keep the four `window` lines with
      `pi ... --model deepseek-v4.1-flash:cloud`; refactorer and architect in
      `batch` mode.
- [ ] `articles/project.prompt`: project name, JavaScript, Node 22, ESM, Express 5.
- [ ] `articles/monorepo.prompt`: replace the psf-memo component table with
      `bch-file-hosting-api` (now), `bch-file-hosting-cli` and
      `bch-file-hosting-web` (future); list each component's verify commands
      (`npm test`, `npm run lint`); spec layout `<component>/specs/*.feature`;
      call out the shared pricing rules (section 7 of the long-term plan) the way
      psf-memo calls out the Memo protocol.
- [ ] `articles/engineering.prompt`: keep the JS tool table; point to the Clean
      Architecture and testing prompts; state the "satoshis only" rule and "no
      WIFs persisted" rule.
- [ ] `scripts/verify.mjs`: update the component list to this repo.
- [ ] `specifier-prompt.md`: modeled on psf-memo's, trimmed to this project:
      startup steps, architecture summary (link the long-term plan), workflow,
      backlog location, Gherkin/APS conventions, handoff mechanics, verify
      how-to, and a "handoff to next session" section.
- [ ] `specs/README.md` (layout + Gherkin conventions, from psf-memo) and
      `specs/feature-backlog.md` seeded with:
  1. Phase 5: provider study doc + `PinningProvider` registry + Lighthouse adapter.
  2. Phase 5: `pins[]` retry timer and admin pin status.
  3. Phase 6: CLI skeleton + `file-host` command.

### B4. First acceptance spec (pipeline proof)

- [ ] Write `bch-file-hosting-api/specs/pricing.feature` in APS format
      (scenario-name comment before `Feature:`, `Pricing - N` names,
      `Scenario Outline` with `Examples` for size / BCH price / expected sats),
      covering the worked examples table in the long-term plan.
- [ ] Wire the acceptance pipeline: `ensure-aps.sh`, plus
      `bch-file-hosting-api/acceptance/acceptance.js` and `acceptance/lib/`
      (copy the psf-memo-client pattern), and
      run `bb gherkin-ir-dry-checker` on the IR.

### B5. Smoke run

- [ ] Commit everything on `master`.
- [ ] `./swarm`; confirm four tmux windows and the handoff daemon start.
- [ ] Give the specifier one small task (for example, "reject uploads of 0
      bytes with 422"), approve its spec, and watch the handoff pass
      specifier -> coder -> refactorer -> architect -> specifier.
- [ ] Specifier merges `swarmforge-architect` into `master`; architect review in
      `docs/reviews/`.
- [ ] `./close-swarm`. Record any issues in `docs/process-improvements.md`.

### B6. Part B exit criteria

- [ ] One full four-role cycle merged to `master` with `verify.sh` passing.
- [ ] Backlog contains the phase 5 work, ready for the swarm to pick up.

---

## Out of scope for this plan

Lighthouse adapter (phase 5), CLI (6), web UI (7), x402-bch (8), psf-memo
integration (9), Docker Compose production setup, and the expiry policy. See the
long-term plan.
