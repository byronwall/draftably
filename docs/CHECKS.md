# Current verification

Date: October 3, 2026. Environment: macOS, Node 22.21.1, pnpm 11.9.0.

## Automated checks

| Check | Result |
| --- | --- |
| TypeScript and JavaScript module bindings | Passed. |
| Production static build | Passed; includes three separate worker assets. |
| Layout and routing regression | 195 assertions and 55 broad cases passed. |
| Timeline and brush engine regression | 54 assertions passed. |
| Original-versus-migrated engine comparison | 320 comparisons passed across 13 fixtures and 11 algorithms. |
| Archived release integrity | All 63 original file checksums passed. |

Run the maintained checks with:

```sh
pnpm typecheck
pnpm test:engines
pnpm build
```

The parity check covers layout geometry, routing, timeline recordings, and
brush calculations. It excludes execution time and recording creation time.
Reports are written to `tmp/verification-current/`.

## Browser checks

Production browser verification is in progress. Two independent passes use the
same fixed production build on separate local origins. The completed results
will replace this status before the task is closed.

## Scope

These are current migration results. The reports in `reference/v7/verification/`
belong to the original ChatGPT release and are retained as historical evidence.

Engine parity does not prove browser interactions or all graph layouts. The
algorithms can retain crossings and ordering conflicts. They do not guarantee a
globally optimal drawing.
