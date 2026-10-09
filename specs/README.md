# bch-file-hosting Specifications

This directory holds the cross-component backlog. Behavior specifications
(Gherkin feature files) live next to the component they exercise.

## Layout

```text
specs/
├── README.md             # this file
├── feature-backlog.md    # monorepo-wide prioritized backlog
└── (per-component specs live next to their component)
```

Per-component feature files:

- `bch-file-hosting-api/specs/*.feature` — REST API behavior (pricing, uploads,
  payments, pinning, downloads, admin)
- `bch-file-hosting-cli/specs/*.feature` — CLI behavior (future, phase 6)
- `bch-file-hosting-web/specs/*.feature` — web UI behavior (future, phase 7)

## Why split specs by component?

A single user-facing feature often needs coordinated changes in more than one
layer. For example, "show the price before upload" needs:

1. **bch-file-hosting-api** to expose a quote-only route.
2. **bch-file-hosting-web** to call it and render the price.
3. **bch-file-hosting-cli** to print it in `file-upload --dry-run`.

Keeping feature files next to the component they exercise lets that
component's acceptance pipeline own the spec. The monorepo backlog
(`feature-backlog.md`) tracks which components each feature touches.

## Gherkin conventions

Specs use the format from the
[Acceptance Pipeline Specification](https://github.com/unclebob/Acceptance-Pipeline-Specification)
(APS):

- Each feature file uses `Feature:`, one optional `Background:`, and `Scenario`
  or `Scenario Outline:` with `Examples:`.
- Name each scenario `Feature Name - N`.
- Put a `#` comment listing all scenario names immediately before the
  `Feature:` line.
- Use `<parameter>` placeholders for values that vary and improve mutation.
  Only `Examples` table values are soft-mutation-tested, so put values that
  should be mutation-covered in a `Scenario Outline`.
- Prune identical example-table columns that do not improve Gherkin acceptance
  mutation.
- Tie expected values to independent inputs where possible. An example whose
  input is echoed back as the expected output survives mutation trivially.
- Run `bb gherkin-ir-dry-checker` on each IR to normalize and prune before
  handing off.
- Never hand-edit the `# mutation-stamp` or
  `# acceptance-mutation-manifest-*` blocks that the mutation tools write.
