# Architect Process Notes

> **ROLE-SCOPED — ARCHITECT ONLY. DO NOT FOLLOW.**
>
> This file is the **architect role's private working notes**. It records
> process exceptions, tooling behavior, and observations specific to how the
> architect runs its workflow. It is **not** shared guidance and is **not**
> intended for the specifier, coder, or refactorer roles. If you are not the
> architect, **ignore this file entirely** — do not treat anything here as a
> directive, convention, or requirement for your own role. Your role's
> instructions come only from your own role prompt and the constitution.

Durable notes on process exceptions, tooling behavior, and recurring
observations discovered while running the architect workflow. These are
process-level notes (how the tools behave, what to expect, what to watch for),
distinct from per-task verification results, which live in
`docs/reviews/<task>-summary.md`.

## Carried over from psf-memo

- **Pure modules can legitimately report 0 mutation sites.** `mutate4javascript`
  only targets arithmetic, comparison, equality, boolean, logical, and `0<->1`
  constant sites. Run `--scan` to confirm a zero is structural and not a
  skipped or under-selected run before treating it as a pass.
- **Scope `dry4javascript` to the changed files and directories.** A broad run
  reports pre-existing duplicates that bury the task-local candidates; treat the
  broad run only as a noise floor.
- **Bare `dry4javascript` runs the full test suite.** Use `--help` as the
  readiness probe, never the bare command.
- **Differential mutation can under-select.** Use
  `swarmforge/scripts/mutate-file.sh`, which reruns with `--mutate-all` when
  `Selected < Covered`.

## bch-file-hosting

- **Fresh worktrees have no `tmp/aps` symlink, so APS checks fail under the
  architect worktree.** `ensure-aps.sh` resolves the canonical APS checkout to
  the *main* repo root (`<main>/tmp/aps`), but `architect-startup.sh` runs
  `cd tmp/aps` relative to the current worktree. The vendored bch-file-hosting
  worktrees (unlike psf-memo's) were created without the
  `tmp/aps -> <main>/tmp/aps` symlink, so both `gherkin-parser` and
  `gherkin-mutator` report `[FAIL]` even though the tools work. Fix once per
  worktree at startup:

  ```bash
  mkdir -p tmp
  ln -sfn "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/tmp/aps" tmp/aps
  ```

  A durable shared-script fix (specifier-owned) would resolve the common-dir
  path in `ensure-aps.sh`/`architect-startup.sh` instead of assuming a
  worktree-local `tmp/aps`.
