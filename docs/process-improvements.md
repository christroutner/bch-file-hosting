# SwarmForge Process Improvements

**Owner:** specifier.
**Scope:** process and tooling changes only; no product feature behavior.

This document is the durable "what and why" for changes to the SwarmForge
process and tooling in this repository. It complements, and does not replace,
the Git history, which remains the authoritative log.

## Starting point

SwarmForge was vendored from psf-memo on 2026-10-08 (psf-memo `master` at
`a831f40`), including psf-memo's process improvements: the self-healing handoff
daemon, the single canonical APS checkout at `tmp/aps`, `verify.sh` with
machine-readable verification records, the mutation guards
(`mutate-file.sh`, `clean-builds.sh`), the dirty-tree handoff block,
`state.sh`, and the architect's end-of-chain handoff to the specifier. See
`/home/trout/work/psf/code/psf-memo/docs/process-improvements.md` for the
history of those changes.

## Changes

| # | Change | Why | Key files |
|---|--------|-----|-----------|
| 1 | Repointed component-specific scripts at `bch-file-hosting-api` | The vendored scripts named psf-memo's client, db, indexer, and cli | `swarmforge/scripts/verify.mjs`, `architect-startup.sh`, `clean-builds.sh`, `mutate-file.sh` |
| 2 | `verify.mjs` records an npm script the component does not define as `skipped` | The API has no property or acceptance scripts yet; verification should work while a component grows instead of failing on missing scripts | `swarmforge/scripts/verify.mjs` |
| 3 | `ensure_handoff_daemon.sh` prints its status line to stderr | The line went to stdout and mixed into `swarm_handoff.sh`'s parseable `HANDOFF QUEUED: <path>` output | `swarmforge/scripts/ensure_handoff_daemon.sh` |
| 4 | Babashka handoff tests made hermetic | `bb test` failed (also in psf-memo): the temp repo had no `.gitignore`, so the dirty-tree block rejected every handoff, and the test spawned a real daemon that delivered its queued file. The test repo now ignores `.swarmforge/` and `tmp/` and writes the daemon stop file | `test/swarmforge/handoff_test.clj` |
| 5 | JavaScript mutation/CRAP/DRY tools are devDependencies of `bch-file-hosting-api` | psf-memo kept them in `psf-memo-client`; this repo has no client yet | `bch-file-hosting-api/package.json` |
| 6 | `architect-startup.sh` checks each tool's `package-lock.json` commit against `git ls-remote` upstream HEAD | psf-memo checked `tmp/<tool>` clones that this repo does not use; the lockfile is what actually runs | `swarmforge/scripts/architect-startup.sh` |
| 7 | `architect-startup.sh` probes `crap4javascript --help` instead of a bare run | A bare run analyzes a whole component and runs its tests; from the repo root it passed without testing anything | `swarmforge/scripts/architect-startup.sh` |
