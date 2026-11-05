# Integration craft pass

This pass follows the [adoption work](adoption-evidence.md). It checks existing
integration paths with empty data, failed setup, repeated work, and unusual paths.
It fixes six findings: three S1 behavior defects and three S2 diagnostic or guide
defects. It adds no package dependencies or integration features.

## Fixes

| State                              | Before                                                                   | After                                                                | Owner |
| ---------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- | ----- |
| Fresh Markdown page without fences | Writing `dist/index.html` failed with `ENOENT`.                          | The guide creates the output directory before writing HTML.          | #456  |
| Preview command fails              | A Node stack trace obscured the failed step.                             | A sentence names the step, preserves tool output, and exits nonzero. | #456  |
| Invalid validation options         | Null caused a property-read error; arrays and numeric source IDs passed. | Direct type errors match the rendering API's contract.               | #444  |
| Browser entry in TypeScript        | `@draftably/runtime/browser` failed with `TS7016`.                       | The browser entry exports the same declarations as the root entry.   | #447  |
| Element has no source              | An empty drawing hid the supplied fallback image.                        | Missing, empty, or whitespace source keeps the fallback visible.     | #455  |
| Changing the element label         | The guide could suggest a label property that has no effect.             | The guide shows `setAttribute` for the label and state attributes.   | #455  |

Clearing an element's source also cancels pending work and restores its fallback.
Later source creates a fresh viewer. Shared cleanup handles clearing, removal,
and remounting. Normal source changes still preserve the camera.

## Before and after proof

The standalone guide was copied into a fresh consumer with spaces in its path.
Its source was changed to `# An ordinary page`, with no diagram fence:

```text
node render-markdown.ts
Before: ENOENT: no such file or directory, open 'dist/index.html' (exit 1)
After: Wrote dist/index.html (exit 0)
```

The preview command was run with pnpm absent from PATH, a failed build, and a
denied output directory. Each case previously printed a stack trace. Now:

```text
node scripts/pack-integrations.ts
Package preview failed (build runtime): pnpm was not found on PATH. Install pnpm, then retry.

Build failed: fixture failure.
Package preview failed (build runtime): pnpm exited with status 17.

Package preview failed (create preview directory): EACCES: permission denied, mkdir '…/tmp/integration-packages'
```

Each failure exits 1. Successful runs from another repository, through a symlink
with spaces, and a second run all exit 0 and produce both archives.

```text
await validate('node a "API"', null)
Before: TypeError: Cannot read properties of null (reading 'limits')
After: TypeError: Validation options must be an object.

pnpm exec tsc --noEmit --strict --module NodeNext --target ES2022 --skipLibCheck browser-import.ts
Before: TS7016 for @draftably/runtime/browser (exit 2)
After: exit 0
```

An independent browser review checked the element before and after. With no
source, `updateComplete` changed from `committed` to `undefined`; the fallback
changed from hidden to visible. Empty and whitespace source behave the same.
Clearing a pending update resolves the old promise as `destroyed`, emits no stale
event, and preserves the fallback. A later valid source commits normally.

The revised guide's `setAttribute('label', 'Accessible updated')` call changed the
accessible region name to `Accessible updated`. Matched screenshots are attached
to PR #455. Both screenshots were inspected.

## Checks

- `pnpm check`: 641 tests, the engine suites, and the production build passed.
- `pnpm runtime:pack-check`: public root and browser imports pass strict TypeScript.
- `pnpm viewer:pack-check`: all five installed consumers build, including the element.
- `pnpm prove:element`: nine browser checks pass, including blank source and cancellation.
- The Markdown audit passed empty, invalid, concurrent, include, cache, asset
  publication, symlink, space, collision, and corrupt-file cases without changes.
- Browser checks passed at 1440, 1100, 800, and 390 pixels. A fresh context had
  no console errors or warnings.

## Decisions and next step

Fixes stay in their owning PRs. Label and state remain attributes; no duplicate
property API was added. Blank element source means data is not ready. The standalone
rendering API still accepts an empty diagram.

The next separate step is registry publication and feedback from external adopters.
This pass does not publish packages or add host integrations.
