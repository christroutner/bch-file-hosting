# bch-file-hosting

A REST API offering IPFS file pinning in exchange for BCH.

Upload a file, pay the quoted price to a unique BCH address, and receive the
IPFS CID and download links. Hosting costs $0.01 USD per MB per year (files
under 100 KB are billed as 100 KB). Paid files are pinned to the service's own
Helia IPFS node and to pluggable third-party pinning services.

## Repository layout

| Path | Contents |
|------|----------|
| `bch-file-hosting-api/` | The Express REST API ([setup and endpoints](bch-file-hosting-api/examples/README.md)) |
| `dev-docs/` | [Long-term plan](dev-docs/long-term-plan.md) and [short-term plan](dev-docs/short-term-plan.md) |
| `specs/` | Cross-component [feature backlog](specs/feature-backlog.md) |
| `specifier-prompt.md` | Standing briefing for the SwarmForge specifier |
| `swarmforge/`, `swarm`, `close-swarm`, `bb.edn`, `tools/`, `test/` | SwarmForge four-agent development harness (vendored from psf-memo) |
| `doc/` | SwarmForge reference docs |
| `docs/` | SwarmForge process notes and architect reviews |

## Running the API

```bash
cd bch-file-hosting-api
cp .env.example .env    # then set MNEMONIC and TREASURY_ADDRESS
npm install
npm start               # http://localhost:5050
npm test                # offline unit tests
```

`npm run test:integration` runs the whole workflow on BCH mainnet and spends
real BCH (about 2,000 sats plus fees per run, from `TEST_PAYER_WIF`).

## Developing with SwarmForge

Development is done by a four-agent SwarmForge swarm: specifier, coder,
refactorer, and architect. Requirements: bash, git with `user.name` and
`user.email`, tmux 3.5+, [Babashka](https://babashka.org/) (`bb`), Node 22, and
the `pi` agent CLI.

```bash
./swarm          # start the four agents in tmux
./close-swarm    # stop them
bb test          # SwarmForge helper tests
swarmforge/scripts/verify.sh api           # verify the API component
swarmforge/scripts/architect-startup.sh    # check the quality tools
```

Talk to the specifier in its tmux window to request features. See
[doc/swarmforge.md](doc/swarmforge.md) for how the swarm works.
