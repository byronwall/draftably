# Checks

## Automated

```sh
pnpm check:fast   # typecheck, lint, format check, Vitest: about 10 seconds
pnpm check        # check:fast, the engine suites (about 80 seconds) and the build
```

Run `check:fast` while iterating and `check` before pushing. CI runs `pnpm release:check`, which
is `check:fast`, the engine suites and the packaged-CLI proof.

| Suite                                   | What it covers                                                                                                                                                                                                                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tsc` (strict, no unused code)          | All application code, tests and config.                                                                                                                                                                                                                                                                      |
| `tests/model.test.ts` (Vitest)          | Examples load and round-trip through `normalize`; validation and v1 migration; connected shapes, inserted steps, wrap/ungroup, delete with and without contents, collapse, container resize limits, align, build from a list, copy/paste, layout intent; comparison camera fitting.                          |
| `tests/dsl.test.ts` (Vitest)            | `.draft` parsing errors with line numbers, formatting that keeps comments, nested layout, pins across content additions, relative placement, relaxed-preference and group-size diagnostics, projection into a valid editor document, and repeatable canonical geometry.                                      |
| `tests/engine-recipes.test.ts` (Vitest) | `layout … engine=` parsing and errors, engine arrangements that repeat exactly, refinements and nested recipes on top of an engine, group-scoped engines, synchronous checks, projected settings, and the `routing` statement.                                                                               |
| `tests/translate.test.ts` (Vitest)      | Editor edits as source: drag to `near`, pin/unpin, shape and group sizes (ignoring grid snaps), add/rename/connect/style/delete with readable IDs, wrap/ungroup, connection edits, rejection of bends, anchors around a refinement, distant regions after an agent's addition, movement reports, and reflow. |
| `tests/engine-layout.mjs`               | Layout and routing regressions: 195 assertions and 55 broad cases.                                                                                                                                                                                                                                           |
| `tests/engine-sculpt.mjs`               | Timeline and brush regressions: 55 checks.                                                                                                                                                                                                                                                                   |
| `tests/engine-parity.ts`                | 320 comparisons of the engines against the original release in `reference/v7/` across 13 examples and 11 algorithms. Timing fields are excluded.                                                                                                                                                             |

Engine reports are written to the ignored `tmp/verification-current/` folder.

## File-backed editing

`pnpm cli:build && pnpm prove:installed` packs Draftably, installs the archive in a fresh temporary
project, and runs its executable outside the repository. It checks help, validation, formatting,
repeatable JSON, SVG, bundled viewer assets, API saves, and conflicts. It then runs the browser proof
below against the installed CLI. Only the proof harness uses the repository's Playwright dependency.
The installed product has no runtime package dependencies or install scripts.

GitHub's Check workflow and the release gate run `pnpm release:check`, including the clean-install
CLI and HTTP proof. The workflow's `proofs` job runs `prove:file` and `prove:layout` in Chromium
and uploads their screenshots when they fail.

Both browser proofs share `scripts/lib/proof.mjs`. It starts `draftably open --port 0`, so a proof
never collides with another worktree's viewer. When a check fails, the summary names it and the
output folder gets `failure.png` (the page at the end of the run) and `failure.json` (failed checks,
the viewer's file state and the last 50 console lines). One failed run is enough to start
diagnosing; don't rerun until it passes.

`pnpm build && pnpm prove:file` drives the real editor in Chromium (`playwright-core` with an
installed Playwright Chromium) against a temporary copy of `examples/checkout.draft` served by
`pnpm draftably open`. It resizes a group, drags a sibling, pins an object, moves the camera, undoes and
redoes, appends a connected node from outside, restarts the server, writes invalid source, and
races an outside write against a viewer save. At each step it compares the browser's geometry
with `pnpm draftably inspect --json`. Screenshots go to `tmp/proof/`.

## Layout tools in file mode

`pnpm build && pnpm prove:layout` drives the editor against a temporary copy of
`examples/order-pipeline.draft`. It applies a Compare candidate (a layout recipe), runs Improve,
keeps a timeline step and paints a brush stroke (positions), appends a node from outside, and
restarts the server. After every step the browser's geometry must equal `draftably inspect` of
the saved file, and the arranged region away from the addition must not move. Screenshots go to
`tmp/proof-layout/`.

## Browser

The SolidJS rewrite was exercised in Chrome (the Claude desktop browser pane) at 1440 × 900 and
820 × 700, in light and dark themes, through real pointer and keyboard input plus
`window.diagramStudio` for state inspection:

- Startup, restore from browser storage, and examples loaded through the File menu with confirmation.
- Shape drag with snapping, dropping into and out of containers, undo and redo.
- **N**, typing, **Tab** to extend, **Enter** to commit; quick-add buttons; Connect tool with preview.
- Drawing and naming a container, moving it with its contents, collapsing it.
- Inspector edits: label, color, shape, position, pin; edge bends by double-click.
- Copy, paste, paste-a-list into Build from a list, object search.
- Layout pass, previewed rebuild with discard, layout lab (**Alt+L**), routing menu, Reroute.
- Compare: six candidates, grid fitting, overlay with layers, Apply and Undo.
- Timeline: record, scrub, Keep & brush; brush hover preview and a committed stroke.
- Editable SVG export and re-import, PNG conversion.

## Not covered

- Native file pickers and drag-and-drop of files (the import code paths are shared with paste and
  were exercised that way).
- Safari, Firefox, touch input and trackpad gestures.
- A full accessibility audit.

The layout engines are heuristics: they can leave crossings or ordering conflicts and do not
promise a globally optimal drawing.

## Screenshots

`pnpm shoot <target> tmp/out.png` captures a URL, a `.draft` file (drawn through
`draftably inspect --svg`), or an SVG, PNG or HTML file. `pnpm shoot --sheet tmp/sheet.png
Label::a.draft b.draft …` lays several targets out as a labeled contact sheet. Use it for PR
screenshots and visual checks instead of writing a one-off Playwright script. Keep the output in the
ignored `tmp/` folder.
